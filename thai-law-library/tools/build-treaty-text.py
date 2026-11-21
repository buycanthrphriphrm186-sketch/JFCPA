#!/usr/bin/env python3
"""สร้างฐานข้อมูลเนื้อหาอนุสัญญา/สนธิสัญญาสำหรับอ่านภายในเว็บไซต์ (db/treaties/text/*.json.gz)
ลำดับแหล่ง: ตัวบทจากวิกิซอร์ซ (th/en) → บทความสรุปจากวิกิพีเดีย (th/en) → คำอธิบายจาก Wikidata
ดึงอย่างช้า ๆ ตามแนวปฏิบัติ Wikimedia (มี User-Agent, หน่วงเวลา, ลองใหม่เมื่อถูกจำกัด) และบันทึกความคืบหน้าเพื่อทำต่อได้"""
import gzip, json, os, re, sys, time, html, urllib.request, urllib.parse, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = sys.argv[1] if len(sys.argv) > 1 else '/tmp/trx'
os.makedirs(WORK, exist_ok=True)
UA = 'ThaiLawLibraryBuilder/1.0 (https://github.com/buycanthrphriphrm186-sketch/JFCPA; thailawlibrary.official@gmail.com)'
def get(url, tries=8):
    d = 3
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Encoding': 'gzip'})
            with urllib.request.urlopen(req, timeout=60) as r:
                b = r.read()
                if r.headers.get('Content-Encoding') == 'gzip': b = gzip.decompress(b)
                return json.loads(b.decode('utf-8'))
        except urllib.error.HTTPError as e:
            if e.code in (429, 503, 502): time.sleep(d); d = min(d * 2, 120); continue
            return None
        except Exception:
            time.sleep(d); d = min(d * 2, 60)
    return None
def clean_html(h):
    h = re.sub(r'<(script|style|table class="[^"]*(navbox|metadata|infobox)[^"]*")[\s\S]*?</(script|style|table)>', ' ', h)
    h = re.sub(r'<(sup|span) class="(reference|mw-editsection)[^"]*"[\s\S]*?</\1>', '', h)
    h = re.sub(r'<div class="(ws-noexport|licenseContainer|dynlayout-exempt)[^"]*"[\s\S]*?</div>', ' ', h)
    h = re.sub(r'<\s*(br|/p|/div|/li|/tr|/h[1-6]|/dd|/dt)\s*/?>', '\n', h)
    h = re.sub(r'<[^>]+>', ' ', h)
    t = html.unescape(h)
    lines = [re.sub(r'[ \t ]+', ' ', x).strip() for x in t.split('\n')]
    out = [x for x in lines if x and not re.match(r'^(\[edit\]|\^|Retrieved from|This work is|Public domain|PD-|Notes?$|References$)', x)]
    return out
def main():
    idx = json.load(gzip.open(os.path.join(ROOT, 'db/treaties/index.json.gz')))
    ids = sorted(idx['treaties'].keys())
    sl_path = os.path.join(WORK, 'sitelinks.json')
    sl = json.load(open(sl_path)) if os.path.exists(sl_path) else {}
    todo = [i for i in ids if i not in sl]
    for k in range(0, len(todo), 50):
        b = todo[k:k + 50]
        j = get('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks|descriptions|labels&languages=th|en&sitefilter=thwiki|enwiki|thwikisource|enwikisource&ids=' + '|'.join(b))
        for q in b:
            e = ((j or {}).get('entities') or {}).get(q) or {}
            sl[q] = {s: v['title'] for s, v in (e.get('sitelinks') or {}).items()}
            sl[q]['_d'] = ((e.get('descriptions') or {}).get('th') or (e.get('descriptions') or {}).get('en') or {}).get('value', '')
        json.dump(sl, open(sl_path, 'w'), ensure_ascii=False)
        time.sleep(0.5)
    print('sitelinks', len(sl), 'ws', sum(1 for v in sl.values() if 'enwikisource' in v or 'thwikisource' in v), 'wiki', sum(1 for v in sl.values() if 'enwiki' in v or 'thwiki' in v), flush=True)
    if '--links-only' in sys.argv: return
    tx_path = os.path.join(WORK, 'texts.jsonl')
    done = set()
    if os.path.exists(tx_path):
        for ln in open(tx_path):
            try: done.add(json.loads(ln)['id'])
            except Exception: pass
    f = open(tx_path, 'a')
    n = 0
    order = sorted(ids, key=lambda q: (0 if ('thwikisource' in sl.get(q, {}) or 'enwikisource' in sl.get(q, {})) else 1 if ('thwiki' in sl.get(q, {}) or 'enwiki' in sl.get(q, {})) else 2))
    for q in order:
        if q in done: continue
        s = sl.get(q, {}); rec = None
        for site, host in (('thwikisource', 'th.wikisource.org'), ('enwikisource', 'en.wikisource.org')):
            if rec or site not in s: continue
            j = get('https://%s/w/api.php?action=parse&format=json&formatversion=2&prop=text&redirects=1&page=%s' % (host, urllib.parse.quote(s[site])))
            ps = clean_html(((j or {}).get('parse') or {}).get('text', ''))
            if sum(len(x) for x in ps) > 300: rec = {'id': q, 'k': 'text', 'lang': site[:2], 'src': host + ' — ' + s[site], 'p': ps[:4000]}
            time.sleep(1.2)
        for site, host in (('thwiki', 'th.wikipedia.org'), ('enwiki', 'en.wikipedia.org')):
            if rec or site not in s: continue
            j = get('https://%s/w/api.php?action=query&format=json&formatversion=2&prop=extracts&explaintext=1&redirects=1&titles=%s' % (host, urllib.parse.quote(s[site])))
            pg = (((j or {}).get('query') or {}).get('pages') or [{}])[0]
            ex = pg.get('extract', '') or ''
            ps = [re.sub(r'^=+\s*|\s*=+$', '', x).strip() for x in ex.split('\n')]
            ps = [x for x in ps if x and x not in ('See also', 'References', 'External links', 'Notes', 'Further reading', 'อ้างอิง', 'แหล่งข้อมูลอื่น', 'ดูเพิ่ม')]
            if sum(len(x) for x in ps) > 150: rec = {'id': q, 'k': 'summary', 'lang': site[:2], 'src': host + ' — ' + s[site], 'p': ps[:1500]}
            time.sleep(1.2)
        if not rec:
            if 'thwikisource' in s or 'enwikisource' in s or 'thwiki' in s or 'enwiki' in s:
                # ถูกจำกัดการเรียกชั่วคราว: ข้ามไว้ทำรอบหน้า
                continue
            rec = {'id': q, 'k': 'meta', 'src': 'Wikidata ' + q, 'p': [s.get('_d', '')] if s.get('_d') else []}
        f.write(json.dumps(rec, ensure_ascii=False) + '\n'); f.flush(); n += 1
        if n % 50 == 0: print('fetched', n, flush=True)
    f.close()
if __name__ == '__main__':
    main()
