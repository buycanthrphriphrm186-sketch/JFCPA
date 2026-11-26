<script>
/* ==========================================================================
   v20: เสียงอ่านกฎหมายเล่นได้ทุกมาตราเสมอ (ประมวลกฎหมาย + รัฐธรรมนูญ)
   - มีคีย์ ElevenLabs → ใช้เสียง ElevenLabs ตามเดิม
   - ยังไม่มีคีย์ / โควตาหมด / เครือข่ายขัดข้อง → อ่านด้วยเสียงภาษาไทยของอุปกรณ์ (Web Speech) ทันที ไม่แสดงข้อความแจ้งเตือน
   - อ่านตามรูปแบบเดิม: ชื่อกฎหมาย มาตรา … › วรรค › อนุมาตรา · เว้นช่วงหายใจระหว่างวรรค และเว้น 2 วินาทีระหว่างมาตรา
   ========================================================================== */
var V20 = { mode: null, tok: 0, pos: { id: null, i: 0 }, unlocked: false, GAP: 2000 };
function v20Can() { return typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined'; }
function v20Unlock() {
  if (V20.unlocked || !v20Can()) return; V20.unlocked = true;
  try { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; u.lang = 'th-TH'; speechSynthesis.speak(u); } catch (e) {}
}
function v20Voice(g) {
  if (!v20Can()) return null;
  var vs = (speechSynthesis.getVoices() || []).filter(function (v) { return /^th/i.test(v.lang || ''); });
  if (!vs.length) return null;
  var male = vs.filter(function (v) { return /niwat|pattara|male|ชาย/i.test(v.name) && !/female/i.test(v.name); })[0];
  var fem = vs.filter(function (v) { return /kanya|narisa|premwadee|achara|female|หญิง|google/i.test(v.name); })[0];
  return g === 'm' ? (male || fem || vs[0]) : (fem || vs[0]);
}
function v20Norm(t) {
  return String(t || '').replace(/พ\.ศ\.\s*/g, 'พุทธศักราช ').replace(/ฯลฯ/g, 'และอื่น ๆ').replace(/[“”"]/g, '').replace(/[ \t ]+/g, ' ').trim();
}
/* แบ่งเป็นช่วงสั้น (≤ 180 ตัวอักษร) ตามวรรค/อนุมาตรา เพื่อให้อ่านต่อเนื่องและเว้นจังหวะหายใจ */
function v20Pieces(text) {
  var out = [];
  String(text || '').split('\n').forEach(function (ln) {
    ln = v20Norm(ln); if (!ln) return;
    var cur = '';
    ln.split(' ').forEach(function (w) { if ((cur + ' ' + w).length > 180 && cur) { out.push({ t: cur, gap: 120 }); cur = w; } else cur = cur ? cur + ' ' + w : w; });
    if (cur) out.push({ t: cur, gap: 450 });
  });
  return out;
}
function v20Cancel() { V20.tok++; try { if (v20Can()) speechSynthesis.cancel(); } catch (e) {} }
function v20WebAt(i) {
  clearTimeout(V18.gapT);
  var id = V18.queue[i], s = SECS[id]; if (!s) return;
  V18.idx = i; V18.chunk = 0; V18.playing = true; V18.on = {};
  if (!v20Can()) { V18.playing = false; v18Paint('อุปกรณ์นี้ไม่รองรับการอ่านออกเสียง'); return; }
  v20Cancel();
  var tok = V20.tok, pieces = v20Pieces(v18Text(s, true)), g = V18.voice === 'f' ? 'f' : 'm';
  var start = V20.pos.id === id ? Math.min(V20.pos.i, pieces.length - 1) : 0;
  V20.pos = { id: id, i: start };
  v18Paint(); v18Prefetch20(i);
  var speak = function (k) {
    if (tok !== V20.tok || !V18.playing) return;
    if (k >= pieces.length) {
      V20.pos = { id: null, i: 0 };
      if (V18.idx < V18.queue.length - 1) { V18.gapT = setTimeout(function () { if (V18.playing && tok === V20.tok) v18PlayAt(V18.idx + 1); }, V20.GAP); }
      else { V18.playing = false; v18Paint('ฟังจบแล้ว'); }
      return;
    }
    V20.pos.i = k;
    var u = new SpeechSynthesisUtterance(pieces[k].t), v = v20Voice(g);
    u.lang = 'th-TH'; if (v) u.voice = v; u.rate = 0.95;
    u.pitch = g === 'm' && !(v && /niwat|pattara|male|ชาย/i.test(v.name)) ? 0.8 : 1;
    var fired = false, next = function () { if (fired) return; fired = true; setTimeout(function () { speak(k + 1); }, pieces[k].gap); };
    u.onend = next;
    u.onerror = function (e) { if (e && (e.error === 'interrupted' || e.error === 'canceled')) return; next(); };
    try { speechSynthesis.speak(u); } catch (e) { next(); }
  };
  speak(start);
}
/* เตรียมตัวบทมาตราถัดไปไว้ล่วงหน้า (โหมดเสียงอุปกรณ์ไม่ต้องโหลดเสียง จึงไม่เรียกเซิร์ฟเวอร์) */
function v18Prefetch20(i) { if (V20.mode !== 'web') try { v18Prefetch(); } catch (e) {} }

/* เครื่องเล่นเสียง: เว้น 2 วินาทีระหว่างมาตรา (ทั้งเสียง ElevenLabs และเสียงอุปกรณ์) */
v18Audio = function () {
  if (V18.audio) return V18.audio;
  var a = V18.audio = new Audio(); a.preload = 'auto';
  var basePause = a.pause.bind(a);
  a.pause = function () { v20Cancel(); return basePause(); };
  a.addEventListener('ended', function () {
    var urls = V18.cache[V18.voice + '|' + V18.queue[V18.idx]] || [];
    if (V18.chunk < urls.length - 1) { V18.chunk++; a.src = urls[V18.chunk]; a.play().catch(function () {}); return; }
    if (V18.idx < V18.queue.length - 1) { clearTimeout(V18.gapT); V18.gapT = setTimeout(function () { if (V18.playing) v18PlayAt(V18.idx + 1); }, V20.GAP); }
    else { V18.playing = false; v18Paint('ฟังจบแล้ว'); }
  });
  a.addEventListener('error', function () { if (V18.playing && a.getAttribute('src')) { a.removeAttribute('src'); v20WebAt(V18.idx); } });
  return a;
};
v18PlayAt = function (i) {
  clearTimeout(V18.gapT);
  var a = v18Audio(), id = V18.queue[i]; if (!id) return;
  if (V20.mode === 'web') { try { a.pause(); a.removeAttribute('src'); } catch (e) {} return v20WebAt(i); }
  v20Cancel();
  V18.idx = i; V18.chunk = 0; V18.playing = true; v18Paint('กำลังเตรียมเสียง…');
  var tok = V18.on = {};
  v18Fetch(id).then(function (urls) {
    if (V18.on !== tok || !V18.playing) return;
    a.src = urls[0]; var pr = a.play(); if (pr && pr.catch) pr.catch(function () { if (V18.on === tok) { a.removeAttribute('src'); v20WebAt(i); } });
    v18Paint(); v18Prefetch();
  }).catch(function (e) {
    if (V18.on !== tok) return;
    if (e && e.code === 'TTS_OFF') V20.mode = 'web';
    v20WebAt(i);
  });
};
(function () {
  var baseStop = v18Stop;
  v18Stop = function () { v20Cancel(); V20.pos = { id: null, i: 0 }; return baseStop.apply(this, arguments); };
  var basePlay = v18Play;
  v18Play = function () { v20Unlock(); return basePlay.apply(this, arguments); };
})();
/* ปลดล็อกเสียงของอุปกรณ์ทันทีที่ผู้ใช้แตะปุ่มเสียง (iPhone/iPad อนุญาตให้เริ่มเสียงจากการแตะเท่านั้น) */
document.addEventListener('click', function (e) {
  if (e.target.closest && e.target.closest('.v18b,#v18All,[data-v18fp],#v18FPlay,.v18-bar,.v18p,[data-v18]')) v20Unlock();
}, true);
/* ทราบล่วงหน้าว่าเปิดเสียง ElevenLabs หรือยัง เพื่อเริ่มอ่านได้ทันทีโดยไม่รอ */
setTimeout(function () { try { api('ttsStatus', {}, { timeout: 15000, noRetry: true }).then(function (r) { if (r && r.on === false) V20.mode = 'web'; }).catch(function () {}); } catch (e) {} }, 3000);
if (v20Can()) { try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = function () { speechSynthesis.getVoices(); }; } catch (e) {} }
</script>
