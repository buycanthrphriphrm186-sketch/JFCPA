
/* =========================================================================
 *  VERSION 5 — กฎหมายต่างประเทศครบทุกประเทศ + กฎหมายไทยลำดับรอง (ดึงตามต้องการ)
 *  ดัชนี (ชื่อกฎหมาย จำนวนมาตรา ตำแหน่งข้อมูล) เก็บใน db/ ของโครงการ ส่วนตัวบทดึงจาก Hugging Face
 *  Dataset Viewer API (/rows) แบบทีละฉบับเมื่อมีผู้เปิดอ่าน แล้วเก็บแคช 6 ชั่วโมง เพื่อไม่ให้เป็นภาระแหล่งข้อมูล
 *  ชุดข้อมูลทั้งหมดเป็นตัวบทกฎหมายจากแหล่งทางการของรัฐ และอนุญาตให้นำไปใช้ซ้ำได้ (ระบุไว้ใน manifest)
 * ========================================================================= */

var HF_ROWS = 'https://datasets-server.huggingface.co/rows';
var FGN_V5 = {
  CN: { name: 'จีน', native: '中国', urls: ['https://flk.npc.gov.cn', 'https://xzfg.moj.gov.cn', 'https://en.moj.gov.cn'], art: /^\s*(第[一二三四五六七八九十百千零〇两0-9]+条)\s*/ },
  KR: { name: 'เกาหลีใต้', native: '대한민국', urls: ['https://www.law.go.kr', 'https://elaw.klri.re.kr'], art: /^\s*(제\s*\d+\s*조(?:의\s*\d+)?)(\s*\([^)]{1,60}\))?\s*/ },
  VN: { name: 'เวียดนาม', native: 'Việt Nam', urls: ['https://vanban.chinhphu.vn'], art: /^\s*(Điều\s+\d+[a-z]?)\.?\s*/i },
  LA: { name: 'ลาว', native: 'ລາວ', urls: ['https://www.laoofficialgazette.gov.la', 'https://lawforasean.ocs.go.th'], art: /^\s*((?:ມາດຕາ|Article)\s*[0-9໐-໙]+)\.?\s*/ },
  ID: { name: 'อินโดนีเซีย', native: 'Indonesia', urls: ['https://peraturan.bpk.go.id', 'https://pasal.id/en'], art: /^\s*(Pasal\s+\d+[A-Z]?)\s*/ },
  MY: { name: 'มาเลเซีย', native: 'Malaysia', urls: ['https://lom.agc.gov.my'], art: /^\s*((?:Section|Seksyen)\s+\d+[A-Z]*)\.?\s*/ },
  PH: { name: 'ฟิลิปปินส์', native: 'Pilipinas', urls: ['https://www.lawphil.net'], art: /^\s*((?:SECTION|Section|SEC\.|Sec\.|ARTICLE|Article)\s+\d+[A-Za-z]?)\.?\s*/ },
  SG: { name: 'สิงคโปร์', native: 'Singapore', urls: ['https://sso.agc.gov.sg'], art: /^\s*(\d+[A-Z]*)\.\s*(?=\S)/ },
  BN: { name: 'บรูไน', native: 'Brunei', urls: ['https://www.agc.gov.bn'], art: /^\s*(\d+[A-Z]*)\.\s*(?=\S)/ }
};
var THAI2_ART = /^\s*((?:มาตรา|ข้อ)\s*[0-9๐-๙]+(?:\/[0-9๐-๙]+)?(?:\s*(?:ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|นว|ทศ))?)\s*/;

function hfHeaders_() {
  var t = PropertiesService.getScriptProperties().getProperty('HF_TOKEN');
  return t ? { Authorization: 'Bearer ' + t } : {};
}
function hfRowsUrl_(ds, cfg, off, len) { return HF_ROWS + '?dataset=' + encodeURIComponent(ds) + '&config=' + encodeURIComponent(cfg) + '&split=train&offset=' + off + '&length=' + len; }
/* ดึงหลายหน้าพร้อมกัน (สูงสุด 100 แถวต่อคำขอ) — ลองใหม่ 1 ครั้งเฉพาะหน้าที่ล้มเหลว */
function hfRows_(ds, cfg, off, len) {
  var urls = [], out = [];
  for (var o = off; o < off + len; o += 100) urls.push(hfRowsUrl_(ds, cfg, o, Math.min(100, off + len - o)));
  var reqs = urls.map(function (u) { return { url: u, muteHttpExceptions: true, headers: hfHeaders_() }; });
  var res = UrlFetchApp.fetchAll(reqs);
  res.forEach(function (r, i) {
    if (r.getResponseCode() !== 200) { Utilities.sleep(400); r = UrlFetchApp.fetch(urls[i], reqs[i]); }
    if (r.getResponseCode() !== 200) throw new Error('HF ' + r.getResponseCode());
    out = out.concat(JSON.parse(r.getContentText('UTF-8')).rows.map(function (x) { return x.row; }));
  });
  return out;
}
function fgnManifest_() {
  var c = CacheService.getScriptCache(), hit = c.get('fman5');
  if (hit) return JSON.parse(hit);
  var m = null;
  try { var r = UrlFetchApp.fetch(dbBase_() + 'foreign/manifest.json', { muteHttpExceptions: true }); if (r.getResponseCode() === 200) m = JSON.parse(r.getContentText('UTF-8')); } catch (e) {}
  if (!m) return { countries: {}, thai2: null };
  c.put('fman5', JSON.stringify(m), 21600);
  return m;
}

