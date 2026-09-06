import LanguageSwitcher from './LanguageSwitcher';

export default {
  title: 'Component/10. Navigation/LanguageSwitcher',
  component: LanguageSwitcher,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: 'GNB 언어 선택. 시스템 설정·한국어·영어를 지원하며 직접 선택한 언어를 저장합니다.' } } },
  argTypes: { sx: { control: 'object', description: 'MUI sx 스타일' } },
};

export const Default = {};
export const English = { globals: { locale: 'en' } };
