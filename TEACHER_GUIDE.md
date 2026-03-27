# TEACHER GUIDE

## このガイドについて

- このガイドは、教員が `CCC` を授業や自習用に運用するための手引きです
- 主に、導入前の確認、アップロード、問題追加、問題検査、学習記録の扱いをまとめています
- 学生向けの使い方ではなく、教員が知っておくと便利な運用情報に絞っています

## 導入前の確認

### PHP バージョン

- `CCC` は `PHP 8.2` 以上を前提にしています
- 少なくとも `PHP 5.x` では動作しません
- さくらのレンタルサーバでは、コントロールパネルで対象ドメインの PHP バージョンを確認してください

## サーバーへアップロードする

### アップロードするもの

| 対象 | パーミッション | 備考 |
|---|---|---|
| `index.html` | `604` | 公開ページ |
| `problem.html` | `604` | 公開ページ |
| `validate.php` | `705` | 公開ページ |
| `teacher-guide.php` | `705` | 公開ページ |
| `robots.txt` | `604` | 公開用 |
| `TEACHER_GUIDE.md` | `604` | 公開用 |
| `assets/` | `705` | 配下の `.css`, `.js`, `.svg` などは `604` |
| `api/` | `705` | 配下の `.php` は `705` |
| `config/` | `705` | 配下の `.json` は `604` |
| `problems/` | `705` | 配下の `problem.json`, `body.md`, `guide.md`, `.in.txt`, `.out.txt` は `604` |

### アップロードしないもの

| 対象 | 理由 |
|---|---|
| `README.md` | 公開不要 |
| `LICENSE` | 公開不要 |
| `tools/` | ローカル CLI 用 |
| `templates/` | ローカル雛形用 |
| `.git/` | 公開不要 |
| `.gitattributes` | 公開不要 |

## 表示文言をカスタマイズする

- `config/app.json` を編集すると、アプリ名や一覧ページ・問題ページの主要な表示文言をカスタマイズできます
- とくに学生向けの UI テキストは、現在かなり広い範囲を `uiText` から変更できます
- 一方で、`問題ステータス` や `教師用ガイド` のような公式ツール部分は、原則として固定です

### よく使う項目

| 項目 | 既定値の例 | カスタマイズ例 |
|---|---|---|
| `appName` | `"CCC"` | `"C Practice"` |
| `appSubtitle` | `"C プログラミングの自習と理解度確認のための演習環境です。"` | `"C 言語の練習問題をブラウザで確認できます。"` |
| `courseLabel` | `"CCC Demo Course"` | `"2026年度 情報処理演習"` |
| `lectureLabelTemplate` | `"第 {value} 回"` | `"第 {value} 章"` |
| `difficultyLabels` | `["基礎", "中級", "発展"]` | `["基本", "標準", "応用"]` |
| `understandingLabels` | `["要復習", "ふつう", "自信あり"]` | `["もう一度", "だいたいOK", "説明できる"]` |
| `uiText.problemListTitle` | `"問題一覧"` | `"練習問題"` |
| `uiText.filtersTitle` | `"フィルタ"` | `"絞り込み"` |
| `uiText.recordPanelTitle` | `"学習記録"` | `"進み具合"` |
| `uiText.guidePanelTitle` | `"解説"` | `"ヒント・解説"` |

### JSON の例

#### 既定値に近い例

```json
{
  "appName": "CCC",
  "lectureLabelTemplate": "第 {value} 回",
  "difficultyLabels": ["基礎", "中級", "発展"],
  "understandingLabels": ["要復習", "ふつう", "自信あり"],
  "uiText": {
    "problemListTitle": "問題一覧",
    "filtersTitle": "フィルタ",
    "recordPanelTitle": "学習記録",
    "guidePanelTitle": "解説"
  }
}
```

#### カスタマイズ例

```json
{
  "appName": "C Practice",
  "lectureLabelTemplate": "第 {value} 章",
  "difficultyLabels": ["基本", "標準", "応用"],
  "understandingLabels": ["もう一度", "だいたいOK", "説明できる"],
  "uiText": {
    "problemListTitle": "練習問題",
    "filtersTitle": "絞り込み",
    "recordPanelTitle": "進み具合",
    "guidePanelTitle": "ヒント・解説"
  }
}
```

