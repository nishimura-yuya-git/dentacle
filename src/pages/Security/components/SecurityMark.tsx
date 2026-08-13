/** 先頭の確認マーク。Nani の PNG は使わず、盾・確認・錠の自前 SVG。Lucide 禁止。 */
export function SecurityMark() {
  return (
    <svg
      className="mx-auto mt-3 block h-24 w-24"
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="security-mark-shield" x1="20" y1="10" x2="76" y2="88">
          <stop offset="0%" stopColor="#5EE06A" />
          <stop offset="45%" stopColor="#12B02A" />
          <stop offset="100%" stopColor="#007A01" />
        </linearGradient>
        <linearGradient id="security-mark-lock" x1="58" y1="58" x2="86" y2="88">
          <stop offset="0%" stopColor="#F6D36A" />
          <stop offset="100%" stopColor="#D4A017" />
        </linearGradient>
        <filter id="security-mark-shadow" x="-25%" y="-10%" width="150%" height="160%">
          <feDropShadow dx="0" dy="7" stdDeviation="5.5" floodColor="#008C01" floodOpacity="0.22" />
        </filter>
      </defs>
      <g filter="url(#security-mark-shadow)">
        <path
          d="M48 12c10 7 20 9 28 10v28c0 18-12 30-28 36-16-6-28-18-28-36V22c8-1 18-3 28-10Z"
          fill="url(#security-mark-shield)"
        />
        <path
          d="M48 18c8 5 16 7 22 8v8c-7-4-14-7-22-9-8 2-15 5-22 9v-8c6-1 14-3 22-8Z"
          fill="white"
          opacity="0.28"
        />
        <path
          d="M34 46.5 44 57 64 34"
          stroke="white"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="61" y="62" width="22" height="18" rx="4" fill="url(#security-mark-lock)" />
        <path
          d="M66 62v-5a6 6 0 0 1 12 0v5"
          stroke="#F4F7F4"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx="72" cy="71" r="2.2" fill="#7A5B00" />
      </g>
    </svg>
  )
}
