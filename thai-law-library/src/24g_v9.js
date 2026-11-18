<script>
/* =========================================================================
 *  VERSION 9 (หน้าเว็บ ส่วนที่ 1) — แก้ไข/เพิ่มเฉพาะจุดตามคำสั่ง ไม่ลบข้อมูลกฎหมาย
 * ========================================================================= */

/* ---------- ธงชาติ (ไฟล์ SVG มาตรฐานจากชุด flag-icons สัดส่วน 4:3 ไม่บิดภาพ) ---------- */
function flagUrl(cc) { return 'https://cdn.jsdelivr.net/npm/flag-icons@7.2.3/flags/4x3/' + String(cc).toLowerCase() + '.svg'; }
function flagImg(cc, cls) { return /^[A-Z]{2}$/.test(String(cc || '')) ? '<img class="flag ' + (cls || '') + '" src="' + flagUrl(cc) + '" alt="ธงชาติ ' + esc(cc) + '" width="28" height="21" loading="lazy" decoding="async" onerror="this.remove()">' : ''; }
(function () {
  function deco(root) {
    $$('.fgn-card[data-fc]:not([data-fl9]),.fgn-card[data-twc]:not([data-fl9]),[data-tw9c]:not([data-fl9])', root || document).forEach(function (b) {
      b.setAttribute('data-fl9', '1');
      var cc = b.getAttribute('data-fc') || b.getAttribute('data-twc') || b.getAttribute('data-tw9c'), code = b.querySelector('.fgn-code');
      if (code && /^[A-Z]{2}$/.test(cc)) { code.classList.add('has-flag'); code.innerHTML = flagImg(cc) + '<span>' + esc(cc) + '</span>'; }
    });
  }
  new MutationObserver(function (ms) { for (var i = 0; i < ms.length; i++) if (ms[i].addedNodes.length) { deco(document); break; } }).observe(document.documentElement, { childList: true, subtree: true });
})();

/* ---------- “อ่านเพิ่มเติม”: ไม่หดกลับเองเมื่อหน้าอัปเดตข้อมูลเบื้องหลัง ผู้ใช้กดปิดเองเท่านั้น ---------- */
var RM_OPEN = {};
function rmKey(box) {
  var art = box.closest('article,section,.panel'), h = art && art.querySelector('h1,h2,h3,h4');
  return ((h && h.textContent) || '') + '|' + String((box.querySelector('.rm-body') || box).textContent || '').replace(/\s+/g, ' ').slice(0, 60);
}
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-rm]'); if (!b) return;
  var box = b.closest('.readmore'); if (!box) return;
  var k = rmKey(box); if (box.classList.contains('closed')) delete RM_OPEN[k]; else RM_OPEN[k] = 1;
  var body = box.querySelector('.rm-body');
  if (!box.classList.contains('closed') && body) setTimeout(function () { if (!box.classList.contains('closed')) body.style.maxHeight = 'none'; }, 450);
});
new MutationObserver(function (ms) {
  if (!Object.keys(RM_OPEN).length) return;
  ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType !== 1) return; var list = n.classList && n.classList.contains('readmore') ? [n] : $$('.readmore.closed', n); list.forEach(function (box) {
    if (!box.classList.contains('closed') || !RM_OPEN[rmKey(box)]) return;
    var body = box.querySelector('.rm-body'), b = box.querySelector('[data-rm]');
    box.classList.remove('closed'); if (body) body.style.maxHeight = 'none';
    if (b) { var sp = b.querySelector('span'), sv = b.querySelector('svg'); if (sp) sp.textContent = 'ย่อข้อความ'; if (sv) sv.style.transform = 'rotate(180deg)'; }
  }); }); });
}).observe(document.documentElement, { childList: true, subtree: true });

/* ---------- เข้าสู่ระบบครั้งเดียว ใช้ต่อได้: เวลาที่ปิดหน้าจอ/ไม่ได้อยู่ที่หน้าเว็บไม่นับเป็นเวลาที่ไม่ได้ใช้งาน ---------- */
(function () {
  var fresh = function () { try { lastActive = Date.now(); } catch (e) {} };
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') fresh(); });
  ['pageshow', 'focus', 'online'].forEach(function (ev) { window.addEventListener(ev, fresh); });
})();
/* ---------- เวลาใช้งานรายวัน: นับแยกรายอุปกรณ์แล้วรวมกัน (ทุกอุปกรณ์แสดงตัวเลขเดียวกันหลังซิงก์) ---------- */
function sumDevTime(ud, k) { var t = 0; Object.keys((ud && ud.timeDev) || {}).forEach(function (d) { t += Number((ud.timeDev[d] || {})[k] || 0); }); return t; }
flushUsage = function () {
  if (!S.ud || !usageAcc) return;
  var k = dayKey(), d = deviceId(); S.ud.timeDev = S.ud.timeDev || {};
  var m = S.ud.timeDev[d] = S.ud.timeDev[d] || {}; m[k] = (m[k] || 0) + usageAcc;
  S.ud.time[k] = Math.max((S.ud.time[k] || 0) + usageAcc, sumDevTime(S.ud, k));
  usageAcc = 0; saveUD();
};
(function () {
  var baseMerge = mergeUD;
  mergeUD = function (local, server) {
    var out = baseMerge(local, server);
    try {
      var td = {}; [server && server.timeDev, local && local.timeDev].forEach(function (src) { Object.keys(src || {}).forEach(function (d) { td[d] = td[d] || {}; Object.keys(src[d] || {}).forEach(function (k) { td[d][k] = Math.max(td[d][k] || 0, Number(src[d][k]) || 0); }); }); });
      out.timeDev = td;
      Object.keys(out.time || {}).forEach(function (k) { out.time[k] = Math.max(out.time[k] || 0, sumDevTime(out, k)); });
    } catch (e) {}
    return out;
  };
})();

/* ---------- ไม่มีแพ็กเกจการใช้งานและการชำระเงิน: ใช้งานได้ครบทุกส่วน ---------- */
can = function () { return true; };
VIEWS.pricing = function (el) { el.innerHTML = ''; setTimeout(function () { nav('home'); }, 0); };
(function () {
  function strip(root) {
    $$('.panel h3', root).forEach(function (h3) { if (/^แพ็กเกจการใช้งาน$/.test(h3.textContent.trim())) { var p = h3.closest('section,.panel'); if (p) p.remove(); } });
    var hp = root.querySelector && root.querySelector('#hpPrice'); if (hp) hp.remove();
    $$('h3', root).forEach(function (h3) { if (/^\d+\.\s*แพ็กเกจและการชำระเงิน/.test(h3.textContent.trim())) { var n = h3.nextElementSibling; while (n && n.tagName !== 'H3') { var x = n.nextElementSibling; n.remove(); n = x; } h3.remove(); } });
    $$('[data-go="pricing"],[data-nav="pricing"],[data-v="pricing"]', root).forEach(function (x) { x.remove(); });
  }
  new MutationObserver(function (ms) { for (var i = 0; i < ms.length; i++) if (ms[i].addedNodes.length) { strip(document); break; } }).observe(document.documentElement, { childList: true, subtree: true });
})();

