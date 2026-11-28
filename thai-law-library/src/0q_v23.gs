/* =========================================================================
 *  v23 (แสดงผลเป็นเวอร์ชัน 1.0.0)
 *  1) แนะนำตัวผู้สร้าง: แก้สาเหตุที่หน้าเว็บที่เปิดค้างไว้ไม่เปลี่ยนตามการกด “เผยแพร่” จนกว่าจะรีเฟรช
 *     - เดิมลายเซ็นการเปลี่ยนแปลง (creatorSig) ดูเพียงความยาวข้อความ + updatedAt + ค่า "on" ตัวแรก
 *       จึงไม่เห็นการเปลี่ยนรูป/สถานะ/ข้อความที่ยาวเท่าเดิม → หน้าเว็บที่เปิดอยู่ไม่รู้ว่ามีการเปลี่ยน
 *     - ใหม่: ลายเซ็น = ค่าแฮชของข้อมูลทั้งหมด เปลี่ยนแม้ 1 ตัวอักษรก็รู้ภายในรอบ ping ถัดไป (2–5 วินาที)
 *     - รูปภาพต่อท้ายเลขรุ่น (?v=) เบราว์เซอร์จึงไม่แสดงรูปเก่าจากแคช
 *  2) ทดลองใช้งาน: GUEST_MODE.disabled มี "voice" = ผู้ทดลองใช้งานฟังเสียงอ่านกฎหมายไม่ได้ (ทั้งฝั่งเซิร์ฟเวอร์และหน้าเว็บ)
 *  3) ช่องทางของระบบหลังบ้าน (Vercel): doPost {"tll":"admin","a":"<คำสั่ง>","t":"<โทเค็น>",...}
 *     ตอบกลับ JSON · ทุกคำสั่งเขียนลงชีตเดียวกับหน้าเว็บและล้างแคชทันที หน้าเว็บเห็นผลในรอบ ping ถัดไป
 * ========================================================================= */
CONFIG.VERSION = '23.0.0';
CONFIG.VERSION_LABEL = '1.0.0';

