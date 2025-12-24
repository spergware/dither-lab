export enum DitherAlgorithm {
  Atkinson = "Atkinson",
  FloydSteinberg = "Floyd-Steinberg",
  Stucki = "Stucki",
  Burkes = "Burkes",
  Sierra = "Sierra",
  Bayer4x4 = "Bayer 4x4 (Ordered)",
  Grayscale = "Grayscale Only"
}

export interface ImageSettings {
  resolutionScale: number; // 0.1 to 1.0
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  algorithm: DitherAlgorithm;
}

export interface ProcessedStats {
  width: number;
  height: number;
  processTimeMs: number;
}