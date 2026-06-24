# Hero Cinematic Prompt Template

> Goal: create original cinematic hero frames that match the project mood, reference composition, color grading, film texture, object scale, and character continuity, then motion-animate selected stills before matching into the live encoder chamber.

## 1. Intent Summary

The intro should feel like entering an unknown vessel and arriving at the current Heptapod B encoder chamber, not like a separate marketing hero. The final frame should match the existing full-screen fog chamber in `HeptapodEncoderPage`.

## 2. Reference Roles

Use the movie captures as role-specific references, not as a single blended pile.

| Role | Reference | Purpose | Weight |
|---|---|---|---|
| Primary interior | `/Users/ddd/Desktop/s6.png` | rectangular dark chamber, large white fog membrane, near-black exposure | high |
| Interior scale | `/Users/ddd/Desktop/s7.png` | side view, bright left aperture, gravity reorientation, human scale only | high |
| Fog and contact | `/Users/ddd/Desktop/s8.png` | cold white fog wall, blue-grey grade, human-to-membrane scale | high |
| Contact detail | `/Users/ddd/Desktop/s9.jpeg` | hand near fog wall, circular ink response, final transition cue | medium |
| Exterior scale | `/Users/ddd/Desktop/s1.png`, `/Users/ddd/Desktop/s2.png` | matte black ovoid over misty landscape, tiny human scale | medium |
| Threshold | `/Users/ddd/Desktop/s3.png` | rounded rectangular aperture, top-down entry, ground seen through darkness | medium |
| Suit continuity caution | `/Users/ddd/Desktop/s4.png`, `/Users/ddd/Desktop/s5.png` | lift entry mechanics, visor scale, sealed fabric bulk only; do not transfer orange/red palette | low |

For Midjourney, pin the project keyframes as the identity/style references first. Use `s6`, `s7`, and `s8` only for chamber geometry, physical camera behavior, lift-to-plane staging, gravity reorientation, and membrane scale. Add `s1` or `s2` only for exterior scale, `s3` only for threshold composition, and `s9` only for contact/logogram composition.

## 2.0 Project Continuity Lock

These rules override the movie captures. The captures are used to understand physics, camera angle, scale, and gravity behavior only. They must not overwrite the project's established objects, characters, palette, or grade.

- Project baseline: pale grey protective suits, dark industrial scissor lift/platform, black rails, compact black equipment cases, desaturated green-grey/blue-grey grade, matte black ovoid/interior, and practical 35mm analog film still.
- Characters: keep the existing project team in pale grey protective suits, soft fabric wrinkles, dark boots and gloves, muted backpack breathing units, and compact black equipment cases.
- Lift: keep the existing dark industrial scissor lift / lift platform with black guard rails and equipment cases. Do not recolor it into an orange/red platform.
- Palette: keep the approved desaturated green-grey exterior, blue-grey fog, matte black shell, matte black UFO interior, dark blue-black shadows, low contrast, and mild 35mm grain.
- Object continuity: the same four-person team, same lift, same equipment cases, same matte-black ovoid surface, and same lower rounded-rectangle aperture opening from the surface itself.
- Movie-reference usage: use the screenshots only for underside aperture entry, top-down lift ascent, camera tilt, 90-degree gravity roll, former wall becoming walkable floor, and large fog membrane scale.
- Hard lock: do not transfer orange/red suits, orange/red lift/platform color, actor portrait framing, ramp/bridge/stair/gangway/walkway entry logic, soldiers walking into a doorway, small glowing final rectangles, or the movie's exact costume palette into the project sequence.

## 2.1 Screenshot Reanalysis, Feedback 1

The first pilot drifted too far into an Alien-style SF tunnel. The corrected read of the screenshots is:

- Exterior: misty overcast daylight, matte black vertical ovoid, muted green field, soft aerial haze, no visible mechanical paneling.
- Threshold: a rounded-rectangle opening surrounded by near-black interior mass. The outside world is seen through the aperture like a flat observation window.
- Interior: not a circular biological tunnel. It is a dark, elongated rectangular chamber with softly rounded corners, a flat-ish floor and ceiling, vertical striated wall texture, and very little specular detail.
- Light: the white fog membrane is an overexposed soft rectangle or wall, not a portal beam. Shadows are crushed at the edges.
- People: humans are small, mostly silhouettes or protected figures. The movie's orange suits are reference-only; the project sequence keeps pale grey protective suits and muted gear.
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

New hard avoids: circular ribbed tunnel, xenomorph biomechanical texture, wet cave corridor, sharp spaceship corridor, blue laser portal, glossy concept art, glossy CG, cyberpunk, high-contrast blockbuster lighting, orange/red suit palette transfer, orange/red lift/platform transfer, black tactical suits, oversized costume close-ups, ramp, bridge, stairs, gangway, walkway, soldiers walking into doorway, small glowing rectangle as the final membrane, portal/tractor beam logic, and game render polish.

## 2.2 Locked Scene Structure, Current Cut

The active cut is split into three clear scene units: exterior aperture opening, lift ascent, and first chamber walk. Use the movie references for physical camera behavior, gravity transition behavior, and human-to-architecture scale only; costume color, lift color, object palette, props, and interior material stay locked to the project baseline.

Exterior/entry scene, active Shots 02-05:

