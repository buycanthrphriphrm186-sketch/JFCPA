#!/usr/bin/env python3
"""รวมผลค้นไฟล์ต้นฉบับอนุสัญญาจาก Firecrawl (JSON {treaties:[{qid,pdf_url,page_url,source,signed,status}]}) เข้ากับ db/treaties/pdf.json.gz"""
import gzip, json, sys, re
P = 'db/treaties/pdf.json.gz'
d = json.load(gzip.open(P)); items = d['items']; n = 0
for f in sys.argv[1:]:
    for t in json.load(open(f)).get('treaties', []):
        q = t.get('qid'); L = items.setdefault(q, []); have = {x['u'] for x in L}
        pdf, page = (t.get('pdf_url') or '').strip().replace('&amp;', '&'), (t.get('page_url') or '').strip().replace('&amp;', '&')
        meta = ' · '.join(x for x in [('ลงนาม ' + t['signed']) if t.get('signed') else '', t.get('status') or ''] if x)
        if pdf and pdf not in have and re.match(r'^https://', pdf): L.insert(0, {'u': pdf, 'k': 'pdf', 's': t.get('source') or re.sub(r'^https?://([^/]+).*', r'\1', pdf), 't': meta, 'via': 'firecrawl'}); n += 1
        if page and page != pdf and page not in have and re.match(r'^https://', page): L.append({'u': page, 'k': 'page', 's': t.get('source') or '', 't': '', 'via': 'firecrawl'})
for k in [k for k, v in items.items() if not v]: del items[k]
TAG = ' · ค้นเพิ่มด้วย Firecrawl จากแหล่งทางการ (UN Treaty Collection, UNCTAD, กระทรวงการต่างประเทศ ฯลฯ)'
if TAG not in d.get('source', ''): d['source'] = d.get('source', '') + TAG
json.dump(d, gzip.open(P, 'wt', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('added pdf', n, 'total with links', len(items), 'with pdf', sum(1 for v in items.values() if any(x['k'] == 'pdf' for x in v)))
