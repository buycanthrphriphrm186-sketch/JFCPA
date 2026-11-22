<script>
/* ==========================================================================
   v15: แก้ไขเฉพาะจุดตามคำสั่ง — ไม่ลบข้อมูลหรือระบบเดิม
   ========================================================================== */

/* ---------- 1) แชท: กดเปิดแล้วแสดงข้อความล่าสุดทันที ไม่เลื่อนไหลผ่านข้อความเก่า (ไม่มีหน้าจอขาว) ---------- */
var CH15 = { limit: 30 };
(function () {
  var baseDraw = chatDraw;
  chatDraw = function (stick) {
    var all = CHAT.msgs;
    if (all.length > CH15.limit) CHAT.msgs = all.slice(-CH15.limit);
    try { baseDraw(stick); } finally { CHAT.msgs = all; }
    var log = document.getElementById('chLog'); if (!log) return;
    var btn = document.getElementById('chOlder');
    var more = all.length - CH15.limit;
    if (more > 0 && !btn) { btn = document.createElement('button'); btn.id = 'chOlder'; btn.className = 'ch-older'; log.parentNode.insertBefore(btn, log); btn.onclick = function () { var h = document.documentElement.scrollHeight, y = window.scrollY; CH15.limit += 30; chatDraw(false); window.scrollTo(0, y + (document.documentElement.scrollHeight - h)); }; }
    if (btn) { if (more > 0) btn.textContent = 'แสดงข้อความก่อนหน้า (' + more + ')'; else btn.remove(); }
  };
  var baseNav = nav;
  nav = function (view) { document.documentElement.classList.toggle('no-smooth', view === 'chat'); return baseNav.apply(this, arguments); };
  /* ขณะเปิดหน้าแชท: ไม่มีการเลื่อนแบบนุ่มนวลค้างอยู่ (สาเหตุที่ถูกดึงกลับขึ้นบนสุด/ไหลผ่านข้อความเก่า) */
  var sTo = window.scrollTo;
  window.scrollTo = function (a, b) {
    if (a && typeof a === 'object' && document.documentElement.classList.contains('no-smooth')) a = Object.assign({}, a, { behavior: 'instant' });
    return arguments.length < 2 ? sTo.call(window, a) : sTo.call(window, a, b);
  };
  var baseView = VIEWS.chat;
  VIEWS.chat = function (el) {
    var root = document.documentElement; root.classList.add('no-smooth'); CH15.limit = 30;
    el.style.visibility = 'hidden';
    baseView(el);
    var tries = 0;
    var show = function () {
      /* รอให้ป๊อปอัปกติกาปิดและปลดล็อกการเลื่อนหน้าก่อน จึงไปที่ข้อความล่าสุดครั้งเดียวทันที (ไม่ไหลผ่านข้อความเก่า) */
      if ((root.classList.contains('scroll-lock') || document.querySelector('#layer .modal-wrap')) && tries++ < 60) { setTimeout(show, 50); return; }
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }); el.style.visibility = '';
      setTimeout(function () { if (el.isConnected) window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }); }, 120);
      /* กันการถูกเลื่อนกลับขึ้นด้านบน (จากการปลดล็อกป๊อปอัป/ระบบเดิม) ช่วงสั้น ๆ หลังเปิด หากผู้ใช้ยังไม่ได้เลื่อนเอง */
      var user = false, until = Date.now() + 2000;
      var mark = function () { user = true; };
      ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (t) { window.addEventListener(t, mark, { once: true, passive: true, capture: true }); });
      var guard = function () {
        if (user || Date.now() > until || !el.isConnected) { window.removeEventListener('scroll', guard); return; }
        var max = document.documentElement.scrollHeight - window.innerHeight;
        if (window.scrollY < max - 40 && !root.classList.contains('scroll-lock')) window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
      };
      window.addEventListener('scroll', guard, { passive: true });
      [200, 400, 700, 1000, 1500].forEach(function (ms) { setTimeout(guard, ms); });
    };
    requestAnimationFrame(function () { requestAnimationFrame(show); });
  };
})();

