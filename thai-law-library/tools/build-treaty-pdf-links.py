import gzip, json, sys, time, urllib.request, urllib.parse
UA = 'ThaiLawLibraryBuilder/1.0 (https://github.com/buycanthrphriphrm186-sketch/JFCPA)'
def sparql(q):
    d=5
    for t in range(6):
        try:
            req = urllib.request.Request('https://query.wikidata.org/sparql', data=urllib.parse.urlencode({'query': q, 'format': 'json'}).encode(), headers={'User-Agent': UA, 'Accept': 'application/sparql-results+json'})
            return json.loads(urllib.request.urlopen(req, timeout=120).read())['results']['bindings']
        except Exception as e: print('retry', e, flush=True); time.sleep(d); d*=2
    return []
idx = json.load(gzip.open('/home/user/JFCPA/thai-law-library/db/treaties/index.json.gz'))
ids = sorted(idx['treaties'].keys())
out = {}
for k in range(0, len(ids), 300):
    vals = ' '.join('wd:' + i for i in ids[k:k+300])
    r = sparql('''SELECT ?item ?p ?v WHERE { VALUES ?item { %s } VALUES ?p { "P996" "P953" "P4231" "P4222" "P9966" "P8609" }
      ?item ?wdt ?v . FILTER(STR(?wdt) = CONCAT("http://www.wikidata.org/prop/direct/", ?p)) }''' % vals)
    for b in r:
        q = b['item']['value'].split('/')[-1]; out.setdefault(q, {}).setdefault(b['p']['value'], []).append(b['v']['value'])
    print(k, len(out), flush=True)
json.dump(out, open('links2.json', 'w'), ensure_ascii=False)
import collections
c = collections.Counter(p for v in out.values() for p in v); print(c)
