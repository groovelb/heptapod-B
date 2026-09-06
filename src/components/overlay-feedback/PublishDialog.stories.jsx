import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import PublishDialog from './PublishDialog';
import { buildArchiveModel } from '../../utils/heptapod/archiveGlyph';
import { ARCHIVE_STORY_IDS } from '../../test-fixtures/archiveClient';
import { interpretGlyphMeaning } from '../../utils/heptapod/interpretGlyphMeaning';

export default {
  title: 'Custom Component/9. Overlay & Feedback/PublishDialog', component: PublishDialog, tags: ['autodocs'],
  parameters: { docs: { description: { component: 'md 미만은 12px 바깥 여백·동적 화면 높이·44px 닫기 영역으로 대응합니다. PC 배치는 유지합니다. 공개 동의 후 주소·소속 군집·링크 보관 안내·내 표식 페이지 열기·독립 복사를 제공합니다. 소셜 공유를 누르면 X·Threads·Facebook 및 지원 기기의 다른 앱 공유를 선택하며 자동 복사로 전환하지 않습니다. 완료 상태는 공유 취소나 실패에도 유지합니다. 완료 스토리는 즉시 표시되고 Flow 스토리는 동의 후 공개하기를 누르세요. 콜백은 로컬 결과만 반환하며 공개 API·인증·실제 공유창·클립보드를 호출하지 않습니다.' } } },
  decorators: [(Story) => <MemoryRouter>{ createElement(Story) }</MemoryRouter>],
  argTypes: {
    open: { control: 'boolean', description: '열림 상태' },
    onClose: { action: 'close', description: '닫기' },
    glyphName: { control: 'text', description: '공개할 이름' },
    model: { control: 'object', description: '현재 실제 표식 모델' },
    onPublish: { control: false, description: '동의 후 실행. 성공 결과 반환 또는 실패 throw' },
    onPublished: { action: 'view-published', description: '완료 후 표식 보기 동작' },
    intent: { control: 'select', options: ['publish', 'share'], description: '공개만 또는 공개 후 공유 의도' },
    completion: { control: 'select', options: ['archive', 'stay'], description: '완료 안내 문구. 두 모드 모두 링크 보관·페이지 열기 제공' },
    onShare: { control: false, description: '다른 앱 공유 콜백. copyFallback:false를 준수하고 shared/cancelled 반환' },
    onCopy: { control: false, description: '공유창과 별도로 공개 URL 복사. 실패하면 주소 선택 및 수동 복사 안내' },
    publishedResult: { control: 'object', description: '이미 공개된 결과. 다시 열어도 완료 상태로 진입' },
    interpretation: { control: 'object', description: '군집 이름·링크 및 소셜 공유 문구의 기준' },
    canShareWithApps: { control: 'boolean', description: '기기 공유 지원. 소셜 메뉴의 다른 앱 공유 표시' },
  },
  args: { open: true, glyphName: 'Louise', model: buildArchiveModel('Louise'), interpretation: interpretGlyphMeaning(buildArchiveModel('Louise')), canShareWithApps: true, onPublish: undefined, onShare: async () => 'shared', onCopy: async () => 'copied' },
};

export const Default = {};
export const SuccessFlow = { args: { onPublish: async () => ({ glyphId: ARCHIVE_STORY_IDS.left, isNew: true, mappingStatus: 'on-demand' }) } };
export const FailureFlow = { args: { onPublish: async () => { throw new Error('저장을 완료하지 못했습니다. 입력한 이름은 그대로 유지됩니다.'); } } };
export const Publishing = { args: { onPublish: () => new Promise(() => {}) } };
export const ShareFlow = { args: { ...SuccessFlow.args, intent: 'share', completion: 'stay', onShare: async () => 'shared' } };
export const Published = { args: { publishedResult: { glyphId: ARCHIVE_STORY_IDS.left }, completion: 'stay' } };
export const SocialNetworks = { args: { ...Published.args, canShareWithApps: false }, parameters: { docs: { description: { story: '소셜 공유를 누르면 X·Threads·Facebook 작성 화면 링크를 표시합니다. 실제 소셜 링크 이동은 사용자의 클릭으로만 수행합니다.' } } } };
export const ShareCancelled = { args: { ...Published.args, onShare: async () => 'cancelled' } };
export const ShareFailed = { args: { ...Published.args, onShare: async () => { throw new Error('공유하지 못했어요. 아래 링크는 계속 사용할 수 있어요.'); } } };
export const CopyUnavailable = { args: { ...Published.args, onCopy: async () => { throw new Error('Clipboard unavailable'); } } };
