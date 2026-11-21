<script>
/* ==========================================================================
   v11: เพิ่มเติม/แก้ไขเฉพาะจุดตามคำสั่ง — ไม่ลบข้อมูลกฎหมายหรือระบบเดิม
   ========================================================================== */

/* ---------- 1) ไม่มีการทดลองใช้งานแบบจำกัดวันหรือแพ็กเกจ/การชำระเงิน: ลบป้ายและข้อความที่สื่อถึงสิ่งเหล่านี้ ---------- */
var TRIAL_SENT_RE = /ระบบเปิดให้สมาชิกทดลองใช้งานครบทุกฟังก์ชันเป็นเวลา\s*7\s*วันนับแต่วันสมัครสมาชิก\s*/g;
function cleanTrialText(s) { return String(s || '').replace(TRIAL_SENT_RE, ''); }
(function () {
  function strip(root) {
    if (!root || !root.querySelectorAll) return;
    $$('.tag', root).forEach(function (t) { if (/ทดลองใช้|หมดระยะทดลอง|แพ็กเกจ|ชำระเงิน/.test(t.textContent)) t.remove(); });
    $$('p', root).forEach(function (p) { if (/สิทธิทดลองใช้งาน|ทดลองใช้ฟรี|ทดลองใช้งาน\s*เหลือ/.test(p.textContent) && p.textContent.length < 200) p.remove(); });
    $$('.es,.et,.toast .tb,.toast p', root).forEach(function (x) { if (TRIAL_SENT_RE.test(x.textContent)) { TRIAL_SENT_RE.lastIndex = 0; x.textContent = cleanTrialText(x.textContent); } TRIAL_SENT_RE.lastIndex = 0; });
    var ln = document.getElementById('lnPanel'); if (ln) ln.remove();   // ลบเฉพาะ “การแจ้งเตือนทาง LINE” ในหน้าโปรไฟล์
  }
  var q = false;
  new MutationObserver(function () { if (q) return; q = true; requestAnimationFrame(function () { q = false; strip(document.body); }); }).observe(document.documentElement, { childList: true, subtree: true });
  var baseAdd = addNotice;
  addNotice = function (n, silent) { if (n) { n.body = cleanTrialText(n.body); if (!String(n.body).trim() && n.id === 'ann-A1') return; } return baseAdd(n, silent); };
})();

/* ---------- 2) ป้ายพลิก: รัฐธรรมนูญ / พ.ร.ป. / พ.ร.บ.-พ.ร.ก. / ปร.-ปว.-คปค.-คสช. กลับมาใช้แบบเดียวกับประมวลกฎหมาย ---------- */
var FLIP_CATS = { 'ประมวลกฎหมาย': 1, 'รัฐธรรมนูญ': 1, 'พระราชบัญญัติประกอบรัฐธรรมนูญ': 1, 'พระราชบัญญัติ/พระราชกำหนด': 1 };   /* v13: ปร./ปว./คปค./คสช. แสดงแบบอ่านอย่างเดียว */
(function () {
  var rl = renderLaw, pt = printThaiLaw;
  renderLaw = function (box, l) { if (l && FLIP_CATS[l.cat] && l.cat !== 'ประมวลกฎหมาย') { var x = Object.assign({}, l, { cat: 'ประมวลกฎหมาย' }); return rl(box, x); } return rl(box, l); };
  printThaiLaw = function (l) { if (l && FLIP_CATS[l.cat] && l.cat !== 'ประมวลกฎหมาย') return pt(Object.assign({}, l, { cat: 'ประมวลกฎหมาย' })); return pt(l); };
})();

/* ---------- 3) กฎหมายลำดับรองและอื่น ๆ: ไม่แสดงป้าย “วรรค” / “อนุมาตรา” แสดงข้อความตามต้นฉบับ ---------- */
fvArticle = function (a, idx) {
  return '<article class="fv-art" data-ai="' + idx + '"><div class="fv-ah"><span class="secno">' + esc(a.no) + '</span><b>' + esc(a.cap) + '</b>' + (FV_CC === 'TH2' ? '' : '<button class="btn sm ghost" data-tr="' + idx + '">' + ic('globe') + ' แปลเป็นภาษาไทย</button>') + '</div>' +
    a.paras.map(function (p) { return '<p>' + esc(p.s) + '</p>' + p.items.map(function (it) { return fvItemPlain(it, 0); }).join(''); }).join('') + '<div class="fv-trans"></div></article>';
};

/* ---------- 4) จำนวนประเทศให้ตรงกับฐานข้อมูลจริงทุกจุด ---------- */
(function () {
  function fix(root) {
    var head = $$('.panel.flat .small b', root).filter(function (b) { return /กฎหมายต่างประเทศ\s*[\d,]+\s*ประเทศ/.test(b.textContent); })[0];
    if (!head) return;
    var n = +(head.textContent.match(/กฎหมายต่างประเทศ\s*([\d,]+)\s*ประเทศ/)[1].replace(/,/g, ''));
    var t = head.closest('.panel').querySelector('.tiny.muted');
    var txt = 'ฐานข้อมูลกฎหมายต่างประเทศ ' + fmtN(n) + ' ประเทศ' + (n === 196 ? ' = รัฐสมาชิกสหประชาชาติ 192 ประเทศ (ไม่รวมประเทศไทย) + รัฐผู้สังเกตการณ์ 2 ประเทศ (นครรัฐวาติกัน และปาเลสไตน์) + รัฐที่ได้รับการรับรองบางส่วน 2 ประเทศ (ไต้หวัน และคอซอวอ)' : '') + ' — ประเทศไทยแสดงแยกในหมวดกฎหมายประเทศไทย';
    if (t && t.textContent !== txt) t.textContent = txt;
  }
  new MutationObserver(function () { var b = document.getElementById('ctBody') || document.getElementById('view'); if (b) fix(b); }).observe(document.documentElement, { childList: true, subtree: true });
})();