- 02 underside surface opening: exterior underside view under the matte black ovoid as the surface itself begins to open. A subtle seam or slit appears and starts forming a rounded-rectangle aperture. There is no built ramp, bridge, stairs, gangway, walkway, or soldier doorway.
- 03 pure aperture lift entry: the rounded-rectangle aperture is fully open as a clean cut in the matte black ovoid surface. The only entry device is the dark industrial scissor lift/platform with black rails directly below, preparing to rise into the opening.
- 04 same-aperture confirmation: approach/angle connection cut that teaches the viewer this is the same lower aperture from Shot 03. The camera moves closer or changes angle while preserving the exterior-to-aperture relationship and the lift as the only access.
- 05 entry into darkness close: keep the same aperture relationship as Shot 04, but move closer than the previous version. The camera, workers, lift/platform, black rails, and compact cases are nearly inside the matte black interior, with the frame swallowed by darkness while the lower/back aperture relationship remains readable.

Inactive transition note:

- 04.5 threshold-lip angle bridge is excluded from the active sequence. Do not generate it, route motion through it, or use it as a required continuity frame unless it is explicitly reinstated later.

Lift scene, active Shots 06-10:

- 06 long vertical ascent start: separate lift-scene opening after the entry cut. The dark industrial lift rises inside a very tall matte black ovoid interior. The distant ceiling/front contact surface is only a tiny pale target far above.
- 07 long vertical ascent mid: the lift continues rising through the long dark vertical interior. The contact surface grows only modestly through real distance traveled and remains far away; this shot must differ clearly from 06 without collapsing the scale.
- 08 long vertical ascent late approach: the lift is higher, the vessel's curved side walls begin to guide the eye toward the ceiling/front contact surface, and the destination is larger but not yet a full wall. The team is still riding and bracing, not walking.
- 09 distant wide-wall ascent: the lift is still vertically ascending from a farther distance than Shot 10. The eventual front luminous fog/contact wall should already read wide from side to side like Shot 11, but it remains distant. No floor, corridor, walking path, or walking action is visible.
- 10 prewalk landing wide wall: the lift reaches the landing immediately before Shot 11, just before or just after gravity stabilizes. The workers are still on the lift/platform and have not stepped off. The front luminous fog/contact wall fills the left and right sides of the frame.

Chamber handoff, active Shot 11:

- 11 walking to wide wall: only after disembarking, the same pale grey-suited workers begin walking toward the luminous fog/contact wall. The wall or screen must be a broad front plane filling both left and right sides of the frame, not a small inserted display.

Scale correction: the ovoid vessel is extremely tall. The contact surface cannot be close immediately after entry, cannot fill the frame in Shot 06 or Shot 07, and should only become architecturally dominant near Shots 09-11 after visible lift travel. Nobody walks during the lift scene. Shot 10 is the prewalk landing, Shot 11 is the first walking beat, and the full fog match cut remains a separate transition plate after the chamber handoff.

Additional hard avoids for the current cut: walking directly from the grass into the UFO, ramp, bridge, stairs, gangway, walkway, soldiers walking into doorway, active 04.5 threshold-lip bridge usage, a frontal horizontal corridor before gravity reorientation, floor/corridor/walking cues in Shot 09, people walking during lift ascent, people walking before Shot 11, a small glowing rectangle as the final membrane, a small screen floating inside broad black ceiling margins, a rectangular screen inserted into a black wall, floating bodies after gravity stabilizes, zero-gravity drifting after the handoff, the fog wall moving toward the camera, a portal pulling the camera forward, tractor-beam visuals, sleek sci-fi elevator cabins, loud decorative machinery, orange or red suit transfer, orange or red lift/platform transfer, black tactical suits, suit color changes, 3D game render polish, clean CG symmetry, glossy panel highlights, and unreal plastic material.

## 3. Locked Asset Template

- FORMAT: cinematic hero scene, full-bleed 16:9, web hero safe crop, no internal margin, center-safe focal area, no UI text baked into the image.
- LOOK: Practical film still, Analog Film plus Color Grading, soft 35mm grain, low contrast, desaturated green-grey/blue-grey grade, cool matte black UFO interior, soft exterior daylight, crushed black edges, restrained cold highlights, no neon, no clean CG.
- SUBJECT: original alien-vessel approach sequence, the same four-person research team in pale grey protective suits, matte black ovoid exterior, underside surface seam opening, pure rounded-rectangle aperture, dark industrial scissor lift/platform with black rails as the only entry device, entry into darkness close frame, separate lift scene, long vertical lift ascent start, long vertical ascent mid, long vertical ascent late approach, distant wide-wall ascent, prewalk landing wide wall, walking to wide luminous fog/contact wall, full fog match cut.
- SERIES RULE: freeze FORMAT and LOOK. Vary only `SHOT`, `CAMERA`, `ACTION`, and `COMPOSITION LOCK`.

## 4. 7-Axis Frame

| Axis | Setting |
|---|---|
| Rendering | cinematic analog-film still, photoreal but restrained |
| Perspective | exterior underside surface opening view, fully open pure aperture with lift directly below, same-aperture approach angle, entry-into-darkness close frame, separate lift-scene vertical ascent start, long vertical ascent mid, long vertical ascent late approach, distant wide-wall ascent, prewalk landing facing a wide luminous contact wall, walking view after disembark toward the same wide wall |
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
A vast matte black UFO interior inside an extremely tall matte-black ovoid vessel, with rough striated dark surfaces, a lower rounded-rectangle aperture that opens from the matte ovoid surface itself, no added entry structure, a separate lift-scene vertical interior, curved side walls that can visually feed into the ceiling/front contact surface near late ascent, cool blue-black shadows, deep shadow around the frame, and a luminous white fog/contact wall that becomes a full wide front plane only after the long ascent and prewalk landing, then match cuts into a web UI fog chamber.

