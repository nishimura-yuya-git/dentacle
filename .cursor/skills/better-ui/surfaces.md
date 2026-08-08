# Surfaces

Border radius、optical alignment、影と境界。値はプロジェクト既存トークンを優先する。

## 同心円 Border Radius

近い入れ子面では:

```text
outerRadius = innerRadius + padding
```

padding が 24px 超、またはレイヤーが独立して見えるときは厳密計算を強制しない。

### 例（概念）

```tsx
// Good: 外側が内側+padding
<div className="rounded-2xl p-2">   {/* 16px, padding 8px */}
  <div className="rounded-lg">      {/* 8px = 16 - 8 */}
    ...
  </div>
</div>

// Bad: 同じ角丸が内側を窮屈に見せる
<div className="rounded-xl p-2">
  <div className="rounded-xl">
    ...
  </div>
</div>
```

既存の `rounded-[20px]` / `rounded-[28px]` / モーダル `rounded-[32px]` など案件トークンがある面は、その階層を崩さない。

## Optical Alignment

幾何中央がズレて見えるときだけ調整する。

### テキスト + アイコンボタン

アイコン側の padding をわずかに減らす開始点: `icon-side = text-side - 2px`。

```tsx
<button className="ps-4 pe-3.5 inline-flex items-center gap-2">
  <span>続ける</span>
  {/* カスタムSVG。Lucide禁止 */}
</button>
```

### 非対称アイコン

可能なら SVG の viewBox / path を直し、コンポーネント側の translate に頼らない。

## 影と境界線

| 用途 | 方針 |
| --- | --- |
| 構造・区切り・選択 | `border-slate-100`〜`200` |
| 情報パネル | `shadow-sm` まで（業務UI） |
| elevated（モーダル等） | 強めの影はここだけ。`shadow-2xl` 乱用禁止 |
| 深度の偽 border | 透明な薄い影へ。ただし案件が境界線言語なら境界線を維持 |

業務UIで「高級だから」と全面に強い影やグラデを足さない。
