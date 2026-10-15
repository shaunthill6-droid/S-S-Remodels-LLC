# Business cards (Vistaprint), 5 designs, front and back

Canvas **3.75 x 2.25 in** = 3.5 x 2 in card + 0.125 in bleed. Safe area (all text, logos, QR codes) is
3.25 x 1.75 in, 0.125 in inside the trim. Matches Vistaprint's "business card file prep" table.

| # | Name | Front | Back |
|---|---|---|---|
| 1 | Falls Centered | Waterfall, logo plaque and tagline | Name, contact lines, both QR codes |
| 2 | Open Falls | Website look: logo plaque left, falls open, name and contact | White, both QR codes, tagline, falls strip |
| 3 | Clean White | White, large logo, name and contact, falls band | Waterfall, both QR codes large |
| 4 | Sand & Forest | Sand and waterfall panel, logo, name and contact | Forest green, both QR codes, "An honest day for honest pay." |
| 5 | Name Forward | Big name, contact lines, contact QR | Logo plaque and website QR |

## Upload to Vistaprint
- `pdf/design-N-*.pdf` is the 2-page file (page 1 front, page 2 back). `pdf/faces/dN-front.pdf` / `dN-back.pdf` are single pages.
- Check Vistaprint's own product template: their help page quotes 3.75 x 2.25 in, but also cites a 3.61 x 2.11 in guide.
- Files are RGB with embedded fonts. Vistaprint converts to CMYK; look at the proof for colour shifts.
- Photos print at about 418 dpi and logos at 700 to 950 dpi (Vistaprint asks for 300 minimum).
- Scan the on-screen proof with a phone before ordering.

## Rebuild / verify
```
python3 -I build_cards.py                          # writes html/
NODE_PATH=$(npm root -g) node render_cards.js      # writes pdf/faces/, checks safe area + QR sizes + font size
python3 -I verify_cards.py                         # decodes QR codes, merges pages, writes cards-preview.png
```
`preview/guides-review.png` shows trim (green) and safe area (red) over every face. Fonts: Barlow, Barlow Condensed (SIL OFL), see `fonts/LICENSE.txt`.
Content: Shaun Thill, Owner (title not yet confirmed by him), (509) 200-3095, shaun@ssremodelz.com, ssremodelz.com, Spokane, WA.
