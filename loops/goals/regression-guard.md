# Regression Guard Loop

## Goal

修正が目的の問題を解消していること、かつ既存の重要仕様を壊していないことを確認する。

「直ったはず」「テストも見た」という自己申告だけでは通過にしない。判定ノード（`loop:evaluate` / `loop:evaluator` + 推奨検証）が `pass`（または説明可能な `warn`）になるまで完成扱いにしない。

## Context

- 変更ファイル
- `pnpm run doctor`
- `pnpm run test:changed`
- 近接テスト
- `src/__invariants__`（存在する場合）
- 関連E2E
- 必要なスクリーンショットまたは手動確認結果
- `loop:context`（goal に応じた Context Budget）

## Graph（判定特化 + 検証補充）

外側の遷移はあらかじめ決める。不足検証の補充だけ AI が判断する。

```text
① 変更面の把握（推奨コマンド収集）
  ↓
② 判定ノード（loop:run / evaluate / evaluator + test:changed）
  ├─ 不足あり → ③ 検証補充 → ② へ戻す（iteration +1）
  ├─ pass（または説明可能な warn）→ ④ 回帰ガード通過宣言 → 終了
  └─ stop / 上限到達 / No progress / 期待値改変 → 人間確認で停止
```

図版: `loops/graphs/regression-guard.mmd`

| ノード | 役割 | 相当 |
|---|---|---|
| ① | 入口 | Sequential 前段 |
| ② | 完成ゲート | 評価役 |
| ③ | 検証補充 | 生成役（Loop 内側） |
| ④ | 通過宣言 | LOOP_COMPLETE 相当 |
| 人間確認 | 停止 | Stop |

## maxIterations

- 判定ノード ② → 検証補充 ③ の往復は **最大 2 回**（`maxIterations: 2`）。
- 2 回で通過条件を満たせない、または同じ失敗が 2 回続く（No progress）場合は自動続行せず人間確認へ回す。

## Required Checks

標準チェックは以下。

```bash
pnpm run loop:run
pnpm run test:changed
pnpm run loop:evaluate
pnpm run loop:evaluator
```

業務コアを触った場合は以下を追加する。`src/__invariants__` が存在しない案件では、不変条件テストの実行は省略理由を報告する。

```bash
pnpm run check:provenance
pnpm exec vitest run src/__invariants__
```

`api/`・`supabase/` などセキュリティ境界を触った場合は、自前セキュリティ差分スキャンを実行する。

```bash
pnpm run security:scan -- --working-tree
```

UIを触った場合は以下を検討する。

```bash
pnpm run type-check
pnpm run test:e2e -- --list
```

## Pass

以下を満たす場合、回帰ガードは通過扱いにできる。

- Main Doctor Loop が `pass` または説明可能な `warn`。
- 変更面に対応するテストまたは手動確認がある。
- Hard Boundary に触れた場合、Evidence Map と承認理由がある。
- テスト期待値をAI都合で変えていない。
- `loop:evaluator` が `stop` ではない（No progress 含む）。

## 差し戻し条件

以下のときは通過宣言を禁止し、検証補充ノードへ差し戻す（iteration が残っている場合）。

- 推奨検証が未実行で、省略理由もない。
- `loop:evaluate` / `loop:evaluator` が `stop`。
- 変更面に対応する確認が不足している。

## Stop

以下の場合は停止する。

- `doctor` の必須チェック失敗。
- 不変条件テスト失敗。
- Hard Boundary 変更の説明不足。
- 期待値根拠がない。
- 修正対象外の画面・計算・DB挙動が変わった可能性がある。
- `maxIterations`（2）に到達した。
- No progress（同じ失敗シグネチャが 2 回連続）。

## 通過宣言（必須）

```markdown
## 回帰ガード通過宣言

- iteration: N / 2
- Evaluation:
  - コマンド: …
  - 結果: pass / warn / stop
- 実行した検証: …
- 省略した検証と理由: …
- 残リスク: …
- Stop非該当の根拠: …
- 根拠リンク: `path/to/file` または PROJECT_MEMORY.md §x.x（必須）
```

通過報告時は宣言本文を `state/completion-declaration.md` に書き、`pnpm run loop:evaluator` の Claim Grounding を通す。

## Output

- pass / warn / stop
- 実行した検証
- 省略した検証と理由
- 残リスク
- 次の確認ポイント
- 通過宣言（通過時）
