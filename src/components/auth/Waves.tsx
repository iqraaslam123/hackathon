export function Waves() {
  return (
    <>
      <svg
        className="wave wave--top"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          fill="url(#waveGradTop)"
          d="M0,224L60,213.3C120,203,240,181,360,181.3C480,181,600,203,720,213.3C840,224,960,224,1080,202.7C1200,181,1320,139,1380,117.3L1440,96L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z"
        />
        <defs>
          <linearGradient id="waveGradTop" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffd166" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#ff6b35" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#b31244" stopOpacity="0.4" />
          </linearGradient>
        </defs>
      </svg>
      <svg
        className="wave wave--bottom"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          fill="url(#waveGradBottom)"
          d="M0,96L60,117.3C120,139,240,181,360,181.3C480,181,600,139,720,122.7C840,107,960,117,1080,138.7C1200,160,1320,192,1380,208L1440,224L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
        />
        <defs>
          <linearGradient id="waveGradBottom" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#b31244" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#ff6b35" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ffd166" stopOpacity="0.5" />
          </linearGradient>
        </defs>
      </svg>
    </>
  );
}