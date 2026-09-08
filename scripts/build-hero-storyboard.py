"""Build a local, image-embedded production storyboard from the selected final cut.

Run: python3 scripts/build-hero-storyboard.py
Requires ffmpeg / ffprobe. Does not generate media or call external services.
"""
from pathlib import Path
from functools import lru_cache
import base64
import html
import json
import os
import re
import subprocess
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/heptapod-b-encoder/hero-storyboard.html'
CACHE = ROOT / 'tmp/storyboard-audit/frames'
MOTION = ROOT / 'public/heptapod-b-encoder/hero-motion'
FINAL = MOTION / 'kling-audio-01-final/kling-audio-01-final-hero-v1-source01v2-screenfillv4.mp4'
CACHE.mkdir(parents=True, exist_ok=True)
E = lambda value: html.escape(str(value), quote=True)

SCENES = [
    dict(id='kling-audio-v2-01-02-fast-lowwind-no-cut', start=0, end=4, shot='01 → 02', title='도착', en='The arrival', act='I · THE THRESHOLD',
         action='안개가 깔린 평원 위에 거대한 검은 비행체가 떠 있다. 카메라가 그 아래로 다가가며, 풍경의 규모가 입구의 규모로 바뀐다.', camera='원경 → 하부 앙각. 안개와 지면의 시차를 동반한 빠른 전진.', sound='깊고 낮은 바람, 부드러운 저역 압력음. 접근과 함께 완만하게 커진다.', continuity='검은 난형 비행체, 회색 보호복, 검은 리프트와 장비. 외부의 저채도 녹회색을 유지한다.', ref='s1·s2 — 외부 규모와 흐린 자연광', still=[1,2], note='최종본의 첫 클립은 lowwind v2. 전체 비행체 원경이 실제로 포함된다.'),
    dict(id='kling-audio-02-03-slow-lift-hole-only-no-cut', start=4, end=12, shot='02 → 03', title='문이 열리다', en='An opening in the surface', act=None,
         action='무광의 검은 표면에 둥근 사각형 입구가 열린다. 네 명의 연구원을 태운 산업용 리프트가 천천히 상승한다.', camera='고정에 가까운 입구 관찰. 8초 동안 개구부와 리프트의 변화에 집중한다.', sound='낮은 리프트 모터음, 약한 공기압 소리, 얇은 외부 환경음.', continuity='선체와 주변 지형은 고정한다. 출입 방식은 개구부 아래에서 올라가는 리프트다.', ref='s3 — 개구부 구조 / s4·s5 — 승강 장치와 인체 규모', still=[2,3], note='최종 합본은 이 구간에 초기 hole-only 버전을 사용한다. 같은 구간의 v2·v3 비교안과 구분한다.'),
    dict(id='kling-audio-03-05-direct-lift-up-camera-zoom-v1', start=12, end=17, shot='03 → 05', title='어둠의 문턱', en='Into the dark', act=None,
         action='리프트가 같은 입구를 향해 수직으로 오른다. 연구원들의 등이 가까워지고, 외부 풍경이 프레임 밖으로 사라진다.', camera='같은 축을 유지한 푸시인 또는 줌. 옆으로 돌거나 반대편을 보지 않는다.', sound='바깥 바람이 잦아들고, 부드러운 압력음과 희미한 모터·난간 진동이 남는다.', continuity='이전 영상의 마지막 프레임에서 이어진다. 입구 안쪽은 빛이나 장식이 없는 검은 공간이다.', ref='s3 — 입구 통과 / s4·s5 — 리프트 진입 동작', still=[3,5], note='Shot 04를 거치지 않는 직접 연결. 시작 이미지는 앞 클립에서 추출한 실제 프레임이다.'),
    dict(id='kling-audio-05-07-direct-same-axis-ascent-v2', start=17, end=23, shot='05 → 07', title='끝을 알 수 없는 상승', en='The vertical passage', act='II · A CHANGE OF GRAVITY',
         action='연구원들과 함께 어두운 내부로 들어간다. 높은 곳의 작은 빛이 목적지를 암시하지만, 도착하기까지의 거리는 여전히 아득하다.', camera='리프트와 같은 수직축을 따라 상승. 위를 보던 방향을 유지한다.', sound='낮은 바람 압력과 깊은 내부 공명. 부드럽고 끊김 없이 이어진다.', continuity='네 사람은 난간 뒤에서 자세만 미세하게 조정한다. 먼 접촉면이 너무 빨리 커지지 않도록 한다.', ref='s6 — 내부 재질과 어두운 노출 / s7 — 수직 공간의 규모', still=[5,7], note='Shot 06을 건너뛰고 Shot 05에서 07로 연결한 same-axis v2.'),
    dict(id='kling-audio-07-09-direct-ceiling-far-v4-still-workers', start=23, end=29, shot='07 → 09', title='머리 위의 빛', en='A distant ceiling', act=None,
         action='작은 빛이 넓은 천장 접촉면으로 읽히기 시작한다. 연구원들은 리프트에 선 채로 상승하고, 공간의 거대한 높이가 드러난다.', camera='절제된 위쪽 전진과 느린 줌. 수평 이동이나 카메라 회전은 없다.', sound='연속적인 저주파 압력음과 깊은 실내 공기 공명.', continuity='중력 전환 이전. 접촉면은 아직 멀리 있는 천장이며, 걷거나 리프트를 벗어나는 동작이 없다.', ref='s6·s7 — 천장면, 인체 대비 건축 규모', still=[7,9], note='Shot 08을 생략. 먼 천장과 정지한 연구원을 강조한 ceiling-far v4를 채택했다.'),
    dict(id='kling-audio-09-10-gravity-reorientation-v1', start=29, end=35, shot='09 → 10', title='세계가 방향을 바꾼다', en='Gravity reorients', act=None,
         action='머리 위에 있던 빛이 정면의 벽이 된다. 같은 공간 안에서 기준 방향이 바뀌고, 리프트는 착륙면에 도달한다.', camera='연출 지시: 6초에 걸친 완만한 90도 롤·틸트. 무게감 있는 방향 전환.', sound='깊은 내부 공명 아래로 아주 낮은 중력 전환음이 더해진다.', continuity='최종 프레임까지 연구원들은 리프트에 남아 있다. 옷, 장비, 난간과 공간 재질을 유지한다.', ref='s7 — 중력 재정렬 / s6·s8 — 정면 접촉벽', still=[9,10], note='09→10 gravity-reorientation v1. 카메라 항목은 저장된 프롬프트의 연출 의도다.'),
    dict(id='kling-audio-10-11-walk-to-wide-wall-v2', start=35, end=41, shot='10 → 11', title='첫걸음', en='The first steps', act='III · FIRST CONTACT',
         action='중력이 안정된 뒤, 네 명의 연구원이 리프트에서 내려 넓은 빛의 막을 향해 걷기 시작한다.', camera='뒤에서 바라보는 차분한 시점. 거의 고정하거나 아주 조금 전진한다.', sound='희미한 옷감 움직임과 조심스러운 발소리. 낮은 실내 압력음이 받친다.', continuity='이 시퀀스에서 처음으로 걷는 구간이다. 접촉막은 제자리에 있는 물리적 벽으로 유지한다.', ref='s6·s8 — 빛의 벽과 사람의 크기 관계', still=[10,11], note='하차 후 첫 보행을 지정한 walk-to-wide-wall v2.'),
    dict(id='kling-audio-11-screen-fill-camera-push-v4', start=41, end=47.081, shot='11 → SCREEN', title='빛 너머, 당신의 차례', en='Your turn to answer', act=None,
         action='카메라가 빛의 막을 향해 다가간다. 사람과 공간이 화면 밖으로 밀려나고, 밝은 접촉면이 다음 체험으로 이어질 바탕이 된다.', camera='같은 정면축의 부드러운 전진·줌. 벽은 고정하고 카메라가 가까워진다.', sound='작은 발소리와 옷감 소리가 사라지며, 부드러운 막의 공간음으로 이어진다.', continuity='생성 지시에서는 마지막 2초를 화면 전체의 접촉면으로 요청했다. 실제 프레임은 아래 스냅샷으로 확인한다.', ref='s8 — 접촉면 질감 / s9 — 이후 로고그램 응답의 개념 참고', still=[11], note='시작 프레임 한 장으로 생성한 screen-fill v4. 연기 분출 방식 대신 고정된 막을 향한 전진을 지시했다.'),
]

