/** 安全性ページ先頭の確認マーク。Lucide は使わない。 */
export function SecurityMark() {
  return (
    <svg
      width="96"
      height="96"
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
      className="mx-auto block"
    >
      <circle cx="48" cy="48" r="46" fill="#F0F9F0" stroke="#008C01" strokeWidth="2" />
      <path
        d="M30 49.5 42 61.5 67 35.5"
        stroke="#008C01"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
