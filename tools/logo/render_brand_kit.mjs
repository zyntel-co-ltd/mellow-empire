// Renders the brand kit PNGs listed by build_brand_kit.py (python build_brand_kit.py && node render_brand_kit.mjs).
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.resolve(HERE, '..', '..', 'brand-kit');
const list = JSON.parse(fs.readFileSync(path.join(HERE, 'brand_kit_renders.json'), 'utf8'));
for (const r of list) {
  const svg = fs.readFileSync(path.join(KIT, r.svg), 'utf8');
  const out = new Resvg(svg, { fitTo: { mode: r.mode, value: r.value }, font: { loadSystemFonts: false } }).render().asPng();
  fs.writeFileSync(path.join(KIT, r.png), out);
}
console.log(`brand kit: ${list.length} PNGs rendered`);
