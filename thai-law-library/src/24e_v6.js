<script>
/* ==========================================================================
   v6: ปรับปรุงเฉพาะจุดตามคำสั่ง — ไม่ลบฟังก์ชันเดิม (ฟังก์ชันเดิมถูกห่อหรือเรียกต่อ)
   ========================================================================== */
var DB_RAW = 'https://raw.githubusercontent.com/buycanthrphriphrm186-sketch/JFCPA/claude/legal-ai-website-system-4h1org/thai-law-library/db/';
var TH_DIG = '๐๑๒๓๔๕๖๗๘๙';
function thd(s) { return String(s).replace(/[0-9]/g, function (d) { return TH_DIG[d]; }); }
function ard(s) { return String(s).replace(/[๐-๙]/g, function (d) { return String(TH_DIG.indexOf(d)); }); }

/* ---------- เสียง: ปิดเสียงกดปุ่มทั้งหมด (คงเสียงตัวจับเวลา: เริ่ม หยุด ใกล้หมดเวลา หมดเวลา) ---------- */
SND.click = function () {};

/* ---------- รหัสอุปกรณ์ + การบล็อกผู้ใช้งาน ---------- */
function deviceId() {
  var id = ''; try { id = localStorage.getItem('tll.devId') || ''; } catch (e) {}
  if (!/^[A-Za-z0-9]{16,40}$/.test(id)) { id = ((window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (uid() + uid() + uid())).replace(/[^A-Za-z0-9]/g, '').slice(0, 32); try { localStorage.setItem('tll.devId', id); } catch (e) {} }
  return id;
}
var BLOCK_SHOWN = false;
function renderBlockedPage() {
  try { stopExplainer(); } catch (e) {}
  var sp = document.getElementById('splash'); if (sp) sp.remove();
  ROOT.innerHTML = '<main class="blocked-page"><div class="bp-in"><img src="' + LOGO + '" alt=""><h1>ไม่สามารถเข้าใช้งานเว็บไซต์นี้ได้</h1><p>อุปกรณ์และบัญชีนี้ถูกระงับการเข้าใช้งาน “คลังกฎหมาย” โดยผู้ดูแลระบบ</p><p class="small muted">หากเห็นว่าเป็นความคลาดเคลื่อน กรุณาติดต่อ thailawlibrary.official@gmail.com</p></div></main>';
}
function showBlocked(msg) {
  if (BLOCK_SHOWN) return; BLOCK_SHOWN = true;
  try { $$('.focus,.fv-reader,.av-view').forEach(function (x) { x.remove(); }); } catch (e) {}
  modal({ title: 'บัญชีถูกระงับการใช้งาน', icon: 'lock', tone: 'bad', dismiss: false, cancel: false, ok: 'ยอมรับ',
    html: '<div class="prose">' + String(msg || '').split(/\n+/).map(function (p) { return '<p class="noindent">' + esc(p) + '</p>'; }).join('') + '</div>' })
    .then(function () { try { localStorage.setItem('tll.blocked', String(Date.now())); } catch (e) {} try { clearSession(); } catch (e) {} renderBlockedPage(); });
}
(function () {
  var baseApi = api;
  api = function (action, payload, opt) {
    var p = Object.assign({}, payload || {}, { _dev: deviceId() });
    return baseApi(action, p, opt).then(function (r) { if (action === 'ping') { try { localStorage.removeItem('tll.blocked'); } catch (e) {} } return r; }, function (e) { if (e && e.code === 'BLOCKED') showBlocked(e.msg); throw e; });
  };
})();

/* ---------- ป๊อปอัป/ป้ายขยาย: ล็อกพื้นหลังแบบไม่ย้ายตำแหน่งหน้า (แก้หน้าจอขาว/เด้งขึ้นลงในแนวนอน) ---------- */
syncScrollLock = function () {
  var layer = document.getElementById('layer');
  var need = !!(document.querySelector('.focus,.av-view,.fv-reader,.dk-reader') || (layer && layer.querySelector('.modal-wrap,.drawer,.loading-ov')));
  document.documentElement.classList.toggle('scroll-lock', need);
  document.body.style.top = '';
};

/* ---------- เข้าสู่ระบบ: ไม่แสดงปุ่มอีเมล/Apple/Facebook/LINE (คงโค้ดเดิมไว้) ---------- */
socialButtons = function () { return ''; };

/* ---------- เมนูซ้าย: นำสมุดบันทึกและแพ็กเกจและราคาออก ---------- */
(function () {
  var baseMenu = openMainMenu;
  openMainMenu = function () { baseMenu.apply(this, arguments); $$('.drawer [data-v="notes"], .drawer [data-v="pricing"]').forEach(function (x) { x.remove(); }); };
})();

/* ---------- ตัวบทกฎหมายไทย: แยกอนุมาตราคนละบรรทัด + ป้ายวรรค/อนุมาตราสีเขียว เลขไทย ---------- */
var TH_LETTERS = 'กขคงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ';
function splitInlineItems(line) {
  var re = /(^|\s)\(\s*([0-9๐-๙]{1,3}|[ก-ฮ])\s*\)(?=\s)/g, m, toks = [];
  while ((m = re.exec(line))) {
    var pos = m.index + m[1].length, before = line.slice(Math.max(0, pos - 18), pos);
    if (/(มาตรา|อนุมาตรา|ข้อ|วรรค)\s*[0-9๐-๙\/]*\s*(?:\([0-9๐-๙]+\)\s*)*$/.test(before)) continue;
    var v = m[2], n = /[ก-ฮ]/.test(v) ? TH_LETTERS.indexOf(v) + 1 : Number(ard(v));
    toks.push({ pos: pos, n: n, letter: /[ก-ฮ]/.test(v) });
  }
  var best = [];
  for (var i = 0; i < toks.length; i++) {
    if (toks[i].n !== 1) continue;
    var run = [toks[i]];
    for (var j = i + 1; j < toks.length; j++) if (toks[j].letter === toks[i].letter && toks[j].n === run[run.length - 1].n + 1) run.push(toks[j]);
    if (run.length > best.length) best = run;
  }
  if (best.length < 2) return [line];
  var out = [], last = 0;
  best.forEach(function (t) { if (t.pos > last) out.push(line.slice(last, t.pos).trim()); last = t.pos; });
  out.push(line.slice(last).trim());
  return out.filter(String);
}
lawHtml = function (text, q, opt) {
  opt = opt || {};
  var raw = String(text || '').replace(/\r\n?/g, ' ').split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean), lines = [];
  raw.forEach(function (ln) { (opt.noLabels ? [ln] : splitInlineItems(ln)).forEach(function (x) { lines.push(x); }); });
  var kinds = lines.map(function (ln) { return /^\(\s*[0-9๐-๙]+\s*\)|^[0-9๐-๙]+\)/.test(ln) ? 'item' : /^\(\s*[ก-ฮ]\s*\)/.test(ln) ? 'sub' : /^\(เนื้อความ|^\[|^หมายเหตุ/.test(ln) ? 'note' : 'p'; });
  var paraTotal = kinds.filter(function (k) { return k === 'p'; }).length, pi = 0;
  return '<div class="law-text">' + lines.map(function (ln, i) {
    var k = kinds[i], label = '', body = ln;
    if (!opt.noLabels) {
      if (k === 'p') { pi++; if (paraTotal > 1) label = '<span class="wk">วรรค ' + thd(pi) + '</span>'; }
      else if (k === 'item') { var mi = ln.match(/^\(?\s*([0-9๐-๙]+)\s*\)\s*/); label = '<span class="wk sub">อนุมาตรา (' + thd(mi ? mi[1] : '') + ')</span>'; if (mi) body = ln.slice(mi[0].length); }
      else if (k === 'sub') { var ms = ln.match(/^\(\s*([ก-ฮ])\s*\)\s*/); label = '<span class="wk sub">อนุมาตรา (' + (ms ? ms[1] : '') + ')</span>'; if (ms) body = ln.slice(ms[0].length); }
    }
    var s = esc(body).replace(/มาตรา\s*([0-9๐-๙]+(?:\/[0-9๐-๙]+)?)/g, '<span class="sec-ref">มาตรา $1</span>');
    if (q) s = highlight(s, q);
    return '<p class="' + (k === 'p' ? '' : k === 'sub' ? 'item sub' : k) + '">' + label + s + '</p>';
  }).join('') + '</div>';
};

/* ---------- ป้ายสถานะ มีผลบังคับใช้ / ยกเลิกแล้ว ---------- */
function statusBadge(repealed) { return repealed ? '<span class="st-badge bad">ยกเลิกแล้ว</span>' : '<span class="st-badge ok">มีผลบังคับใช้</span>'; }
function isRepealedTitle(t, st) { return /\(ยกเลิก\)|ยกเลิกแล้ว|已废止|폐지|repealed/i.test(String(t || '') + ' ' + String(st || '')); }
function decorateBadges(root) {
  $$('.law-item[data-law]:not([data-bd])', root).forEach(function (b) { b.setAttribute('data-bd', '1'); var l = LAWS[b.getAttribute('data-law')]; if (!l) return; var t = b.querySelector('.li-t'); if (t) t.insertAdjacentHTML('afterend', ' ' + statusBadge(isRepealedTitle(l.title, l.status))); });
  $$('.law-item[data-t2]:not([data-bd])', root).forEach(function (b) { b.setAttribute('data-bd', '1'); var t = b.querySelector('.li-t'); if (t) t.insertAdjacentHTML('afterend', ' ' + statusBadge(isRepealedTitle(t.textContent))); });
}
try { new MutationObserver(function () { var v = document.getElementById('view'); if (v) decorateBadges(v); }).observe(document.getElementById('root'), { childList: true, subtree: true }); } catch (e) {}

/* ---------- เครื่องพิมพ์เอกสาร PDF (ฟอนต์ TH Sarabun New, โลโก้ตรงกลาง, ชื่อไทยก่อนอังกฤษ) ---------- */
function fontFace() { return '@font-face{font-family:"TH Sarabun New";src:url("' + DB_RAW + 'fonts/THSarabunNew.woff") format("woff");font-weight:normal}@font-face{font-family:"TH Sarabun New";src:url("' + DB_RAW + 'fonts/THSarabunNew-Bold.woff") format("woff");font-weight:bold}'; }
function printHtml(html) {
  var fr = document.createElement('iframe'); fr.setAttribute('aria-hidden', 'true'); fr.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
  document.body.appendChild(fr);
  var d = fr.contentWindow.document; d.open(); d.write(html); d.close();
  var go = function () { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { var w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); setTimeout(function () { w.print(); }, 800); } else toast('ไม่สามารถเปิดหน้าพิมพ์ได้', 'กรุณาอนุญาตป๊อปอัปแล้วลองใหม่', 'warn'); } setTimeout(function () { fr.remove(); }, 60000); };
  var ready = fr.contentWindow.document.fonts && fr.contentWindow.document.fonts.ready;
  var t = setTimeout(go, 3500);
  if (ready) ready.then(function () { clearTimeout(t); setTimeout(go, 150); });
}
function printDoc(titleTh, titleEn, bodyHtml) {
  var now = new Date();
  var html = '<!doctype html><html lang="th"><head><meta charset="utf-8"><title>' + esc(titleTh) + ' — คลังกฎหมาย</title><style>' + fontFace() +
    '@page{size:A4;margin:2cm 2cm 2cm 2.5cm}*{font-family:"TH Sarabun New","TH SarabunPSK","TH Sarabun PSK",sans-serif !important}body{font-size:16pt;line-height:1.45;color:#000;margin:0}' +
    '.hd{text-align:center;margin-bottom:12pt}.hd img{width:84px;height:84px;border-radius:50%}.n1{font-size:22pt;font-weight:bold;margin-top:4pt}.n2{font-size:15pt;letter-spacing:2pt}.t1{font-size:19pt;font-weight:bold;margin-top:12pt}.t2{font-size:14pt}.t3{font-size:13pt;color:#333}' +
    'h2{font-size:18pt;margin:14pt 0 4pt;page-break-after:avoid}h3{font-size:16pt;margin:10pt 0 2pt;page-break-after:avoid}.sec{margin:0 0 8pt;page-break-inside:auto}.sec b.no{font-weight:bold}' +
    'p{margin:0 0 4pt;text-align:justify;text-indent:2em}p.item{text-indent:0;padding-left:2em}p.item.sub{padding-left:4em}p.ni{text-indent:0}.wk{font-weight:bold;margin-right:6pt}.sec-ref{font-weight:normal}.muted{color:#333}.st{font-size:13pt}table{border-collapse:collapse;width:100%}td,th{border:1px solid #444;padding:2pt 5pt;font-size:14pt;text-align:left}</style></head><body>' +
    '<div class="hd"><img src="' + LOGO + '" alt=""><div class="n1">คลังกฎหมาย</div><div class="n2">THAI LAW LIBRARY</div><div class="t1">' + esc(titleTh) + '</div>' + (titleEn ? '<div class="t2">' + esc(titleEn) + '</div>' : '') +
    '<div class="t3">พิมพ์เมื่อ ' + esc(fmtDateTime(now)) + '</div></div>' + bodyHtml + '</body></html>';
  printHtml(html);
}
/* เอกสารทางการจากเซิร์ฟเวอร์ (ประวัติการเข้าสู่ระบบ สำรองข้อมูล ข้อมูลสมาชิก) — ใช้ HTML แล้วพิมพ์เป็น PDF ด้วยฟอนต์ TH Sarabun New */
officialPdf = function (action, text) {
  return withLoading(text || 'กำลังจัดทำเอกสาร PDF', api(action, { logo: LOGO, format: 'html' }, { timeout: 90000 })).then(function (r) {
    if (r.html) { printHtml(r.html); toast('เปิดหน้าพิมพ์แล้ว', 'เลือก “บันทึกเป็น PDF” เพื่อบันทึกไฟล์ ' + r.name, 'ok'); }
    else if (r.base64) downloadBase64(r.name, r.base64, 'application/pdf');
  }).catch(function (e) { toast('จัดทำเอกสาร PDF ไม่สำเร็จ', (e && e.msg) || 'กรุณาลองใหม่อีกครั้ง', 'bad'); });
};
/* หน้าต่างเลือกมาตราที่จะพิมพ์ (ติ๊กเลือกได้ทีละมาตรา/ทั้งหมด/ตามหมวด) */
function printPicker(title, items, onPrint) {
  var groups = [], cur = null;
  items.forEach(function (it, i) { var g = it.group || ''; if (!cur || cur.g !== g) { cur = { g: g, list: [] }; groups.push(cur); } cur.list.push(i); });
  modal({ title: 'พิมพ์เป็น PDF', sub: title, icon: 'download', wide: true, ok: 'พิมพ์ PDF', cancel: 'ยกเลิก',
    html: '<div class="pp-bar"><button type="button" class="btn sm" data-pp="all">' + ic('check') + ' เลือกทั้งหมด</button><button type="button" class="btn sm" data-pp="none">' + ic('x') + ' ไม่เลือกเลย</button><span class="tiny muted" id="ppN"></span></div>' +
      '<div class="pp-list">' + groups.map(function (g, gi) { return (g.g ? '<label class="pp-g"><input type="checkbox" data-pg="' + gi + '" checked><span class="cbx" aria-hidden="true"></span><b>' + esc(g.g) + '</b></label>' : '') + g.list.map(function (i) { return '<label class="pp-i"><input type="checkbox" data-pi="' + i + '" data-pgi="' + gi + '" checked><span class="cbx" aria-hidden="true"></span><span>' + esc(items[i].label) + '</span></label>'; }).join(''); }).join('') + '</div>',
    onOpen: function (m) {
      function count() { $('#ppN', m).textContent = 'เลือกแล้ว ' + $$('[data-pi]:checked', m).length + ' จาก ' + items.length + ' รายการ'; }
      on(m, 'click', '[data-pp]', function (e, b) { var v = b.getAttribute('data-pp') === 'all'; $$('[data-pi],[data-pg]', m).forEach(function (c) { c.checked = v; }); count(); });
      m.addEventListener('change', function (e) { var g = e.target.getAttribute('data-pg'); if (g !== null) $$('[data-pgi="' + g + '"]', m).forEach(function (c) { c.checked = e.target.checked; }); count(); });
      count();
    },
    onOk: function (m) {
      var sel = $$('[data-pi]:checked', m).map(function (c) { return +c.getAttribute('data-pi'); });
      if (!sel.length) { toast('กรุณาเลือกอย่างน้อย 1 รายการ', '', 'warn'); return false; }
      onPrint(sel); return true;
    } });
}
function printThaiLaw(l) {
  var secs = (SECS_BY_LAW[l.id] || []).slice();
  if (!secs.length) { toast('ยังโหลดตัวบทไม่เสร็จ', 'กรุณารอสักครู่แล้วลองอีกครั้ง', 'warn'); return; }
  printPicker(l.title, secs.map(function (s) { return { label: 'มาตรา ' + s.no + ' ' + (s.name || ''), group: s.head || '' }; }), function (sel) {
    var lastHead = null;
    var body = sel.map(function (i) { var s = secs[i], hh = s.head && s.head !== lastHead ? '<h2>' + esc(s.head) + '</h2>' : ''; lastHead = s.head; return hh + '<div class="sec"><h3>มาตรา ' + esc(thd(s.no)) + ' ' + esc(s.name || '') + '</h3>' + lawHtml(s.text) + '</div>'; }).join('');
    printDoc(l.title, (l.status ? 'สถานะ: ' + (isRepealedTitle(l.title, l.status) ? 'ยกเลิกแล้ว' : 'มีผลบังคับใช้') : ''), body + '<p class="ni muted st">ที่มา: ' + esc(l.src || 'ฐานข้อมูลคลังกฎหมาย') + '</p>');
  });
}