Subject:
The same four anonymous researchers in pale grey protective suits with soft fabric wrinkles, dark boots and gloves, muted backpack breathing units, and compact black equipment cases. In the entry phase Shot 02 shows a seam/slit beginning in the matte black ovoid surface while the researchers are already standing on the dark industrial scissor lift/platform. Shot 03 shows the pure rounded-rectangle aperture fully open with the same boarded lift directly below, Shot 04 confirms the same aperture relationship, and Shot 05 moves closer until the workers and lift are almost inside the matte black interior. Shot 04.5 is inactive. In the separate lift scene the same dark industrial lift/platform with black rails ascends vertically through the very tall ovoid interior; the contact surface starts tiny and distant, grows through visible lift travel, becomes a distant wide front wall in Shot 09, and becomes the prewalk landing wall in Shot 10 with the lift still farther from the wall than the workers will be in Shot 11. They do not walk during the entry or lift scene; walking begins only in Shot 11 after disembarking toward the same wide luminous fog/contact wall. No person is a recognizable actor. Do not change the suit design, suit color, lift/platform color, equipment cases, or palette between shots.

Details:
Use the supplied references only for cinematic composition, practical film-still realism, 35mm analog film grain, low contrast, desaturated green-grey exterior daylight, cool blue-black interior grading, crushed but readable black edges, restrained highlights, atmospheric dust and haze, matte rough black striated interior surfaces, and the scale relationship between small human figures and monumental quiet architecture. Keep the frame full bleed, widescreen 16:9, center-safe for responsive web hero cropping.

Use case:
A cinematic hero intro still for an interactive Heptapod-style logogram encoder website, designed to motion-animate and match cut into a bright foggy UI chamber.

Constraints:
Do not copy any movie frame exactly. No recognizable actors, no film title, no logos, no readable text, no subtitles, no orange or red suits, no orange or red lift/platform, no orange/red palette transfer, no black tactical suits, no suit color changes, no ramp, no bridge, no stairs, no gangway, no walkway, no soldiers walking into doorway, no active 04.5 threshold-lip bridge, no frontal horizontal corridor before gravity reorientation, no one-point hallway before gravity reorientation, no walking during lift ascent, no walking before Shot 11, no floor/corridor/walking cues in Shot 09, no close contact plane immediately after entry, no small glowing rectangle as the final membrane, no small screen floating inside wide black ceiling margins, no small rectangular screen inserted into a black wall, the final/contact screen must become a full luminous fog wall only after the long ascent and gravity transition, no circular tunnel, no xenomorph biomechanical texture, no wet cave corridor, no neon science-fiction look, no portal beam, no tractor beam, no sharp spaceship panels, no glossy CG surfaces, no game render, no clean CG, no watermark, no UI elements baked into the generated image.
```

## 7. Shot Variable Slots

Only replace these slots between shots.

```text
SHOT:
{02 underside surface opening | 03 pure aperture lift entry | 04 same-aperture confirmation | 05 entry into darkness close | 06 lift scene, long vertical ascent start | 07 lift scene, long vertical ascent mid | 08 lift scene, long vertical ascent late approach | 09 distant wide-wall ascent | 10 prewalk landing wide wall | 11 walking to wide wall | full fog match cut}

CAMERA:
{exterior underside view where the matte black surface begins to slit open | exterior underside view of the fully open rounded-rectangle aperture with the lift directly below | closer approach angle that clearly matches the same lower aperture | close entry view with workers and lift almost inside darkness | upward rider view at ascent start with the contact surface tiny and far above | upward rider view at mid-ascent with the contact surface modestly larger but still far | higher rider view as curved walls begin guiding toward the ceiling/front screen | farther-than-Shot-10 vertical ascent view of the distant wide wall | prewalk landing view facing a left-to-right luminous fog/contact wall | post-disembark walking view toward the same wide front wall | abstract full-frame fog}

ACTION:
{surface seam/slit begins to open into a rounded rectangle | aperture fully open while the scissor lift waits directly below to rise | confirming the same aperture through approach and angle continuity | camera, workers, lift, rails, and cases move almost inside the dark interior, not walking | riding upward on the dark industrial lift at ascent start, not walking | continuing the long vertical lift ascent with modest contact-surface growth, not walking | continuing the ascent into the late approach, still bracing on the lift | rising vertically toward a still-distant wide wall, not walking | arriving or stabilizing on the lift before anyone steps off | walking begins only after disembarking toward the wide wall | fog filling the entire frame}

COMPOSITION LOCK:
{matte black surface itself opening, no added access structure | pure rounded-rectangle aperture, lift directly below, no ramp or walkway | same aperture kept readable across the cut | closer darkness swallowing the nearly entered lift and workers | lift rails foreground, extremely tall vertical ascent path, tiny contact surface far above | long vertical shaft still dominant, contact surface modestly larger but distant | curved wall geometry beginning to aim toward the destination, not full wall yet | distant wide wall visible across left and right, no floor, corridor, or walking | full wide front wall is luminous fog/contact screen, workers still on lift | first walking beat toward a wide wall filling both sides | no figure, only large fog texture}
```

## 8. Pilot Prompt, Deprecated

This pilot produced a usable but too Alien-adjacent result. Keep it only as a failure note.

```text
Background:
A long dark organic corridor inside an unknown alien vessel, with wet black-green ribbed walls converging toward the fog membrane as a distant target.

