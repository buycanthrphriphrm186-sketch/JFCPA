<script>
/* ==========================================================================
   APP SHELL, SYNC, NAVIGATION, HOME, CONTENT (FLIP CARDS), FOCUS, TIMER, TREATIES
   ========================================================================== */
var CATS = ['รัฐธรรมนูญ', 'พระราชบัญญัติประกอบรัฐธรรมนูญ', 'พระราชบัญญัติ/พระราชกำหนด', 'ปร./ปว./คปค./คสช.', 'ประมวลกฎหมาย'];
var CAT_ICON = { 'รัฐธรรมนูญ': 'scale', 'พระราชบัญญัติประกอบรัฐธรรมนูญ': 'layers', 'พระราชบัญญัติ/พระราชกำหนด': 'file', 'ปร./ปว./คปค./คสช.': 'gavel', 'ประมวลกฎหมาย': 'book2' };
var TABS = [['home', 'home'], ['content', 'book'], ['treaties', 'globe'], ['saved', 'bookmark'], ['history', 'history'], ['time', 'clock']];
var VIEWS = {};

/* ---------------- plans & feature gating ---------------- */
var PLAN_FEATURES = {
  free: [],
  'basic.monthly': ['timer', 'folders', 'tools_basic'],
  'basic.yearly': ['timer', 'folders', 'tools_basic', 'notes', 'pdf'],
  'standard.monthly': ['timer', 'folders', 'tools_basic', 'tools_all', 'compare', 'notes', 'pdf', 'ai'],
  'standard.yearly': ['timer', 'folders', 'tools_basic', 'tools_all', 'compare', 'notes', 'pdf', 'ai', 'backup'],
  'pro.monthly': ['timer', 'folders', 'tools_basic', 'tools_all', 'compare', 'notes', 'pdf', 'ai', 'backup', 'gmail'],
  'pro.yearly': ['timer', 'folders', 'tools_basic', 'tools_all', 'compare', 'notes', 'pdf', 'ai', 'backup', 'gmail', 'priority']
};
var FEATURE_NAMES = { timer: 'ตัวจับเวลาป้ายพลิก', folders: 'โฟลเดอร์ส่วนตัว', tools_basic: 'เครื่องมือพื้นฐาน', tools_all: 'เครื่องมือนักกฎหมายครบชุด', compare: 'เปรียบเทียบบทบัญญัติ', notes: 'สมุดบันทึก', pdf: 'พิมพ์ไฟล์ PDF', ai: 'ผู้ช่วย AI', backup: 'สำรองข้อมูล', gmail: 'AI สรุปอีเมล' };
function planKey() { var p = (S.member && S.member.plan) || { tier: 'free' }; if (p.tier === 'free' || !p.active) return 'free'; return p.tier + '.' + (p.cycle || 'monthly'); }
function can(f) { if (S.member && S.member.role === 'admin') return true; return (PLAN_FEATURES[planKey()] || []).indexOf(f) > -1; }
function gate(f) {
  if (can(f)) return true;
  modal({ title: 'ฟังก์ชันนี้ไม่รวมอยู่ในแพ็กเกจปัจจุบัน', icon: 'badge', tone: 'o', text: '“' + (FEATURE_NAMES[f] || f) + '” เปิดให้ใช้งานในแพ็กเกจที่สูงกว่าแพ็กเกจปัจจุบันของท่าน ท่านสามารถดูรายละเอียดแพ็กเกจและสมัครได้ที่หน้าแพ็กเกจและราคา', ok: 'ดูแพ็กเกจและราคา', cancel: 'ไว้ภายหลัง' }).then(function (ok) { if (ok) nav('pricing'); });
  return false;
}

/* ---------------- user data: local-first + debounced sync + merge ---------------- */
function udKey() { return 'ud.' + (S.member ? S.member.memberId : 'x'); }
function loadLocalUD() {
  var d = store.get(udKey(), null);
  S.ud = mergeDefaults(d || {});
  S.rev = store.get(udKey() + '.rev', 0);
}
function mergeDefaults(d) {
  var def = defaultUD();
  Object.keys(def).forEach(function (k) { if (d[k] === undefined || d[k] === null) d[k] = def[k]; });
  Object.keys(def.settings).forEach(function (k) { if (d.settings[k] === undefined) d.settings[k] = def.settings[k]; });
  Object.keys(def.settings.notif).forEach(function (k) { if (!d.settings.notif || d.settings.notif[k] === undefined) { d.settings.notif = d.settings.notif || {}; d.settings.notif[k] = def.settings.notif[k]; } });
  return d;
}
function mergeUD(local, server) {
  if (!server) return local;
  server = mergeDefaults(server);
  var out = mergeDefaults(JSON.parse(JSON.stringify(local)));
  var del = Object.assign({}, server.deleted || {}, local.deleted || {});
  Object.keys(server.favorites || {}).forEach(function (k) { if (!out.favorites[k] && !(del[k] && del[k] >= server.favorites[k].t)) out.favorites[k] = server.favorites[k]; });
  Object.keys(out.favorites).forEach(function (k) { if (del[k] && del[k] >= out.favorites[k].t) delete out.favorites[k]; });
  out.deleted = del;
  var seen = {};
  out.history = out.history.concat(server.history || []).filter(function (x) { var k = x.id + '|' + x.t; if (seen[k]) return false; seen[k] = 1; return true; }).sort(function (a, b) { return b.t - a.t; }).slice(0, 3000);
  Object.keys(server.time || {}).forEach(function (k) { out.time[k] = Math.max(out.time[k] || 0, server.time[k] || 0); });
  Object.keys(server.opens || {}).forEach(function (k) { out.opens[k] = Math.max(out.opens[k] || 0, server.opens[k] || 0); });
  var nm = {}; out.notes.concat(server.notes || []).forEach(function (n) { if (!nm[n.id] || nm[n.id].u < n.u) nm[n.id] = n; }); out.notes = Object.keys(nm).map(function (k) { return nm[k]; });
  var fm = {}; (server.folders || []).concat(out.folders).forEach(function (f) { fm[f.id] = f; }); out.folders = Object.keys(fm).map(function (k) { return fm[k]; });
  var sm = {}; out.searches = out.searches.concat(server.searches || []).filter(function (x) { if (sm[x.q]) return false; sm[x.q] = 1; return true; }).slice(0, 50);
  out.readNotices = Object.assign({}, server.readNotices || {}, out.readNotices);
  var am = {}; (server.aiChats || []).concat(out.aiChats).forEach(function (c) { if (!am[c.id] || (am[c.id].u || 0) < (c.u || 0)) am[c.id] = c; }); out.aiChats = Object.keys(am).map(function (k) { return am[k]; }).sort(function (a, b) { return (b.u || 0) - (a.u || 0); }).slice(0, 60);
  return out;
}
var syncing = false, dirty = false;
function saveUD(immediate) {
  if (!S.ud || !S.member) return;
  store.set(udKey(), S.ud);
  dirty = true;
  store.set('outbox', true);
  if (immediate) pushUD(); else pushLater();
}
var pushLater = debounce(function () { pushUD(); }, 2500);
function pushUD() {
  if (!dirty || syncing || !S.token) return;
  syncing = true; dirty = false;
  api('saveUserData', { data: S.ud, baseRev: S.rev }, { noRetry: true }).then(function (r) {
    syncing = false; S.rev = r.rev; store.set(udKey() + '.rev', S.rev); store.del('outbox');
    if (dirty) pushLater();
  }).catch(function (e) {
    syncing = false;
    if (e && e.code === 'CONFLICT') {
      S.ud = mergeUD(S.ud, e.serverData); S.rev = e.rev; store.set(udKey(), S.ud); dirty = true; pushLater(); return;
    }
    dirty = true; setTimeout(pushUD, 15000);
  });
}
function flushOutbox() { if (store.get('outbox', false)) { dirty = true; pushUD(); } }
document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') { flushUsage(); if (dirty) pushUD(); } });
window.addEventListener('pagehide', function () { flushUsage(); if (dirty) pushUD(); });

