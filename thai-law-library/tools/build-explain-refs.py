#!/usr/bin/env python3
"""สร้าง db/explain/refs.json.gz: มาตรา → คำพิพากษาศาลฎีกาที่อ้างมาตรานั้นจริง (จาก db/deka/index.json.gz ซึ่งมาจาก korakot/deka-bulk)
รูปแบบ { "K02-334": [จำนวนทั้งหมด, [[เลขฎีกา, ปี, แถวข้อมูล], ... ใหม่สุด 12 ฉบับ]] }"""
import gzip, json, re, collections
d = json.load(gzip.open('db/deka/index.json.gz'))
L = d['laws']
MAP = {'ป.พ.พ.': 'K01', 'ป.อ.': 'K02', 'ป.วิ.พ.': 'K03', 'ป.วิ.อ.': 'K04', 'ป.รัษฎากร': 'K05', 'ป.ที่ดิน': 'K06', 'ประมวลกฎหมายอาญาทหาร': 'K07',
       'รัฐธรรมนูญแห่งราชอาณาจักรไทย พุทธศักราช 2560': 'C20'}
idx = {i: MAP[l[0]] for i, l in enumerate(L) if l[0] in MAP}
TH = str.maketrans('๐๑๒๓๔๕๖๗๘๙', '0123456789')
acc = collections.defaultdict(list)
for r in d['recs']:
    seen = set()
    for ref in r[6]:
        law = idx.get(ref[0])
        if not law: continue
        sec = re.sub(r'\s+', ' ', str(ref[1]).translate(TH)).strip()
        if not sec: continue
        k = law + '-' + sec
        if k in seen: continue
        seen.add(k); acc[k].append([r[1], r[2], r[5]])
out = {}
for k, v in acc.items():
    v.sort(key=lambda x: -(x[1] or 0)); out[k] = [len(v), v[:12]]
json.dump(out, gzip.open('db/explain/refs.json.gz', 'wt', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'sections', sum(v[0] for v in out.values()), 'citations', {l: sum(1 for k in out if k.startswith(l + '-')) for l in sorted(set(MAP.values()))})
