<script>

/* =======================================================================
   ชื่อมาตราเชิงวิชาการ — ฐานข้อมูลเปิดหลายแหล่งใช้ชื่อหมวดเป็นชื่อมาตรา (ซ้ำกันหลายมาตรา)
   ระบบจึงเก็บชื่อหมวด/ส่วนไว้ใน s.head (ใช้จัดกลุ่มสารบัญ) และตั้งชื่อมาตราจากสาระสำคัญของตัวบท
   โดยไม่ซ้ำกันภายในกฎหมายฉบับเดียวกัน
   ======================================================================= */
var HEAD_RE = /^(ภาค|ลักษณะ|หมวด|ส่วนที่|ส่วน\s|บรรพ|บทเฉพาะกาล|บทบัญญัติทั่วไป|บทกำหนดโทษ|บทกำหนดโทษ|บทกฎหมายเบื้องต้น|บทนิยาม$|บทบัญญัติเบื้องต้น|บทเบ็ดเสร็จ|ตัวบทฉบับเต็ม|ฉบับเต็ม|มาตรา\s*[0-9๐-๙])/;
var NAME_RULES = [
  [/(?:พระราชบัญญัติ|พระราชกำหนด|ประมวลกฎหมาย|กฎหมาย|ประกาศ|คำสั่ง)นี้เรียกว่า/, 'ชื่อกฎหมาย'],
  [/ให้ใช้บังคับ(?:ตั้งแต่|เมื่อ)|ให้ใช้บังคับนับแต่|ใช้บังคับตั้งแต่วัน/, 'วันใช้บังคับ'],
  [/^ให้ยกเลิก(?!ความ)/, 'การยกเลิกกฎหมายเดิม'],
  [/^ในพระราชบัญญัตินี้|^ในประมวลกฎหมายนี้|^ในพระราชกำหนดนี้|^ในหมวดนี้|^ในส่วนนี้|^ในลักษณะนี้/, 'บทนิยาม'],
  [/รักษาการตาม(?:พระราชบัญญัติ|พระราชกำหนด|ประกาศ|คำสั่ง)นี้/, 'ผู้รักษาการตามกฎหมาย'],
  [/คุณสมบัติและไม่มีลักษณะต้องห้าม|ต้องมีคุณสมบัติ/, 'คุณสมบัติและลักษณะต้องห้าม'],
  [/พ้นจากตำแหน่ง/, 'การพ้นจากตำแหน่ง'],
  [/วาระการดำรงตำแหน่ง|อยู่ในตำแหน่งคราวละ/, 'วาระการดำรงตำแหน่ง'],
  [/องค์ประชุม|การประชุม(?:คณะกรรมการ|ของคณะกรรมการ)/, 'การประชุมและองค์ประชุม'],
  [/มีอำนาจหน้าที่ดังต่อไปนี้|มีหน้าที่และอำนาจดังต่อไปนี้|มีอำนาจหน้าที่|มีหน้าที่และอำนาจ/, 'อำนาจหน้าที่'],
  [/แต่งตั้งคณะอนุกรรมการ/, 'การแต่งตั้งคณะอนุกรรมการ'],
  [/^ให้มีคณะกรรมการ|ให้มีคณะกรรมการคณะหนึ่ง/, 'การจัดตั้งคณะกรรมการ'],
  [/เบี้ยประชุม|ค่าตอบแทน/, 'ค่าตอบแทนและประโยชน์ตอบแทน'],
  [/ค่าธรรมเนียม/, 'ค่าธรรมเนียม'],
  [/อุทธรณ์/, 'การอุทธรณ์'],
  [/เพิกถอนใบอนุญาต|พักใช้ใบอนุญาต/, 'การพักใช้และเพิกถอนใบอนุญาต'],
  [/ขอรับใบอนุญาต|ต้องได้รับใบอนุญาต/, 'การขอรับใบอนุญาต'],
  [/พนักงานเจ้าหน้าที่มีอำนาจ/, 'อำนาจของพนักงานเจ้าหน้าที่'],
  [/อายุความ/, 'อายุความ'],
  [/ประกาศในราชกิจจานุเบกษา/, 'การประกาศในราชกิจจานุเบกษา']
];
function cleanForName_(t) {
  return String(t || '').replace(/\r/g, '').replace(/\[[0-9๐-๙]+\]/g, '').replace(/^\s*มาตรา\s*[0-9๐-๙]+(?:\/[0-9๐-๙]+)?(?:\s*(?:ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|นว|ทศ))?\s*/, '').replace(/\s+/g, ' ').trim();
}
function penaltyName_(t) {
  var m = t.match(/^(?:ผู้ใด|บุคคลใด|ผู้)([^\s(]{4,60})/);
  return 'บทกำหนดโทษ' + (m ? ' กรณี' + cutWords_(m[1].replace(/^ซึ่ง|^ที่/, ''), 30) : '');
}
var SEG_ = null;
try { if (typeof Intl !== 'undefined' && Intl.Segmenter) SEG_ = new Intl.Segmenter('th', { granularity: 'word' }); } catch (e) {}
/* ตัดข้อความตามขอบเขตคำภาษาไทย (ไม่ตัดกลางคำ) */
function cutWords_(s, max) {
  s = String(s || '').trim();
  if (s.length <= max) return s;
  if (SEG_) {
    var out = '', it = SEG_.segment(s)[Symbol.iterator](), r;
    while (!(r = it.next()).done) { if ((out + r.value.segment).length > max) break; out += r.value.segment; }
    return out.trim() || s.slice(0, max);
  }
  var cut = s.lastIndexOf(' ', max); return cut > max / 2 ? s.slice(0, cut) : s.slice(0, max);
}
function phraseName_(t) {
  var s = t.replace(/^(ให้|ใน|ภายใต้บังคับ|ทั้งนี้|อนึ่ง)\s*/, '');
  var words = s.split(' '), out = '';
  for (var i = 0; i < words.length; i++) { if ((out + ' ' + words[i]).trim().length > 46 && out.length >= 14) break; out = (out + ' ' + words[i]).trim(); if (out.length >= 26) break; }
  if (out.length > 40) out = cutWords_(out, 38);
  out = out.replace(/(ดังต่อไปนี้|ดังนี้|และ|หรือ|ซึ่ง|ที่|ของ|ให้|โดย|เมื่อ|แต่)$/, '').trim();
  if (/^ผู้ใด|^บุคคลใด/.test(out)) out = 'กรณี' + out.replace(/^ผู้ใด|^บุคคลใด/, 'บุคคล');
  else if (/^ในกรณีที่|^กรณีที่/.test(t)) out = 'กรณี' + out.replace(/^(?:ใน)?กรณีที่/, '');
  return out || 'บทบัญญัติ';
}
function academicName(text) {
  var t = cleanForName_(text);
  if (!t) return 'บทบัญญัติ';
  if (/^\(?ยกเลิก\)?$/.test(t)) return 'บทบัญญัติที่ถูกยกเลิก';
  var am = t.match(/^ให้ยกเลิกความใน((?:มาตรา|ข้อ)\s*[0-9๐-๙]+(?:\/[0-9๐-๙]+)?(?:\s*(?:ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|นว|ทศ))?)/);
  if (am) return 'การแก้ไขเพิ่มเติม' + am[1].replace(/\s+/, ' ');
  var ad = t.match(/^ให้เพิ่มความต่อไปนี้เป็น((?:มาตรา|ข้อ)\s*[0-9๐-๙]+(?:\/[0-9๐-๙]+)?(?:\s*(?:ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|นว|ทศ))?)/);
  if (ad) return 'การเพิ่ม' + ad[1].replace(/\s+/, ' ');
  if (/ต้องระวางโทษ|ระวางโทษปรับ|ต้องโทษจำคุก/.test(t) && !/อำนาจหน้าที่/.test(t)) return penaltyName_(t);
  for (var i = 0; i < NAME_RULES.length; i++) if (NAME_RULES[i][0].test(t)) return NAME_RULES[i][1];
  return phraseName_(t);
}
/* ตั้งชื่อให้ทุกมาตราในกฎหมายหนึ่งฉบับ (เรียกหลังเพิ่มมาตราเข้าระบบ) */
function nameLawSections(list) {
  if (!list || !list.length) return;
  var cnt = {};
  list.forEach(function (s) { if (s._named) return; cnt[s.name] = (cnt[s.name] || 0) + 1; });
  var used = {};
  list.forEach(function (s) { if (s._named) used[s.name] = 1; });
  list.forEach(function (s) {
    if (s._named) return;
    var orig = String(s.name || '').trim();
    var needs = !orig || HEAD_RE.test(orig) || cnt[orig] > 1 || orig.length > 90 || /…$/.test(orig);
    if (needs) {
      if (orig && !s.head && !/^มาตรา|^ตัวบทฉบับเต็ม|^ฉบับเต็ม/.test(orig) && !/…$/.test(orig) && (HEAD_RE.test(orig) || cnt[orig] > 1)) s.head = orig;
      var nm = academicName(s.text);
      if (used[nm]) {
        var alt = phraseName_(cleanForName_(s.text).split(' ').slice(3).join(' ')), cand = nm + ' (' + alt + ')';
        nm = used[cand] || !alt || alt === 'บทบัญญัติ' ? nm + ' (มาตรา ' + s.no + ')' : cand;
      }
      s.name = nm;
    }
    used[s.name] = 1; s._named = 1;
  });
}

/* =======================================================================
   คำย่อและคำเฉพาะ (ไทย/อังกฤษ) สำหรับการค้นหา + กล่องคำแนะนำที่แสดงเฉพาะเมื่อพิมพ์
   ======================================================================= */
var LAW_ALIASES = [
  [['ป.พ.พ.', 'ปพพ', 'แพ่งและพาณิชย์', 'civil and commercial code', 'civil code', 'ccc'], 'ประมวลกฎหมายแพ่งและพาณิชย์'],
  [['ป.อ.', 'ปอ', 'กฎหมายอาญา', 'criminal code', 'penal code'], 'ประมวลกฎหมายอาญา'],
  [['ป.วิ.พ.', 'ปวิพ', 'วิแพ่ง', 'civil procedure'], 'ประมวลกฎหมายวิธีพิจารณาความแพ่ง'],
  [['ป.วิ.อ.', 'ปวิอ', 'วิอาญา', 'criminal procedure'], 'ประมวลกฎหมายวิธีพิจารณาความอาญา'],
  [['ป.รัษฎากร', 'รัษฎากร', 'revenue code', 'tax code'], 'ประมวลรัษฎากร'],
  [['ป.ที่ดิน', 'land code'], 'ประมวลกฎหมายที่ดิน'],
  [['รธน.', 'รธน', 'constitution'], 'รัฐธรรมนูญแห่งราชอาณาจักรไทย'],
  [['พ.ร.บ.', 'พรบ', 'act'], 'พระราชบัญญัติ'],
  [['พ.ร.ก.', 'พรก', 'emergency decree'], 'พระราชกำหนด'],
  [['พ.ร.ป.', 'พรป', 'organic act'], 'พระราชบัญญัติประกอบรัฐธรรมนูญ'],
  [['พ.ร.ฎ.', 'พรฎ', 'royal decree'], 'พระราชกฤษฎีกา'],
  [['คสช.', 'ncpo'], 'คณะรักษาความสงบแห่งชาติ'],
  [['คปค.'], 'คณะปฏิรูปการปกครอง'],
  [['ปว.', 'ปร.'], 'ประกาศของคณะปฏิวัติ'],
  [['pdpa', 'personal data protection', 'คุ้มครองข้อมูล'], 'คุ้มครองข้อมูลส่วนบุคคล'],
  [['computer crime', 'คอมพิวเตอร์', 'พ.ร.บ.คอม'], 'การกระทำความผิดเกี่ยวกับคอมพิวเตอร์'],
  [['labour protection', 'labor protection', 'แรงงาน'], 'คุ้มครองแรงงาน'],
  [['copyright', 'ลิขสิทธิ์'], 'ลิขสิทธิ์'],
  [['trademark', 'เครื่องหมายการค้า'], 'เครื่องหมายการค้า'],
  [['patent', 'สิทธิบัตร'], 'สิทธิบัตร'],
  [['consumer protection', 'ผู้บริโภค'], 'คุ้มครองผู้บริโภค'],
  [['land traffic', 'traffic', 'จราจร'], 'จราจรทางบก'],
  [['narcotics', 'drug', 'ยาเสพติด'], 'ยาเสพติด'],
  [['bankruptcy', 'ล้มละลาย'], 'ล้มละลาย'],
  [['anti-money laundering', 'aml', 'ฟอกเงิน'], 'ป้องกันและปราบปรามการฟอกเงิน'],
  [['administrative procedure', 'วิธีปฏิบัติราชการ', 'วิ.ปกครอง'], 'วิธีปฏิบัติราชการทางปกครอง'],
  [['administrative court', 'ศาลปกครอง'], 'จัดตั้งศาลปกครองและวิธีพิจารณาคดีปกครอง'],
  [['juvenile', 'family court', 'เยาวชน', 'ศาลเยาวชน'], 'ศาลเยาวชนและครอบครัว'],
  [['public company', 'บริษัทมหาชน'], 'บริษัทมหาชนจำกัด'],
  [['securities', 'หลักทรัพย์'], 'หลักทรัพย์และตลาดหลักทรัพย์'],
  [['immigration', 'คนเข้าเมือง'], 'คนเข้าเมือง'],
  [['nationality', 'สัญชาติ'], 'สัญชาติ'],
  [['firearms', 'อาวุธปืน'], 'อาวุธปืน'],
  [['electronic transactions', 'ธุรกรรมทางอิเล็กทรอนิกส์'], 'ธุรกรรมทางอิเล็กทรอนิกส์'],
  [['anti-corruption', 'ปปช', 'ป.ป.ช.'], 'ป้องกันและปราบปรามการทุจริต'],
  [['election', 'เลือกตั้ง', 'กกต'], 'การเลือกตั้ง'],
  [['ม.', 'section', 'sec.', 's.'], 'มาตรา'],
  [['tort', 'ละเมิด'], 'ละเมิด'],
  [['contract', 'สัญญา'], 'สัญญา'],
  [['juristic act', 'นิติกรรม'], 'นิติกรรม'],
  [['theft', 'ลักทรัพย์'], 'ลักทรัพย์'],
  [['fraud', 'ฉ้อโกง'], 'ฉ้อโกง'],
  [['defamation', 'หมิ่นประมาท'], 'หมิ่นประมาท'],
  [['murder', 'homicide', 'ฆ่าผู้อื่น'], 'ฆ่าผู้อื่น'],
  [['self-defense', 'self defence', 'ป้องกันโดยชอบ'], 'ป้องกันโดยชอบด้วยกฎหมาย'],
  [['statute of limitations', 'prescription', 'อายุความ'], 'อายุความ'],
  [['succession', 'inheritance', 'มรดก'], 'มรดก'],
  [['marriage', 'สมรส'], 'สมรส'],
  [['lease', 'เช่าทรัพย์'], 'เช่าทรัพย์'],
  [['sale', 'ซื้อขาย'], 'ซื้อขาย'],
  [['loan', 'กู้ยืม'], 'กู้ยืม'],
  [['mortgage', 'จำนอง'], 'จำนอง'],
  [['pledge', 'จำนำ'], 'จำนำ'],
  [['partnership', 'ห้างหุ้นส่วน'], 'ห้างหุ้นส่วน'],
  [['company', 'บริษัท'], 'บริษัท']
];
function normA_(s) { return String(s || '').toLowerCase().replace(/[\s.]/g, ''); }
var ALIAS_IDX = null;
function aliasIndex_() {
  if (ALIAS_IDX) return ALIAS_IDX;
  ALIAS_IDX = [];
  LAW_ALIASES.forEach(function (a) { a[0].forEach(function (k) { ALIAS_IDX.push({ k: normA_(k), raw: k, full: a[1] }); }); });
  return ALIAS_IDX;
}
/* ขยายคำค้นหา: คำย่อ/คำภาษาอังกฤษ → คำเต็มภาษาไทย (คืนค่ารายการคำค้นที่ใช้ได้ทั้งหมด) */
function expandQuery(q) {
  var raw = String(q || '').trim(), out = [raw], nq = normA_(raw);
  if (!nq) return out;
  aliasIndex_().forEach(function (a) {
    if (a.k === nq) out.push(a.full);
    else if (a.k.length >= 3 && nq.indexOf(a.k) === 0) out.push(a.full + ' ' + raw.slice(a.raw.length).trim());
  });
  return out.filter(function (x, i) { return x && out.indexOf(x) === i; });
}
/* รายการคำแนะนำ: กฎหมาย + คำย่อ + คำเฉพาะ (แสดงเมื่อพิมพ์อย่างน้อย 1 ตัวอักษร) */
function suggestFor(q, opt) {
  opt = opt || {};
  var raw = String(q || '').trim(); if (!raw) return [];
  var nq = normA_(raw), out = [], seen = {};
  function add(label, value, kind) { if (seen[value] || out.length >= (opt.max || 8)) return; seen[value] = 1; out.push({ label: label, value: value, kind: kind }); }
  aliasIndex_().forEach(function (a) { if (a.k.indexOf(nq) === 0 || (nq.length >= 2 && normA_(a.full).indexOf(nq) > -1)) add(a.raw + ' = ' + a.full, a.full, 'คำย่อ/คำเฉพาะ'); });
  var exps = expandQuery(raw).map(norm);
  if (typeof S !== 'undefined' && S.catalog) {
    S.catalog.laws.forEach(function (l) {
      if (opt.cat && l.cat !== opt.cat) return;
      var hay = norm(l.title + ' ' + (l.short || ''));
      if (exps.some(function (e) { return e && hay.indexOf(e) > -1; })) add(l.title, l.title, l.cat);
    });
  }
  return out;
}
function attachSuggest(input, opt) {
  opt = opt || {};
  var wrap = input.closest('.input') || input.parentNode;
  wrap.classList.add('sg-host');
  var box = document.createElement('div'); box.className = 'sg-box hidden'; box.setAttribute('role', 'listbox');
  wrap.appendChild(box);
  input.setAttribute('autocomplete', 'off'); input.setAttribute('aria-autocomplete', 'list');
  var items = [], act = -1;
  function close() { box.classList.add('hidden'); act = -1; }
  function render() {
    var q = input.value.trim();
    items = q ? suggestFor(q, { cat: opt.cat && opt.cat(), max: 8 }) : [];
    if (!items.length || items.some(function (it) { return it.value === q; })) { close(); return; }
    box.innerHTML = items.map(function (it, i) { return '<button type="button" class="sg-it' + (i === act ? ' on' : '') + '" data-i="' + i + '" role="option"><span class="sg-l">' + highlight(esc(it.label), q) + '</span><span class="sg-k">' + esc(it.kind) + '</span></button>'; }).join('');
    box.classList.remove('hidden');
  }
  function pick(i) { var it = items[i]; if (!it) return; input.value = it.value; close(); input.dispatchEvent(new Event('input', { bubbles: true })); if (opt.onPick) opt.onPick(it); }
  input.addEventListener('input', function (e) { if (e.isTrusted !== false) { act = -1; render(); } });
  input.addEventListener('focus', function () { if (input.value.trim()) render(); });
  input.addEventListener('keydown', function (e) {
    if (box.classList.contains('hidden')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); act = Math.min(act + 1, items.length - 1); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); act = Math.max(act - 1, 0); render(); }
    else if (e.key === 'Enter' && act > -1) { e.preventDefault(); pick(act); }
    else if (e.key === 'Escape') close();
  });
  box.addEventListener('mousedown', function (e) { e.preventDefault(); });
  box.addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (b) pick(+b.getAttribute('data-i')); });
  input.addEventListener('blur', function () { setTimeout(close, 120); });
  document.addEventListener('pointerdown', function (e) { if (!wrap.contains(e.target)) close(); }, true);
  return { close: close };
}

