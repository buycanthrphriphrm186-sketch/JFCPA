#!/usr/bin/env python3
"""สร้างดัชนีกฎหมายของทุกประเทศ (อ่านเฉพาะคอลัมน์ที่จำเป็นจากไฟล์ parquet ระยะไกล ไม่ดาวน์โหลดตัวบททั้งหมด)
usage: python3 -I build-world.py <rangefile_dir> <out_db_dir> [ISO2,...]"""
import sys, os, json, gzip, re, collections, datetime, concurrent.futures as cf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, sys.argv[1])
import requests, pyarrow.parquet as pq
from rangefile import HTTPRangeFile
from countries import C, CONT, ASEAN
OUT = sys.argv[2]; ONLY = set(sys.argv[3].split(',')) if len(sys.argv) > 3 else None
os.makedirs(f'{OUT}/world', exist_ok=True)
REPEAL = re.compile(r'repeal|revok|abrogat|derogad|no vigente|not in force|inactive|expired|superseded|annul|ยกเลิก|废止|失效|폐지|hết hiệu lực|dicabut|tidak berlaku|aufgehoben|abrogé|abrogata|revogad|отмен|утрат', re.I)
MAIN = re.compile(r'\b(code|codes|codex|codigo|código|codice|kodeks|kodex|zakonik|kanun|gesetzbuch|grundgesetz|constitution|constitución|constituição|costituzione|verfassung|konstitusi|perlembagaan|grondwet|kitab undang|bộ luật|hiến pháp|penal|civil procedure|criminal procedure)\b|法典|憲法|宪法|헌법|민법|형법|상법|민사소송법|형사소송법|кодекс|конституц|ລັດຖະທຳມະນູນ|ກົດໝາຍອາຍາ|ກົດໝາຍແພ່ງ', re.I)
def s(v): return '' if v is None else str(v)
def d10(v): v = s(v); return v[:10] if re.match(r'\d{4}-\d{2}-\d{2}', v) else (v[:4] if re.match(r'\d{4}', v) else '')
def readable(t):
    t = t or ''
    if len(t) < 120 or t[:12].startswith(('GIF8', '%PDF', 'PK', '\x89PNG')): return False
    good = sum(1 for ch in t[:4000] if ch.isalpha() or ch.isspace() or ch in '.,;:()[]-–\'"/0123456789')
    return good / max(1, min(len(t), 4000)) > 0.88
def parquet_urls(ds):
    for k in range(4):
        try:
            j = requests.get('https://datasets-server.huggingface.co/parquet?dataset=' + ds, timeout=90).json()
            if 'parquet_files' in j: break
        except Exception: pass
    else: return {}
    out = collections.defaultdict(list)
    for f in j['parquet_files']:
        if f['split'] == 'train': out[f['config']].append((f['url'], f['size']))
    for k in out: out[k].sort()
    return out
def read_cols(files, cols):
    rows = {c: [] for c in cols}
    for url, size in files:
        pf = pq.ParquetFile(HTTPRangeFile(url)); have = [c for c in cols if c in pf.schema_arrow.names]
        t = pf.read(columns=have)
        n = t.num_rows
        for c in cols: rows[c] += (t.column(c).to_pylist() if c in have else [None] * n)
    return rows
