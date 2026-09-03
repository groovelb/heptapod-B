import { useEffect, useRef, useState } from 'react';

/** 페이드인 시간(초) — 클릭/팝 방지용 짧은 램프 (오디오 전용, UI 아님) */
const RAMP_IN = 0.12;
/** 클립 전환 크로스페이드(초) — 겹침을 피해야 하므로 짧게 유지 */
const SWAP_FADE = 0.25;
/** 스크롤 정지 시 사라지는 시간(초) — 길게: 잔향이 남듯 서서히 */
const IDLE_FADE = 1.1;
/** 영상 완주 시 사라지는 시간(초) — 가장 길게: 베드까지 함께 잦아든다 */
const END_FADE = 2.2;
/** 페이드 중인 잔향을 새 소스가 밀어낼 때의 정리 시간(초) */
const TAIL_CUT = 0.18;
/** 스크롤이 멈춘 것으로 보는 무입력 시간(ms) */
const IDLE_MS = 140;
/** 아이들 감시 주기(ms) */
const IDLE_TICK_MS = 60;
/** 오디오-영상 위치 어긋남 허용치(초). 초과 시 정확한 지점으로 재정렬한다 */
const DRIFT_TOLERANCE = 0.35;

/**
 * 기본 피치 하강(cents, 음수 = 낮춤). 소리를 더 낮고 시네마틱하게 가라앉힌다.
 * detune는 음정을 내린다. 순수 Web Audio에는 피치-독립 시프트가 없어 재생 속도도
 * computedRate = 2^(cents/1200) 배로 함께 느려지지만, 그 부작용은 미미하고
 * 아래 드리프트 보정에서 이 rate를 반영하므로 스크럽 sync는 어긋나지 않는다.
 * -40 cents ≈ 0.4 semitone down (재생 속도 약 0.977x). 런타임에 setPitch로 바꿀 수 있다.
 */
const DEFAULT_PITCH_CENTS = -40;
/** cents → 재생 속도 배율 (detune는 속도와 커플링) */
const centsToRate = (cents) => 2 ** (cents / 1200);

/**
 * 합성 드론 레이어("우우웅") — SEQ_00→SEQ_01 오프닝 씬의 저역 드론을 오실레이터로 만든다.
 * 클립 mp3에 구워진 드론과 달리 **스크롤이 멈춰도 씬 안에서는 지속**되고, 파라미터로 조절된다.
 *  freq     근본 주파수(Hz). 두 오실레이터(근본 + 미세 디튠)로 느린 비팅을 만든다
 *  level    기본 게인(0~1)
 *  ampRate  진폭 LFO 주파수(Hz) — "우우웅" 트레몰로 속도
 *  ampDepth 진폭 LFO 깊이(0~1, level 대비 비율)
 */
export const DRONE_DEFAULT = { freq: 74, level: 0.054, ampRate: 0.9, ampDepth: 0.6 };
/** 드론 로우패스 컷오프(Hz) — 저역만 남겨 warm하게 */
const DRONE_CUTOFF_HZ = 180;
/** 근본 대비 둘째 오실레이터 디튠(cents) — 느린 비팅으로 움직임 */
const DRONE_BEAT_CENTS = 7;
/** 씬 on/off 램프(초) */
const DRONE_FADE = 0.6;
/** 영상 완주 판정 여유 (progress 상한이 부동소수점상 1.0에 미세 미달) */
const END_EPSILON = 1e-3;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * findClipIndex (내부 유틸)
 *
 * 진행도 p(0..1)가 속한 클립 인덱스를 찾는다. 경계값은 다음 클립에 귀속시켜
 * (마지막 클립만 끝점 포함) 인접 클립이 같은 지점을 중복 소유하지 않게 한다.
 *
 * @param {Array<object>} clips - timeline.clips
 * @param {number} p - 스크럽 진행도
 * @returns {number} 클립 인덱스, 범위 밖이면 -1
 */
function findClipIndex(clips, p) {
  for (let i = 0; i < clips.length; i += 1) {
    const { startNorm, endNorm } = clips[i];
    const isLast = i === clips.length - 1;
    if (p >= startNorm && (isLast ? p <= endNorm : p < endNorm)) return i;
  }
  return -1;
}

