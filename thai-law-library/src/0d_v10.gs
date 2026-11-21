/* =========================================================================
 *  v10: เชื่อมต่อระบบหลังบ้านแบบเรียลไทม์ (เพิ่มเติมเท่านั้น ไม่ลบข้อมูล/ระบบเดิม)
 *  - สัญญาณการใช้งานจริง (presence) → Sessions.lastSeen / activeAt / online + Config.ONLINE_NOW
 *  - ตรวจข้อความ/ประกาศจากผู้ดูแลทุก 1–3 วินาที (pulse) และซ่อนเมื่อผู้ดูแลลบ/ปิด
 *  - พิกัด GPS แม่นยำ (lat/lng/±m + ลิงก์ Google Maps)
 *  - หน้าบล็อก/ปิดปรับปรุงแบบมีรายละเอียด และกลับมาใช้งานได้ทันทีเมื่อผู้ดูแลยกเลิก
 *  - แชทกับผู้ดูแลระบบ (ชีต Chat + Reports + ชีตหลังบ้าน)
 *  - API ข้อมูลกฎหมายสำหรับระบบหลังบ้าน (?api=stats / laws / law / online)
 *  - ทำความสะอาดข้อความกฎหมายต่างประเทศ (ลาว ฯลฯ) ไม่ให้แสดงเป็นโค้ด
 * ========================================================================= */
CONFIG.VERSION = '10.0.0';
SHEETS.Sessions.push('activeAt', 'online', 'lat', 'lng', 'accuracy', 'mapUrl');
SHEETS.Members.push('lastActive', 'blockReason');
SHEETS.Chat = ['id', 'time', 'memberId', 'username', 'sender', 'adminId', 'adminName', 'text', 'status'];
HEAD_TH.activeAt = 'ใช้งานจริงล่าสุด'; HEAD_TH.online = 'กำลังใช้งาน'; HEAD_TH.lat = 'ละติจูด'; HEAD_TH.lng = 'ลองจิจูด';
HEAD_TH.accuracy = 'ความแม่นยำ (เมตร)'; HEAD_TH.mapUrl = 'แผนที่'; HEAD_TH.lastActive = 'ใช้งานล่าสุด'; HEAD_TH.blockReason = 'เหตุผลการบล็อก';
HEAD_TH.lastSeen = 'ใช้งานล่าสุด'; HEAD_TH.sender = 'ผู้ส่ง'; HEAD_TH.adminId = 'รหัสผู้ดูแล'; HEAD_TH.adminName = 'ชื่อผู้ดูแล'; HEAD_TH.id = 'รหัสข้อความ';

var BACKEND_SHEET_DEFAULT = '12xG6NbCfk8rdjHT2nqbsFpfXuWtyBUBFSxQmEMzTW5Q';
var ONLINE_WINDOW_MS = 30 * 1000;   // นับว่า "กำลังใช้งาน" เมื่อมีการโต้ตอบจริงภายใน 30 วินาทีล่าสุด
var SERVER_NOTICE_RE = /^(MSG|BC|ADM|NTF)-/;

/* ---------------- เพิ่มคอลัมน์ให้ชีตเดิมอัตโนมัติ (ชีตที่มีคอลัมน์พอดี เช่น Members 44 คอลัมน์) ---------------- */
var _cols10 = {};
var sheetV9_ = sheet_;
sheet_ = function (name) {
  var sh = sheetV9_(name);
  if (!_cols10[name] && SHEETS[name]) { _cols10[name] = 1; try { ensureCols10_(sh, name); } catch (e) {} }
  return sh;
};
function ensureCols10_(sh, name) {
  var c = CacheService.getScriptCache(), need = SHEETS[name].length, k = 'cols10_' + name + '_' + need;
  if (c.get(k)) return;
  var max = sh.getMaxColumns();
  if (max < need) {
    sh.insertColumnsAfter(max, need - max);
    var head = SHEETS[name].slice(max).map(function (h) { return HEAD_TH[h] ? HEAD_TH[h] + ' (' + h + ')' : h; });
    sh.getRange(1, max + 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#EAF4FC');
    sh.getRange(2, max + 1, Math.max(sh.getMaxRows() - 1, 1), head.length).setNumberFormat('@');
  }
  c.put(k, '1', 21600);
}

/* ---------------- ค่าตั้งค่า: อ่านสด (แคช 2 วินาที) เพื่อให้การเปิด/ปิดปรับปรุงจากหลังบ้านมีผลทันที ---------------- */
function getConfig_() {
  var cache = CacheService.getScriptCache();
  var c = cache.get('cfg');
  if (c) return JSON.parse(c);
  var cfg = {};
  DEFAULT_CONFIG.forEach(function (r) { cfg[r[0]] = r[1]; });
  try { delete _rowsCache.Config; rows_('Config').forEach(function (r) { if (r.key) cfg[String(r.key)] = String(r.value); }); } catch (e) {}
  try { cache.put('cfg', JSON.stringify(cfg), 2); } catch (e) {}
  return cfg;
}

/* ---------------- rate limit: นับเป็นช่วง 10 นาที (เดิมตัวนับไม่ลดลงเมื่อใช้งานต่อเนื่อง) ---------------- */
function rateLimit_(action, token, perTenMin) {
  var cache = CacheService.getScriptCache();
  var bucket = Math.floor(Date.now() / 600000);
  var key = 'rl_' + action + '_' + (token ? sha256Hex_(token).slice(0, 16) : 'anon') + '_' + bucket;
  var n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 660);
  return n <= (token ? perTenMin : perTenMin * 20);
}

