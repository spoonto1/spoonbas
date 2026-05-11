/*
 * Spoon BAS shield emblem — a controls-console mark.
 * Heroic shield silhouette with a stylized "S" carved as control crosshairs.
 * Original geometry, no trademarked references.
 */
export function ShieldLogo({
  className = "",
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-label="Spoon BAS"
      role="img"
    >
      <defs>
        <linearGradient id="sb-shield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.18" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Shield body */}
      <path
        d="M32 4 L56 12 V28 C56 44 46 54 32 60 C18 54 8 44 8 28 V12 Z"
        fill="url(#sb-shield)"
        stroke="hsl(var(--primary))"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Inner ring */}
      <circle
        cx="32"
        cy="30"
        r="11"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        opacity="0.55"
      />
      {/* Stylized "S" as offset control crosshair */}
      <path
        d="M26 23 H38 M26 30 H34 M28 37 H38"
        stroke="hsl(var(--primary))"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Crosshair through center */}
      <path
        d="M32 14 V20 M32 40 V46 M14 30 H20 M44 30 H50"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}
