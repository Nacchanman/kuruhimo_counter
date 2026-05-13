# Kuruhimo Counter

くるひもタイムズ向けの、iPhone SE 横向き表示を想定したドット絵風訪問者数カウンターです。

このリポジトリはカウンター単体の実装です。`kuruhimo.com` 本体リポジトリのコードは変更していません。

## 構成

- `index.html` — カウンター画面
- `styles.css` — iPhone SE 横向き・ドット絵風 UI
- `app.js` — 表示ロジック、カウント取得、5分ごとの自動更新、画面 Wake Lock 補助
- `counter-worker.js` — 任意で使える Cloudflare Workers + KV 用の簡易カウンター API

## 使い方

まずは `index.html` をブラウザで開くと表示確認できます。外部 API を設定していない場合は、見た目確認用にブラウザ内のローカルカウントを表示します。

実際の訪問者数を保存したい場合は、`counter-worker.js` を Cloudflare Workers に配置し、KV namespace を `KURUHIMO_COUNTER` という binding 名で接続してください。そのうえで `app.js` の `COUNTER_API_URL` に Worker の URLを設定します。

```js
const COUNTER_API_URL = "https://your-worker.example.workers.dev/count";
```

## iPhone SEで常時表示する想定

- iPhone SEを横向きにして、このページをSafariなどで開きます。
- カウンターは初回表示後、5分おきに自動更新されます。
- ページを一度離れて戻ってきた場合も、表示復帰時に再更新します。
- 対応ブラウザでは Screen Wake Lock API を使って画面が消えにくくなるようにしています。
- iOSの仕様やブラウザ制限により、コードだけで自動ロックを完全に無効化することはできません。常時表示したい場合は、iPhone側で「設定 > 画面表示と明るさ > 自動ロック」を長め、または「なし」にしてください。

## 本体サイトへの組み込みについて

このリポジトリは単独で動くカウンター表示ページです。くるひもタイムズ本体へ常時表示するには、本体側で iframe などとして読み込む必要がありますが、この作業では本体リポジトリは変更していません。

例:

```html
<iframe src="https://<your-pages-url>/" title="くるひもタイムズ訪問者カウンター"></iframe>
```
