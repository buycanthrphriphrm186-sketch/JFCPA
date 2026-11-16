<script>
/* ==========================================================================
   v5: เลือก “กฎหมายประเทศไทย / กฎหมายต่างประเทศ”, กฎหมายไทยลำดับรอง, ดัชนีกฎหมายต่างประเทศครบทุกประเทศ
   (ดัชนีโหลดครั้งเดียวต่อการเปิดเว็บ ค้นหาในเครื่อง ไม่แสดงรายการทั้งหมดจนกว่าจะพิมพ์หรือเลือกประเภท)
   ========================================================================== */
var IDX_CACHE = {}, PUB_STATS = null;
function loadPubStats() {
  if (PUB_STATS) return Promise.resolve(PUB_STATS);
  return api('publicStats', {}, { timeout: 30000, noRetry: true }).then(function (d) { PUB_STATS = d; return d; });
}
/* โหลดดัชนี .json.gz จากคลังข้อมูลของโครงการ (CDN ของ GitHub) แล้วคลายบีบอัดในเบราว์เซอร์ */
function loadIndex(url) {
  if (IDX_CACHE[url]) return IDX_CACHE[url];
  IDX_CACHE[url] = fetch(url, { cache: 'force-cache' }).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    if (typeof DecompressionStream === 'undefined') throw new Error('nodecomp');
    return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).json();
  }).catch(function (e) { delete IDX_CACHE[url]; throw e; });
  return IDX_CACHE[url];
}
function idxSearch(laws, q, opt) {
  opt = opt || {};
  var out = [], nq = norm(q || '');
  var exps = q ? expandQuery(q).map(norm).filter(Boolean) : [];
  for (var i = 0; i < laws.length && out.length < 5000; i++) {
    var e = laws[i];
    if (opt.type && e[2] !== opt.type) continue;
    if (!nq) { out.push(e); continue; }
    var hay = norm(e[1]);
    if (hay.indexOf(nq) > -1 || exps.some(function (x) { return hay.indexOf(x) > -1; }) || String(e[0]).toLowerCase() === String(q).toLowerCase()) out.push(e);
  }
  if (nq) {
    var sc = function (e) { var hy = norm(e[1]); return hy === nq ? 0 : hy.indexOf(nq) === 0 ? 1 : hy.indexOf(nq) > -1 ? 2 + hy.length / 1000 : 9; };
    out = out.map(function (e, i) { return [sc(e), i, e]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }).map(function (x) { return x[2]; });
  }
  return out.slice(0, opt.limit || 400);
}

/* ซ่อนกฎหมายที่ยังไม่มีตัวบทในฐานข้อมูลหลัก (ไม่แสดงข้อความ “ไม่มีข้อมูล”) */
(function () {
  var baseIdx = indexCatalog;
  indexCatalog = function () {
    baseIdx.apply(this, arguments);
    if (S.catalog && S.catalog.laws) S.catalog.laws = S.catalog.laws.filter(function (l) { return l.n > 0 || (SECS_BY_LAW[l.id] || []).length > 0; });
  };
  if (S.catalog) indexCatalog();
})();