/* ---------- หน้าเนื้อหา: ปุ่มพิมพ์ (แสดงเมื่อเปิดกฎหมายฉบับใดแล้วเท่านั้น) + ป้ายสถานะในหัวกฎหมาย ---------- */
(function () {
  var baseRenderLaw = renderLaw;
  renderLaw = function (box, l) {
    baseRenderLaw(box, l);
    var adv = document.getElementById('advBtn');
    if (adv && !document.getElementById('lawPrint')) adv.insertAdjacentHTML('afterend', '<button class="btn sm k" id="lawPrint">' + ic('download') + ' พิมพ์ PDF</button>');
    var pb = document.getElementById('lawPrint'); if (pb) pb.onclick = function () { printThaiLaw(LAWS[S.ui.content.law] || l); };
    var tag = box.querySelector('.panel .tag'); if (tag && !box.querySelector('.panel .st-badge')) tag.insertAdjacentHTML('afterend', ' ' + statusBadge(isRepealedTitle(l.title, l.status)));
  };
  var baseContent = VIEWS.content;
  VIEWS.content = function (el) {
    baseContent(el);
    var adv = $('#advBtn', el); if (adv && adv.parentNode) { adv.parentNode.classList.add('vh-actions'); }
    var st = S.ui.content || {};
    if (!st.law) { var pb = document.getElementById('lawPrint'); if (pb) pb.remove(); }
    loadPubStats().then(function (d) {
      var b2 = $('#scopeFgN', el); if (!b2 || !d.world) return;
      var n = 0, c = 0; Object.keys(d.world).forEach(function (k) { if (k === 'CN' && d.foreignDetail && d.foreignDetail.CN) n += d.foreignDetail.CN.laws; else n += d.world[k].laws || 0; c++; });
      b2.textContent = fmtN(n) + ' ฉบับ · ' + c + ' ประเทศ';
    }).catch(function () {});
  };
})();

