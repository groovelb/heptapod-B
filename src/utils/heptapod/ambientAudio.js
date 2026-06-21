/**
 * Heptapod B Encoder — 시네마틱 전환 휘몰이 사운드 (Web Audio API)
 *
 * 외부 음원 없이 합성한다 (영화 사운드는 저작권 — 무드만 재현).
 * 목표: 필름메이킹 튜토리얼의 화면전환 사운드 — 공기가 휙 몰려오는 airy
 * whoosh + 도착점의 묵직한 저음 boom + 시네마틱 reverb 꼬리. 한 stroke =
 * 한 번의 짧은 전환음(~1.4s + 꼬리), 끝나면 무음.
 *
 * 인위적으로 들리지 않게 하는 3요소:
 *   1) whoosh: 밴드패스가 빠르게 솟았다 지나가는 공기 흐름 (도플러식 접근)
 *   2) boom: 도착 순간 sub 사인의 피치 드롭 임팩트 (무게)
 *   3) reverb: convolver 임펄스로 공간 꼬리 — dry하지 않게
 *
 * 자동재생 정책: AudioContext는 사용자 제스처(ENCODE)에서 resume된다.
 * 결정론과 무관(시각 아님) — 노이즈/임펄스는 Math.random 사용 가능.
 */

/** brown-ish 노이즈 버퍼 (저주파 강조) */
function makeNoiseBuffer(ctx, seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i += 1) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.04 * white) / 1.04;
    data[i] = last * 2.6 + white * 0.06; // brown body 위주 (hiss 최소 — 부드러운 바람)
  }
  return buf;
}

/** reverb 임펄스 — 노이즈 × 지수 감쇠 (시네마틱 공간 꼬리) */
function makeImpulse(ctx, seconds, decay) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch += 1) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i += 1) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

/**
 * 시네마틱 전환 사운드 컨트롤러를 만든다.
 *
 * @returns {{
 *   encodeStart: function(): void,
 *   formationComplete: function(): void,
 *   setEnabled: function(boolean): void,
 *   dispose: function(): void
 * }} 컨트롤러
 *
 * Example usage:
 * const audio = createAmbientAudio();
 * audio.encodeStart();     // whoosh + boom + reverb 꼬리 (끝나면 무음)
 * audio.setEnabled(false);
 * audio.dispose();
 */
