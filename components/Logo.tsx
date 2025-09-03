import React from "react";

type Props = { variant?: "combo" | "dog" | "cat"; className?: string; strokeWidth?: number };

export default function Logo({ variant = "combo", className, strokeWidth = 1.8 }: Props) {
  if (variant === "dog") return <Dog className={className} strokeWidth={strokeWidth} />;
  if (variant === "cat") return <Cat className={className} strokeWidth={strokeWidth} />;
  return <Combo className={className} strokeWidth={strokeWidth} />;
}

function Dog({ className, strokeWidth = 1.8 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-label="Dog logo">
      <path d="M10 24c3-4 8-7 13-7 6 0 9 4 9 4s3-4 9-4c5 0 10 3 13 7" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M16 34c2 8 8 14 16 14s14-6 16-14" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M22 42c2 2 6 4 10 4s8-2 10-4" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
      <circle cx="26" cy="30" r="1.5" fill="currentColor"/>
      <circle cx="38" cy="30" r="1.5" fill="currentColor"/>
      <path d="M32 34c-1.5 0-3 1-3 2s1.5 2 3 2 3-1 3-2-1.5-2-3-2z" stroke="currentColor" strokeWidth={strokeWidth * 0.9} strokeLinecap="round"/>
      <path d="M12 20l-4-6c-1-1-3 0-2 2l2 6" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M52 20l4-6c1-1 3 0 2 2l-2 6" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  );
}

function Cat({ className, strokeWidth = 1.8 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-label="Cat logo">
      <path d="M16 24c0-6 3-10 6-12l4 6 6-2 6 2 4-6c3 2 6 6 6 12" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M16 28c0 12 8 20 16 20s16-8 16-20" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
      <circle cx="26" cy="32" r="1.5" fill="currentColor"/>
      <circle cx="38" cy="32" r="1.5" fill="currentColor"/>
      <path d="M28 38c2 1 6 1 8 0" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M18 34c-4 0-6-2-8-4" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M46 34c4 0 6-2 8-4" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  );
}

function Combo({ className, strokeWidth = 1.8 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 120 64" fill="none" className={className} aria-label="Dog and cat logo">
      <g transform="translate(0,0)">
        <path d="M10 24c3-4 8-7 13-7 6 0 9 4 9 4s3-4 9-4c5 0 10 3 13 7" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
        <path d="M16 34c2 8 8 14 16 14s14-6 16-14" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
        <circle cx="26" cy="30" r="1.5" fill="currentColor"/>
        <circle cx="38" cy="30" r="1.5" fill="currentColor"/>
      </g>
      <g transform="translate(60,0)">
        <path d="M16 24c0-6 3-10 6-12l4 6 6-2 6 2 4-6c3 2 6 6 6 12" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
        <path d="M16 28c0 12 8 20 16 20s16-8 16-20" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
        <circle cx="26" cy="32" r="1.5" fill="currentColor"/>
        <circle cx="38" cy="32" r="1.5" fill="currentColor"/>
      </g>
    </svg>
  );
}
