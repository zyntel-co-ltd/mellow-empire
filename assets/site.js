import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// One stage, built from real gear models (Sketchfab, CC BY; credits on /about/#credits).
// Hero: red headphones fill the screen. Then each section adds gear while the camera moves in
// for a close shot of what is arriving. The last section shows the finished stage, lights on.
// Units are metres.
const canvas = document.getElementById('gl');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sections = [...document.querySelectorAll('section[data-scene]')];
const debugP = new URLSearchParams(location.search).get('p');   // ?p=1 builds everything (for checks)
let world = '';
function setWorld(w) { if (w !== world) { world = w; document.body.dataset.world = w; } }

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); }
catch (e) { document.body.classList.add('no-gl'); }

if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 300);

  // lighting: real gear is black, so it needs a key, a front fill and rim lights to read on white
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(8, 14, 12); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -4, near: 1, far: 50 });
  const fill = new THREE.DirectionalLight(0xffffff, 1.4); fill.position.set(-6, 5, 14);
  const rimL = new THREE.SpotLight(0xffe3ec, 120, 30, 0.6, 0.6); rimL.position.set(-8, 9, -6);
  const rimR = new THREE.SpotLight(0xe6ebff, 120, 30, 0.6, 0.6); rimR.position.set(8, 9, -6);
  scene.add(key, fill, rimL, rimR, rimL.target, rimR.target, new THREE.HemisphereLight(0xffffff, 0xe8e4dc, 0.9));

  const stage = new THREE.Group(); scene.add(stage);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.12 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; stage.add(floor);

  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const cache = {};
  const model = (name) => cache[name] || (cache[name] = new Promise((res, rej) => loader.load(`/assets/models/${name}.glb`, (g) => res(g.scene), undefined, rej)));

  // normalise a model to a real size (metres), grounded at y=0, centred on x/z, lit to read on white
  function fit(src, { height, width, rotY = 0, rotX = 0, rotZ = 0 }) {
    const o = src.clone(true);
    o.rotation.set(rotX, rotY, rotZ);
    o.updateMatrixWorld(true);
    let b = new THREE.Box3().setFromObject(o);
    const s = b.getSize(new THREE.Vector3());
    o.scale.multiplyScalar(height ? height / s.y : width / s.x);
    o.updateMatrixWorld(true);
    b = new THREE.Box3().setFromObject(o);
    const c = b.getCenter(new THREE.Vector3());
    o.position.x -= c.x; o.position.z -= c.z; o.position.y -= b.min.y;
    o.traverse((m) => {
      if (!m.isMesh) return;
      m.castShadow = m.receiveShadow = true;
      for (const mat of [].concat(m.material)) if (mat && 'envMapIntensity' in mat) mat.envMapIntensity = 1.8;
    });
    const wrap = new THREE.Group(); wrap.add(o);
    return wrap;
  }

  // ---- the build ------------------------------------------------------------------------------------
  // step = the section (data-scene) in which a piece arrives; d = delay inside that section (0..1)
  const pieces = [];
  const add = (holder, at, step, d, from, rot = [0, 0, 0], yaw = 0) => {
    holder.visible = false; stage.add(holder);
    const p = { holder, at: new THREE.Vector3(...at), step, d, from: new THREE.Vector3(...from), rot, yaw, k: 0 };
    pieces.push(p); return p;
  };
  const place = (name, opts, at, step, d, from, rot) => {
    const h = new THREE.Group();
    model(name).then((src) => h.add(fit(src, opts))).catch((e) => console.warn('model', name, e));
    return add(h, at, step, d, from, rot, opts.yaw || 0);
  };
  const block = (w, h, dpt, color) => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dpt), new THREE.MeshStandardMaterial({ color, roughness: 0.75 }));
    m.position.y = h / 2; m.castShadow = m.receiveShadow = true; g.add(m); return g;
  };

  const W = 8.4, D = 4.0, H = 1.0;            // stage deck: width, depth, height (a real mid-size stage)
  add(block(W, H, D, 0x1d1f27), [0, 0, 0], 1, 0, [0, -3, 0]);
  // goalpost truss: two 5 m towers (4 x 1.25 m segments) and a top span across the deck
  const SEG = 1.25, TX = W / 2 + 0.3, TZ = -D / 2 + 0.35;
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    place('truss-segment', { width: SEG, rotZ: Math.PI / 2 }, [side * TX, H + i * SEG, TZ], 2, 0.05 + i * 0.1, [side * 3, 7, 0], [0, 0, side * 0.7]);
  }
  const spanY = H + 4 * SEG;
  for (let i = 0; i < 7; i++) {
    const seg = (2 * TX) / 7;
    place('truss-segment', { width: seg }, [-TX + seg * (i + 0.5), spanY, TZ], 2, 0.5 + i * 0.06, [0, 5, -2], [0, 0.5, 0]);
  }
  // four moving heads under the span
  const heads = [];
  for (let i = 0; i < 4; i++) {
    const x = -W / 2 + 1.3 + i * ((W - 2.6) / 3);
    heads.push(place('moving-head', { height: 0.62, rotX: Math.PI }, [x, spanY - 0.08, TZ + 0.05], 3, 0.1 + i * 0.12, [0, 3.5, 0], [0, 1.4, 0]));
  }
  // main PA on the deck edges, tripod speakers in front of the stage
  place('stage-speaker', { height: 1.55, yaw: 0.3 }, [-W / 2 + 0.65, H, 0.2], 4, 0.05, [-5, 2, 2], [0, -1, 0]);
  place('stage-speaker', { height: 1.55, yaw: -0.3 }, [W / 2 - 0.65, H, 0.2], 4, 0.2, [5, 2, 2], [0, 1, 0]);
  place('speaker-tripod', { height: 2.1, yaw: 0.35 }, [-W / 2 - 1.2, 0, D / 2 + 0.8], 4, 0.45, [-4, 0, 4], [0, -1.2, 0]);
  place('speaker-tripod', { height: 2.1, yaw: -0.35 }, [W / 2 + 1.2, 0, D / 2 + 0.8], 4, 0.6, [4, 0, 4], [0, 1.2, 0]);
  // mic stands rise from the deck, then the Shure SM58 drops into the straight stand
  const MS = [1.5, H, 1.1];
  place('mic-stand', { height: 1.7 }, MS, 5, 0.05, [0, -2.2, 0]);
  place('shure-sm58', { width: 0.2, rotZ: Math.PI / 2 - 0.25 }, [MS[0] + 0.43, H + 1.44, MS[2]], 5, 0.45, [0.6, 2.4, 1.4], [0, 6, 0]);
  // monitors face the performers; the small mixer sits stage right
  place('monitor-wedge', { width: 0.62, yaw: Math.PI }, [-1.2, H, D / 2 - 0.45], 6, 0.05, [-3, 1.5, 3], [0, 0.8, 0]);
  place('monitor-wedge', { width: 0.62, yaw: Math.PI }, [1.4, H, D / 2 - 0.45], 6, 0.25, [3, 1.5, 3], [0, -0.8, 0]);
  add(block(0.7, 0.9, 0.5, 0x15161c), [3.3, H, 1.2], 6, 0.4, [0, -2, 0]);
  place('yamaha-mg06', { width: 0.3, yaw: -0.3 }, [3.3, H + 0.9, 1.2], 6, 0.65, [1.5, 2, 1.5], [0, 1, 0]);
  // DJ booth: table, CDJ-3000s + DJM-A9, Sony MDR-7506 headphones on top
  const BOOTH = [-1.0, H, -0.5];
  // the booth: black body, an animated LED front panel with the logo, and colour-cycling light strips
  const led = document.createElement('canvas'); led.width = 1024; led.height = 384;
  const lg = led.getContext('2d');
  const ledTex = new THREE.CanvasTexture(led); ledTex.colorSpace = THREE.SRGBColorSpace;
  const logoImg = new Image(); logoImg.src = '/images/logo/mellow-sounds/nav_white_disk_white_128h.png';
  const COLORS = ['#EB1B57', '#7C3AED', '#22D3EE', '#E2B04A'];
  function drawLed(t) {
    const w = led.width, h = led.height;
    lg.fillStyle = '#05060a'; lg.fillRect(0, 0, w, h);
    for (let i = 0; i < 48; i++) {               // equaliser bars sweeping through the brand colours
      const x = i * (w / 48);
      const v = 0.25 + 0.75 * Math.abs(Math.sin(t * 2.2 + i * 0.37) * Math.cos(t * 0.9 + i * 0.11));
      lg.fillStyle = COLORS[(i + Math.floor(t * 2)) % COLORS.length];
      lg.globalAlpha = 0.85; lg.fillRect(x + 3, h * (1 - v), w / 48 - 6, h * v);
    }
    lg.globalAlpha = 1;
    if (logoImg.complete && logoImg.naturalWidth) {
      const lh = h * 0.34, lw = lh * logoImg.naturalWidth / logoImg.naturalHeight;
      lg.fillStyle = 'rgba(5,6,10,.55)'; lg.fillRect((w - lw) / 2 - 24, (h - lh) / 2 - 16, lw + 48, lh + 32);
      lg.drawImage(logoImg, (w - lw) / 2, (h - lh) / 2, lw, lh);
    }
    ledTex.needsUpdate = true;
  }
  const booth = block(2.4, 1.0, 0.9, 0x0d0e12);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.86), new THREE.MeshBasicMaterial({ map: ledTex, toneMapped: false }));
  panel.position.set(0, 0.5, 0.452); booth.add(panel);
  const stripMat = new THREE.MeshBasicMaterial({ color: 0xEB1B57, toneMapped: false });
  for (const y of [0.02, 0.98]) { const st = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.03, 0.03), stripMat); st.position.set(0, y, 0.46); booth.add(st); }
  const boothGlow = new THREE.PointLight(0xEB1B57, 18, 6); boothGlow.position.set(0, 0.5, 1.4); booth.add(boothGlow);
  add(booth, BOOTH, 7, 0, [0, -2, 0]);
  place('cdj3000-djm-a9', { width: 2.2 }, [BOOTH[0], H + 1.0, BOOTH[2]], 7, 0.3, [0, 3, 0], [0, 0.5, 0]);
  place('sony-mdr-7506', { width: 0.24, rotX: -Math.PI / 2 + 0.2 }, [BOOTH[0] + 0.62, H + 1.12, BOOTH[2] + 0.12], 7, 0.65, [1, 2.5, 1.5], [0, 3, 0]);

  // beams from the moving heads: on for the concert section and the finished stage
  const BEAM_COLORS = [0xEB1B57, 0x22D3EE, 0x7C3AED, 0xE2B04A];
  const beamMats = heads.map((h, i) => new THREE.MeshBasicMaterial({ color: BEAM_COLORS[i], transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const beams = heads.map((h, i) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.0, 5.6, 40, 1, true), beamMats[i]);
    cone.position.set(h.at.x, h.at.y - 3.1, h.at.z + 0.7);
    stage.add(cone); return cone;
  });

  // hero headphones: red Beats Mixr, filling the screen in front of the camera
  const phones = new THREE.Group(); scene.add(phones);
  let phonesReady = false;
  model('beats-mixr-red').then((src) => { const o = fit(src, { height: 1 }); o.position.y -= 0.5; phones.add(o); phonesReady = true; });

  // ---- camera shots, one per section: [camera position, look-at] in stage space ---------------------
  const S = (px, py, pz, tx, ty, tz) => [new THREE.Vector3(px, py, pz), new THREE.Vector3(tx, ty, tz)];
  const SHOTS = [
    S(0, 7, 34, 0, 3, 0),              // 0 hero (stage empty; headphones fill the frame)
    S(12, 8, 24, -4.5, 2, 0),          // 1 what we do: deck rises (stage sits right of the cards)
    S(-11, 6.5, 19, 0, 3.4, 0),        // 2 staging: truss goes up
    S(1.5, 2.6, 11, 0, 5.2, -1.5),     // 3 concerts: looking up at the lights
    S(-8.5, 3.2, 9.5, -3.6, 1.9, 0.3), // 4 weddings: the main PA
    S(3.4, 2.6, 4.6, 1.8, 2.2, 1.1),   // 5 church: mic into the stand
    S(4.5, 3.2, 7.5, 1.6, 1.4, 1.4),   // 6 corporate: monitors and mixer
    S(-2.6, 3.3, 4.4, -0.9, 2.05, -0.5), // 7 DJ booth
    S(13, 8, 25, -4.5, 2.6, 0),        // 8 divisions (stage right of the cards)
    S(0, 3.1, 9.6, -3.6, 2.0, -0.5),    // 9 finale: the lit DJ booth in full view, stage and beams behind
  ];

  // ---- scroll -----------------------------------------------------------------------------------------
  const stepProgress = {};
  let f = 0;                                  // fractional section index, drives the camera
  function readScroll() {
    const vh = innerHeight, y = scrollY;
    const centres = sections.map((s) => s.offsetTop + s.offsetHeight / 2 - vh / 2);
    for (const s of sections) {
      const r = s.getBoundingClientRect();
      stepProgress[s.dataset.scene] = debugP ? 1 : Math.min(1, Math.max(0, (vh * 0.9 - r.top) / (vh * 0.9)));
    }
    let i = 0;
    while (i < centres.length - 1 && y > centres[i + 1]) i++;
    const span = (centres[i + 1] ?? centres[i] + 1) - centres[i];
    f = Math.min(sections.length - 1, i + Math.min(1, Math.max(0, (y - centres[i]) / span)));
    const mid = sections.find((s) => { const r = s.getBoundingClientRect(); return r.top <= vh / 2 && r.bottom > vh / 2; });
    if (mid) setWorld(mid.dataset.world);
  }
  addEventListener('scroll', readScroll, { passive: true });

  const mobile = () => innerWidth < 900;
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  }
  addEventListener('resize', () => { resize(); readScroll(); }); resize(); readScroll();
  let mx = 0, my = 0;
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });

  const ease = (k) => 1 - Math.pow(1 - k, 3);
  const smooth = (k) => k * k * (3 - 2 * k);
  const cPos = new THREE.Vector3(), cLook = new THREE.Vector3(), tPos = new THREE.Vector3(), tLook = new THREE.Vector3();
  const clock = new THREE.Clock(); let last = 0, first = true;

  function frame() {
    const t = clock.getElapsedTime();
    const dt = Math.min(t - last, 0.25); last = t;
    const L = (rate) => 1 - Math.exp(-rate * dt);
    const m = mobile();

    for (const p of pieces) {
      const sp = stepProgress[p.step] || 0;
      const target = reduce ? (sp > 0.2 ? 1 : 0) : Math.min(1, Math.max(0, (sp - p.d * 0.55) / 0.4));
      p.k += (target - p.k) * L(7);
      const e = ease(p.k);
      p.holder.visible = p.k > 0.002;
      p.holder.position.copy(p.at).addScaledVector(p.from, 1 - e);
      p.holder.rotation.set(p.rot[0] * (1 - e), p.yaw + p.rot[1] * (1 - e), p.rot[2] * (1 - e));
    }
    // disco: once the heads are hung their beams stay on, sweep, and swap colours with the beat
    const lightsOn = f > 2.6 || debugP;
    beamMats.forEach((bm, i) => {
      const pulse = 0.12 + 0.08 * Math.max(0, Math.sin(t * 3 + i * 1.7));
      bm.opacity += ((lightsOn ? pulse : 0) - bm.opacity) * L(3);
      bm.color.setHex(BEAM_COLORS[(i + Math.floor(t / 1.6)) % BEAM_COLORS.length]);
    });
    beams.forEach((b, i) => { b.rotation.z = (i - 1.5) * 0.16 + Math.sin(t * 0.9 + i * 1.3) * 0.28; b.rotation.x = Math.sin(t * 0.6 + i) * 0.18; });
    drawLed(t);
    const c = BEAM_COLORS[Math.floor(t / 1.6) % BEAM_COLORS.length];
    stripMat.color.setHex(c); boothGlow.color.setHex(c);

    // camera between the two nearest shots; phones pull the camera back so the frame fits
    const i = Math.floor(f), k = smooth(f - i), a = SHOTS[i], b = SHOTS[Math.min(i + 1, SHOTS.length - 1)];
    tLook.lerpVectors(a[1], b[1], k);
    tPos.lerpVectors(a[0], b[0], k);
    if (m) tPos.sub(tLook).multiplyScalar(1.55).add(tLook);
    tPos.x += mx * 0.8; tPos.y += -my * 0.5;
    if (first) { cPos.copy(tPos); cLook.copy(tLook); first = false; }
    cPos.lerp(tPos, L(3)); cLook.lerp(tLook, L(3));
    camera.position.copy(cPos).add(stage.position);
    camera.lookAt(cLook.clone().add(stage.position));
    // on phones, shift the picture up so the copy card has the lower half
    camera.setViewOffset(innerWidth, innerHeight, 0, m ? innerHeight * 0.2 : 0, innerWidth, innerHeight);

    // hero headphones: big and centred, turning slowly; they fly off as the stage starts
    if (phonesReady) {
      const out = ease(Math.min(1, f * 1.15));
      const fwd = camera.getWorldDirection(new THREE.Vector3());
      const right = new THREE.Vector3().crossVectors(fwd, camera.up).normalize();
      const dist = m ? 3.6 : 2.7;
      const pos = camera.position.clone().addScaledVector(fwd, dist)
        .addScaledVector(right, (m ? 0 : 0.78) + out * 2.5).addScaledVector(camera.up, (m ? 0.35 : 0) + out * 1.6);
      phones.position.lerp(pos, L(8));
      phones.scale.setScalar((m ? 1.15 : 1.45) * (1 - out * 0.6));
      phones.quaternion.copy(camera.quaternion);
      phones.rotateY(-0.45 + Math.sin(t * 0.35) * 0.18 + mx * 0.6 + out * 2);
      phones.rotateX(0.18 + my * 0.25);
      phones.visible = out < 0.98;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
}
