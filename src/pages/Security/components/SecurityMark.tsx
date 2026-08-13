/** Nani 先頭アイコン相当。3D素材は使わず、角丸の確認マークにする。Lucide 禁止。 */
export function SecurityMark() {
  return (
    <div
      className="mx-auto mt-3 flex h-24 w-24 items-center justify-center rounded-[22px] bg-gradient-to-b from-[#2DB84D] to-[#008C01] shadow-[0_10px_24px_rgba(0,140,1,0.28)]"
      aria-hidden="true"
    >
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
        <path
          d="M10 27.5 21.5 39 42 16"
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