/**
 * useScrubSoundEngine 훅
 *
 * 스크럽 시퀀스의 사운드 엔진 (Web Audio). 영상은 무음으로 스크럽되고,
 * 소리는 별도 오디오 그래프에서 **화면 위치에 결속되어** 난다.
 *
 * 동기화 방식 (핵심):
 * 1. 위치 결속 — 클립 사운드는 스크롤 위치에 대응하는 지점부터 재생한다.
 *    (진행도 f -> 버퍼 오프셋 f x duration). 클립 진입 순간부터 통째로 흘려보내지 않는다.
 * 2. 아이들 게이트 — 스크롤이 멈추면(=화면이 멈추면) 클립 사운드도 멈춘다.
 *    화면은 정지했는데 소리만 흘러가 어긋나는 것을 원천 차단한다.
 * 3. 드리프트 보정 — 스크롤 중에는 오디오가 실시간으로 흐르므로 스크럽 속도와 벌어진다.
 *    벌어짐이 허용치를 넘으면 정확한 지점으로 재정렬한다(짧은 크로스페이드).
 * 4. 종료 무음 — 영상이 마지막 프레임에 도달하면 베드까지 전부 멈춘다.
 *    되돌아 스크롤하면 다시 살아난다.
 *
 * 사용자 관점 동작 흐름:
 * 1. "SOUND OFF" 클릭 -> 오디오 언락, 버퍼 로드, 베드 앰비언스가 깔린다
 * 2. 스크롤하는 동안에만 그 장면의 소리가 화면과 같은 지점에서 난다
 * 3. 스크롤을 멈추면 장면 사운드가 사라지고 베드만 남는다
 * 4. 영상이 끝나면(퇴장 셀) 소리가 완전히 멈춘다
 *
 * @param {Array<object>} clips - timeline.clips ({ id, startNorm, endNorm }) [Required]
 * @param {object} options - 엔진 옵션 [Optional]
 * @param {string} options.bedSrc - 베드 루프 오디오 경로 [Optional, 기본값: '/heptapod-b-encoder/audio/bed-loop.mp3']
 * @param {string} options.clipBasePath - 클립 믹스 디렉토리 [Optional, 기본값: '/heptapod-b-encoder/audio/clips']
 * @param {number} options.bedGain - 베드 루프 게인 0~1 [Optional, 기본값: 0.255]
 * @param {number} options.clipGain - 클립 사운드 게인 0~1 [Optional, 기본값: 0.85]
 * @param {number} options.pitchCents - 초기 피치(cents, 음수=낮춤) [Optional, 기본값: -200]
 * @returns {{ isEnabled: boolean, isLoading: boolean, enable: function, disable: function, handleProgress: function, setPitch: function, setDrone: function }}
 *
 * Example usage:
 * const engine = useScrubSoundEngine(timeline.clips);
 * useMotionValueEvent(progress, 'change', engine.handleProgress);
 */
