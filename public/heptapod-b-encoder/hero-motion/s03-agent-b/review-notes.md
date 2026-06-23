# S03 Motion Review Notes

## Rejected Clip

`s03-chamber-start-to-mid-v001.mp4`

## Issue

The motion is physically wrong for the storyboard.

- The intended action is: the researchers and lift platform move away from the camera toward the fog membrane.
- The generated action reads as: the chamber and researchers move toward the camera/viewer.
- The clip also contains an audio stream, but this sequence should be silent or use external project audio only.

## Corrected Direction, Superseded

This first correction was still too conservative. It treated the camera as almost locked off, but the intended storyboard is not a static platform move.

## Corrected Direction, Current

- Fog membrane: fixed in world space at the far end of the chamber.
- Camera: dollies forward toward the fixed fog membrane.
- Platform: moves forward along the right wall toward the fog membrane.
- Researchers and fog membrane: visible distance shrinks over time.
- Forbidden read: the fog membrane or wall sliding toward the camera while the researchers stay at the same distance.
- Chamber: rectangular geometry stays stable.
- Audio: disabled at generation with `generate_audio: false`, then stripped locally with `ffmpeg -an`.

## Regeneration Blocker

The v002 fal request failed before submission because the fal account balance is exhausted.

```text
ApiError: Forbidden
detail: User is locked. Reason: Exhausted balance. Top up your balance at fal.ai/dashboard/billing
status: 403
```

## Rerun Command

After topping up the fal account or replacing the key:

```bash
set -a
source .env
set +a
export FAL_KEY="$VITE_FA_AI"
node tmp/fal-runner/submit.mjs tmp/fal-s03-start-to-mid-v003-spec.json
```

Expected raw output:

```text
public/heptapod-b-encoder/hero-motion/s03-agent-b/s03-chamber-start-to-mid-v003.raw.mp4
```

After it downloads:

```bash
ffmpeg -y -i public/heptapod-b-encoder/hero-motion/s03-agent-b/s03-chamber-start-to-mid-v003.raw.mp4 \
  -c:v copy -an \
  public/heptapod-b-encoder/hero-motion/s03-agent-b/s03-chamber-start-to-mid-v003-silent.mp4
```
