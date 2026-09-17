import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import {
  DocumentTitle,
  PageContainer,
  SectionTitle,
} from '../../components/storybookDocumentation';
import assetInventory from '../../data/assetInventory.js';
import reactLogo from '../../assets/react.svg';
import sampleVideo from '../../assets/video/9-motion.mp4';

export default {
  title: 'Overview/Heptapod B/07 Assets',
  parameters: {
    layout: 'padded',
  },
};

/** 번들 import 가 필요한 src/assets 항목만 경로를 직접 잇는다. public 은 URL 그대로 쓴다 */
const BUNDLED = {
  'src/assets/react.svg': reactLogo,
  'src/assets/video/9-motion.mp4': sampleVideo,
};

/** 폴더별 사용 판정. 코드에서 경로 문자열을 찾은 결과와 빌드 스크립트를 근거로 한다 */
const USAGE_RULES = [
  { match: (key) => key === 'public/(root)', usage: '사용 중', note: '탭과 홈 화면 아이콘. app/layout.jsx의 metadata.icons' },
  { match: (key) => key.startsWith('public/heptapod-b-encoder/audio'), usage: '사용 중', note: '스크럽 사운드. 베드 루프와 마디 클립' },
  { match: (key) => key.startsWith('public/heptapod-b-encoder/hero-scrub-v2-topaz'), usage: '사용 중', note: '넓은 화면 인트로 영상과 포스터' },
  { match: (key) => key.startsWith('public/heptapod-b-encoder/hero-scrub-v2-mobile'), usage: '사용 중', note: '좁은 화면 세로 인트로 영상과 포스터' },
  { match: (key) => key.startsWith('public/glyph-symbols'), usage: '사용 중', note: '저작 표식의 사전 생성 PNG' },
  { match: (key) => key === 'public/og', usage: '사용 중', note: '링크 미리보기 카드와 카드용 폰트' },
  { match: (key) => key.startsWith('public/heptapod-b-encoder/hero-pilot'), usage: '일부 사용', note: '플레이트 8장 중 한 장이 개인 카드 바탕' },
  { match: (key) => key.startsWith('src/assets'), usage: '스토리 전용', note: '스타터킷 샘플. 화면에서 쓰지 않는다' },
  { match: (key) => key.startsWith('public/heptapod-b-encoder/hero-motion'), usage: '미사용', note: '영상 생성 시도본' },
  { match: (key) => key.startsWith('public/heptapod-b-encoder/hero-scenes'), usage: '미사용', note: '샷별 스틸' },
  { match: (key) => key.startsWith('public/heptapod-b-encoder/hero-scrub'), usage: '미사용', note: 'v2 확정 전 영상 후보' },
];

/** 코드가 실제로 참조하는 자산 경로 (grep 결과) */
const REFERENCED = [
  { path: '/heptapod-b-encoder/hero-scrub-v2-topaz/hero-scrub-3832.mp4', where: 'heptapodHeroStory.js · HERO_VIDEO_SRC' },
  { path: '/heptapod-b-encoder/hero-scrub-v2-topaz/hero-scrub-poster.jpg', where: 'heptapodHeroStory.js · HERO_POSTER_SRC' },
  { path: '/heptapod-b-encoder/hero-scrub-v2-mobile/hero-scrub-1080x1920.mp4', where: 'heptapodHeroStory.js · HERO_VIDEO_SRC_MOBILE' },
  { path: '/heptapod-b-encoder/hero-scrub-v2-mobile/hero-scrub-poster.jpg', where: 'heptapodHeroStory.js · HERO_POSTER_SRC_MOBILE' },
  { path: '/heptapod-b-encoder/audio/bed-loop.mp3', where: 'heptapodHeroStory.js, useScrubSoundEngine.js' },
  { path: '/heptapod-b-encoder/audio/clips/{beatId}.mp3', where: 'useScrubSoundEngine.js · 비트 id로 파일명 조립' },
  { path: '/og/landing-v6.png', where: 'lib/og/index.js · LANDING_IMAGE (카드 버전 6)' },
  { path: 'public/og/Cinzel-Bold.ttf, NotoSerifKR-Bold.otf', where: 'lib/og/card.js · 카드 글자를 외곽선으로 변환' },
  { path: 'public/heptapod-b-encoder/hero-pilot/hero-logogram-response-plate-fb1-v1.png', where: 'lib/og/card.js · 개인 카드 바탕' },
  { path: '/glyph-symbols/v1/{modelHash}-{256|512}-1c2226.png', where: 'lib/glyphImages/authoredManifest.js · 저작 표식' },
  { path: '/apple-touch-icon.png, /favicon.ico, /favicon-32.png, /favicon.svg', where: 'app/layout.jsx · metadata.icons' },
];

