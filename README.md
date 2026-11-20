# ボイシング帖 ／ コードメモ

GitHub Pages にそのまま置けるセットです。akai リポジトリのいちばん上（akai-hub.html と同じ場所）に、フォルダ構成ごと入れてください。

```
voicing.html             ボイシング帖
voicing.webmanifest
chord-memo.html          コードメモ
chord-memo.webmanifest
akai-drag.js             他のアプリ → コードメモへのドラッグ用（各アプリに1行足す）
icons/                   アイコン（192・512・マスク用・iPhone用）
```

## 開くURL
- https://utree1788-wq.github.io/akai/voicing.html
- https://utree1788-wq.github.io/akai/chord-memo.html

## アプリとして入れる
- Edge：ページを開く → アドレスバー右の「アプリをインストール」
- iPhone（Safari）：共有 → 「ホーム画面に追加」

## 他のアプリからコードメモへドラッグ
各アプリの `</body>` の直前に1行足す：
```html
<script src="akai-drag.js"></script>
```
