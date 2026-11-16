<script>
/* ==========================================================================
   SAVED / HISTORY / TIME / PROFILE / SETTINGS / NOTIFICATIONS
   ========================================================================== */
function groupByPeriod(items, getT, mode) {
  var g = {};
  items.forEach(function (it) {
    var k = dayKey(getT(it)); var a = k.split('-');
    var key = mode === 'year' ? a[0] + '-01-01' : mode === 'month' ? a[0] + '-' + a[1] + '-01' : k;
    (g[key] = g[key] || []).push(it);
  });
  return Object.keys(g).sort().reverse().map(function (k) { return { key: k, label: keyLabel(k, mode), items: g[k] }; });
}
function periodSeg(cur) {
  return '<div class="seg" id="perSeg"><button data-p="day" class="' + (cur === 'day' ? 'on' : '') + '">รายวัน</button><button data-p="month" class="' + (cur === 'month' ? 'on' : '') + '">รายเดือน</button><button data-p="year" class="' + (cur === 'year' ? 'on' : '') + '">รายปี</button></div>';
}

/* ---------------- SAVED (รายการโปรด + คลังเอกสารส่วนตัว) ---------------- */
VIEWS.saved = function (el) {
  var st = S.ui.sv || (S.ui.sv = { p: 'day', folder: '', q: '', sort: 'new' });
  var ud = S.ud;
  ensureIds(Object.keys(ud.favorites), function () { if (S.ui.view === 'saved') refreshCurrent(); });
  el.innerHTML = '<div class="view-head"><div><h2>' + tr('saved') + '</h2><p class="sub">มาตราที่ท่านบันทึกเป็นรายการโปรด แยกตามวัน เดือน และปีที่บันทึก</p></div>' + periodSeg(st.p) + '</div>' +
    '<div class="row wrapr" style="gap:8px;margin-bottom:10px"><div class="input grow" style="min-width:min(100%,240px)">' + ic('search') + '<input id="svQ" placeholder="ค้นหาเอกสารที่บันทึก" value="' + esc(st.q) + '"></div><div class="seg" id="svSort"><button data-s="new" class="' + (st.sort === 'new' ? 'on' : '') + '">ใหม่ล่าสุด</button><button data-s="old" class="' + (st.sort === 'old' ? 'on' : '') + '">เก่าสุด</button></div><button class="btn" id="newFolder">' + ic('plus') + ' โฟลเดอร์ใหม่</button></div>' +
    '<div class="hscroll" id="fdChips"></div><div id="svList"></div>';
  function chips() {
    $('#fdChips', el).innerHTML = '<button class="chip ' + (!st.folder ? 'on' : '') + '" data-f="">' + ic('bookmark') + ' ทั้งหมด (' + Object.keys(ud.favorites).length + ')</button>' +
      ud.folders.map(function (f) { var n = Object.keys(ud.favorites).filter(function (k) { return ud.favorites[k].folder === f.id; }).length; return '<button class="chip ' + (st.folder === f.id ? 'on' : '') + '" data-f="' + esc(f.id) + '">' + ic('folder') + ' ' + esc(f.name) + ' (' + n + ')</button>'; }).join('');
  }
  function draw() {
    chips();
    var nq = norm(st.q);
    var items = Object.keys(ud.favorites).filter(function (id) { return SECS[id] || !S.catalog; }).map(function (id) { return { id: id, f: ud.favorites[id] }; })
      .filter(function (x) { if (st.folder && x.f.folder !== st.folder) return false; if (!nq) return true; var s = SECS[x.id]; return s && norm(lawShort(LAWS[s.law]) + s.no + s.name + s.text + (x.f.note || '')).indexOf(nq) > -1; });
    items.sort(function (a, b) { return st.sort === 'old' ? a.f.t - b.f.t : b.f.t - a.f.t; });
    var box = $('#svList', el);
    var folder = ud.folders.filter(function (f) { return f.id === st.folder; })[0];
    var fHead = folder ? '<div class="panel flat row wrapr" style="margin:10px 0"><span class="grow"><b>' + ic('folder') + ' ' + esc(folder.name) + '</b></span><button class="btn sm" id="fRename">' + ic('edit') + ' เปลี่ยนชื่อ</button><button class="btn sm danger" id="fDel">' + ic('trash') + ' ลบโฟลเดอร์</button></div>' : '';
    if (!items.length) { box.innerHTML = fHead + '<div class="panel"><div class="empty"><div class="eic">' + ic('bookmark') + '</div><h3>' + (st.q ? 'ไม่พบเอกสารที่ค้นหา' : 'ยังไม่มีรายการที่บันทึก') + '</h3><p>' + (st.q ? 'ลองใช้คำค้นหาอื่น' : 'กดปุ่มบันทึกบนป้ายพลิกมาตรา ระบบจะจัดเก็บไว้ที่นี่ แยกตามวัน เดือน และปีที่บันทึกอย่างแม่นยำ') + '</p>' + (st.q ? '' : '<button class="btn k" data-go2="content">' + ic('book') + ' ไปที่เมนูเนื้อหา</button>') + '</div></div>'; bindFolderHead(); return; }
    var groups = groupByPeriod(items, function (x) { return x.f.t; }, st.p);
    if (st.sort === 'old') groups.reverse();
    box.innerHTML = fHead + groups.map(function (g) {
      return '<div class="group-h">' + esc(g.label) + ' <span class="cnt">' + g.items.length + ' รายการ</span></div><div class="anim-list">' + g.items.map(function (x) {
        var s = SECS[x.id]; if (!s) return '';
        return '<div class="entry"><button class="grow" data-open="' + esc(x.id) + '" style="text-align:left;border:0;background:none;padding:0;min-width:0"><span class="et">' + esc(lawShort(LAWS[s.law])) + ' มาตรา ' + esc(s.no) + ' ' + esc(s.name) + '</span><br><span class="es">บันทึกเมื่อ ' + fmtDateTime(x.f.t) + (x.f.note ? ' · หมายเหตุ: ' + esc(x.f.note.slice(0, 80)) : '') + '</span></button>' +
          '<button class="icon-btn" data-note="' + esc(x.id) + '" aria-label="หมายเหตุ">' + ic('edit') + '</button><button class="icon-btn" data-move="' + esc(x.id) + '" aria-label="ย้ายโฟลเดอร์">' + ic('folder') + '</button><button class="icon-btn" data-del="' + esc(x.id) + '" aria-label="ลบ" style="color:var(--bad)">' + ic('trash') + '</button></div>';
      }).join('') + '</div>';
    }).join('');
    bindFolderHead();
  }
  function bindFolderHead() {
    var r = $('#fRename', el), d = $('#fDel', el);
    if (r) r.onclick = function () { folderDialog(st.folder); };
    if (d) d.onclick = function () {
      confirmBox('ยืนยันการลบโฟลเดอร์', 'รายการในโฟลเดอร์จะไม่ถูกลบ แต่จะย้ายกลับไปอยู่ในรายการทั้งหมด', { danger: true, icon: 'trash', tone: 'bad' }).then(function (ok) {
        if (!ok) return; var id = st.folder;
        ud.folders = ud.folders.filter(function (f) { return f.id !== id; });
        Object.keys(ud.favorites).forEach(function (k) { if (ud.favorites[k].folder === id) ud.favorites[k].folder = ''; });
        st.folder = ''; saveUD(); draw(); toast('ลบโฟลเดอร์แล้ว', '', 'ok');
      });
    };
  }
  function folderDialog(id) {
    if (!gate('folders')) return;
    var f = ud.folders.filter(function (x) { return x.id === id; })[0];
    modal({ title: f ? 'เปลี่ยนชื่อโฟลเดอร์' : 'สร้างโฟลเดอร์ใหม่', icon: 'folder', html: '<div class="field"><label for="fdName">ชื่อโฟลเดอร์</label><div class="input"><input id="fdName" maxlength="60" value="' + esc(f ? f.name : '') + '" placeholder="เช่น เตรียมสอบกฎหมายแพ่ง"></div><div class="err" id="fdNameE"></div></div>', ok: 'บันทึก',
      onOk: function (m) { var n = $('#fdName', m).value.trim(); if (!n) { setErr('fdName', 'กรุณาตั้งชื่อโฟลเดอร์'); return false; } if (f) f.name = n; else ud.folders.push({ id: uid(), name: n, t: Date.now() }); saveUD(); draw(); toast(f ? 'เปลี่ยนชื่อโฟลเดอร์แล้ว' : 'สร้างโฟลเดอร์แล้ว', n, 'ok'); return true; } });
  }
  $('#newFolder', el).onclick = function () { folderDialog(''); };
  $('#svQ', el).addEventListener('input', debounce(function () { st.q = this.value; store.set('ui', S.ui); draw(); }, 160));
  on(el, 'click', '#perSeg [data-p]', function (e, b) { st.p = b.getAttribute('data-p'); store.set('ui', S.ui); $$('#perSeg button', el).forEach(function (x) { x.classList.toggle('on', x === b); }); draw(); });
  on(el, 'click', '#svSort [data-s]', function (e, b) { st.sort = b.getAttribute('data-s'); store.set('ui', S.ui); $$('#svSort button', el).forEach(function (x) { x.classList.toggle('on', x === b); }); draw(); });
  on(el, 'click', '#fdChips [data-f]', function (e, b) { st.folder = b.getAttribute('data-f'); store.set('ui', S.ui); draw(); });
  on(el, 'click', '[data-open]', function (e, b) { openFocus(b.getAttribute('data-open')); });
  on(el, 'click', '[data-go2]', function (e, b) { nav(b.getAttribute('data-go2')); });
  on(el, 'click', '[data-note]', function (e, b) { favNoteDialog(b.getAttribute('data-note')); });
  on(el, 'click', '[data-del]', function (e, b) {
    var id = b.getAttribute('data-del'), s = SECS[id];
    confirmBox('ยืนยันการลบออกจากรายการโปรด', lawShort(LAWS[s.law]) + ' มาตรา ' + s.no + ' ' + s.name, { danger: true, icon: 'trash', tone: 'bad' }).then(function (ok) { if (ok) { toggleFav(id); draw(); } });
  });
  on(el, 'click', '[data-move]', function (e, b) {
    if (!gate('folders')) return;
    var id = b.getAttribute('data-move');
    if (!ud.folders.length) { toast('ยังไม่มีโฟลเดอร์', 'กรุณาสร้างโฟลเดอร์ก่อน', 'warn'); return; }
    modal({ title: 'ย้ายไปยังโฟลเดอร์', icon: 'folder', html: '<div class="radio-cards"><label><input type="radio" name="mvF" value="">ไม่จัดโฟลเดอร์</label>' + ud.folders.map(function (f) { return '<label><input type="radio" name="mvF" value="' + esc(f.id) + '"' + (ud.favorites[id].folder === f.id ? ' checked' : '') + '>' + esc(f.name) + '</label>'; }).join('') + '</div>', ok: 'ย้าย',
      onOk: function (m) { var r = $('input[name=mvF]:checked', m); ud.favorites[id].folder = r ? r.value : ''; saveUD(); draw(); toast('ย้ายรายการแล้ว', '', 'ok'); return true; } });
  });
  if (!S.catalog) loadCatalog().then(draw);
  draw();
};

