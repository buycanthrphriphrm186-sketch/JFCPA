<script>
/* ==========================================================================
   v12: แก้ไขเฉพาะจุดตามคำสั่ง — ไม่ลบข้อมูลกฎหมายหรือระบบเดิม
   ========================================================================== */

/* ---------- 1) ปุ่มขยายเข้า/ย่อออก: มีปุ่มเดียวที่แถบด้านบน ใช้ได้ทุกหน้า · ขยายแล้วซ่อนปุ่มนำทาง เนื้อหาเต็มจอ ---------- */
setFocusMode = function (on) {
  document.body.classList.toggle('focus11', !!on);
  var b = document.getElementById('btnFocus'); if (b) { b.innerHTML = ic(on ? 'minimize' : 'maximize'); b.setAttribute('aria-label', on ? 'ย่อออก' : 'ขยายเข้า'); b.title = on ? 'ย่อออก (แสดงปุ่มนำทาง)' : 'ขยายเข้า (โฟกัสเฉพาะเนื้อหา เต็มจอ)'; b.classList.toggle('on', !!on); }
  $$('#focusExit,#chFocus').forEach(function (x) { x.remove(); });
  if (!on) { requestAnimationFrame(function () { try { moveIndicator(); } catch (e) {} requestAnimationFrame(function () { try { moveIndicator(); } catch (e) {} }); }); }
};
new MutationObserver(function () { var x = document.getElementById('chFocus'); if (x) x.remove(); var y = document.getElementById('focusExit'); if (y) y.remove(); }).observe(document.documentElement, { childList: true, subtree: true });

/* ---------- 2) กฎหมายรัฐธรรมนูญครบ 21 ฉบับ: ใช้ฐานข้อมูลของเว็บไซต์ (ตัวบทจากวิกิซอร์ซ/กฤษฎีกา) เมื่อชีตยังไม่มีตัวบท ---------- */
var REPO_IX = null;
function repoIndex() { if (REPO_IX) return Promise.resolve(REPO_IX); return loadIndex(DB_RAW + 'index.json.gz').then(function (j) { REPO_IX = {}; (j.laws || []).forEach(function (l) { REPO_IX[l.id] = l; }); return REPO_IX; }); }
function mergeRepoConstitutions() {
  if (!S.catalog || !S.catalog.laws) return Promise.resolve();
  return repoIndex().then(function (ix) {
    var have = {}, changed = false; S.catalog.laws.forEach(function (l) { have[l.id] = l; });
    Object.keys(ix).forEach(function (id) {
      var r = ix[id]; if (r.cat !== 'รัฐธรรมนูญ') return;
      var l = have[id];
      if (!l) { S.catalog.laws.push({ id: r.id, cat: r.cat, title: r.title, short: r.short || '', year: r.year || '', url: r.url, status: r.status, src: r.source, n: r.n, repo: r.shard }); changed = true; }
      else if (!(l.n > 0) || /รอนำเข้า/.test(l.status || '')) { l.n = r.n; l.status = r.status; l.url = l.url || r.url; l.src = l.src || r.source; l.repo = r.shard; changed = true; }
    });
    if (changed) { indexCatalog(); bgRefresh(false); }
  }).catch(function () {});
}
(function () {
  var baseLoad = loadCatalog;
  loadCatalog = function (force) { var p = baseLoad.apply(this, arguments); Promise.resolve(p).then(mergeRepoConstitutions); return p; };
  var baseEnsure = ensureLaw;
  ensureLaw = function (id) {
    var l = LAWS[id];
    var fromRepo = function () {
      return repoIndex().then(function (ix) {
        var r = ix[id]; if (!r) return false;
        return loadIndex(DB_RAW + 's' + ('00' + r.shard).slice(-3) + '.json.gz').then(function (arr) {
          var e = (arr || []).filter(function (x) { return x.id === id; })[0]; if (!e) return false;
          addSections(e.s.map(function (s) { return { id: id + '-' + s[0], law: id, no: String(s[0]), name: s[1] || '', text: s[2] || '' }; }));
          LAW_LOADED[id] = 1; return true;
        });
      }).catch(function () { return false; });
    };
    if (l && l.repo !== undefined) return baseEnsure(id).then(function (ok) { return (SECS_BY_LAW[id] || []).length ? ok : fromRepo(); });
    return baseEnsure(id);
  };
  if (S.catalog) setTimeout(mergeRepoConstitutions, 1500);
})();

