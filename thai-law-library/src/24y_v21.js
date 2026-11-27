<script>
/* ==========================================================================
   v21 (แสดงผลเป็นเวอร์ชัน 1.0.0)
   1) พิมพ์คำพิพากษา: หัว/ท้ายกระดาษทุกหน้า ไม่ตกบรรทัด 13 pt · ขวาบน “คลังกฎหมาย” + QR Code สแกนได้จริง
      · เลขคำพิพากษาไม่ตกบรรทัด · คู่ความแสดงครบ (โจทก์/จำเลย) · เนื้อหา 16 pt ชิดซ้าย–ขวาพอดีโดยไม่ตัดคำ
      · ฎีกาที่เกี่ยวข้องอยู่หน้าแยก · ข้อกำหนดการใช้เอกสารอยู่หน้าสุดท้ายหน้าเดียว
   2) คำอธิบายกฎหมาย: คำพิพากษาศาลฎีกาที่อ้างมาตรา (ย่อสั้นตามต้นฉบับ กดเปิดฉบับเต็มได้) · ธงคำตอบ 3 ส่วน · พิมพ์ PDF รูปแบบเดียวกับคำพิพากษา
   3) แสดงวงกลมหมุนทุกครั้งที่รอข้อมูลจากระบบ (ไม่ปล่อยหน้าว่าง) · เครื่องเล่นเสียงแสดงวงกลมหมุนระหว่างเตรียมเสียง
   4) ปุ่ม “เข้าสู่ระบบด้วย Google” แสดงในหน้าเข้าสู่ระบบเสมอ
   ========================================================================== */
var SITE21 = 'https://thailawlibrary.vercel.app';

/* ---------- ข้อความชิดซ้าย–ขวาพอดี: แบ่งคำภาษาไทยแล้วแทรกจุดยืดที่มองไม่เห็นระหว่างคำ (ไม่ตัดคำ ไม่มีเครื่องหมาย -) ---------- */
function just21(t) {
  t = String(t || '');
  if (!(window.Intl && Intl.Segmenter)) return esc(t);
  var out = '', prevWs = true;
  try {
    Array.from(new Intl.Segmenter('th', { granularity: 'word' }).segment(t)).forEach(function (x) {
      var g = x.segment;
      if (/^\s+$/.test(g)) { out += esc(g); prevWs = true; return; }
      if (!prevWs) out += '<span class="z"> </span>';
      out += esc(g); prevWs = false;
    });
  } catch (e) { return esc(t); }
  return out;
}
function paras21(t) { return String(t || '').split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) { return '<p class="pa">' + just21(s) + '</p>'; }).join(''); }

/* ---------- QR Code ของเว็บไซต์ (สแกนได้จริง) ---------- */
var QR21 = null;
function qr21() {
  if (QR21) return Promise.resolve(QR21);
  return loadQrLib().then(function () { var q = qrcode(0, 'M'); q.addData(SITE21); q.make(); QR21 = q.createDataURL(4, 0); return QR21; }).catch(function () { return ''; });
}

