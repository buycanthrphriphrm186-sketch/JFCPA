/**
 * ============================================================================
 *  THAI LAW LIBRARY (คลังกฎหมาย) — Google Apps Script Backend (Code.gs)
 * ============================================================================
 *  ไฟล์นี้คือ "รหัส GS" ทั้งหมดของระบบ ให้วางในไฟล์ชื่อ Code.gs เท่านั้น
 *  ห้ามวางโค้ด HTML ลงในไฟล์นี้ (หากวางผิดไฟล์ จะเกิดข้อผิดพลาด
 *  "SyntaxError: Invalid regular expression: missing /" ตามที่เคยเกิด)
 *
 *  ไฟล์หน้าเว็บอยู่ในไฟล์ Index.html (สร้างผ่าน + > HTML > ตั้งชื่อ Index)
 *
 *  ขั้นตอนติดตั้ง (ครั้งแรกครั้งเดียว)
 *   1) เปิด Apps Script แล้ววางไฟล์ Code.gs และ Index.html
 *   2) เลือกฟังก์ชัน setup แล้วกด Run (อนุญาตสิทธิ์ตามที่ระบบขอ)
 *   3) Deploy > New deployment > Web app
 *        Execute as: Me   |   Who has access: Anyone
 *   4) เปิด URL ที่ลงท้ายด้วย /exec
 *
 *  อีเมลรับแจ้งเตือนความปลอดภัย: ระบบใช้อีเมลของบัญชีเจ้าของสคริปต์โดยอัตโนมัติ
 *  หากต้องการเปลี่ยน ให้ตั้ง Script Property ชื่อ ADMIN_EMAIL
 * ============================================================================
 */

var CONFIG = {
  SHEET_ID: '1Pddk_3GswY2_kuSzuNGIP6KVBeeBnGOHcGCqUvag-7E',
  APP_NAME_EN: 'THAI LAW LIBRARY',
  APP_NAME_TH: 'คลังกฎหมาย',
  ADMIN_NAME: 'นายบุญจันทร์ พรีพรม',
  // รหัสผ่านชั้นที่ 1 (จากผู้ดูแลระบบ) — setup() จะเก็บเป็นค่า Hash ใน Script Properties
  // ค่านี้อยู่ฝั่งเซิร์ฟเวอร์เท่านั้น ไม่เคยถูกส่งไปยังหน้าเว็บ
  DEFAULT_ADMIN_PASSWORD: 'THAI LAW LIBRARY 13224520260606200899',
  VERSION: '5.0.0',
  HASH_ROUNDS: 120,
  SESSION_DAYS: 180,
  TRIAL_DAYS: 7
};

function adminEmail_() {
  var p = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
  if (p) return p;
  try { return Session.getEffectiveUser().getEmail(); } catch (e) { return ''; }
}

var SHEETS = {
  Members: ['memberId', 'username', 'usernameLower', 'title', 'firstName', 'lastName', 'displayName', 'birthDate', 'gender', 'memberType', 'educationJson', 'workJson', 'phone', 'address', 'bio', 'avatar', 'adminHash', 'personalHash', 'salt', 'recoveryQ', 'recoveryAHash', 'plan', 'planCycle', 'planExpires', 'trialStart', 'createdAt', 'lastLogin', 'accountStatus', 'failCount', 'lockUntil', 'lockCount', 'socialJson', 'privacyJson', 'role', 'extraJson', 'email', 'emailVerified', 'otpHash', 'otpExp', 'otpTries'],
  Sessions: ['tokenHash', 'memberId', 'createdAt', 'lastSeen', 'device', 'os', 'browser', 'ip', 'location', 'revoked'],
  UserData: ['memberId', 'rev', 'updatedAt', 'part', 'json'],
  Laws: ['lawId', 'category', 'title', 'shortName', 'year', 'sourceUrl', 'status', 'updatedAt', 'note'],
  Sections: ['sectionId', 'lawId', 'sectionNo', 'popularName', 'text', 'tags', 'sourceUrl', 'updatedAt'],
  Treaties: ['treatyId', 'group', 'title', 'titleTh', 'date', 'sourceUrl', 'summary', 'updatedAt'],
  LoginLog: ['time', 'username', 'memberId', 'result', 'reason', 'ip', 'location', 'isp', 'device', 'os', 'browser'],
  Security: ['reportId', 'time', 'type', 'severity', 'memberId', 'username', 'ip', 'location', 'device', 'detail', 'attempts', 'action', 'status', 'pdfUrl'],
  ErrorLog: ['time', 'memberId', 'where', 'message', 'stack', 'userAgent', 'version'],
  AuditLog: ['time', 'memberId', 'action', 'detail'],
  Config: ['key', 'value', 'note'],
  Announcements: ['id', 'time', 'type', 'title', 'body', 'active'],
  Reports: ['time', 'memberId', 'username', 'kind', 'subject', 'detail', 'status'],
  Payments: ['time', 'memberId', 'username', 'plan', 'cycle', 'amount', 'status', 'note'],
  Sources: ['category', 'url', 'parser', 'enabled', 'lastRun', 'lastResult'],
  Stats: ['date', 'visits', 'mobile', 'tablet', 'desktop', 'chrome', 'safari', 'edge', 'firefox', 'other', 'logins', 'lawOpens', 'updatedAt']
};

