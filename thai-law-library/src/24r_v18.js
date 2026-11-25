<script>
/* ==========================================================================
   v18: แนะนำตัวผู้สร้างเว็บไซต์ (ควบคุมจากระบบหลังบ้าน · ชีต Config แถว CREATOR_PROFILE)
   - หน้าแรก: แสดงต่อจาก “สถิติผู้เข้าชมและฐานข้อมูล”
   - ปุ่ม “แนะนำตัว” ในแถบนำทางด้านล่าง (แนวนอนอยู่ด้านซ้าย)
   - รูปภาพสี่เหลี่ยมมุมมน แสดงเต็มภาพ ไม่ตัด ไม่จำกัดขนาด
   ========================================================================== */
var CR18 = { p: null, sig: '', busy: false };
try { CR18.p = JSON.parse(localStorage.getItem('tll.creator18') || 'null'); } catch (e) {}
I18N.th.creator = 'แนะนำตัว'; if (I18N.en) I18N.en.creator = 'About me'; if (I18N.ko) I18N.ko.creator = '소개';
ICONS.idcard = ICONS.idcard || '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16c.6-1.6 1.8-2.4 3.2-2.4s2.6.8 3.2 2.4M14.5 10h4M14.5 13h3"/>';
if (!TABS.some(function (t) { return t[0] === 'creator'; })) TABS.push(['creator', 'idcard']);
function cr18Load(force) {
  if (CR18.busy) return Promise.resolve(CR18.p);
  if (CR18.p && !force) return Promise.resolve(CR18.p);
  CR18.busy = true;
  return api('creatorProfile', {}, { noRetry: true, silent: true, timeout: 15000 }).then(function (r) {
    CR18.p = (r && r.profile) || { on: false };
    try { localStorage.setItem('tll.creator18', JSON.stringify(CR18.p).length < 2000000 ? JSON.stringify(CR18.p) : 'null'); } catch (e) {}
    return CR18.p;
  }).catch(function () { return CR18.p; }).then(function (p) { CR18.busy = false; return p; });
}
function cr18Html(p, full) {
  if (!p || !p.on) return full ? '<div class="empty"><div class="em">' + ic('idcard') + '</div><h3>ยังไม่มีข้อมูลแนะนำตัว</h3><p class="muted">ผู้ดูแลระบบสามารถเพิ่มข้อมูลได้จากระบบหลังบ้าน</p></div>' : '';
  var ph = p.photo ? '<img class="cr18-photo" src="' + esc(p.photo) + '" alt="' + esc(p.name || 'ผู้สร้างเว็บไซต์') + '" loading="lazy">' : '<div class="cr18-photo cr18-ph">' + esc((p.name || 'ค').trim().charAt(0)) + '</div>';
  var paras = String(p.bio || '').replace(/^[\s—\-–]+$/, '').split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
  return '<section class="panel rise in cr18" id="creatorIntro"><div class="panel-title"><span class="ic">' + ic('idcard') + '</span><h2>แนะนำตัวผู้สร้างเว็บไซต์</h2></div>' +
    '<div class="cr18-body"><figure class="cr18-fig">' + ph + '</figure><div class="cr18-txt"><h3>' + esc(p.name || '') + '</h3>' + (p.role ? '<div class="cr18-role">' + esc(p.role) + '</div>' : '') +
    paras.map(function (s) { return '<p>' + esc(s) + '</p>'; }).join('') + '</div></div>' +
    ((p.cards || []).length ? '<div class="cr18-cards">' + p.cards.map(function (c) { return '<div class="cr18-card">' + (c.img ? '<img src="' + esc(c.img) + '" alt="" loading="lazy">' : '') + (c.title ? '<b>' + esc(c.title) + '</b>' : '') + (c.text ? '<p>' + esc(c.text).replace(/\n/g, '<br>') + '</p>' : '') + '</div>'; }).join('') + '</div>' : '') +
    (p.updatedAt ? '<div class="muted small cr18-up">ปรับปรุงล่าสุด ' + esc(fmtDateTime(new Date(p.updatedAt))) + '</div>' : '') + '</section>';
}
/* หน้าแรก: ต่อจากสถิติผู้เข้าชมและฐานข้อมูล */
function cr18Mount() {
  var dash = document.getElementById('trafficDash'); if (!dash) return;
  var cur = document.getElementById('creatorIntro'), html = cr18Html(CR18.p, false);
  if (!html) { if (cur) cur.remove(); return; }
  if (cur) { if (cur.getAttribute('data-sig') === CR18.sig) return; cur.outerHTML = html; }
  else dash.insertAdjacentHTML('afterend', html);
  var n = document.getElementById('creatorIntro'); if (n) n.setAttribute('data-sig', CR18.sig);
}
VIEWS.creator = function (el) {
  el.innerHTML = '<div class="view-head"><div><h1>แนะนำตัว</h1><p class="sub">ผู้สร้างและผู้พัฒนาเว็บไซต์คลังกฎหมาย</p></div></div><div id="cr18View">' + (CR18.p ? cr18Html(CR18.p, true) : '<div class="skel" style="height:220px"></div>') + '</div>';
  cr18Load(!CR18.p).then(function (p) { var v = document.getElementById('cr18View'); if (v) v.innerHTML = cr18Html(p, true); });
};
(function () {
  var baseW = renderWelcome;
  renderWelcome = function () {
    var r = baseW.apply(this, arguments);
    setTimeout(function () { try { cr18Mount(); cr18Load(true).then(function () { cr18Mount(); }); } catch (e) {} }, 60);
    return r;
  };
  var baseModes = applyModes;
  applyModes = function (m) {
    var r = baseModes.apply(this, arguments);
    try {
      if (m && m.creatorSig !== undefined && m.creatorSig !== CR18.sig) {
        var first = !CR18.sig; CR18.sig = m.creatorSig;
        cr18Load(true).then(function (p) {
          cr18Mount();
          var v = document.getElementById('cr18View'); if (v) v.innerHTML = cr18Html(p, true);
        });
      }
    } catch (e) {}
    return r;
  };
})();

