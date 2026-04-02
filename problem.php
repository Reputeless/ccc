<?php
declare(strict_types=1);

require_once __DIR__ . '/api/bootstrap.php';

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function ccc_problem_ui_text(array $uiText, string $key): string
{
    $value = $uiText[$key] ?? null;
    if (is_string($value) && $value !== '') {
        return $value;
    }

    return '[[' . $key . ']]';
}

function ccc_problem_config_text(array $config, string $key): string
{
    $value = $config[$key] ?? null;
    if (is_string($value) && $value !== '') {
        return $value;
    }

    return '[[' . $key . ']]';
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

try {
    $config = ccc_load_app_config();
    $version = ccc_read_version_string(__DIR__ . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'version.json');
    $assetVersionQuery = $version !== '' ? '?v=' . rawurlencode($version) : '';
    $uiText = is_array($config['uiText'] ?? null) ? $config['uiText'] : [];
    $backToList = ccc_problem_ui_text($uiText, 'backToList');
    $backToListPlain = preg_replace('/^←\s*/u', '', $backToList) ?? $backToList;
    $problemErrorTitle = ccc_problem_ui_text($uiText, 'problemErrorTitle');
    $problemUnavailable = ccc_problem_ui_text($uiText, 'problemUnavailable');
    $solvedToggleLabel = ccc_problem_ui_text($uiText, 'solvedToggleLabel');
    $understandingSelectLabel = ccc_problem_ui_text($uiText, 'understandingSelectLabel');
    $examplesSectionTitle = ccc_problem_ui_text($uiText, 'examplesSectionTitle');
    $codeEditorTitle = ccc_problem_ui_text($uiText, 'codeEditorTitle');
    $judgeButtonLabel = ccc_problem_ui_text($uiText, 'judgeButtonLabel');
    $resultPanelTitle = ccc_problem_ui_text($uiText, 'resultPanelTitle');
    $judgeLoadingLabel = ccc_problem_ui_text($uiText, 'judgeLoadingLabel');
    $resultIdle = ccc_problem_ui_text($uiText, 'resultIdle');
    $understandingPromptTitle = ccc_problem_ui_text($uiText, 'understandingPromptTitle');
    $understandingPromptLead = ccc_problem_ui_text($uiText, 'understandingPromptLead');
    $validationLink = ccc_problem_ui_text($uiText, 'validationLink');
    $teacherGuideLink = ccc_problem_ui_text($uiText, 'teacherGuideLink');
    $appName = ccc_problem_config_text($config, 'appName');
    $copyrightNotice = ccc_problem_config_text($config, 'copyrightNotice');
} catch (Throwable $throwable) {
    http_response_code(500);
    ?><!doctype html>
    <html lang="ja">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>問題ページ</title>
    </head>
    <body>
      <h1>問題ページの読み込みに失敗しました。</h1>
      <pre><?= h($throwable->getMessage()) ?></pre>
    </body>
    </html><?php
    exit;
}
?><!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <meta name="theme-color" content="#0d2e3a">
  <title><?= h($appName) ?></title>
  <link rel="icon" href="favicon.ico<?= h($assetVersionQuery) ?>" sizes="any">
  <link rel="icon" type="image/svg+xml" href="favicon/favicon.svg<?= h($assetVersionQuery) ?>">
  <link rel="icon" type="image/png" sizes="96x96" href="favicon/favicon-96x96.png<?= h($assetVersionQuery) ?>">
  <link rel="apple-touch-icon" sizes="180x180" href="favicon/apple-touch-icon.png<?= h($assetVersionQuery) ?>">
  <link rel="manifest" href="favicon/site.webmanifest<?= h($assetVersionQuery) ?>">
  <script src="assets/theme-init.js<?= h($assetVersionQuery) ?>"></script>
  <script src="assets/prism-init.js<?= h($assetVersionQuery) ?>"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=LINE+Seed+JP:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/app.css<?= h($assetVersionQuery) ?>">
  <link rel="stylesheet" href="assets/problem-page.css<?= h($assetVersionQuery) ?>">
  <script defer src="assets/tooltip.js<?= h($assetVersionQuery) ?>"></script>
  <script defer src="assets/vendor/prism/prism-core.min.js<?= h($assetVersionQuery) ?>"></script>
  <script defer src="assets/vendor/prism/prism-clike.min.js<?= h($assetVersionQuery) ?>"></script>
  <script defer src="assets/vendor/prism/prism-c.min.js<?= h($assetVersionQuery) ?>"></script>
  <script defer src="assets/vendor/prism/prism-cpp.min.js<?= h($assetVersionQuery) ?>"></script>
  <script defer src="assets/vendor/prism/prism-python.min.js<?= h($assetVersionQuery) ?>"></script>
  <script defer src="assets/common.js<?= h($assetVersionQuery) ?>"></script>
  <script defer src="assets/code-editor.js<?= h($assetVersionQuery) ?>"></script>
  <script defer src="assets/problem.js<?= h($assetVersionQuery) ?>"></script>
</head>
<body class="page-shell">
  <header class="site-header compact-header">
    <div class="site-header-inner">
      <a class="hero-card hero-card-compact hero-card-link hero-card-link-only" href="./">
        <span id="problem-back-link-text" class="back-link"><?= h($backToList) ?></span>
      </a>
    </div>
  </header>

  <main class="content-stack">
    <section id="problem-error" class="panel error-panel" hidden>
      <h1 id="problem-error-title"><?= h($problemErrorTitle) ?></h1>
      <p id="problem-error-message"><?= h($problemUnavailable) ?></p>
      <a id="problem-error-back-link" class="primary-link" href="./"><?= h($backToListPlain) ?></a>
    </section>

    <section id="problem-view" hidden>
      <div class="two-column-layout">
        <article class="panel content-panel">
          <header class="problem-header">
            <div class="problem-header-main">
              <h1 id="problem-title">問題</h1>
              <div class="problem-meta-row">
                <div id="problem-meta" class="problem-meta-badges"></div>
                <div class="meta-actions">
                  <label id="solved-toggle-label" class="solved-toggle solved-toggle-large">
                    <input id="solved-toggle" class="solved-checkbox solved-toggle-input sr-only" type="checkbox" aria-label="<?= h($solvedToggleLabel) ?>">
                    <span class="solved-toggle-icon" aria-hidden="true">
                      <svg viewBox="0 0 20 20" focusable="false">
                        <circle class="solved-toggle-circle" cx="10" cy="10" r="7.75"></circle>
                        <path class="solved-toggle-check" d="M6 10.5 8.8 13.3 14 8"></path>
                      </svg>
                    </span>
                  </label>
                  <label class="field select-inline compact-select problem-understanding-field">
                    <span id="understanding-select-label" class="sr-only"><?= h($understandingSelectLabel) ?></span>
                    <span id="problem-understanding-wrap" class="understanding-select-wrap">
                      <span id="problem-understanding-marker" class="understanding-marker understanding-marker-understanding-unset" aria-hidden="true"></span>
                      <select id="understanding-select" class="understanding-select" aria-label="<?= h($understandingSelectLabel) ?>"></select>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </header>
          <div id="problem-body" class="problem-body"></div>
          <section class="examples-section">
            <h2 id="examples-section-title"><?= h($examplesSectionTitle) ?></h2>
            <div id="examples-list" class="examples-list"></div>
          </section>
        </article>

        <aside class="panel editor-panel">
          <div class="panel-heading">
            <h2 id="code-editor-title"><?= h($codeEditorTitle) ?></h2>
          </div>

          <div id="text-answer-panel" class="text-answer-panel" hidden>
            <div id="text-questions" class="text-question-list"></div>
          </div>

          <textarea id="code-editor" class="code-editor" spellcheck="false" wrap="off"></textarea>

          <div class="editor-actions">
            <button id="judge-button" class="primary-button" type="button"><?= h($judgeButtonLabel) ?></button>
          </div>

          <section class="result-section" aria-live="polite">
            <div class="panel-heading">
              <h2 id="result-panel-title"><?= h($resultPanelTitle) ?></h2>
              <div id="judge-loading" class="loading-indicator" hidden>
                <span class="spinner" aria-hidden="true"></span>
                <span id="judge-loading-label"><?= h($judgeLoadingLabel) ?></span>
              </div>
            </div>
            <div id="result-message" class="status-banner result-status-banner no-icon muted-banner">
              <span class="result-status-text"><?= h($resultIdle) ?></span>
            </div>
            <fieldset id="result-understanding-prompt" class="result-understanding-prompt" hidden>
              <legend id="understanding-prompt-title"><?= h($understandingPromptTitle) ?></legend>
              <div id="result-understanding-options" class="result-understanding-options"></div>
              <div class="result-understanding-actions">
                <p id="understanding-prompt-lead" class="result-understanding-actions-label"><?= h($understandingPromptLead) ?></p>
                <a id="problem-result-back-link" class="result-back-link" href="./"><?= h($backToList) ?></a>
              </div>
            </fieldset>
            <div id="result-details" class="result-details"></div>
          </section>

          <section class="guide-section">
            <div id="guide-container" class="guide-container"></div>
          </section>
        </aside>
      </div>
    </section>
  </main>
  <footer class="site-footer">
    <div class="site-footer-inner">
      <p class="site-footer-line">
        <span id="global-footer-copyright" class="site-footer-copy"><?= h($copyrightNotice) ?></span>
        <a id="global-footer-validation-link" class="site-footer-link" href="validate.php"><?= h($validationLink) ?></a>
        <a id="global-footer-teacher-guide-link" class="site-footer-link" href="teacher-guide.php"><?= h($teacherGuideLink) ?></a>
      </p>
    </div>
  </footer>
</body>
</html>
