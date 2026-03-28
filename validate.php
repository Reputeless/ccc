<?php
declare(strict_types=1);

require_once __DIR__ . '/api/bootstrap.php';

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function render_validate_detail(string $detail): string
{
    $parts = preg_split('/(`[^`]+`)/', $detail, -1, PREG_SPLIT_DELIM_CAPTURE);
    if ($parts === false) {
        return h($detail);
    }

    $html = '';
    foreach ($parts as $part) {
        if ($part === '') {
            continue;
        }

        if ($part[0] === '`' && substr($part, -1) === '`') {
            $html .= '<code>' . h(substr($part, 1, -1)) . '</code>';
            continue;
        }

        $html .= h($part);
    }

    return $html;
}

function render_validate_published_at(string $value): string
{
    $trimmed = trim($value);
    if ($trimmed === '') {
        return '<code></code>';
    }

    try {
        $publishedAt = new DateTimeImmutable($trimmed);
        $statusClass = $publishedAt <= new DateTimeImmutable('now')
            ? 'validate-published-at-live'
            : 'validate-published-at-scheduled';
        return '<code class="validate-published-at ' . $statusClass . '">' . h($trimmed) . '</code>';
    } catch (Throwable) {
        return '<code>' . h($trimmed) . '</code>';
    }
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
  <meta name="robots" content="noindex, nofollow, noarchive">
  <meta name="theme-color" content="#0d2e3a">
  <title><?= h($config['appName']) ?> | <?= h((string) ($config['uiText']['validationLink'] ?? '問題ステータス')) ?></title>
  <link rel="icon" href="favicon.ico" sizes="any">
  <link rel="icon" type="image/svg+xml" href="favicon/favicon.svg">
  <link rel="icon" type="image/png" sizes="96x96" href="favicon/favicon-96x96.png">
  <link rel="apple-touch-icon" sizes="180x180" href="favicon/apple-touch-icon.png">
  <link rel="manifest" href="favicon/site.webmanifest">
  <script src="assets/theme-init.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/app.css">
  <link rel="stylesheet" href="assets/validate.css">
  <script defer src="assets/tooltip.js"></script>
</head>
<body>
  <div class="page-shell">
    <section class="validate-panel">
      <div class="panel-heading panel-heading-compact">
        <div>
          <h1><?= h((string) ($config['uiText']['validationLink'] ?? '問題ステータス')) ?></h1>
        </div>
        <div>
          <a class="secondary-button validate-back-link" href="./"><?= h((string) ($config['uiText']['backToList'] ?? '← 問題一覧へ戻る')) ?></a>
        </div>
      </div>

      <div class="validate-summary">
        <div class="validate-summary-card">
          <span class="validate-summary-label">OK</span>
          <strong class="validate-summary-value"><?= (int) $summary['ok'] ?></strong>
        </div>
        <div class="validate-summary-card">
          <span class="validate-summary-label">Warning</span>
          <strong class="validate-summary-value"><?= (int) $summary['warning'] ?></strong>
        </div>
        <div class="validate-summary-card">
          <span class="validate-summary-label">Error</span>
          <strong class="validate-summary-value"><?= (int) $summary['error'] ?></strong>
        </div>
      </div>

      <div class="validate-table-wrap">
        <table class="validate-table">
          <thead>
            <tr>
              <th>id</th>
              <th>type</th>
              <th>number</th>
              <th>title</th>
              <th class="validate-cell-center">lecture</th>
              <th class="validate-cell-center">difficulty</th>
              <th>profileId</th>
              <th>publishedAt</th>
              <th>items</th>
              <th class="validate-cell-center">guide</th>
              <th class="validate-cell-center">status</th>
              <th>details</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($items as $item): ?>
              <tr>
                <td><code><?= h((string) $item['id']) ?></code></td>
                <td><code><?= h((string) $item['type']) ?></code></td>
                <td><code><?= h((string) $item['number']) ?></code></td>
                <td class="validate-title-cell">
                  <?php if (($item['id'] ?? '') !== ''): ?>
                    <a class="validate-problem-link" href="problem.html?id=<?= rawurlencode((string) $item['id']) ?>"><?= h((string) $item['title']) ?></a>
                  <?php else: ?>
                    <?= h((string) $item['title']) ?>
                  <?php endif; ?>
                </td>
                <td class="validate-cell-center"><code><?= h((string) $item['lecture']) ?></code></td>
                <td class="validate-cell-center"><code><?= h((string) $item['difficulty']) ?></code></td>
                <td><code><?= h((string) $item['profileId']) ?></code></td>
                <td><?= render_validate_published_at((string) $item['publishedAt']) ?></td>
                <td><code><?= h((string) $item['items']) ?></code></td>
                <td class="validate-guide-cell validate-cell-center">
                  <?php if (($item['guide'] ?? '') !== ''): ?>
                    <span class="validate-guide-badge" data-tooltip="Guide available" aria-label="Guide available"></span>
                  <?php endif; ?>
                </td>
                <td class="validate-cell-center">
                  <span class="validate-status validate-status-<?= h($item['status']) ?>">
                    <?= $item['status'] === 'ok' ? 'OK' : ($item['status'] === 'warning' ? 'Warning' : 'Error') ?>
                  </span>
                </td>
                <td class="validate-detail-cell">
                  <?php if ($item['details'] !== []): ?>
                    <ul class="validate-detail-list">
                      <?php foreach ($item['details'] as $detail): ?>
                        <li><?= render_validate_detail((string) $detail) ?></li>
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
    <footer class="site-footer">
      <div class="site-footer-inner">
        <p class="site-footer-line">
          <span class="site-footer-copy"><?= h($config['copyrightNotice']) ?></span>
          <a class="site-footer-link" href="validate.php"><?= h((string) ($config['uiText']['validationLink'] ?? '問題ステータス')) ?></a>
          <a class="site-footer-link" href="teacher-guide.php"><?= h((string) ($config['uiText']['teacherGuideLink'] ?? '教師用ガイド')) ?></a>
        </p>
      </div>
    </footer>
  </div>
</body>
</html>
