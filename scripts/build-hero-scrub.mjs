/**
 * build-hero-scrub.mjs — 히어로 스크럽 자산 빌드 (oneir build-hero-scrub.mjs 이식)
 *
 * 최종 히어로 영상(Kling, 47.08s, 키프레임 7개)을 스크럽 가능한 형태로 다시 만든다.
 * - 짧은 GOP(6프레임)로 재인코딩 → 데스크톱 1920 / 모바일 960. 오디오는 파일에 남긴다(직접 재생 시 소리 존재).
 * - 포스터(첫 프레임 jpg).
 * - 비트별 사운드 클립(mp3): 같은 타임라인의 오디오를 비트 구간대로 잘라 -16 LUFS 정적 게인으로 정렬.
 *   (같은 타임라인에서 자르므로 엔진의 fraction × duration 이 곧 영상 시간)
 * - 베드 루프(mp3): 억제된 상승 구간(21–31s)의 저역을 seamless 루프로 만든다.
 *   엔진이 loopStart=1 / loopEnd=dur-0.5 로 루프하므로 [1, 9.5] 구간이 정확히 한 주기(8.5s)가 되게 배치.
 * - scrub-timeline.json 기록(참고용 — 소스 오브 트루스는 src/data/heptapodScrubTimeline.js).
 *
 * 사용: node scripts/build-hero-scrub.mjs
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { HERO_STORY_BEATS } from '../src/data/heptapodHeroStory.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SOURCE = resolve(
  ROOT,
  'public/heptapod-b-encoder/hero-motion/kling-audio-01-final/kling-audio-01-final-hero-v1-source01v2-screenfillv4.mp4',
);
const OUT_DIR = resolve(ROOT, 'public/heptapod-b-encoder/hero-scrub');
const AUDIO_DIR = resolve(ROOT, 'public/heptapod-b-encoder/audio');
const CLIP_DIR = resolve(AUDIO_DIR, 'clips');
const DESKTOP = resolve(OUT_DIR, 'hero-scrub-1920.mp4');
const MOBILE = resolve(OUT_DIR, 'hero-scrub-960.mp4');
const POSTER = resolve(OUT_DIR, 'hero-scrub-poster.jpg');
const TIMELINE = resolve(OUT_DIR, 'scrub-timeline.json');
const BED = resolve(AUDIO_DIR, 'bed-loop.mp3');

/** 클립 라우드니스 목표(LUFS) — oneir 스파팅 시트와 동일 (loudnorm 2-pass) */
const CLIP_LUFS = -16;
/** 베드는 조금 더 낮게 (엔진 bedGain 0.255 와 별개로 소스 자체를 눌러둔다) */
const BED_LUFS = -18;
/** 베드 소스 구간(초) — 07-09 억제된 상승, 저역 정상 구간 */
const BED_SRC_START = 21;
/** 베드 파일 길이 / 엔진 루프 주기 */
const BED_LEN = 10;
const BED_PERIOD = 8.5;
const BED_XFADE = 2;

function run(args, { capture = false } = {}) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-y', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : ['ignore', 'inherit', 'inherit'],
  });
  if (result.status !== 0) {
    if (capture) process.stderr.write(result.stderr || '');
    throw new Error(`ffmpeg failed: ${args.join(' ')}`);
  }
  return result;
}

function probe(file, entries) {
  const result = spawnSync('ffprobe', ['-v', 'error', ...entries, '-of', 'json', file], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(`ffprobe failed: ${file}`);
  return JSON.parse(result.stdout);
}

function duration(file) {
  return Number(probe(file, ['-show_entries', 'format=duration']).format.duration);
}

function keyframeCount(file) {
  const result = spawnSync(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'v:0', '-skip_frame', 'nokey', '-show_entries', 'frame=pts_time', '-of', 'csv=p=0', file],
    { cwd: ROOT, encoding: 'utf8' },
  );
  return result.stdout.split('\n').filter(Boolean).length;
}

