# Hero Cinematic Prompt Template

> Goal: create original cinematic hero frames that match the project mood, reference composition, color grading, film texture, object scale, and character continuity, then motion-animate selected stills before matching into the live encoder chamber.

## 1. Intent Summary

The intro should feel like entering an unknown vessel and arriving at the current Heptapod B encoder chamber, not like a separate marketing hero. The final frame should match the existing full-screen fog chamber in `HeptapodEncoderPage`.

## 2. Reference Roles

Use the movie captures as role-specific references, not as a single blended pile.

| Role | Reference | Purpose | Weight |
|---|---|---|---|
| Primary interior | `/Users/ddd/Desktop/s6.png` | rectangular dark chamber, distant white fog opening, near-black exposure | high |
| Interior scale | `/Users/ddd/Desktop/s7.png` | side view, bright left fog aperture, small orange-suited figures on the right | high |
| Fog and contact | `/Users/ddd/Desktop/s8.png` | cold white fog wall, blue-grey grade, human-to-membrane scale | high |
| Contact detail | `/Users/ddd/Desktop/s9.jpeg` | hand near fog wall, circular ink response, final transition cue | medium |
| Exterior scale | `/Users/ddd/Desktop/s1.png`, `/Users/ddd/Desktop/s2.png` | matte black ovoid over misty landscape, tiny human scale | medium |
| Threshold | `/Users/ddd/Desktop/s3.png` | rounded rectangular aperture, top-down entry, ground seen through darkness | medium |
| Avoid as primary | `/Users/ddd/Desktop/s4.png`, `/Users/ddd/Desktop/s5.png` | orange suits and actor identity are too dominant for this project's monochrome UI | low |

For Midjourney, pin `s6`, `s7`, and `s8` as the main look references. Add `s1` or `s2` only for exterior scale, `s3` only for threshold composition, and `s9` only for contact/logogram composition.

## 2.1 Screenshot Reanalysis, Feedback 1

The first pilot drifted too far into an Alien-style SF tunnel. The corrected read of the screenshots is:

- Exterior: misty overcast daylight, matte black vertical ovoid, muted green field, soft aerial haze, no visible mechanical paneling.
- Threshold: a rounded-rectangle opening surrounded by near-black interior mass. The outside world is seen through the aperture like a flat observation window.
- Interior: not a circular biological tunnel. It is a dark, elongated rectangular chamber with softly rounded corners, a flat-ish floor and ceiling, vertical striated wall texture, and very little specular detail.
- Light: the white fog membrane is an overexposed soft rectangle or wall, not a portal beam. Shadows are crushed at the edges.
- People: humans are small, mostly silhouettes or protected figures. The orange suit is a tiny accent only, not the image palette.
- Film and grade: low saturation, low contrast, green-grey blacks, blue-grey fog, soft halation around white fog, mild 35mm grain, documentary distance, no glossy concept-art finish.

Measured rough average color anchors from the captures:

| Reference | Average RGB hex | Use |
|---|---:|---|
| `s1.png` | `#545455` | exterior mist and landscape baseline |
| `s2.png` | `#595a59` | exterior overcast grey-green |
| `s3.png` | `#22241f` | threshold dark interior |
| `s6.png` | `#07090b` | near-black chamber exposure |
| `s7.png` | `#19191e` | dark chamber with fog aperture |
| `s8.png` | `#62636a` | fog wall and skin exposure |
| `s9.jpeg` | `#465c6e` | blue fog contact tint |

New hard avoids: circular ribbed tunnel, xenomorph biomechanical texture, wet cave corridor, sharp spaceship corridor, blue laser portal, glossy concept art, cyberpunk, high-contrast blockbuster lighting, oversized orange suits.

## 3. Locked Asset Template

- FORMAT: cinematic hero scene, full-bleed 16:9, web hero safe crop, no internal margin, center-safe focal area, no UI text baked into the image.
- LOOK: Analog Film plus Color Grading, soft 35mm grain, desaturated green-grey and blue-grey grade, crushed black edges, low contrast, restrained cold highlights, no neon.
- SUBJECT: original alien-vessel approach sequence, anonymous human researcher, matte black ovoid exterior, rectangular dark chamber, bright fog membrane.
- SERIES RULE: freeze FORMAT and LOOK. Vary only `SHOT`, `CAMERA`, `ACTION`, and `COMPOSITION LOCK`.