/* ---------- อ่านจบกฎหมายฉบับนั้น: ป๊อปอัปแสดงความยินดี ---------- */
function lawFinished(lawId) {
  var l = LAWS[lawId] || {};
  modal({ title: 'ยินดีด้วย! อ่านครบทุกมาตราแล้ว', icon: 'check', sub: l.title || '', ok: 'กลับไปหน้าหลักของกฎหมาย', cancel: 'อ่านต่อ',
    html: '<div class="prose"><p class="noindent">ท่านอ่านป้ายพลิกมาตราของกฎหมายฉบับนี้จนถึงมาตราสุดท้ายแล้ว ความตั้งใจของท่านคือก้าวสำคัญของการเรียนรู้กฎหมาย ลองทบทวนมาตราที่บันทึกไว้ หรือใช้ตัวจับเวลาฝึกท่องจำมาตราสำคัญอีกครั้ง</p></div>' })
    .then(function (ok) {
      if (!ok) return;
      closeFocus();
      var top = document.getElementById('cardsBox') || document.getElementById('view');
      var y = top ? top.getBoundingClientRect().top + window.scrollY - 90 : 0;
      window.scrollTo({ top: Math.max(0, y), behavior: 'instant' });
    });
}

/* ---------- กฎหมายต่างประเทศ: 195 ประเทศ แยกอาเซียนและทวีป ---------- */
var WORLD = null;
function loadWorld() {
  if (WORLD) return Promise.resolve(WORLD);
  return api('worldCountries', {}, { timeout: 40000 }).then(function (r) { WORLD = r; var c = r.countries.filter(function (x) { return x.index; })[0]; if (c) DB_RAW = c.index.replace(/(world|foreign)\/[A-Z]{2}\.json\.gz$/, ''); return r; });
}
var CONT_ORDER = ['AS', 'EU', 'AF', 'NA', 'SA', 'OC'];
renderForeign = function (box) {
  var st = S.ui.content;
  box.innerHTML = '<div class="skeleton" style="height:120px"></div>';
  loadWorld().then(function (w) {
    if (!box.isConnected) return;
    var byCc = {}; w.countries.forEach(function (c) { byCc[c.cc] = c; });
    if (st.fc && byCc[st.fc]) return renderCountry(box, byCc[st.fc]);
    var groups = [['ASEAN', 'ประชาคมอาเซียน (ASEAN)', w.countries.filter(function (c) { return c.asean; })]].concat(CONT_ORDER.map(function (k) { return [k, w.continents[k] || k, w.countries.filter(function (c) { return c.cont === k; })]; }));
    var tot = w.countries.reduce(function (a, c) { return a + (c.laws || 0); }, 0), withData = w.countries.filter(function (c) { return c.laws; }).length;
    var mem = w.countries.filter(function (c) { return c.un === 'member'; }).length + 1, obs = w.countries.filter(function (c) { return c.un === 'observer'; }).length;
    if (st.fg && groups.some(function (g) { return g[0] === st.fg; })) {
      var g = groups.filter(function (x) { return x[0] === st.fg; })[0];
      box.innerHTML = '<div class="row" style="gap:10px;margin-bottom:10px"><button class="icon-btn" id="fgBack" aria-label="กลับไปเลือกทวีป">' + ic('arrowL') + '</button><div class="grow"><b>' + esc(g[1]) + '</b><div class="tiny muted">' + g[2].length + ' ประเทศ' + (st.fg === 'ASEAN' ? ' (ไม่รวมประเทศไทย ซึ่งอยู่ในเมนูกฎหมายประเทศไทย)' : '') + '</div></div></div>' +
        '<div class="fgn-grid anim-list">' + g[2].slice().sort(function (a, b) { return (b.laws || 0) - (a.laws || 0); }).map(function (c) {
          return '<button class="fgn-card" data-fc="' + esc(c.cc) + '"' + (c.laws ? '' : ' disabled') + '><span class="fgn-code">' + esc(c.cc) + '</span><span class="grow"><b>' + esc(c.th) + '</b> <span class="muted small">' + esc(c.en) + '</span>' + (c.un === 'observer' ? ' <span class="st-badge obs">รัฐผู้สังเกตการณ์ UN</span>' : '') +
            '<br><span class="small ' + (c.laws ? 'ok-t' : 'muted') + '">' + (c.laws ? fmtN(c.laws) + ' ฉบับ · ' + fmtN(c.sections) + ' มาตรา' + (c.repealed ? ' · ยกเลิกแล้ว ' + fmtN(c.repealed) : '') : 'ยังไม่มีชุดข้อมูลเปิดที่อนุญาตให้นำมาใช้') + '</span></span>' + ic('chevR') + '</button>';
        }).join('') + '</div>';
      $('#fgBack', box).onclick = function () { st.fg = ''; store.set('ui', S.ui); renderForeign(box); };
      on(box, 'click', '[data-fc]', function (e, b) { st.fc = b.getAttribute('data-fc'); store.set('ui', S.ui); renderForeign(box); });
      return;
    }
    box.innerHTML = '<div class="panel flat" style="margin-bottom:12px"><div class="small"><b>กฎหมายต่างประเทศ ' + fmtN(withData) + ' ประเทศ · ' + fmtN(tot) + ' ฉบับ</b></div><div class="tiny muted">ประเทศทั่วโลก 195 ประเทศ = รัฐสมาชิกสหประชาชาติ ' + mem + ' ประเทศ + รัฐผู้สังเกตการณ์ ' + obs + ' ประเทศ (นครรัฐวาติกัน และปาเลสไตน์) · ข้อมูลอ่านอย่างเดียว พิมพ์เป็น PDF ได้</div></div>' +
      '<div class="fgn-grid anim-list">' + groups.map(function (g) {
        var n = g[2].reduce(function (a, c) { return a + (c.laws || 0); }, 0);
        return '<button class="fgn-card" data-fgp="' + g[0] + '"><span class="fgn-code">' + (g[0] === 'ASEAN' ? ic('globe') : esc(g[0])) + '</span><span class="grow"><b>' + esc(g[1]) + '</b><br><span class="small muted">' + g[2].length + ' ประเทศ · ' + fmtN(n) + ' ฉบับ</span></span>' + ic('chevR') + '</button>';
      }).join('') + '</div>';
    on(box, 'click', '[data-fgp]', function (e, b) { st.fg = b.getAttribute('data-fgp'); store.set('ui', S.ui); renderForeign(box); });
  }).catch(function (e) { box.innerHTML = '<div class="panel"><div class="empty warn"><div class="eic">' + ic('wifiOff') + '</div><h3>โหลดข้อมูลไม่สำเร็จ</h3><p>' + esc((e && e.msg) || '') + '</p></div></div>'; });
};
var FV_CC = '', FV_LAST = null, FV_META = null;
renderCountry = function (box, c) {
  if (!c.cc) return renderCountryV4(box, c);
  var st = S.ui.content; st.ff = st.ff || 'all';
  var isV5 = c.fmt === 'v5';
  box.innerHTML = '<section class="panel corner" style="margin-bottom:14px"><div class="row" style="align-items:flex-start;gap:10px"><button class="icon-btn" id="fcBack" aria-label="กลับไปเลือกประเทศ">' + ic('arrowL') + '</button><div class="grow"><span class="tag">กฎหมายต่างประเทศ · อ่านอย่างเดียว</span><h3 style="margin-top:6px">' + esc(c.th) + ' <span class="muted">' + esc(c.en) + '</span></h3>' +
    '<div class="muted small">' + fmtN(c.laws) + ' ฉบับ · ' + fmtN(c.sections) + ' มาตรา · มีผลบังคับใช้ ' + fmtN(c.laws - (c.repealed || 0)) + ' · ยกเลิกแล้ว ' + fmtN(c.repealed || 0) + '</div></div></div>' +
    '<div class="seg" id="fcF" style="margin-top:10px"><button data-ff="all">ทั้งหมด</button><button data-ff="main">กฎหมายหลัก/ประมวลกฎหมาย</button><button data-ff="ok">มีผลบังคับใช้</button><button data-ff="rep">ยกเลิกแล้ว</button></div>' +
    '<div class="input" style="margin-top:10px">' + ic('search') + '<input id="fcQ" placeholder="พิมพ์ชื่อกฎหมาย (ภาษาของประเทศนั้นหรือภาษาอังกฤษ)" value="' + esc(st.fq || '') + '"></div></section><div id="fcRes"></div>';
  $$('#fcF button', box).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-ff') === st.ff); });
  $('#fcBack', box).onclick = function () { st.fc = ''; st.fq = ''; store.set('ui', S.ui); renderForeign(box); };
  var res = $('#fcRes', box), list = [], shown = 0, ix = null;
  function norm6(e) { return isV5 ? { id: e[0], title: e[1], date: e[2], rep: isRepealedTitle('', e[3]), k: e[4], o: e[5], n: e[6], main: /宪法|法典|^中华人民共和国[^，]{0,8}法$/.test(e[1]) } : { id: e[0], title: e[1], date: e[2], rep: !!e[3], k: e[4], o: e[5], n: e[6], main: !!e[7], abbr: e[8] || '' }; }
  function draw(reset) {
    if (reset) { shown = 0; res.innerHTML = ''; }
    if (!list.length) { res.innerHTML = '<div class="panel"><div class="empty"><div class="eic">' + ic('search') + '</div><h3>ไม่พบกฎหมายที่ค้นหา</h3><p>ลองพิมพ์ชื่อเป็นภาษาของประเทศนั้น หรือเลือกตัวกรองอื่น</p></div></div>'; return; }
    var next = list.slice(shown, shown + 40); shown += next.length;
    var mb = $('#fcMore', res); if (mb) mb.remove();
    res.insertAdjacentHTML('beforeend', (shown === next.length ? '<div class="group-h">' + (st.ff === 'main' ? 'กฎหมายหลักและประมวลกฎหมาย' : st.fq ? 'ผลการค้นหา' : 'รายการกฎหมาย') + ' <span class="cnt">' + fmtN(list.length) + ' รายการ</span></div>' : '') +
      next.map(function (e) { return '<button class="law-item" data-fl="' + esc(e.id) + '"><span class="li-ic">' + ic(e.main ? 'scale' : 'book') + '</span><span class="grow"><span class="li-t">' + highlight(esc(e.title), st.fq || '') + '</span> ' + statusBadge(e.rep) + '<br><span class="li-s">' + esc([e.abbr, e.date, e.n ? fmtN(e.n) + ' มาตรา' : ''].filter(Boolean).join(' · ')) + '</span></span>' + ic('chevR') + '</button>'; }).join('') +
      (shown < list.length ? '<button class="btn block" id="fcMore" style="margin-top:10px">แสดงเพิ่มเติม (' + fmtN(list.length - shown) + ')</button>' : ''));
    var m2 = $('#fcMore', res); if (m2) m2.onclick = function () { draw(false); };
  }
  function run() {
    if (!ix) { res.innerHTML = '<div class="skeleton" style="height:70px"></div>'; return; }
    var all = ix.laws.map(norm6), q = (st.fq || '').trim();
    if (st.ff === 'main') all = all.filter(function (e) { return e.main; });
    else if (st.ff === 'ok') all = all.filter(function (e) { return !e.rep; });
    else if (st.ff === 'rep') all = all.filter(function (e) { return e.rep; });
    if (q) { var nq = norm(q); all = all.filter(function (e) { return norm(e.title).indexOf(nq) > -1 || norm(e.abbr || '').indexOf(nq) > -1 || String(e.id).toLowerCase() === q.toLowerCase(); }).sort(function (a, b) { var A = norm(a.title), B = norm(b.title); return (A === nq ? 0 : A.indexOf(nq) === 0 ? 1 : 2) - (B === nq ? 0 : B.indexOf(nq) === 0 ? 1 : 2); }); }
    else if (st.ff === 'all') all = all.filter(function (e) { return e.main; }).concat(all.filter(function (e) { return !e.main; }));
    list = all; draw(true);
  }
  res.innerHTML = '<div class="skeleton" style="height:70px"></div>';
  loadIndex(c.index).then(function (x) { ix = x; run(); }).catch(function () { res.innerHTML = '<div class="panel"><div class="empty warn"><div class="eic">' + ic('wifiOff') + '</div><h3>ยังโหลดดัชนีไม่สำเร็จ</h3><p>กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต แล้วลองอีกครั้ง</p></div></div>'; });
  on($('#fcF', box), 'click', '[data-ff]', function (e, b) { st.ff = b.getAttribute('data-ff'); store.set('ui', S.ui); $$('#fcF button', box).forEach(function (x) { x.classList.toggle('on', x === b); }); run(); });
  $('#fcQ', box).addEventListener('input', debounce(function () { st.fq = this.value.trim(); store.set('ui', S.ui); run(); }, 300));
  on(res, 'click', '[data-fl]', function (e, b) {
    var id = b.getAttribute('data-fl'), ent = list.filter(function (x) { return x.id === id; })[0]; if (!ent) return;
    openForeignLaw({ code: c.cc, name: c.th }, id, { k: ent.k, o: ent.o, n: ent.n }, { title: ent.title, date: ent.date, repealed: ent.rep });
  });
};
/* ตัวอ่านกฎหมายต่างประเทศ: ไม่มีป้ายวรรค (ใช้รูปแบบภาษาต้นฉบับ) + ปุ่มพิมพ์ PDF มุมขวาบน */
(function () {
  var baseOpen = openForeignLaw;
  openForeignLaw = function (c, id, entry, meta) {
    FV_CC = c.code; FV_LAST = null; FV_META = meta || {};
    var origApi = api;
    api = function (action, payload, opt) {
      if (action !== 'foreignLaw') return origApi(action, payload, opt);
      api = origApi;
      return origApi(action, payload, opt).then(function (r) { FV_LAST = r; return r; });
    };
    try { baseOpen(c, id, entry, meta); } finally { setTimeout(function () { if (api !== origApi && FV_LAST) api = origApi; }, 0); }
    var top = document.querySelector('.fv-reader .fv-top');
    if (top && !top.querySelector('[data-fvp]')) top.insertAdjacentHTML('beforeend', '<button class="btn sm k fv-print" data-fvp="1">' + ic('download') + ' พิมพ์ PDF</button>');
    var t = document.querySelector('.fv-reader .fv-title .tag'); if (t && c.code !== 'TH2') t.insertAdjacentHTML('afterend', ' ' + statusBadge(!!(meta && meta.repealed)));
    var pb = document.querySelector('.fv-reader [data-fvp]');
    if (pb) pb.onclick = function () {
      if (!FV_LAST) { toast('กำลังโหลดตัวบท', 'กรุณารอสักครู่', ''); return; }
      var law = FV_LAST, arts = law.articles || [];
      printPicker(law.title, arts.map(function (a) { return { label: (a.no || '') + ' ' + (a.cap || ''), group: a.head || '' }; }), function (sel) {
        var lastHead = null;
        var body = sel.map(function (i) { var a = arts[i], hh = a.head && a.head !== lastHead ? '<h2>' + esc(a.head) + '</h2>' : ''; lastHead = a.head; return hh + '<div class="sec"><h3>' + esc(a.no || '') + ' ' + esc(a.cap || '') + '</h3>' + a.paras.map(function (p) { return '<p>' + esc(p.s) + '</p>' + (p.items || []).map(function pi(it) { return '<p class="item">' + esc(it.t) + ' ' + esc(it.s) + '</p>' + (it.sub || []).map(pi).join(''); }).join(''); }).join('') + '</div>'; }).join('');
        printDoc(law.title, (c.name || '') + (FV_META.repealed ? ' · ยกเลิกแล้ว' : ' · มีผลบังคับใช้'), body + '<p class="ni muted st">ที่มา: ' + esc(law.source || '') + '</p>');
      });
    };
  };
})();
fvArticle = function (a, idx) {
  var labels = FV_CC === 'TH2';
  var many = a.paras.length > 1;
  return '<article class="fv-art" data-ai="' + idx + '"><div class="fv-ah"><span class="secno">' + esc(a.no) + '</span><b>' + esc(a.cap) + '</b>' + (FV_CC === 'TH2' ? '' : '<button class="btn sm ghost" data-tr="' + idx + '">' + ic('globe') + ' แปลเป็นภาษาไทย</button>') + '</div>' +
    a.paras.map(function (p, i) { return '<p>' + (labels && many ? '<span class="wk">วรรค ' + thd(i + 1) + '</span>' : '') + esc(p.s) + '</p>' + p.items.map(function (it) { return labels ? fvItem(it, 0) : fvItemPlain(it, 0); }).join(''); }).join('') + '<div class="fv-trans"></div></article>';
};
function fvItemPlain(it, d) { return '<p class="item' + (d ? ' sub' : '') + '">' + esc(it.t) + ' ' + esc(it.s) + '</p>' + (it.sub || []).map(function (x) { return fvItemPlain(x, d + 1); }).join(''); }

