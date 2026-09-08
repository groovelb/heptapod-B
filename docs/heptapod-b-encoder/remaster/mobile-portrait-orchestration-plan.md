# V2 모바일 세로 이미지·영상 병렬 제작 계획

작성일: 2026-09-08. 상태: 설계만 완료. 에이전트 실행·유료 생성·랜딩 변경 없음.

## 목표와 고정 조건

현재 랜딩 코드가 참조하는 Topaz V2의 이야기·인물·공간·색감·길이를 기준으로, 모바일 세로 이미지와 영상을 제작한다. 이미지의 기존 유효 영역을 보존하고 세로 프레임에 부족한 바깥 영역만 확장한다. 그 이미지를 입력으로 기존 이미지→영상→컷 조립 순서를 재사용한다.

- 작업 브랜치: 현재 `main`. 별도 Git 브랜치 생성 없음.
- 기본 설계 비율: 9:16. 작업·납품 마스터 목표 2160×3840, 24fps. 이는 목표 규격이며 생성 서비스의 원생 출력 규격을 확인했다는 뜻은 아니다. 원생 크기와 업스케일 크기를 구분해 기록한다.
- 이야기: 접근 → 탑승·상승 → 입구 진입 → 내부 상승 → 천장 접촉면 접근 → 중력 전환 → 하차·보행 → 동일 접촉면으로 화면 채우기.
- 컷 요청 길이: C01–C08 각각 4 / 8 / 5 / 6 / 6 / 6 / 6 / 6초. 기존 조립 결과 1,129프레임, 영상 트랙 47.041667초, 컨테이너 약 47.09초를 유지한다.
- 기존 42초 자동 재생 진입, 스크롤·캡션·섹션 표시·오디오 타이밍 유지. 납품에는 기존 음원을 사용한다.
- 과도한 움직임 자체를 새 실패 기준으로 삼지 않는다. 인물 소실, 오브젝트의 갑작스러운 출현, 공간 불연속, 스크린 분리, 색감 급변을 판정한다.
- 새 색보정·안정화·광학 흐름 보간·속도 변경·디졸브·배경 합성으로 결함을 숨기지 않는다. 정지 이미지 아웃페인팅과 영상 후처리는 구분한다.
- 브라우저 자동화는 사용자의 별도 명시 요청 전까지 금지. 로컬 파일, ffprobe, 프레임 추출, 직접 이미지 검사, curl, 비브라우저 테스트로 검증한다.

## 확인한 기준 자료와 우선순위

1. `src/data/heptapodHeroStory.js`의 현재 소스: `public/heptapod-b-encoder/hero-scrub-v2-topaz/hero-scrub-3832.mp4`. 기록 SHA-256은 `f73b63b47e6e08cead38db0b08764a004328d4fc3d29e4295820b666b2a4212b`.
2. `output/heptapod-remaster-midjourney/run-20260908-01/video-v2-ready-r1/topaz-landing-integration.json`: Topaz 마스터와 웹 인코딩 관계, 3832×2160 / 24fps / 1,129프레임 확인.
3. 같은 폴더의 `staging-screen-restored/assembly-validation.json`, `source-policy.json`, `restoration-record.json`: 실제 채택 C01–C07 생성 원본과 C08 기존 승인 스크린 내부 연기 합성본의 조립 근거.
4. `variation/selected-manifest.json` 및 각 채택 클립의 실제 요청 영수증: 원본 이미지와 프롬프트 추적. 예전 공통 `prompt-revision.json`이나 `delivery-manifest.json`은 이력 자료이며 최신 채택 목록으로 간주하지 않는다.

현재 모바일 파일은 960×542 가로 영상이다. 이번 세로 전용 제작과 구분한다. 라이브 배포 파일은 이번 설계에서 조회하지 않았으므로 위 기준은 현재 로컬 랜딩 코드 기준이다. 실행 준비에서 제공 바이트와 기준 해시를 확인한다.

