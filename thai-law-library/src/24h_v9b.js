<script>
/* =========================================================================
 *  VERSION 9 (หน้าเว็บ ส่วนที่ 2) — คำพิพากษาศาลฎีกา / อนุสัญญาและสนธิสัญญาทั่วโลก / เครื่องมือ / สไลด์แนะนำเว็บไซต์
 * ========================================================================= */

/* ---------------- คำพิพากษาศาลฎีกา: ปุ่มรีเฟรชจำนวน + ค้นหาคำสำคัญ (ดัชนีของเว็บไซต์) + ระบุเลขซ้ำ/คดีเชื่อมโยง ---------------- */
function dekaPrep() {
  if (!DEKA || DEKA._prep) return;
  DEKA._prep = 1; DEKA.byO = {}; DEKA.byDoc = {}; DEKA.dup = {};
  DEKA.recs.forEach(function (r) { DEKA.byO[r[5]] = r; DEKA.byDoc[String(r[0])] = r; var k = String(r[1]); DEKA.dup[k] = (DEKA.dup[k] || 0) + 1; });
}
function dekaDupNote(r) { var n = DEKA.dup[String(r[1])] || 1; return n > 1 ? '<span class="st-badge obs" title="มีเอกสารหลายฉบับใช้เลขเดียวกัน">เลขเดียวกัน ' + n + ' ฉบับ</span>' : ''; }
(function () {
  var baseDeka = VIEWS.deka;
  VIEWS.deka = function (el) {
    baseDeka(el);
    var st = S.ui.dk, head = $('.view-head', el), res = $('#dkRes', el);
    if (head && !$('#dkRef', el)) head.insertAdjacentHTML('beforeend', '<button class="icon-btn sync-btn" id="dkRef" aria-label="ตรวจจำนวนคำพิพากษาล่าสุด" title="ตรวจจำนวนคำพิพากษาล่าสุดจากแหล่งข้อมูล">' + ic('refresh') + '</button>');
    $('#dkRef', el).onclick = function () {
      var b = this; b.classList.add('spin-on');
      api('dekaRefresh', {}, { timeout: 40000 }).then(function (r) {
        b.classList.remove('spin-on');
        var sub = $('#dkSub', el); if (!sub) return;
        sub.innerHTML = 'ฐานข้อมูลคำพิพากษาและคำสั่งศาลฎีกาในเว็บไซต์ <b>' + fmtN(r.total) + '</b> ฉบับ · ตรวจกับแหล่งข้อมูลเมื่อ ' + esc(fmtDateTime(r.checked)) + (r.live ? ' · แหล่งข้อมูลมี ' + fmtN(r.live) + ' ฉบับ' + (r.newer ? ' (ใหม่ ' + fmtN(r.newer) + ' ฉบับ — นำเข้าในการปรับปรุงฐานข้อมูลรอบถัดไป)' : ' (ข้อมูลเป็นปัจจุบัน)') : ' · ยังเชื่อมต่อแหล่งข้อมูลไม่ได้ในขณะนี้ แสดงจำนวนล่าสุดในฐานข้อมูล');
        toast('ตรวจสอบจำนวนคำพิพากษาแล้ว', fmtN(r.total) + ' ฉบับ', 'ok');
      }).catch(function () { b.classList.remove('spin-on'); toast('ยังตรวจสอบไม่สำเร็จ', 'กรุณาลองใหม่อีกครั้ง', 'warn'); });
    };
    var list = [], shown = 0, info = null;
    function lawsOf(r) { return (r[6] || []).map(function (x) { return DEKA.laws[x[0]][0] + ' ม. ' + x[1] + (x[2] ? ' วรรค' + x[2] : '') + (x[3] ? ' ' + x[3] : ''); }); }
    function draw(reset) {
      if (reset) { shown = 0; res.innerHTML = ''; }
      if (!list.length) { res.innerHTML = '<div class="panel"><div class="empty"><div class="eic">' + ic('search') + '</div><h3>ไม่พบคำพิพากษาตามคำสำคัญ</h3><p>ลองใช้คำที่สั้นลงหรือคำอื่นที่มีความหมายใกล้เคียง เช่น “ฉ้อฉล” “ฉ้อโกง” หรือแยกคำด้วยการเว้นวรรค</p></div></div>'; return; }
      var next = list.slice(shown, shown + 30); shown += next.length;
      var mb = $('#dkMore9', res); if (mb) mb.remove();
      res.insertAdjacentHTML('beforeend', (shown === next.length ? '<div class="group-h">ผลการค้นหาคำสำคัญ <span class="cnt">' + fmtN(list.length) + ' ฉบับ</span></div>' + (info ? '<p class="tiny muted" style="margin:-4px 0 8px">ค้นด้วยคำ: ' + info.terms.map(function (g) { return esc(g.join(' / ')); }).join(' + ') + (info.exact ? '' : ' — ไม่พบฉบับที่มีครบทุกคำ จึงแสดงฉบับที่มีบางคำ (ใกล้เคียง)') + '</p>' : '') : '') + next.map(function (r) {
        var ls = lawsOf(r);
        return '<button class="law-item" data-dk="' + r[0] + '" data-o="' + r[5] + '"><span class="li-ic">' + ic('gavel') + '</span><span class="grow"><span class="li-t">' + esc((DEKA.types[r[3]] || 'คำพิพากษาศาลฎีกา') + 'ที่ ' + r[1]) + '</span> ' + dekaDupNote(r) + '<br><span class="li-s">' + esc((r[4] === 'พ' ? 'คดีแพ่ง' : r[4] === 'อ' ? 'คดีอาญา' : 'อื่น ๆ') + ' · พ.ศ. ' + r[2] + (ls.length ? ' · ' + ls.slice(0, 4).join(', ') : '')) + '</span></span>' + ic('chevR') + '</button>';
      }).join('') + (shown < list.length ? '<button class="btn block" id="dkMore9" style="margin-top:10px">แสดงเพิ่มเติม (' + fmtN(list.length - shown) + ')</button>' : ''));
      var m2 = $('#dkMore9', res); if (m2) m2.onclick = function () { draw(false); };
    }
    function kwRun() {
      st.no = $('#dkNo', el).value.trim(); st.year = $('#dkYear', el).value.trim(); st.cat = $('#dkCat', el).value; st.type = $('#dkType', el).value; st.law = $('#dkLaw', el).value.trim(); st.sec = $('#dkSec', el).value.trim(); st.q = $('#dkQ', el).value.trim(); store.set('ui', S.ui);
      res.innerHTML = '<div class="skeleton" style="height:70px"></div>';
      Promise.all([loadDeka(), api('dekaKeyword', { q: st.q }, { timeout: 60000 })]).then(function (rs) {
        dekaPrep(); info = rs[1];
        var no = ard(st.no).replace(/\D/g, ''), yr = ard(st.year).replace(/\D/g, ''), lw = norm(st.law), sec = ard(st.sec).replace(/\s+/g, ' '), lawIdx = null;
        if (lw) { lawIdx = {}; DEKA.laws.forEach(function (x, i) { if (norm(x[0]).indexOf(lw) > -1 || norm(x[1]).indexOf(lw) > -1) lawIdx[i] = 1; }); }
        list = (info.rows || []).map(function (o) { return DEKA.byO[o]; }).filter(function (r) {
          if (!r) return false;
          if (no && String(r[1]).indexOf(no + '/') !== 0) return false;
          if (yr && String(r[2]) !== yr) return false;
          if (st.cat && r[4] !== st.cat) return false;
          if (st.type !== '' && String(r[3]) !== st.type) return false;
          if (lawIdx || sec) { if (!(r[6] || []).some(function (x) { return (!lawIdx || lawIdx[x[0]]) && (!sec || ard(x[1]) === sec); })) return false; }
          return true;
        });
        draw(true);
      }).catch(function (e) { res.innerHTML = '<div class="panel"><div class="empty warn"><div class="eic">' + ic('wifiOff') + '</div><h3>ยังค้นหาไม่สำเร็จ</h3><p>' + esc((e && e.msg) || 'กรุณาลองใหม่อีกครั้ง') + '</p></div></div>'; });
    }
    el.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#dkGo') && $('#dkQ', el).value.trim().length >= 2) { e.stopPropagation(); e.preventDefault(); kwRun(); } }, true);
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.closest && e.target.closest('.dk-form') && $('#dkQ', el).value.trim().length >= 2) { e.stopPropagation(); e.preventDefault(); kwRun(); } }, true);
    var q = $('#dkQ', el); if (q) q.placeholder = 'เช่น ฉ้อฉล, ลักทรัพย์ กลางคืน, ครอบครองปรปักษ์ (เว้นวรรคเพื่อค้นหลายคำ)';
    if (st && st.q && st.q.length >= 2) kwRun();
  };
  var baseOpen = openDeka;
  openDeka = function (docid, o) {
    baseOpen(docid, o);
    loadDeka().then(function () {
      dekaPrep(); var r = DEKA.byDoc[String(docid)] || DEKA.byO[o]; if (!r) return;
      var sib = DEKA.recs.filter(function (x) { return String(x[1]) === String(r[1]) && String(x[0]) !== String(r[0]); });
      if (!sib.length) return;
      var tries = 0, t = setInterval(function () {
        var body = DK_EL && $('#dkBody', DK_EL); tries++;
        if (!body || tries > 60) { clearInterval(t); return; }
        if (!body.querySelector('.fv-meta') || body.querySelector('.dk-dup')) return;
        clearInterval(t);
        body.querySelector('.fv-meta').insertAdjacentHTML('afterend', '<div class="panel flat dk-dup"><div class="small"><b>เลขคำพิพากษาเดียวกัน ' + (sib.length + 1) + ' ฉบับ</b> — เอกสารเหล่านี้ใช้เลข ' + esc(r[1]) + ' ร่วมกัน อาจเป็นคำพิพากษาและคำสั่งในคดีเดียวกัน หรือเอกสารที่แหล่งข้อมูลบันทึกซ้ำ โปรดเปิดดูเพื่อเปรียบเทียบ</div><div class="dk-laws">' + sib.map(function (x) { return '<button class="chip" data-dk2="' + x[0] + '" data-o2="' + x[5] + '">' + esc((DEKA.types[x[3]] || 'คำพิพากษา') + ' · พ.ศ. ' + x[2]) + '</button>'; }).join('') + '</div></div>');
        on(body, 'click', '[data-dk2]', function (e, b) { openDeka(b.getAttribute('data-dk2'), b.getAttribute('data-o2')); });
      }, 250);
    });
  };
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-dkp]')) PRINT_SRC = 'ศาลฎีกา (deka.supremecourt.or.th) ผ่านชุดข้อมูลเปิด korakot/deka-bulk'; }, true);
})();