/* ---------------- การบล็อก: อัปเดตภายใน 3 วินาที + เหตุผลจากผู้ดูแล ---------------- */
function isBlocked_(m) { return m && /^(บล็อก|blocked|block|true)/i.test(String(m.blocked || '').trim()); }
function blockedDevices_() {
  var c = CacheService.getScriptCache(), hit = c.get('blkdev3');
  if (hit) return JSON.parse(hit);
  var set = {};
  delete _rowsCache.Members;
  rows_('Members').forEach(function (m) { if (isBlocked_(m)) memberDevices_(m).forEach(function (d) { set[d] = m.memberId; }); });
  c.put('blkdev3', JSON.stringify(set), 3);
  return set;
}
function blockReasonOf_(m) {
  if (!m) return '';
  var r = String(m.blockReason || '').trim();
  if (!r) { var x = String(m.blocked || '').replace(/^(บล็อก|blocked|block|true)\s*[:：\-–]?\s*/i, '').trim(); if (x) r = x; }
  if (!r) { var ex = json_(m.extraJson, {}); r = String(ex.blockReason || ex.blockedReason || '').trim(); }
  return r.slice(0, 3000);
}
function blockFail_(m) {
  var r = blockReasonOf_(m);
  var out = fail_('BLOCKED', BLOCK_TEXT + (r ? '\n\nเหตุผลจากผู้ดูแลระบบ: ' + r : ''));
  out.reason = r; out.at = (m && json_(m.extraJson, {}).blockedAt) || '';
  out.contact = OFFICIAL_EMAIL;
  return out;
}
function blockCheck_(action, payload, token) {
  var dev = String(payload._dev || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64); delete payload._dev;
  if (!dev) return null;
  var bd = blockedDevices_();
  if (bd[dev]) return blockFail_(findMemberById_(bd[dev]));
  if ((action === 'login' || action === 'verifyOtp') && payload.username) { var mu = findMemberByLogin_(payload.username); if (mu && isBlocked_(mu) && memberDevices_(mu).indexOf(dev) > -1) return blockFail_(mu); }
  if (token) {
    var m = sessionMember_(token);
    if (m) {
      var devs = memberDevices_(m);
      if (isBlocked_(m) && (devs.indexOf(dev) > -1 || !devs.length)) return blockFail_(m);
      if (devs.indexOf(dev) < 0) { devs.push(dev); updateRow_('Members', m._row, { deviceIds: devs.slice(-20).join(',') }); }
    }
  }
  return null;
}

/* ---------------- ping: บอกสถานะปิดปรับปรุงพร้อมรายละเอียด (ใช้ได้ระหว่างปิดปรับปรุง) ---------------- */
function maintInfo_(cfg) {
  var d = json_(cfg.ADMIN_MAINT, {}) || {};
  return { on: cfg.MAINTENANCE === 'on', msg: cfg.MAINTENANCE_MESSAGE || '', reason: d.reason || '', start: d.start || '', end: d.end || '', law: d.law || '', contact: d.contact || '' };
}
ROUTES.ping.fn = function (p, ctx) { var cfg = (ctx && ctx.cfg) || getConfig_(); return { t: Date.now(), v: CONFIG.VERSION, maint: maintInfo_(cfg) }; };
ROUTES.ping.limit = 600;

/* ---------------- ค้นแถวด้วย TextFinder (ไม่ต้องอ่านทั้งชีตทุก 2 วินาที) ---------------- */
function findRowsBy_(name, col, value) {
  var sh = sheet_(name), last = sh.getLastRow();
  if (last < 2 || !value) return [];
  var cells = sh.getRange(2, col, last - 1, 1).createTextFinder(String(value)).matchEntireCell(true).findAll();
  return cells.map(function (c) { return c.getRow(); });
}
function sessionRow_(th) {
  var c = CacheService.getScriptCache(), k = 'srow_' + th.slice(0, 24), r = Number(c.get(k) || 0);
  var sh = sheet_('Sessions');
  if (r > 1 && r <= sh.getLastRow() && String(sh.getRange(r, 1).getValue()) === th) return r;
  var rows = findRowsBy_('Sessions', 1, th);
  r = rows[0] || 0;
  if (r) c.put(k, String(r), 21600);
  return r;
}
function setSessionCells_(row, obj) {
  var head = SHEETS.Sessions, sh = sheet_('Sessions');
  Object.keys(obj).forEach(function (k) { var j = head.indexOf(k); if (j > -1) sh.getRange(row, j + 1).setValue(obj[k]); });
}

