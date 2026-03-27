<?php
declare(strict_types=1);

require_once __DIR__ . '/api/bootstrap.php';

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

try {
    $config = ccc_load_app_config();
    $guidePath = __DIR__ . DIRECTORY_SEPARATOR . 'TEACHER_GUIDE.md';
    $guideMarkdown = is_file($guidePath) ? (string) file_get_contents($guidePath) : '';
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
  <script src="assets/theme-init.js"></script>
  <script src="assets/prism-init.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/app.css">
  <link rel="stylesheet" href="assets/problem-page.css">
  <script defer src="assets/vendor/prism/prism-core.min.js"></script>
  <script defer src="assets/vendor/prism/prism-clike.min.js"></script>
  <script defer src="assets/vendor/prism/prism-c.min.js"></script>
  <script defer src="assets/vendor/prism/prism-cpp.min.js"></script>
  <script defer src="assets/vendor/prism/prism-python.min.js"></script>
  <script defer src="assets/teacher-guide.js"></script>
</head>
<body class="page-shell">
  <main class="content-stack">
    <section class="teacher-guide-panel">
      <div class="panel-heading panel-heading-compact teacher-guide-toolbar">
        <div class="problem-header-main">
          <h1><?= h((string) ($config['uiText']['teacherGuideTitle'] ?? '教師用ガイド')) ?></h1>
        </div>
        <div>
          <a class="secondary-button" href="./"><?= h((string) ($config['uiText']['backToList'] ?? '← 問題一覧へ戻る')) ?></a>
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
