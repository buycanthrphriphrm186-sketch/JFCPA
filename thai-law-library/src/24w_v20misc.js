<script>
/* ==========================================================================
   v20 (แสดงเป็นเวอร์ชัน 1.0.0)
   - แนะนำตัวผู้สร้างเว็บไซต์: แสดงเฉพาะหน้าสำหรับผู้ที่ยังไม่เข้าสู่ระบบ · ไม่มีปุ่ม “แนะนำตัว” ในเมนูหลังเข้าสู่ระบบ
     · ตอบสนองการเปิด/ปิด/ปิดปรับปรุง/แก้ไขจากระบบหลังบ้านภายในไม่กี่วินาที · รูปโหลดทันที
   ========================================================================== */
APP_VERSION = '1.0.0';
(function () {
  for (var i = TABS.length - 1; i >= 0; i--) if (TABS[i][0] === 'creator') TABS.splice(i, 1);
  var baseCreator = VIEWS.creator;
  VIEWS.creator = function (el) {
    if (S.token) { setTimeout(function () { nav('home'); }, 0); el.innerHTML = ''; return; }
    return baseCreator(el);
  };
  var baseLoad = cr18Load;
  cr18Load = function (force) {
    if (CR18.busy && force) { CR18.again = true; return (CR18.wait || Promise.resolve(CR18.p)); }
    var p = baseLoad(force);
    if (CR18.busy) CR18.wait = p.then(function (r) {
      CR18.wait = null;
      if (CR18.again) { CR18.again = false; return cr18Load(true).then(function (x) { cr18Mount(); var v = document.getElementById('cr18View'); if (v) v.innerHTML = cr18Html(x, true); return x; }); }
      return r;
    });
    return CR18.wait || p;
  };
  var baseMount = cr18Mount;
  cr18Mount = function () {
    if (S.token) { var cur = document.getElementById('creatorIntro'); if (cur) cur.remove(); return; }
    baseMount();
    var img = document.querySelector('#creatorIntro .cr18-photo');
    if (img && img.tagName === 'IMG') { img.loading = 'eager'; img.decoding = 'async'; try { img.fetchPriority = 'high'; } catch (e) {} }
  };
  /* เตรียมรูปไว้ล่วงหน้าทันทีที่ได้ข้อมูล */
  var baseHtml = cr18Html;
  cr18Html = function (p, full) {
    if (p && p.on && p.photo && /^https:/.test(p.photo) && CR18.pre !== p.photo) { CR18.pre = p.photo; try { var im = new Image(); im.decoding = 'async'; im.src = p.photo; } catch (e) {} }
    return baseHtml(p, full);
  };
})();
/* เข้าสู่ระบบด้วย Google — เฉพาะหน้าเข้าสู่ระบบ (หน้าสมัครสมาชิกไม่มีปุ่มนี้) แสดงเมื่อผู้ดูแลระบบตั้งค่า GOOGLE_CLIENT_ID แล้ว */
socialButtons = function (mode) {
  var prov = (S.flags && S.flags.providers) || {};
  if (mode !== 'login' || !prov.google) return '';
  return '<div class="social g20"><a href="#" data-oauth="google">' + BRAND.google + '<span>เข้าสู่ระบบด้วย Google</span></a></div><p class="tiny muted g20-note">ใช้ได้กับบัญชี Google ที่ใช้อีเมลเดียวกับที่กรอกไว้ตอนสมัครสมาชิก</p>';
};
(function () {
  var baseSoc = handleSocialBoot;
  handleSocialBoot = function (soc) {
    if (!soc || !soc.notRegistered) return baseSoc.apply(this, arguments);
    try { google.script.history.replace(null, {}, ''); } catch (e) {}
    renderLogin();
    var em = esc(soc.email || '');
    setTimeout(function () {
      popup11({ cls: 'g20p', icon: 'user', title: 'กรุณาสมัครสมาชิกก่อนเข้าสู่ระบบด้วย Google', sub: 'ยังไม่พบบัญชีสมาชิกที่ใช้อีเมลนี้', ok: 'สมัครสมาชิก', cancel: 'ยกเลิก',
        html: '<p>ระบบไม่พบบัญชีสมาชิกของเว็บไซต์คลังกฎหมายที่ใช้อีเมล <b>' + em + '</b> ซึ่งได้รับการยืนยันจาก Google</p>' +
          '<p>การเข้าสู่ระบบด้วย Google ใช้ได้เฉพาะผู้ที่สมัครสมาชิกไว้แล้ว และระบุอีเมลเดียวกันนี้ไว้ในขั้นตอนการสมัครสมาชิก ทั้งนี้ ด้วยเหตุผลดังต่อไปนี้</p>' +
          '<ol class="g20-ol"><li>เพื่อให้ทราบตัวตนของผู้ใช้งานตามข้อมูลที่ผู้สมัครแจ้งไว้ ได้แก่ ชื่อ นามสกุล สถานะ และสถานศึกษาหรือหน่วยงาน ซึ่งการยืนยันด้วยบัญชี Google เพียงอย่างเดียวไม่อาจแสดงข้อมูลดังกล่าวได้</li>' +
          '<li>เพื่อให้ผู้ดูแลระบบออกรหัสผ่านจากผู้ดูแลระบบ และกำหนดสิทธิ์การใช้งานแก่สมาชิกแต่ละรายได้อย่างถูกต้อง</li>' +
          '<li>เพื่อคุ้มครองข้อมูลส่วนบุคคลตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 โดยระบบจะเก็บและใช้ข้อมูลเฉพาะของผู้ที่ได้ให้ความยินยอมในขั้นตอนการสมัครสมาชิกเท่านั้น</li>' +
          '<li>เมื่อสมัครสมาชิกด้วยอีเมลนี้เรียบร้อยแล้ว ระบบจะจดจำอีเมลไว้ และท่านสามารถกด “เข้าสู่ระบบด้วย Google” ได้ทันทีในครั้งถัดไป</li></ol>' +
          '<p class="small muted">กด “สมัครสมาชิก” เพื่อไปยังแบบฟอร์มสมัครสมาชิก โดยระบบจะกรอกอีเมลนี้ไว้ให้ หรือกด “ยกเลิก” เพื่อกลับไปหน้าเข้าสู่ระบบ</p>' }).then(function (ok) {
        if (!ok) return;
        REG.email = soc.email || REG.email; if (soc.name && !REG.firstName) { var nm = String(soc.name).split(' '); REG.firstName = nm[0]; REG.lastName = nm.slice(1).join(' '); }
        REG.step = 1; renderRegister();
      });
    }, 350);
    return true;
  };
})();
/* จำนวนมาตราบนการ์ด: แสดงเลขมาตราแรก–สุดท้ายคู่กับจำนวนมาตราทั้งหมด (ซึ่งนับรวมมาตรา ทวิ ตรี ฯลฯ) ให้ตรงกับป้ายพลิก */
var LAST20 = { K01: '1755', K02: '398', K03: '323', K04: '267', K05: '129', K06: '113', C01: '39', C02: '68', C03: '96', C05: '188', C07: '20', C09: '23', C14: '33', C15: '223' };
function last20(id) {
  if (LAST20[id]) return LAST20[id];
  var ss = SECS_BY_LAW && SECS_BY_LAW[id]; if (!ss || !ss.length || !(LAW_LOADED && LAW_LOADED[id])) return '';
  var mx = 0; ss.forEach(function (x) { var n = parseInt(String(x.no).replace(/[๐-๙]/g, function (d) { return '๐๑๒๓๔๕๖๗๘๙'.indexOf(d); }), 10); if (n > mx) mx = n; });
  return mx ? (LAST20[id] = String(mx)) : '';
}
function range20(root) {
  $$('.law-item[data-law],.law-item[data-v18law],.law-item[data-ex19law]', root || document).forEach(function (b) {
    if (b.querySelector('.li-r')) return;
    var id = b.getAttribute('data-law') || b.getAttribute('data-v18law') || b.getAttribute('data-ex19law'), l = LAWS[id], last = last20(id);
    if (!l || !last || String(l.n) === last) return;
    var sEl = b.querySelector('.li-s'); if (!sEl) return;
    sEl.insertAdjacentHTML('beforeend', '<span class="li-r"> · เลขมาตรา 1–' + esc(last) + ' (จำนวนรวมนับมาตรา ทวิ ตรี ฯลฯ ด้วย)</span>');
  });
}
var R20 = false; new MutationObserver(function () { if (R20) return; R20 = true; requestAnimationFrame(function () { R20 = false; try { range20(); } catch (e) {} }); }).observe(document.documentElement, { childList: true, subtree: true });
/* กฎหมายต่างประเทศ: แสดงไฟล์ต้นฉบับ (PDF) หรือปุ่มเปิดเว็บไซต์ทางการ เมื่อตัวบทมาจากต้นฉบับของประเทศนั้นโดยตรง */
(function () {
  var baseOpen = openForeignLaw;
  openForeignLaw = function (c, id, entry, meta) {
    var r = baseOpen.apply(this, arguments);
    var t0 = Date.now(), iv = setInterval(function () {
      var reader = document.querySelector('.fv-reader'), body = reader && reader.querySelector('#fvBody');
      if (!reader || Date.now() - t0 > 120000) return clearInterval(iv);
      var law = typeof FV_LAST !== 'undefined' ? FV_LAST : null;
      if (!law || !body || !body.querySelector('.fv-meta')) return;
      clearInterval(iv);
      if (!(law.pdfUrl || law.linkOnly) || body.querySelector('#fv20src')) return;
      var u = law.pdfUrl || law.sourceUrl;
      body.insertAdjacentHTML('beforeend', '<section class="panel tp18" id="fv20src"><div class="panel-title"><span class="ic">' + ic('file') + '</span><h2>' + (law.pdfUrl ? 'ไฟล์ต้นฉบับจากหน่วยงานทางการ' : 'ตัวบทฉบับเต็มจากเว็บไซต์ทางการ') + '</h2></div>' +
        (law.pdfUrl ? '<div class="tp18-frame" id="fv20Frame"><button class="tp18-zoom" id="fv20Zoom" type="button" aria-label="ขยายเข้า">' + ic('maximize') + '<span>ขยายเข้า</span></button><iframe title="ไฟล์ต้นฉบับ" src="' + esc(tp18Src(u)) + '" loading="lazy" referrerpolicy="no-referrer"></iframe><div class="tp18-load">กำลังโหลดไฟล์ต้นฉบับ…</div></div>' : '') +
        '<ul class="tp18-links"><li><a href="' + esc(u) + '" target="_blank" rel="noopener">' + ic('external') + ' เปิดต้นฉบับจากเว็บไซต์ทางการ</a> <span class="muted small">· ' + esc(String(u).replace(/^https?:\/\/([^\/:]+).*$/, '$1')) + '</span></li></ul>' +
        '<p class="muted small tp18-cr">ลิขสิทธิ์และความถูกต้องของต้นฉบับเป็นของหน่วยงานเจ้าของเอกสาร เว็บไซต์คลังกฎหมายแสดงไฟล์จากแหล่งต้นทางโดยตรงและระบุที่มาไว้</p></section>');
      var fr = body.querySelector('#fv20Frame'), z = body.querySelector('#fv20Zoom');
      if (fr) { fr.querySelector('iframe').addEventListener('load', function () { fr.classList.add('ok'); }); setTimeout(function () { fr.classList.add('ok'); }, 8000); }
      if (z) z.onclick = function () { var on = !fr.classList.contains('full'); fr.classList.toggle('full', on); document.documentElement.classList.toggle('tp18-lock', on); z.innerHTML = ic(on ? 'minimize' : 'maximize') + '<span>' + (on ? 'ย่อออก' : 'ขยายเข้า') + '</span>'; };
    }, 400);
    return r;
  };
})();
/* ลบข้อความ “< target="_top"” ที่อาจหลุดมาเป็นตัวอักษรท้ายหน้า (เกิดจากการแปลงหน้าเว็บของ Apps Script) */
(function () {
  var clean = function () {
    try {
      var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n, bad = [];
      while ((n = w.nextNode())) { if (/^\s*<?\s*(base\s+)?target\s*=\s*["']?_top["']?\s*>?\s*$/i.test(n.nodeValue)) bad.push(n); }
      bad.forEach(function (x) { x.parentNode && x.parentNode.removeChild(x); });
    } catch (e) {}
  };
  clean(); if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', clean);
  window.addEventListener('load', clean); setTimeout(clean, 1500); setTimeout(clean, 5000);
  try { new MutationObserver(function (ms) { for (var i = 0; i < ms.length; i++) for (var j = 0; j < ms[i].addedNodes.length; j++) if (ms[i].addedNodes[j].nodeType === 3) return clean(); }).observe(document.body, { childList: true }); } catch (e) {}
})();
</script>
