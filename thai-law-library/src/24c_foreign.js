<script>
/* ==========================================================================
   กฎหมายต่างประเทศ (อ่านอย่างเดียว ภายในเว็บไซต์) + การชำระเงินแพ็กเกจ
   ========================================================================== */
var FGN = { countries: null };
function loadForeignCountries() {
  if (FGN.countries) return Promise.resolve(FGN.countries);
  return api('foreignCountries', {}, { timeout: 30000 }).then(function (r) { FGN.countries = r; return r; });
}
(function () {
  var base = VIEWS.content;
  VIEWS.content = function (el) {
    base(el);
    var chips = $('#catChips', el); if (!chips) return;
    var st = S.ui.content || {};
    var wrap = h('<div class="fgn-entry"><button class="btn ' + (st.foreign ? 'k' : '') + '" id="fgnBtn" aria-pressed="' + (st.foreign ? 'true' : 'false') + '">' + ic('globe') + ' กฎหมายต่างประเทศ</button><span class="tiny muted">อ่านจากแหล่งข้อมูลทางการของแต่ละประเทศ แบบอ่านอย่างเดียว</span></div>');
    chips.parentNode.insertBefore(wrap, chips.nextSibling);
    function setForeign(on_) {
      st.foreign = on_; store.set('ui', S.ui);
      var b = $('#fgnBtn', el); b.classList.toggle('k', on_); b.setAttribute('aria-pressed', String(on_));
      if (on_) { $$('#catChips .chip', el).forEach(function (c) { c.classList.remove('on'); }); renderForeign($('#ctBody', el)); }
    }
    $('#fgnBtn', el).onclick = function () { tap(); if (st.foreign) { setForeign(false); st.cat = ''; refreshCurrent(); } else setForeign(true); };
    on(chips, 'click', '[data-cat]', function () { if (st.foreign) { st.foreign = false; store.set('ui', S.ui); var b = $('#fgnBtn', el); b.classList.remove('k'); b.setAttribute('aria-pressed', 'false'); } });
    if (st.foreign) setForeign(true);
  };
})();
function renderForeign(box) {
  var st = S.ui.content;
  box.innerHTML = '<div class="skeleton" style="height:120px"></div>';
  loadForeignCountries().then(function (r) {
    if (!box.isConnected) return;
    if (st.fc) { var c = r.countries.filter(function (x) { return x.code === st.fc; })[0]; if (c) return renderCountry(box, c); }
    box.innerHTML = '<div class="group-h">เลือกประเทศ <span class="cnt">' + r.countries.length + ' ประเทศ</span></div><div class="fgn-grid anim-list">' + r.countries.map(function (c) {
      return '<button class="fgn-card" data-fc="' + esc(c.code) + '"><span class="fgn-code">' + esc(c.code) + '</span><span class="grow"><b>' + esc(c.name) + '</b> <span class="muted small">' + esc(c.native) + '</span><br><span class="small ' + (c.ready ? 'ok-t' : 'muted') + '">' + (c.count !== null && c.count !== undefined ? fmtN(c.count) + ' ฉบับ · ' : '') + (c.ready ? 'อ่านในเว็บไซต์ได้' : 'แสดงลิงก์แหล่งทางการ') + '</span></span>' + ic('chevR') + '</button>';
    }).join('') + '</div><p class="tiny muted" style="margin-top:12px">จำนวนกฎหมายไทยในฐานข้อมูล: ' + fmtN(r.thai.laws) + ' ฉบับ / ' + fmtN(r.thai.sections) + ' มาตรา · ระบบดึงข้อมูลต่างประเทศเฉพาะจากบริการ API ที่เปิดให้ใช้อย่างเป็นทางการเท่านั้น</p>';
    on(box, 'click', '[data-fc]', function (e, b) { st.fc = b.getAttribute('data-fc'); store.set('ui', S.ui); renderForeign(box); });
  }).catch(function (e) { box.innerHTML = '<div class="panel"><div class="empty warn"><div class="eic">' + ic('wifiOff') + '</div><h3>โหลดข้อมูลไม่สำเร็จ</h3><p>' + esc(e.msg || '') + '</p></div></div>'; });
}
function renderCountry(box, c) {
  var st = S.ui.content;
  var head = '<section class="panel corner" style="margin-bottom:14px"><div class="row" style="align-items:flex-start;gap:10px"><button class="icon-btn" id="fcBack" aria-label="กลับไปเลือกประเทศ">' + ic('arrowL') + '</button><div class="grow"><span class="tag">กฎหมายต่างประเทศ</span><h3 style="margin-top:6px">' + esc(c.name) + ' <span class="muted">' + esc(c.native) + '</span></h3>' +
    '<div class="muted small">' + (c.count ? fmtN(c.count) + ' ฉบับ · ' : '') + esc(c.source || 'แหล่งข้อมูลทางการ') + (c.license ? ' · ' + esc(c.license) : '') + '</div></div></div>';
  if (!c.ready) {
    box.innerHTML = head + '<div class="prose" style="margin-top:12px"><p class="noindent">' + esc(c.note || 'ยังไม่มีบริการ API สาธารณะที่อนุญาตให้ดึงข้อมูลอัตโนมัติ') + ' ระบบจึงไม่ดึงข้อมูลจากเว็บไซต์ต้นทาง เพื่อไม่ให้เป็นภาระแก่เว็บไซต์ของรัฐนั้น ท่านสามารถเปิดอ่านจากแหล่งทางการได้ที่ลิงก์ด้านล่าง</p></div><div class="col" style="gap:8px;margin-top:8px">' +
      c.urls.map(function (u) { return '<a class="btn" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + ic('external') + ' ' + esc(u.replace(/^https?:\/\//, '')) + '</a>'; }).join('') + '</div></section>';
    $('#fcBack', box).onclick = function () { st.fc = ''; store.set('ui', S.ui); renderForeign(box); };
    return;
  }
  box.innerHTML = head + '<div class="input" style="margin-top:12px">' + ic('search') + '<input id="fcQ" placeholder="ค้นหาชื่อกฎหมาย (ภาษา' + (c.code === 'JP' ? 'ญี่ปุ่น เช่น 民法 刑法 会社法' : 'เกาหลี เช่น 민법 형법') + ')" value="' + esc(st.fq || '') + '"></div></section><div id="fcRes"></div>';
  $('#fcBack', box).onclick = function () { st.fc = ''; st.fq = ''; store.set('ui', S.ui); renderForeign(box); };
  var res = $('#fcRes', box), off = 0;
  function item(x) { return '<button class="law-item" data-fl="' + esc(x.id) + '"><span class="li-ic">' + ic('book') + '</span><span class="grow"><span class="li-t">' + esc(x.title) + '</span><br><span class="li-s">' + esc([x.type, x.num, x.date, x.cat].filter(Boolean).join(' · ')) + '</span></span>' + ic('chevR') + '</button>'; }
  function load(more) {
    var q = (st.fq || '').trim();
    if (!more) { off = 0; res.innerHTML = '<div class="skeleton" style="height:70px"></div>'; }
    api('foreignLaws', { country: c.code, q: q, offset: off }, { timeout: 40000 }).then(function (r) {
      if (!res.isConnected) return;
      var html = '';
      if (r.featured) html = '<div class="group-h">กฎหมายสำคัญ <span class="cnt">' + r.featured.length + ' ฉบับ</span></div><div class="col anim-list">' + r.featured.map(function (x) { return '<button class="law-item" data-fl="' + esc(x.id) + '"><span class="li-ic">' + ic('book') + '</span><span class="grow"><span class="li-t">' + esc(x.title) + '</span><br><span class="li-s">' + esc(x.id) + '</span></span>' + ic('chevR') + '</button>'; }).join('') + '</div><p class="tiny muted" style="margin-top:10px">พิมพ์ชื่อกฎหมายในช่องค้นหาเพื่อค้นจากกฎหมายทั้งหมด ' + fmtN(r.total) + ' ฉบับ</p>';
      else if (!r.items.length && !more) html = '<div class="panel"><div class="empty"><div class="eic">' + ic('search') + '</div><h3>ไม่พบกฎหมายที่ค้นหา</h3><p>ลองพิมพ์ชื่อกฎหมายเป็นภาษาของประเทศนั้น</p></div></div>';
      else html = (more ? '' : '<div class="group-h">ผลการค้นหา <span class="cnt">' + fmtN(r.total) + ' ฉบับ</span></div>') + '<div class="col">' + r.items.map(item).join('') + '</div>' + (r.next && r.next < r.total ? '<button class="btn block" id="fcMore" style="margin-top:10px">แสดงเพิ่มเติม</button>' : '');
      if (more) { var mb = $('#fcMore', res); if (mb) mb.remove(); res.insertAdjacentHTML('beforeend', html); } else res.innerHTML = html;
      off = r.next || 0;
      var mb2 = $('#fcMore', res); if (mb2) mb2.onclick = function () { load(true); };
    }).catch(function (e) { res.innerHTML = '<div class="panel"><div class="empty warn"><div class="eic">' + ic('alert') + '</div><h3>ยังไม่สามารถโหลดข้อมูลได้</h3><p>' + esc(e.msg || '') + '</p></div></div>'; });
  }
  $('#fcQ', box).addEventListener('input', debounce(function () { st.fq = this.value; store.set('ui', S.ui); load(false); }, 500));
  on(res, 'click', '[data-fl]', function (e, b) { openForeignLaw(c, b.getAttribute('data-fl')); });
  load(false);
}
var FV = null;
function closeForeignReader() { if (FV) { FV.remove(); FV = null; syncScrollLock(); } }
function openForeignLaw(c, id) {
  closeForeignReader();
  FV = h('<div class="fv-reader" role="dialog" aria-modal="true" aria-label="อ่านกฎหมายต่างประเทศ"><div class="fv-in"><div class="fv-top"><button class="nav-arrow" data-fv="close" aria-label="กลับไปหน้ารายการ">' + ic('arrowL') + '</button><div class="grow fv-title"><span class="tag">' + esc(c.name) + ' · อ่านอย่างเดียว</span><h3 id="fvT">กำลังโหลด…</h3></div></div><div id="fvBody"><div class="skeleton" style="height:240px"></div></div></div></div>');
  document.body.appendChild(FV); syncScrollLock();
  FV.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeForeignReader(); });
  FV.addEventListener('copy', function (e) { /* อ่านอย่างเดียว: อนุญาตคัดลอกเพื่อการศึกษา */ });
  on(FV, 'click', '[data-fv="close"]', closeForeignReader);
  FV.tabIndex = -1; FV.focus({ preventScroll: true });
  api('foreignLaw', { country: c.code, id: id }, { timeout: 90000 }).then(function (law) {
    if (!FV) return;
    $('#fvT', FV).textContent = law.title;
    var body = $('#fvBody', FV), shown = 0, list = law.articles, q = '';
    body.innerHTML = '<div class="panel flat fv-meta"><div class="small">' + esc([law.type, law.num, law.updated ? 'ปรับปรุง ' + law.updated : '', law.enforced ? 'มีผลใช้บังคับ ' + law.enforced : ''].filter(Boolean).join(' · ')) + '</div><div class="tiny muted">ที่มา: ' + esc(law.source) + ' — ข้อมูลอ่านอย่างเดียว ตัวบทเป็นภาษาต้นฉบับ (กดปุ่ม “แปลเป็นภาษาไทย” ที่แต่ละมาตราเพื่อให้ AI ช่วยแปลเพื่อการศึกษา)</div></div>' +
      '<div class="row wrapr" style="gap:8px;margin:12px 0"><div class="input grow" style="min-width:200px">' + ic('search') + '<input id="fvQ" placeholder="ค้นหาเลขมาตราหรือข้อความ"></div>' + (law.heads && law.heads.length ? '<details class="acc toc" style="flex:1 1 100%"><summary>' + ic('list') + ' สารบัญ <span class="cnt">' + law.heads.length + ' หัวข้อ · ' + list.length + ' มาตรา</span>' + ic('chevD', 'chev') + '</summary><div class="acc-b toc-chips">' + law.heads.map(function (hd, i) { return '<button class="chip" data-fh="' + i + '">' + esc(hd) + '</button>'; }).join('') + '</div></details>' : '') + '</div><div id="fvList" class="fv-text"></div><div id="fvMoreW"></div>';
    function filtered() { if (!q) return list; return list.filter(function (a) { return (a.no + ' ' + a.cap + ' ' + a.paras.map(function (p) { return p.s + ' ' + p.items.map(function (it) { return it.s; }).join(' '); }).join(' ')).indexOf(q) > -1; }); }
    function more(reset) {
      var L = filtered(), out = $('#fvList', FV); if (reset) { out.innerHTML = ''; shown = 0; }
      var next = L.slice(shown, shown + 60); shown += next.length;
      var lastHead = shown - next.length > 0 ? (L[shown - next.length - 1] || {}).head : null;
      out.insertAdjacentHTML('beforeend', next.map(function (a, i) { var hh = a.head && a.head !== lastHead ? '<h4 class="fv-head" data-head="' + esc(a.head) + '">' + esc(a.head) + '</h4>' : ''; lastHead = a.head; return hh + fvArticle(a, list.indexOf(a)); }).join('') || '<p class="muted">ไม่พบมาตราที่ตรงกับคำค้นหา</p>');
      $('#fvMoreW', FV).innerHTML = shown < L.length ? '<button class="btn block" id="fvMore">แสดงมาตราถัดไป (' + (L.length - shown) + ' มาตรา)</button>' : '';
      var mb = $('#fvMore', FV); if (mb) mb.onclick = function () { more(false); };
    }
    more(true);
    $('#fvQ', FV).addEventListener('input', debounce(function () { q = this.value.trim(); more(true); }, 300));
    on(FV, 'click', '[data-fh]', function (e, b) {
      var hd = law.heads[+b.getAttribute('data-fh')], idx = list.findIndex(function (a) { return a.head === hd; });
      if (idx < 0) return; q = ''; $('#fvQ', FV).value = '';
      if (idx >= shown) { var L = list; $('#fvList', FV).innerHTML = ''; shown = 0; while (shown <= idx) more(false); }
      var t = FV.querySelector('.fv-art[data-ai="' + idx + '"]'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    on(FV, 'click', '[data-tr]', function (e, b) {
      if (!gate('ai')) return;
      var a = list[+b.getAttribute('data-tr')], box = b.closest('.fv-art').querySelector('.fv-trans');
      var src = a.no + ' ' + a.cap + '\n' + a.paras.map(function (p) { return (p.n ? p.n + ' ' : '') + p.s + p.items.map(function (it) { return '\n' + it.t + ' ' + it.s; }).join(''); }).join('\n');
      box.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>'; b.disabled = true;
      api('aiChat', { messages: [{ role: 'user', text: 'แปลบทบัญญัติกฎหมาย' + c.name + 'ต่อไปนี้เป็นภาษาไทยแบบภาษากฎหมายที่เป็นทางการ คงเลขมาตรา วรรค และอนุมาตราตามต้นฉบับ แปลตรงตามตัวบท ไม่เพิ่มคำอธิบาย:\n\n' + src }], search: false }, { timeout: 120000 })
        .then(function (r) { box.innerHTML = '<div class="fv-tr-h">' + ic('ai') + ' คำแปลภาษาไทยโดย AI (เพื่อการศึกษา โปรดตรวจสอบกับต้นฉบับ)</div>' + md(r.text); })
        .catch(function (er) { box.innerHTML = '<p class="muted small">' + esc(er.msg || 'แปลไม่สำเร็จ') + '</p>'; b.disabled = false; });
    });
  }).catch(function (e) { if (FV) $('#fvBody', FV).innerHTML = '<div class="panel"><div class="empty warn"><div class="eic">' + ic('alert') + '</div><h3>ไม่สามารถเปิดกฎหมายฉบับนี้ได้</h3><p>' + esc(e.msg || '') + '</p></div></div>'; });
}
function fvArticle(a, idx) {
  var many = a.paras.length > 1;
  return '<article class="fv-art" data-ai="' + idx + '"><div class="fv-ah"><span class="secno">' + esc(a.no) + '</span><b>' + esc(a.cap) + '</b><button class="btn sm ghost" data-tr="' + idx + '">' + ic('globe') + ' แปลเป็นภาษาไทย</button></div>' +
    a.paras.map(function (p, i) {
      return '<p>' + (many ? '<span class="wk">วรรค ' + (i + 1) + '</span>' : '') + esc(p.s) + '</p>' + p.items.map(function (it) { return fvItem(it, 0); }).join('');
    }).join('') + '<div class="fv-trans"></div></article>';
}
function fvItem(it, d) { return '<p class="item' + (d ? ' sub' : '') + '"><span class="wk sub">' + (d ? 'อนุ ' : 'อนุมาตรา ') + esc(it.t) + '</span>' + esc(it.s) + '</p>' + (it.sub || []).map(function (x) { return fvItem(x, d + 1); }).join(''); }

/* ---------------- การชำระเงิน: พร้อมเพย์ (QR) / ลิงก์ชำระเงินออนไลน์ / แจ้งโอนพร้อมสลิป ---------------- */
function crc16(s) { var crc = 0xFFFF; for (var i = 0; i < s.length; i++) { crc ^= s.charCodeAt(i) << 8; for (var j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF; } return ('0000' + crc.toString(16).toUpperCase()).slice(-4); }
function promptPayPayload(id, amount) {
  var f = function (tag, v) { return tag + ('0' + v.length).slice(-2) + v; };
  var acc = id.length === 13 ? f('02', id) : f('01', ('0000000000000' + ('66' + id.replace(/^0/, ''))).slice(-13));
  var p = f('00', '01') + f('01', amount ? '12' : '11') + f('29', f('00', 'A000000677010111') + acc) + f('53', '764') + (amount ? f('54', Number(amount).toFixed(2)) : '') + f('58', 'TH') + '6304';
  return p + crc16(p);
}
var QR_LIB = null;
function loadQrLib() {
  if (window.qrcode) return Promise.resolve();
  if (QR_LIB) return QR_LIB;
  var urls = ['https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js', 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js', 'https://unpkg.com/qrcode-generator@1.4.4/qrcode.js'];
  QR_LIB = new Promise(function (res, rej) {
    (function next(i) { if (i >= urls.length) { QR_LIB = null; rej(new Error('qr')); return; } var s = document.createElement('script'); s.src = urls[i]; s.onload = function () { window.qrcode ? res() : next(i + 1); }; s.onerror = function () { s.remove(); next(i + 1); }; document.head.appendChild(s); })(0);
  });
  return QR_LIB;
}
function openPayment(plan, cycle) {
  withLoading('กำลังเตรียมช่องทางชำระเงิน', api('paymentInfo', {})).then(function (info) {
    var price = (info.prices[cycle] || {})[plan];
    var link = info.links[plan + '.' + cycle];
    var slip = '';
    modal({
      title: 'ชำระเงินแพ็กเกจ' + (PLAN_LABEL[plan] || plan), icon: 'card', sub: (cycle === 'yearly' ? 'รายปี' : 'รายเดือน') + ' · ฿' + Number(price).toLocaleString('th-TH'), ok: 'แจ้งชำระเงินแล้ว', cancel: 'ปิด', wide: true,
      html: '<div class="pay-grid">' +
        (info.promptpay ? '<section class="pay-box"><h4>' + ic('qr') + ' พร้อมเพย์ (สแกนจ่ายผ่านแอปธนาคาร)</h4><div id="payQr" class="pay-qr"><div class="skeleton" style="width:220px;height:220px"></div></div><div class="small" style="text-align:center">' + (info.promptpayName ? 'ชื่อบัญชี: <b>' + esc(info.promptpayName) + '</b><br>' : '') + 'ยอดชำระ <b>฿' + Number(price).toLocaleString('th-TH', { minimumFractionDigits: 2 }) + '</b></div></section>' : '') +
        (link ? '<section class="pay-box"><h4>' + ic('card') + ' บัตรเครดิต/เดบิต และช่องทางออนไลน์</h4><p class="small muted">ชำระผ่านหน้าชำระเงินที่ปลอดภัยของผู้ให้บริการรับชำระเงิน</p><a class="btn lg o block" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' + ic('lock') + ' ชำระเงินทันที ฿' + Number(price).toLocaleString('th-TH') + '</a></section>' : '') +
        (!info.promptpay && !link ? '<section class="pay-box"><p class="small">ผู้ดูแลระบบยังไม่ได้เปิดช่องทางชำระเงินออนไลน์ ท่านสามารถกด “แจ้งชำระเงินแล้ว” เพื่อส่งคำขอ ผู้ดูแลระบบจะติดต่อกลับเพื่อแจ้งช่องทางชำระเงิน</p></section>' : '') +
        '<section class="pay-box"><h4>' + ic('upload') + ' แจ้งการชำระเงิน</h4>' + textField('payRef', 'เลขอ้างอิงการโอน / เลขที่รายการ (ถ้ามี)', '', false, { max: 40 }) + '<label class="btn sm" style="margin-top:8px">' + ic('upload') + ' แนบสลิป (รูปภาพ)<input type="file" id="paySlip" accept="image/*" class="sr"></label><span class="tiny muted" id="paySlipN"></span><p class="tiny muted" style="margin-top:8px">เมื่อผู้ดูแลระบบตรวจสอบยอดแล้ว ระบบจะเปิดสิทธิ์แพ็กเกจให้อัตโนมัติ</p></section></div>',
      onOpen: function (m) {
        if (info.promptpay) loadQrLib().then(function () {
          var q = qrcode(0, 'M'); q.addData(promptPayPayload(info.promptpay, price)); q.make();
          $('#payQr', m).innerHTML = q.createSvgTag({ cellSize: 5, margin: 3, scalable: true }) + '<div class="tiny muted">Thai QR Payment · PromptPay</div>';
        }).catch(function () { $('#payQr', m).innerHTML = '<p class="small">โหลดตัวสร้าง QR ไม่สำเร็จ กรุณาโอนผ่านพร้อมเพย์หมายเลข <b>' + esc(info.promptpay) + '</b></p>'; });
        $('#paySlip', m).onchange = function () {
          var f = this.files[0]; if (!f) return;
          pickAvatar(f).then(function (r) { slip = r.dataUrl; $('#paySlipN', m).textContent = ' แนบแล้ว: ' + f.name; }).catch(function () { toast('ไม่สามารถอ่านไฟล์สลิปได้', '', 'warn'); });
        };
      },
      onOk: function (m) {
        return api('paymentNotify', { plan: plan, cycle: cycle, ref: $('#payRef', m).value.trim(), slip: slip }, { timeout: 60000 })
          .then(function (r) { alertBox('ได้รับการแจ้งชำระเงินแล้ว', r.msg, { icon: 'check' }); return true; })
          .catch(function (e) { toast('แจ้งชำระเงินไม่สำเร็จ', e.msg, 'bad'); return false; });
      }
    });
  }).catch(function (e) { toast('ไม่สามารถเปิดหน้าชำระเงินได้', e.msg, 'bad'); });
}
(function () {
  var base = VIEWS.pricing;
  VIEWS.pricing = function (el) {
    base(el);
    function addBtn() {
      var go = $('#prGo', el); if (!go || $('#prPay', el)) return;
      var st = S.ui.pr || {};
      var b = h('<button class="btn lg o" id="prPay">' + ic('card') + ' ชำระเงินทันที</button>');
      go.parentNode.insertBefore(b, go.nextSibling); go.parentNode.style.gap = '10px'; go.parentNode.style.flexWrap = 'wrap';
      b.onclick = function () { var s2 = S.ui.pr || st; var sel = s2.sel || (($('.pcard.sel', el) || {}).getAttribute ? $('.pcard.sel', el).getAttribute('data-k') : 'standard'); openPayment(sel, s2.cycle || 'monthly'); };
    }
    addBtn();
    try { new MutationObserver(addBtn).observe(el, { childList: true, subtree: true }); } catch (e) {}
  };
})();
</script>
