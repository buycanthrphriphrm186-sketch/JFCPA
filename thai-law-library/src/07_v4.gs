
/* =========================================================================
 *  VERSION 4 — รหัสผ่าน 3 ชั้น (รหัสทางอีเมล), สถิติผู้เข้าใช้งาน, กฎหมายต่างประเทศ,
 *  เอกสาร PDF ทางการ, การแจ้งชำระเงิน, การจัดรูปแบบ Google Sheets
 * ========================================================================= */

function validEmail_(e) { return /^[^\s@<>()",;:]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(String(e || '').trim()) && String(e).length <= 120; }
function maskEmail_(e) { var p = String(e).split('@'); return p[0].slice(0, 2) + '•••@' + p[1]; }

/** เพิ่มหัวคอลัมน์ใหม่ให้ชีตที่สร้างไว้ก่อนหน้า (ไม่ลบหรือย้ายข้อมูลเดิม) */
function ensureHeaders_() {
  Object.keys(SHEETS).forEach(function (name) {
    var sh = sheet_(name), want = SHEETS[name];
    var have = sh.getRange(1, 1, 1, want.length).getValues()[0];
    var changed = false;
    want.forEach(function (h, i) { if (String(have[i] || '') !== h) { have[i] = h; changed = true; } });
    if (changed) sh.getRange(1, 1, 1, want.length).setValues([have]).setFontWeight('bold');
  });
  delete _rowsCache.Members;
}

function migrateV4_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('MIGRATED_V4')) return;
  var cfg = rows_('Config');
  cfg.forEach(function (r) {
    if (r.key === 'SPLASH_SECONDS' && Number(r.value) < 20) updateRow_('Config', r._row, { value: '20' });
    if (r.key === 'FLAG_GMAIL') updateRow_('Config', r._row, { value: 'off', note: 'ยกเลิกแล้ว (เวอร์ชัน 4)' });
  });
  CacheService.getScriptCache().remove('cfg');
  props.setProperty('MIGRATED_V4', '1');
}

/* ---------------------------------------------------------------------
 *  รหัสผ่านชั้นที่ 2: รหัสใช้ครั้งเดียวส่งทางอีเมลของสมาชิก (หมดอายุ 10 นาที)
 *  ชั้นที่ 1 = รหัสจากผู้ดูแลระบบ, ชั้นที่ 2 = รหัสทางอีเมล, ชั้นที่ 3 = รหัสผ่านส่วนตัว
 * --------------------------------------------------------------------- */

function otpCode_() {
  var hex = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  var n = 0; for (var i = 0; i < 12; i++) n = (n * 16 + parseInt(hex.charAt(i), 16)) % 1000000;
  return ('000000' + n).slice(-6);
}

function sendOtpMail_(email, code, name) {
  if (MailApp.getRemainingDailyQuota() < 1) throw new Error('MAIL_QUOTA');
  mailSend14_({
    to: email,
    subject: 'รหัสผ่านชั้นที่ 2 สำหรับเข้าสู่ระบบ THAI LAW LIBRARY (คลังกฎหมาย)',
    name: 'THAI LAW LIBRARY คลังกฎหมาย',
    htmlBody: '<div style="font-family:Sarabun,Tahoma,sans-serif;font-size:15px;color:#0E1116;max-width:520px">' +
      '<p>เรียน ' + esc_(name || 'สมาชิก') + '</p>' +
      '<p>รหัสผ่านชั้นที่ 2 สำหรับเข้าสู่ระบบคลังกฎหมายของท่าน คือ</p>' +
      '<p style="font-size:30px;font-weight:bold;letter-spacing:8px;color:#2E86DE;margin:14px 0">' + code + '</p>' +
      '<p>รหัสนี้ใช้ได้ครั้งเดียว และหมดอายุภายใน 10 นาที กรุณาอย่าเปิดเผยรหัสนี้แก่ผู้ใด ผู้ดูแลระบบจะไม่สอบถามรหัสนี้จากท่านไม่ว่ากรณีใด</p>' +
      '<p>หากท่านไม่ได้เป็นผู้เข้าสู่ระบบ กรุณาเปลี่ยนรหัสผ่านส่วนตัวทันที และแจ้งผู้ดูแลระบบ</p>' +
      '<p style="color:#5D6878;font-size:13px">THAI LAW LIBRARY คลังกฎหมาย — อีเมลฉบับนี้ส่งโดยระบบอัตโนมัติ</p></div>'
  });
}

function startOtp_(m, info, method, emailIn) {
  var cache = CacheService.getScriptCache();
  var ticket = randomToken_(40);
  var email = validEmail_(m.email) ? String(m.email) : (validEmail_(emailIn) ? String(emailIn).trim().toLowerCase() : '');
  var st = { memberId: m.memberId, info: info || {}, method: method, email: email, tries: 0, sentAt: 0, hash: '' };
  if (!email) {
    cache.put('otp_' + ticket, JSON.stringify(st), 900);
    return { otpRequired: true, needEmail: true, ticket: ticket, msg: 'บัญชีนี้ยังไม่ได้ระบุอีเมล กรุณากรอกอีเมลเพื่อรับรหัสผ่านชั้นที่ 2' };
  }
  try { sendOtpTo_(st, ticket, m); }
  catch (e) {
    if (String(e.message) === 'MAIL_QUOTA') return fail_('MAIL_QUOTA', 'ระบบส่งอีเมลครบโควตาของวันนี้แล้ว กรุณาติดต่อผู้ดูแลระบบเพื่อขอเข้าสู่ระบบ');
    logError_('otp.send', e, m.memberId);
    return fail_('MAIL_FAIL', 'ไม่สามารถส่งรหัสผ่านทางอีเมลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ');
  }
  return { otpRequired: true, ticket: ticket, maskedEmail: maskEmail_(email), msg: 'ระบบได้ส่งรหัสผ่านชั้นที่ 2 ไปยังอีเมล ' + maskEmail_(email) + ' แล้ว' };
}

function sendOtpTo_(st, ticket, m) {
  var code = otpCode_();
  st.hash = sha256Hex_(ticket + '|' + code); st.sentAt = Date.now(); st.tries = 0;
  sendOtpMail_(st.email, code, m.displayName || m.firstName);
  CacheService.getScriptCache().put('otp_' + ticket, JSON.stringify(st), 600);
}

