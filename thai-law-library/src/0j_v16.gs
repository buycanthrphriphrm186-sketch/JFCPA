/* =========================================================================
 *  v16: ส่วนที่ระบบหลังบ้านควบคุม แล้วแสดงบนหน้าเว็บไซต์หลักทันที (เพิ่มเท่านั้น ไม่แก้ระบบเดิม)
 *  ใช้ค่าจากชีต Config เดียวกับระบบหลังบ้าน:
 *  - GUEST_MODE   {"on","from","to","title","message","notice","endMessage","disabled":[...],"announcedAt"}
 *  - ADMIN_MAINT  {"reason","start","end","scheduled"}  (ปิดปรับปรุงทั้งเว็บแบบตั้งเวลาล่วงหน้า)
 *  - SECTION_MAINT {"key":{"on","scheduled","start","end","reason"}}
 *  - GUEST_NOW    {"at","visitors":[...]}  ← เว็บไซต์หลักบันทึกผู้ทดลองใช้งาน (ตัวเลขสีส้มและตารางที่ 2 ในหลังบ้าน)
 *  ข้อมูลที่ส่งให้หน้าเว็บเป็นข้อมูลสาธารณะเท่านั้น (ไม่มีข้อมูลสมาชิก)
 * ========================================================================= */
CONFIG.VERSION = '16.0.0';

function j16_(s) { try { var o = JSON.parse(String(s || '')); return o && typeof o === 'object' ? o : null; } catch (e) { return null; } }
function t16_(v) { var x = Date.parse(String(v || '')); return isNaN(x) ? 0 : x; }
function s16_(v, n) { return String(v == null ? '' : v).slice(0, n); }
function cfgSet16_(key, value) { try { delete _rowsCache.Config; } catch (e) {} setConfigValue_(key, value); }

/* ถึงเวลาเริ่มที่ตั้งไว้ล่วงหน้า → ปิดปรับปรุงจริงทันที (กติกาเดียวกับระบบหลังบ้าน ทำซ้ำได้โดยไม่เกิดผลซ้อน) */
function autoSched16_(cfg) {
  var c = CacheService.getScriptCache();
  if (c.get('autos16')) return;
  c.put('autos16', '1', 5);
  var now = Date.now(), md = j16_(cfg.ADMIN_MAINT) || {}, sm = j16_(cfg.SECTION_MAINT) || {};
  var dueAll = md.scheduled && t16_(md.start) && t16_(md.start) <= now;
  var dueSec = Object.keys(sm).some(function (k) { var x = sm[k]; return x && typeof x === 'object' && x.scheduled && t16_(x.start) && t16_(x.start) <= now; });
  if (!dueAll && !dueSec) return;
  var lock = LockService.getScriptLock(); if (!lock.tryLock(3000)) return;
  try {
    c.remove('cfg'); var cur = getConfig_();
    md = j16_(cur.ADMIN_MAINT) || {}; sm = j16_(cur.SECTION_MAINT) || {};
    if (md.scheduled && t16_(md.start) && t16_(md.start) <= now) { md.scheduled = false; cfgSet16_('ADMIN_MAINT', JSON.stringify(md)); cfgSet16_('MAINTENANCE', 'on'); }
    var ch = false;
    Object.keys(sm).forEach(function (k) { var x = sm[k]; if (x && typeof x === 'object' && x.scheduled && t16_(x.start) && t16_(x.start) <= now) { x.on = true; x.scheduled = false; ch = true; } });
    if (ch) cfgSet16_('SECTION_MAINT', JSON.stringify(sm));
    c.remove('cfg');
  } catch (e) { try { logError_('autoSched16', e); } catch (x) {} }
  finally { lock.releaseLock(); }
}

/* ข้อมูลโหมดพิเศษที่ส่งให้หน้าเว็บ (ping/pulse): เพิ่มเวลาเซิร์ฟเวอร์ รายละเอียดทดลองใช้งาน และการปิดปรับปรุงที่ตั้งเวลาไว้ */
var liveModesV11_ = liveModes_;
liveModes_ = function (cfg) {
  try { autoSched16_(cfg); cfg = getConfig_(); } catch (e) {}
  var o = liveModesV11_(cfg), now = Date.now();
  try {
    var g = j16_(cfg.GUEST_MODE) || {};
    var dis = Array.isArray(g.disabled) ? g.disabled.map(function (k) { return s16_(k, 20); }).slice(0, 10) : ['login', 'signup', 'chat'];
    o.guest.on = !!(g.on === true || g.on === 'on' || g.on === 'true') || (!j16_(cfg.GUEST_MODE) && o.guest.active);
    o.guest.from = s16_(g.from, 40); o.guest.to = s16_(g.to || o.guest.to, 40);
    o.guest.notice = s16_(g.notice, 6000); o.guest.endMessage = s16_(g.endMessage, 4000);
    o.guest.disabled = dis; o.guest.announcedAt = s16_(g.announcedAt, 40);
    var md = j16_(cfg.ADMIN_MAINT) || {};
    o.maint = { scheduled: !!md.scheduled && t16_(md.start) > now, start: s16_(md.start, 40), end: s16_(md.end, 40), reason: s16_(md.reason, 2000) };
    var sm = j16_(cfg.SECTION_MAINT) || {};
    o.secSched = Object.keys(sm).filter(function (k) { var x = sm[k]; return x && typeof x === 'object' && x.scheduled && t16_(x.start) > now; }).slice(0, 20)
      .map(function (k) { var x = sm[k]; return { key: s16_(k, 80), start: s16_(x.start, 40), end: s16_(x.end, 40), reason: s16_(x.reason, 500) }; });
  } catch (e) {}
  o.now = Date.now();
  return o;
};

