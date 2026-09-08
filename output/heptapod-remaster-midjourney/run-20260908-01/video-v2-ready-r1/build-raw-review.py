"""Publish a local comparison for the unretouched generated-clip assembly."""
from pathlib import Path
import json,hashlib,html,shutil,datetime
from urllib.parse import quote
B=Path(__file__).resolve().parent
R=B/'staging-raw'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def rel(p):return quote(str(p.relative_to(B)),safe='/._-')
def esc(s):return html.escape(str(s),quote=True)
def main():
 report=json.loads((R/'assembly-validation.json').read_text())
 assert report['status']=='passed'
 for row in report['inputs']:assert sha(Path(row['path']))==row['sha256']
 for row in report['outputs']:assert sha(Path(row['path']))==row['sha256']
 old=json.loads((B/'comparison-sources.json').read_text())
 backup=B/'history/before-raw-assembly';backup.mkdir(exist_ok=True)
 for name in ['review.html','comparison-sources.json','STATUS.md']:
  if (B/name).exists() and not (backup/name).exists():shutil.copy2(B/name,backup/name)
 left=old['left']['url']+'?v='+old['left']['http_response_sha256'][:16]
 right=rel(R/'hero-scrub-1920.mp4')+'?v='+sha(R/'hero-scrub-1920.mp4')[:16]
 mobile=rel(R/'hero-scrub-960.mp4')+'?v='+sha(R/'hero-scrub-960.mp4')[:16]
 starts=[0,4.041667,12.041667,17.041667,23.041667,29.041667,35.041667,41.041667]
 buttons=''.join(f'<button data-time="{t}">C{i+1:02d}</button>' for i,t in enumerate(starts))
 page='''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>v2 후보정 없는 원본 조립본</title>
<style>*{box-sizing:border-box}body{margin:0;background:#101316;color:#eef1f4;font:15px/1.6 system-ui,sans-serif}main{max-width:1600px;margin:auto;padding:32px 24px}h1{font-size:24px}h2{font-size:18px}p{color:#b8c1ca}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}video{width:100%;background:#000;display:block}article{min-width:0}a{color:#a5d6ff}button{background:#27333e;border:1px solid #516273;color:white;padding:9px 14px;border-radius:5px;cursor:pointer}.controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:22px 0}input{flex:1;min-width:180px}footer{margin-top:24px}@media(max-width:700px){.grid{grid-template-columns:1fr}main{padding:18px}}</style>
<main><h1>v2 · 후보정 없는 생성 원본 조립본</h1><p>8개 생성 원본을 기존 순서·길이로 연결했습니다. 인물·배경·안개 합성 및 색·밝기 후보정 없음. 47.09초 · 24fps · 기존 음원.</p>
<div class="grid"><article><h2>왼쪽 · 현재 운영 랜딩페이지</h2><video id="left" controls playsinline preload="metadata" muted><source src="LEFT" type="video/mp4"></video><a href="LEFT" target="_blank" rel="noopener">운영 영상 열기</a></article>
<article><h2>오른쪽 · 후보정 없는 v2 원본 조립본</h2><video id="right" controls playsinline preload="metadata"><source src="RIGHT" type="video/mp4"></video><a href="RIGHT" target="_blank" rel="noopener">원본 조립 영상 열기</a></article></div>
<div class="controls"><button id="play">동시 재생</button><button id="pause">동시 정지</button><button data-time="0">처음부터</button><input id="seek" type="range" min="0" max="47.041667" step="0.041667" value="0" aria-label="영상 위치"><output id="time">0.00초</output></div><div class="controls">BUTTONS</div>
<footer><a href="MOBILE" target="_blank" rel="noopener">모바일 조립본</a> · <a href="staging-raw/assembly-validation.json">조립 원본 목록</a></footer></main>
<script>const l=document.getElementById('left'),r=document.getElementById('right'),s=document.getElementById('seek'),o=document.getElementById('time');function seek(t){l.currentTime=t;r.currentTime=t;s.value=t;o.value=t.toFixed(2)+'초'}document.getElementById('play').onclick=async()=>{l.currentTime=r.currentTime;await Promise.allSettled([l.play(),r.play()])};document.getElementById('pause').onclick=()=>{l.pause();r.pause()};document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>seek(Number(b.dataset.time)));s.oninput=()=>seek(Number(s.value));r.ontimeupdate=()=>{s.value=r.currentTime;o.value=r.currentTime.toFixed(2)+'초';if(!l.paused&&!r.paused&&Math.abs(l.currentTime-r.currentTime)>.12)l.currentTime=r.currentTime};</script></html>'''
 for k,v in [('LEFT',esc(left)),('RIGHT',esc(right)),('MOBILE',esc(mobile)),('BUTTONS',buttons)]:page=page.replace(k,v)
 (B/'review.html').write_text(page)
 (B/'review-raw.html').write_text(page)
 now=datetime.datetime.now(datetime.timezone.utc).isoformat()
 old['right']={'path':str((R/'hero-scrub-1920.mp4').resolve()),'sha256':sha(R/'hero-scrub-1920.mp4'),'assembly_validation':'staging-raw/assembly-validation.json','revision_label':'v2 후보정 없는 생성 원본 조립본','local_composite_clips':[],'local_color_grade_clips':[],'original_motion_reuse':[]}
 old['updated_at']=now
 old['correction']='LEFT remains current production; RIGHT uses eight unretouched generated clips, with only existing assembly framing, frame-boundary trimming, encoding and audio muxing.'
 (B/'comparison-sources.json').write_text(json.dumps(old,ensure_ascii=False,indent=2)+'\n')
 (R/'source-policy.json').write_text(json.dumps({'created_at':now,'source_policy':'unretouched generated video downloads only','paid_generation_requests':0,'compositing':False,'color_or_luma_grading':False,'optical_flow_or_person_retiming':False,'assembly_operations':['existing clip order','drop duplicate boundary first frame as existing assembly','fit original desktop/mobile dimensions','H264 web encoding','original audio packet mux'],'inputs':report['inputs']},ensure_ascii=False,indent=2)+'\n')
 (B/'STATUS.md').write_text('# 현재 비교본\n\nreview.html 오른쪽은 staging-raw/hero-scrub-1920.mp4: 후보정 없는 생성 원본 8개 조립본입니다. 왼쪽은 현재 운영 랜딩페이지 영상입니다.\n\n이전 staging/ 후보정 합본과 final-clips/는 보존 자료이며 현재 비교본이 아닙니다. 조립 출처와 규격 검증은 staging-raw/assembly-validation.json에 기록했습니다. 추가 생성 비용 없음. 운영 페이지 변경 없음.\n')
 print('READY',B/'review.html',flush=True)
if __name__=='__main__':main()
