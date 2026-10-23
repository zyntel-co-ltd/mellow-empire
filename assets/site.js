import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import HEADSET from './headset-data.js';

const canvas = document.getElementById('gl');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sections = [...document.querySelectorAll('section[data-scene]')];
const words = [...document.querySelectorAll('.bigword span')];

// header logo variant per world (a crimson disc vanishes on crimson; white words vanish on light pages)
const logoImg = document.querySelector('header img');
const LOGO = { peri: 'crimson_disk_ink', navy: 'crimson_disk_ink', crimson: 'crimson_disk_ink', gold: 'crimson_disk_ink', ivory: 'crimson_disk_ink' };
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0, 13);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;   // reflections so real materials read as real
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 6, 8); scene.add(key);
  const rim = new THREE.PointLight(0xffffff, 40, 30); rim.position.set(-6, 2, -3); scene.add(rim);

  // ---- palettes: [main, secondary, dark] per world -------------------------------------------------
  const P = {
    navy:    { main: 0xEB1B57, alt: 0x0A1550, dark: 0x1a1d33, glow: 0xEB1B57 },
    crimson: { main: 0xEB1B57, alt: 0x0A1550, dark: 0x1a1d33, glow: 0xEB1B57 },
    gold:    { main: 0xC98F1E, alt: 0x0A1550, dark: 0x2a1c05, glow: 0xC98F1E },
    peri:    { main: 0x3F4FD6, alt: 0x0A1550, dark: 0x1a1d33, glow: 0x3F4FD6 },
    ivory:   { main: 0x0A1550, alt: 0xEB1B57, dark: 0x1b1d2e, glow: 0x0A1550 },
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
  add(headset, [0, 1, 5, 6], { spin: 1 });

  // Real 3D models (glTF, CC0/CC-BY). Each is normalised to a target height and centred.
  // Add or replace a model by dropping a .glb/.gltf in assets/models and editing this list.
  const gltf = new GLTFLoader();
  const MODELS = [
    { file: 'boombox/boombox.gltf', scenes: [2], height: 3.4, spin: 0.5 },
    { file: 'Chandelier_02/Chandelier_02.gltf', scenes: [3], height: 4.0, spin: 0.6 },
    { file: 'Megaphone_01/Megaphone_01.gltf', scenes: [4], height: 3.2, spin: 0.7 },
    { file: 'vintage_suitcase/vintage_suitcase.gltf', scenes: [7], height: 3.0, spin: 0.6 },
  ];
  for (const m of MODELS) {
    gltf.load(`/assets/models/${m.file}`, (g) => {
      const root = g.scene;
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      root.position.sub(c);
      const holder = new THREE.Group(); holder.add(root);
      holder.userData.base = m.height / size.y;
      const wrap = new THREE.Group(); wrap.add(holder); holder.scale.setScalar(holder.userData.base);
      add(wrap, m.scenes, { spin: m.spin });
    }, undefined, (e) => console.warn('model failed', m.file, e));
  }

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
    dust.rotation.y = t * 0.02; dust.position.y = -progress * 0.6;

    camera.position.x += (mx * 0.6 - camera.position.x) * L(2.5);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
}