/* ==========================================================================
   v18: คำพิพากษาศาลฎีกา — เลือกตามเรื่อง (คดีแพ่ง คดีอาญา แรงงาน ภาษี ฯลฯ) แล้วเลือกเรื่องย่อย พร้อมจำนวนฉบับจริง
   ========================================================================== */
var DT18 = { d: null, p: null, g: '', s: '', shown: 0 };
function dt18Load() { if (DT18.d) return Promise.resolve(DT18.d); if (DT18.p) return DT18.p; DT18.p = loadIndex(DB_RAW + 'deka/topics.json.gz').then(function (x) { DT18.d = x; return x; }).catch(function (e) { DT18.p = null; throw e; }); return DT18.p; }
function dt18Panel(box) {
  var d = DT18.d; if (!d || !box) return;
  var g = d.groups.filter(function (x) { return x.k === DT18.g; })[0];
  var html = '<div class="panel-title"><span class="ic">' + ic('layers') + '</span><h2>เลือกตามเรื่อง</h2>' + (DT18.g ? '<button class="btn sm" id="dt18Clear">' + ic('x') + ' ล้าง</button>' : '') + '</div>' +
    '<p class="muted small" style="margin:-4px 0 10px">' + esc(d.note) + '</p>' +
    '<div class="chips dt18-g" role="tablist">' + d.groups.map(function (x) { return '<button class="chip' + (x.k === DT18.g ? ' on' : '') + '" data-dtg="' + esc(x.k) + '">' + esc(x.name) + ' <span class="cnt">' + fmtN(x.n) + '</span></button>'; }).join('') + '</div>';
  if (g) html += '<div class="dt18-sh">' + esc(g.name) + ' · เลือกเรื่องย่อย</div><div class="chips dt18-s">' + g.subs.map(function (x) {
    return '<button class="chip' + (x.k === DT18.s ? ' on' : '') + '" data-dts="' + esc(x.k) + '">' + esc(x.name) + ' <span class="cnt">' + fmtN(x.n) + '</span>' + (x.kw ? '<span class="dt18-kw" title="จำนวนที่จัดเรื่องจากคำสำคัญ (ข้อมูลต้นทางไม่ได้ระบุมาตรา)">คำสำคัญ ' + fmtN(x.kw) + '</span>' : '') + '</button>';
  }).join('') + '</div>';
  html += '<div id="dt18Res"></div>';
  box.innerHTML = html;
  if (DT18.s) dt18List(true);
}
function dt18List(reset) {
  var res = document.getElementById('dt18Res'); if (!res || !DT18.d) return;
  var ids = DT18.d.idx[DT18.s] || [], sub = null;
  DT18.d.groups.forEach(function (g) { g.subs.forEach(function (x) { if (x.k === DT18.s) sub = x; }); });
  loadDeka().then(function (D) {
    if (reset) { DT18.shown = 0; res.innerHTML = '<div class="group-h">' + esc(sub ? sub.name : '') + ' <span class="cnt">' + fmtN(ids.length) + ' ฉบับ</span></div>'; }
    var mb = document.getElementById('dt18More'); if (mb) mb.remove();
    var next = ids.slice(DT18.shown, DT18.shown + 30); DT18.shown += next.length;
    res.insertAdjacentHTML('beforeend', next.map(function (i) {
      var r = D.recs[i]; if (!r) return '';
      var seen = {}, ls = (r[6] || []).map(function (x) { return D.laws[x[0]][0] + ' ม. ' + x[1]; }).filter(function (t) { if (seen[t]) return false; seen[t] = 1; return true; }).slice(0, 4).join(', ');
      return '<button class="law-item" data-dk="' + r[0] + '" data-o="' + r[5] + '"><span class="li-ic">' + ic('gavel') + '</span><span class="grow"><span class="li-t">' + esc((D.types[r[3]] || 'คำพิพากษาศาลฎีกา') + 'ที่ ' + r[1]) + '</span><br><span class="li-s">' + esc((r[4] === 'พ' ? 'คดีแพ่ง' : r[4] === 'อ' ? 'คดีอาญา' : 'ปี พ.ศ. ' + r[2]) + (ls ? ' · ' + ls : ' · จัดเรื่องจากคำสำคัญ')) + '</span></span>' + ic('chevR') + '</button>';
    }).join('') + (DT18.shown < ids.length ? '<button class="btn block" id="dt18More" style="margin-top:10px">แสดงเพิ่มเติม (' + fmtN(ids.length - DT18.shown) + ')</button>' : ''));
    var m2 = document.getElementById('dt18More'); if (m2) m2.onclick = function () { dt18List(false); };
  }).catch(function () { res.innerHTML = '<div class="panel flat"><p class="small muted">ยังโหลดรายการไม่สำเร็จ กรุณาลองอีกครั้ง</p></div>'; });
}
(function () {
  var base = VIEWS.deka;
  VIEWS.deka = function (el) {
    base.apply(this, arguments);
    try {
      var head = el.querySelector('.view-head'); if (!head) return;
      var box = document.createElement('section'); box.className = 'panel dt18'; box.id = 'dt18';
      box.innerHTML = '<div class="skel" style="height:90px"></div>';
      head.parentNode.insertBefore(box, head.nextSibling);
      dt18Load().then(function () { if (box.isConnected) dt18Panel(box); }).catch(function () { box.innerHTML = '<p class="small muted">ยังโหลดหมวดเรื่องไม่สำเร็จ</p>'; });
      box.addEventListener('click', function (e) {
        var t = e.target.closest('[data-dtg],[data-dts],#dt18Clear,[data-dk]'); if (!t) return;
        if (t.hasAttribute('data-dk')) { openDeka(t.getAttribute('data-dk'), t.getAttribute('data-o')); return; }
        if (t.id === 'dt18Clear') { DT18.g = ''; DT18.s = ''; }
        else if (t.hasAttribute('data-dtg')) { var k = t.getAttribute('data-dtg'); DT18.g = DT18.g === k ? '' : k; DT18.s = ''; var gg = DT18.d.groups.filter(function (x) { return x.k === DT18.g; })[0]; if (gg && gg.subs.length === 1) DT18.s = gg.subs[0].k; }
        else { DT18.s = t.getAttribute('data-dts'); }
        dt18Panel(box);
        if (DT18.s) { var r = document.getElementById('dt18Res'); if (r) r.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
      });
    } catch (e) {}
  };
})();

/* ==========================================================================
   v18: อนุสัญญา/สนธิสัญญา — ไฟล์ PDF ต้นฉบับต่อท้ายเนื้อหา (แสดงตัวอย่าง เลื่อนอ่านได้ ปุ่มขยายเข้า/ย่อออกมุมขวาบนของไฟล์)
   ที่มา: Wikidata (P996 ไฟล์บน Wikimedia Commons, P953 ฉบับเต็ม, P9966 UN Treaty Collection) พร้อมลิงก์แหล่งต้นฉบับ
   ========================================================================== */
var TP18 = { d: null, p: null };
function tp18Load() { if (TP18.d) return Promise.resolve(TP18.d); if (TP18.p) return TP18.p; TP18.p = loadIndex(DB_RAW + 'treaties/pdf.json.gz').then(function (x) { TP18.d = x; return x; }).catch(function () { TP18.p = null; return { items: {} }; }); return TP18.p; }
function tp18Src(u) { return 'https://docs.google.com/viewer?embedded=true&url=' + encodeURIComponent(u); }
function tp18Html(id, title) {
  var L = (TP18.d && TP18.d.items && TP18.d.items[id]) || [], pdf = L.filter(function (x) { return x.k === 'pdf'; })[0];
  var links = L.map(function (x) {
    return '<li><a href="' + esc(x.u) + '" target="_blank" rel="noopener">' + ic(x.k === 'pdf' ? 'download' : 'external') + ' ' + esc(x.k === 'pdf' ? 'ไฟล์ PDF ต้นฉบับ' : x.k === 'note' ? x.t : x.k === 'file' ? 'ไฟล์ต้นฉบับ' : 'หน้าต้นฉบับทางการ') + '</a> <span class="muted small">· ' + esc(x.s) + (x.t && x.k !== 'note' ? ' · ' + esc(x.t) : '') + '</span></li>';
  }).join('');
  var unSearch = 'https://treaties.un.org/Pages/AdvanceSearch.aspx?tab=UNTS&clang=_en';
  return '<section class="panel tp18" id="tp18"><div class="panel-title"><span class="ic">' + ic('file') + '</span><h2>ไฟล์ PDF ต้นฉบับ</h2></div>' +
    (pdf ? '<div class="tp18-frame" id="tp18Frame"><button class="tp18-zoom" id="tp18Zoom" type="button" aria-label="ขยายเข้า">' + ic('maximize') + '<span>ขยายเข้า</span></button>' +
      '<iframe title="ไฟล์ PDF ต้นฉบับ: ' + esc(title) + '" src="' + esc(tp18Src(pdf.u)) + '" loading="lazy" referrerpolicy="no-referrer"></iframe><div class="tp18-load">กำลังโหลดไฟล์ PDF…</div></div>' :
      '<div class="panel flat"><p class="small">ยังไม่พบไฟล์ PDF ต้นฉบับของฉบับนี้ในแหล่งข้อมูลเปิด (Wikidata / Wikimedia Commons) ระบบไม่สร้างหรือพิมพ์ไฟล์ขึ้นใหม่ ท่านสามารถค้นต้นฉบับได้ที่ <a href="' + unSearch + '" target="_blank" rel="noopener">United Nations Treaty Collection</a></p></div>') +
    (links ? '<ul class="tp18-links">' + links + '</ul>' : '') +
    '<p class="muted small tp18-cr">ลิขสิทธิ์และความถูกต้องของไฟล์ต้นฉบับเป็นของหน่วยงานเจ้าของเอกสารตามลิงก์ข้างต้น เว็บไซต์คลังกฎหมายแสดงไฟล์จากแหล่งต้นทางโดยตรง ไม่ได้แก้ไขหรือพิมพ์ใหม่ · รายการลิงก์จาก Wikidata (CC0)</p></section>';
}
function tp18Mount(ov, id, title) {
  tp18Load().then(function () {
    var body = ov.querySelector('.tr11-body'); if (!body || !ov.isConnected) return;
    var old = body.querySelector('#tp18'); if (old) old.remove();
    body.insertAdjacentHTML('beforeend', tp18Html(id, title));
    var fr = body.querySelector('#tp18Frame'), z = body.querySelector('#tp18Zoom');
    if (fr) { var ifr = fr.querySelector('iframe'); ifr.addEventListener('load', function () { fr.classList.add('ok'); }); setTimeout(function () { fr.classList.add('ok'); }, 8000); }
    if (z) z.onclick = function () {
      var on = !fr.classList.contains('full'); fr.classList.toggle('full', on);
      document.documentElement.classList.toggle('tp18-lock', on);
      z.innerHTML = ic(on ? 'minimize' : 'maximize') + '<span>' + (on ? 'ย่อออก' : 'ขยายเข้า') + '</span>'; z.setAttribute('aria-label', on ? 'ย่อออก' : 'ขยายเข้า');
    };
  });
}
(function () {
  var base = openTreaty;
  openTreaty = function (id, title) {
    var r = base.apply(this, arguments);
    var tries = 0, wait = function () {
      var ov = document.querySelector('.tr11'); var art = ov && ov.querySelector('.tr11-doc');
      if (art) { if (!ov.getAttribute('data-tp18')) { ov.setAttribute('data-tp18', id); tp18Mount(ov, id, title); } return; }
      if (tries++ < 80) setTimeout(wait, 250);
    };
    wait();
    return r;
  };
})();
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var f = document.querySelector('#tp18Frame.full'); if (f) { e.stopPropagation(); document.getElementById('tp18Zoom').click(); } } }, true);

