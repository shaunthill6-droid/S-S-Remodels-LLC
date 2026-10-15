#!/usr/bin/env python3
"""Verify the card PDFs, merge front+back per design, and build a preview sheet.

Checks: page size 3.75 x 2.25 in, fonts embedded, no em/en dashes, and that every QR code decodes back to
its exact contents when rendered at 300 dpi, at 150 dpi, and at 300 dpi with a light blur.
Run: python3 -I verify_cards.py
"""
import os, re, sys
import pymupdf, zxingcpp
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FACES = os.path.join(HERE, "pdf", "faces")
PNG = os.path.join(HERE, "preview")
os.makedirs(PNG, exist_ok=True)

VCARD = "\n".join(["BEGIN:VCARD", "VERSION:3.0", "N:Thill;Shaun", "FN:Shaun Thill", "ORG:S&S Remodels LLC",
                   "TEL;TYPE=CELL:+15092003095", "EMAIL:shaun@ssremodelz.com", "URL:https://ssremodelz.com", "END:VCARD"])
SITE = "https://ssremodelz.com"
EXPECT = {"d1-back": {VCARD, SITE}, "d2-back": {VCARD, SITE}, "d3-back": {VCARD, SITE}, "d4-back": {VCARD, SITE},
          "d5-front": {VCARD}, "d5-back": {SITE}}
TITLES = {1: "Falls Centered", 2: "Open Falls", 3: "Clean White", 4: "Sand & Forest", 5: "Name Forward"}

def render(pdf, dpi):
    doc = pymupdf.open(pdf)
    pix = doc[0].get_pixmap(dpi=dpi)
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)

fail = 0
def check(ok, msg):
    global fail
    print(("  ok   " if ok else "  FAIL ") + msg)
    if not ok: fail += 1

for face in sorted(f[:-4] for f in os.listdir(FACES) if f.endswith(".pdf")):
    path = os.path.join(FACES, face + ".pdf")
    doc = pymupdf.open(path)
    w, h = doc[0].rect.width / 72, doc[0].rect.height / 72
    print(face)
    check(doc.page_count == 1 and abs(w - 3.75) < .01 and abs(h - 2.25) < .01, f"1 page, {w:.3f} x {h:.3f} in")
    fonts = doc.get_page_fonts(0)
    check(bool(fonts) and all(f[1] != "n/a" for f in fonts), f"fonts embedded: {sorted(set(f[3].split('+')[-1] for f in fonts))}")
    text = doc[0].get_text()
    check(not re.search("[—–]", text), "no em or en dashes in the text")
    want = EXPECT.get(face, set())
    for label, img in (("300 dpi", render(path, 300)), ("150 dpi", render(path, 150)),
                       ("300 dpi + blur", render(path, 300).filter(ImageFilter.GaussianBlur(1.2)))):
        got = {b.text for b in zxingcpp.read_barcodes(img) if b.format == zxingcpp.BarcodeFormat.QRCode}
        check(got == want, f"QR decode @ {label}: expected {len(want)}, got {len(got)}" + ("" if got == want else f" {got}"))

# ---- merge front+back per design
for n in range(1, 6):
    out = pymupdf.open()
    for side in ("front", "back"):
        out.insert_pdf(pymupdf.open(os.path.join(FACES, f"d{n}-{side}.pdf")))
    out.save(os.path.join(HERE, "pdf", f"design-{n}-{TITLES[n].lower().replace(' & ', '-and-').replace(' ', '-')}.pdf"))

# ---- previews: crop to the trimmed 3.5 x 2 card (removes the 0.125 in bleed)
DPI = 300; B = int(.125 * DPI)
def trimmed(face):
    im = render(os.path.join(FACES, face + ".pdf"), DPI)
    return im.crop((B, B, im.width - B, im.height - B))        # 1050 x 600

def rounded(im, r=22):
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, *im.size), r, fill=255)
    out = Image.new("RGBA", im.size, (0, 0, 0, 0)); out.paste(im, (0, 0), m); return out

F = lambda s, b=False: ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf" % ("-Bold" if b else ""), s)
CW, CH, PAD, TOP = 700, 400, 40, 70
W = PAD * 3 + CW * 2; H = TOP + 5 * (CH + 60) + 20
sheet = Image.new("RGB", (W, H), (226, 222, 214)); d = ImageDraw.Draw(sheet)
d.text((PAD, 22), "S&S Remodels LLC business cards: front (left) and back (right), shown at trimmed size 3.5 x 2 in", font=F(22, True), fill=(42, 33, 26))
for n in range(1, 6):
    y = TOP + (n - 1) * (CH + 60)
    d.text((PAD, y), f"Design {n}: {TITLES[n]}", font=F(20, True), fill=(42, 33, 26))
    for i, side in enumerate(("front", "back")):
        card = rounded(trimmed(f"d{n}-{side}").resize((CW, CH), Image.LANCZOS), 14)
        x = PAD + i * (CW + PAD)
        shadow = Image.new("RGBA", (CW + 20, CH + 20), (0, 0, 0, 0))
        ImageDraw.Draw(shadow).rounded_rectangle((10, 12, CW + 10, CH + 12), 14, fill=(0, 0, 0, 70))
        sheet.paste(shadow.filter(ImageFilter.GaussianBlur(6)), (x - 10, y + 30 - 10), shadow.filter(ImageFilter.GaussianBlur(6)))
        sheet.paste(card, (x, y + 30), card)
    # full-size trimmed PNGs too
    for side in ("front", "back"):
        trimmed(f"d{n}-{side}").save(os.path.join(PNG, f"design-{n}-{side}.png"))
sheet.save(os.path.join(HERE, "cards-preview.png"))

# ---- guides version (review only): trim line (green) and safe area (red) over the full bleed canvas
G = Image.new("RGB", (1500, 2 * 4 * 0 + 5 * 900 // 1), "white")
guides = []
for n in range(1, 6):
    for side in ("front", "back"):
        im = render(os.path.join(FACES, f"d{n}-{side}.pdf"), 300).resize((1125, 675), Image.LANCZOS)
        dr = ImageDraw.Draw(im); s = 300 / 400   # 1125 px for 3.75 in => 300 px/in
        px = 300
        dr.rectangle((.125 * px, .125 * px, 3.625 * px, 2.125 * px), outline=(0, 200, 0), width=2)
        dr.rectangle((.25 * px, .25 * px, 3.5 * px, 2.0 * px), outline=(230, 0, 0), width=2)
        guides.append(im)
gs = Image.new("RGB", (1125 * 2 + 30, 675 * 5 + 60), "white")
for i, im in enumerate(guides):
    gs.paste(im, ((i % 2) * (1125 + 30), (i // 2) * (675 + 12)))
gs.save(os.path.join(HERE, "preview", "guides-review.png"))
print("\nALL CHECKS PASSED" if not fail else f"\n{fail} FAILURE(S)")
sys.exit(1 if fail else 0)
