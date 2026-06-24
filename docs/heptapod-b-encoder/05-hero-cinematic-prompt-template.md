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

- Project baseline: pale grey protective suits, dark industrial lift, black rails, compact black equipment cases, desaturated green-grey/blue-grey grade, and matte black UFO interior.
- Characters: keep the existing project team in pale grey protective suits, soft fabric wrinkles, dark boots and gloves, muted backpack breathing units, and compact black equipment cases.
- Lift: keep the existing dark industrial scissor lift / lift platform with black guard rails and equipment cases. Do not recolor it into a red Skyjack-style platform.
- Palette: keep the approved desaturated green-grey exterior, blue-grey fog, matte black shell, matte black UFO interior, dark blue-black shadows, low contrast, and mild 35mm grain.
- Object continuity: the same four-person team, same lift, same equipment cases, same matte-black ovoid surface, same lower rounded rectangular aperture.
- Movie-reference usage: use the screenshots only for underside aperture entry, top-down lift ascent, camera tilt, 90-degree gravity roll, former wall becoming walkable floor, and large fog membrane scale.
- Hard lock: do not transfer orange hazmat suits, red lift color, actor portrait framing, small glowing final rectangles, or the movie's exact costume palette into the project sequence.

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

New hard avoids: circular ribbed tunnel, xenomorph biomechanical texture, wet cave corridor, sharp spaceship corridor, blue laser portal, glossy concept art, cyberpunk, high-contrast blockbuster lighting, orange hazmat palette transfer, red Skyjack palette transfer, black tactical suits, oversized costume close-ups, small glowing rectangle as the final membrane, portal/tractor beam logic, and game render polish.

## 2.2 Locked Shot Structure, Current Cut

The front sequence remains a continuous motion path through the underside entrance, but the active cut structure is now simplified around visible action changes. Do not keep s4-s6-style repetitions of similar aperture and lift views unless the cut changes camera relation, subject scale, gravity state, or action. Use the movie references for physical camera and gravity transition behavior only; costume color, lift color, object palette, and interior material stay locked to the project baseline.

- 03 entrance reveal: exterior view under the matte black ovoid, clearly showing the lower rounded aperture from outside. This confirms that the entrance is on the underside, not a ground-level doorway.
- 04 same-entrance confirmation: approach/angle connection cut that teaches the viewer this is the same lower aperture from Shot 03. The camera moves closer or changes angle while preserving the exterior-to-aperture relationship.
- 04.5 threshold-lip angle bridge: add a middle frame between exterior entrance and inside-threshold coverage. The camera is partially inside the same rounded aperture so the outside-to-inside angle change stays below a risky jump.
- 05 operator/lift close-up: camera pushes in or zooms to the operator/researcher on the dark industrial lift. Black rails and compact black equipment cases are visible. The team is standing or bracing; nobody walks.
- 05.5 operator-to-distant-ceiling bridge: add a middle frame before the long ascent. The lift/worker remains visible in the lower frame while the camera begins to discover the very distant ceiling-direction contact plane.
- 06 long vertical ascent start: after entering a very tall ovoid vessel, the overhead contact plane is still almost a point or tiny pale rectangle far above. It must not appear close immediately after entry.
- 07 long vertical ascent mid: the lift rises through the long dark vertical interior. The contact plane grows only modestly through distance traveled and remains far away; this shot must differ clearly from 06 without collapsing the scale.
- 08 gravity-settle/prewalk landing: after or during the final gravity reorientation, the new floor plane becomes readable and the team is still bracing or just about to step off. This is the immediate predecessor to the walking shot, not another generic ascent frame.
- 09 walking after gravity: only after gravity stabilizes, the same pale grey-suited team steps off and walks toward the large white fog membrane/contact plane. No horizontal corridor or walking action appears before the gravity shift.

