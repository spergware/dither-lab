import { DitherAlgorithm } from '../types';

// Helper to clamp values
const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

// Bayer Matrix for Ordered Dithering
const bayerMatrix4x4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

export const processImage = (
  sourceImageData: ImageData,
  algorithm: DitherAlgorithm,
  brightness: number,
  contrast: number
): ImageData => {
  const width = sourceImageData.width;
  const height = sourceImageData.height;
  const data = new Uint8ClampedArray(sourceImageData.data);
  
  // 1. Apply Brightness and Contrast
  // Contrast factor: (259 * (contrast + 255)) / (255 * (259 - contrast))
  // However, simpler linear mapping often feels better for UI sliders.
  // Using standard formula:
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Apply Brightness
    r += brightness;
    g += brightness;
    b += brightness;

    // Apply Contrast
    r = clamp(contrastFactor * (r - 128) + 128, 0, 255);
    g = clamp(contrastFactor * (g - 128) + 128, 0, 255);
    b = clamp(contrastFactor * (b - 128) + 128, 0, 255);

    // Grayscale conversion (Luma)
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
    // Alpha remains same
  }

  if (algorithm === DitherAlgorithm.Grayscale) {
    return new ImageData(data, width, height);
  }

  // 2. Dithering
  // We need a float array to accumulate errors accurately before clamping to uint8
  const errorBuffer = new Float32Array(width * height);
  for(let i=0; i < width * height; i++) {
    errorBuffer[i] = data[i * 4]; // Copy grayscale value
  }

  const getPixel = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0;
    return errorBuffer[y * width + x];
  };

  const addError = (x: number, y: number, err: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    errorBuffer[y * width + x] += err;
  };

  // Ordered Dithering is different, it doesn't propagate error
  if (algorithm === DitherAlgorithm.Bayer4x4) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const oldPixel = errorBuffer[y * width + x];
        const threshold = (bayerMatrix4x4[y % 4][x % 4] / 16) * 255;
        const newPixel = oldPixel > threshold ? 255 : 0;
        
        const idx = (y * width + x) * 4;
        data[idx] = newPixel;
        data[idx+1] = newPixel;
        data[idx+2] = newPixel;
      }
    }
    return new ImageData(data, width, height);
  }

  // Error Diffusion Algorithms
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const oldPixel = errorBuffer[y * width + x];
      const newPixel = oldPixel < 128 ? 0 : 255;
      const quantError = oldPixel - newPixel;

      // Update final image data
      const idx = (y * width + x) * 4;
      data[idx] = newPixel;
      data[idx+1] = newPixel;
      data[idx+2] = newPixel;

      // Distribute Error
      if (algorithm === DitherAlgorithm.FloydSteinberg) {
        addError(x + 1, y, quantError * 7 / 16);
        addError(x - 1, y + 1, quantError * 3 / 16);
        addError(x, y + 1, quantError * 5 / 16);
        addError(x + 1, y + 1, quantError * 1 / 16);
      } else if (algorithm === DitherAlgorithm.Atkinson) {
        addError(x + 1, y, quantError * 1 / 8);
        addError(x + 2, y, quantError * 1 / 8);
        addError(x - 1, y + 1, quantError * 1 / 8);
        addError(x, y + 1, quantError * 1 / 8);
        addError(x + 1, y + 1, quantError * 1 / 8);
        addError(x, y + 2, quantError * 1 / 8);
      } else if (algorithm === DitherAlgorithm.Stucki) {
        addError(x + 1, y, quantError * 8 / 42);
        addError(x + 2, y, quantError * 4 / 42);
        addError(x - 2, y + 1, quantError * 2 / 42);
        addError(x - 1, y + 1, quantError * 4 / 42);
        addError(x, y + 1, quantError * 8 / 42);
        addError(x + 1, y + 1, quantError * 4 / 42);
        addError(x + 2, y + 1, quantError * 2 / 42);
        addError(x - 2, y + 2, quantError * 1 / 42);
        addError(x - 1, y + 2, quantError * 2 / 42);
        addError(x, y + 2, quantError * 4 / 42);
        addError(x + 1, y + 2, quantError * 2 / 42);
        addError(x + 2, y + 2, quantError * 1 / 42);
      } else if (algorithm === DitherAlgorithm.Burkes) {
          addError(x + 1, y, quantError * 8 / 32);
          addError(x + 2, y, quantError * 4 / 32);
          addError(x - 2, y + 1, quantError * 2 / 32);
          addError(x - 1, y + 1, quantError * 4 / 32);
          addError(x, y + 1, quantError * 8 / 32);
          addError(x + 1, y + 1, quantError * 4 / 32);
          addError(x + 2, y + 1, quantError * 2 / 32);
      } else if (algorithm === DitherAlgorithm.Sierra) {
          addError(x + 1, y, quantError * 5 / 32);
          addError(x + 2, y, quantError * 3 / 32);
          addError(x - 2, y + 1, quantError * 2 / 32);
          addError(x - 1, y + 1, quantError * 4 / 32);
          addError(x, y + 1, quantError * 5 / 32);
          addError(x + 1, y + 1, quantError * 4 / 32);
          addError(x + 2, y + 1, quantError * 2 / 32);
          addError(x - 1, y + 2, quantError * 2 / 32);
          addError(x, y + 2, quantError * 3 / 32);
          addError(x + 1, y + 2, quantError * 2 / 32);
      }
    }
  }

  return new ImageData(data, width, height);
};