var DEFAULT_CONFIG = [
  ['MAINTENANCE', 'off', 'on = ปิดปรับปรุงระบบชั่วคราว (ข้อมูลผู้ใช้ยังเก็บอยู่ครบ)'],
  ['MAINTENANCE_MESSAGE', 'ขณะนี้ระบบอยู่ระหว่างการปรับปรุงเพื่อเพิ่มประสิทธิภาพ ข้อมูลของท่านยังคงได้รับการเก็บรักษาไว้ครบถ้วน กรุณากลับมาใช้งานอีกครั้งภายหลัง', 'ข้อความหน้าปิดปรับปรุง'],
  ['FLAG_AI', 'on', 'ผู้ช่วย AI (ต้องตั้ง GEMINI_API_KEY ใน Script Properties)'],
  ['FLAG_FOREIGN', 'on', 'กฎหมายต่างประเทศ (ญี่ปุ่น e-Gov API / เกาหลี Open API)'],
  ['FLAG_STATS', 'on', 'สถิติผู้เข้าใช้งานเว็บไซต์ (นับแบบไม่ระบุตัวตน)'],
  ['GA4_ID', '', 'Google Analytics 4 Measurement ID เช่น G-XXXXXXX (เว้นว่าง = ไม่ใช้)'],
  ['FLAG_MEDIA', 'on', 'ดึงภาพจาก Wikimedia / Unsplash / Pexels / Pixabay'],
  ['FLAG_SOCIAL_LOGIN', 'on', 'เข้าสู่ระบบด้วย Google / Apple / Facebook / LINE'],
  ['FLAG_PDF', 'on', 'สร้างไฟล์ PDF'],
  ['FLAG_IP_LOOKUP', 'on', 'ตรวจสอบ IP ขณะเข้าสู่ระบบ'],
  ['FLAG_SOUND', 'on', 'เสียงตัวจับเวลา'],
  ['FORCE_SAFE_MODE', 'off', 'on = ปิดฟีเจอร์เสริมทั้งหมดทันที (ย้อนกลับฉุกเฉิน)'],
  ['CANARY_PERCENT', '0', 'เปอร์เซ็นต์สมาชิกที่ได้ทดลองฟีเจอร์ใน CANARY_FLAGS'],
  ['CANARY_FLAGS', '', 'ชื่อ flag คั่นด้วยจุลภาค'],
  ['SPLASH_SECONDS', '20', 'เวลาแสดงหน้าโลโก้และแถบสถานะการเชื่อมต่อฐานข้อมูล (วินาที, 20–30)'],
  ['LOCK_ATTEMPTS', '5', 'จำนวนครั้งที่ใส่รหัสผิดก่อนระงับชั่วคราว'],
  ['LOCK_MINUTES', '15', 'ระยะเวลาระงับชั่วคราว (นาที)'],
  ['IDLE_MINUTES', '0', '0 = ไม่ออกจากระบบอัตโนมัติ'],
  ['AI_DAILY_LIMIT_STANDARD', '30', 'จำนวนคำถาม AI ต่อวัน แพ็กเกจมาตรฐาน'],
  ['AI_DAILY_LIMIT_PRO', '200', 'จำนวนคำถาม AI ต่อวัน แพ็กเกจมืออาชีพ'],
  ['GEMINI_MODEL', 'gemini-2.5-flash', 'รุ่นโมเดล Gemini']
];

/* =========================================================================
 *  ENTRY POINTS
 * ========================================================================= */

function doGet(e) {
  var p = (e && e.parameter) || {};
  var boot = { v: CONFIG.VERSION, url: safeUrl_(), social: null, maintenance: null };
  try {
    ensureInit_();
    var cfg = getConfig_();
    if (cfg.MAINTENANCE === 'on' && p.admin !== '1') boot.maintenance = cfg.MAINTENANCE_MESSAGE;
    if (p.code && p.state) boot.social = oauthCallback_(p.code, p.state, null);
    if (p.error && p.state) boot.social = { ok: false, msg: 'ผู้ให้บริการยกเลิกหรือปฏิเสธการเข้าสู่ระบบ (' + String(p.error).slice(0, 60) + ')' };
    boot.splash = Math.min(Math.max(Number(cfg.SPLASH_SECONDS) || 20, 1), 30);
    boot.ga4 = /^G-[A-Z0-9]{4,16}$/.test(String(cfg.GA4_ID || '')) ? cfg.GA4_ID : '';
    boot.flags = publicFlags_(cfg, null);
  } catch (err) {
    logError_('doGet', err, '');
    boot.bootError = 'ระบบไม่สามารถเชื่อมต่อฐานข้อมูลได้ชั่วคราว';
  }
  return renderIndex_(boot);
}

/** Apple Sign in ส่งผลลัพธ์กลับแบบ form_post */
function doPost(e) {
  var p = (e && e.parameter) || {};
  var boot = { v: CONFIG.VERSION, url: safeUrl_(), social: null };
  try {
    ensureInit_();
    boot.flags = publicFlags_(getConfig_(), null);
    if (p.code && p.state) boot.social = oauthCallback_(p.code, p.state, p.user || null);
  } catch (err) {
    logError_('doPost', err, '');
  }
  return renderIndex_(boot);
}