Scale correction: the ovoid vessel is extremely tall. The interior ceiling/contact plane cannot be close immediately after entry, cannot fill the frame in Shot 05.5 or Shot 06, and must remain distant through Shot 07. The first upward view after the threshold should read as a long dark vertical shaft with a tiny distant fog target; tension comes from the slow lift ascent through that distance. Nobody walks during any ascent shot. Only near the gravity handoff can the contact plane or chamber destination become large enough to support the walk-in transition.

Additional hard avoids for the current cut: walking directly from the grass into the UFO, a frontal horizontal corridor before gravity reorientation, people walking during lift ascent, people walking before the gravity handoff, a small glowing rectangle as the final membrane, floating bodies after gravity stabilizes, zero-gravity drifting after the handoff, the fog wall moving toward the camera, a portal pulling the camera forward, tractor-beam visuals, sleek sci-fi elevator cabins, loud decorative machinery, orange hazmat palette transfer, red lift color transfer, black tactical suits, suit color changes, 3D game render polish, clean CG symmetry, glossy panel highlights, and unreal plastic material.

## 3. Locked Asset Template

- FORMAT: cinematic hero scene, full-bleed 16:9, web hero safe crop, no internal margin, center-safe focal area, no UI text baked into the image.
- LOOK: Practical film still, Analog Film plus Color Grading, soft 35mm grain, low contrast, desaturated green-grey/blue-grey grade, cool matte black UFO interior, soft exterior daylight, crushed black edges, restrained cold highlights, no neon, no clean CG.
- SUBJECT: original alien-vessel approach sequence, the same four-person research team in pale grey protective suits, matte black ovoid exterior, dark industrial lift platform with black rails, entrance reveal, same-entrance confirmation, threshold-lip angle bridge, operator/lift close-up, operator-to-distant-ceiling bridge, long vertical lift ascent start, long vertical ascent mid, gravity-settle/prewalk landing, walking only after gravity, large white fog membrane.
- SERIES RULE: freeze FORMAT and LOOK. Vary only `SHOT`, `CAMERA`, `ACTION`, and `COMPOSITION LOCK`.

## 4. 7-Axis Frame

| Axis | Setting |
|---|---|
| Rendering | cinematic analog-film still, photoreal but restrained |
| Perspective | exterior underside aperture view, same-entrance approach angle, threshold-lip angle bridge, operator/lift close-up, operator-to-distant-ceiling bridge, long vertical ascent start, long vertical ascent mid, 90-degree gravity-settle landing, walking view only after gravity |
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
A vast matte black UFO interior inside an extremely tall matte-black ovoid vessel, with rough striated dark surfaces, softly rounded aperture geometry, a physical overhead alien-language dialogue screen/contact plane during lift ascent, flat-ish floor and ceiling only after gravity reorientation, cool blue-black shadows, deep shadow around the frame, and a large white fog membrane/contact plane that can fill much of the frame only after the long ascent and gravity handoff, then match cut into a web UI fog chamber.

Subject:
The same four anonymous researchers in pale grey protective suits with soft fabric wrinkles, dark boots and gloves, muted backpack breathing units, and compact black equipment cases. In the entrance phase the camera confirms the lower rounded aperture from outside, confirms it again as the same entrance while approaching, then bridges across the threshold lip from the same aperture. In the lift phase the camera closes in on the operator/researcher on the dark industrial lift with black rails, then bridges from the operator to the very distant ceiling-direction contact plane. The lift ascends vertically through the very tall ovoid interior; the contact plane starts tiny and distant, grows only modestly at mid-ascent, and never appears close immediately after entry. They do not walk during any ascent shot. In the gravity-handoff phase they are still on the lift, bracing as a 90-degree camera roll creates a new gravity frame and the former wall becomes the walkable floor. In the chamber phase they step off and walk only after gravity stabilizes. No person is a recognizable actor. Do not change the suit design, suit color, lift color, or palette between shots.

Details:
Use the supplied references only for cinematic composition, practical film-still realism, 35mm analog film grain, low contrast, desaturated green-grey exterior daylight, cool blue-black interior grading, crushed but readable black edges, restrained highlights, atmospheric dust and haze, matte rough black striated interior surfaces, and the scale relationship between small human figures and monumental quiet architecture. Keep the frame full bleed, widescreen 16:9, center-safe for responsive web hero cropping.

