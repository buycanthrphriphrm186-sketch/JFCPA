#!/usr/bin/env python3
"""ดัชนีอนุสัญญาและสนธิสัญญารายประเทศจาก Wikidata (CC0)
อินพุต: ents.json (รายการเอกสาร + ประเทศผู้ลงนาม/ภาคี/ผู้เข้าร่วม) และ countries.json (QID → รหัส ISO) ที่ดึงผ่าน Wikidata API
ประเภท: t = สนธิสัญญา, c = อนุสัญญา, o = อื่น ๆ (ความตกลง พิธีสาร กฎบัตร ปฏิญญา ฯลฯ) — จัดจากชื่อและประเภทใน Wikidata
สถานะ: สิ้นผล/ยกเลิก เมื่อมีวันที่สิ้นสุด (P576/P582) มิฉะนั้นถือว่ามีผลตามข้อมูลที่มี
usage: python3 -I build-treaties.py <ents.json> <countries.json> <db_dir>"""
import sys, json, gzip, os, re, datetime, collections
E = json.load(open(sys.argv[1], encoding='utf-8')); CJ = json.load(open(sys.argv[2], encoding='utf-8')); OUT = sys.argv[3] + '/treaties'
os.makedirs(OUT, exist_ok=True)
iso, lab = CJ['iso'], CJ['lab']
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from countries import C
valid = {c[0] for c in C}
def kind(name, cls):
    s = (name + ' ' + ' '.join(cls)).lower()
    if re.search(r'\bconvention\b|อนุสัญญา', s): return 'c'
    if re.search(r'\btreaty\b|สนธิสัญญา', s): return 't'
    return 'o'
def d(v):
    m = re.match(r'[+-]?(\d{4})-(\d\d)-(\d\d)', v or '')
    if not m: return ''
    y, mo, da = m.groups(); return y if mo == '00' or (mo == '01' and da == '01' and v.endswith('Z') and '/9' in v) else '%s-%s-%s' % (y, mo, da) if mo != '00' else y
treaties, by = {}, collections.defaultdict(list)
for q, e in E.items():
    ccs = sorted({iso[c] for c in e.get('c', []) if c in iso and iso[c] in valid})
    if not ccs: continue
    name = e.get('en') or e.get('th') or q
    cls = [lab.get(c, '') for c in e.get('p31', []) if lab.get(c)]
    treaties[q] = [e.get('en', ''), e.get('th', ''), kind(name, cls), d(e.get('d', '')), d(e.get('e', '')) or ('1' if e.get('e') else ''), ', '.join(cls[:2]), len(ccs)]
    for c in ccs: by[c].append(q)
for c in by: by[c].sort(key=lambda q: (treaties[q][3] or '0000'), reverse=True)
types = {c: dict(collections.Counter(treaties[q][2] for q in by[c])) for c in by}
out = {'built': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'source': 'Wikidata (CC0) — รายการที่ระบุประเทศผู้ลงนาม/ภาคี/ผู้เข้าร่วม (P1891, P710, P17)',
       'total': len(treaties), 'counts': {c: len(v) for c, v in by.items()}, 'types': types, 'byCountry': by, 'treaties': treaties}
with gzip.open(OUT + '/index.json.gz', 'wt', encoding='utf-8') as f: json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
print('treaties', len(treaties), 'countries', len(by), 'TH', len(by.get('TH', [])), 'types', collections.Counter(t[2] for t in treaties.values()), 'ended', sum(1 for t in treaties.values() if t[4]))
