import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import PublishDialog from './PublishDialog';
import { buildArchiveModel } from '../../utils/heptapod/archiveGlyph';
import { ARCHIVE_STORY_IDS } from '../../test-fixtures/archiveClient';
import { interpretGlyphMeaning } from '../../utils/heptapod/interpretGlyphMeaning';

export default {
  title: 'Custom Component/9. Overlay & Feedback/PublishDialog', component: PublishDialog, tags: ['autodocs'],
  parameters: { docs: { description: { component: 'md 미만은 12px 바깥 여백·동적 화면 높이·44px 닫기 영역으로 대응합니다. 공개 완료 시 링크를 한 번 자동 복사하고 성공 스낵바를 표시합니다. 차단되면 수동 복사 안내를 표시합니다. 내 표식 페이지 열기는 56px 높이·전체 너비 메인 CTA이며, 아래 공유하기 섹션에 링크 복사·X·Threads·Facebook을 흰색 아이콘 한 줄로 표시합니다. OS 공유창은 호출하지 않습니다. 완료 스토리는 즉시 표시되고 Flow 스토리는 동의 후 공개하기를 누르세요. 콜백은 로컬 결과만 반환하며 공개 API·인증·실제 공유창·클립보드를 호출하지 않습니다.' } } },
  decorators: [(Story) => <MemoryRouter>{ createElement(Story) }</MemoryRouter>],
  argTypes: {
    showClusterLink: { control: 'boolean', description: '군집 이동 링크 표시. Create에서는 숨김' },
    open: { control: 'boolean', description: '열림 상태' },
    onClose: { action: 'close', description: '닫기' },
    glyphName: { control: 'text', description: '공개할 이름' },
    model: { control: 'object', description: '현재 실제 표식 모델' },
    onPublish: { control: false, description: '동의 후 실행. 성공 결과 반환 또는 실패 throw' },
    onPublished: { action: 'view-published', description: '완료 후 표식 보기 동작' },
    intent: { control: 'select', options: ['publish', 'share'], description: '공개만 또는 공개 후 공유 의도' },
    completion: { control: 'select', options: ['archive', 'stay'], description: '완료 안내 문구. 두 모드 모두 링크 보관·페이지 열기 제공' },
    onCopy: { control: false, description: '완료 시 자동 복사와 링크 아이콘의 재복사 콜백. 실패하면 수동 복사 안내' },
    publishedResult: { control: 'object', description: '이미 공개된 결과. 다시 열어도 완료 상태로 진입' },
    interpretation: { control: 'object', description: '군집 이름·링크 및 소셜 공유 문구의 기준' },
  },
  args: { open: true, glyphName: 'Louise', model: buildArchiveModel('Louise'), interpretation: interpretGlyphMeaning(buildArchiveModel('Louise')), onPublish: undefined, onCopy: async () => 'copied' },
};

export const Docs = {};
export const SuccessFlow = { args: { onPublish: async () => ({ glyphId: ARCHIVE_STORY_IDS.left, isNew: true, mappingStatus: 'on-demand' }) } };
export const FailureFlow = { args: { onPublish: async () => { throw new Error('저장을 완료하지 못했습니다. 입력한 이름은 그대로 유지됩니다.'); } } };
export const Publishing = { args: { onPublish: () => new Promise(() => {}) } };
export const ShareFlow = { args: { ...SuccessFlow.args, intent: 'share', completion: 'stay' } };
export const Published = { args: { publishedResult: { glyphId: ARCHIVE_STORY_IDS.left }, completion: 'stay' } };
export const SocialNetworks = { args: { ...Published.args }, parameters: { docs: { description: { story: '메인 CTA 아래에 링크 복사·X·Threads·Facebook 아이콘을 한 줄로 표시합니다. 실제 소셜 링크 이동은 사용자의 클릭으로만 수행합니다.' } } } };
export const CopyUnavailable = { args: { ...Published.args, onCopy: async () => { throw new Error('Clipboard unavailable'); } } };
