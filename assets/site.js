import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import HEADSET from './headset-data.js';

const canvas = document.getElementById('gl');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sections = [...document.querySelectorAll('section[data-scene]')];
const words = [...document.querySelectorAll('.bigword span')];

// header logo variant per world (a crimson disc vanishes on crimson; white words vanish on light pages)
const logoImg = document.querySelector('header img');
const LOGO = { navy: 'crimson_disk_white', crimson: 'white_disk_white', gold: 'crimson_disk_ink', ivory: 'crimson_disk_ink' };
let world = 'navy';
function setWorld(w, wd) {
  if (w !== world) {
    world = w; document.body.dataset.world = w;
    logoImg.src = `/images/logo/mellow-sounds/nav_${LOGO[w] || LOGO.navy}_64h.png`;
  }
  for (const el of words) el.classList.toggle('on', el.dataset.word === wd);
}
function sectionAtMid() {
  const mid = innerHeight * 0.5;
  let best = sections[0];
  for (const s of sections) { const r = s.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) return s; if (r.top > mid) break; best = s; }
  return best;
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  document.body.classList.add('no-gl');
  const sync = () => { const b = sectionAtMid(); setWorld(b.dataset.world, b.dataset.word); };
  addEventListener('scroll', sync, { passive: true }); sync();
}

