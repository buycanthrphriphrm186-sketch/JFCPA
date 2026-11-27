/* =========================================================================
 *  v21 (แสดงผลเป็นเวอร์ชัน 1.0.0)
 *  - ทำงานผ่านไฟล์โหลดระบบ (Loader.gs) ได้: หน้าเว็บใช้ Index.html เวอร์ชันล่าสุดจาก GitHub
 *  - คำอธิบายกฎหมายรายมาตรา: แนบคำพิพากษาศาลฎีกาที่อ้างมาตรานั้นจริง (ย่อสั้นตามต้นฉบับ ไม่ย่อเอง)
 *    และโจทย์แบบข้อสอบจากข้อเท็จจริงในคำพิพากษาจริง พร้อมธงคำตอบ 3 ส่วน: หลักกฎหมาย · วินิจฉัย · สรุป
 * ========================================================================= */
CONFIG.VERSION = '21.0.0';
CONFIG.VERSION_LABEL = '1.0.0';

EXPLAIN_PROMPT = EXPLAIN_PROMPT + '\n' + [
  'โจทย์ "quiz" ต้องเป็นโจทย์แบบข้อสอบกฎหมาย บรรยายข้อเท็จจริงครบถ้วน (ตัวละครสมมุติ) แล้วถามให้วินิจฉัย',
  'ธงคำตอบให้ตอบเป็นวัตถุ "answer":{"principle":"หลักกฎหมาย (อ้างตัวบท)","analysis":"วินิจฉัย ปรับข้อเท็จจริงเข้ากับตัวบททีละองค์ประกอบ","conclusion":"สรุป"}',
  'คำอธิบาย ข้อแตกต่าง ตัวอย่าง และโจทย์ ต้องเฉพาะเจาะจงกับถ้อยคำของมาตรานี้เท่านั้น ห้ามใช้ข้อความกลาง ๆ ที่ใช้ได้กับทุกมาตรา ใช้ภาษากฎหมายที่ใช้ในแวดวงนักกฎหมาย'
].join('\n');

/* คำพิพากษาศาลฎีกาที่อ้างมาตรา: ดึงย่อสั้นและข้อเท็จจริงตามต้นฉบับ (ชุดข้อมูล korakot/deka-bulk จาก deka.supremecourt.or.th) */
function explainCases21_(secId, limit) {
  var key = 'excase21_' + secId, hit = cacheGetBig_(key);
  if (hit) return hit;
  var refs = explainRefs20_(secId), out = { n: refs ? refs[0] : 0, items: [] };
  if (refs && refs[1]) {
    refs[1].slice(0, limit || 3).forEach(function (x) {
      try {
        var r = hfRows_('korakot/deka-bulk', 'default', Number(x[2]), 1)[0];
        if (!r) return;
        var long = String(r.long_text || ''), cut = long.search(/\n?\s*ศาลชั้นต้น/);
        out.items.push({ no: x[0], year: x[1], row: x[2], docid: String(r.docid || ''), label: r.label || ('คำพิพากษาศาลฎีกาที่ ' + x[0]),
          short: String(r.short_text || '').trim().slice(0, 3000), facts: (cut > 80 ? long.slice(0, cut) : long.slice(0, 1200)).trim().slice(0, 1600) });
      } catch (e) {}
    });
  }
  try { cachePutBig_(key, out, 21600); } catch (e) {}
  return out;
}

function explainExam21_(title, s, cases) {
  var c = (cases.items || []).filter(function (x) { return x.facts && x.short; })[0];
  if (!c) return null;
  var shortTxt = c.short.replace(/\s+/g, ' ');
  var j = shortTxt.lastIndexOf('จึง'), concl = j > 40 ? shortTxt.slice(j) : shortTxt.slice(-260);
  return {
    scenario: 'ข้อเท็จจริงจาก' + c.label + ' (ตามต้นฉบับ): ' + c.facts.replace(/\s+/g, ' '),
    question: 'ให้วินิจฉัยว่า ข้อเท็จจริงดังกล่าวต้องด้วย' + title + ' มาตรา ' + s.no + ' หรือไม่ และมีผลทางกฎหมายอย่างไร',
    answer: {
      principle: title + ' มาตรา ' + s.no + ' บัญญัติว่า “' + String(s.text || '').replace(/\s+/g, ' ').trim().slice(0, 1500) + '”',
      analysis: 'ศาลฎีกาวินิจฉัยประเด็นนี้ไว้ใน' + c.label + ' (ย่อสั้นตามต้นฉบับ) ว่า “' + shortTxt + '”',
      conclusion: 'สรุป ' + concl
    },
    source: c.label
  };
}

var explainRule20V21_ = explainRule20_;
explainRule20_ = function (title, cat, secs, i) {
  var d = explainRule20V21_(title, cat, secs, i), s = secs[i];
  try {
    var cases = explainCases21_(s.id, 3);
    if (cases.items.length) {
      d.cases = cases.items.map(function (x) { return { label: x.label, no: x.no, year: x.year, docid: x.docid, row: x.row, short: x.short }; });
      d.casesTotal = cases.n;
      var ex = explainExam21_(title, s, cases);
      if (ex) d.quiz = ex;
    }
  } catch (e) {}
  return d;
};

/* แคชคำอธิบายที่เรียบเรียงจากข้อมูล: เปลี่ยนชื่อแคชเพื่อให้ใช้รูปแบบใหม่ทันที */
var apiLawExplain20V21_ = apiLawExplain20_;
apiLawExplain20_ = function (p, ctx) {
  var c = CacheService.getScriptCache(), secId = String(p.secId || '').slice(0, 80);
  if (secId && !c.get('exrule21m_' + secId)) { try { c.remove('exrule20_' + secId); c.put('exrule21m_' + secId, '1', 21600); } catch (e) {} }
  var r = apiLawExplain20V21_(p, ctx);
  try {
    if (r && r.explain && !r.explain.cases && secId) {
      var cs = explainCases21_(secId, 3);
      if (cs.items.length) { r.explain = JSON.parse(JSON.stringify(r.explain)); r.explain.cases = cs.items.map(function (x) { return { label: x.label, no: x.no, year: x.year, docid: x.docid, row: x.row, short: x.short }; }); r.explain.casesTotal = cs.n; }
    }
  } catch (e) {}
  return r;
};
ROUTES.lawExplain = { fn: apiLawExplain20_, auth: true, limit: 400 };