/* ---------------- อ่านข้อความ/การแจ้งเตือนที่ผู้ดูแลเขียนลงชีต UserData โดยตรง ---------------- */
function udServerRead_(memberId) {
  var rows = findRowsBy_('UserData', 1, memberId);
  if (!rows.length) return { data: null, rev: 0, ok: true };
  var sh = sheet_('UserData'), list = rows.map(function (r) { var v = sh.getRange(r, 1, 1, 5).getValues()[0]; return { rev: Number(v[1]) || 0, part: Number(v[3]) || 0, json: String(v[4]) }; });
  var rev = 0; list.forEach(function (x) { if (x.part === 0 && x.rev > rev) rev = x.rev; });
  var json = list.filter(function (x) { return x.rev === rev; }).sort(function (a, b) { return a.part - b.part; }).map(function (x) { return x.json; }).join('');
  var data = json_(json, null);
  return { data: data, rev: rev, ok: !!data || !json };
}
function isServerNotice_(n) { return n && (SERVER_NOTICE_RE.test(String(n.id || '')) || /^(admin|broadcast|system)$/i.test(String(n.type || ''))); }
function serverNotices_(data) {
  return ((data && data.notices) || []).filter(isServerNotice_).map(function (n) {
    return { id: String(n.id), type: String(n.type || 'admin'), title: String(n.title || 'ข้อความจากผู้ดูแลระบบ').slice(0, 300), body: String(n.body || '').slice(0, 8000), time: n.time || '', from: n.adminName || n.from || '' };
  }).slice(0, 100);
}
function activeAnnouncements_() {
  delete _rowsCache.Announcements;
  return rows_('Announcements').filter(function (a) { return a.id && String(a.active) !== 'false' && String(a.active) !== 'FALSE' && a.active !== false; })
    .map(function (a) { return { id: String(a.id), time: a.time, type: a.type || 'news', title: String(a.title || ''), body: String(a.body || '') }; });
}

/* ---------------- บันทึกข้อมูลผู้ใช้: ไม่ทับข้อความที่ผู้ดูแลส่งมาระหว่างนั้น ---------------- */
var apiSaveUserDataV9_ = apiSaveUserData_;
apiSaveUserData_ = function (p, ctx) {
  try {
    if (p && p.data && ctx && ctx.member) {
      var cur = udServerRead_(ctx.member.memberId);
      if (cur.data) {
        var srv = serverNotices_(cur.data), srvIds = {};
        srv.forEach(function (n) { srvIds[n.id] = 1; });
        var del = Object.assign({}, p.data.readNotices || {}, p.data.ndel || {}), notices = p.data.notices || [], have = {};
        // ข้อความที่ผู้ดูแลลบไปแล้ว (ไม่อยู่ในชีต) ไม่ต้องเขียนกลับ
        notices = notices.filter(function (n) { if (SERVER_NOTICE_RE.test(String(n.id || '')) && !srvIds[n.id]) return false; have[n.id] = 1; return true; });
        // ข้อความใหม่ที่ผู้ดูแลเพิ่งส่ง (อุปกรณ์ยังไม่ได้รับ) คงไว้
        (cur.data.notices || []).forEach(function (n) { if (isServerNotice_(n) && !have[n.id] && !del[n.id]) notices.unshift(n); });
        p.data.notices = notices.slice(0, 300);
      }
    }
  } catch (e) { logError_('save.mergeNotices', e, ''); }
  return apiSaveUserDataV9_(p, ctx);
};
ROUTES.saveUserData.fn = apiSaveUserData_;

/* ---------------- จำนวนผู้ใช้งานจริงขณะนี้ ---------------- */
function computeOnline_(force) {
  var c = CacheService.getScriptCache();
  if (!force) { var hit = c.get('online10'); if (hit) return JSON.parse(hit); }
  var sh = sheet_('Sessions'), last = sh.getLastRow(), head = SHEETS.Sessions;
  var out = { count: 0, sessions: 0, devices: {}, at: new Date().toISOString(), windowSec: ONLINE_WINDOW_MS / 1000 };
  if (last >= 2) {
    var iM = head.indexOf('memberId'), iA = head.indexOf('activeAt'), iO = head.indexOf('online'), iR = head.indexOf('revoked'), iD = head.indexOf('device');
    var vals = sh.getRange(2, 1, last - 1, head.length).getValues(), now = Date.now(), mem = {};
    vals.forEach(function (r) {
      var on = r[iO] === true || String(r[iO]).toUpperCase() === 'TRUE';
      var t = r[iA] ? new Date(r[iA]).getTime() : 0;
      if (!on || !t || now - t > ONLINE_WINDOW_MS || r[iR] === true || String(r[iR]).toUpperCase() === 'TRUE') return;
      out.sessions++; mem[r[iM]] = 1; var d = String(r[iD] || 'อื่น ๆ'); out.devices[d] = (out.devices[d] || 0) + 1;
    });
    out.count = Object.keys(mem).length;
  }
  c.put('online10', JSON.stringify(out), 3);
  return out;
}
function publishOnline_(force) {
  var c = CacheService.getScriptCache();
  if (c.get('onlinePub') && !force) return;
  c.put('onlinePub', '1', 5);
  try {
    var o = computeOnline_(true), sh = sheet_('Config'), rows = findRowsBy_('Config', 1, 'ONLINE_NOW');
    var v = JSON.stringify({ count: o.count, sessions: o.sessions, devices: o.devices, at: o.at, windowSec: o.windowSec });
    if (rows.length) sh.getRange(rows[0], 2).setValue(v);
    else sh.appendRow(['ONLINE_NOW', v, 'จำนวนสมาชิกที่กำลังใช้งานจริง (มีการแตะ/เลื่อน/พิมพ์ภายใน 30 วินาที) อัปเดตอัตโนมัติทุก ~5 วินาที']);
  } catch (e) { logError_('online.publish', e, ''); }
}

