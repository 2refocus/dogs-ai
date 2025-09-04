"use client";
import React from "react";

type Props = {
  ar?: "1:1" | "4:5" | "3:4" | "16:9";
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
export default function ARFrame({ ar = "1:1", className = "", children }: Props) {
  const ratio = ar === "4:5" ? "4 / 5"
              : ar === "3:4" ? "3 / 4"
              : ar === "16:9" ? "16 / 9"
              : "1 / 1";
  return (
    <div
      className={\`ar-frame \${className}\`}
      data-ar={ar}
      style={{ aspectRatio: ratio }}
    >
      {children}
    </div>
  );
}
