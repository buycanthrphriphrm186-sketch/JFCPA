<script>
/* ==========================================================================
   v10: เชื่อมต่อระบบหลังบ้านแบบเรียลไทม์ — เพิ่มเติมเท่านั้น ไม่ลบระบบ/ข้อมูลเดิม
   ========================================================================== */
ICONS.chat = '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h7M8.5 14.5h4.5"/>';
I18N.th.chat = 'แชท'; I18N.en.chat = 'Chat'; I18N.ko.chat = '채팅';
if (!TABS.some(function (t) { return t[0] === 'chat'; })) TABS.push(['chat', 'chat']);

/* ---------------- 1) การใช้งานจริง: แตะ เลื่อน พิมพ์ (ไม่นับแท็บที่เปิดค้าง/จอดับ/ไม่ได้แตะ) ---------------- */
var ACT = { last: 0, win: 45000 };
(function () {
  var mark = function () { ACT.last = Date.now(); };
  ['pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll', 'input', 'click'].forEach(function (ev) { window.addEventListener(ev, mark, { passive: true, capture: true }); });
  var mm = 0; window.addEventListener('mousemove', function () { var n = Date.now(); if (n - mm > 2000) { mm = n; mark(); } }, { passive: true });
})();
function isActiveNow() {
  if (document.visibilityState !== 'visible') return false;
  try { if (document.hasFocus && !document.hasFocus() && Date.now() - ACT.last > 5000) return false; } catch (e) {}
  return Date.now() - ACT.last < ACT.win;
}

/* ---------------- 2) pulse: ส่งสัญญาณ + ตรวจข้อความใหม่ทุก 2 วินาทีขณะเปิดหน้าอยู่ ---------------- */
var SRV_NOTICE_RE = /^(MSG|BC|ADM|NTF)-/;
var RT = { timer: null, busy: false, fails: 0, wasActive: false, catLoading: false, first: true, every: 2000 };
function rtSchedule(ms) { clearTimeout(RT.timer); RT.timer = setTimeout(rtPulse, ms); }
function rtPulse() {
  clearTimeout(RT.timer);
  if (!S.token || !S.member || BLOCK_SHOWN || MAINT.on) return;
  if (document.visibilityState !== 'visible') { if (RT.wasActive) rtOff(); return; }
  if (RT.busy) return rtSchedule(800);
  var act = isActiveNow(), off = !act && RT.wasActive;
  RT.wasActive = act; RT.busy = true;
  api('pulse', { act: act ? 1 : 0, off: off ? 1 : 0 }, { noRetry: true, timeout: 12000, silent: true }).then(function (r) {
    RT.fails = 0; rtApply(r);
  }).catch(function (e) {
    if (e && (e.code === 'BLOCKED' || e.code === 'MAINTENANCE' || e.code === 'NO_SESSION')) return;
    RT.fails = Math.min(RT.fails + 1, 4);
  }).then(function () {
    RT.busy = false;
    if (S.token && !BLOCK_SHOWN && !MAINT.on) rtSchedule(RT.fails ? Math.min(RT.every * Math.pow(2, RT.fails), 15000) : RT.every);
  });
}
function rtOff() {
  RT.wasActive = false;
  if (!S.token) return;
  try { api('pulse', { act: 0, off: 1 }, { noRetry: true, timeout: 8000, silent: true }).catch(function () {}); } catch (e) {}
}
function rtStart() { RT.first = true; rtSchedule(300); }
document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { if (S.token) rtSchedule(150); } else rtOff(); });
window.addEventListener('pagehide', rtOff);
window.addEventListener('online', function () { RT.fails = 0; if (S.token) rtSchedule(200); });

/* ผลจาก pulse: ข้อความผู้ดูแล / ประกาศ (เพิ่ม–ซ่อนตามหลังบ้าน) / ข้อมูลกฎหมายใหม่ / แชทใหม่ */
function rtApply(r) {
  if (!r || !S.ud) return;
  var ud = S.ud, changed = false, have = {}, read = ud.readNotices || {};
  ud.notices.forEach(function (n) { have[n.id] = n; });
  if (r.nOk && Array.isArray(r.notices)) {
    var srv = {};
    r.notices.slice().reverse().forEach(function (n) {
      srv[n.id] = 1;
      if (!have[n.id] && !read[n.id]) { addNotice({ id: n.id, type: n.type === 'news' ? 'news' : 'admin', title: n.title || 'ข้อความจากผู้ดูแลระบบ', body: n.body, time: n.time || new Date().toISOString() }, RT.first); changed = true; markChatDot(n); }
    });
    RT.srv = srv;
    var before = ud.notices.length;
    ud.notices = ud.notices.filter(function (n) { return !SRV_NOTICE_RE.test(String(n.id || '')) || srv[n.id]; });
    if (ud.notices.length !== before) changed = true;
  }
  if (Array.isArray(r.ann)) {
    var act = {};
    r.ann.forEach(function (a) {
      var id = 'ann-' + a.id; act[id] = 1;
      if (!have[id] && !read[id]) { addNotice({ id: id, type: a.type || 'news', title: a.title, body: a.body, time: a.time }, RT.first); changed = true; }
    });
    var b2 = ud.notices.length;
    ud.notices = ud.notices.filter(function (n) { return String(n.id || '').indexOf('ann-') !== 0 || act[n.id]; });
    if (ud.notices.length !== b2) changed = true;
  }
  if (changed) { saveUD(); renderHeaderBits(); if (S.ui && S.ui.view === 'notifications') bgRefresh(true); }
  if (r.cv && S.catVer && r.cv !== S.catVer && !RT.catLoading) {
    RT.catLoading = true;
    loadCatalog(true).then(function () { RT.catLoading = false; toast('อัปเดตข้อมูลกฎหมายล่าสุดแล้ว', 'ผู้ดูแลระบบปรับปรุงฐานข้อมูล หน้าเว็บโหลดเนื้อหาใหม่ให้อัตโนมัติ', 'ok'); }, function () { RT.catLoading = false; });
  }
  if (r.chat && r.chat.lastAdmin && r.chat.lastAdmin > (store.get('chatSeen', '') || '')) { if (S.ui.view !== 'chat') setChatDot(true); else CHAT.poke(); }
  RT.first = false;
}
function markChatDot(n) { if (n && (/^MSG-/i.test(n.id) || n.type === 'admin') && S.ui.view !== 'chat') setChatDot(true); }
function setChatDot(on) {
  var b = document.querySelector('.tab[data-tab="chat"]'); if (!b) return;
  var d = b.querySelector('.chat-dot');
  if (on && !d) { d = document.createElement('span'); d.className = 'chat-dot'; b.appendChild(d); }
  if (!on && d) d.remove();
}

