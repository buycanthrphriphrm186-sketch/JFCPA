
/* =========================================================================
 *  LAW IMPORTER — นำเข้าตัวบทกฎหมายไทยครบทุกมาตรา จากแหล่งข้อมูลเปิดที่ใช้ได้ถูกกฎหมาย
 *
 *  ตัวบทกฎหมายไทยไม่มีลิขสิทธิ์ (พ.ร.บ.ลิขสิทธิ์ พ.ศ. 2537 มาตรา 7) จึงนำมาเผยแพร่ได้
 *  ระบบดึงจากชุดข้อมูลเปิดผ่าน API สาธารณะที่มีเอกสารรองรับ (Hugging Face datasets-server)
 *  ถ้าแหล่งใดเชื่อมต่อไม่ได้ จะสลับไปแหล่งถัดไปในรายการอัตโนมัติ (failover)
 *  รายชื่อแหล่งแก้ไขได้ที่ Script Property LAW_DATASETS (คั่นด้วยจุลภาค)
 *
 *  การทำงาน: ทุก 10 นาทีนำเข้าเป็นชุด (ไม่เกิน ~4.5 นาทีต่อรอบ ตามข้อจำกัด Apps Script)
 *  และจำตำแหน่งล่าสุดไว้ เมื่อครบทั้งชุดข้อมูลจะเริ่มรอบตรวจการแก้ไขใหม่ทุก 7 วัน
 *  ดูความคืบหน้าได้ที่ชีต Config คีย์ IMPORT_STATUS
 * ========================================================================= */

var DEFAULT_LAW_DATASETS = ['pythainlp/thailaw-v1.0', 'pythainlp/thailaw'];
var HF_API = 'https://datasets-server.huggingface.co';

var CAT_RULES = [
  [/^(รัฐธรรมนูญ|ธรรมนูญการปกครอง|พระราชบัญญัติธรรมนูญการปกครอง)/, 'รัฐธรรมนูญ'],
  [/^พระราชบัญญัติประกอบรัฐธรรมนูญ/, 'พระราชบัญญัติประกอบรัฐธรรมนูญ'],
  [/^(ประมวลกฎหมาย|ประมวลรัษฎากร)/, 'ประมวลกฎหมาย'],
  [/^(ประกาศของคณะปฏิวัติ|ประกาศคณะปฏิวัติ|คำสั่งคณะปฏิวัติ|ประกาศคณะปฏิรูป|คำสั่งคณะปฏิรูป|ประกาศของคณะปฏิรูป|ประกาศคณะรักษาความสงบ|คำสั่งหัวหน้าคณะรักษาความสงบ|คำสั่งคณะรักษาความสงบ|ประกาศคณะมนตรีความมั่นคง|ประกาศคณะรัฐประหาร)/, 'ปร./ปว./คปค./คสช.'],
  [/^(พระราชบัญญัติ|พระราชกำหนด)/, 'พระราชบัญญัติ/พระราชกำหนด']
];

function lawCategory_(title) {
  var t = String(title || '').replace(/[​‌‍﻿]/g, '').replace(/^\s+/, '');
  for (var i = 0; i < CAT_RULES.length; i++) if (CAT_RULES[i][0].test(t)) return CAT_RULES[i][1];
  return null;
}

function thaiNum_(s) { return String(s || '').replace(/[๐-๙]/g, function (d) { return String('๐๑๒๓๔๕๖๗๘๙'.indexOf(d)); }); }

/**
 * แยกตัวบททั้งฉบับเป็นรายมาตรา
 * ชื่อมาตรา (popularName) ใช้ชื่อหมวด/ส่วน/ลักษณะที่มาตรานั้นสังกัดตามตัวบทจริง จึงเกี่ยวข้องกับเนื้อหาเสมอ
 * และถ้ามีชื่อที่นิยมในวงวิชาการอยู่แล้ว (ชีต Sections เดิม) ระบบจะคงชื่อเดิมไว้
 */
