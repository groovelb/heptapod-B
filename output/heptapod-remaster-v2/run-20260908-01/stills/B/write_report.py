import json, hashlib, struct, sys
from pathlib import Path
base=Path(__file__).resolve().parents[2]
fid, note, refs, generated_path=sys.argv[1:]
frame=next(f for f in json.loads((base/'manifest.json').read_text())['frames'] if f['id']==fid)
out=base/'stills/B'/f'{fid}.png'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
dims=list(struct.unpack('>II',out.read_bytes()[16:24]))
report={'id':fid,'source_path':frame['baseline_path'],'source_sha256':sha(base/frame['baseline_path']),'source_pts':frame['pts'],'reference_paths_and_hashes':[{'path':p,'sha256':sha(base/p)} for p in refs.split(',')],'lock_version':1,'prompt_path':f'stills/B/{fid}.txt','tool':'built-in image_gen','requested_dimensions':[2560,1440],'actual_dimensions':dims,'output_path':f'stills/B/{fid}.png','output_sha256':sha(out),'transformed_after_generation':False,'generation_source_path':generated_path,'calls':1,'status':'candidate_for_root_join_review','checks':{'baseline_inspected':True,'output_visually_inspected':True,'requested_resolution_met':dims==[2560,1440],'story_and_identity':'Visible count, pose/occlusion and camera/event state compared to exact source; requires cross-frame root review.'},'unresolved':[note,'No pixel-perfect identity or geometry preservation claim; faces not visible.']}
(base/'stills/B'/f'{fid}.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
print(fid,dims)