## 4. 7-Axis Frame

| Axis | Setting |
|---|---|
| Rendering | cinematic analog-film still, photoreal but restrained |
| Perspective | one-point perspective for chamber, wide scale for exterior, side profile for contact |
| Color | desaturated green-grey and blue-grey with cold white fog and near-black edges |
| Texture | soft film grain, vertical striated wall texture, diffuse fog, matte black shell |
| Composition | full bleed, negative space, tiny human scale against monumental architecture |
| Subject | original anonymous researcher and original non-mechanical alien vessel |
| Mood | quiet, slow, humid, reverent, research-facility coldness |

## 5. Selected Keywords

- Main style: `Analog Film`
- Color role: `Color Grading`
- Restraint note: do not add Cyberpunk, Synthwave, Neon/Vivid, Glossy Finish, Chrome Material, circular tunnel language, xenomorph biomechanics, or direct movie title/style wording. The cinematic feeling should come from lens, composition, color, scale, fog, and texture.

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
A vast dark rectangular chamber inside an unknown matte-black ovoid vessel, with softly rounded corners, flat-ish floor and ceiling, subtle vertical striations on the walls, deep shadow around the frame, and a cold white fog membrane that can match cut into a web UI fog chamber.

Subject:
An original anonymous human researcher in restrained protective gear, seen as a small silhouette or partial profile. The person is not a recognizable actor, and orange protective suits can appear only as a small muted accent when the shot needs human scale.

Details:
Use the supplied references only for cinematic composition, desaturated green-grey and blue-grey color grading, soft 35mm analog film grain, crushed black edges, low contrast, restrained highlights, atmospheric fog, and the scale relationship between a small human figure and a monumental quiet interior. Keep the frame full bleed, widescreen 16:9, center-safe for responsive web hero cropping.

Use case:
A cinematic hero intro still for an interactive Heptapod-style logogram encoder website, designed to motion-animate and match cut into a bright foggy UI chamber.

Constraints:
Do not copy any movie frame exactly. No recognizable actors, no film title, no logos, no readable text, no subtitles, no heavy orange palette, no circular tunnel, no xenomorph biomechanical texture, no wet cave corridor, no neon science-fiction look, no sharp spaceship panels, no glossy cyberpunk surfaces, no watermark, no UI elements baked into the generated image.
```

## 7. Shot Variable Slots

Only replace these slots between shots.

```text
SHOT:
{wide exterior scale | threshold opening | rectangular chamber approach | fog wall contact | full fog match cut}

CAMERA:
{distant aerial wide | top-down doorway | static wide chamber | side profile medium-wide | abstract full-frame fog}

ACTION:
{approaching the vessel | entering the aperture | crossing the rectangular chamber | raising one hand toward the membrane | fog filling the entire frame}

COMPOSITION LOCK:
{tiny human against huge matte ovoid | rounded rectangular opening | rectangular room with distant fog wall | figure on right and fog on left | no figure, only fog texture}
```

## 8. Pilot Prompt, Deprecated

This pilot produced a usable but too Alien-adjacent result. Keep it only as a failure note.

```text
Background:
A long dark organic corridor inside an unknown alien vessel, with wet black-green ribbed walls converging toward a small cold white fog membrane at the far end.

Result issue:
The prompt overemphasized organic corridor and ribbed walls, which pushed the result toward a circular biomechanical tunnel.
```

## 8.1 Representative Shot Prompts, Feedback 1

### Shot 01, Exterior Scale

```text
Background:
A misty overcast rural field under a pale grey sky, with a huge matte-black vertical ovoid vessel hovering silently above low fog. The landscape is muted green and grey, with soft aerial haze and no hard sunlight.

Subject:
Tiny anonymous research vehicles and tiny human figures sit far below the vessel for scale. Human details are barely readable.

Details:
Production-style analog 35mm film still, desaturated green-grey color grade, low contrast, soft atmospheric haze, restrained highlights, subtle film grain, documentary distance. Full-bleed 16:9 hero frame with the ovoid slightly left of center and large negative space in the mist.

Use case:
Opening hero intro shot for the Heptapod B encoder, designed to establish scale before transitioning inside.

