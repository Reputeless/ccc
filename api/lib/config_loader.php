<?php
declare(strict_types=1);

function ccc_load_app_config(): array
{
    static $loaded = null;
    if ($loaded !== null) {
        return $loaded;
    }

    $defaults = [
        'appName' => 'CCC',
        'appSubtitle' => 'C プログラミングの自習と理解度確認のための演習環境です。',
        'difficultyLabels' => ['基礎', '中級', '発展'],
        'understandingLabels' => ['要復習', 'ふつう', '自信あり'],
        'tabWidth' => 4,
        'editorRows' => 20,
        'longExampleLineThreshold' => 30,
        'resultPreviewMaxLines' => 120,
        'resultPreviewMaxChars' => 6000,
        'resultMessagePreviewMaxLines' => 40,
        'judgeTimeoutSeconds' => 10,
        'maxCodeBytes' => 65536,
        'languageProfile' => [
            'language' => 'c',
            'compiler' => 'gcc-head-c',
            'standard' => 'c23',
            'gnuExtensions' => false,
            'extraFlags' => ['-Wall', '-Wextra', '-Wvla', '-Wstrict-prototypes', '-Wconversion', '-Wshadow', '-pedantic', '-lm'],
        ],
    ];

    $path = CCC_CONFIG_DIR . DIRECTORY_SEPARATOR . 'app.json';
    if (!is_file($path)) {
        $loaded = $defaults;
        return $loaded;
    }

    $raw = file_get_contents($path);
    $decoded = json_decode($raw ?: '', true);
    if (!is_array($decoded)) {
        throw new RuntimeException('config/app.json is not valid JSON.');
    }

    $loaded = ccc_array_merge_recursive_distinct($defaults, $decoded);
    return $loaded;
}

function ccc_array_merge_recursive_distinct(array $defaults, array $override): array
{
    $merged = $defaults;
    foreach ($override as $key => $value) {
        if (is_array($value) && isset($merged[$key]) && is_array($merged[$key]) && ccc_is_associative($value)) {
            $merged[$key] = ccc_array_merge_recursive_distinct($merged[$key], $value);
            continue;
        }
        $merged[$key] = $value;
    }
    return $merged;
}

function ccc_is_associative(array $value): bool
{
    return array_keys($value) !== range(0, count($value) - 1);
}
