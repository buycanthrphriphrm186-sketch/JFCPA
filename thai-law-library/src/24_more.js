<script>
/* ==========================================================================
   AI ASSISTANT / NOTES (RICH TEXT) / TOOLS / PRICING / HELP
   ========================================================================== */

/* ---------------- HTML sanitizer (allowlist) ---------------- */
var ALLOWED_TAGS = { P: 1, BR: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, S: 1, STRIKE: 1, H1: 1, H2: 1, H3: 1, H4: 1, UL: 1, OL: 1, LI: 1, BLOCKQUOTE: 1, SPAN: 1, FONT: 1, DIV: 1, TABLE: 1, THEAD: 1, TBODY: 1, TR: 1, TD: 1, TH: 1, HR: 1, A: 1, MARK: 1, SUB: 1, SUP: 1 };
var ALLOWED_ATTR = { style: 1, size: 1, color: 1, href: 1, colspan: 1, rowspan: 1, align: 1 };
function sanitize(html) {
  var t = document.createElement('template'); t.innerHTML = html || '';
  (function walk(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (c) {
      if (c.nodeType === 1) {
        if (!ALLOWED_TAGS[c.tagName]) { if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|LINK|META|SVG|MATH)$/.test(c.tagName)) { c.remove(); return; } var frag = document.createDocumentFragment(); while (c.firstChild) frag.appendChild(c.firstChild); c.replaceWith(frag); walk(node); return; }
        Array.prototype.slice.call(c.attributes).forEach(function (a) {
          var n = a.name.toLowerCase();
          if (!ALLOWED_ATTR[n] || (n === 'href' && !/^https?:/i.test(a.value)) || (n === 'style' && /expression|url\(|javascript/i.test(a.value))) c.removeAttribute(a.name);
        });
        if (c.tagName === 'A') { c.setAttribute('target', '_blank'); c.setAttribute('rel', 'noopener'); }
        walk(c);
      } else if (c.nodeType !== 3) c.remove();
    });
  })(t.content);
  return t.innerHTML;
}

/* =======================================================================
   VIEW: AI — 2 รูปแบบสลับกันทุกครั้งที่เข้าสู่ระบบ (แบบ Bolt และแบบ Prompt Input)
   ประวัติบทสนทนาใช้ร่วมกันทั้งสองแบบ + ปุ่มขยาย/ย่อ (ขยาย = ซ่อนแถบด้านบนและแถบเมนูด้านล่าง)
   ======================================================================= */
var AI_SUGGEST = ['อธิบายมาตรา 420 ประมวลกฎหมายแพ่งและพาณิชย์ ให้เข้าใจง่าย', 'สรุปองค์ประกอบความผิดฐานลักทรัพย์', 'ความแตกต่างระหว่างโมฆะกับโมฆียะ', 'สรุปหลักการคุ้มครองข้อมูลส่วนบุคคล (PDPA)', 'สร้างแบบทดสอบความรู้กฎหมายแพ่ง 5 ข้อ', 'ข่าวกฎหมายไทยที่ประกาศใช้ล่าสุด'];
function aiLayout() { return (Number(store.get('loginCount', 0)) % 2) ? 'prompt' : 'bolt'; }
function setAiFocus(on_) { document.body.classList.toggle('ai-focus', !!on_); var b = document.getElementById('aiExpand'); if (b) { b.innerHTML = ic(on_ ? 'minimize' : 'maximize'); b.setAttribute('aria-label', on_ ? 'ย่อหน้าต่าง (แสดงเมนู)' : 'ขยายเต็มจอ (ซ่อนเมนู)'); b.title = b.getAttribute('aria-label'); } }
VIEWS.ai = function (el) {
  var ud = S.ud, st = S.ui.aiv || (S.ui.aiv = { chat: '', search: true });
  if (!can('ai')) {
    el.innerHTML = '<div class="view-head"><div><h2>' + tr('ai') + '</h2></div></div><div class="panel"><div class="empty warn"><div class="eic">' + ic('ai') + '</div><h3>ผู้ช่วย AI ไม่รวมอยู่ในแพ็กเกจปัจจุบัน</h3><p>ผู้ช่วย AI เปิดให้ใช้งานในช่วงทดลองใช้ 7 วัน และในแพ็กเกจมาตรฐานรายเดือนขึ้นไป ท่านสามารถดูรายละเอียดและสมัครแพ็กเกจได้ที่หน้าแพ็กเกจและราคา</p><button class="btn o" id="aiPlan">' + ic('card') + ' ดูแพ็กเกจและราคา</button></div></div>';
    $('#aiPlan', el).onclick = function () { nav('pricing'); };
    return;
  }
  var L = aiLayout();
  function chat() { return ud.aiChats.filter(function (c) { return c.id === st.chat; })[0]; }
  el.innerHTML = '<div class="ai2 ai-' + L + '">' +
    '<div class="ai2-top"><button class="btn sm" id="aiHist">' + ic('history') + '<span>บทสนทนา</span></button><span class="spacer"></span><button class="btn sm k" id="aiNew">' + ic('plus') + '<span>เริ่มใหม่</span></button><button class="icon-btn" id="aiExpand"></button></div>' +
    '<div class="ai2-stage" id="aiStage"></div>' +
    '<div class="ai2-dock" id="aiDock"></div></div>';
  setAiFocus(document.body.classList.contains('ai-focus'));
  function inputHtml() {
    if (L === 'bolt') return '<div class="bolt-box"><textarea id="aiIn" rows="3" maxlength="6000" placeholder="พิมพ์คำถาม เช่น ขอคำอธิบายมาตรา หรือสรุปประเด็นกฎหมาย"></textarea>' +
      '<div class="bolt-bar"><label class="bolt-tog"><input type="checkbox" id="aiWeb"' + (st.search ? ' checked' : '') + '><span>' + ic('globe') + ' ค้นข้อมูลล่าสุดจากเว็บ</span></label><span class="spacer"></span><span class="tiny muted" id="aiQuota"></span><button class="bolt-send" id="aiSend" aria-label="ส่งคำถาม">' + ic('arrowR') + '</button></div></div>';
    return '<div class="pi-box"><button class="pi-plus" id="aiTools" aria-label="ตัวเลือกเพิ่มเติม" aria-expanded="false">' + ic('plus') + '</button>' +
      '<textarea id="aiIn" rows="1" maxlength="6000" placeholder="ถามอะไรก็ได้"></textarea><button class="pi-send" id="aiSend" aria-label="ส่งคำถาม">' + ic('send') + '</button>' +
      '<div class="pi-pop hidden" id="aiPop"><label class="check"><input type="checkbox" id="aiWeb"' + (st.search ? ' checked' : '') + '><span>' + ic('globe') + ' ค้นข้อมูลล่าสุดจากเว็บ</span></label><button class="menu-item" data-sq2="สรุปเนื้อหาที่ฉันวางต่อไปนี้ให้กระชับ:\n">' + ic('file') + ' สรุปเนื้อหา</button><button class="menu-item" data-sq2="วิเคราะห์องค์ประกอบความผิดจากข้อเท็จจริงต่อไปนี้:\n">' + ic('scale') + ' วิเคราะห์ข้อเท็จจริง</button></div></div>' +
      '<div class="tiny muted pi-note"><span>คำตอบเป็นเครื่องมือช่วยค้นคว้า มิใช่คำปรึกษาทางกฎหมาย</span><span id="aiQuota"></span></div>';
  }
  function hero() {
    var name = esc(S.member.displayName || '');
    if (L === 'bolt') return '<div class="ai-hero"><img class="ai-logo" src="' + LOGO + '" alt="THAI LAW LIBRARY"><h2>มีอะไรให้ช่วยค้นคว้าวันนี้ คุณ' + name + '</h2><p class="muted">ถาม ค้นคว้า อธิบายบทบัญญัติ และสรุปประเด็นกฎหมายได้ในที่เดียว</p><div class="bolt-in">' + inputHtml() + '</div><div class="bolt-sug">' + AI_SUGGEST.map(function (q) { return '<button class="chip" data-sq="' + esc(q) + '">' + esc(q) + '</button>'; }).join('') + '</div></div>';
    return '<div class="ai-hero"><img class="ai-logo" src="' + LOGO + '" alt="THAI LAW LIBRARY"><h2>สวัสดี คุณ' + name + '</h2><div class="pi-in">' + inputHtml() + '</div><div class="pi-sug">' + AI_SUGGEST.slice(0, 4).map(function (q) { return '<button class="pi-sq" data-sq="' + esc(q) + '">' + ic('sparkle') + '<span>' + esc(q) + '</span>' + ic('arrowR') + '</button>'; }).join('') + '</div></div>';
  }
  function draw() {
    var c = chat(), stage = $('#aiStage', el), dock = $('#aiDock', el);
    if (!c || !c.msgs.length) { stage.innerHTML = hero(); dock.innerHTML = ''; dock.classList.add('hidden'); }
    else {
      dock.classList.remove('hidden');
      stage.innerHTML = '<div class="ai2-log" id="aiLog"></div>';
      dock.innerHTML = inputHtml();
      log();
    }
    bindInput();
  }
  function log(revealIdx) {
    var c = chat(), box = $('#aiLog', el); if (!box || !c) return;
    box.innerHTML = '<div class="ai2-brand"><img src="' + LOGO + '" alt=""></div>' + c.msgs.map(function (m, i) {
      if (m.role === 'user') return '<div class="msg user"><div class="bub">' + esc(m.text).replace(/\n/g, '<br>') + '</div></div>';
      return '<div class="msg"><div class="av"><img src="' + LOGO + '" alt=""></div><div class="bub" data-i="' + i + '">' + (m.pending ? '<span class="typing"><i></i><i></i><i></i></span><span class="tiny muted"> กำลังค้นคว้าและเรียบเรียงคำตอบ</span>' : md(m.text)) +
        (m.sources && m.sources.length ? '<div class="src">' + m.sources.map(function (s) { return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + ic('link') + ' ' + esc(s.title) + '</a>'; }).join('') + '</div>' : '') +
        (m.pending ? '' : '<div class="row" style="gap:4px;margin-top:6px"><button class="btn sm ghost" data-cp="' + i + '">' + ic('copy') + ' คัดลอก</button><button class="btn sm ghost" data-sn="' + i + '">' + ic('note') + ' บันทึกลงสมุด</button></div>') + '</div></div>';
    }).join('');
    if (revealIdx !== undefined) {
      var bub = box.querySelector('.bub[data-i="' + revealIdx + '"]');
      if (bub && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
        var kids = Array.prototype.slice.call(bub.children); kids.forEach(function (k) { k.style.opacity = 0; });
        kids.forEach(function (k, j) { setTimeout(function () { k.style.transition = 'opacity .25s'; k.style.opacity = 1; }, Math.min(j * 45, 1200)); });
      }
    }
    var sc = document.scrollingElement || document.documentElement;
    if (document.body.classList.contains('ai-focus')) box.parentNode.scrollTop = box.parentNode.scrollHeight;
    else window.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' });
  }
  function bindInput() {
    var inp = $('#aiIn', el); if (!inp) return;
    if (S.ui.aiPrefill) { inp.value = S.ui.aiPrefill; S.ui.aiPrefill = ''; }
    var grow = function () { inp.style.height = 'auto'; inp.style.height = Math.min(inp.scrollHeight, 220) + 'px'; };
    inp.addEventListener('input', grow); grow();
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
    $('#aiSend', el).onclick = send;
    var wb = $('#aiWeb', el); if (wb) wb.onchange = function () { st.search = this.checked; store.set('ui', S.ui); };
    var tl = $('#aiTools', el); if (tl) tl.onclick = function () { var p = $('#aiPop', el), open_ = p.classList.toggle('hidden'); tl.setAttribute('aria-expanded', String(!open_)); };
    setTimeout(function () { if (inp.isConnected && !('ontouchstart' in window)) inp.focus(); }, 100);
  }
  function send() {
    var inp = $('#aiIn', el), q = inp.value.trim(); if (!q) return;
    var c = chat();
    if (!c) { c = { id: uid(), title: q.slice(0, 60), u: Date.now(), msgs: [] }; ud.aiChats.unshift(c); st.chat = c.id; store.set('ui', S.ui); }
    c.msgs.push({ role: 'user', text: q }); c.u = Date.now();
    var pend = { role: 'model', text: '', pending: true }; c.msgs.push(pend);
    draw();
    var ctx = S.ui.aiContext || ''; S.ui.aiContext = '';
    api('aiChat', { messages: c.msgs.filter(function (m) { return !m.pending; }).map(function (m) { return { role: m.role, text: m.text }; }), search: st.search, context: ctx }, { timeout: 120000 }).then(function (r) {
      pend.pending = false; pend.text = r.text; pend.sources = r.sources || [];
      var qd = $('#aiQuota', el); if (qd) qd.textContent = 'ใช้ไปแล้ว ' + r.used + '/' + r.limit + ' ครั้งวันนี้';
    }).catch(function (e) {
      pend.pending = false; pend.text = '**ไม่สามารถตอบคำถามได้ในขณะนี้**\n\n' + (e.msg || 'กรุณาลองใหม่อีกครั้ง');
    }).then(function () { c.msgs = c.msgs.slice(-40); c.u = Date.now(); saveUD(); if (el.isConnected) log(c.msgs.indexOf(pend)); });
  }
  function histDrawer() {
    drawer('left', function (d, close) {
      function paint() {
        d.innerHTML = '<div class="drawer-head"><img src="' + LOGO + '" alt="" style="width:40px;height:40px;border-radius:50%;background:#fff"><div class="grow"><b>บทสนทนาก่อนหน้า</b><div class="tiny muted">ใช้ร่วมกันทั้งสองรูปแบบหน้าผู้ช่วย AI</div></div><button class="icon-btn" data-x aria-label="ปิด">' + ic('x') + '</button></div><div class="drawer-body"><div class="menu-list">' +
          (ud.aiChats.length ? ud.aiChats.map(function (c) { return '<div class="row" style="gap:4px"><button class="menu-item grow" data-c="' + esc(c.id) + '" style="' + (c.id === st.chat ? 'background:var(--sky-50)' : '') + '"><span class="mi">' + ic('ai') + '</span><span class="grow"><span class="mt ellipsis" style="display:block">' + esc(c.title) + '</span><span class="ms">' + fmtDateTime(c.u) + '</span></span></button><button class="icon-btn" data-dc="' + esc(c.id) + '" aria-label="ลบบทสนทนา" style="color:var(--bad)">' + ic('trash') + '</button></div>'; }).join('') : '<p class="muted small" style="padding:6px">ยังไม่มีบทสนทนา</p>') + '</div></div>';
        d.querySelector('[data-x]').onclick = close;
      }
      paint();
      on(d, 'click', '[data-c]', function (e, b) { st.chat = b.getAttribute('data-c'); store.set('ui', S.ui); close(); draw(); });
      on(d, 'click', '[data-dc]', function (e, b) { var id = b.getAttribute('data-dc'); confirmBox('ลบบทสนทนา', 'ต้องการลบบทสนทนานี้หรือไม่', { danger: true, icon: 'trash' }).then(function (ok) { if (!ok) return; ud.aiChats = ud.aiChats.filter(function (c) { return c.id !== id; }); if (st.chat === id) { st.chat = ''; draw(); } saveUD(); paint(); }); });
    });
  }
  $('#aiNew', el).onclick = function () { st.chat = ''; store.set('ui', S.ui); draw(); };
  $('#aiHist', el).onclick = histDrawer;
  $('#aiExpand', el).onclick = function () { setAiFocus(!document.body.classList.contains('ai-focus')); };
  on(el, 'click', '[data-sq]', function (e, b) { var inp = $('#aiIn', el); inp.value = b.getAttribute('data-sq'); send(); });
  on(el, 'click', '[data-sq2]', function (e, b) { var inp = $('#aiIn', el); inp.value = b.getAttribute('data-sq2'); $('#aiPop', el).classList.add('hidden'); inp.focus(); });
  on(el, 'click', '[data-cp]', function (e, b) { copyText(chat().msgs[+b.getAttribute('data-cp')].text); });
  on(el, 'click', '[data-sn]', function (e, b) { if (!gate('notes')) return; var m = chat().msgs[+b.getAttribute('data-sn')]; var n = { id: uid(), title: 'คำตอบ AI: ' + chat().title.slice(0, 40), html: sanitize(md(m.text)), c: Date.now(), u: Date.now() }; ud.notes.unshift(n); saveUD(); toast('บันทึกลงสมุดบันทึกแล้ว', n.title, 'ok', { action: 'เปิดสมุดบันทึก', onAction: function () { S.ui.note = n.id; nav('notes'); } }); });
  draw();
};