Use case:
A cinematic hero intro still for an interactive Heptapod-style logogram encoder website, designed to motion-animate and match cut into a bright foggy UI chamber.

Constraints:
Do not copy any movie frame exactly. No recognizable actors, no film title, no logos, no readable text, no subtitles, no orange hazmat suits, no red Skyjack-style lift color, no orange/red palette transfer, no black tactical suits, no suit color changes, no frontal horizontal corridor before gravity reorientation, no one-point hallway before gravity reorientation, no walking during lift ascent, no walking before the gravity shift, no close contact plane immediately after entry, no small glowing rectangle as the final membrane, the final/contact membrane must be a large white fog surface filling much of the frame only after the long ascent and gravity transition, no circular tunnel, no xenomorph biomechanical texture, no wet cave corridor, no neon science-fiction look, no portal beam, no tractor beam, no sharp spaceship panels, no glossy CG surfaces, no game render, no clean CG, no watermark, no UI elements baked into the generated image.
```

## 7. Shot Variable Slots

Only replace these slots between shots.

```text
SHOT:
{03 entrance reveal | 04 same-entrance confirmation | 04.5 threshold-lip angle bridge | 05 operator/lift close-up | 05.5 operator-to-distant-ceiling bridge | 06 long vertical ascent start | 07 long vertical ascent mid | 08 gravity-settle/prewalk landing | 09 walking after gravity | full fog match cut}

CAMERA:
{exterior underside view showing the lower rounded aperture | closer approach angle that clearly matches the same lower aperture | camera partially inside the same rounded aperture across the threshold lip | tight camera on the operator/researcher on the lift with black rails foreground | bridge from operator/lift foreground toward a tiny distant ceiling-direction contact plane | upward rider view at ascent start with the contact plane tiny and far above | upward rider view at mid-ascent with the contact plane modestly larger but still far | 90-degree camera roll and landing settle with lift and new floor readable | stabilized walking view only after gravity changes | abstract full-frame fog}

ACTION:
{revealing the underside entrance | confirming the same entrance through approach and angle continuity | bridging across the aperture lip without adding a second doorway | standing or bracing on the lift while the camera closes in, not walking | discovering the very distant ceiling-direction contact plane while the lift/worker remains visible | riding upward on the dark industrial lift at ascent start, not walking | continuing the long vertical lift ascent with modest contact-plane growth, not walking | bracing through gravity settle/prewalk landing without stepping off yet | walking only after gravity stabilizes toward the large white fog membrane/contact plane | fog filling the entire frame}

COMPOSITION LOCK:
{outside view of lower rounded aperture under the matte black ovoid | same aperture kept readable across the cut | aperture lip foreground, exterior field still visible through the same opening | dark lift, black rails, pale grey suit, compact black equipment cases | operator/lift retained low in frame, tiny distant contact plane barely discovered above | lift rails foreground, extremely tall vertical ascent path, tiny contact plane far above | long vertical shaft still dominant, contact plane modestly larger but distant | lift near arrival, 90-degree gravity transition, former wall becoming floor | grounded researchers walking after gravity with large membrane ahead | no figure, only large fog texture}
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

### Shot 03, Entrance Reveal

```text
Background:
A misty exterior underside view below the huge matte-black ovoid vessel, looking up toward the lower rounded aperture. The aperture is visible from outside as a dark rounded rectangular opening in the bottom of the craft, surrounded by matte black surface and soft green-grey daylight haze.

Subject:
The same four anonymous researchers in pale grey protective suits are near the existing dark industrial lift below the entrance. Black rails and compact black equipment cases are visible as continuity marks, but human detail stays small and practical.

Details:
Practical 35mm analog film still, desaturated green-grey exterior, blue-grey haze, low contrast, matte black UFO surface, restrained highlights, mild film grain, and documentary scale. Full-bleed 16:9 frame that clearly teaches the lower entrance location before any interior view.

Use case:
Shot 03 entrance reveal, establishing that the route into the vessel is the underside rounded aperture.

Constraints:
Original scene only. No exact movie-frame copy, no logos, no readable text, no actor identity, no orange hazmat suits, no red lift color transfer, no black tactical suits, no walking into a ground doorway, no portal, no tractor beam, no blue laser, no glossy spaceship panels, no game render, no clean CG, no watermark.
```

