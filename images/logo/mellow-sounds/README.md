# Mellow Sounds logo set

The Mellow Sounds headset mark, rebuilt as clean vector geometry from the original logo, in the same structure as the Zyntel logo library. Built by `tools/logo/` (`python build_logos.py`, then `npm install && node render_logos.mjs`).

Colours: crimson `#EB1B57`, navy `#0A1550`, ink `#0A0A14`. Wordmark: Montserrat ExtraBold "MELLOW", divider, Montserrat Light "SOUND" (outlined, no font needed).

## The rule: colourless or white is always the disc

A bare white or black headset is never used. When the logo has no colour (white, ink, one-colour print), it is the **disc with the headset knocked out** (`mark_hole_*`). Coloured logos can be a disc with a painted headset (`mark_*_on_*`) or the bare headset (`headset_*`, for places where a disc would crowd it).

## Files

| Files | What |
|---|---|
| `mark_white_on_crimson` | Primary. Favicon, app icon, default avatar. |
| `mark_crimson_on_navy`, `mark_crimson_on_white`, `mark_white_on_navy` | Coloured discs (the original look is crimson on navy). |
| `mark_hole_crimson / navy / white / ink` | Knockout discs: the headset is see-through, the page shows through it. Use hole_white on the crimson brand colour, hole_ink for one-colour print. |
| `mellow_sounds_mark_mask.svg` | The knockout disc for CSS masking, so the page paints the colour. |
| `headset_crimson / navy / white / ink` | Bare headset, no disc. |
| `full_*` | Disc + MELLOW | SOUND 256 lockups\| SOUND lockups, padded. `crimson_disk_ink` on light, `crimson_disk_white` on navy/dark, `navy_disk_ink` on light in the original colours, `white_disk_white` on crimson. |
| `nav_*` | Same lockups cropped tight (height = disc), 32/64/96/128 px; 32 is 1x in a ~72 px header. |
| `profile-pictures/` | Disc on white (default), on navy, transparent (designers only), original colours. 800 px, disc inset so platform circle crops cut nothing. |
| `social/` | X banner 1500x500, YouTube banner 2560x1440, share card 1200x630. |
| `mellow-sounds_favicon.ico`, `favicon.svg`, `mellow-sounds_apple_touch_icon_180.png`, `mellow-sounds_pwa_*` | Web favicon, Apple touch, PWA and maskable icons. |
| `mark_*_<size>.png` | 16 to 1024 px ladders; `mark_*.ico` 16/32/48/256. |

## Not built yet

Brand pattern tile, email signature footer, LinkedIn banners, and the Mellow Empire parent mark.
