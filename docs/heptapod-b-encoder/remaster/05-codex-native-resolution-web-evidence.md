# Codex 내장 고해상도 생성: 웹 검색으로 확인한 추가 근거

조사일: 2026-09-08. 외부 이미지 생성 호출 없이 웹 검색, 공개 페이지와 GitHub 이슈·댓글 읽기만 수행했다.

## 수정된 판단

`auto` 설정이나 현재의 작은 출력만으로 모델의 고해상도 생성 능력 전체가 없다고 결론 낼 수 없다. Codex 내장 경로의 정확한 출력 크기 문제는 다른 사용자도 보고했으며, 같은 구독 인증 경로에서 과거 고해상도 출력이 됐다는 보고도 있다. 현재 문제를 영구적인 사양으로 확정하지 않는다.

## 직접 관련된 1차 보고

| 시점 | 확인 내용 | 해석 범위 |
|---|---|---|
| 4월 23일 | Pro 사용자가 macOS Codex App 내장 생성·편집에 정확한 출력 크기 제어가 없다고 이슈 #19175 등록 | 해당 사용자 환경의 기능 요청. 9월 8일 조회 시 open, 댓글 0개 |
| 6월 17일 | 이슈 #28723 작성자는 같은 Codex/OAuth 작업이 6월 15일에는 2160×3040 검증을 통과했고, 16일부터 작은 이미지로 바뀌었다고 보고 | 과거 성공과 기능 회귀에 관한 사용자 주장. 원본 고해상도 파일을 이 조사에서 검증한 것은 아님 |
| 7월 21일 | 같은 Pro 계정으로 두 Codex 생성 경로를 비교해 high/2160×3040 요청에도 둘 다 1024×1536이 나왔다고 보고. PNG IHDR로 실측했다고 설명 | 특정 중계 도구에만 국한되지 않을 가능성을 시사. 현재 우리 세션과 동일 실행 환경이라고 단정하지 않음 |
| 8월 20일 실험 | 다른 작성자의 Mac mini/Codex CLI 내장 도구 비교에서 기본 요청과 low 품질 지시 모두 1672×941 | 우리 실제 출력과 일치하지만 4K 자체의 대조 실험은 아님 |

출처:

- [Codex App 내장 도구 크기 제어 요청 #19175](https://github.com/openai/codex/issues/19175)
- [고해상도 성공 후 동작 변화 보고](https://github.com/openai/codex/issues/28723#issuecomment-4730508791)
- [7월 21일 두 Codex 경로 비교 실험](https://github.com/openai/codex/issues/28723#issuecomment-5030936712)
- [8월 20일 구독 내장 도구 실험](https://note.com/kakumitsu/n/n8525180ff0db?hl=en)

GitHub 이슈는 OpenAI 공식 저장소에 있지만 내용은 사용자 보고다. #28723의 조회된 댓글 7개는 모두 작성자 association NONE이며 유지관리자의 원인 확인·해결 답변은 찾지 못했다. 해당 이슈도 조회 시 open이다.

## 4K라고 소개된 공개 작업의 실제 방식

[codex-image-optimize-4k-upscale](https://github.com/xuanyidesign/codex-image-optimize-4k-upscale/blob/main/SKILL.md)는 내장 image_gen으로 전체 이미지를 만든 다음 겹치는 영역을 나눠 재생성하고, 위치를 정렬하고 세부 정보를 합성하는 방식을 기술한다. 추가 이미지 API 키 없이 진행하는 설계지만, 단일 호출의 네이티브 4K 출력과는 다르다. 이 프로젝트에서 실행하거나 품질을 검증하지 않았다. 원래 구도와 인물 유지가 필요한 영화 스틸에는 영역별 변형과 접합부를 확인해야 한다.

검색에 나온 다른 4K 도구 중 API 키 모드를 쓰는 도구는 사용자의 내장 도구 조건에 맞는 해결책으로 채택하지 않았다.

## 현재 프로젝트의 결론

- 한 번의 내장 호출로 정확한 UHD 파일을 얻는 검증된 방법은 이번 검색에서도 확인하지 못했다.
- 실제 원본 파일 9개에서 관찰한 약 157만 픽셀 출력은 공개 사용자 실험과 일치한다.
- 이것을 이미지 모델 자체의 영구적인 최대 해상도라고 설명하지 않는다. Codex에서의 출력 제어 문제 또는 회귀 가능성이 있으며, 서버 원인은 미확인이다.
- 내장 생성만 사용하는 영역별 재생성·합성은 별도의 검증 후보로 찾았다. 단일 호출 UHD 성공으로 포장하지 않는다.

검색 핵심어: Codex built in image generation 4K resolution 1672 941; Codex imagegen high resolution 2048 3840 size auto; site:github.com/openai/codex/issues image generation resolution 4k.

선별한 이슈 댓글 기록: `output/heptapod-remaster/reports/codex-resolution-public-reports.json`.