/* ---------------- usage time tracking ---------------- */
var usageAcc = 0, usageTimer = null, lastActive = Date.now();
function startUsage() {
  if (usageTimer) return;
  usageTimer = setInterval(function () {
    if (document.visibilityState !== 'visible' || !S.ud) return;
    usageAcc++;
    var idle = (S.ud.settings.idle || (S.flags && S.flags.IDLE_MINUTES) || 0);
    if (idle > 0 && Date.now() - lastActive > idle * 60000) { autoLogout(); return; }
    if (usageAcc >= 15) flushUsage();
    var el = document.getElementById('todayTime'); if (el) el.textContent = dur((S.ud.time[dayKey()] || 0) + usageAcc);
  }, 1000);
}
function flushUsage() { if (!S.ud || !usageAcc) return; var k = dayKey(); S.ud.time[k] = (S.ud.time[k] || 0) + usageAcc; usageAcc = 0; saveUD(); }
['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, function () { lastActive = Date.now(); }, { passive: true }); });
function autoLogout() {
  clearInterval(usageTimer); usageTimer = null;
  api('logout', {}).catch(function () {});
  clearSession(); renderLogin(); toast('ออกจากระบบอัตโนมัติ', 'ระบบออกจากระบบให้ เนื่องจากไม่มีการใช้งานตามระยะเวลาที่ท่านกำหนด', 'warn', { life: 8000 });
}

/* ---------------- session lifecycle ---------------- */
function onLoggedIn(r, remember) {
  S.token = r.token; S.member = r.member;
  store.set('token', r.token); store.set('member', r.member);
  if (!remember) { try { sessionStorage.setItem('tll.temp', '1'); } catch (e) {} store.set('tempSession', true); } else store.del('tempSession');
  loadLocalUD();
  var tb = document.getElementById('toasts'); if (tb) tb.innerHTML = '';
  (r.notices || []).forEach(function (n) { addNotice(n, true); });
  renderApp();
  nav('home', { noAnim: false });
  toast('Welcome Back, ' + (r.member.displayName || r.member.firstName), 'ยินดีต้อนรับกลับสู่คลังกฎหมายไทย', 'ok');
  bootstrap(true);
}
function clearSession() {
  S.token = ''; S.member = null; S.ud = null;
  store.del('token'); store.del('member'); store.del('ui');
}
function sessionExpired() {
  if (!S.member) return;
  var u = S.member.username;
  clearSession();
  renderLogin(u);
  toast('สิทธิ์การเข้าใช้งานหมดอายุ', 'กรุณาเข้าสู่ระบบอีกครั้ง ข้อมูลของท่านยังอยู่ครบถ้วน', 'warn', { life: 7000 });
}
function bootstrap(fresh) {
  return api('bootstrap', {}).then(function (r) {
    S.member = r.member; store.set('member', r.member);
    S.flags = r.flags || S.flags; store.set('flags', S.flags);
    if (r.userData) {
      var merged = mergeUD(S.ud || defaultUD(), r.userData);
      S.ud = merged; S.rev = r.rev; store.set(udKey(), S.ud); store.set(udKey() + '.rev', S.rev);
    } else if (fresh) { saveUD(true); }
    (r.announcements || []).forEach(function (a) { addNotice({ id: 'ann-' + a.id, type: a.type || 'news', title: a.title, body: a.body, time: a.time }, true); });
    applySettings();
    renderHeaderBits();
    refreshCurrent();
    if (r.member.accountStatus === 'ปิดใช้งาน') reactivatePrompt();
    if (r.alerts && r.alerts.length) securityAlert(r.alerts[r.alerts.length - 1]);
    flushOutbox();
    if (r.catalogVersion && r.catalogVersion !== S.catVer) loadCatalog(true);
    return true;
  }).catch(function (e) { dlog('bootstrap', e.msg || e.code); return false; });
}
function reactivatePrompt() {
  modal({ title: 'บัญชีของท่านปิดใช้งานชั่วคราว', icon: 'power', tone: 'o', html: '<p class="muted" style="margin-bottom:10px">กรุณากรอกรหัสผ่านส่วนตัวเพื่อเปิดใช้งานบัญชีอีกครั้ง</p>' + pwField('raPass', 'รหัสผ่านส่วนตัว', {}), ok: 'เปิดใช้งานบัญชี', dismiss: false, cancel: 'ออกจากระบบ',
    onOk: function (m) { return api('setAccountStatus', { status: 'ปกติ', password: $('#raPass', m).value }).then(function (r) { toast(r.msg, '', 'ok'); bootstrap(); return true; }).catch(function (e) { setErr('raPass', e.msg); return false; }); }
  }).then(function (ok) { if (!ok) doLogout(true); });
}

/* ป้ายแจ้งเตือนเมื่อตรวจพบการโจมตีบัญชีผู้ใช้งาน */
function securityAlert(a) {
  var name = S.member ? (S.member.title + S.member.firstName + ' ' + S.member.lastName + ' (' + S.member.username + ', ' + S.member.memberId + ')') : '';
  var html = '<div class="prose"><p>เรียน ' + esc(name) + '</p>' +
    '<p>ระบบรักษาความปลอดภัยของคลังกฎหมายไทยตรวจพบเหตุการณ์ที่อาจเป็นการพยายามเข้าถึงบัญชีของท่านโดยไม่ได้รับอนุญาต ประเภทเหตุการณ์คือ “' + esc(a.type) + '” ระดับความรุนแรง ' + esc(a.severity) + ' เมื่อ ' + fmtDateTime(a.time) + ' รายละเอียดที่ตรวจพบ ได้แก่ ' + esc(a.detail) + (a.ip ? ' จากหมายเลข IP ' + esc(a.ip) : '') + (a.location ? ' ตำแหน่งโดยประมาณ ' + esc(a.location) : '') + (a.device ? ' อุปกรณ์ ' + esc(a.device) : '') + ' ระบบได้ดำเนินมาตรการเบื้องต้นแล้ว คือ ' + esc(a.action) + ' และได้จัดทำรายงานเหตุการณ์หมายเลข ' + esc(a.reportId) + ' ส่งถึงผู้ดูแลระบบเรียบร้อยแล้ว</p>' +
    '<p>สาเหตุที่พบบ่อยของเหตุการณ์ลักษณะนี้ ได้แก่ การที่บุคคลอื่นทราบชื่อผู้ใช้งานของท่านและพยายามสุ่มรหัสผ่าน การใช้รหัสผ่านซ้ำกับเว็บไซต์อื่นที่เคยมีข้อมูลรั่วไหล หรือการเข้าสู่ระบบจากอุปกรณ์สาธารณะแล้วไม่ได้ออกจากระบบ</p>' +
    '<p>หากท่านกด “ยืนยัน” ระบบจะลบข้อมูลทั้งหมดที่จัดเก็บไว้บนอุปกรณ์นี้ทันที และตัดการเชื่อมต่อของบัญชีจากทุกอุปกรณ์ เพื่อป้องกันข้อมูลรั่วไหล ข้อมูลบัญชีบนเซิร์ฟเวอร์จะถูกเก็บรักษาไว้อย่างปลอดภัยโดยผู้ดูแลระบบ หลังจากนั้นกรุณาเข้าสู่ระบบใหม่และเปลี่ยนรหัสผ่านส่วนตัวทันที หากท่านเป็นผู้กรอกรหัสผ่านผิดด้วยตนเอง สามารถกด “ยกเลิก” ได้</p></div>';
  modal({ title: 'แจ้งเตือนความปลอดภัยของบัญชี', sub: 'รายงานหมายเลข ' + a.reportId, icon: 'shield', tone: 'bad', html: html, wide: true, ok: 'ยืนยัน', cancel: 'ยกเลิก', danger: true, dismiss: false }).then(function (ok) {
    if (!ok) return;
    withLoading('กำลังป้องกันบัญชีของท่าน', api('secureAccount', { reportId: a.reportId })).catch(function () {}).then(function () {
      store.wipe(); S.token = ''; S.member = null; S.ud = null;
      renderLogin(); alertBox('ดำเนินการเรียบร้อยแล้ว', 'ระบบลบข้อมูลบนอุปกรณ์นี้และตัดการเชื่อมต่อทุกอุปกรณ์แล้ว กรุณาเข้าสู่ระบบใหม่และเปลี่ยนรหัสผ่านส่วนตัวทันที', { icon: 'shieldCheck' });
    });
  });
}
function doLogout(skipConfirm) {
  var go2 = function () {
    flushUsage();
    var p = dirty ? api('saveUserData', { data: S.ud, baseRev: S.rev }, { noRetry: true }).catch(function () {}) : Promise.resolve();
    withLoading('กำลังออกจากระบบ', p.then(function () { return api('logout', {}).catch(function () {}); })).then(function () {
      var u = S.member && S.member.username;
      clearInterval(usageTimer); usageTimer = null;
      clearSession(); renderWelcome(); toast('ออกจากระบบเรียบร้อยแล้ว', 'ขอบคุณที่ใช้บริการคลังกฎหมายไทย', 'ok');
      store.set('lastUser', u || '');
    });
  };
  if (skipConfirm === true) return go2();
  confirmBox('ยืนยันการออกจากระบบ', 'ข้อมูลทั้งหมดของท่านถูกบันทึกเรียบร้อยแล้ว ท่านต้องการออกจากระบบหรือไม่', { icon: 'logout' }).then(function (ok) { if (ok) go2(); });
}

/* ---------------- settings application (theme fades gradually) ---------------- */
function applySettings() {
  if (!S.ud) return;
  var st = S.ud.settings, root = document.documentElement;
  if (root.getAttribute('data-theme') !== st.theme) {
    document.body.classList.add('theme-anim');
    root.setAttribute('data-theme', st.theme);
    setTimeout(function () { document.body.classList.remove('theme-anim'); }, 800);
  }
  root.style.setProperty('--scale', clamp(+st.fontScale || 1, 0.85, 2));
  document.body.classList.toggle('reduce-motion', !!st.reduceMotion || SAFE_MODE);
  document.body.classList.toggle('compact', st.density === 'compact');
  root.setAttribute('lang', st.lang === 'ko' ? 'ko' : st.lang === 'en' ? 'en' : 'th');
  store.set('theme', st.theme);
}

/* ---------------- notifications ---------------- */
function addNotice(n, silent) {
  if (!S.ud) return;
  n.id = n.id || uid(); n.time = n.time || new Date().toISOString();
  if (S.ud.notices.some(function (x) { return x.id === n.id; })) return;
  if (!S.ud.settings.notif.all) return;
  if (n.type === 'security' && n.title && /อุปกรณ์ใหม่/.test(n.title) && !S.ud.settings.notif.device) return;
  if (n.type === 'password' && !S.ud.settings.notif.password) return;
  if (n.type === 'news' && !S.ud.settings.notif.news) return;
  S.ud.notices.unshift(n); S.ud.notices = S.ud.notices.slice(0, 200);
  saveUD(); renderHeaderBits();
  if (!silent && S.ud.settings.notif.inapp) toast(n.title, n.body, n.type === 'security' ? 'warn' : '');
}
function unreadCount() { if (!S.ud) return 0; return S.ud.notices.filter(function (n) { return !S.ud.readNotices[n.id]; }).length; }

/* ---------------- shell ---------------- */
function avatarHtml(size) {
  var m = S.member || {};
  if (m.avatar) return '<img class="avatar" src="' + esc(m.avatar) + '" alt="" style="width:' + size + 'px;height:' + size + 'px">';
  var ini = (m.firstName || m.username || '?').trim().charAt(0);
  return '<span class="avatar" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.42) + 'px">' + esc(ini) + '</span>';
}
function renderApp() {
  document.body.classList.remove('readable');
  ROOT.innerHTML = '<div id="netBar"></div>' + (SAFE_MODE ? '<div class="safe-bar">ระบบทำงานในโหมดปลอดภัย ฟีเจอร์เสริมบางส่วนถูกปิดชั่วคราวเพื่อความเสถียร</div>' : '') +
    '<header class="app-head"><div class="wrap">' +
      '<button class="icon-btn" id="btnMenu" aria-label="เมนูหลัก">' + ic('menu') + '</button>' +
      '<button class="brand" id="btnBrand"><img src="' + LOGO + '" alt=""><span><span class="t1">THAI LAW LIBRARY</span><br><span class="t2">คลังกฎหมายไทย</span></span></button>' +
      '<span class="spacer"></span>' +
      '<button class="icon-btn" id="btnSearch" aria-label="ค้นหา">' + ic('search') + '</button>' +
      '<button class="icon-btn" id="btnAI" aria-label="ผู้ช่วย AI" title="ผู้ช่วย AI">' + ic('ai') + '</button>' +
      '<button class="icon-btn" id="btnBell" aria-label="การแจ้งเตือน">' + ic('bell') + '<span class="badge-dot hidden" id="bellDot"></span></button>' +
      '<button class="icon-btn" id="btnGear" aria-label="การตั้งค่า">' + ic('gear') + '</button>' +
    '</div></header>' +
    '<main class="main"><div class="wrap" id="view"></div></main>' +
    '<nav class="tabbar" aria-label="เมนูหลัก"><div class="pill" id="tabPill"><span class="ind" id="tabInd"></span>' +
      TABS.map(function (tb) { return '<button class="tab" data-tab="' + tb[0] + '" aria-label="' + tr(tb[0]) + '">' + ic(tb[1]) + '<span class="lb">' + tr(tb[0]) + '</span></button>'; }).join('') +
    '</div><button class="tab-me" data-tab="profile" id="tabMe" aria-label="' + tr('profile') + '">' + avatarHtml(54) + '</button></nav>';
  $('#btnMenu').onclick = openMainMenu;
  $('#btnBrand').onclick = function () { nav('home'); };
  $('#btnGear').onclick = function () { openSettings(); };
  $('#btnBell').onclick = function () { nav('notifications'); };
  $('#btnAI').onclick = function () { nav('ai'); };
  $('#btnSearch').onclick = function () { openQuickSearch(); };
  on($('.tabbar'), 'click', '[data-tab]', function (e, b) { SND.click(); tap(); nav(b.getAttribute('data-tab')); });
  renderHeaderBits(); renderNetBar(); startUsage();
  window.addEventListener('resize', debounce(moveIndicator, 120));
}
function renderHeaderBits() {
  var d = document.getElementById('bellDot'); if (d) { var n = unreadCount(); d.textContent = n > 99 ? '99+' : n; d.classList.toggle('hidden', !n); }
  var me = document.getElementById('tabMe'); if (me) me.innerHTML = avatarHtml(54);
  $$('.tab[data-tab]').forEach(function (b) { var k = b.getAttribute('data-tab'); var lb = b.querySelector('.lb'); if (lb) lb.textContent = tr(k); b.setAttribute('aria-label', tr(k)); });
}
function moveIndicator() {
  var ind = document.getElementById('tabInd'), pill = document.getElementById('tabPill'); if (!ind || !pill) return;
  var act = pill.querySelector('.tab.on');
  if (!act) { ind.style.width = '0'; ind.style.height = ''; return; }
  var vertical = getComputedStyle(document.querySelector('.tabbar')).flexDirection === 'column';
  setTimeout(function () {
    if (vertical) { ind.style.transform = 'translateY(' + act.offsetTop + 'px)'; ind.style.height = act.offsetHeight + 'px'; }
    else { ind.style.transform = 'translateX(' + act.offsetLeft + 'px)'; ind.style.width = act.offsetWidth + 'px'; }
    act.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, 30);
  clearTimeout(moveIndicator.t2); moveIndicator.t2 = setTimeout(function () { if (vertical) { ind.style.transform = 'translateY(' + act.offsetTop + 'px)'; ind.style.height = act.offsetHeight + 'px'; } else { ind.style.transform = 'translateX(' + act.offsetLeft + 'px)'; ind.style.width = act.offsetWidth + 'px'; } }, 460);
}

/* ---------------- router with error boundary ---------------- */
function nav(view, opt) {
  opt = opt || {};
  if (!VIEWS[view]) view = 'home';
  closeFocus();
  S.ui.view = view; store.set('ui', S.ui);
  $$('.tab[data-tab]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === view); });
  var me = document.getElementById('tabMe'); if (me) me.classList.toggle('on', view === 'profile');
  moveIndicator();
  renderView(view, opt);
  if (!opt.keepScroll) window.scrollTo({ top: 0, behavior: opt.noAnim ? 'auto' : 'smooth' });
}
var crashCount = 0;
function renderView(view, opt) {
  var box = document.getElementById('view'); if (!box) return;
  document.body.classList.toggle('readable', view === 'home' || view === 'treaties' || view === 'help');
  try {
    box.innerHTML = '';
    var el = document.createElement('div');
    if (!(opt && opt.noAnim)) el.className = 'enter';
    box.appendChild(el);
    VIEWS[view](el, opt || {});
    observeRise(el);
  } catch (err) {
    crashCount++;
    reportError('view:' + view, err);
    box.innerHTML = '<div class="panel"><div class="empty warn"><div class="eic">' + ic('alert') + '</div><h3>ส่วนนี้ขัดข้องชั่วคราว</h3><p>ระบบพบข้อผิดพลาดระหว่างแสดงผลหน้านี้ และได้บันทึกรายละเอียดส่งถึงผู้ดูแลระบบแล้ว ส่วนอื่นของเว็บไซต์ยังใช้งานได้ตามปกติ ข้อมูลของท่านไม่ได้รับผลกระทบ</p><div class="row wrapr" style="justify-content:center"><button class="btn k" id="ebRetry">' + ic('refresh') + ' ลองอีกครั้ง</button><button class="btn" id="ebHome">' + ic('home') + ' กลับหน้าหลัก</button><button class="btn" id="ebReport">' + ic('bug') + ' แจ้งปัญหา</button></div></div></div>';
    $('#ebRetry').onclick = function () { renderView(view, opt); };
    $('#ebHome').onclick = function () { nav('home'); };
    $('#ebReport').onclick = function () { reportDialog('แจ้งปัญหาการใช้งาน', 'หน้า ' + view + ' แสดงผลไม่ได้: ' + (err && err.message)); };
    if (crashCount >= 3 && !SAFE_MODE) { store.set('safeMode', true); toast('เปิดโหมดปลอดภัยอัตโนมัติ', 'ระบบปิดฟีเจอร์เสริมชั่วคราวเพื่อให้ใช้งานได้ต่อเนื่อง', 'warn'); }
  }
}
function refreshCurrent() { if (S.ui && S.ui.view && document.getElementById('view')) renderView(S.ui.view, { noAnim: true, keepScroll: true }); }

/* ---------------- hamburger main menu ---------------- */
function openMainMenu() {
  drawer('left', function (d, close) {
    var items = [['home', 'home', 'หน้าหลักและแดชบอร์ด'], ['content', 'book', 'กฎหมายทั้ง 5 หมวด และป้ายพลิกมาตรา'], ['treaties', 'globe', 'อนุสัญญาและสนธิสัญญาระหว่างประเทศ'], ['saved', 'bookmark', 'รายการโปรดและคลังเอกสารส่วนตัว'], ['history', 'history', 'ประวัติการเข้าใช้งานแยกตามวัน เดือน ปี'], ['time', 'clock', 'สถิติเวลาการใช้งาน'], ['profile', 'user', 'ข้อมูลสมาชิก'],
      ['ai', 'ai', 'ถาม-ตอบ ค้นคว้า และสรุปเนื้อหา'], ['notes', 'note', 'จดบันทึก จัดรูปแบบ และพิมพ์ PDF'], ['tools', 'wrench', 'พจนานุกรม คำย่อ คำนวณระยะเวลา และอื่น ๆ'], ['notifications', 'bell', 'ศูนย์การแจ้งเตือน'], ['pricing', 'card', 'ทดลองใช้ 7 วัน และแพ็กเกจรายเดือน/รายปี'], ['help', 'help', 'คู่มือ คำถามที่พบบ่อย และติดต่อผู้ดูแลระบบ']];
    d.innerHTML = '<div class="drawer-head"><img src="' + LOGO + '" alt="" style="width:40px;height:40px;border-radius:50%;background:#fff"><div class="grow"><b>' + tr('menu') + '</b><div class="tiny muted">THAI LAW LIBRARY</div></div><button class="icon-btn" data-x aria-label="ปิด">' + ic('x') + '</button></div>' +
      '<div class="drawer-body"><div class="menu-list">' + items.map(function (it) { return '<button class="menu-item" data-v="' + it[0] + '"><span class="mi">' + ic(it[1]) + '</span><span class="grow"><span class="mt">' + tr(it[0]) + '</span><br><span class="ms">' + esc(it[2]) + '</span></span>' + ic('chevR', 'chev') + '</button>'; }).join('') +
      '<div class="divider"></div><button class="menu-item" data-doc="about"><span class="mi">' + ic('info') + '</span><span class="mt">' + tr('about') + '</span></button><button class="menu-item" data-doc="privacy"><span class="mi">' + ic('shield') + '</span><span class="mt">' + tr('privacy') + '</span></button><button class="menu-item" data-doc="terms"><span class="mi">' + ic('file') + '</span><span class="mt">' + tr('terms') + '</span></button>' +
      '<button class="menu-item danger" data-logout><span class="mi">' + ic('logout') + '</span><span class="mt">' + tr('logout') + '</span></button></div></div>';
    d.querySelector('[data-x]').onclick = close;
    on(d, 'click', '[data-v]', function (e, b) { close(); nav(b.getAttribute('data-v')); });
    on(d, 'click', '[data-logout]', function () { close(); doLogout(); });
  });
}

/* ---------------- catalog ---------------- */
var catPromise = null;
function loadCatalog(force) {
  if (catPromise && !force) return catPromise;
  catPromise = api('getCatalog', { version: force ? '' : S.catVer }, { timeout: 40000 }).then(function (r) {
    if (!r.unchanged && r.catalog) {
      S.catalog = r.catalog; S.catVer = r.version;
      store.set('catalog', S.catalog); store.set('catVer', S.catVer);
      indexCatalog(); refreshCurrent();
    }
    return S.catalog;
  }).catch(function (e) { catPromise = null; if (!S.catalog) toast('ยังไม่สามารถโหลดฐานข้อมูลกฎหมายได้', e.msg, 'warn'); return S.catalog; });
  return catPromise;
}
var LAWS = {}, SECS = {}, SECS_BY_LAW = {};
function indexCatalog() {
  LAWS = {};
  if (!S.catalog) return;
  S.catalog.laws.forEach(function (l) { LAWS[l.id] = l; if (!SECS_BY_LAW[l.id]) SECS_BY_LAW[l.id] = []; });
  if (typeof LAW_LOADED !== 'undefined' && indexCatalog.ver !== S.catVer) { LAW_LOADED = {}; IDS_TRIED = {}; }
  indexCatalog.ver = S.catVer;
  addSections(S.catalog.sections || []);
}
function allSecs() { return Object.keys(SECS).map(function (k) { return SECS[k]; }); }
function secNum(no) { var p = String(no).split('/'); return (parseFloat(thaiDigitsToArabic(p[0])) || 0) * 1000 + (parseFloat(p[1]) || 0); }
function secCmp(a, b) { return secNum(a.no) - secNum(b.no); }
function lawShort(l) { return l ? (l.short || l.title) : ''; }
function addSections(list) {
  var touched = {};
  (list || []).forEach(function (s) {
    if (SECS[s.id]) { Object.assign(SECS[s.id], s); return; }
    SECS[s.id] = s; (SECS_BY_LAW[s.law] = SECS_BY_LAW[s.law] || []).push(s); touched[s.law] = 1;
  });
  Object.keys(touched).forEach(function (k) { SECS_BY_LAW[k].sort(secCmp); });
}
var LAW_LOADED = {}, LAW_LOADING = {}, IDS_TRIED = {};
function ensureLaw(id) {
  if (LAW_LOADED[id]) return Promise.resolve(true);
  if (LAW_LOADING[id]) return LAW_LOADING[id];
  var ck = 'law.' + id, cached = store.get(ck, null);
  if (cached && cached.v === S.catVer) { addSections(cached.s); LAW_LOADED[id] = 1; return Promise.resolve(true); }
  LAW_LOADING[id] = api('getSections', { law: id }, { timeout: 45000 }).then(function (r) {
    addSections(r.sections); LAW_LOADED[id] = 1; delete LAW_LOADING[id];
    var lru = store.get('lawLru', []).filter(function (x) { return x !== id; }); lru.unshift(id);
    lru.slice(25).forEach(function (old) { store.del('law.' + old); });
    store.set('lawLru', lru.slice(0, 25));
    store.set(ck, { v: S.catVer, s: r.sections });
    return true;
  }).catch(function (e) { delete LAW_LOADING[id]; toast('โหลดตัวบทไม่สำเร็จ', e.msg, 'warn'); return false; });
  return LAW_LOADING[id];
}
/* ดึงมาตราที่ยังไม่มีในเครื่อง (เช่น รายการโปรด/ประวัติ) แล้วแสดงผลใหม่ */
function ensureIds(ids, cb) {
  var miss = (ids || []).filter(function (id) { return id && !SECS[id] && !IDS_TRIED[id]; });
  if (!miss.length) return false;
  miss.forEach(function (id) { IDS_TRIED[id] = 1; });
  api('sectionsByIds', { ids: miss.slice(0, 200) }).then(function (r) { addSections(r.sections); if (cb) cb(); }).catch(function () {});
  return true;
}

/* ---------------- search engine (ชื่อกฎหมาย / เลขมาตรา / ข้อความ / ปี / ประเภท) ---------------- */
function searchAll(q, opt) {
  opt = opt || {};
  var res = { laws: [], sections: [] };
  if (!S.catalog) return res;
  q = thaiDigitsToArabic(String(q || '').trim());
  if (!q && !opt.cat && !opt.year) return res;
  var secMatch = q.match(/(?:มาตรา|ม\.)\s*([0-9]+(?:\/[0-9]+)?)/);
  var bareNo = /^[0-9]+(?:\/[0-9]+)?$/.test(q) ? q : null;
  var no = secMatch ? secMatch[1] : bareNo;
  var rest = norm(q.replace(/(?:มาตรา|ม\.)\s*[0-9]+(?:\/[0-9]+)?/, ''));
  var yearQ = (q.match(/(?:พ\.ศ\.|ปี)\s*(\d{4})/) || [])[1] || opt.year;
  S.catalog.laws.forEach(function (l) {
    if (opt.cat && l.cat !== opt.cat) return;
    if (yearQ && String(l.year) !== String(yearQ)) return;
    var hay = norm(l.title + ' ' + (l.short || '') + ' ' + l.year);
    if (!q || (rest && hay.indexOf(rest) > -1) || (!no && hay.indexOf(norm(q)) > -1)) res.laws.push(l);
  });
  allSecs().forEach(function (s) {
    var l = LAWS[s.law]; if (!l) return;
    if (opt.cat && l.cat !== opt.cat) return;
    if (yearQ && String(l.year) !== String(yearQ)) return;
    if (no) {
      if (String(s.no) !== no) return;
      if (rest && norm(l.title + ' ' + (l.short || '')).indexOf(rest) < 0 && norm(s.name).indexOf(rest) < 0) return;
      res.sections.push(s); return;
    }
    if (q && (norm(s.name).indexOf(norm(q)) > -1 || norm(s.text).indexOf(norm(q)) > -1 || norm(s.tags).indexOf(norm(q)) > -1)) res.sections.push(s);
  });
  if (opt.sort === 'az') res.laws.sort(function (a, b) { return a.title.localeCompare(b.title, 'th'); });
  if (opt.sort === 'year') res.laws.sort(function (a, b) { return (+b.year || 0) - (+a.year || 0); });
  return res;
}
function recordSearch(q) {
  if (!S.ud || !q) return;
  S.ud.searches = [{ q: q, t: Date.now() }].concat(S.ud.searches.filter(function (x) { return x.q !== q; })).slice(0, 50);
  saveUD();
}
function suggestions(q) {
  var out = [], nq = norm(q); if (!S.catalog || !nq) return out;
  S.catalog.laws.forEach(function (l) { if (norm(l.title).indexOf(nq) > -1 && out.length < 6) out.push(l.title); });
  allSecs().forEach(function (s) { if (norm(s.name).indexOf(nq) > -1 && out.length < 10) out.push(lawShort(LAWS[s.law]) + ' มาตรา ' + s.no + ' ' + s.name); });
  return out;
}

/* quick search + advanced search */
function openQuickSearch(initial) {
  modal({ title: 'ค้นหากฎหมาย', icon: 'search', wide: true, ok: 'ปิด', cancel: false, html:
    '<div class="input">' + ic('search') + '<input id="qsIn" list="qsList" placeholder="เช่น มาตรา 420, ละเมิด, ประมวลกฎหมายอาญา, พ.ศ. 2560" value="' + esc(initial || '') + '"><datalist id="qsList"></datalist></div>' +
    '<details class="acc" style="margin-top:10px"><summary>' + ic('filter') + ' ค้นหาแบบละเอียด' + ic('chevD', 'chev') + '</summary><div class="acc-b grid g3">' +
      '<div class="field"><label for="qsCat">ประเภทกฎหมาย</label><div class="input"><select id="qsCat"><option value="">ทุกประเภท</option>' + CATS.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="field"><label for="qsYear">ปี พ.ศ.</label><div class="input"><input id="qsYear" inputmode="numeric" maxlength="4" placeholder="เช่น 2560"></div></div>' +
      '<div class="field"><label for="qsSort">เรียงลำดับ</label><div class="input"><select id="qsSort"><option value="">ความเกี่ยวข้อง</option><option value="az">ชื่อ ก-ฮ</option><option value="year">ปีล่าสุด</option></select></div></div></div></details>' +
    '<div id="qsRecent" style="margin-top:10px"></div><div id="qsRes" style="margin-top:10px"></div>',
    onOpen: function (m, ctl) {
      var inp = $('#qsIn', m);
      function run() {
        var q = inp.value.trim(), opt = { cat: $('#qsCat', m).value, year: $('#qsYear', m).value.trim(), sort: $('#qsSort', m).value };
        $('#qsList', m).innerHTML = suggestions(q).map(function (s) { return '<option value="' + esc(s) + '">'; }).join('');
        var r = searchAll(q, opt), box = $('#qsRes', m);
        $('#qsRecent', m).innerHTML = (!q && S.ud && S.ud.searches.length) ? '<div class="muted small" style="margin-bottom:6px">ค้นหาล่าสุด</div><div class="hscroll">' + S.ud.searches.slice(0, 10).map(function (x) { return '<button class="chip" data-q="' + esc(x.q) + '">' + ic('history') + esc(x.q) + '</button>'; }).join('') + '</div>' : '';
        if (!q && !opt.cat && !opt.year) { box.innerHTML = ''; return; }
        if (!r.laws.length && !r.sections.length) { box.innerHTML = '<div class="empty"><div class="eic">' + ic('search') + '</div><h3>ไม่พบผลการค้นหา</h3><p>ไม่พบกฎหมายหรือมาตราที่ตรงกับ “' + esc(q) + '” กรุณาตรวจสอบตัวสะกด ลองใช้คำที่สั้นลง หรือเลือกประเภทกฎหมายใหม่</p></div>'; return; }
        box.innerHTML = '<div class="col anim-list">' + r.sections.slice(0, 30).map(function (s) { var l = LAWS[s.law]; return '<button class="law-item" data-sec="' + esc(s.id) + '"><span class="li-ic">' + ic('file') + '</span><span class="grow"><span class="li-t">' + highlight(esc(lawShort(l) + ' มาตรา ' + s.no + ' ' + s.name), q) + '</span><br><span class="li-s">' + highlight(esc(s.text.slice(0, 120)), q) + '…</span></span>' + ic('chevR') + '</button>'; }).join('') +
          r.laws.slice(0, 20).map(function (l) { return '<button class="law-item" data-law="' + esc(l.id) + '"><span class="li-ic">' + ic(CAT_ICON[l.cat] || 'book') + '</span><span class="grow"><span class="li-t">' + highlight(esc(l.title), q) + '</span><br><span class="li-s">' + esc(l.cat) + ' · ' + (l.n || (SECS_BY_LAW[l.id] || []).length) + ' มาตรา</span></span>' + ic('chevR') + '</button>'; }).join('') + '</div>';
      }
      var srvDone = {};
      var srv = debounce(function () {
        var q = inp.value.trim(); var key = q + '|' + $('#qsCat', m).value;
        if (q.length < 2 || srvDone[key]) return; srvDone[key] = 1;
        api('searchSections', { q: thaiDigitsToArabic(q).replace(/^(มาตรา|ม\.)\s*/, ''), cat: $('#qsCat', m).value }).then(function (r) { if (r.sections && r.sections.length) { addSections(r.sections); if (m.isConnected) run(); } }).catch(function () {});
      }, 450);
      var deb = debounce(function () { run(); srv(); }, 180);
      inp.addEventListener('input', deb); $$('select,#qsYear', m).forEach(function (s) { s.addEventListener('input', deb); s.addEventListener('change', deb); });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { recordSearch(inp.value.trim()); run(); } });
      on(m, 'click', '[data-q]', function (e, b) { inp.value = b.getAttribute('data-q'); run(); });
      on(m, 'click', '[data-sec]', function (e, b) { recordSearch(inp.value.trim()); ctl.close(false); openFocus(b.getAttribute('data-sec')); });
      on(m, 'click', '[data-law]', function (e, b) { recordSearch(inp.value.trim()); ctl.close(false); var l = LAWS[b.getAttribute('data-law')]; S.ui.content = { cat: l.cat, q: l.title, law: l.id }; store.set('ui', S.ui); nav('content'); });
      run();
    } });
}

/* =======================================================================
   VIEW: HOME (Dashboard + รายละเอียดเว็บไซต์แบบยาวเป็นกรอบ)
   ======================================================================= */
VIEWS.home = function (el) {
  var m = S.member || {}, ud = S.ud;
  var favCount = Object.keys(ud.favorites).length;
  var recent = ud.history.slice(0, 6);
  var popular = Object.keys(ud.opens).sort(function (a, b) { return ud.opens[b] - ud.opens[a]; }).slice(0, 5);
  var latest = S.catalog ? S.catalog.laws.slice().sort(function (a, b) { return String(b.updated).localeCompare(String(a.updated)); }).slice(0, 5) : [];
  var catUse = {}; ud.history.forEach(function (h) { var s = SECS[h.id]; if (s && LAWS[s.law]) catUse[LAWS[s.law].cat] = (catUse[LAWS[s.law].cat] || 0) + 1; });
  var plan = m.plan || {};
  ensureIds(recent.map(function (x) { return x.id; }).concat(popular), refreshCurrent);
  el.innerHTML =
    '<section class="panel corner" style="margin-bottom:18px"><div class="row wrapr" style="gap:16px;align-items:center">' + avatarHtml(72) +
      '<div class="grow"><div class="muted small" id="homeClock">' + fmtDate(new Date(), true) + ' · ' + fmtTime(new Date()) + '</div><h2>สวัสดี ' + esc(m.displayName || m.firstName || '') + '</h2><div class="row wrapr small" style="gap:6px;margin-top:4px"><span class="tag k">' + esc(m.memberId || '') + '</span><span class="tag">' + esc(m.memberType || '') + '</span>' + (plan.trial ? '<span class="tag o">ทดลองใช้งาน เหลือ ' + plan.daysLeft + ' วัน</span>' : plan.tier === 'free' ? '<span class="tag bad">หมดระยะทดลองใช้งาน</span>' : '<span class="tag ok">แพ็กเกจ ' + esc(plan.tier) + '</span>') + '</div></div></div>' +
      '<div class="input" style="margin-top:16px;cursor:text" id="homeSearch">' + ic('search') + '<input placeholder="ค้นหากฎหมายแบบรวดเร็ว เช่น มาตรา 420 หรือ ละเมิด" readonly></div></section>' +
    '<div class="grid g4" style="margin-bottom:18px">' +
      '<div class="stat k"><span class="sl">เอกสารที่บันทึกไว้</span><span class="sv">' + favCount + '</span></div>' +
      '<div class="stat o"><span class="sl">เวลาใช้งานวันนี้</span><span class="sv" style="font-size:1.1rem" id="todayTime">' + dur(ud.time[dayKey()] || 0) + '</span></div>' +
      '<div class="stat"><span class="sl">มาตราที่เปิดอ่านทั้งหมด</span><span class="sv">' + Object.keys(ud.opens).length + '</span></div>' +
      '<div class="stat"><span class="sl">กฎหมายในฐานข้อมูล</span><span class="sv">' + (S.catalog ? S.catalog.laws.length : '—') + '</span></div></div>' +
    '<div class="grid g2" style="margin-bottom:18px">' +
      homeBox('bell', 'ประกาศจากผู้ดูแลระบบ', ud.notices.filter(function (n) { return n.type === 'news'; }).slice(0, 3).map(function (n) { return '<div class="entry"><span class="grow"><span class="et">' + esc(n.title) + '</span><br><span class="es">' + esc(n.body) + '</span></span></div>'; }).join(''), 'ยังไม่มีประกาศใหม่') +
      homeBox('history', 'เอกสารที่เปิดอ่านล่าสุด', recent.map(function (hh) { return secEntry(hh.id, fmtDateTime(hh.t)); }).join(''), 'ยังไม่มีประวัติการเปิดอ่าน เริ่มต้นได้ที่เมนูเนื้อหา') +
      homeBox('star', 'มาตราที่ท่านเปิดอ่านบ่อย', popular.map(function (id) { return secEntry(id, 'เปิดอ่าน ' + ud.opens[id] + ' ครั้ง'); }).join(''), 'ระบบจะจัดอันดับให้อัตโนมัติเมื่อท่านเริ่มใช้งาน') +
      homeBox('layers', 'กฎหมายที่เพิ่มหรือปรับปรุงล่าสุด', latest.map(function (l) { return '<button class="entry law-open" data-law="' + esc(l.id) + '" style="width:100%;text-align:left"><span class="grow"><span class="et">' + esc(l.title) + '</span><br><span class="es">' + esc(l.cat) + ' · ' + fmtDate(l.updated) + '</span></span>' + ic('chevR') + '</button>'; }).join(''), 'กำลังโหลดฐานข้อมูล') +
      homeBox('list', 'หมวดหมู่กฎหมายที่ใช้งานบ่อย', CATS.slice().sort(function (a, b) { return (catUse[b] || 0) - (catUse[a] || 0); }).map(function (c) { return '<button class="entry cat-open" data-cat="' + esc(c) + '" style="width:100%;text-align:left"><span class="li-ic" style="width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:var(--sky-100);color:var(--sky-700)">' + ic(CAT_ICON[c]) + '</span><span class="grow et">' + esc(c) + '</span><span class="es">' + (catUse[c] || 0) + ' ครั้ง</span></button>'; }).join(''), '') +
      homeBox('search', 'ประวัติการค้นหาล่าสุด', ud.searches.slice(0, 6).map(function (x) { return '<button class="entry search-again" data-q="' + esc(x.q) + '" style="width:100%;text-align:left"><span class="grow et">' + esc(x.q) + '</span><span class="es">' + fmtDateTime(x.t) + '</span></button>'; }).join(''), 'ยังไม่มีประวัติการค้นหา') +
    '</div>' +
    '<div class="view-head"><div><h2>เกี่ยวกับคลังกฎหมายไทย</h2><p class="sub">เหตุผลในการจัดทำ แนวคิด และวิธีใช้งานอย่างละเอียด</p></div></div>' +
    '<div class="grid g2">' + HOME_ARTICLES.map(function (a, i) { return '<article class="panel corner rise ' + (i % 3 === 1 ? 'o' : '') + '"><div class="panel-title"><span class="ic ' + (i % 3 === 1 ? 'o' : i % 3 === 2 ? 'k' : '') + '">' + ic(a[0]) + '</span><h3>' + esc(a[1]) + '</h3></div><div class="prose">' + readMore(a[2], 6) + '</div></article>'; }).join('') + '</div>' +
    '<p class="credit-note" style="margin-top:18px">หมายเหตุ: ภาพประกอบในเว็บไซต์ใช้เฉพาะภาพที่เจ้าของอนุญาตตามสัญญาอนุญาตของแหล่งภาพ พร้อมระบุเครดิตทุกภาพ</p>';
  $('#homeSearch', el).onclick = function () { openQuickSearch(); };
  on(el, 'click', '[data-sec]', function (e, b) { openFocus(b.getAttribute('data-sec')); });
  on(el, 'click', '.law-open', function (e, b) { var l = LAWS[b.getAttribute('data-law')]; if (!l) return; S.ui.content = { cat: l.cat, q: l.title, law: l.id }; store.set('ui', S.ui); nav('content'); });
  on(el, 'click', '.cat-open', function (e, b) { S.ui.content = { cat: b.getAttribute('data-cat'), q: '', law: '' }; store.set('ui', S.ui); nav('content'); });
  on(el, 'click', '.search-again', function (e, b) { openQuickSearch(b.getAttribute('data-q')); });
  var ck = setInterval(function () { var c = document.getElementById('homeClock'); if (!c) { clearInterval(ck); return; } c.textContent = fmtDate(new Date(), true) + ' · ' + fmtTime(new Date()); }, 1000);
};
function homeBox(icon, title, inner, empty) {
  return '<section class="panel rise"><div class="panel-title"><span class="ic">' + ic(icon) + '</span><h3>' + esc(title) + '</h3></div>' + (inner || '<p class="muted small">' + esc(empty) + '</p>') + '</section>';
}
function secEntry(id, sub) {
  var s = SECS[id]; if (!s) return '';
  return '<button class="entry" data-sec="' + esc(id) + '" style="width:100%;text-align:left"><span class="grow"><span class="et">' + esc(lawShort(LAWS[s.law])) + ' มาตรา ' + esc(s.no) + ' ' + esc(s.name) + '</span><br><span class="es">' + esc(sub) + '</span></span>' + ic('chevR') + '</button>';
}
var HOME_ARTICLES = [
  ['info', 'เหตุผลในการจัดทำเว็บไซต์', '<p>การศึกษากฎหมายไทยในปัจจุบันต้องอาศัยการเข้าถึงตัวบทที่ถูกต้องและเป็นปัจจุบัน แต่ข้อมูลกฎหมายกระจายอยู่ในหลายแหล่ง บางแหล่งไม่ได้ปรับปรุงตามการแก้ไขเพิ่มเติม และการค้นหามาตราที่ต้องการในเวลาอันสั้นยังเป็นเรื่องยากสำหรับผู้เริ่มต้น คลังกฎหมายไทยจึงจัดทำขึ้นเพื่อรวมกฎหมายทั้งห้าหมวดไว้ในที่เดียว จัดรูปแบบให้อ่านง่ายตามแบบเอกสารราชการ และเพิ่มเครื่องมือที่ช่วยให้การทบทวนบทบัญญัติเป็นกิจวัตรที่ทำได้จริง</p><p>ผู้จัดทำเชื่อว่าความเข้าใจกฎหมายที่ดีเริ่มจากการอ่านตัวบทอย่างสม่ำเสมอ เว็บไซต์นี้จึงไม่ได้มุ่งให้ผู้ใช้จดจำคำอธิบายของผู้อื่น แต่มุ่งให้ผู้ใช้กลับไปหาตัวบทได้ทุกครั้งที่ต้องการ ทั้งในห้องเรียน ในการเตรียมสอบ และในการปฏิบัติงานจริง</p>'],
  ['book', 'การใช้งานเมนูเนื้อหาและป้ายพลิกมาตรา', '<p>เมนูเนื้อหาแบ่งกฎหมายเป็นห้าหมวด ได้แก่ รัฐธรรมนูญ พระราชบัญญัติประกอบรัฐธรรมนูญ พระราชบัญญัติและพระราชกำหนด ประกาศคณะปฏิวัติและคณะรัฐประหาร และประมวลกฎหมาย ผู้ใช้ต้องเลือกหมวดก่อน แล้วพิมพ์ชื่อกฎหมายในช่องค้นหา ระบบจะแสดงรายชื่อกฎหมายที่ตรงกันเป็นกรอบ เมื่อกดกรอบของกฎหมายที่ต้องการ ระบบจึงแสดงป้ายพลิกมาตราของกฎหมายฉบับนั้นทั้งหมด</p><p>ป้ายพลิกแต่ละใบแสดงเลขมาตราและชื่อมาตราตามที่ใช้เรียกกันในวงวิชาการ กดปุ่ม “พลิก” ที่มุมขวาล่างเพื่ออ่านตัวบท กดปุ่มลูกศรมุมขวาบนเพื่อขยายดูป้ายเพียงใบเดียวแบบเต็มหน้าจอ กดปุ่มจับเวลาเพื่อฝึกท่องจำ และกดปุ่มบันทึกเพื่อเก็บมาตรานั้นไว้ในรายการโปรด</p>'],
  ['timer', 'ตัวจับเวลาสำหรับการท่องจำ', '<p>ตัวจับเวลาออกแบบตามรูปแบบที่ผู้ใช้คุ้นเคย มีเวลาสำเร็จรูป 1, 3, 5, 10, 15 และ 25 นาที และสามารถกำหนดเวลาเองได้ แถบเวลาจะเป็นสีเขียวเมื่อเหลือเวลามากกว่าครึ่ง เปลี่ยนเป็นสีส้มเมื่อเหลือเวลาน้อยกว่าครึ่ง และเปลี่ยนเป็นสีแดงเมื่อเหลือเวลาน้อยกว่าหนึ่งในห้า ตัวเลขเวลาเปลี่ยนสีตามแถบเสมอ</p><p>เมื่อกดเริ่ม หยุด หรือรีเซ็ต จะมีเสียงยืนยันสั้น ๆ และในห้าวินาทีสุดท้ายระบบจะส่งเสียงเตือนทุกวินาที เมื่อหมดเวลาจะมีเสียงสัญญาณยาวเพื่อให้ผู้ใช้ทราบโดยไม่ต้องจ้องหน้าจอ ผู้ใช้สามารถปิดเสียงได้ในเมนูการตั้งค่า</p>'],
  ['bookmark', 'บันทึก ประวัติ และเวลา', '<p>มาตราที่บันทึกไว้จะแสดงในเมนูบันทึก จัดกลุ่มตามวัน เดือน หรือปีที่บันทึก ผู้ใช้สามารถสร้างโฟลเดอร์ส่วนตัว ตั้งชื่อโฟลเดอร์เอง จัดหมวดหมู่ เพิ่มคำอธิบายส่วนตัว ค้นหา และเรียงลำดับตามวันที่บันทึกได้ ระบบบันทึกประวัติการเปิดอ่านป้ายพลิกทุกครั้งโดยอัตโนมัติ และแยกตามวัน เดือน ปีเช่นเดียวกัน</p><p>เมนูเวลาแสดงระยะเวลาการใช้งานของแต่ละวันเป็นชั่วโมง นาที และวินาที พร้อมกราฟเปรียบเทียบย้อนหลัง และจัดอันดับมาตราที่ผู้ใช้เปิดอ่านมากที่สุดสามอันดับแรก ข้อมูลทั้งหมดซิงก์กับฐานข้อมูลของระบบ จึงไม่สูญหายเมื่อเปลี่ยนอุปกรณ์</p>'],
  ['globe', 'อนุสัญญาและสนธิสัญญาระหว่างประเทศ', '<p>เมนูอนุสัญญารวบรวมสนธิสัญญาที่เผยแพร่โดยกรมสนธิสัญญาและกฎหมาย กระทรวงการต่างประเทศ ทั้งฉบับที่มีคำแปลภาษาไทย ฉบับที่ไม่มีคำแปล และตัวอย่างสนธิสัญญาของไทยในอดีต ทุกฉบับมีคำอธิบายภาษาไทยที่สรุปสาระสำคัญอย่างครบถ้วน ผู้ใช้กดเข้าไปอ่านเฉพาะฉบับที่สนใจได้ และเปิดอ่านต้นฉบับจากแหล่งข้อมูลต้นทางได้ทุกครั้ง</p><p>ระบบตรวจสอบเว็บไซต์ต้นทางทุกวัน หากมีการเพิ่มหรือแก้ไขรายการ ระบบจะปรับปรุงข้อมูลให้อัตโนมัติ</p>'],
  ['ai', 'ผู้ช่วย AI และเครื่องมือสำหรับนักกฎหมาย', '<p>ผู้ช่วย AI แยกเป็นหน้าเฉพาะ ใช้งานได้เหมือนแอปผู้ช่วยทั่วไป สามารถถามได้ทั้งเรื่องกฎหมาย ประวัติศาสตร์ เหตุการณ์ปัจจุบัน และความรู้รอบตัว สำหรับคำถามทางกฎหมาย ระบบกำหนดให้ AI แยกข้อกฎหมายออกจากคำอธิบาย ระบุแหล่งอ้างอิง และไม่สร้างเลขมาตราหรือคำพิพากษาขึ้นเอง</p><p>เมนูเครื่องมือมีพจนานุกรมศัพท์กฎหมาย รวมคำย่อ เครื่องคำนวณวันและระยะเวลา เครื่องมือจัดรูปแบบการอ้างอิง แบบฟอร์มสรุปคำพิพากษา การเปรียบเทียบบทบัญญัติ ลำดับขั้นตอนทางกฎหมาย และเครื่องมือเปิดอ่านเอกสาร ส่วนสมุดบันทึกใช้จัดรูปแบบข้อความได้ใกล้เคียงโปรแกรมประมวลผลคำและพิมพ์เป็นไฟล์ PDF</p>'],
  ['shield', 'ความปลอดภัยและความเป็นส่วนตัว', '<p>การเข้าสู่ระบบต้องผ่านรหัสผ่านสองชั้นทุกครั้ง รหัสผ่านทุกชุดเก็บเป็นค่าแฮช ระบบจำกัดจำนวนครั้งที่กรอกรหัสผิด ตรวจจับการแทรกคำสั่งอันตราย บันทึกประวัติการเข้าสู่ระบบพร้อมอุปกรณ์และตำแหน่งโดยประมาณ และแจ้งเตือนเมื่อมีการเข้าสู่ระบบจากอุปกรณ์ใหม่ ผู้ใช้สามารถตรวจสอบอุปกรณ์ที่เคยเข้าสู่ระบบ และออกจากระบบทุกอุปกรณ์ได้ด้วยตนเอง</p><p>ผู้ใช้มีสิทธิขอสำเนาข้อมูล แก้ไขข้อมูล ปิดใช้งานบัญชีชั่วคราว และลบบัญชีถาวรตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล โดยดำเนินการได้เองที่เมนูการตั้งค่า</p>'],
  ['help', 'กรณีระบบขัดข้อง', '<p>หากหน้าใดแสดงผลไม่ได้ ระบบจะแสดงกรอบแจ้งว่าส่วนนั้นขัดข้องชั่วคราว พร้อมปุ่มลองอีกครั้งและปุ่มแจ้งปัญหา โดยส่วนอื่นของเว็บไซต์ยังใช้งานได้ตามปกติ หากการเชื่อมต่อฐานข้อมูลขาดหาย ระบบจะเก็บข้อมูลที่ผู้ใช้บันทึกไว้ในอุปกรณ์ และซิงก์ให้อัตโนมัติเมื่อเชื่อมต่อได้อีกครั้ง</p><p>' + esc(SYS_DOWN_TEXT) + '</p>']
];

/* =======================================================================
   VIEW: CONTENT — เลือกหมวด > พิมพ์ชื่อ > กดกรอบกฎหมาย > แสดงป้ายพลิก
   ======================================================================= */
var WRONG_CAT_MSG = function (q, chosen, actual) {
  return 'ไม่พบ “' + q + '” ในหมวด “' + chosen + '” เนื่องจากกฎหมายที่ท่านค้นหาจัดอยู่ในหมวด “' + actual + '” กรุณาเลือกหมวดให้ตรงกับประเภทของกฎหมาย แล้วค้นหาอีกครั้ง';
};
VIEWS.content = function (el) {
  var st = S.ui.content || (S.ui.content = { cat: '', q: '', law: '' });
  el.innerHTML = '<div class="view-head"><div><h2>' + tr('content') + '</h2><p class="sub">เลือกหมวดกฎหมาย แล้วพิมพ์ชื่อกฎหมายที่ต้องการ</p></div><button class="btn sm" id="advBtn">' + ic('filter') + ' ค้นหาแบบละเอียด</button></div>' +
    '<div class="hscroll" id="catChips" role="tablist">' + CATS.map(function (c) { return '<button class="chip ' + (st.cat === c ? 'on' : '') + '" data-cat="' + esc(c) + '" role="tab">' + ic(CAT_ICON[c]) + esc(c) + '</button>'; }).join('') + '</div>' +
    '<div id="ctBody" style="margin-top:14px"></div>';
  $('#advBtn', el).onclick = function () { openQuickSearch(); };
  on($('#catChips', el), 'click', '[data-cat]', function (e, b) {
    tap(); SND.click();
    st.cat = b.getAttribute('data-cat'); st.law = ''; st.q = ''; store.set('ui', S.ui);
    $$('#catChips .chip', el).forEach(function (c) { c.classList.toggle('on', c === b); });
    body();
  });
  function body() {
    var box = $('#ctBody', el);
    if (!st.cat) {
      box.innerHTML = '<div class="panel"><div class="empty"><div class="eic">' + ic('layers') + '</div><h3>กรุณาเลือกหมวดกฎหมาย</h3><p>เลือกหมวดกฎหมายจากปุ่มด้านบนก่อน ได้แก่ รัฐธรรมนูญ พระราชบัญญัติประกอบรัฐธรรมนูญ พระราชบัญญัติ/พระราชกำหนด ปร./ปว./คปค./คสช. หรือประมวลกฎหมาย จากนั้นพิมพ์ชื่อกฎหมายที่ต้องการในช่องค้นหา ระบบจะแสดงรายชื่อกฎหมายให้เลือก</p></div></div>';
      return;
    }
    box.innerHTML = '<div class="input">' + ic('search') + '<input id="ctQ" list="ctList" placeholder="พิมพ์ชื่อกฎหมายในหมวด ' + esc(st.cat) + '" value="' + esc(st.q) + '"><datalist id="ctList"></datalist>' + (st.q ? '<button class="icon-btn" id="ctClear" aria-label="ล้าง" style="width:38px;height:38px">' + ic('x') + '</button>' : '') + '</div><div id="ctRes" style="margin-top:14px"></div>';
    var inp = $('#ctQ', box);
    $('#ctList', box).innerHTML = (S.catalog ? S.catalog.laws.filter(function (l) { return l.cat === st.cat; }) : []).map(function (l) { return '<option value="' + esc(l.title) + '">'; }).join('');
    inp.addEventListener('input', debounce(function () { st.q = inp.value; st.law = ''; store.set('ui', S.ui); results(); }, 160));
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') recordSearch(inp.value.trim()); });
    var cl = $('#ctClear', box); if (cl) cl.onclick = function () { st.q = ''; st.law = ''; store.set('ui', S.ui); body(); };
    results();
  }
  function results() {
    var box = $('#ctRes', el); if (!box) return;
    if (!S.catalog) { box.innerHTML = '<div class="skeleton" style="height:70px"></div><div class="skeleton" style="height:70px;margin-top:8px"></div>'; loadCatalog().then(function () { if ($('#ctRes', el)) results(); }); return; }
    if (st.law && LAWS[st.law]) { renderLaw(box, LAWS[st.law]); return; }
    var q = String(st.q || '').trim();
    var inCat = S.catalog.laws.filter(function (l) { return l.cat === st.cat; });
    if (!q) {
      box.innerHTML = '<div class="panel flat"><div class="row" style="align-items:flex-start">' + '<span style="color:var(--sky-600)">' + ic('info') + '</span><p class="small muted">พิมพ์ชื่อกฎหมายในช่องค้นหาด้านบน เช่น ' + esc((inCat[0] || {}).title || '') + ' ระบบจะแสดงกรอบรายชื่อกฎหมายที่ตรงกัน เมื่อกดกรอบจึงจะแสดงป้ายพลิกมาตรา</p></div></div>' +
        '<div class="group-h">กฎหมายในหมวดนี้ <span class="cnt">' + inCat.length + ' รายการ</span></div><div class="col anim-list">' + inCat.slice(0, 60).map(lawItem).join('') + '</div>';
      return;
    }
    var nq = norm(q);
    var match = inCat.filter(function (l) { return norm(l.title + ' ' + (l.short || '')).indexOf(nq) > -1; });
    if (!match.length) {
      var other = S.catalog.laws.filter(function (l) { return l.cat !== st.cat && norm(l.title + ' ' + (l.short || '') + ' ' + l.cat).indexOf(nq) > -1; });
      var catWord = CATS.filter(function (c) { return c !== st.cat && (nq.indexOf(norm(c.split('/')[0])) > -1 || norm(c).indexOf(nq) > -1); })[0];
      if (other.length || catWord) {
        var actual = catWord || other[0].cat;
        box.innerHTML = '<div class="panel"><div class="empty warn"><div class="eic">' + ic('alert') + '</div><h3>ข้อมูลที่ค้นหาไม่อยู่ในหมวดที่เลือก</h3><p>' + esc(WRONG_CAT_MSG(q, st.cat, actual)) + '</p><button class="btn k" id="switchCat">' + ic('arrowR') + ' เปลี่ยนไปหมวด ' + esc(actual) + '</button></div></div>';
        $('#switchCat', box).onclick = function () { st.cat = actual; store.set('ui', S.ui); $$('#catChips .chip', el).forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-cat') === actual); }); body(); };
      } else {
        box.innerHTML = '<div class="panel"><div class="empty"><div class="eic">' + ic('search') + '</div><h3>ไม่พบกฎหมายที่ค้นหา</h3><p>ไม่พบชื่อกฎหมาย “' + esc(q) + '” ในหมวด “' + esc(st.cat) + '” กรุณาตรวจสอบตัวสะกดหรือพิมพ์เพียงบางส่วนของชื่อกฎหมาย หากมั่นใจว่ากฎหมายฉบับนี้มีอยู่จริง ท่านสามารถแจ้งผู้ดูแลระบบเพื่อเพิ่มข้อมูลได้</p><button class="btn" id="reqLaw">' + ic('send') + ' แจ้งขอเพิ่มกฎหมาย</button></div></div>';
        $('#reqLaw', box).onclick = function () { reportDialog('รายงานข้อมูลกฎหมาย', 'ขอเพิ่มกฎหมาย: ' + q + ' (หมวด ' + st.cat + ')'); };
      }
      return;
    }
    box.innerHTML = '<div class="group-h">ผลการค้นหา <span class="cnt">' + match.length + ' รายการ</span></div><div class="col anim-list">' + match.map(function (l) { return lawItem(l, q); }).join('') + '</div>';
  }
  function lawItem(l, q) {
    var n = l.n || (SECS_BY_LAW[l.id] || []).length;
    return '<button class="law-item" data-law="' + esc(l.id) + '"><span class="li-ic">' + ic(CAT_ICON[l.cat]) + '</span><span class="grow"><span class="li-t">' + (q ? highlight(esc(l.title), q) : esc(l.title)) + '</span><br><span class="li-s">' + (n ? n + ' มาตรา' : 'รอนำเข้าตัวบท') + (l.year ? ' · พ.ศ. ' + esc(l.year) : '') + '</span></span>' + ic('chevR') + '</button>';
  }
  on(el, 'click', '.law-item[data-law]', function (e, b) { tap(); st.law = b.getAttribute('data-law'); st.q = LAWS[st.law].title; store.set('ui', S.ui); recordSearch(st.q); var inp = $('#ctQ', el); if (inp) inp.value = st.q; results(); });
  body();
};
function renderLaw(box, l) {
  var st = S.ui.content;
  if (l.n && !LAW_LOADED[l.id] && (SECS_BY_LAW[l.id] || []).length < l.n) {
    box.innerHTML = '<div class="panel"><div class="row"><div class="spin" style="width:28px;height:28px;border-width:3px"></div><span class="muted">กำลังโหลดตัวบท ' + esc(l.title) + ' (' + l.n + ' มาตรา)</span></div></div><div class="cards" style="margin-top:14px"><div class="skeleton" style="height:280px"></div><div class="skeleton" style="height:280px"></div><div class="skeleton" style="height:280px"></div></div>';
    ensureLaw(l.id).then(function (ok) { if (box.isConnected) { if (!ok) LAW_LOADED[l.id] = 1; renderLaw(box, l); } });
    return;
  }
  var secs = (SECS_BY_LAW[l.id] || []).slice();
  box.innerHTML = '<section class="panel corner" style="margin-bottom:14px"><div class="row wrapr" style="align-items:flex-start">' +
    '<button class="icon-btn" id="lawBack" aria-label="กลับไปผลการค้นหา">' + ic('arrowL') + '</button><div class="grow"><span class="tag">' + esc(l.cat) + '</span><h3 style="margin-top:6px">' + esc(l.title) + '</h3><div class="muted small">' + secs.length + ' มาตราในฐานข้อมูล' + (l.updated ? ' · ปรับปรุง ' + fmtDate(l.updated) : '') + '</div></div>' +
    '</div>' + (l.url ? '<div class="row" style="margin-top:8px"><a class="btn sm" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + ic('external') + ' แหล่งข้อมูลต้นทาง</a></div>' : '') +
    (secs.length ? '<div class="row wrapr" style="margin-top:12px;gap:8px"><div class="input" style="min-height:44px;flex:1 1 100%">' + ic('search') + '<input id="inLawQ" placeholder="ค้นหาเลขมาตรา ชื่อมาตรา หรือข้อความในมาตรา" value="' + esc(st.inLaw || '') + '"></div>' +
      '<div class="seg" id="lawSort"><button data-s="no" class="' + (st.sort !== 'name' && st.sort !== 'fav' ? 'on' : '') + '">เลขมาตรา</button><button data-s="name" class="' + (st.sort === 'name' ? 'on' : '') + '">ชื่อ ก-ฮ</button><button data-s="fav" class="' + (st.sort === 'fav' ? 'on' : '') + '">ที่บันทึก</button></div>' +
      '<details class="acc" style="flex:1 1 100%"><summary>' + ic('list') + ' สารบัญมาตรา' + ic('chevD', 'chev') + '</summary><div class="acc-b hscroll">' + secs.map(function (s) { return '<button class="chip" data-jump="' + esc(s.id) + '">ม. ' + esc(s.no) + '</button>'; }).join('') + '</div></details></div>' : '') +
    '</section><div id="cardsBox"></div>';
  $('#lawBack', box).onclick = function () { st.law = ''; store.set('ui', S.ui); refreshCurrent(); };
  if (!secs.length) {
    $('#cardsBox', box).innerHTML = '<div class="panel"><div class="empty"><div class="eic">' + ic('file') + '</div><h3>ยังไม่ได้นำเข้าตัวบทของกฎหมายฉบับนี้</h3><p>ระบบได้บันทึกรายชื่อกฎหมายฉบับนี้ไว้แล้ว และจะนำเข้าตัวบทรายมาตราในการปรับปรุงฐานข้อมูลครั้งถัดไป ระหว่างนี้ท่านสามารถเปิดอ่านฉบับเต็มจากแหล่งข้อมูลต้นทาง หรือแจ้งผู้ดูแลระบบให้นำเข้าเป็นลำดับแรก</p><div class="row wrapr" style="justify-content:center">' + (l.url ? '<a class="btn k" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + ic('external') + ' เปิดแหล่งข้อมูลต้นทาง</a>' : '') + '<button class="btn" id="reqImport">' + ic('send') + ' แจ้งขอนำเข้าตัวบท</button></div></div></div>';
    $('#reqImport', box).onclick = function () { reportDialog('รายงานข้อมูลกฎหมาย', 'ขอนำเข้าตัวบท: ' + l.title); };
    return;
  }
  function draw() {
    var q = (st.inLaw || '').trim(), list = secs;
    if (q) { var nq = norm(thaiDigitsToArabic(q)); list = secs.filter(function (s) { return String(s.no) === thaiDigitsToArabic(q).replace(/^(มาตรา|ม\.)\s*/, '') || norm(s.name).indexOf(nq) > -1 || norm(s.text).indexOf(nq) > -1; }); }
    if (st.sort === 'name') list = list.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'th'); });
    if (st.sort === 'fav') list = list.filter(function (s) { return !!S.ud.favorites[s.id]; });
    var cb = $('#cardsBox', box);
    cb.innerHTML = list.length ? '<div class="cards anim-list">' + list.map(function (s) { return cardHtml(s, q); }).join('') + '</div>' : '<div class="panel"><div class="empty"><div class="eic">' + ic('search') + '</div><h3>ไม่พบมาตราที่ตรงกับเงื่อนไข</h3><p>ลองเปลี่ยนคำค้นหา หรือเลือกการเรียงลำดับแบบเลขมาตรา</p></div></div>';
    syncTimerBadges();
  }
  var inq = $('#inLawQ', box); if (inq) inq.addEventListener('input', debounce(function () { st.inLaw = inq.value; store.set('ui', S.ui); draw(); }, 160));
  on(box, 'click', '#lawSort [data-s]', function (e, b) { st.sort = b.getAttribute('data-s'); store.set('ui', S.ui); $$('#lawSort button', box).forEach(function (x) { x.classList.toggle('on', x === b); }); draw(); });
  on(box, 'click', '[data-jump]', function (e, b) { var c = document.querySelector('.flip[data-id="' + CSS.escape(b.getAttribute('data-jump')) + '"]'); if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'center' }); c.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }], { duration: 600 }); } });
  bindCards(box);
  draw();
}

