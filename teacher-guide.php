<?php
declare(strict_types=1);

require_once __DIR__ . '/api/bootstrap.php';

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function ccc_read_version_string(string $path): string
{
    if (!is_file($path)) {
        return '';
    }

    $decoded = json_decode((string) file_get_contents($path), true);
    if (!is_array($decoded)) {
        return '';
    }

    return trim((string) ($decoded['version'] ?? ''));
}

function ccc_append_teacher_guide_version_section(string $markdown, string $version): string
{
    if ($version === '') {
        return $markdown;
    }

    $section = "## バージョン情報\n\n- `CCC` version `{$version}`\n";
    return rtrim($markdown) . "\n\n" . $section;
}

try {
    $config = ccc_load_app_config();
    $guidePath = __DIR__ . DIRECTORY_SEPARATOR . 'TEACHER_GUIDE.md';
    $versionPath = __DIR__ . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'version.json';
    $guideMarkdown = is_file($guidePath) ? (string) file_get_contents($guidePath) : '';
    $version = ccc_read_version_string($versionPath);
    $assetVersionQuery = $version !== '' ? '?v=' . rawurlencode($version) : '';
    $guideMarkdown = ccc_append_teacher_guide_version_section($guideMarkdown, $version);
    $renderer = new CccMarkdownRenderer('', '');
    $guideHtml = trim($guideMarkdown) !== ''
        ? $renderer->render($guideMarkdown)
        : '<p class="muted-text">教師用ガイドはまだ準備中です。</p>';
} catch (Throwable $throwable) {
    http_response_code(500);
    ?><!doctype html>
    <html lang="ja">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>教師用ガイド</title>
    </head>
    <body>
      <h1>教師用ガイドの読み込みに失敗しました。</h1>
      <pre><?= h($throwable->getMessage()) ?></pre>
    </body>
    </html><?php
    exit;
}
?><!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <meta name="theme-color" content="#0d2e3a">
  <title><?= h($config['appName']) ?> | <?= h((string) ($config['uiText']['teacherGuideTitle'] ?? '教師用ガイド')) ?></title>
  <link rel="icon" href="favicon.ico<?= h($assetVersionQuery) ?>" sizes="any">
  <link rel="icon" type="image/svg+xml" href="favicon/favicon.svg<?= h($assetVersionQuery) ?>">
  <link rel="icon" type="image/png" sizes="96x96" href="favicon/favicon-96x96.png<?= h($assetVersionQuery) ?>">
  <link rel="apple-touch-icon" sizes="180x180" href="favicon/apple-touch-icon.png<?= h($assetVersionQuery) ?>">
  <link rel="manifest" href="favicon/site.webmanifest<?= h($assetVersionQuery) ?>">
  <script src="assets/theme-init.js<?= h($assetVersionQuery) ?>"></script>
  <script src="assets/prism-init.js<?= h($assetVersionQuery) ?>"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/app.css<?= h($assetVersionQuery) ?>">
  <link rel="stylesheet" href="assets/problem-page.css<?= h($assetVersionQuery) ?>">
  <script defer src="assets/vendor/prism/prism-core.min.js<?= h($assetVersionQuery) ?>"></script>
  <script defer src="assets/vendor/prism/prism-clike.min.js<?= h($assetVersionQuery) ?>"></script>
  <script defer src="assets/vendor/prism/prism-c.min.js<?= h($assetVersionQuery) ?>"></script>
  <script defer src="assets/vendor/prism/prism-cpp.min.js<?= h($assetVersionQuery) ?>"></script>
  <script defer src="assets/vendor/prism/prism-python.min.js<?= h($assetVersionQuery) ?>"></script>
  <script defer src="assets/teacher-guide.js<?= h($assetVersionQuery) ?>"></script>
</head>
<body class="page-shell">
  <main class="content-stack">
    <section class="teacher-guide-panel">
      <div class="panel-heading panel-heading-compact teacher-guide-toolbar">
        <div class="problem-header-main">
          <h1><?= h((string) ($config['uiText']['teacherGuideTitle'] ?? '教師用ガイド')) ?></h1>
        </div>
        <div>
          <a class="secondary-button" href="./?resetScroll=1"><?= h((string) ($config['uiText']['backToList'] ?? '← 問題一覧へ戻る')) ?></a>
        </div>
      </div>
      <article class="panel content-panel">
        <div id="teacher-guide-body" class="problem-body"><?= $guideHtml ?></div>
      </article>
    </section>
  </main>

  <footer class="site-footer">
    <div class="site-footer-inner">
      <p class="site-footer-line">
        <span class="site-footer-copy"><?= h($config['copyrightNotice']) ?></span>
        <a class="site-footer-link" href="validate.php"><?= h((string) ($config['uiText']['validationLink'] ?? '問題ステータス')) ?></a>
        <a class="site-footer-link" href="teacher-guide.php"><?= h((string) ($config['uiText']['teacherGuideLink'] ?? '教師用ガイド')) ?></a>
      </p>
    </div>
  </footer>
</body>
</html>