Constraints:
Original scene only. Do not copy a movie frame exactly. No logos, no readable text, no actor identity, no hard sci-fi machinery, no metallic panels, no blue lasers, no neon, no glossy concept art, no watermark.
```

### Shot 02, Threshold Opening

```text
Background:
An interior view from within a near-black vessel, looking through a large rounded-rectangle opening down toward muted grass outside. The aperture has thick dark edges with softly rounded corners and almost no visible mechanical detail.

Subject:
Small anonymous researchers and equipment are visible far below through the opening. The inside foreground stays mostly black, with subtle vertical striated texture on the wall.

Details:
Production-style analog 35mm film still, desaturated green-grey and blue-grey grade, low contrast, crushed black interior, soft daylight outside, mild film grain, observational camera distance. Full-bleed 16:9 frame with the aperture as the main graphic shape.

Use case:
Threshold shot for the hero intro, bridging exterior scale into the dark chamber.

Constraints:
Original scene only. No exact movie-frame copy, no logos, no readable text, no actor identity, no circular tunnel, no ribbed alien biology, no glossy spaceship panels, no neon, no watermark.
```

### Shot 03, Rectangular Chamber Approach

```text
Background:
A long dark rectangular chamber inside an unknown matte-black ovoid vessel, with flat-ish floor and ceiling, softly rounded corners, subtle vertical striations on the black-green walls, and a cold white rectangular fog membrane glowing at the far end. The chamber is mostly black, with only faint wall texture visible.

Subject:
Several tiny anonymous protected researchers stand or float on a small platform near the right side, treated as scale marks rather than portraits. Orange is present only as a muted tiny accent.

Details:
Production-style analog 35mm film still, desaturated blue-grey and green-black color grade, low contrast, crushed edges, soft halation around the fog membrane, mild film grain, static wide camera. Full-bleed 16:9 frame, rectangular room geometry, no circular tunnel.

Use case:
Main chamber shot for the Heptapod B encoder intro, designed to motion-animate as a slow forward drift into the fog.

Constraints:
Original scene only. Do not copy a movie frame exactly. No recognizable actors, no logos, no readable text, no circular ribbed tunnel, no xenomorph biomechanics, no wet cave corridor, no sharp spaceship panels, no neon, no glossy cyberpunk surface, no watermark, no UI overlay.
```

### Shot 04, Fog Wall Contact

```text
Background:
A bright cold white fog membrane fills the left two-thirds of the frame, with a dark black-green striated chamber wall on the right. The fog is soft, overexposed, and blue-grey at the edges, matching a web UI fog chamber.

Subject:
An original anonymous researcher in a pale protective vest over dark muted clothing stands in right profile near the wall, raising one hand gently toward the fog membrane. The face is partially obscured and not recognizable. A faint circular ink-like logogram begins to appear in the fog near the hand.

Details:
Production-style analog 35mm film still, desaturated blue-grey color grade, low contrast, soft halation, restrained skin tones, mild grain, quiet documentary framing. Full-bleed 16:9 frame with figure on the right and large luminous fog negative space on the left.

Use case:
Contact shot for the Heptapod B encoder intro, designed to match cut into the live logogram chamber.

Constraints:
Original scene only. No exact movie-frame copy, no recognizable actor, no logos, no readable text, no subtitles, no dominant orange suit, no neon, no sharp sci-fi panels, no glossy cyberpunk surface, no watermark, no UI overlay.
```

### Shot 05, Full Fog Match Cut

```text
Background:
A full-frame cold white fog membrane, softly overexposed, with faint blue-grey gradients and barely visible black-green edges dissolving into mist. No chamber geometry is visible except the faintest dark vignette at the far edges. The fog should feel like the exact visual bridge into a web UI fog chamber.

Subject:
A faint incomplete circular ink-like logogram ring is suspended inside the fog at very low opacity, softly diffused, not fully formed.

Details:
Production-style analog 35mm film still, desaturated blue-grey color grade, low contrast, soft halation, diffuse fog texture, quiet static framing, mild grain. Full-bleed 16:9 frame, center-safe, empty enough for UI overlay.

Use case:
Match-cut bridge frame for the Heptapod B encoder intro, designed to dissolve from the contact shot into the live `LogogramChamber`.

Constraints:
Original scene only. No exact movie-frame copy, no recognizable actor, no logos, no readable text, no subtitles, no orange suit, no neon, no portal beam, no spaceship panels, no watermark, no UI overlay.
```

### Shot 06, Encoder Idle Plate

```text
Background:
A quiet full-frame fog chamber plate after the match cut, mostly luminous blue-grey white mist with subtle darker edges and a barely readable rectangular depth. The frame should resemble a live web encoder background before interface controls fade in.