/* ==========================================================================
   v18: จำนวนกฎหมายไทยที่มีผลใช้บังคับ (อ้างอิงคลังสารสนเทศรัฐสภา) แสดงใต้ตาราง “จำนวนกฎหมายในฐานข้อมูล”
   ========================================================================== */
function lf18Mount() {
  var t = document.getElementById('lawCounts'); if (!t || document.getElementById('lawInforce')) return;
  api('lawInforce', {}, { noRetry: true, silent: true, timeout: 15000 }).then(function (r) {
    var o = r && r.inforce; if (!o || !o.n || document.getElementById('lawInforce') || !t.isConnected) return;
    var d = new Date(o.asOf);
    t.insertAdjacentHTML('beforeend', '<div class="lf18" id="lawInforce">' + ic('scale') + '<div><b>กฎหมายไทยที่มีผลใช้บังคับในปัจจุบัน ' + fmtN(o.n) + ' ฉบับ</b> <span class="muted small">(ข้อมูล ณ วันที่ ' + esc(isNaN(d) ? o.asOf : fmtDate(d)) + ')</span><div class="small muted">' + esc(o.note || '') + ' · ที่มา: <a href="' + esc(o.url || '#') + '" target="_blank" rel="noopener">' + esc(o.src || '') + '</a> · ตารางด้านบนนับรวมกฎหมายที่ยกเลิกแล้ว เพื่อให้ศึกษาเหตุผลและประวัติการยกเลิกได้</div></div></div>');
  }).catch(function () {});
}
new MutationObserver(function () { try { if (document.getElementById('lawCounts') && !document.getElementById('lawInforce')) lf18Mount(); } catch (e) {} }).observe(document.documentElement, { childList: true, subtree: true });

