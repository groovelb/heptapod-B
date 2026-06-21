import { forwardRef } from 'react';
import Box from '@mui/material/Box';
import { CardContainer } from './CardContainer';

/**
 * CustomCard 컴포넌트
 *
 * 미디어 영역과 콘텐츠 영역으로 구성된 커스텀 카드 컴포넌트.
 * 다양한 레이아웃(vertical, horizontal, overlay)을 지원한다.
 *
 * 동작 방식:
 * 1. layout에 따라 미디어와 콘텐츠 배치 결정
 * 2. 미디어 영역은 이미지, 비디오 등 시각적 콘텐츠 표시
 * 3. 콘텐츠 영역은 텍스트, 버튼 등 정보 표시
 * 4. overlaySlot을 통해 미디어 위에 액션 버튼, 배지 등 오버레이 가능
 *
 * Props:
 * @param {string} layout - 레이아웃 타입 ('vertical' | 'horizontal' | 'overlay') [Optional, 기본값: 'vertical']
 * @param {string} mediaPosition - 미디어 위치 ('start' | 'end') [Optional, 기본값: 'start']
 * @param {string} mediaRatio - 미디어 영역 비율 ('1/1' | '4/3' | '16/9' | '21/9' | 'auto') [Optional, 기본값: '16/9']
 * @param {string} mediaSrc - 미디어 소스 URL [Optional]
 * @param {string} mediaAlt - 미디어 대체 텍스트 [Optional, 기본값: '']
 * @param {node} mediaSlot - 커스텀 미디어 요소 (mediaSrc보다 우선) [Optional]
 * @param {node} overlaySlot - 미디어 영역 위에 표시할 오버레이 요소 (액션 버튼, 배지 등) [Optional]
 * @param {node} children - 콘텐츠 영역 내용 [Optional]
 * @param {string} contentPadding - 콘텐츠 패딩 ('none' | 'sm' | 'md' | 'lg') [Optional, 기본값: 'md']
 * @param {string} contentAlign - 콘텐츠 정렬 ('start' | 'center' | 'end') [Optional, 기본값: 'start']
 * @param {boolean} isInteractive - 호버 효과 [Optional, 기본값: false]
 * @param {function} onClick - 클릭 핸들러 [Optional]
 * @param {object} sx - 추가 스타일 [Optional]
 *
 * Example usage:
 * <CustomCard
 *   layout="horizontal"
 *   mediaSrc="/image.jpg"
 *   mediaRatio="4/3"
 *   overlaySlot={<ActionButtons />}
 * >
 *   <Typography variant="h6">Title</Typography>
 *   <Typography>Description</Typography>
 * </CustomCard>
 */
const CustomCard = forwardRef(function CustomCard({
  layout = 'vertical',
  mediaPosition = 'start',
  mediaRatio = '16/9',
  mediaSrc,
  mediaAlt = '',
  mediaSlot,
  overlaySlot,
  children,
  contentPadding = 'md',
  contentAlign = 'start',
  isInteractive = false,
  onClick,
  sx,
  ...props
}, ref) {
  /**
   * 패딩 맵
   */
  const paddingMap = {
    none: 0,
    sm: 2,
    md: 3,
    lg: 4,
  };

  /**
   * 정렬 맵
   */
  const alignMap = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
  };

  /**
   * 레이아웃별 컨테이너 스타일
   */
  const getLayoutStyles = () => {
    switch (layout) {
      case 'horizontal':
        return {
          display: 'flex',
          flexDirection: mediaPosition === 'end' ? 'row-reverse' : 'row',
        };

      case 'overlay':
        return {
          position: 'relative',
        };

      case 'vertical':
      default:
        return {
          display: 'flex',
          flexDirection: mediaPosition === 'end' ? 'column-reverse' : 'column',
        };
    }
  };

  /**
   * 미디어 영역 스타일
   * - 'auto' ratio: 원본 이미지 비율 유지 (aspectRatio 미적용)
   */
  const getMediaStyles = () => {
    const base = {
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: 'grey.200',
    };

    if (layout === 'horizontal') {
      return {
        ...base,
        width: '40%',
        flexShrink: 0,
        ...(mediaRatio !== 'auto' && { aspectRatio: mediaRatio }),
      };
    }

    if (layout === 'overlay') {
      return {
        ...base,
        position: 'absolute',
        inset: 0,
        aspectRatio: 'unset',
      };
    }

    return {
      ...base,
      width: '100%',
      ...(mediaRatio !== 'auto' && { aspectRatio: mediaRatio }),
    };
  };

  /**
   * 콘텐츠 영역 스타일
   */
  const getContentStyles = () => {
    const base = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: alignMap[contentAlign],
      p: paddingMap[contentPadding],
    };

    if (layout === 'horizontal') {
      return {
        ...base,
        flex: 1,
        justifyContent: 'center',
      };
    }

    if (layout === 'overlay') {
      return {
        ...base,
        position: 'relative',
        zIndex: 1,
        minHeight: 200,
        justifyContent: 'flex-end',
        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
        color: 'common.white',
      };
    }

    return base;
  };

  /**
   * 미디어 렌더링
   * - mediaSlot: 커스텀 미디어 요소 (우선)
   * - mediaSrc: 이미지 URL
   * - overlaySlot: 미디어 위 오버레이 요소 (액션 버튼, 배지 등)
   */
  const renderMedia = () => {
    const hasMedia = mediaSlot || mediaSrc;
    if (!hasMedia && !overlaySlot) return null;

    // 이미지 스타일 (auto ratio: 원본 비율 유지)
    const imgStyles = mediaRatio === 'auto'
      ? {
          display: 'block',
          width: '100%',
          height: 'auto',
          objectFit: 'cover',
          transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }
      : {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        };

    return (
      <Box className="custom-card-media" sx={getMediaStyles()}>
        {/* 커스텀 미디어 슬롯 (우선) */}
        {mediaSlot}

        {/* 기본 이미지 렌더링 */}
        {!mediaSlot && mediaSrc && (
          <Box
            component="img"
            src={mediaSrc}
            alt={mediaAlt}
            sx={imgStyles}
          />
        )}

        {/* 오버레이 슬롯 (액션 버튼, 배지 등) */}
        {overlaySlot}
      </Box>
    );
  };

  return (
    <CardContainer
      ref={ref}
      variant="outlined"
      padding="none"
      radius="md"
      onClick={onClick}
      isInteractive={isInteractive}
      sx={{
        ...getLayoutStyles(),
        ...sx,
      }}
      {...props}
    >
      {renderMedia()}
      {children && (
        <Box sx={getContentStyles()}>
          {children}
        </Box>
      )}
    </CardContainer>
  );
});

export { CustomCard };