function apiResendOtp_(p) {
  var cache = CacheService.getScriptCache();
  var st = json_(cache.get('otp_' + String(p.ticket || '')), null);
  if (!st) return fail_('OTP_EXPIRED', 'คำขอเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
  if (p.email) {
    if (!validEmail_(p.email)) return fail_('INVALID', 'รูปแบบอีเมลไม่ถูกต้อง');
    st.email = String(p.email).trim().toLowerCase();
  }
  if (!st.email) return fail_('NEED_EMAIL', 'กรุณากรอกอีเมล');
  if (st.sentAt && Date.now() - st.sentAt < 60000) return fail_('WAIT', 'กรุณารอ 1 นาทีก่อนขอรหัสใหม่');
  var m = findMemberById_(st.memberId);
  if (!m) return fail_('NOT_FOUND', 'ไม่พบบัญชี');
  try { sendOtpTo_(st, p.ticket, m); }
  catch (e) { return fail_(String(e.message) === 'MAIL_QUOTA' ? 'MAIL_QUOTA' : 'MAIL_FAIL', 'ไม่สามารถส่งรหัสผ่านทางอีเมลได้ในขณะนี้ กรุณาติดต่อผู้ดูแลระบบ'); }
  return { ticket: p.ticket, maskedEmail: maskEmail_(st.email), msg: 'ส่งรหัสผ่านชั้นที่ 2 ไปยัง ' + maskEmail_(st.email) + ' แล้ว' };
}

function apiVerifyOtp_(p) {
  var cache = CacheService.getScriptCache(), key = 'otp_' + String(p.ticket || '');
  var st = json_(cache.get(key), null);
  if (!st || !st.hash) return fail_('OTP_EXPIRED', 'รหัสผ่านชั้นที่ 2 หมดอายุ กรุณากดส่งรหัสใหม่');
  var m = findMemberById_(st.memberId);
  if (!m) return fail_('NOT_FOUND', 'ไม่พบบัญชี');
  var code = String(p.code || '').replace(/\D/g, '');
  if (sha256Hex_(p.ticket + '|' + code) !== st.hash) {
    st.tries++;
    if (st.tries >= 5) {
      cache.remove(key);
      updateRow_('Members', m._row, { lockUntil: new Date(Date.now() + 15 * 60000).toISOString() });
      raiseIncident_({ type: 'OTP brute force / การสุ่มรหัสทางอีเมล', severity: 'HIGH', memberId: m.memberId, username: m.username, ip: st.info.ip, location: st.info.location, device: [st.info.device, st.info.os, st.info.browser].join(' / '), attempts: st.tries, detail: 'กรอกรหัสผ่านชั้นที่ 2 (ทางอีเมล) ไม่ถูกต้อง 5 ครั้ง', action: 'ยกเลิกรหัส ระงับการเข้าสู่ระบบ 15 นาที และแจ้งผู้ดูแลระบบ', alertMember: true });
      return fail_('LOCKED', 'กรอกรหัสผ่านชั้นที่ 2 ไม่ถูกต้องครบ 5 ครั้ง ระบบระงับการเข้าสู่ระบบชั่วคราว 15 นาที');
    }
    cache.put(key, JSON.stringify(st), 600);
    return fail_('BAD_OTP', 'รหัสผ่านชั้นที่ 2 ไม่ถูกต้อง (เหลือ ' + (5 - st.tries) + ' ครั้ง)');
  }
  cache.remove(key);
  if (String(m.email || '').toLowerCase() !== st.email || !(m.emailVerified === true || m.emailVerified === 'TRUE')) updateRow_('Members', m._row, { email: st.email, emailVerified: true });
  var fresh = findMemberById_(m.memberId), info = st.info || {};
  var logBase = { time: new Date().toISOString(), username: fresh.username, memberId: fresh.memberId, ip: cell_(info.ip), location: cell_(info.location), isp: cell_(info.isp), device: cell_(info.device), os: cell_(info.os), browser: cell_(info.browser) };
  statInc_('logins', 1);
  return finishLogin_(fresh, info, logBase, st.method);
}

/* ---------------------------------------------------------------------
 *  ตรวจคำสั่งที่มุ่งเจาะระบบผ่านผู้ช่วย AI
 * --------------------------------------------------------------------- */
var AI_ATTACK = [
  /ignore (all )?(previous|prior|above) (instructions|prompts?)/i, /(reveal|show|print|leak).{0,30}(system prompt|api key|secret|password|token|script propert)/i,
  /(bypass|disable|turn off).{0,30}(security|filter|safety|rate limit|authentication)/i, /\bjailbreak\b|\bDAN mode\b/i,
  /(sql injection|xss payload|reverse shell|privilege escalation|dump (the )?database)/i,
  /(เพิกเฉย|ไม่ต้องสนใจ).{0,20}(คำสั่ง|กฎ).{0,10}(ก่อนหน้า|ทั้งหมด)/, /(เปิดเผย|ขอดู|แสดง).{0,30}(รหัสผ่าน|คีย์|API ?Key|ข้อมูลสมาชิก|ฐานข้อมูล|system prompt)/i,
  /(เจาะ|แฮก|แฮ็ก|hack).{0,20}(ระบบ|เว็บ|ฐานข้อมูล|บัญชี)/i, /(ปิด|ข้าม).{0,15}(ระบบความปลอดภัย|การยืนยันตัวตน)/
];
function aiInjection_(q) { for (var i = 0; i < AI_ATTACK.length; i++) if (AI_ATTACK[i].test(q)) return String(AI_ATTACK[i]); return ''; }

/* ---------------------------------------------------------------------
 *  ประวัติการเข้าสู่ระบบ: ลบอัตโนมัติเมื่อครบ 90 วัน (กู้คืนไม่ได้)
 * --------------------------------------------------------------------- */
function purgeOldLoginLog_(days) {
  var sh = sheet_('LoginLog'), last = sh.getLastRow();
  if (last < 2) return 0;
  var cut = Date.now() - days * 864e5;
  var times = sh.getRange(2, 1, last - 1, 1).getValues();
  var n = 0;
  for (var i = 0; i < times.length; i++) { var t = new Date(times[i][0]).getTime(); if (t && t < cut) n++; else break; }
  if (n) sh.deleteRows(2, n);
  delete _rowsCache.LoginLog;
  return n;
}

/* ---------------------------------------------------------------------
 *  สถิติผู้เข้าใช้งาน — นับทุกครั้งที่เปิด/รีเฟรชเว็บไซต์ ไม่เก็บชื่อหรือข้อมูลระบุตัวบุคคล
 * --------------------------------------------------------------------- */
function bkkDate_() { return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd'); }
function statInc_(field, n) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(400)) return;
  try {
    var c = CacheService.getScriptCache(), k = 'st_' + bkkDate_() + '_' + field;
    c.put(k, String(Number(c.get(k) || 0) + (n || 1)), 21600);
    var keys = json_(c.get('st_keys'), []);
    if (keys.indexOf(k) < 0) { keys.push(k); c.put('st_keys', JSON.stringify(keys.slice(-200)), 21600); }
  } finally { lock.releaseLock(); }
}
var STAT_FIELDS = ['visits', 'mobile', 'tablet', 'desktop', 'chrome', 'safari', 'edge', 'firefox', 'other', 'logins', 'lawOpens'];
function apiHit_(p) {
  statInc_('visits', 1);
  var d = String(p.device || ''); statInc_(d === 'โทรศัพท์มือถือ' ? 'mobile' : d === 'แท็บเล็ต' ? 'tablet' : 'desktop', 1);
  var b = String(p.browser || '').toLowerCase(); statInc_(/chrome/.test(b) ? 'chrome' : /safari/.test(b) ? 'safari' : /edge/.test(b) ? 'edge' : /firefox/.test(b) ? 'firefox' : 'other', 1);
  return {};
}
/** รวมตัวนับในแคชลงชีต Stats (เรียกจาก healthCheck ทุกชั่วโมง) */
function flushStats_() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    var c = CacheService.getScriptCache(), keys = json_(c.get('st_keys'), []);
    if (!keys.length) return;
    var vals = c.getAll(keys), byDate = {};
    keys.forEach(function (k) { var m = k.match(/^st_(\d{4}-\d{2}-\d{2})_(\w+)$/); if (!m || !vals[k]) return; (byDate[m[1]] = byDate[m[1]] || {})[m[2]] = Number(vals[k]); });
    var list = rows_('Stats'), rowOf = {};
    list.forEach(function (r) { rowOf[String(r.date).slice(0, 10)] = r; });
    Object.keys(byDate).forEach(function (d) {
      var add = byDate[d], ex = rowOf[d], upd = { date: d, updatedAt: new Date().toISOString() };
      STAT_FIELDS.forEach(function (f) { upd[f] = Number(ex ? ex[f] || 0 : 0) + Number(add[f] || 0); });
      if (ex) updateRow_('Stats', ex._row, upd); else appendRow_('Stats', upd);
    });
    c.removeAll(keys); c.remove('st_keys'); c.remove('pubstats');
  } finally { lock.releaseLock(); }
}
function apiPublicStats_() {
  var c = CacheService.getScriptCache(), hit = c.get('pubstats');
  if (hit) return JSON.parse(hit);
  var today = bkkDate_(), days = {};
  rows_('Stats').forEach(function (r) { var d = String(r.date).slice(0, 10); days[d] = {}; STAT_FIELDS.forEach(function (f) { days[d][f] = Number(r[f] || 0); }); });
  var keys = json_(c.get('st_keys'), []), vals = keys.length ? c.getAll(keys) : {};
  keys.forEach(function (k) { var m = k.match(/^st_(\d{4}-\d{2}-\d{2})_(\w+)$/); if (!m) return; days[m[1]] = days[m[1]] || {}; days[m[1]][m[2]] = (days[m[1]][m[2]] || 0) + Number(vals[k] || 0); });
  var series = [];
  for (var i = 29; i >= 0; i--) {
    var d = Utilities.formatDate(new Date(Date.now() - i * 864e5), 'Asia/Bangkok', 'yyyy-MM-dd');
    var o = days[d] || {};
    series.push({ d: d, v: o.visits || 0, l: o.logins || 0, o: o.lawOpens || 0 });
  }
  var tot = {}; STAT_FIELDS.forEach(function (f) { tot[f] = 0; });
  Object.keys(days).forEach(function (d) { STAT_FIELDS.forEach(function (f) { tot[f] += days[d][f] || 0; }); });
  var counts = {}, secTotal = 0;
  rows_('Laws').forEach(function (l) { counts[l.category] = (counts[l.category] || 0) + 1; });
  var sh = sheet_('Sections'); secTotal = Math.max(sh.getLastRow() - 1, 0);
  var out = {
    today: days[today] || {}, series: series, totals: tot,
    members: rows_('Members').length, laws: rows_('Laws').length, sections: secTotal, lawsByCat: counts,
    treaties: rows_('Treaties').length, foreign: foreignCounts_(), updatedAt: new Date().toISOString()
  };
  c.put('pubstats', JSON.stringify(out), 120);
  return out;
}

