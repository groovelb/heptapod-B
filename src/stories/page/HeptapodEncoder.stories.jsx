import HeptapodEncoderPage from '../../components/templates/HeptapodEncoderPage';

export default {
  title: 'Page/HeptapodEncoder',
  component: HeptapodEncoderPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## Heptapod B Encoder — 메인 인코더 페이지

이름 입력부터 로고그램 출력까지 전체 경험을 잇는 풀 페이지 템플릿입니다.

### 구성 (단일 컬럼 중앙 정렬, 위 → 아래)
- **헤더**: 절제된 h1 타이틀 (와이드 트래킹) + 서브카피 한 줄
- **챔버**: 안개 낀 서리 유리 무대 위에 렌더러 + 분석 오버레이 중첩
- **입력 컨트롤**: 이름 TextField(모노스페이스) + ENCODE (빈 입력 비활성, Enter 지원)
- **토글**: ANALYSIS(형성 중 비활성) / INTERROGATIVE(분리 시드 — 본체 불변)
- **데이터 리드아웃**: 시드·NFD·슬롯 상태 모노스페이스 패널
- **액션**: SAVE PNG(고해상 SVG 직렬화 추출) / COPY LINK(?name= URL 복사)
- **정직한 푸터**: 번역이 아니라 결정론적 인코딩임을 명시

### 동작
- 렌더러는 detectRenderTier() 결과로 자동 선택 (webgl/canvas → 입자 형성, svg → 정지)
- prefers-reduced-motion 시 SVG 정적 렌더로 강등
- 같은 이름은 항상 같은 로고그램 (결정론)
        `,
      },
    },
  },
};

export const Default = {
  render: () => <HeptapodEncoderPage />,
};