/* ---------------- HISTORY ---------------- */
VIEWS.history = function (el) {
  var st = S.ui.hs || (S.ui.hs = { p: 'day', tab: 'read' });
  ensureIds(S.ud.history.slice(0, 300).map(function (x) { return x.id; }).concat(Object.keys(S.ud.favorites)), function () { if (S.ui.view === 'history') refreshCurrent(); });
  el.innerHTML = '<div class="view-head"><div><h2>' + tr('history') + '</h2><p class="sub">ระบบบันทึกอัตโนมัติทุกครั้งที่เปิดอ่านป้ายพลิกมาตรา แยกตามวัน เดือน ปี</p></div>' + periodSeg(st.p) + '</div>' +
    '<div class="hscroll" id="hsTabs">' + [['read', 'book', 'การอ่านเอกสาร'], ['search', 'search', 'การค้นหากฎหมาย'], ['saved', 'bookmark', 'การบันทึกเอกสาร'], ['login', 'shield', 'การเข้าสู่ระบบและอุปกรณ์']].map(function (x) { return '<button class="chip ' + (st.tab === x[0] ? 'on' : '') + '" data-t="' + x[0] + '">' + ic(x[1]) + esc(x[2]) + '</button>'; }).join('') + '</div><div id="hsList" style="margin-top:6px"></div>';
  function draw() {
    var box = $('#hsList', el), ud = S.ud;
    if (st.tab === 'login') {
      var paint = function (items) {
        var head = '<div class="panel flat login-note"><div class="row wrapr" style="gap:10px;align-items:flex-start"><span style="color:var(--sky-600)">' + ic('shield') + '</span><p class="small grow">ประวัติการเข้าสู่ระบบและอุปกรณ์ใช้ตรวจสอบความปลอดภัยของบัญชี จึงไม่สามารถล้างเองได้ ระบบจะลบอัตโนมัติเมื่อครบ 3 เดือน (90 วัน) ท่านสามารถดาวน์โหลดเป็นเอกสาร PDF ได้</p><button class="btn sm k" id="hsPdf">' + ic('download') + ' ดาวน์โหลด PDF</button></div>' +
          '<div class="row wrapr tiny muted" style="gap:14px;margin-top:8px"><span>สำเร็จ <b style="color:var(--ok)">' + items.filter(function (x) { return x.result === 'SUCCESS'; }).length + '</b> ครั้ง</span><span>ไม่สำเร็จ <b style="color:var(--bad)">' + items.filter(function (x) { return x.result !== 'SUCCESS'; }).length + '</b> ครั้ง</span></div></div>';
        if (!items.length) { box.innerHTML = head + '<div class="panel"><div class="empty"><div class="eic">' + ic('shield') + '</div><h3>ยังไม่มีประวัติ</h3></div></div>'; }
        else box.innerHTML = head + groupByPeriod(items, function (x) { return x.time; }, st.p).map(function (g) { return '<div class="group-h">' + esc(g.label) + ' <span class="cnt">' + g.items.length + ' ครั้ง</span></div>' + g.items.map(function (x) { return '<div class="entry"><span style="color:' + (x.result === 'SUCCESS' ? 'var(--ok)' : 'var(--bad)') + '">' + ic(x.result === 'SUCCESS' ? 'shieldCheck' : 'alert') + '</span><span class="grow"><span class="et">' + (x.result === 'SUCCESS' ? 'เข้าสู่ระบบสำเร็จ' : 'เข้าสู่ระบบไม่สำเร็จ') + ' · ' + esc(x.reason || '') + '</span><br><span class="es">' + fmtDateTime(x.time) + ' · ' + esc([x.device, x.os, x.browser].filter(Boolean).join(' / ')) + (x.ip ? ' · IP ' + esc(x.ip) : '') + (x.location ? ' · ' + esc(x.location) : '') + '</span></span></div>'; }).join(''); }).join('');
        var pb = $('#hsPdf', el); if (pb) pb.onclick = function () { officialPdf('loginHistoryPdf', 'กำลังสร้างรายงานประวัติการเข้าสู่ระบบ'); };
      };
      var cache = VIEWS.history.loginCache;
      if (cache) paint(cache.items); else box.innerHTML = '<div class="skeleton" style="height:60px"></div>';
      if (!cache || Date.now() - cache.t > 60000) api('loginHistory', {}).then(function (r) {
        VIEWS.history.loginCache = { t: Date.now(), items: r.items || [] };
        if (st.tab === 'login' && box.isConnected) paint(r.items || []);
      }).catch(function (e) { if (!cache) box.innerHTML = '<div class="panel"><div class="empty warn"><div class="eic">' + ic('wifiOff') + '</div><h3>โหลดข้อมูลไม่สำเร็จ</h3><p>' + esc(e.msg) + '</p></div></div>'; });
      return;
    }
    var items, getT, row;
    if (st.tab === 'read') { items = ud.history; getT = function (x) { return x.t; }; row = function (x) { var s = SECS[x.id]; if (!s) return ''; return '<button class="entry" data-open="' + esc(x.id) + '" style="width:100%;text-align:left"><span class="grow"><span class="et">' + esc(lawShort(LAWS[s.law])) + ' มาตรา ' + esc(s.no) + ' ' + esc(s.name) + '</span><br><span class="es">เปิดอ่านเวลา ' + fmtTime(x.t) + ' น.</span></span>' + ic('chevR') + '</button>'; }; }
    else if (st.tab === 'search') { items = ud.searches; getT = function (x) { return x.t; }; row = function (x) { return '<button class="entry" data-q="' + esc(x.q) + '" style="width:100%;text-align:left"><span class="grow"><span class="et">' + esc(x.q) + '</span><br><span class="es">' + fmtDateTime(x.t) + '</span></span>' + ic('search') + '</button>'; }; }
    else { var sca = (ud.clearedAt || {}).saved || 0; items = Object.keys(ud.favorites).map(function (k) { return { id: k, t: ud.favorites[k].t }; }).filter(function (x) { return x.t > sca; }).sort(function (a, c) { return c.t - a.t; }); getT = function (x) { return x.t; }; row = function (x) { var s = SECS[x.id]; if (!s) return ''; return '<button class="entry" data-open="' + esc(x.id) + '" style="width:100%;text-align:left"><span class="grow"><span class="et">บันทึก ' + esc(lawShort(LAWS[s.law])) + ' มาตรา ' + esc(s.no) + '</span><br><span class="es">' + fmtDateTime(x.t) + '</span></span></button>'; }; }
    if (!items.length) { box.innerHTML = '<div class="panel"><div class="empty"><div class="eic">' + ic('history') + '</div><h3>ยังไม่มีประวัติ</h3><p>เมื่อท่านเปิดอ่านป้ายพลิก ค้นหา หรือบันทึกเอกสาร ระบบจะบันทึกให้อัตโนมัติ</p></div></div>'; return; }
    box.innerHTML = groupByPeriod(items, getT, st.p).map(function (g) { return '<div class="group-h">' + esc(g.label) + ' <span class="cnt">' + g.items.length + ' รายการ</span></div><div class="anim-list">' + g.items.slice(0, 200).map(row).join('') + '</div>'; }).join('') +
      '<div class="row" style="justify-content:center;margin-top:18px"><button class="btn danger" id="hsClear">' + ic('trash') + ' ล้างประวัติ' + (st.tab === 'read' ? 'การอ่าน' : st.tab === 'search' ? 'การค้นหา' : 'การบันทึก') + '</button></div>';
    var cl = $('#hsClear', el);
    if (cl) cl.onclick = function () {
      confirmBox('ยืนยันการล้างประวัติ', st.tab === 'saved' ? 'ล้างเฉพาะประวัติการบันทึกที่แสดงในหน้านี้ รายการโปรดและโฟลเดอร์ของท่านยังคงอยู่ครบ' : 'ประวัติที่ล้างแล้วไม่สามารถกู้คืนได้ (สถิติเวลาและอันดับการใช้งานยังคงอยู่)', { danger: true, icon: 'trash', tone: 'bad' }).then(function (ok) {
        if (!ok) return;
        ud.clearedAt = ud.clearedAt || {}; ud.clearedAt[st.tab] = Date.now();
        if (st.tab === 'read') ud.history = []; else if (st.tab === 'search') ud.searches = [];
        saveUD(true); draw(); toast('ล้างประวัติแล้ว', '', 'ok');
      });
    };
  }
  on(el, 'click', '#perSeg [data-p]', function (e, b) { st.p = b.getAttribute('data-p'); store.set('ui', S.ui); $$('#perSeg button', el).forEach(function (x) { x.classList.toggle('on', x === b); }); draw(); });
  on(el, 'click', '#hsTabs [data-t]', function (e, b) { st.tab = b.getAttribute('data-t'); store.set('ui', S.ui); $$('#hsTabs .chip', el).forEach(function (x) { x.classList.toggle('on', x === b); }); draw(); });
  on(el, 'click', '[data-open]', function (e, b) { openFocus(b.getAttribute('data-open')); });
  on(el, 'click', '[data-q]', function (e, b) { openQuickSearch(b.getAttribute('data-q')); });
  if (!S.catalog) loadCatalog().then(draw);
  draw();
};

