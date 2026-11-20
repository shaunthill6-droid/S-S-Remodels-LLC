/* S&S Remodels: estimate, invoice and receipt builder (receipt.html).
   Everything typed here is saved only on this device (localStorage). */
(function () {
  'use strict';

  var KEY = 'ss_receipt_v1', SIG_KEY = 'ss_receipt_sig_v1';
  var LIB = '/assets/vendor/html2pdf.bundle.min.js';
  var MODES = ['Estimate', 'Invoice', 'Receipt'];
  var LABELS = {
    Estimate: { svc: 'Scope of work', paid: 'Deposit to start', bal: 'Due at completion',
      ph: 'Describe the work: what gets done, where, and with what materials. Note anything the homeowner should know before deciding.' },
    Invoice: { svc: 'Work performed', paid: 'Paid to date', bal: 'Balance due',
      ph: 'Describe the work done and the materials used.' },
    Receipt: { svc: 'Work performed', paid: 'Amount paid', bal: 'Balance due',
      ph: 'Describe the work done and the materials used, and anything the customer should keep for their records.' }
  };
  var TERMS = {
    Estimate: 'Good for 30 days from the date above. Covers the scope described. Any change is agreed in writing before the work is done. Work is scheduled once the homeowner agreement is signed.',
    Invoice: 'Due on receipt. Thank you for your business.',
    Receipt: 'Thank you for your business. Keep this receipt for your records.'
  };
  var MULTI = { svc: 1, note: 1, terms: 1 };
  var INAPP = /FBAN|FBAV|FB_IAB|Instagram|Line\/|Snapchat|MicroMessenger|TikTok|BytedanceWebview|LinkedInApp/i.test(navigator.userAgent || '');

  function $(s) { return document.querySelector(s); }
  function readStore(k) { try { var v = JSON.parse(localStorage.getItem(k) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
  function writeStore(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode: keeps working, just does not save */ } }

  function makePlain(el) {
    try { el.contentEditable = 'plaintext-only'; } catch (e) { /* older browsers */ }
    if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
  }
  function fixEmpty(el) { if (el.innerHTML === '<br>' || el.textContent === '\n') el.innerHTML = ''; }
  function txt(el) { return MULTI[el.dataset.k] ? el.innerText.replace(/\n+$/, '') : el.textContent; }
  function plainPaste(e) {
    var cd = e.clipboardData || window.clipboardData; if (!cd) return;
    e.preventDefault();
    var s = cd.getData('text');
    if (document.execCommand) document.execCommand('insertText', false, s);
  }
  function num(v) { v = String(v || '').replace(/[^0-9.\-]/g, ''); var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function cents(v) { return Math.round(num(v) * 100); }
  function fmt(c) { return (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function today() { return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }

  var F = document.querySelectorAll('[data-k]');
  var state = readStore(KEY);
  if (!state.terms || typeof state.terms !== 'object') state.terms = {};
  var mode = MODES.indexOf(state.mode) >= 0 ? state.mode : 'Estimate';
  var items = Array.isArray(state.items) && state.items.length ? state.items : [{ d: '', a: '' }];
  var btnShare = $('#btnShare');
  var ready = null; /* a built PDF waiting for a tap, when the share sheet needs a fresh tap */

  /* saved jobs: every document with something in it is kept on this phone (newest 60) */
  var JOBS_KEY = 'ss_receipt_jobs_v1', JOBS_MAX = 60, jobTimer = null;
  var FIELDS = ['num', 'date', 'cname', 'cphone', 'cemail', 'addr1', 'addr2', 'svc', 'rate', 'paid', 'method', 'note'];
  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  if (!state.id) state.id = newId();
  function cleanDoc(src) {
    var s = {};
    if (!src || typeof src !== 'object') return s;
    FIELDS.forEach(function (k) { if (typeof src[k] === 'string') s[k] = src[k].slice(0, 6000); });
    s.mode = MODES.indexOf(src.mode) >= 0 ? src.mode : 'Estimate';
    s.items = (Array.isArray(src.items) ? src.items : []).slice(0, 200).map(function (it) {
      return { d: String((it && it.d) || '').slice(0, 600), a: String((it && it.a) || '').slice(0, 40) };
    });
    s.terms = {};
    if (src.terms && typeof src.terms === 'object') MODES.forEach(function (m) { if (typeof src.terms[m] === 'string') s.terms[m] = src.terms[m].slice(0, 3000); });
    if (typeof src.id === 'string') s.id = src.id.slice(0, 40);
    if (src.numManual) s.numManual = true;
    if (src.stampAuto === false) { s.stampAuto = false; s.stamp = !!src.stamp; }
    if (src.rateAuto === true) { s.rateAuto = true; if (typeof src.taxLoc === 'string') s.taxLoc = src.taxLoc.slice(0, 60); }
    if (src.rateAuto === false) s.rateAuto = false;
    return s;
  }
  function hasContent(s) {
    return ['cname', 'addr1', 'svc', 'cphone'].some(function (k) { return (s[k] || '').trim(); }) ||
      (s.items || []).some(function (it) { return (it.d || '').trim() || (it.a || '').trim(); });
  }
  function totalOf(s) {
    var sub = 0;
    (s.items || []).forEach(function (it) { sub += cents(it.a); });
    return sub + Math.round(sub * num(s.rate) / 100 + 1e-9);
  }
  function storeJob() {
    clearTimeout(jobTimer);
    if (!hasContent(state)) return;
    var jobs = readStore(JOBS_KEY);
    jobs[state.id] = { t: Date.now(), s: cleanDoc(state) };
    var ids = Object.keys(jobs).sort(function (a, b) { return (jobs[b].t || 0) - (jobs[a].t || 0); });
    ids.slice(JOBS_MAX).forEach(function (id) { delete jobs[id]; });
    writeStore(JOBS_KEY, jobs);
  }
  function keepJob() { clearTimeout(jobTimer); jobTimer = setTimeout(storeJob, 500); }
  window.addEventListener('pagehide', storeJob);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') storeJob(); });

  function field(k) { return $('[data-k="' + k + '"]'); }
  function get(k) { var el = field(k); return el ? txt(el).trim() : ''; }
  function setK(k, v) { var el = field(k); if (el) el.textContent = v || ''; }
  function hint(msg, go) { var h = $('#hint'); h.textContent = msg; h.classList.toggle('go', !!go); }

  function save() {
    F.forEach(function (el) {
      var k = el.dataset.k;
      if (k === 'terms') state.terms[mode] = txt(el); else state[k] = txt(el);
    });
    state.mode = mode;
    state.items = items;
    writeStore(KEY, state);
    keepJob();
    if (ready) { ready = null; btnShare.textContent = 'Send PDF'; hint('Tap any line and type. Saves on this phone as you go.'); }
  }

  function setStamp(on) {
    var s = $('#stamp');
    s.classList.toggle('off', !on);
    s.setAttribute('aria-pressed', on ? 'true' : 'false');
    state.stamp = !!on;
  }

  function calc() {
    var sub = 0;
    items.forEach(function (it) { sub += cents(it.a); });
    var rate = num(get('rate'));
    var tax = Math.round(sub * rate / 100 + 1e-9);
    var total = sub + tax, paid = cents(get('paid')), bal = Math.max(0, total - paid);
    $('#sub').textContent = fmt(sub);
    $('#tax').textContent = fmt(tax);
    $('#total').textContent = fmt(total);
    $('#bal').textContent = fmt(bal);
    var noPaid = !get('paid');
    $('#paidRow').classList.toggle('skip', noPaid && mode !== 'Receipt');
    $('#balRow').classList.toggle('skip', noPaid && mode === 'Estimate');
    $('#methodRow').classList.toggle('skip', !get('method'));
    if (state.stampAuto !== false) setStamp(total > 0 && bal === 0);
    $('#taxLocTxt').textContent = (state.rateAuto && state.taxLoc && get('rate')) ? ' · ' + state.taxLoc : '';
    $('#svcSec').classList.toggle('blank', !get('svc'));
    $('#note').classList.toggle('blank', !get('note'));
    $('#terms').classList.toggle('blank', !get('terms'));
  }

  function applyMode() {
    var L = LABELS[mode];
    $('#docTitle').textContent = mode;
    document.title = mode + ' · S&S Remodels';
    document.body.classList.remove('mode-estimate', 'mode-invoice', 'mode-receipt');
    document.body.classList.add('mode-' + mode.toLowerCase());
    document.querySelectorAll('.modes button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.mode === mode ? 'true' : 'false');
    });
    $('#svcHead').textContent = L.svc;
    $('#svcBox').dataset.ph = L.ph;
    $('#paidLbl').textContent = L.paid;
    $('#balLbl').textContent = L.bal;
    $('#terms').textContent = Object.prototype.hasOwnProperty.call(state.terms, mode) ? state.terms[mode] : TERMS[mode];
  }

  function numFromAddr() {
    if (state.numManual) return;
    var m = get('addr1').match(/^\s*(\d+)/);
    if (m) setK('num', m[1]);
  }

  /* sales tax from the job address: WA Department of Revenue's own lookup (its URL interface) */
  var DOR = 'https://webgis.dor.wa.gov/webapi/AddressRates.aspx?output=xml';
  var lookTimer = null, lookSeq = 0, lastLook = '';
  function taxStatus(msg, offer) {
    var el = $('#taxLook'); el.textContent = msg || ''; el.hidden = !msg;
    if (offer) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'usetax'; b.textContent = 'Use ' + offer.pct + '%';
      b.addEventListener('click', function () { applyRate(offer); });
      el.appendChild(document.createTextNode(' ')); el.appendChild(b);
    }
  }
  function niceName(n) {
    return String(n || '').toLowerCase().replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }).replace(/\bPtba\b/, 'PTBA').replace(/\bRta\b/, 'RTA');
  }
  function applyRate(r) {
    setK('rate', r.pct); state.rateAuto = true; state.taxLoc = r.name;
    calc(); save();
    taxStatus('Sales tax ' + r.pct + '% for ' + r.name + ' (location code ' + r.loc + '), from the WA Department of Revenue.' + (r.matched ? ' Matched ' + r.matched + '.' : ''));
  }
  function scheduleLookup() { clearTimeout(lookTimer); lookTimer = setTimeout(lookupTax, 1500); }
  function lookupTax() {
    clearTimeout(lookTimer);
    var street = get('addr1'), line2 = get('addr2');
    var zipM = line2.match(/\b(\d{5})(?:-\d{4})?\b/), zip = zipM ? zipM[1] : '';
    var city = line2.split(',')[0].replace(/\b\d{5}(-\d{4})?\b/, '').trim();
    if (!street || !/\d/.test(street) || (!zip && !city)) return;
    var key = (street + '|' + city + '|' + zip).toLowerCase();
    if (key === lastLook) return;
    lastLook = key;
    var seq = ++lookSeq;
    taxStatus('Looking up the sales tax rate for this address…');
    var url = DOR + '&addr=' + encodeURIComponent(street) + '&city=' + encodeURIComponent(city) + '&zip=' + encodeURIComponent(zip);
    fetch(url).then(function (r) { if (!r.ok) throw new Error('http'); return r.text(); }).then(function (x) {
      if (seq !== lookSeq) return;
      var doc = new DOMParser().parseFromString(x, 'application/xml');
      var resp = doc.querySelector('response'), rt = doc.querySelector('rate'), al = doc.querySelector('addressline');
      var code = resp ? parseInt(resp.getAttribute('code'), 10) : 9;
      var rate = resp ? parseFloat(resp.getAttribute('rate')) : NaN;
      if (code >= 0 && code <= 4 && isFinite(rate) && rate > 0 && rate < 0.2) {
        var r = {
          pct: String(+(rate * 100).toFixed(3)),
          name: niceName(rt ? rt.getAttribute('name') : '') || 'this address',
          loc: resp.getAttribute('loccode') || '',
          matched: code === 0 || !al ? '' : [al.getAttribute('houselow'), niceName(al.getAttribute('street')), al.getAttribute('zip')].filter(Boolean).join(' ')
        };
        if (state.rateAuto === false && get('rate') && num(get('rate')) !== num(r.pct)) {
          taxStatus('The state lookup says ' + r.pct + '% for ' + r.name + '. You typed ' + get('rate') + '%.', r);
        } else {
          applyRate(r);
        }
      } else {
        if (state.rateAuto !== false) { setK('rate', ''); state.rateAuto = undefined; state.taxLoc = ''; calc(); save(); }
        taxStatus(code === 5
          ? 'Could not match that street exactly, so the rate is blank. Check the street and ZIP, or look the rate up below.'
          : 'The state lookup could not find that address, so the rate is blank. Check it, or look the rate up below.');
      }
    }).catch(function () {
      if (seq !== lookSeq) return;
      lastLook = '';
      taxStatus('Could not reach the state tax lookup (no signal?). Check the rate, or it will try again when you edit the address.');
    });
  }

  /* line items */
  function renderItems() {
    var box = $('#items');
    box.textContent = '';
    items.forEach(function (it, i) {
      var row = document.createElement('div'); row.className = 'item';
      var d = document.createElement('div'); d.className = 'desc'; d.dataset.ph = 'Line item'; d.setAttribute('enterkeyhint', 'next');
      var w = document.createElement('span'); w.className = 'amtw'; w.appendChild(document.createTextNode('$'));
      var a = document.createElement('b'); a.className = 'amt'; a.dataset.ph = '0.00';
      a.setAttribute('inputmode', 'decimal'); a.setAttribute('enterkeyhint', 'next');
      w.appendChild(a);
      var x = document.createElement('button'); x.type = 'button'; x.className = 'x'; x.setAttribute('aria-label', 'Remove line'); x.textContent = '✕';
      makePlain(d); makePlain(a);
      d.textContent = it.d || ''; a.textContent = it.a || '';
      function blankCheck() { row.classList.toggle('blank', !d.textContent.trim() && !a.textContent.trim()); }
      blankCheck();
      d.addEventListener('input', function () { fixEmpty(d); items[i].d = d.textContent; blankCheck(); save(); });
      a.addEventListener('input', function () { fixEmpty(a); items[i].a = a.textContent; blankCheck(); calc(); save(); });
      a.addEventListener('blur', function () {
        if (a.textContent.trim()) { a.textContent = fmt(cents(a.textContent)); items[i].a = a.textContent; }
        calc(); save();
      });
      [d, a].forEach(function (el) {
        el.addEventListener('keydown', function (e) {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          if (el === d) a.focus();
          else if (i === items.length - 1) addItem();
          else box.children[i + 1].querySelector('.desc').focus();
        });
        el.addEventListener('paste', plainPaste);
      });
      x.addEventListener('click', function () {
        items.splice(i, 1);
        if (!items.length) items.push({ d: '', a: '' });
        renderItems(); calc(); save();
      });
      row.appendChild(d); row.appendChild(w); row.appendChild(x);
      box.appendChild(row);
    });
  }
  function addItem() {
    items.push({ d: '', a: '' });
    renderItems(); calc(); save();
    $('#items').lastChild.querySelector('.desc').focus();
  }
  $('#btnAdd').addEventListener('click', addItem);

  /* fields */
  F.forEach(function (el) {
    var k = el.dataset.k;
    makePlain(el);
    el.addEventListener('input', function () {
      fixEmpty(el);
      if (k === 'num') state.numManual = !!el.textContent.trim();
      if (k === 'addr1') numFromAddr();
      if (k === 'rate') { state.rateAuto = false; state.taxLoc = ''; }
      if (k === 'addr1' || k === 'addr2') scheduleLookup();
      calc(); save();
    });
    el.addEventListener('blur', function () {
      if (k === 'paid' && el.textContent.trim()) el.textContent = fmt(cents(el.textContent));
      if (k === 'rate' && el.textContent.trim()) el.textContent = String(+num(el.textContent).toFixed(3));
      if (k === 'addr1' || k === 'addr2') lookupTax();
      calc(); save();
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !MULTI[k]) { e.preventDefault(); el.blur(); }
    });
    el.addEventListener('paste', plainPaste);
  });

  /* document type */
  document.querySelectorAll('.modes button').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.dataset.mode === mode) return;
      save();
      mode = b.dataset.mode;
      applyMode(); calc(); save();
    });
  });

  /* paid in full stamp (receipts) */
  function toggleStamp() { state.stampAuto = false; setStamp($('#stamp').classList.contains('off')); save(); }
  $('#stamp').addEventListener('click', toggleStamp);
  $('#stamp').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleStamp(); } });

  /* signatures */
  var sigs = readStore(SIG_KEY);
  function initSig(id) {
    var c = document.getElementById(id), pad = c.parentNode, hintEl = pad.querySelector('.sig-hint');
    var ctx = null, lastW = 0, drawing = false, last = null;
    function setup() {
      var r = c.getBoundingClientRect();
      if (!r.width || Math.round(r.width) === lastW) return;
      lastW = Math.round(r.width);
      var dpr = window.devicePixelRatio || 1;
      c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
      ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1b2524'; ctx.fillStyle = '#1b2524';
      if (sigs[id]) restore(sigs[id]);
    }
    function restore(url) {
      var im = new Image();
      im.onload = function () { var r = c.getBoundingClientRect(); ctx.drawImage(im, 0, 0, r.width, r.height); hintEl.style.display = 'none'; };
      im.src = url;
    }
    function pt(e) { var r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    c.addEventListener('pointerdown', function (e) {
      if (!ctx) setup();
      drawing = true; last = pt(e); hintEl.style.display = 'none';
      try { c.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
      ctx.beginPath(); ctx.arc(last.x, last.y, 1.1, 0, Math.PI * 2); ctx.fill();
      e.preventDefault();
    });
    c.addEventListener('pointermove', function (e) {
      if (!drawing) return;
      var p = pt(e);
      ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      last = p; e.preventDefault();
    });
    function end() {
      if (!drawing) return;
      drawing = false;
      sigs[id] = c.toDataURL('image/png');
      writeStore(SIG_KEY, sigs);
    }
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.clearSig = function () {
      if (ctx) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); ctx.restore(); }
      hintEl.style.display = '';
      delete sigs[id]; writeStore(SIG_KEY, sigs);
    };
    setup();
    window.addEventListener('resize', setup);
  }
  function clearSig(id) { var c = document.getElementById(id); if (c && c.clearSig) c.clearSig(); }
  document.querySelectorAll('.sig-clear').forEach(function (b) { b.addEventListener('click', function () { clearSig(b.dataset.sig); }); });

  /* new document */
  $('#btnNew').addEventListener('click', function () {
    var kept = hasContent(state);
    if (!window.confirm('Start a new ' + mode.toLowerCase() + '?' + (kept ? ' The one on screen stays saved under Open.' : ''))) return;
    storeJob();
    var terms = state.terms;
    F.forEach(function (el) { var k = el.dataset.k; if (k !== 'terms') el.textContent = ''; });
    state = { terms: terms, mode: mode, id: newId() };
    items = [{ d: '', a: '' }];
    setK('date', today());
    lastLook = ''; taxStatus('');
    renderItems(); applyMode(); setStamp(false); calc(); save();
    clearSig('sigCust'); /* Shaun's own signature stays */
    window.scrollTo(0, 0);
  });

  /* contacts: the phone's contact picker where there is one (Android Chrome), else a .vcf file */
  function fillContact(c) {
    if (c.name) setK('cname', c.name);
    if (c.phone) setK('cphone', c.phone);
    if (c.email) setK('cemail', c.email);
    if (c.street) setK('addr1', c.street);
    if (c.csz) setK('addr2', c.csz);
    numFromAddr(); calc(); save();
    if (c.street) lookupTax();
    hint(c.name ? 'Added ' + c.name + '.' : 'No contact found.');
  }
  $('#btnContact').addEventListener('click', function () {
    var cm = navigator.contacts;
    if (!cm || !cm.select || !window.isSecureContext) { $('#vcf').click(); return; }
    var props = ['name', 'tel', 'email'];
    (cm.getProperties ? cm.getProperties() : Promise.resolve(props)).then(function (sup) {
      if (sup.indexOf('address') >= 0) props.push('address');
      return cm.select(props, { multiple: false });
    }).then(function (list) {
      if (!list || !list.length) return;
      var p = list[0], out = {};
      out.name = (p.name && p.name[0]) || '';
      out.phone = (p.tel && p.tel[0]) || '';
      out.email = (p.email && p.email[0]) || '';
      var ad = p.address && p.address[0];
      if (ad) {
        out.street = (ad.addressLine || []).join(', ');
        var cs = [ad.city, ad.region].filter(Boolean).join(', ');
        out.csz = [cs, ad.postalCode].filter(Boolean).join(' ');
      }
      fillContact(out);
    }).catch(function () { $('#vcf').click(); });
  });
  $('#vcf').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () { fillContact(parseVCard(String(r.result))); e.target.value = ''; };
    r.readAsText(f);
  });
  function unQP(v) { try { return v.replace(/=([0-9A-F]{2})/gi, function (m, h) { return String.fromCharCode(parseInt(h, 16)); }); } catch (e) { return v; } }
  function clean(x) { return String(x == null ? '' : x).replace(/\\n/gi, ' ').replace(/\\,/g, ',').replace(/\\;/g, ';').trim(); }
  function parseVCard(text) {
    var out = {}, best = -1;
    var u = String(text).replace(/=\r?\n/g, '').replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
    u.split(/\r\n|\n|\r/).forEach(function (line) {
      var i = line.indexOf(':'); if (i < 0) return;
      var raw = line.slice(0, i), key = raw.split(';')[0], val = line.slice(i + 1);
      if (key.indexOf('.') >= 0) key = key.slice(key.indexOf('.') + 1);
      key = key.toUpperCase();
      if (/ENCODING=QUOTED-PRINTABLE/i.test(raw)) val = unQP(val);
      if (key === 'FN' && !out.name) out.name = clean(val);
      else if (key === 'N' && !out.name) { var p = val.split(';'); out.name = clean((p[1] || '') + ' ' + (p[0] || '')); }
      else if (key === 'TEL' && !out.phone) out.phone = clean(val.replace(/^tel:/i, ''));
      else if (key === 'EMAIL' && !out.email) out.email = clean(val.replace(/^mailto:/i, ''));
      else if (key === 'ADR') {
        var a = val.split(';').map(clean), street = a[2] || '';
        var csz = [a[3], a[4]].filter(Boolean).join(', ');
        if (a[5]) csz = (csz ? csz + ' ' : '') + a[5];
        if (!street && !csz) street = a.filter(Boolean).join(', ');
        var score = (street ? 2 : 0) + (csz ? 1 : 0) + a.filter(Boolean).length;
        if ((street || csz) && score > best) { best = score; out.street = street; out.csz = csz; }
      }
    });
    return out;
  }

  /* PDF: build it on the phone, then open the share sheet (text, email, Drive) */
  function loadLib() {
    return new Promise(function (ok, no) {
      if (window.html2pdf) { ok(); return; }
      var s = document.createElement('script'); s.src = LIB; s.onload = ok; s.onerror = no;
      document.head.appendChild(s);
    });
  }
  function pdfName() {
    var last = get('cname').split(/\s+/).pop();
    return ['SS-Remodels', mode, last, get('num')].filter(Boolean).join('-').replace(/[^A-Za-z0-9-]+/g, '') + '.pdf';
  }
  function makePdf() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    var name = pdfName();
    return loadLib().then(function () {
      document.body.classList.add('pdfing');
      return document.fonts && document.fonts.ready ? document.fonts.ready : null;
    }).then(function () {
      return window.html2pdf().set({
        margin: [0.3, 0, 0.3, 0],
        filename: name,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#fdfdfd', scrollX: 0, scrollY: 0 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['.item', '.totals', '.terms', '.sigs', '.two', '.foot'] }
      }).from($('#sheet')).toPdf().get('pdf').then(function (pdf) {
        /* a copy of the job rides inside the PDF, so Open a PDF can bring it back */
        pdf.setProperties({ title: name.replace(/\.pdf$/, ''), subject: mode + ' from S&S Remodels LLC', author: 'S&S Remodels LLC', creator: 'ssremodelz.com', keywords: PDF_TAG + b64enc(JSON.stringify(cleanDoc(state))) + PDF_END });
      }).outputPdf('blob');
    }).then(function (blob) {
      document.body.classList.remove('pdfing');
      return new File([blob], name, { type: 'application/pdf' });
    }, function (err) {
      document.body.classList.remove('pdfing');
      throw err;
    });
  }
  function download(file) {
    var url = URL.createObjectURL(file), a = document.createElement('a');
    a.href = url; a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 15000);
  }
  function send(file) {
    if (navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file], title: file.name }).then(function () {
        hint('Sent.');
      }, function (e) {
        if (e && e.name === 'AbortError') { hint('Not sent. Tap Send PDF to try again.'); return; }
        ready = file; btnShare.textContent = 'Tap to send';
        hint('PDF is ready. Tap the green button to send it.', true);
      });
    }
    download(file);
    hint('PDF saved: ' + file.name);
    return Promise.resolve();
  }
  btnShare.addEventListener('click', function () {
    if (ready) { var f = ready; ready = null; btnShare.textContent = 'Send PDF'; send(f); return; }
    btnShare.disabled = true; btnShare.textContent = 'Building PDF…';
    makePdf().then(function (f) {
      btnShare.disabled = false; btnShare.textContent = 'Send PDF';
      return send(f);
    }).catch(function () {
      btnShare.disabled = false; btnShare.textContent = 'Send PDF';
      hint('Could not build the PDF. Try Print, then Save as PDF.');
    });
  });
  $('#btnPrint').addEventListener('click', function () {
    if (INAPP) { btnShare.click(); return; }
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    window.print();
  });

  /* Open: saved jobs on this phone, or a PDF sent from here */
  var PDF_TAG = 'SSRDATA1:', PDF_END = ':SSREND';
  function b64enc(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64dec(b) {
    var bin = atob(b), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function openDoc(src, asCopy) {
    storeJob();
    var s = cleanDoc(src);
    if (asCopy || !s.id) { s.id = newId(); }
    if (asCopy) { s.date = today(); delete s.stamp; delete s.stampAuto; }
    state = s;
    mode = s.mode;
    items = s.items.length ? s.items : [{ d: '', a: '' }];
    F.forEach(function (el) { var k = el.dataset.k; if (k !== 'terms') el.textContent = s[k] || ''; });
    if (!s.date) setK('date', today());
    var stampWas = !!s.stamp;
    renderItems(); applyMode();
    setStamp(false);
    if (s.stampAuto === false) setStamp(stampWas);
    calc(); save(); storeJob();
    clearSig('sigCust'); /* a different job: the customer signs again */
    window.scrollTo(0, 0);
  }
  var dlg = $('#jobsDlg');
  function jobLabel(s) { return (s.mode || 'Estimate') + ' · ' + ((s.cname || '').trim() || 'No name'); }
  function renderJobs() {
    var jobs = readStore(JOBS_KEY), list = $('#jobsList');
    var ids = Object.keys(jobs).sort(function (a, b) { return (jobs[b].t || 0) - (jobs[a].t || 0); });
    list.textContent = '';
    $('#jobsEmpty').hidden = ids.length > 0;
    ids.forEach(function (id) {
      var j = jobs[id], s = j.s || {};
      var li = document.createElement('li'); li.className = 'job' + (id === state.id ? ' cur' : '');
      var main = document.createElement('button'); main.type = 'button'; main.className = 'main';
      var t1 = document.createElement('div'); t1.className = 't1'; t1.textContent = jobLabel(s) + (id === state.id ? '  (on screen)' : '');
      var t2 = document.createElement('div'); t2.className = 't2';
      t2.textContent = ['$' + fmt(totalOf(s)), (s.addr1 || '').trim(), (s.date || '').trim()].filter(function (x) { return x && x !== '$'; }).join(' · ');
      main.appendChild(t1); main.appendChild(t2);
      var copy = document.createElement('button'); copy.type = 'button'; copy.className = 'copy'; copy.textContent = 'Copy';
      var del = document.createElement('button'); del.type = 'button'; del.className = 'del'; del.setAttribute('aria-label', 'Delete'); del.textContent = '✕';
      main.addEventListener('click', function () {
        if (id !== state.id) openDoc(s, false);
        dlg.close(); hint('Opened ' + jobLabel(s) + '.');
      });
      copy.addEventListener('click', function () {
        openDoc(s, true);
        dlg.close(); hint('New copy of ' + jobLabel(s) + '. Change what you need.', true);
      });
      del.addEventListener('click', function () {
        if (!window.confirm('Delete the saved ' + jobLabel(s) + '?')) return;
        var all = readStore(JOBS_KEY); delete all[id]; writeStore(JOBS_KEY, all);
        renderJobs();
      });
      var side = document.createElement('div'); side.className = 'side';
      side.appendChild(copy); side.appendChild(del);
      li.appendChild(main); li.appendChild(side);
      list.appendChild(li);
    });
  }
  $('#btnOpen').addEventListener('click', function () {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    storeJob(); renderJobs();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  });
  $('#jobsClose').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  $('#btnOpenPdf').addEventListener('click', function () { $('#pdfIn').click(); });
  $('#pdfIn').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      e.target.value = '';
      var text = new TextDecoder('latin1').decode(new Uint8Array(r.result));
      var m = text.match(/SSRDATA1:([A-Za-z0-9+\/=]+):SSREND/);
      var doc = null;
      try { doc = m ? JSON.parse(b64dec(m[1])) : null; } catch (err) { doc = null; }
      if (!doc) { window.alert('That PDF has no saved job in it. Only PDFs made with the Send PDF button can be opened.'); return; }
      openDoc(doc, true);
      dlg.close(); hint('Opened from ' + f.name + '.', true);
    };
    r.readAsArrayBuffer(f);
  });

  /* start */
  load();
  function load() {
    F.forEach(function (el) { var k = el.dataset.k; if (k !== 'terms' && state[k]) el.textContent = state[k]; });
    if (!state.date) setK('date', today());
    renderItems();
    applyMode();
    if (state.stampAuto === false) setStamp(state.stamp);
    calc();
    ['sigShaun', 'sigCust'].forEach(initSig);
  }

  /* opened inside Facebook, Messenger, Instagram and the like: point to the real browser,
     where Send PDF, contacts and Add to Home screen work */
  if (INAPP) {
    var url = location.origin + '/receipt.html';
    var android = /Android/i.test(navigator.userAgent || '');
    var box = document.createElement('div'); box.className = 'inapp'; box.setAttribute('role', 'alert');
    var msg = document.createElement('span');
    msg.textContent = android ? 'Open this in Chrome for Send PDF, contacts and the home screen icon.' : 'Open this in your browser for Send PDF and contacts.';
    var go = document.createElement('button'); go.type = 'button';
    go.textContent = android ? 'Open in Chrome' : 'Copy link';
    var shut = document.createElement('button'); shut.type = 'button'; shut.className = 'shut'; shut.setAttribute('aria-label', 'Dismiss'); shut.textContent = '✕';
    go.addEventListener('click', function () {
      if (android) {
        location.href = 'intent://' + url.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end';
        setTimeout(function () { msg.textContent = 'If Chrome did not open: tap the menu (three dots), then Open in browser.'; }, 1200);
        return;
      }
      var done = function () { go.textContent = 'Copied'; msg.textContent = 'Paste the link in your browser. Or tap the menu, then Open in browser.'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { msg.textContent = url; });
      else msg.textContent = url;
    });
    shut.addEventListener('click', function () { box.remove(); });
    box.appendChild(msg); box.appendChild(go); box.appendChild(shut);
    document.body.insertBefore(box, document.body.firstChild);
  }

  /* works offline once opened (job sites with no signal) */
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('/receipt-sw.js', { scope: '/receipt' }).catch(function () { /* fine */ });
  }
})();
