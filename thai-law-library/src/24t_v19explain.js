<script>
/* ==========================================================================
   v19: อธิบายกฎหมายไทย (รายมาตรา ทีละมาตรา)
   ปุ่ม “อธิบายกฎหมายไทย” อยู่หน้าปุ่ม “กฎหมายที่บังคับใช้ทั่วประเทศ”
   เลือกหมวด › เลือกฉบับ › เลือกมาตรา › คำอธิบาย: สรุป วัตถุประสงค์ องค์ประกอบทีละถ้อยคำ คำอธิบายละเอียด
   มาตราที่เกี่ยวข้อง ข้อแตกต่าง ตัวอย่าง และโจทย์ตัวละครสมมุติ (กดปุ่มเพื่อแสดงคำตอบ) ไว้ท้ายสุด
   ========================================================================== */
var EX19_CATS = ['รัฐธรรมนูญ', 'พระราชบัญญัติประกอบรัฐธรรมนูญ', 'พระราชบัญญัติ/พระราชกำหนด', 'ปร./ปว./คปค./คสช.', 'ประมวลกฎหมาย'];
var EX19 = { cache: {} };
function ex19Html(d, s, l, meta) {
  var P = function (t) { return String(t || '').split(/\n+/).filter(Boolean).map(function (x) { return '<p>' + esc(x) + '</p>'; }).join(''); };
  var arr = function (a) { return Array.isArray(a) ? a : (a ? [a] : []); };
  return '<article class="panel ex19">' +
    '<div class="ex19-h"><span class="st-badge">' + ic('book') + ' อธิบายกฎหมายไทย</span><h2>' + esc(lawShort(l)) + ' มาตรา ' + esc(s.no) + '</h2><div class="small muted">' + esc(l.title || '') + '</div></div>' +
    '<section><h3>ตัวบท</h3><div class="ex19-text">' + lawHtml(s.text) + '</div></section>' +
    '<section><h3>สาระสำคัญ</h3>' + P(d.summary) + '</section>' +
    (d.purpose ? '<section><h3>วัตถุประสงค์ของมาตรา</h3>' + P(d.purpose) + '</section>' : '') +
    (arr(d.elements).length ? '<section><h3>องค์ประกอบและถ้อยคำในตัวบท (ทีละส่วน)</h3><ol class="ex19-el">' + arr(d.elements).map(function (e) { return '<li><b>“' + esc(e.term || '') + '”</b>' + P(e.meaning) + '</li>'; }).join('') + '</ol></section>' : '') +
    (arr(d.explanation).length ? '<section><h3>คำอธิบายโดยละเอียด</h3>' + arr(d.explanation).map(P).join('') + '</section>' : '') +
    (arr(d.related).length ? '<section><h3>กฎหมายและมาตราที่เกี่ยวข้อง</h3><ul>' + arr(d.related).map(function (r) { return '<li><b>' + esc(r.ref || '') + '</b> — ' + esc(r.why || '') + '</li>'; }).join('') + '</ul></section>' : '') +
    (d.differences ? '<section><h3>ข้อแตกต่างจากหลักที่คล้ายกัน</h3>' + P(d.differences) + '</section>' : '') +
    (d.example ? '<section><h3>ตัวอย่างการปรับใช้</h3>' + P(d.example) + '</section>' : '') +
    (d.notes ? '<section><h3>ข้อควรระวัง</h3>' + P(d.notes) + '</section>' : '') +
    (d.quiz ? '<section class="ex19-quiz"><h3>' + ic('edit') + ' โจทย์ฝึกวินิจฉัย (ตัวละครสมมุติ)</h3>' + P(d.quiz.scenario) + '<p><b>คำถาม</b> ' + esc(d.quiz.question || '') + '</p>' +
      '<button class="btn k" id="ex19Ans">' + ic('eye') + ' แสดงคำตอบ</button><div class="ex19-ans" hidden><h4>ธงคำตอบ</h4>' + P(d.quiz.answer) + '</div></section>' : '') +
    '<p class="tiny muted ex19-note">คำอธิบายนี้เรียบเรียงโดยระบบจากตัวบทในฐานข้อมูลของเว็บไซต์' + (meta.reviewed ? ' และผู้ดูแลระบบตรวจทานแล้ว' : ' (ยังไม่ได้ตรวจทานโดยผู้เชี่ยวชาญ)') + ' เพื่อการศึกษาเท่านั้น มิใช่คำปรึกษาทางกฎหมาย โปรดตรวจสอบกับตัวบทฉบับทางการ</p></article>';
}
function ex19Render(box) {
  var st = S.ui.content, ex = st.ex19 = st.ex19 || { cat: '', law: '', sec: '', q: '' };
  var head = '<div class="ex19-nav">' + (ex.cat ? '<button class="btn sm ghost" data-ex19back="1">' + ic('arrowL') + ' ย้อนกลับ</button>' : '') + '<b>อธิบายกฎหมายไทย</b>' + (ex.cat ? ' <span class="muted small">› ' + esc(ex.cat) + (ex.law && LAWS[ex.law] ? ' › ' + esc(lawShort(LAWS[ex.law])) : '') + (ex.sec && SECS[ex.sec] ? ' › มาตรา ' + esc(SECS[ex.sec].no) : '') + '</span>' : '') + '</div>';
  if (!ex.cat) {
    box.innerHTML = head + '<div class="panel flat small" style="margin:8px 0 12px">อธิบายทีละมาตรา: องค์ประกอบของตัวบททีละถ้อยคำ วัตถุประสงค์ มาตราที่เกี่ยวข้อง ข้อแตกต่าง ตัวอย่าง และโจทย์ตัวละครสมมุติพร้อมธงคำตอบ</div><div class="ex19-cats">' +
      EX19_CATS.map(function (c) { var n = Object.keys(LAWS).filter(function (k) { return LAWS[k].cat === c; }).length; return '<button class="v18-tile" data-ex19cat="' + esc(c) + '"><span class="mi">' + ic(c === 'ประมวลกฎหมาย' ? 'book' : 'scale') + '</span><span class="grow"><b>' + esc(c) + '</b><br><span class="small muted">' + fmtN(n) + ' ฉบับ</span></span>' + ic('chevR') + '</button>'; }).join('') + '</div>';
    return;
  }
  if (!ex.law) {
    var q = norm(ex.q || ''), ls = Object.keys(LAWS).map(function (k) { return LAWS[k]; }).filter(function (l) { return l.cat === ex.cat && (!q || norm(l.title).indexOf(q) > -1); }).sort(function (a, b) { return String(a.title).localeCompare(String(b.title), 'th'); });
    box.innerHTML = head + '<div class="row v18-q"><div class="input grow">' + ic('search') + '<input id="ex19Q" placeholder="ค้นหาชื่อฉบับ" value="' + esc(ex.q || '') + '"></div><button class="btn" id="ex19QC">' + ic('x') + ' ล้าง</button></div><div class="col">' +
      ls.slice(0, ex.lim || 120).map(function (l) { return '<button class="law-item" data-ex19law="' + esc(l.id) + '"><span class="li-ic">' + ic('book') + '</span><span class="grow"><span class="li-t">' + esc(l.title) + '</span><br><span class="li-s">' + fmtN(l.n || 0) + ' มาตรา</span></span>' + ic('chevR') + '</button>'; }).join('') + '</div>' +
      (ls.length > (ex.lim || 120) ? '<button class="btn block" id="ex19More">แสดงเพิ่มเติม (' + fmtN(ls.length - (ex.lim || 120)) + ')</button>' : '');
    return;
  }
  if (!ex.sec) {
    if (!LAW_LOADED[ex.law]) { box.innerHTML = head + '<div class="skel" style="height:200px"></div>'; ensureLaw(ex.law).then(function () { if (box.isConnected) ex19Render(box); }); return; }
    var qs = ex.q || '', secs = (SECS_BY_LAW[ex.law] || []).slice().sort(secCmp).filter(function (s) { return !qs || String(s.no) === qs.replace(/^มาตรา\s*/, '') || norm(s.text || '').indexOf(norm(qs)) > -1; });
    box.innerHTML = head + '<div class="row v18-q"><div class="input grow">' + ic('search') + '<input id="ex19Q" placeholder="เลขมาตราหรือคำในตัวบท" value="' + esc(qs) + '"></div><button class="btn" id="ex19QC">' + ic('x') + ' ล้าง</button></div><div class="col">' +
      secs.slice(0, ex.lim || 120).map(function (s) { return '<button class="law-item" data-ex19sec="' + esc(s.id) + '"><span class="li-ic">' + ic('file') + '</span><span class="grow"><span class="li-t">มาตรา ' + esc(s.no) + '</span><br><span class="li-s">' + esc(String(s.text || '').slice(0, 110)) + '…</span></span>' + ic('chevR') + '</button>'; }).join('') + '</div>' +
      (secs.length > (ex.lim || 120) ? '<button class="btn block" id="ex19More">แสดงเพิ่มเติม (' + fmtN(secs.length - (ex.lim || 120)) + ')</button>' : '');
    return;
  }
  var s = SECS[ex.sec], l = LAWS[ex.law] || {};
  if (!s) { ex.sec = ''; return ex19Render(box); }
  var all = (SECS_BY_LAW[ex.law] || []).slice().sort(secCmp), k = all.indexOf(s);
  var pager = '<div class="row ex19-pg">' + (k > 0 ? '<button class="btn sm" data-ex19sec="' + esc(all[k - 1].id) + '">' + ic('arrowL') + ' มาตรา ' + esc(all[k - 1].no) + '</button>' : '<span></span>') + (k < all.length - 1 ? '<button class="btn sm" data-ex19sec="' + esc(all[k + 1].id) + '">มาตรา ' + esc(all[k + 1].no) + ' ' + ic('arrowR') + '</button>' : '') + '</div>';
  var show = function (r) { box.innerHTML = head + pager + ex19Html(r.explain, s, l, r) + pager; };
  if (EX19.cache[ex.sec]) return show(EX19.cache[ex.sec]);
  box.innerHTML = head + pager + '<div class="panel"><div class="ex19-wait"><span class="typing"><i></i><i></i><i></i></span> กำลังเตรียมคำอธิบายมาตรา ' + esc(s.no) + ' (ครั้งแรกอาจใช้เวลาประมาณ 20–40 วินาที ครั้งต่อไปเปิดได้ทันที)</div></div>';
  var want = ex.sec;
  api('lawExplain', { secId: want, lawTitle: l.title || '', cat: l.cat || '' }, { timeout: 120000, noRetry: true }).then(function (r) {
    EX19.cache[want] = r; if (box.isConnected && S.ui.content.ex19 && S.ui.content.ex19.sec === want) show(r);
  }).catch(function (e) {
    if (!box.isConnected) return;
    box.innerHTML = head + pager + '<div class="panel"><div class="empty warn"><div class="eic">' + ic('alert') + '</div><h3>ยังแสดงคำอธิบายไม่ได้</h3><p>' + esc((e && e.msg) || 'กรุณาลองอีกครั้ง') + '</p><button class="btn k" id="ex19Retry">' + ic('refresh') + ' ลองอีกครั้ง</button></div></div>';
  });
}
(function () {
  var base = VIEWS.content;
  VIEWS.content = function (el) {
    base.apply(this, arguments);
    var st = S.ui.content || {}, chips = $('#catChips', el); if (!chips) return;
    var nat = $('[data-nat]', chips);
    if (!$('[data-ex19]', chips)) {
      var b = h('<button class="chip" data-ex19="1" role="tab">' + ic('book') + 'อธิบายกฎหมายไทย</button>');
      if (nat) chips.insertBefore(b, nat); else chips.appendChild(b);
    }
    var bx = $('[data-ex19]', chips);
    bx.onclick = function () { $$('#catChips .chip', el).forEach(function (c) { c.classList.toggle('on', c === bx); }); st.cat = 'EX19'; st.scope = 'th'; st.foreign = false; st.law = ''; store.set('ui', S.ui); ex19Render($('#ctBody', el)); };
    on(chips, 'click', '[data-cat],[data-nat]', function () { bx.classList.remove('on'); });
    if (!st.foreign && !st.law && st.cat === 'EX19') { bx.classList.add('on'); ex19Render($('#ctBody', el)); }
    var body = $('#ctBody', el);
    if (body && !body.__ex19) {
      body.__ex19 = 1;
      body.addEventListener('click', function (e) {
        if (S.ui.content.cat !== 'EX19') return;
        var t = e.target.closest('[data-ex19cat],[data-ex19law],[data-ex19sec],[data-ex19back],#ex19QC,#ex19More,#ex19Ans,#ex19Retry'); if (!t) return;
        var ex = S.ui.content.ex19;
        if (t.id === 'ex19Ans') { var a = body.querySelector('.ex19-ans'); a.hidden = !a.hidden; t.innerHTML = ic(a.hidden ? 'eye' : 'eyeOff') + (a.hidden ? ' แสดงคำตอบ' : ' ซ่อนคำตอบ'); return; }
        if (t.hasAttribute('data-ex19cat')) { ex.cat = t.getAttribute('data-ex19cat'); ex.law = ''; ex.sec = ''; ex.q = ''; ex.lim = 0; }
        else if (t.hasAttribute('data-ex19law')) { ex.law = t.getAttribute('data-ex19law'); ex.sec = ''; ex.q = ''; ex.lim = 0; }
        else if (t.hasAttribute('data-ex19sec')) { ex.sec = t.getAttribute('data-ex19sec'); }
        else if (t.hasAttribute('data-ex19back')) { if (ex.sec) ex.sec = ''; else if (ex.law) { ex.law = ''; ex.q = ''; } else { ex.cat = ''; ex.q = ''; } ex.lim = 0; }
        else if (t.id === 'ex19QC') { ex.q = ''; }
        else if (t.id === 'ex19More') { ex.lim = (ex.lim || 120) + 200; }
        else if (t.id === 'ex19Retry') { delete EX19.cache[ex.sec]; }
        store.set('ui', S.ui); ex19Render(body); window.scrollTo({ top: Math.max(0, body.getBoundingClientRect().top + window.scrollY - 90), behavior: 'instant' });
      });
      body.addEventListener('input', debounce(function (e) { if (S.ui.content.cat !== 'EX19' || !e.target || e.target.id !== 'ex19Q') return; var pos = e.target.selectionStart; S.ui.content.ex19.q = e.target.value.trim(); store.set('ui', S.ui); ex19Render(body); var n = document.getElementById('ex19Q'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) {} } }, 350));
    }
  };
})();
</script>
