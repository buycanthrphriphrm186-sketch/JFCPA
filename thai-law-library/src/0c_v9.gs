
/* =========================================================================
 *  VERSION 9 — กฎหมายต่างประเทศ 197 ประเทศ (เพิ่มสหรัฐอเมริกา ไนจีเรีย บราซิล ปาเลา ไต้หวัน คอซอวอ),
 *  ทำความสะอาดตัวบทที่เป็นโค้ด HTML, แปลภาษา 6 ภาษา, ค้นหาคำพิพากษาด้วยคำสำคัญ (ดัชนีของเว็บไซต์เอง),
 *  อนุสัญญาและสนธิสัญญารายประเทศ, พจนานุกรมภาษาไทย (ราชบัณฑิตยสภา)
 *  (เพิ่มต่อจากระบบเดิม ไม่ลบข้อมูลเดิม — ฟังก์ชันที่ประกาศซ้ำในไฟล์นี้จะใช้แทนของเดิม)
 * ========================================================================= */
CONFIG.VERSION = '9.0.0';

/* ---------------------- ทำความสะอาดตัวบทจากแหล่งต้นทาง ----------------------
 * บางรายการในชุดข้อมูลต้นทางเก็บเป็นหน้าเว็บ (HTML) หรือข้อความที่ escape ไว้ จึงแสดงเป็นโค้ด
 * แปลงเป็นข้อความตามภาษาต้นฉบับ (ไม่แปล ไม่ตัดเนื้อหา) */
