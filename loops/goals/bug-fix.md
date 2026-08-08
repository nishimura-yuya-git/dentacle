# Bug Fix Loop

## Goal

お客さんからの問題文を一次情報として受け取り、原因調査、修正、検証、報告まで進める。

「修正した」と自己申告しただけでは完成にしない。判定ノード（`loop:evaluator` + Regression Guard）が `pass`（または説明可能な `warn`）になるまで完成扱いにしない。

## Input

ユーザーは以下の粒度で貼ってよい。

```text
Bug Fix Loopで進めて。

お客さんからの指摘:
（問題文をそのまま貼る）
```

分かる場合は、対象画面、期待する動作、実際の動作、発生条件、画像、ログを追加する。

## Graph（Sequential + 差し戻し）

外側の遷移はあらかじめ決める。内側の調査・修正手順だけ AI が判断する。

```text
① 問題文読取・根拠整理
  ↓
② 変更契約（必要時）
  ↓
③ 生成ノード（再現手順/テスト → 最小修正）
  ↓
④ 判定ノード（loop:evaluate / loop:evaluator + Regression Guard）
  ├─ pass（または説明可能な warn）→ ⑤ 完成宣言 → 終了
  ├─ 差し戻し（再修正可能）→ ③ へ戻す（iteration +1）
  └─ stop / 上限到達 / 業務判断 → 人間確認（上司）で停止
```

図版: `loops/graphs/bug-fix.mmd`

| ノード | 役割 | 相当 |
|---|---|---|
| ①② | 入口・契約 | Sequential 前段 |
| ③ | 実装・調査 | 生成役（Loop 内側） |
| ④ | 完成ゲート | 評価役 / Callee の validator |
| ⑤ | 完成宣言 | escalate / LOOP_COMPLETE 相当 |
| 人間確認 | 上司確認 | Stop |

## maxIterations

- 生成ノード ③ → 判定ノード ④ の往復は **最大 3 回**（`maxIterations: 3`）。
- 1 回の「往復」= 再修正を入れたうえで Evaluation を再実行した回数。
- 3 回で完成条件を満たせない、または同じ失敗が 2 回続く場合は自動続行せず人間確認へ回す（`onExhausted: fail`）。
- 同じ失敗の機械検知は `pnpm run loop:evaluator` の No progress（`state/loop-progress.json`）が担う。
- 回数は報告の「完成宣言」に明記する。機械カウントが無い場合も、エージェントが自己申告で省略しない。

## 完成条件（チェックリスト）

すべて満たしたときだけ完成扱いにできる。

1. 問題文を一次情報として残し、期待値の根拠（ユーザー報告 / 実画面 / DB / `PROJECT_MEMORY.md` / 既存仕様）がある。
2. 再現条件、影響画面、関係する DB/API/SSoT を整理している。
3. 修正前に再現テストまたは再現手順がある（不可能なら理由を明記）。
4. 修正範囲が最小で、変更契約・Hard Boundary ルールに違反していない。
5. Regression Guard を実行し、`pass` または説明可能な `warn` である。
6. `pnpm run loop:evaluate` / `loop:evaluator` が `stop` ではない（`warn` は根拠を Evidence Map に残す）。
7. 未検証項目がある場合、理由と次の確認方法を報告している。

## Required Steps

1. 問題文をそのまま一次情報として読む。
2. `PROJECT_MEMORY.md` と `.cursor/rules/` に照らして、既存仕様と矛盾しないか確認する。
3. 再現条件、影響画面、関係するDB/API/SSoTを整理する。
4. 期待値の根拠を明確にする。根拠がなければ推測でテストを書かない。
5. 修正前に、可能なら再現テストまたは再現手順を作る。
6. 最小範囲で修正する。
7. 判定ノードを実行する（`pnpm run loop:bugfix` または `loop:evaluate` + `loop:evaluator`、続けて Regression Guard）。
8. 判定結果に応じて分岐する:
   - **pass / 説明可能な warn** → 完成宣言を出して終了。
   - **差し戻し** → 完成報告を出さず ③ へ戻る（iteration を加算）。
   - **stop / 上限到達** → 人間確認へ回す。
9. 原因、修正内容、検証結果、残リスク、完成宣言を報告する。

## 差し戻し条件

以下のときは完成報告を禁止し、生成ノードへ差し戻す（iteration が残っている場合）。

- `loop:evaluator` または `loop:evaluate` が `stop`。
- Regression Guard が `stop`、または必須チェック失敗。
- 完成条件チェックリストのいずれかを満たしていない。
- 期待値根拠のないテスト変更が混入している。
- 「直した」と書いたが、再現手順または検証コマンドの結果が示されていない。

差し戻し時は、失敗した完成条件番号と、次に直す最小アクションを1〜3個だけ書く。

## Stop

以下の場合は自動修正を止め、人間確認へ回す（差し戻しループに入れない）。

- 期待値の根拠が不明。
- DB/RLS/業務コアなどの業務判断が必要。
- `supabase/migrations/**`、`api/**`、SSoT、業務コアを変更する必要があるが、変更契約が未整理。
- テスト期待値を変更しないと通らない。
- 再現できず、ログや画面証拠も不足している。
- `maxIterations`（3）に到達した。
- 同じ失敗が 2 回続いた。

## 完成宣言（必須）

完成報告の末尾に、次を必ず含める。自己申告の「完了しました」だけの報告は無効。

```markdown
## 完成宣言（Bug Fix Loop）

- iteration: N / 3
- 完成条件: 1□ 2□ 3□ 4□ 5□ 6□ 7□（満たした番号を明示）
- Evaluation:
  - コマンド: …
  - 結果: pass / warn / stop
  - warn の根拠: …（warn 時のみ）
- Regression Guard: pass / warn / stop
- 未検証: …（なければ「なし」）
- Stop非該当の根拠: …
- 根拠リンク: `path/to/file` または PROJECT_MEMORY.md §x.x（必須）
- Working Graph: 追加した Entity / Relation の要約（なければ「なし」）
```

`LOOP_COMPLETE` 相当はこの完成宣言とする。宣言なし、またはチェック欠落は未完成。

完成報告時は宣言本文を `state/completion-declaration.md` に書き、`pnpm run loop:evaluator` の Claim Grounding を通す（ファイルが無い場合は grounding は skip）。

問題文整理のあと、関係する画面・API・テーブル・症状は Working Graph に残してよい。

```bash
pnpm run working-graph -- upsert-entity --type=SCREEN --name=対象画面 --description=症状の要約
pnpm run working-graph -- upsert-entity --type=SYMPTOM --name=表示ズレ
pnpm run working-graph -- add-relation --source=SCREEN:... --predicate=reported_in --target=SYMPTOM:...
```

自動 NER はしない。エージェントが整理した分だけ書く。

## Output

- 原因
- 修正内容
- Evidence Map
- 実行した検証
- 未検証項目と理由
- 次に人間が確認すべきこと
- **完成宣言（上記フォーマット）**
