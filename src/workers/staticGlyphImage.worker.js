import { renderGlyphImage } from '../lib/glyphImages/rasterize.js';

/** One request at a time: the UI owns a bounded queue and reusable Worker. */
self.addEventListener('message', async ({ data }) => {
  const { id, model, size, ink } = data || {};
  try {
    const { bytes, width, height, mimeType } = await renderGlyphImage(model, { size, ink });
    self.postMessage({ id, bytes, width, height, mimeType }, [bytes.buffer]);
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : 'Glyph image generation failed' });
  }
});
