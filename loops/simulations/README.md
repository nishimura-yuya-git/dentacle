# Harness Simulations（敵対シナリオ）

Future AGI の Simulate（persona × scenario × 採点）思想だけを借りています。  
本番 LLM エージェントの会話シミュレーションではなく、**コーディングハーネス自体を殴る回帰**です。

## モデル

| 要素 | 本ハーネスでの実体 |
|---|---|
| persona | 悪い振る舞いをするエージェント像（契約スキップ等） |
| scenario | `adversarial-scenarios.json` の1件 |
| score | PreToolUse ガード / Claim Grounding / failure taxonomy の期待値 |

`action.type: "claim-grounding"` のシナリオは編集ガードではなく、完成宣言の観察証拠欠落などを殴る。

## 実行

```bash
pnpm run test:harness-simulation
```

## 入れないもの

- Future AGI Simulate SDK
- Voice / multi-turn 顧客シミュレーション
- LLM でシナリオを自動生成して期待値を揺らすこと