function decodeEntities_(t) {
  return String(t).replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(Number(n)); })
    .replace(/&#x([0-9a-f]+);/gi, function (m, n) { return String.fromCharCode(parseInt(n, 16)); })
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
}
function cleanSourceText_(t) {
  t = String(t === undefined || t === null ? '' : t);
  if (/<\s*(html|body|div|p|span|br|table|td|li|a|font|strong)\b/i.test(t)) {
    t = t.replace(/<(script|style|noscript|head|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<\s*(br|\/p|\/div|\/li|\/tr|\/h[1-6])\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/@import\s+url\([^)]*\)\s*[^;\n]*;?/gi, ' ')
      .replace(/[^{}\n]{0,300}\{[^{}]{0,3000}\}/g, function (m) { return /[:;]/.test(m) && !/[ก-๙ກ-ໝ]{6,}/.test(m) ? ' ' : m; });
  }
  if (/&(#\d+|#x[0-9a-f]+|[a-z]+);/i.test(t)) t = decodeEntities_(t);
  if (/\\u[0-9a-fA-F]{4}/.test(t)) t = t.replace(/\\u([0-9a-fA-F]{4})/g, function (m, h) { return String.fromCharCode(parseInt(h, 16)); });
  return t.replace(/[ \t ]+/g, ' ').replace(/ *\n[ \n]*/g, '\n').trim();
}
function isBinaryText_(t) { return /^(%PDF|GIF8|PK\u0003|\u0089PNG)/.test(String(t || '').slice(0, 8)); }
function cleanArticles_(out) {
  if (!out || !out.articles) return out;
  out.articles.forEach(function (a) {
    var joined = (a.paras || []).map(function (p) { return [p.s].concat((p.items || []).map(function (i) { return i.s || i; })).join('\n'); }).join('\n');
    if (/<\s*(html|body|div|p|span|br)\b|&(#\d+|nbsp|amp);|\\u[0-9a-fA-F]{4}/i.test(joined)) a.paras = splitParas_(cleanSourceText_(joined));
    if (isBinaryText_(joined)) a.paras = [{ n: '', s: 'ต้นฉบับรายการนี้เป็นไฟล์เอกสาร (PDF) ซึ่งแหล่งข้อมูลไม่ได้แปลงเป็นข้อความ กรุณาเปิดจากลิงก์แหล่งต้นทาง', items: [] }];
  });
  out.title = cleanSourceText_(out.title);
  return out;
}

/* ---------------------- อ่านกฎหมายต่างประเทศ ---------------------- */
function hfRowsMulti_(ds, cfg, ranges) {
  var reqs = [];
  ranges.forEach(function (r) { for (var o = r[0]; o < r[0] + r[1]; o += 100) reqs.push({ url: 'https://datasets-server.huggingface.co/rows?dataset=' + encodeURIComponent(ds) + '&config=' + encodeURIComponent(cfg) + '&split=train&offset=' + o + '&length=' + Math.min(100, r[0] + r[1] - o), muteHttpExceptions: true, headers: hfHeaders_() }); });
  var rows = [];
  for (var i = 0; i < reqs.length; i += 25) {
    UrlFetchApp.fetchAll(reqs.slice(i, i + 25)).forEach(function (res) {
      if (res.getResponseCode() !== 200) throw new Error('HF ' + res.getResponseCode());
      (JSON.parse(res.getContentText('UTF-8')).rows || []).forEach(function (x) { rows.push(x.row); });
    });
  }
  return rows;
}
function hfHeaders_() { var t = PropertiesService.getScriptProperties().getProperty('HF_TOKEN'); return t ? { Authorization: 'Bearer ' + t } : {}; }
function apiForeignLawV9_(p) {
  var cc = String(p.country || ''), e = p.entry || {}, kind = String(e.k || '');
  var w = worldManifest_(), info = w.countries[cc];
  var id = String(p.id || '').slice(0, 200);
  if (kind === 'u' || kind === 's') {
    if (!info || !id) return fail_('INVALID', 'ข้อมูลกฎหมายไม่ครบถ้วน');
    var key = 'fl9_' + cc + '_' + sha256Hex_(id).slice(0, 24), hit = cacheGetBig_(key);
    if (hit) return hit;
    var arts = [], title = p.title || '', src = '', out;
    try {
      if (kind === 'u') {
        var ranges = (Array.isArray(e.o) ? e.o : [[Number(e.o) || 0, Number(e.n) || 0]]).slice(0, 120).map(function (r) { return [Math.max(0, Math.floor(r[0])), Math.max(0, Math.min(2500, Math.floor(r[1])))]; });
        var rows = hfRowsMulti_(info.dataset, info.acfg || 'current', ranges);
        arts = rows.map(function (x) {
          var no = String(x.num || '').replace(/\.$/, '').trim(), body = String(x.text || '');
          if (no && body.indexOf(no) === 0) body = body.slice(no.length).replace(/^\.?\s*/, '');
          return { no: no, cap: String(x.heading || ''), head: '', repealed: /repeal|omitted|transferred/i.test(String(x.status || '')), paras: splitParas_(cleanSourceText_(body), true) };
        });
        src = 'https://uscode.house.gov/';
      } else {
        var shard = fetchGzJson_(dbBase_() + 'world/text/' + cc + '/' + ('00' + Math.floor(Number(e.o) || 0)).slice(-3) + '.json.gz');
        var rec = shard.filter(function (x) { return x.id === id; })[0];
        if (!rec) return fail_('NOT_FOUND', 'ไม่พบตัวบทของกฎหมายฉบับนี้ในฐานข้อมูล');
        if (rec.a) arts = rec.a.map(function (x) { var no = String(x[0] || '').trim(), body = String(x[1] || ''); if (no && body.trim().indexOf(no) === 0) body = body.trim().slice(no.length).replace(/^\s*[.:–-]?\s*/, ''); return { no: no, cap: '', head: '', paras: splitParas_(body, true) }; });
        else arts = splitArticles_(rec.t || '', (FGN_V5[cc] && FGN_V5[cc].art) || GENERIC_ART);
      }
    } catch (err) { logError_('foreign.v9', err, cc + ':' + id); return fail_('UPSTREAM', 'แหล่งข้อมูลตอบสนองช้าชั่วคราว กรุณากดเปิดอีกครั้งในอีกสักครู่'); }
    if (!arts.length) arts = [{ no: '', cap: '', head: '', paras: [{ n: '', s: '—', items: [] }] }];
    out = cleanArticles_({ country: cc, id: id, title: title, updated: p.date || '', repealed: !!p.repealed, heads: headsOf_(arts), articles: arts,
      source: (kind === 'u' ? 'United States Code — Office of the Law Revision Counsel (uscode.house.gov) ผ่านชุดข้อมูลเปิด ' : 'ชุดข้อมูลเปิด ') + info.dataset, sourceUrl: src, license: info.license || '' });
    cachePutBig_(key, out, 21600);
    return out;
  }
  var r = apiForeignLawV6_(p);
  return r && r.ok === false ? r : cleanArticles_(r);
}
ROUTES.foreignLaw.fn = apiForeignLawV9_;

/* ---------------------- แปลภาษา (Google แปลภาษาในตัวของ Apps Script) ----------------------
 * ภาษาที่รองรับ: ไทย อังกฤษ ญี่ปุ่น จีน เกาหลี สเปน — แปลเฉพาะข้อความที่ผู้ใช้เปิดอ่าน เก็บผลไว้ 6 ชั่วโมง */
var TR_LANGS = { th: 'ไทย', en: 'English', ja: '日本語', 'zh-CN': '中文', ko: '한국어', es: 'Español' };
function apiTranslate_(p) {
  var to = String(p.to || ''); if (!TR_LANGS[to]) return fail_('INVALID', 'ไม่รองรับภาษานี้');
  var texts = (Array.isArray(p.texts) ? p.texts : []).slice(0, 60).map(function (t) { return String(t || '').slice(0, 5000); });
  var c = CacheService.getScriptCache(), out = new Array(texts.length), miss = [];
  var keys = texts.map(function (t) { return 'tr9_' + to + '_' + sha256Hex_(t).slice(0, 32); });
  var got = keys.length ? c.getAll(keys) : {};
  texts.forEach(function (t, i) { if (!t.trim()) out[i] = t; else if (got[keys[i]] !== undefined && got[keys[i]] !== null) out[i] = got[keys[i]]; else miss.push(i); });
  var put = {}, budget = 0;
  for (var k = 0; k < miss.length; k++) {
    var i = miss[k];
    if (budget > 60000) { out[i] = null; continue; }
    try { out[i] = LanguageApp.translate(texts[i], '', to); budget += texts[i].length; if (out[i].length < 90000) put[keys[i]] = out[i]; }
    catch (e) { out[i] = null; logError_('translate', e, ''); }
  }
  try { if (Object.keys(put).length) c.putAll(put, 21600); } catch (e) {}
  return { to: to, texts: out, note: 'แปลโดยเครื่อง (Google แปลภาษา) เพื่อประกอบการศึกษาเท่านั้น ตัวบทภาษาต้นฉบับเป็นฉบับที่ใช้อ้างอิงทางกฎหมาย' };
}
ROUTES.translate = { fn: apiTranslate_, auth: true, limit: 120 };

/* ---------------------- คำพิพากษาศาลฎีกา: ค้นหาด้วยคำสำคัญ ----------------------
 * ใช้ดัชนีคำของเว็บไซต์เอง (db/deka/kw) — ตัดคำด้วย PyThaiNLP จากย่อสั้นและส่วนต้นของคำพิพากษา
 * รองรับคำที่ใกล้เคียง (เช่น ฉ้อฉล → กลฉ้อฉล, การฉ้อฉล) และหลายคำพร้อมกัน */
function dekaVocab_() {
  var hit = cacheGetBig_('dkv9'); if (hit) return hit;
  var j = fetchGzJson_(dbBase_() + 'deka/kw/vocab.json.gz');
  try { cachePutBig_('dkv9', j, 21600); } catch (e) {}
  return j;
}
function dekaPostings_(term, sh) {
  var key = 'dkp9_' + sha256Hex_(term).slice(0, 24), c = CacheService.getScriptCache(), hit = c.get(key);
  if (hit) return JSON.parse(hit);
  var shard = fetchGzJson_(dbBase_() + 'deka/kw/p' + ('0' + sh).slice(-2) + '.json.gz'), enc = shard[term] || '';
  var rows = [], prev = -1;
  enc.split(',').forEach(function (d) { if (d) { prev += parseInt(d, 16); rows.push(prev); } });
  try { c.put(key, JSON.stringify(rows), 21600); } catch (e) {}
  return rows;
}
var DK_PREFIX = ['การ', 'กล', 'ความ', 'ผู้', 'ข้อ', 'โดย'];
function dekaTerms_(q, V) {
  q = String(q || '').toLowerCase().replace(/[“”"'(),.]/g, ' ').trim();
  var parts = q.split(/\s+/).filter(Boolean), terms = [];
  parts.forEach(function (w) {
    var group = [];
    if (V[w]) {
      group.push(w);
      DK_PREFIX.forEach(function (pf) { if (V[pf + w]) group.push(pf + w); });
    } else {
      // ไม่พบคำตรงตัว: แยกเป็นคำย่อยที่ยาวที่สุดจากซ้ายไปขวา แล้วเพิ่มคำที่มีคำนั้นอยู่ (ใกล้เคียง)
      Object.keys(V).forEach(function (t) { if (group.length < 12 && t.indexOf(w) > -1) group.push(t); });
      if (group.length) { terms.push(group.sort(function (x, y) { return V[y][1] - V[x][1]; })); return; }
      var i = 0, found = [];
      while (i < w.length) { var best = ''; for (var j = Math.min(w.length, i + 30); j > i + 1; j--) { if (V[w.slice(i, j)]) { best = w.slice(i, j); break; } } if (best) { found.push(best); i += best.length; } else i++; }
      if (found.length && found.join('').length >= w.length * 0.6) { found.forEach(function (f) { terms.push([f]); }); return; }
    }
    if (group.length) terms.push(group);
  });
  return terms;
}
function apiDekaKeyword_(p) {
  var q = String(p.q || '').trim().slice(0, 120); if (q.length < 2) return { rows: [], total: 0, terms: [] };
  var key = 'dkq9_' + sha256Hex_(q).slice(0, 24), c = CacheService.getScriptCache(), hit = c.get(key);
  if (hit) return JSON.parse(hit);
  var VJ = dekaVocab_(), V = VJ.v, groups = dekaTerms_(q, V);
  if (!groups.length) return { rows: [], total: 0, terms: [], exact: false };
  var sets = groups.map(function (g) { var s = {}; g.forEach(function (t) { dekaPostings_(t, V[t][0]).forEach(function (r) { s[r] = 1; }); }); return s; });
  var score = {};
  sets.forEach(function (s) { Object.keys(s).forEach(function (r) { score[r] = (score[r] || 0) + 1; }); });
  var all = Object.keys(score).map(Number), exact = all.filter(function (r) { return score[r] === sets.length; });
  var list = (exact.length ? exact : all).sort(function (a, b) { return (score[b] - score[a]) || (b - a); });
  var out = { rows: list.slice(0, 3000), total: list.length, exact: exact.length > 0 || sets.length === 1, terms: groups.map(function (g) { return g.slice(0, 6); }) };
  try { c.put(key, JSON.stringify(out), 21600); } catch (e) {}
  return out;
}
/** จำนวนคำพิพากษาล่าสุดจากแหล่งข้อมูล (ตรวจทุกครั้งที่กดรีเฟรช) */
function apiDekaRefresh_() {
  var man = dekaManifest_() || {}, total = Number(man.total || 0), live = null, checked = new Date().toISOString();
  try {
    var r = UrlFetchApp.fetch('https://datasets-server.huggingface.co/size?dataset=korakot/deka-bulk', { muteHttpExceptions: true, headers: hfHeaders_() });
    if (r.getResponseCode() === 200) { var j = JSON.parse(r.getContentText()); live = Number(((j.size || {}).dataset || {}).num_rows || 0) || null; }
  } catch (e) {}
  return { total: total, live: live, newer: live && live > total ? live - total : 0, checked: checked, source: 'korakot/deka-bulk (ข้อมูลจาก deka.supremecourt.or.th)' };
}
ROUTES.dekaKeyword = { fn: apiDekaKeyword_, auth: true, limit: 60 };
ROUTES.dekaRefresh = { fn: apiDekaRefresh_, auth: true, limit: 20 };

/* ---------------------- อนุสัญญาและสนธิสัญญาทั่วโลก (ข้อมูลจาก Wikidata — CC0) ---------------------- */
function treatyIndex9_() {
  var hit = cacheGetBig_('trx9'); if (hit) return hit;
  var j = fetchGzJson_(dbBase_() + 'treaties/index.json.gz');
  try { cachePutBig_('trx9', j, 21600); } catch (e) {}
  return j;
}
function apiTreatyCountries9_() {
  var j = treatyIndex9_();
  return { built: j.built, source: j.source, total: j.total, counts: j.counts, types: j.types };
}
function apiTreatiesOf9_(p) {
  var cc = String(p.cc || '').toUpperCase().slice(0, 2), j = treatyIndex9_();
  var ids = (j.byCountry || {})[cc] || [];
  return { cc: cc, items: ids.map(function (i) { var t = j.treaties[i]; return t ? { id: i, en: t[0], th: t[1], type: t[2], date: t[3], ended: t[4], cls: t[5], n: t[6] } : null; }).filter(Boolean), source: j.source };
}
ROUTES.treatyCountries9 = { fn: apiTreatyCountries9_, limit: 60 };
ROUTES.treatiesOf9 = { fn: apiTreatiesOf9_, auth: true, limit: 120 };

/* ---------------------- พจนานุกรมภาษาไทย (ฉบับราชบัณฑิตยสถาน) ----------------------
 * ค้นทีละคำตามที่ผู้ใช้พิมพ์ (ไม่ดึงข้อมูลจำนวนมาก) และเก็บผลไว้ 7 วัน */
function apiDictTh_(p) {
  var w = String(p.q || '').trim().slice(0, 60); if (!w) return { word: '', items: [] };
  var key = 'dct9_' + sha256Hex_(w).slice(0, 24), c = CacheService.getScriptCache(), hit = c.get(key);
  if (hit) return JSON.parse(hit);
  var html = '';
  for (var i = 0; i < 2 && !html; i++) {
    try {
      var r = UrlFetchApp.fetch('https://dictionary.orst.go.th/func_lookup.php', { method: 'post', payload: { word: w, funcName: 'lookupWord', status: 'lookup' }, muteHttpExceptions: true });
      if (r.getResponseCode() === 200) html = r.getContentText('UTF-8');
    } catch (e) { Utilities.sleep(600); }
  }
  if (!html) return { word: w, items: [], unavailable: true };
  var text = cleanSourceText_(html.replace(/<\/?(b|strong)>/gi, ''));
  text = text.replace(/^\s*ผลการค้นหา\s*"[^"]*"\s*/, '');
  var items = [], blocks = text.split(/\n(?=\S[^\n]{0,60}\n\s*\()|\n{2,}/).map(function (s) { return s.trim(); }).filter(Boolean);
  if (!blocks.length && text) blocks = [text];
  blocks.slice(0, 20).forEach(function (b) { var lines = b.split('\n'); items.push({ head: lines[0].slice(0, 120), body: lines.slice(1).join('\n').slice(0, 4000) || '' }); });
  var out = { word: w, items: items, notFound: /ไม่พบ/.test(text) && items.length <= 1, source: 'พจนานุกรมฉบับราชบัณฑิตยสถาน (dictionary.orst.go.th)' };
  try { c.put(key, JSON.stringify(out), 604800); } catch (e) {}
  return out;
}
ROUTES.dictTh = { fn: apiDictTh_, auth: true, limit: 120 };
