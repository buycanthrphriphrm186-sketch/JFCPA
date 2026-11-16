<script>
/* ==========================================================================
   PUBLIC: Splash, Welcome, Documents, Contact, Login, Register, Forgot
   ========================================================================== */
var ROOT = document.getElementById('root');
var CONTACTS = [
  { k: 'instagram', name: 'Instagram', handle: '@ball_2008___', url: 'https://www.instagram.com/ball_2008___?rpxt=MWE0cDVjdzcxM3Rmdw%3D%3D&utm_source=qr' },
  { k: 'tiktok', name: 'TikTok', handle: '@ball___2008', url: 'https://www.tiktok.com/@ball___2008?_r=1&_t=ZS-9BNH09vu23K' },
  { k: 'line', name: 'LINE Official', handle: 'lin.ee/zte6Icw', url: 'https://lin.ee/zte6Icw' }
];
var NO_PASS_TEXT = 'การเข้าใช้งานคลังกฎหมายต้องใช้รหัสผ่านชั้นที่ 1 ซึ่งผู้ดูแลระบบเป็นผู้ออกให้แก่สมาชิกเท่านั้น หากท่านยังไม่ได้รับรหัสผ่านดังกล่าว กรุณาติดต่อผู้ดูแลระบบผ่านช่องทางด้านล่าง โดยแจ้งชื่อ-นามสกุล และวัตถุประสงค์ในการใช้งาน ผู้ดูแลระบบจะตรวจสอบและแจ้งรหัสผ่านให้ท่านเป็นการส่วนตัวโดยเร็ว';
var SYS_DOWN_TEXT = 'ขณะนี้ระบบไม่สามารถให้บริการได้ตามปกติ ข้อมูลของท่านยังคงได้รับการเก็บรักษาไว้อย่างปลอดภัย กรุณารอสักครู่แล้วลองใหม่อีกครั้ง หากยังพบปัญหาต่อเนื่อง กรุณาแจ้งผู้ดูแลระบบผ่านช่องทางติดต่อที่ระบุไว้ เพื่อให้ดำเนินการแก้ไขโดยเร็ว';

/* ---------------- splash: โลโก้ + วงกลมแสดงระดับการเชื่อมต่อฐานข้อมูลจริง ---------------- */
var SPLASH_STEPS = { server: 'เชื่อมต่อเซิร์ฟเวอร์', session: 'ตรวจสอบบัญชีผู้ใช้', laws: 'โหลดฐานข้อมูลกฎหมาย', treaties: 'โหลดอนุสัญญา' };
var splashDone = {};
function splashStep(k, ok) {
  if (splashDone[k] !== undefined) return;
  splashDone[k] = ok !== false;
  var li = document.querySelector('#splashSteps li[data-k="' + k + '"]'); if (li) li.classList.add(ok === false ? 'bad' : 'ok');
  var n = Object.keys(splashDone).length, pct = Math.round(n / 4 * 100);
  splashPaint(pct, n >= 4 ? 'พร้อมให้บริการ' : (ok === false ? SPLASH_STEPS[k] + ' ไม่สำเร็จ ระบบใช้ข้อมูลสำรองแทน' : SPLASH_STEPS[k] + ' สำเร็จ'));
}
function splashPaint(pct, text) {
  var arc = document.getElementById('spArc'); if (arc) arc.setAttribute('stroke-dasharray', pct + ' 100');
  var p = document.getElementById('splashPct'); if (p) p.textContent = pct + '%';
  var bar = document.getElementById('splashBar'); if (bar) bar.setAttribute('aria-valuenow', pct);
  var st = document.getElementById('splashStatus'); if (st && text) st.textContent = text;
}
function runSplash(minSec, ready, onDone) {
  var sp = document.getElementById('splash'), skip = document.getElementById('splashSkip');
  var t0 = Date.now(), ended = false;
  splashPaint(4, 'กำลังเชื่อมต่อเซิร์ฟเวอร์');
  function end() {
    if (ended) return; ended = true;
    splashPaint(100);
    setTimeout(function () { sp.classList.add('warp'); setTimeout(function () { sp.remove(); }, 900); onDone(); }, 280);
  }
  if (skip) { setTimeout(function () { skip.classList.remove('hidden'); }, 4000); skip.onclick = end; }
  var maxT = setTimeout(end, Math.max(minSec * 1000 + 10000, 20000));
  Promise.resolve(ready).catch(function () {}).then(function () {
    var wait = Math.max(0, minSec * 1000 - (Date.now() - t0));
    setTimeout(function () { clearTimeout(maxT); end(); }, wait);
  });
}

/* ---------------- public header / footer ---------------- */
function pubHeader(back) {
  return '<header class="pub-head"><div class="wrap">' +
    (back ? '<button class="icon-btn" data-go="' + back + '" aria-label="ย้อนกลับ">' + ic('arrowL') + '</button>' : '') +
    '<button class="brand" data-go="welcome" aria-label="กลับหน้าแรก"><img src="' + LOGO + '" alt=""><span><span class="t1">THAI LAW LIBRARY</span><br><span class="t2">คลังกฎหมาย</span></span></button>' +
    '<nav class="pub-nav"><button class="btn sm ghost hide-sm" data-doc="about">เกี่ยวกับเรา</button><button class="btn sm ghost hide-sm" data-go="contact">ติดต่อ</button><button class="btn sm k" data-go="login">เข้าสู่ระบบ</button></nav>' +
    '</div></header>';
}
function pubFooter() {
  return '<footer class="pub-foot"><div class="wrap">' +
    '<div class="row wrapr" style="gap:8px"><button class="btn sm ghost" data-doc="about">' + ic('info') + ' เกี่ยวกับเรา</button><button class="btn sm ghost" data-doc="privacy">' + ic('shield') + ' นโยบายความเป็นส่วนตัว</button><button class="btn sm ghost" data-doc="terms">' + ic('file') + ' ข้อกำหนดการใช้งาน</button><button class="btn sm ghost" data-go="contact">' + ic('mail') + ' ติดต่อผู้ดูแลระบบ</button></div>' +
    '<p class="credit-note" id="creditNote">หมายเหตุ: ภาพประกอบบนเว็บไซต์นี้ดึงจาก Wikimedia Commons, Unsplash, Pexels และ Pixabay เฉพาะภาพที่เจ้าของภาพอนุญาตให้นำไปใช้ได้ตามสัญญาอนุญาตของแต่ละแหล่ง โดยระบุชื่อผู้สร้างสรรค์และสัญญาอนุญาตไว้ที่ภาพทุกภาพ หากเจ้าของภาพประสงค์ให้นำภาพออก กรุณาติดต่อผู้ดูแลระบบ</p>' +
    '<p class="tiny muted">© ' + yr(new Date().getFullYear()) + ' THAI LAW LIBRARY คลังกฎหมาย · เวอร์ชัน ' + esc(APP_VERSION) + ' · ข้อมูลกฎหมายใช้เพื่อการศึกษาและค้นคว้า มิใช่คำปรึกษาทางกฎหมาย</p>' +
    '</div></footer>';
}
on(document, 'click', '[data-go]', function (e, el) { e.preventDefault(); go(el.getAttribute('data-go')); });
on(document, 'click', '[data-doc]', function (e, el) { e.preventDefault(); openDoc(el.getAttribute('data-doc')); });

function go(screen) {
  tap();
  var map = { welcome: renderWelcome, contact: renderContact, login: renderLogin, register: renderRegister, forgot: renderForgot };
  if (map[screen]) { map[screen](); store.set('pubScreen', screen); window.scrollTo(0, 0); }
}

/* ---------------- hero corridor (ported from ImageStreamHero) ---------------- */
var CORRIDOR = { perspective: 30, cardWidth: 18, cardHeight: 25, cardRadius: 0.5, birthHeight: 2.6, exitHeight: 46, railBirth: -11, railExit: 44, fan: 3.3, turnBirth: 6, turnExit: 28, stops: 24 };
function corridorKeyframes(dir, name, p) {
  var steps = [];
  for (var s = 0; s <= p.stops; s++) {
    var u = s / p.stops;
    var scale = (p.birthHeight / p.cardHeight) * Math.pow(p.exitHeight / p.birthHeight, u);
    var z = p.perspective * (1 - 1 / scale);
    var rail = p.railExit - (p.railExit - p.railBirth) * Math.pow(1 - u, p.fan);
    var turn = p.turnBirth + (p.turnExit - p.turnBirth) * u;
    steps.push((u * 100).toFixed(2) + '%{transform:translate3d(' + (dir * rail).toFixed(2) + 'cqw,0,' + z.toFixed(2) + 'cqw) rotateY(' + (-dir * turn).toFixed(2) + 'deg)}');
  }
  return '@keyframes ' + name + '{' + steps.join('') + '}';
}
function corridorHtml(cards, speed, axis) {
  var p = CORRIDOR, id = uid();
  var css = corridorKeyframes(1, 'ishR' + id, p) + corridorKeyframes(-1, 'ishL' + id, p) + '@media(prefers-reduced-motion:reduce){.ishc' + id + '{animation-play-state:paused !important}}';
  var html = '<style>' + css + '</style><div class="stage" aria-hidden="true" style="perspective:' + p.perspective + 'cqw;perspective-origin:50% ' + axis + '%"><div class="world">';
  ['R', 'L'].forEach(function (side, si) {
    for (var i = 0; i < cards; i++) {
      html += '<div class="card ishc' + id + '" data-slot="' + (si * cards + i) + '" style="left:50%;top:' + axis + '%;width:' + p.cardWidth + 'cqw;height:' + p.cardHeight + 'cqw;margin-left:' + (-p.cardWidth / 2) + 'cqw;margin-top:' + (-p.cardHeight / 2) + 'cqw;border-radius:' + p.cardRadius + 'cqw;animation:ish' + side + id + ' ' + speed + 's linear infinite;animation-delay:' + (-(i * speed) / cards) + 's"><img alt="" decoding="async"></div>';
    }
  });
  return html + '</div></div>';
}
function fillCorridor(root) {
  var slots = $$('.hero .card', root);
  var imgs = shuffledMedia().filter(function (m) { return !m.video; });
  if (!imgs.length) return;
  var hero = root.querySelector('.hero'); if (hero) hero.classList.add('ready');
  slots.forEach(function (slot, i) {
    var m = imgs[i % imgs.length];
    var img = slot.querySelector('img');
    img.onload = function () { img.classList.add('ok'); };
    img.alt = m.alt || '';
    img.src = m.src;
  });
  var used = imgs.slice(0, Math.min(slots.length, imgs.length));
  var note = document.getElementById('heroCredits');
  if (note) note.innerHTML = 'ภาพประกอบ: ' + used.map(function (m) { return '<a href="' + esc(m.page) + '" target="_blank" rel="noopener">' + esc(m.author || m.source) + '</a> (' + esc(m.license) + ', ' + esc(m.source) + ')'; }).join(' · ');
}
function shuffledMedia() {
  var list = (S.media || []).slice();
  var last = store.get('lastMedia', []);
  // สุ่มไม่ซ้ำเดิมจากการเข้าใช้งานครั้งก่อน: ภาพที่เคยแสดงล่าสุดจะถูกเลื่อนไปท้ายรายการ
  for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = list[i]; list[i] = list[j]; list[j] = tmp; }
  list.sort(function (a, b) { return (last.indexOf(a.src) > -1) - (last.indexOf(b.src) > -1); });
  store.set('lastMedia', list.slice(0, 18).map(function (m) { return m.src; }));
  return list;
}
var mediaPromise = null;
function loadMedia() {
  if (SAFE_MODE || !(S.flags && S.flags.FLAG_MEDIA !== false)) return Promise.resolve([]);
  if (mediaPromise) return mediaPromise;
  var cached = store.get('media', null);
  if (cached && cached.t > Date.now() - 6 * 3600e3 && cached.items.length) { S.media = cached.items; mediaPromise = Promise.resolve(S.media); return mediaPromise; }
  mediaPromise = api('media', {}, { timeout: 25000 }).then(function (r) { S.media = r.items || []; store.set('media', { t: Date.now(), items: S.media }); return S.media; }).catch(function () { return []; });
  return mediaPromise;
}

