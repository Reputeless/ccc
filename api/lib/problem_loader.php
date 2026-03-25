<?php
declare(strict_types=1);

function ccc_list_problem_summaries(?array $config = null): array
{
    $items = [];
    foreach (ccc_problem_directories() as $problemId) {
        $manifest = ccc_load_problem_manifest($problemId);
        if ($manifest === null || !ccc_problem_is_published($manifest)) {
            continue;
        }

        if ($config !== null) {
            ccc_resolve_problem_language_profile($manifest, $config);
        }

        $items[] = ccc_build_problem_summary($manifest);
    }

    usort($items, 'ccc_compare_problem_summaries');

    return $items;
}

function ccc_load_problem_detail(string $problemId, ?array $config = null): ?array
{
    $manifest = ccc_load_problem_manifest($problemId);
    if ($manifest === null || !ccc_problem_is_published($manifest)) {
        return null;
    }

    $config ??= ccc_load_app_config();
    $profile = ccc_resolve_problem_language_profile($manifest, $config);
    $renderer = new CccMarkdownRenderer($manifest['id']);

    return [
        ...ccc_build_problem_summary($manifest),
        'profileId' => $profile['id'],
        'languageProfile' => ccc_build_language_profile_summary($profile),
        'bodyHtml' => $renderer->render(ccc_load_problem_body($manifest)),
        'examples' => ccc_load_problem_examples($manifest),
    ];
}

function ccc_load_problem_for_judge(string $problemId, ?array $config = null): ?array
{
    $manifest = ccc_load_problem_manifest($problemId);
    if ($manifest === null || !ccc_problem_is_published($manifest)) {
        return null;
    }

    $config ??= ccc_load_app_config();
    $profile = ccc_resolve_problem_language_profile($manifest, $config);

    return [
        'id' => $manifest['id'],
        'title' => $manifest['title'],
        'profileId' => $profile['id'],
        'languageProfile' => $profile,
        'examples' => ccc_load_problem_examples($manifest),
    ];
}

function ccc_build_problem_summary(array $manifest): array
{
    return [
        'id' => $manifest['id'],
        'number' => $manifest['number'],
        'title' => $manifest['title'],
        'lecture' => $manifest['lecture'],
        'difficulty' => $manifest['difficulty'],
    ];
}

function ccc_compare_problem_summaries(array $left, array $right): int
{
    $leftLecture = $left['lecture'] ?? PHP_INT_MAX;
    $rightLecture = $right['lecture'] ?? PHP_INT_MAX;
    if ($leftLecture !== $rightLecture) {
        return $leftLecture <=> $rightLecture;
    }

    $leftNumber = trim((string) ($left['number'] ?? ''));
    $rightNumber = trim((string) ($right['number'] ?? ''));
    if ($leftNumber !== '' || $rightNumber !== '') {
        $numberCompare = strcmp(
            $leftNumber !== '' ? $leftNumber : (string) $left['id'],
            $rightNumber !== '' ? $rightNumber : (string) $right['id']
        );
        if ($numberCompare !== 0) {
            return $numberCompare;
        }
    }

    return strcmp((string) $left['id'], (string) $right['id']);
}

function ccc_problem_directories(): array
{
    if (!is_dir(CCC_PROBLEMS_DIR)) {
        return [];
    }

    $items = scandir(CCC_PROBLEMS_DIR);
    if ($items === false) {
        return [];
    }

    $directories = [];
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $path = CCC_PROBLEMS_DIR . DIRECTORY_SEPARATOR . $item;
        if (is_dir($path)) {
            $directories[] = $item;
        }
    }
    return $directories;
}