/* ---------------- TIME (เวลาการใช้งาน + อันดับ 1-3) ---------------- */
VIEWS.time = function (el) {
  flushUsage();
  var st = S.ui.tm || (S.ui.tm = { p: 'day' });
  var ud = S.ud, today = dayKey();
  ensureIds(Object.keys(ud.opens), function () { if (S.ui.view === 'time') refreshCurrent(); });
  function sumBy(mode) {
    var g = {};
    Object.keys(ud.time).forEach(function (k) { var a = k.split('-'); var key = mode === 'year' ? a[0] : mode === 'month' ? a[0] + '-' + a[1] : k; g[key] = (g[key] || 0) + ud.time[k]; });
    return g;
  }
  el.innerHTML = '<div class="view-head"><div><h2>' + tr('time') + '</h2><p class="sub">ระยะเวลาการเข้าใช้งานแต่ละวัน เดือน ปี เปรียบเทียบกัน และมาตราที่เปิดอ่านมากที่สุด</p></div>' + periodSeg(st.p) + '</div>' +
    '<div class="grid g4" style="margin-bottom:16px"><div class="stat o"><span class="sl">วันนี้</span><span class="sv" style="font-size:1.1rem" id="todayTime">' + dur(ud.time[today] || 0) + '</span></div><div class="stat"><span class="sl">เดือนนี้</span><span class="sv" style="font-size:1.1rem">' + dur(sumBy('month')[today.slice(0, 7)] || 0) + '</span></div><div class="stat"><span class="sl">ปีนี้</span><span class="sv" style="font-size:1.1rem">' + dur(sumBy('year')[today.slice(0, 4)] || 0) + '</span></div><div class="stat k"><span class="sl">รวมทั้งหมด</span><span class="sv" style="font-size:1.1rem">' + dur(Object.keys(ud.time).reduce(function (a, k) { return a + ud.time[k]; }, 0)) + '</span></div></div>' +
    '<section class="panel" style="margin-bottom:16px"><div class="panel-title"><span class="ic">' + ic('activity') + '</span><h3 id="chartTitle"></h3></div><div class="bars" id="bars"></div><p class="tiny muted" id="chartNote" style="margin-top:8px"></p></section>' +
    '<section class="panel"><div class="panel-title"><span class="ic o">' + ic('star') + '</span><h3>มาตราที่เข้าใช้งานมากที่สุด (อันดับ 1–3)</h3></div><div class="col" id="ranks"></div></section>';
  function chart() {
    var data = [], p = parts(new Date());
    if (st.p === 'day') { for (var i = 6; i >= 0; i--) { var d = new Date(Date.now() - i * 864e5), k = dayKey(d); data.push({ k: k, l: (function () { var pp = parts(d); return pp.d + ' ' + TH_MON_S[pp.m - 1]; })(), v: ud.time[k] || 0, today: k === today }); } }
    else if (st.p === 'month') { var g = sumBy('month'); for (var j = 5; j >= 0; j--) { var mm = p.m - j, yy = p.y; while (mm < 1) { mm += 12; yy--; } var key = yy + '-' + pad(mm); data.push({ k: key, l: TH_MON_S[mm - 1] + ' ' + String(yr(yy)).slice(2), v: g[key] || 0, today: j === 0 }); } }
    else { var gy = sumBy('year'); for (var y = 4; y >= 0; y--) { var ky = String(p.y - y); data.push({ k: ky, l: String(yr(+ky)), v: gy[ky] || 0, today: y === 0 }); } }
    var max = Math.max.apply(null, data.map(function (x) { return x.v; }).concat([60]));
    $('#chartTitle', el).textContent = st.p === 'day' ? 'เปรียบเทียบ 7 วันล่าสุด' : st.p === 'month' ? 'เปรียบเทียบ 6 เดือนล่าสุด' : 'เปรียบเทียบ 5 ปีล่าสุด';
    $('#bars', el).innerHTML = data.map(function (x) { return '<div class="bc ' + (x.today ? 'today' : '') + '"><span class="bn">' + durShort(x.v) + '</span><div class="bv" style="height:0%" data-h="' + Math.round(x.v / max * 100) + '"></div><span class="bl">' + esc(x.l) + '</span></div>'; }).join('');
    requestAnimationFrame(function () { $$('#bars .bv', el).forEach(function (b) { b.style.height = b.getAttribute('data-h') + '%'; }); });
    var best = data.slice().sort(function (a, b) { return b.v - a.v; })[0];
    $('#chartNote', el).textContent = best && best.v ? 'ช่วงที่ใช้งานนานที่สุดคือ ' + best.l + ' รวม ' + dur(best.v) : 'ยังไม่มีข้อมูลเวลาการใช้งานในช่วงนี้';
  }
  function ranks() {
    var top = Object.keys(ud.opens).filter(function (id) { return SECS[id]; }).sort(function (a, b) { return ud.opens[b] - ud.opens[a]; }).slice(0, 3);
    $('#ranks', el).innerHTML = top.length ? top.map(function (id, i) { var s = SECS[id]; return '<button class="rank r' + (i + 1) + '" data-open="' + esc(id) + '" style="text-align:left;width:100%"><span class="rn">' + (i + 1) + '</span><span class="grow"><b>' + esc(lawShort(LAWS[s.law])) + ' มาตรา ' + esc(s.no) + '</b><br><span class="muted small">' + esc(s.name) + '</span></span><span class="tag">' + ud.opens[id] + ' ครั้ง</span></button>'; }).join('') : '<p class="muted">ยังไม่มีข้อมูล ระบบจะจัดอันดับเมื่อท่านเปิดอ่านป้ายพลิกมาตรา</p>';
  }
  on(el, 'click', '#perSeg [data-p]', function (e, b) { st.p = b.getAttribute('data-p'); store.set('ui', S.ui); $$('#perSeg button', el).forEach(function (x) { x.classList.toggle('on', x === b); }); chart(); });
  on(el, 'click', '[data-open]', function (e, b) { openFocus(b.getAttribute('data-open')); });
  chart(); ranks();
  if (!S.catalog) loadCatalog().then(ranks);
};