/* ---------------- welcome ---------------- */
function renderWelcome() {
  document.body.classList.add('readable');
  ROOT.innerHTML = pubHeader() +
    '<section class="hero enter">' + corridorHtml(9, 46, 58) + '<div class="fade-top"></div>' +
      '<div class="content"><div class="col" style="align-items:center;gap:14px">' +
        '<span class="tag k">ศูนย์รวมกฎหมายไทยเพื่อการศึกษาและค้นคว้า</span>' +
        '<h1>คลังกฎหมาย<br><span style="color:var(--sky-700)">THAI LAW LIBRARY</span></h1>' +
        '<p class="lead">“คลังกฎหมาย — แหล่งรวบรวมความรู้ทางกฎหมาย เพื่อการศึกษา การค้นคว้า และการเข้าถึงกฎหมายไทยอย่างเป็นระบบ”</p>' +
      '</div><div class="col" style="align-items:center;gap:12px"><div class="cta"><button class="btn lg k" data-go="login">' + ic('lock') + ' เข้าสู่ระบบ</button><button class="btn lg o" data-go="register">' + ic('user') + ' สมัครสมาชิก</button></div>' +
      '<div class="cta"><button class="btn sm" data-doc="about">เกี่ยวกับเรา</button><button class="btn sm" data-doc="privacy">นโยบายความเป็นส่วนตัว</button><button class="btn sm" data-doc="terms">ข้อกำหนดการใช้งาน</button></div></div></div>' +
    '</section>' +
    '<main class="wrap" style="padding-top:28px">' +
      '<div class="grid g4" style="margin-bottom:22px">' +
        featureBox('layers', 'ศูนย์รวมกฎหมายไทย', 'รัฐธรรมนูญ พระราชบัญญัติประกอบรัฐธรรมนูญ พระราชบัญญัติ พระราชกำหนด ประกาศคณะปฏิวัติและคณะรัฐประหาร และประมวลกฎหมาย จัดเก็บเป็นหมวดหมู่เดียวกัน') +
        featureBox('search', 'แหล่งค้นคว้าข้อมูลทางกฎหมาย', 'ค้นหาได้ทั้งชื่อกฎหมาย เลขมาตรา ข้อความในมาตรา ปี พ.ศ. และประเภทกฎหมาย พร้อมไฮไลต์คำที่ตรงกับคำค้นหา') +
        featureBox('bookmark', 'ระบบจัดเก็บและค้นหาบทบัญญัติ', 'บันทึกมาตราที่สนใจ แยกตามวัน เดือน ปี สร้างโฟลเดอร์ส่วนตัว และเพิ่มหมายเหตุของตนเองได้') +
        featureBox('book', 'แหล่งเรียนรู้สำหรับผู้สนใจกฎหมาย', 'ป้ายพลิกมาตราพร้อมตัวจับเวลาท่องจำ อนุสัญญาระหว่างประเทศพร้อมคำอธิบาย และเครื่องมือสำหรับนักกฎหมาย') +
      '</div>' +
      '<section class="panel corner rise" style="margin-bottom:22px"><div class="panel-title"><span class="ic k">' + ic('book2') + '</span><h2>เรื่องราวของคลังกฎหมาย</h2></div><div class="prose">' + DOCS.about.body + '</div>' +
        '<div id="aboutVideo"></div></section>' +
      '<section class="panel rise" style="margin-bottom:22px"><div class="panel-title"><span class="ic o">' + ic('route') + '</span><h2>ขั้นตอนเริ่มต้นใช้งาน</h2></div>' +
        '<div class="timeline">' + ['เปิดเว็บไซต์ THAI LAW LIBRARY และอ่านข้อมูลแนะนำ', 'ติดต่อผู้ดูแลระบบเพื่อรับรหัสผ่านชั้นที่ 1 (รหัสผ่านจากผู้ดูแลระบบ)', 'กดสมัครสมาชิก กรอกข้อมูลประจำตัว ข้อมูลการศึกษาหรือการทำงาน', 'กำหนดชื่อผู้ใช้งาน และตั้งรหัสผ่านส่วนตัว (ชั้นที่ 3) ของตนเอง และระบุอีเมลสำหรับรับรหัสผ่านชั้นที่ 2', 'ระบบตรวจสอบข้อมูล ป้องกันข้อมูลซ้ำ และสร้างรหัสสมาชิก (Member ID) ให้อัตโนมัติ', 'เข้าสู่ระบบด้วยรหัสผ่านทั้งสองชั้น แล้วเริ่มใช้งานหน้าหลัก'].map(function (s, i) { return '<div class="tl ' + (i === 5 ? 'o' : '') + '"><h4>ขั้นตอนที่ ' + (i + 1) + '</h4><p class="muted">' + esc(s) + '</p></div>'; }).join('') + '</div></section>' +
      '<section class="panel rise" style="margin-bottom:22px"><div class="panel-title"><span class="ic">' + ic('image') + '</span><h2>ภาพประกอบจากแหล่งที่ได้รับอนุญาต</h2></div><div class="media-strip" id="mediaStrip"></div><p class="credit-note" id="heroCredits" style="margin-top:10px"></p></section>' +
    '</main>' + pubFooter();
  observeRise(ROOT);
  loadMedia().then(function () {
    fillCorridor(ROOT);
    var strip = document.getElementById('mediaStrip');
    var list = shuffledMedia().filter(function (m) { return !m.video; }).slice(0, 8);
    if (strip) strip.innerHTML = list.length ? list.map(function (m) { return '<figure><img src="' + esc(m.src) + '" alt="' + esc(m.alt) + '" loading="lazy"><figcaption>' + esc(m.author || '') + ' · ' + esc(m.license) + ' · ' + esc(m.source) + '</figcaption></figure>'; }).join('') : '<p class="muted">ระบบจะแสดงภาพประกอบเมื่อเชื่อมต่อคลังภาพได้</p>';
    var vid = (S.media || []).filter(function (m) { return m.video; })[0];
    var vbox = document.getElementById('aboutVideo');
    if (vid && vbox) vbox.innerHTML = '<div style="margin-top:14px;border-radius:var(--r-lg);overflow:hidden;background:#000"><video src="' + esc(vid.video) + '" poster="' + esc(vid.src) + '" controls playsinline preload="none" style="width:100%;display:block"></video></div><p class="credit-note" style="margin-top:6px">วิดีโอประกอบ: ' + esc(vid.author || '') + ' · ' + esc(vid.license) + ' · ' + esc(vid.source) + '</p>';
  });
}
function featureBox(icon, title, text) {
  return '<div class="panel corner rise"><div class="panel-title" style="margin-bottom:6px"><span class="ic">' + ic(icon) + '</span><h3>' + esc(title) + '</h3></div><p class="muted">' + esc(text) + '</p></div>';
}