function renderIndex_(boot) {
  var html = null; try { if (typeof tllFetch_ === 'function') html = tllFetch_('Index.html'); } catch (e) { html = null; }
  var t = html ? HtmlService.createTemplate(html) : HtmlService.createTemplateFromFile('Index');
  t.bootJson = JSON.stringify(boot).replace(/</g, '\\u003c').split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');
  return t.evaluate()
    .setTitle('THAI LAW LIBRARY | คลังกฎหมาย')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function safeUrl_() {
  try { return ScriptApp.getService().getUrl() || ''; } catch (e) { return ''; }
}

/**
 * จุดเรียกใช้เดียวจากหน้าเว็บ: google.script.run.api(action, payload, token)
 * ทุกคำขอผ่านการตรวจสอบ rate limit, feature flag และ session ที่นี่
 */
function api(action, payload, token) {
  var started = Date.now();
  payload = payload || {};
  try {
    if (typeof action !== 'string' || !ROUTES.hasOwnProperty(action)) return fail_('BAD_ACTION', 'ไม่พบคำสั่งที่ร้องขอ');
    var route = ROUTES[action];
    var cfg = getConfig_();
    if (cfg.MAINTENANCE === 'on' && action !== 'ping') return fail_('MAINTENANCE', cfg.MAINTENANCE_MESSAGE);
    if (!rateLimit_(action, token, route.limit || 60)) return fail_('RATE_LIMIT', 'ท่านส่งคำขอถี่เกินกำหนด กรุณารอสักครู่แล้วดำเนินการอีกครั้ง');
    var threat = scanPayload_(payload);
    if (threat) {
      var who = token ? sessionMember_(token) : null;
      raiseIncident_({ type: 'XSS/Injection attempt', severity: 'HIGH', memberId: who ? who.memberId : '', username: who ? who.username : String(payload.username || ''), detail: 'พบรูปแบบข้อมูลอันตรายในคำสั่ง ' + action + ': ' + threat, action: 'ปฏิเสธคำขอและบันทึกเหตุการณ์' });
      return fail_('REJECTED', 'ข้อมูลที่ส่งมามีรูปแบบที่ระบบไม่อนุญาต ระบบได้ปฏิเสธคำขอนี้และบันทึกเหตุการณ์ไว้แล้ว');
    }
    var blk = typeof blockCheck_ === 'function' ? blockCheck_(action, payload, token) : null;
    if (blk) return blk;
    var ctx = { cfg: cfg, token: token, member: null };
    if (route.auth) {
      var m = sessionMember_(token);
      if (!m) return fail_('NO_SESSION', 'สิทธิ์การเข้าใช้งานหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
      if (m.accountStatus === 'ระงับ') return fail_('ACCOUNT_SUSPENDED', 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบเพื่อดำเนินการปลดล็อก');
      if (m.accountStatus === 'ปิดใช้งาน' && action !== 'setAccountStatus' && action !== 'bootstrap') return fail_('ACCOUNT_DISABLED', 'บัญชีนี้ปิดใช้งานชั่วคราว กรุณาเปิดใช้งานบัญชีในหน้าการตั้งค่า');
      ctx.member = m;
    }
    if (route.flag && !flagOn_(route.flag, cfg, ctx.member)) return fail_('FEATURE_OFF', 'ฟีเจอร์นี้ถูกปิดใช้งานชั่วคราวโดยผู้ดูแลระบบ');
    if (route.admin && (!ctx.member || ctx.member.role !== 'admin')) return fail_('FORBIDDEN', 'คำสั่งนี้สงวนไว้สำหรับผู้ดูแลระบบ');
    var out = route.fn(payload, ctx) || {};
    if (out.ok === undefined) out.ok = true;
    out.ms = Date.now() - started;
    return out;
  } catch (err) {
    logError_('api:' + action, err, '');
    return fail_('SERVER_ERROR', 'ระบบขัดข้องชั่วคราวระหว่างดำเนินการ หากยังพบปัญหาซ้ำ กรุณาติดต่อผู้ดูแลระบบ');
  }
}

var ROUTES = {
  ping: { fn: function () { return { t: Date.now(), v: CONFIG.VERSION }; }, limit: 120 },
  checkUsername: { fn: apiCheckUsername_, limit: 60 },
  register: { fn: apiRegister_, limit: 10 },
  login: { fn: apiLogin_, limit: 20 },
  socialLogin: { fn: apiSocialLogin_, limit: 20, flag: 'FLAG_SOCIAL_LOGIN' },
  forgotPassword: { fn: apiForgot_, limit: 10 },
  oauthStart: { fn: apiOauthStart_, limit: 20, flag: 'FLAG_SOCIAL_LOGIN' },
  bootstrap: { fn: apiBootstrap_, auth: true, limit: 60 },
  logout: { fn: apiLogout_, auth: true },
  logoutAll: { fn: apiLogoutAll_, auth: true, limit: 10 },
  saveUserData: { fn: apiSaveUserData_, auth: true, limit: 120 },
  getCatalog: { fn: apiGetCatalog_, limit: 60 },
  getTreaties: { fn: apiGetTreaties_, limit: 60 },
  getSections: { fn: apiGetSections_, limit: 200 },
  sectionsByIds: { fn: apiSectionsByIds_, limit: 100 },
  searchSections: { fn: apiSearchSections_, limit: 120 },
  importStatus: { fn: function () { return { status: getConfig_().IMPORT_STATUS || '' }; }, limit: 60 },
  updateProfile: { fn: apiUpdateProfile_, auth: true, limit: 30 },
  uploadAvatar: { fn: apiUploadAvatar_, auth: true, limit: 10 },
  changePassword: { fn: apiChangePassword_, auth: true, limit: 10 },
  changeUsername: { fn: apiChangeUsername_, auth: true, limit: 10 },
  setPrivacy: { fn: apiSetPrivacy_, auth: true, limit: 30 },
  setAccountStatus: { fn: apiSetAccountStatus_, auth: true, limit: 5 },
  deleteAccount: { fn: apiDeleteAccount_, auth: true, limit: 5 },
  exportData: { fn: apiExportData_, auth: true, limit: 10 },
  loginHistory: { fn: apiLoginHistory_, auth: true },
  devices: { fn: apiDevices_, auth: true },
  secureAccount: { fn: apiSecureAccount_, auth: true, limit: 5 },
  linkSocial: { fn: apiLinkSocial_, auth: true, limit: 10 },
  aiChat: { fn: apiAiChat_, auth: true, limit: 20, flag: 'FLAG_AI' },
  verifyOtp: { fn: apiVerifyOtp_, limit: 30 },
  resendOtp: { fn: apiResendOtp_, limit: 10 },
  hit: { fn: apiHit_, limit: 600, flag: 'FLAG_STATS' },
  publicStats: { fn: apiPublicStatsV5_, limit: 120 },
  foreignCountries: { fn: apiForeignCountriesV5_, limit: 60, flag: 'FLAG_FOREIGN' },
  foreignLaws: { fn: apiForeignLaws_, limit: 120, flag: 'FLAG_FOREIGN' },
  foreignLaw: { fn: apiForeignLawV5_, limit: 120, flag: 'FLAG_FOREIGN' },
  loginHistoryPdf: { fn: apiLoginHistoryPdf_, auth: true, limit: 10 },
  backupPdf: { fn: apiBackupPdf_, auth: true, limit: 10 },
  memberPdf: { fn: apiMemberPdf_, auth: true, limit: 10 },
  clearFavorites: { fn: function () { return {}; }, auth: true, limit: 10 },
  paymentInfo: { fn: apiPaymentInfo_, auth: true, limit: 30 },
  paymentNotify: { fn: apiPaymentNotify_, auth: true, limit: 10 },
  media: { fn: apiMedia_, limit: 30, flag: 'FLAG_MEDIA' },
  makePdf: { fn: apiMakePdf_, auth: true, limit: 10, flag: 'FLAG_PDF' },
  reportProblem: { fn: apiReportProblem_, auth: true, limit: 10 },
  reportPublic: { fn: apiReportPublic_, limit: 5 },
  clientError: { fn: apiClientError_, limit: 30 },
  clientSecurity: { fn: apiClientSecurity_, limit: 10 },
  paymentRequest: { fn: apiPaymentRequest_, auth: true, limit: 5 },
  adminSync: { fn: apiAdminSync_, auth: true, admin: true, limit: 3 },
  adminIssuePassword: { fn: apiAdminIssuePassword_, auth: true, admin: true, limit: 10 }
};

function fail_(code, msg) { return { ok: false, code: code, msg: msg }; }

/* =========================================================================
 *  SETUP / INIT / HEALTH
 * ========================================================================= */

function setup() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('PEPPER')) props.setProperty('PEPPER', randomToken_(32));
  props.setProperty('ADMIN_HASH', hashPassword_(normalizeAdminPass_(CONFIG.DEFAULT_ADMIN_PASSWORD), 'admin-global'));
  var ss = ss_();
  Object.keys(SHEETS).forEach(function (name) { sheet_(name); });
  var def = ss.getSheetByName('Sheet1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) { try { ss.deleteSheet(def); } catch (e) {} }
  seedConfig_();
  ensureHeaders_();
  migrateV4_();
  seedCatalog_(false);
  seedTreaties_(false);
  seedSources_();
  seedAnnouncements_();
  try { installTriggers_(); } catch (e) { Logger.log('ติดตั้ง trigger ไม่สำเร็จ: ' + e.message); }
  props.setProperty('INIT_DONE', CONFIG.VERSION);
  bumpCatalogVersion_();
  try { formatWorkbook_(); } catch (e) { Logger.log('จัดรูปแบบชีตไม่สำเร็จ: ' + e.message); }
  Logger.log('ติดตั้งเรียบร้อย — Deploy เป็น Web app ได้ทันที');
}

function ensureInit_() {
  var props = PropertiesService.getScriptProperties();
  var done = props.getProperty('INIT_DONE');
  if (done === CONFIG.VERSION) return;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return;
  try {
    done = props.getProperty('INIT_DONE');
    if (!done) setup();
    else if (done !== CONFIG.VERSION) upgradeV5_();
  } finally { lock.releaseLock(); }
}

function installTriggers_() {
  var have = {};
  ScriptApp.getProjectTriggers().forEach(function (t) { have[t.getHandlerFunction()] = true; });
  if (!have.dailySync) ScriptApp.newTrigger('dailySync').timeBased().everyDays(1).atHour(3).create();
  if (!have.healthCheck) ScriptApp.newTrigger('healthCheck').timeBased().everyHours(1).create();
  if (!have.importTick) ScriptApp.newTrigger('importTick').timeBased().everyMinutes(10).create();
}

/** Health Check & Self-Healing: ทุกชั่วโมง สร้างชีตที่หาย ล้าง session หมดอายุ ตัด log เก่า */
function healthCheck() {
  var report = [];
  try {
    Object.keys(SHEETS).forEach(function (name) { sheet_(name); });
    report.push('sheets:ok');
    var cut = Date.now() - CONFIG.SESSION_DAYS * 864e5;
    var sh = sheet_('Sessions');
    var data = sh.getDataRange().getValues();
    for (var i = data.length - 1; i >= 1; i--) {
      var revoked = data[i][9] === true || data[i][9] === 'TRUE';
      var old = new Date(data[i][3]).getTime() < cut;
      var revokedOld = revoked && new Date(data[i][3]).getTime() < Date.now() - 864e5;
      if (old || revokedOld) sh.deleteRow(i + 1);
    }
    report.push('sessions:pruned');
    purgeOldLoginLog_(90);
    report.push('loginlog:90d');
    try { flushStats_(); report.push('stats:flushed'); } catch (e) { report.push('stats:error'); }
    ['LoginLog', 'ErrorLog', 'AuditLog'].forEach(function (n) {
      var s = sheet_(n), max = 20000, last = s.getLastRow();
      if (last > max) s.deleteRows(2, last - max);
    });
    report.push('logs:trimmed');
    CacheService.getScriptCache().remove('cfg');
  } catch (err) {
    report.push('error:' + err.message);
    logError_('healthCheck', err, '');
  }
  setConfigValue_('LAST_HEALTH', new Date().toISOString() + ' ' + report.join(','));
}

/* =========================================================================
 *  SHEET HELPERS
 * ========================================================================= */

var _ss = null;
function ss_() { if (!_ss) _ss = SpreadsheetApp.openById(CONFIG.SHEET_ID); return _ss; }

var _sheetCache = {};
function sheet_(name) {
  if (_sheetCache[name]) return _sheetCache[name];
  var ss = ss_(), sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]).setFontWeight('bold').setBackground('#EAF4FC');
    sh.setFrozenRows(1);
    sh.getRange(2, 1, sh.getMaxRows() - 1, SHEETS[name].length).setNumberFormat('@');
  }
  _sheetCache[name] = sh;
  return sh;
}