def rel(path):
    return Path(path).resolve().relative_to(ROOT).as_posix()

def href(path):
    return quote(os.path.relpath(path, OUT.parent), safe='/')

def link(path, label=None):
    return f'<a href="{href(path)}">{E(label or rel(path))} ↗</a>'

def tc(t):
    return f'{int(t)//60:02d}:{t%60:05.2f}'

def extract(source, t, target, width=1000):
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-ss',str(t),'-i',str(source),'-frames:v','1','-vf',f'scale={width}:-2','-q:v','3','-y',str(target)], check=True)

@lru_cache(maxsize=None)
def embedded(path):
    path = Path(path)
    if path.suffix.lower() == '.png':
        data = subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-vf','scale=900:-2','-frames:v','1','-f','image2pipe','-vcodec','mjpeg','-q:v','3','-'])
    else:
        data = path.read_bytes()
    return 'data:image/jpeg;base64,' + base64.b64encode(data).decode()

def figure(path, caption, cls=''):
    return f'<figure class="{cls}"><button class="image-open" type="button" aria-label="{E(caption)} 확대"><img loading="lazy" src="{embedded(str(path))}" alt="{E(caption)}"></button><figcaption>{E(caption)}</figcaption></figure>'

def disclosure(title, body, cls=''):
    return f'<details class="{cls}"><summary>{E(title)}</summary><div class="detail-body">{body}</div></details>'

def prompt_box(text, label='원문 프롬프트'):
    return f'<div class="prompt-box"><div class="prompt-bar"><span>{E(label)}</span><button type="button" class="copy">복사</button></div><pre>{E(text)}</pre></div>'

records = {}
submission_files = sorted(MOTION.rglob('*.json'))
for path in submission_files:
    for record in json.loads(path.read_text()).get('submissions', []):
        records[record['id']] = (record, path)

master_path = ROOT / 'docs/heptapod-b-encoder/05-hero-cinematic-prompt-template.md'
master = master_path.read_text()
still_prompts = {int(n): text.strip() for n,text in re.findall(r'### Shot (\d+),[^\n]*\n+```text\n(.*?)```', master, re.S)}