/* ---------------- documents (About / Privacy / Terms) ---------------- */
var DOCS = {
  about: { title: 'เกี่ยวกับคลังกฎหมาย', icon: 'info', body: [
    '<p>คลังกฎหมาย หรือ THAI LAW LIBRARY เริ่มต้นจากปัญหาที่ผู้ศึกษากฎหมายจำนวนมากประสบเหมือนกัน คือ ตัวบทกฎหมายของประเทศไทยมีจำนวนมาก กระจายอยู่ในหลายแหล่ง และมีการแก้ไขเพิ่มเติมอยู่เสมอ นักเรียน นักศึกษา และผู้ปฏิบัติงานด้านกฎหมายจึงต้องเสียเวลาไม่น้อยในการค้นหาตัวบทฉบับที่ถูกต้อง ก่อนที่จะได้เริ่มทำความเข้าใจเนื้อหาจริง ๆ ผู้จัดทำจึงตั้งใจรวบรวมกฎหมายไทยไว้ในที่เดียว จัดเป็นหมวดหมู่ที่ชัดเจน และออกแบบเครื่องมือที่ช่วยให้การอ่าน การท่องจำ และการทบทวนบทบัญญัติเป็นเรื่องที่ทำได้ทุกวัน</p>',
    '<p>เนื้อหากฎหมายในระบบแบ่งออกเป็นห้าหมวดตามแนวทางของฐานข้อมูลกฎหมายของรัฐ ได้แก่ รัฐธรรมนูญ พระราชบัญญัติประกอบรัฐธรรมนูญ พระราชบัญญัติและพระราชกำหนด ประกาศของคณะปฏิวัติ คณะปฏิรูปการปกครอง คณะมนตรีความมั่นคงแห่งชาติ และคณะรักษาความสงบแห่งชาติ รวมถึงประมวลกฎหมาย ข้อมูลรายชื่อกฎหมายอ้างอิงจากฐานข้อมูลกฎหมายของสำนักงานคณะกรรมการกฤษฎีกา และระบบจะตรวจสอบแหล่งข้อมูลต้นทางเป็นประจำทุกวัน เพื่อเพิ่มรายการใหม่หรือปรับปรุงรายการที่มีการเปลี่ยนแปลง ส่วนอนุสัญญาและสนธิสัญญาระหว่างประเทศอ้างอิงจากเว็บไซต์กรมสนธิสัญญาและกฎหมาย กระทรวงการต่างประเทศ พร้อมคำอธิบายภาษาไทยที่อ่านเข้าใจง่ายสำหรับทุกฉบับ</p>',
    '<p>หัวใจของการเรียนรู้ในคลังกฎหมายคือ “ป้ายพลิกมาตรา” ด้านหน้าของป้ายแสดงเลขมาตราและชื่อมาตราตามที่ใช้เรียกกันในวงวิชาการ เช่น มาตรา 420 ละเมิด หรือมาตรา 1382 การครอบครองปรปักษ์ เมื่อพลิกป้ายจะพบตัวบทเต็มที่จัดย่อหน้าและวรรคตามรูปแบบเอกสารราชการ ผู้ใช้สามารถตั้งเวลานับถอยหลังเพื่อฝึกท่องจำ โดยแถบสีจะเปลี่ยนจากสีเขียวเป็นสีส้มและสีแดงเมื่อเวลาใกล้หมด พร้อมเสียงเตือนห้าวินาทีสุดท้าย และสามารถบันทึกมาตราที่สนใจเป็นรายการโปรดได้ทันที ระบบจะจัดเก็บรายการโปรดแยกตามวัน เดือน และปีที่บันทึกอย่างแม่นยำ</p>',
    '<p>นอกเหนือจากตัวบท ระบบยังมีเครื่องมือที่นักกฎหมายใช้จริงในการทำงาน เช่น พจนานุกรมศัพท์กฎหมาย รวมคำย่อทางกฎหมาย เครื่องคำนวณวันและระยะเวลาตามหลักการนับระยะเวลาในประมวลกฎหมายแพ่งและพาณิชย์ เครื่องมือจัดรูปแบบการอ้างอิงกฎหมาย แบบฟอร์มสรุปคำพิพากษา เครื่องมือเปรียบเทียบบทบัญญัติ สมุดบันทึกที่จัดรูปแบบได้ใกล้เคียงโปรแกรมประมวลผลคำและพิมพ์เป็นไฟล์ PDF ได้ ตลอดจนผู้ช่วย AI ที่ช่วยอธิบายบทบัญญัติด้วยภาษาที่เข้าใจง่าย โดยระบุแหล่งอ้างอิงและแยกข้อกฎหมายออกจากคำอธิบายอย่างชัดเจน</p>',
    '<p>ด้านความปลอดภัย ระบบใช้การยืนยันตัวตนด้วยรหัสผ่านสามชั้น ชั้นแรกเป็นรหัสผ่านที่ผู้ดูแลระบบออกให้ ชั้นที่สองเป็นรหัสใช้ครั้งเดียวที่ส่งทางอีเมล ชั้นที่สามเป็นรหัสผ่านที่สมาชิกกำหนดเอง รหัสผ่านทุกชุดจัดเก็บในรูปแบบค่าแฮชซึ่งไม่สามารถถอดกลับเป็นข้อความเดิมได้ มีการจำกัดจำนวนครั้งในการกรอกรหัสผิด ตรวจจับรูปแบบการโจมตีที่พบบ่อย และจัดทำรายงานเหตุการณ์ด้านความปลอดภัยเพื่อให้ผู้ดูแลระบบตรวจสอบได้ทุกครั้ง ข้อมูลของสมาชิกจัดเก็บใน Google Sheets ภายใต้บัญชีของผู้ดูแลระบบ และไม่เปิดเผยต่อบุคคลภายนอก</p>',
    '<p>คลังกฎหมายจัดทำขึ้นเพื่อการศึกษาและการค้นคว้า ข้อมูลทุกส่วนผ่านการรวบรวมและจัดรูปแบบด้วยความระมัดระวัง แต่ผู้ใช้ควรตรวจสอบตัวบทฉบับปัจจุบันจากราชกิจจานุเบกษาหรือสำนักงานคณะกรรมการกฤษฎีกาทุกครั้งก่อนนำไปใช้อ้างอิงในทางคดีหรือในการปฏิบัติงาน และหากพบข้อมูลที่อาจคลาดเคลื่อน ผู้จัดทำยินดีรับฟังและแก้ไขโดยเร็วผ่านเมนูรายงานข้อมูลกฎหมายที่อาจผิดพลาด</p>'
  ].join('') },
  privacy: { title: 'นโยบายความเป็นส่วนตัว', icon: 'shield', body: [
    '<h3>1. ข้อมูลที่เราเก็บรวบรวม</h3><p>ในการสมัครสมาชิก ระบบเก็บรวบรวมข้อมูลที่ท่านกรอกด้วยตนเอง ได้แก่ คำนำหน้าชื่อ ชื่อ นามสกุล ชื่อที่ใช้แสดง วันเดือนปีเกิด เพศ (ถ้าระบุ) รูปโปรไฟล์ (ถ้ามี) สถานะการศึกษาหรือการทำงาน ชื่อสถานศึกษาหรือหน่วยงาน ชื่อผู้ใช้งาน และคำถามสำหรับกู้คืนบัญชี ส่วนรหัสผ่านและคำตอบสำหรับกู้คืนบัญชีจัดเก็บเป็นค่าแฮชเท่านั้น ผู้ดูแลระบบไม่สามารถทราบรหัสผ่านส่วนตัวของท่านได้</p>',
    '<p>ระหว่างการใช้งาน ระบบบันทึกข้อมูลการใช้งานเพื่อให้บริการตามที่ท่านเลือกใช้ ได้แก่ รายการโปรด ประวัติการเปิดอ่าน ระยะเวลาการใช้งาน โน้ตส่วนตัว การตั้งค่า และข้อมูลการเข้าสู่ระบบ เช่น วันเวลา ประเภทอุปกรณ์ ระบบปฏิบัติการ เว็บเบราว์เซอร์ หมายเลข IP และตำแหน่งโดยประมาณจากหมายเลข IP ซึ่งไม่สามารถระบุที่อยู่หรือตัวบุคคลได้</p>',
    '<h3>2. วัตถุประสงค์ในการใช้ข้อมูล</h3><p>ระบบใช้ข้อมูลของท่านเพื่อยืนยันตัวตน ให้บริการคลังกฎหมายและเครื่องมือต่าง ๆ จดจำการตั้งค่าและข้อมูลการเรียนรู้ของท่านในทุกอุปกรณ์ ป้องกันการเข้าถึงโดยไม่ได้รับอนุญาต และจัดทำรายงานเหตุการณ์ด้านความปลอดภัย ระบบไม่นำข้อมูลของท่านไปใช้เพื่อการโฆษณา และไม่ขายหรือเปิดเผยข้อมูลแก่บุคคลภายนอก เว้นแต่มีกฎหมายกำหนดหรือเจ้าหน้าที่ผู้มีอำนาจร้องขอตามกฎหมาย</p>',
    '<h3>3. การจัดเก็บและระยะเวลา</h3><p>ข้อมูลจัดเก็บใน Google Sheets และ Google Drive ภายใต้บัญชีของผู้ดูแลระบบ โดยจำกัดสิทธิ์การเข้าถึงเฉพาะผู้ดูแลระบบ ข้อมูลจะถูกเก็บไว้ตลอดระยะเวลาที่ท่านเป็นสมาชิก และจะถูกลบเมื่อท่านลบบัญชีถาวร ยกเว้นบันทึกด้านความปลอดภัยซึ่งจำเป็นต้องเก็บไว้ตามระยะเวลาที่เหมาะสมเพื่อการตรวจสอบย้อนหลัง</p>',
    '<h3>4. สิทธิของเจ้าของข้อมูล</h3><p>ท่านมีสิทธิตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 ได้แก่ สิทธิขอเข้าถึงและขอรับสำเนาข้อมูล สิทธิขอแก้ไขข้อมูลให้ถูกต้อง สิทธิขอลบข้อมูล สิทธิคัดค้านหรือขอระงับการประมวลผล และสิทธิถอนความยินยอม ท่านสามารถใช้สิทธิเหล่านี้ได้ด้วยตนเองผ่านเมนูการตั้งค่า หัวข้อการตั้งค่าความเป็นส่วนตัวและจัดการบัญชี หรือติดต่อผู้ดูแลระบบ</p>',
    '<h3>5. บริการของบุคคลที่สาม</h3><p>ระบบอาจเรียกใช้บริการภายนอกเพื่อเพิ่มประสิทธิภาพการใช้งาน ได้แก่ Google Fonts สำหรับแบบอักษร บริการตรวจสอบหมายเลข IP ขณะเข้าสู่ระบบ บริการคลังภาพ Wikimedia Commons, Unsplash, Pexels และ Pixabay และบริการ Google Gemini สำหรับผู้ช่วย AI ซึ่งจะได้รับเฉพาะข้อความคำถามที่ท่านพิมพ์ ระบบไม่ส่งรหัสผ่านหรือข้อมูลบัญชีไปยังบริการเหล่านี้</p>'
  ].join('') },
  terms: { title: 'ข้อกำหนดการใช้งาน', icon: 'file', body: [
    '<h3>1. การยอมรับข้อกำหนด</h3><p>การสมัครสมาชิกและการใช้งานคลังกฎหมายถือว่าท่านได้อ่าน เข้าใจ และยอมรับข้อกำหนดการใช้งานฉบับนี้ หากท่านไม่ยอมรับข้อกำหนดส่วนใด กรุณางดใช้งานเว็บไซต์</p>',
    '<h3>2. บัญชีผู้ใช้งานและรหัสผ่าน</h3><p>สมาชิกแต่ละรายต้องมีรหัสสมาชิกประจำตัวและชื่อผู้ใช้งานที่ไม่ซ้ำกับผู้อื่น การเข้าสู่ระบบต้องผ่านการตรวจสอบรหัสผ่านสามชั้นทุกครั้ง ได้แก่ รหัสผ่านที่ผู้ดูแลระบบออกให้ รหัสใช้ครั้งเดียวทางอีเมล และรหัสผ่านส่วนตัวที่สมาชิกกำหนดเอง สมาชิกมีหน้าที่เก็บรักษารหัสผ่านเป็นความลับ ห้ามเปิดเผยหรือให้ผู้อื่นใช้บัญชีของตน หากสงสัยว่ารหัสผ่านรั่วไหล ต้องเปลี่ยนรหัสผ่านและออกจากระบบทุกอุปกรณ์โดยทันที</p>',
    '<h3>3. ลักษณะของข้อมูลกฎหมาย</h3><p>ข้อมูลกฎหมาย คำอธิบาย และคำตอบของผู้ช่วย AI จัดทำขึ้นเพื่อการศึกษาและการค้นคว้าเท่านั้น มิใช่คำปรึกษาทางกฎหมายจากผู้ประกอบวิชาชีพ และไม่อาจใช้แทนตัวบทที่ประกาศในราชกิจจานุเบกษา ผู้ใช้ต้องตรวจสอบตัวบทฉบับปัจจุบันก่อนนำไปใช้ในทางคดีหรือการปฏิบัติงานทุกครั้ง</p>',
    '<h3>4. การใช้งานที่ไม่อนุญาต</h3><p>ห้ามมิให้ผู้ใดพยายามเข้าถึงระบบหรือข้อมูลของผู้อื่นโดยไม่ได้รับอนุญาต สุ่มรหัสผ่าน แทรกคำสั่งหรือสคริปต์อันตราย ดึงข้อมูลจำนวนมากโดยอัตโนมัติ หรือกระทำการใดที่ทำให้ระบบขัดข้อง การกระทำดังกล่าวอาจเป็นความผิดตามพระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ พ.ศ. 2550 ระบบจะบันทึกเหตุการณ์ ระงับบัญชี และรายงานต่อผู้ดูแลระบบทันที</p>',
    '<h3>5. แพ็กเกจและการชำระเงิน</h3><p>สมาชิกใหม่ได้รับสิทธิทดลองใช้งานครบทุกฟังก์ชันเป็นเวลา 7 วันนับแต่วันสมัครสมาชิก หลังจากนั้นสามารถเลือกสมัครแพ็กเกจรายเดือนหรือรายปีตามความต้องการ การชำระเงินดำเนินการผ่านผู้ดูแลระบบ และสิทธิการใช้งานจะเปิดหลังจากผู้ดูแลระบบยืนยันการชำระเงินแล้ว</p>',
    '<h3>6. การเปลี่ยนแปลงข้อกำหนด</h3><p>ผู้ดูแลระบบอาจปรับปรุงข้อกำหนดการใช้งานเพื่อให้สอดคล้องกับกฎหมายและการให้บริการ โดยจะแจ้งให้ทราบผ่านศูนย์การแจ้งเตือนภายในเว็บไซต์ การใช้งานต่อหลังจากมีการแจ้งถือว่าท่านยอมรับข้อกำหนดที่ปรับปรุงแล้ว</p>'
  ].join('') }
};
function openDoc(key) {
  var d = DOCS[key]; if (!d) return;
  modal({ title: d.title, icon: d.icon, wide: true, html: '<div class="prose">' + d.body + '</div>', ok: 'ปิด', cancel: false, autofocus: false });
}

