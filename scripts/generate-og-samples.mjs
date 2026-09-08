/** File-only visual review; no browser, remote writes, or image uploads.
 * node scripts/generate-og-samples.mjs [public-snapshot.json] [output-directory]
 * With no snapshot, use the existing isolated public fixtures.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { ARCHIVE_STORY_GLYPHS } from '../src/test-fixtures/archiveClient.js';
import { composeOgCard, renderLandingCard, titleArtwork } from '../src/lib/og/card.js';
import { selectArchiveOg } from '../src/lib/og/index.js';
import { groupArchiveMeanings } from '../src/utils/heptapod/groupArchiveMeanings.js';
import { archiveDepthPath } from '../src/utils/heptapod/shareArchive.js';

const rows = (process.argv[2] ? JSON.parse(await readFile(process.argv[2], 'utf8')) : ARCHIVE_STORY_GLYPHS).filter((row) => row.is_public);
const output = path.resolve(process.argv[3] || 'tmp/og-review/final');
await mkdir(output, { recursive: true });
const meanings = groupArchiveMeanings(rows);
const largeGroup = [...meanings.groups].sort((a,b) => b.memberIds.length-a.memberIds.length)[0];
const group = selectArchiveOg(rows, archiveDepthPath({ groupId: largeGroup.id }).split('?')[1]);
const person = rows.find((row) => /^[가-힣]{2,4}$/.test(row.canonical_name)) || rows[0];
const models = (items) => items.map((row) => row.model_data);
const archive = selectArchiveOg(rows);
const samples = [
  { name: 'landing', image: await renderLandingCard() },
  { name: 'landing-ink-alternative', image: await renderLandingCard({ treatment: 'ink' }) },
  { name: 'individual', image: await composeOgCard(models([person]), { cardTitle: person.canonical_name, kind: 'glyph' }) },
  { name: 'group', image: await composeOgCard(models(group.rows), { ...group, kind: 'archive' }) },
  { name: 'archive', image: await composeOgCard(models(archive.rows), { ...archive, kind: 'archive' }) },
  { name: 'comparison', image: await composeOgCard(models(rows.slice(0, 2)), { cardTitles: rows.slice(0, 2).map((row) => row.canonical_name), cardTitle: rows.slice(0, 2).map((row) => row.canonical_name).join(' · '), kind: 'compare' }) },
  { name: 'long-name', image: await composeOgCard(models([person]), { cardTitle: 'Alexandria Catherine Montgomery-Wellington', kind: 'glyph' }) },
  { name: 'long-group', image: await composeOgCard(models(group.rows), { cardTitle: '도래 · 동시성 · 개방성 · 흔적', kind: 'archive' }) },
];
for (const { name, image } of samples) {
  await writeFile(path.join(output, `${name}.png`), image);
  await sharp(image).resize(300, 158).png().toFile(path.join(output, `${name}-300.png`));
}
for (const [size, cols] of [[600, 2], [300, 2]]) {
  const gutter = 24; const labelHeight = 28; const h = Math.round(size * 630 / 1200);
  const cellHeight = h + labelHeight + gutter;
  const layers = [];
  for (let i = 0; i < samples.length; i++) {
    const x = gutter + i % cols * (size + gutter);
    const y = gutter + Math.floor(i / cols) * cellHeight;
    const label = await titleArtwork(samples[i].name, { size: 18, minSize: 18, width: size });
    layers.push({ input: label.input, left: x, top: y });
    layers.push({ input: await sharp(samples[i].image).resize(size, h).png().toBuffer(), left: x, top: y + labelHeight });
  }
  await sharp({ create: { width: cols * (size + gutter) + gutter, height: Math.ceil(samples.length / cols) * cellHeight + gutter, channels: 3, background: '#eee' } })
    .composite(layers).png().toFile(path.join(output, `review-${size}.png`));
}
console.log(`Generated ${samples.length} OG cases at 1200px and 300px in ${output}`);
