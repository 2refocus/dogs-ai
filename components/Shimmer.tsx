export default function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-[var(--muted)] ${className}`}>
      {/* Base background with subtle pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--muted)] via-[var(--muted)]/80 to-[var(--muted)]" />
      
      {/* Animated shimmer effect with brand color */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--brand)]/20 to-transparent animate-shimmer" />
      
      {/* Secondary shimmer for more depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--brand)]/10 to-transparent animate-shimmer-delayed" />
      
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes shimmer-delayed {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
        .animate-shimmer-delayed {
          animation: shimmer-delayed 2s ease-in-out infinite 0.5s;
        }
      `}</style>
    </div>
  );
}