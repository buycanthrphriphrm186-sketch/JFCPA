<script>
/* ==========================================================================
   v18: เสียงอ่านกฎหมาย (ElevenLabs) — เฉพาะ “ประมวลกฎหมาย” และ “รัฐธรรมนูญ” ทุกฉบับ
   - ปุ่ม “เสียง” ข้างปุ่ม “บันทึก” ของทุกมาตรา (ฟังเฉพาะมาตรานั้น) และปุ่ม “ฟังทั้งฉบับ”
   - เลือกได้ 2 เสียง: ผู้ชาย / ผู้หญิง (โทนเดิมทุกครั้ง) · ความเร็วการอ่านปกติแบบมนุษย์
   - อ่าน “ชื่อกฎหมาย มาตรา …” แล้วอ่านตามวรรค/อนุมาตรา (อนุมาตรา ๑ ก. …) เว้นช่วงระหว่างมาตรา
   - เล่นต่อเนื่องไม่สะดุด: เตรียมเสียงมาตราถัดไปล่วงหน้าระหว่างที่กำลังฟัง
   - เมนูสามขีด › เสียงกฎหมาย › เสียงประมวลกฎหมาย / เสียงรัฐธรรมนูญ · โฟลเดอร์สำหรับเก็บมาตราไว้ฟัง (ไม่จำกัดจำนวน)
   ========================================================================== */