if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0, 13);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x445, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 6, 8); scene.add(key);
  const rim = new THREE.PointLight(0xffffff, 40, 30); rim.position.set(-6, 2, -3); scene.add(rim);

  // ---- palettes: [main, secondary, dark] per world -------------------------------------------------
  const P = {
    navy:    { main: 0xEB1B57, alt: 0xffffff, dark: 0x0b0f2e, glow: 0x7C89FF },
    crimson: { main: 0xffffff, alt: 0x0A1550, dark: 0x1a0610, glow: 0xffd1de },
    gold:    { main: 0x0A1550, alt: 0xF6F1E7, dark: 0x2a1c05, glow: 0xffffff },
    ivory:   { main: 0xEB1B57, alt: 0x0A1550, dark: 0x1b1d2e, glow: 0xffffff },
  };
  const cur = { main: new THREE.Color(P.navy.main), alt: new THREE.Color(P.navy.alt), dark: new THREE.Color(P.navy.dark), glow: new THREE.Color(P.navy.glow) };
  const tgt = { main: new THREE.Color(), alt: new THREE.Color(), dark: new THREE.Color(), glow: new THREE.Color() };
  const mMain = new THREE.MeshStandardMaterial({ color: cur.main, roughness: 0.38, metalness: 0.15 });
  const mAlt = new THREE.MeshStandardMaterial({ color: cur.alt, roughness: 0.45, metalness: 0.1 });
  const mDark = new THREE.MeshStandardMaterial({ color: cur.dark, roughness: 0.6, metalness: 0.2 });
  const mGlow = new THREE.MeshStandardMaterial({ color: cur.glow, emissive: cur.glow, emissiveIntensity: 0.9, roughness: 0.4 });
  const mats = { main: mMain, alt: mAlt, dark: mDark, glow: mGlow };

  // ---- objects ------------------------------------------------------------------------------------
  const objs = [];
  const add = (group, scenes, opts = {}) => { group.visible = false; group.scale.setScalar(0); scene.add(group); objs.push({ g: group, scenes, s: 0, ...opts }); return group; };

  // 1. The headset: the logo geometry, extruded; bars animate like an equaliser
  const headset = new THREE.Group();
  {
    const loader = new SVGLoader();
    const inner = new THREE.Group();
    for (const d of HEADSET.pieces) {
      const data = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`);
      for (const p of data.paths) for (const shape of SVGLoader.createShapes(p)) {
        const geo = new THREE.ExtrudeGeometry(shape, { depth: 110, bevelEnabled: true, bevelThickness: 18, bevelSize: 14, bevelSegments: 4, curveSegments: 28 });
        const mesh = new THREE.Mesh(geo, mMain); mesh.position.z = -55; inner.add(mesh);
      }
    }
    inner.scale.set(1, -1, 1);
    inner.position.set(-HEADSET.cx, HEADSET.cy, 0);
    const bars = new THREE.Group();
    headset.userData.bars = [];
    for (const b of HEADSET.bars) {
      const h = b.y1 - b.y0, r = HEADSET.barW / 2;
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, h - 2 * r, 8, 16), mAlt);
      m.position.set(b.x, -((b.y0 + b.y1) / 2) + HEADSET.cy, 0);
      m.scale.z = 2.4; m.userData = { base: 1, h };
      bars.add(m); headset.userData.bars.push(m);
    }
    const frame = new THREE.Group(); frame.add(inner); frame.add(bars);
    frame.position.y = 0;
    frame.scale.setScalar(0.0072);
    headset.add(frame);
    // frame group was built around (0,cy); shift so the headset's centre is the origin
    inner.position.set(-HEADSET.cx, HEADSET.cy - 0, 0);
    inner.position.y = HEADSET.cy; // after the y flip, (x, y) -> (x, cy - y) lines up with the bar centres
  }
  add(headset, [0, 1, 6], { spin: 1 });

  // 2. Speaker stack (concerts)
  const speakers = new THREE.Group();
  for (const [x, y, rz] of [[-1.15, 0, 0.06], [1.15, 0.0, -0.06]]) {
    const cab = new THREE.Group();
    cab.add(new THREE.Mesh(new RoundedBoxGeometry(1.9, 3.1, 1.5, 4, 0.12), mMain));
    for (const [cy, r] of [[0.55, 0.62], [-0.75, 0.46]]) {
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, 0.14, 40), mDark); cone.rotation.x = Math.PI / 2; cone.position.set(0, cy, 0.76); cab.add(cone);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.28, 24, 16), mAlt); cap.position.set(0, cy, 0.84); cab.add(cap);
    }
    cab.position.set(x, y, 0); cab.rotation.z = rz; speakers.add(cab);
  }
  add(speakers, [2], { spin: 0.5 });

  // 3. Rings (weddings)
  const rings = new THREE.Group();
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.2, 32, 96), mMain);
  const r2 = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.2, 32, 96), mAlt);
  r1.position.x = -0.65; r2.position.x = 0.65; r1.rotation.y = 0.5; r2.rotation.y = -0.5;
  rings.add(r1, r2);
  add(rings, [3], { spin: 1.2 });

  // 4. Microphone on a stand (church)
  const mic = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.75, 40, 28), mMain); head.position.y = 1.5; mic.add(head);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.05, 12, 60), mDark); band.position.y = 1.5; band.rotation.x = Math.PI / 2; mic.add(band);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 1.7, 32), mAlt); body.position.y = 0.45; mic.add(body);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.2, 16), mDark); stem.position.y = -1.3; mic.add(stem);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.05, 0.14, 40), mDark); foot.position.y = -2.4; mic.add(foot);
  add(mic, [4], { spin: 0.7 });

  // 5. LED screen with a live waveform (corporate)
  const screen = new THREE.Group();
  screen.add(new THREE.Mesh(new RoundedBoxGeometry(4.6, 2.7, 0.22, 4, 0.08), mDark));
  const wave = [];
  for (let i = 0; i < 26; i++) {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.1, 1, 0.12, 2, 0.04), i % 5 === 2 ? mMain : mGlow);
    b.position.set(-2 + i * 0.16, 0, 0.14); wave.push(b); screen.add(b);
  }
  screen.userData.wave = wave;
  add(screen, [5], { spin: 0.35 });

  // 6. Flight case with a quote ticket (call to action)
  const kase = new THREE.Group();
  kase.add(new THREE.Mesh(new RoundedBoxGeometry(3.2, 2.1, 1.5, 4, 0.1), mAlt));
  const lid = new THREE.Mesh(new RoundedBoxGeometry(3.28, 0.12, 1.58, 3, 0.05), mMain); lid.position.y = 0.2; kase.add(lid);
  for (const x of [-1, 1]) { const l = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.3, 0.1, 2, 0.03), mDark); l.position.set(x, 0.2, 0.8); kase.add(l); }
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 12, 30, Math.PI), mMain); handle.position.set(0, 1.05, 0); kase.add(handle);
  const logo = new THREE.Mesh(new THREE.CircleGeometry(0.34, 40), mMain); logo.position.set(0, -0.35, 0.76); kase.add(logo);
  add(kase, [7], { spin: 0.6 });

  // drifting dust in the world colour
  const N = 260, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 24; pos[i * 3 + 1] = (Math.random() - 0.5) * 16; pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2; }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dustMat = new THREE.PointsMaterial({ color: cur.glow, size: 0.05, transparent: true, opacity: 0.55, depthWrite: false });
  const dust = new THREE.Points(dustGeo, dustMat); scene.add(dust);

  // ---- scroll state -------------------------------------------------------------------------------
  let active = 0, progress = 0, activeEl = sections[0];
  const mobile = () => innerWidth < 900;
  function readScroll() {
    const best = sectionAtMid();
    activeEl = best;
    const r = best.getBoundingClientRect();
    progress = Math.min(1, Math.max(0, (innerHeight * 0.5 - r.top) / Math.max(1, r.height)));
    active = +best.dataset.scene;
    setWorld(best.dataset.world, best.dataset.word);
  }
  addEventListener('scroll', readScroll, { passive: true });

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize(); readScroll();

  let mx = 0, my = 0;
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });

  // where the object sits: opposite the copy block, centred above it on phones
  function anchor() {
    const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect;
    if (mobile()) return { x: 0, y: 1.6, k: Math.min(0.62, halfW / 7) };
    const right = activeEl.classList.contains('right');
    const centre = activeEl.classList.contains('wide');
    const k = Math.min(centre ? 0.5 : 1, halfW * 0.4 / 2.8);
    const x = halfW - 2.8 * k - 0.5;
    return { x: centre ? halfW - 2.8 * k - 0.4 : (right ? -x : x), y: centre ? 2.5 : 0, k };
  }

  const clock = new THREE.Clock();
  let last = 0;
  function frame() {
    const t = clock.getElapsedTime();
    const dt = Math.min(t - last, 0.25); last = t;      // frame-rate independent easing
    const L = (rate) => 1 - Math.exp(-rate * dt);
    const pal = P[world] || P.navy;
    tgt.main.set(pal.main); tgt.alt.set(pal.alt); tgt.dark.set(pal.dark); tgt.glow.set(pal.glow);
    for (const k of Object.keys(mats)) { cur[k].lerp(tgt[k], L(3.5)); mats[k].color.copy(cur[k]); }
    mGlow.emissive.copy(cur.glow);
    dustMat.color.copy(cur.glow);

    const a = anchor();
    for (const o of objs) {
      const on = o.scenes.includes(active) ? 1 : 0;
      o.s += (on - o.s) * L(5);
      o.g.visible = o.s > 0.01;
      if (!o.g.visible) continue;
      const k = a.k * o.s * (o.base || 1);
      o.g.scale.setScalar(k);
      const bob = reduce ? 0 : Math.sin(t * 1.1 + objs.indexOf(o)) * 0.12;
      const dropIn = (1 - o.s) * 4;
      o.g.position.x += (a.x - o.g.position.x) * L(5);
      o.g.position.y += (a.y + bob + dropIn - o.g.position.y) * L(6);
      const targetY = progress * Math.PI * 2 * o.spin + mx * 0.6;
      o.g.rotation.y += (targetY - o.g.rotation.y) * L(4);
      o.g.rotation.x += ((my * 0.35 + 0.05) - o.g.rotation.x) * L(4);
    }
    // equaliser bars on the headset, live wall on the screen
    const bars = headset.userData.bars;
    bars.forEach((b, i) => {
      const f = reduce ? 1 : 0.72 + 0.28 * Math.sin(t * (2 + i * 0.7) + i * 1.7);
      b.scale.y = f;
    });
    screen.userData.wave.forEach((b, i) => {
      const f = reduce ? 0.6 : 0.25 + 1.3 * Math.abs(Math.sin(t * 1.6 + i * 0.5) * Math.cos(t * 0.7 + i * 0.21));
      b.scale.y = f; b.position.y = 0;
    });
    dust.rotation.y = t * 0.02; dust.position.y = -progress * 0.6;

    camera.position.x += (mx * 0.6 - camera.position.x) * L(2.5);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
}
