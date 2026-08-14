import { ThinkingOrb } from 'thinking-orbs'

type Props = {
  size?: 20 | 64
  className?: string
  label?: string
}

/**
 * 自動提案の処理中表示。thinking-orbs の composing だけを使う。
 * 業務UIは明るい面なので theme は light 固定。
 */
export function ComposingOrb({
  size = 64,
  className = '',
  label = '提案を作成しています',
}: Props) {
  return (
    <ThinkingOrb
      state="composing"
      size={size}
      theme="light"
      aria-label={label}
      className={className}
    />
  )
}
