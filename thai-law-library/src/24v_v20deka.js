<script>
/* ==========================================================================
   v20: คำพิพากษาศาลฎีกา — หน้าอ่าน + การพิมพ์ PDF
   - ข้อความยาว/ป้ายมาตรายาวขึ้นบรรทัดใหม่ ไม่ล้นขอบขวา
   - ท้ายคำพิพากษามี 5 ส่วน (ไอคอน): ฎีกาที่อ้างกฎหมายและมาตราเดียวกัน · ที่มา · คู่ความ · องค์คณะ · ศาลชั้นต้น/ศาลอุทธรณ์
   - พิมพ์ PDF ตามรูปแบบเอกสารของศาลฎีกา: ไม่มีโลโก้ · TH Sarabun New 16 pt ทั้งเอกสาร (ฝังฟอนต์ในเอกสาร) · เส้นหัว/ท้ายกระดาษพร้อมรายละเอียด
     · จัดชิดขอบสองด้านโดยไม่ตัดคำ · ย่อหน้าใหม่ทุกครั้ง · หน้าสุดท้ายแยกสำหรับข้อมูลประกอบและข้อกำหนด
   ========================================================================== */
ICONS.scale = ICONS.scale || '<path d="M12 3v18"/><path d="M5 7h14"/><path d="m5 7-3 6a3 3 0 0 0 6 0z"/><path d="m19 7-3 6a3 3 0 0 0 6 0z"/><path d="M8 21h8"/>';
ICONS.users = ICONS.users || '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 5.5 5"/>';
ICONS.gavel = ICONS.gavel || '<path d="m14 13-8.5 8.5a2.1 2.1 0 0 1-3-3L11 10"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/>';
ICONS.building = ICONS.building || '<path d="M3 21h18"/><path d="M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6"/>';
ICONS.book = ICONS.book || '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>';

/* ฟอนต์ TH Sarabun New ฝังในเอกสารที่พิมพ์ (ไม่ต้องรอโหลดจากอินเทอร์เน็ตตอนพิมพ์ จึงไม่สลับเป็นฟอนต์ระบบ) */
var FONT20 = { reg: '', bold: '', p: null };
function font20Load() {
  if (FONT20.p) return FONT20.p;
  var get = function (f) { return fetch(DB_RAW + 'fonts/' + f).then(function (r) { if (!r.ok) throw 0; return r.blob(); }).then(function (b) { return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = function () { res(''); }; fr.readAsDataURL(b); }); }).catch(function () { return ''; }); };
  FONT20.p = Promise.all([get('THSarabunNew.woff'), get('THSarabunNew-Bold.woff')]).then(function (x) { FONT20.reg = String(x[0] || '').replace(/^data:[^;,]*/, 'data:font/woff'); FONT20.bold = String(x[1] || '').replace(/^data:[^;,]*/, 'data:font/woff'); return FONT20; });
  return FONT20.p;
}
(function () {
  var baseFF = fontFace;
  fontFace = function () {
    if (!FONT20.reg) return baseFF();
    return '@font-face{font-family:"TH Sarabun New";src:url("' + FONT20.reg + '") format("woff");font-weight:normal}@font-face{font-family:"TH Sarabun New";src:url("' + (FONT20.bold || FONT20.reg) + '") format("woff");font-weight:bold}';
  };
  setTimeout(function () { try { font20Load(); } catch (e) {} }, 6000);
})();

