<script>
/* ==========================================================================
   v22 — การพิมพ์ PDF ทุกประเภท (คำพิพากษา คำอธิบายกฎหมาย ตัวบท ดูดวง เอกสารอื่น ๆ)
   - กดปุ่มพิมพ์แล้วแสดงหน้าตัวอย่างก่อนพิมพ์ทันที (จัดเป็นหน้ากระดาษ A4 จริง) แล้วกด “พิมพ์ / บันทึกเป็น PDF”
   - ทุกหน้ามีหัวกระดาษและท้ายกระดาษ · เลขหน้า “หน้าที่/จำนวนหน้า” ตรงกลางหัวกระดาษทุกหน้า
   - ท้ายกระดาษอยู่ชิดล่างของกระดาษทุกหน้า รวมถึงหน้าสุดท้าย
   - จัดหน้าเอง (ไม่พึ่งความสามารถของเบราว์เซอร์) จึงได้ผลเหมือนกันบน iPad/iPhone/Android/คอมพิวเตอร์
   ========================================================================== */
var PV22 = { el: null };
var PV22_CSS15 = '*{font-family:"TH Sarabun New","TH SarabunPSK","TH Sarabun PSK",sans-serif !important;letter-spacing:0 !important;box-sizing:border-box}' +
  'body,p,li,td,th,div,span,.pre,.sec,b,strong,.tr9{font-size:16pt}' +
  'h2,h3,h4{font-size:17pt;line-height:1.35;margin:12pt 0 4pt;page-break-after:avoid}.hd .t1{font-size:18pt}.hd .n1,.hd div{font-size:16pt}' +
  'body{line-height:1.5}p,li,.pre,div{line-height:1.5}' +
  'p{margin:0 0 6pt;text-indent:2.5cm;text-align:justify;text-align-last:left;hyphens:none;word-break:normal;overflow-wrap:normal}' +
  '.sec{margin:0 0 12pt}p.item{text-indent:0;padding-left:1.5cm}p.item.sub{padding-left:2.5cm}' +
  '.hd p,.fin h2,table.dt p,.tr9,.noind{text-indent:0}.tr9{text-align:left}img{max-width:100%}table.dt{table-layout:fixed;width:100%}table.dt td,table.dt th{font-size:14pt;text-align:left}';

