# CCC

`CCC` は、学生がブラウザから C / C++ / Python の小さな演習問題を解き、理解度を記録できる学習支援 Web アプリです。  
判定には Wandbox API を使い、学生の学習記録やコード入力内容は各ブラウザの `localStorage` に保存します。

教員向けの導入手順や運用方法は、[TEACHER_GUIDE.md](./TEACHER_GUIDE.md) を参照してください。

## 目的

- 学生がブラウザから気軽に問題を解ける
- 教員がシンプルな手順で問題を追加・修正できる
- アカウント管理や提出回収なしで運用できる
- 小規模な PHP + 静的ファイル構成で保守しやすくする

## 現在の主な機能

- 問題一覧ページ
- 個別問題ページ
- Wandbox 経由の判定
- `解いた` 状態と理解度のローカル保存
- 講義回、難易度、解いた状態、理解度による絞り込み
- `guide.md` による問題ごとの解説表示
- `publishedAt` による問題一覧への表示制御
- 問題ステータスページ
- 教師用ガイドページ
- 問題追加 / 問題検査の CLI

## 画面と役割

- [index.html](./index.html)
  - 問題一覧ページ
- [problem.html](./problem.html)
  - 個別問題ページ
- [validate.php](./validate.php)
  - 問題ステータスページ
- [teacher-guide.php](./teacher-guide.php)
  - 教師用ガイドページ

## ディレクトリ構成

```text
/
  index.html
  problem.html
  validate.php
  teacher-guide.php
  robots.txt
  TEACHER_GUIDE.md
  LICENSE
  assets/
  api/
  config/
  problems/
  templates/
  tools/
```

主要ディレクトリ:

- [assets](./assets)
  - CSS / JavaScript / Prism などのフロントエンド資産
- [api](./api)
  - PHP API と補助ライブラリ
- [config](./config)
  - グローバル設定
- [problems](./problems)
  - 各問題データ
- [templates](./templates)
  - `create.php` 用の問題雛形
- [tools](./tools)
  - ローカル CLI

## 問題データ

1 問ごとに `problems/<problem-id>/` というフォルダを持ちます。  
**フォルダ名がそのまま問題 ID** になります。

例:

```text
problems/
  01-1/
    problem.json
    body.md
    guide.md
    01.in.txt
    01.out.txt
```

### `problem.json`

現在の基本形:

```json
{
  "type": "code",
  "number": "1-1",
  "title": "2つの整数の和",
  "lecture": 1,
  "difficulty": 1,
  "profileId": "c23",
  "publishedAt": "2026-04-01T09:00:00+09:00"
}
```

項目:

- `type`
  - 問題種別。現在は `code` を指定
- `number`
  - 表示用の問題番号
- `title`
  - 問題タイトル
- `lecture`
  - 講義回。未設定にしたい場合は `null`
- `difficulty`
  - `1`〜`3`。未設定にしたい場合は `null`
- `profileId`
  - 使用する言語プロファイル
- `publishedAt`
  - 問題一覧への表示開始日時。未指定なら常時表示

補足:

- 現在の `CCC` では、`type` は `code` を使います
- `lecture` と `difficulty` は実装上は省略も許容していますが、運用上は `null` を書く形を推奨しています
- `publishedAt` は**一覧や API の表示制御**であり、厳密なアクセス制限ではありません

### `body.md` と `guide.md`

- `body.md`
  - 問題文を Markdown で書きます
- `guide.md`
  - 解説を Markdown で書きます。任意です

`guide.md` がない場合でも問題は動作します。

### 入出力例

入出力例は固定連番です。

- `01.in.txt` / `01.out.txt`
- `02.in.txt` / `02.out.txt`
- ...
- `06.in.txt` / `06.out.txt`

ルール:

- `01` から順に置く
- 途中を飛ばさない
- 最大 6 組まで

## Markdown 方針

`CCC` の Markdown レンダラは、ページ外に問題タイトルがある前提で見出しを 1 段下げて描画します。

- `#` -> `h2`
- `##` -> `h3`
- `###` -> `h4`
- `####` -> `h5`
- `#####` -> `h6`

主な対応記法:

- 見出し
- 箇条書き
- 番号付きリスト
- 引用
- 水平線
- 太字
- 斜体
- 打ち消し線
- テーブル
- インラインコード
- fenced code block
- 画像
- リンク

## 標準対応言語

現在の標準 `profileId` は次のとおりです。

| `profileId` | 表示名 |
|---|---|
| `c17` | `C17` |
| `c23` | `C23` |
| `cpp20` | `C++20` |
| `cpp23` | `C++23` |
| `python3.14` | `Python 3.14` |

定義は [config/app.json](./config/app.json) の `languageProfiles` にあります。

## 判定仕様の要点

- 判定は公開されている入出力例のみを使います
- 隠れテストケースはありません
- 先頭から順に実行し、最初の失敗で打ち切ります
- 途中の空白差は不正解です
- 末尾の空白と末尾改行の差は無視します
- 乱数や現在時刻のような、毎回出力が変わる問題には向いていません

## 学習記録

- `解いた` 状態、理解度、コード入力内容は各ブラウザに保存します
- サーバー保存や自動同期は行いません
- 運用上の注意やエクスポート / インポートの案内は [TEACHER_GUIDE.md](./TEACHER_GUIDE.md) を参照してください

## 表示文言のカスタマイズ

[config/app.json](./config/app.json) を編集すると、アプリ名や学生向け UI テキストの多くを変更できます。

代表的な項目:

- `appName`
- `lectureLabelTemplate`
- `difficultyLabels`
- `understandingLabels`
- `uiText.*`

具体例や運用上の考え方は [TEACHER_GUIDE.md](./TEACHER_GUIDE.md) を参照してください。

## ローカル CLI

```powershell
php tools/create.php sample-001
php tools/validate.php
php tools/validate.php sample-001
```

詳しい使い方は [TEACHER_GUIDE.md](./TEACHER_GUIDE.md) を参照してください。

## ホスティング方針

- 静的 HTML / CSS / JavaScript + PHP API の構成です
- さくらのレンタルサーバーのような共有サーバーでの運用を想定しています
- 公開時のアップロード対象やパーミッションは [TEACHER_GUIDE.md](./TEACHER_GUIDE.md) を参照してください

## 既知の制約

- `publishedAt` は厳密な非公開機能ではありません
- Chromium 系ブラウザでは、ダークモード時にネイティブ `<select>` を開く瞬間だけ白い背景が一瞬見えることがあります
- 完全対応には custom dropdown 化が必要です

## フィードバック

- 機能のリクエストやフィードバックは [GitHub Issues](https://github.com/Reputeless/ccc/issues) を利用してください

## License

This project is licensed under `MIT-0`. See [LICENSE](./LICENSE).
