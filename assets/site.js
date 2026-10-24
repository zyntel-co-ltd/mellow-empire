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
let renderer = null;
try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch (e) { canvas.remove(); }

if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
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
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load('/assets/models/beats-mixr-red.glb', (g) => {
    const o = g.scene;
    // fit a 1 x 1 x 1 box first, then centre (centring before scaling leaves the model off to one side)
    let b = new THREE.Box3().setFromObject(o); const s = b.getSize(new THREE.Vector3());
    o.scale.multiplyScalar(1 / Math.max(s.x, s.y, s.z)); o.updateMatrixWorld(true);
    b = new THREE.Box3().setFromObject(o); o.position.sub(b.getCenter(new THREE.Vector3()));
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
    const size = m ? Math.min(visH * 0.4, visW * 0.8) : Math.min(visH * 0.76, visW * 0.44);
    pivot.scale.setScalar(size);
    pivot.position.set(m ? 0 : visW * 0.27, m ? visH * 0.27 : -visH * 0.02, 0);
    spin += (reduce ? 0 : 0.32) * dt;
    pivot.rotation.set(0.12, spin + drag, 0);
    if (hero.getBoundingClientRect().bottom > 0) renderer.render(scene, camera);
    requestAnimationFrame(frame);
  })();
}