/* สคริปต์จัดหน้า (ทำงานภายในหน้าตัวอย่างก่อนพิมพ์) */
function pv22Paginator() {
  var D = document, W = window;
  var seg = W.Intl && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
  var words = function (t) { if (!seg) return String(t).split(/(\s+)/).filter(String); try { return Array.from(seg.segment(t)).map(function (x) { return x.segment; }); } catch (e) { return [t]; } };
  /* ชิดซ้าย–ขวาพอดีโดยไม่ตัดคำ: แทรกจุดยืดที่มองไม่เห็นระหว่างคำภาษาไทย (เฉพาะย่อหน้าที่ยังไม่ได้แบ่งคำ) */
  function justify(p) {
    if (p.querySelector('span.z')) return;
    var tw = D.createTreeWalker(p, NodeFilter.SHOW_TEXT), list = [], n;
    while ((n = tw.nextNode())) list.push(n);
    list.forEach(function (tn) {
      if (!/[฀-๿]/.test(tn.nodeValue)) return;
      var f = D.createDocumentFragment(), prevWs = true;
      words(tn.nodeValue).forEach(function (w) {
        if (/^\s+$/.test(w)) { f.appendChild(D.createTextNode(w)); prevWs = true; return; }
        if (!prevWs) { var z = D.createElement('span'); z.className = 'z'; z.textContent = ' '; f.appendChild(z); }
        f.appendChild(D.createTextNode(w)); prevWs = false;
      });
      tn.parentNode.replaceChild(f, tn);
    });
  }
  var src = D.getElementById('pv22src');
  var hdrSrc = src.querySelector('.rh'), ftrSrc = src.querySelector('.rf');
  var content;
  var tb = src.querySelector('table.pg > tbody > tr > td');
  if (tb) content = tb; else { content = src; if (hdrSrc) hdrSrc.remove(); if (ftrSrc) ftrSrc.remove(); }
  if (hdrSrc) hdrSrc = hdrSrc.cloneNode(true);
  if (ftrSrc) ftrSrc = ftrSrc.cloneNode(true);
  var meta = W.PV22META || {};
  if (hdrSrc && !hdrSrc.querySelector('.brand')) hdrSrc = null;   // หัวกระดาษแบบเดิม → ใช้หัวกระดาษมาตรฐาน
  if (!hdrSrc) { hdrSrc = D.createElement('div'); hdrSrc.className = 'rh'; hdrSrc.innerHTML = '<span></span><span class="brand">คลังกฎหมาย</span>'; hdrSrc.firstChild.textContent = meta.title || D.title || 'คลังกฎหมาย'; }
  if (!ftrSrc) { ftrSrc = D.createElement('div'); ftrSrc.className = 'rf'; ftrSrc.innerHTML = '<span>คลังกฎหมาย · thailawlibrary.vercel.app</span><span></span>'; ftrSrc.lastChild.textContent = 'พิมพ์เมื่อ ' + (meta.stamp || ''); }
  /* QR Code และเลขหน้าในหัวกระดาษ */
  var brand = hdrSrc.querySelector('.brand') || hdrSrc.lastElementChild;
  if (meta.qr && brand && !brand.querySelector('img')) { var im = D.createElement('img'); im.src = meta.qr; im.alt = 'QR'; brand.appendChild(im); }
  var left = hdrSrc.firstElementChild; if (left) left.classList.add('lt');
  var mid = D.createElement('span'); mid.className = 'pgno'; hdrSrc.insertBefore(mid, brand);
  [].slice.call(content.querySelectorAll('p')).forEach(function (p) { var ta = W.getComputedStyle(p).textAlign; if (ta === 'justify') justify(p); });

  var book = D.getElementById('pv22book'), pages = [];
  function newPage() {
    var pg = D.createElement('div'); pg.className = 'pv-page';
    pg.innerHTML = '<div class="pv-h"></div><div class="pv-b"><div class="pv-c"></div></div><div class="pv-f"></div>';
    pg.querySelector('.pv-h').appendChild(hdrSrc.cloneNode(true));
    pg.querySelector('.pv-f').appendChild(ftrSrc.cloneNode(true));
    book.appendChild(pg); pages.push(pg);
    return pg.querySelector('.pv-c');
  }
  var cur = newPage(), stack = [];   // stack = กล่องที่ซ้อนอยู่ (ต้องสร้างซ้ำบนหน้าใหม่)
  var body = function () { return cur.parentNode; };
  var padV = function () { var cs = W.getComputedStyle(body()); return (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0); };
  var fits = function () { return cur.offsetHeight <= body().clientHeight - padV() + 0.5; };
  var target = function () { return stack.length ? stack[stack.length - 1] : cur; };
  var isEmpty = function () { return !cur.firstChild || (cur.textContent.trim() === '' && !cur.querySelector('img,table')); };
  function breakPage() {
    cur = newPage();
    var parent = cur, ns = [];
    stack.forEach(function (sh) { var c = sh.cloneNode(false); c.classList.add('pv-cont'); parent.appendChild(c); ns.push(c); parent = c; });
    stack = ns;
  }
  var BLOCK = /^(P|DIV|SECTION|ARTICLE|H1|H2|H3|H4|H5|UL|OL|LI|TABLE|TBODY|THEAD|TR|DL|DT|DD|FIGURE|BLOCKQUOTE|PRE|HR|FORM|HEADER|FOOTER|MAIN|ASIDE|NAV)$/;
  var hasBlockKids = function (el) { return [].slice.call(el.children).some(function (c) { return BLOCK.test(c.tagName); }); };
  function forcedBreak(el) { return el.nodeType === 1 && (el.classList.contains('newp') || /always|page/.test(el.style.pageBreakBefore + ' ' + el.style.breakBefore) || el.classList.contains('last')); }
  function splitInline(el) {
    /* แบ่งย่อหน้ายาวข้ามหน้า: วางคำให้มากที่สุดที่พอดีกับหน้า ส่วนที่เหลือไปหน้าถัดไป */
    var toks = [];
    [].slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3) words(n.nodeValue).forEach(function (w) { toks.push(D.createTextNode(w)); });
      else toks.push(n.cloneNode(true));
    });
    var a = el.cloneNode(false); target().appendChild(a);
    var lo = 0, hi = toks.length, best = 0;
    var fill = function (k) { a.innerHTML = ''; for (var i = 0; i < k; i++) a.appendChild(toks[i].cloneNode(true)); };
    while (lo <= hi) { var mid2 = (lo + hi) >> 1; fill(mid2); if (fits()) { best = mid2; lo = mid2 + 1; } else hi = mid2 - 1; }
    /* อย่าให้เหลือบรรทัดเดียวที่ท้ายหน้าแบบไม่มีความหมาย: ถ้าวางได้น้อยมาก ให้ย้ายทั้งย่อหน้า */
    if (best < 3) { a.remove(); return false; }
    fill(best); a.classList.add('pv-jl');
    var rest = el.cloneNode(false); rest.classList.add('pv-cont');
    for (var j = best; j < toks.length; j++) rest.appendChild(toks[j]);
    while (rest.firstChild && rest.firstChild.nodeType === 3 && !rest.firstChild.nodeValue.trim()) rest.removeChild(rest.firstChild);
    breakPage(); place(rest);
    return true;
  }
  function place(node) {
    if (node.nodeType === 3) { if (!node.nodeValue.trim()) return; var sp = D.createElement('p'); sp.className = 'noind'; sp.textContent = node.nodeValue.trim(); node = sp; }
    if (node.nodeType !== 1) return;
    if (/^(SCRIPT|STYLE)$/.test(node.tagName)) return;
    if (forcedBreak(node) && !isEmpty() && !stack.length) breakPage();
    var t = target(), cl = node.cloneNode(true);
    t.appendChild(cl);
    if (fits()) return;
    t.removeChild(cl);
    var kids = [].slice.call(node.childNodes);
    if (hasBlockKids(node) && !/^(TABLE|TR|THEAD|TBODY|FIGURE)$/.test(node.tagName) && !node.classList.contains('keep')) {
      var shell = node.cloneNode(false); t.appendChild(shell); stack.push(shell);
      kids.forEach(place);
      stack.pop();
      return;
    }
    if (node.tagName === 'TABLE' && node.querySelector('tr')) {   // ตาราง: แบ่งทีละแถว
      var tshell = node.cloneNode(false), tbody = D.createElement('tbody'); tshell.appendChild(tbody); t.appendChild(tshell); stack.push(tshell); stack.push(tbody);
      [].slice.call(node.querySelectorAll('tr')).forEach(place);
      stack.pop(); stack.pop();
      return;
    }
    if (!/^(TABLE|TR|IMG|FIGURE|HR)$/.test(node.tagName) && node.textContent.trim().length > 20 && !hasBlockKids(node)) {
      if (!isEmpty() || stack.length) { if (splitInline(node)) return; breakPage(); }
      t = target(); t.appendChild(node.cloneNode(true)); if (fits()) return; t.removeChild(t.lastChild);
      if (splitInline(node)) return;
    }
    if (!isEmpty()) breakPage();
    target().appendChild(node.cloneNode(true));   // สูงเกินหนึ่งหน้า (เช่นรูปภาพ) — วางไว้หน้าใหม่
  }
  var kids0 = [].slice.call(content.childNodes);
  src.remove();
  kids0.forEach(place);
  /* ลบหน้าว่างท้ายเอกสาร แล้วใส่เลขหน้า */
  pages = pages.filter(function (pg) { var c = pg.querySelector('.pv-c'); if (c.textContent.trim() === '' && !c.querySelector('img,table')) { pg.remove(); return false; } return true; });
  pages.forEach(function (pg, i) { var s = pg.querySelector('.pgno'); if (s) s.textContent = (i + 1) + '/' + pages.length; });
  D.documentElement.setAttribute('data-pages', pages.length);
  W.PV22DONE = pages.length;
  try { parent.postMessage({ pv22: 'done', pages: pages.length }, '*'); } catch (e) {}
}

