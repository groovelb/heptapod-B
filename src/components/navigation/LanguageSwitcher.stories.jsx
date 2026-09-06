import LanguageSwitcher from './LanguageSwitcher';

export default {
  title: 'Custom Component/10. Navigation/LanguageSwitcher',
  component: LanguageSwitcher,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: '지구본 아이콘으로 여는 GNB 언어 선택 메뉴. 모노크롬 배경·헤어라인 테두리·직각 모서리·모노 타이포를 사용하며 선택 항목은 체크로 표시합니다. 시스템 설정·한국어·영어와 선택 저장을 지원합니다.' } } },
  argTypes: { sx: { control: 'object', description: 'MUI sx 스타일' } },
};

export const Default = {};
export const English = { globals: { locale: 'en' } };
