/** 先頭の確認マーク。Nani の 3D PNG は使わず、自前 SVG にする。Lucide 禁止。 */
export function SecurityMark() {
  return (
    <svg
      className="mx-auto mt-3 block h-24 w-24"
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="security-mark-face" x1="24" y1="14" x2="72" y2="78">
          <stop offset="0%" stopColor="#4AD45F" />
          <stop offset="55%" stopColor="#12A326" />
          <stop offset="100%" stopColor="#007A01" />
        </linearGradient>
        <linearGradient id="security-mark-side" x1="70" y1="22" x2="86" y2="80">
          <stop offset="0%" stopColor="#0B8A16" />
          <stop offset="100%" stopColor="#005C01" />
        </linearGradient>
        <filter id="security-mark-shadow" x="-20%" y="-10%" width="140%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#008C01" floodOpacity="0.28" />
        </filter>
      </defs>
      <g filter="url(#security-mark-shadow)">
        <path
          d="M28 22h36c8 0 14 6 14 14v28c0 8-6 14-14 14H28c-8 0-14-6-14-14V36c0-8 6-14 14-14Z"
          fill="url(#security-mark-face)"
        />
        <path
          d="M64 22c8 0 14 6 14 14v28c0 8-6 14-14 14 4-4 7-10 7-16V36c0-6-3-12-7-14Z"
          fill="url(#security-mark-side)"
          opacity="0.85"
        />
        <path
          d="M30 24h32c6.5 0 12 4.2 12 10v10c-8-6-18-9-28-9-8 0-16 1.5-22 4V34c0-6 5.2-10 6-10Z"
          fill="white"
          opacity="0.22"
        />
        <path
          d="M34 48.5 44 59 64 35"
          stroke="white"
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}
