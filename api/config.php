<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$config = ccc_load_app_config();

ccc_send_json([
    'appName' => $config['appName'],
    'appSubtitle' => $config['appSubtitle'],
    'difficultyLabels' => $config['difficultyLabels'],
    'understandingLabels' => $config['understandingLabels'],
    'tabWidth' => $config['tabWidth'],
    'editorRows' => $config['editorRows'],
    'longExampleLineThreshold' => $config['longExampleLineThreshold'],
    'resultPreviewMaxLines' => $config['resultPreviewMaxLines'],
    'resultPreviewMaxChars' => $config['resultPreviewMaxChars'],
    'maxCodeBytes' => $config['maxCodeBytes'],
], 200, ['Cache-Control' => 'no-store']);