/* ---------- 3) แชท: เลื่อนภายนอกเท่านั้น · อ่านแล้ว/ยังไม่อ่าน · แก้ไข · ลบ (กู้คืนไม่ได้) · แนบรูปภาพ/ไฟล์ ---------- */
var CH12 = { files: {} };
function chFmtSize(n) { n = +n || 0; return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n >= 1024 ? Math.round(n / 1024) + ' KB' : n + ' B'; }
function chPageBottom() { window.scrollTo(0, document.documentElement.scrollHeight); }
chatDraw = function (stick) {
  var log = document.getElementById('chLog'); if (!log) return;
  var near = (window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 160, day = '';
  var html = CHAT.msgs.length ? CHAT.msgs.map(function (m, i) {
    var d = fmtDate(m.time), sep = d !== day ? '<div class="ch-day"><span>' + esc(d) + '</span></div>' : ''; day = d;
    var me = m.sender === 'member', key = m.id || m.cid;
    var st = '';
    if (me) {
      if (m.status === 'failed') st = '<button class="ch-st bad" data-retry>' + ic('alert') + ' แตะเพื่อส่งอีกครั้ง</button>';
      else if (m.status === 'pending') st = m.prog !== undefined ? '<span class="ch-st">' + Math.round(m.prog * 100) + '%</span>' : '';
      else st = '<span class="ch-st ' + (m.read ? 'rd' : '') + '">' + ic('check') + (m.read ? ' อ่านแล้ว' : ' ยังไม่อ่าน') + '</span>';
    }
    var at = m.attach ? chAttachHtml(m) : '';
    var body = m.attach ? String(m.text || '').replace(/^\[ไฟล์แนบ\][^\n]*\n?/, '') : m.text;
    var acts = me && m.id && m.status !== 'pending' ? '<span class="ch-acts">' + (m.attach ? '' : '<button class="ch-a" data-edit="' + esc(m.id) + '" aria-label="แก้ไขข้อความ">' + ic('edit') + '</button>') + '<button class="ch-a" data-del="' + esc(m.id) + '" aria-label="ลบข้อความ">' + ic('trash') + '</button></span>' : '';
    return sep + '<div class="ch-msg ' + (me ? 'me' : 'adm') + (m.status === 'pending' ? ' pend' : '') + '" data-k="' + esc(key) + '">' + (me ? '' : '<div class="ch-who">' + ic('shieldCheck') + ' ' + esc(m.adminName || 'ผู้ดูแลระบบ') + '</div>') +
      '<div class="ch-bub">' + at + (String(body || '').trim() ? '<div class="ch-tx">' + esc(body).replace(/\n/g, '<br>') + '</div>' : '') + '</div><div class="ch-meta">' + fmtTime(m.time) + (m.edited ? ' · แก้ไขแล้ว' : '') + ' ' + st + acts + '</div></div>';
  }).join('') : '<div class="empty"><div class="eic">' + ic('chat') + '</div><h3>เริ่มสนทนากับผู้ดูแลระบบ</h3><p>พิมพ์คำถาม ข้อร้องเรียน หรือแจ้งปัญหาการใช้งานได้ที่ช่องด้านล่าง แนบรูปภาพหรือไฟล์ได้ด้วยปุ่ม +</p></div>';
  if (log.getAttribute('data-h') === hashStr(html)) return;
  log.setAttribute('data-h', hashStr(html)); log.innerHTML = html;
  $$('.ch-img[data-f]', log).forEach(chLoadImg);
  if (stick || near) requestAnimationFrame(chPageBottom);
};
function chAttachHtml(m) {
  var a = m.attach, img = /^image\//.test(a.mime || '');
  if (img && (m.local || CH12.files[m.id])) return '<img class="ch-img" alt="' + esc(a.name) + '" src="' + esc(m.local || CH12.files[m.id]) + '">';
  if (img && m.id && (+a.size || 0) <= 8 * 1024 * 1024) return '<img class="ch-img" alt="' + esc(a.name) + '" data-f="' + esc(m.id) + '" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">';
  return '<button class="ch-file" ' + (m.id ? 'data-dl="' + esc(m.id) + '"' : '') + '>' + ic('file') + '<span><b>' + esc(a.name) + '</b><br><small>' + chFmtSize(a.size) + '</small></span>' + (m.id ? ic('download') : '') + '</button>';
}
function chLoadImg(im) {
  var id = im.getAttribute('data-f'); if (CH12.files[id]) { im.src = CH12.files[id]; return; }
  api('chatFile', { id: id }, { noRetry: true, timeout: 60000, silent: true }).then(function (r) { if (r.data) { CH12.files[id] = 'data:' + r.mime + ';base64,' + r.data; im.src = CH12.files[id]; im.removeAttribute('data-f'); } }).catch(function () {});
}
(function () {
  var baseMerge = chatMerge;
  chatMerge = function (list) {
    var ch = false, byId = {};
    (list || []).forEach(function (x) { byId[x.id] = x; });
    CHAT.msgs.forEach(function (m) {
      var x = byId[m.id]; if (!x) return;
      if (!!x.read !== !!m.read) { m.read = !!x.read; ch = true; }
      if (!!x.edited !== !!m.edited || (x.sender === 'member' && x.text !== m.text && m.status !== 'pending')) { m.edited = !!x.edited; m.text = x.text; ch = true; }
      if (x.attach && !m.attach) { m.attach = x.attach; ch = true; }
    });
    if (list && list.length !== undefined) {   // ข้อความของตนที่ถูกลบจากอุปกรณ์อื่น
      var before = CHAT.msgs.length;
      CHAT.msgs = CHAT.msgs.filter(function (m) { return !(m.sender === 'member' && m.id && m.status !== 'pending' && m.status !== 'failed' && !byId[m.id] && list.length); });
      if (CHAT.msgs.length !== before) ch = true;
    }
    return baseMerge(list) || ch;
  };
  var baseView = VIEWS.chat;
  VIEWS.chat = function (el) {
    baseView(el);
    var form = $('#chForm', el);
    if (form && !$('#chPlus', el)) {
      form.insertAdjacentHTML('afterbegin', '<button type="button" class="ch-plus" id="chPlus" aria-label="แนบรูปภาพหรือไฟล์" title="แนบรูปภาพหรือไฟล์">' + ic('plus') + '</button><input type="file" id="chFile" multiple hidden>');
      $('#chPlus', el).onclick = function () { $('#chFile', el).click(); };
      $('#chFile', el).onchange = function () { var fs = Array.prototype.slice.call(this.files || []); this.value = ''; fs.forEach(chUpload); };
    }
    on($('#chLog', el), 'click', '[data-del]', function (e, b) { chDelete(b.getAttribute('data-del')); });
    on($('#chLog', el), 'click', '[data-edit]', function (e, b) { chEdit(b.getAttribute('data-edit')); });
    on($('#chLog', el), 'click', '[data-dl]', function (e, b) { chDownload(b.getAttribute('data-dl')); });
    requestAnimationFrame(chPageBottom);
  };
})();
function chDelete(id) {
  popup11({ icon: 'trash', tone: 'bad', title: 'ลบข้อความนี้หรือไม่', sub: 'ลบแล้วไม่สามารถกู้คืนได้', ok: 'ลบข้อความ', cancel: 'ยกเลิก', html: '<p>ข้อความ (และไฟล์แนบ ถ้ามี) จะถูกลบออกจากหน้าแชทของท่านและแจ้งผู้ดูแลระบบว่าข้อความนี้ถูกลบแล้ว การลบไม่สามารถกู้คืนกลับมาได้</p>' }).then(function (ok) {
    if (!ok) return;
    var keep = CHAT.msgs.slice(); CHAT.msgs = CHAT.msgs.filter(function (m) { return m.id !== id; }); chatSaveLocal(); chatDraw(false);
    api('chatDelete', { id: id }, { timeout: 20000 }).then(function () { toast('ลบข้อความแล้ว', '', 'ok'); }).catch(function (e) { CHAT.msgs = keep; chatSaveLocal(); chatDraw(false); toast('ลบไม่สำเร็จ', (e && e.msg) || '', 'bad'); });
  });
}
function chEdit(id) {
  var m = CHAT.msgs.filter(function (x) { return x.id === id; })[0]; if (!m) return;
  popup11({ icon: 'edit', title: 'แก้ไขข้อความ', sub: 'แก้ไขแล้วส่งใหม่ ผู้ดูแลระบบจะเห็นข้อความฉบับแก้ไข', ok: 'ส่งข้อความที่แก้ไข', cancel: 'ยกเลิก', html: '<textarea id="chEditIn" class="ch-edit" maxlength="5000">' + esc(m.text) + '</textarea>' }).then(function (ok) {
    var t = (document.getElementById('chEditIn') || {}).value; if (!ok) return;
    t = String(CH12.lastEdit || '').trim(); if (!t || t === m.text) return;
    var old = m.text; m.text = t; m.edited = true; chatSaveLocal(); chatDraw(false);
    api('chatEdit', { id: id, text: t }, { timeout: 20000 }).then(function () { toast('แก้ไขข้อความแล้ว', '', 'ok'); api('chatSync', {}, { noRetry: true, silent: true }).catch(function () {}); }).catch(function (e) { m.text = old; chatSaveLocal(); chatDraw(false); toast('แก้ไขไม่สำเร็จ', (e && e.msg) || '', 'bad'); });
  });
  setTimeout(function () { var ta = document.getElementById('chEditIn'); if (!ta) return; CH12.lastEdit = ta.value; var g = function () { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; CH12.lastEdit = ta.value; }; ta.addEventListener('input', g); g(); }, 50);
}
function chDownload(id) {
  api('chatFile', { id: id }, { timeout: 90000 }).then(function (r) {
    if (r.big) { toast('ไฟล์มีขนาดใหญ่', 'ไฟล์ ' + r.name + ' (' + chFmtSize(r.size) + ') ส่งถึงผู้ดูแลระบบเรียบร้อยแล้ว ไฟล์ขนาดเกิน 8 MB ดาวน์โหลดซ้ำจากหน้าแชทไม่ได้', 'warn'); return; }
    var bin = atob(r.data), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u], { type: r.mime })); a.download = r.name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }).catch(function (e) { toast('ดาวน์โหลดไม่สำเร็จ', (e && e.msg) || '', 'bad'); });
}
function chUpload(file) {
  if (!file || !S.token) return;
  var m = { cid: uid() + uid(), time: new Date().toISOString(), sender: 'member', text: '', status: 'pending', prog: 0, attach: { name: file.name, mime: file.type || 'application/octet-stream', size: file.size } };
  if (/^image\//.test(file.type)) { try { m.local = URL.createObjectURL(file); } catch (e) {} }
  CHAT.msgs.push(m); chatDraw(true);
  var readB64 = function (blob) { return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(String(fr.result).split(',')[1] || ''); }; fr.onerror = rej; fr.readAsDataURL(blob); }); };
  var retry = function (fn, n) { return fn().catch(function (e) { if (n <= 0 || (e && /UPLOAD_EXPIRED|GUEST_ONLY|EMPTY/.test(e.code))) throw e; return new Promise(function (r) { setTimeout(r, 800); }).then(function () { return retry(fn, n - 1); }); }); };
  retry(function () { return api('chatUploadStart', { name: file.name, mime: file.type, size: file.size }, { noRetry: true, timeout: 30000 }); }, 4).then(function (s) {
    var CH = s.chunk || 4 * 1024 * 1024, off = 0;
    var step = function () {
      var blob = file.slice(off, Math.min(off + CH, file.size));
      return readB64(blob).then(function (b64) { return retry(function () { return api('chatUploadChunk', { uploadId: s.uploadId, offset: off, data: b64 }, { noRetry: true, timeout: 120000 }); }, 5); }).then(function (r) {
        if (r.done) { m.id = r.id; m.time = r.time; m.status = 'sent'; m.text = r.text; m.attach = r.attach; delete m.prog; if (m.local) CH12.files[r.id] = m.local; chatSaveLocal(); chatDraw(false); api('chatSync', {}, { noRetry: true, silent: true }).catch(function () {}); return; }
        off = r.next; m.prog = off / file.size; chatDraw(false); return step();
      });
    };
    return step();
  }).catch(function (e) { m.status = 'failed'; delete m.prog; chatDraw(false); toast('แนบไฟล์ไม่สำเร็จ', (e && e.msg) || 'กรุณาลองใหม่อีกครั้ง', 'bad'); });
}
/* ข้อความผู้ดูแลในแชท: แสดงตัวเลขในกระดิ่งมุมขวาบนด้วย (อัปเดตตลอด) และปุ่มแชทด้านล่าง */
unreadCount = function () { if (!S.ud) return 0; return S.ud.notices.filter(function (n) { return !S.ud.readNotices[n.id]; }).length; };
(function () {
  var baseApply = rtApply;
  rtApply = function (r) {
    var x = baseApply(r);
    try {
      if (r && r.chat && Array.isArray(r.chat.admin) && S.ud) {
        var have = {}, ch = false; S.ud.notices.forEach(function (n) { have[n.id] = 1; });
        r.chat.admin.forEach(function (a) {
          var nid = 'chat-' + a[0];
          if (have[nid] || have[a[0]] || S.ud.readNotices[nid] || S.ud.readNotices[a[0]]) return;
          if (a[1] <= (store.get('chatSeen', '') || '')) return;
          addNotice({ id: nid, type: 'admin', title: 'ข้อความแชทจากผู้ดูแลระบบ' + (a[3] ? ' (' + a[3] + ')' : ''), body: a[2] || 'มีข้อความใหม่ในหน้าแชท', time: a[1] }, RT.first); ch = true;
        });
        if (S.ui && S.ui.view === 'chat') chMarkNoticesRead();
        if (ch) renderHeaderBits();
      }
    } catch (e) {}
    return x;
  };
  var baseRead = chatMarkRead;
  chatMarkRead = function () { baseRead.apply(this, arguments); chMarkNoticesRead(); };
})();
function chMarkNoticesRead() {
  if (!S.ud) return; var ch = false;
  S.ud.notices.forEach(function (n) { if ((/^chat-/.test(n.id) || /^MSG-/.test(n.id)) && !S.ud.readNotices[n.id]) { S.ud.readNotices[n.id] = 1; ch = true; } });
  if (ch) { saveUD(); renderHeaderBits(); }
}
document.addEventListener('click', function (e) { var n = e.target.closest && e.target.closest('.entry'); if (n && S.ui && S.ui.view === 'notifications' && /แชท/.test(n.textContent) && /ผู้ดูแลระบบ/.test(n.textContent) && e.target.closest('.grow')) nav('chat'); });

