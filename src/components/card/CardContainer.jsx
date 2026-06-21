import { forwardRef } from 'react';
import Box from '@mui/material/Box';

/**
 * CardContainer 컴포넌트
 *
 * 자주 사용되는 카드 스타일을 미리 정의한 래퍼 컴포넌트.
 * outlined, elevation, ghost 등 다양한 변형을 지원한다.
 *
 * 동작 방식:
 * 1. variant에 따라 미리 정의된 스타일 적용
 * 2. hover 상태에서 시각적 피드백 제공
 * 3. sx prop으로 추가 커스터마이징 가능
 *
 * Props:
 * @param {string} variant - 카드 스타일 ('outlined' | 'elevation' | 'ghost' | 'filled') [Optional, 기본값: 'outlined']
 * @param {string} padding - 내부 패딩 ('none' | 'sm' | 'md' | 'lg') [Optional, 기본값: 'md']
 * @param {string} radius - 모서리 둥글기 ('none' | 'sm' | 'md' | 'lg') [Optional, 기본값: 'md']
 * @param {boolean} isInteractive - 호버 효과 활성화 [Optional, 기본값: false]
 * @param {boolean} isSelected - 선택 상태 표시 [Optional, 기본값: false]
 * @param {function} onClick - 클릭 핸들러 [Optional]
 * @param {node} children - 카드 내용 [Required]
 * @param {object} sx - 추가 스타일 [Optional]
 *
 * Example usage:
 * <CardContainer variant="elevation" padding="lg" isInteractive>
 *   <Typography>Card Content</Typography>
 * </CardContainer>
 */
const CardContainer = forwardRef(function CardContainer({
  variant = 'outlined',
  padding = 'md',
  radius = 'md',
  isInteractive = false,
  isSelected = false,
  onClick,
  children,
  sx,
  ...props
}, ref) {
  /**
   * 패딩 크기 맵
   */
  const paddingMap = {
    none: 0,
    sm: 2,
    md: 3,
    lg: 4,
  };

  /**
   * Border radius 맵
   */
  const radiusMap = {
    none: 0,
    sm: 1,
    md: 2,
    lg: 3,
  };

  /**
   * variant별 기본 스타일
   */
  const getVariantStyles = () => {
    const base = {
      position: 'relative',
      overflow: 'hidden',
    };

    switch (variant) {
      case 'elevation':
        return {
          ...base,
          backgroundColor: 'background.paper',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)',
        };

      case 'ghost':
        return {
          ...base,
          backgroundColor: 'transparent',
          border: 'none',
        };

      case 'filled':
        return {
          ...base,
          backgroundColor: 'grey.100',
          border: 'none',
        };

      case 'outlined':
      default:
        return {
          ...base,
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        };
    }
  };

  /**
   * 인터랙티브 스타일 (호버, 클릭)
   */
  const getInteractiveStyles = () => {
    if (!isInteractive && !onClick) return {};

    const hoverStyles = {
      outlined: {
        borderColor: 'primary.main',
        boxShadow: '0 0 0 1px rgba(25, 118, 210, 0.2)',
      },
      elevation: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)',
        transform: 'translateY(-2px)',
      },
      ghost: {
        backgroundColor: 'action.hover',
      },
      filled: {
        backgroundColor: 'grey.200',
      },
    };

    return {
      cursor: 'pointer',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': hoverStyles[variant] || hoverStyles.outlined,
      '&:active': {
        transform: 'scale(0.98)',
      },
    };
  };

  /**
   * 선택 상태 스타일
   */
  const getSelectedStyles = () => {
    if (!isSelected) return {};

    return {
      borderColor: 'primary.main',
      boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.3)',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: 'primary.main',
      },
    };
  };

  return (
    <Box
      ref={ref}
      onClick={onClick}
      sx={{
        p: paddingMap[padding] ?? paddingMap.md,
        borderRadius: radiusMap[radius] ?? radiusMap.md,
        ...getVariantStyles(),
        ...getInteractiveStyles(),
        ...getSelectedStyles(),
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
});

export { CardContainer };