/* =======================================================================
   VIEW: NOTES — Rich Text Editor (คล้าย Word) + พิมพ์ PDF
   ======================================================================= */
VIEWS.notes = function (el) {
  if (!can('notes')) { el.innerHTML = '<div class="view-head"><div><h2>' + tr('notes') + '</h2></div></div><div class="panel"><div class="empty warn"><div class="eic">' + ic('note') + '</div><h3>สมุดบันทึกไม่รวมอยู่ในแพ็กเกจปัจจุบัน</h3><p>สมุดบันทึกและการพิมพ์ไฟล์ PDF เปิดให้ใช้ในช่วงทดลองใช้ 7 วัน แพ็กเกจพื้นฐานรายปี และแพ็กเกจมาตรฐานขึ้นไป</p><button class="btn o" id="ntPlan">' + ic('card') + ' ดูแพ็กเกจและราคา</button></div></div>'; $('#ntPlan', el).onclick = function () { nav('pricing'); }; return; }
  var ud = S.ud;
  if (!ud.notes.length) ud.notes.push({ id: uid(), title: 'บันทึกฉบับแรก', html: '<h2>บันทึกฉบับแรก</h2><p>เริ่มพิมพ์บันทึกการอ่านกฎหมายของท่านได้ที่นี่ ใช้แถบเครื่องมือด้านบนเพื่อจัดรูปแบบตัวอักษร หัวข้อ รายการ และการจัดหน้า แล้วกดพิมพ์ PDF เมื่อต้องการไฟล์เอกสาร</p>', c: Date.now(), u: Date.now() });
  var cur = ud.notes.filter(function (n) { return n.id === S.ui.note; })[0] || ud.notes[0];
  S.ui.note = cur.id;
  el.innerHTML = '<div class="view-head"><div><h2>' + tr('notes') + '</h2><p class="sub">จดบันทึกจากการอ่านกฎหมาย จัดรูปแบบได้เหมือนโปรแกรมประมวลผลคำ และพิมพ์เป็นไฟล์ PDF</p></div><div class="row wrapr" style="gap:8px"><select id="ntPick" class="btn" style="max-width:240px">' + ud.notes.map(function (n) { return '<option value="' + esc(n.id) + '"' + (n.id === cur.id ? ' selected' : '') + '>' + esc(n.title) + '</option>'; }).join('') + '</select><button class="btn" id="ntNew">' + ic('plus') + ' บันทึกใหม่</button><button class="btn danger" id="ntDel">' + ic('trash') + '</button></div></div>' +
    '<div class="input" style="margin-bottom:10px"><input id="ntTitle" maxlength="120" value="' + esc(cur.title) + '" placeholder="ชื่อบันทึก" style="font-weight:700;font-size:1.1rem"></div>' +
    '<div class="rte"><div class="rte-bar" id="ntBar">' +
      '<button data-c="undo" title="เลิกทำ">' + ic('undo') + '</button><button data-c="redo" title="ทำซ้ำ">' + ic('redo') + '</button><span class="sep"></span>' +
      '<select id="ntBlock" title="รูปแบบย่อหน้า"><option value="p">ข้อความปกติ</option><option value="h1">หัวข้อ 1</option><option value="h2">หัวข้อ 2</option><option value="h3">หัวข้อ 3</option><option value="blockquote">ข้อความอ้างอิง</option></select>' +
      '<select id="ntSize" title="ขนาดตัวอักษร"><option value="">ขนาด</option><option value="2">เล็ก</option><option value="3">ปกติ</option><option value="4">ใหญ่</option><option value="5">ใหญ่มาก</option><option value="6">หัวเรื่อง</option></select><span class="sep"></span>' +
      '<button data-c="bold" title="ตัวหนา">' + ic('bold') + '</button><button data-c="italic" title="ตัวเอียง">' + ic('italic') + '</button><button data-c="underline" title="ขีดเส้นใต้">' + ic('underline') + '</button><button data-c="strikeThrough" title="ขีดฆ่า">' + ic('strike') + '</button>' +
      '<label title="สีตัวอักษร" style="display:grid;place-items:center">' + ic('palette') + '<input type="color" id="ntColor" value="#0E1116" class="sr"></label><label title="ไฮไลต์" style="display:grid;place-items:center">' + ic('highlighter') + '<input type="color" id="ntHl" value="#FFE0C2" class="sr"></label><span class="sep"></span>' +
      '<button data-c="justifyLeft" title="ชิดซ้าย">' + ic('alignL') + '</button><button data-c="justifyCenter" title="กึ่งกลาง">' + ic('alignC') + '</button><button data-c="justifyRight" title="ชิดขวา">' + ic('alignR') + '</button><button data-c="justifyFull" title="กระจายเต็มบรรทัด">' + ic('alignJ') + '</button><span class="sep"></span>' +
      '<button data-c="insertUnorderedList" title="รายการสัญลักษณ์">' + ic('ul') + '</button><button data-c="insertOrderedList" title="รายการลำดับเลข">' + ic('ol') + '</button><button data-c="outdent" title="ลดการเยื้อง">' + ic('outdent') + '</button><button data-c="indent" title="เพิ่มการเยื้อง">' + ic('indent') + '</button><button data-x="firstline" title="ย่อหน้าบรรทัดแรก 2.5 ซม." class="' + (cur.indent ? 'on' : '') + '">2.5</button><span class="sep"></span>' +
      '<button data-x="table" title="แทรกตาราง">' + ic('table') + '</button><button data-x="link" title="แทรกลิงก์">' + ic('link') + '</button><button data-c="insertHorizontalRule" title="เส้นคั่น">' + ic('hr') + '</button><button data-c="removeFormat" title="ล้างรูปแบบ">' + ic('eraser') + '</button><span class="sep"></span>' +
      '<button data-x="pdf" title="พิมพ์เป็นไฟล์ PDF" style="background:var(--black);color:var(--black-ink);padding:0 12px">' + ic('printer') + '&nbsp;PDF</button>' +
    '</div><div class="rte-page ' + (cur.indent ? 'indent' : '') + '" id="ntPage" contenteditable="true" spellcheck="false">' + sanitize(cur.html) + '</div>' +
    '<div class="rte-foot"><span id="ntCount"></span><span class="grow"></span><span id="ntSaved">บันทึกอัตโนมัติ</span></div></div>';
  var page = $('#ntPage', el);
  try { document.execCommand('styleWithCSS', false, true); document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) {}
  function count() { var txt = page.innerText || ''; $('#ntCount', el).textContent = txt.replace(/\s/g, '').length + ' ตัวอักษร · ' + (txt.trim() ? txt.trim().split(/\s+/).length : 0) + ' กลุ่มคำ'; }
  var save = debounce(function () { cur.html = sanitize(page.innerHTML); cur.title = $('#ntTitle', el).value.trim() || 'ไม่มีชื่อ'; cur.u = Date.now(); saveUD(); $('#ntSaved', el).textContent = 'บันทึกแล้ว ' + fmtTime(new Date()); var o = $('#ntPick option[value="' + cur.id + '"]', el); if (o) o.textContent = cur.title; }, 700);
  page.addEventListener('input', function () { count(); $('#ntSaved', el).textContent = 'กำลังบันทึก…'; save(); });
  $('#ntTitle', el).addEventListener('input', save);
  page.addEventListener('paste', function (e) {
    e.preventDefault();
    var cd = e.clipboardData || window.clipboardData;
    var html = cd.getData('text/html'), text = cd.getData('text/plain');
    document.execCommand('insertHTML', false, html ? sanitize(html) : esc(text).replace(/\n/g, '<br>'));
  });
  function exec(c, v) { page.focus(); try { document.execCommand(c, false, v === undefined ? null : v); } catch (e) {} save(); state(); }
  function state() { $$('#ntBar [data-c]', el).forEach(function (b) { var c = b.getAttribute('data-c'); try { b.classList.toggle('on', /bold|italic|underline|strikeThrough|insert.*List|justify/.test(c) && document.queryCommandState(c)); } catch (e) {} }); }
  document.addEventListener('selectionchange', function () { if (document.activeElement === page) state(); });
  on($('#ntBar', el), 'mousedown', 'button', function (e) { e.preventDefault(); });
  on($('#ntBar', el), 'click', '[data-c]', function (e, b) { exec(b.getAttribute('data-c')); });
  $('#ntBlock', el).onchange = function () { exec('formatBlock', '<' + this.value + '>'); };
  $('#ntSize', el).onchange = function () { if (this.value) exec('fontSize', this.value); this.value = ''; };
  $('#ntColor', el).oninput = function () { exec('foreColor', this.value); };
  $('#ntHl', el).oninput = function () { exec('hiliteColor', this.value) ; };
  on($('#ntBar', el), 'click', '[data-x]', function (e, b) {
    var x = b.getAttribute('data-x');
    if (x === 'firstline') { cur.indent = !cur.indent; page.classList.toggle('indent', cur.indent); b.classList.toggle('on', cur.indent); saveUD(); }
    if (x === 'table') { modal({ title: 'แทรกตาราง', icon: 'table', html: '<div class="grid g2">' + textField('tbR', 'จำนวนแถว', '3', true, { type: 'number' }) + textField('tbC', 'จำนวนคอลัมน์', '3', true, { type: 'number' }) + '</div>', ok: 'แทรก', onOk: function (m) { var r = clamp(+$('#tbR', m).value || 2, 1, 30), c = clamp(+$('#tbC', m).value || 2, 1, 10); var hh = '<table><tbody>' + Array.apply(null, Array(r)).map(function () { return '<tr>' + Array.apply(null, Array(c)).map(function () { return '<td><br></td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table><p><br></p>'; exec('insertHTML', hh); return true; } }); }
    if (x === 'link') { var sel = window.getSelection(); var range = sel.rangeCount ? sel.getRangeAt(0) : null; modal({ title: 'แทรกลิงก์', icon: 'link', html: textField('lnU', 'ที่อยู่ลิงก์ (https://)', 'https://', true), ok: 'แทรก', onOk: function (m) { var u = $('#lnU', m).value.trim(); if (!/^https?:\/\//.test(u)) { setErr('lnU', 'กรุณาระบุลิงก์ที่ขึ้นต้นด้วย https://'); return false; } page.focus(); if (range) { sel.removeAllRanges(); sel.addRange(range); } exec(range && !range.collapsed ? 'createLink' : 'insertHTML', range && !range.collapsed ? u : '<a href="' + esc(u) + '">' + esc(u) + '</a>'); return true; } }); }
    if (x === 'pdf') { if (!gate('pdf')) return; confirmBox('พิมพ์เป็นไฟล์ PDF', 'ระบบจะสร้างไฟล์ PDF ตามเนื้อหาและรูปแบบในหน้านี้').then(function (ok) { if (ok) makePdf(cur.title, '<h1>' + esc(cur.title) + '</h1>' + (cur.indent ? sanitize(page.innerHTML) : sanitize(page.innerHTML).replace(/<p>/g, '<p style="text-indent:0">'))); }); }
  });
  $('#ntPick', el).onchange = function () { S.ui.note = this.value; store.set('ui', S.ui); refreshCurrent(); };
  $('#ntNew', el).onclick = function () { var n = { id: uid(), title: 'บันทึกใหม่ ' + fmtDate(new Date()), html: '<p><br></p>', c: Date.now(), u: Date.now() }; ud.notes.unshift(n); S.ui.note = n.id; saveUD(); refreshCurrent(); };
  $('#ntDel', el).onclick = function () { confirmBox('ลบบันทึก', 'ต้องการลบ “' + cur.title + '” หรือไม่ บันทึกที่ลบแล้วไม่สามารถกู้คืนได้', { danger: true, icon: 'trash', tone: 'bad' }).then(function (ok) { if (!ok) return; ud.notes = ud.notes.filter(function (n) { return n.id !== cur.id; }); S.ui.note = ''; saveUD(true); refreshCurrent(); toast('ลบบันทึกแล้ว', '', 'ok'); }); };
  count();
};

/* =======================================================================
   VIEW: TOOLS — เครื่องมือช่วยนักกฎหมาย
   ======================================================================= */
var DICT = [
  ['นิติกรรม', 'การใด ๆ อันทำลงโดยชอบด้วยกฎหมายและด้วยใจสมัคร มุ่งโดยตรงต่อการผูกนิติสัมพันธ์ระหว่างบุคคล เพื่อก่อ เปลี่ยนแปลง โอน สงวน หรือระงับซึ่งสิทธิ (ป.พ.พ. มาตรา 149)'],
  ['นิติเหตุ', 'เหตุการณ์ที่กฎหมายกำหนดผลทางกฎหมายไว้ โดยไม่ต้องอาศัยเจตนาของบุคคลที่จะก่อผลนั้น เช่น ละเมิด จัดการงานนอกสั่ง และลาภมิควรได้'],
  ['โมฆะกรรม', 'นิติกรรมที่เสียเปล่ามาแต่ต้น ไม่มีผลทางกฎหมาย ให้สัตยาบันไม่ได้ และผู้มีส่วนได้เสียคนใดยกขึ้นกล่าวอ้างก็ได้'],
  ['โมฆียกรรม', 'นิติกรรมที่มีผลสมบูรณ์จนกว่าจะถูกบอกล้าง และอาจให้สัตยาบันได้ เช่น นิติกรรมที่ทำโดยผู้เยาว์โดยไม่ได้รับความยินยอม หรือที่ทำเพราะถูกกลฉ้อฉล'],
  ['ละเมิด', 'การกระทำโดยจงใจหรือประมาทเลินเล่อต่อบุคคลอื่นโดยผิดกฎหมาย ทำให้เขาเสียหายแก่ชีวิต ร่างกาย อนามัย เสรีภาพ ทรัพย์สิน หรือสิทธิ ผู้กระทำต้องใช้ค่าสินไหมทดแทน'],
  ['ค่าสินไหมทดแทน', 'เงินหรือการชดใช้อื่นที่ผู้ก่อความเสียหายต้องให้แก่ผู้เสียหาย เพื่อเยียวยาความเสียหายที่เกิดขึ้น เช่น คืนทรัพย์ ใช้ราคาทรัพย์ หรือค่าเสียหาย'],
  ['อายุความ', 'ระยะเวลาที่กฎหมายกำหนดให้ใช้สิทธิเรียกร้องทางศาล หากพ้นกำหนด ลูกหนี้มีสิทธิปฏิเสธการชำระหนี้ได้'],
  ['ทรัพยสิทธิ', 'สิทธิเหนือทรัพย์สินที่ใช้ยันบุคคลได้ทั่วไป ก่อตั้งได้โดยอาศัยอำนาจแห่งกฎหมายเท่านั้น เช่น กรรมสิทธิ์ ภารจำยอม สิทธิเก็บกิน'],
  ['บุคคลสิทธิ', 'สิทธิที่ใช้ยันได้เฉพาะคู่กรณีหรือบุคคลที่ผูกพันกัน เช่น สิทธิเรียกร้องตามสัญญา'],
  ['กรรมสิทธิ์', 'ทรัพยสิทธิที่สมบูรณ์ที่สุด เจ้าของมีสิทธิใช้สอย จำหน่าย ได้ดอกผล ติดตามเอาคืน และขัดขวางมิให้ผู้อื่นเข้าเกี่ยวข้องโดยมิชอบ (ป.พ.พ. มาตรา 1336)'],
  ['ครอบครองปรปักษ์', 'การได้กรรมสิทธิ์โดยการครอบครองทรัพย์สินของผู้อื่นโดยสงบ เปิดเผย ด้วยเจตนาเป็นเจ้าของ ติดต่อกัน 10 ปีสำหรับอสังหาริมทรัพย์ หรือ 5 ปีสำหรับสังหาริมทรัพย์ (ป.พ.พ. มาตรา 1382)'],
  ['ภารจำยอม', 'ทรัพยสิทธิที่ทำให้เจ้าของอสังหาริมทรัพย์ต้องยอมรับกรรมบางอย่างซึ่งกระทบถึงทรัพย์สินของตน หรือต้องงดเว้นการใช้สิทธิบางอย่าง เพื่อประโยชน์ของอสังหาริมทรัพย์อื่น เช่น ทางเดิน'],
  ['ผู้เยาว์', 'บุคคลที่ยังไม่บรรลุนิติภาวะ โดยทั่วไปคือผู้ที่อายุยังไม่ครบยี่สิบปีบริบูรณ์และยังไม่ได้สมรสตามกฎหมาย'],
  ['บรรลุนิติภาวะ', 'การพ้นจากภาวะผู้เยาว์ เกิดขึ้นเมื่ออายุยี่สิบปีบริบูรณ์ หรือเมื่อทำการสมรสตามที่กฎหมายกำหนด'],
  ['คนไร้ความสามารถ', 'บุคคลวิกลจริตที่ศาลมีคำสั่งให้เป็นคนไร้ความสามารถ และต้องอยู่ในความอนุบาล นิติกรรมที่ทำลงเป็นโมฆียะ'],
  ['คนเสมือนไร้ความสามารถ', 'บุคคลที่ไม่สามารถจัดทำการงานโดยตนเองได้ หรือจัดการไปในทางที่อาจเสื่อมเสียแก่ทรัพย์สินด้วยเหตุตามกฎหมาย และศาลสั่งให้อยู่ในความพิทักษ์'],
  ['เจตนา (อาญา)', 'การกระทำโดยรู้สำนึกในการที่กระทำ และในขณะเดียวกันผู้กระทำประสงค์ต่อผลหรือย่อมเล็งเห็นผลของการกระทำนั้น (ป.อ. มาตรา 59)'],
  ['ประมาท', 'การกระทำความผิดมิใช่โดยเจตนา แต่กระทำโดยปราศจากความระมัดระวังซึ่งบุคคลในภาวะเช่นนั้นจักต้องมีตามวิสัยและพฤติการณ์ และอาจใช้ความระมัดระวังได้ แต่หาได้ใช้ให้เพียงพอไม่'],
  ['ป้องกันโดยชอบด้วยกฎหมาย', 'การกระทำเพื่อป้องกันสิทธิของตนหรือผู้อื่นจากภยันตรายที่เกิดจากการประทุษร้ายอันละเมิดต่อกฎหมายและใกล้จะถึง โดยกระทำพอสมควรแก่เหตุ ผู้กระทำไม่มีความผิด (ป.อ. มาตรา 68)'],
  ['ตัวการ', 'ผู้ที่ร่วมกระทำความผิดด้วยกันตั้งแต่สองคนขึ้นไป ต้องระวางโทษตามที่กฎหมายกำหนดไว้สำหรับความผิดนั้น (ป.อ. มาตรา 83)'],
  ['ผู้ใช้', 'ผู้ที่ก่อให้ผู้อื่นกระทำความผิด ไม่ว่าด้วยการใช้ บังคับ ขู่เข็ญ จ้าง วาน ยุยงส่งเสริม หรือด้วยวิธีอื่นใด'],
  ['ผู้สนับสนุน', 'ผู้ที่ช่วยเหลือหรือให้ความสะดวกในการที่ผู้อื่นกระทำความผิด ก่อนหรือขณะกระทำความผิด ต้องระวางโทษสองในสามส่วนของโทษสำหรับความผิดนั้น (ป.อ. มาตรา 86)'],
  ['พยายามกระทำความผิด', 'การลงมือกระทำความผิดแต่กระทำไปไม่ตลอด หรือกระทำไปตลอดแล้วแต่ไม่บรรลุผล (ป.อ. มาตรา 80)'],
  ['ความผิดอันยอมความได้', 'ความผิดที่ผู้เสียหายต้องร้องทุกข์ภายในกำหนดเวลา และอาจถอนคำร้องทุกข์หรือยอมความกันได้ ทำให้สิทธินำคดีอาญามาฟ้องระงับไป เช่น หมิ่นประมาท ฉ้อโกง'],
  ['ความผิดต่อแผ่นดิน', 'ความผิดที่กระทบต่อความสงบเรียบร้อยของสังคม รัฐเป็นผู้เสียหาย ไม่อาจยอมความได้ และพนักงานสอบสวนมีอำนาจสอบสวนได้โดยไม่ต้องมีคำร้องทุกข์'],
  ['ฟ้องซ้ำ', 'การที่คู่ความเดียวกันรื้อร้องฟ้องกันอีกในประเด็นที่ศาลได้วินิจฉัยโดยอาศัยเหตุอย่างเดียวกัน ภายหลังคดีมีคำพิพากษาถึงที่สุดแล้ว ซึ่งกฎหมายห้ามไว้'],
  ['ภาระการพิสูจน์', 'หน้าที่ของคู่ความในการนำพยานหลักฐานมาพิสูจน์ข้อเท็จจริงที่ตนกล่าวอ้าง หากพิสูจน์ไม่ได้ ข้อเท็จจริงนั้นจะไม่เป็นประโยชน์แก่ฝ่ายนั้น'],
  ['คำพิพากษาถึงที่สุด', 'คำพิพากษาที่ไม่อาจอุทธรณ์หรือฎีกาได้อีก เพราะพ้นกำหนดเวลาหรือเป็นคำพิพากษาของศาลสูงสุด ผูกพันคู่ความ'],
  ['เขตอำนาจศาล', 'อำนาจของศาลในการรับคดีไว้พิจารณาพิพากษา ซึ่งพิจารณาตามประเภทคดี ทุนทรัพย์ และท้องที่'],
  ['อนุญาโตตุลาการ', 'วิธีระงับข้อพิพาทนอกศาล โดยคู่กรณีตกลงให้บุคคลที่สามเป็นผู้ชี้ขาด และคำชี้ขาดผูกพันคู่กรณี'],
  ['นิติบุคคล', 'บุคคลที่กฎหมายสมมติขึ้นให้มีสิทธิและหน้าที่ เช่น บริษัทจำกัด ห้างหุ้นส่วนจดทะเบียน สมาคม มูลนิธิ และหน่วยงานของรัฐที่กฎหมายกำหนด'],
  ['ทายาทโดยธรรม', 'ทายาทที่มีสิทธิรับมรดกตามที่กฎหมายกำหนดลำดับไว้ ได้แก่ ผู้สืบสันดาน บิดามารดา พี่น้อง ปู่ย่าตายาย ลุงป้าน้าอา และคู่สมรส'],
  ['พินัยกรรม', 'คำสั่งเผื่อตายที่บุคคลแสดงเจตนาเกี่ยวกับทรัพย์สินหรือกิจการต่าง ๆ ซึ่งจะเกิดผลเมื่อผู้ทำตาย ต้องทำตามแบบที่กฎหมายกำหนด'],
  ['หลักสุจริต', 'หลักทั่วไปที่กำหนดให้บุคคลต้องใช้สิทธิและชำระหนี้โดยสุจริต (ป.พ.พ. มาตรา 5) และให้สันนิษฐานไว้ก่อนว่าบุคคลทุกคนกระทำการโดยสุจริต (มาตรา 6)']
];
var ABBR = [['ป.พ.พ.', 'ประมวลกฎหมายแพ่งและพาณิชย์'], ['ป.อ.', 'ประมวลกฎหมายอาญา'], ['ป.วิ.พ.', 'ประมวลกฎหมายวิธีพิจารณาความแพ่ง'], ['ป.วิ.อ.', 'ประมวลกฎหมายวิธีพิจารณาความอาญา'], ['ป.รัษฎากร', 'ประมวลรัษฎากร'], ['รธน.', 'รัฐธรรมนูญแห่งราชอาณาจักรไทย'], ['พ.ร.บ.', 'พระราชบัญญัติ'], ['พ.ร.ป.', 'พระราชบัญญัติประกอบรัฐธรรมนูญ'], ['พ.ร.ก.', 'พระราชกำหนด'], ['พ.ร.ฎ.', 'พระราชกฤษฎีกา'], ['กฎ ก.', 'กฎกระทรวง'], ['ฎ.', 'คำพิพากษาศาลฎีกา'], ['ม.', 'มาตรา'], ['ว.', 'วรรค'], ['อนุ.', 'อนุมาตรา'], ['คปค.', 'คณะปฏิรูปการปกครองในระบอบประชาธิปไตยอันมีพระมหากษัตริย์ทรงเป็นประมุข'], ['คสช.', 'คณะรักษาความสงบแห่งชาติ'], ['ปร./ปว.', 'ประกาศของคณะปฏิวัติและคณะปฏิรูปในอดีต (ชื่อหมวดในฐานข้อมูลกฎหมายของรัฐ)'], ['ป.ป.ช.', 'คณะกรรมการป้องกันและปราบปรามการทุจริตแห่งชาติ'], ['กกต.', 'คณะกรรมการการเลือกตั้ง'], ['สคก.', 'สำนักงานคณะกรรมการกฤษฎีกา'], ['อสส.', 'อัยการสูงสุด'], ['สตช.', 'สำนักงานตำรวจแห่งชาติ'], ['ศาล รธน.', 'ศาลรัฐธรรมนูญ'], ['ศป.', 'ศาลปกครอง']];
var TIMELINES = {
  civil: ['ยื่นคำฟ้องต่อศาลที่มีเขตอำนาจ พร้อมชำระค่าธรรมเนียมศาล', 'ศาลตรวจคำฟ้อง สั่งรับฟ้อง และออกหมายเรียกส่งสำเนาคำฟ้องให้จำเลย', 'จำเลยยื่นคำให้การภายในกำหนดเวลาที่กฎหมายกำหนด (โดยหลัก 15 วันนับแต่ได้รับหมาย)', 'ศาลนัดชี้สองสถานหรือกำหนดประเด็นข้อพิพาท และอาจไกล่เกลี่ย', 'สืบพยานโจทก์และพยานจำเลย', 'ศาลมีคำพิพากษาหรือคำสั่ง', 'อุทธรณ์และฎีกาภายในกำหนดเวลาตามกฎหมาย (ฎีกาต้องได้รับอนุญาต)', 'บังคับคดีภายในระยะเวลาที่กฎหมายกำหนด'],
  criminal: ['ผู้เสียหายร้องทุกข์ หรือบุคคลอื่นกล่าวโทษต่อพนักงานสอบสวน', 'พนักงานสอบสวนสอบสวนรวบรวมพยานหลักฐาน และมีความเห็นส่งสำนวน', 'พนักงานอัยการพิจารณาสั่งฟ้องหรือสั่งไม่ฟ้อง', 'ยื่นฟ้องต่อศาล (กรณีผู้เสียหายฟ้องเอง ศาลไต่สวนมูลฟ้องก่อน)', 'ศาลสอบคำให้การจำเลย และสืบพยาน', 'ศาลพิพากษาโดยยกประโยชน์แห่งความสงสัยให้จำเลย', 'อุทธรณ์และฎีกาภายในกำหนดเวลาตามกฎหมาย', 'บังคับโทษตามคำพิพากษาถึงที่สุด']
};
VIEWS.tools = function (el) {
  var st = S.ui.tl || (S.ui.tl = { t: 'dict' });
  var TL = [['dict', 'dict', 'พจนานุกรมศัพท์กฎหมาย (ไทย/อังกฤษ)', 'tools_basic'], ['abbr', 'abbr', 'รวมคำย่อทางกฎหมาย', 'tools_basic'], ['date', 'calendar', 'คำนวณวันและระยะเวลา', 'tools_basic'], ['period', 'calc', 'คำนวณกำหนดเวลาทางกฎหมาย', 'tools_all'], ['cite', 'quote', 'จัดรูปแบบการอ้างอิง', 'tools_all'], ['brief', 'brief', 'แบบฟอร์มสรุปคำพิพากษา', 'tools_all'], ['compare', 'compare', 'เปรียบเทียบบทบัญญัติ', 'compare'], ['timeline', 'route', 'ลำดับขั้นตอนทางกฎหมาย', 'tools_all'], ['viewer', 'viewer', 'เปิดอ่านเอกสาร', 'tools_all']];
  if (st.t === 'notes') st.t = 'dict';
  el.innerHTML = '<div class="view-head"><div><h2>' + tr('tools') + '</h2><p class="sub">พจนานุกรม คำย่อ คำนวณระยะเวลา และอื่น ๆ</p></div></div><div class="hscroll" id="tlTabs">' + TL.map(function (x) { return '<button class="chip ' + (st.t === x[0] ? 'on' : '') + '" data-t="' + x[0] + '">' + ic(x[1]) + esc(x[2]) + '</button>'; }).join('') + '</div><div id="tlBody" style="margin-top:12px"></div>';
  function draw() {
    var def = TL.filter(function (x) { return x[0] === st.t; })[0];
    var b = $('#tlBody', el); b.className = 'enter';
    if (st.t === 'notes') { nav('notes'); return; }
    if (!can(def[3])) { b.innerHTML = '<div class="panel"><div class="empty warn"><div class="eic">' + ic(def[1]) + '</div><h3>' + esc(def[2]) + ' ไม่รวมอยู่ในแพ็กเกจปัจจุบัน</h3><p>เครื่องมือนี้เปิดให้ใช้ในช่วงทดลองใช้และแพ็กเกจที่สูงกว่า</p><button class="btn o" data-go3="pricing">' + ic('card') + ' ดูแพ็กเกจและราคา</button></div></div>'; return; }
    TOOL_UI[st.t](b);
  }
  on($('#tlTabs', el), 'click', '[data-t]', function (e, b) { st.t = b.getAttribute('data-t'); store.set('ui', S.ui); $$('#tlTabs .chip', el).forEach(function (c) { c.classList.toggle('on', c === b); }); draw(); });
  on(el, 'click', '[data-go3]', function (e, b) { nav(b.getAttribute('data-go3')); });
  draw();
};
function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
function addMonthsLegal(d, n) { var y = d.getFullYear(), m = d.getMonth() + n, day = d.getDate(); var last = new Date(y, m + 1, 0).getDate(); return new Date(y, m, Math.min(day, last)); }
function isoD(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function thD(d) { return 'วัน' + TH_DAYS[d.getDay()] + 'ที่ ' + d.getDate() + ' ' + TH_MONTHS[d.getMonth()] + ' ' + yr(d.getFullYear()); }
var TOOL_UI = {
  dict: function (b) {
    b.innerHTML = '<div class="input" style="margin-bottom:12px">' + ic('search') + '<input id="dQ" placeholder="ค้นหาศัพท์กฎหมาย"></div><div class="grid g2" id="dList"></div>';
    function draw() { var q = norm($('#dQ', b).value); $('#dList', b).innerHTML = DICT.filter(function (d) { return !q || norm(d[0] + d[1]).indexOf(q) > -1; }).map(function (d) { return '<div class="panel flat"><h3>' + esc(d[0]) + '</h3><p class="muted" style="margin-top:4px">' + esc(d[1]) + '</p></div>'; }).join('') || '<p class="muted">ไม่พบคำที่ค้นหา</p>'; }
    $('#dQ', b).addEventListener('input', debounce(draw, 120)); draw();
  },
  abbr: function (b) {
    b.innerHTML = '<div class="input" style="margin-bottom:12px">' + ic('search') + '<input id="aQ" placeholder="ค้นหาคำย่อ"></div><div class="table-scroll"><table class="ptable"><thead><tr><th>คำย่อ</th><th style="text-align:left">ความหมาย</th></tr></thead><tbody id="aList"></tbody></table></div>';
    function draw() { var q = norm($('#aQ', b).value); $('#aList', b).innerHTML = ABBR.filter(function (a) { return !q || norm(a[0] + a[1]).indexOf(q) > -1; }).map(function (a) { return '<tr><td><b>' + esc(a[0]) + '</b></td><td style="text-align:left">' + esc(a[1]) + '</td></tr>'; }).join(''); }
    $('#aQ', b).addEventListener('input', debounce(draw, 120)); draw();
  },
  date: function (b) {
    var today = isoD(new Date());
    b.innerHTML = '<div class="grid g2"><section class="panel"><div class="panel-title"><span class="ic">' + ic('calendar') + '</span><h3>นับระยะห่างระหว่างวัน</h3></div><div class="grid g2">' + textField('dA', 'วันเริ่มต้น', today, true, { type: 'date' }) + textField('dB', 'วันสิ้นสุด', today, true, { type: 'date' }) + '</div><div class="panel flat" style="margin-top:10px" id="dOut1"></div></section>' +
      '<section class="panel"><div class="panel-title"><span class="ic o">' + ic('plus') + '</span><h3>บวก/ลบ วัน เดือน ปี</h3></div><div class="grid g2">' + textField('dS', 'วันตั้งต้น', today, true, { type: 'date' }) + textField('dN', 'จำนวน', '30', true, { type: 'number' }) + '</div><div class="field" style="margin-top:8px"><div class="seg" id="dU"><button data-u="d" class="on">วัน</button><button data-u="m">เดือน</button><button data-u="y">ปี</button></div></div><div class="panel flat" style="margin-top:10px" id="dOut2"></div></section></div>';
    var unit = 'd';
    function calc() {
      var a = new Date($('#dA', b).value + 'T00:00:00'), c = new Date($('#dB', b).value + 'T00:00:00');
      if (!isNaN(a) && !isNaN(c)) { var diff = Math.round((c - a) / 864e5); var y = 0, m = 0, s = new Date(a); while (addMonthsLegal(s, 12) <= c) { s = addMonthsLegal(s, 12); y++; } while (addMonthsLegal(s, 1) <= c) { s = addMonthsLegal(s, 1); m++; } var dd = Math.round((c - s) / 864e5); $('#dOut1', b).innerHTML = '<b>' + diff + ' วัน</b><div class="muted small">เท่ากับ ' + y + ' ปี ' + m + ' เดือน ' + dd + ' วัน · ' + Math.floor(Math.abs(diff) / 7) + ' สัปดาห์ ' + Math.abs(diff) % 7 + ' วัน</div>'; }
      var st_ = new Date($('#dS', b).value + 'T00:00:00'), n = parseInt($('#dN', b).value, 10) || 0;
      if (!isNaN(st_)) { var r = unit === 'd' ? addDays(st_, n) : addMonthsLegal(st_, unit === 'm' ? n : n * 12); $('#dOut2', b).innerHTML = '<b>' + thD(r) + '</b>'; }
    }
    $$('input', b).forEach(function (i) { i.addEventListener('input', calc); });
    on(b, 'click', '#dU [data-u]', function (e, x) { unit = x.getAttribute('data-u'); $$('#dU button', b).forEach(function (y) { y.classList.toggle('on', y === x); }); calc(); });
    calc();
  },
  period: function (b) {
    b.innerHTML = '<section class="panel"><div class="panel-title"><span class="ic o">' + ic('calc') + '</span><h3>คำนวณกำหนดเวลาทางกฎหมายเบื้องต้น</h3></div>' +
      '<div class="panel flat" style="margin-bottom:12px;border-color:var(--orange)"><div class="row" style="align-items:flex-start"><span style="color:var(--orange)">' + ic('alert') + '</span><p class="small">คำเตือน: เครื่องมือนี้คำนวณตามหลักทั่วไปของการนับระยะเวลาในประมวลกฎหมายแพ่งและพาณิชย์ (ไม่นับวันแรก และกรณีนับเป็นเดือนหรือปี ระยะเวลาสิ้นสุดในวันที่ตรงกันของเดือนหรือปีสุดท้าย) การนับระยะเวลาในบางเรื่องมีข้อยกเว้นเฉพาะ เช่น กำหนดเวลาตามกฎหมายวิธีพิจารณาความ วันหยุดราชการ หรือคำสั่งศาล ผู้ใช้ต้องตรวจสอบบทบัญญัติที่เกี่ยวข้องทุกครั้ง</p></div></div>' +
      '<div class="grid g3">' + textField('pS', 'วันที่เกิดเหตุหรือวันเริ่มนับ', isoD(new Date()), true, { type: 'date' }) + textField('pN', 'จำนวน', '1', true, { type: 'number' }) + '<div class="field"><label for="pU">หน่วย</label><div class="input"><select id="pU"><option value="d">วัน</option><option value="w">สัปดาห์</option><option value="m">เดือน</option><option value="y" selected>ปี</option></select></div></div></div>' +
      '<div class="hscroll" style="margin-top:10px">' + [['อายุความละเมิด 1 ปี', 1, 'y'], ['อายุความทั่วไป 10 ปี', 10, 'y'], ['ยื่นคำให้การ 15 วัน', 15, 'd'], ['อุทธรณ์ 1 เดือน', 1, 'm']].map(function (p) { return '<button class="chip" data-p="' + p[1] + '|' + p[2] + '">' + esc(p[0]) + '</button>'; }).join('') + '</div>' +
      '<label class="check" style="margin-top:10px"><input type="checkbox" id="pWk" checked><span>หากวันสุดท้ายตรงกับวันเสาร์หรืออาทิตย์ ให้เลื่อนไปวันทำการถัดไป (ไม่รวมวันหยุดนักขัตฤกษ์)</span></label>' +
      '<div class="panel flat corner" style="margin-top:12px" id="pOut"></div></section>';
    function calc() {
      var s = new Date($('#pS', b).value + 'T00:00:00'), n = parseInt($('#pN', b).value, 10) || 0, u = $('#pU', b).value; if (isNaN(s)) return;
      var start = addDays(s, 1), end;
      if (u === 'd') end = addDays(s, n); else if (u === 'w') end = addDays(s, n * 7); else end = addMonthsLegal(s, u === 'm' ? n : n * 12);
      var moved = '';
      if ($('#pWk', b).checked) { var e2 = new Date(end); while (e2.getDay() === 0 || e2.getDay() === 6) e2 = addDays(e2, 1); if (e2 - end) { moved = '<div class="small" style="color:var(--orange-deep)">วันสุดท้ายตรงกับวันหยุด จึงเลื่อนไปเป็น ' + thD(e2) + '</div>'; end = e2; } }
      $('#pOut', b).innerHTML = '<div class="muted small">เริ่มนับวันแรก (ไม่นับวันเกิดเหตุ)</div><b>' + thD(start) + '</b><div class="muted small" style="margin-top:8px">ระยะเวลาสิ้นสุด</div><b style="font-size:1.2rem">' + thD(end) + '</b>' + moved;
    }
    $$('input,select', b).forEach(function (i) { i.addEventListener('input', calc); i.addEventListener('change', calc); });
    on(b, 'click', '[data-p]', function (e, x) { var p = x.getAttribute('data-p').split('|'); $('#pN', b).value = p[0]; $('#pU', b).value = p[1]; calc(); });
    calc();
  },
  cite: function (b) {
    var laws = S.catalog ? S.catalog.laws : [];
    b.innerHTML = '<section class="panel"><div class="grid g2"><div class="field"><label for="cL">กฎหมาย</label><div class="input"><select id="cL">' + laws.map(function (l) { return '<option value="' + esc(l.id) + '">' + esc(l.title) + '</option>'; }).join('') + '</select></div></div>' + textField('cS', 'มาตรา', '420', true) + '<div class="field"><label for="cP">วรรค</label><div class="input"><select id="cP"><option value="">ไม่ระบุ</option>' + ['หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า'].map(function (x, i) { return '<option value="' + (i + 1) + '">วรรค' + x + '</option>'; }).join('') + '</select></div></div>' + textField('cA', 'อนุมาตรา (ถ้ามี)', '', false) + '</div>' +
      '<h3 style="margin:16px 0 6px">คำพิพากษาศาลฎีกา</h3><div class="grid g2">' + textField('cD', 'เลขที่คำพิพากษา', '', false, { ph: 'เช่น 1234' }) + textField('cY', 'ปี พ.ศ.', '', false, { ph: 'เช่น 2560' }) + '</div><div class="col" id="cOut" style="margin-top:12px;gap:8px"></div></section>';
    var TH_NUM = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า'];
    function calc() {
      var l = LAWS[$('#cL', b).value] || {}, s = $('#cS', b).value.trim(), p = $('#cP', b).value, a = $('#cA', b).value.trim(), d = $('#cD', b).value.trim(), y = $('#cY', b).value.trim();
      var full = (l.title || '') + (s ? ' มาตรา ' + s : '') + (p ? ' วรรค' + TH_NUM[p] : '') + (a ? ' (' + a + ')' : '');
      var short = (l.short || l.title || '') + (s ? ' ม. ' + s : '') + (p ? ' ว. ' + p : '') + (a ? ' (' + a + ')' : '');
      var rows = [['รูปแบบเต็ม', full], ['รูปแบบย่อ', short], ['เชิงอรรถ', 'โปรดดู ' + full + '.']];
      if (d && y) rows.push(['คำพิพากษาศาลฎีกา (เต็ม)', 'คำพิพากษาศาลฎีกาที่ ' + d + '/' + y], ['คำพิพากษาศาลฎีกา (ย่อ)', 'ฎ. ' + d + '/' + y]);
      $('#cOut', b).innerHTML = rows.map(function (r) { return '<div class="entry"><span class="grow"><span class="es">' + esc(r[0]) + '</span><br><span class="et">' + esc(r[1]) + '</span></span><button class="icon-btn" data-cp="' + esc(r[1]) + '" aria-label="คัดลอก">' + ic('copy') + '</button></div>'; }).join('');
    }
    $$('input,select', b).forEach(function (i) { i.addEventListener('input', calc); i.addEventListener('change', calc); });
    on(b, 'click', '[data-cp]', function (e, x) { copyText(x.getAttribute('data-cp')); });
    calc();
  },
  brief: function (b) {
    var F = [['bTitle', 'ชื่อคดี / เลขที่คำพิพากษา'], ['bCourt', 'ศาล'], ['bFacts', 'ข้อเท็จจริงโดยย่อ'], ['bIssue', 'ประเด็นที่ศาลวินิจฉัย'], ['bHeld', 'คำวินิจฉัย'], ['bReason', 'เหตุผลของศาล'], ['bLaw', 'หลักกฎหมายและมาตราที่เกี่ยวข้อง'], ['bNote', 'ความเห็นหรือข้อสังเกตส่วนตัว']];
    b.innerHTML = '<section class="panel"><div class="col" style="gap:10px">' + F.map(function (f, i) { return i < 2 ? textField(f[0], f[1], '', i === 0) : '<div class="field"><label for="' + f[0] + '">' + esc(f[1]) + '</label><div class="input"><textarea id="' + f[0] + '" maxlength="5000"></textarea></div></div>'; }).join('') + '<button class="btn k" id="bSave">' + ic('note') + ' บันทึกเป็นสมุดบันทึก</button></div></section>';
    $('#bSave', b).onclick = function () {
      if (!gate('notes')) return;
      var t_ = $('#bTitle', b).value.trim(); if (!t_) { setErr('bTitle', 'กรุณาระบุชื่อคดีหรือเลขที่คำพิพากษา'); return; }
      var html = '<h2>สรุปคำพิพากษา: ' + esc(t_) + '</h2>' + F.slice(1).map(function (f) { var v = $('#' + f[0], b).value.trim(); return v ? '<h3>' + esc(f[1]) + '</h3>' + v.split('\n').map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') : ''; }).join('');
      var n = { id: uid(), title: 'สรุปคำพิพากษา ' + t_, html: html, c: Date.now(), u: Date.now(), indent: true };
      S.ud.notes.unshift(n); saveUD(); toast('บันทึกสรุปคำพิพากษาแล้ว', '', 'ok', { action: 'เปิดสมุดบันทึก', onAction: function () { S.ui.note = n.id; nav('notes'); } });
    };
  },
  compare: function (b) {
    if (!S.catalog) { b.innerHTML = '<div class="skeleton" style="height:120px"></div>'; loadCatalog().then(function () { TOOL_UI.compare(b); }); return; }
    var opts = allSecs().sort(function (a, b) { return a.law === b.law ? secCmp(a, b) : a.law.localeCompare(b.law); }).map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(lawShort(LAWS[s.law]) + ' ม. ' + s.no + ' ' + s.name) + '</option>'; }).join('');
    b.innerHTML = '<div class="grid g2"><div class="field"><label for="cmA">บทบัญญัติที่ 1</label><div class="input"><select id="cmA">' + opts + '</select></div></div><div class="field"><label for="cmB">บทบัญญัติที่ 2</label><div class="input"><select id="cmB">' + opts + '</select></div></div></div><p class="tiny muted" style="margin:8px 0">ข้อความที่ไฮไลต์คือถ้อยคำที่ปรากฏในบทบัญญัติฉบับนั้นเพียงฝั่งเดียว</p><div class="grid g2" id="cmOut"></div>';
    if (allSecs().length > 1) $('#cmB', b).selectedIndex = 1;
    function words(s) { try { if (window.Intl && Intl.Segmenter) return Array.from(new Intl.Segmenter('th', { granularity: 'word' }).segment(s)).map(function (x) { return x.segment; }); } catch (e) {} return s.split(/(\s+)/); }
    function calc() {
      var A = SECS[$('#cmA', b).value], B = SECS[$('#cmB', b).value]; if (!A || !B) return;
      var wa = words(A.text), wb = words(B.text), sa = {}, sb = {};
      wa.forEach(function (w) { sa[w] = 1; }); wb.forEach(function (w) { sb[w] = 1; });
      function render(ws, other) { return ws.map(function (w) { return (/\S/.test(w) && w.length > 1 && !other[w]) ? '<mark class="hl">' + esc(w) + '</mark>' : esc(w); }).join('').replace(/\n/g, '<br>'); }
      $('#cmOut', b).innerHTML = [[A, render(wa, sb)], [B, render(wb, sa)]].map(function (x) { return '<section class="panel"><span class="tag">' + esc(lawShort(LAWS[x[0].law])) + '</span><h3 style="margin:6px 0">มาตรา ' + esc(x[0].no) + ' ' + esc(x[0].name) + '</h3><div class="law-text"><p>' + x[1] + '</p></div></section>'; }).join('');
    }
    $('#cmA', b).onchange = calc; $('#cmB', b).onchange = calc; calc();
  },
  timeline: function (b) {
    b.innerHTML = '<div class="seg" id="tlK" style="margin-bottom:12px"><button data-k="civil" class="on">คดีแพ่ง</button><button data-k="criminal">คดีอาญา</button></div><section class="panel"><div class="timeline" id="tlOut"></div><p class="tiny muted">ลำดับขั้นตอนนี้แสดงตามหลักทั่วไปเพื่อการศึกษา รายละเอียดและกำหนดเวลาให้ตรวจสอบกับบทบัญญัติที่ใช้บังคับในแต่ละเรื่อง</p></section>';
    function draw(k) { $('#tlOut', b).innerHTML = TIMELINES[k].map(function (s, i) { return '<div class="tl ' + (i === TIMELINES[k].length - 1 ? 'o' : '') + ' rise in"><h4>ขั้นตอนที่ ' + (i + 1) + '</h4><p class="muted">' + esc(s) + '</p></div>'; }).join(''); }
    on(b, 'click', '#tlK [data-k]', function (e, x) { $$('#tlK button', b).forEach(function (y) { y.classList.toggle('on', y === x); }); draw(x.getAttribute('data-k')); });
    draw('civil');
  },
  viewer: function (b) {
    b.innerHTML = '<section class="panel"><div class="row wrapr"><label class="btn k">' + ic('upload') + ' เลือกไฟล์เอกสาร<input type="file" id="vF" class="sr" accept=".pdf,.txt,.md,.html,.htm,.csv,image/*"></label><span class="muted small">รองรับ PDF รูปภาพ และไฟล์ข้อความ ไฟล์จะเปิดในอุปกรณ์นี้เท่านั้น ไม่ถูกอัปโหลด</span></div><div id="vOut" style="margin-top:12px"></div></section>';
    $('#vF', b).onchange = function () {
      var f = this.files[0]; if (!f) return; var out = $('#vOut', b), url = URL.createObjectURL(f);
      if (/pdf/.test(f.type)) out.innerHTML = '<iframe src="' + url + '" title="' + esc(f.name) + '" style="width:100%;height:75vh;border:0;border-radius:12px;background:#fff"></iframe><a class="btn sm" href="' + url + '" target="_blank" style="margin-top:8px">' + ic('external') + ' เปิดในแท็บใหม่</a>';
      else if (/^image\//.test(f.type)) out.innerHTML = '<img src="' + url + '" alt="' + esc(f.name) + '" style="max-width:100%;border-radius:12px">';
      else { var fr = new FileReader(); fr.onload = function () { out.innerHTML = '<div class="prose" style="white-space:pre-wrap;max-height:75vh;overflow:auto;border:1px solid var(--line);border-radius:12px;padding:16px">' + esc(fr.result) + '</div>'; }; fr.readAsText(f); }
    };
  }
};

/* =======================================================================
   VIEW: PRICING — ทดลองใช้ 7 วัน + รายเดือน/รายปี 3 ระดับ
   ======================================================================= */
var PRICES = { monthly: { basic: 99, standard: 249, pro: 449 }, yearly: { basic: 1190, standard: 2690, pro: 4790 } };
VIEWS.pricing = function (el) {
  var st = S.ui.pr || (S.ui.pr = { cycle: 'monthly', sel: 'standard' });
  var plan = (S.member && S.member.plan) || {};
  function rows(cycle) {
    var Y = cycle === 'yearly';
    return [
      ['อ่านกฎหมายทั้ง 5 หมวดและอนุสัญญาพร้อมคำอธิบาย', 1, 1, 1],
      ['ป้ายพลิกมาตรา บันทึกรายการโปรด ประวัติ และสถิติเวลา', 1, 1, 1],
      ['ตัวจับเวลาท่องจำพร้อมเสียงเตือน', 1, 1, 1],
      ['โฟลเดอร์ส่วนตัวและหมายเหตุรายมาตรา', 1, 1, 1],
      ['พจนานุกรม คำย่อ และเครื่องคำนวณวัน', 1, 1, 1],
      ['สมุดบันทึกจัดรูปแบบและพิมพ์ PDF', Y ? 1 : 0, 1, 1],
      ['เครื่องมือนักกฎหมายครบชุดและการเปรียบเทียบบทบัญญัติ', 0, 1, 1],
      ['ผู้ช่วย AI ค้นคว้ากฎหมาย', 0, '30 ครั้ง/วัน', '200 ครั้ง/วัน'],
      ['สำรองข้อมูลส่วนตัว', 0, Y ? 1 : 0, 1],
      ['การสนับสนุนจากผู้ดูแลระบบ', 'ทั่วไป', 'ทั่วไป', Y ? 'เร่งด่วนภายใน 24 ชม.' : 'เร่งด่วน']
    ];
  }
  function cell(v) { return v === 1 ? '<span class="yes">' + ic('check') + '</span>' : v === 0 ? '<span class="no">–</span>' : '<span class="small">' + esc(v) + '</span>'; }
  function draw() {
    var P = PRICES[st.cycle], unit = st.cycle === 'yearly' ? '/ปี' : '/เดือน';
    el.innerHTML = '<div class="view-head"><div><h2>' + tr('pricing') + '</h2><p class="sub">' + (plan.trial ? 'ท่านอยู่ในช่วงทดลองใช้งานครบทุกฟังก์ชัน เหลืออีก ' + plan.daysLeft + ' วัน' : plan.tier === 'free' ? 'ระยะทดลองใช้งาน 7 วันสิ้นสุดแล้ว กรุณาเลือกแพ็กเกจเพื่อใช้งานต่อ' : 'แพ็กเกจปัจจุบัน: ' + (PLAN_LABEL[plan.tier] || '') + ' (' + (plan.cycle === 'yearly' ? 'รายปี' : 'รายเดือน') + ') หมดอายุ ' + fmtDate(plan.expires)) + '</p></div><div class="seg" id="prCycle"><button data-c="monthly" class="' + (st.cycle === 'monthly' ? 'on' : '') + '">รายเดือน</button><button data-c="yearly" class="' + (st.cycle === 'yearly' ? 'on' : '') + '">รายปี</button></div></div>' +
      '<div class="panel flat corner o" style="margin-bottom:14px"><div class="row wrapr"><span class="tag o">ทดลองใช้ฟรี 7 วัน</span><span class="grow small">สมาชิกใหม่ทุกคนใช้งานได้ครบทุกระบบ 7 วันนับแต่วันสมัคร หลังจากนั้นเลือกแพ็กเกจรายเดือนหรือรายปีตามความเหมาะสม</span></div></div>' +
      '<div class="price-cards">' + ['basic', 'standard', 'pro'].map(function (k) {
        return '<button class="pcard ' + (st.sel === k ? 'sel' : '') + '" data-k="' + k + '"><span class="pn">' + esc(PLAN_LABEL[k]) + (k === 'standard' ? '<span class="tag">ยอดนิยม</span>' : k === 'pro' ? '<span class="tag k">ครบที่สุด</span>' : '') + '</span><span class="pp">฿' + P[k].toLocaleString('th-TH') + ' <small>' + unit + '</small></span>' + (st.cycle === 'yearly' ? '<span class="tiny muted">เฉลี่ย ฿' + Math.round(P[k] / 12).toLocaleString('th-TH') + ' ต่อเดือน</span>' : '<span class="tiny muted">ชำระรายเดือน ยกเลิกได้ทุกเมื่อ</span>') + '</button>';
      }).join('') + '</div>' +
      '<div class="table-scroll" style="margin-top:16px"><table class="ptable"><thead><tr><th>ฟังก์ชันการใช้งาน</th><th>พื้นฐาน</th><th>มาตรฐาน</th><th>มืออาชีพ</th></tr></thead><tbody>' + rows(st.cycle).map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td>' + cell(r[1]) + '</td><td>' + cell(r[2]) + '</td><td>' + cell(r[3]) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="row" style="justify-content:center;margin-top:18px"><button class="btn lg k" id="prGo">เริ่มต้นใช้งานแพ็กเกจ' + esc(PLAN_LABEL[st.sel]) + ' ' + ic('arrowR') + '</button></div>' +
      '<p class="tiny muted" style="text-align:center;margin-top:10px">การชำระเงินดำเนินการผ่านผู้ดูแลระบบ เมื่อส่งคำขอ ผู้ดูแลระบบจะติดต่อกลับเพื่อแจ้งช่องทางชำระเงินและเปิดสิทธิ์ให้</p>';
    on($('#prCycle', el), 'click', '[data-c]', function (e, b) { st.cycle = b.getAttribute('data-c'); store.set('ui', S.ui); draw(); });
    on(el, 'click', '.pcard', function (e, b) { st.sel = b.getAttribute('data-k'); store.set('ui', S.ui); $$('.pcard', el).forEach(function (c) { c.classList.toggle('sel', c === b); }); $('#prGo', el).innerHTML = 'เริ่มต้นใช้งานแพ็กเกจ' + esc(PLAN_LABEL[st.sel]) + ' ' + ic('arrowR'); });
    $('#prGo', el).onclick = function () {
      var price = PRICES[st.cycle][st.sel];
      confirmBox('ยืนยันคำขอสมัครแพ็กเกจ', 'แพ็กเกจ' + PLAN_LABEL[st.sel] + ' (' + (st.cycle === 'yearly' ? 'รายปี' : 'รายเดือน') + ') ราคา ฿' + price.toLocaleString('th-TH') + ' ระบบจะส่งคำขอถึงผู้ดูแลระบบเพื่อดำเนินการชำระเงินและเปิดสิทธิ์', { icon: 'card' }).then(function (ok) {
        if (!ok) return;
        withLoading('กำลังส่งคำขอ', api('paymentRequest', { plan: st.sel, cycle: st.cycle })).then(function (r) { alertBox('ส่งคำขอเรียบร้อยแล้ว', r.msg, { icon: 'check' }); }).catch(function (e) { toast('ส่งคำขอไม่สำเร็จ', e.msg, 'bad'); });
      });
    };
  }
  draw();
};

/* =======================================================================
   VIEW: HELP & SUPPORT
   ======================================================================= */
VIEWS.help = function (el) {
  var guide = [
    ['เริ่มต้นใช้งานเว็บไซต์', '<p>หลังเข้าสู่ระบบ ท่านจะพบหน้าหลักซึ่งแสดงข้อมูลสมาชิก วันที่และเวลา ช่องค้นหากฎหมายแบบรวดเร็ว สถิติการใช้งาน เอกสารที่เปิดอ่านล่าสุด และประกาศจากผู้ดูแลระบบ แถบเมนูลอยด้านล่างใช้สลับระหว่างหน้าหลัก เนื้อหา อนุสัญญา บันทึก ประวัติ และเวลา ส่วนปุ่มวงกลมด้านขวาของแถบเมนูคือหน้าข้อมูลสมาชิก</p><p>บนแท็บเล็ตที่วางแนวนอน แถบเมนูจะย้ายไปอยู่ด้านซ้ายของหน้าจอเพื่อให้เอื้อมนิ้วได้สะดวก ปุ่มสามขีดมุมซ้ายบนเปิดเมนูรวมทุกหน้า ปุ่มฟันเฟืองมุมขวาบนเปิดการตั้งค่า และปุ่มประกายดาวเปิดหน้าผู้ช่วย AI</p>'],
    ['วิธีค้นหากฎหมาย', '<p>ในเมนูเนื้อหา ให้เลือกหมวดกฎหมายก่อน แล้วพิมพ์ชื่อกฎหมาย ระบบจะแสดงกรอบรายชื่อกฎหมาย เมื่อกดกรอบจะแสดงป้ายพลิกมาตราของกฎหมายนั้น ภายในหน้ากฎหมาย ท่านค้นหาเลขมาตรา ชื่อมาตรา หรือข้อความในมาตรา และเรียงลำดับได้</p><p>หากต้องการค้นหาทั่วทั้งฐานข้อมูล ให้กดปุ่มแว่นขยายด้านบน พิมพ์ เช่น “มาตรา 420” หรือ “ละเมิด” หรือ “พ.ศ. 2560” และเปิดค้นหาแบบละเอียดเพื่อกรองตามประเภทกฎหมาย ปี และการเรียงลำดับ ระบบจะเน้นข้อความที่ตรงกับคำค้นหาและจดจำประวัติการค้นหาให้</p>'],
    ['วิธีใช้งานคลังเอกสาร', '<p>กดปุ่มบันทึกบนป้ายพลิกเพื่อเก็บมาตราไว้ในเมนูบันทึก ระบบจัดกลุ่มรายการตามวัน เดือน หรือปีที่บันทึก ท่านสร้างโฟลเดอร์ ตั้งชื่อ ย้ายรายการ เพิ่มหมายเหตุ ค้นหา เรียงตามวันที่ และลบรายการได้ เมื่อลบโดยไม่ตั้งใจ สามารถกด “เลิกทำ” ในแถบแจ้งเตือนได้ทันที</p>'],
    ['วิธีเปลี่ยนรหัสผ่าน', '<p>กดปุ่มฟันเฟือง เลือกหัวข้อความปลอดภัย กรอกรหัสผ่านเดิม รหัสผ่านใหม่ และยืนยันรหัสผ่านใหม่ แล้วกดเปลี่ยนรหัสผ่าน รหัสผ่านใหม่ต้องยาวอย่างน้อย 10 ตัวอักษร มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข หลังเปลี่ยนแล้ว อุปกรณ์อื่นทั้งหมดจะถูกออกจากระบบเพื่อความปลอดภัย</p><p>หากลืมรหัสผ่านส่วนตัว ให้ใช้เมนูลืมรหัสผ่านในหน้าเข้าสู่ระบบ โดยตอบคำถามสำหรับกู้คืนบัญชีและกรอกรหัสผ่านจากผู้ดูแลระบบ หากลืมรหัสผ่านจากผู้ดูแลระบบ กรุณาติดต่อผู้ดูแลระบบ</p>']
  ];
  var faq = [
    ['ต้องกรอกรหัสผ่านทุกครั้งที่เปิดเว็บไซต์หรือไม่', 'ไม่ต้อง หากเปิด “จดจำการเข้าสู่ระบบ” ไว้ ระบบจะพาท่านกลับเข้าสู่หน้าเดิมที่ใช้งานค้างไว้ทันที จนกว่าท่านจะกดออกจากระบบ'],
    ['ข้อมูลของฉันจะหายหรือไม่เมื่อเปลี่ยนอุปกรณ์', 'ไม่หาย ข้อมูลรายการโปรด ประวัติ เวลา โน้ต และการตั้งค่าซิงก์กับฐานข้อมูลของระบบ เมื่อเข้าสู่ระบบจากอุปกรณ์ใหม่ ข้อมูลทั้งหมดจะแสดงครบ หากขณะใช้งานไม่มีอินเทอร์เน็ต ระบบจะเก็บไว้ในอุปกรณ์และซิงก์ให้เมื่อเชื่อมต่อได้'],
    ['ตัวบทกฎหมายในเว็บไซต์เป็นฉบับปัจจุบันหรือไม่', 'ระบบตรวจสอบแหล่งข้อมูลต้นทางทุกวันและปรับปรุงรายการให้อัตโนมัติ อย่างไรก็ตาม ก่อนนำไปใช้ในทางคดีหรือการปฏิบัติงาน กรุณาตรวจสอบกับราชกิจจานุเบกษาหรือสำนักงานคณะกรรมการกฤษฎีกาทุกครั้ง'],
    ['ทำไมบางกฎหมายแสดงว่า “รอนำเข้าตัวบท”', 'ระบบบันทึกรายชื่อกฎหมายไว้แล้ว และกำลังทยอยนำเข้าตัวบทรายมาตรา ระหว่างนี้ท่านเปิดอ่านฉบับเต็มจากแหล่งข้อมูลต้นทาง หรือแจ้งขอให้นำเข้าเป็นลำดับแรกได้'],
    ['ผู้ช่วย AI ให้คำปรึกษาทางกฎหมายได้หรือไม่', 'ผู้ช่วย AI เป็นเครื่องมือช่วยค้นคว้าและอธิบาย มิใช่คำปรึกษาทางกฎหมายจากผู้ประกอบวิชาชีพ สำหรับเรื่องที่มีผลทางคดี กรุณาปรึกษาทนายความหรือผู้เชี่ยวชาญ'],
    ['ถ้าเว็บไซต์ขัดข้องควรทำอย่างไร', SYS_DOWN_TEXT]
  ];
  el.innerHTML = '<div class="view-head"><div><h2>' + tr('help') + '</h2><p class="sub">คู่มือ คำถามที่พบบ่อย และช่องทางติดต่อผู้ดูแลระบบ</p></div></div>' +
    '<div class="grid g2" style="margin-bottom:16px"><section class="panel"><div class="panel-title"><span class="ic">' + ic('book2') + '</span><h3>คู่มือการใช้งานเว็บไซต์</h3></div>' + guide.map(function (g) { return '<details class="acc"><summary>' + esc(g[0]) + ic('chevD', 'chev') + '</summary><div class="acc-b prose">' + g[1] + '</div></details>'; }).join('') + '</section>' +
    '<section class="panel"><div class="panel-title"><span class="ic o">' + ic('help') + '</span><h3>คำถามที่พบบ่อย (FAQ)</h3></div>' + faq.map(function (f) { return '<details class="acc"><summary>' + esc(f[0]) + ic('chevD', 'chev') + '</summary><div class="acc-b prose"><p class="noindent">' + esc(f[1]) + '</p></div></details>'; }).join('') + '</section></div>' +
    '<div class="grid g3" style="margin-bottom:16px"><button class="panel corner law-item" id="hpBug" style="display:flex"><span class="li-ic">' + ic('bug') + '</span><span class="grow"><span class="li-t">แจ้งปัญหาการใช้งาน</span><br><span class="li-s">ระบบแสดงผลผิดปกติ ใช้งานไม่ได้ หรือช้า</span></span></button>' +
      '<button class="panel corner law-item" id="hpLaw" style="display:flex"><span class="li-ic">' + ic('alert') + '</span><span class="grow"><span class="li-t">รายงานข้อมูลกฎหมายที่อาจผิดพลาด</span><br><span class="li-s">ตัวบท ชื่อมาตรา หรือคำอธิบายคลาดเคลื่อน</span></span></button>' +
      '<button class="panel corner law-item" id="hpPrice" style="display:flex"><span class="li-ic">' + ic('card') + '</span><span class="grow"><span class="li-t">แพ็กเกจและการชำระเงิน</span><br><span class="li-s">ดูรายละเอียดแพ็กเกจรายเดือนและรายปี</span></span></button></div>' +
    '<section class="panel" style="margin-bottom:16px"><div class="panel-title"><span class="ic">' + ic('layers') + '</span><h3>แหล่งข้อมูลกฎหมายและสัญญาอนุญาต</h3></div><div class="prose"><p>ตัวบทกฎหมายไทยไม่มีลิขสิทธิ์ตามมาตรา 7 แห่งพระราชบัญญัติลิขสิทธิ์ พ.ศ. 2537 คลังกฎหมายรวบรวมตัวบทจากชุดข้อมูลเปิดที่อนุญาตให้นำไปใช้ต่อได้ และระบุที่มาของกฎหมายทุกฉบับไว้ในหน้ากฎหมายและด้านหลังป้ายมาตรา</p></div><div class="col" style="gap:8px;margin-top:10px">' +
      [['NitiBench-statute — VISTEC / VISAI', 'ตัวบทฉบับปรับปรุงรายมาตรา (เช่น ประมวลกฎหมายแพ่งและพาณิชย์ ประมวลรัษฎากร)', 'MIT', 'https://huggingface.co/datasets/VISAI-AI/nitibench-statute'], ['OCS Krisdika — Open Law Data Thailand', 'ข้อมูลต้นทางจากสำนักงานคณะกรรมการกฤษฎีกา (รัฐธรรมนูญ ประมวลกฎหมาย พระราชบัญญัติประกอบรัฐธรรมนูญ และอื่น ๆ)', 'CC-BY-4.0', 'https://huggingface.co/datasets/Surathai21/ocs-krisdika'], ['thailaw-v1.0 — PyThaiNLP', 'พระราชบัญญัติ พระราชกำหนด และประกาศคณะปฏิวัติ/คณะรักษาความสงบที่ไม่มีในแหล่งอื่น', 'CC0-1.0', 'https://huggingface.co/datasets/pythainlp/thailaw-v1.0'], ['กรมสนธิสัญญาและกฎหมาย กระทรวงการต่างประเทศ', 'รายชื่ออนุสัญญาและสนธิสัญญา (คำอธิบายภาษาไทยจัดทำโดยคลังกฎหมาย)', 'ข้อมูลสาธารณะของราชการ', 'https://treaties.mfa.go.th'], ['Wikimedia Commons และคลังภาพอื่น', 'ภาพประกอบที่เจ้าของอนุญาต พร้อมเครดิตใต้ภาพ', 'CC0 / CC BY / CC BY-SA / Public domain', 'https://commons.wikimedia.org']].map(function (x) { return '<a class="entry" href="' + x[3] + '" target="_blank" rel="noopener" style="text-decoration:none;color:inherit"><span class="grow"><span class="et">' + esc(x[0]) + ' <span class="tag">' + esc(x[2]) + '</span></span><br><span class="es">' + esc(x[1]) + '</span></span>' + ic('external') + '</a>'; }).join('') +
      '</div><p class="tiny muted" style="margin-top:8px" id="hpImport"></p></section>' +
    '<section class="panel"><div class="panel-title"><span class="ic k">' + ic('mail') + '</span><h3>ติดต่อผู้ดูแลระบบ</h3></div><div class="prose"><p>' + esc(NO_PASS_TEXT) + '</p></div><div class="col" style="margin-top:12px">' + contactCards() + '</div></section>' +
    '<p class="tiny muted" style="text-align:center;margin-top:16px" id="hpVer">THAI LAW LIBRARY เวอร์ชัน ' + esc(APP_VERSION) + '</p>';
  $('#hpBug', el).onclick = function () { reportDialog('แจ้งปัญหาการใช้งาน'); };
  $('#hpLaw', el).onclick = function () { reportDialog('รายงานข้อมูลกฎหมายที่อาจผิดพลาด'); };
  $('#hpPrice', el).onclick = function () { nav('pricing'); };
  api('importStatus', {}).then(function (r) {
    var box = document.getElementById('hpImport'); if (!box || !r.status) return;
    var j = {}; try { j = JSON.parse(r.status.replace(/^\S+\s/, '')); } catch (e) {}
    var n = S.catalog ? S.catalog.laws.length : 0, secs = S.catalog ? S.catalog.laws.reduce(function (a, l) { return a + (l.n || 0); }, 0) : 0;
    box.textContent = 'สถานะฐานข้อมูล: กฎหมาย ' + n.toLocaleString('th-TH') + ' ฉบับ ' + secs.toLocaleString('th-TH') + ' มาตรา' + (j.totalShards ? ' · นำเข้าแล้ว ' + j.shard + '/' + j.totalShards + ' ชุด' + (j.done ? ' (ครบถ้วน)' : ' (กำลังนำเข้าอัตโนมัติ)') : '');
  }).catch(function () {});
  var taps = 0; $('#hpVer', el).onclick = function () { if (++taps >= 5) { taps = 0; openSettings('manage'); setTimeout(function () { var d = document.getElementById('mDebug'); if (d) d.click(); }, 450); } };
};
</script>
