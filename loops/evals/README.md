# Eval Templates（薄い評価契約）

Future AGI の「template → config → run → score」思想だけを借りた層です。  
製品・SDK・LLM-as-judge は入れません。採点の正は既存の決定論チェックです。

## モデル

| 要素 | 本ハーネスでの実体 |
|---|---|
| template | `loops/evals/*.json`（何を測るか） |
| config | Loop goal / 完成宣言 / evaluator 結果（何に当てるか） |
| run | `pnpm run loop:evaluator` など |
| score | `pass` / `warn` / `stop` + 欠落 criteria |

## 使い方

```bash
# 単体
pnpm run test:eval-template

# evaluator が完成宣言があるとき、goal に応じた template を採点して報告に載せる
pnpm run loop:evaluator -- --json
```

## ルール

- 1 template = 1 goal（または 1 完成ゲート）
- criteria は「自己申告」ではなく、既存パーサが取れる信号に紐づける
- UI Polish の必須 criteria には `observe-evidence` と `chrome-compare`（ページ枠照合）と `borrow-inventory`（参照の正体・対象枠・借りてよい/借りない）と `observe-edge`（端の開閉。無しなら「なし（端の開閉なし）」）を含める
- 新しい測り方を増やすときは、先にテスト期待値の根拠（goals / MEMORY）を書く
- Future AGI クラウドや `ai-evaluation` SDK への依存は禁止
