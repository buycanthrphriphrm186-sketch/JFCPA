#!/usr/bin/env python3
"""ดัชนีคำพิพากษาศาลฎีกา จาก korakot/deka-bulk (CC0; ต้นทาง deka.supremecourt.or.th) — อ่านเฉพาะคอลัมน์ที่จำเป็น
usage: python3 -I build-deka.py <rangefile_dir> <out_db_dir>"""
import sys, json, gzip, collections, re, concurrent.futures as cf
sys.path.insert(0, sys.argv[1]); OUT = sys.argv[2]
import requests, pyarrow.parquet as pq
from rangefile import HTTPRangeFile
j = requests.get('https://datasets-server.huggingface.co/parquet?dataset=korakot/deka-bulk', timeout=90).json()
fs = sorted([f for f in j['parquet_files'] if f['split'] == 'train' and f['config'] == 'default'], key=lambda f: f['url'])
def rd(f):
    t = pq.ParquetFile(HTTPRangeFile(f['url'])).read(columns=['docid', 'year', 'doc_type', 'case_no', 'laws', 'source'])
    return t.to_pylist()
with cf.ThreadPoolExecutor(8) as ex: parts = list(ex.map(rd, fs))
laws = {}; types = {}; recs = []; off = 0; cnt = collections.Counter(); cat = collections.Counter()
CRIM = re.compile(r'ป\.อ\.|ป\.วิ\.อ\.|อาญา|ยาเสพติด|อาวุธปืน|ค้ามนุษย์|คอมพิวเตอร์'); CIV = re.compile(r'ป\.พ\.พ\.|ป\.วิ\.พ\.|ล้มละลาย|ที่ดิน|แรงงาน|ภาษี|รัษฎากร')
for rows in parts:
    for r in rows:
        refs = []; tc = 0; tv = 0
        for x in r['laws'] or []:
            ab = (x.get('law_abbr') or x.get('law_name') or '').strip()
            if not ab: continue
            if ab not in laws: laws[ab] = [len(laws), x.get('law_name') or ab]
            refs.append([laws[ab][0], str(x.get('section') or ''), str(x.get('paragraph') or ''), str(x.get('sub') or '')])
            if CRIM.search(ab): tc += 1
            if CIV.search(ab): tv += 1
        dt = r['doc_type'] or ''
        if dt not in types: types[dt] = len(types)
        c = 'อ' if tc > tv else 'พ' if tv > tc else ('อ' if tc else '-')
        recs.append([r['docid'], r['case_no'] or '', r['year'] or 0, types[dt], c, off, refs])
        cnt[dt] += 1; cat[c] += 1; off += 1
lawlist = [None] * len(laws)
for ab, (i, nm) in laws.items(): lawlist[i] = [ab, nm]
with gzip.open(f'{OUT}/deka/index.json.gz', 'wt', encoding='utf-8') as f:
    json.dump({'dataset': 'korakot/deka-bulk', 'types': list(types), 'laws': lawlist, 'recs': recs}, f, ensure_ascii=False, separators=(',', ':'))
json.dump({'total': len(recs), 'types': dict(cnt), 'cats': {'แพ่ง': cat['พ'], 'อาญา': cat['อ'], 'อื่น ๆ': cat['-']}, 'years': [min(r[2] for r in recs), max(r[2] for r in recs)], 'dataset': 'korakot/deka-bulk', 'license': 'CC0-1.0', 'source': 'deka.supremecourt.or.th'},
          open(f'{OUT}/deka/manifest.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(recs), dict(cnt), dict(cat), len(lawlist))