function pv22Build(html, meta) {
  return pdfFonts14().then(function (F) {
    var ff = F.n && F.b ? '@font-face{font-family:"TH Sarabun New";src:url(' + F.n + ') format("woff");font-weight:normal}@font-face{font-family:"TH Sarabun New";src:url(' + F.b + ') format("woff");font-weight:bold}' : fontFace();
    var doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    /* ข้อความหลายบรรทัด → แยกเป็นย่อหน้า (อนุมาตรา (1) (ก) เยื้องเข้า) */
    [].slice.call(doc.querySelectorAll('.pre')).forEach(function (pre) {
      var w = doc.createElement('div'); w.className = 'pre15';
      String(pre.textContent || '').split(/\n+/).map(function (s) { return s.trim(); }).filter(String).forEach(function (ln) { var p = doc.createElement('p'); if (/^\(?\s*([0-9๐-๙]{1,3}|[ก-ฮ])\s*\)/.test(ln)) p.className = /^\(\s*[ก-ฮ]\s*\)/.test(ln) ? 'item sub' : 'item'; p.textContent = ln; w.appendChild(p); });
      pre.parentNode.replaceChild(w, pre);
    });
    [].slice.call(doc.querySelectorAll('script')).forEach(function (s) { s.remove(); });
    var own = !!doc.getElementById('pdf11');   // เอกสารรุ่นใหม่ (คำพิพากษา/คำอธิบาย) มีรูปแบบของตัวเองแล้ว
    /* ขอบกระดาษ 12.7 มม. (ค่ามาตรฐานของเครื่องพิมพ์ทุกยี่ห้อ รวมถึง iPad/iPhone) + ระยะภายใน = ขอบบน 1.6 ซม. ขวา 2 ซม. ล่าง 1.5 ซม. ซ้าย 3 ซม. (2.5 ซม.)
       หน้าเอกสารจึงไม่ล้นกระดาษ (เดิมล้นจนเกิดหน้าว่างสลับกันเมื่อพิมพ์บน iPad) */
    var pageM = own ? '3.3mm 7.3mm 2.3mm 17.3mm' : '3.3mm 7.3mm 2.3mm 12.3mm';
    var css = ff + (own ? '' : PV22_CSS15) +
      '@page{size:A4;margin:12.7mm}html,body{margin:0;padding:0}' +
      'span.z{font-size:0 !important}' +
      '.pv-page{width:184mm;height:268mm;padding:' + pageM + ';display:flex;flex-direction:column;background:#fff;overflow:hidden;position:relative;page-break-after:always;break-after:page}' +
      '.pv-page:last-child{page-break-after:auto;break-after:auto}' +
      '.pv-b{flex:1 1 auto;min-height:0;overflow:hidden;padding:7pt 0 5pt}.pv-c{display:flow-root}' +
      '.pv-h .rh,.pv-f .rf{display:grid !important;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:8pt;white-space:nowrap}' +
      '.pv-h .rh{border-bottom:.75pt solid #000;padding:0 0 3pt;margin:0 0 12pt}.pv-f .rf{border-top:.75pt solid #000;padding:3pt 0 0;margin:12pt 0 0;grid-template-columns:minmax(0,1fr) auto}' +
      '.pv-h .rh *,.pv-f .rf *{font-size:13pt !important;line-height:1.25 !important;white-space:nowrap;text-indent:0 !important}' +
      '.pv-h .rh .lt,.pv-f .rf>span:first-child{overflow:hidden;text-overflow:ellipsis}.pv-f .rf>span:last-child{text-align:right}' +
      '.pv-h .pgno{text-align:center;font-weight:bold}.pv-h .brand{display:flex;align-items:center;justify-content:flex-end;gap:6pt;font-weight:bold}.pv-h .brand img{width:1.15cm;height:1.15cm;display:block}' +
      '.pv-cont{text-indent:0 !important;margin-top:0 !important;border-top:0 !important;padding-top:0 !important}p.pv-jl{text-align-last:justify !important}' +
      '@media screen{html{background:#5b6472}body{padding:12px 0 40px}.pv-page{margin:calc(12.7mm + 4px) auto calc(25.4mm + 14px);outline:12.7mm solid #fff;box-shadow:0 0 0 12.7mm #fff,0 4px 18px 12.7mm rgba(0,0,0,.35);zoom:var(--z,1)}}' +
      '@media print{html,body{background:#fff}.pv-page{margin:0;box-shadow:none;outline:0;zoom:1 !important}}';
    var st = doc.createElement('style'); st.id = 'pv22css'; st.textContent = css; doc.head.appendChild(st);
    var bodyHtml = doc.body.innerHTML;
    doc.body.innerHTML = '<div id="pv22src">' + bodyHtml + '</div><div id="pv22book"></div>';
    var sc = doc.createElement('script');
    sc.textContent = 'window.PV22META=' + JSON.stringify(meta).replace(/</g, '\\u003c') + ';window.pv22Go=' + pv22Paginator.toString() + ';' +
      'function pv22Fit(){var w=document.documentElement.clientWidth,z=Math.min(1,(w-16)/793.7);document.documentElement.style.setProperty("--z",z.toFixed(3));}addEventListener("resize",function(){if(window.PV22DONE>0)pv22Fit();});' +
      'function pv22Start(){if(window.PV22DONE!=null)return;window.PV22DONE=0;try{pv22Go();pv22Fit();}catch(e){window.PV22DONE=-1;try{parent.postMessage({pv22:"error",msg:String(e&&e.message||e)},"*");}catch(x){}}}' +
      'var f=document.fonts;var t0=setTimeout(pv22Start,3000);if(f&&f.load){Promise.all([f.load("16pt \\"TH Sarabun New\\""),f.load("bold 16pt \\"TH Sarabun New\\"")]).then(function(){return f.ready;}).then(function(){clearTimeout(t0);pv22Start();}).catch(function(){});}';
    doc.body.appendChild(sc);
    return '<!doctype html>' + doc.documentElement.outerHTML;
  });
}