var _rowsCache = {};
function rows_(name) {
  if (_rowsCache[name]) return _rowsCache[name];
  var sh = sheet_(name), last = sh.getLastRow();
  if (last < 2) return (_rowsCache[name] = []);
  var head = SHEETS[name];
  var vals = sh.getRange(2, 1, last - 1, head.length).getValues();
  _rowsCache[name] = vals.map(function (r, i) {
    var o = { _row: i + 2 };
    head.forEach(function (h, j) { o[h] = r[j]; });
    return o;
  });
  return _rowsCache[name];
}

function appendRow_(name, obj) {
  var head = SHEETS[name];
  sheet_(name).appendRow(head.map(function (h) { return obj[h] === undefined || obj[h] === null ? '' : obj[h]; }));
  delete _rowsCache[name];
}

function updateRow_(name, rowIndex, obj) {
  var head = SHEETS[name], sh = sheet_(name);
  var cur = sh.getRange(rowIndex, 1, 1, head.length).getValues()[0];
  head.forEach(function (h, j) { if (obj[h] !== undefined) cur[j] = obj[h]; });
  sh.getRange(rowIndex, 1, 1, head.length).setValues([cur]);
  delete _rowsCache[name];
}

/* =========================================================================
 *  CONFIG / FEATURE FLAGS / CANARY RELEASE
 * ========================================================================= */

function getConfig_() {
  var cache = CacheService.getScriptCache();
  var c = cache.get('cfg');
  if (c) return JSON.parse(c);
  var cfg = {};
  DEFAULT_CONFIG.forEach(function (r) { cfg[r[0]] = r[1]; });
  try { rows_('Config').forEach(function (r) { if (r.key) cfg[String(r.key)] = String(r.value); }); } catch (e) {}
  cache.put('cfg', JSON.stringify(cfg), 60);
  return cfg;
}

function setConfigValue_(key, value) {
  var list = rows_('Config');
  for (var i = 0; i < list.length; i++) {
    if (list[i].key === key) { updateRow_('Config', list[i]._row, { value: value }); CacheService.getScriptCache().remove('cfg'); return; }
  }
  appendRow_('Config', { key: key, value: value, note: '' });
  CacheService.getScriptCache().remove('cfg');
}

function seedConfig_() {
  var have = {};
  rows_('Config').forEach(function (r) { have[r.key] = true; });
  DEFAULT_CONFIG.forEach(function (r) { if (!have[r[0]]) appendRow_('Config', { key: r[0], value: r[1], note: r[2] }); });
}