/* ---------- 2) ปุ่มขยาย/ย่อ อยู่ในแต่ละหน้ารายการ (ไม่อยู่ที่แถบด้านบน) · ขยายแล้วซ่อนแถบด้านบนและปุ่มนำทาง เนื้อหาเต็มจอทุกอุปกรณ์ ---------- */
setFocusMode = function (on) {
  document.body.classList.toggle('focus11', !!on); document.body.classList.toggle('f15', !!on);
  $$('.vf-btn').forEach(function (b) { b.classList.toggle('on', !!on); b.innerHTML = ic(on ? 'minimize' : 'maximize') + '<span>' + (on ? 'ย่อออก' : 'ขยายเข้า') + '</span>'; b.setAttribute('aria-label', on ? 'ย่อออก แสดงแถบด้านบนและปุ่มนำทาง' : 'ขยายเข้า โฟกัสเฉพาะเนื้อหาเต็มจอ'); });
  $$('#focusExit,#chFocus').forEach(function (x) { x.remove(); });
  var fb = document.getElementById('btnFocus'); if (fb) fb.remove();
  if (on) window.scrollTo({ top: 0, behavior: 'instant' });
  else requestAnimationFrame(function () { try { moveIndicator(); } catch (e) {} requestAnimationFrame(function () { try { moveIndicator(); } catch (e) {} }); });
  window.dispatchEvent(new Event('resize'));
};
function vfMount() {
  var v = document.getElementById('view'); if (!v || !S.token) return;
  var root = v.firstElementChild; if (!root || root.querySelector('.vf-btn')) return;
  var on = document.body.classList.contains('focus11');
  var b = h('<button class="vf-btn' + (on ? ' on' : '') + '" type="button">' + ic(on ? 'minimize' : 'maximize') + '<span>' + (on ? 'ย่อออก' : 'ขยายเข้า') + '</span></button>');
  b.onclick = function () { setFocusMode(!document.body.classList.contains('focus11')); };
  var head = root.querySelector('.view-head') || root.querySelector('.ch-head') || root.querySelector('.r-head');
  if (head) { var x = head.querySelector('#rtClose,#chRules,#hrClear'); if (x) head.insertBefore(b, x); else head.appendChild(b); }
  else { var bar = document.createElement('div'); bar.className = 'vf-bar'; bar.appendChild(b); root.insertBefore(bar, root.firstChild); }
}
(function () {
  var base = renderView;
  renderView = function () { var r = base.apply(this, arguments); try { vfMount(); } catch (e) {} return r; };
  var baseApp = renderApp;
  renderApp = function () { var r = baseApp.apply(this, arguments); var fb = document.getElementById('btnFocus'); if (fb) fb.remove(); return r; };
  new MutationObserver(function () { var fb = document.getElementById('btnFocus'); if (fb) fb.remove(); var v = document.getElementById('view'); if (v && v.firstElementChild && !v.firstElementChild.querySelector('.vf-btn')) { try { vfMount(); } catch (e) {} } }).observe(document.documentElement, { childList: true, subtree: true });
})();

/* ---------- 3) พิมพ์ PDF: TH Sarabun New ทุกภาษา · เนื้อหา 16 pt · หัวข้อสำคัญไม่เกิน 18 pt · หัว/ท้ายกระดาษ 12 pt
             ชิดซ้าย–ขวา · ย่อหน้า 2.5 ซม. · เว้นระยะระหว่างย่อหน้า · ไม่ตัดข้อความขอบขวา ---------- */