/* ==========================================================================
   v18: ผู้ช่วย AI — แสดงภาพประกอบต่อท้ายคำตอบ (จาก Wikimedia Commons พร้อมเครดิตและลิงก์ต้นฉบับ)
   ========================================================================== */
var AI18 = { cache: {}, busy: {} };
try { AI18.cache = JSON.parse(localStorage.getItem('tll.ai18img') || '{}') || {}; } catch (e) {}
var AI18_EN = [[/รัฐธรรมนูญ/, 'Constitution of Thailand'], [/ศาลฎีกา|ฎีกา|คำพิพากษา/, 'Supreme Court of Thailand'], [/ศาลปกครอง/, 'Administrative Court Thailand'], [/ศาลรัฐธรรมนูญ/, 'Constitutional Court of Thailand'],
  [/รัฐสภา|สภาผู้แทน|วุฒิสภา|ส\.ส\.|ส\.ว\./, 'Parliament of Thailand Sappaya Sapasathan'], [/สนธิสัญญา|อนุสัญญา|treaty|convention/i, 'treaty signing ceremony'], [/อาญา|ตำรวจ|จับกุม|criminal|police/i, 'Royal Thai Police'],
  [/ที่ดิน|โฉนด|land/i, 'Thai land title deed'], [/แรงงาน|ลูกจ้าง|labou?r/i, 'workers Thailand'], [/ภาษี|tax/i, 'Revenue Department Thailand'], [/สหประชาชาติ|united nations/i, 'United Nations General Assembly hall'],
  [/ญี่ปุ่น|japan/i, 'Supreme Court of Japan'], [/อเมริกา|สหรัฐ|united states|us law/i, 'Supreme Court of the United States building'], [/กฎหมาย|law|legal/i, 'Supreme Court of Thailand']];
