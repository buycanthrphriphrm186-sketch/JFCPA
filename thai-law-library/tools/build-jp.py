#!/usr/bin/env python3
"""ดัชนีกฎหมายญี่ปุ่นจาก e-Gov (รายชื่อจาก API v2 + นับมาตราจากไฟล์ XML รวมทางการ bulkdownload)
usage: python3 -I build-jp.py <dir with list.json and all_xml.zip> <out_db_dir>"""
import json, zipfile, re, gzip, collections, sys
D, OUT = sys.argv[1], sys.argv[2]
L = json.load(open(f'{D}/list.json'))['laws']
z = zipfile.ZipFile(f'{D}/all_xml.zip')
byid = collections.defaultdict(list)
for n in z.namelist():
    if n.endswith('.xml'): byid[n.split('/')[0].split('_')[0]].append(n)
art_re = re.compile(rb'<Article[ >]')
MAIN6 = {'321CONSTITUTION', '129AC0000000089', '140AC0000000045', '132AC0000000048', '408AC0000000109', '323AC0000000131', '417AC0000000086'}
entries = []; tot = 0; rep = 0
for x in L:
    li = x['law_info']; ri = x['revision_info']; lid = li['law_id']
    files = byid.get(lid, [])
    want = [f for f in files if f.split('/')[0] == ri['law_revision_id']] or sorted(files)[-1:]
    n = 0
    if want:
        b = z.read(want[0]); mp = b.split(b'<SupplProvision', 1)[0]
        n = len(art_re.findall(mp)) or len(art_re.findall(b))
    r = 1 if (ri.get('repeal_status') or 'None') != 'None' else 0
    m = 1 if lid in MAIN6 or re.search(r'法典|憲法|^民法$|^刑法$|^商法$|^会社法$|^民事訴訟法$|^刑事訴訟法$', ri['law_title']) else 0
    tot += n; rep += r
    entries.append([lid, ri['law_title'], li.get('promulgation_date', ''), r, 'e', 0, n, m, ri.get('abbrev') or ''])
entries.sort(key=lambda e: (-e[7], e[1]))
with gzip.open(f'{OUT}/world/JP.json.gz', 'wt', encoding='utf-8') as f: json.dump({'cc': 'JP', 'dataset': 'e-Gov', 'laws': entries}, f, ensure_ascii=False, separators=(',', ':'))
mp = f'{OUT}/world/manifest.json'; man = json.load(open(mp, encoding='utf-8'))
man['countries']['JP'] = {'laws': len(entries), 'sections': tot, 'repealed': rep, 'inForce': len(entries) - rep, 'main': sum(e[7] for e in entries), 'dataset': 'e-Gov', 'license': 'e-Gov 法令データ (CC BY 4.0 互換)', 'lang': 'ja'}
json.dump(man, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('JP', len(entries), tot, rep)
