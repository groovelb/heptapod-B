# 영상 v2 개선 프롬프트와 병렬 제작 계획

상태: 계획 완료 · 생성 요청 미실행. 작성일: 2026-09-08.

기존 8개 생성 요청의 원문 프롬프트와 실제 입력 설정을 대조했다. 동일한 장면 순서·길이·입력 이미지·모델을 유지하면서, 프롬프트의 물리적 모순과 모호한 카메라 지시를 줄이는 제안이다. 결과가 개선되는지는 아래 파일럿 검증으로 판단한다.

이미 로컬에 적용된 `video-v2`가 있으므로 이번 개선안은 별도 `video-v2-prompt-r1`로 관리한다. 기존 결과와 요청 기록을 덮어쓰지 않는다. 이번 요청의 산출물은 이 계획과 [원문·개선문 JSON](09-video-v2-prompt-revision.json)이다.

## 1. 확인한 근거와 유지 조건

- [기존 생성 스펙](../../../output/heptapod-remaster-midjourney/run-20260908-01/video-v2/specs.json): 8개 `input_template` 모두 각 `source_submission`의 실제 요청과 일치.
- [기존 결과 상태](../../../output/heptapod-remaster-midjourney/run-20260908-01/video-v2/STATUS.md), [외부 QA](../../../output/heptapod-remaster-midjourney/run-20260908-01/video-v2/qa/A.json), [내부 QA](../../../output/heptapod-remaster-midjourney/run-20260908-01/video-v2/qa/B.json), [엔딩 QA](../../../output/heptapod-remaster-midjourney/run-20260908-01/video-v2/qa/C.json), [장면 연결 QA](../../../output/heptapod-remaster-midjourney/run-20260908-01/video-v2/qa/seams.json).
- C02·C06 기존 비교 이미지를 직접 확인했다. C02의 비현실적인 탑승과 C06의 큰 이미지 평면 회전은 기록과 일치한다. 나머지 결함 이력은 기존 QA 기록을 근거로 한다.
- 현재 랜딩 MP4 두 파일을 ffprobe로 다시 확인했다. 브라우저를 열지 않았다.

| 항목 | 고정할 조건 |
|---|---|
| 이야기 | 접근 → 탑승·상승 → 검은 입구 진입 → 내부 상승 → 천장막 접근 → 중력 전환 → 하차·보행 → 발광면으로 화면 채우기 |
| 모델 | 기존 요청의 `fal-ai/kling-video/v3/pro/image-to-video` |
| 클립 요청 길이 | 4 / 8 / 5 / 6 / 6 / 6 / 6 / 6초, 합계 47초 |
| 생성 옵션 | 각 장면의 기존 cfg_scale 및 generate_audio=true 그대로 |
| 입력 방식 | C01–C07: 기존 선택 IN+OUT / C08: IN만 사용 |
| 이미지 | Midjourney Vary > Subtle 최종 선택본 2928×1648, 동일 파일·해시 |
| 비교 전용 | MID 8장과 F08-OUT은 검수용. F03-MID 가장자리 결함 이미지는 영상 입력 제외 |
| 완성 영상 | 24fps, 1,129프레임, 영상 트랙 47.041667초, 컨테이너 47.090000초 |
| 데스크톱 | 1916×1080, SAR 1:1, H.264 High / level 4.0, CRF 21 |
| 모바일 | 960×542, SAR 129809:129600, H.264 High / level 3.1, CRF 23 |
| 공통 인코딩 | yuv420p, GOP 6, time base 1/12288, 기존 faststart·스케일·크롭 방식 |
| 오디오 | 생성 오디오 옵션은 유지하되 납품에는 쓰지 않음. 현재 MP4 각각의 AAC 패킷·타임스탬프 그대로 복사 |
| 교체 범위 | 실행 시 검수 통과한 hero-scrub-1920.mp4와 hero-scrub-960.mp4 두 파일만. UI·스크롤·타임라인·포스터·MP3 유지 |

합계 47초와 실제 트랙 길이의 차이는 기존 조립 규칙 때문이다. 생성 프레임은 97 / 193 / 121 / 145 / 145 / 145 / 145 / 145이며, C02부터 첫 프레임을 각각 하나씩 제외해 총 1,129프레임을 만든다. 길이를 맞추려고 속도 변경, 프레임 복제, 전환 추가를 하지 않는다. 기존 타임라인 JSON의 total 47.081은 그대로 유지한다.

## 2. 개선의 범위와 한계

단순히 수식어를 늘리지 않는다. 기존 Shot 번호·중복 금지문을 줄이고, 실제 참조 이미지의 시작 상태 → 필요한 동작 → 끝 상태를 적는다. positive/negative prompt 두 필드만 변경한다. 시네마틱 색감은 이미 선택한 이미지의 색감을 유지하는 방향이며, 새 조명이나 다른 스타일을 추가하지 않는다.

