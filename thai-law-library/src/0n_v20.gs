/* =========================================================================
 *  v20 (แสดงผลต่อผู้ใช้เป็น “เวอร์ชัน 1.0.0”)
 *  1) คำอธิบายกฎหมายรายมาตรา “ไม่มีหน้าข้อผิดพลาด” — ลำดับการสร้าง:
 *     (ก) Gemini (เมื่อตั้ง GEMINI_API_KEY) → (ข) บริการ AI สาธารณะที่ไม่ต้องใช้คีย์ (ปิดได้ด้วย Config EXPLAIN_FREE_AI = off)
 *     → (ค) คำอธิบายที่เรียบเรียงจากตัวบท บทนิยามในกฎหมายฉบับเดียวกัน มาตราที่อ้างถึง และคำพิพากษาศาลฎีกาที่อ้างมาตรานั้นจริง
 *     ผลจาก (ก)/(ข) บันทึกลงชีต Explain · ผลจาก (ค) เก็บในแคชชั่วคราว เพื่อให้แทนที่ด้วยฉบับ AI ได้ภายหลัง
 *  2) ความยาวคำอธิบายฉบับ AI ประมาณ 50–80 บรรทัดต่อมาตรา
 * ========================================================================= */
CONFIG.VERSION = '20.0.0';
CONFIG.VERSION_LABEL = '1.0.0';

EXPLAIN_PROMPT = EXPLAIN_PROMPT + '\n' + [
  'ความยาว: คำอธิบายทั้งหมดรวมกันต้องยาวประมาณ 50–80 บรรทัด (บรรทัดละประมาณ 70–90 ตัวอักษร) โดย',
  '- "purpose" อย่างน้อย 1 ย่อหน้ายาว',
  '- "elements" แยกทุกถ้อยคำ/องค์ประกอบในตัวบท แต่ละข้ออธิบาย 2–4 ประโยค',
  '- "explanation" อย่างน้อย 6 ย่อหน้า เรียงตามวรรคและอนุมาตรา อธิบายทั้งความหมาย ขอบเขต ผลทางกฎหมาย และข้อยกเว้น',
  '- "related" อย่างน้อย 3 รายการ (ถ้ามี) · "differences" "example" "notes" อย่างละ 1 ย่อหน้า',
  '- โจทย์ "quiz" บรรยายข้อเท็จจริงอย่างน้อย 5 ประโยค และธงคำตอบแยกขั้นตอน ข้อเท็จจริง–ข้อกฎหมาย–ปรับบท–สรุป',
  'ใช้ภาษาทางการที่คนทั่วไปเข้าใจได้ ไม่ใช้สำนวนเครื่อง ไม่ใช้หัวข้อย่อยซ้ำซ้อน ไม่เกริ่นนำ'
].join('\n');

var TH_ORD20 = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า', 'สิบ'];
function thDig20_(s) { return String(s || '').replace(/[๐-๙]/g, function (d) { return String('๐๑๒๓๔๕๖๗๘๙'.indexOf(d)); }); }
function cut20_(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n).replace(/\s\S*$/, '') + '…' : s; }

/* คำพิพากษาศาลฎีกาที่อ้างมาตรา (db/explain/refs.json.gz สร้างจากฐานข้อมูลคำพิพากษาของเว็บไซต์) */
function explainRefs20_(secId) {
  var c = CacheService.getScriptCache(), k = 'exref20_' + secId, hit = c.get(k);
  if (hit) return JSON.parse(hit);
  var out = null;
  try { var all = fetchGzJson_(dbBase_() + 'explain/refs.json.gz'); out = all[thDig20_(secId)] || null; } catch (e) { out = null; }
  try { c.put(k, JSON.stringify(out), 21600); } catch (e) {}
  return out;
}

