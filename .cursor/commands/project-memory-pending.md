---
description: 未反映の PROJECT_MEMORY 追記候補を state から読み、一括再提示する
globs:
alwaysApply: false
---

# PROJECT_MEMORY 未反映候補の一括再提示

## ゴール

`state/memory-candidates.json` の pending を読み、チャットに一括再提示して `/project-memory-learn` を促す。

会話ログを自動解析しない。差分由来候補と `memory:candidates --add` で登録したチャット候補の両方を対象にする。

## 手順

1. `pnpm run memory:candidates` を実行する（または `--json`）。
2. `status === pending` の候補を `memory-learning.mdc` の提案フォーマットで一括提示する。
3. ユーザーに反映なら `/project-memory-learn`、不要なら `pnpm run memory:candidates -- --dismiss <id>` を案内する。
4. `PROJECT_MEMORY.md` は編集しない（このコマンド単体では learn しない）。

## 出力

```markdown
## 未反映の PROJECT_MEMORY 追記候補（state）

pending: N 件

### 追記候補
#### 1. `分類` — id
- 事象: ...
- 今後の対応: ...
- 関連: ...

### 反映方法
`/project-memory-learn` を呼び出してください。
不要な id は `pnpm run memory:candidates -- --dismiss <id>`。
```
