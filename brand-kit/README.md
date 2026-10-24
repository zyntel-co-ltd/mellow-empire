# Mellow Sounds 256 brand kit

Every version of the Mellow Sounds 256 logo, sorted by what it is for. Each design comes as an `.svg` (sharp at any
size; give this to printers and designers) and as `.png` files at the sizes listed in the file name.

Colours: crimson `#EB1B57`, navy `#0A1550`, black `#000000`, white `#FFFFFF`. Font: Montserrat (already turned into
shapes in every file, so no font needs installing).

| Folder | What it is | Use it for |
|---|---|---|
| `01 Full logo` | Headset disc + MELLOW \| SOUND 256, in colour | Flyers, posters, documents, website. Pick `for-light-backgrounds` on white or light photos, `for-dark-backgrounds` on navy, black or dark photos. |
| `02 Icon` | The headset disc on its own, in colour. `MAIN` is the default | Small spaces: stickers, watermarks, app icons, equipment labels |
| `03 Hole version` | The disc with the headset cut out, so the background shows through the headset | On photos or coloured backgrounds, embroidery, stencils, engraving |
| `04 Black and white` | One colour only, black or white (always the hole version) | Single-colour printing, stamps, newspaper adverts, light or dark photos |
| `05 Profile picture` | Square 1080 px, with space around the disc so round crops cut nothing. `MAIN` is the default | WhatsApp, Instagram, Facebook, TikTok, X, YouTube and LinkedIn profile photos |
| `06 Header banner` | Navy banners at the exact size each platform asks for | X header, YouTube channel banner, Facebook cover, LinkedIn banner; `link-preview` is the picture shown when the website is shared on WhatsApp |
| `07 Background` | Navy backgrounds with a large faint headset, with or without the logo | Video calls (Zoom, Meet), slides, phone wallpaper, Instagram and WhatsApp stories, square posts |
| `08 T-shirt and print` | Large transparent files (full logo 4500 px wide = 15 inches at 300 dpi; chest icon 3000 px) | T-shirts, caps, banners, tents. `DARK-shirts` files go on black/navy/red shirts, `LIGHT-shirts` files on white/grey shirts. `black-only` and `white-only` print in one colour (cheapest) |
| `09 Website and app icons` | Favicon and phone home-screen icons | The website tab icon and "add to home screen" icons |

## Rules

- A logo with no colour (black only, white only) is always the **hole version**: the disc with the headset cut out.
  Never a plain black or white headset on its own.
- Do not stretch, recolour, rotate or add effects (shadows, outlines) to the logo. Leave clear space around it of at
  least half the disc's width.
- On a busy photo, use the hole version or put the logo on a solid navy or white panel.

## Rebuilding

The files are generated, not drawn by hand. To change or add a version, edit `tools/logo/build_brand_kit.py`, then run
from `tools/logo`: `python build_brand_kit.py` and `node render_brand_kit.mjs` (needs `npm install` there once). The
website's own logo files live in `images/logo/mellow-sounds/` and are built by `build_logos.py`; this kit does not
change them.