var V18 = { voice: null, audio: null, queue: [], idx: -1, chunk: 0, playing: false, cache: {}, order: [], loading: {}, gapT: null, title: '', bar: null, on: null };
try { V18.voice = localStorage.getItem('tll.v18.voice'); } catch (e) {}
ICONS.speaker = ICONS.speaker || '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>';
ICONS.play = ICONS.play || '<path d="M7 4.5v15l12.5-7.5z"/>';
ICONS.pause = ICONS.pause || '<rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/>';
ICONS.stop = ICONS.stop || '<rect x="5.5" y="5.5" width="13" height="13" rx="2"/>';
ICONS.skipF = ICONS.skipF || '<path d="M5 5v14l10-7z"/><path d="M19 5v14"/>';
ICONS.skipB = ICONS.skipB || '<path d="M19 5v14L9 12z"/><path d="M5 5v14"/>';
ICONS.folder = ICONS.folder || '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>';
var V18_CATS = { 'ประมวลกฎหมาย': 1, 'รัฐธรรมนูญ': 1 };
function v18Ok(lawId) { var l = LAWS[lawId]; return !!(l && V18_CATS[l.cat]); }
var V18_ORD = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า', 'สิบ', 'สิบเอ็ด', 'สิบสอง', 'สิบสาม', 'สิบสี่', 'สิบห้า', 'สิบหก', 'สิบเจ็ด', 'สิบแปด', 'สิบเก้า', 'ยี่สิบ'];
function v18Dig(s) { return String(s || '').replace(/[๐-๙]/g, function (d) { return String('๐๑๒๓๔๕๖๗๘๙'.indexOf(d)); }); }
/* ข้อความสำหรับอ่าน: ชื่อกฎหมาย มาตรา … / วรรค… / อนุมาตรา ๑ ก. … (ตามโครงสร้างจริงของแต่ละมาตรา) */
function v18Text(s, withLaw) {
  var l = LAWS[s.law] || {};
  var raw = String(s.text || '').replace(/(\S)[ \t\u00a0]+\(\s*([0-9๐-๙]{1,3}|[ก-ฮ])\s*\)[ \t\u00a0]+/g, function (m, prev, k) { return /[0-9๐-๙]/.test(prev) ? m : prev + '\n(' + k + ') '; });
  var lines = raw.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
  var nPara = lines.filter(function (x) { return !/^\(\s*([0-9๐-๙]{1,3}|[ก-ฮ])\s*\)/.test(x); }).length;
  var out = [(withLaw ? (l.title || '') + ' ' : '') + 'มาตรา ' + v18Dig(s.no) + '.'], p = 0, cur = null;
  lines.forEach(function (ln) {
    var m1 = ln.match(/^\(\s*([0-9๐-๙]{1,3})\s*\)\s*(.*)$/), m2 = ln.match(/^\(\s*([ก-ฮ])\s*\)\s*(.*)$/);
    if (m1) { cur = v18Dig(m1[1]); out.push('อนุมาตรา ' + cur + '. ' + v18Dig(m1[2])); }
    else if (m2) { out.push('อนุมาตรา ' + (cur ? cur + ' ' : '') + m2[1] + '. ' + v18Dig(m2[2])); }
    else { p++; cur = null; out.push((nPara > 1 ? 'วรรค' + (V18_ORD[p] || p) + '. ' : '') + v18Dig(ln)); }
  });
  return out.join('\n');
}
function v18Chunks(t) {
  if (t.length <= 4500) return [t];
  var out = [], cur = '';
  t.replace(/([\n ])/g, '$1\u0000').split('\u0000').forEach(function (w) { if ((cur + w).length > 4400) { out.push(cur); cur = ''; } cur += w; });
  if (cur.trim()) out.push(cur); return out;
}
function v18Url(r) {
  var bin = atob(r.b64), n = bin.length, u = new Uint8Array(n); for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
  var type = u[0] === 0x52 && u[1] === 0x49 && u[2] === 0x46 && u[3] === 0x46 ? 'audio/wav' : (r.mime || 'audio/mpeg');
  return URL.createObjectURL(new Blob([u], { type: type }));
}
function v18Fetch(id) {
  var key = V18.voice + '|' + id;
  if (V18.cache[key]) return Promise.resolve(V18.cache[key]);
  if (V18.loading[key]) return V18.loading[key];
  var s = SECS[id]; if (!s) return Promise.reject({ msg: 'ไม่พบมาตรา' });
  var parts = v18Chunks(v18Text(s, true)), urls = [];
  var p = parts.reduce(function (acc, t) { return acc.then(function () { return api('tts', { text: t, voice: V18.voice }, { timeout: 90000, noRetry: true }).then(function (r) { urls.push(v18Url(r)); }); }); }, Promise.resolve())
    .then(function () { delete V18.loading[key]; V18.cache[key] = urls; V18.order.push(key); while (V18.order.length > 40) { var old = V18.order.shift(); (V18.cache[old] || []).forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} }); delete V18.cache[old]; } return urls; },
      function (e) { delete V18.loading[key]; throw e; });
  V18.loading[key] = p; return p;
}
function v18Prefetch() { for (var k = 1; k <= 2; k++) { var id = V18.queue[V18.idx + k]; if (id) v18Fetch(id).catch(function () {}); } }
function v18Bar() {
  if (V18.bar && V18.bar.isConnected) return V18.bar;
  V18.bar = h('<div class="v18-bar" role="region" aria-label="เครื่องเล่นเสียงอ่านกฎหมาย"><div class="v18-t"><b id="v18T"></b><span id="v18S" class="small muted"></span></div>' +
    '<div class="v18-c"><button class="icon-btn" data-v18c="prev" aria-label="มาตราก่อนหน้า">' + ic('skipB') + '</button><button class="icon-btn v18-pp" data-v18c="pp" aria-label="หยุดชั่วคราว">' + ic('pause') + '</button><button class="icon-btn" data-v18c="next" aria-label="มาตราถัดไป">' + ic('skipF') + '</button>' +
    '<div class="seg v18-g"><button data-v18g="m">ชาย</button><button data-v18g="f">หญิง</button></div><button class="icon-btn" data-v18c="stop" aria-label="ปิดเสียง">' + ic('x') + '</button></div></div>');
  document.body.appendChild(V18.bar);
  V18.bar.addEventListener('click', function (e) {
    var b = e.target.closest('[data-v18c],[data-v18g]'); if (!b) return;
    var c = b.getAttribute('data-v18c'), g = b.getAttribute('data-v18g');
    if (g) { if (g !== V18.voice) { V18.voice = g; try { localStorage.setItem('tll.v18.voice', g); } catch (x) {} v18PlayAt(V18.idx); } return; }
    if (c === 'pp') { if (V18.playing) { V18.audio.pause(); V18.playing = false; } else { V18.playing = true; V18.audio.src ? V18.audio.play().catch(function () {}) : v18PlayAt(V18.idx); } v18Paint(); }
    else if (c === 'next') { if (V18.idx < V18.queue.length - 1) v18PlayAt(V18.idx + 1); }
    else if (c === 'prev') { v18PlayAt(Math.max(0, V18.idx - 1)); }
    else if (c === 'stop') v18Stop();
  });
  return V18.bar;
}
function v18Paint(status) {
  var b = v18Bar(), s = SECS[V18.queue[V18.idx]] || {}, l = LAWS[s.law] || {};
  $('#v18T', b).textContent = lawShort(l) + (s.no ? ' · มาตรา ' + s.no : '');
  $('#v18S', b).textContent = status || (V18.queue.length > 1 ? 'มาตราที่ ' + (V18.idx + 1) + ' จาก ' + V18.queue.length + ' · ' : '') + (V18.voice === 'f' ? 'เสียงผู้หญิง' : 'เสียงผู้ชาย');
  $('.v18-pp', b).innerHTML = ic(V18.playing ? 'pause' : 'play'); $('.v18-pp', b).setAttribute('aria-label', V18.playing ? 'หยุดชั่วคราว' : 'เล่นต่อ');
  $$('[data-v18g]', b).forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-v18g') === V18.voice); });
  $$('.v18b').forEach(function (x) { x.classList.toggle('on', V18.playing && x.getAttribute('data-v18') === V18.queue[V18.idx]); });
  document.body.classList.add('v18-on');
}
function v18Audio() {
  if (V18.audio) return V18.audio;
  var a = V18.audio = new Audio(); a.preload = 'auto';
  a.addEventListener('ended', function () {
    var urls = V18.cache[V18.voice + '|' + V18.queue[V18.idx]] || [];
    if (V18.chunk < urls.length - 1) { V18.chunk++; a.src = urls[V18.chunk]; a.play().catch(function () {}); return; }
    if (V18.idx < V18.queue.length - 1) { clearTimeout(V18.gapT); V18.gapT = setTimeout(function () { if (V18.playing) v18PlayAt(V18.idx + 1); }, 900); }
    else { V18.playing = false; v18Paint('ฟังจบแล้ว'); }
  });
  a.addEventListener('error', function () { if (V18.playing) v18Paint('เล่นเสียงไม่สำเร็จ กดเล่นอีกครั้ง'); });
  return a;
}
function v18PlayAt(i) {
  clearTimeout(V18.gapT);
  var a = v18Audio(), id = V18.queue[i]; if (!id) return;
  V18.idx = i; V18.chunk = 0; V18.playing = true; v18Paint('กำลังเตรียมเสียง…');
  var tok = V18.on = {};
  v18Fetch(id).then(function (urls) {
    if (V18.on !== tok || !V18.playing) return;
    a.src = urls[0]; var pr = a.play(); if (pr && pr.catch) pr.catch(function () { V18.playing = false; v18Paint('แตะปุ่มเล่นเพื่อฟัง'); });
    v18Paint(); v18Prefetch();
  }).catch(function (e) {
    if (V18.on !== tok) return; V18.playing = false; v18Paint((e && e.msg) || 'ยังเล่นเสียงไม่ได้');
    toast('ยังเล่นเสียงไม่ได้', (e && e.msg) || 'กรุณาลองอีกครั้ง', 'warn');
  });
}
function v18Stop() { V18.playing = false; V18.on = null; clearTimeout(V18.gapT); if (V18.audio) { V18.audio.pause(); V18.audio.removeAttribute('src'); } if (V18.bar) V18.bar.remove(); V18.bar = null; document.body.classList.remove('v18-on'); $$('.v18b.on').forEach(function (x) { x.classList.remove('on'); }); }
/* เลือกเสียงครั้งแรก (ผู้ชาย / ผู้หญิง) */
function v18Pick() {
  if (V18.voice === 'm' || V18.voice === 'f') return Promise.resolve(V18.voice);
  return popup11({ cls: 'v18p', icon: 'speaker', title: 'เลือกเสียงอ่านกฎหมาย', sub: 'เปลี่ยนได้ทุกเมื่อจากแถบเครื่องเล่นด้านล่าง', ok: 'เริ่มฟัง', cancel: 'ยกเลิก',
    html: '<div class="v18-pick"><label><input type="radio" name="v18g" value="m" checked> <b>เสียงผู้ชาย</b><span class="small muted">น้ำเสียงสุภาพ ชัดเจน อ่านด้วยจังหวะปกติ</span></label><label><input type="radio" name="v18g" value="f"> <b>เสียงผู้หญิง</b><span class="small muted">น้ำเสียงนุ่มนวล ชัดเจน อ่านด้วยจังหวะปกติ</span></label></div>' })
    .then(function (ok) { if (!ok) return null; var r = document.querySelector('.v18p input[name=v18g]:checked'); V18.voice = r ? r.value : 'm'; try { localStorage.setItem('tll.v18.voice', V18.voice); } catch (e) {} return V18.voice; });
}
function v18Play(ids, start) {
  ids = (ids || []).filter(function (id) { var s = SECS[id]; return s && v18Ok(s.law); });
  if (!ids.length) return toast('ไม่มีมาตราสำหรับฟัง', 'เสียงอ่านมีเฉพาะประมวลกฎหมายและรัฐธรรมนูญ', 'warn');
  var go = function () { V18.queue = ids; v18PlayAt(Math.max(0, ids.indexOf(start))); };
  if (V18.voice === 'm' || V18.voice === 'f') { var a = v18Audio(); try { a.play().catch(function () {}); } catch (e) {} return go(); }
  v18Pick().then(function (v) { if (v) go(); });
}
function v18LawIds(lawId) { return (SECS_BY_LAW[lawId] || []).slice().sort(secCmp).map(function (s) { return s.id; }); }
/* ปุ่ม “เสียง” ข้างปุ่ม “บันทึก” ของทุกมาตรา + ปุ่ม “ฟังทั้งฉบับ” */
function v18Inject() {
  $$('.flip .bar [data-act="fav"]').forEach(function (fav) {
    var bar = fav.parentNode; if (bar.querySelector('.v18b')) return;
    var f = fav.closest('.flip'), id = f && f.getAttribute('data-id'), s = SECS[id]; if (!s || !v18Ok(s.law)) return;
    fav.insertAdjacentHTML('afterend', '<button class="cbtn v18b' + (V18.playing && V18.queue[V18.idx] === id ? ' on' : '') + '" data-v18="' + esc(id) + '" aria-label="ฟังเสียงมาตรา ' + esc(s.no) + '">' + ic('speaker') + '<span>เสียง</span></button>');
  });
  var lp = document.getElementById('lawPrint'), law = S.ui && S.ui.content && S.ui.content.law;
  if (lp && law && v18Ok(law) && !document.getElementById('v18All')) lp.insertAdjacentHTML('afterend', '<button class="btn sm" id="v18All">' + ic('speaker') + ' ฟังทั้งฉบับ</button>');
}
document.addEventListener('click', function (e) {
  var b = e.target.closest('.v18b,#v18All'); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  if (b.id === 'v18All') { var law = S.ui.content.law; ensureLaw(law).then(function () { var ids = v18LawIds(law); v18Play(ids, ids[0]); }); return; }
  var id = b.getAttribute('data-v18');
  if (V18.playing && V18.queue[V18.idx] === id) { V18.audio.pause(); V18.playing = false; v18Paint(); return; }
  v18Play([id], id);
}, true);
new MutationObserver(function () { try { v18Inject(); } catch (e) {} }).observe(document.documentElement, { childList: true, subtree: true });