/* ---------------- PROFILE (ข้อมูล — แสดงข้อมูลที่กรอกทั้งหมด) ---------------- */
VIEWS.profile = function (el) {
  var m = S.member || {}, e = m.education || {}, w = m.work || {}, plan = m.plan || {};
  function kv(rows) { return '<dl class="kv">' + rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + (r[2] ? r[1] : esc(r[1] || '-')) + '</dd>'; }).join('') + '</dl>'; }
  el.innerHTML = '<div class="view-head"><div><h2>' + tr('profile') + '</h2><p class="sub">ข้อมูลทั้งหมดที่ท่านกรอกในการสมัครสมาชิกและแก้ไขภายหลัง</p></div><button class="btn" id="pfEdit">' + ic('gear') + ' ' + tr('settings') + '</button></div>' +
    '<section class="panel corner" style="margin-bottom:16px"><div class="row wrapr" style="gap:18px">' + avatarHtml(96) + '<div class="grow"><h2>' + esc((m.title || '') + (m.firstName || '') + ' ' + (m.lastName || '')) + '</h2><div class="muted">' + esc(m.displayName || '') + ' · @' + esc(m.username || '') + '</div><div class="row wrapr" style="gap:6px;margin-top:8px"><span class="tag k">' + esc(m.memberId || '') + '</span><span class="tag">' + esc(m.memberType || '') + '</span><span class="tag ' + (m.accountStatus === 'ปกติ' ? 'ok' : 'bad') + '">สถานะ: ' + esc(m.accountStatus || 'ปกติ') + '</span>' + (m.role === 'admin' ? '<span class="tag o">ผู้ดูแลระบบ</span>' : '') + '</div>' + (m.bio ? '<p class="muted" style="margin-top:8px">' + esc(m.bio) + '</p>' : '') + '</div></div></section>' +
    '<div class="grid g2">' +
      '<section class="panel rise"><div class="panel-title"><span class="ic">' + ic('user') + '</span><h3>ข้อมูลประจำตัว</h3></div>' + kv([['คำนำหน้าชื่อ', m.title], ['ชื่อจริง', m.firstName], ['นามสกุล', m.lastName], ['ชื่อที่แสดง', m.displayName], ['วันเดือนปีเกิด', m.birthDate ? fmtDate(m.birthDate.length <= 10 ? m.birthDate + 'T00:00:00' : m.birthDate, true) : '-'], ['เพศ', m.gender || 'ไม่ระบุ'], ['อีเมล (รับรหัสผ่านชั้นที่ 2)', m.email ? m.email + (m.emailVerified ? ' (ยืนยันแล้ว)' : ' (ยังไม่ยืนยัน)') : 'ยังไม่ได้ระบุ'], ['หมายเลขโทรศัพท์', m.phone || 'ไม่ได้ระบุ'], ['ที่อยู่', m.address || 'ไม่ได้ระบุ'], ['ประวัติส่วนตัว', m.bio || 'ไม่ได้ระบุ']]) + '</section>' +
      '<section class="panel rise"><div class="panel-title"><span class="ic o">' + ic(e.school ? 'book2' : 'brief') + '</span><h3>ข้อมูลการศึกษาและการทำงาน</h3></div>' + kv([['สถานะผู้สมัคร', m.memberType]].concat(e.school ? [['สถานศึกษา', e.school], ['คณะ', e.faculty], ['สาขาวิชา', e.major], ['ระดับการศึกษา', e.level], ['ชั้นปี', e.year]] : []).concat(w.org || w.position || w.career ? [['หน่วยงาน', w.org], ['ตำแหน่งงาน', w.position], ['สายงาน', w.career], ['ประสบการณ์ทำงาน', w.experience]] : [])) + '</section>' +
      '<section class="panel rise"><div class="panel-title"><span class="ic k">' + ic('badge') + '</span><h3>ข้อมูลบัญชี</h3></div>' + kv([['รหัสสมาชิก', m.memberId], ['ชื่อผู้ใช้งาน', m.username], ['ประเภทสมาชิก', m.memberType], ['วันที่สมัครสมาชิก', fmtDateTime(m.createdAt)], ['เข้าใช้งานล่าสุด', fmtDateTime(m.lastLogin)], ['สถานะบัญชี', m.accountStatus || 'ปกติ'], ['บัญชีที่เชื่อมต่อ', (m.social || []).length ? m.social.join(', ') : 'ยังไม่ได้เชื่อมต่อ'], ['คำถามกู้คืนบัญชี', m.recoveryQ]]) + '</section>' +
      '<section class="panel rise"><div class="panel-title"><span class="ic">' + ic('card') + '</span><h3>แพ็กเกจการใช้งาน</h3></div>' + kv([['แพ็กเกจปัจจุบัน', plan.trial ? 'ทดลองใช้งานครบทุกฟังก์ชัน' : plan.tier === 'free' ? 'หมดระยะทดลองใช้งาน' : (PLAN_LABEL[plan.tier] || plan.tier) + ' (' + (plan.cycle === 'yearly' ? 'รายปี' : 'รายเดือน') + ')'], [plan.trial ? 'สิ้นสุดการทดลองใช้' : 'วันหมดอายุ', fmtDateTime(plan.trial ? plan.trialEnds : plan.expires)]]) + '<button class="btn sm o" style="margin-top:12px" id="pfPlan">' + ic('card') + ' ดูแพ็กเกจและราคา</button></section>' +
    '</div>';
  $('#pfEdit', el).onclick = function () { openSettings('personal'); };
  $('#pfPlan', el).onclick = function () { nav('pricing'); };
};
var PLAN_LABEL = { basic: 'พื้นฐาน', standard: 'มาตรฐาน', pro: 'มืออาชีพ', free: 'ไม่มีแพ็กเกจ' };

