"""Build a local comparison of original frames and downloaded Midjourney edits."""
import html
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent
data = json.loads((ROOT / 'inputs.json').read_text())
contract = json.loads((ROOT / 'pilots/contract.json').read_text())
qa = {}
for report in (ROOT / 'minimal/qa').glob('*.json'):
    for entry in json.loads(report.read_text()).get('frames', []):
        qa[entry['id']] = entry
sections = []
completed = 0
dimensions = set()
for frame in data['frames']:
    frame_id = frame['id']
    candidates = sorted((ROOT / 'minimal/stills').glob(frame_id + '-[0-3].jpg'))
    completed += len(candidates) == 4
    figures = [f'<figure><a href="sources/{frame_id}.png"><img loading="lazy" src="sources/{frame_id}.png" alt="{frame_id} 원본"></a><figcaption>원본 · {frame["source_dimensions"][0]} × {frame["source_dimensions"][1]}</figcaption></figure>']
    for path in candidates:
        with Image.open(path) as image:
            width, height = image.size
        dimensions.add((width, height))
        rel = path.relative_to(ROOT).as_posix()
        selected = qa.get(frame_id, {}).get('selected_index') == int(path.stem[-1])
        label = '선택 후보 · ' if selected else ''
        figures.append(f'<figure class="{"selected" if selected else ""}"><a href="{rel}"><img loading="lazy" src="{rel}" alt="{frame_id} 후보 {int(path.stem[-1])+1}"></a><figcaption>{label}후보 {int(path.stem[-1])+1} · {width} × {height} <a href="{rel}" download>원본 다운로드</a></figcaption></figure>')
    sections.append(f'<section id="{frame_id}"><h2>{frame_id} <span>{html.escape(frame["title"])} · {frame["requested_time"]:.2f}s</span></h2><div class="frames">{"".join(figures)}</div></section>')
nav = ''.join(f'<a href="#{f["id"]}">{f["id"]}</a>' for f in data['frames'])
document = '''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HEPTAPOD · 원본 보존 HD 편집</title><style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#101214;color:#e1e3e5;font:14px/1.6 system-ui,sans-serif}header,main{max-width:1600px;margin:auto;padding:28px}h1{font-size:28px;margin:0 0 8px}h2{font-size:18px;font-weight:550}h2 span{font-size:13px;color:#9da5ac;margin-left:10px}p{max-width:950px;color:#aeb7bf}nav{display:flex;gap:8px;flex-wrap:wrap;padding-top:12px}nav a{padding:3px 9px;border:1px solid #32383d;border-radius:4px;font-size:12px}a{color:#b8d7dc;text-decoration:none}section{padding:18px 0 30px;border-top:1px solid #30353a;scroll-margin-top:20px}.frames{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}figure{margin:0;background:#191d21}.selected{outline:2px solid #85b7ba}img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain}figcaption{padding:9px 12px;font-size:12px;color:#a8b0b7}figcaption a{float:right}pre{white-space:pre-wrap;color:#afbfc8;border:1px solid #30363b;padding:16px}details{margin:20px 0}.status{color:#d4dedf}footer{padding:20px 28px;color:#818d95}@media(max-width:850px){.frames{grid-template-columns:repeat(2,minmax(0,1fr))}header,main{padding:16px}}@media(max-width:500px){.frames{grid-template-columns:1fr}h1{font-size:23px}}
</style><header><h1>HEPTAPOD · 원본 이미지 기반 HD 편집</h1><p class="status">COMPLETE_COUNT / 24 프레임 다운로드 · 각 프레임 후보 4장</p><p>원본 이미지 한 장과 해상도·시네마틱 컬러 그레이딩만 요청하는 공통 지시를 Midjourney의 Attach to prompt 편집으로 적용했습니다. 장면을 다시 묘사하는 기존 프롬프트는 사용하지 않았습니다. 생성 모델이 일부 의복·장비·표면 디테일을 바꿀 수 있어 원본과 함께 비교합니다. 아래 파일은 서비스가 반환한 원본 크기이며 로컬 확대를 적용하지 않았습니다.</p><details><summary>공통 편집 프롬프트</summary><pre>PROMPT</pre></details><nav>NAV</nav></header><main>SECTIONS</main><footer>원본 영상과 기존 스토리보드는 변경하지 않았습니다.</footer></html>'''
document = document.replace('COMPLETE_COUNT', str(completed)).replace('PROMPT', html.escape(contract['prompt'])).replace('NAV', nav).replace('SECTIONS', ''.join(sections))
(ROOT / 'review-minimal.html').write_text(document)
(ROOT / 'minimal/review-status.json').write_text(json.dumps({'downloaded_frames': completed, 'target_frames': 24, 'dimensions': sorted(dimensions)}, indent=2))
print(f'Review: {completed}/24 frames; dimensions={sorted(dimensions)}')