function pv22Close() { if (PV22.el) { PV22.el.remove(); PV22.el = null; document.documentElement.classList.remove('pv22-on'); } }
function pv22IsIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
function pv22Print() {
  var fr = PV22.el && PV22.el.querySelector('iframe'); if (!fr) return;
  var w = fr.contentWindow;
  if (pv22IsIOS()) {
    /* iPad/iPhone: เปิดเอกสารที่จัดหน้าแล้วในแท็บใหม่ แล้วสั่งพิมพ์จากแท็บนั้น (Safari บน iOS พิมพ์เนื้อหาในกรอบย่อยไม่ได้) */
    var d = w.document, html = '<!doctype html>' + d.documentElement.outerHTML.replace(/<script[\s\S]*?<\/script>/gi, '').replace('</body>', '<div class="pv22bar" style="position:fixed;left:0;right:0;bottom:0;padding:12px;background:#0e1116;text-align:center"><button onclick="window.print()" style="font:600 18px sans-serif;padding:12px 26px;border-radius:12px;border:0;background:#fff">พิมพ์ / บันทึกเป็น PDF</button></div><style>@media print{.pv22bar{display:none !important}}</style></body>');
    var nw = window.open('', '_blank');
    if (nw) { nw.document.open(); nw.document.write(html); nw.document.close(); setTimeout(function () { try { nw.focus(); nw.print(); } catch (e) {} }, 600); return; }
  }
  try { w.focus(); w.print(); } catch (e) { toast('ไม่สามารถเปิดหน้าพิมพ์ได้', 'กรุณาอนุญาตป๊อปอัปแล้วลองใหม่', 'warn'); }
}
window.addEventListener('message', function (e) {
  var m = e.data; if (!m || !m.pv22 || !PV22.el) return;
  var s = PV22.el.querySelector('.pv22-st'), b = PV22.el.querySelector('[data-pv22p]');
  if (m.pv22 === 'done') { s.innerHTML = ic('check') + ' จัดหน้าเรียบร้อย ' + m.pages + ' หน้า'; b.disabled = false; }
  if (m.pv22 === 'error') { s.textContent = 'จัดหน้าไม่สำเร็จ: ' + m.msg; b.disabled = false; }
});
/* แสดงหน้าตัวอย่างก่อนพิมพ์ทันทีที่กดปุ่ม (ก่อนเตรียมแบบอักษรและข้อมูลเสร็จ) */
function pv22Open() {
  if (PV22.el && PV22.el.getAttribute('data-pending')) return PV22.el;
  pv22Close();
  var el = PV22.el = h('<div class="pv22" role="dialog" aria-modal="true" aria-label="ตัวอย่างก่อนพิมพ์"><div class="pv22-bar"><div class="pv22-t"><b>ตัวอย่างก่อนพิมพ์</b><span class="pv22-st small"><span class="sp21 sm"></span> กำลังจัดหน้าเอกสาร…</span></div>' +
    '<button class="btn k" data-pv22p disabled>' + ic('download') + ' พิมพ์ / บันทึกเป็น PDF</button><button class="btn" data-pv22x>' + ic('x') + ' ปิด</button></div><iframe title="ตัวอย่างก่อนพิมพ์"></iframe></div>');
  document.body.appendChild(el); document.documentElement.classList.add('pv22-on');
  el.querySelector('[data-pv22x]').onclick = pv22Close;
  el.querySelector('[data-pv22p]').onclick = pv22Print;
  el.setAttribute('data-pending', '1');
  return el;
}
document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-dkp20],#ex21Print')) pv22Open(); }, true);
printHtml = function (html) {
  html = String(html || '');
  var el = pv22Open(); el.removeAttribute('data-pending');
  var title = ((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || 'เอกสาร').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s*—\s*คลังกฎหมาย\s*$/, '');
  var meta = { title: title, stamp: printStamp().replace(/^วันที่ /, ''), qr: '' };
  return (typeof qr21 === 'function' ? qr21() : Promise.resolve('')).then(function (qr) { meta.qr = qr || ''; return pv22Build(html, meta); }).then(function (out) {
    if (PV22.el !== el) return;
    var fr = el.querySelector('iframe'), d = fr.contentWindow.document;
    d.open(); d.write(out); d.close();
  }).catch(function (e) { var s = el.querySelector('.pv22-st'); if (s) s.textContent = 'จัดเตรียมเอกสารไม่สำเร็จ กรุณาลองใหม่'; });
};