/* บทนิยาม (“… หมายความว่า …”) ในกฎหมายฉบับเดียวกันที่ถ้อยคำปรากฏในมาตรานี้ */
function explainDefs20_(secs, text) {
  var defs = [];
  secs.slice(0, 12).forEach(function (s) {
    String(s.text || '').split(/\n|(?=\(\s*[0-9๐-๙]{1,3}\s*\))/).forEach(function (ln) {
      var m = ln.match(/^\s*(?:\(\s*[0-9๐-๙]{1,3}\s*\)\s*)?[“"]?([^\s“”"()]{2,40})[”"]?\s+หมายความว่า\s+(.+)$/);
      if (m && text.indexOf(m[1]) > -1 && !defs.some(function (d) { return d.term === m[1]; })) defs.push({ term: m[1], meaning: 'บทนิยามตามมาตรา ' + s.no + ': “' + m[1] + '” หมายความว่า ' + cut20_(m[2], 420) });
    });
  });
  return defs.slice(0, 8);
}

/* คำอธิบายที่เรียบเรียงจากข้อมูลจริงทั้งหมด (ไม่ใช้ AI และไม่แต่งข้อเท็จจริง) */
function explainRule20_(title, cat, secs, i) {
  var s = secs[i], text = String(s.text || '').trim(), no = s.no;
  var raw = text.replace(/(\S)[ \t ]+\(\s*([0-9๐-๙]{1,3}|[ก-ฮ])\s*\)[ \t ]+/g, function (m, prev, k) { return /[0-9๐-๙]/.test(prev) ? m : prev + '\n(' + k + ') '; });
  var lines = raw.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
  var paras = [], items = [];
  lines.forEach(function (ln) { if (/^\(\s*([0-9๐-๙]{1,3}|[ก-ฮ])\s*\)/.test(ln)) items.push(ln); else paras.push(ln); });
  var name = title + ' มาตรา ' + no;
  var first = cut20_(paras[0] || lines[0] || '', 260);
  var kinds = function (t) {
    var k = [];
    if (/หมายความว่า/.test(t)) k.push('เป็นบทนิยามที่กำหนดความหมายของถ้อยคำเพื่อใช้ตีความบทบัญญัติอื่นในกฎหมายฉบับนี้');
    if (/ต้องระวางโทษ|ต้องโทษ/.test(t)) k.push('เป็นบทกำหนดความผิดและโทษ ผู้ใดกระทำครบองค์ประกอบที่บัญญัติไว้ย่อมต้องรับโทษตามอัตราที่กำหนด');
    if (/มีสิทธิ|ย่อมมีสิทธิ|ได้รับความคุ้มครอง/.test(t)) k.push('เป็นบทรับรองสิทธิ ผู้ทรงสิทธิอาจยกบทบัญญัตินี้ขึ้นอ้างเพื่อใช้สิทธิหรือขอความคุ้มครองได้');
    if (/มีหน้าที่|ต้อง(?!ระวาง)/.test(t)) k.push('เป็นบทกำหนดหน้าที่ บุคคลหรือองค์กรที่ระบุไว้ต้องปฏิบัติตามเงื่อนไขที่กำหนด');
    if (/ห้าม|มิให้|ไม่ได้/.test(t)) k.push('เป็นบทห้ามหรือบทจำกัด กำหนดสิ่งที่ไม่อาจกระทำได้หรือผลที่ไม่อาจเกิดขึ้นได้');
    if (/เว้นแต่|ทั้งนี้\s*เว้นแต่|แต่ถ้า|แต่ทั้งนี้/.test(t)) k.push('มีข้อยกเว้นหรือเงื่อนไขกำกับ ซึ่งต้องพิจารณาประกอบทุกครั้งก่อนปรับใช้หลักทั่วไป');
    if (/โดยอนุโลม/.test(t)) k.push('เป็นบทอนุโลม ให้นำบทบัญญัติอื่นมาใช้บังคับเท่าที่ไม่ขัดหรือแย้งกับลักษณะของเรื่อง');
    if (/ให้ถือว่า|ให้สันนิษฐาน/.test(t)) k.push('เป็นบทข้อสันนิษฐานหรือบทกำหนดให้ถือว่า ซึ่งมีผลต่อภาระการพิสูจน์ของคู่ความ');
    if (/ให้[ก-๙]/.test(t) && !k.length) k.push('เป็นบทบัญญัติที่กำหนดหลักเกณฑ์หรือผลทางกฎหมายให้เกิดขึ้นเมื่อมีข้อเท็จจริงตามที่บัญญัติไว้');
    return k;
  };
  var elements = [];
  var subj = text.match(/^(ผู้ใด|บุคคลใด|บุคคล|ผู้[ก-๙]{2,30}|ชนชาวไทย|พระมหากษัตริย์|คณะรัฐมนตรี|รัฐ|ศาล|ลูกหนี้|เจ้าหนี้|นายจ้าง|ลูกจ้าง)/);
  if (subj) elements.push({ term: subj[1], meaning: 'บุคคลหรือองค์กรที่บทบัญญัตินี้ใช้บังคับ ต้องพิจารณาก่อนว่าผู้เกี่ยวข้องในข้อเท็จจริงเป็น “' + subj[1] + '” ตามความหมายของมาตรานี้หรือไม่' });
  if (subj) { var act = text.slice(subj[1].length).match(/^\s*([^\n]{6,320}?)(?=\s*(?:ผู้นั้น|ต้องระวางโทษ|ต้องโทษ|ให้ถือว่า|ย่อม)|\n|$)/); if (act && act[1].length > 5) elements.push({ term: cut20_(act[1], 220), meaning: 'การกระทำหรือข้อเท็จจริงที่เป็นองค์ประกอบหลักของมาตรานี้ ต้องพิสูจน์ให้ได้ครบทุกถ้อยคำ หากขาดถ้อยคำใดไป ผลตามมาตรานี้ย่อมไม่เกิดขึ้น' }); }
  var cond = text.match(/((?:ถ้า|หาก|ในกรณีที่|ในกรณี|เมื่อ)[^\n]{6,220}?)(?=\s(?:ให้|ต้อง|ย่อม|ผู้นั้น)|$)/);
  if (cond) elements.push({ term: cut20_(cond[1], 160), meaning: 'เงื่อนไขหรือข้อเท็จจริงที่ต้องเกิดขึ้นก่อน ผลทางกฎหมายตามมาตรานี้จึงจะเกิดขึ้น หากข้อเท็จจริงไม่ครบตามเงื่อนไขนี้ จะนำมาตรานี้มาปรับใช้ไม่ได้' });
  var pen = text.match(/(ต้องระวางโทษ[^\n]{4,260}?)(?:\n|$|(?=\s(?:ถ้า|เว้นแต่)))/);
  if (pen) elements.push({ term: cut20_(pen[1], 200), meaning: 'อัตราโทษที่กฎหมายกำหนด ศาลจะกำหนดโทษภายในอัตรานี้ตามพฤติการณ์แห่งคดี โดยพิจารณาประกอบกับบทบัญญัติว่าด้วยการเพิ่มโทษ ลดโทษ และการรอการกำหนดโทษหรือรอการลงโทษ' });
  var exc = text.match(/((?:เว้นแต่|แต่ถ้า)[^\n]{4,240})/);
  if (exc) elements.push({ term: cut20_(exc[1], 200), meaning: 'ข้อยกเว้นของหลักทั่วไปในมาตรานี้ ผู้ที่อ้างข้อยกเว้นมักมีภาระต้องแสดงข้อเท็จจริงให้เข้าข้อยกเว้นดังกล่าว' });
  items.forEach(function (ln) { var m = ln.match(/^\(\s*([0-9๐-๙]{1,3}|[ก-ฮ])\s*\)\s*(.*)$/); if (m) elements.push({ term: 'อนุมาตรา (' + thDig20_(m[1]) + ') ' + cut20_(m[2], 140), meaning: 'เป็นกรณีหนึ่งที่มาตรานี้แยกไว้โดยเฉพาะ ต้องพิจารณาว่าข้อเท็จจริงตรงกับอนุมาตรานี้หรือไม่ และอนุมาตรานี้ใช้ร่วมกับข้อความนำของมาตรา' }); });
  explainDefs20_(secs, text).forEach(function (d) { elements.push(d); });

  var exp = [];
  exp.push(name + (s.name ? ' อยู่ในส่วนที่ว่าด้วย “' + s.name + '”' : '') + (paras.length > 1 || items.length ? ' ประกอบด้วย ' + (paras.length || 1) + ' วรรค' + (items.length ? ' และ ' + items.length + ' อนุมาตรา' : '') + ' การอ่านมาตรานี้ควรแยกพิจารณาทีละส่วน เพราะแต่ละส่วนอาจมีหน้าที่ต่างกัน เช่น ส่วนแรกวางหลักทั่วไป ส่วนถัดไปกำหนดข้อยกเว้น เงื่อนไขเพิ่มเติม หรือผลทางกฎหมายในกรณีเฉพาะ' : ' มีเพียงวรรคเดียว หลักทั้งหมดของมาตราจึงอยู่ในข้อความเดียวกัน ต้องอ่านถ้อยคำทุกคำให้ครบก่อนสรุปความหมาย'));
  paras.forEach(function (p, k) {
    var kk = kinds(p);
    exp.push((paras.length > 1 ? 'วรรค' + (TH_ORD20[k + 1] || (k + 1)) + 'บัญญัติว่า' : 'ตัวบทของมาตรานี้บัญญัติว่า') + ' “' + cut20_(p, 900) + '”' + (kk.length ? ' ข้อความส่วนนี้' + kk.join(' และ') : ''));
  });
  if (items.length) exp.push('อนุมาตราทั้ง ' + items.length + ' อนุมาตรา เป็นการแจกแจงกรณีต่าง ๆ ภายใต้ข้อความนำของมาตรา การปรับใช้ต้องอ่านข้อความนำประกอบกับอนุมาตราที่ตรงกับข้อเท็จจริงเสมอ ไม่อาจอ่านอนุมาตราใดแยกออกมาโดยลำพัง');
  var refs = [], seen = {};
  (text.match(/มาตรา\s*[0-9๐-๙]+(?:\s*(?:ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|นว|ทศ))?/g) || []).forEach(function (m) {
    var n = thDig20_(m.replace(/^มาตรา\s*/, '')).replace(/\s+/g, ' ').trim(); if (n === thDig20_(no) || seen[n]) return; seen[n] = 1;
    var t = secs.filter(function (x) { return thDig20_(x.no) === n; })[0];
    refs.push({ ref: title + ' มาตรา ' + n, why: t ? 'มาตรานี้อ้างถึงโดยตรง ตัวบทมาตรา ' + n + ' บัญญัติว่า “' + cut20_(t.text, 240) + '”' : 'มาตรานี้อ้างถึงโดยตรง ต้องอ่านประกอบกัน' });
  });
  if (refs.length) exp.push('มาตรานี้อ้างถึง ' + refs.map(function (r) { return r.ref.replace(title + ' ', ''); }).join(', ') + ' จึงต้องอ่านบทบัญญัติดังกล่าวประกอบกัน ความหมายและขอบเขตของมาตรานี้จะครบถ้วนก็ต่อเมื่อพิจารณาบทที่ถูกอ้างถึงด้วย');
  var prev = secs[i - 1], next = secs[i + 1];
  if (prev) refs.push({ ref: title + ' มาตรา ' + prev.no, why: 'มาตราก่อนหน้า ซึ่งอยู่ในบริบทเดียวกัน: “' + cut20_(prev.text, 200) + '”' });
  if (next) refs.push({ ref: title + ' มาตรา ' + next.no, why: 'มาตราถัดไป ซึ่งอยู่ในบริบทเดียวกัน: “' + cut20_(next.text, 200) + '”' });
  var dk = explainRefs20_(s.id);
  if (dk && dk[0]) {
    exp.push('ในฐานข้อมูลคำพิพากษาของเว็บไซต์ มีคำพิพากษาและคำสั่งศาลฎีกาที่อ้างมาตรานี้ ' + dk[0].toLocaleString('en-US') + ' ฉบับ ฉบับล่าสุด ได้แก่ ' + dk[1].slice(0, 6).map(function (x) { return 'คำพิพากษาศาลฎีกาที่ ' + x[0]; }).join(', ') + ' ผู้ศึกษาควรอ่านคำพิพากษาเหล่านี้เพื่อเห็นแนวการตีความและการปรับใช้มาตรานี้กับข้อเท็จจริงจริง');
    dk[1].slice(0, 8).forEach(function (x) { refs.push({ ref: 'คำพิพากษาศาลฎีกาที่ ' + x[0], why: 'ศาลฎีกาอ้างมาตรานี้ในการวินิจฉัย (ค้นอ่านฉบับเต็มได้ในหมวดคำพิพากษา)' }); });
  }
  var conse = (pen && pen[1]) || ((text.match(/((?:ให้|ย่อม|ต้อง)[^\n]{8,240})/) || [])[1]) || '';
  var quiz = conse ? {
    scenario: 'ข้อเท็จจริงสมมุติ: นาย ก. มีกรณีที่อาจต้องปรับใช้' + name + ' โดยข้อเท็จจริงฟังได้ว่าครบตามที่บทบัญญัตินี้กำหนดไว้ทุกประการ' + (cond ? ' กล่าวคือ ' + cut20_(cond[1], 200) : '') + (exc ? ' และไม่ปรากฏข้อเท็จจริงที่เข้าข้อยกเว้น' : ''),
    question: 'ผลทางกฎหมายต่อกรณีของนาย ก. ตาม' + name + ' เป็นอย่างไร',
    answer: 'ธงคำตอบ: ข้อเท็จจริงครบตามองค์ประกอบของ' + name + ' เมื่อปรับบทแล้ว ผลทางกฎหมายเป็นไปตามที่บัญญัติไว้ว่า “' + cut20_(conse, 320) + '”' + (exc ? ' ทั้งนี้ หากมีข้อเท็จจริงเข้าข้อยกเว้นที่บัญญัติว่า “' + cut20_(exc[1], 200) + '” ผลจะเปลี่ยนไปตามข้อยกเว้นนั้น' : '')
  } : null;
  return {
    summary: name + ' บัญญัติว่า “' + first + '”',
    purpose: (kinds(text)[0] ? 'โดยลักษณะของบทบัญญัติ มาตรานี้' + kinds(text).join(' และ') + ' ' : '') + 'การทำความเข้าใจควรเริ่มจากถ้อยคำในตัวบท แล้วพิจารณาบทนิยาม มาตราที่ถูกอ้างถึง และแนวคำพิพากษาศาลฎีกาที่เกี่ยวข้องตามลำดับ',
    elements: elements,
    explanation: exp,
    related: refs.slice(0, 14),
    differences: '',
    example: '',
    quiz: quiz,
    notes: 'คำอธิบายฉบับนี้เรียบเรียงจากตัวบท บทนิยามในกฎหมายฉบับเดียวกัน และฐานข้อมูลคำพิพากษาศาลฎีกาของเว็บไซต์โดยตรง ไม่มีการแต่งข้อเท็จจริงหรือเลขคำพิพากษาเพิ่มเติม การนำไปใช้ในคดีจริงควรตรวจสอบตัวบทฉบับปัจจุบันและคำพิพากษาฉบับเต็มทุกครั้ง',
    source: 'rule'
  };
}

/* บริการ AI สาธารณะที่ไม่ต้องใช้คีย์ (สำรอง) */
function explainFreeAi20_(sys, user) {
  if (String(getConfig_().EXPLAIN_FREE_AI || 'on') === 'off') return null;
  if (breakerOpen_('freeai')) return null;
  try {
    var r = UrlFetchApp.fetch('https://text.pollinations.ai/openai', { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      payload: JSON.stringify({ model: 'openai', messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], temperature: 0.4, private: true, referrer: 'thailawlibrary' }) });
    if (r.getResponseCode() !== 200) { breakerFail_('freeai'); return null; }
    var j = json_(r.getContentText(), {}), t = (((j.choices || [])[0] || {}).message || {}).content || '';
    var a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a < 0 || b <= a) return null;
    var d = json_(t.slice(a, b + 1), null);
    if (!d || !d.summary || !d.quiz) return null;
    breakerOk_('freeai'); return d;
  } catch (e) { breakerFail_('freeai'); return null; }
}