**C02가 우선 해결 과제다.** 현재 시작 이미지의 플랫폼은 지상보다 높고 인물은 지상에 있다. 그래서 “사람은 움직이지 않는다”와 “리프트는 상승만 한다”를 유지하면서 자연스럽게 탑승하는 것은 성립하기 어렵다. 제안은 같은 8초 안에서 플랫폼이 잠깐 낮아지고, 네 명이 탑승한 뒤 상승하게 하는 것이다. 장면 시작·끝·이야기는 유지하지만 초반 리프트 운동은 바뀐다. 기존 출입부가 실제 이미지에서 불명확하면 문장만으로 해결된다고 간주하지 않는다. 새 계단·사다리·난간을 만들어 통과시키지 않으며, 파일럿에서 실패하면 해당 제약을 기록한다.

**C06의 90도는 위를 보던 공간 방향이 정면으로 전환되는 사건으로 유지한다.** 추가적인 화면 회전 자체를 강요하지 않는다. 기존 원본 영상에 가까운 tilt 중심의 연속 전환을 제안한다. 물리적 중력 변경을 정확히 시뮬레이션한다고 주장하지 않는다.

**C08은 원래 요청된 마지막 2초의 표면 전면 채우기 조건을 검수 기준으로 복원한다.** 기존 납품은 마지막 프레임에 맞추는 수준으로 허용되었다. 이번에는 4초 이후 전체 프레임을 확인하므로 같은 길이 안에서 접근 속도 배분이 조금 달라질 수 있다. 새 안개를 분사해 화면을 덮는 방식은 허용하지 않는다.

## 3. 병렬화 결정과 작업 그래프

패턴: 단계별 병렬 파이프라인 + 장면별 독립 검수. 전체 슬롯 4개 중 root 1개와 검수 담당 3개를 사용한다. 원격 생성은 root가 소유한 단일 큐에서 최대 3개를 동시 처리한다. 이 수치는 기존 로컬 runner 기본값을 재사용하는 계획값이며, 서비스가 보장하는 동시 처리 한도를 주장하는 것은 아니다.

세 장면 묶음은 입력 이미지가 이미 확정되어 서로의 생성 결과를 기다리지 않아도 된다. 바로 앞 클립의 새 마지막 프레임을 다음 입력으로 바꾸면 현재 입력 방식이 달라지고 의존성이 생기므로 그렇게 하지 않는다. 장면 연결 검수는 모든 결과가 모인 뒤 별도로 수행한다.

