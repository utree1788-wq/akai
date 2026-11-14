# 効果音の作り方ノート

効果音制作の本（全7章）を、章ごとの一覧・フローチャート・効果音71種類・シンセサイザー・サンプラー・エフェクター・録音機能でまとめたノートアプリです。
HTML 1枚で動きます（外部ライブラリなし）。

## フォルダの中身

```
sfx-note/
├─ index.html        アプリ本体
├─ manifest.json     アプリとしてインストールするための設定
├─ sw.js             オフラインでも開けるようにする仕組み
├─ README.md
└─ icons/
   ├─ icon.svg / icon-192.png / icon-512.png   通常のアイコン
   ├─ maskable-512.png                         Android・Edge用（丸く切り抜かれても欠けない）
   ├─ apple-touch-icon.png                     iPhone・iPad用
   └─ favicon-32.png                           ブラウザのタブ用
```

## GitHubへの上げ方

1. リポジトリ（例：`akai`）を開き、「Add file」→「Upload files」
2. この `sfx-note` フォルダをまるごとドラッグ＆ドロップして「Commit changes」
3. 数分待つと、次のURLで開けます（GitHub Pagesが有効な場合）
   `https://<ユーザー名>.github.io/<リポジトリ名>/sfx-note/`

## アプリとしてインストール

- **Edge / Chrome（PC・Android）**：上のURLを開き、アドレスバーの「アプリをインストール」アイコン（または「…」→「アプリ」→「このサイトをアプリとしてインストール」）
- **iPhone / iPad（Safari）**：共有ボタン →「ホーム画面に追加」

## 更新するとき

`index.html` を上書きアップロードしたら、`sw.js` の1行目 `sfx-note-v1` の数字を `v2`、`v3`… と上げてください。インストール済みのアプリにも新しい版が届きやすくなります。