/* ---------------- flip card ---------------- */
function cardHtml(s, q) {
  var l = LAWS[s.law] || {};
  var fav = !!(S.ud && S.ud.favorites[s.id]);
  return '<div class="flip" data-id="' + esc(s.id) + '"><div class="flip-in">' +
    '<div class="face front"><div class="top"><span class="law-s">' + esc(lawShort(l)) + '</span><button class="zoom" data-act="zoom" aria-label="ขยายป้ายนี้">' + ic('maximize') + '</button></div>' +
      '<div class="center"><span class="secno">มาตรา ' + esc(s.no) + '</span><div class="pname">' + (q ? highlight(esc(s.name), q) : esc(s.name)) + '</div></div>' +
      '<div class="bar"><button class="cbtn" data-act="timer" aria-label="จับเวลา">' + ic('timer') + '<span>จับเวลา</span></button><button class="cbtn fav ' + (fav ? 'on' : '') + '" data-act="fav" aria-label="บันทึกรายการโปรด">' + ic(fav ? 'bookmarkOn' : 'bookmark') + '</button><button class="cbtn flipb" data-act="flip">' + ic('flip') + '<span>พลิก</span></button></div>' +
      '<div class="tline hidden"><i></i></div></div>' +
    '<div class="face back"><div class="top"><span class="law-s">' + esc(lawShort(l)) + ' · <b>มาตรา ' + esc(s.no) + '</b></span><button class="zoom" data-act="zoom" aria-label="ขยายป้ายนี้">' + ic('maximize') + '</button></div>' +
      '<div class="body"><h4>' + esc(s.name) + '</h4>' + lawHtml(s.text, q) + '</div>' +
      '<div class="bar"><button class="cbtn" data-act="copy" aria-label="คัดลอกตัวบท">' + ic('copy') + '</button><button class="cbtn fav ' + (fav ? 'on' : '') + '" data-act="fav" aria-label="บันทึกรายการโปรด">' + ic(fav ? 'bookmarkOn' : 'bookmark') + '</button><button class="cbtn flipb" data-act="flip">' + ic('flip') + '<span>พลิก</span></button></div></div>' +
    '</div></div>';
}
function bindCards(root) {
  on(root, 'click', '.flip [data-act]', function (e, b) {
    e.stopPropagation();
    var card = b.closest('.flip'), id = card.getAttribute('data-id'), act = b.getAttribute('data-act');
    tap();
    if (act === 'flip') { SND.click(); card.classList.toggle('flipped'); if (card.classList.contains('flipped')) logOpen(id); }
    else if (act === 'zoom') openFocus(id);
    else if (act === 'timer') { if (gate('timer')) openFocus(id, { timer: true }); }
    else if (act === 'fav') toggleFav(id);
    else if (act === 'copy') { var s = SECS[id]; copyText(lawShort(LAWS[s.law]) + ' มาตรา ' + s.no + '\n' + s.text); }
  });
}
function logOpen(id) {
  if (!S.ud) return;
  var last = S.ud.history[0];
  if (!(last && last.id === id && Date.now() - last.t < 60000)) S.ud.history.unshift({ id: id, t: Date.now() });
  S.ud.history = S.ud.history.slice(0, 3000);
  S.ud.opens[id] = (S.ud.opens[id] || 0) + 1;
  saveUD();
}
function toggleFav(id, forceOn) {
  var s = SECS[id]; if (!s || !S.ud) return;
  var on_ = !!S.ud.favorites[id];
  if (on_ && forceOn) return;
  if (on_) {
    var prev = S.ud.favorites[id];
    delete S.ud.favorites[id]; S.ud.deleted[id] = Date.now(); saveUD();
    toast('นำออกจากรายการโปรดแล้ว', lawShort(LAWS[s.law]) + ' มาตรา ' + s.no, '', { action: 'เลิกทำ', onAction: function () { S.ud.favorites[id] = prev; delete S.ud.deleted[id]; saveUD(); updateFavButtons(id); } });
  } else {
    S.ud.favorites[id] = { t: Date.now(), folder: '', note: '' }; delete S.ud.deleted[id]; saveUD();
    SND.click();
    toast('บันทึกในรายการโปรดแล้ว', lawShort(LAWS[s.law]) + ' มาตรา ' + s.no + ' · ' + fmtDateTime(Date.now()), 'ok', { action: 'ดูรายการบันทึก', onAction: function () { nav('saved'); } });
  }
  updateFavButtons(id);
}
function updateFavButtons(id) {
  var on_ = !!S.ud.favorites[id];
  $$('.flip[data-id="' + CSS.escape(id) + '"] [data-act="fav"]').forEach(function (b) { b.classList.toggle('on', on_); b.innerHTML = ic(on_ ? 'bookmarkOn' : 'bookmark') + (b.querySelector('span') ? '' : '') + (b.getAttribute('data-label') ? '<span>' + b.getAttribute('data-label') + '</span>' : ''); });
}

