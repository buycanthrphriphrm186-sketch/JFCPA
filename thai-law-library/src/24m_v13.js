<script>
/* ==========================================================================
   v13: แก้ไขเฉพาะจุดตามคำสั่ง — ไม่ลบข้อมูลกฎหมายหรือระบบเดิม
   ========================================================================== */

/* ---------- 1) ดูดวง: กรอบอธิบายโหราศาสตร์ → กด “ดูดวงของฉัน” จึงแสดงเฉพาะคำทำนายของผู้ใช้ · ปุ่ม “ล้าง” มุมขวาบน ---------- */
var HORO_INTRO = [
  ['วันเกิดและเทวดาประจำวัน', 'โหราศาสตร์ไทยถือว่าวันเกิดตามสัปดาห์บอกพื้นฐานนิสัยของบุคคล เพราะแต่ละวันมีดาวพระเคราะห์เป็นเจ้าวัน ได้แก่ อาทิตย์ จันทร์ อังคาร พุธ พฤหัสบดี ศุกร์ เสาร์ และราหู (พุธกลางคืน หลัง 18.00 น.) แต่ละวันมีพระพุทธรูปประจำวัน สีประจำวัน และเลขประจำดาวกำกับ'],
  ['ทักษาปกรณ์', 'ตำราทักษาจัดวันทั้ง 8 เป็นภูมิทั้ง 8 ได้แก่ บริวาร อายุ เดช ศรี มูละ อุตสาหะ มนตรี และกาลกิณี โดยเริ่มนับจากวันเกิด ใช้พิจารณาสีมงคล อักษรมงคล และสิ่งที่ควรหลีกเลี่ยง ผลจึงแตกต่างกันตามวันเกิดของแต่ละคน'],
  ['อักษรประจำวันและเลขศาสตร์', 'อักษรไทยแบ่งเป็น 8 วรรคตามวันทั้ง 8 ชื่อแต่ละชื่อจึงมีอักษรที่ส่งเสริมหรือเป็นกาลกิณีต่างกันตามวันเกิด ส่วนเลขศาสตร์นำค่าตัวอักษรมารวมกันเพื่อพิจารณาพลังของชื่อ'],
  ['ราศีและปีนักษัตร', 'ราศีตามสุริยคติกำหนดจากวันที่เกิด แบ่งเป็น 12 ราศีและ 4 ธาตุ (ไฟ ดิน ลม น้ำ) ส่วนปีนักษัตรตามตำราจีนมี 12 นักษัตร ใช้พิจารณาความสัมพันธ์กับปีปัจจุบัน เช่น ปีชง ปีสามประสาน และปีหกประสาน'],
  ['ยามเกิดและจันทรคติ', 'เวลาเกิดแบ่งเป็นยามละ 2 ชั่วโมงตามตำราจีน และวันเกิดตรงกับข้างขึ้นหรือข้างแรมตามจันทรคติ ซึ่งเพิ่มรายละเอียดของดวงชะตาให้ละเอียดขึ้น ผู้ที่ทราบเวลาเกิดจะได้คำทำนายที่ละเอียดกว่า'],
  ['วิธีใช้', 'กรอกชื่อ (และนามสกุลถ้าต้องการ) วันเกิด เวลาเกิด แล้วตรวจวันเกิดตามสัปดาห์ (ระบบเลือกให้อัตโนมัติจากวันที่ เปลี่ยนเองได้ เช่น เกิดวันพุธหลัง 18.00 น. ให้เลือก “พุธ (กลางคืน)”) จากนั้นกด “ดูดวงของฉัน” คำทำนายจะแสดงเฉพาะของท่าน และเปลี่ยนไปตามชื่อ วันเกิด เวลาเกิด วันในสัปดาห์ ช่วงเดือน และปีปัจจุบัน กด “ล้าง” ที่มุมขวาบนเพื่อเริ่มใหม่']
];
VIEWS.horo = function (el) {
  var m = S.member || {}, saved = store.get('horo11', {}) || {};
  var bd = saved.date || (/^\d{4}-\d{2}-\d{2}/.test(String(m.birthDate || '')) ? String(m.birthDate).slice(0, 10) : '');
  var st = { dow: saved.dow !== undefined && saved.dow !== '' ? +saved.dow : null, manual: !!saved.manual };
  el.innerHTML = '<div class="view-head"><div><h2>' + ic('sparkle') + ' ดูดวง</h2><p class="sub">ดวงชะตาเฉพาะบุคคลตามวันเกิด เวลาเกิด และชื่อ เพื่อเป็นกำลังใจในการใช้ชีวิต</p></div><button class="btn sm" id="hrClear">' + ic('eraser') + ' ล้าง</button></div>' +
    '<section class="panel horo-form"><div class="hf-grid">' +
      '<div class="field"><label for="hrName">ชื่อ</label><div class="input"><input id="hrName" maxlength="60" value="' + esc(saved.name || m.firstName || m.displayName || '') + '" placeholder="เช่น บุญจันทร์"></div></div>' +
      '<div class="field"><label for="hrSur">นามสกุล (ไม่บังคับ)</label><div class="input"><input id="hrSur" maxlength="60" value="' + esc(saved.surname || m.lastName || '') + '" placeholder="เช่น พรีพรม"></div></div>' +
      '<div class="field"><label for="hrDate">วันเกิด</label><div class="input"><input id="hrDate" type="date" value="' + esc(bd) + '"></div></div>' +
      '<div class="field"><label for="hrTime">เวลาเกิด (ถ้าทราบ)</label><div class="input"><input id="hrTime" type="time" value="' + esc(saved.time || '') + '"></div></div>' +
    '</div><div class="field"><label>วันเกิดตามสัปดาห์</label><div class="hscroll hg-tabs" id="hrDow">' + HORO.DAYS.map(function (d, i) { return '<button type="button" class="chip" data-dw="' + i + '">' + esc(d.n) + '</button>'; }).join('') + '</div><div class="tiny muted" id="hrDowNote"></div></div>' +
    '<label class="hf-chk"><input type="checkbox" id="hrUseSur" ' + (saved.useSur ? 'checked' : '') + '> นำนามสกุลมาวิเคราะห์ด้วย</label>' +
    '<button class="btn lg k block" id="hrGo">' + ic('sparkle') + ' ดูดวงของฉัน</button></section>' +
    '<section class="panel horo-intro" id="hrIntro"><h3>' + ic('info') + ' โหราศาสตร์ไทยพิจารณาอะไรบ้าง</h3>' + HORO_INTRO.map(function (x, i) { return '<div class="hi-it"><b>' + (i + 1) + '. ' + esc(x[0]) + '</b><p>' + esc(x[1]) + '</p></div>'; }).join('') +
      '<div class="hi-gal"><b>พระประจำวันเกิดของวันที่เลือก</b><div id="hgBox"><p class="muted small">เลือกวันเกิดเพื่อดูภาพและคำอธิบาย</p></div></div></section>' +
    '<article class="panel horo-out" id="hrOut" hidden></article>';
  var dateIn = $('#hrDate', el), timeIn = $('#hrTime', el);
  var autoDow = function () { var v = dateIn.value; if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null; var d = new Date(v + 'T12:00:00'), w = d.getDay(), hr = timeIn.value ? +timeIn.value.split(':')[0] : null; return w === 3 && hr !== null && hr >= 18 ? 7 : w; };
  var paintDow = function () {
    var a = autoDow(); if (!st.manual || st.dow === null) st.dow = a;
    $$('#hrDow .chip', el).forEach(function (c) { c.classList.toggle('on', +c.getAttribute('data-dw') === st.dow); });
    var n = $('#hrDowNote', el);
    n.textContent = st.dow === null ? 'เลือกวันเกิดเพื่อให้ระบบกำหนดวันในสัปดาห์ให้อัตโนมัติ' : (a !== null && st.dow !== a ? 'ท่านเลือกวัน' + HORO.DAYS[st.dow].n + ' (วันที่ ' + dateIn.value + ' ตรงกับวัน' + HORO.DAYS[a].n + ') ระบบจะใช้วันที่ท่านเลือก' : 'วันที่เกิดตรงกับวัน' + HORO.DAYS[st.dow].n);
    if (st.dow !== null && !$('#hrIntro', el).hidden) { var d = HORO.DAYS[st.dow], box = $('#hgBox', el); box.innerHTML = '<p>วัน' + esc(d.n) + ' · เทวดาประจำวัน: ' + esc(d.g) + ' · พระประจำวัน: ' + esc(d.p) + ' · สีประจำวัน: ' + esc(d.c) + ' · เลขประจำดาว: ' + d.num + '</p><div class="hg-img"></div>'; horoImage(st.dow, $('.hg-img', box)); }
  };
  dateIn.addEventListener('change', function () { st.manual = false; paintDow(); });
  timeIn.addEventListener('change', function () { if (!st.manual) paintDow(); });
  on($('#hrDow', el), 'click', '[data-dw]', function (e, b) { st.dow = +b.getAttribute('data-dw'); st.manual = true; paintDow(); });
  paintDow();
  $('#hrGo', el).onclick = function () {
    var inp = { name: $('#hrName', el).value.trim(), surname: $('#hrSur', el).value.trim(), date: dateIn.value, time: timeIn.value, useSur: $('#hrUseSur', el).checked, dow: st.dow, manual: st.manual };
    if (!inp.name) { toast('กรุณากรอกชื่อ', '', 'warn'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inp.date)) { toast('กรุณาเลือกวันเกิด', '', 'warn'); return; }
    store.set('horo11', inp);
    var now = new Date(), r = HORO.compute(inp, now); if (!r) { toast('วันเกิดไม่ถูกต้อง', '', 'warn'); return; }
    $('#hrIntro', el).hidden = true;
    var out = $('#hrOut', el); out.hidden = false;
    out.innerHTML = HORO.report(r, now) + '<div class="hr-imgs"><h3>' + ic('image') + ' พระประจำวัน' + esc(r.day.n) + '</h3><div id="hrImg"></div></div><div class="row wrapr" style="gap:8px;margin-top:12px"><button class="btn" id="hrPrint">' + ic('printer') + ' พิมพ์ PDF</button></div>';
    horoImage(r.di, $('#hrImg', out));
    $('#hrPrint', out).onclick = function () { var c = out.cloneNode(true); $$('button,.hr-imgs', c).forEach(function (x) { x.remove(); }); PRINT_SRC = 'หลักโหราศาสตร์ไทยและสากลที่เผยแพร่เป็นความรู้ทั่วไป (เรียบเรียงโดยเว็บไซต์ “คลังกฎหมาย”) — เพื่อเป็นกำลังใจ ไม่ใช่การรับรองผล'; printDoc('ดวงชะตาของคุณ' + r.fullName, 'Personal horoscope', c.innerHTML); };
    var y = out.getBoundingClientRect().top + window.scrollY - 80; window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  };
  $('#hrClear', el).onclick = function () {
    store.set('horo11', {}); st.dow = null; st.manual = false;
    $('#hrName', el).value = ''; $('#hrSur', el).value = ''; dateIn.value = ''; timeIn.value = ''; $('#hrUseSur', el).checked = false;
    var out = $('#hrOut', el); out.hidden = true; out.innerHTML = ''; $('#hrIntro', el).hidden = false; $('#hgBox', el).innerHTML = '<p class="muted small">เลือกวันเกิดเพื่อดูภาพและคำอธิบาย</p>';
    paintDow(); window.scrollTo({ top: 0, behavior: 'smooth' }); toast('ล้างข้อมูลแล้ว', 'กรอกข้อมูลใหม่แล้วกด “ดูดวงของฉัน”', 'ok');
  };
};