주의: 현재 마지막 C08의 연기 효과는 프롬프트만으로 완성된 것이 아니라, 기존에 승인된 스크린 내부 연기 레이어를 사용했다. 따라서 과거 프롬프트를 복사하면 효과도 자동 재현된다고 가정하지 않는다. 새 세로 영상에서 먼저 생성 결과를 판정하고, 실패했다고 새 후합성을 자동 적용하지 않는다.

## 원본 보존·세로 구도 계약

1. root가 각 컷의 원본 이미지, 채택 영상 시작·중간·끝 프레임, 실제 요청을 연결한 출처 목록을 만든다. 최신 영상과 이미지가 다르면 차이를 기록하고 현재 V2에 더 가까운 입력을 선정한다. 예전 후보를 이름이나 수정 시각만 보고 선택하지 않는다.
2. 생성 없이 원본으로 세로 구도 시안을 만든다. 원본 전체를 작게 축소해 가운데 끼우지 않는다. 인물 그룹·리프트·입구·접촉면이 유지되도록 컷별 균일 배율과 위치를 정하고, 잘라도 되는 주변과 반드시 남겨야 할 대상을 명시한다. 여러 중요 대상이 들어가지 않으면 배율을 조정하며 인물·기계를 재배치해서 해결하지 않는다.
3. 이웃 컷의 구도·확장 방향을 함께 정한다. 각 이미지에 원본 좌표→세로 좌표 변환, 보호 영역, 생성 마스크, 경계 연결용 기준점을 기록한다. 동일 공간의 반복 경계는 같은 확장 배경 기준을 재사용한다. 실제 자세·시점이 다른 IN/OUT 이미지를 무조건 같은 이미지로 덮어쓰지 않는다.
4. 기존 이미지에 없는 영역만 생성한다. 원본 보호 영역은 고정된 단일 리사이즈 결과를 기준으로 보존한다. 도구가 보호 영역까지 변경하면 그 결과는 채택하지 않는다. 마스크를 실제로 지키는 편집 방식인지 첫 정지 이미지에서 확인한다.
5. 정지 이미지 단계에서는 보호 영역 픽셀 차이와 경계 색·명암을 측정한다. 영상 생성은 전체 프레임을 새로 예측하므로 보호 픽셀의 동일성을 보장할 수 없다. 인물·물체·공간의 시간적 일관성은 별도로 검수한다. 같은 스냅샷을 사용했다는 사실만으로 무불연속을 보장하지 않는다.
6. 9:16 외에 실제 모바일 비율 9:19.5, 9:20에서 `cover`로 잘리는 범위를 계산해 인물과 스크린이 남는지 확인한다. 중앙 고정 크롭을 먼저 적용하고 컷마다 움직이는 자동 리프레이밍은 도입하지 않는다.

## 병렬화 결정과 작업 그래프

패턴: 짧은 병렬 조사 → 공통 구도 확정 → 단계별 제작·검수. root 포함 최대 4개 슬롯, 작업자 최대 3명. 실제 실행 전 활성 작업을 확인하고 남은 슬롯에 맞춘다. 원격 생성 제출권은 root의 단일 큐에만 둔다. 최대 2건 동시 제출을 계획 상한으로 하되 서비스 한도와 비용 상한이 더 낮으면 그에 맞춘다.

