"use client";
import * as React from "react";

/**
 * ARFrame locked to square (1:1).
 * Use to keep preview/result containers perfectly square.
 */
export default function ARFrame({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div
      className={`ar-frame ${className}`}
      style={{ aspectRatio: "1 / 1" }}
    >
      {children}
    </div>
  );
}
