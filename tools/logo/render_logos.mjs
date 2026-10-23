// Renders the SVGs from build_logos.py into PNG ladders, ICOs and app icons.
//   python build_logos.py && npm install && node render_logos.mjs
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'images', 'logo', 'mellow-sounds');
const m = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));
const MARK_SIZES = [1024, 512, 256, 192, 180, 128, 96, 64, 48, 32, 16];
const FULL_WIDTHS = [2400, 1600, 1200, 800, 400];
const NAV_HEIGHTS = [32, 64, 96, 128];

const read = (f) => fs.readFileSync(path.join(DIR, f), 'utf8');
const png = (svg, fitTo) => new Resvg(svg, { fitTo, font: { loadSystemFonts: false } }).render().asPng();
let n = 0;
const put = (f, buf) => {
  fs.mkdirSync(path.dirname(path.join(DIR, f)), { recursive: true });
  fs.writeFileSync(path.join(DIR, f), buf);
  n++;
};

// ICO with embedded PNGs (every current browser and Windows)
function ico(images) {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, e); head.writeUInt8(size >= 256 ? 0 : size, e + 1);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(data.length, e + 8); head.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...images.map((i) => i.data)]);
}

// Full-bleed square (iOS / Android round it): brand colour with the bare white headset in the middle.
const squareIcon = (size, inset) => {
  const src = read('headset_white.svg');
  const inner = src.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const vb = src.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  const k = 1 - 2 * inset;
  const cx = vb[0] + vb[2] / 2, cy = vb[1] + vb[3] / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${size}" height="${size}"><rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" fill="${m.primary}"/><g transform="translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})">${inner}</g></svg>`;
};

for (const id of m.marks) {
  const svg = read(`mark_${id}.svg`);
  for (const s of MARK_SIZES) put(`mark_${id}_${s}.png`, png(svg, { mode: 'width', value: s }));
  put(`mark_${id}.ico`, ico([16, 32, 48, 256].map((s) => ({ size: s, data: png(svg, { mode: 'width', value: s }) }))));
}
for (const id of m.headsets) {
  const svg = read(`headset_${id}.svg`);
  for (const s of [1024, 512, 256, 128, 64]) put(`headset_${id}_${s}.png`, png(svg, { mode: 'width', value: s }));
}
const fav = read(`mark_${m.favicon_mark}.svg`);
put('mellow-sounds_favicon.ico', ico([16, 32, 48].map((s) => ({ size: s, data: png(fav, { mode: 'width', value: s }) }))));
fs.copyFileSync(path.join(DIR, `mark_${m.favicon_mark}.svg`), path.join(DIR, 'favicon.svg'));
put('mellow-sounds_apple_touch_icon_180.png', png(squareIcon(180, 0.14), { mode: 'width', value: 180 }));
for (const s of [192, 512]) {
  put(`mellow-sounds_pwa_icon_${s}.png`, png(squareIcon(s, 0.14), { mode: 'width', value: s }));
  put(`mellow-sounds_pwa_maskable_${s}.png`, png(squareIcon(s, 0.24), { mode: 'width', value: s }));
}
for (const { id } of m.lockups) {
  const full = read(`full_${id}.svg`), nav = read(`nav_${id}.svg`);
  for (const w of FULL_WIDTHS) put(`full_${id}_${w}w_transparent.png`, png(full, { mode: 'width', value: w }));
  for (const h of NAV_HEIGHTS) put(`nav_${id}_${h}h.png`, png(nav, { mode: 'height', value: h }));
}
const pp = 'profile-pictures/mellow-sounds-profile-picture';
for (const v of ['on-white', 'on-navy']) put(`${pp}_${v}_800.png`, png(read(`${pp}_${v}.svg`), { mode: 'width', value: 800 }));
put(`${pp}_transparent_1024.png`, png(read(`${pp}_transparent.svg`), { mode: 'width', value: 1024 }));
put(`${pp}_original-colours_800.png`, png(read(`${pp}_original-colours.svg`), { mode: 'width', value: 800 }));
for (const f of fs.readdirSync(path.join(DIR, 'social')).filter((x) => x.endsWith('.svg'))) {
  put(`social/${f.replace(/\.svg$/, '.png')}`, png(read(`social/${f}`), { mode: 'zoom', value: 1 }));
}
console.log(`mellow-sounds: ${n} files rendered`);
