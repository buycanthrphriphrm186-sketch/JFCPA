/* =========================================================================
 *  v14: อีเมลทุกฉบับของเว็บไซต์ส่งจาก thailawlibrary.official@gmail.com เท่านั้น
 *  ลำดับช่องทาง: ตัวส่งของบัญชีทางการ (MAIL_RELAY_URL) → สคริปต์ทำงานด้วยบัญชีทางการโดยตรง → ส่งในนามบัญชีทางการ (Send mail as)
 *  ไม่ส่งจากบัญชีส่วนตัวเดิมไม่ว่ากรณีใด — หากยังไม่ได้ตั้งค่าช่องทางทางการ ระบบจะไม่ส่งและแจ้งผู้ดูแลในบันทึกข้อผิดพลาด
 * ========================================================================= */
CONFIG.VERSION = '14.0.0';
function mailSend14_(o) {
  o = o || {};
  var P = PropertiesService.getScriptProperties(), url = P.getProperty('MAIL_RELAY_URL'), key = P.getProperty('MAIL_RELAY_KEY');
  var name = o.name || 'คลังกฎหมาย THAI LAW LIBRARY';
  if (url && key) {
    var res = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', muteHttpExceptions: true, followRedirects: true,
      payload: JSON.stringify({ key: key, to: o.to, subject: o.subject, body: o.body || String(o.htmlBody || '').replace(/<[^>]+>/g, ' '), htmlBody: o.htmlBody, name: name }) });
    var j = null; try { j = JSON.parse(res.getContentText()); } catch (e) {}
    if (j && j.ok) return true;
    throw new Error('MAIL_RELAY_' + ((j && j.code) || res.getResponseCode()));
  }
  var how = officialSender_();
  if (how === 'self') { MailApp.sendEmail({ to: o.to, subject: o.subject, body: o.body, htmlBody: o.htmlBody, name: name, replyTo: OFFICIAL_EMAIL }); return true; }
  if (how === 'alias') { GmailApp.sendEmail(o.to, o.subject, o.body || String(o.htmlBody || '').replace(/<[^>]+>/g, ' '), { from: OFFICIAL_EMAIL, name: name, replyTo: OFFICIAL_EMAIL, htmlBody: o.htmlBody }); return true; }
  logError_('mail.noOfficialChannel', new Error('ยังไม่ได้ตั้งค่าช่องทางส่งอีเมลของบัญชีทางการ (MAIL_RELAY_URL) — ไม่ส่งจากบัญชีส่วนตัว'), String(o.to || '').replace(/(.{2}).*(@.*)/, '$1***$2'));
  throw new Error('MAIL_CHANNEL');
}
mailOfficial_ = function (o) { return mailSend14_(o); };
/* รหัสผ่านชั้นที่ 2 (OTP) */
sendOtpMail_ = function (email, code, name) {
  var when = thDateTime_(new Date()), exp = thDateTime_(new Date(Date.now() + 10 * 60000));
  mailSend14_({ to: email,
    subject: 'รหัสยืนยัน ' + code + ' สำหรับเข้าสู่ระบบ คลังกฎหมาย (THAI LAW LIBRARY)',
    body: 'รหัสยืนยัน (รหัสผ่านชั้นที่ 2) ของท่านคือ ' + code + '\n\nเรียน ' + (name || 'สมาชิก') + '\nกรุณากรอกรหัส 6 หลักนี้ในช่อง “รหัส 6 หลักจากอีเมล” บนหน้าเข้าสู่ระบบ\nขอรหัสเมื่อ: ' + when + '\nหมดอายุ: ' + exp + ' (10 นาที ใช้ได้ครั้งเดียว)\n\nหากท่านไม่ได้เป็นผู้ขอรหัสนี้ กรุณาอย่าเปิดเผยรหัสแก่ผู้ใด และแจ้ง ' + OFFICIAL_EMAIL + '\n\nYour THAI LAW LIBRARY verification code is ' + code,
    htmlBody: '<div style="font-family:\'TH Sarabun New\',Sarabun,Tahoma,sans-serif;font-size:17px;line-height:1.6;color:#0E1116;max-width:560px">' +
      '<p style="margin:0 0 6px"><b>คลังกฎหมาย</b> · THAI LAW LIBRARY</p><p>เรียน ' + esc_(name || 'สมาชิก') + '</p>' +
      '<p>กรุณากรอก <b>รหัสยืนยัน (รหัสผ่านชั้นที่ 2)</b> ต่อไปนี้ในช่อง “รหัส 6 หลักจากอีเมล” บนหน้าเว็บไซต์</p>' +
      '<p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#2E86DE;margin:14px 0">' + code + '</p>' +
      '<p>ขอรหัสเมื่อ: ' + when + '<br>หมดอายุ: ' + exp + ' (10 นาที ใช้ได้ครั้งเดียว)</p>' +
      '<p>หากท่านไม่ได้เป็นผู้ขอรหัสนี้ กรุณาอย่าเปิดเผยรหัสแก่ผู้ใด เปลี่ยนรหัสผ่านส่วนตัวทันที และแจ้ง ' + OFFICIAL_EMAIL + ' ผู้ดูแลระบบจะไม่สอบถามรหัสนี้จากท่านไม่ว่ากรณีใด</p>' +
      '<p style="color:#5D6878;font-size:14px">อีเมลฉบับนี้ส่งจากบัญชีทางการของเว็บไซต์ ' + OFFICIAL_EMAIL + '</p></div>' });
};
/** ดูหรือสร้างคีย์สำหรับตัวส่งอีเมล (ใช้ค่าเดียวกันใน RELAY_KEY ของโปรเจกต์ตัวส่ง) */
function showRelayKey() {
  var P = PropertiesService.getScriptProperties(), k = P.getProperty('MAIL_RELAY_KEY');
  if (!k) { k = randomToken_(48); P.setProperty('MAIL_RELAY_KEY', k); }
  Logger.log('MAIL_RELAY_KEY = ' + k + '\nตั้ง MAIL_RELAY_URL เป็น URL /exec ของตัวส่ง (relay/MailRelay.gs) ที่ Deploy ด้วยบัญชี ' + OFFICIAL_EMAIL);
}
function testOfficialMail() { mailSend14_({ to: OFFICIAL_EMAIL, subject: 'ทดสอบช่องทางอีเมลทางการ (เว็บไซต์หลัก)', body: 'ส่งผ่านช่องทางของบัญชีทางการสำเร็จ ' + new Date() }); Logger.log('ส่งสำเร็จผ่านช่องทางบัญชีทางการ'); }