/* ---------- โฟลเดอร์สำหรับเก็บมาตราไว้ฟัง (ไม่จำกัดจำนวน · ซิงก์ทุกอุปกรณ์ผ่านข้อมูลผู้ใช้) ---------- */
function v18Folders() {
  var f = S.ud && Array.isArray(S.ud.voiceFolders) ? S.ud.voiceFolders : null;
  if (!f) { try { f = JSON.parse(localStorage.getItem('tll.v18.folders') || '[]'); } catch (e) { f = []; } if (S.ud) S.ud.voiceFolders = f; }
  return f;
}
function v18SaveFolders() { try { localStorage.setItem('tll.v18.folders', JSON.stringify(v18Folders())); } catch (e) {} try { saveUD(); } catch (e) {} }
function v18NameBox(title, val) {
  return popup11({ cls: 'v18n', icon: 'folder', title: title, sub: 'ตั้งชื่อเพื่อแยกเก็บมาตราตามวิชาหรือหัวข้อที่ต้องการท่อง', ok: 'ยืนยัน', cancel: 'ยกเลิก',
    html: '<div class="field"><label for="v18Name">ชื่อโฟลเดอร์</label><div class="input"><input id="v18Name" maxlength="80" placeholder="เช่น กฎหมายอาญา ภาค 2 ความผิดเกี่ยวกับทรัพย์" value="' + esc(val || '') + '"></div></div>' })
    .then(function (ok) { var i = document.getElementById('v18Name'), v = i ? i.value.trim() : ''; return ok ? v : null; });
}
function v18NewFolder() {
  return v18NameBox('สร้างโฟลเดอร์ใหม่', '').then(function (name) {
    if (name === null) return null; if (!name) { toast('กรุณากรอกชื่อโฟลเดอร์', '', 'warn'); return null; }
    var f = { id: 'VF' + Date.now().toString(36), name: name, items: [], at: new Date().toISOString() }; v18Folders().push(f); v18SaveFolders(); toast('สร้างโฟลเดอร์แล้ว', name, 'ok'); return f;
  });
}
function v18AddTo(id) {
  var fs = v18Folders(), s = SECS[id] || {};
  var html = '<div class="v18-fl">' + (fs.length ? fs.map(function (f) { return '<label class="v18-fi"><input type="radio" name="v18f" value="' + esc(f.id) + '"> ' + esc(f.name) + ' <span class="muted small">(' + f.items.length + ' มาตรา)</span></label>'; }).join('') : '<p class="small muted">ยังไม่มีโฟลเดอร์ กด “ยืนยัน” เพื่อสร้างโฟลเดอร์ใหม่</p>') + '</div>';
  popup11({ cls: 'v18a', icon: 'folder', title: 'เพิ่มลงโฟลเดอร์', sub: lawShort(LAWS[s.law]) + ' มาตรา ' + s.no, ok: 'ยืนยัน', cancel: 'ยกเลิก', html: html }).then(function (ok) {
    if (!ok) return; var r = document.querySelector('.v18a input[name=v18f]:checked');
    var fp = r ? Promise.resolve(fs.filter(function (f) { return f.id === r.value; })[0]) : v18NewFolder();
    fp.then(function (f) { if (!f) return; if (f.items.indexOf(id) < 0) f.items.push(id); v18SaveFolders(); toast('เพิ่มลงโฟลเดอร์แล้ว', f.name, 'ok'); if (S.ui.view === 'voice') refreshCurrent(); });
  });
}

