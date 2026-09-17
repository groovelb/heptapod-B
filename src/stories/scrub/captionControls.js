import { HERO_STORY_BEATS } from '../../data/heptapodHeroStory';

/** 캡션 변주 스토리가 공유하는 컨트롤 정의 */
export const captionArgTypes = {
  beatId: {
    control: 'select',
    options: HERO_STORY_BEATS.map((beat) => beat.id),
    description: '실제 비트 데이터. 카피와 배치, 키네틱 변주가 여기서 온다',
  },
  entry: { control: { type: 'range', min: 0, max: 1, step: 0.01 }, description: '비트 로컬 진행도 f (0 등장 전, 1 퇴장 후)' },
  exit: { control: { type: 'range', min: 0, max: 1, step: 0.01 }, description: '퇴장 진행도 (지원하는 변주만)' },
  reduced: { control: 'boolean', description: '모션 감소 설정' },
  onLight: { control: 'boolean', description: '밝은 배경 위 다크 텍스트' },
};

/** 캡션 변주 스토리의 기본 args */
export const captionArgs = { beatId: 'B0', entry: 0.5, exit: 0, reduced: false, onLight: false };