/* =======================================================================
   พจนานุกรม: ศัพท์กฎหมายไทย (เพิ่มเติม) และศัพท์กฎหมายอังกฤษ–ไทย
   เว็บไซต์พจนานุกรมของสำนักงานราชบัณฑิตยสภาและ dictionary-law.com ไม่เปิดบริการให้ดึงข้อมูลอัตโนมัติ
   จึงเรียบเรียงคำอธิบายขึ้นเองจากตัวบทกฎหมาย และแสดงลิงก์ไปยังพจนานุกรมทางการเพื่อตรวจสอบ
   ======================================================================= */
DICT.push(
  ['สัญญา', 'นิติกรรมหลายฝ่ายที่เกิดจากคำเสนอและคำสนองที่ถูกต้องตรงกัน ก่อให้เกิดหนี้ผูกพันคู่สัญญา'],
  ['คำเสนอ', 'การแสดงเจตนาขอทำสัญญาที่มีข้อความชัดเจนแน่นอน เมื่อผู้รับคำเสนอสนองรับ สัญญาย่อมเกิดขึ้น'],
  ['หนี้', 'นิติสัมพันธ์ระหว่างเจ้าหนี้และลูกหนี้ ซึ่งเจ้าหนี้มีสิทธิเรียกให้ลูกหนี้กระทำการ งดเว้นกระทำการ หรือส่งมอบทรัพย์สิน (ป.พ.พ. มาตรา 194)'],
  ['ผิดนัด', 'การที่ลูกหนี้ไม่ชำระหนี้เมื่อหนี้ถึงกำหนดและเจ้าหนี้เตือนแล้ว หรือหนี้มีกำหนดเวลาตามวันแห่งปฏิทิน ทำให้ลูกหนี้ต้องรับผิดในความเสียหาย'],
  ['ดอกเบี้ยผิดนัด', 'ดอกเบี้ยที่ลูกหนี้ต้องชำระเมื่อผิดนัดชำระหนี้เงิน ตามอัตราที่กฎหมายกำหนด (ป.พ.พ. มาตรา 224)'],
  ['ลาภมิควรได้', 'ทรัพย์สินที่บุคคลได้มาโดยไม่มีมูลอันจะอ้างกฎหมายได้ และเป็นทางให้บุคคลอื่นเสียเปรียบ ต้องคืนให้แก่เขา (ป.พ.พ. มาตรา 406)'],
  ['จัดการงานนอกสั่ง', 'การเข้าทำกิจการแทนผู้อื่นโดยเขามิได้วานขอหรือไม่มีสิทธิจะทำการงานนั้นแทน ผู้จัดการต้องทำให้สมประโยชน์ของตัวการ'],
  ['ตัวแทน', 'บุคคลที่มีอำนาจทำการแทนบุคคลอื่นซึ่งเรียกว่าตัวการ และรับจะทำการดังนั้น (ป.พ.พ. มาตรา 797)'],
  ['ค้ำประกัน', 'สัญญาที่บุคคลภายนอกเรียกว่าผู้ค้ำประกัน ผูกพันตนต่อเจ้าหนี้เพื่อชำระหนี้ในเมื่อลูกหนี้ไม่ชำระหนี้นั้น (ป.พ.พ. มาตรา 680)'],
  ['จำนอง', 'สัญญาที่ผู้จำนองเอาทรัพย์สินตราไว้แก่ผู้รับจำนองเป็นประกันการชำระหนี้ โดยไม่ต้องส่งมอบทรัพย์สินนั้น (ป.พ.พ. มาตรา 702)'],
  ['จำนำ', 'สัญญาที่ผู้จำนำส่งมอบสังหาริมทรัพย์สิ่งหนึ่งให้แก่ผู้รับจำนำเพื่อเป็นประกันการชำระหนี้ (ป.พ.พ. มาตรา 747)'],
  ['สังหาริมทรัพย์', 'ทรัพย์สินอื่นนอกจากอสังหาริมทรัพย์ รวมทั้งสิทธิอันเกี่ยวกับทรัพย์สินนั้น (ป.พ.พ. มาตรา 140)'],
  ['อสังหาริมทรัพย์', 'ที่ดินและทรัพย์อันติดอยู่กับที่ดินมีลักษณะเป็นการถาวรหรือประกอบเป็นอันเดียวกับที่ดิน รวมทั้งทรัพยสิทธิอันเกี่ยวกับที่ดิน (ป.พ.พ. มาตรา 139)'],
  ['ส่วนควบ', 'ส่วนซึ่งโดยสภาพแห่งทรัพย์หรือโดยจารีตประเพณีเป็นสาระสำคัญในความเป็นอยู่ของทรัพย์นั้น ไม่อาจแยกจากกันได้นอกจากจะทำลายหรือทำให้บุบสลาย (ป.พ.พ. มาตรา 144)'],
  ['ดอกผล', 'ดอกผลธรรมดาและดอกผลนิตินัยที่เกิดจากทรัพย์ เช่น ผลไม้ ลูกของสัตว์ ค่าเช่า ดอกเบี้ย (ป.พ.พ. มาตรา 148)'],
  ['สินสมรส', 'ทรัพย์สินที่คู่สมรสได้มาระหว่างสมรส ทรัพย์สินที่ได้มาโดยพินัยกรรมหรือโดยการให้เป็นหนังสือเมื่อระบุว่าเป็นสินสมรส และดอกผลของสินส่วนตัว (ป.พ.พ. มาตรา 1474)'],
  ['สินส่วนตัว', 'ทรัพย์สินที่คู่สมรสฝ่ายหนึ่งมีอยู่ก่อนสมรส เครื่องใช้สอยส่วนตัว เครื่องมือประกอบอาชีพ หรือที่ได้มาโดยการรับมรดกหรือโดยเสน่หา (ป.พ.พ. มาตรา 1471)'],
  ['ผู้จัดการมรดก', 'บุคคลที่ได้รับแต่งตั้งโดยพินัยกรรมหรือโดยคำสั่งศาล มีหน้าที่รวบรวม จัดการ และแบ่งปันทรัพย์มรดกแก่ทายาท'],
  ['ความผิดลหุโทษ', 'ความผิดซึ่งต้องระวางโทษจำคุกไม่เกินหนึ่งเดือน หรือปรับไม่เกินหนึ่งหมื่นบาท หรือทั้งจำทั้งปรับ (ป.อ. มาตรา 102)'],
  ['กรรมเดียวผิดกฎหมายหลายบท', 'การกระทำอันเดียวที่เป็นความผิดต่อกฎหมายหลายบท ให้ใช้กฎหมายบทที่มีโทษหนักที่สุดลงโทษแก่ผู้กระทำความผิด (ป.อ. มาตรา 90)'],
  ['รอการลงโทษ', 'การที่ศาลพิพากษาว่าจำเลยมีความผิดแต่รอการกำหนดโทษหรือรอการลงโทษไว้ ภายใต้เงื่อนไขคุมความประพฤติ (ป.อ. มาตรา 56)'],
  ['บันดาลโทสะ', 'การกระทำความผิดเพราะถูกข่มเหงอย่างร้ายแรงด้วยเหตุอันไม่เป็นธรรม ศาลจะลงโทษน้อยกว่าที่กฎหมายกำหนดไว้เพียงใดก็ได้ (ป.อ. มาตรา 72)'],
  ['จำเป็น', 'การกระทำเพื่อให้ตนเองหรือผู้อื่นพ้นจากภยันตรายที่ใกล้จะถึงและไม่สามารถหลีกเลี่ยงให้พ้นโดยวิธีอื่นได้ หากไม่เกินสมควรแก่เหตุ ผู้กระทำไม่ต้องรับโทษ (ป.อ. มาตรา 67)'],
  ['พนักงานสอบสวน', 'บุคคลซึ่งกฎหมายให้มีอำนาจและหน้าที่ทำการสอบสวน (ป.วิ.อ. มาตรา 2 (6))'],
  ['ไต่สวนมูลฟ้อง', 'กระบวนการที่ศาลตรวจว่าคดีที่ราษฎรฟ้องเองมีมูลหรือไม่ ก่อนประทับรับฟ้อง'],
  ['ปล่อยชั่วคราว', 'การปล่อยผู้ต้องหาหรือจำเลยระหว่างสอบสวนหรือพิจารณา โดยมีหรือไม่มีประกันหรือหลักประกัน'],
  ['คุ้มครองชั่วคราว', 'วิธีการที่ศาลกำหนดเพื่อคุ้มครองสิทธิของคู่ความระหว่างพิจารณา เช่น ยึดหรืออายัดทรัพย์สินก่อนพิพากษา'],
  ['ทุนทรัพย์', 'ราคาทรัพย์สินหรือจำนวนเงินที่พิพาทกันในคดีแพ่ง ใช้กำหนดค่าธรรมเนียมศาลและสิทธิอุทธรณ์ฎีกา'],
  ['คำสั่งทางปกครอง', 'การใช้อำนาจตามกฎหมายของเจ้าหน้าที่ที่มีผลเป็นการสร้างนิติสัมพันธ์ขึ้นระหว่างบุคคล เช่น การสั่งการ การอนุญาต การอนุมัติ (พ.ร.บ.วิธีปฏิบัติราชการทางปกครอง มาตรา 5)'],
  ['ข้อมูลส่วนบุคคล', 'ข้อมูลเกี่ยวกับบุคคลซึ่งทำให้สามารถระบุตัวบุคคลนั้นได้ไม่ว่าทางตรงหรือทางอ้อม ไม่รวมถึงข้อมูลของผู้ถึงแก่กรรม (พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล มาตรา 6)']
);
var DICT_EN = [
  ['Act', 'พระราชบัญญัติ', 'กฎหมายที่ตราขึ้นโดยฝ่ายนิติบัญญัติ'],
  ['Acquittal', 'การพิพากษายกฟ้อง', 'คำพิพากษาว่าจำเลยไม่มีความผิด'],
  ['Adverse possession', 'การครอบครองปรปักษ์', 'การได้กรรมสิทธิ์โดยครอบครองทรัพย์ของผู้อื่นโดยสงบ เปิดเผย ด้วยเจตนาเป็นเจ้าของตามระยะเวลาที่กฎหมายกำหนด'],
  ['Affidavit', 'คำให้การเป็นหนังสือที่สาบานตน', 'ข้อความที่บุคคลยืนยันความจริงเป็นลายลักษณ์อักษรภายใต้คำสาบาน'],
  ['Agent', 'ตัวแทน', 'บุคคลที่มีอำนาจทำการแทนตัวการ'],
  ['Appeal', 'อุทธรณ์', 'การขอให้ศาลสูงตรวจสอบคำพิพากษาหรือคำสั่งของศาลล่าง'],
  ['Arbitration', 'อนุญาโตตุลาการ', 'การระงับข้อพิพาทนอกศาลโดยให้บุคคลที่สามชี้ขาด'],
  ['Bail', 'การปล่อยชั่วคราว / หลักประกัน', 'การปล่อยผู้ต้องหาหรือจำเลยระหว่างดำเนินคดีโดยมีหลักประกัน'],
  ['Bankruptcy', 'ล้มละลาย', 'สถานะทางกฎหมายของลูกหนี้ที่มีหนี้สินล้นพ้นตัวและศาลมีคำสั่งพิทักษ์ทรัพย์'],
  ['Beyond reasonable doubt', 'ปราศจากข้อสงสัยตามสมควร', 'มาตรฐานการพิสูจน์ในคดีอาญา'],
  ['Breach of contract', 'การผิดสัญญา', 'การไม่ปฏิบัติตามข้อตกลงในสัญญา'],
  ['Burden of proof', 'ภาระการพิสูจน์', 'หน้าที่นำพยานหลักฐานมาพิสูจน์ข้อเท็จจริงที่ตนกล่าวอ้าง'],
  ['Capacity', 'ความสามารถ', 'ความสามารถในการใช้สิทธิและทำนิติกรรม'],
  ['Cause of action', 'มูลคดี / เหตุแห่งการฟ้อง', 'ข้อเท็จจริงที่ทำให้บุคคลมีสิทธิฟ้องร้อง'],
  ['Civil and Commercial Code', 'ประมวลกฎหมายแพ่งและพาณิชย์', 'ประมวลกฎหมายหลักว่าด้วยบุคคล หนี้ ทรัพย์ ครอบครัว และมรดก'],
  ['Compensation', 'ค่าสินไหมทดแทน', 'การชดใช้ความเสียหาย'],
  ['Consideration', 'สิ่งตอบแทน', 'สิ่งที่คู่สัญญาให้แก่กันเพื่อแลกเปลี่ยน (หลักกฎหมายคอมมอนลอว์)'],
  ['Constitution', 'รัฐธรรมนูญ', 'กฎหมายสูงสุดของประเทศ'],
  ['Contract', 'สัญญา', 'ข้อตกลงที่มีผลผูกพันตามกฎหมาย'],
  ['Copyright', 'ลิขสิทธิ์', 'สิทธิแต่ผู้เดียวของผู้สร้างสรรค์ในงานอันมีลิขสิทธิ์'],
  ['Court of Appeal', 'ศาลอุทธรณ์', 'ศาลชั้นกลางที่พิจารณาอุทธรณ์คำพิพากษาของศาลชั้นต้น'],
  ['Criminal Code', 'ประมวลกฎหมายอาญา', 'ประมวลกฎหมายว่าด้วยความผิดและโทษ'],
  ['Damages', 'ค่าเสียหาย', 'จำนวนเงินที่ศาลกำหนดให้ชดใช้ความเสียหาย'],
  ['Default', 'การผิดนัด', 'การไม่ชำระหนี้ตามกำหนด'],
  ['Defamation', 'หมิ่นประมาท', 'การใส่ความผู้อื่นต่อบุคคลที่สามในประการที่น่าจะทำให้ผู้อื่นเสียชื่อเสียง'],
  ['Defendant', 'จำเลย', 'คู่ความฝ่ายที่ถูกฟ้อง'],
  ['Due process', 'กระบวนการอันชอบด้วยกฎหมาย', 'หลักที่รัฐต้องดำเนินการต่อบุคคลตามกระบวนการที่เป็นธรรม'],
  ['Easement / Servitude', 'ภารจำยอม', 'ทรัพยสิทธิที่ทำให้เจ้าของอสังหาริมทรัพย์ต้องยอมรับกรรมบางอย่าง'],
  ['Emergency Decree', 'พระราชกำหนด', 'กฎหมายที่ฝ่ายบริหารตราขึ้นในกรณีฉุกเฉินและจำเป็นรีบด่วน'],
  ['Estate', 'กองมรดก', 'ทรัพย์สิน สิทธิ หน้าที่ และความรับผิดของผู้ตาย'],
  ['Evidence', 'พยานหลักฐาน', 'สิ่งที่ใช้พิสูจน์ข้อเท็จจริงในคดี'],
  ['Execution of judgment', 'การบังคับคดี', 'การดำเนินการให้เป็นไปตามคำพิพากษา'],
  ['Fraud', 'ฉ้อโกง / กลฉ้อฉล', 'การหลอกลวงเพื่อให้ได้ทรัพย์สินหรือประโยชน์โดยมิชอบ'],
  ['Good faith', 'สุจริต', 'ความซื่อสัตย์ในการใช้สิทธิและชำระหนี้'],
  ['Guarantee / Suretyship', 'ค้ำประกัน', 'สัญญาที่บุคคลภายนอกผูกพันตนชำระหนี้แทนลูกหนี้'],
  ['Heir', 'ทายาท', 'บุคคลผู้มีสิทธิรับมรดก'],
  ['Injunction', 'คำสั่งห้าม / วิธีการคุ้มครองชั่วคราว', 'คำสั่งศาลให้กระทำหรืองดเว้นกระทำการ'],
  ['Intent', 'เจตนา', 'การกระทำโดยรู้สำนึกและประสงค์ต่อผลหรือเล็งเห็นผล'],
  ['Joint offender', 'ตัวการร่วม', 'ผู้ร่วมกระทำความผิดตั้งแต่สองคนขึ้นไป'],
  ['Judgment', 'คำพิพากษา', 'การวินิจฉัยชี้ขาดคดีของศาล'],
  ['Jurisdiction', 'เขตอำนาจศาล', 'อำนาจของศาลในการพิจารณาพิพากษาคดี'],
  ['Juristic act', 'นิติกรรม', 'การกระทำโดยชอบด้วยกฎหมายและด้วยใจสมัครเพื่อก่อนิติสัมพันธ์'],
  ['Juristic person', 'นิติบุคคล', 'บุคคลที่กฎหมายสมมติขึ้นให้มีสิทธิหน้าที่'],
  ['Lease', 'เช่าทรัพย์', 'สัญญาที่ผู้ให้เช่าให้ผู้เช่าได้ใช้ประโยชน์ในทรัพย์สินชั่วระยะเวลาโดยได้ค่าเช่า'],
  ['Liability', 'ความรับผิด', 'หน้าที่ตามกฎหมายที่ต้องรับผลจากการกระทำ'],
  ['Limitation period / Prescription', 'อายุความ', 'ระยะเวลาที่กฎหมายกำหนดให้ใช้สิทธิเรียกร้อง'],
  ['Litigation', 'การดำเนินคดี', 'กระบวนการฟ้องร้องและพิจารณาคดีในศาล'],
  ['Minor', 'ผู้เยาว์', 'บุคคลที่ยังไม่บรรลุนิติภาวะ'],
  ['Mortgage', 'จำนอง', 'การเอาทรัพย์สินตราไว้เป็นประกันการชำระหนี้โดยไม่ส่งมอบ'],
  ['Negligence', 'ประมาทเลินเล่อ', 'การกระทำโดยปราศจากความระมัดระวังที่ควรมี'],
  ['Null and void', 'โมฆะ', 'ไม่มีผลทางกฎหมายมาแต่ต้น'],
  ['Obligation', 'หนี้', 'นิติสัมพันธ์ที่เจ้าหนี้มีสิทธิเรียกให้ลูกหนี้ชำระหนี้'],
  ['Ownership', 'กรรมสิทธิ์', 'ทรัพยสิทธิที่สมบูรณ์ที่สุดเหนือทรัพย์สิน'],
  ['Partnership', 'ห้างหุ้นส่วน', 'สัญญาที่บุคคลตั้งแต่สองคนขึ้นไปตกลงเข้ากันเพื่อกระทำกิจการร่วมกันด้วยประสงค์จะแบ่งปันกำไร'],
  ['Plaintiff', 'โจทก์', 'คู่ความฝ่ายที่ยื่นฟ้อง'],
  ['Pledge', 'จำนำ', 'การส่งมอบสังหาริมทรัพย์เป็นประกันการชำระหนี้'],
  ['Power of attorney', 'หนังสือมอบอำนาจ', 'เอกสารแสดงการมอบอำนาจให้ผู้อื่นทำการแทน'],
  ['Precedent', 'บรรทัดฐานคำพิพากษา', 'คำพิพากษาที่เป็นแนวทางในการวินิจฉัยคดีต่อมา'],
  ['Presumption', 'ข้อสันนิษฐาน', 'ข้อเท็จจริงที่กฎหมายให้ถือว่าเป็นจริงจนกว่าจะพิสูจน์ได้เป็นอย่างอื่น'],
  ['Public prosecutor', 'พนักงานอัยการ', 'เจ้าพนักงานผู้มีหน้าที่ฟ้องผู้ต้องหาต่อศาล'],
  ['Real right', 'ทรัพยสิทธิ', 'สิทธิเหนือทรัพย์สินที่ใช้ยันบุคคลทั่วไปได้'],
  ['Res judicata', 'ฟ้องซ้ำ / คดีที่ศาลวินิจฉัยถึงที่สุดแล้ว', 'หลักห้ามฟ้องในประเด็นที่ศาลวินิจฉัยถึงที่สุดแล้ว'],
  ['Royal Decree', 'พระราชกฤษฎีกา', 'กฎหมายลำดับรองที่ออกโดยอาศัยอำนาจตามรัฐธรรมนูญหรือพระราชบัญญัติ'],
  ['Sale', 'ซื้อขาย', 'สัญญาที่ผู้ขายโอนกรรมสิทธิ์ให้ผู้ซื้อและผู้ซื้อตกลงใช้ราคา'],
  ['Section', 'มาตรา', 'หน่วยย่อยของบทบัญญัติในกฎหมาย'],
  ['Self-defence', 'ป้องกันโดยชอบด้วยกฎหมาย', 'การกระทำเพื่อป้องกันสิทธิจากภยันตรายที่ละเมิดต่อกฎหมายและใกล้จะถึง'],
  ['Statute', 'บทบัญญัติแห่งกฎหมาย', 'กฎหมายที่ตราขึ้นเป็นลายลักษณ์อักษร'],
  ['Subsection / Paragraph', 'วรรค / อนุมาตรา', 'ส่วนย่อยภายในมาตรา'],
  ['Succession', 'มรดก / การสืบมรดก', 'การตกทอดแห่งทรัพย์สินของผู้ตายไปยังทายาท'],
  ['Supreme Court', 'ศาลฎีกา', 'ศาลสูงสุดในระบบศาลยุติธรรม'],
  ['Testimony', 'คำเบิกความ', 'ถ้อยคำที่พยานให้ต่อศาล'],
  ['Theft', 'ลักทรัพย์', 'การเอาทรัพย์ของผู้อื่นไปโดยทุจริต'],
  ['Tort', 'ละเมิด', 'การกระทำโดยจงใจหรือประมาทเลินเล่อต่อบุคคลอื่นโดยผิดกฎหมายให้เขาเสียหาย'],
  ['Trademark', 'เครื่องหมายการค้า', 'เครื่องหมายที่ใช้กับสินค้าเพื่อแสดงว่าสินค้าแตกต่างจากของผู้อื่น'],
  ['Unjust enrichment', 'ลาภมิควรได้', 'การได้ทรัพย์สินมาโดยไม่มีมูลอันจะอ้างกฎหมายได้'],
  ['Voidable', 'โมฆียะ', 'มีผลสมบูรณ์จนกว่าจะถูกบอกล้าง'],
  ['Will / Testament', 'พินัยกรรม', 'คำสั่งเผื่อตายเกี่ยวกับทรัพย์สินหรือกิจการ'],
  ['Witness', 'พยานบุคคล', 'บุคคลที่มาให้ถ้อยคำต่อศาล']
];
TOOL_UI.dict = function (b) {
  var mode = (S.ui.dictMode === 'en') ? 'en' : 'th';
  b.innerHTML = '<div class="row wrapr" style="gap:10px;margin-bottom:12px"><div class="seg" id="dMode"><button data-m="th" class="' + (mode === 'th' ? 'on' : '') + '">ไทย–ไทย (' + DICT.length + ')</button><button data-m="en" class="' + (mode === 'en' ? 'on' : '') + '">อังกฤษ–ไทย (' + DICT_EN.length + ')</button></div>' +
    '<div class="input grow" style="min-width:220px">' + ic('search') + '<input id="dQ" placeholder="ค้นหาศัพท์กฎหมาย ภาษาไทยหรือภาษาอังกฤษ"></div></div><div class="grid g2" id="dList"></div>' +
    '<p class="tiny muted" style="margin-top:14px">คำอธิบายเรียบเรียงจากตัวบทกฎหมายเพื่อการศึกษา ตรวจสอบความหมายทางการได้ที่ พจนานุกรมฉบับราชบัณฑิตยสถาน (dictionary.orst.go.th) และศัพท์กฎหมายไทย–อังกฤษของสำนักงานคณะกรรมการกฤษฎีกา</p>';
  function draw() {
    var q = norm($('#dQ', b).value), rq = $('#dQ', b).value.trim();
    var html = mode === 'th'
      ? DICT.filter(function (d) { return !q || norm(d[0] + d[1]).indexOf(q) > -1; }).sort(function (a, c) { return a[0].localeCompare(c[0], 'th'); }).map(function (d) { return '<div class="panel flat"><h3>' + highlight(esc(d[0]), rq) + '</h3><p class="muted" style="margin-top:4px">' + highlight(esc(d[1]), rq) + '</p></div>'; }).join('')
      : DICT_EN.filter(function (d) { return !q || norm(d.join(' ')).indexOf(q) > -1; }).map(function (d) { return '<div class="panel flat"><h3>' + highlight(esc(d[0]), rq) + '</h3><div class="tag" style="margin-top:4px">' + highlight(esc(d[1]), rq) + '</div><p class="muted" style="margin-top:6px">' + highlight(esc(d[2]), rq) + '</p></div>'; }).join('');
    $('#dList', b).innerHTML = html || '<p class="muted">ไม่พบคำที่ค้นหา</p>';
  }
  on($('#dMode', b), 'click', '[data-m]', function (e, x) { mode = x.getAttribute('data-m'); S.ui.dictMode = mode; store.set('ui', S.ui); $$('#dMode button', b).forEach(function (y) { y.classList.toggle('on', y === x); }); draw(); });
  $('#dQ', b).addEventListener('input', debounce(draw, 120)); draw();
};

