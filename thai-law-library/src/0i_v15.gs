/* =========================================================================
 *  v15: แก้การตรวจช่องทางอีเมลทางการ — เดิมจำผล “ยังไม่มีช่องทาง” ไว้ 6 ชั่วโมง
 *  ทำให้แม้ Deploy ด้วยบัญชี thailawlibrary.official@gmail.com แล้วก็ยังส่งไม่ได้ ตอนนี้ตรวจใหม่ทุกครั้ง (จำเฉพาะผลที่ใช้ได้ 10 นาที)
 * ========================================================================= */
CONFIG.VERSION = '15.0.0';
officialSender_ = function () {
  var c = CacheService.getScriptCache(), hit = c.get('mailfrom15');
  if (hit) return hit;
  var how = '';
  try { if (String(Session.getEffectiveUser().getEmail()).toLowerCase() === OFFICIAL_EMAIL) how = 'self'; } catch (e) {}
  if (!how) { try { var me = String(Session.getActiveUser().getEmail() || '').toLowerCase(); if (me === OFFICIAL_EMAIL && String(Session.getEffectiveUser().getEmail() || '') === '') how = 'self'; } catch (e) {} }
  if (!how) { try { if (GmailApp.getAliases().map(function (a) { return String(a).toLowerCase(); }).indexOf(OFFICIAL_EMAIL) > -1) how = 'alias'; } catch (e) {} }
  if (how) c.put('mailfrom15', how, 600);
  return how;
};
/** ตรวจสถานะช่องทางส่งอีเมล (เรียกจากหน้าแก้ไขสคริปต์) */
mailSenderStatus = function () {
  CacheService.getScriptCache().removeAll(['mailfrom13', 'mailfrom15']);
  var P = PropertiesService.getScriptProperties(), eff = ''; try { eff = Session.getEffectiveUser().getEmail(); } catch (e) {}
  var how = P.getProperty('MAIL_RELAY_URL') ? 'relay' : officialSender_();
  Logger.log('บัญชีที่รันสคริปต์: ' + (eff || '(ไม่ทราบ)') + '\nช่องทางส่งอีเมล: ' + ({ relay: 'ตัวส่งของบัญชีทางการ (MAIL_RELAY_URL)', self: 'บัญชีทางการโดยตรง', alias: 'ส่งในนามบัญชีทางการ (Send mail as)' }[how] || 'ยังไม่มีช่องทางทางการ — Deploy ด้วย ' + OFFICIAL_EMAIL + ' หรือตั้ง MAIL_RELAY_URL'));
};
