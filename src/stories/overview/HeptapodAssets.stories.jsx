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

export default {
  title: 'Overview/Heptapod B/07 Assets',
  parameters: {
    layout: 'padded',
  },
};

/**
 * public/heptapod-b-encoder 폴더 인벤토리.
 * 파일 수와 용량은 `find | wc -l`, `du -sh` 실측값(2026-09-17).
 * 무거운 원본은 번들에 넣지 않고 경로 문자열로만 다룬다.
 */
const FOLDERS = [
  {
    path: 'public/heptapod-b-encoder/hero-scrub',
    files: 4,
    size: '49M',
    usage: '사용 중',
    note: '스크럽 영상 1920·960, 포스터, 타임라인 JSON',
  },
  {
    path: 'public/heptapod-b-encoder/audio',
    files: 7,
    size: '1.7M',
    usage: '사용 중',
    note: '베드 루프 1 + 비트 클립 6 (B0~B5)',
  },
  {
    path: 'public/heptapod-b-encoder/hero-motion',
    files: 92,
    size: '752M',
    usage: '미사용',
    note: '영상 생성 시도본 24묶음. 최종본이 스크럽 원본이 됐다',
  },
  {
    path: 'public/heptapod-b-encoder/hero-scenes',
    files: 63,
    size: '122M',
    usage: '미사용',
    note: '샷별 스틸 s01~s07 + 폐기 파일럿',
  },
  {
    path: 'public/heptapod-b-encoder/hero-pilot',
    files: 8,
    size: '13M',
    usage: '미사용',
    note: '피드백 1차 키 비주얼 플레이트 8장',
  },
  {
    path: 'src/assets/video',
    files: 1,
    size: '796K',
    usage: '스토리 전용',
    note: '스타터킷 샘플 영상. VideoScrubbing 스토리에서만 쓴다',
  },
];

/** 코드가 실제로 참조하는 자산 경로 (grep 결과) */
const REFERENCED = [
  {
    path: '/heptapod-b-encoder/hero-scrub/hero-scrub-1920.mp4',
    where: 'heptapodHeroStory.js · HERO_VIDEO_SRC',
  },
  {
    path: '/heptapod-b-encoder/hero-scrub/hero-scrub-960.mp4',
    where: 'heptapodHeroStory.js · HERO_VIDEO_SRC_MOBILE',
  },
  {
    path: '/heptapod-b-encoder/hero-scrub/hero-scrub-poster.jpg',
    where: 'heptapodHeroStory.js · HERO_POSTER_SRC',
  },
  {
    path: '/heptapod-b-encoder/audio/bed-loop.mp3',
    where: 'heptapodHeroStory.js, useScrubSoundEngine.js',
  },
  {
    path: '/heptapod-b-encoder/audio/clips/{beatId}.mp3',
    where: 'useScrubSoundEngine.js · 비트 id로 파일명 조립',
  },
];

/** 썸네일: 용량이 작거나 참조용인 이미지만. 번들 import 없이 public 경로 문자열로 건다 */
const THUMBNAILS = [
  {
    label: 'hero-scrub-poster.jpg (49K)',
    src: '/heptapod-b-encoder/hero-scrub/hero-scrub-poster.jpg',
  },
  {
    label: 'hero-fog-fill-match-fb1-v1.png (1.6M)',
    src: '/heptapod-b-encoder/hero-pilot/hero-fog-fill-match-fb1-v1.png',
  },
  {
    label: 'hero-encoder-idle-plate-fb1-v1.png (1.5M)',
    src: '/heptapod-b-encoder/hero-pilot/hero-encoder-idle-plate-fb1-v1.png',
  },
  {
    label: 'hero-rectangular-chamber-fb1-v1.png (1.8M)',
    src: '/heptapod-b-encoder/hero-pilot/hero-rectangular-chamber-fb1-v1.png',
  },
];

/**
 * 폴더 인벤토리 표
 *
 * Props:
 * @param {Array} rows - FOLDERS 형태의 행 배열 [Required]
 *
 * Example usage:
 * <FolderTable rows={ FOLDERS } />
 */
