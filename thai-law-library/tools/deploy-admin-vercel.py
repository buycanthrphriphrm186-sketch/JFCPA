#!/usr/bin/env python3
"""Deploy โฟลเดอร์ admin-vercel/ (ระบบหลังบ้าน) ขึ้น Vercel → https://thailawlibrary-admin.vercel.app
สร้างโปรเจกต์ให้เองในครั้งแรก · ทุกครั้งที่รันได้เวอร์ชันใหม่ (เวอร์ชันเก่าเก็บไว้ใน Vercel ย้อนกลับได้)
ใช้: VERCEL_TOKEN=xxx python3 tools/deploy-admin-vercel.py [--preview]"""
import os, sys, json, base64, time, urllib.request, urllib.error
TEAM, NAME = 'team_LvCcdbrFhkVtEpJFE0iz8ib1', 'thailawlibrary-admin'
tok = os.environ.get('VERCEL_TOKEN', 'proxy-injected')
def call(url, data=None, method='GET'):
    r = urllib.request.Request('https://api.vercel.com' + url, data=json.dumps(data).encode() if data is not None else None, method=method,
                               headers={'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json'})
    try: return json.load(urllib.request.urlopen(r, timeout=120))
    except urllib.error.HTTPError as e: return {'_status': e.code, '_body': e.read().decode()[:500]}
p = call('/v9/projects/%s?teamId=%s' % (NAME, TEAM))
if p.get('_status') == 404:
    p = call('/v11/projects?teamId=%s' % TEAM, {'name': NAME, 'framework': None}, 'POST'); print('created project', p.get('id') or p)
d = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'admin-vercel'); files = []
for f in sorted(os.listdir(d)):
    b = open(os.path.join(d, f), 'rb').read()
    files.append({'file': f, 'data': b.decode(), 'encoding': 'utf-8'} if f.endswith(('.html', '.js', '.json', '.txt', '.svg')) else {'file': f, 'data': base64.b64encode(b).decode(), 'encoding': 'base64'})
body = {'name': NAME, 'project': NAME, 'files': files, 'projectSettings': {'framework': None}}
if '--preview' not in sys.argv: body['target'] = 'production'
dep = call('/v13/deployments?teamId=%s&skipAutoDetectionConfirmation=1' % TEAM, body, 'POST')
if 'id' not in dep: print('deploy failed', dep); sys.exit(1)
print('deployment', dep['id'], dep['url'])
for _ in range(40):
    s = call('/v13/deployments/%s?teamId=%s' % (dep['id'], TEAM))
    if s.get('readyState') in ('READY', 'ERROR', 'CANCELED'): print(s['readyState'], s.get('errorMessage') or '', s.get('alias')); break
    time.sleep(4)
