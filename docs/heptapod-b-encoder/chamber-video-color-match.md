# 랜딩 끝 프레임과 Create·Archive 배경 색 정렬

기준은 현재 적용된 두 영상의 마지막 프레임1128(24fps)이다. 생성 후 거절된 모바일 수정 영상은 사용하지 않았다. 영상 파일에는 색보정을 적용하지 않았다.

- PC: `public/heptapod-b-encoder/hero-scrub-v2-topaz/hero-scrub-3832.mp4`
- 모바일: `public/heptapod-b-encoder/hero-scrub-v2-mobile/hero-scrub-1080x1920.mp4`

프레임을 PNG로 디코딩하고, 모바일 상하2px 패딩을 제외한 영역의160×160 표본 RGB 평균을 측정했다. 중앙은 가로·세로25~75%, 상·하단은15%, 우측은가로85~100%·세로15~85% 영역이다.

| 영역 | PC | 모바일 |
| --- | --- | --- |
| 전체 평균 | `#C6CDD9` | `#CFD8E8` |
| 중앙 | `#CED5E1` | `#D6DFEF` |
| 상단 | `#D4DAE5` | `#DBE3F1` |
| 하단 | `#B5BCC8` | `#BBC7D9` |
| 우측 | `#AFB8C5` | `#C0CADC` |

기존 청록색 베이스`#D6E8ED`와 색을 더하던 노이즈 틴트를 실측 블루그레이로 변경했다. `chamberSurfaceSx`가 md 미만 모바일/이상PC 표면을 선택하며, 상단·중앙이 밝고 하단·오른쪽이 어두운 명암을 그라데이션으로 근사한다.

Create와Archive의LogogramChamber 및 랜딩 종료 전환이 이 표면을 공유한다. multiply 안개 레이어는 낮은 강도의 중성soft-light로 변경하고 Create에만 있던 추가 비네트는 제거했다. 안개 드리프트·줌·진입 동작과 분석 모드의 어두운 스크림은 유지한다.

픽셀 단위로 영상을 재현한 배경은 아니며, 색·명암을 CSS로 근사한 결과다. 브라우저 자동화는 사용하지 않았다. CSSOM에서320/390/899/900/1440px 팔레트 선택을 확인하고, 모바일Hero·Canvas·종료 전환·렌더러 정지 회귀 검사를 실행한다.