/* ---------- เสียงอ่าน: ใช้เสียงผู้ชายเป็นหลัก · เสียงผู้หญิงแสดงเฉพาะเมื่อเปิดใช้เสียงมนุษย์ (ElevenLabs) แล้ว ---------- */
(function () {
  if (V18.voice !== 'f') V18.voice = 'm';
  v18Pick = function () { if (V18.voice !== 'f' || !document.documentElement.classList.contains('tts-on')) V18.voice = 'm'; return Promise.resolve(V18.voice); };
  var chk = function () { try { api('ttsStatus', {}, { silent: true }).then(function (r) { var on = !!(r && r.on); document.documentElement.classList.toggle('tts-on', on); if (!on) V18.voice = 'm'; }).catch(function () {}); } catch (e) {} };
  setTimeout(chk, 2500);
})();

/* ---------- ปุ่ม “แสดงเพิ่มเติม”: คงตำแหน่งการเลื่อนไว้ที่เดิม (เดิมหน้ากระโดดกลับขึ้นไปมาตราแรก) ---------- */
(function () {
  var SEL = '#ex19More,#v18More,#dt18More,#dkMore,#dkMore9,#fcMore,#twMore';
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest(SEL); if (!b) return;
    var y = window.scrollY || document.documentElement.scrollTop || 0, until = Date.now() + 1500;
    var stop = function () { until = 0; }; ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { window.addEventListener(ev, stop, { once: true, passive: true }); });
    var keep = function () { if (Date.now() >= until) return; var now = window.scrollY || document.documentElement.scrollTop || 0; if (now < y - 40) window.scrollTo({ top: y, behavior: 'instant' }); if (Date.now() < until) requestAnimationFrame(keep); };
    requestAnimationFrame(keep);
  }, true);
})();