/* ---------------- อนุสัญญาและสนธิสัญญาทั่วโลก (ตัวเลือกเดียว) — ทวีป/อาเซียน › ประเทศ › ประเภท › สถานะ ---------------- */
var TW9 = null;
var TW_TYPE = { t: 'สนธิสัญญา', c: 'อนุสัญญา', o: 'อื่น ๆ ที่เกี่ยวข้อง' };
var TW_OTHER_NOTE = '“อื่น ๆ ที่เกี่ยวข้อง” หมายถึงเอกสารระหว่างประเทศที่ไม่ได้ใช้ชื่อว่าสนธิสัญญาหรืออนุสัญญา เช่น ความตกลง (Agreement) พิธีสาร (Protocol) กฎบัตร (Charter) กติการะหว่างประเทศ (Covenant) ปฏิญญา (Declaration) บันทึกความเข้าใจ (MoU) และการแลกเปลี่ยนหนังสือ ซึ่งมีผลผูกพันหรือเกี่ยวข้องกับรัฐภาคีตามเงื่อนไขของแต่ละฉบับ';
VIEWS.treaties = function (el) {
  var st = S.ui.tw9 || (S.ui.tw9 = { g: '', cc: '', type: '', stat: '', q: '' });
  el.innerHTML = '<div class="view-head"><div><h2>อนุสัญญาและสนธิสัญญาทั่วโลก</h2><p class="sub" id="twSub">แยกตามประชาคมอาเซียนและทวีป › ประเทศ › ประเภท › สถานะ</p></div><button class="btn sm" id="twClear">' + ic('x') + ' ล้าง</button></div><div id="twBox9"><div class="skeleton" style="height:120px"></div></div>';
  var box = $('#twBox9', el);
  $('#twClear', el).onclick = function () { S.ui.tw9 = { g: '', cc: '', type: '', stat: '', q: '' }; store.set('ui', S.ui); VIEWS.treaties(el); };
  Promise.all([loadWorld(), TW9 ? Promise.resolve(TW9) : api('treatyCountries9', {}, { timeout: 60000 }).then(function (r) { TW9 = r; return r; })]).then(function (rs) {
    if (!box.isConnected) return;
    var w = rs[0], tw = rs[1], counts = tw.counts || {};
    var all = [{ cc: 'TH', th: 'ไทย', en: 'Thailand', cont: 'AS', asean: true, un: 'member' }].concat(w.countries);
    $('#twSub', el).textContent = 'ข้อมูลจาก Wikidata (CC0) ณ ' + String(tw.built || '').slice(0, 10) + ' · ' + fmtN(tw.total) + ' ฉบับ · ' + all.length + ' ประเทศ';
    var save = function () { store.set('ui', S.ui); };
    if (st.cc) return twCountry(box, all.filter(function (c) { return c.cc === st.cc; })[0] || { cc: st.cc, th: st.cc }, tw, st, save, function () { st.cc = ''; st.type = ''; st.stat = ''; st.q = ''; save(); VIEWS.treaties(el); });
    if (st.g) {
      var list = (st.g === 'ASEAN' ? all.filter(function (c) { return c.asean; }) : all.filter(function (c) { return c.cont === st.g && !c.asean; })).sort(function (a, b) { return (counts[b.cc] || 0) - (counts[a.cc] || 0) || a.th.localeCompare(b.th, 'th'); });
      box.innerHTML = '<div class="row" style="gap:10px;margin-bottom:10px"><button class="icon-btn" id="twBack" aria-label="กลับ">' + ic('arrowL') + '</button><b class="grow">' + esc(st.g === 'ASEAN' ? 'ประชาคมอาเซียน (ASEAN)' : CONT_TH[st.g]) + ' · ' + list.length + ' ประเทศ</b></div><div class="fgn-grid anim-list">' + list.map(function (c) {
        return '<button class="fgn-card" data-tw9c="' + esc(c.cc) + '"><span class="fgn-code">' + esc(c.cc) + '</span><span class="grow"><b>' + esc(c.th) + '</b> <span class="muted small">' + esc(c.en || '') + '</span><br><span class="small ' + (counts[c.cc] ? 'ok-t' : 'muted') + '">' + (counts[c.cc] ? fmtN(counts[c.cc]) + ' ฉบับ' : 'ยังไม่พบข้อมูลในแหล่งข้อมูล') + '</span></span>' + ic('chevR') + '</button>';
      }).join('') + '</div>';
      $('#twBack', box).onclick = function () { st.g = ''; save(); VIEWS.treaties(el); };
      on(box, 'click', '[data-tw9c]', function (e, b) { st.cc = b.getAttribute('data-tw9c'); st.type = ''; st.stat = ''; st.q = ''; save(); VIEWS.treaties(el); });
      return;
    }
    var groups = [['ASEAN', 'ประชาคมอาเซียน (ASEAN)']].concat(CONT_ORDER.map(function (k) { return [k, CONT_TH[k]]; }));
    box.innerHTML = '<div class="fgn-grid anim-list">' + groups.map(function (g) {
      var cs = g[0] === 'ASEAN' ? all.filter(function (c) { return c.asean; }) : all.filter(function (c) { return c.cont === g[0] && !c.asean; });
      return '<button class="fgn-card" data-twg9="' + g[0] + '"><span class="fgn-code">' + (g[0] === 'ASEAN' ? ic('globe') : g[0]) + '</span><span class="grow"><b>' + esc(g[1]) + '</b><br><span class="small muted">' + cs.length + ' ประเทศ · มีข้อมูล ' + cs.filter(function (c) { return counts[c.cc]; }).length + ' ประเทศ</span></span>' + ic('chevR') + '</button>';
    }).join('') + '</div><p class="tiny muted" style="margin-top:10px">' + esc(TW_OTHER_NOTE) + '</p>';
    on(box, 'click', '[data-twg9]', function (e, b) { st.g = b.getAttribute('data-twg9'); save(); VIEWS.treaties(el); });
  }).catch(function (e) { box.innerHTML = '<div class="panel"><div class="empty warn"><div class="eic">' + ic('wifiOff') + '</div><h3>ยังโหลดข้อมูลไม่สำเร็จ</h3><p>' + esc((e && e.msg) || 'กรุณาลองใหม่อีกครั้ง') + '</p></div></div>'; });
};
function twCountry(box, c, tw, st, save, back) {
  box.innerHTML = '<section class="panel corner" style="margin-bottom:12px"><div class="row" style="gap:10px;align-items:flex-start"><button class="icon-btn" id="twBack" aria-label="กลับ">' + ic('arrowL') + '</button><div class="grow">' + flagImg(c.cc, 'sm') + ' <b style="font-size:1.1rem">' + esc(c.th) + '</b> <span class="muted small">' + esc(c.en || '') + '</span><div class="tiny muted" id="twMeta"></div></div></div><div id="twCtl"></div></section><div id="twList"><div class="skeleton" style="height:90px"></div></div>';
  $('#twBack', box).onclick = back;
  api('treatiesOf9', { cc: c.cc }, { timeout: 60000 }).then(function (r) {
    var items = r.items || [], ended = function (x) { return !!x.ended; };
    var byT = { '': items }; ['t', 'c', 'o'].forEach(function (k) { byT[k] = items.filter(function (x) { return x.type === k; }); });
    function ctl() {
      var base = byT[st.type || ''] || items, nE = base.filter(ended).length;
      $('#twCtl', box).innerHTML = '<div class="hscroll sub9" id="twTypes" style="margin-top:10px"><button class="chip ' + (!st.type ? 'on' : '') + '" data-tt="">ทั้งหมด <span class="cnt">' + fmtN(items.length) + '</span></button>' + ['t', 'c', 'o'].map(function (k) { return '<button class="chip ' + (st.type === k ? 'on' : '') + '" data-tt="' + k + '">' + TW_TYPE[k] + ' <span class="cnt">' + fmtN(byT[k].length) + '</span></button>'; }).join('') + '</div>' +
        (st.type === 'o' ? '<p class="tiny muted" style="margin:6px 2px 0">' + esc(TW_OTHER_NOTE) + '</p>' : '') +
        '<div class="seg stat9" id="twStat"><button data-s="" class="' + (!st.stat ? 'on' : '') + '">ทั้งหมด <span class="cnt">' + fmtN(base.length) + '</span></button><button data-s="in" class="' + (st.stat === 'in' ? 'on' : '') + '">มีผลบังคับใช้อยู่ <span class="cnt">' + fmtN(base.length - nE) + '</span></button><button data-s="rep" class="' + (st.stat === 'rep' ? 'on' : '') + '">สิ้นผล/ยกเลิกแล้ว <span class="cnt">' + fmtN(nE) + '</span></button></div>' +
        '<div class="row wrapr" style="gap:8px;margin-top:10px"><div class="input" style="flex:1 1 220px">' + ic('search') + '<input id="twQ" placeholder="ค้นหาชื่ออนุสัญญา/สนธิสัญญา" value="' + esc(st.q || '') + '"></div><div class="tr-bar slim"><select id="twLang" aria-label="ภาษาที่จะแปลชื่อ">' + TR_LIST.map(function (x) { return '<option value="' + x[0] + '">' + esc(x[1]) + '</option>'; }).join('') + '</select><button class="btn sm k" id="twTr">แปลภาษา</button><button class="btn sm" id="twTrOff" disabled>ยกเลิกแปลภาษา</button></div></div>';
      on($('#twTypes', box), 'click', '[data-tt]', function (e, b) { st.type = b.getAttribute('data-tt'); st.stat = ''; save(); ctl(); draw(true); });
      on($('#twStat', box), 'click', '[data-s]', function (e, b) { st.stat = b.getAttribute('data-s'); save(); ctl(); draw(true); });
      $('#twQ', box).addEventListener('input', debounce(function () { st.q = this.value.trim(); save(); draw(true); }, 220));
      $('#twTr', box).onclick = function () { trTitles($('#twLang', box).value); };
      $('#twTrOff', box).onclick = function () { $$('.tw-tr', box).forEach(function (x) { x.remove(); }); this.disabled = true; };
    }
    var list = [], shown = 0;
    $('#twMeta', box).textContent = fmtN(items.length) + ' ฉบับที่ประเทศนี้เป็นภาคีหรือลงนาม · ที่มา: ' + (r.source || 'Wikidata');
    function draw(reset) {
      var q = norm(st.q || ''), base = byT[st.type || ''] || items;
      list = base.filter(function (x) { if (st.stat === 'in' && ended(x)) return false; if (st.stat === 'rep' && !ended(x)) return false; return !q || norm((x.th || '') + ' ' + (x.en || '')).indexOf(q) > -1; });
      var L = $('#twList', box); if (reset) { shown = 0; L.innerHTML = ''; }
      if (!list.length) { L.innerHTML = '<div class="panel"><div class="empty"><div class="eic">' + ic('search') + '</div><h3>' + (items.length ? 'ไม่พบรายการตามเงื่อนไข' : 'ยังไม่พบข้อมูลอนุสัญญา/สนธิสัญญาของประเทศนี้ในแหล่งข้อมูล') + '</h3></div></div>'; return; }
      var next = list.slice(shown, shown + 50); shown += next.length;
      var mb = $('#twMore', L); if (mb) mb.remove();
      L.insertAdjacentHTML('beforeend', next.map(function (x) {
        return '<div class="law-item tw-item" data-twid="' + esc(x.id) + '"><span class="li-ic">' + ic('globe') + '</span><span class="grow"><span class="li-t">' + esc(x.th || x.en) + '</span> ' + (ended(x) ? '<span class="st-badge bad">สิ้นผล/ยกเลิกแล้ว</span>' : '<span class="st-badge ok">มีผลบังคับใช้</span>') + (x.th && x.en ? '<br><span class="small muted">' + esc(x.en) + '</span>' : '') + '<br><span class="li-s">' + esc(TW_TYPE[x.type] + (x.cls ? ' (' + x.cls + ')' : '') + (x.date ? ' · ' + String(x.date).slice(0, 4).replace(/^(\d{4})$/, function (m) { return 'ค.ศ. ' + m + ' / พ.ศ. ' + (+m + 543); }) : '') + (x.n ? ' · ภาคี/ผู้ลงนาม ' + x.n + ' ประเทศ' : '')) + ' · <a href="https://www.wikidata.org/wiki/' + esc(x.id) + '" target="_blank" rel="noopener">แหล่งข้อมูล</a></span></span></div>';
      }).join('') + (shown < list.length ? '<button class="btn block" id="twMore" style="margin-top:10px">แสดงเพิ่มเติม (' + fmtN(list.length - shown) + ')</button>' : ''));
      var m2 = $('#twMore', L); if (m2) m2.onclick = function () { draw(false); };
    }
    function trTitles(lang) {
      var nodes = $$('.tw-item', box).filter(function (n) { return !n.querySelector('.tw-tr[data-l="' + lang + '"]'); }).slice(0, 50);
      if (!nodes.length) return;
      var texts = nodes.map(function (n) { var x = items.filter(function (y) { return y.id === n.getAttribute('data-twid'); })[0]; return x ? (x.en || x.th) : ''; });
      $('#twTr', box).disabled = true;
      api('translate', { to: lang, texts: texts }, { timeout: 90000 }).then(function (r) {
        $('#twTr', box).disabled = false; $('#twTrOff', box).disabled = false;
        nodes.forEach(function (n, i) { $$('.tw-tr', n).forEach(function (x) { x.remove(); }); if (r.texts[i]) n.querySelector('.grow').insertAdjacentHTML('beforeend', '<div class="tw-tr small" data-l="' + lang + '">' + ic('globe') + ' ' + esc(r.texts[i]) + '</div>'); });
      }).catch(function () { $('#twTr', box).disabled = false; toast('แปลไม่สำเร็จ', 'กรุณาลองใหม่อีกครั้ง', 'warn'); });
    }
    ctl(); draw(true);
  }).catch(function (e) { $('#twList', box).innerHTML = '<div class="panel"><div class="empty warn"><div class="eic">' + ic('wifiOff') + '</div><h3>ยังโหลดข้อมูลไม่สำเร็จ</h3><p>' + esc((e && e.msg) || '') + '</p></div></div>'; });
}