/* ---------- 4) อนุสัญญา/สนธิสัญญา: อ่านจากฐานข้อมูลของเว็บไซต์ · พิมพ์เฉพาะประเทศ · จำนวนประเทศตรงกับกฎหมายต่างประเทศ ---------- */
var TRX = {};
/* แผนที่ลิงก์ตัวบท/บทความของแต่ละอนุสัญญา (สร้างจาก Wikidata) แล้วให้เบราว์เซอร์ของผู้ใช้ดึงเนื้อหาโดยตรงจากวิกิซอร์ซ/วิกิพีเดีย */
function treatyLinks(id) {
  var n = (parseInt(String(id).replace(/\D/g, ''), 10) || 0) % 64, k = ('0' + n).slice(-2);
  if (TRX[k]) return Promise.resolve(TRX[k][id] || null);
  return loadIndex(DB_RAW + 'treaties/links/' + k + '.json.gz').then(function (j) { TRX[k] = j || {}; return TRX[k][id] || null; }).catch(function () { return null; });
}
function wmFetch(host, params) { return fetch('https://' + host + '/w/api.php?format=json&formatversion=2&origin=*&' + params).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }); }
function cleanWsHtml(htmlStr) {
  var d = new DOMParser().parseFromString('<div>' + htmlStr + '</div>', 'text/html');
  $$('script,style,sup.reference,.mw-editsection,.navbox,.metadata,.infobox,.ws-noexport,.licenseContainer,.noprint,table.toccolours', d).forEach(function (x) { x.remove(); });
  $$('br', d).forEach(function (b) { b.replaceWith('\n'); });
  var out = [];
  $$('h1,h2,h3,h4,h5,p,li,dd,dt,div.poem,pre,td', d.body).forEach(function (n) { if (n.querySelector('p,li,h2,h3,h4,td')) return; var t = n.textContent.replace(/[ \t\u00a0]+/g, ' ').trim(); if (t) t.split(/\n+/).forEach(function (x) { x = x.trim(); if (x) out.push(x); }); });
  return out;
}
function treatyRec(id) {
  return treatyLinks(id).then(function (L) {
    if (!L) return null;
    var tryWs = function (i) { var w = (L.ws || [])[i]; if (!w) return Promise.resolve(null); return wmFetch(w[0] + '.wikisource.org', 'action=parse&prop=text&redirects=1&page=' + encodeURIComponent(w[1])).then(function (j) { var p = cleanWsHtml(((j.parse || {}).text) || ''); return p.join('').length > 300 ? { k: 'text', src: w[0] + '.wikisource.org — ' + w[1], p: p } : tryWs(i + 1); }).catch(function () { return tryWs(i + 1); }); };
    var tryWp = function (i) { var w = (L.wp || [])[i]; if (!w) return Promise.resolve(null); return wmFetch(w[0] + '.wikipedia.org', 'action=query&prop=extracts&explaintext=1&redirects=1&titles=' + encodeURIComponent(w[1])).then(function (j) { var pg = ((j.query || {}).pages || [])[0] || {}, ex = String(pg.extract || ''); var p = ex.split(/\n+/).map(function (x) { return x.replace(/^=+\s*|\s*=+$/g, '').trim(); }).filter(function (x) { return x && !/^(See also|References|External links|Notes|Further reading|อ้างอิง|แหล่งข้อมูลอื่น|ดูเพิ่ม)$/.test(x); }); return p.join('').length > 150 ? { k: 'summary', src: w[0] + '.wikipedia.org — ' + w[1], p: p } : tryWp(i + 1); }).catch(function () { return tryWp(i + 1); }); };
    return tryWs(0).then(function (r) { return r || tryWp(0); }).then(function (r) { return r || { k: 'meta', src: 'Wikidata ' + id, p: L.d ? [L.d] : [] }; });
  });
}
(function () {
  var baseOpen = openTreaty;
  openTreaty = function (id, title) {
    var item = document.querySelector('.tw-item[data-twid="' + id + '"]'), meta = item ? (item.querySelector('.li-s') || {}).textContent || '' : '';
    withLoading('กำลังโหลดเนื้อหาอนุสัญญา', treatyRec(id).catch(function () { return null; })).then(function (rec) {
      if (!rec) return baseOpen(id, title);
      $$('.tr11').forEach(function (x) { x.remove(); });
      var ov = h('<div class="tr11" role="dialog" aria-modal="true"><div class="tr11-in"><div class="tr11-bar"><button class="icon-btn" data-x aria-label="กลับ">' + ic('arrowL') + '</button><b class="grow">' + esc(title) + '</b><button class="icon-btn" data-x aria-label="ปิด">' + ic('x') + '</button></div><div class="tr11-body"></div></div></div>');
      document.body.appendChild(ov); syncScrollLock();
      $$('[data-x]', ov).forEach(function (b) { b.onclick = function () { ov.remove(); syncScrollLock(); }; });
      var paras = (rec.p || []).slice(); if (rec.k === 'meta' && meta) paras.push(meta.replace(/ที่มา: Wikidata/, '').replace(/อ่านภายในเว็บไซต์/, '').trim()); if (!paras.length) paras = ['ยังไม่มีคำอธิบายเพิ่มเติมในแหล่งข้อมูลเปิด'];
      var kind = rec.k === 'text' ? 'ตัวบท (อ่านอย่างเดียว)' : rec.k === 'summary' ? 'สาระสำคัญจากสารานุกรม (แหล่งข้อมูลเปิดยังไม่มีตัวบทฉบับเต็ม)' : 'ข้อมูลพื้นฐานของเอกสาร';
      var body = $('.tr11-body', ov);
      body.innerHTML = '<article class="panel tr11-doc"><div class="tr11-h"><span class="st-badge">' + ic('book') + ' อ่านอย่างเดียว</span><h2>' + esc(title) + '</h2>' + (meta ? '<div class="small muted">' + esc(meta.replace(/ที่มา: Wikidata/, '')) + '</div>' : '') + '<div class="small muted">' + esc(kind) + ' · ที่มา: ' + esc(rec.src || 'Wikidata') + '</div></div>' +
        '<div class="tr-bar tr11-tr">' + ic('globe', 'tr-ic') + '<select id="t11Lang" aria-label="เลือกภาษา">' + TR11_LANGS.map(function (l) { return '<option value="' + l[0] + '">' + esc(l[1]) + '</option>'; }).join('') + '</select><button class="btn sm k" id="t11Go">แปลภาษา</button><button class="btn sm" id="t11Off" disabled>ยกเลิกแปลภาษา</button><span class="spacer"></span><button class="btn sm" id="t11Print">' + ic('printer') + ' พิมพ์ PDF</button></div>' +
        '<div class="tr11-text">' + paras.map(function (p, i) { return '<p data-i="' + i + '">' + esc(p) + '</p>'; }).join('') + '</div></article>';
      var tr = { lang: '', map: {} };
      $('#t11Go', body).onclick = function () {
        var lang = $('#t11Lang', body).value, ps = $$('.tr11-text p[data-i]', body), b = this, lab = (TR11_LANGS.filter(function (l) { return l[0] === lang; })[0] || [])[1];
        b.disabled = true; b.textContent = 'กำลังแปล…'; $$('.trx', body).forEach(function (x) { x.remove(); }); tr.map = {};
        var chunks = []; for (var i = 0; i < ps.length; i += 40) chunks.push(ps.slice(i, i + 40));
        chunks.reduce(function (pr, ch) { return pr.then(function () { return api('translate', { to: lang, texts: ch.map(function (p) { return p.textContent; }) }, { timeout: 90000 }).then(function (x) { ch.forEach(function (p, k) { var t = x.texts[k]; if (t) { tr.map[p.getAttribute('data-i')] = t; p.insertAdjacentHTML('afterend', '<div class="trx"><div class="trx-h">' + ic('globe') + ' คำแปล (' + esc(lab) + ')</div>' + esc(t) + '</div>'); } }); }); }); }, Promise.resolve())
          .then(function () { tr.lang = lab; $('#t11Off', body).disabled = false; }).catch(function () { toast('แปลไม่สำเร็จบางส่วน', 'กรุณากดแปลภาษาอีกครั้ง', 'warn'); }).then(function () { b.disabled = false; b.textContent = 'แปลภาษา'; });
      };
      $('#t11Off', body).onclick = function () { $$('.trx', body).forEach(function (x) { x.remove(); }); tr.map = {}; this.disabled = true; };
      $('#t11Print', body).onclick = function () {
        var go = function (w) { PRINT_SRC = (rec.src || 'Wikidata') + ' (ผ่านฐานข้อมูลเว็บไซต์ “คลังกฎหมาย”)'; printDoc(title, kind, paras.map(function (p, i) { return '<p>' + esc(p) + '</p>' + (w && tr.map[i] ? '<div class="tr9"><b>คำแปล (' + esc(tr.lang) + '):</b> ' + esc(tr.map[i]) + '</div>' : ''); }).join('')); };
        if (Object.keys(tr.map).length) popup11({ icon: 'printer', title: 'รวมคำแปลในไฟล์ PDF หรือไม่', html: '<p>เลือก “ตกลง” เพื่อพิมพ์พร้อมคำแปล หรือ “ยกเลิก” เพื่อพิมพ์เฉพาะต้นฉบับ</p>', ok: 'ตกลง (รวมคำแปล)', cancel: 'ยกเลิก (ไม่รวมคำแปล)' }).then(go); else go(false);
      };
    });
  };
  /* ปุ่มพิมพ์ PDF เฉพาะประเทศที่เลือก + ข้อความจำนวนประเทศให้ตรงกับหมวดกฎหมายต่างประเทศ */
  new MutationObserver(function () {
    if (!S.ui || S.ui.view !== 'treaties') return;
    var sub = document.getElementById('twSub');
    if (sub && /· 197 ประเทศ$/.test(sub.textContent)) sub.textContent = sub.textContent.replace(/· 197 ประเทศ$/, '· ต่างประเทศ 196 ประเทศ + ประเทศไทย');
    var meta = document.getElementById('twMeta'), st = S.ui.tw9 || {};
    if (meta && st.cc && !document.getElementById('twPrint')) {
      var b = h('<button class="btn sm" id="twPrint">' + ic('printer') + ' พิมพ์ PDF อนุสัญญาของประเทศนี้</button>');
      meta.parentNode.insertBefore(b, meta.nextSibling);
      b.onclick = function () {
        var cc = st.cc, name = (document.querySelector('#twBox9 h3, #twBox9 .grow b') || {}).textContent || cc;
        withLoading('กำลังเตรียมเอกสาร', api('treatiesOf9', { cc: cc }, { timeout: 60000 })).then(function (r) {
          var TT = { t: 'สนธิสัญญา', c: 'อนุสัญญา', o: 'อื่น ๆ ที่เกี่ยวข้อง' }, items = r.items || [];
          var rows = items.map(function (x, i) { return '<tr><td>' + (i + 1) + '</td><td>' + esc(x.th || x.en) + (x.th && x.en ? '<br>' + esc(x.en) : '') + '</td><td>' + esc(TT[x.type] || '') + '</td><td>' + esc(x.date ? String(x.date).slice(0, 10) : '-') + '</td><td>' + (x.ended ? 'สิ้นผล/ยกเลิกแล้ว' : 'มีผลบังคับใช้') + '</td></tr>'; }).join('');
          PRINT_SRC = 'Wikidata (CC0) — ฐานข้อมูลอนุสัญญาของเว็บไซต์ “คลังกฎหมาย”';
          printDoc('อนุสัญญาและสนธิสัญญาของ' + name, fmtN(items.length) + ' ฉบับที่ประเทศนี้เป็นภาคีหรือลงนาม', '<table class="dt"><thead><tr><th>ลำดับ</th><th>ชื่อ</th><th>ประเภท</th><th>วันที่</th><th>สถานะ</th></tr></thead><tbody>' + rows + '</tbody></table>');
        }).catch(function (e) { toast('พิมพ์ไม่สำเร็จ', (e && e.msg) || '', 'bad'); });
      };
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();

/* ---------- 5) พิมพ์ PDF: ไม่ตัดข้อความขอบขวา · ย่อหน้าตามหลักภาษาไทย (2.5 ซม.) · ระยะบรรทัดพอดี · หัว/ท้ายกระดาษ 12 pt ---------- */
(function () {
  var basePrint = printHtml;
  var css = '<style id="pdf12">html,body{width:auto !important;max-width:100% !important;overflow:visible !important}' +
    'table.pg{table-layout:fixed !important;width:100% !important;max-width:100% !important}table.pg>tbody>tr>td,table.pg>thead>tr>td,table.pg>tfoot>tr>td{width:100% !important;max-width:100% !important;overflow:visible}' +
    '*{max-width:100%;box-sizing:border-box;overflow-wrap:anywhere;word-wrap:break-word;word-break:normal}' +
    'body{line-height:1.6 !important}p,.pre,div{line-height:1.6}' +
    'p{margin:0 0 6pt !important;text-indent:2.5cm;text-align:left}' +
    '@supports (text-justify:inter-character){p{text-align:justify;text-justify:inter-character}}' +
    '.hd p,.rh *,.rf *,.fin h2,table.dt td p,table.dt th p,p.item,p.noind,.tr9{text-indent:0 !important}' +
    'p.item{padding-left:2.5cm !important;text-indent:0 !important}p.item.sub{padding-left:3.5cm !important}' +
    '.rh{display:flex !important;flex-wrap:wrap !important;justify-content:space-between;gap:2pt 12pt}.rh span{white-space:normal}' +
    '.rh,.rh *,.rf,.rf *{font-size:12pt !important;line-height:1.35 !important;text-indent:0 !important}' +
    'table.dt{table-layout:fixed;width:100%}table.dt td,table.dt th{overflow-wrap:anywhere;font-size:14pt}' +
    '@page{@bottom-center{font-size:12pt}}</style>';
  printHtml = function (html) {
    html = String(html || '');
    try {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      /* ข้อความแบบหลายบรรทัด (.pre) แยกเป็นย่อหน้า เพื่อย่อหน้าบรรทัดแรกและตัดคำได้ถูกต้อง */
      Array.prototype.slice.call(doc.querySelectorAll('.pre')).forEach(function (pre) {
        var lines = String(pre.textContent || '').split(/\n+/).map(function (s) { return s.trim(); }).filter(String);
        var wrap = doc.createElement('div'); wrap.className = 'pre12';
        lines.forEach(function (ln) { var p = doc.createElement('p'); if (/^\(?\s*([0-9๐-๙]{1,3}|[ก-ฮ])\s*\)/.test(ln)) p.className = 'item'; p.textContent = ln; wrap.appendChild(p); });
        pre.parentNode.replaceChild(wrap, pre);
      });
      if (!doc.getElementById('pdf12')) doc.head.insertAdjacentHTML('beforeend', css);
      html = '<!doctype html>' + doc.documentElement.outerHTML;
    } catch (e) { if (html.indexOf('id="pdf12"') < 0) html = html.replace('</head>', css + '</head>'); }
    return basePrint(html);
  };
})();

/* ---------- 6) ดูดวง: ข้อคิดส่งท้ายเป็นหลักธรรมทางพระพุทธศาสนา ไม่ซ้ำกันในแต่ละครั้งที่กด “ดูดวงของฉัน” ---------- */
var DHAMMA = [
  ['อตฺตา หิ อตฺตโน นาโถ', 'ตนแลเป็นที่พึ่งแห่งตน', 'ธรรมบท คาถาที่ 160', 'พระพุทธองค์ทรงสอนว่าไม่มีผู้ใดจะเป็นที่พึ่งให้เราได้ดีไปกว่าตัวเราเอง การฝึกตนให้มีความรู้ ความสามารถ และความประพฤติดี คือการสร้างที่พึ่งที่มั่นคงที่สุด ไม่ว่าดวงชะตาจะว่าอย่างไร ความตั้งใจและความเพียรของท่านคือสิ่งที่กำหนดทางเดินของชีวิตอย่างแท้จริง'],
  ['วิริเยน ทุกฺขมจฺเจติ', 'คนจะล่วงทุกข์ได้เพราะความเพียร', 'สุตตนิบาต อาฬวกสูตร', 'ความเพียรเป็นเครื่องพาให้ข้ามพ้นอุปสรรค การเรียน การสอบ และการทำงานด้านกฎหมายต้องอาศัยความเพียรอย่างสม่ำเสมอ วันใดที่รู้สึกเหนื่อย ขอให้ระลึกว่าความพยายามทุกวันกำลังสะสมเป็นความสำเร็จ'],
  ['อปฺปมาโท อมตํ ปทํ', 'ความไม่ประมาทเป็นทางแห่งความไม่ตาย', 'ธรรมบท คาถาที่ 21', 'ความไม่ประมาทคือการมีสติรู้ตัวอยู่เสมอ ตรวจทานงานให้รอบคอบ ดูแลสุขภาพ และไม่ปล่อยโอกาสดีให้ผ่านไป พระพุทธเจ้าทรงฝากพระปัจฉิมวาจาว่า “จงยังความไม่ประมาทให้ถึงพร้อมเถิด”'],
  ['ขนฺตี ปรมํ ตโป ตีติกฺขา', 'ความอดทนคือความอดกลั้น เป็นตบะอย่างยิ่ง', 'ธรรมบท คาถาที่ 184 (โอวาทปาติโมกข์)', 'ความอดทนช่วยให้เราไม่ตัดสินใจด้วยอารมณ์ อดทนต่อความยากลำบาก อดทนต่อคำพูดที่ไม่ถูกใจ และอดทนรอผลของการกระทำที่ดี ผู้ที่อดทนได้ย่อมรักษาทั้งงานและความสัมพันธ์ไว้ได้'],
  ['สพฺพปาปสฺส อกรณํ กุสลสฺสูปสมฺปทา สจิตฺตปริโยทปนํ', 'การไม่ทำบาปทั้งปวง การทำกุศลให้ถึงพร้อม การทำจิตของตนให้ผ่องใส', 'ธรรมบท คาถาที่ 183 (หัวใจพระพุทธศาสนา)', 'หลักสามประการนี้ใช้ได้ทุกวัน คือเลือกไม่ทำสิ่งที่เบียดเบียนผู้อื่น เลือกทำสิ่งดีเท่าที่ทำได้ และหมั่นดูแลจิตใจให้แจ่มใส เมื่อจิตผ่องใส การคิดและการตัดสินใจย่อมดีตามไปด้วย'],
  ['จิตฺตํ ทนฺตํ สุขาวหํ', 'จิตที่ฝึกดีแล้วนำสุขมาให้', 'ธรรมบท คาถาที่ 35', 'การฝึกจิตด้วยสติและสมาธิแม้วันละไม่กี่นาที ช่วยให้มีสมาธิในการอ่านหนังสือและการทำงาน ลดความวิตกกังวล และทำให้เห็นทางออกของปัญหาได้ชัดเจนขึ้น'],
  ['ปญฺญา โลกสฺมิ ปชฺโชโต', 'ปัญญาเป็นแสงสว่างในโลก', 'สังยุตตนิกาย สคาถวรรค', 'ปัญญาเกิดจากการฟัง การคิดพิจารณา และการลงมือปฏิบัติ การศึกษากฎหมายอย่างเข้าใจเหตุผลเบื้องหลังตัวบท คือการจุดแสงสว่างให้ทั้งตนเองและผู้อื่นที่ต้องการความช่วยเหลือ'],
  ['โกธํ ฆตฺวา สุขํ เสติ', 'ฆ่าความโกรธได้ ย่อมอยู่เป็นสุข', 'สังยุตตนิกาย สคาถวรรค', 'ความโกรธทำให้มองไม่เห็นเหตุผลและอาจทำให้เสียสิ่งที่สร้างมานาน เมื่อรู้ตัวว่าโกรธ ให้หยุดหายใจลึก ๆ แล้วค่อยพูดหรือทำ ความสุขที่แท้จริงเริ่มจากใจที่สงบ'],
  ['สนฺตุฏฺฐี ปรมํ ธนํ', 'ความสันโดษเป็นทรัพย์อย่างยิ่ง', 'ธรรมบท คาถาที่ 204', 'สันโดษไม่ได้หมายถึงการหยุดพัฒนา แต่หมายถึงการพอใจในสิ่งที่ได้มาโดยชอบ ยินดีตามกำลังและตามความเหมาะสม ใจที่รู้จักพอจะมีความสุขและมีกำลังทำสิ่งใหม่ต่อไป'],
  ['อาโรคฺยปรมา ลาภา', 'ความไม่มีโรคเป็นลาภอย่างยิ่ง', 'ธรรมบท คาถาที่ 204', 'สุขภาพคือรากฐานของทุกความสำเร็จ แม้งานจะมากเพียงใด ขอให้แบ่งเวลาพักผ่อน ออกกำลังกาย และดูแลอาหารการกิน เพื่อให้มีกำลังกายกำลังใจทำสิ่งที่ตั้งใจได้ยาวนาน'],
  ['นตฺถิ สนฺติปรํ สุขํ', 'สุขอื่นยิ่งกว่าความสงบไม่มี', 'ธรรมบท คาถาที่ 202', 'ท่ามกลางความเร่งรีบของชีวิต ความสงบใจเป็นความสุขที่หาได้ทุกขณะ เพียงหยุดพักสักครู่ อยู่กับลมหายใจ แล้วกลับมาทำหน้าที่ด้วยใจที่มั่นคง'],
  ['สติ โลกสฺมิ ชาครติ', 'สติเป็นเครื่องตื่นอยู่ในโลก', 'สังยุตตนิกาย สคาถวรรค', 'สติช่วยให้รู้เท่าทันความคิดและอารมณ์ ไม่ถูกพาไปด้วยความกลัวหรือความโลภ ผู้มีสติย่อมไม่หลงเชื่อสิ่งใดง่าย ๆ และใช้ชีวิตอย่างรอบคอบ'],
  ['อิทธิบาท ๔', 'ฉันทะ วิริยะ จิตตะ วิมังสา — คุณธรรมที่นำไปสู่ความสำเร็จ', 'ทีฆนิกาย มหาปรินิพพานสูตร และพระสูตรอื่น', 'ความสำเร็จเกิดจากความพอใจรักในสิ่งที่ทำ (ฉันทะ) ความเพียรพยายาม (วิริยะ) ความเอาใจใส่จดจ่อ (จิตตะ) และการใช้ปัญญาไตร่ตรองปรับปรุง (วิมังสา) ขอให้ท่านนำหลักนี้ไปใช้กับการเรียนและการงานทุกวัน'],
  ['ทิฏฐธัมมิกัตถประโยชน์ ๔ (หัวใจเศรษฐี “อุ อา กะ สะ”)', 'ขยันหา รักษาดี คบคนดี ใช้จ่ายพอดี', 'อังคุตตรนิกาย อัฏฐกนิบาต (ทีฆชาณุสูตร)', 'ประโยชน์ในปัจจุบันเกิดจากความขยันหมั่นเพียรในการทำงาน (อุฏฐานสัมปทา) การรักษาทรัพย์และผลงานที่หามาได้ (อารักขสัมปทา) การคบมิตรที่ดี (กัลยาณมิตตตา) และการใช้จ่ายอย่างสมดุลกับรายได้ (สมชีวิตา)'],
  ['พรหมวิหาร ๔', 'เมตตา กรุณา มุทิตา อุเบกขา', 'ทีฆนิกาย และอังคุตตรนิกาย', 'การมีเมตตาปรารถนาดี กรุณาช่วยเหลือ มุทิตายินดีเมื่อผู้อื่นได้ดี และอุเบกขาวางใจเป็นกลางอย่างยุติธรรม เป็นคุณธรรมของผู้ที่ต้องทำงานกับผู้คน โดยเฉพาะผู้ที่ทำหน้าที่ด้านกฎหมายและความยุติธรรม'],
  ['กาลามสูตร', 'อย่าเชื่อเพียงเพราะฟังตามกันมา เพราะเป็นตำรา หรือเพราะผู้พูดเป็นครู', 'อังคุตตรนิกาย ติกนิบาต', 'พระพุทธองค์ทรงสอนให้พิจารณาด้วยปัญญาว่าสิ่งใดเป็นกุศล ไม่มีโทษ และเป็นไปเพื่อประโยชน์สุข จึงค่อยยอมรับและปฏิบัติ คำทำนายในหน้านี้ก็ควรพิจารณาด้วยหลักเดียวกัน ใช้เป็นกำลังใจ แต่ตัดสินใจด้วยเหตุผล'],
  ['ยํ เว เสวติ ตาทิโส', 'คบคนเช่นใด ย่อมเป็นคนเช่นนั้น', 'ขุททกนิกาย ชาดก', 'มิตรและสภาพแวดล้อมมีผลต่อความคิดและการกระทำ การเลือกคบกัลยาณมิตรที่ชวนกันทำความดีและพัฒนาตนเอง เป็นมงคลอย่างหนึ่งของชีวิต ดังที่มงคลสูตรกล่าวว่า “การไม่คบคนพาล การคบบัณฑิต” เป็นมงคลอันสูงสุด'],
  ['มาตาปิตุ อุปฏฺฐานํ เอตมฺมงฺคลมุตฺตมํ', 'การบำรุงมารดาบิดาเป็นมงคลอันสูงสุด', 'ขุททกนิกาย มงคลสูตร', 'ความกตัญญูกตเวทีต่อบุพการีและผู้มีพระคุณ เป็นพื้นฐานของคนดีและความเจริญในชีวิต การหาเวลาดูแลและแสดงความรักต่อครอบครัว คือการสร้างกำลังใจที่ยิ่งใหญ่ที่สุดให้แก่ตนเอง']
];
function horoClosing(name) {
  var last = -1; try { last = +(sessionStorage.getItem('tll.dh') || -1); } catch (e) {}
  var i; do { i = Math.floor(Math.random() * DHAMMA.length); } while (DHAMMA.length > 1 && i === last);
  try { sessionStorage.setItem('tll.dh', String(i)); } catch (e) {}
  var j = (i + 1 + Math.floor(Math.random() * (DHAMMA.length - 1))) % DHAMMA.length, d = DHAMMA[i], e2 = DHAMMA[j], nm = esc(name);
  return '<div class="dh12"><p class="dh-pali">“' + esc(d[0]) + '”</p><p class="dh-th">' + esc(d[1]) + ' <span class="muted small">(' + esc(d[2]) + ')</span></p></div>' +
    '<p>คุณ' + nm + ' ' + esc(d[3]) + '</p>' +
    '<p>อีกหลักธรรมหนึ่งที่ขอฝากไว้คือ “' + esc(e2[0]) + '” — ' + esc(e2[1]) + ' (' + esc(e2[2]) + ') ' + esc(e2[3]) + '</p>' +
    '<p>ไม่ว่าดวงชะตาจะกล่าวไว้อย่างไร สิ่งที่กำหนดอนาคตของคุณ' + nm + ' อย่างแท้จริงคือกรรม ซึ่งหมายถึงการกระทำด้วยเจตนาของท่านเอง ทั้งทางกาย วาจา และใจ ขอให้ใช้คำทำนายนี้เป็นกำลังใจและเครื่องเตือนสติ แล้วลงมือทำสิ่งที่ดีที่สุดในทุกวัน ขอเป็นกำลังใจให้คุณ' + nm + ' ประสบความสำเร็จในการเรียน การงาน และชีวิตครอบครัว</p>';
}
/* ภาพประกอบ: ใช้หมวดภาพพระพุทธรูปในประเทศไทยบน Wikimedia Commons (ทุกภาพเป็นสัญญาอนุญาตแบบเปิด) แล้วค้นหาเป็นทางเลือกสำรอง */
(function () {
  var baseImg = horoImage;
  horoImage = function (di, box) {
    if (!box) return;
    if (HORO_IMG[di] && HORO_IMG[di].length) return baseImg(di, box);
    var url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=categorymembers&gcmtype=file&gcmlimit=40&gcmtitle=' + encodeURIComponent('Category:Buddha statues in Thailand') + '&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=480';
    box.innerHTML = '<p class="tiny muted">กำลังโหลดภาพที่อนุญาตให้นำมาใช้…</p>';
    fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      var pages = j && j.query && j.query.pages ? Object.keys(j.query.pages).map(function (k) { return j.query.pages[k]; }) : [];
      var imgs = pages.map(function (p) { var ii = (p.imageinfo || [])[0] || {}, md = ii.extmetadata || {}, lic = (md.LicenseShortName || {}).value || ''; if (!/CC|Public domain|PD/i.test(lic) || /NC|ND/i.test(lic) || !/\.(jpe?g|png|webp)$/i.test(p.title || '')) return null; return { url: ii.thumburl || ii.url, title: String(p.title || '').replace(/^File:/, '').replace(/\.[a-z]+$/i, ''), artist: String((md.Artist || {}).value || '').replace(/<[^>]+>/g, '').trim().slice(0, 80), lic: lic }; }).filter(Boolean);
      if (!imgs.length) return baseImg(di, box);
      var start = (di * 3) % Math.max(1, imgs.length); HORO_IMG[di] = imgs.slice(start, start + 3).concat(imgs.slice(0, Math.max(0, start + 3 - imgs.length))).slice(0, 3);
      baseImg(di, box);
    }).catch(function () { baseImg(di, box); });
  };
})();
</script>
