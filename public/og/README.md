# Open Graph assets

`landing-v6.png` is the accepted 1200×630 social card. `landing.png` mirrors it for old direct image URLs.
The entire original hero plate fits around its ring center at (600,315); mirrored edge pixels fill the remaining space.
There is no source crop, inset photo frame, footer, or small secondary copy. The centered
Cinzel headline is the only text. Regenerate with `renderLandingCard()` from `src/lib/og/card.js`.

Dynamic cards render actual stored particles directly into final-size slots, with no second
image reduction. A personal card has one large glyph and its name. An archive card has up
to three actual representative glyphs and its group title. Headings stay at 52px or above,
using up to two lines for long names. Metadata descriptions stay in HTML, not on the image.

Generate the eight-case visual QA board (full size and 300px) without a browser:

```sh
node scripts/generate-og-samples.mjs
```

See `docs/heptapod-b-encoder/26-og-visual-review.md` for review criteria and results.

`NotoSerifKR-Bold.otf` is Noto Serif KR, distributed under the SIL Open Font License in `OFL.txt`.
Source: https://github.com/notofonts/noto-cjk/blob/main/Serif/SubsetOTF/KR/NotoSerifKR-Bold.otf
License source: https://github.com/notofonts/noto-cjk/blob/main/Serif/LICENSE

Dynamic cards convert this font to vector outlines before rasterizing; they do not depend on installed operating-system fonts.

`Cinzel.ttf` comes from Google Fonts under `Cinzel-OFL.txt`:
https://github.com/google/fonts/tree/main/ofl/cinzel

Version 5 centers all titles on the ring origin and uses actual weight 700 outlines.
Comparison cards place each name in its own ring. Group headings center on the middle ring.
A narrow fog-colored text outline preserves legibility where long titles overlap ink.
`Cinzel-Bold.ttf` is the static wght=700 instance of `Cinzel.ttf` (FontTools varLib.instancer).
Both Bold fonts are explicitly included in the server route file trace.
