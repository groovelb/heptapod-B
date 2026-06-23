# Hero Cinematic Prompt Template

> Goal: create original cinematic hero frames that match the project mood, reference composition, color grading, film texture, object scale, and character continuity, then motion-animate selected stills before matching into the live encoder chamber.

## 1. Intent Summary

The intro should feel like entering an unknown vessel and arriving at the current Heptapod B encoder chamber, not like a separate marketing hero. The final frame should match the existing full-screen fog chamber in `HeptapodEncoderPage`.

## 2. Reference Roles

Use the movie captures as role-specific references, not as a single blended pile.

| Role | Reference | Purpose | Weight |
|---|---|---|---|
| Primary style | `/Users/ddd/Desktop/s6.png` | dark interior corridor, one-point perspective, distant fog membrane | high |
| Fog and color | `/Users/ddd/Desktop/s8.png` | cold white fog wall, blue-green grade, human-to-membrane scale | high |
| Exterior scale | `/Users/ddd/Desktop/s2.png` | huge dark object over landscape, tiny humans | medium |
| Contact detail | `/Users/ddd/Desktop/s9.jpeg` | hand near fog wall, circular ink response, final transition cue | medium |
| Avoid as primary | `/Users/ddd/Desktop/s4.png`, `/Users/ddd/Desktop/s5.png` | orange suits and actor identity are too dominant for this project's monochrome UI | low |

For Midjourney, pin `s6` and `s8` as style or image references for the master look. Add `s2`, `s7`, or `s9` only when that shot specifically needs scale, corridor, or contact composition.

## 3. Locked Asset Template

- FORMAT: cinematic hero scene, full-bleed 16:9, web hero safe crop, no internal margin, center-safe focal area, no UI text baked into the image.
- LOOK: Analog Film plus Color Grading, soft 35mm grain, desaturated blue-green monochrome, low contrast, restrained cold highlights, no neon.
- SUBJECT: original alien-vessel approach sequence, anonymous human researcher, dark organic interior, bright fog membrane.
- SERIES RULE: freeze FORMAT and LOOK. Vary only `SHOT`, `CAMERA`, `ACTION`, and `COMPOSITION LOCK`.

## 4. 7-Axis Frame

| Axis | Setting |
|---|---|
| Rendering | cinematic analog-film still, photoreal but restrained |
| Perspective | one-point perspective for corridor, wide scale for exterior, side profile for contact |
| Color | desaturated blue-green monochrome with cold white fog and near-black edges |
| Texture | soft film grain, humid ribbed black-green wall texture, diffuse fog |
| Composition | full bleed, negative space, tiny human scale against monumental architecture |
| Subject | original anonymous researcher and original non-mechanical alien interior |
| Mood | quiet, slow, humid, reverent, research-facility coldness |

## 5. Selected Keywords

- Main style: `Analog Film`
- Color role: `Color Grading`
- Restraint note: do not add Cyberpunk, Synthwave, Neon/Vivid, Glossy Finish, Chrome Material, or direct movie title/style wording. The cinematic feeling should come from lens, composition, color, scale, fog, and texture.

Derive validation:

```json
{
  "keywords": ["Analog Film", "Color Grading"],
  "violations": [],
  "negative": []
}
```

## 6. Master Prompt Template

Use this as the base for Codex image generation or as the text prompt beside image references in Midjourney.

```text
Background:
A vast dark organic interior of an unknown alien vessel, with wet black-green ribbed walls, deep shadow around the frame, and a distant cold white fog membrane that can match cut into a web UI fog chamber.

Subject:
An original anonymous human researcher in a restrained pale protective vest over dark clothing, seen as a small silhouette or partial profile. The person is not a recognizable actor and does not wear a dominant orange hazmat suit.

Details:
Use the supplied references only for cinematic composition, desaturated blue-green color grading, soft 35mm analog film grain, low contrast, restrained highlights, atmospheric fog, and the scale relationship between a small human figure and a monumental non-mechanical interior. Keep the frame full bleed, widescreen 16:9, center-safe for responsive web hero cropping.

Use case:
A cinematic hero intro still for an interactive Heptapod-style logogram encoder website, designed to motion-animate and match cut into a bright foggy UI chamber.

Constraints:
Do not copy any movie frame exactly. No recognizable actors, no film title, no logos, no readable text, no subtitles, no heavy orange palette, no neon science-fiction look, no sharp spaceship panels, no glossy cyberpunk surfaces, no watermark, no UI elements baked into the generated image.
```

## 7. Shot Variable Slots

Only replace these slots between shots.

```text
SHOT:
{wide exterior scale | threshold opening | one-point corridor | fog wall contact | full fog match cut}

CAMERA:
{distant aerial wide | top-down doorway | slow forward dolly | side profile medium-wide | abstract full-frame fog}

ACTION:
{approaching the vessel | entering the aperture | drifting through the dark passage | raising one hand toward the membrane | fog filling the entire frame}

COMPOSITION LOCK:
{tiny human against huge object | rounded rectangular opening | central vanishing point | figure on right and fog on left | no figure, only fog texture}
```

## 8. Pilot Prompt

This pilot targets the representative corridor-to-fog shot because it best bridges the film references and the current project UI.

```text
Background:
A long dark organic corridor inside an unknown alien vessel, with wet black-green ribbed walls converging toward a small cold white fog membrane at the far end. The frame edges fall into near-black shadow while the distant membrane glows softly enough to become the next screen.

Subject:
One original anonymous human researcher appears very small in the right third of the frame, wearing a restrained pale protective vest over dark clothing, moving weightlessly toward the light. The face is not readable, and the figure is treated as scale rather than a character portrait.

Details:
Analog 35mm film still with soft grain, desaturated blue-green color grading, low contrast, quiet cold highlights, humid wall texture, slow atmospheric fog, and one-point perspective. Full-bleed 16:9 composition with a center-safe vanishing point and no internal border.

Use case:
Pilot hero intro still for the Heptapod B encoder. It should motion-animate as a slow forward drift and match cut into the existing bright fog chamber UI.

Constraints:
No exact movie frame copy, no recognizable actor, no film title, no logos, no readable text, no subtitles, no dominant orange hazmat suit, no neon, no sharp mechanical spaceship panels, no glossy cyberpunk surfaces, no watermark, no UI overlay.
```

## 9. Midjourney Setup

Recommended image creation setup:

```text
[s6 style reference] [s8 style reference] + Pilot Prompt --ar 16:9 --raw --stylize 50
```

For motion:

```text
Starting frame: selected pilot still
Motion: low
Motion prompt: slow forward dolly through the dark organic corridor toward the cold fog membrane, subtle fog drift, no character walking cycle, no camera shake, keep composition and scale stable
```

Use `high motion` only for the threshold-entry shot. For the final fog match cut, use `low motion` and let the project UI take over with the existing `LogogramChamber` fog creep.

## 10. Output Route

- Pilot image target: `public/heptapod-b-encoder/hero-pilot/hero-corridor-pilot-v1.png`
- Prompt template document: `docs/heptapod-b-encoder/05-hero-cinematic-prompt-template.md`
- Next implementation target: intro overlay above `HeptapodEncoderPage`, fading out into the live `LogogramChamber`.