| ID / 담당 | 독점 범위 | 선행 조건 | 산출물·완료 조건 | 주요 위험 |
|---|---|---|---|---|
| P0 / root | 기준 파일·실행 루트·공통 계약 | 없음 | 기준 해시·이력 우선순위·요청 비용 상한 고정 | 과거 후보 혼입 |
| D-A / explorer | 조사 보고 A: 원본과 실제 생성 요청 추적 | P0 | C01–C08의 이미지·요청·클립 출처, 누락 표시 | 폐기 프롬프트 재사용 |
| D-B / explorer | 조사 보고 B: 세로 프레이밍·공간 연결 | P0 | 보존 대상·마스크 초안·7개 연결부 위험 | 작은 스크린과 실제 벽면 분리 |
| D-C / explorer | 조사 보고 C: 모바일 소스·재생 계약 | P0 | 소스/포스터 선택 위치, 타이밍·인코딩·검사 목록 | 모바일에서도 가로 포스터 표시 |
| J0 / root | manifest·구도·프롬프트·제출 큐 | D-A+B+C | 충돌 해소, 파일럿 입력 확정 | 설계가 확정되기 전 과금 |
| A / worker | `groups/ascent/`: C02–C05 | J0 및 단계별 통과 | 상승→천장 진입을 하나의 연결 단위로 검수 | 배경 교체·인물 소실 |
| B / worker | `groups/ending/`: C06–C08 | J0 및 단계별 통과 | 중력 전환→스크린 접근·내부 연기 검수 | 스크린/카메라 흔들림 |
| C / worker | `groups/opening/`: C01, `qa/cross/` | J0; 교차 검수는 후보 도착 후 | 첫 이미지·포스터와 이웃 컷 교차 검수 | 전역 색감·배율 불일치 |
| J1 / root | 선택 manifest·조립·최종 보고 | 모든 이미지/클립 및 연결부 통과 | 세로 마스터·포스터·출처·검증 보고 | 이전 영상 조각 혼입 |

실행 루트 예정: `output/heptapod-mobile-portrait-v2/run-01/` (이번에는 만들지 않음). 조사 담당은 `research/A.md`, `B.md`, `C.md`만 작성한다. root는 `baseline.json`, `framing.json`, `selection.json`, `requests/`, `clips/`, `staging/`의 단독 작성자다. 작업자 사이 공유 파일 직접 수정 금지.

## 단계와 합류 조건

1. **P0 + 병렬 조사.** root는 기준 해시·길이·현재 미커밋 변경 범위를 보존하고, D-A/B/C가 독립 조사한다. root는 동시에 요청 원장과 프레임 조립 계약을 준비한다. 조사당 15분에 1차 보고하되 미확인 항목을 완료로 표시하지 않는다.
2. **J0 + 정지 이미지 파일럿.** 세 보고서가 출처·구도·기술 계약을 갖추면 root가 통합한다. 외부 리프트, 내부 천장, 마지막 스크린을 대표하는 최소 3장의 확장본을 각 1개 후보로 시작한다. 서비스가 묶음 결과를 반환하면 해당 묶음도 요청 비용에 포함한다. 보호 영역 변경, 색감 변질, 경계 연결 실패가 하나라도 있으면 영상 제출을 보류한다.
3. **이미지 본 제작.** 필요한 IN/OUT만 생성하고 MID는 기본적으로 검수 자료로 둔다. A는 C02–C05, B는 C06–C08을 각각 연결 순서로 다룬다. 두 그룹과 C01은 서로 병렬로 진행할 수 있다. 그룹 사이 C01/02, C05/06 경계는 root가 확정한다. 최종 이미지 개수는 실제 입력 목록과 중복 경계를 정리한 뒤 고정한다.
4. **영상 파일럿.** 가장 문제가 컸던 C04→C05 연결과 C08 엔딩을 먼저 시험한다. 요청 분량은 6+6+6초, 총 18초. C04·C08을 먼저 제출하고 C04 끝 상태를 검사한 후 C05를 제출한다. 기존 방식의 IN/OUT 입력을 유지하되 C04 결과가 지정 경계를 지키지 않았다면 C05 입력을 임의로 바꾸지 않는다. C02/C03은 본 제작의 첫 검수 대상으로 배치한다.
5. **파일럿 합류.** C04/05의 천장 진입 전후 공간과 작은 스크린 확대가 연속이고, C08의 연기는 접촉면 내부에서만 움직이며 표면이 자연스럽게 화면을 채워야 통과한다. 결과 영상과 실패 시간대를 먼저 보고한다. 실패 장면의 원인을 밝히기 전 나머지 제출과 자동 재시도는 중단한다. 통과한 파일럿을 최종 컷으로 재사용한다.
6. **영상 본 제작.** 남은 C01/C02/C03/C06/C07만 생성한다. C02→C03은 연결 순서로 확인하고 독립 그룹을 겹쳐 진행한다. 작업자는 원격 제출하지 않고 후보 수신 후 검수·프롬프트 수정 제안을 반환한다. root는 후보가 도착할 때마다 인접 연결과 규격 검사를 진행한다.
7. **조립·납품.** 기존 97/193/121/145/145/145/145/145 생성 프레임 계약을 확인하고 기존처럼 C02 이후 첫 프레임 1개씩 제외해 1,129프레임으로 조립한다. 출력 프레임 수가 다르면 속도·복제로 강제 보정하지 않고 원인을 보고한다. 프레임 제외는 시간 계약이며 실제 연결 품질을 보장하는 검사는 별도다. 기존 AAC, H.264/yuv420p/SAR 1:1/GOP 6/faststart 방식과 세로 해상도에 맞는 인코딩 설정을 사용한다.
8. **적용 준비.** 세로 영상·동일 첫 프레임 포스터·출처 목록·검증 보고를 전달한다. 랜딩 적용 시 모바일 소스와 모바일 포스터만 연결하고, PC 소스 및 기존 로딩·스크럽·42초 자동 재생을 유지한다. 현재 요청은 계획이므로 앱 수정·커밋·푸시는 실행하지 않는다.

