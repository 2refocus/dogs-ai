// lib/pipelineConfig.ts
// Configuration for different pipeline modes and models

export type PipelineMode = "simple" | "multimodel" | "hybrid";
export type ModelType = "nano-banana" | "sdxl" | "ip-adapter-sdxl" | "real-esrgan";

// Pipeline configurations
export const PIPELINE_CONFIGS = {
  simple: {
    name: "Simple Pipeline",
    description: "Single model (Nano-Banana) - Fast, good quality",
    models: ["nano-banana"],
    estimatedTime: "30-60s",
    maxResolution: "1024x1024",
    features: ["Style transfer", "Basic aspect ratio"],
  },
  multimodel: {
    name: "Multi-Model Pipeline", 
    description: "SDXL + IP-Adapter + Real-ESRGAN - Best quality, precise control",
    models: ["ip-adapter-sdxl", "real-esrgan"],
    estimatedTime: "2-4 minutes",
    maxResolution: "4096x4096",
    features: ["Style transfer", "Precise aspect ratio", "High-res upscaling", "Better likeness preservation"],
  },
  hybrid: {
    name: "Hybrid Pipeline",
    description: "Nano-Banana + Real-ESRGAN - Balanced speed and quality",
    models: ["nano-banana", "real-esrgan"],
    estimatedTime: "1-2 minutes", 
    maxResolution: "2048x2048",
    features: ["Style transfer", "Basic aspect ratio", "2x upscaling"],
  },
} as const;

// Model-specific settings
export const MODEL_SETTINGS = {
  "nano-banana": {
    model: "google/nano-banana",
    supportsAspectRatio: true,
    supportsUpscaling: false,
    maxInputSize: "1024x1024",
    outputSize: "1024x1024",
  },
  "sdxl": {
    model: "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
    supportsAspectRatio: true,
    supportsUpscaling: false,
    maxInputSize: "1024x1024",
    outputSize: "1024x1024",
  },
  "ip-adapter-sdxl": {
    model: "lucataco/ip-adapter-sdxl:4a3b5b1b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b", // Update with actual model
    supportsAspectRatio: true,
    supportsUpscaling: false,
    maxInputSize: "1024x1024", 
    outputSize: "1024x1024",
  },
  "real-esrgan": {
    model: "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
    supportsAspectRatio: false,
    supportsUpscaling: true,
    maxInputSize: "2048x2048",
    outputSize: "4096x4096",
    scales: [2, 4],
  },
} as const;

// Get pipeline configuration
export function getPipelineConfig(mode: PipelineMode) {
  return PIPELINE_CONFIGS[mode];
}

// Get model configuration
export function getModelConfig(model: ModelType) {
  return MODEL_SETTINGS[model];
}

// Check if pipeline supports feature
export function supportsFeature(mode: PipelineMode, feature: string): boolean {
  const config = getPipelineConfig(mode);
  return config.features.includes(feature as any);
}

// Get recommended pipeline for use case
export function getRecommendedPipeline(opts: {
  prioritizeSpeed?: boolean;
  prioritizeQuality?: boolean;
  needHighRes?: boolean;
  needPreciseAspect?: boolean;
}): PipelineMode {
  const { prioritizeSpeed, prioritizeQuality, needHighRes, needPreciseAspect } = opts;
  
  if (prioritizeSpeed && !needHighRes) {
    return "simple";
  }
  
  if (prioritizeQuality || needHighRes || needPreciseAspect) {
    return "multimodel";
  }
  
  return "hybrid";
}

// Pipeline selection helper for UI
export function getPipelineOptions() {
  return Object.entries(PIPELINE_CONFIGS).map(([key, config]) => ({
    value: key,
    label: config.name,
    description: config.description,
    estimatedTime: config.estimatedTime,
    maxResolution: config.maxResolution,
    features: config.features,
  }));
}
