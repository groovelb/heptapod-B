import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';

import LogogramChamber from '../motion/LogogramChamber';
import LogogramRendererCanvas from '../motion/LogogramRendererCanvas';
import FadeTransition from '../motion/FadeTransition';
import AnalysisOverlay from '../overlay-feedback/AnalysisOverlay';
import { buildModelReversible, decode, inspect } from '../../utils/heptapod/reversibleModel';
import { detectRenderTier, subscribeReducedMotion } from '../../utils/heptapod/detectRenderTier';
import { exportLogogramPng } from '../../utils/heptapod/exportPng';
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

/** PNG 추출 기준 한 변 (px) — scale 2 적용 시 1920px 출력 */
const EXPORT_BASE_SIZE = 960;

/** PNG 추출 배율 */
const EXPORT_SCALE = 2;

/** 뷰포트 짧은 변 대비 로고그램 크기 비율 — 영화처럼 화면을 압도하는 스케일 */
const FULLSCREEN_FILL = 0.62;


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
  const chars = Array.from(text.replace(/[?？]/g, '')).filter((ch) => !/\s/.test(ch));
  const last = chars[chars.length - 1];
  if (!last) return null;
  return (
    <Box sx={ { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 } }>
      <Box
        component="span"
        sx={ {
          ...monoSx, color: ink, opacity: 0.4, fontSize: '0.5rem', letterSpacing: '0.24em', textTransform: 'uppercase',
        } }
      >
        Preview
      </Box>
      <Box sx={ { width: size, height: size } }>
        <LogogramRendererCanvas
          key={ `${last}-${chars.length}` } // 키 입력마다 remount → 재형성
          model={ buildModelReversible(last) }
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

/** 미니멀 단계 행 — 박스 대신 상단 수평 분할선으로만 구분 */
function StepRow({ n, title, fg, monoSx, children, first }) {
  return (
    <Box sx={ { py: 1.25, borderTop: first ? 'none' : `1px solid ${alpha(fg, 0.15)}` } }>
      <Box sx={ {
        ...monoSx, fontSize: '0.54rem', color: fg, opacity: 0.5, letterSpacing: '0.14em', mb: 0.6, textTransform: 'uppercase',
      } }
      >
        { `${n} · ${title}` }
      </Box>
      { children }
    </Box>
  );
}

/** 흐름도 단계 카드 — 번호 + 제목 + 내용 (모달 fallback용) */
function StepCard({ n, title, fg, monoSx, children }) {
  return (
    <Box sx={ { flex: 1, minWidth: 0, border: `1px solid ${alpha(fg, 0.16)}`, p: 1.5 } }>
      <Box sx={ { display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 } }>
        <Box sx={ { ...monoSx, fontSize: '1.1rem', color: fg, opacity: 0.9 } }>{ n }</Box>
        <Box sx={ { ...monoSx, fontSize: '0.66rem', color: fg, opacity: 0.7, letterSpacing: '0.04em' } }>{ title }</Box>
      </Box>
      { children }
    </Box>
  );
}

/** 단계 카드 내부 보조 설명 */
function StepNote({ fg, monoSx, children }) {
  return (
    <Box sx={ { ...monoSx, fontSize: '0.55rem', color: fg, opacity: 0.45, letterSpacing: '0.03em', mt: 1, lineHeight: 1.6 } }>
      { children }
    </Box>
  );
}

/** 단계 사이 흐름 화살표 (가로/세로 반응형) */
function FlowArrow({ fg }) {
  return (
    <Box sx={ {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: fg,
      opacity: 0.35,
      fontSize: '1.1rem',
      transform: { xs: 'rotate(90deg)', md: 'none' },
      px: { md: 0.5 },
    } }
    >
      →
    </Box>
  );
}

/**
 * 주석 글리프 — 실제 로고그램(고스트 렌더) 위에 데이터 라벨을 얹어
 * "이 부분이 이 값"으로 시각 분석한다. 계측색(초록 mesh선·빨강 vertex) 한정.
 *
 * @param {object} props - { model, rawData, size, fg, monoSx }
 * @returns {JSX.Element} 분석 다이어그램
 */
function GlyphCallouts({ model, rawData, size, glyphSize, fg, monoSx }) {
  const GREEN = '#3ad16b';
  const RED = '#e0432e';
  const monoFont = monoSx.fontFamily;
  const cx = size / 2;
  const cy = size / 2;
  const r = glyphSize * 0.3; // 실제 글리프 링 반경(R0/720 × glyphSize)과 일치
  const labelR = Math.min(size * 0.46, r + size * 0.17);
  const fs = Math.max(9, size * 0.026);
  const pt = (rad, ang) => [cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad];
  const wcA = model.ring.weightCenterAngle;

  return (
    <svg
      width={ size }
      height={ size }
      viewBox={ `0 0 ${size} ${size}` }
      style={ {
        position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none',
      } }
    >
      <circle cx={ cx } cy={ cy } r={ r } fill="none" stroke={ fg } strokeOpacity={ 0.16 } strokeDasharray="1 5" />

      {/* 무게중심 */}
      { (() => {
        const [ix, iy] = pt(r * 0.55, wcA);
        const [ox, oy] = pt(r * 1.04, wcA);
        const [lx, ly] = pt(labelR, wcA);
        const anchor = Math.cos(wcA) >= 0 ? 'start' : 'end';
        return (
          <g>
            <line x1={ ix } y1={ iy } x2={ ox } y2={ oy } stroke={ fg } strokeOpacity={ 0.5 } strokeWidth={ 1.2 } />
            <text x={ lx } y={ ly } fill={ fg } fillOpacity={ 0.7 } textAnchor={ anchor } dominantBaseline="middle" style={ { fontFamily: monoFont, fontSize: fs } }>
              { `무게중심 ${rawData.fixed[3].where}` }
            </text>
          </g>
        );
      })() }

      {/* gap (개구부) */}
      { model.gap && (() => {
        const [mx, my] = pt(r, model.gap.ang);
        const [lx, ly] = pt(labelR, model.gap.ang);
        const anchor = Math.cos(model.gap.ang) >= 0 ? 'start' : 'end';
        return (
          <g>
            <circle cx={ mx } cy={ my } r={ 4 } fill="none" stroke={ fg } strokeOpacity={ 0.5 } />
            <text x={ lx } y={ ly } fill={ fg } fillOpacity={ 0.6 } textAnchor={ anchor } dominantBaseline="middle" style={ { fontFamily: monoFont, fontSize: fs } }>끊김</text>
          </g>
        );
      })() }

      {/* 클러스터 콜아웃 (★ 데이터↔형태 연관) */}
      { model.clusters.map((c, i) => {
        const [mx, my] = pt(r, c.ang);
        const [lx, ly] = pt(labelR, c.ang);
        const anchor = Math.cos(c.ang) >= 0 ? 'start' : 'end';
        const cell = rawData.clusterCells[i];
        return (
          <g key={ `cl-${i}` }>
            <line x1={ mx } y1={ my } x2={ lx } y2={ ly } stroke={ GREEN } strokeOpacity={ 0.5 } strokeWidth={ 0.7 } />
            <circle cx={ mx } cy={ my } r={ 3.4 } fill={ RED } />
            <text x={ lx + (anchor === 'start' ? 5 : -5) } y={ ly - fs * 0.5 } fill={ GREEN } fillOpacity={ 0.95 } textAnchor={ anchor } dominantBaseline="middle" style={ { fontFamily: monoFont, fontSize: fs } }>
              { `덩어리 c${i} = ${cell.cell}` }
            </text>
            <text x={ lx + (anchor === 'start' ? 5 : -5) } y={ ly + fs * 0.6 } fill={ fg } fillOpacity={ 0.6 } textAnchor={ anchor } dominantBaseline="middle" style={ { fontFamily: monoFont, fontSize: fs * 0.85 } }>
              { `${c.type}·가시${cell.spikeN}·${cell.dir}` }
            </text>
          </g>
        );
      }) }
    </svg>
  );
}

/** 모달용 — 글리프(고스트 렌더) + 콜아웃 (모달 보존) */
function AnnotatedGlyph({ model, rawData, size, fg, monoSx }) {
  const glyphSize = Math.round(size * 0.6);
  return (
    <Box sx={ { position: 'relative', width: size, height: size, mx: 'auto', my: 1 } }>
      <Box sx={ {
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      } }
      >
        <LogogramRendererCanvas model={ model } size={ glyphSize } inkColor={ alpha(fg, 0.6) } isActive />
      </Box>
      <GlyphCallouts model={ model } rawData={ rawData } size={ size } glyphSize={ glyphSize } fg={ fg } monoSx={ monoSx } />
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
 *    대형 underline 입력 + 토글 + 액션(중앙 하단)
 *
 * 동작 흐름은 이전과 동일: URL 재현 → ENCODE 확정 시 모델 재생성 →
 * 형성 중 ANALYSIS 비활성 → INTERROGATIVE 분리 시드 → PNG/링크.
 *
 * Props: 없음 — 페이지 레벨 템플릿 (상태는 내부 관리, URL 쿼리가 유일한 입력)
 *
 * Example usage:
 * <HeptapodEncoderPage />
 */
function HeptapodEncoderPage() {
  const theme = useTheme();
  const monoSx = theme.typography.custom?.mono || MONO_FALLBACK;

  // name(입력 중) / encodedName(확정) 분리 — ENCODE 실행 시에만 모델 재생성
  const [name, setName] = useState(readNameFromUrl);
  const [encodedName, setEncodedName] = useState(readNameFromUrl);
  const [isAnalysisOn, setIsAnalysisOn] = useState(false);
  const [formedModel, setFormedModel] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [renderConfig, setRenderConfig] = useState(() => detectRenderTier());
  const [stageMin, setStageMin] = useState(0);

  const stageRef = useRef(null);
  const copyTimerRef = useRef(null);
  const audioRef = useRef(null);
  const musicRef = useRef(null);
  const musicAutoStartedRef = useRef(false);
  const [isMusicOn, setIsMusicOn] = useState(false);
  // 배경 안개 Z-dive 트리거 — 값이 바뀔 때마다 챔버가 "안개 속으로 파고드는"
  // 가속 진입 애니메이션을 1회 재생한다 (글리프 아님 — 배경 전용).
  const [diveKey, setDiveKey] = useState(0);

  // 의문형은 입력의 '?'로 자동 판별 (토글 아님). '?'는 무드 마커이므로
  // 본체 시드에서 제외하고 questionHook 플래그로만 — 'Louise'와 'Louise?'는
  // 같은 본체 + 갈고리 유무만 다르다.
  const isInterrogative = /[?？]/.test(encodedName);

  /** 모델 캐시 — 가역 생성기. 같은 이름은 재계산하지 않는다 (결정론) */
  const model = useMemo(
    () => (encodedName.trim() ? buildModelReversible(encodedName) : null),
    [encodedName],
  );

  /** 형태 데이터에서 원본을 복원 (가역 증명). overflow면 복원 불가 */
  const decoded = useMemo(
    () => (model && !model.meta.overflow ? decode(model) : null),
    [model],
  );

  /** decode 직전 raw 추적 데이터 (자세히 보기 모달) */
  const [isRawOpen, setIsRawOpen] = useState(false);
  const rawData = useMemo(() => (model ? inspect(model) : null), [model]);

  // 깊이 내비게이션 (N레벨: 문단↔문장↔단어↔글자). stack = 드릴 경로(확장된 노드 텍스트).
  // [] = 루트 단일 뷰, [..] = 마지막 노드의 자식 격자.
  const [stack, setStack] = useState([]);
  const rootCore = encodedName.replace(/[?？]/g, '').trim();
  const currentText = stack.length ? stack[stack.length - 1] : rootCore;
  /** 현재 노드의 자식 로고그램들 (한 단계 하위 단위) */
  const childNodes = useMemo(
    () => splitText(currentText).map((txt, i) => ({
      key: `${txt}-${i}`,
      text: txt,
      model: buildModelReversible(txt),
      splittable: splitText(txt).length > 0,
    })),
    [currentText],
  );
  const canSplitRoot = splitText(rootCore).length > 0;
  const atRoot = stack.length === 0;
  // 타이핑 중 — 입력이 확정 인코딩과 다를 때 (라이브 프리뷰 표시)
  const isTyping = atRoot && name.trim().length > 0 && name.trim() !== encodedName;

  const reducedMotion = !!renderConfig.reducedMotion;
  const TierRenderer = RENDERER_BY_TIER[renderConfig.tier] || LogogramRendererCanvas;
  const rendererSize = Math.max(200, Math.round(stageMin * FULLSCREEN_FILL));

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

  /** COPY 라벨 복원 타이머 정리 */
  useEffect(() => () => {
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
    }
  }, []);

  /** 앰비언트 오디오 컨트롤러 — 마운트 시 생성(컨텍스트는 제스처 때 resume) */
  useEffect(() => {
    audioRef.current = createAmbientAudio();
    return () => {
      audioRef.current?.dispose();
      audioRef.current = null;
    };
  }, []);

  /** Heptapod B 배경음악 컨트롤러 — 마운트 시 생성(재생은 제스처 때) */
  useEffect(() => {
    musicRef.current = createBackgroundMusic({ volume: 20 });
    return () => {
      musicRef.current?.dispose();
      musicRef.current = null;
    };
  }, []);

  /** 배경음악 토글 — 클릭 제스처 안에서 재생 시작(자동재생 정책) */
  const handleToggleMusic = useCallback(() => {
    const on = musicRef.current?.toggle() ?? false;
    setIsMusicOn(on);
  }, []);

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

  /** ENCODE 확정 — 빈 입력은 무시. 사운드 휘몰이 시작(클릭=제스처) */
  const handleEncode = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    audioRef.current?.encodeStart();
    triggerRush(); // Z-depth 가속 진입
    // 최초 ENCODE 제스처에서 배경음악(Heptapod B) 시작 — 이후엔 토글로 제어
    if (!musicAutoStartedRef.current) {
      musicAutoStartedRef.current = true;
      musicRef.current?.play();
      setIsMusicOn(true);
    }
    setStack([]); // 새 인코딩 시 최상위로
    setEncodedName(trimmed);
  }, [name, triggerRush]);

  /** Enter 키로 ENCODE 실행 — 한글 IME 조합 중 Enter는 무시 (조기 확정 방지) */
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      handleEncode();
    }
  }, [handleEncode]);

  /** SAVE PNG — 동일 입자 전개를 고해상(2x) 정적 페인트해 추출 */
  const handleSavePng = useCallback(() => {
    if (!model || !encodedName) {
      return;
    }
    try {
      exportLogogramPng(model, {
        name: encodedName,
        size: EXPORT_BASE_SIZE,
        scale: EXPORT_SCALE,
        inkColor: theme.palette.custom?.chamber?.ink || '#15171a',
        background: theme.palette.custom?.chamber?.fog || '#dfe3e6',
      });
    } catch {
      // 추출 실패는 치명적이지 않음 — 무채색 UI 원칙상 별도 에러 연출 없음
    }
  }, [model, encodedName, theme]);

  /** COPY LINK — ?name= 쿼리 URL 복사 (URL만으로 동일 로고그램 재현) */
  const handleCopyLink = useCallback(async () => {
    if (!encodedName) {
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}?name=${encodeURIComponent(encodedName)}`;
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => setIsCopied(false), 1800);
    } catch {
      // 클립보드 미지원/거부 — 조용히 무시
    }
  }, [encodedName]);

  // edge: 화면 가장자리를 어둡게 덮는 비네트 색 (가운데가 상대적으로 밝게 뜸).
  // UI HUD는 어두운 가장자리 위에 떠 있으므로 흰색. 중앙 안개 위 플레이스홀더만 잉크.
  const ink = theme.palette.custom?.chamber?.ink || '#1c2226';
  const edge = theme.palette.background.default || '#0c100f';
  const fg = '#ffffff';

  /** 우상단 status line 테이블 행 데이터 */
  const readoutRows = model
    ? [
      ['Seed', `0x${model.meta.hashHex}`],
      ['NFD Units', String(model.meta.nfdCount)],
      ['Segments', String(model.slots.filter((s) => s.active).length)],
      ['Weight', `${toDeg(model.ring.weightCenterAngle)}°`],
      ['Mood', isInterrogative ? 'INTERROGATIVE' : 'DECLARATIVE'],
      // 가역 증명 — 형태에서 복원한 원본
      ['Decode', model.meta.overflow ? '— TOO LONG' : (decoded ? decoded.name : '—')],
      ['Tier', String(renderConfig.tier).toUpperCase()],
    ]
    : [];

  // 분석 중 우상단 = ③ 형태 설정 (모달 ③단계를 화면으로 분배). 친근 표현.
  const showForm = analysisActive && rawData && !rawData.overflow;
  const formRows = showForm
    ? [
      ['덩어리', `${rawData.clusterCount}개`],
      ...rawData.clusterCells.map((c, i) => [`c${i}`, `${c.type}·가시${c.spikeN}·${c.dir}`]),
      ['무게중심', rawData.fixed[3].where],
      ['링', rawData.fixed[1].value === 0 ? '끊김 없음' : rawData.fixed[1].where],
      ['가닥', rawData.fixed[2].visual.replace('멀티 스트랜드 ', '')],
    ]
    : [];
  const panelRows = showForm ? formRows : readoutRows;

  return (
    <Box
      sx={ {
        position: 'relative',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'background.default',
      } }
    >
      {/* L0 — 화면 전체 안개 공간 (영화: 챔버 안에 들어와 있는 구도).
          diveKey 변경 시 안개가 화면 안쪽으로 가속 진입(Z-dive)한다. */}
      <LogogramChamber isFullscreen isActive={ !reducedMotion } diveKey={ diveKey }>
        <Box
          ref={ stageRef }
          sx={ {
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          } }
        >
          {/* 확정 인코딩 — 루트 단일 (클릭 시 분해) */}
          { model && stageMin > 0 && atRoot && (
            <Box
              onClick={ canSplitRoot ? () => { setStack([rootCore]); audioRef.current?.encodeStart(); triggerRush(); } : undefined }
              sx={ {
                position: 'relative',
                display: 'inline-flex',
                lineHeight: 0,
                cursor: canSplitRoot ? 'pointer' : 'default',
                pointerEvents: canSplitRoot ? 'auto' : 'none',
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
              Awaiting Input
            </Typography>
          ) }
        </Box>
      </LogogramChamber>

      {/* L0.5 — 분석 스크림. 문자(안개+로고그램)와 분석 라인 사이를 어둡게 덮어
          mesh·vertex가 또렷이 떠 보이게 한다 (분석 모드에서만 페이드인) */}
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

      {/* 분석 라인 레이어 — 스크림 위, 로고그램과 정확히 정렬(중앙) */}
      { model && stageMin > 0 && (
        <Box
          sx={ {
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          } }
        >
          <Box sx={ { position: 'relative', width: rendererSize, height: rendererSize } }>
            {/* 울프럼 mesh(vertex+초록선) + 실제 데이터 콜아웃. 좌표계 스캐폴드는 끔.
                onScan: vertex 등장 타이밍에 맞춰 스캔 비프 "띡 띡" 재생 */}
            <AnalysisOverlay
              model={ model }
              size={ rendererSize }
              isVisible={ analysisActive }
              showFrame={ false }
              onScan={ (info) => audioRef.current?.scanBeeps(info.count, info) }
            />
            {/* 실제 데이터 콜아웃 — 클러스터/무게중심/끊김을 버킷값으로 (스크림 동기 페이드) */}
            { rawData && !rawData.overflow && (
              <Box
                sx={ {
                  position: 'absolute',
                  inset: 0,
                  opacity: analysisActive ? 1 : 0,
                  transition: theme.transitions.create('opacity', { duration: 700, easing: theme.transitions.easing.easeInOut }),
                  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                } }
              >
                <GlyphCallouts model={ model } rawData={ rawData } size={ rendererSize } glyphSize={ rendererSize } fg={ fg } monoSx={ monoSx } />
              </Box>
            ) }
          </Box>
        </Box>
      ) }

      {/* 분석 설명 — 좌측 레일 (문자 → 정수 → 형태 파라미터). 수평 분할선만 */}
      { rawData && (
        <Box
          sx={ {
            position: 'absolute',
            left: { xs: 16, md: 36 },
            top: { xs: 92, md: 112 },
            zIndex: 3,
            width: { xs: 168, md: 232 },
            display: { xs: 'none', md: 'block' },
            pointerEvents: 'none',
            opacity: analysisActive ? 1 : 0,
            transition: theme.transitions.create('opacity', { duration: 700, easing: theme.transitions.easing.easeInOut }),
          } }
        >
          {/* ① 문자 단위 분할 */}
          <StepRow n="1" title="문자 단위 분할 (NFD)" fg={ fg } monoSx={ monoSx } first>
            <Box sx={ { display: 'flex', flexWrap: 'wrap', gap: 0.5 } }>
              { rawData.tokens.map((t, i) => (
                <Box key={ i } sx={ { textAlign: 'center' } }>
                  <Box sx={ { ...monoSx, fontSize: '0.85rem', color: fg, opacity: 0.95 } }>{ t.char }</Box>
                  <Box sx={ { ...monoSx, fontSize: '0.5rem', color: fg, opacity: 0.5 } }>{ t.idx }</Box>
                </Box>
              )) }
            </Box>
          </StepRow>

          {/* ② 위치값 진법 합산 */}
          <StepRow n="2" title="위치값 진법 합산" fg={ fg } monoSx={ monoSx }>
            <Box sx={ { ...monoSx, fontSize: '0.52rem', color: fg, opacity: 0.55, lineHeight: 1.7, mb: 0.4 } }>
              { `N = Σ(문자번호+1)·${rawData.radixK}ⁱ` }
            </Box>
            { rawData.tokens.length <= 4 && (
              <Box sx={ { ...monoSx, fontSize: '0.5rem', color: fg, opacity: 0.4, lineHeight: 1.7, mb: 0.4, wordBreak: 'break-all' } }>
                { `= ${rawData.nExpr}` }
              </Box>
            ) }
            <Box sx={ { ...monoSx, fontSize: '0.78rem', color: fg, opacity: 0.95, wordBreak: 'break-all' } }>{ `= ${rawData.n}` }</Box>
            <Box sx={ { ...monoSx, fontSize: '0.5rem', color: fg, opacity: 0.4, mt: 0.3 } }>{ `${rawData.radixK}진법 · 손실 없이 되돌림` }</Box>
          </StepRow>

          {/* ③ 정수 → 형태 파라미터 */}
          <StepRow n="3" title="정수 → 형태 파라미터" fg={ fg } monoSx={ monoSx }>
            <Box sx={ { ...monoSx, fontSize: '0.52rem', color: fg, opacity: 0.55, lineHeight: 1.7, mb: 0.5 } }>
              N을 나눗셈으로 자릿수 분해 → 각 자리 = 형태 파라미터 1개
            </Box>
            { [
              `· 무게중심 ← ${rawData.fixed[3].value}`,
              ...rawData.clusterCells.map((c) => `· 덩어리 c${c.index} ← ${c.cell} → 가시 ${c.spikeN}`),
              `· 링 굴곡 ← ${rawData.fixed[0].value}`,
            ].map((line, i) => (
              <Box key={ i } sx={ { ...monoSx, fontSize: '0.54rem', color: fg, opacity: 0.8, lineHeight: 1.75 } }>{ line }</Box>
            )) }
            <Box sx={ { ...monoSx, fontSize: '0.5rem', color: '#3ad16b', opacity: 0.8, mt: 0.5 } }>
              → 오른쪽 패널·중앙 이미지에서 확인
            </Box>
          </StepRow>
        </Box>
      ) }

      {/* 분석 설명 — 하단 가역 결론. analysisActive에서만 */}
      { rawData && (
        <Box
          sx={ {
            position: 'absolute',
            left: '50%',
            bottom: { xs: 150, md: 168 },
            transform: 'translateX(-50%)',
            zIndex: 3,
            pointerEvents: 'none',
            textAlign: 'center',
            opacity: analysisActive ? 1 : 0,
            transition: theme.transitions.create('opacity', { duration: 700, easing: theme.transitions.easing.easeInOut }),
          } }
        >
          <Typography component="p" sx={ { ...monoSx, color: fg, opacity: 0.4, fontSize: '0.56rem', letterSpacing: '0.18em', m: 0, mb: 0.5 } }>
            글자 → 수 → 형태
          </Typography>
          <Typography component="p" sx={ { ...monoSx, color: fg, opacity: 0.85, fontSize: '0.66rem', letterSpacing: '0.04em', m: 0 } }>
            { `↺ 형태를 거꾸로 읽으면 다시 "${rawData.name}"` }
          </Typography>
        </Box>
      ) }

      {/* L1 — 가장자리 어둠 overlay (영화식 비네트). 화면 가장자리를 어둡게
          덮어 가운데 로고그램이 상대적으로 밝게 떠 보이게 한다 */}
      <Box
        sx={ {
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 2,
          background:
            `radial-gradient(ellipse 80% 76% at 50% 45%, ${alpha(edge, 0)} 14%, ${alpha(edge, 0.4)} 40%, ${alpha(edge, 0.82)} 66%, ${alpha(edge, 1)} 92%)`,
          boxShadow: `inset 0 0 320px 130px ${alpha(edge, 0.92)}`,
        } }
      />

      {/* L2 — 플로팅 컨트롤 (전부 잉크 톤) */}
      {/* 좌상단: 타이틀 */}
      <Box sx={ { position: 'absolute', top: { xs: 20, md: 32 }, left: { xs: 20, md: 36 }, zIndex: 3 } }>
        <Typography
          component="span"
          sx={ { ...monoSx, color: fg, opacity: 0.55, letterSpacing: '0.4em', textTransform: 'uppercase', display: 'block', mb: 1, fontSize: '0.6rem' } }
        >
          Semasiographic Encoder
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
          Heptapod B
        </Typography>
        {/* 타이틀곡 'Heptapod B' 재생 토글 — 타이틀에 묶어 의미·위치 정렬 */}
        <Button
          onClick={ handleToggleMusic }
          variant="text"
          startIcon={ <span style={ { fontSize: '0.7rem' } }>{ isMusicOn ? '❚❚' : '►' }</span> }
          sx={ {
            ...monoSx,
            mt: 1,
            py: 0.4,
            px: 1,
            minWidth: 0,
            color: fg,
            opacity: isMusicOn ? 0.85 : 0.45,
            fontSize: '0.52rem',
            letterSpacing: '0.22em',
            borderRadius: 0,
            border: `1px solid ${alpha(fg, isMusicOn ? 0.4 : 0.18)}`,
            '&:hover': { opacity: 0.95, backgroundColor: alpha(fg, 0.06), borderColor: alpha(fg, 0.55) },
          } }
        >
          { isMusicOn ? 'PLAYING OST' : 'PLAY OST' }
        </Button>
      </Box>

      {/* 깊이 내비 — 상단 중앙, 화살표 하나 (← 한 단계 위로) */}
      { model && !atRoot && (
        <Box
          component="button"
          aria-label="한 단계 위로"
          onClick={ () => setStack((s) => s.slice(0, -1)) }
          sx={ {
            position: 'absolute',
            top: { xs: 16, md: 24 },
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
            top: { xs: 24, md: 36 },
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
          ▸ 로고그램을 클릭하면 하위 단위로 분해
        </Box>
      ) }

      {/* 우상단: 분석 — 미니멀 line 테이블 (컨테이너 배경 없음, 헤어라인만) */}
      { model && (
        <Box
          component="dl"
          sx={ {
            position: 'absolute',
            top: { xs: 20, md: 32 },
            right: { xs: 16, md: 36 },
            zIndex: 3,
            m: 0,
            width: { xs: 168, md: 200 },
          } }
        >
          <FadeTransition direction="down" duration={ 800 }>
            <Box>
              <Box
                sx={ {
                  ...monoSx,
                  color: fg,
                  opacity: 0.55,
                  letterSpacing: '0.32em',
                  textTransform: 'uppercase',
                  fontSize: '0.58rem',
                  pb: 0.75,
                  mb: 0.5,
                  textAlign: 'right',
                  borderBottom: `1px solid ${alpha(fg, 0.38)}`,
                } }
              >
                { showForm ? '형태 설정 (③ 수 → 형태)' : 'Analysis' }
              </Box>
              { panelRows.map(([label, value]) => (
                <Box
                  key={ label }
                  sx={ {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 2,
                    py: 0.7,
                    borderBottom: `1px solid ${alpha(fg, 0.16)}`,
                  } }
                >
                  <Box component="dt" sx={ { ...monoSx, color: fg, opacity: 0.6, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase' } }>
                    { label }
                  </Box>
                  <Box component="dd" sx={ { ...monoSx, color: fg, opacity: 0.95, fontSize: '0.62rem', letterSpacing: '0.06em', m: 0 } }>
                    { value }
                  </Box>
                </Box>
              )) }

              {/* status 하단 — 분석 오버레이 토글 버튼 */}
              <Button
                onClick={ () => setIsAnalysisOn((v) => !v) }
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
                <span>ANALYSIS</span>
                <span>{ isAnalysisOn ? '◼ ON' : '◻ OFF' }</span>
              </Button>

              {/* RAW DATA 모달 — 데스크톱은 화면 오버레이로 대체, 모바일 전용 fallback */}
              <Button
                onClick={ () => setIsRawOpen(true) }
                variant="text"
                fullWidth
                sx={ {
                  ...monoSx,
                  mt: 0.75,
                  py: 0.6,
                  display: { xs: 'flex', md: 'none' },
                  justifyContent: 'space-between',
                  color: fg,
                  opacity: 0.55,
                  fontSize: '0.58rem',
                  letterSpacing: '0.18em',
                  borderRadius: 0,
                  '&:hover': { opacity: 0.9, backgroundColor: alpha(fg, 0.05) },
                } }
              >
                <span>RAW DATA</span>
                <span>자세히 ↗</span>
              </Button>

              {/* 결과 액션 — SAVE / SHARE (결과 있을 때 이 패널에) */}
              <Box sx={ { display: 'flex', gap: 1, mt: 0.75 } }>
                <Button
                  onClick={ handleSavePng }
                  variant="text"
                  sx={ {
                    ...monoSx, flex: 1, py: 0.6, color: fg, opacity: 0.6, fontSize: '0.58rem', letterSpacing: '0.16em', borderRadius: 0, border: `1px solid ${alpha(fg, 0.2)}`, '&:hover': { opacity: 0.95, borderColor: alpha(fg, 0.5) },
                  } }
                >
                  SAVE
                </Button>
                <Button
                  onClick={ handleCopyLink }
                  variant="text"
                  sx={ {
                    ...monoSx, flex: 1, py: 0.6, color: fg, opacity: 0.6, fontSize: '0.58rem', letterSpacing: '0.16em', borderRadius: 0, border: `1px solid ${alpha(fg, 0.2)}`, '&:hover': { opacity: 0.95, borderColor: alpha(fg, 0.5) },
                  } }
                >
                  { isCopied ? 'COPIED' : 'SHARE' }
                </Button>
              </Box>
            </Box>
          </FadeTransition>
        </Box>
      ) }

      {/* 중앙 하단: 대형 underline 입력 + 토글 + 액션 */}
      <Box
        sx={ {
          position: 'absolute',
          left: '50%',
          bottom: { xs: 24, md: 44 },
          transform: 'translateX(-50%)',
          zIndex: 3,
          width: 'min(86vw, 640px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
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
          value={ name }
          onChange={ (event) => setName(event.target.value) }
          onKeyDown={ handleKeyDown }
          placeholder="이름 입력 후 Enter"
          fullWidth
          variant="standard"
          slotProps={ {
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
              inputProps: { 'aria-label': '인코딩할 이름' },
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
          REVERSIBLE ENCODING — THE FORM DECODES BACK TO THE NAME.
        </Typography>
      </Box>

      {/* decode 직전 raw 데이터 모달 — 버킷 → N → 토큰 → 이름 전 과정 */}
      <Dialog
        open={ isRawOpen }
        onClose={ () => setIsRawOpen(false) }
        maxWidth="md"
        fullWidth
        slotProps={ {
          paper: {
            sx: {
              backgroundColor: 'rgba(12,16,15,0.97)',
              backgroundImage: 'none',
              border: `1px solid ${alpha(fg, 0.18)}`,
              borderRadius: 0,
              boxShadow: 'none',
              color: fg,
              maxWidth: 880,
            },
          },
        } }
      >
        { rawData && (
          <Box sx={ { p: { xs: 2.5, sm: 4 } } }>
            {/* 헤더 */}
            <Box sx={ { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 } }>
              <Typography component="span" sx={ { ...monoSx, color: fg, opacity: 0.95, letterSpacing: '0.16em', fontSize: '0.92rem' } }>
                { `"${rawData.name}" 은(는) 어떻게 이 형태가 되었나` }
              </Typography>
              <Box
                component="button"
                onClick={ () => setIsRawOpen(false) }
                sx={ { ...monoSx, background: 'none', border: 'none', cursor: 'pointer', color: fg, opacity: 0.6, fontSize: '0.7rem', '&:hover': { opacity: 1 } } }
              >
                CLOSE ✕
              </Box>
            </Box>
            <Typography component="p" sx={ { ...monoSx, color: fg, opacity: 0.4, fontSize: '0.6rem', letterSpacing: '0.06em', mt: 0, mb: 2.5 } }>
              글자 → 숫자 → 형태 설정 → 그림. 네 단계로 만들어지고, 거꾸로 읽으면 다시 글자가 됩니다.
            </Typography>

            {/* 1~3단계: 가로 흐름 (글자 → 숫자 → 설정) */}
            <Box sx={ { display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'stretch', gap: 1.5, mb: 1.5 } }>
              {/* STEP 1 — 문자 단위 분할 */}
              <StepCard n="1" title="문자 단위 분할 (NFD)" fg={ fg } monoSx={ monoSx }>
                <Box sx={ { display: 'flex', flexWrap: 'wrap', gap: 0.75 } }>
                  { rawData.tokens.map((t, i) => (
                    <Box key={ i } sx={ { border: `1px solid ${alpha(fg, 0.3)}`, px: 1, py: 0.5, textAlign: 'center' } }>
                      <Box sx={ { ...monoSx, fontSize: '1rem', color: fg, opacity: 0.95 } }>{ t.char }</Box>
                      <Box sx={ { ...monoSx, fontSize: '0.55rem', color: fg, opacity: 0.5 } }>{ t.idx }</Box>
                    </Box>
                  )) }
                </Box>
                <StepNote fg={ fg } monoSx={ monoSx }>{ `${rawData.radixK}종 문자에 부여된 고유 번호` }</StepNote>
              </StepCard>

              <FlowArrow fg={ fg } />

              {/* STEP 2 — 위치값 진법 합산 */}
              <StepCard n="2" title="위치값 진법 합산" fg={ fg } monoSx={ monoSx }>
                <Box sx={ { ...monoSx, fontSize: '0.7rem', color: fg, opacity: 0.6, mb: 0.4 } }>{ `N = Σ(번호+1)·${rawData.radixK}ⁱ` }</Box>
                { rawData.tokens.length <= 4 && (
                  <Box sx={ { ...monoSx, fontSize: '0.6rem', color: fg, opacity: 0.45, mb: 0.4, wordBreak: 'break-all' } }>{ `= ${rawData.nExpr}` }</Box>
                ) }
                <Box sx={ { ...monoSx, fontSize: '1rem', color: fg, opacity: 0.95, wordBreak: 'break-all' } }>{ `= ${rawData.n}` }</Box>
                <StepNote fg={ fg } monoSx={ monoSx }>{ `${rawData.bitLength}bit · 손실 없이 되돌릴 수 있음` }</StepNote>
              </StepCard>

              <FlowArrow fg={ fg } />

              {/* STEP 3 — 정수 → 형태 파라미터 */}
              <StepCard n="3" title="정수 → 형태 파라미터" fg={ fg } monoSx={ monoSx }>
                <Box sx={ { ...monoSx, fontSize: '0.55rem', color: fg, opacity: 0.5, mb: 0.5, lineHeight: 1.6 } }>
                  N을 나눗셈으로 자릿수 분해 → 각 자리 = 파라미터 1개
                </Box>
                { [
                  `무게중심 ← ${rawData.fixed[3].value} (${rawData.fixed[3].where})`,
                  ...rawData.clusterCells.map((c) => `덩어리 c${c.index} ← ${c.cell} (가시 ${c.spikeN}, ${c.where.replace(' 폭발', '')})`),
                  `링 굴곡 ← ${rawData.fixed[0].value}`,
                ].map((line, i) => (
                  <Box key={ i } sx={ { ...monoSx, fontSize: '0.6rem', color: fg, opacity: 0.8, lineHeight: 1.8 } }>
                    { `· ${line}` }
                  </Box>
                )) }
              </StepCard>
            </Box>

            {/* STEP 4 — 형태로 그린다 (실제 글리프 + 주석) */}
            <Box sx={ { borderTop: `1px solid ${alpha(fg, 0.2)}`, pt: 2, mt: 1 } }>
              <Typography component="span" sx={ { ...monoSx, color: fg, opacity: 0.55, letterSpacing: '0.1em', fontSize: '0.66rem', display: 'block', mb: 0.5 } }>
                4 · 그림으로 그린다 — 위 설정이 실제 어디에 나타나는지
              </Typography>
              { !rawData.overflow ? (
                <AnnotatedGlyph model={ model } rawData={ rawData } size={ 360 } fg={ fg } monoSx={ monoSx } />
              ) : (
                <Typography component="p" sx={ { ...monoSx, color: fg, opacity: 0.7, fontSize: '0.66rem', textAlign: 'center', py: 4 } }>
                  글자가 너무 길어 형태 용량을 넘었습니다 (복원 불가)
                </Typography>
              ) }
            </Box>

            {/* 가역 결론 */}
            <Box sx={ { mt: 1.5, pt: 1.5, borderTop: `1px solid ${alpha(fg, 0.2)}`, textAlign: 'center' } }>
              <Typography component="p" sx={ { ...monoSx, color: fg, opacity: 0.9, fontSize: '0.7rem', letterSpacing: '0.04em', m: 0 } }>
                { rawData.overflow
                  ? '↺ 이 형태는 되돌릴 수 없습니다'
                  : `↺ 형태를 거꾸로 읽으면 다시 "${rawData.name}"` }
              </Typography>
            </Box>
          </Box>
        ) }
      </Dialog>
    </Box>
  );
}

export default HeptapodEncoderPage;