/* ---------- 2) แชท: กดส่งแล้วหน้าไม่เด้ง ไม่กะพริบขาว (อัปเดตเฉพาะข้อความที่เปลี่ยน) · ช่องพิมพ์ไม่ซ้อนข้อความ ---------- */
var CH13 = { sticking: false };
function chMsgHtml(m) {
  var me = m.sender === 'member', st = '';
  if (me) {
    if (m.status === 'failed') st = '<button class="ch-st bad" data-retry>' + ic('alert') + ' แตะเพื่อส่งอีกครั้ง</button>';
    else if (m.status === 'pending') st = m.prog !== undefined ? '<span class="ch-st">' + Math.round(m.prog * 100) + '%</span>' : '';
    else st = '<span class="ch-st ' + (m.read ? 'rd' : '') + '">' + ic('check') + (m.read ? ' อ่านแล้ว' : ' ยังไม่อ่าน') + '</span>';
  }
  var at = m.attach ? chAttachHtml(m) : '', body = m.attach ? String(m.text || '').replace(/^\[ไฟล์แนบ\][^\n]*\n?/, '') : m.text;
  var acts = me && m.id && m.status !== 'pending' ? '<span class="ch-acts">' + (m.attach ? '' : '<button class="ch-a" data-edit="' + esc(m.id) + '" aria-label="แก้ไขข้อความ">' + ic('edit') + '</button>') + '<button class="ch-a" data-del="' + esc(m.id) + '" aria-label="ลบข้อความ">' + ic('trash') + '</button></span>' : '';
  return (me ? '' : '<div class="ch-who">' + ic('shieldCheck') + ' ' + esc(m.adminName || 'ผู้ดูแลระบบ') + '</div>') + '<div class="ch-bub">' + at + (String(body || '').trim() ? '<div class="ch-tx">' + esc(body).replace(/\n/g, '<br>') + '</div>' : '') + '</div><div class="ch-meta">' + fmtTime(m.time) + (m.edited ? ' · แก้ไขแล้ว' : '') + ' ' + st + acts + '</div>';
}
chatDraw = function (stick) {
  var log = document.getElementById('chLog'); if (!log) return;
  var near = (window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 200;
  if (!CHAT.msgs.length) { if (!log.querySelector('.empty')) log.innerHTML = '<div class="empty"><div class="eic">' + ic('chat') + '</div><h3>เริ่มสนทนากับผู้ดูแลระบบ</h3><p>พิมพ์คำถาม ข้อร้องเรียน หรือแจ้งปัญหาการใช้งานได้ที่ช่องด้านล่าง แนบรูปภาพหรือไฟล์ได้ด้วยปุ่ม +</p></div>'; return; }
  var em = log.querySelector('.empty'); if (em) em.remove();
  var want = [], day = '';
  CHAT.msgs.forEach(function (m) { var d = fmtDate(m.time); if (d !== day) { want.push({ k: 'd:' + d, day: d }); day = d; } want.push({ k: 'm:' + (m.cid || m.id), m: m }); });
  var have = {}; [].slice.call(log.children).forEach(function (n) { if (n.dataset.k13) have[n.dataset.k13] = n; else n.remove(); });
  var keep = {}, prev = null;
  want.forEach(function (w) {
    keep[w.k] = 1;
    var n = have[w.k], html = w.day ? '<span>' + esc(w.day) + '</span>' : chMsgHtml(w.m);
    if (!n) { n = document.createElement('div'); n.dataset.k13 = w.k; }
    var cls = w.day ? 'ch-day' : 'ch-msg ' + (w.m.sender === 'member' ? 'me' : 'adm') + (w.m.status === 'pending' ? ' pend' : '');
    if (n.className !== cls) n.className = cls;
    if (n.__h !== html) { n.innerHTML = html; n.__h = html; $$('.ch-img[data-f]', n).forEach(chLoadImg); }
    var ref = prev ? prev.nextSibling : log.firstChild;
    if (n !== ref) log.insertBefore(n, ref);
    prev = n;
  });
  Object.keys(have).forEach(function (k) { if (!keep[k]) have[k].remove(); });
  if ((stick || near) && !CH13.sticking) { CH13.sticking = true; requestAnimationFrame(function () { CH13.sticking = false; var f = document.getElementById('chForm'); var y = document.documentElement.scrollHeight - window.innerHeight; if (Math.abs(window.scrollY - y) > 2) window.scrollTo(0, y); }); }
};
(function () {
  var baseView = VIEWS.chat;
  VIEWS.chat = function (el) {
    baseView(el);
    var inp = $('#chIn', el);
    if (inp) {
      inp.setAttribute('placeholder', 'พิมพ์ข้อความ…'); inp.setAttribute('rows', '1');
      var grow = function () { inp.style.height = 'auto'; inp.style.height = Math.min(Math.max(inp.scrollHeight, 44), 180) + 'px'; };
      inp.addEventListener('input', grow); grow();
      /* ส่งข้อความโดยไม่ให้หน้ากระโดด: เก็บตำแหน่งปุ่มส่งไว้ และคงโฟกัสช่องพิมพ์ */
      var form = $('#chForm', el);
      form.addEventListener('submit', function () { setTimeout(function () { try { inp.focus({ preventScroll: true }); } catch (e) {} grow(); }, 0); }, true);
      /* ช่องพิมพ์ยึดตำแหน่งกับหน้าจอ (ไม่ขยับขึ้น–ลงเมื่อส่งข้อความหรือเลื่อนถึงท้ายหน้า) */
      var box = $('.chat10', el), pad = document.createElement('div'); pad.className = 'ch-pad'; box.appendChild(pad);
      form.classList.add('ch-fixed');
      $$('body > .ch-form.ch-fixed').forEach(function (x) { if (x !== form) x.remove(); });
      document.body.appendChild(form);   // อยู่นอกกล่องที่มีแอนิเมชัน transform จึงยึดกับหน้าจอได้จริง
      var place = function () {
        if (!box.isConnected) { window.removeEventListener('resize', place); mo.disconnect(); form.remove(); return; }
        var r = box.getBoundingClientRect(); form.style.left = Math.round(r.left) + 'px'; form.style.width = Math.round(r.width) + 'px';
        pad.style.height = (form.offsetHeight + 8) + 'px';
      };
      var mo = new MutationObserver(function () { place(); }); mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      var mo2 = new MutationObserver(function () { if (!box.isConnected) { mo2.disconnect(); place(); } }); mo2.observe(document.getElementById('view') || document.body, { childList: true });
      place(); window.addEventListener('resize', place); new ResizeObserver(place).observe(form); setTimeout(place, 300);
    }
  };
})();

/* ---------- 3) เปลี่ยนภาษาเว็บไซต์ (ไทย / English / 한국어): ทุกหน้าเปลี่ยนตามภาษาที่เลือก ยกเว้นเนื้อหากฎหมาย อนุสัญญา และข้อความที่ผู้ใช้พิมพ์ ---------- */
var UI13 = { lang: 'th', dict: {}, queue: {}, timer: null, busy: false, obs: null };
var UI13_SKIP = '#homeClock,#todayTime,.avatar,.tab-me,.flip,.fcard,.cards,.doc9,.doc-text,.doc-sec,.fv-art,.fv-title,.fv-body,.tr11-text,.tr11-h h2,.dk-reader,.dk-text,.deka-body,.ch-tx,.ch-who,.horo-out,.r-text,.r-ih b,.li-t,.tw-item .li-t,.tw-tr,.trx,.prose.law,.law-head h2,.law-title,.sec-text,.section-text,[data-notr],script,style,textarea,input,select,option,code,pre,.toast .tb,.entry .es,.entry .et,.ai2-log,.notes-ed,[contenteditable]';
var TH_RE = /[฀-๿]/;
function ui13Lang() { return (S.ud && S.ud.settings && S.ud.settings.lang) || 'th'; }
function ui13Load(lang) { try { return JSON.parse(localStorage.getItem('tll.ui13.' + lang) || '{}') || {}; } catch (e) { return {}; } }
function ui13Save() { try { localStorage.setItem('tll.ui13.' + UI13.lang, JSON.stringify(UI13.dict)); } catch (e) {} }
function ui13Skip(node) { var el = node.nodeType === 1 ? node : node.parentElement; return !el || !!el.closest(UI13_SKIP); }
function ui13Apply(root) {
  if (UI13.lang === 'th' || !root) return;
  var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, list = [];
  while ((n = tw.nextNode())) { var t = n.nodeValue; if (t && TH_RE.test(t) && !ui13Skip(n)) list.push(n); }
  list.forEach(function (node) {
    var raw = node.__th13 !== undefined ? node.__th13 : node.nodeValue, key = raw.trim(); if (!key || key.length > 600) return;
    if (UI13.dict[key]) { if (node.__th13 === undefined) node.__th13 = raw; var v = raw.replace(key, UI13.dict[key]); if (node.nodeValue !== v) node.nodeValue = v; }
    else UI13.queue[key] = 1;
  });
  (root.querySelectorAll ? [].slice.call(root.querySelectorAll('[placeholder],[aria-label],[title]')) : []).forEach(function (el) {
    if (ui13Skip(el) && !/^(INPUT|TEXTAREA)$/.test(el.tagName)) return;
    ['placeholder', 'aria-label', 'title'].forEach(function (a) { var v = el.getAttribute(a); if (!v || !TH_RE.test(v)) return; var k = v.trim(); if (UI13.dict[k]) { el.setAttribute('data-th-' + a, v); el.setAttribute(a, UI13.dict[k]); } else UI13.queue[k] = 1; });
  });
  if (Object.keys(UI13.queue).length) ui13Flush();
}
function ui13Flush() {
  clearTimeout(UI13.timer);
  UI13.timer = setTimeout(function () {
    if (UI13.busy || UI13.lang === 'th' || !S.token) return;
    var keys = Object.keys(UI13.queue).slice(0, 60); if (!keys.length) return;
    keys.forEach(function (k) { delete UI13.queue[k]; });
    UI13.busy = true;
    api('translate', { to: UI13.lang, texts: keys }, { timeout: 60000, silent: true }).then(function (r) {
      keys.forEach(function (k, i) { if (r.texts && r.texts[i]) UI13.dict[k] = r.texts[i]; });
      ui13Save();
    }).catch(function () {}).then(function () { UI13.busy = false; ui13Apply(document.getElementById('root') || document.body); if (Object.keys(UI13.queue).length) ui13Flush(); });
  }, 250);
}
function ui13Start() {
  var lang = ui13Lang(); if (lang === UI13.lang && UI13.obs) return;
  var prev = UI13.lang; UI13.lang = lang; UI13.dict = lang === 'th' ? {} : ui13Load(lang); UI13.queue = {};
  if (UI13.obs) { UI13.obs.disconnect(); UI13.obs = null; }
  document.documentElement.setAttribute('lang', lang);
  if (lang !== 'th') {
    UI13.obs = new MutationObserver(function (ms) { if (UI13.lang === 'th') return; var roots = []; ms.forEach(function (m) { m.addedNodes.forEach(function (x) { if (x.nodeType === 1) roots.push(x); else if (x.nodeType === 3 && x.parentElement) roots.push(x.parentElement); }); if (m.type === 'characterData' && m.target.parentElement) roots.push(m.target.parentElement); }); roots.forEach(function (r) { if (r.isConnected) ui13Apply(r); }); });
    UI13.obs.observe(document.body, { childList: true, subtree: true });
    ui13Apply(document.body);
  }
  if (prev !== lang && prev && S.token && document.getElementById('view')) { try { renderApp(); nav((S.ui && S.ui.view) || 'home', { noAnim: true, keepScroll: true }); } catch (e) {} }
}
(function () {
  var baseApply = applySettings;
  applySettings = function () { var r = baseApply.apply(this, arguments); try { if (S.token) setTimeout(ui13Start, 0); } catch (e) {} return r; };
  var baseApp = renderApp;
  renderApp = function () { var r = baseApp.apply(this, arguments); setTimeout(function () { if (UI13.lang !== 'th') ui13Apply(document.body); else ui13Start(); }, 0); return r; };
})();

/* ---------- 4) อนุสัญญา/สนธิสัญญา: ข้อมูลข้อเท็จจริงครบทุกฉบับ (4,357 ฉบับ) จาก Wikidata + ตัวบท/สาระสำคัญ เมื่อแหล่งข้อมูลเปิดมี ---------- */
var TRI = {};
function treatyInfo(id) {
  var n = (parseInt(String(id).replace(/\D/g, ''), 10) || 0) % 64, k = ('0' + n).slice(-2);
  if (TRI[k]) return Promise.resolve(TRI[k][id] || null);
  return loadIndex(DB_RAW + 'treaties/info/' + k + '.json.gz').then(function (j) { TRI[k] = j || {}; return TRI[k][id] || null; }).catch(function () { return null; });
}
var LANG_TH = (function () { try { return new Intl.DisplayNames(['th'], { type: 'language' }); } catch (e) { return null; } })();
function langName(c) { try { return (LANG_TH && LANG_TH.of(c)) || c; } catch (e) { return c; } }
(function () {
  var baseRec = treatyRec;
  treatyRec = function (id) {
    return Promise.all([baseRec(id).catch(function () { return null; }), treatyInfo(id)]).then(function (rs) {
      var rec = rs[0], inf = rs[1];
      if (!inf) return rec;
      var lines = [];
      if (inf.d && (inf.d.th || inf.d.en)) lines.push('คำอธิบาย: ' + (inf.d.th || inf.d.en));
      var by = {}, order = [];
      (inf.f || []).forEach(function (f) { if (!by[f[1]]) { by[f[1]] = []; order.push(f[1]); } if (by[f[1]].indexOf(f[2]) < 0) by[f[1]].push(f[2]); });
      order.forEach(function (pl) { var v = by[pl]; lines.push(pl + ': ' + (v.length > 40 ? v.slice(0, 40).join(', ') + ' และอีก ' + (v.length - 40) + ' รายการ' : v.join(', '))); });
      var names = Object.keys(inf.n || {}).filter(function (l) { return l && inf.n[l]; });
      if (names.length) { lines.push('ชื่อของเอกสารฉบับนี้ในภาษาต่าง ๆ (' + names.length + ' ภาษา):'); names.sort(function (a, b) { return (a === 'th' ? -2 : a === 'en' ? -1 : 0) - (b === 'th' ? -2 : b === 'en' ? -1 : 0) || a.localeCompare(b); }).forEach(function (l) { lines.push('• ' + langName(l) + ' (' + l + '): ' + inf.n[l]); }); }
      var head = ['ข้อมูลข้อเท็จจริงของเอกสาร (ที่มา: Wikidata)'].concat(lines);
      if (!rec || rec.k === 'meta') return { k: 'facts', src: 'Wikidata ' + id + (rec && rec.src && rec.k !== 'meta' ? ' · ' + rec.src : ''), p: head.concat(rec && rec.p && rec.k === 'meta' ? [] : []) };
      return { k: rec.k, src: rec.src + ' · Wikidata ' + id, p: head.concat(['—', rec.k === 'text' ? 'ตัวบท' : 'สาระสำคัญ']).concat(rec.p) };
    });
  };
})();
</script>
