/* =========================================================================
 *  v12 (เพิ่มเติมเท่านั้น): แชท — อ่านแล้ว/ยังไม่อ่าน, แก้ไข, ลบ (กู้คืนไม่ได้), แนบรูปภาพ/ไฟล์ (ส่งเป็นช่วง ๆ ไม่จำกัดขนาด)
 *  ตัวนับข้อความผู้ดูแล (ส่งข้อความด้วยเพื่อแสดงในกระดิ่ง)
 * ========================================================================= */
CONFIG.VERSION = '12.0.0';
SHEETS.Chat.push('attach', 'editedAt');
HEAD_TH.attach = 'ไฟล์แนบ'; HEAD_TH.editedAt = 'แก้ไขเมื่อ';
var CHAT_DELETED = 'ลบโดยสมาชิก';

function chatRowOf_(id, memberId) {
  var rows = findRowsBy_('Chat', 1, id); if (!rows.length) return null;
  var r = rows[0], v = sheet_('Chat').getRange(r, 1, 1, SHEETS.Chat.length).getValues()[0], o = { _row: r };
  SHEETS.Chat.forEach(function (h, i) { o[h] = v[i]; });
  if (String(o.memberId) !== String(memberId)) return null;   // แก้ไข/ลบได้เฉพาะข้อความของตนเอง
  return o;
}
function backendMirrorUpdate_(id, text) {
  try { var bs = backendSheet_(); if (!bs) return; var last = bs.getLastRow(); if (last < 2) return; var c = bs.getRange(2, 1, last - 1, 1).createTextFinder(id).matchEntireCell(true).findNext(); if (c) bs.getRange(c.getRow(), 8).setValue(cell_(text)); } catch (e) { logError_('chat.mirrorUpd', e, ''); }
}
/* เธรดแชท: ข้อความของสมาชิกยึดตามชีต Chat (รวมสถานะลบ/แก้ไข) ข้อความผู้ดูแลจากหลังบ้าน + การแจ้งเตือน MSG- */
chatThread_ = function (m) {
  var mine = [], admin = {}, sh = sheet_('Chat'), H = SHEETS.Chat;
  findRowsBy_('Chat', 3, m.memberId).forEach(function (r) {
    var v = sh.getRange(r, 1, 1, H.length).getValues()[0], o = {}; H.forEach(function (h, i) { o[h] = v[i]; });
    if (String(o.status) === CHAT_DELETED) return;
    var x = { id: String(o.id), time: String(o.time), sender: String(o.sender) === 'admin' ? 'admin' : 'member', adminName: String(o.adminName || ''), text: String(o.text || ''), status: String(o.status || ''), edited: !!o.editedAt, attach: json_(o.attach, null) };
    if (x.sender === 'admin') admin[x.id] = x; else mine.push(x);
  });
  try { backendMsgs_(m.memberId).forEach(function (x) { if (x.sender === 'admin') admin[x.id] = x; }); } catch (e) {}
  try { serverNotices_(udServerRead_(m.memberId).data).forEach(function (n) { if (/^MSG-/.test(n.id) && !admin[n.id]) admin[n.id] = { id: n.id, time: n.time, sender: 'admin', adminName: n.from || '', text: n.body }; }); } catch (e) {}
  var adm = Object.keys(admin).map(function (k) { return admin[k]; });
  var seenReps = [];   // เรื่องแชทในชีต Reports ที่ผู้ดูแลเปลี่ยนสถานะแล้ว (เปิดอ่านแล้ว)
  try { delete _rowsCache.Reports; rows_('Reports').forEach(function (r) { if (r.memberId === m.memberId && r.kind === 'แชทกับผู้ดูแลระบบ' && r.status && r.status !== 'รอดำเนินการ') seenReps.push(new Date(r.time).getTime()); }); } catch (e) {}
  mine.forEach(function (x) {   // ผู้ดูแลอ่านแล้ว: ตั้งสถานะ “อ่านแล้ว” / มีข้อความตอบกลับหลังข้อความนี้ / เปลี่ยนสถานะเรื่องแชทที่รวมข้อความนี้
    var t = new Date(x.time).getTime();
    x.read = /อ่านแล้ว/.test(x.status) || adm.some(function (a) { return String(a.time) > x.time; }) || seenReps.some(function (rt) { return t >= rt - 1000 && t < rt + 30 * 60000; });
  });
  return mine.concat(adm).sort(function (a, b) { return String(a.time) < String(b.time) ? -1 : 1; }).slice(-400);
};
function apiChatEdit_(p, ctx) {
  var text = String(p.text || '').replace(/\r\n/g, '\n').trim();
  if (!text) return fail_('EMPTY', 'กรุณาพิมพ์ข้อความ'); if (text.length > 5000) return fail_('TOO_LONG', 'ข้อความยาวเกิน 5,000 ตัวอักษร');
  var o = chatRowOf_(String(p.id || ''), ctx.member.memberId); if (!o || String(o.status) === CHAT_DELETED) return fail_('NOT_FOUND', 'ไม่พบข้อความ');
  var now = new Date().toISOString(), sh = sheet_('Chat'), H = SHEETS.Chat;
  sh.getRange(o._row, H.indexOf('text') + 1).setValue(cell_(text));
  sh.getRange(o._row, H.indexOf('editedAt') + 1).setValue(now);
  if (!/อ่านแล้ว/.test(String(o.status))) sh.getRange(o._row, H.indexOf('status') + 1).setValue('แก้ไขแล้ว');
  backendMirrorUpdate_(String(o.id), '[แก้ไขเมื่อ ' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm') + '] ' + text);
  CacheService.getScriptCache().remove('chs11_' + ctx.member.memberId);
  return { id: o.id, editedAt: now };
}
function apiChatDelete_(p, ctx) {
  var o = chatRowOf_(String(p.id || ''), ctx.member.memberId); if (!o) return fail_('NOT_FOUND', 'ไม่พบข้อความ');
  var sh = sheet_('Chat'), H = SHEETS.Chat;
  sh.getRange(o._row, H.indexOf('text') + 1).setValue('');
  sh.getRange(o._row, H.indexOf('status') + 1).setValue(CHAT_DELETED);
  sh.getRange(o._row, H.indexOf('editedAt') + 1).setValue(new Date().toISOString());
  var at = json_(o.attach, null); if (at && at.fileId) { try { DriveApp.getFileById(at.fileId).setTrashed(true); } catch (e) {} }
  backendMirrorUpdate_(String(o.id), '(สมาชิกลบข้อความนี้แล้ว)');
  return { id: o.id, deleted: true };
}
ROUTES.chatEdit = { fn: apiChatEdit_, auth: true, limit: 120 };
ROUTES.chatDelete = { fn: apiChatDelete_, auth: true, limit: 120 };