function FolderTable({ rows }) {
  return (
    <TableContainer sx={ { mb: 4 } }>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={ { fontWeight: 600 } }>폴더</TableCell>
            <TableCell sx={ { fontWeight: 600, width: 80 } }>파일 수</TableCell>
            <TableCell sx={ { fontWeight: 600, width: 80 } }>용량</TableCell>
            <TableCell sx={ { fontWeight: 600, width: 100 } }>사용 여부</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>비고</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { rows.map((r) => (
            <TableRow key={ r.path } sx={ { '&:hover': { backgroundColor: 'action.hover' } } }>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12 } }>{ r.path }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12 } }>{ r.files }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12 } }>{ r.size }</TableCell>
              <TableCell sx={ { fontSize: 12, color: r.usage === '사용 중' ? 'primary.main' : 'text.secondary' } }>{ r.usage }</TableCell>
              <TableCell sx={ { fontSize: 12, color: 'text.secondary' } }>{ r.note }</TableCell>
            </TableRow>
          )) }
        </TableBody>
      </Table>
    </TableContainer>
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
 * 썸네일 한 칸: public 경로를 직접 건다 (번들 import 없음)
 *
 * Props:
 * @param {string} label - 파일명과 용량 [Required]
 * @param {string} src - public 기준 절대 경로 [Required]
 *
 * Example usage:
 * <AssetCell label="poster.jpg" src="/heptapod-b-encoder/hero-scrub/hero-scrub-poster.jpg" />
 */
function AssetCell({ label, src }) {
  return (
    <Stack spacing={ 0.75 }>
      <Box sx={ { width: '100%', backgroundColor: 'action.hover', lineHeight: 0 } }>
        <Box
          component="img"
          src={ src }
          alt={ label }
          loading="lazy"
          sx={ { width: '100%', height: 'auto', display: 'block' } }
        />
      </Box>
      <Typography
        variant="caption"
        sx={ {
          fontFamily: 'monospace',
          fontSize: 10,
          color: 'text.secondary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        } }
      >
        { label }
      </Typography>
    </Stack>
  );
}

/** 자산 인벤토리: 폴더별 용량, 코드가 참조하는 경로, 썸네일 */
export const Default = {
  render: () => (
    <>
      <DocumentTitle
        title="Assets"
        status="Available"
        note="public 자산 인벤토리와 실제 참조 경로"
        brandName="Design System"
        systemName="Heptapod B"
        version="1.0"
      />
      <PageContainer>
        <Typography variant="h4" sx={ { fontWeight: 700, mb: 1 } }>
          Assets
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={ { mb: 4 } }>
          자산은 전부 <code>public/</code>에 있고 코드는 경로 문자열로만 참조한다. 원본 영상 묶음이 938MB라 번들에 넣지 않고 폴더 단위 표로 정리한다.
        </Typography>

        <SectionTitle
          title="폴더 인벤토리"
          description="파일 수와 용량은 실측값이다. 사용 여부는 코드에서 경로 문자열을 찾은 결과로 판정했다."
        />
        <FolderTable rows={ FOLDERS } />

        <SectionTitle
          title="코드가 참조하는 경로"
          description="히어로 인트로가 쓰는 영상·포스터·소리. 이 목록 밖의 파일은 화면에 나오지 않는다."
        />
        <ReferenceTable rows={ REFERENCED } />

        <SectionTitle
          title="썸네일"
          description="포스터 한 장과 키 비주얼 플레이트 세 장. 나머지 원본은 용량이 커서 경로만 남긴다."
        />
        <Grid container spacing={ 2 } sx={ { mb: 4 } }>
          { THUMBNAILS.map((t) => (
            <Grid key={ t.src } size={ { xs: 6, sm: 4, md: 3 } }>
              <AssetCell label={ t.label } src={ t.src } />
            </Grid>
          )) }
        </Grid>
      </PageContainer>
    </>
  ),
};
