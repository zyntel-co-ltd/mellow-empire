"""Build the Mellow Empire email footer banner (1200 x 220, shown at 600 x 110 in signatures).

Navy background, the full colour logo for dark backgrounds on the left, the website address on the right in white.
Output: brand-kit/10 Email signature/ and images/email/ (the copy the website serves, used by Zoho signatures).
Run from tools/logo: python build_email_banner.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
LOGO = ROOT / "brand-kit" / "01 Full logo" / "full-logo_colour_for-dark-backgrounds_1200px.png"
NAVY = (10, 21, 80)
CRIMSON = (235, 27, 87)
W, H = 1200, 220


def font(size, bold=False):
    for name in (["montserrat-bold.ttf", "arialbd.ttf"] if bold else ["montserrat-regular.ttf", "arial.ttf"]):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


img = Image.new("RGB", (W, H), NAVY)
logo = Image.open(LOGO).convert("RGBA")
target_h = 96
logo = logo.resize((round(logo.width * target_h / logo.height), target_h), Image.LANCZOS)
img.paste(logo, (56, (H - target_h) // 2), logo)

d = ImageDraw.Draw(img)
d.rectangle([0, H - 8, W, H], fill=CRIMSON)
url = "mellowempire.com"
f = font(40, bold=True)
tw = d.textlength(url, font=f)
d.text((W - 60 - tw, H // 2 - 34), url, font=f, fill=(255, 255, 255))
tag = "Event sound, lighting and DJs in Kampala"
f2 = font(26)
d.text((W - 60 - d.textlength(tag, font=f2), H // 2 + 16), tag, font=f2, fill=(205, 210, 230))

for out in (ROOT / "brand-kit" / "10 Email signature", ROOT / "images" / "email"):
    out.mkdir(parents=True, exist_ok=True)
    img.save(out / "mellow-email-footer-1200x220.png", optimize=True)
    print("wrote", out / "mellow-email-footer-1200x220.png")
