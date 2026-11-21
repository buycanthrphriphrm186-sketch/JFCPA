#!/usr/bin/env python3
"""ข้อมูลข้อเท็จจริงของอนุสัญญา/สนธิสัญญาทุกฉบับจาก Wikidata (SPARQL) → db/treaties/info/NN.json.gz
ต่อฉบับ: ชื่อในทุกภาษาที่มี, คำอธิบาย (ไทย/อังกฤษ), ข้อเท็จจริงทุกคุณสมบัติ (ชื่อคุณสมบัติภาษาไทย/อังกฤษ + ค่าที่อ่านได้)"""
import gzip, json, os, sys, time, urllib.request, urllib.parse
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = 'ThaiLawLibraryBuilder/1.0 (https://github.com/buycanthrphriphrm186-sketch/JFCPA; thailawlibrary.official@gmail.com)'
WORK = sys.argv[1]
def sparql(q):
    d = 5
    for t in range(8):
        try:
            req = urllib.request.Request('https://query.wikidata.org/sparql', data=urllib.parse.urlencode({'query': q, 'format': 'json'}).encode(), headers={'User-Agent': UA, 'Accept': 'application/sparql-results+json'})
            return json.loads(urllib.request.urlopen(req, timeout=120).read())['results']['bindings']
        except Exception as e:
            print('retry', e, flush=True); time.sleep(d); d = min(d * 2, 120)
    return None
idx = json.load(gzip.open(os.path.join(ROOT, 'db/treaties/index.json.gz')))
ids = sorted(idx['treaties'].keys())
st_path = os.path.join(WORK, 'info.json')
info = json.load(open(st_path)) if os.path.exists(st_path) else {}
B = 150
for k in range(0, len(ids), B):
    b = [i for i in ids[k:k + B] if i not in info]
    if not b: continue
    vals = ' '.join('wd:' + i for i in b)
    facts = sparql('''SELECT ?item ?p ?pTh ?pEn ?v ?vTh ?vEn WHERE { VALUES ?item { %s }
      ?item ?wdt ?v . ?prop wikibase:directClaim ?wdt . BIND(STRAFTER(STR(?prop), "entity/") AS ?p)
      ?prop wikibase:propertyType ?pt . FILTER(?pt IN (wikibase:WikibaseItem, wikibase:Time, wikibase:String, wikibase:Quantity, wikibase:Monolingualtext))
      OPTIONAL { ?prop rdfs:label ?pTh FILTER(LANG(?pTh)="th") } OPTIONAL { ?prop rdfs:label ?pEn FILTER(LANG(?pEn)="en") }
      OPTIONAL { ?v rdfs:label ?vTh FILTER(LANG(?vTh)="th") } OPTIONAL { ?v rdfs:label ?vEn FILTER(LANG(?vEn)="en") } }''' % vals)
    labels = sparql('SELECT ?item ?l WHERE { VALUES ?item { %s } ?item rdfs:label ?l }' % vals)
    descs = sparql('SELECT ?item ?d WHERE { VALUES ?item { %s } ?item schema:description ?d FILTER(LANG(?d) IN ("th","en")) }' % vals)
    if facts is None or labels is None: print('skip batch', k, flush=True); continue
    for i in b: info[i] = {'n': {}, 'd': {}, 'f': []}
    for r in labels:
        i = r['item']['value'].rsplit('/', 1)[1]; info[i]['n'][r['l'].get('xml:lang', '')] = r['l']['value']
    for r in descs or []:
        i = r['item']['value'].rsplit('/', 1)[1]; info[i]['d'][r['d'].get('xml:lang', '')] = r['d']['value']
    seen = set()
    for r in facts:
        i = r['item']['value'].rsplit('/', 1)[1]
        p = r['p']['value']
        if p in ('P31',) and False: pass
        v = r['v']['value']
        if v.startswith('http://www.wikidata.org/entity/'):
            v = (r.get('vTh') or r.get('vEn') or {}).get('value')
            if not v: continue
        elif r['v'].get('datatype', '').endswith('dateTime'):
            v = v[:10].lstrip('+')
        elif v.startswith('http'): continue
        key = (i, p, v)
        if key in seen: continue
        seen.add(key)
        pl = (r.get('pTh') or r.get('pEn') or {}).get('value', p)
        info[i]['f'].append([p, pl, v])
    json.dump(info, open(st_path, 'w'), ensure_ascii=False)
    print('batch', k, 'total', len(info), flush=True)
    time.sleep(2)
out = {}
for i, v in info.items():
    out.setdefault('%02d' % (int(i[1:]) % 64), {})[i] = v
os.makedirs(os.path.join(ROOT, 'db/treaties/info'), exist_ok=True)
for k, m in out.items():
    with gzip.open(os.path.join(ROOT, 'db/treaties/info/%s.json.gz' % k), 'wt', encoding='utf-8') as f: json.dump(m, f, ensure_ascii=False, separators=(',', ':'))
print('done', len(info), flush=True)
