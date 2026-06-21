import Container from '@mui/material/Container';

/**
 * PageContainer
 * 
 * 페이지의 메인 콘텐츠를 감싸는 컨테이너입니다.
 * xl(1536px) 이하에서는 반응형 좌우 패딩이 적용되며, 화면 중앙에 정렬됩니다.
 * 
 * @param {node} children - 콘텐츠
 * @param {string|bool} maxWidth - 최대 너비 (xs, sm, md, lg, xl, false) [Default: 'xl']
 * @param {boolean} disableGutters - 좌우 패딩 비활성화 여부 [Default: false]
 * @param {object} sx - 추가 스타일
 */
export const PageContainer = ({ 
  children, 
  maxWidth = 'xl', 
  disableGutters = false,
  sx, 
  ...props 
}) => {
  return (
    <Container
      maxWidth={maxWidth}
      disableGutters={disableGutters}
      sx={{
        // MUI Container 기본 동작 + 추가 커스텀
        // disableGutters가 false일 때(기본값) MUI가 자동으로 px를 주지만,
        // 명시적으로 요구사항에 맞게 오버라이드 할 수 있음.
        // 여기서는 MUI 기본값을 존중하되 필요한 경우 sx로 덮어쓰기 가능하도록 함.
        ...sx
      }}
      {...props}
    >
      {children}
    </Container>
  );
};

