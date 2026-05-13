# Kuruhimo Counter

くるひもタイムズ向けの、iPhone SE 横向き表示を想定したドット絵風訪問者数カウンターです。

このリポジトリはカウンター単体の実装です。`kuruhimo.com` / `Nacchanman/kuruhitimes` 本体リポジトリのコードは変更していません。

## 構成

- `index.html` — カウンター画面
- `styles.css` — iPhone SE 横向き・ドット絵風 UI
- `app.js` — くるひもタイムズの実訪問回数取得、5分ごとの自動更新、画面 Wake Lock 補助
- `counter-worker.js` — 旧案として残している単体カウンター API。現在の表示では使っていません。

## 実際の訪問回数の取得方法

このカウンターは、`Nacchanman/kuruhitimes` の既存実装を読み取り専用で参照します。

- 記事ID一覧は `https://kuruhimo.com/data.json` から取得します。
- 取得できない場合は `https://kuruhitimes.pages.dev/data.json`、さらに GitHub raw の `data.json` をフォールバックとして読みます。
- ビュー数は `https://kuruhimo.com/api/article-counter?ids=...` から取得します。
- 取得できない場合は `https://kuruhitimes.pages.dev/api/article-counter?ids=...` をフォールバックとして読みます。
- 各記事IDのビュー数を合計し、iPhone画面に表示します。
- カウンター側から `POST` は行わず、既存の訪問回数を `GET` で読むだけです。

## iPhone SEで常時表示する想定

- iPhone SEを横向きにして、このページをSafariなどで開きます。
- カウンターは初回表示後、5分おきに自動更新されます。
- ページを一度離れて戻ってきた場合も、表示復帰時に再更新します。
- 対応ブラウザでは Screen Wake Lock API を使って画面が消えにくくなるようにしています。
- iOSの仕様やブラウザ制限により、コードだけで自動ロックを完全に無効化することはできません。常時表示したい場合は、iPhone側で「設定 > 画面表示と明るさ > 自動ロック」を長め、または「なし」にしてください。

## GitHub Pagesで公開する場合

1. GitHubでこのリポジトリを開く
2. `Settings` → `Pages`
3. Source: `Deploy from a branch`
4. Branch: `main`、Folder: `/root`
5. `Save`

公開後は、以下のようなURLで開けます。

```txt
https://nacchanman.github.io/kuruhimo_counter/
```

## 本体サイトへの組み込みについて

このリポジトリは単独で動くカウンター表示ページです。くるひもタイムズ本体へ常時表示するには、本体側で iframe などとして読み込む必要がありますが、この作業では本体リポジトリは変更していません。

例:

```html
<iframe src="https://<your-pages-url>/" title="くるひもタイムズ訪問者カウンター"></iframe>
```