## 新しい問題を追加する（手作業）

- `problems/` の下に新しいフォルダを作成します
- フォルダ名がそのまま問題 ID になります
- 次のファイルを用意します

| ファイル | 役割 |
|---|---|
| `problem.json` | 問題番号、タイトル、講義回、難易度、`profileId` などの設定を書きます |
| `body.md` | 問題文を Markdown で書きます。見出し・箇条書き・コードブロック・表・画像が使えます |
| `guide.md` | 解説を Markdown で書きます（任意） |
| `01.in.txt` | 最初の入出力例の入力を書きます |
| `01.out.txt` | 最初の入出力例の正しい出力を書きます |

- 入出力例は `01.in.txt` / `01.out.txt` から始め、必要なら `02`、`03` と連番で追加します
- 入出力例は最大 `06.in.txt` / `06.out.txt` まで使えます
- `guide.md` がない場合でも問題は動作します
- 問題ページのタイトルは Markdown の外で表示されるため、`body.md` は通常 `## 問題` から書き始めると自然です
- ひな形が必要な場合は `templates/default/` を参照してください

## 新しい問題を追加する（CLI）

ローカルで CLI を使える場合は、次のコマンドで新しい問題フォルダを作成できます。

```powershell
php tools/create.php sample-001
```

このコマンドは `problems/sample-001/` を作成し、`templates/default/` から次のファイルをコピーします。

- `problem.json`
- `body.md`
- `guide.md`
- `01.in.txt`
- `01.out.txt`

必要に応じて、次のオプションも指定できます。

- `--template <name>`
- `--profile <id>`

## 問題を検査する（問題ステータスページ）

- フッタの `問題ステータス` から開けます
- 問題一覧に載らない問題や、足りないファイルを確認しやすいです
- まずはこちらで確認するのが手軽です

## 問題を検査する（CLI）

ローカルで CLI を使える場合は、次のコマンドで問題データを検査できます。

```powershell
php tools/validate.php
php tools/validate.php sample-001
```

- 引数なし:
  - 全問題を検査します
- `<problem-id>` 付き:
  - その問題だけを検査します
- `Error` が 1 件でもあると終了コード `1` を返します
- `Warning` だけなら終了コードは `0` です

## 学習記録の扱い

- 学習記録とコード入力内容は、サーバではなく学生それぞれのブラウザに保存されます
- 別の端末や別のブラウザへは自動では引き継がれません
- ブラウザデータの削除、端末変更、ブラウザ再インストールなどで失われる可能性があります
- 必要に応じて、学生に学習記録のエクスポートでバックアップを取るよう案内すると安心です
- コード入力内容は学習記録とは別に扱われ、同じブラウザ内にだけ残ります
- `コード入力内容` と `解いた記録・理解度` は別々に消去できます

## FAQ

### Q. 学習記録はどこに保存されますか？

学習記録とコード入力内容は、サーバではなく学生それぞれのブラウザに保存されます。

### Q. 別の PC や別のブラウザでも同じ記録を使えますか？

自動では引き継がれません。必要に応じて、学習記録のエクスポート / インポートを案内してください。

### Q. `guide.md` は必須ですか？

必須ではありません。なくても問題は動作します。

### Q. 問題が一覧に出てきません。

`number` や `title` の不足、`problem.json` の不正、入出力例ファイル不足などがあると一覧から外れます。まず `問題ステータス` または `php tools/validate.php` で確認してください。

### Q. 判定できないことがあります。

Wandbox 側の混雑や制限の影響で、一時的に判定できないことがあります。時間を置いて再試行してください。

## 開発者情報とライセンス

- `CCC` は [@Reputeless](https://x.com/Reputeless) により開発されています
- ソースコードは [GitHub](https://github.com/Reputeless/ccc) で公開しています
- ライセンスは `MIT-0` です
- 詳細はルートの `LICENSE` を参照してください
- 教師用ガイドや問題ステータスページは、`CCC` 本体に含まれる公式ツールです
