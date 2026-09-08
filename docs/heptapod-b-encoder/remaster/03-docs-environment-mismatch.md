# 공식 문서와 현재 이미지 생성 환경의 차이

> 후속 정정: 외부 API 문서 비교는 사용자가 요청한 내장 도구 조사에 적합하지 않았다. 내장 확장의 버전별 공개 소스에서 size/quality가 auto로 구성되는 것과 저장 경로에 리사이즈가 없는 것을 추가 확인했다. 최신 결론은 [내장 도구 소스 재조사](04-codex-native-resolution-source-audit.md)를 따른다. 아래 내용은 이전 조사 기록이다.

확인 날짜: 2026-09-08. 생성 재개나 외부 API 전환 없이 조사했다.

## 확인된 원인: 서로 다른 인터페이스 계층

앞서 참조한 `size`, `quality` 문서는 개발자가 Images API 또는 Responses API의 이미지 생성 도구를 구성할 때 사용하는 설정이다. 반면 현재 assistant가 호출하는 도구는 Codex의 이미지 생성 확장 인터페이스다. 이 둘이 동일한 입력 스키마를 가진다고 취급한 것이 잘못된 가정이었다.

| 항목 | 공식 API 문서 | 현재 세션의 내장 도구 |
|---|---|---|
| 호출 인터페이스 | Images API / Responses API image_generation | image_gen.imagegen |
| 크기 제어 위치 | API 요청 또는 tools 설정의 size | 호출 스키마에 노출되지 않음 |
| 품질 제어 위치 | quality 설정 | 호출 스키마에 노출되지 않음 |
| 모델 선택 | 해당 API 설정에서 지정 | 호출 스키마에 노출되지 않음 |
| 현재 가능한 입력 | 모델별 API 옵션 | prompt, referenced_image_paths, num_last_images_to_include |
| 반환에서 확인한 정보 | API 응답 스키마에 따름 | image_url, output_hint |

문서의 `tools: [{type: "image_generation", size: ...}]`는 상위 실행자가 API 요청을 만들 때 구성하는 영역이다. 모델이 호출하는 함수의 `prompt` 텍스트에 `size`를 적는 것과는 다르다. 현재 도구 스키마에는 그 설정을 별도 값으로 전달할 방법이 없다.

공식 근거: [Image generation tool options](https://developers.openai.com/api/docs/guides/tools-image-generation#tool-options).

Codex 제품 문서는 내장 생성의 사용법과 자연어로 크기를 설명하는 방식을 안내한다. 이 문서의 자연어 안내를 특정 픽셀 수 보장이나 API 옵션 전체 노출로 해석하면 안 된다.

공식 근거: [Codex image generation](https://learn.chatgpt.com/docs/image-generation).

## 로컬 구현에서 확인한 근거

설치된 실행 파일:

```text
/Users/ddd/.local/bin/codex
→ /Users/ddd/.codex/packages/standalone/releases/0.153.4-aarch64-apple-darwin/bin/codex
```

인접 `codex-package.json`은 버전 0.153.4, variant codex로 표시한다.

바이너리의 문자열·타입 이름에서 확인:

- 현재 세션의 imagegen 도구 설명과 동일한 문구: byte 168257258 부근.
- `struct ImagegenArgs with 3 elements`: byte 168256274 부근.
- 필드 `prompt`, `referenced_image_paths`, `num_last_images_to_include`.
- 타입 `codex_image_generation_extension::tool::ImagegenArgs`.
- 내장 소스 경로 표시 `ext/image-generation/src/tool.rs`, `backend.rs`, `extension.rs`.
- 백엔드 관련 경로 표시 `codex-api/src/endpoint/images.rs`.

따라서 이 3개 필드의 인터페이스가 단순한 프로젝트 스킬 설명만이 아니라 **Codex 자체 이미지 생성 확장 구현에도 존재**함을 확인했다.

이 사실만으로 현재 대화가 바로 그 로컬 실행 파일에서 실행된다고 단정하지 않는다. 시스템이 현재 세션에 제공한 도구 스키마와 설치된 구현이 일치한다는 수준의 증거다.

추가 문자열·심볼 검사에서는 `ImageGenerationTool`의 handle/spec, `ImagegenArgs` 스키마, `save_image_generation_result`, `backend::image_request_headers`, 이미지 아티팩트 경로 처리, `images/edits` 및 `images/generations` 경로를 확인했다. `generated image exceeds the executor file size limit` 오류도 있지만 이것은 파일 바이트 제한 문구이며 픽셀 제한이나 다운스케일 증거가 아니다. 이 검사로 요청 size가 생략·auto·고정 중 무엇인지 확정할 수 없었다.

구체적인 오프셋과 해석 범위: `output/heptapod-remaster/reports/native-wrapper-evidence.txt`.

## 배제할 수 있는 원인

- 프로젝트의 HTML 미리보기만 작아진 경우: 아님. 생성 저장 폴더의 PNG 자체가 작다.
- 프로젝트로 복사하면서 축소한 경우: 아님. 9개 고유 후보의 도구 저장 원본과 프로젝트 복사본 SHA-256이 모두 일치한다.
- 프롬프트에서 해상도 요청을 빠뜨린 경우: 아님. 실제 저장 프롬프트에 UHD 크기와 최대 native resolution 지시가 존재한다.
- 스킬 문서가 API의 size 옵션을 내장 함수 인자에 추가해주는 경우: 아님. 스킬은 지침이고 실제 직렬화 인자 구조는 따로 있다.

실측: 원본 반환 파일은 1672×941 또는 1670×941이다. 검사 기록은 `output/heptapod-remaster/reports/resolution-environment-audit.json`에 있다.

## 아직 확정할 수 없는 부분

- 내장 확장이 서버에 전송하는 effective size/quality/model 값.
- 생성 서버가 처음부터 약 157만 픽셀로 생성하는지, 전달 전에 축소하는지.
- 이 동작이 계정·제품 버전·배포 설정 중 어느 조건에 의해 정해지는지.
- 내장 모델의 실제 실행 ID. 현재 반환 필드에는 모델 ID가 없다.

출력 크기가 비슷한 픽셀 수로 모인다는 것은 관찰이다. 이를 고정 다운스케일 제한이나 구형 모델의 증거라고 단정하지 않는다. CLI 버전이 오래됐다고 추측하여 업데이트를 해결책으로 제시하지도 않는다.

## 작업에 미치는 의미

현재 확인된 차이는 프롬프트 작성 방식보다 **내장 확장의 옵션 노출 범위**에서 생긴다. 정확한 크기를 내장 모델로 제어하려면 도구를 제공하는 실행 환경이 해당 크기를 설정하거나 assistant에게 인자로 노출해야 한다.

이 조사에서 그 옵션을 켜는 지원된 사용자 설정은 찾지 못했다. 그러므로 임의 config 키를 만들거나 로컬 바이너리를 수정하지 않는다. API 전환을 다시 요청하지 않으며, 고해상도 제어 방식이 검증되지 않은 상태에서 추가 이미지를 생성하지 않는다.
