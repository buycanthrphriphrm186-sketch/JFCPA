#!/usr/bin/env python3
"""สร้าง src/24x_v20terms.js จาก tools/terms/terms-0N.txt (## หัวข้อ แล้วตามด้วยย่อหน้าละหนึ่งบรรทัด)"""
import glob, html, json
cl = []
for f in sorted(glob.glob('tools/terms/terms-0*.txt')):
    cur = None
    for ln in open(f, encoding='utf-8'):
        ln = ln.strip()
        if not ln: continue
        if ln.startswith('## '): cur = [ln[3:], []]; cl.append(cur)
        else: cur[1].append(ln)
import sys; sys.path.insert(0, 'tools/terms'); from extra import EXTRA
from extra2 import EXTRA2
assert len(EXTRA2) == 50
for c in cl:
    if c[0] in EXTRA: c[1].append(EXTRA[c[0]])
for i, c in enumerate(cl): c[1].insert(len(c[1]) - (1 if i == len(cl) - 1 else 0), EXTRA2[i])
out = []
toc = '<nav class="t20-toc"><b>สารบัญ</b><ol>' + ''.join('<li><a href="#t20-%d" data-t20="%d">%s</a></li>' % (i + 1, i + 1, html.escape(t)) for i, (t, _) in enumerate(cl)) + '</ol></nav>'
intro = '<p class="t20-intro">ข้อกำหนดการใช้งานเว็บไซต์คลังกฎหมาย (THAI LAW LIBRARY) ฉบับนี้ ใช้บังคับกับการเข้าถึงและการใช้งานเว็บไซต์ทุกส่วน ประกอบด้วยข้อกำหนดจำนวน %d ข้อ ผู้ใช้งานโปรดอ่านโดยละเอียดก่อนใช้งาน</p>' % len(cl)
for i, (t, ps) in enumerate(cl):
    n = i + 1
    out.append('<section class="t20-c" id="t20-%d"><h3>ข้อ %d %s</h3>%s</section>' % (n, n, html.escape(t), ''.join('<p><span class="t20-n">%d.%d</span> %s</p>' % (n, k + 1, html.escape(p)) for k, p in enumerate(ps))))
body = intro + toc + ''.join(out)
js = '<script>\n/* v20: ข้อกำหนดการใช้งาน ' + str(len(cl)) + ' ข้อ (สร้างจาก tools/terms/*.txt ด้วย tools/terms/build.py) */\nDOCS.terms = { title: \'ข้อกำหนดการใช้งาน\', icon: \'file\', body: ' + json.dumps(body, ensure_ascii=False) + ' };\n' + \
     "document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-t20]'); if (!a) return; e.preventDefault(); var t = document.getElementById('t20-' + a.getAttribute('data-t20')); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });\n</script>\n"
open('src/24x_v20terms.js', 'w', encoding='utf-8').write(js)
lens = [sum(len(p) for p in ps) for _, ps in cl]
print('clauses', len(cl), 'chars min/avg/max', min(lens), sum(lens) // len(lens), max(lens), 'total', sum(lens))
print('shortest', sorted(zip(lens, [t for t, _ in cl]))[:5])
