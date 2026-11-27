/* =========================================================================
 *  v22 (แสดงผลเป็นเวอร์ชัน 1.0.0)
 *  ช่องรับคำสั่งจากระบบหลังบ้านแบบทั่วไป — รองรับปุ่ม/ฟังก์ชันใหม่ของหลังบ้านในอนาคตโดยไม่ต้องแก้โค้ดหน้าเว็บ
 *  - ชีต Config คีย์ LIVE_UI (JSON) เช่น
 *      {"hide":[".selector"],"show":[".selector"],"text":{".selector":"ข้อความ"},
 *       "banner":{"id":"b1","text":"ประกาศ","type":"info|warn|bad|ok"},"css":"...","reload":"2026-11-28T10:00:00Z"}
 *  - คีย์ที่ขึ้นต้นด้วย UI_ ทุกคีย์ (เช่น UI_DARK_FORCE = on) ส่งถึงหน้าเว็บทันทีในรูป data-ui-* และ window.LIVE_UI_FLAGS
 *  - ส่งพร้อม ping/pulse เดิม (สมาชิกทุก 2 วินาที ผู้เยี่ยมชมทุก 5 วินาที · ค่าตั้งค่าแคช 2 วินาที) จึงมีผลภายใน 2–7 วินาที
 * ========================================================================= */
CONFIG.VERSION = '22.0.0';
CONFIG.VERSION_LABEL = '1.0.0';

var liveModesV21_ = liveModes_;
liveModes_ = function (cfg) {
  var o = liveModesV21_(cfg);
  try {
    var raw = String(cfg.LIVE_UI || '').trim();
    if (raw && raw.length <= 20000) { var ui = JSON.parse(raw); if (ui && typeof ui === 'object') o.ui = ui; }
  } catch (e) {}
  try {
    var f = {}, n = 0;
    Object.keys(cfg).forEach(function (k) { if (/^UI_[A-Z0-9_]{1,40}$/.test(k) && n < 100) { f[k] = String(cfg[k]).slice(0, 2000); n++; } });
    if (n) o.uiFlags = f;
  } catch (e) {}
  return o;
};
