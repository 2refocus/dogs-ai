export default function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-neutral-200/20 dark:bg-neutral-800/30 ${className}`}>
      <div className="absolute inset-0 animate-pulse" />
      {/* Multiple diagonal stripes for more visual impact */}
      <div className="absolute -inset-x-1/2 -inset-y-1/2 rotate-12 bg-gradient-to-r from-transparent via-[var(--brand)] to-transparent blur-sm animate-[shimmer_1.2s_infinite]" />
      <div className="absolute -inset-x-1/2 -inset-y-1/2 rotate-12 bg-gradient-to-r from-transparent via-[var(--brand)]/80 to-transparent blur-md animate-[shimmer_1.2s_infinite_0.3s]" />
      <div className="absolute -inset-x-1/2 -inset-y-1/2 rotate-12 bg-gradient-to-r from-transparent via-[var(--brand)]/60 to-transparent blur-lg animate-[shimmer_1.2s_infinite_0.6s]" />
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-80%); }
          100% { transform: translateX(80%); }
        }
      `}</style>
    </div>
  );
}