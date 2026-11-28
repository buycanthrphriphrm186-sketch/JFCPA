<script>
/* ==========================================================================
   v23 (แสดงผลเป็นเวอร์ชัน 1.0.0)
   - ทดลองใช้งาน: เมื่อระบบหลังบ้านเลือกปิด “เสียงอ่านกฎหมาย” (GUEST_MODE.disabled มี "voice")
     ผู้ทดลองใช้งานกดปุ่มเสียงแล้วจะได้รับคำชี้แจงแทนการเล่นเสียง ทั้งเสียงมนุษย์ (ElevenLabs) และเสียงของอุปกรณ์
     หากกำลังฟังอยู่ขณะผู้ดูแลกดปิด เสียงหยุดทันที · หมดเวลาทดลอง/สมัครสมาชิก/เข้าสู่ระบบแล้ว ใช้เสียงได้ตามปกติ
   - ปุ่มเดิมที่ซ่อนระหว่างทดลองใช้งาน (เข้าสู่ระบบ สมัครสมาชิก แชท) ทำงานเหมือนเดิมทุกประการ
   ========================================================================== */
var V23 = { asked: 0 };
function v23VoiceOff() {
  try { return isGuest() && MODES.guest && MODES.guest.active !== false && (MODES.guest.disabled || []).indexOf('voice') > -1; } catch (e) { return false; }
}
function v23VoiceNotice() {
  if (Date.now() - V23.asked < 800 || document.querySelector('.v23v-wrap')) return;
  V23.asked = Date.now();
  popup11({ cls: 'v23v-wrap', icon: 'speaker', title: 'เสียงอ่านกฎหมายสำหรับสมาชิก', sub: 'ยังไม่เปิดให้ใช้ระหว่างช่วงทดลองใช้งาน', ok: 'ตกลง', center: true,
    html: '<p>ระหว่างช่วงทดลองใช้งานเว็บไซต์ ผู้ดูแลระบบสงวนการฟังเสียงอ่านประมวลกฎหมายและรัฐธรรมนูญไว้สำหรับสมาชิก ท่านยังอ่าน ค้นหา และพิมพ์ตัวบทกฎหมายได้ตามปกติ</p>' +
      '<p>เมื่อสิ้นสุดช่วงทดลองใช้งาน ท่านสามารถสมัครสมาชิกหรือเข้าสู่ระบบ เพื่อฟังเสียงอ่านกฎหมายได้ทันที</p>' });
}
document.addEventListener('click', function (e) {
  if (!e.target.closest || !v23VoiceOff()) return;
  var b = e.target.closest('.v18b,#v18All,[data-v18fp],#v18FPlay,[data-v18],.v18p');
  if (!b) return;
  e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
  v23VoiceNotice();
}, true);
(function () {
  var basePlay = v18Play, baseAt = v18PlayAt;
  v18Play = function () { if (v23VoiceOff()) { v23VoiceNotice(); return; } return basePlay.apply(this, arguments); };
  v18PlayAt = function () { if (v23VoiceOff()) { try { v18Stop(); } catch (e) {} v23VoiceNotice(); return; } return baseAt.apply(this, arguments); };
  var baseModes = applyModes;
  applyModes = function (m) {
    var r = baseModes.apply(this, arguments);
    try {
      var off = v23VoiceOff();
      document.documentElement.classList.toggle('v23-voice-off', off);
      if (off && V18.playing) { v18Stop(); v23VoiceNotice(); }
    } catch (e) {}
    return r;
  };
})();
/* เซิร์ฟเวอร์ปฏิเสธเสียงของผู้ทดลองใช้งาน (GUEST_VOICE): หยุดเล่นและแจ้งเหตุผลแทนการสลับไปใช้เสียงอุปกรณ์ */
(function () {
  var baseApi = api;
  api = function (action, payload, opt) {
    var p = baseApi(action, payload, opt);
    if (action !== 'tts') return p;
    return p.catch(function (e) { if (e && e.code === 'GUEST_VOICE') { try { v18Stop(); } catch (x) {} v23VoiceNotice(); } throw e; });
  };
})();
</script>
<style>
html.v23-voice-off .v18b, html.v23-voice-off #v18All, html.v23-voice-off [data-v18fp], html.v23-voice-off #v18FPlay { opacity: .55; }
</style>