/* ---------------- 1) แนะนำตัวผู้สร้าง ---------------- */
function sig23_(s) { return sha256Hex_(String(s || '')).slice(0, 20); }
var liveModesV22_ = liveModes_;
liveModes_ = function (cfg) {
  var o = liveModesV22_(cfg);
  try { var x = JSON.parse(creatorRaw20_()); o.creatorSig = sig23_(x.raw + '|' + (x.maint ? 'm' : '')); } catch (e) {}
  return o;
};
function photoV23_(url, ver) {
  url = String(url || ''); if (!/^https:\/\//.test(url) || /^data:/.test(url)) return url;
  if (/[?&]v=/.test(url)) return url;
  return url + (url.indexOf('?') > -1 ? '&' : '?') + 'v=' + ver;
}
var creatorProfileV22_ = creatorProfile20_;
creatorProfile20_ = function () {
  var p = creatorProfileV22_();
  try {
    if (p && p.on) {
      var ver = sig23_(String(p.updatedAt || '') + '|' + String(p.photo || '')).slice(0, 8);
      if (p.photo) p.photo = photoV23_(p.photo, ver);
      (p.cards || []).forEach(function (c) { if (c && c.img) c.img = photoV23_(c.img, ver); });
    }
  } catch (e) {}
  return p;
};
ROUTES.creatorProfile = { fn: function () { return { profile: creatorProfile20_() }; }, limit: 600 };

/* ---------------- 2) ทดลองใช้งาน: ปิดเสียงอ่านกฎหมาย ---------------- */
function guestVoiceOff23_(cfg) {
  try {
    var g = JSON.parse(String((cfg || getConfig_()).GUEST_MODE || '{}'));
    return Array.isArray(g.disabled) && g.disabled.indexOf('voice') > -1;
  } catch (e) { return false; }
}
var GUEST_VOICE_MSG_ = 'เสียงอ่านกฎหมายเปิดให้บริการเฉพาะสมาชิก ระหว่างช่วงทดลองใช้งานยังไม่สามารถฟังเสียงได้ กรุณาสมัครสมาชิกหรือเข้าสู่ระบบเพื่อใช้งาน';
(function () {
  var r = ROUTES.tts; if (!r) return;
  var base = r.fn;
  r.fn = function (p, ctx) {
    if (ctx && ctx.member && ctx.member.memberId === GUEST_ID && guestVoiceOff23_(ctx.cfg)) return fail_('GUEST_VOICE', GUEST_VOICE_MSG_);
    return base.apply(this, arguments);
  };
})();

/* ---------------- 3) ช่องทางระบบหลังบ้าน ---------------- */
var ADMIN23 = {
  TTL: 6 * 3600,
  /* ค่าที่ระบบหลังบ้านแก้ไม่ได้ (ระบบเขียนเอง หรือเป็นข้อมูลรหัสผ่าน) */
  READONLY: { ADMIN_ACCOUNTS: 1, ADMIN_EDIT_LOCK: 1, IMPORT_STATUS: 1, LAST_HEALTH: 1, ONLINE_NOW: 1, LAW_COUNTS: 1, GUEST_NOW: 1, ADMIN_LAW_STATS: 1 },
  /* ค่าที่หน้าระบบหลังบ้านมีหน้าควบคุมเฉพาะแล้ว */
  KNOWN: ['MAINTENANCE', 'MAINTENANCE_MESSAGE', 'ADMIN_MAINT', 'SECTION_MAINT', 'GUEST_MODE', 'RATING_MODE', 'CREATOR_PROFILE', 'CREATOR_PROFILE_FULL', 'LIVE_UI',
    'FORCE_SAFE_MODE', 'CANARY_PERCENT', 'CANARY_FLAGS', 'SPLASH_SECONDS', 'LOCK_ATTEMPTS', 'LOCK_MINUTES', 'IDLE_MINUTES', 'AI_DAILY_LIMIT_STANDARD', 'AI_DAILY_LIMIT_PRO',
    'GEMINI_MODEL', 'GA4_ID', 'ADMIN_SETTINGS', 'ADMIN_LAW_SOURCES', 'ADMIN_BLOCKLIST', 'ADMIN_KNOWN_KEYS', 'ADMIN_ACCOUNTS', 'ADMIN_EDIT_LOCK', 'IMPORT_STATUS',
    'LAST_HEALTH', 'ONLINE_NOW', 'LAW_COUNTS', 'GUEST_NOW', 'ADMIN_LAW_STATS', 'DATA_VERSION'],
  SECTIONS: [['content', 'เนื้อหากฎหมายทั้งหมด'], ['thai', 'กฎหมายไทย'], ['foreign', 'กฎหมายต่างประเทศ'], ['deka', 'คำพิพากษาศาลฎีกา'], ['treaties', 'อนุสัญญา/สนธิสัญญา'],
    ['tools', 'เครื่องมือ'], ['ai', 'ผู้ช่วย AI'], ['chat', 'แชทกับผู้ดูแล'], ['horo', 'ดูดวง'], ['rating', 'ให้คะแนน'], ['creator', 'แนะนำตัวผู้สร้าง'], ['voice', 'เสียงอ่านกฎหมาย']],
  GUEST_OFF: [['login', 'ปุ่มเข้าสู่ระบบ'], ['signup', 'ปุ่มสมัครสมาชิก'], ['chat', 'แชทกับผู้ดูแล'], ['voice', 'เสียงอ่านกฎหมาย (ฟังประมวลกฎหมาย/รัฐธรรมนูญ)']]
};
function adminOut23_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function adminCfgRaw23_() {
  var out = {}; delete _rowsCache.Config;
  rows_('Config').forEach(function (r) { if (r.key) out[String(r.key)] = { value: String(r.value === null || r.value === undefined ? '' : r.value), note: String(r.note || '') }; });
  return out;
}
function adminFlush23_() {
  try { CacheService.getScriptCache().removeAll(['cfg', 'cr20raw', 'blkdev', 'blkdev3', 'online10', 'lawcounts10']); } catch (e) {}
  delete _rowsCache.Config; delete _rowsCache.Members;
}
function adminSet23_(key, value, who) {
  key = String(key || '').trim();
  if (!/^[A-Z][A-Z0-9_]{1,60}$/.test(key)) throw { code: 'BAD_KEY', msg: 'ชื่อการตั้งค่าไม่ถูกต้อง' };
  if (ADMIN23.READONLY[key]) throw { code: 'READONLY', msg: 'ค่านี้ระบบเป็นผู้บันทึกเอง แก้ไขจากระบบหลังบ้านไม่ได้' };
  value = String(value === null || value === undefined ? '' : value);
  if (value.length > 45000) throw { code: 'TOO_LARGE', msg: 'ข้อมูลยาวเกินขีดจำกัดของช่องในชีต (45,000 ตัวอักษร)' };
  var lock = LockService.getScriptLock(); lock.waitLock(15000);
  try { delete _rowsCache.Config; setConfigValue_(key, value); } finally { lock.releaseLock(); }
  adminFlush23_();
  try { audit_(who.memberId, 'ADMIN_SET', key + ' = ' + value.slice(0, 300)); } catch (e) {}
}
function adminJson23_(s, d) { try { var o = JSON.parse(String(s || '')); return o === null ? d : o; } catch (e) { return d; } }

/* ผู้ดูแลระบบ: role = admin ในชีต Members หรือ memberId อยู่ใน ADMIN_ACCOUNTS (สถานะ active) */
function adminAllowed23_(m) {
  if (!m) return false;
  if (String(m.role || '') === 'admin') return true;
  var list = adminJson23_(getConfig_().ADMIN_ACCOUNTS, []);
  return Array.isArray(list) && list.some(function (a) { return a && a.memberId === m.memberId && String(a.status || 'active') === 'active'; });
}
function adminSession23_(t) {
  if (!t || String(t).length < 30) return null;
  var c = CacheService.getScriptCache(), k = 'adm23_' + sha256Hex_(String(t)).slice(0, 40), v = c.get(k);
  if (!v) return null;
  var s = JSON.parse(v); c.put(k, v, ADMIN23.TTL);
  return s;
}
function adminLogin23_(p) {
  var c = CacheService.getScriptCache(), user = String(p.username || '').trim().slice(0, 80);
  if (!user) return { ok: false, code: 'INVALID', msg: 'กรุณากรอกชื่อผู้ใช้งาน' };
  var fk = 'adm23f_' + sha256Hex_(user.toLowerCase()).slice(0, 24), fails = Number(c.get(fk) || 0);
  if (fails >= 5) return { ok: false, code: 'LOCKED', msg: 'กรอกข้อมูลไม่ถูกต้องครบ 5 ครั้ง ระบบระงับการเข้าสู่ระบบหลังบ้านของบัญชีนี้ 15 นาที' };
  var m = findMemberByLogin_(user), ok = false;
  if (m && String(m.accountStatus || '') !== 'ระงับ') ok = checkAdminPass_(String(p.adminPass || ''), m) && verifyPassword_(String(p.personalPass || ''), m.salt, m.personalHash);
  var info = p.client || {};
  try { appendRow_('LoginLog', { time: new Date().toISOString(), username: cell_(user), memberId: m ? m.memberId : '', result: ok && adminAllowed23_(m) ? 'OK' : 'FAIL', reason: 'ระบบหลังบ้าน (Vercel)', ip: cell_(info.ip), device: cell_(info.device), os: cell_(info.os), browser: cell_(info.browser) }); } catch (e) {}
  if (!ok) {
    c.put(fk, String(fails + 1), 900);
    if (fails + 1 >= 5) try { raiseIncident_({ type: 'Brute force ระบบหลังบ้าน', severity: 'HIGH', memberId: m ? m.memberId : '', username: user, ip: info.ip, device: info.device, detail: 'กรอกรหัสผ่านระบบหลังบ้านไม่ถูกต้องติดต่อกัน 5 ครั้ง', attempts: 5 }); } catch (e) {}
    return { ok: false, code: 'BAD_CREDENTIALS', msg: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง (เหลือโอกาสอีก ' + Math.max(0, 4 - fails) + ' ครั้ง)' };
  }
  if (!adminAllowed23_(m)) return { ok: false, code: 'FORBIDDEN', msg: 'บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ' };
  c.remove(fk);
  var t = randomToken_(48), s = { memberId: m.memberId, username: m.username, name: String(m.displayName || m.firstName || m.username), at: new Date().toISOString() };
  c.put('adm23_' + sha256Hex_(t).slice(0, 40), JSON.stringify(s), ADMIN23.TTL);
  try { audit_(m.memberId, 'ADMIN_LOGIN', 'เข้าสู่ระบบหลังบ้าน (Vercel)'); } catch (e) {}
  return { ok: true, token: t, admin: s };
}

/* ผู้ใช้งานที่กำลังใช้งานอยู่ + ผู้ที่เพิ่งออกจากเว็บไซต์ (ประวัติ) */
function adminLive23_() {
  var c = CacheService.getScriptCache(), hit = c.get('adm23live');
  if (hit) return JSON.parse(hit);
  var now = Date.now(), win = ONLINE_WINDOW_MS, sh = sheet_('Sessions'), last = sh.getLastRow(), head = SHEETS.Sessions;
  var names = {}; delete _rowsCache.Members;
  rows_('Members').forEach(function (m) { names[m.memberId] = { name: String(m.displayName || m.firstName || m.username || ''), username: String(m.username || ''), type: String(m.memberType || '') }; });
  var online = {}, left = {};
  if (last >= 2) {
    var ix = {}; head.forEach(function (h, i) { ix[h] = i; });
    var start = Math.max(2, last - 800), vals = sh.getRange(start, 1, last - start + 1, head.length).getValues();
    vals.forEach(function (r) {
      var mid = String(r[ix.memberId] || ''); if (!mid || mid === GUEST_ID) return;
      var act = r[ix.activeAt] ? new Date(r[ix.activeAt]).getTime() : (r[ix.lastSeen] ? new Date(r[ix.lastSeen]).getTime() : 0);
      var on = (r[ix.online] === true || String(r[ix.online]).toUpperCase() === 'TRUE') && String(r[ix.revoked]).toUpperCase() !== 'TRUE' && act && now - act <= win;
      var n = names[mid] || {};
      var row = { memberId: mid, name: n.name || mid, username: n.username || '', type: n.type || '', device: String(r[ix.device] || ''), os: String(r[ix.os] || ''), browser: String(r[ix.browser] || ''), location: String(r[ix.location] || ''), activeAt: act ? new Date(act).toISOString() : '', since: String(r[ix.createdAt] instanceof Date ? r[ix.createdAt].toISOString() : r[ix.createdAt] || '') };
      if (on) { if (!online[mid] || online[mid].activeAt < row.activeAt) online[mid] = row; }
      else if (act && now - act < 48 * 3600000) { if (!left[mid] || left[mid].activeAt < row.activeAt) left[mid] = row; }
    });
  }
  Object.keys(online).forEach(function (k) { delete left[k]; });
  var guests = [], gLeft = [];
  try {
    var g = adminJson23_(adminCfgRaw23_().GUEST_NOW ? adminCfgRaw23_().GUEST_NOW.value : '', {}) || {};
    (g.visitors || []).forEach(function (v) {
      var t = v.activeAt ? Date.parse(v.activeAt) : 0;
      var row = { id: String(v.id || ''), device: String(v.device || ''), os: String(v.os || ''), browser: String(v.browser || ''), location: String(v.location || ''), page: String(v.page || ''), views: Number(v.views || 0), activeAt: String(v.activeAt || ''), since: String(v.firstAt || '') };
      if (t && now - t <= win) guests.push(row); else if (t && now - t < 48 * 3600000) gLeft.push(row);
    });
  } catch (e) {}
  var byAct = function (a, b) { return String(b.activeAt).localeCompare(String(a.activeAt)); };
  var out = {
    at: new Date().toISOString(), windowSec: win / 1000,
    members: Object.keys(online).map(function (k) { return online[k]; }).sort(byAct),
    guests: guests.sort(byAct),
    left: Object.keys(left).map(function (k) { var x = left[k]; x.kind = 'member'; return x; }).concat(gLeft.map(function (x) { x.kind = 'guest'; return x; })).sort(byAct).slice(0, 60)
  };
  out.count = out.members.length + out.guests.length;
  try { c.put('adm23live', JSON.stringify(out), 1); } catch (e) {}
  return out;
}

/* สถานะทั้งหมดที่หน้าระบบหลังบ้านใช้วาดปุ่ม + ค่าที่หน้าเว็บไซต์เพิ่มใหม่ (ยังไม่มีปุ่มเฉพาะ) */
function adminState23_() {
  var raw = adminCfgRaw23_(), v = function (k) { return raw[k] ? raw[k].value : ''; };
  var known = {}; ADMIN23.KNOWN.forEach(function (k) { known[k] = 1; });
  adminJson23_(v('ADMIN_KNOWN_KEYS'), []).forEach(function (k) { known[k] = 1; });
  var flags = [], uiKeys = [], fresh = [];
  Object.keys(raw).forEach(function (k) {
    if (/^FLAG_/.test(k)) flags.push({ key: k, value: raw[k].value, note: raw[k].note, isNew: !known[k] });
    else if (/^UI_/.test(k)) uiKeys.push({ key: k, value: raw[k].value, note: raw[k].note, isNew: !known[k] });
    else if (!known[k]) fresh.push({ key: k, value: raw[k].value.slice(0, 4000), note: raw[k].note, readonly: !!ADMIN23.READONLY[k] });
  });
  var mem = { total: 0, blocked: 0, admins: 0 };
  try { delete _rowsCache.Members; rows_('Members').forEach(function (m) { if (m.memberId === GUEST_ID) return; mem.total++; if (isBlocked_(m)) mem.blocked++; if (adminAllowed23_(m)) mem.admins++; }); } catch (e) {}
  return {
    version: CONFIG.VERSION, label: CONFIG.VERSION_LABEL, siteUrl: safeUrl_(),
    maintenance: { on: v('MAINTENANCE') === 'on', message: v('MAINTENANCE_MESSAGE'), detail: adminJson23_(v('ADMIN_MAINT'), {}) },
    sectionMaint: adminJson23_(v('SECTION_MAINT'), {}), sections: ADMIN23.SECTIONS,
    guest: adminJson23_(v('GUEST_MODE'), { on: false }), guestOff: ADMIN23.GUEST_OFF,
    rating: adminJson23_(v('RATING_MODE'), { on: false }),
    creator: adminJson23_(v('CREATOR_PROFILE_FULL') || v('CREATOR_PROFILE'), { on: false }),
    creatorLive: adminJson23_(v('CREATOR_PROFILE'), { on: false }),
    liveUi: v('LIVE_UI'), flags: flags, uiKeys: uiKeys, fresh: fresh, members: mem,
    lawCounts: adminJson23_(v('LAW_COUNTS'), {}), health: v('LAST_HEALTH')
  };
}
function adminMembers23_(p) {
  delete _rowsCache.Members;
  var q = String(p.q || '').toLowerCase().trim(), off = Math.max(Number(p.offset) || 0, 0), list = [];
  rows_('Members').forEach(function (m) {
    if (m.memberId === GUEST_ID) return;
    var name = String(m.displayName || '') + ' ' + String(m.firstName || '') + ' ' + String(m.lastName || '');
    if (q && (String(m.memberId) + ' ' + String(m.username) + ' ' + name + ' ' + String(m.email || '')).toLowerCase().indexOf(q) < 0) return;
    list.push({ memberId: m.memberId, username: m.username, name: (String(m.title || '') + String(m.firstName || '') + ' ' + String(m.lastName || '')).trim() || String(m.displayName || ''),
      type: String(m.memberType || ''), status: String(m.accountStatus || 'ปกติ'), blocked: isBlocked_(m), blockReason: blockReasonOf_(m), admin: adminAllowed23_(m),
      createdAt: String(m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt || ''), lastActive: String(m.lastActive instanceof Date ? m.lastActive.toISOString() : m.lastActive || m.lastLogin || '') });
  });
  list.sort(function (a, b) { return String(b.lastActive).localeCompare(String(a.lastActive)); });
  return { total: list.length, offset: off, items: list.slice(off, off + 50) };
}
function adminBlock23_(p, who) {
  var m = findMemberById_(String(p.memberId || ''));
  if (!m || m.memberId === GUEST_ID) throw { code: 'NOT_FOUND', msg: 'ไม่พบสมาชิก' };
  if (p.on && adminAllowed23_(m)) throw { code: 'FORBIDDEN', msg: 'ไม่สามารถบล็อกบัญชีผู้ดูแลระบบได้' };
  var reason = String(p.reason || '').slice(0, 1000);
  updateRow_('Members', m._row, { blocked: p.on ? 'บล็อก' : '', blockReason: p.on ? reason : '' });
  adminFlush23_();
  try { audit_(who.memberId, p.on ? 'ADMIN_BLOCK' : 'ADMIN_UNBLOCK', m.memberId + (reason ? ' · ' + reason : '')); } catch (e) {}
  return { memberId: m.memberId, blocked: !!p.on };
}

function adminApi23_(j) {
  var a = String(j.a || '');
  if (a === 'login') return adminLogin23_(j);
  if (a === 'ping') return { ok: true, version: CONFIG.VERSION, at: new Date().toISOString() };
  var who = adminSession23_(j.t);
  if (!who) return { ok: false, code: 'AUTH', msg: 'กรุณาเข้าสู่ระบบหลังบ้านอีกครั้ง' };
  try {
    switch (a) {
      case 'logout': CacheService.getScriptCache().remove('adm23_' + sha256Hex_(String(j.t)).slice(0, 40)); return { ok: true };
      case 'live': return { ok: true, live: adminLive23_() };
      case 'state': return { ok: true, state: adminState23_(), live: adminLive23_(), admin: who };
      case 'members': return { ok: true, members: adminMembers23_(j) };
      case 'block': return { ok: true, result: adminBlock23_(j, who) };
      case 'set': {
        var items = Array.isArray(j.items) ? j.items : [{ key: j.key, value: j.value }];
        items.slice(0, 20).forEach(function (it) { adminSet23_(it.key, typeof it.value === 'object' && it.value !== null ? JSON.stringify(it.value) : it.value, who); });
        return { ok: true, state: adminState23_() };
      }
      case 'maintenance': {
        var mm = j.on ? 'on' : 'off', det = { reason: String(j.reason || '').slice(0, 2000), start: String(j.start || ''), end: String(j.end || ''), law: String(j.law || ''), contact: String(j.contact || ''), by: who.memberId, at: new Date().toISOString(), scheduled: false };
        adminSet23_('ADMIN_MAINT', JSON.stringify(det), who);
        if (j.message !== undefined) adminSet23_('MAINTENANCE_MESSAGE', String(j.message).slice(0, 8000), who);
        adminSet23_('MAINTENANCE', mm, who);
        return { ok: true, state: adminState23_() };
      }
      case 'creator': {
        var full = adminJson23_(getConfig_().CREATOR_PROFILE_FULL, {}) || {}, pr = j.profile || {};
        ['name', 'role', 'photo', 'bio'].forEach(function (k) { if (pr[k] !== undefined) full[k] = String(pr[k] || '').slice(0, k === 'bio' ? 8000 : 2000); });
        if (Array.isArray(pr.cards)) full.cards = pr.cards.slice(0, 12).map(function (c) { return { title: String(c.title || '').slice(0, 200), text: String(c.text || '').slice(0, 2000), img: String(c.img || '').slice(0, 2000) }; });
        if (j.publish !== undefined) full.on = !!j.publish;
        full.updatedAt = new Date().toISOString(); full.by = who.memberId;
        var pub = {}; ['on', 'name', 'role', 'photo', 'photoId', 'bio', 'cards', 'updatedAt'].forEach(function (k) { if (full[k] !== undefined) pub[k] = full[k]; });
        adminSet23_('CREATOR_PROFILE_FULL', JSON.stringify(full), who);
        adminSet23_('CREATOR_PROFILE', JSON.stringify(pub), who);
        return { ok: true, state: adminState23_(), publishedAt: full.updatedAt };
      }
      case 'ackKeys': {
        var have = adminJson23_(getConfig_().ADMIN_KNOWN_KEYS, []); if (!Array.isArray(have)) have = [];
        (j.keys || []).forEach(function (k) { k = String(k); if (/^[A-Z][A-Z0-9_]{1,60}$/.test(k) && have.indexOf(k) < 0) have.push(k); });
        adminSet23_('ADMIN_KNOWN_KEYS', JSON.stringify(have), who);
        return { ok: true, state: adminState23_() };
      }
    }
    return { ok: false, code: 'BAD_ACTION', msg: 'ไม่พบคำสั่งที่ร้องขอ' };
  } catch (e) {
    if (e && e.code) return { ok: false, code: e.code, msg: e.msg };
    try { logError_('admin23.' + a, e, who.memberId); } catch (x) {}
    return { ok: false, code: 'ERROR', msg: 'ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง' };
  }
}
var doPostV22_ = doPost;
doPost = function (e) {
  try {
    var pd = e && e.postData, txt = pd && pd.contents ? String(pd.contents) : '';
    if (txt && txt.length < 200000 && /^\s*\{\s*"tll"\s*:\s*"admin"/.test(txt)) return adminOut23_(adminApi23_(JSON.parse(txt)));
  } catch (x) { try { logError_('admin23', x, ''); } catch (y) {} return adminOut23_({ ok: false, code: 'ERROR', msg: 'รูปแบบคำขอไม่ถูกต้อง' }); }
  return doPostV22_.apply(this, arguments);
};