## 재사용할 프롬프트 구조

기존 장문의 미학 프롬프트 전체를 이미지 확장에 재사용하지 않는다. 이미지 단계에는 보존·확장 영역의 공간 설명만, 영상 단계에는 채택된 기존 요청의 동작·시간 구조와 필요한 수정만 사용한다. 아래는 역할 템플릿이며 실제 마스크/장면 관찰을 채운 뒤 제출한다.

**이미지 확장 공통문**

> Extend the supplied image into the unfilled regions of this portrait canvas. Treat the existing image region as a protected photographic plate. Continue only the adjacent [observed sky / terrain / hull / chamber surface] through the supplied mask, with the same perspective, light direction, exposure, muted colour balance and texture scale. Preserve the existing people, lift, vessel silhouette, opening and contact screen at their supplied positions and proportions. Add no people, vehicles, machinery, openings or light sources. Do not restyle the protected image.

**영상 공통문**

> Use the supplied portrait reference [start and end images / start image] for this [duration]-second shot. [Reuse the selected V2 shot's observed action and camera path, with explicit start state and end state.] Maintain the identity and continuous trajectories of the existing people and objects. Background surfaces remain part of the same space throughout the movement. Preserve the reference exposure and colour balance. Objects leave view only through continuous movement, framing or occlusion.

**상승·접촉면 접근 보완문**

> During the existing lift ascent, maintain continuous relative motion between the lift, surrounding objects and vessel interior. The small distant luminous contact surface remains attached to the same architectural plane and grows in perspective as the camera approaches. Its boundary and surrounding structure move consistently together throughout the shot.

**스크린 내부 연기 보완문**

> Within the existing contact screen boundary, softly evolving translucent smoke-like density patterns drift through the depth behind its surface. The screen boundary and its supporting structure follow only the established camera perspective; this internal motion does not shake or deform them. Keep this motion confined inside the contact surface, with no smoke emitted into the chamber. Preserve the existing camera movement and exposure.

카메라가 원래 이동하는 컷에 “static camera”를 추가하지 않는다. 전체 프레임에 “undulating screen”을 지시하지 않는다. 과거 C08의 전역 `no smoke, no fog`는 내부 연기 지시와 모순되므로 `no smoke emitted into the chamber`처럼 위치를 한정한다. 새 강한 cinematic grading, 더 어두운 조명 등의 수식어를 추가하지 않는다.

## 그대로 전달할 작업 계약

공통: 다른 에이전트와 같은 작업 공간을 사용한다. 타인의 수정은 보존하고 충돌을 되돌리지 말고 root에 알린다. 신규 브랜치·중첩 위임·브라우저 자동화·직접 유료 제출·public 교체를 하지 않는다. 소유 경로 외 변경은 제안으로만 반환한다. 원본·현재 PC 영상은 읽기 전용이다. 요청 결과 대기 중 중복 제출하지 않는다. 인계 형식은 `{task, paths, source_hashes, checked_frames, verdict, evidence, unresolved, next_action}`이며 시간·비용의 실측과 추정을 구분한다.

**D-A / explorer:** 현재 코드→Topaz 통합 기록→실제 assembly 입력→클립 요청 영수증→이미지 경로를 C01–C08별로 추적하라. 왜: 과거 후보 혼입과 잘못된 프롬프트 재사용을 차단한다. 입력은 위 기준 자료, 소유 파일은 `research/A.md`뿐이다. 모든 컷에 출처와 누락 여부를 명시하면 완료다. P0 이후 조사하고 J0의 root에 인계한다. 요청 API는 호출하지 않는다.

**D-B / explorer:** 채택 영상과 이미지에서 세로로 남겨야 할 인물·리프트·입구·스크린 좌표 및 C02–C05 연결 위험을 찾아라. 왜: 각 컷이 독립적으로 그럴듯해도 공간이 바뀌는 문제를 예방한다. 소유 파일은 `research/B.md`뿐이다. 프레임 번호, 크롭 영향, 보호 영역 제안, 7개 연결부 위험이 있으면 완료다. 생성·원본 변경 금지. P0 이후 조사해 J0의 root에 인계한다.

**D-C / explorer:** `HeptapodHeroIntro.jsx`, `VideoScrubbing.jsx`, 스토리 데이터와 모바일 테스트에서 세로 소스/포스터 적용 위치와 유지해야 할 계약을 찾아라. 왜: 자산 완성 후 재생 방식까지 바뀌는 회귀를 예방한다. 소유 파일은 `research/C.md`뿐이다. 소스 선택·회전 시 동작·버퍼·42초 진입·ended 처리·HTTP Range·테스트 목록을 근거 위치와 반환하면 완료다. 코드 수정·브라우저 실행 금지. P0 이후 조사해 J0에 인계한다.

**A / worker:** J0의 동결된 입력과 후보를 받아 C02–C05의 세로 구도·확장 영역·영상 연속성을 순차 검수하라. 왜: 상승에서 천장 진입까지 같은 공간으로 이어지는 책임을 한 명에게 둔다. `groups/ascent/**`만 소유한다. 이미지 마스크/프롬프트 제안, 원본 대비 비교 자료, 구간별 판정을 root에 반환한다. 인물 소실·주변 오브젝트 교체·스크린 분리를 전 프레임 대상으로 확인하고 시간 근거를 남겨야 완료다. 가림을 소실로 오판하지 않는다. 후보당 20분에 1차 보고하며 미해결이면 제출 보류 근거를 반환한다.

**B / worker:** J0 입력과 후보를 받아 C06–C08의 구도·보행·동일 스크린 확대·내부 연기를 검수하라. 왜: 연기 지시가 카메라/스크린 흔들림으로 바뀌는 실패를 분리해 잡는다. `groups/ending/**`만 소유한다. 기존 C08 효과의 출처를 참고하되 새 후합성은 하지 않는다. 스크린 경계와 구조물은 일관되고 내부 패턴만 변화하는지, 사람이 프레이밍/가림 없이 사라지지 않는지, 마지막 표면이 이전 작은 스크린과 이어지는지를 시간 근거로 반환한다. 후보당 20분에 1차 보고하고 실패는 수정 제안으로 인계한다.

**C / worker:** J0 입력으로 C01과 첫 프레임 포스터를 검수하고, A/B 후보가 준비되면 그룹 사이 연결과 전역 색감·모바일 크롭을 교차 검수하라. 왜: 각 그룹의 국소 통과가 전체 흐름의 통과인지 확인한다. `groups/opening/**`, `qa/cross/**`만 소유한다. A/B 파일은 읽기 전용이다. 7개 연결부 전후 0.5초, 인물·스크린 보존, 첫 영상/포스터 일치와 마지막 표면을 검사하면 완료다. 결과를 root의 J1에 전달한다. 정지 자료 검사만으로 실제 시간적 재생까지 통과했다고 주장하지 않는다.

## 비용·실패 처리와 최종 검증

- 계획 단계 지출 0. 실행 시 제출 전에 서비스의 현재 원생 비율·해상도·마스크 지원·요청 가격을 확인해 요청 원장에 적는다. 현재 가격·처리 시간을 확인하지 않았으므로 금액이나 시간 보장을 하지 않는다.
- 최초 후보는 필요한 이미지당 1회, 영상당 1회. 파일럿은 본 제작분에 포함되며 통과 컷을 다시 생성하지 않는다. 자동 재시도 기본값 0. 추가 유료 재생성이 필요하면 실패 시간대·원인·바꿀 입력·추가 비용을 보고하고 사용자 결정 후 실행한다.
- 요청 키는 입력 해시+프롬프트+설정으로 만든다. 제출 상태가 불명확하면 기존 작업 조회/다운로드를 먼저 복구한다. 같은 요청을 재전송해 중복 과금하지 않는다.
- 후보 선택 우선순위: 원본 인물/구조 보존 → 공간·시간 연속성 → 기존 색감 → 확장 경계 품질 → 세부 선명도. 미학 점수로 필수 조건 실패를 상쇄하지 않는다.
- 합류 시 root는 작업 완료 메시지 외에 실제 파일·해시·검사 프레임·근거를 확인한다. 소유 범위 밖 diff가 있으면 반영을 보류하고 작성자와 조정한다. 상충 판정은 같은 기준 프레임으로 재검토한다.
- 모든 컷과 연결부가 통과해야 조립한다. 최종 입력 해시는 세로 전용 선택 manifest와 전부 일치해야 한다. 기존 가로 영상 조각이 들어가면 실패다. 납품 mp4의 길이·프레임·오디오·색 메타데이터·키프레임·전체 디코드를 확인한다.
- 소수 프레임만으로 시간적 무결성을 확정하지 않는다. 상승·천장 진입과 스크린 접근은 전 프레임 검사 자료와 연속 재생 확인을 포함한다. 브라우저 없이 로컬 영상 검토가 불가능한 환경에서는 해당 검증을 미완료로 명시한다.
- 모바일 적용 단계에서는 기존 테스트를 재사용해 단일 소스 유지·포스터 일치·버퍼·스크럽·마지막 자동 재생·캔버스 전환을 검사하고 curl로 Range 응답을 확인한다. 실제 기기 프레임 드롭과 통신 환경 성능은 측정 전까지 검증 완료로 표시하지 않는다.
- 일부 담당이 실패하거나 슬롯이 부족하면 해당 소유 범위를 root가 순차 인수한다. 보호 영역을 지킬 수 없는 이미지 도구라면 영상 생성을 중단하고 마스크 편집 방식부터 해결한다. 반복 실패 영상을 후보정으로 숨기거나 폐기된 V2 조각으로 대체하지 않는다.
- 보고 시점: 기준 확정, 이미지 파일럿, 영상 파일럿, 최종 조립. 매번 결과 경로·통과/실패·누적 요청 수와 비용·다음 작업을 짧게 전달한다.