### Shot 04, Same-Entrance Confirmation

```text
Background:
A closer approach angle to the exact same lower rounded aperture under the matte-black ovoid vessel. The camera has moved nearer and slightly changed angle, but the aperture shape, exterior underside position, and misty field relationship remain unmistakably continuous with Shot 03.

Subject:
The dark industrial lift with black rails aligns beneath the same aperture. The same pale grey-suited team and compact black equipment cases are readable enough to connect the cut, still standing or bracing on the lift, not walking.

Details:
This cut exists to train continuity, not to add a new entrance. Preserve the same aperture geometry while moving the camera closer. Practical 35mm analog film still, desaturated green-grey/blue-grey grade, matte black UFO surface, low contrast, mild film grain, soft lens falloff, and restrained physical scale.

Use case:
Shot 04 same-entrance confirmation, bridging the exterior reveal toward threshold coverage without a teleporting camera jump.

Constraints:
No second doorway, no orange hazmat suits, no red lift color transfer, no orange/red palette transfer, no black tactical suits, no suit color changes, no horizontal corridor, no walking, no levitation, no portal, no tractor beam, no glossy sci-fi panels, no clean CG, no game render, no readable text, no watermark.
```

### Shot 04.5, Threshold-Lip Angle Bridge

```text
Background:
A partial inside-threshold view from the same lower rounded aperture, with the dark aperture lip and matte black interior edge close to camera. The muted field and underside entrance relationship remain visible through the opening so the viewer understands this is still the same entrance, not a new corridor.

Subject:
The dark industrial lift with black rails and the same pale grey-suited team remain aligned with the aperture. Figures are standing or bracing on the lift with compact black equipment cases. Nobody walks, jumps, floats, or enters a horizontal hallway.

Details:
This frame exists only as an angle bridge from exterior entrance coverage to interior/lift coverage. Keep the ovoid scale extremely tall and avoid revealing the contact plane as nearby. Practical 35mm analog film still, low contrast, desaturated green-grey exterior spill, cool blue-black interior shadow, matte black aperture edges, mild grain, and restrained physical scale.

Use case:
Shot 04.5 threshold-lip angle bridge, preventing a risky exterior-to-interior camera jump while preserving the same aperture.

Constraints:
No second doorway, no orange hazmat suits, no red lift color transfer, no orange/red palette transfer, no black tactical suits, no suit color changes, no horizontal corridor, no walking, no close contact plane, no levitation, no portal, no tractor beam, no glossy sci-fi panels, no clean CG, no game render, no readable text, no watermark.
```

### Shot 05, Operator/Lift Close-Up

```text
Background:
A closer practical camera view on the dark industrial lift at the underside entrance, now framed by matte black interior shadow and the lower rounded aperture geometry. Black guard rails, dark platform edges, and compact equipment cases create the foreground structure.

Subject:
One operator/researcher in a pale grey protective suit is the focus, with the rest of the same team partially visible on the lift. Soft fabric wrinkles, dark gloves, dark boots, muted backpack breathing units, and compact black equipment cases remain consistent. The operator is standing, bracing, or checking the lift, not walking.

Details:
Camera pushes in or zooms to the lift operator for a human-scale beat before the distant-ceiling bridge. Practical film still, 35mm analog, desaturated green-grey/blue-grey grade, matte black UFO interior, crushed but readable shadows, mild film grain, and real lens softness. Full-bleed 16:9 frame with stable lift details.

Use case:
Shot 05 operator/lift close-up, changing from threshold continuity to human and lift mechanics before ascent.

Constraints:
Original scene only. No exact movie-frame copy, no logos, no readable text, no actor identity, no orange hazmat suits, no red lift color transfer, no orange/red palette transfer, no black tactical suits, no suit color changes, no walking, no horizontal corridor, no circular tunnel, no glossy spaceship panels, no neon, no portal, no tractor beam, no sleek sci-fi elevator cabin, no game render, no clean CG, no watermark.
```