Result issue:
The prompt overemphasized organic corridor and ribbed walls, which pushed the result toward a circular biomechanical tunnel and reduced the membrane to a distant target.
```

## 8.1 Representative Shot Prompts, Current Cut

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

### Shot 02, Underside Surface Opening

```text
Background:
A misty exterior underside view below the huge matte-black ovoid vessel, looking up as the matte black surface itself begins to open. A subtle seam or slit appears in the underside and starts to form a rounded-rectangle aperture, with no visible constructed doorway frame or added access structure.

Subject:
The same four anonymous researchers in pale grey protective suits are already standing on the dark industrial scissor lift/platform below the forming aperture. Black rails and compact black equipment cases are visible as continuity marks, but human detail stays small and practical. No one is still walking from the ground onto the platform in this frame.

Details:
Practical 35mm analog film still, desaturated green-grey exterior, blue-grey haze, low contrast, matte black UFO surface, restrained highlights, mild film grain, and documentary scale. Full-bleed 16:9 frame that clearly teaches that the entrance is opening from the ovoid surface itself.

Use case:
Shot 02 underside surface opening, establishing the first seam/slit in the matte black ovoid with the team already boarded on the lift. Filename candidate `underside-surface-opening-boarded-v1.png`.

Constraints:
Original scene only. No exact movie-frame copy, no logos, no readable text, no actor identity, no orange or red suits, no orange or red lift/platform, no orange/red palette transfer, no black tactical suits, no ramp, no bridge, no stairs, no gangway, no walkway, no soldiers walking into doorway, no walking into a ground doorway, no portal, no tractor beam, no blue laser, no glossy spaceship panels, no glossy CG, no game render, no clean CG, no watermark.
```

### Shot 03, Pure Aperture Lift Entry

```text
Background:
A misty exterior underside view below the huge matte-black ovoid vessel, looking up toward the fully open lower rounded-rectangle aperture. The aperture is a pure dark opening cut into the matte black surface itself, surrounded by unbroken ovoid material and soft green-grey daylight haze.

Subject:
The same four anonymous researchers in pale grey protective suits are on the dark industrial scissor lift/platform directly below the aperture, preparing to rise into it. Black rails and compact black equipment cases are visible as continuity marks. Nobody is walking into a doorway.

Details:
Practical 35mm analog film still, desaturated green-grey exterior, blue-grey haze, low contrast, matte black UFO surface, restrained highlights, mild film grain, and documentary scale. Full-bleed 16:9 frame that makes the lift/platform the only entry method.

Use case:
Shot 03 pure aperture lift entry, establishing the fully open surface aperture and the lift directly below. Filename candidate `pure-aperture-lift-entry-v3.png`.

Constraints:
Original scene only. No exact movie-frame copy, no logos, no readable text, no actor identity, no orange or red suits, no orange or red lift/platform, no orange/red palette transfer, no black tactical suits, no ramp, no bridge, no stairs, no gangway, no walkway, no soldiers walking into doorway, no walking into a ground doorway, no portal, no tractor beam, no blue laser, no glossy spaceship panels, no glossy CG, no game render, no clean CG, no watermark.
```

### Shot 04, Same-Entrance Confirmation

```text
Background:
A closer approach angle to the exact same lower rounded-rectangle aperture under the matte-black ovoid vessel. The camera has moved nearer and slightly changed angle, but the pure surface opening, exterior underside position, lift-below-aperture relation, and misty field relationship remain unmistakably continuous with Shot 03.

Subject:
The dark industrial scissor lift/platform with black rails aligns beneath the same aperture. The same pale grey-suited team and compact black equipment cases are readable enough to connect the cut, still standing or bracing on the lift, not walking.

Details:
This cut exists to train continuity, not to add a new entrance. Preserve the same aperture geometry while moving the camera closer. Practical 35mm analog film still, desaturated green-grey/blue-grey grade, matte black UFO surface, low contrast, mild film grain, soft lens falloff, and restrained physical scale.

Use case:
Shot 04 same-aperture confirmation, connecting the exterior reveal toward threshold coverage without a teleporting camera jump.

Constraints:
No second doorway, no orange or red suits, no orange or red lift/platform, no orange/red palette transfer, no black tactical suits, no suit color changes, no ramp, no bridge, no stairs, no gangway, no walkway, no soldiers walking into doorway, no horizontal corridor, no walking, no levitation, no portal, no tractor beam, no glossy sci-fi panels, no glossy CG, no clean CG, no game render, no readable text, no watermark.
```

### Shot 05, Entry Into Darkness Close

```text
Background:
A tighter, closer view through the exact same lower rounded-rectangle aperture relationship established in Shot 04. The camera, workers, and lift/platform are almost inside the matte black ovoid interior, where rough dark striated surfaces and crushed blue-black shadow swallow most of the frame. The lower/back aperture relationship remains readable, with muted green-grey exterior daylight falling away behind them rather than becoming a new doorway.

Subject:
The same four anonymous researchers in pale grey protective suits are on the dark industrial scissor lift/platform with black guard rails and compact black equipment cases. They are standing or bracing, not walking, with the lift nearly entering the vessel. Their suits, dark boots, dark gloves, muted backpack breathing units, black rails, and equipment cases remain consistent while the interior darkness takes over.

