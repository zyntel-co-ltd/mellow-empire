import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Homepage behaviour (ENG-89):
// 1. Hero: Pioneer HDJ-X5 DJ headphones in 3D, turning slowly (drag to turn), in front of the headline.
//    Model: Sketchfab, Free Standard licence (no credit required).
// 2. Words: headings split into words that rise in one after another when they come into view.
// 3. Photos: open from a mask and settle as they come into view, with a light parallax while scrolling.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sections = [...document.querySelectorAll('section[data-world]')];

// ---- words ----------------------------------------------------------------------------------------
for (const el of document.querySelectorAll('.split')) {
  const words = [];
  const walk = (node) => {
    for (const n of [...node.childNodes]) {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(part); return; }
          const w = document.createElement('span'); w.className = 'w';
          const i = document.createElement('span'); i.textContent = part; w.append(i);
          frag.append(w); words.push(i);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    }
  };
  walk(el);
  words.forEach((w, i) => { w.style.transitionDelay = `${i * 70}ms`; });
}

// ---- reveal on scroll (plain rect checks; works even where IntersectionObserver is throttled) -------
let pending = [...document.querySelectorAll('.split, .rise, .shot')];
const shots = [...document.querySelectorAll('.shot')];
function onScroll() {
  const h = innerHeight;
  pending = pending.filter((el) => {
    const r = el.getBoundingClientRect();
    if (reduce || (r.top < h * 0.86 && r.bottom > 0)) { el.classList.add('in'); return false; }
    return true;
  });
  if (!reduce) for (const s of shots) {
    const r = s.getBoundingClientRect();
    if (r.bottom < 0 || r.top > h) continue;
    const off = (r.top + r.height / 2 - h / 2) / h;         // -0.5 .. 0.5 while on screen
    s.firstElementChild.style.translate = `0 ${(off * -6).toFixed(2)}%`;
  }
  const mid = sections.find((s) => { const r = s.getBoundingClientRect(); return r.top <= h / 2 && r.bottom > h / 2; });
  if (mid && document.body.dataset.world !== mid.dataset.world) document.body.dataset.world = mid.dataset.world;
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
requestAnimationFrame(onScroll);

// ---- hero headphones --------------------------------------------------------------------------------
const canvas = document.getElementById('gl');
let renderer = null;
try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch (e) { canvas.remove(); }

if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  camera.position.set(0, 0.15, 3.2); camera.lookAt(0, 0, 0);
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(2, 3, 3);
  const fill = new THREE.DirectionalLight(0xffffff, 0.9); fill.position.set(-3, 1, 2);
  const rim = new THREE.DirectionalLight(0xdde4ff, 1.4); rim.position.set(0, 2, -3);
  scene.add(key, fill, rim, new THREE.HemisphereLight(0xffffff, 0xe6e2da, 0.6));

  const pivot = new THREE.Group(); scene.add(pivot);
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load('/assets/models/pioneer-hdj-x5.glb', (g) => {
    const o = g.scene;
    const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    o.position.sub(c); o.scale.multiplyScalar(1 / Math.max(s.x, s.y, s.z));      // fits a 1 x 1 x 1 box, centred
    o.traverse((m) => { if (m.isMesh) for (const mat of [].concat(m.material)) if (mat && 'envMapIntensity' in mat) mat.envMapIntensity = 1.2; });
    pivot.add(o);
  });

  const hero = canvas.parentElement;
  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  let dragging = false, lastX = 0, drag = 0;
  hero.addEventListener('pointerdown', (e) => { if (!e.target.closest('a,button')) { dragging = true; lastX = e.clientX; } });
  addEventListener('pointermove', (e) => { if (dragging) { drag += (e.clientX - lastX) * 0.01; lastX = e.clientX; } }, { passive: true });
  addEventListener('pointerup', () => { dragging = false; });

  const clock = new THREE.Clock(); let last = 0, spin = -0.6;
  (function frame() {
    const t = clock.getElapsedTime(), dt = Math.min(t - last, 0.1); last = t;
    const m = innerWidth < 900;
    // frame from what the camera sees: right of centre and large on computers, top half on phones
    const visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z, visW = visH * camera.aspect;
    const size = m ? Math.min(visH * 0.4, visW * 0.8) : Math.min(visH * 0.84, visW * 0.46);
    pivot.scale.setScalar(size);
    pivot.position.set(m ? 0 : visW * 0.27, m ? visH * 0.27 : -visH * 0.02, 0);
    spin += (reduce ? 0 : 0.32) * dt;
    pivot.rotation.set(0.12, spin + drag, 0);
    if (hero.getBoundingClientRect().bottom > 0) renderer.render(scene, camera);
    requestAnimationFrame(frame);
  })();
}
