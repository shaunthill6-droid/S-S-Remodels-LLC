# S&S Remodels LLC — website

Static site: one `index.html`, no build step.

- `index.html` — the page
- `assets/ss-brand.css` — approved design tokens + components (from the brand handoff)
- `assets/site.css` — page layout on top of the brand tokens
- `assets/site.js` — mobile menu + form validation (site works without it)
- `assets/ss-remodels-approved.png` — the approved logo (never edit)
- `brand/` — brand references and the style handoff
- `CONTENT.md` — what still needs to be supplied before launch

## Estimate, invoice and receipt builder

`https://ssremodelz.com/receipt.html` is Shaun's paperwork tool, not linked from the site and marked noindex. One page, three modes (Estimate, Invoice, Receipt), line items, sales tax filled in from the job address by the WA Department of Revenue's address lookup (typed by hand when there is no match or no signal), deposit or paid, balance, signatures, a Send PDF button (builds the PDF on the phone and opens the share sheet) and Print. Everything typed is saved only on that phone; every job is kept (newest 60) and Open brings one back to edit or copy. Each PDF made with Send PDF carries a copy of its job, so Open a PDF made here restores it on any phone. Add it to the home screen and it opens like an app and works offline.

- `receipt.html`, `assets/receipt.css`, `assets/receipt.js` — the tool
- `receipt-manifest.json`, `receipt-sw.js`, `assets/receipt-icon-*.png` — home-screen app and offline copy
- `assets/receipt-logo.png` — the approved logo with its white background made transparent, for paper
- `assets/vendor/html2pdf.bundle.min.js` — html2pdf.js 0.10.1 (MIT, licenses beside it)
- `assets/fonts/` — Barlow and Barlow Condensed (SIL OFL)

Preview locally: `python3 -m http.server 8080` then open http://localhost:8080.