/* ---------------- หน้าเนื้อหา: ตัวเลือกหลัก 2 ตัว ---------------- */
(function () {
  var baseContent = VIEWS.content;
  VIEWS.content = function (el) {
    var st = S.ui.content || (S.ui.content = { cat: '', q: '', law: '' });
    baseContent(el);
    var chips = $('#catChips', el), fgnEntry = $('.fgn-entry', el); if (!chips) return;
    if (fgnEntry) fgnEntry.classList.add('hidden');
    var sw = h('<div class="law-scope" role="tablist" aria-label="เลือกกลุ่มกฎหมาย"><button class="scope-btn" data-scope="th" role="tab">' + ic('scale') + '<span><b>กฎหมายประเทศไทย</b><small id="scopeThN"></small></span></button><button class="scope-btn" data-scope="fg" role="tab">' + ic('globe') + '<span><b>กฎหมายต่างประเทศ</b><small id="scopeFgN"></small></span></button></div>');
    chips.parentNode.insertBefore(sw, chips);
    var th2 = h('<button class="chip" data-th2="1" role="tab">' + ic('layers') + 'กฎหมายลำดับรองและอื่น ๆ</button>');
    chips.appendChild(th2);
    function mark() {
      var scope = st.foreign ? 'fg' : (st.scope || '');
      $$('.scope-btn', el).forEach(function (b) { var on_ = b.getAttribute('data-scope') === scope; b.classList.toggle('on', on_); b.setAttribute('aria-selected', String(on_)); });
      chips.classList.toggle('hidden', scope !== 'th');
      th2.classList.toggle('on', scope === 'th' && st.cat === 'TH2');
    }
    loadPubStats().then(function (d) {
      var a = $('#scopeThN', el), b = $('#scopeFgN', el); if (!a) return;
      a.textContent = fmtN(d.thaiTotal || d.laws) + ' ฉบับ';
      var fg = 0; Object.keys(d.foreignDetail || {}).forEach(function (k) { fg += d.foreignDetail[k].laws || 0; }); b.textContent = fmtN(fg) + ' ฉบับ · ' + Object.keys(d.foreignDetail || {}).length + ' ประเทศ';
    }).catch(function () {});
    on(sw, 'click', '[data-scope]', function (e, b) {
      tap(); SND.click();
      var sc = b.getAttribute('data-scope');
      if (sc === 'fg') { st.foreign = true; st.scope = 'fg'; store.set('ui', S.ui); mark(); renderForeign($('#ctBody', el)); }
      else { st.foreign = false; st.scope = 'th'; if (st.cat === 'TH2') st.cat = ''; store.set('ui', S.ui); mark(); refreshCurrent(); }
    });
    on(chips, 'click', '[data-cat]', function () { st.scope = 'th'; st.foreign = false; mark(); });
    th2.onclick = function () { tap(); SND.click(); $$('#catChips .chip', el).forEach(function (c) { c.classList.toggle('on', c === th2); }); st.cat = 'TH2'; st.scope = 'th'; st.foreign = false; store.set('ui', S.ui); mark(); renderThai2($('#ctBody', el)); };
    if (!st.scope && st.cat) st.scope = 'th';
    mark();
    if (st.foreign) return;
    if (st.cat === 'TH2') renderThai2($('#ctBody', el));
    else if (!st.scope) $('#ctBody', el).innerHTML = '<div class="panel"><div class="empty"><div class="eic">' + ic('layers') + '</div><h3>กรุณาเลือกกลุ่มกฎหมาย</h3><p>เลือก “กฎหมายประเทศไทย” เพื่อเลือกหมวดกฎหมายไทย หรือ “กฎหมายต่างประเทศ” เพื่อเลือกประเทศ แล้วจึงเลือกกฎหมายแต่ละฉบับ</p></div></div>';
  };
})();

