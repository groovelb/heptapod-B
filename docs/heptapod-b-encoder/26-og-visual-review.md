# OG visual review — 2026-09-07

## Requested changes

Give social previews a stronger visual focus, remove cropped/frame-like regions and
unreadable small copy, and place a centered Heptapod B title over the entire existing
landing image. Make and inspect samples before applying the result to production.

## Review and decision

The initial card had an inset photo, a 28–32px heading and 16px footer. The glyph PNG
also went through a second reduction during card composition. Those decisions made
the actual content too small in a 300px social preview.

Two landing treatments were rendered from the same original plate. The white title
over a restrained dark wash was selected after comparison at 1200px and 300px. The
dark-title alternative was rejected because the letters competed with the dark ink
ring and had less separation in the small preview. The final headline uses the
site's Cinzel face at 112px, centered by its measured ink bounds.

The source image is fitted without cropping or aspect-ratio distortion. Only its
edge pixels are mirrored to fill the narrow side gaps. All photo framing and small
secondary text are removed.

Individual glyphs now fit their actual particle bounds instead of an empty 720px
coordinate canvas. The whole ink geometry, including small drops and tendrils, has
at least 14px of clear raster margin. A 1.25 ink contrast multiplier improves thin
strokes at thumbnail scale; stored geometry and application rendering are unchanged.

Archive cards select three real representatives from the same group and ordering
logic. This replaces the prior six small glyphs. The full group count/meaning stays
in HTML metadata. Focused archive glyphs use the individual layout. Titles use 64px
type, with a 52px lower bound and two-line maximum for exceptional long names.
There is no footer or automatically shrinking explanatory text.

## Samples inspected before deployment

`node scripts/generate-og-samples.mjs tmp/og-review/public-snapshot.json`
generated eight cases using a read-only snapshot of public models:

- Landing: accepted white title and rejected dark-title alternative.
- Individual Korean name.
- A real meaning group.
- Archive overview.
- Two-glyph comparison, including a mixed Korean/Latin heading.
- Long Latin name with two lines.
- Long Korean group heading with multiple modifiers.

Full images and 300px previews were inspected as image files, without browser
automation. The review boards are under `tmp/og-review/final/`; they are local QA
artifacts and are excluded from deployment. Title clipping, cut-off glyph geometry,
tiny secondary copy, and the old inset frame were not present in the accepted set.

## Validation

- OG tests: 7/7 passed, including literal model identity, group membership,
  visibility recheck, text bounds, glyph margins, caption removal and reproducible
  accepted landing output.
- Targeted ESLint: passed.
- Next production build: passed.
- Both Noto Serif KR and Cinzel are included in the production function trace.
- New landing filename and updated dynamic image version keys avoid reusing the
  previous design's image URL in newly fetched metadata.

No application page layout, encoder model, archive membership, or interaction was
changed. Browser/social-app screenshots were not used; the actual 1200px and 300px
PNG outputs were inspected.

## Production confirmation

Applied after the sample review to https://heptapod-b.vercel.app.
Deployment `dpl_DGw2xUnmqjMX3CKd4DEJ9tFSPEvM` reached `READY`.
The deployed landing PNG matches the accepted local sample byte-for-byte.
Actual individual and group OG endpoints both returned the new 1200×630 cards;
their downloaded PNGs were also inspected. Production HTTP checks: 16/16 passed.

## v5 — 원 중앙 정렬과 Bold (2026-09-07)

사용자 요청에 따라 모든 OG 제목을 원 중앙에 배치했다. 개인 표식은 실제 모델의
링 원점(CX0, CY0)에 이름을 맞추며, 비교 OG는 각 이름을 각자의 원 중앙에 둔다.
군집은 가운데 대표 원에 제목을 두고, 대표가 두 개면 첫 원 중앙에 둔다.
전체 입자 경계를 원점 기준으로 대칭 확장해 긴 잉크 가닥도 잘리지 않는다.
랜딩은 기존 원본 전체를 유지하면서 제목 중심을 원 중심 y=264에 맞췄다.

한글은 Noto Serif KR Bold, 영문은 Cinzel의 실제 wght=700 정적 인스턴스를
사용한다. 글자 외곽선에 얇은 안개색 테두리를 넣어 표식 잉크와 겹치는 긴 이름도
읽히게 했다. 본문 UI 변경은 없다.

검수: `tmp/og-review/v5/review-600.png`, `review-300.png`의 8종 및
`two-member-group.png` 추가 사례를 파일로 직접 확인했다. OG 테스트 7개,
대상 ESLint, Next production build 통과. 서버 추적 파일에 두 Bold 폰트가
포함됨을 확인했다. 랜딩 메타데이터는 `landing-v5.png`로 갱신했다.

v5 운영 배포 완료: https://heptapod-b.vercel.app
배포 ID: `dpl_LY5F5e6cRays5B3zwiE9UbZhEp98` (READY).
운영 HTTP 검사 16개 통과. 운영 랜딩 PNG와 로컬 승인 PNG의 바이트 일치 확인,
운영 개인/군집 PNG도 다운로드해 중앙 정렬과 굵기를 직접 확인했다.

## v6 — 랜딩의 원과 제목을 화면 정중앙으로 (2026-09-07)

원본 내 원 중심(높이의 264/630)을 기준으로 사진 전체가 1200×630 안에 들어오도록
비율을 유지해 축소하고 가장자리 안개를 확장했다. 원 중심과 제목의 잉크 경계 중심을
모두 (600,315)에 맞췄다. 원본 사진을 자르지 않았다. OG 테스트 7개와 production
build 통과, 생성 PNG 파일 직접 검수. 새 랜딩 이미지 URL은 `landing-v6.png`.
한/영 OG와 앞서 기획한 후킹 메타 문구는 이번 수정에 포함하지 않았다.
