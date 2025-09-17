// lib/pipelineStrategy.ts
// Smart pipeline selection based on user status and preferences

import { PipelineMode } from "./pipelineConfig";

export type UserTier = "guest" | "logged_in" | "premium";
export type GenerationMode = "fast" | "quality" | "auto";

export interface PipelineStrategy {
  defaultMode: PipelineMode;
  availableModes: PipelineMode[];
  maxResolution: string;
  estimatedTime: string;
  features: string[];
}

// Pipeline strategies by user tier
const PIPELINE_STRATEGIES: Record<UserTier, PipelineStrategy> = {
  guest: {
    defaultMode: "simple",
    availableModes: ["simple"],
    maxResolution: "1024x1024",
    estimatedTime: "30-60s",
    features: ["Style transfer", "Basic aspect ratio"],
  },
  logged_in: {
    defaultMode: "simple", // Fast by default
    availableModes: ["simple", "hybrid", "multimodel", "seedream"],
    maxResolution: "4096x4096",
    estimatedTime: "30s - 4min",
    features: ["Style transfer", "Aspect ratio", "Upscaling", "High-res", "4K generation"],
  },
  premium: {
    defaultMode: "multimodel", // Best quality by default
    availableModes: ["simple", "hybrid", "multimodel", "seedream"],
    maxResolution: "4096x4096",
    estimatedTime: "30s - 4min",
    features: ["Style transfer", "Precise aspect ratio", "4K upscaling", "Best quality", "Advanced editing"],
  },
};

// Get pipeline strategy for user
export function getPipelineStrategy(
  userTier: UserTier,
  generationMode: GenerationMode = "auto"
): PipelineStrategy {
  const strategy = PIPELINE_STRATEGIES[userTier];
  
  if (generationMode === "fast") {
    return {
      ...strategy,
      defaultMode: "simple",
    };
  } else if (generationMode === "quality") {
    return {
      ...strategy,
      defaultMode: userTier === "guest" ? "simple" : "multimodel",
    };
  }
  
  return strategy;
}

// Determine user tier from auth state
export function getUserTier(userId: string | null): UserTier {
  if (!userId) return "guest";
  
  // You could add premium user detection here
  // For now, all logged-in users are treated the same
  return "logged_in";
}

// Get recommended pipeline for user
export function getRecommendedPipeline(
  userTier: UserTier,
  generationMode: GenerationMode = "auto"
): PipelineMode {
  const strategy = getPipelineStrategy(userTier, generationMode);
  return strategy.defaultMode;
}

// Check if user can access pipeline mode
export function canAccessPipeline(
  userTier: UserTier,
  pipelineMode: PipelineMode
): boolean {
  const strategy = PIPELINE_STRATEGIES[userTier];
  return strategy.availableModes.includes(pipelineMode);
}

// Get upgrade message for users who can't access a feature
export function getUpgradeMessage(
  userTier: UserTier,
  requestedMode: PipelineMode
): string | null {
  if (canAccessPipeline(userTier, requestedMode)) {
    return null;
  }
  
  if (userTier === "guest") {
    return "Sign up to access high-quality generation with precise aspect ratios and upscaling!";
  }
  
  return "Upgrade to premium for the best quality generation!";
}

// Pipeline selection logic for API
export function selectPipelineForRequest(opts: {
  userId: string | null;
  requestedMode?: PipelineMode;
  generationMode?: GenerationMode;
  forceMode?: PipelineMode;
}): {
  selectedMode: PipelineMode;
  userTier: UserTier;
  canAccess: boolean;
  upgradeMessage?: string;
} {
  const { userId, requestedMode, generationMode = "auto", forceMode } = opts;
  
  const userTier = getUserTier(userId);
  
  // Force mode overrides everything (for testing/admin)
  if (forceMode) {
    return {
      selectedMode: forceMode,
      userTier,
      canAccess: true,
    };
  }
  
  // Check if user can access requested mode
  if (requestedMode && canAccessPipeline(userTier, requestedMode)) {
    return {
      selectedMode: requestedMode,
      userTier,
      canAccess: true,
    };
  }
  
  // Fall back to recommended mode
  const recommendedMode = getRecommendedPipeline(userTier, generationMode);
  
  return {
    selectedMode: recommendedMode,
    userTier,
    canAccess: true,
    upgradeMessage: requestedMode ? getUpgradeMessage(userTier, requestedMode) || undefined : undefined,
  };
}

// UI helper to get available options for user
export function getAvailablePipelineOptions(userTier: UserTier) {
  const strategy = PIPELINE_STRATEGIES[userTier];
  
  return {
    default: strategy.defaultMode,
    options: strategy.availableModes.map(mode => ({
      value: mode,
      label: getPipelineLabel(mode),
      description: getPipelineDescription(mode),
      estimatedTime: getPipelineTime(mode),
      maxResolution: getPipelineResolution(mode),
    })),
    strategy,
  };
}

// Helper functions
function getPipelineLabel(mode: PipelineMode): string {
  const labels = {
    simple: "Fast Generation",
    hybrid: "Balanced Quality", 
    multimodel: "Best Quality",
    seedream: "4K Advanced",
  };
  return labels[mode];
}

function getPipelineDescription(mode: PipelineMode): string {
  const descriptions = {
    simple: "Quick style transfer with basic aspect ratio",
    hybrid: "Good quality with 2× upscaling",
    multimodel: "Best quality with precise control and 4× upscaling",
    seedream: "Advanced 4K generation with precise editing capabilities",
  };
  return descriptions[mode];
}

function getPipelineTime(mode: PipelineMode): string {
  const times = {
    simple: "30-60s",
    hybrid: "1-2min",
    multimodel: "2-4min",
    seedream: "2-3min",
  };
  return times[mode];
}

function getPipelineResolution(mode: PipelineMode): string {
  const resolutions = {
    simple: "1024×1024",
    hybrid: "2048×2048", 
    multimodel: "4096×4096",
    seedream: "4096×4096",
  };
  return resolutions[mode];
}
