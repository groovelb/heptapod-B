# Heptapod B Hero Scene Keyframes

These folders group the cinematic hero assets by continuous motion scene. S01-S05 are image-to-video keyframe sets for external motion tools. S06-S07 include both generated visual plates and actual app captures for the final handoff into the live encoder UI.

All PNG files are `1672 x 941`.

| Scene | Folder | Frames | Motion Use |
|---|---|---|---|
| S01 | `s01-exterior-scale` | `start.png`, `end.png` | Slow aerial push toward the matte ovoid. Use `start` as the opening frame and `end` as the closer scale frame before cutting to the threshold. |
| S02 | `s02-threshold-opening` | `start.png`, `mid.png`, `end.png` | Top-down entry through the rounded-rectangle aperture. Use all three as camera-progress references if the motion tool supports multiple anchors. |
| S03 | `s03-rectangular-chamber` | `start.png`, `mid.png`, `end.png` | Slow forward drift through the dark rectangular chamber toward the white fog membrane. Keep motion low and stable. |
| S04 | `s04-fog-contact` | `start.png`, `mid.png`, `end.png` | Subtle contact and fog response. Avoid character walking motion. Let the ink response grow and the fog become dominant. |
| S05 | `s05-fog-fill-match` | `start.png`, `end.png` | Fog washout and match cut. Use very low motion, with the logogram dissolving into a clean UI-ready fog plate. |
| S06 | `s06-encoder-idle-plate` | `start.png`, `ui-capture.png` | `start` is a generated background plate. `ui-capture` is the real idle app state and should be the actual handoff reference. |
| S07 | `s07-logogram-response-plate` | `start.png`, `ui-capture.png` | `start` is a generated response plate. `ui-capture` is the real app state after encoding `arrival`. |
| X01 | `x01-deprecated-corridor-pilot` | `start.png` | Deprecated first pilot, kept only as a failure reference. Do not use in the final sequence. |

## Recommended Motion Chain

| Segment | Input Frames | Motion Level | Cut Strategy |
|---|---|---|---|
| S01 | `s01/start.png` to `s01/end.png` | Low | Cut on the ovoid scale increase. |
| S02 | `s02/start.png`, `s02/mid.png`, `s02/end.png` | Medium to high | Cut as the dark threshold fills the frame. |
| S03 | `s03/start.png`, `s03/mid.png`, `s03/end.png` | Low | Dissolve or hard cut into S04 when fog membrane dominates. |
| S04 | `s04/start.png`, `s04/mid.png`, `s04/end.png` | Low | Dissolve into S05 through the bright fog area. |
| S05 | `s05/start.png` to `s05/end.png` | Very low | Match cut into `s06/ui-capture.png`. |
| S06 | `s06/ui-capture.png` | Native app motion | Let the live `LogogramChamber` fog creep take over. |
| S07 | `s07/ui-capture.png` | Native app motion | Use after user input or as the target response state. |

Prompt source: `docs/heptapod-b-encoder/05-hero-cinematic-prompt-template.md`
