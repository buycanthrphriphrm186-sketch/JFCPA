#!/usr/bin/env python3
"""จัดหมวดคำพิพากษาศาลฎีกาตามเรื่อง (สองระดับ) จากประเภทคดีและกฎหมาย/มาตราที่อ้างในแต่ละฉบับ
อ่าน db/deka/index.json.gz → เขียน db/deka/topics.json.gz
หนึ่งฉบับอยู่ได้หลายเรื่อง (เมื่ออ้างหลายมาตรา) จำนวนในแต่ละเรื่องคือจำนวนฉบับจริงที่อ้างมาตราในเรื่องนั้น"""
import gzip, json, re, collections, sys
D = 'db/deka/'
d = json.load(gzip.open(D + 'index.json.gz'))
laws, recs, types = d['laws'], d['recs'], d['types']

def num(s):
    m = re.match(r'\s*(\d+)(?:\s*/\s*(\d+))?', str(s or '').translate(str.maketrans('๐๑๒๓๔๕๖๗๘๙', '0123456789')))
    if not m: return None
    return int(m.group(1)) + (int(m.group(2)) / 1000.0 if m.group(2) else 0)

CIV = [  # ป.พ.พ. ตามบรรพ/ลักษณะ
 (1, 148.999, 'civ_gen', 'บุคคล นิติบุคคล และหลักทั่วไป'), (149, 193.999, 'civ_jur', 'นิติกรรมและสัญญา (หลักทั่วไป)'), (193.009, 193.035, 'civ_pres', 'อายุความ'),
 (194, 353.999, 'civ_obl', 'หนี้ (ผลแห่งหนี้ ลูกหนี้หลายคน โอนสิทธิ ความระงับแห่งหนี้)'), (354, 394.999, 'civ_con', 'สัญญา (เกิดสัญญา มัดจำ เบี้ยปรับ เลิกสัญญา)'),
 (395, 419.999, 'civ_unj', 'จัดการงานนอกสั่งและลาภมิควรได้'), (420, 452.999, 'civ_tort', 'ละเมิด'),
 (453, 520.999, 'civ_sale', 'ซื้อขาย ขายฝาก แลกเปลี่ยน'), (521, 536.999, 'civ_gift', 'ให้'), (537, 574.999, 'civ_lease', 'เช่าทรัพย์และเช่าซื้อ'),
 (575, 607.999, 'civ_hire', 'จ้างแรงงานและจ้างทำของ'), (608, 639.999, 'civ_carr', 'รับขน'), (640, 679.999, 'civ_loan', 'ยืม (ยืมใช้คงรูป ยืมใช้สิ้นเปลือง กู้ยืมเงิน) และฝากทรัพย์'),
 (680, 769.999, 'civ_sec', 'ค้ำประกัน จำนอง จำนำ'), (770, 796.999, 'civ_ware', 'เก็บของในคลังสินค้า'), (797, 849.999, 'civ_agent', 'ตัวแทนและนายหน้า'),
 (850, 855.999, 'civ_comp', 'ประนีประนอมยอมความ การพนันขันต่อ'), (856, 860.999, 'civ_acct', 'บัญชีเดินสะพัด'), (861, 897.999, 'civ_ins', 'ประกันภัย'),
 (898, 1011.999, 'civ_bill', 'ตั๋วเงิน (ตั๋วแลกเงิน ตั๋วสัญญาใช้เงิน เช็ค)'), (1012, 1297.999, 'civ_corp', 'หุ้นส่วนและบริษัท'),
 (1298, 1366.999, 'civ_prop', 'ทรัพย์สิน กรรมสิทธิ์ และกรรมสิทธิ์รวม'), (1367, 1386.999, 'civ_poss', 'ครอบครองและครอบครองปรปักษ์'), (1387, 1434.999, 'civ_serv', 'ภาระจำยอม สิทธิอาศัย สิทธิเหนือพื้นดิน สิทธิเก็บกิน ภารติดพัน'),
 (1435, 1598.999, 'civ_fam', 'ครอบครัว (หมั้น สมรส หย่า บิดามารดากับบุตร)'), (1599, 1755.999, 'civ_succ', 'มรดก (ทายาท พินัยกรรม การจัดการมรดก)')]
