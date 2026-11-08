/* Client (زبونة) screens, part 2: stories and reels, gifts and products, share and earn, petals,
   notifications, account, wallet, saved ideas, privacy and consent, complaints, bride planner. */
(function () {
  'use strict';
  const SC = App.SCREENS, A = App.ACT;
  const DAY = 864e5;

  /* ---------- stories: one salon at a time, tap sides to move ---------- */
  const ST = { order: [], gi: 0, ri: 0, held: false, holdT: null, suppress: false };
  const reelsOf = (sid) => App.reelsAll().filter((r) => +r.s === +sid);
  function stCurrent() { const list = reelsOf(ST.order[ST.gi]); return { list, r: list[ST.ri] }; }
  function stShow() {
    const { list, r } = stCurrent();
    if (!r) return;
    const s = salon(r.s), v = $('#sv');
    S.seen[r.s] = true; App.save();
    v.poster = `assets/img/${r.v}.jpg`;
    v.src = vsrc(r.v);
    v.play().catch(() => { /* autoplay blocked: poster stays visible */ });
    $('#sbars').innerHTML = list.map((x, k) => `<i class="${k < ST.ri ? 'full' : ''}"><b ${k === ST.ri ? 'id="sbar"' : ''}></b></i>`).join('');
    $('#sava').src = `assets/img/${s.cover}.jpg`;
    $('#sname').textContent = s.n;
    $('#smeta').textContent = `${s.km} كم · ${ST.ri === 0 ? 'قبل ساعتين' : 'قبل ' + (ST.ri + 2) + ' ساعات'}`;
    $('#swm').textContent = `صالوناتي · ${s.n} · موثّق`;
    $('#scap').textContent = r.cap;
    $('#stags').innerHTML = `<span>${ic('sparkle')}${svc(r.svc).n}</span><span>${ic('pin')}${s.km} كم</span>${r.consent ? `<span>${ic('shield')}بموافقة الزبونة</span>` : ''}${r.ad ? '<span>إعلان</span>' : ''}`;
    const pr = App.price(s.id, r.svc, 'm');
    $('#scta').innerHTML = `${ic('cal')}احجزي هذي الخدمة · <span class="num">${money(pr.p)}</span>`;
    $('#scta').dataset.s = s.id; $('#scta').dataset.svc = r.svc;
    const like = $('#slike'), save = $('#ssave');
    like.setAttribute('aria-pressed', !!S.likes[r.id]); like.querySelector('span').textContent = money(r.likes + (S.likes[r.id] ? 1 : 0));
    save.setAttribute('aria-pressed', !!S.saves[r.id]); save.querySelector('span').textContent = money(r.sv + (S.saves[r.id] ? 1 : 0));
    $('#scm span').textContent = money(r.cm + ((S.comments[r.id] || []).length));
    [like, save, $('#scm'), $('#sshare')].forEach((b) => { b.dataset.id = r.id; });
    App.learn(r.tag, 1);
  }
  function stStep(dir) {
    const { list } = stCurrent();
    ST.ri += dir;
    if (ST.ri >= list.length) { ST.gi++; ST.ri = 0; }
    if (ST.ri < 0) { ST.gi--; ST.ri = 0; }
    if (ST.gi < 0) { ST.gi = 0; ST.ri = 0; }
    if (ST.gi >= ST.order.length) { App.back(); return; }
    stShow();
  }
  SC['c.stories'] = (p) => {
    ST.order = App.storyGroups().map((g) => g.s);
    ST.gi = Math.max(0, ST.order.indexOf(+p.s));
    const list = reelsOf(ST.order[ST.gi]);
    ST.ri = p.r ? Math.max(0, list.findIndex((x) => x.id === p.r)) : 0;
    return {
      head: '', cls: 'full dark-status', 
      body: `<div class="story" id="story">
        <video id="sv" muted playsinline preload="auto" aria-hidden="true"></video>
        <div class="frame-gold"></div>
        <div class="s-bars" id="sbars"></div>
        <div class="s-top"><img class="ava-img" id="sava" alt=""><span class="tx"><b id="sname"></b><span id="smeta"></span></span>${verified()}<span style="flex:1"></span><button type="button" class="ibtn" data-a="back" aria-label="إغلاق">${ic('close')}</button></div>
        <span class="wm">${rose()}<span id="swm"></span></span>
        <div class="s-tap prev" data-a="stPrev" role="button" tabindex="-1" aria-label="السابق"></div>
        <div class="s-tap next" data-a="stNext" role="button" tabindex="-1" aria-label="التالي"></div>
        <div class="s-rail">
          <button type="button" id="slike" data-a="rLike" aria-label="إعجاب">${ic('heart')}<span class="num">0</span></button>
          <button type="button" id="scm" data-a="rCm" aria-label="تعليقات">${ic('chat')}<span class="num">0</span></button>
          <button type="button" id="ssave" class="sv" data-a="rSave" aria-label="حفظ بألبوم أفكاري">${ic('save')}<span class="num">0</span></button>
          <button type="button" id="sshare" data-a="rShare" aria-label="مشاركة">${ic('share')}<span>شاركي</span></button>
        </div>
        <div class="s-bottom"><div class="s-cap" id="scap"></div><div class="s-tags" id="stags"></div><button type="button" class="btn lg block s-cta" id="scta" data-a="stBook"></button></div>
      </div>`,
      after: (view) => {
        const v = $('#sv', view);
        v.addEventListener('timeupdate', () => { const b = $('#sbar'); if (b && v.duration) b.style.width = (v.currentTime / v.duration * 100) + '%'; });
        v.addEventListener('ended', () => stStep(1));
        $$('.s-tap', view).forEach((t) => {
          t.addEventListener('pointerdown', () => { ST.holdT = setTimeout(() => { ST.held = true; v.pause(); }, 220); });
          const up = () => { clearTimeout(ST.holdT); if (ST.held) { ST.held = false; ST.suppress = true; v.play().catch(() => {}); } };
          t.addEventListener('pointerup', up); t.addEventListener('pointercancel', up); t.addEventListener('pointerleave', up);
        });
        const key = (e) => { if (e.key === 'ArrowLeft') stStep(1); else if (e.key === 'ArrowRight') stStep(-1); };
        document.addEventListener('keydown', key);
        App.onLeave(() => { document.removeEventListener('keydown', key); v.pause(); v.removeAttribute('src'); });
        stShow();
      }
    };
  };
  A.stNext = () => { if (ST.suppress) { ST.suppress = false; return; } stStep(1); };
  A.stPrev = () => { if (ST.suppress) { ST.suppress = false; return; } stStep(-1); };
  A.stBook = (el, d) => App.go('c.salon', { id: d.s, svc: d.svc });

  /* ---------- reels feed ---------- */
  function reelHtml(r) {
    const s = salon(r.s), pr = App.price(s.id, r.svc, 'm');
    return `<section class="reel" data-id="${r.id}">
      <video muted loop playsinline preload="none" poster="assets/img/${r.v}.jpg" data-src="${vsrc(r.v)}" aria-label="${esc(r.cap)}"></video>
      <div class="frame-gold"></div><span class="wm">${rose()}صالوناتي · ${s.n} · موثّق</span>
      <span class="paused-ic" hidden>${ic('play')}</span>
      <div class="s-rail">
        <button type="button" class="rava" data-go="c.salon" data-id="${s.id}" data-tab="gal" aria-label="صفحة ${s.n}">${img(s.cover)}</button>
        <button type="button" data-a="rLike" data-id="${r.id}" aria-pressed="${!!S.likes[r.id]}" aria-label="إعجاب">${ic('heart')}<span class="num">${money(r.likes + (S.likes[r.id] ? 1 : 0))}</span></button>
        <button type="button" data-a="rCm" data-id="${r.id}" aria-label="تعليقات">${ic('chat')}<span class="num">${money(r.cm + (S.comments[r.id] || []).length)}</span></button>
        <button type="button" class="sv" data-a="rSave" data-id="${r.id}" aria-pressed="${!!S.saves[r.id]}" aria-label="حفظ">${ic('save')}<span class="num">${money(r.sv + (S.saves[r.id] ? 1 : 0))}</span></button>
        <button type="button" data-a="rShare" data-id="${r.id}" aria-label="مشاركة">${ic('share')}<span>شاركي</span></button>
      </div>
      <div class="s-bottom">
        <div class="row start" style="gap:8px"><button type="button" class="rname" data-go="c.salon" data-id="${s.id}">${s.n}</button>${verified()}<button type="button" class="rfollow" data-a="rFollow" data-id="${s.id}" aria-pressed="${!!S.follows[s.id]}">${S.follows[s.id] ? 'تتابعينه' : 'متابعة'}</button></div>
        <div class="s-cap">${esc(r.cap)}</div>
        <div class="s-tags"><span>${ic('sparkle')}${svc(r.svc).n}</span><span>${ic('pin')}${s.km} كم</span>${r.consent ? `<span>${ic('shield')}بموافقة الزبونة</span>` : ''}${r.ad ? '<span>إعلان</span>' : ''}${r.fresh ? '<span>جديد</span>' : ''}</div>
        <button type="button" class="btn lg block s-cta" data-go="c.salon" data-id="${s.id}" data-svc="${r.svc}">${ic('cal')}احجزي هذي الخدمة · <span class="num">${money(pr.p)}</span></button>
      </div></section>`;
  }
  SC['c.reels'] = (p) => {
    const tab = p.tab || 'near';
    let list = App.reelsAll();
    if (tab === 'follow') list = list.filter((r) => S.follows[r.s]);
    else list = list.slice().sort((a, b) => salon(a.s).km - salon(b.s).km + (S.likes[b.id] ? 0.1 : 0));
    return {
      head: '', cls: 'full dark-status', nav: 'c.reels', 
      body: `<div class="reels" id="reels">${list.length ? list.map(reelHtml).join('') : `<div class="reel" style="display:grid;place-items:center;color:#fff">${emptyState({ icon: 'reels', tone: 'rose', title: 'ما تتابعين صالونات بعد', text: 'تابعي صالون حتى تشوفين ريلزه هنا', action: '<button type="button" class="btn" data-a="rTab" data-v="near">شوفي القريب منچ</button>' })}</div>`}</div>
        <div class="reels-top"><h1 tabindex="-1">ريلز</h1><div class="rtabs" role="group"><button type="button" data-a="rTab" data-v="near" aria-pressed="${tab === 'near'}">قريب منچ</button><button type="button" data-a="rTab" data-v="follow" aria-pressed="${tab === 'follow'}">أتابعهن</button></div></div>`,
      after: (view) => {
        const box = $('#reels', view);
        const io = new IntersectionObserver((ents) => ents.forEach((en) => {
          const v = $('video', en.target);
          if (!v) return;
          if (en.isIntersecting) {
            if (!v.src) v.src = v.dataset.src;
            v.play().catch(() => {});
            const r = App.reelsAll().find((x) => x.id === en.target.dataset.id);
            if (r) App.learn(r.tag, 1);
          } else v.pause();
        }), { root: box, threshold: 0.6 });
        $$('.reel', box).forEach((el) => io.observe(el));
        $$('video', box).forEach((v) => v.addEventListener('click', () => {
          const ic2 = v.parentElement.querySelector('.paused-ic');
          if (v.paused) { v.play().catch(() => {}); ic2.hidden = true; } else { v.pause(); ic2.hidden = false; }
        }));
        App.onLeave(() => { io.disconnect(); $$('video', box).forEach((v) => v.pause()); });
      }
    };
  };
  A.rTab = (el, d) => { App.cur().p.tab = d.v; App.refresh(); };
  const reelById = (id) => App.reelsAll().find((x) => x.id === id);
  A.rLike = (el, d) => {
    const r = reelById(d.id); S.likes[d.id] = !S.likes[d.id]; if (S.likes[d.id]) App.learn(r.tag, 2); App.save();
    el.setAttribute('aria-pressed', !!S.likes[d.id]); el.querySelector('span').textContent = money(r.likes + (S.likes[d.id] ? 1 : 0));
  };
  A.rSave = (el, d) => {
    const r = reelById(d.id); S.saves[d.id] = !S.saves[d.id]; if (S.saves[d.id]) App.learn(r.tag, 3); App.save();
    el.setAttribute('aria-pressed', !!S.saves[d.id]); el.querySelector('span').textContent = money(r.sv + (S.saves[d.id] ? 1 : 0));
    App.toast(S.saves[d.id] ? 'انحفظت بألبوم أفكاري' : 'انشالت من ألبوم أفكاري', { icon: 'save' });
  };
  A.rFollow = (el, d) => { S.follows[d.id] = !S.follows[d.id]; App.save(); $$(`[data-a="rFollow"][data-id="${d.id}"]`).forEach((b) => { b.setAttribute('aria-pressed', !!S.follows[d.id]); b.textContent = S.follows[d.id] ? 'تتابعينه' : 'متابعة'; }); };
  A.rShare = (el, d) => { const r = reelById(d.id); App.learn(r.tag, 2); App.openShare(`${r.cap} · ${salon(r.s).n}`, `salonati.iq/r/${r.id}?r=${S.user.ref}`); };
  function commentsHtml(id) {
    const r = reelById(id), mine = S.comments[id] || [], all = r.c.concat(mine);
    return `<div class="sheet-h"><h2>التعليقات <span class="m num">(${r.cm + mine.length})</span></h2><button type="button" class="ibtn" data-a="close" aria-label="إغلاق">${ic('close')}</button></div>
      ${all.length ? `<div class="list">${all.map((c, k) => `<div class="cm">${avatar(c[0], 'plum')}<span class="tx"><b>${esc(c[0])}</b><span>${esc(c[1])}</span></span><button type="button" class="more" data-a="rReport" data-k="${id}:${k}">${S.reports[id + ':' + k] ? 'انبلغ عنه' : 'إبلاغ'}</button></div>`).join('')}</div>` : emptyState({ icon: 'chat', tone: 'plum', title: 'ماكو تعليقات', text: 'كوني أول وحدة تعلق' })}
      <div class="cmin"><input class="inp" id="cmIn" maxlength="120" placeholder="اكتبي تعليق" aria-label="اكتبي تعليق"><button type="button" class="btn" data-a="rSend" data-id="${id}">${ic('arrow-l')}</button></div>
      <p class="tip">${ic('shield')}التعليق برقم موثّق، وعليه فلتر ألفاظ. ماكو رسائل خاصة بين المستخدمات</p>`;
  }
  A.rCm = (el, d) => App.sheet(commentsHtml(d.id), { label: 'التعليقات' });
  A.rSend = (el, d) => {
    if (!App.requireAuth('')) return;
    const v = ($('#cmIn') || {}).value; if (!v || !v.trim()) return;
    if (/غبي|حقير|زبالة/.test(v)) { App.toast('التعليق فيه كلام مو مقبول', { icon: 'alert', tone: 'err' }); return; }
    (S.comments[d.id] = S.comments[d.id] || []).push([S.user.name, v.trim()]); App.learn(reelById(d.id).tag, 1); App.save();
    App.sheetUpdate(commentsHtml(d.id));
    $$(`[data-a="rCm"][data-id="${d.id}"] span`).forEach((s) => { s.textContent = money(reelById(d.id).cm + S.comments[d.id].length); });
  };
  A.rReport = (el, d) => { S.reports[d.k] = true; App.save(); el.textContent = 'انبلغ عنه'; App.toast('وصل البلاغ للإدارة، راح نراجعه', { icon: 'flag', tone: 'ok' }); };

  /* ---------- gifts and products ---------- */
  SC['c.gifts'] = (p) => {
    const tab = p.tab || 'cards';
    let body = '';
    if (tab === 'cards') {
      body = `<div class="sec"><div class="sec-h"><h2>${ic('gift')}بطاقة هدية</h2></div><p class="m" style="margin:0">تستخدمها صديقتچ بأي صالون موثّق. تحتاجين رقمها بس.</p></div>
        <div class="hscroll" style="margin-top:10px">${GIFT_CARDS.map((a) => `<button type="button" class="gcard" data-go="c.gift" data-type="card" data-amt="${a}">${rose()}<span class="brand-s">صالوناتي</span><span class="amt num">${money(a)} <small>د.ع</small></span><span>بطاقة هدية</span></button>`).join('')}</div>
        <div class="sec"><div class="sec-h"><h2>${ic('sparkle')}هدايا جاهزة</h2></div>
          <div class="list">${[['crown', 'gold', 'جلسة عروس', 'تجربة مكياج + تسريحة', 'c.salon', 5], ['nail', 'rose', 'يوم أظافر', 'مانيكير + بديكير بدار نور', 'c.salon', 2], ['drop', 'teal', 'تنظيف بشرة', 'جلسة عناية ببيت الورد', 'c.salon', 3]].map((x) => `<button type="button" class="li" data-go="${x[4]}" data-id="${x[5]}">${icb(x[0], x[1])}<span class="tx"><b>${x[2]}</b><span class="m">${x[3]}</span></span>${ic('chev-l')}</button>`).join('')}</div></div>`;
    } else if (tab === 'prods') {
      body = `<div class="sec"><div class="grid2">${PRODUCTS.map((x) => `<button type="button" class="prod" data-go="c.gift" data-type="prod" data-id="${x.id}"><span class="ph">${img(x.img)}${icb(x.icon, x.tone, 'sm')}</span><span class="bd"><b>${x.n}</b><span class="m">${salon(x.s).n}</span>${iqd(x.p)}</span></button>`).join('')}</div>
        <p class="tip">${ic('shield')}كل صالون يتعهد إن منتجاته أصلية بفاتورة مورد. شكيتي بمنتج؟ بلغينا من «مساعدة»</p></div>`;
    } else {
      body = `<div class="sec">${S.orders.length ? `<div class="list">${S.orders.map((o) => `<div class="li">${icb(o.kind === 'card' ? 'gift' : 'bag', o.kind === 'card' ? 'rose' : 'gold')}<span class="tx"><b>${esc(o.title)}</b><span class="m">${o.to ? 'إلى ' + esc(o.to) + ' · ' : ''}${ago(o.t)}</span><span class="num">${money(o.total)} د.ع</span></span>${pill(o.status, o.status === 'وصلت' ? 'ok' : 'gold')}</div>`).join('')}</div>`
        : emptyState({ icon: 'bag', tone: 'gold', title: 'ما عندچ طلبات', text: 'هدايا وطلبات المنتجات تظهر هنا مع حالتها', action: '<button type="button" class="btn" data-a="gTab" data-v="cards">اهدي صديقتچ</button>' })}</div>`;
    }
    return {
      title: 'هدايا ومنتجات', nav: 'c.gifts', 
      body: `<div class="sec" style="margin-top:0"><div class="seg" role="group"><button type="button" data-a="gTab" data-v="cards" aria-pressed="${tab === 'cards'}">${ic('gift')}هدايا</button><button type="button" data-a="gTab" data-v="prods" aria-pressed="${tab === 'prods'}">${ic('bag')}منتجات</button><button type="button" data-a="gTab" data-v="orders" aria-pressed="${tab === 'orders'}">${ic('box')}طلباتي</button></div></div>${body}`
    };
  };
  A.gTab = (el, d) => { App.cur().p.tab = d.v; App.refresh(); };

  SC['c.gift'] = (p) => {
    const isCard = p.type === 'card', prod = !isCard && PRODUCTS.find((x) => x.id === p.id);
    if (!p._init) { p._init = true; p.who = isCard ? 'friend' : 'me'; p.wrap = 'rose'; p.del = 'pickup'; p.ph = ''; p.msg = 'عيد ميلاد سعيد يا روحي'; p.amt = +(p.amt || 50000); p.pay = 'zain'; }
    const friend = p.who === 'friend';
    const base = isCard ? p.amt : prod.p;
    const wrap = friend && !isCard ? WRAPS.find((w) => w.id === p.wrap).p : 0;
    const del = isCard ? 0 : (friend || p.del === 'deliver' ? 5000 : 0);
    const total = base + wrap + del;
    const phOk = !friend || /^07\d{9}$/.test(p.ph.replace(/\s/g, ''));
    return {
      title: isCard ? 'بطاقة هدية' : prod.n, sub: isCard ? 'تنصرف بأي صالون موثّق' : salon(prod.s).n,
      body: `<div class="sec" style="margin-top:0">
        ${isCard ? `<div class="gcard" style="width:100%">${rose()}<span class="brand-s">صالوناتي</span><span class="amt num">${money(p.amt)} <small>د.ع</small></span><span>${friend ? 'هدية من ' + esc(S.user.name) : 'بطاقة هدية'}</span></div>
          <div class="seg" role="group">${GIFT_CARDS.map((a) => `<button type="button" class="num" data-a="gSet" data-k="amt" data-v="${a}" aria-pressed="${p.amt === a}">${money(a)}</button>`).join('')}</div>`
          : `<div class="card"><div class="row start">${img(prod.img, 'sq')}<span class="tx"><b>${prod.n}</b><span class="m">${salon(prod.s).n} · أصلي بفاتورة مورد</span>${iqd(prod.p)}</span></div></div>
          <div class="seg" role="group"><button type="button" data-a="gSet" data-k="who" data-v="me" aria-pressed="${!friend}">${ic('user')}إلي</button><button type="button" data-a="gSet" data-k="who" data-v="friend" aria-pressed="${friend}">${ic('gift')}هدية لصديقة</button></div>`}
        ${!isCard && !friend ? `<div class="pay"><button type="button" class="opt" data-a="gSet" data-k="del" data-v="pickup" aria-pressed="${p.del === 'pickup'}">${icb('cal', 'rose', 'sm')}<span class="tx"><b>استلميه بموعدچ</b><span class="m">بدون كلفة توصيل</span></span><span class="radio"></span></button>
          <button type="button" class="opt" data-a="gSet" data-k="del" data-v="deliver" aria-pressed="${p.del === 'deliver'}">${icb('truck', 'amber', 'sm')}<span class="tx"><b>توصيل داخل بغداد</b><span class="m num">5,000 · خلال يوم</span></span><span class="radio"></span></button></div>` : ''}
        ${friend && !isCard ? `<span class="lbl">${ic('gift')}التغليف</span><div class="wraps">${WRAPS.map((w) => `<button type="button" data-a="gSet" data-k="wrap" data-v="${w.id}" aria-pressed="${p.wrap === w.id}">${icb(w.icon, 'gold', 'sm')}${w.n}<span class="m num">${w.p ? '+' + money(w.p) : 'مجاني'}</span></button>`).join('')}</div>` : ''}
        ${friend ? `<div class="field"><label for="gph">${ic('phone')}رقم صديقتچ</label><input class="inp num" id="gph" dir="ltr" inputmode="tel" maxlength="13" placeholder="07XX XXX XXXX" data-in="gPh" value="${esc(p.ph)}" aria-invalid="${p.ph.length > 3 && !phOk}" aria-describedby="gphe">
            ${p.ph.length > 3 && !phOk ? `<span class="err-t" id="gphe" role="alert">${ic('alert')}الرقم لازم يبدي بـ 07 ويكون 11 رقم</span>` : `<span class="m" id="gphe">هي تكتب عنوانها برسالة خاصة، ما تحتاجين تعرفينه</span>`}
            <button type="button" class="more" style="justify-self:start" data-a="gFill">${ic('sparkle')}رقم تجريبي</button></div>
          <div class="field"><label for="gmsg">${ic('chat')}رسالتچ</label><div class="chips" style="padding:0">${['عيد ميلاد سعيد يا روحي', 'مبروك التخرج', 'شكراً إلچ', 'دللي نفسچ'].map((m) => `<button type="button" class="chip" data-a="gSet" data-k="msg" data-v="${m}" aria-pressed="${p.msg === m}">${m}</button>`).join('')}</div>
            <textarea class="inp" id="gmsg" data-in="gMsg" maxlength="140">${esc(p.msg)}</textarea></div>` : ''}
        <div class="card">
          <div class="kv"><span>${isCard ? 'قيمة البطاقة' : prod.n}</span><b class="num">${money(base)}</b></div>
          ${wrap ? `<div class="kv"><span>التغليف</span><b class="num">${money(wrap)}</b></div>` : ''}
          ${del ? `<div class="kv"><span>التوصيل</span><b class="num">${money(del)}</b></div>` : ''}
          <div class="kv tot"><span>المجموع${del ? ' مع التوصيل' : ''}</span><b class="num">${money(total)} د.ع</b></div></div>
        <div class="pay">${App.PAY.map((x) => `<button type="button" class="opt" data-a="gSet" data-k="pay" data-v="${x.id}" aria-pressed="${p.pay === x.id}"><span class="logo ${x.cls}">${x.logo}</span><span class="tx"><b>${x.n}</b></span><span class="radio"></span></button>`).join('')}</div>
      </div>`,
      bar: `<button type="button" class="btn block lg" data-a="gPay" ${phOk && (!friend || p.ph) ? '' : 'disabled'}>${ic(friend ? 'gift' : 'bag')}${friend ? 'ادفعي وأرسلي' : 'ادفعي'} ${money(total)} د.ع</button>`
    };
  };
  A.gSet = (el, d) => { const p = App.cur().p; p[d.k] = d.k === 'amt' ? +d.v : d.v; App.refresh(); };
  A.gPh = (el) => { App.cur().p.ph = el.value; };
  A.gMsg = (el) => { App.cur().p.msg = el.value; };
  A.gFill = () => { App.cur().p.ph = '0770 987 6512'; App.refresh(); };
  A.gPay = () => {
    if (!App.requireAuth('')) return;
    const p = App.cur().p;
    if (p.who === 'friend' && !/^07\d{9}$/.test((($('#gph') || {}).value || p.ph).replace(/\s/g, ''))) { p.ph = ($('#gph') || {}).value || p.ph; App.refresh(); return; }
    App.sheet(`<div class="perm" style="padding-top:10px"><div class="spin"></div><h2>بانتظار موافقتچ على الدفع</h2><p>افتحي تطبيق ${p.pay === 'qi' ? 'كي كارد' : 'زين كاش'} ووافقي</p></div>`, { label: 'الدفع' });
    App.later(() => {
      const isCard = p.type === 'card', prod = !isCard && PRODUCTS.find((x) => x.id === p.id);
      const friend = p.who === 'friend';
      const total = (isCard ? p.amt : prod.p) + (friend && !isCard ? WRAPS.find((w) => w.id === p.wrap).p : 0) + (!isCard && (friend || p.del === 'deliver') ? 5000 : 0);
      S.orders.unshift({ id: 'o' + Date.now(), kind: isCard ? 'card' : 'prod', title: isCard ? `بطاقة هدية ${money(p.amt)}` : prod.n, to: friend ? p.ph : '', total, status: isCard ? 'وصلت' : friend ? 'بانتظار عنوانها' : p.del === 'pickup' ? 'جاهز بموعدچ' : 'يتجهز', t: App.now() });
      if (!isCard) App.notify({ role: 'salon', icon: 'bag', tone: 'gold', title: 'طلب منتج', text: `${prod.n} · ${friend ? 'هدية' : S.user.name}`, to: 's.today' });
      App.save(); App.closeSheet(true);
      App.replace('c.giftDone', { friend: friend ? '1' : '', title: isCard ? 'بطاقة هدية' : prod.n });
    }, 1800);
  };
  SC['c.giftDone'] = (p) => ({
    head: '', 
    body: `<div class="done-hero"><span class="bigcheck">${ic('gift')}</span><h1 tabindex="-1">${p.friend ? 'انرسلت هديتچ' : 'انطلب منتجچ'}</h1><p class="m" style="margin:0">${p.friend ? 'وصلت صديقتچ رسالة فيها هديتچ، وهي تكتب عنوانها بنفسها' : 'نبلغچ من يصير جاهز'}</p></div>
      <div class="sec"><div class="btns"><button type="button" class="btn block lg" data-a="tab" data-to="c.gifts">${ic('box')}طلباتي</button><button type="button" class="btn ghost block" data-a="home">رجوع للرئيسية</button></div></div>`,
    after: () => App.celebrate()
  });

  /* ---------- share and earn ---------- */
  SC['c.share'] = () => {
    if (!S.user.registered) return { title: 'شاركي واربحي', body: App.guestPrompt('share', 'رابط خاص إلچ', 'سجلي حتى يصير عندچ رابط، وتربحين 1,000 دينار لكل صديقة تحضر') };
    const att = S.referrals.filter((r) => r.st === 'attended'), earned = att.reduce((a, r) => a + r.credit, 0);
    const link = `salonati.iq/n/${S.user.ref}`;
    return {
      title: 'شاركي واربحي', 
      body: `<div class="sec" style="margin-top:0"><div class="wallet-card">${rose()}<span class="m">ربحتي من صديقاتچ</span><span class="amt num">${money(earned)} د.ع</span><span class="m">${att.length} صديقات حضرن · يخصم من حجوزاتچ</span></div></div>
        <div class="sec"><div class="grid3" style="text-align:center">${[['share', 'rose', 'شاركي الرابط'], ['cal', 'plum', 'صديقتچ تحجز وتاخذ 2,000'], ['gift', 'gold', 'تحضر وتربحين 1,000']].map((x, k) => `<div style="display:grid;justify-items:center;gap:6px">${icb(x[0], x[1], 'lg')}<span class="m" style="font-weight:600"><b class="num">${k + 1}.</b> ${x[2]}</span></div>`).join('')}</div></div>
        <div class="sec"><div class="card"><span class="m">رابطچ</span><div class="row"><b class="num" dir="ltr">${link}</b><button type="button" class="btn sm soft" data-a="copyText" data-t="https://${link}">${ic('copy')}انسخي</button></div></div>
          <button type="button" class="btn wa block lg" data-a="shareVia" data-v="واتساب">${ic('whatsapp')}شاركي على واتساب</button>
          <div class="btnrow"><button type="button" class="btn plain" data-a="shareVia" data-v="سناب">${ic('camera')}سناب</button><button type="button" class="btn plain" data-a="shareVia" data-v="إنستغرام">${ic('image')}إنستا</button><button type="button" class="btn plain" data-a="storyCard">${ic('sparkle')}بطاقة ستوري</button></div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('users')}صديقاتچ</h2></div><div class="list">${S.referrals.map((r) => `<div class="li">${avatar(r.n, 'rose')}<span class="tx"><b>${r.n}</b><span class="m">${r.st === 'attended' ? 'حضرت موعدها' : 'حجزت، تنتظر الزيارة'}</span></span>${r.st === 'attended' ? pill('+' + money(r.credit), 'ok', 'check') : pill('بالانتظار', 'muted', 'clock')}</div>`).join('')}</div></div>
        <div class="sec"><div class="rule info">${ic('info')}<span>الرصيد يخصم من الحجوزات والمنتجات وما ينصرف كاش، وينتهي بعد 60 يوم. مستوى واحد بس، ما تربحين من صديقات صديقاتچ.</span></div></div>`
    };
  };
  A.storyCard = () => App.sheet(`<h2>بطاقة ستوري جاهزة</h2><div class="story-card">${rose()}<span class="word">صالوناتي</span><span>احجزي بصالون موثّق وخذي 2,000 هدية</span><span class="code num">${S.user.ref.toUpperCase()}</span></div>
    <button type="button" class="btn block lg" data-a="shareVia" data-v="الستوري">${ic('share')}انشريها</button>`, { label: 'بطاقة ستوري' });

  /* ---------- petals ---------- */
  SC['c.petals'] = () => {
    if (!S.user.registered) return { title: 'وردتچ', sub: 'وردة بابل', body: App.guestPrompt('sparkle', 'كل زيارة بتلة', 'ثمن بتلات تربحين جلسة هدية. سجلي وقت أول حجز وتبدي وردتچ') };
    const n = S.user.petals, done = App.mine().filter((b) => b.petal || b.status === 'done');
    return {
      title: 'وردتچ', sub: 'وردة بابل', 
      body: `<div class="done-hero"><div class="big-petals">${petals(n)}</div><div class="petal-count num">${n} / 8</div><p class="m" style="margin:0">${n >= 8 ? 'كملت وردتچ! استلمي هديتچ' : `باقي ${8 - n} زيارات وتربحين جلسة هدية لحد 25,000`}</p>
        ${n >= 8 ? `<button type="button" class="btn gold lg" data-a="claimGift">${ic('gift')}استلمي هديتچ</button>` : ''}</div>
        <div class="sec"><div class="grid3" style="text-align:center">${[['qr', 'rose', 'زيارة بالرمز = بتلة'], ['sparkle', 'gold', '8 بتلات = جلسة هدية'], ['clock', 'teal', 'البتلات تبقى سنة']].map((x) => `<div style="display:grid;justify-items:center;gap:6px">${icb(x[0], x[1], 'lg')}<span class="m" style="font-weight:600">${x[2]}</span></div>`).join('')}</div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('list')}بتلاتچ</h2></div><div class="list">${done.length ? done.map((b) => `<div class="li"><span class="ib sm t-rose" aria-hidden="true"><svg viewBox="-40 -40 80 80" style="width:60%;height:60%"><use href="#petal" fill="currentColor"/></svg></span><span class="tx"><b>${salon(b.s).n}</b><span class="m">${itemsText(b)} · ${dayLabel(b.at)}</span></span>${pill('+1', 'ok')}</div>`).join('') : emptyState({ icon: 'sparkle', tone: 'rose', title: 'ماكو بتلات بعد', text: 'أول زيارة بالرمز تفتح أول بتلة' })}</div></div>
        <div class="sec"><p class="tip">${ic('info')}البتلة تنحسب بس للحجز من التطبيق والزيارة المؤكدة بالرمز. هيچ نضمن إن الصالون والزبونة تعاملوا فعلاً.</p></div>`
    };
  };

  /* ---------- notifications ---------- */
  SC['c.notifs'] = (p) => {
    if (!S.user.registered) return { title: 'الإشعارات', body: App.guestPrompt('bell', 'تذكيرات مواعيدچ توصل هنا', 'سجلي برقمچ حتى نذكرچ بموعدچ ونبلغچ بعروض الصالونات اللي تتابعينها') };
    const f = p.f || 'all';
    const kinds = { appt: ['appt', 'wait'], offer: ['offer', 'due', 'empty'], account: ['account'] };
    const list = S.notifications.filter((n) => n.role === 'client' && (f === 'all' || (kinds[f] || []).includes(n.kind || 'offer')));
    return {
      title: 'الإشعارات', actions: `<button type="button" class="ibtn" data-go="c.notifset" aria-label="إعدادات الإشعارات">${ic('sliders')}</button>`,
      body: `<div class="chips" role="group">${[['all', 'الكل'], ['appt', 'مواعيد'], ['offer', 'عروض'], ['account', 'حسابي']].map((x) => `<button type="button" class="chip" data-a="nF" data-v="${x[0]}" aria-pressed="${f === x[0]}">${x[1]}</button>`).join('')}</div>
        <div class="sec">${list.length ? `<div class="list">${list.map((n) => `<button type="button" class="notif ${S.read[n.id] ? '' : 'unread'}" data-a="nOpen" data-id="${n.id}">${icb(n.icon || 'bell', n.tone || 'rose')}<span class="tx"><b>${n.title}</b><span>${n.text || ''}</span><span class="m">${ago(n.t)}</span></span></button>`).join('')}</div>`
          : emptyState({ icon: 'bell', tone: 'muted', title: 'ماكو إشعارات هنا', text: 'المواعيد والعروض اللي تهمچ تظهر هنا' })}</div>`,
      after: () => App.later(() => { list.forEach((n) => { S.read[n.id] = true; }); App.save(); }, 1500)
    };
  };
  A.nF = (el, d) => { App.cur().p.f = d.v; App.refresh(); };
  A.nOpen = (el, d) => { const n = S.notifications.find((x) => x.id === d.id); S.read[n.id] = true; App.save(); if (n.to) App.go(n.to, Object.assign({}, n.p || {})); };

  SC['c.notifset'] = () => {
    const u = S.user, keys = Object.keys(u.interests).sort((a, b) => u.interests[b] - u.interests[a]);
    const row = (k, icon, tone, t, d) => `<div>${icb(icon, tone, 'sm')}<span class="tx"><b>${t}</b><span class="m">${d}</span></span>${sw(u.notif[k], 'notifTog', t, `data-k="${k}"`)}</div>`;
    return {
      title: 'إعدادات الإشعارات', 
      body: `<div class="sec" style="margin-top:0"><div class="menu">
          <div>${icb('cal', 'ok', 'sm')}<span class="tx"><b>المواعيد والرمز</b><span class="m">تأكيد وتذكير وتغيير من الصالون</span></span>${pill('ما يتوقف', 'muted', 'lock')}</div>
          ${row('offers', 'tag', 'gold', 'عروض من صالونات أتابعها', 'تنجمع بإشعار واحد إذا كثرت')}
          ${row('empty', 'zap', 'amber', 'ساعة فارغة قريبة', 'موعد فرغ اليوم بمنطقتچ')}
          ${row('price', 'percent', 'rose', 'نزل السعر', 'نقارن بسعر آخر 30 يوم حتى ما يكون تخفيض وهمي')}
          ${row('due', 'hairdryer', 'plum', 'حان وقت الخدمة', 'مثلاً شهرين بعد الصبغة')}
          ${row('wait', 'bell', 'sky', 'قائمة الانتظار', 'إذا فرغ موعد طلبتيه')}
          ${row('account', 'wallet', 'teal', 'الرصيد والبتلات', 'إذا حضرت صديقتچ أو قرب ينتهي رصيدچ')}
        </div></div>
        <div class="sec"><div class="li">${icb('moon', 'plum', 'sm')}<span class="tx"><b>ساعات الهدوء</b><span class="m">ما نرسل عروض بعد 10 بالليل</span></span>${sw(u.quiet, 'quietTog', 'ساعات الهدوء')}</div>
          <p class="tip">${ic('info')}حد أقصى إشعارين عروض بالأسبوع. نص الإشعار ما فيه تفاصيل خاصة لأن ممكن يبين على شاشة القفل</p></div>
        <div class="sec"><div class="sec-h"><h2>${ic('sparkle')}اهتماماتي</h2><span>${sw(u.track, 'trackTog', 'تخصيص العروض')}</span></div>
          <p class="m" style="margin:0">هذا اللي عرفناه من الريلز والبحث. الحساسية والصبغة والصور الخاصة ما تدخل بالعروض أبداً.</p>
          ${u.track ? (keys.length ? `<div class="row wrap start">${keys.map((k) => `<button type="button" class="chip" data-a="intDel" data-k="${esc(k)}" aria-label="امسحي ${esc(k)}">${esc(k)} ${ic('close')}</button>`).join('')}</div><button type="button" class="btn danger sm" style="justify-self:start" data-a="intWipe">${ic('trash')}امسحي كل اهتماماتي</button>` : '<span class="m">تفاعلي مع الريلز حتى تظهر هنا</span>') : pill('التخصيص متوقف', 'muted', 'eyeoff')}</div>`
    };
  };
  A.quietTog = () => { S.user.quiet = !S.user.quiet; App.save(); App.refresh(); };
  A.intDel = (el, d) => { delete S.user.interests[d.k]; App.save(); App.refresh(); };
  A.intWipe = () => { S.user.interests = {}; App.save(); App.refresh(); App.toast('انمسحت اهتماماتچ', { icon: 'trash', tone: 'ok' }); };

  /* ---------- account ---------- */
  SC['c.me'] = () => {
    const u = S.user, visits = App.mine().filter((b) => b.status === 'done').length;
    const easy = App.Style && App.Style.get('easy');
    const item = (go, icon, tone, t, d, extra) => `<button type="button" ${go.startsWith('a:') ? `data-a="${go.slice(2)}"` : `data-go="${go}"`}>${icb(icon, tone, 'sm')}<span class="tx"><b>${t}</b>${d ? `<span class="m">${d}</span>` : ''}</span>${extra || `<span class="chev">${ic('chev-l')}</span>`}</button>`;
    const easyRow = item('a:easyTog', 'eye', 'gold', 'خلّي الشاشة أبسط', 'أزرار أكبر وأقل تفاصيل', sw(easy, 'easyTog', 'الشاشة الأبسط'));
    if (!u.registered) return {
      title: 'حسابي', nav: 'c.me',
      body: `<div class="sec" style="margin-top:0"><div class="card" style="justify-items:center;text-align:center">${icb('user', 'rose', 'xl')}<b style="font-size:1.15em">أهلاً بيچ</b><span class="m">تتصفحين بدون حساب. نطلب رقمچ بس وقت تحجزين</span>
          <button type="button" class="btn block lg" data-a="login">${ic('phone')}سجلي برقم موبايلچ</button></div></div>
        <div class="sec"><div class="menu">${easyRow}</div></div>
        <div class="sec"><div class="menu">
          ${item('c.saved', 'save', 'amber', 'المحفوظات وألبوم أفكاري', 'تنحفظ على هذا الجهاز')}
          ${item('c.bride', 'crown', 'gold', 'خطة العروس', 'خططي جلساتچ')}
          ${item('c.help', 'help', 'sky', 'مساعدة', 'أسئلة متكررة وشكوى')}
          ${item('a:langSheet', 'globe', 'mint', 'اللغة', 'عربي')}
        </div></div>
        <p class="tip" style="justify-content:center;margin-top:16px">${rose()}صالوناتي · نموذج تجريبي للعرض</p>`
    };
    return {
      title: 'حسابي', nav: 'c.me', 
      body: `<div class="me-head">${avatar(u.name, 'rose').replace('class="ava', 'class="ava lg')}<span class="tx"><b style="font-size:1.2em">${esc(u.name)}</b><span class="m num" dir="ltr" style="text-align:end">${u.phone}</span><span class="m">${App.areaName(u.area)}، بغداد</span></span><button type="button" class="ibtn" data-a="editName" aria-label="عدلي الاسم">${ic('edit')}</button></div>
        <div class="sec"><div class="me-stats"><button type="button" data-go="c.petals"><b class="num">${u.petals}/8</b>بتلات</button><button type="button" data-go="c.wallet"><b class="num">${money(u.wallet)}</b>رصيد</button><button type="button" data-a="tab" data-to="c.bookings"><b class="num">${visits}</b>زيارات</button></div></div>
        <div class="sec"><div class="menu">${easyRow}</div></div>
        <div class="sec"><div class="menu">
          ${item('c.wallet', 'wallet', 'rose', 'محفظتي', money(u.wallet) + ' دينار')}
          ${item('c.share', 'share', 'plum', 'شاركي واربحي', 'رابطچ وصديقاتچ')}
          ${item('c.saved', 'save', 'amber', 'المحفوظات وألبوم أفكاري', '')}
          ${item('c.notifset', 'bell', 'sky', 'الإشعارات واهتماماتي', '')}
          ${item('a:allergy', 'alert', 'warn', 'حساسيتي', esc(u.allergy || 'ما مسجلة'))}
          ${item('c.bride', 'crown', 'gold', 'خطة العروس', S.wedding ? 'عرسچ ' + dateLong(S.wedding) : 'خططي جلساتچ')}
        </div></div>
        <div class="sec"><div class="menu">
          ${item('c.privacy', 'lock', 'teal', 'خصوصيتي وصوري', 'موافقات الصور وبياناتي')}
          ${item('c.help', 'help', 'sky', 'مساعدة وشكوى', 'نرد بنفس اليوم')}
          ${item('a:langSheet', 'globe', 'mint', 'اللغة', 'عربي')}
          ${item('a:logout', 'logout', 'err', 'تسجيل الخروج', '')}
        </div></div>
        <p class="tip" style="justify-content:center;margin-top:16px">${rose()}صالوناتي · نموذج تجريبي للعرض</p>`
    };
  };
  A.easyTog = () => { App.Style.set('easy', !App.Style.get('easy')); App.refresh(); };
  A.editName = () => App.sheet(`<h2>عدلي اسمچ</h2><div class="field"><label for="nm2">الاسم الأول</label><input class="inp" id="nm2" value="${esc(S.user.name)}" maxlength="30"></div><button type="button" class="btn block lg" data-a="saveName">${ic('check')}احفظي</button>`, { label: 'تعديل الاسم' });
  A.saveName = () => { const v = ($('#nm2') || {}).value; if (v && v.trim()) S.user.name = v.trim(); App.save(); App.closeSheet(true); App.refresh(); };
  A.allergy = () => App.sheet(`<h2>${ic('alert')} حساسيتي</h2><p class="m" style="margin:0">توصل للموظفة قبل الصبغة أو أي مادة. ما تدخل بالعروض أبداً.</p>
    <div class="chips" style="padding:0">${['الأمونيا', 'الحنة السوداء', 'العطور', 'اللاتكس', 'ماكو حساسية'].map((x) => `<button type="button" class="chip" data-a="allergyPick" data-v="${x}">${x}</button>`).join('')}</div>
    <textarea class="inp" id="alg" maxlength="120">${esc(S.user.allergy || '')}</textarea><button type="button" class="btn block lg" data-a="allergySave">${ic('check')}احفظي</button>`, { label: 'الحساسية'});
  A.allergyPick = (el, d) => { const t = $('#alg'); t.value = d.v === 'ماكو حساسية' ? '' : 'تحسس من ' + d.v; };
  A.allergySave = () => { S.user.allergy = ($('#alg') || {}).value || ''; App.save(); App.closeSheet(true); App.refresh(); App.toast('انحفظت', { icon: 'check', tone: 'ok' }); };
  A.langSheet = () => App.sheet(`<h2>${ic('globe')} اللغة</h2><div class="pay">${[['عربي', 'العراقية', true], ['کوردی', 'قريباً بإقليم كردستان', false], ['English', 'قريباً', false]].map((x) => `<button type="button" class="opt" ${x[2] ? '' : 'aria-disabled="true"'} aria-pressed="${x[2]}" data-a="langPick" data-on="${x[2] ? 1 : ''}"><span class="tx"><b>${x[0]}</b><span class="m">${x[1]}</span></span><span class="radio"></span></button>`).join('')}</div>`, { label: 'اللغة' });
  A.langPick = (el, d) => { if (!d.on) App.toast('الواجهة الكردية قريباً', { icon: 'globe' }); else App.closeSheet(); };
  A.logout = () => App.confirmBox({ icon: 'logout', tone: 'err', title: 'تطلعين من حسابچ؟', text: 'مواعيدچ وبتلاتچ تبقى محفوظة برقمچ، وتقدرين تتصفحين بدون حساب', ok: 'إي، اطلعي', danger: true, onOk: () => { S.user.registered = false; App.save(); App.tabTo('c.home'); App.toast('طلعتي من حسابچ', { icon: 'logout' }); } });
  A.areaSheet = () => App.sheet(`<h2>${ic('pin')} وين أنتي هسة؟</h2><div class="areas">${AREAS.map((a) => `<button type="button" data-a="areaPick" data-v="${a.id}" aria-pressed="${S.user.area === a.id}">${a.n}</button>`).join('')}</div><button type="button" class="btn soft block" data-a="locYes">${ic('locate')}استخدمي موقعي</button>`, { label: 'المنطقة'});
  A.areaPick = (el, d) => { S.user.area = d.v; App.save(); App.closeSheet(true); App.refresh(); };

  SC['c.wallet'] = () => {
    if (!S.user.registered) return { title: 'محفظتي', body: App.guestPrompt('wallet', 'محفظتچ', 'العربون اللي يرجع ورصيد صديقاتچ ينحفظ هنا بعد ما تسجلين') };
    const log = S.user.log || [];
    const rows = log.concat(S.referrals.filter((r) => r.st === 'attended').map((r) => ({ n: `${r.n} حضرت موعدها`, a: r.credit, t: App.now() - 3 * DAY })));
    return {
      title: 'محفظتي', 
      body: `<div class="sec" style="margin-top:0"><div class="wallet-card">${rose()}<span class="m">رصيدچ</span><span class="amt num">${money(S.user.wallet)} د.ع</span><span class="m">يخصم من العربون والمنتجات · ما ينصرف كاش</span></div></div>
        <div class="sec"><div class="sec-h"><h2>${ic('list')}الحركات</h2></div>${rows.length ? `<div class="list">${rows.map((x) => `<div class="li">${icb(x.a > 0 ? 'plus' : 'minus', x.a > 0 ? 'ok' : 'rose', 'sm')}<span class="tx"><b>${esc(x.n)}</b><span class="m">${ago(x.t)}</span></span><b class="num" style="color:${x.a > 0 ? 'var(--ok)' : 'var(--ink)'}">${x.a > 0 ? '+' : '−'}${money(Math.abs(x.a))}</b></div>`).join('')}</div>` : emptyState({ icon: 'wallet', tone: 'rose', title: 'ماكو حركات', text: 'لما تربحين أو تستخدمين رصيد يظهر هنا' })}</div>
        <div class="sec"><div class="rule info">${ic('clock')}<span>رصيد الإحالات ينتهي بعد 60 يوم من ربحه</span></div></div>`
    };
  };

  SC['c.saved'] = (p) => {
    const tab = p.tab || 'ideas';
    const ideas = App.reelsAll().filter((r) => S.saves[r.id]), favs = SALONS.filter((s) => S.favs[s.id]);
    return {
      title: 'المحفوظات', 
      body: `<div class="sec" style="margin-top:0"><div class="seg" role="group"><button type="button" data-a="svTab" data-v="ideas" aria-pressed="${tab === 'ideas'}">${ic('image')}ألبوم أفكاري</button><button type="button" data-a="svTab" data-v="favs" aria-pressed="${tab === 'favs'}">${ic('heart')}صالونات</button></div></div>
        <div class="sec">${tab === 'ideas' ? (ideas.length ? `<div class="gal">${ideas.map((r) => `<button type="button" data-go="c.stories" data-s="${r.s}" data-r="${r.id}" aria-label="${esc(r.cap)}">${img(r.v)}<span class="frame"></span><span class="tagline">${rose()}${svc(r.svc).n}</span></button>`).join('')}</div><p class="tip">${ic('info')}تكدرين تختارين أي صورة من هنا ترسلينها للموظفة وقت الحجز</p>`
          : emptyState({ icon: 'save', tone: 'amber', title: 'الألبوم فارغ', text: 'احفظي الريلز اللي تعجبچ وتلقينها هنا', action: '<button type="button" class="btn" data-a="tab" data-to="c.reels">شوفي الريلز</button>' }))
          : (favs.length ? `<div class="list">${favs.map((s) => App.salonCard(s)).join('')}</div>` : emptyState({ icon: 'heart', tone: 'rose', title: 'ما حفظتي صالونات', text: 'اضغطي القلب بصفحة أي صالون' }))}</div>`
    };
  };
  A.svTab = (el, d) => { App.cur().p.tab = d.v; App.refresh(); };

  /* ---------- privacy and consent ---------- */
  SC['c.privacy'] = () => {
    if (!S.user.registered) return { title: 'خصوصيتي وصوري', body: App.guestPrompt('lock', 'صورچ بيدچ', 'إذا طلب صالون ينشر صورة تبينين بيها، الطلب يوصلچ هنا وما ينشر بدون موافقتچ') };
    const pend = S.consents.filter((c) => c.on === null), rest = S.consents.filter((c) => c.on !== null);
    return {
      title: 'خصوصيتي وصوري', 
      body: `<div class="sec" style="margin-top:0"><div class="rule ok">${ic('shield')}<span>الصالون ما يكدر ينشر صورة تبينين بيها بدون موافقتچ من موبايلچ، والتطبيق يمنع تنزيل الصور.</span></div></div>
        ${pend.length ? `<div class="sec"><div class="sec-h"><h2>${ic('camera')}تنتظر موافقتچ</h2></div>${pend.map((c) => { const post = S.posts.find((x) => x.id === c.post); return `<div class="card hl"><div class="row start">${post ? img(post.v, 'sq') : icb('image', 'plum')}<span class="tx"><b>${salon(c.s).n}</b><span class="m">${esc(c.what)}</span></span></div>
          <div class="btnrow"><button type="button" class="btn ok" data-a="cAns" data-id="${c.id}" data-v="yes">${ic('check')}أوافق</button><button type="button" class="btn plain" data-a="cAns" data-id="${c.id}" data-v="no">${ic('close')}لا</button></div></div>`; }).join('')}</div>` : ''}
        <div class="sec"><div class="sec-h"><h2>${ic('image')}صور وافقتي عليها</h2></div>${rest.length ? `<div class="menu">${rest.map((c) => `<div>${icb('image', 'plum', 'sm')}<span class="tx"><b>${salon(c.s).n}</b><span class="m">${esc(c.what)}</span></span>${sw(c.on, 'cTog', 'الموافقة', `data-id="${c.id}"`)}</div>`).join('')}</div>` : emptyState({ icon: 'image', tone: 'muted', title: 'ماكو صور', text: 'إذا طلب صالون موافقتچ تظهر هنا' })}
          <p class="tip">${ic('info')}إذا سحبتي الموافقة ينزل المنشور خلال ساعة ويتعطل رابطه</p></div>
        <div class="sec"><div class="menu">
          <button type="button" data-go="c.notifset">${icb('sparkle', 'gold', 'sm')}<span class="tx"><b>اهتماماتي</b><span class="m">شوفيها أو امسحيها</span></span><span class="chev">${ic('chev-l')}</span></button>
          <button type="button" data-a="dataCopy">${icb('doc', 'sky', 'sm')}<span class="tx"><b>نسخة من بياناتي</b><span class="m">توصلچ برسالة</span></span><span class="chev">${ic('chev-l')}</span></button>
          <button type="button" data-a="delAcc">${icb('trash', 'err', 'sm')}<span class="tx"><b>احذفي حسابي</b><span class="m">يمسح كل شي خلال 30 يوم</span></span><span class="chev">${ic('chev-l')}</span></button>
        </div></div>`
    };
  };
  A.cAns = (el, d) => {
    const c = S.consents.find((x) => x.id === d.id); c.on = d.v === 'yes';
    const post = S.posts.find((x) => x.id === c.post); if (post) post.consent = c.on ? 'yes' : 'no';
    App.notify({ role: 'salon', icon: c.on ? 'check' : 'close', tone: c.on ? 'ok' : 'err', title: c.on ? 'الزبونة وافقت على الصورة' : 'الزبونة ما وافقت على الصورة', text: c.what, to: 's.posts' });
    App.save(); App.refresh();
  };
  A.cTog = (el, d) => { const c = S.consents.find((x) => x.id === d.id); c.on = !c.on; App.save(); App.refresh(); App.toast(c.on ? 'رجعتي الموافقة' : 'سحبتي الموافقة، المنشور ينزل', { icon: 'shield', tone: 'ok' }); };
  A.dataCopy = () => App.toast('راح توصلچ نسخة من بياناتچ برسالة', { icon: 'doc', tone: 'ok' });
  A.delAcc = () => App.confirmBox({ icon: 'trash', tone: 'err', title: 'تحذفين حسابچ؟', text: 'تنمسح مواعيدچ وبتلاتچ ورصيدچ خلال 30 يوم. تكدرين ترجعين خلالها', ok: 'إي، احذفيه', danger: true, onOk: () => App.toast('انطلب حذف الحساب', { icon: 'trash' }) });

  /* ---------- help and complaints ---------- */
  SC['c.help'] = (p) => {
    if (!p._init) { p._init = true; p.issue = ''; p.txt = ''; p.photos = []; p.secret = false; p.bk = p.b || ''; }
    const recent = App.mine().filter((b) => ['done', 'rated', 'missed', 'arrived', 'inservice'].includes(App.phase(b))).slice(-3).reverse();
    const harm = p.issue === 'harm';
    return {
      title: 'مساعدة وشكوى', 
      body: `<div class="sec" style="margin-top:0">
        ${recent.length ? `<span class="lbl">${ic('cal')}أي زيارة؟</span><div class="list">${recent.map((b) => `<button type="button" class="opt" data-a="hSet" data-k="bk" data-v="${b.id}" aria-pressed="${p.bk === b.id}">${img(salon(b.s).cover, 'sq')}<span class="tx"><b>${salon(b.s).n}</b><span class="m">${itemsText(b)} · ${dayLabel(b.at)}</span></span><span class="radio"></span></button>`).join('')}</div>` : ''}
        <span class="lbl">${ic('flag')}شنو المشكلة؟</span>
        <div class="issue-grid">${ISSUES.map((x) => `<button type="button" data-a="hSet" data-k="issue" data-v="${x.id}" aria-pressed="${p.issue === x.id}">${icb(x.icon, x.id === 'harm' ? 'err' : 'rose', 'sm')}${x.n}</button>`).join('')}</div>
        ${harm ? `<div class="rule err">${ic('alert')}<span>إذا صار ضرر صحي راجعي أقرب مستشفى. نوقف الخدمة بالصالون فوراً لحد ما نتأكد، ونوجهچ لوزارة الصحة.</span></div>` : ''}
        <div class="field"><label for="htx">${ic('chat')}احچيلنا (اختياري)</label><textarea class="inp" id="htx" data-in="hTxt" maxlength="500">${esc(p.txt)}</textarea></div>
        <label class="upload-box">${icb('camera', 'plum')}<b>أضيفي صور (اختياري)</b><span class="m">الفاتورة أو المشكلة. ما يشوفها الصالون</span><input type="file" accept="image/*" multiple data-ch="hPhotos" aria-label="أضيفي صور"></label>
        ${p.photos.length ? `<div class="thumbs">${p.photos.map((u) => `<img src="${u}" alt="صورة مرفقة">`).join('')}</div>` : ''}
        <div class="li">${icb('lock', 'teal', 'sm')}<span class="tx"><b>شكوى سرية</b><span class="m">اسمچ ما يوصل للصالون</span></span>${sw(p.secret, 'hSecret', 'شكوى سرية')}</div>
      </div>
      <div class="sec"><div class="sec-h"><h2>${ic('help')}أسئلة متكررة</h2></div><div class="menu">${[['شلون ألغي موعدي؟', 'من مواعيدي، لحد ساعة قبل الموعد'], ['وين يروح العربون؟', 'يخصم من الفاتورة، ويرجع لمحفظتچ إذا لغيتي بالوقت'], ['شنو يعني موثّق؟', 'زرنا الصالون وشفنا الرخصة والنظافة، ونجدد الفحص كل سنة']].map((q) => `<div><span class="tx"><b>${q[0]}</b><span class="m">${q[1]}</span></span></div>`).join('')}</div></div>`,
      bar: `<button type="button" class="btn block lg" data-a="hSend" ${p.issue ? '' : 'disabled'}>${ic('flag')}أرسلي</button>`
    };
  };
  A.hSet = (el, d) => { App.cur().p[d.k] = d.v; App.refresh(); };
  A.hTxt = (el) => { App.cur().p.txt = el.value; };
  A.hSecret = () => { const p = App.cur().p; p.secret = !p.secret; App.refresh(); };
  A.hPhotos = (el) => { const p = App.cur().p; Array.from(el.files || []).slice(0, 4).forEach((f) => p.photos.push(URL.createObjectURL(f))); App.refresh(); };
  A.hSend = () => {
    if (!App.requireAuth('')) return;
    const p = App.cur().p, b = S.bookings.find((x) => x.id === p.bk), iss = ISSUES.find((x) => x.id === p.issue);
    const id = 'C-' + String(Date.now()).slice(-5);
    S.complaints.unshift({ id, s: b ? b.s : null, issue: p.issue, n: iss.n, text: p.txt, photos: p.photos.length, secret: p.secret, cust: p.secret ? 'سري' : S.user.name, t: App.now(), status: 'open', urgent: p.issue === 'harm' });
    App.notify({ role: 'admin', icon: p.issue === 'harm' ? 'alert' : 'flag', tone: p.issue === 'harm' ? 'err' : 'warn', title: p.issue === 'harm' ? 'شكوى ضرر صحي · عاجل' : 'شكوى جديدة', text: `${iss.n}${b ? ' · ' + salon(b.s).n : ''}`, to: 'a.complaints' });
    App.save();
    App.replace('c.helpDone', { id, harm: p.issue === 'harm' ? '1' : '' });
  };
  SC['c.helpDone'] = (p) => ({
    head: '', 
    body: `<div class="done-hero"><span class="bigcheck">${ic('check')}</span><h1 tabindex="-1">وصلت شكوتچ</h1><p class="m" style="margin:0">رقمها <b class="num" dir="ltr">${p.id}</b>. نرد عليچ بنفس اليوم برسالة</p></div>
      <div class="sec"><div class="tl"><div class="tl-i done"><span class="tl-dot">${ic('check')}</span><span class="tx"><b>استلمناها</b></span></div><div class="tl-i now"><span class="tl-dot">${ic('users')}</span><span class="tx"><b>فريقنا يراجعها</b><span class="m">${p.harm ? 'أوقفنا الخدمة مؤقتاً لحد ما نتأكد' : 'نتواصل ويا الصالون'}</span></span></div><div class="tl-i"><span class="tl-dot">${ic('chat')}</span><span class="tx"><b>نرد عليچ بالحل</b></span></div></div></div>
      <div class="sec"><button type="button" class="btn block lg" data-a="home">رجوع للرئيسية</button></div>`
  });

  /* ---------- bride planner ---------- */
  SC['c.bride'] = () => {
    const w = S.wedding, s5 = salon(5);
    if (!w) return {
      title: 'خطة العروس', 
      body: `<div class="done-hero">${icb('crown', 'gold', 'xl')}<h1 tabindex="-1">مبروك يا عروس</h1><p class="m" style="margin:0">اختاري تاريخ العرس ونرتبلچ الجلسات من التجربة لحد اليوم الكبير</p></div>
        <div class="sec"><div class="field"><label for="wd">${ic('cal')}تاريخ العرس</label><input class="inp" type="date" id="wd" min="${new Date(App.now() + 7 * DAY).toISOString().slice(0, 10)}"></div>
          <div class="chips" style="padding:0">${[30, 60, 90].map((d) => `<button type="button" class="chip" data-a="wQuick" data-d="${d}">بعد ${d} يوم</button>`).join('')}</div></div>`,
      bar: `<button type="button" class="btn block lg" data-a="wSet">${ic('check')}رتبيلي الخطة</button>`
    };
    const days = Math.max(0, Math.ceil((w - App.now()) / DAY));
    const plan = [[-45, 'brtrial', 'تجربة المكياج والتسريحة', 'crown'], [-21, 'facial', 'تنظيف بشرة', 'drop'], [-7, 'mask', 'ماسك ترطيب', 'leaf'], [-2, 'henna', 'ليلة الحنة', 'henna'], [-1, 'gel', 'أظافر', 'nail'], [0, 'bridepk', 'يوم العرس: مكياج وتسريحة', 'ring']];
    return {
      title: 'خطة العروس', sub: dateLong(w), 
      body: `<div class="sec" style="margin-top:0"><div class="countdown num"><div><b>${days}</b><span class="m">يوم</span></div><div><b>${Math.floor(days / 7)}</b><span class="m">أسبوع</span></div><div><b>${plan.filter((x) => days + x[0] >= 0).length}</b><span class="m">جلسات</span></div></div></div>
        <div class="sec"><div class="tl">${plan.map((x) => { const dt = w + x[0] * DAY, past = dt < App.now(); return `<div class="tl-i ${past ? 'done' : ''}"><span class="tl-dot">${ic(x[3])}</span><span class="tx"><b>${x[2]}</b><span class="m">${x[0] === 0 ? 'يوم العرس' : dateLong(dt)} · ${s5.n}</span>${past ? '' : `<button type="button" class="btn xs soft" style="justify-self:start;margin-top:4px" data-go="c.salon" data-id="5" data-svc="${x[1]}">احجزي</button>`}</span></div>`; }).join('')}</div></div>
        <div class="sec"><div class="card gold"><div class="row start">${icb('doc', 'gold')}<span class="tx"><b>عقد مكتوب للباقة</b><span class="m">العربون 30٪، والمبلغ يبقى محفوظ ويتحول للصالون جلسة بجلسة بعد مسح الرمز</span></span></div></div>
          <button type="button" class="btn ghost block" data-a="wReset">${ic('edit')}غيّري التاريخ</button></div>`
    };
  };
  A.wQuick = (el, d) => { const t = new Date(App.now() + (+d.d) * DAY); $('#wd').value = t.toISOString().slice(0, 10); };
  A.wSet = () => { const v = ($('#wd') || {}).value; if (!v) { App.toast('اختاري التاريخ أول', { icon: 'cal', tone: 'err' }); return; } S.wedding = new Date(v + 'T18:00').getTime(); App.learn('عرائس', 3); App.save(); App.refresh(); };
  A.wReset = () => { S.wedding = null; App.save(); App.refresh(); };
})();
