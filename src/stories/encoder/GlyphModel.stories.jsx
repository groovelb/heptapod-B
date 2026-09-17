import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import LogogramRendererCanvas from '../../components/motion/LogogramRendererCanvas';
import { runEncoderPipeline, readable } from './pipeline';

export default {
  title: 'Custom Component/1. Encoder & Model/GlyphModel',
  tags: ['autodocs'],
  argTypes: {
    name: { control: 'text', description: '인코딩할 이름' },
    size: { control: { type: 'number', min: 240, max: 720, step: 40 }, description: '렌더러 한 변(px)' },
    showJson: { control: 'boolean', description: '모델 전문을 함께 펼칠지' },
  },
  args: { name: 'Louise', size: 360, showJson: false },
  parameters: {
    docs: {
      description: {
        component: [
          '표식 모델 층이다. 컴포넌트가 아니라 순수 함수 묶음이고, 렌더러 세 종과 정지 이미지 생성기가 공유하는 단일 입력이다.',
          '이름 하나가 들어오면 다듬기, 시드, 기하, 가역 코덱을 거쳐 `LogogramModel` 하나가 나온다. 같은 이름은 언제나 같은 모델이 되고, 모델을 되읽으면 이름이 돌아온다.',
          '계약 전문은 `src/utils/heptapod/MODEL.md`, 단계별 중간 산출물은 `Overview/Heptapod B/09 Encoder Pipeline`에 있다.',
        ].join('\n\n'),
      },
    },
  },
};

/** 모델 요약 행 */
const summaryRows = (model) => [
  ['meta.name', model.meta.name],
  ['meta.hashHex', model.meta.hashHex],
  ['meta.nfdCount', model.meta.nfdCount],
  ['meta.clusterCount', model.meta.clusterCount],
  ['meta.reversible', String(model.meta.reversible)],
  ['meta.overflow', String(model.meta.overflow)],
  ['clusters', model.clusters.length],
  ['strands', model.strands.length],
  ['gap', model.gap ? `열림 ${Math.round((model.gap.half * 2 * 180) / Math.PI)}도` : '닫힘'],
  ['questionHook', model.questionHook ? '있음' : '없음'],
];

/** 이름 하나에서 나온 모델과 그 모델로 그린 표식 */
export const Default = {
  render: ({ name, size, showJson }) => {
    const { model, steps } = runEncoderPipeline(name);
    if (!model) {
      return (
        <Typography variant="body2" color="text.secondary">
          검증을 통과하지 못한 이름이다. 모델을 만들지 않는다.
        </Typography>
      );
    }
    const decodeStep = steps.find((step) => step.id === 'decode');

    return (
      <Stack spacing={ 3 }>
        <Box sx={ { p: 2, backgroundColor: 'custom.chamber.fog', display: 'inline-block' } }>
          <LogogramRendererCanvas key={ `${name}:${size}` } model={ model } size={ size } />
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={ { fontWeight: 600, width: 200 } }>필드</TableCell>
                <TableCell sx={ { fontWeight: 600 } }>값</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              { summaryRows(model).map(([key, value]) => (
                <TableRow key={ key }>
                  <TableCell sx={ { fontFamily: 'monospace', fontSize: 12 } }>{ key }</TableCell>
                  <TableCell sx={ { fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' } }>{ String(value) }</TableCell>
                </TableRow>
              )) }
              <TableRow>
                <TableCell sx={ { fontFamily: 'monospace', fontSize: 12 } }>decode(model)</TableCell>
                <TableCell sx={ { fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' } }>
                  { `${decodeStep.data.name} · 입력과 일치 ${String(decodeStep.data.matchesInput)}` }
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        { showJson && (
          <Box
            component="pre"
            sx={ {
              m: 0,
              p: 1.5,
              fontFamily: 'monospace',
              fontSize: 11,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              border: '1px solid',
              borderColor: 'divider',
              maxHeight: 420,
              overflow: 'auto',
            } }
          >
            { JSON.stringify(readable(model), null, 2) }
          </Box>
        ) }
      </Stack>
    );
  },
};

/** 같은 본체에 갈고리만 더한 변주 */
export const Interrogative = { ...Default, args: { name: 'Louise?', size: 360, showJson: false } };

/** 모델 전문 */
export const WithJson = { ...Default, args: { name: 'Louise', size: 280, showJson: true } };