CRI = [  # ป.อ.
 (1, 106.999, 'cri_gen', 'ภาคทั่วไป (เจตนา ประมาท ป้องกัน จำเป็น พยายาม ตัวการ ผู้สนับสนุน การลงโทษ)'), (107, 146.999, 'cri_state', 'ความมั่นคงแห่งราชอาณาจักร'),
 (147, 166.999, 'cri_off', 'ความผิดต่อตำแหน่งหน้าที่ราชการ'), (167, 205.999, 'cri_just', 'ความผิดเกี่ยวกับการยุติธรรม (เบิกความเท็จ แจ้งความเท็จ)'),
 (206, 239.999, 'cri_pub', 'ความสงบสุขของประชาชน และการก่อให้เกิดภยันตราย (วางเพลิง)'), (240, 269.999, 'cri_doc', 'เงินตรา ดวงตรา และปลอมเอกสาร'), (269.001, 269.999, 'cri_card', 'บัตรอิเล็กทรอนิกส์ หนังสือเดินทาง'),
 (270, 275.999, 'cri_trade', 'ความผิดเกี่ยวกับการค้า'), (276, 287.999, 'cri_sex', 'ความผิดเกี่ยวกับเพศ'), (288, 294.999, 'cri_life', 'ความผิดต่อชีวิต (ฆ่าผู้อื่น)'),
 (295, 308.999, 'cri_body', 'ความผิดต่อร่างกาย (ทำร้ายร่างกาย ประมาทเป็นเหตุ)'), (309, 325.999, 'cri_lib', 'ความผิดต่อเสรีภาพ (หน่วงเหนี่ยว ข่มขืนใจ เปิดเผยความลับ)'),
 (326, 333.999, 'cri_def', 'หมิ่นประมาท'), (334, 336.999, 'cri_theft', 'ลักทรัพย์และวิ่งราวทรัพย์'), (337, 340.999, 'cri_rob', 'กรรโชก รีดเอาทรัพย์ ชิงทรัพย์ ปล้นทรัพย์'),
 (341, 348.999, 'cri_fraud', 'ฉ้อโกง'), (349, 351.999, 'cri_cred', 'โกงเจ้าหนี้'), (352, 356.999, 'cri_emb', 'ยักยอก'), (357, 357.999, 'cri_recv', 'รับของโจร'),
 (358, 361.999, 'cri_dmg', 'ทำให้เสียทรัพย์'), (362, 366.999, 'cri_tres', 'บุกรุก'), (367, 398.999, 'cri_petty', 'ลหุโทษ')]
CPC = [(1, 54.999, 'cpc_gen', 'บททั่วไป เขตอำนาจศาล คู่ความ การส่งคำคู่ความ'), (55, 83.999, 'cpc_suit', 'สิทธิฟ้องคดี ฟ้องซ้อน คำฟ้อง คำให้การ ฟ้องแย้ง'),
 (84, 130.999, 'cpc_evid', 'พยานหลักฐานและภาระการพิสูจน์'), (131, 168.999, 'cpc_judg', 'คำพิพากษา ฟ้องซ้ำ ดำเนินกระบวนพิจารณาซ้ำ ค่าฤชาธรรมเนียม'),
 (169, 199.999, 'cpc_trial', 'การพิจารณาคดี ประนีประนอม ขาดนัด'), (200, 222.999, 'cpc_absent', 'ขาดนัดยื่นคำให้การ/ขาดนัดพิจารณา และอนุญาโตตุลาการ'),
 (223, 252.999, 'cpc_appeal', 'อุทธรณ์และฎีกา'), (253, 270.999, 'cpc_interim', 'วิธีการชั่วคราวก่อนพิพากษา'), (271, 323.999, 'cpc_exec', 'การบังคับคดี'), (324, 999, 'cpc_other', 'วิธีพิจารณาความแพ่งอื่น ๆ')]
