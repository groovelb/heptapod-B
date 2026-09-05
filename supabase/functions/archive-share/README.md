# Public archive sharing

This endpoint is implemented locally and is not deployed by this change.

Rich Open Graph sharing requires a configured Supabase custom domain or an HTML-capable hosting proxy. Supabase's standard `*.supabase.co` gateway rewrites `text/html` GET responses to `text/plain`; deploying this function at its default URL alone does not provide an HTML page that preview crawlers can consume. The [routing guide](https://supabase.com/docs/guides/functions/http-methods) documents this rewrite, and the [platform limits source](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/functions/limits.mdx) identifies custom domains as the supported exception.

Behind that HTML-capable public address, `GET /functions/v1/archive-share?left=<public-uuid>&right=<public-uuid>` serves the same initial HTML to visitors and preview crawlers. `right` is optional. Adding `format=png` generates a 1200×630 image from the stored models' actual particle geometry, without a browser, native image library or font dependency. PNG support alone does not establish that the public HTML route works.

Both HTML and PNG requests re-read the public state of every requested glyph. Either hidden or missing endpoint returns a generic 404 with no names, image or Open Graph metadata. Responses use `no-store`; previews already cached by a third-party social service cannot be recalled by this endpoint.

Required runtime configuration:

- `SUPABASE_URL` and `SUPABASE_ANON_KEY`: standard platform environment values; the reader uses public RLS, never the service-role key.
- `ARCHIVE_SITE_URL`: trusted app base URL used by the explicit link to `/glyph/:id` or `/compare/:left/:right`.
- `ARCHIVE_SHARE_URL`: required, explicit public URL on the custom Supabase domain or HTML-capable hosting proxy. There is no production fallback to `SUPABASE_URL/functions/v1/archive-share`; standard `*.supabase.co` rich-share URLs are rejected. Set an explicit localhost URL for local testing too.
- `VITE_ARCHIVE_SHARE_URL`: configure the client build with that same verified HTML-capable public address when enabling rich sharing. Leave it unset while this route is unavailable; direct app links remain available without per-glyph rich previews.

Configured URLs must use HTTPS. HTTP is accepted only for localhost, 127.0.0.1 and [::1]. Credentials, query strings and fragments are rejected. Request Host headers are never used to construct destinations.

The function must have `verify_jwt = false` in `supabase/config.toml`, because a social preview request has no user JWT. Public access is enforced again through `is_public = true` in the database read and in the handler. Root owns that configuration.

Local verification:

```sh
node --test scripts/test-archive-share.mjs
deno check supabase/functions/archive-share/index.ts
```

When deployment is authorized, apply the archive migrations and runtime configuration first, then deploy this function with public gateway access and connect the custom domain or hosting proxy. A hosting proxy must forward the fixed archive route's IDs and format, serve the returned HTML with `Content-Type: text/html`, and preserve the status and `no-store` behavior for missing, withdrawn and failed responses. Merely redirecting to the default Supabase domain does not solve the HTML restriction.

Enable the client's `VITE_ARCHIVE_SHARE_URL` only after the final public address returns initial HTML with `Content-Type: text/html` and the expected OG tags, and after verifying a current public ID and a withdrawn ID against both HTML and PNG responses. Local handler tests do not validate the hosted gateway's content-type behavior. No deployment, custom-domain provisioning, proxy deployment, secret update or remote write is performed by the tests.
