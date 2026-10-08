import React from 'react';

/**
 * High-performance, scalable Vector SVG components with inline CSS animations.
 * Lightweight, zero-dependency, crystal-clear on Retina, iPhone, and Android displays.
 */

export const AnimatedSun: React.FC<{ size?: number; className?: string }> = ({ size = 64, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={`overflow-visible ${className}`}
  >
    <defs>
      <linearGradient id="sunGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FBBF24" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
      <filter id="sunGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    {/* Rotating Ray Cluster */}
    <g className="animate-[spin_16s_linear_infinite] origin-center">
      {Array.from({ length: 8 }).map((_, i) => (
        <line
          key={i}
          x1="50"
          y1="16"
          x2="50"
          y2="6"
          stroke="#F59E0B"
          strokeWidth="4.5"
          strokeLinecap="round"
          transform={`rotate(${i * 45} 50 50)`}
          className="opacity-80"
        />
      ))}
    </g>
    {/* Sun Core with cute subtle face */}
    <circle
      cx="50"
      cy="50"
      r="24"
      fill="url(#sunGrad)"
      filter="url(#sunGlow)"
      className="transition-transform duration-300"
    />
    {/* Cute smile & eyes */}
    <circle cx="43" cy="47" r="2.5" fill="#78350F" />
    <circle cx="57" cy="47" r="2.5" fill="#78350F" />
    <path
      d="M44 54 Q50 60 56 54"
      fill="none"
      stroke="#78350F"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <circle cx="40" cy="53" r="1.5" fill="#F43F5E" opacity="0.6" />
    <circle cx="60" cy="53" r="1.5" fill="#F43F5E" opacity="0.6" />
  </svg>
);

export const AnimatedCloud: React.FC<{ size?: number; className?: string }> = ({ size = 64, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 80"
    className={`overflow-visible animate-[bounce_4s_ease-in-out_infinite] ${className}`}
  >
    <defs>
      <linearGradient id="cloudGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#E2E8F0" />
      </linearGradient>
      <filter id="cloudShadow" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.1" />
      </filter>
    </defs>
    <path
      d="M30 65 Q15 65 15 50 Q15 36 28 35 Q32 20 48 18 Q65 16 72 30 Q85 30 85 45 Q85 65 68 65 Z"
      fill="url(#cloudGrad)"
      filter="url(#cloudShadow)"
      stroke="#CBD5E1"
      strokeWidth="1.5"
    />
    {/* Soft inner glow highlight */}
    <ellipse cx="45" cy="30" rx="14" ry="7" fill="#FFFFFF" opacity="0.6" />
  </svg>
);

export const AnimatedRain: React.FC<{ size?: number; className?: string }> = ({ size = 64, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={`overflow-visible ${className}`}
  >
    <defs>
      <linearGradient id="rainCloud" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#CBD5E1" />
        <stop offset="100%" stopColor="#64748B" />
      </linearGradient>
    </defs>
    {/* Darker Cloud */}
    <path
      d="M28 50 Q15 50 15 38 Q15 26 28 25 Q32 12 48 10 Q65 8 72 22 Q85 22 85 35 Q85 50 68 50 Z"
      fill="url(#rainCloud)"
      stroke="#475569"
      strokeWidth="1.5"
    />
    {/* Animated Raindrops */}
    <g stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round">
      <line x1="32" y1="58" x2="28" y2="72" className="animate-[pulse_1s_infinite] opacity-80" />
      <line x1="48" y1="58" x2="44" y2="74" className="animate-[pulse_1.2s_infinite_0.2s] opacity-90" />
      <line x1="64" y1="58" x2="60" y2="70" className="animate-[pulse_0.9s_infinite_0.4s] opacity-80" />
      <line x1="40" y1="72" x2="36" y2="86" className="animate-[pulse_1.1s_infinite_0.3s] opacity-75" />
      <line x1="56" y1="72" x2="52" y2="86" className="animate-[pulse_1s_infinite_0.5s] opacity-85" />
    </g>
  </svg>
);

export const AnimatedSnow: React.FC<{ size?: number; className?: string }> = ({ size = 64, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={`overflow-visible ${className}`}
  >
    <path
      d="M28 45 Q15 45 15 34 Q15 23 28 22 Q32 10 48 8 Q65 6 72 19 Q85 19 85 32 Q85 45 68 45 Z"
      fill="#E2E8F0"
      stroke="#94A3B8"
      strokeWidth="1.5"
    />
    {/* Detailed 6-ray Snowflakes with spin */}
    <g className="animate-[spin_8s_linear_infinite] origin-[45px_70px]">
      <line x1="45" y1="62" x2="45" y2="78" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="38" y1="66" x2="52" y2="74" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="38" y1="74" x2="52" y2="66" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="45" cy="70" r="1.5" fill="#0284C7" />
    </g>
    <g className="animate-[spin_10s_linear_infinite_reverse] origin-[68px_72px]">
      <line x1="68" y1="66" x2="68" y2="78" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
      <line x1="62" y1="69" x2="74" y2="75" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
      <line x1="62" y1="75" x2="74" y2="69" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
    </g>
    <g className="animate-[spin_9s_linear_infinite] origin-[25px_68px]">
      <line x1="25" y1="62" x2="25" y2="74" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
      <line x1="19" y1="65" x2="31" y2="71" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
      <line x1="19" y1="71" x2="31" y2="65" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
    </g>
  </svg>
);

export const AnimatedStorm: React.FC<{ size?: number; className?: string }> = ({ size = 64, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={`overflow-visible ${className}`}
  >
    {/* Dark Storm Cloud */}
    <path
      d="M28 48 Q15 48 15 36 Q15 24 28 23 Q32 10 48 8 Q65 6 72 20 Q85 20 85 33 Q85 48 68 48 Z"
      fill="#475569"
      stroke="#334155"
      strokeWidth="2"
    />
    {/* Lightning Bolt */}
    <polygon
      points="52,44 40,64 49,64 43,84 64,58 53,58"
      fill="#FACC15"
      stroke="#CA8A04"
      strokeWidth="1.5"
      strokeLinejoin="round"
      className="animate-[pulse_0.8s_ease-in-out_infinite] origin-center"
    />
  </svg>
);

export const AnimatedWindGust: React.FC<{ size?: number; className?: string }> = ({ size = 64, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={`overflow-visible ${className}`}
  >
    <path
      d="M15 40 Q40 40 55 35 Q70 30 70 20 Q70 10 60 10 Q50 10 50 18"
      fill="none"
      stroke="#0284C7"
      strokeWidth="3.5"
      strokeLinecap="round"
      className="animate-[dash_3s_ease-in-out_infinite]"
    />
    <path
      d="M10 55 Q50 55 70 50 Q85 45 85 35 Q85 25 75 25 Q68 25 68 32"
      fill="none"
      stroke="#38BDF8"
      strokeWidth="3.5"
      strokeLinecap="round"
      className="animate-[dash_2.5s_ease-in-out_infinite_0.4s]"
    />
    <path
      d="M20 70 Q45 70 60 66 Q72 62 72 54"
      fill="none"
      stroke="#93C5FD"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Adorable Vector Mascot "Метео-Лисеня" (Meteo Fox)
 */
export const VectorMascot: React.FC<{ size?: number; emotion?: 'happy' | 'thinking' | 'excited' }> = ({
  size = 72,
  emotion = 'happy'
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className="overflow-visible select-none">
    <defs>
      <linearGradient id="foxFur" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#EA580C" />
        <stop offset="100%" stopColor="#C2410C" />
      </linearGradient>
      <linearGradient id="foxChest" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFFBEB" />
        <stop offset="100%" stopColor="#FEF3C7" />
      </linearGradient>
    </defs>
    {/* Fox Ears */}
    <polygon points="26,45 14,14 42,28" fill="#C2410C" stroke="#7C2D12" strokeWidth="2" strokeLinejoin="round" />
    <polygon points="28,42 20,20 38,30" fill="#FEE2E2" />

    <polygon points="74,45 86,14 58,28" fill="#C2410C" stroke="#7C2D12" strokeWidth="2" strokeLinejoin="round" />
    <polygon points="72,42 80,20 62,30" fill="#FEE2E2" />

    {/* Fox Head */}
    <ellipse cx="50" cy="54" rx="34" ry="28" fill="url(#foxFur)" stroke="#9A3412" strokeWidth="2" />

    {/* Fluffy White Cheeks */}
    <path
      d="M20 54 Q35 74 50 78 Q65 74 80 54 Q65 62 50 64 Q35 62 20 54 Z"
      fill="url(#foxChest)"
    />

    {/* Cute Nose */}
    <path d="M46 64 Q50 67 54 64 L50 68 Z" fill="#18181B" />

    {/* Eyes based on emotion */}
    {emotion === 'excited' ? (
      <>
        <path d="M35 48 Q40 42 45 48" fill="none" stroke="#18181B" strokeWidth="3" strokeLinecap="round" />
        <path d="M55 48 Q60 42 65 48" fill="none" stroke="#18181B" strokeWidth="3" strokeLinecap="round" />
      </>
    ) : emotion === 'thinking' ? (
      <>
        <circle cx="40" cy="48" r="4.5" fill="#18181B" />
        <circle cx="60" cy="48" r="4.5" fill="#18181B" />
        <circle cx="42" cy="46" r="1.5" fill="#FFFFFF" />
        <circle cx="62" cy="46" r="1.5" fill="#FFFFFF" />
      </>
    ) : (
      <>
        {/* Big sparkling friendly eyes */}
        <ellipse cx="38" cy="48" rx="4.5" ry="5.5" fill="#18181B" />
        <ellipse cx="62" cy="48" rx="4.5" ry="5.5" fill="#18181B" />
        <circle cx="40" cy="46" r="1.8" fill="#FFFFFF" />
        <circle cx="64" cy="46" r="1.8" fill="#FFFFFF" />
        <circle cx="36" cy="50" r="1" fill="#FFFFFF" />
        <circle cx="60" cy="50" r="1" fill="#FFFFFF" />
      </>
    )}

    {/* Rosy Cheeks */}
    <ellipse cx="28" cy="58" rx="4" ry="2.5" fill="#FB7185" opacity="0.7" />
    <ellipse cx="72" cy="58" rx="4" ry="2.5" fill="#FB7185" opacity="0.7" />

    {/* Smile */}
    <path
      d="M45 70 Q50 74 55 70"
      fill="none"
      stroke="#18181B"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);