CRP = [(1, 39.999, 'crp_gen', 'บททั่วไป สิทธินำคดีอาญามาฟ้อง ความผิดอันยอมความได้'), (40, 51.999, 'crp_civ', 'คดีแพ่งเกี่ยวเนื่องกับคดีอาญา'),
 (52, 119.999, 'crp_war', 'หมายเรียก หมายจับ ค้น ปล่อยชั่วคราว'), (120, 156.999, 'crp_inv', 'การสอบสวน'), (157, 192.999, 'crp_suit', 'การฟ้องคดีอาญาและการพิจารณา'),
 (193, 225.999, 'crp_app', 'อุทธรณ์และฎีกาในคดีอาญา'), (226, 247.999, 'crp_evid', 'พยานหลักฐานในคดีอาญาและการบังคับตามคำพิพากษา'), (248, 999, 'crp_other', 'วิธีพิจารณาความอาญาอื่น ๆ')]
GROUPS = [('civil', 'คดีแพ่งและพาณิชย์'), ('criminal', 'คดีอาญา'), ('cpc', 'วิธีพิจารณาความแพ่ง'), ('cripro', 'วิธีพิจารณาความอาญา'), ('drug', 'คดียาเสพติด'),
 ('cheque', 'คดีเช็ค (พ.ร.บ.ความผิดอันเกิดจากการใช้เช็ค)'), ('land', 'คดีที่ดิน'), ('labour', 'คดีแรงงาน'), ('tax', 'คดีภาษีอากรและศุลกากร'), ('bankrupt', 'คดีล้มละลายและฟื้นฟูกิจการ'),
 ('ip', 'คดีทรัพย์สินทางปัญญา'), ('weapon', 'อาวุธปืนและวัตถุระเบิด'), ('traffic', 'จราจรทางบกและรถยนต์'), ('forest', 'ป่าไม้ อุทยาน สัตว์ป่า และสิ่งแวดล้อม'),
 ('family', 'เด็ก เยาวชน และครอบครัว'), ('consumer', 'คุ้มครองผู้บริโภคและสินเชื่อ'), ('comp', 'คอมพิวเตอร์และการฟอกเงิน'), ('court', 'คำวินิจฉัยชี้ขาดอำนาจหน้าที่ระหว่างศาลและคำสั่งคำร้อง'),
 ('otherlaw', 'กฎหมายอื่น ๆ'), ('nolaw', 'คำพิพากษาที่ข้อมูลต้นทางไม่ได้ระบุมาตราที่อ้าง (แยกตามปี พ.ศ.)')]
KW = [('drug', r'ยาเสพติด|วัตถุออกฤทธิ์|ยาเสพย์ติด|กัญชา|ฝิ่น'), ('cheque', r'ใช้เช็ค'), ('land', r'ที่ดิน|จัดรูปที่ดิน|ปฏิรูปที่ดิน|เวนคืน'),
 ('labour', r'แรงงาน|เงินทดแทน|ประกันสังคม|ศาลแรงงาน|แรงงานสัมพันธ์'), ('tax', r'รัษฎากร|ภาษี|ศุลกากร|สรรพสามิต|อากร'), ('bankrupt', r'ล้มละลาย'),
 ('ip', r'เครื่องหมายการค้า|ลิขสิทธิ์|สิทธิบัตร|ความลับทางการค้า|ทรัพย์สินทางปัญญา'), ('weapon', r'อาวุธปืน|เครื่องกระสุน|วัตถุระเบิด|ดอกไม้เพลิง'),
 ('traffic', r'จราจร|รถยนต์|ขนส่ง'), ('forest', r'ป่าไม้|ป่าสงวน|อุทยาน|สัตว์ป่า|สิ่งแวดล้อม|ประมง|แร่'), ('family', r'เด็ก|เยาวชน|ครอบครัว'),
 ('consumer', r'ผู้บริโภค|ทวงถามหนี้|ขายฝาก|ดอกเบี้ยเกินอัตรา|ธุรกิจสถาบันการเงิน|สถาบันการเงิน'), ('comp', r'คอมพิวเตอร์|ฟอกเงิน|อิเล็กทรอนิกส์')]

def bucket(table, s):
    v = num(s)
    if v is None: return []
    out = [k for lo, hi, k, n in table if lo <= v <= hi and not (k in ('civ_jur',) and 193.009 <= v <= 193.035)]
    # มาตรา 269/1-269/7 อยู่ในบัตรอิเล็กทรอนิกส์ ไม่ใช่ปลอมเอกสาร
    if 'cri_card' in out and 'cri_doc' in out: out.remove('cri_doc')
    return out

