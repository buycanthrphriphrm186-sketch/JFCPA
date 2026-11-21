/* =========================================================================
 *  v11 (เพิ่มเติมเท่านั้น ไม่ลบข้อมูล/ระบบเดิม)
 *  - ปิดปรับปรุงเฉพาะส่วน (Config.SECTION_MAINT) — มีผลภายในรอบตรวจ ~2 วินาที
 *  - โหมดทดลองใช้งานโดยไม่ต้องเข้าสู่ระบบ (Config.GUEST_MODE) — เปิดได้เฉพาะผู้ดูแล
 *  - ให้คะแนนความประทับใจ (Config.RATING_MODE + ชีต Ratings)
 *  - แชท: ส่งทันที (บันทึกแถวเดียว) แล้วซิงก์ไปหลังบ้านแยกอีกคำสั่ง + ตัวนับข้อความผู้ดูแลที่ยังไม่อ่าน
 *  - อ่านอนุสัญญา/สนธิสัญญาภายในเว็บไซต์ (treatyText)
 * ========================================================================= */
CONFIG.VERSION = '11.0.0';
SHEETS.Ratings = ['id', 'time', 'memberId', 'username', 'displayName', 'stars', 'text', 'device'];
HEAD_TH.stars = 'คะแนน (ดาว)'; HEAD_TH.displayName = 'ชื่อที่แสดง';
DEFAULT_CONFIG.push(
  ['SECTION_MAINT', '{}', 'ปิดปรับปรุงเฉพาะส่วน (JSON) เช่น {"thai:พระราชบัญญัติ/พระราชกำหนด":{"on":true,"reason":"...","start":"...","end":"..."}} คีย์: content, thai, thai:<หมวด>, foreign, foreign:<รหัสประเทศ>, deka, treaties, tools, ai, chat, horo, rating'],
  ['GUEST_MODE', '{"on":false}', 'ทดลองใช้งานโดยไม่ต้องเข้าสู่ระบบ (JSON) {"on":true,"from":"2026-12-01T00:00:00+07:00","to":"2026-12-07T23:59:59+07:00","title":"...","message":"..."}'],
  ['RATING_MODE', '{"on":false}', 'เปิดปุ่มให้คะแนนความประทับใจ (JSON) {"on":true,"from":"...","to":"...","message":"..."}']
);

/* ---------------- อ่านค่าโหมดพิเศษจาก Config ---------------- */
function modeOf_(raw) {
  var o = json_(raw, null);
  if (!o) o = { on: /^(on|true|1|เปิด)$/i.test(String(raw || '').trim()) };
  var now = Date.now(), from = o.from ? new Date(o.from).getTime() : 0, to = o.to ? new Date(o.to).getTime() : 0;
  o.active = !!o.on && (!from || isNaN(from) || now >= from) && (!to || isNaN(to) || now <= to);
  return o;
}
function sectionMaint_(cfg) {
  var o = json_(cfg.SECTION_MAINT, {}) || {}, out = {};
  Object.keys(o).forEach(function (k) {
    var v = o[k]; if (v === true || v === 'on') v = { on: true };
    if (v && (v.on === true || v.on === 'on' || v.on === 'true')) out[String(k).slice(0, 80)] = { reason: String(v.reason || '').slice(0, 2000), start: String(v.start || ''), end: String(v.end || ''), law: String(v.law || '').slice(0, 1000), title: String(v.title || '').slice(0, 200) };
  });
  return out;
}
function liveModes_(cfg) {
  var g = modeOf_(cfg.GUEST_MODE), r = modeOf_(cfg.RATING_MODE);
  return {
    sec: sectionMaint_(cfg),
    guest: { active: g.active, to: g.to || '', title: String(g.title || '').slice(0, 200), message: String(g.message || '').slice(0, 4000) },
    rating: { active: r.active, message: String(r.message || '').slice(0, 4000) }
  };
}

/* ping (ใช้ได้โดยไม่ต้องเข้าสู่ระบบ) และ pulse ส่งสถานะโหมดพิเศษกลับไปด้วย */
var pingFnV10_ = ROUTES.ping.fn;
ROUTES.ping.fn = function (p, ctx) { var o = pingFnV10_(p, ctx); try { o.modes = liveModes_((ctx && ctx.cfg) || getConfig_()); } catch (e) {} return o; };
var pulseFnV10_ = ROUTES.pulse.fn;
ROUTES.pulse.fn = function (p, ctx) { var o = pulseFnV10_(p, ctx); try { o.modes = liveModes_(ctx.cfg || getConfig_()); } catch (e) {} return o; };

