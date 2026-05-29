/**
 * Resize an image File to fit within `maxEdge` pixels on the longest side,
 * encoded as a JPEG data URL. Used to keep hero photos under localStorage's
 * 5–10 MB quota — a modern iPhone photo is 5+ MB raw, 7+ MB as base64,
 * which alone can blow the budget.
 */
export async function resizeImageToDataUrl(
  file: File,
  maxEdge = 1600,
  quality = 0.85,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', quality);
}
