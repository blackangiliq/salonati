/* Salonati prototype core: shared state, demo clock, router, actions and UI primitives used by every role.
   Screens register in App.SCREENS as functions returning {title, sub, actions, body, bar, nav, cls, after}.
   Clicks are delegated: data-a="action" calls App.ACT[action](el, el.dataset); data-go="screen.id" navigates with the other data-* as params. */
(function () {
  'use strict';
  const App = (window.App = window.App || {});
  const SCREENS = (App.SCREENS = {});
  const ACT = (App.ACT = {});

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => Math.round(n).toLocaleString('en-US');
  const iqd = (n, unit) => `<span class="iqd num">${money(n)}<small> ${unit || 'د.ع'}</small></span>`;
  const r1k = (n) => Math.round(n / 1000) * 1000;
  const ic = (n, cls) => `<svg class="i${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false"><use href="#i-${n}"/></svg>`;
  const icb = (n, tone, cls) => `<span class="ib t-${tone || 'rose'}${cls ? ' ' + cls : ''}" data-e="${(window.ICON_EMOJI || {})[n] || ''}" aria-hidden="true">${ic(n)}</span>`;
  const rose = (cls) => `<svg class="rose${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false"><use href="#rosette"/></svg>`;
  const img = (name, cls, alt) => `<img class="${cls || ''}" src="assets/img/${name}.jpg" alt="${esc(alt || '')}" loading="lazy" decoding="async">`;
  const vsrc = (name) => `assets/video/${name}.mp4`;

  function petals(n, total) {
    total = total || 8;
    let s = `<svg class="petals" viewBox="-40 -40 80 80" role="img" aria-label="${n} بتلات من ${total}">`;
    for (let i = 0; i < total; i++) s += `<use href="#petal" transform="rotate(${i * (360 / total)})" class="${i < n ? 'on' : ''}"/>`;
    return s + '<circle r="6.5" class="core"/></svg>';
  }

  // Illustrative QR drawn from a seed. It encodes nothing; the 6-digit code beside it is what the salon checks.
  function qrSvg(seed) {
    const N = 29;
    let x = (seed >>> 0) || 7;
    const rnd = () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296);
    const finder = (i, j) => (i < 8 && j < 8) || (i >= N - 8 && j < 8) || (i < 8 && j >= N - 8);
    let o = `<svg class="qr" viewBox="0 0 ${N} ${N}" role="img" aria-label="رمز الموعد" shape-rendering="crispEdges"><rect width="${N}" height="${N}" fill="#fff"/>`;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      if (finder(i, j)) continue;
      const on = (i === 6 || j === 6) ? (i + j) % 2 === 0 : rnd() > 0.52;
      const hole = Math.abs(i - 14) < 4 && Math.abs(j - 14) < 4;
      if (on && !hole) o += `<rect x="${i}" y="${j}" width="1" height="1" fill="#1A0A11"/>`;
    }
    [[0, 0], [N - 7, 0], [0, N - 7]].forEach(([a, b]) => {
      o += `<rect x="${a}" y="${b}" width="7" height="7" fill="#1A0A11"/><rect x="${a + 1}" y="${b + 1}" width="5" height="5" fill="#fff"/><rect x="${a + 2}" y="${b + 2}" width="3" height="3" fill="#1A0A11"/>`;
    });
    return o + `<svg x="10.5" y="10.5" width="8" height="8" viewBox="-40 -40 80 80" class="qr-logo"><use href="#rosette"/></svg></svg>`;
  }

  /* ---------- state ---------- */
  const KEY = 'salonati.v1';
  let S;
  function loadState() {
    S = null;
    try { const raw = localStorage.getItem(KEY); if (raw) { const v = JSON.parse(raw); if (v && v.v === SEED().v) S = v; } } catch (e) { S = null; }
    if (!S) S = SEED();
    App.S = S;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked: demo still runs in memory */ } }
  function resetDemo() { S = SEED(); App.S = S; save(); nav.stack = []; start(); }

  /* ---------- demo clock and dates ---------- */
  const now = () => Date.now() + (S.clock || 0);
  const MONTHS = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
  const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  function hm(ts) { const d = new Date(ts); let h = d.getHours(); const m = d.getMinutes(); const ap = h < 12 ? 'ص' : 'م'; h = h % 12 || 12; return `${h}:${String(m).padStart(2, '0')} ${ap}`; }
  function dayDiff(ts) { const d = new Date(ts), n = new Date(now()); return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 864e5); }
  function dayLabel(ts) {
    const diff = dayDiff(ts), d = new Date(ts);
    if (diff === 0) return 'اليوم'; if (diff === 1) return 'باجر'; if (diff === -1) return 'البارحة';
    return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }
  const dateLong = (ts) => { const d = new Date(ts); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
  const when = (ts) => `${dayLabel(ts)} · ${hm(ts)}`;
  function dur(mins) {
    mins = Math.max(0, Math.round(mins));
    const h = Math.floor(mins / 60), m = mins % 60, p = [];
    if (h) p.push(h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : `${h} ساعات`);
    if (m || !h) p.push(`${m} دقيقة`);
    return p.join(' و');
  }
  function ago(ts) {
    const m = Math.round((now() - ts) / 60000);
    if (m < 1) return 'هسة'; if (m < 60) return `قبل ${m} دقيقة`;
    const h = Math.round(m / 60); if (h < 24) return h === 1 ? 'قبل ساعة' : h === 2 ? 'قبل ساعتين' : `قبل ${h} ساعات`;
    const d = Math.round(h / 24); return d === 1 ? 'البارحة' : d === 2 ? 'قبل يومين' : `قبل ${d} أيام`;
  }

  /* ---------- catalog and booking rules ---------- */
  const svc = (id) => SVC.find((x) => x.id === id);
  const salon = (id) => SALONS[+id];
  const lenK = (id) => (LEN.find((l) => l.id === id) || LEN[1]).k;
  const offerFor = (sid, svcId) => S.offers.find((o) => +o.s === +sid && o.svc === svcId && o.left > 0);
  function price(sid, svcId, len) {
    const v = svc(svcId), s = salon(sid);
    const base = r1k(v.p * s.f * (v.len ? lenK(len || 'm') : 1));
    const o = offerFor(sid, svcId);
    return o ? { p: r1k(base * (1 - o.pct)), old: base, offer: o } : { p: base, old: 0 };
  }
  const deposit = (total, bride) => bride ? r1k(total * 0.3) : total <= 25000 ? 5000 : r1k(total * 0.2);
  const itemsText = (b) => b.items.map((it) => svc(it.svc).n).join(' + ');
  const itemsDur = (b) => b.items.reduce((a, it) => a + svc(it.svc).d, 0);

  function phase(b) {
    if (b.status === 'cancelled') return 'cancelled';
    if (b.status === 'done') return b.rated || !b.mine ? 'rated' : 'done';
    if (b.status === 'inservice') return 'inservice';
    if (b.status === 'arrived') return 'arrived';
    if (b.status === 'noshow') return 'missed';
    const m = (b.at - now()) / 60000;
    if (m > 60) return 'open';
    if (m > 30) return 'locked';
    if (m > -15) return 'qr';
    return 'missed';
  }
  const PHASE = {
    open: { n: 'مؤكد', tone: 'ok', icon: 'check-c' },
    locked: { n: 'مؤكد · الإلغاء مقفول', tone: 'warn', icon: 'lock' },
    qr: { n: 'الرمز جاهز', tone: 'pri', icon: 'qr' },
    arrived: { n: 'وصلتي', tone: 'ok', icon: 'pin' },
    inservice: { n: 'الخدمة شغالة', tone: 'pri', icon: 'sparkle' },
    done: { n: 'خلصت · قيّمي', tone: 'gold', icon: 'star' },
    rated: { n: 'مكتمل', tone: 'muted', icon: 'check' },
    cancelled: { n: 'ملغي', tone: 'muted', icon: 'close' },
    missed: { n: 'فات الموعد', tone: 'err', icon: 'alert' }
  };
  function codeFor(b, w) {
    if (w == null) w = Math.floor(now() / 30000);
    let h = 2166136261; const s = b.id + ':' + w;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return String(100000 + ((h >>> 0) % 900000));
  }
  const codeOk = (b, code) => { const w = Math.floor(now() / 30000); return code === codeFor(b, w) || code === codeFor(b, w - 1); };
  const mine = () => (S.user.registered ? S.bookings.filter((b) => b.mine) : []);
  const upcoming = () => mine().filter((b) => ['open', 'locked', 'qr', 'arrived', 'inservice', 'done'].includes(phase(b))).sort((a, b) => a.at - b.at);

  /* ---------- roles and navigation ---------- */
  const ROLES = (App.ROLES = {
    client: {
      n: 'زبونة', home: 'c.home', nav: [
        { id: 'c.home', icon: 'home', n: 'الرئيسية' },
        { id: 'c.reels', icon: 'reels', n: 'ريلز' },
        { id: 'c.bookings', icon: 'cal', n: 'مواعيدي', badge: () => upcoming().filter((b) => phase(b) !== 'done').length },
        { id: 'c.gifts', icon: 'gift', n: 'هدايا' },
        { id: 'c.me', icon: 'user', n: 'حسابي' }
      ]
    },
    salon: {
      n: 'صاحبة صالون', home: 's.today', nav: [
        { id: 's.today', icon: 'cal', n: 'اليوم' },
        { id: 's.scan', icon: 'scan', n: 'مسح' },
        { id: 's.cashier', icon: 'cash', n: 'الصندوق' },
        { id: 's.clients', icon: 'users', n: 'زبوناتي' },
        { id: 's.more', icon: 'grid', n: 'المزيد' }
      ]
    },
    admin: {
      n: 'الإدارة', home: 'a.dash', nav: [
        { id: 'a.dash', icon: 'chart', n: 'الملخص' },
        { id: 'a.review', icon: 'clipboard', n: 'مراجعة', badge: () => S.posts.filter((p) => p.status === 'pending').length },
        { id: 'a.salons', icon: 'shield', n: 'التوثيق' },
        { id: 'a.campaigns', icon: 'megaphone', n: 'حملات' },
        { id: 'a.more', icon: 'grid', n: 'المزيد' }
      ]
    }
  });

  const nav = { stack: [] };
  let appEl, vpEl, layerEl, timers = [], cleanups = [];
  const cur = () => nav.stack[nav.stack.length - 1];
  function rememberScroll() { const e = cur(), sc = vpEl && $('.scr', vpEl); if (e && sc) e.scroll = sc.scrollTop; }
  function go(id, p) { rememberScroll(); nav.stack.push({ id, p: p || {} }); render(1); }
  function replace(id, p) { nav.stack[nav.stack.length - 1] = { id, p: p || {} }; render(0); }
  function back() {
    if (closeSheet()) return;
    if (nav.stack.length > 1) { nav.stack.pop(); render(-1); }
  }
  function tabTo(id) { rememberScroll(); nav.stack = [{ id, p: {} }]; render(0); }
  function refresh() { render(0, true); }
  function setRole(role) {
    S.role = role; save(); closeSheet(true);
    if (role === 'client' && !S.onboarded) { nav.stack = [{ id: 'c.splash', p: {} }]; render(0); }
    else tabTo(ROLES[role].home);
    App.Style && App.Style.sync && App.Style.sync();
  }

  function clearTimers() { timers.forEach((t) => { clearInterval(t); clearTimeout(t); }); timers = []; cleanups.forEach((f) => { try { f(); } catch (e) { /* ignore */ } }); cleanups = []; }
  App.every = (fn, ms) => { const t = setInterval(fn, ms); timers.push(t); return t; };
  App.later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  App.onLeave = (fn) => cleanups.push(fn);

  function header(sc) {
    const showBack = sc.back !== false && nav.stack.length > 1;
    return `<header class="hdr${sc.hdrCls ? ' ' + sc.hdrCls : ''}">
      ${showBack ? `<button type="button" class="ibtn" data-a="back" aria-label="رجوع">${ic('arrow-r')}</button>` : ''}
      <div class="hdr-t"><h1 tabindex="-1">${sc.title}</h1>${sc.sub ? `<p>${sc.sub}</p>` : ''}</div>
      <div class="hdr-a">${sc.actions || ''}</div>
    </header>`;
  }

  function bottomNav(active) {
    const items = ROLES[S.role].nav;
    return `<nav class="bnav" aria-label="التنقل الرئيسي">${items.map((it) => {
      const on = it.id === active, b = it.badge ? it.badge() : 0;
      return `<button type="button" class="bn${on ? ' on' : ''}" data-a="tab" data-to="${it.id}" ${on ? 'aria-current="page"' : ''}>${icb(it.icon, 'nav')}<span>${it.n}</span>${b ? `<i class="nbadge num" aria-label="${b}">${b}</i>` : ''}</button>`;
    }).join('')}</nav>`;
  }

  function offlineStrip() {
    if (!S.offline) return '';
    return `<div class="offline" role="status">${ic('wifioff')}<span>ماكو نت. التطبيق يشتغل بآخر نسخة، ويتزامن لما يرجع</span></div>`;
  }

  function render(dir, keep) {
    const e = cur();
    if (!e) return;
    const def = SCREENS[e.id];
    if (!def) { console.warn('Missing screen', e.id); return; }
    const oldScr = $('.scr', vpEl);
    const keepTop = keep && oldScr ? oldScr.scrollTop : (dir < 0 ? (e.scroll || 0) : 0);
    clearTimers();
    let sc;
    try { sc = def(e.p || {}, e) || {}; } catch (err) { console.error(err); sc = { title: 'صار خطأ', body: emptyState({ icon: 'alert', tone: 'rose', title: 'صار خطأ بهالشاشة', text: String(err.message || err), action: '<button type="button" class="btn" data-a="home">رجوع للرئيسية</button>' }) }; }
    if (sc.redirect) { nav.stack[nav.stack.length - 1] = { id: sc.redirect, p: sc.redirectP || {} }; return render(dir, false); }
    const head = sc.head != null ? sc.head : (sc.title != null ? header(sc) : '');
    const view = document.createElement('div');
    view.className = `view ${sc.cls || ''} ${keep ? '' : dir > 0 ? 'enter-f' : dir < 0 ? 'enter-b' : 'enter-0'}`;
    view.dataset.screen = e.id;
    view.innerHTML = `${offlineStrip()}${head}<main class="scr" id="scr">${sc.body || ''}</main>${sc.bar ? `<div class="stbar">${sc.bar}</div>` : ''}${sc.nav ? bottomNav(sc.nav) : ''}`;
    vpEl.replaceChildren(view);
    const scr = $('.scr', view);
    if (scr && keepTop) scr.scrollTop = keepTop;
    appEl.dataset.screen = e.id;
    if (sc.after) { try { sc.after(view, e.p || {}); } catch (err) { console.error(err); } }
    if (!keep) {
      const h1 = $('h1', view);
      if (h1 && dir !== 0) h1.focus({ preventScroll: true });
    }
    App.Studio && App.Studio.onScreen && App.Studio.onScreen(e.id);
  }

  /* ---------- layer: sheets, toasts, banners, confirmation ---------- */
  let lastFocus = null;
  function sheet(html, o) {
    o = o || {};
    closeSheet(true);
    const w = document.createElement('div');
    w.className = 'sheet-wrap';
    w.innerHTML = `<div class="sheet-bg" data-a="close"></div><section class="sheet ${o.cls || ''}" role="dialog" aria-modal="true" aria-label="${esc(o.label || 'نافذة')}" tabindex="-1"><div class="grab" aria-hidden="true"></div><div class="sheet-in">${html}</div></section>`;
    layerEl.appendChild(w);
    App.sheetEl = w;
    lastFocus = document.activeElement;
    requestAnimationFrame(() => w.classList.add('open'));
    $('.sheet', w).focus({ preventScroll: true });
    if (o.after) o.after($('.sheet', w));
    return $('.sheet', w);
  }
  function sheetUpdate(html) { const s = App.sheetEl && $('.sheet-in', App.sheetEl); if (s) s.innerHTML = html; }
  function closeSheet(instant) {
    const w = App.sheetEl;
    if (!w) return false;
    App.sheetEl = null;
    $$('video', w).forEach((v) => v.pause());
    if (instant) w.remove(); else { w.classList.remove('open'); setTimeout(() => w.remove(), 240); }
    if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
    return true;
  }
  function toast(msg, o) {
    o = o || {};
    const t = document.createElement('div');
    t.className = `toast ${o.tone || ''}`;
    t.setAttribute('role', 'status');
    t.innerHTML = `${o.icon ? ic(o.icon) : ''}<span>${msg}</span>`;
    layerEl.appendChild(t);
    setTimeout(() => t.classList.add('out'), o.ms || 2600);
    setTimeout(() => t.remove(), (o.ms || 2600) + 400);
  }
  function banner(n) {
    $$('.banner', layerEl).forEach((b) => b.remove());
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'banner';
    b.setAttribute('role', 'status');
    b.innerHTML = `${icb(n.icon || 'bell', n.tone || 'rose')}<span class="tx"><b>${n.title}</b><span>${n.text || ''}</span></span><span class="m">هسة</span>`;
    b.addEventListener('click', () => { b.remove(); if (n.to) go(n.to, n.p || {}); });
    layerEl.appendChild(b);
    setTimeout(() => b.classList.add('out'), 4600);
    setTimeout(() => b.remove(), 5000);
  }
  function confirmBox(o) {
    sheet(`<div class="confirm">${icb(o.icon || 'help', o.tone || 'rose', 'xl')}<h2>${o.title}</h2>${o.text ? `<p>${o.text}</p>` : ''}
      <div class="btns"><button type="button" class="btn ${o.danger ? 'danger' : ''} block lg" data-a="confirmOk">${o.ok || 'أكيد'}</button>
      <button type="button" class="btn ghost block" data-a="close">${o.cancel || 'لا، رجوع'}</button></div></div>`, { label: o.title});
    App._confirm = o.onOk;
  }
  ACT.confirmOk = () => { const f = App._confirm; App._confirm = null; closeSheet(true); f && f(); };

  function notify(n) {
    n.id = 'n' + Date.now() + Math.floor(Math.random() * 999);
    n.t = now();
    S.notifications.unshift(n);
    save();
    if (n.role === S.role) banner(n);
    App.Studio && App.Studio.sync && App.Studio.sync();
  }
  const unread = (role) => (role === 'client' && !S.user.registered ? 0 : S.notifications.filter((n) => n.role === role && !S.read[n.id]).length);

  function celebrate() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || (App.Style && App.Style.get('motion') === 'off')) return;
    const box = document.createElement('div');
    box.className = 'confetti';
    box.setAttribute('aria-hidden', 'true');
    let h = '';
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * 100, d = 0.9 + Math.random() * 1.2, r = Math.random() * 360, s = 10 + Math.random() * 14, del = Math.random() * 0.35;
      h += `<svg viewBox="-12 -40 24 32" style="left:${x}%;width:${s}px;height:${s * 1.3}px;animation-duration:${d}s;animation-delay:${del}s;--r:${r}deg" class="${i % 3 ? 'p1' : 'p2'}"><use href="#petal"/></svg>`;
    }
    box.innerHTML = h;
    layerEl.appendChild(box);
    setTimeout(() => box.remove(), 2600);
  }

  /* ---------- shared UI fragments ---------- */
  function emptyState(o) {
    return `<div class="empty">${icb(o.icon || 'info', o.tone || 'rose', 'xl')}<h2>${o.title}</h2>${o.text ? `<p class="m">${o.text}</p>` : ''}${o.action || ''}</div>`;
  }
  const pill = (t, tone, icon) => `<span class="pill ${tone || ''}">${icon ? ic(icon) : ''}${t}</span>`;
  const verified = () => `<span class="vbadge">${ic('shield')}موثّق</span>`;
  const rating = (r, n) => `<span class="rate num">${ic('star')}${r}${n ? `<small> (${n})</small>` : ''}</span>`;
  const avatar = (name, tone) => `<span class="ava t-${tone || 'rose'}" aria-hidden="true">${esc(String(name).charAt(0))}</span>`;
  const sw = (on, a, label, extra) => `<button type="button" class="switch" role="switch" aria-checked="${!!on}" data-a="${a}" ${extra || ''} aria-label="${esc(label)}"><i></i></button>`;
  const phasePill = (b) => { const p = PHASE[phase(b)]; return pill(p.n, p.tone, p.icon); };

  /* ---------- events ---------- */
  function bindEvents() {
    appEl.addEventListener('click', (e) => {
      const el = e.target.closest('[data-a],[data-go]');
      if (!el || !appEl.contains(el) || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
      const d = el.dataset;
      if (d.a) { const f = ACT[d.a]; if (f) f(el, d, e); else console.warn('Missing action', d.a); }
      else if (d.go) { const p = Object.assign({}, d); delete p.go; go(d.go, p); }
    });
    appEl.addEventListener('input', (e) => { const el = e.target.closest('[data-in]'); if (el && ACT[el.dataset.in]) ACT[el.dataset.in](el, el.dataset, e); });
    appEl.addEventListener('change', (e) => { const el = e.target.closest('[data-ch]'); if (el && ACT[el.dataset.ch]) ACT[el.dataset.ch](el, el.dataset, e); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && App.sheetEl) { e.preventDefault(); closeSheet(); } });
  }

  Object.assign(ACT, {
    back: () => back(),
    tab: (el, d) => tabTo(d.to),
    home: () => tabTo(ROLES[S.role].home),
    close: () => closeSheet()
  });

  /* ---------- device frame scaling and status bar ---------- */
  function fitDevice() {
    const wrap = $('#deviceWrap'), dev = $('#device');
    if (!wrap || !dev) return;
    if (window.matchMedia('(max-width: 899px)').matches || dev.dataset.frame === 'none') { dev.style.transform = ''; return; }
    const W = dev.offsetWidth, H = dev.offsetHeight;
    const k = Math.min(1, (wrap.clientHeight - 32) / H, (wrap.clientWidth - 32) / W);
    dev.style.transform = `scale(${k})`;
  }
  function tickStatus() { const t = $('#sbTime'); if (t) { const d = new Date(now()); t.textContent = `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`; } }

  function start() {
    if (S.role === 'client' && !S.onboarded) { nav.stack = [{ id: 'c.splash', p: {} }]; render(0); }
    else tabTo(ROLES[S.role].home);
  }

  App.boot = function () {
    loadState();
    appEl = $('#app');
    appEl.innerHTML = '<div class="viewport" id="vp"></div><div class="layer" id="layer"></div>';
    vpEl = $('#vp');
    layerEl = $('#layer');
    App.Style && App.Style.init && App.Style.init();
    bindEvents();
    start();
    fitDevice();
    window.addEventListener('resize', fitDevice);
    tickStatus();
    setInterval(tickStatus, 15000);
    App.Studio && App.Studio.init && App.Studio.init();
  };

  Object.assign(App, {
    go, back, replace, tabTo, refresh, setRole, render, save, resetDemo, fitDevice, tickStatus,
    sheet, sheetUpdate, closeSheet, toast, banner, confirmBox, notify, unread, celebrate,
    nav, cur, now, phase, PHASE, codeFor, codeOk, upcoming, mine, price, deposit, offerFor
  });
  Object.assign(window, {
    $, $$, esc, money, iqd, r1k, ic, icb, rose, img, vsrc, petals, qrSvg,
    hm, dayLabel, dayDiff, dateLong, when, dur, ago, MONTHS, DAYS,
    svc, salon, lenK, itemsText, itemsDur, emptyState, pill, verified, rating, avatar, sw, phasePill
  });
  Object.defineProperty(window, 'S', { get: () => S, configurable: true });
})();
