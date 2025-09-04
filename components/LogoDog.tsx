import * as React from "react";

/**
 * Minimal dog line-art logo
 * - Sized via CSS; uses currentColor for stroke
 * - Accessible: pass title for screen readers
 */
export default function LogoDog({
  title = "Dog logo",
  className = "",
}: { title?: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Head outline */}
      <path d="M20 30c0-9 7-16 16-16 6 0 10 3 14 8 3 4 3 11 0 15-4 6-11 9-18 9-9 0-12-5-12-11 0-2 .4-3.8 1-5.5" />
      {/* Ear */}
      <path d="M42 18c3 2 5 5 5 8" />
      {/* Snout */}
      <path d="M34 36c4 1 8-1 10-3" />
      {/* Eye */}
      <circle cx="36" cy="28" r="1.5" fill="currentColor" stroke="none" />
      {/* Nose */}
      <circle cx="46" cy="33" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
