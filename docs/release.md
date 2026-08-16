# 製品版の出し方

Dentacle の製品版は SemVer（`MAJOR.MINOR.PATCH`）です。正本は Git の annotated タグ `vX.Y.Z` です。

院向けお知らせ（`update #N`）や、`product_updates.version`（楽観ロック）とは混ぜません。
コードを main に載せただけでは版は上がりません。本番に出したまとまりごとに上げます。

## 番号の上げ方

| 上げる単位 | 例 | 使うとき |
|---|---|---|
| patch | `0.1.0` → `0.1.1` | バグ修正だけ |
| minor | `0.1.0` → `0.2.0` | 後方互換の機能追加 |
| major | `0.20.0` → `1.0.0` | 互換を壊す変更、または正式運用開始 |

`0.x` は正式版前です。`PROJECT_MEMORY.md` の v0 Must（§6.19）は機能範囲の話で、タグ番号とは別です。

## 毎回の手順

1. `CHANGELOG.md` の「未公開」に、開発者向けの変更を日本語で書く。
2. main にマージする（またはマージ直前の main で作業する）。
3. 版を上げる。

```bash
pnpm run release -- bump patch
# または bump minor / bump major
```

4. `package.json` / `src/config/appVersion.ts` / `CHANGELOG.md` の差分を確認してコミットする。
5. 揃っているか確認する。

```bash
pnpm run version:check
```

6. **main 上**でタグを打ち、push する。

```bash
pnpm run release -- tag --push
```

7. タグ `v*` の push を受けて、GitHub Actions が GitHub Release を作る。
   本文は `CHANGELOG.md` の該当節です。

作業ツリーが汚いとき、または main 以外では `tag` は止まります。
どうしても打つときだけ `--allow-dirty` / `--allow-branch` を足します。常用しません。

## 最初の版 `v0.1.0`

このリポジトリに製品版を入れた最初のコミットです。
`v0.1.0` のタグは **main へマージしたあと** に打ってください。

```bash
git checkout main
git pull origin main
pnpm run version:check
pnpm run release -- tag --push
```

機能ブランチへ先に打つと、squash マージ後にタグ位置がずれます。

## 触らないもの

- お知らせ画面の `update #N`
- `product_updates.version`（行の楽観ロック）
- 院向け画面への SemVer 表示
- コミットごと・PR ごとの自動バンプ
