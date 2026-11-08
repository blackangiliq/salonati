/* Style studio: lets a client try every look (palette, light/dark, icons, fonts, corners, cards, navigation, text size,
   easy mode, voice) and jump to any screen or moment of the booking lifecycle. Choices persist per browser. */
(function () {
  'use strict';
  const KEY = 'salonati.style';
  const DEF = { pal: 'rumman', custom: '#7A2E73', mode: 'light', icons: 'line', font: 'plex', logo: 'ruqaa', radius: 'soft', size: 'm', cards: 'flat', nav: 'labels', easy: false, motion: 'on', frame: 'iphone', tab: 'style' };
  let st = Object.assign({}, DEF);
  try { const raw = localStorage.getItem(KEY); if (raw) st = Object.assign({}, DEF, JSON.parse(raw)); } catch (e) { /* storage blocked */ }

  const SEM_L = { ok: '#0B6E66', okTint: '#DCF1EE', warn: '#8A5A00', warnTint: '#FFF0D2', err: '#B3261E', errTint: '#FCE4E2', surf: '#FFFFFF', road: '#FFFFFF', park: '#E4F0E2', river: '#CFE6EE' };
  const SEM_D = { ok: '#55D6C2', okTint: '#123430', warn: '#E5B95C', warnTint: '#3A2C12', err: '#FF8A80', errTint: '#3D1714' };
  const PALS = {
    rumman: { n: 'رمّان وذهب', note: 'المعتمد بالخطة',
      L: { bg: '#FFF8FA', surf2: '#FBEEF2', ink: '#2B0F1B', muted: '#6F5560', line: '#F0DEE4', pri: '#A50F45', onPri: '#FFFFFF', pri2: '#F47C9F', tint: '#FCE7EE', deep: '#6E0A30', gold: '#D9A441', goldInk: '#2B0F1B', goldText: '#8A5E10', goldTint: '#FBF0DA', sh: '43 15 27', land: '#FBF1F4' },
      D: { bg: '#1B0C13', surf: '#2A141E', surf2: '#331A26', ink: '#FBEFF3', muted: '#C4A9B4', line: '#40252F', pri: '#F47C9F', onPri: '#2B0F1B', pri2: '#A50F45', tint: '#3E1D2B', deep: '#5A0A28', gold: '#E5B95C', goldInk: '#2B0F1B', goldText: '#E8BE68', goldTint: '#3A2C12', sh: '0 0 0', land: '#241019', road: '#3A212C', river: '#1E3A4A', park: '#1E3324' } },
    jouri: { n: 'ورد جوري', note: 'أخف وأقرب للبنات الصغار',
      L: { bg: '#FFF9FB', surf2: '#FDEFF5', ink: '#33101F', muted: '#775663', line: '#F6DFE8', pri: '#C2255F', onPri: '#FFFFFF', pri2: '#F58AB4', tint: '#FFE8F1', deep: '#7D1540', gold: '#E0AE52', goldInk: '#33101F', goldText: '#8A5E10', goldTint: '#FCF1DC', sh: '51 16 31', land: '#FCF1F5' },
      D: { bg: '#1E0C14', surf: '#2D131F', surf2: '#36182A', ink: '#FFF0F5', muted: '#CDAEBB', line: '#472635', pri: '#F58AB4', onPri: '#33101F', pri2: '#C2255F', tint: '#451C2F', deep: '#5E0F30', gold: '#E8BE68', goldInk: '#33101F', goldText: '#E8BE68', goldTint: '#3A2C12', sh: '0 0 0', land: '#25101A', road: '#3D2230', river: '#1E3A4A', park: '#1E3324' } },
    lazurd: { n: 'لازورد بابل', note: 'أزرق بوابة عشتار',
      L: { bg: '#F9FAFE', surf2: '#EEF2FB', ink: '#0F1B33', muted: '#55607A', line: '#E0E6F2', pri: '#17408B', onPri: '#FFFFFF', pri2: '#8EB0F5', tint: '#E6ECF9', deep: '#0E2A5E', gold: '#D1A03C', goldInk: '#0F1B33', goldText: '#7F5F12', goldTint: '#FBF2DE', sh: '15 27 51', land: '#EFF3FA' },
      D: { bg: '#0C1424', surf: '#162138', surf2: '#1B2842', ink: '#EEF3FF', muted: '#A9B6D0', line: '#26365A', pri: '#8EB0F5', onPri: '#0F1B33', pri2: '#17408B', tint: '#1E2F50', deep: '#0A1E46', gold: '#E2BA62', goldInk: '#0F1B33', goldText: '#E2BA62', goldTint: '#33290F', sh: '0 0 0', land: '#111C30', road: '#22304B', river: '#1C3A5A', park: '#17302A' } },
    tamr: { n: 'تمر وحنة', note: 'دافئ وتراثي',
      L: { bg: '#FFFBF6', surf2: '#FAF1E8', ink: '#2A1A10', muted: '#6F5A4B', line: '#EEDFD2', pri: '#8A4B1F', onPri: '#FFFFFF', pri2: '#D89A62', tint: '#F6E9DD', deep: '#5A2E10', gold: '#C9962E', goldInk: '#2A1A10', goldText: '#7A5410', goldTint: '#F9EED5', sh: '42 26 16', land: '#F7EFE6' },
      D: { bg: '#16100B', surf: '#221912', surf2: '#2A1F16', ink: '#FBF1E8', muted: '#C8B3A2', line: '#3D2C1F', pri: '#E0A06A', onPri: '#2A1A10', pri2: '#8A4B1F', tint: '#3A2618', deep: '#4A2A12', gold: '#E2B45A', goldInk: '#2A1A10', goldText: '#E2B45A', goldTint: '#36280F', sh: '0 0 0', land: '#1E1610', road: '#33261B', river: '#1E3440', park: '#1F2E1B' } },
    nakheel: { n: 'نخيل', note: 'أخضر هادئ وطبيعي',
      L: { bg: '#F8FCFA', surf2: '#EEF6F2', ink: '#10241C', muted: '#4F6A5F', line: '#DCEAE3', pri: '#1F6B4F', onPri: '#FFFFFF', pri2: '#7CCBA8', tint: '#E3F1EA', deep: '#0F3F2E', gold: '#C9962E', goldInk: '#10241C', goldText: '#7A5410', goldTint: '#F8EFD7', sh: '16 36 28', land: '#EEF5F1' },
      D: { bg: '#0B1612', surf: '#13221C', surf2: '#182B23', ink: '#EAF6F0', muted: '#A6C2B6', line: '#22392F', pri: '#7CCBA8', onPri: '#0B1E16', pri2: '#1F6B4F', tint: '#1B3A2D', deep: '#0A3324', gold: '#E2B45A', goldInk: '#10241C', goldText: '#E2B45A', goldTint: '#33290F', sh: '0 0 0', land: '#0F1D18', road: '#1F3029', river: '#1B3A48', park: '#183324' } },
    lulu: { n: 'لؤلؤ وأسود', note: 'فخم وبسيط',
      L: { bg: '#FCFBFA', surf2: '#F6F2EF', ink: '#1B1B1D', muted: '#66615E', line: '#E9E4E0', pri: '#232326', onPri: '#FFFFFF', pri2: '#C9956B', tint: '#F1ECE8', deep: '#111113', gold: '#C9956B', goldInk: '#1B1B1D', goldText: '#8A5A35', goldTint: '#F7EDE4', sh: '20 20 22', land: '#F3F1EF' },
      D: { bg: '#111113', surf: '#1B1B1E', surf2: '#232327', ink: '#F4F1EE', muted: '#B7AFA9', line: '#2F2C2A', pri: '#E9C7A6', onPri: '#1B1B1D', pri2: '#C9956B', tint: '#2E2A27', deep: '#000000', gold: '#D9A97C', goldInk: '#1B1B1D', goldText: '#D9A97C', goldTint: '#2E241B', sh: '0 0 0', land: '#18181A', road: '#2A2A2E', river: '#1F2F38', park: '#1C2A20' } }
  };
  const FONTS = { plex: ['IBM Plex Sans Arabic', 'بلكس'], tajawal: ['Tajawal', 'تجوال'], cairo: ['Cairo', 'القاهرة'], almarai: ['Almarai', 'المراعي'], kufi: ['Noto Kufi Arabic', 'نوتو كوفي'], readex: ['Readex Pro', 'ريدكس'] };
  const LOGOS = { ruqaa: ['Aref Ruqaa', 'رقعة'], kufi: ['Reem Kufi', 'كوفي'], naskh: ['Amiri', 'نسخ'] };
  const RADII = { sharp: [8, 6, 12, 'حادة'], soft: [16, 12, 24, 'ناعمة'], round: [24, 18, 32, 'دائرية'] };
  const SIZES = { s: [15, 'صغير'], m: [16, 'عادي'], l: [18, 'كبير'], xl: [20, 'كبير جداً'] };
  const ICONS = { line: 'خطية', bold: 'عريضة', duo: 'ثنائية اللون', badge: 'شارات ملوّنة', emoji: 'إيموجي' };
  const CARDS = { flat: 'بحدود', raised: 'بظل', tinted: 'ملوّنة' };
  const NAVS = { labels: 'أيقونة ونص', big: 'أيقونات كبيرة', float: 'عائم' };
  const FRAMES = { iphone: 'آيفون', android: 'أندرويد', none: 'بدون إطار' };
  const PRESETS = [
    { n: 'الأنيق', d: 'المعتمد', v: { pal: 'rumman', icons: 'line', font: 'plex', logo: 'ruqaa', radius: 'soft', cards: 'flat', nav: 'labels', size: 'm', easy: false } },
    { n: 'سهل جداً', d: 'لمن ما تقرا', v: { pal: 'rumman', icons: 'badge', font: 'almarai', logo: 'ruqaa', radius: 'round', cards: 'raised', nav: 'big', size: 'l', easy: true } },
    { n: 'إيموجي', d: 'مفهوم للكل', v: { pal: 'jouri', icons: 'emoji', font: 'tajawal', logo: 'ruqaa', radius: 'round', cards: 'tinted', nav: 'big', size: 'l', easy: false } },
    { n: 'العصري', d: 'فخم وهادئ', v: { pal: 'lulu', icons: 'duo', font: 'readex', logo: 'kufi', radius: 'sharp', cards: 'tinted', nav: 'float', size: 'm', easy: false } },
    { n: 'التراثي', d: 'بابلي', v: { pal: 'lazurd', icons: 'bold', font: 'kufi', logo: 'naskh', radius: 'soft', cards: 'raised', nav: 'labels', size: 'm', easy: false } }
  ];

  /* ---------- color math for the custom palette and contrast checks ---------- */
  const hex2rgb = (h) => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16)); };
  const lum = (h) => { const c = hex2rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  function hexToHsl(hex) {
    let [r, g, b] = hex2rgb(hex).map((v) => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    return [h, s * 100, l * 100];
  }
  function hsl(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
    return '#' + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  function customPal(hex) {
    const [H, Sa, Li] = hexToHsl(hex), sat = Math.min(Sa, 75);
    const onL = ratio(hex, '#FFFFFF') >= 4.5 ? '#FFFFFF' : hsl(H, 45, 10);
    return { n: 'لونچ الخاص', note: hex,
      L: { bg: hsl(H, Math.min(sat, 60), 98.5), surf2: hsl(H, 45, 95.5), ink: hsl(H, 45, 12), muted: hsl(H, 14, 38), line: hsl(H, 35, 90), pri: hex, onPri: onL, pri2: hsl(H, sat, 72), tint: hsl(H, Math.min(sat, 70), 93.5), deep: hsl(H, Sa, Math.max(Li - 18, 14)), gold: '#D9A441', goldInk: '#2B0F1B', goldText: '#8A5E10', goldTint: '#FBF0DA', sh: '30 20 25', land: hsl(H, 30, 95) },
      D: { bg: hsl(H, 35, 7), surf: hsl(H, 30, 11), surf2: hsl(H, 28, 14), ink: hsl(H, 40, 96), muted: hsl(H, 15, 72), line: hsl(H, 22, 20), pri: hsl(H, Math.min(Sa, 80), 72), onPri: hsl(H, 45, 12), pri2: hex, tint: hsl(H, 35, 20), deep: hsl(H, Sa, 18), gold: '#E5B95C', goldInk: '#2B0F1B', goldText: '#E8BE68', goldTint: '#3A2C12', sh: '0 0 0', land: hsl(H, 25, 10), road: hsl(H, 18, 18), river: '#1E3A4A', park: '#1E3324' } };
  }
  const pal = () => (st.pal === 'custom' ? customPal(st.custom) : PALS[st.pal] || PALS.rumman);
  function effMode() {
    if (st.mode !== 'auto') return st.mode;
    const t = document.documentElement.getAttribute('data-theme');
    if (t === 'dark' || t === 'light') return t;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function apply() {
    const app = $('#app');
    if (!app) return;
    const mode = effMode(), P = pal(), c = Object.assign({}, mode === 'dark' ? SEM_D : SEM_L, mode === 'dark' ? P.D : P.L);
    if (mode !== 'dark' && !c.surf) c.surf = '#FFFFFF';
    const map = { bg: '--bg', surf: '--surf', surf2: '--surf2', ink: '--ink', muted: '--muted', line: '--line', pri: '--pri', onPri: '--on-pri', pri2: '--pri-2', tint: '--tint', deep: '--deep', gold: '--gold', goldInk: '--gold-ink', goldText: '--gold-text', goldTint: '--gold-tint', ok: '--ok', okTint: '--ok-tint', warn: '--warn', warnTint: '--warn-tint', err: '--err', errTint: '--err-tint', sh: '--sh', land: '--map-land', road: '--map-road', river: '--map-river', park: '--map-park' };
    Object.keys(map).forEach((k) => { if (c[k] != null) app.style.setProperty(map[k], c[k]); });
    if (mode !== 'dark') { app.style.setProperty('--t-rose', c.pri); app.style.setProperty('--t-rose-bg', c.tint); }
    else { app.style.removeProperty('--t-rose'); app.style.removeProperty('--t-rose-bg'); }
    const rr = RADII[st.radius] || RADII.soft;
    app.style.setProperty('--r', rr[0] + 'px'); app.style.setProperty('--r-sm', rr[1] + 'px'); app.style.setProperty('--r-lg', rr[2] + 'px');
    app.style.setProperty('--fs', ((SIZES[st.size] || SIZES.m)[0] + (st.easy ? 2 : 0)) + 'px');
    app.style.setProperty('--f-body', `"${(FONTS[st.font] || FONTS.plex)[0]}", "Segoe UI", Tahoma, sans-serif`);
    app.style.setProperty('--f-display', `"${(LOGOS[st.logo] || LOGOS.ruqaa)[0]}", "Traditional Arabic", serif`);
    app.dataset.mode = mode; app.dataset.icons = st.icons; app.dataset.cards = st.cards; app.dataset.nav = st.nav; app.dataset.motion = st.motion;
    app.classList.toggle('easy', !!st.easy);
    const screen = $('#screen'); if (screen) screen.style.background = c.bg;
    const dev = $('#device'); if (dev) { dev.dataset.frame = st.frame; App.fitDevice && App.fitDevice(); }
    const root = document.documentElement.style;
    root.setProperty('--pg-accent', P.L.pri); root.setProperty('--pg-on', P.L.onPri);
    const tab = $('#studioTab'); if (tab) { tab.style.background = c.pri; tab.style.color = c.onPri; }
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = mode === 'dark' ? c.bg : P.L.pri;
    document.documentElement.style.setProperty('--pg-accent-d', P.D.pri);
  }

  const Style = (App.Style = {
    get: (k) => st[k],
    set(k, v) { st[k] = v; persist(); apply(); App.refresh && App.cur && App.cur() && App.refresh(); render(); },
    init() { apply(); window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (st.mode === 'auto') { apply(); App.refresh(); } }); },
    sync: () => render(),
    apply
  });
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* storage blocked */ } }

  /* ---------- screen map: every screen of the three roles ---------- */
  function ensureDraft() {
    if (!S.draft || !S.draft.items.length) App.draftNew(0, [{ svc: 'blow', len: 'm' }]);
    if (!S.draft.ts) { const f = App.slotsFor(S.draft.s, 0, -1).find((x) => !x.dis) || App.slotsFor(S.draft.s, 1, -1).find((x) => !x.dis); if (f) { S.draft.ts = f.ts; S.draft.day = App.dayDiff ? 0 : 0; } }
    App.save();
  }
  const myNext = () => App.upcoming().find((b) => App.phase(b) !== 'done') || App.mine().find((b) => b.status === 'confirmed');
  function doneBooking() {
    let b = App.mine().find((x) => x.status === 'done' && !x.rated);
    if (!b) { b = App.mine().find((x) => x.status === 'done'); }
    return b;
  }
  const MAP = [
    { role: 'client', g: 'البداية', items: [['c.splash', 'شاشة الافتتاح'], ['c.onboard', 'التعريف (3 شاشات)', () => ({ i: '0' })], ['c.login', 'التسجيل وقت الحجز'], ['c.otp', 'رمز التأكيد'], ['c.setup', 'الاسم والمنطقة']] },
    { role: 'client', g: 'الاكتشاف', items: [['c.home', 'الرئيسية'], ['c.stories', 'الستوري', () => ({ s: '0' })], ['c.reels', 'الريلز'], ['c.browse', 'قائمة الصالونات'], ['c.browse', 'الخارطة', () => ({ view: 'map' })], ['c.salon', 'واجهة صالون', () => ({ id: '0' })], ['c.salon', 'صالون بعرض', () => ({ id: '2', svc: 'mani' })]] },
    { role: 'client', g: 'الحجز والزيارة', items: [['c.book', 'اختيار الوقت', ensureDraft], ['c.pay', 'العربون والدفع', ensureDraft], ['c.booked', 'تم الحجز', () => ({ id: (myNext() || S.bookings[0]).id })], ['c.bookings', 'مواعيدي'], ['c.ticket', 'التذكرة والرمز', () => ({ id: (myNext() || S.bookings[0]).id })], ['c.rate', 'التقييم', () => ({ id: (doneBooking() || {}).id })], ['c.receipt', 'الفاتورة', () => ({ id: (doneBooking() || {}).id })]] },
    { role: 'client', g: 'حسابي', items: [['c.notifs', 'الإشعارات'], ['c.notifset', 'إعدادات الإشعارات'], ['c.petals', 'البتلات'], ['c.share', 'شاركي واربحي'], ['c.gifts', 'الهدايا والمنتجات'], ['c.gift', 'إرسال هدية', () => ({ type: 'card', amt: '50000' })], ['c.me', 'حسابي'], ['c.wallet', 'المحفظة'], ['c.saved', 'المحفوظات'], ['c.privacy', 'الخصوصية والصور'], ['c.help', 'شكوى ومساعدة'], ['c.bride', 'خطة العروس']] },
    { role: 'salon', g: 'صاحبة الصالون', items: [['s.today', 'جدول اليوم'], ['s.scan', 'مسح الرمز'], ['s.walkin', 'زبونة بدون حجز'], ['s.booking', 'تفاصيل حجز', () => ({ id: (myNext() || S.bookings[3]).id })], ['s.checkout', 'الحساب والدفع', () => ({ id: 'b2001' })], ['s.offer', 'عرض الساعات الفارغة'], ['s.cashier', 'الصندوق'], ['s.clients', 'زبوناتي'], ['s.client', 'ملف زبونة', () => ({ name: 'سارة م.' })], ['s.more', 'المزيد'], ['s.staff', 'الموظفات'], ['s.stock', 'المخزن'], ['s.profit', 'الربح'], ['s.reports', 'التقارير'], ['s.posts', 'منشوراتي'], ['s.newpost', 'منشور جديد'], ['s.verify', 'ختم التوثيق'], ['s.steril', 'سجل التعقيم'], ['s.hours', 'الدوام'], ['s.plan', 'العضوية']] },
    { role: 'admin', g: 'الإدارة', items: [['a.dash', 'الملخص'], ['a.review', 'مراجعة المحتوى'], ['a.post', 'مراجعة منشور', () => ({ id: (S.posts.find((x) => x.status === 'pending') || S.posts[0] || {}).id })], ['a.salons', 'التوثيق'], ['a.verify', 'طلب توثيق', () => ({ id: 'v1' })], ['a.campaigns', 'الحملات'], ['a.newcamp', 'حملة جديدة'], ['a.more', 'المزيد'], ['a.disputes', 'نزاعات العربون'], ['a.complaints', 'الشكاوى'], ['a.fraud', 'الاحتيال'], ['a.ads', 'الإعلانات'], ['a.commission', 'العمولات']] }
  ];
  // Screens that only make sense with an account; jumping to them signs the demo client in (the guest switch undoes it).
  const NEEDS_ACCOUNT = ['c.pay', 'c.booked', 'c.bookings', 'c.ticket', 'c.rate', 'c.receipt', 'c.wallet', 'c.share', 'c.petals', 'c.notifs', 'c.privacy', 'c.me'];
  function jump(gi, ii) {
    const it = MAP[gi].items[ii], role = MAP[gi].role;
    if (!App.SCREENS[it[0]]) { App.toast('هالشاشة بعدها تنبني', { icon: 'info' }); return; }
    if (S.role !== role) { S.role = role; App.save(); }
    if (role === 'client' && !/^c\.(splash|onboard|login|otp|setup)$/.test(it[0])) {
      S.onboarded = true;
      if (NEEDS_ACCOUNT.includes(it[0])) S.user.registered = true;
      App.save();
    }
    const p = it[2] ? (it[2]() || {}) : {};
    const tabRoots = Object.values(App.ROLES).flatMap((r) => r.nav.map((n) => n.id));
    if (tabRoots.includes(it[0]) && !Object.keys(p).length) App.tabTo(it[0]);
    else { App.tabTo(App.ROLES[role].home); App.go(it[0], p); }
    closeMobile();
    render();
  }

  /* ---------- lifecycle time machine ---------- */
  const TM = [['قبل ساعتين', 120, 'الإلغاء متاح'], ['قبل 45 دقيقة', 45, 'الإلغاء مقفول'], ['قبل 10 دقايق', 10, 'الرمز ظاهر'], ['بعد 20 دقيقة', -20, 'فات الموعد']];
  function timeTo(mins) {
    const b = myNext();
    if (!b) { App.toast('ماكو موعد قادم. احجزي موعد أول', { icon: 'cal' }); return; }
    S.clock = (b.at - mins * 60000) - Date.now();
    App.save(); App.tickStatus(); App.refresh(); render();
    App.toast(`صار الوقت ${mins > 0 ? 'قبل الموعد بـ ' + mins : 'بعد الموعد بـ ' + (-mins)} دقيقة`, { icon: 'clock' });
  }

  /* ---------- rendering ---------- */
  const opt = (k, v, label, extra) => `<button type="button" class="st-opt" data-s="${k}" data-v="${v}" aria-pressed="${String(st[k]) === String(v)}">${extra || ''}${label}</button>`;
  const tog = (k, label, note) => `<div class="st-row"><span><b>${label}</b>${note ? `<br><span class="note" style="color:var(--pg-muted);font-size:.84em">${note}</span>` : ''}</span><button type="button" class="st-sw" role="switch" aria-checked="${!!st[k]}" data-t="${k}" aria-label="${label}"><i></i></button></div>`;
  function swatch(P) { const L = P.L; return `<span class="sw"><i style="background:${L.pri}"></i><i style="background:${L.deep}"></i><i style="background:${L.tint}"></i><i style="background:${L.gold}"></i><i style="background:${L.bg}"></i></span>`; }

  function styleTab() {
    const P = pal(), cr = ratio(P.L.pri, P.L.onPri), cr2 = ratio(P.L.ink, P.L.bg);
    return `
      <div class="st-g"><h3>ستايلات جاهزة <small>ضغطة وحدة تغيّر كل شي</small></h3><div class="st-opts">${PRESETS.map((p, k) => `<button type="button" class="st-opt" data-preset="${k}"><b>${p.n}</b>&nbsp;<span style="opacity:.7">${p.d}</span></button>`).join('')}</div></div>
      <div class="st-g"><h3>الألوان</h3><div class="pal">${Object.keys(PALS).map((k) => `<button type="button" data-s="pal" data-v="${k}" aria-pressed="${st.pal === k}">${swatch(PALS[k])}${PALS[k].n}<small>${PALS[k].note}</small></button>`).join('')}
          <button type="button" data-s="pal" data-v="custom" aria-pressed="${st.pal === 'custom'}">${swatch(customPal(st.custom))}لونچ الخاص<small>اختاري أي لون</small></button></div>
        <div class="custom-c"><input type="color" id="stColor" value="${st.custom}" aria-label="اختاري لون خاص"><span class="note">اللون الأساسي، والباقي يتولد منه</span></div>
        <div class="custom-c"><span class="contrast ${cr < 4.5 ? 'bad' : ''}">تباين الأزرار ${cr.toFixed(1)}</span><span class="contrast ${cr2 < 7 ? 'bad' : ''}">تباين النص ${cr2.toFixed(1)}</span><span class="note">الحد الأدنى 4.5</span></div></div>
      <div class="st-g"><h3>الوضع</h3><div class="st-opts">${opt('mode', 'light', 'فاتح', '☀️ ')}${opt('mode', 'dark', 'داكن', '🌙 ')}${opt('mode', 'auto', 'حسب الجهاز')}</div></div>
      <div class="st-g"><h3>شكل الأيقونات <small>يأثر على الأقسام والتنقل</small></h3><div class="st-opts">${Object.keys(ICONS).map((k) => opt('icons', k, ICONS[k])).join('')}</div>
        <p class="note">«شارات ملوّنة» و«إيموجي» أوضح للي ما تقرا. كل أيقونة لها لون ثابت حتى تنحفظ بالعين.</p></div>
      <div class="st-g"><h3>خط التطبيق</h3><div class="st-opts">${Object.keys(FONTS).map((k) => `<button type="button" class="st-opt" data-s="font" data-v="${k}" aria-pressed="${st.font === k}" style="font-family:'${FONTS[k][0]}'">${FONTS[k][1]} · احجزي</button>`).join('')}</div></div>
      <div class="st-g"><h3>خط الشعار</h3><div class="st-opts">${Object.keys(LOGOS).map((k) => `<button type="button" class="st-opt" data-s="logo" data-v="${k}" aria-pressed="${st.logo === k}" style="font-family:'${LOGOS[k][0]}';font-size:1.05em">صالوناتي <small style="font-family:var(--f-ui);opacity:.7">${LOGOS[k][1]}</small></button>`).join('')}</div></div>
      <div class="st-g"><h3>الزوايا</h3><div class="st-opts">${Object.keys(RADII).map((k) => opt('radius', k, RADII[k][3])).join('')}</div></div>
      <div class="st-g"><h3>البطاقات</h3><div class="st-opts">${Object.keys(CARDS).map((k) => opt('cards', k, CARDS[k])).join('')}</div></div>
      <div class="st-g"><h3>شريط التنقل</h3><div class="st-opts">${Object.keys(NAVS).map((k) => opt('nav', k, NAVS[k])).join('')}</div></div>
      <div class="st-g"><h3>حجم الكتابة</h3><div class="st-opts">${Object.keys(SIZES).map((k) => opt('size', k, SIZES[k][1])).join('')}</div></div>
      <div class="st-g"><h3>سهولة الاستخدام</h3>
        ${tog('easy', 'الوضع المبسط', 'أزرار أكبر، تصنيفات بصف، وتخفي الإعلانات والتفاصيل الإضافية')}
        <div class="st-row"><b>الحركة</b><div class="st-opts">${opt('motion', 'on', 'شغالة')}${opt('motion', 'off', 'متوقفة')}</div></div></div>
      <div class="st-g"><h3>إطار الجهاز <small>للعرض على الشاشة الكبيرة</small></h3><div class="st-opts">${Object.keys(FRAMES).map((k) => opt('frame', k, FRAMES[k])).join('')}</div></div>
      <div class="st-g"><h3>اختياراتي</h3><p class="note">انسخيها وأرسليها للمبرمج أو للفريق</p><pre class="st-out" id="stOut">${esc(summary())}</pre>
        <div class="st-opts"><button type="button" class="st-btn" data-x="copy">نسخ الاختيارات</button><button type="button" class="st-btn ghost" data-x="resetStyle">رجعي الستايل الأصلي</button></div></div>`;
  }
  function summary() {
    return [`صالوناتي · اختيارات الستايل`, `الألوان: ${pal().n}${st.pal === 'custom' ? ' ' + st.custom : ''}`, `الوضع: ${{ light: 'فاتح', dark: 'داكن', auto: 'حسب الجهاز' }[st.mode]}`, `الأيقونات: ${ICONS[st.icons]}`, `خط التطبيق: ${FONTS[st.font][0]}`, `خط الشعار: ${LOGOS[st.logo][0]}`, `الزوايا: ${RADII[st.radius][3]}`, `البطاقات: ${CARDS[st.cards]}`, `التنقل: ${NAVS[st.nav]}`, `حجم الكتابة: ${SIZES[st.size][1]}`, `الوضع المبسط: ${st.easy ? 'شغال' : 'متوقف'}`].join('\n');
  }
  function screensTab() {
    const cur = App.cur && App.cur() ? App.cur().id : '';
    const RL = [['client', 'user', 'زبونة'], ['salon', 'scan', 'صاحبة صالون'], ['admin', 'shield', 'الإدارة']];
    return `<div class="st-g"><h3>منو يستخدم التطبيق؟</h3><div class="roles">${RL.map((r) => { const n = App.unread ? App.unread(r[0]) : 0; return `<button type="button" data-role="${r[0]}" aria-pressed="${S.role === r[0]}">${ic(r[1])}${r[2]}${n ? `<span class="cnt num">${n}</span>` : ''}</button>`; }).join('')}</div>
        <p class="note">الحالة مشتركة: الحجز اللي تسوينه كزبونة يظهر بجدول الصالون، ومنشور الصالون يوصل للإدارة.</p></div>
      <div class="st-g"><div class="smap">${MAP.map((g, gi) => `<div><h4>${ic(g.role === 'client' ? 'user' : g.role === 'salon' ? 'scan' : 'shield')}${g.g}</h4><ul>${g.items.map((it, ii) => `<li><button type="button" data-jump="${gi}:${ii}" class="${cur === it[0] && S.role === g.role ? 'cur' : ''}"><span class="n num">${ii + 1}</span>${it[1]}${App.SCREENS[it[0]] ? '' : ' <small style="opacity:.6">(قيد البناء)</small>'}</button></li>`).join('')}</ul></div>`).join('')}</div></div>`;
  }
  function journeyTab() {
    const b = myNext(), ph = b ? App.phase(b) : null;
    const steps = [
      ['احجزي كزبونة', 'صالون الياسمين، سشوار، ووقت. التسجيل يطلع بس وقت تضغطين «التالي»', 'j1', !!App.mine().find((x) => x.created && x.created > Date.now() - 864e5 * 0.5 && x.id !== 'b1001')],
      ['قدّمي الوقت لحد الرمز', 'آلة الوقت تحت: «قبل 10 دقايق»', 'j2', ph === 'qr' || ph === 'arrived' || ph === 'inservice'],
      ['امسحي الرمز كصاحبة صالون', 'صاحبة الصالون ← مسح ← محاكاة مسح', 'j3', !!S.bookings.find((x) => x.mine && ['arrived', 'inservice', 'done'].includes(x.status) && x.arrivedAt)],
      ['ابدي الخدمة واقبضي الحساب', 'من تفاصيل الحجز ← ابدي ← إنهاء ← دفع', 'j4', !!S.bookings.find((x) => x.mine && x.status === 'done' && x.finished)],
      ['قيّمي كزبونة وخذي بتلة', 'الإشعار يوصلچ، أو من مواعيدي', 'j5', !!S.bookings.find((x) => x.mine && x.rated && x.finished)],
      ['انشري عرض ساعة فارغة', 'صاحبة الصالون ← اليوم ← الساعات الفارغة', 'j6', S.offers.length > 4],
      ['راجعي منشور كإدارة', 'الإدارة ← مراجعة ← قبول أو رفض', 'j7', S.posts.some((x) => x.status !== 'pending')]
    ];
    return `<div class="st-g"><h3>رحلة كاملة خطوة بخطوة</h3><ol class="journey">${steps.map((s, k) => `<li class="${s[3] ? 'done' : ''}"><i class="num">${s[3] ? '✓' : k + 1}</i><span><b>${s[0]}</b><span>${s[1]}</span><br><button type="button" class="st-opt" style="margin-top:6px" data-j="${s[2]}">روحي</button></span></li>`).join('')}</ol></div>
      <div class="st-g"><h3>آلة الوقت <small>${b ? 'لموعد ' + salon(b.s).n + ' ' + hm(b.at) : 'ماكو موعد قادم'}</small></h3>
        <div class="tm">${TM.map((t) => `<button type="button" data-tm="${t[1]}">${t[0]}<br><small style="opacity:.7">${t[2]}</small></button>`).join('')}</div>
        <button type="button" class="st-opt" data-x="realTime" ${S.clock ? '' : 'disabled'}>رجعي الوقت الحقيقي</button>
        ${b ? `<p class="note">الحالة هسة: <b>${App.PHASE[ph].n}</b></p>` : ''}</div>
      <div class="st-g"><h3>حالات للتجربة</h3>
        <div class="st-row"><span><b>زبونة بدون حساب</b><br><span style="color:var(--pg-muted);font-size:.84em">تتصفح كضيفة، والتسجيل يطلع وقت الحجز</span></span><button type="button" class="st-sw" role="switch" aria-checked="${!S.user.registered}" data-x="guest" aria-label="زبونة بدون حساب"><i></i></button></div>
        <div class="st-row"><span><b>انقطاع النت</b><br><span style="color:var(--pg-muted);font-size:.84em">التطبيق يشتغل بآخر نسخة، والصالون يقبل الرقم</span></span><button type="button" class="st-sw" role="switch" aria-checked="${!!S.offline}" data-x="offline" aria-label="انقطاع النت"><i></i></button></div>
        <div class="st-row"><span><b>فشل الدفع</b><br><span style="color:var(--pg-muted);font-size:.84em">أول محاولة دفع ترفض</span></span><button type="button" class="st-sw" role="switch" aria-checked="${!!S.failPay}" data-x="failPay" aria-label="فشل الدفع"><i></i></button></div></div>
      <div class="st-g"><h3>البيانات</h3><p class="note">كل الأسماء والأسعار والفيديوهات للعرض بس. الفيديوهات من Mixkit بترخيص مجاني.</p>
        <button type="button" class="st-btn ghost" data-x="reset">ابدي العرض من جديد</button></div>`;
  }

  function render() {
    const el = $('#studio');
    if (!el || !App.S) return;
    const top = el.scrollTop;
    el.innerHTML = `<div class="st-head">${rose()}<span class="logo-w">صالوناتي</span><button type="button" class="x" data-x="closeMobile" aria-label="إغلاق">${ic('close')}</button></div>
      <p class="st-sub">نموذج كامل يشتغل. جربي الستايلات، بدّلي بين الأدوار، وروحي لأي شاشة.</p>
      <div class="st-tabs" role="tablist">${[['style', 'الستايل'], ['screens', 'الشاشات'], ['journey', 'الرحلة']].map((t) => `<button type="button" role="tab" aria-selected="${st.tab === t[0]}" data-tab="${t[0]}">${t[1]}</button>`).join('')}</div>
      ${st.tab === 'style' ? styleTab() : st.tab === 'screens' ? screensTab() : journeyTab()}`;
    el.scrollTop = top;
  }

  function closeMobile() { const s = $('#studio'); if (s) s.classList.remove('open'); const t = $('#studioTab'); if (t) t.setAttribute('aria-expanded', 'false'); }

  function bind() {
    const el = $('#studio');
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      const d = b.dataset;
      if (d.tab) { st.tab = d.tab; persist(); render(); el.scrollTop = 0; return; }
      if (d.s) { Style.set(d.s, d.v); return; }
      if (d.t) { Style.set(d.t, !st[d.t]); return; }
      if (d.preset) { Object.assign(st, PRESETS[+d.preset].v); persist(); apply(); App.refresh(); render(); App.toast('ستايل «' + PRESETS[+d.preset].n + '»', { icon: 'palette' }); return; }
      if (d.role) { App.setRole(d.role); closeMobile(); render(); return; }
      if (d.jump) { const [g, i] = d.jump.split(':').map(Number); jump(g, i); return; }
      if (d.tm) { timeTo(+d.tm); return; }
      if (d.j) { journey(d.j); return; }
      if (d.x === 'closeMobile') closeMobile();
      else if (d.x === 'copy') { const t = summary(); try { navigator.clipboard.writeText(t).then(() => App.toast('انتسخت الاختيارات', { icon: 'copy', tone: 'ok' }), () => selectOut()); } catch (er) { selectOut(); } }
      else if (d.x === 'resetStyle') { const tab = st.tab; st = Object.assign({}, DEF, { tab }); persist(); apply(); App.refresh(); render(); }
      else if (d.x === 'realTime') { S.clock = 0; App.save(); App.tickStatus(); App.refresh(); render(); }
      else if (d.x === 'offline') { S.offline = !S.offline; if (!S.offline && S.salon.sync) { App.toast(`رجع النت، تزامنت ${S.salon.sync} عمليات`, { icon: 'refresh', tone: 'ok' }); S.salon.sync = 0; } App.save(); App.refresh(); render(); }
      else if (d.x === 'failPay') { S.failPay = !S.failPay; App.save(); render(); }
      else if (d.x === 'guest') { S.user.registered = !S.user.registered; S.onboarded = true; App.save(); if (S.role === 'client') App.tabTo('c.home'); render(); }
      else if (d.x === 'reset') { App.confirmBox({ icon: 'refresh', tone: 'rose', title: 'نبدي العرض من جديد؟', text: 'المواعيد والطلبات والإشعارات ترجع مثل أول مرة. الستايل يبقى نفسه', ok: 'إي، من جديد', onOk: () => { App.resetDemo(); render(); } }); closeMobile(); }
    });
    el.addEventListener('input', (e) => { if (e.target.id === 'stColor') { st.custom = e.target.value; st.pal = 'custom'; persist(); apply(); clearTimeout(bind.t); bind.t = setTimeout(() => { App.refresh(); render(); }, 120); } });
    $('#studioTab').addEventListener('click', () => { const s = $('#studio'); s.classList.add('open'); $('#studioTab').setAttribute('aria-expanded', 'true'); render(); });
  }
  function selectOut() { const o = $('#stOut'); const r = document.createRange(); r.selectNodeContents(o); const s = getSelection(); s.removeAllRanges(); s.addRange(r); App.toast('حددنا النص، انسخيه', { icon: 'copy' }); }

  function journey(j) {
    closeMobile();
    if (j === 'j1') { S.role = 'client'; S.onboarded = true; App.save(); App.tabTo('c.home'); App.go('c.salon', { id: '0', svc: 'blow' }); }
    else if (j === 'j2') { if (S.role !== 'client') { S.role = 'client'; App.save(); } const b = myNext(); App.tabTo('c.bookings'); if (b) { App.go('c.ticket', { id: b.id }); timeTo(10); } }
    else if (j === 'j3') { App.setRole('salon'); if (App.SCREENS['s.scan']) App.tabTo('s.scan'); }
    else if (j === 'j4') { App.setRole('salon'); const b = S.bookings.find((x) => x.mine && ['arrived', 'inservice'].includes(x.status)) || myNext(); if (b && App.SCREENS['s.booking']) App.go('s.booking', { id: b.id }); }
    else if (j === 'j5') { S.role = 'client'; S.onboarded = true; App.save(); const b = doneBooking(); App.tabTo('c.bookings'); if (b && !b.rated) App.go('c.rate', { id: b.id }); }
    else if (j === 'j6') { App.setRole('salon'); if (App.SCREENS['s.offer']) App.go('s.offer'); }
    else if (j === 'j7') { App.setRole('admin'); if (App.SCREENS['a.review']) App.tabTo('a.review'); }
    render();
  }

  App.Studio = {
    init() { bind(); render(); },
    sync: render,
    onScreen() {
      const v = $('#vp .view'), sc = $('#screen');
      if (v && sc) sc.classList.toggle('dark-top', v.classList.contains('dark-status') || v.classList.contains('full') || !!$('.hero', v));
      if (st.tab === 'screens' || st.tab === 'journey') render();
    }
  };
})();