/* ---------- 5) โหมดพิเศษจากระบบหลังบ้าน: ปิดปรับปรุงเฉพาะส่วน / ทดลองใช้งาน / ให้คะแนน ---------- */
var MODES = { sec: {}, guest: { active: false }, rating: { active: false }, seen: false };
var SEC_NAMES = { content: 'เนื้อหากฎหมายทั้งหมด', thai: 'กฎหมายประเทศไทย', foreign: 'กฎหมายต่างประเทศ', deka: 'คำพิพากษาศาลฎีกา', treaties: 'อนุสัญญาและสนธิสัญญา', tools: 'เครื่องมือ', ai: 'ผู้ช่วย AI', chat: 'แชทกับผู้ดูแลระบบ', horo: 'ดูดวง', rating: 'ให้คะแนนความประทับใจ', notes: 'สมุดบันทึก', saved: 'รายการบันทึก', history: 'ประวัติการอ่าน', time: 'เวลาการใช้งาน' };
function secName(k) { var p = String(k).split(':'); if (p[0] === 'thai' && p[1]) return 'กฎหมายประเทศไทย หมวด “' + p[1] + '”'; if (p[0] === 'foreign' && p[1]) { var c = (typeof WORLD !== 'undefined' && WORLD && WORLD.countries || []).filter(function (x) { return x.cc === p[1]; })[0]; return 'กฎหมายต่างประเทศ: ' + (c ? (c.th || c.name || p[1]) : p[1]); } return SEC_NAMES[k] || k; }
function secLookup(keys) { for (var i = 0; i < keys.length; i++) if (MODES.sec[keys[i]]) return [keys[i], MODES.sec[keys[i]]]; return null; }
function secPopup(key, d) {
  if (document.querySelector('.sm11')) return Promise.resolve(false);
  var row = function (l, v) { return v ? '<div class="pp-row"><b>' + esc(l) + '</b><span>' + esc(v) + '</span></div>' : ''; };
  return popup11({ cls: 'sm11', icon: 'wrench', tone: 'o', title: d.title || 'ขออภัยในความไม่สะดวก', sub: 'ส่วน “' + secName(key) + '” อยู่ระหว่างการปรับปรุงเนื้อหา',
    html: '<p>ขณะนี้ผู้ดูแลระบบกำลังดำเนินการปรับปรุงเนื้อหาในส่วน “' + esc(secName(key)) + '” เพื่อให้ข้อมูลกฎหมายมีความถูกต้อง ครบถ้วน และเป็นปัจจุบันตามแหล่งข้อมูลทางการ ระหว่างนี้จึงงดการเข้าถึงเนื้อหาในส่วนนี้เป็นการชั่วคราว ส่วนอื่นของเว็บไซต์ยังใช้งานได้ตามปกติ และข้อมูลบัญชี รายการบันทึก ประวัติการอ่าน และข้อมูลส่วนบุคคลของท่านยังคงได้รับการเก็บรักษาไว้ครบถ้วน</p>' +
      '<div class="pp-rows">' + row('ส่วนที่ปรับปรุง', secName(key)) + row('สาเหตุ', d.reason) + row('เริ่มปรับปรุง', d.start) + row('คาดว่าจะเปิดให้บริการ', d.end) + row('ข้อกฎหมาย/ระเบียบที่เกี่ยวข้อง', d.law) + '</div>' +
      '<p>การปรับปรุงเนื้อหาเป็นไปเพื่อให้ผู้ใช้งานได้รับข้อมูลที่ถูกต้องตามหลักการที่ว่ากฎหมายต้องประกาศให้ประชาชนทราบโดยทั่วกัน (กฎหมายมีผลใช้บังคับเมื่อประกาศในราชกิจจานุเบกษา) และหลักการคุ้มครองข้อมูลส่วนบุคคลตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 ซึ่งกำหนดให้ผู้ควบคุมข้อมูลดูแลข้อมูลให้ถูกต้อง เป็นปัจจุบัน และสมบูรณ์ ทั้งนี้ ข้อมูลในเว็บไซต์เป็นเพียงข้อมูลเพื่อการศึกษาค้นคว้า หากจำเป็นต้องใช้ตัวบทกฎหมายในระหว่างนี้ โปรดตรวจสอบจากราชกิจจานุเบกษา (ratchakitcha.soc.go.th) หรือสำนักงานคณะกรรมการกฤษฎีกา (krisdika.go.th)</p>' +
      '<p>เมื่อการปรับปรุงแล้วเสร็จ ส่วนนี้จะเปิดให้ใช้งานได้ทันทีโดยอัตโนมัติ ท่านไม่จำเป็นต้องโหลดหน้าเว็บใหม่ ขออภัยในความไม่สะดวกมา ณ โอกาสนี้ หากมีข้อสงสัย สามารถติดต่อผู้ดูแลระบบได้ที่ thailawlibrary.official@gmail.com</p>',
    ok: 'ตกลง', cancel: 'ยกเลิก' });
}
function secBlocked(keys) { var hit = secLookup(keys); if (hit) { secPopup(hit[0], hit[1]); return true; } return false; }
/* นำทางไปยังส่วนที่ปิดปรับปรุง → แสดงป๊อปอัปแทน */
(function () {
  var baseNav = nav;
  nav = function (view, opt) {
    var keys = view === 'content' ? ['content'] : [view];
    if (S.token && secBlocked(keys)) { $$('.tab[data-tab]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === S.ui.view); }); return; }
    return baseNav.apply(this, arguments);
  };
})();
document.addEventListener('click', function (e) {
  if (!S.token || !e.target.closest) return;
  var t = e.target.closest('[data-cat],[data-scope],[data-fc],[data-fgp],[data-nat]'); if (!t) return;
  var keys = ['content'];
  if (t.hasAttribute('data-cat')) keys.push('thai', 'thai:' + t.getAttribute('data-cat'));
  else if (t.hasAttribute('data-scope')) keys.push(t.getAttribute('data-scope') === 'fg' ? 'foreign' : 'thai');
  else if (t.hasAttribute('data-fc')) keys.push('foreign', 'foreign:' + t.getAttribute('data-fc'));
  else if (t.hasAttribute('data-fgp')) keys.push('foreign');
  else if (t.hasAttribute('data-nat')) keys.push('thai');
  if (secBlocked(keys)) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }
}, true);
/* ผู้ดูแลเพิ่งปิดปรับปรุงส่วนที่ผู้ใช้เปิดอยู่ → แจ้งทันทีและออกจากส่วนนั้นโดยไม่ขึ้นหน้าขาว */
function secCheckCurrent() {
  if (!S.token || !S.ui) return;
  var v = S.ui.view, st = S.ui.content || {};
  var keys = [v];
  if (v === 'content') { keys = ['content']; if (st.scope === 'fg' || st.foreign) { keys.push('foreign'); if (st.fc) keys.push('foreign:' + st.fc); } else { keys.push('thai'); if (st.cat) keys.push('thai:' + st.cat); } }
  var hit = secLookup(keys); if (!hit) return;
  if (document.querySelector('.sm11')) return;
  if (hit[0] === v || hit[0] === 'content') { try { closeFocus(); } catch (e) {} nav('home', { noAnim: true }); }
  else if (/^thai:/.test(hit[0])) { st.cat = ''; st.law = ''; store.set('ui', S.ui); try { closeFocus(); } catch (e) {} bgRefresh(true); }
  else if (/^foreign:/.test(hit[0])) { st.fc = ''; store.set('ui', S.ui); try { $$('.fv-reader').forEach(function (x) { x.remove(); }); syncScrollLock(); } catch (e) {} bgRefresh(true); }
  else { st.cat = ''; st.fc = ''; st.law = ''; store.set('ui', S.ui); try { closeFocus(); $$('.fv-reader').forEach(function (x) { x.remove(); }); syncScrollLock(); } catch (e) {} bgRefresh(true); }
  secPopup(hit[0], hit[1]);
}
function applyModes(m) {
  if (!m) return;
  var prevG = MODES.guest.active, prevR = MODES.rating.active, prevSec = JSON.stringify(MODES.sec);
  MODES.sec = m.sec || {}; MODES.guest = m.guest || { active: false }; MODES.rating = m.rating || { active: false }; MODES.seen = true;
  if (JSON.stringify(MODES.sec) !== prevSec) secCheckCurrent();
  if (MODES.rating.active !== prevR || !document.getElementById('btnRate') === !!MODES.rating.active) ratingUi();
  if (isGuest() && !MODES.guest.active) guestEnd('สิ้นสุดช่วงทดลองใช้งาน', 'ผู้ดูแลระบบปิดโหมดทดลองใช้งานแล้ว กรุณาสมัครสมาชิกหรือเข้าสู่ระบบเพื่อใช้งานต่อ');
  if (!S.token && MODES.guest.active && !prevG) guestOffer();
}
(function () {
  var baseApi = api;
  api = function (action, payload, opt) {
    return baseApi(action, payload, opt).then(function (r) { if (r && r.modes && (action === 'ping' || action === 'pulse')) { try { applyModes(r.modes); } catch (e) {} } return r; });
  };
})();
/* หน้าสาธารณะ (ยังไม่เข้าสู่ระบบ): ตรวจโหมดทดลองใช้งานทุก 5 วินาที */
setInterval(function () { if (!S.token && !BLOCK_SHOWN && !MAINT.on && document.visibilityState === 'visible') api('ping', {}, { noRetry: true, timeout: 10000, silent: true }).catch(function () {}); }, 5000);

/* ---------- ป๊อปอัปมาตรฐาน v11: เลื่อนภายนอกเท่านั้น (ทั้งหน้าป๊อปอัปเลื่อน ไม่มีกล่องเลื่อนซ้อนด้านใน) ---------- */
function popup11(o) {
  return new Promise(function (resolve) {
    var scrim = openScrim(function () {});
    var wrap = h('<div class="modal-wrap p11-wrap ' + (o.cls || '') + '" role="dialog" aria-modal="true"></div>');
    wrap.innerHTML = '<div class="modal p11"><button class="icon-btn p11-x" data-x aria-label="ปิด">' + ic('x') + '</button>' +
      '<div class="p11-head"><span class="mic ' + (o.tone || '') + '">' + ic(o.icon || 'info') + '</span><div><h3>' + esc(o.title) + '</h3>' + (o.sub ? '<div class="muted small">' + esc(o.sub) + '</div>' : '') + '</div></div>' +
      '<div class="p11-body">' + o.html + '</div>' +
      '<div class="p11-actions' + (o.center ? ' center' : '') + '">' + (o.cancel ? '<button class="btn" data-c>' + esc(o.cancel) + '</button>' : '') + '<button class="btn k" data-ok>' + ic('check') + ' ' + esc(o.ok || 'ตกลง') + '</button></div></div>';
    document.getElementById('layer').appendChild(wrap);
    var m = wrap.firstChild; requestAnimationFrame(function () { m.classList.add('on'); });
    wrap.scrollTop = 0;
    var fin = false;
    function done(v) { if (fin) return; fin = true; m.classList.remove('on'); closeScrim(scrim); setTimeout(function () { wrap.remove(); syncScrollLock(); }, 250); resolve(v); }
    wrap.querySelector('[data-x]').onclick = function () { done(false); };
    var c = wrap.querySelector('[data-c]'); if (c) c.onclick = function () { done(false); };
    wrap.querySelector('[data-ok]').onclick = function () { done(true); };
    syncScrollLock();
  });
}

/* ---------- 6) ทดลองใช้งานโดยไม่ต้องเข้าสู่ระบบ (เปิดได้เฉพาะผู้ดูแลระบบจากหลังบ้าน) ---------- */
var GUEST_ID_FE = 'GUEST-TRIAL', GUEST_ASKED = false;
function isGuest() { return !!(S.member && S.member.memberId === GUEST_ID_FE); }
var GUEST_TERMS = [
  ['วัตถุประสงค์ของการเปิดทดลองใช้งาน', 'ผู้ดูแลระบบเปิดให้บุคคลทั่วไปทดลองใช้งานเว็บไซต์ “คลังกฎหมาย” ได้โดยไม่ต้องสมัครสมาชิกหรือใส่รหัสผ่าน ภายในช่วงเวลาที่ผู้ดูแลระบบกำหนด เพื่อให้ผู้สนใจได้ทดลองค้นหาและอ่านตัวบทกฎหมายไทย กฎหมายต่างประเทศ คำพิพากษาศาลฎีกา และอนุสัญญาระหว่างประเทศ ก่อนตัดสินใจสมัครสมาชิก และเพื่อรับฟังความคิดเห็นในการพัฒนาระบบก่อนเปิดให้บริการจริง เมื่อสิ้นสุดช่วงเวลาที่กำหนด หรือเมื่อผู้ดูแลระบบปิดโหมดนี้ การทดลองใช้งานจะสิ้นสุดลงโดยอัตโนมัติทันที'],
  ['ขอบเขตการใช้งาน', 'ผู้ทดลองใช้งานอ่าน ค้นหา และพิมพ์เนื้อหากฎหมายได้ แต่ไม่สามารถแก้ไขข้อมูลบัญชี ส่งแชทถึงผู้ดูแลระบบ หรือบันทึกข้อมูลส่วนตัวถาวรได้ เนื่องจากเป็นบัญชีกลางที่ไม่มีข้อมูลส่วนบุคคล รายการที่บันทึกระหว่างทดลองใช้งานจะเก็บไว้เฉพาะในอุปกรณ์ของท่านเท่านั้น'],
  ['ข้อมูลที่ระบบบันทึก', 'เพื่อความปลอดภัยของระบบ เว็บไซต์บันทึกข้อมูลการเข้าใช้งานทางเทคนิค ได้แก่ วันเวลา ประเภทอุปกรณ์ ระบบปฏิบัติการ เบราว์เซอร์ และหมายเลขไอพีโดยประมาณ ตามความจำเป็นในการรักษาความมั่นคงปลอดภัยของระบบ ซึ่งเป็นฐานทางกฎหมายตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 มาตรา 24 (5) (ประโยชน์โดยชอบด้วยกฎหมาย) ข้อมูลดังกล่าวไม่เปิดเผยแก่บุคคลภายนอก เว้นแต่มีกฎหมายกำหนด ท่านมีสิทธิตามมาตรา 30 ถึงมาตรา 36 แห่งพระราชบัญญัติดังกล่าว'],
  ['ข้อห้ามและความรับผิดทางกฎหมาย', 'ห้ามเข้าถึงระบบคอมพิวเตอร์หรือข้อมูลคอมพิวเตอร์ที่มีมาตรการป้องกันการเข้าถึงโดยมิชอบ (พระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ พ.ศ. 2550 มาตรา 5 และมาตรา 7) ห้ามรบกวนหรือทำให้ระบบไม่สามารถทำงานตามปกติ (มาตรา 10) ห้ามนำเข้าสู่ระบบคอมพิวเตอร์ซึ่งข้อมูลอันเป็นเท็จในลักษณะที่น่าจะเกิดความเสียหาย (มาตรา 14) และห้ามคัดลอกเนื้อหาเพื่อแสวงหาประโยชน์ในเชิงพาณิชย์โดยละเมิดสิทธิของผู้อื่นตามพระราชบัญญัติลิขสิทธิ์ พ.ศ. 2537 ทั้งนี้ ตัวบทกฎหมาย คำพิพากษา และประกาศทางราชการ ไม่ถือเป็นงานอันมีลิขสิทธิ์ตามมาตรา 7 แห่งพระราชบัญญัติลิขสิทธิ์ พ.ศ. 2537'],
  ['ความถูกต้องของข้อมูล', 'ข้อมูลกฎหมายในเว็บไซต์รวบรวมจากแหล่งข้อมูลทางการและชุดข้อมูลเปิด เพื่อการศึกษาและค้นคว้าเท่านั้น มิใช่คำปรึกษาทางกฎหมาย หากนำไปใช้ในการปฏิบัติงาน การดำเนินคดี หรือการสอบ โปรดตรวจสอบตัวบทฉบับล่าสุดกับราชกิจจานุเบกษาและสำนักงานคณะกรรมการกฤษฎีกา เนื่องจากกฎหมายมีผลใช้บังคับตามที่ประกาศในราชกิจจานุเบกษา'],
  ['การสิ้นสุดและการใช้งานต่อ', 'เมื่อกด “ยอมรับ” ถือว่าท่านได้อ่านและยอมรับข้อกำหนดนี้ ท่านสามารถกลับไปยังหน้าเว็บไซต์หลักเพื่อสมัครสมาชิกหรือเข้าสู่ระบบได้ตลอดเวลาโดยกดปุ่ม “เข้าสู่หน้าเว็บไซต์หลัก” ที่มุมขวาบน ผู้ดูแลระบบสงวนสิทธิ์ในการปิดโหมดทดลองใช้งานได้ทุกเมื่อเพื่อความปลอดภัยของระบบ']
];
function guestOffer() {
  if (GUEST_ASKED || S.token || BLOCK_SHOWN || MAINT.on || !MODES.guest.active || document.querySelector('.p11-wrap')) return;
  GUEST_ASKED = true;
  var g = MODES.guest;
  popup11({ cls: 'gs11', icon: 'sparkle', title: g.title || 'เปิดทดลองใช้งานเว็บไซต์โดยไม่ต้องเข้าสู่ระบบ', sub: g.to ? 'เปิดให้ทดลองถึง ' + fmtDateTime(g.to) : 'ช่วงเวลาตามที่ผู้ดูแลระบบกำหนด', center: true, ok: 'ยอมรับ',
    html: (g.message ? '<p>' + esc(g.message).replace(/\n/g, '<br>') + '</p>' : '') + GUEST_TERMS.map(function (t, i) { return '<section><h4>' + (i + 1) + '. ' + esc(t[0]) + '</h4><p>' + esc(t[1]) + '</p></section>'; }).join('') })
    .then(function (ok) { if (ok) guestStart(); });
}
function guestStart() {
  if (S.token) return;
  withLoading('กำลังเปิดโหมดทดลองใช้งาน', clientInfo().catch(function () { return {}; }).then(function (info) { return api('guestStart', { info: info }); })).then(function (r) {
    S.token = r.token; S.member = r.member; store.set('token', r.token); store.set('member', r.member); store.set('tempSession', true); try { sessionStorage.setItem('tll.temp', '1'); } catch (e) {}
    loadLocalUD(); document.body.classList.add('guest');
    renderApp(); nav('content', { noAnim: true }); startHeartbeat();
    toast('เข้าสู่โหมดทดลองใช้งาน', 'อ่านและค้นหาเนื้อหากฎหมายได้ทันที', 'ok');
  }).catch(function (e) { toast('ยังไม่สามารถทดลองใช้งานได้', (e && e.msg) || '', 'warn'); GUEST_ASKED = false; });
}
function guestEnd(t, b) {
  if (!isGuest()) return;
  try { api('logout', {}, { noRetry: true, silent: true }).catch(function () {}); } catch (e) {}
  clearSession(); store.del('tempSession'); document.body.classList.remove('guest');
  try { closeFocus(); $$('.fv-reader,.tr11').forEach(function (x) { x.remove(); }); var ly = document.getElementById('layer'); if (ly) ly.innerHTML = ''; syncScrollLock(); } catch (e) {}
  renderWelcome(); if (t) toast(t, b || '', 'warn');
}
(function () {
  var baseExp = sessionExpired;
  sessionExpired = function () { if (isGuest()) return guestEnd('สิ้นสุดช่วงทดลองใช้งาน', 'กรุณาสมัครสมาชิกหรือเข้าสู่ระบบเพื่อใช้งานต่อ'); return baseExp.apply(this, arguments); };
  var baseGeo = geoAskFlow; geoAskFlow = function () { if (isGuest()) return; return baseGeo.apply(this, arguments); };
  ['renderWelcome', 'renderLogin'].forEach(function (fn) { var f = window[fn]; window[fn] = function () { var r = f.apply(this, arguments); setTimeout(guestOffer, 400); return r; }; });
})();

/* ---------- 7) ส่วนหัว: ปุ่มขยาย/ย่อ (โฟกัสเฉพาะเนื้อหา) · ปุ่มให้คะแนน · ปุ่มเข้าสู่หน้าเว็บไซต์หลัก (โหมดทดลอง) ---------- */
function setFocusMode(on) {
  document.body.classList.toggle('focus11', !!on);
  var b = document.getElementById('btnFocus'); if (b) { b.innerHTML = ic(on ? 'minimize' : 'maximize'); b.setAttribute('aria-label', on ? 'ย่อออก' : 'ขยายเข้า'); }
  var x = document.getElementById('focusExit');
  if (on && !x) { x = h('<button class="focus-exit" id="focusExit" aria-label="ย่อออก">' + ic('minimize') + '<span>ย่อออก</span></button>'); document.body.appendChild(x); x.onclick = function () { setFocusMode(false); }; }
  if (!on && x) x.remove();
  var cf = document.getElementById('chFocus'); if (cf) { cf.innerHTML = ic(on ? 'minimize' : 'maximize') + '<span>' + (on ? 'ย่อออก' : 'ขยายเข้า') + '</span>'; }
  try { moveIndicator(); } catch (e) {}
}
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.body.classList.contains('focus11') && !document.querySelector('#layer .modal-wrap')) setFocusMode(false); });
(function () {
  var baseApp = renderApp;
  renderApp = function () {
    var r = baseApp.apply(this, arguments);
    var head = document.querySelector('.app-head .wrap'), srch = document.getElementById('btnSearch');
    if (head && srch && !document.getElementById('btnFocus')) {
      var fb = h('<button class="icon-btn" id="btnFocus" aria-label="ขยายเข้า" title="ขยายเข้า/ย่อออก (โฟกัสเฉพาะเนื้อหา)">' + ic('maximize') + '</button>');
      head.insertBefore(fb, srch); fb.onclick = function () { setFocusMode(!document.body.classList.contains('focus11')); };
    }
    document.body.classList.toggle('guest', isGuest());
    if (isGuest() && head && !document.getElementById('btnMainSite')) {
      var gb = h('<button class="btn sm k" id="btnMainSite">' + ic('home') + '<span>เข้าสู่หน้าเว็บไซต์หลัก</span></button>');
      head.appendChild(gb); gb.onclick = function () { guestEnd('', ''); };
    }
    setFocusMode(false); ratingUi();
    return r;
  };
  if (store.get('member', null) && (store.get('member', {}) || {}).memberId === GUEST_ID_FE) document.body.classList.add('guest');
})();

