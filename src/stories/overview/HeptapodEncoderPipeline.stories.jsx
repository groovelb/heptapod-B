import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  DocumentTitle,
  PageContainer,
  SectionTitle,
} from '../../components/storybookDocumentation';
import LogogramRendererCanvas from '../../components/motion/LogogramRendererCanvas';
import { runEncoderPipeline } from '../encoder/pipeline';

export default {
  title: 'Overview/Heptapod B/09 Encoder Pipeline',
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    name: { control: 'text', description: '인코딩할 이름. 물음표를 붙이면 의문형이 된다' },
    size: { control: { type: 'number', min: 240, max: 720, step: 40 }, description: '렌더러 한 변(px)' },
  },
  args: { name: 'Louise', size: 420 },
};

/**
 * 한 단계의 중간 산출물 블록
 *
 * Props:
 * @param {object} step - runEncoderPipeline 의 단계 객체 [Required]
 *
 * Example usage:
 * <StepBlock step={ step } />
 */
function StepBlock({ step }) {
  return (
    <Box sx={ { mb: 3 } }>
      <Stack direction="row" spacing={ 1 } alignItems="center" sx={ { mb: 0.5 } }>
        <Typography variant="subtitle2" sx={ { fontWeight: 700 } }>{ step.title }</Typography>
        <Typography variant="caption" sx={ { fontFamily: 'monospace', color: 'text.secondary' } }>
          { step.module }
        </Typography>
        { step.browserOnly && <Chip size="small" label="브라우저 전용" variant="outlined" /> }
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={ { mb: 1 } }>{ step.summary }</Typography>
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
          borderRadius: 1,
          backgroundColor: 'action.hover',
        } }
      >
        { JSON.stringify(step.data, null, 2) }
      </Box>
    </Box>
  );
}

/** 이름 하나가 표식이 되기까지의 실제 중간 산출물 */
export const Default = {
  render: ({ name, size }) => {
    const { steps, model } = runEncoderPipeline(name);

    return (
      <>
        <DocumentTitle
          title="Encoder Pipeline"
          status="Available"
          note="이름에서 표식까지, 화면이 쓰는 유틸을 그대로 호출한 결과"
          brandName="Design System"
          systemName="Heptapod B"
          version="1.0"
        />
        <PageContainer>
          <Typography variant="h4" sx={ { fontWeight: 700, mb: 1 } }>
            Encoder Pipeline
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={ { mb: 4 } }>
            <code>src/utils/heptapod/</code>의 순수 모듈을 차례로 호출한다. 위 컨트롤의 이름을 바꾸면 모든 단계가 다시 계산된다. 같은 이름은 언제나 같은 값을 낸다.
          </Typography>

          <SectionTitle
            title="완성된 표식"
            description="마지막 단계의 모델을 실제 렌더러로 그린다. 형성 애니메이션도 같은 모델에서 나온다."
          />
          <Box sx={ { mb: 4, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, backgroundColor: 'custom.chamber.fog' } }>
            { model ? (
              <LogogramRendererCanvas key={ `${name}:${size}` } model={ model } size={ size } />
            ) : (
              <Typography variant="body2" color="text.secondary">
                검증을 통과하지 못한 이름이라 표식을 만들지 않는다.
              </Typography>
            ) }
          </Box>

          <SectionTitle
            title="단계별 중간 산출물"
            description="각 블록의 제목 옆이 그 값을 만든 모듈이다. 브라우저 전용 표시가 붙은 단계는 이 화면에서 호출하지 않는다."
          />
          { steps.map((step) => <StepBlock key={ step.id } step={ step } />) }
        </PageContainer>
      </>
    );
  },
};

/** 한글 이름도 같은 경로를 지난다 */
export const Korean = { ...Default, args: { name: '김민준', size: 420 } };

/** 물음표를 붙이면 본체는 그대로, 갈고리만 더해진다 */
export const Interrogative = { ...Default, args: { name: 'Louise?', size: 420 } };

/** 코덱 범위를 넘으면 되읽을 수 없는 결정론 모드가 된다 */
export const Overflow = { ...Default, args: { name: 'Alexandria Alexandria Alexandria', size: 420 } };

/** 검증에서 멈추는 입력 */
export const Invalid = { ...Default, args: { name: '', size: 420 } };
