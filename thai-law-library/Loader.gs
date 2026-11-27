/**
 * คลังกฎหมาย (THAI LAW LIBRARY) — ไฟล์โหลดระบบ
 * ------------------------------------------------------------------
 * วางไฟล์นี้ไฟล์เดียวแทนเนื้อหาเดิมทั้งหมดในไฟล์ Code.gs ของโปรเจกต์ Apps Script (ไฟล์สั้น วางบน iPad ได้ง่าย)
 * ระบบจะดึงโค้ดเวอร์ชันล่าสุด (Code.gs และ Index.html) จาก GitHub ของเว็บไซต์โดยอัตโนมัติ
 * - ตรวจไวยากรณ์ก่อนใช้ทุกครั้ง ถ้าโค้ดใหม่มีปัญหา จะใช้ฉบับล่าสุดที่ใช้งานได้ (สำรองไว้ใน Google Drive) แทน → เว็บไซต์ไม่ล่ม
 * - เก็บไว้ในแคช 10 นาที จึงไม่ช้า · อัปเดตโค้ดครั้งต่อไปไม่ต้องคัดลอกไฟล์ยาวอีก
 * - ไฟล์ Index.html เดิมในโปรเจกต์ใช้เป็นสำรองเท่านั้น (เก็บไว้ได้ ไม่ต้องแก้)
 * ห้ามมีไฟล์ MailRelay.gs อยู่ในโปรเจกต์นี้ (ไฟล์นั้นเป็นของโปรเจกต์ตัวส่งอีเมลแยกต่างหาก)
 */
var TLL_SRC = 'https://raw.githubusercontent.com/buycanthrphriphrm186-sketch/JFCPA/claude/legal-ai-website-system-4h1org/thai-law-library/';
var TLL_TTL = 600;
var TLL_CHUNK = 25000;

function tllFetch_(name) {
  var c = CacheService.getScriptCache(), k = 'tllsrc3_' + name.replace(/\W/g, '_');
  try {
    var n = Number(c.get(k + '_n') || 0);
    if (n > 0) {
      var keys = [];
      for (var i = 0; i < n; i++) keys.push(k + '_' + i);
      var got = c.getAll(keys);
      if (Object.keys(got).length === n) return keys.map(function (x) { return got[x]; }).join('');
    }
  } catch (e) {}
  var txt = null;
  try {
    var r = UrlFetchApp.fetch(TLL_SRC + name + '?t=' + Math.floor(Date.now() / 60000), { muteHttpExceptions: true, followRedirects: true });
    if (r.getResponseCode() === 200) txt = r.getContentText('UTF-8');
  } catch (e) { txt = null; }
  if (txt && !tllValid_(name, txt)) txt = null;
  var backupName = 'TLL-source-' + name + '.txt';
  try {
    if (txt) {
      var it = DriveApp.getFilesByName(backupName);
      if (it.hasNext()) { var f = it.next(); if (f.getSize() !== Utilities.newBlob(txt).getBytes().length) f.setContent(txt); }
      else DriveApp.createFile(backupName, txt, 'text/plain');
    } else {
      var it2 = DriveApp.getFilesByName(backupName);
      if (it2.hasNext()) { txt = it2.next().getBlob().getDataAsString('UTF-8'); if (!tllValid_(name, txt)) txt = null; }
    }
  } catch (e) {}
  if (!txt) return null;
  try {
    var put = {}, parts = Math.ceil(txt.length / TLL_CHUNK);
    for (var j = 0; j < parts; j++) put[k + '_' + j] = txt.slice(j * TLL_CHUNK, (j + 1) * TLL_CHUNK);
    put[k + '_n'] = String(parts);
    var ks = Object.keys(put);
    for (var p = 0; p < ks.length; p += 30) { var part = {}; ks.slice(p, p + 30).forEach(function (x) { part[x] = put[x]; }); c.putAll(part, TLL_TTL); }
  } catch (e) {}
  return txt;
}

function tllValid_(name, txt) {
  if (name === 'Code.gs') {
    if (txt.indexOf('function renderIndex_') < 0) return false;
    try { new Function(txt); return true; } catch (e) { return false; }
  }
  // หน้าเว็บต้องมีแท็กแม่แบบ <? ของ Apps Script เพียงจุดเดียว (ค่าเริ่มต้นของหน้าเว็บ) ถ้ามีมากกว่านี้ HtmlService จะแสดง SyntaxError
  return txt.indexOf('window.__BOOT__') > -1 && txt.indexOf('</html>') > -1 && txt.split('<' + '?').length === 2;
}

/** ล้างแคชให้ดึงโค้ดล่าสุดทันที (เลือกฟังก์ชันนี้แล้วกด เรียกใช้) */
function tllRefresh() {
  var c = CacheService.getScriptCache();
  ['Code.gs', 'Index.html'].forEach(function (name) { c.remove('tllsrc2_' + name.replace(/\W/g, '_') + '_n'); c.remove('tllsrc3_' + name.replace(/\W/g, '_') + '_n'); });
  Logger.log('โหลดโค้ดล่าสุดแล้ว: ' + (tllFetch_('Code.gs') ? 'Code.gs ✓ ' : 'Code.gs ✗ ') + (tllFetch_('Index.html') ? 'Index.html ✓' : 'Index.html ✗'));
}

(function () {
  var src = tllFetch_('Code.gs');
  if (!src) throw new Error('ยังโหลดโค้ดของเว็บไซต์ไม่สำเร็จ กรุณาลองใหม่อีกครั้งในอีกสักครู่');
  (0, eval)(src);
})();