/* ---------------- โหมดทดลองใช้งาน (ไม่ต้องใส่รหัสผ่าน) ---------------- */
var GUEST_ID = 'GUEST-TRIAL';
function guestActive_() { try { return modeOf_(getConfig_().GUEST_MODE).active; } catch (e) { return false; } }
function guestMember_() {
  var m = findMemberById_(GUEST_ID);
  if (m) return m;
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    delete _rowsCache.Members; m = findMemberById_(GUEST_ID); if (m) return m;
    var now = new Date().toISOString();
    appendRow_('Members', { memberId: GUEST_ID, username: 'guest', usernameLower: 'guest-trial', displayName: 'ผู้ทดลองใช้งาน', firstName: 'ผู้ทดลองใช้งาน', memberType: 'ผู้ทดลองใช้งาน (ไม่ต้องเข้าสู่ระบบ)', role: 'guest', accountStatus: 'ปกติ', blocked: 'ปกติ', createdAt: now, privacyJson: '{}', socialJson: '{}', extraJson: '{"note":"บัญชีกลางสำหรับโหมดทดลองใช้งาน เข้าสู่ระบบด้วยรหัสผ่านไม่ได้"}' });
    delete _rowsCache.Members;
    return findMemberById_(GUEST_ID);
  } finally { lock.releaseLock(); }
}
function apiGuestStart_(p) {
  if (!guestActive_()) return fail_('GUEST_OFF', 'ขณะนี้ยังไม่เปิดให้ทดลองใช้งานโดยไม่ต้องเข้าสู่ระบบ');
  var m = guestMember_();
  var info = p.info || {};
  var token = createSession_(m, { device: String(info.device || ''), os: String(info.os || ''), browser: String(info.browser || ''), ip: String(info.ip || ''), location: String(info.location || '') + ' (โหมดทดลองใช้งาน)' });
  return { token: token, member: publicMember_(m) };
}
ROUTES.guestStart = { fn: apiGuestStart_, limit: 30 };
/* หมดเวลาทดลองหรือผู้ดูแลปิดโหมด → เซสชันผู้ทดลองใช้ไม่ได้ทันที */
var sessionMemberV10_ = sessionMember_;
sessionMember_ = function (token) {
  var m = sessionMemberV10_(token);
  if (m && m.memberId === GUEST_ID && !guestActive_()) return null;
  return m;
};
/* ---------------- แชท: ส่งทันที ---------------- */
apiChatSend_ = function (p, ctx) {
  var m = ctx.member, text = String(p.text || '').replace(/\r\n/g, '\n').trim();
  if (!text) return fail_('EMPTY', 'กรุณาพิมพ์ข้อความ');
  if (text.length > 5000) return fail_('TOO_LONG', 'ข้อความยาวเกิน 5,000 ตัวอักษร');
  var cid = String(p.cid || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40), c = CacheService.getScriptCache();
  if (cid) { var dup = c.get('chsent_' + cid); if (dup) return JSON.parse(dup); }
  var now = new Date().toISOString(), id = 'CHT-' + Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase();
  sheet_('Chat').appendRow([id, now, m.memberId, m.username, 'member', '', '', cell_(text), 'รอซิงก์']);
  delete _rowsCache.Chat;
  var out = { id: id, time: now };
  if (cid) c.put('chsent_' + cid, JSON.stringify(out), 21600);
  return out;
};
ROUTES.chatSend.fn = apiChatSend_;
ROUTES.chatSend.limit = 300;
/* ส่งต่อไปยังระบบหลังบ้าน (Reports + Sheet1 หลังบ้าน + LINE ผู้ดูแล) — หน้าเว็บเรียกทันทีหลังส่ง และมีงานตั้งเวลาทุก 1 นาทีเป็นสำรอง */
function chatSyncPending_(memberId) {
  var sh = sheet_('Chat'), last = sh.getLastRow(); if (last < 2) return 0;
  var rows = memberId ? findRowsBy_('Chat', 3, memberId) : null;
  var lock = LockService.getScriptLock(); if (!lock.tryLock(5000)) return 0;
  var n = 0;
  try {
    var idx = rows || []; if (!rows) { for (var r = Math.max(2, last - 300); r <= last; r++) idx.push(r); }
    var bs = null, items = [];
    idx.forEach(function (r) {
      var v = sh.getRange(r, 1, 1, 9).getValues()[0];
      if (String(v[8]) !== 'รอซิงก์' || String(v[4]) !== 'member') return;
      items.push({ row: r, id: String(v[0]), time: String(v[1]), memberId: String(v[2]), username: String(v[3]), text: String(v[7]) });
    });
    if (!items.length) return 0;
    try { bs = backendSheet_(); } catch (e) {}
    items.forEach(function (x) {
      try {
        var rep = rows_('Reports').filter(function (r) { return r.memberId === x.memberId && r.kind === 'แชทกับผู้ดูแลระบบ'; }).pop();
        var line = '[' + Utilities.formatDate(new Date(x.time), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm') + '] ' + x.text;
        if (rep && rep.status === 'รอดำเนินการ' && Date.now() - new Date(rep.time).getTime() < 30 * 60000 && String(rep.detail).length + line.length < 44000) updateRow_('Reports', rep._row, { detail: String(rep.detail) + '\n' + line });
        else appendRow_('Reports', { time: x.time, memberId: x.memberId, username: x.username, kind: 'แชทกับผู้ดูแลระบบ', subject: cell_(x.text.slice(0, 80)), detail: cell_(line), status: 'รอดำเนินการ' });
      } catch (e) { logError_('chat.report', e, ''); }
      if (bs && PropertiesService.getScriptProperties().getProperty('CHAT_MIRROR_BACKEND') !== '0') { try { bs.appendRow([x.id, x.time, x.memberId, x.username, 'member', '', '', cell_(x.text), 'TRUE', x.time]); } catch (e) { logError_('chat.mirror', e, ''); } }
      sh.getRange(x.row, 9).setValue('ส่งถึงผู้ดูแลแล้ว'); n++;
    });
    try { if (typeof lineCall_ === 'function' && lineTargets_().length) lineCall_('/v2/bot/message/multicast', { to: lineTargets_().slice(0, 500), messages: [{ type: 'text', text: 'แชทใหม่จากสมาชิก ' + items[0].username + ' (' + items[0].memberId + ') ' + items.length + ' ข้อความ\n' + items.map(function (x) { return x.text; }).join('\n').slice(0, 900) }] }, items[0].id); } catch (e) {}
  } finally { lock.releaseLock(); }
  return n;
}
ROUTES.chatSync = { fn: function (p, ctx) { return { synced: chatSyncPending_(ctx.member.memberId) }; }, auth: true, limit: 300 };
function chatSyncTick() { try { chatSyncPending_(''); } catch (e) { logError_('chat.tick', e, ''); } }
/* chatList แสดงสถานะซิงก์ตามจริง */
/* ตัวนับข้อความผู้ดูแล: ส่งเวลาของข้อความผู้ดูแลทั้งหมด (ฝั่งหน้าเว็บนับเฉพาะที่ยังไม่อ่าน) */
chatSig_ = function (memberId) {
  var c = CacheService.getScriptCache(), k = 'chs11_' + memberId, hit = c.get(k);
  if (hit) return JSON.parse(hit);
  var t = {};
  try { backendMsgs_(memberId).forEach(function (x) { if (x.sender === 'admin') t[x.id] = x.time; }); } catch (e) {}
  try { serverNotices_(udServerRead_(memberId).data).forEach(function (n) { if (/^MSG-/.test(n.id)) t[n.id] = n.time; }); } catch (e) {}
  var list = Object.keys(t).map(function (id) { return [id, String(t[id])]; }).sort(function (a, b) { return a[1] < b[1] ? -1 : 1; }).slice(-200);
  var o = { admin: list, lastAdmin: list.length ? list[list.length - 1][1] : '' };
  c.put(k, JSON.stringify(o), 2);
  return o;
};