/* ผู้ทดลองใช้งานแจ้งว่ายังอยู่บนเว็บไซต์ → บันทึกลงชีต Config แถว GUEST_NOW (รูปแบบเดียวกับระบบหลังบ้าน)
 * เก็บในหน่วยความจำแคชก่อน แล้วเขียนลงชีตไม่เกินทุก 15 วินาที · จำกัด 1 ครั้งต่อ 4 วินาทีต่ออุปกรณ์ · ตรวจรูปแบบทุกช่อง */
/* โหมดทดลองเปิดอยู่ (กำลังทดลอง หรือยอมรับแล้วรอเวลาเริ่ม) และยังไม่สิ้นสุด */
function guestOn16_() {
  try {
    var cfg = getConfig_(), g = j16_(cfg.GUEST_MODE);
    if (!g) return guestActive_();
    var on = g.on === true || g.on === 'on' || g.on === 'true', to = t16_(g.to);
    return on && (!to || to > Date.now());
  } catch (e) { return false; }
}
function apiGuestBeat16_(p) {
  var off = String(p.off || '') === '1';
  if (!off && !guestOn16_()) return { ok: false };
  var id = String(p.id || '');
  if (!/^G-[A-Za-z0-9]{8,32}$/.test(id)) return { ok: false };
  var c = CacheService.getScriptCache();
  if (!off && c.get('gb16:' + id)) return { ok: true };
  c.put('gb16:' + id, '1', 3);
  var clean = function (v, n) { return s16_(v, n).replace(/[<>"'`\u0000-\u001f=+@]/g, '').trim(); };
  var num = function (v, lo, hi) { if (v === '' || v == null) return null; v = Number(v); return isFinite(v) && v >= lo && v <= hi ? v : null; };
  var lock = LockService.getScriptLock(); if (!lock.tryLock(1500)) return { ok: true };
  try {
    var cur = j16_(c.get('GUESTS16'));
    if (!cur) { var g0 = j16_(getConfig_().GUEST_NOW) || {}; cur = { at: '', visitors: Array.isArray(g0.visitors) ? g0.visitors : [] }; }
    var now = new Date().toISOString();
    var prev = cur.visitors.filter(function (v) { return v && v.id === id; })[0] || {};
    var list = cur.visitors.filter(function (v) { return v && v.id !== id && Date.now() - t16_(v.activeAt) < 86400000; });
    /* ออกจากหน้าเว็บไซต์: นำออกจากรายชื่อผู้ที่กำลังทดลองใช้งานทันที */
    if (off) { if (!prev.id) return { ok: true }; cur = { at: now, visitors: list.slice(0, 300) }; c.put('GUESTS16', JSON.stringify(cur), 21600); c.remove('GNF16'); }
    else list.unshift({ id: id, firstAt: prev.firstAt || now, activeAt: now, device: clean(p.device, 40), os: clean(p.os, 40), browser: clean(p.browser, 40),
      ip: clean(p.ip, 64) || prev.ip || '', location: clean(p.loc, 160) || prev.location || '', lat: num(p.lat, -90, 90), lng: num(p.lng, -180, 180), accuracy: num(p.acc, 0, 100000),
      page: clean(p.page, 120), views: Math.max(Number(prev.views) || 0, num(p.views, 0, 100000) || 0), screen: clean(p.screen, 30), lang: clean(p.lang, 20), accepted: p.acc2 === '1' || !!prev.accepted });
    if (!off) { cur = { at: now, visitors: list.slice(0, 300) }; c.put('GUESTS16', JSON.stringify(cur), 21600); }
    if (!c.get('GNF16')) {
      c.put('GNF16', '1', 5);
      var out = { at: now, visitors: cur.visitors.slice(0, 200) }, j = JSON.stringify(out);
      while (j.length > 45000 && out.visitors.length > 5) { out.visitors = out.visitors.slice(0, Math.floor(out.visitors.length * 0.8)); j = JSON.stringify(out); }
      cfgSet16_('GUEST_NOW', j);
    }
  } catch (e) { try { logError_('guestBeat16', e); } catch (x) {} }
  finally { lock.releaseLock(); }
  return { ok: true };
}
ROUTES.guestBeat = { fn: apiGuestBeat16_, limit: 400 };