/* ---------- แม่แบบเอกสารพิมพ์ (คำพิพากษา / คำอธิบายกฎหมาย) ---------- */
function printDoc21(o) {
  var who = (S.member && (S.member.username || S.member.displayName)) || 'ผู้เยี่ยมชม', stamp = printStamp().replace(/^วันที่ /, '');
  return Promise.all([font20Load(), qr21()]).then(function (x) {
    var qr = x[1];
    var html = '<!doctype html><html lang="th"><head><meta charset="utf-8"><title>' + esc(o.title) + '</title><style id="pdf11">' + fontFace() +
      '@page{size:A4;margin:1.6cm 2cm 1.5cm 3cm}' +
      '*{font-family:"TH Sarabun New","TH SarabunPSK",serif !important;font-size:16pt !important;box-sizing:border-box}' +
      'span.z{font-size:0 !important}' +
      'body{margin:0;color:#000;line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      'table.pg{width:100%;border-collapse:collapse}table.pg>thead td,table.pg>tfoot td{padding:0;border:0}' +
      '.rh,.rf{display:flex;justify-content:space-between;align-items:center;gap:10pt;white-space:nowrap}' +
      '.rh *,.rf *{font-size:13pt !important;line-height:1.25 !important;white-space:nowrap}' +
      '.rh{border-bottom:.75pt solid #000;padding:0 0 3pt;margin:0 0 12pt}.rf{border-top:.75pt solid #000;padding:3pt 0 0;margin:12pt 0 0}' +
      '.rh .brand{display:flex;align-items:center;gap:6pt;font-weight:bold}.rh img{width:1.15cm;height:1.15cm;display:block}' +
      '.ti{text-align:center;font-weight:bold;text-decoration:underline;margin:0 0 14pt}' +
      '.hdr{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:0 18pt;margin:0 0 12pt}' +
      '.hdr .no,.hdr .no *{font-size:15pt !important;font-weight:bold;white-space:nowrap}' +
      '.pt{display:grid;grid-template-columns:minmax(0,1fr) max-content;gap:0 10pt;align-items:start;margin:0 0 4pt}.pt .pr{white-space:nowrap;text-align:right}' +
      '.laws{margin:0 0 12pt}p{margin:0 0 8pt;orphans:2;widows:2}' +
      'p.pa{text-indent:2.5em;text-align:justify;text-align-last:left;hyphens:none;-webkit-hyphens:none;word-break:normal;overflow-wrap:normal}' +
      'p.ni{text-indent:0}h2,h3{font-weight:bold;margin:12pt 0 4pt;page-break-after:avoid}h2{text-align:center;text-decoration:underline}' +
      '.sep{width:45%;margin:12pt auto 14pt;border-top:.75pt solid #000}.jd{text-indent:2.5em;margin:12pt 0 0}' +
      '.newp{page-break-before:always;break-before:page}.keep{page-break-inside:avoid;break-inside:avoid}' +
      'table.kv{border-collapse:collapse;width:100%;margin:0 0 10pt}table.kv th{width:34%;text-align:left;vertical-align:top;font-weight:bold;padding:2pt 8pt 6pt 0}table.kv td{vertical-align:top;padding:2pt 0 6pt}' +
      '</style></head><body><table class="pg"><thead><tr><td><div class="rh"><span>' + esc(o.hdrLeft) + '</span><span class="brand">คลังกฎหมาย' + (qr ? '<img src="' + qr + '" alt="QR">' : '') + '</span></div></td></tr></thead>' +
      '<tfoot><tr><td><div class="rf"><span>' + esc(o.footLeft || 'คลังกฎหมาย · thailawlibrary.vercel.app') + '</span><span>พิมพ์เมื่อ ' + esc(stamp) + '</span></div></td></tr></tfoot><tbody><tr><td>' +
      o.body +
      (o.extra ? '<section class="newp">' + o.extra + '</section>' : '') +
      '<section class="newp keep"><h2>ข้อกำหนดในการใช้เอกสาร</h2>' +
      paras21('เอกสารนี้พิมพ์จากเว็บไซต์คลังกฎหมาย (THAI LAW LIBRARY) โดยผู้ใช้งาน ' + who + ' เมื่อ ' + stamp + ' ' + (o.srcNote || '') + ' เอกสารนี้จัดทำเพื่อการศึกษาและค้นคว้าเท่านั้น มิใช่เอกสารทางราชการหรือสำเนาที่หน่วยงานใดรับรอง หากจะนำไปใช้ในการดำเนินคดีหรือการปฏิบัติงาน โปรดตรวจสอบกับต้นฉบับจากหน่วยงานผู้เผยแพร่ทุกครั้ง') +
      paras21('ห้ามดัดแปลงหรือแก้ไขข้อความในเอกสารนี้ แล้วนำไปเผยแพร่ในลักษณะที่ทำให้ผู้อื่นเข้าใจผิดในสาระสำคัญ การกระทำดังกล่าวอาจเป็นความผิดตามพระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ พ.ศ. 2550 และที่แก้ไขเพิ่มเติม และประมวลกฎหมายอาญา') +
      paras21('สแกน QR Code ที่หัวกระดาษเพื่อเปิดเว็บไซต์คลังกฎหมาย และตรวจสอบข้อมูลฉบับปัจจุบัน') +
      '</section></td></tr></tbody></table></body></html>';
    printHtml(html);
  });
}

