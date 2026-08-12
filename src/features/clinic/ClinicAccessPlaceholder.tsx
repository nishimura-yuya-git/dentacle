/**
 * クリニック情報の読込中プレースホルダ（未所属カードを誤表示しない）。
 * 文言は出さず、レイアウトだけ確保する。
 */
export function ClinicAccessPlaceholder() {
  return <div className="min-h-[240px]" aria-busy="true" aria-label="読み込み中" />
}
