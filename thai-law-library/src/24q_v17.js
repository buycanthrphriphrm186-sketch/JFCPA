<script>
/* ==========================================================================
   v17: สถานะการใช้งานแบบเรียลไทม์ (รูปแบบใหม่) — ไม่ต้องแตะ เลื่อน หรือกดปุ่มใด
   เข้าสู่ระบบแล้ว = กำลังใช้งาน ตราบที่ยังเปิดหน้าเว็บไซต์อยู่ · ออกจากหน้าเว็บไซต์จึงแจ้งเลิกใช้งาน
   ========================================================================== */
isActiveNow = function () { return true; };
/* สลับแท็บ/ปิดจอชั่วคราว ไม่ถือว่าออกจากหน้าเว็บไซต์ (แจ้งเลิกใช้งานเฉพาะเมื่อปิดหน้า/ออกจากระบบ ผ่าน pagehide เดิม) */
rtOff = function () {};
rtPulse = function () {
  clearTimeout(RT.timer);
  if (!S.token || !S.member || BLOCK_SHOWN || MAINT.on) return;
  var hidden = document.visibilityState !== 'visible';
  if (RT.busy) return rtSchedule(800);
  RT.wasActive = true; RT.busy = true;
  api('pulse', { act: 1, off: 0 }, { noRetry: true, timeout: 12000, silent: true }).then(function (r) {
    RT.fails = 0; rtApply(r);
  }).catch(function (e) {
    if (e && (e.code === 'BLOCKED' || e.code === 'MAINTENANCE' || e.code === 'NO_SESSION')) return;
    RT.fails = Math.min(RT.fails + 1, 4);
  }).then(function () {
    RT.busy = false;
    if (S.token && !BLOCK_SHOWN && !MAINT.on) rtSchedule(RT.fails ? Math.min(RT.every * Math.pow(2, RT.fails), 15000) : (hidden ? 15000 : RT.every));
  });
};
/* กลับมาจากหน้าที่เก็บไว้ (ปุ่มย้อนกลับของเบราว์เซอร์) → แจ้งกำลังใช้งานทันที */
window.addEventListener('pageshow', function (e) { if (e && e.persisted && S.token) rtSchedule(100); });
document.addEventListener('visibilitychange', function () { if (S.token && !RT.busy) rtSchedule(document.visibilityState === 'visible' ? 150 : 1000); });
</script>
