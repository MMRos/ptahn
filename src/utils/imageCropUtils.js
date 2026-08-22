/**
 * Image Cropping and Viewport Utilities for Ptahn
 * Shared calculation functions for single and batch image crop modals.
 */

/**
 * Calculates optimal viewport dimensions given an aspect ratio and max bounding box.
 * 
 * @param {number} [aspectRatio=1.0] - Aspect ratio (width / height).
 * @param {number} [baseMaxWidth=480] - Maximum width for wide viewports.
 * @param {number} [baseMaxHeight=360] - Maximum height for tall viewports.
 * @returns {{ viewportWidth: number, viewportHeight: number }}
 */
export function calculateViewportDimensions(aspectRatio = 1.0, baseMaxWidth = 480, baseMaxHeight = 360) {
  const safeRatio = typeof aspectRatio === 'number' && aspectRatio > 0 ? aspectRatio : 1.0;
  const viewportWidth = safeRatio >= 1 ? baseMaxWidth : Math.round(baseMaxHeight * safeRatio);
  const viewportHeight = safeRatio >= 1 ? Math.round(baseMaxWidth / safeRatio) : baseMaxHeight;
  return { viewportWidth, viewportHeight };
}

/**
 * Computes the centering fit and scale factor for an image inside the viewport.
 * 
 * @param {number} natW - Natural width of the loaded image.
 * @param {number} natH - Natural height of the loaded image.
 * @param {number} viewportWidth - Viewport width in pixels.
 * @param {number} viewportHeight - Viewport height in pixels.
 * @returns {{ scale: number, width: number, height: number, initX: number, initY: number }}
 */
export function computeBaseFit(natW, natH, viewportWidth, viewportHeight) {
  if (!natW || !natH || !viewportWidth || !viewportHeight) {
    return { scale: 1, width: 0, height: 0, initX: 0, initY: 0 };
  }

  const fitScale = Math.min(viewportWidth / natW, viewportHeight / natH);
  const baseW = natW * fitScale;
  const baseH = natH * fitScale;
  const initX = (viewportWidth - baseW) / 2;
  const initY = (viewportHeight - baseH) / 2;

  return {
    scale: fitScale,
    width: baseW,
    height: baseH,
    initX,
    initY
  };
}

/**
 * Exports a cropped 2D canvas drawing to a high-resolution JPEG Data URL.
 * 
 * @param {Object} params
 * @param {HTMLImageElement} params.img - The loaded image HTML element.
 * @param {{ x: number, y: number }} params.position - Current drag position in viewport coordinates.
 * @param {{ width: number, height: number }} params.baseFit - Base fit dimensions.
 * @param {number} [params.zoom=1] - Zoom multiplier.
 * @param {number} params.viewportWidth - Current viewport width.
 * @param {number} [params.aspectRatio=1] - Aspect ratio.
 * @param {number} [params.targetWidth] - Export resolution width (default: 600 for vertical, 960 for horizontal).
 * @param {number} [params.quality=0.94] - JPEG output quality (0 to 1).
 * @returns {string|null} - Base64 Data URL or null if canvas rendering fails.
 */
export function exportCroppedCanvas({
  img,
  position = { x: 0, y: 0 },
  baseFit = { width: 0, height: 0 },
  zoom = 1,
  viewportWidth = 480,
  aspectRatio = 1,
  targetWidth,
  quality = 0.94
}) {
  if (!img || !baseFit.width || !baseFit.height || typeof document === 'undefined') {
    return null;
  }

  try {
    const canvas = document.createElement('canvas');
    const safeAspect = aspectRatio > 0 ? aspectRatio : 1;
    const targetW = targetWidth || (safeAspect < 1 ? 600 : 960);
    const targetH = Math.round(targetW / safeAspect);

    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, targetW, targetH);

    const scaleFactor = targetW / (viewportWidth || targetW);
    const currentRenderWidth = baseFit.width * (zoom || 1);
    const currentRenderHeight = baseFit.height * (zoom || 1);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      img,
      (position.x || 0) * scaleFactor,
      (position.y || 0) * scaleFactor,
      currentRenderWidth * scaleFactor,
      currentRenderHeight * scaleFactor
    );
    ctx.restore();

    return canvas.toDataURL('image/jpeg', quality);
  } catch (err) {
    console.warn('[ImageCropUtils]: Canvas export failed:', err);
    return null;
  }
}
