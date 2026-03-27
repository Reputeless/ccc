# TEACHER GUIDE

## 対象

## 導入前の確認

### PHP バージョン

- `CCC` は `PHP 8.2` 以上を前提にする
- 少なくとも `PHP 5.x` では動かない
- さくらのレンタルサーバでは、コントロールパネルで対象ドメインの PHP バージョンを確認しておく

### アップロードするもの

| 種別 | 対象 | パーミッション | 備考 |
|---|---|---|---|
| ファイル | `index.html` | `604` | 公開ページ |
| ファイル | `problem.html` | `604` | 公開ページ |
| ファイル | `validate.php` | `705` | 公開ページ |
| ファイル | `teacher-guide.php` | `705` | 公開ページ |
| ファイル | `robots.txt` | `604` | 公開用 |
| ファイル | `TEACHER_GUIDE.md` | `604` | 公開用 |
| ディレクトリ | `assets/` | `705` | 配下の `.css`, `.js`, `.svg` などは `604` |
| ディレクトリ | `api/` | `705` | 配下の `.php` は `705` |
| ディレクトリ | `config/` | `705` | 配下の `.json` は `604` |
| ディレクトリ | `problems/` | `705` | 配下の `problem.json`, `body.md`, `guide.md`, `.in.txt`, `.out.txt` は `604` |

### アップロードしないもの

| 対象 | 理由 |
|---|---|
| `README.md` | 公開不要 |
| `LICENSE` | 公開不要 |
| `tools/` | ローカル CLI 用 |
| `templates/` | ローカル雛形用 |
| `.git/` | 公開不要 |
| `.gitattributes` | 公開不要 |

## 基本的な運用手順

## 問題追加の流れ

ローカルで CLI を使える場合は、次のコマンドで新しい問題フォルダを作成できる。

```powershell
php tools/create.php print-002
```

このコマンドは `problems/print-002/` を作り、`templates/default/` から

- `problem.json`
- `body.md`
- `guide.md`
- `01.in.txt`
- `01.out.txt`

をコピーする。

必要なら次も指定できる。

- `--template <name>`
- `--profile <id>`

## 問題データの検査

ローカルで CLI を使える場合は、次のコマンドで問題データを検査できる。

```powershell
php tools/validate.php
php tools/validate.php print-002
```

- 引数なし:
  - 全問題を検査する
- `<problem-id>` 付き:
  - その問題だけを検査する
- `Error` が 1 件でもあると終了コード `1` を返す
- `Warning` だけなら終了コードは `0`

## 学習記録の扱い

## テーマと表示設定

## スマホ確認

## トラブルシューティング

## 今後のメモ
