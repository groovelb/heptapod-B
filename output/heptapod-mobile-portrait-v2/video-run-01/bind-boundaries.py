"""Bind an unsubmitted mobile clip to decoded frames from this run only."""
import argparse, hashlib, json, subprocess
from pathlib import Path
R=Path(__file__).resolve().parent
p=argparse.ArgumentParser()
p.add_argument('target')
p.add_argument('edge',choices=['start','end'])
p.add_argument('source')
p.add_argument('frame',choices=['first','last'])
a=p.parse_args()
assert a.target in [f'C{i:02}' for i in range(1,9)] and a.source in [f'C{i:02}' for i in range(1,9)]
state=R/'states'/f'{a.target}.json'
assert not state.exists(), 'Cannot change a clip after preparation/submission has started'
source_state=json.loads((R/'states'/f'{a.source}.json').read_text())
assert source_state['status']=='downloaded'
src=R/'clips'/f'{a.source}.mp4'
assert hashlib.sha256(src.read_bytes()).hexdigest()==source_state['output_sha256']
v=next(s for s in source_state['probe']['streams'] if s['codec_type']=='video')
n=0 if a.frame=='first' else int(v['nb_frames'])-1
out=R/'inputs'/f'{a.target}-{a.edge}-from-{a.source}-{a.frame}-{source_state["output_sha256"][:8]}.png'
out.parent.mkdir(exist_ok=True)
subprocess.run(['ffmpeg','-hide_banner','-v','error','-n','-i',str(src),'-vf',f'select=eq(n\,{n})','-frames:v','1','-fps_mode','passthrough',str(out)],check=True)
path=R/'specs.json'; d=json.loads(path.read_text());c=next(c for c in d['clips'] if c['id']==a.target)
previous=c[a.edge]
c[a.edge]={'id':out.stem,'path':str(out),'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'source_video':str(src),'source_video_sha256':source_state['output_sha256'],'source_frame':n,'keyframe_anchor':previous}
path.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
print(f'{a.target} {a.edge} <- {a.source} frame {n} (decoded unchanged)')
