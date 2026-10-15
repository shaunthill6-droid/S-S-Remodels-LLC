# Print QR codes (business cards)

| File | Scans to | Use |
|---|---|---|
| `qr-save-contact.pdf` / `.png` / `.svg` | Contact card: Shaun Thill, S&S Remodels LLC, (509) 200-3095, shaun@ssremodelz.com, ssremodelz.com | "Scan to save my contact" |
| `qr-website.pdf` / `.png` / `.svg` | https://ssremodelz.com | "Scan to visit our website" |
| `qr-preview.png` | Both, labelled | Preview only, not for print |

- The contact QR holds the card itself, so it works with no internet and no website: iPhone Camera
  and Android Camera / Google Lens both offer "Add contact". It has no photo (photos are too big for a QR).
- **Vistaprint: upload the PDF** (vector, sharp at any size). Vistaprint's help centre lists PDF as recommended and
  PNG as accepted; SVG is not on its list. The PDFs come pre-sized (contact 1 in, website 0.75 in).
- The PNGs are tagged so they import at that same size: 1220 DPI for the contact code, about 1630 DPI for the website code. Vistaprint asks for 300.
- The SVGs are for other printers or design tools that take them.
- Colour is the logo charcoal #1B2524 on white. Keep dark-on-light; do not invert or put on a photo.
- Keep the white margin around each code (the "quiet zone"). Do not crop it.
- Minimum printed size: contact code 1 inch (25 mm) square, website code 0.75 inch (19 mm).
- Generated 2026-10-08 with segno. Both decode back to their exact contents, including the PDFs rendered at 300 DPI at their printed size.
- At minimum size a single square in the code measures 0.42 mm (contact) and 0.51 mm (website).

## Business cards
Five front/back designs with the logo, his info and both QR codes: see `cards/README.md`.
