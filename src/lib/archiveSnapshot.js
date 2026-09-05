/** Ephemeral public rows already loaded by the frontend. No localStorage or fixtures. */
const snapshots = new WeakMap();
export const ARCHIVE_SNAPSHOT_TTL_MS = 60_000;

export function rememberArchiveSnapshot(client, rows, { limit = 200, now = Date.now() } = {}) {
  const publicRows = [...new Map(rows.filter((row) => row?.id && row.is_public === true).map((row) => [row.id, row])).values()];
  snapshots.set(client, { rows: publicRows, limit, complete: rows.length < limit, fetchedAt: now });
}

export function getArchiveSnapshot(client, { limit = 200, now = Date.now() } = {}) {
  const snapshot = snapshots.get(client);
  if (!snapshot || now - snapshot.fetchedAt >= ARCHIVE_SNAPSHOT_TTL_MS
    || (!snapshot.complete && snapshot.limit < limit)) return null;
  return { ...snapshot, rows: snapshot.rows.slice(0, limit) };
}

/** A fresh public detail response supersedes that row, without extending TTL. */
export function reconcileArchiveSnapshot(client, id, glyph) {
  const snapshot = snapshots.get(client);
  if (!snapshot) return;
  snapshots.set(client, { ...snapshot, rows: snapshot.rows.flatMap((row) => row.id !== id ? [row] : glyph?.is_public === true ? [glyph] : []) });
}

export function invalidateArchiveSnapshot(client) {
  snapshots.delete(client);
}