/* ---------------------------------------------------------------------
 *  กฎหมายต่างประเทศ — ดึงจาก API ทางการที่เปิดให้ใช้เท่านั้น (อ่านอย่างเดียว ไม่เก็บสำเนาถาวร)
 *  ญี่ปุ่น: e-Gov 法令API v2 (ไม่ต้องใช้คีย์)
 *  เกาหลีใต้: 국가법령정보 Open API (ต้องลงทะเบียน OC ฟรี แล้วใส่ Script Property KOREA_OC)
 *  ประเทศอื่น: ยังไม่มี API สาธารณะที่อนุญาตให้ดึงข้อมูล จึงแสดงลิงก์แหล่งทางการ
 * --------------------------------------------------------------------- */
var FOREIGN = [
  { code: 'JP', name: 'ญี่ปุ่น', native: '日本', source: 'e-Gov 法令API v2 (กระทรวงกิจการภายในและการสื่อสาร ญี่ปุ่น)', license: 'ข้อมูลรัฐบาลญี่ปุ่น (ระบุแหล่งที่มา)', urls: ['https://laws.e-gov.go.jp', 'https://www.japaneselawtranslation.go.jp'], api: 'egov' },
  { code: 'KR', name: 'เกาหลีใต้', native: '대한민국', source: '국가법령정보센터 Open API (กระทรวงนิติบัญญัติ เกาหลีใต้)', license: 'ข้อมูลสาธารณะของรัฐ (ระบุแหล่งที่มา)', urls: ['https://www.law.go.kr', 'https://elaw.klri.re.kr'], api: 'korea' },
  { code: 'CN', name: 'จีน', native: '中国', urls: ['https://xzfg.moj.gov.cn', 'https://en.moj.gov.cn'] },
  { code: 'LA', name: 'ลาว', native: 'ລາວ', urls: ['https://www.laoofficialgazette.gov.la', 'https://lawforasean.ocs.go.th'] },
  { code: 'ID', name: 'อินโดนีเซีย', native: 'Indonesia', urls: ['https://pasal.id/en'], note: 'เว็บไซต์ต้นทางไม่อนุญาตให้ระบบอัตโนมัติดึงข้อมูล (robots.txt)' },
  { code: 'MY', name: 'มาเลเซีย', native: 'Malaysia', urls: ['https://lom.agc.gov.my'] },
  { code: 'PH', name: 'ฟิลิปปินส์', native: 'Pilipinas', urls: ['https://www.lawphil.net'] },
  { code: 'SG', name: 'สิงคโปร์', native: 'Singapore', urls: ['https://sso.agc.gov.sg'] },
  { code: 'BN', name: 'บรูไน', native: 'Brunei', urls: ['https://www.agc.gov.bn'] },
  { code: 'VN', name: 'เวียดนาม', native: 'Việt Nam', urls: ['https://vanban.chinhphu.vn'] }
];
var JP_FEATURED = [['321CONSTITUTION', 'รัฐธรรมนูญแห่งประเทศญี่ปุ่น'], ['129AC0000000089', 'ประมวลกฎหมายแพ่ง'], ['140AC0000000045', 'ประมวลกฎหมายอาญา'], ['132AC0000000048', 'ประมวลกฎหมายพาณิชย์'], ['417AC0000000086', 'กฎหมายบริษัท'], ['408AC0000000109', 'ประมวลกฎหมายวิธีพิจารณาความแพ่ง'], ['323AC0000000131', 'ประมวลกฎหมายวิธีพิจารณาความอาญา'], ['322AC0000000049', 'กฎหมายมาตรฐานแรงงาน'], ['415AC0000000057', 'กฎหมายคุ้มครองข้อมูลส่วนบุคคล'], ['345AC0000000048', 'กฎหมายลิขสิทธิ์']];
var JP_TYPES = { Constitution: 'รัฐธรรมนูญ', Act: 'พระราชบัญญัติ (法律)', CabinetOrder: 'พระราชกฤษฎีกา (政令)', ImperialOrder: 'พระราชโองการ (勅令)', MinisterialOrdinance: 'กฎกระทรวง (府省令)', Rule: 'ระเบียบ (規則)', Misc: 'อื่น ๆ' };