function apiLawExplain20_(p, ctx) {
  var secId = String(p.secId || '').slice(0, 80), law = secId.split('-')[0];
  if (!secId || !law) return fail_('INVALID', 'ไม่ได้ระบุมาตรา');
  var hit = explainFind_(secId); if (hit) return { secId: secId, explain: hit.data, reviewed: hit.reviewed, createdAt: hit.createdAt, cached: true };
  if (p.peek) return { secId: secId, explain: null };
  var key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (key && !p.noAi) {
    var r = apiLawExplain19_(p, ctx);
    if (r && r.ok !== false) return r;
    if (r && (r.code === 'NOT_FOUND' || r.code === 'NOT_SUPPORTED' || r.code === 'INVALID')) return r;
  }
  var src = explainSecs19_(law), secs = src.secs, i = -1;
  for (var k = 0; k < secs.length; k++) if (secs[k].id === secId) { i = k; break; }
  if (i < 0) return fail_('NOT_FOUND', 'ไม่พบมาตรานี้ในฐานข้อมูล');
  var title = src.title || String(p.lawTitle || '').slice(0, 300), cat = src.cat || String(p.cat || '');
  if (cat && !EXPLAIN_CATS[cat]) return fail_('NOT_SUPPORTED', 'คำอธิบายรายมาตรามีสำหรับรัฐธรรมนูญ พ.ร.บ.ประกอบรัฐธรรมนูญ พ.ร.บ./พ.ร.ก. ปร./ปว./คปค./คสช. และประมวลกฎหมาย');
  var c = CacheService.getScriptCache(), ck = 'exrule20_' + secId, ch = c.get(ck);
  if (!p.noAi) {
    var s = secs[i], near = [secs[i - 1], secs[i + 1]].filter(Boolean).map(function (x) { return 'มาตรา ' + x.no + ': ' + String(x.text || '').slice(0, 1200); }).join('\n\n');
    var d = explainFreeAi20_(EXPLAIN_PROMPT, 'กฎหมาย: ' + title + (cat ? ' (หมวด ' + cat + ')' : '') + '\nมาตรา ' + s.no + (s.name ? ' (' + s.name + ')' : '') + '\nตัวบท:\n' + String(s.text || '') + (near ? '\n\nมาตราข้างเคียง (ใช้ประกอบความเข้าใจเท่านั้น):\n' + near : ''));
    if (d) {
      var lock = LockService.getScriptLock();
      if (lock.tryLock(15000)) { try { if (!explainFind_(secId)) explainSheet_().appendRow([secId, law, s.no, JSON.stringify(d).slice(0, 49000), 'free-ai', new Date().toISOString(), '', '']); } finally { lock.releaseLock(); } }
      return { secId: secId, explain: d, reviewed: false, createdAt: new Date().toISOString(), cached: false };
    }
  }
  if (ch) return { secId: secId, explain: JSON.parse(ch), reviewed: false, createdAt: '', cached: true };
  var data = explainRule20_(title, cat, secs, i);
  try { var js = JSON.stringify(data); if (js.length < 95000) c.put(ck, js, 21600); } catch (e) {}
  return { secId: secId, explain: data, reviewed: false, createdAt: new Date().toISOString(), cached: false };
}
ROUTES.lawExplain = { fn: apiLawExplain20_, auth: true, limit: 400 };

