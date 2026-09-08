"""Submit only Midjourney Upscale > Subtle through serialized Aside UI calls.

Examples:
  python3 upscale-subtle.py F01-IN=UUID:0 F03-MID=UUID:2
  python3 upscale-subtle.py --manifest selected.json

A manifest is a list, or {"frames": [...]}, with id, job_id (or
source_job_id), and selected_index. This controller never downloads images.
Any uncertain click leaves a durable record and stops without retrying.
"""
import argparse
import fcntl
import json
import pathlib
import re
import subprocess
import sys
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / "final"
MARKER = "RESULT_JSON "
UUID = r"[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}"

UPSCALE = r'''
let clickAttempted=false;
let p=null;
const failureFromText=text=>{
  if(/HD jobs cannot be upscaled/i.test(String(text||'')))
    return {status:'failed_hd_unsupported',message:'HD jobs cannot be upscaled'};
  if(/Creation failed/i.test(String(text||'')))
    return {status:'failed_creation',message:'Creation failed'};
  return null;
};
let result={id:CONFIG.id,source_job_id:CONFIG.source_job_id,
 selected_index:CONFIG.selected_index,source_selection_url:CONFIG.url,
 status:'not_clicked',requested_action:'Upscale > Subtle'};
try {
  p=await openTab(CONFIG.url);
  // Only this newly opened ephemeral job tab is controlled. Never attach to Imagine.
  let original=null;
  const imageDeadline=Date.now()+20000;
  while(Date.now()<imageDeadline) {
    original=await p.evaluate(({job,index})=>{
      const target='/'+job+'/0_'+index+'.jpeg';
      const imgs=[...document.querySelectorAll('img')].filter(img=>{
        try {return new URL(img.src).pathname.endsWith(target);}
        catch {return false;}
      });
      const loaded=imgs.filter(img=>img.complete && img.naturalWidth>0);
      if(!loaded.length) return null;
      const urls=[...new Set(loaded.map(img=>img.src))];
      if(urls.length!==1) throw Error('Multiple source original URLs');
      return {url:urls[0],width:loaded[0].naturalWidth,height:loaded[0].naturalHeight};
    },{job:CONFIG.source_job_id,index:CONFIG.selected_index});
    if(original) break;
    await sleep(300);
  }
  if(!original) throw Error('Selected modal original did not load within 20 seconds');
  result.source_original_observed=original;
  const top=async()=>await p.evaluate(()=>{
    const feed=document.querySelector('div.absolute.box-border.overflow-y-scroll');
    if(!feed) throw Error('Known virtual feed scroll container missing');
    feed.scrollTop=0;
  });
  const links=async()=>await p.evaluate(()=>
    [...new Set([...document.querySelectorAll('a[href^="/jobs/"]')]
      .map(a=>a.getAttribute('href')))]);
  // Scroll and stabilize BEFORE taking the action snapshot; later DOM refs are fresh.
  let previous='',stableSince=Date.now(),before=null;
  const stableDeadline=Date.now()+6000;
  while(Date.now()<stableDeadline) {
    await top();
    const current=await links(),key=JSON.stringify(current);
    if(key!==previous) {previous=key;stableSince=Date.now();}
    if(current.length && Date.now()-stableSince>=1000) {before=current;break;}
    await sleep(250);
  }
  if(!before) throw Error('Job feed did not stabilize before action');
  result.before_jobs=before;
  const beforeIds=[...new Set(before.map(h=>h.match(/^\/jobs\/([a-f0-9-]+)/i)?.[1])
    .filter(Boolean).concat(CONFIG.source_job_id))];
  result.before_job_ids=beforeIds;
  const actionSnapshot=(await snapshot(p)).tree;
  result.action_snapshot=actionSnapshot;
  const lines=actionSnapshot.split('\n');
  const sections=[];
  for(let i=0;i<lines.length;i++) {
    if(!/\blink "Upscale"(?:\s|$)/.test(lines[i])) continue;
    const section=[];
    for(let k=i+1;k<lines.length;k++) {
      if(/\b(?:link|heading) "/.test(lines[k])) break;
      section.push(lines[k]);
    }
    const matches=section.map(line=>line.match(/\bbutton "Subtle"\s+\[ref=(e\d+)\]/))
      .filter(Boolean);
    // The exact Upscale section must contain Subtle and Creative, not Vary's controls.
    if(matches.length===1 && section.some(line=>/\bbutton "Creative"/.test(line)))
      sections.push({ref:matches[0][1],heading:lines[i],lines:section});
  }
  if(sections.length!==1) throw Error('No unique Upscale > Subtle section; refusing any fallback');
  const action=sections[0];
  result.action_ref=action.ref;
  result.action_section=action;
  const button=p.locator(action.ref);
  if(await button.isDisabled()) throw Error('Upscale > Subtle is disabled');
  // Mark BEFORE awaiting click: a rejected/timeout click may already have submitted.
  clickAttempted=true;
  result.click_attempted_at=new Date().toISOString();
  await button.click();
  result.click_returned=true;
  await sleep(700);
  result.after_click_snapshot=(await snapshot(p)).tree;
  console.log('AFTER_CLICK '+result.after_click_snapshot);
  const immediateFailure=failureFromText(result.after_click_snapshot);
  if(immediateFailure) {
    result.failure_status=immediateFailure.status;
    result.failure_message=immediateFailure.message;
    throw Error(immediateFailure.message);
  }
  let verified=null,stableKey='',seenCount=0;
  const observations=[];
  const deadline=Date.now()+40000;
  while(Date.now()<deadline) {
    await top();
    const observation=await p.evaluate(before=>{
      const feed=document.querySelector('div.absolute.box-border.overflow-y-scroll');
      if(!feed) throw Error('Known feed disappeared');
      const normalize=s=>String(s||'').replace(/\s+/g,' ').trim();
      const removeProgress=s=>{
        let value=normalize(s),previous;
        do {
          previous=value;
          value=value.replace(/^(?:\d+%\s*Complete|Submitting\.{0,3}|Queued|Waiting to start|Starting\.{0,3})\s*/i,'');
        } while(value!==previous);
        return value;
      };
      const all=[...document.querySelectorAll('a[href^="/jobs/"]')];
      const feedAnchors=[...feed.querySelectorAll('a[href^="/jobs/"]')];
      const groups={};
      for(const a of feedAnchors) {
        const href=a.getAttribute('href'),id=href.match(/^\/jobs\/([a-f0-9-]+)/i)?.[1];
        if(!id || before.includes(id)) continue;
        (groups[id] ||= []).push(a);
      }
      const candidates=[];
      for(const [id,anchors] of Object.entries(groups)) {
        const hrefs=[...new Set(anchors.map(a=>a.getAttribute('href')))];
        if(hrefs.length!==1) continue;
        let e=anchors[0].parentElement;
        while(e && e!==feed && e!==document.body) {
          const cardLinks=[...new Set([...e.querySelectorAll('a[href^="/jobs/"]')]
            .map(a=>a.getAttribute('href')))];
          if(cardLinks.length===1 && /^Upscale\s*\(S\)/.test(removeProgress(e.innerText))) {
            candidates.push({job_id:id,new_jobs:hrefs,card_text:e.innerText,
              normalized_card_text:removeProgress(e.innerText)});
            break;
          }
          e=e.parentElement;
        }
      }
      return {all_observed_links:[...new Set(all.map(a=>a.getAttribute('href')))],candidates,
        visible_failure_text:/HD jobs cannot be upscaled|Creation failed/i.test(feed.innerText)
          ? feed.innerText : null};
    },beforeIds);
    observations.push(observation);
    result.all_observed_links=[...new Set(observations.flatMap(x=>x.all_observed_links))];
    result.observations=observations;
    const laterFailure=failureFromText(observation.visible_failure_text);
    if(laterFailure) {
      result.failure_status=laterFailure.status;
      result.failure_message=laterFailure.message;
      throw Error(laterFailure.message);
    }
    if(observation.candidates.length>1) throw Error('Multiple new Upscale (S) jobs; attribution ambiguous');
    if(observation.candidates.length===1) {
      const current=observation.candidates[0];
      if(current.job_id===stableKey) seenCount++;else {stableKey=current.job_id;seenCount=1;}
      if(seenCount>=2) {verified=current;break;}
    } else {stableKey='';seenCount=0;}
    await sleep(500);
  }
  if(!verified) throw Error('No unique single-image Upscale (S) job verified within 40 seconds');
  result={...result,...verified,status:'confirmed',confirmed_at:new Date().toISOString()};
} catch(error) {
  // Preserve a fresh error-state snapshot even if the click threw or polling failed later.
  // Keep the first after-click snapshot intact when it already exists.
  if(clickAttempted && p) {
    try {
      const errorSnapshot=(await snapshot(p)).tree;
      if(!result.after_click_snapshot) result.after_click_snapshot=errorSnapshot;
      result.after_click_error_snapshot=errorSnapshot;
      console.log('AFTER_CLICK_ERROR '+errorSnapshot);
      const failure=failureFromText(errorSnapshot)||failureFromText(result.after_click_snapshot);
      if(failure) {result.failure_status=failure.status;result.failure_message=failure.message;}
    } catch(snapshotError) {
      result.after_click_error_snapshot_error=String(snapshotError);
    }
  }
  result={...result,status:result.failure_status||(clickAttempted?'submission_uncertain':'not_clicked'),error:String(error)};
}
console.log('RESULT_JSON '+JSON.stringify(result));
'''


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def normalized_selection(frame, job, index):
    if not re.fullmatch(r"F\d{2}-(?:IN|MID|OUT)", str(frame)):
        raise ValueError(f"Invalid frame ID: {frame}")
    if not re.fullmatch(UUID, str(job)):
        raise ValueError(f"Invalid source job UUID: {job}")
    if isinstance(index, bool) or str(index) not in ("0", "1", "2", "3"):
        raise ValueError(f"Selected index must be 0–3: {frame}")
    return {"id": str(frame), "source_job_id": str(job).lower(), "selected_index": int(index)}


