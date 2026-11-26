#!/usr/bin/env python3
"""สร้าง db/world/src/CC.json.gz = { law_id: source_url } สำหรับประเทศที่บริการแถวข้อมูลของ Hugging Face อ่านไฟล์ไม่ได้ (ไฟล์ใหญ่เกินขีดจำกัด)
ใช้เมื่อเปิดอ่านไม่ได้: ระบบแสดงไฟล์ต้นฉบับ (PDF) หรือดึงข้อความจากหน้าเว็บทางการของประเทศนั้นแทน
อินพุต: ไฟล์ parquet (config laws) ของชุดข้อมูล endomorphosis/ipfs_<ประเทศ>_laws ในโฟลเดอร์ที่ระบุ"""
import pyarrow.parquet as pq, glob, re, gzip, json, sys, os
PQ = sys.argv[1] if len(sys.argv) > 1 else '.'
M = {'haiti': 'HT', 'dominicanrepublic': 'DO', 'serbia': 'RS', 'tunisia': 'TN', 'rwanda': 'RW', 'zambia': 'ZM', 'srilanka': 'LK', 'iran': 'IR', 'romania': 'RO'}
os.makedirs('db/world/src', exist_ok=True)
for d, cc in M.items():
    ix = json.load(gzip.open('db/world/%s.json.gz' % cc))
    want = set(l[0] for l in ix['laws'])
    out = {}
    for f in sorted(glob.glob(os.path.join(PQ, 'L_' + d + '_*.parquet'))):
        pf = pq.ParquetFile(f)
        for rg in range(pf.num_row_groups):
            t = pf.read_row_group(rg, columns=['id', 'source_url'])
            for i, u in zip(t.column('id').to_pylist(), t.column('source_url').to_pylist()):
                if i in want and u and re.match(r'^https?://', u): out[i] = re.sub(r':80/', '/', u)
    json.dump(out, gzip.open('db/world/src/%s.json.gz' % cc, 'wt', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(cc, len(want), 'mapped', len(out), round(os.path.getsize('db/world/src/%s.json.gz' % cc) / 1e6, 2), 'MB')