Details:
This is the final frame of the entry scene, not the beginning of the lift scene. Preserve the Shot 04 composition logic and lower entrance relationship, but push the camera, team, lift, and cases much closer into the dark interior so the cut ends as they are almost inside and swallowed by matte black shadow. Practical 35mm analog film still, desaturated green-grey/blue-grey grade, low contrast, matte black ovoid interior, crushed but readable edges, mild film grain, and real lens softness.

Use case:
Shot 05 entry into darkness close, closing the entry scene before the separate lift scene begins. Filename candidate `entry-into-darkness-close-v2.png`.

Constraints:
Original scene only. No exact movie-frame copy, no logos, no readable text, no actor identity, no active Shot 04.5 threshold-lip bridge, no second doorway, no ramp, no bridge, no stairs, no gangway, no walkway, no soldiers walking into doorway, no orange or red suits, no orange or red lift/platform, no orange/red palette transfer, no black tactical suits, no suit color changes, no walking, no horizontal corridor, no close contact screen, no circular tunnel, no glossy spaceship panels, no glossy CG, no neon, no portal, no tractor beam, no sleek sci-fi elevator cabin, no game render, no clean CG, no watermark.
```

### Shot 06, Long Vertical Ascent Start

```text
Background:
The separate lift scene begins inside the extremely tall matte black UFO interior. The dark industrial lift rises vertically through rough black striated walls and blue-black shaft scale. The ceiling/front contact surface is still only a tiny pale target far above, distant enough that the vessel height dominates the frame.

Subject:
The same four anonymous researchers in pale grey protective suits ride the lift with black rails visible. They are standing or bracing with compact black equipment cases, not walking. The lift remains a practical industrial platform, not a beam, pod, or sleek elevator cabin.

Details:
The motion is the start of a long vertical lift ascent through a very tall ovoid. The contact surface must not feel close, reachable, or frame-filling yet. Practical 35mm analog film still, low contrast, matte black interior, desaturated green-grey/blue-grey grade, crushed readable shadows, restrained distant white glow, atmospheric dust and haze, mild grain, and real lens softness.

Use case:
Shot 06 lift scene, long vertical ascent start, making the ovoid height and distant contact surface unmistakable.

Constraints:
Original scene only. No exact movie-frame copy, no logos, no readable human text, no actor identity, no orange or red suits, no orange or red lift/platform, no orange/red palette transfer, no black tactical suits, no suit color changes, no walking during lift ascent, no horizontal corridor before gravity reorientation, no close contact surface immediately after entry, no frame-filling membrane yet, no portal, no tractor beam, no levitation, no glossy panels, no glossy CG, no game render, no clean CG, no watermark.
```

### Shot 07, Long Vertical Ascent Mid

```text
Background:
The dark industrial lift continues rising through the long vertical interior of the matte black ovoid. The ceiling/front contact surface is modestly larger than in Shot 06 because of real distance traveled, but it still remains far above and the vertical shaft still dominates.

Subject:
The same four anonymous researchers in pale grey protective suits ride the lift with black rails and compact black equipment cases. They are standing or bracing during ascent, not walking, not disembarking, and not floating. The lift remains the same dark industrial platform.

Details:
This is the middle of the ascent, not arrival. The contact surface grows only through lift travel and must not become a nearby wall, a portal, or a large final fog membrane. Practical 35mm analog film still, low contrast, matte black interior, desaturated green-grey/blue-grey grade, crushed readable shadows, restrained distant glow, atmospheric dust and haze, mild grain, and real lens softness.

Use case:
Shot 07 long vertical ascent mid, proving progress while preserving the very tall ovoid scale.

Constraints:
Original scene only. No exact movie-frame copy, no logos, no readable human text, no actor identity, no orange or red suits, no orange or red lift/platform, no orange/red palette transfer, no black tactical suits, no suit color changes, no walking during lift ascent, no horizontal corridor before gravity reorientation, no close contact surface, no frame-filling membrane yet, no portal, no tractor beam, no levitation, no glossy panels, no glossy CG, no game render, no clean CG, no watermark.
```

### Shot 08, Long Vertical Ascent Late Approach

```text
Background:
The dark industrial lift is higher inside the very tall matte black ovoid, approaching but not arriving. The curved side walls begin to bend the composition toward the ceiling/front contact surface, which is larger than in Shot 07 but still not full wall. Black striated surfaces and blue-black vertical depth remain dominant enough to preserve scale.

Subject:
The same four anonymous researchers in pale grey protective suits ride the dark industrial lift/platform with black rails and compact black equipment cases. They are standing or bracing during ascent, not walking, not disembarking, and not floating.

Details:
This is the late approach inside the lift scene, not the gravity settle yet. The destination begins to feel architectural, but it must not become a small screen with a thick black border or a full-wall membrane until later. Practical 35mm analog film still, low contrast, matte black interior, desaturated green-grey/blue-grey grade, crushed readable shadows, restrained distant glow, atmospheric dust and haze, mild grain, and practical set texture.

Use case:
Shot 08 lift scene, long vertical ascent late approach, preparing the distant wide-wall ascent in Shot 09.

