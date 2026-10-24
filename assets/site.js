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
// Weak or software-only graphics (no GPU acceleration in the browser) render the full hero at a few frames a second,
// which reads as "not turning" and makes scrolling stutter. Ask the browser which renderer it uses before choosing quality.
const software = (() => {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const info = gl && gl.getExtension('WEBGL_debug_renderer_info');
    const name = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : '';
    gl && gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /swiftshader|llvmpipe|software|basic render/i.test(name);
  } catch (e) { return false; }
})();
let renderer = null;
try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !software, powerPreference: 'high-performance' }); } catch (e) { canvas.remove(); }

if (renderer) {
  // pixel ratio capped at 1.5 (a full-hero canvas at 2x is ~5 million pixels a frame); lowered further below if frames run slow
  let ratio = software ? 0.75 : Math.min(devicePixelRatio, 1.5);
  renderer.setPixelRatio(ratio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;   // keeps the red rich without blowing out
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  camera.position.set(0, 0.15, 3.2); camera.lookAt(0, 0, 0);
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(2, 3, 3);
  const fill = new THREE.DirectionalLight(0xffffff, 0.9); fill.position.set(-3, 1, 2);
  const rim = new THREE.DirectionalLight(0xdde4ff, 1.4); rim.position.set(0, 2, -3);
  scene.add(key, fill, rim, new THREE.HemisphereLight(0xffffff, 0xe6e2da, 0.6));

  const pivot = new THREE.Group(); scene.add(pivot);
  let loaded = false;
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load('/assets/models/beats-mixr-red.glb', (g) => {
    const o = g.scene;
    // fit a 1 x 1 x 1 box first, then centre (centring before scaling leaves the model off to one side)
    let b = new THREE.Box3().setFromObject(o); const s = b.getSize(new THREE.Vector3());
    o.scale.multiplyScalar(1 / Math.max(s.x, s.y, s.z)); o.updateMatrixWorld(true);
    b = new THREE.Box3().setFromObject(o); o.position.sub(b.getCenter(new THREE.Vector3()));
    o.traverse((m) => { if (m.isMesh) for (const mat of [].concat(m.material)) if (mat && 'envMapIntensity' in mat) mat.envMapIntensity = 1.2; });
    pivot.add(o); loaded = true; start();
  });

  // The canvas starts below the fixed header (its top and the hero's extra height come from --hdr, set here), so the
  // headphones keep their size and position relative to the canvas but sit lower, clear of the header.
  const hero = canvas.parentElement;
  let cw = 0, ch = 0;
  function resize() {
    document.documentElement.style.setProperty('--hdr', header.offsetHeight + 'px');
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w === cw && h === ch) return;
    cw = w; ch = h;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(hero); resize();

  let dragging = false, lastX = 0, drag = 0;
  hero.addEventListener('pointerdown', (e) => { if (!e.target.closest('a,button')) { dragging = true; lastX = e.clientX; } });
  addEventListener('pointermove', (e) => { if (dragging) { drag += (e.clientX - lastX) * 0.01; lastX = e.clientX; } }, { passive: true });
  addEventListener('pointerup', () => { dragging = false; });

  // Render only while the hero is on screen (no per-frame layout reads). Each second, if frames averaged slower than
  // ~40 a second, drop the resolution a step (down to half), so weak graphics stay smooth instead of freezing.
  let visible = true, running = false, last = 0, born = 0, spin = -0.6, win = 0, frames = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(hero);
  function start() { if (!running && visible && loaded) { running = true; last = performance.now(); if (!born) born = last; requestAnimationFrame(frame); } }
  function frame(now) {
    if (!visible) { running = false; return; }
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    win += dt; frames++;
    if (win >= 1) {
      if (frames / win < 40 && ratio > 0.5) { ratio = Math.max(0.5, ratio - 0.25); renderer.setPixelRatio(ratio); renderer.setSize(cw, ch, false); }
      win = 0; frames = 0;
    }
    // frame from what the camera sees: right of centre and large on computers, top half on phones
    const m = innerWidth < 900;
    const visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z, visW = visH * camera.aspect;
    const size = m ? Math.min(visH * 0.4, visW * 0.8) : Math.min(visH * 0.86, visW * 0.5);
    pivot.scale.setScalar(size);
    pivot.position.set(m ? 0 : visW * 0.16, m ? visH * 0.27 : -visH * 0.02, 0);
    // on page load a quick turn that settles into the slow spin, so the 3D is obvious straight away
    const intro = Math.max(0, 1 - (now - born) / 2200);
    spin += (reduce ? 0 : 0.32 + 4.5 * intro * intro) * dt;
    pivot.rotation.set(0.12, spin + drag, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
}