/* ---------- ผู้ช่วย AI บนมือถือ: ไม่เด้ง ไม่หน้าขาวขณะพิมพ์/ส่งข้อความ ---------- */
(function () {
  var nativeScrollTo = window.scrollTo.bind(window), aiFocusWanted = false;
  window.scrollTo = function (a, b) {
    if (S && S.ui && S.ui.view === 'ai' && a && typeof a === 'object') {
      var log = document.getElementById('aiLog'), last = log && log.lastElementChild;
      if (last && last.scrollIntoView) { last.scrollIntoView({ block: 'end', behavior: 'auto' }); return; }
      a = Object.assign({}, a, { behavior: 'auto' });
    }
    return nativeScrollTo(a, b);
  };
  document.addEventListener('keydown', function (e) { if (e.target && e.target.id === 'aiIn' && e.key === 'Enter' && !e.shiftKey) aiFocusWanted = true; }, true);
  document.addEventListener('pointerdown', function (e) { if (e.target && e.target.closest && e.target.closest('#aiSend')) aiFocusWanted = document.activeElement && document.activeElement.id === 'aiIn'; }, true);
  new MutationObserver(function () {
    if (!aiFocusWanted) return;
    var inp = document.getElementById('aiIn');
    if (inp && document.activeElement !== inp) { aiFocusWanted = false; try { inp.focus({ preventScroll: true }); } catch (e) {} }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
</script>
<script>
/* =========================================================================
 *  กฎหมายประเทศไทย: ตัวเลือกย่อย + “บังคับใช้อยู่ / ยกเลิกบังคับใช้แล้ว” + ปุ่ม “ล้าง” + อ่านอย่างเดียวสำหรับกฎหมายที่ไม่ใช่ประมวล
 * ========================================================================= */
function juntaKind(t) { t = String(t || ''); return /คณะรักษาความสงบแห่งชาติ/.test(t) ? 'ksc' : /คณะปฏิรูปการปกครองในระบอบประชาธิปไตย/.test(t) ? 'kpk' : /คณะปฏิวัติ/.test(t) ? 'pw' : /คณะปฏิรูปการปกครองแผ่นดิน|คณะปฏิรูป/.test(t) ? 'pr' : 'oth'; }
var TH_SUB = {
  'พระราชบัญญัติ/พระราชกำหนด': [['act', 'พระราชบัญญัติ', function (l) { return !/^พระราชกำหนด/.test(l.title); }], ['dec', 'พระราชกำหนด', function (l) { return /^พระราชกำหนด/.test(l.title); }]],
  'ปร./ปว./คปค./คสช.': [['pr', 'ปร.', function (l) { return juntaKind(l.title) === 'pr'; }], ['pw', 'ปว.', function (l) { return juntaKind(l.title) === 'pw'; }], ['kpk', 'คปค.', function (l) { return juntaKind(l.title) === 'kpk'; }], ['ksc', 'คสช.', function (l) { return juntaKind(l.title) === 'ksc'; }], ['oth', 'อื่น ๆ (รสช. / คมช.)', function (l) { return juntaKind(l.title) === 'oth'; }]]
};
var TH_SUB_NOTE = { pr: 'ประกาศ/คำสั่งคณะปฏิรูปการปกครองแผ่นดิน', pw: 'ประกาศ/คำสั่งของคณะปฏิวัติ', kpk: 'ประกาศ/คำสั่งคณะปฏิรูปการปกครองในระบอบประชาธิปไตยอันมีพระมหากษัตริย์ทรงเป็นประมุข (พ.ศ. 2549)', ksc: 'ประกาศ/คำสั่งคณะรักษาความสงบแห่งชาติ และหัวหน้า คสช. (พ.ศ. 2557)', oth: 'ประกาศคณะรักษาความสงบเรียบร้อยแห่งชาติ (รสช.) และคณะมนตรีความมั่นคงแห่งชาติ (คมช.)' };
function lawRep(l) { return isRepealedTitle(l.title, l.status); }
function statSeg(id, cur, nAll, nIn, nRep) {
  return '<div class="seg stat9" id="' + id + '" role="tablist"><button data-s="" class="' + (!cur ? 'on' : '') + '">ทั้งหมด <span class="cnt">' + fmtN(nAll) + '</span></button><button data-s="in" class="' + (cur === 'in' ? 'on' : '') + '">บังคับใช้อยู่ <span class="cnt">' + fmtN(nIn) + '</span></button><button data-s="rep" class="' + (cur === 'rep' ? 'on' : '') + '">ยกเลิกแล้ว <span class="cnt">' + fmtN(nRep) + '</span></button></div>';
}
var TH_PROMPT = '<div class="panel"><div class="empty"><div class="eic">' + '__IC__' + '</div><h3>โปรดเลือกหมวดกฎหมาย</h3><p>เลือกหมวดจากปุ่มด้านบน (รัฐธรรมนูญ พระราชบัญญัติประกอบรัฐธรรมนูญ พระราชบัญญัติ/พระราชกำหนด ปร./ปว./คปค./คสช. ประมวลกฎหมาย กฎหมายลำดับรองและอื่น ๆ หรือกฎหมายที่บังคับใช้ทั่วประเทศ) แล้วเลือกสถานะ “บังคับใช้อยู่” หรือ “ยกเลิกแล้ว” และพิมพ์ชื่อกฎหมายที่ต้องการในช่องค้นหา</p></div></div>';
function thaiCatBody(el) {
  var st = S.ui.content, box = $('#ctBody', el); if (!box) return;
  if (!S.catalog) { box.innerHTML = '<div class="skeleton" style="height:90px"></div>'; loadCatalog().then(function () { if (box.isConnected) thaiCatBody(el); }); return; }
  var subs = TH_SUB[st.cat] || null;
  var inCat = S.catalog.laws.filter(function (l) { return l.cat === st.cat; });
  if (subs && st.sub && !subs.some(function (x) { return x[0] === st.sub; })) st.sub = '';
  var sub = subs && st.sub ? subs.filter(function (x) { return x[0] === st.sub; })[0] : null;
  var base = sub ? inCat.filter(sub[2]) : inCat;
  var nRep = base.filter(lawRep).length;
  var html = (subs ? '<div class="hscroll sub9" id="thSub"><button class="chip ' + (!st.sub ? 'on' : '') + '" data-sb="">ทั้งหมด <span class="cnt">' + fmtN(inCat.length) + '</span></button>' + subs.map(function (x) { return '<button class="chip ' + (st.sub === x[0] ? 'on' : '') + '" data-sb="' + x[0] + '">' + esc(x[1]) + ' <span class="cnt">' + fmtN(inCat.filter(x[2]).length) + '</span></button>'; }).join('') + '</div>' : '') +
    (sub && TH_SUB_NOTE[sub[0]] ? '<p class="tiny muted" style="margin:4px 2px 0">' + esc(TH_SUB_NOTE[sub[0]]) + '</p>' : '') +
    statSeg('thStat', st.stat || '', base.length, base.length - nRep, nRep) +
    '<div class="input" style="margin-top:10px">' + ic('search') + '<input id="ctQ" placeholder="พิมพ์ชื่อกฎหมายหรือคำย่อในหมวด ' + esc(sub ? sub[1] : st.cat) + '" value="' + esc(st.q || '') + '"></div><div id="ctRes" style="margin-top:12px"></div>';
  box.innerHTML = html;
  var shown = 0, list = [];
  function compute() {
    var q = String(st.q || '').trim(), nqs = q ? expandQuery(q).map(norm).filter(Boolean) : [];
    list = base.filter(function (l) { if (st.stat === 'in' && lawRep(l)) return false; if (st.stat === 'rep' && !lawRep(l)) return false; if (!nqs.length) return true; var hay = norm(l.title + ' ' + (l.short || '')); return nqs.some(function (e) { return hay.indexOf(e) > -1; }); });
    list.sort(function (a, b) { return (lawRep(a) - lawRep(b)) || String(b.year || '').localeCompare(String(a.year || '')) || a.title.localeCompare(b.title, 'th'); });
  }
  function draw(reset) {
    var res = $('#ctRes', box); if (!res) return;
    if (reset) { shown = 0; res.innerHTML = ''; }
    if (!list.length) { res.innerHTML = '<div class="panel"><div class="empty"><div class="eic">' + ic('search') + '</div><h3>ไม่พบกฎหมายตามเงื่อนไข</h3><p>ลองเปลี่ยนสถานะ หรือพิมพ์คำที่สั้นลง</p></div></div>'; return; }
    var next = list.slice(shown, shown + 60); shown += next.length;
    var mb = $('#th9More', res); if (mb) mb.remove();
    res.insertAdjacentHTML('beforeend', (shown === next.length ? '<div class="group-h">' + (st.q ? 'ผลการค้นหา' : 'กฎหมายในหมวดนี้') + ' <span class="cnt">' + fmtN(list.length) + ' ฉบับ</span></div><div class="col anim-list" id="th9List"></div>' : '') + (shown < list.length ? '<button class="btn block" id="th9More" style="margin-top:10px">แสดงเพิ่มเติม (' + fmtN(list.length - shown) + ' ฉบับ)</button>' : ''));
    var col = $('#th9List', res);
    col.insertAdjacentHTML('beforeend', next.map(function (l) { var n = l.n || (SECS_BY_LAW[l.id] || []).length; return '<button class="law-item" data-bd="1" data-law="' + esc(l.id) + '"><span class="li-ic">' + ic(CAT_ICON[l.cat] || 'file') + '</span><span class="grow"><span class="li-t">' + (st.q ? highlight(esc(l.title), st.q) : esc(l.title)) + '</span> ' + statusBadge(lawRep(l)) + '<br><span class="li-s">' + (n ? fmtN(n) + (n === 1 && l.cat !== 'ประมวลกฎหมาย' ? ' ตอน (ตัวบทฉบับเต็ม)' : ' มาตรา') : 'รอนำเข้าตัวบท') + (l.year ? ' · พ.ศ. ' + esc(l.year) : '') + '</span></span>' + ic('chevR') + '</button>'; }).join(''));
    var m2 = $('#th9More', res); if (m2) m2.onclick = function () { draw(false); };
  }
  compute(); draw(true);
  on($('#thSub', box) || h('<div></div>'), 'click', '[data-sb]', function (e, b) { st.sub = b.getAttribute('data-sb'); st.stat = ''; store.set('ui', S.ui); thaiCatBody(el); });
  on($('#thStat', box), 'click', '[data-s]', function (e, b) { st.stat = b.getAttribute('data-s'); store.set('ui', S.ui); $$('#thStat button', box).forEach(function (x) { x.classList.toggle('on', x === b); }); compute(); draw(true); });
  $('#ctQ', box).addEventListener('input', debounce(function () { st.q = this.value; store.set('ui', S.ui); compute(); draw(true); }, 200));
}

/* ---------- กฎหมายลำดับรองและอื่น ๆ: ประเภท + สถานะ ---------- */
renderThai2 = function (box) {
  var st = S.ui.content; st.t2 = st.t2 || { q: '', type: '', stat: '' };
  box.innerHTML = '<div class="skeleton" style="height:90px"></div>';
  loadForeignCountries().then(function (r) {
    if (!r.thai2) throw new Error('noidx');
    return loadIndex(r.thai2.index).then(function (ix) {
      if (!box.isConnected) return;
      var all = ix.laws, rep = function (e) { return /ยกเลิก/.test(e[1]); };
      var tc = {}; all.forEach(function (e) { tc[e[2]] = (tc[e[2]] || 0) + 1; });
      var types = Object.keys(tc).sort(function (a, b) { return tc[b] - tc[a]; });
      var base = st.t2.type ? all.filter(function (e) { return e[2] === st.t2.type; }) : all, nRep = base.filter(rep).length;
      box.innerHTML = '<div class="panel flat" style="margin-bottom:10px"><div class="small"><b>กฎหมายลำดับรองและอื่น ๆ</b> ' + fmtN(all.length) + ' ฉบับ</div><div class="tiny muted">ที่มา: PyThaiNLP thailaw-v1.0 (CC0) — ตัวบทตามชุดข้อมูล โปรดตรวจสอบฉบับปัจจุบันกับต้นฉบับ</div></div>' +
        '<div class="hscroll" id="t2Types"><button class="chip ' + (!st.t2.type ? 'on' : '') + '" data-ty="">ทุกประเภท <span class="cnt">' + fmtN(all.length) + '</span></button>' + types.map(function (t) { return '<button class="chip ' + (st.t2.type === t ? 'on' : '') + '" data-ty="' + esc(t) + '">' + esc(t) + ' <span class="cnt">' + fmtN(tc[t]) + '</span></button>'; }).join('') + '</div>' +
        statSeg('t2Stat', st.t2.stat || '', base.length, base.length - nRep, nRep) +
        '<div class="input" style="margin-top:10px">' + ic('search') + '<input id="t2Q" placeholder="พิมพ์ชื่อ เช่น กฎกระทรวง ผังเมือง, ประกาศกระทรวงสาธารณสุข" value="' + esc(st.t2.q || '') + '"></div><div id="t2Res" style="margin-top:12px"></div>';
      var res = $('#t2Res', box), list = [], shown = 0;
      function compute() {
        var q = norm(st.t2.q || '');
        list = base.filter(function (e) { if (st.t2.stat === 'in' && rep(e)) return false; if (st.t2.stat === 'rep' && !rep(e)) return false; return !q || norm(e[1]).indexOf(q) > -1; });
      }
      function draw(reset) {
        if (reset) { shown = 0; res.innerHTML = ''; }
        if (!list.length) { res.innerHTML = '<div class="panel"><div class="empty"><div class="eic">' + ic('search') + '</div><h3>ไม่พบกฎหมายตามเงื่อนไข</h3><p>ลองเปลี่ยนประเภท สถานะ หรือคำค้น</p></div></div>'; return; }
        var next = list.slice(shown, shown + 50); shown += next.length;
        var mb = $('#t2More', res); if (mb) mb.remove();
        res.insertAdjacentHTML('beforeend', (shown === next.length ? '<div class="group-h">' + (st.t2.q ? 'ผลการค้นหา' : 'รายการ') + ' <span class="cnt">' + fmtN(list.length) + ' ฉบับ</span></div>' : '') + next.map(function (e) { return '<button class="law-item" data-bd="1" data-t2="' + esc(e[0]) + '"><span class="li-ic">' + ic('file') + '</span><span class="grow"><span class="li-t">' + esc(e[1]) + '</span> ' + statusBadge(rep(e)) + '<br><span class="li-s">' + esc(e[2]) + (e[4] ? ' · ' + fmtN(e[4]) + ' มาตรา/ข้อ' : ' · ตัวบทฉบับเต็ม') + '</span></span>' + ic('chevR') + '</button>'; }).join('') + (shown < list.length ? '<button class="btn block" id="t2More" style="margin-top:10px">แสดงเพิ่มเติม (' + fmtN(list.length - shown) + ' ฉบับ)</button>' : ''));
        var m2 = $('#t2More', res); if (m2) m2.onclick = function () { draw(false); };
      }
      compute(); draw(true);
      on($('#t2Types', box), 'click', '[data-ty]', function (e, b) { st.t2.type = b.getAttribute('data-ty'); st.t2.stat = ''; store.set('ui', S.ui); renderThai2(box); });
      on($('#t2Stat', box), 'click', '[data-s]', function (e, b) { st.t2.stat = b.getAttribute('data-s'); store.set('ui', S.ui); $$('#t2Stat button', box).forEach(function (x) { x.classList.toggle('on', x === b); }); compute(); draw(true); });
      $('#t2Q', box).addEventListener('input', debounce(function () { st.t2.q = this.value.trim(); store.set('ui', S.ui); compute(); draw(true); }, 250));
      on(res, 'click', '[data-t2]', function (e, b) { var id = b.getAttribute('data-t2'), ent = list.filter(function (x) { return x[0] === id; })[0]; if (!ent) return; openForeignLaw({ code: 'TH2', name: 'กฎหมายไทยลำดับรอง' }, id, { k: 'r', o: ent[3], n: ent[4] }, { title: ent[1], repealed: rep(ent) }); });
    });
  }).catch(function () { box.innerHTML = '<div class="panel"><div class="empty warn"><div class="eic">' + ic('wifiOff') + '</div><h3>โหลดข้อมูลไม่สำเร็จ</h3><p>กรุณาลองใหม่อีกครั้ง</p></div></div>'; });
};

/* ---------- กฎหมายที่บังคับใช้ทั่วประเทศ (รวมทุกหมวดของกฎหมายไทยในฐานข้อมูล) ---------- */
function renderNational(box) {
  var st = S.ui.content; st.nat = st.nat || { q: '', stat: 'in' };
  box.innerHTML = '<div class="skeleton" style="height:90px"></div>';
  Promise.all([S.catalog ? Promise.resolve() : loadCatalog(), loadForeignCountries().then(function (r) { return r.thai2 ? loadIndex(r.thai2.index) : { laws: [] }; }).catch(function () { return { laws: [] }; })]).then(function (rs) {
    if (!box.isConnected) return;
    var t2 = rs[1].laws || [];
    var all = S.catalog.laws.map(function (l) { return { k: 'm', id: l.id, t: l.title, c: l.cat, rep: lawRep(l) }; }).concat(t2.map(function (e) { return { k: 't', id: e[0], t: e[1], c: e[2], rep: /ยกเลิก/.test(e[1]), e: e }; }));
    var nRep = all.filter(function (x) { return x.rep; }).length;
    box.innerHTML = '<div class="panel flat" style="margin-bottom:10px"><div class="small"><b>กฎหมายที่บังคับใช้ทั่วประเทศ</b> — รวมกฎหมายไทยทุกหมวดที่มีในฐานข้อมูลของเว็บไซต์ ' + fmtN(all.length) + ' ฉบับ</div><div class="tiny muted">นับตามข้อมูลที่มีอยู่จริงในฐานข้อมูลนี้ (ฐานหลัก ' + fmtN(S.catalog.laws.length) + ' ฉบับ + กฎหมายลำดับรอง ' + fmtN(t2.length) + ' ฉบับ) สถานะ “ยกเลิกแล้ว” ระบุตามชื่อหรือสถานะในแหล่งข้อมูล</div></div>' +
      statSeg('natStat', st.nat.stat || '', all.length, all.length - nRep, nRep) +
      '<div class="input" style="margin-top:10px">' + ic('search') + '<input id="natQ" placeholder="พิมพ์ชื่อกฎหมาย" value="' + esc(st.nat.q || '') + '"></div><div id="natRes" style="margin-top:12px"></div>';
    var res = $('#natRes', box), list = [], shown = 0;
    function compute() { var q = norm(st.nat.q || ''); list = all.filter(function (x) { if (st.nat.stat === 'in' && x.rep) return false; if (st.nat.stat === 'rep' && !x.rep) return false; return !q || norm(x.t).indexOf(q) > -1; }); }
    function draw(reset) {
      if (reset) { shown = 0; res.innerHTML = ''; }
      if (!list.length) { res.innerHTML = '<div class="panel"><div class="empty"><div class="eic">' + ic('search') + '</div><h3>ไม่พบกฎหมายตามเงื่อนไข</h3></div></div>'; return; }
      var next = list.slice(shown, shown + 50); shown += next.length;
      var mb = $('#natMore', res); if (mb) mb.remove();
      res.insertAdjacentHTML('beforeend', (shown === next.length ? '<div class="group-h">รายการ <span class="cnt">' + fmtN(list.length) + ' ฉบับ</span></div>' : '') + next.map(function (x) { return '<button class="law-item" data-bd="1" ' + (x.k === 'm' ? 'data-law="' + esc(x.id) + '"' : 'data-nt2="' + esc(x.id) + '"') + '><span class="li-ic">' + ic(x.k === 'm' ? (CAT_ICON[x.c] || 'file') : 'file') + '</span><span class="grow"><span class="li-t">' + esc(x.t) + '</span> ' + statusBadge(x.rep) + '<br><span class="li-s">' + esc(x.c) + '</span></span>' + ic('chevR') + '</button>'; }).join('') + (shown < list.length ? '<button class="btn block" id="natMore" style="margin-top:10px">แสดงเพิ่มเติม (' + fmtN(list.length - shown) + ' ฉบับ)</button>' : ''));
      var m2 = $('#natMore', res); if (m2) m2.onclick = function () { draw(false); };
    }
    compute(); draw(true);
    on($('#natStat', box), 'click', '[data-s]', function (e, b) { st.nat.stat = b.getAttribute('data-s'); store.set('ui', S.ui); $$('#natStat button', box).forEach(function (x) { x.classList.toggle('on', x === b); }); compute(); draw(true); });
    $('#natQ', box).addEventListener('input', debounce(function () { st.nat.q = this.value.trim(); store.set('ui', S.ui); compute(); draw(true); }, 250));
    on(res, 'click', '[data-nt2]', function (e, b) { var id = b.getAttribute('data-nt2'), x = list.filter(function (y) { return y.id === id; })[0]; if (!x) return; openForeignLaw({ code: 'TH2', name: 'กฎหมายไทยลำดับรอง' }, id, { k: 'r', o: x.e[3], n: x.e[4] }, { title: x.t, repealed: x.rep }); });
  });
}

/* ---------- ประกอบเข้ากับหน้าเนื้อหาเดิม ---------- */
(function () {
  var baseContent = VIEWS.content;
  VIEWS.content = function (el) {
    var st = S.ui.content || (S.ui.content = { cat: '', q: '', law: '' });
    baseContent(el);
    var chips = $('#catChips', el); if (!chips) return;
    if (!$('[data-nat]', chips)) chips.insertAdjacentHTML('beforeend', '<button class="chip" data-nat="1" role="tab">' + ic('flag') + 'กฎหมายที่บังคับใช้ทั่วประเทศ</button>');
    var nat = $('[data-nat]', chips);
    function markNat() { nat.classList.toggle('on', !st.foreign && st.cat === 'NAT'); }
    nat.onclick = function () { tap(); $$('#catChips .chip', el).forEach(function (c) { c.classList.toggle('on', c === nat); }); st.cat = 'NAT'; st.scope = 'th'; st.foreign = false; st.law = ''; store.set('ui', S.ui); renderNational($('#ctBody', el)); syncClear(); };
    on(chips, 'click', '[data-cat]', function () { st.sub = ''; st.stat = ''; nat.classList.remove('on'); if (CATS.indexOf(st.cat) > -1) thaiCatBody(el); syncClear(); });
    /* ปุ่ม “ล้าง” แยกกฎหมายไทย / ต่างประเทศ (แสดงเฉพาะกลุ่มที่กำลังเลือก) */
    var head = $('.view-head', el), adv = $('#advBtn', el);
    if (head && adv && !$('#thClear', el)) {
      var grp = document.createElement('div'); grp.className = 'vh-act9'; adv.parentNode.insertBefore(grp, adv);
      grp.insertAdjacentHTML('beforeend', '<button class="btn sm clr9 hidden" id="thClear" title="ล้างการเลือกกฎหมายไทย">' + ic('x') + ' ล้าง</button><button class="btn sm clr9 hidden" id="fgClear" title="ล้างการเลือกกฎหมายต่างประเทศ">' + ic('x') + ' ล้าง</button>');
      grp.appendChild(adv); var lp = document.getElementById('lawPrint'); if (lp) grp.appendChild(lp);
    }
    function syncClear() { var a = $('#thClear', el), b = $('#fgClear', el); if (!a) return; a.classList.toggle('hidden', !!st.foreign || st.scope !== 'th'); b.classList.toggle('hidden', !st.foreign); }
    $('#thClear', el).onclick = function () { st.cat = ''; st.sub = ''; st.stat = ''; st.q = ''; st.law = ''; st.t2 = { q: '', type: '', stat: '' }; st.nat = { q: '', stat: 'in' }; st.inLaw = ''; store.set('ui', S.ui); $$('#catChips .chip', el).forEach(function (c) { c.classList.remove('on'); }); var pb = document.getElementById('lawPrint'); if (pb) pb.remove(); $('#ctBody', el).innerHTML = TH_PROMPT.replace('__IC__', ic('layers')); toast('ล้างการเลือกแล้ว', 'โปรดเลือกหมวดกฎหมายใหม่', 'ok'); };
    $('#fgClear', el).onclick = function () { st.fc = ''; st.fg = ''; st.fq = ''; st.ff = 'all'; store.set('ui', S.ui); renderForeign($('#ctBody', el)); toast('ล้างการเลือกแล้ว', 'โปรดเลือกกลุ่มประเทศหรือประเทศใหม่', 'ok'); };
    on(el, 'click', '[data-scope]', function () { setTimeout(syncClear, 0); });
    syncClear();
    if (st.foreign || st.law) return;
    if (st.cat === 'NAT') { markNat(); renderNational($('#ctBody', el)); }
    else if (st.scope === 'th' && CATS.indexOf(st.cat) > -1) thaiCatBody(el);
    else if (st.scope === 'th' && !st.cat) $('#ctBody', el).innerHTML = TH_PROMPT.replace('__IC__', ic('layers'));
  };
})();

/* ---------- อ่านอย่างเดียว (ไม่มีป้ายพลิก ไม่มีป้ายวรรค/อนุมาตรา) สำหรับกฎหมายที่ไม่ใช่ประมวลกฎหมาย — ข้อความตามต้นฉบับ ชิดซ้าย ---------- */
function docSecHtml(s) {
  var label = s.no === 'ฉบับเต็ม' ? '' : (/^\d/.test(String(s.no)) ? 'มาตรา ' + thd(s.no) : String(s.no));
  return '<section class="doc-sec" id="ds-' + esc(s.id) + '">' + (label ? '<h4>' + esc(label) + '</h4>' : '') + '<div class="doc-text">' + esc(String(s.text || '').replace(/\r/g, '')) + '</div></section>';
}
(function () {
  var baseRenderLaw = renderLaw;
  renderLaw = function (box, l) {
    baseRenderLaw(box, l);
    if (!l || l.cat === 'ประมวลกฎหมาย') return;
    var cb = $('#cardsBox', box); if (!cb) return;
    var secs = (SECS_BY_LAW[l.id] || []).slice(); if (!secs.length) return;
    box.classList.add('doc-mode');
    var sort = $('#lawSort', box); if (sort) sort.remove();
    var toc = box.querySelector('details.toc'); if (toc) toc.remove();
    var old = $('#inLawQ', box), inp = null;
    if (old) { inp = old.cloneNode(true); inp.placeholder = 'ค้นหาข้อความในกฎหมายฉบับนี้'; old.parentNode.replaceChild(inp, old); }
    var shown = 0, list = secs;
    function draw(reset) {
      if (reset) { shown = 0; cb.innerHTML = '<article class="doc9 panel"><div class="doc-h"><h3>' + esc(l.title) + '</h3>' + statusBadge(lawRep(l)) + '</div><div id="docBody"></div></article>'; }
      var body = $('#docBody', cb); if (!body) return;
      if (!list.length) { body.innerHTML = '<p class="muted small">ไม่พบข้อความที่ค้นหาในกฎหมายฉบับนี้</p>'; return; }
      var next = list.slice(shown, shown + 80); shown += next.length;
      var mb = $('#docMore', cb); if (mb) mb.remove();
      body.insertAdjacentHTML('beforeend', next.map(docSecHtml).join(''));
      if (shown < list.length) cb.insertAdjacentHTML('beforeend', '<button class="btn block" id="docMore" style="margin-top:10px">แสดงต่อ (' + fmtN(list.length - shown) + ' มาตรา)</button>');
      var m2 = $('#docMore', cb); if (m2) m2.onclick = function () { draw(false); };
    }
    if (inp) inp.addEventListener('input', debounce(function () { var q = norm(thaiDigitsToArabic(inp.value.trim())); list = q ? secs.filter(function (s) { return norm(s.text).indexOf(q) > -1 || String(s.no) === thaiDigitsToArabic(inp.value.trim()).replace(/^(มาตรา|ม\.)\s*/, ''); }) : secs; draw(true); }, 200));
    draw(true);
  };
  var basePrintThai = printThaiLaw;
  printThaiLaw = function (l) {
    PRINT_SRC = l.source || l.src || 'สำนักงานคณะกรรมการกฤษฎีกา / ชุดข้อมูลเปิดที่ระบุในเว็บไซต์';
    if (!l || l.cat === 'ประมวลกฎหมาย') return basePrintThai(l);
    var secs = (SECS_BY_LAW[l.id] || []).slice();
    if (!secs.length) { toast('ยังโหลดตัวบทไม่เสร็จ', 'กรุณารอสักครู่แล้วลองอีกครั้ง', 'warn'); return; }
    printPicker(l.title, secs.map(function (s) { return { label: s.no === 'ฉบับเต็ม' ? 'ตัวบทฉบับเต็ม' : 'มาตรา ' + s.no + ' ' + (s.name || ''), group: s.head || '' }; }), function (sel) {
      var body = sel.map(function (i) { var s = secs[i]; return '<div class="sec">' + (s.no === 'ฉบับเต็ม' ? '' : '<h3>มาตรา ' + esc(thd(s.no)) + '</h3>') + '<div class="pre">' + esc(s.text) + '</div></div>'; }).join('');
      printDoc(l.title, 'สถานะ: ' + (lawRep(l) ? 'ยกเลิกแล้ว' : 'มีผลบังคับใช้'), body);
    });
  };
})();
</script>
<script>
/* =========================================================================
 *  การพิมพ์เอกสาร (ทุกปุ่ม “พิมพ์” ของเนื้อหา): โลโก้ขนาดมาตรฐาน ชื่อไทยก่อนอังกฤษ ชื่อเรื่อง 18 pt เนื้อหา 16 pt (TH Sarabun New)
 *  หัวกระดาษ: วันที่ เวลา (ชั่วโมง:นาที:วินาที) และชื่อผู้ใช้งาน / ท้ายกระดาษ: แหล่งข้อมูล + หมายเหตุ / เลขหน้ากึ่งกลางด้านล่าง
 *  หน้าสุดท้าย: ข้อมูลเว็บไซต์และข้อควรทราบตามพระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์
 * ========================================================================= */
var PRINT_SRC = '';
function printStamp() {
  var d = new Date(), p2 = function (n) { return ('0' + n).slice(-2); };
  return 'วันที่ ' + d.getDate() + ' ' + TH_MONTHS[d.getMonth()] + ' ' + (d.getFullYear() + 543) + ' เวลา ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()) + ' น.';
}
function cssStr(s) { return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\A ') + '"'; }
function shortSrc(src) {
  src = String(src || '').replace(/^\s*ที่มา\s*:\s*/, '');
  if (/กฤษฎีกา|OCS|Krisdika/i.test(src)) return 'สำนักงานคณะกรรมการกฤษฎีกา';
  if (/วิกิซอร์ซ|wikisource/i.test(src)) return 'ราชกิจจานุเบกษา (ถอดความโดยวิกิซอร์ซ)';
  if (/ศาลฎีกา|deka/i.test(src)) return 'ศาลฎีกา (deka.supremecourt.or.th)';
  if (/NitiBench/i.test(src)) return 'ชุดข้อมูล NitiBench (ตัวบทฉบับปรับปรุงของสำนักงานคณะกรรมการกฤษฎีกา)';
  if (/thailaw|PyThaiNLP/i.test(src)) return 'ชุดข้อมูลกฎหมายไทย PyThaiNLP';
  if (/uscode|United States Code/i.test(src)) return 'United States Code (uscode.house.gov)';
  if (/Wikidata/i.test(src)) return 'Wikidata';
  return src.length > 70 ? src.slice(0, 70) + '…' : (src || 'ฐานข้อมูลเว็บไซต์');
}
printDoc = function (titleTh, titleEn, bodyHtml) {
  var who = (S.member && (S.member.username || S.member.displayName)) || 'ผู้เยี่ยมชม', stamp = printStamp();
  var srcFull = String(PRINT_SRC || 'ฐานข้อมูลเว็บไซต์ “คลังกฎหมาย”').replace(/^\s*ที่มา\s*:\s*/, ''); PRINT_SRC = '';
  var srcShort = shortSrc(srcFull);
  var html = '<!doctype html><html lang="th"><head><meta charset="utf-8"><title>' + esc(titleTh) + ' — คลังกฎหมาย</title><style>' + fontFace() +
    '@page{size:A4;margin:1.4cm 2cm 1.6cm 2.5cm;@bottom-center{content:"หน้า " counter(page) " / " counter(pages);font-family:"TH Sarabun New","TH SarabunPSK",sans-serif;font-size:16pt;vertical-align:top}}' +
    '*{font-family:"TH Sarabun New","TH SarabunPSK","TH Sarabun PSK",sans-serif !important;font-size:16pt;letter-spacing:0;word-spacing:normal}' +
    'body{margin:0;color:#000;line-height:1.35;font-size:16pt}' +
    'table.pg{width:100%;border-collapse:collapse}table.pg>thead td,table.pg>tfoot td{border:0;padding:0}' +
    '.rh{border-bottom:0.75pt solid #000;padding:0 0 2pt;margin-bottom:8pt;display:flex;justify-content:space-between;gap:8pt}' +
    '.rf{border-top:0.75pt solid #000;padding:2pt 0 0;margin-top:8pt}.rf .nt{display:block}' +
    '.hd{text-align:center;margin:0 0 8pt}.hd img{width:1.5cm;height:1.5cm;border-radius:50%;object-fit:contain}.hd .n1{font-weight:bold}' +
    '.hd .t1{font-size:18pt;font-weight:bold;margin-top:4pt;line-height:1.25}' +
    'h2{font-size:18pt;font-weight:bold;margin:10pt 0 2pt;page-break-after:avoid}h3,h4{font-size:16pt;font-weight:bold;margin:6pt 0 0;page-break-after:avoid}' +
    'p{margin:0 0 2pt;text-align:left;text-indent:0}.sec{margin:0 0 6pt}p.item{padding-left:1.5em}p.item.sub{padding-left:3em}.wk{font-weight:bold;margin-right:4pt}.pre{white-space:pre-line;text-align:left}' +
    '.tr9{margin:2pt 0 4pt 0;padding-left:8pt;border-left:1.5pt solid #555}.tr9 b{font-weight:bold}' +
    'table.dt{border-collapse:collapse;width:100%}table.dt td,table.dt th{border:0.75pt solid #444;padding:1pt 4pt;text-align:left}' +
    '.fin{page-break-before:always}.fin h2{text-align:center}.fin p{margin:0 0 4pt}</style></head><body>' +
    '<table class="pg"><thead><tr><td><div class="rh"><span>พิมพ์เมื่อ ' + esc(stamp) + '</span><span>ผู้ใช้งาน: ' + esc(who) + '</span></div></td></tr></thead>' +
    '<tfoot><tr><td><div class="rf"><span>ที่มา: ' + esc(srcShort) + ' (เว็บไซต์ “คลังกฎหมาย”)</span><span class="nt">หมายเหตุ: หากนำไปใช้ในการทำงานหรือการสอบ โปรดตรวจสอบตัวบทฉบับล่าสุดกับราชกิจจานุเบกษาและเว็บไซต์ทางการที่ปรับปรุงข้อมูลเป็นปัจจุบัน</span></div></td></tr></tfoot><tbody><tr><td>' +
    '<div class="hd"><img src="' + LOGO + '" alt=""><div class="n1">คลังกฎหมาย</div><div>THAI LAW LIBRARY</div><div class="t1">' + esc(titleTh) + '</div>' + (titleEn ? '<div>' + esc(titleEn) + '</div>' : '') + '</div>' +
    bodyHtml +
    '<section class="fin"><h2>ข้อมูลเว็บไซต์และข้อควรทราบ</h2>' +
    '<p><b>เว็บไซต์:</b> คลังกฎหมาย (THAI LAW LIBRARY) — ' + esc((typeof BOOT !== 'undefined' && BOOT.url) || location.href.split('#')[0]) + '</p>' +
    '<p><b>พิมพ์เมื่อ:</b> ' + esc(stamp) + ' <b>ผู้ใช้งาน:</b> ' + esc(who) + '</p>' +
    '<p><b>แหล่งข้อมูลของเอกสารนี้:</b> ' + esc(srcFull) + '</p>' +
    '<p><b>หมายเหตุ:</b> เอกสารนี้จัดทำจากฐานข้อมูลของเว็บไซต์เพื่อการศึกษาและค้นคว้า หากจะนำไปใช้ในการปฏิบัติงาน การดำเนินคดี หรือการสอบ โปรดตรวจสอบตัวบทฉบับล่าสุดกับแหล่งทางการ ได้แก่ ราชกิจจานุเบกษา (ratchakitcha.soc.go.th) และสำนักงานคณะกรรมการกฤษฎีกา (krisdika.go.th) สำหรับคำพิพากษาโปรดตรวจสอบกับศาลฎีกา (deka.supremecourt.or.th) เนื่องจากกฎหมายอาจมีการแก้ไขเพิ่มเติมหลังวันที่ข้อมูลในเว็บไซต์ปรับปรุงล่าสุด</p>' +
    '<p><b>ข้อควรทราบตามพระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ พ.ศ. 2550 และที่แก้ไขเพิ่มเติม:</b> ห้ามนำเอกสารนี้ไปดัดแปลง ปลอมแปลง หรือนำเข้าสู่ระบบคอมพิวเตอร์ซึ่งข้อมูลอันเป็นเท็จในลักษณะที่น่าจะเกิดความเสียหายแก่ผู้อื่นหรือประชาชน การเข้าถึงหรือใช้งานระบบของเว็บไซต์โดยมิชอบเป็นความผิดตามกฎหมาย และข้อมูลส่วนบุคคลได้รับการคุ้มครองตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562</p>' +
    '<p>เอกสารฉบับนี้พิมพ์จากเว็บไซต์ “คลังกฎหมาย” โดยผู้ใช้งานที่ระบุข้างต้น</p></section></td></tr></tbody></table></body></html>';
  printHtml(html);
};
(function () {
  var baseOfficial = officialPdf;
  officialPdf = function (action, text) { return baseOfficial(action, text); };
})();
</script>
<script>
/* =========================================================================
 *  กฎหมายต่างประเทศ: ธง + ตัวกรองเลื่อนแนวนอนบนมือถือ + แปลภาษา 6 ภาษา + พิมพ์พร้อม/ไม่พร้อมคำแปล
 * ========================================================================= */
var TR9 = { on: false, lang: 'th', cache: {}, busy: false, obs: null };
var TR_LIST = [['th', 'ภาษาไทย'], ['en', 'English'], ['ja', '日本語 (ญี่ปุ่น)'], ['zh-CN', '中文 (จีน)'], ['ko', '한국어 (เกาหลีใต้)'], ['es', 'Español (สเปน)']];
function trLabel(l) { var x = TR_LIST.filter(function (y) { return y[0] === l; })[0]; return x ? x[1] : l; }
function artText(a) { return [a.cap || ''].concat((a.paras || []).map(function (p) { return [p.s].concat((p.items || []).map(function itemTxt(it) { return [(it.t || '') + ' ' + (it.s || '')].concat((it.sub || []).map(itemTxt)).join('\n'); })).join('\n'); })).filter(String).join('\n'); }
function trTranslateVisible() {
  if (!TR9.on || TR9.busy || !FV_LAST) return;
  var lang = TR9.lang, arts = FV_LAST.articles || [], C = TR9.cache[lang] = TR9.cache[lang] || {};
  var nodes = $$('.fv-reader .fv-art').filter(function (n) { return n.getAttribute('data-trd') !== lang; }).slice(0, 25);
  var need = nodes.filter(function (n) { return C[n.getAttribute('data-ai')] === undefined; });
  var paint = function () { nodes.forEach(function (n) { var i = n.getAttribute('data-ai'), t = C[i], box = n.querySelector('.fv-trans'); if (!box || t === undefined) return; n.setAttribute('data-trd', lang); box.innerHTML = t === null ? '<p class="tiny muted">แปลส่วนนี้ไม่สำเร็จ กรุณากด “แปลภาษา” อีกครั้ง</p>' : '<div class="trx"><div class="trx-h">' + ic('globe') + ' คำแปล (' + esc(trLabel(lang)) + ')</div>' + String(t).split(/\n+/).map(function (s) { return '<p>' + esc(s) + '</p>'; }).join('') + '</div>'; box.classList.remove('hidden'); }); };
  if (!need.length) { paint(); return; }
  TR9.busy = true; var st = document.getElementById('trState'); if (st) st.textContent = 'กำลังแปล…';
  api('translate', { to: lang, texts: need.map(function (n) { return artText(arts[+n.getAttribute('data-ai')] || {}).slice(0, 5000); }) }, { timeout: 120000 }).then(function (r) {
    need.forEach(function (n, k) { C[n.getAttribute('data-ai')] = r.texts[k]; });
    TR9.busy = false; if (st && st.isConnected) st.textContent = r.note || '';
    if (TR9.on && TR9.lang === lang) { paint(); setTimeout(trTranslateVisible, 50); }
  }).catch(function (e) { TR9.busy = false; if (st && st.isConnected) st.textContent = 'แปลไม่สำเร็จ: ' + ((e && e.msg) || 'กรุณาลองใหม่'); });
}
function trOff() { TR9.on = false; $$('.fv-reader .fv-art').forEach(function (n) { n.removeAttribute('data-trd'); var b = n.querySelector('.fv-trans'); if (b) { b.innerHTML = ''; b.classList.add('hidden'); } }); var st = document.getElementById('trState'); if (st) st.textContent = 'ยกเลิกการแปลแล้ว — แสดงเฉพาะตัวบทภาษาต้นฉบับ'; var o = document.getElementById('trOff'); if (o) o.disabled = true; }
function mountTranslateBar(reader) {
  if (!reader || reader.querySelector('#trBar') || FV_CC === 'TH2') return;
  var anchor = reader.querySelector('.fv-top'); if (!anchor) return;
  anchor.insertAdjacentHTML('afterend', '<div class="tr-bar" id="trBar"><span class="tr-ic">' + ic('globe') + '</span><select id="trLang" aria-label="เลือกภาษาที่จะแปล">' + TR_LIST.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === TR9.lang ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select><button class="btn sm k" id="trGo">แปลภาษา</button><button class="btn sm" id="trOff" disabled>ยกเลิกแปลภาษา</button><span class="tiny muted" id="trState"></span></div>');
  $('#trGo', reader).onclick = function () { TR9.lang = $('#trLang', reader).value; TR9.on = true; $('#trOff', reader).disabled = false; $$('.fv-reader .fv-art').forEach(function (n) { if (n.getAttribute('data-trd') !== TR9.lang) n.removeAttribute('data-trd'); }); trTranslateVisible(); };
  $('#trOff', reader).onclick = trOff;
  if (TR9.obs) TR9.obs.disconnect();
  TR9.obs = new MutationObserver(debounce(function () { if (TR9.on) trTranslateVisible(); }, 300));
  TR9.obs.observe(reader, { childList: true, subtree: true });
}
function printForeign(c) {
  if (!FV_LAST) { toast('กำลังโหลดตัวบท', 'กรุณารอสักครู่', ''); return; }
  var law = FV_LAST, arts = law.articles || [];
  var go = function (withTr) {
    printPicker(law.title, arts.map(function (a) { return { label: (a.no || '') + ' ' + (a.cap || ''), group: a.head || '' }; }), function (sel) {
      var C = TR9.cache[TR9.lang] || {}, lastHead = null;
      var body = sel.map(function (i) {
        var a = arts[i], hh = a.head && a.head !== lastHead ? '<h2>' + esc(a.head) + '</h2>' : ''; lastHead = a.head;
        return hh + '<div class="sec"><h3>' + esc(a.no || '') + ' ' + esc(a.cap || '') + '</h3>' + (a.paras || []).map(function (p) { return '<p>' + esc(p.s) + '</p>' + (p.items || []).map(function (it) { return fvItemPlain(it, 0); }).join(''); }).join('') +
          (withTr && C[i] ? '<div class="tr9"><b>คำแปล (' + esc(trLabel(TR9.lang)) + '):</b>' + String(C[i]).split(/\n+/).map(function (s) { return '<p>' + esc(s) + '</p>'; }).join('') + '</div>' : '') + '</div>';
      }).join('');
      PRINT_SRC = law.source || 'ชุดข้อมูลเปิดของแหล่งทางการประเทศ ' + (c.name || '');
      printDoc(law.title, (c.name || '') + (FV_META && FV_META.repealed ? ' · ยกเลิกแล้ว' : ' · มีผลบังคับใช้') + (withTr ? ' · พร้อมคำแปล (' + trLabel(TR9.lang) + ') แปลโดยเครื่องเพื่อประกอบการศึกษา' : ''), body);
    });
  };
  if (TR9.on && Object.keys(TR9.cache[TR9.lang] || {}).length) {
    modal({ title: 'รวมคำแปลในไฟล์ PDF หรือไม่', icon: 'globe', ok: 'ตกลง (รวมคำแปล)', cancel: 'ยกเลิก (ไม่รวมคำแปล)', html: '<p>ท่านเปิดการแปลเป็น' + esc(trLabel(TR9.lang)) + 'อยู่ ต้องการพิมพ์คำแปลต่อท้ายตัวบทแต่ละมาตราหรือไม่ (เฉพาะมาตราที่แปลแล้ว)</p>' }).then(function (ok) { go(!!ok); });
  } else go(false);
}
(function () {
  var baseOpen = openForeignLaw;
  openForeignLaw = function (c, id, entry, meta) {
    TR9.on = false; TR9.cache = {};
    baseOpen(c, id, entry, meta);
    var reader = document.querySelector('.fv-reader');
    if (!reader) return;
    var t = reader.querySelector('.fv-title .tag'); if (t && c.code && c.code !== 'TH2' && !reader.querySelector('.fv-title .flag')) t.insertAdjacentHTML('beforebegin', flagImg(c.code, 'sm'));
    mountTranslateBar(reader);
    var pb = reader.querySelector('[data-fvp]'); if (pb) pb.onclick = function () { printForeign(c); };
  };
  var baseForeign = renderForeign;
  renderForeign = function (box) {
    baseForeign(box);
    var fix = function () {
      var t = box.querySelector('.panel.flat .tiny.muted'); if (t && /195 ประเทศ/.test(t.textContent)) t.textContent = 'ประเทศทั่วโลก 197 ประเทศ = รัฐสมาชิกสหประชาชาติ 193 ประเทศ + รัฐผู้สังเกตการณ์ 2 ประเทศ (นครรัฐวาติกัน และปาเลสไตน์) + รัฐที่ได้รับการรับรองบางส่วน 2 ประเทศ (ไต้หวัน และคอซอวอ) — ในจำนวนนี้ประเทศไทยแสดงแยกในหมวดกฎหมายประเทศไทย';
      $$('.fgn-card[data-fc]', box).forEach(function (b) { var c = (WORLD && WORLD.countries || []).filter(function (x) { return x.cc === b.getAttribute('data-fc'); })[0]; if (c && c.un === 'partial' && !b.querySelector('.st-badge.obs')) { var bb = b.querySelector('b'); if (bb) bb.insertAdjacentHTML('afterend', ' <span class="st-badge obs">ได้รับการรับรองบางส่วน</span>'); } });
    };
    var n = 0, t = setInterval(function () { n++; if (!box.isConnected || n > 40) return clearInterval(t); if (box.querySelector('.fgn-card')) { fix(); clearInterval(t); } }, 100);
  };
  var baseCountry = renderCountry;
  renderCountry = function (box, c) {
    baseCountry(box, c);
    var tag = box.querySelector('.panel .tag'); if (tag && c.cc && !box.querySelector('.panel .flag')) tag.insertAdjacentHTML('beforebegin', flagImg(c.cc, 'sm'));
    var seg = $('#fcF', box); if (seg) seg.classList.add('seg-scroll');
  };
})();
</script>
