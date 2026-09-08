"""Build the local, static video-v2 review page. No browser or network access.

Run again after clips/assembly finish to refresh file availability and validation.
Only video-v2/review.html is written. All media links are relative local paths.
"""

import hashlib
import html
import json
import os
from datetime import datetime
from pathlib import Path
from urllib.parse import quote


HERE = Path(__file__).resolve().parent
RUN = HERE.parent
SELECTED = RUN / "variation" / "selected"
STARTS = [0, 4, 12, 17, 23, 29, 35, 41]
TITLES = ["접근", "입구로 이동", "진입과 상승", "수직 상승", "천장 접근", "중력 전환", "첫 접촉", "백색 안개"]
STATE_LABELS = {
    "prepared": "생성 대기", "uploading": "입력 업로드 중", "submission_pending": "요청 전송 중",
    "submission_unknown": "요청 확인 필요", "queued": "생성 대기열", "polling": "생성 진행 중",
    "result_ready": "다운로드 대기", "downloaded": "다운로드 완료",
    "media_review_required": "영상 규격 검토 필요", "paused_with_request_id": "생성 확인 대기",
    "resumable_error": "재확인 필요",
}


def read_json(path):
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return {}


def esc(value):
    return html.escape(str(value), quote=True)


def link(path):
    return quote(os.path.relpath(path, HERE), safe="/._-")