/* ---------------- กฎหมายไทยลำดับรอง (พระราชกฤษฎีกา กฎกระทรวง ประกาศ ระเบียบ ข้อบังคับ ฯลฯ) ---------------- */
function renderThai2(box) {
  var st = S.ui.content; st.t2 = st.t2 || { q: '', type: '' };
  box.innerHTML = '<div class="skeleton" style="height:90px"></div>';
  loadForeignCountries().then(function (r) {
    if (!r.thai2) throw new Error('noidx');
    var types = Object.keys(r.thai2.types || {}).sort(function (a, b) { return r.thai2.types[b] - r.thai2.types[a]; });
    box.innerHTML = '<div class="panel flat" style="margin-bottom:12px"><div class="small"><b>กฎหมายลำดับรองและอื่น ๆ</b> ' + fmtN(r.thai2.laws) + ' ฉบับ · ' + fmtN(r.thai2.sections) + ' มาตรา/ข้อ</div><div class="tiny muted">ที่มา: PyThaiNLP thailaw-v1.0 (CC0) รวบรวมจากราชกิจจานุเบกษาและสำนักงานคณะกรรมการกฤษฎีกา — อ่านอย่างเดียว</div></div>' +
      '<div class="hscroll" id="t2Types"><button class="chip ' + (!st.t2.type ? 'on' : '') + '" data-ty="">ทุกประเภท</button>' + types.map(function (t) { return '<button class="chip ' + (st.t2.type === t ? 'on' : '') + '" data-ty="' + esc(t) + '">' + esc(t) + ' <span class="cnt">' + fmtN(r.thai2.types[t]) + '</span></button>'; }).join('') + '</div>' +
      '<div class="input" style="margin-top:10px">' + ic('search') + '<input id="t2Q" placeholder="พิมพ์ชื่อ เช่น กฎกระทรวง ผังเมือง, ประกาศกระทรวงสาธารณสุข" value="' + esc(st.t2.q) + '"></div><div id="t2Res" style="margin-top:12px"></div>';
    var res = $('#t2Res', box), shown = 0, list = [];
    function draw(reset) {
      if (reset) { shown = 0; res.innerHTML = ''; }
      if (!st.t2.q && !st.t2.type) { res.innerHTML = '<div class="panel flat"><p class="small muted">พิมพ์ชื่อกฎหมายหรือเลือกประเภทด้านบน ระบบจะแสดงรายการที่ตรงกัน</p></div>'; return; }
      var next = list.slice(shown, shown + 40); shown += next.length;
      if (!list.length) { res.innerHTML = '<div class="panel"><div class="empty"><div class="eic">' + ic('search') + '</div><h3>ไม่พบกฎหมายที่ค้นหา</h3><p>ลองพิมพ์คำที่สั้นลง หรือเลือกประเภทอื่น</p></div></div>'; return; }
      var mb = $('#t2More', res); if (mb) mb.remove();
      res.insertAdjacentHTML('beforeend', (shown === next.length ? '<div class="group-h">ผลการค้นหา <span class="cnt">' + (list.length >= 400 ? '400+ ' : fmtN(list.length) + ' ') + 'รายการ</span></div>' : '') + next.map(function (e) { return '<button class="law-item" data-t2="' + esc(e[0]) + '"><span class="li-ic">' + ic('file') + '</span><span class="grow"><span class="li-t">' + highlight(esc(e[1]), st.t2.q) + '</span><br><span class="li-s">' + esc(e[2]) + (e[4] ? ' · ' + fmtN(e[4]) + ' ข้อ/มาตรา' : '') + '</span></span>' + ic('chevR') + '</button>'; }).join('') + (shown < list.length ? '<button class="btn block" id="t2More" style="margin-top:10px">แสดงเพิ่มเติม</button>' : ''));
      var m2 = $('#t2More', res); if (m2) m2.onclick = function () { draw(false); };
    }
    function run() {
      if (!st.t2.q && !st.t2.type) { list = []; draw(true); return; }
      res.innerHTML = '<div class="skeleton" style="height:60px"></div>';
      loadIndex(r.thai2.index).then(function (ix) { list = idxSearch(ix.laws, st.t2.q, { type: st.t2.type }); draw(true); res._ix = ix; })
        .catch(function () { res.innerHTML = '<div class="panel"><div class="empty warn"><div class="eic">' + ic('wifiOff') + '</div><h3>ยังโหลดดัชนีไม่สำเร็จ</h3><p>กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต แล้วลองอีกครั้ง</p></div></div>'; });
    }
    on($('#t2Types', box), 'click', '[data-ty]', function (e, b) { st.t2.type = b.getAttribute('data-ty'); store.set('ui', S.ui); $$('#t2Types .chip', box).forEach(function (c) { c.classList.toggle('on', c === b); }); run(); });
    $('#t2Q', box).addEventListener('input', debounce(function () { st.t2.q = this.value.trim(); store.set('ui', S.ui); run(); }, 300));
    on(res, 'click', '[data-t2]', function (e, b) {
      var id = b.getAttribute('data-t2'), ent = list.filter(function (x) { return x[0] === id; })[0]; if (!ent) return;
      openForeignLaw({ code: 'TH2', name: 'กฎหมายไทยลำดับรอง' }, id, { k: 'r', o: ent[3], n: ent[4] }, { title: ent[1] });
    });
    run();
  }).catch(function () { box.innerHTML = '<div class="panel"><div class="empty warn"><div class="eic">' + ic('wifiOff') + '</div><h3>โหลดข้อมูลไม่สำเร็จ</h3><p>กรุณาลองใหม่อีกครั้ง</p></div></div>'; });
}

