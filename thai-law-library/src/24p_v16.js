<script>
/* ==========================================================================
   v16–v17: ส่วนที่ผู้ดูแลระบบกดจากระบบหลังบ้าน แล้วแสดงบนหน้าเว็บไซต์หลักทันที (เพิ่มเท่านั้น)
   - เปิดโหมดทดลอง: หลังหน้าโลโก้แสดงป๊อปอัปรายละเอียดทันที (ยกเลิกซ้ายล่าง · ยอมรับขวาล่าง · กากบาทขวาบน)
   - ปุ่ม “ถัดไป” อยู่ด้านบนมุมขวาแทนปุ่มเข้าสู่ระบบ/สมัครสมาชิก (ปิดโหมดทดลอง → แสดงปุ่มเดิม)
   - ยอมรับก่อนถึงเวลาเริ่ม → หน้านับถอยหลัง + ปุ่ม “ตรวจสอบอีกครั้ง” (เข้าใช้งานได้เมื่อถึงเวลา)
   - นาฬิกานับถอยหลังเทียบเวลากับเซิร์ฟเวอร์ ทุกเครื่องเดินตรงกัน รองรับข้ามวัน/เดือน/ปี
     เลื่อนได้อิสระ แต่เมื่อปล่อยจะชิดขอบ/มุมเสมอ (ไม่อยู่กลางจอ)
   - หมดเวลาทดลอง → กลับหน้าแรกเองทันที พร้อมป๊อปอัปแจ้ง
   - นับถอยหลังก่อนปิดปรับปรุงทั้งเว็บหรือเฉพาะส่วน แล้วปิดเองเมื่อถึงเวลา
   - สถานะผู้ทดลองใช้งานส่งไประบบหลังบ้าน (Config แถว GUEST_NOW) ทันทีที่กดยอมรับ และต่อเนื่องตราบที่ยังเปิดหน้าเว็บ
     โดยไม่ต้องแตะหรือเลื่อนหน้าจอ · รหัสอุปกรณ์ไม่ซ้ำกัน · อุปกรณ์และตำแหน่งจริง
   ทุกส่วนทำงานแบบป้องกันข้อผิดพลาด หากผิดพลาดจะข้ามไปโดยไม่กระทบหน้าเว็บ
   ========================================================================== */
var G16 = { skew: 0, dock: null, sig: '', vals: [], wasActive: false, endShown: false, reloaded: false, views: 1, net: null, geo: null, open: false, autoKey: '', endedKey: '', drag: null };
function g16Safe(fn) { return function () { try { return fn.apply(this, arguments); } catch (e) { try { console.warn('v16', e); } catch (x) {} } }; }
function g16Now() { return Date.now() + G16.skew; }
function g16T(v) { var x = Date.parse(v || ''); return isNaN(x) ? 0 : x; }
/* เวลาคงเหลือ: รองรับข้ามวัน เดือน และปี (นับตามปฏิทินเวลาประเทศไทย) */
function g16AddMonths(t, k) { var d = new Date(t + 7 * 3600000), y = d.getUTCFullYear(), m = d.getUTCMonth() + k, day = d.getUTCDate(); var last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); var r = Date.UTC(y, m, Math.min(day, last), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()); return r - 7 * 3600000; }
function g16Left(ms) {
  ms = Math.max(0, ms); var now = g16Now(), end = now + ms, months = 0;
  if (ms >= 28 * 86400000) { while (months < 2400 && g16AddMonths(now, months + 1) <= end) months++; }
  var rest = end - g16AddMonths(now, months), s = Math.max(0, Math.floor(rest / 1000)), d = Math.floor(s / 86400); s %= 86400;
  var hh = Math.floor(s / 3600); s %= 3600; var mm = Math.floor(s / 60); s %= 60;
  var y = Math.floor(months / 12), mo = months % 12;
  return (y ? y + ' ปี ' : '') + (mo ? mo + ' เดือน ' : '') + (d ? d + ' วัน ' : '') + ('0' + hh).slice(-2) + ':' + ('0' + mm).slice(-2) + ':' + ('0' + s).slice(-2);
}
var G16_DAY = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
var G16_MON = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
/* วันเวลาแบบไทย ตามเวลาประเทศไทย: วันอาทิตย์ที่ 22 พฤศจิกายน พ.ศ. 2569 เวลา 22:36:00 น. */
function g16DT(v) {
  var x = g16T(v); if (!x) return '—';
  var d = new Date(x + 7 * 3600000), p = function (n) { return ('0' + n).slice(-2); };
  return 'วัน' + G16_DAY[d.getUTCDay()] + 'ที่ ' + d.getUTCDate() + ' ' + G16_MON[d.getUTCMonth()] + ' พ.ศ. ' + (d.getUTCFullYear() + 543) + ' เวลา ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds()) + ' น.';
}
function g16Get(k) { try { return localStorage.getItem('tll.g16.' + k); } catch (e) { return null; } }
function g16Set(k, v) { try { localStorage.setItem('tll.g16.' + k, v); } catch (e) {} }
/* รหัสผู้ทดลองใช้งาน: สร้างอัตโนมัติ ไม่ซ้ำกันในแต่ละอุปกรณ์ (สุ่มแบบเข้ารหัส 20 ตัวอักษร) */
function g16Gid() {
  var id = g16Get('gid');
  if (!id || !/^G-[A-Za-z0-9]{8,32}$/.test(id)) {
    var c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = 'G-', a = null;
    try { a = new Uint32Array(20); (window.crypto || window.msCrypto).getRandomValues(a); } catch (e) { a = null; }
    for (var i = 0; i < 20; i++) out += c.charAt((a ? a[i] : Math.floor(Math.random() * 4294967296)) % c.length);
    id = out; g16Set('gid', id);
  }
  return id;
}
var G16_DIS = { login: 'เข้าสู่ระบบ', signup: 'สมัครสมาชิก', chat: 'แชทกับผู้ดูแลระบบ', ai: 'ผู้ช่วย AI', save: 'บันทึก/รายการโปรด' };
var G16_SEC = { content: 'เนื้อหาทั้งหมด', thai: 'กฎหมายไทย', foreign: 'กฎหมายต่างประเทศ', deka: 'คำพิพากษาศาลฎีกา', treaties: 'อนุสัญญาและสนธิสัญญา', tools: 'เครื่องมือ', ai: 'ผู้ช่วย AI', chat: 'แชทกับผู้ดูแลระบบ', horo: 'ดูดวง', rating: 'ให้คะแนน' };
function g16SecName(k) { var p = String(k).split(':'); return (G16_SEC[p[0]] || p[0]) + (p[1] ? ' (' + p.slice(1).join(':') + ')' : ''); }