/* ---------------- pulse: สัญญาณใช้งานจริง + ตรวจข้อความใหม่ (เรียกทุก 1–3 วินาทีขณะเปิดหน้าอยู่) ---------------- */
function apiPulse_(p, ctx) {
  var m = ctx.member, th = sha256Hex_(ctx.token), c = CacheService.getScriptCache(), now = new Date(), iso = now.toISOString();
  var act = !!p.act, off = !!p.off;
  try {
    var wk = 'pw_' + th.slice(0, 24), lastW = Number(c.get(wk) || 0);
    if ((act && Date.now() - lastW > 4000) || off) {
      var row = sessionRow_(th);
      if (row) {
        if (off) setSessionCells_(row, { online: false });
        else setSessionCells_(row, { lastSeen: iso, activeAt: iso, online: true });
        c.put(wk, String(off ? 0 : Date.now()), 600);
        if (act && !c.get('ma_' + m.memberId)) { c.put('ma_' + m.memberId, '1', 15); var j = SHEETS.Members.indexOf('lastActive'); if (j > -1) sheet_('Members').getRange(m._row, j + 1).setValue(iso); }
      }
    }
    publishOnline_(off);   // ทุก ~5 วินาที (หรือทันทีเมื่อเลิกใช้งาน) เพื่อให้จำนวนลดลงจริงเมื่อมีคนปิดแท็บ/จอดับ
  } catch (e) { logError_('pulse.presence', e, ''); }
  var out = { t: Date.now(), cv: catalogVersion_() };
  try { var ud = udServerRead_(m.memberId); out.notices = serverNotices_(ud.data); out.nOk = ud.ok; } catch (e) { out.nOk = false; }
  try { out.ann = activeAnnouncements_(); } catch (e) { out.ann = null; }
  try { out.chat = chatSig_(m.memberId); } catch (e) {}
  try { out.dv = dataVersion_(); } catch (e) {}
  return out;
}
ROUTES.pulse = { fn: apiPulse_, auth: true, limit: 900 };

/* ---------------- ผู้ดูแลโหลดข้อมูลกฎหมายใหม่จากหลังบ้าน → หน้าเว็บอัปเดตทันที ---------------- */
function dataVersion_() {
  var cfg = getConfig_(), st = json_(cfg.ADMIN_LAW_STATS, {}) || {};
  var raw = JSON.stringify(st.lastRefresh || {}) + '|' + String(cfg.DATA_VERSION || '') + '|' + String(cfg.IMPORT_STATUS || '').slice(0, 24);
  var c = CacheService.getScriptCache(), P = PropertiesService.getScriptProperties();
  if (P.getProperty('DV_SEEN') !== raw) {
    var lock = LockService.getScriptLock();
    if (lock.tryLock(2000)) {
      try { if (P.getProperty('DV_SEEN') !== raw) { var first = !P.getProperty('DV_SEEN'); P.setProperty('DV_SEEN', raw); if (!first) { bumpCatalogVersion_(); c.removeAll(['pubstats', 'lawcounts10']); } } } finally { lock.releaseLock(); }
    }
  }
  return catalogVersion_();
}