/* ---------------- กฎหมายต่างประเทศ: ประเทศที่มีดัชนี (ค้นหาในเครื่อง) ---------------- */
var renderCountryV4 = renderCountry, openForeignLawV4 = openForeignLaw;
renderCountry = function (box, c) {
  if (!c.index) return renderCountryV4(box, c);
  var st = S.ui.content;
  box.innerHTML = '<section class="panel corner" style="margin-bottom:14px"><div class="row" style="align-items:flex-start;gap:10px"><button class="icon-btn" id="fcBack" aria-label="กลับไปเลือกประเทศ">' + ic('arrowL') + '</button><div class="grow"><span class="tag">กฎหมายต่างประเทศ · อ่านอย่างเดียว</span><h3 style="margin-top:6px">' + esc(c.name) + ' <span class="muted">' + esc(c.native) + '</span></h3>' +
    '<div class="muted small">' + fmtN(c.count) + ' ฉบับ' + (c.sections ? ' · ' + fmtN(c.sections) + ' มาตรา' : '') + '</div><div class="tiny muted">' + esc(c.source || '') + '</div></div></div>' +
    '<div class="input" style="margin-top:12px">' + ic('search') + '<input id="fcQ" placeholder="พิมพ์ชื่อกฎหมาย (ภาษาต้นฉบับหรือภาษาอังกฤษ)" value="' + esc(st.fq || '') + '"></div></section><div id="fcRes"></div>';
  $('#fcBack', box).onclick = function () { st.fc = ''; st.fq = ''; store.set('ui', S.ui); renderForeign(box); };
  var res = $('#fcRes', box), list = [], shown = 0;
  function draw(reset) {
    if (reset) { shown = 0; res.innerHTML = ''; }
    if (!list.length) { res.innerHTML = '<div class="panel"><div class="empty"><div class="eic">' + ic('search') + '</div><h3>ไม่พบกฎหมายที่ค้นหา</h3><p>ลองพิมพ์ชื่อเป็นภาษาของประเทศนั้น หรือคำที่สั้นลง</p></div></div>'; return; }
    var next = list.slice(shown, shown + 40); shown += next.length;
    var mb = $('#fcMore', res); if (mb) mb.remove();
    res.insertAdjacentHTML('beforeend', (shown === next.length ? '<div class="group-h">' + (st.fq ? 'ผลการค้นหา' : 'กฎหมายฉบับล่าสุด') + ' <span class="cnt">' + (list.length >= 400 ? '400+' : fmtN(list.length)) + ' รายการ</span></div>' : '') + next.map(function (e) { return '<button class="law-item" data-fl="' + esc(e[0]) + '"><span class="li-ic">' + ic('book') + '</span><span class="grow"><span class="li-t">' + highlight(esc(e[1]), st.fq || '') + '</span><br><span class="li-s">' + esc([e[2], e[3], e[6] ? fmtN(e[6]) + ' มาตรา' : '', e[7] && !/^https?:/.test(e[7]) ? e[7] : ''].filter(Boolean).join(' · ')) + '</span></span>' + ic('chevR') + '</button>'; }).join('') + (shown < list.length ? '<button class="btn block" id="fcMore" style="margin-top:10px">แสดงเพิ่มเติม</button>' : ''));
    var m2 = $('#fcMore', res); if (m2) m2.onclick = function () { draw(false); };
  }
  function run() {
    res.innerHTML = '<div class="skeleton" style="height:70px"></div>';
    loadIndex(c.index).then(function (ix) {
      res._ix = ix;
      list = st.fq ? idxSearch(ix.laws, st.fq) : ix.laws.slice().sort(function (a, b) { return String(b[2]).localeCompare(String(a[2])); }).slice(0, 40);
      draw(true);
    }).catch(function () { res.innerHTML = '<div class="panel"><div class="empty warn"><div class="eic">' + ic('wifiOff') + '</div><h3>ยังโหลดดัชนีไม่สำเร็จ</h3><p>กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต แล้วลองอีกครั้ง</p></div></div>'; });
  }
  $('#fcQ', box).addEventListener('input', debounce(function () { st.fq = this.value.trim(); store.set('ui', S.ui); run(); }, 300));
  on(res, 'click', '[data-fl]', function (e, b) {
    var id = b.getAttribute('data-fl'), ent = (res._ix ? res._ix.laws : []).filter(function (x) { return x[0] === id; })[0]; if (!ent) return;
    openForeignLaw(c, id, { k: ent[4], o: ent[5], n: ent[6] }, { title: ent[1], date: ent[2], status: ent[3] });
  });
  run();
};
openForeignLaw = function (c, id, entry, meta) {
  if (!entry) return openForeignLawV4(c, id);
  var origApi = api;
  // ใช้ตัวอ่านเดิม โดยส่งข้อมูลตำแหน่งตัวบทไปกับคำขอ
  api = function (action, payload, opt) { if (action === 'foreignLaw') { payload = Object.assign({}, payload, { entry: entry }, meta || {}); api = origApi; } return origApi(action, payload, opt); };
  try { openForeignLawV4(c, id); } finally { setTimeout(function () { if (api !== origApi) api = origApi; }, 0); }
};