/* ---------------- แนบรูปภาพ/ไฟล์: อัปโหลดแบบต่อเนื่อง (resumable) ไปยัง Google Drive ของผู้ดูแล ทีละช่วง ---------------- */
function chatFolder_() { var f = appFolder_('Chat Attachments'); return f; }
function fmtSize_(n) { n = Number(n) || 0; return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n >= 1024 ? Math.round(n / 1024) + ' KB' : n + ' B'; }
function apiChatUploadStart_(p, ctx) {
  var name = String(p.name || 'file').replace(/[\\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 180) || 'file';
  var mime = /^[\w.+-]+\/[\w.+-]+$/.test(String(p.mime || '')) ? String(p.mime) : 'application/octet-stream';
  var size = Math.floor(Number(p.size) || 0); if (size <= 0) return fail_('EMPTY', 'ไฟล์ว่างเปล่า');
  var folder = chatFolder_();
  var res = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true', {
    method: 'post', contentType: 'application/json; charset=UTF-8', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Upload-Content-Type': mime, 'X-Upload-Content-Length': String(size) },
    payload: JSON.stringify({ name: ctx.member.memberId + '_' + Date.now() + '_' + name, parents: [folder.getId()], description: 'แนบในแชทโดย ' + ctx.member.username + ' (' + ctx.member.memberId + ')' })
  });
  var loc = res.getHeaders()['Location'] || res.getHeaders()['location'];
  if (res.getResponseCode() !== 200 || !loc) { logError_('chat.uploadStart', new Error('HTTP ' + res.getResponseCode() + ' ' + res.getContentText().slice(0, 200)), ''); return fail_('UPLOAD_FAIL', 'เริ่มอัปโหลดไม่สำเร็จ กรุณาลองใหม่'); }
  var uid = Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('up_' + uid, JSON.stringify({ url: loc, m: ctx.member.memberId, size: size, name: name, mime: mime }), 21600);
  return { uploadId: uid, chunk: 4 * 1024 * 1024 };
}
function apiChatUploadChunk_(p, ctx) {
  var c = CacheService.getScriptCache(), st = json_(c.get('up_' + String(p.uploadId || '')), null);
  if (!st || st.m !== ctx.member.memberId) return fail_('UPLOAD_EXPIRED', 'การอัปโหลดหมดอายุ กรุณาแนบไฟล์ใหม่');
  var bytes = Utilities.base64Decode(String(p.data || '')), off = Math.floor(Number(p.offset) || 0), end = off + bytes.length - 1;
  var res = UrlFetchApp.fetch(st.url, { method: 'put', muteHttpExceptions: true, contentType: st.mime, payload: bytes, headers: { 'Content-Range': 'bytes ' + off + '-' + end + '/' + st.size } });
  var code = res.getResponseCode();
  if (code === 308) return { next: end + 1 };
  if (code !== 200 && code !== 201) { logError_('chat.uploadChunk', new Error('HTTP ' + code + ' ' + res.getContentText().slice(0, 200)), ''); return fail_('UPLOAD_FAIL', 'ส่งไฟล์ช่วงนี้ไม่สำเร็จ ระบบจะลองใหม่'); }
  var file = JSON.parse(res.getContentText()); c.remove('up_' + p.uploadId);
  var m = ctx.member, now = new Date().toISOString(), id = 'CHT-' + Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase();
  var at = { fileId: file.id, name: st.name, mime: st.mime, size: st.size };
  var cap = String(p.caption || '').trim().slice(0, 2000);
  var text = '[ไฟล์แนบ] ' + st.name + ' (' + fmtSize_(st.size) + ')' + (cap ? '\n' + cap : '');
  var row = SHEETS.Chat.map(function (h) { return { id: id, time: now, memberId: m.memberId, username: m.username, sender: 'member', adminId: '', adminName: '', text: cell_(text), status: 'รอซิงก์', attach: JSON.stringify(at), editedAt: '' }[h] || ''; });
  sheet_('Chat').appendRow(row);
  return { done: true, id: id, time: now, attach: at, text: text };
}
function apiChatFile_(p, ctx) {
  var o = null, id = String(p.id || '');
  var rows = findRowsBy_('Chat', 1, id); if (rows.length) { var v = sheet_('Chat').getRange(rows[0], 1, 1, SHEETS.Chat.length).getValues()[0]; o = {}; SHEETS.Chat.forEach(function (h, i) { o[h] = v[i]; }); }
  if (!o || String(o.memberId) !== ctx.member.memberId) return fail_('NOT_FOUND', 'ไม่พบไฟล์');
  var at = json_(o.attach, null); if (!at || !at.fileId) return fail_('NOT_FOUND', 'ไม่พบไฟล์');
  if (Number(at.size) > 8 * 1024 * 1024) return { big: true, name: at.name, size: at.size };
  var b = DriveApp.getFileById(at.fileId).getBlob();
  return { name: at.name, mime: at.mime, data: Utilities.base64Encode(b.getBytes()) };
}
ROUTES.chatUploadStart = { fn: apiChatUploadStart_, auth: true, limit: 120 };
ROUTES.chatUploadChunk = { fn: apiChatUploadChunk_, auth: true, limit: 3000 };
ROUTES.chatFile = { fn: apiChatFile_, auth: true, limit: 300 };
/* แนบไฟล์แล้วส่งต่อถึงหลังบ้านพร้อมลิงก์ Google Drive (ไฟล์เป็นส่วนตัวของผู้ดูแลระบบ ไม่เปิดสาธารณะ) */
var chatSyncPendingV11_ = chatSyncPending_;
chatSyncPending_ = function (memberId) {
  try {
    var sh = sheet_('Chat'), H = SHEETS.Chat, rows = memberId ? findRowsBy_('Chat', 3, memberId) : [];
    rows.forEach(function (r) {
      var v = sh.getRange(r, 1, 1, H.length).getValues()[0], at = json_(v[H.indexOf('attach')], null);
      if (at && at.fileId && String(v[H.indexOf('status')]) === 'รอซิงก์' && String(v[H.indexOf('text')]).indexOf('drive.google.com') < 0) sh.getRange(r, H.indexOf('text') + 1).setValue(cell_(String(v[H.indexOf('text')]) + '\nhttps://drive.google.com/file/d/' + at.fileId + '/view'));
    });
  } catch (e) { logError_('chat.attachLink', e, ''); }
  return chatSyncPendingV11_(memberId);
};
/* ข้อความไฟล์แนบที่ส่งกลับให้สมาชิกไม่แสดงลิงก์ Drive ของผู้ดูแล */
(function () {
  var f = ROUTES.chatList.fn;
  ROUTES.chatList.fn = function (p, ctx) { var r = f(p, ctx); (r.msgs || []).forEach(function (x) { if (x.attach) x.text = String(x.text).replace(/\nhttps:\/\/drive\.google\.com\/\S+/g, ''); }); return r; };
})();
/* ตัวนับข้อความผู้ดูแล: ส่งข้อความสั้นด้วย เพื่อแสดงในกล่องแจ้งเตือนมุมขวาบน */
var chatSigV11_ = chatSig_;
chatSig_ = function (memberId) {
  var c = CacheService.getScriptCache(), k = 'chs12_' + memberId, hit = c.get(k);
  if (hit) return JSON.parse(hit);
  var t = {};
  try { backendMsgs_(memberId).forEach(function (x) { if (x.sender === 'admin') t[x.id] = [x.id, String(x.time), String(x.text || '').slice(0, 300), x.adminName || '']; }); } catch (e) {}
  try { serverNotices_(udServerRead_(memberId).data).forEach(function (n) { if (/^MSG-/.test(n.id) && !t[n.id]) t[n.id] = [n.id, String(n.time), String(n.body || '').slice(0, 300), n.from || '']; }); } catch (e) {}
  var list = Object.keys(t).map(function (id) { return t[id]; }).sort(function (a, b) { return a[1] < b[1] ? -1 : 1; }).slice(-200);
  var o = { admin: list, lastAdmin: list.length ? list[list.length - 1][1] : '' };
  c.put(k, JSON.stringify(o), 2);
  return o;
};
/* บัญชีทดลองใช้งานใช้ฟังก์ชันใหม่ของแชทไม่ได้ */
['chatEdit', 'chatDelete', 'chatUploadStart', 'chatUploadChunk', 'chatFile'].forEach(function (a) {
  var f = ROUTES[a].fn;
  ROUTES[a].fn = function (p, ctx) { if (ctx && ctx.member && ctx.member.memberId === GUEST_ID) return fail_('GUEST_ONLY', 'โหมดทดลองใช้งานไม่สามารถใช้ฟังก์ชันนี้ได้'); return f(p, ctx); };
});
var upgradeV11_ = upgradeV5_;
upgradeV5_ = function () { upgradeV11_(); try { ensureHeaders_(); } catch (e) {} };
/* อ่านอนุสัญญา (สำรองฝั่งเซิร์ฟเวอร์): ไม่แสดง “ระบบขัดข้อง” — หากแหล่งข้อมูลภายนอกไม่ตอบ ให้แสดงข้อมูลพื้นฐานจากดัชนีของเว็บไซต์ */
(function () {
  var f = ROUTES.treatyText.fn;
  ROUTES.treatyText.fn = function (p, ctx) {
    try { var r = f(p, ctx); if (r && r.ok !== false) return r; } catch (e) { logError_('treaty.text', e, String(p.id || '')); }
    var id = String(p.id || '').toUpperCase(), t = null;
    try { t = (treatyIndex9_().treaties || {})[id]; } catch (e) {}
    var TT = { t: 'สนธิสัญญา', c: 'อนุสัญญา', o: 'เอกสารระหว่างประเทศอื่น ๆ' };
    return { id: id, th: t ? t[1] : '', en: t ? t[0] : id, kind: 'meta', source: 'Wikidata ' + id, paras: t ? [(t[1] || t[0]) + (t[1] && t[0] ? ' (' + t[0] + ')' : ''), 'ประเภท: ' + (TT[t[2]] || '-') + (t[5] ? ' — ' + t[5] : ''), 'วันที่ลงนาม/มีผล: ' + (t[3] || 'ไม่ระบุในแหล่งข้อมูล'), 'สถานะ: ' + (t[4] ? 'สิ้นผลหรือยกเลิกแล้ว' : 'มีผลบังคับใช้ (ตามข้อมูลล่าสุดที่มี)'), 'จำนวนรัฐภาคี/ผู้ลงนามในแหล่งข้อมูล: ' + (t[6] || '-') + ' ประเทศ'] : ['ยังไม่มีข้อมูลของรายการนี้'] };
  };
})();
