// Mellow Empire site worker: serves the static site, plus POST /api/quote, which emails a quote request
// to Mellow through Resend. Everything else goes straight to the static files (assets binding).
// Secret: RESEND_API_KEY (set with `npx wrangler secret put RESEND_API_KEY`, never in this repo).
// Sender: mellowempire.com (added to Resend; verified once its DNS records are in Cloudflare). Until Resend accepts
// that domain, the send is retried from zyntel.net (already verified), so no quote is lost either way.
const TO = 'dariusbuwembo@mellowempire.com';
const FROM = 'Mellow Empire website <website@mellowempire.com>';
const FALLBACK_FROM = 'Mellow Empire website <website@zyntel.net>';

const FIELDS = { type: 'Event', date: 'Date', venue: 'Venue', guests: 'Guests', services: 'Services', notes: 'Notes', name: 'Name', phone: 'Phone' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function quote(request, env) {
  let q;
  try { q = await request.json(); } catch (e) { return json({ error: 'bad request' }, 400); }
  if (!q || typeof q !== 'object') return json({ error: 'bad request' }, 400);
  if (q.website) return json({ ok: true });   // honeypot: real visitors never fill the hidden field
  const clip = (v, n) => String(v ?? '').trim().slice(0, n);
  const f = {};
  for (const k of Object.keys(FIELDS)) f[k] = clip(Array.isArray(q[k]) ? q[k].join(', ') : q[k], k === 'notes' ? 3000 : 200);
  const equipment = (Array.isArray(q.equipment) ? q.equipment : []).slice(0, 60)
    .map((e) => `${Math.max(1, Math.min(999, parseInt(e && e.qty, 10) || 1))} x ${clip(e && e.name, 120)}`).filter((l) => !/x $/.test(l));
  if (!f.name || !/\d{7,}/.test(f.phone.replace(/\D/g, ''))) return json({ error: 'Add your name and phone number so we can reply.' }, 422);
  if (!env.RESEND_API_KEY) return json({ error: 'not configured' }, 503);

  const rows = Object.entries(FIELDS).filter(([k]) => f[k]).map(([k, label]) => [label, f[k]]);
  const text = [...rows.map(([l, v]) => `${l}: ${v}`), ...(equipment.length ? ['', 'Equipment:', ...equipment.map((l) => `- ${l}`)] : [])].join('\n');
  const html = `<h2 style="font-family:sans-serif">Quote request from the website</h2>
<table style="font-family:sans-serif;border-collapse:collapse">${rows.map(([l, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">${esc(l)}</td><td style="padding:4px 0;white-space:pre-wrap">${esc(v)}</td></tr>`).join('')}</table>
${equipment.length ? `<p style="font-family:sans-serif"><b>Equipment</b></p><ul style="font-family:sans-serif">${equipment.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
<p style="font-family:sans-serif;color:#666">Reply by phone or WhatsApp: ${esc(f.phone)}</p>`;

  const subject = `Quote request: ${f.name}${f.type ? `, ${f.type}` : ''}${f.date ? `, ${f.date}` : ''}`;
  const send = (from) => fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: [TO], subject, text, html }),
  });
  let r = await send(FROM);
  if (r.status === 403 || r.status === 422) { console.log('primary sender refused', r.status, await r.text()); r = await send(FALLBACK_FROM); }
  if (!r.ok) { console.log('resend failed', r.status, await r.text()); return json({ error: 'send failed' }, 502); }
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/quote') {
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);
      return quote(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
