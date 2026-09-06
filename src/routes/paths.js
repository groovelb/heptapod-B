/** Static entry points; public glyph UUID routes keep their existing contracts. */
export const APP_PATHS = Object.freeze({ landing: '/', canvas: '/canvas', archive: '/archive' });

/** Existing bookmarks remain usable without mounting or playing the landing. */
export function legacyCanvasLocation({ search = '', hash = '' } = {}) {
  const params = new URLSearchParams(search);
  if (!params.get('name')?.trim() && params.get('create') !== '1') return null;
  params.delete('create');
  const query = params.toString();
  return { pathname: APP_PATHS.canvas, search: query ? `?${query}` : '', hash };
}

/** Read URL state at the route boundary, not from the global browser location. */
export function canvasEntry(search = '') {
  const params = new URLSearchParams(search);
  const initialName = params.get('name')?.trim() || '';
  return {
    initialName,
    initialEncoderVersion: initialName && params.get('v') !== '2' ? 1 : 2,
  };
}
