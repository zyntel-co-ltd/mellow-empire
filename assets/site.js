import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// One real product per section, shown like a studio product shot: it turns slowly so every side is seen,
// sits on a soft shadow, and cross-fades to the next product as you scroll. Models: Sketchfab, CC BY
// (credits on /credits/). Drag a product to turn it yourself.
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
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  camera.position.set(0, 0.35, 6);
  camera.lookAt(0, 0, 0);

  // neutral studio light: a soft key with shadows, a fill from the other side, a cool rim from behind
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(3, 5, 4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 0.5, far: 20 });
  key.shadow.radius = 6;
  const fill = new THREE.DirectionalLight(0xffffff, 0.9); fill.position.set(-4, 2, 3);
  const rim = new THREE.DirectionalLight(0xdde4ff, 1.2); rim.position.set(0, 3, -5);
  scene.add(key, fill, rim, new THREE.HemisphereLight(0xffffff, 0xe6e2da, 0.6));

  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const load = (name) => new Promise((res, rej) => loader.load(`/assets/models/${name}.glb`, (g) => res(g.scene), undefined, rej));

  // normalise to a given height (scene units), grounded at y=0, centred on x/z
  function fit(src, { height, width, rotX = 0, rotY = 0, rotZ = 0 }) {
    const o = src.clone(true);
    o.rotation.set(rotX, rotY, rotZ); o.updateMatrixWorld(true);
    let b = new THREE.Box3().setFromObject(o);
    const s = b.getSize(new THREE.Vector3());
    o.scale.multiplyScalar(height ? height / s.y : width / s.x); o.updateMatrixWorld(true);
    b = new THREE.Box3().setFromObject(o);
    const c = b.getCenter(new THREE.Vector3());
    o.position.x -= c.x; o.position.z -= c.z; o.position.y -= b.min.y;
    o.traverse((m) => {
      if (!m.isMesh) return;
      m.castShadow = m.receiveShadow = true;
      for (const mat of [].concat(m.material)) if (mat && 'envMapIntensity' in mat) mat.envMapIntensity = 1.1;
    });
    const g = new THREE.Group(); g.add(o); return g;
  }

  // the products, one per section. Each "shot" is one or two models arranged as a group of ~1 unit height.
  // tilt: lean flat products (decks, mixers) towards the viewer so their tops are seen
  const TILT = { 1: 0.55, 5: 0.6, 3: 0.25 };
  const SHOTS = {
    0: [{ m: 'beats-mixr-red', height: 1.0 }],
    1: [{ m: 'cdj3000-djm-a9', width: 1.9, y: 0.25 }, { m: 'sony-mdr-7506', width: 0.32, x: 0.55, y: 0.33, z: 0.18, rotX: -Math.PI / 2 + 0.2 }],
    2: [{ m: 'stage-speaker', height: 1.0, x: -0.55 }, { m: 'speaker-tripod', height: 1.3, x: 0.6, z: -0.15 }],
    3: [{ m: 'shure-sm58', width: 1.0, y: 0.12, rotZ: 0.18 }],
    4: [{ m: 'moving-head', height: 1.0 }],
    5: [{ m: 'yamaha-mg06', width: 1.3, y: 0.15 }],
    6: [{ m: 'monitor-wedge', width: 0.8, x: -0.45, z: 0.2 }, { m: 'mic-stand', height: 1.3, x: 0.45, z: -0.2 }],
    7: [{ m: 'sony-mdr-7506', height: 0.9 }],
    8: [{ m: 'beats-mixr-red', height: 1.0 }],
  };
  const groups = {};
  const mats = {};
  for (const [id, parts] of Object.entries(SHOTS)) {
    const g = new THREE.Group(); g.visible = false; scene.add(g);
    // a soft round shadow under every product, so nothing floats
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.75, 48), new THREE.ShadowMaterial({ opacity: 0.18, transparent: true }));
    shadow.rotation.x = -Math.PI / 2; shadow.receiveShadow = true; g.add(shadow);
    const turn = new THREE.Group(); g.add(turn);
    groups[id] = { g, turn, shadow, a: 0, spin: 0, norm: 1 };
    mats[id] = [];
    for (const p of parts) {
      load(p.m).then((src) => {
        const o = fit(src, p);
        o.position.set(p.x || 0, p.y || 0, p.z || 0);
        turn.add(o);
        o.traverse((m) => { if (m.isMesh) mats[id].push(...[].concat(m.material)); });
        // whatever the parts, the whole shot fits a 1 x 1 box (turning, so width and depth both count)
        const b = new THREE.Box3().setFromObject(turn), sz = b.getSize(new THREE.Vector3());
        groups[id].norm = 1 / Math.max(sz.y, Math.hypot(sz.x, sz.z) * 0.8);
      }).catch((e) => console.warn('model', p.m, e));
    }
  }

  // ---- scroll: which section is in view ----------------------------------------------------------
  let active = 0;
  function readScroll() {
    const mid = innerHeight / 2;
    const s = sections.find((el) => { const r = el.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; }) || sections[0];
    active = +s.dataset.scene;
    setWorld(s.dataset.world);
  }
  addEventListener('scroll', readScroll, { passive: true });

  const mobile = () => innerWidth < 900;
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  }
  addEventListener('resize', () => { resize(); readScroll(); }); resize(); readScroll();

  // drag to turn the product; otherwise it turns slowly on its own
  let dragging = false, lastX = 0, drag = 0;
  addEventListener('pointerdown', (e) => {
    // only start a drag on the product side of the screen, so buttons and text stay clickable
    if (e.target.closest('a,button,.copy')) return;
    dragging = true; lastX = e.clientX;
  });
  addEventListener('pointermove', (e) => { if (dragging) { drag += (e.clientX - lastX) * 0.01; lastX = e.clientX; } }, { passive: true });
  addEventListener('pointerup', () => { dragging = false; });

  const clock = new THREE.Clock(); let last = 0;
  function frame() {
    const t = clock.getElapsedTime();
    const dt = Math.min(t - last, 0.25); last = t;
    const L = (rate) => 1 - Math.exp(-rate * dt);
    const m = mobile();

    // frame the product from what the camera sees: right half on wide screens, top half on phones
    const dist = camera.position.length();
    const visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist, visW = visH * camera.aspect;
    const size = m ? Math.min(visH * 0.34, visW * 0.62) : Math.min(visH * 0.62, visW * 0.36);
    const x = m ? 0 : visW * 0.2;
    const y = m ? visH * 0.04 : -size * 0.45;   // y is the product base

    for (const [id, G] of Object.entries(groups)) {
      const on = +id === active ? 1 : 0;
      G.a += (on - G.a) * L(8);
      G.g.visible = G.a > 0.01;
      if (!G.g.visible) continue;
      const k = 0.94 + 0.06 * G.a;                   // a small settle, no flying in
      G.g.scale.setScalar(size * k * G.norm * (TILT[id] ? 0.82 : 1));
      G.g.position.set(x, y, 0);
      G.g.rotation.x = TILT[id] || 0;
      G.spin += (reduce ? 0 : 0.35) * dt;           // one full turn about every 18 seconds
      G.turn.rotation.y = G.spin + drag + (+id === 0 ? -0.6 : 0.5);
      // only blend while fading; fully shown products render solid (no see-through sorting artefacts)
      const fading = G.a < 0.995;
      for (const mt of mats[id]) { mt.transparent = fading; mt.opacity = fading ? G.a : 1; }
      G.shadow.material.opacity = 0.18 * G.a;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
}
