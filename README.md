# S&S Remodels LLC — website

Static site: one `index.html`, no build step.

- `index.html` — the page
- `assets/ss-brand.css` — approved design tokens + components (from the brand handoff)
- `assets/site.css` — page layout on top of the brand tokens
- `assets/site.js` — mobile menu + form validation (site works without it)
- `assets/ss-remodels-approved.png` — the approved logo (never edit)
- `brand/` — brand references and the style handoff
- `CONTENT.md` — what still needs to be supplied before launch

Preview locally: `python3 -m http.server 8080` then open http://localhost:8080.
