---
description: コピー先で強化したベースハーネスを、保存済みの雛形パスへ戻す
globs:
alwaysApply: false
---

# 雛形ハーネス還元コマンド

## ゴール

コピー先で直した **ベースハーネス** だけを、保存済みの雛形へ戻す。
雛形への書き込みは、ユーザーがこのコマンドを呼んだときだけ行う。

```text
/harness-up
```

```text
/harness-up
今回のハーネス強化を雛形に戻して
```

通常会話の「覚えて」「雛形にも入れて」だけでは実行した扱いにしない。
その場合は差分を出し、`/harness-up` を促す。

## 雛形パス

正: `/Users/yuya/JOB/仕事関係/workspace/取引先HP/雛形/hp_model_cursor`

保存先: `.cursor/template-upstream.json`

- 未保存なら、上記パスを確認してから `pnpm run harness:up -- --set-path` で保存する
- パスなしでは戻さない

## 実行前に読むもの

1. `.cursor/template-upstream.json`
2. `scripts/lib/template-upstream-policy.mjs`
3. `state/template-upstream-candidates.json`（あれば）

## 戻してよいもの

rules / commands / skills / hooks / ハーネス scripts / loops / `src/templates/` / `docs/agent-loop-harness.md` / 出荷時 feedback

## 戻してはいけないもの

- `PROJECT_MEMORY.md`
- 案件画面（`src/pages/` / `src/components/`）
- `supabase/` / `api/` / `.env` / `state/`
- `.cursor/hard-boundaries.json`
- 案件固有の feedback 回数メモ
- 雛形側の git commit / push

判断に迷うファイルは戻さず、確認する。

## 手順

### STEP 1: パスを確認する

```bash
pnpm run harness:up -- --status
```

未設定なら保存する。

```bash
pnpm run harness:up -- --set-path "/Users/yuya/JOB/仕事関係/workspace/取引先HP/雛形/hp_model_cursor"
```

今いる場所が雛形本人なら、戻さず報告して終わる。

### STEP 2: 対象を出す

候補と git 差分から、戻すファイルを列挙する。
案件固有なら除外する。

```markdown
## 雛形へ戻す対象

- 雛形: `...`
- 戻す: `path` ...
- 戻さない: `path`（理由）
```

### STEP 3: 戻す

ユーザーがこのコマンドを呼んでいる場合に限り実行する。

```bash
pnpm run harness:up -- --apply
```

一部だけなら `--files path1 path2` を付ける。

### STEP 4: 報告する

```markdown
## /harness-up 完了

### 雛形
- `...`

### 戻したファイル
- ...

### 戻さなかったファイル
- なし / ...
```

雛形リポジトリでの commit はしない。必要ならユーザーが雛形側で行う。

## 禁止

- このコマンドなしに雛形へ書くこと
- 案件画面・MEMORY・秘密情報を戻すこと
- 雛形を自動 commit / push すること
- パス未保存のまま apply すること
