// S&S Remodels LLC: small progressive enhancements. Site works without JS.
(function () {
  'use strict';

  // ---- mobile nav ----
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  // ---- footer year ----
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  // ---- estimate form (client-side validation; no backend wired yet) ----
  var form = document.getElementById('estimate-form');
  if (!form) return;
  var status = document.getElementById('form-status');

  function setError(input, show) {
    var msg = document.getElementById(input.id + '-error');
    input.setAttribute('aria-invalid', show ? 'true' : 'false');
    if (msg) msg.hidden = !show;
  }

  function validate() {
    var ok = true;
    var first = null;
    ['f-name', 'f-phone', 'f-message'].forEach(function (id) {
      var el = document.getElementById(id);
      var bad = !el.value.trim();
      setError(el, bad);
      if (bad) { ok = false; first = first || el; }
    });
    var email = document.getElementById('f-email');
    var badEmail = email.value.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    setError(email, badEmail);
    if (badEmail) { ok = false; first = first || email; }
    if (first) first.focus();
    return ok;
  }

  form.querySelectorAll('.ss-input').forEach(function (el) {
    el.addEventListener('input', function () { setError(el, false); });
  });

  function showSent() {
    form.classList.add('is-sent');
    status.className = 'form-status is-success';
    status.textContent = 'Thanks, we got it. We\'ll be in touch soon.';
  }

  // Back from the form service with ?sent=1 → show the thank-you state.
  if (/[?&]sent=1/.test(window.location.search)) {
    showSent();
    if (window.history.replaceState) window.history.replaceState(null, '', window.location.pathname + '#contact');
  }

  form.addEventListener('submit', function (e) {
    status.className = 'form-status';
    status.textContent = '';
    if (!validate()) {
      e.preventDefault();
      status.className = 'form-status is-error';
      status.textContent = 'Please fix the highlighted fields.';
      return;
    }
    // valid → the browser posts to the form service, which redirects back with ?sent=1
    form.querySelector('.form-submit').disabled = true;
  });
})();
