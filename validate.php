<?php
declare(strict_types=1);

require_once __DIR__ . '/api/bootstrap.php';

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

try {
    $config = ccc_load_app_config();
    $report = ccc_validate_problem_set($config);
} catch (Throwable $throwable) {
    http_response_code(500);
    ?><!doctype html>
    <html lang="ja">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>CCC Validation</title>
    </head>
    <body>
      <h1>検査ページの読み込みに失敗しました。</h1>
      <pre><?= h($throwable->getMessage()) ?></pre>
    </body>
    </html><?php
    exit;
}

$summary = $report['summary'];
$items = $report['items'];
?><!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= h($config['appName']) ?> | 問題ステータス</title>
  <script src="assets/theme-init.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/app.css">
</head>
<body>
  <div class="page-shell">
    <section class="panel validate-panel">
      <div class="panel-heading panel-heading-compact">
        <div>
          <h1>問題ステータス</h1>
        </div>
        <div>
          <a class="secondary-button validate-back-link" href="index.html">問題一覧へ戻る</a>
        </div>
      </div>

      <div class="validate-summary">
        <div class="validate-summary-card">
          <span class="validate-summary-label">OK</span>
          <strong class="validate-summary-value"><?= (int) $summary['ok'] ?></strong>
        </div>
        <div class="validate-summary-card">
          <span class="validate-summary-label">警告</span>
          <strong class="validate-summary-value"><?= (int) $summary['warning'] ?></strong>
        </div>
        <div class="validate-summary-card">
          <span class="validate-summary-label">エラー</span>
          <strong class="validate-summary-value"><?= (int) $summary['error'] ?></strong>
        </div>
      </div>

      <div class="validate-table-wrap">
        <table class="validate-table">
          <thead>
            <tr>
              <th>id</th>
              <th>number</th>
              <th>title</th>
              <th>lecture</th>
              <th>difficulty</th>
              <th>profileId</th>
              <th>publishedAt</th>
              <th>examples</th>
              <th>結果</th>
              <th>詳細</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($items as $item): ?>
              <tr>
                <td><code><?= h((string) $item['id']) ?></code></td>
                <td><code><?= h((string) $item['number']) ?></code></td>
                <td><?= h((string) $item['title']) ?></td>
                <td><?= h((string) $item['lecture']) ?></td>
                <td><?= h((string) $item['difficulty']) ?></td>
                <td><code><?= h((string) $item['profileId']) ?></code></td>
                <td><code><?= h((string) $item['publishedAt']) ?></code></td>
                <td><code><?= h((string) $item['examples']) ?></code></td>
                <td>
                  <span class="validate-status validate-status-<?= h($item['status']) ?>">
                    <?= $item['status'] === 'ok' ? 'OK' : ($item['status'] === 'warning' ? '警告' : 'エラー') ?>
                  </span>
                </td>
                <td>
                  <?php if ($item['details'] === []): ?>
                    <span class="validate-detail-ok">問題なし</span>
                  <?php else: ?>
                    <ul class="validate-detail-list">
                      <?php foreach ($item['details'] as $detail): ?>
                        <li><?= h((string) $detail) ?></li>
                      <?php endforeach; ?>
                    </ul>
                  <?php endif; ?>
                </td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</body>
</html>
