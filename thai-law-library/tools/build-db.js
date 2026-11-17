// Build THAI LAW LIBRARY database shards from open datasets.
// Sources (priority): NitiBench-statute (MIT, consolidated) > Open Law Data Thailand OCS-Krisdika (CC-BY-4.0) > PyThaiNLP thailaw-v1.0 (CC0)
const fs = require('fs'), vm = require('vm'), zlib = require('zlib'), crypto = require('crypto'), readline = require('readline');
const SRC = '/home/user/JFCPA/thai-law-library/Code.gs';
const OUT = process.argv[2] || '/home/user/JFCPA/thai-law-library/db';
const ctx = { Utilities: {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(SRC, 'utf8') + ';this.L={cleanLawText_,parseSections_,lawCategory_,thaiNum_,LAW_SEED,SECTION_SEED};', ctx);
const { cleanLawText_, parseSections_, lawCategory_, thaiNum_, LAW_SEED, SECTION_SEED } = ctx.L;

const Z = s => String(s || '').replace(/[​‌‍﻿]/g, '').replace(/\s+/g, ' ').trim();
const ZL = s => String(s || '').replace(/[​‌‍﻿]/g, '').replace(/\r/g, '').replace(/[ \t\u00a0]+/g, ' ').replace(/ *\n+ */g, '\n').trim(); /* คงการขึ้นบรรทัด (วรรค/อนุมาตรา) */
const key = t => thaiNum_(Z(t)).replace(/\(ยกเลิก\)/g, '').replace(/\s+/g, '').replace(/[“”"]/g, '');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const HEADRE = /^(ภาค|บรรพ|ลักษณะ|หมวด|ส่วนที่|บทเฉพาะกาล|บทกำหนดโทษ)/;

const seedByKey = {}; LAW_SEED.forEach(l => { seedByKey[key(l.title)] = l; });
const seedNames = {}; SECTION_SEED.forEach(s => { seedNames[s[0] + '|' + s[1]] = s[2]; });

function snippet(text) {
  const t = Z(text).replace(/^\(?\d+\)?\s*/, '');
  if (t.length <= 42) return t;
  const cut = t.slice(0, 48); const sp = cut.lastIndexOf(' ');
  return (sp > 20 ? cut.slice(0, sp) : cut.slice(0, 42)) + '…';
}
/* ลำดับมาตราต้องเพิ่มขึ้นเสมอ: ตัดส่วนนำหน้า (พระราชบัญญัติให้ใช้ประมวลฯ) และมาตราของกฎหมายแก้ไขเพิ่มเติมที่ต่อท้าย */
const SUF = { '': 0, 'ทวิ': 0.2, 'ตรี': 0.3, 'จัตวา': 0.4, 'เบญจ': 0.5, 'ฉ': 0.6, 'สัตต': 0.7, 'อัฏฐ': 0.8, 'นว': 0.9, 'ทศ': 0.95 };
function secVal(no) {
  const m = String(no).match(/^(\d+)(?:\/(\d+))?(?:\s*(\S+))?/); if (!m) return null;
  return Number(m[1]) * 1000 + (m[2] ? Number(m[2]) : 0) + (SUF[m[3] || ''] || 0);
}
function cleanSeq(secs) {
  secs = secs.map(s => Object.assign({}, s, { no: String(s.no).replace(/#\d+$/, '') }));
  // ส่วนนำหน้า: มาตรา 1.. ของพระราชบัญญัติประกาศใช้ แล้วเริ่มนับ 1 ใหม่ (สั้น ไม่เกิน 15 มาตรา)
  const restart = secs.findIndex((s, i) => i > 0 && secVal(s.no) === 1000);
  if (restart > 0 && restart <= 15) secs = secs.slice(restart);
  const out = []; let max = -1; const seen = {};
  for (const s of secs) {
    const v = secVal(s.no);
    if (v === null) { if (!out.length) out.push(s); continue; }
    if (v <= max || seen[s.no]) continue; // มาตราซ้ำหรือย้อนลำดับ = ของกฎหมายแก้ไขเพิ่มเติมที่ต่อท้าย
    seen[s.no] = 1; max = v; out.push(s);
  }
  return out;
}
const normT = s => String(s || '').replace(/[\s“”"(),.]/g, '');
function bigrams(t) { const o = new Set(); for (let i = 0; i < t.length - 1; i++) o.add(t.slice(i, i + 2)); return o; }
function seedFits(seedText, text) {
  const A = bigrams(normT(seedText).slice(0, 200)), B = bigrams(normT(text).slice(0, 260));
  let inter = 0; A.forEach(x => { if (B.has(x)) inter++; });
  return A.size > 0 && inter / A.size >= 0.6;
}
const seedTexts = {}; SECTION_SEED.forEach(s => { seedTexts[s[0] + '|' + s[1]] = s[3]; });

function yearOf(title) { return thaiNum_((Z(title).match(/(?:พ\.ศ\.|พุทธศักราช|พระพุทธศักราช)\s*([0-9๐-๙]{4})/) || [])[1] || ''); }

const laws = new Map(); // key -> {title,cat,year,source,license,url,status,secs:[{no,name,text}]}

async function lines(f, fn) { const rl = readline.createInterface({ input: fs.createReadStream(f, 'utf8'), crlfDelay: Infinity }); for await (const l of rl) if (l.trim()) fn(JSON.parse(l)); }

(async () => {
  // ---------- OCS: choose newest timeline that has sections ----------
  const ocsBest = new Map(), ocsMaxTl = new Map(), ocsHeads = new Map();
  await lines('src_ocs.jsonl', r => {
    let title = Z(r.title);
    const cat = lawCategory_(title); if (!cat) return;
    if (cat === 'รัฐธรรมนูญ' && !yearOf(title) && r.date) title += ' พุทธศักราช ' + (Number(r.date.slice(0, 4)) + 543);
    const k = key(title), tl = Number(String(r.timeline).split('-').pop()) || 0;
    ocsMaxTl.set(k, Math.max(ocsMaxTl.get(k) || 0, tl));
    const S = (r.sections || []);
    const secMap = new Map(); const order = []; let head = '';
    const heads = {};
    S.forEach(x => {
      const ty = x.sectionTypeId, c = Z(x.content);
      if (ty === 4) {
        if (!secMap.has(x.sectionId)) { secMap.set(x.sectionId, { parts: [], head }); order.push(x.sectionId); }
        secMap.get(x.sectionId).parts.push(c);
      } else if (![1, 2, 3, 16].includes(ty) && c.length <= 140 && HEADRE.test(c)) head = c;
    });
    const secs = [];
    const seen = {};
    order.forEach(id => {
      const o = secMap.get(id); const full = o.parts.join(' ');
      const m = full.match(/^มาตรา\s*([0-9๐-๙]+(?:\/[0-9๐-๙]+)?)((?:\s*(?:ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|นว|ทศ)(?=\s))?)\s*([\s\S]*)$/);
      if (!m) return;
      let no = thaiNum_(m[1]) + (m[2] ? ' ' + m[2].trim() : '');
      if (seen[no]) no = no + '#' + (++seen[no]); else seen[no] = 1;
      const text = cleanLawText_(m[3]).trim(); if (!text) return;
      secs.push({ no, head: o.head, text }); heads[no] = o.head;
    });
    const cs = cleanSeq(secs); secs.length = 0; cs.forEach(x => secs.push(x));
    if (!secs.length) return;
    const prev = ocsBest.get(k);
    if (!prev || tl > prev.tl) ocsBest.set(k, { tl, title, cat, url: r.url, date: r.date, repealed: /\(ยกเลิก\)/.test(r.title), secs });
    ocsHeads.set(k, Object.assign(ocsHeads.get(k) || {}, heads));
  });
  console.log('ocs laws', ocsBest.size);

  // ---------- NitiBench (consolidated, highest priority) ----------
  const niti = new Map();
  await lines('src_niti.jsonl', r => {
    const title = Z(r.title), cat = lawCategory_(title); if (!cat) return;
    const k = key(title);
    if (!niti.has(k)) niti.set(k, { title, cat, secs: [] });
    let t = ZL(r.text);
    const pre = t.indexOf('มาตรา');
    t = t.slice(pre >= 0 ? pre : 0).replace(/^มาตรา\s*[0-9๐-๙]+(?:\/[0-9๐-๙]+)?(?:\s*(?:ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|นว|ทศ)(?=\s))?\s*/, '');
    niti.get(k).secs.push({ no: thaiNum_(String(r.no)).trim(), text: cleanLawText_(t).trim() });
  });
  /* โครงสร้างวรรค: ใช้การแบ่งวรรคของกฤษฎีกา (OCS) เมื่อข้อความตรงกัน มิฉะนั้นคงการขึ้นบรรทัดเฉพาะหน้าอนุมาตรา (กันการแบ่งวรรคผิดจากการตัดบรรทัด PDF) */
  const NZ = t => thaiNum_(String(t || '')).replace(/[\s“”"'‘’]/g, '');
  let usedOcs = 0, keptLines = 0;
  for (const [k, v] of niti) {
    const o = ocsBest.get(k), om = {};
    if (o) o.secs.forEach(x => { om[x.no] = x.text; });
    v.secs.forEach(sc => {
      const ot = om[sc.no];
      if (k === key('ประมวลกฎหมายแพ่งและพาณิชย์')) keptLines++;
      else sc.text = sc.text.replace(/\n(?!\s*\(?\s*[0-9๐-๙]{1,3}\s*\))/g, ' ');
    });
  }
  console.log('paragraphs from OCS', usedOcs, 'civil-code lines kept', keptLines);
  for (const [k, v] of niti) {
    const heads = ocsHeads.get(k) || {};
    laws.set(k, { title: v.title, cat: v.cat, source: 'NitiBench-statute (VISTEC/VISAI)', license: 'MIT', url: 'https://huggingface.co/datasets/VISAI-AI/nitibench-statute', status: 'ตัวบทฉบับปรับปรุง (รวมการแก้ไขเพิ่มเติม)', secs: v.secs.filter(s => s.text).map(s => ({ no: s.no, head: heads[s.no] || '', text: s.text })) });
  }
  console.log('niti laws', niti.size);

  for (const [k, v] of ocsBest) {
    if (laws.has(k)) continue;
    const outdated = (ocsMaxTl.get(k) || 0) > v.tl;
    laws.set(k, { title: v.title, cat: v.cat, source: 'Open Law Data Thailand – OCS Krisdika', license: 'CC-BY-4.0', url: v.url, status: v.repealed ? 'ยกเลิกแล้ว' : (outdated ? 'ตัวบทตามฉบับที่มีในชุดข้อมูล — โปรดตรวจสอบการแก้ไขเพิ่มเติมกับต้นฉบับ' : 'ตัวบทตามสำนักงานคณะกรรมการกฤษฎีกา'), secs: v.secs });
  }

  // ---------- PyThaiNLP thailaw (fill remaining) ----------
  let added = 0;
  await lines('src_thailaw.jsonl', r => {
    const title = Z(r.title), cat = lawCategory_(title); if (!cat) return;
    const k = key(title); if (laws.has(k)) return;
    let secs = cleanSeq(parseSections_(r.text).map(s => ({ no: s.no, head: s.name === 'บทบัญญัติเบื้องต้น' ? '' : s.name, text: s.text })));
    if (!secs.length) { const full = cleanLawText_(r.text).trim(); if (!full) return; secs = [{ no: 'ฉบับเต็ม', head: 'ตัวบทฉบับเต็ม', text: full.slice(0, 45000) }]; }
    laws.set(k, { title, cat, source: 'PyThaiNLP thailaw-v1.0', license: 'CC0-1.0', url: 'https://huggingface.co/datasets/pythainlp/thailaw-v1.0', status: /\(ยกเลิก\)/.test(title) ? 'ยกเลิกแล้ว' : 'ตัวบทตามชุดข้อมูล — โปรดตรวจสอบฉบับปัจจุบันกับต้นฉบับ', secs });
    added++;
  });
  console.log('thailaw added', added, 'total laws', laws.size);

  // ---------- finalize ----------
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) if (/^(s\d+\.json\.gz|index\.json\.gz|manifest\.json|SOURCES\.md)$/.test(f)) fs.unlinkSync(OUT + '/' + f);
  const mism = [];
  const index = [], shards = []; let cur = [], curSize = 0, totalSecs = 0;
  const catCount = {};
  const sorted = [...laws.entries()].sort((a, b) => a[1].cat.localeCompare(b[1].cat) || a[1].title.localeCompare(b[1].title, 'th'));
  for (const [k, l] of sorted) {
    const seed = seedByKey[k];
    const id = seed ? seed.id : 'L' + sha(k).slice(0, 10);
    const secs = l.secs.map(s => {
      const sk = id + '|' + s.no, useSeed = seedNames[sk] && seedFits(seedTexts[sk], s.text);
      if (seedNames[sk] && !useSeed) mism.push(sk);
      const nm = (useSeed ? seedNames[sk] : '') || (s.head ? Z(s.head) : '') || snippet(s.text);
      return [s.no, nm.slice(0, 160), s.text.slice(0, 45000)];
    });
    totalSecs += secs.length; catCount[l.cat] = (catCount[l.cat] || 0) + 1;
    index.push({ id, cat: l.cat, title: seed ? seed.title : l.title, short: seed && seed.short || '', year: yearOf(l.title) || (seed && seed.year) || '', url: l.url, status: l.status, source: l.source, license: l.license, n: secs.length, shard: shards.length });
    const rec = { id, s: secs };
    const sz = JSON.stringify(rec).length;
    if (curSize + sz > 3500000 && cur.length) { shards.push(cur); cur = []; curSize = 0; index[index.length - 1].shard = shards.length; }
    cur.push(rec); curSize += sz;
  }
  if (cur.length) shards.push(cur);
  shards.forEach((s, i) => fs.writeFileSync(`${OUT}/s${String(i).padStart(3, '0')}.json.gz`, zlib.gzipSync(Buffer.from(JSON.stringify(s)), { level: 9 })));
  const manifest = { version: new Date().toISOString(), laws: index.length, sections: totalSecs, shards: shards.length, categories: catCount,
    sources: [
      { name: 'NitiBench-statute', by: 'VISTEC / VISAI', license: 'MIT', url: 'https://huggingface.co/datasets/VISAI-AI/nitibench-statute' },
      { name: 'OCS Krisdika', by: 'Open Law Data Thailand (ข้อมูลต้นทาง: สำนักงานคณะกรรมการกฤษฎีกา)', license: 'CC-BY-4.0', url: 'https://huggingface.co/datasets/Surathai21/ocs-krisdika' },
      { name: 'thailaw-v1.0', by: 'PyThaiNLP', license: 'CC0-1.0', url: 'https://huggingface.co/datasets/pythainlp/thailaw-v1.0' }] };
  fs.writeFileSync(`${OUT}/index.json.gz`, zlib.gzipSync(Buffer.from(JSON.stringify({ manifest, laws: index })), { level: 9 }));
  fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 1));
  console.log('seed-name mismatches', mism.length, mism.join(','));
  console.log(JSON.stringify(manifest));
})();
