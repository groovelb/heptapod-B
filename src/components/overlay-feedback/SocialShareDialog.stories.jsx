import SocialShareDialog from './SocialShareDialog';
export default {
  title: 'Custom Component/9. Overlay & Feedback/SocialShareDialog', component: SocialShareDialog, tags: ['autodocs'],
  parameters: { docs: { description: { component: 'X·Threads·Facebook 작성 링크를 고르는 공유창. OS 공유창을 열지 않고, 사용자가 선택한 소셜에서 게시 여부를 결정합니다. 링크 복사는 별도 버튼이며 실패하면 주소 선택과 수동 복사를 제공합니다.' } } },
  argTypes: {
    payload: { control: 'object', description: '공개 링크의 title, text, url. null이면 닫힘' },
    onClose: { action: 'close', description: '닫기 콜백' },
    onCopy: { control: false, description: '스토리용 복사 주입. 미제공 시 Clipboard API' },
  },
  args: { payload: { title: 'Archive', text: '표식으로 읽는 이름', url: 'https://example.com/archive' }, onCopy: async () => {} },
};
export const Docs = {};
export const CopyUnavailable = { args: { onCopy: async () => { throw new Error('Clipboard unavailable'); } } };
