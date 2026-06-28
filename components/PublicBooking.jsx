'use client';

import { useState, useRef, useEffect } from 'react';
import { css } from '@/lib/style';
import { Hov, Raw } from '@/lib/ui';
import { useStore } from '@/lib/useStore';

const BRAND = 'Dugout Turf Arena';
const UPI_ID = 'dugoutturf@upi';
const WA_NUMBER = '918000986401';

const ROOT_VARS =
  '--bg:#f6f7f4; --surface:#ffffff; --surface-2:#f3f5f1; --brand:#15803d; --brand-deep:#0f5c2e; --brand-soft:#e7f1ea; --lime:#b8e642; --ink:#17211b; --ink-2:#3d4843; --muted:#6b746d; --line:#e3e7e0; --line-2:#d5dad2; --amber:#a55a09; --amber-soft:#fbf1e1; --wa:#1ea861; --shadow-sm:0 1px 2px rgba(18,32,24,.06); --shadow-md:0 8px 24px -14px rgba(18,32,24,.3); min-height:100vh; background:var(--bg); color:var(--ink); font-family:Hanken Grotesk,system-ui,sans-serif; position:relative;';

const fmt = (n) => '₹' + (n || 0).toLocaleString('en-IN');
const hr12 = (h) => (h % 12 === 0 ? 12 : h % 12);
const hourLabel = (h) => hr12(h) + (h < 12 ? ' AM' : ' PM');
const hourFull = (h) => {
  const f = (x) => { const a = x < 12 ? 'AM' : 'PM'; return hr12(x) + ':00 ' + a; };
  return f(h) + ' – ' + f((h + 1) % 24);
};

function dateList() {
  const dows = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const mons = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const base = new Date(); base.setHours(0, 0, 0, 0);
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(base); d.setDate(base.getDate() + i);
    out.push({ iso: d.toISOString().slice(0, 10), dow: i === 0 ? 'Today' : dows[d.getDay()], day: String(d.getDate()), mon: mons[d.getMonth()], full: dows[d.getDay()] + ', ' + d.getDate() + ' ' + mons[d.getMonth()] });
  }
  return out;
}

const SLOT_GROUPS = [
  { label: 'Morning · 6 AM – 12 PM', r: [6, 11] },
  { label: 'Afternoon · 12 – 5 PM', r: [12, 17] },
  { label: 'Evening · 6 – 11 PM', r: [18, 23] },
  { label: 'Late night · 12 – 5 AM', r: [0, 5] },
];

const QUICK = [
  { label: 'Grounds', key: 'grounds' },
  { label: 'Hours', value: 'Open 24 × 7' },
  { label: 'Slot', value: '1 hour each' },
];
const AMENITIES = ['Floodlit grounds', 'Box & open turf', 'Roof netting', 'Free parking', 'Drinking water', 'Washrooms', 'Bats & balls', 'Scan & pay'];

const WA_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm5.5 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.4-1.1-2.7s.7-1.9.9-2.2c.2-.2.5-.3.6-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.4.6c-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.2.1.4.1.6-.1l.7-.9c.2-.2.4-.2.6-.1l1.8.9c.2.1.4.2.4.3.1.1.1.6-.1 1.1z"/></svg>';
const CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const ARROW = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

