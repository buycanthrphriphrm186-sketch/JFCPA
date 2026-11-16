<script>
/* ==========================================================================
   WELCOME v4: ฮีโร่หมุนเวียน 5 แบบ / วิดีโอการ์ตูนอธิบายเว็บไซต์ / แดชบอร์ดสถิติผู้เข้าชม
   (เพิ่มต่อจากหน้าเดิม ไม่ตัดส่วนใดออก — แบบทางเดินภาพเดิมยังเป็นหนึ่งในรูปแบบที่หมุนเวียน)
   ========================================================================== */
var HERO_VARIANTS = ['corridor', 'morph', 'tilted', 'orbital', 'smooth'];
function pickHeroVariant() {
  var n = Number(store.get('heroLoads', 0)) || 0;
  store.set('heroLoads', n + 1);
  return HERO_VARIANTS[n % HERO_VARIANTS.length];
}
/* ภาพไม่ซ้ำกันภายในวันเดียวกัน (วนใหม่เมื่อใช้ครบทุกภาพแล้ว) */
function dayMedia(n) {
  var all = (S.media || []).filter(function (m) { return !m.video && m.src; });
  if (!all.length) return [];
  var day = dayKey(), rec = store.get('dayMedia', null);
  if (!rec || rec.d !== day) rec = { d: day, used: [] };
  var fresh = all.filter(function (m) { return rec.used.indexOf(m.src) < 0; });
  if (fresh.length < n) { rec.used = []; fresh = all.slice(); }
  for (var i = fresh.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = fresh[i]; fresh[i] = fresh[j]; fresh[j] = t; }
  var pick = fresh.slice(0, n);
  while (pick.length < n) pick.push(all[pick.length % all.length]);
  rec.used = rec.used.concat(pick.map(function (m) { return m.src; }));
  store.set('dayMedia', rec);
  return pick;
}
function hvCard(cls, style) { return '<div class="hv-card ' + (cls || '') + '" style="' + (style || '') + '"><img alt="" decoding="async"></div>'; }
function heroVariantHtml(v) {
  var h_ = '<div class="stage hv hv-' + v + '" aria-hidden="true">', i;
  if (v === 'morph') { for (i = 0; i < 12; i++) h_ += hvCard('m', ''); }
  else if (v === 'tilted') {
    h_ += '<div class="tg-plane">';
    for (var c = 0; c < 5; c++) { h_ += '<div class="tg-col ' + (c % 2 ? 'up' : 'down') + '" style="animation-duration:' + (38 + c * 6) + 's">'; for (i = 0; i < 6; i++) h_ += hvCard('t'); h_ += '</div>'; }
    h_ += '</div>';
  } else if (v === 'orbital') {
    h_ += '<div class="ob-wrap"><div class="ob-ring r1">'; for (i = 0; i < 6; i++) h_ += '<div class="ob-slot" style="--a:' + (i * 60) + 'deg">' + hvCard('o') + '</div>';
    h_ += '</div><div class="ob-ring r2">'; for (i = 0; i < 9; i++) h_ += '<div class="ob-slot" style="--a:' + (i * 40) + 'deg">' + hvCard('o') + '</div>';
    h_ += '</div><div class="ob-core"><img src="' + LOGO + '" alt=""></div></div>';
  } else if (v === 'smooth') {
    h_ += hvCard('s-main') + hvCard('s-p p1') + hvCard('s-p p2') + hvCard('s-p p3') + hvCard('s-p p4');
  }
  return h_ + '<div class="hv-veil"></div></div>';
}
function fillHeroVariant(root, v) {
  var hero = root.querySelector('.hero'); if (!hero) return;
  var cards = $$('.hv-card', hero), imgs = dayMedia(cards.length);
  if (!imgs.length) { hero.classList.add('ready'); return; }
  cards.forEach(function (c, i) {
    var m = imgs[i % imgs.length], im = c.querySelector('img');
    im.onload = function () { im.classList.add('ok'); };
    im.src = m.src; c.title = (m.author || '') + ' · ' + (m.license || '');
  });
  var cr = document.getElementById('heroCredits');
  if (cr) cr.textContent = 'ภาพหน้าแรก: ' + imgs.slice(0, 6).map(function (m) { return (m.author || 'ไม่ระบุ') + ' (' + (m.license || '') + ', ' + (m.source || '') + ')'; }).join(' · ');
  hero.classList.add('ready');
  if (v === 'morph' || v === 'smooth') heroScrollLoop(hero, v);
}
/* แบบ morph: ภาพเรียงเป็นวงกลมหมุนช้า แล้วคลี่เป็นแนวโค้งเมื่อเลื่อนหน้าลง / แบบ smooth: ภาพหลักขยายเต็มกรอบเมื่อเลื่อน */
function heroScrollLoop(hero, v) {
  var cards = $$('.hv-card', hero), reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches, t0 = performance.now(), vis = true, running = true;
  try { new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis && !running) { running = true; requestAnimationFrame(frame); } }).observe(hero); } catch (e) {}
  function frame(t) {
    if (!hero.isConnected) return;
    if (!vis || document.hidden) { running = false; return; }
    var rect = hero.getBoundingClientRect(), H = rect.height || 1;
    var p = clamp(-rect.top / (H * 0.7), 0, 1);
    if (rect.bottom > -50 && rect.top < innerHeight + 50) {
      var W = hero.clientWidth, cx = W / 2, cy = H * 0.5;
      if (v === 'morph') {
        var n = cards.length, rot = reduce ? 0 : (t - t0) / 26000 * Math.PI * 2, R = Math.min(W, H) * 0.36;
        var cw = clamp(W * 0.11, 64, 130);
        var el_ = t - t0, intro = reduce ? 1 : clamp((el_ - 2500) / 900, 0, 1), lineK = reduce ? 1 : clamp((el_ - 400) / 900, 0, 1);
        if (!hero._sc) hero._sc = cards.map(function () { return { x: (Math.random() - 0.5) * W * 1.4, y: (Math.random() - 0.5) * H * 1.2, r: (Math.random() - 0.5) * 180 }; });
        cards.forEach(function (c, i) {
          var a = i / n * Math.PI * 2 + rot;
          var x0 = cx + Math.cos(a) * R * 1.25, y0 = cy + Math.sin(a) * R * 0.9;
          if (intro < 1) {
            var sc = hero._sc[i], lx = cx + (i - (n - 1) / 2) * Math.min(cw * 0.75, W / n), ly = cy;
            var sx = cx + sc.x, sy = cy + sc.y, px = sx + (lx - sx) * lineK, py = sy + (ly - sy) * lineK;
            x0 = px + (x0 - px) * intro; y0 = py + (y0 - py) * intro;
            c.style.width = cw + 'px'; c.style.height = cw * 1.3 + 'px';
            c.style.transform = 'translate(' + (x0 - cw / 2) + 'px,' + (y0 - cw * 0.65) + 'px) rotate(' + (sc.r * (1 - lineK)) + 'deg)';
            c.style.opacity = String(Math.min(1, lineK * 1.4));
            return;
          }
          var x1 = (i + 0.5) / n * W, y1 = H * 0.86 - Math.sin((i + 0.5) / n * Math.PI) * H * 0.16;
          var x = x0 + (x1 - x0) * p, y = y0 + (y1 - y0) * p, r = (1 - p) * (a * 57.3 % 360 > 180 ? -8 : 8);
          c.style.width = cw + 'px'; c.style.height = cw * 1.3 + 'px';
          c.style.transform = 'translate(' + (x - cw / 2) + 'px,' + (y - cw * 0.65) + 'px) rotate(' + r + 'deg)';
          c.style.opacity = String(0.55 + 0.45 * (1 - Math.abs(Math.sin(a)) * (1 - p)));
        });
      } else {
        var main = cards[0]; main.style.clipPath = 'inset(' + (26 - 26 * p) + '% ' + (30 - 30 * p) + '% ' + (26 - 26 * p) + '% ' + (30 - 30 * p) + '% round ' + (28 - 20 * p) + 'px)';
        cards.slice(1).forEach(function (c, i) { c.style.transform = 'translateY(' + (-(i + 1) * 60 * p) + 'px)'; });
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ---------------- วิดีโอการ์ตูนอธิบายเว็บไซต์ (วาดด้วย Canvas: เล่นอัตโนมัติ ไม่มีปุ่มหยุด มีปุ่มเต็มจอ) ---------------- */
var EXPLAINER_LINES = [
  [0, 'มองจากอวกาศ… ลงมายังประเทศไทย'],
  [7, 'กรุงเทพมหานคร: งานแถลงเปิดตัว THAI LAW LIBRARY คลังกฎหมาย'],
  [14, 'ผู้เข้าร่วมงานและสื่อมวลชนเดินทางมาถึงหอประชุม'],
  [21, 'คลังกฎหมาย คือแหล่งรวบรวมกฎหมายไทยเพื่อการศึกษาและค้นคว้า แบ่งเป็น 5 หมวด'],
  [28, 'ค้นหาได้ทั้งชื่อกฎหมาย เลขมาตรา ข้อความ คำย่อ และศัพท์ภาษาอังกฤษ'],
  [35, 'ป้ายพลิกมาตรา: ด้านหน้าคือเลขและชื่อมาตรา ด้านหลังคือตัวบท พร้อมป้ายวรรคและอนุมาตรา'],
  [42, 'ตัวจับเวลาท่องจำ รายการโปรด โฟลเดอร์ สมุดบันทึก และเครื่องมือกฎหมาย'],
  [49, 'อ่านกฎหมายต่างประเทศจากแหล่งทางการ และอนุสัญญาระหว่างประเทศพร้อมคำอธิบายภาษาไทย'],
  [56, 'ความปลอดภัย: รหัสผ่าน 3 ชั้น และแจ้งเตือนผู้ดูแลระบบทันทีเมื่อพบความผิดปกติ'],
  [63, 'สื่อมวลชนสัมภาษณ์: “ข้อมูลกฎหมายทุกฉบับระบุแหล่งที่มา ตรวจสอบได้”'],
  [70, 'เริ่มใช้งาน: ขอรับรหัสผ่านชั้นที่ 1 จากผู้ดูแลระบบ แล้วสมัครสมาชิก']
];
var EXPLAINER_LEN = 78;
var EXPL = { raf: 0 };
function stopExplainer() { if (EXPL.raf) cancelAnimationFrame(EXPL.raf); EXPL.raf = 0; if (document.fullscreenElement) try { document.exitFullscreen(); } catch (e) {} }
function explainerHtml() {
  return '<section class="panel rise expl" style="margin-bottom:22px"><div class="panel-title"><span class="ic o">' + ic('play') + '</span><h2>วิดีโอแนะนำเว็บไซต์</h2></div>' +
    '<div class="expl-frame" id="explFrame"><canvas id="explCv" width="1280" height="720" role="img" aria-label="วิดีโอการ์ตูนแนะนำเว็บไซต์คลังกฎหมาย"></canvas>' +
    '<div class="expl-cap" id="explCap" aria-live="polite"></div><button class="expl-fs" id="explFs" type="button" aria-label="ดูแบบเต็มจอ">' + ic('maximize') + '<span>เต็มจอ</span></button></div>' +
    '<p class="tiny muted" style="margin-top:8px">ภาพการ์ตูนจำลองงานแถลงเปิดตัวเว็บไซต์ (สร้างด้วยกราฟิกของเว็บไซต์เอง ไม่มีบุคคลจริง) เล่นต่อเนื่องอัตโนมัติ</p></section>';
}
function startExplainer() {
  var cv = document.getElementById('explCv'); if (!cv) return;
  var W = 1280, H = 720, t0 = performance.now(), cap = document.getElementById('explCap'), lastCap = -1;
  /* ความละเอียดตามขนาดจอจริง (ไม่เกิน 1.5 เท่า) เพื่อให้ลื่นบนมือถือ */
  function fitCanvas() { var w = Math.max(320, Math.min(1280, Math.round((cv.clientWidth || 640) * Math.min(window.devicePixelRatio || 1, 1.5)))); if (cv.width !== w) { cv.width = w; cv.height = Math.round(w * 9 / 16); } }
  fitCanvas(); window.addEventListener('resize', debounce(fitCanvas, 200));
  var ctx = cv.getContext('2d', { alpha: false }), visible = true, lastDraw = 0;
  try { new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(cv); } catch (e) {}
  var fr = document.getElementById('explFrame'), fs = document.getElementById('explFs');
  function fsSync() { var on_ = document.fullscreenElement === fr || fr.classList.contains('pseudo-fs'); fs.innerHTML = ic(on_ ? 'minimize' : 'maximize') + '<span>' + (on_ ? 'ออกจากเต็มจอ' : 'เต็มจอ') + '</span>'; fs.setAttribute('aria-label', on_ ? 'ออกจากโหมดเต็มจอ' : 'ดูแบบเต็มจอ'); }
  fs.onclick = function () {
    if (document.fullscreenElement === fr) { document.exitFullscreen(); return; }
    if (fr.classList.contains('pseudo-fs')) { fr.classList.remove('pseudo-fs'); syncScrollLock(); fsSync(); return; }
    if (fr.requestFullscreen) fr.requestFullscreen().catch(function () { fr.classList.add('pseudo-fs'); fsSync(); });
    else { fr.classList.add('pseudo-fs'); fsSync(); }
  };
  document.addEventListener('fullscreenchange', fsSync); fsSync();
  // ข้อมูลฉากคงที่ (สุ่มครั้งเดียว เพื่อให้ภาพนิ่ง ไม่กระพริบ)
  var rnd = (function (s) { return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; })(20260606);
  var stars = []; for (var i = 0; i < 160; i++) stars.push([rnd() * W, rnd() * H, rnd() * 1.6 + .3]);
  var seats = []; for (var r = 0; r < 7; r++) for (var c = 0; c < 18; c++) seats.push({ r: r, c: c, on: rnd() < 0.68, hue: Math.floor(rnd() * 5) });
  var cars = []; for (i = 0; i < 26; i++) cars.push({ x: 90 + (i % 13) * 82, y: 560 + Math.floor(i / 13) * 60, col: ['#2E86DE', '#F07C1E', '#FFFFFF', '#1E8E3E', '#0E1116', '#9CCBF0'][Math.floor(rnd() * 6)] });
  // รูปทรงประเทศไทยแบบย่อ (พิกัดสัมพัทธ์)
  var TH = [[.42, 0], [.58, .05], [.66, .02], [.78, .12], [.95, .2], [1, .32], [.9, .4], [.8, .45], [.7, .47], [.62, .55], [.55, .6], [.5, .66], [.45, .62], [.4, .7], [.36, .8], [.4, .9], [.47, 1], [.4, 1], [.3, .9], [.27, .78], [.3, .66], [.34, .58], [.3, .48], [.22, .38], [.12, .28], [.16, .14], [.28, .08]];
  var SKY = [[0, [135, 200, 245], [230, 244, 252]], [.3, [255, 190, 120], [255, 230, 190]], [.5, [20, 30, 70], [60, 70, 120]], [.75, [10, 14, 40], [30, 40, 80]], [.9, [255, 200, 150], [180, 220, 250]], [1, [135, 200, 245], [230, 244, 252]]];
  function skyAt(f) { for (var k = 0; k < SKY.length - 1; k++) { var a = SKY[k], b = SKY[k + 1]; if (f >= a[0] && f <= b[0]) { var u = (f - a[0]) / (b[0] - a[0]); var mix = function (x, y) { return 'rgb(' + x.map(function (v, j) { return Math.round(v + (y[j] - v) * u); }).join(',') + ')'; }; return [mix(a[1], b[1]), mix(a[2], b[2]), f > .42 && f < .85]; } } return ['#87C8F5', '#E6F4FC', false]; }
  function rr(x, y, w, h, rad, fill) { ctx.beginPath(); ctx.moveTo(x + rad, y); ctx.arcTo(x + w, y, x + w, y + h, rad); ctx.arcTo(x + w, y + h, x, y + h, rad); ctx.arcTo(x, y + h, x, y, rad); ctx.arcTo(x, y, x + w, y, rad); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
  function person(x, y, s, shirt, head) { ctx.fillStyle = shirt; ctx.beginPath(); ctx.ellipse(x, y + 16 * s, 13 * s, 15 * s, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = head || '#F2C9A0'; ctx.beginPath(); ctx.arc(x, y, 8 * s, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#2A2A2A'; ctx.beginPath(); ctx.arc(x, y - 3 * s, 8 * s, Math.PI, 0); ctx.fill(); }
  function sky(f) { var s = skyAt(f), g = ctx.createLinearGradient(0, 0, 0, H * .7); g.addColorStop(0, s[0]); g.addColorStop(1, s[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); if (s[2]) { ctx.fillStyle = 'rgba(255,255,255,.8)'; stars.forEach(function (p, k) { if (k % 3 === 0 && p[1] < H * .45) ctx.fillRect(p[0], p[1], p[2], p[2]); }); ctx.fillStyle = '#F4F1DE'; ctx.beginPath(); ctx.arc(W * .82, H * .16, 26, 0, Math.PI * 2); ctx.fill(); } else { ctx.fillStyle = f > .2 && f < .45 ? '#FFB347' : '#FFE27A'; ctx.beginPath(); ctx.arc(W * (.15 + f * .7), H * (.18 + Math.abs(f - .25) * .5), 30, 0, Math.PI * 2); ctx.fill(); } return s[2]; }
  function plane(x, y) { ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#FFFFFF'; rr(-40, -6, 80, 12, 6, '#FFFFFF'); ctx.fillStyle = '#2E86DE'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(10, 26); ctx.lineTo(20, 26); ctx.lineTo(10, 0); ctx.fill(); ctx.beginPath(); ctx.moveTo(-34, -4); ctx.lineTo(-42, -20); ctx.lineTo(-32, -20); ctx.lineTo(-24, -4); ctx.fill(); ctx.restore(); }
  function scSpace(u) {
    ctx.fillStyle = '#05070F'; ctx.fillRect(0, 0, W, H); stars.forEach(function (p) { ctx.fillStyle = 'rgba(255,255,255,' + (.4 + p[2] / 3) + ')'; ctx.fillRect(p[0], p[1], p[2], p[2]); });
    var z = 1 + u * u * 9, R = 230 * z, ex = W / 2 + (-140 * z * u), ey = H / 2 + (-40 * z * u);
    ctx.save(); ctx.beginPath(); ctx.arc(ex, ey, R, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#1F6FB8'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#5DAA5B'; [[.1, .2, .35, .25], [.55, .1, .3, .3], [.45, .5, .25, .3], [.05, .6, .2, .25]].forEach(function (b) { ctx.beginPath(); ctx.ellipse(ex - R + b[0] * 2 * R + b[2] * R, ey - R + b[1] * 2 * R + b[3] * R, b[2] * R, b[3] * R, .4, 0, Math.PI * 2); ctx.fill(); });
    // ประเทศไทย (ไฮไลต์)
    var tx = ex + R * .26, ty = ey - R * .02, ts = R * .2;
    ctx.beginPath(); TH.forEach(function (p, k) { var x = tx + p[0] * ts, y = ty + p[1] * ts * 1.6; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); ctx.fillStyle = '#F07C1E'; ctx.fill(); ctx.lineWidth = Math.max(1, z * .8); ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
    if (u > .7) { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(tx + .45 * ts, ty + .63 * ts * 1.6, 6 + (u - .7) * 30, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#0E1116'; ctx.font = 'bold ' + Math.round(14 + (u - .7) * 40) + 'px Sarabun, sans-serif'; ctx.fillText('กรุงเทพมหานคร', tx + .45 * ts + 14, ty + .63 * ts * 1.6 + 6); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(160,210,255,.5)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(ex, ey, R + 3, 0, Math.PI * 2); ctx.stroke();
  }
  function scOutside(u, f) {
    var night = sky(f);
    ctx.fillStyle = night ? '#24324A' : '#7FB77E'; ctx.fillRect(0, H * .62, W, H * .38);
    plane(-120 + u * (W + 260), 120 + Math.sin(u * 6) * 10);
    // หอประชุม
    rr(260, 250, 760, 280, 18, night ? '#C9D6E3' : '#FFFFFF'); rr(260, 236, 760, 34, 12, '#2E86DE');
    ctx.fillStyle = '#0E1116'; ctx.font = 'bold 30px Sarabun, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('หอประชุม · งานเปิดตัว THAI LAW LIBRARY คลังกฎหมาย', 640, 320); ctx.textAlign = 'left';
    for (var k = 0; k < 9; k++) rr(300 + k * 80, 350, 50, 90, 6, night ? '#FFD86B' : '#BFDDF6');
    rr(590, 440, 100, 90, 8, '#1F5F99');
    // ลานจอดรถ
    ctx.fillStyle = night ? '#3A4558' : '#9AA6B5'; ctx.fillRect(40, 540, W - 80, 150);
    cars.forEach(function (c, k) { var arrive = k < 26 * Math.min(1, u * 1.6); if (!arrive) return; rr(c.x, c.y, 60, 30, 8, c.col); rr(c.x + 10, c.y + 4, 40, 10, 4, 'rgba(255,255,255,.6)'); ctx.fillStyle = '#0E1116'; ctx.beginPath(); ctx.arc(c.x + 14, c.y + 30, 6, 0, Math.PI * 2); ctx.arc(c.x + 46, c.y + 30, 6, 0, Math.PI * 2); ctx.fill(); });
    for (k = 0; k < 6; k++) person(560 + k * 30 + ((u * 200 + k * 40) % 80), 500, .8, ['#2E86DE', '#F07C1E', '#0E1116'][k % 3]);
  }
  function scHall(u, f, part) {
    // ผนังและหน้าต่างแสดงสีท้องฟ้าภายนอก
    ctx.fillStyle = '#E9EEF4'; ctx.fillRect(0, 0, W, H);
    var s = skyAt(f); ctx.fillStyle = s[0]; ctx.fillRect(40, 40, 160, 110); ctx.fillRect(W - 200, 40, 160, 110); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 6; ctx.strokeRect(40, 40, 160, 110); ctx.strokeRect(W - 200, 40, 160, 110);
    // เวทีและจอ
    rr(250, 40, 780, 300, 14, '#0E1116'); rr(262, 52, 756, 276, 8, '#FFFFFF');
    var logo = document.getElementById('splashLogoCache');
    if (EXPL.logo && EXPL.logo.complete) ctx.drawImage(EXPL.logo, 290, 80, 120, 120);
    ctx.fillStyle = '#0E1116'; ctx.font = 'bold 34px Sarabun, sans-serif'; ctx.fillText('THAI LAW LIBRARY', 430, 120); ctx.fillStyle = '#1F5F99'; ctx.font = 'bold 30px Sarabun, sans-serif'; ctx.fillText('คลังกฎหมาย', 430, 160);
    var slides = [['ศูนย์รวมกฎหมายไทย 5 หมวด', 'รัฐธรรมนูญ · พ.ร.ป. · พ.ร.บ./พ.ร.ก. · ปร./ปว./คปค./คสช. · ประมวลกฎหมาย'], ['ค้นหาอัจฉริยะ', 'ชื่อกฎหมาย · เลขมาตรา · คำย่อ · ศัพท์อังกฤษ'], ['ป้ายพลิกมาตรา', 'วรรค · อนุมาตรา · ตัวจับเวลา · บันทึก'], ['ต่างประเทศและอนุสัญญา', 'อ่านจากแหล่งทางการ · ภาษาไทยประกอบ'], ['ความปลอดภัย', 'รหัสผ่าน 3 ชั้น · แจ้งเตือนผู้ดูแลทันที']];
    var sl = slides[Math.min(slides.length - 1, Math.floor(part * slides.length))];
    rr(290, 220, 700, 90, 10, '#EAF4FC'); ctx.fillStyle = '#0E1116'; ctx.font = 'bold 28px Sarabun, sans-serif'; ctx.fillText(sl[0], 310, 256); ctx.fillStyle = '#2A3240'; ctx.font = '22px Sarabun, sans-serif'; ctx.fillText(sl[1], 310, 292);
    rr(200, 340, 880, 40, 6, '#1F5F99');
    rr(560, 300, 160, 70, 8, '#F07C1E'); person(640, 268, 1.3, '#0E1116');
    // ที่นั่งผู้ฟัง (มากกว่าครึ่ง)
    seats.forEach(function (st) { var x = 120 + st.c * 60 + (st.r % 2) * 20, y = 430 + st.r * 40; rr(x - 16, y + 6, 32, 22, 5, '#2E86DE'); if (st.on) person(x, y, .9, ['#FFFFFF', '#F07C1E', '#0E1116', '#1E8E3E', '#9CCBF0'][st.hue]); });
    // สื่อมวลชน: กล้อง แฟลช ไมโครโฟน
    for (var k = 0; k < 5; k++) { var x = 70 + k * 270, y = 640; person(x, y - 30, 1.1, '#0E1116'); rr(x + 8, y - 30, 36, 24, 4, '#2A3240'); ctx.fillStyle = '#5D6878'; ctx.beginPath(); ctx.arc(x + 44, y - 18, 8, 0, Math.PI * 2); ctx.fill(); if (Math.sin(u * 40 + k * 2) > .96) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(x + 46, y - 18, 40, 0, Math.PI * 2); ctx.fill(); } }
    if (part > .82) { person(980, 600, 1.4, '#2E86DE'); person(1080, 600, 1.4, '#0E1116'); rr(1000, 585, 30, 10, 4, '#F07C1E'); ctx.fillStyle = '#0E1116'; ctx.fillRect(1028, 588, 22, 4); }
  }
  function frame(now) {
    if (!cv.isConnected) { EXPL.raf = 0; document.removeEventListener('fullscreenchange', fsSync); return; }
    EXPL.raf = requestAnimationFrame(frame);
    var t = ((now - t0) / 1000) % EXPLAINER_LEN, f = t / EXPLAINER_LEN;
    if (EXPL.onTime) EXPL.onTime(t);
    if (!visible || document.hidden || now - lastDraw < 33) return;
    lastDraw = now;
    ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    if (t < 7) scSpace(t / 7); else if (t < 21) scOutside((t - 7) / 14, f); else scHall((t - 21) / (EXPLAINER_LEN - 21), f, (t - 21) / (EXPLAINER_LEN - 21));
    var ci = 0; for (var k = 0; k < EXPLAINER_LINES.length; k++) if (t >= EXPLAINER_LINES[k][0]) ci = k;
    if (ci !== lastCap && cap) { lastCap = ci; cap.textContent = EXPLAINER_LINES[ci][1]; }
  }
  if (!EXPL.logo) { EXPL.logo = new Image(); EXPL.logo.src = LOGO; }
  stopExplainer();
  EXPL.raf = requestAnimationFrame(frame);
}

/* ---------------- แดชบอร์ดสถิติผู้เข้าชม (ข้อมูลจริงจากชีต Stats เหมือนกันทุกอุปกรณ์) ---------------- */
function dashHtml() {
  return '<section class="panel rise dash" id="trafficDash" style="margin-bottom:22px"><div class="panel-title"><span class="ic">' + ic('activity') + '</span><h2>สถิติผู้เข้าชมและฐานข้อมูล</h2></div>' +
    '<p class="muted small" style="margin:-4px 0 14px">นับทุกครั้งที่เปิดหรือรีเฟรชเว็บไซต์ แยกตามอุปกรณ์และวัน โดยไม่เก็บข้อมูลที่ระบุตัวบุคคล ตัวเลขชุดเดียวกันแสดงบนทุกอุปกรณ์</p><div id="dashBody"><div class="skeleton" style="height:120px"></div></div></section>';
}
function fmtN(n) { return n === null || n === undefined ? '—' : Number(n).toLocaleString('th-TH'); }
function loadDashboard() {
  var box = document.getElementById('dashBody'); if (!box) return;
  api('publicStats', {}, { timeout: 30000, noRetry: true }).then(function (d) { if (box.isConnected) renderDash(box, d); })
    .catch(function () { if (box.isConnected) box.innerHTML = '<p class="muted small">ยังไม่สามารถโหลดสถิติได้ในขณะนี้</p>'; });
}
function renderDash(box, d) {
  var tt = d.totals || {}, today = d.today || {}, s = d.series || [];
  var v30 = s.reduce(function (a, x) { return a + x.v; }, 0);
  var foreignJP = d.foreign && d.foreign.JP;
  var kpis = [['วันนี้', fmtN(today.visits || 0), 'ครั้ง'], ['30 วันล่าสุด', fmtN(v30), 'ครั้ง'], ['สมาชิก', fmtN(d.members), 'บัญชี'], ['กฎหมายไทย', fmtN(d.laws), 'ฉบับ'], ['มาตรา', fmtN(d.sections), 'มาตรา'], ['กฎหมายญี่ปุ่น (e-Gov)', fmtN(foreignJP), 'ฉบับ']];
  var dev = [['โทรศัพท์มือถือ', tt.mobile || 0], ['แท็บเล็ต', tt.tablet || 0], ['คอมพิวเตอร์', tt.desktop || 0]];
  var br = [['Chrome', tt.chrome || 0], ['Safari', tt.safari || 0], ['Edge', tt.edge || 0], ['Firefox', tt.firefox || 0], ['อื่น ๆ', tt.other || 0]].sort(function (a, b) { return b[1] - a[1]; });
  var cats = CATS.map(function (c) { return [c, (d.lawsByCat || {})[c] || 0]; });
  box.innerHTML = '<div class="dash-kpis">' + kpis.map(function (k) { return '<div class="dk"><span class="dk-l">' + esc(k[0]) + '</span><span class="dk-v">' + k[1] + '</span><span class="dk-u">' + k[2] + '</span></div>'; }).join('') + '</div>' +
    '<div class="dash-grid"><figure class="dcard wide"><figcaption>จำนวนการเข้าชมรายวัน (30 วันล่าสุด)</figcaption>' + areaChart(s) + '</figure>' +
    '<figure class="dcard"><figcaption>การเข้าชมแยกตามอุปกรณ์ (สะสม)</figcaption>' + donut(dev) + '</figure>' +
    '<figure class="dcard"><figcaption>เบราว์เซอร์ที่ใช้ (สะสม)</figcaption>' + hbars(br, 'var(--dv1)') + '</figure>' +
    '<figure class="dcard"><figcaption>กฎหมายไทยในฐานข้อมูลแยกตามหมวด</figcaption>' + hbars(cats, 'var(--dv1)') + '</figure>' +
    '<figure class="dcard"><figcaption>กฎหมายต่างประเทศ (นับจากแหล่งทางการ)</figcaption><div id="dashForeign" class="muted small">กำลังโหลด…</div></figure></div>' +
    '<details class="acc" style="margin-top:12px"><summary>' + ic('list') + ' ดูข้อมูลเป็นตาราง' + ic('chevD', 'chev') + '</summary><div class="acc-b table-scroll"><table class="ptable"><thead><tr><th>วันที่</th><th>เข้าชม</th><th>เข้าสู่ระบบ</th><th>เปิดอ่านกฎหมาย</th></tr></thead><tbody>' + s.slice().reverse().map(function (x) { return '<tr><td>' + esc(fmtDate(x.d + 'T00:00:00', true)) + '</td><td>' + fmtN(x.v) + '</td><td>' + fmtN(x.l) + '</td><td>' + fmtN(x.o) + '</td></tr>'; }).join('') + '</tbody></table></div></details>' +
    '<p class="tiny muted" style="margin-top:8px">ปรับปรุงล่าสุด ' + esc(fmtDateTime(d.updatedAt)) + '</p>';
  bindArea(box, s);
  api('foreignCountries', {}, { timeout: 30000, noRetry: true }).then(function (r) {
    var el = document.getElementById('dashForeign'); if (!el) return;
    el.classList.remove('muted', 'small');
    el.innerHTML = '<ul class="fc-list">' + r.countries.map(function (c) { return '<li><span>' + esc(c.name) + '</span><b>' + (c.count !== null && c.count !== undefined ? fmtN(c.count) + ' ฉบับ' : '<span class="muted small">' + (c.ready ? 'อ่านได้ในเว็บไซต์' : 'ลิงก์แหล่งทางการ') + '</span>') + '</b></li>'; }).join('') + '</ul>';
  }).catch(function () { var el = document.getElementById('dashForeign'); if (el) el.textContent = 'ยังไม่สามารถโหลดข้อมูลได้'; });
}
function areaChart(s) {
  var W = 640, H = 220, P = 34, max = Math.max(4, Math.max.apply(null, s.map(function (x) { return x.v; })));
  var nice = Math.pow(10, Math.floor(Math.log10(max))), top = Math.ceil(max / nice) * nice;
  var x = function (i) { return P + i * (W - P - 10) / Math.max(1, s.length - 1); }, y = function (v) { return H - 26 - v / top * (H - 46); };
  var line = s.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1); }).join(' ');
  var area = line + ' L' + x(s.length - 1) + ' ' + (H - 26) + ' L' + x(0) + ' ' + (H - 26) + ' Z';
  var grid = [0, .5, 1].map(function (g) { var v = Math.round(top * g); return '<line x1="' + P + '" x2="' + (W - 10) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="dgrid"/><text x="' + (P - 6) + '" y="' + (y(v) + 4) + '" class="dax" text-anchor="end">' + fmtN(v) + '</text>'; }).join('');
  var lbl = [0, Math.floor(s.length / 2), s.length - 1].map(function (i) { return s[i] ? '<text x="' + x(i) + '" y="' + (H - 6) + '" class="dax" text-anchor="' + (i === 0 ? 'start' : i === s.length - 1 ? 'end' : 'middle') + '">' + esc(fmtDate(s[i].d + 'T00:00:00', true)) + '</text>' : ''; }).join('');
  return '<div class="area-wrap"><svg viewBox="0 0 ' + W + ' ' + H + '" class="area" role="img" aria-label="กราฟการเข้าชมรายวัน 30 วันล่าสุด">' + grid + '<path d="' + area + '" class="dfill"/><path d="' + line + '" class="dline"/>' + lbl + '<line class="dcross hidden" y1="12" y2="' + (H - 26) + '"/><circle class="ddot hidden" r="5"/><rect class="dhit" x="' + P + '" y="0" width="' + (W - P - 10) + '" height="' + H + '"/></svg><div class="dtip hidden"></div></div>';
}
function bindArea(box, s) {
  var svg = box.querySelector('svg.area'); if (!svg || !s.length) return;
  var W = 640, H = 220, P = 34, max = Math.max(4, Math.max.apply(null, s.map(function (x) { return x.v; })));
  var nice = Math.pow(10, Math.floor(Math.log10(max))), top = Math.ceil(max / nice) * nice;
  var tip = box.querySelector('.dtip'), cross = svg.querySelector('.dcross'), dot = svg.querySelector('.ddot');
  function show(e) {
    var r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W;
    var i = clamp(Math.round((px - P) / ((W - P - 10) / Math.max(1, s.length - 1))), 0, s.length - 1);
    var cx = P + i * (W - P - 10) / Math.max(1, s.length - 1), cy = H - 26 - s[i].v / top * (H - 46);
    cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); dot.setAttribute('cx', cx); dot.setAttribute('cy', cy);
    cross.classList.remove('hidden'); dot.classList.remove('hidden'); tip.classList.remove('hidden');
    tip.innerHTML = '<b>' + esc(fmtDate(s[i].d + 'T00:00:00', true)) + '</b><br>เข้าชม ' + fmtN(s[i].v) + ' ครั้ง<br>เข้าสู่ระบบ ' + fmtN(s[i].l) + ' · เปิดอ่าน ' + fmtN(s[i].o);
    var left = cx / W * r.width; tip.style.left = clamp(left, 70, r.width - 70) + 'px';
  }
  function hide() { cross.classList.add('hidden'); dot.classList.add('hidden'); tip.classList.add('hidden'); }
  svg.addEventListener('pointermove', show); svg.addEventListener('pointerdown', show); svg.addEventListener('pointerleave', hide);
}
function donut(rows) {
  var tot = rows.reduce(function (a, r) { return a + r[1]; }, 0), R = 70, C = 2 * Math.PI * R, off = 0, cols = ['var(--dv1)', 'var(--dv2)', 'var(--dv3)'];
  var segs = tot ? rows.map(function (r, i) { var len = r[1] / tot * C, gap = r[1] && len > 4 ? 2 : 0; var s_ = '<circle r="' + R + '" cx="90" cy="90" fill="none" stroke="' + cols[i] + '" stroke-width="26" stroke-dasharray="' + Math.max(0, len - gap) + ' ' + (C - Math.max(0, len - gap)) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 90 90)"><title>' + esc(r[0]) + ' ' + fmtN(r[1]) + ' ครั้ง</title></circle>'; off += len; return s_; }).join('') : '<circle r="' + R + '" cx="90" cy="90" fill="none" stroke="var(--line)" stroke-width="26"/>';
  return '<div class="donut"><svg viewBox="0 0 180 180" role="img" aria-label="สัดส่วนการเข้าชมตามอุปกรณ์">' + segs + '<text x="90" y="86" text-anchor="middle" class="dnum">' + fmtN(tot) + '</text><text x="90" y="108" text-anchor="middle" class="dax">ครั้ง</text></svg>' +
    '<ul class="dleg">' + rows.map(function (r, i) { return '<li><i style="background:' + cols[i] + '"></i><span>' + esc(r[0]) + '</span><b>' + fmtN(r[1]) + (tot ? ' (' + Math.round(r[1] / tot * 100) + '%)' : '') + '</b></li>'; }).join('') + '</ul></div>';
}
function hbars(rows, col) {
  var max = Math.max(1, Math.max.apply(null, rows.map(function (r) { return r[1]; })));
  return '<div class="hbars">' + rows.map(function (r) { return '<div class="hb" title="' + esc(r[0]) + ' ' + fmtN(r[1]) + '"><span class="hb-l">' + esc(r[0]) + '</span><span class="hb-t"><i style="width:' + Math.max(r[1] ? 2 : 0, r[1] / max * 100) + '%;background:' + col + '"></i></span><b class="hb-v">' + fmtN(r[1]) + '</b></div>'; }).join('') + '</div>';
}


/* ---------------- เสียงประกอบวิดีโอ: ดนตรีบรรเลงเบา ๆ + เสียงบรรยายภาษาไทย ----------------
   เบราว์เซอร์อนุญาตให้เล่นเสียงหลังผู้ใช้แตะ/คลิก/กดแป้นครั้งแรกเท่านั้น จึงเริ่มเสียงทันทีที่มีการโต้ตอบครั้งแรก
   ระดับเสียงลดลงอัตโนมัติตามสัดส่วนที่วิดีโอเลื่อนพ้นจอ และหยุดเมื่อเข้าสู่ระบบ */
var EXA = { ctx: null, master: null, iv: null, vis: 1, started: false, lastLine: -1, voice: null };
function explAudioStop() {
  try { if (EXA.iv) clearInterval(EXA.iv); EXA.iv = null; if (window.speechSynthesis) speechSynthesis.cancel(); if (EXA.ctx) EXA.ctx.close(); } catch (e) {}
  EXA.ctx = null; EXA.master = null; EXA.started = false; EXA.lastLine = -1; EXPL.onTime = null;
  document.removeEventListener('pointerdown', explAudioUnlock, true); document.removeEventListener('keydown', explAudioUnlock, true); document.removeEventListener('touchstart', explAudioUnlock, true);
}
function explAudioUnlock() {
  if (EXA.started || !document.getElementById('explCv')) return;
  if (S.ud && S.ud.settings && S.ud.settings.sound === false) return;
  try {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    EXA.ctx = new AC(); EXA.master = EXA.ctx.createGain(); EXA.master.gain.value = 0; EXA.master.connect(EXA.ctx.destination);
    EXA.started = true;
    var badge = document.getElementById('explSnd'); if (badge) badge.classList.add('on');
    var chords = [[261.63, 329.63, 392.0], [220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [196.0, 246.94, 293.66]], step = 0;
    function note(f, t, dur, vol, type) {
      var o = EXA.ctx.createOscillator(), g = EXA.ctx.createGain();
      o.type = type || 'sine'; o.frequency.value = f; o.connect(g); g.connect(EXA.master);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      o.start(t); o.stop(t + dur + 0.05);
    }
    function beat() {
      if (!EXA.ctx) return;
      var t = EXA.ctx.currentTime + 0.05, ch = chords[Math.floor(step / 8) % chords.length];
      if (step % 8 === 0) ch.forEach(function (f) { note(f / 2, t, 3.6, 0.05, 'triangle'); });
      note(ch[step % 3] * (step % 2 ? 2 : 1), t, 0.6, 0.035, 'sine');
      step++;
      var target = 0.9 * EXA.vis; EXA.master.gain.setTargetAtTime(target, EXA.ctx.currentTime, 0.4);
      if (window.speechSynthesis) try { speechSynthesis.getVoices(); } catch (e) {}
    }
    beat(); EXA.iv = setInterval(beat, 450);
    if (window.speechSynthesis) {
      var pick = function () { var v = speechSynthesis.getVoices().filter(function (x) { return /^th/i.test(x.lang); }); EXA.voice = v[0] || null; };
      pick(); speechSynthesis.onvoiceschanged = pick;
    }
    EXPL.onTime = function (t) {
      var ci = 0; for (var k = 0; k < EXPLAINER_LINES.length; k++) if (t >= EXPLAINER_LINES[k][0]) ci = k;
      if (ci === EXA.lastLine) return; EXA.lastLine = ci;
      if (!window.speechSynthesis || !EXA.voice || EXA.vis < 0.35 || document.hidden) return;
      try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(EXPLAINER_LINES[ci][1]); u.lang = 'th-TH'; u.voice = EXA.voice; u.rate = 1; u.volume = Math.min(1, EXA.vis); speechSynthesis.speak(u); } catch (e) {}
    };
  } catch (e) { EXA.started = false; }
}
function explAudioInit() {
  explAudioStop();
  var fr = document.getElementById('explFrame'); if (!fr) return;
  if (!document.getElementById('explSnd')) fr.insertAdjacentHTML('beforeend', '<div class="expl-snd" id="explSnd" aria-live="polite">' + ic('volume') + '<span class="off">แตะที่ใดก็ได้เพื่อเปิดเสียง</span><span class="onl">มีเสียงประกอบ</span></div>');
  try {
    var th = []; for (var i = 0; i <= 20; i++) th.push(i / 20);
    new IntersectionObserver(function (es) {
      EXA.vis = es[0].intersectionRatio;
      if (EXA.master && EXA.ctx) EXA.master.gain.setTargetAtTime(0.9 * EXA.vis, EXA.ctx.currentTime, 0.3);
      if (EXA.vis < 0.2 && window.speechSynthesis) try { speechSynthesis.cancel(); } catch (e) {}
    }, { threshold: th }).observe(fr);
  } catch (e) {}
  document.addEventListener('pointerdown', explAudioUnlock, true); document.addEventListener('keydown', explAudioUnlock, true); document.addEventListener('touchstart', explAudioUnlock, true);
}
(function () {
  var s0 = startExplainer, s1 = stopExplainer;
  startExplainer = function () { s0.apply(this, arguments); explAudioInit(); };
  stopExplainer = function () { explAudioStop(); return s1.apply(this, arguments); };
})();

/* ---------------- ต่อเติมหน้าแรกเดิม (ไม่ลบส่วนใด) ---------------- */
(function () {
  var base = renderWelcome;
  renderWelcome = function () {
    var v = pickHeroVariant();
    base.apply(this, arguments);
    try {
      sendHit();
      var hero = ROOT.querySelector('.hero');
      if (hero && v !== 'corridor') {
        var st = hero.querySelector('.stage'); if (st) st.outerHTML = heroVariantHtml(v);
        hero.setAttribute('data-variant', v);
        loadMedia().then(function () { fillHeroVariant(ROOT, v); });
      } else if (hero) hero.setAttribute('data-variant', 'corridor');
      // วิดีโอแนะนำต่อจากขั้นตอนเริ่มต้นใช้งาน 6 ขั้นตอน แล้วตามด้วยแดชบอร์ดสถิติ
      var steps = $$('main.wrap > section', ROOT).filter(function (s) { return s.querySelector('.timeline'); })[0];
      var holder = document.createElement('div'); holder.innerHTML = explainerHtml() + dashHtml();
      var after = steps || ($$('main.wrap > section', ROOT)[0]);
      if (after) { while (holder.firstChild) { after.parentNode.insertBefore(holder.lastChild, after.nextSibling); } }
      if (typeof observeRise === 'function') observeRise(ROOT);
      $$('#explFrame,#trafficDash', ROOT).forEach(function (x) { x.classList.add('in'); });
      startExplainer();
      var dash = document.getElementById('trafficDash');
      if (dash && 'IntersectionObserver' in window) { var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); loadDashboard(); } }, { rootMargin: '200px' }); io.observe(dash); }
      else loadDashboard();
    } catch (e) { try { reportError('welcome.v4', e); } catch (x) {} }
  };
  var baseApp = renderApp;
  renderApp = function () { stopExplainer(); return baseApp.apply(this, arguments); };
})();
</script>