/* ---------------- contact admin (หน้าเดี่ยว) ---------------- */
function contactCards() {
  return CONTACTS.map(function (c) {
    return '<a class="contact-card" href="' + esc(c.url) + '" target="_blank" rel="noopener"><svg class="brand-ic" viewBox="0 0 24 24">' + BRAND[c.k].replace(/^<svg[^>]*>|<\/svg>$/g, '') + '</svg><span class="grow"><b>' + esc(c.name) + '</b><br><span class="muted small">' + esc(c.handle) + '</span></span>' + ic('external') + '</a>';
  }).join('');
}
function renderContact() {
  document.body.classList.remove('readable');
  ROOT.innerHTML = pubHeader('welcome') + '<main class="auth-wrap enter"><div class="auth-card wide">' +
    '<div class="auth-head"><img src="' + LOGO + '" alt=""><span class="t1">THAI LAW LIBRARY</span><h2>ติดต่อผู้ดูแลระบบ</h2></div>' +
    '<div class="panel flat corner" style="margin-bottom:16px"><div class="panel-title"><span class="ic o">' + ic('key') + '</span><h3>กรณียังไม่ได้รับรหัสผ่านจากผู้ดูแลระบบ</h3></div><div class="prose"><p>' + esc(NO_PASS_TEXT) + '</p></div></div>' +
    '<div class="col">' + contactCards() + '</div>' +
    '<div class="panel flat" style="margin-top:16px"><div class="panel-title"><span class="ic">' + ic('send') + '</span><h3>ส่งข้อความถึงผู้ดูแลระบบ</h3></div>' +
      '<div class="grid g2"><div class="field"><label for="cName">ชื่อ-นามสกุล</label><div class="input"><input id="cName" maxlength="80"></div></div><div class="field"><label for="cSubj">เรื่อง</label><div class="input"><input id="cSubj" maxlength="120" value="ขอรับรหัสผ่านจากผู้ดูแลระบบ"></div></div></div>' +
      '<div class="field" style="margin-top:10px"><label for="cDetail">รายละเอียดและช่องทางติดต่อกลับ</label><div class="input"><textarea id="cDetail" maxlength="2000"></textarea></div></div>' +
      '<div class="row" style="margin-top:12px;justify-content:flex-end"><button class="btn k" id="cSend">' + ic('send') + ' ส่งข้อความ</button></div></div>' +
    '<div class="row wrapr" style="margin-top:18px;justify-content:center;gap:8px"><button class="btn" data-go="login">' + ic('lock') + ' เข้าสู่ระบบ</button><button class="btn o" data-go="register">' + ic('user') + ' สมัครสมาชิก</button></div>' +
    '</div></main><button class="next-fab" data-go="login" aria-label="ไปหน้าเข้าสู่ระบบ">' + ic('arrowR') + '</button>';
  $('#cSend').onclick = function () {
    var name = $('#cName').value.trim(), subj = $('#cSubj').value.trim(), det = $('#cDetail').value.trim();
    if (!name || !det) { toast('กรุณากรอกชื่อและรายละเอียด', '', 'warn'); return; }
    confirmBox('ยืนยันการส่งข้อความ', 'ระบบจะส่งข้อความนี้ถึงผู้ดูแลระบบ ท่านต้องการดำเนินการต่อหรือไม่').then(function (ok) {
      if (!ok) return;
      withLoading('กำลังส่งข้อความ', api('reportPublic', { name: name, subject: subj, detail: det, kind: 'ติดต่อผู้ดูแลระบบ' })).then(function (r) { toast('ส่งข้อความเรียบร้อยแล้ว', r.msg, 'ok'); $('#cDetail').value = ''; }).catch(function (e) { toast('ส่งข้อความไม่สำเร็จ', e.msg || SYS_DOWN_TEXT, 'bad'); });
    });
  };
}

/* ---------------- password field helpers ---------------- */
function pwField(id, label, opt) {
  opt = opt || {};
  return '<div class="field"><label for="' + id + '">' + esc(label) + (opt.req === false ? '' : ' <span class="req">*</span>') + '</label>' +
    '<div class="input">' + ic(opt.icon || 'lock') + '<input id="' + id + '" type="password" autocomplete="' + (opt.ac || 'off') + '" ' + (opt.ph ? 'placeholder="' + esc(opt.ph) + '"' : '') + ' maxlength="128">' +
    '<button type="button" class="icon-btn" data-eye="' + id + '" aria-label="แสดงหรือซ่อนรหัสผ่าน" style="width:38px;height:38px">' + ic('eye') + '</button></div>' +
    (opt.meter ? '<div class="meter" style="margin-top:4px"><i id="' + id + 'M"></i></div><div class="row"><span class="pw-level" id="' + id + 'L">ระดับความปลอดภัย: -</span></div><ul class="pw-rules" id="' + id + 'R"><li data-r="len">' + ic('check') + ' อย่างน้อย 10 ตัวอักษร</li><li data-r="up">' + ic('check') + ' ตัวพิมพ์ใหญ่ภาษาอังกฤษ</li><li data-r="low">' + ic('check') + ' ตัวพิมพ์เล็กภาษาอังกฤษ</li><li data-r="num">' + ic('check') + ' ตัวเลข</li><li data-r="sp">' + ic('check') + ' อักขระพิเศษ (แนะนำ)</li></ul>' : '') +
    (opt.hint ? '<div class="hint">' + esc(opt.hint) + '</div>' : '') + '<div class="err" id="' + id + 'E"></div></div>';
}
on(document, 'click', '[data-eye]', function (e, b) {
  var inp = document.getElementById(b.getAttribute('data-eye')); if (!inp) return;
  var show = inp.type === 'password'; inp.type = show ? 'text' : 'password';
  b.innerHTML = ic(show ? 'eyeOff' : 'eye'); tap();
});
/* ระดับความปลอดภัยไล่สี — ใช้เฉพาะรหัสผ่านที่ตั้งเอง */
function pwStrength(p) {
  var r = { len: p.length >= 10, up: /[A-Z]/.test(p), low: /[a-z]/.test(p), num: /[0-9]/.test(p), sp: /[^A-Za-z0-9]/.test(p) };
  var score = (r.len ? 1 : 0) + (r.up ? 1 : 0) + (r.low ? 1 : 0) + (r.num ? 1 : 0) + (r.sp ? 1 : 0) + (p.length >= 14 ? 1 : 0);
  var lv = [['อ่อนมาก', '#D93025'], ['อ่อน', '#E8590C'], ['พอใช้', '#F07C1E'], ['ปานกลาง', '#7CB342'], ['ดี', '#43A047'], ['แข็งแรงมาก', '#1E8E3E']][clamp(score - 1, 0, 5)];
  return { rules: r, score: score, label: p ? lv[0] : '-', color: lv[1], pct: p ? clamp(score / 6 * 100, 8, 100) : 0, ok: r.len && r.up && r.low && r.num };
}
function bindMeter(id) {
  var inp = document.getElementById(id); if (!inp) return;
  inp.addEventListener('input', function () {
    var s = pwStrength(inp.value);
    var m = document.getElementById(id + 'M'); m.style.width = s.pct + '%'; m.style.background = s.color;
    var l = document.getElementById(id + 'L'); l.textContent = 'ระดับความปลอดภัย: ' + s.label; l.style.color = s.color;
    $$('#' + id + 'R li').forEach(function (li) { li.classList.toggle('ok', !!s.rules[li.getAttribute('data-r')]); });
  });
}
function setErr(id, msg) {
  var e = document.getElementById(id + 'E'); if (e) e.textContent = msg || '';
  var inp = document.getElementById(id); if (inp && inp.closest('.input')) { var box = inp.closest('.input'); box.classList.toggle('invalid', !!msg); if (msg) { void box.offsetWidth; } }
}