| ID / 담당 | 범위·소유권 | 의존성 | 산출물 | 완료 조건 | 주 위험 |
|---|---|---|---|---|---|
| P0 / root | 입력 해시·공통 설정·기준 영상·신규 실행 경로 | 없음 | frozen-specs.json, baseline-hashes.json | 원본과 다른 설정이 prompt 2개 필드뿐 | 기존 실행 폴더 덮어쓰기 |
| A / worker | C01–C03 검수, qa/A/**, proposals/A.json | P0 및 해당 후보 다운로드 | 클립별 판정·프레임 근거·수정 제안 | 탑승 지지·네 명 유지·동일 축 접근 | C02 입력의 승차 동선 불명확 |
| B / worker | C04–C06 검수, qa/B/**, proposals/B.json | P0 및 해당 후보 다운로드 | 클립별 판정·프레임 근거·수정 제안 | 단일 막·네 명·연속 중력 전환 | 인물/광원 복제·공간 왜곡 |
| C / worker | C07–C08 검수, qa/C/**, proposals/C.json | P0 및 해당 후보 다운로드 | 보행·엔딩 타이밍 판정 | 지지 있는 보행·마지막 2초 완전한 표면 | 발 미끄러짐·바닥 잔존 |
| G / root 단일 큐 | specs/queue/states/clips/receipts 전체 | P0, 수정 시 해당 검수 보고 | 요청 ID·실제 입력·후보 MP4·해시 | 중복 제출 없이 다운로드와 규격 검사 | 응답 유실 시 중복 과금 |
| J / root | 선택 manifest·7개 연결부·staging | A+B+C 승인 | 비교 페이지, delivery-validation.json | 이야기·연결·기술 계약 모두 통과 | 개별 승인과 연결 품질의 불일치 |

예정 실행 경로 `output/heptapod-remaster-midjourney/run-20260908-01/video-v2-prompt-r1/` 아래에서만 새 결과를 만든다. 이 문서는 경로를 예약하는 계획이며 실제 생성 폴더를 만들거나 큐를 실행하지 않았다.

## 4. 단계와 합류 조건

1. **준비 — P0.** root가 현재 MP4 두 파일과 관련 UI·타임라인 파일의 해시를 새 기준으로 저장한다. 입력 이미지의 실제 파일·해시와 설정을 고정한다. 기존 prepare-specs/queue-runner는 원문 불변을 검증하도록 작성되어 있으므로, 새 폴더의 runner에 prompt 두 필드의 의도적 차이를 허용하는 검사를 별도로 준비한다. 기존 검증을 삭제하거나 이전 실행 경로를 재사용하지 않는다. 과거 임시 URL은 재사용하지 않고 기존 업로드 절차로 동일 이미지 바이트를 올린다.
2. **파일럿 — C02, C06, C08 병렬.** root 큐가 3건을 제출한다. A/B/C는 각 담당 장면의 이전 결과와 검수 기준을 준비하고, 다운로드 후 검수한다. root는 동시에 프레임 조립 계획·AAC 비교·장면 연결 검수표를 준비한다. 시작 요청량은 20초 분량이다.
3. **1차 합류.** 세 보고서에 파일 해시, 시간대/프레임, 승인 여부, 원본 대비 개선 및 악화가 있어야 한다. C02는 공중 이동 감소가 아니라 지지 있는 연속 승차가 보여야 한다. C06은 독립적인 방 회전이 없어야 한다. C08은 마지막 2초 조건을 충족해야 한다. 최소 한 장면이 실패하면 그 장면의 원인을 먼저 해결하고 나머지 5개 제출은 보류한다. 통과한 파일럿은 최종 후보로 그대로 사용한다.
4. **본 제작 — 나머지 C01/C03/C04/C05/C07.** 최대 3개 동시 큐로 처리한다. A/B/C는 해당 후보가 도착하는 대로 검수한다. 시간 파라미터·참조 이미지를 독단적으로 바꾸지 않는다. root는 완료된 클립의 기계적 검사와 이웃이 준비된 연결부 검수를 계속한다.
5. **최종 합류·조립.** 8개 클립 승인 후 root가 final-selection.json에 해시를 고정한다. 기존과 동일하게 프레임 조립·리사이즈·크롭·인코딩하고 현재 기준 영상의 AAC를 복사한다. 7개 장면 연결과 마지막 프레임, 전체 재생 흐름을 검수한다. 실행 단계의 교체 대상은 두 MP4로 제한하고 기존 기준 파일을 별도 롤백에 보관한다. 배포는 이 계획에 포함하지 않는다.

파일럿은 각각 첫 후보 1개로 시작하고 명확한 실패 원인에 대해 장면당 수정 재시도 1회까지를 기본 제안으로 둔다. 이 계획의 기본 상한은 최초 8건 + 파일럿 재시도 최대 3건이다. 추가 재시도는 실패 근거와 범위 결정을 남긴 후 별도 계획한다. 원격 처리 시간과 비용은 현재 서비스 상태를 조회하지 않았으므로 추정하지 않는다.

## 5. 그대로 전달할 담당별 작업 지시

공통 지시: 아래 작업은 사용자가 제작 실행을 요청한 뒤 전달한다. 현재는 설계만 작성한다. 각 담당은 다른 에이전트와 작업 공간을 공유한다. 다른 사람의 수정은 유지하고 충돌 시 되돌리지 말고 root에게 알린다. 중첩 위임은 하지 않는다. 브라우저 자동화를 새로 실행하지 않고 로컬 ffmpeg 프레임 추출·ffprobe·이미지 직접 검사로 검수한다. 검수용 PNG 추출은 가능하지만 참조 JPEG와 생성 MP4를 수정하지 않는다. 외부 제출·다운로드 큐·공통 manifest·public 파일은 root만 소유한다.

### A에게 전달

> 목표: C01–C03 후보가 기존 외부 접근과 진입 흐름을 유지하면서 C02 탑승을 개선했는지 판정하라. 독립 기여는 지상 인물의 승차 물리와 축 연속성 검수다. 입력은 동결된 신규 specs, 원본/현재 기준 클립, 선택 IN/OUT, 다운로드된 후보, 기존 qa/A.json이다. 작성 권한은 신규 실행 폴더 qa/A/**와 proposals/A.json뿐이다. 나머지 영역과 root 큐는 수정하지 않는다. P0와 해당 다운로드를 기다린 뒤 검수하고 root의 선택 결정으로 인계한다. C02는 0–4초 탑승 구간을 매 프레임 확인하고 그 이후는 최소 0.5초 간격으로 확인한다. 가림과 인물 소실을 구분하고 네 사람의 발·손 지지가 이어지는지 판정한다. C01/C03은 최소 0.5초 간격+끝 프레임과 실제 재생 흐름을 확인한다. 시간 기준은 기준 준비 15분, 후보별 검수 20분을 초기 점검 시점으로 두고 미해결 시 사실만 보고하라. 생성 결과를 기다리느라 중복 제출하지 않는다. 인계는 {clip_id, attempt, sha256, verdict, checked_frames, evidence_paths, baseline_comparison, blockers, proposed_prompt_delta} 형태로 한다.

### B에게 전달

> 목표: C04–C06 후보에서 동일한 네 명과 하나의 막을 유지하고 중력 전환의 독립적인 방 회전을 제거했는지 판정하라. 독립 기여는 내부 공간·광원·전환 연속성 검수다. 입력은 동결 specs, 원본/현재 기준 클립, 선택 IN/OUT, 후보, 기존 qa/B.json이다. 작성 권한은 qa/B/**와 proposals/B.json뿐이다. 공통 파일·입력·MP4·다른 담당 영역은 수정하지 않는다. P0와 해당 다운로드가 선행 조건이며 root가 결과 소비자다. C06은 전체 프레임에서 방·막·리프트 간 기하 관계의 끊김을 확인한다. C04/C05는 0.5초 간격과 이전 결함이 있던 3–5.5초 구간을 매 프레임 확인한다. 실제 가림을 인물 감소로 오판하지 않는다. 네 인물과 한 발광면, 지지된 자세, 다음 장면 이전의 중력 상태를 완료 조건으로 삼는다. 후보별 검수 20분을 초기 점검 시점으로 하며, 해상도나 타이밍 변경으로 실패를 숨기지 않는다. 공통 인계 형식으로 판정과 근거 및 수정 제안만 반환한다.

### C에게 전달

> 목표: C07 보행과 C08 마지막 2초 화면 채우기가 같은 6초+6초 구조 안에서 자연스럽게 이어지는지 판정하라. 독립 기여는 발 접촉·케이스 연속성·엔딩 사용성 검수다. 입력은 동결 specs, 원본/현재 기준 클립, C07 IN/OUT·C08 IN, 비교 전용 F08-OUT, 후보와 기존 qa/C.json이다. 작성 권한은 qa/C/**와 proposals/C.json뿐이다. F08-OUT을 생성 end image로 추가하거나 타임라인을 수정하지 않는다. P0와 후보 다운로드 후 검수하고 root에게 인계한다. C07의 하차 구간과 C08의 4초부터 끝까지 모든 프레임을 확인한다. C08 로컬 프레임 96–144 전체에 바닥·머리·난간·테두리가 없어야 한다. 안개 분출·디졸브가 아닌 연속적인 원근 접근인지 실제 흐름도 확인한다. 후보별 검수 20분을 초기 점검 시점으로 하고 조건 미충족을 후편집 흰색 덮기로 해결하지 않는다. 공통 인계 형식으로 시간 근거, 승인/실패, 원본 대비 비교 및 수정 제안을 반환한다.

## 6. 합류·선택·실패 처리

- root는 담당 완료 메시지 대신 실제 보고서와 파일 해시를 확인한다. 담당 보고 간 충돌은 같은 프레임·같은 기준 영상으로 재검토한다. 다른 담당 경로를 수정한 흔적이 있으면 공통 manifest에 반영하지 않고 해당 소유자와 조정한다.
- 우선순위: (1) 네 명·장비·단일 막·공간 연속성 및 장면별 필수 동작 통과, (2) 원본과 시작/끝 구도·물체·축 일치, (3) 자연스러운 타이밍, (4) 세부 질감. 보기 좋은 새 구도라도 필수 조건을 위반하면 선택하지 않는다. C02 탑승 실패는 기존에도 있었다는 이유로 이번에 통과시키지 않는다.
- 연결부는 최종 프레임 96/97, 288/289, 408/409, 552/553, 696/697, 840/841, 984/985 양쪽과 전후 0.5초를 검수한다. 각 독립 입력이 원본 컷에서 조금 안쪽으로 추출되었으므로 작은 의복·윤곽 차이는 남을 수 있다. 프롬프트만으로 픽셀 단위 접합을 보장하지 않는다.
- 미디어 규격: C01 97, C02 193, C03 121, 나머지 각145프레임, 정확한 24fps. 누락·다른 fps는 기록 후 재시도 대상으로 삼고 타임스트레치·프레임 복제로 강제 보정하지 않는다.
- 최종 파일: 1129프레임, 크기·SAR·time base·GOP·코덱·길이가 기존과 동일하고 AAC 패킷 바이트·PTS/DTS·지속 시간도 같아야 한다. UI·타임라인·포스터·MP3 기준 해시는 유지되어야 한다. 정적 검사 결과를 브라우저 스크롤 재생 검증으로 표현하지 않는다.
- 제출 후 응답이 불명확하면 request_id를 확인하거나 알려진 ID의 polling만 재개한다. 자동 재제출은 하지 않는다. 전역 큐가 막히면 동시 수를 낮추며 검수와 로컬 준비를 이어간다.
- 담당 하나가 실패하면 그 담당 출력만 root 또는 빈 슬롯의 담당에게 재배정한다. 다른 보고서와 통과 후보는 보존한다. 슬롯이 없으면 A→B→C 순서로 같은 계약을 순차 실행한다.
- C02의 높이·출입 경로가 계속 충돌하면 결과를 “개선 완료”로 표기하지 않는다. 해당 클립만 보류하고 입력 이미지/미세동작 제약의 조정안을 제시한다. 새 계단 생성, 장면 추가, 길이 변경은 자동 대안이 아니다.

## 7. 장면별 개선 프롬프트

아래 문장은 바로 검토 가능한 완성 제안이다. 원문 전체와 원문 negative prompt는 JSON의 original_input_template에 보존했다. 각 장면에는 공통 보존 지시가 이미 포함되어 있으므로 별도 문구를 덧붙이지 않는다. 시간 구간은 연출 지시이며 생성 모델이 보장하는 타임라인 명령은 아니다.

### C01 · 접근 · 0–4초

입력: `F01-IN` → `F01-OUT` · 요청 4초 · cfg_scale 0.45 · generate_audio=true

기존 문장: “Make a fast physical approach from frame 01, driven by real camera movement and fog parallax”

확인한 문제: 빠른 실제 접근과 금지된 snap zoom을 구분한다. 원본의 두 끝 구도 사이 카메라 경로만 지정한다.

개선: 접근의 가속·감속과 안개 시차를 명시하고 선체 자체의 확대·이동과 분리.

```text
Over 4 seconds, move the camera briskly and continuously from the supplied distant exterior view to the supplied close underside view. Build speed smoothly through the middle and ease gently into the end framing. Use real forward camera travel and coherent foreground fog parallax; the vessel remains fixed in world space and its apparent growth comes only from approach. The ground crew and lift stay at their reference positions with only small natural movements. Keep the entrance in its referenced near-closed state. Reach the supplied endpoint without a last-moment zoom or exposure jump. Preserve the supplied reference images: the same four researchers, pale grey suits, black cases and railings, dark lift, fixed matte-black vessel geometry, and existing light sources. Retain the restrained desaturated green-grey and blue-grey film grade, low contrast and readable dark texture. Keep identities, relative scale and object continuity stable. One continuous take with no internal edit. Audio: soft low wind and continuous low air pressure, gently swelling with approach; no impact or musical accent.
```

Negative prompt:

```text
internal cut, camera teleport, abrupt reframing, warped geometry, morphing vessel, duplicate people, extra people, disappearing bodies, floating people, costume change, new doorway, new light source, portal, beam, neon, orange or red lighting, glossy CG surfaces, text, logo, watermark, music, dialogue, sharp audio transient, snap zoom, vessel translation, hull scaling, aperture opening early, crew boarding early
```

검수: 선체가 움직이지 않고 카메라 접근으로만 커지는가 / 4초 안에 끝 구도에 도달하고 마지막 순간 확대 점프가 없는가

### C02 · 탑승 후 상승 · 4–12초

입력: `F02-IN` → `F02-OUT` · 요청 8초 · cfg_scale 0.35 · generate_audio=true

기존 문장: “people stay fixed in place except for natural micro movement”

확인한 문제: 원본은 지상 인물→탑승 완료인데 people stay fixed 및 no walking entry를 동시에 요구한다. 시작 리프트 높이도 자연스러운 승차와 충돌한다.

개선: 8초 안에서 짧은 플랫폼 하강→접근·승차→발 지지 확인→수직 상승을 제안한다. 기존 단조 상승 중 초반 운동이 달라지는 명시적 개선안이다.

```text
Create one continuous 8-second boarding-and-ascent shot between the supplied endpoints. The start shows four researchers on the ground beside the empty elevated lift; the end shows the same four aboard the raised platform. During roughly seconds 0-1.5, the existing scissor mechanism gently lowers the platform to a reachable boarding height while the crew takes short grounded steps toward its existing access side. During seconds 1.5-4, they board in a readable staggered order through that access, maintaining visible hand or foot support, and settle behind the rails. Keep all four identities continuously traceable, allowing only natural occlusion. Once everyone is supported on the platform, raise it smoothly straight upward during seconds 4-8 to the supplied final height. The chassis stays planted on the ground. The existing black entrance opens within its fixed outline; the surrounding hull stays rigid. Keep the camera nearly locked, allowing only the small smooth forward framing adjustment required by the endpoints. Preserve the existing access and railing topology; do not invent steps, ladders or a ramp. Preserve the supplied reference images: the same four researchers, pale grey suits, black cases and railings, dark lift, fixed matte-black vessel geometry, and existing light sources. Retain the restrained desaturated green-grey and blue-grey film grade, low contrast and readable dark texture. Keep identities, relative scale and object continuity stable. One continuous take with no internal edit. Audio: restrained continuous lift motor and soft outdoor air, with very quiet cloth movement; no impact or dramatic cue.
```

Negative prompt:

```text
internal cut, camera teleport, abrupt reframing, warped geometry, morphing vessel, duplicate people, extra people, disappearing bodies, floating people, costume change, new doorway, new light source, portal, beam, neon, orange or red lighting, glossy CG surfaces, text, logo, watermark, music, dialogue, sharp audio transient, levitation, bodies dissolving, crew appearing on platform, unsupported climbing, lift rising before boarding completes, chassis leaving ground, new ladder, new stairs, ramp, rail teleportation, hull bending
```

검수: 지상→플랫폼까지 네 명의 이동이 연속적으로 추적되는가 / 발·손 지지가 보이고 모두 탑승한 뒤 상승하는가 / 새 사다리·계단·난간 변형 없이 탑승 경로가 성립하는가

### C03 · 검은 입구 진입 · 12–17초

입력: `F03-IN` → `F03-OUT` · 요청 5초 · cfg_scale 0.3 · generate_audio=true

기존 문장: “The only physical story motion is the same dark industrial scissor lift rising straight upward in place”

확인한 문제: 원본의 핵심 축은 적절하지만 긴 금지 나열과 과거 Shot 번호가 주요 동작을 가린다.

개선: 리프트 수직 이동, 같은 축 카메라 접근, 검은 내부를 각각 짧게 고정.

```text
Across 5 seconds, the occupied lift rises vertically beneath the same fixed black entrance. The camera makes one restrained same-axis forward push toward the platform and aperture, reaching the supplied close entry view. Keep the lift chassis and vessel fixed horizontally; the background equipment leaves view only through tighter camera framing. All four researchers remain supported on the platform, maintaining their order and black cases with small balance corrections only. They have already boarded and do not walk or step off. The aperture interior remains featureless black through the entire shot. Its location and outline remain fixed in the hull; apparent size changes only through camera approach. Carry the motion into the darkness without a pause, pan or viewpoint reversal. Preserve the supplied reference images: the same four researchers, pale grey suits, black cases and railings, dark lift, fixed matte-black vessel geometry, and existing light sources. Retain the restrained desaturated green-grey and blue-grey film grade, low contrast and readable dark texture. Keep identities, relative scale and object continuity stable. One continuous take with no internal edit. Audio: low outdoor wind gradually recedes into soft pressure and smooth lift motor resonance.
```

Negative prompt:

```text
internal cut, camera teleport, abrupt reframing, warped geometry, morphing vessel, duplicate people, extra people, disappearing bodies, floating people, costume change, new doorway, new light source, portal, beam, neon, orange or red lighting, glossy CG surfaces, text, logo, watermark, music, dialogue, sharp audio transient, lateral lift travel, side pan, reverse view, crew boarding, walking, stepping off, interior panels, interior lamps, second aperture
```

검수: 상승축·접근축이 일치하고 선체·차량이 옆으로 미끄러지지 않는가 / 네 명이 플랫폼에 머물고 입구 내부가 검게 유지되는가

### C04 · 내부 수직 상승 · 17–23초

입력: `F04-IN` → `F04-OUT` · 요청 6초 · cfg_scale 0.28 · generate_audio=true

기존 문장: “Skip Shot 06 completely.”

확인한 문제: 이전 시도에 다섯 번째 인물과 두 번째 광원이 생겼다. 외부→내부 전환 때 복제와 시점 뒤집기를 검증해야 한다.

개선: 과거 번호 대신 입력 이미지 사이의 연속 이동을 기술하고 네 인물·단일 발광면을 고정.

```text
Over 6 seconds, continue the existing upward travel through the entrance into the tall dark chamber, maintaining the same forward-and-upward viewing direction. The camera follows the lift on the same vertical axis; the exterior drops out of view below without looking back. Reveal the existing rough striated interior gradually through the camera movement, not through a new room appearing. Track the same four researchers continuously through the dark threshold; they remain planted behind the rails with small bracing movements. The single distant pale membrane is the only luminous contact surface and stays far above, growing only slightly as the lift rises. Keep wall texture and platform topology stable, and reach the supplied interior endpoint without an exposure jump or sudden crouch. Preserve the supplied reference images: the same four researchers, pale grey suits, black cases and railings, dark lift, fixed matte-black vessel geometry, and existing light sources. Retain the restrained desaturated green-grey and blue-grey film grade, low contrast and readable dark texture. Keep identities, relative scale and object continuity stable. One continuous take with no internal edit. Audio: a smooth transition from subdued wind pressure into deep interior air resonance; no sharp accent.
```

Negative prompt:

```text
internal cut, camera teleport, abrupt reframing, warped geometry, morphing vessel, duplicate people, extra people, disappearing bodies, floating people, costume change, new doorway, new light source, portal, beam, neon, orange or red lighting, glossy CG surfaces, text, logo, watermark, music, dialogue, sharp audio transient, fifth person, duplicate membrane, new light panel, reverse view, exterior view from inside, camera yaw, sudden crouching, lateral lift travel
```

검수: 어두운 문턱 통과 전후 네 명과 단일 발광면이 유지되는가 / 외부를 돌아보지 않고 위쪽 진행축을 유지하는가

### C05 · 먼 천장막 접근 · 23–29초

입력: `F05-IN` → `F05-OUT` · 요청 6초 · cfg_scale 0.25 · generate_audio=true

기존 문장: “The distant contact point above Shot 07 gradually reads as a wide overhead ceiling membrane”

확인한 문제: 이전 시도에 발광면이 분리·병합됐다. far ceiling을 새 패널 생성으로 해석하지 않게 해야 한다.

개선: 동일한 하나의 면이 원근 변화로만 커짐을 명시하고 중력 전환을 다음 장면으로 남김.

```text
Across 6 seconds, continue straight upward in the same fixed chamber toward the one distant overhead membrane. The camera accompanies the lift on the same vertical axis with a restrained upward movement, preserving the supplied starting and ending perspectives. The small luminous patch and the wider overhead membrane are the same single physical surface throughout; reveal its width gradually through changing perspective, never by splitting, replacing or merging light panels. Keep it visibly distant at the endpoint. The four researchers stay still on the platform with feet planted, cases stable and only tiny balance corrections. Preserve their order and spacing. This shot ends before the gravity change: the membrane is still overhead, with no landing, walking or newly formed forward floor. Preserve the supplied reference images: the same four researchers, pale grey suits, black cases and railings, dark lift, fixed matte-black vessel geometry, and existing light sources. Retain the restrained desaturated green-grey and blue-grey film grade, low contrast and readable dark texture. Keep identities, relative scale and object continuity stable. One continuous take with no internal edit. Audio: continuous low interior air pressure and soft deep resonance, without rhythmic or transient sounds.
```

Negative prompt:

```text
internal cut, camera teleport, abrupt reframing, warped geometry, morphing vessel, duplicate people, extra people, disappearing bodies, floating people, costume change, new doorway, new light source, portal, beam, neon, orange or red lighting, glossy CG surfaces, text, logo, watermark, music, dialogue, sharp audio transient, second membrane, splitting light, merging panels, membrane rushing forward, camera roll, gravity change early, landing, walking, leg swing, new floor path
```

검수: 빛이 두 개로 갈라지거나 합쳐지는 프레임이 없는가 / 끝까지 천장 방향이고 발광면이 충분히 먼가 / 네 명의 발이 플랫폼에 지지되어 있는가

### C06 · 중력 방향 전환 · 29–35초

입력: `F06-IN` → `F06-OUT` · 요청 6초 · cfg_scale 0.3 · generate_audio=true

기존 문장: “one controlled 90 degree roll and tilt across the full duration”

확인한 문제: 원본의 controlled 90 degree roll and tilt가 새 결과에서 방·발광면만 회전하는 인상을 강화했다.

개선: 90도는 상향→전방의 공간 방향 전환으로 기술한다. 이미지 평면의 강제 90도 회전을 빼고 참조 끝 구도에 필요한 연속적인 tilt로 제한.

```text
Create one calm 6-second transition from the supplied upward-looking view to the supplied forward-facing prewalk view. Convey the change of gravity reference through one continuous, weighted camera tilt from looking upward to looking forward, with only the small perspective adjustment needed to reach the end image. Keep the screen horizon restrained rather than adding an independent image-plane spin. The overhead membrane and the forward membrane are one fixed surface seen from a changing orientation; the chamber and membrane do not rotate or bend independently. Preserve continuous geometric relationships between walls, lift and membrane. The lift settles at the existing landing plane without driving across the floor. All four researchers remain on the platform, feet supported and hands low, using only slight balance corrections. End fully settled, facing the wide membrane, before anyone steps off. Preserve the supplied reference images: the same four researchers, pale grey suits, black cases and railings, dark lift, fixed matte-black vessel geometry, and existing light sources. Retain the restrained desaturated green-grey and blue-grey film grade, low contrast and readable dark texture. Keep identities, relative scale and object continuity stable. One continuous take with no internal edit. Audio: soft interior resonance and a very low continuous transition tone; no whoosh, impact or musical swell.
```

Negative prompt:

```text
internal cut, camera teleport, abrupt reframing, warped geometry, morphing vessel, duplicate people, extra people, disappearing bodies, floating people, costume change, new doorway, new light source, portal, beam, neon, orange or red lighting, glossy CG surfaces, text, logo, watermark, music, dialogue, sharp audio transient, independent wall rotation, independent membrane rotation, camera spin, whip pan, abrupt perspective flip, warping room, lift driving forward, crew walking, stepping off early
```

검수: 방·발광면만 따로 회전하거나 변형되지 않는가 / 중력 전환이 한 번에 연속적으로 읽히며 원본보다 과한 회전이 없는가 / 끝에서 네 명이 아직 리프트 위에 있는가

### C07 · 하차 후 접촉면으로 걷기 · 35–41초

입력: `F07-IN` → `F07-OUT` · 요청 6초 · cfg_scale 0.28 · generate_audio=true

기존 문장: “The people grow slightly only because they walk forward.”

확인한 문제: people grow slightly only because they walk forward는 뒤에서 보는 카메라와 멀어지는 보행의 원근에 어긋날 수 있다.

개선: 인위적인 인물 확대를 제거하고 같은 지면의 발 접촉·자연 원근으로 보행을 지정.

```text
Over 6 seconds, continue from the supplied stopped-lift view into the supplied walking view after gravity has settled. Hold the four researchers steady for a short opening beat, then let them step down carefully through the existing platform exit and walk toward the fixed luminous membrane. Show small grounded steps, clear weight transfer and restrained arms, preserving each person and their case. The lift stays parked and does not move with the walkers. Keep the camera calm behind the group, allowing only the gentle motion needed to reach the supplied end framing. Let apparent body size follow the actual camera-to-person distance; do not enlarge figures as a visual effect. Retain the same floor, rails and broad single membrane. The membrane remains fixed in the chamber and does not open, swell or move toward the group. Preserve the supplied reference images: the same four researchers, pale grey suits, black cases and railings, dark lift, fixed matte-black vessel geometry, and existing light sources. Retain the restrained desaturated green-grey and blue-grey film grade, low contrast and readable dark texture. Keep identities, relative scale and object continuity stable. One continuous take with no internal edit. Audio: subdued room air, soft cloth movement and quiet grounded footsteps matching the steps; no sharp sound.
```

Negative prompt:

```text
internal cut, camera teleport, abrupt reframing, warped geometry, morphing vessel, duplicate people, extra people, disappearing bodies, floating people, costume change, new doorway, new light source, portal, beam, neon, orange or red lighting, glossy CG surfaces, text, logo, watermark, music, dialogue, sharp audio transient, foot sliding, exaggerated gait, people scaling up, floor warping, case disappearance, duplicated cases, wall advancing, moving lift, new stairs, new ramp
```

검수: 발 미끄러짐·인물 확대·케이스 소실 없이 네 명이 하차하고 걷는가 / 리프트가 정지하고 발광면도 고정되어 있는가

### C08 · 발광면으로 화면 채우기 · 41–47초

입력: `F08-IN` → `끝 이미지 없음` · 요청 6초 · cfg_scale 0.32 · generate_audio=true

기존 문장: “The final 2 seconds are mandatory screen-only frames”

확인한 문제: 원본 프롬프트는 마지막 2초 전면 채우기를 요구했으나 이전 QA는 끝 프레임만 충족해도 허용했다. 이번 시험은 요구한 타이밍까지 확인한다.

개선: 0–4초 단일 접근, 4–6초 화면 전체 표면 유지로 시간 구간을 명확히 하고 새 안개 분출과 기존 표면 질감을 구분.

```text
Use only the supplied start image for one continuous 6-second ending. During seconds 0-4, continue the four researchers' slow forward walk while the camera makes a single smooth straight approach into the existing luminous membrane, accelerating gently early enough to reach the surface framing without a last-moment rush. Keep the membrane fixed in the chamber. Let people, floor, rails and chamber edges leave the image only through continuous camera framing, never by fading or dissolving objects. By second 4, the same cold-white membrane surface fills the complete image edge to edge. During seconds 4-6, hold this full-frame surface with only its existing subtle pale texture and soft blue-grey halation. No person, floor strip, rail, border or chamber edge remains. Preserve continuous exposure through the approach; brightness increases through coverage of the existing surface, not through a flash, emitted cloud or white wipe. Preserve the supplied reference images: the same four researchers, pale grey suits, black cases and railings, dark lift, fixed matte-black vessel geometry, and existing light sources. Retain the restrained desaturated green-grey and blue-grey film grade, low contrast and readable dark texture. Keep identities, relative scale and object continuity stable. One continuous take with no internal edit. Audio: quiet footsteps and cloth recede into a soft sustained room-pressure tone; no impact or musical accent.
```

Negative prompt:

```text
internal cut, camera teleport, abrupt reframing, warped geometry, morphing vessel, duplicate people, extra people, disappearing bodies, floating people, costume change, new doorway, new light source, portal, beam, neon, orange or red lighting, glossy CG surfaces, text, logo, watermark, music, dialogue, sharp audio transient, emitted fog, new smoke, particle burst, white wipe, flash, people dissolving, membrane advancing, frame border after second four, floor after second four, people after second four, portal
```

검수: 4초 이후 마지막 49프레임에 바닥·인물·테두리가 전혀 없는가 / 화면 채우기가 전진 원근으로 일어나고 흰 연기·플래시로 덮이지 않는가

## 8. 계획 자체의 완료 검사

원본 요청 8개와 현재 baseline 템플릿 일치, 제안별 변경 필드가 prompt/negative_prompt에 한정, 모델·입력 경로/해시·duration·cfg_scale·generate_audio·조립 프레임 범위 동일, 총 프레임 1,129, 파일럿/나머지 묶음의 누락·중복 없음, 문서 내 로컬 근거 링크 존재를 확인한다. 생성 품질 검증은 아직 수행하지 않았다.