SUBNAME = {k: n for t in (CIV, CRI, CPC, CRP) for lo, hi, k, n in t}
SUBG = {**{k: 'civil' for _, _, k, _ in CIV}, **{k: 'criminal' for _, _, k, _ in CRI}, **{k: 'cpc' for _, _, k, _ in CPC}, **{k: 'cripro' for _, _, k, _ in CRP}}
idx = collections.defaultdict(set)
lawname = lambda i: laws[i][1] + ' ' + laws[i][0]
for ri, r in enumerate(recs):
    cat, refs, ty = r[4], r[6] or [], types[r[3]]
    hit = set()
    for ref in refs:
        li, sec = ref[0], ref[1]
        short, full = laws[li][0], laws[li][1]
        if short == 'ป.พ.พ.' or full.startswith('ประมวลกฎหมายแพ่งและพาณิชย์'):
            for k in bucket(CIV, sec) or ['civ_other']: hit.add(k)
        elif short == 'ป.อ.' or full == 'ประมวลกฎหมายอาญา':
            for k in bucket(CRI, sec) or ['cri_other']: hit.add(k)
        elif short == 'ป.วิ.พ.':
            for k in bucket(CPC, sec) or ['cpc_all']: hit.add(k)
        elif short == 'ป.วิ.อ.':
            for k in bucket(CRP, sec) or ['cripro_all']: hit.add(k)
        elif short == 'ป.ที่ดิน' or 'ประมวลกฎหมายที่ดิน' in full: hit.add('land_code')
        elif 'รัษฎากร' in full: hit.add('tax_code')
        else:
            g = next((g for g, rx in KW if re.search(rx, full)), None)
            hit.add(('kw:' + g) if g else 'O:' + re.sub(r'\s*(\(ฉบับที่.*|แก้ไขเพิ่มเติม.*)$', '', full).strip())
    if not refs:
        if ty.startswith('คำวินิจฉัย') or ty.startswith('คำสั่ง'): hit.add('court_' + str(r[3]))
        elif cat == 'พ': hit.add('civ_unspec')
        elif cat == 'อ': hit.add('cri_unspec')
        else: hit.add('nolaw_all')
    for k in hit: idx[k].add(ri)

# ฉบับที่ไม่ได้ระบุกฎหมาย/มาตราในข้อมูล: จัดเรื่องจากคำสำคัญเฉพาะในย่อสั้นและส่วนต้นของคำพิพากษา (ดัชนี db/deka/kw)
# เลือกเพียง 1 เรื่องต่อฉบับ ตามลำดับความเฉพาะเจาะจง · จำนวนแยกแสดงว่า “จัดตามคำสำคัญ”
import glob
KWI = {}
for f in sorted(glob.glob(D + 'kw/p*.json.gz')): KWI.update(json.load(gzip.open(f)))
def kwrows(w):
    out = set(); c = 0
    for x in KWI.get(w, '').split(','):
        if x: c += int(x, 16); out.add(c)
    return out