### Shot 05.5, Operator-to-Distant-Ceiling Bridge

```text
Background:
Inside the matte black UFO interior, the camera begins to leave the lift operator and discover the ceiling direction of the extremely tall ovoid. Rough matte black striated surfaces frame a long upward space, with only a tiny pale suggestion of the contact plane far above.

Subject:
The operator/researcher and black lift rail remain visible at the lower edge or lower foreground as the camera bridges upward. The same team is still standing or bracing on the lift. The contact plane is not close; it is a distant ceiling-direction target, almost a point or tiny pale rectangle.

Details:
This is a scale bridge, not a new corridor and not an arrival shot. The visual question changes from "who is on the lift" to "how tall is this ovoid interior." Practical 35mm analog film still, low contrast, desaturated blue-grey distant glow, matte black interior, crushed edges, atmospheric dust, mild grain, and practical set texture.

Use case:
Shot 05.5 operator-to-distant-ceiling bridge, establishing that the lift has a long vertical ascent before it can reach the contact plane.

Constraints:
Original scene only. No exact movie-frame copy, no logos, no readable human text, no actor identity, no orange hazmat suits, no red lift color transfer, no orange/red palette transfer, no horizontal corridor, no people walking, no close contact plane, no large nearby screen immediately after entry, no small glowing rectangle as final membrane, no portal beam, no tractor beam, no blue laser, no glossy sci-fi panels, no game render, no clean CG, no watermark.
```

### Shot 06, Long Vertical Ascent Start

```text
Background:
The dark industrial lift begins rising vertically through the extremely tall matte black UFO interior. The overhead alien-language dialogue screen/contact plane is still almost a point or tiny pale rectangle far above, with the rough black striated walls and blue-black shaft scale dominating the frame.

Subject:
The same four anonymous researchers in pale grey protective suits ride the lift with black rails visible. They are standing or bracing with compact black equipment cases, not walking. The lift remains a practical industrial platform, not a beam, pod, or sleek elevator cabin.

Details:
The motion is the start of a long vertical lift ascent through a very tall ovoid. The contact plane must not feel close, reachable, or frame-filling yet. Practical 35mm analog film still, low contrast, matte black interior, desaturated green-grey/blue-grey grade, crushed readable shadows, restrained distant white glow, atmospheric dust and haze, mild grain, and real lens softness.

Use case:
Shot 06 long vertical ascent start, making the ovoid height and distant contact plane unmistakable.

Constraints:
Original scene only. No exact movie-frame copy, no logos, no readable human text, no actor identity, no orange hazmat suits, no red lift color transfer, no orange/red palette transfer, no black tactical suits, no suit color changes, no walking during lift ascent, no horizontal corridor before gravity reorientation, no close contact plane immediately after entry, no frame-filling membrane yet, no portal, no tractor beam, no levitation, no glossy panels, no game render, no clean CG, no watermark.
```

### Shot 07, Long Vertical Ascent Mid