def build(entry):
    iso, th, en, cont, un, slug = entry
    ds = f'endomorphosis/ipfs_{slug}_laws'
    urls = parquet_urls(ds)
    if 'laws' not in urls and 'default' in urls:
        # ชุดข้อมูลที่มีเฉพาะตารางมาตรา: จัดกลุ่มตาม law_id และตั้งชื่อจากรหัสเอกสาร
        A = read_cols(urls['default'], ['law_id', 'source_url'])
        first = {}; cnt = collections.Counter(A['law_id'])
        for i, x in enumerate(A['law_id']): first.setdefault(x, i)
        entries = []
        for lid in first:
            sl = re.sub(r'^[a-z]{2}-', '', s(lid))
            title = ('เอกสารกฎหมายเลขที่ ' + sl) if sl.isdigit() else sl.replace('-', ' ').strip().capitalize()
            entries.append([s(lid), title, '', 0, 'a', first[lid], cnt[lid], 1 if MAIN.search(title) else 0])
        entries.sort(key=lambda e: (-e[7], e[1]))
        with gzip.open(f'{OUT}/world/{iso}.json.gz', 'wt', encoding='utf-8') as f:
            json.dump({'cc': iso, 'dataset': ds, 'laws': entries}, f, ensure_ascii=False, separators=(',', ':'))
        return iso, {'laws': len(entries), 'sections': len(A['law_id']), 'repealed': 0, 'inForce': len(entries), 'main': sum(e[7] for e in entries), 'dataset': ds, 'acfg': 'default', 'license': 'Official texts (ดูรายละเอียดที่ชุดข้อมูลต้นทาง)', 'lang': ''}
    if 'laws' not in urls: return iso, None
    L = read_cols(urls['laws'], ['id', 'title', 'date', 'law_status', 'source_url', 'language', 'license'])
    lawsize = sum(x[1] for x in urls['laws'])
    texts = read_cols(urls['laws'], ['text'])['text'] if lawsize < 90e6 else None
    a = read_cols(urls['articles'], ['law_id'])['law_id'] if 'articles' in urls else []
    first = {}; cnt = collections.Counter(a)
    for i, x in enumerate(a): first.setdefault(x, i)
    entries = []; arts = 0; rep = 0
    for i, lid in enumerate(L['id']):
        lid = s(lid); title = re.sub(r'^[^\w(（฀-໿一-鿿가-힯]+', '', s(L['title'][i])).strip() or lid
        st = s(L['law_status'][i]); r = 1 if REPEAL.search(st) or REPEAL.search(title[:80]) and re.search(r'\((?:repealed|ยกเลิก)\)', title, re.I) else 0
        m = 1 if MAIN.search(title) else 0
        if lid in cnt: e = [lid, title, d10(L['date'][i]), r, 'a', first[lid], cnt[lid], m]; arts += cnt[lid]
        elif texts is None or readable(texts[i]): e = [lid, title, d10(L['date'][i]), r, 'l', i, 0, m]
        else: continue
        rep += r; entries.append(e)
    entries.sort(key=lambda e: (-e[7], e[1]))
    lic = next((s(x) for x in L['license'] if x), '')[:300]
    with gzip.open(f'{OUT}/world/{iso}.json.gz', 'wt', encoding='utf-8') as f:
        json.dump({'cc': iso, 'dataset': ds, 'laws': entries}, f, ensure_ascii=False, separators=(',', ':'))
    return iso, {'laws': len(entries), 'sections': arts, 'repealed': rep, 'inForce': len(entries) - rep, 'main': sum(e[7] for e in entries), 'dataset': ds, 'license': lic,
                 'lang': collections.Counter(s(x) for x in L['language']).most_common(1)[0][0] if L['language'] else ''}
man_path = f'{OUT}/world/manifest.json'
man = json.load(open(man_path, encoding='utf-8')) if os.path.exists(man_path) else {'countries': {}}
todo = [c for c in C if c[5] and (not ONLY or c[0] in ONLY)]
with cf.ThreadPoolExecutor(6) as ex:
    for fut in cf.as_completed([ex.submit(build, c) for c in todo]):
        try:
            iso, info = fut.result()
            if info: man['countries'][iso] = info; print(iso, info['laws'], info['sections'], info['repealed'], flush=True)
            else: print(iso, 'NO DATA', flush=True)
        except Exception as e: print('ERR', e, flush=True)
man['built'] = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
man['list'] = [{'cc': c[0], 'th': c[1], 'en': c[2], 'cont': c[3], 'un': c[4], 'asean': c[0] in ASEAN} for c in C]
man['continents'] = CONT
json.dump(man, open(man_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