/* ฎีกาที่อ้างกฎหมายและมาตราเดียวกัน (จากฐานข้อมูลคำพิพากษาของเว็บไซต์) */
var DK20 = { rev: null, byDoc: null };
function dk20Index(x) {
  if (DK20.rev) return DK20;
  var rev = {}, byDoc = {};
  x.recs.forEach(function (r, i) { byDoc[r[0]] = i; (r[6] || []).forEach(function (f) { var k = f[0] + '|' + String(f[1]).trim(); (rev[k] || (rev[k] = [])).push(i); }); });
  DK20.rev = rev; DK20.byDoc = byDoc; return DK20;
}
function dk20Related(docid) {
  return loadDeka().then(function (x) {
    var ix = dk20Index(x), me = x.recs[ix.byDoc[Number(docid)]];
    if (!me) return [];
    var seen = {};
    return (me[6] || []).filter(function (f) { var k = f[0] + '|' + f[1]; if (seen[k]) return false; seen[k] = 1; return true; }).slice(0, 12).map(function (f) {
      var dup = {}; dup[me[1]] = 1;
      var lst = (ix.rev[f[0] + '|' + String(f[1]).trim()] || []).filter(function (i) { var no = x.recs[i][1]; if (dup[no]) return false; dup[no] = 1; return true; }).sort(function (a, b) { return (x.recs[b][2] || 0) - (x.recs[a][2] || 0); });
      return { law: (x.laws[f[0]] || [])[0] || '', sec: f[1], n: lst.length, items: lst.slice(0, 6).map(function (i) { var r = x.recs[i]; return { docid: r[0], no: r[1], year: r[2], row: r[5], type: x.types[r[3]] || '' }; }) };
    }).filter(function (g) { return g.n; });
  }).catch(function () { return []; });
}
function dk20Info(r, rel) {
  var parties = (r.litigants || []).map(function (x) { return (x.role ? x.role + ': ' : '') + x.name; });
  var lower = [r.lowerCourts, r.lowerCourtNos, r.blackNo].filter(Boolean);
  var row = function (icn, label, body) { return '<div class="dk20-i"><span class="dk20-ic" aria-hidden="true">' + ic(icn) + '</span><div class="grow"><div class="dk20-l">' + esc(label) + '</div>' + body + '</div></div>'; };
  var relHtml = rel && rel.length ? rel.map(function (g) {
    return '<div class="dk20-g"><b>' + esc(g.law + ' มาตรา ' + g.sec) + '</b> <span class="small muted">(' + fmtN(g.n) + ' ฉบับ)</span><div class="dk20-links">' + g.items.map(function (it) { return '<button class="linklike" data-dk20="' + esc(it.docid) + '" data-o="' + esc(it.row) + '">ฎีกาที่ ' + esc(it.no) + '</button>'; }).join('') + '</div></div>';
  }).join('') : '<p class="small muted">ไม่พบคำพิพากษาฉบับอื่นที่อ้างกฎหมายและมาตราเดียวกันในฐานข้อมูล</p>';
  return '<section class="dk20-info" aria-label="ข้อมูลประกอบคำพิพากษา">' +
    row('scale', 'ฎีกาที่วางหลักโดยอ้างกฎหมายและมาตราเดียวกัน', relHtml) +
    row('book', 'ที่มาของคำพิพากษา', '<p>' + esc([r.source, r.department ? 'แผนก' + r.department.replace(/^แผนก/, '') : ''].filter(Boolean).join(' · ') || 'ศาลฎีกา (deka.supremecourt.or.th)') + '</p>') +
    row('users', 'คู่ความในคดี', parties.length ? '<p>' + parties.map(esc).join('<br>') + '</p>' : '<p class="small muted">ข้อมูลต้นทางไม่ได้ระบุชื่อคู่ความ</p>') +
    row('gavel', 'องค์คณะผู้พิพากษา', r.judges ? '<p>' + esc(r.judges) + '</p>' : '<p class="small muted">ข้อมูลต้นทางไม่ได้ระบุองค์คณะ</p>') +
    row('building', 'ศาลที่พิจารณาคดีก่อนถึงศาลฎีกา', lower.length ? '<p>' + lower.map(esc).join('<br>') + '</p>' : '<p class="small muted">ข้อมูลต้นทางไม่ได้ระบุศาลชั้นต้นและศาลอุทธรณ์</p>') +
    '</section>';
}

