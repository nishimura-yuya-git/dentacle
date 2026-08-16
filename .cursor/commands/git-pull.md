---
description: >-
  origin/main を取り込み、コンフリクトが起きたら解消する。
  「git pullして」「origin mainを取り込んで」「最新をpullして」
  「コンフリクト起きたら対処して」「mainを取り込んで」と言われたときに使う。
globs:
alwaysApply: false
---

# Git Pull origin main（コンフリクト対処つき）

呼び出し名は **`/git-pull`**。`/git-push` とは対。こちらは取り込み専用で、コミットも push もしない。

```text
/git-pull
git pullして
origin mainを取り込んで
コンフリクト起きたら対処して
```

## ゴール

- 現在ブランチへ `origin/main` を取り込む。
- コンフリクトが起きたら、両側の意図を読んで解消する。
- ローカルの未コミット作業は捨てない。
- 結果を短く報告する。

## 🚨 絶対禁止事項

- **`--force` / `--force-with-lease` による force push は禁止**
- **`git reset --hard` / `git checkout --` / `git clean -fd` で作業を捨てるのは禁止**
- **`--no-verify` によるフック無効化は禁止**
- **`git config` の変更は禁止**
- **コンフリクト全体を `--ours` / `--theirs` で一括採用するのは禁止**
- **このコマンド単体では commit / push しない**（マージ完了に必要な merge commit だけ例外）
- **`.env` や認証情報をコミットしない**

---

## 実行手順

### STEP 1: 現在の状態を確認

```bash
git status
git branch -vv
git log --oneline -5
```

確認すること:

- 今いるブランチ（`main` 以外でも `git pull origin main` してよい）
- 未コミットの変更・未追跡ファイル
- すでにマージ／リベースの途中でないか

マージやリベースの途中なら、新規 pull せず、その状態の解消だけ行う。

---

### STEP 2: origin/main を取り込む

未コミット変更があっても、まずそのまま取り込む。前回どおり fast-forward でき、作業ツリーが残るならそれが正。

```bash
git pull origin main
```

- 成功（fast-forward / already up to date / マージ成功）→ STEP 5 へ
- ローカル変更が邪魔して pull できない → STEP 3
- コンフリクト → STEP 4

---

### STEP 3: 作業ツリーが pull を阻むとき

捨てずに退避する。

```bash
git stash push -u -m "git-pull-command-temp"
git pull origin main
```

pull 後:

```bash
git stash pop
```

- `stash pop` でコンフリクトしたら STEP 4
- stash を `drop` して消さない。pop 失敗時は stash 一覧を残し、報告する

---

### STEP 4: コンフリクト対処

```bash
git status
git diff --name-only --diff-filter=U
```

#### ここで止めるファイル（勝手に解消しない）

次のいずれかがコンフリクトしたら、手を止めてユーザーに確認する。

- `PROJECT_MEMORY.md`（AI の自動編集禁止）
- `supabase/migrations/**`
- `api/**` / `supabase/functions/**`
- `package.json` の dependencies
- `vercel.json` / `vite.config.ts` / `tsconfig*.json`
- `.cursor/rules/**`
- `docs/architecture/*.mmd` など業務フロー正本

止めたときは、コンフリクトファイル一覧と「どちらを残すべきか」だけ聞いて、未解消のまま放置しない旨を伝える。

#### それ以外の解消方針

1. コンフリクトファイルを Read し、`<<<<<<<` / `=======` / `>>>>>>>` の両側を読む
2. 両側の意図を残す。片方を黙って捨てない
3. 同じ計算・判定の二重実装を作らない（既存 SSoT を優先）
4. マーカーを残さない
5. 解消したファイルだけ `git add`

```bash
git add <解消したファイル>
```

マージ進行中で、止めるファイルが無く、解消が終わったら merge commit だけ作る。

```bash
git commit -m "$(cat <<'EOF'
origin/main を取り込み、コンフリクトを解消する
EOF
)"
```

リベース進行中なら `git rebase --continue`。`--skip` や `--abort` はユーザー確認なしで使わない。

---

### STEP 5: 完了確認と報告

```bash
git status
git log --oneline -5
```

未コミットの作業が pull 前からあったなら、残っていることを確認する。

報告フォーマット:

```markdown
## origin/main の取り込み結果

- ブランチ: `<branch>`
- 結果: fast-forward / already up to date / マージ成功 / コンフリクト解消済み / 停止（確認待ち）
- 取り込み範囲: `<old>` → `<new>`（なければなし）
- コンフリクト: なし / 解消したファイル / 停止したファイル
- ローカル未コミット: 維持 / stash 残 / なし
- 次: なし / ユーザー確認（ファイル名）
```

commit も push もしない。続けてコードを載せる場合は `/git-push`。製品版を出す場合は `/release`。

---

## ⚠️ 注意事項

- 今いるブランチが `main` でなくても、取り込む先は **`origin/main`** で固定する
- ローカルの WIP（ご意見パネル、未追跡ファイルなど）を消して pull を通してはならない
- Hard Boundary や `PROJECT_MEMORY.md` のコンフリクトは「直したつもり」で完了にしない
- 取り込み後にアプリのテストは必須ではない。コンフリクト解消で `src/` を触ったときだけ、関連テストまたは `pnpm run test:changed` を勧める
