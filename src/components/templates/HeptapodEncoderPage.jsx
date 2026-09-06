import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useTheme, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import useMediaQuery from '@mui/material/useMediaQuery';
import LanguageSwitcher from '../navigation/LanguageSwitcher';
import { useI18n } from '../../i18n/useI18n.js';

import LogogramChamber from '../motion/LogogramChamber';
import LogogramRendererCanvas from '../motion/LogogramRendererCanvas';
import FadeTransition from '../motion/FadeTransition';
import AnalysisOverlay from '../overlay-feedback/AnalysisOverlay';
import PublishDialog from '../overlay-feedback/PublishDialog';
import { usePublish } from '../../hooks/data/usePublish';
import { buildArchiveModel } from '../../utils/heptapod/archiveGlyph';
import { shareArchive } from '../../utils/heptapod/shareArchive';
import { buildModelReversible, inspect } from '../../utils/heptapod/reversibleModel';
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
  const previewModel = last ? safeArchiveModel(last) : null;
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
  const { localize, t } = useI18n();
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
              { t('heptapodEncoderPage.weightCenter', { p0: localize(rawData.fixed[3].where) }) }
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
            <text x={ lx } y={ ly } fill={ fg } fillOpacity={ 0.6 } textAnchor={ anchor } dominantBaseline="middle" style={ { fontFamily: monoFont, fontSize: fs } }>{ t('heptapodEncoderPage.gap') }</text>
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
              { t('heptapodEncoderPage.clusterC', { p0: i, p1: cell.cell }) }
            </text>
            <text x={ lx + (anchor === 'start' ? 5 : -5) } y={ ly + fs * 0.6 } fill={ fg } fillOpacity={ 0.6 } textAnchor={ anchor } dominantBaseline="middle" style={ { fontFamily: monoFont, fontSize: fs * 0.85 } }>
              { t('heptapodEncoderPage.spikes', { p0: localize(c.type), p1: cell.spikeN, p2: localize(cell.dir) }) }
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
 *    대형 underline 입력(중앙 하단), 분석·공개·공유 액션(우상단)
 *
 * 동작 흐름은 이전과 동일: URL 재현 → ENCODE 확정 시 모델 재생성 →
 * 형성 중 ANALYSIS 비활성 → INTERROGATIVE 분리 시드 → 동의 후 공개·공유.
 *
 * Props: audioActive, client(선택적 공개 transport), initialName(선택적 초기 v2 이름).
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
function HeptapodEncoderPage({ audioActive = true, client, initialName }) {
  const { locale, localize, t } = useI18n();
  const theme = useTheme();
  const isMobileAnalysis = useMediaQuery(theme.breakpoints.down('md'));
  const { publish } = usePublish({ client });
  const monoSx = theme.typography.custom?.mono || MONO_FALLBACK;

  // name(입력 중) / encodedName(확정) 분리 — ENCODE 실행 시에만 모델 재생성
  const [name, setName] = useState(() => initialName ?? readNameFromUrl());
  const [encodedName, setEncodedName] = useState(() => initialName ?? readNameFromUrl());
  const [encoderVersion, setEncoderVersion] = useState(() => initialName !== undefined ? 2 : readEncoderVersionFromUrl());
  const [inputError, setInputError] = useState('');
  const [published, setPublished] = useState(null);
  const [publishIntent, setPublishIntent] = useState(null);
  const [shareStatus, setShareStatus] = useState('');
  const [shareError, setShareError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [isAnalysisOn, setIsAnalysisOn] = useState(false);
  const [formedModel, setFormedModel] = useState(null);
  const [renderConfig, setRenderConfig] = useState(() => detectRenderTier());
  const [stageMin, setStageMin] = useState(0);

  const stageRef = useRef(null);
  const sharePending = useRef(false);
  const composingRef = useRef(false);
  const audioRef = useRef(null);
  const musicRef = useRef(null);
  const [isMusicOn, setIsMusicOn] = useState(MUSIC_AUTOPLAY); // 기본 재생 여부는 env로
  // 배경 안개 Z-dive 트리거 — 값이 바뀔 때마다 챔버가 "안개 속으로 파고드는"
  // 가속 진입 애니메이션을 1회 재생한다 (글리프 아님 — 배경 전용).
  const [diveKey, setDiveKey] = useState(0);

  /** Legacy links preserve their old model; new encodes use the canonical v2 contract. */
  const model = useMemo(
    () => (encodedName.trim() ? (encoderVersion === 1 ? buildModelReversible(encodedName) : safeArchiveModel(encodedName)) : null),
    [encodedName, encoderVersion],
  );

  /** decode 직전 raw 추적 데이터 (자세히 보기 모달) */
  const [isRawOpen, setIsRawOpen] = useState(false);
  const rawData = useMemo(() => (model?.meta.reversible ? inspect(model) : null), [model]);
  const handleToggleAnalysis = () => {
    const next = !isAnalysisOn;
    setIsAnalysisOn(next);
    if (isMobileAnalysis && rawData) setIsRawOpen(next);
  };
  const handleCloseRaw = () => {
    setIsRawOpen(false);
    if (isMobileAnalysis) setIsAnalysisOn(false);
  };

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
      model: safeArchiveModel(txt),
      splittable: splitText(txt).length > 0,
    })).filter((node) => node.model),
    [currentText],
  );
  const canSplitRoot = splitText(rootCore).length > 0;
  const atRoot = stack.length === 0;
  // 타이핑 중 — 입력이 확정 인코딩과 다를 때 (라이브 프리뷰 표시)
  const hasDraft = name.trim() !== encodedName;
  const isTyping = atRoot && name.trim().length > 0 && hasDraft;

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

  // Resize this page's available space when a mobile keyboard covers the viewport.
  useEffect(() => {
    const viewport = window.visualViewport;
    const page = stageRef.current?.closest('[data-encoder-result]');
    if (!viewport || !page) return undefined;
    const resize = () => {
      const obscured = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      page.style.setProperty('--kb-offset', obscured > 80 ? `${Math.round(obscured)}px` : '0px');
    };
    resize();
    viewport.addEventListener('resize', resize);
    return () => {
      viewport.removeEventListener('resize', resize);
      page.style.removeProperty('--kb-offset');
    };
  }, []);

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
    if (!trimmed || composingRef.current || publishIntent || sharePending.current) return;
    try { buildArchiveModel(trimmed); }
    catch (error) { setInputError(error.message); return; }
    setInputError('');
    setShareError('');
    setShareStatus('');
    if (trimmed === encodedName && encoderVersion === 2) return;
    setEncoderVersion(2);
    setPublished(null);
    setStack([]);
    setIsRawOpen(false);
    audioRef.current?.encodeStart();
    if (!reducedMotion) setDiveKey((key) => key + 1);
    setEncodedName(trimmed);
    setName(trimmed);
  }, [name, encodedName, encoderVersion, reducedMotion, publishIntent]);

  const handleKeyDown = useCallback((event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (!event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229 && !composingRef.current) handleEncode();
  }, [handleEncode]);

  // Called on a fresh user click, including the post-publication Share button.
  const handleShare = useCallback(async (result = published) => {
    if (!model || encoderVersion !== 2 || sharePending.current) return null;
    if (!result?.glyphId) { setPublishIntent('share'); return null; }
    sharePending.current = true;
    setSharing(true);
    setShareError('');
    setShareStatus('');
    try {
      const status = await shareArchive({ left: {
        id: result.glyphId, canonical_name: model.meta.canonicalName, is_interrogative: Boolean(model.questionHook),
      } }, { locale });
      setShareStatus(status);
      return status;
    } catch (error) {
      setShareError(error.message || t('encoderResult.shareFailed'));
      throw error;
    } finally {
      sharePending.current = false;
      setSharing(false);
    }
  }, [model, encoderVersion, published, locale, t]);

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
  // 개별 클러스터 설명은 기존 콜아웃·좌측 분석·RAW DATA에서 확인한다.
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
          } }
        >
          {/* 확정 인코딩 — 루트 단일 (클릭 시 분해) */}
          { model && stageMin > 0 && atRoot && (
            <Box
              role={ canSplitRoot ? 'button' : 'img' }
              tabIndex={ canSplitRoot ? 0 : undefined }
              aria-label={ t('encoderResult.glyphForName', { name: encodedName }) }
              onKeyDown={ (event) => {
                if (canSplitRoot && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  setStack([rootCore]);
                  audioRef.current?.encodeStart();
                  triggerRush();
                }
              } }
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
              { t('heptapodEncoderPage.awaitingInput') }
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
          <StepRow n="1" title={ t('heptapodEncoderPage.splitIntoCharacterUnitsNfd') } fg={ fg } monoSx={ monoSx } first>
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
          <StepRow n="2" title={ t('heptapodEncoderPage.combinePositionalValues') } fg={ fg } monoSx={ monoSx }>
            <Box sx={ { ...monoSx, fontSize: '0.52rem', color: fg, opacity: 0.55, lineHeight: 1.7, mb: 0.4 } }>
              { t('heptapodEncoderPage.nCharacterCode1', { p0: rawData.radixK }) }
            </Box>
            { rawData.tokens.length <= 4 && (
              <Box sx={ { ...monoSx, fontSize: '0.5rem', color: fg, opacity: 0.4, lineHeight: 1.7, mb: 0.4, wordBreak: 'break-all' } }>
                { `= ${rawData.nExpr}` }
              </Box>
            ) }
            <Box sx={ { ...monoSx, fontSize: '0.78rem', color: fg, opacity: 0.95, wordBreak: 'break-all' } }>{ `= ${rawData.n}` }</Box>
            <Box sx={ { ...monoSx, fontSize: '0.5rem', color: fg, opacity: 0.4, mt: 0.3 } }>{ t('heptapodEncoderPage.baseLosslessRecovery', { p0: rawData.radixK }) }</Box>
          </StepRow>

          {/* ③ 정수 → 형태 파라미터 */}
          <StepRow n="3" title={ t('heptapodEncoderPage.integerFormParameters') } fg={ fg } monoSx={ monoSx }>
            <Box sx={ { ...monoSx, fontSize: '0.52rem', color: fg, opacity: 0.55, lineHeight: 1.7, mb: 0.5 } }>
              { t('heptapodEncoderPage.divideNIntoDigitsEachDigitBecomes') }
            </Box>
            { [
              t('heptapodEncoderPage.weightCenter3', { p0: rawData.fixed[3].value }),
              ...rawData.clusterCells.map((c) => t('heptapodEncoderPage.clusterCSpikes', { p0: c.index, p1: c.cell, p2: c.spikeN })),
              t('heptapodEncoderPage.ringCurvature', { p0: rawData.fixed[0].value }),
            ].map((line, i) => (
              <Box key={ i } sx={ { ...monoSx, fontSize: '0.54rem', color: fg, opacity: 0.8, lineHeight: 1.75 } }>{ line }</Box>
            )) }
            <Box sx={ { ...monoSx, fontSize: '0.5rem', color: '#3ad16b', opacity: 0.8, mt: 0.5 } }>
              { t('heptapodEncoderPage.seeTheRightPanelAndCentralImage') }
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
            { t('heptapodEncoderPage.charactersNumberForm') }
          </Typography>
          <Typography component="p" sx={ { ...monoSx, color: fg, opacity: 0.85, fontSize: '0.66rem', letterSpacing: '0.04em', m: 0 } }>
            { t('heptapodEncoderPage.readTheFormInReverseToRecover', { p0: rawData.name }) }
          </Typography>
        </Box>
      ) }

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

      <LanguageSwitcher sx={ { position: 'absolute', top: { xs: 12, md: 20 }, right: { xs: 12, md: 28 }, zIndex: 4, color: fg } } />

      {/* L2 — 플로팅 컨트롤 (전부 잉크 톤) */}
      {/* 좌상단: 타이틀 */}
      <Box sx={ { position: 'absolute', top: { xs: 20, md: 32 }, left: { xs: 20, md: 36 }, zIndex: 3 } }>
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
        {/* 타이틀곡 'Heptapod B' 재생 토글 — 타이틀에 묶어 의미·위치 정렬 */}
        <Button
          onClick={ handleToggleMusic }
          aria-pressed={ isMusicOn }
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
          { isMusicOn ? t('heptapodEncoderPage.playingOst') : t('heptapodEncoderPage.playOst') }
        </Button>
      </Box>

      {/* 깊이 내비 — 상단 중앙, 화살표 하나 (← 한 단계 위로) */}
      { model && !atRoot && (
        <Box
          component="button"
          aria-label={ t('heptapodEncoderPage.oneLevelUp') }
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
            top: { xs: 84, md: 84 },
            right: { xs: 16, md: 36 },
            zIndex: 3,
            m: 0,
            width: { xs: 148, md: 200 },
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
                    ...monoSx, py: 0.6, color: fg, opacity: 0.7, fontSize: '0.58rem', letterSpacing: '0.18em', borderRadius: 0, border: `1px solid ${alpha(fg, 0.28)}`, '&:hover': { opacity: 0.95, backgroundColor: alpha(fg, 0.06), borderColor: alpha(fg, 0.5) },
                  } }
                >
                  { t(encoderVersion === 1 ? 'encoderResult.recreate' : sharing ? 'encoderResult.sharing' : published ? 'encoderResult.share' : 'heptapodEncoderPage.publishAndShare') }
                </Button>
              </Box>
              <Box role="status" aria-live="polite" sx={ { ...monoSx, color: fg, fontSize: '0.6rem', mt: shareStatus || shareError ? 1 : 0 } }>
                { shareError ? localize(shareError) : shareStatus ? t(`encoderResult.${shareStatus}`) : '' }
              </Box>
              <Button
                component={ RouterLink }
                to="/archive"
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
            htmlInput: { 'aria-label': t('heptapodEncoderPage.nameToEncode'), enterKeyHint: 'go', autoComplete: 'off' },
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
        glyphName={ encodedName } model={ model } onShare={ handleShare }
        onPublish={ async ({ consented }) => {
          if (!model || !encodedName || encoderVersion !== 2) throw new Error(t('heptapodEncoderPage.createAV2GlyphFirst'));
          if (published?.glyphId) return published;
          const result = await publish({ displayName: encodedName, contextTags: [], consented });
          setPublished(result);
          return result;
        } } />
      {/* 모바일 ANALYSIS의 상세 보기 — 별도 RAW DATA 버튼 없이 같은 분석 진입 사용 */}
      <Dialog
        open={ isRawOpen }
        onClose={ handleCloseRaw }
        maxWidth="md"
        fullWidth
        slotProps={ {
          paper: {
            sx: {
              backgroundColor: 'rgba(12,16,15,0.97)',
              backgroundImage: 'none',
              border: `1px solid ${alpha('#ffffff', 0.18)}`,
              borderRadius: 0,
              boxShadow: 'none',
              color: '#ffffff',
              maxWidth: 880,
            },
          },
        } }
      >
        { rawData && (
          <Box sx={ { p: { xs: 2.5, sm: 4 } } }>
            {/* 헤더 */}
            <Box sx={ { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 } }>
              <Typography component="span" sx={ { ...monoSx, color: '#ffffff', opacity: 0.95, letterSpacing: '0.16em', fontSize: '0.92rem' } }>
                { t('heptapodEncoderPage.howBecameThisForm', { p0: rawData.name }) }
              </Typography>
              <Box
                component="button"
                onClick={ handleCloseRaw }
                sx={ { ...monoSx, background: 'none', border: 'none', cursor: 'pointer', color: '#ffffff', opacity: 0.6, fontSize: '0.7rem', '&:hover': { opacity: 1 } } }
              >
                { t('heptapodEncoderPage.close') }
              </Box>
            </Box>
            <Typography component="p" sx={ { ...monoSx, color: '#ffffff', opacity: 0.4, fontSize: '0.6rem', letterSpacing: '0.06em', mt: 0, mb: 2.5 } }>
              { t('heptapodEncoderPage.charactersNumbersFormSettingsDrawingFourSteps') }
            </Typography>

            {/* 1~3단계: 가로 흐름 (글자 → 숫자 → 설정) */}
            <Box sx={ { display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'stretch', gap: 1.5, mb: 1.5 } }>
              {/* STEP 1 — 문자 단위 분할 */}
              <StepCard n="1" title={ t('heptapodEncoderPage.splitIntoCharacterUnitsNfd') } fg={ '#ffffff' } monoSx={ monoSx }>
                <Box sx={ { display: 'flex', flexWrap: 'wrap', gap: 0.75 } }>
                  { rawData.tokens.map((t, i) => (
                    <Box key={ i } sx={ { border: `1px solid ${alpha('#ffffff', 0.3)}`, px: 1, py: 0.5, textAlign: 'center' } }>
                      <Box sx={ { ...monoSx, fontSize: '1rem', color: '#ffffff', opacity: 0.95 } }>{ t.char }</Box>
                      <Box sx={ { ...monoSx, fontSize: '0.55rem', color: '#ffffff', opacity: 0.5 } }>{ t.idx }</Box>
                    </Box>
                  )) }
                </Box>
                <StepNote fg={ '#ffffff' } monoSx={ monoSx }>{ t('heptapodEncoderPage.uniqueCodesAssignedToCharacters', { p0: rawData.radixK }) }</StepNote>
              </StepCard>

              <FlowArrow fg={ '#ffffff' } />

              {/* STEP 2 — 위치값 진법 합산 */}
              <StepCard n="2" title={ t('heptapodEncoderPage.combinePositionalValues') } fg={ '#ffffff' } monoSx={ monoSx }>
                <Box sx={ { ...monoSx, fontSize: '0.7rem', color: '#ffffff', opacity: 0.6, mb: 0.4 } }>{ t('heptapodEncoderPage.nCode1', { p0: rawData.radixK }) }</Box>
                { rawData.tokens.length <= 4 && (
                  <Box sx={ { ...monoSx, fontSize: '0.6rem', color: '#ffffff', opacity: 0.45, mb: 0.4, wordBreak: 'break-all' } }>{ `= ${rawData.nExpr}` }</Box>
                ) }
                <Box sx={ { ...monoSx, fontSize: '1rem', color: '#ffffff', opacity: 0.95, wordBreak: 'break-all' } }>{ `= ${rawData.n}` }</Box>
                <StepNote fg={ '#ffffff' } monoSx={ monoSx }>{ t('heptapodEncoderPage.bitsLosslessRecovery', { p0: rawData.bitLength }) }</StepNote>
              </StepCard>

              <FlowArrow fg={ '#ffffff' } />

              {/* STEP 3 — 정수 → 형태 파라미터 */}
              <StepCard n="3" title={ t('heptapodEncoderPage.integerFormParameters') } fg={ '#ffffff' } monoSx={ monoSx }>
                <Box sx={ { ...monoSx, fontSize: '0.55rem', color: '#ffffff', opacity: 0.5, mb: 0.5, lineHeight: 1.6 } }>
                  { t('heptapodEncoderPage.divideNIntoDigitsEachDigitBecomes2') }
                </Box>
                { [
                  t('heptapodEncoderPage.weightCenter4', { p0: rawData.fixed[3].value, p1: localize(rawData.fixed[3].where) }),
                  ...rawData.clusterCells.map((c) => t('heptapodEncoderPage.clusterCSpikes2', { p0: c.index, p1: c.cell, p2: c.spikeN, p3: localize(c.where.replace(' 폭발', '')) })),
                  t('heptapodEncoderPage.ringCurvature2', { p0: rawData.fixed[0].value }),
                ].map((line, i) => (
                  <Box key={ i } sx={ { ...monoSx, fontSize: '0.6rem', color: '#ffffff', opacity: 0.8, lineHeight: 1.8 } }>
                    { `· ${line}` }
                  </Box>
                )) }
              </StepCard>
            </Box>

            {/* STEP 4 — 형태로 그린다 (실제 글리프 + 주석) */}
            <Box sx={ { borderTop: `1px solid ${alpha('#ffffff', 0.2)}`, pt: 2, mt: 1 } }>
              <Typography component="span" sx={ { ...monoSx, color: '#ffffff', opacity: 0.55, letterSpacing: '0.1em', fontSize: '0.66rem', display: 'block', mb: 0.5 } }>
                { t('heptapodEncoderPage.4DrawTheFormWhereTheSettings') }
              </Typography>
              { !rawData.overflow ? (
                <AnnotatedGlyph model={ model } rawData={ rawData } size={ 360 } fg={ '#ffffff' } monoSx={ monoSx } />
              ) : (
                <Typography component="p" sx={ { ...monoSx, color: '#ffffff', opacity: 0.7, fontSize: '0.66rem', textAlign: 'center', py: 4 } }>
                  { t('heptapodEncoderPage.theTextExceedsTheFormSCapacity') }
                </Typography>
              ) }
            </Box>

            {/* 가역 결론 */}
            <Box sx={ { mt: 1.5, pt: 1.5, borderTop: `1px solid ${alpha('#ffffff', 0.2)}`, textAlign: 'center' } }>
              <Typography component="p" sx={ { ...monoSx, color: '#ffffff', opacity: 0.9, fontSize: '0.7rem', letterSpacing: '0.04em', m: 0 } }>
                { rawData.overflow
                  ? t('heptapodEncoderPage.thisFormCannotBeReversed')
                  : t('heptapodEncoderPage.readTheFormInReverseToRecover', { p0: rawData.name }) }
              </Typography>
            </Box>
          </Box>
        ) }
      </Dialog>
    </Box>
  );
}

export default HeptapodEncoderPage;