/* ---------------- ให้คะแนนความประทับใจ ---------------- */
function ratingActive_() { try { return modeOf_(getConfig_().RATING_MODE).active; } catch (e) { return false; } }
function maskName_(s) { s = String(s || 'สมาชิก'); return s.length <= 2 ? s.charAt(0) + '*' : s.slice(0, 2) + '***'; }
function apiRatingSend_(p, ctx) {
  if (!ratingActive_()) return fail_('RATING_OFF', 'ขณะนี้ยังไม่เปิดให้ประเมินความประทับใจ');
  var stars = Math.round(Number(p.stars) || 0); if (stars < 1 || stars > 5) return fail_('BAD_STARS', 'กรุณาเลือกจำนวนดาว 1–5 ดวง');
  var text = String(p.text || '').trim().slice(0, 5000), m = ctx.member;
  var cid = String(p.cid || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40), c = CacheService.getScriptCache();
  if (cid) { var dup = c.get('rtsent_' + cid); if (dup) return JSON.parse(dup); }
  var id = 'RT-' + Utilities.getUuid().replace(/-/g, '').slice(0, 10).toUpperCase(), now = new Date().toISOString();
  sheet_('Ratings').appendRow([id, now, m.memberId, m.username, m.memberId === GUEST_ID ? 'ผู้ทดลองใช้งาน' : (m.displayName || m.firstName || m.username), stars, cell_(text), cell_(String(p.device || '').slice(0, 80))]);
  delete _rowsCache.Ratings; c.remove('rtlist');
  var out = { id: id, time: now };
  if (cid) c.put('rtsent_' + cid, JSON.stringify(out), 21600);
  return out;
}
function apiRatingList_(p, ctx) {
  var c = CacheService.getScriptCache(), hit = c.get('rtlist'), base;
  if (hit) base = JSON.parse(hit);
  else {
    var all = rows_('Ratings'), dist = [0, 0, 0, 0, 0], sum = 0;
    all.forEach(function (r) { var s = Math.round(Number(r.stars) || 0); if (s >= 1 && s <= 5) { dist[s - 1]++; sum += s; } });
    var n = dist.reduce(function (a, b) { return a + b; }, 0);
    base = { count: n, avg: n ? Math.round(sum / n * 100) / 100 : 0, dist: dist, items: all.slice(-150).reverse().map(function (r) { return { id: String(r.id), time: String(r.time), name: maskName_(r.displayName || r.username), stars: Number(r.stars) || 0, text: String(r.text || ''), mine: r.memberId }; }) };
    try { c.put('rtlist', JSON.stringify(base), 3); } catch (e) {}
  }
  var me = ctx.member.memberId;
  base.items = base.items.map(function (x) { var y = { id: x.id, time: x.time, name: x.name, stars: x.stars, text: x.text }; if (x.mine === me && me !== GUEST_ID) y.mine = true; return y; });
  return base;
}
ROUTES.ratingSend = { fn: apiRatingSend_, auth: true, limit: 60 };
ROUTES.ratingList = { fn: apiRatingList_, auth: true, limit: 600 };