for number,s in enumerate(SCENES,1):
    s['number'] = number
    s['record'], s['submission'] = records[s['id']]
    s['source'] = (ROOT/'tmp/fal-runner'/s['record']['output']).resolve()
    assert s['source'].is_file(), s['source']
    s['frames'] = []
    for key,t in [('in',s['start']+0.16),('mid',(s['start']+s['end'])/2),('out',s['end']-0.16)]:
        target = CACHE / f'{number:02d}-{key}.jpg'
        extract(FINAL, t, target)
        s['frames'].append((target,t))

probe = json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=width,height,r_frame_rate,codec_type','-of','json',str(FINAL)]))
video_info = next(s for s in probe['streams'] if s['codec_type']=='video')
duration = float(probe['format']['duration'])

CSS = '''
:root{--paper:#ecebe5;--ink:#202824;--muted:#5d665f;--line:#c5c9bf;--accent:#48634f;--white:#f7f7f1}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:82px}body{margin:0;background:var(--paper);color:var(--ink);font-family:Arial,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;font-size:15px;line-height:1.75}a{color:inherit;text-decoration-thickness:1px;text-underline-offset:4px}button{font:inherit;color:inherit;cursor:pointer}button:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid #6b906b;outline-offset:4px}.wrap{max-width:1440px;margin:auto;padding:0 64px}.topbar{position:sticky;top:0;z-index:5;background:rgba(236,235,229,.97);border-bottom:1px solid var(--line)}.topbar .wrap{display:flex;align-items:center;justify-content:space-between;gap:24px;min-height:62px}.brand,.eyebrow,.mono,.tag,figcaption{font-family:monospace;font-size:11px;letter-spacing:.07em}.brand{letter-spacing:.16em}.nav{display:flex;gap:22px;align-items:center;font-size:12px}.nav a{text-decoration:none}.print-btn,.copy,.small-btn{background:transparent;border:1px solid var(--line);padding:5px 12px;font-size:12px}.masthead{padding:65px 0 38px}.eyebrow{color:var(--accent);text-transform:uppercase;letter-spacing:.17em}h1{font-family:Georgia,"Times New Roman",serif;font-weight:400;font-size:clamp(65px,9vw,142px);line-height:.95;letter-spacing:-.055em;margin:27px 0 30px}h1 em{font-weight:400;color:var(--accent)}.intro-bottom{display:grid;grid-template-columns:1fr 1fr;gap:60px;border-top:1px solid var(--ink);padding-top:20px}.intro-bottom p{margin:0;max-width:590px}.stats{display:flex;gap:35px;justify-content:flex-end}.stats strong{display:block;font-family:Georgia,serif;font-size:34px;line-height:1.3;font-weight:400}.stats span{font-size:11px;color:var(--muted)}.cover{margin:32px 0 0;position:relative;background:#101614}.cover img{display:block;width:100%;aspect-ratio:2.3;object-fit:cover;object-position:center 40%}.cover-caption{background:#1c2521;color:#cbd2c9;padding:12px 20px;display:flex;justify-content:space-between;font-size:11px;letter-spacing:.08em}.section-head{display:flex;justify-content:space-between;align-items:baseline;gap:28px;padding-top:62px;margin-bottom:22px;border-bottom:1px solid var(--line)}h2{font-family:Georgia,"Apple SD Gothic Neo",serif;font-weight:400;font-size:34px;letter-spacing:-.035em;margin:0 0 16px}h3{font-weight:500;font-size:22px;letter-spacing:-.025em;margin:0 0 12px}h4{font-size:13px;margin:0 0 8px;color:var(--accent)}p{margin:0 0 14px}.small{font-size:12px;color:var(--muted)}.filmstrip{display:grid;grid-template-columns:repeat(4,1fr);gap:24px 16px}.filmstrip a{text-decoration:none}.filmstrip img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}.filmstrip .strip-title{display:flex;justify-content:space-between;font-size:13px;padding-top:9px}.filmstrip .mono{color:var(--muted)}.note{padding:19px 22px;background:#e1e4da;border-left:2px solid var(--accent);font-size:13px;margin:25px 0}.player-panel{margin-top:25px}.player-panel video{width:100%;display:block;max-height:75vh;background:#0b0e0d}.act{margin:72px 0 0;padding:16px 0;border-top:1px solid var(--ink);font-family:monospace;font-size:12px;letter-spacing:.17em;color:var(--accent)}.scene{padding:26px 0 46px;border-bottom:1px solid var(--line);scroll-margin-top:80px}.scene-head{display:grid;grid-template-columns:70px 1fr auto;gap:25px;align-items:start;margin-bottom:25px}.scene-no{font-family:Georgia,serif;font-size:56px;line-height:1;color:var(--accent)}.scene-head h3{font-size:29px;line-height:1.3;margin:0 0 7px}.scene-head .en{font-family:Georgia,serif;font-size:18px;color:var(--muted);font-style:italic}.scene-meta{text-align:right;font-size:12px}.tag{display:inline-block;border:1px solid var(--line);padding:3px 9px;margin:5px 0}.frame-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}figure{margin:0;min-width:0}.image-open{padding:0;border:0;background:#0e1310;width:100%;display:block}.image-open img{width:100%;height:auto;aspect-ratio:16/9;object-fit:contain;display:block}figcaption{color:var(--muted);font-size:10px;line-height:1.6;margin-top:9px;overflow-wrap:anywhere}.direction{display:grid;grid-template-columns:1.25fr 1fr 1fr;gap:32px;padding:27px 0 15px}.direction p{font-size:13px}.scene-note{font-size:12px;color:var(--muted);margin-bottom:20px}.scene-actions{display:flex;gap:15px;flex-wrap:wrap;margin-bottom:20px}details{border-top:1px solid var(--line)}summary{padding:14px 0;cursor:pointer;list-style:none;font-size:13px;font-weight:500;display:flex;gap:14px}summary::before{content:'+';font-family:monospace;color:var(--accent)}details[open]>summary::before{content:'−'}.detail-body{padding:2px 0 22px}.prompt-box{background:var(--white);border:1px solid var(--line);margin:8px 0 18px}.prompt-bar{padding:9px 16px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;font-family:monospace;font-size:11px}pre{font:12px/1.85 monospace;white-space:pre-wrap;overflow-wrap:anywhere;margin:0;padding:20px;tab-size:2}.anchors{display:grid;grid-template-columns:1fr 1fr;gap:18px}.settings{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}.settings span{font:11px monospace;padding:7px 10px;background:#e1e4dc}.file{font:11px/1.7 monospace;overflow-wrap:anywhere;margin:10px 0}.pipeline{display:grid;grid-template-columns:repeat(5,1fr);border:1px solid var(--line)}.pipeline>div{padding:23px 18px;border-right:1px solid var(--line)}.pipeline>div:last-child{border:0}.pipeline strong{font-family:Georgia,serif;font-weight:400;font-size:27px;color:var(--accent);display:block;margin-bottom:12px}.pipeline p{font-size:12px}.swatches{display:flex;gap:7px;margin:18px 0}.swatch{height:28px;flex:1}.reference-table{width:100%;border-collapse:collapse;font-size:13px}.reference-table th,.reference-table td{padding:14px 16px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}.reference-table th{font-size:11px;color:var(--muted);font-weight:400}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:45px}.archive-list{padding:0;list-style:none}.archive-list li{padding:8px 0;border-bottom:1px solid #dce0d5;font:11px/1.6 monospace;overflow-wrap:anywhere}.archive-list .badge{font-size:10px;background:#d8e1d1;padding:2px 5px;margin-right:9px}.archive-search{width:100%;border:1px solid var(--line);padding:12px 16px;background:var(--white);font:inherit;margin-bottom:18px}.footer{margin:60px 0 0;padding:24px 0 42px;border-top:1px solid var(--ink);display:flex;justify-content:space-between;gap:25px;font-size:11px;color:var(--muted)}dialog{border:1px solid #58675b;background:#111713;color:#e6ece1;padding:15px;width:min(1400px,95vw);max-height:95vh}dialog::backdrop{background:rgba(0,0,0,.88)}dialog img{display:block;width:100%;max-height:78vh;object-fit:contain}dialog .dialog-bar{display:flex;justify-content:space-between;gap:20px;align-items:center;padding-bottom:10px;font-size:12px}.dialog-close{background:transparent;border:1px solid #61725f;color:inherit;padding:4px 13px}.status{font-size:12px}.table-scroll{overflow-x:auto}
@media(min-width:1500px){.frame-grid{gap:20px}}@media(max-width:900px){.wrap{padding:0 28px}.intro-bottom{gap:25px}.stats{gap:20px}.direction{grid-template-columns:1fr 1fr}.direction>div:first-child{grid-column:1/-1}.pipeline{grid-template-columns:1fr}.pipeline>div{border-right:0;border-bottom:1px solid var(--line)}.scene-head{grid-template-columns:50px 1fr;gap:16px}.scene-meta{grid-column:2;text-align:left}.two-col{gap:24px}.scene-no{font-size:42px}}@media(max-width:600px){.wrap{padding:0 19px}.brand{font-size:9px}.topbar .wrap{gap:12px}.nav{gap:12px}.nav .optional{display:none}.masthead{padding-top:40px}h1{font-size:68px}.intro-bottom{grid-template-columns:1fr;gap:23px}.stats{justify-content:flex-start;gap:36px}.cover img{aspect-ratio:16/10}.cover-caption{gap:15px;font-size:9px}.filmstrip{grid-template-columns:1fr 1fr;gap:20px 12px}.frame-grid{grid-template-columns:1fr}.frame-grid figcaption{margin-bottom:8px}.direction,.two-col,.anchors{grid-template-columns:1fr;gap:15px}.direction>div:first-child{grid-column:auto}.section-head{display:block;padding-top:45px}.section-head .small{padding-bottom:15px}.act{margin-top:46px}.scene-head h3{font-size:25px}.footer{display:block}.reference-table{min-width:560px}}
@media print{body{background:white;font-size:11px}.wrap{max-width:none;padding:0}.topbar,.scene-actions,.copy,.image-open::after,.archive-search,.player-panel,dialog{display:none!important}.masthead{padding-top:0}h1{font-size:75px}.cover img{max-height:250px}.section-head{padding-top:30px}.scene{break-inside:avoid;page-break-inside:avoid;padding-bottom:20px}.act{margin-top:25px}.frame-grid{grid-template-columns:repeat(3,1fr)}.direction{grid-template-columns:1.25fr 1fr 1fr;gap:15px}.image-open{display:block}.detail-body{break-inside:auto}details:not([open]){display:none}#archive{break-before:page}.nav{display:none}a{text-decoration:none}.footer{margin-top:25px}}
'''

