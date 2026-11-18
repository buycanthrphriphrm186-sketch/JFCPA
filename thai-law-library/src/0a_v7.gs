
/* =========================================================================
 *  VERSION 7 — แจ้งเตือนการสมัครใช้งานบัญชีใหม่ทาง LINE (LINE Messaging API)
 *  (เพิ่มต่อจากระบบเดิม ไม่ลบหรือเปลี่ยนการทำงานเดิม: อีเมลแจ้งผู้ดูแลและ NOTIFY_URL ยังทำงานเหมือนเดิม)
 *
 *  ตั้งค่าใน Project Settings › Script Properties (ห้ามใส่รหัสไว้ในโค้ด):
 *    LINE_CHANNEL_TOKEN = Channel access token ของ LINE Official Account (รหัสยาวที่ลงท้ายด้วย =)
 *    LINE_TO            = (แนะนำ) User ID / Group ID ผู้รับ เช่น U1234… คั่นหลายรายการด้วยจุลภาค
 *                         หาได้ที่ LINE Developers › Channel › Basic settings › “Your user ID”
 *                         หรือส่งข้อความ “เชื่อมต่อ <รหัสจับคู่>” หา LINE OA (รหัสจับคู่ส่งไปทางอีเมลผู้ดูแล)
 *  ถ้ายังไม่ตั้ง LINE_TO ระบบจะส่งแบบ broadcast ถึงเพื่อนของ LINE OA ทุกคน โดยตัดข้อมูลติดต่อส่วนบุคคลออก
 * ========================================================================= */
CONFIG.VERSION = '7.0.0';
var LINE_API = 'https://api.line.me/v2/bot/';
var LINE_PRIVATE_LABELS = { 'อีเมล': 1, 'หมายเลขโทรศัพท์': 1, 'ที่อยู่': 1, 'วันเดือนปีเกิด': 1, 'คำถามสำหรับกู้คืนบัญชี': 1 };