/* ---------------- เครื่องมือ: พจนานุกรม (ฉบับภาษาไทย) / รวมคำย่อ / คำนวณวันและระยะเวลา / คำนวณกำหนดเวลาทางกฎหมาย / ลำดับขั้นตอนทางกฎหมาย ---------------- */
var ABBR9 = {
  'กฎหมายและเอกสารทางกฎหมาย': [['รธน.', 'รัฐธรรมนูญ'], ['พ.ร.บ.', 'พระราชบัญญัติ'], ['พ.ร.ป.', 'พระราชบัญญัติประกอบรัฐธรรมนูญ'], ['พ.ร.ก.', 'พระราชกำหนด'], ['พ.ร.ฎ.', 'พระราชกฤษฎีกา'], ['ป.รษ.', 'ประมวลรัษฎากร'], ['ปว.', 'ประกาศของคณะปฏิวัติ'], ['ปร.', 'ประกาศคณะปฏิรูปการปกครองแผ่นดิน'], ['คปค.', 'คณะปฏิรูปการปกครองในระบอบประชาธิปไตยอันมีพระมหากษัตริย์ทรงเป็นประมุข'], ['คมช.', 'คณะมนตรีความมั่นคงแห่งชาติ'], ['คสช.', 'คณะรักษาความสงบแห่งชาติ'], ['รสช.', 'คณะรักษาความสงบเรียบร้อยแห่งชาติ'], ['ม.', 'มาตรา (ในบริบทกฎหมาย) / หมู่ที่ (ในที่อยู่)'], ['ฎ.', 'คำพิพากษาศาลฎีกา']],
  'หน่วยงานของรัฐ': [['ครม.', 'คณะรัฐมนตรี'], ['สคก.', 'สำนักงานคณะกรรมการกฤษฎีกา'], ['อสส.', 'อัยการสูงสุด / สำนักงานอัยการสูงสุด'], ['ตร.', 'ตำรวจ / สำนักงานตำรวจแห่งชาติ'], ['สตช.', 'สำนักงานตำรวจแห่งชาติ'], ['ป.ป.ช.', 'คณะกรรมการป้องกันและปราบปรามการทุจริตแห่งชาติ'], ['ป.ป.ท.', 'คณะกรรมการป้องกันและปราบปรามการทุจริตในภาครัฐ'], ['ป.ป.ส.', 'สำนักงานคณะกรรมการป้องกันและปราบปรามยาเสพติด'], ['ปปง.', 'สำนักงานป้องกันและปราบปรามการฟอกเงิน'], ['กกต.', 'คณะกรรมการการเลือกตั้ง'], ['สตง.', 'สำนักงานการตรวจเงินแผ่นดิน'], ['ก.พ.', 'คณะกรรมการข้าราชการพลเรือน'], ['ก.ต.', 'คณะกรรมการตุลาการศาลยุติธรรม'], ['ก.อ.', 'คณะกรรมการอัยการ'], ['ธปท.', 'ธนาคารแห่งประเทศไทย'], ['ก.ล.ต.', 'สำนักงานคณะกรรมการกำกับหลักทรัพย์และตลาดหลักทรัพย์'], ['สคบ.', 'สำนักงานคณะกรรมการคุ้มครองผู้บริโภค'], ['สปสช.', 'สำนักงานหลักประกันสุขภาพแห่งชาติ'], ['กทม.', 'กรุงเทพมหานคร'], ['อบจ.', 'องค์การบริหารส่วนจังหวัด'], ['อบต.', 'องค์การบริหารส่วนตำบล'], ['ส.ส.', 'สมาชิกสภาผู้แทนราษฎร'], ['ส.ว.', 'สมาชิกวุฒิสภา'], ['สนช.', 'สภานิติบัญญัติแห่งชาติ'], ['ศอ.บต.', 'ศูนย์อำนวยการบริหารจังหวัดชายแดนภาคใต้']],
  'คำย่อในหนังสือราชการและที่อยู่': [['พ.ศ.', 'พุทธศักราช'], ['ค.ศ.', 'คริสต์ศักราช'], ['ร.ศ.', 'รัตนโกสินทรศก'], ['จ.ศ.', 'จุลศักราช'], ['ม.ศ.', 'มหาศักราช'], ['ฯ', 'ไปยาลน้อย (ละคำที่รู้กันทั่วไป)'], ['ฯลฯ', 'ไปยาลใหญ่ (และอื่น ๆ)'], ['น.', 'นาฬิกา'], ['จ.', 'จังหวัด'], ['อ.', 'อำเภอ'], ['ต.', 'ตำบล'], ['ถ.', 'ถนน'], ['ซ.', 'ซอย'], ['กม.', 'กิโลเมตร'], ['ตร.ม.', 'ตารางเมตร'], ['ตร.ว.', 'ตารางวา'], ['ม.ป.ป.', 'ไม่ปรากฏปีที่พิมพ์']],
  'ยศทหารบก': [['พล.อ.', 'พลเอก'], ['พล.ท.', 'พลโท'], ['พล.ต.', 'พลตรี'], ['พ.อ.', 'พันเอก'], ['พ.ท.', 'พันโท'], ['พ.ต.', 'พันตรี'], ['ร.อ.', 'ร้อยเอก'], ['ร.ท.', 'ร้อยโท'], ['ร.ต.', 'ร้อยตรี'], ['จ.ส.อ.', 'จ่าสิบเอก'], ['จ.ส.ท.', 'จ่าสิบโท'], ['จ.ส.ต.', 'จ่าสิบตรี'], ['ส.อ.', 'สิบเอก'], ['ส.ท.', 'สิบโท'], ['ส.ต.', 'สิบตรี'], ['พลฯ', 'พลทหาร']],
  'ยศทหารเรือ': [['พล.ร.อ.', 'พลเรือเอก'], ['พล.ร.ท.', 'พลเรือโท'], ['พล.ร.ต.', 'พลเรือตรี'], ['น.อ.', 'นาวาเอก'], ['น.ท.', 'นาวาโท'], ['น.ต.', 'นาวาตรี'], ['ร.อ. … ร.น.', 'เรือเอก'], ['ร.ท. … ร.น.', 'เรือโท'], ['ร.ต. … ร.น.', 'เรือตรี'], ['พ.จ.อ.', 'พันจ่าเอก'], ['พ.จ.ท.', 'พันจ่าโท'], ['พ.จ.ต.', 'พันจ่าตรี'], ['จ.อ.', 'จ่าเอก'], ['จ.ท.', 'จ่าโท'], ['จ.ต.', 'จ่าตรี']],
  'ยศทหารอากาศ': [['พล.อ.อ.', 'พลอากาศเอก'], ['พล.อ.ท.', 'พลอากาศโท'], ['พล.อ.ต.', 'พลอากาศตรี'], ['น.อ.', 'นาวาอากาศเอก'], ['น.ท.', 'นาวาอากาศโท'], ['น.ต.', 'นาวาอากาศตรี'], ['ร.อ.', 'เรืออากาศเอก'], ['ร.ท.', 'เรืออากาศโท'], ['ร.ต.', 'เรืออากาศตรี'], ['พ.อ.อ.', 'พันจ่าอากาศเอก'], ['พ.อ.ท.', 'พันจ่าอากาศโท'], ['พ.อ.ต.', 'พันจ่าอากาศตรี'], ['จ.อ.', 'จ่าอากาศเอก'], ['จ.ท.', 'จ่าอากาศโท'], ['จ.ต.', 'จ่าอากาศตรี']],
  'ยศตำรวจ': [['พล.ต.อ.', 'พลตำรวจเอก'], ['พล.ต.ท.', 'พลตำรวจโท'], ['พล.ต.ต.', 'พลตำรวจตรี'], ['พ.ต.อ.', 'พันตำรวจเอก'], ['พ.ต.ท.', 'พันตำรวจโท'], ['พ.ต.ต.', 'พันตำรวจตรี'], ['ร.ต.อ.', 'ร้อยตำรวจเอก'], ['ร.ต.ท.', 'ร้อยตำรวจโท'], ['ร.ต.ต.', 'ร้อยตำรวจตรี'], ['ด.ต.', 'ดาบตำรวจ'], ['จ.ส.ต.', 'จ่าสิบตำรวจ'], ['ส.ต.อ.', 'สิบตำรวจเอก'], ['ส.ต.ท.', 'สิบตำรวจโท'], ['ส.ต.ต.', 'สิบตำรวจตรี'], ['พลฯ', 'พลตำรวจ']],
  'คำนำหน้าชื่อ ฐานันดรศักดิ์ และตำแหน่งทางวิชาการ': [['น.ส.', 'นางสาว'], ['ด.ช.', 'เด็กชาย'], ['ด.ญ.', 'เด็กหญิง'], ['ม.จ.', 'หม่อมเจ้า'], ['ม.ร.ว.', 'หม่อมราชวงศ์'], ['ม.ล.', 'หม่อมหลวง'], ['ศ.', 'ศาสตราจารย์'], ['รศ.', 'รองศาสตราจารย์'], ['ผศ.', 'ผู้ช่วยศาสตราจารย์'], ['ดร.', 'ดุษฎีบัณฑิต (ด็อกเตอร์)'], ['นพ.', 'นายแพทย์'], ['พญ.', 'แพทย์หญิง'], ['ทพ.', 'ทันตแพทย์'], ['ทพญ.', 'ทันตแพทย์หญิง'], ['ภก.', 'เภสัชกร'], ['ภญ.', 'เภสัชกรหญิง'], ['น.สพ.', 'นายสัตวแพทย์'], ['สพ.ญ.', 'สัตวแพทย์หญิง']],
  'ตำแหน่งงาน': [['นรม.', 'นายกรัฐมนตรี'], ['รมว.', 'รัฐมนตรีว่าการกระทรวง'], ['รมช.', 'รัฐมนตรีช่วยว่าการกระทรวง'], ['ผวจ.', 'ผู้ว่าราชการจังหวัด'], ['นอภ.', 'นายอำเภอ'], ['ผอ.', 'ผู้อำนวยการ'], ['ผบ.ตร.', 'ผู้บัญชาการตำรวจแห่งชาติ'], ['ผบ.ทสส.', 'ผู้บัญชาการทหารสูงสุด'], ['ผบ.ทบ.', 'ผู้บัญชาการทหารบก'], ['ผบ.ทร.', 'ผู้บัญชาการทหารเรือ'], ['ผบ.ทอ.', 'ผู้บัญชาการทหารอากาศ'], ['ผกก.', 'ผู้กำกับการ'], ['สวป.', 'สารวัตรป้องกันปราบปราม'], ['พงส.', 'พนักงานสอบสวน']],
  'ปริญญาและวุฒิวิชาชีพ': [['น.บ.', 'นิติศาสตรบัณฑิต'], ['น.ม.', 'นิติศาสตรมหาบัณฑิต'], ['น.ด.', 'นิติศาสตรดุษฎีบัณฑิต'], ['น.บ.ท.', 'เนติบัณฑิตไทย'], ['ร.บ.', 'รัฐศาสตรบัณฑิต'], ['รป.บ.', 'รัฐประศาสนศาสตรบัณฑิต'], ['ศศ.บ.', 'ศิลปศาสตรบัณฑิต'], ['วท.บ.', 'วิทยาศาสตรบัณฑิต'], ['บธ.บ.', 'บริหารธุรกิจบัณฑิต'], ['บช.บ.', 'บัญชีบัณฑิต'], ['ศ.บ.', 'เศรษฐศาสตรบัณฑิต'], ['พ.บ.', 'แพทยศาสตรบัณฑิต'], ['ค.บ.', 'ครุศาสตรบัณฑิต'], ['ศษ.บ.', 'ศึกษาศาสตรบัณฑิต'], ['วศ.บ.', 'วิศวกรรมศาสตรบัณฑิต']]
};
var TIMELINES9 = [
  ['civil', 'คดีแพ่งสามัญ (ป.วิ.พ.)', [
    ['ยื่นคำฟ้อง', 'ยื่นต่อศาลที่มีเขตอำนาจ คือศาลที่มูลคดีเกิดหรือศาลที่จำเลยมีภูมิลำเนา พร้อมชำระค่าธรรมเนียมศาล', 'ป.วิ.พ. มาตรา 4, 172'],
    ['ศาลตรวจคำฟ้อง', 'ศาลสั่งรับ คืน หรือไม่รับคำฟ้อง', 'มาตรา 18'],
    ['ส่งหมายเรียกและสำเนาคำฟ้อง', 'โจทก์ต้องร้องขอให้ส่งหมายเรียกแก่จำเลยภายใน 7 วันนับแต่วันยื่นฟ้อง หากไม่ดำเนินการ ศาลอาจจำหน่ายคดีเพราะทิ้งฟ้อง', 'มาตรา 173, 174'],
    ['จำเลยยื่นคำให้การ', 'ภายใน 15 วันนับแต่วันรับหมายเรียก หากไม่ยื่นถือว่าขาดนัดยื่นคำให้การ', 'มาตรา 177, 197–199'],
    ['ชี้สองสถาน / กำหนดประเด็นข้อพิพาท', 'ศาลกำหนดประเด็นข้อพิพาทและหน้าที่นำสืบ', 'มาตรา 182, 183'],
    ['ยื่นบัญชีระบุพยาน', 'ก่อนวันสืบพยานไม่น้อยกว่า 7 วัน', 'มาตรา 88'],
    ['สืบพยานและพิพากษา', 'ศาลพิพากษาตามประเด็นที่พิจารณา', 'มาตรา 131, 141'],
    ['อุทธรณ์', 'ภายใน 1 เดือนนับแต่วันอ่านคำพิพากษา', 'มาตรา 229'],
    ['ฎีกา', 'ต้องได้รับอนุญาตจากศาลฎีกา ยื่นภายใน 1 เดือนนับแต่วันอ่านคำพิพากษาศาลอุทธรณ์', 'มาตรา 244/1, 247'],
    ['บังคับคดี', 'ต้องร้องขอให้บังคับคดีภายใน 10 ปีนับแต่วันมีคำพิพากษา', 'มาตรา 274']]],
  ['criminal', 'คดีอาญา (ป.วิ.อ.)', [
    ['ร้องทุกข์ / กล่าวโทษ', 'ผู้เสียหายร้องทุกข์ต่อพนักงานสอบสวน ความผิดอันยอมความได้ต้องร้องทุกข์ภายใน 3 เดือนนับแต่วันรู้เรื่องความผิดและรู้ตัวผู้กระทำ', 'ป.วิ.อ. มาตรา 2(7), 123; ป.อ. มาตรา 96'],
    ['การสอบสวน', 'พนักงานสอบสวนรวบรวมพยานหลักฐาน และต้องแจ้งสิทธิแก่ผู้ต้องหาก่อนถามคำให้การ', 'ป.วิ.อ. มาตรา 130, 134/4'],
    ['การจับและการควบคุม', 'ต้องนำตัวผู้ถูกจับไปศาลภายใน 48 ชั่วโมงนับแต่ถูกนำตัวไปถึงที่ทำการพนักงานสอบสวน เพื่อขอฝากขังหากจำเป็น', 'มาตรา 87'],
    ['สรุปสำนวน', 'พนักงานสอบสวนทำความเห็นควรสั่งฟ้องหรือไม่ฟ้อง ส่งพนักงานอัยการ', 'มาตรา 140–142'],
    ['พนักงานอัยการสั่งคดี', 'สั่งฟ้องหรือสั่งไม่ฟ้อง', 'มาตรา 143'],
    ['ฟ้องคดี', 'พนักงานอัยการฟ้อง หรือผู้เสียหายฟ้องเอง (กรณีผู้เสียหายฟ้องเอง ศาลต้องไต่สวนมูลฟ้องก่อน)', 'มาตรา 28, 158, 162'],
    ['พิจารณาและสืบพยาน', 'พิจารณาโดยเปิดเผยต่อหน้าจำเลย', 'มาตรา 172'],
    ['พิพากษา', 'ศาลพิพากษาลงโทษหรือยกฟ้อง', 'มาตรา 182–186'],
    ['อุทธรณ์', 'ภายใน 1 เดือนนับแต่วันอ่านคำพิพากษา', 'มาตรา 198'],
    ['ฎีกา', 'ต้องได้รับอนุญาตจากศาลฎีกา', 'มาตรา 216']]],
  ['admin', 'คดีปกครอง', [
    ['ดำเนินการภายในฝ่ายปกครองก่อน', 'หากกฎหมายกำหนดขั้นตอนอุทธรณ์ภายในไว้ ต้องดำเนินการให้ครบก่อนฟ้อง', 'พ.ร.บ.จัดตั้งศาลปกครองฯ พ.ศ. 2542 มาตรา 42 วรรคสอง'],
    ['ยื่นฟ้อง', 'ภายใน 90 วันนับแต่วันที่รู้หรือควรรู้ถึงเหตุแห่งการฟ้องคดี (เว้นแต่กฎหมายกำหนดไว้เป็นอย่างอื่น)', 'มาตรา 49'],
    ['ศาลแสวงหาข้อเท็จจริง', 'ใช้ระบบไต่สวน ตุลาการเจ้าของสำนวนเรียกเอกสารและคำชี้แจง', 'มาตรา 55'],
    ['อุทธรณ์', 'อุทธรณ์คำพิพากษาศาลปกครองชั้นต้นต่อศาลปกครองสูงสุดภายใน 30 วัน', 'มาตรา 73']]],
  ['labour', 'คดีแรงงาน', [
    ['ยื่นฟ้อง', 'ยื่นเป็นหนังสือหรือด้วยวาจาก็ได้ ได้รับยกเว้นค่าธรรมเนียมศาล', 'พ.ร.บ.จัดตั้งศาลแรงงานฯ พ.ศ. 2522 มาตรา 27, 35'],
    ['ไกล่เกลี่ย', 'ศาลไกล่เกลี่ยให้คู่ความตกลงกันก่อนพิจารณา', 'มาตรา 38'],
    ['พิจารณาและพิพากษา', 'ดำเนินกระบวนพิจารณาโดยสะดวก รวดเร็ว และประหยัด', 'มาตรา 39–52'],
    ['อุทธรณ์', 'อุทธรณ์ได้เฉพาะข้อกฎหมาย ภายใน 15 วันนับแต่วันอ่านคำพิพากษา', 'มาตรา 54']]],
  ['consumer', 'คดีผู้บริโภค', [
    ['ยื่นฟ้อง', 'ผู้บริโภคฟ้องด้วยวาจาได้ และได้รับยกเว้นค่าฤชาธรรมเนียม', 'พ.ร.บ.วิธีพิจารณาคดีผู้บริโภค พ.ศ. 2551 มาตรา 18, 20'],
    ['ไกล่เกลี่ย', 'เจ้าพนักงานคดีหรือผู้ที่ศาลกำหนดไกล่เกลี่ยก่อนพิจารณา', 'มาตรา 24'],
    ['พิจารณาและพิพากษา', 'ศาลมีอำนาจเรียกพยานหลักฐานเองได้ และภาระการพิสูจน์บางเรื่องตกแก่ผู้ประกอบธุรกิจ', 'มาตรา 33, 29']]],
  ['estate', 'การจัดการมรดก', [
    ['ยื่นคำร้องขอตั้งผู้จัดการมรดก', 'ทายาท ผู้มีส่วนได้เสีย หรือพนักงานอัยการ ยื่นคำร้องต่อศาล', 'ป.พ.พ. มาตรา 1713'],
    ['ศาลไต่สวนและมีคำสั่ง', 'ประกาศนัดไต่สวนและมีคำสั่งแต่งตั้งผู้จัดการมรดก', 'ป.วิ.พ. มาตรา 188'],
    ['จัดทำบัญชีทรัพย์มรดก', 'ผู้จัดการมรดกต้องจัดทำบัญชีทรัพย์มรดกให้เสร็จภายใน 1 เดือน (ขยายได้โดยศาลอนุญาต)', 'ป.พ.พ. มาตรา 1728, 1729'],
    ['แบ่งปันมรดก', 'ต้องจัดการมรดกให้เสร็จภายใน 1 ปีนับแต่วันที่เริ่มจัดการ เว้นแต่ทายาทหรือศาลกำหนดไว้เป็นอย่างอื่น', 'ป.พ.พ. มาตรา 1732']]]
];
var DICT_CACHE = {};
VIEWS.tools = function (el) {
  var st = S.ui.tl9 || (S.ui.tl9 = { t: 'dict' });
  var TL = [['dict', 'dict', 'พจนานุกรม (ฉบับภาษาไทย)'], ['abbr', 'abbr', 'รวมคำย่อทางกฎหมาย'], ['date', 'calendar', 'คำนวณวันและระยะเวลา'], ['period', 'calc', 'คำนวณกำหนดเวลาทางกฎหมาย'], ['timeline', 'layers', 'ลำดับขั้นตอนทางกฎหมาย']];
  if (!TL.some(function (x) { return x[0] === st.t; })) st.t = 'dict';
  el.innerHTML = '<div class="view-head"><div><h2>' + tr('tools') + '</h2><p class="sub">พจนานุกรม คำย่อ คำนวณระยะเวลา และลำดับขั้นตอนทางกฎหมาย</p></div></div><div class="hscroll" id="tlTabs">' + TL.map(function (x) { return '<button class="chip ' + (st.t === x[0] ? 'on' : '') + '" data-t="' + x[0] + '">' + ic(x[1]) + esc(x[2]) + '</button>'; }).join('') + '</div><div id="tlBody" style="margin-top:14px"></div>';
  function draw() {
    var b = $('#tlBody', el); b.className = 'enter';
    if (st.t === 'dict') return toolDict(b);
    if (st.t === 'abbr') return toolAbbr(b);
    if (st.t === 'timeline') return toolTimeline(b);
    TOOL_UI[st.t](b);
  }
  on($('#tlTabs', el), 'click', '[data-t]', function (e, b) { st.t = b.getAttribute('data-t'); store.set('ui', S.ui); $$('#tlTabs .chip', el).forEach(function (c) { c.classList.toggle('on', c === b); }); draw(); });
  draw();
};
function toolDict(b) {
  b.innerHTML = '<section class="panel"><div class="input">' + ic('search') + '<input id="dQ" placeholder="พิมพ์คำภาษาไทยที่ต้องการค้นหาความหมาย เช่น ฉ้อฉล, นิติกรรม, ภูมิลำเนา" autocomplete="off"></div><p class="tiny muted" style="margin-top:6px">ความหมายจากพจนานุกรมฉบับราชบัณฑิตยสถาน (สำนักงานราชบัณฑิตยสภา) ค้นได้ทุกหมวดคำ ไม่จำกัดเฉพาะคำทางกฎหมาย และศัพท์กฎหมายที่อธิบายไว้ในเว็บไซต์</p></section><div id="dOut" style="margin-top:12px"></div>';
  var inp = $('#dQ', b), out = $('#dOut', b), seq = 0;
  function local(q) { var nq = norm(q); return DICT.filter(function (d) { return nq && norm(d[0]).indexOf(nq) > -1; }).slice(0, 8); }
  function render(q, r) {
    var loc = local(q);
    var html = '';
    if (r && r.items && r.items.length && !r.notFound) html += '<section class="panel"><div class="panel-title"><span class="ic">' + ic('dict') + '</span><h3>พจนานุกรมฉบับราชบัณฑิตยสถาน: “' + esc(q) + '”</h3></div>' + r.items.map(function (it) { return '<div class="dict-it"><b>' + esc(it.head) + '</b>' + (it.body ? '<div class="dict-b">' + esc(it.body) + '</div>' : '') + '</div>'; }).join('') + '<p class="tiny muted" style="margin-top:8px">ที่มา: ' + esc(r.source) + ' · <a href="https://dictionary.orst.go.th/" target="_blank" rel="noopener">เปิดเว็บไซต์พจนานุกรม</a></p></section>';
    else if (r && r.unavailable) html += '<div class="panel flat"><p class="small">ขณะนี้ยังเชื่อมต่อพจนานุกรมราชบัณฑิตยสถานไม่ได้ ระบบจะลองใหม่อัตโนมัติเมื่อพิมพ์อีกครั้ง หรือ <a href="https://dictionary.orst.go.th/" target="_blank" rel="noopener">เปิดพจนานุกรมโดยตรง</a></p></div>';
    else if (r) html += '<div class="panel flat"><p class="small">ไม่พบคำว่า “' + esc(q) + '” ในพจนานุกรมฉบับราชบัณฑิตยสถาน ลองตรวจการสะกดหรือพิมพ์คำหลักให้สั้นลง</p></div>';
    if (loc.length) html += '<section class="panel" style="margin-top:12px"><div class="panel-title"><span class="ic o">' + ic('scale') + '</span><h3>ศัพท์กฎหมายในเว็บไซต์</h3></div>' + loc.map(function (d) { return '<div class="dict-it"><b>' + esc(d[0]) + '</b><div class="dict-b">' + esc(d[1]) + '</div></div>'; }).join('') + '</section>';
    out.innerHTML = html || '<div class="panel flat"><p class="small muted">พิมพ์คำที่ต้องการค้นหา</p></div>';
  }
  function go() {
    var q = inp.value.trim(), my = ++seq;
    if (!q) { render('', null); out.innerHTML = '<div class="panel flat"><p class="small muted">พิมพ์คำที่ต้องการค้นหา</p></div>'; return; }
    if (DICT_CACHE[q]) { render(q, DICT_CACHE[q]); return; }
    out.innerHTML = '<div class="skeleton" style="height:80px"></div>';
    api('dictTh', { q: q }, { timeout: 30000 }).then(function (r) { if (!r.unavailable) DICT_CACHE[q] = r; if (my === seq) render(q, r); }).catch(function () { if (my === seq) render(q, { unavailable: true }); });
  }
  inp.addEventListener('input', debounce(go, 450));
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  go();
}
function toolAbbr(b) {
  var cats = Object.keys(ABBR9), st = S.ui.tl9; st.ac = st.ac || '';
  var all = ABBR.map(function (a) { return [a[0], a[1], 'กฎหมายและเอกสารทางกฎหมาย']; });
  cats.forEach(function (c) { ABBR9[c].forEach(function (a) { if (!all.some(function (x) { return x[0] === a[0] && x[1] === a[1]; })) all.push([a[0], a[1], c]); }); });
  b.innerHTML = '<div class="hscroll" id="abC"><button class="chip ' + (!st.ac ? 'on' : '') + '" data-ac="">ทั้งหมด <span class="cnt">' + all.length + '</span></button>' + cats.map(function (c) { return '<button class="chip ' + (st.ac === c ? 'on' : '') + '" data-ac="' + esc(c) + '">' + esc(c) + ' <span class="cnt">' + all.filter(function (x) { return x[2] === c; }).length + '</span></button>'; }).join('') + '</div>' +
    '<div class="input" style="margin:10px 0 12px">' + ic('search') + '<input id="aQ" placeholder="ค้นหาคำย่อหรือคำเต็ม"></div><div class="table-scroll"><table class="ptable ab9"><thead><tr><th>คำย่อ</th><th>คำเต็ม</th><th>หมวด</th></tr></thead><tbody id="aList"></tbody></table></div>';
  function draw() { var q = norm($('#aQ', b).value); $('#aList', b).innerHTML = all.filter(function (a) { return (!st.ac || a[2] === st.ac) && (!q || norm(a[0] + a[1]).indexOf(q) > -1); }).map(function (a) { return '<tr><td><b>' + esc(a[0]) + '</b></td><td>' + esc(a[1]) + '</td><td class="small muted">' + esc(a[2]) + '</td></tr>'; }).join('') || '<tr><td colspan="3" class="muted">ไม่พบคำย่อที่ค้นหา</td></tr>'; }
  on($('#abC', b), 'click', '[data-ac]', function (e, x) { st.ac = x.getAttribute('data-ac'); store.set('ui', S.ui); $$('#abC .chip', b).forEach(function (c) { c.classList.toggle('on', c === x); }); draw(); });
  $('#aQ', b).addEventListener('input', debounce(draw, 120)); draw();
}
function toolTimeline(b) {
  var st = S.ui.tl9; st.tk = st.tk || 'civil';
  b.innerHTML = '<div class="hscroll" id="tkC">' + TIMELINES9.map(function (t) { return '<button class="chip ' + (st.tk === t[0] ? 'on' : '') + '" data-tk="' + t[0] + '">' + esc(t[1]) + '</button>'; }).join('') + '</div><div id="tkOut" style="margin-top:12px"></div>';
  function draw() {
    var t = TIMELINES9.filter(function (x) { return x[0] === st.tk; })[0];
    $('#tkOut', b).innerHTML = '<section class="panel"><div class="panel-title"><span class="ic">' + ic('layers') + '</span><h3>' + esc(t[1]) + '</h3></div><ol class="tl9">' + t[2].map(function (s, i) { return '<li><span class="tl9-n">' + (i + 1) + '</span><div><b>' + esc(s[0]) + '</b><div class="small">' + esc(s[1]) + '</div><div class="tiny muted">อ้างอิง: ' + esc(s[2]) + '</div></div></li>'; }).join('') + '</ol><p class="tiny muted" style="margin-top:8px">ลำดับขั้นตอนนี้เป็นภาพรวมเพื่อการศึกษา ระยะเวลาและรายละเอียดอาจแตกต่างตามประเภทคดี คำสั่งศาล หรือกฎหมายที่แก้ไขเพิ่มเติม โปรดตรวจสอบตัวบทฉบับปัจจุบันก่อนนำไปใช้</p></section>';
  }
  on($('#tkC', b), 'click', '[data-tk]', function (e, x) { st.tk = x.getAttribute('data-tk'); store.set('ui', S.ui); $$('#tkC .chip', b).forEach(function (c) { c.classList.toggle('on', c === x); }); draw(); });
  draw();
}

