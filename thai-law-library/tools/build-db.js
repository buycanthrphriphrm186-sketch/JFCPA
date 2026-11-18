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
  const sf = String(m[3] || '').split('/');
  return Number(m[1]) * 1000 + (m[2] ? Number(m[2]) : 0) + (SUF[sf[0]] || 0) + (sf[1] ? Number(sf[1]) / 1000 : 0);
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

/* ---------------- การปรับตัวบทตามกฎหมายแก้ไขเพิ่มเติม ----------------
   ใช้เฉพาะข้อความในพระราชบัญญัติแก้ไขเพิ่มเติม (ชุดข้อมูลกฤษฎีกา) ที่มีอยู่ในฐานข้อมูลเดียวกัน ไม่แต่งข้อความเอง:
   • “ให้ยกเลิกความในมาตรา … และให้ใช้ความต่อไปนี้แทน” / “ให้เพิ่มความต่อไปนี้เป็นมาตรา …” → แทนที่/เพิ่มทั้งมาตราตามข้อความในเครื่องหมายคำพูด
   • “ให้ยกเลิกมาตรา …” → ระบุว่ายกเลิก
   • แก้ไขบางวรรค/บางอนุมาตรา → คงตัวบทเดิมและแนบข้อความแก้ไขฉบับเต็มต่อท้าย (ไม่เดาการรวมข้อความ) */