PRI = [('ข่มขืนกระทำชำเรา', 'cri_sex'), ('ปล้นทรัพย์', 'cri_rob'), ('ชิงทรัพย์', 'cri_rob'), ('กรรโชก', 'cri_rob'), ('รับของโจร', 'cri_recv'), ('ยักยอก', 'cri_emb'),
 ('ฉ้อโกง', 'cri_fraud'), ('ลักทรัพย์', 'cri_theft'), ('หมิ่นประมาท', 'cri_def'), ('วางเพลิง', 'cri_pub'), ('ทำให้เสียทรัพย์', 'cri_dmg'), ('ทำร้ายร่างกาย', 'cri_body'),
 ('เฮโรอีน', 'kwd:drug'), ('ฝิ่น', 'kwd:drug'), ('กัญชา', 'kwd:drug'), ('ยาเสพติด', 'kwd:drug'), ('ไม้หวงห้าม', 'kwd:forest'),
 ('เครื่องหมายการค้า', 'kwd:ip'), ('ลิขสิทธิ์', 'kwd:ip'), ('ศุลกากร', 'kwd:tax'), ('ภาษีอากร', 'kwd:tax'), ('เลิกจ้าง', 'kwd:labour'), ('ค่าชดเชย', 'kwd:labour'), ('ล้มละลาย', 'kwd:bankrupt'),
 ('ครอบครองปรปักษ์', 'civ_poss'), ('ภาระจำยอม', 'civ_serv'), ('พินัยกรรม', 'civ_succ'), ('มรดก', 'civ_succ'), ('หย่า', 'civ_fam'), ('ขายฝาก', 'civ_sale'), ('เช่าซื้อ', 'civ_lease'),
 ('จ้างทำของ', 'civ_hire'), ('ประกันภัย', 'civ_ins'), ('ตั๋วสัญญาใช้เงิน', 'civ_bill'), ('ตั๋วแลกเงิน', 'civ_bill'), ('นายหน้า', 'civ_agent'), ('จำนอง', 'civ_sec'), ('ค้ำประกัน', 'civ_sec'),
 ('กู้ยืม', 'civ_loan'), ('ตัวแทน', 'civ_agent'), ('หุ้นส่วน', 'civ_corp'), ('ซื้อขาย', 'civ_sale'), ('เช่า', 'civ_lease'), ('ละเมิด', 'civ_tort'), ('ฆ่า', 'cri_life')]
row2rec = {r[5]: i for i, r in enumerate(recs)}
pending = set(idx.pop('nolaw_all', set()))
pend_rows = {recs[i][5]: i for i in pending}
kwidx = collections.defaultdict(set)
for w, k in []:  # ยกเลิก: วัดแล้วความแม่นยำต่ำ (เรื่องย่อยถูก 27%)
    for row in kwrows(w) & set(pend_rows):
        i = pend_rows.pop(row); kwidx[k].add(i)
for k, s_ in kwidx.items():
    kk = 'K:' + k; idx[kk] = s_
