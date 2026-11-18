
/* =========================================================================
 *  VERSION 8 — เชื่อมต่อ LINE รายสมาชิก (ยืนยันด้วยเบอร์โทรศัพท์ที่สมัคร + รหัส 6 หลัก)
 *              แจ้ง “เข้าสู่ระบบสำเร็จ” ทาง LINE ทุกครั้ง (สมาชิก + ผู้ดูแล พร้อมกัน)
 *              อ่านมาตราเรียงตามเลขมาตรา / ล้างมาตราที่ไม่มีในฐานข้อมูลฉบับใหม่ / จำนวนกฎหมายตามข้อเท็จจริง
 *  (เพิ่มต่อจากระบบเดิม ไม่ลบการทำงานเดิม — ฟังก์ชันที่ประกาศซ้ำในไฟล์นี้จะใช้แทนของเดิม)
 *
 *  หมายเหตุ: LINE ไม่เปิดเผยเบอร์โทรศัพท์ของผู้ใช้ผ่าน API ระบบจึงยืนยันว่า “เป็นเบอร์เดียวกัน” โดยให้สมาชิก
 *  ส่งเบอร์โทรศัพท์ที่สมัคร + รหัส 6 หลักจากหน้าโปรไฟล์ (ต้องเข้าสู่ระบบแล้ว) ไปยัง LINE OA
 * ========================================================================= */
CONFIG.VERSION = '8.0.0';
SHEETS.Members.push('lineUserId', 'lineLinkedAt');
HEAD_TH.lineUserId = 'LINE User ID'; HEAD_TH.lineLinkedAt = 'เชื่อมต่อ LINE เมื่อ';

function normPhone_(s) {
  var d = String(s || '').replace(/[^0-9+]/g, '');
  if (/^\+?66/.test(d)) d = '0' + d.replace(/^\+?66/, '');
  return d.replace(/\D/g, '');
}
function maskPhone_(s) { var d = normPhone_(s); return d.length >= 9 ? d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6) : d; }
function lineGet_(path) {
  var tok = lineToken_(); if (!tok) return null;
  try {
    var r = UrlFetchApp.fetch(LINE_API + path, { headers: { Authorization: 'Bearer ' + tok }, muteHttpExceptions: true });
    return r.getResponseCode() < 300 ? JSON.parse(r.getContentText()) : null;
  } catch (e) { return null; }
}
/** ข้อมูลบัญชี LINE OA (ชื่อ, @ID, ลิงก์เพิ่มเพื่อน) เก็บแคช 6 ชั่วโมง */
function lineBotInfo_() {
  var c = CacheService.getScriptCache(), hit = json_(c.get('line_bot'), null);
  if (hit) return hit;
  var j = lineGet_('info'); if (!j) return null;
  var out = { name: j.displayName || '', basicId: j.basicId || '', picture: j.pictureUrl || '', addUrl: j.basicId ? 'https://line.me/R/ti/p/' + encodeURIComponent(j.basicId) : '' };
  c.put('line_bot', JSON.stringify(out), 21600);
  return out;
}

