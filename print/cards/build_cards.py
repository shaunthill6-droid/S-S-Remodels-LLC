#!/usr/bin/env python3
"""Generate the five S&S Remodels business-card designs (front + back) as HTML.

Canvas is 3.75 x 2.25 in: a 3.5 x 2 in card plus 0.125 in bleed on every side.
Safe area (nothing important outside it) is 0.25 in in from the canvas edge: x 0.25..3.50, y 0.25..2.00.
Render with render_cards.js, check with verify_cards.py.
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "html")
os.makedirs(OUT, exist_ok=True)

NAME, ROLE = "Shaun Thill", "Owner"
PHONE, EMAIL, WEB, LOC = "(509) 200-3095", "shaun@ssremodelz.com", "ssremodelz.com", "Spokane, WA"

LOGO = "../../../assets/ss-logo-trimmed.png"     # 1520 x 699, near-white background (RGB 253)
LOGO_RATIO = 699 / 1520
TAGS = "../../../assets/tag-s.png"
PHOTO = "../../../assets/hero-falls.jpg"
QR_CONTACT = "../../qr-save-contact.svg"
QR_WEB = "../../qr-website.svg"

CSS = """
@font-face{font-family:'Barlow';font-weight:400;src:url(../fonts/barlow-latin-400-normal.woff2) format('woff2')}
@font-face{font-family:'Barlow';font-weight:600;src:url(../fonts/barlow-latin-600-normal.woff2) format('woff2')}
@font-face{font-family:'Barlow';font-weight:700;src:url(../fonts/barlow-latin-700-normal.woff2) format('woff2')}
@font-face{font-family:'Barlow Condensed';font-weight:600;src:url(../fonts/barlow-condensed-latin-600-normal.woff2) format('woff2')}
@font-face{font-family:'Barlow Condensed';font-weight:700;src:url(../fonts/barlow-condensed-latin-700-normal.woff2) format('woff2')}
@page{size:3.75in 2.25in;margin:0}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{width:3.75in;height:2.25in;background:#fdfdfd}
:root{--ink:#1b2524;--gray:#564d46;--forest:#2f4a2c;--timber:#2a211a;--sand:#f3ede2;--tan:#d8c8a8;--moss:#6b7b3a;--mosslt:#b9c48f;--brown:#5b4636;--paper:#fdfdfd}
.face{position:relative;width:3.75in;height:2.25in;overflow:hidden;font-family:'Barlow',sans-serif;color:var(--ink);background:var(--paper)}
.abs{position:absolute}
.photo{position:absolute;inset:0;background:url(PHOTO_URL) center/cover no-repeat}
.shade{position:absolute;inset:0}
.plaque{position:absolute;background:var(--paper);border-radius:.03in}
.logo{display:block;width:100%;height:auto}
.tagline{font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:var(--gray);white-space:nowrap;line-height:1;text-align:center}
.tagline .w{white-space:nowrap}
.tagline img{height:.92em;width:auto;vertical-align:-.06em;margin-right:.04em}
.qr{position:absolute;background:#fff}
.qr img{display:block;width:100%;height:100%}
.qlabel{position:absolute;font-size:6pt;font-weight:600;letter-spacing:.12em;text-transform:uppercase;text-align:center;line-height:1;white-space:nowrap}
.name{font-family:'Barlow Condensed',sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:.04em;line-height:.95}
.role{font-weight:600;font-size:5.5pt;letter-spacing:.22em;text-transform:uppercase;line-height:1}
.lines p{font-size:6.5pt;line-height:1.45;white-space:nowrap}
.col{position:absolute;display:flex;flex-direction:column}
"""

def st(l=None, t=None, w=None, h=None, r=None, b=None, extra=""):
    parts = []
    for k, v in (("left", l), ("top", t), ("width", w), ("height", h), ("right", r), ("bottom", b)):
        if v is not None:
            parts.append(f"{k}:{v}in")
    return 'style="' + ";".join(parts) + (";" + extra if extra else "") + '"'

def tagline(size_pt, cls="", extra=""):
    one = f'<span class="w"><img src="{TAGS}" alt="">OLUTIONS,</span> <span class="w"><img src="{TAGS}" alt="">IMPLIFIED</span>'
    return f'<p class="tagline {cls}" style="font-size:{size_pt}pt;{extra}">{one}</p>'

def plain_tagline(size_pt, color, extra=""):
    return (f'<p class="tagline" style="font-size:{size_pt}pt;color:{color};letter-spacing:.2em;{extra}">'
            f'Solutions, Simplified</p>')

def qr(src, l, t, size, keep=True):
    return f'<div class="qr{" keep" if keep else ""}" data-qr="{src.split("/")[-1]}" {st(l, t, size, size)}><img src="{src}" alt=""></div>'

def qlabel(text, l, t, w, color):
    return f'<div class="qlabel keep" {st(l, t, w, extra=f"color:{color}")}>{text}</div>'

def logo_plaque(left, top, logo_w, pad_x, pad_t, pad_b, tag_pt=None, tag_gap=0.06):
    inner = f'<img class="logo" src="{LOGO}" alt="S&amp;S Remodels LLC, Spokane, WA">'
    if tag_pt:
        inner += f'<div style="margin-top:{tag_gap}in">{tagline(tag_pt)}</div>'
    w = logo_w + 2 * pad_x
    return (f'<div class="plaque keep" style="left:{left}in;top:{top}in;width:{w}in;'
            f'padding:{pad_t}in {pad_x}in {pad_b}in"><div style="width:{logo_w}in">{inner}</div></div>')

def face(inner, bg=None):
    return f'<div class="face"{(" style=" + chr(34) + "background:" + bg + chr(34)) if bg else ""}>{inner}</div>'

def page(inner):
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><style>'
            f'{CSS.replace("PHOTO_URL", PHOTO)}</style></head><body>{inner}</body></html>')

def lines_block(color, weight=400):
    return (f'<div class="lines" style="color:{color};font-weight:{weight}"><p>{PHONE}</p><p>{EMAIL}</p>'
            f'<p>{WEB}</p><p>{LOC}</p></div>')

faces = {}

# ---------------------------------------------------------------- DESIGN 1: Falls Centered
faces["d1-front"] = face(
    '<div class="photo"></div>'
    '<div class="shade" style="background:linear-gradient(180deg,rgba(42,33,26,.5) 0%,rgba(42,33,26,.22) 45%,rgba(42,33,26,.62) 100%)"></div>'
    '<div class="abs" style="inset:0;display:flex;align-items:center;justify-content:center">'
    f'<div class="plaque keep" style="position:relative;padding:.11in .12in .1in;width:2.39in"><div style="width:2.15in">'
    f'<img class="logo" src="{LOGO}" alt="S&amp;S Remodels LLC, Spokane, WA">'
    f'<div style="margin-top:.07in">{tagline(8)}</div></div></div></div>')

faces["d1-back"] = face(
    '<div class="photo"></div><div class="shade" style="background:rgba(42,33,26,.9)"></div>'
    f'<div class="col keep" {st(.25, .25, 1.2, 1.5, extra="justify-content:center")}>'
    f'<div class="name" style="font-size:14pt;color:#fff">{NAME}</div>'
    f'<div class="role" style="color:var(--mosslt);margin:.04in 0 .1in">{ROLE}</div>'
    f'{lines_block("#fff", 600)}</div>'
    + qr(QR_CONTACT, 1.55, .4, 1.05) + qlabel("Save contact", 1.55, 1.51, 1.05, "var(--tan)")
    + qr(QR_WEB, 2.7, .65, .8) + qlabel("Website", 2.7, 1.51, .8, "var(--tan)"))

# ---------------------------------------------------------------- DESIGN 2: Open Falls (website style)
faces["d2-front"] = face(
    '<div class="photo" style="background-position:62% 50%"></div>'
    '<div class="shade" style="background:linear-gradient(90deg,rgba(42,33,26,.9) 0%,rgba(42,33,26,.72) 40%,rgba(42,33,26,.1) 68%,rgba(42,33,26,.32) 100%)"></div>'
    + logo_plaque(.25, .25, 1.6, .1, .09, .08, tag_pt=6, tag_gap=.05)
    + f'<div class="col keep" {st(.25, 1.39, 1.9)}>'
      f'<div class="name" style="font-size:10.5pt;color:#fff;margin-bottom:.05in">{NAME}'
      f'<span class="role" style="color:var(--mosslt);font-family:Barlow;margin-left:.08in;letter-spacing:.2em;position:relative;top:-.01in">{ROLE}</span></div>'
      f'<div class="lines" style="color:#fff;font-weight:600"><p>{PHONE}</p><p>{EMAIL}</p><p>{WEB}</p></div></div>')

faces["d2-back"] = face(
    '<div class="abs" style="left:0;top:0;right:0;height:.4in;border-bottom:.03in solid var(--forest);'
    f'background:url({PHOTO}) 50% 38%/cover no-repeat"></div>'
    f'<div class="abs keep" {st(0, .5, 3.75, extra="display:flex;justify-content:center")}>{tagline(7)}</div>'
    + qr(QR_CONTACT, .75, .66, 1.15) + qlabel("Save contact", .75, 1.84, 1.15, "var(--gray)")
    + qr(QR_WEB, 2.1, .91, .9) + qlabel("Website", 2.1, 1.84, .9, "var(--gray)"))

# ---------------------------------------------------------------- DESIGN 3: Clean White
faces["d3-front"] = face(
    f'<div class="abs" {st(0, 1.62, None, .65, 0, extra=f"border-top:.03in solid var(--forest);background:url({PHOTO}) 54% 45%/cover no-repeat")}></div>'
    f'<div class="abs keep" {st(.25, .25, 2.05)}><img class="logo" src="{LOGO}" alt="S&amp;S Remodels LLC, Spokane, WA"></div>'
    f'<div class="abs keep" {st(.25, 1.27, 2.05)}>{tagline(7)}</div>'
    f'<div class="col keep" {st(2.5, .29, 1.0)}>'
    f'<div class="name" style="font-size:15pt;color:var(--ink)">Shaun<br>Thill</div>'
    f'<div class="role" style="color:var(--moss);margin:.05in 0 .08in">{ROLE}</div>'
    f'<div class="lines" style="color:var(--brown);font-weight:400"><p style="font-size:6.2pt">{PHONE}</p>'
    f'<p style="font-size:6.2pt">{EMAIL}</p><p style="font-size:6.2pt">{WEB}</p><p style="font-size:6.2pt">{LOC}</p></div></div>')

faces["d3-back"] = face(
    '<div class="photo" style="background-position:54% 50%"></div>'
    '<div class="shade" style="background:linear-gradient(180deg,rgba(42,33,26,.6) 0%,rgba(42,33,26,.38) 50%,rgba(42,33,26,.72) 100%)"></div>'
    + qr(QR_CONTACT, .65, .3, 1.25) + qlabel("Save contact", .65, 1.6, 1.25, "#fff")
    + qr(QR_WEB, 2.1, .55, 1.0) + qlabel("Website", 2.1, 1.6, 1.0, "#fff")
    + f'<div class="abs keep" {st(0, 1.82, 3.75, extra="display:flex;justify-content:center")}>{plain_tagline(7, "var(--tan)")}</div>')

# ---------------------------------------------------------------- DESIGN 4: Sand & Forest
faces["d4-front"] = face(
    f'<div class="abs" {st(2.4, 0, None, 2.25, 0, extra=f"border-left:.03in solid var(--forest);background:url({PHOTO}) 56% 50%/cover no-repeat")}></div>'
    f'<div class="plaque keep" style="left:.25in;top:.25in;width:1.95in;padding:.08in .1in;border:.01in solid var(--tan)">'
    f'<img class="logo" src="{LOGO}" alt="S&amp;S Remodels LLC, Spokane, WA"></div>'
    f'<div class="col keep" {st(.25, 1.3, 2.0)}>'
    f'<div class="name" style="font-size:11pt;color:var(--ink)">{NAME}</div>'
    f'<div class="role" style="color:var(--moss);margin:.03in 0 .05in">{ROLE}</div>'
    f'<div class="lines" style="color:var(--brown);font-weight:600"><p>{PHONE}</p><p>{EMAIL}</p><p>{WEB}</p></div></div>',
    bg="var(--sand)")

faces["d4-back"] = face(
    f'<div class="abs" {st(0, 1.78, None, .47, 0, extra="background:var(--sand)")}></div>'
    + qr(QR_CONTACT, .25, .3, 1.15) + qlabel("Save contact", .25, 1.5, 1.15, "var(--tan)")
    + qr(QR_WEB, 1.55, .55, .9) + qlabel("Website", 1.55, 1.5, .9, "var(--tan)")
    + f'<div class="col keep" {st(2.65, .3, .85)}>'
      f'<div class="name" style="font-size:10pt;color:#fff;line-height:1.05">An honest day for honest pay.</div>'
      f'<div style="height:.02in;width:.4in;background:var(--mosslt);margin:.08in 0"></div>'
      f'<div class="role" style="color:var(--mosslt);line-height:1.5;letter-spacing:.18em">Faith<br>Family<br>Freedom</div></div>'
    + f'<div class="abs keep" {st(0, 1.87, 3.75, extra="display:flex;justify-content:center")}>{tagline(7)}</div>',
    bg="var(--forest)")

# ---------------------------------------------------------------- DESIGN 5: Name Forward
faces["d5-front"] = face(
    '<div class="photo" style="background-position:50% 50%"></div>'
    '<div class="shade" style="background:linear-gradient(90deg,rgba(42,33,26,.92) 0%,rgba(42,33,26,.7) 50%,rgba(42,33,26,.3) 100%)"></div>'
    f'<div class="col keep" {st(.25, .3, 1.9, 1.5, extra="justify-content:space-between")}>'
    f'<div><div class="name" style="font-size:25pt;color:#fff">Shaun<br>Thill</div>'
    f'<div class="role" style="color:var(--mosslt);margin-top:.07in">{ROLE} &middot; S&amp;S Remodels LLC</div></div>'
    f'{lines_block("#fff", 600)}</div>'
    + qr(QR_CONTACT, 2.35, .3, 1.15) + qlabel("Save contact", 2.35, 1.5, 1.15, "#fff"))

faces["d5-back"] = face(
    '<div class="photo" style="background-position:40% 50%"></div>'
    '<div class="shade" style="background:linear-gradient(180deg,rgba(42,33,26,.5) 0%,rgba(42,33,26,.3) 50%,rgba(42,33,26,.6) 100%)"></div>'
    + f'<div class="abs" style="left:.25in;top:0;height:2.25in;width:2.15in;display:flex;align-items:center">'
      f'<div class="plaque keep" style="position:relative;width:2.15in;padding:.1in .1in .1in"><div style="width:1.95in">'
      f'<img class="logo" src="{LOGO}" alt="S&amp;S Remodels LLC, Spokane, WA">'
      f'<div style="margin-top:.07in">{tagline(7)}</div></div></div></div>'
    + qr(QR_WEB, 2.65, .7, .85) + qlabel("Website", 2.65, 1.6, .85, "#fff"))

for name, body in faces.items():
    with open(os.path.join(OUT, f"{name}.html"), "w") as f:
        f.write(page(body))
print("wrote", len(faces), "faces to", OUT)