/* ---------------- อ่านอนุสัญญา/สนธิสัญญาภายในเว็บไซต์ ---------------- */
function wikiGet_(url) {
  var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { 'User-Agent': 'ThaiLawLibrary/11 (Apps Script)' } });
  if (r.getResponseCode() !== 200) throw new Error('HTTP ' + r.getResponseCode());
  return JSON.parse(r.getContentText('UTF-8'));
}
function apiTreatyText_(p) {
  var id = String(p.id || '').toUpperCase(); if (!/^Q\d{1,12}$/.test(id)) return fail_('INVALID', 'รหัสไม่ถูกต้อง');
  var key = 'trt11_' + id, hit = cacheGetBig_(key); if (hit) return hit;
  var e = (wikiGet_('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels|descriptions|sitelinks|claims&languages=th|en&ids=' + id).entities || {})[id] || {};
  var sl = e.sitelinks || {}, lab = e.labels || {}, des = e.descriptions || {};
  var out = { id: id, th: (lab.th || {}).value || '', en: (lab.en || {}).value || '', descTh: (des.th || {}).value || '', descEn: (des.en || {}).value || '', kind: '', source: '', paras: [] };
  var tryWs = [['thwikisource', 'th'], ['enwikisource', 'en'], ['frwikisource', 'fr'], ['eswikisource', 'es'], ['dewikisource', 'de']];
  for (var i = 0; i < tryWs.length && !out.paras.length; i++) {
    var s = sl[tryWs[i][0]]; if (!s) continue;
    try {
      var j = wikiGet_('https://' + tryWs[i][1] + '.wikisource.org/w/api.php?action=parse&format=json&formatversion=2&prop=text&redirects=1&page=' + encodeURIComponent(s.title));
      var t = cleanSourceText_(String((j.parse || {}).text || ''));
      if (t.length > 200) { out.paras = t.split(/\n+/).map(function (x) { return x.trim(); }).filter(String).slice(0, 3000); out.kind = 'text'; out.lang = tryWs[i][1]; out.source = 'วิกิซอร์ซ (' + tryWs[i][1] + '.wikisource.org) — ' + s.title; }
    } catch (err) { logError_('treaty.ws', err, id); }
  }
  var tryWp = [['thwiki', 'th'], ['enwiki', 'en']];
  for (var k = 0; k < tryWp.length && !out.paras.length; k++) {
    var w = sl[tryWp[k][0]]; if (!w) continue;
    try {
      var q = wikiGet_('https://' + tryWp[k][1] + '.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=extracts&explaintext=1&redirects=1&titles=' + encodeURIComponent(w.title));
      var pg = ((q.query || {}).pages || [])[0] || {}, tx = String(pg.extract || '');
      if (tx.length > 100) { out.paras = tx.split(/\n+/).map(function (x) { return x.replace(/^=+\s*|\s*=+$/g, '').trim(); }).filter(String).slice(0, 2000); out.kind = 'summary'; out.lang = tryWp[k][1]; out.source = 'วิกิพีเดีย (' + tryWp[k][1] + '.wikipedia.org) — ' + w.title; }
    } catch (err) { logError_('treaty.wp', err, id); }
  }
  if (!out.paras.length) { out.kind = 'meta'; out.source = 'Wikidata ' + id; out.paras = [out.descTh || out.descEn || 'แหล่งข้อมูลเปิดยังไม่มีตัวบทหรือคำอธิบายของรายการนี้']; }
  try { cachePutBig_(key, out, 21600); } catch (er) {}
  return out;
}
ROUTES.treatyText = { fn: apiTreatyText_, auth: true, limit: 120 };

