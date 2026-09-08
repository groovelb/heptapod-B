"""Build a local static before/after review from generated files; no browser."""
from pathlib import Path
from PIL import Image
import html
import json
import hashlib

RUN = Path(__file__).resolve().parent
E = lambda value: html.escape(str(value), quote=True)
manifest = json.loads((RUN / 'manifest.json').read_text())
records = []
for frame in manifest['frames']:
    folder = 'master' if frame['owner'] == 'root' else frame['owner']
    output = RUN / frame['output_path'] if frame.get('output_path') else RUN / 'stills' / folder / (frame['id'] + '.png')
    prompt = output.with_suffix('.txt')
    record = dict(frame)
    if output.exists():
        with Image.open(output) as im:
            record['actual_dimensions'] = list(im.size)
            im.verify()
        record['output_path'] = output.relative_to(RUN).as_posix()
        record['output_sha256'] = hashlib.sha256(output.read_bytes()).hexdigest()
        record['prompt_path'] = prompt.relative_to(RUN).as_posix() if prompt.exists() else None
        record['resolution_pass'] = record['actual_dimensions'] == [2560, 1440]
    records.append(record)

count = sum('output_path' in r for r in records)
styles = '''
*{box-sizing:border-box}body{margin:0;background:#ebede6;color:#1b2721;font:15px/1.65 system-ui,sans-serif}main{max-width:1800px;margin:auto;padding:32px}h1{font-size:clamp(28px,4vw,58px);font-weight:500;line-height:1.15}h2{font-size:24px;font-weight:500}a{color:inherit;text-underline-offset:4px}.note{background:#dfe4d9;border-left:3px solid #687a68;padding:16px 20px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0;min-width:0}img{display:block;width:100%;height:auto;background:#111}figcaption{font-size:12px;padding:8px 0}article{padding:30px 0;border-bottom:1px solid #b7c3b7}.meta{font:12px/1.7 monospace;overflow-wrap:anywhere}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;padding:18px;background:#f8f9f4}nav{display:flex;gap:18px;flex-wrap:wrap;padding:20px 0}.pending{min-height:180px;display:grid;place-items:center;background:#d8ded3;color:#556255}.still{margin-top:12px}.overlay{position:relative;aspect-ratio:1916/1080;background:#111}.overlay img{position:absolute;width:100%;height:100%;object-fit:contain}.overlay .after{opacity:.5}.overlay-label{display:flex;gap:15px;align-items:center}.overlay-label input{flex:1;accent-color:#576e58}.status{font-size:12px;color:#516451}@media(max-width:800px){main{padding:20px 16px}.pair{grid-template-columns:1fr}}
'''
parts = [f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Heptapod B · 24-frame remaster</title><style>{styles}</style></head><body><main><p>HEPTAPOD B / REMASTER V2 / {E(manifest['run_id'])}</p><h1>같은 장면.<br>새로운 시네마틱 표현.</h1><p>현재 랜딩 영상의 24개 스냅샷을 원본 MP4에서 다시 추출해 편집했습니다.</p><aside class="note"><b>생성 {count}/24 · 요청 GPT Image 2 / 2560×1440</b><br>반환 치수는 각 이미지 아래에 표시합니다. 해상도 미달도 보존하며 생성 PNG를 리사이즈하지 않았습니다.<br>이 페이지는 후보 비교용입니다. 원본 영상·랜딩은 아직 교체하지 않았고, 외형 및 스토리 연속성의 최종 합격을 뜻하지 않습니다.<br>이미지를 클릭하면 파일을 열 수 있습니다. ‘겹쳐 비교’에서 원본과 후보의 위치·크기 차이를 확인할 수 있습니다.</aside><nav>''']
for scene in manifest['scenes']:
    parts.append(f'<a href="#F{scene["scene"]:02d}-IN">{scene["scene"]:02d} {E(scene["title"])}</a>')
parts.append('</nav>')
for r in records:
    parts.append(f'<article id="{r["id"]}"><h2>{r["id"]} · {E(r["title"])}</h2><p class="meta">원본 PTS {r["pts"]}s · frame {r["frame_index"]}</p><div class="pair">')
    parts.append(f'<figure><a href="{r["baseline_path"]}"><img loading="lazy" src="{r["baseline_path"]}" alt="{r["id"]} 원본"></a><figcaption>원본 · 1916×1080 · 편집 마스터 추출 PNG</figcaption></figure>')
    if 'output_path' in r:
        size = '×'.join(map(str, r['actual_dimensions']))
        parts.append(f'<figure><a href="{r["output_path"]}"><img loading="lazy" src="{r["output_path"]}" alt="{r["id"]} 재생성 후보"></a><figcaption>재생성 후보 · {size} · {"요청 해상도 충족" if r["resolution_pass"] else "요청 해상도 미달"}</figcaption></figure></div>')
        parts.append(f'<details class="still"><summary>겹쳐 비교</summary><div class="overlay"><img loading="lazy" src="{r["baseline_path"]}" alt="원본"><img loading="lazy" class="after" src="{r["output_path"]}" alt="재생성 후보"></div><label class="overlay-label">원본<input aria-label="{r["id"]} 후보 불투명도" type="range" min="0" max="100" value="50">후보</label></details>')
        if r['prompt_path']:
            text = (RUN / r['prompt_path']).read_text()
            parts.append(f'<details><summary>전송 프롬프트</summary><pre>{E(text)}</pre></details>')
    else:
        parts.append('<div class="pending">생성 대기</div></div>')
    parts.append(f'<p class="status">원본 장면 고정: {E(r["observed_lock"])}</p></article>')
parts.append('''<p><a href="manifest.json">원본 매핑</a> · <a href="selected-candidates.json">생성 후보 실측</a> · <a href="baseline/contact-sheet.jpg">원본 24장 모아보기</a></p></main><script>document.querySelectorAll('input[type=range]').forEach(i=>i.addEventListener('input',()=>{i.closest('details').querySelector('.after').style.opacity=Number(i.value)/100}));</script></body></html>''')
page = ''.join(parts)
(RUN / 'review.html').write_text(page)
(RUN / 'selected-candidates.json').write_text(json.dumps({'generated': count, 'requested': 24, 'images': records}, ensure_ascii=False, indent=2) + '\n')
from html.parser import HTMLParser
class Links(HTMLParser):
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key in ('src', 'href') and value and not value.startswith('#'):
                assert (RUN / value).is_file(), value
Links().feed(page)
print(f'Review: {count}/24; local links verified; all generated PNG headers valid.')