function flagOn_(flag, cfg, member) {
  if (cfg.FORCE_SAFE_MODE === 'on' && flag !== 'FLAG_SOCIAL_LOGIN') return false;
  if (cfg[flag] === 'on') return true;
  var canary = String(cfg.CANARY_FLAGS || '').split(',').map(function (s) { return s.trim(); });
  if (member && canary.indexOf(flag) > -1) {
    var pct = Number(cfg.CANARY_PERCENT) || 0;
    var bucket = parseInt(sha256Hex_(member.memberId).slice(0, 4), 16) % 100;
    return bucket < pct;
  }
  return false;
}

function publicFlags_(cfg, member) {
  var f = {};
  ['FLAG_AI', 'FLAG_FOREIGN', 'FLAG_STATS', 'FLAG_MEDIA', 'FLAG_SOCIAL_LOGIN', 'FLAG_PDF', 'FLAG_IP_LOOKUP', 'FLAG_SOUND'].forEach(function (k) { f[k] = flagOn_(k, cfg, member); });
  f.SAFE_MODE = cfg.FORCE_SAFE_MODE === 'on';
  f.IDLE_MINUTES = Number(cfg.IDLE_MINUTES) || 0;
  var props = PropertiesService.getScriptProperties();
  f.providers = {
    google: !!props.getProperty('GOOGLE_CLIENT_ID'),
    apple: !!props.getProperty('APPLE_CLIENT_ID'),
    facebook: !!props.getProperty('FACEBOOK_APP_ID'),
    line: !!props.getProperty('LINE_CHANNEL_ID')
  };
  f.ai = !!props.getProperty('GEMINI_API_KEY');
  return f;
}

/* =========================================================================
 *  CRYPTO / HASHING
 * ========================================================================= */

function bytesToHex_(bytes) {
  return bytes.map(function (b) { var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
}
function sha256Hex_(s) { return bytesToHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8)); }

function randomToken_(n) {
  var s = '';
  while (s.length < n) s += Utilities.getUuid().replace(/-/g, '');
  return s.slice(0, n);
}

/**
 * Apps Script ไม่มี bcrypt/Argon2 ในตัว จึงใช้ HMAC-SHA256 แบบวนซ้ำ (key stretching)
 * + salt เฉพาะบุคคล + pepper ลับใน Script Properties (ไม่ได้เก็บในชีต)
 */
function hashPassword_(pw, salt) {
  var pepper = PropertiesService.getScriptProperties().getProperty('PEPPER') || '';
  var h = String(salt) + '|' + String(pw);
  for (var i = 0; i < CONFIG.HASH_ROUNDS; i++) h = bytesToHex_(Utilities.computeHmacSha256Signature(h, pepper + String(salt)));
  return 'h1$' + CONFIG.HASH_ROUNDS + '$' + h;
}

function verifyPassword_(pw, salt, stored) {
  if (!stored) return false;
  var calc = hashPassword_(pw, salt);
  stored = String(stored);
  if (calc.length !== stored.length) return false;
  var diff = 0;
  for (var i = 0; i < calc.length; i++) diff |= calc.charCodeAt(i) ^ stored.charCodeAt(i);
  return diff === 0;
}

function normalizeAdminPass_(p) { return String(p || '').trim().replace(/\s+/g, ' ').toUpperCase(); }

/* =========================================================================
 *  RATE LIMIT / THREAT SCAN
 * ========================================================================= */

function rateLimit_(action, token, perTenMin) {
  var cache = CacheService.getScriptCache();
  var key = 'rl_' + action + '_' + (token ? sha256Hex_(token).slice(0, 16) : 'anon');
  var n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 600);
  return n <= (token ? perTenMin : perTenMin * 20);
}

