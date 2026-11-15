import { useId } from 'react';

interface CodeXamLogoProps {
  size?: number;
  className?: string;
}

export function CodeXamLogo({ size = 36, className = '' }: CodeXamLogoProps) {
  const uid = useId().replace(/:/g, '');
  const emeraldGrad = `cx-emerald-${uid}`;
  const cardGrad = `cx-card-${uid}`;
  const glowId = `cx-glow-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={emeraldGrad} x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="50%" stopColor="#059669" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id={cardGrad} x1="2" y1="2" x2="46" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#ECFDF5" />
        </linearGradient>
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Crisp white & soft mint rounded-square container */}
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="11"
        fill={`url(#${cardGrad})`}
        stroke="#A7F3D0"
        strokeWidth="1.5"
      />
      <rect
        x="4"
        y="4"
        width="40"
        height="40"
        rx="9"
        stroke="#10B981"
        strokeOpacity="0.18"
        strokeWidth="1"
      />

      {/* Left sharp code bracket < */}
      <path
        d="M13.5 16.5L7.5 24L13.5 31.5"
        stroke="#065F46"
        strokeOpacity="0.65"
        strokeWidth="2.4"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />

      {/* Right sharp code bracket > */}
      <path
        d="M34.5 16.5L40.5 24L34.5 31.5"
        stroke="#065F46"
        strokeOpacity="0.65"
        strokeWidth="2.4"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />

      {/* Stylized geometric X integrating emerald slash / and crisp slate-900 counter-slash */}
      <g filter={`url(#${glowId})`}>
        <path
          d="M17.5 34L29.5 14"
          stroke={`url(#${emeraldGrad})`}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M18.5 15.5L29.5 32.5"
          stroke="#0F172A"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <circle cx="24" cy="24" r="2.3" fill="#10B981" />
      </g>
    </svg>
  );
}
