# 내장 이미지 도구의 정확한 출력 해상도 제어 조사

확인 날짜: 2026-09-08. 사용자 조건: 내장 이미지 모델만 사용, 외부 API 전환 안 함.

## 결론

모델의 지원 해상도와 현재 도구 인터페이스의 제어 가능 범위는 다르다. 현재 세션의 내장 이미지 도구에서는 정확한 width/height를 지정하는 인자가 노출되지 않는다. 프롬프트에 3840×2160을 반복해서 넣는 방식은 실제 결과에서 크기를 고정하지 못했다.

따라서 현재 연결된 인터페이스만으로 '내장 생성 + 정확한 3840×2160'을 달성하는 검증된 방법을 찾지 못했다. 이것은 GPT Image 2 모델 자체가 4K를 지원하지 않는다는 의미가 아니다.

## 1. 공식 문서에서 확인한 실제 제어 지점

OpenAI의 이미지 생성 도구 문서는 `size`, `quality`, `output_format`을 도구 설정으로 구분한다. `size`가 픽셀 크기이고 `quality`는 렌더링 품질이다. `auto`에서는 모델이 프롬프트를 바탕으로 선택한다. 이 설정 설명은 Responses API의 이미지 생성 도구에 관한 것으로, 현재 세션의 별도 도구 스키마와 같다고 가정하면 안 된다.

출처: [Image generation tool options](https://developers.openai.com/api/docs/guides/tools-image-generation#tool-options).

GPT Image 2 가이드는 3840×2160을 지원 예시로 명시하며, 2560×1440을 초과하는 픽셀 수는 실험적이라고 설명한다. `input_fidelity`는 입력 보존을 위한 개념이며 출력 크기 조절이 아니다. GPT Image 2에서는 이 필드를 생략한다.

출처: [Image generation output options](https://developers.openai.com/api/docs/guides/image-generation#customize-image-output).

정확한 크기를 제어할 수 있는 인터페이스에서의 개념적 설정은 다음과 같다. 이것을 이번 세션 도구에 실제 전달한 것은 아니다.

```json
{
  "size": "3840x2160",
  "quality": "high",
  "output_format": "png"
}
```

## 2. 현재 세션 도구의 실제 스키마

현재 노출된 `image_gen.imagegen`의 입력:

```text
prompt: string
referenced_image_paths?: string[]
num_last_images_to_include?: number
```

`size`, `width`, `height`, `resolution`, `quality`, 모델 선택 인자는 없다. 이러한 키를 JSON처럼 프롬프트 안에 적어도 실제 도구 인자를 설정한 것이 아니다. 지원되지 않는 키를 도구 인자에 임의로 추가해 유효한 제어 방식이라고 주장하지 않는다.

반환에서 직접 확인할 수 있었던 항목은 `image_url`, `output_hint`다. raw model resolution, 별도 원본 다운로드 경로, effective size 설정은 제공되지 않았다. 반환된 이미지 파일과 지정된 저장 폴더를 직접 검사했다.

## 3. Codex 제품 문서와 로컬 CLI

제품 문서는 내장 이미지 생성이 GPT Image 2를 사용한다고 설명하며, 프롬프트에 구도와 크기를 포함하도록 안내한다. 그러나 이 문서에서 특정 픽셀 크기를 강제하는 UI나 플래그는 찾지 못했다.

출처: [Codex / ChatGPT image generation](https://learn.chatgpt.com/docs/image-generation).

공식 설정 reference에서도 이미지 생성의 출력 해상도 설정을 찾지 못했다.

출처: [Configuration Reference](https://learn.chatgpt.com/docs/config-file/config-reference).

로컬 read-only 확인:

- 설치 버전 `codex-cli 0.153.4`.
- `codex --help`, `codex exec --help`, `codex app-server --help`, `codex debug --help` 검사.
- `--image`는 초기 프롬프트에 이미지를 첨부하는 입력 옵션.
- `--output-schema`는 최종 텍스트 응답의 JSON 스키마 옵션.
- 범용 `-c key=value`의 존재만으로 해상도 설정 키가 있다고 판단할 수 없음.
- 위 인터페이스에서 출력 image size/resolution/quality 플래그는 발견되지 않음.
- 세션 실행, 글로벌 설정 변경, 인증 정보 조회, 비공개 엔드포인트 접근은 하지 않음.

문서에 없는 내부 옵션의 존재까지 부정하는 결론은 아니다. 현재 접근 가능한 인터페이스에서 확인된 사실만 기록한다.

## 4. 실제 생성 결과

생성 프롬프트에 다음 내용을 사용했으나 반환 크기는 바뀌지 않았다.

- `3840 pixels wide by 2160 pixels tall`.
- `maximum supported native resolution`.
- 참조 이미지는 구도 기준이며 출력 픽셀 크기 기준이 아니라는 지시.
- 프롬프트 첫 문장과 마지막 문장에서 출력 규격 재명시.

현재 저장된 후보들은 1672×941 또는 1670×941이다. 프로젝트 파일과 도구의 원본 저장 경로에 있는 PNG의 크기를 비교했으며, 단순히 HTML이나 대화 미리보기가 축소된 문제가 아니었다. 프로젝트 복사는 이미지 바이트를 그대로 보존했다.

확인한 root 생성 폴더에는 반환 PNG 두 개만 있으며 별도 UHD 버전은 없었다. PNG 자체에도 고해상도 원본을 가리키는 메타데이터가 없다. 도구 밖에 접근할 수 없는 원본이 존재하는지 여부는 확인할 수 없다.

여러 결과가 약 157만 픽셀로 모이므로 출력 전달 과정에 크기 제한이 있을 가능성이 있다. 다만 내부 구현을 확인한 것이 아니므로 확정된 제한값이나 원인으로 기록하지 않는다.

## 5. 잘못된 가정과 수정

- 잘못된 가정: 프롬프트를 더 강하게 쓰면 내장 도구의 정확한 출력 크기를 고정할 수 있다.
- 수정: 자연어 요청은 했지만 실제 크기를 강제하는 설정을 전달하지 못했다. 실제 결과에서도 해상도는 증가하지 않았다.
- 잘못된 진행: 크기 지정 방식이 검증되지 않은 상태에서 후보 생성을 계속했다.
- 수정: 모든 추가 호출을 중단하고 진행 중이던 요청의 반환 파일만 보존했다. 생성된 후보는 색감·디테일 시험본이며, 4K 완료본으로 분류하지 않는다.

## 6. 사용자 조건 안에서 남은 실행 조건

외부 API로 전환하지 않는다. 내장 경로로 정확한 픽셀 크기를 보장하려면, 이 세션에 제공되는 생성 도구 또는 제품 UI가 출력 `size`를 직접 설정할 수 있도록 노출해야 한다. 현재 권한과 도구 목록에서 이를 활성화하는 검증된 설정을 찾지 못했다.

업데이트나 특정 UI가 반드시 이 기능을 제공한다고 주장할 근거도 현재 없다. 따라서 확인되지 않은 플래그, 설정 파일 키 또는 비공개 호출을 제안하지 않는다. 같은 자연어 지시만 바꾸어 생성 횟수를 늘리지 않는다.

보존된 결과와 프롬프트: `output/heptapod-remaster/`. 영상 API 호출은 수행하지 않았다.
