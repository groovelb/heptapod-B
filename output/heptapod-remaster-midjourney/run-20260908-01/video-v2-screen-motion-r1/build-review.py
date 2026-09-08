from pathlib import Path
import json,html
r=Path(__file__).resolve().parent
cards=[]
for cid,title in [('C06','중력 전환'),('C08','엔딩')]:
 statepath=r/'states'/f'{cid}.json';state=json.loads(statepath.read_text()) if statepath.exists() else {}
 new=r/'clips'/f'{cid}.mp4';ready=state.get('status')=='downloaded' and new.is_file()
 old=f'../video-v2-prompt-r1/clips/{cid}.mp4'
 media=f'<video controls playsinline preload="metadata" src="clips/{cid}.mp4"></video><a href="clips/{cid}.mp4" download>새 영상 다운로드</a>' if ready else '<p class="pending">생성 중입니다.</p>'
 prompt=next(c['input_template']['prompt'] for c in json.loads((r/'specs.json').read_text())['clips'] if c['id']==cid)
 cards.append(f'<section><h2>{cid} · {title} · 6초</h2><div class="pair"><article><h3>새 결과 · 움직이는 안개층</h3>{media}</article><article><h3>앞서 보여드린 결과</h3><video controls playsinline preload="metadata" src="{old}"></video><a href="{old}">이전 영상 파일</a></article></div><details><summary>실제 사용한 프롬프트</summary><p>{html.escape(prompt)}</p></details></section>')
page='''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>접촉면 안개 움직임 · 6번과 8번</title><style>body{margin:0;background:#11191a;color:#edf1ee;font:15px/1.65 system-ui}main{max-width:1600px;margin:auto;padding:30px 24px}h1{font-size:28px}h2{font-size:21px}h3{font-size:14px;color:#b5cac2;font-weight:400}section{border-top:1px solid #3a4842;margin:30px 0;padding-top:12px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}video{display:block;width:100%;background:#000}a{color:#b6dace;display:inline-block;margin:12px 0}details{margin-top:12px;color:#a4bcb0}summary{cursor:pointer}.pending{padding:60px 20px;background:#192425}@media(max-width:760px){.pair{grid-template-columns:1fr}}</style><main><h1>접촉면 안개 움직임 · 6번과 8번</h1><p>스크린의 위치와 테두리는 유지하고 안쪽 안개층이 흐르고 소용돌이치도록 요청한 새 결과입니다. 각 영상에서 재생 버튼을 눌러 확인해 주세요. 랜딩페이지에는 적용하지 않았습니다.</p>'''+''.join(cards)+'</main></html>'
(r/'review.html').write_text(page)
print('Review updated:',sum((r/'clips'/f'{cid}.mp4').exists() for cid in ['C06','C08']),'/2 files')
