"""Build a local before/after review without changing any image bytes."""
from pathlib import Path
from PIL import Image
import hashlib
import html
import json
import os
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / 'output/heptapod-remaster'
MANIFEST = ROOT / 'docs/heptapod-b-encoder/remaster/still-remaster-manifest.json'
data = json.loads(MANIFEST.read_text())
E = lambda x: html.escape(str(x), quote=True)

def href(path):
    return quote(os.path.relpath(path, DIR), safe='/')

labels = ['비행체 원경','개구부 형성','리프트 진입 목표','리프트 진입 실제 끝','어둠 진입 목표','어둠 진입 실제 끝','수직 상승 목표','수직 상승 실제 끝','먼 천장 접촉면','착륙 직전 끝','착륙 직전 시작','접촉벽을 향한 보행']
records = []
for f, label in zip(data['frames'], labels):
    candidates = sorted((DIR / 'stills').glob(f['id'] + '-*-v*.png'))
    if not candidates:
        continue
    out = candidates[-1]
    source = ROOT / f['source_paths'][0]
    with Image.open(out) as im:
        size = list(im.size)
    assert hashlib.sha256(source.read_bytes()).hexdigest() == f['source_sha256']
    version = out.stem.rsplit('-', 1)[-1]
    prompt = DIR / 'prompts' / f'{f["id"]}-{version}.txt'
    record = dict(asset_id=f['id'],label=label,source=f['source_paths'][0],output=out.relative_to(ROOT).as_posix(),actual_dimensions=size,target_dimensions=[3840,2160],resolution_pass=size==[3840,2160],sha256=hashlib.sha256(out.read_bytes()).hexdigest(),source_dimensions=f['source_dimensions'],uses=f['uses'],prompt_path=prompt.relative_to(ROOT).as_posix() if prompt.exists() else None,status='generated_pending_visual_review' if size==[3840,2160] else 'generated_resolution_target_unmet')
    records.append(record)

