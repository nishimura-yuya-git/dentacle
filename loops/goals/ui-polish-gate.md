# UI Polish Hard Gate

Context Budget でこのファイルを must として残す。長い `ui-polish.md` の後半（Observe / 完成条件）は窓から落ちる前提。

## 完成禁止（機械ゲート）

次は完成・「寄せた」申告を無効にする。Claim Grounding は `observe-chrome` で stop する。

1. 内側パネルだけのスクショしかない
2. 完成宣言に `ページ枠照合` が無い
3. 見本が専用ページ枠なのに、業務 `DashboardLayout`（サイドバー・クリニック名ピル・ご意見 FAB 等）で包んだまま
4. キャプチャを Read せずに見た目OKと書く

## 画面種別（三択）

- 業務UI: ダッシュボード枠が正。`ui-design.mdc`
- HP/LP: `ui-design-hp-lp.mdc`
- 文書シェル: 見本が専用ページ枠。対象画面だけ業務枠を外してよい

## Iteration 0

ページ枠（chrome）→ 面 → タイポ → 主ボタン → 余白

## 必須抽出

- 見本が持つ枠: 左レール / 専用ヘッダー / フッター / なし
- 見本が持たない枠（negative inventory）: 業務サイドバー、FAB、ピル 等

## 観察ペア

見本キャプチャ **and** 実装キャプチャ（ページ全体）。内側切り出しだけでは観察として数えない。

```text
- ページ枠照合:
  - 見本: `path` または なし（指示のみ）
  - 実装: `path`
  - 差分: sidebar / header / FAB / footer / rail を1行以上
  - Read済み: はい
```

## Stop の分割

- 確認停止: 他画面の導線・グローバルナビを変える必要がある
- 差し戻し（完成禁止）: 対象画面のラッピングが見本と違う