printHtml = function (html) {
  html = String(html || '');
  return pdfFonts14().then(function (F) {
    var ff = F.n && F.b ? '@font-face{font-family:"TH Sarabun New";src:url(' + F.n + ') format("woff");font-weight:normal}@font-face{font-family:"TH Sarabun New";src:url(' + F.b + ') format("woff");font-weight:bold}' : '';
    var css = ff +
      '*{font-family:"TH Sarabun New","TH SarabunPSK","TH Sarabun PSK",sans-serif !important;letter-spacing:0 !important;box-sizing:border-box}' +
      'body,p,li,td,th,div,span,.pre,.sec,b,strong,.tr9{font-size:16pt !important}' +
      'h2,h3,h4{font-size:17pt !important;line-height:1.35 !important;margin:12pt 0 4pt !important;page-break-after:avoid}.hd .t1{font-size:18pt !important}.hd .n1,.hd div{font-size:16pt !important}' +
      '.rh,.rh *,.rf,.rf *{font-size:12pt !important;line-height:1.35 !important;text-indent:0 !important;text-align:left}.rh{display:flex;flex-wrap:wrap;justify-content:space-between;gap:2pt 12pt;padding-bottom:3pt !important;margin-bottom:10pt !important}.rf{padding-top:3pt !important;margin-top:10pt !important}' +
      'body{line-height:1.5 !important}p,li,.pre,div{line-height:1.5}' +
      'p{margin:0 0 6pt !important;text-indent:2.5cm;text-align:justify;text-justify:inter-character;overflow-wrap:anywhere;word-break:normal;line-break:auto;hyphens:none}' +
      '.sec{margin:0 0 12pt !important}.sec + .sec{margin-top:12pt !important}' +
      'p.item{text-indent:0 !important;padding-left:1.5cm !important}p.item.sub{padding-left:2.5cm !important}' +
      '.hd p,.fin h2,table.dt p,.tr9,.noind{text-indent:0 !important}.tr9{text-align:left}' +
      'table.pg{table-layout:fixed;width:100%;border-collapse:collapse}table.pg>thead>tr>td,table.pg>tbody>tr>td,table.pg>tfoot>tr>td{width:100%}' +
      'td,th,span,div,h2,h3,h4{overflow-wrap:anywhere}img{max-width:100%}table.dt{table-layout:fixed;width:100%}table.dt td,table.dt th{font-size:14pt !important;text-align:left}' +
      '@page{@bottom-center{font-size:12pt}}';
    try {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      /* ข้อความหลายบรรทัด → แยกเป็นย่อหน้า (ย่อหน้าแรกของแต่ละย่อหน้า) อนุมาตรา (1) (ก) เยื้องเข้า */
      [].slice.call(doc.querySelectorAll('.pre')).forEach(function (pre) {
        var lines = String(pre.textContent || '').split(/\n+/).map(function (s) { return s.trim(); }).filter(String);
        var w = doc.createElement('div'); w.className = 'pre15';
        lines.forEach(function (ln) { var p = doc.createElement('p'); if (/^\(?\s*([0-9๐-๙]{1,3}|[ก-ฮ])\s*\)/.test(ln)) p.className = /^\(\s*[ก-ฮ]\s*\)/.test(ln) ? 'item sub' : 'item'; p.textContent = ln; w.appendChild(p); });
        pre.parentNode.replaceChild(w, pre);
      });
      var st = doc.createElement('style'); st.id = 'pdf15'; st.textContent = css; doc.head.appendChild(st);
      html = '<!doctype html>' + doc.documentElement.outerHTML;
    } catch (e) { html = html.replace('</head>', '<style id="pdf15">' + css + '</style></head>'); }
    var fr = document.createElement('iframe'); fr.setAttribute('aria-hidden', 'true');
    fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none';
    document.body.appendChild(fr);
    var d = fr.contentWindow.document; d.open(); d.write(html); d.close();
    var printed = false;
    var go = function () {
      if (printed) return; printed = true;
      try { fr.contentWindow.focus(); fr.contentWindow.print(); }
      catch (e) { var w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); setTimeout(function () { w.print(); }, 900); } else toast('ไม่สามารถเปิดหน้าพิมพ์ได้', 'กรุณาอนุญาตป๊อปอัปแล้วลองใหม่', 'warn'); }
      setTimeout(function () { try { fr.remove(); } catch (e) {} }, 60000);
    };
    var t = setTimeout(go, 4000), fonts = d.fonts;
    if (fonts && fonts.load) Promise.all([fonts.load('16pt "TH Sarabun New"'), fonts.load('bold 16pt "TH Sarabun New"')]).then(function () { return fonts.ready; }).then(function () { clearTimeout(t); setTimeout(go, 200); }).catch(function () {});
  });
};
</script>
