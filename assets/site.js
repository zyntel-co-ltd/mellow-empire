import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Home hero (ENG-90): red Beats Mixr headphones in 3D, turning slowly (drag to turn), in front of the headline.
// Model: "Audifonos Beats Mixr" by HectorValenzuela (Sketchfab), CC BY 4.0: the licence requires the one-line
// credit in the footer of index.html. Do not remove it while this model is used. Reveals and the quote are in ui.js.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- hero headphones --------------------------------------------------------------------------------
const canvas = document.getElementById('gl');
const header = document.querySelector('header');
let renderer = null;
try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch (e) { canvas.remove(); }

if (renderer) {
  // pixel ratio capped at 1.5 (a full-hero canvas at 2x is ~5 million pixels a frame); lowered further below if frames run slow
  let ratio = Math.min(devicePixelRatio, 1.5);
  renderer.setPixelRatio(ratio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;   // keeps the red rich without blowing out
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  const D = 3.2;   // camera distance
  camera.position.set(0, 0.15, D); camera.lookAt(0, 0, 0);
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(2, 3, 3);
  const fill = new THREE.DirectionalLight(0xffffff, 0.9); fill.position.set(-3, 1, 2);
  const rim = new THREE.DirectionalLight(0xdde4ff, 1.4); rim.position.set(0, 2, -3);
  scene.add(key, fill, rim, new THREE.HemisphereLight(0xffffff, 0xe6e2da, 0.6));

  const pivot = new THREE.Group(); scene.add(pivot);
  let dims = null;   // model size after fitting into a 1 x 1 x 1 box
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load('/assets/models/beats-mixr-red.glb', (g) => {
    const o = g.scene;
    // fit a 1 x 1 x 1 box first, then centre (centring before scaling leaves the model off to one side)
    let b = new THREE.Box3().setFromObject(o); const s = b.getSize(new THREE.Vector3());
    o.scale.multiplyScalar(1 / Math.max(s.x, s.y, s.z)); o.updateMatrixWorld(true);
    b = new THREE.Box3().setFromObject(o); o.position.sub(b.getCenter(new THREE.Vector3()));
    dims = b.getSize(new THREE.Vector3());
    o.traverse((m) => { if (m.isMesh) for (const mat of [].concat(m.material)) if (mat && 'envMapIntensity' in mat) mat.envMapIntensity = 1.2; });
    pivot.add(o); place(); start();
  });

  // The canvas starts below the fixed header, so the headphones can never turn underneath it (and the header's blur
  // is not re-drawn over a moving picture). The model is sized from the space it has, allowing for perspective:
  // while it turns, the part nearest the camera looks bigger, so a plain "fit the box" still clipped the headband.
  const hero = canvas.parentElement;
  const copy = hero.querySelector('.copy');
  let cw = 0, ch = 0;
  function place() {
    if (!dims || !ch) return;
    const m = innerWidth < 900, pad = m ? 12 : 24;
    const visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * D, visW = visH * camera.aspect, px = visH / ch;
    const r = Math.hypot(dims.x, dims.z) / 2, hy = dims.y / 2;   // turning radius and half height (unit scale)
    // allowed area in world units at the model's depth: x from L to R, y from B to T
    let L, R, T, B;
    if (m) {   // phones: the strip between the header and the headline
      const bottom = copy.getBoundingClientRect().top - canvas.getBoundingClientRect().top;
      T = visH / 2 - pad * px; B = visH / 2 - (bottom - pad) * px;
      R = visW / 2 - pad * px; L = -R;
    } else {   // computers: right of centre, next to the headline
      T = visH / 2 - pad * px; B = -T;
      L = -visW * 0.09; R = visW / 2 - pad * px;
    }
    const x0 = (L + R) / 2, y0 = (T + B) / 2;
    // largest scale s with every projected edge inside the area: a point at depth z shows at (x, y) * D / (D - z)
    const s = Math.min(
      D * (T - y0) / (D * hy + T * r), D * (y0 - B) / (D * hy - B * r),
      D * (R - x0) / (r * (D + R)), D * (x0 - L) / (r * (D - L)));
    pivot.scale.setScalar(Math.max(s, 0.01));
    pivot.position.set(x0, y0, 0);
  }
  function resize() {
    const top = header.offsetHeight;   // the hero starts at the top of the page, under the fixed header
    const w = hero.clientWidth, h = hero.clientHeight - top;
    canvas.style.top = top + 'px'; canvas.style.height = h + 'px';
    if (w === cw && h === ch) { place(); return; }
    cw = w; ch = h;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    place(); renderer.render(scene, camera);
  }
  new ResizeObserver(resize).observe(hero); resize();

  let dragging = false, lastX = 0, drag = 0;
  hero.addEventListener('pointerdown', (e) => { if (!e.target.closest('a,button')) { dragging = true; lastX = e.clientX; } });
  addEventListener('pointermove', (e) => { if (dragging) { drag += (e.clientX - lastX) * 0.01; lastX = e.clientX; } }, { passive: true });
  addEventListener('pointerup', () => { dragging = false; });

  // Render only while the hero is on screen (no per-frame layout reads). If frames run slow, drop the resolution.
  let visible = true, running = false, last = 0, spin = -0.6, slow = 0, count = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(hero);
  function start() { if (!running && visible && dims) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  function frame(now) {
    if (!visible) { running = false; return; }
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    if (++count > 10) {   // skip the first frames (shader compile)
      slow = slow * 0.95 + (dt > 0.024 ? 0.05 : 0);
      if (slow > 0.5 && ratio > 0.75) { ratio = Math.max(0.75, ratio - 0.25); renderer.setPixelRatio(ratio); renderer.setSize(cw, ch, false); slow = 0; count = 0; }
    }
    spin += (reduce ? 0 : 0.32) * dt;
    pivot.rotation.set(0.12, spin + drag, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
}