def sha(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def resolve_local(value):
    path = Path(value)
    if path.is_absolute():
        return path.resolve()
    direct = HERE / path
    return direct.resolve() if direct.exists() else (RUN.parents[2] / path).resolve()


def load_delivery():
    manifest = read_json(HERE / "delivery-manifest.json")
    approved, invalid, qa = {}, {}, {}
    expected = {f"C{i:02d}" for i in range(1, 9)}
    for owner in ("A", "B", "C"):
        for item in read_json(HERE / "qa" / f"{owner}.json").get("clips", []):
            if item.get("id") in expected:
                qa[item["id"]] = item
    rows = manifest.get("clips", []) if manifest.get("status") in ("preparing", "ready") else []
    for item in rows:
        cid = item.get("id")
        if cid not in expected:
            continue
        try:
            if sum(row.get("id") == cid for row in rows) != 1:
                raise ValueError("최종 선택 기록 중복")
            path = resolve_local(item["path"])
            if path != (HERE / "final-clips" / f"{cid}.mp4").resolve():
                raise ValueError("최종 클립 경로 확인 필요")
            if not path.is_file() or sha(path) != item["sha256"]:
                raise ValueError("최종 클립 파일·SHA 확인 필요")
            approved[cid] = {**item, "resolved_path": path}
        except (OSError, KeyError, ValueError) as error:
            invalid[cid] = str(error)
    return {"manifest": manifest, "approved": approved, "invalid": invalid, "qa": qa,
            "pending": sorted(expected - set(approved))}


def validation_status(master, delivery):
    report = read_json(HERE / "staging" / "assembly-validation.json")
    if not master.is_file():
        return f"최종 클립 {len(delivery['approved'])}/8 선택 · 새 합본 생성 대기", False
    if delivery["manifest"].get("status") != "ready" or delivery["pending"]:
        return "새 합본 파일 있음 · 최종 클립 선택 대기", False
    inputs = {item.get("id"): item.get("sha256") for item in report.get("inputs", [])}
    if any(inputs.get(cid) != item["sha256"] for cid, item in delivery["approved"].items()):
        return "새 합본 파일 있음 · 최종 선택과 조립 기록 확인 필요", False
    matching = [item for item in report.get("outputs", []) if item.get("variant") == "1920"]
    if report.get("status") == "passed" and len(matching) == 1:
        item = matching[0]
        if item.get("validation") == "passed" and item.get("sha256") == sha(master):
            return "새 합본 · 기술 검증 통과", True
    return "새 합본 파일 있음 · 기술 검증 확인 대기", False


def video_panel(path, video_id, title, subtitle, poster):
    if path.is_file():
        poster_attr = f' poster="{link(poster)}"' if poster.is_file() else ""
        media = f'<video id="{video_id}" preload="metadata" playsinline{poster_attr} aria-label="{esc(title)}"><source src="{link(path)}" type="video/mp4"></video>'
        action = f'<a href="{link(path)}" target="_blank" rel="noopener">영상 파일 열기 ↗</a>'
    else:
        media = '<div class="empty">합본이 생성되면 여기에 표시됩니다.<span>페이지를 다시 생성하면 파일 상태가 반영됩니다.</span></div>'
        action = '<span class="muted">파일 대기</span>'
    return f'<article class="panel"><div class="panel-head"><div><h2>{esc(title)}</h2><p>{esc(subtitle)}</p></div>{action}</div><div class="screen">{media}</div></article>'


def clip_card(number, delivery):
    cid = f"C{number:02d}"
    path = HERE / "clips" / f"{cid}.mp4"
    qa = delivery["qa"].get(cid, {})
    selected = delivery["approved"].get(cid)
    notes = []
    if selected:
        path = selected["resolved_path"]
        status = f"최종 채택 · 시도 {selected.get('attempt', 1)}"
        action_label = f"{cid} 최종 채택 영상 재생 ↗"
        if qa.get("delivery_approved") is True and qa.get("attempt", 1) == selected.get("attempt", 1):
            notes = qa.get("notes", [])
    else:
        reviewed_attempt = qa.get("attempt", 1)
        if qa.get("path"):
            path = resolve_local(qa["path"])
        retries = qa.get("retry_reviews", [])
        if retries:
            latest = max(retries, key=lambda item: item.get("attempt", 1))
            reviewed_attempt = latest.get("attempt", reviewed_attempt)
            path = HERE / "retries" / f"attempt-{reviewed_attempt}" / "clips" / f"{cid}.mp4"
            qa = {**qa, **latest}
        notes = qa.get("notes", [])
        if cid in delivery["invalid"]:
            status = delivery["invalid"][cid]
        elif qa.get("delivery_approved") is False:
            status = f"시도 {reviewed_attempt} QA 불합격 · 재검토 대기"
        elif qa.get("delivery_approved") is True:
            status = f"시도 {reviewed_attempt} QA 통과 · 최종 선택 대기"
        else:
            status = "QA 확인 및 최종 선택 대기"
        action_label = f"{cid} 검토용 영상 · 시도 {reviewed_attempt} ↗"
    if isinstance(notes, str):
        notes = [notes]
    note_html = (f'<details class="qa-notes"><summary>영상 QA 메모</summary><ul>{"".join(f"<li>{esc(note)}</li>" for note in notes)}</ul></details>' if notes else "")
    thumbs = []
    for part in ("IN", "MID", "OUT"):
        image = SELECTED / f"F{number:02d}-{part}.jpg"
        if image.is_file():
            thumbs.append(f'<a href="{link(image)}" target="_blank" rel="noopener"><img loading="lazy" src="{link(image)}" alt="{cid} {part} 선택 이미지"><span>{part}</span></a>')
        else:
            thumbs.append(f'<div class="thumb-empty">{part} 이미지 대기</div>')
    action = (f'<a class="clip-link" href="{link(path)}" target="_blank" rel="noopener">{esc(action_label)}</a>'
              if path.is_file() else '<span class="muted">검토 가능한 영상 파일 대기</span>')
    return f'''<article class="clip" data-clip="{cid}" data-approved="{'true' if selected else 'false'}"><div class="clip-head"><h3>{cid} <span>{TITLES[number - 1]}</span></h3><span class="tag{' warning' if not selected else ''}">{esc(status)}</span></div>
    <div class="thumbs">{''.join(thumbs)}</div><div class="clip-foot">{action}<button class="jump" data-time="{STARTS[number - 1]}">합본 {STARTS[number - 1]}초로 이동</button></div>{note_html}</article>'''


CSS = """
:root{color-scheme:dark;--bg:#0c1116;--surface:#131b23;--edge:#2a3642;--text:#e6eef5;--muted:#9aabb8;--accent:#b7d7da}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.65 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}main{max-width:1600px;margin:auto;padding:44px 28px 70px}a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}button,select,input{font:inherit}button,select{border:1px solid var(--edge);background:#1b2934;color:var(--text);border-radius:7px;padding:8px 13px}button{cursor:pointer}button:hover{background:#283b48}button:disabled{cursor:default;opacity:.4}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.eyebrow{font-size:12px;letter-spacing:.16em;color:var(--accent)}h1{font-size:clamp(25px,3vw,40px);line-height:1.25;margin:12px 0}header p{max-width:980px;margin:10px 0;color:var(--muted)}.status-row{display:flex;flex-wrap:wrap;gap:8px;margin:24px 0}.tag{display:inline-block;background:#1a2932;border:1px solid #33444f;padding:3px 9px;border-radius:99px;font-size:12px;color:#c9dce2}.notice{border-left:2px solid #6c929b;padding:10px 15px;background:#111c24;color:#afc2ce;margin:20px 0}.players{display:grid;grid-template-columns:1fr 1fr;gap:18px}.panel{border:1px solid var(--edge);background:var(--surface);border-radius:10px;overflow:hidden}.panel-head{min-height:93px;display:flex;justify-content:space-between;gap:12px;padding:17px 18px}.panel-head h2{font-size:17px;margin:0}.panel-head p{color:var(--muted);font-size:12px;margin:4px 0 0}.panel-head>a{font-size:12px;white-space:nowrap}.screen{aspect-ratio:1916/1080;background:#05080b;display:grid;place-items:center}video{width:100%;height:100%;display:block;object-fit:contain}.empty{text-align:center;color:#a3b6c5;padding:25px}.empty span{display:block;font-size:12px;color:#6e8798;margin-top:9px}.transport{position:sticky;top:0;z-index:2;border:1px solid var(--edge);background:#141e28f5;backdrop-filter:blur(10px);border-radius:10px;margin:16px 0 30px;padding:15px}.controls{display:flex;align-items:center;flex-wrap:wrap;gap:8px}.controls label{font-size:12px;color:var(--muted);margin-left:8px}.time{margin-left:auto;font-variant-numeric:tabular-nums;color:#cbdce5;font-size:13px}.seek{width:100%;accent-color:#a7cdd3;margin:16px 0 3px}.playback-note{font-size:12px;color:var(--muted);margin:4px 0 0;min-height:20px}.section-head{display:flex;align-items:baseline;justify-content:space-between;gap:15px;margin:36px 0 16px}.section-head h2{font-size:22px;margin:0}.section-head p{font-size:12px;color:var(--muted);margin:0}.clips{display:grid;grid-template-columns:1fr 1fr;gap:16px}.clip{background:var(--surface);border:1px solid var(--edge);border-radius:9px;padding:16px}.clip-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:13px}.clip-head h3{font-size:15px;margin:0}.clip-head h3 span{font-weight:400;color:#b4c7d3;margin-left:8px}.thumbs{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.thumbs>a{position:relative;display:block;background:#05080b;border-radius:4px;overflow:hidden}.thumbs img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain}.thumbs span{position:absolute;bottom:4px;left:6px;background:#081017bb;border-radius:3px;padding:0 4px;font-size:10px}.thumb-empty{aspect-ratio:16/9;background:#0b1218;display:grid;place-items:center;font-size:11px;color:var(--muted)}.clip-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px;font-size:12px}.jump{font-size:12px;padding:5px 9px}.muted{color:var(--muted)}footer{border-top:1px solid var(--edge);margin-top:32px;padding-top:18px;color:var(--muted);font-size:12px}footer p{margin:7px 0}@media(max-width:850px){main{padding:26px 14px 40px}.players,.clips{grid-template-columns:1fr}.panel-head{min-height:80px}.time{margin-left:0;width:100%}.section-head{display:block}.controls label{margin-left:0}.transport{position:static}}
"""


CSS += """
.tag.warning{background:#322820;border-color:#805e3b;color:#efceaa}.qa-notes{margin-top:12px;padding:9px 11px;border:1px solid var(--edge);border-radius:6px;font-size:12px;color:#bed0da}.qa-notes summary{cursor:pointer}.qa-notes ul{padding-left:18px}.pending{color:#efceaa;font-size:13px;margin:16px 0}
"""

JS = r"""
const original=document.querySelector('#original');
const generated=document.querySelector('#generated');
const videos=[original,generated].filter(Boolean);
const play=document.querySelector('#play'),pause=document.querySelector('#pause'),seek=document.querySelector('#seek');
const time=document.querySelector('#time'),note=document.querySelector('#playback-note');
let running=false,raf=0;
function duration(){return original && Number.isFinite(original.duration)?original.duration:47.041667}
function setTime(value){const t=Math.max(0,Math.min(value,duration()));for(const v of videos){if(v.readyState>0)v.currentTime=Math.min(t,Number.isFinite(v.duration)?v.duration:t)}paint()}
function paint(){const t=original?.currentTime||0;seek.max=duration();seek.value=t;time.textContent=t.toFixed(3)+' / '+duration().toFixed(3)+'초 · '+Math.floor(t*24)+'프레임'}
function stop(){running=false;cancelAnimationFrame(raf);videos.forEach(v=>v.pause());play.textContent='동기 재생';paint()}
function tick(){if(!running)return;if(original&&generated&&generated.readyState>=2&&Math.abs(original.currentTime-generated.currentTime)>.08)generated.currentTime=original.currentTime;paint();raf=requestAnimationFrame(tick)}
async function start(){if(!videos.length)return;setTime(original?.currentTime||0);try{await Promise.all(videos.map(v=>v.play()));running=true;play.textContent='재생 중';note.textContent=generated?'원본과 새 합본을 같은 시간으로 재생합니다.':'새 합본 대기 중 · 현재는 원본만 재생합니다.';cancelAnimationFrame(raf);tick()}catch(error){stop();note.textContent='재생할 수 없습니다. 영상 파일이 다운로드 완료되었는지 확인하세요.'}}
play.addEventListener('click',start);pause.addEventListener('click',stop);
seek.addEventListener('input',()=>{stop();setTime(Number(seek.value))});
document.querySelectorAll('[data-step]').forEach(button=>button.addEventListener('click',()=>{stop();setTime((original?.currentTime||0)+Number(button.dataset.step)/24)}));
document.querySelectorAll('[data-time]').forEach(button=>button.addEventListener('click',()=>{stop();setTime(Number(button.dataset.time));document.querySelector('.players').scrollIntoView({behavior:'smooth',block:'start'})}));
document.querySelector('#speed').addEventListener('change',event=>videos.forEach(v=>v.playbackRate=Number(event.target.value)));
function audio(){const source=document.querySelector('#audio').value;videos.forEach(v=>v.muted=v.id!==source)}
document.querySelector('#audio').addEventListener('change',audio);audio();
for(const v of videos){v.addEventListener('loadedmetadata',()=>{paint();if(v===generated)setTime(original?.currentTime||0)});v.addEventListener('ended',stop);v.addEventListener('error',()=>{stop();note.textContent='영상 파일을 읽을 수 없습니다. 파일 링크에서 경로와 다운로드 상태를 확인하세요.'})}
if(!original){play.disabled=true;pause.disabled=true;seek.disabled=true;note.textContent='원본 rollback 파일이 없습니다.'}
if(!generated){document.querySelector('#audio option[value="generated"]').disabled=true}
paint();
"""


def main():
    original = HERE / "rollback" / "hero-scrub" / "hero-scrub-1920.mp4"
    generated = HERE / "staging" / "hero-scrub-1920.mp4"
    delivery = load_delivery()
    status, valid = validation_status(generated, delivery)
    completed = len(delivery["approved"])
    selected_count = sum((SELECTED / f"F{i:02d}-{part}.jpg").is_file() for i in range(1, 9) for part in ("IN", "MID", "OUT"))
    original_panel = video_panel(original, "original", "현재 적용본", "Rollback · 1916 × 1080 · 24 fps", HERE / "rollback" / "hero-scrub" / "hero-scrub-poster.jpg")
    generated_panel = video_panel(generated, "generated", "새 합본", status, SELECTED / "F01-IN.jpg")
    report = HERE / "staging" / "assembly-validation.json"
    report_link = f' · <a href="{link(report)}">기술 검증 기록</a>' if report.is_file() else ""
    mobile = HERE / "staging" / "hero-scrub-960.mp4"
    mobile_link = f' · <a href="{link(mobile)}">새 모바일 영상 960 × 542</a>' if mobile.is_file() else ""
    delivery_path = HERE / "delivery-manifest.json"
    delivery_link = f' · <a href="{link(delivery_path)}">최종 클립 선택 기록</a>' if delivery_path.is_file() else ""
    pending_html = (f'<p class="pending">최종 선택 대기: {", ".join(delivery["pending"])}. 검토용 다운로드 영상은 최종 채택 영상과 구분해 표시합니다.</p>' if delivery["pending"] else "")
    validation_text = ("프레임 수·fps·해상도·SAR·GOP·AAC 패킷과 타임스탬프 검증을 통과했습니다. 장면의 시각적 일치 여부는 아래 영상으로 검토하세요."
                       if valid else "합본 생성과 기술 검증이 끝나면 이 페이지를 다시 생성해 결과를 확인하세요.")
    page = f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Heptapod B · 영상 v2 개선 프롬프트 비교</title><style>{CSS}</style></head><body><main>
    <header><div class="eyebrow">HEPTAPOD B / VIDEO V2 / PROMPT REVISION 1</div><h1>현재 적용본과 개선 프롬프트 영상 비교</h1><p>원본 장면의 구도와 움직임을 기준으로 새 영상을 확인합니다. 아래 재생 버튼과 타임라인은 두 합본을 같은 시간으로 이동합니다.</p>
    <div class="status-row"><span class="tag">{esc(status)}</span><span class="tag">최종 채택 클립 {completed} / 8</span><span class="tag">최종 선택 스냅샷 {selected_count} / 24</span><span class="tag">Vary &gt; Subtle · 네이티브 HD 2928 × 1648</span></div></header>
    <div class="notice">선택 스냅샷 24장에 Vary &gt; Subtle을 적용하고 각 작업의 4개 결과 중 1장을 선택했습니다. 결과 이미지의 실제 크기는 2928 × 1648입니다. C01–C07은 IN·OUT, C08은 IN 이미지를 영상 입력으로 사용하며 MID와 F08-OUT은 비교 참고 이미지입니다. 잔여 차이와 F03-MID의 검토 필요 항목은 <a href="../variation/review.html">24장 이미지 비교와 QA 메모</a>에서 확인할 수 있습니다.</div>
    <div class="players">{original_panel}{generated_panel}</div>
    <div class="transport"><div class="controls"><button id="play">동기 재생</button><button id="pause">일시 정지</button><button data-step="-1" aria-label="한 프레임 이전">−1 프레임</button><button data-step="1" aria-label="한 프레임 다음">+1 프레임</button><label for="speed">속도</label><select id="speed"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option></select><label for="audio">소리</label><select id="audio"><option value="original">원본</option><option value="generated">새 합본</option><option value="none">음소거</option></select><output id="time" class="time">0.000초</output></div><input id="seek" class="seek" aria-label="합본 재생 위치" type="range" min="0" max="47.041667" step="0.0416666667" value="0"><p id="playback-note" class="playback-note">재생 시작은 버튼을 눌러 주세요. 두 영상의 소리는 동시에 켜지지 않습니다.</p></div>
    <p class="muted">{validation_text}</p><div class="section-head"><h2>8개 장면과 선택 이미지</h2><p>썸네일은 영상 프레임 캡처가 아닌 선택 스냅샷입니다.</p></div>{pending_html}<div class="clips">{''.join(clip_card(i, delivery) for i in range(1, 9))}</div>
    <footer><p>비교 기준: <a href="{link(original)}">rollback 원본</a> · 새 합본은 staging 파일을 읽습니다{mobile_link}{report_link}{delivery_link}.</p><p>목표 규격: 1129프레임 · 24 fps · 데스크톱 1916 × 1080 · 모바일 960 × 542 · GOP 6. 새 합본의 오디오는 각 기존 웹 영상의 AAC를 복사합니다.</p><p>상태 갱신: {esc(datetime.now().astimezone().isoformat(timespec='seconds'))} · 파일 생성 후 build-review.py를 다시 실행하면 링크와 상태가 갱신됩니다.</p></footer>
    </main><script>{JS}</script></body></html>'''
    target = HERE / "review.html"
    target.write_text(page)
    print(f"Built {target}: {completed}/8 final approved clips; {status}")


if __name__ == "__main__":
    main()
