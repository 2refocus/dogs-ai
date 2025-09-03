"use client";
import { useEffect, useState } from "react";

type Props = {
  src: string;
  alt?: string;
  className?: string;
};

export default function ProgressiveImage({ src, alt = "", className = "" }: Props) {
  const [hiReady, setHiReady] = useState(false);
  const [lqipSrc, setLqipSrc] = useState<string | null>(null);

  useEffect(() => {
    setHiReady(false);
    // Build a low-res URL via our proxy
    const lq = `/api/proxy?url=${encodeURIComponent(src)}&w=64`;
    setLqipSrc(lq);
  }, [src]);

  return (
    <div className={`progressive-wrap ${className}`}>
      {lqipSrc && <img className={`progressive low ${hiReady ? "hide" : ""}`} src={lqipSrc} alt={alt} />}
      <img
        className={`progressive hi ${hiReady ? "show" : ""}`}
        src={src}
        alt={alt}
        onLoad={() => setHiReady(true)}
      />
    </div>
  );
}