function lineToken_() {
  var P = PropertiesService.getScriptProperties();
  var t = (P.getProperty('LINE_CHANNEL_TOKEN') || '').trim();
  if (!t) { var n = (P.getProperty('NOTIFY_TOKEN') || '').trim(); if (/^[A-Za-z0-9+\/]{100,}={0,2}$/.test(n)) t = n; }
  return t;
}
function lineTargets_() {
  return (PropertiesService.getScriptProperties().getProperty('LINE_TO') || '').split(/[\s,]+/)
    .filter(function (x) { return /^[UCR][0-9a-f]{32}$/.test(x); });
}
/** เรียก LINE API พร้อมลองใหม่ 1 ครั้งเมื่อเครือข่ายขัดข้อง/เซิร์ฟเวอร์ไม่ว่าง (ใช้ X-Line-Retry-Key ป้องกันข้อความซ้ำ) */
function lineCall_(path, body, retryKey) {
  var tok = lineToken_();
  if (!tok) return { ok: false, code: 0, msg: 'NO_TOKEN' };
  var headers = { Authorization: 'Bearer ' + tok };
  if (retryKey) headers['X-Line-Retry-Key'] = retryKey;
  var last = { ok: false, code: 0, msg: '' };
  for (var i = 0; i < 2; i++) {
    try {
      var r = UrlFetchApp.fetch(LINE_API + path, { method: 'post', contentType: 'application/json; charset=UTF-8', headers: headers, payload: JSON.stringify(body), muteHttpExceptions: true });
      var c = r.getResponseCode();
      if (c < 300 || (c === 409 && retryKey)) return { ok: true, code: c };
      last = { ok: false, code: c, msg: r.getContentText().slice(0, 300) };
      if (c !== 429 && c < 500) break;
    } catch (e) { last = { ok: false, code: 0, msg: String(e && e.message || e).slice(0, 300) }; }
    Utilities.sleep(1200);
  }
  return last;
}
function lineTxt_(s, n) { s = String(s === undefined || s === null ? '' : s).trim(); return (s || '-').slice(0, n || 400); }
/** ข้อความ Flex: หัวข้อจัดรูปแบบ + ตารางข้อมูลผู้สมัคร + วันเวลา + ลิงก์ */
function lineRegMessage_(rows, when, url, reduced) {
  var title = 'แจ้งเตือนการสมัครใช้งานบัญชีใหม่';
  var row = function (k, v) {
    return { type: 'box', layout: 'baseline', spacing: 'md', contents: [
      { type: 'text', text: lineTxt_(k, 60), size: 'sm', color: '#5B6B7A', flex: 4, wrap: true },
      { type: 'text', text: lineTxt_(v, 400), size: 'sm', color: '#0E1116', flex: 6, wrap: true }] };
  };
  var body = [{ type: 'text', text: 'รายละเอียดข้อมูลผู้สมัคร', weight: 'bold', color: '#1F5F99', size: 'md' }]
    .concat(rows.slice(0, 30).map(function (r) { return row(r[0], r[1]); }))
    .concat([{ type: 'separator', margin: 'lg' },
      { type: 'text', text: 'ข้อมูลอ้างอิงระบบ', weight: 'bold', color: '#1F5F99', size: 'md', margin: 'lg' },
      row('วันและเวลาที่สมัคร', when), row('เว็บไซต์', url)]);
  if (reduced) body.push({ type: 'text', text: 'ข้อมูลติดต่อส่วนบุคคลส่งไปทางอีเมลผู้ดูแลระบบ (ตั้งค่า LINE_TO เพื่อรับครบทุกช่องใน LINE)', size: 'xs', color: '#8A97A3', wrap: true, margin: 'lg' });
  var bubble = { type: 'bubble', size: 'giga',
    header: { type: 'box', layout: 'vertical', backgroundColor: '#1F5F99', paddingAll: '16px', contents: [
      { type: 'text', text: 'คลังกฎหมาย · THAI LAW LIBRARY', color: '#D6E8F7', size: 'xs' },
      { type: 'text', text: title, color: '#FFFFFF', weight: 'bold', size: 'lg', wrap: true },
      { type: 'text', text: 'ระบบ “คลังกฎหมาย”', color: '#FFFFFF', size: 'sm' }] },
    body: { type: 'box', layout: 'vertical', spacing: 'sm', contents: body } };
  if (/^https:\/\//.test(url)) bubble.footer = { type: 'box', layout: 'vertical', contents: [{ type: 'button', style: 'primary', color: '#1F5F99', height: 'sm', action: { type: 'uri', label: 'เปิดเว็บไซต์', uri: url } }] };
  var user = (rows.filter(function (r) { return /Username/.test(r[0]); })[0] || [])[1] || '';
  return { type: 'flex', altText: (title + ' — ระบบ “คลังกฎหมาย”' + (user ? ' (' + user + ')' : '')).slice(0, 400), contents: bubble };
}
function lineRegText_(rows, when, url, reduced) {
  var t = 'แจ้งเตือนการสมัครใช้งานบัญชีใหม่ — ระบบ “คลังกฎหมาย”\n\n■ รายละเอียดข้อมูลผู้สมัคร\n' +
    rows.map(function (r) { return '• ' + r[0] + ': ' + r[1]; }).join('\n') +
    '\n\n■ ข้อมูลอ้างอิงระบบ\n• วันและเวลาที่สมัคร: ' + when + '\n• เว็บไซต์: ' + url +
    (reduced ? '\n\n(ข้อมูลติดต่อส่วนบุคคลส่งไปทางอีเมลผู้ดูแลระบบ)' : '');
  return { type: 'text', text: t.slice(0, 4900) };
}
/** ส่งแจ้งเตือนสมาชิกใหม่ทาง LINE — คืนค่า true/false ไม่โยนข้อผิดพลาด (ไม่ขัดขวางการสมัคร) */
function notifyLineRegistration_(f, member) {
  try {
    if (!lineToken_()) return false;
    var when = thDateTime_(new Date()), url = siteUrl_(), to = lineTargets_(), reduced = !to.length;
    var rows = regFields_(f, member);
    if (reduced) rows = rows.filter(function (r) { return !LINE_PRIVATE_LABELS[r[0]]; });
    var key = Utilities.getUuid(), res;
    var send = function (msg, k) {
      if (!reduced) {
        var ok = true, rr = null;
        to.forEach(function (id) { rr = lineCall_('message/push', { to: id, messages: [msg] }, k ? Utilities.getUuid() : ''); if (!rr.ok) ok = false; });
        return ok ? { ok: true } : rr;
      }
      return lineCall_('message/broadcast', { messages: [msg] }, k);
    };
    res = send(lineRegMessage_(rows, when, url, reduced), key);
    if (!res.ok && res.code === 400) res = send(lineRegText_(rows, when, url, reduced), Utilities.getUuid()); // Flex ไม่ผ่าน → ส่งข้อความธรรมดาแทน
    if (!res.ok) logError_('notify.line', new Error('LINE ' + res.code + ' ' + res.msg), member && member.memberId);
    else audit_(member && member.memberId || '', 'notify.line', 'ส่งแจ้งเตือนสมาชิกใหม่ทาง LINE แล้ว (' + (reduced ? 'broadcast' : to.length + ' ผู้รับ') + ')');
    return !!res.ok;
  } catch (e) { logError_('notify.line', e, member && member.memberId); return false; }
}
function apiRegisterV7_(p, ctx) {
  var out = apiRegisterV6_(p, ctx); // สมัคร + อีเมลผู้ดูแล + NOTIFY_URL (เดิม)
  if (out && out.ok !== false && out.member) notifyLineRegistration_(p.form || {}, out.member);
  return out;
}
ROUTES.register.fn = apiRegisterV7_;

/* ---------------------------------------------------------------------
 *  จับคู่ผู้รับ LINE อัตโนมัติ: ผู้ดูแลส่ง “เชื่อมต่อ <รหัสจับคู่>” หา LINE OA
 *  (ตั้ง Webhook URL ของ LINE OA เป็นลิงก์ /exec ของเว็บไซต์นี้)
 * --------------------------------------------------------------------- */
function linePairCode_() {
  var P = PropertiesService.getScriptProperties(), c = P.getProperty('LINE_PAIR_CODE');
  if (!c) { c = randomToken_(8).toUpperCase(); P.setProperty('LINE_PAIR_CODE', c); }
  return c;
}
function handleLineWebhook_(j) {
  (j.events || []).slice(0, 20).forEach(function (ev) {
    try {
      if (!ev || ev.type !== 'message' || !ev.message || ev.message.type !== 'text') return;
      var m = String(ev.message.text || '').trim().match(/^(?:เชื่อมต่อ|connect)\s+([A-Za-z0-9]{6,32})$/i);
      if (!m) return;
      var src = ev.source || {}, id = src.groupId || src.roomId || src.userId || '';
      if (!/^[UCR][0-9a-f]{32}$/.test(id)) return;
      var cache = CacheService.getScriptCache(), bad = Number(cache.get('lpair.bad') || 0);
      if (bad >= 5) return; // ใส่ผิดเกิน 5 ครั้ง: หยุดรับ 1 ชั่วโมง
      var ok = m[1].toUpperCase() === linePairCode_();
      if (!ok) {
        cache.put('lpair.bad', String(bad + 1), 3600);
        if (bad + 1 === 5) try { notifyAdmin_('มีการใส่รหัสจับคู่ LINE ผิดเกิน 5 ครั้ง', ['ผู้ส่ง LINE ID: ' + id, 'เวลา: ' + thDateTime_(new Date()), 'ระบบหยุดรับการจับคู่ 1 ชั่วโมง']); } catch (e) {}
        return;
      }
      var P = PropertiesService.getScriptProperties(), list = lineTargets_();
      if (list.indexOf(id) < 0) list.push(id);
      P.setProperty('LINE_TO', list.slice(-10).join(','));
      P.setProperty('LINE_PAIR_CODE', randomToken_(8).toUpperCase()); // ใช้ได้ครั้งเดียว
      if (ev.replyToken) lineCall_('message/reply', { replyToken: ev.replyToken, messages: [{ type: 'text', text: 'เชื่อมต่อการแจ้งเตือนสมาชิกใหม่ของระบบ “คลังกฎหมาย” สำเร็จแล้ว' }] }, '');
      audit_('', 'notify.line.pair', 'เพิ่มผู้รับแจ้งเตือน LINE: ' + id);
      try { notifyAdmin_('เพิ่มผู้รับแจ้งเตือน LINE แล้ว', ['LINE ID: ' + id, 'เวลา: ' + thDateTime_(new Date())]); } catch (e) {}
    } catch (e) { logError_('line.webhook', e, ''); }
  });
}
/** รับทั้ง Apple Sign in (form_post เดิม) และ Webhook จาก LINE */
function doPost(e) {
  var pd = e && e.postData;
  if (pd && /json/i.test(pd.type || '') && pd.contents && pd.contents.length < 200000) {
    var j = null;
    try { j = JSON.parse(pd.contents); } catch (x) {}
    if (j && Array.isArray(j.events)) {
      try { handleLineWebhook_(j); } catch (x) { logError_('line.webhook', x, ''); }
      return ContentService.createTextOutput('OK');
    }
  }
  var p = (e && e.parameter) || {};
  var boot = { v: CONFIG.VERSION, url: safeUrl_(), social: null };
  try {
    ensureInit_();
    boot.flags = publicFlags_(getConfig_(), null);
    if (p.code && p.state) boot.social = oauthCallback_(p.code, p.state, p.user || null);
  } catch (err) {
    logError_('doPost', err, '');
  }
  return renderIndex_(boot);
}

/** เรียกจากตัวแก้ไขสคริปต์ (Run › testLineNotify) เพื่อทดสอบการแจ้งเตือน LINE ด้วยข้อมูลตัวอย่าง */
function testLineNotify() {
  if (!lineToken_()) { Logger.log('ยังไม่ได้ตั้ง Script Property LINE_CHANNEL_TOKEN'); return 'NO_TOKEN'; }
  var ok = notifyLineRegistration_({ username: 'ทดสอบระบบ', title: 'นาย', firstName: 'ทดสอบ', lastName: 'การแจ้งเตือน', displayName: 'ทดสอบ', memberType: 'ทดสอบระบบ', email: 'test@example.com', accept: true }, { memberId: 'TEST' });
  Logger.log(ok ? 'ส่งสำเร็จ' : 'ส่งไม่สำเร็จ ดูรายละเอียดในชีต ErrorLog');
  Logger.log('รหัสจับคู่ LINE (ส่ง “เชื่อมต่อ ' + linePairCode_() + '” หา LINE OA): ' + linePairCode_());
  return ok ? 'OK' : 'FAILED';
}

/** อัปเกรดอัตโนมัติ (ensureInit_ เรียกเมื่อเวอร์ชันเปลี่ยน): ขั้นตอนเดิมของเวอร์ชัน 6 ครบ + แจ้งวิธีตั้งค่า LINE */
function upgradeV5_() {
  try { ensureHeaders_(); } catch (e) { logError_('upgrade.headers', e, ''); }
  try { migrateV4_(); } catch (e) { logError_('upgrade.migrate', e, ''); }
  try { installTriggers_(); } catch (e) { logError_('upgrade.triggers', e, ''); }
  try { ScriptApp.newTrigger('formatWorkbook').timeBased().after(2 * 60 * 1000).create(); } catch (e) { logError_('upgrade.format', e, ''); }
  CacheService.getScriptCache().removeAll(['cfg', 'pubstats', 'fman5', 'fcounts', 'wman6', 'dman6']);
  PropertiesService.getScriptProperties().setProperty('INIT_DONE', CONFIG.VERSION);
  audit_('', 'system.upgrade', 'อัปเกรดเป็นเวอร์ชัน ' + CONFIG.VERSION + ' (ข้อมูลสมาชิกเดิมคงอยู่ครบ)');
  if (lineTargets_().length) return;
  try {
    var code = linePairCode_();
    notifyAdmin_('อัปเกรดเป็นเวอร์ชัน 7: แจ้งเตือนสมาชิกใหม่ทาง LINE', [
      'ตั้ง Script Property LINE_CHANNEL_TOKEN = Channel access token ของ LINE OA',
      'ผู้รับ: ตั้ง LINE_TO = User ID (LINE Developers › Basic settings › Your user ID) หรือส่งข้อความ “เชื่อมต่อ ' + code + '” หา LINE OA (ตั้ง Webhook URL เป็นลิงก์ /exec ของเว็บไซต์)',
      'ทดสอบ: ตัวแก้ไขสคริปต์ › เลือกฟังก์ชัน testLineNotify › Run']);
  } catch (e) { logError_('upgrade.v7', e, ''); }
}
