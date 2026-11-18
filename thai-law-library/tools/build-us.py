#!/usr/bin/env python3
"""ดัชนีประมวลกฎหมายสหรัฐอเมริกา (United States Code) จากชุดข้อมูล dreamproit/uscode (config 'current', ข้อมูลจาก uscode.house.gov
— Office of the Law Revision Counsel, สาธารณสมบัติ) แยกเป็นรายการละ 1 หมวด (Title › Chapter) ตัวบทอ่านจากแหล่งเมื่อเปิด
usage: python3 -I build-us.py <rangefile_dir> <db_dir>"""
import sys, os, json, gzip, re, collections, requests
sys.path.insert(0, sys.argv[1])
import pyarrow.parquet as pq
from rangefile import HTTPRangeFile
OUT = sys.argv[2]; DS = 'dreamproit/uscode'
j = requests.get('https://datasets-server.huggingface.co/parquet?dataset=' + DS, timeout=90).json()
files = sorted([(f['url'], f['size']) for f in j['parquet_files'] if f['config'] == 'current' and f['split'] == 'train'])
rows = {'identifier': [], 'title': [], 'title_name': [], 'status': [], 'ancestors': [], 'currency_date': []}
for url, size in files:
    t = pq.ParquetFile(HTTPRangeFile(url)).read(columns=list(rows))
    for c in rows: rows[c] += t.column(c).to_pylist()
N = len(rows['identifier']); print('rows', N)
groups = collections.OrderedDict()  # key -> [label, ranges[[start,count]], repealed_count, total]
for i in range(N):
    anc = rows['ancestors'][i] or []
    tnum = rows['title'][i]; tname = rows['title_name'][i] or ''
    ch = next((a for a in anc if a.get('level') == 'chapter'), None)
    key = (tnum, ch['identifier'] if ch else '/us/usc/t%s' % tnum)
    label = 'Title %s — %s' % (tnum, tname.title() if tname.isupper() else tname)
    if ch: label += ' › Chapter %s — %s' % (ch.get('num') or '', (ch.get('heading') or '').strip())
    rep = 1 if re.search(r'repeal|omitted|transferred', str(rows['status'][i] or ''), re.I) else 0
    g = groups.get(key)
    if not g: g = groups[key] = [label, [], 0, 0]
    if g[1] and g[1][-1][0] + g[1][-1][1] == i: g[1][-1][1] += 1
    else: g[1].append([i, 1])
    g[2] += rep; g[3] += 1
entries = []
for key, g in groups.items():
    # [id, title, date, repealed(ทั้งหมวดถูกยกเลิก), kind 'u', ranges [[offset,count],...], count, main]
    entries.append([key[1], g[0], '', 1 if g[2] == g[3] else 0, 'u', g[1], g[3], 1 if 'Chapter' not in g[0] else 0])
cd = str(rows['currency_date'][0] or '')[:10]
with gzip.open(f'{OUT}/world/US.json.gz', 'wt', encoding='utf-8') as f:
    json.dump({'cc': 'US', 'dataset': DS, 'acfg': 'current', 'laws': entries}, f, ensure_ascii=False, separators=(',', ':'))
man_p = f'{OUT}/world/manifest.json'; man = json.load(open(man_p, encoding='utf-8'))
rep = sum(e[3] for e in entries)
man['countries']['US'] = {'laws': len(entries), 'sections': N, 'repealed': rep, 'inForce': len(entries) - rep, 'main': sum(e[7] for e in entries), 'dataset': DS, 'acfg': 'current',
                          'license': 'United States Code — Office of the Law Revision Counsel (uscode.house.gov), public domain; currency ' + cd, 'lang': 'en',
                          'withArticles': len(entries), 'wholeText': 0, 'unit': 'Title/Chapter'}
json.dump(man, open(man_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('US entries', len(entries), 'sections', N, 'all-repealed chapters', rep, 'max group', max(e[6] for e in entries))
