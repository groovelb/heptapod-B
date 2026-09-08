# 실제 랜딩과 접촉막 효과 확인

2026-09-08. 로컬 코드·현재 MP4 해시·실제 생성 요청 기록 기준. 브라우저나 배포 상태는 확인하지 않았다.

- 현재 랜딩 경로: `src/data/heptapodHeroStory.js:23–27`의 hero-scrub-1920.mp4 / hero-scrub-960.mp4 / hero-scrub-poster.jpg. 실제 video 재생은 `src/components/scroll/VideoScrubbing.jsx:486–502`.
- 현재 desktop SHA256: `9452fdac3e044caa40e961d72579affac7fc569db09e7b01bc05e7a6601dd165`. video-v2/staging 합본과 일치. C06은 video-v2 attempt1, C08은 video-v2 attempt2가 납품 manifest에 채택되어 있다.
- 히어로 자체에 스크린 연기 shader는 없다. 마지막에는 단색 #d6e8ed가 0.65초 페이드인하며 /canvas로 이동한다.
- 별도의 /canvas 안개는 `LogogramChamber.jsx:14–32,100–142,187–188`: 서로 다른 세기와 크기의 SVG fractalNoise 3겹, blur14/8/2px, opacity0.5/0.32/0.14, 서로 다른24/31/40초 drift, 두 겹의8초 확대 루프. 이것을 영상 속 스크린에 이미 적용한 것으로 혼동하면 안 된다.

## 실제 이미지·영상 프롬프트

[원본 이미지 설계](../05-hero-cinematic-prompt-template.md)는 접촉막을 `luminous cold white fog/contact wall`, `desaturated blue-grey fog`, `soft halation`으로 지정한다. 공간 속 고정된 벽이라는 설명과 그 안개 재질을 구분한다.

[실제 C08 생성 기록](../../../public/heptapod-b-encoder/hero-motion/kling-audio-11-screen-fill/submissions-11-screen-fill-camera-push-v4.json)은 `fixed luminous membrane`, `subtle cold white texture`와 함께 `No mist, no smoke, no fog, no haze`를 포함한다. negative_prompt도 smoke/fog/mist/haze를 포괄적으로 금지한다. 이 문장을 그대로 유지한 채 움직이는 안개를 요청하면 상충한다. 당시 목적은 막에서 연기가 분출해 장면을 덮는 실패를 막는 것이었으나, 새 효과에서는 방출 금지와 막 내부 밀도 변화 허용을 분리해야 한다.

## 실패한 접근과 이번 수정

- 전체 장면 I2V 재생성: 인물·카메라·방까지 새로 샘플링되어 사용자가 보존하라고 한 요소가 변함.
- 마지막 로컬 waver: 기존 픽셀 좌표를 sine displacement로 흔든 처리. 실제 안개 밀도·겹침·이동을 만들지 못함. 사용자가 거절했다.
- 이번에는 현재 실제 랜딩 MP4의 마지막1128프레임에서 접촉막만 있는 이미지 자체를 추출해 레퍼런스로 쓴다.
- 그 이미지로 방·인물·테두리가 없는 안개 영상 한 장만 생성한다. 프롬프트는 고정 카메라, 겹쳐 흐르는 반투명 mist layers, wisps의 밀도 변화, 낮은 대비·차가운색·확산광을 명시한다. 이미지 흔들림·왜곡·줌·수면 파문은 금지한다.
- 기존6·8번 영상의 인물·테두리 보호 마스크 안에 해당 안개 영상만 합성한다. 원본 영상의 좌표를 remap하지 않는다. 원본 인물·카메라·구조·길이·오디오는 유지한다.
- 새 영상은 사용자 검토용으로 먼저 전달하고 랜딩에는 자동 적용하지 않는다.

실행·실제 prompt: `output/heptapod-remaster-midjourney/run-20260908-01/video-screen-fog-plate-r1/plate-spec.json`