/**
 * loudnorm 2-pass (linear=true → 정적 게인, 다이내믹 보존). 1패스로 측정치를 얻고 2패스에서 적용한다.
 * ebur128 단일 측정 + volume 은 게이팅 차이로 결과가 ±3 LU 튀어(실측) 2-pass 로 고정한다.
 *
 * @param {string} input - 입력 파일(wav)
 * @param {string} output - 출력 mp3
 * @param {number} targetI - 목표 통합 라우드니스(LUFS)
 * @param {string} bitrate - mp3 비트레이트
 * @returns {{ inputI: number, outputI: number }}
 */
/** ffmpeg stderr 에서 loudnorm 의 JSON 블록만 추출 (뒤에 muxing 요약 줄이 따라붙는다) */
function parseLoudnormJson(stderr = '') {
  const start = stderr.lastIndexOf('{');
  const end = stderr.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('loudnorm JSON 을 찾지 못함');
  return JSON.parse(stderr.slice(start, end + 1));
}

function normalizeLoudness(input, output, targetI, bitrate) {
  const base = `I=${targetI}:TP=-1.5:LRA=11`;
  const pass1 = run(['-i', input, '-af', `loudnorm=${base}:print_format=json`, '-f', 'null', '-'], { capture: true });
  const m = parseLoudnormJson(pass1.stderr);
  const measured = `measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}`;
  const pass2 = run([
    '-loglevel', 'info', '-i', input,
    '-af', `loudnorm=${base}:${measured}:linear=true:print_format=json`,
    '-ar', '44100', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', bitrate,
    output,
  ], { capture: true });
  const out = parseLoudnormJson(pass2.stderr);
  return { inputI: Number(m.input_i), outputI: Number(out.output_i), mode: out.normalization_type };
}

function buildDesktop() {
  run([
    '-loglevel', 'warning', '-i', SOURCE,
    '-map', '0:v:0', '-map', '0:a:0',
    '-vf', 'fps=24,setsar=1,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21',
    '-profile:v', 'high', '-level:v', '4.0',
    '-g', '6', '-keyint_min', '6', '-sc_threshold', '0',
    '-pix_fmt', 'yuv420p', '-video_track_timescale', '12288',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-ac', '2',
    '-movflags', '+faststart',
    DESKTOP,
  ]);
}

function buildMobile() {
  run([
    '-loglevel', 'warning', '-i', DESKTOP,
    '-map', '0:v:0', '-map', '0:a:0',
    '-vf', 'scale=960:-2:flags=lanczos',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
    '-profile:v', 'high', '-level:v', '3.1',
    '-g', '6', '-keyint_min', '6', '-sc_threshold', '0',
    '-pix_fmt', 'yuv420p', '-video_track_timescale', '12288',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-ac', '2',
    '-movflags', '+faststart',
    MOBILE,
  ]);
}

function buildPoster() {
  run(['-loglevel', 'warning', '-i', DESKTOP, '-frames:v', '1', '-update', '1', '-q:v', '3', POSTER]);
}

/** 비트 클립 — 같은 타임라인의 오디오를 비트 구간대로 컷(wav) → loudnorm 2-pass → mp3 */
function buildClips(total, tempDir) {
  mkdirSync(CLIP_DIR, { recursive: true });
  const report = [];
  for (const beat of HERO_STORY_BEATS) {
    const [start, endRaw] = beat.video;
    const end = Math.min(endRaw, total);
    const dur = end - start;
    const wav = resolve(tempDir, `${beat.id}.wav`);
    run(['-loglevel', 'warning', '-i', SOURCE, '-ss', String(start), '-t', String(dur), '-map', '0:a:0', '-vn', '-ac', '2', '-c:a', 'pcm_s16le', wav]);
    const out = resolve(CLIP_DIR, `${beat.id}.mp3`);
    const r = normalizeLoudness(wav, out, CLIP_LUFS, '256k');
    report.push({ id: beat.id, start, duration: Number(dur.toFixed(3)), sourceLufs: r.inputI, outputLufs: r.outputI });
    console.log(`  clip ${beat.id}  ${start}s +${dur.toFixed(2)}s  src ${r.inputI} → ${r.outputI} LUFS (${r.mode})`);
  }
  return report;
}

