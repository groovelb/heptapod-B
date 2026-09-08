from pathlib import Path
import json
import os
from PIL import Image

root = Path(__file__).resolve().parents[5]
run = root / 'output/heptapod-remaster-v2/run-20260908-01'
folder = Path(__file__).resolve().parent
page = root / 'docs/heptapod-b-encoder/hero-topaz-upscale-comparison.html'

def url(p):
    return os.path.relpath(p, page.parent)

cards = []
for ident, title, detail, center in [
    ('F01-IN', '우주선 전경', '선체 가장자리 · 구름 · 원경 캠프', '30% 45%'),
    ('F06-MID', '인물과 리프트', '보호복 · 배낭 · 난간 · 벽 표면', '48% 59%'),
]:
    meta_path = folder / f'{ident}.json'
    meta = json.loads(meta_path.read_text())
    src = root / meta['source']
    out = root / meta['output']
    delivery = folder / f'{ident}-topaz-2560x1440.png'
    with Image.open(src) as im:
        source_size = im.size
    with Image.open(out) as im:
        output_size = im.size
        assert output_size == tuple(x * 2 for x in source_size), (ident, source_size, output_size)
        assert im.format == 'PNG'
    with Image.open(delivery) as im:
        assert im.size == (2560, 1440)
    meta['source_dimensions'] = source_size
    meta['output_dimensions'] = output_size
    meta['delivery'] = {'path': str(delivery.relative_to(root)), 'dimensions': [2560, 1440], 'processing': 'Lanczos aspect-fit downsample from Topaz output; centered padding, no crop'}
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n')
    before, after = url(src), url(out)
    cards.append(f'''<article>
      <header><span>{ident}</span><h2>{title}</h2><p>{detail}</p></header>
      <div class="pair"><figure><a href="{before}" target="_blank"><img src="{before}" alt="{title} 업스케일 전" width="{source_size[0]}" height="{source_size[1]}"></a><figcaption>업스케일 전 · {source_size[0]} × {source_size[1]}</figcaption></figure>
      <figure><a href="{after}" target="_blank"><img src="{after}" alt="{title} Topaz 2배 결과" width="{output_size[0]}" height="{output_size[1]}"></a><figcaption>Topaz 2× · {output_size[0]} × {output_size[1]}</figcaption></figure></div>
      <details open><summary>동일 배율 확대 비교 — 왼쪽은 브라우저 단순 확대, 오른쪽은 Topaz 결과</summary>
      <div class="detail-pair"><div class="crop" role="img" aria-label="업스케일 전 확대" style="background-image:url('{before}');background-position:{center}"><b>단순 확대</b></div><div class="crop" role="img" aria-label="Topaz 결과 확대" style="background-image:url('{after}');background-position:{center}"><b>Topaz 2×</b></div></div></details>
      <details><summary>겹쳐 비교</summary><div class="overlay"><img src="{before}" alt="업스케일 전"><img class="after" src="{after}" alt="Topaz 결과"></div><label>Topaz 표시 영역 <input type="range" min="0" max="100" value="50" aria-label="{title} Topaz 표시 영역"></label></details>
      <nav><a href="{after}" download>2배 원본 PNG 다운로드</a><a href="{url(delivery)}" download>2560 × 1440 PNG 다운로드</a></nav>
    </article>''')

page.write_text('''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Topaz 업스케일 · 대표 2장 비교</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#101214;color:#e7e8e9;font:15px/1.65 system-ui,sans-serif}main{max-width:1600px;margin:auto;padding:48px 24px}h1{font-size:clamp(26px,4vw,44px);margin:10px 0}h2{margin:4px 0;font-size:24px}p{color:#aeb5bd;margin:8px 0}a{color:#b9d9e8}article{margin:48px 0 64px;border-top:1px solid #343b42;padding-top:24px}header span,.eyebrow{color:#98b9ca;font-size:12px;letter-spacing:.12em}figure{margin:0;min-width:0}img{display:block;width:100%;height:auto}figcaption{padding:10px 0;color:#abb3bc;font-size:13px}.pair,.detail-pair{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px}summary{cursor:pointer;padding:12px 0;color:#c1c8d0}details{margin:12px 0}.crop{height:360px;background-size:220%;background-repeat:no-repeat;background-color:#000;position:relative}.crop b{position:absolute;top:12px;left:12px;background:#101214cf;padding:4px 10px;font-size:12px;font-weight:500}.overlay{position:relative}.overlay .after{position:absolute;inset:0;clip-path:inset(0 50% 0 0)}label{display:flex;align-items:center;gap:16px;margin-top:14px}input{flex:1;accent-color:#9dc4d8}nav{display:flex;gap:24px;flex-wrap:wrap;margin:24px 0}.note{max-width:950px}footer{border-top:1px solid #343b42;padding-top:24px;color:#aeb5bd}@media(max-width:700px){main{padding:28px 16px}.pair{grid-template-columns:1fr}.detail-pair{gap:8px}.crop{height:220px;background-size:320%}nav{gap:12px;font-size:13px}}@media print{body{background:white;color:black}article{break-inside:avoid}input{display:none}}
</style><main><div class="eyebrow">HEPTAPOD B · SUPER RESOLUTION PILOT</div><h1>Topaz 업스케일 — 대표 2장 비교</h1>
<p class="note">2차 재생성 이미지를 입력으로 사용했습니다. High Fidelity V3 · 실제 AI 초해상도 2배 · 얼굴 보정 끄기 · PNG. 원본 크기의 파일은 이미지를 클릭해 열 수 있습니다.</p>
<p class="note">검수: 인물 수와 주요 구도는 유지되고 보호복·난간 윤곽은 선명해졌습니다. 질감과 대비가 강해졌으며 API 출력 가장자리에 검은 테두리가 생겼습니다. 다운로드 파일은 이 흔적을 포함한 파일럿 결과입니다.</p>
<p class="note">2560 × 1440 전달본은 Topaz 결과를 비율 유지 축소한 별도 파일입니다. 확대 비교의 왼쪽은 화면 표시만 확대합니다. AI가 보강한 세부 묘사는 원본 정보의 완전한 복원을 뜻하지 않습니다.</p>
''' + '\n'.join(cards) + '''<footer><a href="hero-storyboard-v2-comparison.html">1차 / 2차 전체 이미지 비교 시트</a> · <a href="https://fal.ai/models/topaz/upscale/image/precision/api">Topaz API</a></footer></main>
<script>document.querySelectorAll('input[type=range]').forEach(input=>{input.addEventListener('input',()=>{input.closest('details').querySelector('.after').style.clipPath=`inset(0 ${100-Number(input.value)}% 0 0)`})});</script></html>''')
print(page)
