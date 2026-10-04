// Every tunable number for the face scan lives here.
export const scanConfig = {
  // BASE_URL keeps these working whether the app is served from the domain root or a sub-path.
  modelPath: `${import.meta.env.BASE_URL}models/face_landmarker.task`,
  wasmPath: `${import.meta.env.BASE_URL}mediapipe/wasm`,

  // Live preview check rate.
  liveFps: 10,
  // Consecutive passing frames before "Take photo" enables (avoids flicker).
  stableFramesRequired: 4,

  // Guide oval, normalized to the preview frame (0–1). The face box center must fall inside it.
  oval: { cx: 0.5, cy: 0.46, rx: 0.3, ry: 0.36 },

  // Face box height / frame height.
  minFaceHeightRatio: 0.35,

  // Mean luminance of face-region pixels, 0–255.
  minBrightness: 70,
  maxBrightness: 225,

  // Variance of the Laplacian on a grayscale face crop. Lower = blurrier.
  // Webcams at arm's length typically land 40–400; raise this to be stricter.
  minSharpness: 25,
  sharpnessCropSize: 128,

  // Head rotation limits, degrees.
  maxYawDegrees: 20,
  maxPitchDegrees: 20,

  // Brightness sampling size (the frame is downscaled to this width first).
  analysisWidth: 160,

  // Processing screen stays up at least this long so it reads as deliberate.
  minProcessingMs: 2200,
} as const