def load_selections(args):
    rows = []
    if args.manifest:
        value = json.loads(pathlib.Path(args.manifest).read_text())
        records = value if isinstance(value, list) else value.get("frames")
        if not isinstance(records, list):
            raise ValueError("Manifest must contain a frames list")
        for row in records:
            rows.append(normalized_selection(row["id"], row.get("source_job_id") or row.get("job_id"),
                                             row["selected_index"]))
    for text in args.selections:
        match = re.fullmatch(r"(F\d{2}-(?:IN|MID|OUT))=(" + UUID + r"):([0-3])", text)
        if not match:
            raise ValueError(f"Expected FRAME=JOB_UUID:INDEX: {text}")
        rows.append(normalized_selection(*match.groups()))
    if not rows:
        raise ValueError("Supply explicit selections or --manifest")
    if len({r["id"] for r in rows}) != len(rows):
        raise ValueError("Duplicate frame IDs in input")
    if len({(r["source_job_id"], r["selected_index"]) for r in rows}) != len(rows):
        raise ValueError("Duplicate original job/index selection in input")
    return rows


def run_aside(config):
    source = "const CONFIG = " + json.dumps(config, ensure_ascii=False) + ";\n" + UPSCALE
    log = OUT / "logs" / f"{config['id']}-upscale-subtle.log"
    try:
        completed = subprocess.run(["aside", "repl", source], capture_output=True, text=True, timeout=90)
    except subprocess.TimeoutExpired as error:
        def decoded(value):
            return value.decode(errors="replace") if isinstance(value, bytes) else (value or "")
        log.write_text(decoded(error.stdout) + decoded(error.stderr))
        raise RuntimeError(f"Aside exceeded 90 seconds; do not retry; inspect {log}") from error
    log.write_text(completed.stdout + completed.stderr)
    clean = re.sub(r"\x1b\[[0-9;]*m", "", completed.stdout)
    records = [line.split(MARKER, 1)[1] for line in clean.splitlines() if MARKER in line]
    if completed.returncode or len(records) != 1:
        raise RuntimeError(f"No unique Aside result; do not retry; inspect {log}")
    return json.loads(records[0])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("selections", nargs="*", help="FRAME=JOB_UUID:INDEX")
    parser.add_argument("--manifest", help="Selected frame manifest with job_id and selected_index")
    args = parser.parse_args()
    rows = load_selections(args)
    for name in ("jobs", "logs"):
        (OUT / name).mkdir(parents=True, exist_ok=True)
    with (OUT / "upscale-subtle.lock").open("a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise RuntimeError("Another Subtle upscale controller is active") from error
        for row in rows:
            path = OUT / "jobs" / f"{row['id']}.json"
            if path.exists():
                prior = json.loads(path.read_text())
                same = all(prior.get(key) == row[key] for key in row)
                if same and prior.get("status") == "confirmed" and prior.get("job_id"):
                    print(row["id"], "already confirmed", prior["job_id"], flush=True)
                    continue
                raise RuntimeError(f"Existing uncertain/different selection record; review, do not retry: {path}")
            for existing in (OUT / "jobs").glob("*.json"):
                prior = json.loads(existing.read_text())
                if (prior.get("source_job_id"), prior.get("selected_index")) == (row["source_job_id"], row["selected_index"]):
                    raise RuntimeError(f"Original selection already has an upscale attempt: {existing}")
            config = {**row, "url": f"https://www.midjourney.com/jobs/{row['source_job_id']}?index={row['selected_index']}"}
            record = {**row, "status": "submission_pending_verification", "requested_action": "Upscale > Subtle",
                      "source_selection_url": config["url"], "started_at": datetime.now(timezone.utc).isoformat()}
            # Persist before invoking browser: a crash cannot lead to silent duplicate submissions.
            save(path, record)
            try:
                response = run_aside(config)
                if any(response.get(key) != row[key] for key in row):
                    raise RuntimeError("Aside response selection mismatch")
                record.update(response)
            except Exception as error:
                record.update(status="submission_uncertain", error=str(error))
                save(path, record)
                raise
            save(path, record)
            if record["status"] != "confirmed":
                raise RuntimeError(f"{row['id']}: {record.get('error', record['status'])}; stopped without retry")
            print(row["id"], "Upscale (S) confirmed", record["job_id"], flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("STOP:", error, file=sys.stderr, flush=True)
        sys.exit(1)
