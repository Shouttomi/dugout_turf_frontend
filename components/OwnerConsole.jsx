'use client';

import { useState, useEffect, useRef } from 'react';
import { css } from '@/lib/style';
import { Hov, Raw } from '@/lib/ui';
import { useStore } from '@/lib/useStore';

const BRAND = 'Dugout Turf Arena';
const ROOT_VARS =
  '--bg:#eef2e7; --surface:#ffffff; --surface2:#f6f9f1; --turf:#15a34a; --turf-deep:#0e7a36; --lime:#b8e642; --ink:#0d1c12; --muted:#5d6d62; --line:#e4ebdd; --sky:#0284c7; --amber:#f59e0b; --rose:#e11d48; --shadow:rgba(14,42,24,.1); min-height:100vh; background:var(--bg); color:var(--ink); font-family:Plus Jakarta Sans,system-ui,sans-serif; display:flex;';

const TYPE_LABEL = { open: 'Open turf', box: 'Box turf' };
const TYPE_COLOR = { open: '#15a34a', box: '#0284c7' };
const AV = ['#0284c7', '#7c3aed', '#ea580c', '#15a34a', '#dc2626', '#0d9488', '#d97706', '#4f46e5'];

const fmt = (n) => '₹' + (n || 0).toLocaleString('en-IN');
const hr12 = (h) => (h % 12 === 0 ? 12 : h % 12);
const rangeShort = (a, b) => hr12(a) + '-' + hr12((b + 1) % 24);
const initials = (n) => n.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();
const svg = (ds, w = 18, sw = 2.1) => '<svg width="' + w + '" height="' + w + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round">' + (Array.isArray(ds) ? ds : [ds]).map((d) => '<path d="' + d + '"/>').join('') + '</svg>';

function dateList() {
  const dows = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const mons = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const base = new Date(); base.setHours(0, 0, 0, 0);
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(base); d.setDate(base.getDate() + i);
    out.push({ iso: d.toISOString().slice(0, 10), dow: i === 0 ? 'Today' : dows[d.getDay()], day: String(d.getDate()), full: (i === 0 ? 'Today, ' : '') + dows[d.getDay()] + ' ' + d.getDate() + ' ' + mons[d.getMonth()] });
  }
  return out;
}
function isoLabel(iso) {
  const hit = dateList().find((d) => d.iso === iso);
  if (hit) return hit.full;
  const d = new Date(iso + 'T00:00:00');
  const dows = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const mons = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return dows[d.getDay()] + ' ' + d.getDate() + ' ' + mons[d.getMonth()];
}
function timeRange(hours) {
  if (!hours.length) return '';
  const a = Math.min(...hours), b = Math.max(...hours);
  const f = (x) => { const ap = x < 12 ? 'AM' : 'PM'; return hr12(x) + ':00 ' + ap; };
  return f(a) + ' – ' + f((b + 1) % 24);
}
const payLabel = (b) => (b.pay === 'turf' ? 'Pay at turf' : 'Paid online');