/* ---------------- หน้าแรก: สไลด์แนะนำเว็บไซต์ (แทนวิดีโอแนะนำ) ---------------- */
var GUIDE9 = null;
function loadGuide() { if (GUIDE9) return Promise.resolve(GUIDE9); return fetch(DB_RAW + 'guide/manifest.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('guide'); return r.json(); }).then(function (j) { GUIDE9 = j; return j; }); }
explainerHtml = function () {
  return '<section class="panel guide9" id="guide9" style="margin-bottom:22px"><div class="panel-title"><span class="ic">' + ic('book') + '</span><h2>สไลด์แนะนำเว็บไซต์และวิธีใช้งาน</h2></div>' +
    '<p class="small muted" style="margin:-4px 0 12px">แตะที่สไลด์เพื่อเปิดอ่านแบบขยาย เลื่อนดูได้ทีละหน้า หรือดาวน์โหลดเป็นไฟล์ PDF ขนาด A4</p><div class="gd-strip" id="gdStrip"><div class="skeleton" style="height:150px"></div></div>' +
    '<div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn k" id="gdOpen">' + ic('maximize') + ' เปิดอ่านสไลด์</button><a class="btn" id="gdPdf" href="#" target="_blank" rel="noopener">' + ic('download') + ' ดาวน์โหลด PDF (A4)</a></div></section>';
};
startExplainer = function () {
  var strip = document.getElementById('gdStrip'); if (!strip) return;
  loadGuide().then(function (g) {
    if (!strip.isConnected) return;
    strip.innerHTML = g.slides.map(function (s, i) { return '<button class="gd-th" data-gd="' + i + '" aria-label="สไลด์ที่ ' + (i + 1) + ': ' + esc(s.title) + '"><img src="' + esc(DB_RAW + s.file) + '" alt="" loading="lazy" decoding="async"><span class="gd-cap"><b>' + (i + 1) + '.</b> ' + esc(s.title) + '</span></button>'; }).join('');
    var pdf = document.getElementById('gdPdf'); if (pdf) pdf.href = DB_RAW + g.pdf;
    on(strip, 'click', '[data-gd]', function (e, b) { openGuide(+b.getAttribute('data-gd')); });
    var ob = document.getElementById('gdOpen'); if (ob) ob.onclick = function () { openGuide(0); };
  }).catch(function () { strip.innerHTML = '<p class="small muted">ยังโหลดสไลด์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>'; });
};
stopExplainer = function () {};
function openGuide(i) {
  loadGuide().then(function (g) {
    var n = g.slides.length, cur = Math.max(0, Math.min(n - 1, i));
    var v = h('<div class="gd-view" role="dialog" aria-modal="true" aria-label="สไลด์แนะนำเว็บไซต์"><div class="gd-bar"><b class="grow" id="gdT"></b><span class="small" id="gdN"></span><button class="icon-btn" data-gx="1" aria-label="ปิด">' + ic('x') + '</button></div><div class="gd-stage"><button class="nav-arrow gd-prev" data-gp="-1" aria-label="สไลด์ก่อนหน้า">' + ic('arrowL') + '</button><img id="gdImg" alt=""><button class="nav-arrow gd-next" data-gp="1" aria-label="สไลด์ถัดไป">' + ic('arrowR') + '</button></div></div>');
    document.body.appendChild(v); syncScrollLock();
    function show() { var s = g.slides[cur]; $('#gdImg', v).src = DB_RAW + s.file; $('#gdImg', v).alt = s.title; $('#gdT', v).textContent = s.title; $('#gdN', v).textContent = (cur + 1) + ' / ' + n; }
    function close() { v.remove(); syncScrollLock(); document.removeEventListener('keydown', key); }
    function key(e) { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') { cur = Math.min(n - 1, cur + 1); show(); } else if (e.key === 'ArrowLeft') { cur = Math.max(0, cur - 1); show(); } }
    v.addEventListener('click', function (e) { if (e.target.closest('[data-gx]') || e.target === v) close(); var p = e.target.closest('[data-gp]'); if (p) { cur = Math.max(0, Math.min(n - 1, cur + Number(p.getAttribute('data-gp')))); show(); } });
    var sx = 0; v.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    v.addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) { cur = Math.max(0, Math.min(n - 1, cur + (dx < 0 ? 1 : -1))); show(); } }, { passive: true });
    document.addEventListener('keydown', key);
    show();
  });
}
(function () {
  var base = syncScrollLock;
  syncScrollLock = function () { base(); if (document.querySelector('.gd-view')) document.documentElement.classList.add('scroll-lock'); };
})();
</script>
