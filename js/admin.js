/* Admin role: daily summary, content review, salon verification, notification campaigns, disputes, complaints, fraud, ads and commission.
   Action names start with a_ so they never collide with the client or salon roles. */
(function () {
  'use strict';
  const A = App.ACT;
  const now = () => App.now();
  const st = () => App.cur().st || (App.cur().st = {});
  const H = 3600e3, D = 864e5;

  // Admin-side records that the seed does not carry are created on first use and then persist with the demo state.
  function ensure() {
    const a = S.admin;
    if (!a.camps) a.camps = [];
    if (!a.ads) {
      a.ads = [
        { id: 'ad1', kind: 'صالون مميز', s: 1, area: 'المنصور', price: '75,000 د.ع أسبوعياً', status: 'pending', t: Date.now() - 3 * H },
        { id: 'ad2', kind: 'بانر المنطقة', s: 2, area: 'الحارثية', price: '120,000 د.ع أسبوعياً', status: 'pending', t: Date.now() - 6 * H },
        { id: 'ad3', kind: 'إطلاق منتج', brand: 'زيت أرغان (موزع معتمد)', area: 'بغداد', price: '400,000 د.ع للحملة', status: 'pending', t: Date.now() - D }
      ];
    }
    if (!a.cx) {
      a.cx = [
        { id: 'k1', cust: 'دعاء', s: 6, issue: 'price', text: 'السعر بالصالون طلع أعلى من التطبيق بـ 5,000', t: Date.now() - 5 * H, status: 'open' },
        { id: 'k2', cust: 'رنا', s: 3, issue: 'harm', text: 'احمرار وحرقة بعد الشمع، وصورت الجلد', t: Date.now() - 2 * H, status: 'open' },
        { id: 'k3', cust: 'آيات', s: 1, issue: 'late', text: 'انتظرت 40 دقيقة رغم إنه عندي حجز', t: Date.now() - 2 * D, status: 'closed' }
      ];
    }
    if (!a.comm) a.comm = {};
    return a;
  }
  const save = () => { App.save(); };
  const sName = (id) => (salon(id) || { n: '—' }).n;
  const issueOf = (id) => ISSUES.find((i) => i.id === id) || { n: 'شكوى', icon: 'flag' };
  // Client complaints (S.complaints) and seeded ones from other customers, shown together.
  const complaints = () => S.complaints.map((c) => Object.assign({ cust: S.user.name, status: 'open', t: now(), mine: true }, c)).concat(ensure().cx);
  const cxFind = (id) => S.complaints.find((c) => c.id === id) || ensure().cx.find((c) => c.id === id);
  const CX = { open: ['مفتوحة', 'warn', 'clock'], contacted: ['تواصلنا', 'pri', 'phone'], closed: ['مغلقة', 'ok', 'check'] };

  function consentOf(p) {
    if (p.consent === 'asked') {
      const c = S.consents.find((x) => x.post === p.id);
      if (c && c.on === true) return 'yes';
      if (c && c.on === false) return 'refused';
    }
    return p.consent;
  }
  const CONSENT = { none: ['ما تظهر زبونة', 'ok', 'check'], yes: ['الزبونة وافقت', 'ok', 'check'], asked: ['بانتظار موافقتها', 'warn', 'clock'], refused: ['الزبونة رفضت', 'err', 'close'] };

  function pendingItems() {
    const a = ensure();
    const posts = S.posts.filter((p) => p.status === 'pending').length;
    const verifs = a.verifs.filter((v) => !v.approved && v.step !== 'rejected').length;
    const disp = a.disputes.filter((d) => d.status === 'open').length;
    const cx = complaints().filter((c) => c.status !== 'closed').length;
    const fraud = a.fraud.filter((f) => f.status === 'open').length;
    const ads = a.ads.filter((x) => x.status === 'pending').length;
    return [
      ['a.review', 'منشورات بالمراجعة', 'clipboard', 'gold', posts],
      ['a.salons', 'طلبات توثيق', 'shield', 'teal', verifs],
      ['a.disputes', 'نزاعات عربون', 'wallet', 'plum', disp],
      ['a.complaints', 'شكاوى مفتوحة', 'flag', 'err', cx],
      ['a.fraud', 'إحالات مشبوهة', 'alert', 'amber', fraud],
      ['a.ads', 'إعلانات تنتظر', 'megaphone', 'sky', ads]
    ];
  }

  /* ---------- a.dash ---------- */
  const AREA_B = { mansour: 46, karrada: 28, zayouna: 22, yarmouk: 14, harthiya: 12, adhamiya: 7 };
  App.SCREENS['a.dash'] = () => {
    const a = ensure();
    const todayN = S.bookings.filter((b) => dayDiff(b.at) === 0).length + 120;
    const verified = SALONS.length + a.verifs.filter((v) => v.approved).length;
    const openCx = complaints().filter((c) => c.status !== 'closed').length;
    const items = pendingItems().filter((x) => x[4] > 0);
    const byArea = Object.assign({}, AREA_B);
    S.bookings.filter((b) => b.mine && dayDiff(b.at) >= 0).forEach((b) => { const ar = salon(b.s).area; byArea[ar] = (byArea[ar] || 0) + 1; });
    const max = Math.max.apply(null, Object.values(byArea));
    const un = App.unread('admin');
    return {
      title: 'لوحة الإدارة', sub: dateLong(now()), nav: 'a.dash',
      actions: `<button type="button" class="ibtn" data-a="a_notifs" aria-label="إشعارات الإدارة">${ic('bell')}${un ? `<i class="dot num">${un}</i>` : ''}</button>`,
      body: `<div class="sec"><div class="sx-kpi">
          <div>${icb('cal', 'rose', 'sm')}<b>${todayN}</b>حجز اليوم</div>
          <div>${icb('qr', 'teal', 'sm')}<b>91%</b>مؤكد QR</div>
          <div class="${openCx ? 'bad' : ''}">${icb('flag', 'err', 'sm')}<b>${openCx}</b>شكاوى</div>
          <div>${icb('shield', 'ok', 'sm')}<b>${verified}</b>موثّق</div>
        </div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('clock')} ينتظر قرارچ</h2><span class="m">${items.reduce((s, x) => s + x[4], 0)}</span></div>
          ${items.length ? `<div class="list">${items.map((x) => `<button type="button" class="li" data-go="${x[0]}">${icb(x[2], x[3], 'sm')}<span class="tx"><b>${x[1]}</b></span><span class="pill pri num">${x[4]}</span>${ic('chev-l')}</button>`).join('')}</div>`
            : emptyState({ icon: 'check-c', tone: 'ok', title: 'ماكو شي ينتظر', text: 'كل الطلبات انحسمت' })}</div>
        ${a.expiring.length ? `<div class="sec"><div class="card gold"><div class="row start">${icb('doc', 'gold')}<span class="tx"><b>${a.expiring.length} إجازة تنتهي قريباً</b><span class="m">${a.expiring.map((x) => `${sName(x.s)} · ${x.what} بعد ${x.days} يوم`).join('، ')}</span></span></div><button type="button" class="btn sm gold" data-go="a.salons">${ic('shield')} راجعي</button></div></div>` : ''}
        <div class="sec"><div class="sec-h"><h2>${ic('map')} الحجوزات حسب المنطقة</h2><span class="m">هذا الأسبوع</span></div>
          <div class="card">${Object.keys(byArea).sort((x, y) => byArea[y] - byArea[x]).map((k) => `<div class="ax-bar"><span>${(AREAS.find((r) => r.id === k) || { n: k }).n}</span><span class="sx-track"><i style="width:${byArea[k] / max * 100}%"></i></span><b class="num">${byArea[k]}</b></div>`).join('')}</div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('trend')} نسبة عدم الحضور</h2><span class="m">آخر 5 أسابيع</span></div>
          <div class="card"><div class="ax-weeks">${[12, 9.5, 7, 5.2, 4.1].map((v, i) => `<div><i style="height:${v / 12 * 100}%" class="${i === 4 ? 'now' : ''}"></i><span class="num">${v}%</span></div>`).join('')}</div>
          <span class="m">نزلت من 12% إلى 4.1% بعد العربون والتذكير وقفل الإلغاء قبل ساعة. الأرقام توضيحية.</span></div></div>`
    };
  };
  A.a_notifs = () => {
    const list = S.notifications.filter((n) => n.role === 'admin');
    list.forEach((n) => { S.read[n.id] = true; });
    save();
    App.refresh();
    App.sheet(`<div class="sheet-h"><h2>إشعارات الإدارة</h2><button type="button" class="ibtn" data-a="close" aria-label="إغلاق">${ic('close')}</button></div>
      ${list.length ? `<div class="list">${list.map((n) => `<button type="button" class="notif" data-a="a_notifGo" data-id="${n.id}">${icb(n.icon || 'bell', n.tone || 'rose')}<span class="tx"><b>${n.title}</b><span>${n.text || ''}</span><span class="m">${ago(n.t)}</span></span></button>`).join('')}</div>`
        : emptyState({ icon: 'bell', tone: 'muted', title: 'ماكو إشعارات' })}`, { label: 'إشعارات الإدارة' });
  };
  A.a_notifGo = (el, d) => { const n = S.notifications.find((x) => x.id === d.id); App.closeSheet(true); if (n && n.to) App.go(n.to, n.p || {}); };

  /* ---------- a.review / a.post ---------- */
  function postRow(p) {
    const c = CONSENT[consentOf(p)] || CONSENT.none;
    const stt = p.status === 'approved' ? pill('انقبل', 'ok', 'check') : p.status === 'rejected' ? pill('انرفض', 'err', 'close') : pill('ينتظر', 'warn', 'clock');
    return `<button type="button" class="li" data-go="a.post" data-id="${p.id}">${img(p.v, 'ax-thumb', '')}
      <span class="tx"><b>${sName(p.s)}</b><span class="m clip">${esc(p.cap)}</span><span class="sx-pills">${stt}${pill(c[0], c[1], c[2])}${p.auto && p.auto.medical ? pill('كلمات طبية', 'err', 'alert') : ''}</span><span class="m">${ago(p.sent || now())}</span></span>${ic('chev-l')}</button>`;
  }
  App.SCREENS['a.review'] = (p, e) => {
    e.st = e.st || { tab: 'pending' };
    const pend = S.posts.filter((x) => x.status === 'pending').sort((a, b) => (a.sent || 0) - (b.sent || 0));
    const done = S.posts.filter((x) => x.status !== 'pending').sort((a, b) => (b.decided || 0) - (a.decided || 0));
    const list = e.st.tab === 'pending' ? pend : done;
    return {
      title: 'مراجعة المحتوى', sub: 'ما ينشر شي قبل القبول · الهدف نرد بنفس اليوم', nav: 'a.review',
      body: `<div class="sec"><div class="seg"><button type="button" data-a="a_rtab" data-k="pending" aria-pressed="${e.st.tab === 'pending'}">ينتظر (${pend.length})</button><button type="button" data-a="a_rtab" data-k="done" aria-pressed="${e.st.tab === 'done'}">انحسم (${done.length})</button></div>
          ${list.length ? `<div class="list">${list.map(postRow).join('')}</div>` : emptyState({ icon: 'check-c', tone: 'ok', title: e.st.tab === 'pending' ? 'الطابور فارغ' : 'ماكو قرارات بعد', text: 'المنشورات الجديدة من الصالونات توصل هنا' })}</div>`
    };
  };
  A.a_rtab = (el, d) => { st().tab = d.k; App.refresh(); };

  App.SCREENS['a.post'] = (p) => {
    const x = S.posts.find((q) => q.id === p.id);
    if (!x) return { title: 'المنشور', body: emptyState({ icon: 'clipboard', tone: 'muted', title: 'ما لقينا المنشور', action: '<button type="button" class="btn" data-a="back">رجوع</button>' }) };
    const s = salon(x.s), cs = consentOf(x), c = CONSENT[cs] || CONSENT.none, auto = x.auto || {};
    const checks = [
      [`موافقة الزبونة${x.cust ? ' · ' + esc(x.cust) : ''}`, c[0], c[1]],
      ['زيارة مؤكدة بـQR', x.cust ? 'نعم' : 'ما مطلوبة', 'ok'],
      ['الجودة والتكرار', auto.quality === false ? 'ضعيفة' : 'سليمة', auto.quality === false ? 'err' : 'ok'],
      ['ألفاظ بالنص', auto.words === false ? 'فيها كلمات مخالفة' : 'سليم', auto.words === false ? 'err' : 'ok'],
      ['ادعاء طبي أو حقن', auto.medical ? 'فيه كلمات طبية' : 'لا يوجد', auto.medical ? 'err' : 'ok']
    ];
    const block = cs === 'asked' ? 'بانتظار موافقة الزبونة من هاتفها. ما نقبل قبل موافقتها.'
      : cs === 'refused' ? 'الزبونة رفضت. لازم ينرفض أو ينشال وجهها.'
        : auto.medical ? 'إعلان طبي بحساب صالون. هذا ممنوع، فيترفض.' : '';
    const decided = x.status !== 'pending';
    return {
      title: 'مراجعة منشور', sub: `${s.n} · ${ago(x.sent || now())}`, 
      body: `<div class="sec"><div class="ax-media">${img(x.v, '', x.cap)}<span class="frame-gold"></span><span class="wm">${rose()}صالوناتي · ${s.n} · موثّق</span><span class="ax-play">${ic('play')}</span></div>
          <div class="card"><b>${esc(x.cap)}</b><span class="m">${svc(x.svc).n} · ${iqd(App.price(x.s, x.svc, 'm').p)}</span></div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('clipboard')} الفحص</h2></div>
          <div class="card ax-checks">${checks.map((k) => `<div class="kv"><span>${k[0]}</span>${pill(k[1], k[2], k[2] === 'ok' ? 'check' : k[2] === 'warn' ? 'clock' : 'alert')}</div>`).join('')}</div>
          ${block && !decided ? `<div class="rule err">${ic('alert')}<span>${block}</span></div>` : ''}
          ${decided ? `<div class="rule ${x.status === 'approved' ? 'ok' : 'err'}">${ic(x.status === 'approved' ? 'check-c' : 'close')}<span>${x.status === 'approved' ? 'انقبل وانضاف الإطار، وصار بالمعرض والريلز.' : 'انرفض: ' + esc(x.reason || '')}</span></div>` : ''}
          <p class="tip">${ic('lock')}<span>القبول يضيف الإطار من السيرفر وينشر نسخة خفيفة. الأصل يبقى خاص، والصالون ما يقدر يغير الإطار.</span></p></div>`,
      bar: decided
        ? `<button type="button" class="btn plain block" data-a="a_undo" data-id="${x.id}">${ic('refresh')} رجعيه للمراجعة</button>`
        : `<div class="btnrow sx-fill"><button type="button" class="btn danger" data-a="a_reject" data-id="${x.id}">${ic('close')} رفض مع سبب</button><button type="button" class="btn ok" data-a="a_approve" data-id="${x.id}" ${block ? 'disabled' : ''}>${ic('check')} قبول ونشر</button></div>`
    };
  };
  A.a_approve = (el, d) => {
    const x = S.posts.find((q) => q.id === d.id);
    x.consent = consentOf(x);
    x.status = 'approved';
    x.decided = now();
    App.notify({ role: 'salon', icon: 'check-c', tone: 'ok', title: 'انقبل منشورچ', text: x.cap, to: 's.posts' });
    save();
    App.toast('انقبل وانضاف للمعرض والريلز', { icon: 'check-c', tone: 'ok' });
    App.back();
  };
  const REASONS = [['إعلان طبي بحساب صالون', 'alert'], ['بدون موافقة الزبونة', 'camera'], ['جودة ضعيفة', 'image'], ['نص مخالف', 'chat']];
  A.a_reject = (el, d) => {
    App.sheet(`<div class="sheet-h"><h2>سبب الرفض</h2><button type="button" class="ibtn" data-a="close" aria-label="إغلاق">${ic('close')}</button></div>
      <p class="m sx-p">السبب يوصل لصاحبة الصالون حتى تعدل وترسل من جديد</p>
      <div class="list">${REASONS.map((r, i) => `<button type="button" class="li" data-a="a_rejectGo" data-id="${d.id}" data-i="${i}">${icb(r[1], 'err', 'sm')}<span class="tx"><b>${r[0]}</b></span>${ic('chev-l')}</button>`).join('')}</div>`, { label: 'سبب الرفض' });
  };
  A.a_rejectGo = (el, d) => {
    const x = S.posts.find((q) => q.id === d.id), r = REASONS[+d.i][0];
    x.status = 'rejected';
    x.reason = r;
    x.decided = now();
    App.notify({ role: 'salon', icon: 'alert', tone: 'err', title: 'انرفض منشورچ', text: `${x.cap} · السبب: ${r}`, to: 's.posts' });
    save();
    App.closeSheet(true);
    App.toast('انرفض ووصل السبب للصالون', { icon: 'close' });
    App.back();
  };
  A.a_undo = (el, d) => { const x = S.posts.find((q) => q.id === d.id); x.status = 'pending'; x.reason = null; x.decided = null; save(); App.refresh(); };

  /* ---------- a.salons / a.verify ---------- */
  const VSTEP = { docs: ['ناقص مستندات', 'warn', 'doc'], visit: ['زيارة مطلوبة', 'pri', 'users'], done: ['موثّق', 'ok', 'shield'], rejected: ['مرفوض', 'err', 'close'] };
  App.SCREENS['a.salons'] = () => {
    const a = ensure();
    const req = a.verifs.filter((v) => !v.approved);
    const ok = a.verifs.filter((v) => v.approved);
    return {
      title: 'التوثيق والصالونات', sub: 'ما نعرض مكان بدون فحص', nav: 'a.salons', 
      body: `<div class="sec"><div class="sec-h"><h2>${ic('clipboard')} طلبات التوثيق</h2><span class="m">${req.length}</span></div>
          ${req.length ? `<div class="list">${req.map((v) => { const t = VSTEP[v.step] || VSTEP.docs; return `<button type="button" class="li" data-go="a.verify" data-id="${v.id}">${icb('shield', 'teal', 'sm')}<span class="tx"><b>${esc(v.n)}</b><span class="m">${v.area} · وصل ${ago(v.sent)}</span>${pill(t[0], t[1], t[2])}</span>${ic('chev-l')}</button>`; }).join('')}</div>`
            : emptyState({ icon: 'shield', tone: 'ok', title: 'ماكو طلبات جديدة' })}</div>
        ${a.expiring.length ? `<div class="sec"><div class="sec-h"><h2>${ic('doc')} إجازات تنتهي</h2></div><div class="list">${a.expiring.map((x, i) => `<div class="li">${icb('clock', 'warn', 'sm')}<span class="tx"><b>${sName(x.s)}</b><span class="m">${x.what} بعد ${x.days} يوم · الخدمات المرتبطة تختفي عند الانتهاء</span></span><button type="button" class="btn xs soft" data-a="a_remind" data-i="${i}">ذكّري</button></div>`).join('')}</div></div>` : ''}
        <div class="sec"><div class="sec-h"><h2>${ic('check-c')} صالونات موثّقة</h2><span class="m">${SALONS.length + ok.length}</span></div>
          <div class="list">${ok.map((v) => `<div class="li">${icb('shield', 'ok', 'sm')}<span class="tx"><b>${esc(v.n)}</b><span class="m">${v.area} · انوثق هسة</span></span>${verified()}</div>`).join('')}
          ${SALONS.map((s) => `<div class="li">${img(s.cover, 'ax-thumb sq', s.n)}<span class="tx"><b>${s.n}</b><span class="m">${(AREAS.find((r) => r.id === s.area) || {}).n} · آخر فحص ${s.chk}</span><span class="sx-pills">${rating(s.r, s.rev)}${s.home ? pill('صالون بيتي', 'muted', 'home') : ''}</span></span>${verified()}</div>`).join('')}</div></div>`
    };
  };
  A.a_remind = (el, d) => {
    const x = ensure().expiring[+d.i];
    if (+x.s === +S.salon.id) App.notify({ role: 'salon', icon: 'doc', tone: 'gold', title: 'إجازتچ قربت تنتهي', text: `${x.what} تنتهي بعد ${x.days} يوم. جدديها حتى ما تختفي الخدمات`, to: 's.verify' });
    App.toast(`انرسل تذكير لـ ${sName(x.s)}`, { icon: 'bell', tone: 'ok' });
  };

  const DOCS = [['license', 'إجازة ممارسة المهنة', 'doc'], ['id', 'هوية صاحبة الصالون', 'user'], ['photos', 'صور المكان', 'camera'], ['health', 'شهادة صحية للكادر', 'shield']];
  App.SCREENS['a.verify'] = (p) => {
    const v = ensure().verifs.find((x) => x.id === p.id);
    if (!v) return { title: 'طلب توثيق', body: emptyState({ icon: 'shield', tone: 'muted', title: 'ما لقينا الطلب' }) };
    const all = DOCS.every((k) => v.docs[k[0]]);
    const t = VSTEP[v.approved ? 'done' : v.step] || VSTEP.docs;
    const visits = ['باجر 10:00 ص', 'بعد باجر 12:00 م', 'الخميس 11:00 ص'];
    return {
      title: esc(v.n), sub: `${v.area} · طلب توثيق`, 
      body: `<div class="sec"><div class="card"><div class="row start">${icb('shield', 'teal', 'lg')}<span class="tx"><b>${esc(v.n)}</b><span class="m">وصل الطلب ${ago(v.sent)}</span></span>${pill(t[0], t[1], t[2])}</div></div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('doc')} المستندات</h2><span class="m">${DOCS.filter((k) => v.docs[k[0]]).length} من ${DOCS.length}</span></div>
          <div class="list">${DOCS.map((k) => `<div class="li">${icb(k[2], v.docs[k[0]] ? 'ok' : 'muted', 'sm')}<span class="tx"><b>${k[1]}</b><span class="m">${v.docs[k[0]] ? 'مستلمة ومراجعة' : 'ناقصة'}</span></span>${sw(v.docs[k[0]], 'a_doc', k[1], `data-id="${v.id}" data-k="${k[0]}"`)}</div>`).join('')}</div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('users')} زيارة فريقنا</h2></div>
          <div class="sx-chips">${visits.map((x) => `<button type="button" class="chip" data-a="a_visit" data-id="${v.id}" data-v="${x}" aria-pressed="${v.visit === x}">${x}</button>`).join('')}</div>
          <p class="tip">${ic('info')}<span>الزيارة تتحقق من المكان والنظافة وإنه للنساء فقط. شارة "للنساء فقط" ما تنعطى إلا بعدها.</span></p>
          ${!all ? `<div class="rule">${ic('doc')}<span>ما نقدر نوثق قبل ما تكمل المستندات.</span></div>` : !v.visit ? `<div class="rule">${ic('cal')}<span>حددي موعد الزيارة أول.</span></div>` : ''}
          ${v.approved ? `<div class="rule ok">${ic('check-c')}<span>انوثق. الختم ظاهر على صفحته وبالبحث، والتجديد بعد سنة.</span></div>` : ''}</div>`,
      bar: v.approved || v.step === 'rejected' ? `<button type="button" class="btn plain block" data-a="back">${ic('arrow-r')} رجوع</button>`
        : `<div class="btnrow sx-fill"><button type="button" class="btn danger" data-a="a_vNo" data-id="${v.id}">${ic('close')} رفض</button><button type="button" class="btn ok" data-a="a_vOk" data-id="${v.id}" ${all && v.visit ? '' : 'disabled'}>${ic('shield')} وثّقيه</button></div>`
    };
  };
  const vFind = (id) => ensure().verifs.find((x) => x.id === id);
  A.a_doc = (el, d) => { const v = vFind(d.id); v.docs[d.k] = !v.docs[d.k]; v.step = DOCS.every((k) => v.docs[k[0]]) ? 'visit' : 'docs'; save(); App.refresh(); };
  A.a_visit = (el, d) => { const v = vFind(d.id); v.visit = d.v; save(); App.refresh(); };
  A.a_vOk = (el, d) => { const v = vFind(d.id); v.approved = true; v.step = 'done'; save(); App.toast(`${v.n} صار موثّق`, { icon: 'shield', tone: 'ok' }); App.refresh(); };
  A.a_vNo = (el, d) => {
    const v = vFind(d.id);
    App.confirmBox({ icon: 'close', tone: 'err', danger: true, title: `ترفضين ${v.n}؟`, text: 'يوصلهم السبب، ويقدرون يقدمون من جديد بعد ما يكملون.', ok: 'إي، ارفضي',
      onOk: () => { v.step = 'rejected'; save(); App.refresh(); } });
  };

  /* ---------- a.campaigns / a.newcamp ---------- */
  const PAST = [
    { n: 'عرض صبغة الجذور بـ 35,000 قربچ', who: 'لمسات ليان', aud: 2140, open: 18, book: 2.1, when: 'الخميس الماضي' },
    { n: 'مانيكير ومساج يدين بـ 15,000', who: 'دار نور', aud: 3380, open: 22, book: 3.4, when: 'قبل أسبوعين' },
    { n: 'تجهيزات العيد: احجزي مبكر', who: 'كل الصالونات', aud: 9120, open: 26, book: 4.8, when: 'قبل شهر' }
  ];
  function campCard(c) {
    return `<div class="card"><div class="row start">${icb('megaphone', 'gold', 'sm')}<span class="tx"><b>${esc(c.n)}</b><span class="m">${esc(c.who)} · ${c.when} · ${money(c.aud)} زبونة</span></span></div>
      ${c.open == null ? `<div class="rule info">${ic('clock')}<span>${c.sched ? 'مجدولة ' + c.sched : 'انرسلت هسة، النتائج تظهر بعد ساعة'}</span></div>`
        : `<div class="ax-rates"><div><span class="m">فتحن</span><b class="num">${c.open}%</b><span class="sx-track"><i style="width:${c.open * 3}%"></i></span></div><div><span class="m">حجزن</span><b class="num">${c.book}%</b><span class="sx-track ok"><i style="width:${c.book * 12}%"></i></span></div></div>`}</div>`;
  }
  App.SCREENS['a.campaigns'] = () => {
    const a = ensure();
    return {
      title: 'حملات الإشعارات', sub: 'حد أقصى إشعارين تسويقيين بالأسبوع', nav: 'a.campaigns', 
      body: `<div class="sec"><button type="button" class="btn block lg" data-go="a.newcamp">${ic('plus')} حملة جديدة</button></div>
        ${a.camps.length ? `<div class="sec"><div class="sec-h"><h2>${ic('clock')} حملاتچ الجديدة</h2></div>${a.camps.slice().reverse().map(campCard).join('')}</div>` : ''}
        <div class="sec"><div class="sec-h"><h2>${ic('chart')} حملات سابقة</h2><span class="m">أرقام توضيحية</span></div>${PAST.map(campCard).join('')}</div>`
    };
  };

  const INTS = ['صبغة', 'أظافر', 'تسريحات', 'بشرة', 'عرائس', 'مكياج'];
  const BUD = ['حتى 25,000', 'حتى 50,000', 'أي ميزانية'];
  const TIMES = ['هسة', 'الخميس 5:00 م', 'الجمعة 11:00 ص'];
  const POP = { mansour: 3200, karrada: 2900, zayouna: 2400, yarmouk: 2100, harthiya: 1800, adhamiya: 1500 };
  function estimate(c) {
    const n = INTS.filter((k) => c.ints[k]).length;
    const raw = Math.round((POP[c.area] || 1500) * (0.2 + 0.14 * n) * [0.55, 0.8, 1][c.bud] / 10) * 10;
    const capped = Math.round(raw * 0.12 / 10) * 10;
    return { raw, capped, send: raw - capped };
  }
  App.SCREENS['a.newcamp'] = (p, e) => {
    e.st = e.st || { ints: { 'صبغة': true }, area: 'mansour', bud: 1, msg: 'عرض صبغة الجذور بـ 35,000 قربچ', time: 0, done: false };
    const c = e.st, est = estimate(c);
    const late = new Date(now()).getHours() >= 22;
    if (c.done) {
      return {
        title: TIMES[c.time] === 'هسة' ? 'انرسلت الحملة' : 'انجدولت الحملة', 
        body: `<div class="done-hero"><div class="bigcheck">${ic('check')}</div><h1>${TIMES[c.time] === 'هسة' ? 'انرسلت الحملة' : 'انجدولت الحملة'}</h1><p class="m">لـ ${money(est.send)} زبونة · ${TIMES[c.time]}</p></div>
          <div class="sec"><div class="rule info">${ic('lock')}<span>نص الإشعار بدون تفاصيل خاصة لأنه قد يظهر على شاشة القفل.</span></div></div>`,
        bar: `<button type="button" class="btn block" data-a="tab" data-to="a.campaigns">${ic('megaphone')} كل الحملات</button>`
      };
    }
    return {
      title: 'حملة جديدة', sub: 'جمهور محدد بموافقته', 
      body: `<div class="sec"><div class="sec-h"><h2>${ic('heart')} الاهتمام</h2></div>
          <div class="sx-chips">${INTS.map((k) => `<button type="button" class="chip" data-a="a_ncInt" data-k="${k}" aria-pressed="${!!c.ints[k]}">${k}</button>`).join('')}</div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('pin')} المنطقة</h2></div>
          <div class="sx-chips">${Object.keys(POP).map((k) => `<button type="button" class="chip" data-a="a_ncArea" data-k="${k}" aria-pressed="${c.area === k}">${(AREAS.find((r) => r.id === k) || {}).n}</button>`).join('')}</div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('wallet')} الميزانية</h2></div>
          <div class="seg">${BUD.map((k, i) => `<button type="button" data-a="a_ncBud" data-i="${i}" aria-pressed="${c.bud === i}">${k}</button>`).join('')}</div></div>
        <div class="sec"><div class="card gold"><div class="row start">${icb('users', 'gold')}<span class="tx"><b class="num">${money(est.send)} زبونة</b><span class="m">وافقن على العروض، ومستثنى ${money(est.capped)} وصلهن إشعاران هذا الأسبوع</span></span></div></div></div>
        <div class="sec"><div class="field"><label for="axMsg">${ic('edit')} نص الإشعار</label><textarea id="axMsg" class="inp" maxlength="80" data-in="a_ncMsg">${esc(c.msg)}</textarea><span class="m num" id="axLen">${c.msg.length} / 80</span></div>
          <div class="ax-lock"><span class="m">هيچ يظهر على شاشة القفل</span><div class="banner ax-static">${icb('megaphone', 'gold')}<span class="tx"><b>صالوناتي · عرض لچ</b><span id="axPrev">${esc(c.msg)}</span></span></div></div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('clock')} الوقت</h2></div>
          <div class="sx-chips">${TIMES.map((k, i) => `<button type="button" class="chip" data-a="a_ncTime" data-i="${i}" aria-pressed="${c.time === i}">${k}</button>`).join('')}</div>
          ${late && c.time === 0 ? `<div class="rule err">${ic('moon')}<span>بعد 10 المسا ما نرسل تسويق. اختاري وقت ثاني.</span></div>` : ''}
          <p class="tip">${ic('info')}<span>حد أقصى إشعارين تسويقيين بالأسبوع، وكل زبونة تقدر توقف أي نوع من حسابها.</span></p></div>`,
      bar: `<div class="tx"><span class="m">${TIMES[c.time]}</span><b class="num">${money(est.send)} زبونة</b></div><button type="button" class="btn gold" data-a="a_ncSend" ${(late && c.time === 0) || !c.msg.trim() || !INTS.some((k) => c.ints[k]) ? 'disabled' : ''}>${ic('megaphone')} ${c.time === 0 ? 'ارسلي' : 'جدولي'}</button>`
    };
  };
  A.a_ncInt = (el, d) => { const c = st(); c.ints[d.k] = !c.ints[d.k]; App.refresh(); };
  A.a_ncArea = (el, d) => { st().area = d.k; App.refresh(); };
  A.a_ncBud = (el, d) => { st().bud = +d.i; App.refresh(); };
  A.a_ncTime = (el, d) => { st().time = +d.i; App.refresh(); };
  A.a_ncMsg = (el) => {
    const c = st();
    c.msg = el.value;
    const pv = $('#axPrev'), ln = $('#axLen'), btn = $('[data-a="a_ncSend"]');
    if (pv) pv.textContent = c.msg;
    if (ln) ln.textContent = `${c.msg.length} / 80`;
    if (btn) btn.disabled = !c.msg.trim() || !INTS.some((k) => c.ints[k]);
  };
  A.a_ncSend = () => {
    const c = st(), est = estimate(c), area = (AREAS.find((r) => r.id === c.area) || {}).n;
    const rec = { n: c.msg.trim(), who: `${INTS.filter((k) => c.ints[k]).join('، ')} · ${area}`, aud: est.send, when: 'هسة', open: null, t: now() };
    if (c.time !== 0) rec.sched = TIMES[c.time];
    ensure().camps.push(rec);
    if (c.time === 0 && S.user.notif && S.user.notif.offers) {
      App.notify({ role: 'client', icon: 'megaphone', tone: 'gold', title: 'عرض لچ', text: c.msg.trim(), to: 'c.home' });
    }
    c.done = true;
    save();
    App.refresh();
  };

  /* ---------- a.more and its tools ---------- */
  const MORE = [
    ['a.disputes', 'نزاعات العربون', 'wallet', 'plum'], ['a.complaints', 'الشكاوى', 'flag', 'err'], ['a.fraud', 'الاحتيال والإحالات', 'alert', 'amber'],
    ['a.ads', 'الإعلانات', 'megaphone', 'sky'], ['a.commission', 'العمولات والباقات', 'percent', 'teal'], ['a.salons', 'التوثيق', 'shield', 'mint']
  ];
  App.SCREENS['a.more'] = () => {
    const counts = { 'a.disputes': ensure().disputes.filter((x) => x.status === 'open').length, 'a.complaints': complaints().filter((c) => c.status !== 'closed').length, 'a.fraud': ensure().fraud.filter((f) => f.status === 'open').length, 'a.ads': ensure().ads.filter((x) => x.status === 'pending').length };
    return {
      title: 'المزيد', sub: 'أدوات الإدارة', nav: 'a.more', 
      body: `<div class="sec"><div class="sx-grid">${MORE.map((m) => `<button type="button" data-go="${m[0]}">${icb(m[2], m[3], 'lg')}<span>${m[1]}</span>${counts[m[0]] ? `<i class="nbadge num">${counts[m[0]]}</i>` : ''}</button>`).join('')}</div></div>
        <div class="sec"><div class="rule info">${ic('lock')}<span>ما نبيع بيانات أي زبونة. الصالون يشوف أرقاماً عامة فقط.</span></div></div>`
    };
  };

  App.SCREENS['a.disputes'] = () => {
    const list = ensure().disputes;
    return {
      title: 'نزاعات العربون', sub: 'الزبونة حضرت والصالون ما مسح الرمز', 
      body: `<div class="sec">${list.length ? list.map((x) => `<div class="card"><div class="row start">${avatar(x.cust, 'plum')}<span class="tx"><b>${esc(x.cust)} ضد ${sName(x.s)}</b><span class="m">${ago(x.t)} · عربون ${money(x.amount)} د.ع</span></span>${x.status === 'open' ? pill('مفتوح', 'warn', 'clock') : pill(x.status === 'refund' ? 'رجع للزبونة' : 'راح للصالون', 'ok', 'check')}</div>
          <p class="ax-quote">${esc(x.text)}</p>
          ${x.status === 'open' ? `<div class="kv"><span>دليل المسح</span><b>ما انمسح الرمز</b></div><div class="kv"><span>موقع الزبونة وقت الموعد</span><b>قرب الصالون</b></div>
            <div class="btnrow"><button type="button" class="btn sm ok" data-a="a_dispute" data-id="${x.id}" data-v="refund">${ic('wallet')} رجعي العربون</button><button type="button" class="btn sm plain" data-a="a_dispute" data-id="${x.id}" data-v="salon">${ic('door')} للصالون</button></div>` : ''}</div>`).join('')
        : emptyState({ icon: 'wallet', tone: 'ok', title: 'ماكو نزاعات' })}
        <p class="tip">${ic('info')}<span>تكرار التقصير من الصالون ينزل ترتيبه ثم يوقف عضويته.</span></p></div>`
    };
  };
  A.a_dispute = (el, d) => {
    const x = ensure().disputes.find((q) => q.id === d.id);
    const refund = d.v === 'refund';
    App.confirmBox({
      icon: refund ? 'wallet' : 'door', tone: refund ? 'ok' : 'plum', title: refund ? 'ترجعين العربون للزبونة؟' : 'تحولين العربون للصالون؟',
      text: refund ? `${money(x.amount)} د.ع يرجع لمحفظة ${x.cust}، ويتسجل تقصير على الصالون.` : 'يوصل القرار للطرفين مع السبب.', ok: 'أكيد',
      onOk: () => {
        x.status = refund ? 'refund' : 'salon';
        x.resolved = now();
        if (x.mine) {
          if (refund) S.user.wallet += x.amount;
          App.notify({ role: 'client', icon: refund ? 'wallet' : 'info', tone: refund ? 'ok' : 'muted', title: refund ? 'رجع عربونچ' : 'انحسم اعتراضچ', text: refund ? `${money(x.amount)} د.ع رجعت لمحفظتچ` : 'راجعنا الأدلة والعربون راح للصالون', to: 'c.me' });
        }
        save(); App.refresh();
      }
    });
  };

  App.SCREENS['a.complaints'] = (p, e) => {
    e.st = e.st || { f: 'open' };
    const all = complaints().sort((a, b) => (b.issue === 'harm') - (a.issue === 'harm') || b.t - a.t);
    const list = e.st.f === 'open' ? all.filter((c) => c.status !== 'closed') : all;
    return {
      title: 'الشكاوى', sub: 'الضرر الصحي أولاً', 
      body: `<div class="sec"><div class="seg"><button type="button" data-a="a_cxf" data-f="open" aria-pressed="${e.st.f === 'open'}">المفتوحة</button><button type="button" data-a="a_cxf" data-f="all" aria-pressed="${e.st.f === 'all'}">الكل</button></div>
        ${list.length ? list.map((c) => {
          const is = issueOf(c.issue), t = CX[c.status] || CX.open, harm = c.issue === 'harm';
          const next = c.status === 'open' ? ['contacted', 'تواصلت وياها'] : c.status === 'contacted' ? ['closed', 'اغلقي الشكوى'] : null;
          return `<div class="card ${harm && c.status !== 'closed' ? 'ax-harm' : ''}"><div class="row start">${icb(is.icon, harm ? 'err' : 'amber', 'sm')}<span class="tx"><b>${is.n} · ${sName(c.s)}</b><span class="m">${esc(c.cust)} · ${ago(c.t)}${c.photos ? ` · ${c.photos} صور` : ''}</span></span>${pill(t[0], t[1], t[2])}</div>
            ${c.text ? `<p class="ax-quote">${esc(c.text)}</p>` : ''}
            ${harm && c.status !== 'closed' ? `<div class="rule err">${ic('alert')}<span>ضرر صحي: نوقف الخدمة المرتبطة فوراً ونوجه الزبونة لجهة طبية.</span></div>` : ''}
            ${c.suspended ? `<div class="rule info">${ic('lock')}<span>الخدمة متوقفة بالصالون لحين المراجعة.</span></div>` : ''}
            <div class="btnrow">${harm && !c.suspended && c.status !== 'closed' ? `<button type="button" class="btn sm danger" data-a="a_cxStop" data-id="${c.id}">${ic('lock')} إيقاف الخدمة</button>` : ''}${next ? `<button type="button" class="btn sm ${next[0] === 'closed' ? 'ok' : 'soft'}" data-a="a_cxStep" data-id="${c.id}" data-v="${next[0]}">${ic(next[0] === 'closed' ? 'check' : 'phone')} ${next[1]}</button>` : ''}</div></div>`;
        }).join('') : emptyState({ icon: 'flag', tone: 'ok', title: 'ماكو شكاوى مفتوحة', text: 'الشكاوى من الزبونات توصل هنا مع الوقت والصور' })}</div>`
    };
  };
  A.a_cxf = (el, d) => { st().f = d.f; App.refresh(); };
  A.a_cxStep = (el, d) => {
    const c = cxFind(d.id);
    c.status = d.v;
    if (S.complaints.includes(c)) App.notify({ role: 'client', icon: d.v === 'closed' ? 'check-c' : 'phone', tone: 'ok', title: d.v === 'closed' ? 'انغلقت شكوتچ' : 'استلمنا شكوتچ', text: d.v === 'closed' ? 'شكراً لچ. إذا تحتاجين شي ثاني احنا موجودين' : 'فريقنا راح يتواصل وياچ اليوم', to: 'c.help' });
    save(); App.refresh();
  };
  A.a_cxStop = (el, d) => { const c = cxFind(d.id); c.suspended = true; save(); App.toast('انوقفت الخدمة المرتبطة مؤقتاً', { icon: 'lock', tone: 'ok' }); App.refresh(); };

  App.SCREENS['a.fraud'] = () => {
    const list = ensure().fraud;
    return {
      title: 'الاحتيال والإحالات', sub: 'رقم موثق وجهاز واحد لكل حساب', 
      body: `<div class="sec">${list.length ? list.map((f) => `<div class="card"><div class="row start">${icb('alert', 'amber', 'sm')}<span class="tx"><b>${esc(f.text)}</b><span class="m">${ago(f.t)}</span></span>${f.status === 'open' ? pill('يحتاج قرار', 'warn', 'clock') : pill(f.status === 'frozen' ? 'انجمد الرصيد' : 'مو احتيال', f.status === 'frozen' ? 'err' : 'ok')}</div>
          ${f.status === 'open' ? `<div class="btnrow"><button type="button" class="btn sm danger" data-a="a_fraud" data-id="${f.id}" data-v="frozen">${ic('lock')} جمّدي الرصيد</button><button type="button" class="btn sm plain" data-a="a_fraud" data-id="${f.id}" data-v="clear">${ic('check')} مو احتيال</button></div>` : ''}</div>`).join('')
        : emptyState({ icon: 'shield', tone: 'ok', title: 'ماكو شي مشبوه' })}
        <div class="card"><b>قواعد الحماية</b><div class="sx-feats"><span>${ic('check')}لا إحالة لنفس الرقم أو الجهاز</span><span>${ic('check')}مستوى واحد بس، بدون أرباح من صديقات الصديقات</span><span>${ic('check')}حد شهري للرصيد وينتهي بعد 60 يوم</span><span>${ic('check')}الربح بعد مسح QR الصديقة</span></div></div></div>`
    };
  };
  A.a_fraud = (el, d) => { const f = ensure().fraud.find((x) => x.id === d.id); f.status = d.v; save(); App.toast(d.v === 'frozen' ? 'انجمد رصيد الحسابات المشبوهة' : 'انغلقت الحالة', { icon: 'shield' }); App.refresh(); };

  App.SCREENS['a.ads'] = () => {
    const list = ensure().ads;
    return {
      title: 'الإعلانات', sub: 'كل إعلان مكتوب عليه "إعلان"', 
      body: `<div class="sec"><div class="rule info">${ic('info')}<span>نقبل إعلانات الصالونات الموثّقة فقط. لا عروض تخفيض على الإجراءات الطبية، والتقييمات ما تنشترى.</span></div>
        ${list.map((x) => `<div class="card"><div class="row start">${icb(x.kind === 'إطلاق منتج' ? 'box' : x.kind === 'بانر المنطقة' ? 'image' : 'star', 'sky', 'sm')}<span class="tx"><b>${x.kind} · ${x.brand ? esc(x.brand) : sName(x.s)}</b><span class="m">${x.area} · ${x.price}</span></span>${x.status === 'pending' ? pill('ينتظر', 'warn', 'clock') : x.status === 'ok' ? pill('منشور', 'ok', 'check') : pill('مرفوض', 'err', 'close')}</div>
          <div class="ax-adprev"><span class="pill ad">إعلان</span>${x.s != null ? img(salon(x.s).cover + '-wide', '', '') : `<span class="ax-adbox">${icb('box', 'sky', 'lg')}</span>`}<b>${x.brand ? esc(x.brand) : sName(x.s)}</b></div>
          ${x.s != null ? `<div class="kv"><span>ختم التوثيق</span>${verified()}</div>` : `<div class="kv"><span>فاتورة الموزع</span>${pill('مستلمة', 'ok', 'check')}</div>`}
          ${x.status === 'pending' ? `<div class="btnrow"><button type="button" class="btn sm danger" data-a="a_ad" data-id="${x.id}" data-v="no">${ic('close')} رفض</button><button type="button" class="btn sm ok" data-a="a_ad" data-id="${x.id}" data-v="ok">${ic('check')} قبول</button></div>` : ''}</div>`).join('')}</div>`
    };
  };
  A.a_ad = (el, d) => { const x = ensure().ads.find((q) => q.id === d.id); x.status = d.v; save(); App.toast(d.v === 'ok' ? 'انقبل الإعلان، ويظهر عليه "إعلان"' : 'انرفض الإعلان', { icon: 'megaphone' }); App.refresh(); };

  App.SCREENS['a.commission'] = () => {
    const a = ensure();
    return {
      title: 'العمولات والباقات', sub: 'العمولة على الزبونة الجديدة فقط', 
      body: `<div class="sec"><div class="rule ok">${ic('info')}<span>ما ناخذ عمولة على زبونة الصالون القديمة. العمولة مرة وحدة على الزبونة الجديدة بعد ما تحضر وينمسح رمزها.</span></div>
        ${SALONS.map((s) => { const v = a.comm[s.id] || 15; return `<div class="card"><div class="row start">${img(s.cover, 'ax-thumb sq', s.n)}<span class="tx"><b>${s.n}</b><span class="sx-pills">${s.founder ? pill('مؤسِّسة · مجاني', 'gold', 'crown') : pill('مجانية', 'muted')}</span></span></div>
          <div class="row"><span class="m">عمولة الزبونة الجديدة</span><span class="sx-chips">${[10, 15, 20].map((n) => `<button type="button" class="chip sx-sm num" data-a="a_comm" data-s="${s.id}" data-v="${n}" aria-pressed="${v === n}">${n}%</button>`).join('')}</span></div></div>`; }).join('')}
        <p class="tip">${ic('info')}<span>النسب هنا للتجربة، والأرقام الحقيقية تتحدد بعد مقابلات الصالونات.</span></p></div>`
    };
  };
  A.a_comm = (el, d) => { ensure().comm[d.s] = +d.v; save(); App.refresh(); };
})();
