# TEACHER GUIDE

## 対象

## 導入前の確認

### PHP バージョン

- `CCC` は `PHP 8.2` 以上を前提にする
- 少なくとも `PHP 5.x` では動かない
- さくらのレンタルサーバでは、コントロールパネルで対象ドメインの PHP バージョンを確認しておく

### アップロード時のパーミッション

- ディレクトリ: `705`
- `.php`: `705`
- `.html`, `.css`, `.js`, `.json`, `.md`, `.txt`, `.svg`, `robots.txt`: `604`

目安:

- PHP ファイルは実行可能な設定にする
- それ以外の公開ファイルは読めればよい

### 最低限アップロードするもの

- ルート:
  - `index.html`
  - `problem.html`
  - `validate.php`
  - `teacher-guide.php`
  - `robots.txt`
  - `TEACHER_GUIDE.md`
- `assets/`
- `api/`
- `config/`
- `problems/`

補足:

- テスト用の壊れた問題は本番環境へは上げない
- `README.md` は通常アップロード不要

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