/* ---------- พิมพ์คำพิพากษาศาลฎีกา ---------- */
dk20Print = function (r, rel) {
  var lit = r.litigants || [];
  var plaint = lit.filter(function (x) { return /โจทก์|ผู้ร้อง/.test(x.role); }), def = lit.filter(function (x) { return !/โจทก์|ผู้ร้อง/.test(x.role); });
  var party = function (arr) { return arr.map(function (x) { return '<div class="pt"><span>' + esc(x.name) + '</span><span class="pr">' + esc(x.role || '') + '</span></div>'; }).join(''); };
  var lawLines = {}; (r.lawRefs || []).forEach(function (x) { var k = x.abbr || x.name; (lawLines[k] || (lawLines[k] = [])).push(x.display || ('มาตรา ' + x.sec)); });
  var lawHtml = Object.keys(lawLines).map(function (k) { return '<div>' + esc(k + ' ' + lawLines[k].join(', ').replace(/ม\.\s*/g, 'มาตรา ')) + '</div>'; }).join('') || (r.laws || []).map(function (x) { return '<div>' + esc(x) + '</div>'; }).join('');
  var kv = function (k, v) { return '<tr><th>' + esc(k) + '</th><td>' + (v ? esc(v) : '–') + '</td></tr>'; };
  var relHtml = (rel || []).map(function (g) { return '<p class="ni"><b>' + esc(g.law + ' มาตรา ' + g.sec) + '</b> — ' + esc(g.items.map(function (it) { return 'ฎีกาที่ ' + it.no; }).join(', ')) + (g.n > g.items.length ? ' (รวม ' + fmtN(g.n) + ' ฉบับ)' : '') + '</p>'; }).join('');
  return printDoc21({
    title: r.label, hdrLeft: r.label, footLeft: 'คลังกฎหมาย · ที่มา: ศาลฎีกา (deka.supremecourt.or.th)',
    srcNote: 'ข้อความคำพิพากษาเป็นไปตามต้นฉบับของศาลฎีกาที่เผยแพร่ผ่านชุดข้อมูลเปิด korakot/deka-bulk ภายใต้สัญญาอนุญาต CC0',
    body: '<div class="ti">' + esc(r.type || 'คำพิพากษาศาลฎีกา') + '</div>' +
      '<div class="hdr"><div class="no">' + esc(r.label) + '</div><div>' + party(plaint) + party(def) + '</div></div>' +
      (lawHtml ? '<div class="laws">' + lawHtml + '</div>' : '') +
      (r.shortText ? paras21(r.shortText) + '<div class="sep"></div>' : '') + paras21(r.longText) +
      (r.judges ? '<p class="jd">(' + esc(r.judges) + ')</p>' : ''),
    extra: '<h2>ข้อมูลประกอบคำพิพากษา</h2><table class="kv">' + kv('แหล่งที่มา', r.source) + kv('แผนก', r.department) +
      kv('คู่ความ', lit.map(function (x) { return (x.role ? x.role + ' ' : '') + x.name; }).join(' · ')) + kv('องค์คณะ', r.judges) + kv('ศาลชั้นต้น/ศาลอุทธรณ์', r.lowerCourts) +
      kv('หมายเลขคดี', [r.blackNo, r.lowerCourtNos].filter(Boolean).join(' · ')) + kv('หมายเหตุ', r.remark) + '</table>' +
      (relHtml ? '<h3>ฎีกาอื่นที่อ้างกฎหมายและมาตราเดียวกัน</h3>' + relHtml : '')
  });
};