/* ---------- เวลาเซิร์ฟเวอร์ (ทุกเครื่องนับถอยหลังตรงกันแม้นาฬิกาเครื่องคลาดเคลื่อน) ---------- */
(function () {
  var baseApi = api;
  api = function (action, payload, opt) {
    var t0 = Date.now();
    return baseApi(action, payload, opt).then(function (r) {
      try { if (r && r.modes && r.modes.now && (action === 'ping' || action === 'pulse')) { var rtt = Date.now() - t0; if (rtt < 8000) G16.skew = r.modes.now + rtt / 2 - Date.now(); } } catch (e) {}
      return r;
    });
  };
  var baseModes = applyModes;
  applyModes = function (m) {
    if (!m) return;
    try {
      MODES.maint16 = m.maint || { scheduled: false }; MODES.secSched = m.secSched || [];
      if (isGuest() && m.guest && !m.guest.active) { MODES.guest = m.guest; g16End(); }
    } catch (e) {}
    var r = baseModes.apply(this, arguments);
    g16Safe(g16Render)();
    return r;
  };
})();

/* ป๊อปอัปเดิมของเวอร์ชัน 11 ไม่เด้งเอง — ใช้ป๊อปอัปรายละเอียดของเวอร์ชันนี้แทน (ไม่มีป๊อปอัปซ้อนกัน) */
guestOffer = function () { g16Safe(g16Render)(); };
function g16Key(g) { return (g.announcedAt || g.from || '') + '|' + (g.to || ''); }
function g16State() {
  var g = MODES.guest || {}, n = g16Now(), from = g16T(g.from), to = g16T(g.to);
  var on = (g.on !== undefined ? !!g.on : !!g.active) && G16.endedKey !== g16Key(g);
  /* ถึงเวลาเริ่มตามนาฬิกาเซิร์ฟเวอร์ → นับว่าเริ่มแล้วทันที (ไม่ต้องรอรอบตรวจถัดไป) */
  var active = on && (g.on !== undefined || !!g.active) && (!from || from <= n) && (!to || to > n);
  var pending = on && from > n && (!to || to > from);
  return { g: g, n: n, from: from, to: to, active: active, pending: pending, on: active || pending, accepted: !!g16Get('acc.' + g16Key(g)) };
}
function g16Details() {
  if (G16.open || S.token) return;
  var st = g16State(), g = st.g; if (!st.on) return;
  G16.open = true;
  var dis = (g.disabled || []).map(function (k) { return G16_DIS[k] || k; });
  var sec = function (t, b) { return '<section><h4>' + esc(t) + '</h4><p>' + b + '</p></section>'; };
  var html = '<div class="g16-cd"><span>' + (st.pending ? 'เริ่มทดลองใช้งานในอีก' : 'เหลือเวลาทดลองใช้งาน') + '</span><b data-g16t="' + (st.pending ? st.from : st.to) + '">' + (st.pending || st.to ? g16Left((st.pending ? st.from : st.to) - st.n) : 'ไม่มีกำหนดสิ้นสุด') + '</b></div>' +
    '<div class="g16-kv"><span>เริ่มทดลองใช้งาน</span><span>' + esc(st.from ? g16DT(g.from) : 'ทันทีที่ผู้ดูแลระบบเปิด') + '</span><span>สิ้นสุดการทดลองใช้งาน</span><span>' + esc(st.to ? g16DT(g.to) : 'ตามที่ผู้ดูแลระบบกำหนด') + '</span><span>รหัสผู้ทดลองใช้งาน</span><span>' + esc(g16Gid()) + '</span></div>' +
    (dis.length ? '<div class="g16-dis"><b>ส่วนที่ปิดชั่วคราวระหว่างทดลองใช้งาน:</b> ' + esc(dis.join(', ')) + '<br>เนื่องจากอยู่ในช่วงทดลองใช้งานเว็บไซต์ ซึ่งเปิดให้บุคคลทั่วไปเข้าชมโดยไม่ต้องเข้าสู่ระบบ ระบบจึงปิดส่วนดังกล่าวไว้ก่อน เพื่อความปลอดภัยของข้อมูลสมาชิก และจะกลับมาใช้งานได้ตามปกติเมื่อสิ้นสุดการทดลองใช้งาน</div>' : '') +
    (g.message ? sec('ข้อความจากผู้ดูแลระบบ', esc(g.message).replace(/\n/g, '<br>')) : '') +
    sec('ช่วงเวลาทดลองใช้งาน', 'ท่านใช้งานได้ตั้งแต่ ' + esc(st.from ? g16DT(g.from) : 'ขณะนี้') + (st.to ? ' จนถึง ' + esc(g16DT(g.to)) : '') + ' ตามเวลาประเทศไทย นาฬิกานับถอยหลังทุกเครื่องเทียบเวลากับเซิร์ฟเวอร์ของเว็บไซต์ จึงแสดงเวลาตรงกันทุกอุปกรณ์ แม้นาฬิกาของอุปกรณ์จะคลาดเคลื่อน' + (st.pending ? ' เมื่อกดยอมรับก่อนถึงเวลาเริ่ม ระบบจะแสดงหน้านับถอยหลัง และเข้าใช้งานได้เมื่อถึงเวลาโดยกด “ตรวจสอบอีกครั้ง”' : '')) +
    sec('สิ่งที่ใช้งานได้ระหว่างทดลอง', 'อ่าน ค้นหา และพิมพ์เนื้อหากฎหมายไทย กฎหมายต่างประเทศ คำพิพากษาศาลฎีกา และอนุสัญญาระหว่างประเทศ ใช้เครื่องมือสำหรับนักกฎหมาย และอ่านป้ายพลิกมาตรา' + (dis.length ? ' ยกเว้น ' + esc(dis.join(', ')) : '')) +
    sec('ข้อมูลที่ระบบบันทึกระหว่างทดลอง', 'เพื่อแสดงสถานะการใช้งานแก่ผู้ดูแลระบบตามจริง ระบบบันทึกรหัสผู้ทดลองใช้งานของอุปกรณ์นี้ (' + esc(g16Gid()) + ') ประเภทอุปกรณ์ ระบบปฏิบัติการ เบราว์เซอร์ ขนาดหน้าจอ ภาษา หมายเลข IP และพื้นที่ที่ใช้งาน (จังหวัด/เขต) ตั้งแต่กดยอมรับจนกว่าจะออกจากหน้าเว็บไซต์ แม้ไม่ได้แตะหรือเลื่อนหน้าจอ หากอนุญาตตำแหน่งของอุปกรณ์ ระบบจะใช้ตำแหน่งจริงของอุปกรณ์ หากไม่อนุญาตจะใช้ตำแหน่งโดยประมาณจาก IP ข้อมูลเหล่านี้ใช้เพื่อความปลอดภัยและสถิติการใช้งานเท่านั้น ไม่เปิดเผยต่อบุคคลอื่น ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562') +
    sec('เมื่อสิ้นสุดการทดลองใช้งาน', esc(g.endMessage || 'เมื่อครบเวลาหรือผู้ดูแลระบบปิดการทดลองใช้งาน ระบบจะกลับไปยังหน้าแรกโดยอัตโนมัติ ปุ่มเข้าสู่ระบบและสมัครสมาชิกจะกลับมาใช้งานได้ หากต้องการใช้งานต่อ กรุณาสมัครสมาชิกหรือเข้าสู่ระบบ').replace(/\n/g, '<br>')) +
    GUEST_TERMS.map(function (t, i) { return sec((i + 1) + '. ' + t[0], esc(t[1])); }).join('');
  popup11({ cls: 'gs11 g16d', icon: 'sparkle', title: g.title || 'ทดลองใช้งานเว็บไซต์คลังกฎหมาย', sub: 'กรุณาอ่านรายละเอียดและข้อกำหนดให้ครบถ้วน แล้วกด “ยอมรับ”', ok: 'ยอมรับ', cancel: 'ยกเลิก', html: html })
    .then(function (ok) {
      G16.open = false;
      var now = g16State();
      if (ok && now.on) {
        g16Set('acc.' + g16Key(now.g), '1');
        if (now.active) { guestStart(); G16.beatNow = true; }
        else { g16Wait(); g16Beat(); }
      }
      g16Safe(g16Render)();
    });
}
/* ---------- หน้านับถอยหลังก่อนเริ่มทดลองใช้งาน (เข้าใช้งานไม่ได้จนกว่าจะถึงเวลา) ---------- */
function g16Wait() {
  if (S.token) return;
  var st = g16State(), g = st.g; if (!st.pending) return;
  var html = statusPage({ id: 'g16Wait', tone: 'o', icon: 'clock', badge: 'รอเริ่มทดลองใช้งานเว็บไซต์', title: g.title || 'ทดลองใช้งานเว็บไซต์คลังกฎหมาย',
    lead: 'ท่านยอมรับข้อกำหนดแล้ว เว็บไซต์จะเปิดให้ทดลองใช้งานเมื่อถึงเวลาเริ่มด้านล่าง',
    rows: [['clock', 'เริ่มทดลองใช้งาน', g16DT(g.from)], ['calendar', 'สิ้นสุดการทดลองใช้งาน', st.to ? g16DT(g.to) : 'ตามที่ผู้ดูแลระบบกำหนด'], ['user', 'รหัสผู้ทดลองใช้งาน', g16Gid()]],
    extra: '<div class="g16-cd g16-big"><span id="g16WaitL">เริ่มทดลองใช้งานในอีก</span><b data-g16t="' + st.from + '">' + g16Left(st.from - st.n) + '</b></div>' +
      '<div class="sp-act"><button class="btn ghost" id="g16Home">' + ic('arrowL') + ' กลับหน้าแรก</button></div>',
    live: 'กด “ตรวจสอบอีกครั้ง” เพื่อตรวจว่าถึงเวลาเริ่มทดลองใช้งานแล้วหรือยัง' });
  var sp = document.getElementById('splash'); if (sp) sp.remove();
  ROOT.innerHTML = html; window.scrollTo(0, 0);
  $('#g16WaitRetry').onclick = g16Safe(g16Check);
  $('#g16Home').onclick = g16Safe(function () { renderWelcome(); });
}
function g16Check() {
  var b = document.getElementById('g16WaitRetry'); if (b) b.disabled = true;
  api('ping', {}, { noRetry: true, timeout: 10000, silent: true }).then(function () {
    var st = g16State();
    if (st.active) { guestStart(); G16.beatNow = true; }
    else if (st.pending) { var l = document.getElementById('g16WaitLive'); if (l) l.textContent = 'ยังไม่ถึงเวลาเริ่ม · ตรวจสอบล่าสุด ' + g16DT(new Date(g16Now()).toISOString()); toast('ยังไม่ถึงเวลาเริ่มทดลองใช้งาน', 'เหลืออีก ' + g16Left(st.from - g16Now()), 'warn'); }
    else { toast('ผู้ดูแลระบบปิดการทดลองใช้งานแล้ว', '', 'warn'); renderWelcome(); }
  }).catch(function () { toast('ยังตรวจสอบไม่ได้', 'กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง', 'warn'); })
    .then(function () { var bb = document.getElementById('g16WaitRetry'); if (bb) bb.disabled = false; });
}
function g16Notice(key, title, text, target, label) {
  if (g16Get(key) || G16.open || document.querySelector('#layer .modal-wrap')) return;
  G16.open = true;
  popup11({ cls: 'g16n', icon: 'clock', title: title, ok: 'ตกลง รับทราบ', cancel: 'ยกเลิก',
    html: '<div class="g16-cd warn"><span>' + esc(label) + '</span><b data-g16t="' + target + '">' + g16Left(target - g16Now()) + '</b></div><p>' + esc(text).replace(/\n/g, '<br>') + '</p>' })
    .then(function () { G16.open = false; g16Set(key, '1'); });
}
function g16End() {
  var g = MODES.guest || {}, key = g16Key(g);
  if (G16.endShown || G16.endedKey === key) return;
  G16.endShown = true; G16.wasActive = false; G16.endedKey = key;
  MODES.guest = Object.assign({}, g, { active: false });
  try { g16Beat(true); } catch (e) {}
  try { if (isGuest()) guestEnd('', ''); else if (document.getElementById('g16Wait')) renderWelcome(); } catch (e) {}
  document.body.classList.remove('g16-no-login', 'g16-no-signup', 'g16-no-chat', 'g16-trial');
  setTimeout(function () {
    popup11({ cls: 'g16e', icon: 'clock', title: 'หมดเวลาทดลองใช้งานเว็บไซต์แล้ว', ok: 'ตกลง', cancel: '',
      html: '<p>' + esc(g.endMessage || 'หมดเวลาทดลองใช้งานเว็บไซต์คลังกฎหมายแล้ว\n\nขอบคุณที่ร่วมทดลองใช้งาน หากต้องการใช้งานต่อ กรุณากด “สมัครสมาชิก” เพื่อขอรับรหัสผ่านจากผู้ดูแลระบบ หรือกด “เข้าสู่ระบบ” หากได้รับรหัสผ่านจากผู้ดูแลระบบเรียบร้อยแล้ว').replace(/\n/g, '<br>') + '</p>' })
      .then(function () { G16.endShown = false; try { if (!S.token) window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) {} });
  }, 300);
}
/* เซสชันทดลองหมดอายุจากเซิร์ฟเวอร์: แสดงป๊อปอัปเดียว (ไม่แสดงข้อความแจ้งซ้ำซ้อน) */
(function () {
  var baseGE = guestEnd;
  guestEnd = function (t, b) {
    if (t && /สิ้นสุดช่วงทดลอง/.test(String(t))) { var r = baseGE('', ''); g16Safe(g16End)(); return r; }
    return baseGE.apply(this, arguments);
  };
})();
function g16Ready() {
  if (BLOCK_SHOWN || (typeof MAINT !== 'undefined' && MAINT.on) || document.getElementById('maintPage')) return false;
  var sp = document.getElementById('splash');
  if (sp && sp.isConnected) { var cs = getComputedStyle(sp); if (cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05) return false; }
  return !!(document.querySelector('.app-head') || document.querySelector('.hero') || document.querySelector('.pub-head') || document.getElementById('g16Wait'));
}