parts = [f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>FIRST CONTACT — Heptapod B 최종 영상 콘티</title><style>{CSS}</style></head><body>
<header class="topbar"><div class="wrap"><a class="brand" href="#top">HEPTAPOD B / FILM DOSSIER</a><nav class="nav" aria-label="문서 탐색"><a href="#storyboard">콘티</a><a href="#pipeline">파이프라인</a><a class="optional" href="#archive">자료실</a><button type="button" class="print-btn" id="print">인쇄</button></nav></div></header>
<main class="wrap" id="top"><section class="masthead"><div class="eyebrow">Production storyboard · Selected final cut · 2026.09.07</div><h1>First<br><em>Contact.</em></h1><div class="intro-bottom"><p>그들이 먼저 말을 걸었다.<br>이제 당신이 답할 차례다.<br><span class="small">Heptapod B의 47초를 한 편의 영화처럼. 최종 영상의 실제 프레임과 채택된 생성 기록을 따라가는 제작 콘티.</span></p><div class="stats"><div><strong>{duration:.2f}</strong><span>SECONDS</span></div><div><strong>08</strong><span>SELECTED CLIPS</span></div><div><strong>24</strong><span>FINAL-CUT FRAMES</span></div></div></div>
<div class="cover"><img src="{embedded(str(SCENES[0]['frames'][0][0]))}" alt="안개 낀 평원 위의 거대한 검은 비행체"><div class="cover-caption"><span>A JOURNEY INTO THE UNKNOWN</span><span>35MM LOOK / DESATURATED GREEN–GREY</span></div></div></section>
<section id="overview"><div class="section-head"><h2>One film. Eight movements.</h2><span class="small">접근 → 진입 → 상승 → 중력 전환 → 첫 접촉</span></div><div class="filmstrip">''']

for s in SCENES:
    parts.append(f'<a href="#scene-{s["number"]}"><img src="{embedded(str(s["frames"][1][0]))}" alt="{E(s["title"])}"><div class="strip-title"><span>{s["number"]:02d} / {E(s["title"])}</span></div><span class="mono">{tc(s["start"])} — {tc(s["end"])}</span></a>')
parts.append(f'''</div><div class="note">기준 영상은 <b>최종 합본 source01v2-screenfillv4</b>다. 아래 24장은 이 영상에서 직접 추출했다. 장면별 시작·중간·끝 이미지를 누르면 확대된다. 컷 구간은 제작 타임라인의 초 단위 구획이며, 스냅샷은 경계 혼입을 피하도록 안쪽에서 추출했다.</div>
<details class="player-panel"><summary>최종 영상 재생 · {duration:.2f}s · 사운드 포함</summary><video id="final-video" controls playsinline preload="none" poster="{embedded(str(SCENES[0]['frames'][0][0]))}"><source src="{href(FINAL)}" type="video/mp4">{link(FINAL, '최종 영상 파일 열기')}</video><p class="small">{link(FINAL,'최종 합본')} · 영상 재생과 원본 파일 링크는 프로젝트 폴더 구조를 유지해야 한다. 콘티 이미지와 본문은 HTML 안에 포함되어 있다.</p></details></section><section id="storyboard">''')

for s in SCENES:
    n=s['number']; record=s['record']; inp=record.get('input',{})
    if s['act']:
        parts.append(f'<div class="act">{E(s["act"])}</div>')
    parts.append(f'<article class="scene" id="scene-{n}"><header class="scene-head"><span class="scene-no">{n:02d}</span><div><h3>{E(s["title"])}</h3><span class="en">{E(s["en"])}</span></div><div class="scene-meta"><div class="mono">{tc(s["start"])} — {tc(s["end"])}</div><span class="tag">SHOT {E(s["shot"])}</span><div>Kling 3 Pro · {inp.get("duration")}s</div></div></header><div class="frame-grid">')
    for label,(path,t) in zip(['IN','MID','OUT'],s['frames']):
        parts.append(figure(path,f'{n:02d} / {label} · FINAL CUT {tc(t)}'))
    parts.append(f'''</div><div class="direction"><div><h4>장면 / ACTION</h4><p>{E(s['action'])}</p></div><div><h4>카메라 / CAMERA</h4><p>{E(s['camera'])}</p></div><div><h4>소리 / SOUND</h4><p>{E(s['sound'])}</p></div></div><p class="scene-note"><b>연속성</b> — {E(s['continuity'])}<br><b>채택 기록</b> — {E(s['note'])}</p><div class="scene-actions"><button class="small-btn play-scene" data-start="{s['start']}" data-end="{s['end']}" type="button">이 구간 재생 ↗</button>{link(s['source'],'원본 클립')}{link(s['submission'],'생성 기록 JSON')}</div>''')
    settings=''.join(f'<span>{E(k)}: {E(v)}</span>' for k,v in inp.items() if k not in ['prompt','negative_prompt','start_image_url','end_image_url','first_frame_url','last_frame_url'])
    parts.append(disclosure('실제 영상 생성 프롬프트 · 원문 / 설정',f'<p class="file">{E(record.get("model",""))}<br>{E(record["id"])}</p><div class="settings">{settings}</div>'+prompt_box(inp.get('prompt','기록 없음'),'SUBMITTED MOTION PROMPT')+prompt_box(inp.get('negative_prompt','별도 negative_prompt 필드 없음'),'NEGATIVE PROMPT')+f'<p class="small">위 영문은 제출 기록의 input 원문이다. 장면·카메라·소리 설명은 이를 바탕으로 편집한 한국어 콘티이며, 생성 결과가 모든 지시를 충족한다는 뜻은 아니다.</p>'))
    anchors=[]
    for k,label in [('start','START / 실제 생성 입력'),('end','END / 실제 생성 입력')]:
        if record.get(k):
            p=(ROOT/'tmp/fal-runner'/record[k]).resolve()
            assert p.is_file(),p
            anchors.append('<div>'+figure(p,label)+f'<p class="file">{link(p)}</p></div>')
    if not record.get('end'):
        anchors.append('<p class="small">이 클립은 끝 이미지 없이 시작 이미지 한 장으로 생성했다. 종료 구도는 영상 프롬프트에서 지정했다.</p>')
    body='<div class="anchors">'+''.join(anchors)+'</div><p class="small">입력 이미지는 submissions JSON에 기록된 실제 파일이다. 이전 클립의 추출 프레임을 사용한 경우에는 정지 이미지 템플릿과 일대일로 대응하지 않는다.</p>'
    for shot in s['still']:
        body+=disclosure(f'Shot {shot:02d} · 문서에 보존된 정지 이미지 프롬프트',prompt_box(still_prompts[shot],'STILL PROMPT TEMPLATE'))
    body+=f'<p class="small">정지 이미지 프롬프트는 현재 문서의 보존본이다. 각 이미지 버전의 실제 생성 호출 로그로 확인된 원문은 아니다. 레퍼런스 연결: {E(s["ref"])}.</p>'
    parts.append(disclosure('입력 키프레임 · 정지 이미지 프롬프트 · 레퍼런스',body))
    parts.append('</article>')
parts.append('</section>')

parts.append('''<section id="pipeline"><div class="section-head"><h2>From reference to screen.</h2><span class="small">레퍼런스에서 웹 히어로까지</span></div><div class="pipeline"><div><strong>01</strong><h4>레퍼런스 해석</h4><p>영화 캡처를 외부 규모·개구부·중력·접촉면으로 나누고, 색감과 물리적 관계를 추출한다.</p></div><div><strong>02</strong><h4>정지 이미지 설계</h4><p>마스터 룩을 고정하고 Shot별 구도·카메라·동작만 바꾼다. 보호복·리프트·장비의 연속성을 유지한다.</p></div><div><strong>03</strong><h4>영상 생성과 비교</h4><p>fal.ai 러너로 시작·끝 이미지를 전달한다. Kling·Veo·Seedance 후보를 비교하며 수정한다.</p></div><div><strong>04</strong><h4>최종 8개 클립</h4><p>Kling 3 Pro 결과를 채택한다. 04·06·08은 직접 연결로 생략하고, 마지막은 screen-fill v4로 마무리한다.</p></div><div><strong>05</strong><h4>웹 체험으로 연결</h4><p>47초 합본을 짧은 GOP로 재인코딩한다. 데스크톱·모바일 영상, 포스터, 오디오 클립과 베드 루프를 만든다.</p></div></div>
<div class="two-col" style="margin-top:32px"><div><h3>Continuity bible</h3><p>네 명의 연구원, 옅은 회색 보호복, 검은 난간의 산업용 리프트, 작은 검은 장비 케이스. 거대한 무광 비행체와 거친 내부 표면이 이들을 둘러싼다.</p><p class="small">문서의 색상 앵커. 캡처 분석값으로 기록된 값이며, 이번에 원본을 다시 측정한 값은 아니다.</p><div class="swatches">''')
for color in ['#545455','#595a59','#22241f','#07090b','#19191e','#62636a','#465c6e']:
    parts.append(f'<div class="swatch" style="background:{color}" title="{color}"></div>')
parts.append('''</div><p class="small">저채도 녹회색·청회색 / 낮은 대비 / 읽을 수 있는 암부 / 부드러운 35mm 필름 질감. 주황·빨강 복장, 경사로·다리, 유광 SF 패널, 포털 빔을 배제한다.</p></div><div><h3>What the final cut changed</h3><p>기획 문서에는 Veo 중심 라우팅과 별도 장면들이 남아 있다. 실제 최종본은 Kling 클립 8개이며, 시작 구간에도 비행체 원경이 포함된다.</p><p>Shot 04·06·08은 독립 클립으로 사용하지 않는다. 접촉·로고그램 플레이트는 최종 47초 영상의 별도 컷으로 추가하지 않고, 이어지는 앱 체험의 자료로 보존한다.</p><p class="small">최종 소스 판별은 각 구간 +2초의 축소 명암 프레임을 후보와 비교했다. 선택 클립의 평균제곱오차는 0.167–0.325였으며, 다음 후보보다 낮았다. 완전한 편집 프로젝트 파일이 아닌 현존 MP4와 생성 기록을 대조한 결과다.</p></div></div></section>''')

refs=[('s1.png · s2.png','외부 규모','난형 비행체, 안개 낀 평원, 작은 인체','01'),('s3.png','문턱과 개구부','둥근 사각 개구부, 진입 방향','02–03'),('s4.png · s5.png','리프트와 인체','승강 동작, 보호복의 부피. 원본의 주황색은 가져오지 않음','02–03'),('s6.png','내부 공간','어두운 사각 공간, 거친 재질, 넓은 접촉벽','04–07'),('s7.png','규모와 중력','측면 시점, 기준면의 전환, 인체 대비 공간 크기','04–06'),('s8.png','접촉면','차가운 빛, 청회색 안개, 벽과 사람의 크기 관계','06–08'),('s9.jpeg','접촉과 응답','손과 원형 잉크 반응. 이후 앱 체험의 개념 참고','후속 체험')]
parts.append('<section id="references"><div class="section-head"><h2>Reference notes.</h2><span class="small">원본 캡처의 역할과 사용 범위</span></div><div class="table-scroll"><table class="reference-table"><thead><tr><th>REFERENCE</th><th>ROLE</th><th>TRANSLATION</th><th>콘티 장면</th></tr></thead><tbody>')
for row in refs:
    parts.append('<tr>'+''.join(f'<td>{E(c)}</td>' for c in row)+'</tr>')
parts.append('</tbody></table></div><div class="note">원본 캡처 9장은 문서에 <code>/Users/ddd/Desktop/s1.png … s9.jpeg</code>로 기록돼 있으나, 현재 해당 위치에 없다. 역할·색상 분석·활용 규칙은 문서에 남아 있다. 위 연결은 그 기록과 최종 클립 내용을 바탕으로 정리했다.</div></section>')

parts.append('<section id="archive"><div class="section-head"><h2>The production archive.</h2><span class="small">채택본을 중심으로, 비교안과 원문까지</span></div><p>본문은 최종 콘티 순서다. 아래에는 정지 이미지 설계 원문, 생성 실행 규격, 모든 제출 기록, 대체 영상과 검수 이미지를 보존 위치별로 모았다.</p><label for="archive-search" class="small">자료 이름 검색</label><input id="archive-search" class="archive-search" type="search" placeholder="예: gravity, seedance, screen-fill, 05-hero">')

docs=[master_path, ROOT/'docs/heptapod-b-encoder/06-hero-storyline.md',ROOT/'docs/heptapod-b-encoder/07-scroll-scrub-sound-plan.md',ROOT/'docs/heptapod-b-encoder/03-visual-direction.md',ROOT/'docs/heptapod-b-encoder/04-audio-and-motion.md',ROOT/'public/heptapod-b-encoder/hero-scenes/README.md',ROOT/'public/heptapod-b-encoder/hero-motion/s03-agent-b/review-notes.md']
doc_body=''
for p in docs:
    doc_body+=f'<div class="archive-item" data-search="{E(rel(p))}">'+disclosure(p.name,link(p,'원본 문서 열기')+f'<pre>{E(p.read_text())}</pre>')+'</div>'
parts.append(disclosure(f'기획·레퍼런스·피드백 원문 · {len(docs)}개',doc_body))

json_body=''
for p in submission_files:
    label=rel(p).replace('public/heptapod-b-encoder/hero-motion/','')
    json_body+=f'<div class="archive-item" data-search="{E(label)}">'+disclosure(label,link(p,'원본 JSON 열기')+prompt_box(p.read_text(),'SUBMISSION RECORD'))+'</div>'
parts.append(disclosure(f'전체 영상 생성 제출 기록 · {len(submission_files)}개 JSON',json_body))

spec_files=sorted((ROOT/'tmp/fal-runner').glob('*spec*.json'))+sorted((ROOT/'tmp').glob('fal-*-spec.json'))
spec_files+= [ROOT/'tmp/fal-runner/fable-prompts.json']
spec_body=''
for p in spec_files:
    spec_body+=f'<div class="archive-item" data-search="{E(p.name)}">'+disclosure(p.name,link(p,'원본 파일 열기')+prompt_box(p.read_text(),'GENERATION SPEC'))+'</div>'
parts.append(disclosure(f'실행 규격과 프롬프트 묶음 · {len(spec_files)}개',spec_body))

scripts=[ROOT/'tmp/fal-runner/submit.mjs',ROOT/'tmp/fal-runner/gen-seedance-specs.mjs',ROOT/'tmp/fal-submit-i2v.mjs',ROOT/'scripts/build-hero-scrub.mjs',ROOT/'public/heptapod-b-encoder/hero-scrub/scrub-timeline.json']
body=''
for p in scripts:
    body+=f'<div class="archive-item" data-search="{E(p.name)}">'+disclosure(p.name,link(p,'원본 파일 열기')+f'<pre>{E(p.read_text())}</pre>')+'</div>'
parts.append(disclosure('생성·후반 작업 스크립트와 사운드 타임라인',body))

chosen={s['source'] for s in SCENES}|{FINAL}
for folder,pattern,title in [(MOTION,'*.mp4','영상 결과 · 채택본과 비교안'),(ROOT/'public/heptapod-b-encoder/hero-scenes','*.png','정지 이미지 · 장면 키프레임'),(ROOT/'public/heptapod-b-encoder/hero-pilot','*.png','초기 파일럿'),(ROOT/'tmp/heptapod-motion-frames','*','기존 추출 프레임과 검수 스냅샷'),(ROOT/'public/heptapod-b-encoder/audio','*.mp3','웹용 사운드'),(ROOT/'public/heptapod-b-encoder/hero-scrub','*','웹용 영상·포스터·타임라인')]:
    files=[p for p in sorted(folder.rglob(pattern)) if p.is_file()]
    body='<ul class="archive-list">'
    for p in files:
        label=p.relative_to(folder).as_posix()
        badge='<span class="badge">채택</span>' if p in chosen else ''
        body+=f'<li class="archive-item" data-search="{E(rel(p))}">{badge}{link(p,label)}</li>'
    parts.append(disclosure(f'{title} · {len(files)}개',body+'</ul>'))

parts.append(f'''<p class="small" style="margin-top:24px">콘티의 최종 프레임 24장과 실제 입력 이미지 미리보기는 HTML에 내장했다. 자료실의 문서·JSON·스크립트 원문도 내장했으며, 원본 MP4·PNG·MP3는 프로젝트 파일 링크로 제공한다. 이 문서의 장면 설명과 세부 의도는 보존된 프롬프트에서 편집한 설명이다.</p></section><footer class="footer"><span>HEPTAPOD B — FIRST CONTACT / PRODUCTION STORYBOARD</span><span>최종 합본 {video_info['width']} × {video_info['height']} · {video_info['r_frame_rate']} fps · {duration:.3f}s<br>Compiled from local production materials · 2026.09.07</span></footer></main>
<dialog id="lightbox" aria-label="콘티 프레임 확대"><div class="dialog-bar"><span id="lightbox-caption"></span><button type="button" class="dialog-close">닫기 ×</button></div><img id="lightbox-image" alt=""></dialog><div class="status" id="status" role="status" aria-live="polite"></div>
''')
parts.append('''<script>
const lightbox=document.getElementById('lightbox');let opener=null;
document.querySelectorAll('.image-open').forEach(button=>button.addEventListener('click',()=>{opener=button;const img=button.querySelector('img');document.getElementById('lightbox-image').src=img.src;document.getElementById('lightbox-image').alt=img.alt;document.getElementById('lightbox-caption').textContent=img.alt;lightbox.showModal()}));
document.querySelector('.dialog-close').addEventListener('click',()=>lightbox.close());
lightbox.addEventListener('click',event=>{if(event.target===lightbox)lightbox.close()});
lightbox.addEventListener('close',()=>opener?.focus());
document.querySelectorAll('.copy').forEach(button=>button.addEventListener('click',async()=>{const text=button.closest('.prompt-box').querySelector('pre').textContent;try{await navigator.clipboard.writeText(text);button.textContent='복사됨'}catch{const range=document.createRange();range.selectNodeContents(button.closest('.prompt-box').querySelector('pre'));const selection=getSelection();selection.removeAllRanges();selection.addRange(range);button.textContent='선택됨 · ⌘/Ctrl+C'}setTimeout(()=>button.textContent='복사',3000)}));
document.getElementById('print').addEventListener('click',()=>window.print());
const player=document.getElementById('final-video');let stopAt=null;
document.querySelectorAll('.play-scene').forEach(button=>button.addEventListener('click',()=>{player.closest('details').open=true;const start=Number(button.dataset.start);stopAt=Number(button.dataset.end);player.scrollIntoView({behavior:'smooth',block:'center'});const begin=()=>{player.currentTime=start;player.play().catch(()=>{document.getElementById('status').textContent='영상 컨트롤의 재생 버튼을 눌러주세요.'})};if(player.readyState>=1){begin()}else{player.addEventListener('loadedmetadata',begin,{once:true});player.load()}}));
player.addEventListener('timeupdate',()=>{if(stopAt!==null&&player.currentTime>=stopAt){player.pause();stopAt=null}});
player.addEventListener('error',()=>{document.getElementById('status').textContent='영상 파일을 찾을 수 없습니다. HTML을 원래 프로젝트 폴더에서 열어주세요.'});
document.getElementById('archive-search').addEventListener('input',event=>{const q=event.target.value.toLowerCase().trim();document.querySelectorAll('.archive-item').forEach(item=>item.hidden=q&&!item.dataset.search.toLowerCase().includes(q));document.querySelectorAll('#archive>details').forEach(group=>{const items=[...group.querySelectorAll('.archive-item')];group.hidden=!!q&&items.length>0&&items.every(item=>item.hidden);if(q&&!group.hidden)group.open=true})});
</script></body></html>''')

OUT.write_text(''.join(parts),encoding='utf-8')
manifest=[dict(scene=s['number'],shot=s['shot'],title=s['title'],start=s['start'],end=s['end'],source=rel(s['source']),submission=rel(s['submission']),frames=[dict(path=rel(p),time=t) for p,t in s['frames']]) for s in SCENES]
(CACHE.parent/'selected-cut-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(f'Built {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1024 / 1024:.2f} MB)')
print(f'{len(SCENES)} scenes, 24 final-cut frames, {len(submission_files)} submission files, {len(spec_files)} prompt/spec files')
