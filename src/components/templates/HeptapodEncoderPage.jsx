import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { APP_PATHS } from '../../routes/paths';
import { useTheme, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import useMediaQuery from '@mui/material/useMediaQuery';
import AppGNB from '../navigation/AppGNB';
import { useI18n } from '../../i18n/useI18n.js';

import LogogramChamber from '../motion/LogogramChamber';
import LogogramRendererCanvas from '../motion/LogogramRendererCanvas';
import FadeTransition from '../motion/FadeTransition';
import AnalysisOverlay from '../overlay-feedback/AnalysisOverlay';
import GlyphObservationOverlay from '../overlay-feedback/GlyphObservationOverlay';
import GlyphMeaningSummary from '../data-display/GlyphMeaningSummary';
import GlyphClusterLink from '../data-display/GlyphClusterLink';
import { interpretGlyphMeaning } from '../../utils/heptapod/interpretGlyphMeaning';
import PublishDialog from '../overlay-feedback/PublishDialog';
import { usePublish } from '../../hooks/data/usePublish';
import { buildArchiveModel } from '../../utils/heptapod/archiveGlyph';
import { validateName } from '../../utils/heptapod/validateName';
import { shareArchive } from '../../utils/heptapod/shareArchive';
import { buildModelReversible } from '../../utils/heptapod/reversibleModel';
import { detectRenderTier, subscribeReducedMotion } from '../../utils/heptapod/detectRenderTier';
import { createAmbientAudio } from '../../utils/heptapod/ambientAudio';
import { createBackgroundMusic } from '../../utils/heptapod/backgroundMusic';

/**
 * tier → 렌더러 매핑 — v2 클러스터 모델은 Canvas 렌더러가 전담한다.
 */
const RENDERER_BY_TIER = {
  webgl: LogogramRendererCanvas,
  canvas: LogogramRendererCanvas,
  svg: LogogramRendererCanvas,
};

/** 뷰포트 짧은 변 대비 로고그램 크기 비율 — 영화처럼 화면을 압도하는 스케일 */
const FULLSCREEN_FILL = 0.62;

/** 배경음악 기본 재생 여부 — VITE_MUSIC_AUTOPLAY (기본 true, 'false'일 때만 끔) */
const MUSIC_AUTOPLAY = import.meta.env.VITE_MUSIC_AUTOPLAY !== 'false';


/** 모노스페이스 토큰 폴백 — theme.typography.custom?.mono 미정의 환경 대비 */
const MONO_FALLBACK = {
  fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
  fontSize: '0.75rem',
  lineHeight: 1.5,
  letterSpacing: '0.05em',
};

/**
 * URL 쿼리(?name=)에서 이름을 읽는다 — 공유 URL 진입 시 결정론 재현(시나리오 4).
 *
 * @returns {string} 디코딩된 이름 (없으면 빈 문자열)
 */
function readNameFromUrl() {
  if (typeof window === 'undefined') {
    return '';
  }
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('name');
  return fromUrl ? fromUrl.trim() : '';
}

function readEncoderVersionFromUrl() {
  if (typeof window === 'undefined') return 2;
  const params = new URLSearchParams(window.location.search);
  return params.has('name') && params.get('v') !== '2' ? 1 : 2;
}

function safeArchiveModel(text) {
  try { return buildArchiveModel(text); } catch { return null; }
}

/** rad → deg 정규화 (0~359 정수) — 리드아웃 표기용 */
function toDeg(rad) {
  const d = ((rad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return Math.round((d * 180) / Math.PI) % 360;
}

/**
 * 텍스트를 한 단계 하위 단위로 분할 (재귀 드릴용).
 * 줄바꿈 → 문장(줄), 문장종결부호 → 문장, 공백 → 단어, 그 외 → 글자(grapheme).
 * 더 못 쪼개면 [] (리프).
 *
 * @param {string} text - 분할할 텍스트
 * @returns {string[]} 하위 단위 배열
 */
function splitText(text) {
  const t = (text || '').replace(/[?？]/g, '').trim();
  if (!t) return [];
  if (/\n/.test(t)) return t.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const sentences = t.split(/(?<=[.!?。！？])\s+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length > 1) return sentences;
  if (/\s/.test(t)) return t.split(/\s+/).filter(Boolean);
  const graphemes = Array.from(t).filter((ch) => !/\s/.test(ch));
  if (graphemes.length > 1) return graphemes;
  return [];
}

/**
 * 타이핑 라이브 프리뷰 — 방금 입력한 문자 1개의 로고그램. 입력창 바로 위
 * 작은 UI 장치로 표시. 키 입력마다 새 글자로 교체되며 다시 형성된다.
 *
 * @param {object} props - { text, size, ink, monoSx }
 * @returns {JSX.Element|null} 단일 프리뷰 칩
 */
function TypingPreview({ text, size, ink, monoSx }) {
  const { localize } = useI18n();
  const chars = Array.from(text.replace(/[?？]/g, '')).filter((ch) => !/\s/.test(ch));
  const last = chars[chars.length - 1];
  const previewModel = useMemo(() => (last ? safeArchiveModel(last) : null), [last]);
  if (!previewModel) return null;
  return (
    <Box sx={ { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 } }>
      <Box
        component="span"
        sx={ {
          ...monoSx, color: ink, opacity: 0.4, fontSize: '0.5rem', letterSpacing: '0.24em', textTransform: 'uppercase',
        } }
      >
        { localize('Preview') }
      </Box>
      <Box sx={ { width: size, height: size } }>
        <LogogramRendererCanvas
          key={ `${last}-${chars.length}` } // 키 입력마다 remount → 재형성
          model={ previewModel }
          size={ size }
          inkColor={ alpha(ink, 0.8) }
          isActive
          timeScale={ 4 } // 레이턴시 없이 즉각 반응 (형성 빠르게 감김)
        />
      </Box>
    </Box>
  );
}

/**
 * 자식 로고그램 격자 — 현재 노드를 하위 단위로 분해해 보여준다 (N레벨 줌).
 * 분할 가능한 셀은 클릭 시 더 깊이 드릴(onSelect), hover 시 글리프 중앙에 원본 표시.
 *
 * @param {object} props - { nodes, stageMin, ink, fg, monoSx, onSelect }
 * @returns {JSX.Element} 격자
 */
function ChildGrid({
  nodes, stageMin, ink, fg, onSelect,
}) {
  const n = nodes.length;
  // 행·열 모두 고려해 정사각 영역(stageMin)에 항상 맞춤 → 스크롤 없음, 일정 비율
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const avail = stageMin * 0.86;
  const cell = Math.floor(avail / Math.max(cols, rows));
  const glyph = Math.round(cell * 0.86);
  /** 텍스트 길이에 따른 오버레이 폰트 — 작게 */
  const charFs = (text) => {
    if (text.length <= 1) return glyph * 0.22;
    if (text.length <= 3) return glyph * 0.13;
    if (text.length <= 8) return glyph * 0.085;
    return glyph * 0.06;
  };
  return (
    <Box
      sx={ {
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
        justifyContent: 'center',
        alignContent: 'center',
        gap: 0.5,
      } }
    >
      { nodes.map((node) => (
        <Box
          key={ node.key }
          onClick={ node.splittable ? () => onSelect?.(node) : undefined }
          sx={ {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: node.splittable ? 'pointer' : 'default',
            '&:hover .hb-childchar': { opacity: 0.92 },
          } }
        >
          <Box sx={ { position: 'relative', width: glyph, height: glyph } }>
            <LogogramRendererCanvas model={ node.model } size={ glyph } inkColor={ ink } isActive />
            <Box
              className="hb-childchar"
              sx={ {
                // 원의 중앙 1/2 영역으로 제한 — 텍스트가 원 절반을 넘지 않게
                position: 'absolute',
                top: '25%',
                left: '25%',
                width: '50%',
                height: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                pointerEvents: 'none',
                overflow: 'hidden',
                opacity: 0,
                transition: 'opacity 0.2s ease',
                // 입력창과 동일 — 영화 타이틀 톤 (Outfit+Pretendard Light, 넓은 자간)
                fontFamily: '"Outfit", "Pretendard Variable", Pretendard, sans-serif',
                fontWeight: 300,
                letterSpacing: '0.12em',
                color: fg,
                fontSize: charFs(node.text),
                lineHeight: 1.1,
                wordBreak: 'break-word',
                textShadow: `0 0 ${glyph * 0.06}px ${alpha(ink, 0.7)}`,
              } }
            >
              { node.text }
            </Box>
          </Box>
        </Box>
      )) }
    </Box>
  );
}

/**
 * HeptapodEncoderPage 컴포넌트
 *
 * Heptapod B Encoder 메인 페이지 — 영화의 챔버 "안에" 들어와 있는 구도.
 * 화면 전체가 하얀 안개 공간이고, 가장자리는 어두운 비네트 오버레이로
 * 가라앉는다 (관찰자의 어두운 공간이 프레임 밖에 있다는 암시).
 *
 * 레이어 구조 (아래 → 위):
 * 0. LogogramChamber isFullscreen — 화면 전체 안개 공간 + 중앙 로고그램
 * 1. 비네트 오버레이 — 가장자리 어둠 (pointer-events 없음)
 * 2. 플로팅 컨트롤 — 타이틀(좌상) / 데이터 리드아웃(우상) /
 *    대형 underline 입력(중앙 하단), 분석·공개·공유 액션(우상단)
 *
 * 동작 흐름은 이전과 동일: URL 재현 → ENCODE 확정 시 모델 재생성 →
 * 형성 중 ANALYSIS 비활성 → 의미와 실제 부위 읽기 → 동의 후 공개·공유.
 *
 * Props: audioActive, client(선택적 공개 transport), initialName, initialEncoderVersion(라우트의 재현 버전), session(라우트가 보관하는 메모리 상태).
 *
 * Example usage:
 * <HeptapodEncoderPage />
 */
/**
 * Heptapod B Encoder 메인 페이지.
 *
 * @param {boolean} audioActive - OST(배경음악) 재생 허용 여부. 인트로가 인코더 children으로
 *   감쌀 때, 인트로 동안(영상 음성 재생) false, 인코더 활성 시 true로 넘겨 사운드를 분리한다.
 *   [Optional, 기본값: true — 단독 사용 시 기존처럼 default-on]
 */
function HeptapodEncoderPage({ audioActive = true, client, initialName, initialEncoderVersion, session }) {
  const { locale, localize, t } = useI18n();
  const theme = useTheme();
  const isMobileAnalysis = useMediaQuery(theme.breakpoints.down('md'));
  const readingDialogId = useId();
  const { publish } = usePublish({ client });
  const monoSx = theme.typography.custom?.mono || MONO_FALLBACK;

  // name(입력 중) / encodedName(확정) 분리 — ENCODE 실행 시에만 모델 재생성
  const [name, setName] = useState(() => session?.snapshot?.name ?? initialName ?? readNameFromUrl());
  const [encodedName, setEncodedName] = useState(() => session?.snapshot?.encodedName ?? initialName ?? readNameFromUrl());
  const [encoderVersion, setEncoderVersion] = useState(() => session?.snapshot?.encoderVersion ?? (initialEncoderVersion === 1 || initialEncoderVersion === 2
    ? initialEncoderVersion : initialName !== undefined ? 2 : readEncoderVersionFromUrl()));
  const [inputError, setInputError] = useState(() => session?.snapshot?.inputError ?? '');
  const [published, setPublished] = useState(() => session?.snapshot?.published ?? null);
  const [publishIntent, setPublishIntent] = useState(null);
  const [shareStatus, setShareStatus] = useState('');
  const [shareError, setShareError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [isAnalysisOn, setIsAnalysisOn] = useState(() => session?.snapshot?.isAnalysisOn ?? false);
  const [formedModel, setFormedModel] = useState(null);
  const [renderConfig, setRenderConfig] = useState(() => detectRenderTier());
  const [stageMin, setStageMin] = useState(0);

  const stageRef = useRef(null);
  const inputRef = useRef(null);
  const sharePending = useRef(false);
  const composingRef = useRef(false);
  const audioRef = useRef(null);
  const musicRef = useRef(null);
  const [isMusicOn, setIsMusicOn] = useState(() => session?.snapshot?.isMusicOn ?? MUSIC_AUTOPLAY); // 기본 재생 여부는 env로
  // 배경 안개 Z-dive 트리거 — 값이 바뀔 때마다 챔버가 "안개 속으로 파고드는"
  // 가속 진입 애니메이션을 1회 재생한다 (글리프 아님 — 배경 전용).
  const [diveKey, setDiveKey] = useState(0);

  /** Legacy links preserve their old model; new encodes use the canonical v2 contract. */
  const model = useMemo(
    () => (encodedName.trim() ? (encoderVersion === 1 ? buildModelReversible(encodedName) : safeArchiveModel(encodedName)) : null),
    [encodedName, encoderVersion],
  );

  const interpretation = useMemo(() => interpretGlyphMeaning(model), [model]);
  const [selectedMeaningId, setSelectedMeaningId] = useState(() => session?.snapshot?.selectedMeaningId ?? null);
  const selectedObservation = interpretation.observations.find((item) => item.id === selectedMeaningId);
  const selectedAnchors = selectedObservation?.anchors || [];
  const handleToggleAnalysis = () => {
    setStack([]);
    setIsAnalysisOn((value) => !value);
  };
  const handleCloseAnalysis = () => setIsAnalysisOn(false);

  // 깊이 내비게이션 (N레벨: 문단↔문장↔단어↔글자). stack = 드릴 경로(확장된 노드 텍스트).
  // [] = 루트 단일 뷰, [..] = 마지막 노드의 자식 격자.
  const [stack, setStack] = useState(() => session?.snapshot?.stack ?? []);
  useEffect(() => {
    if (session) session.snapshot = { name, encodedName, encoderVersion, inputError, published, isAnalysisOn, selectedMeaningId, stack, isMusicOn };
  }, [session, name, encodedName, encoderVersion, inputError, published, isAnalysisOn, selectedMeaningId, stack, isMusicOn]);

  const rootCore = encodedName.replace(/[?？]/g, '').trim();
  const currentText = stack.length ? stack[stack.length - 1] : rootCore;
  /** 현재 노드의 자식 로고그램들 (한 단계 하위 단위) */
  const childNodes = useMemo(
    () => (stack.length === 0 ? [] : splitText(currentText).map((txt, i) => ({
      key: `${txt}-${i}`,
      text: txt,
      model: safeArchiveModel(txt),
      splittable: splitText(txt).length > 0,
    })).filter((node) => node.model)),
    [currentText, stack.length],
  );
  const canSplitRoot = splitText(rootCore).length > 0;
  const atRoot = stack.length === 0;
  // 타이핑 중 — 입력이 확정 인코딩과 다를 때 (라이브 프리뷰 표시)
  const hasDraft = name.trim() !== encodedName;
  const isTyping = atRoot && name.trim().length > 0 && hasDraft;

  const reducedMotion = !!renderConfig.reducedMotion;
  const TierRenderer = RENDERER_BY_TIER[renderConfig.tier] || LogogramRendererCanvas;
  const rendererSize = Math.max(200, Math.round(stageMin * (isMobileAnalysis ? 0.9 : FULLSCREEN_FILL)));
  const mobileGlyphSize = Math.min(320, Math.max(200, stageMin - 48));

  // 형성 중 여부 — 렌더 시점 파생값 (모델 교체 즉시 반영)
  const isForming = !!model && !reducedMotion && formedModel !== model;
  // 분석 활성 — 루트 단일 뷰에서 형성 완료 후 ANALYSIS ON일 때만
  const analysisActive = !!model && isAnalysisOn && !isForming && atRoot;

  /** prefers-reduced-motion 변경 구독 — 즉시 1회 + 변경마다 반영 */
  useEffect(() => subscribeReducedMotion((isReduced) => {
    setRenderConfig((prev) => (
      prev.reducedMotion === isReduced ? prev : { ...prev, reducedMotion: isReduced }
    ));
  }), []);

  /** 무대 실측 — 풀스크린이므로 뷰포트 짧은 변을 관찰 */
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect?.width && rect?.height) {
        setStageMin(Math.round(Math.min(rect.width, rect.height)));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Mobile uses document flow: do not subtract the keyboard twice or move the PC HUD.
  useEffect(() => {
    if (!isMobileAnalysis) return undefined;
    const viewport = window.visualViewport;
    const page = stageRef.current?.closest('[data-encoder-result]');
    if (!viewport || !page) return undefined;
    let frame;
    const resize = () => {
      const obscured = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      const keyboardOpen = obscured > 80 && document.activeElement === inputRef.current;
      page.dataset.encoderKeyboard = keyboardOpen ? 'open' : 'closed';
      const inputRect = inputRef.current?.getBoundingClientRect();
      const covered = inputRect && (inputRect.bottom > viewport.offsetTop + viewport.height - 16 || inputRect.top < viewport.offsetTop + 64);
      if (keyboardOpen && covered && viewport.scale === 1) {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          if (document.activeElement === inputRef.current) inputRef.current?.scrollIntoView?.({ block: 'center', behavior: 'instant' });
        });
      }
    };
    resize();
    viewport.addEventListener('resize', resize);
    viewport.addEventListener('scroll', resize);
    return () => {
      viewport.removeEventListener('resize', resize);
      viewport.removeEventListener('scroll', resize);
      cancelAnimationFrame(frame);
      delete page.dataset.encoderKeyboard;
    };
  }, [isMobileAnalysis]);

  /** 앰비언트 오디오 컨트롤러 — 마운트 시 생성(컨텍스트는 제스처 때 resume) */
  useEffect(() => {
    audioRef.current = createAmbientAudio();
    return () => {
      audioRef.current?.dispose();
      audioRef.current = null;
    };
  }, []);

  /** Heptapod B 배경음악 — 컨트롤러 생성/해제만(1회). 실제 재생/정지는 audioActive가 제어. */
  useEffect(() => {
    const music = createBackgroundMusic(); // 음원·음량은 env(backgroundMusic) 기본값
    musicRef.current = music;
    return () => {
      music.dispose();
      musicRef.current = null;
    };
  }, []);

  // Keep the intro gate and the user's music choice independent.
  useEffect(() => {
    if (!audioActive || !isMusicOn) { musicRef.current?.pause(); return undefined; }
    musicRef.current?.play();
    const kick = () => {
      musicRef.current?.play();
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
    };
    window.addEventListener('pointerdown', kick);
    window.addEventListener('keydown', kick);
    return () => {
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
    };
  }, [audioActive, isMusicOn]);

  const handleToggleMusic = useCallback(() => {
    const next = !isMusicOn;
    setIsMusicOn(next);
    if (next && audioActive) musicRef.current?.play();
    else musicRef.current?.pause();
  }, [audioActive, isMusicOn]);

  /**
   * 배경 안개 Z-dive 트리거 — 배경(안개)이 천천히 들어가다 생성 타이밍에 가속하며
   * 화면 안쪽으로 파고드는 진입을 1회 재생한다. 글리프는 건드리지 않는다.
   * reduced-motion은 무동작.
   */
  const triggerRush = useCallback(() => {
    if (reducedMotion) {
      return;
    }
    setDiveKey((k) => k + 1);
  }, [reducedMotion]);

  /** 형성/등장 연출 완료 — 모델 완료 표시 + 사운드 settle */
  const handleFormationComplete = useCallback(() => {
    setFormedModel(model);
    audioRef.current?.formationComplete();
  }, [model]);

  /** WebGL 런타임 실패 — Canvas 입자 렌더러로 우아한 강등 */
  const handleContextLost = useCallback(() => {
    setRenderConfig((prev) => (
      prev.tier === 'webgl'
        ? { ...prev, tier: 'canvas', reasons: [...prev.reasons, 'webgl:runtime-fallback'] }
        : prev
    ));
  }, []);

  const handleEncode = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed || composingRef.current || publishIntent || sharePending.current) return false;
    const validation = validateName(trimmed);
    if (!validation.valid) { setInputError(validation.error.message); return false; }
    setInputError('');
    setShareError('');
    setShareStatus('');
    if (trimmed === encodedName && encoderVersion === 2) return true;
    setEncoderVersion(2);
    setPublished(null);
    setStack([]);
    setIsAnalysisOn(false);
    setSelectedMeaningId(null);
    audioRef.current?.encodeStart();
    if (!reducedMotion) setDiveKey((key) => key + 1);
    setEncodedName(trimmed);
    setName(trimmed);
    return true;
  }, [name, encodedName, encoderVersion, reducedMotion, publishIntent]);

  const handleSubmit = useCallback((event) => {
    event.preventDefault();
    if (handleEncode() && isMobileAnalysis) inputRef.current?.blur();
  }, [handleEncode, isMobileAnalysis]);

  const handleKeyDown = useCallback((event) => {
    if (event.key !== 'Enter') return;
    // Preserve the original Enter guard, including Safari's 229 fallback:
    // otherwise the new form could implicitly submit a composing key press.
    event.preventDefault();
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 || composingRef.current) return;
    if (handleEncode() && isMobileAnalysis) inputRef.current?.blur();
  }, [handleEncode, isMobileAnalysis]);

  // Called on a fresh user click, including the post-publication Share button.
  const handleShare = useCallback(async (result = published, shareOptions = {}) => {
    if (!model || encoderVersion !== 2 || sharePending.current) return null;
    if (!result?.glyphId) { setPublishIntent('share'); return null; }
    sharePending.current = true;
    setSharing(true);
    setShareError('');
    setShareStatus('');
    try {
      const status = await shareArchive({ left: {
        id: result.glyphId, canonical_name: model.meta.canonicalName, is_interrogative: Boolean(model.questionHook),
      }, interpretation }, { ...shareOptions, locale });
      setShareStatus(status);
      return status;
    } catch (error) {
      setShareError(error.message || t('encoderResult.shareFailed'));
      throw error;
    } finally {
      sharePending.current = false;
      setSharing(false);
    }
  }, [model, interpretation, encoderVersion, published, locale, t]);

  // edge: 분석 모드 스크림용 어두운 색.
  const ink = theme.palette.custom?.chamber?.ink || '#1c2226';
  const edge = theme.palette.background.default || '#0c100f';
  // L1 외곽 비네트 전용 — 영상 마지막 프레임처럼 가장자리를 블루블랙이 아닌
  // 쿨 블루슬레이트로 "아주 살짝만" 눌러 균일한 밝은 안개를 유지한다.
  const vignette = '#33505f';
  // HUD 전경색(텍스트·보더). 일반 모드는 밝은 안개 위라 어두운 쿨톤, 분석 모드는
  // 어두운 스크림 위라 흰색. (이전엔 어두운 비네트 전제로 항상 흰색이었음)
  const fg = analysisActive ? '#ffffff' : '#1c2731';

  // 관측 가능한 형태 네 항목만 표시한다. ANALYSIS는 주석만 켜고 이 패널은 바꾸지 않는다.
  // 의미 설명은 별도의 분석 레일에서 읽으며 요약/버튼 위치를 바꾸지 않는다.
  const metadataRows = model
    ? [
      [t('heptapodEncoderPage.clusters'), t('heptapodEncoderPage.count', { p0: model.clusters.length })],
      [t('heptapodEncoderPage.strands'), t('encoder.strandCount', { count: model.strands.length })],
      [t('heptapodEncoderPage.weightCenter2'), `${toDeg(model.ring.weightCenterAngle)}°`],
      [t('heptapodEncoderPage.ring'), t(model.gap ? 'heptapodEncoderPage.gap' : 'heptapodEncoderPage.noGap')],
    ]
    : [];

  return (
    <Box
      data-encoder-result
      data-encoder-version={ encoderVersion }
      sx={ {
        position: 'relative',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'background.default',
        [theme.breakpoints.down('md')]: {
          '--encoder-mobile-stage': 'clamp(200px, 72vw, 360px)',
          height: 'auto', minHeight: '100svh', overflow: 'clip visible',
          display: 'flex', flexDirection: 'column',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        },
      } }
    >
      {/* L0 — 화면 전체 안개 공간 (영화: 챔버 안에 들어와 있는 구도).
          diveKey 변경 시 안개가 화면 안쪽으로 가속 진입(Z-dive)한다. */}
      <LogogramChamber isFullscreen isActive={ !reducedMotion } diveKey={ diveKey }>
        <Box
          ref={ stageRef }
          data-encoder-stage
          sx={ {
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            [theme.breakpoints.down('md')]: {
              position: 'absolute', top: 'calc(116px + env(safe-area-inset-top, 0px))',
              height: 'var(--encoder-mobile-stage)',
            },
          } }
        >
          {/* 확정 인코딩 — 루트 단일 (클릭 시 분해) */}
          { model && stageMin > 0 && atRoot && (
            <Box
              role={ canSplitRoot && !analysisActive ? 'button' : 'img' }
              tabIndex={ canSplitRoot && !analysisActive ? 0 : undefined }
              aria-label={ t('encoderResult.glyphForName', { name: encodedName }) }
              onKeyDown={ (event) => {
                if (canSplitRoot && !analysisActive && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  setStack([rootCore]);
                  audioRef.current?.encodeStart();
                  triggerRush();
                }
              } }
              onClick={ canSplitRoot && !analysisActive ? () => { setStack([rootCore]); audioRef.current?.encodeStart(); triggerRush(); } : undefined }
              sx={ {
                position: 'relative',
                display: 'inline-flex',
                lineHeight: 0,
                cursor: canSplitRoot && !analysisActive ? 'pointer' : 'default',
                pointerEvents: canSplitRoot && !analysisActive ? 'auto' : 'none',
                filter: analysisActive ? 'brightness(0) invert(1)' : 'none',
              } }
            >
              <TierRenderer
                model={ model }
                size={ rendererSize }
                isActive
                onFormationComplete={ handleFormationComplete }
                onContextLost={ handleContextLost }
              />
            </Box>
          ) }

          { model && stageMin > 0 && !atRoot && (
            <ChildGrid
              nodes={ childNodes }
              stageMin={ stageMin }
              ink={ ink }
              fg={ fg }
              onSelect={ (node) => { setStack((s) => [...s, node.text]); audioRef.current?.encodeStart(); triggerRush(); } }
            />
          ) }

          { !model && (
            <Typography
              component="span"
              sx={ {
                ...monoSx,
                color: ink,
                opacity: 0.3,
                letterSpacing: '0.4em',
                textTransform: 'uppercase',
              } }
            >
              { t('heptapodEncoderPage.awaitingInput') }
            </Typography>
          ) }
        </Box>
      </LogogramChamber>

      {/* L0.5 — 분석 스크림. 문자(안개+로고그램)와 분석 라인 사이를 어둡게 덮어
          선택한 의미의 실제 관측 부위가 떠 보이게 한다 (분석 모드에서만 페이드인) */}
      <Box
        sx={ {
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          backgroundColor: alpha(edge, 0.58),
          opacity: analysisActive ? 1 : 0,
          transition: theme.transitions.create('opacity', {
            duration: 700,
            easing: theme.transitions.easing.easeInOut,
          }),
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        } }
      />

      {/* 초록 삼각망·정점·스캔은 유지하고, 선택한 의미의 실제 부위를 위에 겹친다. */}
      { analysisActive && !isMobileAnalysis && <>
        <Box data-encoder-meaning-anchors sx={ { position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', display: 'grid', placeItems: 'center' } }>
          <Box sx={ { position: 'relative', width: rendererSize, height: rendererSize } }>
            <AnalysisOverlay model={ model } size={ rendererSize } isVisible={ analysisActive }
              showFrame={ false } showReadout={ false }
              onScan={ (info) => audioRef.current?.scanBeeps(info.count, info) } />
            <GlyphObservationOverlay model={ model } anchors={ selectedAnchors } fg={ fg } />
          </Box>
        </Box>
        <Box data-encoder-meaning-rail data-lenis-prevent sx={ {
          position: 'absolute', left: 36, top: 'calc(184px + env(safe-area-inset-top, 0px))', bottom: 172, zIndex: 3,
          width: 'clamp(220px, 21vw, 280px)', overflowY: 'auto', overscrollBehavior: 'contain', pr: 1,
        } }>
          <GlyphMeaningSummary interpretation={ interpretation } variant="reading" fg={ fg }
            selectedObservationId={ selectedMeaningId } onSelectObservation={ (observation) => setSelectedMeaningId(observation?.id || null) } />
        </Box>
      </> }

      {/* L1 — 외곽 비네트 (영상 마지막 프레임 정렬). 블루블랙 크러시가 아니라 쿨 블루슬레이트로
          가장자리만 아주 살짝 눌러 균일한 밝은 안개를 유지한다(이전보다 훨씬 약하고 좁게). */}
      <Box
        sx={ {
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 2,
          background:
            `radial-gradient(ellipse 94% 90% at 50% 45%, ${alpha(vignette, 0)} 60%, ${alpha(vignette, 0.08)} 84%, ${alpha(vignette, 0.2)} 100%)`,
          boxShadow: `inset 0 0 140px 8px ${alpha(vignette, 0.12)}`,
        } }
      />

      <AppGNB overlay tone={ analysisActive ? 'dark' : 'light' } soundOn={ isMusicOn } onToggleSound={ handleToggleMusic } />

      {/* L2 — 플로팅 컨트롤 (전부 잉크 톤) */}
      {/* 좌상단: 타이틀 */}
      <Box sx={ { position: 'absolute', top: { xs: 'calc(76px + env(safe-area-inset-top, 0px))', md: 'calc(100px + env(safe-area-inset-top, 0px))' }, left: { xs: 20, md: 36 }, zIndex: 3 } }>
        <Typography
          component="span"
          sx={ { ...monoSx, color: fg, opacity: 0.55, letterSpacing: '0.4em', textTransform: 'uppercase', display: { xs: 'none', md: 'block' }, mb: 1, fontSize: '0.6rem' } }
        >
          { t('heptapodEncoderPage.semasiographicEncoder') }
        </Typography>
        <Typography
          component="h1"
          sx={ {
            m: 0,
            fontWeight: 300,
            fontSize: { xs: 16, md: 20 },
            letterSpacing: '0.5em',
            textTransform: 'uppercase',
            color: fg,
            opacity: 0.95,
          } }
        >
          { t('heptapodEncoderPage.heptapodB') }
        </Typography>
      </Box>

      {/* 깊이 내비 — 상단 중앙, 화살표 하나 (← 한 단계 위로) */}
      { model && !atRoot && (
        <Box
          component="button"
          aria-label={ t('heptapodEncoderPage.oneLevelUp') }
          onClick={ () => setStack((s) => s.slice(0, -1)) }
          sx={ {
            position: 'absolute',
            top: { xs: 'calc(112px + env(safe-area-inset-top, 0px))', md: 'calc(100px + env(safe-area-inset-top, 0px))' },
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 4,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            p: 0,
            lineHeight: 1,
            color: fg,
            opacity: 0.7,
            fontSize: { xs: 36, md: 48 },
            transition: 'opacity 0.15s ease',
            '&:hover': { opacity: 1 },
          } }
        >
          ←
        </Box>
      ) }

      {/* 분해 힌트 — 루트 + 분해 가능 시 (상단 중앙) */}
      { model && atRoot && canSplitRoot && !analysisActive && (
        <Box
          sx={ {
            position: 'absolute',
            top: { xs: 'calc(112px + env(safe-area-inset-top, 0px))', md: 'calc(112px + env(safe-area-inset-top, 0px))' },
            display: { xs: 'none', md: 'block' },
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 3,
            pointerEvents: 'none',
            ...monoSx,
            color: fg,
            opacity: 0.4,
            fontSize: '0.58rem',
            letterSpacing: '0.16em',
          } }
        >
          { t('heptapodEncoderPage.clickTheLogogramToSplitItInto') }
        </Box>
      ) }

      {/* 우상단: 동일한 네 줄 요약 + 고정 액션. 분석 모드에서도 행을 추가/교체하지 않는다. */}
      { model && (
        <Box
          component="aside"
          data-encoder-overlay
          sx={ {
            position: 'absolute',
            top: { xs: 'calc(120px + env(safe-area-inset-top, 0px))', md: 'calc(100px + env(safe-area-inset-top, 0px))' },
            right: { xs: 16, md: 36 },
            zIndex: 3,
            m: 0,
            width: { xs: 148, md: 200 },
            [theme.breakpoints.down('md')]: {
              position: 'relative', top: 'auto', right: 'auto', order: 2,
              width: 'min(540px, calc(100% - 40px))', mx: 'auto', mt: 3, mb: 3,
              '& [data-encoder-metadata]': { height: 64, gridTemplateRows: 'repeat(2, 32px)', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: 2 },
              '& button, & a': { minHeight: 44 },
            },
          } }
        >
          <FadeTransition direction="down" duration={ 800 }>
            <Box>
              <Box
                data-encoder-metadata-heading
                sx={ {
                  ...monoSx,
                  color: fg,
                  opacity: 0.55,
                  letterSpacing: '0.32em',
                  textTransform: 'uppercase',
                  fontSize: '0.58rem',
                  height: 28,
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  pb: 0.75,
                  mb: 0.5,
                  textAlign: 'right',
                  borderBottom: `1px solid ${alpha(fg, 0.38)}`,
                } }
              >
                { t('heptapodEncoderPage.analysis') }
              </Box>
              <Box component="dl" data-encoder-metadata sx={ { m: 0, height: 128, display: 'grid', gridTemplateRows: 'repeat(4, 32px)' } }>
                { metadataRows.map(([label, value]) => (
                  <Box
                    key={ label }
                    sx={ {
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      alignItems: 'center',
                      gap: 1,
                      minHeight: 0,
                      overflow: 'hidden',
                      borderBottom: `1px solid ${alpha(fg, 0.16)}`,
                    } }
                  >
                    <Box component="dt" title={ label } sx={ { ...monoSx, color: fg, opacity: 0.6, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }>
                      { label }
                    </Box>
                    <Box component="dd" title={ String(value) } sx={ { ...monoSx, color: fg, opacity: 0.95, fontSize: '0.62rem', letterSpacing: '0.06em', m: 0, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }>
                      { value }
                    </Box>
                  </Box>
                )) }
              </Box>

              {encoderVersion === 2 && <GlyphClusterLink interpretation={ interpretation } compact sx={ { mt: 1, color: fg } } />}

              {/* status 하단 — 분석 오버레이 토글 버튼 */}
              <Button
                data-encoder-analysis
                aria-pressed={ isAnalysisOn }
                onClick={ handleToggleAnalysis }
                disabled={ isForming }
                variant="text"
                fullWidth
                sx={ {
                  ...monoSx,
                  mt: 1,
                  py: 0.75,
                  justifyContent: 'space-between',
                  color: fg,
                  opacity: isAnalysisOn ? 0.95 : 0.55,
                  fontSize: '0.6rem',
                  letterSpacing: '0.18em',
                  borderRadius: 0,
                  border: `1px solid ${alpha(fg, isAnalysisOn ? 0.5 : 0.2)}`,
                  '&:hover': { backgroundColor: alpha(fg, 0.06), borderColor: alpha(fg, 0.6) },
                } }
              >
                <span>{ t('heptapodEncoderPage.analysis2') }</span>
                <span>{ isAnalysisOn ? t('heptapodEncoderPage.on') : t('heptapodEncoderPage.off') }</span>
              </Button>

              {/* 미공개면 동의 후 공개·공유, 이미 공개했으면 재게시 없이 공유한다. */}
              <Box data-encoder-actions data-encoder-published={ !!published } sx={ { mt: 0.75 } }>
                <Button
                  onClick={ encoderVersion === 1 ? handleEncode : () => { handleShare().catch(() => {}); } }
                  disabled={ hasDraft || sharing }
                  variant="text" fullWidth
                  sx={ {
                    ...monoSx, py: 0.6, color: fg, opacity: 0.7, fontSize: '0.58rem', letterSpacing: '0.04em', lineHeight: 1.5, wordBreak: 'keep-all', borderRadius: 0, border: `1px solid ${alpha(fg, 0.28)}`, '&:hover': { opacity: 0.95, backgroundColor: alpha(fg, 0.06), borderColor: alpha(fg, 0.5) },
                  } }
                >
                  { t(encoderVersion === 1 ? 'encoderResult.recreate' : sharing ? 'encoderResult.sharing' : published ? 'encoderResult.share' : 'heptapodEncoderPage.publishAndShare') }
                </Button>
                {published?.glyphId && (
                  <Button data-encoder-public-link onClick={ () => setPublishIntent('share') } disabled={ sharing }
                    variant="text" fullWidth sx={ { ...monoSx, minHeight: 44, color: fg, fontSize: '0.58rem', borderRadius: 0 } }>
                    {t('publishDialog.myGlyphLink')}
                  </Button>
                )}
              </Box>
              <Box role="status" aria-live="polite" sx={ { ...monoSx, color: fg, fontSize: '0.6rem', mt: shareStatus || shareError ? 1 : 0 } }>
                { shareError ? localize(shareError) : shareStatus ? t(`encoderResult.${shareStatus}`) : '' }
              </Box>
              <Button
                component={ RouterLink }
                to={ APP_PATHS.archive }
                variant="text"
                fullWidth
                sx={ {
                  ...monoSx, mt: 0.5, py: 0.4, color: fg, opacity: 0.4, fontSize: '0.52rem', letterSpacing: '0.2em', borderRadius: 0, textDecoration: 'none', '&:hover': { opacity: 0.75, backgroundColor: 'transparent' },
                } }
              >
                { t('heptapodEncoderPage.archive') }
              </Button>
            </Box>
          </FadeTransition>
        </Box>
      ) }

      {/* 중앙 하단: 기존 대형 underline 입력과 타이핑 프리뷰 */}
      <Box
        component="form"
        onSubmit={ handleSubmit }
        data-encoder-controls
        sx={ {
          position: 'absolute',
          left: '50%',
          bottom: { xs: 'calc(24px + var(--kb-offset, 0px))', md: 44 },
          transition: 'bottom 0.2s ease',
          transform: 'translateX(-50%)',
          zIndex: 3,
          width: 'min(86vw, 640px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          [theme.breakpoints.down('md')]: {
            position: 'relative', left: 'auto', bottom: 'auto', transform: 'none', order: 1,
            width: 'min(540px, calc(100% - 40px))', mx: 'auto',
            mt: 'calc(124px + env(safe-area-inset-top, 0px) + var(--encoder-mobile-stage))',
            transition: 'none', scrollMarginBlock: '80px',
          },
        } }
      >
        {/* 타이핑 라이브 프리뷰 — 입력창 바로 위 UI 장치 (방금 친 글자 1개) */}
        { isTyping && (
          <Box sx={ { mb: 1, minHeight: 100, display: 'flex', justifyContent: 'center' } }>
            <TypingPreview text={ name } size={ 88 } ink={ fg } monoSx={ monoSx } />
          </Box>
        ) }

        {/* 큰 underline 입력만 (ENCODE 버튼 없음 — Enter로 인코딩) */}
        <TextField
          inputRef={ inputRef }
          value={ name }
          onChange={ (event) => { setName(event.target.value); setInputError(''); setShareError(''); setShareStatus(''); } }
          onCompositionStart={ () => { composingRef.current = true; } }
          onCompositionEnd={ () => { composingRef.current = false; } }
          disabled={ !!publishIntent || sharing }
          onKeyDown={ handleKeyDown }
          placeholder={ t('heptapodEncoderPage.enterANameThenPressEnter') }
          error={ !!inputError }
          helperText={ inputError ? localize(inputError) : hasDraft ? t('encoderResult.confirmName') : '' }
          fullWidth
          variant="standard"
          slotProps={ {
            htmlInput: { 'aria-label': t('heptapodEncoderPage.nameToEncode'), enterKeyHint: isMobileAnalysis ? 'done' : 'go', autoComplete: 'off' },
            input: {
              sx: {
                // 영화 타이틀 톤 — Outfit(라틴)+Pretendard(한글) Light, 넓은 자간
                fontFamily: '"Outfit", "Pretendard Variable", Pretendard, sans-serif',
                fontWeight: 300,
                fontSize: { xs: '2rem', md: '2.8rem' },
                letterSpacing: '0.18em',
                color: fg,
                '& input': { textAlign: 'center', py: 1.25 },
                '& input::placeholder': {
                  color: fg, opacity: 0.32, fontSize: '0.5em', letterSpacing: '0.24em', fontWeight: 300,
                },
                '&:before': { borderBottomColor: alpha(fg, 0.3) },
                '&:hover:not(.Mui-disabled):before': { borderBottomColor: alpha(fg, 0.6) },
                '&:after': { borderBottomColor: fg },
              },
            },
          } }
        />

        {/* 정직한 카피 */}
        <Typography
          component="p"
          sx={ {
            ...monoSx, color: fg, opacity: 0.42, letterSpacing: '0.2em', textAlign: 'center', mt: 2.5, mb: 0, fontSize: '0.6rem',
          } }
        >
          {encoderVersion === 1 ? t('heptapodEncoderPage.legacyResponseReproducingAnExistingSharedGlyph') : model?.meta.reversible ? t('heptapodEncoderPage.reversibleEncodingRecoverTheNormalizedNameFrom') : t('heptapodEncoderPage.deterministicEncodingTheSameNameLeavesThe')}
        </Typography>
      </Box>

      {/* Publish 다이얼로그 — 공개 아카이브 게시 확인 */}
      <PublishDialog key={ `${encodedName}:${encoderVersion}` } open={ !!publishIntent }
        intent={ publishIntent || 'publish' } completion="stay" onClose={ () => setPublishIntent(null) }
        publishedResult={ published }
        glyphName={ encodedName } model={ model } interpretation={ interpretation } onShare={ handleShare }
        onPublish={ async ({ consented }) => {
          if (!model || !encodedName || encoderVersion !== 2) throw new Error(t('heptapodEncoderPage.createAV2GlyphFirst'));
          if (published?.glyphId) return published;
          const result = await publish({ displayName: encodedName, contextTags: [], consented });
          setPublished(result);
          return result;
        } } />
      {/* 모바일에서도 동일한 판독/선택 상태. 코덱·가역성에 관계없이 실제 모델을 읽는다. */}
      <Dialog open={ analysisActive && isMobileAnalysis } onClose={ handleCloseAnalysis }
        fullScreen aria-labelledby={ readingDialogId } data-lenis-prevent
        transitionDuration={ reducedMotion ? 0 : theme.transitions.duration.shortest }
        slotProps={ { paper: { sx: { bgcolor: 'background.default', backgroundImage: 'none', color: 'common.white', height: '100dvh', pt: 'env(safe-area-inset-top, 0px)', pb: 'env(safe-area-inset-bottom, 0px)', boxSizing: 'border-box' } } } }>
        <Box sx={ { display: 'flex', flexShrink: 0, alignItems: 'center', justifyContent: 'space-between', gap: 2, px: 3, py: 1 } }>
          <Typography id={ readingDialogId } component="h2" sx={ { fontSize: 16, fontWeight: 400, overflowWrap: 'anywhere' } }>
            { t('meaningReading.dialogTitle', { name: encodedName }) }
          </Typography>
          <Button onClick={ handleCloseAnalysis } sx={ { color: 'inherit', minWidth: 44, minHeight: 44, flexShrink: 0 } }>{ t('heptapodEncoderPage.close') }</Button>
        </Box>
        <Box sx={ { px: 3, pb: 4, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' } }>
          <Box data-encoder-mobile-glyph sx={ { position: 'relative', width: mobileGlyphSize, height: mobileGlyphSize, mx: 'auto' } }>
            <LogogramRendererCanvas model={ model } size={ mobileGlyphSize } inkColor={ theme.palette.common.white } isActive />
            <AnalysisOverlay model={ model } size={ mobileGlyphSize } isVisible={ analysisActive }
              showFrame={ false } showReadout={ false }
              onScan={ (info) => audioRef.current?.scanBeeps(info.count, info) } />
            <GlyphObservationOverlay model={ model } anchors={ selectedAnchors } fg={ theme.palette.common.white } />
          </Box>
          <GlyphMeaningSummary interpretation={ interpretation } variant="reading" fg={ theme.palette.common.white } sx={ { maxWidth: 540, mx: 'auto' } }
            selectedObservationId={ selectedMeaningId } onSelectObservation={ (observation) => setSelectedMeaningId(observation?.id || null) } />
        </Box>
      </Dialog>
    </Box>
  );
}

export default HeptapodEncoderPage;
