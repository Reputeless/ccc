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
        'courseId' => 'ccc-demo',
        'courseLabel' => 'CCC Demo Course',
        'copyrightNotice' => '© CCC',
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
        'defaultProfileId' => 'c23',
        'languageProfiles' => [
            'c17' => [
                'language' => 'c',
                'compiler' => 'gcc-head-c',
                'standard' => 'c17',
                'gnuExtensions' => false,
                'editorIndentStyle' => 'tab',
                'editorIndentWidth' => 4,
                'extraFlags' => ['-Wall', '-Wextra', '-Wvla', '-Wstrict-prototypes', '-Wconversion', '-Wshadow', '-pedantic', '-lm'],
            ],
            'c23' => [
                'language' => 'c',
                'compiler' => 'gcc-head-c',
                'standard' => 'c23',
                'gnuExtensions' => false,
                'editorIndentStyle' => 'tab',
                'editorIndentWidth' => 4,
                'extraFlags' => ['-Wall', '-Wextra', '-Wvla', '-Wstrict-prototypes', '-Wconversion', '-Wshadow', '-pedantic', '-lm'],
            ],
            'cpp20' => [
                'language' => 'cpp',
                'compiler' => 'gcc-head',
                'standard' => 'c++20',
                'gnuExtensions' => false,
                'editorIndentStyle' => 'tab',
                'editorIndentWidth' => 4,
                'extraFlags' => ['-Wall', '-Wextra', '-Wconversion', '-Wshadow', '-pedantic'],
            ],
            'cpp23' => [
                'language' => 'cpp',
                'compiler' => 'gcc-head',
                'standard' => 'c++23',
                'gnuExtensions' => false,
                'editorIndentStyle' => 'tab',
                'editorIndentWidth' => 4,
                'extraFlags' => ['-Wall', '-Wextra', '-Wconversion', '-Wshadow', '-pedantic'],
            ],
            'python3.14' => [
                'language' => 'python',
                'compiler' => 'cpython-3.14.0',
                'standard' => null,
                'gnuExtensions' => false,
                'editorIndentStyle' => 'spaces',
                'editorIndentWidth' => 4,
                'extraFlags' => [],
            ],
        ],
    ];

    $path = CCC_CONFIG_DIR . DIRECTORY_SEPARATOR . 'app.json';
    if (!is_file($path)) {
        $loaded = ccc_normalize_app_config($defaults);
        return $loaded;
    }

    $raw = file_get_contents($path);
    $decoded = json_decode($raw ?: '', true);
    if (!is_array($decoded)) {
        throw new RuntimeException('config/app.json is not valid JSON.');
    }

    $loaded = ccc_normalize_app_config(ccc_array_merge_recursive_distinct($defaults, $decoded));
    return $loaded;
}

function ccc_normalize_app_config(array $config): array
{
    $defaultProfileIdText = trim((string) ($config['defaultProfileId'] ?? 'c23'));
    if ($defaultProfileIdText === '') {
        $defaultProfileIdText = 'c23';
    }
    $defaultProfileId = ccc_normalize_profile_id($defaultProfileIdText);

    $legacyProfile = isset($config['languageProfile']) && is_array($config['languageProfile'])
        ? $config['languageProfile']
        : null;
    $profiles = $config['languageProfiles'] ?? null;

    if (!is_array($profiles) || $profiles === [] || !ccc_is_associative($profiles)) {
        $profiles = [
            $defaultProfileId => $legacyProfile ?? ccc_default_language_profile(),
        ];
    }

    $normalizedProfiles = [];
    foreach ($profiles as $profileId => $profile) {
        $normalizedProfiles[ccc_normalize_profile_id((string) $profileId)] = ccc_normalize_language_profile($profile);
    }

    if (!isset($normalizedProfiles[$defaultProfileId])) {
        if ($legacyProfile !== null) {
            $normalizedProfiles[$defaultProfileId] = ccc_normalize_language_profile($legacyProfile);
        } else {
            throw new RuntimeException('defaultProfileId does not exist in languageProfiles.');
        }
    }

    $config['defaultProfileId'] = $defaultProfileId;
    $config['languageProfiles'] = $normalizedProfiles;
    $config['languageProfile'] = $normalizedProfiles[$defaultProfileId];

    return $config;
}