/* คำพิพากษา: เพิ่มคู่ความ หมายเลขคดีดำ และหมายเลขคดีของศาลชั้นต้น/ศาลอุทธรณ์ จากชุดข้อมูลต้นทาง */
function pyList20_(s) {
  if (!s) return [];
  if (Object.prototype.toString.call(s) === '[object Array]') return s;
  var t = String(s).trim(); if (!t || t === '[]') return [];
  try { return JSON.parse(t.replace(/'/g, '"')); } catch (e) {}
  return (t.match(/'([^']*)'/g) || []).map(function (x) { return x.slice(1, -1); });
}
function apiDekaGet20_(p) {
  var docid = String(p.docid || '').replace(/\D/g, ''), off = Math.max(0, Math.floor(Number(p.o) || 0));
  if (!docid) return fail_('INVALID', 'ไม่ได้ระบุคำพิพากษา');
  var key = 'dk20_' + docid, hit = cacheGetBig_(key);
  if (hit) return hit;
  var r;
  try { r = hfRows_('korakot/deka-bulk', 'default', off, 1)[0]; } catch (e) { return fail_('UPSTREAM', 'แหล่งข้อมูลคำพิพากษาตอบสนองช้าชั่วคราว กรุณาลองอีกครั้ง'); }
  if (!r || String(r.docid) !== docid) return fail_('MISMATCH', 'แหล่งข้อมูลปรับปรุงรายการแล้ว กรุณาโหลดหน้าใหม่');
  var laws = pyList20_(r.laws), lit = pyList20_(r.litigants);
  var out = { docid: docid, label: r.label, caseNo: r.case_no, year: r.year, type: r.doc_type, shortText: r.short_text || '', longText: r.long_text || '',
    laws: laws.map(function (x) { return ((x.law_abbr || x.law_name || '') + ' ' + (x.display || (x.section ? 'ม. ' + x.section : ''))).trim(); }),
    lawRefs: laws.map(function (x) { return { abbr: x.law_abbr || '', name: x.law_name || '', sec: String(x.section || ''), display: x.display || '' }; }),
    litigants: lit.map(function (x) { return typeof x === 'string' ? { role: '', name: x } : { role: x.role || '', name: x.name || '' }; }).filter(function (x) { return x.name; }),
    judges: pyList20_(r.judges).join(' - '), judgeList: pyList20_(r.judges),
    lowerCourts: pyList20_(r.lower_courts).join(' · '), lowerCourtNos: pyList20_(r.lower_court_nos).join(' · '), blackNo: pyList20_(r.black_no).join(' · '),
    source: r.source || '', department: r.department || '', remark: r.remark || '' };
  cachePutBig_(key, out, 21600);
  return out;
}
ROUTES.dekaGet = Object.assign({}, ROUTES.dekaGet || {}, { fn: apiDekaGet20_ });

/* แนะนำตัวผู้สร้างเว็บไซต์: อ่านค่าล่าสุดจากชีต Config (แคช 10 วินาที) เพื่อให้หน้าเว็บตอบสนองการเปิด/ปิด/แก้ไขจากระบบหลังบ้านทันที
 * ซ่อนเมื่อ on/publish/visible = false, hidden = true, status = draft/hidden/off/maintenance หรือ SECTION_MAINT.creator เปิดปรับปรุงอยู่ */
function creatorRaw20_() {
  var c = CacheService.getScriptCache(), hit = c.get('cr20raw');
  if (hit !== null && hit !== undefined) return hit;
  var raw = '', sec = '';
  try { rows_('Config').forEach(function (r) { if (r.key === 'CREATOR_PROFILE') raw = String(r.value || ''); if (r.key === 'SECTION_MAINT') sec = String(r.value || ''); }); } catch (e) { raw = String(getConfig_().CREATOR_PROFILE || ''); }
  var maint = false;
  try { var sm = JSON.parse(sec || '{}'), m = sm.creator || sm.creatorProfile || sm.intro; if (m && m.on) { var n = Date.now(), st = m.start ? Date.parse(m.start) : 0, en = m.end ? Date.parse(m.end) : 0; maint = (!st || st <= n) && (!en || en > n); } } catch (e) {}
  var out = JSON.stringify({ raw: raw, maint: maint });
  try { if (out.length < 95000) c.put('cr20raw', out, 10); } catch (e) {}
  return out;
}
function creatorProfile20_() {
  var x = JSON.parse(creatorRaw20_()), o = null;
  try { o = JSON.parse(x.raw || ''); } catch (e) { o = null; }
  var save = getConfig_; 
  getConfig_ = function () { var cfg = save(); var c2 = {}; for (var k in cfg) c2[k] = cfg[k]; c2.CREATOR_PROFILE = x.raw; return c2; };
  var p; try { p = creatorProfile18_(); } finally { getConfig_ = save; }
  var hide = x.maint || !o || o.publish === false || o.visible === false || o.hidden === true || /^(draft|hidden|off|maintenance|maint|closed)$/i.test(String(o.status || ''));
  if (hide) p = { on: false, updatedAt: (o && o.updatedAt) || '' };
  if (p.photo && /drive\.google\.com/.test(p.photo)) { var id = (p.photo.match(/[-\w]{25,}/) || [])[0]; if (id) p.photo = 'https://lh3.googleusercontent.com/d/' + id + '=w640'; }
  return p;
}
ROUTES.creatorProfile = { fn: function () { return { profile: creatorProfile20_() }; }, limit: 600 };
var liveModesV19_ = liveModes_;
liveModes_ = function (cfg) {
  var o = liveModesV19_(cfg);
  try { var x = JSON.parse(creatorRaw20_()); o.creatorSig = String(x.raw.length) + '|' + (x.maint ? 'm' : '') + '|' + (x.raw.match(/"updatedAt"\s*:\s*"([^"]*)"/) || [])[1] + '|' + (x.raw.match(/"on"\s*:\s*(true|false)/) || [])[1]; } catch (e) {}
  return o;
};

/* เข้าสู่ระบบด้วย Google (เฉพาะหน้าเข้าสู่ระบบ):
 * - จับคู่บัญชีด้วยอีเมลที่ Google ยืนยันแล้ว (email_verified) กับอีเมลที่สมาชิกกรอกไว้ตอนสมัคร แล้วผูกบัญชีให้อัตโนมัติ
 * - ถ้ายังไม่มีสมาชิกที่ใช้อีเมลนี้ → แจ้งให้สมัครสมาชิกก่อน (ไม่สร้างบัญชีใหม่จาก Google)
 * - ตั้งค่า: Script Properties › GOOGLE_CLIENT_ID และ GOOGLE_CLIENT_SECRET · Redirect URI = URL ของ Web app (ลงท้าย /exec) */
var oauthCallbackV19_ = oauthCallback_;
oauthCallback_ = function (code, state, appleUser) {
  var st = json_(CacheService.getScriptCache().get('oauth_' + state), null);
  if (!st || st.provider !== 'google' || st.mode === 'link') return oauthCallbackV19_(code, state, appleUser);
  var cache = CacheService.getScriptCache(); cache.remove('oauth_' + state);
  var props = PropertiesService.getScriptProperties(), cid = props.getProperty('GOOGLE_CLIENT_ID');
  var res = UrlFetchApp.fetch(OAUTH.google.token, { method: 'post', muteHttpExceptions: true,
    payload: { code: code, client_id: cid, client_secret: props.getProperty('GOOGLE_CLIENT_SECRET'), redirect_uri: safeUrl_(), grant_type: 'authorization_code' } });
  var tok = json_(res.getContentText(), {});
  if (res.getResponseCode() >= 400 || !tok.id_token) { logError_('oauth:google20', new Error(res.getContentText().slice(0, 300)), ''); return { ok: false, msg: 'ไม่สามารถยืนยันตัวตนกับ Google ได้ กรุณาลองใหม่อีกครั้ง หรือเข้าสู่ระบบด้วยชื่อผู้ใช้งานและรหัสผ่าน' }; }
  var cl = decodeJwtPayload_(tok.id_token);
  if (cl.aud !== cid || !/accounts\.google\.com$/.test(String(cl.iss || ''))) return { ok: false, msg: 'ข้อมูลยืนยันตัวตนจาก Google ไม่ถูกต้อง' };
  var email = String(cl.email || '').toLowerCase().trim();
  if (!email || !(cl.email_verified === true || cl.email_verified === 'true')) return { ok: false, msg: 'บัญชี Google นี้ยังไม่ได้ยืนยันอีเมล กรุณาใช้บัญชีอื่น' };
  var found = null;
  rows_('Members').some(function (m) {
    var s = json_(m.socialJson, {});
    if ((s.google && s.google.sub === cl.sub) || String(m.email || '').toLowerCase().trim() === email) { found = m; return true; }
    return false;
  });
  if (!found) return { ok: false, notRegistered: true, provider: 'Google', email: email, name: cl.name || '' };
  var soc = json_(found.socialJson, {});
  if (!soc.google || soc.google.sub !== cl.sub) { soc.google = { sub: cl.sub, email: email, name: cl.name || '', linkedAt: new Date().toISOString() }; updateRow_('Members', found._row, { socialJson: JSON.stringify(soc) }); audit_(found.memberId, 'social.link', 'google (อีเมลตรงกับที่สมัคร)'); }
  var ticket = randomToken_(40);
  cache.put('ticket_' + ticket, JSON.stringify({ provider: 'Google', sub: cl.sub, name: cl.name || '', memberId: found.memberId, email: email }), 900);
  return { ok: true, provider: 'Google', ticket: ticket, linked: true, username: found.username, name: cl.name || '', email: email };
};

/* กฎหมายต่างประเทศ: เมื่อแหล่งข้อมูลหลัก (Hugging Face) อ่านไฟล์ไม่ได้ ให้ใช้ต้นฉบับจากเว็บไซต์ทางการของประเทศนั้นแทน
 * - ไฟล์ PDF → ส่ง pdfUrl ให้หน้าเว็บแสดงไฟล์ต้นฉบับพร้อมปุ่มขยาย
 * - หน้าเว็บ (HTML) → ดึงข้อความจากหน้าเว็บทางการ แล้วแบ่งเป็นมาตราตามรูปแบบของภาษานั้น
 * แผนที่ลิงก์ต้นฉบับ: db/world/src/CC.json.gz (สร้างด้วย tools/build-world-src.py) */
function worldSrcUrl20_(cc, id) {
  var c = CacheService.getScriptCache(), k = 'wsrc20_' + cc + '_' + sha256Hex_(id).slice(0, 20), hit = c.get(k);
  if (hit !== null && hit !== undefined) return hit;
  var u = '';
  try { var m = fetchGzJson_(dbBase_() + 'world/src/' + cc + '.json.gz'); u = String(m[id] || ''); } catch (e) { u = ''; }
  try { c.put(k, u, 21600); } catch (e) {}
  return u;
}
function htmlToText20_(h) {
  h = String(h || '').replace(/<(script|style|noscript|nav|header|footer)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|tr|h[1-6]|table|section|article)>/gi, '\n').replace(/<[^>]+>/g, ' ');
  h = h.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(Number(n)); });
  return h.replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
var apiForeignLawV19_ = ROUTES.foreignLaw.fn;
function apiForeignLawV20_(p, ctx) {
  var r = apiForeignLawV19_(p, ctx);
  if (!r || r.ok !== false || !/^(UPSTREAM|MISMATCH|NOT_FOUND)$/.test(String(r.code))) return r;
  var cc = String(p.country || ''), id = String(p.id || '').slice(0, 200);
  if (!/^[A-Z]{2}$/.test(cc) || !id) return r;
  var url = worldSrcUrl20_(cc, id);
  if (!url) return r;
  var key = 'fl20_' + cc + '_' + sha256Hex_(id).slice(0, 24), hit = cacheGetBig_(key);
  if (hit) return hit;
  var host = url.replace(/^https?:\/\/([^\/:]+).*$/, '$1'), title = String(p.title || '').slice(0, 400), out = null;
  var base = { country: cc, id: id, title: title, updated: p.date || '', repealed: !!p.repealed, heads: [], source: 'ต้นฉบับจากเว็บไซต์ทางการ ' + host, sourceUrl: url };
  if (/\.pdf($|[?#])/i.test(url)) {
    out = Object.assign(base, { pdfUrl: url, articles: [{ no: '', cap: '', head: '', paras: [{ n: '', s: 'ตัวบทฉบับนี้เผยแพร่เป็นไฟล์ PDF โดยหน่วยงานทางการของประเทศ ระบบแสดงไฟล์ต้นฉบับไว้ด้านล่าง (กดขยายเพื่ออ่านเต็มจอ)', items: [] }] }] });
  } else {
    try {
      var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ThaiLawLibrary/1.0)' } });
      if (res.getResponseCode() < 400) {
        var txt = htmlToText20_(res.getContentText());
        if (txt.length > 300) {
          var arts = splitArticles_(txt, (FGN_V5[cc] && FGN_V5[cc].art) || GENERIC_ART);
          if (arts.length) out = cleanArticles_(Object.assign(base, { heads: headsOf_(arts), articles: arts }));
        }
      }
    } catch (e) { logError_('foreign.v20src', e, cc + ':' + id); }
    if (!out) out = Object.assign(base, { linkOnly: true, articles: [{ no: '', cap: '', head: '', paras: [{ n: '', s: 'ขณะนี้ยังดึงข้อความจากเว็บไซต์ทางการไม่ได้ กดปุ่ม “เปิดต้นฉบับจากเว็บไซต์ทางการ” ด้านล่างเพื่ออ่านตัวบทฉบับเต็ม', items: [] }] }] });
  }
  if (!out.linkOnly) cachePutBig_(key, out, 21600);
  return out;
}
ROUTES.foreignLaw.fn = apiForeignLawV20_;