left_ = set(pend_rows.values())
for i in left_:
    y = recs[i][2]; d = (y // 10) * 10
    k = 'Y:%d' % d; idx.setdefault(k, set()).add(i); SUBNAME[k] = 'พ.ศ. %d–%d' % (d, d + 9); SUBG[k] = 'nolaw'
idx['nolaw_all'] = set()
KWG = {'kwd:drug': 'drug', 'kwd:forest': 'forest', 'kwd:ip': 'ip', 'kwd:tax': 'tax', 'kwd:labour': 'labour', 'kwd:bankrupt': 'bankrupt'}
KWN = {'kwd:drug': 'ยาเสพติด', 'kwd:forest': 'ไม้หวงห้ามและป่าไม้', 'kwd:ip': 'เครื่องหมายการค้าและลิขสิทธิ์', 'kwd:tax': 'ภาษีอากรและศุลกากร', 'kwd:labour': 'เลิกจ้างและค่าชดเชย', 'kwd:bankrupt': 'ล้มละลาย'}
SUBNAME.update({'civ_other': 'ประมวลกฎหมายแพ่งและพาณิชย์ (มาตราอื่น ๆ)', 'cri_other': 'ประมวลกฎหมายอาญา (มาตราอื่น ๆ)', 'civ_unspec': 'คดีแพ่ง (ไม่ได้ระบุมาตรา)', 'cri_unspec': 'คดีอาญา (ไม่ได้ระบุมาตรา)',
 'cpc_all': 'วิธีพิจารณาความแพ่ง (ไม่ระบุมาตรา)', 'cripro_all': 'วิธีพิจารณาความอาญา (ไม่ระบุมาตรา)', 'land_code': 'ประมวลกฎหมายที่ดิน', 'tax_code': 'ประมวลรัษฎากร',
 'other_law': 'กฎหมายอื่น ๆ (ฉบับที่ถูกอ้างน้อย)', 'nolaw_all': 'ไม่ได้ระบุกฎหมายที่อ้าง'})
SUBG.update({'civ_other': 'civil', 'cri_other': 'criminal', 'civ_unspec': 'civil', 'cri_unspec': 'criminal', 'cpc_all': 'cpc', 'cripro_all': 'cripro', 'land_code': 'land', 'tax_code': 'tax', 'other_law': 'otherlaw', 'nolaw_all': 'nolaw'})
for i, t in enumerate(types): SUBNAME['court_' + str(i)] = t; SUBG['court_' + str(i)] = 'court'
# กฎหมายเฉพาะตามคำสำคัญ: แยกย่อยตามชื่อกฎหมายจริงที่อ้าง (พ.ร.บ. แต่ละฉบับ)
lawsub = collections.defaultdict(set)
for ri, r in enumerate(recs):
    for ref in r[6] or []:
        full = laws[ref[0]][1]
        g = next((g for g, rx in KW if re.search(rx, full)), None)
        if g and laws[ref[0]][0] not in ('ป.พ.พ.', 'ป.อ.', 'ป.วิ.พ.', 'ป.วิ.อ.'):
            base = re.sub(r'\s*(\(ฉบับที่.*|แก้ไขเพิ่มเติม.*)$', '', full).strip()
            lawsub[(g, base)].add(ri)
for (g, base), s in lawsub.items():
    k = 'L:' + g + ':' + base
    idx[k] = s; SUBNAME[k] = base; SUBG[k] = g
for k in [k for k in idx if k.startswith('kw:')]: del idx[k]
# กฎหมายอื่น ๆ: แยกตามชื่อกฎหมายที่อ้างจริง (80 ฉบับที่ถูกอ้างมากที่สุด) ที่เหลือรวมเป็น “กฎหมายอื่น ๆ”
ok_ = sorted([k for k in idx if k.startswith('O:')], key=lambda k: -len(idx[k]))
for k in ok_[:80]: SUBNAME[k] = k[2:]; SUBG[k] = 'otherlaw'
rest = set()
for k in ok_[80:]: rest |= idx.pop(k)
if rest: idx['other_law'] = rest
# รวมจำนวน “จัดตามคำสำคัญ” เข้ากับเรื่องเดียวกัน (แยกตัวเลขไว้แสดง)
kwn = {}
for k in [k for k in idx if k.startswith('K:')]:
    base = k[2:]
    if base.startswith('kwd:'):
        g = KWG[base]; tgt = next((x for x in idx if SUBG.get(x) == g and not x.startswith('K:')), None)
        if tgt is None: tgt = 'L:' + g + ':' + KWN[base]; idx[tgt] = set(); SUBNAME[tgt] = KWN[base]; SUBG[tgt] = g
        base = tgt
    elif base not in idx: idx[base] = set()
    kwn[base] = kwn.get(base, 0) + len(idx[k]); idx[base] |= idx.pop(k)
groups = []
for g, gname in GROUPS:
    subs = [k for k in idx if SUBG.get(k) == g]
    if not subs: continue
    order = {k: i for i, (_, _, k, _) in enumerate(CIV + CRI + CPC + CRP)}
    subs.sort(key=lambda k: (order.get(k, 999), -len(idx[k])))
    allr = set().union(*[idx[k] for k in subs])
    groups.append({'k': g, 'name': gname, 'n': len(allr), 'subs': [dict({'k': k, 'name': SUBNAME[k], 'n': len(idx[k])}, **({'kw': kwn[k]} if kwn.get(k) else {})) for k in subs]})
for g in groups:
    g['subs'] = [x for x in g['subs'] if x['n'] > 0]
    if g['k'] == 'nolaw': g['subs'].sort(key=lambda x: x['k'])
groups = [g for g in groups if g['subs']]
groups.sort(key=lambda x: (x['k'] in ('otherlaw', 'nolaw', 'court'), -x['n']))
out = {'v': 1, 'total': len(recs), 'note': 'จัดหมวดจากกฎหมายและมาตราที่คำพิพากษาแต่ละฉบับอ้างถึงจริงในฐานข้อมูลศาลฎีกา (หนึ่งฉบับอาจอยู่ได้หลายเรื่อง) · ฉบับที่ข้อมูลต้นทางไม่ได้ระบุมาตรา ระบบไม่เดาเรื่องให้ แต่แยกตามช่วงปี พ.ศ. เพื่อความถูกต้อง', 'groups': groups,
       'idx': {k: sorted(v, reverse=True) for k, v in idx.items()}}
json.dump(out, gzip.open(D + 'topics.json.gz', 'wt', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
for g in groups: print(g['name'], g['n'], len(g['subs']))