/* ---------------- focus (ป้ายเดียว + ปุ่มต่าง ๆ + ลูกศรกลับด้านล่าง) ---------------- */
var focusEl = null;
function closeFocus() { if (focusEl) { focusEl.remove(); focusEl = null; document.body.style.overflow = ''; } }
function openFocus(id, opt) {
  opt = opt || {};
  var s = SECS[id];
  if (!s) { delete IDS_TRIED[id]; if (!ensureIds([id], function () { if (SECS[id]) openFocus(id, opt); else toast('ไม่พบมาตรานี้ในฐานข้อมูล', '', 'warn'); })) toast('ไม่พบมาตรานี้ในฐานข้อมูล', '', 'warn'); return; }
  closeFocus();
  logOpen(id);
  var l = LAWS[s.law] || {};
  var fav = !!S.ud.favorites[id];
  focusEl = h('<div class="focus" role="dialog" aria-modal="true" aria-label="ป้ายมาตรา"><div class="stagec">' +
    '<div class="flip ' + (opt.back ? 'flipped' : '') + '" data-id="' + esc(id) + '"><div class="flip-in">' +
      '<div class="face front"><div class="top"><span class="law-s">' + esc(l.title || '') + '</span></div><div class="center"><span class="secno">มาตรา ' + esc(s.no) + '</span><div class="pname">' + esc(s.name) + '</div><div class="muted small">' + esc(s.tags || '') + '</div></div>' +
        '<div class="bar"><button class="cbtn" data-f="timer">' + ic('timer') + '<span>จับเวลา</span></button><button class="cbtn fav ' + (fav ? 'on' : '') + '" data-act="fav" data-label="บันทึก">' + ic(fav ? 'bookmarkOn' : 'bookmark') + '<span>บันทึก</span></button><button class="cbtn flipb" data-f="flip">' + ic('flip') + '<span>พลิก</span></button></div><div class="tline hidden"><i></i></div></div>' +
      '<div class="face back"><div class="top"><span class="law-s">' + esc(l.title || '') + ' · <b>มาตรา ' + esc(s.no) + '</b></span></div><div class="body"><h4>' + esc(s.name) + '</h4>' + lawHtml(s.text) + '<p class="tiny muted" style="margin-top:10px">ที่มา: ' + esc(l.title || '') + ' — ตรวจสอบฉบับปัจจุบันกับสำนักงานคณะกรรมการกฤษฎีกาก่อนนำไปอ้างอิง</p></div>' +
        '<div class="bar"><button class="cbtn" data-f="copy">' + ic('copy') + '</button><button class="cbtn" data-f="ai" aria-label="ถาม AI เกี่ยวกับมาตรานี้">' + ic('ai') + '</button><button class="cbtn" data-f="note" aria-label="เพิ่มหมายเหตุ">' + ic('edit') + '</button><button class="cbtn" data-f="pdf" aria-label="ดาวน์โหลด PDF">' + ic('download') + '</button><button class="cbtn flipb" data-f="flip">' + ic('flip') + '<span>พลิก</span></button></div></div>' +
    '</div></div>' +
    '<div id="focusTimer"></div>' +
    '<button class="back-arrow" data-f="close" aria-label="กลับ">' + ic('arrowL') + '</button>' +
  '</div></div>');
  document.body.appendChild(focusEl);
  document.body.style.overflow = 'hidden';
  var card = focusEl.querySelector('.flip');
  on(focusEl, 'click', '[data-f]', function (e, b) {
    var f = b.getAttribute('data-f'); tap();
    if (f === 'flip') { SND.click(); card.classList.toggle('flipped'); }
    else if (f === 'close') closeFocus();
    else if (f === 'timer') { if (gate('timer')) timerPanel(id); }
    else if (f === 'copy') copyText((l.title || '') + ' มาตรา ' + s.no + '\n' + s.text);
    else if (f === 'ai') { if (gate('ai')) { closeFocus(); S.ui.aiPrefill = 'อธิบาย' + (l.title || '') + ' มาตรา ' + s.no + ' (' + s.name + ') ให้เข้าใจง่าย พร้อมองค์ประกอบและตัวอย่าง'; S.ui.aiContext = (l.title || '') + ' มาตรา ' + s.no + '\n' + s.text; nav('ai'); } }
    else if (f === 'note') favNoteDialog(id);
    else if (f === 'pdf') { if (gate('pdf')) makePdf((l.short || l.title) + ' มาตรา ' + s.no, '<h2>' + esc(l.title) + '</h2><h3>มาตรา ' + esc(s.no) + ' ' + esc(s.name) + '</h3>' + lawHtml(s.text)); }
  });
  on(focusEl, 'click', '[data-act="fav"]', function () { toggleFav(id); });
  focusEl.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeFocus(); });
  if (opt.timer) timerPanel(id);
  syncTimerBadges();
}
function favNoteDialog(id) {
  var s = SECS[id]; var f = S.ud.favorites[id];
  modal({ title: 'หมายเหตุส่วนตัว', sub: lawShort(LAWS[s.law]) + ' มาตรา ' + s.no, icon: 'edit', html: '<div class="field"><div class="input"><textarea id="fnText" maxlength="3000" placeholder="จดประเด็นสำคัญ ตัวอย่าง หรือคำพิพากษาที่เกี่ยวข้อง">' + esc(f ? f.note : '') + '</textarea></div><div class="hint">ระบบจะบันทึกมาตรานี้ในรายการโปรดพร้อมหมายเหตุโดยอัตโนมัติ</div></div>', ok: 'บันทึก',
    onOk: function (m) { toggleFav(id, true); S.ud.favorites[id].note = $('#fnText', m).value; saveUD(); toast('บันทึกหมายเหตุแล้ว', '', 'ok'); return true; } });
}