/* ---------- ปุ่ม “ถัดไป” ด้านบนมุมขวา แทนปุ่มเข้าสู่ระบบ/สมัครสมาชิก ---------- */
function g16HeadBtn(show) {
  var nav = document.querySelector('.pub-head .pub-nav'), cur = document.getElementById('g16Next');
  if (!show) { if (cur) cur.remove(); return; }
  if (cur && cur.isConnected && (!nav || nav.contains(cur))) return;
  if (cur) cur.remove();
  var b = document.createElement('button'); b.type = 'button'; b.className = 'g16-next' + (nav ? '' : ' float'); b.id = 'g16Next';
  b.innerHTML = '<span>ถัดไป</span>' + ic('chevR'); b.setAttribute('aria-label', 'ถัดไป: รายละเอียดการทดลองใช้งานเว็บไซต์');
  b.onclick = g16Safe(function () { if (g16State().accepted && g16State().pending) g16Wait(); else g16Details(); });
  if (nav) nav.appendChild(b); else document.body.appendChild(b);
}

/* ---------- แสดงผล ---------- */
function g16Render() {
  var st = g16State(), g = st.g, n = st.n, items = [];
  var publicView = !S.token || isGuest();
  var dis = st.on && publicView ? (g.disabled || []) : [];
  document.body.classList.toggle('g16-trial', st.on && !S.token);
  document.body.classList.toggle('g16-no-login', dis.indexOf('login') > -1);
  document.body.classList.toggle('g16-no-signup', dis.indexOf('signup') > -1);
  document.body.classList.toggle('g16-no-chat', dis.indexOf('chat') > -1);
  if (st.active && !G16.endShown) G16.wasActive = true;
  if (isGuest() && st.to && st.to <= n) { g16End(); return g16Paint([]); }
  if (!st.on && G16.wasActive && publicView && (!g.on || (st.to && st.to <= n))) { if (isGuest() || !S.token) g16End(); }
  if (!st.on && document.getElementById('g16Wait') && !G16.endShown) { renderWelcome(); }
  var ready = g16Ready();
  g16HeadBtn(ready && st.on && !S.token && !document.getElementById('g16Wait'));
  if (!ready) return g16Paint([]);
  if (isGuest() && G16.beatNow) { G16.beatNow = false; g16Beat(); }
  /* เปิดโหมดทดลอง: แสดงป๊อปอัปรายละเอียดทันทีหลังหน้าโลโก้ (ครั้งเดียวต่อการเปิดหน้า) · ยอมรับแล้วแต่ยังไม่ถึงเวลา → หน้านับถอยหลัง */
  if (st.on && !S.token && !G16.endShown && !G16.open && G16.autoKey !== g16Key(g) && !document.querySelector('#layer .modal-wrap') && !document.getElementById('g16Wait')) {
    G16.autoKey = g16Key(g);
    if (st.pending && st.accepted) g16Wait();
    else setTimeout(g16Safe(function () { if (G16.endShown || document.querySelector('#layer .modal-wrap')) { G16.autoKey = ''; return; } g16Details(); }), 250);
  }
  if (document.getElementById('g16Wait')) {
    var wl = document.getElementById('g16WaitL'), rb = document.getElementById('g16WaitRetry');
    if (st.active) { if (wl) wl.textContent = 'ถึงเวลาทดลองใช้งานแล้ว · กด “ตรวจสอบอีกครั้ง” เพื่อเข้าใช้งาน'; if (rb) rb.classList.add('g16-go'); }
  }
  if (st.active && isGuest() && st.to) items.push({ label: 'เหลือเวลาทดลองใช้งาน', target: st.to });
  var m = MODES.maint16 || {};
  if (m.scheduled && g16T(m.start) > n) {
    items.push({ label: 'ปิดปรับปรุงเว็บไซต์ในอีก', target: g16T(m.start), warn: true });
    g16Notice('mt.' + m.start, 'แจ้งปิดปรับปรุงเว็บไซต์', 'สาเหตุ: ' + (m.reason || '-') + '\nเริ่มปิดปรับปรุง: ' + g16DT(m.start) + (m.end ? '\nคาดว่าจะเปิดใช้งาน: ' + g16DT(m.end) : '') + '\n\nข้อมูลของท่านยังคงได้รับการเก็บรักษาไว้ครบถ้วน กรุณาบันทึกงานก่อนถึงเวลา ขออภัยในความไม่สะดวก', g16T(m.start), 'ปิดปรับปรุงในอีก');
  }
  if (m.scheduled && g16T(m.start) && g16T(m.start) <= n && !G16.reloaded) {
    G16.reloaded = true;
    setTimeout(function () { (S.token ? api('pulse', {}, { noRetry: true, silent: true }) : api('ping', {}, { noRetry: true, silent: true })).catch(function () {}); }, 1500);
    setTimeout(function () { if (!(typeof MAINT !== 'undefined' && MAINT.on) && !document.getElementById('maintPage')) { try { location.reload(); } catch (e) {} } }, 6000);
  }
  (MODES.secSched || []).forEach(function (x) {
    if (g16T(x.start) > n) {
      items.push({ label: 'ปิดปรับปรุง “' + g16SecName(x.key) + '” ในอีก', target: g16T(x.start), warn: true });
      g16Notice('sec.' + x.key + x.start, 'แจ้งปิดปรับปรุงบางส่วนของเว็บไซต์', 'ส่วนที่ปิดปรับปรุง: ' + g16SecName(x.key) + '\nสาเหตุ: ' + (x.reason || '-') + '\nเริ่ม: ' + g16DT(x.start) + (x.end ? '\nเปิดใช้งานอีกครั้ง: ' + g16DT(x.end) : '') + '\n\nส่วนอื่นของเว็บไซต์ยังใช้งานได้ตามปกติ ขออภัยในความไม่สะดวก', g16T(x.start), 'ปิดปรับปรุงในอีก');
    } else if (!G16['sx' + x.key + x.start]) { G16['sx' + x.key + x.start] = 1; setTimeout(function () { (S.token ? api('pulse', {}, { noRetry: true, silent: true }) : api('ping', {}, { noRetry: true, silent: true })).catch(function () {}); }, 1200); }
  });
  g16Paint(items);
}
function g16Paint(items) {
  var sig = items.map(function (x) { return x.label + x.target; }).join('|');
  if (!G16.dock || !G16.dock.isConnected) { G16.dock = document.createElement('div'); G16.dock.id = 'g16dock'; G16.dock.className = 'g16-dock'; G16.dock.setAttribute('title', 'ลากเพื่อย้ายตำแหน่ง (ชิดขอบหรือมุมจอ)'); document.body.appendChild(G16.dock); G16.sig = null; g16DockPlace(); g16DragInit(G16.dock); }
  if (sig !== G16.sig) {
    G16.sig = sig; G16.dock.innerHTML = ''; G16.vals = [];
    items.forEach(function (x) {
      var p = document.createElement('div'); p.className = 'g16-pill' + (x.warn ? ' warn' : ''); p.setAttribute('role', 'timer');
      var l = document.createElement('span'); l.textContent = x.label; var v = document.createElement('b');
      p.appendChild(l); p.appendChild(v); G16.dock.appendChild(p); G16.vals.push([v, x.target]);
    });
    g16DockPlace();
  }
  var n = g16Now();
  G16.vals.forEach(function (a) { a[0].textContent = g16Left(a[1] - n); });
  $$('[data-g16t]').forEach(function (b) { b.textContent = g16Left(Number(b.getAttribute('data-g16t')) - n); });
}

