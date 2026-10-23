import * as THREE from 'three';

// Real photographs of real gear (backgrounds removed), placed as layered planes in a 3D scene.
// Each scene is a set of pieces that fly in and settle as you scroll into the section.
const canvas = document.getElementById('gl');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sections = [...document.querySelectorAll('section[data-scene]')];
const logoImg = document.querySelector('header img');
let world = '';

function setWorld(w) {
  if (w === world) return;
  world = w;
  document.body.dataset.world = w;
}
function sectionAtMid() {
  const mid = innerHeight * 0.5;
  let best = sections[0];
  for (const s of sections) {
    const r = s.getBoundingClientRect();
    if (r.top <= mid && r.bottom > mid) return s;
    if (r.top > mid) break;
    best = s;
  }
  return best;
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
} catch (e) {
  document.body.classList.add('no-gl');
  const sync = () => setWorld(sectionAtMid().dataset.world);
  addEventListener('scroll', sync, { passive: true });
  sync();
}

if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0, 13);

  // soft contact shadow, drawn once and reused under every piece
  const shadowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(10,10,20,.34)'); r.addColorStop(1, 'rgba(10,10,20,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();

  // pieces: image, height in scene units, offset inside the scene (x, y, z), and where it flies in from
  const SCENES = {
    0: [
      { img: 'headphones', h: 5.2, x: 0, y: 0, z: 0.4, from: [0, 5, -2, 0.5], tilt: 0.12 },
      { img: 'dj-controller', h: 2.2, x: -1.8, y: -2.2, z: 1.2, from: [-5, -3, 0, -0.6], tilt: 0.2 },
    ],
    1: [
      { img: 'headphones', h: 4.4, x: 0, y: 0, z: 0.4, from: [4, 0, -1, 0.4], tilt: 0.12 },
    ],
    2: [
      { img: 'dj-controller', h: 3.0, x: -0.2, y: -1.5, z: 0.6, from: [-6, -2, 0, -0.5], tilt: 0.18 },
      { img: 'headphones-2', h: 4.0, x: 1.8, y: 0.6, z: 0.2, from: [6, 3, -2, 0.6], tilt: 0.14 },
    ],
    3: [
      { img: 'mic-stand', h: 6.0, x: -0.8, y: 0, z: 0.2, from: [-4, -6, -1, 0.3], tilt: 0.08 },
      { img: 'condenser-mic', h: 3.6, x: 1.4, y: -0.6, z: 0.8, from: [6, 2, 0, -0.5], tilt: 0.12 },
    ],
    4: [
      { img: 'mic-stand', h: 6.2, x: 0, y: 0, z: 0.2, from: [0, -7, -1, 0.0], tilt: 0.06 },
    ],
    5: [
      { img: 'condenser-mic', h: 4.4, x: -1.2, y: 0, z: 0.3, from: [-5, 3, -1, 0.4], tilt: 0.1 },
      { img: 'headphones-2', h: 3.8, x: 1.4, y: 0.2, z: 0.9, from: [6, -2, 0, -0.4], tilt: 0.12 },
    ],
    6: [
      { img: 'headphones', h: 3.6, x: 0, y: 0, z: 0.4, from: [0, 5, -2, 0.4], tilt: 0.1 },
    ],
    7: [
      { img: 'dj-controller', h: 3.0, x: 0, y: 0, z: 0.4, from: [0, -6, -2, 0.4], tilt: 0.18 },
    ],
  };

  const loader = new THREE.TextureLoader();
  const tex = {};
  const load = (name) => tex[name] || (tex[name] = loader.load(`/assets/gear/${name}.png`, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData.ready = true; }));

  const groups = {};
  for (const [id, pieces] of Object.entries(SCENES)) {
    const g = new THREE.Group(); g.visible = false; scene.add(g);
    const items = pieces.map((p) => {
      const t = load(p.img);
      const holder = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
      holder.add(sh, mesh); g.add(holder);
      return { ...p, holder, mesh, sh, mat, cur: { x: p.x + p.from[0], y: p.y + p.from[1], z: p.z + p.from[2], r: p.from[3] } };
    });
    groups[id] = { g, items, s: 0 };
  }

  function sizeItem(it) {
    const t = it.mat.map;
    if (!t.image || it.sized) return;
    const ar = t.image.width / t.image.height;
    it.mesh.scale.set(it.h * ar, it.h, 1);
    it.sh.scale.set(it.h * ar * 1.05, it.h * 0.16, 1);
    it.sh.position.set(0, -it.h * 0.5, -0.02);
    it.sized = true;
  }

  let active = 0, progress = 0, activeEl = sections[0];
  const mobile = () => innerWidth < 900;
  function readScroll() {
    const best = sectionAtMid();
    activeEl = best;
    const r = best.getBoundingClientRect();
    progress = Math.min(1, Math.max(0, (innerHeight * 0.5 - r.top) / Math.max(1, r.height)));
    active = +best.dataset.scene;
    setWorld(best.dataset.world);
  }
  addEventListener('scroll', readScroll, { passive: true });

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize(); readScroll();

  let mx = 0, my = 0;
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });

  // where the scene sits: opposite the copy block; above it on phones
  function anchor() {
    const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect;
    if (mobile()) return { x: 0, y: 1.7, k: Math.min(0.5, halfW / 8) };
    const right = activeEl.classList.contains('right');
    const centre = activeEl.classList.contains('wide');
    const k = Math.min(centre ? 0.55 : 1, halfW * 0.42 / 3);
    const x = halfW - 3 * k - 0.5;
    return { x: centre ? x : (right ? -x : x), y: centre ? 2.2 : 0, k };
  }

  const clock = new THREE.Clock();
  let last = 0;
  function frame() {
    const t = clock.getElapsedTime();
    const dt = Math.min(t - last, 0.25); last = t;
    const L = (rate) => 1 - Math.exp(-rate * dt);
    const a = anchor();

    for (const [id, G] of Object.entries(groups)) {
      const on = +id === active ? 1 : 0;
      G.s += (on - G.s) * L(4);
      G.g.visible = G.s > 0.01;
      if (!G.g.visible) continue;
      G.g.position.x += (a.x - G.g.position.x) * L(5);
      G.g.position.y += (a.y - G.g.position.y) * L(5);
      G.g.scale.setScalar(a.k);
      G.g.rotation.y += ((mx * 0.5) - G.g.rotation.y) * L(3);
      G.g.rotation.x += ((my * 0.25) - G.g.rotation.x) * L(3);
      G.items.forEach((it, i) => {
        sizeItem(it);
        // fly in, then settle; pieces arrive one after another
        const k = reduce ? 1 : Math.min(1, Math.max(0, G.s * 1.25 - i * 0.18));
        const e = 1 - Math.pow(1 - k, 3);
        const bob = reduce ? 0 : Math.sin(t * 0.9 + i * 2) * 0.08;
        it.holder.position.set(it.x + it.from[0] * (1 - e), it.y + it.from[1] * (1 - e) + bob, it.z + it.from[2] * (1 - e));
        it.holder.rotation.z = it.from[3] * (1 - e) + Math.sin(t * 0.6 + i) * 0.015 + (progress - 0.5) * it.tilt;
        it.mat.opacity = Math.min(1, k * 1.6);
        it.sh.material.opacity = it.mat.opacity;
      });
    }
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
}
