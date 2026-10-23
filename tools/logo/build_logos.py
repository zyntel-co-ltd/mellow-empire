"""Mellow Sounds logo set: SVG sources (the PNG/ICO ladders come from render_logos.mjs).

    pip install fonttools
    python build_logos.py            # writes ../../images/logo/mellow-sounds/*.svg + manifest.json
    npm install && node render_logos.mjs

Build rules (same construction as the Zyntel logo library):
  - The mark is a disc with the headset in it. The headset is geometry.py (one fixed outline).
  - Colourless / white / ink logos are ALWAYS the disc, with the headset knocked out ("hole"),
    never a bare headset. Coloured marks come in disc and bare-headset forms.
  - Wordmark: Montserrat ExtraBold "MELLOW", thin divider, Montserrat Light "SOUND", Bold "256" and Bold "256", outlined to paths
    so no SVG needs the font installed.
"""
import json
import os
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import geometry as g  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, "..", "..", "images", "logo", "mellow-sounds"))

CRIMSON, NAVY, WHITE, INK = "#EB1B57", "#0A1550", "#FFFFFF", "#0A0A14"

R = 490.0                      # disc radius in mark units
D = 2 * R
CY = g.CY                      # vertical centre of the headset
VB = f"-{R:g} {CY - R:g} {D:g} {D:g}"

# ---- text outlines -------------------------------------------------------------------------------
_fonts = {}


def _font(name):
    if name not in _fonts:
        _fonts[name] = TTFont(os.path.join(HERE, "fonts", f"Montserrat-{name}.ttf"))
    return _fonts[name]


def text_path(text, weight, cap_height, tracking_em=0.02):
    """Outline `text` so its capital height is `cap_height` units. Returns (d, width); baseline at y=0."""
    f = _font(weight)
    upm = f["head"].unitsPerEm
    scale = cap_height / f["OS/2"].sCapHeight
    gs = f.getGlyphSet()
    cmap = f.getBestCmap()
    pen = SVGPathPen(gs)
    x = 0.0
    for ch in text:
        name = cmap[ord(ch)]
        tp = TransformPen(pen, (scale, 0, 0, -scale, x, 0))
        gs[name].draw(tp)
        x += gs[name].width * scale + tracking_em * upm * scale
    return pen.getCommands(), x - tracking_em * upm * scale


# ---- mark ----------------------------------------------------------------------------------------
def headset(fill, extra=""):
    return f'<path fill="{fill}" fill-rule="nonzero" {extra} d="{g.MARK_D}"/>'


def mark_body(disc, fg=None, hole=False):
    """Disc + headset, centred on (0, CY). `hole`: headset knocked out of the disc (transparent)."""
    if hole:
        return (f'<mask id="h" maskUnits="userSpaceOnUse" x="-{R:g}" y="{CY - R:g}" width="{D:g}" height="{D:g}">'
                f'<rect x="-{R:g}" y="{CY - R:g}" width="{D:g}" height="{D:g}" fill="#fff"/>'
                f'<path fill="#000" fill-rule="nonzero" d="{g.MARK_D}"/></mask>'
                f'<circle cx="0" cy="{CY:g}" r="{R:g}" fill="{disc}" mask="url(#h)"/>')
    return f'<circle cx="0" cy="{CY:g}" r="{R:g}" fill="{disc}"/>' + headset(fg)


def svg(viewbox, body, w=None, h=None):
    vb = [float(v) for v in viewbox.split()]
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" width="{w or vb[2]:g}" '
            f'height="{h or vb[3]:g}">{body}</svg>\n')


def bare_vb(pad=0.06):
    w, h = g.X1 - g.X0, g.Y1 - g.Y0
    side = max(w, h) * (1 + 2 * pad)
    return f"{-side / 2:g} {CY - side / 2:g} {side:g} {side:g}"


MARKS = {
    # id: (disc colour, headset colour or None for hole)
    "white_on_crimson": (CRIMSON, WHITE),   # primary: use as favicon / app icon
    "crimson_on_white": (WHITE, CRIMSON),
    "crimson_on_navy": (NAVY, CRIMSON),     # the original look (navy tile, crimson headset)
    "white_on_navy": (NAVY, WHITE),
    # knockout ("hole") discs: the headset is see-through; colourless and white always use these
    "hole_crimson": (CRIMSON, None),
    "hole_navy": (NAVY, None),
    "hole_white": (WHITE, None),
    "hole_ink": (INK, None),
}
HEADSETS = {"crimson": CRIMSON, "navy": NAVY, "white": WHITE, "ink": INK}

# ---- lockups ---------------------------------------------------------------------------------------
LOCKUPS = {
    # id: (disc, headset, MELLOW colour, SOUND colour, 256 colour, for)
    "crimson_disk_ink": (CRIMSON, WHITE, NAVY, NAVY, CRIMSON, "light pages"),
    "crimson_disk_white": (CRIMSON, WHITE, WHITE, WHITE, CRIMSON, "dark / navy pages"),
    "navy_disk_ink": (NAVY, CRIMSON, NAVY, NAVY, CRIMSON, "light pages, original colours"),
    "white_disk_white": (WHITE, CRIMSON, WHITE, WHITE, WHITE, "on the crimson brand colour"),
}