function useScrubSoundEngine(
  clips,
  {
    bedSrc = '/heptapod-b-encoder/audio/bed-loop.mp3',
    clipBasePath = '/heptapod-b-encoder/audio/clips',
    bedGain = 0.255,
    clipGain = 0.85,
    pitchCents = DEFAULT_PITCH_CENTS,
  } = {}
) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const ctxRef = useRef(null);
  /** 현재 피치(cents). setPitch로 런타임 변경. 새 소스가 이 값을 읽어 detune에 건다. */
  const pitchRef = useRef(pitchCents);
  /** 합성 드론 노드 묶음 { osc1, osc2, filter, toneGain, sceneGain, ampLfo, ampDepth, sceneOn } */
  const droneRef = useRef(null);
  const droneFreqRef = useRef(DRONE_DEFAULT.freq);
  const droneLevelRef = useRef(DRONE_DEFAULT.level);
  const droneAmpRateRef = useRef(DRONE_DEFAULT.ampRate);
  const droneAmpDepthRef = useRef(DRONE_DEFAULT.ampDepth);
  const buffersRef = useRef(new Map());
  const bedRef = useRef(null); // { source, gain }
  const activeRef = useRef(null); // { index, source, gain, ctxStart, offset }
  const fadingRef = useRef([]); // 잦아드는 중인 소스들 (겹침 정리용)
  const enabledRef = useRef(false);
  const endedRef = useRef(false);
  const isMovingRef = useRef(false);
  const lastMoveAtRef = useRef(0);
  const progressRef = useRef(0);
  const clipsRef = useRef(clips);
  clipsRef.current = clips;

  /** 버퍼 로드 (fetch + decode, 실패한 항목은 무음으로 통과) */
  const loadBuffers = async (ctx) => {
    const jobs = [
      ['__bed__', bedSrc],
      ...clipsRef.current.map((clip) => [clip.id, `${clipBasePath}/${clip.id}.mp3`]),
    ].filter(([key]) => !buffersRef.current.has(key));

    await Promise.all(
      jobs.map(async ([key, url]) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const buf = await ctx.decodeAudioData(await res.arrayBuffer());
          buffersRef.current.set(key, buf);
        } catch {
          /* 네트워크/디코드 실패 클립은 무음으로 통과 */
        }
      })
    );
  };

  /**
   * 게인 램프다운 후 소스 정지 (공통).
   * 페이드가 긴 경우 소리가 남아 있는 동안 새 소스가 시작될 수 있으므로
   * 잔향 목록(fadingRef)에 등록해 두고, 필요 시 cutTails로 빠르게 정리한다.
   */
  const rampStop = (entry, seconds) => {
    const ctx = ctxRef.current;
    if (!ctx || !entry) return;
    const t = ctx.currentTime;
    entry.gain.gain.cancelScheduledValues(t);
    entry.gain.gain.setValueAtTime(entry.gain.gain.value, t);
    entry.gain.gain.linearRampToValueAtTime(0, t + seconds);
    try {
      entry.source.stop(t + seconds + 0.05);
    } catch {
      /* 이미 정지된 소스 */
    }
    fadingRef.current.push(entry);
    setTimeout(() => {
      fadingRef.current = fadingRef.current.filter((item) => item !== entry);
    }, seconds * 1000 + 120);
  };

  /** 아직 잦아드는 중인 잔향을 빠르게 정리 (새 소스와 겹쳐 쌓이는 것 방지) */
  const cutTails = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const list = fadingRef.current;
    fadingRef.current = [];
    list.forEach((entry) => {
      const t = ctx.currentTime;
      entry.gain.gain.cancelScheduledValues(t);
      entry.gain.gain.setValueAtTime(entry.gain.gain.value, t);
      entry.gain.gain.linearRampToValueAtTime(0, t + TAIL_CUT);
      try {
        entry.source.stop(t + TAIL_CUT + 0.05);
      } catch {
        /* 이미 정지된 소스 */
      }
    });
  };

  /** 베드 루프 시작 (gapless: 정상 구간 내 loopStart/End) */
  const startBed = (ctx) => {
    const buffer = buffersRef.current.get('__bed__');
    if (!buffer || bedRef.current) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    if (source.detune) source.detune.value = pitchRef.current; // 베드도 함께 낮춘다
    source.loop = true;
    source.loopStart = Math.min(1, buffer.duration / 4);
    source.loopEnd = Math.max(source.loopStart + 1, buffer.duration - 0.5);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(bedGain, ctx.currentTime + RAMP_IN * 2);
    source.connect(gain).connect(ctx.destination);
    source.start();
    bedRef.current = { source, gain };
  };

  const stopBed = (seconds = END_FADE) => {
    rampStop(bedRef.current, seconds);
    bedRef.current = null;
  };

  const stopActiveClip = (seconds = IDLE_FADE) => {
    rampStop(activeRef.current, seconds);
    activeRef.current = null;
  };

  /**
   * 합성 드론 구성(1회). osc(근본) + osc(미세 디튠) → lowpass → toneGain → sceneGain → destination.
   * ampLFO → ampDepth → toneGain.gain 로 트레몰로("우우웅")를 건다.
   * sceneGain은 0에서 시작 — setDroneScene으로만 켜진다(오실레이터는 계속 돌되 무음 대기).
   */
  const buildDrone = (ctx) => {
    if (droneRef.current) return droneRef.current;
    const freq = droneFreqRef.current;
    const level = droneLevelRef.current;

    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.value = freq;
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq;
    if (osc2.detune) osc2.detune.value = DRONE_BEAT_CENTS; // 느린 비팅

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = DRONE_CUTOFF_HZ;
    filter.Q.value = 0.5;

    const toneGain = ctx.createGain();
    toneGain.gain.value = level;
    const sceneGain = ctx.createGain();
    sceneGain.gain.value = 0; // 씬 진입 전에는 무음

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(toneGain).connect(sceneGain).connect(ctx.destination);

    // 진폭 LFO(트레몰로) — toneGain.gain 을 level 주위로 흔든다
    const ampLfo = ctx.createOscillator();
    ampLfo.type = 'sine';
    ampLfo.frequency.value = droneAmpRateRef.current;
    const ampDepth = ctx.createGain();
    ampDepth.gain.value = level * droneAmpDepthRef.current;
    ampLfo.connect(ampDepth).connect(toneGain.gain);

    osc1.start();
    osc2.start();
    ampLfo.start();
    droneRef.current = { osc1, osc2, filter, toneGain, sceneGain, ampLfo, ampDepth, sceneOn: false };
    return droneRef.current;
  };

  /** 드론 씬 게이트 — on이면 들리고 off면 잦아든다(오실레이터는 유지). 상태 동일하면 무시. */
  const setDroneScene = (on) => {
    const ctx = ctxRef.current;
    const d = droneRef.current;
    if (!ctx || !d || d.sceneOn === on) return;
    d.sceneOn = on;
    const t = ctx.currentTime;
    d.sceneGain.gain.cancelScheduledValues(t);
    d.sceneGain.gain.setValueAtTime(d.sceneGain.gain.value, t);
    d.sceneGain.gain.linearRampToValueAtTime(on ? 1 : 0, t + DRONE_FADE);
  };

  /** 드론 완전 정지 — 램프다운 후 오실레이터 정지 */
  const teardownDrone = (seconds = END_FADE) => {
    const ctx = ctxRef.current;
    const d = droneRef.current;
    droneRef.current = null;
    if (!ctx || !d) return;
    const t = ctx.currentTime;
    d.sceneGain.gain.cancelScheduledValues(t);
    d.sceneGain.gain.setValueAtTime(d.sceneGain.gain.value, t);
    d.sceneGain.gain.linearRampToValueAtTime(0, t + seconds);
    [d.osc1, d.osc2, d.ampLfo].forEach((o) => {
      try {
        o.stop(t + seconds + 0.05);
      } catch {
        /* 이미 정지 */
      }
    });
  };

  /** 클립 사운드를 지정 지점(초)부터 재생 — 위치 결속의 실행부 */
  const startClipAt = (index, positionSec) => {
    const ctx = ctxRef.current;
    const clip = clipsRef.current[index];
    const buffer = clip && buffersRef.current.get(clip.id);
    cutTails(); // 직전 잔향 정리 후
    stopActiveClip(SWAP_FADE); // 현재 클립은 짧은 크로스페이드로 넘긴다
    if (!ctx || !buffer) return;

    const offset = Math.min(Math.max(0, positionSec), Math.max(0, buffer.duration - 0.05));
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    if (source.detune) source.detune.value = pitchRef.current; // 클립도 동일하게 낮춘다
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(clipGain, ctx.currentTime + RAMP_IN);
    source.connect(gain).connect(ctx.destination);
    source.start(0, offset);

    const entry = { index, source, gain, ctxStart: ctx.currentTime, offset };
    source.onended = () => {
      if (activeRef.current === entry) activeRef.current = null;
    };
    activeRef.current = entry;
  };

  /** 진행도 -> 오디오 위치 정렬 (진입/재정렬/종료 판정) */
  const syncToProgress = (p) => {
    const ctx = ctxRef.current;
    if (!ctx || !enabledRef.current || ctx.state !== 'running') return;

    const list = clipsRef.current;
    if (!list.length) return;
    const lastEnd = list[list.length - 1].endNorm;

    // 영상 완주 -> 베드까지 전부 무음
    if (p >= lastEnd - END_EPSILON) {
      if (!endedRef.current) {
        endedRef.current = true;
        stopActiveClip(END_FADE);
        stopBed(END_FADE);
        setDroneScene(false);
      }
      return;
    }
    // 되돌아 스크롤 -> 베드 복귀
    if (endedRef.current) {
      endedRef.current = false;
      startBed(ctx);
    }

    // 드론 씬 게이트 — 오프닝 클립(SEQ_00→SEQ_01) 구간에서만 켠다.
    // 아이들 게이트보다 위에 둔다: 스크롤이 멈춰도 씬 안이면 드론은 지속된다(지속 = 샘플감).
    const openingEnd = list[0]?.endNorm ?? 0;
    setDroneScene(p < openingEnd);

    // 스크롤이 멈춘 상태에서는 클립 사운드를 켜지 않는다(아이들 게이트)
    if (!isMovingRef.current) return;

    const index = findClipIndex(list, p);
    if (index < 0) return;
    const clip = list[index];
    const buffer = buffersRef.current.get(clip.id);
    if (!buffer) return;

    const span = clip.endNorm - clip.startNorm || 1;
    const fraction = Math.min(1, Math.max(0, (p - clip.startNorm) / span));
    const targetTime = fraction * buffer.duration;

    const active = activeRef.current;
    if (!active || active.index !== index) {
      startClipAt(index, targetTime);
      return;
    }

    // 드리프트 보정: 실제 재생 위치가 화면 위치에서 허용치 이상 벌어지면 재정렬.
    // detune로 재생 속도가 rate배 느려졌으므로 경과 실시간에 그 비율을 곱해야
    // 버퍼상 실제 위치가 나온다(안 곱하면 느려진 만큼 계속 어긋난 것으로 오판해 재정렬 남발).
    const actualTime = active.offset + (ctx.currentTime - active.ctxStart) * centsToRate(pitchRef.current);
    if (Math.abs(actualTime - targetTime) > DRIFT_TOLERANCE) {
      startClipAt(index, targetTime);
    }
  };

  /** SOUND ON — AudioContext 생성/unlock + 버퍼 로드 + 베드 시작 */
  const enable = async () => {
    setIsLoading(true);
    try {
      if (!ctxRef.current) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        ctxRef.current = new Ctor();
      }
      const ctx = ctxRef.current;

      // iOS(16.4+): 물리 무음(벨소리) 스위치가 켜져 있으면 Web Audio가 통째로 음소거된다
      // — 컨텍스트는 running이고 신호도 흐르는데 스피커로만 안 나가는 상태(=모바일 무음의 전형).
      // 오디오 세션을 'playback'으로 지정하면 무음 스위치와 무관하게 미디어처럼 재생된다.
      // 미지원 브라우저(안드로이드·데스크톱)엔 navigator.audioSession이 없어 무시된다.
      try {
        if (navigator.audioSession) navigator.audioSession.type = 'playback';
      } catch {
        /* audioSession 미지원 — 무시 */
      }

      await ctx.resume();

      // 브라우저 autoplay 정책: wheel/scroll은 유효한 사용자 활성 제스처가 아니라 resume이
      // 실제로 언락되지 않는다(ctx가 suspended로 남는다). 이때 켜짐으로 커밋해 버리면
      // 이후 클릭이 "이미 켜짐" 가드에 막혀 영영 무음이 된다. 그래서 **실제 running일 때만**
      // 커밋하고, 아니면 상태를 바꾸지 않고 다음(유효) 제스처를 기다린다.
      if (ctx.state !== 'running') {
        return;
      }

      await loadBuffers(ctx);
      enabledRef.current = true;
      endedRef.current = false;
      setIsEnabled(true);

      const list = clipsRef.current;
      const lastEnd = list.length ? list[list.length - 1].endNorm : 1;
      // 이미 영상이 끝난 지점이면 아무 소리도 내지 않는다
      if (progressRef.current < lastEnd - END_EPSILON) {
        startBed(ctx);
        buildDrone(ctx);
        // 오프닝 씬 안에서 켜면 즉시 드론이 지속된다
        setDroneScene(progressRef.current < (list[0]?.endNorm ?? 0));
        syncToProgress(progressRef.current);
      } else {
        endedRef.current = true;
      }
    } finally {
      setIsLoading(false);
    }
  };

  /** SOUND OFF — 전체 램프다운 후 suspend */
  const disable = () => {
    enabledRef.current = false;
    endedRef.current = false;
    isMovingRef.current = false;
    setIsEnabled(false);
    const ctx = ctxRef.current;
    if (!ctx) return;
    stopActiveClip(END_FADE);
    stopBed(END_FADE);
    teardownDrone(END_FADE);
    setTimeout(() => {
      ctx.suspend();
    }, END_FADE * 1000 + 120);
  };

  /** 진행도 변경 수신 — 움직임 기록 후 오디오 위치 정렬 */
  const handleProgress = (p) => {
    progressRef.current = p;
    lastMoveAtRef.current = now();
    isMovingRef.current = true;
    syncToProgress(p);
  };

  /**
   * 런타임 피치 변경(cents). 새 소스는 pitchRef를 읽어 반영하고,
   * 지금 울리는 베드·클립에는 즉시 detune를 걸어 실시간으로 들려준다(디버그 A/B용).
   */
  const setPitch = (cents) => {
    pitchRef.current = cents;
    const ctx = ctxRef.current;
    if (!ctx) return;
    [bedRef.current, activeRef.current].forEach((entry) => {
      if (entry?.source?.detune) entry.source.detune.setValueAtTime(cents, ctx.currentTime);
    });
  };

  /**
   * 런타임 드론 파라미터 변경. partial에 담긴 값만 갱신하고 지금 울리는 드론에 즉시 반영한다.
   * @param {{ freq?: number, level?: number, ampRate?: number, ampDepth?: number }} partial
   */
  const setDrone = (partial) => {
    if ('freq' in partial) droneFreqRef.current = partial.freq;
    if ('level' in partial) droneLevelRef.current = partial.level;
    if ('ampRate' in partial) droneAmpRateRef.current = partial.ampRate;
    if ('ampDepth' in partial) droneAmpDepthRef.current = partial.ampDepth;

    const ctx = ctxRef.current;
    const d = droneRef.current;
    if (!ctx || !d) return;
    const t = ctx.currentTime;
    if ('freq' in partial) {
      d.osc1.frequency.setValueAtTime(droneFreqRef.current, t);
      d.osc2.frequency.setValueAtTime(droneFreqRef.current, t);
    }
    if ('ampRate' in partial) d.ampLfo.frequency.setValueAtTime(droneAmpRateRef.current, t);
    // level·ampDepth는 서로 얽혀 있다: 트레몰로 깊이 = level × ampDepth
    if ('level' in partial || 'ampDepth' in partial) {
      d.toneGain.gain.setValueAtTime(droneLevelRef.current, t);
      d.ampDepth.gain.setValueAtTime(droneLevelRef.current * droneAmpDepthRef.current, t);
    }
  };

  /**
   * 아이들 감시 — 화면이 멈추면 클립 사운드도 멈춘다(드리프트 차단).
   * stopActiveClip은 ref만 만지는 안정 동작이라 의존성에서 제외한다
   * (포함하면 매 렌더마다 인터벌이 재생성되어 감시가 끊긴다).
   */
  useEffect(() => {
    if (!isEnabled) return undefined;
    const id = setInterval(() => {
      if (isMovingRef.current && now() - lastMoveAtRef.current > IDLE_MS) {
        isMovingRef.current = false;
        stopActiveClip();
      }
    }, IDLE_TICK_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled]);

  /** 언마운트 클린업 */
  useEffect(() => {
    return () => {
      if (ctxRef.current) {
        try {
          ctxRef.current.close();
        } catch {
          /* already closed */
        }
        ctxRef.current = null;
      }
    };
  }, []);

  return { isEnabled, isLoading, enable, disable, handleProgress, setPitch, setDrone };
}

export default useScrubSoundEngine;