/* ---------- ผู้ช่วย AI: ไม่มีปุ่มบวก ช่องพิมพ์ยืดตามข้อความ ---------- */
document.addEventListener('input', function (e) { if (e.target && e.target.id === 'aiIn') { var t = e.target; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, Math.round(window.innerHeight * 0.45)) + 'px'; } }, true);

/* ---------- หน้าบันทึก/ประวัติ: ปุ่มรีเฟรช (ซิงก์ทุกอุปกรณ์) + ซิงก์อัตโนมัติทุก 60 วินาที ---------- */
function syncNow(btn) {
  if (btn) btn.classList.add('spin-on');
  return Promise.resolve(bootstrap(false)).then(function () { if (btn && btn.isConnected) btn.classList.remove('spin-on'); toast('อัปเดตข้อมูลล่าสุดแล้ว', '', 'ok'); }, function () { if (btn) btn.classList.remove('spin-on'); });
}
(function () {
  ['saved', 'history'].forEach(function (v) {
    var base = VIEWS[v];
    VIEWS[v] = function (el) {
      base(el);
      var anchor = v === 'saved' ? $('#fdChips', el) : $('#perSeg', el);
      if (anchor && !$('#syncBtn', el)) {
        var b = h('<button class="icon-btn sync-btn" id="syncBtn" aria-label="อัปเดตข้อมูลล่าสุด" title="อัปเดตข้อมูลล่าสุดจากทุกอุปกรณ์">' + ic('refresh') + '</button>');
        if (v === 'saved') anchor.insertBefore(b, anchor.firstChild); else anchor.parentNode.insertBefore(b, anchor.nextSibling);
        b.onclick = function () { syncNow(b); };
      }
    };
  });
  setInterval(function () { if (S.token && !document.hidden && S.ui && /^(saved|history|time|home)$/.test(S.ui.view || '') && !document.documentElement.classList.contains('scroll-lock')) bootstrap(false); }, 60000);
})();