export function createAmbientAudio() {
  let ctx = null;
  let master = null;
  let reverb = null;
  let reverbGain = null;
  let noise = null;
  let voices = [];
  let enabled = true;
  const PEAK = 0.26;

  /** AudioContext + 마스터 + reverb 버스 1회 구성 (제스처 시점) */
  function ensure() {
    if (ctx || typeof window === 'undefined') {
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      return;
    }
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = enabled ? 1 : 0;
    master.connect(ctx.destination);

    // 시네마틱 꼬리 — convolver reverb (wet 버스)
    reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx, 2.2, 3.2);
    reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.55;
    reverb.connect(reverbGain);
    reverbGain.connect(master);

    noise = makeNoiseBuffer(ctx, 3);
  }

  /** voice를 dry(master) + wet(reverb) 양쪽에 보낸다 */
  function send(node) {
    node.connect(master);
    node.connect(reverb);
  }

  /** 재생 중인 보이스 정지·해제 (겹침 방지) */
  function stopVoices() {
    voices.forEach((n) => {
      try {
        if (typeof n.stop === 'function') {
          n.stop();
        }
        n.disconnect();
      } catch {
        // 이미 정지 — 무시
      }
    });
    voices = [];
  }

  function encodeStart() {
    if (!enabled) {
      return;
    }
    ensure();
    if (!ctx) {
      return;
    }
    ctx.resume();
    stopVoices();
    const t = ctx.currentTime;
    const HIT = 0.3; // 도착(임팩트) 시각 — 짧게: 빠르게 몰려와 바로 터진다

    // ── 1) WHOOSH — 낮고 묵직한 바람이 부드럽게 몰려온다 (날카롭지 않게) ──
    const air = ctx.createBufferSource();
    air.buffer = noise;
    air.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.55; // 낮은 Q — 휘파람/공명 없음
    bp.frequency.setValueAtTime(140, t);
    bp.frequency.exponentialRampToValueAtTime(820, t + HIT); // 접근 (낮게)
    bp.frequency.exponentialRampToValueAtTime(340, t + HIT + 0.5); // 통과
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1300; // 고역 차단 — 날카로움 제거
    const ag = ctx.createGain();
    ag.gain.setValueAtTime(0, t);
    ag.gain.linearRampToValueAtTime(PEAK * 0.5, t + HIT * 0.85); // 빠른 빌드업 (안 처지게)
    ag.gain.exponentialRampToValueAtTime(0.0001, t + HIT + 0.35); // 짧은 컷
    air.connect(bp);
    bp.connect(lp);
    lp.connect(ag);
    send(ag);
    air.start(t);
    air.stop(t + HIT + 0.4);

    // ── 2) BOOM — 도착 순간 묵직한 sub 임팩트 (피치 드롭) ──
    const boom = ctx.createOscillator();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(95, t + HIT);
    boom.frequency.exponentialRampToValueAtTime(32, t + HIT + 0.7);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0, t + HIT);
    bg.gain.linearRampToValueAtTime(PEAK * 1.1, t + HIT + 0.04); // 펀치
    bg.gain.exponentialRampToValueAtTime(0.0001, t + HIT + 1.5); // 무게 있는 감쇠
    boom.connect(bg);
    send(bg);
    boom.start(t + HIT);
    boom.stop(t + HIT + 1.6);

    // ── 3) 임팩트 트랜지언트 — 히트 지점의 짧은 "탁" (저역 노이즈 버스트) ──
    const tick = ctx.createBufferSource();
    tick.buffer = noise;
    const tlp = ctx.createBiquadFilter();
    tlp.type = 'lowpass';
    tlp.frequency.value = 600;
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0, t + HIT);
    tg.gain.linearRampToValueAtTime(PEAK * 0.8, t + HIT + 0.01);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + HIT + 0.25);
    tick.connect(tlp);
    tlp.connect(tg);
    send(tg);
    tick.start(t + HIT);
    tick.stop(t + HIT + 0.3);

    voices = [air, boom, tick];
  }

  /** 형성 완료 — 별도 지속음 없음 (전환음은 reverb 꼬리로 자연 종료) */
  function formationComplete() {
    // 의도적으로 무음
  }

  /**
   * 단발 프로세싱 톤 — IT 서비스 분석 중에 나는 잔잔하고 둥근 소리.
   * 날카로운 비프가 아니라 부드러운 사인 + 완만한 어택/릴리스 + 약한 잔향.
   *
   * @param {number} at - 재생 시각 (ctx.currentTime 기준, s)
   * @param {number} freq - 주파수 (Hz)
   * @param {number} gain - 피크 게인
   */
  /** 공간감 있는 단일 톤 — 둥근 사인 + 완만한 어택/긴 릴리스 + reverb (잔잔) */
  function tick(at) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(660, at); // 낮고 둥근 고정 음정
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(PEAK * 0.11, at + 0.03); // 완만한 어택
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.5); // 긴 릴리스 (여운)
    o.connect(lp);
    lp.connect(g);
    g.connect(master);
    g.connect(reverb); // 공간 잔향
    o.start(at);
    o.stop(at + 0.55);
  }

  /**
   * 초록선(edge) 그려지는 타이밍에 잔잔한 톤을 매핑한다. 선이 빠르게 그려져도
   * 톤은 느긋한 간격(throttle)으로 솎아 공간감 있게 — 여운이 서로 겹쳐 흐른다.
   *
   * @param {number} count - edge 개수 [Required]
   * @param {object} opts - { interval(ms), startDelay(ms) } edge 타이밍 [Optional]
   */
  function scanBeeps(count, opts = {}) {
    if (!enabled) {
      return;
    }
    ensure();
    if (!ctx) {
      return;
    }
    ctx.resume();
    const interval = (opts.interval ?? 4) / 1000;
    const base = ctx.currentTime + (opts.startDelay ?? 0) / 1000;
    const minGap = 0.16; // 160ms — 느긋한 간격, 여운 겹침
    let last = -1;
    for (let i = 0; i < count; i += 1) {
      const at = base + i * interval; // edge i가 그려지는 시각
      if (last < 0 || at - last >= minGap) {
        tick(at);
        last = at;
      }
    }
  }

  function setEnabled(on) {
    enabled = on;
    if (on) {
      ensure();
      if (ctx) {
        ctx.resume();
        master.gain.value = 1;
      }
    } else if (ctx) {
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, t + 0.2);
      stopVoices();
    }
  }

  function dispose() {
    if (!ctx) {
      return;
    }
    try {
      stopVoices();
      ctx.close();
    } catch {
      // 이미 닫힘 — 무시
    }
    ctx = null;
  }

  return {
    encodeStart, formationComplete, scanBeeps, setEnabled, dispose,
  };
}

export default createAmbientAudio;