/* ---------- คำอธิบายกฎหมาย: คำพิพากษาที่เกี่ยวข้อง · ธงคำตอบ 3 ส่วน · พิมพ์ PDF ---------- */
var EX21 = { last: null };
function ex21Answer(a) {
  if (!a) return '';
  if (typeof a === 'string') return String(a).split(/\n+/).filter(Boolean).map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('');
  var part = function (h, t) { return t ? '<div class="ex21-ap"><h5>' + h + '</h5>' + String(t).split(/\n+/).filter(Boolean).map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('') + '</div>' : ''; };
  return part('หลักกฎหมาย', a.principle) + part('วินิจฉัย', a.analysis) + part('สรุป', a.conclusion);
}
(function () {
  var baseHtml = ex19Html;
  ex19Html = function (d, s, l, meta) {
    EX21.last = { d: d, s: s, l: l, meta: meta };
    var ansObj = d && d.quiz && d.quiz.answer && typeof d.quiz.answer === 'object' ? d.quiz.answer : null;
    var d2 = d; if (ansObj) { d2 = Object.assign({}, d, { quiz: Object.assign({}, d.quiz, { answer: '⁣' }) }); }
    var html = baseHtml(d2, s, l, meta);
    if (ansObj) html = html.replace('<div class="ex19-ans" hidden><h4>ธงคำตอบ</h4><p>⁣</p></div>', '<div class="ex19-ans" hidden><h4>ธงคำตอบ</h4>' + ex21Answer(ansObj) + '</div>');
    if (d && d.quiz && d.quiz.source) html = html.replace('โจทย์ฝึกวินิจฉัย (ตัวละครสมมุติ)', 'โจทย์ฝึกวินิจฉัยจากข้อเท็จจริงในคำพิพากษา');
    var cases = (d && d.cases) || [];
    if (cases.length) {
      var sec = '<section class="ex21-cases"><h3>' + ic('scale') + ' คำพิพากษาศาลฎีกาที่อ้างมาตรานี้' + (d.casesTotal ? ' <span class="small muted">(ในฐานข้อมูล ' + fmtN(d.casesTotal) + ' ฉบับ)</span>' : '') + '</h3>' +
        cases.map(function (c) { return '<div class="ex21-case"><button class="linklike" data-ex21dk="' + esc(c.docid) + '" data-o="' + esc(c.row) + '">' + esc(c.label) + '</button><p class="small">' + esc(c.short) + '</p><div class="tiny muted">ย่อสั้นตามต้นฉบับของศาลฎีกา (deka.supremecourt.or.th) · กดเลขคำพิพากษาเพื่ออ่านฉบับเต็ม</div></div>'; }).join('') + '</section>';
      html = html.indexOf('<section class="ex19-quiz">') > -1 ? html.replace('<section class="ex19-quiz">', sec + '<section class="ex19-quiz">') : html.replace('<p class="tiny muted ex19-note">', sec + '<p class="tiny muted ex19-note">');
    }
    html = html.replace('<div class="ex19-h">', '<div class="ex19-h"><button class="btn sm k ex21-print" id="ex21Print">' + ic('download') + ' พิมพ์ PDF</button>');
    return html;
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ex21dk]');
    if (b) { e.preventDefault(); openDeka(b.getAttribute('data-ex21dk'), b.getAttribute('data-o')); return; }
    if (e.target.closest && e.target.closest('#ex21Print') && EX21.last) { e.preventDefault(); ex21Print(EX21.last); }
  });
})();
function ex21Print(x) {
  var d = x.d || {}, s = x.s, l = x.l || {}, name = lawShort(l) + ' มาตรา ' + s.no, arr = function (a) { return Array.isArray(a) ? a : (a ? [a] : []); };
  var H = function (t) { return '<h3>' + esc(t) + '</h3>'; };
  var ans = d.quiz && d.quiz.answer, ansHtml = '';
  if (ans && typeof ans === 'object') ansHtml = (ans.principle ? H('หลักกฎหมาย') + paras21(ans.principle) : '') + (ans.analysis ? H('วินิจฉัย') + paras21(ans.analysis) : '') + (ans.conclusion ? H('สรุป') + paras21(ans.conclusion) : '');
  else if (ans) ansHtml = paras21(ans);
  return printDoc21({
    title: 'คำอธิบาย ' + name, hdrLeft: name, footLeft: 'คลังกฎหมาย · คำอธิบายกฎหมายรายมาตรา',
    srcNote: 'ตัวบทจากฐานข้อมูลของเว็บไซต์ คำพิพากษาศาลฎีกาเป็นย่อสั้นตามต้นฉบับของศาลฎีกา (deka.supremecourt.or.th) คำอธิบายจัดทำเพื่อการศึกษา',
    body: '<h2>คำอธิบาย' + esc(l.title || '') + ' มาตรา ' + esc(s.no) + '</h2>' +
      H('ตัวบท') + paras21(String(s.text || '')) +
      (d.summary ? H('สาระสำคัญ') + paras21(d.summary) : '') + (d.purpose ? H('วัตถุประสงค์ของมาตรา') + paras21(d.purpose) : '') +
      (arr(d.elements).length ? H('องค์ประกอบและถ้อยคำในตัวบท') + arr(d.elements).map(function (e, i) { return '<p class="pa"><b>' + (i + 1) + '. “' + esc(e.term || '') + '”</b> ' + just21(e.meaning || '') + '</p>'; }).join('') : '') +
      (arr(d.explanation).length ? H('คำอธิบายโดยละเอียด') + arr(d.explanation).map(paras21).join('') : '') +
      (arr(d.related).length ? H('กฎหมายและมาตราที่เกี่ยวข้อง') + arr(d.related).map(function (r) { return '<p class="pa"><b>' + esc(r.ref || '') + '</b> — ' + just21(r.why || '') + '</p>'; }).join('') : '') +
      (d.differences ? H('ข้อแตกต่างจากหลักที่คล้ายกัน') + paras21(d.differences) : '') + (d.example ? H('ตัวอย่างการปรับใช้') + paras21(d.example) : '') + (d.notes ? H('ข้อควรระวัง') + paras21(d.notes) : ''),
    extra: (arr(d.cases).length ? '<h2>คำพิพากษาศาลฎีกาที่อ้างมาตรานี้</h2>' + arr(d.cases).map(function (c) { return '<h3>' + esc(c.label) + '</h3>' + paras21(c.short); }).join('') : '') +
      (d.quiz ? '<h2>โจทย์ฝึกวินิจฉัย</h2>' + paras21(d.quiz.scenario) + '<p class="pa"><b>คำถาม</b> ' + just21(d.quiz.question || '') + '</p><h2>ธงคำตอบ</h2>' + ansHtml : '')
  });
}

/* ---------- (ยกเลิก) ป้าย “กำลังโหลด…” ลอยกลางจอ — แสดงสถานะการโหลดในแต่ละรายการแทน ---------- */
function sp21Show() {}

/* ---------- เครื่องเล่นเสียง: วงกลมหมุนระหว่างเตรียมเสียง ---------- */
(function () {
  var basePaint = v18Paint;
  v18Paint = function (status) {
    var r = basePaint.apply(this, arguments);
    try { var el = document.getElementById('v18S'); if (el && /กำลังเตรียม/.test(String(status || ''))) el.innerHTML = '<span class="sp21 sm"></span> ' + esc(status); } catch (e) {}
    return r;
  };
})();

/* ---------- ไม่มีปุ่มเข้าสู่ระบบด้วย Google (ยังไม่ได้เชื่อมต่อบริการของ Google จริง) ---------- */
socialButtons = function () { return ''; };
</script>