css = '''
:root{--bg:#ebede6;--ink:#1b2721;--muted:#5d6b62;--line:#c5cfc3;--accent:#3a654e}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.75 Arial,"Apple SD Gothic Neo",sans-serif}a{color:inherit;text-underline-offset:4px}button{font:inherit;cursor:pointer}.wrap{max-width:1540px;margin:auto;padding:0 45px}header{padding:45px 0 25px}.kicker,.mono{font:11px monospace;letter-spacing:.1em;color:var(--muted)}h1{font:normal clamp(48px,7vw,95px)/1 Georgia,serif;letter-spacing:-.05em;margin:25px 0}h1 i{color:var(--accent)}h2{font-size:25px;line-height:1.4;font-weight:500;margin:0}p{margin:0 0 14px}.notice{border-left:3px solid #9b7738;background:#e4dfd1;padding:18px 22px;font-size:13px}.nav{position:sticky;top:0;z-index:4;background:var(--bg);display:flex;align-items:center;gap:20px;flex-wrap:wrap;border-bottom:1px solid var(--line);padding:14px 0}.nav a{font:12px monospace;text-decoration:none}.nav button{margin-left:auto;border:1px solid var(--line);background:transparent;padding:4px 12px;font-size:12px}article{padding:42px 0;border-bottom:1px solid var(--line);scroll-margin-top:85px}.title{display:flex;gap:20px;justify-content:space-between;align-items:baseline;margin-bottom:19px}.number{font:normal 34px Georgia,serif;color:var(--accent);margin-right:15px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0;min-width:0}.frame-button{border:0;padding:0;background:#0d1510;display:block;width:100%}.frame-button img{width:100%;aspect-ratio:16/9;object-fit:contain;display:block}figcaption{display:flex;justify-content:space-between;gap:10px;font-size:11px;color:var(--muted);padding-top:9px}.detail{font-size:12px;color:var(--muted);padding-top:15px;overflow-wrap:anywhere}.actions{display:flex;gap:18px;margin-top:13px;font-size:12px}details{margin-top:18px;border-top:1px solid var(--line)}summary{cursor:pointer;padding:12px 0;font-size:13px}pre{background:#f6f7f2;padding:22px;font:12px/1.8 monospace;white-space:pre-wrap;overflow-wrap:anywhere}.promptbar{display:flex;justify-content:space-between;align-items:center}.copy{padding:4px 13px;border:1px solid var(--line);background:transparent;font-size:12px}.compare-overlay{display:none}.overlay-mode .pair{display:none}.overlay-mode .compare-overlay{display:block}.overlay-stage{position:relative;background:#0d1510;aspect-ratio:16/9}.overlay-stage img{display:block;width:100%;height:100%;object-fit:contain}.overlay-stage .after{position:absolute;inset:0;opacity:.5}.slider-label{display:flex;align-items:center;gap:20px;font-size:12px;margin-top:10px}.slider-label input{flex:1;accent-color:var(--accent)}footer{padding:35px 0;font-size:12px;color:var(--muted)}dialog{background:#111b15;color:#e9eee5;border:1px solid #64776a;padding:14px;max-width:96vw;width:1400px;max-height:96vh}dialog::backdrop{background:#000d}.dialog-tools{display:flex;gap:15px;align-items:center;margin-bottom:10px;font-size:12px}.dialog-tools button{background:none;color:inherit;border:1px solid #657367;padding:4px 12px}.dialog-tools .close{margin-left:auto}.image-scroll{max-height:80vh;overflow:auto}.image-scroll img{display:block;max-width:100%;max-height:78vh;margin:auto;object-fit:contain}.image-scroll.actual img{max-width:none;max-height:none;margin:0}.status{font-size:12px}button:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid #709378;outline-offset:4px}@media(max-width:760px){.wrap{padding:0 19px}.pair{grid-template-columns:1fr}.title{display:block}.title .mono{margin-top:12px}.nav{gap:13px}.number{font-size:28px}h2{font-size:22px}.nav button{margin-left:0}}@media print{.nav,.actions,.copy,dialog{display:none!important}.wrap{max-width:none;padding:0}.pair{display:grid;grid-template-columns:1fr 1fr}article{break-inside:avoid}details:not([open]){display:none}h1{font-size:65px}.compare-overlay{display:none!important}.overlay-mode .pair{display:grid}body{background:white}}
'''
passed = sum(r['resolution_pass'] for r in records)
parts = [f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Heptapod B · 스틸 재생성 비교</title><style>{css}</style></head><body><main class="wrap"><header><span class="kicker">HEPTAPOD B / STILL REMASTER / 2026.09.08</span><h1>The same story.<br><i>A new rendering.</i></h1><p>최종 영상에 사용된 입력 스틸을 기준으로 구도·장면을 유지하고, 내장 이미지 모델로 색감과 디테일을 다시 생성한 비교본.</p><p class="mono">GENERATED {len(records):02d} / 12 · BUILT-IN IMAGE MODEL ONLY · NO VIDEO GENERATION</p><div class="notice"><b>해상도 검사: 목표 3840×2160 / 충족 {passed}장.</b><br>각 이미지 아래에 실제 반환 크기를 표시했다. PNG는 생성 도구가 반환한 원본 그대로이며 리사이즈하지 않았다. 색감·디테일 재생성과 출력 해상도의 달성 여부를 별도로 기록한다. 이미지 클릭 후 ‘100%’로 실제 픽셀을 확인할 수 있다.</div></header><nav class="nav" aria-label="스틸 탐색">''']
for r in records:
    parts.append(f'<a href="#{r["asset_id"]}">{r["asset_id"]}</a>')
parts.append('<button id="toggle" type="button">겹쳐 비교</button></nav>')
for r in records:
    source = ROOT / r['source']; out=ROOT/r['output']
    parts.append(f'<article id="{r["asset_id"]}"><div class="title"><h2><span class="number">{r["asset_id"]}</span>{E(r["label"])}</h2><span class="mono">{E(" / ".join(r["uses"]))}</span></div><div class="pair">')
    for label,p,size in [('원본',source,r['source_dimensions']),('재생성',out,r['actual_dimensions'])]:
        caption=f'{r["asset_id"]} {label} · {size[0]}×{size[1]}'
        parts.append(f'<figure><button class="frame-button" type="button" aria-label="{E(caption)} 확대"><img loading="lazy" src="{href(p)}" alt="{E(caption)}"></button><figcaption><span>{E(label)}</span><span>{size[0]} × {size[1]} px</span></figcaption></figure>')
    parts.append(f'</div><div class="compare-overlay"><div class="overlay-stage"><img loading="lazy" src="{href(source)}" alt="원본"><img class="after" loading="lazy" src="{href(out)}" alt="재생성"></div><label class="slider-label">원본<input type="range" min="0" max="100" value="50" aria-label="{r["asset_id"]} 재생성 이미지 불투명도">재생성</label></div><p class="detail">반환 원본: {E(r["output"])}<br>해상도 판정: {"목표 충족" if r["resolution_pass"] else "3840×2160 목표 미달"}</p><div class="actions"><a href="{href(out)}" download>재생성 PNG 저장</a><a href="{href(source)}">원본 PNG 열기</a></div>')
    if r['prompt_path']:
        text = (ROOT/r['prompt_path']).read_text()
        parts.append(f'<details><summary>실제 사용한 이미지 편집 프롬프트</summary><div class="promptbar"><span class="mono">BUILT-IN IMAGE GENERATION</span><button type="button" class="copy">복사</button></div><pre>{E(text)}</pre></details>')
    parts.append('</article>')
parts.append('''<footer>기존 원본·영상은 변경하지 않았다. 전체 소스 매핑은 <a href="selected-stills.json">selected-stills.json</a>, 생성 기록은 <a href="reports/">reports/</a>에 보존했다. 원본과 새 이미지의 화면비 차이 및 생성 과정의 미세한 형태 변화는 겹쳐 보기에서 검수할 수 있다.</footer></main><dialog id="viewer" aria-label="원본 크기 이미지 보기"><div class="dialog-tools"><span id="caption"></span><button type="button" id="actual">100%</button><button type="button" class="close">닫기 ×</button></div><div class="image-scroll"><img alt=""></div></dialog><div class="status" role="status" aria-live="polite"></div><script>
const viewer=document.getElementById('viewer');let opener=null;
document.querySelectorAll('.frame-button').forEach(b=>b.addEventListener('click',()=>{opener=b;const img=b.querySelector('img');viewer.querySelector('img').src=img.src;viewer.querySelector('img').alt=img.alt;document.getElementById('caption').textContent=img.alt;viewer.querySelector('.image-scroll').classList.remove('actual');document.getElementById('actual').textContent='100%';viewer.showModal()}));
document.querySelector('.close').addEventListener('click',()=>viewer.close());viewer.addEventListener('click',e=>{if(e.target===viewer)viewer.close()});viewer.addEventListener('close',()=>opener?.focus());
document.getElementById('actual').addEventListener('click',e=>{const actual=viewer.querySelector('.image-scroll').classList.toggle('actual');e.target.textContent=actual?'화면에 맞춤':'100%'});
document.getElementById('toggle').addEventListener('click',e=>{const on=document.body.classList.toggle('overlay-mode');e.target.textContent=on?'나란히 비교':'겹쳐 비교'});
document.querySelectorAll('input[type=range]').forEach(input=>input.addEventListener('input',()=>{input.closest('.compare-overlay').querySelector('.after').style.opacity=Number(input.value)/100}));
document.querySelectorAll('.copy').forEach(b=>b.addEventListener('click',async()=>{const pre=b.closest('details').querySelector('pre');try{await navigator.clipboard.writeText(pre.textContent);b.textContent='복사됨'}catch{const range=document.createRange();range.selectNodeContents(pre);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);b.textContent='선택됨 · ⌘/Ctrl+C'}setTimeout(()=>b.textContent='복사',2500)}));
</script></body></html>''')
(DIR/'review.html').write_text(''.join(parts),encoding='utf-8')
(DIR/'selected-stills.json').write_text(json.dumps(dict(status='generation_in_progress' if len(records)<12 else ('resolution_target_unmet' if passed<12 else 'pending_visual_acceptance'),images=records),ensure_ascii=False,indent=2)+'\n')
print(f'Review built: {len(records)}/12 stills, {passed} meet requested 3840x2160.')
