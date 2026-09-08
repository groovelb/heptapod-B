"""Publish a source/regeneration comparison sheet with optional correction history."""
from pathlib import Path
from PIL import Image
import html
import json
import os
from urllib.parse import quote

RUN = Path(__file__).resolve().parent
ROOT = RUN.parents[2]
DEST = ROOT / 'docs/heptapod-b-encoder/hero-storyboard-v2-comparison.html'
data = json.loads((RUN / 'selected-candidates.json').read_text())
E = lambda x: html.escape(str(x), quote=True)
def href(path):
    return quote(os.path.relpath(path, DEST.parent), safe='/')
def dimensions(path):
    with Image.open(path) as im:
        return list(im.size)
def image_figure(path, label, frame_id):
    w, h = dimensions(path)
    caption = f'{frame_id} · {label} · {w}×{h}'
    return f'''<figure><button class="open-image" type="button" aria-label="{E(caption)} 확대"><img loading="lazy" decoding="async" src="{href(path)}" alt="{E(caption)}" width="{w}" height="{h}"></button><figcaption><b>{E(label)}</b><span>{w} × {h} px</span><a href="{href(path)}" download>이미지 저장</a></figcaption></figure>'''
def pair(before, after, frame_id, labels=('1차 · 원본 영상', '2차 · 재생성')):
    return f'''<div class="pair">{image_figure(before, labels[0], frame_id)}{image_figure(after, labels[1], frame_id)}</div><div class="overlap"><div class="stage"><img loading="lazy" src="{href(before)}" alt="{E(frame_id)} {E(labels[0])}"><img loading="lazy" class="candidate" src="{href(after)}" alt="{E(frame_id)} {E(labels[1])}"></div><label class="range-label"><span>{E(labels[0])}</span><input aria-label="{E(frame_id)} 2차 이미지 불투명도" type="range" min="0" max="100" value="50"><span>{E(labels[1])}</span></label></div>'''