/* ---------------- login ---------------- */
var oauthUrls = {};
function socialButtons(mode) {
  var prov = (S.flags && S.flags.providers) || {};
  var list = [['google', 'Google'], ['apple', 'Apple'], ['facebook', 'Facebook'], ['line', 'LINE']];
  return '<div class="social">' + list.map(function (p) {
    var label = (mode === 'register' ? 'สมัครด้วยบัญชี ' : 'ดำเนินการต่อด้วย ') + p[1];
    return '<a href="#" data-oauth="' + p[0] + '" class="' + (prov[p[0]] ? '' : 'off') + '">' + BRAND[p[0]] + '<span>' + label + '</span></a>';
  }).join('') + '</div>';
}
function prefetchOauth() {
  var prov = (S.flags && S.flags.providers) || {};
  Object.keys(prov).forEach(function (k) {
    if (!prov[k]) return;
    api('oauthStart', { provider: k, mode: 'login' }, { silent: true }).then(function (r) {
      oauthUrls[k] = { url: r.url, t: Date.now() };
      var a = document.querySelector('[data-oauth="' + k + '"]'); if (a) { a.href = r.url; a.target = '_top'; }
    }).catch(function () {});
  });
}
on(document, 'click', '[data-oauth]', function (e, a) {
  var k = a.getAttribute('data-oauth');
  var cached = oauthUrls[k];
  if (cached && Date.now() - cached.t < 10 * 60e3) { tap(); return; } // ลิงก์พร้อมแล้ว — ให้เบราว์เซอร์นำทางไปหน้าผู้ให้บริการ
  e.preventDefault();
  var prov = (S.flags && S.flags.providers) || {};
  if (!prov[k]) { alertBox('ยังไม่เปิดให้บริการ', 'ผู้ดูแลระบบยังไม่ได้เปิดใช้งานการเข้าสู่ระบบด้วยบัญชี ' + a.textContent.replace(/^.*ด้วย(บัญชี)?\s*/, '') + ' กรุณาเข้าสู่ระบบด้วยชื่อผู้ใช้งานและรหัสผ่าน หรือติดต่อผู้ดูแลระบบ', { icon: 'info' }); return; }
  withLoading('กำลังเชื่อมต่อผู้ให้บริการ', api('oauthStart', { provider: k, mode: 'login' })).then(function (r) {
    oauthUrls[k] = { url: r.url, t: Date.now() };
    try { window.top.location.href = r.url; } catch (err) { window.open(r.url, '_blank'); }
  }).catch(function (er) { toast('ไม่สามารถเชื่อมต่อได้', er.msg, 'bad'); });
});

function renderLogin(prefill) {
  document.body.classList.remove('readable');
  ROOT.innerHTML = pubHeader('welcome') + '<main class="auth-wrap enter"><div class="auth-card">' +
    '<div class="auth-head"><img src="' + LOGO + '" alt=""><span class="t1">THAI LAW LIBRARY</span><h2>คลังกฎหมาย</h2><p class="muted">เข้าสู่ระบบ (Sign In)</p></div>' +
    '<form id="loginForm" class="col" style="gap:14px" novalidate autocomplete="on">' +
      '<div class="field"><label for="lUser">ชื่อผู้ใช้งาน หรือ รหัสสมาชิก <span class="req">*</span></label><div class="input">' + ic('user') + '<input id="lUser" autocomplete="username" placeholder="Username / Member ID" maxlength="40" value="' + esc(prefill || store.get('lastUser', '')) + '"></div><div class="err" id="lUserE"></div></div>' +
      pwField('lAdmin', 'รหัสผ่านชั้นที่ 1 (จากผู้ดูแลระบบ)', { icon: 'shield', ph: 'Administrator Password', hint: 'รหัสผ่านที่ได้รับจากผู้ดูแลระบบ ผู้ใช้งานไม่สามารถกำหนดเองได้' }) +
      pwField('lPass', 'รหัสผ่านชั้นที่ 3 (รหัสผ่านส่วนตัว)', { icon: 'key', ph: 'Personal Password', ac: 'current-password', hint: 'รหัสผ่านที่ท่านกำหนดเองในขั้นตอนสมัครสมาชิก' }) +
      '<div class="panel flat otp-note"><span>' + ic('mail') + '</span><p class="small">รหัสผ่านชั้นที่ 2 คือรหัส 6 หลักที่ระบบส่งไปยังอีเมลของท่านทุกครั้ง หลังจากรหัสผ่านชั้นที่ 1 และชั้นที่ 3 ถูกต้อง</p></div>' +
      '<div class="row" style="justify-content:space-between;flex-wrap:wrap"><label class="check"><input type="checkbox" id="lRemember" checked><span>จดจำการเข้าสู่ระบบ</span></label><button type="button" class="btn sm ghost" data-go="forgot" style="color:var(--sky-700)">ลืมรหัสผ่าน?</button></div>' +
      '<button class="btn lg k block" type="submit">' + ic('lock') + ' เข้าสู่ระบบ</button>' +
    '</form>' +
    '<div class="or">หรือ</div>' + socialButtons('login') +
    '<p class="muted small" style="text-align:center;margin-top:16px">ยังไม่มีบัญชี? <a href="#" data-go="register"><b>สมัครสมาชิก</b></a></p>' +
    '<div class="panel flat" style="margin-top:14px;padding:14px"><div class="row" style="align-items:flex-start">' + '<span style="color:var(--orange)">' + ic('info') + '</span><div class="grow small"><b>ยังไม่ได้รับรหัสผ่านจากผู้ดูแลระบบ?</b><div class="muted">กรุณาติดต่อผู้ดูแลระบบเพื่อขอรับรหัสผ่านชั้นที่ 1 ก่อนเข้าสู่ระบบหรือสมัครสมาชิก</div><button class="btn sm" data-go="contact" style="margin-top:8px">' + ic('mail') + ' ช่องทางติดต่อผู้ดูแลระบบ</button></div></div></div>' +
    '<div class="row" style="justify-content:center;margin-top:12px"><button class="btn sm ghost" data-go="welcome">' + ic('arrowL') + ' กลับหน้าหลัก</button></div>' +
    '</div></main>';
  prefetchOauth();
  clientInfo();
  $('#loginForm').onsubmit = function (e) {
    e.preventDefault();
    var u = $('#lUser').value.trim(), a = $('#lAdmin').value, p = $('#lPass').value;
    setErr('lUser'); setErr('lAdmin'); setErr('lPass');
    var bad = false;
    if (!u) { setErr('lUser', 'กรุณากรอกชื่อผู้ใช้งานหรือรหัสสมาชิก'); bad = true; }
    if (!a) { setErr('lAdmin', 'กรุณากรอกรหัสผ่านชั้นที่ 1'); bad = true; }
    if (!p) { setErr('lPass', 'กรุณากรอกรหัสผ่านส่วนตัว'); bad = true; }
    if (bad) return;
    var remember = $('#lRemember').checked;
    function doLogin() {
      withLoading('กำลังตรวจสอบข้อมูลเข้าสู่ระบบ', clientInfo().then(function (ci) { return api('login', { username: u, adminPass: a, personalPass: p, client: ci }, { timeout: 30000 }); }), doLogin)
        .then(function (r) { store.set('lastUser', u); if (r.otpRequired) otpFlow(r, remember); else onLoggedIn(r, remember); })
        .catch(function (er) {
          if (er.code === 'LOCKED' || er.code === 'ACCOUNT_SUSPENDED') alertBox('ไม่สามารถเข้าสู่ระบบได้', er.msg + (er.code === 'ACCOUNT_SUSPENDED' ? '' : ''), { icon: 'lock', tone: 'bad' });
          else { setErr('lPass', er.msg || SYS_DOWN_TEXT); if (window._lastFail) window._lastFail(); window._lastFail = toast('เข้าสู่ระบบไม่สำเร็จ', er.msg || SYS_DOWN_TEXT, 'bad'); }
        });
    }
    doLogin();
  };
}

/* หลังยืนยันโซเชียล: ขอรหัสผ่านส่วนตัว (ชั้นที่ 3) ก่อนเข้าสู่ระบบ */
function handleSocialBoot(soc) {
  try { google.script.history.replace(null, {}, ''); } catch (e) {}
  if (!soc) return false;
  if (!soc.ok) { renderLogin(); toast('เข้าสู่ระบบด้วยบัญชีโซเชียลไม่สำเร็จ', soc.msg, 'bad', { life: 7000 }); return true; }
  if (soc.mode === 'link') { toast('เชื่อมต่อบัญชีสำเร็จ', soc.msg, 'ok'); return false; }
  if (!soc.linked) {
    renderRegister({ ticket: soc.ticket, provider: soc.provider, name: soc.name });
    toast('ยืนยันตัวตนกับ ' + soc.provider + ' แล้ว', 'บัญชีนี้ยังไม่ได้ผูกกับสมาชิก กรุณาสมัครสมาชิกให้ครบถ้วน ระบบจะผูกบัญชีให้อัตโนมัติ', 'ok', { life: 7000 });
    return true;
  }
  renderLogin(soc.username);
  modal({
    title: 'ยืนยันรหัสผ่านส่วนตัว', icon: 'key', sub: 'ยืนยันตัวตนกับ ' + soc.provider + ' สำเร็จ บัญชี ' + soc.username,
    html: pwField('sPass', 'รหัสผ่านชั้นที่ 3 (รหัสผ่านส่วนตัว)', { icon: 'key' }),
    ok: 'เข้าสู่ระบบ',
    onOk: function (m) {
      var p = $('#sPass', m).value; if (!p) { setErr('sPass', 'กรุณากรอกรหัสผ่านส่วนตัว'); return false; }
      return clientInfo().then(function (ci) { return api('socialLogin', { ticket: soc.ticket, personalPass: p, client: ci }); })
        .then(function (r) { if (r.otpRequired) setTimeout(function () { otpFlow(r, true); }, 320); else onLoggedIn(r, true); return true; })
        .catch(function (er) { setErr('sPass', er.msg); return false; });
    }
  });
  return true;
}

