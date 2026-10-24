import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Real products on the page, at real proportions, moving with the page like any other content.
// - One scale for every product (pixels per metre), set so the Sony headphones on the DJ console are
//   big on screen; everything else follows from its real size, so speakers and decks can run past the edges.
// - Each product belongs to a section and scrolls with it: it comes up from below, turns slowly while
//   its section is in view, and leaves upwards. No fades.
// - The hero headphones are the one exception: sized to fill the hero.
// Camera is orthographic in CSS pixels, so a product's screen position is just its section's position.
// Models: Sketchfab, CC BY (credits on /credits/).
const canvas = document.getElementById('gl');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sections = [...document.querySelectorAll('section[data-scene]')];
let world = '';
function setWorld(w) { if (w !== world) { world = w; document.body.dataset.world = w; } }

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); }
catch (e) { document.body.classList.add('no-gl'); }

if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -20000, 20000);
  camera.position.set(0, 0, 5000);

  const key = new THREE.DirectionalLight(0xffffff, 2.0); key.position.set(0.6, 1, 0.8);
  const fill = new THREE.DirectionalLight(0xffffff, 0.9); fill.position.set(-0.8, 0.4, 0.6);
  const rim = new THREE.DirectionalLight(0xdde4ff, 1.1); rim.position.set(0, 0.6, -1);
  scene.add(key, fill, rim, new THREE.HemisphereLight(0xffffff, 0xe6e2da, 0.6));

  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const load = (name) => new Promise((res, rej) => loader.load(`/assets/models/${name}.glb`, (g) => res(g.scene), undefined, rej));

  // normalise to a real size in metres, grounded at y=0, centred on x/z
  function fit(src, { height, width, rotX = 0, rotY = 0, rotZ = 0 }) {
    const o = src.clone(true);
    o.rotation.set(rotX, rotY, rotZ); o.updateMatrixWorld(true);
    let b = new THREE.Box3().setFromObject(o);
    const s = b.getSize(new THREE.Vector3());
    o.scale.multiplyScalar(height ? height / s.y : width / s.x); o.updateMatrixWorld(true);
    b = new THREE.Box3().setFromObject(o);
    const c = b.getCenter(new THREE.Vector3());
    o.position.x -= c.x; o.position.z -= c.z; o.position.y -= b.min.y;
    o.traverse((m) => { if (m.isMesh) for (const mat of [].concat(m.material)) if (mat && 'envMapIntensity' in mat) mat.envMapIntensity = 1.1; });
    const g = new THREE.Group(); g.add(o); return g;
  }

  // a soft contact shadow, drawn once (the camera looks straight on, so it is a flat ellipse under the base)
  const shadowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(10,21,80,.30)'); r.addColorStop(0.6, 'rgba(10,21,80,.10)'); r.addColorStop(1, 'rgba(10,21,80,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();

  // real sizes in metres. Scene 1 is the DJ console with the Sony MDR-7506 resting on it.
  // tilt: lean flat products toward the viewer so their tops are seen
  const PRODUCTS = {
    0: { parts: [{ m: 'beats-mixr-red', height: 0.19 }], hero: true },
    1: { parts: [{ m: 'cdj3000-djm-a9', width: 1.13 }, { m: 'sony-mdr-7506', width: 0.19, x: 0.36, y: 0.085, z: 0.05, rotX: -Math.PI / 2 + 0.25 }], tilt: 0.55 },
    2: { parts: [{ m: 'stage-speaker', height: 0.75 }] },
    3: { parts: [{ m: 'shure-sm58', width: 0.162, rotZ: 0.18 }], tilt: 0.25 },
    4: { parts: [{ m: 'moving-head', height: 0.48 }] },
    5: { parts: [{ m: 'yamaha-mg06', width: 0.149 }], tilt: 0.6 },
    6: { parts: [{ m: 'monitor-wedge', width: 0.55 }] },
  };

  const items = [];
  for (const [id, P] of Object.entries(PRODUCTS)) {
    const section = sections.find((s) => s.dataset.scene === id);
    if (!section) continue;
    const root = new THREE.Group(); scene.add(root);
    const tilt = new THREE.Group(); tilt.rotation.x = P.tilt || 0; root.add(tilt);
    const turn = new THREE.Group(); tilt.add(turn);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    shadow.renderOrder = -1; root.add(shadow);
    const it = { id: +id, P, section, root, turn, shadow, size: new THREE.Vector3(1, 1, 1), ready: 0, spin: Math.random() * 6 };
    items.push(it);
    P.parts.forEach((p) => load(p.m).then((src) => {
      const o = fit(src, p); o.position.set(p.x || 0, p.y || 0, p.z || 0); turn.add(o);
      // footprint of the whole product (all parts), in metres
      const b = new THREE.Box3().setFromObject(turn); b.getSize(it.size);
      turn.position.y = -it.size.y / 2;          // pivot at the product's centre, so it turns and tilts in place
      it.ready++; layout();
    }).catch((e) => console.warn('model', p.m, e)));
  }

  // ---- layout: pixels per metre, section heights, and where each product sits -----------------------
  const mobile = () => innerWidth < 900;
  let pxPerM = 1;
  // on-screen height of a product at scale k: it turns and may be tilted, so use its bounding sphere
  function screenHeight(it, k) { return Math.hypot(it.size.x, it.size.y, it.size.z) * k; }
  function heroScale(it) { return (mobile() ? innerHeight * 0.42 : innerHeight * 0.88) / Math.max(it.size.y, 0.01); }
  function layout() {
    const w = innerWidth, h = innerHeight, m = mobile();
    renderer.setSize(w, h, false);
    Object.assign(camera, { left: -w / 2, right: w / 2, top: h / 2, bottom: -h / 2 }); camera.updateProjectionMatrix();
        // the Sony headphones (0.19 m) are 55% of the screen height on a computer; on a phone 12%, so a
    // 0.75 m speaker is about half a screen and the decks run just past the edges
    pxPerM = (m ? h * 0.12 : h * 0.55) / 0.19;
    for (const it of items) {
      if (!it.ready || it.P.hero) continue;
      const ph = screenHeight(it, pxPerM);
      // the section is as tall as its product, so the product passes through the screen with it
      if (m) { it.section.style.paddingTop = Math.round(Math.min(ph, h * 1.6) + 70) + 'px'; it.section.style.minHeight = ''; }
      else { it.section.style.minHeight = Math.round(Math.max(h * 0.75, ph * 1.05 + 80)) + 'px'; it.section.style.paddingTop = ''; }   // room so neighbours never overlap
    }
  }
  addEventListener('resize', layout); layout();

  function readScroll() {
    const mid = innerHeight / 2;
    const s = sections.find((el) => { const r = el.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; }) || sections[0];
    setWorld(s.dataset.world);
  }
  addEventListener('scroll', readScroll, { passive: true }); readScroll();

  // drag (outside the text) to turn the product under the pointer's section
  let dragging = false, lastX = 0, drag = 0;
  addEventListener('pointerdown', (e) => { if (!e.target.closest('a,button,.copy,header,footer')) { dragging = true; lastX = e.clientX; } });
  addEventListener('pointermove', (e) => { if (dragging) { drag += (e.clientX - lastX) * 0.01; lastX = e.clientX; } }, { passive: true });
  addEventListener('pointerup', () => { dragging = false; });

  const clock = new THREE.Clock(); let last = 0;
  function frame() {
    const t = clock.getElapsedTime();
    const dt = Math.min(t - last, 0.1); last = t;
    const w = innerWidth, h = innerHeight, m = mobile();
    for (const it of items) {
      if (!it.ready) { it.root.visible = false; continue; }
      const r = it.section.getBoundingClientRect();
      const k = it.P.hero ? heroScale(it) : pxPerM;
      const ph = screenHeight(it, k);
      // vertical: centred in its section (phones: in the space above the copy); converts CSS px to camera units
      const cy = m ? r.top + 50 + Math.min(ph, h * 1.6) / 2 : r.top + r.height / 2;
      const onScreen = cy + ph / 2 > -200 && cy - ph / 2 < h + 200;
      it.root.visible = onScreen;
      if (!onScreen) continue;
      const x = m ? 0 : w * (it.P.hero ? 0.2 : 0.22);
      it.root.position.set(x, h / 2 - cy, 0);
      it.root.scale.setScalar(k);
      it.spin += (reduce ? 0 : 0.3) * dt;
      it.turn.rotation.y = it.spin + drag;
      const foot = Math.hypot(it.size.x, it.size.z);
      it.shadow.scale.set(foot * 1.2, foot * 0.22, 1);
      it.shadow.position.set(0, -ph / k / 2 * 0.92, -foot);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
}
