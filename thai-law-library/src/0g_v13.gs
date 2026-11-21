/* =========================================================================
 *  v13 (เพิ่มเติมเท่านั้น): อีเมลถึงสมาชิก (รหัสผ่านชั้นที่ 2 / แจ้งเตือน) ส่งในนาม thailawlibrary.official@gmail.com
 *  - ถ้าบัญชีที่รันสคริปต์คือ thailawlibrary.official@gmail.com → ส่งจากบัญชีนี้โดยตรง
 *  - ถ้าบัญชีเดิมตั้ง “ส่งอีเมลในนาม” (Send mail as) เป็น thailawlibrary.official@gmail.com แล้ว → ส่งผ่าน GmailApp ด้วย from
 *  - กรณีอื่น: ส่งด้วยชื่อ “คลังกฎหมาย THAI LAW LIBRARY” และตอบกลับไปที่ thailawlibrary.official@gmail.com (ระบบไม่ใส่อีเมลบัญชีเดิมในเนื้อหา)
 * ========================================================================= */
CONFIG.VERSION = '13.0.0';
function officialSender_() {
  var c = CacheService.getScriptCache(), hit = c.get('mailfrom13');
  if (hit) return hit === '-' ? '' : hit;
  var how = '';
  try { if (String(Session.getEffectiveUser().getEmail()).toLowerCase() === OFFICIAL_EMAIL) how = 'self'; } catch (e) {}
  if (!how) { try { if (GmailApp.getAliases().map(function (a) { return String(a).toLowerCase(); }).indexOf(OFFICIAL_EMAIL) > -1) how = 'alias'; } catch (e) {} }
  c.put('mailfrom13', how || '-', 21600);
  return how;
}
function mailOfficial_(o) {
  var how = officialSender_(), name = 'คลังกฎหมาย THAI LAW LIBRARY';
  if (how === 'alias') {
    GmailApp.sendEmail(o.to, o.subject, o.body || String(o.htmlBody || '').replace(/<[^>]+>/g, ' '), { from: OFFICIAL_EMAIL, name: name, replyTo: OFFICIAL_EMAIL, htmlBody: o.htmlBody });
    return;
  }
  MailApp.sendEmail({ to: o.to, subject: o.subject, body: o.body, htmlBody: o.htmlBody, name: name, replyTo: OFFICIAL_EMAIL });
}
/* ส่งรหัสผ่านชั้นที่ 2 ผ่านช่องทางของบัญชีทางการ (เนื้อหาอีเมลเหมือนเดิมทุกประการ) */
var sendOtpMailV6_ = sendOtpMail_;
sendOtpMail_ = function (email, code, name) {
  var realMail = MailApp.sendEmail, captured = null;
  try {
    MailApp.sendEmail = function (o) { captured = o; };
  } catch (e) { captured = undefined; }
  if (captured === undefined || MailApp.sendEmail === realMail) return sendOtpMailV6_(email, code, name);   // แก้ไขบริการไม่ได้ → ใช้วิธีเดิม (ตอบกลับไปบัญชีทางการ)
  try { sendOtpMailV6_(email, code, name); } finally { MailApp.sendEmail = realMail; }
  if (captured) mailOfficial_(captured);
};
function mailSenderStatus() { CacheService.getScriptCache().remove('mailfrom13'); Logger.log('ผู้ส่งอีเมล: ' + ({ self: 'บัญชี ' + OFFICIAL_EMAIL + ' (โดยตรง)', alias: 'ส่งในนาม ' + OFFICIAL_EMAIL + ' ผ่าน GmailApp' }[officialSender_()] || 'บัญชีที่รันสคริปต์ (ตอบกลับไปที่ ' + OFFICIAL_EMAIL + ') — ตั้งค่า Send mail as หรือ Deploy ด้วยบัญชี ' + OFFICIAL_EMAIL)); }
