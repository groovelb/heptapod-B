"""Assemble unretouched generated clips using the existing timing/encoding contract."""
from pathlib import Path
import assemble
import sys
B=Path(__file__).resolve().parent
assemble.STAGING=B/'staging-raw'
inputs=[B/'clips/C01.mp4',B/'clips/C02.mp4',B/'clips/C03.mp4',
B/'retries/continuity-r8-linked-funded/clips/C04.mp4',
B/'retries/continuity-r8-linked-funded/clips/C05.mp4',
B.parent/'video-v2-prompt-r1/clips/C06.mp4',B/'clips/C07.mp4',
B.parent/'video-v2-prompt-r1/clips/C08.mp4']
assert all(p.is_file() for p in inputs)
sys.argv=[str(Path(__file__)), '--threads','4','--inputs', *map(str,inputs)]
raise SystemExit(assemble.main())
