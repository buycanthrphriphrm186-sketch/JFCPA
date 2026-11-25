/* =========================================================================
 *  v19: ซิงก์ข้อมูลทั้งหมดจาก Google Sheets ไปยัง Supabase (เพิ่มเท่านั้น · ชีตเดิมคงอยู่ครบ ไม่ถูกลบหรือแก้)
 *  - 1 ชีต = 1 ตาราง คอลัมน์ตรงกับหัวคอลัมน์เดิม (snake_case) + _row (ลำดับแถว) + _synced_at
 *  - ชีตสรุป (สรุปผล, สรุปผู้ใช้งาน) เก็บค่าทุกช่องในตาราง sheet_snapshots
 *  - ทุก 10 นาที: ซิงก์ชีตทั่วไป · วันละครั้ง: ชีตขนาดใหญ่ (Sections, Laws) · ทำต่อจากจุดเดิมได้ถ้าเกินเวลา
 *  ตั้งค่าใน Script Properties: SUPABASE_SERVICE_KEY (คีย์ service_role จาก Supabase › Project Settings › API Keys — ห้ามเผยแพร่)
 *  (ไม่บังคับ) SUPABASE_URL — ค่าเริ่มต้น https://deevvykxfvcadextxfby.supabase.co
 *  เริ่มใช้งาน: Run installSupabaseSync() ครั้งเดียว · ตรวจสถานะ: Run supabaseStatus()
 * ========================================================================= */
CONFIG.VERSION = '19.0.0';
var SB19 = {
  url: 'https://deevvykxfvcadextxfby.supabase.co',
  tables: { Ratings: 'ratings', Chat: 'chat', Members: 'members', Stats: 'stats', Sessions: 'sessions', UserData: 'user_data', Treaties: 'treaties', LoginLog: 'login_log',
    Security: 'security', ErrorLog: 'error_log', AuditLog: 'audit_log', Config: 'config', Announcements: 'announcements', Reports: 'reports', Payments: 'payments', Sources: 'sources',
    Laws: 'laws', Sections: 'sections', Explain: 'explain' },
  big: { Laws: 1, Sections: 1 },
  snaps: ['สรุปผล', 'สรุปผู้ใช้งาน'],
  chunk: 800, budgetMs: 270000
};
function sb19Conf_() {
  var P = PropertiesService.getScriptProperties();
  return { url: (P.getProperty('SUPABASE_URL') || SB19.url).replace(/\/+$/, ''), key: P.getProperty('SUPABASE_SERVICE_KEY') || '' };
}
function sb19Snake_(h) {
  var m = String(h || '').match(/\(([A-Za-z0-9_]+)\)\s*$/), k = m ? m[1] : String(h || '').trim();
  return k.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}