/* ---------- นาฬิกานับถอยหลัง: ลากได้อิสระแบบเรียลไทม์ เมื่อปล่อยจะชิดขอบ/มุมที่ใกล้ที่สุด (ไม่อยู่กลางจอ) ---------- */
function g16Pos() { try { var p = JSON.parse(g16Get('dock') || 'null'); if (p && /^(left|right|top|bottom)$/.test(p.side) && isFinite(p.f)) return p; } catch (e) {} return { side: 'right', f: -1 }; }
function g16DockPlace() {
  var d = G16.dock; if (!d || !d.isConnected || G16.drag) return;
  var p = g16Pos(), M = 12, vw = window.innerWidth, vh = window.innerHeight, w = d.offsetWidth || 0, hgt = d.offsetHeight || 0;
  var topMin = M + (document.body.classList.contains('focus11') ? 0 : 64), maxX = Math.max(M, vw - w - M), maxY = Math.max(topMin, vh - hgt - M);
  var x, y;
  if (p.f < 0) { x = maxX; y = Math.min(maxY, vw <= 600 ? 66 : 76); }
  else if (p.side === 'left' || p.side === 'right') { x = p.side === 'left' ? M : maxX; y = topMin + p.f * (maxY - topMin); }
  else { y = p.side === 'top' ? topMin : maxY; x = M + p.f * (maxX - M); }
  d.style.left = Math.round(x) + 'px'; d.style.top = Math.round(y) + 'px'; d.style.right = 'auto';
}
function g16DragInit(d) {
  var sx = 0, sy = 0, ox = 0, oy = 0, moved = false, pid = null;
  d.addEventListener('pointerdown', function (e) {
    if (!d.firstChild) return;
    var r = d.getBoundingClientRect(); sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top; moved = false; pid = e.pointerId;
    G16.drag = true; d.classList.add('dragging');
    try { d.setPointerCapture(pid); } catch (x) {}
  });
  d.addEventListener('pointermove', function (e) {
    if (!G16.drag || e.pointerId !== pid) return;
    var dx = e.clientX - sx, dy = e.clientY - sy; if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
    var vw = window.innerWidth, vh = window.innerHeight, w = d.offsetWidth, hgt = d.offsetHeight;
    d.style.left = Math.round(Math.min(Math.max(0, ox + dx), vw - w)) + 'px'; d.style.top = Math.round(Math.min(Math.max(0, oy + dy), vh - hgt)) + 'px';
    e.preventDefault();
  });
  var up = function (e) {
    if (!G16.drag || (e && e.pointerId !== pid)) return;
    G16.drag = null; d.classList.remove('dragging');
    try { d.releasePointerCapture(pid); } catch (x) {}
    if (!moved) return g16DockPlace();
    var r = d.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight, M = 12;
    var topMin = M + (document.body.classList.contains('focus11') ? 0 : 64), maxX = Math.max(M, vw - r.width - M), maxY = Math.max(topMin, vh - r.height - M);
    var dist = { left: r.left, right: vw - r.right, top: r.top, bottom: vh - r.bottom }, side = 'right';
    Object.keys(dist).forEach(function (k) { if (dist[k] < dist[side]) side = k; });
    var f = side === 'left' || side === 'right' ? (maxY > topMin ? (Math.min(Math.max(r.top, topMin), maxY) - topMin) / (maxY - topMin) : 0) : (maxX > M ? (Math.min(Math.max(r.left, M), maxX) - M) / (maxX - M) : 0);
    /* ใกล้มุม (ภายใน 15%) → ชิดมุมพอดี */
    if (f < 0.15) f = 0; else if (f > 0.85) f = 1;
    g16Set('dock', JSON.stringify({ side: side, f: Math.round(f * 1000) / 1000 }));
    g16DockPlace();
  };
  d.addEventListener('pointerup', up); d.addEventListener('pointercancel', up); d.addEventListener('lostpointercapture', function () { if (G16.drag) up(); });
  window.addEventListener('resize', g16Safe(g16DockPlace));
}
setInterval(g16Safe(g16Render), 1000);

