// components/PipelineSelector.tsx
// UI component for pipeline selection based on user tier

"use client";

import { useState, useEffect } from "react";
import { getAvailablePipelineOptions, getUserTier } from "@/lib/pipelineStrategy";
import type { PipelineMode } from "@/lib/pipelineConfig";

interface PipelineSelectorProps {
  userId: string | null;
  selectedMode: PipelineMode;
  onModeChange: (mode: PipelineMode) => void;
  className?: string;
}

export default function PipelineSelector({ 
  userId, 
  selectedMode, 
  onModeChange, 
  className = "" 
}: PipelineSelectorProps) {
  const [userTier, setUserTier] = useState<"guest" | "logged_in" | "premium">("guest");
  const [availableOptions, setAvailableOptions] = useState<any>(null);

  useEffect(() => {
    const tier = getUserTier(userId);
    setUserTier(tier);
    setAvailableOptions(getAvailablePipelineOptions(tier));
  }, [userId]);

  if (!availableOptions) return null;

  const { options, strategy } = availableOptions;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Pipeline Mode Selector */}
      <div>
        <label className="block text-sm font-medium text-[var(--fg)] mb-2">
          Generation Quality
        </label>
        <div className="space-y-2">
          {options.map((option: any) => (
            <label
              key={option.value}
              className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                selectedMode === option.value
                  ? userTier === "guest" 
                    ? "border-gray-400 bg-gray-400/10" 
                    : "border-[var(--brand)] bg-[var(--brand)]/10"
                  : "border-[var(--line)] hover:border-[var(--brand)]/50"
              }`}
            >
              <input
                type="radio"
                name="pipeline_mode"
                value={option.value}
                checked={selectedMode === option.value}
                onChange={(e) => onModeChange(e.target.value as PipelineMode)}
                className="sr-only"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--fg)]">
                    {option.label}
                  </span>
                  <span className="text-xs text-[var(--muted-fg)]">
                    {option.estimatedTime}
                  </span>
                </div>
                <p className="text-sm text-[var(--muted-fg)] mt-1">
                  {option.description}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-[var(--muted)] text-[var(--muted-fg)] px-2 py-1 rounded">
                    {option.maxResolution}
                  </span>
                  {option.value === "multimodel" && userTier === "guest" && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Sign up required
                    </span>
                  )}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* User Tier Info */}
      {userTier === "guest" && (
        <div className="rounded-lg p-3 shadow-sm bg-white border-2 border-gray-400 dark:bg-gray-800/30 dark:border-gray-700 dark:shadow-none">
          <div className="flex items-start gap-2">
            <div className="text-gray-500 mt-0.5 dark:text-gray-400">ℹ️</div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                Sign up for better quality
              </p>
              <p className="text-xs text-gray-800 mt-1 dark:text-gray-300">
                Logged-in users get access to high-quality generation with precise aspect ratios and upscaling.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Features */}
      <div className="text-xs text-[var(--muted-fg)]">
        <p className="font-medium mb-1">Available features:</p>
        <div className="flex flex-wrap gap-1">
          {strategy.features.map((feature: string, index: number) => (
            <span
              key={index}
              className="bg-[var(--muted)] text-[var(--muted-fg)] px-2 py-1 rounded"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Hook for pipeline selection logic
export function usePipelineSelection(userId: string | null) {
  const [selectedMode, setSelectedMode] = useState<PipelineMode>("simple");
  const [userTier, setUserTier] = useState<"guest" | "logged_in" | "premium">("guest");

  useEffect(() => {
    const tier = getUserTier(userId);
    setUserTier(tier);
    
    // Set default mode based on user tier
    const options = getAvailablePipelineOptions(tier);
    setSelectedMode(options.default);
  }, [userId]);

  return {
    selectedMode,
    setSelectedMode,
    userTier,
    availableOptions: getAvailablePipelineOptions(userTier),
  };
}