/** 바이트를 사람이 읽는 단위로 */
function formatBytes(bytes) {
  if (!bytes) return '0';
  const units = ['B', 'K', 'M', 'G'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / (1024 ** index);
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)}${units[index]}`;
}

/** 폴더 키(`root/folder`)를 만든다. summary 키와 같은 규칙 */
const folderKey = (item) => `${item.root}/${item.folder || '(root)'}`;

/** 폴더 키의 사용 판정 */
function usageOf(key) {
  return USAGE_RULES.find((rule) => rule.match(key)) || { usage: '확인 필요', note: '' };
}

/** 항목의 실제 소스. public 은 url, src/assets 는 번들 import */
const sourceOf = (item) => item.url || BUNDLED[item.path] || '';

/** 같은 폴더의 첫 이미지를 영상 포스터로 쓴다 */
function posterFor(items) {
  const image = items.find((item) => item.kind === 'image');
  return image ? sourceOf(image) : undefined;
}

/**
 * 이미지 한 칸
 *
 * Props:
 * @param {object} item - assetInventory 항목 [Required]
 *
 * Example usage:
 * <ImageCell item={ item } />
 */
function ImageCell({ item }) {
  return (
    <Stack spacing={ 0.5 }>
      <Box sx={ { width: '100%', aspectRatio: '4 / 3', backgroundColor: 'action.hover', overflow: 'hidden' } }>
        <Box
          component="img"
          src={ sourceOf(item) }
          alt={ item.name }
          loading="lazy"
          sx={ { width: '100%', height: '100%', objectFit: 'contain', display: 'block' } }
        />
      </Box>
      <Typography variant="caption" sx={ { fontFamily: 'monospace', fontSize: 10, color: 'text.secondary', wordBreak: 'break-all' } }>
        { `${item.name} · ${formatBytes(item.bytes)}` }
      </Typography>
    </Stack>
  );
}

/**
 * 영상 한 칸. 클릭 전에는 내려받지 않는다
 *
 * Props:
 * @param {object} item - assetInventory 항목 [Required]
 * @param {string} poster - 같은 폴더의 포스터 이미지 [Optional]
 *
 * Example usage:
 * <VideoCell item={ item } poster={ poster } />
 */
function VideoCell({ item, poster }) {
  return (
    <Stack spacing={ 0.5 }>
      <Box sx={ { width: '100%', aspectRatio: '16 / 9', backgroundColor: 'action.hover', overflow: 'hidden' } }>
        <Box
          component="video"
          src={ sourceOf(item) }
          poster={ poster }
          controls
          preload="none"
          playsInline
          sx={ { width: '100%', height: '100%', objectFit: 'contain', display: 'block' } }
        />
      </Box>
      <Typography variant="caption" sx={ { fontFamily: 'monospace', fontSize: 10, color: 'text.secondary', wordBreak: 'break-all' } }>
        { `${item.name} · ${formatBytes(item.bytes)}` }
      </Typography>
    </Stack>
  );
}

/**
 * 소리 한 줄
 *
 * Props:
 * @param {object} item - assetInventory 항목 [Required]
 *
 * Example usage:
 * <AudioRow item={ item } />
 */
function AudioRow({ item }) {
  return (
    <Stack spacing={ 0.5 } sx={ { mb: 1.5 } }>
      <Typography variant="caption" sx={ { fontFamily: 'monospace', fontSize: 11, color: 'text.secondary' } }>
        { `${item.name} · ${formatBytes(item.bytes)}` }
      </Typography>
      <Box component="audio" src={ sourceOf(item) } controls preload="none" sx={ { width: '100%', maxWidth: 420 } } />
    </Stack>
  );
}

/**
 * 폰트·기타 파일 표
 *
 * Props:
 * @param {Array} items - assetInventory 항목 배열 [Required]
 *
 * Example usage:
 * <FileTable items={ items } />
 */
function FileTable({ items }) {
  return (
    <TableContainer sx={ { mb: 2 } }>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={ { fontWeight: 600 } }>파일</TableCell>
            <TableCell sx={ { fontWeight: 600, width: 90 } }>종류</TableCell>
            <TableCell sx={ { fontWeight: 600, width: 90 } }>용량</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { items.map((item) => (
            <TableRow key={ item.path }>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 11 } }>{ item.name }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 11, color: 'text.secondary' } }>{ item.ext }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 11 } }>{ formatBytes(item.bytes) }</TableCell>
            </TableRow>
          )) }
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * 폴더 한 절: 이미지 격자, 영상 격자, 소리 목록, 파일 표
 *
 * Props:
 * @param {string} folder - 폴더 키 [Required]
 * @param {Array} items - 그 폴더의 항목 배열 [Required]
 *
 * Example usage:
 * <FolderSection folder="public/og" items={ items } />
 */
function FolderSection({ folder, items }) {
  const { usage, note } = usageOf(folder);
  const bytes = items.reduce((sum, item) => sum + item.bytes, 0);
  const images = items.filter((item) => item.kind === 'image');
  const videos = items.filter((item) => item.kind === 'video');
  const audios = items.filter((item) => item.kind === 'audio');
  const files = items.filter((item) => item.kind === 'font' || item.kind === 'other');
  const poster = posterFor(items);

  return (
    <Box sx={ { mb: 5 } }>
      <SectionTitle
        title={ folder }
        description={ `${items.length}개 · ${formatBytes(bytes)} · ${usage}${note ? ` · ${note}` : ''}` }
      />
      { images.length > 0 && (
        <Grid container spacing={ 1.5 } sx={ { mb: 2 } }>
          { images.map((item) => (
            <Grid key={ item.path } size={ { xs: 6, sm: 4, md: 3, lg: 2 } }>
              <ImageCell item={ item } />
            </Grid>
          )) }
        </Grid>
      ) }
      { videos.length > 0 && (
        <Grid container spacing={ 1.5 } sx={ { mb: 2 } }>
          { videos.map((item) => (
            <Grid key={ item.path } size={ { xs: 12, sm: 6, md: 4 } }>
              <VideoCell item={ item } poster={ poster } />
            </Grid>
          )) }
        </Grid>
      ) }
      { audios.map((item) => <AudioRow key={ item.path } item={ item } />) }
      { files.length > 0 && <FileTable items={ files } /> }
    </Box>
  );
}

/**
 * 참조 경로 표
 *
 * Props:
 * @param {Array} rows - REFERENCED 형태의 행 배열 [Required]
 *
 * Example usage:
 * <ReferenceTable rows={ REFERENCED } />
 */
function ReferenceTable({ rows }) {
  return (
    <TableContainer sx={ { mb: 4 } }>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={ { fontWeight: 600, width: '50%' } }>경로</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>참조하는 곳</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { rows.map((r) => (
            <TableRow key={ r.path }>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12 } }>{ r.path }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' } }>{ r.where }</TableCell>
            </TableRow>
          )) }
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * 폴더 인벤토리 표: 폴더별 수와 용량, 사용 판정
 *
 * Props:
 * @param {Array} folders - [폴더 키, 항목 배열] 쌍 배열 [Required]
 *
 * Example usage:
 * <FolderTable folders={ folders } />
 */
function FolderTable({ folders }) {
  return (
    <TableContainer sx={ { mb: 4 } }>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={ { fontWeight: 600 } }>폴더</TableCell>
            <TableCell sx={ { fontWeight: 600, width: 70 } }>파일</TableCell>
            <TableCell sx={ { fontWeight: 600, width: 70 } }>용량</TableCell>
            <TableCell sx={ { fontWeight: 600, width: 100 } }>사용 여부</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>비고</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { folders.map(([folder, items]) => {
            const { usage, note } = usageOf(folder);
            const bytes = items.reduce((sum, item) => sum + item.bytes, 0);
            return (
              <TableRow key={ folder } sx={ { '&:hover': { backgroundColor: 'action.hover' } } }>
                <TableCell sx={ { fontFamily: 'monospace', fontSize: 11 } }>{ folder }</TableCell>
                <TableCell sx={ { fontFamily: 'monospace', fontSize: 11 } }>{ items.length }</TableCell>
                <TableCell sx={ { fontFamily: 'monospace', fontSize: 11 } }>{ formatBytes(bytes) }</TableCell>
                <TableCell sx={ { fontSize: 11, color: usage === '미사용' ? 'text.secondary' : 'primary.main' } }>{ usage }</TableCell>
                <TableCell sx={ { fontSize: 11, color: 'text.secondary' } }>{ note }</TableCell>
              </TableRow>
            );
          }) }
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** 자산 인벤토리: 폴더별 실물, 사용 판정, 코드가 참조하는 경로 */
export const Default = {
  render: () => {
    const grouped = new Map();
    for (const item of assetInventory.items) {
      const key = folderKey(item);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    }
    const folders = [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const totals = assetInventory.items.reduce((acc, item) => {
      acc[item.kind] = (acc[item.kind] || 0) + 1;
      acc.bytes += item.bytes;
      return acc;
    }, { bytes: 0 });

    return (
      <>
        <DocumentTitle
          title="Assets"
          status="Available"
          note="자산 인벤토리 전체를 실물로 그린다"
          brandName="Design System"
          systemName="Heptapod B"
          version="1.0"
        />
        <PageContainer>
          <Typography variant="h4" sx={ { fontWeight: 700, mb: 1 } }>
            Assets
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={ { mb: 1 } }>
            { `${assetInventory.items.length}개 · ${formatBytes(totals.bytes)} · 이미지 ${totals.image || 0} · 영상 ${totals.video || 0} · 소리 ${totals.audio || 0} · 폰트 ${totals.font || 0} · 기타 ${totals.other || 0}` }
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={ { mb: 4 } }>
            목록은 <code>src/data/assetInventory.js</code>가 원본이고 재생성은 <code>pnpm generate-assets</code>다. public 자산은 URL로 그대로 걸고, 영상은 클릭 전에 내려받지 않는다. 넓은 화면 인트로 영상 한 편은 저장소에서 제외돼 있어 목록에 없다. <code>pnpm prepare:hero-video</code>가 <code>assets/</code>의 조각에서 조립한다.
          </Typography>

          <SectionTitle
            title="폴더 인벤토리"
            description="폴더별 파일 수와 용량, 사용 판정. 사용 여부는 코드에서 경로 문자열을 찾은 결과다."
          />
          <FolderTable folders={ folders } />

          <SectionTitle
            title="코드가 참조하는 경로"
            description="인트로 영상·포스터·소리, 링크 미리보기 카드와 폰트, 저작 표식, 아이콘. 이 목록 밖의 파일은 화면에 나오지 않는다."
          />
          <ReferenceTable rows={ REFERENCED } />

          { folders.map(([folder, items]) => (
            <FolderSection key={ folder } folder={ folder } items={ items } />
          )) }
        </PageContainer>
      </>
    );
  },
};