/* ---------------- ข้อจำกัดของบัญชีทดลองใช้งาน (ติดตั้งท้ายสุด ให้ครอบทุกคำสั่งข้างต้น) ---------------- */
/* ผู้ทดลองใช้งานไม่สามารถแก้ไขข้อมูลบัญชี/ส่งแชท (บัญชีกลาง ไม่มีข้อมูลส่วนบุคคล) */
['updateProfile', 'uploadAvatar', 'changePassword', 'changeUsername', 'setPrivacy', 'setAccountStatus', 'deleteAccount', 'exportData', 'logoutAll', 'secureAccount', 'linkSocial', 'memberPdf', 'backupPdf', 'loginHistoryPdf', 'chatSend', 'chatSync', 'lineLinkCode', 'lineUnlink', 'reportProblem', 'paymentRequest', 'paymentNotify', 'geoUpdate'].forEach(function (a) {
  if (!ROUTES[a]) return;
  var f = ROUTES[a].fn;
  ROUTES[a].fn = function (p, ctx) { if (ctx && ctx.member && ctx.member.memberId === GUEST_ID) return fail_('GUEST_ONLY', 'โหมดทดลองใช้งานไม่สามารถใช้ฟังก์ชันนี้ได้ กรุณาสมัครสมาชิกหรือเข้าสู่ระบบ'); return f(p, ctx); };
});
(function () {
  var f = ROUTES.saveUserData.fn;
  ROUTES.saveUserData.fn = function (p, ctx) { if (ctx && ctx.member && ctx.member.memberId === GUEST_ID) return { rev: 0, savedAt: new Date().toISOString(), guest: true }; return f(p, ctx); };
})();

/* ---------------- งานตั้งเวลา + อัปเกรด ---------------- */
var installTriggersV10_ = installTriggers_;
installTriggers_ = function () {
  installTriggersV10_();
  var have = {};
  ScriptApp.getProjectTriggers().forEach(function (t) { have[t.getHandlerFunction()] = true; });
  if (!have.chatSyncTick) ScriptApp.newTrigger('chatSyncTick').timeBased().everyMinutes(1).create();
};
var upgradeV10_ = upgradeV5_;
upgradeV5_ = function () {
  upgradeV10_();
  try { sheet_('Ratings'); seedConfig_(); } catch (e) { logError_('upgrade11', e, ''); }
  CacheService.getScriptCache().removeAll(['cfg', 'rtlist']);
};
