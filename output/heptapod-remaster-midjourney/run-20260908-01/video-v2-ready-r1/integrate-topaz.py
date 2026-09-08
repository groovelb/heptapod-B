from pathlib import Path
import json,hashlib,subprocess,datetime
B=Path(__file__).resolve().parent
P=Path('public/heptapod-b-encoder/hero-scrub-v2-topaz')
S=B/'staging-screen-restored/hero-scrub-1920_1_prob4.mp4'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_streams','-show_format','-of','json',str(p)]))
def audio(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','a:0','-show_packets','-show_data_hash','sha256','-show_entries','packet=pts,dts,duration,size,data_hash,side_data_list','-of','json',str(p)]))['packets']
source=probe(S);source_audio=audio(S);rows=[]
for name,w,h in [('hero-scrub-3832.mp4',3832,2160),('hero-scrub-960.mp4',960,542)]:
 p=P/name;d=probe(p);v=next(x for x in d['streams'] if x['codec_type']=='video')
 assert (v['width'],v['height'])==(w,h)
 assert v['r_frame_rate']=='24/1' and v['avg_frame_rate']=='24/1' and int(v['nb_read_frames'])==1129
 assert d['format']['duration']==source['format']['duration']=='47.090000'
 assert audio(p)==source_audio
 frames=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-skip_frame','nokey','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',str(p)]))['frames']
 keys=[round(float(f['best_effort_timestamp_time'])*24) for f in frames]
 assert keys==list(range(0,1129,6))
 rows.append({'path':str(p),'sha256':sha(p),'dimensions':[w,h],'frames':1129,'fps':24,'duration':47.09,'gop':6,'audio_packets_identical_to_topaz_export':True,'bytes':p.stat().st_size})
for p,h in json.loads((B/'topaz-integration-before.json').read_text()).items():assert sha(Path(p))==h,p
subprocess.run(['ffmpeg','-v','error','-y','-i',str(S),'-frames:v','1','-q:v','2',str(P/'hero-scrub-poster.jpg')],check=True)
p=Path('src/data/heptapodHeroStory.js');s=p.read_text().replace('/hero-scrub-v2-screen-restored/','/hero-scrub-v2-topaz/').replace('hero-scrub-v2-topaz/hero-scrub-1920.mp4','hero-scrub-v2-topaz/hero-scrub-3832.mp4');p.write_text(s)
p=Path('scripts/test-mobile-hero.mjs');s=p.read_text().replace('/hero-scrub-v2-screen-restored/','/hero-scrub-v2-topaz/');p.write_text(s)
p=Path('.claude/skills/component-work/resources/components.md');s=p.read_text().replace('기본 v2(C01–C07 원본 + 승인 C08 스크린 연기)', '기본 v2(사용자 Topaz 3832×2160 업스케일본, C01–C07 원본 + 승인 C08 스크린 연기)');p.write_text(s)
record={'status':'integrated','created_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':str(S),'source_sha256':sha(S),'source_topaz_metadata':source['format'].get('tags',{}).get('videoai'),'operations':['desktop: same resolution, H264 CRF18 GOP6 web encoding','mobile: Lanczos resize to existing 960x542 layout, H264 CRF21 GOP6','copy Topaz export AAC packets','extract matching first-frame poster'],'new_visual_edits':False,'original_control_unchanged':True,'production_deployment_performed':False,'outputs':rows}
(B/'topaz-landing-integration.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print('PASS: Topaz master integrated; 4K desktop/mobile derived from same export; 1129 frames,24fps,47.09s,unchanged audio and original control.')