Constraints:
Original scene only. No exact movie-frame copy, no logos, no readable text, no actor identity, no orange or red suits, no orange or red lift/platform, no orange/red palette transfer, no walking, no disembarking, no horizontal corridor jump, no one-point hallway, no small glowing rectangle, no tiny screen surrounded by wide black ceiling, no full-wall screen yet, no floating bodies, no zero-gravity drift, no portal beam, no tractor beam, no teleport effect, no black tactical suits, no suit color changes, no glossy CG, no game render, no clean CG, no watermark.
```

### Shot 09, Distant Wide-Wall Ascent

```text
Background:
A distant wide-wall ascent frame inside the matte black ovoid. The dark industrial lift is still rising vertically from farther away than Shot 10, and the eventual luminous fog/contact wall is visible ahead as a wide left-to-right front plane like Shot 11, but still far away. The scene must not read as a floor, corridor, walkway, or walking approach.

Subject:
The same four anonymous researchers in pale grey protective suits remain on the dark industrial scissor lift/platform with black rails and compact black equipment cases. They are still riding and bracing during vertical ascent, not walking, not stepping off, and not floating. Their small scale should contrast with the distant wide-wall destination.

Details:
Practical 35mm analog film still, low contrast, matte black interior, desaturated green-grey/blue-grey grade, soft halation around the distant luminous wall, crushed but readable black edges, atmospheric dust and haze, mild film grain, and believable lift-camera scale. The wall grows through physical ascent only; it does not move toward the camera.

Use case:
Shot 09 distant wide-wall ascent, farther than Shot 10 and still vertically rising. Filename candidate `distant-wide-wall-ascent-v2.png`.

Constraints:
Original scene only. Do not copy a movie frame exactly. No recognizable actors, no logos, no readable text, no orange or red suits, no orange or red lift/platform, no orange/red palette transfer, no walking during ascent, no stepping off, no floor, no corridor, no walkway, no horizontal corridor before gravity, no floating bodies, no zero-gravity drifting, no fog wall moving toward camera, no small glowing rectangle, no small ceiling screen surrounded by wide black margins, no screen inserted as a rectangle into a black wall, no circular ribbed tunnel, no xenomorph biomechanics, no wet cave corridor, no portal, no tractor beam, no glossy sci-fi panels, no glossy CG, no game render, no clean CG, no watermark, no UI overlay.
```

### Shot 10, Prewalk Landing Wide Wall

```text
Background:
The lift scene reaches the prewalk landing inside the matte black ovoid. The camera is pulled back from the wall, behind and slightly above the arriving lift, so the lift remains in middle distance and visibly farther from the luminous contact wall than the walking team will be in Shot 11. The camera and gravity frame perform or finish a physical 90-degree reorientation just before or just after the lift arrives, and the front wall is a broad luminous cold white fog/contact screen filling the left and right sides of the frame. The black interior remains as curved edge and floor context; the screen must feel wall-to-wall, not like a small rectangle placed inside a black wall.

Subject:
The same four anonymous researchers in pale grey protective suits are still on the dark industrial scissor lift/platform with black rails and compact black equipment cases. They remain grounded and cautious through lift arrival and gravity settle, not stepping off yet and not walking away into a corridor. Their scale is smaller than Shot 11 and the floor distance between lift and wall remains readable.

Details:
This is the immediate predecessor to Shot 11, but it must remain farther from the wall than Shot 11. The handoff is physical and cinematic: 90-degree camera roll, lift arrival, gravity settle, matte black curved architecture resolving into a wide luminous fog/contact wall, soft blue-grey halation, low contrast, crushed readable edges, atmospheric dust, mild 35mm grain, and practical set texture.

Use case:
Shot 10 prewalk landing wide wall, with workers still on the lift before disembarking and still farther from the wall than Shot 11. Filename candidate `prewalk-landing-wide-wall-v3.png`.

Constraints:
Original scene only. No exact movie-frame copy, no logos, no readable text, no actor identity, no orange or red suits, no orange or red lift/platform, no orange/red palette transfer, no black tactical suits, no suit color changes, no close wall-contact framing, no larger-than-Shot-11 workers, no ordinary horizontal corridor, no walking away, no stepping off yet, no small glowing rectangle, no small rectangular screen inserted into a black wall, no thick black border around the contact screen, no floating bodies, no zero-gravity drift, no portal beam, no tractor beam, no teleport effect, no circular ribbed tunnel, no xenomorph biomechanics, no wet cave corridor, no glossy CG, no game render, no clean CG, no watermark, no UI overlay.
```

### Shot 11, Walking To Wide Wall

```text
Background:
A stabilized chamber orientation after the lift landing, with the matte black interior now reading as a walkable space only after disembarking. Ahead is a luminous cold white fog/contact wall that fills the frame from left to right, broad and architectural rather than a small inserted screen.

Subject:
Only now the same pale grey-suited researchers have stepped off the dark industrial lift/platform and begin walking toward the wide fog/contact wall. They remain grounded, cautious, and small against the architecture. Dark boots, dark gloves, muted backpack breathing units, black equipment cases, and the dark lift/rails may remain behind as continuity.

Details:
Practical 35mm analog film still, low contrast, matte black interior, desaturated blue-grey fog, soft halation around the wide wall, crushed edges, atmospheric dust and haze, mild film grain, and believable forward walking path after disembark. The wall stays fixed; it fills both sides of the frame through composition and approach, not by moving toward the camera.

Use case:
Shot 11 walking to wide wall, the first walking beat after the lift/prewalk landing. Filename candidate `walking-to-wide-wall-v4.png`.

