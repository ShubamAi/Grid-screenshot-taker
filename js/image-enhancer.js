/**
 * DocuGrid Enhancer - Image & Document Enhancement Engine
 * High-performance HTML5 Canvas ImageData pixel processing algorithms
 */
class ImageEnhancerEngine {
  /**
   * Applies adjustment settings to a source canvas or ImageData and returns a new processed Canvas
   * @param {HTMLCanvasElement|HTMLImageElement} source 
   * @param {Object} options 
   * @returns {HTMLCanvasElement}
   */
  processImage(source, options = {}) {
    const {
      brightness = 0,    // -100 to 100
      contrast = 0,      // -100 to 100
      saturation = 0,    // -100 to 100
      sharpness = 0,     // 0 to 100
      exposure = 0,      // -100 to 100
      gamma = 1.0,       // 0.2 to 3.0
      bwThreshold = 0,   // 0 (off) to 255
      invert = false,
      preset = 'none'
    } = options;

    // Create output canvas matching source dimensions
    const outputCanvas = document.createElement('canvas');
    const width = source.width || source.naturalWidth;
    const height = source.height || source.naturalHeight;
    outputCanvas.width = width;
    outputCanvas.height = height;

    const ctx = outputCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, width, height);

    if (width === 0 || height === 0) return outputCanvas;

    let imageData = ctx.getImageData(0, 0, width, height);
    let data = imageData.data;

    // Resolve Presets if active
    let effectiveBrightness = brightness;
    let effectiveContrast = contrast;
    let effectiveSaturation = saturation;
    let effectiveSharpness = sharpness;
    let effectiveExposure = exposure;
    let effectiveBwThreshold = bwThreshold;
    let effectiveInvert = invert;

    if (preset === 'auto-enhance') {
      effectiveContrast = 25;
      effectiveBrightness = 5;
      effectiveSharpness = 30;
      effectiveExposure = 10;
    } else if (preset === 'scanner-bw') {
      effectiveBwThreshold = 140;
    } else if (preset === 'grayscale') {
      effectiveSaturation = -100;
      effectiveContrast = 15;
    } else if (preset === 'high-contrast') {
      effectiveContrast = 60;
      effectiveBrightness = 10;
      effectiveSharpness = 40;
    } else if (preset === 'sharpen') {
      effectiveSharpness = 75;
    } else if (preset === 'invert') {
      effectiveInvert = true;
    }

    // 1. Sharpness / Convolution Unsharp Mask Filter first if needed
    if (effectiveSharpness > 0) {
      imageData = this.applySharpnessKernel(ctx, imageData, effectiveSharpness);
      data = imageData.data;
    }

    // Precalculate lookup curves for performance optimization
    const brightnessOffset = (effectiveBrightness / 100) * 255;
    const contrastFactor = (259 * (effectiveContrast + 255)) / (255 * (259 - effectiveContrast));
    const exposureFactor = Math.pow(2, effectiveExposure / 50);

    const len = data.length;

    // 2. Pixel-by-pixel color adjustment loop
    for (let i = 0; i < len; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Exposure adjustment
      if (effectiveExposure !== 0) {
        r *= exposureFactor;
        g *= exposureFactor;
        b *= exposureFactor;
      }

      // Brightness & Contrast
      if (effectiveBrightness !== 0 || effectiveContrast !== 0) {
        r = contrastFactor * (r + brightnessOffset - 128) + 128;
        g = contrastFactor * (g + brightnessOffset - 128) + 128;
        b = contrastFactor * (b + brightnessOffset - 128) + 128;
      }

      // Gamma correction
      if (gamma !== 1.0 && gamma > 0) {
        r = 255 * Math.pow(Math.max(0, r) / 255, 1 / gamma);
        g = 255 * Math.pow(Math.max(0, g) / 255, 1 / gamma);
        b = 255 * Math.pow(Math.max(0, b) / 255, 1 / gamma);
      }

      // Saturation
      if (effectiveSaturation !== 0) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const satRatio = 1 + effectiveSaturation / 100;
        r = lum + (r - lum) * satRatio;
        g = lum + (g - lum) * satRatio;
        b = lum + (b - lum) * satRatio;
      }

      // B&W Document Thresholding (Scanner Binarization Filter)
      if (effectiveBwThreshold > 0) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const bw = lum >= effectiveBwThreshold ? 255 : 0;
        r = bw;
        g = bw;
        b = bw;
      }

      // Color Inversion
      if (effectiveInvert) {
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
      }

      // Clamp RGB values [0, 255]
      data[i]     = r < 0 ? 0 : r > 255 ? 255 : r;
      data[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
      data[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    }

    ctx.putImageData(imageData, 0, 0);
    return outputCanvas;
  }

  /**
   * Applies 3x3 Spatial Convolution Unsharp Mask for image sharpening
   */
  applySharpnessKernel(ctx, imageData, strengthAmount) {
    const width = imageData.width;
    const height = imageData.height;
    const src = imageData.data;

    // Create a copy for reading original neighbor pixels
    const output = ctx.createImageData(width, height);
    const dst = output.data;

    const amount = strengthAmount / 100; // 0 to 1.0
    // Kernel values
    const centerWeight = 1 + 4 * amount;
    const edgeWeight = -amount;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;

        // Neighbor pixel indices
        const top    = ((y - 1) * width + x) * 4;
        const bottom = ((y + 1) * width + x) * 4;
        const left   = (y * width + (x - 1)) * 4;
        const right  = (y * width + (x + 1)) * 4;

        for (let c = 0; c < 3; c++) {
          const val =
            src[i + c] * centerWeight +
            (src[top + c] + src[bottom + c] + src[left + c] + src[right + c]) * edgeWeight;
          dst[i + c] = val < 0 ? 0 : val > 255 ? 255 : val;
        }
        dst[i + 3] = src[i + 3]; // Preserve alpha channel
      }
    }

    return output;
  }
}

// Expose singleton instance
window.imageEnhancer = new ImageEnhancerEngine();
