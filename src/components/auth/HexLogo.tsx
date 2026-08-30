export function HexLogo({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <div className={`relative ${className} `}>
      <svg
        viewBox="0 0 100 100"
        className={`h-full w-full hex-spin`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hexGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffd166" />
            <stop offset="50%" stopColor="#ff6b35" />
            <stop offset="100%" stopColor="#b31244" />
          </linearGradient>
        </defs>
        <polygon
          points="50,4 93,27 93,73 50,96 7,73 7,27"
          fill="rgba(255,255,255,0.06)"
          stroke="url(#hexGrad)"
          strokeWidth="3"
        />
        <circle cx="50" cy="50" r="16" fill="none" stroke="url(#hexGrad)" strokeWidth="3" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-extrabold tracking-tight text-grad-yellow">
          A
        </span>
      </div>
    </div>
  );
}