/* ---------------- timer (สีสากล: เขียว > ส้ม > แดง + เสียง) ---------------- */
var TIMERS = {};
function timerColor(frac) { return frac > 0.5 ? '#1E8E3E' : frac > 0.2 ? '#F07C1E' : '#D93025'; }
function timerPanel(id) {
  var box = document.getElementById('focusTimer'); if (!box) return;
  var tm = TIMERS[id] || (TIMERS[id] = { total: 300, left: 300, running: false, iv: null });
  box.innerHTML = '<div class="timer-panel enter"><div class="row" style="margin-bottom:6px"><b class="grow">' + ic('timer') + ' ตัวจับเวลา</b><span class="tiny muted">กดเลือกเวลา หรือกำหนดเอง</span></div>' +
    '<div class="hscroll" id="tmPresets">' + [1, 3, 5, 10, 15, 25].map(function (mm) { return '<button class="chip sky ' + (tm.total === mm * 60 ? 'on' : '') + '" data-m="' + mm + '">' + mm + ' นาที</button>'; }).join('') + '<button class="chip" data-m="custom">' + ic('edit') + ' กำหนดเอง</button></div>' +
    '<div class="timer-display" id="tmDisp">--:--</div><div class="timer-track"><i id="tmBar"></i></div>' +
    '<div class="timer-legend"><span><b style="background:#1E8E3E"></b>เหลือเวลามาก (มากกว่า 50%)</span><span><b style="background:#F07C1E"></b>เหลือครึ่งหนึ่ง (20–50%)</span><span><b style="background:#D93025"></b>ใกล้หมดเวลา (น้อยกว่า 20%)</span></div>' +
    '<div class="row" style="justify-content:center;margin-top:10px;gap:10px"><button class="btn" id="tmReset">' + ic('reset') + ' รีเซ็ต</button><button class="btn lg o" id="tmToggle"></button></div></div>';
  function paint() {
    var frac = tm.total ? tm.left / tm.total : 0, col = timerColor(frac);
    var d = $('#tmDisp', box); if (!d) return;
    d.textContent = pad(Math.floor(tm.left / 60)) + ':' + pad(tm.left % 60); d.style.color = col;
    var bar = $('#tmBar', box); bar.style.width = (frac * 100) + '%'; bar.style.background = col;
    $('#tmToggle', box).innerHTML = tm.running ? ic('pause') + ' หยุด' : ic('play') + (tm.left < tm.total && tm.left > 0 ? ' ทำต่อ' : ' เริ่ม');
    syncTimerBadges();
  }
  tm.paint = paint;
  on($('#tmPresets', box), 'click', '[data-m]', function (e, b) {
    var v = b.getAttribute('data-m');
    function setMin(mm) { stopTimer(id); tm.total = tm.left = Math.round(mm * 60); $$('#tmPresets .chip', box).forEach(function (c) { c.classList.toggle('on', c === b); }); paint(); SND.click(); }
    if (v === 'custom') {
      modal({ title: 'กำหนดเวลาเอง', icon: 'timer', html: '<div class="grid g2"><div class="field"><label for="cMin">นาที</label><div class="input"><input id="cMin" type="number" min="0" max="180" value="' + Math.floor(tm.total / 60) + '"></div></div><div class="field"><label for="cSec">วินาที</label><div class="input"><input id="cSec" type="number" min="0" max="59" value="' + (tm.total % 60) + '"></div></div></div>', ok: 'ตั้งเวลา',
        onOk: function (m) { var mm = clamp(+$('#cMin', m).value || 0, 0, 180), ss = clamp(+$('#cSec', m).value || 0, 0, 59); if (!mm && !ss) { toast('กรุณาระบุเวลามากกว่า 0', '', 'warn'); return false; } setMin(mm + ss / 60); return true; } });
    } else setMin(+v);
  });
  $('#tmToggle', box).onclick = function () { tm.running ? stopTimer(id, true) : startTimer(id); };
  $('#tmReset', box).onclick = function () { stopTimer(id); tm.left = tm.total; SND.stop(); paint(); };
  paint();
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function startTimer(id) {
  var tm = TIMERS[id]; if (!tm) return;
  if (tm.left <= 0) tm.left = tm.total;
  tm.running = true; SND.start();
  tm.iv = setInterval(function () {
    tm.left--;
    if (tm.left <= 5 && tm.left > 0) SND.tick();
    if (tm.left <= 0) { tm.left = 0; stopTimer(id); SND.end(); toast('หมดเวลาแล้ว', 'มาตรา ' + (SECS[id] ? SECS[id].no : ''), 'warn'); }
    tm.paint && tm.paint(); syncTimerBadges();
  }, 1000);
  tm.paint && tm.paint();
}
function stopTimer(id, sound) {
  var tm = TIMERS[id]; if (!tm) return;
  clearInterval(tm.iv); tm.iv = null;
  if (tm.running && sound) SND.stop();
  tm.running = false; tm.paint && tm.paint();
}
function syncTimerBadges() {
  Object.keys(TIMERS).forEach(function (id) {
    var tm = TIMERS[id];
    $$('.flip[data-id="' + CSS.escape(id) + '"] .tline').forEach(function (tl) {
      var active = tm.running || (tm.left > 0 && tm.left < tm.total);
      tl.classList.toggle('hidden', !active);
      var frac = tm.total ? tm.left / tm.total : 0; var i = tl.querySelector('i'); i.style.width = (frac * 100) + '%'; i.style.background = timerColor(frac);
    });
  });
}

/* ---------------- PDF ---------------- */
function makePdf(title, html) {
  withLoading('กำลังสร้างไฟล์ PDF', api('makePdf', { title: title, html: html }, { timeout: 60000 })).then(function (r) {
    try { downloadBase64(r.name, r.base64, 'application/pdf'); } catch (e) { reportError('pdf.dl', e); }
    modal({ title: 'สร้างไฟล์ PDF สำเร็จ', icon: 'check', html: '<p class="muted">ระบบเริ่มดาวน์โหลดไฟล์ “' + esc(r.name) + '” แล้ว หากเบราว์เซอร์ไม่เริ่มดาวน์โหลด กรุณาเปิดไฟล์จากลิงก์ด้านล่าง</p>' + (r.url ? '<a class="btn k" style="margin-top:12px" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + ic('external') + ' เปิดไฟล์ PDF</a>' : ''), ok: 'ปิด', cancel: false });
  }).catch(function (e) { toast('สร้างไฟล์ PDF ไม่สำเร็จ', e.msg, 'bad'); });
}

/* =======================================================================
   VIEW: TREATIES (อนุสัญญา — เนื้อหาเรียงลงมา ไม่ใช่ป้ายพลิก)
   ======================================================================= */
var trPromise = null;
function loadTreaties() {
  if (trPromise) return trPromise;
  trPromise = api('getTreaties', {}).then(function (r) { S.treaties = r.items || []; store.set('treaties', S.treaties); return S.treaties; }).catch(function (e) { trPromise = null; if (!S.treaties) toast('ยังไม่สามารถโหลดข้อมูลอนุสัญญาได้', e.msg, 'warn'); return S.treaties; });
  return trPromise;
}
VIEWS.treaties = function (el) {
  var st = S.ui.tr || (S.ui.tr = { g: '', q: '', sort: 'date' });
  var groups = ['ฉบับมีคำแปลภาษาไทย', 'ฉบับไม่มีคำแปลภาษาไทย', 'สนธิสัญญาของไทยในอดีต'];
  el.innerHTML = '<div class="view-head"><div><h2>' + tr('treaties') + '</h2><p class="sub">อนุสัญญาและสนธิสัญญาจากกรมสนธิสัญญาและกฎหมาย กระทรวงการต่างประเทศ พร้อมคำอธิบายภาษาไทย</p></div><a class="btn sm" href="https://treaties.mfa.go.th" target="_blank" rel="noopener">' + ic('external') + ' treaties.mfa.go.th</a></div>' +
    '<div class="row wrapr" style="gap:8px;margin-bottom:12px"><div class="input grow" style="min-width:min(100%,260px)">' + ic('search') + '<input id="trQ" placeholder="ค้นหาชื่ออนุสัญญา (ไทยหรืออังกฤษ)" value="' + esc(st.q) + '"></div><div class="seg" id="trSort"><button data-s="date" class="' + (st.sort === 'date' ? 'on' : '') + '">ล่าสุด</button><button data-s="az" class="' + (st.sort === 'az' ? 'on' : '') + '">ชื่อ A-Z</button></div></div>' +
    '<div class="hscroll" id="trG"><button class="chip ' + (!st.g ? 'on' : '') + '" data-g="">ทั้งหมด</button>' + groups.map(function (g) { return '<button class="chip ' + (st.g === g ? 'on' : '') + '" data-g="' + esc(g) + '">' + esc(g) + '</button>'; }).join('') + '</div><div id="trList" style="margin-top:8px"></div>';
  function draw() {
    var box = $('#trList', el); if (!box) return;
    if (!S.treaties) { box.innerHTML = '<div class="skeleton" style="height:120px"></div><div class="skeleton" style="height:120px;margin-top:10px"></div>'; loadTreaties().then(draw); return; }
    var nq = norm(st.q);
    var list = S.treaties.filter(function (t_) { return (!st.g || t_.group === st.g) && (!nq || norm(t_.title + ' ' + t_.titleTh).indexOf(nq) > -1); });
    list.sort(st.sort === 'az' ? function (a, b) { return a.title.localeCompare(b.title); } : function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    if (!list.length) { box.innerHTML = '<div class="panel"><div class="empty"><div class="eic">' + ic('globe') + '</div><h3>ไม่พบอนุสัญญาที่ค้นหา</h3><p>ลองพิมพ์คำค้นหาให้สั้นลง หรือเลือกหมวด “ทั้งหมด”</p></div></div>'; return; }
    var byG = {}; list.forEach(function (x) { (byG[x.group] = byG[x.group] || []).push(x); });
    box.innerHTML = Object.keys(byG).map(function (g) {
      return '<div class="group-h">' + esc(g) + ' <span class="cnt">' + byG[g].length + ' ฉบับ</span></div><div class="col anim-list" style="gap:12px">' + byG[g].map(function (x) {
        return '<article class="panel corner"><div class="row" style="align-items:flex-start"><span class="li-ic" style="width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:var(--sky-100);color:var(--sky-700);flex:none">' + ic('globe') + '</span><div class="grow"><h3>' + highlight(esc(x.titleTh || x.title), st.q) + '</h3><div class="muted small">' + highlight(esc(x.title), st.q) + ' · เผยแพร่ ' + fmtDate(x.date) + '</div></div></div>' +
          '<div class="prose" style="margin-top:10px">' + readMore(String(x.summary || '').split('\n').map(function (p) { return '<p>' + esc(p) + '</p>'; }).join(''), 4) + '</div>' +
          '<div class="row wrapr" style="gap:8px;margin-top:8px"><button class="btn sm k" data-open="' + esc(x.id) + '">' + ic('maximize') + ' อ่านแบบเต็มหน้า</button><a class="btn sm" href="' + esc(x.url) + '" target="_blank" rel="noopener">' + ic('external') + ' ต้นฉบับ</a></div></article>';
      }).join('') + '</div>';
    }).join('');
  }
  $('#trQ', el).addEventListener('input', debounce(function () { st.q = this.value; store.set('ui', S.ui); draw(); }, 160));
  on($('#trG', el), 'click', '[data-g]', function (e, b) { st.g = b.getAttribute('data-g'); store.set('ui', S.ui); $$('#trG .chip', el).forEach(function (c) { c.classList.toggle('on', c === b); }); draw(); });
  on($('#trSort', el), 'click', '[data-s]', function (e, b) { st.sort = b.getAttribute('data-s'); store.set('ui', S.ui); $$('#trSort button', el).forEach(function (c) { c.classList.toggle('on', c === b); }); draw(); });
  on(el, 'click', '[data-open]', function (e, b) { openTreaty(b.getAttribute('data-open')); });
  draw();
};
function openTreaty(id) {
  var x = (S.treaties || []).filter(function (t_) { return t_.id === id; })[0]; if (!x) return;
  closeFocus();
  focusEl = h('<div class="focus" role="dialog" aria-modal="true"><div class="stagec" style="max-width:860px"><article class="panel corner"><span class="tag">' + esc(x.group) + '</span><h2 style="margin-top:8px">' + esc(x.titleTh || x.title) + '</h2><div class="muted small" style="margin-bottom:12px">' + esc(x.title) + ' · เผยแพร่ ' + fmtDate(x.date, true) + '</div>' +
    '<div class="prose">' + String(x.summary || '').split('\n').map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' +
    '<p class="tiny muted" style="margin-top:12px">ที่มา: กรมสนธิสัญญาและกฎหมาย กระทรวงการต่างประเทศ (treaties.mfa.go.th) คำอธิบายภาษาไทยจัดทำเพื่อการศึกษา ควรอ่านประกอบกับต้นฉบับ</p>' +
    '<div class="row wrapr" style="gap:8px;margin-top:12px"><a class="btn k" href="' + esc(x.url) + '" target="_blank" rel="noopener">' + ic('external') + ' เปิดต้นฉบับ</a><button class="btn" data-f="copy">' + ic('copy') + ' คัดลอก</button><button class="btn" data-f="ai">' + ic('ai') + ' ถาม AI</button></div></article>' +
    '<button class="back-arrow" data-f="close" aria-label="กลับ">' + ic('arrowL') + '</button></div></div>');
  document.body.appendChild(focusEl); document.body.style.overflow = 'hidden';
  on(focusEl, 'click', '[data-f]', function (e, b) {
    var f = b.getAttribute('data-f');
    if (f === 'close') closeFocus();
    if (f === 'copy') copyText((x.titleTh || '') + '\n' + x.title + '\n\n' + x.summary);
    if (f === 'ai' && gate('ai')) { closeFocus(); S.ui.aiPrefill = 'อธิบายสาระสำคัญของ ' + x.title + ' และความเกี่ยวข้องกับประเทศไทย'; nav('ai'); }
  });
}
</script>