/** \u0e17\u0e33\u0e04\u0e27\u0e32\u0e21\u0e2a\u0e30\u0e2d\u0e32\u0e14\u0e02\u0e49\u0e2d\u0e04\u0e27\u0e32\u0e21\u0e17\u0e35\u0e48\u0e44\u0e14\u0e49\u0e08\u0e32\u0e01\u0e01\u0e32\u0e23\u0e41\u0e1b\u0e25\u0e07 PDF: \u0e2a\u0e23\u0e30\u0e2d\u0e33\u0e41\u0e22\u0e01\u0e2a\u0e48\u0e27\u0e19 (\u0e4d\u0e32), \u0e2d\u0e31\u0e01\u0e02\u0e23\u0e30\u0e2b\u0e25\u0e35\u0e01\u0e41\u0e1a\u0e1a Markdown, \u0e40\u0e2a\u0e49\u0e19\u0e04\u0e31\u0e48\u0e19 */
function cleanLawText_(s) {
  return String(s || '')
    .replace(/\u0e4d\u0e32/g, '\u0e33')
    .replace(/\u0e4d\s+\u0e32/g, '\u0e33')
    .replace(/\\([_\-*#\[\]().!])/g, '$1')
    .replace(/[_\-]{4,}/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

function parseSections_(text) {
  var src = cleanLawText_(text).replace(/\r/g, '').replace(/\u00a0/g, ' ');
  var re = /(^|\n)[ \t]*มาตรา[ \t]+([0-9๐-๙]+(?:\/[0-9๐-๙]+)?)((?:[ \t]*(?:ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|นว|ทศ)(?=[ \t\n]))?)[ \t]*/g;
  var marks = [], m;
  while ((m = re.exec(src))) marks.push({ idx: m.index + m[1].length, end: re.lastIndex, no: thaiNum_(m[2]) + (m[3] ? ' ' + m[3].trim() : '') });
  var HEAD = /^(ภาค|บรรพ|ลักษณะ|หมวด|ส่วนที่)[ \t]*[0-9๐-๙]+/;
  /* แยกหัวข้อ (หมวด/ส่วน/ลักษณะ + ชื่อหัวข้อบรรทัดถัดไป) ที่ท้ายข้อความออกจากเนื้อหา */
  function splitTail(chunk) {
    var lines = chunk.split('\n').map(function (l) { return l.replace(/\s+/g, ' ').trim(); }).filter(function (l) { return l; });
    var cut = -1;
    for (var k = lines.length - 1; k >= 0 && k >= lines.length - 8; k--) {
      if (HEAD.test(lines[k])) {
        var tail = lines.slice(k + 1);
        if (tail.every(function (t) { return t.length <= 90 && !/^\(/.test(t); }) && tail.length <= 2) cut = k;
        break;
      }
    }
    if (cut < 0) return { body: lines, head: '' };
    var rest = lines.slice(0, cut), head = lines.slice(cut).join(' ');
    /* หัวข้อซ้อน เช่น ลักษณะ 1 ภายใต้ บรรพ 1 — ใช้หัวข้อที่อยู่ใกล้มาตราที่สุด */
    return { body: rest, head: head };
  }
  var out = [], heading = '', seen = {};
  if (marks.length) {
    var pre = src.slice(0, marks[0].idx).split('\n').map(function (l) { return l.replace(/\s+/g, ' ').trim(); }).filter(String);
    for (var p = 0; p < pre.length; p++) if (HEAD.test(pre[p])) heading = pre[p] + (pre[p + 1] && !HEAD.test(pre[p + 1]) && pre[p + 1].length <= 90 ? ' ' + pre[p + 1] : '');
  }
  for (var i = 0; i < marks.length; i++) {
    var chunk = src.slice(marks[i].end, i + 1 < marks.length ? marks[i + 1].idx : src.length);
    var sp = splitTail(chunk);
    var body = sp.body.join('\n').trim();
    var name = heading || 'บทบัญญัติเบื้องต้น';
    if (sp.head) heading = sp.head;
    if (!body) continue;
    var key = marks[i].no;
    if (seen[key]) { key = key + '#' + (++seen[key]); } else seen[key] = 1;
    out.push({ no: key, name: name, text: body.slice(0, 45000) });
  }
  return out;
}

function pickField_(row, names) {
  for (var i = 0; i < names.length; i++) if (row[names[i]] !== undefined && row[names[i]] !== null && String(row[names[i]]).length) return String(row[names[i]]);
  var keys = Object.keys(row);
  for (var k = 0; k < keys.length; k++) if (typeof row[keys[k]] === 'string' && row[keys[k]].length > 200) return row[keys[k]];
  return '';
}

function hfJson_(url) {
  var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { 'User-Agent': 'ThaiLawLibrary/3.0 (educational, Google Apps Script)' } });
  if (r.getResponseCode() >= 400) throw new Error('HTTP ' + r.getResponseCode() + ' ' + url);
  return JSON.parse(r.getContentText('UTF-8'));
}

/** หา config/split ของชุดข้อมูล และตรวจสัญญาอนุญาตจาก dataset card */
function datasetInfo_(name) {
  var cache = CacheService.getScriptCache(), ck = 'dsinfo_' + name;
  var c = cache.get(ck); if (c) return JSON.parse(c);
  var sp = hfJson_(HF_API + '/splits?dataset=' + encodeURIComponent(name));
  var s = (sp.splits || [])[0];
  if (!s) throw new Error('ไม่พบ split ของชุดข้อมูล ' + name);
  var size = 0;
  try { var sz = hfJson_(HF_API + '/size?dataset=' + encodeURIComponent(name)); (sz.size && sz.size.splits || []).forEach(function (x) { if (x.config === s.config && x.split === s.split) size = x.num_rows; }); } catch (e) {}
  var license = '';
  try { var card = hfJson_('https://huggingface.co/api/datasets/' + encodeURIComponent(name).replace('%2F', '/')); license = (card.cardData && card.cardData.license) || ''; } catch (e) {}
  var info = { name: name, config: s.config, split: s.split, size: size, license: String(license) };
  cache.put(ck, JSON.stringify(info), 21600);
  return info;
}

function importStatus_(o) {
  setConfigValue_('IMPORT_STATUS', new Date().toISOString() + ' ' + JSON.stringify(o));
}

/* =========================================================================
 *  แหล่งหลัก: ฐานข้อมูลที่จัดเตรียมแล้ว (db/*.json.gz ใน GitHub ของโครงการ)
 *  รวมจาก 3 ชุดข้อมูลเปิด: NitiBench-statute (MIT, ตัวบทฉบับปรับปรุง),
 *  Open Law Data Thailand OCS-Krisdika (CC-BY-4.0, ข้อมูลต้นทางสำนักงานคณะกรรมการกฤษฎีกา),
 *  PyThaiNLP thailaw-v1.0 (CC0) — ระบุที่มาและสัญญาอนุญาตไว้ทุกฉบับ
 *  เปลี่ยนที่อยู่ได้ที่ Script Property DB_BASE_URL
 * ========================================================================= */
var DEFAULT_DB_BASE = 'https://raw.githubusercontent.com/buycanthrphriphrm186-sketch/JFCPA/claude/legal-ai-website-system-4h1org/thai-law-library/db/';

function dbBase_() { return PropertiesService.getScriptProperties().getProperty('DB_BASE_URL') || DEFAULT_DB_BASE; }

function fetchGzJson_(url) {
  var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  if (r.getResponseCode() >= 400) throw new Error('HTTP ' + r.getResponseCode() + ' ' + url);
  var blob = r.getBlob().setContentType('application/x-gzip');
  return JSON.parse(Utilities.ungzip(blob).getDataAsString('UTF-8'));
}

/** นำเข้าฐานข้อมูลจาก db/ เป็นชุด ๆ คืนค่า true เมื่อครบ หรือ throw เมื่อเชื่อมต่อไม่ได้ (ให้สลับไปแหล่งสำรอง) */
function importFromRepo_(state, started) {
  var base = dbBase_();
  var idxData = fetchGzJson_(base + 'index.json.gz');
  var ver = idxData.manifest.version;
  if (state.repoVer !== ver) { state.repoVer = ver; state.repoShard = 0; state.repoLawsDone = false; }
  var sh = sheet_('Sections'), lawSh = sheet_('Laws'), now = new Date().toISOString();
  if (!state.repoLawsDone) {
    var byId = {};
    rows_('Laws').forEach(function (l) { byId[String(l.lawId)] = l; });
    var newRows = [];
    idxData.laws.forEach(function (l) {
      var note = 'ที่มา: ' + l.source + ' (' + l.license + ')';
      var ex = byId[l.id];
      if (ex) updateRow_('Laws', ex._row, { category: l.cat, sourceUrl: l.url, status: l.status, updatedAt: now, note: note, year: ex.year || l.year });
      else newRows.push([l.id, l.cat, cell_(l.title), l.short || '', l.year || '', l.url, l.status, now, note]);
    });
    if (newRows.length) lawSh.getRange(lawSh.getLastRow() + 1, 1, newRows.length, 9).setNumberFormat('@').setValues(newRows);
    delete _rowsCache.Laws;
    state.repoLawsDone = true;
  }
  /* แผนที่ sectionId -> แถว เพื่ออัปเดตแทนการเพิ่มซ้ำ (อ่านคอลัมน์ A ครั้งเดียวต่อรอบ) */
  var last = sh.getLastRow(), rowOf = {};
  if (last > 1) sh.getRange(2, 1, last - 1, 1).getValues().forEach(function (v, i) { rowOf[String(v[0])] = i + 2; });
  while (state.repoShard < idxData.manifest.shards && Date.now() - started < 255000) {
    var shard = fetchGzJson_(base + 's' + ('00' + state.repoShard).slice(-3) + '.json.gz');
    var add = [], upd = [];
    shard.forEach(function (law) {
      law.s.forEach(function (s) {
        var id = law.id + '-' + s[0];
        var r = rowOf[id];
        /* มีอยู่แล้ว: ปรับตัวบทให้ตรงแหล่งข้อมูล แต่คงชื่อมาตราที่นิยมในวงวิชาการไว้ */
        if (r) upd.push([r, cell_(s[2])]);
        else add.push([id, law.id, s[0], cell_(s[1]), cell_(s[2]), '', '', now]);
      });
      CacheService.getScriptCache().remove('secs_' + law.id + '_n');
    });
    /* เขียนการปรับปรุงเป็นช่วงแถวต่อเนื่อง (เร็วกว่าเขียนทีละแถว) */
    upd.sort(function (a, b) { return a[0] - b[0]; });
    for (var u = 0; u < upd.length;) {
      var start = upd[u][0], vals = [];
      while (u < upd.length && upd[u][0] === start + vals.length) { vals.push(upd[u][1]); u++; }
      sh.getRange(start, 5, vals.length, 1).setValues(vals.map(function (t) { return [t]; }));
      sh.getRange(start, 8, vals.length, 1).setValues(vals.map(function () { return [now]; }));
    }
    for (var i = 0; i < add.length; i += 4000) {
      var chunk = add.slice(i, i + 4000);
      sh.getRange(sh.getLastRow() + 1, 1, chunk.length, 8).setNumberFormat('@').setValues(chunk);
    }
    state.sections = (state.sections || 0) + add.length;
    state.repoShard++;
  }
  delete _rowsCache.Sections;
  return { done: state.repoShard >= idxData.manifest.shards, manifest: idxData.manifest };
}

/** รันอัตโนมัติทุก 10 นาที (ติดตั้งโดย setup) — ปลอดภัยต่อการรันซ้ำ */
function importTick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return 'busy';
  var started = Date.now(), props = PropertiesService.getScriptProperties();
  try {
    /* 1) แหล่งหลัก: ฐานข้อมูลที่จัดเตรียมแล้ว */
    var rs = json_(props.getProperty('REPO_IMPORT_STATE'), {});
    var repoFresh = rs.done && Date.now() - (rs.finishedAt || 0) < 864e5;
    if (!repoFresh) {
      try {
        var res = importFromRepo_(rs, started);
        if (res.done) { rs.done = true; rs.finishedAt = Date.now(); } else rs.done = false;
        props.setProperty('REPO_IMPORT_STATE', JSON.stringify(rs));
        bumpCatalogVersion_();
        importStatus_({ ok: true, source: 'THAI LAW LIBRARY database (NitiBench MIT / Open Law Data Thailand CC-BY-4.0 / PyThaiNLP CC0)', version: rs.repoVer, shard: rs.repoShard, totalShards: res.manifest.shards, laws: res.manifest.laws, sectionsTotal: res.manifest.sections, done: !!rs.done });
        if (!rs.done) return 'repo ' + rs.repoShard + '/' + res.manifest.shards;
        return 'repo done';
      } catch (e) {
        logError_('import.repo', e, '');
        props.setProperty('REPO_IMPORT_STATE', JSON.stringify(rs));
        /* เชื่อมต่อแหล่งหลักไม่ได้: สลับไปแหล่งสำรอง (Hugging Face) ทันทีในรอบนี้ */
      }
    } else return 'up-to-date';
    /* 2) แหล่งสำรอง: ชุดข้อมูลเปิดบน Hugging Face */
    var state = json_(props.getProperty('IMPORT_STATE'), { ds: 0, offset: 0, done: false, finishedAt: 0, added: 0, sections: 0 });
    if (state.done) {
      if (Date.now() - state.finishedAt < 7 * 864e5) return 'up-to-date';
      state = { ds: 0, offset: 0, done: false, finishedAt: 0, added: 0, sections: 0, refresh: true };
    }
    var list = String(props.getProperty('LAW_DATASETS') || DEFAULT_LAW_DATASETS.join(',')).split(',').map(function (x) { return x.trim(); }).filter(String);
    var info = null, errors = [];
    while (state.ds < list.length && !info) {
      try { info = datasetInfo_(list[state.ds]); }
      catch (e) { errors.push(list[state.ds] + ': ' + e.message); logError_('import.dataset', e, ''); state.ds++; state.offset = 0; }
    }
    if (!info) { importStatus_({ ok: false, msg: 'เชื่อมต่อแหล่งข้อมูลกฎหมายไม่ได้ทุกแหล่ง จะลองใหม่รอบถัดไป', errors: errors }); state.ds = 0; props.setProperty('IMPORT_STATE', JSON.stringify(state)); return 'no-source'; }
    var idx = lawIndex_();
    var page = 50;
    while (Date.now() - started < 270000) {
      var url = HF_API + '/rows?dataset=' + encodeURIComponent(info.name) + '&config=' + encodeURIComponent(info.config) + '&split=' + encodeURIComponent(info.split) + '&offset=' + state.offset + '&length=' + page;
      var data;
      try { data = hfJson_(url); }
      catch (e) { logError_('import.rows', e, ''); importStatus_({ ok: false, msg: 'ดึงข้อมูลชุดที่ ' + state.offset + ' ไม่สำเร็จ จะลองใหม่รอบถัดไป', source: info.name }); break; }
      var rows = data.rows || [];
      if (!rows.length) { state.done = true; state.finishedAt = Date.now(); break; }
      rows.forEach(function (r) {
        var row = r.row || {};
        var title = pickField_(row, ['title', 'name', 'law_name', 'sysname']).replace(/\s+/g, ' ').trim();
        var text = pickField_(row, ['text', 'content', 'body', 'law_text']);
        var cat = lawCategory_(title);
        if (!title || !text || !cat) return;
        var res = upsertLaw_(idx, title, cat, text, info.name);
        state.added += res.newLaw ? 1 : 0; state.sections += res.sections;
      });
      state.offset += rows.length;
      if (info.size && state.offset >= info.size) { state.done = true; state.finishedAt = Date.now(); break; }
    }
    props.setProperty('IMPORT_STATE', JSON.stringify(state));
    bumpCatalogVersion_();
    importStatus_({ ok: true, source: info.name, license: info.license, offset: state.offset, total: info.size, lawsAdded: state.added, sectionsAdded: state.sections, done: state.done });
    return 'ok ' + state.offset;
  } finally { lock.releaseLock(); }
}

function lawIndex_() {
  var map = {};
  rows_('Laws').forEach(function (l) { map[String(l.title).replace(/\s+/g, '')] = { id: String(l.lawId), row: l._row, status: l.status }; });
  return map;
}

/** เพิ่มหรือปรับปรุงกฎหมายหนึ่งฉบับพร้อมทุกมาตรา */
function upsertLaw_(idx, title, cat, text, source) {
  var key = title.replace(/\s+/g, '');
  var now = new Date().toISOString();
  var rec = idx[key], newLaw = false;
  var yr = thaiNum_((title.match(/(?:พ\.ศ\.|พุทธศักราช)\s*([0-9๐-๙]{4})/) || [])[1] || '');
  var secs = parseSections_(text);
  if (!rec) {
    var id = 'L' + sha256Hex_(title).slice(0, 10);
    appendRow_('Laws', { lawId: id, category: cat, title: cell_(title), shortName: '', year: yr, sourceUrl: 'https://searchlaw.ocs.go.th/', status: secs.length ? 'มีตัวบทครบทุกมาตรา' : 'มีตัวบทฉบับเต็ม', updatedAt: now, note: 'นำเข้าจากชุดข้อมูลเปิด ' + source });
    rec = idx[key] = { id: id, row: sheet_('Laws').getLastRow(), status: 'มีตัวบทครบทุกมาตรา' };
    newLaw = true;
  }
  var sh = sheet_('Sections');
  var existing = {};
  var found = sh.getRange('B:B').createTextFinder(rec.id).matchEntireCell(true).findAll();
  var rowsIdx = found.map(function (r) { return r.getRow(); });
  if (rowsIdx.length) {
    var first = Math.min.apply(null, rowsIdx), last = Math.max.apply(null, rowsIdx);
    sh.getRange(first, 1, last - first + 1, 8).getValues().forEach(function (v, i) { if (String(v[1]) === rec.id) existing[String(v[2])] = { row: first + i, text: String(v[4]), name: String(v[3]) }; });
  }
  var add = [], changed = 0;
  if (!secs.length) secs = [{ no: 'ฉบับเต็ม', name: 'ตัวบทฉบับเต็ม', text: String(text).slice(0, 45000) }];
  secs.forEach(function (s) {
    var ex = existing[s.no];
    if (!ex) add.push([rec.id + '-' + s.no, rec.id, s.no, cell_(s.name), cell_(s.text), '', '', now]);
    else if (ex.text.replace(/\s+/g, '') !== s.text.replace(/\s+/g, '')) {
      sh.getRange(ex.row, 5, 1, 1).setValues([[cell_(s.text)]]); sh.getRange(ex.row, 8, 1, 1).setValues([[now]]); changed++;
    }
  });
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, 8).setNumberFormat('@').setValues(add);
  if (add.length || changed) {
    updateRow_('Laws', rec.row, { status: 'มีตัวบทครบทุกมาตรา', updatedAt: now });
    CacheService.getScriptCache().remove('secs_' + rec.id + '_n');
  }
  delete _rowsCache.Sections;
  return { newLaw: newLaw, sections: add.length };
}

/* ---------- API: ดึงมาตราตามกฎหมาย / ค้นหา / ตาม ID ---------- */

function sectionsOfLaw_(lawId) {
  var cache = CacheService.getScriptCache();
  var n = Number(cache.get('secs_' + lawId + '_n') || 0);
  if (n) {
    var keys = []; for (var i = 0; i < n; i++) keys.push('secs_' + lawId + '_' + i);
    var got = cache.getAll(keys);
    if (Object.keys(got).length === n) { var s = ''; for (var j = 0; j < n; j++) s += got['secs_' + lawId + '_' + j]; return JSON.parse(s); }
  }
  var sh = sheet_('Sections');
  var found = sh.getRange('B:B').createTextFinder(String(lawId)).matchEntireCell(true).findAll();
  var out = [];
  if (found.length) {
    var rowsIdx = found.map(function (r) { return r.getRow(); });
    var first = Math.min.apply(null, rowsIdx), last = Math.max.apply(null, rowsIdx);
    sh.getRange(first, 1, last - first + 1, 7).getValues().forEach(function (v) {
      if (String(v[1]) === String(lawId)) out.push({ id: String(v[0]), law: String(v[1]), no: String(v[2]), name: String(v[3]), text: String(v[4]), tags: String(v[5]) });
    });
  }
  var str = JSON.stringify(out), parts = [];
  for (var k = 0; k < str.length; k += 90000) parts.push(str.slice(k, k + 90000));
  if (parts.length <= 50) { var put = {}; parts.forEach(function (p, i) { put['secs_' + lawId + '_' + i] = p; }); try { cache.putAll(put, 21600); cache.put('secs_' + lawId + '_n', String(parts.length), 21600); } catch (e) {} }
  return out;
}

function apiGetSections_(p) {
  var law = String(p.law || '');
  if (!law) return fail_('INVALID', 'ไม่ได้ระบุกฎหมาย');
  return { law: law, sections: sectionsOfLaw_(law) };
}

function apiSectionsByIds_(p) {
  var ids = (p.ids || []).slice(0, 200).map(String), byLaw = {};
  ids.forEach(function (id) { var law = id.split('-')[0]; (byLaw[law] = byLaw[law] || {})[id] = 1; });
  var out = [];
  Object.keys(byLaw).slice(0, 30).forEach(function (law) { sectionsOfLaw_(law).forEach(function (s) { if (byLaw[law][s.id]) out.push(s); }); });
  return { sections: out };
}

/** ค้นหาข้อความภายในมาตราทั่วทั้งฐานข้อมูล (ใช้ TextFinder ของ Sheets ซึ่งเร็ว) */
function apiSearchSections_(p) {
  var q = String(p.q || '').trim();
  if (q.length < 2) return { sections: [] };
  var sh = sheet_('Sections'), last = sh.getLastRow();
  if (last < 2) return { sections: [] };
  var hits = sh.getRange(2, 3, last - 1, 3).createTextFinder(q).findAll().slice(0, 300);
  var rowsSet = {}; hits.forEach(function (r) { rowsSet[r.getRow()] = 1; });
  var lawCat = {};
  if (p.cat) rows_('Laws').forEach(function (l) { lawCat[String(l.lawId)] = l.category; });
  var out = [];
  Object.keys(rowsSet).slice(0, 120).forEach(function (r) {
    var v = sh.getRange(Number(r), 1, 1, 6).getValues()[0];
    if (p.cat && lawCat[String(v[1])] !== p.cat) return;
    out.push({ id: String(v[0]), law: String(v[1]), no: String(v[2]), name: String(v[3]), text: String(v[4]), tags: String(v[5]) });
  });
  return { sections: out.slice(0, 60) };
}