/* ---------- สถานะผู้ทดลองใช้งาน (GUEST_NOW): ส่งทันทีที่กดยอมรับ และทุก 10 วินาทีตราบที่ยังเปิดหน้าเว็บ
              ไม่ต้องแตะหรือเลื่อนหน้าจอ · ออกจากหน้าเว็บ → แจ้งออกทันที ---------- */
document.addEventListener('click', function () { G16.views++; }, { passive: true, capture: true });
function g16Geo() {
  if (G16.geo || G16.geoAsk || !navigator.geolocation || store.get('geoDenied', false)) return;
  G16.geoAsk = true;
  try {
    navigator.geolocation.getCurrentPosition(function (p) {
      var lat = p.coords.latitude, lng = p.coords.longitude, acc = Math.round(p.coords.accuracy || 0);
      G16.geo = { lat: lat, lng: lng, acc: acc, loc: lat.toFixed(4) + ', ' + lng.toFixed(4) };
      fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + lat + '&longitude=' + lng + '&localityLanguage=th').then(function (r) { return r.json(); }).then(function (j) {
        var loc = [j.locality || j.city, j.principalSubdivision, j.countryName].filter(Boolean).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(', ');
        if (loc) G16.geo.loc = loc + ' (ตำแหน่งจากอุปกรณ์ ±' + acc + ' ม.)';
      }).catch(function () {}).then(function () { g16Beat(); });
    }, function (err) { if (err && err.code === 1) { try { store.set('geoDenied', true); } catch (e) {} } }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 });
  } catch (e) {}
}
function g16Beat(off) {
  var st = g16State();
  var accepted = isGuest() || (st.accepted && !S.token && document.getElementById('g16Wait'));
  if (!off && (!st.on || !accepted || BLOCK_SHOWN)) return;
  if (!off) g16Geo();
  var d = {}; try { d = deviceInfo(); } catch (e) {}
  var geo = G16.geo || {}, ip = G16.net || {};
  api('guestBeat', { id: g16Gid(), off: off ? '1' : '', device: d.device || '', os: d.os || '', browser: d.browser || '', ip: ip.ip || '', loc: geo.loc || ip.location || '',
    lat: geo.lat != null ? geo.lat : '', lng: geo.lng != null ? geo.lng : '', acc: geo.acc != null ? geo.acc : '',
    page: isGuest() ? ('ทดลองใช้งาน · ' + ((S.ui && S.ui.view) || 'หน้าหลัก')) : 'รอเริ่มทดลองใช้งาน', views: G16.views, screen: (screen.width || 0) + 'x' + (screen.height || 0), lang: navigator.language || '', acc2: '1' },
    { noRetry: true, silent: true, timeout: 10000 }).catch(function () {});
  if (!G16.net && !G16.netAsk) { G16.netAsk = true; try { lookupIp().then(function (o) { G16.net = o || {}; if (o && o.ip) g16Beat(); }, function () { G16.net = {}; }); } catch (e) { G16.net = {}; } }
}
setInterval(g16Safe(function () { g16Beat(); }), 10000);
/* ออกจากหน้าเว็บไซต์: ส่งสัญญาณออกแบบ beacon (ส่งได้แม้หน้ากำลังปิด) ทั้งผู้ทดลองใช้งานและสมาชิก */
function g16Leave() {
  var url = (typeof BOOT !== 'undefined' && BOOT.url) || ''; if (!url || !navigator.sendBeacon) return false;
  var sent = false;
  try { if (isGuest() || document.getElementById('g16Wait')) sent = navigator.sendBeacon(url, JSON.stringify({ tll: 'leave', id: g16Gid() })) || sent; } catch (e) {}
  try { if (S.token && !isGuest()) sent = navigator.sendBeacon(url, JSON.stringify({ tll: 'off', t: S.token })) || sent; } catch (e) {}
  return sent;
}
window.addEventListener('pagehide', g16Safe(function () { if (!g16Leave() && (isGuest() || document.getElementById('g16Wait'))) g16Beat(true); }));
</script>