function sb19Req_(method, path, payload, prefer) {
  var c = sb19Conf_();
  if (!c.key) throw new Error('ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_KEY ใน Script Properties');
  var o = { method: method, muteHttpExceptions: true, headers: { apikey: c.key, Authorization: 'Bearer ' + c.key } };
  if (prefer) o.headers.Prefer = prefer;
  if (payload !== undefined) { o.contentType = 'application/json'; o.payload = JSON.stringify(payload); }
  var r = UrlFetchApp.fetch(c.url + '/rest/v1/' + path, o), code = r.getResponseCode();
  if (code >= 300) throw new Error('Supabase ' + code + ': ' + String(r.getContentText()).slice(0, 300));
  return r;
}
/* ซิงก์ 1 ชีต (เริ่มจากแถว from) · คืนค่าแถวถัดไปที่ต้องทำต่อ หรือ 0 เมื่อเสร็จ */
function sb19SyncSheet_(name, from, deadline) {
  var sh = ss_().getSheetByName(name); if (!sh) return 0;
  var table = SB19.tables[name], last = sh.getLastRow(), ncol = sh.getLastColumn ? sh.getLastColumn() : sh.getMaxColumns();
  if (last < 2 || ncol < 1) { sb19Req_('DELETE', table + '?_row=gte.2'); sb19State_(name, 0, 'ว่าง'); return 0; }
  var head = sh.getRange(1, 1, 1, ncol).getDisplayValues()[0].map(sb19Snake_), now = new Date().toISOString();
  var row = Math.max(2, from || 2);
  while (row <= last) {
    if (Date.now() > deadline) return row;
    var n = Math.min(SB19.chunk, last - row + 1), vals = sh.getRange(row, 1, n, ncol).getDisplayValues(), out = [];
    for (var i = 0; i < vals.length; i++) {
      var v = vals[i]; if (!v.some(function (x) { return x !== ''; })) continue;
      var o = { _row: row + i, _synced_at: now };
      for (var j = 0; j < head.length; j++) if (head[j]) o[head[j]] = v[j] === '' ? null : v[j];
      out.push(o);
    }
    if (out.length) sb19Req_('POST', table + '?on_conflict=_row', out, 'resolution=merge-duplicates,return=minimal');
    row += n;
  }
  sb19Req_('DELETE', table + '?_row=gt.' + last);   // แถวที่ถูกลบออกจากชีต → ลบออกจาก Supabase ด้วย
  sb19State_(name, last - 1, 'ซิงก์ครบ');
  return 0;
}
function sb19State_(name, rows, note) {
  try { sb19Req_('POST', 'sync_state?on_conflict=sheet', [{ sheet: name, rows: rows, last_sync: new Date().toISOString(), note: note }], 'resolution=merge-duplicates,return=minimal'); } catch (e) {}
}
function sb19SyncSnaps_() {
  var now = new Date().toISOString();
  SB19.snaps.forEach(function (name) {
    var sh = ss_().getSheetByName(name); if (!sh) return;
    var last = Math.min(sh.getLastRow(), 500), ncol = Math.min(sh.getLastColumn ? sh.getLastColumn() : sh.getMaxColumns(), 40); if (last < 1 || ncol < 1) return;
    var vals = sh.getRange(1, 1, last, ncol).getDisplayValues(), out = [];
    vals.forEach(function (v, i) { if (v.some(function (x) { return x !== ''; })) out.push({ sheet: name, _row: i + 1, cells: v, _synced_at: now }); });
    if (out.length) sb19Req_('POST', 'sheet_snapshots?on_conflict=sheet,_row', out, 'resolution=merge-duplicates,return=minimal');
    sb19Req_('DELETE', 'sheet_snapshots?sheet=eq.' + encodeURIComponent(name) + '&_row=gt.' + last);
    sb19State_(name, out.length, 'ชีตสรุป');
  });
}
/** ซิงก์ทั้งหมด (ตั้งเวลาให้ทำงานทุก 10 นาทีด้วย installSupabaseSync) */
function supabaseSyncAll() {
  var c = sb19Conf_(); if (!c.key) { Logger.log('ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_KEY'); return 'NO_KEY'; }
  var lock = LockService.getScriptLock(); if (!lock.tryLock(5000)) return 'BUSY';
  var P = PropertiesService.getScriptProperties(), deadline = Date.now() + SB19.budgetMs;
  try {
    var pos = {}; try { pos = JSON.parse(P.getProperty('SB19_POS') || '{}'); } catch (e) {}
    var lastBig = Number(P.getProperty('SB19_BIG_AT') || 0), doBig = Date.now() - lastBig > 20 * 3600000 || Object.keys(pos).some(function (k) { return SB19.big[k]; });
    var names = Object.keys(SB19.tables).filter(function (n) { return !SB19.big[n] || doBig; });
    names.sort(function (a, b) { return (SB19.big[a] ? 1 : 0) - (SB19.big[b] ? 1 : 0); });
    for (var i = 0; i < names.length; i++) {
      var nm = names[i];
      if (Date.now() > deadline) break;
      var next = sb19SyncSheet_(nm, pos[nm] || 2, deadline);
      if (next) { pos[nm] = next; break; } else delete pos[nm];
    }
    try { sb19SyncSnaps_(); } catch (e) { logError_('supabase.snaps', e, ''); }
    P.setProperty('SB19_POS', JSON.stringify(pos));
    if (doBig && !Object.keys(pos).some(function (k) { return SB19.big[k]; })) P.setProperty('SB19_BIG_AT', String(Date.now()));
    return Object.keys(pos).length ? 'CONTINUE ' + JSON.stringify(pos) : 'OK';
  } catch (e) { logError_('supabase.sync', e, ''); return 'ERROR ' + e.message; }
  finally { lock.releaseLock(); }
}
/** ติดตั้งการซิงก์อัตโนมัติทุก 10 นาที (Run ครั้งเดียวจากหน้าแก้ไขสคริปต์) */
function installSupabaseSync() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'supabaseSyncAll') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('supabaseSyncAll').timeBased().everyMinutes(10).create();
  PropertiesService.getScriptProperties().deleteProperty('SB19_BIG_AT');
  Logger.log('ติดตั้งการซิงก์ Supabase ทุก 10 นาทีแล้ว · เริ่มซิงก์ครั้งแรก…'); Logger.log(supabaseSyncAll());
}
/** ตรวจสถานะการซิงก์ */
function supabaseStatus() {
  var r = sb19Req_('GET', 'sync_state?select=sheet,rows,last_sync,note&order=sheet'), list = JSON.parse(r.getContentText());
  list.forEach(function (x) { Logger.log(x.sheet + ': ' + x.rows + ' แถว · ' + x.last_sync + ' · ' + (x.note || '')); });
  Logger.log('ค้างอยู่: ' + (PropertiesService.getScriptProperties().getProperty('SB19_POS') || '{}'));
  return list;
}

