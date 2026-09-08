"""Build a local three-stage image review from the verified selected manifest.

Reads original snapshots, pre-Vary selections, final Vary > Subtle selections and
their QA notes. Writes only variation/review.html; no browser or network calls.
"""

import hashlib
import html
import json
import os
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

from PIL import Image


HERE = Path(__file__).resolve().parent
RUN = HERE.parent
EXPECTED = [f"F{number:02d}-{part}" for number in range(1, 9) for part in ("IN", "MID", "OUT")]
TITLES = ["접근", "입구로 이동", "진입과 상승", "수직 상승", "천장 접근", "중력 전환", "첫 접촉", "백색 안개"]


def esc(value):
    return html.escape(str(value), quote=True)


def href(path):
    return quote(os.path.relpath(path, HERE), safe="/._-")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_frames():
    manifest = json.loads((HERE / "selected-manifest.json").read_text())
    if manifest.get("status") != "selected" or manifest.get("action") != "Vary > Subtle":
        raise ValueError("Expected a selected Vary > Subtle manifest")
    frames = manifest.get("frames", [])
    if len(frames) != 24 or {frame["id"] for frame in frames} != set(EXPECTED):
        raise ValueError("Expected all 24 unique frame IDs")
    indexed = {frame["id"]: frame for frame in frames}
    for frame in frames:
        fid = frame["id"]
        final = HERE / "selected" / f"{fid}.jpg"
        if Path(frame["path"]).resolve() != final.resolve():
            raise ValueError(f"Final selection path differs: {fid}")
        if sha(final) != frame["sha256"]:
            raise ValueError(f"Final image hash differs: {fid}")
        with Image.open(final) as image:
            if image.size != (frame["width"], frame["height"]) or image.size != (2928, 1648):
                raise ValueError(f"Unexpected final dimensions: {fid}: {image.size}")
            image.verify()
        for path in (RUN / "sources" / f"{fid}.png", RUN / "minimal" / "selected" / f"{fid}.jpg"):
            if not path.is_file():
                raise ValueError(f"Missing comparison image: {path}")
    return [indexed[fid] for fid in EXPECTED]


def image_column(path, title, subtitle, download_name):
    return f'''<figure><figcaption><strong>{esc(title)}</strong><span>{esc(subtitle)}</span></figcaption>
    <a class="image-link" href="{href(path)}" target="_blank" rel="noopener"><img loading="lazy" src="{href(path)}" alt="{esc(download_name)}"></a>
    <a class="download" href="{href(path)}" download="{esc(download_name)}">원본 파일 다운로드 ↓</a></figure>'''


def card(frame):
    fid = frame["id"]
    qa = frame.get("qa", {})
    needs_review = qa.get("qa_status") == "review_needed" or qa.get("all_four_bad") is True
    status = "검토 필요 · 4개 후보 모두 원본 보존 미흡" if qa.get("all_four_bad") is True else ("검토 필요" if needs_review else "비교 후 선택한 후보")
    notes = qa.get("notes", [])
    if isinstance(notes, str):
        notes = [notes]
    columns = [
        image_column(RUN / "sources" / f"{fid}.png", "1. 영상 원본 스냅샷", "원본 영상에서 추출", f"{fid}-source.png"),
        image_column(RUN / "minimal" / "selected" / f"{fid}.jpg", "2. Vary 전 선택본", "최소 변경 이미지 작업 후 선택", f"{fid}-before-vary.jpg"),
        image_column(HERE / "selected" / f"{fid}.jpg", "3. 최종 선택본", f"Vary > Subtle · 후보 인덱스 {frame['selected_index']}", f"{fid}-vary-subtle.jpg"),
    ]
    job_url = f"https://www.midjourney.com/jobs/{frame['job_id']}?index={frame['selected_index']}"
    reference_only = fid.endswith("-MID") or fid == "F08-OUT"
    usage = "영상 비교 참고 이미지" if reference_only else "영상 시작·끝 입력 이미지"
    return f'''<article id="{fid}" class="frame{' needs-review' if needs_review else ''}" data-status="{'review' if needs_review else 'candidate'}">
    <div class="frame-head"><div><h3>{fid}</h3><p>{usage}</p></div><div class="badges"><span class="badge{' warning' if needs_review else ''}">{status}</span><span class="badge">2928 × 1648</span></div></div>
    <div class="triptych">{''.join(columns)}</div><details{' open' if needs_review else ''}><summary>QA 메모 · 원본과 남아 있는 차이</summary><ul>{''.join(f'<li>{esc(note)}</li>' for note in notes)}</ul><p>검토 메모는 작성 당시 원문을 유지했습니다.</p></details>
    <div class="frame-foot"><a href="{esc(job_url)}" target="_blank" rel="noopener">선택한 Midjourney 작업 ↗</a><code>SHA256 {frame['sha256'][:16]}…</code></div></article>'''