/* เอกสารพิมพ์ตามรูปแบบคำพิพากษาศาลฎีกา */
function dk20Print(r, rel) {
  var who = (S.member && (S.member.username || S.member.displayName)) || 'ผู้เยี่ยมชม', stamp = printStamp();
  var P = function (t) { return String(t || '').split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) { return '<p class="pa">' + esc(s) + '</p>'; }).join(''); };
  var lit = r.litigants || [], plaint = lit.filter(function (x) { return /โจทก์|ผู้ร้อง/.test(x.role); }), def = lit.filter(function (x) { return !/โจทก์|ผู้ร้อง/.test(x.role); });
  var party = function (arr) { return arr.map(function (x) { return '<div class="pn">' + esc(x.name) + '</div><div class="pr">' + esc(x.role || '') + '</div>'; }).join(''); };
  var lawLines = {}; (r.lawRefs || []).forEach(function (x) { var k = x.abbr || x.name; (lawLines[k] || (lawLines[k] = [])).push(x.display || ('มาตรา ' + x.sec)); });
  var lawHtml = Object.keys(lawLines).map(function (k) { return '<div>' + esc(k + ' ' + lawLines[k].join(', ').replace(/ม\.\s*/g, 'มาตรา ')) + '</div>'; }).join('') || (r.laws || []).map(function (x) { return '<div>' + esc(x) + '</div>'; }).join('');
  var relTxt = (rel || []).map(function (g) { return '<p class="ni">' + esc(g.law + ' มาตรา ' + g.sec) + ' — ' + esc(g.items.map(function (it) { return 'ฎีกาที่ ' + it.no; }).join(', ')) + (g.n > g.items.length ? ' (รวม ' + fmtN(g.n) + ' ฉบับ)' : '') + '</p>'; }).join('');
  var kv = function (k, v) { return '<tr><th>' + esc(k) + '</th><td>' + (v ? esc(v) : '–') + '</td></tr>'; };
  var html = '<!doctype html><html lang="th"><head><meta charset="utf-8"><title>' + esc(r.label) + '</title><style id="pdf11">' + fontFace() +
    '@page{size:A4;margin:2.2cm 2cm 2cm 3cm}' +
    '*{font-family:"TH Sarabun New","TH SarabunPSK",serif !important;font-size:16pt !important;box-sizing:border-box}' +
    'body{margin:0;color:#000;line-height:1.45;letter-spacing:.01em;word-spacing:.06em;-webkit-print-color-adjust:exact}' +
    'table.pg{width:100%;border-collapse:collapse}table.pg>thead td,table.pg>tfoot td{padding:0;border:0}' +
    '.rh{border-bottom:.75pt solid #000;padding:0 0 2pt;margin:0 0 10pt;display:flex;justify-content:space-between;gap:12pt}' +
    '.rf{border-top:.75pt solid #000;padding:3pt 0 0;margin:10pt 0 0;display:flex;justify-content:space-between;gap:12pt}' +
    '.ti{text-align:center;font-weight:bold;text-decoration:underline;margin:0 0 14pt}' +
    '.hdr{display:grid;grid-template-columns:38% minmax(0,1fr);gap:0 12pt;margin:0 0 12pt}.hdr .no{font-weight:bold}.pn{text-align:left}.pr{text-align:right;margin:0 0 4pt}' +
    '.laws{margin:0 0 12pt}' +
    'p{margin:0 0 6pt;orphans:2;widows:2}p.pa{text-indent:2.5em;text-align:justify;text-justify:inter-word;hyphens:none;-webkit-hyphens:none;word-break:normal;overflow-wrap:break-word;line-break:auto}' +
    'p.ni{text-indent:0}.sep{width:45%;margin:12pt auto 14pt;border-top:.75pt solid #000}' +
    '.jd{text-indent:2.5em;margin:12pt 0 0}.end{margin-top:10pt;text-indent:2.5em}' +
    '.last{page-break-before:always}.last h2{font-weight:bold;text-decoration:underline;text-align:center;margin:0 0 10pt}' +
    'table.kv{border-collapse:collapse;width:100%;margin:0 0 10pt}table.kv th{width:36%;text-align:left;vertical-align:top;font-weight:bold;text-decoration:underline;padding:2pt 8pt 6pt 0}table.kv td{vertical-align:top;padding:2pt 0 6pt}' +
    '</style></head><body><table class="pg"><thead><tr><td><div class="rh"><span>' + esc(r.label) + '</span><span>คลังกฎหมาย</span></div></td></tr></thead>' +
    '<tfoot><tr><td><div class="rf"><span>ที่มา: ศาลฎีกา</span><span>พิมพ์เมื่อ ' + esc(stamp.replace(/^วันที่ /, '')) + '</span></div></td></tr></tfoot><tbody><tr><td>' +
    '<div class="ti">' + esc(r.type || 'คำพิพากษาศาลฎีกา') + '</div>' +
    '<div class="hdr"><div class="no">' + esc(r.label) + '</div><div>' + (lit.length ? party(plaint) + party(def) : '') + '</div></div>' +
    (lawHtml ? '<div class="laws">' + lawHtml + '</div>' : '') +
    (r.shortText ? P(r.shortText) + '<div class="sep"></div>' : '') + P(r.longText) +
    (r.judges ? '<p class="jd">(' + esc(r.judges) + ')</p>' : '') +
    '<section class="last"><h2>ข้อมูลประกอบคำพิพากษา</h2><table class="kv">' +
    kv('แหล่งที่มา', r.source) + kv('แผนก', r.department) + kv('คู่ความ', (lit || []).map(function (x) { return (x.role ? x.role + ' ' : '') + x.name; }).join(' · ')) +
    kv('องค์คณะ', r.judges) + kv('ศาลชั้นต้น/ศาลอุทธรณ์', r.lowerCourts) + kv('หมายเลขคดี', [r.blackNo, r.lowerCourtNos].filter(Boolean).join(' · ')) + kv('หมายเหตุ', r.remark) + '</table>' +
    (relTxt ? '<p class="ni"><b>ฎีกาอื่นที่อ้างกฎหมายและมาตราเดียวกัน</b></p>' + relTxt : '') +
    '<p class="ni" style="margin-top:12pt"><b>ข้อกำหนดในการใช้เอกสาร</b></p>' +
    '<p class="pa">เอกสารนี้พิมพ์จากเว็บไซต์คลังกฎหมาย โดยผู้ใช้งาน ' + esc(who) + ' เมื่อ ' + esc(stamp) + ' ข้อความคำพิพากษาเป็นไปตามต้นฉบับของศาลฎีกาที่เผยแพร่ผ่านชุดข้อมูลเปิด korakot/deka-bulk ภายใต้สัญญาอนุญาต CC0 เอกสารนี้จัดทำเพื่อการศึกษาและค้นคว้าเท่านั้น มิใช่สำเนาที่ศาลรับรอง หากจะนำไปใช้ในการดำเนินคดีหรือการปฏิบัติงาน โปรดตรวจสอบกับต้นฉบับของศาลฎีกาทุกครั้ง</p>' +
    '<p class="pa">ห้ามดัดแปลงหรือแก้ไขข้อความในเอกสารนี้แล้วนำไปเผยแพร่ในลักษณะที่ทำให้ผู้อื่นเข้าใจว่าเป็นข้อความของศาล การกระทำดังกล่าวอาจเป็นความผิดตามพระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ พ.ศ. 2550 และที่แก้ไขเพิ่มเติม และกฎหมายอื่นที่เกี่ยวข้อง</p>' +
    '</section></td></tr></tbody></table></body></html>';
  printHtml(html);
}