/* ---------------- SETTINGS (รูป Gear มุมบนขวา > แถบเมนูด้านขวา) ---------------- */
var SETTING_SECTIONS = [
  ['personal', 'user', 'ข้อมูลส่วนตัว (Personal Information)', 'จัดการข้อมูลประจำตัวของสมาชิก'],
  ['account', 'badge', 'ข้อมูลบัญชี (Account Information)', 'จัดการบัญชีที่ใช้เข้าสู่เว็บไซต์'],
  ['security', 'shield', 'ความปลอดภัย (Security)', 'รหัสผ่าน การล็อกอิน อุปกรณ์ และการล็อกบัญชี'],
  ['privacy', 'eye', 'การตั้งค่าความเป็นส่วนตัว (Privacy)', 'การแสดงผลข้อมูลและข้อมูลส่วนบุคคล'],
  ['general', 'gear', 'การตั้งค่าทั่วไป (General Settings)', 'ภาษา ธีม ขนาดตัวอักษร วันที่ เขตเวลา'],
  ['notif', 'bell', 'การแจ้งเตือน (Notifications)', 'การแจ้งเตือนภายในเว็บไซต์'],
  ['manage', 'folder', 'จัดการบัญชี (Account Management)', 'สำรองข้อมูล ปิดใช้งาน ลบบัญชี ออกจากระบบ']
];
function openSettings(section) {
  drawer('right', function (d, close) {
    function home() {
      d.innerHTML = '<div class="drawer-head"><span style="color:var(--sky-600)">' + ic('gear') + '</span><b class="grow">' + tr('settings') + '</b><button class="icon-btn" data-x aria-label="ปิด">' + ic('x') + '</button></div>' +
        '<div class="drawer-body subpanel"><div class="row" style="margin-bottom:14px">' + avatarHtml(52) + '<div class="grow"><b>' + esc(S.member.displayName || '') + '</b><div class="tiny muted">' + esc(S.member.memberId) + '</div></div></div><div class="menu-list">' +
        SETTING_SECTIONS.map(function (s) { return '<button class="menu-item" data-sec="' + s[0] + '"><span class="mi">' + ic(s[1]) + '</span><span class="grow"><span class="mt">' + esc(s[2]) + '</span><br><span class="ms">' + esc(s[3]) + '</span></span>' + ic('chevR', 'chev') + '</button>'; }).join('') + '</div></div>';
      d.querySelector('[data-x]').onclick = close;
      on(d.querySelector('.drawer-body'), 'click', '[data-sec]', function (e, b) { sub(b.getAttribute('data-sec')); });
    }
    function sub(key) {
      var sec = SETTING_SECTIONS.filter(function (s) { return s[0] === key; })[0];
      d.innerHTML = '<div class="drawer-head"><button class="icon-btn" data-back aria-label="ย้อนกลับ">' + ic('arrowL') + '</button><b class="grow ellipsis">' + esc(sec[2]) + '</b><button class="icon-btn" data-x aria-label="ปิด">' + ic('x') + '</button></div><div class="drawer-body subpanel" id="setBody"></div>';
      d.querySelector('[data-back]').onclick = home; d.querySelector('[data-x]').onclick = close;
      SETTINGS_UI[key]($('#setBody', d), close, function () { sub(key); });
    }
    if (section) sub(section); else home();
  });
}
function rowSwitch(id, label, sub, on_) { return '<div class="row" style="padding:10px 0;border-bottom:1px solid var(--line)"><span class="grow"><b>' + esc(label) + '</b>' + (sub ? '<br><span class="tiny muted">' + esc(sub) + '</span>' : '') + '</span><label class="switch"><input type="checkbox" id="' + id + '"' + (on_ ? ' checked' : '') + '><span></span></label></div>'; }
function afterMember(r) { if (r.member) { S.member = r.member; store.set('member', r.member); renderHeaderBits(); refreshCurrent(); } }
var SETTINGS_UI = {
  personal: function (b) {
    var m = S.member;
    b.innerHTML = '<div class="row" style="margin-bottom:14px">' + avatarHtml(84) + '<div class="col" style="gap:6px"><label class="btn sm">' + ic('camera') + ' เปลี่ยนรูปโปรไฟล์<input type="file" id="spAv" class="sr"></label><span class="tiny muted">รองรับไฟล์ทุกชนิดและทุกขนาด</span></div></div>' +
      '<div class="col" style="gap:12px">' + selectField('spTitle', 'คำนำหน้าชื่อ', TITLES, TITLES.indexOf(m.title) > -1 ? m.title : 'อื่น ๆ', true, 'spTitleO') + textField('spFirst', 'ชื่อจริง', m.firstName, true) + textField('spLast', 'นามสกุล', m.lastName, true) + textField('spDisp', 'ชื่อที่แสดง (Display Name)', m.displayName, true) +
      '<div class="field"><span class="lbl">ชื่อผู้ใช้งาน (Username)</span><div class="input" style="background:var(--sky-50)">' + ic('user') + '<input value="' + esc(m.username) + '" disabled></div><div class="hint">เปลี่ยนได้ที่หัวข้อข้อมูลบัญชี</div></div>' +
      textField('spBirth', 'วัน/เดือน/ปีเกิด', String(m.birthDate || '').slice(0, 10), true, { type: 'date' }) + selectField('spGender', 'เพศ (ไม่บังคับ)', ['ชาย', 'หญิง', 'ไม่ระบุ', 'อื่น ๆ'], m.gender, false, 'spGenderO') + textField('spEmail', 'อีเมล (ใช้รับรหัสผ่านชั้นที่ 2 ทุกครั้งที่เข้าสู่ระบบ)', m.email || '', true, { type: 'email' }) + textField('spPhone', 'หมายเลขโทรศัพท์ (ถ้ามี)', m.phone, false, { type: 'tel', max: 20 }) +
      '<div class="field"><label for="spAddr">ที่อยู่ (ไม่บังคับ)</label><div class="input"><textarea id="spAddr" maxlength="400">' + esc(m.address || '') + '</textarea></div></div><div class="field"><label for="spBio">ประวัติส่วนตัว (Bio)</label><div class="input"><textarea id="spBio" maxlength="600">' + esc(m.bio || '') + '</textarea></div></div>' +
      '<button class="btn k block" id="spSave">' + ic('check') + ' บันทึกข้อมูลส่วนตัว</button></div>';
    var spTO = $('#spTitleO', b); if (spTO && TITLES.indexOf(m.title) < 0) { spTO.value = m.title || ''; $('#spTitleOW', b).classList.remove('hidden'); }
    $('#spAv', b).onchange = function () {
      var f = this.files[0]; if (!f) return;
      pickAvatar(f).then(function (r) {
        confirmBox('ยืนยันการเปลี่ยนรูปโปรไฟล์', 'ระบบจะใช้ไฟล์ “' + f.name + '” เป็นรูปโปรไฟล์ใหม่').then(function (ok) {
          if (!ok) return;
          var payload = { dataUrl: r.dataUrl };
          var send = function () { return withLoading('กำลังอัปโหลดรูปโปรไฟล์', api('uploadAvatar', payload, { timeout: 60000 })); };
          var p = f.size < 8e6 ? new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { payload.fileBase64 = String(fr.result).split(',')[1]; payload.fileName = f.name; payload.fileMime = f.type; res(); }; fr.onerror = function () { res(); }; fr.readAsDataURL(f); }) : Promise.resolve();
          p.then(send).then(function (res) { S.member.avatar = res.avatar; store.set('member', S.member); renderHeaderBits(); refreshCurrent(); toast(res.msg, '', 'ok'); openSettings('personal'); }).catch(function (e) { toast('อัปโหลดไม่สำเร็จ', e.msg, 'bad'); });
        });
      }).catch(function (e) { toast('ไม่สามารถอ่านไฟล์ได้', e.message, 'bad'); });
    };
    $('#spSave', b).onclick = function () {
      var title = $('#spTitle', b).value === 'อื่น ๆ' ? $('#spTitleO', b).value.trim() : $('#spTitle', b).value;
      var em = $('#spEmail', b).value.trim();
      if (!/^[^\s@<>()",;:]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(em)) { setErr('spEmail', 'กรุณากรอกอีเมลที่ถูกต้อง เพื่อใช้รับรหัสผ่านชั้นที่ 2'); return; }
      var fields = { email: em, title: title, firstName: $('#spFirst', b).value.trim(), lastName: $('#spLast', b).value.trim(), displayName: $('#spDisp', b).value.trim(), birthDate: $('#spBirth', b).value, gender: $('#spGender', b).value === 'อื่น ๆ' ? $('#spGenderO', b).value.trim() : $('#spGender', b).value, phone: $('#spPhone', b).value.trim(), address: $('#spAddr', b).value.trim(), bio: $('#spBio', b).value.trim() };
      if (!fields.firstName || !fields.lastName || !fields.displayName || !fields.title) { toast('กรุณากรอกข้อมูลที่จำเป็นให้ครบ', 'คำนำหน้าชื่อ ชื่อจริง นามสกุล และชื่อที่แสดง', 'warn'); return; }
      confirmBox('ยืนยันการบันทึก', 'ระบบจะบันทึกข้อมูลส่วนตัวที่แก้ไข').then(function (ok) { if (!ok) return; withLoading('กำลังบันทึก', api('updateProfile', { fields: fields })).then(function (r) { afterMember(r); toast(r.msg, '', 'ok'); }).catch(function (e) { toast('บันทึกไม่สำเร็จ', e.msg, 'bad'); }); });
    };
  },
  account: function (b) {
    var m = S.member;
    b.innerHTML = '<div class="panel flat"><dl class="kv"><dt>รหัสสมาชิก (Member ID)</dt><dd>' + esc(m.memberId) + '</dd><dt>ชื่อบัญชีผู้ใช้งาน</dt><dd>' + esc(m.username) + '</dd><dt>ประเภทสมาชิก</dt><dd>' + esc(m.memberType) + '</dd><dt>วันที่สมัครสมาชิก</dt><dd>' + fmtDateTime(m.createdAt) + '</dd><dt>วันที่เข้าใช้งานล่าสุด</dt><dd>' + fmtDateTime(m.lastLogin) + '</dd><dt>สถานะบัญชี</dt><dd>' + esc(m.accountStatus || 'ปกติ') + ' <span class="tiny muted">(ปกติ / ระงับ / ปิดใช้งาน)</span></dd></dl></div>' +
      '<h3 style="margin:18px 0 8px">เปลี่ยนชื่อผู้ใช้งาน</h3><div class="col" style="gap:10px">' + textField('saUser', 'ชื่อผู้ใช้งานใหม่', '', true, { icon: 'user', max: 24 }) + pwField('saPass', 'ยืนยันด้วยรหัสผ่านส่วนตัว', {}) + '<button class="btn k" id="saSave">' + ic('check') + ' เปลี่ยนชื่อผู้ใช้งาน</button></div>' +
      '<h3 style="margin:18px 0 8px">เชื่อมต่อบัญชีภายนอก</h3><div class="col" style="gap:8px">' + [['google', 'Google'], ['apple', 'Apple'], ['facebook', 'Facebook'], ['line', 'LINE']].map(function (p) { var linked = (m.social || []).indexOf(p[0]) > -1; return '<div class="entry"><span style="width:28px;height:28px;display:grid;place-items:center">' + BRAND[p[0]] + '</span><span class="grow et">' + p[1] + '</span>' + (linked ? '<button class="btn sm danger" data-unlink="' + p[0] + '">ยกเลิกการเชื่อมต่อ</button>' : '<button class="btn sm" data-link="' + p[0] + '">เชื่อมต่อ</button>') + '</div>'; }).join('') + '</div>' +
      '<h3 style="margin:18px 0 8px">เปลี่ยนรหัสผ่าน</h3><button class="btn block" id="saPw">' + ic('key') + ' ไปที่หัวข้อความปลอดภัย</button>';
    $$('.entry svg', b).forEach(function (s) { s.style.width = '24px'; s.style.height = '24px'; });
    $('#saPw', b).onclick = function () { openSettings('security'); };
    $('#saSave', b).onclick = function () {
      var u = $('#saUser', b).value.trim(), p = $('#saPass', b).value;
      confirmBox('ยืนยันการเปลี่ยนชื่อผู้ใช้งาน', 'ชื่อผู้ใช้งานใหม่คือ “' + u + '” ท่านต้องใช้ชื่อนี้ในการเข้าสู่ระบบครั้งถัดไป').then(function (ok) { if (!ok) return; withLoading('กำลังบันทึก', api('changeUsername', { username: u, password: p })).then(function (r) { afterMember(r); toast(r.msg, '', 'ok'); openSettings('account'); }).catch(function (e) { toast('เปลี่ยนชื่อผู้ใช้งานไม่สำเร็จ', e.msg, 'bad'); }); });
    };
    on(b, 'click', '[data-link]', function (e, x) {
      var k = x.getAttribute('data-link');
      confirmBox('เชื่อมต่อบัญชี', 'ระบบจะพาท่านไปยืนยันตัวตนกับผู้ให้บริการ และกลับมายังเว็บไซต์โดยอัตโนมัติ').then(function (ok) { if (!ok) return; withLoading('กำลังเชื่อมต่อ', api('linkSocial', { provider: k })).then(function (r) { try { window.top.location.href = r.url; } catch (er) { window.open(r.url, '_blank'); } }).catch(function (er) { toast('ไม่สามารถเชื่อมต่อได้', er.msg, 'bad'); }); });
    });
    on(b, 'click', '[data-unlink]', function (e, x) {
      var k = x.getAttribute('data-unlink');
      confirmBox('ยกเลิกการเชื่อมต่อ', 'ท่านจะไม่สามารถเข้าสู่ระบบด้วยบัญชีนี้ได้จนกว่าจะเชื่อมต่อใหม่', { danger: true }).then(function (ok) { if (!ok) return; api('linkSocial', { unlink: k }).then(function (r) { S.member.social = r.social; store.set('member', S.member); toast(r.msg, '', 'ok'); openSettings('account'); }).catch(function (er) { toast('ไม่สำเร็จ', er.msg, 'bad'); }); });
    });
  },
  security: function (b) {
    var st = S.ud.settings;
    b.innerHTML = '<h3 style="margin-bottom:8px">เปลี่ยนรหัสผ่าน</h3><div class="col" style="gap:10px">' + pwField('ssOld', 'รหัสผ่านเดิม (ยืนยันก่อนเปลี่ยน)', { ac: 'current-password' }) + pwField('ssNew', 'รหัสผ่านใหม่', { meter: true, ac: 'new-password' }) + pwField('ssNew2', 'ยืนยันรหัสผ่านใหม่', { ac: 'new-password' }) + '<button class="btn k" id="ssSave">' + ic('key') + ' เปลี่ยนรหัสผ่าน</button></div>' +
      '<h3 style="margin:18px 0 8px">ตั้งค่าการล็อกอิน</h3>' + rowSwitch('ssRemember', 'จดจำการเข้าสู่ระบบ', 'เข้าใช้งานต่อได้ทันทีเมื่อเปิดเว็บไซต์ใหม่ จนกว่าจะออกจากระบบ', st.remember !== false) +
      '<div class="field" style="margin-top:10px"><label for="ssIdle">ออกจากระบบอัตโนมัติเมื่อไม่มีการใช้งาน</label><div class="input"><select id="ssIdle">' + [[0, 'ไม่ออกจากระบบอัตโนมัติ'], [15, '15 นาที'], [30, '30 นาที'], [60, '1 ชั่วโมง'], [180, '3 ชั่วโมง']].map(function (o) { return '<option value="' + o[0] + '"' + (+st.idle === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div></div>' +
      '<h3 style="margin:18px 0 8px">การล็อกบัญชีเมื่อใส่รหัสผิดหลายครั้ง</h3><div class="panel flat small"><p>ผิดครั้งที่ 1–2 ระบบแจ้งว่าข้อมูลไม่ถูกต้อง · ผิดครั้งที่ 3 เพิ่มระดับการตรวจสอบ · ผิดครั้งที่ 4 จำกัดความถี่ · ผิดครั้งที่ 5 ระงับการเข้าสู่ระบบชั่วคราว 15 นาที · หากพบการโจมตีซ้ำ แจ้งผู้ดูแลระบบทันที</p><p class="muted" style="margin-top:6px">จำนวนครั้งและระยะเวลากำหนดโดยผู้ดูแลระบบ เพื่อให้มาตรฐานเดียวกันทุกบัญชี</p></div>' +
      '<h3 style="margin:18px 0 8px">อุปกรณ์ที่เข้าสู่ระบบอยู่</h3><div id="ssDev"><div class="skeleton" style="height:56px"></div></div>' +
      '<h3 style="margin:18px 0 8px">ประวัติการเข้าสู่ระบบล่าสุด</h3><div id="ssLog"><div class="skeleton" style="height:56px"></div></div>' +
      '<button class="btn danger block" style="margin-top:16px" id="ssAll">' + ic('logout') + ' ออกจากระบบทุกอุปกรณ์</button>';
    bindMeter('ssNew');
    $('#ssRemember', b).onchange = function () { st.remember = this.checked; saveUD(); toast('บันทึกการตั้งค่าแล้ว', '', 'ok', { life: 1800 }); };
    $('#ssIdle', b).onchange = function () { st.idle = +this.value; saveUD(); toast('บันทึกการตั้งค่าแล้ว', '', 'ok', { life: 1800 }); };
    $('#ssSave', b).onclick = function () {
      var o = $('#ssOld', b).value, n = $('#ssNew', b).value, n2 = $('#ssNew2', b).value;
      setErr('ssOld'); setErr('ssNew'); setErr('ssNew2');
      if (!o) { setErr('ssOld', 'กรุณากรอกรหัสผ่านเดิม'); return; }
      if (!pwStrength(n).ok) { setErr('ssNew', 'รหัสผ่านใหม่ยังไม่ตรงตามข้อกำหนด'); return; }
      if (n !== n2) { setErr('ssNew2', 'รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน'); return; }
      confirmBox('ยืนยันการเปลี่ยนรหัสผ่าน', 'อุปกรณ์อื่นทั้งหมดจะถูกออกจากระบบเพื่อความปลอดภัย').then(function (ok) {
        if (!ok) return;
        withLoading('กำลังเปลี่ยนรหัสผ่าน', api('changePassword', { oldPass: o, newPass: n })).then(function (r) { addNotice({ type: 'password', title: 'มีการเปลี่ยนรหัสผ่าน', body: 'รหัสผ่านส่วนตัวของท่านถูกเปลี่ยนเมื่อ ' + fmtDateTime(Date.now()) }); alertBox('เปลี่ยนรหัสผ่านสำเร็จ', r.msg, { icon: 'check' }); $('#ssOld', b).value = $('#ssNew', b).value = $('#ssNew2', b).value = ''; }).catch(function (e) { setErr('ssOld', e.msg); });
      });
    };
    $('#ssAll', b).onclick = function () {
      confirmBox('ออกจากระบบทุกอุปกรณ์', 'ทุกอุปกรณ์รวมถึงอุปกรณ์นี้จะถูกออกจากระบบทันที', { danger: true, icon: 'logout', tone: 'bad' }).then(function (ok) { if (!ok) return; withLoading('กำลังดำเนินการ', api('logoutAll', {})).then(function () { clearSession(); renderLogin(); toast('ออกจากระบบทุกอุปกรณ์แล้ว', 'กรุณาเข้าสู่ระบบอีกครั้ง', 'ok'); }).catch(function (e) { toast('ไม่สำเร็จ', e.msg, 'bad'); }); });
    };
    api('devices', {}).then(function (r) { var box = $('#ssDev', b); if (!box) return; box.innerHTML = r.items.map(function (d) { return '<div class="entry"><span>' + ic(d.device === 'คอมพิวเตอร์' ? 'monitor' : 'smartphone') + '</span><span class="grow"><span class="et">' + esc([d.device, d.os, d.browser].filter(Boolean).join(' / ')) + (d.current ? ' <span class="tag ok">อุปกรณ์นี้</span>' : '') + '</span><br><span class="es">เข้าสู่ระบบ ' + fmtDateTime(d.createdAt) + ' · ใช้งานล่าสุด ' + fmtDateTime(d.lastSeen) + (d.ip ? ' · IP ' + esc(d.ip) : '') + (d.location ? ' · ' + esc(d.location) : '') + '</span></span></div>'; }).join('') || '<p class="muted small">ไม่พบข้อมูล</p>'; }).catch(function () { var box = $('#ssDev', b); if (box) box.innerHTML = '<p class="muted small">โหลดข้อมูลไม่สำเร็จ</p>'; });
    api('loginHistory', {}).then(function (r) { var box = $('#ssLog', b); if (!box) return; box.innerHTML = r.items.slice(0, 8).map(function (x) { return '<div class="entry"><span style="color:' + (x.result === 'SUCCESS' ? 'var(--ok)' : 'var(--bad)') + '">' + ic(x.result === 'SUCCESS' ? 'check' : 'alert') + '</span><span class="grow"><span class="et">' + fmtDateTime(x.time) + '</span><br><span class="es">' + esc(x.reason || x.result) + ' · ' + esc([x.device, x.os, x.browser].filter(Boolean).join(' / ')) + '</span></span></div>'; }).join('') || '<p class="muted small">ไม่พบข้อมูล</p>'; }).catch(function () {});
  },
  privacy: function (b) {
    var pv = S.member.privacy || {};
    b.innerHTML = '<h3 style="margin-bottom:6px">การแสดงผลข้อมูลส่วนตัว</h3>' + rowSwitch('pvProfile', 'แสดงโปรไฟล์', 'อนุญาตให้แสดงข้อมูลโปรไฟล์ภายในระบบ', pv.showProfile !== false) + rowSwitch('pvName', 'แสดงชื่อโปรไฟล์', 'ซ่อนหรือแสดงชื่อจริงในโปรไฟล์', pv.showName !== false) + rowSwitch('pvSearch', 'อนุญาตให้ค้นหาบัญชี', 'ผู้ดูแลระบบหรือสมาชิกอื่นค้นหาบัญชีของท่านได้', pv.searchable !== false) +
      '<div class="field" style="margin-top:10px"><label for="pvWho">ผู้ที่สามารถดูโปรไฟล์ได้</label><div class="input"><select id="pvWho"><option value="members"' + (pv.visibleTo !== 'admin' && pv.visibleTo !== 'none' ? ' selected' : '') + '>สมาชิกทุกคน</option><option value="admin"' + (pv.visibleTo === 'admin' ? ' selected' : '') + '>เฉพาะผู้ดูแลระบบ</option><option value="none"' + (pv.visibleTo === 'none' ? ' selected' : '') + '>เฉพาะตัวเอง</option></select></div></div>' +
      '<button class="btn k block" style="margin-top:12px" id="pvSave">' + ic('check') + ' บันทึกการตั้งค่าความเป็นส่วนตัว</button>' +
      '<h3 style="margin:18px 0 8px">จัดการข้อมูลส่วนบุคคล</h3><div class="prose small"><p class="noindent">ท่านมีสิทธิขอเข้าถึง ขอรับสำเนา ขอแก้ไข ขอลบ และคัดค้านการประมวลผลข้อมูลส่วนบุคคลของท่านตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562</p></div>' +
      '<div class="col" style="gap:8px;margin-top:10px"><button class="btn" id="pvCopy">' + ic('download') + ' ขอสำเนาข้อมูลบัญชี</button><button class="btn" data-doc="privacy">' + ic('shield') + ' อ่านนโยบายความเป็นส่วนตัว</button><button class="btn danger" id="pvDel">' + ic('trash') + ' ลบบัญชีผู้ใช้งาน</button></div>';
    $('#pvSave', b).onclick = function () {
      var p = { showProfile: $('#pvProfile', b).checked, showName: $('#pvName', b).checked, searchable: $('#pvSearch', b).checked, visibleTo: $('#pvWho', b).value };
      confirmBox('ยืนยันการบันทึก', 'ระบบจะบันทึกการตั้งค่าความเป็นส่วนตัว').then(function (ok) { if (!ok) return; api('setPrivacy', { privacy: p }).then(function (r) { S.member.privacy = r.privacy; store.set('member', S.member); toast(r.msg, '', 'ok'); }).catch(function (e) { toast('บันทึกไม่สำเร็จ', e.msg, 'bad'); }); });
    };
    $('#pvCopy', b).onclick = exportMyData;
    $('#pvDel', b).onclick = deleteAccountFlow;
  },
  general: function (b) {
    var st = S.ud.settings;
    b.innerHTML = '<div class="field"><span class="lbl">ภาษาเว็บไซต์</span><div class="seg" id="gLang"><button data-v="th" class="' + (st.lang === 'th' ? 'on' : '') + '">ไทย</button><button data-v="en" class="' + (st.lang === 'en' ? 'on' : '') + '">English</button><button data-v="ko" class="' + (st.lang === 'ko' ? 'on' : '') + '">한국어</button></div><div class="hint">เปลี่ยนภาษาของเมนูและปุ่มหลัก ส่วนตัวบทกฎหมายแสดงเป็นภาษาไทยตามต้นฉบับ</div></div>' +
      '<div class="field" style="margin-top:14px"><span class="lbl">ธีมเว็บไซต์</span><div class="seg" id="gTheme"><button data-v="light" class="' + (st.theme === 'light' ? 'on' : '') + '">' + ic('sun') + ' สว่าง</button><button data-v="dark" class="' + (st.theme === 'dark' ? 'on' : '') + '">' + ic('moon') + ' มืด</button><button data-v="system" class="' + (st.theme === 'system' ? 'on' : '') + '">' + ic('monitor') + ' ตามอุปกรณ์</button></div><div class="hint">ทุกส่วนของเว็บไซต์ปรับสีให้เข้ากับธีมที่เลือก โดยค่อย ๆ เปลี่ยนอย่างนุ่มนวล</div></div>' +
      '<div class="field" style="margin-top:14px"><label for="gFont">ขนาดตัวอักษร <b id="gFontV">' + Math.round(st.fontScale * 100) + '%</b></label><input type="range" id="gFont" min="0.85" max="2" step="0.05" value="' + st.fontScale + '" style="width:100%;accent-color:var(--sky-600)"><div class="hint">ขนาดตัวอักษรปรับตามขนาดหน้าจออัตโนมัติ และขยายเพิ่มได้ถึง 200% โดยไม่ล้นกรอบ</div></div>' +
      '<div class="field" style="margin-top:14px"><label for="gDate">รูปแบบวันที่</label><div class="input"><select id="gDate"><option value="be"' + (st.dateFmt !== 'ce' ? ' selected' : '') + '>พุทธศักราช (เช่น ' + (function () { var p = parts(new Date()); return p.d + ' ' + TH_MON_S[p.m - 1] + ' ' + (p.y + 543); })() + ')</option><option value="ce"' + (st.dateFmt === 'ce' ? ' selected' : '') + '>คริสต์ศักราช (เช่น ' + (function () { var p = parts(new Date()); return p.d + ' ' + TH_MON_S[p.m - 1] + ' ' + p.y; })() + ')</option></select></div></div>' +
      '<div class="field" style="margin-top:14px"><label for="gTz">เขตเวลา</label><div class="input"><select id="gTz">' + ['Asia/Bangkok', 'Asia/Seoul', 'Asia/Tokyo', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'UTC'].map(function (z) { return '<option' + (st.tz === z ? ' selected' : '') + '>' + z + '</option>'; }).join('') + '</select></div></div>' +
      '<h3 style="margin:18px 0 6px">การแสดงผลหน้าเว็บไซต์</h3>' + rowSwitch('gCompact', 'แสดงผลแบบกระชับ', 'ลดระยะห่างระหว่างองค์ประกอบ', st.density === 'compact') + rowSwitch('gMotion', 'ลดการเคลื่อนไหว', 'ปิดแอนิเมชันเพื่อความเร็วและความสบายตา', !!st.reduceMotion) + rowSwitch('gSound', 'เสียงประกอบ', 'เสียงกดปุ่มและเสียงตัวจับเวลา', st.sound !== false);
    function save() { applySettings(); saveUD(); renderHeaderBits(); }
    on(b, 'click', '#gLang [data-v]', function (e, x) { st.lang = x.getAttribute('data-v'); $$('#gLang button', b).forEach(function (y) { y.classList.toggle('on', y === x); }); save(); refreshCurrent(); toast('เปลี่ยนภาษาเว็บไซต์แล้ว', '', 'ok', { life: 1800 }); });
    on(b, 'click', '#gTheme [data-v]', function (e, x) { st.theme = x.getAttribute('data-v'); $$('#gTheme button', b).forEach(function (y) { y.classList.toggle('on', y === x); }); save(); });
    $('#gFont', b).oninput = function () { st.fontScale = +this.value; $('#gFontV', b).textContent = Math.round(st.fontScale * 100) + '%'; applySettings(); };
    $('#gFont', b).onchange = save;
    $('#gDate', b).onchange = function () { st.dateFmt = this.value; save(); refreshCurrent(); };
    $('#gTz', b).onchange = function () { st.tz = this.value; save(); refreshCurrent(); };
    $('#gCompact', b).onchange = function () { st.density = this.checked ? 'compact' : 'comfortable'; save(); };
    $('#gMotion', b).onchange = function () { st.reduceMotion = this.checked; save(); };
    $('#gSound', b).onchange = function () { st.sound = this.checked; save(); if (this.checked) SND.click(); };
  },
  notif: function (b) {
    var n = S.ud.settings.notif;
    b.innerHTML = '<p class="muted small" style="margin-bottom:8px">ระบบแจ้งเตือนภายในเว็บไซต์ได้โดยไม่ต้องเชื่อมต่ออีเมล</p>' + rowSwitch('nAll', 'เปิด/ปิดการแจ้งเตือนทั้งหมด', '', n.all) + rowSwitch('nIn', 'แจ้งเตือนภายในระบบ', 'แสดงแถบแจ้งเตือนมุมจอเมื่อมีเหตุการณ์ใหม่', n.inapp) + rowSwitch('nPw', 'แจ้งเตือนเมื่อมีการเปลี่ยนรหัสผ่าน', '', n.password) + rowSwitch('nDev', 'แจ้งเตือนเมื่อมีการเข้าสู่ระบบจากอุปกรณ์ใหม่', '', n.device) + rowSwitch('nNews', 'แจ้งเตือนข่าวสารเว็บไซต์', 'ประกาศจากผู้ดูแลระบบ กฎหมายใหม่ และการแก้ไขกฎหมาย', n.news) +
      '<button class="btn block" style="margin-top:14px" id="nOpen">' + ic('bell') + ' เปิดศูนย์การแจ้งเตือน</button>';
    [['nAll', 'all'], ['nIn', 'inapp'], ['nPw', 'password'], ['nDev', 'device'], ['nNews', 'news']].forEach(function (x) { $('#' + x[0], b).onchange = function () { n[x[1]] = this.checked; saveUD(); toast('บันทึกการตั้งค่าแล้ว', '', 'ok', { life: 1600 }); }; });
    $('#nOpen', b).onclick = function () { document.querySelector('.drawer .icon-btn[data-x]').click(); nav('notifications'); };
  },
  manage: function (b, close) {
    b.innerHTML = '<div class="menu-list">' +
      '<button class="menu-item" id="mBackup"><span class="mi">' + ic('download') + '</span><span class="grow"><span class="mt">สำรองข้อมูลส่วนตัว</span><br><span class="ms">ข้อมูลทั้งหมดของท่าน พร้อมหมายเหตุกฎหมายคุ้มครองข้อมูลส่วนบุคคล (ไฟล์ PDF)</span></span></button>' +
      '<button class="menu-item" id="mExport"><span class="mi">' + ic('file') + '</span><span class="grow"><span class="mt">ดาวน์โหลดข้อมูลสมาชิก</span><br><span class="ms">ข้อมูลบัญชี ประวัติการเข้าสู่ระบบ และกฎหมายที่เกี่ยวข้อง (ไฟล์ PDF)</span></span></button>' +
      '<button class="menu-item" id="mDeact"><span class="mi">' + ic('power') + '</span><span class="grow"><span class="mt">ปิดใช้งานบัญชีชั่วคราว</span><br><span class="ms">เปิดใช้งานได้อีกครั้งเมื่อเข้าสู่ระบบ</span></span></button>' +
      '<button class="menu-item danger" id="mDel"><span class="mi">' + ic('trash') + '</span><span class="grow"><span class="mt">ลบบัญชีถาวร</span><br><span class="ms">ต้องยืนยันตัวตนด้วยรหัสผ่านทั้งสองชั้น</span></span></button>' +
      '<button class="menu-item danger" id="mOut"><span class="mi">' + ic('logout') + '</span><span class="grow"><span class="mt">ออกจากระบบ</span></span></button></div>' +
      '<p class="tiny muted" style="margin-top:14px">เวอร์ชัน ' + esc(APP_VERSION) + (S.member && S.member.role === 'admin' ? ' · <button class="btn sm ghost" id="mDebug">' + ic('bug') + ' โหมดดีบั๊ก</button>' : '') + '</p><div id="dbgBox"></div>';
    $('#mBackup', b).onclick = function () { if (!gate('backup')) return; confirmBox('สำรองข้อมูลส่วนตัว', 'ระบบจะบันทึกข้อมูลล่าสุดของท่าน แล้วสร้างเอกสาร PDF ทางการ (ข้อมูลส่วนตัว รายการโปรด ประวัติ เวลาใช้งาน สมุดบันทึก และการตั้งค่า) ดาวน์โหลดลงในอุปกรณ์นี้').then(function (ok) { if (!ok) return; api('saveUserData', { data: S.ud, baseRev: S.rev }, { noRetry: true }).then(function (r) { S.rev = r.rev; store.set(udKey() + '.rev', S.rev); }).catch(function () {}).then(function () { officialPdf('backupPdf', 'กำลังสร้างเอกสารสำรองข้อมูล'); }); }); };
    $('#mExport', b).onclick = exportMyData;
    $('#mDeact', b).onclick = function () {
      modal({ title: 'ปิดใช้งานบัญชีชั่วคราว', icon: 'power', tone: 'o', html: '<p class="muted" style="margin-bottom:10px">ระหว่างปิดใช้งาน ข้อมูลทั้งหมดของท่านจะถูกเก็บรักษาไว้ครบถ้วน และสามารถเปิดใช้งานได้อีกครั้งเมื่อเข้าสู่ระบบ</p>' + pwField('dePass', 'ยืนยันด้วยรหัสผ่านส่วนตัว', {}), ok: 'ปิดใช้งานบัญชี', danger: true,
        onOk: function (m) { return api('setAccountStatus', { status: 'ปิดใช้งาน', password: $('#dePass', m).value }).then(function (r) { toast(r.msg, '', 'ok'); close(); doLogout(true); return true; }).catch(function (e) { setErr('dePass', e.msg); return false; }); } });
    };
    $('#mDel', b).onclick = deleteAccountFlow;
    $('#mOut', b).onclick = function () { close(); doLogout(); };
    if ($('#mDebug', b)) $('#mDebug', b).onclick = function () {
      var box = $('#dbgBox', b);
      box.innerHTML = '<div class="panel flat" style="margin-top:8px"><div class="row" style="margin-bottom:8px"><b class="grow">Live Log</b><button class="btn sm" id="dbgPing">' + ic('activity') + ' Health check</button></div><div class="debug-log" id="debugLog"></div><div class="tiny muted" style="margin-top:6px">ออนไลน์: ' + (S.online ? 'ใช่' : 'ไม่') + ' · โหมดปลอดภัย: ' + (SAFE_MODE ? 'เปิด' : 'ปิด') + ' · แพ็กเกจ: ' + planKey() + ' · ฐานข้อมูลเวอร์ชัน: ' + esc(S.catVer) + '</div>' + (SAFE_MODE ? '<button class="btn sm" id="dbgSafe" style="margin-top:8px">ปิดโหมดปลอดภัย</button>' : '') + '</div>';
      dlog('debug', 'debug mode opened');
      $('#dbgPing', b).onclick = function () { var t0 = Date.now(); api('ping', {}).then(function (r) { dlog('health', 'ok ' + (Date.now() - t0) + 'ms server v' + r.v); }).catch(function (e) { dlog('health', 'FAIL ' + e.code); }); };
      var sb = $('#dbgSafe', b); if (sb) sb.onclick = function () { store.del('safeMode'); SAFE_MODE = false; toast('ปิดโหมดปลอดภัยแล้ว', 'โหลดหน้าเว็บใหม่เพื่อเปิดใช้ฟีเจอร์ทั้งหมด', 'ok'); };
    };
  }
};
function exportMyData() {
  confirmBox('ขอสำเนาข้อมูลบัญชี', 'ระบบจะรวบรวมข้อมูลบัญชี ประวัติการเข้าสู่ระบบ และหมายเหตุกฎหมายคุ้มครองข้อมูลส่วนบุคคล แล้วดาวน์โหลดเป็นเอกสาร PDF ลงในอุปกรณ์นี้').then(function (ok) {
    if (!ok) return;
    officialPdf('memberPdf', 'กำลังสร้างเอกสารข้อมูลสมาชิก');
  });
}
function deleteAccountFlow() {
  modal({ title: 'ลบบัญชีผู้ใช้งานถาวร', icon: 'trash', tone: 'bad', danger: true, ok: 'ลบบัญชีถาวร', wide: true,
    html: '<div class="prose small"><p class="noindent">การลบบัญชีถาวรจะลบข้อมูลสมาชิก รายการโปรด ประวัติ เวลา โน้ต และการตั้งค่าทั้งหมด และไม่สามารถกู้คืนได้ หากต้องการหยุดใช้งานชั่วคราว แนะนำให้เลือก “ปิดใช้งานบัญชีชั่วคราว” แทน</p></div><div class="col" style="gap:10px;margin-top:12px">' + pwField('dlAdmin', 'รหัสผ่านชั้นที่ 1 (จากผู้ดูแลระบบ)', { icon: 'shield' }) + pwField('dlPass', 'รหัสผ่านชั้นที่ 2 (รหัสผ่านส่วนตัว)', {}) + textField('dlConfirm', 'พิมพ์ชื่อผู้ใช้งาน “' + S.member.username + '” เพื่อยืนยัน', '', true) + '</div>',
    onOk: function (m) {
      return api('deleteAccount', { adminPass: $('#dlAdmin', m).value, password: $('#dlPass', m).value, confirmText: $('#dlConfirm', m).value.trim() }).then(function (r) {
        store.wipe(); S.token = ''; S.member = null; S.ud = null; renderWelcome(); alertBox('ลบบัญชีเรียบร้อยแล้ว', r.msg, { icon: 'check' }); return true;
      }).catch(function (e) { setErr('dlPass', e.msg); return false; });
    } });
}

/* ---------------- NOTIFICATIONS ---------------- */
VIEWS.notifications = function (el) {
  var ud = S.ud;
  function draw() {
    var list = ud.notices;
    el.innerHTML = '<div class="view-head"><div><h2>' + tr('notifications') + '</h2><p class="sub">ยังไม่ได้อ่าน ' + unreadCount() + ' รายการ</p></div><div class="row wrapr" style="gap:8px"><button class="btn sm" id="nfRead">' + ic('check') + ' ทำเครื่องหมายว่าอ่านแล้วทั้งหมด</button><button class="btn sm" id="nfSet">' + ic('gear') + ' ตั้งค่า</button></div></div>' +
      (list.length ? '<div class="anim-list">' + list.map(function (n) { var unread = !ud.readNotices[n.id]; return '<div class="entry" style="' + (unread ? 'border-color:var(--sky-300);background:var(--sky-50)' : '') + '"><span style="color:' + (n.type === 'security' ? 'var(--orange)' : 'var(--sky-600)') + '">' + ic(n.type === 'security' ? 'shield' : n.type === 'password' ? 'key' : 'bell') + '</span><span class="grow"><span class="et">' + esc(n.title) + (unread ? ' <span class="tag o">ใหม่</span>' : '') + '</span><br><span class="es">' + esc(n.body) + ' · ' + fmtDateTime(n.time) + '</span></span>' + (unread ? '<button class="icon-btn" data-rd="' + esc(n.id) + '" aria-label="อ่านแล้ว">' + ic('check') + '</button>' : '') + '<button class="icon-btn" data-del="' + esc(n.id) + '" aria-label="ลบ" style="color:var(--bad)">' + ic('trash') + '</button></div>'; }).join('') + '</div>'
        : '<div class="panel"><div class="empty"><div class="eic">' + ic('bell') + '</div><h3>ไม่มีการแจ้งเตือน</h3><p>เมื่อมีกฎหมายใหม่ การแก้ไขกฎหมาย ประกาศจากผู้ดูแลระบบ หรือเหตุการณ์ด้านความปลอดภัย ระบบจะแจ้งเตือนที่นี่</p></div></div>');
    $('#nfRead', el).onclick = function () { ud.notices.forEach(function (n) { ud.readNotices[n.id] = 1; }); saveUD(); renderHeaderBits(); draw(); };
    $('#nfSet', el).onclick = function () { openSettings('notif'); };
  }
  on(el, 'click', '[data-rd]', function (e, b) { ud.readNotices[b.getAttribute('data-rd')] = 1; saveUD(); renderHeaderBits(); draw(); });
  on(el, 'click', '[data-del]', function (e, b) { e.stopPropagation(); var id = b.getAttribute('data-del'); confirmBox('ลบการแจ้งเตือน', 'ต้องการลบการแจ้งเตือนนี้หรือไม่', { danger: true, icon: 'trash' }).then(function (ok) { if (!ok) return; ud.notices = ud.notices.filter(function (n) { return n.id !== id; }); ud.readNotices[id] = 1; saveUD(); renderHeaderBits(); draw(); }); });
  draw();
};

/* ---------------- report dialog (แจ้งปัญหา / รายงานข้อมูลกฎหมาย) ---------------- */
function reportDialog(kind, preset) {
  modal({ title: kind, icon: 'send', html: '<div class="col" style="gap:10px">' + textField('rpSubj', 'หัวข้อ', preset ? preset.slice(0, 110) : '', true) + '<div class="field"><label for="rpDetail">รายละเอียด</label><div class="input"><textarea id="rpDetail" maxlength="3000" placeholder="อธิบายสิ่งที่พบ ขั้นตอนที่ทำ และสิ่งที่คาดว่าควรเป็น">' + esc(preset || '') + '</textarea></div></div></div>', ok: 'ส่งเรื่อง',
    onOk: function (m) { var s = $('#rpSubj', m).value.trim(), d = $('#rpDetail', m).value.trim(); if (!s || !d) { toast('กรุณากรอกหัวข้อและรายละเอียด', '', 'warn'); return false; } return api('reportProblem', { kind: kind, subject: s, detail: d }).then(function (r) { toast('ส่งเรื่องเรียบร้อยแล้ว', r.msg, 'ok'); return true; }).catch(function (e) { toast('ส่งเรื่องไม่สำเร็จ', e.msg, 'bad'); return false; }); } });
}
</script>
