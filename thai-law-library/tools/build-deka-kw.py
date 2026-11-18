#!/usr/bin/env python3
"""ดัชนีคำสำคัญของคำพิพากษาศาลฎีกา (korakot/deka-bulk, CC0) สำหรับช่อง “คำสำคัญในเนื้อหาคำพิพากษา”
ตัดคำภาษาไทยด้วย PyThaiNLP (newmm) จากย่อสั้น + ส่วนต้นของคำพิพากษาฉบับเต็ม แล้วสร้างดัชนีกลับด้าน (คำ → ลำดับแถว)
ผลลัพธ์: db/deka/kw/vocab.json.gz (คำ → เลขไฟล์ย่อย, จำนวนเอกสาร) และ db/deka/kw/pNN.json.gz (คำ → ลำดับแถวแบบผลต่าง ฐาน 36)
usage: python3 -I build-deka-kw.py <db_dir> [workers]"""
import sys, os, json, gzip, re, collections, requests, io, hashlib
import pyarrow.parquet as pq
from concurrent.futures import ProcessPoolExecutor
OUT = sys.argv[1] + '/deka/kw'; W = int(sys.argv[2]) if len(sys.argv) > 2 else 4
os.makedirs(OUT, exist_ok=True)
NSHARD = 64
STOP = set('และ หรือ ที่ ซึ่ง ของ ใน ให้ ได้ แต่ ว่า เป็น จาก กับ โดย มี ไม่ แล้ว ไป มา ตาม เพื่อ จึง ก็ นั้น นี้ ถ้า หาก อัน คือ ต่อ แก่ เมื่อ ยัง จะ อยู่ ด้วย'.split())
def toks(t):
    from pythainlp.tokenize import word_tokenize
    out = set()
    for w in word_tokenize(t, engine='newmm', keep_whitespace=False):
        w = w.strip().lower()
        if len(w) < 2 or w in STOP or not re.search(r'[ก-๙a-z]', w) or re.fullmatch(r'[0-9๐-๙/.\-]+', w): continue
        out.add(w)
    return out
def work(args):
    i, url, base = args
    for k in range(5):
        try: b = requests.get(url, timeout=300).content; break
        except Exception: pass
    t = pq.read_table(io.BytesIO(b), columns=['short_text', 'long_text'])
    s, l = t.column('short_text').to_pylist(), t.column('long_text').to_pylist()
    res = []
    for j in range(len(s)):
        txt = (s[j] or '') + '\n' + (l[j] or '')[:3000]
        res.append((base + j, sorted(toks(txt))))
    return i, len(s), res
if __name__ == '__main__':
    j = requests.get('https://datasets-server.huggingface.co/parquet?dataset=korakot/deka-bulk', timeout=90).json()
    files = sorted([f['url'] for f in j['parquet_files'] if f['split'] == 'train'])
    # จำนวนแถวต่อไฟล์ (อ่านเฉพาะ metadata) เพื่อคำนวณลำดับแถวรวม
    sys.path.insert(0, '/tmp/claude-0/-home-user/8d43f35d-b8a2-5a53-9d0b-47335f3272fa/scratchpad/v6')
    from rangefile import HTTPRangeFile
    counts = [pq.ParquetFile(HTTPRangeFile(u)).metadata.num_rows for u in files]
    bases = [sum(counts[:i]) for i in range(len(files))]
    print('files', len(files), 'rows', sum(counts), flush=True)
    post = collections.defaultdict(list)
    with ProcessPoolExecutor(W) as ex:
        for i, n, res in ex.map(work, [(i, u, bases[i]) for i, u in enumerate(files)]):
            for row, ws in res:
                for w in ws: post[w].append(row)
            print('file', i, n, 'vocab', len(post), flush=True)
    total = sum(counts)
    vocab = {}; shards = [dict() for _ in range(NSHARD)]
    for w, rows in post.items():
        if len(rows) < 2 or len(rows) > total * 0.25: continue
        rows.sort(); sh = int(hashlib.md5(w.encode()).hexdigest(), 16) % NSHARD
        prev = -1; enc = []
        for r in rows: enc.append(format(r - prev, 'x')); prev = r
        shards[sh][w] = ','.join(enc); vocab[w] = [sh, len(rows)]
    for k, d in enumerate(shards):
        with gzip.open(f'{OUT}/p{k:02d}.json.gz', 'wt', encoding='utf-8') as f: json.dump(d, f, ensure_ascii=False, separators=(',', ':'))
    with gzip.open(f'{OUT}/vocab.json.gz', 'wt', encoding='utf-8') as f: json.dump({'rows': total, 'shards': NSHARD, 'v': vocab}, f, ensure_ascii=False, separators=(',', ':'))
    print('DONE vocab', len(vocab), 'rows', total, flush=True)
