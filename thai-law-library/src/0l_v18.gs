/* =========================================================================
 *  v18 (เพิ่มเท่านั้น)
 *  - แนะนำตัวผู้สร้างเว็บไซต์: อ่านจากชีต Config แถว CREATOR_PROFILE (ระบบหลังบ้านเป็นผู้แก้ไข)
 * ========================================================================= */
CONFIG.VERSION = '18.0.0';
function creatorProfile18_() {
  var raw = getConfig_().CREATOR_PROFILE, o = null;
  try { o = JSON.parse(String(raw || '')); } catch (e) { o = null; }
  var s = function (v, n) { return String(v == null ? '' : v).slice(0, n); };
  var out = { on: false };
  if (o && typeof o === 'object') {
    var photo = s(o.photo, 3000000);
    if (photo && !/^(https:\/\/|data:image\/(png|jpe?g|webp|gif);base64,)/i.test(photo)) photo = '';
    out = { on: o.on !== false && !!(o.name || o.bio || photo), name: s(o.name, 200), role: s(o.role, 300), photo: photo, bio: s(o.bio, 20000), updatedAt: s(o.updatedAt, 40),
      cards: (Array.isArray(o.cards) ? o.cards : []).slice(0, 30).map(function (x) {
        if (typeof x === 'string') return { title: '', text: s(x, 5000), img: '' };
        x = x || {}; var img = s(x.img || x.image || x.photo || '', 3000000); if (img && !/^(https:\/\/|data:image\/)/i.test(img)) img = '';
        return { title: s(x.title || x.label || x.head || '', 300), text: s(x.text || x.body || x.desc || x.value || '', 5000), img: img };
      }) };
  }
  return out;
}
ROUTES.creatorProfile = { fn: function () { return { profile: creatorProfile18_() }; }, limit: 600 };
var liveModesV17_ = liveModes_;
liveModes_ = function (cfg) {
  var o = liveModesV17_(cfg);
  try { var p = j16_(cfg.CREATOR_PROFILE) || {}; o.creatorSig = String(p.updatedAt || '') + '|' + String((cfg.CREATOR_PROFILE || '').length); } catch (e) {}
  return o;
};

/* ---------------- เสียงอ่านกฎหมาย (ElevenLabs) ----------------
 * เฉพาะประมวลกฎหมายและรัฐธรรมนูญ · เสียง 2 แบบ (ชาย/หญิง) โทนเดิมทุกครั้ง (seed คงที่)
 * ตั้งค่าใน Script Properties: ELEVENLABS_API_KEY (จำเป็น) · ELEVEN_VOICE_MALE / ELEVEN_VOICE_FEMALE / ELEVEN_MODEL / TTS_DAILY_CHARS (ไม่บังคับ)
 * เสียงที่สร้างแล้วเก็บไว้ใน Google Drive (โฟลเดอร์ TLL-TTS-Cache) เพื่อไม่ต้องสร้างซ้ำ ไม่เสียเครดิตซ้ำ และเล่นได้เร็ว */