/* ---------- เมนูสามขีด › เสียงกฎหมาย ---------- */
(function () {
  var baseMenu = openMainMenu;
  openMainMenu = function () {
    var r = baseMenu.apply(this, arguments);
    var list = document.querySelector('.drawer .menu-list');
    if (list && !list.querySelector('[data-v="voice"]')) {
      var after = list.querySelector('[data-v="chat"]') || list.firstChild;
      var html = '<button class="menu-item" data-v="voice"><span class="mi">' + ic('speaker') + '</span><span class="grow"><span class="mt">เสียงกฎหมาย</span><br><span class="ms">ฟังประมวลกฎหมายและรัฐธรรมนูญ เสียงผู้ชาย/ผู้หญิง · โฟลเดอร์สำหรับท่องจำ</span></span>' + ic('chevR', 'chev') + '</button>';
      if (after && after.insertAdjacentHTML) after.insertAdjacentHTML(after.getAttribute && after.getAttribute('data-v') === 'chat' ? 'afterend' : 'beforebegin', html); else list.insertAdjacentHTML('afterbegin', html);
    }
    return r;
  };
})();
I18N.th.voice = 'เสียงกฎหมาย';
VIEWS.voice = function (el) {
  var st = S.ui.voice = S.ui.voice || { lvl: 'root' }, q = st.q || '';
  var head = function (t, sub, back) { return '<div class="view-head"><div>' + (back ? '<button class="btn sm ghost v18-back" data-v18n="' + back + '">' + ic('arrowL') + ' ย้อนกลับ</button>' : '') + '<h1>' + esc(t) + '</h1>' + (sub ? '<p class="sub">' + esc(sub) + '</p>' : '') + '</div></div>'; };
  var tile = function (k, icn, t, d) { return '<button class="v18-tile" data-v18n="' + k + '"><span class="mi">' + ic(icn) + '</span><span class="grow"><b>' + esc(t) + '</b><br><span class="small muted">' + esc(d) + '</span></span>' + ic('chevR') + '</button>'; };
  var lawsOf = function (cat) { return Object.keys(LAWS).map(function (k) { return LAWS[k]; }).filter(function (l) { return l.cat === cat; }).sort(function (a, b) { return String(a.title).localeCompare(String(b.title), 'th'); }); };
  var html = '';
  if (st.lvl === 'root') html = head('เสียงกฎหมาย', 'ฟังตัวบทประมวลกฎหมายและรัฐธรรมนูญทุกฉบับ ด้วยเสียงผู้ชายหรือเสียงผู้หญิง') + '<div class="v18-tiles">' + tile('codesHome', 'book', 'เสียงประมวลกฎหมาย', 'ประมวลกฎหมายทุกฉบับ และโฟลเดอร์สำหรับเก็บมาตราไว้ฟัง') + tile('consts', 'scale', 'เสียงรัฐธรรมนูญ', 'รัฐธรรมนูญแห่งราชอาณาจักรไทยทุกฉบับ') + '</div>';
  else if (st.lvl === 'codesHome') html = head('เสียงประมวลกฎหมาย', 'เลือกประมวลกฎหมายที่ต้องการฟัง หรือเปิดโฟลเดอร์ที่เก็บไว้', 'root') + '<div class="v18-tiles">' + tile('codes', 'speaker', 'เสียงประมวลกฎหมาย', 'ฟังทีละมาตราหรือทั้งฉบับ') + tile('folders', 'folder', 'โฟลเดอร์', 'โฟลเดอร์สำหรับเก็บไว้ฟังเสียงมาตรา') + '</div>';
  else if (st.lvl === 'codes' || st.lvl === 'consts') {
    var ls = lawsOf(st.lvl === 'codes' ? 'ประมวลกฎหมาย' : 'รัฐธรรมนูญ').filter(function (l) { return !q || norm(l.title).indexOf(norm(q)) > -1; });
    html = head(st.lvl === 'codes' ? 'เสียงประมวลกฎหมาย' : 'เสียงรัฐธรรมนูญ', fmtN(ls.length) + ' ฉบับ', st.lvl === 'codes' ? 'codesHome' : 'root') +
      '<div class="row v18-q"><div class="input grow">' + ic('search') + '<input id="v18Q" placeholder="ค้นหาชื่อฉบับ" value="' + esc(q) + '"></div><button class="btn" id="v18QC">' + ic('x') + ' ล้าง</button></div>' +
      '<div class="col">' + ls.map(function (l) { return '<button class="law-item" data-v18law="' + esc(l.id) + '"><span class="li-ic">' + ic('speaker') + '</span><span class="grow"><span class="li-t">' + esc(l.title) + '</span><br><span class="li-s">' + fmtN(l.n || 0) + ' มาตรา</span></span>' + ic('chevR') + '</button>'; }).join('') + '</div>';
  } else if (st.lvl === 'law') {
    var l = LAWS[st.law] || {}, secs = (SECS_BY_LAW[st.law] || []).slice().sort(secCmp).filter(function (s) { return !q || v18Dig(s.no) === v18Dig(q.replace(/^มาตรา\s*/, '')) || norm(s.text || '').indexOf(norm(q)) > -1; });
    html = head(l.title || '', 'ฟังเฉพาะมาตรา หรือฟังต่อเนื่องทั้งฉบับ · กด + เพื่อเก็บลงโฟลเดอร์', l.cat === 'รัฐธรรมนูญ' ? 'consts' : 'codes') +
      '<div class="row v18-q"><div class="input grow">' + ic('search') + '<input id="v18Q" placeholder="เลขมาตราหรือคำในตัวบท" value="' + esc(q) + '"></div><button class="btn" id="v18QC">' + ic('x') + ' ล้าง</button><button class="btn k" id="v18PlayAll">' + ic('play') + ' ฟังทั้งหมด</button></div>' +
      (LAW_LOADED[st.law] ? '<div class="col v18-secs">' + secs.slice(0, st.lim || 80).map(function (s) { return '<div class="v18-sec"><button class="icon-btn v18-ps v18b" data-v18="' + esc(s.id) + '" aria-label="ฟังมาตรา ' + esc(s.no) + '">' + ic('play') + '</button><div class="grow"><b>มาตรา ' + esc(s.no) + '</b><div class="small muted v18-pv">' + esc(String(s.text || '').slice(0, 140)) + '…</div></div><button class="icon-btn" data-v18add="' + esc(s.id) + '" aria-label="เพิ่มลงโฟลเดอร์">' + ic('plus') + '</button></div>'; }).join('') + '</div>' +
        (secs.length > (st.lim || 80) ? '<button class="btn block" id="v18More">แสดงเพิ่มเติม (' + fmtN(secs.length - (st.lim || 80)) + ')</button>' : '') : '<div class="skel" style="height:200px"></div>');
    if (!LAW_LOADED[st.law]) ensureLaw(st.law).then(function () { if (S.ui.view === 'voice') refreshCurrent(); });
  } else if (st.lvl === 'folders') {
    var fs = v18Folders();
    html = head('โฟลเดอร์', 'โฟลเดอร์สำหรับเก็บไว้ฟังเสียงมาตรา (ไม่จำกัดจำนวน)', 'codesHome') + '<div class="row v18-q"><button class="btn k" id="v18NewF">' + ic('plus') + ' สร้างโฟลเดอร์</button>' + (fs.length ? '<button class="btn" id="v18ClearAll">' + ic('x') + ' ล้าง</button>' : '') + '</div>' +
      (fs.length ? '<div class="col">' + fs.map(function (f) { return '<div class="v18-sec"><span class="li-ic">' + ic('folder') + '</span><button class="grow v18-fo" data-v18fo="' + esc(f.id) + '"><b>' + esc(f.name) + '</b><div class="small muted">' + f.items.length + ' มาตรา</div></button><button class="icon-btn" data-v18fp="' + esc(f.id) + '" aria-label="ฟังทั้งโฟลเดอร์">' + ic('play') + '</button><button class="icon-btn" data-v18fd="' + esc(f.id) + '" aria-label="ลบโฟลเดอร์">' + ic('trash') + '</button></div>'; }).join('') + '</div>' : '<div class="panel flat"><p class="small muted">ยังไม่มีโฟลเดอร์ กด “สร้างโฟลเดอร์” แล้วเพิ่มมาตราจากหน้าฟังเสียงด้วยปุ่ม +</p></div>');
  } else if (st.lvl === 'folder') {
    var f = v18Folders().filter(function (x) { return x.id === st.folder; })[0];
    if (!f) { st.lvl = 'folders'; return VIEWS.voice(el); }
    var miss = f.items.filter(function (id) { return !SECS[id]; }); if (miss.length && typeof ensureIds === 'function') ensureIds(miss, function () { if (S.ui.view === 'voice') refreshCurrent(); });
    html = head(f.name, f.items.length + ' มาตรา', 'folders') + '<div class="row v18-q"><button class="btn k" id="v18FPlay">' + ic('play') + ' ฟังทั้งโฟลเดอร์</button><button class="btn" id="v18FRen">' + ic('edit') + ' เปลี่ยนชื่อ</button><button class="btn" id="v18FClear">' + ic('x') + ' ล้าง</button></div>' +
      '<div class="col">' + f.items.map(function (id) { var s = SECS[id] || {}; return '<div class="v18-sec"><button class="icon-btn v18-ps v18b" data-v18="' + esc(id) + '">' + ic('play') + '</button><div class="grow"><b>' + esc(lawShort(LAWS[s.law]) + ' มาตรา ' + (s.no || '…')) + '</b><div class="small muted v18-pv">' + esc(String(s.text || 'กำลังโหลดตัวบท…').slice(0, 120)) + '</div></div><button class="icon-btn" data-v18rm="' + esc(id) + '" aria-label="นำออกจากโฟลเดอร์">' + ic('x') + '</button></div>'; }).join('') + '</div>';
  }
  el.innerHTML = '<div class="v18v">' + html + '</div>';
  var go = function (lvl, extra) { S.ui.voice = Object.assign({ lvl: lvl, q: '' }, extra || {}); store.set('ui', S.ui); refreshCurrent(); window.scrollTo({ top: 0, behavior: 'instant' }); };
  el.onclick = function (e) {
    var t = e.target.closest('[data-v18n],[data-v18law],[data-v18add],[data-v18fo],[data-v18fp],[data-v18fd],[data-v18rm],#v18QC,#v18PlayAll,#v18More,#v18NewF,#v18ClearAll,#v18FPlay,#v18FRen,#v18FClear'); if (!t) return;
    var fsx = v18Folders(), cf = fsx.filter(function (x) { return x.id === st.folder; })[0];
    if (t.hasAttribute('data-v18n')) go(t.getAttribute('data-v18n'));
    else if (t.hasAttribute('data-v18law')) go('law', { law: t.getAttribute('data-v18law') });
    else if (t.hasAttribute('data-v18add')) v18AddTo(t.getAttribute('data-v18add'));
    else if (t.hasAttribute('data-v18fo')) go('folder', { folder: t.getAttribute('data-v18fo') });
    else if (t.hasAttribute('data-v18fp')) { var f1 = fsx.filter(function (x) { return x.id === t.getAttribute('data-v18fp'); })[0]; if (f1) ensureIdsThen(f1.items, function () { v18Play(f1.items, f1.items[0]); }); }
    else if (t.hasAttribute('data-v18fd')) { var fid = t.getAttribute('data-v18fd'); confirmBox('ลบโฟลเดอร์', 'ต้องการลบโฟลเดอร์นี้หรือไม่ (มาตราในตัวบทไม่ได้ถูกลบ)', { danger: true, ok: 'ลบ' }).then(function (ok) { if (!ok) return; S.ud.voiceFolders = fsx.filter(function (x) { return x.id !== fid; }); v18SaveFolders(); refreshCurrent(); }); }
    else if (t.hasAttribute('data-v18rm') && cf) { cf.items = cf.items.filter(function (x) { return x !== t.getAttribute('data-v18rm'); }); v18SaveFolders(); refreshCurrent(); }
    else if (t.id === 'v18QC') { st.q = ''; store.set('ui', S.ui); refreshCurrent(); }
    else if (t.id === 'v18PlayAll') { var ids = v18LawIds(st.law); v18Play(ids, ids[0]); }
    else if (t.id === 'v18More') { st.lim = (st.lim || 80) + 120; refreshCurrent(); }
    else if (t.id === 'v18NewF') v18NewFolder().then(function (f) { if (f) refreshCurrent(); });
    else if (t.id === 'v18ClearAll') confirmBox('ล้างโฟลเดอร์ทั้งหมด', 'ต้องการลบโฟลเดอร์ทั้งหมดหรือไม่', { danger: true, ok: 'ล้าง' }).then(function (ok) { if (!ok) return; S.ud.voiceFolders = []; v18SaveFolders(); refreshCurrent(); });
    else if (t.id === 'v18FPlay' && cf) ensureIdsThen(cf.items, function () { v18Play(cf.items, cf.items[0]); });
    else if (t.id === 'v18FRen' && cf) v18NameBox('เปลี่ยนชื่อโฟลเดอร์', cf.name).then(function (n) { if (n) { cf.name = n; v18SaveFolders(); refreshCurrent(); } });
    else if (t.id === 'v18FClear' && cf) confirmBox('ล้างโฟลเดอร์', 'นำมาตราทั้งหมดออกจากโฟลเดอร์ “' + cf.name + '” หรือไม่', { danger: true, ok: 'ล้าง' }).then(function (ok) { if (!ok) return; cf.items = []; v18SaveFolders(); refreshCurrent(); });
  };
  var qi = el.querySelector('#v18Q');
  if (qi) qi.addEventListener('input', debounce(function () { st.q = qi.value.trim(); store.set('ui', S.ui); var pos = qi.selectionStart; refreshCurrent(); var n = document.getElementById('v18Q'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) {} } }, 350));
};
function ensureIdsThen(ids, cb) { var miss = ids.filter(function (id) { return !SECS[id]; }); if (!miss.length || typeof ensureIds !== 'function') return cb(); if (ensureIds(miss, cb) === false) cb(); }
</script>
