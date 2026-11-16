#!/usr/bin/env python3
"""สร้างดัชนีกฎหมายต่างประเทศ + กฎหมายไทยลำดับรอง จากชุดข้อมูลเปิด (ข้อความตัวบทดึงตามต้องการผ่าน Hugging Face rows API)
usage: python3 -I build-foreign.py <download_dir> <thailaw_parquet_dir> <main_index.json.gz> <out_db_dir>"""
import sys, json, gzip, re, collections, datetime
import pyarrow.parquet as pq
DL, THDIR, MAIN, OUT = sys.argv[1:5]
COUNTRIES = {  # code: (dataset slug, name)
  'CN': None, 'KR': 'korea', 'VN': 'vietnam', 'LA': 'laos', 'ID': 'indonesia', 'MY': 'malaysia', 'PH': 'philippines', 'SG': 'singapore', 'BN': 'brunei'}
def s(v): return '' if v is None else str(v)
def d10(v): v = s(v); return v[:10] if re.match(r'\d{4}-\d{2}-\d{2}', v) else ''
manifest = {'built': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'countries': {}}
for cc, slug in COUNTRIES.items():
    entries = []; arts_total = 0
    if cc == 'CN':
        m = pq.read_table(f'{DL}/cn_meta.parquet').to_pylist()
        content = pq.read_table(f'{DL}/cn_data.parquet', columns=['content']).column('content').to_pylist()
        for i, r in enumerate(m):
            n = len(re.findall(r'(?m)^\s*第[一二三四五六七八九十百千零〇两0-9]+条', content[i] or ''))
            arts_total += n
            entries.append([f'cn{i}', s(r['title']), d10(r['publish_date']), s(r['status']), 'r', i, n, s(r['type'])])
        ds = 'twang2218/chinese-law-and-regulations'; cfg = {'r': 'default'}
        src = {'name': '国家法律法规数据库 (flk.npc.gov.cn) ผ่านชุดข้อมูล twang2218/chinese-law-and-regulations', 'license': 'Apache-2.0 (ตัวบทกฎหมายจีนไม่มีลิขสิทธิ์ตามกฎหมายลิขสิทธิ์จีน มาตรา 5)', 'url': 'https://flk.npc.gov.cn'}
    else:
        ds = f'endomorphosis/ipfs_{slug}_laws'; cfg = {'a': 'articles', 'l': 'laws'}
        a = pq.read_table(f'{DL}/{slug}_articles.parquet', columns=['law_id']).column('law_id').to_pylist()
        first = {}; cnt = collections.Counter(a)
        for i, x in enumerate(a): first.setdefault(x, i)
        L = pq.read_table(f'{DL}/{slug}_laws.parquet', columns=['id', 'title', 'date', 'law_status', 'source_url', 'language', 'license']).to_pylist()
        texts = pq.read_table(f'{DL}/{slug}_laws.parquet', columns=['text']).column('text').to_pylist()
        def readable(t):
            t = t or ''
            if len(t) < 120 or t[:12].startswith(('GIF8', '%PDF', 'PK', '\x89PNG')): return False
            good = sum(1 for ch in t[:4000] if ch.isalpha() or ch.isspace() or ch in '.,;:()[]-–\'"/0123456789')
            return good / max(1, min(len(t), 4000)) > 0.88
        lic = s(L[0].get('license'))[:300] if L else ''
        for i, r in enumerate(L):
            lid = s(r['id'])
            if lid in cnt: entries.append([lid, s(r['title']), d10(r['date']), s(r['law_status']), 'a', first[lid], cnt[lid], s(r['source_url']), s(r['language'])]); arts_total += cnt[lid]
            elif readable(texts[i]): entries.append([lid, s(r['title']), d10(r['date']), s(r['law_status']), 'l', i, 0, s(r['source_url']), s(r['language'])])
        src = {'name': f'ชุดข้อมูลเปิด {ds} (ตัวบทจากแหล่งทางการของรัฐ)', 'license': lic, 'url': f'https://huggingface.co/datasets/{ds}'}
    for e in entries: e[1] = re.sub(r'^[^\w\u0E00-\u0EFF\u4e00-\u9fff\uac00-\ud7af(]+', '', e[1]).strip() or e[0]
    entries.sort(key=lambda e: e[1])
    with gzip.open(f'{OUT}/foreign/{cc}.json.gz', 'wt', encoding='utf-8') as f: json.dump({'cc': cc, 'dataset': ds, 'configs': cfg, 'laws': entries}, f, ensure_ascii=False, separators=(',', ':'))
    manifest['countries'][cc] = {'laws': len(entries), 'sections': arts_total, 'dataset': ds, 'source': src}
    print(cc, len(entries), arts_total)
# --- กฎหมายไทยลำดับรอง (thailaw-v1.0, CC0) ---
def nz(t): return re.sub(r'[\s​]+', '', t or '').replace('ํา', 'ำ')
main = json.load(gzip.open(MAIN, 'rt', encoding='utf-8'))
mainlaws = main['laws'] if isinstance(main, dict) else main
have = set(nz(l['title']) for l in mainlaws)
TYPES = [('พระราชกฤษฎีกา', 'พระราชกฤษฎีกา'), ('กฎกระทรวง', 'กฎกระทรวง'), ('ประกาศ', 'ประกาศ'), ('ระเบียบ', 'ระเบียบ'), ('ข้อบังคับ', 'ข้อบังคับ'), ('คำสั่ง', 'คำสั่ง'), ('ข้อกำหนด', 'ข้อกำหนด'), ('กฎ', 'กฎ'), ('พระราชบัญญัติ', 'พระราชบัญญัติ/พระราชกำหนด (เพิ่มเติม)'), ('พระราชกำหนด', 'พระราชบัญญัติ/พระราชกำหนด (เพิ่มเติม)')]
rows = []; off = 0; secs_total = 0; tc = collections.Counter()
for fn in ['train-00000-of-00002.parquet', 'train-00001-of-00002.parquet']:
    t = pq.read_table(f'{THDIR}/{fn}', columns=['title', 'text'])
    for ti, tx in zip(t.column('title').to_pylist(), t.column('text').to_pylist()):
        ti = (ti or '').strip()
        if ti and nz(ti) not in have:
            ty = next((v for k, v in TYPES if ti.startswith(k)), 'อื่น ๆ')
            n = len(re.findall(r'(?m)^\s*(?:มาตรา|ข้อ)\s*[0-9๐-๙]+', tx or ''))
            secs_total += n; tc[ty] += 1
            rows.append([f't{off}', ti, ty, off, n])
        off += 1
rows.sort(key=lambda e: (e[2], e[1]))
with gzip.open(f'{OUT}/thai2/index.json.gz', 'wt', encoding='utf-8') as f: json.dump({'dataset': 'pythainlp/thailaw-v1.0', 'config': 'default', 'laws': rows}, f, ensure_ascii=False, separators=(',', ':'))
manifest['thai2'] = {'laws': len(rows), 'sections': secs_total, 'types': dict(tc), 'dataset': 'pythainlp/thailaw-v1.0', 'license': 'CC0-1.0', 'totalRows': off}
manifest['thaiMain'] = {'laws': len(mainlaws), 'sections': sum(int(l.get('n') or 0) for l in mainlaws)}
json.dump(manifest, open(f'{OUT}/foreign/manifest.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('thai2', len(rows), secs_total, tc.most_common())
