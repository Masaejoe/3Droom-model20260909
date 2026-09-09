# 住まいを歩く
添付された間取り・俯瞰画像を参考に、Three.js の形状で再現した1LDKのブラウザ内覧アプリです。実測寸法や元の3Dモデルデータに基づく建築設計モデルではありません。

## 操作
- 全体表示: ドラッグで回転、ホイールまたはピンチで拡大。
- 室内: WASD / 矢印キーで歩行、ドラッグで見回し、Shiftで速度変更。
- 「マウスで自由に見回す」でポインターロック、Escで解除。
- スマートフォン: スワイプで視点変更、画面の矢印を長押しして歩行。
- 部屋一覧から玄関・LDK・寝室・収納・洗面・浴室・トイレ・バルコニーへ移動。
- 昼夜切り替え、現在位置の間取り図、全画面表示に対応。

## 開発
Node.js 22.13 以降と pnpm を使用します。
```text
pnpm install
pnpm dev
pnpm build
node tests/geometry.mjs
pnpm exec tsc --noEmit
```
Windows ARM64でもローカルで実行できるよう、Cloudflareローカルランタイムを使わない静的出力構成です。生成物は dist/client/ に出力されます。Three.jsと素材は同梱され、外部画像・外部CDNへの依存はありません。

## 検証記録
- TypeScript型検査。
- 本番用ビルドとページのHTTP応答。
- 全8か所の出現位置が障害物と重ならないこと。
- 8cmグリッドで、LDKからすべての部屋へ歩行できること。
- 外周・室内壁・家具の衝突判定。
- WebMCPは対応ブラウザでのみ登録します。対応した実ブラウザの検証コンテキストがなく、WebMCPの実機動作とブラウザでの視覚・入力操作は未検証です。


## GitHub Pages
公開用ファイルは `docs/` に保存しています。GitHub の Settings → Pages で、`Deploy from a branch`、`main`、`/docs` を選びます。

内容を更新したら `pnpm build:pages` を実行し、更新された `docs/` もコミットしてpushしてください。通常の `pnpm build` は従来のルートURL用、`pnpm build:pages` は `/3Droom-model20260909/` 用です。

PrivateリポジトリからのPages公開には対応するGitHubプランが必要です。公開されたアプリの閲覧範囲と、ソースのリポジトリの閲覧範囲は別です。