function fetchJson_(url, headers) {
  var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: headers || { 'User-Agent': 'ThaiLawLibrary/4.0 (educational, read-only)' } });
  if (r.getResponseCode() >= 400) throw new Error('HTTP ' + r.getResponseCode());
  return JSON.parse(r.getContentText('UTF-8'));
}
function cacheGetBig_(key) {
  var c = CacheService.getScriptCache(), n = Number(c.get(key + '_n') || 0);
  if (!n) return null;
  var ks = []; for (var i = 0; i < n; i++) ks.push(key + '_' + i);
  var got = c.getAll(ks); if (Object.keys(got).length !== n) return null;
  var s = ''; for (var j = 0; j < n; j++) s += got[key + '_' + j];
  return JSON.parse(s);
}
function cachePutBig_(key, obj, ttl) {
  var s = JSON.stringify(obj), parts = {}, n = 0;
  for (var i = 0; i < s.length; i += 90000) parts[key + '_' + (n++)] = s.slice(i, i + 90000);
  if (n > 80) return;
  try { var c = CacheService.getScriptCache(); c.putAll(parts, ttl); c.put(key + '_n', String(n), ttl); } catch (e) {}
}

function foreignCounts_() {
  var c = CacheService.getScriptCache(), hit = c.get('fcounts');
  if (hit) return JSON.parse(hit);
  var out = {};
  if (breakerOpen_('egov')) out.JP = null;
  else {
    try { out.JP = fetchJson_('https://laws.e-gov.go.jp/api/2/laws?limit=1').total_count; breakerOk_('egov'); } catch (e) { breakerFail_('egov'); out.JP = null; }
  }
  var oc = PropertiesService.getScriptProperties().getProperty('KOREA_OC');
  if (oc) { try { var k = fetchJson_('https://www.law.go.kr/DRF/lawSearch.do?OC=' + encodeURIComponent(oc) + '&target=law&type=JSON&display=1'); out.KR = Number((k.LawSearch || {}).totalCnt) || null; } catch (e) { out.KR = null; } }
  c.put('fcounts', JSON.stringify(out), 86400);
  return out;
}

function apiForeignCountries_() {
  var counts = foreignCounts_(), oc = !!PropertiesService.getScriptProperties().getProperty('KOREA_OC');
  return {
    thai: { laws: rows_('Laws').length, sections: Math.max(sheet_('Sections').getLastRow() - 1, 0) },
    countries: FOREIGN.map(function (f) {
      var ready = f.api === 'egov' || (f.api === 'korea' && oc);
      return { code: f.code, name: f.name, native: f.native, count: counts[f.code] === undefined ? null : counts[f.code], ready: ready, source: f.source || '', license: f.license || '', urls: f.urls, note: f.note || (f.api === 'korea' && !oc ? 'รอผู้ดูแลระบบลงทะเบียนรหัส Open API (OC) ของรัฐบาลเกาหลี' : (!f.api ? 'ยังไม่มีบริการ API สาธารณะที่อนุญาตให้ดึงข้อมูลอัตโนมัติ' : '')) };
    })
  };
}

function apiForeignLaws_(p) {
  var code = String(p.country || ''), q = String(p.q || '').trim().slice(0, 80), off = Math.max(0, Number(p.offset) || 0);
  if (code === 'JP') {
    if (!q) return { featured: JP_FEATURED.map(function (x) { return { id: x[0], title: x[1] }; }), items: [], total: foreignCounts_().JP };
    var key = 'jpl_' + sha256Hex_(q + '|' + off).slice(0, 20), c = CacheService.getScriptCache(), hit = c.get(key);
    if (hit) return JSON.parse(hit);
    var j = fetchJson_('https://laws.e-gov.go.jp/api/2/laws?limit=30&offset=' + off + '&law_title=' + encodeURIComponent(q));
    var out = { total: j.total_count, next: j.next_offset, items: (j.laws || []).map(function (l) { var r = l.revision_info || {}, i = l.law_info || {}; return { id: i.law_id, title: r.law_title, num: i.law_num, date: i.promulgation_date, type: JP_TYPES[i.law_type] || i.law_type, cat: r.category, updated: r.updated }; }) };
    c.put(key, JSON.stringify(out), 21600);
    return out;
  }
  if (code === 'KR') {
    var oc = PropertiesService.getScriptProperties().getProperty('KOREA_OC');
    if (!oc) return fail_('NOT_READY', 'ยังไม่ได้เปิดใช้กฎหมายเกาหลี: ผู้ดูแลระบบต้องลงทะเบียนรหัส Open API (OC) ที่ open.law.go.kr ก่อน');
    var page = Math.floor(off / 30) + 1;
    var k = fetchJson_('https://www.law.go.kr/DRF/lawSearch.do?OC=' + encodeURIComponent(oc) + '&target=law&type=JSON&display=30&page=' + page + (q ? '&query=' + encodeURIComponent(q) : ''));
    var ls = k.LawSearch || {}, arr = ls.law || []; if (!Array.isArray(arr)) arr = [arr];
    return { total: Number(ls.totalCnt) || 0, next: off + 30, items: arr.map(function (x) { return { id: String(x['법령일련번호'] || x.MST || ''), title: x['법령명한글'] || '', date: String(x['공포일자'] || ''), type: x['법령구분명'] || '', cat: x['소관부처명'] || '' }; }) };
  }
  return fail_('NOT_READY', 'ประเทศนี้ยังไม่มีบริการ API สาธารณะที่อนุญาตให้ดึงข้อมูล กรุณาเปิดอ่านจากเว็บไซต์ทางการ');
}

/* แปลงโครงสร้างกฎหมายญี่ปุ่น (Article / Paragraph / Item) เป็นรูปแบบเดียวกับหน้าเว็บ */
function jpText_(n) {
  if (n === null || n === undefined) return '';
  if (typeof n === 'string') return n;
  if (n.tag === 'Rt') return '';
  return (n.children || []).map(jpText_).join('');
}
function jpConvert_(full) {
  var out = { title: '', heads: [], articles: [] }, curHead = '';
  function items(nodes, depth) {
    var r = [];
    (nodes || []).forEach(function (n) {
      if (!n || typeof n === 'string') return;
      if (/^(Item|Subitem\d+)$/.test(n.tag)) {
        var t = '', s = '', sub = [];
        (n.children || []).forEach(function (c) {
          if (!c || typeof c === 'string') return;
          if (/Title$/.test(c.tag)) t = jpText_(c);
          else if (/Sentence$/.test(c.tag)) s += jpText_(c);
          else if (/^Subitem\d+$/.test(c.tag)) sub = sub.concat(items([c], depth + 1));
        });
        r.push({ t: t, s: s, sub: sub });
      }
    });
    return r;
  }
  function walk(n, inSuppl) {
    if (!n || typeof n === 'string') return;
    if (n.tag === 'LawTitle') out.title = jpText_(n);
    if (/^(Part|Chapter|Section|Subsection|Division)Title$/.test(n.tag)) { curHead = jpText_(n).replace(/\s+/g, ' '); out.heads.push(curHead); }
    if (n.tag === 'SupplProvision') { if (out.supplDone) return; out.supplDone = true; curHead = '附則 (บทเฉพาะกาล)'; out.heads.push(curHead); inSuppl = true; }
    if (n.tag === 'Article') {
      var a = { no: '', cap: '', head: curHead, paras: [] };
      (n.children || []).forEach(function (c) {
        if (!c || typeof c === 'string') return;
        if (c.tag === 'ArticleTitle') a.no = jpText_(c);
        else if (c.tag === 'ArticleCaption') a.cap = jpText_(c);
        else if (c.tag === 'Paragraph') {
          var pnum = '', sent = '', its = [];
          (c.children || []).forEach(function (d) {
            if (!d || typeof d === 'string') return;
            if (d.tag === 'ParagraphNum') pnum = jpText_(d);
            else if (d.tag === 'ParagraphSentence') sent = jpText_(d);
            else if (d.tag === 'Item') its = its.concat(items([d], 0));
          });
          a.paras.push({ n: pnum, s: sent, items: its });
        }
      });
      out.articles.push(a);
      return;
    }
    (n.children || []).forEach(function (c) { walk(c, inSuppl); });
  }
  walk(full, false);
  delete out.supplDone;
  return out;
}