export default function PublicBooking() {
  const store = useStore();
  const grounds = store.grounds();
  const dates = dateList();
  const fileRef = useRef(null);

  const [screen, setScreen] = useState('booking');
  const [groundId, setGroundId] = useState(null);
  const [dateISO, setDateISO] = useState(dates[0].iso);
  const [selected, setSelected] = useState({});
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pay, setPay] = useState('online');
  const [proof, setProof] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const gid = groundId || (grounds[0] && grounds[0].id);
  const activeG = grounds.find((g) => g.id === gid) || grounds[0] || {};
  const waLink = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent('Hi! I want to book a slot at ' + BRAND);

  const flash = (m) => { setToast(m); clearTimeout(flash._t); flash._t = setTimeout(() => setToast(null), 2600); };

  const selKey = (h) => gid + '|' + dateISO + '|' + h;
  const toggleSlot = (h) => setSelected((s) => { const n = { ...s }; if (n[selKey(h)]) delete n[selKey(h)]; else n[selKey(h)] = true; return n; });
  const curSel = Object.keys(selected).filter((k) => selected[k] && k.indexOf(gid + '|' + dateISO + '|') === 0).map((k) => parseInt(k.split('|')[2], 10)).sort((a, b) => a - b);
  const selSet = new Set(curSel);
  const selCount = curSel.length;
  const totalN = selCount * (activeG.priceN || 0);
  const dateObj = dates.find((d) => d.iso === dateISO) || dates[0];
  const selSummary = curSel.length ? hourLabel(curSel[0]) + (curSel.length > 1 ? ' +' + (curSel.length - 1) : '') : '·';

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { flash('Image too large (max 5MB)'); return; }
    const r = new FileReader(); r.onload = () => setProof(r.result); r.readAsDataURL(f);
  };

  const canSubmit = name.trim() && phone.trim() && selCount && (pay === 'turf' || proof);
  const submit = async () => {
    if (!canSubmit || submitting) {
      if (!name.trim() || !phone.trim()) flash('Add your name & phone');
      else if (!selCount) flash('Pick at least one slot');
      else if (pay === 'online' && !proof) flash('Upload your payment screenshot');
      return;
    }
    setSubmitting(true);
    try {
      await store.createBooking({ ground: gid, customer: name.trim(), phone: phone.trim(), email: email.trim(), dateISO, hours: curSel, pay, proof });
      setScreen('success'); window.scrollTo({ top: 0 });
    } catch (e) { flash('Could not place booking — try again'); }
    setSubmitting(false);
  };

  const inputStyle = 'width:100%; border:1px solid var(--line-2); background:var(--surface); border-radius:9px; padding:12px 14px; font-family:inherit; font-size:15px; font-weight:500; color:var(--ink); outline:none;';
  const qrSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=' + encodeURIComponent('upi://pay?pa=' + UPI_ID + '&pn=' + encodeURIComponent(BRAND) + '&am=' + totalN + '&cu=INR');

  if (!mounted) return <div style={css(ROOT_VARS)} />;

  return (
    <div style={css(ROOT_VARS)}>
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />

      {/* NAV */}
      <nav style={css('position:sticky; top:0; z-index:60; background:rgba(255,255,255,.88); backdrop-filter:blur(12px); border-bottom:1px solid var(--line);')}>
        <div style={css('max-width:1080px; margin:0 auto; padding:0 clamp(16px,4vw,32px); height:62px; display:flex; align-items:center; justify-content:space-between; gap:16px;')}>
          <div style={css('display:flex; align-items:center; gap:11px;')}>
            <img src="/assets/dugout-logo.png" alt="Dugout Turf Arena" style={css('width:36px; height:36px; border-radius:9px; object-fit:contain;')} />
            <div style={{ lineHeight: 1 }}>
              <div style={css('font-weight:800; font-size:16.5px; letter-spacing:-.02em;')}>{BRAND}</div>
              <div style={css('font-size:10.5px; font-weight:700; color:var(--brand-deep); margin-top:2px;')}>Open 24 × 7</div>
            </div>
          </div>
          <div style={css('display:flex; align-items:center; gap:8px;')}>
            <Hov as="a" href={waLink} target="_blank" s="display:flex; align-items:center; gap:7px; white-space:nowrap; text-decoration:none; padding:9px 14px; border-radius:8px; background:var(--surface-2); color:var(--ink); font-weight:700; font-size:13.5px;" hover="background:var(--line);"><Raw html={WA_ICON} />Chat</Hov>
            <Hov as="a" href="/console" s="display:flex; align-items:center; gap:7px; white-space:nowrap; text-decoration:none; padding:9px 16px; border-radius:8px; background:var(--ink); color:#fff; font-weight:700; font-size:13.5px;" hover="background:#000;">Owner login</Hov>
          </div>
        </div>
      </nav>

      {screen === 'booking' && (
        <>
        {/* HERO */}
        <div style={css('position:relative; width:100%; height:clamp(280px,40vw,460px); overflow:hidden;')}>
          <img src="/assets/dugout-hero.webp" alt="Dugout Turf Arena" style={css('width:100%; height:100%; object-fit:cover; display:block;')} />
          <div style={css('position:absolute; inset:0; background:linear-gradient(to bottom, rgba(0,0,0,.1) 0%, rgba(0,0,0,.6) 100%);')} />
          <div style={css('position:absolute; bottom:0; left:0; right:0; padding:clamp(20px,3vw,36px) clamp(16px,4vw,32px);')}>
            <div style={css('max-width:1080px; margin:0 auto;')}>
              <div style={css('display:flex; align-items:center; gap:9px; flex-wrap:wrap; margin-bottom:8px;')}>
                <h1 style={css('font-weight:800; font-size:clamp(28px,4vw,42px); letter-spacing:-.025em; margin:0; color:#fff; text-shadow:0 2px 12px rgba(0,0,0,.4);')}>{BRAND}</h1>
                <span style={css('display:flex; align-items:center; gap:5px; background:var(--brand); color:#fff; font-weight:700; font-size:11px; padding:5px 10px; border-radius:99px;')}><span style={css('width:6px; height:6px; border-radius:50%; background:var(--lime);')} />Open 24 × 7</span>
              </div>
              <div style={css('font-size:14px; font-weight:500; color:rgba(255,255,255,.85);')}>Cricket · Football turf</div>
            </div>
          </div>
        </div>
        <div style={css('max-width:1080px; margin:0 auto; padding:clamp(20px,3vw,30px) clamp(16px,4vw,32px) 150px;')}>

          {/* GALLERY */}
          <div style={css('display:grid; grid-template-columns:2fr 1fr 1fr; grid-template-rows:repeat(2,1fr); gap:10px; height:clamp(240px,36vw,380px); border-radius:14px; overflow:hidden; margin-bottom:24px;')}>
            {['/assets/dugout-1.jpeg', '/assets/dugout-2.jpeg', '/assets/dugout-4.jpeg', '/assets/dugout-3.jpeg', '/assets/dugout-5.jpeg'].map((src, i) => (
              <div key={i} style={{ ...css('overflow:hidden;'), gridRow: i === 0 ? 'span 2' : undefined }}>
                <img src={src} alt="" style={css('width:100%; height:100%; object-fit:cover;')} />
              </div>
            ))}
          </div>

          {/* GROUNDS */}
          <div style={css('margin-bottom:24px;')}>
            <div style={css('display:flex; align-items:baseline; justify-content:space-between; gap:10px; margin-bottom:12px;')}>
              <h2 style={css('font-weight:800; font-size:19px; letter-spacing:-.02em; margin:0;')}>Choose a ground</h2>
              <span style={css('font-size:13px; font-weight:500; color:var(--muted);')}>{grounds.length} grounds · 1-hour slots</span>
            </div>
            <div style={css('display:grid; grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr)); gap:12px;')}>
              {grounds.map((g) => {
                const active = g.id === gid;
                return (
                  <button key={g.id} onClick={() => setGroundId(g.id)} style={css('cursor:pointer; display:flex; flex-direction:column; font-family:inherit; padding:11px; border-radius:13px; background:var(--surface); ' + (active ? 'border:1.5px solid var(--brand); box-shadow:var(--shadow-md);' : 'border:1.5px solid var(--line);'))}>
                    <div style={css('width:100%; height:130px; border-radius:10px; overflow:hidden; position:relative; margin-bottom:12px;')}>
                      <img src={g.image} alt="" style={css('width:100%; height:100%; object-fit:cover;')} />
                      {active && <span style={css('position:absolute; top:8px; right:8px; width:24px; height:24px; border-radius:50%; background:var(--brand); display:flex; align-items:center; justify-content:center;')}><Raw html='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' /></span>}
                    </div>
                    <div style={css('display:flex; align-items:flex-start; justify-content:space-between; gap:8px; width:100%;')}>
                      <span style={css('font-weight:700; font-size:16px; text-align:left;')}>{g.name}</span>
                      <span style={css('font-weight:800; font-size:15px; white-space:nowrap;')}>{fmt(g.priceN)}<span style={css('font-size:11px; color:var(--muted); font-weight:600;')}>/hr</span></span>
                    </div>
                    <div style={css('font-size:12px; font-weight:500; color:var(--muted); margin-top:3px; text-align:left;')}>{g.size}</div>
                    <div style={css('display:flex; gap:6px; flex-wrap:wrap; margin-top:11px;')}>
                      {(g.sports || []).map((sp) => <span key={sp} style={css('font-size:11px; font-weight:600; color:var(--ink-2); background:var(--surface-2); border:1px solid var(--line); padding:4px 9px; border-radius:6px;')}>{sp}</span>)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={css('display:grid; grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr)); gap:24px; align-items:start;')}>
            {/* LEFT */}
            <div>
              <div style={css('display:flex; gap:10px; flex-wrap:wrap; margin-bottom:22px;')}>
                {QUICK.map((q) => (
                  <div key={q.label} style={css('flex:1; min-width:130px; background:var(--surface); border:1px solid var(--line); border-radius:11px; padding:13px 15px;')}>
                    <div style={css('font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--muted);')}>{q.label}</div>
                    <div style={css('font-weight:800; font-size:16px; margin-top:4px;')}>{q.key === 'grounds' ? grounds.length + ' grounds' : q.value}</div>
                  </div>
                ))}
              </div>
              <h2 style={css('font-weight:800; font-size:19px; letter-spacing:-.02em; margin:0 0 9px;')}>About the arena</h2>
              <p style={css('color:var(--ink-2); font-size:14.5px; line-height:1.6; margin:0 0 24px;')}>Dugout Turf Arena runs two floodlit grounds open round the clock. The Open Arena is a full-size astro turf for cricket and football; the Box Arena is a covered, roof-netted box-cricket pitch. Every slot is one hour. Pick your ground and time, pay by UPI, and you are set.</p>
              <div style={css('background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:20px 22px;')}>
                <h3 style={css('font-weight:700; font-size:13px; margin:0 0 15px; color:var(--ink-2); text-transform:uppercase; letter-spacing:.06em;')}>Amenities</h3>
                <div style={css('display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:12px;')}>
                  {AMENITIES.map((a) => <div key={a} style={css('display:flex; align-items:center; gap:9px; font-size:14px; font-weight:500; color:var(--ink);')}><Raw html='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' />{a}</div>)}
                </div>
              </div>
            </div>

            {/* RIGHT: booking widget */}
            <div style={css('background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:22px; box-shadow:var(--shadow-sm); position:sticky; top:80px;')}>
              <div style={css('font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin-bottom:4px;')}>{activeG.name}</div>
              <div style={css('font-weight:800; font-size:23px; margin-bottom:16px;')}>{fmt(activeG.priceN)}<span style={css('font-size:13px; color:var(--muted); font-weight:600;')}> /hour</span></div>

              <div style={css('font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--muted); margin-bottom:9px;')}>Select date</div>
              <div style={css('display:flex; gap:7px; overflow-x:auto; padding-bottom:4px; margin-bottom:18px;')}>
                {dates.map((d) => {
                  const active = dateISO === d.iso;
                  return (
                    <button key={d.iso} onClick={() => setDateISO(d.iso)} style={css('cursor:pointer; display:flex; flex-direction:column; align-items:center; min-width:56px; padding:10px 8px; border-radius:9px; font-family:inherit; ' + (active ? 'background:var(--brand); color:#fff; border:1px solid var(--brand);' : 'background:var(--surface-2); color:var(--ink); border:1px solid var(--line);'))}>
                      <span style={css('font-size:10.5px; font-weight:600; text-transform:uppercase; opacity:.75;')}>{d.dow}</span>
                      <span style={css('font-weight:800; font-size:18px; line-height:1; margin-top:3px;')}>{d.day}</span>
                      <span style={css('font-size:10px; font-weight:600; opacity:.75; margin-top:2px;')}>{d.mon}</span>
                    </button>
                  );
                })}
              </div>

              <div style={css('font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--muted); margin-bottom:11px; display:flex; align-items:center; justify-content:space-between;')}>
                <span>Pick 1-hour slots</span>
                <span style={css('display:flex; gap:10px; font-size:10.5px; text-transform:none; font-weight:500;')}>
                  <span style={css('display:flex; align-items:center; gap:5px; color:var(--muted);')}><span style={css('width:11px; height:11px; border-radius:4px; background:var(--brand);')} />Picked</span>
                  <span style={css('display:flex; align-items:center; gap:5px; color:var(--muted);')}><span style={css('width:11px; height:11px; border-radius:4px; background:var(--surface-2); border:1px solid var(--line-2);')} />Taken</span>
                </span>
              </div>
              {SLOT_GROUPS.map((grp) => (
                <div key={grp.label} style={css('margin-bottom:14px;')}>
                  <div style={css('font-size:12px; font-weight:600; color:var(--muted); margin-bottom:8px;')}>{grp.label}</div>
                  <div style={css('display:grid; grid-template-columns:repeat(3,1fr); gap:7px;')}>
                    {Array.from({ length: grp.r[1] - grp.r[0] + 1 }, (_, k) => grp.r[0] + k).map((h) => {
                      const avail = store.isAvailable(gid, dateISO, h);
                      const picked = selSet.has(h);
                      let st = 'cursor:pointer; padding:9px 4px; border-radius:8px; font-family:inherit; font-weight:600; font-size:12px; border:1px solid var(--line-2);';
                      if (!avail) st = 'padding:9px 4px; border-radius:8px; font-family:inherit; font-weight:500; font-size:12px; border:1px solid var(--line); background:var(--surface-2); color:var(--line-2); cursor:not-allowed; text-decoration:line-through;';
                      else if (picked) st += ' background:var(--brand); color:#fff; border-color:var(--brand);';
                      else st += ' background:var(--surface); color:var(--ink);';
                      return <button key={h} onClick={() => avail ? toggleSlot(h) : flash('That slot is already taken')} style={css(st)}>{hourLabel(h)}</button>;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selCount > 0 && (
            <div style={css('position:fixed; left:0; right:0; bottom:0; z-index:70; padding:13px clamp(16px,4vw,32px); background:rgba(255,255,255,.94); backdrop-filter:blur(12px); border-top:1px solid var(--line-2); animation:fadeUp .25s ease both;')}>
              <div style={css('max-width:1080px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;')}>
                <div><div style={css('font-size:11.5px; font-weight:600; color:var(--muted);')}>{activeG.name} · {selCount} hr · {selSummary}</div><div style={css('font-weight:800; font-size:21px;')}>{fmt(totalN)}</div></div>
                <Hov as="button" onClick={() => { setScreen('checkout'); window.scrollTo({ top: 0 }); }} s="cursor:pointer; border:none; padding:14px 26px; border-radius:9px; background:var(--brand); color:#fff; font-family:inherit; font-weight:700; font-size:15px; display:flex; align-items:center; gap:8px;" hover="background:var(--brand-deep);">Continue to book<Raw html={ARROW} /></Hov>
              </div>
            </div>
          )}
        </div>
        </>
      )}

      {screen === 'checkout' && (
        <div style={css('max-width:1000px; margin:0 auto; padding:clamp(16px,3vw,26px) clamp(16px,4vw,32px) 90px; animation:fadeUp .28s ease both;')}>
          <button onClick={() => { setScreen('booking'); window.scrollTo({ top: 0 }); }} style={css('cursor:pointer; display:flex; align-items:center; gap:7px; background:transparent; border:none; padding:6px 0; font-family:inherit; font-weight:600; font-size:13.5px; color:var(--ink-2); margin-bottom:14px;')}><Raw html='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>' />Back to slots</button>
          <h1 style={css('font-weight:800; font-size:clamp(24px,3.6vw,32px); letter-spacing:-.02em; margin:0 0 6px;')}>Confirm your booking</h1>
          <p style={css('color:var(--muted); font-weight:500; font-size:14.5px; margin:0 0 24px;')}>{BRAND} · {activeG.name} · {dateObj.full} · {selSummary}</p>

          <div style={css('display:grid; grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr)); gap:18px; align-items:start;')}>
            <div style={css('display:flex; flex-direction:column; gap:18px;')}>
              <div style={css('background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:22px;')}>
                <div style={css('font-weight:700; font-size:13px; text-transform:uppercase; letter-spacing:.05em; color:var(--ink-2); margin-bottom:16px;')}>1 · Your details</div>
                <Field label="Full name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Arjun Mehta" style={css(inputStyle)} /></Field>
                <Field label="Phone number"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" style={css(inputStyle)} /></Field>
                <Field label="Email (optional)"><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={css(inputStyle)} /></Field>
              </div>

              <div style={css('background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:22px;')}>
                <div style={css('font-weight:700; font-size:13px; text-transform:uppercase; letter-spacing:.05em; color:var(--ink-2); margin-bottom:16px;')}>2 · Payment method</div>
                <div style={css('display:flex; flex-direction:column; gap:9px;')}>
                  {[{ k: 'online', t: 'Pay online via UPI', s: 'Scan, pay & upload screenshot', a: fmt(totalN) }, { k: 'turf', t: 'Pay at the arena', s: 'Cash or UPI when you arrive', a: fmt(0) }].map((p) => {
                    const active = pay === p.k;
                    return (
                      <button key={p.k} onClick={() => setPay(p.k)} style={css('cursor:pointer; display:flex; align-items:center; gap:12px; padding:13px 15px; border-radius:11px; font-family:inherit; ' + (active ? 'background:var(--brand-soft); border:1.5px solid var(--brand);' : 'background:var(--surface); border:1.5px solid var(--line);'))}>
                        <span style={css('width:18px; height:18px; border-radius:50%; border:2px solid ' + (active ? 'var(--brand)' : 'var(--line-2)') + '; display:flex; align-items:center; justify-content:center;')}><span style={css('width:9px; height:9px; border-radius:50%; background:' + (active ? 'var(--brand)' : 'transparent') + ';')} /></span>
                        <span style={css('text-align:left; flex:1;')}><span style={css('display:block; font-weight:700; font-size:14px; color:var(--ink);')}>{p.t}</span><span style={css('display:block; font-size:11.5px; font-weight:500; color:var(--muted);')}>{p.s}</span></span>
                        <span style={css('font-weight:800; font-size:14px; color:var(--ink);')}>{p.a}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {pay === 'online' && totalN > 0 && (
                <div style={css('background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:22px;')}>
                  <div style={css('font-weight:700; font-size:13px; text-transform:uppercase; letter-spacing:.05em; color:var(--ink-2); margin-bottom:16px;')}>3 · Pay {fmt(totalN)} via UPI</div>
                  <div style={css('display:flex; gap:18px; flex-wrap:wrap; align-items:center;')}>
                    <div style={css('width:148px; height:148px; background:#fff; border:1px solid var(--line-2); border-radius:12px; padding:9px;')}><img src={qrSrc} alt="UPI QR" style={css('width:100%; height:100%; object-fit:contain;')} /></div>
                    <div style={css('flex:1; min-width:170px;')}>
                      <div style={css('font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin-bottom:6px;')}>Pay to UPI ID</div>
                      <div style={css('font-weight:700; font-size:15px; background:var(--surface-2); border:1px solid var(--line); padding:9px 13px; border-radius:9px; display:flex; align-items:center; justify-content:space-between; gap:8px;')}><span style={{ userSelect: 'all' }}>{UPI_ID}</span><button onClick={() => { try { navigator.clipboard.writeText(UPI_ID); } catch (e) {} flash('UPI ID copied'); }} style={css('cursor:pointer; border:none; background:transparent; color:var(--brand-deep); font-family:inherit; font-weight:700; font-size:12px;')}>Copy</button></div>
                      <p style={css('font-size:12.5px; color:var(--muted); line-height:1.5; margin:11px 0 0;')}>Scan with any UPI app, pay <b style={css('color:var(--ink);')}>{fmt(totalN)}</b>, then upload the payment screenshot below.</p>
                    </div>
                  </div>
                  <div onClick={() => fileRef.current && fileRef.current.click()} style={css('cursor:pointer; margin-top:16px; border:1.5px dashed ' + (proof ? '#9cc7ab' : 'var(--line-2)') + '; background:' + (proof ? 'var(--brand-soft)' : 'var(--surface-2)') + '; border-radius:12px; padding:20px; text-align:center;')}>
                    {proof ? (
                      <div style={css('display:flex; align-items:center; gap:13px; justify-content:center;')}>
                        <img src={proof} alt="" style={css('width:46px; height:46px; border-radius:9px; object-fit:cover; border:1px solid var(--line);')} />
                        <div style={css('text-align:left;')}><div style={css('font-weight:700; font-size:13.5px; color:var(--brand-deep);')}>Screenshot added</div><div style={css('font-size:11.5px; color:var(--muted);')}>Tap to change</div></div>
                      </div>
                    ) : (
                      <div style={css('display:flex; flex-direction:column; align-items:center; gap:8px;')}>
                        <Raw html='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b746d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>' />
                        <span style={css('font-weight:700; font-size:13.5px; color:var(--ink);')}>Upload payment screenshot</span>
                        <span style={css('font-size:11.5px; color:var(--muted);')}>JPG, PNG or WEBP · proof goes to the owner</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {pay === 'turf' && (
                <div style={css('background:var(--brand-soft); border:1px solid #bfe0cb; border-radius:14px; padding:18px 20px; display:flex; gap:11px; align-items:flex-start;')}>
                  <Raw html='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f5c2e" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' />
                  <div style={css('font-size:13.5px; color:var(--brand-deep); font-weight:600; line-height:1.5;')}>No online payment needed. Pay <b>{fmt(totalN)}</b> in cash or UPI at the arena. The owner confirms your slot on WhatsApp.</div>
                </div>
              )}
            </div>

            {/* SUMMARY */}
            <div style={css('background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:22px; box-shadow:var(--shadow-sm); position:sticky; top:80px;')}>
              <div style={css('font-weight:700; font-size:15px; margin-bottom:16px;')}>Booking summary</div>
              <div style={css('display:flex; gap:12px; padding-bottom:16px; border-bottom:1px solid var(--line);')}>
                <img src={activeG.image} alt="" style={css('width:60px; height:60px; border-radius:11px; object-fit:cover;')} />
                <div><div style={css('font-weight:700; font-size:15px;')}>{BRAND}</div><div style={css('font-size:12.5px; color:var(--muted); font-weight:500; margin-top:3px;')}>{activeG.name} · {fmt(activeG.priceN)}/hr</div></div>
              </div>
              <div style={css('padding:15px 0; border-bottom:1px solid var(--line);')}>
                <div style={css('display:flex; align-items:center; gap:8px; font-weight:600; font-size:13.5px; margin-bottom:10px;')}><Raw html='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>' />{dateObj.full}</div>
                <div style={css('display:flex; flex-wrap:wrap; gap:7px;')}>
                  {curSel.map((h) => <span key={h} style={css('background:var(--surface-2); border:1px solid var(--line); font-weight:600; font-size:12px; padding:6px 10px; border-radius:7px; display:flex; align-items:center; gap:6px;')}><Raw html='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>' />{hourFull(h)}</span>)}
                </div>
              </div>
              <div style={css('padding-top:15px; display:flex; flex-direction:column; gap:8px;')}>
                <div style={css('display:flex; justify-content:space-between; font-size:13.5px; font-weight:500; color:var(--muted);')}><span>{fmt(activeG.priceN)} × {selCount} hr</span><span>{fmt(totalN)}</span></div>
                <div style={css('display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--line); padding-top:11px; margin-top:3px;')}><span style={css('font-weight:700; font-size:15px;')}>Total</span><span style={css('font-weight:800; font-size:23px;')}>{fmt(totalN)}</span></div>
              </div>
              <button onClick={submit} style={css('cursor:' + (canSubmit && !submitting ? 'pointer' : 'not-allowed') + '; width:100%; margin-top:18px; border:none; padding:15px; border-radius:9px; font-family:inherit; font-weight:700; font-size:15.5px; color:#fff; ' + (canSubmit && !submitting ? 'background:var(--brand);' : 'background:var(--line-2);'))}>{submitting ? 'Placing booking…' : (pay === 'turf' ? 'Confirm booking' : 'Confirm & place booking')}</button>
              <p style={css('text-align:center; font-size:11.5px; color:var(--muted); font-weight:500; margin:11px 0 0;')}>Your request goes to the owner for confirmation.</p>
            </div>
          </div>
        </div>
      )}

      {screen === 'success' && (
        <div style={css('max-width:560px; margin:0 auto; padding:clamp(40px,7vw,80px) clamp(16px,4vw,32px); text-align:center; animation:fadeUp .3s ease both;')}>
          <div style={css('width:72px; height:72px; margin:0 auto 24px; border-radius:50%; background:var(--brand); display:flex; align-items:center; justify-content:center;')}><Raw html='<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' /></div>
          <h1 style={css('font-weight:800; font-size:clamp(26px,4.4vw,36px); letter-spacing:-.02em; margin:0 0 12px;')}>Booking placed</h1>
          <p style={css('color:var(--muted); font-weight:500; font-size:15px; line-height:1.55; margin:0 0 18px;')}>Your slots at <b style={css('color:var(--ink); font-weight:700;')}>{BRAND}</b> are reserved. The owner will confirm on <b style={css('color:var(--ink); font-weight:700;')}>{phone || 'your phone'}</b> shortly.</p>
          <div style={css('display:inline-flex; align-items:center; gap:8px; background:var(--amber-soft); color:var(--amber); font-weight:700; font-size:13px; padding:8px 15px; border-radius:99px; margin:0 0 28px;')}><span style={css('width:8px; height:8px; border-radius:50%; background:var(--amber);')} />{pay === 'turf' ? 'Pending owner confirmation' : 'Payment under review'}</div>
          <div style={css('background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:18px; text-align:left; box-shadow:var(--shadow-sm);')}>
            <div style={css('display:flex; gap:13px; align-items:center;')}>
              <img src={activeG.image} alt="" style={css('width:56px; height:56px; border-radius:11px; object-fit:cover;')} />
              <div style={css('flex:1;')}><div style={css('font-weight:700; font-size:15px;')}>{BRAND}</div><div style={css('font-size:12.5px; color:var(--muted); font-weight:500; margin-top:2px;')}>{activeG.name} · {dateObj.full} · {selSummary}</div></div>
              <div style={css('font-weight:800; font-size:19px;')}>{fmt(totalN)}</div>
            </div>
          </div>
          <div style={css('display:flex; gap:10px; margin-top:20px;')}>
            <Hov as="a" href={waLink} target="_blank" s="text-decoration:none; flex:1; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; border:none; padding:14px; border-radius:9px; background:var(--wa); color:#fff; font-family:inherit; font-weight:700; font-size:14.5px;" hover="filter:brightness(.94);"><Raw html={WA_ICON} />Message owner</Hov>
            <Hov as="button" onClick={() => { setScreen('booking'); setSelected({}); setName(''); setPhone(''); setEmail(''); setProof(null); setPay('online'); window.scrollTo({ top: 0 }); }} s="cursor:pointer; flex:1; border:1px solid var(--line-2); padding:14px; border-radius:9px; background:var(--surface); color:var(--ink); font-family:inherit; font-weight:700; font-size:14.5px;" hover="background:var(--surface-2);">Book again</Hov>
          </div>
        </div>
      )}

      {toast && (
        <div style={css('position:fixed; left:50%; bottom:26px; z-index:95; transform:translateX(-50%); background:var(--ink); color:#fff; padding:13px 18px; border-radius:9px; box-shadow:0 16px 36px -14px rgba(18,32,24,.5); display:flex; align-items:center; gap:10px; font-weight:600; font-size:13.5px; animation:toastIn .3s ease both; max-width:90vw;')}><Raw html='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/></svg>' />{toast}</div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={css('display:block; font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin-bottom:7px;')}>{label}</label>
      {children}
    </div>
  );
}