openDeka = function (docid, o) {
  if (DK_EL) DK_EL.remove();
  DK_EL = h('<div class="fv-reader dk-reader" role="dialog" aria-modal="true" aria-label="คำพิพากษาศาลฎีกา"><div class="fv-in"><div class="fv-top"><button class="nav-arrow" data-dkx="1" aria-label="กลับไปผลการค้นหา">' + ic('arrowL') + '</button><div class="grow fv-title"><span class="tag">คำพิพากษาศาลฎีกา</span><h3 id="dkT">กำลังโหลด…</h3></div><button class="btn sm k fv-print" data-dkp20="1" disabled>' + ic('download') + ' พิมพ์ PDF</button></div><div id="dkBody"><div class="skeleton" style="height:240px"></div></div></div></div>');
  document.body.appendChild(DK_EL); syncScrollLock();
  var el = DK_EL, data = null, rel = [];
  var close = function () { if (DK_EL === el) { DK_EL.remove(); DK_EL = null; syncScrollLock(); } };
  el.addEventListener('click', function (e) {
    if (e.target.closest('[data-dkx]')) return close();
    var b = e.target.closest('[data-dk20]'); if (b) return openDeka(b.getAttribute('data-dk20'), b.getAttribute('data-o'));
    if (e.target.closest('[data-dkp20]') && data) { PRINT_SRC = ''; font20Load().then(function () { dk20Print(data, rel); }); }
  });
  el.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  el.tabIndex = -1; el.focus({ preventScroll: true });
  font20Load();
  var paras = function (t) { return String(t || '').split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) { return '<p>' + esc(s) + '</p>'; }).join(''); };
  api('dekaGet', { docid: docid, o: o }, { timeout: 60000 }).then(function (r) {
    if (DK_EL !== el) return;
    data = r;
    $('#dkT', el).textContent = r.label;
    var body = $('#dkBody', el);
    body.innerHTML = '<div class="panel flat fv-meta"><div class="small">' + esc([r.type, 'ปี พ.ศ. ' + r.year, r.source, r.department].filter(Boolean).join(' · ')) + '</div>' + (r.laws.length ? '<div class="dk-laws">' + r.laws.map(function (x) { return '<span class="chip">' + esc(x) + '</span>'; }).join('') + '</div>' : '') + '</div>' +
      (r.shortText ? '<h4 class="fv-head">ย่อสั้น</h4><div class="fv-text">' + paras(r.shortText) + '</div>' : '') +
      '<h4 class="fv-head">' + (r.shortText ? 'รายละเอียด' : 'คำพิพากษา') + '</h4><div class="fv-text">' + paras(r.longText) + '</div>' +
      '<div id="dk20Info">' + dk20Info(r, null).replace('ไม่พบคำพิพากษาฉบับอื่นที่อ้างกฎหมายและมาตราเดียวกันในฐานข้อมูล', 'กำลังค้นฎีกาที่เกี่ยวข้อง…') + '</div>' +
      '<p class="tiny muted" style="margin-top:10px">ที่มา: ศาลฎีกา (deka.supremecourt.or.th) ผ่านชุดข้อมูลเปิด korakot/deka-bulk (CC0) — ข้อความตามต้นฉบับ</p>';
    $('[data-dkp20]', el).disabled = false;
    dk20Related(docid).then(function (g) { rel = g; if (DK_EL === el) { var box = $('#dk20Info', el); if (box) box.innerHTML = dk20Info(r, g); } });
  }).catch(function (e) { if (DK_EL === el) $('#dkBody', el).innerHTML = '<div class="panel"><div class="empty warn"><div class="eic">' + ic('alert') + '</div><h3>ยังเปิดคำพิพากษาไม่สำเร็จ</h3><p>' + esc((e && e.msg) || 'กรุณาลองอีกครั้ง') + '</p><button class="btn k" data-dkretry="1">ลองอีกครั้ง</button></div></div>'; var b = $('[data-dkretry]', el); if (b) b.onclick = function () { openDeka(docid, o); }; });
};
</script>