function ai18Query(q) { for (var i = 0; i < AI18_EN.length; i++) if (AI18_EN[i][0].test(q)) return AI18_EN[i][1]; return 'Supreme Court of Thailand'; }
function ai18Find(q) {
  var key = ai18Query(q);
  if (AI18.cache[key]) return Promise.resolve(AI18.cache[key]);
  if (AI18.busy[key]) return AI18.busy[key];
  var url = 'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=6&gsrsearch=' + encodeURIComponent(key + ' filetype:bitmap') + '&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=720&format=json&origin=*';
  AI18.busy[key] = fetch(url).then(function (r) { return r.json(); }).then(function (j) {
    var pages = j && j.query && j.query.pages ? Object.keys(j.query.pages).map(function (k) { return j.query.pages[k]; }) : [];
    pages.sort(function (a, b) { return (a.index || 0) - (b.index || 0); });
    var p = pages.filter(function (x) { return x.imageinfo && x.imageinfo[0] && x.imageinfo[0].thumburl; })[0]; if (!p) return null;
    var ii = p.imageinfo[0], md = ii.extmetadata || {}, strip = function (v) { return String((v && v.value) || '').replace(/<[^>]+>/g, '').trim(); };
    var o = { src: ii.thumburl, page: ii.descriptionurl, title: String(p.title || '').replace(/^File:/, '').replace(/\.[a-z]+$/i, ''), by: strip(md.Artist).slice(0, 80), lic: strip(md.LicenseShortName) };
    AI18.cache[key] = o; try { localStorage.setItem('tll.ai18img', JSON.stringify(AI18.cache)); } catch (e) {} return o;
  }).catch(function () { return null; }).then(function (o) { delete AI18.busy[key]; return o; });
  return AI18.busy[key];
}
function ai18Decorate() {
  var box = document.getElementById('aiLog'); if (!box) return;
  $$('.msg .bub[data-i]', box).forEach(function (b) {
    if (b.querySelector('.ai18') || b.querySelector('.typing')) return;
    var m = b.closest('.msg'), q = '', prev = m && m.previousElementSibling;
    while (prev && !(prev.classList && prev.classList.contains('user'))) prev = prev.previousElementSibling;
    if (prev) q = prev.textContent || '';
    var ans = (b.textContent || '').slice(0, 300);
    var fig = document.createElement('figure'); fig.className = 'ai18'; b.insertBefore(fig, b.querySelector('.row') || null);
    ai18Find(q + ' ' + ans).then(function (o) {
      if (!o || !fig.isConnected) { fig.remove(); return; }
      fig.innerHTML = '<a href="' + esc(o.page) + '" target="_blank" rel="noopener"><img src="' + esc(o.src) + '" alt="' + esc(o.title) + '" loading="lazy"></a><figcaption>ภาพประกอบ: ' + esc(o.title) + (o.by ? ' · ' + esc(o.by) : '') + (o.lic ? ' · ' + esc(o.lic) : '') + ' · Wikimedia Commons</figcaption>';
      var im = fig.querySelector('img'); im.onerror = function () { fig.remove(); };
    });
  });
}
new MutationObserver(function () { try { ai18Decorate(); } catch (e) {} }).observe(document.documentElement, { childList: true, subtree: true });
</script>
