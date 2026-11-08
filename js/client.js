/* Client (زبونة) screens, part 1: onboarding, home, discovery (list and map), salon page,
   booking and payment, the QR ticket through its whole lifecycle, rating and receipt. */
(function () {
  'use strict';
  const SC = App.SCREENS, A = App.ACT;
  const MIN = 60e3;

  /* ---------- helpers shared with client-more.js ---------- */
  const areaName = (id) => (AREAS.find((a) => a.id === id) || AREAS[0]).n;
  const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const learn = (tag, n) => { if (S.user.track && tag) S.user.interests[tag] = (S.user.interests[tag] || 0) + (n || 1); };
  const reelsAll = () => S.posts.filter((p) => p.status === 'approved')
    .map((p) => ({ id: p.id, s: p.s, v: p.v, svc: p.svc, cap: p.cap, likes: 0, cm: 0, sv: 0, tag: svc(p.svc).n, consent: p.consent === 'yes', c: [], fresh: true }))
    .concat(REELS);
  const parseAr = (t) => { const m = /(\d+):(\d+)\s*(ص|م)/.exec(t || ''); if (!m) return 0; let h = +m[1] % 12; if (m[3] === 'م') h += 12; return h + (+m[2]) / 60; };
  const salonCats = (s) => [...new Set(s.svcs.map((id) => svc(id).cat))];
  const salonOffer = (sid) => S.offers.find((o) => +o.s === +sid && o.left > 0);
  const minPrice = (s, cat) => Math.min(...s.svcs.filter((id) => !cat || svc(id).cat === cat).map((id) => App.price(s.id, id, 's').p));
  const lenName = (id) => (LEN.find((l) => l.id === id) || LEN[1]).n;
  const catOf = (id) => CATS.find((c) => c.id === svc(id).cat) || CATS[0];
  const fmtPhone = (d) => { const x = (d || '').padEnd(11, '•'); return `${x.slice(0, 4)} ${x.slice(4, 7)} ${x.slice(7)}`; };
  const logW = (n, a) => { (S.user.log = S.user.log || []).unshift({ n, a, t: App.now() }); };

  function dayStart(off) { const d = new Date(App.now()); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + off); return d; }
  function slotsFor(sid, off, staff) {
    const d = dayStart(off), fri = d.getDay() === 5, out = [];
    const offer = off === 0 ? salonOffer(sid) : null;
    for (let h = fri ? 14 : 10; h < 20; h++) for (const m of [0, 30]) {
      const t = new Date(d); t.setHours(h, m, 0, 0);
      const ts = t.getTime(), hh = h + m / 60;
      const taken = hash(`${sid}|${off}|${h}|${m}|${staff}`) % (staff < 0 ? 7 : 4) === 0;
      out.push({ ts, h, m, part: h < 12 ? 'am' : h < 16 ? 'noon' : 'pm', dis: ts < App.now() + 20 * MIN || taken, hot: !!offer && hh >= parseAr(offer.from) && hh < parseAr(offer.to) });
    }
    return out;
  }
  function nextFree(sid) { for (let off = 0; off < 3; off++) { const f = slotsFor(sid, off, -1).find((x) => !x.dis); if (f) return f.ts; } return null; }

  function draftNew(sid, items, extra) {
    S.draft = Object.assign({ s: +sid, items: items || [], staff: -1, day: 0, ts: null, pay: 'zain', useWallet: true, note: '', ref: null, resched: null }, extra || {});
    App.save();
  }
  function totals(dr) {
    let t = 0, old = 0, d = 0, bride = false;
    dr.items.forEach((it) => { const p = App.price(dr.s, it.svc, it.len); t += p.p; old += p.old || p.p; d += svc(it.svc).d; if (svc(it.svc).bride) bride = true; });
    return { total: t, old, dur: d, dep: App.deposit(t, bride), bride };
  }

  function salonCard(s, o) {
    o = o || {};
    const off = salonOffer(s.id), nf = nextFree(s.id);
    return `<button type="button" class="sc" data-go="c.salon" data-id="${s.id}">
      <span class="ph">${img(s.cover)}${off ? pill('عرض', 'gold', 'tag') : s.ad ? '<span class="pill ad">إعلان</span>' : ''}</span>
      <span class="tx">
        <span class="row"><span class="nm clip">${s.n}</span>${verified()}</span>
        <span class="meta">${rating(s.r, s.rev)}<span>${ic('pin')}${s.km} كم</span>${s.home ? `<span>${ic('home')}بيتي</span>` : ''}</span>
        <span class="m clip">${s.lm} · ${areaName(s.area)}</span>
        ${nf ? `<span class="next">${ic('clock')}أقرب موعد ${dayDiff(nf) ? dayLabel(nf) + ' ' : ''}${hm(nf)}</span>` : ''}
        ${o.noPrice ? '' : `<span class="price">تبدي من ${iqd(minPrice(s, o.cat))}</span>`}
      </span></button>`;
  }

  function keypad() {
    const k = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
    return `<div class="keypad" role="group" aria-label="أرقام">${k.map((x) => x === 'del'
      ? `<button type="button" data-a="kp" data-k="del" aria-label="امسحي">${ic('backspace')}</button>`
      : x === '' ? '<span></span>' : `<button type="button" data-a="kp" data-k="${x}">${x}</button>`).join('')}</div>`;
  }
  function openShare(title, link) {
    App.sheet(`<h2>${ic('share')} شاركي</h2><div class="card" style="text-align:center"><b>${esc(title)}</b><span class="num m" dir="ltr">${link}</span></div>
      <div class="grid2">${[['whatsapp', 'واتساب', 'mint'], ['camera', 'سناب', 'amber'], ['image', 'إنستغرام', 'plum'], ['copy', 'نسخ الرابط', 'sky']].map((x) => `<button type="button" class="li" data-a="${x[0] === 'copy' ? 'copyText' : 'shareVia'}" data-t="${link}" data-v="${x[1]}">${icb(x[0], x[2], 'sm')}<b>${x[1]}</b></button>`).join('')}</div>
      <p class="tip">${ic('gift')}الرابط فيه كود شاركي واربحي مالتچ. إذا حجزت صديقتچ وحضرت تربحين 1,000 دينار</p>`, { label: 'مشاركة'});
  }

  Object.assign(App, { areaName, learn, reelsAll, salonOffer, slotsFor, nextFree, draftNew, totals, salonCard, keypad, minPrice, hash, logW, openShare, dayStart, lenName, catOf });

  /* ---------- lifecycle hook used by the salon role at checkout ---------- */
  App.finishVisit = (b) => {
    b.status = 'done';
    b.finished = App.now();
    if (b.mine) {
      b.petal = true;
      S.user.petals = Math.min(8, (S.user.petals || 0) + 1);
      App.notify({ role: 'client', icon: 'star', tone: 'gold', title: 'شلون كانت زيارتچ؟', text: `قيّمي ${salon(b.s).n} وشوفي بتلتچ الجديدة`, to: 'c.rate', p: { id: b.id } });
    }
    App.save();
  };

  /* ---------- onboarding ---------- */
  SC['c.splash'] = () => ({
    head: '', cls: 'dark-status',
    body: `<button type="button" class="splash" data-a="splashGo" aria-label="ابدي">${rose()}<span class="word">صالوناتي</span><span class="tag">صالونات موثّقة، وحجز بثلاث ضغطات</span></button>`,
    after: () => App.later(() => { if (App.cur().id === 'c.splash') App.replace('c.onboard', { i: '0' }); }, 2200)
  });
  A.splashGo = () => App.replace('c.onboard', { i: '0' });

  const OB = [
    { v: 'hair-cut', icon: 'shield', tone: 'teal', t: 'صالونات موثّقة وبس', d: 'نزور كل صالون ونتأكد من رخصته ونظافته قبل ما يظهر بالتطبيق.' },
    { v: 'nails-timelapse', icon: 'qr', tone: 'rose', t: 'احجزي واعرضي الرمز', d: 'تختارين الخدمة والوقت، وبالصالون تعرضين الرمز من موبايلچ.' },
    { v: 'hair-braid', icon: 'gift', tone: 'gold', t: 'كل زيارة بتلة', d: 'ثمن بتلات تربحين جلسة هدية، وإذا حضرت صديقتچ تربحين رصيد.' }
  ];
  SC['c.onboard'] = (p) => {
    const i = +(p.i || 0), o = OB[i];
    return {
      head: '', cls: 'dark-status',
      body: `<div class="ob">
        <div class="ob-media"><div class="clipper"><video src="${vsrc(o.v)}" poster="assets/img/${o.v}.jpg" autoplay muted loop playsinline aria-hidden="true"></video></div>
          <button type="button" class="ob-skip" data-a="obSkip">تخطي</button>${icb(o.icon, o.tone, 'xl')}</div>
        <div class="ob-body">
          <h1 tabindex="-1">${o.t}</h1><p>${o.d}</p>
          <div class="dots" aria-hidden="true">${OB.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
          <button type="button" class="btn lg block" data-a="obNext" data-i="${i}">${i < 2 ? 'التالي' : 'يلا نتصفح'}${ic('arrow-l')}</button>
        </div></div>`
    };
  };
  // No sign-up at the start: she lands on home as a guest and browses freely.
  function startBrowsing() { S.onboarded = true; App.save(); App.tabTo('c.home'); App.toast('تصفحي براحتچ، ونطلب رقمچ بس وقت الحجز', { icon: 'sparkle' }); }
  A.obNext = (el, d) => { const i = +d.i; if (i < 2) App.go('c.onboard', { i: String(i + 1) }); else startBrowsing(); };
  A.obSkip = () => startBrowsing();

  /* ---------- registration, asked only when she books or needs an account ---------- */
  const AUTH = ['c.login', 'c.otp', 'c.setup'];
  const DEMO_PHONE = '07701234512';
  // Returns true when she already has an account; otherwise opens registration and resumes at `next` afterwards.
  function requireAuth(next, np) {
    if (S.user.registered) return true;
    App.closeSheet(true);
    App.go('c.login', { next: next || '', np: JSON.stringify(np || {}) });
    return false;
  }
  const guestPrompt = (icon, title, text) => emptyState({ icon, tone: 'rose', title, text,
    action: `<button type="button" class="btn lg" data-a="login">${ic('phone')}سجلي برقم موبايلچ</button><p class="tip" style="justify-content:center">${ic('info')}نحتاج رقمچ بس، وياخذ دقيقة</p>` });
  A.login = () => App.go('c.login', {});
  function finishAuth(p) {
    const returning = phone === DEMO_PHONE;
    if (!returning) {
      S.bookings = S.bookings.filter((b) => !b.seed);
      S.notifications = S.notifications.filter((n) => !n.seed);
      Object.assign(S.user, { petals: 0, wallet: 0, allergy: '', ref: 'n' + String(Date.now()).slice(-4) });
      S.referrals = []; S.consents = [];
    }
    S.user.name = (p.nm || '').trim() || S.user.name;
    S.user.registered = true; S.onboarded = true;
    App.save();
    const st = App.nav.stack;
    while (st.length > 1 && AUTH.includes(st[st.length - 1].id)) st.pop();
    App.toast(returning ? `أهلاً بعودتچ ${esc(S.user.name)}، رجعنالچ مواعيدچ` : `أهلاً ${esc(S.user.name)}، صار عندچ حساب`, { icon: 'check', tone: 'ok' });
    if (p.next) App.go(p.next, JSON.parse(p.np || '{}'));
    else if (AUTH.includes(App.cur().id)) App.tabTo('c.home');
    else App.render(-1);
  }
  Object.assign(App, { requireAuth, guestPrompt });

  let phone = '', otp = '', otpErr = false, otpVia = 'sms', otpSent = 0;
  SC['c.login'] = (p) => {
    const ok = /^07\d{9}$/.test(phone), bad = phone.length >= 2 && !phone.startsWith('07');
    const booking = p.next === 'c.pay' && S.draft && S.draft.ts;
    return {
      title: booking ? 'خطوة أخيرة' : 'رقم موبايلچ', sub: booking ? 'سجلي رقمچ حتى نثبت موعدچ ونرسلچ التذكير' : 'نرسل لچ رمز تأكيد',
      body: `<div class="sec">
        ${booking ? `<div class="card hl"><div class="row start">${icb('cal', 'rose')}<span class="tx"><b>موعدچ محجوز لچ مؤقتاً</b><span class="m">${salon(S.draft.s).n} · ${when(S.draft.ts)}</span></span></div></div>` : ''}
        <div class="card" style="justify-items:center;text-align:center">${icb('phone', 'rose', 'lg')}
          <div class="phone-show num" aria-live="polite">${fmtPhone(phone)}</div>
          ${bad ? `<span class="err-t" role="alert">${ic('alert')}الرقم لازم يبدي بـ 07</span>` : '<span class="m">رقمچ يبقى سري، والصالون ما يشوفه قبل الحجز</span>'}
        </div>
        ${keypad()}
        <div class="seg" role="group" aria-label="طريقة الإرسال">
          <button type="button" data-a="otpVia" data-v="sms" aria-pressed="${otpVia === 'sms'}">${ic('chat')}رسالة</button>
          <button type="button" data-a="otpVia" data-v="wa" aria-pressed="${otpVia === 'wa'}">${ic('whatsapp')}واتساب</button>
        </div>
        <button type="button" class="more" style="justify-self:center" data-a="fillPhone">${ic('sparkle')}عبّي رقم تجريبي (زبونة عندها مواعيد)</button>
        <p class="tip" style="justify-content:center">${ic('info')}للتجربة: أي رقم ثاني يبدي بـ 07 يسوي حساب جديد</p>
      </div>`,
      bar: `<button type="button" class="btn block lg" data-a="sendOtp" ${ok ? '' : 'disabled'}>أرسلي الرمز${ic('arrow-l')}</button>`
    };
  };
  A.otpVia = (el, d) => { otpVia = d.v; App.refresh(); };
  A.fillPhone = () => { phone = '07701234512'; App.refresh(); };
  const authP = () => { const p = App.cur().p || {}; return { next: p.next || '', np: p.np || '{}' }; };
  A.sendOtp = () => { S.user.phone = fmtPhone(phone); otp = ''; otpErr = false; otpSent = App.now(); App.save(); App.go('c.otp', authP()); };
  A.kp = (el, d) => {
    const id = App.cur().id;
    if (id === 'c.login') { phone = d.k === 'del' ? phone.slice(0, -1) : (phone + d.k).slice(0, 11); App.refresh(); }
    else if (id === 'c.otp') {
      otpErr = false;
      otp = d.k === 'del' ? otp.slice(0, -1) : (otp + d.k).slice(0, 4);
      if (otp.length === 4) {
        if (otp === '2468') { const ap = authP(); App.refresh(); App.later(() => App.go('c.setup', ap), 350); return; }
        otpErr = true; otp = '';
      }
      App.refresh();
    } else if (App.kpHandler) App.kpHandler(d.k);
  };

  SC['c.otp'] = () => {
    const left = Math.max(0, 30 - Math.floor((App.now() - otpSent) / 1000));
    return {
      title: 'رمز التأكيد', sub: 'وصلچ ' + (otpVia === 'wa' ? 'على واتساب' : 'برسالة') + ' للرقم ' + fmtPhone(phone),
      body: `<div class="sec">
        <div class="digits" aria-live="polite">${[0, 1, 2, 3].map((k) => `<span class="${k === otp.length ? 'on' : ''}">${otp[k] || ''}</span>`).join('')}</div>
        ${otpErr ? `<span class="err-t" role="alert" style="justify-content:center">${ic('alert')}الرمز غلط، جربي مرة ثانية</span>` : ''}
        <p class="tip" style="justify-content:center">${ic('info')}نموذج للعرض: الرمز التجريبي <b class="num">2468</b></p>
        ${keypad()}
        <div class="row" style="justify-content:center">
          <button type="button" class="more" data-a="otpFill">${ic('sparkle')}عبّي الرمز</button>
          <button type="button" class="more" data-a="otpResend" ${left ? 'disabled' : ''}>${left ? `إعادة الإرسال بعد <span class="num" id="otpLeft">${left}</span>` : 'أرسلي مرة ثانية'}</button>
        </div>
      </div>`,
      after: () => App.every(() => {
        const l = Math.max(0, 30 - Math.floor((App.now() - otpSent) / 1000)), e = $('#otpLeft');
        if (e) { e.textContent = l; if (!l) App.refresh(); }
      }, 1000)
    };
  };
  A.otpFill = () => { const ap = authP(); otp = '2468'; App.refresh(); App.later(() => App.go('c.setup', ap), 350); };
  A.otpResend = () => { otpSent = App.now(); App.toast('أرسلنا الرمز مرة ثانية', { icon: 'chat' }); App.refresh(); };

  SC['c.setup'] = (p) => {
    const returning = phone === DEMO_PHONE;
    if (p.nm == null) p.nm = returning ? S.user.name : '';
    const n = S.user.notif;
    return {
      title: returning ? 'أهلاً بعودتچ' : 'شنو اسمچ؟', sub: returning ? 'رقمچ مسجل عدنا، ورجعنالچ مواعيدچ وبتلاتچ' : 'الاسم الأول بس، حتى الصالون يناديچ بيه',
      body: `<div class="sec">
        <div class="field"><label for="nm">${ic('user')}اسمچ</label><input class="inp" id="nm" data-in="setName" value="${esc(p.nm)}" placeholder="مثلاً: زهراء" autocomplete="given-name" maxlength="30"></div>
        <div class="lbl">${ic('pin')}منطقتچ</div>
        <div class="areas" role="group" aria-label="المناطق">${AREAS.map((a) => `<button type="button" data-a="pickArea" data-v="${a.id}" aria-pressed="${S.user.area === a.id}">${a.n}</button>`).join('')}</div>
        <div class="li">${icb('tag', 'gold', 'sm')}<span class="tx"><b>أرسلولي العروض اللي تناسبني</b><span class="m">تذكير المواعيد يوصلچ دائماً</span></span>${sw(n.offers && S.user.track, 'setOffers', 'العروض')}</div>
        <div class="rule info">${ic('shield')}<span>ما نبيع بياناتچ، ورقمچ ما يشوفه الصالون قبل الحجز.</span></div>
      </div>`,
      bar: `<button type="button" class="btn block lg" data-a="setupDone" ${p.nm.trim() ? '' : 'disabled'}>${p.next === 'c.pay' ? 'كملي للدفع' : 'تمام'}${ic('arrow-l')}</button>`
    };
  };
  A.setName = (el) => { App.cur().p.nm = el.value; const b = $('[data-a="setupDone"]'); if (b) b.disabled = !el.value.trim(); };
  A.setOffers = () => { const on = !(S.user.notif.offers && S.user.track); S.user.notif.offers = on; S.user.track = on; App.save(); App.refresh(); };
  A.pickArea = (el, d) => { S.user.area = d.v; App.save(); App.refresh(); };
  A.locYes = () => { S.user.perms.loc = 'yes'; S.user.area = 'mansour'; App.save(); App.closeSheet(true); App.toast('حددنا موقعچ: المنصور', { icon: 'pin', tone: 'ok' }); App.refresh(); };
  A.setupDone = () => { const p = App.cur().p; if ((p.nm || '').trim()) finishAuth(p); };
  A.notifTog = (el, d) => { S.user.notif[d.k] = !S.user.notif[d.k]; App.save(); App.refresh(); };
  A.trackTog = () => { S.user.track = !S.user.track; if (!S.user.track) S.user.interests = {}; App.save(); App.refresh(); };

  /* ---------- home ---------- */
  function storyGroups() {
    const seen = new Set(), out = [];
    reelsAll().forEach((r) => { if (!seen.has(r.s)) { seen.add(r.s); out.push(r); } });
    return out.sort((a, b) => (S.seen[a.s] ? 1 : 0) - (S.seen[b.s] ? 1 : 0));
  }
  App.storyGroups = storyGroups;

  SC['c.home'] = () => {
    const u = S.user, up = App.upcoming(), next = up.find((b) => App.phase(b) !== 'done'), toRate = up.find((b) => App.phase(b) === 'done');
    const unread = App.unread('client');
    const offers = S.offers.filter((o) => o.left > 0);
    const last = App.mine().filter((b) => b.status === 'done').sort((a, b) => b.at - a.at)[0];
    const topTag = Object.keys(u.interests).sort((a, b) => u.interests[b] - u.interests[a])[0];
    const topReel = topTag && REELS.find((r) => r.tag === topTag);
    const appt = next ? `<button type="button" class="appt" data-go="c.ticket" data-id="${next.id}">
        ${rose()}<span class="ib lg" style="background:rgb(255 255 255 / .16);color:#fff" aria-hidden="true">${ic('cal')}</span>
        <span class="tx"><span class="m">موعدچ القادم</span><span class="when">${when(next.at)}</span><span class="m clip">${salon(next.s).n} · ${itemsText(next)}</span></span>
        <span class="qrbtn">${ic('qr')}${App.phase(next) === 'qr' ? 'اعرضي الرمز' : 'التذكرة'}</span></button>` : '';
    const rateCard = toRate ? `<button type="button" class="li" data-go="c.rate" data-id="${toRate.id}" style="border-color:var(--gold)">${icb('star', 'gold')}<span class="tx"><b>شلون كانت زيارتچ لـ ${salon(toRate.s).n}؟</b><span class="m">قيّميها بضغطة وشوفي بتلتچ</span></span>${ic('chev-l')}</button>` : '';
    return {
      head: `<div class="home-top"><div class="who"><p class="hello">${u.registered ? 'هلا ' + esc(u.name) : 'أهلاً بيچ'}</p><button type="button" class="loc" data-a="areaSheet">${ic('pin')}${areaName(u.area)}، بغداد${ic('chev-d')}</button></div>
        ${u.registered ? '' : `<button type="button" class="btn xs soft" data-a="login">${ic('user')}دخول</button>`}
        <button type="button" class="ibtn" data-go="c.notifs" aria-label="الإشعارات">${ic('bell')}${unread ? `<i class="dot num">${unread}</i>` : ''}</button></div>`,
      nav: 'c.home',
      body: `
        <div class="sec" style="margin-top:2px"><div class="search"><button type="button" class="search-main" data-go="c.browse" data-focus="1">${ic('search')}<span>دوري صالون أو خدمة</span></button></div></div>
        <div class="stories" aria-label="ستوري الصالونات">${storyGroups().map((r) => `<button type="button" class="story-dot ${S.seen[r.s] ? 'seen' : ''}" data-go="c.stories" data-s="${r.s}"><span class="story-ring">${img(r.v)}</span><span class="l">${salon(r.s).n}</span></button>`).join('')}</div>
        ${next || toRate ? `<div class="sec">${appt}${rateCard}</div>` : ''}
        <div class="sec"><div class="sec-h"><h2>شنو تحتاجين اليوم؟</h2></div>
          <div class="cats">${CATS.map((c) => `<button type="button" class="cat" data-go="${c.id === 'bride' ? 'c.bride' : 'c.browse'}" data-cat="${c.id}">${icb(c.icon, c.tone)}<span>${c.n}</span></button>`).join('')}</div></div>
        <div class="sec"><div class="doors">
          <button type="button" class="door" data-go="c.browse" data-view="map">${icb('map', 'rose')}<b>الصالونات</b><span>قائمة وخارطة، الأقرب أولاً</span></button>
          <button type="button" class="door alt" data-a="tab" data-to="c.gifts">${icb('gift', 'gold')}<b>هدايا ومنتجات</b><span>من صالونات موثّقة</span></button>
        </div></div>
        ${offers.length ? `<div class="sec"><div class="sec-h"><h2>${ic('zap')}عروض الساعات الفارغة</h2><button type="button" class="more" data-go="c.browse" data-offer="1">الكل${ic('chev-l')}</button></div></div>
        <div class="hscroll">${offers.map((o) => { const s = salon(o.s), pr = App.price(s.id, o.svc, 's'); return `<button type="button" class="oc" data-go="c.salon" data-id="${s.id}" data-svc="${o.svc}">
          <span class="ph">${img(svc(o.svc).v || s.cover)}${pill('خصم ' + Math.round(o.pct * 100) + '%', 'gold', 'tag')}<span class="tm">${ic('clock')}${o.from} – ${o.to}</span></span>
          <span class="bd"><span class="row"><b>${svc(o.svc).n}</b>${verified()}</span><span class="m">${s.n} · ${s.km} كم · باقي ${o.left} مواعيد</span>
          <span class="row"><span class="price">${iqd(pr.p)}<span class="strike num">${money(pr.old)}</span></span><span class="pill pri">احجزي</span></span></span></button>`; }).join('')}</div>` : ''}
        ${last ? `<div class="sec"><div class="card rebook">${icb('refresh', 'teal')}<span class="tx"><b>نفس موعدي السابق</b><span class="m">${itemsText(last)} · ${salon(last.s).n} · مع ${salon(last.s).staff[last.staff || 0].n}</span></span><button type="button" class="btn sm" data-a="rebook" data-id="${last.id}">احجزي</button></div></div>` : ''}
        <div class="sec">${u.registered ? `<button type="button" class="li" data-go="c.petals"><span class="ib lg t-rose" style="padding:5px" aria-hidden="true">${petals(u.petals)}</span><span class="tx"><b>بتلاتچ ${u.petals} من 8</b><span class="m">${8 - u.petals} زيارات وتربحين جلسة هدية</span></span>${ic('chev-l')}</button>`
          : `<div class="card gold"><div class="row start"><span class="ib lg t-gold" style="padding:5px" aria-hidden="true">${petals(0)}</span><span class="tx"><b>تصفحي براحتچ</b><span class="m">ما نطلب رقمچ إلا وقت تحجزين. وكل زيارة بعدها تفتح بتلة</span></span></div></div>`}</div>
        <div class="sec adv"><button type="button" class="ad-slot" data-go="c.salon" data-id="1"><span class="tx"><span class="pill ad">إعلان</span><b>مركز لمسة</b><span class="m">مكياج التخرج بـ 22,000 لحد الخميس</span><span class="pill pri" style="justify-self:start;margin-top:6px">شوفي العرض</span></span>${img('makeup-tools')}</button></div>
        <div class="sec adv"><div class="sec-h"><h2>${ic('fire')}الأكثر طلباً بـ${areaName(u.area)}</h2></div></div>
        <div class="hscroll adv">${['blow', 'gel', 'roots', 'facial', 'braid'].map((id) => `<button type="button" class="prod" style="width:150px" data-go="c.browse" data-q="${svc(id).n}"><span class="ph">${img(svc(id).v)}</span><span class="bd"><b>${svc(id).n}</b><span class="m">${(hash(id) % 80) + 40} حجز هذا الأسبوع</span></span></button>`).join('')}</div>
        ${topReel ? `<div class="sec adv"><div class="card gold"><div class="row start">${icb('sparkle', 'gold')}<span class="tx"><b>على ذوقچ: ${topTag}</b><span class="m">جمعنالچ صالونات موثّقة قريبة عدها ${svc(topReel.svc).n}</span></span></div><button type="button" class="btn sm gold" data-go="c.browse" data-q="${svc(topReel.svc).n}">شوفيها</button></div></div>` : ''}
        <div class="sec"><div class="grid2">
          <button type="button" class="door" data-go="c.share">${icb('share', 'plum')}<b>شاركي واربحي</b><span>1,000 دينار لكل صديقة تحضر</span></button>
          <button type="button" class="door alt" data-go="c.bride">${icb('crown', 'gold')}<b>عروس؟</b><span>خطة جلسات لحد يوم عرسچ</span></button>
        </div></div>`
    };
  };
  A.rebook = (el, d) => {
    const b = S.bookings.find((x) => x.id === d.id);
    draftNew(b.s, b.items.map((i) => ({ svc: i.svc, len: i.len })), { staff: b.staff == null ? -1 : b.staff });
    App.go('c.book');
  };

  /* ---------- browse: list and map share one filter state ---------- */
  const BR = { view: 'list', cat: '', q: '', f: {}, k: 1, tx: 0, ty: 0, sel: null, loaded: false };
  App.BR = BR;
  function filtered() {
    const q = BR.q.trim();
    return SALONS.filter((s) => {
      if (BR.cat && !salonCats(s).includes(BR.cat)) return false;
      if (q && !(s.n.includes(q) || s.tagline.includes(q) || areaName(s.area).includes(q) || s.svcs.some((id) => svc(id).n.includes(q) || q.includes(svc(id).n)))) return false;
      if (BR.f.offer && !salonOffer(s.id)) return false;
      if (BR.f.now) { const nf = nextFree(s.id); if (!nf || nf - App.now() > 90 * MIN) return false; }
      if (BR.f.cheap && minPrice(s, BR.cat) > 25000) return false;
      if (BR.f.top && s.r < 4.7) return false;
      if (BR.f.home && !s.home) return false;
      return true;
    }).sort((a, b) => a.km - b.km);
  }
  function listHtml(list) {
    if (!BR.loaded) return `<div class="list" aria-busy="true">${[0, 1, 2].map(() => '<div class="skel" style="height:132px"></div>').join('')}</div>`;
    if (!list.length) return emptyState({ icon: 'search', tone: 'rose', title: 'ماكو صالون بهالفلتر', text: 'جربي تشيلين فلتر أو تدورين بكلمة ثانية', action: '<button type="button" class="btn" data-a="brClear">شيلي الفلاتر</button>' });
    return `<div class="row m" style="padding-inline:4px"><span>${list.length} صالونات · الأقرب أولاً</span><span>${ic('shield')} كلها موثّقة</span></div><div class="list">${list.map((s) => salonCard(s, { cat: BR.cat })).join('')}</div>`;
  }
  const FILTERS = [['offer', 'عرض اليوم', 'tag'], ['now', 'متاح هسة', 'clock'], ['cheap', 'حتى 25,000', 'cash'], ['top', 'تقييم عالي', 'star'], ['home', 'صالون بيتي', 'home']];
  SC['c.browse'] = (p) => {
    if (!p._init) {
      p._init = true;
      BR.cat = p.cat || ''; BR.q = p.q || ''; BR.f = {}; BR.sel = null; BR.k = 1; BR.tx = 0; BR.ty = 0;
      if (p.offer) BR.f.offer = true;
      BR.view = p.view || 'list';
      BR.loaded = false;
    }
    const list = filtered(), map = BR.view === 'map';
    return {
      title: BR.cat ? (CATS.find((c) => c.id === BR.cat) || {}).n : 'الصالونات', sub: areaName(S.user.area) + '، بغداد',
      cls: map ? 'mapmode' : '',
      body: `<div class="sec" style="margin-top:0"><div class="search">${ic('search')}<input id="q" class="bare" data-in="brQ" value="${esc(BR.q)}" placeholder="دوري صالون أو خدمة" aria-label="بحث" autocomplete="off"></div>
          <div class="seg" role="group" aria-label="طريقة العرض"><button type="button" data-a="brView" data-v="list" aria-pressed="${!map}">${ic('list')}قائمة</button><button type="button" data-a="brView" data-v="map" aria-pressed="${map}">${ic('map')}خارطة</button></div></div>
        <div class="chips" style="margin-top:10px" role="group" aria-label="الخدمات"><button type="button" class="chip" data-a="brCat" data-v="" aria-pressed="${!BR.cat}">الكل</button>${CATS.filter((c) => c.id !== 'bride').map((c) => `<button type="button" class="chip" data-a="brCat" data-v="${c.id}" aria-pressed="${BR.cat === c.id}">${ic(c.icon)}${c.n}</button>`).join('')}</div>
        <div class="chips" style="margin-top:8px" role="group" aria-label="فلاتر">${FILTERS.map((f) => `<button type="button" class="chip" data-a="brF" data-v="${f[0]}" aria-pressed="${!!BR.f[f[0]]}">${ic(f[2])}${f[1]}</button>`).join('')}</div>
        ${map ? `<div class="mapzone">${mapHtml()}</div>` : `<div class="sec" id="brList">${listHtml(list)}</div>`}`,
      after: (view) => {
        if (p.focus && !p._f) { p._f = true; const q = $('#q', view); if (q) q.focus(); }
        if (!BR.loaded) App.later(() => { BR.loaded = true; const box = $('#brList'); if (box) box.innerHTML = listHtml(filtered()); }, 450);
        if (map) mapInit(view, list);
      }
    };
  };
  A.brQ = (el) => { BR.q = el.value; BR.sel = null; const box = $('#brList'); if (box) box.innerHTML = listHtml(filtered()); else if ($('#pins')) { mapList = filtered(); mapPlace(); } };
  A.brView = (el, d) => { BR.view = d.v; App.refresh(); };
  A.brCat = (el, d) => { BR.cat = d.v; App.refresh(); };
  A.brF = (el, d) => { BR.f[d.v] = !BR.f[d.v]; App.refresh(); };
  A.brClear = () => { BR.f = {}; BR.cat = ''; BR.q = ''; App.refresh(); };

  /* Illustrative map of west and central Baghdad. Pins and labels sit outside the scaled layer so text keeps its size. */
  const LBL = [['المنصور', 36, 33], ['اليرموك', 18, 74], ['الحارثية', 47, 27], ['الكرادة', 72, 67], ['زيونة', 88, 35], ['الأعظمية', 73, 13], ['الجادرية', 58, 90], ['دجلة', 53, 61]];
  function mapSvg() {
    return `<svg class="base" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <rect width="100" height="100" fill="var(--map-land)"/>
      <path d="M38 18 C46 14 54 18 52 26 C50 31 42 32 38 28 Z" fill="var(--map-park)"/>
      <path d="M6 82 C12 76 20 80 18 88 C14 93 6 92 6 82 Z" fill="var(--map-park)"/>
      <path d="M82 72 C88 70 92 74 90 80 C86 83 80 80 82 72 Z" fill="var(--map-park)"/>
      <g fill="none" stroke="var(--map-road)" stroke-linecap="round">
        <path d="M0 45 H58 M34 0 V100 M80 0 V58 L100 70" stroke-width="7" vector-effect="non-scaling-stroke"/>
        <path d="M0 92 L56 56 M44 38 H74 M50 64 H86" stroke-width="5" vector-effect="non-scaling-stroke"/>
        <path d="M12 0 V60 M0 20 H70 M20 60 H56 M62 0 L64 30 M66 74 V100" stroke-width="3" vector-effect="non-scaling-stroke"/>
      </g>
      <path d="M60 -2 C56 12 62 24 60 34 C58 44 52 50 56 60 C60 70 64 78 74 82 C84 86 90 80 96 88 L102 96" fill="none" stroke="var(--map-river)" stroke-width="20" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    </svg>`;
  }
  function mapHtml() {
    return `<div class="mapbox" id="mapbox"><div class="world" id="world">${mapSvg()}</div><div class="pins" id="pins"></div>
      <span class="map-note">رسم توضيحي للمناطق</span>
      <div class="map-ctl"><button type="button" class="ibtn" data-a="mapZoom" data-z="1" aria-label="تقريب">${ic('plus')}</button><button type="button" class="ibtn" data-a="mapZoom" data-z="-1" aria-label="تبعيد">${ic('minus')}</button><button type="button" class="ibtn" data-a="mapMe" aria-label="موقعي">${ic('locate')}</button></div>
      <div class="map-card" id="mapCard"></div></div>`;
  }
  let mapList = [];
  function mapPlace() {
    const box = $('#mapbox'), pins = $('#pins'), world = $('#world');
    if (!box || !pins) return;
    const W = box.clientWidth, Hh = box.clientHeight, k = BR.k;
    world.style.transform = `translate(${BR.tx}px, ${BR.ty}px) scale(${k})`;
    const pos = (x, y) => [x / 100 * W * k + BR.tx, y / 100 * Hh * k + BR.ty];
    let h = LBL.map(([n, x, y]) => { const [a, b] = pos(x, y); return `<span class="map-lbl" style="left:${a}px;top:${b}px">${n}</span>`; }).join('');
    const me = pos(38, 47);
    h += `<span class="me-dot" style="left:${me[0]}px;top:${me[1]}px" title="موقعچ"></span>`;
    const pinBtn = (s, a, b) => `<button type="button" class="pin ${salonOffer(s.id) ? 'hot' : ''} ${BR.sel === s.id ? 'sel' : ''}" style="left:${a}px;top:${b}px" data-a="mapPin" data-id="${s.id}">${rose()}${s.n}</button>`;
    if (k < 0.95) {
      const groups = {};
      mapList.forEach((s) => { (groups[s.area] = groups[s.area] || []).push(s); });
      h += Object.values(groups).map((g) => {
        const x = g.reduce((a, s) => a + s.x, 0) / g.length, y = g.reduce((a, s) => a + s.y, 0) / g.length, [a, b] = pos(x, y);
        return g.length > 1 ? `<button type="button" class="pin cluster num" style="left:${a}px;top:${b}px" data-a="mapCluster" data-x="${x}" data-y="${y}" aria-label="${g.length} صالونات">${g.length}</button>` : pinBtn(g[0], a, b);
      }).join('');
    } else h += mapList.map((s) => { const [a, b] = pos(s.x, s.y); return pinBtn(s, a, b); }).join('');
    pins.innerHTML = h;
    const card = $('#mapCard');
    if (card) card.innerHTML = BR.sel != null && mapList.some((s) => s.id === BR.sel) ? salonCard(salon(BR.sel), { cat: BR.cat })
      : `<div class="card" style="text-align:center;padding:10px"><span class="m">${mapList.length ? 'اضغطي على اسم صالون حتى تشوفين تفاصيله · الذهبي عنده عرض' : 'ماكو صالون بهالفلتر بهالمنطقة'}</span></div>`;
  }
  function mapInit(view, list) {
    mapList = list;
    const box = $('#mapbox', view);
    if (!box) return;
    let drag = null;
    box.addEventListener('pointerdown', (e) => { if (e.target.closest('button,.map-card')) return; drag = { x: e.clientX, y: e.clientY, tx: BR.tx, ty: BR.ty }; box.setPointerCapture(e.pointerId); box.style.cursor = 'grabbing'; });
    box.addEventListener('pointermove', (e) => { if (!drag) return; BR.tx = drag.tx + (e.clientX - drag.x); BR.ty = drag.ty + (e.clientY - drag.y); mapPlace(); });
    const end = () => { drag = null; box.style.cursor = ''; };
    box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
    box.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
    requestAnimationFrame(mapPlace);
  }
  function zoomAt(f) {
    const box = $('#mapbox'); if (!box) return;
    const cx = box.clientWidth / 2, cy = box.clientHeight / 2;
    const k2 = Math.max(0.7, Math.min(2.4, BR.k * f)), r = k2 / BR.k;
    BR.tx = cx - (cx - BR.tx) * r; BR.ty = cy - (cy - BR.ty) * r; BR.k = k2;
    mapPlace();
  }
  function mapCenter(x, y, k) { const box = $('#mapbox'); if (!box) return; BR.k = k; BR.tx = box.clientWidth / 2 - x / 100 * box.clientWidth * k; BR.ty = box.clientHeight / 2 - y / 100 * box.clientHeight * k; mapPlace(); }
  A.mapZoom = (el, d) => zoomAt(+d.z > 0 ? 1.3 : 1 / 1.3);
  A.mapMe = () => mapCenter(38, 47, 1.2);
  A.mapPin = (el, d) => { BR.sel = +d.id; mapPlace(); };
  A.mapCluster = (el, d) => mapCenter(+d.x, +d.y, 1.4);

  /* ---------- salon page ---------- */
  const REVIEWS = [['رنا', 5, 'السعر نفس المكتوب بالتطبيق، وبدوا بوقتي بالضبط.'], ['دعاء', 4, 'الشغل حلو، انتظرت 10 دقايق بس.'], ['زهراء', 5, 'نظيف ومرتب، والأدوات تنفتح قدامي من الكيس.'], ['آيات', 5, 'سارة فنانة بالصبغة، رجعت ثلاث مرات.']];
  function svcRow(s, id, cart) {
    const v = svc(id), on = cart[id] != null, pr = App.price(s.id, id, on ? cart[id] : 's'), c = catOf(id);
    return `<div class="svc ${on ? 'on' : ''}">
      <span class="th">${v.v ? img(v.v) : icb(c.icon, c.tone)}</span>
      <span class="tx"><b>${v.n}</b><span class="meta"><span>${ic('clock')}${dur(v.d)}</span>${v.len ? `<span>${ic('hair-m')}${on ? lenName(cart[id]) : 'حسب الطول'}</span>` : ''}${v.allergy ? `<span>${ic('alert')}اختبار حساسية</span>` : ''}</span>
        <span class="price">${v.len && !on ? 'من ' : ''}${iqd(pr.p)}${pr.old ? `<span class="strike num">${money(pr.old)}</span>${pill('عرض', 'gold')}` : ''}</span>
        <button type="button" class="more adv" style="justify-self:start;min-height:30px;padding:0" data-a="priceAlert" data-svc="${id}">${ic('bell')}${S.alerts[s.id + ':' + id] ? 'راح ننبهچ إذا نزل السعر' : 'نبهيني إذا نزل السعر'}</button></span>
      <button type="button" class="add" data-a="svcAdd" data-svc="${id}" aria-pressed="${on}" aria-label="${on ? 'شيلي ' : 'أضيفي '}${v.n}">${ic(on ? 'check' : 'plus')}</button></div>`;
  }
  SC['c.salon'] = (p) => {
    const s = salon(p.id);
    if (!p._init) { p._init = true; p.cart = {}; p.tab = p.tab || 'svc'; if (p.svc) p.cart[p.svc] = svc(p.svc).len ? 'm' : ''; learn(s.tagline.split(' ')[0], 1); }
    const cart = p.cart, ids = Object.keys(cart);
    const t = totals({ s: s.id, items: ids.map((id) => ({ svc: id, len: cart[id] })) });
    const off = salonOffer(s.id);
    const reels = reelsAll().filter((r) => +r.s === s.id);
    const tabs = [['svc', 'الخدمات'], ['gal', 'المعرض'], ['team', 'الكادر'], ['prod', 'المنتجات'], ['rev', 'التقييمات'], ['about', 'عن الصالون']];
    let tabBody = '';
    if (p.tab === 'svc') {
      tabBody = salonCats(s).map((cid) => { const c = CATS.find((x) => x.id === cid); return `<div class="grp-t">${icb(c.icon, c.tone, 'sm')}${c.n}</div>${s.svcs.filter((id) => svc(id).cat === cid).map((id) => svcRow(s, id, cart)).join('')}`; }).join('');
    } else if (p.tab === 'gal') {
      tabBody = reels.length ? `<div class="gal">${reels.map((r) => `<button type="button" data-go="c.stories" data-s="${s.id}" data-r="${r.id}" aria-label="${esc(r.cap)}">${img(r.v)}<span class="frame"></span><span class="play">${ic('play')}</span><span class="tagline">${rose()}${svc(r.svc).n}</span></button>`).join('')}</div>
        <div class="list">${reels.slice(0, 3).map((r) => `<div class="li">${icb('image', 'plum', 'sm')}<span class="tx"><b>${esc(r.cap)}</b><span class="m">${svc(r.svc).n}${r.consent ? ' · بموافقة الزبونة' : ''}</span></span><button type="button" class="btn xs soft" data-a="likeThis" data-svc="${r.svc}">احجزي مثلها</button></div>`).join('')}</div>
        <p class="tip">${ic('shield')}كل صورة تمر على الإدارة، والإطار الذهبي يضيفه التطبيق حتى ما تنسرق الصورة</p>`
        : emptyState({ icon: 'image', tone: 'plum', title: 'ماكو صور بعد', text: 'الصالون ما نزّل صور لحد هسة' });
    } else if (p.tab === 'team') {
      const nf = nextFree(s.id) || App.now();
      tabBody = `<div class="list">${s.staff.map((m, k) => `<div class="li">${avatar(m.n, ['rose', 'plum', 'gold', 'teal'][k % 4])}<span class="tx"><b>${m.n}</b><span class="meta"><span>${m.role}</span>${rating(m.r)}</span><span class="next">${ic('clock')}أقرب موعد ${hm(nf + k * 30 * MIN)}</span></span><button type="button" class="btn xs soft" data-a="bookWith" data-k="${k}">احجزي معها</button></div>`).join('')}</div>`;
    } else if (p.tab === 'prod') {
      const pr = PRODUCTS.filter((x) => x.s === s.id);
      tabBody = pr.length ? `<div class="grid2">${pr.map((x) => `<div class="prod"><span class="ph">${img(x.img)}${icb(x.icon, x.tone, 'sm')}</span><span class="bd"><b>${x.n}</b>${iqd(x.p)}<span class="m">أصلي بفاتورة مورد</span><button type="button" class="btn xs soft" data-go="c.gift" data-type="prod" data-id="${x.id}">${ic('gift')}اطلبي أو اهدي</button></span></div>`).join('')}</div>
        <p class="tip">${ic('truck')}استلميها بموعدچ بدون توصيل، أو توصيل داخل بغداد</p>` : emptyState({ icon: 'bag', tone: 'gold', title: 'ماكو منتجات', text: 'هالصالون ما يبيع منتجات بالتطبيق' });
    } else if (p.tab === 'rev') {
      const dist = [72, 18, 6, 3, 1];
      tabBody = `<div class="card"><div class="row"><div style="text-align:center"><div class="petal-count num">${s.r}</div><span class="m num">${s.rev} تقييم</span></div>
        <div class="stack" style="flex:1;gap:4px">${dist.map((v, k) => `<div class="row" style="gap:6px"><span class="m num" style="width:14px">${5 - k}</span><span class="bar"><i style="width:${v}%"></i></span></div>`).join('')}</div></div>
        <div class="grid3">${[['spray', 'النظافة', s.hy], ['clock', 'بالوقت', '94%'], ['tag', 'السعر صحيح', '97%']].map((x) => `<div style="text-align:center;display:grid;justify-items:center;gap:2px">${icb(x[0], 'teal', 'sm')}<span class="m">${x[1]}</span><b class="num">${x[2]}</b></div>`).join('')}</div></div>
        <div class="card" style="gap:0">${REVIEWS.map((r) => `<div class="review"><div class="row"><b>${r[0]}</b><span class="rate">${ic('star')}${r[1]}</span></div><span>${r[2]}</span><span>${pill('زيارة مؤكدة بالرمز', 'ok', 'qr')}</span></div>`).join('')}</div>
        <p class="tip">${ic('info')}التقييم ينكتب بس بعد زيارة مؤكدة بالرمز، وما ينشترى</p>`;
    } else {
      tabBody = `<div class="menu">
        <div>${icb('clock', 'teal', 'sm')}<span class="tx"><b>الدوام</b><span class="m">كل يوم 10:00 ص – 8:00 م · الجمعة من 2:00 م</span></span></div>
        <div>${icb('pin', 'rose', 'sm')}<span class="tx"><b>${s.home ? 'المنطقة' : 'العنوان'}</b><span class="m">${s.home ? areaName(s.area) + ' · الموقع الدقيق يوصلچ بعد تأكيد الحجز' : s.lm + '، ' + areaName(s.area)}</span></span></div>
        <div>${icb('shield', 'ok', 'sm')}<span class="tx"><b>موثّق من صالوناتي</b><span class="m">آخر فحص ${s.chk} · إجازة صحية سارية · للنساء فقط</span></span></div>
        <div>${icb('lock', 'warn', 'sm')}<span class="tx"><b>قاعدة الإلغاء</b><span class="m">تلغين ويرجع العربون لحد ساعة قبل الموعد</span></span></div>
        <div>${icb('phone', 'sky', 'sm')}<span class="tx"><b>رقم الصالون</b><span class="m num" dir="ltr" style="text-align:end">${s.phone}</span></span></div>
      </div><p class="tip">${ic('info')}الصالون ما يكدر يضيف حقن أو ليزر، هاي خدمات للعيادات المرخصة بس</p>`;
    }
    return {
      head: '', 
      body: `<div class="hero">${img(s.cover + '-wide', '', s.n)}<div class="hero-bar"><button type="button" class="ibtn" data-a="back" aria-label="رجوع">${ic('arrow-r')}</button>
          <span class="grp"><button type="button" class="ibtn ${S.favs[s.id] ? 'on' : ''}" data-a="fav" data-id="${s.id}" aria-label="حفظ" aria-pressed="${!!S.favs[s.id]}">${ic('heart')}</button><button type="button" class="ibtn" data-a="shareSalon" data-id="${s.id}" aria-label="مشاركة">${ic('share')}</button></span></div></div>
        <div class="s-head"><div class="row"><h1 tabindex="-1">${s.n}</h1>${verified()}</div>
          <div class="meta">${rating(s.r, s.rev)}<span>${ic('pin')}${s.km} كم · ${s.home ? areaName(s.area) : s.lm}</span>${s.home ? pill('صالون بيتي', 'muted', 'home') : ''}${s.founder ? pill('مؤسِّسة', 'gold', 'crown') : ''}</div>
          <div class="trust"><div>${icb('shield', 'ok', 'sm')}موثّق<span class="m">${s.chk}</span></div><div>${icb('spray', 'teal', 'sm')}النظافة<b class="num">${s.hy}</b></div><div>${icb('users', 'plum', 'sm')}للنساء<span class="m">فقط</span></div></div>
          <div class="qa"><button type="button" data-a="callSalon" data-id="${s.id}">${icb('phone', 'sky')}اتصلي</button><button type="button" data-a="waSalon" data-id="${s.id}">${icb('whatsapp', 'mint')}واتساب</button><button type="button" data-a="dirs" data-id="${s.id}">${icb('nav', 'teal')}الطريق</button><button type="button" data-a="follow" data-id="${s.id}" aria-pressed="${!!S.follows[s.id]}">${icb(S.follows[s.id] ? 'check' : 'plus', 'rose')}${S.follows[s.id] ? 'تتابعينه' : 'تابعي'}</button></div>
          ${off ? `<div class="card gold"><div class="row start">${icb('zap', 'gold')}<span class="tx"><b>عرض ساعة فارغة: ${svc(off.svc).n} خصم ${Math.round(off.pct * 100)}%</b><span class="m">اليوم من ${off.from} لـ ${off.to} · باقي ${off.left} مواعيد</span></span></div></div>` : ''}
        </div>
        <div class="tabs" role="tablist">${tabs.map((x) => `<button type="button" role="tab" aria-selected="${p.tab === x[0]}" data-a="sTab" data-v="${x[0]}">${x[1]}${x[0] === 'gal' && reels.length ? ` <small class="num">${reels.length}</small>` : ''}</button>`).join('')}</div>
        <div class="sec" style="margin-top:12px">${tabBody}</div>`,
      bar: `<span class="tx"><span class="m">${ids.length ? ids.length + ' خدمة · ' + dur(t.dur) : 'اختاري خدمة أو أكثر'}</span><b class="num">${ids.length ? money(t.total) + ' د.ع' : '—'}</b></span>
        <button type="button" class="btn lg" data-a="toBook" ${ids.length ? '' : 'disabled'}>احجزي${ic('arrow-l')}</button>`,
      after: () => { const sc = $('#screen'); if (sc) { sc.classList.add('dark-top'); App.onLeave(() => sc.classList.remove('dark-top')); } }
    };
  };
  A.sTab = (el, d) => { App.cur().p.tab = d.v; App.refresh(); };
  A.svcAdd = (el, d) => {
    const p = App.cur().p, v = svc(d.svc);
    if (p.cart[d.svc] != null) { delete p.cart[d.svc]; App.refresh(); return; }
    if (!v.len) { p.cart[d.svc] = ''; learn(v.n, 1); App.refresh(); return; }
    App.sheet(`<h2>شكد طول شعرچ؟</h2><p class="m" style="margin:0">السعر يتغير حسب الطول. اختاري الأقرب لشعرچ</p>
      <div class="lens">${LEN.map((l) => { const pr = App.price(p.id, d.svc, l.id); return `<button type="button" data-a="pickLen" data-svc="${d.svc}" data-v="${l.id}">${ic(l.icon)}<span>${l.n}</span><span class="m num">${money(pr.p)}</span></button>`; }).join('')}</div>
      <p class="tip">${ic('info')}إذا الطول طلع غير، الموظفة تطلب موافقتچ من موبايلچ قبل أي تغيير بالسعر</p>`, { label: 'طول الشعر'});
  };
  A.pickLen = (el, d) => { const p = App.cur().p; p.cart[d.svc] = d.v; learn(svc(d.svc).n, 1); App.closeSheet(true); App.refresh(); };
  A.toBook = () => { const p = App.cur().p; draftNew(p.id, Object.keys(p.cart).map((id) => ({ svc: id, len: p.cart[id] })), { staff: p.pickStaff == null ? -1 : p.pickStaff }); App.go('c.book'); };
  A.bookWith = (el, d) => {
    const p = App.cur().p, ids = Object.keys(p.cart);
    if (!ids.length) { p.tab = 'svc'; p.pickStaff = +d.k; App.refresh(); App.toast('اختاري الخدمة أول، وبعدين الوقت ويا ' + salon(p.id).staff[+d.k].n, { icon: 'info' }); return; }
    draftNew(p.id, ids.map((id) => ({ svc: id, len: p.cart[id] })), { staff: +d.k }); App.go('c.book');
  };
  A.likeThis = (el, d) => { const p = App.cur().p; p.cart = {}; p.cart[d.svc] = svc(d.svc).len ? 'm' : ''; p.tab = 'svc'; App.refresh(); App.toast('أضفنا الخدمة، اختاري الوقت', { icon: 'check' }); };
  A.priceAlert = (el, d) => { if (!requireAuth('')) return; const k = App.cur().p.id + ':' + d.svc; S.alerts[k] = !S.alerts[k]; if (S.alerts[k]) learn(svc(d.svc).n, 2); App.save(); App.refresh(); App.toast(S.alerts[k] ? 'راح نبلغچ إذا نزل السعر' : 'شلنا التنبيه', { icon: 'bell' }); };
  A.fav = (el, d) => { S.favs[d.id] = !S.favs[d.id]; App.save(); App.refresh(); App.toast(S.favs[d.id] ? 'انحفظ بالمفضلة' : 'انشال من المفضلة', { icon: 'heart' }); };
  A.follow = (el, d) => { S.follows[d.id] = !S.follows[d.id]; App.save(); App.refresh(); App.toast(S.follows[d.id] ? 'تتابعين الصالون، عروضه توصلچ' : 'لغيتي المتابعة', { icon: 'bell' }); };
  A.callSalon = (el, d) => { const s = salon(d.id); App.sheet(`<div class="confirm">${icb('phone', 'sky', 'xl')}<h2>اتصلي بـ ${s.n}</h2><p class="num" dir="ltr" style="font-size:1.4em;font-weight:700;color:var(--ink)">${s.phone}</p><a class="btn block lg" href="tel:${s.phone.replace(/\s/g, '')}">${ic('phone')}اتصلي</a><button type="button" class="btn ghost block" data-a="copyText" data-t="${s.phone}">${ic('copy')}انسخي الرقم</button></div>`, { label: 'اتصال' }); };
  A.waSalon = (el, d) => { const s = salon(d.id); App.sheet(`<div class="confirm">${icb('whatsapp', 'mint', 'xl')}<h2>واتساب ${s.n}</h2><p>للأسئلة بس. الحجز من التطبيق يحفظ مكانچ ويجمعلچ بتلات.</p><p class="num" dir="ltr" style="font-weight:700;color:var(--ink)">${s.phone}</p><button type="button" class="btn wa block lg" data-a="copyText" data-t="${s.phone}">${ic('copy')}انسخي الرقم</button></div>`, { label: 'واتساب' }); };
  A.dirs = (el, d) => { const s = salon(d.id); App.sheet(`<div class="confirm">${icb('nav', 'teal', 'xl')}<h2>الطريق لـ ${s.n}</h2><p>${s.home ? 'صالون بيتي: العنوان الدقيق يوصلچ بعد تأكيد الحجز' : s.lm + '، ' + areaName(s.area)}</p><p class="m">${s.km} كم · حوالي ${Math.round(s.km * 4 + 5)} دقيقة بالسيارة</p><button type="button" class="btn block lg" data-a="copyText" data-t="${s.lm}، ${areaName(s.area)}، بغداد">${ic('copy')}انسخي العنوان للسايق</button></div>`, { label: 'الطريق' }); };
  A.shareSalon = (el, d) => openShare(`${salon(d.id).n} على صالوناتي`, `salonati.iq/s/${d.id}?r=${S.user.ref}`);
  A.copyText = (el, d) => {
    const done = () => App.toast('انتسخ', { icon: 'copy', tone: 'ok' });
    try { navigator.clipboard.writeText(d.t).then(done, () => App.toast(d.t, { icon: 'copy', ms: 4000 })); } catch (e) { App.toast(d.t, { icon: 'copy', ms: 4000 }); }
  };
  A.shareVia = (el, d) => { App.closeSheet(true); App.toast(`تجهز الرابط للمشاركة على ${d.v}`, { icon: 'share', tone: 'ok' }); };

  /* ---------- booking: when and who ---------- */
  function steps(on) {
    const st = [['check', 'الخدمة'], ['clock', 'الوقت'], ['card', 'العربون']];
    return `<div class="steps" aria-label="خطوات الحجز">${st.map((x, k) => `<div class="step ${k < on ? 'done' : k === on ? 'on' : ''}"><span class="dot">${ic(k < on ? 'check' : x[0])}</span>${x[1]}</div>`).join('')}</div>`;
  }
  SC['c.book'] = () => {
    const dr = S.draft;
    if (!dr || !dr.items.length) return { redirect: 'c.home' };
    const s = salon(dr.s), t = totals(dr);
    const slots = slotsFor(s.id, dr.day, dr.staff);
    if (dr.ts && !slots.some((x) => x.ts === dr.ts && !x.dis)) dr.ts = null;
    const parts = [['am', 'الصبح', 'sun', 'amber'], ['noon', 'الظهر', 'sunset', 'rose'], ['pm', 'المساء', 'moon', 'plum']];
    const days = [0, 1, 2, 3, 4, 5, 6].map((k) => dayStart(k));
    const free = slots.filter((x) => !x.dis).length;
    const refs = reelsAll().filter((r) => S.saves[r.id]).concat(reelsAll().filter((r) => +r.s === s.id && !S.saves[r.id])).slice(0, 6);
    return {
      title: dr.resched ? 'غيّري الموعد' : 'اختاري الوقت', sub: s.n,
      body: `${steps(1)}
        <div class="sec" style="margin-top:0"><div class="card">${dr.items.map((it) => { const pr = App.price(s.id, it.svc, it.len), c = catOf(it.svc); return `<div class="row"><span class="row start" style="gap:8px">${icb(c.icon, c.tone, 'sm')}<span class="tx"><b>${svc(it.svc).n}</b><span class="m">${dur(svc(it.svc).d)}${it.len ? ' · شعر ' + lenName(it.len) : ''}</span></span></span><b class="num">${money(pr.p)}</b></div>`; }).join('')}
          ${dr.resched ? '' : `<button type="button" class="more" style="justify-self:start" data-a="editSvcs">${ic('edit')}غيّري الخدمات</button>`}</div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('user')}منو تسويلچ؟</h2></div></div>
        <div class="staff-pick" style="margin-top:8px"><button type="button" data-a="dStaff" data-k="-1" aria-pressed="${dr.staff === -1}">${icb('zap', 'gold', 'round')}<span>أي وحدة<br>أقرب</span></button>${s.staff.map((m, k) => `<button type="button" data-a="dStaff" data-k="${k}" aria-pressed="${dr.staff === k}">${avatar(m.n, ['rose', 'plum', 'gold', 'teal'][k % 4])}<span>${m.n}</span><span class="rate">${ic('star')}${m.r}</span></button>`).join('')}</div>
        <div class="sec"><div class="sec-h"><h2>${ic('cal')}أي يوم؟</h2><span class="m">${dateLong(days[dr.day].getTime())}</span></div></div>
        <div class="days" style="margin-top:8px">${days.map((d, k) => `<button type="button" data-a="dDay" data-k="${k}" aria-pressed="${dr.day === k}"><span>${k === 0 ? 'اليوم' : k === 1 ? 'باجر' : DAYS[d.getDay()]}</span><b class="num">${d.getDate()}</b></button>`).join('')}</div>
        <div class="sec"><div class="sec-h"><h2>${ic('clock')}أي ساعة؟</h2><span class="m num">${free} وقت فاضي</span></div>
          ${free ? parts.map((pt) => { const xs = slots.filter((x) => x.part === pt[0]); return xs.length ? `<div class="part">${icb(pt[2], pt[3])}${pt[1]}</div><div class="slots">${xs.map((x) => `<button type="button" class="slot num ${x.hot ? 'hot' : ''}" data-a="dSlot" data-ts="${x.ts}" ${x.dis ? 'disabled aria-label="محجوز"' : ''} aria-pressed="${dr.ts === x.ts}">${hm(x.ts).replace(/ [صم]$/, '')}</button>`).join('')}</div>` : ''; }).join('')
          : emptyState({ icon: 'clock', tone: 'amber', title: 'هاليوم كله محجوز', text: 'اختاري يوم ثاني، أو سجلي بقائمة الانتظار ونبلغچ إذا فرغ مكان' })}
          <button type="button" class="li" data-a="waitlist">${icb('bell', 'sky')}<span class="tx"><b>ما لقيتي وقت يناسبچ؟</b><span class="m">سجلي بقائمة الانتظار ونبلغچ أول ما يفرغ موعد</span></span>${ic('chev-l')}</button>
        </div>
        ${refs.length ? `<div class="sec adv"><div class="sec-h"><h2>${ic('image')}صورة للموظفة (اختياري)</h2></div></div>
          <div class="hscroll adv" style="margin-top:8px">${refs.map((r) => `<button type="button" class="gal-pick" data-a="dRef" data-id="${r.id}" aria-pressed="${dr.ref === r.id}" aria-label="${esc(r.cap)}">${img(r.v)}${dr.ref === r.id ? `<span class="ok-badge">${ic('check')}</span>` : ''}</button>`).join('')}</div>
          <div class="sec adv" style="margin-top:6px"><p class="tip">${ic('info')}الصورة توصل للموظفة قبل الموعد حتى تعرف شنو تريدين بالضبط</p></div>` : ''}`,
      bar: `<span class="tx"><span class="m">${dr.ts ? when(dr.ts) : 'ما اخترتي وقت'}</span><b class="num">${money(t.total)} د.ع</b></span>
        <button type="button" class="btn lg" data-a="toPay" ${dr.ts ? '' : 'disabled'}>التالي${ic('arrow-l')}</button>`
    };
  };
  A.editSvcs = () => App.back();
  A.dStaff = (el, d) => { S.draft.staff = +d.k; App.save(); App.refresh(); };
  A.dDay = (el, d) => { S.draft.day = +d.k; S.draft.ts = null; App.save(); App.refresh(); };
  A.dSlot = (el, d) => { S.draft.ts = +d.ts; App.save(); App.refresh(); };
  A.dRef = (el, d) => { S.draft.ref = S.draft.ref === d.id ? null : d.id; App.save(); App.refresh(); };
  A.toPay = () => { if (requireAuth('c.pay')) App.go('c.pay'); };
  A.waitlist = () => {
    if (!requireAuth('')) return;
    const dr = S.draft, s = salon(dr.s);
    App.sheet(`<div class="confirm">${icb('bell', 'sky', 'xl')}<h2>قائمة الانتظار</h2><p>نبلغچ إذا انلغى موعد ${dr.day === 0 ? 'اليوم' : dateLong(dayStart(dr.day).getTime())} عند ${dr.staff >= 0 ? s.staff[dr.staff].n : s.n}. أول وحدة تأكد تاخذ المكان.</p>
      <div class="btns"><button type="button" class="btn block lg" data-a="waitYes">${ic('check')}سجليني</button><button type="button" class="btn ghost block" data-a="close">لا، رجوع</button></div></div>`, { label: 'قائمة الانتظار'});
  };
  A.waitYes = () => {
    const dr = S.draft, s = salon(dr.s);
    S.waitlist.push({ s: dr.s, day: dr.day, staff: dr.staff, items: dr.items, t: App.now() });
    App.save(); App.closeSheet(true);
    App.toast('سجلناچ بقائمة الانتظار', { icon: 'bell', tone: 'ok' });
    setTimeout(() => App.notify({ role: 'client', kind: 'wait', icon: 'bell', tone: 'sky', title: 'فرغ موعد عند ' + (dr.staff >= 0 ? s.staff[dr.staff].n : s.n), text: 'انلغى موعد الساعة 3:30 م، أكديه قبل غيرچ', to: 'c.salon', p: { id: String(s.id) } }), 9000);
  };

  /* ---------- booking: deposit ---------- */
  const PAY = [
    { id: 'zain', n: 'زين كاش', d: 'توافقين من تطبيق زين كاش', logo: 'ZainCash', cls: 'zain' },
    { id: 'qi', n: 'كي كارد', d: 'بطاقة كي أو تطبيق سوبر كي', logo: 'Qi', cls: 'qi' }
  ];
  App.PAY = PAY;
  SC['c.pay'] = () => {
    const dr = S.draft;
    if (!dr || !dr.ts) return { redirect: 'c.book' };
    const s = salon(dr.s), t = totals(dr), wallet = S.user.wallet || 0;
    const useW = dr.useWallet && wallet > 0 ? Math.min(wallet, t.dep) : 0, due = t.dep - useW;
    const allergy = dr.items.some((it) => svc(it.svc).allergy);
    if (dr.resched) {
      const b = S.bookings.find((x) => x.id === dr.resched);
      return {
        title: 'تأكيد الموعد الجديد', sub: s.n, 
        body: `${steps(2)}<div class="sec" style="margin-top:0"><div class="card"><div class="kv"><span>الموعد القديم</span><b class="strike">${when(b.at)}</b></div><div class="kv"><span>الموعد الجديد</span><b>${when(dr.ts)}</b></div><div class="kv"><span>العربون</span><b>${pill('مدفوع سابقاً', 'ok', 'check')}</b></div></div>
          <div class="rule ok">${ic('info')}<span>التغيير مجاني لحد ساعة قبل الموعد، والصالون يوصله إشعار فوراً</span></div></div>`,
        bar: `<button type="button" class="btn block lg" data-a="reschedDo">${ic('check')}ثبتي الموعد الجديد</button>`
      };
    }
    return {
      title: 'العربون', sub: 'خطوة أخيرة', 
      body: `${steps(2)}
        <div class="sec" style="margin-top:0"><div class="card">
          <div class="row start">${img(s.cover, 'sq')}<span class="tx"><b>${s.n}</b><span class="m">${when(dr.ts)} · ${dur(t.dur)}</span><span class="m">${dr.staff >= 0 ? 'مع ' + s.staff[dr.staff].n : 'أي موظفة أقرب'}</span></span></div>
          <div class="divider"></div>
          ${dr.items.map((it) => `<div class="kv"><span>${svc(it.svc).n}${it.len ? ' · ' + lenName(it.len) : ''}</span><b class="num">${money(App.price(s.id, it.svc, it.len).p)}</b></div>`).join('')}
          ${t.old > t.total ? `<div class="kv" style="color:var(--ok)"><span>${ic('tag')} وفّرتي بالعرض</span><b class="num">${money(t.old - t.total)}</b></div>` : ''}
          <div class="kv tot"><span>المجموع</span><b class="num">${money(t.total)} د.ع</b></div>
          <div class="kv"><span>${ic('card')} العربون هسة</span><b class="num" style="color:var(--pri)">${money(t.dep)}</b></div>
          <div class="kv"><span>${ic('cash')} الباقي بالصالون</span><b class="num">${money(t.total - t.dep)}</b></div>
        </div></div>
        ${wallet ? `<div class="sec"><div class="li">${icb('wallet', 'rose', 'sm')}<span class="tx"><b>استخدمي رصيدچ</b><span class="m num">عندچ ${money(wallet)} دينار</span></span>${sw(dr.useWallet, 'dWallet', 'استخدمي رصيدچ')}</div></div>` : ''}
        <div class="sec"><div class="sec-h"><h2>${ic('card')}ادفعي العربون بـ</h2></div>
          <div class="pay">${PAY.map((x) => `<button type="button" class="opt" data-a="dPay" data-v="${x.id}" aria-pressed="${dr.pay === x.id}"><span class="logo ${x.cls}">${x.logo}</span><span class="tx"><b>${x.n}</b><span class="m">${x.d}</span></span><span class="radio"></span></button>`).join('')}</div>
          <p class="tip">${ic('cash')}الباقي تدفعينه بالصالون: كاش، كي كارد، أو زين كاش</p></div>
        ${allergy ? `<div class="sec"><div class="li" style="border-color:var(--warn)">${icb('alert', 'warn', 'sm')}<span class="tx"><b>عدچ حساسية؟</b><span class="m">${esc(S.user.allergy || 'ما مسجلة')} · توصل للموظفة قبل الصبغة</span></span>${pill('توصلها', 'warn', 'check')}</div></div>` : ''}
        <div class="sec"><div class="rule">${ic('lock')}<span>تكدرين تلغين ويرجع العربون لمحفظتچ لحد ساعة قبل الموعد. بعدها الإلغاء ينقفل.</span></div></div>`,
      bar: `<button type="button" class="btn block lg" data-a="payNow">${ic('lock')}ادفعي ${money(due)} د.ع${useW ? ` <small>+ ${money(useW)} رصيد</small>` : ''}</button>`
    };
  };
  A.dPay = (el, d) => { S.draft.pay = d.v; App.save(); App.refresh(); };
  A.dWallet = () => { S.draft.useWallet = !S.draft.useWallet; App.save(); App.refresh(); };
  A.payNow = () => App.go('c.paying');
  A.reschedDo = () => {
    const dr = S.draft, b = S.bookings.find((x) => x.id === dr.resched);
    b.at = dr.ts; b.staff = dr.staff >= 0 ? dr.staff : b.staff; b.moved = (b.moved || 0) + 1;
    App.notify({ role: 'salon', icon: 'refresh', tone: 'sky', title: 'تغيير موعد', text: `${b.cust} نقلت موعدها لـ ${when(b.at)}`, to: 's.booking', p: { id: b.id } });
    S.draft = null; App.save();
    App.tabTo('c.bookings'); App.go('c.ticket', { id: b.id });
    App.toast('تغيّر موعدچ', { icon: 'check', tone: 'ok' });
  };

  SC['c.paying'] = (p) => {
    const dr = S.draft;
    if (!dr) return { redirect: 'c.home' };
    const pm = PAY.find((x) => x.id === dr.pay) || PAY[0];
    if (p.err) return {
      title: 'ما تم الدفع', 
      body: emptyState({ icon: 'alert', tone: 'err', title: 'ما تم الدفع', text: `${pm.n} ما وافق على العملية. ما انسحب منچ أي مبلغ، وموعدچ بعده محجوز لچ 10 دقايق.`,
        action: `<div class="btns" style="width:100%"><button type="button" class="btn block lg" data-a="payRetry">${ic('refresh')}جربي مرة ثانية</button><button type="button" class="btn ghost block" data-a="payOther">ادفعي بطريقة ثانية</button></div>` })
    };
    return {
      head: '', 
      body: `<div class="perm" style="padding-top:70px"><span class="logo ${pm.cls} big-logo">${pm.logo}</span>
        <div class="spin" role="progressbar" aria-label="جاري الدفع"></div><h1 tabindex="-1">بانتظار موافقتچ</h1>
        <p>افتحي تطبيق ${pm.n} ووافقي على دفع العربون. لا تسدين هالصفحة.</p>
        <p class="tip">${ic('lock')}الدفع يمر عبر مزوّد مرخص، وصالوناتي ما تشوف بيانات بطاقتچ</p>
        <button type="button" class="btn ghost" data-a="payCancel">إلغاء</button></div>`,
      after: () => App.later(() => {
        if (S.failPay && !p.retried) { App.replace('c.paying', { err: '1' }); return; }
        createBooking();
      }, 2300)
    };
  };
  A.payRetry = () => App.replace('c.paying', { retried: '1' });
  A.payOther = () => { S.draft.pay = S.draft.pay === 'zain' ? 'qi' : 'zain'; App.save(); App.back(); };
  A.payCancel = () => App.back();

  function createBooking() {
    const dr = S.draft, s = salon(dr.s), t = totals(dr);
    const useW = dr.useWallet && S.user.wallet > 0 ? Math.min(S.user.wallet, t.dep) : 0;
    const b = {
      id: 'b' + String(Date.now()).slice(-6), mine: true, cust: S.user.name, s: s.id, items: dr.items.map((i) => ({ svc: i.svc, len: i.len })),
      staff: dr.staff >= 0 ? dr.staff : (hash(String(dr.ts)) % s.staff.length), anyStaff: dr.staff < 0, at: dr.ts, total: t.total, dep: t.dep, walletUsed: useW,
      pay: dr.pay, status: 'confirmed', created: App.now(), ref: dr.ref, isNew: !S.bookings.some((x) => x.mine && +x.s === s.id && x.status === 'done')
    };
    if (useW) { S.user.wallet -= useW; logW('عربون ' + s.n, -useW); }
    dr.items.forEach((it) => { const o = App.offerFor(s.id, it.svc); if (o && dr.day === 0) o.left = Math.max(0, o.left - 1); learn(svc(it.svc).n, 3); });
    S.bookings.push(b);
    S.draft = null;
    App.save();
    App.notify({ role: 'salon', icon: 'cal', tone: 'ok', title: 'حجز جديد من التطبيق', text: `${b.cust} · ${itemsText(b)} · ${when(b.at)}${b.isNew ? ' · زبونة جديدة' : ''}`, to: 's.booking', p: { id: b.id } });
    App.replace('c.booked', { id: b.id });
  }

  SC['c.booked'] = (p) => {
    const b = S.bookings.find((x) => x.id === p.id);
    if (!b) return { redirect: 'c.bookings' };
    const s = salon(b.s);
    return {
      head: '', 
      body: `<div class="done-hero"><span class="bigcheck">${ic('check')}</span><h1 tabindex="-1">انحجز موعدچ</h1><p class="m" style="margin:0">وصلچ تأكيد برسالة، وتذكير قبل يوم وقبل ساعتين</p></div>
        <div class="sec"><div class="card hl">
          <div class="row start">${icb('cal', 'rose', 'lg')}<span class="tx"><b style="font-size:1.15em">${when(b.at)}</b><span class="m">${s.n} · ${s.home ? areaName(s.area) : s.lm}</span></span></div>
          <div class="divider"></div>
          <div class="kv"><span>${itemsText(b)}</span><b class="num">${money(b.total)}</b></div>
          <div class="kv"><span>العربون المدفوع</span><b class="num" style="color:var(--ok)">${money(b.dep)}</b></div>
          <div class="kv"><span>الباقي بالصالون</span><b class="num">${money(b.total - b.dep)}</b></div>
          <div class="kv"><span>الموظفة</span><b>${s.staff[b.staff].n}${b.anyStaff ? ' (الأقرب)' : ''}</b></div>
        </div></div>
        <div class="sec"><div class="tl">
          <div class="tl-i done"><span class="tl-dot">${ic('check')}</span><span class="tx"><b>انحجز ودفعتي العربون</b></span></div>
          <div class="tl-i"><span class="tl-dot">${ic('bell')}</span><span class="tx"><b>تذكير قبل ساعتين</b></span></div>
          <div class="tl-i"><span class="tl-dot">${ic('qr')}</span><span class="tx"><b>الرمز يظهر قبل الموعد بنص ساعة</b></span></div>
          <div class="tl-i"><span class="tl-dot">${ic('star')}</span><span class="tx"><b>بعد الزيارة: تقييم وبتلة</b></span></div>
        </div></div>
        <div class="sec"><div class="btns"><button type="button" class="btn block lg" data-a="toTicket" data-id="${b.id}">${ic('qr')}شوفي تذكرتي</button>
          <div class="btnrow"><button type="button" class="btn plain" data-a="addCal">${ic('cal')}للتقويم</button><button type="button" class="btn plain" data-a="shareBooking" data-id="${b.id}">${ic('share')}لصديقتچ</button></div>
          <button type="button" class="btn ghost block" data-a="home">رجوع للرئيسية</button></div></div>`,
      after: () => App.celebrate()
    };
  };
  A.toTicket = (el, d) => { App.tabTo('c.bookings'); App.go('c.ticket', { id: d.id }); };
  A.addCal = () => App.toast('انضاف لتقويم موبايلچ', { icon: 'cal', tone: 'ok' });
  A.shareBooking = (el, d) => { const b = S.bookings.find((x) => x.id === d.id); openShare(`تعالي ويايه لـ ${salon(b.s).n} ${dayLabel(b.at)}`, `salonati.iq/s/${b.s}?r=${S.user.ref}`); };

  /* ---------- my bookings ---------- */
  function bookingRow(b) {
    const s = salon(b.s), ph = App.phase(b);
    return `<button type="button" class="li" data-go="${ph === 'done' ? 'c.rate' : 'c.ticket'}" data-id="${b.id}" style="align-items:flex-start">
      ${img(s.cover, 'sq')}
      <span class="tx"><b>${s.n}</b><span class="m">${itemsText(b)}</span><span class="num" style="font-weight:600;font-size:.9em">${when(b.at)}</span><span>${phasePill(b)}</span></span>${ic('chev-l')}</button>`;
  }
  SC['c.bookings'] = (p) => {
    if (!S.user.registered) return { title: 'مواعيدي', nav: 'c.bookings', body: guestPrompt('cal', 'مواعيدچ تظهر هنا', 'سجلي برقمچ وقت أول حجز، أو هسة حتى تشوفين مواعيدچ وتذكرتها') };
    const tab = p.tab || 'up';
    const up = App.upcoming(), past = App.mine().filter((b) => !up.includes(b)).sort((a, b) => b.at - a.at);
    const list = tab === 'up' ? up : past;
    return {
      title: 'مواعيدي', nav: 'c.bookings', 
      body: `<div class="sec" style="margin-top:0"><div class="seg" role="group"><button type="button" data-a="bkTab" data-v="up" aria-pressed="${tab === 'up'}">${ic('cal')}القادمة ${up.length ? `<span class="pill pri num">${up.length}</span>` : ''}</button><button type="button" data-a="bkTab" data-v="past" aria-pressed="${tab === 'past'}">${ic('clock')}السابقة</button></div></div>
        <div class="sec">${list.length ? `<div class="list">${list.map(bookingRow).join('')}</div>` : emptyState(tab === 'up'
          ? { icon: 'cal', tone: 'rose', title: 'ما عندچ مواعيد', text: 'احجزي بصالون موثّق قريب منچ بثلاث ضغطات', action: '<button type="button" class="btn" data-go="c.browse">احجزي هسة</button>' }
          : { icon: 'clock', tone: 'muted', title: 'ماكو مواعيد سابقة', text: 'مواعيدچ المنتهية تظهر هنا حتى تعيدين حجزها بضغطة' })}
          ${tab === 'past' && past.length ? `<p class="tip">${ic('refresh')}افتحي أي موعد قديم واضغطي «احجزي نفسه» حتى تعيدينه بنفس الموظفة</p>` : ''}
          ${tab === 'up' && S.waitlist.length ? `<div class="sec-h" style="margin-top:8px"><h2>${ic('bell')}قائمة الانتظار</h2></div>${S.waitlist.map((w) => `<div class="li">${icb('bell', 'sky', 'sm')}<span class="tx"><b>${salon(w.s).n}</b><span class="m">${w.day === 0 ? 'اليوم' : dateLong(dayStart(w.day).getTime())} · ${w.items.map((i) => svc(i.svc).n).join(' + ')}</span></span>${pill('ننتظر', 'muted')}</div>`).join('')}` : ''}
        </div>`
    };
  };
  A.bkTab = (el, d) => { App.cur().p.tab = d.v; App.refresh(); };

  /* ---------- ticket: the whole lifecycle of one booking ---------- */
  SC['c.ticket'] = (p) => {
    const b = S.bookings.find((x) => x.id === p.id);
    if (!b) return { redirect: 'c.bookings' };
    const s = salon(b.s), ph = App.phase(b), left = Math.round((b.at - App.now()) / MIN);
    const code = App.codeFor(b);
    const tl = [['check', 'انحجز ودفعتي العربون', when(b.created || b.at - 864e5)], ['qr', 'الرمز جاهز', 'قبل الموعد بنص ساعة'], ['pin', 'وصلتي للصالون', b.arrivedAt ? hm(b.arrivedAt) : 'الصالون يمسح الرمز'], ['sparkle', 'الخدمة', b.started ? 'بدت ' + hm(b.started) : s.staff[b.staff].n], ['star', 'قيّمي وخذي بتلة', b.rated ? 'شكراً' : '']];
    const step = ph === 'open' || ph === 'locked' ? 1 : ph === 'qr' ? 1 : ph === 'arrived' ? 2 : ph === 'inservice' ? 3 : ph === 'done' ? 4 : ph === 'rated' ? 5 : 0;
    let main = '';
    if (ph === 'open' || ph === 'locked') {
      const m = Math.max(0, left);
      main = `<div class="ticket blur">${qrSvg(hash(b.id))}<div class="lockover">${icb('lock', 'rose', 'lg')}<b>الرمز يظهر قبل الموعد بنص ساعة</b><span class="m">حتى ما تنفع لقطة الشاشة لغيرچ</span></div></div>
        <div class="countdown num">${[[Math.floor(m / 1440), 'يوم'], [Math.floor((m % 1440) / 60), 'ساعة'], [m % 60, 'دقيقة']].map((x) => `<div><b>${x[0]}</b><span class="m">${x[1]}</span></div>`).join('')}</div>`;
    } else if (ph === 'qr') {
      main = `<div class="ticket">${left < 0 ? pill('وقتچ بدا · عندچ ربع ساعة سماح', 'warn', 'clock') : pill('اعرضيه للصالون عند الوصول', 'pri', 'qr')}
        <div id="qrBox">${qrSvg(hash(code))}</div><div class="code num" id="codeTxt" data-c="${code}">${code.slice(0, 3)} ${code.slice(3)}</div>
        <div class="row" style="gap:10px"><span class="ring"><svg viewBox="0 0 46 46"><circle class="bgc" cx="23" cy="23" r="20"/><circle class="fgc" id="ringC" cx="23" cy="23" r="20" stroke-dasharray="125.7" stroke-dashoffset="0"/></svg><span id="ringN" class="num">30</span></span><span class="m" style="text-align:start">الرمز يتجدد كل 30 ثانية.<br>${S.offline ? '<b style="color:var(--warn)">ماكو نت: عطيهم الرقم بس</b>' : 'إذا انقطع النت بالصالون، عطيهم الرقم'}</span></div></div>`;
    } else if (ph === 'arrived' || ph === 'inservice') {
      main = `<div class="ticket"><span class="bigcheck" style="background:var(--pri)">${ic(ph === 'arrived' ? 'pin' : 'sparkle')}</span><h2 style="margin:0">${ph === 'arrived' ? 'أهلاً بيچ، سجلنا وصولچ' : 'الخدمة شغالة'}</h2>
        <span class="m">${ph === 'arrived' ? s.staff[b.staff].n + ' تجهز لچ هسة' : 'ويا ' + s.staff[b.staff].n + ' · بدت ' + hm(b.started || App.now())}</span>
        ${ph === 'inservice' ? `<div class="code num" id="elapsed" style="font-size:1.5em">00:00</div><span class="m">المدة المتوقعة ${dur(itemsDur(b))}</span>` : ''}</div>`;
    } else if (ph === 'done' || ph === 'rated') {
      main = `<div class="ticket"><span class="bigcheck">${ic('check')}</span><h2 style="margin:0">خلصت زيارتچ</h2><span class="m">${b.petal ? 'انضافت بتلة لوردتچ' : 'شكراً لزيارتچ'}</span>
        <div class="btnrow" style="width:100%">${ph === 'done' ? `<button type="button" class="btn" data-go="c.rate" data-id="${b.id}">${ic('star')}قيّمي</button>` : ''}<button type="button" class="btn plain" data-go="c.receipt" data-id="${b.id}">${ic('receipt')}الفاتورة</button></div></div>`;
    } else if (ph === 'cancelled') {
      main = emptyState({ icon: 'close', tone: 'muted', title: 'انلغى الموعد', text: `رجع العربون ${money(b.dep)} لمحفظتچ`, action: `<button type="button" class="btn" data-a="rebook" data-id="${b.id}">احجزي من جديد</button>` });
    } else if (ph === 'missed') {
      main = emptyState({ icon: 'alert', tone: 'err', title: 'فات الموعد', text: 'الصالون ما سجل وصولچ. إذا حضرتي فعلاً افتحي اعتراض، والإدارة تراجعه', action: b.dispute ? pill('الاعتراض قيد المراجعة', 'warn', 'clock') : `<button type="button" class="btn" data-a="dispute" data-id="${b.id}">${ic('flag')}حضرت، افتحي اعتراض</button>` });
    }
    const extraP = b.extraReq && b.extraReq.status === 'yes' ? b.extraReq.p : 0;
    const extra = b.extraReq && b.extraReq.status === 'pending' ? `<div class="card hl"><div class="row start">${icb('plus', 'gold')}<span class="tx"><b>الصالون يقترح إضافة</b><span class="m">${esc(b.extraReq.n)} بـ ${money(b.extraReq.p)} دينار. ما تنضاف إلا بموافقتچ</span></span></div>
        <div class="btnrow"><button type="button" class="btn ok" data-a="extraAns" data-v="yes">${ic('check')}موافقة</button><button type="button" class="btn plain" data-a="extraAns" data-v="no">لا، شكراً</button></div></div>` : '';
    const active = ['open', 'locked', 'qr'].includes(ph);
    return {
      title: s.n, sub: when(b.at), actions: phasePill(b),
      body: `<div class="sec" style="margin-top:0">${extra}${main}
          ${ph === 'open' || ph === 'locked' ? `<p class="m" style="text-align:center;margin:0">باقي ${dur(Math.max(0, left))} على موعدچ</p>` : ''}</div>
        ${active ? `<div class="sec"><div class="qa">
          <button type="button" data-a="dirs" data-id="${s.id}">${icb('nav', 'teal')}الطريق</button>
          <button type="button" data-a="callSalon" data-id="${s.id}">${icb('phone', 'sky')}اتصلي</button>
          <button type="button" data-a="late" data-id="${b.id}">${icb('timer', 'amber')}راح أتأخر</button>
          <button type="button" data-a="resched" data-id="${b.id}">${icb('refresh', 'plum')}غيّري</button></div></div>` : ''}
        <div class="sec"><div class="sec-h"><h2>${ic('list')}مراحل موعدچ</h2></div><div class="tl">${tl.map((x, k) => `<div class="tl-i ${k < step ? 'done' : k === step ? 'now' : ''}"><span class="tl-dot">${ic(k < step ? 'check' : x[0])}</span><span class="tx"><b>${x[1]}</b><span class="m">${x[2]}</span></span></div>`).join('')}</div></div>
        <div class="sec"><div class="card">
          <div class="kv"><span>${itemsText(b)}</span><b class="num">${money(b.total)}</b></div>
          ${extraP ? `<div class="kv"><span>${esc(b.extraReq.n)}</span><b class="num">${money(extraP)}</b></div>` : ''}
          <div class="kv"><span>العربون (${b.pay === 'qi' ? 'كي كارد' : b.pay === 'zain' ? 'زين كاش' : 'كاش'})</span><b class="num" style="color:var(--ok)">${money(b.dep)}</b></div>
          <div class="kv tot"><span>${b.paid ? 'دفعتي بالصالون' : 'الباقي بالصالون'}</span><b class="num">${money(b.total + extraP - b.dep)} د.ع</b></div>
          <div class="kv"><span>الموظفة</span><b>${s.staff[b.staff].n}</b></div>
          ${b.late ? `<div class="kv"><span>بلغتي الصالون</span><b>${pill('متأخرة ' + b.late + ' دقيقة', 'warn', 'timer')}</b></div>` : ''}
        </div></div>
        ${active ? `<div class="sec">${ph === 'open' ? `<button type="button" class="btn danger block" data-a="cancelB" data-id="${b.id}">${ic('close')}ألغي الموعد</button><p class="tip" style="justify-content:center">${ic('info')}الإلغاء متاح لحد ساعة قبل الموعد، والعربون يرجع لمحفظتچ</p>`
          : `<div class="rule">${ic('lock')}<span>باقي أقل من ساعة، فما نكدر نلغي الموعد. إذا ما تكدرين تجين، العربون يروح للصالون.</span></div>`}</div>` : ''}`,
      after: () => {
        App.every(() => {
          if (App.phase(b) !== ph) { App.refresh(); return; }
          if (ph === 'qr') {
            const sec = 30 - Math.floor((App.now() / 1000) % 30), c = App.codeFor(b);
            const n = $('#ringN'), r = $('#ringC'), ct = $('#codeTxt');
            if (n) n.textContent = sec;
            if (r) r.setAttribute('stroke-dashoffset', String(125.7 * (1 - sec / 30)));
            if (ct && ct.dataset.c !== c) { ct.dataset.c = c; ct.textContent = c.slice(0, 3) + ' ' + c.slice(3); const q = $('#qrBox'); if (q) q.innerHTML = qrSvg(hash(c)); }
          }
          if (ph === 'inservice') { const e = $('#elapsed'); if (e) { const sx = Math.max(0, Math.floor((App.now() - (b.started || App.now())) / 1000)); e.textContent = `${String(Math.floor(sx / 60)).padStart(2, '0')}:${String(sx % 60).padStart(2, '0')}`; } }
        }, 1000);
      }
    };
  };
  A.extraAns = (el, d) => {
    const b = S.bookings.find((x) => x.id === App.cur().p.id);
    b.extraReq.status = d.v;
    App.notify({ role: 'salon', icon: d.v === 'yes' ? 'check' : 'close', tone: d.v === 'yes' ? 'ok' : 'err', title: d.v === 'yes' ? 'الزبونة وافقت على الإضافة' : 'الزبونة رفضت الإضافة', text: `${b.cust} · ${b.extraReq.n}`, to: 's.checkout', p: { id: b.id } });
    App.save(); App.refresh();
  };
  A.cancelB = (el, d) => {
    const b = S.bookings.find((x) => x.id === d.id);
    App.confirmBox({ icon: 'close', tone: 'err', title: 'تلغين الموعد؟', text: `يرجع العربون ${money(b.dep)} دينار لمحفظتچ بصالوناتي`, ok: 'إي، ألغيه', danger: true, onOk: () => {
      b.status = 'cancelled'; S.user.wallet += b.dep; logW('رجوع عربون ' + salon(b.s).n, b.dep); App.save();
      App.notify({ role: 'salon', icon: 'close', tone: 'err', title: 'انلغى موعد', text: `${b.cust} لغت ${itemsText(b)} · ${when(b.at)}. الوقت صار فارغ`, to: 's.today' });
      App.refresh(); App.toast('انلغى موعدچ ورجع العربون لمحفظتچ', { icon: 'wallet', tone: 'ok' });
    } });
  };
  A.late = (el, d) => {
    App.sheet(`<h2>${ic('timer')} شكد راح تتأخرين؟</h2><p class="m" style="margin:0">نبلغ الصالون حتى يرتبون وقتهم. نهاية موعدچ تبقى نفسها.</p>
      <div class="grid3">${[5, 10, 15].map((m) => `<button type="button" class="btn plain lg" data-a="lateSet" data-id="${d.id}" data-m="${m}"><span class="num">${m}</span>&nbsp;دقايق</button>`).join('')}</div>`, { label: 'تأخير'});
  };
  A.lateSet = (el, d) => {
    const b = S.bookings.find((x) => x.id === d.id); b.late = +d.m; App.save(); App.closeSheet(true);
    App.notify({ role: 'salon', icon: 'timer', tone: 'warn', title: `${b.cust} راح تتأخر ${d.m} دقايق`, text: `${itemsText(b)} · ${hm(b.at)}`, to: 's.booking', p: { id: b.id } });
    App.toast('بلغنا الصالون', { icon: 'check', tone: 'ok' }); App.refresh();
  };
  A.resched = (el, d) => {
    const b = S.bookings.find((x) => x.id === d.id);
    if (App.phase(b) !== 'open') { App.toast('باقي أقل من ساعة، ما نكدر نغير الموعد', { icon: 'lock', tone: 'err' }); return; }
    draftNew(b.s, b.items, { staff: b.staff, resched: b.id, day: Math.max(0, dayDiff(b.at)) });
    App.go('c.book');
  };
  A.dispute = (el, d) => {
    const b = S.bookings.find((x) => x.id === d.id);
    b.dispute = true;
    S.admin.disputes.unshift({ id: 'd' + Date.now(), cust: b.cust, s: b.s, amount: b.dep, text: 'تقول حضرت بالوقت والصالون ما مسح الرمز', t: App.now(), status: 'open', b: b.id, mine: true });
    App.notify({ role: 'admin', icon: 'flag', tone: 'warn', title: 'اعتراض على عربون', text: `${b.cust} · ${salon(b.s).n}`, to: 'a.disputes' });
    App.save(); App.refresh(); App.toast('وصل اعتراضچ للإدارة، نرد عليچ اليوم', { icon: 'flag', tone: 'ok' });
  };

  /* ---------- rating ---------- */
  const FACES = [['face1', 'سيء', 'err'], ['face2', 'مو زين', 'amber'], ['face3', 'عادي', 'muted'], ['face4', 'حلو', 'teal'], ['face5', 'يجنن', 'rose']];
  SC['c.rate'] = (p) => {
    const b = S.bookings.find((x) => x.id === p.id);
    if (!b) return { redirect: 'c.bookings' };
    const s = salon(b.s);
    p.r = p.r || {};
    const r = p.r;
    if (b.rated && !p.justRated) return { redirect: 'c.receipt', redirectP: { id: b.id } };
    if (p.justRated) {
      const full = S.user.petals >= 8;
      return {
        head: '', 
        body: `<div class="done-hero"><div class="big-petals">${petals(S.user.petals)}</div><h1 tabindex="-1">${full ? 'كملت وردتچ!' : 'شكراً على تقييمچ'}</h1>
          <p class="m" style="margin:0">${full ? 'ربحتي جلسة هدية لحد 25,000 دينار بأي صالون موثّق' : `صار عندچ <b class="num">${S.user.petals}</b> بتلات. باقي ${8 - S.user.petals} وتربحين جلسة هدية`}</p></div>
          <div class="sec"><div class="btns">${full ? `<button type="button" class="btn gold block lg" data-a="claimGift">${ic('gift')}استلمي هديتچ</button>` : ''}
            <button type="button" class="btn block lg" data-a="rebook" data-id="${b.id}">${ic('refresh')}احجزي نفس الموعد مرة ثانية</button>
            <button type="button" class="btn plain block" data-go="c.receipt" data-id="${b.id}">${ic('receipt')}الفاتورة</button>
            <button type="button" class="btn ghost block" data-a="home">رجوع للرئيسية</button></div></div>`,
        after: () => App.celebrate()
      };
    }
    const faces = (k) => `<div class="faces" role="group">${FACES.map((f, i) => `<button type="button" data-a="rateSet" data-k="${k}" data-v="${i + 1}" aria-pressed="${r[k] === i + 1}">${icb(f[0], f[2])}${f[1]}</button>`).join('')}</div>`;
    const yn = (k, q) => `<div class="field"><span class="lbl">${q}</span><div class="yn"><button type="button" data-a="rateSet" data-k="${k}" data-v="1" aria-pressed="${r[k] === 1}">${ic('thumb')}إي</button><button type="button" data-a="rateSet" data-k="${k}" data-v="0" aria-pressed="${r[k] === 0}">${ic('thumb-d')}لا</button></div></div>`;
    return {
      title: 'قيّمي زيارتچ', sub: s.n + ' · ' + dayLabel(b.at), 
      body: `<div class="sec" style="margin-top:0"><div class="card"><span class="lbl">${ic('star')}شلون كانت الزيارة؟</span>${faces('all')}</div>
        <div class="card"><span class="lbl">${avatar(s.staff[b.staff].n, 'plum')}${s.staff[b.staff].n}</span>${faces('staff')}</div>
        <div class="card"><span class="lbl">${ic('spray')}النظافة</span>${faces('clean')}</div>
        <div class="card">${yn('price', 'السعر نفس المكتوب بالتطبيق؟')}${yn('time', 'بدوا بوقتچ؟')}</div>
        <div class="field"><label for="rc">${ic('chat')}تحبين تكتبين شي؟ (اختياري)</label><textarea class="inp" id="rc" data-in="rateTxt" maxlength="300" placeholder="مثلاً: الشغل حلو والمكان مرتب">${esc(r.txt || '')}</textarea></div>
        <p class="tip">${ic('shield')}يظهر اسمچ الأول بس. الصالون ما يكدر يمسح تقييمچ</p></div>`,
      bar: `<button type="button" class="btn block lg" data-a="rateSend" ${r.all ? '' : 'disabled'}>${ic('check')}أرسلي التقييم</button>`
    };
  };
  A.rateSet = (el, d) => { App.cur().p.r[d.k] = +d.v; App.refresh(); };
  A.rateTxt = (el) => { App.cur().p.r.txt = el.value; };
  A.rateSend = () => {
    const p = App.cur().p, b = S.bookings.find((x) => x.id === p.id);
    b.rated = true; b.rating = p.r.all; b.review = p.r;
    if (!b.petal) { b.petal = true; S.user.petals = Math.min(8, S.user.petals + 1); }
    App.save();
    if (p.r.all <= 2 || p.r.price === 0) App.notify({ role: 'admin', icon: 'alert', tone: 'warn', title: 'تقييم منخفض', text: `${salon(b.s).n} · ${p.r.price === 0 ? 'السعر تغيّر' : 'الزبونة مو راضية'}`, to: 'a.dash' });
    App.replace('c.rate', { id: b.id, justRated: '1' });
  };
  A.claimGift = () => {
    S.user.petals = 0; S.user.wallet += 25000; logW('هدية الوردة الكاملة', 25000); App.save();
    App.toast('انضافت 25,000 لمحفظتچ كهدية', { icon: 'gift', tone: 'ok' }); App.tabTo('c.home');
  };

  SC['c.receipt'] = (p) => {
    const b = S.bookings.find((x) => x.id === p.id);
    if (!b) return { redirect: 'c.bookings' };
    const s = salon(b.s), extra = b.extraReq && b.extraReq.status === 'yes' ? b.extraReq.p : 0;
    const allergyLine = b.items.some((i) => svc(i.svc).allergy) ? `<div class="kv m"><span>المادة المستخدمة</span><span class="num">صبغة 7.3 · دفعة B-204</span></div>` : '';
    return {
      title: 'الفاتورة', sub: s.n, 
      body: `<div class="sec" style="margin-top:0"><div class="ticket" style="justify-items:stretch;text-align:start">
        <div class="row"><span class="brand">${rose()}صالوناتي</span><span class="m num">#${b.id}</span></div>
        <div class="kv"><span>${s.n}</span><span class="m">${dateLong(b.at)} · ${hm(b.at)}</span></div>
        <div class="divider"></div>
        ${b.items.map((it) => `<div class="kv"><span>${svc(it.svc).n}${it.len ? ' · ' + lenName(it.len) : ''}</span><b class="num">${money(App.price(s.id, it.svc, it.len).p)}</b></div>`).join('')}
        ${extra ? `<div class="kv"><span>${esc(b.extraReq.n)} (بموافقتچ)</span><b class="num">${money(extra)}</b></div>` : ''}
        ${allergyLine}
        <div class="kv tot"><span>المجموع</span><b class="num">${money(b.total + extra)} د.ع</b></div>
        <div class="kv"><span>عربون مدفوع</span><b class="num">− ${money(b.dep)}</b></div>
        <div class="kv"><span>دفعتي بالصالون</span><b class="num">${money(b.total + extra - b.dep)}</b></div>
        <div class="rq">${qrSvg(hash(b.id + 'r'))}</div>
        <span class="m" style="text-align:center">${b.petal ? 'انضافت بتلة لوردتچ' : ''}</span></div></div>
        <div class="sec"><div class="btnrow"><button type="button" class="btn plain" data-a="rebook" data-id="${b.id}">${ic('refresh')}احجزي نفسه</button><button type="button" class="btn plain" data-go="c.help" data-b="${b.id}">${ic('flag')}عندچ مشكلة؟</button></div></div>`
    };
  };
})();
