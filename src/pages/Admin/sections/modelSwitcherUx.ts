export type GrokSliderPointerPhase = 'down' | 'move' | 'up'

/**
 * 版スライダー操作のたびにパネルを閉じると、切り替えた瞬間に面が消えてUXが悪い。
 * 閉じるのは外側クリック / ESC / トリガー再押下だけ。
 */
export function shouldCloseModelSwitcherAfterSave(): boolean {
  return false
}

/** ドラッグ中は見た目だけ動かし、確定は指を離したとき。 */
export function shouldCommitGrokSliderOnPhase(
  phase: GrokSliderPointerPhase,
): boolean {
  return phase === 'up'
}
