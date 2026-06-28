/* ============================================================
   Dugout Turf Arena — client data store
   ------------------------------------------------------------
   Reads are synchronous against an in-memory snapshot; mutations
   are async (they return promises).

   Two modes, chosen automatically:
   • If NEXT_PUBLIC_API_URL is set  -> talks to the FastAPI backend
                                       (real DB, multi-device).
   • If it is NOT set               -> persists to the browser
                                       (localStorage) so the app
                                       still runs with zero setup.
   The method names mirror the REST endpoints in /backend.
   ============================================================ */

const API = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const SERVER = !!API;
const KEY = 'dugout_turf_v2';

let snap = { grounds: [], bookings: [], blocks: {} };
let loaded = false;
let listeners = [];

// ---------- the two real grounds ----------
function baseGrounds() {
  return [
    { id: 'open', name: 'Open Arena', type: 'open', priceN: 2000, sports: ['Cricket', 'Football'], size: 'Open-air · Full-size turf', image: '/assets/dugout-1.jpeg', openHour: 0, closeHour: 24, removable: false },
    { id: 'box', name: 'Box Arena', type: 'box', priceN: 1000, sports: ['Box Cricket'], size: 'Covered · Roof netting', image: '/assets/dugout-3.jpeg', openHour: 0, closeHour: 24, removable: false },
  ];
}

function todayISO(off) {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  if (off) d.setDate(d.getDate() + off);
  return d.toISOString().slice(0, 10);
}

function priceFor(gid, data) {
  const g = (data.grounds || []).find((x) => x.id === gid);
  return g ? g.priceN : 0;
}

function mkBooking(b) {
  return {
    id: b.id || ('DGT' + (b.seq || Date.now())),
    ground: b.ground, customer: b.customer, phone: b.phone || '', email: b.email || '',
    dateISO: b.dateISO, hours: b.hours.slice().sort((a, c) => a - c),
    pay: b.pay || 'online', status: b.status || 'pending', proof: b.proof || null,
    amountN: b.amountN || 0, demo: !!b.demo, createdAt: b.createdAt || Date.now(),
  };
}

function seedBookings(data) {
  const t0 = todayISO(0), t1 = todayISO(1);
  const list = [
    mkBooking({ ground: 'box', customer: 'Arjun Mehta', phone: '+91 98765 43210', dateISO: t0, hours: [20], pay: 'online', status: 'pending', demo: true, seq: 1006 }),
    mkBooking({ ground: 'open', customer: 'Karthik Rao', phone: '+91 99887 76655', dateISO: t0, hours: [17, 18], pay: 'online', status: 'pending', demo: true, seq: 1005 }),
    mkBooking({ ground: 'box', customer: 'Priya Nair', phone: '+91 90123 45678', dateISO: t1, hours: [7], pay: 'turf', status: 'pending', demo: true, seq: 1004 }),
    mkBooking({ ground: 'open', customer: 'Rohan Das', phone: '+91 90909 80808', dateISO: t0, hours: [21], pay: 'online', status: 'approved', demo: true, seq: 1003 }),
    mkBooking({ ground: 'box', customer: 'Sahil Kapoor', phone: '+91 97000 11122', dateISO: t0, hours: [6], pay: 'turf', status: 'approved', demo: true, seq: 1002 }),
    mkBooking({ ground: 'open', customer: 'Neha Gupta', phone: '+91 96655 44332', dateISO: todayISO(-1), hours: [19], pay: 'online', status: 'rejected', demo: true, seq: 1001 }),
  ];
  list.forEach((b) => { b.amountN = b.hours.length * priceFor(data, data) || b.hours.length * priceFor(b.ground, data); });
  list.forEach((b) => { b.amountN = b.hours.length * priceFor(b.ground, data); });
  return list;
}

function freshLocal() {
  const data = { grounds: baseGrounds(), bookings: [], blocks: {}, seq: 1007 };
  data.bookings = seedBookings(data);
  return data;
}

// ---------- localStorage ----------
function loadLocal() {
  if (typeof window === 'undefined') return freshLocal();
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) {}
  if (!raw) { const f = freshLocal(); persistLocal(f); return f; }
  try {
    const d = JSON.parse(raw);
    if (!d.grounds) d.grounds = baseGrounds();
    if (!d.bookings) d.bookings = [];
    if (!d.blocks) d.blocks = {};
    if (!d.seq) d.seq = 1007;
    return d;
  } catch (e) { return freshLocal(); }
}
function persistLocal(d) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
}

function ensureLocal() {
  if (loaded || SERVER) return;
  snap = loadLocal();
  loaded = true;
}

function emit() { listeners.forEach((fn) => { try { fn(snap); } catch (e) {} }); }

// ---------- REST ----------
async function api(path, opts) {
  const res = await fetch(API + path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) throw new Error('API ' + res.status + ' on ' + path);
  return res.status === 204 ? null : res.json();
}

async function hydrateServer() {
  const [grounds, bookings, blocks] = await Promise.all([
    api('/api/grounds'), api('/api/bookings'), api('/api/blocks'),
  ]);
  const blockMap = {};
  (blocks || []).forEach((b) => { blockMap[b.ground + '|' + b.dateISO + '|' + b.hour] = true; });
  snap = { grounds: grounds || [], bookings: bookings || [], blocks: blockMap };
  emit();
}

