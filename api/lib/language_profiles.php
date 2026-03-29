<?php
declare(strict_types=1);

function ccc_default_language_profile(): array
{
    $profiles = ccc_built_in_language_profiles();
    return $profiles[ccc_default_profile_id()];
}

function ccc_default_profile_id(): string
{
    return 'c23';
}

function ccc_built_in_language_profiles(): array
{
    return [
        'c17' => [
            ...ccc_language_profile_defaults_for_language('c'),
            'label' => 'C17',
            'standard' => 'c17',
        ],
        'c23' => [
            ...ccc_language_profile_defaults_for_language('c'),
            'label' => 'C23',
            'standard' => 'c23',
        ],
        'cpp20' => [
            ...ccc_language_profile_defaults_for_language('cpp'),
            'label' => 'C++20',
            'standard' => 'c++20',
        ],
        'cpp23' => [
            ...ccc_language_profile_defaults_for_language('cpp'),
            'label' => 'C++23',
            'standard' => 'c++23',
        ],
        'python3.14' => [
            ...ccc_language_profile_defaults_for_language('python'),
            'label' => 'Python 3.14',
        ],
    ];
}

function ccc_generic_language_profile_defaults(): array
{
    return [
        'gnuExtensions' => false,
        'editorIndentStyle' => 'tab',
        'editorIndentWidth' => 4,
        'extraFlags' => [],
    ];
}

function ccc_language_profile_defaults_for_language(string $language): array
{
    $normalizedLanguage = ccc_normalize_language_name($language);
    $defaults = ccc_generic_language_profile_defaults();

    return match ($normalizedLanguage) {
        'c' => [
            ...$defaults,
            'language' => 'c',
            'compiler' => 'gcc-head-c',
            'standard' => 'c23',
            'extraFlags' => ['-Wall', '-Wextra', '-Wvla', '-Wstrict-prototypes', '-Wconversion', '-Wshadow', '-pedantic', '-lm'],
        ],
        'cpp' => [
            ...$defaults,
            'language' => 'cpp',
            'compiler' => 'gcc-head',
            'standard' => 'c++23',
            'extraFlags' => ['-Wall', '-Wextra', '-Wconversion', '-Wshadow', '-pedantic'],
        ],
        'python' => [
            ...$defaults,
            'language' => 'python',
            'compiler' => 'cpython-3.14.0',
            'standard' => null,
            'editorIndentStyle' => 'spaces',
        ],
        default => [
            ...$defaults,
            'language' => $normalizedLanguage,
            'compiler' => '',
            'standard' => null,
        ],
    };
}

function ccc_normalize_language_name(string $language): string
{
    $normalized = trim(strtolower($language));
    return $normalized === '' ? 'c' : $normalized;
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

    $language = ccc_normalize_language_name((string) ($profile['language'] ?? 'c'));
    $merged = ccc_array_merge_recursive_distinct(
        ccc_language_profile_defaults_for_language($language),
        $profile
    );

    $language = ccc_normalize_language_name((string) ($merged['language'] ?? ''));
    $compiler = trim((string) ($merged['compiler'] ?? ''));
    $standard = trim((string) ($merged['standard'] ?? ''));
    $extraFlags = is_array($merged['extraFlags'] ?? null) ? $merged['extraFlags'] : [];
    $label = trim((string) ($merged['label'] ?? ''));

    if ($language === '' || $compiler === '') {
        throw new RuntimeException('Language profile requires language and compiler.');
    }

    if ($label === '') {
        throw new RuntimeException('Language profile requires label.');
    }

    return [
        'language' => $language,
        'compiler' => $compiler,
        'standard' => $standard === '' ? null : $standard,
        'label' => $label,
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
        : (string) ($config['defaultProfileId'] ?? ccc_default_profile_id());
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
        'label' => (string) ($profile['label'] ?? ''),
        'gnuExtensions' => (bool) ($profile['gnuExtensions'] ?? false),
        'editorIndentStyle' => (string) ($profile['editorIndentStyle'] ?? 'tab'),
        'editorIndentWidth' => (int) ($profile['editorIndentWidth'] ?? 4),
    ];
}