/* ---------------- 3) หน้าหลักไม่เด้ง: การอัปเดตเบื้องหลังจะวาดใหม่เฉพาะเมื่อข้อมูลเปลี่ยนจริง และคงตำแหน่งหน้า ---------------- */
var RC = { last: {} };
function viewSig() {
  try {
    var u = S.ud ? Object.assign({}, S.ud) : {}; delete u.time; delete u.timeDev;
    /* ลำดับการแจ้งเตือนที่สลับกันระหว่างซิงก์ ไม่ถือว่าเนื้อหาเปลี่ยน */
    var v = S.ui && S.ui.view;
    u.notices = v === 'notifications' ? (u.notices || []).map(function (n) { return n.id + (u.readNotices && u.readNotices[n.id] ? '1' : '0'); }).sort()
      : v === 'home' ? (u.notices || []).filter(function (n) { return n.type === 'news'; }).slice(0, 3).map(function (n) { return n.id; }) : [];
    if (v !== 'notifications') delete u.readNotices;
    var norm = JSON.stringify([S.ui && S.ui.view, S.catVer, u, S.member, S.flags], function (k, v) {
      if (v && typeof v === 'object' && !Array.isArray(v)) { var ks = Object.keys(v); if (!ks.length) return undefined; var o = {}; ks.sort().forEach(function (x) { o[x] = v[x]; }); return o; }
      if (Array.isArray(v) && !v.length) return undefined;
      return v;
    });
    RC.norm = norm;
    return norm.length + ':' + hashStr(norm);
  } catch (e) { return String(Math.random()); }
}
function hashStr(s) { var h = 0; for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; } return String(h); }
(function () {
  var base = renderView;
  renderView = function (view, opt) { var r = base.apply(this, arguments); try { RC.last[view] = viewSig(); RC.lastNorm = RC.norm; } catch (e) {} return r; };
})();
function bgRefresh(force) {
  if (!S.ui || !S.ui.view || !document.getElementById('view')) return;
  var v = S.ui.view;
  if (!force && RC.last[v] === viewSig()) return;
  if (document.documentElement.classList.contains('scroll-lock') && !force) return;
  var box = document.getElementById('view'), y = window.scrollY, hgt = box.offsetHeight;
  box.style.minHeight = hgt + 'px';
  renderView(v, { noAnim: true, keepScroll: true });
  window.scrollTo(0, y);
  requestAnimationFrame(function () { requestAnimationFrame(function () { box.style.minHeight = ''; window.scrollTo(0, y); }); });
}
bootstrap = function (fresh) {
  return api('bootstrap', {}).then(function (r) {
    S.member = r.member; store.set('member', r.member);
    S.flags = r.flags || S.flags; store.set('flags', S.flags);
    if (r.userData) {
      var merged = mergeUD(S.ud || defaultUD(), r.userData);
      S.ud = merged; S.rev = r.rev; store.set(udKey(), S.ud); store.set(udKey() + '.rev', S.rev);
    } else if (fresh) { saveUD(true); }
    (r.announcements || []).forEach(function (a) { addNotice({ id: 'ann-' + a.id, type: a.type || 'news', title: a.title, body: a.body, time: a.time }, true); });
    /* ประกาศที่ผู้ดูแลปิดแล้ว / ข้อความที่ผู้ดูแลลบแล้ว ไม่ให้กลับมาจากข้อมูลสำรองเดิม */
    if (S.ud && Array.isArray(r.announcements)) {
      var act = {}; r.announcements.forEach(function (a) { act['ann-' + a.id] = 1; });
      S.ud.notices = S.ud.notices.filter(function (n) { var id = String(n.id || ''); if (id.indexOf('ann-') === 0) return act[id]; if (SRV_NOTICE_RE.test(id) && RT.srv) return RT.srv[id]; return true; });
    }
    applySettings();
    renderHeaderBits();
    bgRefresh(false);
    if (r.member.accountStatus === 'ปิดใช้งาน') reactivatePrompt();
    if (r.alerts && r.alerts.length) securityAlert(r.alerts[r.alerts.length - 1]);
    flushOutbox();
    if (r.catalogVersion && r.catalogVersion !== S.catVer) loadCatalog(true);
    return true;
  }).catch(function (e) { dlog('bootstrap', e.msg || e.code); return false; });
};
loadCatalog = function (force) {
  if (catPromise && !force) return catPromise;
  catPromise = api('getCatalog', { version: force ? '' : S.catVer }, { timeout: 40000 }).then(function (r) {
    if (!r.unchanged && r.catalog) {
      S.catalog = r.catalog; S.catVer = r.version;
      store.set('catalog', S.catalog); store.set('catVer', S.catVer);
      indexCatalog(); bgRefresh(false);
    }
    return S.catalog;
  }).catch(function (e) { catPromise = null; if (!S.catalog) toast('ยังไม่สามารถโหลดฐานข้อมูลกฎหมายได้', e.msg, 'warn'); return S.catalog; });
  return catPromise;
};

