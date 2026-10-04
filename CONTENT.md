# Content checklist — what the owner still needs to supply

Nothing on the site claims a license, review, award, years in business, address or
coverage area beyond "Spokane, WA and the surrounding area". Fill these in to launch.

## Must have before launch
- [ ] **Phone number** → `index.html` contact section (`data-placeholder="phone"`)
- [ ] **Email address** → `index.html` contact section (`data-placeholder="email"`)
- [ ] **Form destination** — the estimate form validates but posts nowhere.
      Wire `action` to Formspree / Netlify Forms / Basin etc. (`assets/site.js`, `index.html`)
- [ ] **Confirm the services list** (currently a draft): Kitchens · Bathrooms · Basements ·
      Decks & outdoor · Additions · Whole-home remodels. Remove or add as needed.
- [ ] **Project photos** — replace the six dashed "coming soon" tiles in `#projects`.

## Should have
- [ ] WA contractor license number (and "licensed, bonded & insured" if true) → footer
- [ ] Service area detail — which towns / counties around Spokane
- [ ] A photo of the owner / crew for an "About" section
- [ ] Domain name + hosting (GitHub Pages works for this static site)

## Assets
- `assets/ss-remodels-approved.png` — approved logo, untouched, 1536×1024, opaque white.
- `assets/ss-logo-trimmed.png` — deterministic whitespace trim of the above (content bbox + 24px),
  1520×699, used in the header and footer. Every visible part of the mark is preserved.
- A transparent-background or vector logo does **not** exist yet. If one is needed (dark header,
  print, signage) it has to be produced separately — the raster must not be redrawn or blended.