const NAV = [
  ['dashboard', 'Dashboard', 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z'],
  ['bookings', 'Bookings', 'M9 11l3 3 8-8|M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'],
  ['schedule', 'Schedule', 'M8 2v4M16 2v4M3 10h18|M3 4h18v17H3z'],
  ['turfs', 'Grounds', 'M3 21h18M5 21V7l8-4v18M19 21V11l-6-4'],
  ['payments', 'Payments', 'M2 5h20v14H2z|M2 10h20'],
];

export default function OwnerConsole() {
  const store = useStore();
  const data = store.get();
  const grounds = data.grounds;
  const bookings = data.bookings;
  const groundById = {}; grounds.forEach((g) => { groundById[g.id] = g; });

  const [view, setView] = useState('dashboard');
  const [filter, setFilter] = useState('all');
  const [drawerId, setDrawerId] = useState(null);
  const [schDateISO, setSchDateISO] = useState(dateList()[0].iso);
  const [vw, setVw] = useState(1280);
  const [toast, setToast] = useState({ msg: null, type: 'success' });
  // add ground
  const [addOpen, setAddOpen] = useState(false);
  const [ng, setNg] = useState({ name: '', type: 'open', price: '2000', img: null });
  const ngFileRef = useRef(null);
  // walk-in
  const [walkOpen, setWalkOpen] = useState(false);
  const [wk, setWk] = useState({ groundId: null, slots: {}, name: '', phone: '', pay: 'cash' });
  // demo
  const [demoOpen, setDemoOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => { const r = () => setVw(window.innerWidth); r(); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r); }, []);
  const isMobile = vw < 860;

  const flash = (msg, type = 'success') => { setToast({ msg, type }); clearTimeout(flash._t); flash._t = setTimeout(() => setToast({ msg: null, type }), 2800); };

  const pending = bookings.filter((b) => b.status === 'pending');
  const approved = bookings.filter((b) => b.status === 'approved');
  const todayISO = dateList()[0].iso;
  const groundName = (id) => (groundById[id] && groundById[id].name) || 'Ground';
  const findCovering = (gid, h, dISO) => bookings.find((b) => b.ground === gid && b.dateISO === dISO && b.status !== 'rejected' && b.hours.indexOf(h) !== -1);

  const approve = async (id, who) => { await store.setStatus(id, 'approved'); flash('Approved · ' + who + ' confirmed'); };
  const reject = async (id) => { await store.setStatus(id, 'rejected'); flash('Request rejected', 'reject'); };

  const statusStyle = (st) => {
    const base = 'font-weight:800; font-size:11px; text-transform:uppercase; letter-spacing:.05em; padding:6px 11px; border-radius:99px; white-space:nowrap;';
    if (st === 'approved') return base + ' background:#daf0e2; color:var(--turf-deep);';
    if (st === 'rejected') return base + ' background:#fbdde4; color:var(--rose);';
    return base + ' background:#fdeccf; color:#b45309;';
  };
  const stLabel = { approved: 'Confirmed', rejected: 'Rejected', pending: 'Pending' };
  const titles = {
    dashboard: ['Console overview', BRAND + ' · live requests, schedule & revenue'],
    bookings: ['Bookings', 'Review requests, see payment proof, approve or reject'],
    schedule: ['Slot manager', 'Open or close 1-hour slots per ground'],
    turfs: ['Your grounds', 'Add or remove grounds and set pricing'],
    payments: ['Payments', 'Revenue from confirmed bookings'],
  };

  const navTo = (k) => { setView(k); setDrawerId(null); };
  const navBtn = (k, label, d, active) => (
    <button key={k} onClick={() => navTo(k)} style={css('cursor:pointer; width:100%; display:flex; align-items:center; justify-content:space-between; padding:11px 13px; border-radius:12px; font-weight:800; font-size:14px; border:none; text-align:left; ' + (active ? 'background:rgba(21,163,74,.13); color:#0e7a36; box-shadow:inset 3px 0 0 #15a34a;' : 'background:transparent; color:#5d6d62;'))}>
      <span style={css('display:flex; align-items:center; gap:12px;')}><Raw html={svg(d.split('|'), 19)} /><span>{label}</span></span>
      {k === 'bookings' && pending.length > 0 && <span style={css('background:var(--rose); color:#fff; font-size:10.5px; font-weight:800; min-width:19px; height:19px; padding:0 6px; border-radius:99px; display:flex; align-items:center; justify-content:center;')}>{pending.length}</span>}
    </button>
  );

  const db = bookings.find((b) => b.id === drawerId);

  // ---- walk-in derived ----
  const wkGroundId = wk.groundId || (grounds[0] && grounds[0].id);
  const wkGround = groundById[wkGroundId] || grounds[0] || {};
  const wkSel = Object.keys(wk.slots).filter((k) => wk.slots[k]).map(Number).sort((a, b) => a - b);
  const wkTotalN = wkSel.length * (wkGround.priceN || 0);
  const ngInput = 'width:100%; border:1px solid var(--line); background:var(--surface2); border-radius:10px; padding:11px 13px; font-family:inherit; font-size:15px; font-weight:600; color:var(--ink); outline:none;';

  const submitWalkin = async () => {
    if (!wkSel.length) { flash('Pick at least one slot', 'reject'); return; }
    const rec = await store.createBooking({ ground: wkGroundId, customer: wk.name.trim() || 'Walk-in', phone: wk.phone.trim(), email: '', dateISO: schDateISO, hours: wkSel, pay: wk.pay === 'upi' ? 'online' : 'turf', proof: null });
    await store.setStatus(rec.id, 'approved');
    flash('Walk-in booking confirmed');
    setWalkOpen(false);
  };
  const onNgFile = (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => setNg((s) => ({ ...s, img: r.result })); r.readAsDataURL(f); };
  const submitGround = async () => {
    if (!ng.name.trim()) { flash('Give the ground a name', 'reject'); return; }
    if (!ng.price) { flash('Set a price per hour', 'reject'); return; }
    await store.addGround({ name: ng.name.trim(), type: ng.type, priceN: ng.price, image: ng.img, sports: ng.type === 'box' ? ['Box Cricket'] : ['Cricket', 'Football'] });
    flash('Ground added'); setAddOpen(false);
  };

  if (!mounted) return <div style={css(ROOT_VARS)} />;
  return (
    <div style={css(ROOT_VARS)}>
      <input ref={ngFileRef} type="file" accept="image/*" onChange={onNgFile} style={{ display: 'none' }} />

      {/* SIDEBAR */}
      {!isMobile && (
        <aside style={css('width:248px; flex-shrink:0; background:var(--surface); border-right:1px solid var(--line); height:100vh; position:sticky; top:0; display:flex; flex-direction:column; padding:20px 16px;')}>
          <div style={css('padding:6px 6px 16px;')}>
            <img src="/assets/dugout-logo.png" alt={BRAND} style={css('width:100%; display:block;')} />
            <div style={css('font-size:10px; font-weight:800; color:var(--muted); letter-spacing:.16em; text-transform:uppercase; margin-top:6px; text-align:center;')}>Owner Console</div>
          </div>
          <nav style={css('display:flex; flex-direction:column; gap:3px; flex:1;')}>
            {NAV.map(([k, label, d]) => navBtn(k, label, d, view === k))}
          </nav>
          <div style={css('border-top:1px solid var(--line); padding-top:14px; margin-top:8px;')}>
            <Hov as="button" onClick={() => setDemoOpen(true)} s="cursor:pointer; width:100%; display:flex; align-items:center; gap:10px; border:1px solid var(--line); background:var(--surface2); color:var(--ink); font-family:inherit; font-weight:700; font-size:12.5px; padding:10px 12px; border-radius:11px; margin-bottom:8px;" hover="background:var(--bg);"><Raw html={svg(['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'], 16)} />{store.hasDemo() ? 'Clear demo data' : 'Demo data'}</Hov>
            <Hov as="a" href="/" s="display:flex; align-items:center; gap:10px; text-decoration:none; color:var(--muted); font-weight:700; font-size:13px; padding:10px 12px; border-radius:11px;" hover="background:var(--surface2); color:var(--ink);"><Raw html={svg(['M15 3h6v6', 'M21 3l-9 9', 'M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5'], 17)} />View public page</Hov>
          </div>
        </aside>
      )}

      {/* MAIN */}
      <main style={css('flex:1; min-width:0; display:flex; flex-direction:column; height:100vh; overflow:hidden;')}>
        <header style={css('flex-shrink:0; background:rgba(238,242,231,.8); backdrop-filter:blur(12px); border-bottom:1px solid var(--line); padding:14px clamp(16px,3vw,30px); display:flex; align-items:center; justify-content:space-between; gap:14px;')}>
          <div style={css('min-width:0;')}>
            <h1 style={css('font-family:Outfit; font-weight:900; font-size:clamp(19px,2.4vw,25px); letter-spacing:-.02em; margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{titles[view][0]}</h1>
            <p style={css('font-size:12px; color:var(--muted); font-weight:600; margin:2px 0 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{titles[view][1]}</p>
          </div>
          <div style={css('display:flex; align-items:center; gap:10px; flex-shrink:0;')}>
            <span style={css('display:flex; align-items:center; gap:7px; background:var(--surface); border:1px solid var(--line); border-radius:99px; padding:7px 13px; font-size:12px; font-weight:700; color:var(--turf-deep);')}><span style={css('width:8px; height:8px; border-radius:50%; background:var(--turf);')} />Live · {store.mode}</span>
            <div style={css('width:42px; height:42px; border-radius:12px; background:linear-gradient(145deg,#0284c7,#0369a1); color:#fff; display:flex; align-items:center; justify-content:center; font-family:Outfit; font-weight:800; font-size:15px;')}>DT</div>
          </div>
        </header>

        <div style={css('flex:1; overflow-y:auto; padding:clamp(16px,3vw,28px) clamp(16px,3vw,30px) 100px;')}>
          {view === 'dashboard' && <Dashboard {...{ store, grounds, bookings, pending, approved, todayISO, groundName, findCovering, statusStyle, stLabel, isoLabel, timeRange, AV, approve, reject, setDrawerId, setView }} />}
          {view === 'bookings' && <Bookings {...{ bookings, pending, approved, filter, setFilter, groundName, statusStyle, stLabel, isoLabel, timeRange, payLabel, AV, setDrawerId }} />}
          {view === 'schedule' && <Schedule {...{ store, grounds, data, schDateISO, setSchDateISO, findCovering, setDrawerId, setWalkOpen, setWk, flash }} />}
          {view === 'turfs' && <Grounds {...{ store, grounds, bookings, setAddOpen, setNg, setView, flash }} />}
          {view === 'payments' && <Payments {...{ approved, pending, groundName, isoLabel, payLabel }} />}
        </div>
      </main>

      {/* MOBILE NAV */}
      {isMobile && (
        <div style={css('position:fixed; left:0; right:0; bottom:0; z-index:50; background:rgba(255,255,255,.95); backdrop-filter:blur(12px); border-top:1px solid var(--line); display:flex; justify-content:space-around; padding:8px 6px;')}>
          {NAV.map(([k, label, d]) => (
            <button key={k} onClick={() => navTo(k)} style={css('cursor:pointer; flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; padding:6px 2px; border:none; background:transparent; ' + (view === k ? 'color:var(--turf-deep);' : 'color:var(--muted);'))}>
              <span style={css('position:relative;')}><Raw html={svg(d.split('|'), 21)} />{k === 'bookings' && pending.length > 0 && <span style={css('position:absolute; top:-6px; right:-9px; background:var(--rose); color:#fff; font-size:9px; font-weight:800; min-width:15px; height:15px; padding:0 4px; border-radius:99px; display:flex; align-items:center; justify-content:center;')}>{pending.length}</span>}</span>
              <span style={css('font-size:10px; font-weight:800;')}>{label === 'Dashboard' ? 'Home' : label === 'Schedule' ? 'Slots' : label}</span>
            </button>
          ))}
        </div>
      )}

      {/* DRAWER */}
      {db && <Drawer {...{ db, groundById, groundName, isoLabel, timeRange, statusStyle, stLabel, payLabel, AV, fmt, BRAND, setDrawerId, approve, reject, store, flash }} />}

      {/* ADD GROUND MODAL */}
      {addOpen && (
        <Modal onClose={() => setAddOpen(false)} title="Add a ground">
          <label style={css('display:block; font-size:11.5px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin-bottom:7px;')}>Ground name</label>
          <input value={ng.name} onChange={(e) => setNg({ ...ng, name: e.target.value })} placeholder="e.g. Open Arena 2" style={css(ngInput)} />
          <div style={css('display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:14px;')}>
            <div>
              <label style={css('display:block; font-size:11.5px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin-bottom:7px;')}>Type</label>
              <div style={css('display:flex; gap:7px;')}>
                {[['open', 'Open turf'], ['box', 'Box turf']].map(([k, l]) => (
                  <button key={k} onClick={() => setNg({ ...ng, type: k, price: ng.price || (k === 'open' ? '2000' : '1000') })} style={css('cursor:pointer; flex:1; padding:9px 4px; border-radius:9px; font-family:inherit; font-weight:800; font-size:12.5px; ' + (ng.type === k ? 'background:linear-gradient(145deg,var(--turf),var(--turf-deep)); color:#fff; border:1px solid var(--turf-deep);' : 'background:var(--surface2); color:var(--ink); border:1px solid var(--line);'))}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={css('display:block; font-size:11.5px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin-bottom:7px;')}>Price / hour (₹)</label>
              <input value={ng.price} onChange={(e) => setNg({ ...ng, price: e.target.value.replace(/[^0-9]/g, '') })} placeholder="2000" inputMode="numeric" style={css(ngInput)} />
            </div>
          </div>
          <button onClick={() => ngFileRef.current && ngFileRef.current.click()} style={css('cursor:pointer; width:100%; margin-top:14px; border:1.5px dashed var(--line); background:var(--surface2); border-radius:12px; padding:16px; display:flex; align-items:center; justify-content:center; gap:10px; font-family:inherit; font-weight:700; font-size:13px; color:var(--ink);')}>
            {ng.img && <img src={ng.img} alt="" style={css('width:40px; height:40px; border-radius:8px; object-fit:cover;')} />}
            <span>{ng.img ? 'Change photo' : 'Upload a ground photo (optional)'}</span>
          </button>
          <button onClick={submitGround} style={css('cursor:pointer; width:100%; margin-top:18px; border:none; background:linear-gradient(145deg,var(--turf),var(--turf-deep)); color:#fff; font-family:Outfit; font-weight:800; font-size:15px; padding:14px; border-radius:12px;')}>Add ground</button>
        </Modal>
      )}

      {/* WALK-IN MODAL */}
      {walkOpen && (
        <Modal onClose={() => setWalkOpen(false)} title="Book a walk-in slot" wide>
          <p style={css('font-size:12.5px; color:var(--muted); font-weight:600; line-height:1.5; margin:0 0 18px;')}>For customers booking in person or by phone. Confirmed instantly for <b style={css('color:var(--ink);')}>{isoLabel(schDateISO)}</b>.</p>
          <Lbl>Ground</Lbl>
          <div style={css('display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;')}>
            {grounds.map((g) => (
              <button key={g.id} onClick={() => setWk({ ...wk, groundId: g.id, slots: {} })} style={css('cursor:pointer; padding:9px 13px; border-radius:10px; font-family:inherit; font-weight:800; font-size:12.5px; ' + (g.id === wkGroundId ? 'background:linear-gradient(145deg,var(--turf),var(--turf-deep)); color:#fff; border:1px solid var(--turf-deep);' : 'background:var(--surface2); color:var(--ink); border:1px solid var(--line);'))}>{g.name} · {fmt(g.priceN)}/hr</button>
            ))}
          </div>
          <Lbl>Pick 1-hour slots</Lbl>
          <div style={css('display:grid; grid-template-columns:repeat(6,1fr); gap:6px;')}>
            {Array.from({ length: 24 }, (_, h) => {
              const avail = store.isAvailable(wkGroundId, schDateISO, h);
              const picked = !!wk.slots[h];
              let st = 'padding:9px 2px; border-radius:8px; font-family:inherit; font-weight:700; font-size:11px;';
              if (!avail) st += ' background:var(--surface2); color:var(--line); border:1px solid var(--line); cursor:not-allowed; text-decoration:line-through;';
              else if (picked) st += ' background:linear-gradient(145deg,var(--turf),var(--turf-deep)); color:#fff; border:1px solid var(--turf-deep); cursor:pointer;';
              else st += ' background:var(--surface); color:var(--ink); border:1px solid var(--line); cursor:pointer;';
              return <button key={h} onClick={() => avail ? setWk((w) => { const m = { ...w.slots }; if (m[h]) delete m[h]; else m[h] = true; return { ...w, slots: m }; }) : flash('That slot is taken', 'reject')} style={css(st)}>{rangeShort(h, h)}</button>;
            })}
          </div>
          <div style={css('font-size:11.5px; color:var(--turf-deep); font-weight:700; margin:9px 0 16px;')}>{wkSel.length ? wkSel.length + ' slot(s) · ' + fmt(wkTotalN) : 'Tap the hours to book'}</div>
          <div style={css('display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;')}>
            <div><Lbl>Customer name</Lbl><input value={wk.name} onChange={(e) => setWk({ ...wk, name: e.target.value })} placeholder="Walk-in" style={css(ngInput)} /></div>
            <div><Lbl>Phone (optional)</Lbl><input value={wk.phone} onChange={(e) => setWk({ ...wk, phone: e.target.value })} placeholder="Mobile" inputMode="tel" style={css(ngInput)} /></div>
          </div>
          <Lbl>Payment</Lbl>
          <div style={css('display:flex; gap:7px; margin-bottom:20px;')}>
            {[['cash', 'Cash'], ['upi', 'UPI'], ['later', 'Pay later']].map(([k, l]) => (
              <button key={k} onClick={() => setWk({ ...wk, pay: k })} style={css('cursor:pointer; flex:1; padding:10px 4px; border-radius:9px; font-family:inherit; font-weight:800; font-size:12.5px; ' + (wk.pay === k ? 'background:var(--ink); color:#fff; border:1px solid var(--ink);' : 'background:var(--surface2); color:var(--ink); border:1px solid var(--line);'))}>{l}</button>
            ))}
          </div>
          <div style={css('display:flex; align-items:center; justify-content:space-between; gap:14px;')}>
            <div style={css('font-size:13px; font-weight:700; color:var(--muted);')}>Total <span style={css('font-family:Outfit; font-weight:900; font-size:19px; color:var(--turf-deep); margin-left:4px;')}>{fmt(wkTotalN)}</span></div>
            <button onClick={submitWalkin} style={css('cursor:pointer; border:none; background:linear-gradient(145deg,var(--turf),var(--turf-deep)); color:#fff; font-family:Outfit; font-weight:800; font-size:14.5px; padding:13px 22px; border-radius:12px; display:flex; align-items:center; gap:7px;')}><Raw html={svg(['M20 6 9 17l-5-5'], 16, 3)} />Confirm booking</button>
          </div>
        </Modal>
      )}

      {/* DEMO MENU */}
      {demoOpen && (
        <Modal onClose={() => setDemoOpen(false)} title="Demo data">
          <p style={css('font-size:13.5px; color:var(--muted); font-weight:500; line-height:1.5; margin:0 0 20px;')}>The console ships with example bookings so you can see how it works. Clear them to start taking real bookings. Your real customer bookings are never touched.</p>
          <div style={css('display:flex; flex-direction:column; gap:10px;')}>
            <button onClick={async () => { await store.clearDemo(); flash('Demo bookings cleared'); setDemoOpen(false); }} style={css('cursor:pointer; width:100%; border:none; background:var(--rose); color:#fff; font-family:Outfit; font-weight:800; font-size:14.5px; padding:13px; border-radius:12px;')}>Clear demo bookings</button>
            <button onClick={async () => { await store.seedDemo(); flash('Demo bookings added'); setDemoOpen(false); }} style={css('cursor:pointer; width:100%; border:1px solid var(--line); background:var(--surface2); color:var(--ink); font-family:Outfit; font-weight:800; font-size:14.5px; padding:13px; border-radius:12px;')}>Re-add demo bookings</button>
            <button onClick={async () => { await store.resetAll(); flash('Everything reset'); setDemoOpen(false); }} style={css('cursor:pointer; width:100%; border:1px solid var(--line); background:transparent; color:var(--muted); font-family:inherit; font-weight:700; font-size:12.5px; padding:10px; border-radius:11px;')}>Reset everything (grounds + bookings)</button>
          </div>
        </Modal>
      )}

      {toast.msg && (
        <div style={css('position:fixed; left:50%; bottom:26px; transform:translateX(-50%); z-index:95; background:var(--ink); color:#fff; padding:13px 19px; border-radius:13px; box-shadow:0 20px 40px -14px rgba(13,40,22,.6); display:flex; align-items:center; gap:11px; font-weight:700; font-size:13.5px; animation:erpToast .35s ease both; max-width:90vw;')}>
          <span style={css('width:28px; height:28px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; background:' + (toast.type === 'reject' ? 'var(--rose)' : 'var(--turf)') + ';')}><Raw html={svg([toast.type === 'reject' ? 'M18 6 6 18M6 6l12 12' : 'M20 6 9 17l-5-5'], 16, 3)} /></span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function Lbl({ children }) {
  return <label style={css('display:block; font-size:11.5px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin-bottom:8px;')}>{children}</label>;
}

function Modal({ title, onClose, wide, children }) {
  return (
    <div onClick={onClose} style={css('position:fixed; inset:0; z-index:85; background:rgba(13,28,18,.45); backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center; padding:20px; animation:erpFade .2s ease both;')}>
      <div onClick={(e) => e.stopPropagation()} style={css('background:var(--surface); border-radius:20px; padding:24px; width:100%; max-height:92vh; overflow-y:auto; box-shadow:0 30px 60px -20px rgba(13,40,22,.5); max-width:' + (wide ? '470px' : '420px') + ';')}>
        <div style={css('display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;')}>
          <h3 style={css('font-family:Outfit; font-weight:900; font-size:19px; margin:0;')}>{title}</h3>
          <button onClick={onClose} style={css('cursor:pointer; border:none; background:var(--surface2); width:32px; height:32px; border-radius:9px; display:flex; align-items:center; justify-content:center; color:var(--ink);')}><Raw html={svg(['M18 6 6 18M6 6l12 12'], 15, 2.4)} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------- DASHBOARD ---------------- */
function Dashboard({ store, grounds, bookings, pending, approved, todayISO, groundName, statusStyle, stLabel, isoLabel, timeRange, AV, approve, reject, setDrawerId, setView }) {
  const revenue = approved.reduce((a, b) => a + b.amountN, 0);
  const todayCount = bookings.filter((b) => b.dateISO === todayISO && b.status !== 'rejected').length;
  const stats = [
    ['Pending requests', String(pending.length), '#f59e0b', '#fdeccf', 'Needs your approval'],
    ["Today's bookings", String(todayCount), '#15a34a', '#d8f0e0', 'Across both grounds'],
    ['Confirmed revenue', fmt(revenue), '#0284c7', '#d4ebf7', 'From approved bookings'],
    ['Grounds', String(grounds.length), '#7c3aed', '#e9ddfb', 'Open 24 × 7'],
  ];
  return (
    <div>
      <div style={css('display:grid; grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr)); gap:16px; margin-bottom:22px;')}>
        {stats.map((s) => (
          <div key={s[0]} style={css('background:var(--surface); border:1px solid var(--line); border-radius:18px; padding:18px 19px; box-shadow:0 8px 22px -16px var(--shadow); position:relative; overflow:hidden;')}>
            <div style={{ ...css('position:absolute; top:0; left:0; width:4px; height:100%;'), background: s[2] }} />
            <div style={css('font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.08em; color:var(--muted);')}>{s[0]}</div>
            <div style={css('font-family:Outfit; font-weight:900; font-size:30px; letter-spacing:-.02em; margin-top:8px;')}>{s[1]}</div>
            <div style={css('font-size:11.5px; font-weight:600; color:var(--muted); margin-top:12px;')}>{s[4]}</div>
          </div>
        ))}
      </div>
      <div style={css('background:var(--surface); border:1px solid var(--line); border-radius:20px; box-shadow:0 10px 26px -18px var(--shadow); overflow:hidden;')}>
        <div style={css('padding:18px 20px; border-bottom:1px solid var(--line); display:flex; align-items:center; justify-content:space-between;')}>
          <h3 style={css('font-family:Outfit; font-weight:800; font-size:16px; margin:0;')}>Action needed</h3>
          <span style={css('font-size:12px; font-weight:800; color:var(--muted);')}>{pending.length} requests</span>
        </div>
        {pending.length === 0 && <div style={css('padding:34px 20px; text-align:center; color:var(--muted);')}><div style={css('font-weight:800; font-size:14px; color:var(--ink);')}>All caught up 🎉</div><div style={css('font-size:12.5px; margin-top:4px;')}>No pending requests right now.</div></div>}
        {pending.slice(0, 6).map((b) => (
          <div key={b.id} onClick={() => setDrawerId(b.id)} style={css('cursor:pointer; padding:15px 20px; border-bottom:1px solid var(--line); display:flex; align-items:center; gap:13px; flex-wrap:wrap;')}>
            <div style={{ ...css('width:42px; height:42px; border-radius:12px; color:#fff; display:flex; align-items:center; justify-content:center; font-family:Outfit; font-weight:800; font-size:15px; flex-shrink:0;'), background: AV[b.customer.length % AV.length] }}>{initials(b.customer)}</div>
            <div style={css('flex:1; min-width:140px;')}><div style={css('font-weight:800; font-size:14px;')}>{b.customer}</div><div style={css('font-size:12px; color:var(--muted); font-weight:600; margin-top:2px;')}>{groundName(b.ground)} · {isoLabel(b.dateISO)} · {timeRange(b.hours)}</div></div>
            {b.proof && <span style={css('display:flex; align-items:center; gap:5px; font-size:11px; font-weight:700; color:var(--turf-deep); background:#d8f0e0; padding:5px 9px; border-radius:8px;')}><Raw html={svg(['M3 3h18v18H3z'], 13, 2.2)} />Proof</span>}
            <div style={css('display:flex; align-items:center; gap:7px;')} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => reject(b.id)} style={css('cursor:pointer; height:36px; padding:0 12px; border-radius:10px; border:1px solid #f3c2cd; background:#fceef1; color:var(--rose); font-weight:800; font-size:13px;')}><Raw html={svg(['M18 6 6 18M6 6l12 12'], 15, 2.6)} /></button>
              <button onClick={() => approve(b.id, b.customer)} style={css('cursor:pointer; height:36px; padding:0 14px; border-radius:10px; border:none; background:linear-gradient(145deg,var(--turf),var(--turf-deep)); color:#fff; font-weight:800; font-size:13px; display:flex; align-items:center; gap:6px;')}><Raw html={svg(['M20 6 9 17l-5-5'], 15, 3)} />Approve</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- BOOKINGS ---------------- */
function Bookings({ bookings, pending, approved, filter, setFilter, groundName, statusStyle, stLabel, isoLabel, timeRange, payLabel, AV, setDrawerId }) {
  const counts = { all: bookings.length, pending: pending.length, approved: approved.length, rejected: bookings.filter((b) => b.status === 'rejected').length };
  const filtered = bookings.filter((b) => filter === 'all' || b.status === filter);
  return (
    <div>
      <div style={css('display:flex; gap:8px; margin-bottom:18px; overflow-x:auto; padding-bottom:4px;')}>
        {[['all', 'All'], ['pending', 'Pending'], ['approved', 'Confirmed'], ['rejected', 'Rejected']].map(([k, l]) => {
          const active = filter === k;
          return <button key={k} onClick={() => setFilter(k)} style={css('cursor:pointer; display:flex; align-items:center; gap:8px; white-space:nowrap; padding:10px 16px; border-radius:12px; font-weight:800; font-size:13.5px; border:1px solid var(--line); ' + (active ? 'background:var(--ink); color:#fff; border-color:var(--ink);' : 'background:var(--surface); color:var(--ink);'))}><span>{l}</span><span style={css('font-size:11px; font-weight:800; padding:2px 7px; border-radius:99px; ' + (active ? 'background:rgba(255,255,255,.2);' : 'background:var(--surface2); color:var(--muted);'))}>{counts[k]}</span></button>;
        })}
      </div>
      <div style={css('background:var(--surface); border:1px solid var(--line); border-radius:20px; box-shadow:0 10px 26px -18px var(--shadow); overflow:hidden;')}>
        {filtered.length === 0 && <div style={css('padding:46px 20px; text-align:center; color:var(--muted); font-weight:700; font-size:13.5px;')}>No bookings in this filter.</div>}
        {filtered.map((b) => (
          <div key={b.id} onClick={() => setDrawerId(b.id)} style={css('cursor:pointer; padding:16px 20px; border-bottom:1px solid var(--line); display:flex; align-items:center; gap:14px; flex-wrap:wrap;')}>
            <div style={{ ...css('width:44px; height:44px; border-radius:12px; color:#fff; display:flex; align-items:center; justify-content:center; font-family:Outfit; font-weight:800; font-size:15px; flex-shrink:0;'), background: AV[b.customer.length % AV.length] }}>{initials(b.customer)}</div>
            <div style={css('flex:1; min-width:150px;')}><div style={css('display:flex; align-items:center; gap:8px;')}><span style={css('font-weight:800; font-size:14.5px;')}>{b.customer}</span><span style={css('font-size:11px; color:var(--muted); font-weight:700; font-family:Outfit;')}>{b.id}</span></div><div style={css('font-size:12.5px; color:var(--muted); font-weight:600; margin-top:3px;')}>{groundName(b.ground)} · {b.phone || 'No phone'}</div></div>
            <div style={css('min-width:130px;')}><div style={css('font-weight:800; font-size:13px;')}>{isoLabel(b.dateISO)}</div><div style={css('font-size:12px; color:var(--muted); font-weight:600; margin-top:2px;')}>{timeRange(b.hours)}</div></div>
            <div style={css('min-width:90px; text-align:right;')}><div style={css('font-family:Outfit; font-weight:900; font-size:16px; color:var(--turf-deep);')}>{fmt(b.amountN)}</div><div style={css('font-size:11px; font-weight:700; color:var(--muted);')}>{payLabel(b)}</div></div>
            <span style={css(statusStyle(b.status))}>{stLabel[b.status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- SCHEDULE (slot manager) ---------------- */
function Schedule({ store, grounds, data, schDateISO, setSchDateISO, findCovering, setDrawerId, setWalkOpen, setWk, flash }) {
  const cellBase = 'min-width:0; text-align:center; line-height:1.15; border-radius:9px; padding:9px 5px;';
  const buildRow = (g, hrs, cnt) => {
    const cells = []; let i = 0;
    while (i < hrs.length) {
      const h = hrs[i];
      const bk = findCovering(g.id, h, schDateISO);
      const blocked = !!data.blocks[g.id + '|' + schDateISO + '|' + h];
      if (bk) {
        let j = i; while (j + 1 < hrs.length) { const nb = findCovering(g.id, hrs[j + 1], schDateISO); if (nb && nb.id === bk.id) j++; else break; }
        const a = hrs[i], b = hrs[j], span = j - i + 1, approvedB = bk.status === 'approved';
        const bg = approvedB ? 'linear-gradient(145deg,var(--turf),var(--turf-deep))' : 'linear-gradient(145deg,var(--amber),#d97706)';
        cells.push({ key: 'b' + a, label: bk.customer.split(' ')[0], sub: rangeShort(a, b), span, onClick: () => setDrawerId(bk.id), title: bk.customer + ' · ' + (bk.phone || 'no phone') + ' · ' + rangeShort(a, b) + ' · ' + (approvedB ? 'Confirmed' : 'Pending — tap to review'), style: cellBase + 'grid-column:span ' + span + '; font-weight:800; font-size:12px; border:none; background:' + bg + '; color:#fff; cursor:pointer;' });
        cnt.booked += span; i = j + 1;
      } else if (blocked) {
        cells.push({ key: 'c' + h, label: rangeShort(h, h), sub: 'closed', span: 1, onClick: () => { store.toggleBlock(g.id, schDateISO, h); flash('Slot re-opened'); }, title: 'Closed — tap to re-open', style: cellBase + 'grid-column:span 1; font-weight:700; font-size:11px; border:1px solid #f3c2cd; background:#fceef1; color:var(--rose); cursor:pointer;' });
        cnt.closed++; i++;
      } else {
        cells.push({ key: 'o' + h, label: rangeShort(h, h), sub: '', span: 1, onClick: () => { store.toggleBlock(g.id, schDateISO, h); flash('Slot closed', 'reject'); }, title: 'Open — tap to close', style: cellBase + 'grid-column:span 1; font-weight:700; font-size:11px; border:1px solid var(--line); background:var(--surface2); color:var(--ink); cursor:pointer;' });
        cnt.open++; i++;
      }
    }
    return cells;
  };
  return (
    <div>
      <div style={css('background:var(--surface); border:1px solid var(--line); border-radius:20px; box-shadow:0 10px 26px -18px var(--shadow); padding:20px; margin-bottom:18px;')}>
        <div style={css('display:flex; align-items:center; gap:14px; flex-wrap:wrap; justify-content:space-between;')}>
          <div>
            <div style={css('font-family:Outfit; font-weight:900; font-size:17px; margin-bottom:3px;')}>Slot manager</div>
            <div style={css('font-size:12.5px; color:var(--muted); font-weight:600;')}>Tap a free slot to <b style={css('color:var(--rose);')}>close</b> it, tap a closed slot to <b style={css('color:var(--turf-deep);')}>re-open</b>. Booked slots are locked.</div>
            <button onClick={() => { setWk({ groundId: grounds[0] && grounds[0].id, slots: {}, name: '', phone: '', pay: 'cash' }); setWalkOpen(true); }} style={css('cursor:pointer; margin-top:12px; border:none; background:linear-gradient(145deg,var(--turf),var(--turf-deep)); color:#fff; font-family:Outfit; font-weight:800; font-size:13px; padding:10px 16px; border-radius:11px; display:inline-flex; align-items:center; gap:7px;')}><Raw html={svg(['M12 5v14M5 12h14'], 15, 2.6)} />Book a walk-in slot</button>
          </div>
          <div style={css('display:flex; gap:7px; overflow-x:auto; padding-bottom:2px;')}>
            {dateList().map((d) => {
              const active = schDateISO === d.iso;
              return <button key={d.iso} onClick={() => setSchDateISO(d.iso)} style={css('cursor:pointer; display:flex; flex-direction:column; align-items:center; min-width:50px; padding:8px 6px; border-radius:11px; ' + (active ? 'background:linear-gradient(145deg,var(--turf),var(--turf-deep)); color:#fff;' : 'background:var(--surface2); color:var(--ink); border:1px solid var(--line);'))}><span style={css('font-size:10px; font-weight:700; opacity:.75;')}>{d.dow}</span><span style={css('font-family:Outfit; font-weight:900; font-size:16px;')}>{d.day}</span></button>;
            })}
          </div>
        </div>
      </div>
      {grounds.map((g) => {
        const cnt = { open: 0, booked: 0, closed: 0 };
        const row1 = buildRow(g, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], cnt);
        const row2 = buildRow(g, [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], cnt);
        return (
          <div key={g.id} style={css('background:var(--surface); border:1px solid var(--line); border-radius:20px; box-shadow:0 10px 26px -18px var(--shadow); padding:18px 20px; margin-bottom:16px;')}>
            <div style={css('display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; flex-wrap:wrap; gap:8px;')}>
              <div style={css('display:flex; align-items:center; gap:10px;')}><span style={{ ...css('width:10px; height:10px; border-radius:50%;'), background: TYPE_COLOR[g.type] || '#15a34a' }} /><span style={css('font-family:Outfit; font-weight:800; font-size:15px;')}>{g.name}</span><span style={css('font-size:11.5px; font-weight:700; color:var(--muted);')}>{fmt(g.priceN)}/hr</span></div>
              <div style={css('font-size:11.5px; font-weight:700; color:var(--muted);')}>{cnt.open} open · {cnt.booked} booked · {cnt.closed} closed</div>
            </div>
            {[row1, row2].map((row, ri) => (
              <div key={ri} style={css('display:grid; grid-template-columns:repeat(12,1fr); gap:7px; margin-bottom:7px;')}>
                {row.map((c) => (
                  <button key={c.key} onClick={c.onClick} title={c.title} style={css(c.style)}>
                    <span style={css('display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%;')}>{c.label}</span>
                    {c.sub && <span style={css('display:block; font-size:9.5px; font-weight:600; opacity:.92; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%;')}>{c.sub}</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- GROUNDS ---------------- */
function Grounds({ store, grounds, bookings, setAddOpen, setNg, setView, flash }) {
  return (
    <div>
      <div style={css('display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:10px;')}>
        <p style={css('font-size:13px; color:var(--muted); font-weight:600; margin:0;')}>{grounds.length} grounds · manage pricing &amp; availability</p>
        <button onClick={() => { setNg({ name: '', type: 'open', price: '2000', img: null }); setAddOpen(true); }} style={css('cursor:pointer; border:none; background:linear-gradient(145deg,var(--turf),var(--turf-deep)); color:#fff; font-family:Outfit; font-weight:800; font-size:13.5px; padding:11px 18px; border-radius:12px; display:flex; align-items:center; gap:7px;')}><Raw html={svg(['M12 5v14M5 12h14'], 16, 2.6)} />Add ground</button>
      </div>
      <div style={css('display:grid; grid-template-columns:repeat(auto-fill,minmax(min(280px,100%),1fr)); gap:18px;')}>
        {grounds.map((g) => (
          <div key={g.id} style={css('background:var(--surface); border:1px solid var(--line); border-radius:18px; overflow:hidden; box-shadow:0 10px 26px -18px var(--shadow);')}>
            <div style={css('position:relative; height:140px;')}>
              <div role="img" aria-label={g.name} style={{ ...css('position:absolute; inset:0; background-size:cover; background-position:center;'), backgroundImage: "url('" + g.image + "')" }} />
              <div style={css('position:absolute; inset:0; background:linear-gradient(180deg,transparent 40%,rgba(13,28,18,.45));')} />
              <span style={{ ...css('position:absolute; top:11px; left:11px; color:#fff; font-weight:800; font-size:10.5px; padding:5px 10px; border-radius:99px;'), background: TYPE_COLOR[g.type] || '#15a34a' }}>{TYPE_LABEL[g.type] || 'Turf'}</span>
              <div style={css('position:absolute; bottom:10px; left:13px; color:#fff; font-family:Outfit; font-weight:800; font-size:17px; text-shadow:0 1px 6px rgba(0,0,0,.5);')}>{g.name}</div>
            </div>
            <div style={css('padding:15px 16px;')}>
              <div style={css('display:flex; align-items:center; justify-content:space-between; margin-bottom:13px;')}>
                <div><span style={css('font-family:Outfit; font-weight:900; font-size:19px; color:var(--turf-deep);')}>{fmt(g.priceN)}</span><span style={css('font-size:11.5px; font-weight:700; color:var(--muted);')}>/hr</span></div>
                <div style={css('font-size:12px; font-weight:700; color:var(--muted);')}>{bookings.filter((b) => b.ground === g.id && b.status !== 'rejected').length} bookings</div>
              </div>
              <div style={css('display:grid; grid-template-columns:1fr auto; gap:8px;')}>
                <button onClick={() => setView('schedule')} style={css('cursor:pointer; border:1px solid var(--line); background:var(--surface2); color:var(--ink); font-weight:800; font-size:12.5px; padding:9px; border-radius:10px; display:flex; align-items:center; justify-content:center; gap:6px;')}><Raw html={svg(['M8 2v4M16 2v4M3 10h18', 'M3 4h18v18H3z'], 14, 2.3)} />Manage slots</button>
                {g.removable ? (
                  <button onClick={async () => { await store.removeGround(g.id); flash('Ground removed', 'reject'); }} title="Remove ground" style={css('cursor:pointer; border:1px solid #f3c2cd; background:#fceef1; color:var(--rose); font-weight:800; padding:9px 12px; border-radius:10px; display:flex; align-items:center; justify-content:center;')}><Raw html={svg(['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'], 15, 2.3)} /></button>
                ) : (
                  <span title="Core ground" style={css('display:flex; align-items:center; justify-content:center; border:1px solid var(--line); background:var(--surface2); color:var(--muted); padding:9px 12px; border-radius:10px;')}><Raw html={svg(['M3 11h18v10H3z', 'M7 11V7a5 5 0 0 1 10 0v4'], 15, 2.3)} /></span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- PAYMENTS ---------------- */
function Payments({ approved, pending, groundName, isoLabel, payLabel }) {
  const revenue = approved.reduce((a, b) => a + b.amountN, 0);
  const stats = [
    ['Confirmed revenue', fmt(revenue), 'var(--turf-deep)', approved.length + ' bookings'],
    ['Pending settlement', fmt(pending.reduce((a, b) => a + b.amountN, 0)), 'var(--amber)', pending.length + ' awaiting approval'],
    ['Avg booking', fmt(approved.length ? Math.round(revenue / approved.length) : 0), 'var(--ink)', 'Per confirmed slot'],
  ];
  return (
    <div>
      <div style={css('display:grid; grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr)); gap:16px; margin-bottom:20px;')}>
        {stats.map((s) => (
          <div key={s[0]} style={css('background:var(--surface); border:1px solid var(--line); border-radius:18px; padding:19px; box-shadow:0 8px 22px -16px var(--shadow);')}>
            <div style={css('font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.08em; color:var(--muted);')}>{s[0]}</div>
            <div style={{ ...css('font-family:Outfit; font-weight:900; font-size:28px; margin-top:8px;'), color: s[2] }}>{s[1]}</div>
            <div style={css('font-size:11.5px; font-weight:600; color:var(--muted); margin-top:6px;')}>{s[3]}</div>
          </div>
        ))}
      </div>
      <div style={css('background:var(--surface); border:1px solid var(--line); border-radius:20px; box-shadow:0 10px 26px -18px var(--shadow); overflow:hidden;')}>
        <div style={css('padding:18px 20px; border-bottom:1px solid var(--line); font-family:Outfit; font-weight:800; font-size:16px;')}>Confirmed transactions</div>
        {approved.length === 0 && <div style={css('padding:40px 20px; text-align:center; color:var(--muted); font-weight:700; font-size:13.5px;')}>No confirmed payments yet.</div>}
        {approved.slice(0, 12).map((b) => (
          <div key={b.id} style={css('padding:14px 20px; border-bottom:1px solid var(--line); display:flex; align-items:center; gap:13px; flex-wrap:wrap;')}>
            <div style={css('width:38px; height:38px; border-radius:11px; background:#d8f0e0; color:var(--turf-deep); display:flex; align-items:center; justify-content:center; flex-shrink:0;')}><Raw html={svg(['M20 6 9 17l-5-5'], 17, 2.2)} /></div>
            <div style={css('flex:1; min-width:140px;')}><div style={css('font-weight:800; font-size:13.5px;')}>{b.customer}</div><div style={css('font-size:12px; color:var(--muted); font-weight:600; margin-top:2px;')}>{groundName(b.ground)} · {payLabel(b)}</div></div>
            <div style={css('text-align:right;')}><div style={css('font-family:Outfit; font-weight:900; font-size:15px; color:var(--turf-deep);')}>+ {fmt(b.amountN)}</div><div style={css('font-size:11px; font-weight:700; color:var(--muted);')}>{isoLabel(b.dateISO)}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- DRAWER ---------------- */
function Drawer({ db, groundById, groundName, isoLabel, timeRange, statusStyle, stLabel, payLabel, AV, fmt, BRAND, setDrawerId, approve, reject, store, flash }) {
  const g = groundById[db.ground] || {};
  const ph = (db.phone || '').replace(/[^0-9+]/g, '');
  const waLink = 'https://wa.me/' + ph.replace(/^\+/, '') + '?text=' + encodeURIComponent('Hi ' + db.customer + ', about your ' + groundName(db.ground) + ' booking at ' + BRAND);
  return (
    <>
      <div onClick={() => setDrawerId(null)} style={css('position:fixed; inset:0; z-index:80; background:rgba(13,28,18,.4); backdrop-filter:blur(2px); animation:erpFade .2s ease both;')} />
      <div style={css('position:fixed; top:0; right:0; bottom:0; z-index:81; width:min(440px,100vw); background:var(--surface); box-shadow:-20px 0 50px -20px rgba(13,40,22,.4); display:flex; flex-direction:column; animation:erpSlideR .28s ease both;')}>
        <div style={css('padding:18px 22px; border-bottom:1px solid var(--line); display:flex; align-items:center; justify-content:space-between;')}>
          <div style={css('font-family:Outfit; font-weight:900; font-size:18px;')}>Booking {db.id}</div>
          <button onClick={() => setDrawerId(null)} style={css('cursor:pointer; width:36px; height:36px; border-radius:10px; border:1px solid var(--line); background:var(--surface2); display:flex; align-items:center; justify-content:center;')}><Raw html={svg(['M18 6 6 18M6 6l12 12'], 17, 2.4)} /></button>
        </div>
        <div style={css('flex:1; overflow-y:auto; padding:22px;')}>
          <div style={css('display:flex; align-items:center; gap:13px; margin-bottom:18px;')}>
            <div style={{ ...css('width:54px; height:54px; border-radius:15px; color:#fff; display:flex; align-items:center; justify-content:center; font-family:Outfit; font-weight:800; font-size:19px;'), background: AV[db.customer.length % AV.length] }}>{initials(db.customer)}</div>
            <div><div style={css('font-weight:800; font-size:17px;')}>{db.customer}</div><div style={css('font-size:13px; color:var(--muted); font-weight:600; margin-top:2px;')}>{db.phone || 'No phone'}</div></div>
            <span style={{ ...css(statusStyle(db.status)), marginLeft: 'auto' }}>{stLabel[db.status]}</span>
          </div>
          <div style={css('display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;')}>
            <a href={'tel:' + ph} style={css('text-decoration:none; cursor:pointer; border:1px solid var(--line); background:var(--surface2); color:var(--sky); font-weight:800; font-size:13.5px; padding:12px; border-radius:12px; display:flex; align-items:center; justify-content:center; gap:8px;')}><Raw html={svg(['M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z'], 17, 2.2)} />Call</a>
            <a href={waLink} target="_blank" rel="noreferrer" style={css('text-decoration:none; cursor:pointer; border:1px solid var(--line); background:var(--surface2); color:var(--turf-deep); font-weight:800; font-size:13.5px; padding:12px; border-radius:12px; display:flex; align-items:center; justify-content:center; gap:8px;')}><Raw html='<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2z"/></svg>' />WhatsApp</a>
          </div>
          <div style={css('background:var(--surface2); border:1px solid var(--line); border-radius:14px; padding:16px; margin-bottom:16px;')}>
            <div style={css('display:flex; align-items:center; gap:10px; margin-bottom:13px;')}>
              <div style={{ ...css('width:46px; height:46px; border-radius:11px; background-size:cover; background-position:center;'), backgroundImage: "url('" + (g.image || '') + "')" }} />
              <div><div style={css('font-weight:800; font-size:14.5px;')}>{groundName(db.ground)}</div><span style={{ ...css('display:inline-block; margin-top:4px; color:#fff; font-weight:800; font-size:10px; padding:3px 8px; border-radius:99px;'), background: TYPE_COLOR[g.type] || '#15a34a' }}>{TYPE_LABEL[g.type] || 'Turf'}</span></div>
            </div>
            <div style={css('display:flex; flex-direction:column; gap:9px; font-size:13px;')}>
              <Row k="Date" v={isoLabel(db.dateISO)} />
              <Row k="Time" v={timeRange(db.hours)} />
              <Row k="Payment" v={payLabel(db)} />
              <div style={css('display:flex; justify-content:space-between; border-top:1px solid var(--line); padding-top:9px;')}><span style={css('color:var(--muted); font-weight:700;')}>Total</span><span style={css('font-family:Outfit; font-weight:900; font-size:18px; color:var(--turf-deep);')}>{fmt(db.amountN)}</span></div>
            </div>
          </div>
          <div style={css('font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin-bottom:10px;')}>Payment proof</div>
          {db.proof ? (
            <a href={db.proof} target="_blank" rel="noreferrer" style={css('display:block; border:1px solid var(--line); border-radius:14px; overflow:hidden; margin-bottom:8px;')}>
              <div style={{ ...css('width:100%; height:260px; background-size:contain; background-repeat:no-repeat; background-position:center; background-color:var(--surface2);'), backgroundImage: "url('" + db.proof + "')" }} />
            </a>
          ) : (
            <div style={css('border:1.5px dashed var(--line); border-radius:14px; padding:24px; text-align:center; color:var(--muted); font-weight:600; font-size:13px;')}>{db.pay === 'turf' ? 'Pay-at-turf booking, no online payment.' : 'No screenshot uploaded yet.'}</div>
          )}
        </div>
        <div style={css('padding:16px 22px; border-top:1px solid var(--line); display:flex; gap:9px;')}>
          {db.status === 'pending' ? (
            <>
              <button onClick={() => { reject(db.id); setDrawerId(null); }} style={css('cursor:pointer; flex:1; border:1px solid #f3c2cd; background:#fceef1; color:var(--rose); font-family:Outfit; font-weight:800; font-size:14px; padding:13px; border-radius:12px;')}>Reject</button>
              <button onClick={() => { approve(db.id, db.customer); setDrawerId(null); }} style={css('cursor:pointer; flex:1.4; border:none; background:linear-gradient(145deg,var(--turf),var(--turf-deep)); color:#fff; font-family:Outfit; font-weight:800; font-size:14px; padding:13px; border-radius:12px; display:flex; align-items:center; justify-content:center; gap:7px;')}><Raw html={svg(['M20 6 9 17l-5-5'], 16, 3)} />Approve booking</button>
            </>
          ) : (
            <button onClick={async () => { await store.setStatus(db.id, 'pending'); flash('Moved back to pending'); }} style={css('cursor:pointer; flex:1; border:1px solid var(--line); background:var(--surface2); color:var(--ink); font-family:Outfit; font-weight:800; font-size:14px; padding:13px; border-radius:12px;')}>Move back to pending</button>
          )}
        </div>
      </div>
    </>
  );
}
function Row({ k, v }) {
  return <div style={css('display:flex; justify-content:space-between;')}><span style={css('color:var(--muted); font-weight:600;')}>{k}</span><span style={css('font-weight:800;')}>{v}</span></div>;
}
