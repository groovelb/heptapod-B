# Landing v2 video

The user-approved Topaz 3832×2160, 24fps video is stored in byte chunks below GitHub’s per-file limit. These are storage pieces, not playback segments. The mobile MP4 and matching poster remain in public/heptapod-b-encoder/hero-scrub-v2-topaz/.

`node scripts/prepare-hero-video.mjs` verifies every part and reconstructs the identical desktop MP4 before development/build. No encoding, grading, frame-rate or timeline changes occur. The manifest records the expected size and SHA-256; a valid existing output is reused. Playback still uses one normal MP4 with HTTP Range support.