def lockup_parts(disc, fg, c1, c2, c3=None):
    cap = 0.30 * D
    mellow_d, mellow_w = text_path("MELLOW", "Bold", cap)
    sound_d, sound_w = text_path("SOUND", "Light", cap)
    gap, pad, bar_w, bar_h = 0.19 * D, 0.058 * cap, 0.030 * cap, 1.46 * cap
    x = D + gap
    base = CY + cap / 2
    parts = [f'<g transform="translate({R:g} 0)">{mark_body(disc, fg)}</g>']
    parts.append(f'<path fill="{c1}" transform="translate({x:.1f} {base:.1f})" d="{mellow_d}"/>')
    x += mellow_w + pad * 3.4
    parts.append(f'<rect x="{x:.1f}" y="{CY - bar_h / 2:.1f}" width="{bar_w:.1f}" height="{bar_h:.1f}" fill="{c1}"/>')
    x += bar_w + pad * 3.4
    parts.append(f'<path fill="{c2}" transform="translate({x:.1f} {base:.1f})" d="{sound_d}"/>')
    x += sound_w
    if c3:  # "256": Uganda's dial code, set bold after SOUND
        n_d, n_w = text_path("256", "Bold", cap)
        x += pad * 8
        parts.append(f'<path fill="{c3}" transform="translate({x:.1f} {base:.1f})" d="{n_d}"/>')
        x += n_w
    return "".join(parts), x


def lockup_svg(disc, fg, c1, c2, c3, margin=0.0):
    body, total = lockup_parts(disc, fg, c1, c2, c3)
    m = margin * D
    return svg(f"{-m:.1f} {CY - R - m:.1f} {total + 2 * m:.1f} {D + 2 * m:.1f}", body), total, D



# ---- profile pictures and social images ----------------------------------------------------------
def profile_svg(bg, disc, fg, hole, scale=0.88):
    side = D / scale
    vb = f"{-side / 2:g} {CY - side / 2:g} {side:g} {side:g}"
    back = f'<rect x="{-side / 2:g}" y="{CY - side / 2:g}" width="{side:g}" height="{side:g}" fill="{bg}"/>' if bg else ""
    return svg(vb, back + mark_body(disc, fg, hole=hole), 800, 800)


def banner_svg(w, h, lockup_h_frac, tagline=True):
    """Navy banner, white lockup centred, optional tagline. Coordinates in banner pixels."""
    body, total = lockup_parts(CRIMSON, WHITE, WHITE, WHITE, CRIMSON)
    k = (h * lockup_h_frac) / D
    lw = total * k
    tx, ty = (w - lw) / 2, (h - D * k) / 2 - (0.07 * h if tagline else 0)
    out = [f'<rect width="{w}" height="{h}" fill="{NAVY}"/>',
           f'<g transform="translate({tx:.1f} {ty - (CY - R) * k:.1f}) scale({k:.5f})">{body}</g>']
    if tagline:
        cap = 0.034 * h
        a_d, a_w = text_path("we are the ", "Light", cap, 0.04)
        b_d, b_w = text_path("FUTURE", "Bold", cap, 0.04)
        x = (w - (a_w + b_w)) / 2
        y = ty + D * k + 0.13 * h
        out.append(f'<path fill="{WHITE}" transform="translate({x:.1f} {y:.1f})" d="{a_d}"/>')
        out.append(f'<path fill="{WHITE}" transform="translate({x + a_w:.1f} {y:.1f})" d="{b_d}"/>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">' + "".join(out) + "</svg>\n"

# ---- write ------------------------------------------------------------------------------------------
def main():
    os.makedirs(OUT, exist_ok=True)

    def w(name, content):
        with open(os.path.join(OUT, name), "w", encoding="utf-8", newline="\n") as fh:
            fh.write(content)

    for mid, (disc, fg) in MARKS.items():
        w(f"mark_{mid}.svg", svg(VB, mark_body(disc, fg, hole=fg is None), 1024, 1024))
    for hid, col in HEADSETS.items():
        w(f"headset_{hid}.svg", svg(bare_vb(), headset(col), 1024, 1024))
    # CSS mask: disc with the headset knocked out, painted black (page supplies the colour)
    w("mellow_sounds_mark_mask.svg", svg(VB, mark_body("#000", None, hole=True), 1024, 1024))

    lockups = []
    for lid, (disc, fg, c1, c2, c3, use) in LOCKUPS.items():
        s, total, h = lockup_svg(disc, fg, c1, c2, c3, margin=0.06)
        w(f"full_{lid}.svg", s)
        s, _, _ = lockup_svg(disc, fg, c1, c2, c3, margin=0.0)
        w(f"nav_{lid}.svg", s)
        lockups.append({"id": lid, "use": use, "aspect": round((total + 0.12 * D) / (1.12 * D), 4)})

    os.makedirs(os.path.join(OUT, "profile-pictures"), exist_ok=True)
    os.makedirs(os.path.join(OUT, "social"), exist_ok=True)
    pp = "profile-pictures/mellow-sounds-profile-picture"
    w(f"{pp}_on-white.svg", profile_svg(WHITE, CRIMSON, None, True))
    w(f"{pp}_on-navy.svg", profile_svg(NAVY, CRIMSON, None, True))
    w(f"{pp}_transparent.svg", profile_svg(None, CRIMSON, None, True))
    w(f"{pp}_original-colours.svg", profile_svg(None, NAVY, CRIMSON, False))
    for name, (bw, bh, frac, tag) in {"x-banner-1500x500": (1500, 500, 0.36, True),
                                      "youtube-banner-2560x1440": (2560, 1440, 0.17, True),
                                      "card-1200x630": (1200, 630, 0.30, True)}.items():
        w(f"social/mellow-sounds-{name}.svg", banner_svg(bw, bh, frac, tag))

    manifest = {
        "brand": "mellow-sounds", "name": "crimson", "primary": CRIMSON, "navy": NAVY, "ink": INK,
        "marks": list(MARKS), "headsets": list(HEADSETS), "lockups": lockups,
        "favicon_mark": "white_on_crimson",
    }
    w("manifest.json", json.dumps(manifest, indent=2) + "\n")
    print(f"wrote SVGs to {OUT}")


if __name__ == "__main__":
    main()
