// Shared page behaviour (ENG-90): word and photo reveals, and the quote builder.
// The quote lives in localStorage ("mellow-quote"), so items added on /hire/ show up in the form on the home page.
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WHATSAPP = '256776156627';
  const EMAIL = 'mellowsounds256@gmail.com';

  // ---- words: headings rise in word by word ---------------------------------------------------------
  for (const el of document.querySelectorAll('.split')) {
    const words = [];
    (function walk(node) {
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
    })(el);
    words.forEach((w, i) => { w.style.transitionDelay = `${i * 60}ms`; });
  }

  // ---- reveal on scroll (rect checks, so it also works where observers are throttled) ----------------
  let pending = [...document.querySelectorAll('.split, .rise, .shot')];
  const sections = [...document.querySelectorAll('section[data-world]')];
  function onScroll() {
    const h = innerHeight;
    pending = pending.filter((el) => {
      const r = el.getBoundingClientRect();
      if (reduce || (r.top < h * 0.9 && r.bottom > 0)) { el.classList.add('in'); return false; }
      return true;
    });
    const mid = sections.find((s) => { const r = s.getBoundingClientRect(); return r.top <= h / 2 && r.bottom > h / 2; });
    if (mid && document.body.dataset.world !== mid.dataset.world) document.body.dataset.world = mid.dataset.world;
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  requestAnimationFrame(onScroll);

  // ---- quote store ------------------------------------------------------------------------------------
  const KEY = 'mellow-quote';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const write = (q) => { try { localStorage.setItem(KEY, JSON.stringify(q)); } catch (e) { /* private mode: keep in memory */ } memo = q; };
  let memo = read();
  const items = () => memo;
  const count = () => Object.values(memo).reduce((a, b) => a + b, 0);

  function setQty(name, qty) {
    const q = { ...memo };
    if (qty <= 0) delete q[name]; else q[name] = qty;
    write(q); render();
  }

  function render() {
    const n = count();
    document.querySelectorAll('[data-quote-count]').forEach((el) => { el.textContent = n ? `(${n})` : ''; });
    // add buttons on the hire page
    document.querySelectorAll('[data-add]').forEach((el) => {
      const q = memo[el.dataset.add] || 0;
      const card = el.closest('.item');
      if (card) card.classList.toggle('added', q > 0);
      const qtyEl = card && card.querySelector('[data-qty]');
      if (qtyEl) qtyEl.textContent = q;
    });
    // tray on the hire page
    const tray = document.querySelector('.tray');
    if (tray) { tray.hidden = n === 0; const t = tray.querySelector('[data-tray-text]'); if (t) t.textContent = `${n} item${n === 1 ? '' : 's'} in your quote`; }
    // list inside the quote form
    const list = document.querySelector('[data-quote-list]');
    if (list) {
      list.innerHTML = '';
      const names = Object.keys(memo);
      if (!names.length) list.innerHTML = '<li class="empty">No equipment added yet. <a href="/hire/">Browse equipment</a>, or just describe what you need below.</li>';
      for (const name of names) {
        const li = document.createElement('li');
        li.innerHTML = `<span>${name}</span><span class="qty"><button type="button" aria-label="One less">−</button><b>${memo[name]}</b><button type="button" aria-label="One more">+</button></span>`;
        const [minus, plus] = li.querySelectorAll('button');
        minus.onclick = () => setQty(name, memo[name] - 1);
        plus.onclick = () => setQty(name, memo[name] + 1);
        list.append(li);
      }
    }
  }

  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) { e.preventDefault(); const name = add.dataset.add; setQty(name, (memo[name] || 0) + 1); return; }
    const less = e.target.closest('[data-less]');
    if (less) { e.preventDefault(); const name = less.dataset.less; setQty(name, (memo[name] || 0) - 1); return; }
    // buttons that open the quote with an event type and services ticked
    const pre = e.target.closest('[data-prefill]');
    if (pre) {
      const form = document.querySelector('#quote-form');
      if (!form) return;                                   // other pages link to /#quote instead
      e.preventDefault();
      const [type, services] = pre.dataset.prefill.split('|');
      if (type) form.elements.type.value = type;
      (services || '').split(',').filter(Boolean).forEach((s) => {
        const box = form.querySelector(`input[name="services"][value="${s}"]`); if (box) box.checked = true;
      });
      document.querySelector('#quote').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    }
  });

  // ---- send the quote ------------------------------------------------------------------------------
  const form = document.querySelector('#quote-form');
  if (form) {
    const message = () => {
      const f = form.elements;
      const services = [...form.querySelectorAll('input[name="services"]:checked')].map((b) => b.value);
      const lines = ['Hello Mellow, I would like a quote.', ''];
      if (f.type.value) lines.push(`Event: ${f.type.value}`);
      if (f.date.value) lines.push(`Date: ${f.date.value}`);
      if (f.venue.value) lines.push(`Venue: ${f.venue.value}`);
      if (f.guests.value) lines.push(`Guests: about ${f.guests.value}`);
      if (services.length) lines.push(`Services: ${services.join(', ')}`);
      const names = Object.keys(memo);
      if (names.length) { lines.push('', 'Equipment:'); names.forEach((n) => lines.push(`- ${memo[n]} x ${n}`)); }
      if (f.notes.value.trim()) lines.push('', f.notes.value.trim());
      if (f.name.value) lines.push('', `Name: ${f.name.value}`);
      if (f.phone.value) lines.push(`Phone: ${f.phone.value}`);
      return lines.join('\n');
    };
    form.querySelector('[data-send="whatsapp"]').addEventListener('click', () => {
      window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message())}`, '_blank', 'noopener');
    });
    // "Send by email": the site emails the quote to Mellow (worker.js, /api/quote via Resend). If that fails,
    // fall back to the visitor's own email app so the request is never lost.
    const status = form.querySelector('[data-status]');
    const say = (text, bad) => { status.textContent = text; status.classList.toggle('bad', !!bad); status.hidden = !text; };
    form.querySelector('[data-send="email"]').addEventListener('click', async (e) => {
      const f = form.elements, btn = e.currentTarget;
      if (!f.name.value.trim() || f.phone.value.replace(/\D/g, '').length < 7) { say('Add your name and phone number so we can reply.', true); (f.name.value.trim() ? f.phone : f.name).focus(); return; }
      btn.disabled = true; say('Sending…');
      const body = {
        type: f.type.value, date: f.date.value, venue: f.venue.value, guests: f.guests.value, notes: f.notes.value,
        name: f.name.value, phone: f.phone.value, website: f.website.value,
        services: [...form.querySelectorAll('input[name="services"]:checked')].map((b) => b.value),
        equipment: Object.keys(memo).map((name) => ({ name, qty: memo[name] })),
      };
      try {
        const r = await fetch('/api/quote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(r.status);
        say('Sent. We will call or WhatsApp you on ' + f.phone.value.trim() + ' with a price.');
      } catch (err) {
        say('Could not send from the site, so your email app is opening with the quote instead.', true);
        location.href = `mailto:${EMAIL}?subject=${encodeURIComponent('Quote request')}&body=${encodeURIComponent(message())}`;
      } finally { btn.disabled = false; }
    });
    form.addEventListener('submit', (e) => e.preventDefault());
  }

  addEventListener('storage', (e) => { if (e.key === KEY) { memo = read(); render(); } });
  render();
})();