/**
 * 베드 루프 — seamless 주기 S(8.5s)를 만든 뒤 두 번 이어 10s로 자른다.
 * [1, 9.5] = 정확히 한 주기 → 엔진 loopStart/End 에서 이음매 없음. 파일 양끝(루프 밖)만 짧게 페이드.
 */
function buildBed(tempDir) {
  const a0 = BED_SRC_START;
  const a1 = a0 + BED_PERIOD;
  const b1 = a1 + BED_XFADE;
  const filter = [
    `[0:a]atrim=${a0}:${a1},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=${BED_XFADE}[a]`,
    `[0:a]atrim=${a1}:${b1},asetpts=PTS-STARTPTS,afade=t=out:st=0:d=${BED_XFADE},apad=whole_dur=${BED_PERIOD}[b]`,
    `[a][b]amix=inputs=2:normalize=0[loop]`,
    `[loop]asplit=2[l1][l2]`,
    `[l1][l2]concat=n=2:v=0:a=1,atrim=0:${BED_LEN},asetpts=PTS-STARTPTS,` +
      `afade=t=in:st=0:d=0.3,afade=t=out:st=${BED_LEN - 0.3}:d=0.3[out]`,
  ].join(';');
  const wav = resolve(tempDir, 'bed-loop.wav');
  run(['-loglevel', 'warning', '-i', SOURCE, '-filter_complex', filter, '-map', '[out]', '-ac', '2', '-c:a', 'pcm_s16le', wav]);
  const r = normalizeLoudness(wav, BED, BED_LUFS, '192k');
  console.log(`  bed   ${a0}s period ${BED_PERIOD}s  src ${r.inputI} → ${r.outputI} LUFS (${r.mode})`);
  return { sourceStart: a0, period: BED_PERIOD, length: BED_LEN, sourceLufs: r.inputI, outputLufs: r.outputI };
}

function validate(file, width, expectTotal) {
  const info = probe(file, ['-show_entries', 'stream=codec_type,width,height,r_frame_rate,nb_frames,codec_name,channels']);
  const v = info.streams.find((s) => s.codec_type === 'video');
  const a = info.streams.find((s) => s.codec_type === 'audio');
  const d = duration(file);
  const kf = keyframeCount(file);
  const frames = Number(v.nb_frames);
  if (v.width !== width) throw new Error(`width ${v.width} != ${width}: ${file}`);
  if (v.r_frame_rate !== '24/1') throw new Error(`fps ${v.r_frame_rate}: ${file}`);
  if (!a || a.channels !== 2) throw new Error(`audio missing/mono: ${file}`);
  if (Math.abs(d - expectTotal) > 0.15) throw new Error(`duration ${d} != ${expectTotal}: ${file}`);
  if (kf < frames / 6 - 2) throw new Error(`keyframes ${kf} < frames/6 (${frames}): ${file}`);
  console.log(`  ok ${file.replace(ROOT + '/', '')}  ${v.width}x${v.height}  ${d.toFixed(2)}s  frames ${frames}  keyframes ${kf}`);
}

function main() {
  const audioOnly = process.argv.includes('--audio-only');
  if (!existsSync(SOURCE)) throw new Error(`source missing: ${SOURCE}`);
  const total = duration(SOURCE);
  console.log(`source ${total.toFixed(2)}s`);
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(AUDIO_DIR, { recursive: true });

  if (!audioOnly) {
    console.log('video');
    buildDesktop();
    validate(DESKTOP, 1916, total);
    buildMobile();
    validate(MOBILE, 960, total);
    buildPoster();
  }

  console.log('audio');
  const tempDir = mkdtempSync(join(tmpdir(), 'heptapod-scrub-'));
  let clips;
  let bed;
  try {
    clips = buildClips(total, tempDir);
    bed = buildBed(tempDir);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  writeFileSync(
    TIMELINE,
    `${JSON.stringify({ source: SOURCE.replace(ROOT + '/', ''), total: Number(total.toFixed(3)), clips, bed, builtAt: new Date().toISOString() }, null, 2)}\n`,
  );
  console.log(`done → ${OUT_DIR.replace(ROOT + '/', '')}, ${AUDIO_DIR.replace(ROOT + '/', '')}`);
}

main();