```text
Background:
The dark industrial lift continues rising through the long vertical interior of the matte black ovoid. The overhead alien-language dialogue screen/contact plane is modestly larger than in Shot 06 because of real distance traveled, but it still remains far above and the vertical shaft still dominates.

Subject:
The same four anonymous researchers in pale grey protective suits ride the lift with black rails and compact black equipment cases. They are standing or bracing during ascent, not walking, not disembarking, and not floating. The lift remains the same dark industrial platform.

Details:
This is the middle of the ascent, not arrival. The contact plane grows only through lift travel and must not become a nearby wall, a portal, or a large final fog membrane. Practical 35mm analog film still, low contrast, matte black interior, desaturated green-grey/blue-grey grade, crushed readable shadows, restrained distant glow, atmospheric dust and haze, mild grain, and real lens softness.

Use case:
Shot 07 long vertical ascent mid, proving progress while preserving the very tall ovoid scale.

Constraints:
Original scene only. No exact movie-frame copy, no logos, no readable human text, no actor identity, no orange hazmat suits, no red lift color transfer, no orange/red palette transfer, no black tactical suits, no suit color changes, no walking during lift ascent, no horizontal corridor before gravity reorientation, no close contact plane, no frame-filling membrane yet, no portal, no tractor beam, no levitation, no glossy panels, no game render, no clean CG, no watermark.
```

### Shot 08, Gravity-Settle/Prewalk Landing

```text
Background:
Near the contact-plane arrival zone inside the matte black UFO interior, the camera and gravity frame perform or finish a physical 90-degree reorientation. The lift is settling at the destination, the former wall begins to become the walkable floor, and the long vertical ascent path remains readable behind or below.

Subject:
The same four anonymous researchers in pale grey protective suits are still on the dark lift with black rails and compact black equipment cases. They brace and shift weight through the gravity change or prepare to step off. They have not begun walking yet.

Details:
The handoff is physical and cinematic: 90-degree camera roll, new gravity frame, former wall becoming floor, and a short prewalk landing beat. Practical 35mm analog film still, low contrast, matte black interior, cool blue-black shadows, restrained fog glow, crushed but readable edges, atmospheric dust, mild grain, and practical set texture.

Use case:
Shot 08 gravity-settle/prewalk landing, the immediate predecessor to walking after gravity stabilizes.

Constraints:
Original scene only. No exact movie-frame copy, no logos, no readable text, no actor identity, no orange hazmat suits, no red lift color transfer, no orange/red palette transfer, no disembarking into a walk yet, no walking yet, no horizontal corridor jump, no one-point hallway before the floor is established, no floating bodies after the handoff, no zero-gravity drift, no portal beam, no tractor beam, no teleport effect, no black tactical suits, no suit color changes, no game render, no clean CG, no watermark.
```

### Shot 09, Walking After Gravity

```text
Background:
A stabilized chamber orientation after the gravity shift, with the former wall now reading as a walkable floor inside the matte black UFO interior. Ahead is a large white fog membrane/contact plane, broad and architectural, filling significant frame area rather than appearing as a small glowing rectangle.

Subject:
Only now the same pale grey-suited researchers step off and walk toward the large white fog membrane/contact plane. They remain grounded, cautious, and small against the architecture. Dark boots, dark gloves, muted backpack breathing units, black equipment cases, and the dark lift/rails may remain behind as continuity.

Details:
Practical 35mm analog film still, low contrast, cool blue-black interior, desaturated blue-grey fog, soft halation around the large membrane, crushed edges, atmospheric dust and haze, mild film grain, and believable forward walking path. The membrane stays fixed; it grows only through camera and character approach.

Use case:
Shot 09 walking after gravity, the first walking beat in the sequence and the bridge toward the final fog match cut.

Constraints:
Original scene only. Do not copy a movie frame exactly. No recognizable actors, no logos, no readable text, no orange hazmat suits, no red lift color transfer, no orange/red palette transfer, no walking before gravity stabilizes, no walking during ascent, no horizontal corridor before gravity, no floating bodies, no zero-gravity drifting after handoff, no fog wall moving toward camera, no small glowing rectangle as final membrane, no circular ribbed tunnel, no xenomorph biomechanics, no wet cave corridor, no portal, no tractor beam, no glossy sci-fi panels, no game render, no clean CG, no watermark, no UI overlay.
```