/* ---------------- หน้าหลัก: จำนวนกฎหมายในฐานข้อมูล (ไทย + ต่างประเทศ) ---------------- */
(function () {
  var baseHome = VIEWS.home;
  VIEWS.home = function (el) {
    baseHome(el);
    loadPubStats().then(function (d) {
      var stat = $$('.stat', el).filter(function (s) { return /กฎหมายในฐานข้อมูล/.test(s.textContent); })[0]; if (!stat || !el.isConnected) return;
      stat.querySelector('.sl').textContent = 'กฎหมายไทยในฐานข้อมูล';
      stat.querySelector('.sv').textContent = fmtN(d.thaiTotal || d.laws);
      var fg = 0; Object.keys(d.foreignDetail || {}).forEach(function (k) { fg += d.foreignDetail[k].laws || 0; });
      if (!$('#statFg', el)) stat.insertAdjacentHTML('afterend', '<div class="stat" id="statFg"><span class="sl">กฎหมายต่างประเทศในฐานข้อมูล</span><span class="sv">' + fmtN(fg) + '</span></div>');
    }).catch(function () {});
  };
})();

/* ---------------- หน้าแรก: ตารางจำนวนกฎหมายแยกตามประเทศ (บล็อกเดียว) ---------------- */
var COUNTRY_TH = { JP: 'ญี่ปุ่น', CN: 'จีน', KR: 'เกาหลีใต้', VN: 'เวียดนาม', LA: 'ลาว', ID: 'อินโดนีเซีย', MY: 'มาเลเซีย', PH: 'ฟิลิปปินส์', SG: 'สิงคโปร์', BN: 'บรูไน' };
function countryTable(d) {
  var rows = [['ประเทศไทย (กฎหมายหลัก 5 หมวด)', d.laws, d.sections], ['ประเทศไทย (กฎหมายลำดับรองและอื่น ๆ)', d.thai2 ? d.thai2.laws : null, d.thai2 ? d.thai2.sections : null]];
  Object.keys(COUNTRY_TH).forEach(function (k) { var f = (d.foreignDetail || {})[k]; if (f) rows.push([COUNTRY_TH[k], f.laws, f.sections]); });
  var tl = 0, ts = 0; rows.forEach(function (r) { tl += r[1] || 0; ts += r[2] || 0; });
  return '<div class="table-scroll"><table class="ptable ctable"><thead><tr><th>ประเทศ</th><th>จำนวนกฎหมาย (ฉบับ)</th><th>จำนวนมาตรา</th></tr></thead><tbody>' +
    rows.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td>' + fmtN(r[1]) + '</td><td>' + (r[2] === null || r[2] === undefined ? '<span class="muted small">อ่านได้ทุกมาตรา</span>' : fmtN(r[2])) + '</td></tr>'; }).join('') +
    '<tr class="tot"><td>รวมทั้งหมด</td><td>' + fmtN(tl) + '</td><td>' + fmtN(ts) + '+</td></tr></tbody></table></div>';
}
(function () {
  var baseRender = renderDash;
  renderDash = function (box, d) {
    baseRender(box, d);
    var fc = $('#dashForeign', box); if (!fc) return;
    var fig = fc.closest('figure'); if (!fig) return;
    fig.classList.add('wide');
    fig.querySelector('figcaption').textContent = 'จำนวนกฎหมายและมาตราในฐานข้อมูล แยกตามประเทศ';
    fc.classList.remove('muted', 'small'); fc.id = 'dashCountries';
    fc.innerHTML = countryTable(d);
    var k = $$('.dk', box).filter(function (x) { return /กฎหมายไทย/.test(x.textContent); })[0];
    if (k && d.thaiTotal) k.querySelector('.dk-v').textContent = fmtN(d.thaiTotal);
  };
})();
</script>
