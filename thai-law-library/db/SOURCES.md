# Data sources and licenses / แหล่งข้อมูลและสัญญาอนุญาต

Thai statutes are not subject to copyright (Copyright Act B.E. 2537, section 7).
This folder is compiled from:

1. **NitiBench-statute** — VISTEC / VISAI — MIT License — https://huggingface.co/datasets/VISAI-AI/nitibench-statute
2. **OCS Krisdika** — Open Law Data Thailand (source: Office of the Council of State, https://www.ocs.go.th/) — CC BY 4.0 — https://huggingface.co/datasets/Surathai21/ocs-krisdika
3. **thailaw-v1.0** — PyThaiNLP — CC0 1.0 — https://huggingface.co/datasets/pythainlp/thailaw-v1.0

Each law in `index.json.gz` records its `source` and `license`. Changes made: text cleanup
(PDF artifacts), splitting into sections, removing promulgating-act and appended amending-act
sections that collide with the main numbering, and attaching chapter headings as section names.
Not an official legal reference — verify against the Royal Gazette / Office of the Council of State.