/* ---------------- 4) หน้าปิดปรับปรุง: โลโก้กึ่งกลาง รายละเอียดเป็นหัวข้อ กลับมาใช้งานเองเมื่อเปิดระบบ ---------------- */
var MAINT = { on: false, timer: null };
function maintParse(msg, d) {
  d = d || {};
  var lines = String(msg || '').split(/\n/), info = { head: [], reason: d.reason || '', start: d.start || '', end: d.end || '', law: d.law || '', contact: d.contact || '', rest: [] }, cur = null;
  lines.forEach(function (ln) {
    var s = ln.trim(); if (!s) { cur = null; return; }
    var m = s.match(/^(สาเหตุ|เหตุผล|ปิดใช้งานตั้งแต่|เริ่ม|คาดว่าจะเปิดใช้งาน|เปิดใช้งาน|ข้อกฎหมายที่เกี่ยวข้อง|ติดต่อผู้ดูแลระบบ|ติดต่อ)\s*[:：]\s*(.*)$/);
    if (m) {
      var k = /สาเหตุ|เหตุผล/.test(m[1]) ? 'reason' : /ตั้งแต่|เริ่ม/.test(m[1]) ? 'start' : /คาดว่า|เปิดใช้งาน/.test(m[1]) ? 'end' : /กฎหมาย/.test(m[1]) ? 'law' : 'contact';
      info[k] = info[k] || m[2]; cur = k; if (!m[2]) info[k] = ''; return;
    }
    if (cur && (cur === 'law' || cur === 'reason')) { info[cur] = (info[cur] ? info[cur] + '\n' : '') + s; return; }
    if (!info.reason && !info.head.length) info.head.push(s); else info.rest.push(s);
  });
  return info;
}
function statusPage(o) {
  try { var tb = document.getElementById('toasts'); if (tb) tb.innerHTML = ''; } catch (e) {}
  var row = function (icn, label, val) { return val ? '<div class="sp-row"><span class="sp-ic">' + ic(icn) + '</span><div class="grow"><div class="sp-l">' + esc(label) + '</div><div class="sp-v">' + esc(val) + '</div></div></div>' : ''; };
  return '<main class="status-page ' + (o.tone || '') + '" id="' + o.id + '"><div class="sp-card">' +
    '<div class="sp-logo"><img src="' + LOGO + '" alt="คลังกฎหมาย"></div><div class="sp-brand">THAI LAW LIBRARY · คลังกฎหมาย</div>' +
    '<div class="sp-badge">' + ic(o.icon) + '<span>' + esc(o.badge) + '</span></div><h1>' + esc(o.title) + '</h1>' +
    (o.lead ? '<p class="sp-lead">' + esc(o.lead) + '</p>' : '') +
    '<div class="sp-rows">' + (o.rows || []).map(function (r) { return row(r[0], r[1], r[2]); }).join('') + '</div>' +
    (o.extra || '') +
    '<div class="sp-live"><span class="sp-dot"></span><span id="' + o.id + 'Live">' + esc(o.live || 'ระบบกำลังตรวจสอบสถานะอัตโนมัติทุก 3 วินาที หน้านี้จะเปลี่ยนเองเมื่อพร้อมใช้งาน') + '</span></div>' +
    '<div class="sp-act"><button class="btn k" id="' + o.id + 'Retry">' + ic('refresh') + ' ตรวจสอบอีกครั้ง</button></div>' +
    '<div class="sp-foot">ติดต่อผู้ดูแลระบบ: ' + esc(o.contact || OFFICIAL_EMAIL_FE) + '</div></div></main>';
}
var OFFICIAL_EMAIL_FE = 'thailawlibrary.official@gmail.com';
function showMaintenance10(msg, detail) {
  MAINT.on = true; clearTimeout(RT.timer);
  try { $$('.focus,.fv-reader,.av-view,.dk-reader,.gd-view').forEach(function (x) { x.remove(); }); var ly = document.getElementById('layer'); if (ly) ly.innerHTML = ''; syncScrollLock(); } catch (e) {}
  var sp = document.getElementById('splash'); if (sp) sp.remove();
  detail = detail || BOOT.maint || null;
  var info = maintParse(msg || (detail && detail.msg) || SYS_DOWN_TEXT, detail);
  var html = statusPage({ id: 'maintPage', tone: 'o', icon: 'wrench', badge: 'ปิดปรับปรุงระบบชั่วคราว', title: info.head[0] || 'เว็บไซต์ปิดปรับปรุงระบบชั่วคราว',
    lead: 'ข้อมูลบัญชี บันทึก ประวัติ และข้อมูลส่วนตัวของท่านยังคงได้รับการเก็บรักษาไว้ครบถ้วน',
    rows: [['info', 'สาเหตุ', info.reason], ['clock', 'ปิดใช้งานตั้งแต่', info.start], ['calendar', 'คาดว่าจะเปิดใช้งาน', info.end], ['scale', 'ข้อกฎหมายที่เกี่ยวข้อง', info.law], ['user', 'ผู้ติดต่อ', info.contact]],
    extra: (info.head.slice(1).concat(info.rest).length ? '<div class="sp-note">' + info.head.slice(1).concat(info.rest).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' : '') });
  var cur = document.getElementById('maintPage');
  if (cur) { cur.outerHTML = html; } else { ROOT.innerHTML = html; window.scrollTo(0, 0); }
  $('#maintPageRetry').onclick = function () { maintCheck(true); };
  clearTimeout(MAINT.timer); MAINT.timer = setTimeout(maintCheck, 3000);
}
/* 25_boot.js ประกาศ showMaintenance ภายหลัง จึงติดตั้งฉบับใหม่ก่อน boot() เริ่มทำงาน */
showMaintenance = showMaintenance10;
document.addEventListener('DOMContentLoaded', function () { showMaintenance = showMaintenance10; });
function maintCheck(manual) {
  clearTimeout(MAINT.timer);
  var b = document.getElementById('maintPageRetry'); if (manual && b) b.disabled = true;
  api('ping', {}, { noRetry: true, timeout: 10000, silent: true }).then(function (r) {
    var m = r && r.maint;
    if (m && m.on) {
      var live = document.getElementById('maintPageLive'); if (live) live.textContent = 'ยังอยู่ระหว่างปรับปรุง · ตรวจสอบล่าสุด ' + fmtTime(new Date());
      if (manual) toast('ระบบยังอยู่ระหว่างปรับปรุง', 'หน้านี้จะเปลี่ยนเองทันทีเมื่อผู้ดูแลเปิดระบบ', 'warn');
      if (m.msg && (m.msg !== MAINT.msg)) { var first = !MAINT.msg; MAINT.msg = m.msg; if (!first) { showMaintenance10(m.msg, m); return; } }
      MAINT.timer = setTimeout(maintCheck, 3000);
    } else { maintEnd(); }
  }).catch(function () { MAINT.timer = setTimeout(maintCheck, 4000); }).then(function () { if (b) b.disabled = false; });
}
function maintEnd() {
  MAINT.on = false; clearTimeout(MAINT.timer); BOOT.maintenance = null;
  restoreAfterStatus('เปิดใช้งานระบบแล้ว', 'ผู้ดูแลระบบเปิดใช้งานเว็บไซต์เรียบร้อย');
}
/* กลับเข้าสู่หน้าเว็บโดยไม่โหลดหน้าใหม่ (ไม่มีหน้าจอขาว) */
function restoreAfterStatus(t, b) {
  try {
    if (S.token && S.member) {
      if (!S.ud) loadLocalUD();
      renderApp(); nav((S.ui && S.ui.view) || 'home', { noAnim: true });
      startHeartbeat(); bootstrap(false); rtStart();
    } else {
      var ps = store.get('pubScreen', 'welcome');
      if (ps === 'login') renderLogin(); else renderWelcome();
    }
    if (!S.catalog) loadCatalog(); else loadCatalog(true);
    try { loadTreaties(); } catch (e) {}
    toast(t, b, 'ok');
  } catch (err) { reportError('restore', err); ROOT.innerHTML = '<main class="status-page"><div class="sp-card"><div class="sp-logo"><img src="' + LOGO + '" alt=""></div><h1>กำลังเชื่อมต่อใหม่</h1><button class="btn k" onclick="location.reload()">' + ic('refresh') + ' โหลดใหม่</button></div></main>'; }
}

/* ---------------- 5) หน้าบล็อก: เหตุผลละเอียด ไม่ล้างเซสชัน และกลับมาใช้งานเองเมื่อผู้ดูแลยกเลิกการบล็อก ---------------- */
var BLOCK = { timer: null, info: null };
showBlocked = function (msg, info) {
  BLOCK.info = info || BLOCK.info || {};
  var first = !BLOCK_SHOWN; BLOCK_SHOWN = true; clearTimeout(RT.timer);
  try { $$('.focus,.fv-reader,.av-view,.dk-reader,.gd-view').forEach(function (x) { x.remove(); }); var ly = document.getElementById('layer'); if (ly) ly.innerHTML = ''; syncScrollLock(); } catch (e) {}
  var sp = document.getElementById('splash'); if (sp) sp.remove();
  try { localStorage.setItem('tll.blocked', String(Date.now())); } catch (e) {}
  var paras = String(msg || '').split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
  var reason = BLOCK.info.reason || ((paras.filter(function (p) { return /^เหตุผลจากผู้ดูแลระบบ/.test(p); })[0] || '').replace(/^เหตุผลจากผู้ดูแลระบบ\s*[:：]\s*/, ''));
  var general = paras.filter(function (p) { return /^เหตุผลโดยทั่วไป/.test(p); })[0] || '';
  var during = paras.filter(function (p) { return /^ระหว่างการระงับ/.test(p); })[0] || '';
  var appeal = paras.filter(function (p) { return /^หากท่านเห็นว่า/.test(p); })[0] || '';
  var html = statusPage({ id: 'blockPage', tone: 'bad', icon: 'lock', badge: 'ระงับการเข้าใช้งาน', title: 'บัญชีและอุปกรณ์นี้ถูกระงับการเข้าใช้งาน',
    lead: paras[0] || 'บัญชีผู้ใช้งานและอุปกรณ์นี้ถูกระงับการเข้าใช้งานเว็บไซต์ “คลังกฎหมาย” โดยผู้ดูแลระบบ',
    rows: [['alert', 'เหตุผลจากผู้ดูแลระบบ', reason || 'ผู้ดูแลระบบยังไม่ได้ระบุเหตุผลเพิ่มเติม'], ['list', 'เหตุผลโดยทั่วไปของการระงับ', general.replace(/^เหตุผลโดยทั่วไปของการระงับ\s*ได้แก่\s*/, '')], ['shield', 'ระหว่างการระงับ', during], ['mail', 'การขอทบทวน', appeal]],
    live: 'เมื่อผู้ดูแลระบบยกเลิกการบล็อก หน้านี้จะกลับสู่การใช้งานตามปกติโดยอัตโนมัติ (ตรวจทุก 3 วินาที)', contact: BLOCK.info.contact });
  var cur = document.getElementById('blockPage');
  if (cur) cur.outerHTML = html; else { ROOT.innerHTML = html; window.scrollTo(0, 0); }
  $('#blockPageRetry').onclick = function () { blockCheck(true); };
  clearTimeout(BLOCK.timer); BLOCK.timer = setTimeout(blockCheck, 3000);
};
renderBlockedPage = function () { showBlocked(BLOCK_TEXT_FE); };
var BLOCK_TEXT_FE = 'บัญชีผู้ใช้งานและอุปกรณ์นี้ถูกระงับการเข้าใช้งานเว็บไซต์ “คลังกฎหมาย” โดยผู้ดูแลระบบ';
function blockCheck(manual) {
  clearTimeout(BLOCK.timer);
  var b = document.getElementById('blockPageRetry'); if (manual && b) b.disabled = true;
  api(S.token ? 'pulse' : 'ping', {}, { noRetry: true, timeout: 10000, silent: true }).then(function () {
    BLOCK_SHOWN = false; clearTimeout(BLOCK.timer);
    try { localStorage.removeItem('tll.blocked'); } catch (e) {}
    restoreAfterStatus('ยกเลิกการระงับแล้ว', 'ท่านสามารถใช้งานเว็บไซต์ได้ตามปกติ');
  }).catch(function (e) {
    if (e && e.code === 'BLOCKED') {
      var live = document.getElementById('blockPageLive'); if (live) live.textContent = 'ยังอยู่ระหว่างการระงับ · ตรวจสอบล่าสุด ' + fmtTime(new Date());
      if (manual) toast('ยังอยู่ระหว่างการระงับ', 'หน้านี้จะเปลี่ยนเองเมื่อผู้ดูแลระบบยกเลิกการบล็อก', 'warn');
      BLOCK.timer = setTimeout(blockCheck, 3000);
    } else if (e && e.code === 'NO_SESSION') { BLOCK_SHOWN = false; restoreAfterStatus('ยกเลิกการระงับแล้ว', 'กรุณาเข้าสู่ระบบอีกครั้ง'); }
    else BLOCK.timer = setTimeout(blockCheck, 4000);
  }).then(function () { if (b) b.disabled = false; });
}
/* ส่งรายละเอียดเหตุผล (reason) จากเซิร์ฟเวอร์เข้าหน้าบล็อก + ระหว่างแสดงหน้าสถานะ ไม่ให้หน้าอื่นมาทับ */
(function () {
  var baseApi = api;
  api = function (action, payload, opt) {
    return baseApi(action, payload, opt).then(function (r) { return r; }, function (e) {
      if (e && e.code === 'BLOCKED') { BLOCK.info = { reason: e.reason || '', contact: e.contact || '' }; if (document.getElementById('blockPage')) showBlocked(e.msg, BLOCK.info); }
      if (e && e.code === 'MAINTENANCE' && !document.getElementById('maintPage')) showMaintenance(e.msg);
      throw e;
    });
  };
  ['renderApp', 'renderLogin', 'renderWelcome', 'renderRegister'].forEach(function (fn) {
    if (typeof window[fn] !== 'function') return;
    var f = window[fn];
    window[fn] = function () { if (BLOCK_SHOWN || MAINT.on) return; return f.apply(this, arguments); };
  });
})();

/* ---------------- 6) พิกัดแม่นยำ: ป๊อปอัปขออนุญาต → GPS ความแม่นยำสูง → บันทึก lat/lng ---------------- */
var GEO10 = { asked: false };
function geoAskFlow() {
  if (GEO10.asked || !S.token || !navigator.geolocation) return;
  GEO10.asked = true;
  try { if (sessionStorage.getItem('tll.geo10') === S.token.slice(-12)) return; } catch (e) {}
  var go = function () {
    navigator.geolocation.getCurrentPosition(function (p) {
      var lat = p.coords.latitude, lng = p.coords.longitude, acc = p.coords.accuracy;
      var send = function (place) { api('geoUpdate', { lat: lat, lng: lng, acc: acc, place: place || '' }, { noRetry: true, silent: true }).then(function () { try { sessionStorage.setItem('tll.geo10', S.token.slice(-12)); } catch (e) {} }).catch(function () {}); };
      fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + lat + '&longitude=' + lng + '&localityLanguage=th').then(function (r) { return r.json(); }).then(function (j) {
        var a = (j.localityInfo && j.localityInfo.administrative) || [];
        var parts = [j.locality, j.city, j.principalSubdivision, j.countryName].concat(a.slice(-3).map(function (x) { return x.name; })).filter(Boolean).filter(function (x, i, arr) { return arr.indexOf(x) === i; }).slice(0, 4);
        send(parts.join(', '));
      }).catch(function () { send(''); });
    }, function (err) { if (err && err.code === 1) { try { store.set('geoDenied', true); } catch (e) {} } }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  };
  var ask = function () {
    modal({ title: 'ขออนุญาตเข้าถึงตำแหน่งของอุปกรณ์', icon: 'pin', ok: 'อนุญาต', cancel: 'ไม่ใช่ตอนนี้',
      html: '<div class="prose"><p class="noindent">เพื่อความปลอดภัยของบัญชี ระบบจะบันทึกพิกัดตำแหน่งที่แม่นยำ (ละติจูด/ลองจิจูดจาก GPS ของอุปกรณ์) ของการเข้าใช้งานครั้งนี้ไว้ในประวัติการเข้าสู่ระบบของท่าน เพื่อใช้ตรวจสอบการเข้าใช้งานที่ผิดปกติ</p><p class="noindent">ข้อมูลนี้เป็นข้อมูลส่วนบุคคลตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 ใช้เพื่อความปลอดภัยเท่านั้น ไม่เปิดเผยแก่บุคคลภายนอก เว้นแต่มีกฎหมายกำหนด เมื่อกด “อนุญาต” เบราว์เซอร์จะแสดงหน้าต่างขออนุญาตอีกครั้ง</p></div>' })
      .then(function (ok) { if (ok) go(); });
  };
  try {
    if (navigator.permissions && navigator.permissions.query) navigator.permissions.query({ name: 'geolocation' }).then(function (st) { if (st.state === 'granted') go(); else if (st.state === 'prompt') ask(); }).catch(ask);
    else ask();
  } catch (e) { ask(); }
}

/* ---------------- 7) แชทกับผู้ดูแลระบบ ---------------- */
var CHAT_TERMS = [
  ['ขอบเขตของบริการแชท', 'ช่องทางแชทนี้ใช้สำหรับติดต่อผู้ดูแลระบบเว็บไซต์ “คลังกฎหมาย” เรื่องการใช้งานเว็บไซต์ บัญชีผู้ใช้งาน การแจ้งข้อมูลกฎหมายคลาดเคลื่อน การร้องเรียน และการแจ้งเหตุด้านความปลอดภัย ข้อความทุกข้อความถูกบันทึกพร้อมวันเวลา รหัสสมาชิก และชื่อผู้ใช้งาน เพื่อใช้ติดตามและตอบกลับ ผู้ดูแลระบบจะตอบกลับโดยเร็วตามลำดับเรื่อง คำตอบจะแสดงในหน้านี้และในกล่องการแจ้งเตือน'],
  ['การขอข้อมูลส่วนบุคคล', 'สมาชิกมีสิทธิขอเข้าถึงและขอรับสำเนาข้อมูลส่วนบุคคล “ของตนเองเท่านั้น” ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 มาตรา 30 ผู้ดูแลระบบจะตรวจสอบตัวตนของผู้ขอก่อนดำเนินการทุกครั้ง ระบบจะไม่เปิดเผยข้อมูลส่วนบุคคลของสมาชิกรายอื่น ไม่ว่ากรณีใด ๆ เว้นแต่มีกฎหมายกำหนดหรือมีคำสั่งของศาลหรือเจ้าหน้าที่ผู้มีอำนาจตามกฎหมาย นอกจากนี้ สมาชิกมีสิทธิขอแก้ไขข้อมูลให้ถูกต้อง (มาตรา 35 และมาตรา 36) ขอลบหรือทำลายข้อมูล (มาตรา 33) ขอระงับการใช้ข้อมูล (มาตรา 34) และคัดค้านการเก็บรวบรวม ใช้ หรือเปิดเผยข้อมูล (มาตรา 32) ตามเงื่อนไขที่กฎหมายกำหนด'],
  ['การร้องเรียนและการรายงาน', 'โปรดระบุรายละเอียดให้ครบถ้วน เช่น ชื่อกฎหมาย เลขมาตรา หน้าที่พบปัญหา วันเวลา และลักษณะของปัญหา เพื่อให้ตรวจสอบได้รวดเร็ว เรื่องร้องเรียนจะถูกบันทึกในรายการเรื่องร้องเรียน/รายงานของผู้ดูแลระบบ และติดตามสถานะได้จากคำตอบในแชทนี้ การแจ้งข้อมูลอันเป็นเท็จ การกลั่นแกล้ง หรือการแอบอ้างเป็นบุคคลอื่น อาจเป็นความผิดตามกฎหมาย'],
  ['ข้อห้ามในการใช้งาน', 'ห้ามส่งข้อความหยาบคาย ข่มขู่ หมิ่นประมาท (ประมวลกฎหมายอาญา มาตรา 326 และมาตรา 328) ห้ามส่งข้อมูลอันเป็นเท็จหรือข้อมูลที่ก่อความเสียหายเข้าสู่ระบบคอมพิวเตอร์ (พระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ พ.ศ. 2550 มาตรา 14) ห้ามส่งรหัสผ่าน คำตอบกู้คืนบัญชี เลขบัตรประชาชน หรือข้อมูลทางการเงินผ่านแชท ผู้ดูแลระบบจะไม่ขอรหัสผ่านของท่านไม่ว่ากรณีใด'],
  ['ข้อจำกัดความรับผิด', 'คำตอบในแชทเป็นการให้ข้อมูลเกี่ยวกับการใช้งานเว็บไซต์และข้อมูลกฎหมายเบื้องต้น มิใช่คำปรึกษาทางกฎหมายเฉพาะคดี หากท่านต้องการคำปรึกษาทางกฎหมาย กรุณาติดต่อทนายความหรือหน่วยงานที่เกี่ยวข้อง'],
  ['การเก็บรักษาข้อความ', 'ข้อความแชทจัดเก็บในระบบฐานข้อมูลของเว็บไซต์ ซึ่งเข้าถึงได้เฉพาะสมาชิกเจ้าของบัญชีและผู้ดูแลระบบที่ได้รับมอบหมายเท่านั้น และเก็บรักษาไว้เท่าที่จำเป็นต่อการให้บริการ การตรวจสอบเรื่องร้องเรียน และการปฏิบัติตามกฎหมาย เมื่อกด “ตกลง” ถือว่าท่านได้อ่านและยอมรับกติกาการใช้งานแชทนี้แล้ว']
];
function chatTerms() {
  return new Promise(function (resolve) {
    var scrim = openScrim(function () { done(false); });
    var wrap = h('<div class="modal-wrap ct-wrap" role="dialog" aria-modal="true" aria-label="กติกาการใช้งานแชท"></div>');
    wrap.innerHTML = '<div class="modal ct-card"><button class="icon-btn ct-x" data-x aria-label="ปิด">' + ic('x') + '</button>' +
      '<div class="ct-head"><span class="mic">' + ic('chat') + '</span><div><h3>กติกาและข้อกำหนดการใช้งานแชท</h3><div class="muted small">กรุณาอ่านก่อนเริ่มสนทนากับผู้ดูแลระบบ</div></div></div>' +
      '<div class="ct-body">' + CHAT_TERMS.map(function (t, i) { return '<section><h4>' + (i + 1) + '. ' + esc(t[0]) + '</h4><p>' + esc(t[1]) + '</p></section>'; }).join('') + '</div>' +
      '<div class="ct-actions"><button class="btn" data-c>ยกเลิก</button><button class="btn k" data-ok>' + ic('check') + ' ตกลง</button></div></div>';
    document.getElementById('layer').appendChild(wrap);
    var m = wrap.firstChild; requestAnimationFrame(function () { m.classList.add('on'); });
    var fin = false;
    function done(v) { if (fin) return; fin = true; m.classList.remove('on'); closeScrim(scrim); setTimeout(function () { wrap.remove(); syncScrollLock(); }, 250); resolve(v); }
    wrap.querySelector('[data-x]').onclick = function () { done(false); };
    wrap.querySelector('[data-c]').onclick = function () { done(false); };
    wrap.querySelector('[data-ok]').onclick = function () { done(true); };
    wrap.addEventListener('click', function (e) { if (e.target === wrap) done(false); });
    syncScrollLock();
  });
}
var CHAT = { msgs: [], timer: null, busy: false, outbox: [], poke: function () { if (S.ui.view === 'chat') { clearTimeout(CHAT.timer); CHAT.timer = setTimeout(chatPoll, 100); } } };
function chatKey() { return 'chat.' + ((S.member && S.member.memberId) || ''); }
function chatLoadLocal() { CHAT.msgs = store.get(chatKey(), []) || []; CHAT.outbox = store.get(chatKey() + '.out', []) || []; }
function chatSaveLocal() { store.set(chatKey(), CHAT.msgs.slice(-400)); store.set(chatKey() + '.out', CHAT.outbox); }
VIEWS.chat = function (el) {
  chatLoadLocal(); setChatDot(false);
  el.innerHTML = '<div class="chat10"><div class="ch-head"><span class="mic">' + ic('chat') + '</span><div class="grow"><h2>แชทกับผู้ดูแลระบบ</h2><div class="muted small" id="chStat">เชื่อมต่อแบบเรียลไทม์ · ข้อความใหม่แสดงภายในไม่กี่วินาที</div></div><button class="icon-btn" id="chRules" aria-label="กติกาการใช้งาน" title="กติกาการใช้งาน">' + ic('info') + '</button></div>' +
    '<div class="ch-log" id="chLog" aria-live="polite"></div>' +
    '<form class="ch-form" id="chForm" autocomplete="off"><textarea id="chIn" rows="1" maxlength="5000" placeholder="พิมพ์ข้อความถึงผู้ดูแลระบบ… (Enter เพื่อขึ้นบรรทัดใหม่)"></textarea><button class="btn k ch-send" type="submit" aria-label="ส่ง">' + ic('send') + '<span>ส่ง</span></button></form>' +
    '<div class="tiny muted ch-hint">ข้อความยาวได้สูงสุด 5,000 ตัวอักษรต่อข้อความ · ส่งต่อเนื่องได้หลายข้อความ · หากสัญญาณอินเทอร์เน็ตขาด ระบบจะเก็บข้อความไว้และส่งให้อัตโนมัติ</div></div>';
  chatDraw(true);
  var inp = $('#chIn', el);
  var grow = function () { inp.style.height = 'auto'; inp.style.height = Math.min(inp.scrollHeight, 180) + 'px'; };
  inp.addEventListener('input', grow);
  try { var dr = store.get(chatKey() + '.draft', ''); if (dr) { inp.value = dr; grow(); } } catch (e) {}
  inp.addEventListener('input', debounce(function () { store.set(chatKey() + '.draft', inp.value); }, 400));
  $('#chForm', el).onsubmit = function (e) {
    e.preventDefault();
    var t = inp.value.replace(/\s+$/, ''); if (!t.trim()) return;
    var chunks = []; for (var i = 0; i < t.length; i += 5000) chunks.push(t.slice(i, i + 5000));
    chunks.forEach(function (c) { var m = { cid: uid() + uid(), time: new Date().toISOString(), sender: 'member', text: c, status: 'pending' }; CHAT.outbox.push(m); CHAT.msgs.push(m); });
    inp.value = ''; grow(); store.set(chatKey() + '.draft', ''); chatSaveLocal(); chatDraw(true); chatFlush();
    try { inp.focus({ preventScroll: true }); } catch (x) {}
  };
  $('#chRules', el).onclick = function () { chatTerms(); };
  on($('#chLog', el), 'click', '[data-retry]', function () { chatFlush(true); });
  chatFlush(); chatPoll();
};
function chatDraw(stick) {
  var log = document.getElementById('chLog'); if (!log) return;
  var near = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  var day = '';
  var html = CHAT.msgs.length ? CHAT.msgs.map(function (m) {
    var d = fmtDate(m.time), sep = d !== day ? '<div class="ch-day"><span>' + esc(d) + '</span></div>' : ''; day = d;
    var me = m.sender === 'member';
    var st = me ? (m.status === 'pending' ? '<span class="ch-st">' + ic('clock') + ' กำลังส่ง</span>' : m.status === 'failed' ? '<button class="ch-st bad" data-retry>' + ic('alert') + ' ส่งไม่สำเร็จ · แตะเพื่อส่งอีกครั้ง</button>' : '<span class="ch-st">' + ic('check') + ' ส่งแล้ว</span>') : '';
    return sep + '<div class="ch-msg ' + (me ? 'me' : 'adm') + '">' + (me ? '' : '<div class="ch-who">' + ic('shieldCheck') + ' ' + esc(m.adminName || 'ผู้ดูแลระบบ') + '</div>') + '<div class="ch-bub">' + esc(m.text).replace(/\n/g, '<br>') + '</div><div class="ch-meta">' + fmtTime(m.time) + ' ' + st + '</div></div>';
  }).join('') : '<div class="empty"><div class="eic">' + ic('chat') + '</div><h3>เริ่มสนทนากับผู้ดูแลระบบ</h3><p>พิมพ์คำถาม ข้อร้องเรียน หรือแจ้งปัญหาการใช้งานได้ที่ช่องด้านล่าง</p></div>';
  if (log.getAttribute('data-h') === String(hashStr(html))) return;
  log.setAttribute('data-h', String(hashStr(html)));
  log.innerHTML = html;
  if (stick || near) log.scrollTop = log.scrollHeight;
}
function chatMerge(list) {
  var byId = {}, changed = false;
  CHAT.msgs.forEach(function (m) { if (m.id) byId[m.id] = m; });
  (list || []).forEach(function (x) {
    if (byId[x.id]) return;
    var pend = CHAT.msgs.filter(function (m) { return !m.id && m.sender === 'member' && m.text === x.text && m.status !== 'failed'; })[0];
    if (pend && x.sender === 'member') { pend.id = x.id; pend.time = x.time; pend.status = 'sent'; changed = true; return; }
    CHAT.msgs.push({ id: x.id, time: x.time, sender: x.sender, adminName: x.adminName, text: x.text, status: 'sent' }); changed = true;
  });
  if (changed) { CHAT.msgs.sort(function (a, b) { return String(a.time) < String(b.time) ? -1 : 1; }); chatSaveLocal(); }
  return changed;
}
function chatPoll() {
  clearTimeout(CHAT.timer);
  if (S.ui.view !== 'chat' || !S.token || BLOCK_SHOWN || MAINT.on) return;
  if (document.visibilityState !== 'visible' || CHAT.busy) { CHAT.timer = setTimeout(chatPoll, 2000); return; }
  CHAT.busy = true;
  api('chatList', {}, { noRetry: true, timeout: 15000, silent: true }).then(function (r) {
    var ch = chatMerge(r.msgs);
    var lastA = ''; CHAT.msgs.forEach(function (m) { if (m.sender === 'admin' && m.time > lastA) lastA = m.time; });
    if (lastA) store.set('chatSeen', lastA);
    if (ch) chatDraw(false);
    var s = document.getElementById('chStat'); if (s) s.textContent = 'เชื่อมต่อแล้ว · อัปเดตล่าสุด ' + fmtTime(new Date());
  }).catch(function () { var s = document.getElementById('chStat'); if (s) s.textContent = 'กำลังเชื่อมต่อใหม่… ข้อความของท่านจะไม่สูญหาย'; })
    .then(function () { CHAT.busy = false; CHAT.timer = setTimeout(chatPoll, 2000); });
}
function chatFlush(manual) {
  if (CHAT.flushing || !CHAT.outbox.length || !S.token) return;
  CHAT.flushing = true;
  var m = CHAT.outbox[0], msg = CHAT.msgs.filter(function (x) { return x.cid === m.cid; })[0] || m;
  msg.status = 'pending'; chatDraw(false);
  api('chatSend', { text: m.text, cid: m.cid }, { noRetry: true, timeout: 20000 }).then(function (r) {
    CHAT.outbox.shift(); msg.id = r.id; msg.time = r.time; msg.status = 'sent'; chatSaveLocal(); chatDraw(false);
    CHAT.flushing = false; if (CHAT.outbox.length) chatFlush();
  }).catch(function (e) {
    CHAT.flushing = false;
    if (e && (e.code === 'EMPTY' || e.code === 'TOO_LONG' || e.code === 'REJECTED')) { CHAT.outbox.shift(); msg.status = 'failed'; toast('ส่งข้อความไม่สำเร็จ', e.msg, 'bad'); }
    else { msg.status = 'failed'; setTimeout(function () { chatFlush(); }, 4000); }
    chatSaveLocal(); chatDraw(false);
  });
}
window.addEventListener('online', function () { if (S.token) chatFlush(); });
/* แตะปุ่ม “แชท” → แสดงกติกาก่อนทุกครั้ง: ตกลง (ขวาล่าง) · ยกเลิก (ซ้ายล่าง) · X (ขวาบน) */
(function () {
  var baseNav = nav;
  nav = function (view, opt) {
    if (view === 'chat' && !(opt && opt.termsOk) && S.ui.view !== 'chat') {
      chatTerms().then(function (ok) { if (ok) baseNav('chat', Object.assign({}, opt || {}, { termsOk: true })); else $$('.tab[data-tab]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === S.ui.view); }); });
      return;
    }
    if (view !== 'chat') clearTimeout(CHAT.timer);
    return baseNav.apply(this, arguments);
  };
})();

/* ---------------- 8) เริ่มระบบเรียลไทม์หลังเข้าสู่ระบบ / เปิดเว็บที่ล็อกอินค้างไว้ ---------------- */
(function () {
  var baseApp = renderApp;
  renderApp = function () {
    var r = baseApp.apply(this, arguments);
    if (S.token && !BLOCK_SHOWN && !MAINT.on) { rtStart(); setTimeout(geoAskFlow, 2500); }
    return r;
  };
  /* ถ้ามุมมองล่าสุดคือแชท ให้กลับไปหน้าหลักเมื่อเปิดเว็บใหม่ (ต้องยอมรับกติกาก่อน) */
  try { if (S.ui && S.ui.view === 'chat') S.ui.view = 'home'; } catch (e) {}
})();
</script>
