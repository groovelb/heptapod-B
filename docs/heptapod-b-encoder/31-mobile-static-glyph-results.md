# 모바일 정적 표식 전환 결과

2026-09-09 적용. 계획: `30-mobile-static-glyph-orchestration.md`, 구현 규격: `mobile-static-glyph-contract.md`.

## 적용 범위

- 900px 미만 ArchiveGlyph/GlyphNode는 실제 PNG 이미지로 표시한다. 목록에서 live Canvas를 잠깐 마운트하거나 실패 시 Canvas로 되돌리지 않는다.
- `ArchiveSelectedGlyph` 하위 전체는 live 예외다. `/glyph/:id` 및 아카이브 내부 선택 상세가 같은 정책을 사용한다.
- 생성 화면의 확정 개인 결과·분석은 live 유지. 입력 중 작은 미리보기와 분해된 문자 그리드는 정적 이미지다.
- PC는 기존 렌더러 유지. 모바일 메인 2×2, 시간순 원형 표식, 세로 항목 구성, 아카이브 인덱스의 투명 배경도 유지한다.
- DB UUID 표식은 `/api/glyph-image/:id`, 계열·유형·시간순 저작 표식은 로컬 manifest의 사전 생성 PNG, 미저장 모델은 로컬 Worker에서 한 번 생성한다. 미저장 이름/모델은 서버로 보내지 않는다.

## 후속 수정: 프런트에서 먼저 표시

사용자 피드백에 따라 공개 표식도 이미 받은 `model_data`로 Worker에서 256px PNG를 먼저 생성해 표시한다. 서버의 저장 PNG는 디코딩이 끝난 뒤 같은 영역에서 교체한다. 서버가 늦거나 실패해도 먼저 생성한 표식은 유지하며, 동일 모델의 미리보기는 기존 bounded 캐시로 재사용한다. 메인 스레드의 Canvas나 애니메이션 루프는 추가하지 않는다.

이 변경은 서버 응답을 기다리는 시간을 첫 표시와 분리한다. 원격 API의 응답 시간 자체를 줄였다는 뜻은 아니다. 후속 UI 검사 72개와 Next build가 통과했다. 서버·DB·자동 생성 작업은 이 후속 수정에서 변경하지 않았다.

## 실제 데이터 적용

- 연결된 Supabase 프로젝트: `jkeghathfojadnyrlxve`.
- 공개 표식 **45/45 ready**. encoder_version 1은 34개, version 2는 11개.
- 비공개 `glyph-images` 버킷에 **90개**(256/512px) 저장. 원격 Storage 집계 **1,160,380 bytes**.
- 처리 전후 45개 원본 model_data와 encoder_version을 정규화하여 전수 대조: 변경 없음.
- 고정 저작 표식 28종은 **56개** PNG로 생성. 전체 **724,070 bytes**, 브라우저에는 필요한 크기만 요청한다.
- 마이그레이션 `20260909100000_glyph_static_images.sql`, `20260909101000_glyph_image_scheduler.sql` 적용 완료.
- Edge `archive-glyph-image-worker` 배포, worker secret 설정, Vault 연동 및 `glyph-images-every-minute` 스케줄 활성화 완료.
- 배포된 Edge에 실제 호출하여 생성 성공. 이후 cron 실행 succeeded 및 pg_net 응답 HTTP 200 확인.
- Next.js 앱 변경은 현재 작업 트리에 적용했다. 앱의 별도 운영 프런트엔드 배포는 수행하지 않았다. 실행 중인 로컬 3000 포트에서 새 이미지 API를 확인했다.

## 동작과 실패 처리

신규 공개 트랜잭션이 DB 트리거로 이미지 작업을 등록한다. 매분 스케줄은 실행 가능한 작업이 있을 때만 Edge 소비자를 호출한다. 호출당 2개를 처리한다. 초기 기존 데이터는 별도 bounded backfill로 완료했다.

작업은 lease·제한 재시도·만료 lease 회수·최대 시도 소진 처리 기능을 가진다. 필수 두 크기 저장이 완료된 후 ready로 전환한다. 공개 취소 또는 모델 변경 시 기존 lease를 무효화한다. 오래된 이미지는 API와 Storage RLS에서 접근되지 않는다.