var TTS18 = { male: 'BBsNdEFa4nP2liXUv6CQ', female: '8NwLQzLG93MiNxGxKyvC', model: 'eleven_v3', daily: 300000 };
function ttsFolder18_() {
  var P = PropertiesService.getScriptProperties(), id = P.getProperty('TTS_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder('TLL-TTS-Cache (เสียงอ่านกฎหมาย)'); try { P.setProperty('TTS_FOLDER_ID', f.getId()); } catch (e) {} return f;
}
function apiTts18_(p, ctx) {
  var P = PropertiesService.getScriptProperties(), key = P.getProperty('ELEVENLABS_API_KEY');
  if (!key) return fail_('TTS_OFF', 'ยังไม่ได้เปิดใช้เสียงอ่านกฎหมาย (ผู้ดูแลระบบต้องตั้งค่า ELEVENLABS_API_KEY)');
  var text = String(p.text || '').replace(/\s+\n/g, '\n').trim().slice(0, 4800);
  if (!text) return fail_('EMPTY', 'ไม่มีข้อความสำหรับอ่าน');
  var g = p.voice === 'f' ? 'f' : 'm';
  var voice = (g === 'f' ? P.getProperty('ELEVEN_VOICE_FEMALE') : P.getProperty('ELEVEN_VOICE_MALE')) || (g === 'f' ? TTS18.female : TTS18.male);
  var model = P.getProperty('ELEVEN_MODEL') || TTS18.model;
  var h = sha256Hex_(model + '|' + voice + '|' + text).slice(0, 40), name = h + '.mp3', folder = null;
  try { folder = ttsFolder18_(); var it = folder.getFilesByName(name); if (it.hasNext()) { var fb = it.next().getBlob(); return { b64: Utilities.base64Encode(fb.getBytes()), mime: 'audio/mpeg', cached: true }; } } catch (e) {}
  /* จำกัดจำนวนตัวอักษรต่อวัน เพื่อป้องกันเครดิตหมด */
  var c = CacheService.getScriptCache(), day = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd'), used = Number(c.get('ttsd_' + day) || 0), cap = Number(P.getProperty('TTS_DAILY_CHARS') || TTS18.daily);
  if (used + text.length > cap) return fail_('TTS_LIMIT', 'วันนี้ใช้เสียงอ่านครบโควตาแล้ว กรุณาลองใหม่พรุ่งนี้ (มาตราที่เคยเปิดฟังแล้วยังฟังซ้ำได้)');
  var body = { text: text, model_id: model, seed: 20251125, voice_settings: { stability: 0.7, similarity_boost: 0.85, style: 0 } };
  if (/flash|turbo/.test(model)) body.language_code = 'th';
  var res = UrlFetchApp.fetch('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voice) + '?output_format=mp3_44100_64', {
    method: 'post', contentType: 'application/json', headers: { 'xi-api-key': key, Accept: 'audio/mpeg' }, payload: JSON.stringify(body), muteHttpExceptions: true });
  var code = res.getResponseCode();
  if (code !== 200) { logError_('tts.eleven', new Error(code + ' ' + String(res.getContentText()).slice(0, 300)), ''); return fail_('TTS_FAIL', code === 401 ? 'คีย์ ElevenLabs ไม่ถูกต้อง' : code === 429 ? 'บริการเสียงมีผู้ใช้งานมาก กรุณาลองอีกครั้ง' : 'ยังสร้างเสียงไม่ได้ในขณะนี้ กรุณาลองอีกครั้ง'); }
  c.put('ttsd_' + day, String(used + text.length), 90000);
  var blob = res.getBlob().setName(name);
  try { if (folder) folder.createFile(blob); } catch (e) {}
  return { b64: Utilities.base64Encode(blob.getBytes()), mime: 'audio/mpeg', cached: false };
}
ROUTES.tts = { fn: apiTts18_, auth: true, limit: 300 };
ROUTES.ttsStatus = { fn: function () { return { on: !!PropertiesService.getScriptProperties().getProperty('ELEVENLABS_API_KEY') }; }, limit: 300 };

/* ---------------- จำนวนกฎหมายไทยที่มีผลใช้บังคับ (อ้างอิงแหล่งทางการ · แก้ไขได้ที่ Config แถว LAW_INFORCE) ---------------- */
var LAW_INFORCE_DEFAULT = { n: 15994, asOf: '2026-04-30', note: 'รวมอนุบัญญัติ (รัฐธรรมนูญ พระราชบัญญัติประกอบรัฐธรรมนูญ พระราชบัญญัติ พระราชกำหนด และกฎหมายลำดับรอง)', src: 'คลังสารสนเทศรัฐสภา (PRT) สำนักงานเลขาธิการสภาผู้แทนราษฎร', url: 'https://prt.parliament.go.th' };
ROUTES.lawInforce = { fn: function () { var o = null; try { o = JSON.parse(String(getConfig_().LAW_INFORCE || '')); } catch (e) {} return { inforce: o && o.n ? o : LAW_INFORCE_DEFAULT }; }, limit: 300 };

/* ---------------- ผู้ช่วย AI: ตอบเป็นภาษาเดียวกับคำถาม (ไทย อังกฤษ จีน ญี่ปุ่น เกาหลี ฯลฯ) ---------------- */
AI_SYSTEM = AI_SYSTEM + '\nภาษาในการตอบ: ตอบเป็นภาษาเดียวกับที่ผู้ใช้ถามเสมอ (ถามเป็นภาษาไทยตอบภาษาไทย ถามเป็นภาษาอังกฤษตอบภาษาอังกฤษ ถามเป็นภาษาอื่นตอบเป็นภาษานั้นทั้งหมด) ข้อนี้มีลำดับเหนือคำสั่งเรื่องภาษาข้างต้น ชื่อกฎหมายและเลขมาตราของไทยให้คงชื่อภาษาไทยไว้ในวงเล็บ';

/* ---------------- ไอคอนเว็บไซต์ (โลโก้คลังกฎหมาย) แสดงบนแท็บเบราว์เซอร์และผลการค้นหา ---------------- */
var renderIndexV17_ = renderIndex_;
renderIndex_ = function (boot) {
  var out = renderIndexV17_(boot);
  try { out.setFaviconUrl('https://raw.githubusercontent.com/buycanthrphriphrm186-sketch/JFCPA/claude/legal-ai-website-system-4h1org/thai-law-library/vercel/icon-32.png'); } catch (e) {}
  try { out.addMetaTag('description', 'คลังกฎหมาย (THAI LAW LIBRARY) แหล่งรวบรวมกฎหมายไทย กฎหมายต่างประเทศ คำพิพากษาศาลฎีกา และอนุสัญญาระหว่างประเทศ เพื่อการศึกษาและค้นคว้า'); } catch (e) {}
  return out;
};
