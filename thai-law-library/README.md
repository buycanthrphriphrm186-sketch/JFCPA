# THAI LAW LIBRARY — คลังกฎหมายไทย

ระบบมี 2 ไฟล์แยกกัน:

| ไฟล์ | วางที่ไหนใน Apps Script |
|---|---|
| `Code.gs` | ไฟล์สคริปต์ชื่อ **Code.gs** (รหัส GS เท่านั้น) |
| `Index.html` | ไฟล์ HTML ชื่อ **Index** (กด + > HTML > ตั้งชื่อ `Index`) |

> ข้อผิดพลาด `SyntaxError: Invalid regular expression: missing /` ที่เคยเกิด
> มาจากอักขระที่มองไม่เห็น (U+2028) ในโค้ด หรือการวางโค้ด HTML ลงใน Code.gs
> ไฟล์ชุดนี้ตรวจแล้วว่าไม่มีอักขระดังกล่าว และผ่านการตรวจไวยากรณ์ทั้งสองไฟล์

## ติดตั้ง (ครั้งเดียว)

1. เปิด https://script.google.com สร้างโปรเจกต์ใหม่ (หรือ ส่วนขยาย > Apps Script จาก Google Sheets)
2. ลบโค้ดเดิมใน Code.gs ทั้งหมด แล้ววางเนื้อหา `Code.gs`
3. สร้างไฟล์ HTML ชื่อ `Index` แล้ววางเนื้อหา `Index.html`
4. เลือกฟังก์ชัน `setup` แล้วกด **Run** และอนุญาตสิทธิ์
   ระบบจะสร้างชีตทั้งหมดใน Google Sheets `1Pddk_3GswY2_kuSzuNGIP6KVBeeBnGOHcGCqUvag-7E`
   และนำข้อมูลกฎหมาย/อนุสัญญาลงชีตให้
5. **Deploy > New deployment > Web app** — Execute as: **Me**, Who has access: **Anyone**
6. เปิด URL ที่ลงท้าย `/exec`

ทุกครั้งที่แก้โค้ด ต้อง Deploy > Manage deployments > แก้ไข > Version: New version
(ถ้าเวอร์ชันใหม่มีปัญหา เลือกเวอร์ชันก่อนหน้าในหน้าเดียวกันเพื่อย้อนกลับทันที)

## ตั้งค่าเพิ่มเติม (Project Settings > Script Properties) — ไม่บังคับ

| ชื่อ | ใช้กับ |
|---|---|
| `GEMINI_API_KEY` | ผู้ช่วย AI (Google AI Studio) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | เข้าสู่ระบบด้วย Google |
| `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET` | เข้าสู่ระบบด้วย Apple (secret คือ JWT ที่สร้างจากไฟล์ .p8) |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | เข้าสู่ระบบด้วย Facebook |
| `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET` | เข้าสู่ระบบด้วย LINE |
| `UNSPLASH_ACCESS_KEY`, `PEXELS_API_KEY`, `PIXABAY_API_KEY` | ภาพประกอบเพิ่มเติม (Wikimedia Commons ใช้ได้โดยไม่ต้องมีคีย์) |
| `ADMIN_EMAIL` | อีเมลรับรายงานความปลอดภัย (ค่าเริ่มต้นคืออีเมลเจ้าของสคริปต์) |

Redirect URI ที่ต้องลงทะเบียนกับ Google / Apple / Facebook / LINE คือ URL ของ Web app (`.../exec`)

## ฐานข้อมูลกฎหมายครบทุกมาตรา (นำเข้าอัตโนมัติ)

- ตัวบทกฎหมายไทยไม่มีลิขสิทธิ์ (พ.ร.บ.ลิขสิทธิ์ พ.ศ. 2537 มาตรา 7) ระบบนำเข้าจากชุดข้อมูลเปิดผ่าน API สาธารณะ
  `datasets-server.huggingface.co` (ค่าเริ่มต้น: `pythainlp/thailaw-v1.0` ถ้าเชื่อมต่อไม่ได้จะสลับไป `pythainlp/thailaw` อัตโนมัติ)
- หลังรัน `setup` ระบบตั้งเวลา `importTick` ทุก 10 นาที นำเข้าเป็นชุดจนครบ แล้วตรวจการแก้ไขซ้ำทุก 7 วัน
  (รันฟังก์ชัน `importTick` เองหนึ่งครั้งเพื่อเริ่มทันทีได้) ความคืบหน้าดูที่ชีต `Config` คีย์ `IMPORT_STATUS`
- นำเข้าเฉพาะ 5 หมวดที่เว็บไซต์กำหนด แยกเป็นรายมาตรา ชื่อมาตราใช้ชื่อหมวด/ส่วนที่มาตราสังกัด
  ส่วนมาตราที่มีชื่อเรียกในวงวิชาการอยู่แล้วจะคงชื่อเดิม
- เพิ่มแหล่งข้อมูลอื่นได้ที่ Script Property `LAW_DATASETS` (ชื่อชุดข้อมูลคั่นด้วยจุลภาค)
- หน้าเว็บโหลดรายชื่อกฎหมายก่อน และโหลดตัวบทเฉพาะฉบับที่เปิดอ่าน จึงเปิดเร็วแม้ฐานข้อมูลใหญ่
- ถ้าเปิดใช้เว็บเดิมอยู่แล้ว ให้รัน `setup` อีกครั้งหลังวางโค้ดใหม่ เพื่อติดตั้งตัวตั้งเวลานำเข้า

## ผู้ดูแลระบบ

- ตั้งตัวเองเป็นผู้ดูแล: ในชีต `Members` ใส่ `admin` ที่คอลัมน์ `role`
- ชีต `Config`: เปิด/ปิดฟีเจอร์ (`FLAG_*`), ปิดปรับปรุง (`MAINTENANCE`=on), ย้อนกลับฉุกเฉิน (`FORCE_SAFE_MODE`=on), เวลาโลโก้ (`SPLASH_SECONDS`)
- เปิดสิทธิ์แพ็กเกจ: แก้สถานะในชีต `Payments` เป็น `ชำระแล้ว` แล้วรันฟังก์ชัน `activatePaidPlans`
- ออกรหัสผ่านชั้นที่ 1 เฉพาะบุคคล / ปลดล็อกบัญชี: เมนู THAI LAW LIBRARY ในชีต
- เพิ่มตัวบทกฎหมาย: เพิ่มแถวในชีต `Sections` (lawId, sectionNo, popularName, text) แล้วหน้าเว็บจะแสดงเอง

## โครงสร้างซอร์ส

`src/` เก็บโค้ดแยกส่วน ไฟล์ `Code.gs` = `src/0*.gs` ต่อกัน, `Index.html` = `src/1*.html` + `src/2*.js` ต่อกัน (แทน `__LOGO_B64__` ด้วยโลโก้)
