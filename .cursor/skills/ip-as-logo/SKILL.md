---
name: ip-as-logo
description: >-
  単純化した擬人IPマスコットを正方形ロゴにする。ロゴが先、キャラは二の次。
  丸い太い形、IP色2 + 背景1、ごく薄い連続グラデ。動物・人・ゴースト・物も可。
  Triggers on IPロゴ, マスコットロゴ, ip-as-logo, /ip-as-logo。
---

# IP as Logo

ロゴとして `32 × 32` で読める記号にする。キャライラストや似顔絵は出さない。

出典: [s1dashu/ip-as-logo-skill](https://github.com/s1dashu/ip-as-logo-skill)（MIT）。本プロジェクト向けに手順を日本語化し、選定は人間、公式ロゴ差し替えは禁止にしている。生成制約は出典に戻す。

チャット報告は日本語。画像プロンプトは下の英語骨格を使う。

## いつ使うか

- ユーザーが `/ip-as-logo` または IP / マスコットロゴ生成を依頼したとき
- 動物、人、ゴースト、ロボット、植物、物を正方形ロゴに落とすとき

選定・採用は人間。このスキルは候補を出すだけ。

## ワークフロー

1. 依頼から題材と色の指定を読む。色数の質問は、ユーザーが色を制御したいと言ったときだけする。既定は常に3意味色（IP2 + 背景1）。
2. 題材が無く、このリポジトリで動いているときは、読むだけにする。`PROJECT_MEMORY.md`、対外名、ランディング、デザイントークン。製品の目的・利用者・気配が分かれば十分。
3. 足りないときだけ、何の製品か / 誰向けか / どんな気配かを1回まとめて聞く。2回目の質問はしない。
4. 十分な文脈が取れたら、生成前に3方向を短く出し、6独立画像を提案する。同意があるまで生成しない。ただし今回の依頼が6案や「作って」を明示していれば進めてよい。
5. 3方向の出し方:
   - 題材が1つなら、その題材のまま構図・シルエット・第2色の置き場・性格の強調で3処理にする。
   - 題材が無ければ、製品の別属性に紐づく別題材を3つ出す。根拠のない動物3匹は禁止。
   - ユーザーが役を列挙したら（例: 祖父母・大人・子供）、その役を優先する。無理に3方向へ畳まない。
6. 返答の読み方:
   - 3方向と6案を受け入れた → 方向ごと2案。`A1` `A2` `B1` `B2` `C1` `C2`
   - 1方向を選んで6案 → その方向の6変種。`A1`〜`A6`
   - 人数・配分をユーザーが指定したら、それを優先する
7. 既定は3意味色。2色ロゴは明示指定のときだけ。2色のときは顔を背景の抜きにする。第3色を足さない。
8. 生成経路を先に確認する。この環境では画像生成ツール（GenerateImage 等）を使う。無ければ生成した体にしない。`npx` / `npm` / `yarn` でスキルを入れ直さない。
9. 並列生成してよい。各呼び出しは1枚の正方形。6ロゴのコンタクトシートは禁止。既存ロゴや兄弟案を image reference にしない。
10. 却下ルールで全枚を点検する。実用なら指摘箇所だけ1回直す。後処理で黙って直さない。
11. ラベル、方向と理由、保存パス、色対応、寸法、不透明、残逸脱を報告する。当選は決めない。どの案を詰めるかは人間に任せる。

方向の1行は `ラベル — 題材 — 理由`。発見を長いブランディング会議にしない。

## この案件での禁止

- 候補から公式ロゴを自己決定すること
- `BrandLogo` / `public/icon/logo.png` / `src/config/appName.ts` を触ること
- ユーザーが保存先を指定する前に、生成画像をリポジトリへ入れること
- 出典の見本壁や前回案を参照画像にすること

## 複雑さの上限

- 外シルエットは基本形 6〜10 個で1本の連続形にする
- 種の定義は1つまで（大きな bun、U字ヘア、丸いおさげ1対、丸い耳1対など）
- 内部色面は2つまで。顔は目2と口1。眉、鼻、肌のハイライト、しわ、ほくろは原則なし
- 頭または上半身のクロップ。全身、衣装、機械、物語は描かない
- 毛並み、鱗、ボタン、ネジ、文字、ラベルを足さない
- 黒いシルエットでも `32 × 32` で種が分かること

人型も可。年齢・性別は髪型の大きな塊だけで区別する。細いメガネ、ひげの線、しわ、リボン、服のボタンは禁止。

## 形と構図

- 太く丸い輪郭。鋭角、尖った耳や嘴、針のような尻尾、細い触角、細い笑顔、狭い隙間、炎や羽の先端は禁止。必要な先端は太い丸で終える
- 対の識別（耳、角、おさげ、横髪）は両方出す。片方を切らない
- 左下または右下から出し、キャンバスの 75〜85% を埋める。下や横の切り取りは意図。対の識別は切らない
- 正立。キャンバス回転や本体の傾きは明示指定があるときだけ

## Flat-first とごく薄い連続グラデ

- 先に平坦な意味形を置く。各IP色は1つの連続面と1本の外シルエット
- 奥行きは、大きなIP色面の中の途切れない低周波グラデだけ。照明を別形・別スウォッチ・帯・レイヤーにしない
- 光は左上から右下で共有する。部位ごとに照明を変えない
- トーンの遷移は、主形の幅の 50% 以上。局所ハイライトは主形の約 20% より広く。小さな艶点は却下
- グラデは元の色族の中。OKLCH で色相ずれ約 3°、彩度ずれ 0.015、ハイライト明度 `+0.025〜0.04`、影 `-0.03〜0.05`、ピーク間明度 0.08 以下
- 目と口はほぼ平坦。親面の広域照明以外の独自ハイライトを付けない
- 大きな面の接点は、同じグラデの続きとしての浅い暗さだけ。閉じた接触影、第二輪郭、AOの縫い目は禁止
- 背景は平坦。IPの中だけ連続トーン。背景のビネット・スポット・方向グラデは禁止
- フル解像度ではごく薄い立体、`32 × 32` では消えて平坦な色面だけが残る
- 材質、テクスチャ、鏡面、リムライト、ベベル、押し出し、深いオクルージョン、落下影は禁止。完全フラットも、粘土・風船・プラ・ぬいぐるみ・強い3Dも却下

## 色とキャンバス

- 完成ロゴは意味色3つ。IP基本色2 + 背景1。顔の印はIP色の再利用。第2IP色は大きな連続面（顔プレート、髪、腹、胸ビブ）
- 連続グラデで作った近い明暗は、新しい意味色に数えない
- 4色以上は明示指定のときだけ。2色は明示指定のときだけ（IP1 + 背景。目と口は背景の抜き）
- 中間の白より暖かいオフホワイト、純黒よりチャコールまたは深いネイビーを優先
- 背景は色味があり彩度を抑える。テラコッタ、くすみコーラル、ダスティプラム、セージ、デニム、オーカー。ネオン・原色の強さは明示指定のときだけ。灰色や濁りまで落とさない
- 数値制御できるとき:
  - 有彩ミッド背景: `L 0.45–0.75`, `C 0.08–0.16`
  - 暗い有彩背景: `L 0.18–0.35`, `C 0.05–0.14`
  - クリーム背景: `L 0.92–0.98`, `C 0.01–0.06`
- 有彩背景で `C < 0.05` は灰色寄り、`C > 0.20` は飽和寄り
- 主シルエットと背景は相対輝度 3:1 以上。小さい顔の印とその下の面は 4.5:1 以上。指定背景は守り、先にIP色を調整する
- 背景は遮られていない面で明度差約 0.02、彩度差約 0.01 まで。ビネットはモデルの逸脱として報告し、後処理で黙って潰さない
- 不透明で端まで背景を敷く。透明、白余白、外枠、カード、Appアイコンのマスク、画像四隅の丸めは禁止
- 直接 `1:1`。約 `1536 × 1536` を依頼する。サービスが `1024` や `1254` ならそれを残す。数字合わせの再サンプルはしない

ユーザーが背景パレットだけ渡したときは、その色は背景専用。IP2色は背景と別にする。

## プロンプト骨格

```text
Create one highly simplified IP mascot logo candidate, not a character illustration.
Background: fully opaque edge-to-edge solid <background>; use this color only for the background.
Subject: <subject> reduced to one rounded continuous silhouette and one defining feature.
Complexity: 6–10 basic shapes, at most two internal color regions, only two eyes and one mouth, readable at 32 × 32.
Color count: exactly three semantic colors in the complete logo: two IP base colors plus one background color. Reuse one IP color for facial marks and keep the second IP color in one continuous region.
Color behavior: softened but clearly chromatic background; warm off-white and charcoal/deep navy are preferred neutrals; silhouette/background contrast >= 3:1 and facial-detail contrast >= 4.5:1. Allow only continuous same-family tonal variation around each IP base color; do not count that variation as new semantic colors.
Composition: upright, emerging from the lower-left or lower-right, filling 75–85%; show both paired identifying features.
Style: Flat-first geometry with continuous-gradient micro-volume. Use one uninterrupted low-frequency diffuse gradient per large IP color region, sharing one upper-left-to-lower-right light direction. Make every transition span at least 50% of the dominant form. Limit total OKLCH lightness variation to 0.08, hue drift to 3 degrees, and chroma drift to 0.015. The modeling should be visible at full size but nearly disappear at 32 × 32.
Forbid: discrete highlight patches, closed highlight blobs, overlay bands, nested shadow shapes, cut-paper layers, cel-shading regions, stepped tonal swatches, hard internal shadow boundaries, small glossy hotspots, independent lighting on facial details, illustration detail, repeated anatomy, thin lines, sharp points, colors beyond the selected total count, pure flatness, strong 3D, clay, plastic, toy rendering, texture, gloss, bevel, external shadow, text, border, transparency, App mask, or rounded canvas corners.
```

## 却下するとき

- イラストに読める、複雑さ超過、小サイズで種が分からない
- 既定パレットが IP2 + 背景1 でない、第2色が散らばる、陰影が別色相、指定2色なのに顔だけ別色
- 背景色がIP面に塗られている（抜きではない）、または透明
- 既定の有彩背景がネオンか灰色、顔の印のコントラスト不足
- 輪郭が細い、尖る、壊れやすい
- 対の識別が欠けている、または切れている
- IPが小さい、ステッカーのように中央、傾いている、枠がある、空きが多すぎる
- ハイライトや影が閉じた輪郭・急な端・読める形になっている
- 1つの意味色が帯、セル、隣接スウォッチに分解されている
- グラデ方向が部位で変わる、遷移が主形の半分未満、小さな艶点がある
- `32 × 32` でグラデが別色面に見える
- 完全フラット、または明らかに立体
- 背景が場面、テクスチャ、ハロー、ビネット、強いグラデになる

失敗したら、破ったルールを書く。適合した体にしない。後処理で黙って直さない。
