// Scroll behaviour: world (colour) switching, header logo variant, photo reveal + parallax.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sections = [...document.querySelectorAll('section[data-world]')];
const words = [...document.querySelectorAll('.bigword span')];
const logoImg = document.querySelector('header img');
// a crimson disc vanishes on crimson; white words vanish on light pages
const LOGO = { navy: 'crimson_disk_white', crimson: 'white_disk_white', gold: 'crimson_disk_ink', ivory: 'crimson_disk_ink' };
let world = '';
let ticking = false;

function setWorld(w, wd) {
  if (w !== world) {
    world = w;
    document.body.dataset.world = w;
    logoImg.src = `/images/logo/mellow-sounds/nav_${LOGO[w] || LOGO.navy}_64h.png`;
  }
  for (const el of words) el.classList.toggle('on', el.dataset.word === wd);
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

const parallax = [...document.querySelectorAll('[data-speed]')];
let pending = [...document.querySelectorAll('.reveal')];   // photos reveal as they enter
function frame() {
  const b = sectionAtMid();
  setWorld(b.dataset.world, b.dataset.word);
  if (!reduce) {
    const vh = innerHeight;
    for (const el of parallax) {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      const off = (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.speed);
      el.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0)`;
    }
  }
  pending = pending.filter((el) => {
    const r = el.getBoundingClientRect();
    if (reduce || (r.top < innerHeight * 0.88 && r.bottom > 0)) { el.classList.add('in'); return false; }
    return true;
  });
  ticking = false;
}
const tick = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
addEventListener('scroll', tick, { passive: true });
addEventListener('resize', tick);
frame();