const DIG = s => String(s).replace(/[๐-๙]/g, d => '๐๑๒๓๔๕๖๗๘๙'.indexOf(d));
const SECN = '[0-9๐-๙]+(?:\\/[0-9๐-๙]+)?(?:\\s*(?:ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|นว|ทศ)(?:\\/[0-9๐-๙]+)?(?=[^ก-๙]|$|แห่ง|และ|หรือ|ของ|ใน|ถึง))?';
const normNo = s => DIG(s).replace(/\s+/g, ' ').trim();
const actNo = t => { const m = DIG(Z(t)).match(/ฉบับที่\s*(\d+)/); return m ? +m[1] : 0; };
const CODES = { 'ประมวลกฎหมายแพ่งและพาณิชย์': 'ป.พ.พ.', 'ประมวลกฎหมายอาญา': 'ป.อ.', 'ประมวลกฎหมายวิธีพิจารณาความแพ่ง': 'ป.วิ.พ.', 'ประมวลกฎหมายวิธีพิจารณาความอาญา': 'ป.วิ.อ.' };
const cmpT = s => DIG(String(s || '')).replace(/[\s“”"'‘’()\[\]]/g, '');
function simil(a, b) { a = cmpT(a); b = cmpT(b); if (!a || !b) return 0; const A = bigrams(a.slice(0, 600)), B = bigrams(b.slice(0, 600)); let n = 0; A.forEach(x => { if (B.has(x)) n++; }); return n / Math.max(A.size, B.size); }
function parseAmend(T, code) {
  T = Z(T);
  const qi = T.indexOf('“'), instr = qi >= 0 ? T.slice(0, qi) : T;
  const ref = instr.search(new RegExp('แห่ง\\s*' + code + '(?!ทหาร)'));
  if (ref < 0) return null;
  const pre = instr.slice(0, ref);
  const listed = (pre.match(new RegExp('มาตรา\\s*(' + SECN + ')', 'g')) || []).map(x => normNo(x.replace(/^มาตรา\s*/, '')));
  const range = pre.match(new RegExp('มาตรา\\s*(' + SECN + ')\\s*ถึง\\s*มาตรา\\s*(' + SECN + ')'));
  const secs = [];
  if (qi >= 0) {
    /* แยกมาตราในข้อความที่ยกมา: รับเฉพาะเลขมาตราที่คำสั่งระบุ (หรืออยู่ในช่วง “มาตรา ก ถึงมาตรา ข”) และเรียงจากน้อยไปมาก */
    const Q = T.slice(qi);
    const lo = range ? secVal(normNo(range[1])) : null, hi = range ? secVal(normNo(range[2])) : null;
    const want = new Set(listed);
    const ok = no => { const v = secVal(no); if (v === null) return false; if (range && v >= lo && v < hi + 1000) return true; if (want.size) return want.has(no); return true; };
    const re = new RegExp('(^|[\\s“”])มาตรา\\s*(' + SECN + ')\\s+(?!วรรค|และ|หรือ|ถึง|แห่ง|ของ|ประกอบ|ซึ่ง|ทั้งนี้|\\(|,)', 'g');
    const marks = []; let m, last = -1;
    while ((m = re.exec(Q))) { const no = normNo(m[2]), v = secVal(no); if (!ok(no) || v <= last) continue; last = v; marks.push({ at: m.index + m[1].length, end: re.lastIndex, no }); }
    if (!marks.length) { // เลขมาตราใหม่ต่างจากที่ยกเลิก (เช่น ๗ ทวิ → ๗/๑): รับเฉพาะมาตราที่ขึ้นต้นเครื่องหมายคำพูด
      const r2 = new RegExp('“\\s*มาตรา\\s*(' + SECN + ')\\s', 'g'); last = -1;
      while ((m = r2.exec(Q))) { const no = normNo(m[1]), v = secVal(no); if (v === null || v <= last) continue; last = v; marks.push({ at: m.index + 1, end: r2.lastIndex, no }); }
    }
    const HEADT = /\s((?:ภาค|บรรพ|ลักษณะ|หมวด|ส่วนที่)\s*[0-9๐-๙]+(?:\/[0-9๐-๙]+)?\s[\s\S]{0,160})$/;
    let head = marks.length ? Z(Q.slice(0, marks[0].at).replace(/[“”]/g, ' ')) : '';
    if (!/^(ภาค|บรรพ|ลักษณะ|หมวด|ส่วนที่)/.test(head)) head = '';
    marks.forEach((mk, i) => {
      let body = Q.slice(mk.end, i + 1 < marks.length ? marks[i + 1].at : Q.length).replace(/[\s“]+$/, '');
      let nextHead = '';
      const tail = body.replace(/”\s*$/, '');
      const h = (' ' + tail.replace(/[“”]/g, ' ')).match(HEADT);
      if (h && i + 1 < marks.length ) { const cut = tail.lastIndexOf(h[1].slice(0, 12)); if (cut > 0) { nextHead = Z(h[1]); body = tail.slice(0, cut); } }
      body = body.replace(/[\s“”]+$/, '').replace(/^\s+/, '');
      if (body) secs.push({ no: mk.no, text: body, head: head });
      if (nextHead) head = nextHead.slice(0, 140);
    });
  }
  const partial = /วรรค|อนุมาตรา|\(\s*[0-9๐-๙]+\s*\)|บทนิยาม|ของมาตรา|ในมาตรา\s*[0-9๐-๙\/]+\s*(?:ทวิ|ตรี)?\s*(?:\(|วรรค)/.test(pre);
  if (partial) return { kind: 'partial', listed, instr: Z(instr), quote: qi >= 0 ? T.slice(qi) : '' };
  if (secs.length) return { kind: 'set', pre: pre.trim(), secs, listed, range: range ? [normNo(range[1]), normNo(range[2])] : null };
  if (/^ให้ยกเลิกมาตรา/.test(pre.trim())) return { kind: 'repeal', listed, range: range ? [normNo(range[1]), normNo(range[2])] : null };
  return null;
}
const ORD = { 'หนึ่ง': 1, 'แรก': 1, 'สอง': 2, 'สาม': 3, 'สี่': 4, 'ห้า': 5, 'หก': 6, 'เจ็ด': 7, 'แปด': 8, 'เก้า': 9, 'สิบ': 10, 'สิบเอ็ด': 11, 'สิบสอง': 12 };
const TH = n => String(n).replace(/[0-9]/g, d => '๐๑๒๓๔๕๖๗๘๙'[d]);
const itemRe = k => new RegExp('\\(\\s*(?:' + k + '|' + TH(k) + ')\\s*\\)', 'g');
function paras(text) { const out = []; text.split('\n').forEach(l => { if (out.length && /^\(\s*[0-9๐-๙]+\s*\)/.test(l.trim())) out[out.length - 1] += '\n' + l; else out.push(l); }); return out; }
/* แก้ไขบางวรรค/บางอนุมาตราในตัวบทเดิม เฉพาะเมื่อโครงสร้างชัดเจน (มิฉะนั้นคืน false และแนบข้อความแก้ไขต่อท้ายแทน) */
function applyPartial(o, p) {
  const pre = DIG(p.instr.slice(0, p.instr.search(/แห่ง\s*ประมวลกฎหมาย/))).replace(/\s+/g, ' ');
  const qs = p.quote.indexOf('“'), qe = p.quote.lastIndexOf('”');
  const nq = qs >= 0 && qe > qs ? Z(p.quote.slice(qs + 1, qe)).replace(new RegExp('^มาตรา\\s*' + SECN + '\\s+'), '') : '';
  if ((pre.match(/\(\s*\d+\s*\)/g) || []).length > 1 || (pre.match(/วรรค/g) || []).length > 1 || / และ(?:วรรค| ?\()/.test(pre)) return false;
  let t = o.text, m;
  const hasLines = t.indexOf('\n') >= 0;
  const ord = w => w === 'ท้าย' ? -1 : (ORD[w] || 0);
  if ((m = pre.match(/ให้ยกเลิกความใน ?\((\d+)\) ?(?:ของวรรค\S+ ?)?ของมาตรา/)) && nq) {
    const k = +m[1], a = t.match(itemRe(k)) || [], b = t.match(itemRe(k + 1)) || [];
    if (a.length !== 1) return false;
    const st = t.search(itemRe(k)); let en;
    if (b.length === 1 && t.search(itemRe(k + 1)) > st) en = t.search(itemRe(k + 1));
    else if (hasLines) { en = t.indexOf('\n', st); if (en < 0) en = t.length; } else return false;
    const rep = /^\(\s*[0-9๐-๙]+\s*\)/.test(nq) ? nq : '(' + TH(k) + ') ' + nq;
    o.text = t.slice(0, st) + rep + (hasLines && t[en] === '\n' ? '' : ' ') + t.slice(en).replace(/^ +/, ''); return true;
  }
  if ((m = pre.match(/ให้ยกเลิก ?\((\d+)\) ?(?:ของวรรค\S+ ?)?ของมาตรา/)) && !nq) {
    const k = +m[1]; if ((t.match(itemRe(k)) || []).length !== 1) return false;
    const st = t.search(itemRe(k)), nx = t.search(itemRe(k + 1));
    let en = nx > st ? nx : (hasLines ? (t.indexOf('\n', st) < 0 ? t.length : t.indexOf('\n', st)) : -1); if (en < 0) return false;
    o.text = t.slice(0, st) + '(' + TH(k) + ') (ยกเลิก)' + (hasLines && t[en] === '\n' ? '' : ' ') + t.slice(en).replace(/^ +/, ''); return true;
  }
  if ((m = pre.match(/ให้เพิ่มความต่อไปนี้เป็น ?\((\d+)\) ?(?:ของวรรค\S+ ?)?ของมาตรา/)) && nq && hasLines) {
    const k = +m[1]; if ((t.match(itemRe(k)) || []).length || (t.match(itemRe(k - 1)) || []).length !== 1) return false;
    const st = t.search(itemRe(k - 1)); let en = t.indexOf('\n', st); if (en < 0) en = t.length;
    o.text = t.slice(0, en) + '\n' + (/^\(/.test(nq) ? nq : '(' + TH(k) + ') ' + nq) + t.slice(en); return true;
  }
  if (!hasLines) return false;
  const P = paras(t);
  if ((m = pre.match(/ให้ยกเลิกความในวรรค ?(\S+?) ?ของมาตรา/)) && nq) { let k = ord(m[1]); if (k === -1) k = P.length; if (!k || k > P.length) return false; P[k - 1] = nq; o.text = P.join('\n'); return true; }
  if ((m = pre.match(/ให้เพิ่มความต่อไปนี้เป็นวรรค ?(\S+?) ?ของมาตรา/)) && nq) { const k = ord(m[1]); if (!k || k > P.length + 1) return false; P.splice(k - 1, 0, nq); o.text = P.join('\n'); return true; }
  if ((m = pre.match(/ให้ยกเลิกวรรค ?(\S+?) ?ของมาตรา/)) && !nq) { let k = ord(m[1]); if (k === -1) k = P.length; if (!k || k > P.length) return false; P.splice(k - 1, 1); o.text = P.join('\n'); return true; }
  return false;
}
function applyAmendments(laws) {
  const byTitle = [...laws.values()];
  for (const [code, short] of Object.entries(CODES)) {
    const L = laws.get(key(code)); if (!L) continue;
    const acts = byTitle.filter(l => { const t = Z(l.title).replace(/\s+/g, ''); return t.startsWith('พระราชบัญญัติแก้ไขเพิ่มเติม' + code) && !t.startsWith('พระราชบัญญัติแก้ไขเพิ่มเติม' + code + 'ทหาร') && actNo(l.title); })
      .sort((a, b) => actNo(a.title) - actNo(b.title));
    let cutoff = 0;
    if (L.acts && L.acts.length) cutoff = Math.max(0, ...L.acts.filter(t => Z(t).replace(/\s+/g, '').includes('แก้ไขเพิ่มเติม' + code)).map(actNo));
    else { // ชุดข้อมูลรวมตัวบท (NitiBench) ไม่ระบุฉบับ: หาฉบับล่าสุดที่ตัวบทในชุดข้อมูลตรงกับข้อความแก้ไขแล้ว
      const cur = {}; L.secs.forEach(s => { cur[normNo(s.no)] = s.text; });
      for (const a of acts.slice().reverse()) {
        const sets = []; a.secs.forEach(s => { const p = parseAmend(s.text, code); if (p && p.kind === 'set') p.secs.forEach(x => sets.push(x)); });
        if (!sets.length) continue;
        const ok = sets.filter(x => cur[x.no] && (cmpT(cur[x.no]) === cmpT(x.text) || simil(cur[x.no], x.text) >= 0.98)).length;
        if (ok / sets.length >= 0.8) { cutoff = actNo(a.title); break; }
      }
    }
    const map = new Map(L.secs.map(s => [normNo(s.no), s]));
    const applied = [], stat = { set: 0, add: 0, repeal: 0, partial: 0 };
    for (const a of acts) {
      const n = actNo(a.title); if (n <= cutoff) continue;
      const nm = short + ' (ฉบับที่ ' + n + ')' + ((a.title.match(/พ\.ศ\.\s*[0-9๐-๙]{4}/) || [''])[0] ? ' ' + DIG(a.title.match(/พ\.ศ\.\s*[0-9๐-๙]{4}/)[0]) : '');
      let used = 0;
      for (const s of a.secs) {
        const p = parseAmend(s.text, code); if (!p) { if (process.env.AMEND_DEBUG && new RegExp(code + '(?![ก-๙])').test(Z(s.text).slice(0, 400)) && /ให้(ยกเลิก|เพิ่ม)/.test(s.text)) console.log('  ?', nm, s.no, Z(s.text).slice(0, 260)); continue; } used++;
        if (p.kind === 'set' && p.range) { const lo = secVal(p.range[0]), hi = secVal(p.range[1]); [...map.keys()].forEach(k => { const v = secVal(k); if (v >= lo && v <= hi && !p.secs.some(x => x.no === k)) { map.delete(k); stat.repeal++; } }); }
        if (p.kind === 'set' && !p.range && /^ให้ยกเลิกความใน/.test(p.pre)) p.listed.forEach(no => { if (!p.secs.some(x => x.no === no) && map.has(no)) { if (process.env.AMEND_DEBUG) console.log('  del', nm, no, '<-', p.secs.map(x => x.no).join(',')); map.delete(no); stat.repeal++; } }); // เปลี่ยนเลขมาตรา
        if (p.kind === 'set') p.secs.forEach(x => {
          const old = map.get(x.no);
          if (old) { old.text = x.text; old.amended = nm; stat.set++; }
          else { map.set(x.no, { no: x.no, head: x.head || '', text: x.text, amended: nm, added: 1 }); stat.add++; }
        });
        else if (p.kind === 'repeal') {
          let nos = p.listed;
          if (p.range) { const lo = secVal(p.range[0]), hi = secVal(p.range[1]); nos = [...map.keys()].filter(k => secVal(k) >= lo && secVal(k) <= hi); }
          nos.forEach(no => { const o = map.get(no); if (o) { o.text = '(ยกเลิก)'; o.amended = nm; stat.repeal++; } });
        } else if (p.kind === 'partial') {
          p.listed.slice(0, 1).forEach(no => { const o = map.get(no); if (!o) return; const q = cmpT(p.quote.replace(/^“|”$/g, '')); if (q && cmpT(o.text).includes(q)) return; if (p.listed.length === 1 && applyPartial(o, p)) { o.amended = nm; stat.inplace = (stat.inplace || 0) + 1; return; } o.text += '\n[แก้ไขเพิ่มเติมโดย ' + nm + '] ' + (p.instr.replace(/\s*แห่ง\s*ประมวลกฎหมาย[\s\S]*?(และให้ใช้ความต่อไปนี้แทน|$)/, ' $1').trim() + ' ' + p.quote).trim(); stat.partial++; });
        }
      }
      if (used) applied.push(nm);
    }
    if (!applied.length) { console.log('amend', short, 'cutoff', cutoff, 'nothing newer'); continue; }
    const all = [...map.values()].sort((x, y) => secVal(x.no) - secVal(y.no));
    all.forEach((s, i) => { if (s.added && !s.head && i > 0) s.head = all[i - 1].head; });
    L.secs = all;
    L.status = 'ตัวบทรวมการแก้ไขเพิ่มเติมถึง ' + applied[applied.length - 1] + ' (ปรับจากพระราชบัญญัติแก้ไขเพิ่มเติมในฐานข้อมูล โปรดตรวจสอบกับต้นฉบับราชกิจจานุเบกษา)';
    console.log('amend', short, 'cutoff', cutoff, 'applied', applied.length, applied[0], '→', applied[applied.length - 1], JSON.stringify(stat), 'sections', all.length);
  }
}

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
    /* ข้อมูลกฤษฎีกาเรียงตามรหัสรายการ: ตัวบทหลักมาก่อน แล้วต่อด้วยกฎหมายแก้ไขเพิ่มเติมแต่ละฉบับ (หัวเรื่องประเภท 1)
       มาตราที่ “เพิ่มใหม่” (เช่น ๑๓๕/๑, ๓๓๕ ทวิ) อยู่ในช่วงท้ายนี้ จึงต้องเก็บไว้และนำไปเรียงตามเลขมาตรา */
    const secMap = new Map(); const order = []; let head = '', appendix = false, nSec = 0;
    const heads = {}, acts = [];
    S.forEach(x => {
      const ty = x.sectionTypeId, c = Z(x.content);
      if (ty === 4) {
        if (!secMap.has(x.sectionId)) { secMap.set(x.sectionId, { parts: [], head, appendix }); order.push(x.sectionId); nSec++; }
        secMap.get(x.sectionId).parts.push(c);
      } else if (ty === 1 && nSec >= 20 && !key(c).startsWith(k)) { appendix = true; head = ''; acts.push(c); }
      else if (![1, 2, 3, 16].includes(ty) && c.length <= 140 && HEADRE.test(c)) head = c;
    });
    const secs = [], extra = [];
    const seen = {};
    order.forEach(id => {
      const o = secMap.get(id); const full = o.parts.join(' ');
      const m = full.match(/^มาตรา\s*([0-9๐-๙]+(?:\/[0-9๐-๙]+)?)((?:\s*(?:ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|นว|ทศ)(?=\s))?)\s*([\s\S]*)$/);
      if (!m) return;
      let no = thaiNum_(m[1]) + (m[2] ? ' ' + m[2].trim() : '');
      const text = cleanLawText_(m[3]).trim(); if (!text) return;
      if (o.appendix) { extra.push({ no, head: o.head, text }); return; }
      if (seen[no]) no = no + '#' + (++seen[no]); else seen[no] = 1;
      secs.push({ no, head: o.head, text }); heads[no] = o.head;
    });
    const cs = cleanSeq(secs); secs.length = 0; cs.forEach(x => secs.push(x));
    if (extra.length && secs.length >= 20) {
      const have = new Set(secs.map(s => s.no)), add = new Map();
      let maxInt = Math.max(0, ...secs.filter(x => /^\d+$/.test(x.no)).map(x => +x.no));
      extra.forEach(s => {
        if (have.has(s.no)) return;
        if (/[\/ ]/.test(s.no)) add.set(s.no, s); // มาตราที่เพิ่มใหม่ (ฉบับหลังสุดทับฉบับก่อน)
        else if (/^\d+$/.test(s.no) && +s.no === maxInt + 1) { add.set(s.no, s); maxInt++; } // มาตราต่อเนื่องของตัวบทหลัก
      });
      if (add.size) {
        const all = secs.concat([...add.values()]).sort((a, b) => secVal(a.no) - secVal(b.no));
        all.forEach((s, i) => { if (add.has(s.no) && !s.head && i > 0) s.head = all[i - 1].head; heads[s.no] = s.head; });
        secs.length = 0; all.forEach(x => secs.push(x));
      }
    }
    if (!secs.length) return;
    const prev = ocsBest.get(k);
    if (!prev || tl > prev.tl) ocsBest.set(k, { tl, title, cat, url: r.url, date: r.date, repealed: /\(ยกเลิก\)/.test(r.title), secs, acts });
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
    laws.set(k, { title: v.title, cat: v.cat, source: 'Open Law Data Thailand – OCS Krisdika', license: 'CC-BY-4.0', url: v.url, status: v.repealed ? 'ยกเลิกแล้ว' : (outdated ? 'ตัวบทตามฉบับที่มีในชุดข้อมูล — โปรดตรวจสอบการแก้ไขเพิ่มเติมกับต้นฉบับ' : 'ตัวบทตามสำนักงานคณะกรรมการกฤษฎีกา'), secs: v.secs, acts: v.acts });
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

  // ---------- ประมวลกฎหมายหลัก: ปรับตัวบทตามพระราชบัญญัติแก้ไขเพิ่มเติมฉบับที่ออกหลังฉบับที่ชุดข้อมูลรวมไว้ ----------
  applyAmendments(laws);

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