function apiForeignLaw_(p) {
  var code = String(p.country || ''), id = String(p.id || '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 60);
  if (!id) return fail_('INVALID', 'ไม่ได้ระบุกฎหมาย');
  var key = 'fl_' + code + '_' + id, hit = cacheGetBig_(key);
  if (hit) return hit;
  var out;
  if (code === 'JP') {
    if (breakerOpen_('egov')) return fail_('UPSTREAM', 'บริการกฎหมายญี่ปุ่น (e-Gov) ขัดข้องชั่วคราว ระบบจะลองเชื่อมต่อใหม่อัตโนมัติ');
    var j;
    try { j = fetchJson_('https://laws.e-gov.go.jp/api/2/law_data/' + id + '?law_full_text_format=json'); breakerOk_('egov'); }
    catch (e) { breakerFail_('egov'); return fail_('UPSTREAM', 'ไม่สามารถดึงกฎหมายจาก e-Gov ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'); }
    var conv = jpConvert_(j.law_full_text), ri = j.revision_info || {}, li = j.law_info || {};
    out = { country: 'JP', id: id, title: ri.law_title || conv.title, num: li.law_num, type: JP_TYPES[li.law_type] || li.law_type, updated: ri.updated, enforced: ri.amendment_enforcement_date, heads: conv.heads, articles: conv.articles, source: 'e-Gov 法令API v2', sourceUrl: 'https://laws.e-gov.go.jp/law/' + id, lang: 'ja' };
  } else if (code === 'KR') {
    var oc = PropertiesService.getScriptProperties().getProperty('KOREA_OC');
    if (!oc) return fail_('NOT_READY', 'ยังไม่ได้เปิดใช้กฎหมายเกาหลี');
    var k = fetchJson_('https://www.law.go.kr/DRF/lawService.do?OC=' + encodeURIComponent(oc) + '&target=law&type=JSON&MST=' + encodeURIComponent(id));
    var law = k['법령'] || {}, base = law['기본정보'] || {}, units = ((law['조문'] || {})['조문단위']) || [];
    if (!Array.isArray(units)) units = [units];
    var arts = [], head = '', heads = [];
    function arr(x) { return !x ? [] : Array.isArray(x) ? x : [x]; }
    units.forEach(function (u) {
      if (u['조문여부'] === '전문') { head = String(u['조문내용'] || '').trim(); heads.push(head); return; }
      arts.push({ no: '제' + u['조문번호'] + '조' + (u['조문가지번호'] ? '의' + u['조문가지번호'] : ''), cap: u['조문제목'] ? '(' + u['조문제목'] + ')' : '', head: head,
        paras: arr(u['항']).length ? arr(u['항']).map(function (h) { return { n: String(h['항번호'] || ''), s: String(h['항내용'] || ''), items: arr(h['호']).map(function (o) { return { t: String(o['호번호'] || ''), s: String(o['호내용'] || ''), sub: [] }; }) }; }) : [{ n: '', s: String(u['조문내용'] || ''), items: [] }] });
    });
    out = { country: 'KR', id: id, title: base['법령명_한글'] || '', type: base['법종구분'] || '', updated: base['시행일자'] || '', heads: heads, articles: arts, source: '국가법령정보센터 Open API', sourceUrl: 'https://www.law.go.kr', lang: 'ko' };
  } else return fail_('NOT_READY', 'ประเทศนี้ยังไม่มีบริการ API สาธารณะที่อนุญาตให้ดึงข้อมูล');
  cachePutBig_(key, out, 21600);
  return out;
}

/* ---------------------------------------------------------------------
 *  เอกสาร PDF ทางการ (โลโก้ตรงกลาง ชื่อภาษาไทยและอังกฤษ)
 * --------------------------------------------------------------------- */
function pdfShell_(logo, titleTh, titleEn, bodyHtml) {
  var lg = /^data:image\/(jpeg|png);base64,[A-Za-z0-9+\/=]+$/.test(String(logo || '')) && String(logo).length < 150000 ? '<img src="' + logo + '" style="width:92px;height:92px;border-radius:50%">' : '';
  return '<html><head><meta charset="utf-8"><style>@page{size:A4;margin:2.2cm 2cm 2cm 2.5cm}body{font-family:"TH Sarabun New","Sarabun",Tahoma,sans-serif;font-size:14pt;line-height:1.5;color:#111}' +
    '.c{text-align:center}.t1{font-size:20pt;font-weight:bold;margin:6pt 0 0}.t2{font-size:13pt;letter-spacing:2pt;color:#1F5F99}.t3{font-size:16pt;font-weight:bold;margin:14pt 0 2pt}.t4{font-size:12pt;color:#444}' +
    'h2{font-size:15pt;margin:16pt 0 6pt;border-bottom:1pt solid #9CCBF0;padding-bottom:3pt}table{width:100%;border-collapse:collapse;margin:4pt 0}th,td{border:1px solid #9aa9b8;padding:4pt 6pt;font-size:11.5pt;vertical-align:top;text-align:left}th{background:#EAF4FC;width:32%}' +
    'p{margin:0 0 6pt;text-indent:1.5cm;text-align:justify}.n{font-size:11pt;color:#444;text-indent:0}.sig{margin-top:22pt}</style></head><body>' +
    '<div class="c">' + lg + '<div class="t1">คลังกฎหมาย</div><div class="t2">THAI LAW LIBRARY</div><div class="t3">' + esc_(titleTh) + '</div><div class="t4">' + esc_(titleEn) + '</div>' +
    '<div class="t4">ออกเอกสารเมื่อ ' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm') + ' น. (เวลาประเทศไทย)</div></div>' + bodyHtml + '</body></html>';
}
function kvTable_(rows) { return '<table>' + rows.map(function (r) { return '<tr><th>' + esc_(r[0]) + '</th><td>' + esc_(r[1] === undefined || r[1] === null || r[1] === '' ? '-' : r[1]) + '</td></tr>'; }).join('') + '</table>'; }
function fmtTh_(iso) { var d = new Date(iso); return isNaN(d) ? String(iso || '-') : Utilities.formatDate(d, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm') + ' น.'; }
function memberRows_(m) {
  var e = json_(m.educationJson, {}), w = json_(m.workJson, {});
  var rows = [['รหัสสมาชิก (Member ID)', m.memberId], ['ชื่อผู้ใช้งาน (Username)', m.username], ['คำนำหน้าชื่อ - ชื่อ - นามสกุล', (m.title || '') + (m.firstName || '') + ' ' + (m.lastName || '')], ['ชื่อที่แสดง', m.displayName], ['วันเดือนปีเกิด', m.birthDate], ['เพศ', m.gender || 'ไม่ระบุ'], ['อีเมล', m.email], ['หมายเลขโทรศัพท์', m.phone], ['ที่อยู่', m.address], ['ประวัติส่วนตัว', m.bio], ['สถานะผู้สมัคร', m.memberType]];
  if (e.school) rows = rows.concat([['สถานศึกษา', e.school], ['คณะ', e.faculty], ['สาขาวิชา', e.major], ['ระดับการศึกษา', e.level], ['ชั้นปี', e.year]]);
  if (w.org || w.position || w.career) rows = rows.concat([['หน่วยงาน', w.org], ['ตำแหน่ง', w.position], ['สายงาน', w.career], ['ประสบการณ์ทำงาน', w.experience]]);
  return rows.concat([['ประเภทสมาชิก / บทบาท', m.role === 'admin' ? 'ผู้ดูแลระบบ' : 'สมาชิก'], ['วันที่สมัครสมาชิก', fmtTh_(m.createdAt)], ['เข้าใช้งานล่าสุด', fmtTh_(m.lastLogin)], ['สถานะบัญชี', m.accountStatus || 'ปกติ'], ['คำถามกู้คืนบัญชี', m.recoveryQ]]);
}
var PRIVACY_NOTE = '<h2>การคุ้มครองข้อมูลส่วนบุคคล</h2>' +
  '<p>เอกสารฉบับนี้จัดทำตามคำขอของเจ้าของข้อมูล เพื่อใช้สิทธิขอเข้าถึงและขอรับสำเนาข้อมูลส่วนบุคคลตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 คลังกฎหมายเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลเท่าที่จำเป็นต่อการให้บริการ และไม่เปิดเผยแก่บุคคลภายนอก เว้นแต่มีกฎหมายกำหนด</p>' +
  '<p>การเข้าถึงระบบคอมพิวเตอร์หรือข้อมูลคอมพิวเตอร์ของผู้อื่นโดยมิชอบ เป็นความผิดตามพระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ พ.ศ. 2550 ผู้ครอบครองเอกสารฉบับนี้มีหน้าที่เก็บรักษาไว้เป็นความลับ</p>' +
  '<p class="n">รหัสผ่านทุกชั้นถูกจัดเก็บในรูปแบบค่าแฮช จึงไม่ปรากฏในเอกสารนี้ ประวัติการเข้าสู่ระบบถูกเก็บไว้ไม่เกิน 90 วัน และลบอัตโนมัติเมื่อครบกำหนด</p>';
function loginTable_(memberId) {
  var list = rows_('LoginLog').filter(function (r) { return r.memberId === memberId; });
  var ok = list.filter(function (r) { return r.result === 'SUCCESS'; }).length;
  var html = kvTable_([['จำนวนการเข้าสู่ระบบสำเร็จ', ok + ' ครั้ง'], ['จำนวนการเข้าสู่ระบบไม่สำเร็จ', (list.length - ok) + ' ครั้ง'], ['ช่วงเวลาที่บันทึก', list.length ? fmtTh_(list[0].time) + ' ถึง ' + fmtTh_(list[list.length - 1].time) : '-']]);
  html += '<table><tr><th style="width:18%">วันเวลา</th><th style="width:14%">ผล</th><th>วิธี/เหตุผล</th><th>อุปกรณ์</th><th>IP / ตำแหน่ง</th></tr>' +
    list.slice(-400).reverse().map(function (r) { return '<tr><td>' + esc_(fmtTh_(r.time)) + '</td><td>' + (r.result === 'SUCCESS' ? 'สำเร็จ' : 'ไม่สำเร็จ') + '</td><td>' + esc_(r.reason) + '</td><td>' + esc_([r.device, r.os, r.browser].filter(String).join(' / ')) + '</td><td>' + esc_([r.ip, r.location].filter(String).join(' / ')) + '</td></tr>'; }).join('') + '</table>';
  return html;
}
function pdfOut_(html, name) {
  var blob = HtmlService.createHtmlOutput(html).getAs('application/pdf').setName(name);
  return { base64: Utilities.base64Encode(blob.getBytes()), name: name };
}
function apiLoginHistoryPdf_(p, ctx) {
  var m = ctx.member;
  var body = '<h2>ข้อมูลผู้ใช้งาน</h2>' + kvTable_(memberRows_(m)) + '<h2>ประวัติการเข้าสู่ระบบและอุปกรณ์</h2>' + loginTable_(m.memberId) + PRIVACY_NOTE;
  return pdfOut_(pdfShell_(p.logo, 'รายงานประวัติการเข้าสู่ระบบและอุปกรณ์', 'Login and Device History Report', body), 'login-history-' + m.memberId + '.pdf');
}
function apiMemberPdf_(p, ctx) {
  var m = ctx.member;
  var body = '<h2>ข้อมูลสมาชิกและข้อมูลบัญชี</h2>' + kvTable_(memberRows_(m)) + '<h2>บัญชีภายนอกที่เชื่อมต่อ</h2>' + kvTable_([['บัญชีที่เชื่อมต่อ', Object.keys(json_(m.socialJson, {})).join(', ') || 'ไม่มี']]) + '<h2>ประวัติการเข้าสู่ระบบ</h2>' + loginTable_(m.memberId) + PRIVACY_NOTE;
  return pdfOut_(pdfShell_(p.logo, 'เอกสารข้อมูลสมาชิก', 'Member Data Report', body), 'member-data-' + m.memberId + '.pdf');
}
function apiBackupPdf_(p, ctx) {
  var m = ctx.member, ud = readUserData_(m.memberId).data || {};
  var favIds = Object.keys(ud.favorites || {}), byLaw = {};
  favIds.concat((ud.history || []).slice(0, 300).map(function (h) { return h.id; })).forEach(function (id) { (byLaw[id.split('-')[0]] = byLaw[id.split('-')[0]] || {})[id] = 1; });
  var names = {}, lawTitle = {};
  rows_('Laws').forEach(function (l) { lawTitle[String(l.lawId)] = l.title; });
  Object.keys(byLaw).slice(0, 40).forEach(function (law) { sectionsOfLaw_(law).forEach(function (s) { if (byLaw[law][s.id]) names[s.id] = (lawTitle[law] || law) + ' มาตรา ' + s.no + ' ' + s.name; }); });
  var nm = function (id) { return names[id] || id; };
  var body = '<h2>ข้อมูลส่วนตัว</h2>' + kvTable_(memberRows_(m));
  body += '<h2>รายการโปรด (' + favIds.length + ' รายการ)</h2><table><tr><th style="width:24%">บันทึกเมื่อ</th><th>มาตรา</th><th>หมายเหตุ</th></tr>' + favIds.map(function (id) { var f = ud.favorites[id]; return '<tr><td>' + esc_(fmtTh_(f.t)) + '</td><td>' + esc_(nm(id)) + '</td><td>' + esc_(f.note || '') + '</td></tr>'; }).join('') + '</table>';
  body += '<h2>โฟลเดอร์ส่วนตัว</h2>' + kvTable_((ud.folders || []).map(function (f) { return [f.name, Object.keys(ud.favorites || {}).filter(function (k) { return ud.favorites[k].folder === f.id; }).length + ' รายการ']; }).concat([['จำนวนโฟลเดอร์', (ud.folders || []).length]]));
  body += '<h2>ประวัติการอ่าน (ล่าสุด 300 รายการ)</h2><table><tr><th style="width:24%">วันเวลา</th><th>มาตรา</th></tr>' + (ud.history || []).slice(0, 300).map(function (h) { return '<tr><td>' + esc_(fmtTh_(h.t)) + '</td><td>' + esc_(nm(h.id)) + '</td></tr>'; }).join('') + '</table>';
  body += '<h2>ประวัติการค้นหา</h2><table><tr><th style="width:24%">วันเวลา</th><th>คำค้นหา</th></tr>' + (ud.searches || []).map(function (s) { return '<tr><td>' + esc_(fmtTh_(s.t)) + '</td><td>' + esc_(s.q) + '</td></tr>'; }).join('') + '</table>';
  var days = Object.keys(ud.time || {}).sort().reverse();
  body += '<h2>เวลาการใช้งาน</h2><table><tr><th>วันที่</th><th>ระยะเวลา</th></tr>' + days.map(function (d) { var s = ud.time[d]; return '<tr><td>' + esc_(d) + '</td><td>' + Math.floor(s / 3600) + ' ชั่วโมง ' + Math.floor(s % 3600 / 60) + ' นาที ' + (s % 60) + ' วินาที</td></tr>'; }).join('') + '</table>';
  body += '<h2>สมุดบันทึก (' + (ud.notes || []).length + ' ฉบับ)</h2>' + (ud.notes || []).map(function (n) { return '<h3 style="font-size:14pt;margin:10pt 0 4pt">' + esc_(n.title) + '</h3><p class="n">' + esc_(String(n.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 8000)) + '</p>'; }).join('');
  var st = ud.settings || {};
  body += '<h2>การตั้งค่า</h2>' + kvTable_([['ภาษา', st.lang], ['ธีม', st.theme], ['ขนาดตัวอักษร', Math.round((st.fontScale || 1) * 100) + '%'], ['รูปแบบวันที่', st.dateFmt === 'ce' ? 'คริสต์ศักราช' : 'พุทธศักราช'], ['เขตเวลา', st.tz], ['จดจำการเข้าสู่ระบบ', st.remember === false ? 'ปิด' : 'เปิด'], ['ออกจากระบบอัตโนมัติ', st.idle ? st.idle + ' นาที' : 'ไม่ใช้'], ['เสียงประกอบ', st.sound === false ? 'ปิด' : 'เปิด']]);
  body += PRIVACY_NOTE;
  return pdfOut_(pdfShell_(p.logo, 'เอกสารสำรองข้อมูลส่วนตัว', 'Personal Data Backup', body), 'backup-' + m.memberId + '-' + bkkDate_() + '.pdf');
}

/* ---------------------------------------------------------------------
 *  การชำระเงิน: พร้อมเพย์ (QR ตามมาตรฐาน EMVCo สร้างในหน้าเว็บ) และลิงก์ชำระเงินออนไลน์ (ถ้าตั้งค่า)
 *  Script Properties: PROMPTPAY_ID (เบอร์โทร 10 หลัก หรือเลขประจำตัวผู้เสียภาษี 13 หลัก), PROMPTPAY_NAME,
 *  PAYLINK_BASIC_MONTHLY ... PAYLINK_PRO_YEARLY (ลิงก์ชำระเงินจาก Stripe / PayPal ฯลฯ)
 * --------------------------------------------------------------------- */
function apiPaymentInfo_(p) {
  var props = PropertiesService.getScriptProperties(), links = {};
  ['BASIC', 'STANDARD', 'PRO'].forEach(function (pl) { ['MONTHLY', 'YEARLY'].forEach(function (cy) { var v = props.getProperty('PAYLINK_' + pl + '_' + cy); if (v && /^https:\/\//.test(v)) links[pl.toLowerCase() + '.' + cy.toLowerCase()] = v; }); });
  var pp = String(props.getProperty('PROMPTPAY_ID') || '').replace(/\D/g, '');
  return { prices: PLAN_PRICES, promptpay: /^(\d{10}|\d{13})$/.test(pp) ? pp : '', promptpayName: props.getProperty('PROMPTPAY_NAME') || '', links: links };
}
function apiPaymentNotify_(p, ctx) {
  var cycle = p.cycle === 'yearly' ? 'yearly' : 'monthly';
  if (!PLAN_PRICES[cycle][p.plan]) return fail_('INVALID', 'ไม่พบแพ็กเกจ');
  var note = 'อ้างอิง ' + cell_(String(p.ref || '').slice(0, 40));
  if (p.slip && /^data:image\/(jpeg|png|webp);base64,/.test(p.slip) && p.slip.length < 6000000) {
    try {
      var b = Utilities.newBlob(Utilities.base64Decode(p.slip.split(',')[1]), p.slip.slice(5, p.slip.indexOf(';')), 'slip-' + ctx.member.memberId + '-' + Date.now());
      note += ' | สลิป: ' + appFolder_('Payment Slips').createFile(b).getUrl();
    } catch (e) { logError_('slip', e, ctx.member.memberId); }
  }
  appendRow_('Payments', { time: new Date().toISOString(), memberId: ctx.member.memberId, username: ctx.member.username, plan: p.plan, cycle: cycle, amount: PLAN_PRICES[cycle][p.plan], status: 'แจ้งชำระแล้ว รอตรวจสอบ', note: note });
  return { msg: 'ระบบได้รับการแจ้งชำระเงินแล้ว ผู้ดูแลระบบจะตรวจสอบและเปิดสิทธิ์แพ็กเกจให้โดยเร็ว' };
}

/* ---------------------------------------------------------------------
 *  จัดรูปแบบ Google Sheets — ใช้ 4 สี: ฟ้า เขียว ขาว ดำ (สีทึบ ไม่ไล่ระดับ)
 *  เรียกจาก setup() หรือเมนู THAI LAW LIBRARY > จัดรูปแบบชีต
 * --------------------------------------------------------------------- */
var SHEET_COLORS = { blue: '#2E86DE', blueSoft: '#EAF4FC', green: '#1E8E3E', greenSoft: '#E7F5EA', white: '#FFFFFF', black: '#0E1116' };
function formatWorkbook_() {
  var C = SHEET_COLORS, ss = ss_();
  Object.keys(SHEETS).forEach(function (name) {
    var sh = sheet_(name), cols = SHEETS[name].length, last = Math.max(sh.getLastRow(), 2);
    sh.getBandings().forEach(function (b) { b.remove(); });
    var rng = sh.getRange(1, 1, Math.min(last, 50000), cols);
    var band = rng.applyRowBanding();
    band.setHeaderRowColor(C.black).setFirstRowColor(C.white).setSecondRowColor(C.blueSoft);
    sh.getRange(1, 1, 1, cols).setFontColor(C.white).setFontWeight('bold').setVerticalAlignment('middle');
    sh.setRowHeight(1, 32);
    sh.setFrozenRows(1);
    sh.setTabColor(/^(Security|LoginLog|ErrorLog|AuditLog)$/.test(name) ? C.black : /^(Stats|Payments)$/.test(name) ? C.green : C.blue);
    var rules = [];
    var full = sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, 1), cols);
    ['SUCCESS', 'ปกติ', 'เปิดสิทธิ์แล้ว', 'มีตัวบทครบทุกมาตรา', 'ตัวบทตามสำนักงานคณะกรรมการกฤษฎีกา', 'ตัวบทฉบับปรับปรุง (รวมการแก้ไขเพิ่มเติม)'].forEach(function (t) {
      rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(t).setFontColor(C.green).setBold(true).setRanges([full]).build());
    });
    ['FAIL', 'LOCKED', 'HIGH', 'CRITICAL', 'ระงับ'].forEach(function (t) {
      rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(t).setFontColor(C.white).setBackground(C.black).setBold(true).setRanges([full]).build());
    });
    sh.setConditionalFormatRules(rules);
    for (var c = 1; c <= cols; c++) sh.setColumnWidth(c, /json|text|detail|summary|note|stack|body/i.test(SHEETS[name][c - 1]) ? 320 : 150);
  });
  buildSummarySheet_();
  var sum = ss.getSheetByName('สรุปผล'); if (sum) { ss.setActiveSheet(sum); ss.moveActiveSheet(1); }
}
function buildSummarySheet_() {
  var C = SHEET_COLORS, ss = ss_();
  var sh = ss.getSheetByName('สรุปผล') || ss.insertSheet('สรุปผล');
  sh.getCharts().forEach(function (ch) { sh.removeChart(ch); });
  sh.clear();
  sh.setTabColor(C.green);
  sh.getRange('A1:H1').merge().setValue('THAI LAW LIBRARY คลังกฎหมาย — หน้าสรุปผล').setBackground(C.black).setFontColor(C.white).setFontSize(16).setFontWeight('bold').setHorizontalAlignment('center');
  sh.setRowHeight(1, 42);
  var kpi = [['ตัวชี้วัด', 'ค่า'],
    ['สมาชิกทั้งหมด', '=MAX(COUNTA(Members!A:A)-1,0)'], ['กฎหมายไทยในฐานข้อมูล', '=MAX(COUNTA(Laws!A:A)-1,0)'], ['มาตราในฐานข้อมูล', '=MAX(COUNTA(Sections!A:A)-1,0)'], ['อนุสัญญา/สนธิสัญญา', '=MAX(COUNTA(Treaties!A:A)-1,0)'],
    ['ผู้เข้าชม 30 วันล่าสุด', '=SUMIFS(Stats!B:B,Stats!A:A,">="&TEXT(TODAY()-29,"yyyy-mm-dd"))'], ['เข้าสู่ระบบสำเร็จ (90 วัน)', '=COUNTIF(LoginLog!D:D,"SUCCESS")'], ['เข้าสู่ระบบไม่สำเร็จ (90 วัน)', '=COUNTIF(LoginLog!D:D,"FAIL")'], ['เหตุการณ์ความปลอดภัย', '=MAX(COUNTA(Security!A:A)-1,0)'], ['คำขอชำระเงินรอตรวจสอบ', '=COUNTIF(Payments!G:G,"แจ้งชำระแล้ว รอตรวจสอบ")']];
  sh.getRange(3, 1, kpi.length, 2).setValues(kpi);
  sh.getRange(3, 1, 1, 2).setBackground(C.blue).setFontColor(C.white).setFontWeight('bold');
  sh.getRange(4, 1, kpi.length - 1, 2).setBackground(C.white);
  sh.getRange(4, 2, kpi.length - 1, 1).setFontWeight('bold').setFontColor(C.green).setNumberFormat('#,##0');
  var cats = ['รัฐธรรมนูญ', 'พระราชบัญญัติประกอบรัฐธรรมนูญ', 'พระราชบัญญัติ/พระราชกำหนด', 'ปร./ปว./คปค./คสช.', 'ประมวลกฎหมาย'];
  var t2 = [['หมวดกฎหมาย', 'จำนวนฉบับ']].concat(cats.map(function (c) { return [c, '=COUNTIF(Laws!B:B,"' + c + '")']; }));
  sh.getRange(3, 4, t2.length, 2).setValues(t2);
  sh.getRange(3, 4, 1, 2).setBackground(C.blue).setFontColor(C.white).setFontWeight('bold');
  var types = ['นักเรียน', 'นักศึกษา', 'บุคลากรทางกฎหมาย', 'ข้าราชการ / พนักงานภาครัฐ', 'พนักงานเอกชน', 'ประชาชนทั่วไป'];
  var t3 = [['ประเภทสมาชิก', 'จำนวน']].concat(types.map(function (c) { return [c, '=COUNTIF(Members!J:J,"' + c + '")']; }));
  sh.getRange(10, 4, t3.length, 2).setValues(t3);
  sh.getRange(10, 4, 1, 2).setBackground(C.green).setFontColor(C.white).setFontWeight('bold');
  sh.setColumnWidth(1, 240); sh.setColumnWidth(2, 120); sh.setColumnWidth(3, 30); sh.setColumnWidth(4, 260); sh.setColumnWidth(5, 110);
  var mk = function (type, range, title, color, r, c) {
    sh.insertChart(sh.newChart().setChartType(type).addRange(range).setPosition(r, c, 0, 0)
      .setOption('title', title).setOption('colors', [color]).setOption('legend', { position: 'none' })
      .setOption('backgroundColor', C.white).setOption('titleTextStyle', { color: C.black, bold: true }).setOption('width', 520).setOption('height', 300).build());
  };
  mk(Charts.ChartType.BAR, sh.getRange(3, 4, t2.length, 2), 'กฎหมายไทยแยกตามหมวด', C.blue, 18, 1);
  mk(Charts.ChartType.COLUMN, sh.getRange(10, 4, t3.length, 2), 'สมาชิกแยกตามประเภท', C.green, 18, 5);
  var stats = ss.getSheetByName('Stats');
  if (stats) mk(Charts.ChartType.LINE, stats.getRange('A1:B400'), 'ผู้เข้าชมเว็บไซต์รายวัน', C.blue, 34, 1);
  mk(Charts.ChartType.COLUMN, sh.getRange(9, 1, 2, 2), 'ผลการเข้าสู่ระบบ (90 วัน)', C.black, 34, 5);
}

function formatWorkbook() { formatWorkbook_(); }
function flushStats() { flushStats_(); }
