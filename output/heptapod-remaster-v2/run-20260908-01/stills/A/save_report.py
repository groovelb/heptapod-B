import sys,json,hashlib,shutil
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[2]
id,generated,notes,*refs=sys.argv[1:]
frame=next(f for f in json.loads((root/'manifest.json').read_text())['frames'] if f['id']==id)
out=root/'stills/A'/f'{id}.png'
shutil.copyfile(generated,out)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
size=list(Image.open(out).size)
report={'id':id,'source_path':frame['baseline_path'],'source_sha256':frame['source_sha256'],'source_pts':frame['pts'],'reference_paths_and_hashes':[{'path':p,'sha256':sha(root/p)} for p in refs],'lock_version':1,'prompt_path':f'stills/A/{id}.txt','tool':'built-in image_gen','requested_dimensions':[2560,1440],'actual_dimensions':size,'output_path':f'stills/A/{id}.png','output_sha256':sha(out),'transformed_after_generation':False,'checks':{'inspected_source':True,'inspected_references':True,'inspected_output':True,'status':'candidate_for_join_review','observed_lock':frame['observed_lock'],'visual_notes':notes},'unresolved':['Requested dimensions unmet' if size != [2560,1440] else '', 'Visual inspection is not proof of pixel-perfect identity or temporal consistency.'],'generation_calls':1,'generated_path':generated}
(root/'stills/A'/f'{id}.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'id':id,'size':size,'path':str(out)}))