/* ---------------------- เชื่อมต่อ LINE รายสมาชิก ---------------------- */
function apiLineStatus_(p, ctx) {
  var m = findMemberById_(ctx.member.memberId), bot = lineToken_() ? lineBotInfo_() : null;
  return { configured: !!lineToken_(), linked: !!m.lineUserId, linkedAt: m.lineLinkedAt || '', phone: normPhone_(m.phone), phoneMasked: maskPhone_(m.phone), bot: bot };
}
function apiLineLinkCode_(p, ctx) {
  if (!lineToken_()) return fail_('LINE_OFF', 'ผู้ดูแลระบบยังไม่ได้เปิดการเชื่อมต่อ LINE');
  var m = findMemberById_(ctx.member.memberId), ph = normPhone_(m.phone);
  if (ph.length < 9) return fail_('NO_PHONE', 'กรุณาเพิ่มหมายเลขโทรศัพท์ในหน้าแก้ไขโปรไฟล์ก่อน (ต้องเป็นเบอร์เดียวกับที่ใช้กับ LINE)');
  var c = CacheService.getScriptCache(), code;
  for (var i = 0; i < 5; i++) { code = String(100000 + Math.floor(Math.random() * 900000)); if (!c.get('lnk_' + code)) break; }
  c.put('lnk_' + code, m.memberId, 1800);
  return { code: code, phone: ph, phoneMasked: maskPhone_(ph), expiresMin: 30, message: 'เชื่อมต่อ ' + ph + ' ' + code, bot: lineBotInfo_() };
}
function apiLineUnlink_(p, ctx) {
  var m = findMemberById_(ctx.member.memberId);
  if (m.lineUserId) {
    try { lineCall_('message/push', { to: m.lineUserId, messages: [{ type: 'text', text: 'ยกเลิกการเชื่อมต่อการแจ้งเตือนกับระบบ “คลังกฎหมาย” แล้ว' }] }, Utilities.getUuid()); } catch (e) {}
    updateRow_('Members', m._row, { lineUserId: '', lineLinkedAt: '' });
    audit_(m.memberId, 'line.unlink', 'ยกเลิกการเชื่อมต่อ LINE');
  }
  return { linked: false };
}
/** ข้อความสรุปข้อมูลที่สมาชิกกรอกไว้ (ไม่มีรหัสผ่าน/คำตอบกู้คืน) */
function memberDetailText_(m) {
  var rows = [['รหัสสมาชิก', m.memberId], ['ชื่อผู้ใช้งาน', m.username], ['ชื่อ–นามสกุล', [m.title, m.firstName, m.lastName].filter(String).join(' ')], ['ชื่อที่แสดง', m.displayName],
    ['วันเกิด', m.birthDate ? String(m.birthDate).slice(0, 10) : ''], ['เพศ', m.gender], ['อีเมล', m.email], ['โทรศัพท์', maskPhone_(m.phone)], ['ที่อยู่', m.address], ['สถานะ/อาชีพ', m.memberType]];
  return rows.filter(function (r) { return r[1]; }).map(function (r) { return '• ' + r[0] + ': ' + String(r[1]).slice(0, 200); }).join('\n');
}
function lineLinkMember_(ev, phone, code) {
  var src = ev.source || {}, uid = src.userId || '', c = CacheService.getScriptCache();
  var reply = function (t) { if (ev.replyToken) lineCall_('message/reply', { replyToken: ev.replyToken, messages: [{ type: 'text', text: t.slice(0, 4900) }] }, ''); };
  if (!/^U[0-9a-f]{32}$/.test(uid)) return reply('กรุณาส่งข้อความนี้ในแชตส่วนตัวกับบัญชี LINE ของระบบ “คลังกฎหมาย”');
  var badKey = 'lmbad_' + uid, bad = Number(c.get(badKey) || 0);
  if (bad >= 5) return reply('ใส่ข้อมูลไม่ถูกต้องหลายครั้ง กรุณารอ 1 ชั่วโมงแล้วลองใหม่');
  var mid = c.get('lnk_' + code), m = mid ? findMemberById_(mid) : null;
  if (!m || normPhone_(m.phone) !== normPhone_(phone)) {
    c.put(badKey, String(bad + 1), 3600);
    if (bad + 1 === 5) try { notifyAdmin_('มีการพยายามเชื่อมต่อ LINE ด้วยข้อมูลไม่ถูกต้องเกิน 5 ครั้ง', ['LINE ID: ' + uid, 'เวลา: ' + thDateTime_(new Date())]); } catch (e) {}
    return reply('เชื่อมต่อไม่สำเร็จ: เบอร์โทรศัพท์หรือรหัส 6 หลักไม่ตรงกับข้อมูลในเว็บไซต์ (รหัสใช้ได้ 30 นาที) กรุณาตรวจสอบในหน้าโปรไฟล์ › การแจ้งเตือนทาง LINE');
  }
  c.remove('lnk_' + code);
  updateRow_('Members', m._row, { lineUserId: uid, lineLinkedAt: new Date().toISOString() });
  audit_(m.memberId, 'line.link', 'เชื่อมต่อ LINE สำเร็จ (เบอร์ ' + maskPhone_(m.phone) + ')');
  reply('เชื่อมต่อการแจ้งเตือนกับระบบ “คลังกฎหมาย” สำเร็จแล้ว\nท่านจะได้รับข้อความทุกครั้งที่เข้าสู่ระบบสำเร็จ\n\n■ ข้อมูลบัญชีของท่าน\n' + memberDetailText_(m) + '\n\nเว็บไซต์: ' + siteUrl_());
}
function lineHelpText_() {
  return 'ยินดีต้อนรับสู่การแจ้งเตือนของระบบ “คลังกฎหมาย”\n\nวิธีเชื่อมต่อบัญชี: เข้าสู่ระบบที่เว็บไซต์ › โปรไฟล์ › การแจ้งเตือนทาง LINE › กด “รับรหัสเชื่อมต่อ” แล้วส่งข้อความตามที่แสดง เช่น\nเชื่อมต่อ 0812345678 123456\n(เบอร์โทรศัพท์ต้องตรงกับที่สมัครไว้ในเว็บไซต์)\n\nเว็บไซต์: ' + siteUrl_();
}
/** จับคู่ผู้ดูแลระบบ (จากเวอร์ชัน 7) */
function linePairAdmin_(ev, codeIn) {
  var src = ev.source || {}, id = src.groupId || src.roomId || src.userId || '';
  if (!/^[UCR][0-9a-f]{32}$/.test(id)) return;
  var cache = CacheService.getScriptCache(), bad = Number(cache.get('lpair.bad') || 0);
  if (bad >= 5) return;
  if (codeIn.toUpperCase() !== linePairCode_()) {
    cache.put('lpair.bad', String(bad + 1), 3600);
    if (bad + 1 === 5) try { notifyAdmin_('มีการใส่รหัสจับคู่ LINE ผิดเกิน 5 ครั้ง', ['ผู้ส่ง LINE ID: ' + id, 'เวลา: ' + thDateTime_(new Date()), 'ระบบหยุดรับการจับคู่ 1 ชั่วโมง']); } catch (e) {}
    return;
  }
  var P = PropertiesService.getScriptProperties(), list = lineTargets_();
  if (list.indexOf(id) < 0) list.push(id);
  P.setProperty('LINE_TO', list.slice(-10).join(','));
  P.setProperty('LINE_PAIR_CODE', randomToken_(8).toUpperCase());
  if (ev.replyToken) lineCall_('message/reply', { replyToken: ev.replyToken, messages: [{ type: 'text', text: 'เชื่อมต่อการแจ้งเตือนผู้ดูแลระบบ “คลังกฎหมาย” สำเร็จแล้ว' }] }, '');
  audit_('', 'notify.line.pair', 'เพิ่มผู้รับแจ้งเตือน LINE: ' + id);
  try { notifyAdmin_('เพิ่มผู้รับแจ้งเตือน LINE แล้ว', ['LINE ID: ' + id, 'เวลา: ' + thDateTime_(new Date())]); } catch (e) {}
}
function handleLineWebhook_(j) {
  (j.events || []).slice(0, 20).forEach(function (ev) {
    try {
      if (!ev) return;
      if (ev.type === 'follow') { if (ev.replyToken) lineCall_('message/reply', { replyToken: ev.replyToken, messages: [{ type: 'text', text: lineHelpText_() }] }, ''); return; }
      if (ev.type !== 'message' || !ev.message || ev.message.type !== 'text') return;
      var t = String(ev.message.text || '').trim(), m;
      if ((m = t.match(/^(?:เชื่อมต่อ|connect)\s*((?:\+?66|0)[0-9\-\s]{8,14}[0-9])\s+([0-9]{6})$/i))) return lineLinkMember_(ev, m[1], m[2]);
      if ((m = t.match(/^(?:เชื่อมต่อ|connect)\s+([A-Za-z0-9]{8})$/i))) return linePairAdmin_(ev, m[1]);
      if (/^(?:เชื่อมต่อ|connect|ช่วยเหลือ|help|วิธีใช้)/i.test(t) && ev.replyToken) lineCall_('message/reply', { replyToken: ev.replyToken, messages: [{ type: 'text', text: lineHelpText_() }] }, '');
    } catch (e) { logError_('line.webhook', e, ''); }
  });
}

