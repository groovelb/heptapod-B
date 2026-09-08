# Korean and English share metadata

Shared URLs carry `lang=ko` or `lang=en`. The server resolves the OG/Twitter title,
description, locale, alternate locale, canonical URL and language alternate links
from that explicit parameter. Missing, unsupported or duplicate language values use
Korean metadata. Private canvas input is excluded from metadata and canonical URLs.

The agreed short Korean copy is applied, with English counterparts. Names remain
literal in both languages. Authored group labels are localized with the existing
catalog, including text painted into dynamic OG images. Image URLs include the
language query and distinct version hashes; the centered landing artwork is shared.

Share/copy links from publish, individual, comparison and archive flows include the
current UI locale. Opening a localized link also selects that UI language without
saving a new preference or remounting the input view. Explicit language controls
remain usable. Archive parsers ignore the presentation-only language field while
preserving filter validation, public membership and focus.

Validation: 8 OG tests, 2410 locale/catalog checks, 28 locale-state checks,
456 sharing checks, 125 archive state checks; targeted ESLint and production build.
English group PNG inspected directly from a generated file; no browser automation.

Production deployment: `dpl_53xUK3XA6mMcyryVcEcR2ReRKQTF`, READY,
https://heptapod-b.vercel.app. HTTP-only verification passed for 14 live bilingual
pages (landing, canvas, archive, group, glyph, field, comparison in both languages),
including locale, canonical, language alternate links, OG/Twitter copy equality,
and Korean/English group PNG responses.