/* ---------- 8) ให้คะแนนความประทับใจ (เปิดจากระบบหลังบ้าน) ---------- */
var RATE_LABEL = ['', 'ควรปรับปรุงอย่างมาก', 'ควรปรับปรุง', 'พอใช้', 'ดี', 'ดีมาก ประทับใจที่สุด'];
function ratingUi() {
  var srch = document.getElementById('btnSearch'), b = document.getElementById('btnRate');
  var on = !!(MODES.rating.active && S.token);
  if (on && !b && srch) {
    b = h('<button class="icon-btn" id="btnRate" aria-label="ให้คะแนนความประทับใจ" title="ให้คะแนนความประทับใจ">' + ic('star') + '</button>');
    srch.parentNode.insertBefore(b, srch.nextSibling); b.onclick = function () { nav('rating'); };
    var k = 'tll.rate11.' + ((S.member && S.member.memberId) || '');
    var seen = false; try { seen = sessionStorage.getItem(k) === '1'; } catch (e) {}
    if (!seen) { try { sessionStorage.setItem(k, '1'); } catch (e) {} setTimeout(ratingIntro, 900); }
  }
  if (!on && b) b.remove();
  if (!on && S.ui && S.ui.view === 'rating') nav('home', { noAnim: true });
}
function ratingIntro() {
  if (document.querySelector('.p11-wrap') || !MODES.rating.active) return;
  popup11({ cls: 'rt11', icon: 'star', title: 'ขอเชิญประเมินความประทับใจต่อเว็บไซต์ “คลังกฎหมาย”', sub: 'ความคิดเห็นของท่านช่วยพัฒนาระบบก่อนเปิดให้บริการจริง', ok: 'ไปให้คะแนน', cancel: 'ไว้ภายหลัง',
    html: (MODES.rating.message ? '<p>' + esc(MODES.rating.message).replace(/\n/g, '<br>') + '</p>' : '') +
      '<p>ท่านสามารถให้คะแนนความประทับใจตั้งแต่ 1 ถึง 5 ดาว พร้อมพิมพ์ความคิดเห็นหรือข้อเสนอแนะได้ไม่จำกัดความยาว ผ่านปุ่มรูปดาวที่อยู่ข้างปุ่มค้นหาด้านบน คะแนนและความคิดเห็นจะส่งถึงระบบหลังบ้านของผู้ดูแลทันที และแสดงคะแนนเฉลี่ยพร้อมความคิดเห็นของผู้ใช้งานรายอื่น (แสดงชื่อแบบปกปิดบางส่วน) เพื่อความโปร่งใส</p>' +
      '<p>ขอความร่วมมือแสดงความคิดเห็นด้วยถ้อยคำสุภาพ ไม่ระบุข้อมูลส่วนบุคคลของตนเองหรือผู้อื่น ไม่หมิ่นประมาทผู้ใด (ประมวลกฎหมายอาญา มาตรา 326 และมาตรา 328) และไม่นำเข้าข้อมูลอันเป็นเท็จสู่ระบบคอมพิวเตอร์ (พระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ พ.ศ. 2550 มาตรา 14) ข้อมูลการประเมินจะใช้เพื่อการพัฒนาบริการเท่านั้นตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562</p>' })
    .then(function (ok) { if (ok) nav('rating'); });
}
var RT11 = { timer: null, stars: 0, data: null, prev: 'home' };
VIEWS.rating = function (el) {
  setFocusMode(true);
  el.innerHTML = '<section class="rate11"><div class="r-head"><div class="grow"><h2>' + ic('star') + ' ให้คะแนนความประทับใจ</h2><p class="muted small">ความคิดเห็นของท่านส่งถึงผู้ดูแลระบบทันที</p></div><button class="icon-btn" id="rtClose" aria-label="ปิด">' + ic('x') + '</button></div>' +
    '<div class="panel r-sum" id="rtSum"><p class="muted small">กำลังโหลดคะแนน…</p></div>' +
    '<div class="panel r-form"><h3>คะแนนของท่าน</h3><div class="r-stars" id="rtStars" role="radiogroup" aria-label="เลือกจำนวนดาว">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" class="r-star" data-st="' + n + '" role="radio" aria-label="' + n + ' ดาว ' + RATE_LABEL[n] + '">' + ic('star') + '<span>' + n + '</span></button>'; }).join('') + '</div>' +
    '<div class="r-lab" id="rtLab">แตะดาวเพื่อเลือกคะแนน</div>' +
    '<div class="field"><label for="rtText">ความคิดเห็นเพิ่มเติม (ไม่บังคับ)</label><textarea id="rtText" rows="3" placeholder="เล่าความประทับใจหรือข้อเสนอแนะ พิมพ์ได้ไม่จำกัดความยาว"></textarea></div>' +
    '<button class="btn lg k block" id="rtSend">' + ic('send') + ' ส่งคะแนน</button></div>' +
    '<div class="r-list" id="rtList"></div></section>';
  var ta = $('#rtText', el), grow = function () { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
  ta.addEventListener('input', grow);
  var pick = function (n) { RT11.stars = n; $$('.r-star', el).forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-st') <= n); b.setAttribute('aria-checked', String(+b.getAttribute('data-st') === n)); }); $('#rtLab', el).textContent = n + ' ดาว — ' + RATE_LABEL[n]; };
  on($('#rtStars', el), 'click', '[data-st]', function (e, b) { pick(+b.getAttribute('data-st')); });
  if (RT11.stars) pick(RT11.stars);
  $('#rtClose', el).onclick = function () { setFocusMode(false); nav(RT11.prev && RT11.prev !== 'rating' ? RT11.prev : 'home'); };
  $('#rtSend', el).onclick = function () {
    if (!RT11.stars) { toast('กรุณาเลือกจำนวนดาว', 'แตะดาว 1–5 ดวงก่อนส่ง', 'warn'); return; }
    var item = { id: 'tmp' + uid(), time: new Date().toISOString(), name: 'ท่าน', stars: RT11.stars, text: ta.value.trim(), mine: true, pending: true };
    if (RT11.data) { RT11.data.items.unshift(item); ratingDraw(); }
    var payload = { stars: RT11.stars, text: ta.value.trim(), cid: uid() + uid(), device: deviceInfo().device };
    ta.value = ''; grow();
    var tries = 0;
    (function send() {
      api('ratingSend', payload, { noRetry: true, timeout: 20000 }).then(function (r) { item.pending = false; item.id = r.id; ratingDraw(); toast('ส่งคะแนนแล้ว', 'ขอบคุณสำหรับความคิดเห็นของท่าน', 'ok'); ratingLoad(); })
        .catch(function (e) { if (e && /RATING_OFF|BAD_STARS|REJECTED/.test(e.code)) { item.failed = true; ratingDraw(); toast('ส่งคะแนนไม่สำเร็จ', e.msg, 'bad'); return; } if (++tries < 6) setTimeout(send, 400 * tries); else { item.failed = true; ratingDraw(); } });
    })();
  };
  ratingLoad();
};
function ratingLoad() {
  clearTimeout(RT11.timer);
  if (!S.ui || S.ui.view !== 'rating') return;
  api('ratingList', {}, { noRetry: true, timeout: 15000, silent: true }).then(function (r) {
    var pend = RT11.data ? RT11.data.items.filter(function (x) { return x.pending || x.failed; }) : [];
    RT11.data = r; r.items = pend.concat(r.items); ratingDraw();
  }).catch(function () {}).then(function () { if (S.ui.view === 'rating') RT11.timer = setTimeout(ratingLoad, 3000); });
}
function starRow(n) { var s = ''; for (var i = 1; i <= 5; i++) s += '<span class="sr ' + (i <= Math.round(n) ? 'on' : '') + '">' + ic('star') + '</span>'; return '<span class="srow">' + s + '</span>'; }
function ratingDraw() {
  var d = RT11.data, sum = document.getElementById('rtSum'), list = document.getElementById('rtList'); if (!d || !sum || !list) return;
  var mx = Math.max.apply(null, d.dist.concat([1]));
  sum.innerHTML = '<div class="r-avg"><b>' + (d.avg ? d.avg.toFixed(2) : '0.00') + '</b>' + starRow(d.avg) + '<span class="muted small">จาก ' + fmtN(d.count) + ' การประเมิน</span></div><div class="r-dist">' + [5, 4, 3, 2, 1].map(function (n) { var c = d.dist[n - 1] || 0; return '<div class="r-bar"><span>' + n + ' ดาว</span><i><em style="width:' + Math.round(c / mx * 100) + '%"></em></i><span>' + fmtN(c) + '</span></div>'; }).join('') + '</div>';
  var html = d.items.length ? d.items.map(function (x) { return '<div class="panel r-item' + (x.mine ? ' mine' : '') + '"><div class="r-ih"><b>' + esc(x.mine ? 'ท่าน' : x.name) + '</b>' + starRow(x.stars) + '<span class="muted tiny">' + fmtDateTime(x.time) + (x.failed ? ' · ส่งไม่สำเร็จ' : '') + '</span></div>' + (x.text ? '<div class="r-text">' + esc(x.text).replace(/\n/g, '<br>') + '</div>' : '') + '</div>'; }).join('') : '<div class="panel"><div class="empty"><div class="eic">' + ic('star') + '</div><h3>ยังไม่มีการประเมิน</h3><p>ร่วมเป็นคนแรกที่ให้คะแนนความประทับใจ</p></div></div>';
  if (list.getAttribute('data-h') !== hashStr(html)) { list.setAttribute('data-h', hashStr(html)); list.innerHTML = '<h3 class="r-lh">ความคิดเห็นจากผู้ใช้งาน</h3>' + html; }
}
(function () {
  var baseNav = nav;
  nav = function (view, opt) {
    if (view === 'rating' && S.ui && S.ui.view !== 'rating') RT11.prev = S.ui.view;
    if (S.ui && S.ui.view === 'rating' && view !== 'rating') { clearTimeout(RT11.timer); setFocusMode(false); }
    return baseNav.apply(this, arguments);
  };
})();

/* ---------- 9) แชท: ส่งทันที (ไม่ต้องรอข้อความก่อนหน้า) · ตัวเลขข้อความผู้ดูแลที่ยังไม่อ่านที่ปุ่มแชท · ปุ่มขยาย/ย่อ ---------- */
var CH11 = { syncT: null };
chatFlush = function () {
  if (!S.token) return;
  CHAT.outbox.forEach(function (m) {
    if (m._inflight) return; m._inflight = true;
    var msg = CHAT.msgs.filter(function (x) { return x.cid === m.cid; })[0] || m, tries = 0;
    msg.status = 'pending';
    (function send() {
      api('chatSend', { text: m.text, cid: m.cid }, { noRetry: true, timeout: 15000 }).then(function (r) {
        CHAT.outbox = CHAT.outbox.filter(function (x) { return x.cid !== m.cid; });
        msg.id = r.id; msg.status = 'sent'; chatSaveLocal(); chatDraw(false);
        clearTimeout(CH11.syncT); CH11.syncT = setTimeout(function () { api('chatSync', {}, { noRetry: true, silent: true, timeout: 30000 }).then(function () { CHAT.poke(); }).catch(function () {}); }, 150);
      }).catch(function (e) {
        if (e && /EMPTY|TOO_LONG|REJECTED|GUEST_ONLY/.test(e.code)) { CHAT.outbox = CHAT.outbox.filter(function (x) { return x.cid !== m.cid; }); msg.status = 'failed'; m._inflight = false; chatSaveLocal(); chatDraw(false); toast('ส่งข้อความไม่สำเร็จ', e.msg, 'bad'); return; }
        tries++;
        if (tries < 8) setTimeout(send, Math.min(300 * tries, 2500));   // เน็ตช้า/สะดุด: ส่งซ้ำอัตโนมัติ (ระบบกันข้อความซ้ำด้วยรหัสข้อความ)
        else { m._inflight = false; msg.status = 'failed'; chatSaveLocal(); chatDraw(false); }
      });
    })();
  });
  chatSaveLocal(); chatDraw(true);
};
chatDraw = function (stick) {
  var log = document.getElementById('chLog'); if (!log) return;
  var near = log.scrollHeight - log.scrollTop - log.clientHeight < 80, day = '';
  var html = CHAT.msgs.length ? CHAT.msgs.map(function (m) {
    var d = fmtDate(m.time), sep = d !== day ? '<div class="ch-day"><span>' + esc(d) + '</span></div>' : ''; day = d;
    var me = m.sender === 'member';
    var st = me ? (m.status === 'failed' ? '<button class="ch-st bad" data-retry>' + ic('alert') + ' แตะเพื่อส่งอีกครั้ง</button>' : m.status === 'pending' ? '' : '<span class="ch-st">' + ic('check') + (m.status === 'ส่งถึงผู้ดูแลแล้ว' || m.delivered ? ' ถึงผู้ดูแลแล้ว' : ' ส่งแล้ว') + '</span>') : '';
    return sep + '<div class="ch-msg ' + (me ? 'me' : 'adm') + (m.status === 'pending' ? ' pend' : '') + '">' + (me ? '' : '<div class="ch-who">' + ic('shieldCheck') + ' ' + esc(m.adminName || 'ผู้ดูแลระบบ') + '</div>') + '<div class="ch-bub">' + esc(m.text).replace(/\n/g, '<br>') + '</div><div class="ch-meta">' + fmtTime(m.time) + ' ' + st + '</div></div>';
  }).join('') : '<div class="empty"><div class="eic">' + ic('chat') + '</div><h3>เริ่มสนทนากับผู้ดูแลระบบ</h3><p>พิมพ์คำถาม ข้อร้องเรียน หรือแจ้งปัญหาการใช้งานได้ที่ช่องด้านล่าง</p></div>';
  if (log.getAttribute('data-h') === hashStr(html)) return;
  log.setAttribute('data-h', hashStr(html)); log.innerHTML = html;
  if (stick || near) log.scrollTop = log.scrollHeight;
};
(function () {
  var baseMerge = chatMerge;
  chatMerge = function (list) {
    var ch = false;
    (list || []).forEach(function (x) { if (x.sender !== 'member') return; var m = CHAT.msgs.filter(function (y) { return y.id === x.id; })[0]; if (m && x.status === 'ส่งถึงผู้ดูแลแล้ว' && !m.delivered) { m.delivered = true; ch = true; } });
    return baseMerge(list) || ch;
  };
  var baseView = VIEWS.chat;
  VIEWS.chat = function (el) {
    baseView(el);
    var head = $('.ch-head', el);
    if (head && !$('#chFocus', el)) {
      var b = h('<button class="btn sm" id="chFocus" aria-label="ขยายเข้า">' + ic(document.body.classList.contains('focus11') ? 'minimize' : 'maximize') + '<span>' + (document.body.classList.contains('focus11') ? 'ย่อออก' : 'ขยายเข้า') + '</span></button>');
      head.insertBefore(b, $('#chRules', el)); b.onclick = function () { setFocusMode(!document.body.classList.contains('focus11')); var log = $('#chLog'); if (log) log.scrollTop = log.scrollHeight; };
    }
    chatMarkRead();
  };
})();
var CHAT_ADMIN = [];
function chatUnread() { var seen = store.get('chatSeen', '') || ''; return CHAT_ADMIN.filter(function (x) { return x[1] > seen; }).length; }
function chatMarkRead() { var last = ''; CHAT_ADMIN.forEach(function (x) { if (x[1] > last) last = x[1]; }); CHAT.msgs.forEach(function (m) { if (m.sender === 'admin' && m.time > last) last = m.time; }); if (last && last > (store.get('chatSeen', '') || '')) store.set('chatSeen', last); setChatBadge(); }
function setChatBadge() {
  var b = document.querySelector('.tab[data-tab="chat"]'); if (!b) return;
  var d = b.querySelector('.chat-dot'); if (d) d.remove();
  var n = S.ui && S.ui.view === 'chat' ? 0 : chatUnread(), c = b.querySelector('.chat-cnt');
  if (n && !c) { c = document.createElement('span'); c.className = 'chat-cnt'; b.appendChild(c); }
  if (c) { if (n) { c.textContent = n > 99 ? '99+' : String(n); c.setAttribute('aria-label', 'ข้อความใหม่จากผู้ดูแลระบบ ' + n + ' ข้อความ'); } else c.remove(); }
}
setChatDot = function () { setChatBadge(); };
markChatDot = function () {};
(function () {
  var baseApply = rtApply;
  rtApply = function (r) {
    if (r && r.chat && Array.isArray(r.chat.admin)) { CHAT_ADMIN = r.chat.admin; if (S.ui && S.ui.view === 'chat') { chatMarkRead(); CHAT.poke(); } }
    var x = baseApply(r); setChatBadge(); return x;
  };
  /* ข้อความแชทจากผู้ดูแล (MSG-) นับที่ปุ่มแชทด้านล่างเท่านั้น ไม่นับในกล่องแจ้งเตือนมุมขวาบน */
  unreadCount = function () { if (!S.ud) return 0; return S.ud.notices.filter(function (n) { return !S.ud.readNotices[n.id] && !/^MSG-/.test(String(n.id || '')); }).length; };
  var baseTabs = renderHeaderBits; renderHeaderBits = function () { var r = baseTabs.apply(this, arguments); setChatBadge(); return r; };
})();

/* ---------- 10) หน้าการแจ้งเตือน: ปุ่มรีเฟรช ดึงการแจ้งเตือนใหม่ทันที ---------- */
(function () {
  var base = VIEWS.notifications;
  VIEWS.notifications = function (el) {
    base(el);
    var add = function () {
      var row = el.querySelector('.view-head .row'); if (!row || $('#nfRefresh', el)) return;
      var b = h('<button class="btn sm" id="nfRefresh" aria-label="รีเฟรชการแจ้งเตือน">' + ic('refresh') + ' รีเฟรช</button>');
      row.insertBefore(b, row.firstChild);
      b.onclick = function () {
        b.disabled = true; b.classList.add('spin11');
        Promise.all([api('pulse', { act: 1 }, { noRetry: true, timeout: 15000 }).then(rtApply).catch(function () {}), bootstrap(false)]).then(function () {
          renderView('notifications', { noAnim: true, keepScroll: true }); toast('อัปเดตการแจ้งเตือนล่าสุดแล้ว', '', 'ok');
        });
      };
    };
    add();
    new MutationObserver(add).observe(el, { childList: true, subtree: true });
  };
})();

/* ---------- 11) อนุสัญญา/สนธิสัญญา: อ่านภายในเว็บไซต์ (อ่านอย่างเดียว) + แปลภาษา + พิมพ์ PDF ---------- */
var TR11_LANGS = [['th', 'ภาษาไทย'], ['en', 'English'], ['ja', '日本語 (ญี่ปุ่น)'], ['zh-CN', '中文 (จีน)'], ['ko', '한국어 (เกาหลีใต้)'], ['es', 'Español (สเปน)']];
(function () {
  function fix(root) {
    $$('.tw-item a[href*="wikidata.org/wiki/"]', root).forEach(function (a) { var s = document.createElement('span'); s.className = 'tw-src'; s.textContent = 'ที่มา: Wikidata'; a.replaceWith(s); });
    $$('.tw-item:not([data-r11])', root).forEach(function (it) { it.setAttribute('data-r11', '1'); it.setAttribute('role', 'button'); it.setAttribute('tabindex', '0'); if (!it.querySelector('.tw-open')) it.querySelector('.grow').insertAdjacentHTML('beforeend', '<div class="tw-open">' + ic('book') + ' อ่านภายในเว็บไซต์</div>'); });
  }
  new MutationObserver(function () { var v = document.getElementById('view'); if (v && S.ui && S.ui.view === 'treaties') fix(v); }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', function (e) {
    var it = e.target.closest && e.target.closest('.tw-item'); if (!it || e.target.closest('a,button:not(.tw-item)')) return;
    var id = it.getAttribute('data-twid'); if (!id) return;
    if (secBlocked(['treaties'])) return;
    openTreaty(id, (it.querySelector('.li-t') || {}).textContent || id);
  });
  var baseLock = syncScrollLock;
  syncScrollLock = function () { baseLock.apply(this, arguments); if (document.querySelector('.tr11')) document.documentElement.classList.add('scroll-lock'); };
})();
function openTreaty(id, title) {
  $$('.tr11').forEach(function (x) { x.remove(); });
  var ov = h('<div class="tr11" role="dialog" aria-modal="true" aria-label="อ่านอนุสัญญา"><div class="tr11-in"><div class="tr11-bar"><button class="icon-btn" data-x aria-label="กลับ">' + ic('arrowL') + '</button><b class="grow">' + esc(title) + '</b><button class="icon-btn" data-x aria-label="ปิด">' + ic('x') + '</button></div><div class="tr11-body"><div class="panel"><p class="muted">กำลังโหลดเนื้อหา…</p></div></div></div></div>');
  document.body.appendChild(ov); syncScrollLock();
  var close = function () { ov.remove(); syncScrollLock(); };
  $$('[data-x]', ov).forEach(function (b) { b.onclick = close; });
  api('treatyText', { id: id }, { timeout: 60000 }).then(function (r) {
    var body = $('.tr11-body', ov), name = r.th || r.en || title;
    var kindNote = r.kind === 'text' ? 'ตัวบท (อ่านอย่างเดียว)' : r.kind === 'summary' ? 'ข้อมูลสรุปจากสารานุกรมเสรี — แหล่งข้อมูลเปิดยังไม่มีตัวบทฉบับเต็มของรายการนี้' : 'ข้อมูลพื้นฐาน — แหล่งข้อมูลเปิดยังไม่มีตัวบทของรายการนี้';
    body.innerHTML = '<article class="panel tr11-doc"><div class="tr11-h"><span class="st-badge">' + ic('book') + ' อ่านอย่างเดียว</span><h2>' + esc(name) + '</h2>' + (r.th && r.en ? '<div class="muted">' + esc(r.en) + '</div>' : '') + '<div class="small muted">' + esc(kindNote) + ' · ที่มา: ' + esc(r.source) + '</div></div>' +
      '<div class="tr-bar tr11-tr">' + ic('globe', 'tr-ic') + '<select id="t11Lang" aria-label="เลือกภาษา">' + TR11_LANGS.map(function (l) { return '<option value="' + l[0] + '">' + esc(l[1]) + '</option>'; }).join('') + '</select><button class="btn sm k" id="t11Go">แปลภาษา</button><button class="btn sm" id="t11Off" disabled>ยกเลิกแปลภาษา</button><span class="spacer"></span><button class="btn sm" id="t11Print">' + ic('printer') + ' พิมพ์ PDF</button></div>' +
      '<div class="tr11-text">' + r.paras.map(function (p, i) { return '<p data-i="' + i + '">' + esc(p) + '</p>'; }).join('') + '</div></article>';
    var tr = { lang: '', map: {} };
    $('#t11Go', body).onclick = function () {
      var lang = $('#t11Lang', body).value, ps = $$('.tr11-text p[data-i]', body), b = this; b.disabled = true; b.textContent = 'กำลังแปล…';
      $$('.trx', body).forEach(function (x) { x.remove(); });
      var chunks = []; for (var i = 0; i < ps.length; i += 40) chunks.push(ps.slice(i, i + 40));
      var lab = (TR11_LANGS.filter(function (l) { return l[0] === lang; })[0] || [])[1];
      chunks.reduce(function (pr, ch) { return pr.then(function () { return api('translate', { to: lang, texts: ch.map(function (p) { return p.textContent; }) }, { timeout: 90000 }).then(function (x) { ch.forEach(function (p, k) { if (x.texts[k]) { tr.map[p.getAttribute('data-i')] = x.texts[k]; p.insertAdjacentHTML('afterend', '<div class="trx"><div class="trx-h">' + ic('globe') + ' คำแปล (' + esc(lab) + ')</div>' + esc(x.texts[k]) + '</div>'); } }); }); }); }, Promise.resolve())
        .then(function () { tr.lang = lab; $('#t11Off', body).disabled = false; }).catch(function () { toast('แปลไม่สำเร็จบางส่วน', 'กรุณาลองใหม่อีกครั้ง', 'warn'); })
        .then(function () { b.disabled = false; b.textContent = 'แปลภาษา'; });
    };
    $('#t11Off', body).onclick = function () { $$('.trx', body).forEach(function (x) { x.remove(); }); tr.map = {}; tr.lang = ''; this.disabled = true; };
    $('#t11Print', body).onclick = function () {
      var go = function (withTr) {
        PRINT_SRC = r.source;
        printDoc(name, r.th && r.en ? r.en : '', r.paras.map(function (p, i) { return '<p>' + esc(p) + '</p>' + (withTr && tr.map[i] ? '<div class="tr9"><b>คำแปล (' + esc(tr.lang) + '):</b> ' + esc(tr.map[i]) + '</div>' : ''); }).join(''));
      };
      if (Object.keys(tr.map).length) popup11({ icon: 'printer', title: 'รวมคำแปลในไฟล์ PDF หรือไม่', html: '<p>เลือก “ตกลง” เพื่อพิมพ์ตัวบทพร้อมคำแปล หรือ “ยกเลิก” เพื่อพิมพ์เฉพาะตัวบทตามต้นฉบับ</p>', ok: 'ตกลง (รวมคำแปล)', cancel: 'ยกเลิก (ไม่รวมคำแปล)' }).then(go);
      else go(false);
    };
  }).catch(function (e) { var b = $('.tr11-body', ov); if (b) b.innerHTML = '<div class="panel"><div class="empty warn"><div class="eic">' + ic('alert') + '</div><h3>ยังโหลดเนื้อหาไม่ได้ในขณะนี้</h3><p>' + esc((e && e.msg) || 'กรุณาลองใหม่อีกครั้ง') + '</p></div></div>'; });
}

/* ---------- 12) พิมพ์ PDF: ระยะบรรทัดไม่เบียดกัน · หัว/ท้ายกระดาษ 12 pt ทุกหน้า ---------- */
(function () {
  var basePrint = printHtml;
  var css = '<style id="pdf11">body{line-height:1.65 !important}p,li,.pre,.sec,td,th,div{line-height:1.65}p{margin:0 0 5pt !important}.sec{margin:0 0 9pt !important}h2,h3,h4{line-height:1.45 !important;margin-top:9pt !important}' +
    '*{letter-spacing:0 !important;word-spacing:0.02em}p,.pre{overflow-wrap:break-word;word-break:normal;line-break:normal}' +
    '.rh,.rh *,.rf,.rf *{font-size:12pt !important;line-height:1.35 !important}.rh{padding-bottom:3pt !important;margin-bottom:10pt !important}.rf{padding-top:3pt !important;margin-top:10pt !important}' +
    '@page{@bottom-center{font-size:12pt}}</style>';
  printHtml = function (html) { html = String(html || ''); if (html.indexOf('id="pdf11"') < 0) html = html.indexOf('</head>') > -1 ? html.replace('</head>', css + '</head>') : css + html; return basePrint(html); };
})();
</script>
