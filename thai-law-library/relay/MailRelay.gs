/**
 * ตัวส่งอีเมลของบัญชีทางการ thailawlibrary.official@gmail.com (โปรเจกต์ Apps Script แยกต่างหาก)
 * วิธีติดตั้ง (ทำครั้งเดียว ใช้เวลาประมาณ 3 นาที):
 *  1) เข้าสู่ระบบ Google ด้วยบัญชี thailawlibrary.official@gmail.com → https://script.google.com → New project → วางโค้ดนี้
 *  2) Project Settings › Script Properties › เพิ่ม RELAY_KEY = (ข้อความลับยาว ๆ อย่างน้อย 32 ตัวอักษร เช่นที่ได้จากฟังก์ชัน showRelayKey ของเว็บไซต์หลัก)
 *  3) เลือกฟังก์ชัน testRelay › Run › อนุญาตสิทธิ์ (ส่งอีเมลทดสอบถึงบัญชีทางการ)
 *  4) Deploy › New deployment › Web app › Execute as: Me (thailawlibrary.official@gmail.com) › Who has access: Anyone › Deploy → คัดลอก URL /exec
 *  5) ที่โปรเจกต์เว็บไซต์หลัก: Script Properties เพิ่ม MAIL_RELAY_URL = URL /exec ข้างต้น และ MAIL_RELAY_KEY = ค่าเดียวกับ RELAY_KEY
 * อีเมลทุกฉบับของเว็บไซต์จะส่งจาก thailawlibrary.official@gmail.com เท่านั้น
 */
var OFFICIAL = 'thailawlibrary.official@gmail.com';
function doPost(e) {
  var out = function (o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); };
  try {
    var key = PropertiesService.getScriptProperties().getProperty('RELAY_KEY');
    var b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!key || key.length < 32 || b.key !== key) return out({ ok: false, code: 'FORBIDDEN' });
    if (String(Session.getEffectiveUser().getEmail()).toLowerCase() !== OFFICIAL) return out({ ok: false, code: 'WRONG_ACCOUNT' });
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(String(b.to || ''))) return out({ ok: false, code: 'BAD_TO' });
    var c = CacheService.getScriptCache(), k = 'n_' + Math.floor(Date.now() / 60000), n = Number(c.get(k) || 0) + 1; c.put(k, String(n), 120);
    if (n > 60) return out({ ok: false, code: 'RATE' });
    if (MailApp.getRemainingDailyQuota() < 1) return out({ ok: false, code: 'QUOTA' });
    MailApp.sendEmail({ to: b.to, subject: String(b.subject || '').slice(0, 250), body: String(b.body || ''), htmlBody: b.htmlBody ? String(b.htmlBody) : undefined, name: String(b.name || 'คลังกฎหมาย THAI LAW LIBRARY').slice(0, 80), replyTo: OFFICIAL });
    return out({ ok: true, remaining: MailApp.getRemainingDailyQuota() });
  } catch (err) { return out({ ok: false, code: 'ERROR', msg: String(err && err.message || err).slice(0, 200) }); }
}
function testRelay() { MailApp.sendEmail(OFFICIAL, 'ทดสอบตัวส่งอีเมล คลังกฎหมาย', 'ตัวส่งอีเมลของบัญชีทางการพร้อมใช้งาน (ส่งจาก ' + Session.getEffectiveUser().getEmail() + ')'); }
