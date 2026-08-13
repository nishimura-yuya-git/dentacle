---
description: 画面・フローの横断UIレビュー（quick/full）。Findings と Verdict を出し、既定は read-only
---

# better-interface

UIを領域横断でレビューする。実装は、ユーザーが明示したときだけ行う。

## 手順

1. `.cursor/skills/better-interface/SKILL.md` を読む
2. 必要なら `.cursor/skills/better-ui/SKILL.md` と `surfaces.md` を読む
3. 正本として `.cursor/rules/ui-design.mdc` / `ui-language.mdc`（HP/LPなら `ui-design-hp-lp.mdc`）を確認する
4. モードを決める（未指定なら `full`）
   - `quick` — 主経路のみ。HIGH/MEDIUM、上限5
   - `full` — empty/loading/error/狭幅含む。上限15
5. スコープ（画面・フロー・ファイル）を出力に明記する
6. ドメイン順で検査する: Accessibility → Layout → Writing → Typography → Colors → UI polish
7. **Review Output Format**（Scope and Coverage / Findings / Considered but Rejected / Verification / Verdict）で報告する
8. ソース編集は、実装も依頼された場合のみ。そのときは変更契約と Hard Boundary を守る

## 呼び出し例

```text
/better-interface
/better-interface quick
/better-interface full チェックアウトフロー
```

## UI Polish Loop から使う場合

判定ノード（実装後・完成宣言前）でこのコマンド相当のレビューを回し、完成宣言に次を含める:

```text
- Interface Review: quick|full / Block|Needs changes|Approve
- Findings: HIGH n / MEDIUM n / LOW n
```

`Block` のときは完成報告禁止で生成ノードへ差し戻す。

FAB・オーバーレイ・アプリ内チャットでは、見出し重複・説明重複・主ボタン階層・モバイルでのFAB衝突を Layout 必須検査にする。観察で阻害を書いたまま Approve しない。