/* ---------------- forgot password ---------------- */
function renderForgot() {
  ROOT.innerHTML = pubHeader('login') + '<main class="auth-wrap enter"><div class="auth-card">' +
    '<div class="auth-head"><img src="' + LOGO + '" alt=""><span class="t1">THAI LAW LIBRARY</span><h2>ลืมรหัสผ่าน</h2><p class="muted">ตั้งรหัสผ่านส่วนตัวใหม่ด้วยคำถามสำหรับกู้คืนบัญชี</p></div>' +
    '<div class="col" style="gap:14px" id="fgBox">' +
      '<div class="field"><label for="fUser">ชื่อผู้ใช้งาน หรือ รหัสสมาชิก <span class="req">*</span></label><div class="input">' + ic('user') + '<input id="fUser" maxlength="40"></div><div class="err" id="fUserE"></div></div>' +
      '<button class="btn k block" id="fNext">' + ic('arrowR') + ' ถัดไป</button>' +
    '</div>' +
    '<p class="muted small" style="margin-top:14px">หากจำคำตอบสำหรับกู้คืนบัญชีไม่ได้ กรุณา<a href="#" data-go="contact">ติดต่อผู้ดูแลระบบ</a> เพื่อยืนยันตัวตนและรีเซ็ตรหัสผ่าน</p>' +
    '<div class="row" style="justify-content:center;margin-top:10px"><button class="btn sm ghost" data-go="login">' + ic('arrowL') + ' กลับหน้าเข้าสู่ระบบ</button></div></div></main>';
  $('#fNext').onclick = function () {
    var u = $('#fUser').value.trim(); if (!u) { setErr('fUser', 'กรุณากรอกชื่อผู้ใช้งาน'); return; }
    withLoading('กำลังค้นหาบัญชี', api('forgotPassword', { username: u, step: 'question' })).then(function (r) {
      $('#fgBox').innerHTML = '<div class="panel flat"><div class="muted small">คำถามสำหรับกู้คืนบัญชี</div><b>' + esc(r.question) + '</b></div>' +
        '<div class="field"><label for="fAns">คำตอบ <span class="req">*</span></label><div class="input">' + ic('help') + '<input id="fAns" maxlength="120"></div></div>' +
        pwField('fAdmin', 'รหัสผ่านชั้นที่ 1 (จากผู้ดูแลระบบ)', { icon: 'shield' }) +
        pwField('fNew', 'รหัสผ่านส่วนตัวใหม่', { meter: true }) + pwField('fNew2', 'ยืนยันรหัสผ่านส่วนตัวใหม่', {}) +
        '<button class="btn k block" id="fSave">' + ic('check') + ' ตั้งรหัสผ่านใหม่</button>';
      bindMeter('fNew');
      $('#fSave').onclick = function () {
        var n = $('#fNew').value;
        if (!pwStrength(n).ok) { setErr('fNew', 'รหัสผ่านยังไม่ตรงตามข้อกำหนด'); return; }
        if (n !== $('#fNew2').value) { setErr('fNew2', 'รหัสผ่านทั้งสองช่องไม่ตรงกัน'); return; }
        confirmBox('ยืนยันการตั้งรหัสผ่านใหม่', 'ระบบจะออกจากระบบในทุกอุปกรณ์หลังเปลี่ยนรหัสผ่าน ท่านต้องการดำเนินการต่อหรือไม่').then(function (ok) {
          if (!ok) return;
          withLoading('กำลังบันทึก', api('forgotPassword', { username: u, step: 'reset', answer: $('#fAns').value, adminPass: $('#fAdmin').value, newPass: n }))
            .then(function (r2) { alertBox('ตั้งรหัสผ่านใหม่สำเร็จ', r2.msg, { icon: 'check' }).then(function () { renderLogin(u); }); })
            .catch(function (er) { toast('ไม่สามารถตั้งรหัสผ่านใหม่ได้', er.msg, 'bad'); });
        });
      };
    }).catch(function (er) { setErr('fUser', er.msg); });
  };
}

/* ---------------- register (multi-step) ---------------- */
var REG = {};
var TITLES = ['นาย', 'นาง', 'นางสาว', 'เด็กชาย', 'เด็กหญิง', 'ดร.', 'ผศ.', 'รศ.', 'ศ.', 'อื่น ๆ'];
var MEMBER_TYPES = ['นักเรียน', 'นักศึกษา', 'บุคลากรทางกฎหมาย', 'ข้าราชการ / พนักงานภาครัฐ', 'พนักงานเอกชน', 'ประชาชนทั่วไป', 'อื่น ๆ'];
var EDU_LEVELS = ['มัธยมศึกษาตอนต้น', 'มัธยมศึกษาตอนปลาย', 'ประกาศนียบัตรวิชาชีพ (ปวช.)', 'ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)', 'ปริญญาตรี', 'ปริญญาโท', 'ปริญญาเอก', 'อื่น ๆ'];
var FACULTIES = ['คณะนิติศาสตร์', 'คณะรัฐศาสตร์', 'คณะรัฐประศาสนศาสตร์', 'คณะสังคมศาสตร์', 'คณะอื่น ๆ'];
var CAREERS = ['ผู้พิพากษา', 'อัยการ', 'ทนายความ', 'นิติกร', 'เจ้าหน้าที่ศาล', 'เจ้าหน้าที่ราชทัณฑ์', 'นักกฎหมาย', 'ข้าราชการ', 'อื่น ๆ'];
var RECOVERY_QS = ['ชื่อโรงเรียนประถมศึกษาแห่งแรกของท่าน', 'ชื่อสัตว์เลี้ยงตัวแรกของท่าน', 'จังหวัดที่ท่านเกิด', 'ชื่อเล่นของเพื่อนสนิทในวัยเด็ก', 'กฎหมายฉบับแรกที่ท่านอ่านจนจบ', 'กำหนดคำถามเอง'];

