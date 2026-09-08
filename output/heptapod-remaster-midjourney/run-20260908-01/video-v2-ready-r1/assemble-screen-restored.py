"""Restore only the previously approved C08 screen fog to the raw assembly."""
from pathlib import Path
import json,sys
import assemble
B=Path(__file__).resolve().parent
inputs=[Path(x['path']) for x in json.loads((B/'staging-raw/assembly-validation.json').read_text())['inputs']]
inputs[7]=B.parent/'video-screen-fog-plate-r1/clips/C08.mp4'
assemble.STAGING=B/'staging-screen-restored'
sys.argv=[str(Path(__file__)), '--threads','4','--inputs',*map(str,inputs)]
raise SystemExit(assemble.main())