Subject:
No human figure. No physical object. Only layered fog, a calm membrane surface, and a very faint dormant circular ink trace near the center.

Details:
Production-style analog 35mm film still, desaturated blue-grey color grade, low contrast, soft halation, gentle film grain, restrained static composition. Full-bleed 16:9 frame with a center-safe area for the future input box and generated logogram.

Use case:
Idle background plate for the Heptapod B encoder UI handoff, designed to sit behind live DOM interface elements.

Constraints:
Original scene only. No exact movie-frame copy, no human figure, no logos, no readable text, no subtitles, no orange suit, no neon, no portal beam, no spaceship panels, no watermark, no UI overlay, no visible input field baked into the image.
```

### Shot 07, Logogram Response Plate

```text
Background:
The same full-frame cold fog chamber plate, luminous but restrained, with blue-grey fog and softly crushed dark edges. The chamber depth should be almost abstract and not read as a mechanical spaceship.

Subject:
A larger circular ink-like logogram is forming in the fog, made of smoky black tendrils and soft diffusion, centered slightly above the eventual input area. The ring is original and symbolic, not readable text.

Details:
Production-style analog 35mm film still, desaturated blue-grey color grade, low contrast, soft halation around the fog, mild 35mm grain, quiet static camera. Full-bleed 16:9 frame with the logogram center-safe for responsive web hero cropping.

Use case:
Response-state plate for the Heptapod B encoder, designed as a visual target for the input-to-logogram motion.

Constraints:
Original scene only. No exact movie-frame copy, no recognizable actor, no logos, no readable text, no subtitles, no orange suit, no neon, no portal beam, no spaceship panels, no watermark, no UI overlay, no Latin letters or symbols.
```

## 9. Midjourney Setup

Recommended image creation setup:

```text
[s6 style reference] [s7 style reference] [s8 style reference] + selected Feedback 1 shot prompt --ar 16:9 --raw --stylize 35
```

For motion:

```text
Starting frame: selected still
Motion: low
Motion prompt: slow forward drift, subtle fog movement, no character walking cycle, no camera shake, keep composition and scale stable
```

Use `high motion` only for the threshold-entry shot. For the final fog match cut, use `low motion` and let the project UI take over with the existing `LogogramChamber` fog creep.

## 10. Output Route

- Deprecated pilot image: `public/heptapod-b-encoder/hero-pilot/hero-corridor-pilot-v1.png`
- Feedback 1 targets:
  - `public/heptapod-b-encoder/hero-pilot/hero-exterior-scale-fb1-v1.png`
  - `public/heptapod-b-encoder/hero-pilot/hero-threshold-opening-fb1-v1.png`
  - `public/heptapod-b-encoder/hero-pilot/hero-rectangular-chamber-fb1-v1.png`
  - `public/heptapod-b-encoder/hero-pilot/hero-fog-contact-fb1-v1.png`
  - `public/heptapod-b-encoder/hero-pilot/hero-fog-fill-match-fb1-v1.png`
  - `public/heptapod-b-encoder/hero-pilot/hero-encoder-idle-plate-fb1-v1.png`
  - `public/heptapod-b-encoder/hero-pilot/hero-logogram-response-plate-fb1-v1.png`
- Scene folder targets:
  - `public/heptapod-b-encoder/hero-scenes/s01-exterior-scale/start.png`
  - `public/heptapod-b-encoder/hero-scenes/s02-threshold-opening/start.png`
  - `public/heptapod-b-encoder/hero-scenes/s03-rectangular-chamber/start.png`
  - `public/heptapod-b-encoder/hero-scenes/s04-fog-contact/start.png`
  - `public/heptapod-b-encoder/hero-scenes/s05-fog-fill-match/start.png`
  - `public/heptapod-b-encoder/hero-scenes/s06-encoder-idle-plate/start.png`
  - `public/heptapod-b-encoder/hero-scenes/s07-logogram-response-plate/start.png`
  - `public/heptapod-b-encoder/hero-scenes/x01-deprecated-corridor-pilot/start.png`
- Prompt template document: `docs/heptapod-b-encoder/05-hero-cinematic-prompt-template.md`
- Next implementation target: intro overlay above `HeptapodEncoderPage`, fading out into the live `LogogramChamber`.