/* ---------------- พิกัดแม่นยำจาก GPS ของอุปกรณ์ (หลังผู้ใช้อนุญาต) ---------------- */
function apiGeoUpdate_(p, ctx) {
  var lat = Number(p.lat), lng = Number(p.lng), acc = Math.round(Number(p.acc) || 0);
  if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return fail_('BAD_GEO', 'พิกัดไม่ถูกต้อง');
  var place = String(p.place || '').replace(/[<>"]/g, '').slice(0, 200);
  var url = 'https://www.google.com/maps?q=' + lat.toFixed(6) + ',' + lng.toFixed(6);
  var text = (place ? place + ' · ' : '') + 'พิกัด ' + lat.toFixed(6) + ', ' + lng.toFixed(6) + ' (±' + acc + ' ม.) · ' + url;
  var row = sessionRow_(sha256Hex_(ctx.token));
  if (!row) return fail_('NO_SESSION_ROW', 'ไม่พบเซสชัน');
  setSessionCells_(row, { location: text, lat: lat.toFixed(6), lng: lng.toFixed(6), accuracy: acc, mapUrl: url });
  return { saved: true, mapUrl: url };
}
ROUTES.geoUpdate = { fn: apiGeoUpdate_, auth: true, limit: 60 };

/* ---------------- แชทกับผู้ดูแลระบบ ---------------- */
function backendSheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('BACKEND_SHEET_ID') || BACKEND_SHEET_DEFAULT;
  try { var ss = SpreadsheetApp.openById(id); return ss.getSheets()[0]; } catch (e) { return null; }
}
function backendMsgs_(memberId) {
  var sh = backendSheet_(); if (!sh) return [];
  var last = sh.getLastRow(); if (last < 2) return [];
  var cells = sh.getRange(2, 3, last - 1, 1).createTextFinder(String(memberId)).matchEntireCell(true).findAll();
  return cells.slice(-300).map(function (c) {
    var v = sh.getRange(c.getRow(), 1, 1, 10).getValues()[0];
    return { id: String(v[0]), time: v[1] instanceof Date ? v[1].toISOString() : String(v[1]), sender: String(v[4] || 'admin').toLowerCase() === 'member' ? 'member' : 'admin', adminName: String(v[6] || ''), text: String(v[7] || '') };
  });
}
function chatThread_(m) {
  var msgs = {}, add = function (x) { if (x && x.id && x.text) msgs[x.id] = x; };
  findRowsBy_('Chat', 3, m.memberId).forEach(function (r) {
    var v = sheet_('Chat').getRange(r, 1, 1, SHEETS.Chat.length).getValues()[0];
    add({ id: String(v[0]), time: String(v[1]), sender: String(v[4]) === 'admin' ? 'admin' : 'member', adminName: String(v[6] || ''), text: String(v[7] || ''), status: String(v[8] || '') });
  });
  try { backendMsgs_(m.memberId).forEach(add); } catch (e) {}
  try { serverNotices_(udServerRead_(m.memberId).data).forEach(function (n) { if (/^MSG-/i.test(n.id) || n.type === 'admin') add({ id: n.id, time: n.time, sender: 'admin', adminName: n.from || '', text: n.body }); }); } catch (e) {}
  return Object.keys(msgs).map(function (k) { return msgs[k]; }).sort(function (a, b) { return String(a.time) < String(b.time) ? -1 : 1; }).slice(-400);
}
function chatSig_(memberId) {
  var c = CacheService.getScriptCache(), k = 'chs_' + memberId, hit = c.get(k);
  if (hit) return JSON.parse(hit);
  var lastAdmin = '';
  try { backendMsgs_(memberId).forEach(function (x) { if (x.sender === 'admin' && x.time > lastAdmin) lastAdmin = x.time; }); } catch (e) {}
  var o = { lastAdmin: lastAdmin };
  c.put(k, JSON.stringify(o), 2);
  return o;
}
function apiChatList_(p, ctx) {
  var all = chatThread_(ctx.member), since = String(p.since || '');
  return { msgs: since ? all.filter(function (x) { return x.time > since; }) : all, total: all.length, t: new Date().toISOString() };
}
function apiChatSend_(p, ctx) {
  var m = ctx.member, text = String(p.text || '').replace(/\r\n/g, '\n').trim();
  if (!text) return fail_('EMPTY', 'กรุณาพิมพ์ข้อความ');
  if (text.length > 5000) return fail_('TOO_LONG', 'ข้อความยาวเกิน 5,000 ตัวอักษร กรุณาแบ่งส่งเป็นหลายข้อความ');
  var cid = String(p.cid || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
  var c = CacheService.getScriptCache();
  if (cid) { var dup = c.get('chsent_' + cid); if (dup) return JSON.parse(dup); }   // ส่งซ้ำจากเน็ตช้า → ไม่บันทึกซ้ำ
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var now = new Date().toISOString(), id = 'CHT-' + Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase();
    appendRow_('Chat', { id: id, time: now, memberId: m.memberId, username: m.username, sender: 'member', adminId: '', adminName: '', text: cell_(text), status: 'ส่งแล้ว' });
    // แจ้งในรายการเรื่องร้องเรียน/รายงาน (รวมเป็นเรื่องเดียวต่อการสนทนาภายใน 30 นาที)
    try {
      var rep = rows_('Reports').filter(function (r) { return r.memberId === m.memberId && r.kind === 'แชทกับผู้ดูแลระบบ'; }).pop();
      var line = '[' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm') + '] ' + text;
      if (rep && rep.status === 'รอดำเนินการ' && Date.now() - new Date(rep.time).getTime() < 30 * 60000 && String(rep.detail).length + line.length < 44000) updateRow_('Reports', rep._row, { detail: String(rep.detail) + '\n' + line });
      else appendRow_('Reports', { time: now, memberId: m.memberId, username: m.username, kind: 'แชทกับผู้ดูแลระบบ', subject: cell_(text.slice(0, 80)), detail: cell_(line), status: 'รอดำเนินการ' });
    } catch (e) { logError_('chat.report', e, ''); }
    // สำเนาไปยังชีตข้อความของระบบหลังบ้าน (ผู้ส่ง = member)
    if (PropertiesService.getScriptProperties().getProperty('CHAT_MIRROR_BACKEND') !== '0') {
      try { var bs = backendSheet_(); if (bs) bs.appendRow([id, now, m.memberId, m.username, 'member', '', '', cell_(text), 'TRUE', now]); } catch (e) { logError_('chat.mirror', e, ''); }
    }
    try { if (typeof lineCall_ === 'function' && lineTargets_().length) lineCall_('/v2/bot/message/multicast', { to: lineTargets_().slice(0, 500), messages: [{ type: 'text', text: 'แชทใหม่จากสมาชิก ' + m.username + ' (' + m.memberId + ')\n' + text.slice(0, 900) }] }, id); } catch (e) {}
    var out = { id: id, time: now };
    if (cid) c.put('chsent_' + cid, JSON.stringify(out), 21600);
    return out;
  } finally { lock.releaseLock(); }
}
ROUTES.chatList = { fn: apiChatList_, auth: true, limit: 900 };
ROUTES.chatSend = { fn: apiChatSend_, auth: true, limit: 120 };

