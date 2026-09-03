import fs from 'node:fs/promises';

/** 정본 스토리 경로(direct)의 나머지 세그먼트 — kling spec을 seedance spec으로 변환 */
const SEGMENTS = [
  { kling: 'kling-audio-02-03-slow-lift-hole-only-spec.json', part: '02-03', name: 'slow-lift-hole' },
  { kling: 'kling-audio-03-05-direct-lift-up-camera-zoom-spec.json', part: '03-05', name: 'direct-lift-up' },
  { kling: 'kling-audio-05-07-direct-same-axis-ascent-v2-spec.json', part: '05-07', name: 'direct-ascent' },
  { kling: 'kling-audio-07-09-direct-ceiling-far-v4-still-workers-spec.json', part: '07-09', name: 'ceiling-far' },
  { kling: 'kling-audio-09-10-gravity-reorientation-v1-spec.json', part: '09-10', name: 'gravity-reorient' },
  { kling: 'kling-audio-10-11-walk-to-wide-wall-v2-spec.json', part: '10-11', name: 'walk-wide-wall' },
  { kling: 'kling-audio-11-screen-fill-camera-push-v4-spec.json', part: '11-screen-fill', name: 'screen-fill' },
];

const VALID_DUR = new Set(['auto', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15']);

const written = [];
for (const seg of SEGMENTS) {
  const kling = JSON.parse(await fs.readFile(seg.kling, 'utf8'));
  const clip = kling.clips[0];
  let duration = String(clip.duration ?? kling.duration ?? '5');
  if (!VALID_DUR.has(duration)) duration = 'auto';

  const dir = `../../public/heptapod-b-encoder/hero-motion/seedance-${seg.part}`;
  const id = `seedance-${seg.part}-${seg.name}-v1`;
  const spec = {
    profile: 'seedance',
    duration,
    resolution: '1080p',
    aspect_ratio: '16:9',
    generate_audio: true,
    out: `${dir}/submissions-${seg.part}.json`,
    clips: [
      {
        id,
        scene: clip.scene || 'one-take',
        part: seg.part,
        start: clip.start,
        ...(clip.end ? { end: clip.end } : {}),
        output: `${dir}/${id}.mp4`,
        prompt: clip.prompt,
      },
    ],
  };
  const specFile = `seedance-${seg.part}-spec.json`;
  await fs.writeFile(specFile, `${JSON.stringify(spec, null, 2)}\n`);
  written.push({ specFile, id, duration, end: clip.end ? 'yes' : 'no' });
}

console.log(JSON.stringify(written, null, 2));
