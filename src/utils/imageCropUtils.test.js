import { calculateViewportDimensions, computeBaseFit, exportCroppedCanvas } from './imageCropUtils';

describe('Image Crop Utils Tests', () => {
  test('calculateViewportDimensions correctly calculates horizontal 16:9 viewport', () => {
    const { viewportWidth, viewportHeight } = calculateViewportDimensions(16 / 9, 480, 360);
    expect(viewportWidth).toBe(480);
    expect(viewportHeight).toBe(270);
  });

  test('calculateViewportDimensions correctly calculates vertical 3:4 viewport', () => {
    const { viewportWidth, viewportHeight } = calculateViewportDimensions(3 / 4, 480, 360);
    expect(viewportWidth).toBe(270);
    expect(viewportHeight).toBe(360);
  });

  test('computeBaseFit correctly centers wider image inside viewport', () => {
    const fit = computeBaseFit(800, 600, 480, 270);
    expect(fit.scale).toBeCloseTo(0.45, 2);
    expect(fit.width).toBeCloseTo(360, 1);
    expect(fit.height).toBeCloseTo(270, 1);
    expect(fit.initX).toBeCloseTo(60, 1);
    expect(fit.initY).toBe(0);
  });

  test('exportCroppedCanvas returns null when img or baseFit is missing', () => {
    const result = exportCroppedCanvas({ img: null, baseFit: { width: 0, height: 0 } });
    expect(result).toBeNull();
  });
});
