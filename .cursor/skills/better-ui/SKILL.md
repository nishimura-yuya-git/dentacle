---
name: better-ui
description: >-
  インターフェースの polish 細部。同心円角丸、optical alignment、影と境界の役割、モーション抑制、
  transition の明示。UIコンポーネント実装・見た目レビュー・「なんか安っぽい」「角が気持ち悪い」で使う。
  Triggers on UI polish, border radius, optical alignment, micro-interaction, transition:all,
  motion restraint, 角丸, 余白のチープさ, better-ui。
---

# 細部が積み上がって体験になる

良いインターフェースは一点突破より、小さな正しさの積み上げが多い。UIコードの実装・レビューで次の原則を使う。

レビュー時は Animations パネルでモーションを 10% 速度再生し、hover / focus / active / loading / empty を歩く。10% で違和感があるものは通常速度でも微妙に壊れている。

プロジェクトのコンポーネント、トークン、密度を壊さない。色・余白・主色の正本は `ui-design.mdc` / `ui-design-hp-lp.mdc`。文言は `ui-language.mdc`。禁止アイコン（Lucide 等）を提案しない。

タイポの本文規則は `ui-design.mdc`、a11y は同ルールと `better-interface` の Accessibility ドメイン、レイアウト構造の大枠も `ui-design.mdc` を優先する。このスキルは **任意の視覚 polish**（角丸・光軸・モーション美学）に限定する。

出典の考え方: [jakubkrehel/skills](https://github.com/jakubkrehel/skills) の `better-ui`（MIT）。案件トークンと業務UIの静けさに合わせて一部を抑制している。

## Quick Reference

| Category | When to Use |
| --- | --- |
| [Surfaces](surfaces.md) | 同心円角丸、optical alignment、影と境界 |

## Core Principles

### 1. 同心円の Border Radius

入れ子で近い面では `outerRadius = innerRadius + padding`。同じ角丸を親子に重ねると内側が窮屈に見える。padding が 24px を超える、または非対称 inset のときは厳密計算を強制せず、既存コンポーネントトークンを優先する。詳細は [surfaces.md](surfaces.md)。

### 2. Optical Over Geometric Alignment

幾何中央がズレて見えるときだけ光学合わせする。アイコン付きボタン、非対称SVG、再生三角など。まず SVG / 余白の微小調整。詳細は [surfaces.md](surfaces.md)。

### 3. 影は階層、境界線は構造

業務UIでは **境界線優先**（`border-slate-100`〜`200`）。強い影（`shadow-2xl` 等）はモーダル・ドロワー・最前面通知など elevated のみ。深度のためだけに太い solid border を増やさない。HP/LP でも既存ルールの影階層を超えない。

### 4. Interruptible Animations

インタラクティブな状態変化は CSS transitions（途中割り込み可）。一度きりの演出シーケンスだけ keyframes。業務UIでは常時アニメ・bounce・派手な発光を使わない。

### 5. Motion Restraint

高頻度操作（hover 連打、キー入力ごと）にカスタム入場アニメを付けない。モーションは唯一のフィードバックにしてはならない。色・アイコン・ラベルの静的手がかりを必ず併せる。`prefers-reduced-motion` を尊重する。

### 6. Never Use `transition: all`

変化させるプロパティだけ書く。例: `transition-property: transform, opacity` / Tailwind なら `transition-transform` 等。意図しないレイアウトアニメを防ぐ。

### 7. `will-change` は最小限

GPU 合成できる `transform` / `opacity` / `filter` に限定。`will-change: all` 禁止。初フレームの引っかかりが観測できたときだけ。

### 8. Scale on Press は任意

触感フィードバックが必要な主操作では `active:scale-[0.96]` 程度まで。`0.95` 未満は誇張に見えるので使わない。業務の高密度表・繰り返しクリックでは `static`（無効化）を優先。既存 `Button` のモーション言語がある場合はそれに合わせる。

### 9. アイコンは currentColor・1セット

アイコンはインラインSVG / 既存アセット。`currentColor` で状態色を受け、ライブラリ混在禁止（特に Lucide / Heroicons / react-icons）。Outline を既定、Fill は選択/アクティブのみ。

### 10. ページロードで余計な入場を走らせない

状態トグル用の enter アニメが初回表示で誤発火しないようにする（例: 意図しない AnimatePresence 初期アニメ）。意図した FV 入場まで消さない。

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| 親子に同じ `rounded-*` | `outer = inner + padding` または既存トークンに合わせる |
| アイコンが中央ズレ | 光学余白か SVG 自体を直す |
| 深度のためだけに太い border | 業務UIは薄い境界線。elevated だけ控えめな影 |
| `transition-all` | プロパティを明示 |
| 毎回の hover に入場スタガー | 即時 or ≤150ms の opacity/color |
| `scale(0.9)` の press | `0.96` まで、または業務密度なら無効 |
| Lucide 等の追加 | カスタムSVGへ置換 |
| 影を全面に強くする | `ui-design.mdc` の elevated 範囲に戻す |

## Review Output Format

単独の UI-polish レビューを頼まれたときだけこの形式を使う。`better-interface` 配下では、そちらの共有 severity・上限・Verdict に従い、ここでは domain evidence を渡す。

### Findings

原則ごとに表（Severity / Location / Before / After / Why）。`path:line` 必須。系統問題は1行にまとめ、該当なしの原則は省略。

- `HIGH`: 操作が誤解される、反応しない、繰り返し妨害する
- `MEDIUM`: 工芸・一貫性の明らかな欠け
- `LOW`: 局所 polish

### Verification and Verdict

1. **Verification**: 実施した状態ウォークと、モーションがある場合の 10% 再生結果
2. **Verdict**: `Block`（HIGH残）/ `Needs changes`（MEDIUM/LOW）/ `Approve`（actionable なし）

Findings が無いときは表を省略し「actionable な UI-polish findings なし」と書いて `Approve`。