/* เอกสาร PDF ทางการ (โลโก้ตรงกลาง ชื่อไทย/อังกฤษ) สร้างที่เซิร์ฟเวอร์ แล้วดาวน์โหลดลงเครื่องโดยตรง */
function officialPdf(action, text) {
  return withLoading(text || 'กำลังสร้างเอกสาร PDF', api(action, { logo: LOGO }, { timeout: 90000 })).then(function (r) {
    downloadBase64(r.name, r.base64, 'application/pdf');
    toast('ดาวน์โหลดเอกสาร PDF แล้ว', r.name, 'ok');
  }).catch(function (e) { toast('สร้างเอกสาร PDF ไม่สำเร็จ', (e && e.msg) || 'กรุณาลองใหม่อีกครั้ง', 'bad'); });
}

/* ดูรูปโปรไฟล์เต็มจอ (วงกลม) — ปิดได้โดยแตะด้านนอก ปุ่มปิด หรือกด Esc */
function openAvatarViewer(src, alt) {
  if (!src || document.querySelector('.av-view')) return;
  var v = h('<div class="av-view" role="dialog" aria-modal="true" aria-label="รูปโปรไฟล์"><button class="av-x" aria-label="ปิด">' + ic('x') + '<span>ปิด</span></button><img class="av-big" alt="' + esc(alt || 'รูปโปรไฟล์') + '"></div>');
  v.querySelector('img').src = src;
  document.body.appendChild(v); syncScrollLock();
  requestAnimationFrame(function () { v.classList.add('on'); });
  function close() { v.classList.remove('on'); document.removeEventListener('keydown', key); setTimeout(function () { v.remove(); syncScrollLock(); }, 250); }
  function key(e) { if (e.key === 'Escape') close(); }
  v.addEventListener('click', function (e) { if (e.target === v || e.target.closest('.av-x')) close(); });
  document.addEventListener('keydown', key);
  v.querySelector('.av-x').focus();
}
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('#view img.avatar, .drawer .subpanel img.avatar, .drawer-body > .row img.avatar');
  if (a && a.src) { e.preventDefault(); openAvatarViewer(a.src, (S.member && S.member.displayName) || ''); }
});

