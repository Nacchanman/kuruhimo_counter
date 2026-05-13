# Kuruhimo Counter

くるひもタイムズ向けの、iPhone SE 横向き表示を想定したドット絵風訪問者数カウンターです。

このリポジトリはカウンター単体の実装です。`kuruhimo.com` 本体リポジトリのコードは変更していません。

## 構成

- `index.html` — カウンター画面
- `styles.css` — iPhone SE 横向き・ドット絵風 UI
- `app.js` — 表示ロジック、カウント取得、アニメーション
- `counter-worker.js` — 任意で使える Cloudflare Workers + KV 用の簡易カウンター API

## 使い方

まずは `index.html` をブラウザで開くと表示確認できます。外部 API を設定していない場合は、見た目確認用にブラウザ内のローカルカウントを表示します。

実際の訪問者数を保存したい場合は、`counter-worker.js` を Cloudflare Workers に配置し、KV namespace を `KURUHIMO_COUNTER` という binding 名で接続してください。そのうえで `app.js` の `COUNTER_API_URL` に Worker の URL を設定します。

```js
const COUNTER_API_URL = "https://your-worker.example.workers.dev/count";
```

## 本体サイトへの組み込みについて

このリポジトリは単独で動くカウンター表示ページです。くるひもタイムズ本体へ常時表示するには、本体側で iframe などとして読み込む必要がありますが、この作業では本体リポジトリは変更していません。

例:

```html
<iframe src="https://<your-pages-url>/" title="くるひもタイムズ訪問者カウンター"></iframe>
```