function ccc_load_problem_manifest(string $problemId): ?array
{
    if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/', $problemId)) {
        throw new InvalidArgumentException('Invalid problem id format.');
    }

    $problemDir = CCC_PROBLEMS_DIR . DIRECTORY_SEPARATOR . $problemId;
    $manifestPath = $problemDir . DIRECTORY_SEPARATOR . 'problem.json';
    if (!is_file($manifestPath)) {
        return null;
    }

    $raw = file_get_contents($manifestPath);
    $decoded = json_decode($raw ?: '', true);
    if (!is_array($decoded)) {
        throw new RuntimeException($problemId . '/problem.json is not valid JSON.');
    }

    $id = isset($decoded['id']) ? trim((string) $decoded['id']) : '';
    $number = array_key_exists('number', $decoded) ? trim((string) $decoded['number']) : null;
    $title = isset($decoded['title']) ? trim((string) $decoded['title']) : '';
    $examples = $decoded['examples'] ?? null;

    if ($id === '' || $title === '') {
        throw new RuntimeException($problemId . '/problem.json requires id and title.');
    }
    if (!is_array($examples) || count($examples) < 1 || count($examples) > 6) {
        throw new RuntimeException($problemId . '/problem.json requires 1 to 6 examples.');
    }

    $lecture = array_key_exists('lecture', $decoded) ? ccc_optional_int($decoded['lecture'], 'lecture') : null;
    $difficulty = array_key_exists('difficulty', $decoded) ? ccc_optional_int($decoded['difficulty'], 'difficulty') : null;
    if ($difficulty !== null && ($difficulty < 1 || $difficulty > 3)) {
        throw new RuntimeException($problemId . '/problem.json difficulty must be 1-3.');
    }

    $publishedAt = array_key_exists('publishedAt', $decoded) ? trim((string) $decoded['publishedAt']) : null;
    if ($publishedAt === '') {
        $publishedAt = null;
    }
    $profileId = array_key_exists('profileId', $decoded) ? trim((string) $decoded['profileId']) : null;
    if ($profileId === '') {
        $profileId = null;
    } elseif ($profileId !== null) {
        $profileId = ccc_normalize_profile_id($profileId);
    }

    return [
        'id' => $id,
        'number' => $number === '' ? null : $number,
        'title' => $title,
        'lecture' => $lecture,
        'difficulty' => $difficulty,
        'publishedAt' => $publishedAt,
        'profileId' => $profileId,
        'examples' => array_map(static fn ($item) => trim((string) $item), $examples),
        '_dir' => $problemDir,
    ];
}

function ccc_resolve_problem_language_profile(array $manifest, array $config): array
{
    return ccc_resolve_language_profile($config, $manifest['profileId'] ?? null);
}

function ccc_problem_is_published(array $manifest): bool
{
    $publishedAt = $manifest['publishedAt'];
    if ($publishedAt === null) {
        return true;
    }

    try {
        $publishedTime = new DateTimeImmutable($publishedAt);
    } catch (Exception $exception) {
        throw new RuntimeException($manifest['id'] . '/problem.json has invalid publishedAt.');
    }

    return $publishedTime <= new DateTimeImmutable('now');
}

function ccc_load_problem_body(array $manifest): string
{
    $bodyPath = $manifest['_dir'] . DIRECTORY_SEPARATOR . 'body.md';
    if (!is_file($bodyPath)) {
        throw new RuntimeException($manifest['id'] . '/body.md is missing.');
    }

    $body = file_get_contents($bodyPath);
    if ($body === false) {
        throw new RuntimeException($manifest['id'] . '/body.md could not be read.');
    }

    return $body;
}

function ccc_load_problem_examples(array $manifest): array
{
    $examples = [];
    foreach ($manifest['examples'] as $name) {
        if ($name === '') {
            throw new RuntimeException($manifest['id'] . '/problem.json contains an empty example name.');
        }

        $inputPath = $manifest['_dir'] . DIRECTORY_SEPARATOR . $name . '.in.txt';
        $outputPath = $manifest['_dir'] . DIRECTORY_SEPARATOR . $name . '.out.txt';
        if (!is_file($inputPath) || !is_file($outputPath)) {
            throw new RuntimeException($manifest['id'] . ' example files are missing for "' . $name . '".');
        }

        $stdin = file_get_contents($inputPath);
        $stdout = file_get_contents($outputPath);
        if ($stdin === false || $stdout === false) {
            throw new RuntimeException($manifest['id'] . ' example files could not be read for "' . $name . '".');
        }

        $examples[] = [
            'name' => $name,
            'stdin' => ccc_normalize_file_newlines($stdin),
            'stdout' => ccc_normalize_file_newlines($stdout),
        ];
    }

    return $examples;
}

function ccc_normalize_file_newlines(string $content): string
{
    return str_replace(["\r\n", "\r"], "\n", $content);
}

function ccc_optional_int(mixed $value, string $field): ?int
{
    if ($value === null || $value === '') {
        return null;
    }
    if (!is_int($value) && !is_string($value) && !is_float($value)) {
        throw new RuntimeException('Invalid ' . $field . ' value.');
    }
    if (!is_numeric((string) $value)) {
        throw new RuntimeException('Invalid ' . $field . ' value.');
    }
    return (int) $value;
}
