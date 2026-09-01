#!/usr/bin/env python3
"""Składa grafiki pakietów z packshotów urządzeń wchodzących w ich skład.

Każdy element dostaje komórkę o zbliżonej powierzchni — żaden sprzęt nie dominuje
kadru tylko dlatego, że jego zdjęcie jest szersze. Wyjątkiem jest namiot klubowy,
który jako obiekt wielkogabarytowy dostaje wyraźnie większą komórkę.

Uruchom po każdej podmianie zdjęć w public/images/devices/:
    python3 scripts/build-package-images.py
"""

import os
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEV = os.path.join(ROOT, "public", "images", "devices")
OUT = os.path.join(ROOT, "public", "images", "packages")
SIZE = 1200

os.makedirs(OUT, exist_ok=True)


def load(name):
    return Image.open(os.path.join(DEV, name)).convert("RGB")


def canvas():
    return Image.new("RGB", (SIZE, SIZE), (255, 255, 255))


def cell(dst, im, cx, cy, cw, ch, mirror=False):
    """Wpisuje obrazek w komórkę (cw × ch) wyśrodkowaną w (cx, cy), zachowując proporcje."""
    scale = min(cw / im.width, ch / im.height)
    nw, nh = max(1, round(im.width * scale)), max(1, round(im.height * scale))
    im2 = im.resize((nw, nh), Image.LANCZOS)
    if mirror:
        im2 = ImageOps.mirror(im2)
    dst.paste(im2, (round(cx - nw / 2), round(cy - nh / 2)))


ekran120 = load("ekran-120-stelaz.jpg")
jbl = load("jbl-partybox-720.jpg")
mic = load("jbl-mic-wireless.jpg")
optoma = load("projektor-optoma-eh416.jpg")
klub = load("dmuchany-klub.jpg")
fazer = load("fazer-500.jpg")

# zdjęcie belki zawiera po prawej miniatury efektów — do kolażu bierzemy sam sprzęt
_b = load("belka-led.jpg")
belka = _b.crop((0, 0, round(_b.width * 0.55), _b.height))

# ── Król Karaoke: ekran + głośnik + projektor + mikrofony (siatka 2×2, równe komórki) ──
c = canvas()
cell(c, ekran120, 330, 340, 500, 460)
cell(c, jbl,      880, 340, 500, 460)
cell(c, optoma,   330, 870, 500, 460)
cell(c, mic,      880, 870, 500, 460)
c.save(os.path.join(OUT, "pkg-karaoke.jpg"), quality=88, optimize=True)

# ── Strefa Kibica & Kino: ekran + głośnik + projektor (2 u góry, 1 na dole) ──
c = canvas()
cell(c, ekran120, 340, 350, 520, 470)
cell(c, jbl,      880, 350, 520, 470)
cell(c, optoma,   600, 880, 560, 400)
c.save(os.path.join(OUT, "pkg-fan-zone.jpg"), quality=88, optimize=True)

# ── Nocny Klub VIP: namiot (duży) + 2× głośnik + belka LED + wytwornica dymu ──
c = canvas()
cell(c, klub, 600, 350, 1010, 640)
cell(c, jbl,   170, 930, 260, 330)
cell(c, belka, 455, 930, 260, 350)
cell(c, fazer, 745, 930, 300, 300)
cell(c, jbl,  1035, 930, 260, 330, mirror=True)
c.save(os.path.join(OUT, "pkg-party-tent.jpg"), quality=88, optimize=True)

# ── Szybka Prezentacja: ekran + projektor (obok siebie, równe komórki) ──
c = canvas()
cell(c, ekran120, 330, 600, 540, 600)
cell(c, optoma,   880, 600, 540, 600)
c.save(os.path.join(OUT, "pkg-presentation.jpg"), quality=88, optimize=True)

for f in ("pkg-karaoke", "pkg-fan-zone", "pkg-party-tent", "pkg-presentation"):
    p = os.path.join(OUT, f + ".jpg")
    print(f"{f}.jpg — {os.path.getsize(p) // 1024} KB")
