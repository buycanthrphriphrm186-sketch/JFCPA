<script>
/* ==========================================================================
   v16: ส่วนที่ผู้ดูแลระบบกดจากระบบหลังบ้าน แล้วแสดงบนหน้าเว็บไซต์หลักทันที (เพิ่มเท่านั้น)
   - ปุ่ม “ถัดไป” ในหน้าแรก → ป๊อปอัปรายละเอียดการทดลองใช้งาน (ยกเลิกซ้ายล่าง · ยอมรับขวาล่าง · กากบาทขวาบน)
   - นาฬิกานับถอยหลังมุมขวาบน เทียบเวลากับเซิร์ฟเวอร์ ทุกเครื่องเดินตรงกัน
   - หมดเวลาทดลอง → กลับหน้าแรกเองทันที พร้อมป๊อปอัปแจ้ง
   - ซ่อนปุ่มเข้าสู่ระบบ สมัครสมาชิก และแชท ระหว่างทดลองใช้งาน (ตามที่เลือกในระบบหลังบ้าน)
   - นับถอยหลังก่อนปิดปรับปรุงทั้งเว็บหรือเฉพาะส่วน แล้วปิดเองเมื่อถึงเวลา
   - บันทึกผู้ทดลองใช้งานลงชีต Config แถว GUEST_NOW
   ทุกส่วนทำงานแบบป้องกันข้อผิดพลาด หากผิดพลาดจะข้ามไปโดยไม่กระทบหน้าเว็บ
   ========================================================================== */
var G16 = { skew: 0, dock: null, sig: '', vals: [], wasActive: false, endShown: false, reloaded: false, beatT: null, views: 1, net: null, open: false };
function g16Safe(fn) { return function () { try { return fn.apply(this, arguments); } catch (e) { try { console.warn('v16', e); } catch (x) {} } }; }
function g16Now() { return Date.now() + G16.skew; }
function g16T(v) { var x = Date.parse(v || ''); return isNaN(x) ? 0 : x; }
function g16Left(ms) { var s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400); s %= 86400; var hh = Math.floor(s / 3600); s %= 3600; var mm = Math.floor(s / 60); s %= 60; return (d ? d + ' วัน ' : '') + ('0' + hh).slice(-2) + ':' + ('0' + mm).slice(-2) + ':' + ('0' + s).slice(-2); }
function g16DT(v) { var x = g16T(v); return x ? fmtDateTime(new Date(x)) : '—'; }
function g16Get(k) { try { return localStorage.getItem('tll.g16.' + k); } catch (e) { return null; } }
function g16Set(k, v) { try { localStorage.setItem('tll.g16.' + k, v); } catch (e) {} }
function g16Gid() {
  var id = g16Get('gid');
  if (!id || !/^G-[A-Za-z0-9]{8,32}$/.test(id)) { id = 'G-'; var c = 'abcdefghijklmnopqrstuvwxyz0123456789'; for (var i = 0; i < 20; i++) id += c.charAt(Math.floor(Math.random() * c.length)); g16Set('gid', id); }
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
      /* ผู้ดูแลปิดโหมดทดลอง/หมดเวลา: กลับหน้าแรกทันทีพร้อมป๊อปอัป (แทนข้อความแจ้งสั้น) */
      if (isGuest() && m.guest && !m.guest.active) { MODES.guest = m.guest; g16End(); }
    } catch (e) {}
    var r = baseModes.apply(this, arguments);
    g16Safe(g16Render)();
    return r;
  };
})();