/* ---------- แดชบอร์ดหน้าแรก: 4 กรอบ, อาชีพสมาชิก, กฎหมายต่างประเทศ, ตารางรายเดือน, ญี่ปุ่นแสดงจำนวนมาตรา ---------- */
var DONUT_COLS = ['var(--dv1)', 'var(--dv2)', 'var(--dv3)', '#1E8E3E', '#9CCBF0', '#5D6878', '#0E1116', '#F7B267'];
function donutN(rows) {
  var tot = rows.reduce(function (a, r) { return a + r[1]; }, 0), R = 70, C = 2 * Math.PI * R, off = 0;
  var segs = tot ? rows.map(function (r, i) { var len = r[1] / tot * C, gap = r[1] && len > 4 ? 2 : 0; var s_ = '<circle r="' + R + '" cx="90" cy="90" fill="none" stroke="' + DONUT_COLS[i % DONUT_COLS.length] + '" stroke-width="26" stroke-dasharray="' + Math.max(0, len - gap) + ' ' + (C - Math.max(0, len - gap)) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 90 90)"><title>' + esc(r[0]) + ' ' + fmtN(r[1]) + ' คน</title></circle>'; off += len; return s_; }).join('') : '<circle r="' + R + '" cx="90" cy="90" fill="none" stroke="var(--line)" stroke-width="26"/>';
  return '<div class="donut"><svg viewBox="0 0 180 180" role="img" aria-label="สัดส่วนสมาชิกตามอาชีพ">' + segs + '<text x="90" y="86" text-anchor="middle" class="dnum">' + fmtN(tot) + '</text><text x="90" y="108" text-anchor="middle" class="dax">คน</text></svg>' +
    '<ul class="dleg">' + rows.map(function (r, i) { return '<li><i style="background:' + DONUT_COLS[i % DONUT_COLS.length] + '"></i><span>' + esc(r[0]) + '</span><b>' + fmtN(r[1]) + (tot ? ' (' + Math.round(r[1] / tot * 100) + '%)' : '') + '</b></li>'; }).join('') + '</ul></div>';
}
var CONT_TH = { AS: 'ทวีปเอเชีย', EU: 'ทวีปยุโรป', AF: 'ทวีปแอฟริกา', NA: 'ทวีปอเมริกาเหนือ', SA: 'ทวีปอเมริกาใต้', OC: 'ออสเตรเลียและโอเชียเนีย' };
countryTable = function (d) {
  var list = (d.worldList || []), wd = d.world || {};
  var rows = [['ประเทศไทย (กฎหมายหลัก 5 หมวด)', d.laws, d.sections], ['ประเทศไทย (กฎหมายลำดับรองและอื่น ๆ)', d.thai2 ? d.thai2.laws : 0, d.thai2 ? d.thai2.sections : 0]];
  var tl = 0, ts = 0; rows.forEach(function (r) { tl += r[1] || 0; ts += r[2] || 0; });
  var html = '<div class="table-scroll ctable-wrap"><table class="ptable ctable"><thead><tr><th>ประเทศ</th><th>จำนวนกฎหมาย (ฉบับ)</th><th>จำนวนมาตรา</th></tr></thead><tbody>' + rows.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td>' + fmtN(r[1]) + '</td><td>' + fmtN(r[2]) + '</td></tr>'; }).join('');
  var groups = [['ASEAN', 'ประชาคมอาเซียน', list.filter(function (c) { return c.asean && c.cc !== 'TH'; })]].concat(CONT_ORDER.map(function (k) { return [k, CONT_TH[k], list.filter(function (c) { return c.cont === k && !c.asean; })]; }));
  groups.forEach(function (g) {
    html += '<tr class="grp"><td colspan="3">' + esc(g[1]) + ' (' + g[2].length + ' ประเทศ)</td></tr>';
    g[2].forEach(function (c) { var x = wd[c.cc]; if (c.cc === 'CN' && d.foreignDetail && d.foreignDetail.CN) x = d.foreignDetail.CN; tl += x ? x.laws : 0; ts += x ? (x.sections || 0) : 0; html += '<tr><td>' + esc(c.th) + (c.un === 'observer' ? ' <span class="st-badge obs">ผู้สังเกตการณ์</span>' : '') + '</td><td>' + (x ? fmtN(x.laws) : '0') + '</td><td>' + (x ? fmtN(x.sections || 0) : '0') + '</td></tr>'; });
  });
  return html + '<tr class="tot"><td>รวมทั้งหมด</td><td>' + fmtN(tl) + '</td><td>' + fmtN(ts) + '</td></tr></tbody></table></div>';
};
(function () {
  var baseRender = renderDash;
  renderDash = function (box, d) {
    baseRender(box, d);
    var wd = d.world || {}; var fgTotal = 0; Object.keys(wd).forEach(function (k) { if (k !== 'CN') fgTotal += wd[k].laws || 0; }); if (d.foreignDetail && d.foreignDetail.CN) fgTotal += d.foreignDetail.CN.laws;
    var allLaws = (d.thaiTotal || d.laws || 0) + fgTotal;
    var k = $('.dash-kpis', box);
    if (k) k.innerHTML = [['วันนี้', fmtN((d.today || {}).visits || 0), 'ครั้ง'], ['30 วันล่าสุด', fmtN((d.series || []).reduce(function (a, x) { return a + x.v; }, 0)), 'ครั้ง'], ['สมาชิก', fmtN(d.members), 'บัญชี'], ['กฎหมายทั้งหมดในฐานข้อมูล', fmtN(allLaws), 'ฉบับ (ไทยและต่างประเทศ)']].map(function (x) { return '<div class="dk"><span class="dk-l">' + esc(x[0]) + '</span><span class="dk-v">' + x[1] + '</span><span class="dk-u">' + esc(x[2]) + '</span></div>'; }).join('');
    if (k) k.classList.add('k4');
    var figs = $$('.dcard', box);
    figs.forEach(function (f) {
      var cap = f.querySelector('figcaption'); if (!cap) return;
      if (/อุปกรณ์/.test(cap.textContent)) { cap.textContent = 'สมาชิกแยกตามอาชีพ/สถานะ (สะสม · ไม่แสดงชื่อ)'; var mt = d.memberTypes || {}; var rows = Object.keys(mt).map(function (x) { return [x, mt[x]]; }).sort(function (a, b) { return b[1] - a[1]; }); f.querySelector('.donut').outerHTML = donutN(rows); }
      if (/เบราว์เซอร์/.test(cap.textContent)) {
        cap.textContent = 'กฎหมายต่างประเทศในฐานข้อมูล (ฉบับ)';
        var names = {}; (d.worldList || []).forEach(function (c) { names[c.cc] = c.th; });
        var fr = Object.keys(wd).map(function (c) { return [names[c] || c, c === 'CN' && d.foreignDetail && d.foreignDetail.CN ? d.foreignDetail.CN.laws : wd[c].laws]; }).sort(function (a, b) { return b[1] - a[1]; });
        f.querySelector('.hbars').outerHTML = '<div class="fg-bars">' + hbars(fr.slice(0, 12), 'var(--dv1)') + '<details class="acc" style="margin-top:8px"><summary>' + ic('list') + ' ดูทั้งหมด ' + fr.length + ' ประเทศ' + ic('chevD', 'chev') + '</summary><div class="acc-b">' + hbars(fr.slice(12), 'var(--dv1)') + '</div></details></div>';
      }
    });
    var ct = $('#dashCountries', box); if (ct) ct.innerHTML = countryTable(d);
    /* สนธิสัญญาแยกตามประเทศ + คำพิพากษาศาลฎีกา */
    var grid = $('.dash-grid', box);
    if (grid && !$('#dashTreaty', box)) {
      var names2 = {}; (d.worldList || []).forEach(function (c) { names2[c.cc] = c.th; });
      var tr_ = d.treaties ? Object.keys(d.treaties.byCountry || {}).filter(function (c) { return names2[c]; }).map(function (c) { return [names2[c], d.treaties.byCountry[c]]; }).sort(function (a, b) { return b[1] - a[1]; }) : [];
      grid.insertAdjacentHTML('beforeend', '<figure class="dcard" id="dashTreaty"><figcaption>อนุสัญญาและสนธิสัญญาแยกตามประเทศ' + (d.treaties ? ' (รวม ' + fmtN(d.treaties.total) + ' ฉบับ)' : '') + '</figcaption>' + (tr_.length ? hbars(tr_.slice(0, 10), 'var(--dv3)') + '<details class="acc" style="margin-top:8px"><summary>' + ic('list') + ' ดูทั้งหมด ' + tr_.length + ' ประเทศ' + ic('chevD', 'chev') + '</summary><div class="acc-b">' + hbars(tr_.slice(10), 'var(--dv3)') + '</div></details>' : '<p class="small muted">ระบบกำลังรวบรวมข้อมูลจาก Wikidata (ปรับปรุงวันละครั้ง)</p>') + '</figure>' +
        '<figure class="dcard"><figcaption>คำพิพากษาและคำสั่งศาลฎีกา</figcaption>' + (d.deka ? '<div class="dk-big">' + fmtN(d.deka.total) + ' <small>ฉบับ</small></div>' + hbars(Object.keys(d.deka.types || {}).map(function (t) { return [t, d.deka.types[t]]; }).sort(function (a, b) { return b[1] - a[1]; }), 'var(--dv2)') : '<p class="small muted">กำลังโหลด</p>') + '</figure>');
    }
    /* ตารางรายวัน: เลือกเดือน (12 เดือน) และพิมพ์ปี พ.ศ. */
    var det = $$('details.acc', box).filter(function (x) { return /ตาราง/.test(x.querySelector('summary').textContent); })[0];
    if (det && !$('#stMonth', det)) {
      var now = new Date();
      det.querySelector('.acc-b').insertAdjacentHTML('afterbegin', '<div class="row wrapr st-pick"><label class="field"><span class="lbl">เดือน</span><div class="input"><select id="stMonth">' + TH_MONTHS.map(function (m, i) { return '<option value="' + (i + 1) + '"' + (i === now.getMonth() ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></div></label>' +
        '<label class="field"><span class="lbl">ปี พ.ศ.</span><div class="input"><input id="stYear" inputmode="numeric" maxlength="4" value="' + (now.getFullYear() + 543) + '"></div></label><button class="btn sm k" id="stGo">' + ic('search') + ' แสดง</button></div>');
      $('#stGo', det).onclick = function () {
        var y = Number($('#stYear', det).value), mo = Number($('#stMonth', det).value);
        if (!(y > 2400 && y < 2700)) { toast('กรุณาพิมพ์ปี พ.ศ. 4 หลัก', '', 'warn'); return; }
        var tb = det.querySelector('tbody'); tb.innerHTML = '<tr><td colspan="4">กำลังโหลด…</td></tr>';
        api('statsMonth', { year: y, month: mo }).then(function (r) { tb.innerHTML = r.days.slice().reverse().map(function (x) { return '<tr><td>' + esc(fmtDate(x.d + 'T00:00:00', true)) + '</td><td>' + fmtN(x.v) + '</td><td>' + fmtN(x.l) + '</td><td>' + fmtN(x.o) + '</td></tr>'; }).join(''); })
          .catch(function (e) { tb.innerHTML = '<tr><td colspan="4">' + esc(e.msg || 'โหลดไม่สำเร็จ') + '</td></tr>'; });
      };
    }
  };
})();

/* ---------- ภาพประกอบ: แนวตั้ง 9 ภาพ / แนวนอน 8 ภาพ ---------- */
(function () {
  var baseWelcome = renderWelcome;
  renderWelcome = function () {
    baseWelcome.apply(this, arguments);
    loadMedia().then(function () {
      var strip = document.getElementById('mediaStrip'); if (!strip || strip.querySelector('.m9')) return;
      var used = $$('img', strip).map(function (i) { return i.getAttribute('src'); });
      var m = (S.media || []).filter(function (x) { return !x.video && used.indexOf(x.src) < 0; })[0];
      if (m) strip.insertAdjacentHTML('beforeend', '<figure class="m9"><img src="' + esc(m.src) + '" alt="' + esc(m.alt || '') + '" loading="lazy"><figcaption>' + esc(m.author || '') + ' · ' + esc(m.license || '') + ' · ' + esc(m.source || '') + '</figcaption></figure>');
    });
  };
})();

/* ---------- เมนูฎีกา: ค้นหาคำพิพากษาศาลฎีกา ---------- */
ICONS.gavel = '<path d="m14 13-7.5 7.5a2.12 2.12 0 0 1-3-3L11 10"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/>';
I18N.th.deka = 'ฎีกา'; I18N.en.deka = 'Supreme Court'; if (I18N.ko) I18N.ko.deka = '대법원 판결';
if (!TABS.some(function (t) { return t[0] === 'deka'; })) TABS.splice(2, 0, ['deka', 'gavel']);
var DEKA = null;
function loadDeka() { if (DEKA) return Promise.resolve(DEKA); return loadIndex(DB_RAW + 'deka/index.json.gz').then(function (x) { DEKA = x; return x; }); }
VIEWS.deka = function (el) {
  var st = S.ui.dk || (S.ui.dk = { no: '', year: '', cat: '', type: '', law: '', sec: '', q: '' });
  el.innerHTML = '<div class="view-head"><div><h2>คำพิพากษาศาลฎีกา</h2><p class="sub" id="dkSub">ค้นหาด้วยเลขฎีกา ปี พ.ศ. กฎหมายและมาตรา หรือคำสำคัญในเนื้อหา</p></div></div>' +
    '<section class="panel dk-form"><div class="grid g3">' +
      '<div class="field"><label for="dkNo">เลขที่คำพิพากษา</label><div class="input"><input id="dkNo" inputmode="numeric" placeholder="เช่น 6511" value="' + esc(st.no) + '"></div></div>' +
      '<div class="field"><label for="dkYear">ปี พ.ศ.</label><div class="input"><input id="dkYear" inputmode="numeric" maxlength="4" placeholder="เช่น 2567" value="' + esc(st.year) + '"></div></div>' +
      '<div class="field"><label for="dkCat">ประเภทคดี</label><div class="input"><select id="dkCat"><option value="">ทุกประเภท</option><option value="พ">คดีแพ่ง</option><option value="อ">คดีอาญา</option><option value="-">อื่น ๆ / ไม่ระบุ</option></select></div></div>' +
      '<div class="field"><label for="dkType">ประเภทเอกสาร</label><div class="input"><select id="dkType"><option value="">ทุกประเภท</option></select></div></div>' +
      '<div class="field"><label for="dkLaw">กฎหมายที่อ้าง</label><div class="input"><input id="dkLaw" placeholder="เช่น ป.อ. หรือ ป.พ.พ." value="' + esc(st.law) + '"></div></div>' +
      '<div class="field"><label for="dkSec">มาตรา</label><div class="input"><input id="dkSec" placeholder="เช่น 334" value="' + esc(st.sec) + '"></div></div></div>' +
      '<div class="field" style="margin-top:10px"><label for="dkQ">คำสำคัญในเนื้อหาคำพิพากษา</label><div class="input">' + ic('search') + '<input id="dkQ" placeholder="เช่น ลักทรัพย์ในเวลากลางคืน" value="' + esc(st.q) + '"></div></div>' +
      '<div class="row" style="gap:10px;margin-top:12px;justify-content:flex-end"><button class="btn" id="dkClear">' + ic('x') + ' ล้าง</button><button class="btn k" id="dkGo">' + ic('search') + ' ค้นหา</button></div></section><div id="dkRes" style="margin-top:14px"></div>';
  $('#dkCat', el).value = st.cat;
  var res = $('#dkRes', el), list = [], shown = 0;
  loadPubStats().then(function (d) { if (d.deka && $('#dkSub', el)) $('#dkSub', el).textContent = 'ฐานข้อมูลคำพิพากษาและคำสั่งศาลฎีกา ' + fmtN(d.deka.total) + ' ฉบับ (พ.ศ. 2463 ถึงปัจจุบัน) · ค้นหาด้วยเลขฎีกา ปี กฎหมายและมาตรา หรือคำสำคัญ'; }).catch(function () {});
  function draw(reset) {
    if (reset) { shown = 0; res.innerHTML = ''; }
    if (!list.length) { res.innerHTML = '<div class="panel"><div class="empty"><div class="eic">' + ic('search') + '</div><h3>ไม่พบคำพิพากษาตามเงื่อนไข</h3><p>ลองลดเงื่อนไขการค้นหา เช่น ระบุเฉพาะปี พ.ศ. หรือเลขมาตรา</p></div></div>'; return; }
    var next = list.slice(shown, shown + 30); shown += next.length;
    var mb = $('#dkMore', res); if (mb) mb.remove();
    res.insertAdjacentHTML('beforeend', (shown === next.length ? '<div class="group-h">ผลการค้นหา <span class="cnt">' + fmtN(list.length) + ' ฉบับ</span></div>' : '') + next.map(function (x) {
      return '<button class="law-item" data-dk="' + x.docid + '" data-o="' + x.o + '"><span class="li-ic">' + ic('gavel') + '</span><span class="grow"><span class="li-t">' + esc(x.label) + '</span><br><span class="li-s">' + esc(x.sub) + '</span></span>' + ic('chevR') + '</button>';
    }).join('') + (shown < list.length ? '<button class="btn block" id="dkMore" style="margin-top:10px">แสดงเพิ่มเติม (' + fmtN(list.length - shown) + ')</button>' : ''));
    var m2 = $('#dkMore', res); if (m2) m2.onclick = function () { draw(false); };
  }
  function lawsOf(rec) { return (rec[6] || []).map(function (r) { return DEKA.laws[r[0]][0] + ' ม. ' + r[1] + (r[2] ? ' วรรค' + r[2] : '') + (r[3] ? ' ' + r[3] : ''); }); }
  function local() {
    var no = ard($('#dkNo', el).value.trim()).replace(/\D/g, ''), yr = ard($('#dkYear', el).value.trim()).replace(/\D/g, ''), cat = $('#dkCat', el).value, ty = $('#dkType', el).value, lw = norm($('#dkLaw', el).value.trim()), sec = ard($('#dkSec', el).value.trim()).replace(/\s+/g, ' ');
    var lawIdx = null;
    if (lw) { lawIdx = {}; DEKA.laws.forEach(function (x, i) { if (norm(x[0]).indexOf(lw) > -1 || norm(x[1]).indexOf(lw) > -1) lawIdx[i] = 1; }); }
    var out = [];
    for (var i = DEKA.recs.length - 1; i >= 0 && out.length < 5000; i--) {
      var r = DEKA.recs[i];
      if (no && String(r[1]).split('/')[0].replace(/\D/g, ' ').split(' ').indexOf(no) < 0 && String(r[1]).indexOf(no + '/') < 0) continue;
      if (yr && String(r[2]) !== yr) continue;
      if (cat && r[4] !== cat) continue;
      if (ty !== '' && String(r[3]) !== ty) continue;
      if (lawIdx || sec) { if (!(r[6] || []).some(function (x) { return (!lawIdx || lawIdx[x[0]]) && (!sec || ard(x[1]) === sec); })) continue; }
      out.push(r);
    }
    out.sort(function (a, b) { return b[2] - a[2]; });
    list = out.map(function (r) { var ls = lawsOf(r); return { docid: r[0], o: r[5], label: (DEKA.types[r[3]] || 'คำพิพากษาศาลฎีกา') + 'ที่ ' + r[1], sub: (r[4] === 'พ' ? 'คดีแพ่ง' : r[4] === 'อ' ? 'คดีอาญา' : 'อื่น ๆ') + (ls.length ? ' · ' + ls.slice(0, 4).join(', ') + (ls.length > 4 ? ' และอีก ' + (ls.length - 4) + ' มาตรา' : '') : '') }; });
    draw(true);
  }
  function run() {
    st.no = $('#dkNo', el).value.trim(); st.year = $('#dkYear', el).value.trim(); st.cat = $('#dkCat', el).value; st.type = $('#dkType', el).value; st.law = $('#dkLaw', el).value.trim(); st.sec = $('#dkSec', el).value.trim(); st.q = $('#dkQ', el).value.trim(); store.set('ui', S.ui);
    if (!st.no && !st.year && !st.law && !st.sec && !st.q && !st.cat && st.type === '') { res.innerHTML = '<div class="panel flat"><p class="small muted">กรอกเงื่อนไขอย่างน้อย 1 ช่อง แล้วกด “ค้นหา”</p></div>'; return; }
    res.innerHTML = '<div class="skeleton" style="height:70px"></div>';
    if (st.q) {
      api('dekaSearch', { q: st.q }, { timeout: 40000 }).then(function (r) {
        if (r.unavailable) { toast('บริการค้นหาคำในเนื้อหาไม่พร้อมชั่วคราว', 'ระบบค้นหาตามเลขฎีกา ปี และมาตราให้แทน', 'warn'); return loadDeka().then(local); }
        list = r.items.map(function (x) { return { docid: x.docid, o: x.o, label: x.label, sub: x.type + ' · ' + String(x.snippet || '').slice(0, 120) + '…' }; }); draw(true);
      }).catch(function () { loadDeka().then(local); });
    } else loadDeka().then(local).catch(function () { res.innerHTML = '<div class="panel"><div class="empty warn"><div class="eic">' + ic('wifiOff') + '</div><h3>ยังโหลดฐานข้อมูลคำพิพากษาไม่สำเร็จ</h3><p>กรุณาลองอีกครั้ง</p></div></div>'; });
  }
  loadDeka().then(function (x) { var sel = $('#dkType', el); if (!sel) return; sel.innerHTML = '<option value="">ทุกประเภท</option>' + x.types.map(function (t, i) { return '<option value="' + i + '">' + esc(t) + '</option>'; }).join(''); sel.value = st.type; if (st.no || st.year || st.law || st.sec || st.cat || st.type !== '') local(); }).catch(function () {});
  $('#dkGo', el).onclick = run;
  $$('#dkNo,#dkYear,#dkLaw,#dkSec,#dkQ', el).forEach(function (i) { i.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); run(); } }); });
  $('#dkClear', el).onclick = function () { S.ui.dk = null; store.set('ui', S.ui); refreshCurrent(); };
  on(res, 'click', '[data-dk]', function (e, b) { openDeka(b.getAttribute('data-dk'), b.getAttribute('data-o')); });
};
var DK_EL = null;
function openDeka(docid, o) {
  if (DK_EL) DK_EL.remove();
  DK_EL = h('<div class="fv-reader dk-reader" role="dialog" aria-modal="true" aria-label="คำพิพากษาศาลฎีกา"><div class="fv-in"><div class="fv-top"><button class="nav-arrow" data-dkx="1" aria-label="กลับไปผลการค้นหา">' + ic('arrowL') + '</button><div class="grow fv-title"><span class="tag">คำพิพากษาศาลฎีกา</span><h3 id="dkT">กำลังโหลด…</h3></div><button class="btn sm k fv-print" data-dkp="1">' + ic('download') + ' พิมพ์ PDF</button></div><div id="dkBody"><div class="skeleton" style="height:240px"></div></div></div></div>');
  document.body.appendChild(DK_EL); syncScrollLock();
  var close = function () { if (DK_EL) { DK_EL.remove(); DK_EL = null; syncScrollLock(); } };
  DK_EL.addEventListener('click', function (e) { if (e.target.closest('[data-dkx]')) close(); });
  DK_EL.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  DK_EL.tabIndex = -1; DK_EL.focus({ preventScroll: true });
  var paras = function (t) { return String(t || '').split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) { return '<p>' + esc(s) + '</p>'; }).join(''); };
  api('dekaGet', { docid: docid, o: o }, { timeout: 60000 }).then(function (r) {
    if (!DK_EL) return;
    $('#dkT', DK_EL).textContent = r.label;
    var html = '<div class="panel flat fv-meta"><div class="small">' + esc([r.type, 'ปี พ.ศ. ' + r.year, r.source, r.department].filter(Boolean).join(' · ')) + '</div>' + (r.laws.length ? '<div class="dk-laws">' + r.laws.map(function (x) { return '<span class="chip">' + esc(x) + '</span>'; }).join('') + '</div>' : '') + '</div>' +
      (r.shortText ? '<h4 class="fv-head">ย่อสั้น</h4><div class="fv-text">' + paras(r.shortText) + '</div>' : '') +
      '<h4 class="fv-head">' + (r.shortText ? 'รายละเอียด' : 'คำพิพากษา') + '</h4><div class="fv-text">' + paras(r.longText) + '</div>' +
      (r.judges ? '<p class="small muted" style="margin-top:10px">ผู้พิพากษา: ' + esc(r.judges) + '</p>' : '') + (r.lowerCourts ? '<p class="small muted">ศาลชั้นต้น/ศาลอุทธรณ์: ' + esc(r.lowerCourts) + '</p>' : '') +
      '<p class="tiny muted" style="margin-top:10px">ที่มา: ศาลฎีกา (deka.supremecourt.or.th) ผ่านชุดข้อมูลเปิด korakot/deka-bulk (CC0) — ข้อความตามต้นฉบับ</p>';
    $('#dkBody', DK_EL).innerHTML = html;
    $('[data-dkp]', DK_EL).onclick = function () { printDoc(r.label, r.type + ' · ปี พ.ศ. ' + r.year, (r.laws.length ? '<p class="ni"><b>มาตราที่เกี่ยวข้อง:</b> ' + esc(r.laws.join(', ')) + '</p>' : '') + (r.shortText ? '<h2>ย่อสั้น</h2>' + paras(r.shortText) : '') + '<h2>' + (r.shortText ? 'รายละเอียด' : 'คำพิพากษา') + '</h2>' + paras(r.longText) + (r.judges ? '<p class="ni st">ผู้พิพากษา: ' + esc(r.judges) + '</p>' : '')); };
  }).catch(function (e) { if (DK_EL) $('#dkBody', DK_EL).innerHTML = '<div class="panel"><div class="empty warn"><div class="eic">' + ic('alert') + '</div><h3>ยังเปิดคำพิพากษาไม่สำเร็จ</h3><p>' + esc((e && e.msg) || '') + '</p></div></div>'; });
}

