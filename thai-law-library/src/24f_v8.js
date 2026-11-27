<script>
/* =========================================================================
 *  VERSION 8 (หน้าเว็บ) — เพิ่มเฉพาะจุด ไม่เปลี่ยนส่วนอื่น
 *  1) หน้าเข้าสู่ระบบ: แสดงเบอร์โทรศัพท์ตามที่กรอกตอนสมัคร (แก้ไขไม่ได้ในหน้านี้ — แก้ได้ที่โปรไฟล์หลังเข้าสู่ระบบ)
 *  2) โปรไฟล์: การแจ้งเตือนทาง LINE (เชื่อมต่อด้วยเบอร์โทรศัพท์เดียวกัน + รหัส 6 หลัก)
 *  3) ตัวบท: บรรทัดหมายเหตุการแก้ไขเพิ่มเติมไม่ถูกนับเป็นวรรค/อนุมาตรา
 *  4) จำนวนกฎหมายตามข้อเท็จจริง: ไทย / ต่างประเทศ / รวม แยก “มีตัวบทแยกรายมาตรา” และ “ตัวบททั้งฉบับ”
 * ========================================================================= */
(function () {
  /* ---------- เก็บเบอร์โทรศัพท์ที่สมัคร/ที่ใช้ล่าสุดไว้ในอุปกรณ์นี้ (สำหรับแสดงในหน้าเข้าสู่ระบบ) ---------- */
  function savePhone(ph) { ph = String(ph || '').trim(); if (ph) store.set('regPhone', ph); }
  var baseApi = api;
  api = function (action, payload, opt) {
    if (action === 'register' && payload && payload.form && !payload.form.phone && typeof REG === 'object' && REG && REG.phone) payload = Object.assign({}, payload, { form: Object.assign({}, payload.form, { phone: REG.phone }) });
    return baseApi(action, payload, opt).then(function (r) {
      try {
        if (action === 'register' && payload && payload.form) savePhone(payload.form.phone);
        else if ((action === 'login' || action === 'verifyOtp' || action === 'bootstrap') && r && r.member) savePhone(r.member.phone);
        else if (action === 'updateProfile' && payload && payload.fields) savePhone(payload.fields.phone);
      } catch (e) {}
      return r;
    });
  };

  /* ---------- 0) สมัครสมาชิก: ช่องหมายเลขโทรศัพท์ (ใช้แสดงในหน้าเข้าสู่ระบบและเชื่อมต่อ LINE) ---------- */
  function phoneOk(v) { var d = String(v || '').replace(/[\s\-()]/g, ''); if (/^\+?66/.test(d)) d = '0' + d.replace(/^\+?66/, ''); return /^0\d{8,9}$/.test(d) ? d : ''; }
  var baseRegStep = regStep;
  regStep = function (n) {
    baseRegStep(n);
    try {
      var b = document.getElementById('regBody'); if (!b) return;
      if (n === 1 && !document.getElementById('rPhone')) {
        var em = document.getElementById('rEmail'), host = em && em.closest('.field');
        if (host) host.insertAdjacentHTML('afterend', '<div style="margin-top:12px">' + textField('rPhone', 'หมายเลขโทรศัพท์', REG.phone || '', true, { type: 'tel', ac: 'tel', max: 20, ph: '08x-xxx-xxxx', hint: 'ใช้สำหรับการติดต่อสอบถามข้อมูล การยืนยันตัวตน และการแจ้งเหตุขัดข้องเกี่ยวกับบัญชีหรือการใช้งานระบบ โดยผู้ดูแลระบบ หมายเลขนี้จะแสดงในหน้าเข้าสู่ระบบและแก้ไขได้ภายหลังที่หน้าโปรไฟล์' }) + '</div>');
        if (!b.dataset.phHook) {
          b.dataset.phHook = '1';
          b.addEventListener('click', function (e) {
            if (!e.target.closest || !e.target.closest('#rNext1')) return;
            var inp = document.getElementById('rPhone'); if (!inp) return;
            var d = phoneOk(inp.value);
            if (!d) { setErr('rPhone', 'กรุณากรอกหมายเลขโทรศัพท์ให้ถูกต้อง (เช่น 0812345678)'); e.stopImmediatePropagation(); e.preventDefault(); inp.focus(); return; }
            setErr('rPhone', ''); REG.phone = d;
          }, true);
        }
      }
      if (n === 4 && REG.phone) { var dl = b.querySelector('dl.kv'); if (dl && !dl.querySelector('[data-ph]')) dl.insertAdjacentHTML('beforeend', '<dt data-ph>หมายเลขโทรศัพท์</dt><dd>' + esc(REG.phone) + '</dd>'); }
    } catch (e) {}
  };

  /* ---------- 1) หน้าเข้าสู่ระบบ ---------- */
  var baseLogin = renderLogin;
  renderLogin = function (prefill) {
    baseLogin(prefill);
    var ph = store.get('regPhone', '');
    var userField = document.getElementById('lUser'); if (!userField) return;
    var host = userField.closest('.field'); if (!host || document.getElementById('lPhone')) return;
    host.insertAdjacentHTML('afterend',
      '<div class="field ph-lock"><label for="lPhone">หมายเลขโทรศัพท์</label>' +
      '<div class="input locked">' + ic('phone') + '<input id="lPhone" type="tel" readonly tabindex="-1" aria-readonly="true" value="' + esc(ph) + '" placeholder="จะแสดงเบอร์ที่กรอกตอนสมัครสมาชิก">' + ic('lock') + '</div>' +
      '<div class="hint small muted">' + (ph ? 'เบอร์ตามที่กรอกตอนสมัครสมาชิก — แก้ไขในหน้านี้ไม่ได้ หลังเข้าสู่ระบบแล้วแก้ไขได้ที่ โปรไฟล์ › แก้ไขข้อมูล' : 'ยังไม่มีเบอร์ที่บันทึกในอุปกรณ์นี้ เบอร์จะแสดงหลังสมัครสมาชิกหรือเข้าสู่ระบบครั้งแรกบนอุปกรณ์นี้') + '</div></div>');
  };

  /* ---------- 2) โปรไฟล์: การแจ้งเตือนทาง LINE ---------- */
  function lineHtml(st, link) {
    var bot = (link && link.bot) || st.bot || {};
    var addBtn = bot.addUrl ? '<a class="btn" href="' + esc(bot.addUrl) + '" target="_blank" rel="noopener">' + ic('user') + ' เพิ่มเพื่อน LINE ' + esc(bot.basicId || '') + '</a>' : '';
    if (!st.configured) return '<p class="muted small">ผู้ดูแลระบบยังไม่ได้เปิดการแจ้งเตือนทาง LINE</p>';
    if (st.linked) return '<div class="row wrapr" style="gap:10px;align-items:center"><span class="st-badge ok">เชื่อมต่อแล้ว</span><span class="small muted">เบอร์ ' + esc(st.phoneMasked || '') + (st.linkedAt ? ' · เมื่อ ' + esc(fmtDateTime(st.linkedAt)) : '') + '</span></div>' +
      '<p class="small" style="margin:10px 0">ท่านจะได้รับข้อความ “เข้าสู่ระบบสำเร็จ” ทาง LINE ทุกครั้งที่เข้าสู่ระบบ</p><button class="btn sm ghost" id="lnUnlink">' + ic('x') + ' ยกเลิกการเชื่อมต่อ</button>';
    if (!st.phone) return '<p class="small">กรุณาเพิ่มหมายเลขโทรศัพท์ (เบอร์เดียวกับที่ใช้กับ LINE) ในหน้าแก้ไขโปรไฟล์ก่อน</p>';
    var steps = '<ol class="ln-steps small"><li>เพิ่มเพื่อนบัญชี LINE ของระบบ “คลังกฎหมาย”</li><li>กด “รับรหัสเชื่อมต่อ” แล้วส่งข้อความที่แสดงในแชต LINE</li><li>ระบบตรวจว่าเบอร์ตรงกับที่สมัครไว้ แล้วตอบกลับพร้อมข้อมูลบัญชีของท่าน</li></ol>';
    var code = link ? '<div class="ln-code"><div class="small muted">ส่งข้อความนี้ในแชต LINE (ใช้ได้ ' + link.expiresMin + ' นาที)</div><div class="ln-msg" id="lnMsg">' + esc(link.message) + '</div><button class="btn sm" id="lnCopy">' + ic('copy') + ' คัดลอกข้อความ</button></div>' : '';
    return '<div class="row wrapr" style="gap:10px;align-items:center;margin-bottom:8px"><span class="st-badge bad">ยังไม่เชื่อมต่อ</span><span class="small muted">เบอร์ที่ใช้เชื่อมต่อ: ' + esc(st.phoneMasked) + '</span></div>' + steps +
      '<div class="row wrapr" style="gap:8px;margin-top:8px">' + addBtn + '<button class="btn k" id="lnCode">' + ic('key') + ' รับรหัสเชื่อมต่อ</button></div>' + code;
  }
  function mountLine(el) {
    if (!el || el.querySelector('#lnPanel')) return;
    var sec = document.createElement('section'); sec.className = 'panel'; sec.id = 'lnPanel'; sec.style.marginTop = '16px';
    sec.innerHTML = '<div class="panel-title"><span class="ic">' + ic('bell') + '</span><h3>การแจ้งเตือนทาง LINE</h3></div><div id="lnBody"><p class="muted small">กำลังโหลด…</p></div>';
    el.appendChild(sec);
    var st = null;
    function draw(link) {
      var b = document.getElementById('lnBody'); if (!b || !st) return;
      b.innerHTML = lineHtml(st, link);
      var c = document.getElementById('lnCode');
      if (c) c.onclick = function () { withLoading('กำลังสร้างรหัส', api('lineLinkCode', {})).then(function (r) { draw(r); }).catch(function (e) { toast('ไม่สำเร็จ', e.msg, 'bad'); }); };
      var cp = document.getElementById('lnCopy');
      if (cp) cp.onclick = function () { var t = (document.getElementById('lnMsg') || {}).textContent || ''; try { navigator.clipboard.writeText(t).then(function () { toast('คัดลอกแล้ว', 'นำไปวางในแชต LINE ได้เลย', 'ok'); }); } catch (e) { toast('คัดลอกไม่ได้', t, 'warn'); } };
      var u = document.getElementById('lnUnlink');
      if (u) u.onclick = function () { confirmBox('ยกเลิกการเชื่อมต่อ LINE', 'ท่านจะไม่ได้รับการแจ้งเตือนทาง LINE อีก', { danger: true, icon: 'bell' }).then(function (ok) { if (!ok) return; withLoading('กำลังดำเนินการ', api('lineUnlink', {})).then(function () { st.linked = false; draw(); }).catch(function (e) { toast('ไม่สำเร็จ', e.msg, 'bad'); }); }); };
    }
    api('lineStatus', {}).then(function (r) { st = r; draw(); }).catch(function () { var b = document.getElementById('lnBody'); if (b) b.innerHTML = '<p class="muted small">โหลดข้อมูลไม่สำเร็จ</p>'; });
  }
  var baseProfile = VIEWS.profile;
  VIEWS.profile = function (el) { var r = baseProfile.apply(this, arguments); try { mountLine(el); } catch (e) {} return r; };

  /* ---------- 3) ตัวบท: หมายเหตุการแก้ไขเพิ่มเติม ---------- */
  /* แยกอนุมาตราเป็นบรรทัดตามลำดับเลข (๑)(๒)… และอนุมาตราย่อย (ก)(ข)… ภายในอนุมาตรา
     รองรับเลขอนุมาตราที่ติดข้อความ/เครื่องหมายคำพูด เช่น (๑)“ศาล” และไม่แยกเลขที่เป็นการอ้างอิง เช่น “มาตรา ๑๑ (๔)” “ตาม (๑)” */
  splitInlineItems = function (line) {
    if (/^\[แก้ไขเพิ่มเติม/.test(line)) return [line];
    var re = /(^|[\s”"'’])\(\s*([0-9๐-๙]{1,3}|[ก-ฮ])\s*\)(?=[\s“"‘'ก-๙A-Za-z])/g, m, toks = [];
    while ((m = re.exec(line))) {
      var pos = m.index + m[1].length, before = line.slice(Math.max(0, pos - 24), pos);
      var ref = /(มาตรา|อนุมาตรา|ข้อ|วรรค|ตาม|แห่ง|ถึง|ของ)\s*[0-9๐-๙\/]*\s*(?:(?:ทวิ|ตรี|จัตวา)\s*)?(?:\([0-9๐-๙ก-ฮ]+\)\s*)*$/.test(before);
      var v = m[2], letter = /[ก-ฮ]/.test(v), n = letter ? TH_LETTERS.indexOf(v) + 1 : Number(ard(v));
      toks.push({ pos: pos, n: n, letter: letter, ref: ref });
    }
    function bestRun(letter, from, to) {
      var best = [];
      for (var i = 0; i < toks.length; i++) {
        var t = toks[i]; if (t.letter !== letter || t.n !== 1 || t.ref || t.pos < from || t.pos >= to) continue;
        var run = [t];
        for (var j = i + 1; j < toks.length; j++) { var u = toks[j]; if (u.pos >= to) break; if (u.letter === letter && u.n === run[run.length - 1].n + 1 && (!u.ref || run.length >= 2)) run.push(u); } // เลขที่ดูเหมือนการอ้างอิงแต่ต่อลำดับพอดี = อนุมาตราถัดไป
        if (run.length > best.length) best = run;
      }
      return best;
    }
    var num = bestRun(false, 0, line.length), cuts = num.slice();
    if (num.length >= 2) {
      num.forEach(function (t, i) { var end = i + 1 < num.length ? num[i + 1].pos : line.length; var sub = bestRun(true, t.pos + 1, end); if (sub.length >= 2) cuts = cuts.concat(sub); });
    } else { cuts = bestRun(true, 0, line.length); }
    if (cuts.length < 2) return [line];
    cuts.sort(function (a, b) { return a.pos - b.pos; });
    var out = [], last = 0;
    cuts.forEach(function (t) { if (t.pos > last) out.push(line.slice(last, t.pos).trim()); last = t.pos; });
    out.push(line.slice(last).trim());
    return out.filter(String);
  };

  /* ---------- 4) จำนวนกฎหมายตามข้อเท็จจริง ---------- */
  function countsHtml(c) {
    var row = function (name, x) { return '<tr><td>' + name + '</td><td data-l="ทั้งหมด (ฉบับ)">' + fmtN(x.laws) + '</td><td data-l="มีตัวบทแยกรายมาตรา">' + fmtN(x.sectioned) + '</td><td data-l="ตัวบททั้งฉบับ">' + fmtN(x.whole) + '</td><td data-l="จำนวนมาตรา">' + fmtN(x.sections) + '</td></tr>'; };
    return '<section class="panel" id="lawCounts"><div class="panel-title"><span class="ic">' + ic('book') + '</span><h3>จำนวนกฎหมายในฐานข้อมูล (ตามข้อเท็จจริง)</h3></div>' +
      '<div class="ctable-wrap"><table class="ctable lc-table"><thead><tr><th>ประเภท</th><th>ทั้งหมด (ฉบับ)</th><th>มีตัวบทแยกรายมาตรา</th><th>ตัวบททั้งฉบับ</th><th>จำนวนมาตรา</th></tr></thead><tbody>' +
      row('กฎหมายไทย', c.thai) + row('กฎหมายต่างประเทศ (' + fmtN(c.foreign.countries) + ' ประเทศ)', c.foreign) + '</tbody><tfoot>' + row('<b>รวมทั้งหมด</b>', c.total).replace('<tr>', '<tr class="tot">') + '</tfoot></table></div>' +
      '<p class="tiny muted" style="margin-top:8px">นับจากดัชนีของฐานข้อมูลเว็บไซต์โดยตรง: “มีตัวบทแยกรายมาตรา” คือฉบับที่แบ่งเป็นมาตรา/ข้อแล้ว “ตัวบททั้งฉบับ” คือฉบับที่แหล่งข้อมูลให้เป็นข้อความเต็มทั้งฉบับ</p></section>';
  }
  var baseDash = renderDash;
  renderDash = function (box, d) {
    baseDash(box, d);
    try {
      var c = d && d.counts; if (!c) return;
      var k = box.querySelector('.dash-kpis');
      if (k) {
        var tiles = k.querySelectorAll('.dk'), last = tiles[tiles.length - 1];
        if (last) { var v = last.querySelector('.dk-v'), u = last.querySelector('.dk-u'); if (v) v.textContent = fmtN(c.total.laws); if (u) u.textContent = 'ฉบับ · ไทย ' + fmtN(c.thai.laws) + ' · ต่างประเทศ ' + fmtN(c.foreign.laws); }
      }
      if (!box.querySelector('#lawCounts') && k) k.insertAdjacentHTML('afterend', countsHtml(c));
    } catch (e) {}
  };
})();
</script>
