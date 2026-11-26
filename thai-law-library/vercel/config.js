/* URL ของ Apps Script Web App (ลงท้ายด้วย /exec) — ใส่ได้หลายรายการ หน้าเว็บจะตรวจทุก URL ด้วย ?api=version
   แล้วเปิด URL ที่เป็นเวอร์ชันล่าสุดให้อัตโนมัติ (Deploy Apps Script เวอร์ชันใหม่แล้ว ไม่ต้อง Deploy Vercel ใหม่) */
window.TLL_APP_URLS = [
  'https://script.google.com/macros/s/AKfycbzNRFPlkGmgsg8lQcwCyk_7OdQr5X-zh7w7xRT8SSQLyuis_jRtE3sEyn9kG_f-jn0D/exec',
  'https://script.google.com/macros/s/AKfycbyBrr9vpNZyfN4ctTj9Tppe2GXTYl5IK5GUuAxSR-0QRABk-xOxHVAnUwlpjn6YGCvr/exec',
  'https://script.google.com/macros/s/AKfycby2_h8DqIYr0Ky5Km4OW6DKjwwN2ToWYmzNO9K8hLraIPesnjMZrEcl3VaoXD7mvf5o/exec'
];
window.TLL_APP_URL = window.TLL_APP_URLS[0];