/* ---------------------- แจ้ง “เข้าสู่ระบบสำเร็จ” ---------------------- */
function notifyLineLogin_(m, info) {
  try {
    if (!lineToken_()) return false;
    var P = PropertiesService.getScriptProperties(), to = [];
    if (m.lineUserId && /^U[0-9a-f]{32}$/.test(m.lineUserId)) to.push(m.lineUserId);
    if (P.getProperty('LINE_ADMIN_LOGIN') !== '0') lineTargets_().forEach(function (x) { if (to.indexOf(x) < 0) to.push(x); });
    if (!to.length) return false;
    info = info || {};
    var when = thDateTime_(new Date()), dev = [info.device, info.os, info.browser].filter(String).join(' / ');
    var rows = [['ชื่อผู้ใช้งาน', m.username], ['ชื่อที่แสดง', m.displayName || [m.firstName, m.lastName].filter(String).join(' ')], ['วันและเวลา', when], ['อุปกรณ์', dev || '-'], ['ตำแหน่งโดยประมาณ', info.location || '-']];
    var row = function (k, v) { return { type: 'box', layout: 'baseline', spacing: 'md', contents: [{ type: 'text', text: lineTxt_(k, 40), size: 'sm', color: '#5B6B7A', flex: 4, wrap: true }, { type: 'text', text: lineTxt_(v, 200), size: 'sm', color: '#0E1116', flex: 6, wrap: true }] }; };
    var url = siteUrl_();
    var bubble = { type: 'bubble', header: { type: 'box', layout: 'vertical', backgroundColor: '#16733A', paddingAll: '14px', contents: [{ type: 'text', text: 'คลังกฎหมาย · THAI LAW LIBRARY', color: '#D9F2E1', size: 'xs' }, { type: 'text', text: 'เข้าสู่ระบบสำเร็จ', color: '#FFFFFF', weight: 'bold', size: 'lg' }] },
      body: { type: 'box', layout: 'vertical', spacing: 'sm', contents: rows.map(function (r) { return row(r[0], r[1]); }).concat([{ type: 'text', text: 'หากไม่ใช่ท่าน กรุณาเปลี่ยนรหัสผ่านและออกจากระบบทุกอุปกรณ์ทันที', size: 'xs', color: '#B3261E', wrap: true, margin: 'lg' }]) } };
    if (/^https:\/\//.test(url)) bubble.footer = { type: 'box', layout: 'vertical', contents: [{ type: 'button', style: 'primary', color: '#16733A', height: 'sm', action: { type: 'uri', label: 'เปิดเว็บไซต์', uri: url } }] };
    var msg = { type: 'flex', altText: ('เข้าสู่ระบบสำเร็จ — ' + (m.username || '') + ' (' + when + ')').slice(0, 400), contents: bubble };
    var res = lineCall_('message/multicast', { to: to.slice(0, 500), messages: [msg] }, Utilities.getUuid());
    if (!res.ok && res.code === 400) res = lineCall_('message/multicast', { to: to.slice(0, 500), messages: [{ type: 'text', text: 'เข้าสู่ระบบสำเร็จ — ระบบ “คลังกฎหมาย”\n' + rows.map(function (r) { return '• ' + r[0] + ': ' + r[1]; }).join('\n') + '\n\nหากไม่ใช่ท่าน กรุณาเปลี่ยนรหัสผ่านทันที\n' + url }] }, Utilities.getUuid());
    if (!res.ok) logError_('notify.line.login', new Error('LINE ' + res.code + ' ' + res.msg), m.memberId);
    return !!res.ok;
  } catch (e) { logError_('notify.line.login', e, m && m.memberId); return false; }
}
/** เข้าสู่ระบบสำเร็จ (ทุกช่องทาง) — เหมือนเดิมทุกประการ และส่งแจ้งเตือน LINE เพิ่ม (ไม่ขัดขวางการเข้าสู่ระบบ) */
function finishLogin_(m, info, logBase, method) {
  var known = rows_('Sessions').some(function (s) { return s.memberId === m.memberId && s.device === String(info.device || '') && s.browser === String(info.browser || ''); });
  updateRow_('Members', m._row, { failCount: 0, lockUntil: '', lastLogin: new Date().toISOString() });
  var token = createSession_(m, info);
  logBase.result = 'SUCCESS'; logBase.reason = method; appendRow_('LoginLog', logBase);
  var fresh = findMemberById_(m.memberId);
  var notices = [];
  if (!known) notices.push({ type: 'security', title: 'เข้าสู่ระบบจากอุปกรณ์ใหม่', body: 'มีการเข้าสู่ระบบจาก ' + [info.device, info.os, info.browser].filter(function (x) { return x; }).join(' / ') + (info.location ? ' (' + info.location + ')' : '') + ' หากไม่ใช่ท่าน กรุณาเปลี่ยนรหัสผ่านและออกจากระบบทุกอุปกรณ์ทันที', time: new Date().toISOString() });
  notifyLineLogin_(fresh, info);
  return { token: token, member: publicMember_(fresh), notices: notices };
}
/** แก้ไขโปรไฟล์: ถ้าเปลี่ยนเบอร์โทรศัพท์ ต้องเชื่อมต่อ LINE ใหม่ (เบอร์ต้องตรงกันเสมอ) */
function apiUpdateProfileV8_(p, ctx) {
  var before = findMemberById_(ctx.member.memberId), oldPhone = before ? normPhone_(before.phone) : '', out = apiUpdateProfile_(p, ctx);
  try {
    var after = findMemberById_(ctx.member.memberId);
    if (before && after && after.lineUserId && oldPhone !== normPhone_(after.phone)) {
      lineCall_('message/push', { to: after.lineUserId, messages: [{ type: 'text', text: 'ท่านเปลี่ยนหมายเลขโทรศัพท์ในเว็บไซต์ “คลังกฎหมาย” ระบบจึงยกเลิกการเชื่อมต่อ LINE เดิม กรุณาเชื่อมต่อใหม่ด้วยเบอร์ใหม่ในหน้าโปรไฟล์' }] }, Utilities.getUuid());
      updateRow_('Members', after._row, { lineUserId: '', lineLinkedAt: '' });
      if (out && typeof out === 'object') out.lineUnlinked = true;
    }
  } catch (e) { logError_('profile.line', e, ctx.member.memberId); }
  return out;
}
ROUTES.updateProfile.fn = apiUpdateProfileV8_;
ROUTES.lineStatus = { fn: apiLineStatus_, auth: true, limit: 60 };
ROUTES.lineLinkCode = { fn: apiLineLinkCode_, auth: true, limit: 10 };
ROUTES.lineUnlink = { fn: apiLineUnlink_, auth: true, limit: 10 };

/* ---------------------------------------------------------------------
 *  อ่านมาตราของกฎหมาย: อ่านเฉพาะแถวที่เป็นของกฎหมายนั้น และเรียงตามเลขมาตรา
 *  (มาตราที่เพิ่มใหม่ เช่น ๑๓๕/๑ ถูกเพิ่มท้ายชีต จึงต้องเรียงใหม่ ไม่อ่านทั้งชีต)
 * --------------------------------------------------------------------- */
var SEC_SUF_ = { 'ทวิ': 2, 'ตรี': 3, 'จัตวา': 4, 'เบญจ': 5, 'ฉ': 6, 'สัตต': 7, 'อัฏฐ': 8, 'นว': 9, 'ทศ': 10 };
function secKey_(no) {
  var s = thaiNum_(String(no || '')).trim(), m = s.match(/^(\d+)(?:\/(\d+))?(?:\s*(\S+?))?(?:\/(\d+))?$/);
  if (!m) return [1e9, 0, 0, 0];
  return [Number(m[1]), m[2] ? Number(m[2]) : 0, SEC_SUF_[m[3]] || (m[3] ? 99 : 0), m[4] ? Number(m[4]) : 0];
}
function cmpSec_(a, b) { var x = secKey_(a.no), y = secKey_(b.no); for (var i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; }
function sectionsOfLaw_(lawId) {
  var cache = CacheService.getScriptCache();
  var n = Number(cache.get('secs_' + lawId + '_n') || 0);
  if (n) {
    var keys = []; for (var i = 0; i < n; i++) keys.push('secs_' + lawId + '_' + i);
    var got = cache.getAll(keys);
    if (Object.keys(got).length === n) { var s = ''; for (var j = 0; j < n; j++) s += got['secs_' + lawId + '_' + j]; return JSON.parse(s); }
  }
  var sh = sheet_('Sections');
  var rowsIdx = sh.getRange('B:B').createTextFinder(String(lawId)).matchEntireCell(true).findAll().map(function (r) { return r.getRow(); }).sort(function (a, b) { return a - b; });
  var out = [];
  for (var k = 0; k < rowsIdx.length;) { // อ่านเป็นช่วงแถวต่อเนื่อง
    var st = rowsIdx[k], en = st;
    while (k + 1 < rowsIdx.length && rowsIdx[k + 1] === en + 1) { k++; en++; }
    k++;
    sh.getRange(st, 1, en - st + 1, 7).getValues().forEach(function (v) {
      if (String(v[1]) === String(lawId)) out.push({ id: String(v[0]), law: String(v[1]), no: String(v[2]), name: String(v[3]), text: String(v[4]), tags: String(v[5]) });
    });
  }
  if (out.length > 1 && out.every(function (x) { return secKey_(x.no)[0] < 1e9; })) out.sort(cmpSec_); // เรียงตามเลขมาตรา (เฉพาะเมื่อทุกมาตรามีเลข)
  var str = JSON.stringify(out), parts = [];
  for (var q = 0; q < str.length; q += 90000) parts.push(str.slice(q, q + 90000));
  if (parts.length <= 50) { var put = {}; parts.forEach(function (p, i) { put['secs_' + lawId + '_' + i] = p; }); try { cache.putAll(put, 21600); cache.put('secs_' + lawId + '_n', String(parts.length), 21600); } catch (e) {} }
  return out;
}

/* ---------------------------------------------------------------------
 *  ล้างมาตราที่ไม่มีในฐานข้อมูลฉบับใหม่ (เช่น มาตราที่ถูกเปลี่ยนเลข หรือมาตราของกฎหมายอื่นที่ติดมา)
 *  ทำครั้งเดียวต่อเวอร์ชันฐานข้อมูล หลังนำเข้าครบ — แบ่งทำเป็นช่วงเพื่อไม่ให้เกินเวลา
 * --------------------------------------------------------------------- */
function pruneTick() {
  var lock = LockService.getScriptLock(); if (!lock.tryLock(1000)) return 'busy';
  var P = PropertiesService.getScriptProperties(), started = Date.now();
  try {
    var rs = json_(P.getProperty('REPO_IMPORT_STATE'), {});
    if (!rs.done || !rs.repoVer) return 'wait-import';
    var st = json_(P.getProperty('PRUNE_STATE'), {});
    if (st.ver === rs.repoVer && st.done) return 'done';
    if (st.ver !== rs.repoVer) st = { ver: rs.repoVer, shard: 0, removed: 0, renamed: 0, done: false };
    var base = dbBase_(), idx = fetchGzJson_(base + 'index.json.gz');
    var sh = sheet_('Sections'), last = sh.getLastRow(); if (last < 2) return 'empty';
    var colA = sh.getRange(2, 1, last - 1, 4).getValues(); // id, law, no, name
    while (st.shard < idx.manifest.shards && Date.now() - started < 240000) {
      var shard = fetchGzJson_(base + 's' + ('00' + st.shard).slice(-3) + '.json.gz'), valid = {}, names = {}, laws = {};
      shard.forEach(function (law) { laws[law.id] = 1; law.s.forEach(function (s) { valid[law.id + '-' + s[0]] = 1; if (/^K0[1-4]$/.test(law.id)) names[law.id + '-' + s[0]] = s[1]; }); });
      var del = [], ren = [];
      colA.forEach(function (v, i) {
        var id = String(v[0]), law = String(v[1]);
        if (!laws[law]) return;
        if (!valid[id]) del.push(i + 2);
        else if (names[id] && String(v[3]) !== names[id]) ren.push([i + 2, names[id]]);
      });
      ren.forEach(function (r) { sh.getRange(r[0], 4).setValue(cell_(r[1])); });
      del.sort(function (a, b) { return b - a; });
      for (var k = 0; k < del.length;) { var hi = del[k], lo = hi; while (k + 1 < del.length && del[k + 1] === lo - 1) { k++; lo--; } k++; sh.deleteRows(lo, hi - lo + 1); }
      if (del.length) colA = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues() : [];
      Object.keys(laws).forEach(function (id) { CacheService.getScriptCache().removeAll(['secs_' + id + '_n', 'secs8_' + id + '_n']); });
      st.removed += del.length; st.renamed += ren.length; st.shard++;
      P.setProperty('PRUNE_STATE', JSON.stringify(st));
    }
    if (st.shard >= idx.manifest.shards) { st.done = true; P.setProperty('PRUNE_STATE', JSON.stringify(st)); delete _rowsCache.Sections; bumpCatalogVersion_(); audit_('', 'db.prune', 'ปรับฐานข้อมูลมาตราให้ตรงฉบับ ' + st.ver + ': ลบ ' + st.removed + ' แถว ปรับชื่อ ' + st.renamed + ' มาตรา'); }
    return st.done ? 'done' : 'shard ' + st.shard;
  } catch (e) { logError_('prune', e, ''); return 'error'; } finally { lock.releaseLock(); }
}

/* ---------------------------------------------------------------------
 *  จำนวนกฎหมายตามข้อเท็จจริงในฐานข้อมูล: ไทย / ต่างประเทศ / รวม และแยก 2 กรณี
 *  (มีตัวบทแยกรายมาตรา / ตัวบททั้งฉบับ)
 * --------------------------------------------------------------------- */
function dbManifestMain_() {
  var c = CacheService.getScriptCache(), hit = json_(c.get('dbman8'), null);
  if (hit) return hit;
  try { var r = UrlFetchApp.fetch(dbBase_() + 'manifest.json', { muteHttpExceptions: true }); if (r.getResponseCode() < 300) { hit = JSON.parse(r.getContentText()); c.put('dbman8', JSON.stringify(hit), 21600); } } catch (e) {}
  return hit || {};
}
function apiPublicStatsV8_() {
  var s = apiPublicStatsV6_(), w = worldManifest_(), fm = fgnManifest_(), dm = dbManifestMain_();
  var mainLaws = Number(s.laws || 0), mainWhole = Math.min(mainLaws, Number(dm.wholeText || 0));
  var t2 = fm.thai2 || {}, t2Laws = Number(t2.laws || 0), t2Whole = Number(t2.wholeText || 0);
  var fA = 0, fW = 0, fL = 0, fS = 0;
  Object.keys(w.countries || {}).forEach(function (k) {
    if (k === 'CN') return;
    var x = w.countries[k]; fL += Number(x.laws || 0); fS += Number(x.sections || 0);
    fA += Number(x.withArticles || 0); fW += Number(x.wholeText || 0);
  });
  var cn = (fm.countries || {}).CN; if (cn) { fL += cn.laws; fS += cn.sections; fA += cn.laws; }
  var thai = { laws: mainLaws + t2Laws, sections: Number(s.sections || 0) + Number(t2.sections || 0), sectioned: (mainLaws - mainWhole) + (t2Laws - t2Whole), whole: mainWhole + t2Whole };
  var foreign = { laws: fL, sections: fS, sectioned: fA, whole: fW, countries: Object.keys(w.countries || {}).length };
  s.counts = { thai: thai, foreign: foreign, total: { laws: thai.laws + foreign.laws, sections: thai.sections + foreign.sections, sectioned: thai.sectioned + foreign.sectioned, whole: thai.whole + foreign.whole }, asOf: w.summarized || w.built || '' };
  return s;
}
ROUTES.publicStats.fn = apiPublicStatsV8_;

function installTriggers_() {
  var have = {};
  ScriptApp.getProjectTriggers().forEach(function (t) { have[t.getHandlerFunction()] = true; });
  if (!have.dailySync) ScriptApp.newTrigger('dailySync').timeBased().everyDays(1).atHour(3).create();
  if (!have.healthCheck) ScriptApp.newTrigger('healthCheck').timeBased().everyHours(1).create();
  if (!have.importTick) ScriptApp.newTrigger('importTick').timeBased().everyMinutes(10).create();
  if (!have.hourlyV6) ScriptApp.newTrigger('hourlyV6').timeBased().everyHours(1).create();
  if (!have.pruneTick) ScriptApp.newTrigger('pruneTick').timeBased().everyHours(1).create();
}
/** อัปเกรดอัตโนมัติ: ขั้นตอนเดิมครบ + ให้ระบบนำเข้าฐานข้อมูลฉบับใหม่ทันที (ประมวลกฎหมายหลักฉบับปรับปรุง) */
function upgradeV5_() {
  try { ensureHeaders_(); } catch (e) { logError_('upgrade.headers', e, ''); }
  try { migrateV4_(); } catch (e) { logError_('upgrade.migrate', e, ''); }
  try { installTriggers_(); } catch (e) { logError_('upgrade.triggers', e, ''); }
  try { ScriptApp.newTrigger('formatWorkbook').timeBased().after(2 * 60 * 1000).create(); } catch (e) { logError_('upgrade.format', e, ''); }
  var P = PropertiesService.getScriptProperties();
  try { var rs = json_(P.getProperty('REPO_IMPORT_STATE'), {}); rs.done = false; P.setProperty('REPO_IMPORT_STATE', JSON.stringify(rs)); } catch (e) {}
  CacheService.getScriptCache().removeAll(['cfg', 'pubstats', 'fman5', 'fcounts', 'wman6', 'dman6', 'dbman8']);
  P.setProperty('INIT_DONE', CONFIG.VERSION);
  audit_('', 'system.upgrade', 'อัปเกรดเป็นเวอร์ชัน ' + CONFIG.VERSION + ' (ข้อมูลสมาชิกเดิมคงอยู่ครบ)');
  if (lineTargets_().length || !lineToken_()) return;
  try {
    notifyAdmin_('อัปเกรดเป็นเวอร์ชัน 8: แจ้งเตือนทาง LINE', ['รหัสจับคู่ผู้ดูแล: ส่ง “เชื่อมต่อ ' + linePairCode_() + '” หา LINE OA', 'สมาชิกเชื่อมต่อเองได้ที่ โปรไฟล์ › การแจ้งเตือนทาง LINE (ต้องตั้ง Webhook URL ของ LINE OA เป็นลิงก์ /exec)']);
  } catch (e) { logError_('upgrade.v8', e, ''); }
}