// ============================================================
export const store = {
  KEY,
  mode: SERVER ? 'server' : 'local',

  subscribe(fn) { listeners.push(fn); return () => { listeners = listeners.filter((x) => x !== fn); }; },

  async hydrate() {
    if (SERVER) { try { await hydrateServer(); } catch (e) { console.error(e); } }
    else { ensureLocal(); emit(); }
  },

  get() { if (!SERVER) ensureLocal(); return snap; },
  grounds() { return store.get().grounds; },
  bookings() { return store.get().bookings; },

  // ---- slot helpers ----
  blockKey(gid, d, h) { return gid + '|' + d + '|' + h; },
  isBlocked(gid, d, h) { return !!store.get().blocks[store.blockKey(gid, d, h)]; },
  isBooked(gid, d, h, data) {
    data = data || store.get();
    return data.bookings.some((b) => b.ground === gid && b.dateISO === d && b.status !== 'rejected' && b.hours.indexOf(h) !== -1);
  },
  isAvailable(gid, d, h) {
    const data = store.get();
    if (data.blocks[store.blockKey(gid, d, h)]) return false;
    return !store.isBooked(gid, d, h, data);
  },

  // ---- bookings ----
  async createBooking(b) {
    if (SERVER) {
      const rec = await api('/api/bookings', { method: 'POST', body: JSON.stringify({ ground: b.ground, customer: b.customer, phone: b.phone, email: b.email, dateISO: b.dateISO, hours: b.hours, pay: b.pay, proof: b.proof || null }) });
      snap = { ...snap, bookings: [rec, ...snap.bookings] }; emit();
      return rec;
    }
    ensureLocal();
    const seq = snap.seq++;
    const rec = mkBooking({ seq, ...b, status: 'pending', demo: false });
    rec.amountN = rec.hours.length * priceFor(rec.ground, snap);
    snap.bookings.unshift(rec); persistLocal(snap); emit();
    return rec;
  },

  async setStatus(id, status) {
    if (SERVER) {
      const rec = await api('/api/bookings/' + id, { method: 'PATCH', body: JSON.stringify({ status }) });
      snap = { ...snap, bookings: snap.bookings.map((b) => (b.id === id ? rec : b)) }; emit();
      return rec;
    }
    ensureLocal();
    snap.bookings = snap.bookings.map((b) => (b.id === id ? { ...b, status } : b));
    persistLocal(snap); emit();
  },

  // ---- grounds ----
  async addGround(g) {
    if (SERVER) {
      await api('/api/grounds', { method: 'POST', body: JSON.stringify({ name: g.name, type: g.type, priceN: parseInt(g.priceN, 10) || 0, sports: g.sports || [], size: g.size || '', image: g.image || '' }) });
      return hydrateServer();
    }
    ensureLocal();
    const id = (g.type || 'turf') + '_' + (snap.seq++);
    snap.grounds.push({ id, name: g.name || 'New Arena', type: g.type || 'open', priceN: parseInt(g.priceN, 10) || 0, sports: (g.sports && g.sports.length) ? g.sports : ['Cricket'], size: g.size || (g.type === 'box' ? 'Covered · Roof netting' : 'Open-air · Full-size turf'), image: g.image || '/assets/dugout-2.jpeg', openHour: 0, closeHour: 24, removable: true });
    persistLocal(snap); emit();
  },

  async removeGround(id) {
    if (SERVER) { await api('/api/grounds/' + id, { method: 'DELETE' }); return hydrateServer(); }
    ensureLocal();
    snap.grounds = snap.grounds.filter((g) => g.id !== id);
    snap.bookings = snap.bookings.filter((b) => b.ground !== id);
    Object.keys(snap.blocks).forEach((k) => { if (k.indexOf(id + '|') === 0) delete snap.blocks[k]; });
    persistLocal(snap); emit();
  },

  // ---- slot blocks ----
  async toggleBlock(gid, d, h) {
    if (SERVER) { await api('/api/blocks/toggle', { method: 'POST', body: JSON.stringify({ ground: gid, dateISO: d, hour: h }) }); return hydrateServer(); }
    ensureLocal();
    const k = store.blockKey(gid, d, h);
    if (snap.blocks[k]) delete snap.blocks[k]; else snap.blocks[k] = true;
    persistLocal(snap); emit();
  },

  // ---- demo controls ----
  hasDemo() { return store.get().bookings.some((b) => b.demo); },
  async clearDemo() {
    if (SERVER) { await api('/api/bookings/demo', { method: 'DELETE' }); return hydrateServer(); }
    ensureLocal();
    snap.bookings = snap.bookings.filter((b) => !b.demo);
    persistLocal(snap); emit();
  },
  async seedDemo() {
    if (SERVER) return; // demo seeding for the server lives in backend/seed.py
    ensureLocal();
    if (snap.bookings.some((b) => b.demo)) return;
    snap.bookings = seedBookings(snap).concat(snap.bookings);
    persistLocal(snap); emit();
  },
  async resetAll() {
    if (SERVER) return hydrateServer();
    snap = freshLocal(); loaded = true; persistLocal(snap); emit();
  },
};

// keep tabs in sync (local mode)
if (typeof window !== 'undefined' && !SERVER) {
  window.addEventListener('storage', (e) => { if (e.key === KEY) { snap = loadLocal(); emit(); } });
}
