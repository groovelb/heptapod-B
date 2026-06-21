import Box from '@mui/material/Box';

/**
 * SectionContainer
 * 
 * 페이지 내의 각 섹션을 구분하는 컨테이너입니다.
 * 기본적으로 100% 너비를 가지며, 상하 여백(py)을 제공합니다.
 * 
 * @param {node} children - 콘텐츠
 * @param {string} maxWidth - 내부 콘텐츠의 최대 너비 (PageContainer와 유사) [Optional]
 * @param {object} sx - 추가 스타일
 */
export const SectionContainer = ({ children, sx, ...props }) => {
  return (
    <Box
      component="section"
      sx={{
        width: '100%',
        py: { xs: 4, md: 6 }, // 기본 섹션 간격
        ...sx
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

