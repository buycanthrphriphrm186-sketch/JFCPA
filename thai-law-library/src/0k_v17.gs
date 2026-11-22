/* =========================================================================
 *  v17: สถานะผู้ใช้งานแบบเรียลไทม์รูปแบบใหม่ (เพิ่มเท่านั้น)
 *  - นับว่า “กำลังใช้งาน” ทันทีที่เข้าสู่ระบบ/สมัครสมาชิก/กดยอมรับทดลองใช้งาน และตราบที่ยังเปิดหน้าเว็บไซต์อยู่
 *    ไม่ต้องแตะ เลื่อน หรือกดปุ่มใด · ออกจากหน้าเว็บไซต์ (ปิดแท็บ/ออกจากระบบ) จึงนับว่าเลิกใช้งาน
 *  - หน้าเว็บส่งสัญญาณทุก 2 วินาทีขณะแสดงอยู่ และทุก 15 วินาทีเมื่อสลับไปแอปอื่น
 *    เบราว์เซอร์อาจหน่วงสัญญาณขณะอยู่เบื้องหลัง จึงนับช่วงเวลา 2 นาที
 * ========================================================================= */
CONFIG.VERSION = '17.0.0';
ONLINE_WINDOW_MS = 2 * 60 * 1000;

/* ออกจากหน้าเว็บไซต์ (ปิดแท็บ/ปิดหน้า): หน้าเว็บส่งสัญญาณแบบ beacon มาที่ doPost
 * - {"tll":"leave","id":"G-..."} → นำผู้ทดลองใช้งานออกจากรายชื่อ GUEST_NOW ทันที
 * - {"tll":"off","t":"<token>"}  → สมาชิกเลิกใช้งาน (Sessions.online = FALSE) ทันที
 * คำขออื่นทั้งหมดส่งต่อให้ doPost เดิมตามปกติ */
var doPostV16_ = doPost;
doPost = function (e) {
  try {
    var pd = e && e.postData, txt = pd && pd.contents ? String(pd.contents) : '';
    if (txt && txt.length < 1000 && /^\s*\{\s*"tll"\s*:\s*"(leave|off)"/.test(txt)) {
      var j = JSON.parse(txt);
      if (j.tll === 'leave' && /^G-[A-Za-z0-9]{8,32}$/.test(String(j.id || ''))) apiGuestBeat16_({ id: String(j.id), off: '1' });
      if (j.tll === 'off' && j.t && String(j.t).length < 200) {
        var row = sessionRow_(sha256Hex_(String(j.t)));
        if (row) { setSessionCells_(row, { online: false }); try { publishOnline_(true); } catch (x) {} }
      }
      return ContentService.createTextOutput('OK');
    }
  } catch (x) { try { logError_('leave17', x, ''); } catch (y) {} }
  return doPostV16_.apply(this, arguments);
};
