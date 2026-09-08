# 이미지 초해상도 처리 선택지

확인: 2026-09-08. 대표 이미지 2장(F01-IN, F06-MID)에 Topaz Precision API 호출 완료. 두 장 모두 1672×941 → 3344×1882 PNG로 확인했다. 결과 비교: ../hero-topaz-upscale-comparison.html. 보호복·난간이 선명해지는 대신 표면 대비가 강해졌고 출력 가장자리에 검은 테두리가 생겨 최종 일괄 적용 전 품질 판단이 필요하다.

## 권장 파일럿

이번 재생성 PNG 한 장에 Topaz Precision의 `High Fidelity V3`, 2배, PNG, 얼굴 보정 비활성화를 적용하는 방법을 우선 검토한다. 단순 보간 확대와 달리 초해상도 모델로 디테일을 추정한다. 결과가 원본에 있던 정확한 정보라는 보장은 없으며, 우주선·보호복·리프트 윤곽 보존은 출력 비교가 필요하다.

후보 설정:

```json
{
  "model": "High Fidelity V3",
  "upscale_factor": 2,
  "output_format": "png",
  "face_enhancement": false,
  "subject_detection": "All",
  "crop_to_fill": false
}
```

입력 URL은 실행 시 선택한 원본 PNG로 전달한다. 얼굴 보정은 기본값이 true이므로 명시적으로 끈다. sharpen/denoise는 첫 출력 평가 뒤 필요할 때만 조절한다. 원경 인물과 헬멧에 얼굴을 새로 만들어 넣지 않는다.

현재 24장 후보의 크기는 1672×941 16장, 1672×940 2장, 1670×941 6장이다. 1672×941 입력의 2배 결과 목표는 3344×1882이다. 원하는 2560×1440 전달본은 초해상도 결과 이후 비율 유지 fit으로 별도 제작하며 이 단계의 크기 조절과 AI 초해상도 추론을 구분해서 기록한다. 생성 크기를 2560×1440으로 강제하는 프롬프트 실험과도 구분한다.

## 선택지 비교

| 방법 | 용도 | 이 프로젝트 판단 |
|---|---|---|
| Topaz Precision / High Fidelity V3 | 원본 보존을 지향하는 최대 4배 이미지 업스케일, API 배율 제어 | 첫 파일럿 권장. 기존 fal 연결을 활용할 수 있으나 새 입력 스키마의 실행 코드 필요 |
| Real-ESRGAN | 공개 코드·모델을 사용하는 실세계 이미지 초해상도 복원 | 무료 로컬 대안. 환경 설치와 모델 준비 필요, 텍스처 및 안개 보존 비교 필요 |
| Topaz Generative / Creative 계열 | 더 적극적인 새 디테일 재구성/생성 | 인물·선체·장비 정체성 고정이 필요한 이번 작업의 첫 선택으로 권장하지 않음 |

Real-ESRGAN의 `outscale` 임의 배율은 모델의 초해상도 출력 뒤 일반 리사이즈를 추가할 수 있다. 따라서 최종 치수만으로 네이티브 모델 출력 배율을 판단하지 않는다.

## 원본 영상에 적용하는 대안

fal은 별도의 Topaz 영상 Precision 업스케일 엔드포인트도 제공한다. 새 시작/끝 스틸로 동작을 다시 생성하는 방법과 달리 원본 영상을 입력으로 사용한다. 스토리·사건·카메라 경로를 보존하려는 목적에는 더 적합할 수 있다는 판단이다. 프레임 보간·프레임률 변경을 사용하지 않고, 반환 프레임 수/PTS/오디오/마지막 접촉면을 확인해야 실제 교체 여부를 판단할 수 있다.

이는 기존 재생성 스틸로 새 영상을 만드는 작업의 자동 대체 실행을 뜻하지 않는다. C01 재생성 파일럿은 한 번의 타이밍 교정 후에도 접근 시점·전경 차량 통과·지형 시차가 원본과 달라 동작 검증에 실패했다. 전체 영상 생성 및 랜딩 교체는 진행하지 않았다. 초해상도 방법은 별도의 선택지로 제시한다.

## 근거

- [Topaz Precision 이미지 API](https://fal.ai/models/topaz/upscale/image/precision/api): 모델 enum에 High Fidelity V3/V2, 배율, PNG, face_enhancement, sharpen/denoise 설정 확인.
- [Topaz 공식 fal 카탈로그](https://fal.ai/topaz): Precision, Generative, Creative 목적 구분과 영상 업스케일 경로.
- [Real-ESRGAN 공식 저장소](https://github.com/xinntao/Real-ESRGAN): 실세계 초해상도 복원, 실행 방법, 라이선스, 임의 outscale의 후속 리사이즈 설명.