### Full Fog Match Cut

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
Motion prompt: keep motion present but restrained. Shot 03 reveals the underside rounded aperture from outside. Shot 03.5 confirms the same entrance by approach and angle continuity. Shot 04 pushes in to the lift operator without walking. Shot 05 tilts up from the operator to the overhead alien-language contact plane. Shot 06 is a slow vertical ascent toward that fixed screen on the existing dark industrial lift with black rails; riders do not walk. Shot 07 is a physical 90-degree gravity handoff where the former wall becomes the walkable floor. Shot 08 is the first walking beat after gravity stabilizes, moving toward the fixed large white fog membrane/contact plane. No horizontal corridor before gravity, no portal, no tractor beam, no camera shake, keep composition and scale stable.
```

Use higher motion only where the action changes: Shot 03.5 approach, Shot 05 tilt-up, Shot 06 vertical ascent, and Shot 07 gravity handoff. Keep Shot 08 physically restrained. For the final fog match cut, use `low motion` and let the project UI take over with the existing `LogogramChamber` fog creep.

## 9.1 fal.ai Motion Routing

Use one fal.ai pipeline and switch models by profile:

| Profile | Endpoint | Use |
|---|---|---|
| `kling` | `fal-ai/kling-video/v3/pro/image-to-video` | cheap motion tests and sequence blocking |
| `veo-fast` | `fal-ai/veo3.1/fast/first-last-frame-to-video` | fast Veo comparison on only the important clips |
| `veo` | `fal-ai/veo3.1/first-last-frame-to-video` | final hero-shot render candidates |

The runner maps image fields per model. Kling uses `start_image_url` and `end_image_url`. Veo uses `first_frame_url` and `last_frame_url`. Do not pass Kling-only controls such as `cfg_scale` into Veo specs.

Recommended workflow:

1. Render the active front sequence with `tmp/fal-front-sequence-kling-spec.json`.
2. Pick only the clips where physical motion matters most, usually `shot-05-tilt-up`, `shot-06-vertical-ascent`, `shot-07-gravity-shift`, and `shot-08-walking-after-gravity`.
3. Compare those clips with `tmp/fal-front-sequence-veo-fast-spec.json`.
4. Send only approved hero candidates to `tmp/fal-front-sequence-veo-final-spec.json`.

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
- Active one-take front sequence targets:
  - `public/heptapod-b-encoder/hero-scenes/s01-exterior-scale/start.png`
  - `public/heptapod-b-encoder/hero-scenes/s03-entrance-reveal/start.png`
  - `public/heptapod-b-encoder/hero-scenes/s04-same-entrance-confirmation/start.png`
  - `public/heptapod-b-encoder/hero-scenes/s04-5-threshold-lip-angle-bridge/start.png`
  - `public/heptapod-b-encoder/hero-scenes/s05-operator-lift-close-up/start.png`
  - `public/heptapod-b-encoder/hero-scenes/s05-5-operator-to-distant-ceiling-bridge/start.png`
  - `public/heptapod-b-encoder/hero-scenes/s06-long-vertical-ascent-start/start.png`
  - `public/heptapod-b-encoder/hero-scenes/s07-long-vertical-ascent-mid/start.png`
  - `public/heptapod-b-encoder/hero-scenes/s08-gravity-settle-prewalk-landing/start.png`
  - `public/heptapod-b-encoder/hero-scenes/s09-walking-after-gravity/start.png`
  - `public/heptapod-b-encoder/hero-scenes/s10-fog-fill-match/start.png`
  - `public/heptapod-b-encoder/hero-scenes/s11-encoder-idle-plate/start.png`
  - `public/heptapod-b-encoder/hero-scenes/s12-logogram-response-plate/start.png`
- Legacy generated files can remain in the folders, but do not use them as active front-sequence references unless explicitly reinstated.
- Prompt template document: `docs/heptapod-b-encoder/05-hero-cinematic-prompt-template.md`
- Motion routing specs:
  - `tmp/fal-front-sequence-kling-spec.json`
  - `tmp/fal-front-sequence-veo-fast-spec.json`
  - `tmp/fal-front-sequence-veo-final-spec.json`
- Next implementation target: intro overlay above `HeptapodEncoderPage`, fading out into the live `LogogramChamber`.
