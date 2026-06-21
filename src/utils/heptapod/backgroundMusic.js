/**
 * Heptapod B 배경음악 — YouTube IFrame Player API (API key 불필요)
 *
 * 영화 Arrival OST 'Heptapod B' (Jóhann Jóhannsson)를 화면 밖 숨긴 iframe으로
 * 루프 재생한다. YouTube IFrame API는 `iframe_api` 스크립트만 로드하면 되고
 * API key·OAuth가 필요 없다. 익명 방문자에게도 풀트랙이 재생된다.
 *
 * 자동재생 정책: 브라우저는 사용자 제스처 없는 음성 자동재생을 막는다.
 * 따라서 play()는 반드시 클릭/키입력 같은 제스처 핸들러 안에서 호출한다
 * (이 프로젝트에선 ENCODE 확정 시점). [[ambientAudio]]와 동일한 제약.
 *
 * 음원 교체: VIDEO_ID 한 줄만 바꾸면 다른 트랙으로 교체된다.
 */

/** YouTube IFrame API 스크립트 주소 (key 불필요) */
const YT_SCRIPT_SRC = 'https://www.youtube.com/iframe_api';

/** Jóhann Jóhannsson — Heptapod B (Arrival OST, UMG/Paramount 제공) */
const VIDEO_ID = 'KzaqrQuwr1k';

/** IFrame API 로드 1회 공유 — 여러 컨트롤러가 같은 Promise를 재사용 */
let apiPromise = null;

/**
 * YouTube IFrame API를 1회 로드한다 (이미 로드됐으면 즉시 resolve).
 *
 * @returns {Promise<object>} window.YT (Player 생성자 포함)
 */
function loadYouTubeApi() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('no-window'));
  }
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }
  if (apiPromise) {
    return apiPromise;
  }
  apiPromise = new Promise((resolve) => {
    // 다른 코드가 이미 콜백을 걸어뒀을 수 있으니 체이닝
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') {
        prev();
      }
      resolve(window.YT);
    };
    if (!document.querySelector(`script[src="${YT_SCRIPT_SRC}"]`)) {
      const tag = document.createElement('script');
      tag.src = YT_SCRIPT_SRC;
      document.head.appendChild(tag);
    }
  });
  return apiPromise;
}

/**
 * 배경음악 컨트롤러를 만든다.
 *
 * @param {object} opts - 옵션 [Optional]
 * @param {string} opts.videoId - YouTube 영상 ID [Optional, 기본값: Heptapod B]
 * @param {number} opts.volume - 0~100 음량 [Optional, 기본값: 32]
 * @returns {{
 *   play: function(): void,
 *   pause: function(): void,
 *   toggle: function(): boolean,
 *   isPlaying: function(): boolean,
 *   setVolume: function(number): void,
 *   dispose: function(): void
 * }} 컨트롤러
 *
 * Example usage:
 * const music = createBackgroundMusic();
 * music.play();      // 제스처 핸들러 안에서 호출 (자동재생 정책)
 * music.toggle();    // 재생 ↔ 일시정지, 현재 상태(boolean) 반환
 * music.dispose();
 */
export function createBackgroundMusic(opts = {}) {
  const videoId = opts.videoId || VIDEO_ID;
  const volume = opts.volume ?? 32;
  let player = null;
  let container = null;
  let ready = false;
  let wantPlaying = false; // 사용자가 의도한 재생 상태 (ready 전 클릭 보존)

  /** 화면 밖 숨긴 컨테이너 + 플레이어 1회 구성 */
  function ensure() {
    if (player || container || typeof document === 'undefined') {
      return;
    }
    container = document.createElement('div');
    container.setAttribute('aria-hidden', 'true');
    Object.assign(container.style, {
      position: 'fixed',
      left: '-9999px',
      bottom: '0',
      width: '1px',
      height: '1px',
      pointerEvents: 'none',
    });
    document.body.appendChild(container);

    loadYouTubeApi()
      .then((YT) => {
        if (!container) {
          return; // 로드 전에 dispose됨
        }
        player = new YT.Player(container, {
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            loop: 1,
            playlist: videoId, // loop는 playlist 지정이 있어야 동작
            playsinline: 1,
            modestbranding: 1,
          },
          events: {
            onReady: () => {
              ready = true;
              try {
                player.setVolume(volume);
                if (wantPlaying) {
                  player.playVideo();
                }
              } catch {
                // 플레이어 미준비 — 무시
              }
            },
          },
        });
      })
      .catch(() => {
        // API 로드 실패 (네트워크/차단) — 무음으로 우아하게 강등
      });
  }

  function play() {
    wantPlaying = true;
    ensure();
    if (ready && player) {
      try {
        player.playVideo();
      } catch {
        // 무시
      }
    }
  }

  function pause() {
    wantPlaying = false;
    if (ready && player) {
      try {
        player.pauseVideo();
      } catch {
        // 무시
      }
    }
  }

  /** 재생 ↔ 일시정지 토글 — 토글 후 재생 상태 반환 */
  function toggle() {
    if (wantPlaying) {
      pause();
    } else {
      play();
    }
    return wantPlaying;
  }

  function isPlaying() {
    return wantPlaying;
  }

  function setVolume(v) {
    if (ready && player) {
      try {
        player.setVolume(Math.max(0, Math.min(100, v)));
      } catch {
        // 무시
      }
    }
  }

  function dispose() {
    wantPlaying = false;
    try {
      if (player) {
        player.destroy();
      }
    } catch {
      // 이미 파괴됨 — 무시
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    player = null;
    container = null;
    ready = false;
  }

  return {
    play, pause, toggle, isPlaying, setVolume, dispose,
  };
}

export default createBackgroundMusic;