/* ---------- อนุสัญญา: ทั่วโลก (Wikidata) + อนุสัญญาภาษีซ้อนของไทย (กรมสรรพากร) ---------- */
(function () {
  var baseTreaties = VIEWS.treaties;
  VIEWS.treaties = function (el) {
    baseTreaties(el);
    var head = $('.view-head', el); if (!head || $('#twBox', el)) return;
    head.insertAdjacentHTML('afterend', '<div class="tw-switch hscroll" id="twTabs"><button class="chip on" data-tw="th">' + ic('flag') + ' สนธิสัญญาของไทย (กระทรวงการต่างประเทศ)</button><button class="chip" data-tw="dta">' + ic('file') + ' อนุสัญญาภาษีซ้อนของไทย</button><button class="chip" data-tw="world">' + ic('globe') + ' อนุสัญญาและสนธิสัญญาทั่วโลก</button></div><div id="twBox" class="hidden" style="margin:12px 0"></div>');
    var box = $('#twBox', el), rest = []; var n = head.nextElementSibling.nextElementSibling.nextElementSibling; while (n) { rest.push(n); n = n.nextElementSibling; }
    on($('#twTabs', el), 'click', '[data-tw]', function (e, b) {
      $$('#twTabs .chip', el).forEach(function (x) { x.classList.toggle('on', x === b); });
      var t = b.getAttribute('data-tw'); rest.forEach(function (x) { x.classList.toggle('hidden', t !== 'th'); }); box.classList.toggle('hidden', t === 'th');
      if (t === 'dta') {
        box.innerHTML = '<div class="skeleton" style="height:90px"></div>';
        api('thaiDta', {}, { timeout: 40000 }).then(function (r) { box.innerHTML = '<div class="panel flat small" style="margin-bottom:8px">อนุสัญญาเพื่อการเว้นการเก็บภาษีซ้อนที่ประเทศไทยทำกับต่างประเทศ ' + r.items.length + ' รายการ · ที่มา: ' + esc(r.source) + '</div><div class="table-scroll"><table class="ptable"><tbody>' + r.items.map(function (x) { return '<tr>' + x.cells.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '<td>' + statusBadge(false) + '</td></tr>'; }).join('') + '</tbody></table></div>'; })
          .catch(function (er) { box.innerHTML = '<div class="panel"><div class="empty warn"><div class="eic">' + ic('wifiOff') + '</div><h3>ยังโหลดข้อมูลไม่สำเร็จ</h3><p>' + esc((er && er.msg) || '') + '</p></div></div>'; });
      } else if (t === 'world') worldTreaties(box);
    });
  };
})();
function worldTreaties(box, cont, cc) {
  box.innerHTML = '<div class="skeleton" style="height:90px"></div>';
  Promise.all([loadWorld(), api('treatyWorld', {}, { timeout: 60000 }).catch(function () { return null; })]).then(function (rs) {
    var w = rs[0], tw = rs[1] || { byCountry: {}, total: 0 };
    var all = [{ cc: 'TH', th: 'ไทย', en: 'Thailand', cont: 'AS', asean: true }].concat(w.countries);
    if (cc) {
      var c = all.filter(function (x) { return x.cc === cc; })[0];
      box.innerHTML = '<div class="row" style="gap:10px;margin-bottom:10px"><button class="icon-btn" id="twBack" aria-label="กลับ">' + ic('arrowL') + '</button><b class="grow">' + esc(c.th) + ' · ' + fmtN(tw.byCountry[cc] || 0) + ' ฉบับ</b></div><div id="twList"><div class="skeleton" style="height:90px"></div></div>';
      $('#twBack', box).onclick = function () { worldTreaties(box, cont); };
      api('treatiesOf', { cc: cc }, { timeout: 60000 }).then(function (r) {
        $('#twList', box).innerHTML = '<div class="col">' + r.items.map(function (x) { return '<div class="law-item"><span class="li-ic">' + ic('globe') + '</span><span class="grow"><span class="li-t">' + esc(x.th || x.en) + '</span> ' + (x.inForce ? '<span class="st-badge ok">มีผลบังคับใช้</span>' : '<span class="st-badge bad">สิ้นผลแล้ว</span>') + '<br><span class="li-s">' + esc([x.th ? x.en : '', x.date ? 'ลงนาม/จัดทำ ' + x.date : '', x.end ? 'สิ้นผล ' + x.end : ''].filter(Boolean).join(' · ')) + '</span></span></div>'; }).join('') + '</div><p class="tiny muted" style="margin-top:8px">ที่มา: ' + esc(r.source) + '</p>';
      }).catch(function (er) { $('#twList', box).innerHTML = '<p class="small muted">' + esc((er && er.msg) || 'โหลดไม่สำเร็จ') + '</p>'; });
      return;
    }
    if (cont) {
      var list = (cont === 'ASEAN' ? all.filter(function (x) { return x.asean; }) : all.filter(function (x) { return x.cont === cont && !x.asean; })).sort(function (a, b) { return (tw.byCountry[b.cc] || 0) - (tw.byCountry[a.cc] || 0); });
      box.innerHTML = '<div class="row" style="gap:10px;margin-bottom:10px"><button class="icon-btn" id="twBack" aria-label="กลับ">' + ic('arrowL') + '</button><b class="grow">' + esc(cont === 'ASEAN' ? 'ประชาคมอาเซียน' : CONT_TH[cont]) + '</b></div><div class="fgn-grid">' + list.map(function (c) { return '<button class="fgn-card" data-twc="' + c.cc + '"><span class="fgn-code">' + c.cc + '</span><span class="grow"><b>' + esc(c.th) + '</b><br><span class="small muted">' + fmtN(tw.byCountry[c.cc] || 0) + ' ฉบับ</span></span>' + ic('chevR') + '</button>'; }).join('') + '</div>';
      $('#twBack', box).onclick = function () { worldTreaties(box); };
      on(box, 'click', '[data-twc]', function (e, b) { worldTreaties(box, cont, b.getAttribute('data-twc')); });
      return;
    }
    var groups = [['ASEAN', 'ประชาคมอาเซียน']].concat(CONT_ORDER.map(function (k) { return [k, CONT_TH[k]]; }));
    box.innerHTML = '<div class="panel flat small" style="margin-bottom:8px">อนุสัญญาและสนธิสัญญาทั่วโลก ' + fmtN(tw.total) + ' ฉบับ (ข้อมูลเปิด Wikidata ปรับปรุงวันละครั้ง) แยกตามทวีปและประเทศภาคี</div><div class="fgn-grid">' + groups.map(function (g) {
      var cs = g[0] === 'ASEAN' ? all.filter(function (x) { return x.asean; }) : all.filter(function (x) { return x.cont === g[0] && !x.asean; });
      return '<button class="fgn-card" data-twg="' + g[0] + '"><span class="fgn-code">' + (g[0] === 'ASEAN' ? ic('globe') : g[0]) + '</span><span class="grow"><b>' + esc(g[1]) + '</b><br><span class="small muted">' + cs.length + ' ประเทศ</span></span>' + ic('chevR') + '</button>';
    }).join('') + '</div>';
    on(box, 'click', '[data-twg]', function (e, b) { worldTreaties(box, b.getAttribute('data-twg')); });
  });
}
ICONS.flag = ICONS.flag || '<path d="M4 22V4"/><path d="M4 4h12l-2 4 2 4H4"/>';
</script>
