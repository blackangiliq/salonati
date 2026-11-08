/* Salon-owner role: today's schedule, QR check-in, walk-ins, checkout, cash drawer, clients, offers and back-office tools.
   Action names start with s_ so they never collide with the client or admin roles.
   Per-screen working state lives on the nav entry (e.st): it survives refresh() and resets on a fresh visit. */
(function () {
  'use strict';
  const A = App.ACT;
  const now = () => App.now();
  const SID = () => +S.salon.id;
  const my = () => salon(SID());
  const ext = () => (S.salon.x = S.salon.x || {});
  const st = () => App.cur().st || (App.cur().st = {});
  const H = 3600e3;

  /* ---------- client records (salon side) ---------- */
  const CLIENTS = {
    'نور': { phone: '0770 123 4512', visits: 3, lastDays: 34, since: 'آب 2026', fav: 'سارة', consent: 'توافق على صور الشعر بدون وجه',
      formula: [{ d: '29 آب', f: '6.3 + 7.0 بنسبة 1:1 · أوكسجين 20 · 30 دقيقة', batch: 'B-198' }], notes: 'تحب الشاي بدون سكر، وتفضل سارة' },
    'سارة م.': { phone: '0771 222 8890', visits: 9, lastDays: 40, since: 'شباط 2026', fav: 'سارة', consent: 'لا توافق على النشر', debt: 5000,
      allergy: 'تحسس من مادة الأمونيا. اختبار قبل أي صبغة',
      formula: [{ d: '14 أيلول', f: '7.3 + 8.0 بنسبة 1:1 · أوكسجين 20 · 35 دقيقة', batch: 'B-204' }, { d: '2 تموز', f: '7.3 · أوكسجين 20 · 30 دقيقة', batch: 'B-171' }] },
    'هبة ك.': { phone: '0780 410 3321', visits: 5, lastDays: 0, since: 'أيار 2026', fav: 'زينب', consent: 'توافق على صور الأظافر' },
    'مريم ع.': { phone: '0790 655 1402', visits: 0, lastDays: null, since: 'جديدة من التطبيق', isNew: true, consent: 'ما محددة' },
    'رغد': { phone: '0772 019 7744', visits: 7, lastDays: 21, since: 'كانون الثاني 2026', fav: 'زينب', consent: 'توافق على صور الأظافر' },
    'هدى س.': { phone: '0770 908 1166', visits: 4, lastDays: 66, since: 'آذار 2026', fav: 'هبة', consent: 'لا توافق على النشر' },
    'زينب ع.': { phone: '0781 340 2290', visits: 6, lastDays: 92, since: 'كانون الأول 2025', fav: 'سارة', consent: 'لا توافق على النشر', debt: 10000 },
    'آيات ر.': { phone: '0773 776 5012', visits: 2, lastDays: 58, since: 'تموز 2026', fav: 'هبة', consent: 'ما محددة' },
    'شهد': { phone: '0770 330 9981', visits: 11, lastDays: 12, since: 'تشرين الأول 2025', fav: 'سارة', consent: 'توافق على صور الشعر', allergy: 'بشرة حساسة للشمع الحار' }
  };
  const TAG = { new: ['جديدة', 'gold', 'sparkle'], regular: ['دائمة', 'ok', 'heart'], absent: ['غائبة', 'warn', 'clock'] };

  function client(name) {
    const base = CLIENTS[name] || { phone: '07xx xxx xxxx', visits: 1, lastDays: 0, since: 'هذا الشهر', consent: 'ما محددة', isNew: true };
    const over = (ext().cl || {})[name] || {};
    const c = Object.assign({ name, debt: 0, formula: [], notes: '' }, base, over);
    if (name === S.user.name) c.allergy = S.user.allergy;
    c.visits += S.bookings.filter((b) => b.cust === name && b.paid && b.finished).length;
    c.tag = c.isNew && c.visits === 0 ? 'new' : c.lastDays != null && c.lastDays > 45 ? 'absent' : 'regular';
    return c;
  }
  function setClient(name, patch) {
    const m = (ext().cl = ext().cl || {});
    m[name] = Object.assign(m[name] || {}, patch);
    App.save();
  }
  function clientNames() {
    const set = new Set(Object.keys(CLIENTS));
    S.bookings.filter((b) => +b.s === SID()).forEach((b) => set.add(b.cust));
    return Array.from(set);
  }
  const lastText = (c) => c.lastDays == null ? 'ما زارت بعد' : c.lastDays === 0 ? 'زارت اليوم' : `آخر زيارة قبل ${c.lastDays} يوم`;
  const tagPill = (c) => pill(TAG[c.tag][0], TAG[c.tag][1], TAG[c.tag][2]);

  /* ---------- bookings ---------- */
  const findB = (id) => S.bookings.find((b) => b.id === id);
  const isLive = (b) => !['cancelled', 'noshow'].includes(b.status);
  const todays = () => S.bookings.filter((b) => +b.s === SID() && dayDiff(b.at) === 0).sort((a, b) => a.at - b.at);
  const pending = () => S.bookings.filter((b) => +b.s === SID() && b.status === 'confirmed');
  const staffName = (b) => { const x = salon(b.s).staff[b.staff || 0]; return x ? x.n : 'أي موظفة'; };
  const extrasSum = (b) => (b.extras || []).reduce((a, x) => a + x.p, 0) + (b.extraReq && b.extraReq.status === 'yes' ? b.extraReq.p : 0);
  const due = (b) => Math.max(0, b.total + extrasSum(b) - (b.dep || 0));
  const PAY = { cash: ['كاش', 'cash', 'mint'], qi: ['كي كارد', 'card', 'amber'], zain: ['زين كاش', 'wallet', 'plum'], debt: ['دين على الزبونة', 'receipt', 'err'], wallet: ['رصيد التطبيق', 'wallet', 'rose'] };
  const catOf = (id) => CATS.find((c) => c.id === svc(id).cat) || CATS[0];
  const dayAt = (h) => { const d = new Date(now()); d.setHours(h, 0, 0, 0); return d.getTime(); };
  const mmss = (ms) => { const t = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); };
  const seedOf = (s) => Array.from(String(s)).reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) >>> 0, 7);
  const basePrice = (id) => r1k(svc(id).p * my().f * (svc(id).len ? lenK('m') : 1));

  function stat(b) {
    const ph = App.phase(b), late = Math.round((now() - b.at) / 60000);
    if (ph === 'open' || ph === 'locked') return { n: 'مؤكد', tone: 'ok', icon: 'check-c' };
    if (ph === 'qr') return late > 0 ? { n: `متأخرة ${late} دقيقة`, tone: 'warn', icon: 'clock' } : { n: 'توصل قريباً', tone: 'pri', icon: 'clock' };
    if (ph === 'arrived') return { n: 'وصلت', tone: 'ok', icon: 'pin' };
    if (ph === 'inservice') return { n: 'بالخدمة', tone: 'pri', icon: 'sparkle' };
    if (ph === 'done' || ph === 'rated') return { n: b.paid ? 'خلصت ومدفوعة' : 'خلصت', tone: 'muted', icon: 'check' };
    if (ph === 'cancelled') return { n: 'ملغي', tone: 'muted', icon: 'close' };
    return { n: 'ما حضرت', tone: 'err', icon: 'alert' };
  }

  // Hours between 10:00 and 20:00 that are still ahead and have no booking at all. Runs of 2+ hours become offer prompts.
  function freeRuns() {
    const busy = todays().filter(isLive).map((b) => [b.at, b.at + itemsDur(b) * 60000]);
    const nowH = new Date(now()).getHours();
    const runs = [];
    let run = null;
    for (let h = 10; h < 20; h++) {
      const a = dayAt(h), z = a + H;
      const free = h > nowH && !busy.some(([s, e]) => s < z && e > a);
      if (free) { if (run) run.to = h + 1; else run = { from: h, to: h + 1 }; } else if (run) { runs.push(run); run = null; }
    }
    if (run) runs.push(run);
    return runs.filter((r) => r.to - r.from >= 2);
  }
  const freeHours = () => freeRuns().reduce((a, r) => a + r.to - r.from, 0);

  function checkIn(b) {
    b.status = 'arrived';
    b.arrivedAt = now();
    if (S.offline) S.salon.sync = (S.salon.sync || 0) + 1;
    if (b.mine) App.notify({ role: 'client', icon: 'pin', tone: 'ok', title: 'أهلاً بيچ بالصالون', text: 'سجلنا وصولچ، الخدمة تبدأ قريباً', to: 'c.ticket', p: { id: b.id } });
    App.save();
  }
  function nextDue() {
    const pool = pending().filter((b) => App.phase(b) !== 'missed');
    const list = pool.length ? pool : pending();
    if (!list.length) return null;
    return list.find((b) => b.mine) || list.slice().sort((a, b) => Math.abs(a.at - now()) - Math.abs(b.at - now()))[0];
  }
  const noBooking = () => ({ title: 'الموعد', body: emptyState({ icon: 'cal', tone: 'muted', title: 'ما لقينا هذا الموعد', text: 'يمكن انلغى أو انمسح من الجهاز', action: '<button type="button" class="btn" data-a="tab" data-to="s.today">رجوع لجدول اليوم</button>' }) });

  /* ---------- s.today ---------- */
  function rowHtml(b) {
    const t = stat(b), c = client(b.cust), [tm, ap] = hm(b.at).split(' ');
    const src = b.walkin ? 'بدون حجز' : b.src || 'التطبيق';
    return `<button type="button" class="sx-row" data-go="s.booking" data-id="${b.id}">
      <span class="sx-time num">${tm}<small>${ap}</small></span>
      <span class="sx-card st-${t.tone}">${avatar(b.cust, c.tag === 'new' ? 'gold' : b.mine ? 'plum' : 'rose')}
        <span class="tx"><b class="clip">${esc(b.cust)}</b><span class="m clip">${itemsText(b)} · ${staffName(b)}</span>
          <span class="sx-pills">${pill(t.n, t.tone, t.icon)}${c.tag === 'new' ? pill('جديدة', 'gold', 'sparkle') : ''}${c.allergy ? pill('حساسية', 'err', 'alert') : ''}<span class="m">${src}</span></span></span>
        ${ic('chev-l')}</span></button>`;
  }
  function gapHtml(r) {
    const a = hm(dayAt(r.from)), z = hm(dayAt(r.to)), [tm, ap] = a.split(' ');
    return `<button type="button" class="sx-row" data-go="s.offer" data-from="${r.from}" data-to="${r.to}">
      <span class="sx-time num">${tm}<small>${ap}</small></span>
      <span class="sx-gap">${icb('zap', 'gold', 'sm')}<span class="tx"><b>ساعات فارغة</b><span class="m">${a} – ${z} · ${r.to - r.from} ساعات بدون مواعيد</span></span><span class="pill gold">اعملي عرض</span></span></button>`;
  }

  App.SCREENS['s.today'] = () => {
    const s = my(), list = todays(), runs = S.salon.closed ? [] : freeRuns();
    const came = list.filter((b) => ['arrived', 'inservice', 'done'].includes(b.status)).length;
    const missed = list.filter((b) => App.phase(b) === 'missed').length;
    const rows = list.map((b) => ({ t: b.at, h: rowHtml(b) })).concat(runs.map((r) => ({ t: dayAt(r.from), h: gapHtml(r) }))).sort((a, b) => a.t - b.t);
    const un = App.unread('salon');
    let sync = '';
    if (S.offline) sync = `<div class="sec"><div class="rule">${ic('wifioff')}<span>ماكو نت. الجدول والمسح والكاشير يشتغلون على الجهاز${S.salon.sync ? `، و${S.salon.sync} عمليات تنتظر المزامنة` : ''}.</span></div></div>`;
    else if (S.salon.sync) sync = `<div class="sec"><div class="rule ok">${ic('refresh')}<span>رجع النت وتزامنت ${S.salon.sync} عمليات</span></div></div>`;
    return {
      title: s.n,
      sub: `${dateLong(now())} · ${S.salon.closed ? 'اليوم مسكّر' : 'مفتوح هسة'}`,
      actions: `<button type="button" class="ibtn" data-a="s_notifs" aria-label="إشعارات الصالون">${ic('bell')}${un ? `<i class="dot num">${un}</i>` : ''}</button>`,
      nav: 's.today',
      body: `${sync}
        <div class="sec"><div class="sx-kpi">
          <div>${icb('cal', 'rose', 'sm')}<b>${list.filter(isLive).length}</b>مواعيد</div>
          <div>${icb('check-c', 'ok', 'sm')}<b>${came}</b>حضرن</div>
          <div class="${missed ? 'bad' : ''}">${icb('alert', 'err', 'sm')}<b>${missed}</b>ما حضرت</div>
          <button type="button" class="gold" data-go="s.offer">${icb('zap', 'gold', 'sm')}<b>${freeHours()}</b>ساعة فارغة</button>
        </div></div>
        <div class="sec">
          <button type="button" class="btn lg block" data-go="s.scan">${ic('scan')} امسحي رمز الزبونة</button>
          <div class="btnrow"><button type="button" class="btn plain" data-go="s.walkin">${ic('door')} بدون حجز</button><button type="button" class="btn plain" data-go="s.offer">${ic('tag')} عرض ساعة</button></div>
        </div>
        <div class="sec"><div class="sec-h"><h2>${ic('clock')} جدول اليوم</h2><span class="m">${list.length} مواعيد</span></div>
          ${S.salon.closed ? `<div class="rule info">${ic('lock')}<span>اليوم مسكّر بالصندوق. المواعيد تبقى ظاهرة للمراجعة.</span></div>` : ''}
          ${rows.length ? `<div class="sx-tl">${rows.map((r) => r.h).join('')}</div>` : emptyState({ icon: 'cal', tone: 'rose', title: 'ماكو مواعيد اليوم', text: 'انشري عرض للساعات الفارغة حتى يوصل للبنات القريبات', action: '<button type="button" class="btn" data-go="s.offer">اعملي عرض</button>' })}
          <p class="tip adv">${ic('info')}<span>الصف الذهبي يعني ساعات فارغة. اضغطي عليه حتى تنزلين عرض بدقيقة.</span></p>
        </div>`,
      after: () => { if (!S.offline && S.salon.sync) App.later(() => { S.salon.sync = 0; App.save(); }, 50); }
    };
  };

  A.s_notifs = () => {
    const list = S.notifications.filter((n) => n.role === 'salon');
    list.forEach((n) => { S.read[n.id] = true; });
    App.save();
    App.refresh();
    App.sheet(`<div class="sheet-h"><h2>إشعارات الصالون</h2><button type="button" class="ibtn" data-a="close" aria-label="إغلاق">${ic('close')}</button></div>
      ${list.length ? `<div class="list">${list.map((n) => `<button type="button" class="notif" data-a="s_notifGo" data-id="${n.id}">${icb(n.icon || 'bell', n.tone || 'rose')}<span class="tx"><b>${n.title}</b><span>${n.text || ''}</span><span class="m">${ago(n.t)}</span></span></button>`).join('')}</div>`
        : emptyState({ icon: 'bell', tone: 'muted', title: 'ماكو إشعارات', text: 'الحجوزات الجديدة ورد الإدارة يوصلون هنا' })}`, { label: 'إشعارات الصالون' });
  };
  A.s_notifGo = (el, d) => {
    const n = S.notifications.find((x) => x.id === d.id);
    App.closeSheet(true);
    if (n && n.to) App.go(n.to, n.p || {});
  };

  /* ---------- s.scan ---------- */
  let code = '', codeErr = '';
  App.SCREENS['s.scan'] = () => {
    const demo = nextDue();
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clr', '0', 'del'];
    return {
      title: 'مسح رمز الزبونة',
      sub: S.offline ? 'بدون نت: الرقم يتأكد على الجهاز' : 'وجّهي الكاميرا على رمز الزبونة',
      nav: 's.scan',
      body: `<div class="sec">
          <div class="sx-vf" id="sxVf" aria-hidden="true"><i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c4"></i><b class="sx-line"></b><span>${ic('qr')} حطي الرمز داخل المربع</span></div>
          <button type="button" class="btn lg block" data-a="s_simScan">${ic('scan')} محاكاة مسح</button>
        </div>
        <div class="sec"><div class="sec-h"><h2>${ic('wifioff')} إذا ما تشتغل الكاميرا أو النت</h2></div>
          <p class="m sx-p">اكتبي الرقم اللي يظهر بتذكرة الزبونة (6 أرقام)</p>
          <div class="digits${codeErr ? ' sx-bad' : ''}" aria-live="polite" aria-label="الرقم المكتوب ${code}">${[0, 1, 2, 3, 4, 5].map((i) => `<span class="${i === code.length ? 'on' : ''}">${code[i] || ''}</span>`).join('')}</div>
          ${codeErr ? `<p class="err-t" role="alert">${ic('alert')}${codeErr}</p>` : ''}
          <div class="keypad">${keys.map((k) => `<button type="button" data-a="s_key" data-k="${k}" aria-label="${k === 'del' ? 'امسحي رقم' : k === 'clr' ? 'امسحي الكل' : k}">${k === 'del' ? ic('backspace') : k === 'clr' ? '<span class="sx-clr">مسح</span>' : k}</button>`).join('')}</div>
          ${demo ? `<p class="tip">${ic('info')}<span>للتجربة فقط: رقم ${esc(demo.cust)} هسة <b class="num" dir="ltr" id="sxDemo">${App.codeFor(demo)}</b>، ويتغير كل 30 ثانية</span></p>` : ''}
        </div>`,
      after: (v) => {
        if (!demo) return;
        App.every(() => { const t = $('#sxDemo', v); if (t) t.textContent = App.codeFor(demo); }, 1000);
      }
    };
  };

  function arrivedSheet(b) {
    const c = client(b.cust);
    App.sheet(`<div class="confirm">
        <div class="bigcheck">${ic('check')}</div>
        <h2>وصلت ${esc(b.cust)}</h2>
        <p>${itemsText(b)} · مع ${staffName(b)}</p>
        ${dayDiff(b.at) !== 0 ? `<p class="m">موعدها الأصلي ${when(b.at)}</p>` : ''}
        ${c.allergy ? `<div class="rule err sx-w">${ic('alert')}<span><b>تنبيه حساسية:</b> ${esc(c.allergy)}</span></div>` : ''}
        <div class="card sx-w"><div class="kv"><span>العربون المدفوع</span><b>${iqd(b.dep || 0)}</b></div><div class="kv"><span>الباقي بالصالون</span><b>${iqd(due(b))}</b></div></div>
        <div class="btns"><button type="button" class="btn block lg" data-a="s_start" data-id="${b.id}">${ic('sparkle')} ابدئي الخدمة</button>
        <button type="button" class="btn ghost block" data-a="s_openB" data-id="${b.id}">${ic('user')} تفاصيل الموعد</button></div></div>`,
    { label: 'وصلت الزبونة'});
  }

  A.s_simScan = (el) => {
    const b = nextDue();
    if (!b) { App.toast('ماكو موعد ينتظر المسح هسة', { icon: 'info' }); return; }
    const vf = $('#sxVf');
    if (vf) vf.classList.add('busy');
    el.disabled = true;
    App.later(() => { checkIn(b); App.refresh(); arrivedSheet(b); }, 900);
  };
  A.s_key = (el, d) => {
    if (codeErr) { code = ''; codeErr = ''; }
    if (d.k === 'del') code = code.slice(0, -1);
    else if (d.k === 'clr') code = '';
    else if (code.length < 6) code += d.k;
    if (code.length === 6) {
      const b = pending().find((x) => App.codeOk(x, code));
      if (b) { code = ''; checkIn(b); App.refresh(); arrivedSheet(b); return; }
      codeErr = 'الرقم غلط أو خلص وقته. خلّي الزبونة تقرا الرقم الجديد من تذكرتها';
    }
    App.refresh();
  };
  A.s_start = (el, d) => {
    const b = findB(d.id);
    if (!b) return;
    b.status = 'inservice';
    b.started = now();
    if (b.mine) App.notify({ role: 'client', icon: 'sparkle', tone: 'pri', title: 'بدأت خدمتچ', text: `${staffName(b)} بدأت ${itemsText(b)}`, to: 'c.ticket', p: { id: b.id } });
    App.save();
    App.closeSheet(true);
    const c = App.cur();
    if (c.id === 's.booking' && c.p.id === b.id) App.refresh(); else App.go('s.booking', { id: b.id });
  };
  A.s_openB = (el, d) => { App.closeSheet(true); App.go('s.booking', { id: d.id }); };

  /* ---------- s.booking ---------- */
  App.SCREENS['s.booking'] = (p) => {
    const b = findB(p.id);
    if (!b) return noBooking();
    const c = client(b.cust), t = stat(b), ph = App.phase(b), late = Math.round((now() - b.at) / 60000);
    const pay = PAY[b.pay] || PAY.cash;
    let bar = '';
    if (b.status === 'confirmed') {
      bar = ph === 'missed'
        ? `<div class="btnrow sx-fill"><button type="button" class="btn danger" data-a="s_noshow" data-id="${b.id}">${ic('alert')} ما حضرت</button><button type="button" class="btn" data-a="s_checkin" data-id="${b.id}">${ic('pin')} وصلت متأخرة</button></div>`
        : `<div class="btnrow sx-fill">${ph === 'qr' && late > 0 ? `<button type="button" class="btn danger" data-a="s_noshow" data-id="${b.id}">ما حضرت</button>` : ''}<button type="button" class="btn" data-a="s_checkin" data-id="${b.id}">${ic('pin')} سجلي وصولها</button></div>`;
    } else if (b.status === 'arrived') {
      bar = `<button type="button" class="btn block lg" data-a="s_start" data-id="${b.id}">${ic('sparkle')} ابدئي الخدمة</button>`;
    } else if (b.status === 'inservice') {
      bar = `<div class="tx"><span class="m">صار لها · من ${itemsDur(b)} دقيقة</span><b class="num" id="sxTimer">${mmss(now() - (b.started || now()))}</b></div><button type="button" class="btn" data-go="s.checkout" data-id="${b.id}">${ic('receipt')} خلصت · للحساب</button>`;
    } else if (b.status === 'done') {
      bar = `<button type="button" class="btn plain block" data-go="s.checkout" data-id="${b.id}">${ic('receipt')} ${b.paid ? 'شوفي الفاتورة' : 'للحساب'}</button>`;
    }
    const formula = c.formula && c.formula[0];
    return {
      title: esc(b.cust),
      sub: `${when(b.at)} · ${staffName(b)}`,
      body: `<div class="sec">
          <div class="card"><div class="row start">${avatar(b.cust, c.tag === 'new' ? 'gold' : 'rose')}<span class="tx"><b>${esc(b.cust)}</b><span class="m">${c.visits ? `${c.visits} زيارات · ${lastText(c)}` : 'أول زيارة للصالون'}</span><span class="sx-pills">${tagPill(c)}${pill(t.n, t.tone, t.icon)}${b.mine ? pill('من التطبيق', 'pri', 'reels') : ''}</span></span></div>
            <div class="sx-actions"><button type="button" data-a="s_call" data-name="${esc(b.cust)}">${icb('phone', 'teal', 'sm')}<span>اتصال</span></button><button type="button" data-a="s_call" data-name="${esc(b.cust)}">${icb('whatsapp', 'mint', 'sm')}<span>واتساب</span></button><button type="button" data-go="s.client" data-name="${esc(b.cust)}">${icb('user', 'rose', 'sm')}<span>ملفها</span></button></div>
          </div>
          ${c.allergy ? `<div class="rule err">${ic('alert')}<span><b>تنبيه حساسية:</b> ${esc(c.allergy)}</span></div>` : ''}
          ${b.status === 'noshow' ? `<div class="rule err">${ic('info')}<span>انحسبت ما حضرت. العربون يروح للصالون بعد خصم حصة المنصة، والزبونة تقدر تعترض إذا حضرت فعلاً.</span></div>` : ''}
          ${b.status === 'cancelled' ? `<div class="rule info">${ic('close')}<span>الزبونة ألغت الموعد قبل الوقت المسموح، ورجع عربونها.</span></div>` : ''}
        </div>
        <div class="sec"><div class="sec-h"><h2>${ic('sparkle')} الخدمات</h2><span class="m">${itemsDur(b)} دقيقة</span></div>
          <div class="list">${b.items.map((it) => { const v = svc(it.svc), cat = catOf(it.svc); return `<div class="li">${icb(cat.icon, cat.tone, 'sm')}<span class="tx"><b>${v.n}</b><span class="m">${v.d} دقيقة${it.len ? ' · شعر ' + (LEN.find((l) => l.id === it.len) || LEN[1]).n : ''}</span></span></div>`; }).join('')}</div>
        </div>
        <div class="sec"><div class="card">
          <div class="kv"><span>قيمة الخدمات</span><b>${iqd(b.total)}</b></div>
          ${extrasSum(b) ? `<div class="kv"><span>إضافات</span><b>${iqd(extrasSum(b))}</b></div>` : ''}
          <div class="kv"><span>العربون المدفوع · ${pay[0]}</span><b>−${money(b.dep || 0)}</b></div>
          <div class="kv tot"><span>${b.paid ? 'انقبض' : 'الباقي بالصالون'}</span><b>${iqd(b.paid ? b.final || 0 : due(b))}</b></div>
        </div></div>
        ${formula ? `<div class="sec"><div class="sec-h"><h2>${ic('drop')} تركيبة الصبغة</h2><button type="button" class="more" data-a="s_formula" data-name="${esc(b.cust)}">${ic('plus')} تركيبة اليوم</button></div>
          <div class="card"><div class="row"><b>${formula.f}</b></div><span class="m">آخر مرة ${formula.d} · المادة دفعة ${formula.batch}</span></div></div>` : ''}
        <div class="sec"><div class="li">${icb('camera', 'plum', 'sm')}<span class="tx"><b>الصور</b><span class="m">${esc(c.consent)}</span></span></div></div>`,
      bar,
      after: (v) => {
        if (b.status !== 'inservice') return;
        App.every(() => { const el = $('#sxTimer', v); if (el) el.textContent = mmss(now() - (b.started || now())); }, 1000);
      }
    };
  };

  A.s_checkin = (el, d) => { const b = findB(d.id); if (!b) return; checkIn(b); App.toast(`سجلنا وصول ${b.cust}`, { icon: 'pin', tone: 'ok' }); App.refresh(); };
  A.s_noshow = (el, d) => {
    const b = findB(d.id);
    App.confirmBox({
      icon: 'alert', tone: 'err', danger: true, title: 'تسجلينها ما حضرت؟',
      text: 'العربون يروح للصالون بعد خصم حصة المنصة، والزبونة تقدر تعترض إذا حضرت فعلاً.', ok: 'إي، ما حضرت',
      onOk: () => {
        b.status = 'noshow';
        if (b.mine) App.notify({ role: 'client', icon: 'alert', tone: 'err', title: 'فات موعدچ', text: 'سجل الصالون إنچ ما حضرتي. إذا حضرتي فعلاً تكدرين تعترضين', to: 'c.ticket', p: { id: b.id } });
        App.save(); App.refresh();
      }
    });
  };
  A.s_call = (el, d) => {
    const c = client(d.name);
    App.sheet(`<div class="sheet-h"><h2>رقم ${esc(c.name)}</h2><button type="button" class="ibtn" data-a="close" aria-label="إغلاق">${ic('close')}</button></div>
      <p class="sx-phone num" dir="ltr">${c.phone}</p>
      <button type="button" class="btn block" data-a="s_copy" data-t="${c.phone}">${ic('copy')} انسخي الرقم</button>
      <p class="tip">${ic('lock')}<span>الرقم يظهر لصاحبة الصالون فقط، والموظفات ما يكدرن يصدّرن أرقام الزبونات.</span></p>`, { label: 'رقم الزبونة' });
  };
  A.s_copy = (el, d) => {
    try {
      navigator.clipboard.writeText(d.t).then(() => App.toast('انسخ الرقم', { icon: 'copy' }), () => App.toast('ما انسخ، اكتبيه يدوياً', { icon: 'info' }));
    } catch (e) { App.toast('ما انسخ، اكتبيه يدوياً', { icon: 'info' }); }
  };
  A.s_formula = (el, d) => {
    App.sheet(`<div class="sheet-h"><h2>تركيبة اليوم · ${esc(d.name)}</h2><button type="button" class="ibtn" data-a="close" aria-label="إغلاق">${ic('close')}</button></div>
      <div class="field"><label for="sxF">الدرجات والأوكسجين والوقت</label><textarea id="sxF" class="inp" placeholder="مثلاً 7.3 + 8.0 بنسبة 1:1 · أوكسجين 20 · 35 دقيقة"></textarea></div>
      <button type="button" class="btn block" data-a="s_formulaSave" data-name="${esc(d.name)}">${ic('check')} احفظي بملفها</button>`, { label: 'تركيبة الصبغة' });
  };
  A.s_formulaSave = (el, d) => {
    const v = ($('#sxF') || {}).value || '';
    if (!v.trim()) { App.toast('اكتبي التركيبة أول', { icon: 'alert' }); return; }
    const dt = new Date(now());
    setClient(d.name, { formula: [{ d: `${dt.getDate()} ${MONTHS[dt.getMonth()]}`, f: v.trim(), batch: 'B-' + (200 + dt.getDate()) }].concat(client(d.name).formula || []) });
    App.closeSheet(true);
    App.toast('انحفظت التركيبة', { icon: 'check-c', tone: 'ok' });
    App.refresh();
  };

  /* ---------- s.checkout ---------- */
  const EXTRAS = [['حواجب بالخيط', 5000, 'eye', 'sky'], ['ماسك ترطيب', 15000, 'drop', 'teal'], ['مساج اليدين', 8000, 'henna', 'amber'], ['حمام زيت', 10000, 'leaf', 'mint'], ['رسم أظافر', 10000, 'nail', 'gold'], ['غسل إضافي', 3000, 'drop', 'sky']];
  function lines(b) {
    if (b.items.length === 1) return [{ n: svc(b.items[0].svc).n, p: b.total }];
    return b.items.map((it) => ({ n: svc(it.svc).n, p: it.p || App.price(b.s, it.svc, it.len).p }));
  }
  function receipt(b) {
    const parts = b.payParts || [];
    return {
      title: 'الفاتورة', sub: `${esc(b.cust)} · ${when(b.finished || b.at)}`,
      body: `<div class="done-hero"><div class="bigcheck">${ic('check')}</div><h1>انقبض الحساب</h1><p class="m">${esc(b.cust)} · ${itemsText(b)}</p></div>
        <div class="sec"><div class="card">
          ${lines(b).map((l) => `<div class="kv"><span>${l.n}</span><b>${money(l.p)}</b></div>`).join('')}
          ${(b.extras || []).map((x) => `<div class="kv"><span>${x.n}</span><b>${money(x.p)}</b></div>`).join('')}
          ${b.extraReq && b.extraReq.status === 'yes' ? `<div class="kv"><span>${b.extraReq.n}</span><b>${money(b.extraReq.p)}</b></div>` : ''}
          <div class="kv"><span>العربون</span><b>−${money(b.dep || 0)}</b></div>
          ${parts.map((x) => `<div class="kv"><span>${(PAY[x.m] || PAY.cash)[0]}</span><b>${money(x.amt)}</b></div>`).join('')}
          <div class="kv tot"><span>المدفوع بالصالون</span><b>${iqd(b.final || 0)}</b></div>
        </div></div>
        <div class="sec"><div class="ticket">${qrSvg(seedOf(b.id))}<b>فاتورة ${b.id.toUpperCase()}</b><span class="m">الزبونة تمسحها حتى تحفظ الفاتورة بهاتفها، وفيها المواد المستخدمة</span></div></div>
        ${b.mine ? `<div class="sec"><div class="rule ok">${ic('star')}<span>وصل للزبونة طلب تقييم، وانضافت لها بتلة بالتطبيق.</span></div></div>` : ''}`,
      bar: `<div class="btnrow sx-fill"><button type="button" class="btn plain" data-go="s.client" data-name="${esc(b.cust)}">${ic('user')} ملفها</button><button type="button" class="btn" data-a="tab" data-to="s.today">${ic('cal')} جدول اليوم</button></div>`
    };
  }

  App.SCREENS['s.checkout'] = (p, e) => {
    const b = findB(p.id);
    if (!b) return noBooking();
    if (b.paid) return receipt(b);
    const total = due(b);
    e.st = e.st || { m: ['cash'], first: null };
    const ps = e.st, two = ps.m.length === 2;
    if (two && (ps.first == null || ps.first > total)) ps.first = r1k(total / 2);
    const req = b.extraReq;
    const reqPill = req ? (req.status === 'pending' ? pill('بانتظار موافقتها', 'warn', 'clock') : req.status === 'yes' ? pill('وافقت', 'ok', 'check') : pill('رفضت', 'err', 'close')) : '';
    const c = client(b.cust);
    return {
      title: 'الحساب', sub: `${esc(b.cust)} · ${itemsText(b)}`,
      body: `<div class="sec"><div class="card">
          ${lines(b).map((l) => `<div class="kv"><span>${l.n}</span><b>${money(l.p)}</b></div>`).join('')}
          ${(b.extras || []).map((x) => `<div class="kv"><span>${x.n} · إضافة</span><b>${money(x.p)}</b></div>`).join('')}
          ${req ? `<div class="kv"><span>${req.n} · ${reqPill}</span><b class="${req.status === 'yes' ? '' : 'strike'}">${money(req.p)}</b></div>` : ''}
          <button type="button" class="btn soft sm" data-a="s_extra" data-id="${b.id}" ${req && req.status === 'pending' ? 'disabled' : ''}>${ic('plus')} أضيفي خدمة أو منتج</button>
          <div class="kv"><span>العربون المدفوع · ${(PAY[b.pay] || PAY.cash)[0]}</span><b>−${money(b.dep || 0)}</b></div>
          <div class="kv tot"><span>المطلوب هسة</span><b>${iqd(total)}</b></div>
        </div>
        ${req && req.status === 'pending' ? `<div class="rule">${ic('clock')}<span>أرسلنا الإضافة لتطبيق الزبونة. ما تنحسب إلا بموافقتها.</span></div><button type="button" class="btn ghost sm" data-a="s_cancelReq" data-id="${b.id}">الغي طلب الإضافة</button>` : ''}
        ${c.debt ? `<div class="rule info">${ic('receipt')}<span>عليها دين سابق ${money(c.debt)} د.ع. تقدرين تسددينه من ملفها.</span></div>` : ''}
        </div>
        <div class="sec"><div class="sec-h"><h2>${ic('wallet')} طريقة الدفع</h2><span class="m">تقدرين تختارين طريقتين</span></div>
          <div class="sx-methods">${['cash', 'qi', 'zain', 'debt'].map((k) => `<button type="button" data-a="s_method" data-k="${k}" aria-pressed="${ps.m.includes(k)}">${icb(PAY[k][1], PAY[k][2])}<b>${PAY[k][0]}</b></button>`).join('')}</div>
          ${two ? `<div class="card"><label class="lbl" for="sxSplit">تقسيم المبلغ</label>
            <input type="range" id="sxSplit" min="0" max="${total}" step="1000" value="${ps.first}" data-in="s_split" aria-label="مبلغ ${PAY[ps.m[0]][0]}">
            <div class="kv"><span>${PAY[ps.m[0]][0]}</span><b id="sxA1">${money(ps.first)}</b></div><div class="kv"><span>${PAY[ps.m[1]][0]}</span><b id="sxA2">${money(total - ps.first)}</b></div></div>` : ''}
          ${ps.m.includes('debt') ? `<div class="rule info">${ic('info')}<span>الدين ينضاف على ملف الزبونة ويظهر بتقرير آخر اليوم.</span></div>` : ''}
          ${S.offline ? `<div class="rule">${ic('wifioff')}<span>ماكو نت. الدفع ينحفظ على الجهاز ويتزامن بعدين. كي كارد وزين كاش يحتاجن نت.</span></div>` : ''}
        </div>`,
      bar: `<div class="tx"><span class="m">المطلوب</span><b class="num">${money(total)} د.ع</b></div><button type="button" class="btn" data-a="s_pay" data-id="${b.id}" ${req && req.status === 'pending' ? 'disabled' : ''}>${ic('check')} تأكيد الدفع</button>`
    };
  };

  A.s_extra = (el, d) => {
    const b = findB(d.id);
    App.sheet(`<div class="sheet-h"><h2>إضافة على الحساب</h2><button type="button" class="ibtn" data-a="close" aria-label="إغلاق">${ic('close')}</button></div>
      ${b.mine ? `<div class="rule info">${ic('info')}<span>هذي زبونة التطبيق. الإضافة توصلها بهاتفها وتحتاج موافقتها قبل ما تنحسب.</span></div>` : ''}
      <div class="list">${EXTRAS.map((x, i) => `<button type="button" class="li" data-a="s_extraPick" data-id="${b.id}" data-i="${i}">${icb(x[2], x[3], 'sm')}<span class="tx"><b>${x[0]}</b></span>${iqd(x[1])}</button>`).join('')}</div>`, { label: 'إضافة على الحساب' });
  };
  A.s_extraPick = (el, d) => {
    const b = findB(d.id), x = EXTRAS[+d.i];
    App.closeSheet(true);
    if (b.mine) {
      b.extraReq = { n: x[0], p: x[1], status: 'pending', t: now() };
      App.notify({ role: 'client', icon: 'tag', tone: 'gold', title: 'الصالون يطلب إضافة', text: `${x[0]} · ${money(x[1])} د.ع. وافقي أو ارفضي من تذكرتچ`, to: 'c.ticket', p: { id: b.id } });
      App.toast('انرسل الطلب لهاتف الزبونة', { icon: 'chat' });
    } else {
      (b.extras = b.extras || []).push({ n: x[0], p: x[1] });
      App.toast('انضافت للحساب', { icon: 'plus' });
    }
    App.save(); App.refresh();
  };
  A.s_cancelReq = (el, d) => { const b = findB(d.id); b.extraReq = null; App.save(); App.refresh(); };
  A.s_method = (el, d) => {
    const ps = st();
    const m = ps.m || (ps.m = ['cash']);
    const i = m.indexOf(d.k);
    if (i >= 0) { if (m.length > 1) m.splice(i, 1); } else { m.push(d.k); if (m.length > 2) m.shift(); }
    ps.first = null;
    App.refresh();
  };
  A.s_split = (el) => {
    const ps = st(), total = +el.max;
    ps.first = +el.value;
    const a = $('#sxA1'), z = $('#sxA2');
    if (a) a.textContent = money(ps.first);
    if (z) z.textContent = money(total - ps.first);
  };
  A.s_pay = (el, d) => {
    const b = findB(d.id), ps = st(), total = due(b);
    const m = ps.m || ['cash'];
    const parts = m.length === 2 ? [{ m: m[0], amt: ps.first == null ? r1k(total / 2) : ps.first }, { m: m[1], amt: 0 }] : [{ m: m[0], amt: total }];
    if (parts.length === 2) parts[1].amt = total - parts[0].amt;
    b.payParts = parts.filter((x) => x.amt > 0);
    b.paid = true;
    b.finished = now();
    b.final = total;
    const debt = parts.filter((x) => x.m === 'debt').reduce((a, x) => a + x.amt, 0);
    if (debt) setClient(b.cust, { debt: client(b.cust).debt + debt });
    if (S.offline) S.salon.sync = (S.salon.sync || 0) + 1;
    if (b.mine && typeof App.finishVisit === 'function') App.finishVisit(b);
    if (b.status !== 'done') b.status = 'done';
    App.save();
    App.toast('انقبض الحساب', { icon: 'check-c', tone: 'ok' });
    App.refresh();
  };

  /* ---------- s.walkin ---------- */
  App.SCREENS['s.walkin'] = (p, e) => {
    const s = my();
    e.st = e.st || { svc: null, staff: 0, name: '' };
    const w = e.st, total = w.svc ? App.price(SID(), w.svc, 'm').p : 0;
    return {
      title: 'زبونة بدون حجز', sub: 'تدخل بنفس الجدول حتى ما يصير تعارض',
      body: `<div class="sec"><div class="sec-h"><h2>${ic('sparkle')} شنو الخدمة؟</h2></div>
          <div class="sx-tiles">${s.svcs.map((id) => { const v = svc(id), c = catOf(id); return `<button type="button" class="sx-tile" data-a="s_wkSvc" data-v="${id}" aria-pressed="${w.svc === id}">${icb(c.icon, c.tone, 'lg')}<b>${v.n}</b><span class="num m">${money(App.price(SID(), id, 'm').p)}</span></button>`; }).join('')}</div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('users')} منو تسويها؟</h2></div></div>
        <div class="staff-pick">${s.staff.map((x, i) => `<button type="button" data-a="s_wkStaff" data-i="${i}" aria-pressed="${w.staff === i}">${avatar(x.n, 'rose')}<span>${x.n}</span><span class="m">${x.role}</span></button>`).join('')}</div>
        <div class="sec"><div class="field"><label for="sxWkName">اسمها (اختياري)</label><input id="sxWkName" class="inp" value="${esc(w.name)}" data-in="s_wkName" placeholder="مثلاً: أم علي" autocomplete="off"></div>
          <p class="tip">${ic('info')}<span>إذا عندها حساب بالتطبيق، امسحي رمزها حتى تنحسب زيارتها وبتلاتها.</span></p></div>`,
      bar: `<div class="tx"><span class="m">${w.svc ? svc(w.svc).n : 'اختاري خدمة'}</span><b class="num">${money(total)} د.ع</b></div><button type="button" class="btn" data-a="s_wkGo" ${w.svc ? '' : 'disabled'}>${ic('play')} تبدأ هسة</button>`
    };
  };
  A.s_wkSvc = (el, d) => { st().svc = d.v; App.refresh(); };
  A.s_wkStaff = (el, d) => { st().staff = +d.i; App.refresh(); };
  A.s_wkName = (el) => { st().name = el.value; };
  A.s_wkGo = () => {
    const w = st();
    if (!w.svc) return;
    const id = 'w' + Date.now();
    S.bookings.push({ id, cust: (w.name || '').trim() || 'زبونة بدون حجز', s: SID(), items: [{ svc: w.svc, len: 'm' }], staff: w.staff, at: now(), total: App.price(SID(), w.svc, 'm').p, dep: 0, pay: 'cash', status: 'inservice', started: now(), walkin: true, src: 'بدون حجز' });
    S.salon.walkins = (S.salon.walkins || 0) + 1;
    if (S.offline) S.salon.sync = (S.salon.sync || 0) + 1;
    App.save();
    App.toast('انضافت للجدول وبدت الخدمة', { icon: 'check-c', tone: 'ok' });
    App.replace('s.booking', { id });
  };

  /* ---------- s.offer ---------- */
  const AREA_POP = { mansour: 2100, yarmouk: 1400, harthiya: 1250, karrada: 1900, zayouna: 1600, adhamiya: 1100, jadriya: 900, saydiya: 1000 };
  function windows(p) {
    const list = [];
    const add = (f, t) => { const w = { from: hm(dayAt(f)), to: hm(dayAt(t)) }; if (!list.some((x) => x.from === w.from)) list.push(w); };
    if (p.from) add(+p.from, +p.to);
    freeRuns().forEach((r) => add(r.from, r.to));
    [[11, 13], [13, 15], [15, 17], [17, 19]].forEach(([f, t]) => add(f, t));
    return list.slice(0, 5);
  }
  const audience = (pct) => Math.round(((AREA_POP[my().area] || 1000) * (0.45 + pct / 100)) / 10) * 10;

  App.SCREENS['s.offer'] = (p, e) => {
    const s = my();
    if (!e.st) e.st = { svc: s.svcs[0], pct: 30, win: 0, seats: 3, done: false };
    const o = e.st, wins = windows(p), w = wins[o.win] || wins[0], base = basePrice(o.svc), nw = r1k(base * (1 - o.pct / 100));
    if (o.done) {
      return {
        title: 'نزل العرض', 
        body: `<div class="done-hero"><div class="bigcheck">${ic('check')}</div><h1>نزل العرض</h1><p class="m">يوصل لـ ${money(audience(o.pct))} زبونة قريبة بإشعار واحد، حسب إعداداتهن</p></div>
          <div class="sec"><div class="oc sx-oc"><div class="ph">${img(s.cover + '-wide', '', s.n)}<span class="pill gold">${ic('zap')}عرض الساعة</span><span class="tm">${ic('clock')}${w.from} – ${w.to}</span></div>
            <div class="bd"><b>${svc(o.svc).n}</b><span class="m">${s.n} · ${s.lm}</span><span class="price num">${money(nw)} د.ع <span class="strike">${money(base)}</span></span><span class="m">باقي ${o.seats} أماكن</span></div></div></div>
          <div class="sec"><p class="tip">${ic('info')}<span>العمولة بس على الزبونة الجديدة اللي تحضر وينمسح رمزها. زبونتچ القديمة بدون عمولة.</span></p></div>`,
        bar: `<div class="btnrow sx-fill"><button type="button" class="btn plain" data-a="s_asClient">${ic('user')} شوفيه كزبونة</button><button type="button" class="btn" data-a="tab" data-to="s.today">${ic('cal')} جدول اليوم</button></div>`
      };
    }
    return {
      title: 'عرض الساعات الفارغة', sub: 'ينزل بدقيقة ويوصل للبنات القريبات',
      body: `<div class="sec"><div class="sec-h"><h2>${ic('sparkle')} الخدمة</h2></div>
          <div class="sx-tiles">${s.svcs.slice(0, 9).map((id) => { const v = svc(id), c = catOf(id); return `<button type="button" class="sx-tile" data-a="s_ofSvc" data-v="${id}" aria-pressed="${o.svc === id}">${icb(c.icon, c.tone)}<b>${v.n}</b></button>`; }).join('')}</div></div>
        <div class="sec"><div class="card">
          <div class="row"><label class="lbl" for="sxPct">${ic('percent')} الخصم</label><b class="sx-big num" id="sxPctV">${o.pct}%</b></div>
          <input type="range" id="sxPct" min="10" max="50" step="5" value="${o.pct}" data-in="s_ofPct" aria-label="نسبة الخصم">
          <div class="row"><span class="m">السعر قبل</span><span class="strike num">${money(base)}</span></div>
          <div class="row"><b>السعر بالعرض</b><b class="sx-big num" id="sxNew">${money(nw)} د.ع</b></div>
        </div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('clock')} الوقت</h2></div>
          <div class="sx-chips">${wins.map((x, i) => `<button type="button" class="chip" data-a="s_ofWin" data-i="${i}" aria-pressed="${o.win === i}">${x.from} – ${x.to}</button>`).join('')}</div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('users')} عدد الأماكن</h2></div>
          <div class="sx-chips">${[2, 3, 5, 8].map((n) => `<button type="button" class="chip num" data-a="s_ofSeats" data-n="${n}" aria-pressed="${o.seats === n}">${n} أماكن</button>`).join('')}</div></div>
        <div class="sec"><div class="card gold"><div class="row start">${icb('megaphone', 'gold')}<span class="tx"><b>يوصل لـ <span class="num" id="sxAud">${money(audience(o.pct))}</span> زبونة قريبة</b><span class="m">بمنطقة ${(AREAS.find((a) => a.id === s.area) || AREAS[0]).n} والقريب منها، للي وافقن على إشعارات العروض</span></span></div></div></div>`,
      bar: `<div class="tx"><span class="m">${svc(o.svc).n} · ${w.from}</span><b class="num">${money(nw)} د.ع</b></div><button type="button" class="btn gold" data-a="s_ofGo">${ic('megaphone')} انشري العرض</button>`
    };
  };
  A.s_ofSvc = (el, d) => { st().svc = d.v; App.refresh(); };
  A.s_ofWin = (el, d) => { st().win = +d.i; App.refresh(); };
  A.s_ofSeats = (el, d) => { st().seats = +d.n; App.refresh(); };
  A.s_ofPct = (el) => {
    const o = st();
    o.pct = +el.value;
    const nw = r1k(basePrice(o.svc) * (1 - o.pct / 100));
    const set = (id, t) => { const x = $(id); if (x) x.textContent = t; };
    set('#sxPctV', o.pct + '%');
    set('#sxNew', money(nw) + ' د.ع');
    set('#sxAud', money(audience(o.pct)));
    const bar = $('.stbar .num');
    if (bar) bar.textContent = money(nw) + ' د.ع';
  };
  A.s_ofGo = () => {
    const o = st(), s = my(), w = windows(App.cur().p)[o.win] || windows(App.cur().p)[0];
    S.offers = S.offers.filter((x) => !(+x.s === SID() && x.svc === o.svc));
    S.offers.push({ id: 'o' + Date.now(), s: SID(), svc: o.svc, pct: o.pct / 100, from: w.from, to: w.to, left: o.seats });
    App.notify({ role: 'client', icon: 'tag', tone: 'gold', title: 'عرض جديد قريب منچ', text: `${svc(o.svc).n} بخصم ${o.pct}% · ${s.n} · ${w.from} – ${w.to}`, to: 'c.salon', p: { id: String(SID()) } });
    o.done = true;
    App.save();
    App.refresh();
  };
  A.s_asClient = () => App.setRole('client');

  /* ---------- s.cashier ---------- */
  const BASE = { cash: 185000, qi: 62000, zain: 41000, dep: 15000, debt: 0, comm: 96000 };
  function dayTotals() {
    const t = Object.assign({}, BASE);
    todays().filter((b) => b.paid && b.payParts).forEach((b) => {
      b.payParts.forEach((x) => { t[x.m] = (t[x.m] || 0) + x.amt; });
      t.dep += b.dep || 0;
      t.comm += Math.round(((b.final || 0) + (b.dep || 0)) * 0.3);
    });
    t.exp = S.salon.expenses.reduce((a, x) => a + x.p, 0);
    t.income = t.cash + t.qi + t.zain + (t.wallet || 0) + t.dep;
    t.net = t.income - t.comm - t.exp;
    return t;
  }
  function countRes(v, cash) {
    const n = +String(v || '').replace(/[^\d]/g, '');
    if (!n) return '<p class="m sx-p">اكتبي المبلغ حتى نقارنه بالمتوقع</p>';
    const diff = n - cash;
    if (Math.abs(diff) < 1000) return `<div class="rule ok">${ic('check-c')}<span>الصندوق مطابق</span></div>`;
    return `<div class="rule err">${ic('alert')}<span>فرق ${money(Math.abs(diff))} د.ع (${diff < 0 ? 'ناقص' : 'زايد'}). راجعي الفواتير قبل الإغلاق.</span></div>`;
  }
  App.SCREENS['s.cashier'] = (p, e) => {
    e.st = e.st || { count: '' };
    const t = dayTotals(), s = my();
    const weights = [0.45, 0.35, 0.2, 0.15];
    const sum = s.staff.reduce((a, x, i) => a + (weights[i] || 0.1), 0);
    return {
      title: 'الصندوق', sub: `إغلاق ${dateLong(now())}`, nav: 's.cashier',
      body: `${S.salon.closed ? `<div class="sec"><div class="rule ok">${ic('lock')}<span>انغلق اليوم وانحفظ التقرير.</span></div></div>` : ''}
        <div class="sec"><div class="sx-net">${rose()}<span>صافي اليوم</span><b class="num">${money(t.net)} <small>د.ع</small></b><span>بعد الأجور والمصاريف · الجرد ${S.salon.closed ? 'مقفول' : 'مفتوح'}</span></div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('cash')} الداخل اليوم</h2></div><div class="card">
          <div class="kv"><span class="sx-k">${icb('cash', 'mint', 'sm')}كاش</span><b>${money(t.cash)}</b></div>
          <div class="kv"><span class="sx-k">${icb('card', 'amber', 'sm')}كي كارد</span><b>${money(t.qi)}</b></div>
          <div class="kv"><span class="sx-k">${icb('wallet', 'plum', 'sm')}زين كاش</span><b>${money(t.zain)}</b></div>
          <div class="kv"><span class="sx-k">${icb('reels', 'rose', 'sm')}عربون من التطبيق</span><b>${money(t.dep)}</b></div>
          ${t.debt ? `<div class="kv"><span class="sx-k">${icb('receipt', 'err', 'sm')}دين جديد (ما انقبض)</span><b>${money(t.debt)}</b></div>` : ''}
          <div class="kv tot"><span>المجموع</span><b>${iqd(t.income)}</b></div></div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('users')} أجور ونسب الموظفات</h2><b class="num">−${money(t.comm)}</b></div><div class="card">
          ${s.staff.map((x, i) => `<div class="kv"><span class="sx-k">${avatar(x.n, 'rose')}${x.n} · ${x.role}</span><b>${money(r1k(t.comm * (weights[i] || 0.1) / sum))}</b></div>`).join('')}</div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('receipt')} مصاريف اليوم</h2><button type="button" class="more" data-a="s_expAdd">${ic('plus')} أضيفي</button></div>
          ${S.salon.expenses.length ? `<div class="list">${S.salon.expenses.map((x, i) => `<div class="li">${icb(x.icon || 'receipt', 'amber', 'sm')}<span class="tx"><b>${esc(x.n)}</b></span><b class="num">${money(x.p)}</b><button type="button" class="ibtn" data-a="s_expDel" data-i="${i}" aria-label="احذفي ${esc(x.n)}">${ic('trash')}</button></div>`).join('')}</div>` : emptyState({ icon: 'receipt', tone: 'muted', title: 'ماكو مصاريف اليوم', text: 'المولدة والإيجار والمواد تدخل بحساب الربح الحقيقي' })}</div>
        <div class="sec"><div class="sec-h"><h2>${ic('wallet')} جرد الكاش</h2></div><div class="card">
          <div class="field"><label for="sxCount">شكد كاش بالدرج هسة؟</label><input id="sxCount" class="inp num" inputmode="numeric" dir="ltr" placeholder="${money(t.cash)}" value="${esc(e.st.count)}" data-in="s_count" autocomplete="off"></div>
          <div id="sxCountRes" aria-live="polite">${countRes(e.st.count, t.cash)}</div></div></div>
        <div class="sec"><div class="card gold"><div class="row start">${icb('trend', 'gold')}<span class="tx"><b>تنبيه الكلفة</b><span class="m">سعر البروتين ارتفع 12% مع الدولار. ربح الجلسة نزل إلى 31%.</span></span></div><button type="button" class="btn sm gold" data-go="s.profit">${ic('chart')} شوفي ربح الخدمات</button></div></div>`,
      bar: S.salon.closed
        ? `<button type="button" class="btn plain block" data-a="s_reopen">${ic('refresh')} افتحي يوم جديد</button>`
        : `<div class="tx"><span class="m">الكاش المتوقع بالدرج</span><b class="num">${money(t.cash)} د.ع</b></div><button type="button" class="btn" data-a="s_close">${ic('lock')} اغلقي اليوم</button>`
    };
  };
  A.s_count = (el) => {
    st().count = el.value;
    const r = $('#sxCountRes');
    if (r) r.innerHTML = countRes(el.value, dayTotals().cash);
  };
  A.s_close = () => App.confirmBox({
    icon: 'lock', tone: 'rose', title: 'تغلقين اليوم؟', text: `الصافي ${money(dayTotals().net)} د.ع. ينحفظ التقرير ويوصلچ ملخصه.`, ok: 'إي، اغلقي اليوم',
    onOk: () => { S.salon.closed = true; App.save(); App.toast('انغلق اليوم وانحفظ التقرير', { icon: 'lock', tone: 'ok' }); App.refresh(); }
  });
  A.s_reopen = () => { S.salon.closed = false; App.save(); App.refresh(); };

  const EXP = [['مولدة', 'zap'], ['إيجار', 'home'], ['مواد', 'drop'], ['كهرباء', 'sun'], ['أخرى', 'more']];
  A.s_expAdd = () => {
    App.sheet(`<div class="sheet-h"><h2>مصروف جديد</h2><button type="button" class="ibtn" data-a="close" aria-label="إغلاق">${ic('close')}</button></div>
      <div class="sx-tiles five">${EXP.map((x, i) => `<button type="button" class="sx-tile" data-a="s_expK" data-i="${i}" aria-pressed="${i === 0}">${icb(x[1], 'amber')}<b>${x[0]}</b></button>`).join('')}</div>
      <div class="field"><label for="sxExp">المبلغ بالدينار</label><input id="sxExp" class="inp num" inputmode="numeric" dir="ltr" placeholder="25,000" autocomplete="off"></div>
      <div class="sx-chips">${[5000, 10000, 25000, 50000].map((n) => `<button type="button" class="chip num" data-a="s_expAmt" data-n="${n}">${money(n)}</button>`).join('')}</div>
      <button type="button" class="btn block" data-a="s_expSave">${ic('check')} احفظي المصروف</button>`, { label: 'مصروف جديد' });
  };
  A.s_expK = (el) => { $$('[data-a="s_expK"]', App.sheetEl).forEach((b) => b.setAttribute('aria-pressed', String(b === el))); };
  A.s_expAmt = (el, d) => { const i = $('#sxExp'); if (i) i.value = money(+d.n); };
  A.s_expSave = () => {
    const amt = +String(($('#sxExp') || {}).value || '').replace(/[^\d]/g, '');
    if (!amt) { App.toast('اكتبي المبلغ', { icon: 'alert', tone: 'err' }); return; }
    const k = $('[data-a="s_expK"][aria-pressed="true"]', App.sheetEl);
    const x = EXP[k ? +k.dataset.i : 0];
    S.salon.expenses.push({ n: x[0], p: amt, icon: x[1] });
    App.save(); App.closeSheet(true); App.toast('انضاف المصروف', { icon: 'check-c' }); App.refresh();
  };
  A.s_expDel = (el, d) => { S.salon.expenses.splice(+d.i, 1); App.save(); App.refresh(); };

  /* ---------- s.clients ---------- */
  App.SCREENS['s.clients'] = (p, e) => {
    e.st = e.st || { f: 'all', q: '' };
    const all = clientNames().map(client);
    const F = [['all', 'الكل'], ['new', 'جديدة'], ['regular', 'دائمة'], ['absent', 'غائبة'], ['debt', 'عليها دين']];
    const list = all.filter((c) => e.st.f === 'all' ? true : e.st.f === 'debt' ? c.debt > 0 : c.tag === e.st.f);
    const absent = all.filter((c) => c.tag === 'absent');
    const q = e.st.q.trim();
    return {
      title: 'زبوناتي', sub: `${all.length} زبونة · سجل الزبونات ملك الصالون`, nav: 's.clients',
      body: `<div class="sec"><label class="search" for="sxQ">${ic('search')}<input id="sxQ" class="sx-q" type="search" placeholder="دوري باسم الزبونة" value="${esc(e.st.q)}" data-in="s_cq" autocomplete="off"></label></div>
        <div class="chips sx-mt">${F.map((f) => `<button type="button" class="chip" data-a="s_cf" data-f="${f[0]}" aria-pressed="${e.st.f === f[0]}">${f[1]}</button>`).join('')}</div>
        ${absent.length ? `<div class="sec"><div class="card gold"><div class="row start">${icb('heart', 'gold')}<span class="tx"><b>${absent.length} زبونات غايبات أكثر من 45 يوم</b><span class="m">رسالة اشتياق بعرض صغير ترجعهن</span></span></div><button type="button" class="btn sm gold" data-a="s_msgAbsent">${ic('whatsapp')} رسالة للغائبات</button></div></div>` : ''}
        <div class="sec">${list.length ? `<div class="list" id="sxCl">${list.map((c) => `<button type="button" class="li" data-go="s.client" data-name="${esc(c.name)}" data-q="${esc(c.name)}" ${q && !c.name.includes(q) ? 'hidden' : ''}>${avatar(c.name, c.tag === 'new' ? 'gold' : c.tag === 'absent' ? 'amber' : 'rose')}<span class="tx"><b>${esc(c.name)}</b><span class="m">${c.visits} زيارات · ${lastText(c)}</span><span class="sx-pills">${tagPill(c)}${c.debt ? pill('دين ' + money(c.debt), 'err') : ''}${c.allergy ? pill('حساسية', 'err', 'alert') : ''}</span></span>${ic('chev-l')}</button>`).join('')}</div>`
          : emptyState({ icon: 'users', tone: 'muted', title: 'ماكو زبونات بهالفلتر', action: '<button type="button" class="btn ghost" data-a="s_cf" data-f="all">شوفي الكل</button>' })}</div>`
    };
  };
  A.s_cf = (el, d) => { st().f = d.f; App.refresh(); };
  A.s_cq = (el) => {
    const q = el.value.trim();
    st().q = el.value;
    $$('#sxCl [data-q]').forEach((r) => { r.hidden = !!q && !r.dataset.q.includes(q); });
  };
  A.s_msgAbsent = () => {
    const absent = clientNames().map(client).filter((c) => c.tag === 'absent');
    App.sheet(`<div class="sheet-h"><h2>رسالة للغائبات</h2><button type="button" class="ibtn" data-a="close" aria-label="إغلاق">${ic('close')}</button></div>
      <div class="list">${absent.map((c) => `<div class="li">${avatar(c.name, 'amber')}<span class="tx"><b>${esc(c.name)}</b><span class="m">${lastText(c)}</span></span>${sw(true, 's_msgPick', 'إرسال إلى ' + c.name)}</div>`).join('')}</div>
      <div class="field"><label for="sxMsg">نص الرسالة</label><textarea id="sxMsg" class="inp">اشتقنالچ! خصم 20% على زيارتچ الجاية هذا الأسبوع. احجزي من صالوناتي وبنفس موظفتچ.</textarea></div>
      <p class="tip">${ic('lock')}<span>الرسالة تطلع باسم صالونچ، والموظفات ما يشوفن الأرقام.</span></p>
      <button type="button" class="btn wa block" data-a="s_msgSend">${ic('whatsapp')} أرسلي</button>`, { label: 'رسالة للغائبات' });
  };
  A.s_msgPick = (el) => el.setAttribute('aria-checked', String(el.getAttribute('aria-checked') !== 'true'));
  A.s_msgSend = () => {
    const n = $$('[data-a="s_msgPick"][aria-checked="true"]', App.sheetEl).length;
    if (!n) { App.toast('اختاري زبونة وحدة على الأقل', { icon: 'alert' }); return; }
    App.closeSheet(true);
    App.toast(`انرسلت الرسالة لـ ${n} زبونات`, { icon: 'check-c', tone: 'ok' });
  };

  /* ---------- s.client ---------- */
  App.SCREENS['s.client'] = (p) => {
    const c = client(p.name || '');
    const hist = S.bookings.filter((b) => b.cust === c.name && +b.s === SID()).sort((a, b) => b.at - a.at);
    return {
      title: esc(c.name), sub: `زبونة من ${c.since}`,
      body: `<div class="sec"><div class="row start">${avatar(c.name, c.tag === 'new' ? 'gold' : 'rose').replace('class="ava', 'class="ava lg')}<span class="tx"><b class="sx-big">${esc(c.name)}</b><span class="sx-pills">${tagPill(c)}</span><span class="m num" dir="ltr">${c.phone}</span></span></div>
          <div class="me-stats"><div><b class="num">${c.visits}</b>زيارات</div><div><b class="num">${c.lastDays == null ? '—' : c.lastDays}</b>يوم من آخر زيارة</div><div><b>${c.fav || '—'}</b>موظفتها</div></div>
          ${c.allergy ? `<div class="rule err">${ic('alert')}<span><b>تنبيه حساسية:</b> ${esc(c.allergy)}</span></div>` : ''}
          ${c.debt ? `<div class="card"><div class="row">${icb('receipt', 'err', 'sm')}<span class="tx"><b>عليها دين</b><span class="m">من زيارة سابقة</span></span><b class="num">${money(c.debt)}</b></div><button type="button" class="btn ok sm" data-a="s_debtPaid" data-name="${esc(c.name)}">${ic('check')} سددت</button></div>` : ''}
          <div class="sx-actions"><button type="button" data-a="s_bookFor" data-name="${esc(c.name)}">${icb('cal', 'rose', 'sm')}<span>احجزي لها</span></button><button type="button" data-a="s_call" data-name="${esc(c.name)}">${icb('phone', 'teal', 'sm')}<span>اتصال</span></button><button type="button" data-a="s_formula" data-name="${esc(c.name)}">${icb('drop', 'plum', 'sm')}<span>تركيبة</span></button></div>
        </div>
        <div class="sec"><div class="sec-h"><h2>${ic('drop')} تركيبات الصبغة</h2></div>
          ${(c.formula || []).length ? `<div class="list">${c.formula.map((f) => `<div class="li">${icb('drop', 'plum', 'sm')}<span class="tx"><b>${esc(f.f)}</b><span class="m">${f.d} · دفعة ${f.batch}</span></span></div>`).join('')}</div>` : '<p class="m sx-p">ماكو تركيبات محفوظة</p>'}</div>
        <div class="sec"><div class="li">${icb('camera', 'plum', 'sm')}<span class="tx"><b>موافقة الصور</b><span class="m">${esc(c.consent)}</span></span></div></div>
        <div class="sec"><div class="field"><label for="sxNote">${ic('edit')} ملاحظات خاصة</label><textarea id="sxNote" class="inp" data-in="s_note" data-name="${esc(c.name)}" placeholder="مثلاً: تحب الماء البارد">${esc(c.notes || '')}</textarea></div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('clock')} الزيارات</h2></div>
          ${hist.length ? `<div class="list">${hist.map((b) => { const t = stat(b); return `<button type="button" class="li" data-go="s.booking" data-id="${b.id}">${icb(catOf(b.items[0].svc).icon, catOf(b.items[0].svc).tone, 'sm')}<span class="tx"><b>${itemsText(b)}</b><span class="m">${when(b.at)} · ${staffName(b)}</span></span>${pill(t.n, t.tone)}</button>`; }).join('')}</div>` : '<p class="m sx-p">ماكو زيارات مسجلة بالتطبيق بعد</p>'}</div>`
    };
  };
  A.s_debtPaid = (el, d) => { setClient(d.name, { debt: 0 }); App.toast('انسجل التسديد', { icon: 'check-c', tone: 'ok' }); App.refresh(); };
  A.s_note = (el, d) => setClient(d.name, { notes: el.value });
  A.s_bookFor = (el, d) => {
    const s = my(), nowH = new Date(now()).getHours();
    let base = Math.max(nowH + 1, 10), tom = false;
    if (base > 18) { base = 10; tom = true; }
    const hours = [0, 1, 2, 3].map((i) => base + i).filter((h) => h < 20).map((h) => (tom ? h + 24 : h));
    App.sheet(`<div class="sheet-h"><h2>حجز لـ ${esc(d.name)}</h2><button type="button" class="ibtn" data-a="close" aria-label="إغلاق">${ic('close')}</button></div>
      <span class="lbl">${ic('sparkle')} الخدمة</span>
      <div class="sx-chips">${s.svcs.slice(0, 8).map((id, i) => `<button type="button" class="chip" data-a="s_pickOne" data-g="svc" data-v="${id}" aria-pressed="${i === 0}">${svc(id).n}</button>`).join('')}</div>
      <span class="lbl">${ic('clock')} الوقت</span>
      <div class="sx-chips">${hours.map((h, i) => `<button type="button" class="chip num" data-a="s_pickOne" data-g="h" data-v="${h}" aria-pressed="${i === 0}">${h >= 24 ? 'باجر ' : ''}${hm(dayAt(h % 24))}</button>`).join('')}</div>
      <p class="tip">${ic('info')}<span>الحجز من الصالون ما يحتاج عربون، ويوصل للزبونة تذكير إذا عندها حساب.</span></p>
      <button type="button" class="btn block" data-a="s_bookForGo" data-name="${esc(d.name)}">${ic('check')} ثبّتي الحجز</button>`, { label: 'حجز للزبونة' });
  };
  A.s_pickOne = (el, d) => { $$(`[data-a="s_pickOne"][data-g="${d.g}"]`, App.sheetEl).forEach((b) => b.setAttribute('aria-pressed', String(b === el))); };
  A.s_bookForGo = (el, d) => {
    const pick = (g) => { const x = $(`[data-a="s_pickOne"][data-g="${g}"][aria-pressed="true"]`, App.sheetEl); return x ? x.dataset.v : null; };
    const id = pick('svc'), h = +pick('h');
    const at = dayAt(h % 24) + (h >= 24 ? 864e5 : 0);
    S.bookings.push({ id: 'b' + Date.now(), cust: d.name, s: SID(), items: [{ svc: id, len: 'm' }], staff: 0, at, total: App.price(SID(), id, 'm').p, dep: 0, pay: 'cash', status: 'confirmed', src: 'هاتف' });
    App.save(); App.closeSheet(true);
    App.toast(`انحجز ${svc(id).n} ${when(at)}`, { icon: 'check-c', tone: 'ok' });
    App.tabTo('s.today');
  };

  /* ---------- s.more and back office ---------- */
  const MORE = [
    ['s.staff', 'الموظفات', 'users', 'rose'], ['s.stock', 'المخزن', 'box', 'amber'], ['s.profit', 'الربح', 'trend', 'teal'],
    ['s.reports', 'التقارير', 'chart', 'sky'], ['s.posts', 'منشوراتي', 'video', 'plum'], ['s.offer', 'عرض الساعة', 'tag', 'gold'],
    ['s.verify', 'ختم التوثيق', 'shield', 'teal'], ['s.steril', 'سجل التعقيم', 'spray', 'mint'], ['s.hours', 'الدوام', 'clock', 'sky'],
    ['s.plan', 'العضوية', 'crown', 'gold'], ['s.walkin', 'بدون حجز', 'door', 'rose'], ['switch', 'بدّلي الصالون', 'refresh', 'muted']
  ];
  App.SCREENS['s.more'] = () => {
    const s = my();
    return {
      title: 'المزيد', sub: 'كل أدوات الصالون', nav: 's.more', 
      body: `<div class="sec"><div class="sx-head">${img(s.cover + '-wide', '', s.n)}<div class="tx"><b>${s.n}</b><span class="sx-pills">${verified()}${rating(s.r, s.rev)}${s.founder ? pill('مؤسِّسة', 'gold', 'crown') : ''}</span><span class="m">${s.lm}</span></div></div></div>
        <div class="sec"><div class="sx-grid">${MORE.map((m) => `<button type="button" ${m[0] === 'switch' ? 'data-a="s_switch"' : `data-go="${m[0]}"`}>${icb(m[2], m[3], 'lg')}<span>${m[1]}</span></button>`).join('')}</div></div>`
    };
  };
  A.s_switch = () => {
    App.sheet(`<div class="sheet-h"><h2>بدّلي الصالون</h2><button type="button" class="ibtn" data-a="close" aria-label="إغلاق">${ic('close')}</button></div>
      <div class="list">${SALONS.map((s) => `<button type="button" class="li" data-a="s_switchTo" data-id="${s.id}" aria-current="${s.id === SID()}">${img(s.cover, 'sx-thumb', s.n)}<span class="tx"><b>${s.n}</b><span class="m">${s.lm}</span></span>${s.id === SID() ? pill('هسة', 'pri', 'check') : ic('chev-l')}</button>`).join('')}</div>`, { label: 'بدّلي الصالون' });
  };
  A.s_switchTo = (el, d) => {
    S.salon.id = +d.id;
    S.salon.closed = false;
    App.save(); App.closeSheet(true);
    App.toast(`صرتي تديرين ${my().n}`, { icon: 'refresh' });
    App.tabTo('s.today');
  };

  App.SCREENS['s.staff'] = () => {
    const s = my(), x = (ext().staff = ext().staff || {});
    const done = todays().filter((b) => b.paid);
    return {
      title: 'الموظفات', sub: 'دوام، نسب، وكرسي مؤجر', 
      body: `<div class="sec">${s.staff.map((m, i) => {
        const o = Object.assign({ att: true, comm: 30, chair: false }, x[m.n] || {});
        const earn = r1k(done.filter((b) => (b.staff || 0) === i).reduce((a, b) => a + (b.final || 0) + (b.dep || 0), 0) * o.comm / 100) + [42000, 31000, 18000][i % 3];
        return `<div class="card">
          <div class="row start">${avatar(m.n, 'rose')}<span class="tx"><b>${m.n}</b><span class="m">${m.role} · ${rating(m.r)}</span></span>${pill(o.att ? 'حاضرة' : 'غايبة', o.att ? 'ok' : 'muted', o.att ? 'check' : 'close')}</div>
          <div class="st-row sx-line2"><span>حاضرة اليوم</span>${sw(o.att, 's_att', 'حضور ' + m.n, `data-n="${m.n}"`)}</div>
          <div class="row"><span>نسبتها من الخدمة</span><span class="sx-chips">${[20, 30, 40].map((v) => `<button type="button" class="chip sx-sm num" data-a="s_comm" data-n="${m.n}" data-v="${v}" aria-pressed="${o.comm === v}">${v}%</button>`).join('')}</span></div>
          <div class="st-row sx-line2"><span>كرسي مؤجر</span>${sw(o.chair, 's_chair', 'كرسي مؤجر ' + m.n, `data-n="${m.n}"`)}</div>
          ${o.chair ? `<div class="rule info">${ic('info')}<span>تشوف دخلها فقط. حصة المركز 350,000 د.ع شهرياً، والتقرير جاهز للطرفين آخر الشهر.</span></div>` : ''}
          <div class="kv"><span>حصتها اليوم</span><b>${iqd(earn)}</b></div></div>`;
      }).join('')}
      <p class="tip">${ic('lock')}<span>الموظفة ما تشوف أرقام الزبونات ولا تقدر تغير الأسعار. الصلاحيات بيد صاحبة الصالون.</span></p></div>`
    };
  };
  const staffSet = (n, patch) => { const x = (ext().staff = ext().staff || {}); x[n] = Object.assign({ att: true, comm: 30, chair: false }, x[n] || {}, patch); App.save(); App.refresh(); };
  A.s_att = (el, d) => staffSet(d.n, { att: el.getAttribute('aria-checked') !== 'true' });
  A.s_chair = (el, d) => staffSet(d.n, { chair: el.getAttribute('aria-checked') !== 'true' });
  A.s_comm = (el, d) => staffSet(d.n, { comm: +d.v });

  function soon(exp) {
    const d = new Date(now());
    const m0 = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    const m1 = `${MONTHS[(d.getMonth() + 1) % 12]} ${d.getMonth() === 11 ? d.getFullYear() + 1 : d.getFullYear()}`;
    return exp === m0 || exp === m1;
  }
  App.SCREENS['s.stock'] = () => {
    const list = S.salon.stock;
    const low = list.filter((x) => x.q < x.min).length, exp = list.filter((x) => soon(x.exp)).length;
    return {
      title: 'المخزن', sub: 'المواد والدفعات وتواريخ الانتهاء', 
      body: `<div class="sec"><div class="sx-kpi three"><div class="${low ? 'bad' : ''}">${icb('box', 'err', 'sm')}<b>${low}</b>قليلة</div><div>${icb('clock', 'warn', 'sm')}<b>${exp}</b>تنتهي قريباً</div><div>${icb('check-c', 'ok', 'sm')}<b>${list.length - low}</b>كافية</div></div>
          <div class="rule info">${ic('shield')}<span>المادة المنتهية تنمنع من الاستخدام بالخدمة، وفاتورة الزبونة تذكر الدفعة المستخدمة.</span></div></div>
        <div class="sec"><div class="list">${list.map((x, i) => `<div class="li">${icb('drop', x.q < x.min ? 'err' : 'amber', 'sm')}<span class="tx"><b>${esc(x.n)}</b><span class="m">ينتهي ${x.exp}</span><span class="sx-pills">${x.q < x.min ? pill('قليل', 'err', 'alert') : ''}${soon(x.exp) ? pill('ينتهي قريباً', 'warn', 'clock') : ''}</span></span>
          <span class="sx-qty"><button type="button" class="ibtn" data-a="s_stock" data-i="${i}" data-d="-1" aria-label="أقل">${ic('minus')}</button><b class="num">${x.q}</b><button type="button" class="ibtn" data-a="s_stock" data-i="${i}" data-d="1" aria-label="أكثر">${ic('plus')}</button></span></div>`).join('')}</div></div>`,
      bar: `<button type="button" class="btn block" data-a="s_order" ${low ? '' : 'disabled'}>${ic('truck')} اطلبي الناقص من المورد</button>`
    };
  };
  A.s_stock = (el, d) => { const x = S.salon.stock[+d.i]; x.q = Math.max(0, x.q + +d.d); App.save(); App.refresh(); };
  A.s_order = () => App.toast('انرسل طلب الشراء للمورد، وفاتورته تنحفظ بالمخزن', { icon: 'truck', tone: 'ok', ms: 3200 });

  const COST = { protein: 0.38, color: 0.3, roots: 0.28, acrylic: 0.25, gel: 0.22, facial: 0.2, bridepk: 0.18, evening: 0.15 };
  App.SCREENS['s.profit'] = () => {
    const s = my(), month = 2240000 + Math.max(0, dayTotals().net), fixed = 3150000;
    const rows = s.svcs.map((id) => { const p = basePrice(id), cost = COST[id] || 0.12, m = 1 - cost - 0.3; return { id, p, m }; }).sort((a, b) => b.m - a.m);
    return {
      title: 'الربح الحقيقي', sub: 'بعد المواد ونسبة الموظفة', 
      body: `<div class="sec"><div class="card"><div class="row"><b>نقطة التعادل لهذا الشهر</b><span class="m num">${Math.min(100, Math.round(month / fixed * 100))}%</span></div>
          <div class="sx-track"><i style="width:${Math.min(100, month / fixed * 100)}%"></i></div>
          <span class="m">${month >= fixed ? 'غطيتي مصاريف الشهر، وكل اللي بعده ربح' : `باقي ${money(fixed - month)} د.ع حتى تغطين الإيجار والمولدة والرواتب`}</span></div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('trend')} ربح كل خدمة</h2><span class="m">من السعر</span></div>
          <div class="card">${rows.map((r) => { const pct = Math.round(r.m * 100), tone = pct >= 45 ? 'ok' : pct >= 35 ? 'gold' : 'err'; return `<div class="sx-bar"><span class="tx"><b>${svc(r.id).n}</b><span class="m num">${money(r.p)} د.ع</span></span><span class="sx-track ${tone}"><i style="width:${pct}%"></i></span><b class="num sx-pct">${pct}%</b></div>`; }).join('')}</div>
          <p class="tip">${ic('info')}<span>الأحمر يعني الربح نزل. راجعي السعر أو المادة المستخدمة.</span></p></div>`
    };
  };

  App.SCREENS['s.reports'] = (p, e) => {
    e.st = e.st || { k: 'week' };
    const k = e.st.k === 'week' ? 1 : 4.2;
    const occ = [30, 45, 62, 40, 35, 55, 80, 92, 70, 40];
    const src = [['التطبيق', 46, 'pri'], ['هاتف', 31, 'gold'], ['بدون حجز', 23, 'teal']];
    const top = my().svcs.slice(0, 5).map((id, i) => [svc(id).n, Math.round([38, 27, 19, 12, 8][i] * k)]);
    return {
      title: 'التقارير', sub: 'إشغال الساعات ومصادر الزبونات', 
      body: `<div class="sec"><div class="seg">${[['week', 'هذا الأسبوع'], ['month', 'هذا الشهر']].map((x) => `<button type="button" data-a="s_rep" data-k="${x[0]}" aria-pressed="${e.st.k === x[0]}">${x[1]}</button>`).join('')}</div>
          <div class="sx-kpi"><div><b class="num">${Math.round(92 * k)}</b>زيارة</div><div><b class="num">${Math.round(18 * k)}</b>جديدة</div><div><b class="num">4.8</b>التقييم</div><div><b class="num">4%</b>ما حضرن</div></div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('clock')} إشغال الساعات</h2><span class="m">من 10 الصبح لـ 8 المسا</span></div>
          <div class="card"><div class="sx-vbars">${occ.map((v, i) => `<div><i style="height:${v}%" class="${v < 45 ? 'low' : ''}"></i><span class="num">${(10 + i) % 12 || 12}</span></div>`).join('')}</div>
          <span class="m">الأعمدة الفاتحة ساعات ضعيفة، تنفعها عروض الساعة.</span></div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('users')} منين يجون الزبونات</h2></div>
          <div class="card"><div class="sx-stack">${src.map((x) => `<i class="t-${x[2]}" style="width:${x[1]}%"></i>`).join('')}</div>
          ${src.map((x) => `<div class="kv"><span class="sx-k"><i class="sx-dot t-${x[2]}"></i>${x[0]}</span><b>${x[1]}%</b></div>`).join('')}</div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('star')} الأكثر طلباً</h2></div>
          <div class="list">${top.map((t, i) => `<div class="li"><span class="sx-rank num">${i + 1}</span><span class="tx"><b>${t[0]}</b></span><b class="num">${t[1]}</b></div>`).join('')}</div></div>`
    };
  };
  A.s_rep = (el, d) => { st().k = d.k; App.refresh(); };

  const PSTAT = { pending: ['بانتظار الإدارة', 'warn', 'clock'], approved: ['منشور', 'ok', 'check'], rejected: ['مرفوض', 'err', 'close'] };
  App.SCREENS['s.posts'] = () => {
    const mine = S.posts.filter((x) => +x.s === SID()).sort((a, b) => (b.sent || 0) - (a.sent || 0));
    const live = REELS.filter((r) => +r.s === SID());
    return {
      title: 'منشوراتي', sub: 'الصور والفيديوهات بإطار صالوناتي', 
      actions: `<button type="button" class="ibtn" data-go="s.newpost" aria-label="منشور جديد">${ic('plus')}</button>`,
      body: `<div class="sec"><button type="button" class="btn block" data-go="s.newpost">${ic('upload')} منشور جديد</button></div>
        <div class="sec"><div class="sec-h"><h2>${ic('clipboard')} بالمراجعة والقرارات</h2></div>
          ${mine.length ? `<div class="list">${mine.map((x) => { const t = PSTAT[x.status] || PSTAT.pending; return `<div class="li">${img(x.v, 'sx-thumb', '')}<span class="tx"><b class="clip">${esc(x.cap)}</b><span class="m">${svc(x.svc).n} · ${ago(x.sent || now())}</span>${x.reason ? `<span class="err-t">${ic('info')}${esc(x.reason)}</span>` : ''}</span>${pill(t[0], t[1], t[2])}</div>`; }).join('')}</div>`
            : emptyState({ icon: 'video', tone: 'plum', title: 'ماكو منشورات بالمراجعة', text: 'صوري الشعر والأظافر والمكان، وكل صورة تنربط بخدمة وسعر' })}</div>
        <div class="sec"><div class="sec-h"><h2>${ic('reels')} منشور بالريلز</h2><span class="m">${live.length}</span></div>
          <div class="sx-gal">${live.map((r) => `<div>${img(r.v, '', r.cap)}<span>${ic('heart')}${money(r.likes)}</span></div>`).join('')}</div></div>`
    };
  };

  const MEDIA = ['hair-ribbon', 'hair-braid', 'nails-red', 'nails-sparkle', 'makeup-tools', 'salon-session'];
  const MED_RE = /فيلر|بوتوكس|حقن|ليزر/;
  App.SCREENS['s.newpost'] = (p, e) => {
    const s = my();
    e.st = e.st || { v: null, svc: null, cap: '', shows: null, cust: null, done: false, consent: '' };
    const o = e.st;
    if (o.done) {
      return {
        title: 'انرسل للمراجعة', 
        body: `<div class="done-hero"><div class="bigcheck">${ic('check')}</div><h1>انرسل للمراجعة</h1><p class="m">الإدارة ترد بنفس اليوم. بعد القبول السيرفر يضيف الإطار وينشره بالمعرض والريلز.</p></div>
          ${o.consent === 'asked' ? `<div class="sec"><div class="rule">${ic('clock')}<span>طلبنا موافقة ${esc(o.cust)} من هاتفها. ما ينشر قبل موافقتها.</span></div></div>` : ''}`,
        bar: `<div class="btnrow sx-fill"><button type="button" class="btn plain" data-a="s_npNew">${ic('plus')} منشور ثاني</button><button type="button" class="btn" data-go="s.posts">${ic('video')} منشوراتي</button></div>`
      };
    }
    const custs = Array.from(new Set(todays().concat(S.bookings.filter((b) => b.mine && +b.s === SID())).map((b) => b.cust)));
    const med = MED_RE.test(o.cap);
    const ready = o.v && o.svc && o.cap.trim() && o.shows != null && (o.shows === false || o.cust);
    return {
      title: 'منشور جديد', sub: 'مربوط بخدمة، وبموافقة الزبونة إذا ظهرت', 
      body: `<div class="sec"><div class="sec-h"><h2>${ic('image')} الصورة أو الفيديو</h2></div>
          <div class="sx-media">${MEDIA.map((m) => `<button type="button" data-a="s_npV" data-v="${m}" aria-pressed="${o.v === m}" aria-label="اختاري هذا الفيديو">${img(m, '', '')}<span>${ic('check')}</span></button>`).join('')}</div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('tag')} الخدمة المرتبطة</h2></div>
          <div class="sx-chips">${s.svcs.map((id) => `<button type="button" class="chip" data-a="s_npSvc" data-v="${id}" aria-pressed="${o.svc === id}">${svc(id).n}</button>`).join('')}</div></div>
        <div class="sec"><div class="field"><label for="sxCap">${ic('edit')} وصف قصير</label><textarea id="sxCap" class="inp" maxlength="90" data-in="s_npCap" placeholder="مثلاً: تسريحة تخرج بشريطة ذهبية">${esc(o.cap)}</textarea></div>
          <div id="sxMed">${med ? `<div class="rule err">${ic('alert')}<span>ممنوع الإعلانات الطبية (فيلر، بوتوكس، حقن، ليزر) بحساب صالون. الإدارة راح ترفضه.</span></div>` : ''}</div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('user')} تظهر زبونة بالصورة؟</h2></div>
          <div class="yn"><button type="button" data-a="s_npShows" data-v="no" aria-pressed="${o.shows === false}">${ic('close')} لا</button><button type="button" data-a="s_npShows" data-v="yes" aria-pressed="${o.shows === true}">${ic('check')} إي</button></div>
          ${o.shows ? `<span class="lbl">منو الزبونة؟</span><div class="sx-chips">${custs.map((c) => `<button type="button" class="chip" data-a="s_npCust" data-v="${esc(c)}" aria-pressed="${o.cust === c}">${esc(c)}</button>`).join('')}</div>
            <p class="tip">${ic('lock')}<span>يوصلها طلب موافقة بهاتفها، تشوف الصورة قبل ما توافق، وتقدر تسحب موافقتها بعدين.</span></p>` : ''}</div>
        ${o.v ? `<div class="sec"><div class="sec-h"><h2>${ic('sparkle')} معاينة الإطار</h2><span class="m">النسخة النهائية يضعها السيرفر</span></div>
          <div class="sx-frame">${img(o.v, '', '')}<span class="wm">${rose()}صالوناتي · ${s.n} · موثّق</span><b id="sxPrevCap">${esc(o.cap)}</b></div></div>` : ''}`,
      bar: `<button type="button" class="btn block" data-a="s_npSend" ${ready ? '' : 'disabled'}>${ic('upload')} أرسليها للمراجعة</button>`
    };
  };
  A.s_npV = (el, d) => { st().v = d.v; App.refresh(); };
  A.s_npSvc = (el, d) => { st().svc = d.v; App.refresh(); };
  A.s_npShows = (el, d) => { const o = st(); o.shows = d.v === 'yes'; if (!o.shows) o.cust = null; App.refresh(); };
  A.s_npCust = (el, d) => { st().cust = d.v; App.refresh(); };
  A.s_npNew = () => App.replace('s.newpost', {});
  A.s_npCap = (el) => {
    const o = st();
    o.cap = el.value;
    const m = $('#sxMed');
    if (m) m.innerHTML = MED_RE.test(o.cap) ? `<div class="rule err">${ic('alert')}<span>ممنوع الإعلانات الطبية (فيلر، بوتوكس، حقن، ليزر) بحساب صالون. الإدارة راح ترفضه.</span></div>` : '';
    const pc = $('#sxPrevCap');
    if (pc) pc.textContent = o.cap;
    const btn = $('[data-a="s_npSend"]');
    if (btn) btn.disabled = !(o.v && o.svc && o.cap.trim() && o.shows != null && (o.shows === false || o.cust));
  };
  A.s_npSend = () => {
    const o = st(), s = my(), id = 'q' + Date.now();
    const medical = MED_RE.test(o.cap);
    let consent = 'none';
    if (o.shows) {
      if (o.cust === S.user.name) {
        consent = 'asked';
        S.consents.push({ id: 'cs' + Date.now(), s: SID(), what: 'منشور: ' + o.cap, on: null, post: id });
        App.notify({ role: 'client', icon: 'camera', tone: 'plum', title: 'الصالون يطلب موافقتچ على صورة', text: `${s.n}: ${o.cap}`, to: 'c.privacy' });
      } else consent = 'yes';
    }
    S.posts.push({ id, s: SID(), v: o.v, svc: o.svc, cap: o.cap.trim(), status: 'pending', consent, cust: o.shows ? o.cust : null, sent: now(), auto: { quality: true, words: true, medical } });
    App.notify({ role: 'admin', icon: 'clipboard', tone: 'gold', title: 'منشور جديد للمراجعة', text: s.n, to: 'a.review' });
    o.consent = consent;
    o.done = true;
    App.save();
    App.refresh();
  };

  App.SCREENS['s.verify'] = () => {
    const s = my();
    const steps = [['المستندات', 'إجازة الممارسة والهوية والشهادة الصحية', 'doc'], ['زيارة فريقنا', `آخر زيارة ${s.chk}`, 'users'], ['صور المكان', 'صورها فريقنا بدون وجوه', 'camera'], ['فحص النظافة', `${s.hy} من 5`, 'spray'], ['الختم الموثّق', 'يظهر على صفحتچ وبالبحث', 'shield']];
    return {
      title: 'ختم التوثيق', sub: 'أقوى سبب تختارچ البنات وأهلهن', 
      body: `<div class="sec"><div class="card"><div class="row start">${icb('shield', 'teal', 'lg')}<span class="tx"><b class="sx-big">صالونچ موثّق</b><span class="m">التجديد السنوي قبل ${s.chk.replace(/\d{4}/, (y) => +y + 1)}</span></span></div>
          <div class="rule ok">${ic('check-c')}<span>للنساء فقط · تحقق منه فريقنا بالزيارة</span></div></div></div>
        <div class="sec"><div class="tl">${steps.map((x) => `<div class="tl-i done"><span class="tl-dot">${ic('check')}</span><span class="tx"><b>${x[0]}</b><span class="m">${x[1]}</span></span></div>`).join('')}</div></div>
        <div class="sec"><div class="rule info">${ic('info')}<span>الختم يعني راجعنا المستندات والمكان، وليس ضمان نتيجة طبية. انتهاء الإجازة يخفي الخدمات المرتبطة بها تلقائياً.</span></div>
          <p class="tip">${ic('alert')}<span>حساب الصالون ما يقدر يضيف حقن أو إجراءات طبية.</span></p></div>`
    };
  };

  const STER = [['tools', 'تعقيم الأدوات والمقصات', 'scissors'], ['towels', 'مناشف نظيفة لكل زبونة', 'leaf'], ['chairs', 'تعقيم الكراسي والمغاسل', 'spray'], ['uv', 'تشغيل جهاز التعقيم', 'zap']];
  App.SCREENS['s.steril'] = () => {
    const x = S.salon.steril, tt = (S.salon.sterT = S.salon.sterT || {});
    const n = STER.filter((k) => x[k[0]]).length;
    return {
      title: 'سجل التعقيم اليومي', sub: dateLong(now()), 
      body: `<div class="sec"><div class="card"><div class="row"><b>${n} من ${STER.length}</b>${n === STER.length ? pill('مكتمل', 'ok', 'check') : pill('ناقص', 'warn', 'clock')}</div><div class="sx-track ok"><i style="width:${n / STER.length * 100}%"></i></div>
          <span class="m">لما يكتمل يظهر للزبونات "سجل تعقيم اليوم مكتمل" على صفحتچ</span></div></div>
        <div class="sec"><div class="list">${STER.map((k) => `<div class="li">${icb(k[2], x[k[0]] ? 'ok' : 'muted', 'sm')}<span class="tx"><b>${k[1]}</b><span class="m">${x[k[0]] ? 'انسجل ' + (tt[k[0]] ? hm(tt[k[0]]) : 'الصبح') : 'ما انسجل بعد'}</span></span>${sw(x[k[0]], 's_ster', k[1], `data-k="${k[0]}"`)}</div>`).join('')}</div>
          <p class="tip">${ic('shield')}<span>فريقنا يسوي زيارات مفاجئة للصالونات اللي عندها الختم.</span></p></div>`
    };
  };
  A.s_ster = (el, d) => { S.salon.steril[d.k] = !S.salon.steril[d.k]; (S.salon.sterT = S.salon.sterT || {})[d.k] = now(); App.save(); App.refresh(); };

  const WEEK = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  App.SCREENS['s.hours'] = () => {
    const h = (ext().hours = ext().hours || WEEK.map((d, i) => ({ d, on: true, h: i === 6 ? '2:00 م – 8:00 م' : '10:00 ص – 8:00 م' })));
    return {
      title: 'الدوام', sub: 'يظهر للزبونات وبمواعيد الحجز', 
      body: `<div class="sec"><div class="list">${h.map((x, i) => `<div class="li">${icb(x.on ? 'sun' : 'moon', x.on ? 'gold' : 'muted', 'sm')}<span class="tx"><b>${x.d}</b><span class="m num">${x.on ? x.h : 'عطلة'}</span></span>${sw(x.on, 's_day', x.d, `data-i="${i}"`)}</div>`).join('')}</div>
          <div class="card gold"><div class="row start">${icb('moon', 'gold')}<span class="tx"><b>دوام العيد</b><span class="m">ثبتي أدوار خاصة قبل العيد حتى ما يصير ازدحام</span></span></div><button type="button" class="btn sm gold" data-a="s_eid">${ic('cal')} جهزي دوام العيد</button></div></div>`
    };
  };
  A.s_day = (el, d) => { const h = ext().hours[+d.i]; h.on = !h.on; App.save(); App.refresh(); };
  A.s_eid = () => App.toast('انفتحت مواعيد العيد من 8 الصبح لـ 11 بالليل', { icon: 'moon', tone: 'ok', ms: 3200 });

  const PLANS = [
    { id: 'founder', n: 'مؤسِّسة', price: 'مجاني 6 أشهر', tone: 'gold', icon: 'crown', f: ['كل النظام مجاناً', 'شارة مؤسِّسة على صفحتچ', 'تصوير المكان على حسابنا'] },
    { id: 'free', n: 'مجانية', price: '0 د.ع', tone: 'teal', icon: 'leaf', f: ['الجدول والزبونات', 'الصندوق اليومي', 'الظهور بالتطبيق'] },
    { id: 'pro', n: 'احترافية', price: '45,000 د.ع شهرياً', tone: 'rose', icon: 'trend', f: ['رواتب ونسب', 'مخزن ودفعات', 'الربح الحقيقي والتقارير', 'فروع ورسائل'] },
    { id: 'plus', n: 'مميزة', price: '85,000 د.ع شهرياً', tone: 'plum', icon: 'sparkle', f: ['كل الاحترافية', 'رصيد إعلانات شهري', 'صالون مميز بمنطقتچ'] }
  ];
  App.SCREENS['s.plan'] = () => {
    const cur = ext().plan || (my().founder ? 'founder' : 'free');
    return {
      title: 'العضوية', sub: 'الأسعار هنا للتجربة وتتحدد بعد المقابلات', 
      body: `<div class="sec">${PLANS.map((x) => `<div class="card ${x.id === cur ? 'hl' : ''}"><div class="row start">${icb(x.icon, x.tone)}<span class="tx"><b>${x.n}</b><span class="m num">${x.price}</span></span>${x.id === cur ? pill('باقتچ', 'pri', 'check') : ''}</div>
          <div class="sx-feats">${x.f.map((f) => `<span>${ic('check')}${f}</span>`).join('')}</div>
          ${x.id === cur ? '' : `<button type="button" class="btn ${x.id === 'plus' ? 'gold' : 'soft'} sm" data-a="s_plan" data-id="${x.id}">${x.id === 'free' ? 'انتقلي لها' : 'رقّي لها'}</button>`}</div>`).join('')}
        <p class="tip">${ic('info')}<span>العمولة بس على الزبونة الجديدة اللي يجيبها التطبيق وتحضر. زبونتچ القديمة بدون عمولة.</span></p></div>`
    };
  };
  A.s_plan = (el, d) => { ext().plan = d.id; App.save(); App.toast('انرسل طلبچ للفريق وراح يتواصلون وياچ', { icon: 'check-c', tone: 'ok' }); App.refresh(); };
})();