css = '''
:root{--bg:#eceee7;--ink:#18271f;--muted:#627065;--line:#c6cec2;--accent:#355c43}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:100px}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.7 system-ui,-apple-system,"Apple SD Gothic Neo",sans-serif}button,input,select{font:inherit}button{cursor:pointer}a{color:inherit;text-underline-offset:4px}.wrap{max-width:1880px;margin:auto;padding:0 36px}.masthead{padding:46px 0 25px}.eyebrow,.mono{font:11px/1.7 monospace;letter-spacing:.07em;color:var(--muted)}h1{font:normal clamp(42px,6vw,88px)/1.04 Georgia,serif;letter-spacing:-.035em;margin:21px 0}h1 em{color:var(--accent)}.intro{max-width:900px}.notice{padding:14px 18px;background:#e0e5d9;border-left:3px solid #7a8b70;font-size:13px}.toolbar{position:sticky;top:0;z-index:10;background:var(--bg);padding:14px 0;border-top:1px solid var(--ink);border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}.links,.controls{display:flex;gap:14px;align-items:center;flex-wrap:wrap}.links a{font-size:12px;text-decoration:none}.toggle{background:#f5f7ef;border:1px solid var(--line);padding:7px 15px;color:var(--ink)}.toggle[aria-pressed=true]{background:var(--ink);color:var(--bg)}.scene{padding-top:35px}.scene-head{display:flex;align-items:baseline;gap:18px;border-bottom:1px solid var(--ink);padding-bottom:13px}.scene-no{font:40px Georgia,serif;color:var(--accent)}h2{font-size:26px;font-weight:500;line-height:1.3;margin:0}.scene-head .mono{margin-left:auto}.frame{padding:24px 0;border-bottom:1px solid var(--line)}.frame-title{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:13px}.frame-title h3{font:500 16px/1.4 system-ui;margin:0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px}figure{margin:0;min-width:0}.open-image{display:block;background:#0c130e;border:0;padding:0;width:100%}.open-image img{display:block;width:100%;height:auto;aspect-ratio:1916/1080;object-fit:contain}figcaption{display:flex;gap:14px;justify-content:space-between;align-items:baseline;padding-top:9px;font-size:11px;color:var(--muted)}figcaption b{font-weight:500;color:var(--ink)}.overlap{display:none}.overlay-mode .pair{display:none}.overlay-mode .overlap{display:block}.stage{position:relative;aspect-ratio:1916/1080;background:#0c130e}.stage img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.stage .candidate{opacity:.5}.range-label{display:flex;align-items:center;gap:20px;margin:12px 0;font-size:12px}.range-label input{flex:1;accent-color:var(--accent)}.frame-links{display:flex;gap:20px;flex-wrap:wrap;margin-top:13px;font-size:12px}.quality{font-size:11px;color:var(--muted)}.corrections{margin:45px 0;padding:20px;border:1px solid var(--line)}summary{cursor:pointer;font-size:16px}.corrections .frame-title{padding-top:20px}footer{margin-top:35px;padding:25px 0 45px;border-top:1px solid var(--ink);font-size:12px;color:var(--muted)}dialog{background:#101a13;color:#e5ebe0;border:1px solid #60715e;padding:14px;width:min(1700px,96vw);max-width:96vw;max-height:96vh}dialog::backdrop{background:#000e}.dialog-bar{display:flex;align-items:center;gap:14px;font-size:12px;padding-bottom:12px}.dialog-bar button{background:transparent;color:inherit;border:1px solid #5d705d;padding:5px 13px}.dialog-bar .close{margin-left:auto}.image-scroll{overflow:auto;max-height:82vh}.image-scroll img{display:block;margin:auto;max-width:100%;max-height:80vh;object-fit:contain}.image-scroll.actual img{max-width:none;max-height:none;margin:0}button:focus-visible,a:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid #6e8e70;outline-offset:4px}@media(max-width:800px){.wrap{padding:0 17px}.masthead{padding-top:28px}.pair{grid-template-columns:1fr}.scene-head{flex-wrap:wrap;gap:12px}.scene-head .mono{margin-left:0;width:100%}.toolbar{gap:12px}.links{gap:11px}figcaption{gap:8px}.frame-title{align-items:flex-start}.frame-title .mono{font-size:9px}}@media print{.toolbar,dialog,.frame-links,figcaption a,.overlap{display:none!important}.wrap{padding:0;max-width:none}.pair,.overlay-mode .pair{display:grid;grid-template-columns:1fr 1fr}.frame{break-inside:avoid}body{background:white}.scene{break-before:page}.scene:first-of-type{break-before:auto}h1{font-size:55px}.corrections{display:none}}
'''
count = sum(bool(r.get('output_path')) for r in data['images'])
parts = [f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Heptapod B · 1차 / 2차 이미지 비교</title><style>{css}</style></head><body><main class="wrap"><header class="masthead"><span class="eyebrow">HEPTAPOD B / FIRST & SECOND PASS / 2026.09.08</span><h1>Same frame.<br><em>First & second.</em></h1><p class="intro">원본 영상의 스냅샷과 이번 재생성 이미지를 같은 장면·같은 시점끼리 비교합니다. 8개 장면, {count}쌍의 이미지입니다.</p><div class="notice"><b>1차 = 현재 영상에서 추출한 원본 PNG · 2차 = 이번 재생성의 최신 선택 후보</b><br>2차는 GPT Image 2 / 2560×1440을 프롬프트에 명시했습니다. 각 파일의 실제 반환 크기를 표시하며, 생성 후 확대하지 않았습니다. 형태·장비·포즈·공간 연속성은 검수 중입니다.</div></header><div class="toolbar"><nav class="links" aria-label="장면 이동">''']
titles = {}
for r in data['images']:
    titles[r['scene']] = r['title']
for scene, title in titles.items():
    parts.append(f'<a href="#{scene}">{scene[1:]} {E(title)}</a>')
parts.append('''</nav><div class="controls"><button class="toggle" id="view-toggle" aria-pressed="false" type="button">겹쳐 보기</button><button class="toggle" id="print" type="button">인쇄</button></div></div>''')
for scene, title in titles.items():
    rows = [r for r in data['images'] if r['scene'] == scene]
    parts.append(f'<section class="scene" id="{scene}"><header class="scene-head"><span class="scene-no">{scene[1:]}</span><h2>{E(title)}</h2><span class="mono">IN / MID / OUT</span></header>')
    for r in rows:
        before = RUN / r['baseline_path']; after = RUN / r['output_path']
        parts.append(f'<article class="frame" id="{r["id"]}"><header class="frame-title"><h3>{r["id"]}</h3><span class="mono">PTS {r["pts"]}s · FRAME {r["frame_index"]}</span></header>')
        parts.append(pair(before, after, r['id']))
        parts.append('<div class="frame-links">')
        if r.get('prompt_path'):
            parts.append(f'<a href="{href(RUN / r["prompt_path"])}">2차 생성 프롬프트</a>')
        report = after.with_suffix('.json')
        if report.exists():
            parts.append(f'<a href="{href(report)}">생성·검수 기록</a>')
        parts.append(f'</div><p class="quality">2차: {"2560×1440 요청 충족" if r["resolution_pass"] else "2560×1440 요청 미달"} · 이미지 클릭 시 확대 · 100% 버튼으로 실제 픽셀 크기 확인</p></article>')
    parts.append('</section>')

revisions = [
    ('F02-MID', RUN/'stills/master/F02-MID.png', RUN/'stills/master/F02-MID-v2.png', '개구부의 높이와 개방 상태 교정'),
    ('F02-IN', RUN/'stills/A/F02-IN-attempt1.png', RUN/'stills/A/F02-IN.png', '선체·개구부·리프트 위치 교정'),
    ('F03-MID', RUN/'stills/A/F03-MID-attempt1.png', RUN/'stills/A/F03-MID.png', '개구부 크기와 상단 여백 교정'),
    ('F03-OUT', RUN/'stills/A/F03-OUT-attempt1.png', RUN/'stills/A/F03-OUT.png', '선체 표면 질감 교정'),
    ('F08-MID', RUN/'stills/C/F08-MID.attempt-1.png', RUN/'stills/C/F08-MID.png', '보행 발 자세와 원본의 부드러운 질감 교정'),
]
parts.append('<details class="corrections"><summary>재생성 내부의 첫 시도 / 교정본 비교</summary><p>위의 원본/재생성 비교와 별개로, 다시 생성한 컷의 시도 전후를 모았습니다.</p>')
for frame_id, first, second, reason in revisions:
    if first.exists() and second.exists():
        parts.append(f'<article class="frame"><header class="frame-title"><h3>{frame_id} · {E(reason)}</h3></header>')
        parts.append(pair(first, second, frame_id, ('첫 생성 시도', '선택한 교정본')))
        parts.append('</article>')
parts.append(f'''</details><footer><a href="hero-storyboard.html">기존 스토리보드</a> · <a href="{href(RUN/'review.html')}">실행 검토 페이지</a> · <a href="{href(RUN/'selected-candidates.json')}">전체 파일 매핑·실측</a><p>영상 및 현재 랜딩은 이 비교 시트 작성으로 교체되지 않습니다. 연결된 이미지 폴더 구조를 유지해서 열어 주세요.</p></footer></main><dialog id="viewer" aria-label="이미지 확대"><div class="dialog-bar"><span id="caption"></span><button id="actual" type="button">100%</button><button class="close" type="button">닫기 ×</button></div><div class="image-scroll"><img alt=""></div></dialog><script>
const viewer=document.getElementById('viewer');let opener=null;
document.querySelectorAll('.open-image').forEach(button=>button.addEventListener('click',()=>{{opener=button;const source=button.querySelector('img');const target=viewer.querySelector('img');target.src=source.src;target.alt=source.alt;document.getElementById('caption').textContent=source.alt;viewer.querySelector('.image-scroll').classList.remove('actual');document.getElementById('actual').textContent='100%';viewer.showModal();}}));
document.querySelector('.close').addEventListener('click',()=>viewer.close());viewer.addEventListener('close',()=>opener?.focus());viewer.addEventListener('click',event=>{{if(event.target===viewer)viewer.close();}});
document.getElementById('actual').addEventListener('click',event=>{{const actual=viewer.querySelector('.image-scroll').classList.toggle('actual');event.target.textContent=actual?'화면에 맞춤':'100%';}});
document.getElementById('view-toggle').addEventListener('click',event=>{{const enabled=document.body.classList.toggle('overlay-mode');event.currentTarget.setAttribute('aria-pressed',String(enabled));event.currentTarget.textContent=enabled?'나란히 보기':'겹쳐 보기';}});
document.querySelectorAll('input[type=range]').forEach(input=>input.addEventListener('input',()=>{{input.closest('.overlap').querySelector('.candidate').style.opacity=Number(input.value)/100;}}));
document.getElementById('print').addEventListener('click',()=>window.print());
</script></body></html>''')
page = ''.join(parts)
DEST.write_text(page, encoding='utf-8')
from html.parser import HTMLParser
class Validate(HTMLParser):
    ids = set()
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key == 'id':
                assert value not in self.ids, value
                self.ids.add(value)
            if key in ('src', 'href') and value and not value.startswith('#'):
                assert (DEST.parent / value).is_file(), value
Validate().feed(page)
script = page.split('<script>', 1)[1].split('</script>', 1)[0]
(RUN / 'qa/comparison-sheet-script.js').write_text(script)
assert count == 24
print(f'{DEST}: 24 source/candidate pairs, correction history, local links and IDs verified.')