/* แยกตัวบทเป็นมาตรา → วรรค → อนุมาตรา (ใช้กับข้อความที่ไม่ได้แยกมาตรามาก่อน) */
var ITEM_RE = /^\s*(\(\s*[0-9๐-๙a-zA-Zก-ฮ]{1,4}\s*\)|[0-9๐-๙]{1,3}\)|[a-z]\)|[ก-ฮ]\)|[一二三四五六七八九十]+、|（[一二三四五六七八九十]+）)\s*/;
var NOISE_RE = /^([A-Za-z]{1,2}|-\s*\d+\s*-|\d+\s*\/\s*\d+|SK No\b.*|\.{2,}|www\.\S+|Page \d+( of \d+)?|halaman \d+.*)$/i;
function isNoise_(ln) {
  if (NOISE_RE.test(ln)) return true;
  if (ln.length < 40) { var good = (ln.match(/[\p{L}\p{N}\s.,;:()"'\-–]/gu) || []).length; if (good / ln.length < 0.75) return true; if (/[a-z][A-Z][a-z][A-Z]|[A-Z][a-z][A-Z][a-z][A-Z]/.test(ln) && !/\s\w+\s/.test(ln)) return true; }
  return false;
}
function splitParas_(text, noMerge) {
  var lines = String(text || '').replace(/\r\n?/g, noMerge ? ' ' : '\n').split(/\n/).map(function (s) { return s.replace(/[ \t\u3000\u00a0]+/g, ' ').trim(); }).filter(function (s) { return !s || !isNoise_(s); });
  var paras = [], cur = null;
  lines.forEach(function (ln) {
    if (!ln) { cur = null; return; }
    var m = ln.match(ITEM_RE);
    if (m && paras.length) { var host = paras[paras.length - 1]; host.items.push({ t: m[1].trim(), s: ln.slice(m[0].length), sub: [] }); cur = 'item'; return; }
    if (cur === 'item' && paras.length) { var it = paras[paras.length - 1].items; it[it.length - 1].s += ' ' + ln; return; }
    if (!noMerge && cur === 'p' && paras.length && !/[.。:;：；]$/.test(paras[paras.length - 1].s) && ln.length < 400 && !/^[A-Z][A-Z ]{3,}$/.test(ln)) { paras[paras.length - 1].s += ' ' + ln; return; }
    paras.push({ n: '', s: ln, items: [] }); cur = 'p';
  });
  return paras.length ? paras : [{ n: '', s: '', items: [] }];
}
function splitArticles_(text, re, noMerge) {
  var lines = String(text || '').replace(/\r/g, '').split('\n'), arts = [], cur = { no: '', cap: '', head: '', buf: [] }, head = '';
  lines.forEach(function (ln) {
    var t = ln.trim();
    if (/^(ภาค|ลักษณะ|หมวด|ส่วนที่|บรรพ|บทเฉพาะกาล|PART|Part|CHAPTER|Chapter|BAB|Bagian|Chương|Mục|第[一二三四五六七八九十百]+[章节编])(?=[\s0-9๐-๙IVXLC]|$)/.test(t) && t.length < 120) { head = t; return; }
    var m = t.match(re);
    if (m) { if (cur.no || cur.buf.join('').trim()) arts.push(cur); cur = { no: m[1].replace(/\s+/g, ' '), cap: (m[2] || '').trim(), head: head, buf: [t.slice(m[0].length)] }; }
    else cur.buf.push(ln);
  });
  if (cur.no || cur.buf.join('').trim()) arts.push(cur);
  return arts.map(function (a) { return { no: a.no || 'บทนำ', cap: a.cap, head: a.head, paras: splitParas_(a.buf.join('\n'), noMerge) }; });
}
function headsOf_(arts) { var h = []; arts.forEach(function (a) { if (a.head && h.indexOf(a.head) < 0) h.push(a.head); }); return h; }

function apiForeignLawV5_(p) {
  var cc = String(p.country || ''), id = String(p.id || '').slice(0, 160);
  if (cc === 'JP' || (cc === 'KR' && p.src === 'krapi')) return apiForeignLaw_(p);
  var cfgC = FGN_V5[cc]; if (!cfgC && cc !== 'TH2') return fail_('INVALID', 'ไม่พบประเทศ');
  var e = p.entry || {}, kind = String(e.k || ''), off = Math.max(0, Math.floor(Number(e.o) || 0)), n = Math.max(0, Math.min(Math.floor(Number(e.n) || 0), 4000));
  if (!id || !/^[arl]$/.test(kind)) return fail_('INVALID', 'ข้อมูลกฎหมายไม่ครบถ้วน');
  var key = 'fl5_' + cc + '_' + sha256Hex_(id).slice(0, 24), hit = cacheGetBig_(key);
  if (hit) return hit;
  var man = fgnManifest_(), out;
  try {
    if (cc === 'TH2') {
      var row = hfRows_('pythainlp/thailaw-v1.0', 'default', off, 1)[0] || {};
      if (p.title && String(row.title || '').replace(/\s/g, '') !== String(p.title).replace(/\s/g, '')) return fail_('MISMATCH', 'ข้อมูลต้นทางมีการปรับปรุง กรุณาโหลดหน้าใหม่');
      var arts = splitArticles_(cleanLawText_(String(row.text || '').replace(/\r\n?/g, ' ')), THAI2_ART, true);
      out = { country: 'TH2', id: id, title: row.title, heads: headsOf_(arts), articles: arts, source: 'PyThaiNLP thailaw-v1.0 (CC0) — ข้อมูลต้นทาง: ราชกิจจานุเบกษา / สำนักงานคณะกรรมการกฤษฎีกา', lang: 'th' };
    } else if (cc === 'CN') {
      var r = hfRows_('twang2218/chinese-law-and-regulations', 'default', off, 1)[0] || {};
      if (p.title && String(r.title || '') !== String(p.title)) return fail_('MISMATCH', 'ข้อมูลต้นทางมีการปรับปรุง กรุณาโหลดหน้าใหม่');
      var a2 = splitArticles_(r.content || '', cfgC.art, true);
      out = { country: 'CN', id: id, title: r.title, type: r.type, updated: String(r.publish_date || '').slice(0, 10), enforced: String(r.effective_date || '').slice(0, 10), status: r.status, heads: headsOf_(a2), articles: a2, source: '国家法律法规数据库 (flk.npc.gov.cn) ผ่านชุดข้อมูล twang2218/chinese-law-and-regulations', lang: 'zh' };
    } else {
      var ds = (man.countries[cc] && man.countries[cc].dataset) || '';
      if (!/^endomorphosis\/ipfs_[a-z]+_laws$/.test(ds)) return fail_('UPSTREAM', 'ยังไม่สามารถโหลดดัชนีของประเทศนี้ได้');
      var arts3, title = p.title || '', srcUrl = '';
      if (kind === 'a' && n > 0) {
        var rows = hfRows_(ds, 'articles', off, n);
        if (!rows.length || rows[0].law_id !== id || rows[rows.length - 1].law_id !== id) {
          var start = hfFindStart_(ds, id); if (start < 0) return fail_('NOT_FOUND', 'ไม่พบกฎหมายฉบับนี้ในแหล่งข้อมูลล่าสุด');
          rows = hfRows_(ds, 'articles', start, Math.min(n + 200, 4000)).filter(function (x) { return x.law_id === id; });
        }
        srcUrl = rows[0] && rows[0].source_url || '';
        arts3 = rows.map(function (x) {
          var no = String(x.article_number || x.title || '').trim(), body = String(x.text || '');
          if (no && body.trim().indexOf(no) === 0) body = body.trim().slice(no.length);
          body = body.replace(/^\s*[.:–-]\s*/, '');
          var cap = ''; var cm = body.match(/^\s*[-–.:]?\s*\(([^)]{2,80})\)\s*\n/); if (cm) { cap = '(' + cm[1] + ')'; body = body.slice(cm[0].length); }
          return { no: no, cap: cap, head: '', paras: splitParas_(body) };
        });
      } else {
        var lr = hfRows_(ds, 'laws', off, 1)[0] || {};
        if (lr.id !== id) return fail_('MISMATCH', 'ข้อมูลต้นทางมีการปรับปรุง กรุณาโหลดหน้าใหม่');
        title = lr.title || title; srcUrl = lr.source_url || '';
        arts3 = splitArticles_(lr.text || '', cfgC.art);
      }
      out = { country: cc, id: id, title: title, updated: p.date || '', status: p.status || '', heads: headsOf_(arts3), articles: arts3, source: (man.countries[cc].source || {}).name || ds, sourceUrl: srcUrl, lang: '' };
    }
  } catch (err) {
    logError_('foreign.v5', err, cc + ':' + id);
    return fail_('UPSTREAM', 'แหล่งข้อมูลตอบสนองช้าชั่วคราว ระบบจะลองใหม่อัตโนมัติ กรุณากดเปิดอีกครั้งในอีกสักครู่');
  }
  if (!out.articles.length) out.articles = [{ no: '', cap: '', head: '', paras: [{ n: '', s: 'ฉบับนี้เป็นเอกสารที่ไม่ได้แบ่งเป็นมาตรา', items: [] }] }];
  cachePutBig_(key, out, 21600);
  return out;
}
/* หาตำแหน่งแรกของกฎหมายด้วยการค้นหาแบบแบ่งครึ่ง (ข้อมูลเรียงตาม law_id) — ใช้เมื่อชุดข้อมูลต้นทางปรับปรุงแล้วตำแหน่งเลื่อน */
function hfFindStart_(ds, id) {
  var c = CacheService.getScriptCache(), k = 'hfs_' + sha256Hex_(ds + id).slice(0, 20), h = c.get(k);
  if (h) return Number(h);
  var tot = JSON.parse(UrlFetchApp.fetch(hfRowsUrl_(ds, 'articles', 0, 1), { headers: hfHeaders_() }).getContentText()).num_rows_total;
  var lo = 0, hi = tot - 1, steps = 0;
  while (lo < hi && steps < 24) {
    var mid = Math.floor((lo + hi) / 2), v = hfRows_(ds, 'articles', mid, 1)[0].law_id; steps++;
    if (v < id) lo = mid + 1; else hi = mid;
  }
  var first = hfRows_(ds, 'articles', lo, 1)[0];
  var res = first && first.law_id === id ? lo : -1;
  c.put(k, String(res), 21600);
  return res;
}

function apiForeignCountriesV5_() {
  var base = apiForeignCountries_(), man = fgnManifest_(), counts = foreignCounts_();
  var list = base.countries.map(function (c) {
    var m = man.countries[c.code];
    if (c.code === 'JP') return Object.assign(c, { sections: null, dataset: 'e-Gov' });
    if (!m) return c;
    var f = FGN_V5[c.code] || {};
    return Object.assign(c, { count: m.laws, sections: m.sections, ready: true, note: '', source: (m.source || {}).name || '', license: (m.source || {}).license || '', urls: f.urls || c.urls, index: dbBase_() + 'foreign/' + c.code + '.json.gz', krApi: c.code === 'KR' && !!PropertiesService.getScriptProperties().getProperty('KOREA_OC') });
  });
  return { thai: base.thai, thai2: man.thai2 ? { laws: man.thai2.laws, sections: man.thai2.sections, types: man.thai2.types, index: dbBase_() + 'thai2/index.json.gz' } : null, countries: list, built: man.built || '' };
}
function apiPublicStatsV5_() {
  var s = apiPublicStats_(), man = fgnManifest_();
  s.thai2 = man.thai2 ? { laws: man.thai2.laws, sections: man.thai2.sections } : null;
  s.thaiTotal = s.laws + (man.thai2 ? man.thai2.laws : 0);
  s.thaiSectionsTotal = s.sections + (man.thai2 ? man.thai2.sections : 0);
  s.foreignDetail = {};
  Object.keys(man.countries || {}).forEach(function (k) { s.foreignDetail[k] = { laws: man.countries[k].laws, sections: man.countries[k].sections }; });
  if (s.foreign && s.foreign.JP) s.foreignDetail.JP = { laws: s.foreign.JP, sections: null };
  return s;
}

/* อัปเกรดระบบที่ติดตั้งไว้แล้ว (ข้อมูลเดิมทุกแถวคงอยู่ครบ): เพิ่มหัวคอลัมน์ใหม่ต่อท้าย ย้ายค่าตั้งค่า และติดตั้งตัวตั้งเวลา */
function upgradeV5_() {
  try { ensureHeaders_(); } catch (e) { logError_('upgrade.headers', e, ''); }
  try { migrateV4_(); } catch (e) { logError_('upgrade.migrate', e, ''); }
  try { installTriggers_(); } catch (e) { logError_('upgrade.triggers', e, ''); }
  try { ScriptApp.newTrigger('formatWorkbook').timeBased().after(2 * 60 * 1000).create(); } catch (e) { logError_('upgrade.format', e, ''); }
  CacheService.getScriptCache().removeAll(['cfg', 'pubstats', 'fman5', 'fcounts']);
  PropertiesService.getScriptProperties().setProperty('INIT_DONE', CONFIG.VERSION);
  audit_('', 'system.upgrade', 'อัปเกรดเป็นเวอร์ชัน ' + CONFIG.VERSION + ' (ข้อมูลสมาชิกเดิมคงอยู่ครบ)');
}