CSS = """
:root{color-scheme:dark;--bg:#0c1116;--surface:#131b23;--border:#2b3945;--text:#e6edf4;--muted:#9aafbe;--accent:#bbd8dc}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.6 system-ui,-apple-system,'Segoe UI',sans-serif}main{max-width:1780px;margin:auto;padding:40px 26px 64px}a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}button{font:inherit}button,a:focus-visible,summary:focus-visible{outline-offset:3px}.eyebrow{color:var(--accent);font-size:12px;letter-spacing:.15em}h1{font-size:clamp(27px,3vw,43px);line-height:1.25;margin:12px 0 16px}header>p{max-width:1000px;color:var(--muted);margin:8px 0}.badges{display:flex;flex-wrap:wrap;gap:7px}.badge{border:1px solid #344854;background:#1a2a33;border-radius:99px;color:#c4dae0;font-size:12px;padding:3px 10px}.warning{color:#f0cd9e;border-color:#805e3b;background:#322820}.stats{margin:24px 0}.toolbar{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 15px;border:1px solid var(--border);border-radius:9px;background:#111c26f5;backdrop-filter:blur(10px)}.scenes{display:flex;gap:13px;flex-wrap:wrap}.scenes a{font-size:13px}.filters{display:flex;gap:7px}.filters button{border:1px solid var(--border);color:#c4d4df;background:#17232d;padding:6px 12px;border-radius:6px;cursor:pointer}.filters button[aria-pressed=true]{background:#314957;color:#fff;border-color:#7798a7}.scene{margin-top:34px}.scene>h2{font-size:23px;margin:0 0 14px}.scene>h2 span{color:var(--muted);font-size:15px;font-weight:400;margin-left:12px}.frame{border:1px solid var(--border);background:var(--surface);border-radius:10px;padding:18px;margin-bottom:18px}.needs-review{border-color:#89623e}.frame-head{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:15px}.frame-head h3{font-size:18px;margin:0}.frame-head p{font-size:12px;color:var(--muted);margin:4px 0 0}.triptych{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}figure{margin:0;min-width:0}figcaption{display:flex;flex-direction:column;gap:2px;margin-bottom:8px}figcaption strong{font-size:13px}figcaption span{font-size:11px;color:var(--muted)}.image-link{display:block;background:#05080b;border:1px solid #28323b;border-radius:5px;overflow:hidden}.image-link img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain}.download{display:inline-block;font-size:12px;margin-top:7px}details{margin-top:14px;padding:10px 12px;border:1px solid #2a3945;border-radius:6px;color:#becfda}summary{cursor:pointer;font-size:13px}details ul{font-size:13px;margin:12px 0;padding-left:21px}details p{font-size:11px;color:var(--muted);margin:8px 0 0}.frame-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;font-size:11px;color:var(--muted);margin-top:11px}code{font:11px ui-monospace,monospace;overflow-wrap:anywhere}footer{border-top:1px solid var(--border);padding-top:20px;margin-top:32px;font-size:12px;color:var(--muted)}[hidden]{display:none!important}@media(max-width:900px){main{padding:25px 12px 40px}.triptych{grid-template-columns:1fr}.frame{padding:13px}.frame-head{align-items:flex-start;flex-direction:column}.toolbar{position:static}.image-link img{max-height:60vh}figcaption{flex-direction:row;align-items:baseline;justify-content:space-between;gap:10px}.scene>h2{font-size:20px}.scene>h2 span{font-size:13px}}
"""


