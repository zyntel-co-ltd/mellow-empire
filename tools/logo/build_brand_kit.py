"""Mellow Sounds 256 brand kit: every logo version in folders named by what they are for.

    python build_logos.py         # the logo library in images/logo/mellow-sounds (the website uses it)
    python build_brand_kit.py     # writes ../../brand-kit/**.svg + render list
    node render_brand_kit.mjs     # renders the PNG / ICO files next to each SVG

The kit is for social media, print and other branding work, so file names say what each file is for.
It reuses the geometry, colours and wordmark of build_logos.py and follows its rule: a logo with no
colour (black or white only) is always the disc with the headset cut out (the "hole" version), never a
bare black or white headset. Black in this kit is pure #000000 so printers get a true black.
"""
import json
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_logos as b  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.abspath(os.path.join(HERE, "..", "..", "brand-kit"))
CRIMSON, NAVY, WHITE, BLACK = b.CRIMSON, b.NAVY, b.WHITE, "#000000"
R, D, CY = b.R, b.D, b.CY

renders = []   # (svg path relative to KIT, png path, mode, value)


def write(rel, content, pngs=()):
    path = os.path.join(KIT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(content)
    for suffix, mode, value in pngs:
        renders.append({"svg": rel, "png": rel[:-4] + suffix + ".png", "mode": mode, "value": value})


def lockup(disc, fg, c1, c2, c3, margin=0.06):
    """Disc + MELLOW | SOUND 256. fg None = headset cut out of the disc (hole)."""
    cap = 0.30 * D
    mellow_d, mellow_w = b.text_path("MELLOW", "Bold", cap)
    sound_d, sound_w = b.text_path("SOUND", "Light", cap)
    n_d, n_w = b.text_path("256", "Bold", cap)
    gap, pad, bar_w, bar_h = 0.19 * D, 0.058 * cap, 0.030 * cap, 1.46 * cap
    base = CY + cap / 2
    x = D + gap
    parts = [f'<g transform="translate({R:g} 0)">{b.mark_body(disc, fg, hole=fg is None)}</g>',
             f'<path fill="{c1}" transform="translate({x:.1f} {base:.1f})" d="{mellow_d}"/>']
    x += mellow_w + pad * 3.4
    parts.append(f'<rect x="{x:.1f}" y="{CY - bar_h / 2:.1f}" width="{bar_w:.1f}" height="{bar_h:.1f}" fill="{c1}"/>')
    x += bar_w + pad * 3.4
    parts.append(f'<path fill="{c2}" transform="translate({x:.1f} {base:.1f})" d="{sound_d}"/>')
    x += sound_w + pad * 8
    parts.append(f'<path fill="{c3}" transform="translate({x:.1f} {base:.1f})" d="{n_d}"/>')
    x += n_w
    body = "".join(parts)
    m = margin * D
    return b.svg(f"{-m:.1f} {CY - R - m:.1f} {x + 2 * m:.1f} {D + 2 * m:.1f}", body), body, x


def icon(disc, fg, pad=0.04):
    side = D * (1 + 2 * pad)
    return b.svg(f"{-side / 2:g} {CY - side / 2:g} {side:g} {side:g}", b.mark_body(disc, fg, hole=fg is None), 1024, 1024)


def profile(bg, disc, fg, scale=0.88):
    side = D / scale
    vb = f"{-side / 2:g} {CY - side / 2:g} {side:g} {side:g}"
    back = f'<rect x="{-side / 2:g}" y="{CY - side / 2:g}" width="{side:g}" height="{side:g}" fill="{bg}"/>'
    return b.svg(vb, back + b.mark_body(disc, fg, hole=fg is None), 1080, 1080)


def banner(w, h, frac, tagline=True, bg=NAVY):
    return b.banner_svg(w, h, frac, tagline).replace(f'fill="{NAVY}"', f'fill="{bg}"', 1)


def background(w, h, with_logo):
    """Navy background with a large, faint cut-out disc; optional small logo in the corner."""
    big = 1.15 * min(w, h) if w >= h else 0.95 * w
    k = big / D
    cx, cy = (w * 0.80, h * 0.58) if w >= h else (w * 0.62, h * 0.70)
    out = [f'<rect width="{w}" height="{h}" fill="{NAVY}"/>',
           f'<g opacity="0.07" transform="translate({cx:.1f} {cy:.1f}) scale({k:.5f}) translate(0 {-CY:g})">'
           f'{b.mark_body(WHITE, None, hole=True)}</g>']
    if with_logo:
        _, body, total = lockup(CRIMSON, WHITE, WHITE, WHITE, CRIMSON)
        lh = 0.075 * min(w, h)
        s = lh / D
        m = 0.06 * min(w, h)
        out.append(f'<g transform="translate({m:.1f} {m - (CY - R) * s:.1f}) scale({s:.5f})">{body}</g>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">' + "".join(out) + "</svg>\n"


FULL = [1200, 2400, 4800]
ICON = [64, 128, 256, 512, 1024, 2048]


def main():
    if os.path.isdir(KIT):
        shutil.rmtree(KIT)

    # 1. Full logo (disc + MELLOW | SOUND 256) in colour
    for name, args in {
        "full-logo_colour_for-light-backgrounds": (CRIMSON, WHITE, NAVY, NAVY, CRIMSON),
        "full-logo_colour_for-dark-backgrounds": (CRIMSON, WHITE, WHITE, WHITE, CRIMSON),
        "full-logo_original-colours_for-light-backgrounds": (NAVY, CRIMSON, NAVY, NAVY, CRIMSON),
    }.items():
        write(f"01 Full logo/{name}.svg", lockup(*args)[0], [(f"_{w}px", "width", w) for w in FULL])

    # 2. Icon (the disc on its own) in colour
    for name, args in {
        "icon_white-headset-on-crimson_MAIN": (CRIMSON, WHITE),
        "icon_crimson-headset-on-navy_original": (NAVY, CRIMSON),
        "icon_crimson-headset-on-white": (WHITE, CRIMSON),
        "icon_white-headset-on-navy": (NAVY, WHITE),
    }.items():
        write(f"02 Icon/{name}.svg", icon(*args), [(f"_{s}px", "width", s) for s in ICON])

    # 3. Hole version: the headset is cut out, so whatever is behind shows through
    for name, colour in {"crimson": CRIMSON, "navy": NAVY, "black": BLACK, "white": WHITE}.items():
        write(f"03 Hole version/icon_hole_{name}.svg", icon(colour, None), [(f"_{s}px", "width", s) for s in ICON])
        write(f"03 Hole version/full-logo_hole_{name}.svg",
              lockup(colour, None, colour, colour, colour)[0] if name in ("black", "white")
              else lockup(colour, None, NAVY if colour == CRIMSON else colour, NAVY if colour == CRIMSON else colour, CRIMSON)[0],
              [(f"_{w}px", "width", w) for w in FULL])

    # 4. Black and white (one colour only, always the hole version)
    for name, colour in {"black": BLACK, "white": WHITE}.items():
        write(f"04 Black and white/full-logo_{name}-only.svg", lockup(colour, None, colour, colour, colour)[0],
              [(f"_{w}px", "width", w) for w in FULL])
        write(f"04 Black and white/icon_{name}-only.svg", icon(colour, None), [(f"_{s}px", "width", s) for s in ICON])

    # 5. Profile picture (WhatsApp, Instagram, Facebook, TikTok, X, YouTube, LinkedIn): square, safe for circle crops
    for name, args in {
        "profile-picture_crimson-on-white_MAIN": (WHITE, CRIMSON, None),
        "profile-picture_crimson-on-navy": (NAVY, CRIMSON, None),
        "profile-picture_white-on-crimson": (CRIMSON, WHITE, None),
        "profile-picture_original-colours": (WHITE, NAVY, CRIMSON),
    }.items():
        write(f"05 Profile picture/{name}.svg", profile(*args), [("_1080px", "width", 1080)])

    # 6. Header banners / cover photos (exact sizes each platform asks for)
    for name, (w, h, frac) in {
        "header_X-twitter_1500x500": (1500, 500, 0.36),
        "header_YouTube-channel-banner_2560x1440": (2560, 1440, 0.17),
        "header_Facebook-cover_1640x624": (1640, 624, 0.30),
        "header_LinkedIn-banner_1584x396": (1584, 396, 0.36),
        "link-preview_WhatsApp-and-website-share_1200x630": (1200, 630, 0.30),
    }.items():
        write(f"06 Header banner/{name}.svg", banner(w, h, frac), [("", "zoom", 1)])

    # 7. Backgrounds (video calls, slides, phone wallpaper, stories)
    for name, (w, h, logo) in {
        "background_widescreen_1920x1080_with-logo": (1920, 1080, True),
        "background_widescreen_1920x1080_plain": (1920, 1080, False),
        "background_phone-and-stories_1080x1920_with-logo": (1080, 1920, True),
        "background_phone-and-stories_1080x1920_plain": (1080, 1920, False),
        "background_square-post_1080x1080_with-logo": (1080, 1080, True),
    }.items():
        write(f"07 Background/{name}.svg", background(w, h, logo), [("", "zoom", 1)])

    # 8. T-shirt and print: big transparent files (4500 px wide = 15 inches at 300 dpi)
    for name, args in {
        "t-shirt_full-logo_for-DARK-shirts_colour": (CRIMSON, WHITE, WHITE, WHITE, CRIMSON),
        "t-shirt_full-logo_for-DARK-shirts_white-only": (WHITE, None, WHITE, WHITE, WHITE),
        "t-shirt_full-logo_for-LIGHT-shirts_colour": (CRIMSON, WHITE, NAVY, NAVY, CRIMSON),
        "t-shirt_full-logo_for-LIGHT-shirts_black-only": (BLACK, None, BLACK, BLACK, BLACK),
    }.items():
        write(f"08 T-shirt and print/{name}.svg", lockup(*args)[0], [("_4500px", "width", 4500)])
    for name, args in {
        "t-shirt_chest-icon_for-DARK-shirts_white-only": (WHITE, None),
        "t-shirt_chest-icon_for-LIGHT-shirts_black-only": (BLACK, None),
        "t-shirt_chest-icon_any-shirt_colour": (CRIMSON, WHITE),
    }.items():
        write(f"08 T-shirt and print/{name}.svg", icon(*args), [("_3000px", "width", 3000)])

    # 9. Website and app icons (favicon, phone home screen)
    icons = ["favicon.svg", "mellow-sounds_favicon.ico", "mellow-sounds_apple_touch_icon_180.png",
             "mellow-sounds_pwa_icon_192.png", "mellow-sounds_pwa_icon_512.png",
             "mellow-sounds_pwa_maskable_192.png", "mellow-sounds_pwa_maskable_512.png"]
    os.makedirs(os.path.join(KIT, "09 Website and app icons"), exist_ok=True)
    for f in icons:
        shutil.copyfile(os.path.join(b.OUT, f), os.path.join(KIT, "09 Website and app icons", f))

    with open(os.path.join(HERE, "brand_kit_renders.json"), "w", encoding="utf-8", newline="\n") as fh:
        json.dump(renders, fh, indent=1)
    print(f"wrote kit SVGs to {KIT} ({len(renders)} PNGs to render)")


if __name__ == "__main__":
    main()
