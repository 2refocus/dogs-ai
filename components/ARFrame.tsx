"use client";
import * as React from "react";

type AR = "1:1" | "4:5" | "3:4" | "16:9";

type Props = {
  ar?: AR;
  className?: string;
  children: React.ReactNode;
};

/**
 * ARFrame enforces CSS aspect-ratio for its content.
 * Usage:
 *   <ARFrame ar={currentAR} className="mb-4">
 *     <img src={url} alt="result" className="w-full h-full object-contain" />
 *   </ARFrame>
 */
export default function ARFrame({ ar = "1:1", className = "", children }: Props): JSX.Element {
  const ratio = ar === "4:5" ? "4 / 5"
              : ar === "3:4" ? "3 / 4"
              : ar === "16:9" ? "16 / 9"
              : "1 / 1";
  return (
    <div
      className={`ar-frame ${className}`}
      data-ar={ar}
      style={{ aspectRatio: ratio }}
    >
      {children}
    </div>
  );
}