/* ---------------- ข้อความกฎหมายต่างประเทศ: ตัดโค้ด HTML/JS/CSS และเมนูเว็บไซต์ที่ติดมา ---------------- */
var cleanSourceTextV9_ = cleanSourceText_;
cleanSourceText_ = function (t) {
  t = String(t === undefined || t === null ? '' : t);
  if (/<\s*(html|body|div|p|span|br|table|td|li|a|font|strong|meta|link)\b/i.test(t)) {
    t = t.replace(/<(script|style|noscript|head|nav|footer|header|form|select|button|svg|template|iframe)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<\s*(br|\/p|\/div|\/li|\/tr|\/h[1-6]|\/table|\/section|\/article)\s*\/?>/gi, '\n')
      .replace(/<\/?[a-zA-Z!][^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>/g, ' ');
  }
  t = cleanSourceTextV9_(t);
  t = t.replace(/(^|\s)(Jump to navigation|Skip to (main )?content|Primary tabs|View\s*\(active tab\)|Main (menu|navigation)|Breadcrumb|Search form|User menu|Toggle navigation|Back to top)(?=\s|$)/gim, ' ').replace(/[ \t]{2,}/g, ' ');
  var CODE = /(\bfunction\s*\(|=>|\bvar\s+\w+\s*=|\bwindow\.|\bdocument\.|\bjQuery\b|\$\(|\bonclick\s*=|\bhref\s*=|\bsrc\s*=|\bclass\s*=|\bstyle\s*=|^\s*[.#@][\w-]+\s*\{|[{};]\s*$|^\s*\}|\bimportant\b|\bpx;|\brgba?\(|\bposition\s*:\s*|\bmargin\s*:|\bfont-family\s*:)/i;
  var CHROME = /^(Hits:|ຂຽນໂດຍ|ກົດເບິ່ງ:|Visitors Counter|You are here:?$|Start From|Home$|ຕໍ່ໄປ$|ກ່ອນໜ້າ$|ຫນ້າທຳອິດ$|ໜ້າທຳອິດ$|ຈຳນວນຜູ້ເຂົ້າເບິ່ງ|ເລີ່ມນັບຈາກ|Filters?$|Filter$|ສະແດງ #|Page \d+ of \d+|ທ່ານກຳລັງຢູ່ທີ່|ຊອກຫາ|ເຂົ້າສູ່ລະບົບ$|ລືມ(ຊື່ຜູ້ໃຊ້|ລະຫັດຜ່ານ)\??$|ຊື່ຜູ້ໃຊ້$|ລະຫັດຜ່ານ$|ຈື່ຂໍ້ມູນໄວ້|ພິມ$|ອີເມລ$|Print$|Email$|Skip to (main )?content|Search\.\.\.$|Log ?in$|Login Form|Forgot your|Remember Me|Written by|Category:|Published:|Read more)/i;
  var lines = t.split('\n'), keep = [];
  lines.forEach(function (ln) {
    var s = ln.trim();
    if (!s) { keep.push(''); return; }
    if (CHROME.test(s)) return;
    if (/^(\d\s){3,}\d$/.test(s)) return; // ตัวนับผู้เข้าชม
    if (/^\d{1,3}$/.test(s) && keep.length && /^\d{1,3}$/.test(String(keep[keep.length - 1]).trim())) return; // ตัวเลือกจำนวนแถวต่อหน้า 5 10 15 ...
    var sym = (s.match(/[{}();=<>\[\]\\|$]/g) || []).length, letters = (s.match(/[A-Za-z฀-໿฀-๿]/g) || []).length;
    if (CODE.test(s) && (sym >= 2 || !/[຀-໿฀-๿]{4,}/.test(s))) return;
    if (sym > 6 && sym > letters / 3) return;
    if (/^["']?\s*(on\w+|href|title|rel|target|data-[\w-]+)\s*=/.test(s)) return;
    keep.push(s.replace(/"\s*(on\w+|rel|target)="[^"]*"/g, '').replace(/^"\s*>\s*/, ''));
  });
  var out = keep.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (isLegacyGarble_(out)) return LEGACY_FONT_NOTE;
  return out;
};
/* เอกสาร PDF ภาษาลาวรุ่นเก่าที่ใช้ฟอนต์ไม่ใช่ Unicode (ตัวอักษรถูกแทนด้วยสัญลักษณ์ละติน เช่น ~1J@'1~) — แปลงกลับอย่างถูกต้องไม่ได้ จึงไม่แสดงเป็นโค้ด */
var LEGACY_FONT_NOTE = 'ต้นฉบับเอกสารนี้จัดทำด้วยแบบอักษรรุ่นเก่าที่ไม่ใช่มาตรฐาน Unicode (พบบ่อยในเอกสาร PDF ภาษาลาว) แหล่งข้อมูลต้นทางจึงบันทึกตัวอักษรเป็นสัญลักษณ์ที่อ่านไม่ได้ ระบบไม่สามารถแปลงกลับเป็นอักษรจริงได้อย่างถูกต้องครบถ้วน และไม่นำสัญลักษณ์ดังกล่าวมาแสดง เพื่อป้องกันความคลาดเคลื่อนของตัวบทกฎหมาย กรุณาเปิดอ่านจากลิงก์แหล่งข้อมูลต้นทางด้านล่าง';
function isLegacyGarble_(t) {
  var s = String(t || '').replace(/\s+/g, '');
  if (s.length < 150) return false;
  var sp = (s.match(/[~@;"'`^|\\]/g) || []).length, lao = (s.match(/[\u0E80-\u0EFF\u0E00-\u0E7F]/g) || []).length;
  var words = (String(t).match(/\b[A-Za-z]{4,}\b/g) || []).length;
  return sp / s.length > 0.05 && lao / s.length < 0.05 && words / (s.length / 6) < 0.25;
}

/* ---------------- API ข้อมูลกฎหมายสำหรับระบบหลังบ้าน ---------------- */
function lawCounts10_() {
  var c = CacheService.getScriptCache(), hit = c.get('lawcounts10');
  if (hit) return JSON.parse(hit);
  var s = apiPublicStatsV8_(), k = s.counts || {};
  var o = {
    thai: k.thai || {}, foreign: k.foreign || {}, total: k.total || {}, asOf: k.asOf || '',
    sheet: { laws: Math.max(sheet_('Laws').getLastRow() - 1, 0), sections: Math.max(sheet_('Sections').getLastRow() - 1, 0) },
    deka: Number(s.deka || s.dekaCount || 0) || undefined,
    links: {
      thaiIndex: DB_RAW_ + 'thai/', world: DB_RAW_ + 'world/manifest.json', deka: DB_RAW_ + 'deka/index.json.gz', treaties: DB_RAW_ + 'treaties/index.json.gz',
      sheet: 'https://docs.google.com/spreadsheets/d/' + CONFIG.SHEET_ID, api: safeUrl_() + '?api=laws'
    },
    updatedAt: new Date().toISOString()
  };
  c.put('lawcounts10', JSON.stringify(o), 300);
  return o;
}
var DB_RAW_ = 'https://raw.githubusercontent.com/buycanthrphriphrm186-sketch/JFCPA/claude/legal-ai-website-system-4h1org/thai-law-library/db/';
function writeLawCounts_() {
  try {
    var o = lawCounts10_(), v = JSON.stringify({ thai: o.thai.laws, foreign: o.foreign.laws, total: o.total.laws, thaiSections: o.thai.sections, foreignSections: o.foreign.sections, totalSections: o.total.sections, countries: o.foreign.countries, sheetLaws: o.sheet.laws, sheetSections: o.sheet.sections, api: o.links.api, updatedAt: o.updatedAt });
    var rows = findRowsBy_('Config', 1, 'LAW_COUNTS'), sh = sheet_('Config');
    if (rows.length) sh.getRange(rows[0], 2).setValue(v); else sh.appendRow(['LAW_COUNTS', v, 'จำนวนกฎหมาย/มาตราทั้งหมดของเว็บไซต์ (ไทย/ต่างประเทศ/รวม) และลิงก์ API สำหรับระบบหลังบ้าน — อัปเดตอัตโนมัติทุกชั่วโมง']);
  } catch (e) { logError_('lawcounts.write', e, ''); }
}
function backendKey_() {
  var P = PropertiesService.getScriptProperties(), k = P.getProperty('BACKEND_API_KEY');
  if (!k) { k = randomToken_(40); P.setProperty('BACKEND_API_KEY', k); }
  return k;
}
/** เรียกจากหน้าแก้ไขสคริปต์เพื่อดูคีย์ API สำหรับระบบหลังบ้าน (ไม่แสดงในหน้าเว็บ) */
function showBackendKey() { Logger.log('BACKEND_API_KEY = ' + backendKey_()); }
function jsonOut_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function apiHttp_(p) {
  var a = String(p.api || '');
  try {
    if (a === 'stats') return jsonOut_({ ok: true, counts: lawCounts10_() });
    if (a === 'laws') {
      var cat = apiGetCatalog_({}).catalog || { laws: [] }, off = Math.max(Number(p.offset) || 0, 0), lim = Math.min(Math.max(Number(p.limit) || 500, 1), 2000);
      var laws = cat.laws || [];
      if (p.q) { var q = String(p.q).toLowerCase(); laws = laws.filter(function (l) { return String(l.name || l.title || '').toLowerCase().indexOf(q) > -1; }); }
      return jsonOut_({ ok: true, total: laws.length, offset: off, limit: lim, laws: laws.slice(off, off + lim), counts: lawCounts10_() });
    }
    if (a === 'law') {
      var id = String(p.id || '').slice(0, 80);
      if (!id) return jsonOut_({ ok: false, msg: 'ต้องระบุ id' });
      var info = null; try { (apiGetCatalog_({}).catalog.laws || []).some(function (l) { if (String(l.id) === id) { info = l; return true; } return false; }); } catch (e) {}
      return jsonOut_({ ok: true, id: id, law: info, sections: sectionsOfLaw_(id) });
    }
    if (a === 'online' || a === 'maint') {
      if (String(p.k || '') !== backendKey_()) return jsonOut_({ ok: false, code: 'FORBIDDEN', msg: 'คีย์ไม่ถูกต้อง' });
      if (a === 'online') return jsonOut_({ ok: true, online: computeOnline_(true) });
      return jsonOut_({ ok: true, maint: maintInfo_(getConfig_()) });
    }
    return jsonOut_({ ok: false, msg: 'api ที่รองรับ: stats, laws, law, online, maint' });
  } catch (e) { logError_('http.' + a, e, ''); return jsonOut_({ ok: false, msg: 'ระบบขัดข้องชั่วคราว' }); }
}
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.api) return apiHttp_(p);
  var boot = { v: CONFIG.VERSION, url: safeUrl_(), social: null, maintenance: null };
  try {
    ensureInit_();
    var cfg = getConfig_();
    if (cfg.MAINTENANCE === 'on' && p.admin !== '1') { boot.maintenance = cfg.MAINTENANCE_MESSAGE; boot.maint = maintInfo_(cfg); }
    if (p.code && p.state) boot.social = oauthCallback_(p.code, p.state, null);
    if (p.error && p.state) boot.social = { ok: false, msg: 'ผู้ให้บริการยกเลิกหรือปฏิเสธการเข้าสู่ระบบ (' + String(p.error).slice(0, 60) + ')' };
    boot.splash = Math.min(Math.max(Number(cfg.SPLASH_SECONDS) || 20, 1), 30);
    boot.ga4 = /^G-[A-Z0-9]{4,16}$/.test(String(cfg.GA4_ID || '')) ? cfg.GA4_ID : '';
    boot.flags = publicFlags_(cfg, null);
  } catch (err) {
    logError_('doGet', err, '');
    boot.bootError = 'ระบบไม่สามารถเชื่อมต่อฐานข้อมูลได้ชั่วคราว';
  }
  return renderIndex_(boot);
}

/* ---------------- งานรายชั่วโมง + อัปเกรด ---------------- */
function hourlyV10() { writeLawCounts_(); try { computeOnline_(true); publishOnline_(); } catch (e) {} }
var installTriggersV8_ = installTriggers_;
installTriggers_ = function () {
  installTriggersV8_();
  var have = {};
  ScriptApp.getProjectTriggers().forEach(function (t) { have[t.getHandlerFunction()] = true; });
  if (!have.hourlyV10) ScriptApp.newTrigger('hourlyV10').timeBased().everyHours(1).create();
};
var upgradeV9_ = upgradeV5_;
upgradeV5_ = function () {
  upgradeV9_();
  try { sheet_('Chat'); } catch (e) { logError_('upgrade10.chat', e, ''); }
  try { ensureHeaders_(); } catch (e) {}
  try { backendKey_(); writeLawCounts_(); } catch (e) { logError_('upgrade10.counts', e, ''); }
  CacheService.getScriptCache().removeAll(['cfg', 'blkdev', 'blkdev3', 'online10', 'lawcounts10']);
};
var cleanArticlesV9_ = cleanArticles_;
cleanArticles_ = function (out) {
  out = cleanArticlesV9_(out);
  try {
    var bad = 0, n = (out && out.articles || []).length;
    (out && out.articles || []).forEach(function (a) {
      var joined = (a.paras || []).map(function (p) { return [p.s].concat((p.items || []).map(function (i) { return i.s || i; })).join('\n'); }).join('\n');
      if (isLegacyGarble_(joined)) { bad++; a.paras = [{ n: '', s: LEGACY_FONT_NOTE, items: [] }]; }
    });
    if (n > 3 && bad / n > 0.6) { out.articles = [out.articles[0]]; out.legacyFont = true; }
  } catch (e) {}
  return out;
};