/* =========================================================================
 *  v19: อธิบายกฎหมายไทย (รายมาตรา) — รัฐธรรมนูญ พ.ร.บ.ประกอบรัฐธรรมนูญ พ.ร.บ./พ.ร.ก. ปร./ปว./คปค./คสช. และประมวลกฎหมาย
 *  - อ่านตัวบทจากฐานข้อมูลของเว็บไซต์เอง (ไม่รับตัวบทจากหน้าเว็บ) แล้วให้ AI เรียบเรียงคำอธิบายตามโครงสร้างที่กำหนด
 *  - เก็บผลไว้ในชีต Explain ครั้งเดียว ทุกคนเปิดได้ทันทีครั้งต่อไป · ผู้ดูแลแก้ไข/ตรวจทานได้ในชีต (คอลัมน์ reviewed)
 * ========================================================================= */
SHEETS.Explain = ['secId', 'lawId', 'sectionNo', 'json', 'model', 'createdAt', 'reviewed', 'reviewer'];
var EXPLAIN_CATS = { 'รัฐธรรมนูญ': 1, 'พระราชบัญญัติประกอบรัฐธรรมนูญ': 1, 'พระราชบัญญัติ/พระราชกำหนด': 1, 'ปร./ปว./คปค./คสช.': 1, 'ประมวลกฎหมาย': 1 };
function explainSheet_() {
  var ss = ss_(), sh = ss.getSheetByName('Explain');
  if (!sh) { sh = ss.insertSheet('Explain'); sh.getRange(1, 1, 1, SHEETS.Explain.length).setValues([SHEETS.Explain]).setFontWeight('bold'); sh.setFrozenRows(1); }
  return sh;
}
function explainFind_(secId) {
  var sh = explainSheet_(), last = sh.getLastRow(); if (last < 2) return null;
  var hit = (sh.getRange(2, 1, last - 1, 1).createTextFinder(secId).matchEntireCell(true).findAll() || [])[0];
  if (!hit) return null;
  var v = sh.getRange(hit.getRow(), 1, 1, SHEETS.Explain.length).getValues()[0], o = json_(v[3], null);
  return o ? { data: o, model: String(v[4] || ''), createdAt: String(v[5] || ''), reviewed: /^(true|ตรวจแล้ว|yes|1)$/i.test(String(v[6] || '')), reviewer: String(v[7] || '') } : null;
}
var EXPLAIN_PROMPT = [
  'คุณเป็นอาจารย์นิติศาสตร์ชาวไทยที่อธิบายกฎหมายให้นักศึกษาเข้าใจง่าย เขียนเป็นภาษาไทยที่เป็นธรรมชาติแบบที่คนอธิบายให้กันฟัง ไม่ใช่สำนวนเครื่อง ไม่ขึ้นต้นด้วยคำเกริ่นหรือคำชม ไม่ใช้อีโมจิ',
  'อธิบายเฉพาะมาตราที่ให้มา โดยยึดตัวบทเป็นหลักทุกตัวอักษร ห้ามแต่งข้อความของตัวบทขึ้นใหม่ ห้ามอ้างเลขคำพิพากษาฎีกาที่ไม่แน่ใจว่ามีอยู่จริง ถ้าไม่แน่ใจให้อธิบายหลักโดยไม่ระบุเลข',
  'ตอบเป็น JSON เท่านั้น ตามโครงสร้าง:',
  '{"summary":"สรุปสาระของมาตรา 2-3 ประโยค",',
  ' "purpose":"วัตถุประสงค์และเหตุผลของบทบัญญัติ (ย่อหน้ายาว)",',
  ' "elements":[{"term":"ถ้อยคำหรือองค์ประกอบจากตัวบท ยกมาตรงตามตัวบท","meaning":"อธิบายความหมายทางกฎหมายและภาษาธรรมดาอย่างละเอียด"}],  // แยกทุกองค์ประกอบ/ถ้อยคำสำคัญในตัวบททีละส่วน ไม่อธิบายรวม',
  ' "explanation":["ย่อหน้าอธิบายเนื้อหาโดยละเอียด เรียงตามวรรคและอนุมาตรา อย่างน้อย 3 ย่อหน้า"],',
  ' "related":[{"ref":"ชื่อกฎหมายและเลขมาตราที่เกี่ยวข้อง","why":"เชื่อมโยงหรือนำมาปรับใช้ร่วมกันอย่างไร"}],',
  ' "differences":"ข้อแตกต่างจากมาตราหรือหลักกฎหมายที่คล้ายกัน พร้อมตัวอย่าง",',
  ' "example":"ตัวอย่างสถานการณ์สมมุติที่ทำให้เห็นการปรับใช้มาตรานี้",',
  ' "quiz":{"scenario":"โจทย์ข้อเท็จจริงแบบตัวละครสมมุติ บรรยายละเอียด (อาจดัดแปลงจากแนวคำพิพากษาศาลฎีกา)","question":"คำถามที่ต้องการให้ผู้อ่านวินิจฉัย","answer":"ธงคำตอบ: วินิจฉัยตามตัวบทพร้อมเหตุผลเป็นขั้นตอน ข้อเท็จจริง–ข้อกฎหมาย–ปรับบท–สรุป"},',
  ' "notes":"ข้อควรระวังหรือประเด็นที่มักเข้าใจผิด"}'
].join('\n');
function apiLawExplain19_(p, ctx) {
  var secId = String(p.secId || '').slice(0, 80), law = secId.split('-')[0];
  if (!secId || !law) return fail_('INVALID', 'ไม่ได้ระบุมาตรา');
  var hit = explainFind_(secId); if (hit) return { secId: secId, explain: hit.data, reviewed: hit.reviewed, createdAt: hit.createdAt, cached: true };
  if (p.peek) return { secId: secId, explain: null };
  var secs = sectionsOfLaw_(law), i = -1;
  for (var k = 0; k < secs.length; k++) if (secs[k].id === secId) { i = k; break; }
  if (i < 0) return fail_('NOT_FOUND', 'ไม่พบมาตรานี้ในฐานข้อมูล');
  var meta = (typeof lawMeta_ === 'function' ? lawMeta_(law) : null) || {}, title = meta.title || String(p.lawTitle || '').slice(0, 300), cat = meta.cat || String(p.cat || '');
  if (cat && !EXPLAIN_CATS[cat]) return fail_('NOT_SUPPORTED', 'คำอธิบายรายมาตรามีสำหรับรัฐธรรมนูญ พ.ร.บ.ประกอบรัฐธรรมนูญ พ.ร.บ./พ.ร.ก. ปร./ปว./คปค./คสช. และประมวลกฎหมาย');
  var key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) return fail_('NOT_CONFIGURED', 'ยังไม่ได้เชื่อมต่อบริการ AI สำหรับสร้างคำอธิบาย (GEMINI_API_KEY)');
  var c = CacheService.getScriptCache(), day = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd'), used = Number(c.get('expl_' + day) || 0);
  if (used >= Number(PropertiesService.getScriptProperties().getProperty('EXPLAIN_DAILY') || 3000)) return fail_('QUOTA', 'วันนี้ระบบสร้างคำอธิบายใหม่ครบจำนวนแล้ว มาตราที่มีคำอธิบายแล้วยังเปิดได้ตามปกติ');
  var lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) return fail_('BUSY', 'ระบบกำลังเตรียมคำอธิบาย กรุณาลองอีกครั้ง');
  try {
    hit = explainFind_(secId); if (hit) return { secId: secId, explain: hit.data, reviewed: hit.reviewed, createdAt: hit.createdAt, cached: true };
    var s = secs[i], near = [secs[i - 1], secs[i + 1]].filter(Boolean).map(function (x) { return 'มาตรา ' + x.no + ': ' + String(x.text || '').slice(0, 1200); }).join('\n\n');
    var body = { systemInstruction: { parts: [{ text: EXPLAIN_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: 'กฎหมาย: ' + title + (cat ? ' (หมวด ' + cat + ')' : '') + '\nมาตรา ' + s.no + (s.name ? ' (' + s.name + ')' : '') + '\nตัวบท:\n' + String(s.text || '') + (near ? '\n\nมาตราข้างเคียง (ใช้ประกอบความเข้าใจเท่านั้น):\n' + near : '') }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.4, maxOutputTokens: 8192 } };
    var out = geminiCall_(getConfig_().GEMINI_MODEL || 'gemini-2.5-flash', key, body);
    if (!out.ok) return fail_('AI_ERROR', out.msg);
    var data = json_(String(out.text).replace(/^```(json)?|```$/g, '').trim(), null);
    if (!data || !data.summary || !data.quiz) return fail_('AI_ERROR', 'ยังสร้างคำอธิบายไม่สมบูรณ์ กรุณาลองอีกครั้ง');
    explainSheet_().appendRow([secId, law, s.no, JSON.stringify(data).slice(0, 49000), getConfig_().GEMINI_MODEL || 'gemini-2.5-flash', new Date().toISOString(), '', '']);
    c.put('expl_' + day, String(used + 1), 90000);
    return { secId: secId, explain: data, reviewed: false, createdAt: new Date().toISOString(), cached: false };
  } finally { lock.releaseLock(); }
}
ROUTES.lawExplain = { fn: apiLawExplain19_, auth: true, limit: 400 };
