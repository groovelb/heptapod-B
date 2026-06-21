import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import ScrambleText from '../kinetic-typography/ScrambleText';

/** 12슬롯 인덱스 (0~11 고정) */
const SLOT_INDICES = Array.from({ length: 12 }, (_, i) => i);

/** 모노스페이스 토큰 폴백 — theme.typography.custom?.mono 미정의 환경 대비 */
const MONO_FALLBACK = {
  fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
  fontSize: '0.75rem',
  lineHeight: 1.5,
  letterSpacing: '0.05em',
};

/** radian → degree (소수 1자리) */
function toDegrees(rad) {
  if (typeof rad !== 'number' || Number.isNaN(rad)) return '0.0';
  const deg = (rad * 180) / Math.PI;
  return (((deg % 360) + 360) % 360).toFixed(1);
}

/**
 * ReadoutRow — 라벨-값 한 행. 값은 변경 시 스크램블 전환(reduced-motion이면 정적).
 * 모듈 스코프에 선언해 매 렌더 재생성을 막고 ScrambleText 상태를 보존한다.
 *
 * @param {string} label - 라벨 텍스트 (영문 대문자 표기) [Required]
 * @param {string|number} value - 표시값 [Required]
 * @param {object} monoSx - 모노스페이스 타이포 토큰 [Required]
 * @param {boolean} reducedMotion - 스크램블 전환 비활성 여부 [Required]
 */
function ReadoutRow({ label, value, monoSx, reducedMotion }) {
  return (
    <Box
      sx={ {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 2,
        py: 0.75,
        borderBottom: '1px solid',
        borderColor: 'divider',
      } }
    >
      <Box
        component="span"
        sx={ {
          ...monoSx,
          color: 'text.secondary',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        } }
      >
        { label }
      </Box>
      <ScrambleText
        text={ String(value) }
        isTrigger={ !reducedMotion }
        duration={ 500 }
        charset="0123456789ABCDEF"
        sx={ {
          ...monoSx,
          color: 'text.primary',
          textAlign: 'right',
        } }
      />
    </Box>
  );
}

/**
 * DataReadout 컴포넌트
 *
 * 군사 과학 연구 장비의 분석 패널 톤을 가진 모노스페이스 데이터 리드아웃.
 * LogogramModel에서 파생된 표시값(시드·NFD 유닛 수·활성 세그먼트·무게중심·12슬롯 상태)을
 * 좁은 라벨-값 그리드로 절제되게 표시한다. UI는 로고그램의 들러리이므로 작고 차갑게.
 *
 * 값 전환 연출:
 * - model이 바뀌면 ScrambleText가 값을 스크램블 전환한다 (연구 장비 톤)
 * - reducedMotion(renderConfig.reducedMotion) 시 스크램블 비활성, 즉시 확정값 표시
 *
 * Props:
 * @param {object} model - LogogramModel (meta/ring/slots/branches…) [Required]
 * @param {object} renderConfig - 렌더 설정 ({ tier, reducedMotion, reasons }) [Optional]
 * @param {boolean} isCollapsed - 접힌 상태 — 12슬롯 시각화와 타입 시퀀스 생략 [Optional, 기본값: false]
 * @param {object} sx - 추가 스타일 오버라이드 [Optional]
 *
 * Example usage:
 * const model = buildModel(encode('김민준'));
 * <DataReadout model={model} renderConfig={{ tier: 'svg', reducedMotion: false }} />
 * <DataReadout model={model} isCollapsed />
 */
function DataReadout({
  model,
  renderConfig = {},
  isCollapsed = false,
  sx = {},
}) {
  const theme = useTheme();
  const monoSx = theme.typography?.custom?.mono || MONO_FALLBACK;
  const reducedMotion = !!renderConfig.reducedMotion;

  if (!model || !model.meta || !model.ring) return null;

  const { meta, ring, slots = [], branches = [] } = model;
  const activeSegments = slots.filter((s) => s && s.active).length;
  const weightDeg = toDegrees(ring.weightCenterAngle);
  const tier = renderConfig.tier;

  return (
    <Box
      sx={ {
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        p: 2,
        width: '100%',
        maxWidth: 280,
        boxShadow: 'none',
        ...sx,
      } }
    >
      {/* 헤더 — 패널 식별 라벨 */}
      <Box
        sx={ {
          ...monoSx,
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          pb: 1,
          mb: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        } }
      >
        READOUT
      </Box>

      <ReadoutRow label="Seed Hash" value={ meta.hashHex } monoSx={ monoSx } reducedMotion={ reducedMotion } />
      <ReadoutRow label="NFD Units" value={ meta.nfdCount } monoSx={ monoSx } reducedMotion={ reducedMotion } />
      <ReadoutRow label="Active Segments" value={ activeSegments } monoSx={ monoSx } reducedMotion={ reducedMotion } />
      <ReadoutRow label="Weight Center" value={ `${weightDeg}°` } monoSx={ monoSx } reducedMotion={ reducedMotion } />
      { tier && (
        <ReadoutRow label="Render Tier" value={ String(tier).toUpperCase() } monoSx={ monoSx } reducedMotion={ reducedMotion } />
      ) }

      {/* 12슬롯 상태 — ■ 활성 / □ 비활성 (접힘 시 생략) */}
      { !isCollapsed && (
        <Box sx={ { pt: 1.5 } }>
          <Box
            component="span"
            sx={ {
              ...monoSx,
              color: 'text.secondary',
              textTransform: 'uppercase',
              display: 'block',
              mb: 0.75,
            } }
          >
            Slot States
          </Box>
          <Box
            sx={ {
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: 0.25,
            } }
          >
            { SLOT_INDICES.map((i) => {
              const slot = slots[i];
              const active = !!(slot && slot.active);
              return (
                <Box
                  key={ i }
                  component="span"
                  title={ `slot ${i}: ${active ? 'active' : 'inactive'}` }
                  sx={ {
                    ...monoSx,
                    textAlign: 'center',
                    color: active ? 'text.primary' : 'text.disabled',
                    lineHeight: 1.2,
                  } }
                >
                  { active ? '■' : '□' }
                </Box>
              );
            }) }
          </Box>
        </Box>
      ) }

      {/* 가지 타입 시퀀스 — 분석 보조 (접힘 시 생략) */}
      { !isCollapsed && branches.length > 0 && (
        <Box sx={ { pt: 1.5 } }>
          <Box
            component="span"
            sx={ {
              ...monoSx,
              color: 'text.secondary',
              textTransform: 'uppercase',
              display: 'block',
              mb: 0.5,
            } }
          >
            Type Codes
          </Box>
          <Box
            component="span"
            sx={ {
              ...monoSx,
              color: 'text.primary',
              wordBreak: 'break-word',
            } }
          >
            { branches.map((b) => (b.type || '').slice(0, 4).toUpperCase()).join(' ') }
          </Box>
        </Box>
      ) }
    </Box>
  );
}

export default DataReadout;
