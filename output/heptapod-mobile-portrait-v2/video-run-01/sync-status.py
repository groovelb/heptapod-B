import hashlib,json,re,struct
from pathlib import Path
R=Path(__file__).resolve().parent; M=R.parent/'run-01'
manifest=json.loads((M/'manifest.json').read_text())
spec=json.loads((R/'specs.json').read_text())
clips=[]
for c in spec['clips']:
 p=R/'states'/f"{c['id']}.json"
 s=json.loads(p.read_text()) if p.exists() else {'status':'prepared'}
 v=next((v for v in s.get('probe',{}).get('streams',[]) if v['codec_type']=='video'),{})
 rejected=s.get('visual_qa',{}).get('accepted') is False
 clips.append({'id':c['id'],'status':'rejected' if rejected else ('running' if s.get('queue_status')=='IN_PROGRESS' and s['status']=='queued' else s['status']),'request_id':s.get('request_id'),'output_relative':f"clips/{c['id']}.mp4" if s['status']=='downloaded' else None,'width':v.get('width'),'height':v.get('height'),'frames':int(v['nb_frames']) if v.get('nb_frames') else None,'error':'; '.join(s.get('visual_qa',{}).get('issues',[])) if rejected else s.get('error')})
assembled=None
ap=R/'staging'/'assembly-validation.json'
if ap.exists():
 a=json.loads(ap.read_text())
 if (R/'staging'/'hero-portrait-raw.mp4').exists():
  o=a['outputs'][0];v=o['video'];assembled={'path':'staging/hero-portrait-raw.mp4','width':v['width'],'height':v['height'],'frames':a['total_frames'],'duration_seconds':o['duration_seconds'],'validation_path':'staging/assembly-validation.json'}
archived_requests=[json.loads(p.read_text()) for p in (R/'retries').glob('*/state.json')]
status={'status':'assembled' if assembled else 'generating','clips':clips,'assembled':assembled,'video_requests':sum(bool(c['request_id']) for c in clips)+sum(bool(s.get('request_id')) for s in archived_requests),'downloaded_count':sum(bool(c['output_relative']) for c in clips),'flagged_count':sum(c['status']=='rejected' for c in clips),'manual_targeted_revisions':len(archived_requests),'automatic_paid_retries':0}
(R/'status.json').write_text(json.dumps(status,ensure_ascii=False,indent=2)+'\n')
manifest['video_generation_requests']=status['video_requests']
manifest['status']='mobile_video_'+status['status']
for it in manifest['items']:
 p=M/'generated'/f"{it['id']}.png"
 if it['id'] in ['K06','K07','K08'] and p.exists():
  w,h=struct.unpack('>II',p.read_bytes()[16:24]); it.update(generated=str(p.relative_to(M)),width=w,height=h,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),status='selected_for_video',approved_for_video=True,note='원본 기반 세로 확장. 네 인물 및 리프트 연결/스크린 외곽 확인.' if it['id']!='K08' else '최종 순수 안개 화면. C08 첫 결과의 실내 안개 방출 오류를 수정하기 위해 끝 이미지로 지정.')
 elif it['id']=='K08' and not p.exists():it.update(status='pending',note='PC와 동일하게 마지막 컷은 시작 이미지로 생성. 완성 영상의 마지막 프레임을 추출할 예정.')
manifest['generated_count']=sum(bool(i['generated']) for i in manifest['items'])
manifest['approved_count']=sum(i['approved_for_video'] for i in manifest['items'])
(M/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
html=(M/'review.html').read_text();payload=json.dumps(manifest,ensure_ascii=False).replace('<','\\u003c')
html,n=re.subn(r'      render\(\{"status":.*?\}\);\n      if \(location.protocol',lambda _:'      render('+payload+');\n      if (location.protocol',html,count=1)
assert n==1
(M/'review.html').write_text(html)
(M/'STATUS.md').write_text('# 모바일 영상 제작 상태\n\n'+f"영상 요청 {status['video_requests']}건 / 기록 상한 {spec.get('max_total_requests',8)}건. 자동 재시도 0건.\n\n"+'\n'.join(f"- {c['id']}: {c['status']}" for c in clips)+'\n\nK03은 field-r3(리프트 본체와 배경 장비 복원)를 사용. C07 난간 소멸은 검토 표시하며 추가 생성하지 않음. 현재 재생 가능한 조립본: http://127.0.0.1:8767/previews/ . 전체 제작 상태: http://127.0.0.1:8767/video-review.html .\n')
print(json.dumps({k:v for k,v in status.items() if k not in ['clips','assembled']}))
