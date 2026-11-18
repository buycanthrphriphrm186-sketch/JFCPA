#!/usr/bin/env python3
"""สร้างดัชนี + ไฟล์ตัวบทแบบคงที่ (ใช้เมื่อบริการอ่านรายแถวของ Hugging Face ใช้กับชุดข้อมูลนั้นไม่ได้)
ตัวบทเก็บใน db/world/text/<CC>/<nnn>.json.gz — ข้อความตามต้นฉบับ ไม่แปล ไม่ดัดแปลง (แปลง HTML เป็นข้อความเท่านั้น)
usage: python3 -I build-static.py <parquet_dir> <db_dir> NG,BR,PW"""
import sys, os, json, gzip, re, html, collections, datetime
import pyarrow.parquet as pq
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from countries import C
SRC, OUT, ONLY = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
REPEAL = re.compile(r'repeal|revok|abrogat|revogad|no vigente|not in force|inactive|expired|superseded|annul', re.I)
MAIN = re.compile(r'\b(code|codes|código|constitution|constituição|consolidação|penal|criminal procedure|civil procedure)\b', re.I)
TAG = re.compile(r'<(script|style|noscript|head)\b[^>]*>.*?</\1>', re.S | re.I)
def clean(t):
    t = '' if t is None else str(t)
    if re.search(r'<\s*(html|body|div|p|span|br|table|td|li|a)\b', t, re.I):
        t = TAG.sub(' ', t)
        t = re.sub(r'<\s*(br|/p|/div|/li|/tr|/h[1-6])\s*/?>', '\n', t, flags=re.I)
        t = re.sub(r'<[^>]+>', ' ', t)
    t = html.unescape(t)
    t = re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), t) if re.search(r'\\u[0-9a-fA-F]{4}', t) else t
    t = re.sub(r'[ \t ]+', ' ', t); t = re.sub(r' *\n[ \n]*', '\n', t)
    return t.strip()
def readable(t):
    if len(t) < 40 or t[:12].startswith(('%PDF', 'GIF8', 'PK', '\x89PNG')): return False
    good = sum(1 for ch in t[:4000] if ch.isalpha() or ch.isspace() or ch in '.,;:()[]-–\'"/0123456789§ºª°')
    return good / max(1, min(len(t), 4000)) > 0.85
def d10(v): v = '' if v is None else str(v); return v[:10] if re.match(r'\d{4}-\d{2}-\d{2}', v) else (v[:4] if re.match(r'\d{4}', v) else '')
man_p = f'{OUT}/world/manifest.json'; man = json.load(open(man_p, encoding='utf-8'))
for cc in ONLY:
    slug = [c for c in C if c[0] == cc][0][5]
    L = pq.read_table(f'{SRC}/{cc}/laws.parquet').to_pylist()
    A = pq.read_table(f'{SRC}/{cc}/articles.parquet', columns=['law_id', 'article_number', 'title', 'text']).to_pylist()
    arts = collections.defaultdict(list)
    for a in A: arts[a['law_id']].append(a)
    d = f'{OUT}/world/text/{cc}'; os.makedirs(d, exist_ok=True)
    for f in os.listdir(d): os.unlink(f'{d}/{f}')
    entries, shard, cur, size, nsec, rep = [], 0, [], 0, 0, 0
    def flush():
        global shard, cur, size
        if cur:
            with gzip.open(f'{d}/{shard:03d}.json.gz', 'wt', encoding='utf-8') as f: json.dump(cur, f, ensure_ascii=False, separators=(',', ':'))
            shard += 1; cur = []; size = 0
    for l in L:
        lid = str(l['id']); title = clean(l['title']) or lid
        r = 1 if REPEAL.search(str(l.get('law_status') or '')) else 0
        if arts.get(lid):
            body = [[clean(a['article_number'] or a['title'] or ''), clean(a['text'])] for a in arts[lid]]
            body = [b for b in body if b[1]]
            if not body: continue
            rec = {'id': lid, 'a': body}; n = len(body)
        else:
            t = clean(l['text'])
            if not readable(t): continue
            rec = {'id': lid, 't': t[:400000]}; n = 0
        js = len(json.dumps(rec, ensure_ascii=False))
        if size + js > 1500000: flush()
        cur.append(rec); size += js; nsec += n; rep += r
        entries.append([lid, title, d10(l.get('date') or l.get('date_issued')), r, 's', shard, n, 1 if MAIN.search(title) else 0])
    flush()
    entries.sort(key=lambda e: (-e[7], e[1]))
    with gzip.open(f'{OUT}/world/{cc}.json.gz', 'wt', encoding='utf-8') as f:
        json.dump({'cc': cc, 'dataset': f'endomorphosis/ipfs_{slug}_laws', 'static': True, 'laws': entries}, f, ensure_ascii=False, separators=(',', ':'))
    lic = next((str(x['license']) for x in L if x.get('license')), '')[:300]
    man['countries'][cc] = {'laws': len(entries), 'sections': nsec, 'repealed': rep, 'inForce': len(entries) - rep, 'main': sum(e[7] for e in entries),
                            'dataset': f'endomorphosis/ipfs_{slug}_laws', 'static': True, 'shards': shard, 'license': lic,
                            'lang': collections.Counter(str(x.get('language') or '') for x in L).most_common(1)[0][0],
                            'withArticles': sum(1 for e in entries if e[6] > 0), 'wholeText': sum(1 for e in entries if e[6] == 0)}
    print(cc, len(entries), nsec, rep, 'shards', shard, flush=True)
json.dump(man, open(man_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