/* ---------- รับคำสั่งจากระบบหลังบ้านแบบทั่วไป (LIVE_UI และคีย์ UI_*) — มีผลทันทีที่ ping/pulse รอบถัดไป ---------- */
var LIVE22 = { sig: '', t0: Date.now() };
function liveUiApply(ui, flags) {
  var sig = JSON.stringify([ui || null, flags || null]);
  if (sig === LIVE22.sig) return; LIVE22.sig = sig;
  ui = ui || {}; flags = flags || {};
  var arr = function (a) { return Array.isArray(a) ? a.filter(function (x) { return typeof x === 'string' && x.length < 300 && !/[{}<]/.test(x); }) : []; };
  var css = '';
  arr(ui.hide).forEach(function (q) { css += q + '{display:none !important}'; });
  arr(ui.show).forEach(function (q) { css += q + '{display:revert !important}'; });
  if (typeof ui.css === 'string') css += ui.css.replace(/<\/?style/gi, '').slice(0, 20000);
  var st = document.getElementById('liveui22'); if (!st) { st = document.createElement('style'); st.id = 'liveui22'; document.head.appendChild(st); }
  st.textContent = css;
  try { Object.keys(ui.text || {}).slice(0, 50).forEach(function (q) { if (/[{}<]/.test(q)) return; document.querySelectorAll(q).forEach(function (el) { el.textContent = String(ui.text[q]).slice(0, 2000); }); }); } catch (e) {}
  var b = document.getElementById('liveban22');
  if (ui.banner && ui.banner.text) {
    var bid = String(ui.banner.id || ui.banner.text).slice(0, 80), closed = false;
    try { closed = sessionStorage.getItem('tll.liveban') === bid; } catch (e) {}
    if (!closed) {
      if (!b) { b = h('<div id="liveban22" class="liveban22" role="status"><span class="t"></span><button class="icon-btn" aria-label="ปิดประกาศ">' + ic('x') + '</button></div>'); document.body.appendChild(b); b.querySelector('button').onclick = function () { try { sessionStorage.setItem('tll.liveban', b.getAttribute('data-id')); } catch (e) {} b.remove(); }; }
      b.setAttribute('data-id', bid); b.className = 'liveban22 ' + (/^(info|warn|bad|ok)$/.test(ui.banner.type) ? ui.banner.type : 'info');
      b.querySelector('.t').textContent = String(ui.banner.text).slice(0, 1000);
    }
  } else if (b) b.remove();
  var root = document.documentElement;
  [].slice.call(root.attributes).forEach(function (a) { if (/^data-ui-/.test(a.name)) root.removeAttribute(a.name); });
  Object.keys(flags).forEach(function (k) { root.setAttribute('data-ui-' + k.slice(3).toLowerCase().replace(/_/g, '-'), String(flags[k]).slice(0, 200)); });
  window.LIVE_UI_FLAGS = flags; window.LIVE_UI = ui;
  try { window.dispatchEvent(new CustomEvent('liveui', { detail: { ui: ui, flags: flags } })); } catch (e) {}
  if (ui.reload) { var rt = Date.parse(ui.reload); var done = ''; try { done = localStorage.getItem('tll.livereload') || ''; } catch (e) {} if (rt && rt <= Date.now() && rt > LIVE22.t0 - 86400000 && done !== String(ui.reload)) { try { localStorage.setItem('tll.livereload', String(ui.reload)); } catch (e) {} location.reload(); } }
}
(function () {
  var base = applyModes;
  applyModes = function (m) { var r = base.apply(this, arguments); try { if (m && (m.ui || m.uiFlags || LIVE22.sig)) liveUiApply(m.ui, m.uiFlags); } catch (e) {} return r; };
})();
</script>
