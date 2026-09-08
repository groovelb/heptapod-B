# Next.js migration verification

## Scope and ownership

The migration stays in this repository and preserves existing visual assets, theme,
encoder geometry, language behavior, archive state, and public URL contracts.
The reference is `groovelb/vibe-design-starter-kit-1.0-next`.

Parallel execution has one writer per area:

| Owner | Scope | Integration contract |
| --- | --- | --- |
| Root | Next App Router, package/config/lockfile, environment and final integration | Existing providers and root layout survive navigation; route metadata is server-rendered |
| Routing worker | Router adapters and existing UI router imports | Existing component behavior and URL state preserved |
| OG worker | `src/lib/og`, `scripts/test-next-og.mjs` | Public stored model data generates deterministic personal/cluster PNGs |
| Regression worker | This document, `scripts/test-next-migration.mjs` | Non-browser baseline evidence and HTTP smoke checks |

Preparation establishes interfaces, routing and OG implementation then proceed
independently, and root joins the results with builds and regression execution.
Shared manifests and lockfiles belong exclusively to root. Failures return to the
owning branch; integration conflicts are resolved by root rather than reverting
another branch's edits.

## Baseline before migration edits

The working tree was clean when these checks ran.

- `node scripts/test-archive-share.mjs`: **15/15 pass**. Includes stored model PNG
  geometry, dimensions, name escaping, private/withdrawn record protection, and
  public-reader filtering.
- `node scripts/test-app-navigation.mjs`: **37 checks pass** covering desktop and
  mobile navigation, active links, remembered destinations, sound controls,
  Drawer focus, scrolling, and Back behavior.
- `node scripts/test-canvas-routes.mjs`: **pre-existing failure** at line 106.
  `[data-encoder-overlay] [data-glyph-cluster-link]` is missing and the assertion
  calls `getAttribute` on null. This failure precedes Next.js changes.
  The baseline `HEAD` version of `HeptapodEncoderPage` already deliberately passes
  `showLink={false}` and the cluster story documents this behavior. The stale
  assertion was corrected to require a nonempty cluster name and no explore link;
  production UI was not changed to satisfy it.
- Existing UI integration scripts use happy-dom with the Vite SSR module loader;
  this is a simulated DOM, not browser automation. Preserve the loader's test
  dependencies until those scripts are intentionally migrated.
- `scripts/test-archive-remote.mjs` creates remote users and glyphs. It is excluded
  from baseline and automatic migration verification.

## Non-browser verification

During integration, all **25 existing package-listed Node test files passed**
after correcting the stale canvas assertion above. This covers `test:locale`,
`test:navigation`, `test:performance-contracts`, `test:thermal-contracts`,
`test:archive-observation`, `test:archetypes`, and `test:routes`. Each constituent
script was run independently so an early failure could not suppress later
checks. This result verifies the existing simulated-DOM and algorithm contracts;
it does not replace the final Next production build and HTTP check.

Run an application server before the HTTP check:

```sh
npm run build
npm run start
```

From another terminal:

```sh
NEXT_TEST_ORIGIN=http://localhost:3000 node scripts/test-next-migration.mjs
node scripts/test-next-og.mjs
```

The HTTP script checks landing/canvas/archive HTML and metadata, real 1200×630 PNG
responses, `/me` and legacy name/create redirects, unknown-route 404, an existing
hero asset, original Google Font family declarations, application CSS and local
font assets. It does not fetch third-party font services or execute page scripts.
It fetches image paths from the local origin even when canonical metadata points
to production. Optional `NEXT_TEST_PUBLIC_GLYPH_ID` and `NEXT_TEST_CLUSTER_QUERY`
enable additional HTTP checks against an explicitly configured fixture server.

Fixture-backed geometry, visibility, and group-selection tests belong in the
separate OG test, so local verification does not need Supabase credentials or
remote writes.

## Acceptance limits

HTTP tests confirm response contracts, not pixel equivalence or live media
playback. Browser automation, screenshots, and Playwright are prohibited until
explicitly requested by the user. Visual equivalence and interactive timing must
not be described as fully verified from builds or simulated DOM tests alone.

## Integrated result — 2026-09-07

Implemented on `codex/next-og-migration` in the existing repository. No production
deployment or remote data mutation was performed.

- Next.js 16.3.4 production build: passed (App Router plus legacy-link proxy).
- Next.js Storybook adapter build: passed; existing bundle-size warnings remain.
- Existing package-listed test files: 25/25 passed.
- New navigation adapter tests: 2/2 passed.
- New OG tests: 4/4 passed; existing Edge share tests: 15/15 passed.
- Production HTTP checks: 16/16 passed on port 3100, including a real public
  individual glyph and a real meaning group from the configured archive.
  Public records were only read; no fixture users or records were created.
- Targeted ESLint for Next integration, metadata and router modules: passed.
- `git diff --check`: passed.
- Server bundle tracing includes the bundled Korean font and Sharp runtime.
- Generated six-glyph PNG inspected as a local file: glyphs and Korean labels
  visible, no clipped forms. This is not a browser screenshot comparison.

`app/` owns server routes and metadata. `src/routes/NextRouterProvider.jsx` bridges
the existing React Router hooks to Next navigation; React Router remains as a
compatibility dependency for the unchanged UI and Storybook. Native same-path
history updates preserve archive animation, audio and scroll lifetimes.
`proxy.js` redirects legacy name/create URLs before a streamed response starts.

The original theme, fonts, visual JSX and rendering algorithms are retained.
Component changes only read music configuration through the public environment
adapter. `LocaleProvider` no longer overwrites server route metadata in Next;
its language selection, storage and document-language behavior remain intact.

OG images are 1200×630. Landing uses the existing hero plate; individual and group
cards use public stored `model_data`, the original particle generator, and a
bounded rasterizer. Group scope follows the existing newest-200 analysis sample;
chronological views query oldest/newest representatives across all public rows.
Image requests recheck public visibility and use `no-store`. Image version keys
include selected model data, scope and interpretation/renderer versions. Social
platforms can retain their own previously fetched previews independently.

Set `SITE_URL` to the deployment domain and configure the public Supabase URL/key.
Legacy `VITE_*` public settings remain accepted via an explicit configuration
allowlist; new settings use `NEXT_PUBLIC_*`. No service-role key belongs in this
allowlist. Vercel now uses its Next.js runtime rather than the old SPA rewrite.

## Production deployment — 2026-09-07

After the user's explicit deployment request, the current working tree was
deployed through Vercel CLI to the existing `heptapod-b` project. This deployment
does not imply that the migration branch has been merged into GitHub `main`.

- Production: https://heptapod-b.vercel.app
- Deployment: `dpl_2bWBHAfHrZ6CAVQdX9i1tF2dWzkX` — `READY`, production target.
- Immutable URL: https://heptapod-a3ffclifz-groovelbs-projects.vercel.app
- Existing project framework switched from Vite to Next.js; existing public
  Supabase settings retained. Production `SITE_URL` matches the public alias.
- Cloud Next.js build passed. Public production HTTP verification: 16/16 passed.
- Additional checks confirmed that real individual and group pages reference
  dynamic `/api/og` PNGs, not the fallback image; both returned 1200×630 PNGs.
- Desktop and mobile hero MP4s returned valid 206 byte-range responses.
- `.vercelignore` excludes local credentials, old Vite output and test/build
  caches while preserving the original public media assets.
- No browser automation or Supabase data mutation was used.