function selectField(id, label, options, val, req, otherId) {
  return '<div class="field"><label for="' + id + '">' + esc(label) + (req ? ' <span class="req">*</span>' : '') + '</label><div class="input"><select id="' + id + '"' + (otherId ? ' data-other="' + otherId + '"' : '') + '><option value="">— เลือก —</option>' +
    options.map(function (o) { return '<option' + (o === val ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>' + ic('chevD') + '</div>' +
    (otherId ? '<div class="input ' + (/อื่น|กำหนดคำถามเอง/.test(val || '') ? '' : 'hidden') + '" id="' + otherId + 'W" style="margin-top:6px"><input id="' + otherId + '" placeholder="โปรดระบุ" maxlength="120" value="' + esc(REG[otherId] || '') + '"></div>' : '') +
    '<div class="err" id="' + id + 'E"></div></div>';
}
/* ช่องกรอกเพิ่มอัตโนมัติเมื่อเลือก "อื่น ๆ" */
on(document, 'change', 'select[data-other]', function (e, s) {
  var w = document.getElementById(s.getAttribute('data-other') + 'W'); if (!w) return;
  var show = /อื่น|กำหนดคำถามเอง/.test(s.value); w.classList.toggle('hidden', !show);
  if (show) { w.classList.add('enter'); w.querySelector('input').focus(); }
});
function textField(id, label, val, req, opt) {
  opt = opt || {};
  return '<div class="field"><label for="' + id + '">' + esc(label) + (req ? ' <span class="req">*</span>' : '') + '</label><div class="input">' + (opt.icon ? ic(opt.icon) : '') + '<input id="' + id + '" type="' + (opt.type || 'text') + '" maxlength="' + (opt.max || 120) + '" value="' + esc(val || '') + '"' + (opt.ph ? ' placeholder="' + esc(opt.ph) + '"' : '') + (opt.ac ? ' autocomplete="' + opt.ac + '"' : '') + '></div>' + (opt.hint ? '<div class="hint">' + esc(opt.hint) + '</div>' : '') + '<div class="err" id="' + id + 'E"></div></div>';
}

function renderRegister(social) {
  document.body.classList.remove('readable');
  if (social && social.ticket) { REG.socialTicket = social.ticket; REG.socialProvider = social.provider; if (social.name && !REG.firstName) { var nm = social.name.split(' '); REG.firstName = nm[0]; REG.lastName = nm.slice(1).join(' '); } }
  REG.step = REG.step || 1;
  ROOT.innerHTML = pubHeader('welcome') + '<main class="auth-wrap enter"><div class="auth-card wide">' +
    '<div class="auth-head"><img src="' + LOGO + '" alt=""><span class="t1">THAI LAW LIBRARY</span><h2>สมัครสมาชิก</h2><p class="muted" id="regSub"></p></div>' +
    '<div class="steps" id="regSteps"><i></i><i></i><i></i><i></i></div><div id="regBody"></div></div></main>';
  regStep(REG.step);
}
function regStep(n) {
  REG.step = n;
  $$('#regSteps i').forEach(function (el, i) { el.className = i + 1 < n ? 'done' : i + 1 === n ? 'on' : ''; });
  var subs = ['', 'ขั้นตอนที่ 1 จาก 4 — ข้อมูลประจำตัว', 'ขั้นตอนที่ 2 จาก 4 — ข้อมูลการศึกษาและการทำงาน', 'ขั้นตอนที่ 3 จาก 4 — ข้อมูลบัญชีผู้ใช้งาน', 'ขั้นตอนที่ 4 จาก 4 — ตรวจสอบและยืนยัน'];
  $('#regSub').textContent = subs[n];
  var b = $('#regBody'); b.classList.remove('subpanel'); void b.offsetWidth; b.classList.add('subpanel');
  if (n === 1) {
    b.innerHTML = (REG.socialProvider ? '<div class="panel flat" style="margin-bottom:12px"><span class="tag ok">' + ic('check') + ' ยืนยันตัวตนกับ ' + esc(REG.socialProvider) + ' แล้ว</span> <span class="muted small">ระบบจะผูกบัญชีให้อัตโนมัติเมื่อสมัครสำเร็จ</span></div>' : '') +
      '<div class="grid g2">' + selectField('rTitle', 'คำนำหน้าชื่อ', TITLES, REG.title, true, 'rTitleO') + textField('rDisplay', 'ชื่อที่ใช้แสดงในระบบ (Display Name)', REG.displayName, true) +
      textField('rFirst', 'ชื่อจริง', REG.firstName, true, { ac: 'given-name' }) + textField('rLast', 'นามสกุล', REG.lastName, true, { ac: 'family-name' }) +
      textField('rBirth', 'วันเดือนปีเกิด', REG.birthDate, true, { type: 'date' }) + selectField('rGender', 'เพศ (ไม่บังคับ)', ['ชาย', 'หญิง', 'ไม่ระบุ', 'อื่น ๆ'], REG.gender, false, 'rGenderO') + '</div>' +
      '<div style="margin-top:12px">' + textField('rEmail', 'อีเมล (สำหรับรับรหัสผ่านชั้นที่ 2)', REG.email, true, { type: 'email', ac: 'email', max: 120, ph: 'name@example.com', hint: 'ทุกครั้งที่เข้าสู่ระบบ ระบบจะส่งรหัสผ่านชั้นที่ 2 (รหัส 6 หลัก ใช้ครั้งเดียว) ไปยังอีเมลนี้' }) + '</div>' +
      '<div class="field" style="margin-top:12px"><span class="lbl">รูปโปรไฟล์ (ไม่บังคับ)</span><div class="row"><div class="avatar" id="rAvPrev" style="width:72px;height:72px">' + (REG.avatarDataUrl ? '<img src="' + REG.avatarDataUrl + '" alt="" style="width:100%;height:100%;object-fit:cover">' : ic('camera')) + '</div><label class="btn">' + ic('upload') + ' เลือกไฟล์<input type="file" id="rAv" class="sr"></label><span class="muted small">รองรับไฟล์ทุกประเภทและทุกขนาด ระบบจะปรับภาพให้คมชัดและเหมาะสมอัตโนมัติ</span></div></div>' +
      '<div class="row" style="margin-top:20px"><button class="btn" data-go="welcome">ยกเลิก</button><span class="spacer"></span><button class="btn k" id="rNext1">ถัดไป ' + ic('arrowR') + '</button></div>';
    $('#rAv').onchange = function () { pickAvatar(this.files[0]).then(function (r) { REG.avatarDataUrl = r.dataUrl; $('#rAvPrev').innerHTML = '<img src="' + r.dataUrl + '" alt="" style="width:100%;height:100%;object-fit:cover">'; }).catch(function (e) { toast('ไม่สามารถใช้ไฟล์นี้เป็นรูปโปรไฟล์ได้', e.message, 'warn'); }); };
    $('#rNext1').onclick = function () {
      REG.title = $('#rTitle').value === 'อื่น ๆ' ? $('#rTitleO').value.trim() : $('#rTitle').value; REG.titleSel = $('#rTitle').value; REG.rTitleO = $('#rTitleO').value;
      REG.displayName = $('#rDisplay').value.trim(); REG.firstName = $('#rFirst').value.trim(); REG.lastName = $('#rLast').value.trim(); REG.birthDate = $('#rBirth').value;
      REG.gender = $('#rGender').value === 'อื่น ๆ' ? $('#rGenderO').value.trim() : $('#rGender').value;
      REG.email = $('#rEmail').value.trim().toLowerCase();
      var ok = true;
      if (!/^[^\s@<>()",;:]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(REG.email)) { setErr('rEmail', 'กรุณากรอกอีเมลที่ถูกต้อง ระบบจะส่งรหัสผ่านชั้นที่ 2 ไปยังอีเมลนี้'); ok = false; } else setErr('rEmail', '');
      [['rTitle', REG.title, 'กรุณาเลือกหรือระบุคำนำหน้าชื่อ'], ['rDisplay', REG.displayName, 'กรุณากรอกชื่อที่ใช้แสดง'], ['rFirst', REG.firstName, 'กรุณากรอกชื่อจริง'], ['rLast', REG.lastName, 'กรุณากรอกนามสกุล'], ['rBirth', REG.birthDate, 'กรุณาระบุวันเดือนปีเกิด']].forEach(function (x) { setErr(x[0], x[1] ? '' : x[2]); if (!x[1]) ok = false; });
      if (REG.birthDate && new Date(REG.birthDate) > new Date()) { setErr('rBirth', 'วันเกิดต้องไม่เป็นวันในอนาคต'); ok = false; }
      if (ok) regStep(2);
    };
  } else if (n === 2) {
    b.innerHTML = '<span class="lbl">สถานะของผู้สมัคร (เลือกได้หนึ่งประเภท) <span class="req">*</span></span><div class="radio-cards" style="margin:8px 0 14px">' +
      MEMBER_TYPES.map(function (m) { return '<label><input type="radio" name="rType" value="' + esc(m) + '"' + (REG.memberType === m ? ' checked' : '') + '>' + esc(m) + '</label>'; }).join('') + '</div><div class="err" id="rTypeE"></div><div id="rTypeFields"></div>' +
      '<div class="row" style="margin-top:20px"><button class="btn" id="rBack2">' + ic('arrowL') + ' ย้อนกลับ</button><span class="spacer"></span><button class="btn k" id="rNext2">ถัดไป ' + ic('arrowR') + '</button></div>';
    function fields() {
      var t = REG.memberType || '', box = $('#rTypeFields'), e = REG.education || {}, w = REG.work || {};
      if (t === 'นักเรียน' || t === 'นักศึกษา') {
        box.innerHTML = '<div class="grid g2 enter">' + textField('eSchool', 'ชื่อมหาวิทยาลัยหรือสถานศึกษา', e.school, true) + selectField('eFac', 'คณะ', FACULTIES, e.facultySel || e.faculty, true, 'eFacO') + textField('eMajor', 'สาขาวิชา', e.major, true) + selectField('eLevel', 'ระดับการศึกษา', EDU_LEVELS, e.levelSel || e.level, true, 'eLevelO') + selectField('eYear', 'ชั้นปีที่กำลังศึกษา', ['ปีที่ 1', 'ปีที่ 2', 'ปีที่ 3', 'ปีที่ 4', 'ปีที่ 5', 'ปีที่ 6', 'อื่น ๆ'], e.yearSel || e.year, true, 'eYearO') + '</div>';
      } else if (t) {
        box.innerHTML = '<div class="grid g2 enter">' + textField('wOrg', t === 'ประชาชนทั่วไป' || t === 'อื่น ๆ' ? 'หน่วยงานหรือองค์กร (ถ้ามี)' : 'หน่วยงานหรือองค์กรที่สังกัด', w.org, !(t === 'ประชาชนทั่วไป' || t === 'อื่น ๆ')) + textField('wPos', 'ตำแหน่งงาน' + (t === 'ประชาชนทั่วไป' || t === 'อื่น ๆ' ? ' (ถ้ามี)' : ''), w.position, !(t === 'ประชาชนทั่วไป' || t === 'อื่น ๆ')) + selectField('wCareer', 'สายงานหรือสาขาอาชีพ', CAREERS, w.careerSel || w.career, t === 'บุคลากรทางกฎหมาย', 'wCareerO') + textField('wExp', 'ประสบการณ์ทำงาน (ไม่บังคับ)', w.experience, false, { ph: 'เช่น 3 ปี' }) +
          (t === 'อื่น ๆ' ? textField('wOther', 'โปรดระบุสถานะ', w.otherType, true) : '') + '</div>';
      } else box.innerHTML = '';
    }
    fields();
    on(b, 'change', 'input[name=rType]', function (ev, r) { REG.memberType = r.value; fields(); setErr('rType'); });
    $('#rBack2').onclick = function () { regStep(1); };
    $('#rNext2').onclick = function () {
      var t = REG.memberType; if (!t) { $('#rTypeE').textContent = 'กรุณาเลือกสถานะของผู้สมัคร'; return; }
      var ok = true;
      function need(id, v, msg) { setErr(id, v ? '' : msg); if (!v) ok = false; }
      function sv(id) { var s = $('#' + id); return s.value === 'อื่น ๆ' || s.value === 'คณะอื่น ๆ' ? ($('#' + id + 'O').value.trim() ? 'อื่น ๆ: ' + $('#' + id + 'O').value.trim() : '') : s.value; }
      if (t === 'นักเรียน' || t === 'นักศึกษา') {
        REG.education = { school: $('#eSchool').value.trim(), faculty: sv('eFac'), facultySel: $('#eFac').value, major: $('#eMajor').value.trim(), level: sv('eLevel'), levelSel: $('#eLevel').value, year: sv('eYear'), yearSel: $('#eYear').value };
        REG.work = {};
        need('eSchool', REG.education.school, 'กรุณากรอกชื่อสถานศึกษา'); need('eFac', REG.education.faculty, 'กรุณาเลือกหรือระบุคณะ'); need('eMajor', REG.education.major, 'กรุณากรอกสาขาวิชา'); need('eLevel', REG.education.level, 'กรุณาเลือกระดับการศึกษา'); need('eYear', REG.education.year, 'กรุณาเลือกชั้นปี');
      } else {
        var reqd = !(t === 'ประชาชนทั่วไป' || t === 'อื่น ๆ');
        REG.work = { org: $('#wOrg').value.trim(), position: $('#wPos').value.trim(), career: sv('wCareer'), careerSel: $('#wCareer').value, experience: $('#wExp').value.trim(), otherType: $('#wOther') ? $('#wOther').value.trim() : '' };
        REG.education = {};
        if (reqd) { need('wOrg', REG.work.org, 'กรุณากรอกหน่วยงาน'); need('wPos', REG.work.position, 'กรุณากรอกตำแหน่งงาน'); }
        if (t === 'บุคลากรทางกฎหมาย') need('wCareer', REG.work.career, 'กรุณาเลือกสายงาน');
        if (t === 'อื่น ๆ') need('wOther', REG.work.otherType, 'กรุณาระบุสถานะ');
      }
      if (ok) regStep(3);
    };
  } else if (n === 3) {
    b.innerHTML = '<div class="grid g2">' +
      '<div class="field"><label for="rUser">ชื่อผู้ใช้งาน (Username) <span class="req">*</span></label><div class="input">' + ic('user') + '<input id="rUser" maxlength="24" autocomplete="username" value="' + esc(REG.username || '') + '" placeholder="ภาษาอังกฤษหรือตัวเลข 4–24 ตัว"></div><div class="hint" id="rUserH">ใช้ตัวอักษรภาษาอังกฤษ ตัวเลข _ และ . ได้</div><div class="err" id="rUserE"></div></div>' +
      '<div class="field"><span class="lbl">รหัสสมาชิก (Member ID)</span><div class="input" style="background:var(--sky-50)">' + ic('badge') + '<input value="ระบบสร้างให้อัตโนมัติเมื่อสมัครสำเร็จ" disabled></div></div>' +
      pwField('rAdmin', 'รหัสผ่านจากผู้ดูแลระบบ (Administrator Password)', { icon: 'shield', hint: 'รหัสผ่านที่ได้รับจากผู้ดูแลระบบ' }) + pwField('rAdmin2', 'กรอกรหัสผ่านจากผู้ดูแลระบบอีกครั้ง', { icon: 'shield' }) +
      pwField('rPass', 'ตั้งรหัสผ่านส่วนตัว (Personal Password)', { meter: true, ac: 'new-password' }) + pwField('rPass2', 'ยืนยันรหัสผ่านส่วนตัว', { ac: 'new-password' }) +
      selectField('rQ', 'คำถามสำหรับการกู้คืนบัญชี (Recovery Question)', RECOVERY_QS, REG.recoveryQSel, true, 'rQO') +
      textField('rA', 'คำตอบสำหรับการกู้คืนบัญชี (Recovery Answer)', REG.recoveryA, true, { hint: 'ไม่แยกตัวพิมพ์ใหญ่และเล็ก กรุณาจดจำคำตอบนี้' }) + '</div>' +
      '<div class="panel flat" style="margin-top:12px;padding:12px"><div class="row" style="align-items:flex-start"><span style="color:var(--orange)">' + ic('info') + '</span><span class="small muted">ยังไม่ได้รับรหัสผ่านจากผู้ดูแลระบบ? <a href="#" data-go="contact">ติดต่อผู้ดูแลระบบ</a> ข้อมูลที่กรอกไว้จะยังคงอยู่</span></div></div>' +
      '<div class="row" style="margin-top:20px"><button class="btn" id="rBack3">' + ic('arrowL') + ' ย้อนกลับ</button><span class="spacer"></span><button class="btn k" id="rNext3">ถัดไป ' + ic('arrowR') + '</button></div>';
    bindMeter('rPass');
    var chk = debounce(function () {
      var u = $('#rUser') && $('#rUser').value.trim(); if (!u) return;
      api('checkUsername', { username: u }).then(function (r) { var hh = $('#rUserH'); if (!hh) return; hh.textContent = r.msg; hh.style.color = r.available ? 'var(--ok)' : 'var(--bad)'; $('#rUser').closest('.input').classList.toggle('valid', r.available); }).catch(function () {});
    }, 500);
    $('#rUser').addEventListener('input', chk);
    $('#rBack3').onclick = function () { saveStep3(); regStep(2); };
    function saveStep3() {
      REG.username = $('#rUser').value.trim(); REG.recoveryQSel = $('#rQ').value; REG.rQO = $('#rQO').value;
      REG.recoveryQ = $('#rQ').value === 'กำหนดคำถามเอง' ? $('#rQO').value.trim() : $('#rQ').value; REG.recoveryA = $('#rA').value.trim();
    }
    $('#rNext3').onclick = function () {
      saveStep3();
      var a1 = $('#rAdmin').value, a2 = $('#rAdmin2').value, p1 = $('#rPass').value, p2 = $('#rPass2').value, ok = true;
      ['rUser', 'rAdmin', 'rAdmin2', 'rPass', 'rPass2', 'rQ', 'rA'].forEach(function (id) { setErr(id); });
      if (!/^[A-Za-z0-9_.]{4,24}$/.test(REG.username)) { setErr('rUser', 'ชื่อผู้ใช้งานต้องเป็นภาษาอังกฤษหรือตัวเลข 4–24 ตัวอักษร'); ok = false; }
      if (!a1) { setErr('rAdmin', 'กรุณากรอกรหัสผ่านจากผู้ดูแลระบบ'); ok = false; }
      if (a1.trim().replace(/\s+/g, ' ').toUpperCase() !== a2.trim().replace(/\s+/g, ' ').toUpperCase()) { setErr('rAdmin2', 'รหัสผ่านจากผู้ดูแลระบบทั้งสองช่องไม่ตรงกัน'); ok = false; }
      if (!pwStrength(p1).ok) { setErr('rPass', 'รหัสผ่านต้องยาวอย่างน้อย 10 ตัวอักษร มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข'); ok = false; }
      if (p1 !== p2) { setErr('rPass2', 'รหัสผ่านส่วนตัวทั้งสองช่องไม่ตรงกัน'); ok = false; }
      if (p1 && p1.toUpperCase() === a1.trim().toUpperCase()) { setErr('rPass', 'รหัสผ่านส่วนตัวต้องไม่เหมือนกับรหัสผ่านจากผู้ดูแลระบบ'); ok = false; }
      if (!REG.recoveryQ) { setErr('rQ', 'กรุณาเลือกหรือกำหนดคำถาม'); ok = false; }
      if (!REG.recoveryA) { setErr('rA', 'กรุณากรอกคำตอบ'); ok = false; }
      if (!ok) return;
      REG._a1 = a1; REG._a2 = a2; REG._p1 = p1; REG._p2 = p2;
      regStep(4);
    };
  } else if (n === 4) {
    var e = REG.education || {}, w = REG.work || {};
    var rows = [['คำนำหน้าชื่อ', REG.title], ['ชื่อ - นามสกุล', REG.firstName + ' ' + REG.lastName], ['ชื่อที่ใช้แสดง', REG.displayName], ['วันเดือนปีเกิด', REG.birthDate ? fmtDate(REG.birthDate + 'T00:00:00', true) : '-'], ['เพศ', REG.gender || 'ไม่ระบุ'], ['อีเมล', REG.email], ['สถานะผู้สมัคร', REG.memberType]];
    if (e.school) rows = rows.concat([['สถานศึกษา', e.school], ['คณะ', e.faculty], ['สาขาวิชา', e.major], ['ระดับการศึกษา', e.level], ['ชั้นปี', e.year]]);
    if (w.org || w.position || w.career) rows = rows.concat([['หน่วยงาน', w.org || '-'], ['ตำแหน่ง', w.position || '-'], ['สายงาน', w.career || '-'], ['ประสบการณ์', w.experience || '-']]);
    rows = rows.concat([['ชื่อผู้ใช้งาน', REG.username], ['คำถามกู้คืนบัญชี', REG.recoveryQ]]);
    b.innerHTML = '<div class="panel flat"><dl class="kv">' + rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1] || '-') + '</dd>'; }).join('') + '</dl></div>' +
      '<label class="check" style="margin-top:14px"><input type="checkbox" id="rAccept"><span>ข้าพเจ้าได้อ่านและยอมรับ <a href="#" data-doc="terms">ข้อกำหนดการใช้งาน</a> และ <a href="#" data-doc="privacy">นโยบายความเป็นส่วนตัว</a></span></label><div class="err" id="rAcceptE"></div>' +
      '<div class="row" style="margin-top:20px"><button class="btn" id="rBack4">' + ic('arrowL') + ' แก้ไขข้อมูล</button><span class="spacer"></span><button class="btn o lg" id="rSubmit">' + ic('check') + ' ยืนยันการสมัครสมาชิก</button></div>';
    $('#rBack4').onclick = function () { regStep(3); };
    $('#rSubmit').onclick = function () {
      if (!$('#rAccept').checked) { $('#rAcceptE').textContent = 'กรุณายอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัว'; return; }
      confirmBox('ยืนยันการสมัครสมาชิก', 'ระบบจะตรวจสอบข้อมูลและสร้างบัญชีสมาชิกให้ท่าน ท่านต้องการดำเนินการต่อหรือไม่').then(function (ok) {
        if (!ok) return;
        var form = { title: REG.title, firstName: REG.firstName, lastName: REG.lastName, displayName: REG.displayName, birthDate: REG.birthDate, gender: REG.gender, email: REG.email, memberType: REG.memberType === 'อื่น ๆ' && w.otherType ? 'อื่น ๆ: ' + w.otherType : REG.memberType,
          education: REG.education, work: REG.work, username: REG.username, adminPass: REG._a1, adminPass2: REG._a2, personalPass: REG._p1, personalPass2: REG._p2, recoveryQ: REG.recoveryQ, recoveryA: REG.recoveryA, accept: true, avatarDataUrl: REG.avatarDataUrl || '' };
        withLoading('กำลังตรวจสอบข้อมูลและสร้างบัญชี', api('register', { form: form, socialTicket: REG.socialTicket || '' }, { timeout: 40000 })).then(function (r) {
          REG = {}; renderRegSuccess(r.member);
        }).catch(function (er) {
          var msg = (er.errors && er.errors.length ? er.errors.join(' / ') : er.msg) || SYS_DOWN_TEXT;
          alertBox('ไม่สามารถสมัครสมาชิกได้', msg, { icon: 'alert', tone: 'bad' });
          if (er.code === 'DUP_USERNAME') regStep(3);
        });
      });
    };
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function renderRegSuccess(m) {
  ROOT.innerHTML = pubHeader() + '<main class="auth-wrap enter"><div class="auth-card" style="text-align:center">' +
    '<div style="width:88px;height:88px;border-radius:50%;background:var(--ok);color:#fff;display:grid;place-items:center;margin:0 auto 14px;animation:zoomIn .6s var(--spring) both">' + ic('check').replace('class="i ', 'class="i " style="width:46px;height:46px" ') + '</div>' +
    '<h2>ลงทะเบียนสมาชิกสำเร็จ</h2><p class="muted" style="margin:6px 0 16px">กรุณาจดจำรหัสสมาชิกและชื่อผู้ใช้งานเพื่อใช้เข้าสู่ระบบ</p>' +
    '<div class="panel flat corner" style="text-align:left"><dl class="kv">' +
      '<dt>Member ID</dt><dd style="font-size:1.15rem">' + esc(m.memberId) + ' <button class="btn sm ghost" id="cpId">' + ic('copy') + '</button></dd><dt>Username</dt><dd>' + esc(m.username) + '</dd><dt>ชื่อสมาชิก</dt><dd>' + esc(m.name) + '</dd><dt>ประเภทสมาชิก</dt><dd>' + esc(m.memberType) + '</dd><dt>วันที่สมัครสมาชิก</dt><dd>' + fmtDateTime(m.createdAt) + '</dd><dt>สถานะบัญชี</dt><dd><span class="tag ok">Active</span></dd>' +
    '</dl></div><p class="small muted" style="margin-top:12px">ท่านได้รับสิทธิทดลองใช้งานครบทุกฟังก์ชันเป็นเวลา 7 วัน</p>' +
    '<button class="btn lg k block" style="margin-top:16px" id="toLogin">' + ic('lock') + ' ไปยังหน้าเข้าสู่ระบบ</button></div></main>';
  $('#cpId').onclick = function () { copyText(m.memberId); };
  $('#toLogin').onclick = function () { renderLogin(m.username); };
}

/* ---------------- avatar: รับไฟล์ทุกชนิด/ทุกขนาด แล้วย่อภาพให้คมชัดขนาดพอดี ---------------- */
function pickAvatar(file) {
  return new Promise(function (resolve, reject) {
    if (!file) { reject(new Error('ไม่ได้เลือกไฟล์')); return; }
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      try {
        var size = 320, c = document.createElement('canvas'); c.width = size; c.height = size;
        var x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
        var s = Math.min(img.naturalWidth, img.naturalHeight);
        x.fillStyle = '#fff'; x.fillRect(0, 0, size, size);
        x.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
        var q = 0.88, out = c.toDataURL('image/jpeg', q);
        while (out.length > 42000 && q > 0.4) { q -= 0.08; out = c.toDataURL('image/jpeg', q); }
        URL.revokeObjectURL(url); resolve({ dataUrl: out, file: file });
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      // ไฟล์ที่ไม่ใช่ภาพ (เช่น PDF): สร้างรูปโปรไฟล์จากอักษรย่อ และเก็บไฟล์ต้นฉบับไว้
      var c = document.createElement('canvas'); c.width = c.height = 320; var x = c.getContext('2d');
      x.fillStyle = '#2E86DE'; x.fillRect(0, 0, 320, 320); x.fillStyle = '#fff'; x.font = 'bold 120px Sarabun, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      var ext = (file.name.split('.').pop() || 'FILE').slice(0, 4).toUpperCase(); x.font = 'bold 84px Sarabun, sans-serif'; x.fillText(ext, 160, 168);
      resolve({ dataUrl: c.toDataURL('image/jpeg', 0.9), file: file, notImage: true });
    };
    img.src = url;
  });
}
</script>