/* ---------- เดิมป๊อปอัปทดลองใช้งานเด้งขึ้นเอง → เปลี่ยนเป็นกดปุ่ม “ถัดไป” แล้วจึงแสดงรายละเอียด (ไม่มีป๊อปอัปซ้อนกัน) ---------- */
guestOffer = function () { g16Safe(g16Render)(); };
function g16State() {
  var g = MODES.guest || {}, n = g16Now(), from = g16T(g.from), to = g16T(g.to);
  var on = g.on !== undefined ? !!g.on : !!g.active;
  var active = !!g.active && on && (!from || from <= n) && (!to || to > n) && G16.endedKey !== ((g.announcedAt || g.from || '') + '|' + (g.to || ''));
  return { g: g, n: n, from: from, to: to, active: active, pending: on && from > n };
}
function g16Details() {
  if (G16.open || S.token) return;
  var st = g16State(), g = st.g; if (!st.active) return;
  G16.open = true;
  var dis = (g.disabled || []).map(function (k) { return G16_DIS[k] || k; });
  var html = (st.to ? '<div class="g16-cd"><span>เหลือเวลาทดลองใช้งาน</span><b data-g16t="' + st.to + '">' + g16Left(st.to - st.n) + '</b></div>' : '') +
    '<div class="g16-kv"><span>เริ่มทดลองใช้งาน</span><span>' + esc(g16DT(g.from)) + '</span><span>สิ้นสุดการทดลองใช้งาน</span><span>' + esc(st.to ? g16DT(g.to) : 'ตามที่ผู้ดูแลระบบกำหนด') + '</span></div>' +
    (dis.length ? '<div class="g16-dis"><b>ส่วนที่ปิดชั่วคราวระหว่างทดลองใช้งาน:</b> ' + esc(dis.join(', ')) + '<br>เนื่องจากอยู่ในช่วงทดลองใช้งานเว็บไซต์ ซึ่งเปิดให้บุคคลทั่วไปเข้าชมโดยไม่ต้องเข้าสู่ระบบ ระบบจึงปิดส่วนดังกล่าวไว้ก่อน เพื่อความปลอดภัยของข้อมูลสมาชิก และจะกลับมาใช้งานได้ตามปกติเมื่อสิ้นสุดการทดลองใช้งาน</div>' : '') +
    (g.message ? '<p>' + esc(g.message).replace(/\n/g, '<br>') + '</p>' : '') +
    GUEST_TERMS.map(function (t, i) { return '<section><h4>' + (i + 1) + '. ' + esc(t[0]) + '</h4><p>' + esc(t[1]) + '</p></section>'; }).join('');
  popup11({ cls: 'gs11 g16d', icon: 'sparkle', title: g.title || 'ทดลองใช้งานเว็บไซต์คลังกฎหมาย', sub: 'อ่านรายละเอียดแล้วกด “ยอมรับและเข้าใช้งาน”', ok: 'ยอมรับและเข้าใช้งาน', cancel: 'ยกเลิก', html: html })
    .then(function (ok) { G16.open = false; if (ok && g16State().active) { g16Set('acc.' + (g.announcedAt || g.from || 'x'), '1'); guestStart(); } g16Safe(g16Render)(); });
}
function g16Notice(key, title, text, target, label) {
  if (g16Get(key) || G16.open || document.querySelector('#layer .modal-wrap')) return;
  G16.open = true;
  popup11({ cls: 'g16n', icon: 'clock', title: title, ok: 'ตกลง รับทราบ', cancel: 'ยกเลิก',
    html: '<div class="g16-cd warn"><span>' + esc(label) + '</span><b data-g16t="' + target + '">' + g16Left(target - g16Now()) + '</b></div><p>' + esc(text).replace(/\n/g, '<br>') + '</p>' })
    .then(function () { G16.open = false; g16Set(key, '1'); });
}
function g16End() {
  var g = MODES.guest || {}, key = (g.announcedAt || g.from || '') + '|' + (g.to || '');
  if (G16.endShown || G16.endedKey === key) return;
  G16.endShown = true; G16.wasActive = false; G16.endedKey = key;
  /* ถือว่าสิ้นสุดแล้วทันที ไม่ต้องรอรอบตรวจถัดไป (ปุ่มเข้าสู่ระบบกลับมาทันที ไม่มีป๊อปอัปซ้ำ) */
  MODES.guest = Object.assign({}, g, { active: false });
  try { if (isGuest()) guestEnd('', ''); } catch (e) {}
  document.body.classList.remove('g16-no-login', 'g16-no-signup', 'g16-no-chat');
  setTimeout(function () {
    popup11({ cls: 'g16e', icon: 'clock', title: 'หมดเวลาทดลองใช้งานเว็บไซต์แล้ว', ok: 'ตกลง', cancel: '',
      html: '<p>' + esc(g.endMessage || 'หมดเวลาทดลองใช้งานเว็บไซต์คลังกฎหมายแล้ว\n\nขอบคุณที่ร่วมทดลองใช้งาน หากต้องการใช้งานต่อ กรุณากด “สมัครสมาชิก” เพื่อขอรับรหัสผ่านจากผู้ดูแลระบบ หรือกด “เข้าสู่ระบบ” หากได้รับรหัสผ่านจากผู้ดูแลระบบเรียบร้อยแล้ว').replace(/\n/g, '<br>') + '</p>' })
      .then(function () { G16.endShown = false; try { if (S.token) return; window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) {} });
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
  return !!(document.querySelector('.app-head') || document.querySelector('.hero'));
}

/* ---------- แสดงผลมุมขวาบน + ซ่อนปุ่ม ---------- */
function g16Render() {
  var st = g16State(), g = st.g, n = st.n, items = [];
  var publicView = !S.token || isGuest();
  /* ซ่อนปุ่มระหว่างทดลองใช้งาน (เฉพาะผู้ที่ยังไม่ได้เข้าสู่ระบบ/ผู้ทดลองใช้งาน) */
  var dis = st.active && publicView ? (g.disabled || []) : [];
  document.body.classList.toggle('g16-no-login', dis.indexOf('login') > -1);
  document.body.classList.toggle('g16-no-signup', dis.indexOf('signup') > -1);
  document.body.classList.toggle('g16-no-chat', dis.indexOf('chat') > -1);
  if (st.active) G16.wasActive = true;
  /* หมดเวลาตามนาฬิกาเซิร์ฟเวอร์: กลับหน้าแรกเองทันที */
  if (isGuest() && st.to && st.to <= n) { g16End(); return g16Paint([]); }
  if (!st.active && G16.wasActive && publicView && (!g.on || (st.to && st.to <= n))) { if (isGuest() || !S.token) g16End(); }
  if (!g16Ready()) return g16Paint([]);
  if (st.active && publicView) {
    if (!S.token) items.push({ next: true });
    else if (st.to) items.push({ label: 'เหลือเวลาทดลองใช้งาน', target: st.to });
  }
  if (st.pending && publicView) {
    items.push({ label: 'เริ่มทดลองใช้งานเว็บไซต์ในอีก', target: st.from });
    g16Notice('pre.' + (g.announcedAt || g.from), 'แจ้งล่วงหน้า: ทดลองใช้งานเว็บไซต์', (g.notice || 'เว็บไซต์จะเปิดให้ทดลองใช้งานตามเวลาที่กำหนด ขออภัยในความไม่สะดวก') + '\n\nเริ่ม: ' + g16DT(g.from) + (st.to ? '\nสิ้นสุด: ' + g16DT(g.to) : ''), st.from, 'เริ่มทดลองใช้งานในอีก');
  }
  var m = MODES.maint16 || {};
  if (m.scheduled && g16T(m.start) > n) {
    items.push({ label: 'ปิดปรับปรุงเว็บไซต์ในอีก', target: g16T(m.start), warn: true });
    g16Notice('mt.' + m.start, 'แจ้งปิดปรับปรุงเว็บไซต์', 'สาเหตุ: ' + (m.reason || '-') + '\nเริ่มปิดปรับปรุง: ' + g16DT(m.start) + (m.end ? '\nคาดว่าจะเปิดใช้งาน: ' + g16DT(m.end) : '') + '\n\nข้อมูลของท่านยังคงได้รับการเก็บรักษาไว้ครบถ้วน กรุณาบันทึกงานก่อนถึงเวลา ขออภัยในความไม่สะดวก', g16T(m.start), 'ปิดปรับปรุงในอีก');
  }
  /* ถึงเวลาปิดปรับปรุงทั้งเว็บ: ตรวจกับเซิร์ฟเวอร์แล้วแสดงหน้าปิดปรับปรุงทันที */
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
  var sig = items.map(function (x) { return x.next ? 'N' : x.label + x.target; }).join('|');
  if (!G16.dock || !G16.dock.isConnected) { G16.dock = document.createElement('div'); G16.dock.id = 'g16dock'; G16.dock.className = 'g16-dock'; document.body.appendChild(G16.dock); G16.sig = null; }
  if (sig !== G16.sig) {
    G16.sig = sig; G16.dock.innerHTML = ''; G16.vals = [];
    items.forEach(function (x) {
      if (x.next) { var b = document.createElement('button'); b.type = 'button'; b.className = 'g16-next'; b.id = 'g16Next'; b.innerHTML = 'ถัดไป ' + ic('chevR'); b.setAttribute('aria-label', 'ถัดไป: รายละเอียดการทดลองใช้งานเว็บไซต์'); b.onclick = g16Safe(g16Details); G16.dock.appendChild(b); return; }
      var p = document.createElement('div'); p.className = 'g16-pill' + (x.warn ? ' warn' : ''); p.setAttribute('role', 'timer');
      var l = document.createElement('span'); l.textContent = x.label; var v = document.createElement('b');
      p.appendChild(l); p.appendChild(v); G16.dock.appendChild(p); G16.vals.push([v, x.target]);
    });
  }
  var n = g16Now();
  G16.vals.forEach(function (a) { a[0].textContent = g16Left(a[1] - n); });
  $$('[data-g16t]').forEach(function (b) { b.textContent = g16Left(Number(b.getAttribute('data-g16t')) - n); });
}
setInterval(g16Safe(g16Render), 1000);

/* ---------- บันทึกผู้ทดลองใช้งาน (GUEST_NOW) ทุก 15 วินาที ขณะเปิดหน้าเว็บ ---------- */
document.addEventListener('click', function () { G16.views++; }, { passive: true, capture: true });
function g16Beat() {
  var st = g16State();
  if (!st.active || (S.token && !isGuest()) || document.visibilityState !== 'visible' || !g16Ready()) return;
  var d = {}; try { d = deviceInfo(); } catch (e) {}
  var send = function (ip) {
    ip = ip || {};
    api('guestBeat', { id: g16Gid(), device: d.device || '', os: d.os || '', browser: d.browser || '', ip: ip.ip || '', loc: ip.location || '',
      page: isGuest() ? ('ทดลองใช้งาน · ' + ((S.ui && S.ui.view) || '')) : 'หน้าแรก', views: G16.views, screen: (screen.width || 0) + 'x' + (screen.height || 0), lang: navigator.language || '',
      acc2: isGuest() || g16Get('acc.' + (st.g.announcedAt || st.g.from || 'x')) ? '1' : '' }, { noRetry: true, silent: true, timeout: 10000 }).catch(function () {});
  };
  if (G16.net) return send(G16.net);
  try { lookupIp().then(function (o) { G16.net = o || {}; send(G16.net); }, function () { G16.net = {}; send({}); }); } catch (e) { G16.net = {}; send({}); }
}
setInterval(g16Safe(g16Beat), 15000);
setTimeout(g16Safe(g16Beat), 3000);
document.addEventListener('visibilitychange', g16Safe(function () { if (document.visibilityState === 'visible') g16Beat(); }));
</script>