이미지 API는 현재 공개 상태·모델 해시·버전·정확한 variant 경로를 확인하고, 저장 이미지를 내려받은 뒤 다시 확인한다. 원본 공개 취소 동작 보존을 위해 `private, no-store`를 사용한다. CDN에 영구 공개하거나 재사용 가능한 서명 URL을 노출하지 않는다.

새 이미지가 아직 준비되지 않았을 때 크기와 이름·상세 진입을 보존한다. 이미지 재시도는 15/30/60/120초로 제한하고 컴포넌트 해제 시 취소한다. 로컬 Worker 캐시는 미사용 32개·전체 64개·대기 32개를 상한으로 두며 Blob URL을 해제한다.

자동 실행 구조는 [Supabase의 Edge Function 스케줄링 문서](https://supabase.com/docs/guides/functions/schedule-functions)를 참고했다.

## 검증

- 정적 이미지 렌더러 6개 테스트, 실제 DB45개 × 두 해상도 생성 성공.
- 저장 파이프라인 54개 검사: 키·무결성·재시도·CAS·취소·중단 복구·전체 조회·실제 PNG 처리.
- 모바일 UI 59개 검사: 모바일 img, PC live, 상세 live, 실패 fallback 없음, Worker/캐시 재사용.
- 로컬 PostgreSQL 검사: 신규 등록 자동 큐, 최소 권한, 공개 취소, 오래된 lease 쓰기 거부, 소진된 lease 정리, scheduler 설정 권한.
- 기존 모바일 Archive 레이아웃 676개, 탐색 상태 186개, 모바일 상세 축소 고정 68개, GlyphNode 14개, 생성 결과 227개 검사 통과.
- 대상 ESLint, Deno Edge 검사, Next production build 통과.
- 실제 HTTP: 로컬 `/api/glyph-image/:id`의 256/512 PNG 200, 없는 UUID 404.
- `pnpm run test:static-glyphs`로 신규 Node 검사 재실행 가능.
- `pnpm run check-agent-rules`는 저장소에 스크립트가 없어 실행할 수 없었다. 이를 통과로 기록하지 않는다.

## 성능 증거와 한계

표식별 입자 생성 및 Canvas 그리기가 모바일 목록의 메인 스레드 경로에서 제거된다. 후속 프런트 우선 표시에서는 작은 미리보기의 입자 계산이 Worker에서 한 번 발생한다. 로컬 표본 생성 중앙값은 256px 약 10ms, 512px 약 24ms로 서버/Worker에서 한 번 발생한다. 한 이미지의 생성 시간을 모바일 FPS 개선율로 환산하지 않는다.

현재 로컬 개발 서버를 통한 실제 원격 이미지 응답은 표본 약 1.0~1.6초, 최초 개발 라우트 요청은 약 2.2초였다. 공개 상태 재검증과 원격 Storage 전송 비용이 포함된다. 이 결과는 운영 배포 서버나 모바일 회선의 응답 시간을 대신하지 않는다. lazy loading과 크기 예약을 적용했으며 페이지 전체가 더 빨라졌다고 단정하지 않는다.

Canvas draw 좌표로 만든 독립 참조 이미지와 비교하여 1px 범위 형태 일치 99% 이상, 평균 alpha 오차 0.391/255를 확인했다. 서로 다른 subpixel AA로 픽셀 완전 동일은 아니다. 로컬 비교 PNG를 직접 확인했다.

브라우저 자동화나 실기기 스크롤 FPS·발열 측정은 수행하지 않았다. 의미 계산, 모델 JSON 전송, 안개 효과 등의 다른 비용은 이번 변경으로 제거되지 않는다.

로컬 운영 증거: `output/mobile-static-glyphs/backfill-before.json`, `backfill-after.json`, `model-preservation.json`, `renderer-measurements.json` 및 비교 PNG. 이 디렉터리는 Git 추적 대상이 아니다. 서버 키와 worker secret을 보고서나 프런트엔드에 기록하지 않았다.