Constraints:
Original scene only. Do not copy a movie frame exactly. No recognizable actors, no logos, no readable text, no orange or red suits, no orange or red lift/platform, no orange/red palette transfer, no walking before Shot 11, no walking during ascent, no horizontal corridor before gravity, no small glowing rectangle, no small rectangular screen inserted into a black wall, no narrow screen, no floating bodies, no zero-gravity drifting after handoff, no fog wall moving toward camera, no circular ribbed tunnel, no xenomorph biomechanics, no wet cave corridor, no portal, no tractor beam, no glossy sci-fi panels, no glossy CG, no game render, no clean CG, no watermark, no UI overlay.
```

### Full Fog Match Cut

```text
Background:
A full-frame cold white fog membrane, softly overexposed, with faint blue-grey gradients and barely visible black-green edges dissolving into mist. No chamber geometry is visible except the faintest dark vignette at the far edges. The fog should feel like the exact visual transition into a web UI fog chamber.

Subject:
A faint incomplete circular ink-like logogram ring is suspended inside the fog at very low opacity, softly diffused, not fully formed.

Details:
Production-style analog 35mm film still, desaturated blue-grey color grade, low contrast, soft halation, diffuse fog texture, quiet static framing, mild grain. Full-bleed 16:9 frame, center-safe, empty enough for UI overlay.

Use case:
Match-cut transition frame for the Heptapod B encoder intro, designed to dissolve from the contact shot into the live `LogogramChamber`.

Constraints:
Original scene only. No exact movie-frame copy, no recognizable actor, no logos, no readable text, no subtitles, no human figure, no small glowing rectangle, no neon, no portal beam, no spaceship panels, no watermark, no UI overlay.
```

### Encoder Idle Plate

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
Original scene only. No exact movie-frame copy, no human figure, no logos, no readable text, no subtitles, no neon, no portal beam, no spaceship panels, no watermark, no UI overlay, no visible input field baked into the image.
```

### Logogram Response Plate

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
Original scene only. No exact movie-frame copy, no recognizable actor, no human figure, no logos, no readable text, no subtitles, no neon, no portal beam, no spaceship panels, no watermark, no UI overlay, no Latin letters or symbols.
```

## 9. Midjourney Setup

Recommended image creation setup:

```text
[project keyframe reference] [s6 geometry reference] [s7 gravity reference] [s8 fog scale reference] + selected Current Cut shot prompt --ar 16:9 --raw --stylize 35
```

For motion:

```text
Starting frame: selected still
Motion: low
Midjourney 01-02 motion prompt: ABSOLUTE ANCHOR LOCK. The black ovoid vessel and the scissor lift are not moving subjects. They are fixed environment anchors for the entire clip. The vessel is stationary building-sized architecture in the sky, locked to the same horizon, forest line, and field position. The lift is separate parked ground equipment below it, locked to the same ground contact point. Neither the vessel nor the lift may animate, translate, rise, descend, drift, slide, rotate, resize, swing, wobble, morph, relight, or change design. The vessel and lift must never move together as one attached unit. After these two anchors remain pinned in place, move only the camera rig: a heavy dolly-in with a subtle crane rise through low fog toward the underside. The visible motion should come from foreground grass sliding past the lens, fog layers passing between camera and subject, nearby equipment drifting toward the frame edges from parallax, and the forest line changing perspective. Apparent size change comes only from the camera physically getting closer, with natural perspective, parallax, depth compression, and fog occlusion. Preserve misty field, distant vehicles, support equipment, forest line, pale grey protective suits, dark industrial lift with black rails, rough matte black vessel texture, low-contrast 35mm film grain, desaturated green-grey and blue-grey color grade. End near the underside entrance viewpoint with a subtle dark slit visible above and the lift still parked below. No cut, no object animation, no whole vessel-lift group moving, no flying saucer motion, no attached lift, no lift hanging from the vessel, no tractor beam, no portal, no ramp, no bridge, no stairs, no glossy CG.