/* รหัสผ่านชั้นที่ 2: รหัส 6 หลักทางอีเมล (หลังรหัสชั้นที่ 1 และ 3 ถูกต้อง) */
function otpFlow(r, remember) {
  var ticket = r.ticket, needEmail = !!r.needEmail, cool = 0, valid = 0, iv = null;
  modal({
    title: 'รหัสผ่านชั้นที่ 2 (ทางอีเมล)', icon: 'mail', sub: needEmail ? 'บัญชีนี้ยังไม่มีอีเมล กรุณาระบุอีเมลเพื่อรับรหัส' : (r.msg || ''), dismiss: false, cancel: 'ยกเลิก', ok: 'ยืนยัน',
    html: '<div class="col" style="gap:12px">' +
      '<div id="otpEmailW" class="' + (needEmail ? '' : 'hidden') + '">' + textField('otpEmail', 'อีเมลสำหรับรับรหัส', '', true, { type: 'email', ac: 'email', ph: 'name@example.com' }) + '<button type="button" class="btn sm k" id="otpSend" style="margin-top:8px">' + ic('send') + ' ส่งรหัสไปยังอีเมลนี้</button></div>' +
      '<div class="field"><label for="otpCode">รหัส 6 หลักจากอีเมล <span class="req">*</span></label><div class="input otp-in">' + ic('key') + '<input id="otpCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" placeholder="••••••"></div><div class="err" id="otpCodeE"></div><div class="hint">รหัสหมดอายุใน 10 นาที และกรอกผิดได้ไม่เกิน 5 ครั้ง หากไม่พบอีเมล กรุณาตรวจสอบโฟลเดอร์จดหมายขยะ</div></div>' +
      '<div class="small muted otp-left" id="otpLeft" aria-live="polite"></div><p class="tiny muted" style="margin:0">กรอกรหัสครบ 6 หลักแล้วกดปุ่ม “ยืนยัน” เพื่อดำเนินการต่อ</p>' + '<button type="button" class="btn sm ghost" id="otpResend">' + ic('refresh') + ' ส่งรหัสใหม่</button></div>',
    onOpen: function (m) {
      var rs = $('#otpResend', m);
      function tick() { var lf = $('#otpLeft', m); if (lf) { if (valid > 0) { lf.innerHTML = ic('clock') + ' รหัสนี้ใช้ได้อีก <b>' + Math.floor(valid / 60) + ':' + ('0' + valid % 60).slice(-2) + '</b> นาที'; lf.classList.remove('bad'); valid--; } else { lf.innerHTML = ic('alert') + ' รหัสหมดอายุแล้ว กรุณากด “ส่งรหัสใหม่”'; lf.classList.add('bad'); } } if (cool > 0) { rs.disabled = true; rs.innerHTML = ic('refresh') + ' ส่งรหัสใหม่ได้ในอีก ' + Math.floor(cool / 60) + ':' + ('0' + cool % 60).slice(-2) + ' นาที'; cool--; } else { rs.disabled = false; rs.innerHTML = ic('refresh') + ' ส่งรหัสใหม่'; clearInterval(iv); iv = null; } }
      function startCool() { cool = 60; valid = 600; if (!iv) iv = setInterval(tick, 1000); tick(); }
      if (!needEmail) startCool();
      function send(email) {
        return api('resendOtp', { ticket: ticket, email: email || '' }).then(function (x) { toast('ส่งรหัสแล้ว', x.msg, 'ok'); needEmail = false; $('#otpEmailW', m).classList.add('hidden'); startCool(); $('#otpCode', m).focus(); })
          .catch(function (e) { if (e.code === 'OTP_EXPIRED') { m.querySelector('[data-c]').click(); toast('คำขอหมดอายุ', e.msg, 'warn'); } else toast('ส่งรหัสไม่สำเร็จ', e.msg, 'bad'); });
      }
      var sb = $('#otpSend', m); if (sb) sb.onclick = function () { var em = $('#otpEmail', m).value.trim(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { setErr('otpEmail', 'กรุณากรอกอีเมลที่ถูกต้อง'); return; } setErr('otpEmail', ''); send(em); };
      rs.onclick = function () { if (needEmail) { $('#otpEmail', m).focus(); return; } send(''); };
      var ci = $('#otpCode', m); ci.addEventListener('input', function () { ci.value = ci.value.replace(/\D/g, '').slice(0, 6); var eb = $('#otpCodeE', m); if (eb && ci.value.length === 6) eb.textContent = ''; });
    },
    onOk: function (m) {
      var code = $('#otpCode', m).value.trim();
      if (!/^\d{6}$/.test(code)) { setErr('otpCode', 'กรุณากรอกรหัส 6 หลักที่ได้รับทางอีเมล'); return false; }
      return api('verifyOtp', { ticket: ticket, code: code }, { timeout: 30000 }).then(function (res) { if (iv) clearInterval(iv); onLoggedIn(res, remember); return true; })
        .catch(function (e) { setErr('otpCode', e.msg); if (e.code === 'LOCKED' || e.code === 'OTP_EXPIRED') { if (iv) clearInterval(iv); setTimeout(function () { m.querySelector('[data-c]').click(); alertBox('ไม่สามารถเข้าสู่ระบบได้', e.msg, { icon: 'lock', tone: 'bad' }); }, 50); } return false; });
    }
  }).then(function (v) { if (iv) clearInterval(iv); });
}

/* Google Analytics 4 (ไม่ระบุตัวบุคคล) — ทำงานเมื่อผู้ดูแลระบบใส่รหัส GA4_ID ในชีต Config */
(function () {
  try {
    var id = String((window.__BOOT__ || {}).ga4 || '');
    if (!/^G-[A-Z0-9]{4,20}$/.test(id)) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', id, { anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false, page_title: 'THAI LAW LIBRARY | คลังกฎหมาย' });
    var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
  } catch (e) {}
})();
/* นับผู้เข้าชมทุกครั้งที่เปิด/รีเฟรช (ไม่เก็บข้อมูลระบุตัวบุคคล) */
var HIT_SENT = false;
function sendHit() {
  if (HIT_SENT) return; HIT_SENT = true;
  try { var d = deviceInfo(); api('hit', { device: d.device, browser: d.browser }, { noRetry: true }).catch(function () {}); } catch (e) {}
}
</script>