function ccc_default_language_profile(): array
{
    return [
        'language' => 'c',
        'compiler' => 'gcc-head-c',
        'standard' => 'c23',
        'gnuExtensions' => false,
        'editorIndentStyle' => 'tab',
        'editorIndentWidth' => 4,
        'extraFlags' => ['-Wall', '-Wextra', '-Wvla', '-Wstrict-prototypes', '-Wconversion', '-Wshadow', '-pedantic', '-lm'],
    ];
}

function ccc_default_language_profile_for_language(string $language): array
{
    return match ($language) {
        'cpp' => [
            'language' => 'cpp',
            'compiler' => 'gcc-head',
            'standard' => 'c++23',
            'gnuExtensions' => false,
            'editorIndentStyle' => 'tab',
            'editorIndentWidth' => 4,
            'extraFlags' => ['-Wall', '-Wextra', '-Wconversion', '-Wshadow', '-pedantic'],
        ],
        'python' => [
            'language' => 'python',
            'compiler' => 'cpython-3.14.0',
            'standard' => null,
            'gnuExtensions' => false,
            'editorIndentStyle' => 'spaces',
            'editorIndentWidth' => 4,
            'extraFlags' => [],
        ],
        default => ccc_default_language_profile(),
    };
}

function ccc_normalize_profile_id(string $profileId): string
{
    $profileId = trim($profileId);
    if ($profileId === '' || preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/', $profileId) !== 1) {
        throw new RuntimeException('Invalid language profile id.');
    }

    return $profileId;
}

function ccc_normalize_language_profile(mixed $profile): array
{
    if (!is_array($profile)) {
        throw new RuntimeException('Invalid language profile.');
    }

    $language = trim((string) ($profile['language'] ?? 'c'));
    $merged = ccc_array_merge_recursive_distinct(
        ccc_default_language_profile_for_language($language),
        $profile
    );

    $language = trim((string) ($merged['language'] ?? ''));
    $compiler = trim((string) ($merged['compiler'] ?? ''));
    $standard = trim((string) ($merged['standard'] ?? ''));
    $extraFlags = is_array($merged['extraFlags'] ?? null) ? $merged['extraFlags'] : [];

    if ($language === '' || $compiler === '') {
        throw new RuntimeException('Language profile requires language and compiler.');
    }

    return [
        'language' => $language,
        'compiler' => $compiler,
        'standard' => $standard === '' ? null : $standard,
        'gnuExtensions' => (bool) ($merged['gnuExtensions'] ?? false),
        'editorIndentStyle' => ccc_normalize_indent_style((string) ($merged['editorIndentStyle'] ?? 'tab')),
        'editorIndentWidth' => ccc_normalize_indent_width($merged['editorIndentWidth'] ?? 4),
        'extraFlags' => array_values(array_filter(array_map(
            static fn (mixed $flag): string => trim((string) $flag),
            $extraFlags
        ), static fn (string $flag): bool => $flag !== '')),
    ];
}

function ccc_normalize_indent_style(string $style): string
{
    $style = trim(strtolower($style));
    return $style === 'spaces' ? 'spaces' : 'tab';
}

function ccc_normalize_indent_width(mixed $width): int
{
    $normalized = is_numeric((string) $width) ? (int) $width : 4;
    if ($normalized < 1 || $normalized > 8) {
        return 4;
    }

    return $normalized;
}

function ccc_resolve_language_profile(array $config, ?string $profileId = null): array
{
    $effectiveProfileId = $profileId !== null && trim($profileId) !== ''
        ? ccc_normalize_profile_id($profileId)
        : (string) ($config['defaultProfileId'] ?? 'c-default');
    $profiles = $config['languageProfiles'] ?? [];

    if (!isset($profiles[$effectiveProfileId]) || !is_array($profiles[$effectiveProfileId])) {
        throw new RuntimeException('Unknown language profile: ' . $effectiveProfileId);
    }

    return [
        'id' => $effectiveProfileId,
        ...$profiles[$effectiveProfileId],
    ];
}

function ccc_build_language_profile_summary(array $profile): array
{
    return [
        'id' => (string) ($profile['id'] ?? ''),
        'language' => (string) ($profile['language'] ?? ''),
        'compiler' => (string) ($profile['compiler'] ?? ''),
        'standard' => $profile['standard'] ?? null,
        'gnuExtensions' => (bool) ($profile['gnuExtensions'] ?? false),
        'editorIndentStyle' => (string) ($profile['editorIndentStyle'] ?? 'tab'),
        'editorIndentWidth' => (int) ($profile['editorIndentWidth'] ?? 4),
    ];
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
