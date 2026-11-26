#!/usr/bin/env python3
"""Deploy โฟลเดอร์ vercel/ ขึ้น Vercel (โปรเจกต์ thailawlibrary → https://thailawlibrary.vercel.app)
ทุกครั้งที่รันจะได้เวอร์ชันใหม่ (เก็บเวอร์ชันเก่าไว้ใน Vercel ย้อนกลับได้) · ต้องมีโทเคน Vercel ในตัวแปร VERCEL_TOKEN
ใช้: VERCEL_TOKEN=xxx python3 tools/deploy-vercel.py [--preview]"""
import os, sys, json, base64, time, urllib.request
TEAM, PROJECT = 'team_LvCcdbrFhkVtEpJFE0iz8ib1', 'prj_OedAAFgarw3e9o9YbDtCtOWEUFB8'
tok = os.environ.get('VERCEL_TOKEN', 'proxy-injected')
d = os.path.join(os.path.dirname(__file__), '..', 'vercel'); files = []
for f in sorted(os.listdir(d)):
    b = open(os.path.join(d, f), 'rb').read()
    files.append({'file': f, 'data': b.decode(), 'encoding': 'utf-8'} if f.endswith(('.html', '.js', '.json', '.webmanifest', '.txt', '.xml')) else {'file': f, 'data': base64.b64encode(b).decode(), 'encoding': 'base64'})
body = {'name': 'thailawlibrary', 'project': PROJECT, 'files': files, 'projectSettings': {'framework': None}}
if '--preview' not in sys.argv: body['target'] = 'production'
def call(url, data=None, method='GET'):
    r = urllib.request.Request('https://api.vercel.com' + url, data=json.dumps(data).encode() if data else None, method=method, headers={'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(r, timeout=120))
dep = call('/v13/deployments?teamId=%s&skipAutoDetectionConfirmation=1' % TEAM, body, 'POST'); print('deployment', dep['id'], dep['url'])
for _ in range(40):
    s = call('/v13/deployments/%s?teamId=%s' % (dep['id'], TEAM))
    if s['readyState'] in ('READY', 'ERROR', 'CANCELED'): print(s['readyState'], s.get('errorMessage') or '', s.get('alias')); break
    time.sleep(5)
