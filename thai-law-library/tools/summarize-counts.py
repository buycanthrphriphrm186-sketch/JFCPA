#!/usr/bin/env python3
"""สรุปจำนวนกฎหมายตามข้อเท็จจริงในฐานข้อมูล (แยก “มีตัวบทแยกรายมาตรา” กับ “ตัวบททั้งฉบับ”) แล้วเขียนลง manifest
usage: python3 -I summarize-counts.py <db_dir>"""
import sys, json, gzip, os, datetime
DB = sys.argv[1]

# 1) กฎหมายไทยฐานหลัก (db/s*.json.gz)
man_p = f'{DB}/manifest.json'; man = json.load(open(man_p, encoding='utf-8'))
whole = 0
for i in range(man['shards']):
    for d in json.load(gzip.open(f'{DB}/s{i:03d}.json.gz', 'rt', encoding='utf-8')):
        if len(d['s']) == 1 and d['s'][0][0] == 'ฉบับเต็ม': whole += 1
man['wholeText'] = whole; man['sectioned'] = man['laws'] - whole
json.dump(man, open(man_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# 2) กฎหมายไทยลำดับรอง (db/thai2) — ช่องที่ 5 ของแต่ละรายการคือจำนวนมาตรา
t2 = json.load(gzip.open(f'{DB}/thai2/index.json.gz', 'rt', encoding='utf-8'))['laws']
fm_p = f'{DB}/foreign/manifest.json'; fm = json.load(open(fm_p, encoding='utf-8'))
if fm.get('thai2'):
    fm['thai2']['withSections'] = sum(1 for e in t2 if e[4] > 0)
    fm['thai2']['wholeText'] = sum(1 for e in t2 if not e[4])
json.dump(fm, open(fm_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)

# 3) กฎหมายต่างประเทศ (db/world) — ชนิด 'a'/'e' = มีตัวบทแยกรายมาตรา, 'l' = ตัวบททั้งฉบับ
wm_p = f'{DB}/world/manifest.json'; wm = json.load(open(wm_p, encoding='utf-8'))
for cc, c in wm['countries'].items():
    p = f'{DB}/world/{cc}.json.gz'
    if not os.path.exists(p): continue
    L = json.load(gzip.open(p, 'rt', encoding='utf-8'))['laws']
    c['withArticles'] = sum(1 for e in L if e[4] in ('a', 'e'))  # 'e' = ญี่ปุ่น: ดึงรายมาตราจาก e-Gov
    c['wholeText'] = len(L) - c['withArticles']
wm['summarized'] = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
json.dump(wm, open(wm_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('thai main', man['laws'], 'whole', whole, '| thai2', len(t2), fm.get('thai2', {}).get('withSections'), '| world', len(wm['countries']))
