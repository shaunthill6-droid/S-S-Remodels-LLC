// Render each card face to a 3.75 x 2.25 in PDF and check the layout.
// Usage: NODE_PATH=$(npm root -g) node render_cards.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const HTML = path.join(HERE, 'html');
const OUT = path.join(HERE, 'pdf', 'faces');
fs.mkdirSync(OUT, { recursive: true });

// Safe area on the 3.75 x 2.25 canvas (card trim is 0.125 in inside the canvas; safe is 0.125 in inside trim)
const SAFE = { l: 0.25, t: 0.25, r: 3.5, b: 2.0 };
const TOL = 0.004;                     // inches
const MIN_QR = { 'qr-save-contact.svg': 1.0, 'qr-website.svg': 0.75 };
const PX = 96;                         // CSS px per inch

(async () => {
  const browser = await chromium.launch();
  let problems = 0;
  for (const f of fs.readdirSync(HTML).filter(x => x.endsWith('.html')).sort()) {
    const name = f.replace('.html', '');
    const page = await browser.newPage({ viewport: { width: Math.round(3.75 * PX), height: Math.round(2.25 * PX) } });
    await page.goto('file://' + path.join(HTML, f), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const report = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('.keep').forEach(el => {
        // for text blocks measure the text itself, not the (possibly wider) box
        let r = el.getBoundingClientRect();
        if (!el.classList.contains('qr') && !el.classList.contains('plaque') && !el.classList.contains('abs')) {
          const range = document.createRange(); range.selectNodeContents(el); r = range.getBoundingClientRect();
        } else if (el.classList.contains('abs') && !el.querySelector('img.logo')) {
          const range = document.createRange(); range.selectNodeContents(el); const rr = range.getBoundingClientRect();
          if (rr.width) r = rr;
        }
        out.push({ cls: el.className, qr: el.dataset.qr || null, text: (el.innerText || '').slice(0, 24).replace(/\n/g, ' '),
                   l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height });
      });
      const fonts = [...document.fonts].filter(x => x.status === 'loaded').map(x => x.family + ' ' + x.weight);
      return { out, fonts };
    });
    const issues = [];
    for (const e of report.out) {
      const l = e.l / PX, t = e.t / PX, r = e.r / PX, b = e.b / PX;
      if (l < SAFE.l - TOL || t < SAFE.t - TOL || r > SAFE.r + TOL || b > SAFE.b + TOL)
        issues.push(`OUTSIDE SAFE AREA: "${e.text || e.qr || e.cls}" l${l.toFixed(3)} t${t.toFixed(3)} r${r.toFixed(3)} b${b.toFixed(3)}`);
      if (e.qr) {
        const size = e.w / PX;
        if (size < MIN_QR[e.qr] - TOL) issues.push(`QR TOO SMALL: ${e.qr} ${size.toFixed(3)} in (min ${MIN_QR[e.qr]})`);
        if (Math.abs(e.w - e.h) > 1) issues.push(`QR NOT SQUARE: ${e.qr}`);
      }
    }
    const qrs = report.out.filter(e => e.qr).map(e => `${e.qr.replace('qr-', '').replace('.svg', '')} ${(e.w / PX).toFixed(2)}in`);
    // text smaller than 5.5pt would be too small to print legibly
    const tiny = await page.evaluate(() => [...document.querySelectorAll('.face *')]
      .filter(el => el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
      .map(el => parseFloat(getComputedStyle(el).fontSize) * 0.75).filter(pt => pt < 5.4));
    if (tiny.length) issues.push(`TEXT BELOW 5.5pt: ${tiny.join(',')}`);
    await page.pdf({ path: path.join(OUT, name + '.pdf'), width: '3.75in', height: '2.25in',
                     printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 }, pageRanges: '1' });
    console.log(`${name.padEnd(9)} ${issues.length ? 'ISSUES' : 'ok    '} | keep-items ${String(report.out.length).padStart(2)} | QR: ${qrs.join(', ') || 'none'} | fonts: ${[...new Set(report.fonts)].join(', ')}`);
    issues.forEach(i => { console.log('   - ' + i); problems++; });
    await page.close();
  }
  await browser.close();
  console.log(problems ? `\n${problems} problem(s)` : '\nlayout checks passed');
  process.exit(problems ? 1 : 0);
})();
