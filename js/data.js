/* Demo data for the Salonati prototype. Every name, price and number here is illustrative. */
(function () {
  'use strict';

  const AREAS = [
    { id: 'mansour', n: 'المنصور' }, { id: 'yarmouk', n: 'اليرموك' }, { id: 'harthiya', n: 'الحارثية' },
    { id: 'karrada', n: 'الكرادة' }, { id: 'zayouna', n: 'زيونة' }, { id: 'adhamiya', n: 'الأعظمية' },
    { id: 'jadriya', n: 'الجادرية' }, { id: 'saydiya', n: 'السيدية' }
  ];

  const CATS = [
    { id: 'hair', n: 'شعر', icon: 'hairdryer', tone: 'rose' },
    { id: 'nails', n: 'أظافر', icon: 'nail', tone: 'gold' },
    { id: 'makeup', n: 'مكياج', icon: 'lipstick', tone: 'plum' },
    { id: 'skin', n: 'بشرة', icon: 'drop', tone: 'teal' },
    { id: 'brows', n: 'حواجب ورموش', icon: 'eye', tone: 'sky' },
    { id: 'henna', n: 'حنة', icon: 'henna', tone: 'amber' },
    { id: 'bride', n: 'عرائس', icon: 'crown', tone: 'gold' },
    { id: 'wax', n: 'إزالة شعر', icon: 'wax', tone: 'mint' }
  ];

  // Base catalog. Each salon multiplies the price by its own factor (f). len: priced by hair length.
  const SVC = [
    { id: 'blow', cat: 'hair', n: 'سشوار وتصفيف', d: 45, p: 15000, len: true, v: 'hair-blowdry' },
    { id: 'cut', cat: 'hair', n: 'قص وتصفيف', d: 60, p: 25000, len: true, v: 'hair-cut' },
    { id: 'roots', cat: 'hair', n: 'صبغة جذور', d: 90, p: 45000, allergy: true, v: 'hair-dye' },
    { id: 'color', cat: 'hair', n: 'صبغة كاملة', d: 150, p: 90000, len: true, allergy: true, v: 'hair-dye' },
    { id: 'protein', cat: 'hair', n: 'بروتين', d: 180, p: 120000, len: true, v: 'hair-iron' },
    { id: 'braid', cat: 'hair', n: 'ضفائر', d: 50, p: 20000, len: true, v: 'hair-braid' },
    { id: 'updo', cat: 'hair', n: 'تسريحة مناسبات', d: 60, p: 30000, len: true, v: 'hair-ribbon' },
    { id: 'mani', cat: 'nails', n: 'مانيكير', d: 40, p: 12000, v: 'nails-timelapse' },
    { id: 'pedi', cat: 'nails', n: 'بديكير', d: 50, p: 15000, v: 'spa-hand' },
    { id: 'gel', cat: 'nails', n: 'جل أظافر', d: 60, p: 20000, v: 'nails-red' },
    { id: 'nailart', cat: 'nails', n: 'رسم أظافر', d: 45, p: 10000, v: 'nails-sparkle' },
    { id: 'acrylic', cat: 'nails', n: 'أظافر أكريليك', d: 90, p: 35000, v: 'nails-pro' },
    { id: 'evening', cat: 'makeup', n: 'مكياج سهرة', d: 60, p: 35000, v: 'makeup-brushes' },
    { id: 'soft', cat: 'makeup', n: 'مكياج ناعم', d: 40, p: 25000, v: 'makeup-tools' },
    { id: 'facial', cat: 'skin', n: 'تنظيف بشرة', d: 60, p: 30000, v: 'skin-facial' },
    { id: 'mask', cat: 'skin', n: 'ماسك ترطيب', d: 30, p: 15000, v: 'salon-session' },
    { id: 'spa', cat: 'skin', n: 'مساج اليدين', d: 20, p: 8000, v: 'spa-hand' },
    { id: 'thread', cat: 'brows', n: 'حواجب بالخيط', d: 15, p: 5000 },
    { id: 'lash', cat: 'brows', n: 'تركيب رموش', d: 60, p: 25000 },
    { id: 'henna', cat: 'henna', n: 'نقش حنة', d: 60, p: 20000 },
    { id: 'bridepk', cat: 'bride', n: 'باقة العروس', d: 240, p: 350000, bride: true, v: 'bride' },
    { id: 'brtrial', cat: 'bride', n: 'تجربة مكياج عروس', d: 90, p: 50000, v: 'salon-makeup' },
    { id: 'wax', cat: 'wax', n: 'شمع كامل', d: 60, p: 25000 }
  ];

  const LEN = [
    { id: 's', n: 'قصير', k: 1, icon: 'hair-s' },
    { id: 'm', n: 'متوسط', k: 1.3, icon: 'hair-m' },
    { id: 'l', n: 'طويل', k: 1.6, icon: 'hair-l' }
  ];

  const T = ['rose', 'gold', 'teal', 'plum', 'sky', 'amber'];
  const SALONS = [
    { id: 0, n: 'صالون الياسمين', area: 'mansour', lm: 'قرب مول المنصور', km: 1.2, r: 4.8, rev: 214, f: 1, hy: 4.9, chk: 'أيلول 2026', cover: 'hair-iron', tone: 'rose',
      tagline: 'شعر وصبغة وتسريحات', founder: true, x: 37, y: 41, phone: '0770 555 1203',
      svcs: ['blow', 'cut', 'roots', 'color', 'protein', 'updo', 'mani', 'gel', 'evening', 'facial', 'thread', 'brtrial'],
      staff: [{ n: 'سارة', role: 'شعر وصبغة', r: 4.9 }, { n: 'هبة', role: 'تصفيف ومكياج', r: 4.7 }, { n: 'زينب', role: 'أظافر', r: 4.8 }] },
    { id: 1, n: 'مركز لمسة', area: 'mansour', lm: 'شارع 14 رمضان', km: 2.4, r: 4.6, rev: 132, f: 0.9, hy: 4.6, chk: 'آب 2026', cover: 'salon-makeup', tone: 'plum',
      tagline: 'مكياج ومناسبات', ad: true, x: 28, y: 50, phone: '0771 210 4433',
      svcs: ['blow', 'cut', 'updo', 'evening', 'soft', 'brtrial', 'lash', 'thread', 'mani'],
      staff: [{ n: 'مريم', role: 'مكياج', r: 4.7 }, { n: 'آية', role: 'رموش وحواجب', r: 4.5 }] },
    { id: 2, n: 'دار نور', area: 'harthiya', lm: 'قرب الشارع التجاري', km: 3.1, r: 4.9, rev: 301, f: 1.1, hy: 5, chk: 'تشرين الأول 2026', cover: 'salon-nails', tone: 'gold',
      tagline: 'أظافر وعناية', x: 52, y: 36, phone: '0780 333 9012',
      svcs: ['mani', 'pedi', 'gel', 'nailart', 'acrylic', 'spa', 'facial', 'mask'],
      staff: [{ n: 'نور', role: 'أظافر', r: 5 }, { n: 'رند', role: 'أظافر وجل', r: 4.8 }, { n: 'تبارك', role: 'بشرة', r: 4.8 }] },
    { id: 3, n: 'بيت الورد', area: 'yarmouk', lm: 'قرب ساحة اليرموك', km: 0.8, r: 4.5, rev: 88, f: 0.85, hy: 4.5, chk: 'تموز 2026', cover: 'skin-facial', tone: 'teal',
      tagline: 'صالون بيتي للبشرة', home: true, x: 24, y: 64, phone: '0790 118 2277',
      svcs: ['facial', 'mask', 'spa', 'thread', 'wax', 'mani', 'pedi'],
      staff: [{ n: 'ورود', role: 'بشرة', r: 4.6 }, { n: 'دعاء', role: 'شمع وحواجب', r: 4.4 }] },
    { id: 4, n: 'لمسات ليان', area: 'mansour', lm: 'شارع الأميرات', km: 1.9, r: 4.7, rev: 176, f: 1, hy: 4.8, chk: 'أيلول 2026', cover: 'hair-dye', tone: 'amber',
      tagline: 'صبغات وقصات', x: 43, y: 53, phone: '0770 640 1188',
      svcs: ['cut', 'roots', 'color', 'protein', 'blow', 'braid'],
      staff: [{ n: 'ليان', role: 'صبغة', r: 4.8 }, { n: 'رؤى', role: 'قص وتصفيف', r: 4.6 }] },
    { id: 5, n: 'عشتار للعرائس', area: 'zayouna', lm: 'قرب شارع الربيعي', km: 6.5, r: 4.9, rev: 402, f: 1.4, hy: 4.9, chk: 'تشرين الأول 2026', cover: 'bride', tone: 'gold',
      tagline: 'عرائس ومناسبات', founder: true, x: 84, y: 43, phone: '0781 909 5050',
      svcs: ['bridepk', 'brtrial', 'evening', 'updo', 'henna', 'lash', 'gel'],
      staff: [{ n: 'شهد', role: 'مكياج عرائس', r: 5 }, { n: 'رغد', role: 'تسريحات', r: 4.9 }, { n: 'ملاك', role: 'حنة', r: 4.8 }] },
    { id: 6, n: 'جوري بيوتي', area: 'karrada', lm: 'قرب ساحة كهرمانة', km: 5.2, r: 4.4, rev: 61, f: 0.8, hy: 4.4, chk: 'آب 2026', cover: 'nails-red', tone: 'rose',
      tagline: 'أظافر بأسعار بسيطة', x: 67, y: 60, phone: '0772 404 7070',
      svcs: ['mani', 'pedi', 'gel', 'nailart', 'thread', 'wax', 'blow'],
      staff: [{ n: 'زهراء', role: 'أظافر', r: 4.5 }, { n: 'هدى', role: 'شمع', r: 4.3 }] },
    { id: 7, n: 'دار الحنة', area: 'adhamiya', lm: 'قرب جامع أبي حنيفة', km: 7.8, r: 4.7, rev: 140, f: 0.9, hy: 4.7, chk: 'أيلول 2026', cover: 'hair-braid', tone: 'amber',
      tagline: 'حنة وضفائر', x: 61, y: 19, phone: '0773 515 3434',
      svcs: ['henna', 'braid', 'updo', 'thread', 'blow'],
      staff: [{ n: 'أمل', role: 'حنة', r: 4.8 }, { n: 'سجى', role: 'ضفائر', r: 4.6 }] }
  ];

  // Reels and stories. Each video is tied to a salon and one of its services so it can turn into a booking.
  const REELS = [
    { id: 'r1', s: 0, v: 'hair-blowdry', svc: 'blow', cap: 'سشوار ناعم يدوم لثاني يوم', likes: 1240, cm: 48, sv: 86, tag: 'تسريحات', consent: true, c: [['رنا', 'ترهم عليچ'], ['دعاء', 'شكد ياخذ وقت؟']] },
    { id: 'r2', s: 2, v: 'nails-timelapse', svc: 'mani', cap: 'لون نيود للدوام والجامعة', likes: 980, cm: 31, sv: 140, tag: 'أظافر', c: [['آيات', 'حلو وبسيط'], ['شهد', 'متوفر اليوم؟']] },
    { id: 'r3', s: 4, v: 'hair-dye', svc: 'roots', cap: 'جذور بدرجة عسلي ونتيجة طبيعية', likes: 2310, cm: 112, sv: 190, tag: 'صبغة', c: [['هدى', 'اللون يجنن']] },
    { id: 'r4', s: 0, v: 'hair-cut', svc: 'cut', cap: 'قصة طبقات خفيفة للشعر الطويل', likes: 1675, cm: 64, sv: 121, tag: 'قصات', c: [['ملاك', 'أريد نفسها']] },
    { id: 'r5', s: 5, v: 'bride', svc: 'bridepk', cap: 'عروستنا ليلة الحنة', likes: 3120, cm: 210, sv: 402, tag: 'عرائس', consent: true, c: [['زينب', 'الله يتمم عليها']] },
    { id: 'r6', s: 1, v: 'makeup-brushes', svc: 'evening', cap: 'تجهيزات مكياج السهرة', likes: 760, cm: 22, sv: 58, tag: 'مكياج', ad: true, c: [] },
    { id: 'r7', s: 2, v: 'nails-pro', svc: 'acrylic', cap: 'أكريليك بشكل لوز', likes: 1430, cm: 77, sv: 233, tag: 'أظافر', c: [['تبارك', 'شكد يثبت؟']] },
    { id: 'r8', s: 3, v: 'skin-facial', svc: 'facial', cap: 'تنظيف بشرة قبل العيد', likes: 540, cm: 12, sv: 44, tag: 'بشرة', consent: true, c: [] },
    { id: 'r9', s: 7, v: 'hair-braid', svc: 'braid', cap: 'ضفيرة فرنسية للمدرسة والجامعة', likes: 1890, cm: 95, sv: 260, tag: 'ضفائر', c: [['رقية', 'تعلمونها؟']] },
    { id: 'r10', s: 6, v: 'nails-red', svc: 'gel', cap: 'أحمر كلاسيك يثبت أسبوعين', likes: 1120, cm: 40, sv: 98, tag: 'أظافر', c: [] },
    { id: 'r11', s: 5, v: 'hair-ribbon', svc: 'updo', cap: 'ضفيرة بشريطة ذهبية للمناسبات', likes: 870, cm: 26, sv: 133, tag: 'تسريحات', c: [] },
    { id: 'r12', s: 0, v: 'hair-iron', svc: 'protein', cap: 'بروتين بدون ما يحترق الشعر', likes: 1302, cm: 58, sv: 150, tag: 'بروتين', c: [] },
    { id: 'r13', s: 6, v: 'nails-sparkle', svc: 'nailart', cap: 'لمعة خفيفة للمناسبات', likes: 640, cm: 18, sv: 71, tag: 'أظافر', c: [] },
    { id: 'r14', s: 3, v: 'spa-hand', svc: 'spa', cap: 'مساج اليدين هدية مع المانيكير', likes: 410, cm: 9, sv: 37, tag: 'عناية', c: [] },
    { id: 'r15', s: 1, v: 'makeup-tools', svc: 'soft', cap: 'مكياج ناعم للتخرج', likes: 1015, cm: 35, sv: 119, tag: 'مكياج', c: [] }
  ];

  const PRODUCTS = [
    { id: 'p1', s: 0, n: 'سيروم الشعر', p: 22000, icon: 'drop', tone: 'rose', img: 'hair-blowdry' },
    { id: 'p2', s: 0, n: 'ماسك البروتين', p: 35000, icon: 'box', tone: 'amber', img: 'hair-iron' },
    { id: 'p3', s: 2, n: 'زيت الأظافر', p: 9000, icon: 'nail', tone: 'gold', img: 'nails-timelapse' },
    { id: 'p4', s: 2, n: 'طقم مانيكير', p: 18000, icon: 'sparkle', tone: 'plum', img: 'nails-sparkle' },
    { id: 'p5', s: 4, n: 'شامبو بدون سلفات', p: 16000, icon: 'drop', tone: 'teal', img: 'hair-dye' },
    { id: 'p6', s: 1, n: 'فرش مكياج', p: 27000, icon: 'lipstick', tone: 'plum', img: 'makeup-brushes' },
    { id: 'p7', s: 3, n: 'كريم مرطب', p: 14000, icon: 'leaf', tone: 'mint', img: 'skin-facial' }
  ];

  const GIFT_CARDS = [25000, 50000, 100000];

  const WRAPS = [
    { id: 'none', n: 'بدون', p: 0, icon: 'box' },
    { id: 'rose', n: 'علبة وردة', p: 3000, icon: 'gift' },
    { id: 'lux', n: 'صندوق فاخر', p: 8000, icon: 'crown' }
  ];

  const ISSUES = [
    { id: 'price', n: 'السعر تغيّر', icon: 'tag' },
    { id: 'late', n: 'انتظرت هواية', icon: 'clock' },
    { id: 'result', n: 'النتيجة ما عجبتني', icon: 'face2' },
    { id: 'clean', n: 'النظافة', icon: 'spray' },
    { id: 'manner', n: 'سوء تعامل', icon: 'chat' },
    { id: 'harm', n: 'ضرر صحي', icon: 'alert' },
    { id: 'privacy', n: 'صوري بدون إذن', icon: 'camera' },
    { id: 'fake', n: 'منتج مشكوك فيه', icon: 'box' }
  ];

  const round5 = (t) => Math.ceil(t / 300000) * 300000;
  const H = 3600e3, M = 60e3, D = 864e5;

  // Fresh demo state. The client books with salon 0; the salon role manages salon 0 and sees the same booking.
  function SEED() {
    const t = Date.now();
    const mine = round5(t + 2 * H);
    return {
      v: 5,
      role: 'client',
      onboarded: false,
      clock: 0,
      offline: false,
      failPay: false,
      user: {
        // A guest browses freely; the phone number is asked only when she books. The demo number 0770 123 4512 is a returning client with history.
        registered: false, name: 'نور', phone: '0770 123 4512', area: 'mansour', wallet: 3000, petals: 5, ref: 'noor5',
        track: true, interests: { 'تسريحات': 4, 'أظافر': 2, 'صبغة': 1 },
        notif: { offers: true, empty: true, price: true, due: true, wait: true, account: true },
        quiet: true, perms: { loc: 'ask', notif: 'ask' }, lang: 'ar', allergy: 'تحسس خفيف من الأمونيا'
      },
      bookings: [
        { id: 'b1001', mine: true, seed: true, cust: 'نور', s: 0, items: [{ svc: 'blow', len: 'm' }], staff: 0, at: mine, total: 20000, dep: 5000, pay: 'zain', status: 'confirmed', created: t - D },
        { id: 'b0990', mine: true, seed: true, cust: 'نور', s: 2, items: [{ svc: 'mani' }], staff: 0, at: t - 34 * D, total: 13000, dep: 5000, pay: 'qi', status: 'done', rated: true, rating: 5 },
        { id: 'b0950', mine: true, seed: true, cust: 'نور', s: 0, items: [{ svc: 'roots' }], staff: 0, at: t - 70 * D, total: 45000, dep: 9000, pay: 'qi', status: 'done', rated: true, rating: 4 },
        { id: 'b2001', cust: 'سارة م.', s: 0, items: [{ svc: 'roots' }], staff: 0, at: round5(t - 40 * M), total: 45000, dep: 9000, pay: 'qi', status: 'inservice', started: t - 35 * M },
        { id: 'b2002', cust: 'هبة ك.', s: 0, items: [{ svc: 'mani' }], staff: 2, at: round5(t - 2.5 * H), total: 12000, dep: 5000, pay: 'cash', status: 'done', rated: true, rating: 5, paid: true },
        { id: 'b2003', cust: 'مريم ع.', s: 0, items: [{ svc: 'cut', len: 'l' }], staff: 1, at: round5(t + 70 * M), total: 40000, dep: 8000, pay: 'zain', status: 'confirmed', isNew: true },
        { id: 'b2004', cust: 'رغد', s: 0, items: [{ svc: 'gel' }], staff: 2, at: round5(t + 4 * H), total: 20000, dep: 5000, pay: 'qi', status: 'confirmed' },
        { id: 'b2005', cust: 'هدى س.', s: 0, items: [{ svc: 'evening' }], staff: 1, at: round5(t + 5.5 * H), total: 35000, dep: 7000, pay: 'cash', status: 'confirmed' }
      ],
      offers: [
        { id: 'o1', s: 0, svc: 'blow', pct: 0.33, from: '11:00 ص', to: '1:00 م', left: 3 },
        { id: 'o2', s: 2, svc: 'mani', pct: 0.25, from: '12:00 م', to: '3:00 م', left: 4 },
        { id: 'o3', s: 4, svc: 'roots', pct: 0.22, from: '2:00 م', to: '5:00 م', left: 2 },
        { id: 'o4', s: 6, svc: 'gel', pct: 0.3, from: '4:00 م', to: '7:00 م', left: 5 }
      ],
      posts: [
        { id: 'q1', s: 0, v: 'hair-ribbon', svc: 'updo', cap: 'تسريحة تخرج بشريطة', status: 'pending', consent: 'yes', cust: 'سارة م.', sent: t - 50 * M, auto: { quality: true, words: true, medical: false } },
        { id: 'q2', s: 6, v: 'nails-sparkle', svc: 'nailart', cap: 'خصم فيلر وبوتوكس اليوم!', status: 'pending', consent: 'none', sent: t - 2 * H, auto: { quality: true, words: true, medical: true } },
        { id: 'q3', s: 2, v: 'nails-pro', svc: 'acrylic', cap: 'أكريليك ناعم للعيد', status: 'pending', consent: 'none', sent: t - 3 * H, auto: { quality: true, words: true, medical: false } }
      ],
      notifications: [
        { id: 'n1', role: 'client', seed: true, kind: 'offer', icon: 'tag', tone: 'gold', title: 'نزل السعر', text: 'سشوار وتصفيف بـ 10,000 بدل 15,000 · صالون الياسمين', t: t - H, to: 'c.salon', p: { id: '0' } },
        { id: 'n2', role: 'client', seed: true, kind: 'appt', icon: 'cal', tone: 'ok', title: 'تذكير بموعدچ', text: 'اليوم بصالون الياسمين، الرمز يظهر قبل الموعد بنص ساعة', t: t - 3 * H, to: 'c.ticket', p: { id: 'b1001' } },
        { id: 'n3', role: 'client', seed: true, kind: 'account', icon: 'gift', tone: 'rose', title: 'ربحتي 1,000 دينار', text: 'صديقتچ آية حضرت موعدها', t: t - 2 * D, to: 'c.share' },
        { id: 'n4', role: 'client', seed: true, kind: 'due', icon: 'hairdryer', tone: 'plum', title: 'حان وقت الجذور', text: 'مرّ شهرين على صبغتچ. نفس موعدچ السابق مع سارة؟', t: t - 3 * D, to: 'c.salon', p: { id: '0' } },
        { id: 'n5', role: 'salon', kind: 'appt', icon: 'cal', tone: 'ok', title: 'حجز جديد', text: 'مريم ع. · قص وتصفيف · زبونة جديدة من التطبيق', t: t - 2 * H, to: 's.today' },
        { id: 'n6', role: 'admin', kind: 'review', icon: 'clipboard', tone: 'gold', title: '3 منشورات بانتظار المراجعة', text: 'أقدمها من ساعتين', t: t - H, to: 'a.review' }
      ],
      read: {},
      likes: {}, saves: { r3: true }, follows: { 0: true, 2: true }, favs: { 0: true }, seen: {}, comments: {}, reports: {},
      alerts: {}, waitlist: [], orders: [], gifts: [],
      referrals: [
        { n: 'آية', st: 'attended', credit: 1000 }, { n: 'زهراء', st: 'attended', credit: 1000 },
        { n: 'رقية', st: 'attended', credit: 1000 }, { n: 'مريم', st: 'booked', credit: 0 }
      ],
      complaints: [],
      consents: [
        { id: 'cs1', s: 0, what: 'صورة تسريحة، زيارة 14 أيلول', on: true },
        { id: 'cs2', s: 2, what: 'صورة أظافر، زيارة 2 تشرين الأول', on: true }
      ],
      wedding: null,
      salon: {
        id: 0, closed: false, walkins: 0, sync: 0,
        steril: { tools: true, towels: true, chairs: false, uv: false },
        expenses: [
          { n: 'مولدة', p: 25000, icon: 'zap' }, { n: 'مواد صبغة', p: 48000, icon: 'drop' }, { n: 'غداء الكادر', p: 15000, icon: 'cake' }
        ],
        stock: [
          { n: 'صبغة 7.3', q: 4, min: 3, exp: 'آذار 2027' }, { n: 'أوكسجين 20', q: 2, min: 3, exp: 'كانون الأول 2026' },
          { n: 'بروتين', q: 1, min: 2, exp: 'تشرين الثاني 2026' }, { n: 'جل أظافر', q: 9, min: 4, exp: 'حزيران 2027' }
        ],
        offerDraft: null
      },
      admin: {
        verifs: [
          { id: 'v1', n: 'صالون رند', area: 'الكرادة', step: 'visit', docs: { license: true, id: true, photos: true, health: false }, sent: t - 2 * D },
          { id: 'v2', n: 'مركز آية', area: 'زيونة', step: 'docs', docs: { license: false, id: true, photos: true, health: true }, sent: t - 5 * D }
        ],
        disputes: [
          { id: 'd1', cust: 'زينب ع.', s: 1, amount: 5000, text: 'حضرت بالوقت، والصالون ما مسح الرمز وسجلني ما حضرت', t: t - 4 * H, status: 'open' }
        ],
        fraud: [{ id: 'f1', text: '5 حسابات جديدة من نفس الجهاز، كلها إحالة من رابط واحد', t: t - 6 * H, status: 'open' }],
        expiring: [{ s: 1, what: 'إجازة الصحة', days: 30 }]
      }
    };
  }

  Object.assign(window, { AREAS, CATS, SVC, LEN, SALONS, REELS, PRODUCTS, GIFT_CARDS, WRAPS, ISSUES, SEED, SALON_TONES: T });
})();
