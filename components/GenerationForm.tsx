// components/GenerationForm.tsx
// Example integration of pipeline selection with generation form

"use client";

import { useState } from "react";
import { usePipelineSelection } from "./PipelineSelector";
import type { PipelineMode } from "@/lib/pipelineConfig";

interface GenerationFormProps {
  userId: string | null;
  onGenerate: (formData: FormData) => void;
  loading: boolean;
}

export default function GenerationForm({ userId, onGenerate, loading }: GenerationFormProps) {
  const { selectedMode, setSelectedMode, userTier, availableOptions } = usePipelineSelection(userId);
  const [file, setFile] = useState<File | null>(null);
  const [styleLabel, setStyleLabel] = useState("Photorealistic");
  const [cropRatio, setCropRatio] = useState("4_5");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("preset_label", styleLabel);
    formData.append("crop_ratio", cropRatio);
    formData.append("pipeline_mode", selectedMode);
    formData.append("user_id", userId || "");
    
    onGenerate(formData);
  };

  const canAccessHighQuality = availableOptions.options.some((opt: any) => opt.value === "multimodel");

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-[var(--fg)] mb-2">
          Upload Image
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full p-3 border border-[var(--line)] rounded-lg bg-[var(--bg)] text-[var(--fg)]"
          required
        />
      </div>

      {/* Style Selection */}
      <div>
        <label className="block text-sm font-medium text-[var(--fg)] mb-2">
          Style
        </label>
        <select
          value={styleLabel}
          onChange={(e) => setStyleLabel(e.target.value)}
          className="w-full p-3 border border-[var(--line)] rounded-lg bg-[var(--bg)] text-[var(--fg)]"
        >
          <option value="Photorealistic">Photorealistic</option>
          <option value="Watercolor">Watercolor</option>
          <option value="Oil Painting">Oil Painting</option>
          <option value="Anime">Anime</option>
          <option value="Digital Art">Digital Art</option>
        </select>
      </div>

      {/* Pipeline Selection */}
      <div>
        <label className="block text-sm font-medium text-[var(--fg)] mb-2">
          Generation Quality
        </label>
        <div className="space-y-2">
          {availableOptions.options.map((option: any) => (
            <label
              key={option.value}
              className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                selectedMode === option.value
                  ? "border-[var(--brand)] bg-[var(--brand)]/10"
                  : "border-[var(--line)] hover:border-[var(--brand)]/50"
              }`}
            >
              <input
                type="radio"
                name="pipeline_mode"
                value={option.value}
                checked={selectedMode === option.value}
                onChange={(e) => setSelectedMode(e.target.value as PipelineMode)}
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
                {option.value === "multimodel" && userTier === "guest" && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded mt-2 inline-block">
                    Sign up required
                  </span>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* User Tier Info */}
      {userTier === "guest" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <div className="text-blue-500 mt-0.5">ℹ️</div>
            <div>
              <p className="text-sm font-medium text-blue-900">
                Sign up for better quality
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Logged-in users get access to high-quality generation with precise aspect ratios and upscaling.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <button
        type="submit"
        disabled={loading || !file}
        className="w-full bg-[var(--brand)] text-white py-3 px-4 rounded-lg font-medium hover:bg-[var(--brand)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Generating..." : "Generate Portrait"}
      </button>

      {/* Generation Info */}
      <div className="text-xs text-[var(--muted-fg)] text-center">
        <p>Selected: {availableOptions.options.find((opt: any) => opt.value === selectedMode)?.label}</p>
        <p>Estimated time: {availableOptions.options.find((opt: any) => opt.value === selectedMode)?.estimatedTime}</p>
        <p>Max resolution: {availableOptions.options.find((opt: any) => opt.value === selectedMode)?.maxResolution}</p>
      </div>
    </form>
  );
}