General motion prompt: keep motion present but restrained. For 01-02, do not rely on two-image interpolation if the model makes the vessel or lift move. Image 02 remains the boarded-lift storyboard waypoint, but it should not be forced as a hard end-frame if that causes object motion. Entry scene: Shot 02 shows the matte black ovoid surface beginning to slit open into a rounded rectangle while the team is already boarded on the lift, Shot 03 shows the pure aperture fully open with the same boarded dark industrial scissor lift/platform directly below preparing to rise, Shot 04 confirms the same lower aperture by approach and angle continuity, and Shot 05 moves the camera, lift, workers, black rails, and compact cases much closer until they are almost inside the matte black interior. Shot 04.5 is inactive. Lift scene: Shot 06 starts the long vertical ascent on the existing dark industrial lift/platform with black rails, Shot 07 continues the ascent, Shot 08 reaches the late approach, Shot 09 is a farther vertical ascent view toward a distant wide wall with no floor/corridor/walking, and Shot 10 is the pulled-back prewalk landing facing a left-to-right luminous fog/contact wall while workers are still on the lift and still farther from the wall than Shot 11. Shot 11 begins walking only after disembarking toward the wide wall. No vessel moving toward camera, no vessel descending, no lift attached to vessel, no lift sliding during 01-02, no ramp, bridge, stairs, gangway, walkway, soldiers walking into doorway, horizontal corridor before gravity, portal, tractor beam, or camera shake; keep composition and scale stable.
```

Use higher motion only where the action changes: Shot 02 surface opening, Shot 03 lift-ready aperture entry, Shot 05 entry into darkness close, Shot 06 vertical ascent start, Shot 09 distant wide-wall ascent, Shot 10 prewalk landing, and Shot 11 first walking beat. Keep Shots 07-08 physically restrained. For the final fog match cut, use `low motion` and let the project UI take over with the existing `LogogramChamber` fog creep.

## 9.1 fal.ai Motion Routing

Use one fal.ai pipeline and switch models by profile:

| Profile | Endpoint | Use |
|---|---|---|
| `kling` | `fal-ai/kling-video/v3/pro/image-to-video` | cheap motion tests and sequence blocking |
| `veo-fast` | `fal-ai/veo3.1/fast/first-last-frame-to-video` | fast Veo comparison on only the important clips |
| `veo` | `fal-ai/veo3.1/first-last-frame-to-video` | final hero-shot render candidates |

The runner maps image fields per model. Kling uses `start_image_url` and `end_image_url`. Veo uses `first_frame_url` and `last_frame_url`. Do not pass Kling-only controls such as `cfg_scale` into Veo specs.

Recommended workflow:

1. After final image approval, render the active front sequence with `tmp/fal-runner/veo31-one-take-group-a-spec.json`, `tmp/fal-runner/veo31-one-take-group-b-spec.json`, and `tmp/fal-runner/veo31-one-take-group-c-spec.json`.
2. Review the clips where physical motion matters most: `02-03`, `03-05`, `05-06`, `08-09`, `09-10`, and `10-11`.
3. If a cheaper blocking pass is needed, create a temporary Kling spec from the same active frame list, but do not replace the approved Veo 3.1 routing specs.
4. Send only approved hero candidates to final rendering after the still-image sequence is locked.

## 10. Output Route

- Deprecated pilot image: `public/heptapod-b-encoder/hero-pilot/hero-corridor-pilot-v1.png`
- Legacy Feedback 1 targets:
  - `public/heptapod-b-encoder/hero-pilot/hero-exterior-scale-fb1-v1.png`
  - `public/heptapod-b-encoder/hero-pilot/hero-threshold-opening-fb1-v1.png`
  - `public/heptapod-b-encoder/hero-pilot/hero-rectangular-chamber-fb1-v1.png`
  - `public/heptapod-b-encoder/hero-pilot/hero-fog-contact-fb1-v1.png`
  - `public/heptapod-b-encoder/hero-pilot/hero-fog-fill-match-fb1-v1.png`
  - `public/heptapod-b-encoder/hero-pilot/hero-encoder-idle-plate-fb1-v1.png`
  - `public/heptapod-b-encoder/hero-pilot/hero-logogram-response-plate-fb1-v1.png`
- Active front sequence targets:
  - `public/heptapod-b-encoder/hero-scenes/s01-exterior-scale/start.png`
  - `public/heptapod-b-encoder/hero-scenes/s01-exterior-scale/underside-surface-opening-boarded-v1.png`
  - `public/heptapod-b-encoder/hero-scenes/s01-exterior-scale/pure-aperture-lift-entry-v3.png`
  - `public/heptapod-b-encoder/hero-scenes/s02-threshold-opening/same-entrance-confirmation-v1.png`
  - `public/heptapod-b-encoder/hero-scenes/s02-threshold-opening/entry-into-darkness-close-v2.png`
  - `public/heptapod-b-encoder/hero-scenes/s02-threshold-opening/lift-scene-start-v2.png`
  - `public/heptapod-b-encoder/hero-scenes/s02-threshold-opening/operator-distant-ceiling-reveal-v2.png`
  - `public/heptapod-b-encoder/hero-scenes/s02-threshold-opening/long-vertical-ascent-start-v1.png`
  - `public/heptapod-b-encoder/hero-scenes/s02-threshold-opening/distant-wide-wall-ascent-v2.png`
  - `public/heptapod-b-encoder/hero-scenes/s02-threshold-opening/prewalk-landing-wide-wall-v3.png`
  - `public/heptapod-b-encoder/hero-scenes/s03-rectangular-chamber/walking-to-wide-wall-v4.png`
  - `public/heptapod-b-encoder/hero-scenes/s04-fog-contact/start.png`
  - `public/heptapod-b-encoder/hero-scenes/s05-fog-fill-match/start.png`
  - `public/heptapod-b-encoder/hero-scenes/s06-encoder-idle-plate/ui-capture.png`
  - `public/heptapod-b-encoder/hero-scenes/s07-logogram-response-plate/ui-capture.png`
- Inactive sequence target, do not use unless reinstated:
  - `public/heptapod-b-encoder/hero-scenes/s04-5-threshold-lip-angle-bridge/start.png`
- Legacy generated files can remain in the folders, but do not use them as active front-sequence references unless explicitly reinstated.
- Prompt template document: `docs/heptapod-b-encoder/05-hero-cinematic-prompt-template.md`
- Motion routing specs:
  - `tmp/fal-runner/veo31-one-take-group-a-spec.json`
  - `tmp/fal-runner/veo31-one-take-group-b-spec.json`
  - `tmp/fal-runner/veo31-one-take-group-c-spec.json`
- Next implementation target: intro overlay above `HeptapodEncoderPage`, fading out into the live `LogogramChamber`.
