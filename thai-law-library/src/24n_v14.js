<script>
/* ==========================================================================
   v14: แก้ไขเฉพาะจุดตามคำสั่ง — ไม่ลบข้อมูลหรือระบบเดิม
   ========================================================================== */

/* ---------- 1) ปุ่ม “แชท” ย้ายไปอยู่ในเมนูสามขีดมุมซ้ายบน พร้อมตัวเลขข้อความใหม่ (แสดงที่ปุ่มสามขีดด้วย) ---------- */
(function () { for (var i = TABS.length - 1; i >= 0; i--) if (TABS[i][0] === 'chat') TABS.splice(i, 1); })();
setChatBadge = function () {
  var n = S.ui && S.ui.view === 'chat' ? 0 : chatUnread(), txt = n > 99 ? '99+' : String(n);
  var mb = document.getElementById('btnMenu');
  if (mb) { var c = mb.querySelector('.menu-cnt'); if (n && !c) { c = document.createElement('span'); c.className = 'menu-cnt'; mb.appendChild(c); } if (c) { if (n) { c.textContent = txt; c.setAttribute('aria-label', 'ข้อความแชทใหม่จากผู้ดูแลระบบ ' + n + ' ข้อความ'); } else c.remove(); } }
  var it = document.querySelector('.drawer [data-v="chat"] .chat-cnt14');
  if (it) { it.textContent = txt; it.hidden = !n; }
};
(function () {
  var baseMenu = openMainMenu;
  openMainMenu = function () {
    var r = baseMenu.apply(this, arguments);
    var list = document.querySelector('.drawer .menu-list');
    if (list && !list.querySelector('[data-v="chat"]') && !isGuest()) {
      var n = chatUnread();
      list.insertAdjacentHTML('afterbegin', '<button class="menu-item" data-v="chat"><span class="mi">' + ic('chat') + '</span><span class="grow"><span class="mt">แชทกับผู้ดูแลระบบ</span><br><span class="ms">สอบถาม ร้องเรียน แจ้งปัญหา แนบรูปภาพหรือไฟล์ได้</span></span><span class="chat-cnt14"' + (n ? '' : ' hidden') + '>' + (n > 99 ? '99+' : n) + '</span>' + ic('chevR', 'chev') + '</button>');
    }
    return r;
  };
  var baseApp = renderApp;
  renderApp = function () { var x = baseApp.apply(this, arguments); setTimeout(setChatBadge, 0); return x; };
})();

/* ---------- 2) แชท: ปุ่ม + แนบรูปภาพ/ไฟล์ใช้งานได้ทุกอุปกรณ์ (ใช้ป้ายกำกับของช่องเลือกไฟล์โดยตรง รองรับ iPhone/iPad) ---------- */
(function () {
  var baseView = VIEWS.chat;
  VIEWS.chat = function (el) {
    baseView(el);
    var form = document.getElementById('chForm'); if (!form) return;
    var oldBtn = form.querySelector('#chPlus'), oldIn = form.querySelector('#chFile');
    if (oldBtn) oldBtn.remove(); if (oldIn) oldIn.remove();
    form.insertAdjacentHTML('afterbegin', '<label class="ch-plus" id="chPlus" for="chFile14" role="button" tabindex="0" aria-label="แนบรูปภาพหรือไฟล์" title="แนบรูปภาพหรือไฟล์">' + ic('plus') + '</label><input type="file" id="chFile14" class="ch-file-in" multiple>');
    var fin = document.getElementById('chFile14');
    fin.addEventListener('change', function () { var fs = Array.prototype.slice.call(fin.files || []); fin.value = ''; if (!fs.length) return; fs.forEach(chUpload); });
    var lab = document.getElementById('chPlus');
    lab.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fin.click(); } });
  };
})();

/* ---------- 3) พิมพ์ PDF: รูปแบบเวอร์ชัน 11 · ตัวอักษร TH Sarabun New ขนาด 16 pt ทั้งหมด (หัว/ท้ายกระดาษ 12 pt) · ไม่ตัดข้อความขอบขวา ---------- */
var PF14 = { n: null, b: null, p: null };
function pdfFonts14() {
  if (PF14.n && PF14.b) return Promise.resolve(PF14);
  if (PF14.p) return PF14.p;
  var get = function (f) { return fetch(DB_RAW + 'fonts/' + f).then(function (r) { if (!r.ok) throw new Error('font'); return r.blob(); }).then(function (b) { return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = rej; fr.readAsDataURL(b); }); }); };
  PF14.p = Promise.all([get('THSarabunNew.woff'), get('THSarabunNew-Bold.woff')]).then(function (x) { PF14.n = x[0]; PF14.b = x[1]; return PF14; }).catch(function () { PF14.p = null; return PF14; });
  return PF14.p;
}
setTimeout(pdfFonts14, 4000);   // เตรียมแบบอักษรไว้ล่วงหน้า (ไม่รบกวนการใช้งาน)
printHtml = function (html) {
  html = String(html || '');
  var css11 = 'body{line-height:1.65 !important}p,li,.pre,.sec,td,th,div{line-height:1.65}p{margin:0 0 5pt !important}.sec{margin:0 0 9pt !important}h2,h3,h4{line-height:1.45 !important;margin-top:9pt !important}' +
    '*{letter-spacing:0 !important;word-spacing:0.02em}p,.pre{overflow-wrap:break-word;word-break:normal;line-break:normal}' +
    '.rh,.rh *,.rf,.rf *{font-size:12pt !important;line-height:1.35 !important}.rh{padding-bottom:3pt !important;margin-bottom:10pt !important}.rf{padding-top:3pt !important;margin-top:10pt !important}';
  var css14 = 'body,p,li,td,th,div,span,.pre,.sec,h1,h2,h3,h4,.hd .t1,.hd .n1,.hd div,.tr9,b,strong{font-size:16pt !important}.rh,.rh *,.rf,.rf *{font-size:12pt !important}' +
    'table.pg{table-layout:fixed;width:100%}table.pg>thead>tr>td,table.pg>tbody>tr>td,table.pg>tfoot>tr>td{width:100%}' +
    'p,.pre,.sec,td,th,span,div,h2,h3,h4{overflow-wrap:anywhere;word-wrap:break-word}img{max-width:100%}.rh{flex-wrap:wrap}table.dt{table-layout:fixed}@page{@bottom-center{font-size:12pt}}';
  return pdfFonts14().then(function (F) {
    var ff = F.n && F.b ? '@font-face{font-family:"TH Sarabun New";src:url(' + F.n + ') format("woff");font-weight:normal}@font-face{font-family:"TH Sarabun New";src:url(' + F.b + ') format("woff");font-weight:bold}' : '';
    var style = '<style id="pdf14">' + ff + css11 + css14 + '</style>';
    html = html.indexOf('</head>') > -1 ? html.replace('</head>', style + '</head>') : style + html;
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
    /* รอให้แบบอักษร TH Sarabun New โหลดเสร็จจริงก่อนพิมพ์ (ป้องกันตัวอักษรใหญ่ผิดขนาดจากแบบอักษรสำรอง) */
    var fonts = d.fonts;
    var t = setTimeout(go, 4000);
    if (fonts && fonts.load) Promise.all([fonts.load('16pt "TH Sarabun New"'), fonts.load('bold 16pt "TH Sarabun New"')]).then(function () { return fonts.ready; }).then(function () { clearTimeout(t); setTimeout(go, 200); }).catch(function () {});
  });
};
</script>