JS = """
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
 const reviewOnly=button.dataset.filter==='review';
 document.querySelectorAll('[data-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
 document.querySelectorAll('.frame').forEach(frame=>frame.hidden=reviewOnly&&frame.dataset.status!=='review');
 document.querySelectorAll('.scene').forEach(scene=>scene.hidden=![...scene.querySelectorAll('.frame')].some(frame=>!frame.hidden));
}));
"""


def main():
    frames = load_frames()
    review_count = sum(frame.get("qa", {}).get("qa_status") == "review_needed" or frame.get("qa", {}).get("all_four_bad") is True for frame in frames)
    sections = []
    for index in range(8):
        cards = "".join(card(frame) for frame in frames[index * 3:index * 3 + 3])
        sections.append(f'<section class="scene" id="scene-{index + 1}"><h2>C{index + 1:02d}<span>{TITLES[index]}</span></h2>{cards}</section>')
    navigation = "".join(f'<a href="#scene-{i}">C{i:02d}</a>' for i in range(1, 9))
    page = f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Heptapod B · Vary Subtle 24장 비교</title><style>{CSS}</style></head><body><main>
    <header><div class="eyebrow">HEPTAPOD B / IMAGE COMPARISON</div><h1>원본부터 Vary &gt; Subtle까지, 24장 비교</h1><p>각 행은 영상 원본 스냅샷, Vary 전 선택본, Vary &gt; Subtle 최종 선택본을 보여 줍니다. 이미지를 누르면 전체 크기로 열리고 다운로드 링크는 보관된 원본 파일을 제공합니다.</p><p>24개 Vary &gt; Subtle 작업에서 96개 후보를 받은 뒤 장면별 1장을 선택했습니다. 최종 파일은 모두 네이티브 HD 2928 × 1648이며, 구도와 형상의 잔여 차이는 QA 메모에 기록되어 있습니다.</p>
    <div class="stats badges"><span class="badge">Vary &gt; Subtle 24 / 24 완료</span><span class="badge">96개 후보 → 24개 선택</span><span class="badge">실측 크기·SHA256 확인</span><span class="badge warning">검토 필요 {review_count}장</span></div></header>
    <nav class="toolbar" aria-label="비교 탐색"><div class="scenes">{navigation}<a href="../video-v2/review.html">영상 비교 ↗</a></div><div class="filters"><button data-filter="all" aria-pressed="true">전체 24장</button><button data-filter="review" aria-pressed="false">검토 필요 {review_count}장</button></div></nav>
    {''.join(sections)}<footer><p>작업 유형: Vary &gt; Subtle. 최종 선택이 원본과 완전히 동일함을 뜻하지 않습니다. 특히 F03-MID는 4개 후보 모두 원본 보존이 미흡해 검토 필요 상태를 유지했습니다. 이 이미지는 영상의 IN·OUT 입력에 사용되지 않는 MID 참고 프레임입니다.</p><p><a href="selected-manifest.json">선택 및 QA 기록 JSON</a> · <a href="../video-v2/review.html">기존 영상과 새 합본 비교</a> · 생성 시각 {esc(datetime.now().astimezone().isoformat(timespec='seconds'))}</p></footer>
    </main><script>{JS}</script></body></html>'''
    target = HERE / "review.html"
    target.write_text(page)
    print(f"Built {target}: 24 verified triptychs, {review_count} review-needed frame(s)")


if __name__ == "__main__":
    main()
