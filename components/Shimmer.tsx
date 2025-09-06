export default function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-neutral-200/20 dark:bg-neutral-800/30 ${className}`}>
      <div className="absolute inset-0 animate-pulse" />
      <div className="absolute -inset-x-1/2 -inset-y-1/2 rotate-12 bg-gradient-to-r from-transparent via-[var(--brand)]/40 to-transparent blur-md animate-[shimmer_1.6s_infinite]" />
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-60%); }
          100% { transform: translateX(60%); }
        }
      `}</style>
    </div>
  );
}