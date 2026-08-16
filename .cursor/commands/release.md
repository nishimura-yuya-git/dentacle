---
description: >-
  製品版を公開する。CHANGELOG を前回タグ以降のコミットから書き、版を上げてタグを push する。
  「公開して」「リリースして」「バージョン上げて」「製品版を出して」
  「v0.2.0 を出して」と言われたときに使う。
globs:
alwaysApply: false
---

# 製品版の公開（`/release`）

呼び出し名は **`/release`**。`/git-push` とは対。こちらは **製品版を出すときだけ** 使う。

```text
/release
公開して
リリースして
バージョン上げて
製品版を出して
```

日常の「コミットして main に上げて」は `/git-push`。そこで版は上げない。

## ゴール

- `CHANGELOG.md` の未公開を、前回の製品版タグ以降のコミットから自動で書く。
- `package.json` / `APP_VERSION` / `CHANGELOG` を同じ SemVer に揃える。
- **main 上**で annotated タグ `vX.Y.Z` を打ち、push する。
- GitHub Actions が GitHub Release を作る。

院向けお知らせ（`update #N`）や `product_updates.version` は触らない。院への掲載は別判断（§6.55）。

## 🚨 絶対禁止事項

- **`--force` / `--force-with-lease` による force push は禁止**
- **`--no-verify` によるフック無効化は禁止**
- **`git config` の変更は禁止**
- **機能ブランチへ製品版タグを打つのは禁止**（squash 後に位置がずれる）
- **コミットごと・PR ごとに版を上げるのは禁止**
- **院向け画面に SemVer を出すのは禁止**
- **お知らせの通し番号や DB の楽観ロック `version` を製品版にしない**

---

## 上げる単位

ユーザーが `patch` / `minor` / `major` または `v0.2.0` を言ったらそれを正とする。
言われなければ、下書きを見て決める。破壊的変更は確認してから major。

| 単位 | 例 | 使うとき |
|---|---|---|
| patch | `0.1.0` → `0.1.1` | バグ修正だけ |
| minor | `0.1.0` → `0.2.0` | 後方互換の機能追加 |
| major | `0.20.0` → `1.0.0` | 互換を壊す変更、または正式運用開始 |

---

## 実行手順

### STEP 1: 作業ツリーを確認する

```bash
git status
git branch --show-current
```

未コミットの実装が残っていたら、先に `/git-push` で main へ載せる。公開コマンドで実装差分を版上げコミットに混ぜない。

---

### STEP 2: main を最新にする

```bash
git checkout main
git pull origin main
```

コンフリクトしたら `/git-pull` の手順で止める。Hard Boundary は勝手に解消しない。

---

### STEP 3: 初回タグか、次の版かを分ける

```bash
git tag -l 'v*.*.*'
pnpm run version:check
```

**製品版タグがまだ無い**（最初の `v0.1.0`）:

```bash
pnpm run version:check
pnpm run release -- tag --push
```

`bump` しない。`CHANGELOG.md` の既存節が Release 本文になる。STEP 7 へ。

**タグがある** → STEP 4。

---

### STEP 4: CHANGELOG の未公開を自動で書く

```bash
pnpm run release -- draft
```

- 前回タグ以降のコミット件名から「追加 / 変更 / 修正 / 削除」を書く。
- マージコミットは入れない。
- 未公開に既にメモがあるときは上書きしない。そのメモを正として STEP 5 へ。
- 下書きの日本語を読み、ノイズや内部用語を直してよい。院向けお知らせの文面にはしない。

`suggested-bump` が出たら、ユーザー指定が無いときの目安にする。

---

### STEP 5: 版を上げる

```bash
pnpm run release -- bump patch
# または bump minor / bump major
```

`package.json` / `src/config/appVersion.ts` / `CHANGELOG.md` だけが変わる。差分を Read してからコミットする。

```bash
git add package.json src/config/appVersion.ts CHANGELOG.md
git commit -m "$(cat <<'EOF'
製品版を vX.Y.Z にする

CHANGELOG の未公開をこの版の節へ移す。
EOF
)"
git push origin main
```

---

### STEP 6: 揃えてからタグを打つ

```bash
pnpm run version:check
pnpm run release -- tag --push
```

main 以外、または作業ツリーが汚いときは止まる。`--allow-branch` / `--allow-dirty` は常用しない。

---

### STEP 7: 完了報告

```markdown
## 製品版の公開結果

- 版: `vX.Y.Z`（patch / minor / major）
- 前回タグ: `vA.B.C` / なし（初回）
- CHANGELOG: draft から作成 / 既存の未公開を使用
- タグ push: 成功 / 失敗
- GitHub Release: workflow 待ち / 作成済み
- 院向けお知らせ: 未掲載（入れる判断は別）
```

---

## ⚠️ 注意事項

- 正本は Git タグ。`package.json` と `APP_VERSION` はタグに合わせる。
- `/git-push` のあとに「公開もして」と言われたら、このコマンドへ切り替える。
- 詳細は `docs/release.md`。
