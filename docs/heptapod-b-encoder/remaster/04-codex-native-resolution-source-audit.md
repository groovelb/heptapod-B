# Codex 내장 이미지 해상도: 제품 안내와 실제 구현 재조사

> 후속 웹 검색에서 Codex 구독 인증 경로의 과거 고해상도 성공 및 이후 회귀 주장, 현재의 유사 출력 실험을 찾았다. 아래 소스 분석은 고해상도 생성 능력 전체의 부정이나 영구 제한의 증거가 아니다. [웹 검색 추가 근거](05-codex-native-resolution-web-evidence.md)를 함께 참조한다.

확인일: 2026-09-08. 외부 이미지 생성 API 호출, 브라우저 자동화, 추가 이미지 생성 없이 읽기 전용으로 조사했다.

## 조사 정정

사용자의 조건은 Codex 구독에 포함된 내장 이미지 도구 사용이다. 외부 API 사용법을 내장 도구의 사용법처럼 적용한 이전 조사는 부적절했다. 이 문서는 Codex 제품 안내와 OpenAI가 공개한 Codex 내장 확장 소스만으로 해상도 제어를 설명한다.

## 공식 제품 안내

[Codex 이미지 생성 안내](https://learn.chatgpt.com/docs/image-generation)는 내장 이미지 생성이 gpt-image-2를 사용하며 Codex 사용 한도에 포함된다고 설명한다. 자연어로 이미지를 요청하며 필요하면 dimensions를 명시하도록 안내한다. 해당 안내에는 특정 픽셀 출력의 보장이나 별도의 해상도 설정 스위치가 제시되어 있지 않다.

따라서 자연어 크기 요청은 지원되는 사용 방식이다. 이것이 정확한 픽셀 수를 항상 보장한다거나, 반대로 내장 모델에서 고해상도가 불가능하다고 해석하지 않는다.

## 새로 확인한 직접 증거: 생성·편집 요청 모두 auto

로컬 설치 메타데이터에서 확인한 버전 0.153.4에 맞춰 OpenAI 공식 저장소의 `rust-v0.153.4` 태그를 읽었다. main 브랜치에서도 같은 요청 설정을 확인했다.

- [tool.rs — 생성 요청 구성, 422–429행](https://github.com/openai/codex/blob/rust-v0.153.4/codex-rs/ext/image-generation/src/tool.rs#L422-L429)
- [tool.rs — 편집 요청 구성, 469–477행](https://github.com/openai/codex/blob/rust-v0.153.4/codex-rs/ext/image-generation/src/tool.rs#L469-L477)

두 경로 모두 내부 코드에서 `quality: Some(ImageQuality::Auto)`와 `size: Some("auto".to_string())`를 직접 설정한다. 모델 이름은 58행의 `gpt-image-2` 상수를 사용한다. 프롬프트는 `args.prompt.clone()`으로 전달된다. 클라이언트가 프롬프트의 숫자를 추출해서 size를 덮어쓰는 분기는 이 요청 구성 함수에 없다.

이것은 별도 과금 API로 전환하라는 안내가 아니다. 사용자가 쓰는 내장 도구 자체가 요청을 어떻게 구성하는지 소스로 확인한 것이다.

## 숨은 인자·설정 가능성

- [ImagegenArgs, 87–95행](https://github.com/openai/codex/blob/rust-v0.153.4/codex-rs/ext/image-generation/src/tool.rs#L87-L95): prompt, referenced_image_paths, num_last_images_to_include만 받으며 `deny_unknown_fields`가 지정되어 있다. 임의로 size 인자를 추가하면 지원되는 호출이 되지 않는다.
- [extension.rs](https://github.com/openai/codex/blob/rust-v0.153.4/codex-rs/ext/image-generation/src/extension.rs): 이미지 확장이 읽는 설정은 사용 가능 여부, provider, save_root다. 이 확장의 설정 구성에는 출력 해상도 항목이 없다.
- 따라서 이 버전의 해당 구현에서는 사용자 config나 모델 호출 인자를 통해 auto를 정확한 픽셀 크기로 바꾸는 경로가 확인되지 않는다. SKILL.md 편집으로 이 런타임 동작을 바꿀 수 없다.

## 반환 후 로컬 축소 여부

- [backend.rs](https://github.com/openai/codex/blob/rust-v0.153.4/codex-rs/ext/image-generation/src/backend.rs)는 구성된 요청을 전달한다.
- [endpoint/images.rs](https://github.com/openai/codex/blob/rust-v0.153.4/codex-rs/codex-api/src/endpoint/images.rs)는 요청을 직렬화하고 응답 JSON을 해석한다.
- [tool.rs, 178–190행](https://github.com/openai/codex/blob/rust-v0.153.4/codex-rs/ext/image-generation/src/tool.rs#L178-L190)는 응답의 첫 이미지 b64_json을 가져온다.
- [저장 함수, 270–401행](https://github.com/openai/codex/blob/rust-v0.153.4/codex-rs/ext/image-generation/src/tool.rs#L270-L401)는 Base64를 디코딩하고 바이트를 파일에 쓴다. 검사한 저장 경로에는 이미지 리사이즈가 없다. 32 MiB 제한은 초과 시 오류를 내는 파일 크기 검사이며 다운스케일 작업이 아니다.
- 앞서 검사한 생성 원본과 프로젝트 복사본 9쌍도 SHA-256이 일치한다. 실제 출력은 1672×941 또는 1670×941이다.

## 결론과 남은 한계

확인된 내장 구현은 크기·품질 자동 선택 방식이다. 프롬프트에 3840×2160을 적어도 요청 설정 자체는 auto이며, 실제 크기는 반환 파일로 검증해야 한다. 이전 시도는 UHD 출력을 얻지 못했다.

공개 소스와 로컬 설치 버전, 세션에 노출된 스키마는 서로 부합하지만 현재 세션의 서버 측 실행 코드를 직접 관측한 것은 아니다. 서버가 auto에서 왜 약 157만 픽셀을 선택했는지, 서버 내부에 추가 축소가 있는지는 이 공개 클라이언트 소스로 확정할 수 없다. 고해상도 지원 전체가 불가능하다는 결론도 내리지 않는다.

사용자에게 필요한 정확한 해상도 강제 방법은 이 내장 구현에서 찾지 못했다. 같은 4K 프롬프트 반복을 검증된 해결책으로 제시하지 않는다. 추가 과금 API 전환, 임의 설정 추가, 바이너리 수정은 수행하지 않았다.
