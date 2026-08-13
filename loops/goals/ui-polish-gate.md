# UI Polish Hard Gate

Context Budget でこのファイルを must として残す。長い `ui-polish.md` の後半は窓から落ちる前提。

## 完成禁止（機械ゲート）

次は完成・「寄せた」申告を無効にする。Claim Grounding は欠落コードで stop する。

1. 内側パネルだけのスクショしかない → `observe-chrome`
2. 完成宣言に `ページ枠照合` が無い → `observe-chrome`
3. 見本が専用ページ枠なのに、業務 `DashboardLayout`（サイドバー・クリニック名ピル・ご意見 FAB 等）で包んだまま → 差し戻し
4. キャプチャを Read せずに見た目OKと書く → `observe-evidence`
5. `骨格照合`（借りる / 借りない）が無い → `observe-borrow`
6. 見本が `http(s)` URL なのに見本が「なし」または URL のまま → `observe-reference-shot`

## 画面種別（三択）

- 業務UI: ダッシュボード枠が正。`ui-design.mdc`
- HP/LP: `ui-design-hp-lp.mdc`
- 文書シェル: 見本が専用ページ枠。対象画面だけ業務枠を外してよい。定型は `ui-polish.md`

## Iteration 0

ページ枠（chrome）→ 骨格照合 → 面 → タイポ → 主ボタン → 余白

## 必須抽出

- 見本が持つ枠: 左レール / 専用ヘッダー / フッター / なし
- 見本が持たない枠（negative inventory）: 業務サイドバー、FAB、ピル 等
- 借りる: 枠・並び・余白哲学
- 借りない: 色・フォント・3D・製品CTA・事実（OAuth / Stripe 等）。正は案件（緑 `#008C01` / Zen Maru / 日本語）

## 観察ペア

見本キャプチャ **and** 実装キャプチャ（ページ全体）。内側切り出しは数えない。
見本が `https?://` ならそのページを開き、ページ全体スクショを見本にする。URL文字列や「なし（指示のみ）」は不可。

```text
- ページ枠照合:
  - 見本: `path`（ライブURLのときはスクショ必須。URL文字列は不可）
  - 実装: `path`
  - 差分: sidebar / header / FAB / footer / rail を1行以上
  - Read済み: はい
- 骨格照合:
  - 見本URL: `https://...` または なし（添付画像） / なし（指示のみ）
  - 借りる: （枠・並び・余白）
  - 借りない: （色・フォント・事実）
  - Read済み: はい
```

## Stop の分割

- 確認停止: 他画面の導線・グローバルナビを変える必要がある
- 差し戻し（完成禁止）: 対象画面のラッピングが見本と違う
