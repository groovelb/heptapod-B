import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import PublishDialog from './PublishDialog';
import { buildArchiveModel } from '../../utils/heptapod/archiveGlyph';
import { ARCHIVE_STORY_IDS } from '../../test-fixtures/archiveClient';

export default {
  title: 'Custom Component/9. Overlay & Feedback/PublishDialog', component: PublishDialog, tags: ['autodocs'],
  parameters: { docs: { description: { component: '공개 동의를 확인한 뒤 성공·실패·대기 상태로 전환하는 대화상자입니다. 각 흐름에서 동의 후 PUBLISH를 누르세요. 콜백은 고정된 로컬 결과만 반환하며 공개 API나 인증은 호출하지 않습니다.' } } },
  decorators: [(Story) => <MemoryRouter>{ createElement(Story) }</MemoryRouter>],
  argTypes: {
    open: { control: 'boolean', description: '열림 상태' },
    onClose: { action: 'close', description: '닫기' },
    glyphName: { control: 'text', description: '공개할 이름' },
    model: { control: 'object', description: '현재 실제 표식 모델' },
    onPublish: { control: false, description: '동의 후 실행. 성공 결과 반환 또는 실패 throw' },
    onPublished: { action: 'view-published', description: '완료 후 표식 보기 동작' },
  },
  args: { open: true, glyphName: 'Louise', model: buildArchiveModel('Louise'), onPublish: undefined },
};

export const Default = {};
export const SuccessFlow = { args: { onPublish: async () => ({ glyphId: ARCHIVE_STORY_IDS.left, isNew: true, mappingStatus: 'on-demand' }) } };
export const FailureFlow = { args: { onPublish: async () => { throw new Error('저장을 완료하지 못했습니다. 입력한 이름은 그대로 유지됩니다.'); } } };
export const Publishing = { args: { onPublish: () => new Promise(() => {}) } };