var THREAT_PATTERNS = [
  /<\s*script\b/i, /javascript\s*:/i, /\bon(error|load|click|mouseover|focus)\s*=/i,
  /<\s*iframe\b/i, /<\s*svg[^>]*on\w+\s*=/i, /\bunion\s+select\b/i, /;\s*drop\s+table\b/i,
  /'\s*or\s+'1'\s*=\s*'1/i, /\bdocument\.cookie\b/i, /^\s*=\s*(HYPERLINK|IMPORTDATA|IMPORTRANGE|IMPORTXML|IMAGE)\s*\(/i
];

function scanPayload_(obj) {
  var found = '';
  var skip = { html: 1, dataUrl: 1, avatarDataUrl: 1, fileBase64: 1, messages: 1, data: 1, text: 1, content: 1, adminPass: 1, adminPass2: 1, personalPass: 1, personalPass2: 1, oldPass: 1, newPass: 1, recoveryA: 1, answer: 1 };
  (function walk(o, depth, key) {
    if (found || depth > 6 || o === null || o === undefined) return;
    if (typeof o === 'string') {
      if (skip[key]) return;
      for (var i = 0; i < THREAT_PATTERNS.length; i++) if (THREAT_PATTERNS[i].test(o)) { found = String(THREAT_PATTERNS[i]); return; }
      return;
    }
    if (typeof o === 'object') Object.keys(o).forEach(function (k) { if (!skip[k]) walk(o[k], depth + 1, k); });
  })(obj, 0, '');
  return found;
}

/** กันสูตร Google Sheets ถูกฉีดผ่านข้อมูลที่ผู้ใช้กรอก */
function cell_(v) {
  var s = v === undefined || v === null ? '' : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s.slice(0, 45000);
}

/* =========================================================================
 *  SESSIONS (Remember Session จนกว่าจะออกจากระบบ)
 * ========================================================================= */

function createSession_(member, info) {
  var token = randomToken_(48);
  var th = sha256Hex_(token);
  info = info || {};
  appendRow_('Sessions', { tokenHash: th, memberId: member.memberId, createdAt: new Date().toISOString(), lastSeen: new Date().toISOString(), device: cell_(info.device), os: cell_(info.os), browser: cell_(info.browser), ip: cell_(info.ip), location: cell_(info.location), revoked: false });
  CacheService.getScriptCache().put('sess_' + th, member.memberId, 21600);
  return token;
}

function sessionMember_(token) {
  if (!token || typeof token !== 'string' || token.length < 20) return null;
  var th = sha256Hex_(token);
  var cache = CacheService.getScriptCache();
  var memberId = cache.get('sess_' + th);
  if (memberId === 'X') return null;
  if (!memberId) {
    var list = rows_('Sessions');
    for (var i = 0; i < list.length; i++) {
      if (list[i].tokenHash === th) {
        if (list[i].revoked === true || list[i].revoked === 'TRUE') { cache.put('sess_' + th, 'X', 21600); return null; }
        memberId = list[i].memberId;
        updateRow_('Sessions', list[i]._row, { lastSeen: new Date().toISOString() });
        break;
      }
    }
    if (!memberId) return null;
    cache.put('sess_' + th, memberId, 21600);
  }
  return findMemberById_(memberId);
}

function revokeSessions_(memberId, exceptToken) {
  var keep = exceptToken ? sha256Hex_(exceptToken) : '';
  var cache = CacheService.getScriptCache();
  rows_('Sessions').slice().forEach(function (s) {
    if (s.memberId === memberId && s.tokenHash !== keep && !(s.revoked === true || s.revoked === 'TRUE')) {
      updateRow_('Sessions', s._row, { revoked: true });
      cache.put('sess_' + s.tokenHash, 'X', 21600);
    }
  });
}

/* =========================================================================
 *  MEMBERS
 * ========================================================================= */

function findMemberById_(id) {
  if (!id) return null;
  var list = rows_('Members');
  for (var i = 0; i < list.length; i++) if (String(list[i].memberId) === String(id)) return list[i];
  return null;
}

function findMemberByLogin_(login) {
  var key = String(login || '').trim().toLowerCase();
  if (!key) return null;
  var list = rows_('Members');
  for (var i = 0; i < list.length; i++) {
    if (String(list[i].usernameLower) === key || String(list[i].memberId).toLowerCase() === key) return list[i];
  }
  return null;
}

function newMemberId_() {
  var be = Number(Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy')) + 543;
  var existing = {};
  rows_('Members').forEach(function (m) { existing[m.memberId] = true; });
  for (var tries = 0; tries < 50; tries++) {
    var id = 'TLL-' + be + '-' + Math.floor(100000 + Math.random() * 900000);
    if (!existing[id]) return id;
  }
  return 'TLL-' + be + '-' + Date.now();
}

function json_(s, def) { try { return s ? JSON.parse(s) : def; } catch (e) { return def; } }

function publicMember_(m) {
  return {
    memberId: m.memberId, username: m.username, title: m.title, firstName: m.firstName, lastName: m.lastName,
    displayName: m.displayName, birthDate: m.birthDate ? String(m.birthDate) : '', gender: m.gender, memberType: m.memberType,
    education: json_(m.educationJson, {}), work: json_(m.workJson, {}), phone: m.phone, address: m.address, bio: m.bio,
    avatar: m.avatar || '', email: m.email || '', emailVerified: m.emailVerified === true || m.emailVerified === 'TRUE', recoveryQ: m.recoveryQ, createdAt: m.createdAt, lastLogin: m.lastLogin,
    accountStatus: m.accountStatus || 'ปกติ', privacy: json_(m.privacyJson, {}), role: m.role || 'member',
    social: Object.keys(json_(m.socialJson, {})), extra: json_(m.extraJson, {}), plan: planState_(m)
  };
}

function planState_(m) {
  var now = Date.now();
  var trialStart = m.trialStart ? new Date(m.trialStart).getTime() : now;
  var trialEnd = trialStart + CONFIG.TRIAL_DAYS * 864e5;
  var expires = m.planExpires ? new Date(m.planExpires).getTime() : 0;
  if (m.role === 'admin') return { tier: 'pro', cycle: 'yearly', active: true, label: 'ผู้ดูแลระบบ', trial: false };
  if (m.plan && expires > now) return { tier: String(m.plan), cycle: m.planCycle || 'monthly', active: true, expires: new Date(expires).toISOString(), trial: false };
  if (now < trialEnd) return { tier: 'pro', cycle: 'yearly', active: true, trial: true, trialEnds: new Date(trialEnd).toISOString(), daysLeft: Math.ceil((trialEnd - now) / 864e5) };
  return { tier: 'free', cycle: '', active: false, trial: false, trialEnds: new Date(trialEnd).toISOString() };
}

/* =========================================================================
 *  AUTH: REGISTER / LOGIN / FORGOT
 * ========================================================================= */

function validUsername_(u) { return /^[A-Za-z0-9_.]{4,24}$/.test(u); }
function strongPassword_(p) { return typeof p === 'string' && p.length >= 10 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p); }

function apiCheckUsername_(p) {
  var u = String(p.username || '').trim();
  if (!validUsername_(u)) return { available: false, msg: 'ชื่อผู้ใช้งานต้องเป็นภาษาอังกฤษหรือตัวเลข 4–24 ตัวอักษร (ใช้ _ และ . ได้)' };
  var taken = !!findMemberByLogin_(u);
  return { available: !taken, msg: taken ? 'ชื่อผู้ใช้งานนี้มีผู้ใช้แล้ว' : 'ใช้ชื่อนี้ได้' };
}

function checkAdminPass_(input, member) {
  var norm = normalizeAdminPass_(input);
  if (member && member.adminHash) return verifyPassword_(norm, 'admin-' + member.memberId, member.adminHash);
  return verifyPassword_(norm, 'admin-global', PropertiesService.getScriptProperties().getProperty('ADMIN_HASH'));
}

function apiRegister_(p) {
  var errors = [];
  var f = p.form || {};
  var u = String(f.username || '').trim();
  if (!f.title) errors.push('กรุณาเลือกคำนำหน้าชื่อ');
  if (!f.firstName || !f.lastName) errors.push('กรุณากรอกชื่อจริงและนามสกุล');
  if (!f.displayName) errors.push('กรุณากรอกชื่อที่ใช้แสดงในระบบ');
  if (!f.birthDate) errors.push('กรุณาระบุวันเดือนปีเกิด');
  if (!f.memberType) errors.push('กรุณาเลือกสถานะของผู้สมัคร');
  if (!validEmail_(f.email)) errors.push('กรุณากรอกอีเมลให้ถูกต้อง เพื่อรับรหัสผ่านชั้นที่ 2 ทางอีเมล');
  if (!validUsername_(u)) errors.push('ชื่อผู้ใช้งานต้องเป็นภาษาอังกฤษหรือตัวเลข 4–24 ตัวอักษร');
  if (normalizeAdminPass_(f.adminPass) !== normalizeAdminPass_(f.adminPass2)) errors.push('รหัสผ่านจากผู้ดูแลระบบทั้งสองช่องไม่ตรงกัน');
  else if (!checkAdminPass_(f.adminPass, null)) errors.push('รหัสผ่านจากผู้ดูแลระบบไม่ถูกต้อง');
  if (!strongPassword_(f.personalPass)) errors.push('รหัสผ่านส่วนตัวต้องยาวอย่างน้อย 10 ตัวอักษร และมีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข');
  if (f.personalPass !== f.personalPass2) errors.push('รหัสผ่านส่วนตัวทั้งสองช่องไม่ตรงกัน');
  if (normalizeAdminPass_(f.personalPass) === normalizeAdminPass_(f.adminPass)) errors.push('รหัสผ่านส่วนตัวต้องไม่ซ้ำกับรหัสผ่านจากผู้ดูแลระบบ');
  if (!f.recoveryQ || !f.recoveryA) errors.push('กรุณากำหนดคำถามและคำตอบสำหรับกู้คืนบัญชี');
  if (!f.accept) errors.push('กรุณายอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัว');
  if (errors.length) return { ok: false, code: 'INVALID', msg: errors[0], errors: errors };

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return fail_('BUSY', 'มีผู้สมัครพร้อมกันจำนวนมาก กรุณากดสมัครอีกครั้ง');
  try {
    delete _rowsCache.Members;
    if (findMemberByLogin_(u)) return fail_('DUP_USERNAME', 'ชื่อผู้ใช้งานนี้มีผู้ใช้แล้ว กรุณาเลือกชื่ออื่น');
    var id = newMemberId_();
    var salt = randomToken_(24);
    var social = {};
    if (p.socialTicket) {
      var t = readTicket_(p.socialTicket, false);
      if (t && t.sub) social[t.provider] = { sub: t.sub, name: t.name || '', linkedAt: new Date().toISOString() };
    }
    var now = new Date().toISOString();
    appendRow_('Members', {
      memberId: id, username: u, usernameLower: u.toLowerCase(), title: cell_(f.title), firstName: cell_(f.firstName), lastName: cell_(f.lastName),
      displayName: cell_(f.displayName), birthDate: cell_(f.birthDate), gender: cell_(f.gender), memberType: cell_(f.memberType),
      educationJson: cell_(JSON.stringify(f.education || {})), workJson: cell_(JSON.stringify(f.work || {})),
      phone: cell_(f.phone), address: cell_(f.address), bio: cell_(f.bio), avatar: '',
      adminHash: '', personalHash: hashPassword_(f.personalPass, salt), salt: salt,
      email: cell_(String(f.email || '').trim().toLowerCase()), emailVerified: false, otpHash: '', otpExp: '', otpTries: 0,
      recoveryQ: cell_(f.recoveryQ), recoveryAHash: hashPassword_(String(f.recoveryA).trim().toLowerCase(), salt + 'R'),
      plan: '', planCycle: '', planExpires: '', trialStart: now, createdAt: now, lastLogin: '',
      accountStatus: 'ปกติ', failCount: 0, lockUntil: '', lockCount: 0, socialJson: JSON.stringify(social),
      privacyJson: JSON.stringify({ showProfile: true, showName: true, visibleTo: 'members', searchable: true }), role: 'member',
      extraJson: cell_(JSON.stringify(f.extra || {}))
    });
    audit_(id, 'register', 'สมัครสมาชิก');
    var m2 = findMemberById_(id);
    if (f.avatarDataUrl && m2) { try { saveAvatar_(m2, f.avatarDataUrl); } catch (e) { logError_('register.avatar', e, id); } }
    return { member: { memberId: id, username: u, name: f.title + f.firstName + ' ' + f.lastName, memberType: f.memberType, createdAt: now, accountStatus: 'Active' } };
  } finally { lock.releaseLock(); }
}

function apiLogin_(p) {
  var cfg = getConfig_();
  var maxAttempts = Number(cfg.LOCK_ATTEMPTS) || 5;
  var lockMin = Number(cfg.LOCK_MINUTES) || 15;
  var info = p.client || {};
  var m = findMemberByLogin_(p.username);
  var logBase = { time: new Date().toISOString(), username: cell_(p.username), ip: cell_(info.ip), location: cell_(info.location), isp: cell_(info.isp), device: cell_(info.device), os: cell_(info.os), browser: cell_(info.browser) };

  if (!m) {
    logBase.result = 'FAIL'; logBase.reason = 'ไม่พบชื่อผู้ใช้'; appendRow_('LoginLog', logBase);
    anonFail_(info);
    return fail_('BAD_CREDENTIALS', 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบแล้วลองใหม่อีกครั้ง');
  }
  logBase.memberId = m.memberId;
  if (m.accountStatus === 'ระงับ') {
    logBase.result = 'BLOCKED'; logBase.reason = 'บัญชีถูกระงับ'; appendRow_('LoginLog', logBase);
    return fail_('ACCOUNT_SUSPENDED', 'บัญชีของท่านถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบเพื่อดำเนินการปลดล็อก');
  }
  var lockUntil = m.lockUntil ? new Date(m.lockUntil).getTime() : 0;
  if (lockUntil > Date.now()) {
    var mins = Math.ceil((lockUntil - Date.now()) / 60000);
    logBase.result = 'LOCKED'; logBase.reason = 'อยู่ระหว่างระงับชั่วคราว'; appendRow_('LoginLog', logBase);
    return fail_('LOCKED', 'ระบบระงับการเข้าสู่ระบบของบัญชีนี้ชั่วคราว เนื่องจากกรอกรหัสผ่านไม่ถูกต้องติดต่อกันหลายครั้ง กรุณาลองใหม่ในอีก ' + mins + ' นาที');
  }
  var okAdmin = checkAdminPass_(p.adminPass, m);
  var okPersonal = verifyPassword_(String(p.personalPass || ''), m.salt, m.personalHash);
  if (!okAdmin || !okPersonal) {
    var fc = Number(m.failCount || 0) + 1;
    var upd = { failCount: fc };
    var msg = 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง (ครั้งที่ ' + fc + ' จาก ' + maxAttempts + ')';
    if (fc === 3) msg += ' ระบบได้เพิ่มระดับการตรวจสอบแล้ว';
    if (fc === maxAttempts - 1) msg += ' หากผิดอีกหนึ่งครั้ง ระบบจะระงับการเข้าสู่ระบบชั่วคราว ' + lockMin + ' นาที';
    if (fc >= maxAttempts) {
      upd.lockUntil = new Date(Date.now() + lockMin * 60000).toISOString();
      upd.failCount = 0;
      upd.lockCount = Number(m.lockCount || 0) + 1;
      msg = 'ท่านกรอกรหัสผ่านไม่ถูกต้องครบ ' + maxAttempts + ' ครั้ง ระบบจึงระงับการเข้าสู่ระบบชั่วคราว ' + lockMin + ' นาที';
      var sev = upd.lockCount >= 3 ? 'CRITICAL' : 'HIGH';
      raiseIncident_({ type: 'Brute force / การสุ่มรหัสผ่าน', severity: sev, memberId: m.memberId, username: m.username, ip: info.ip, location: info.location, device: [info.device, info.os, info.browser].join(' / '), attempts: maxAttempts * upd.lockCount, detail: 'มีการกรอกรหัสผ่านผิดติดต่อกัน ' + maxAttempts + ' ครั้ง (การระงับสะสม ' + upd.lockCount + ' ครั้ง)', action: 'ระงับการเข้าสู่ระบบ ' + lockMin + ' นาที', alertMember: true });
    }
    updateRow_('Members', m._row, upd);
    logBase.result = 'FAIL'; logBase.reason = !okAdmin ? 'รหัสชั้นที่ 1 ไม่ถูกต้อง' : 'รหัสชั้นที่ 3 (รหัสผ่านส่วนตัว) ไม่ถูกต้อง'; appendRow_('LoginLog', logBase);
    if (fc >= 3 && fc < maxAttempts) Utilities.sleep(300 * (fc - 2));
    return fail_(fc >= maxAttempts ? 'LOCKED' : 'BAD_CREDENTIALS', msg);
  }
  return startOtp_(m, info, 'รหัสผ่าน 3 ชั้น', p.email);
}

function finishLogin_(m, info, logBase, method) {
  var known = rows_('Sessions').some(function (s) { return s.memberId === m.memberId && s.device === String(info.device || '') && s.browser === String(info.browser || ''); });
  updateRow_('Members', m._row, { failCount: 0, lockUntil: '', lastLogin: new Date().toISOString() });
  var token = createSession_(m, info);
  logBase.result = 'SUCCESS'; logBase.reason = method; appendRow_('LoginLog', logBase);
  var fresh = findMemberById_(m.memberId);
  var notices = [];
  if (!known) notices.push({ type: 'security', title: 'เข้าสู่ระบบจากอุปกรณ์ใหม่', body: 'มีการเข้าสู่ระบบจาก ' + [info.device, info.os, info.browser].filter(function (x) { return x; }).join(' / ') + (info.location ? ' (' + info.location + ')' : '') + ' หากไม่ใช่ท่าน กรุณาเปลี่ยนรหัสผ่านและออกจากระบบทุกอุปกรณ์ทันที', time: new Date().toISOString() });
  return { token: token, member: publicMember_(fresh), notices: notices };
}

function anonFail_(info) {
  var cache = CacheService.getScriptCache();
  var key = 'anonfail_' + sha256Hex_(String(info.ip || '') + String(info.device || '')).slice(0, 16);
  var n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 3600);
  if (n === 15) raiseIncident_({ type: 'Username enumeration / การสุ่มบัญชีผู้ใช้', severity: 'HIGH', ip: info.ip, location: info.location, device: [info.device, info.os, info.browser].join(' / '), attempts: n, detail: 'มีการพยายามเข้าสู่ระบบด้วยชื่อผู้ใช้ที่ไม่มีอยู่จริง ' + n + ' ครั้งภายใน 1 ชั่วโมง', action: 'จำกัดความถี่คำขอและแจ้งผู้ดูแลระบบ' });
}

function apiForgot_(p) {
  var m = findMemberByLogin_(p.username);
  if (!m) return fail_('NOT_FOUND', 'ไม่พบชื่อผู้ใช้งานหรือรหัสสมาชิกนี้ในระบบ');
  if (!p.step || p.step === 'question') return { question: m.recoveryQ };
  var ok = verifyPassword_(String(p.answer || '').trim().toLowerCase(), m.salt + 'R', m.recoveryAHash) && checkAdminPass_(p.adminPass, m);
  if (!ok) {
    var fc = Number(m.failCount || 0) + 1;
    updateRow_('Members', m._row, { failCount: fc });
    if (fc >= 5) raiseIncident_({ type: 'Account recovery abuse', severity: 'HIGH', memberId: m.memberId, username: m.username, attempts: fc, detail: 'มีการพยายามกู้คืนบัญชีโดยตอบคำถามหรือรหัสชั้นที่ 1 ไม่ถูกต้องหลายครั้ง', action: 'บันทึกเหตุการณ์และแจ้งผู้ดูแลระบบ', alertMember: true });
    return fail_('BAD_ANSWER', 'คำตอบสำหรับกู้คืนบัญชีหรือรหัสผ่านจากผู้ดูแลระบบไม่ถูกต้อง');
  }
  if (!strongPassword_(p.newPass)) return fail_('WEAK', 'รหัสผ่านใหม่ต้องยาวอย่างน้อย 10 ตัวอักษร และมีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข');
  updateRow_('Members', m._row, { personalHash: hashPassword_(p.newPass, m.salt), failCount: 0, lockUntil: '' });
  revokeSessions_(m.memberId, null);
  audit_(m.memberId, 'password.reset', 'ตั้งรหัสผ่านใหม่ผ่านการกู้คืนบัญชี');
  return { msg: 'ตั้งรหัสผ่านส่วนตัวใหม่เรียบร้อยแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่' };
}

function apiLogout_(p, ctx) {
  var th = sha256Hex_(ctx.token);
  rows_('Sessions').slice().forEach(function (s) { if (s.tokenHash === th) updateRow_('Sessions', s._row, { revoked: true }); });
  CacheService.getScriptCache().put('sess_' + th, 'X', 21600);
  return {};
}

function apiLogoutAll_(p, ctx) {
  revokeSessions_(ctx.member.memberId, p.keepCurrent ? ctx.token : null);
  audit_(ctx.member.memberId, 'logout.all', 'ออกจากระบบทุกอุปกรณ์');
  return { msg: 'ออกจากระบบทุกอุปกรณ์เรียบร้อยแล้ว' };
}

function audit_(memberId, action, detail) {
  try { appendRow_('AuditLog', { time: new Date().toISOString(), memberId: memberId, action: action, detail: cell_(detail) }); } catch (e) {}
}

function logError_(where, err, memberId) {
  try {
    appendRow_('ErrorLog', { time: new Date().toISOString(), memberId: memberId || '', where: where, message: cell_(err && err.message ? err.message : err), stack: cell_(err && err.stack ? String(err.stack).slice(0, 2000) : ''), userAgent: '', version: CONFIG.VERSION });
  } catch (e) {}
}
