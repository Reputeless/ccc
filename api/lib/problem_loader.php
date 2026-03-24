<?php
declare(strict_types=1);

function ccc_list_problem_summaries(): array
{
    $items = [];
    foreach (ccc_problem_directories() as $problemId) {
        $manifest = ccc_load_problem_manifest($problemId);
        if ($manifest === null || !ccc_problem_is_published($manifest)) {
            continue;
        }

        $items[] = [
            'id' => $manifest['id'],
            'title' => $manifest['title'],
            'lecture' => $manifest['lecture'],
            'difficulty' => $manifest['difficulty'],
        ];
    }

    usort($items, static function (array $left, array $right): int {
        $leftLecture = $left['lecture'] ?? PHP_INT_MAX;
        $rightLecture = $right['lecture'] ?? PHP_INT_MAX;
        if ($leftLecture !== $rightLecture) {
            return $leftLecture <=> $rightLecture;
        }
        return strcmp((string) $left['id'], (string) $right['id']);
    });

    return $items;
}

function ccc_load_problem_detail(string $problemId): ?array
{
    $manifest = ccc_load_problem_manifest($problemId);
    if ($manifest === null || !ccc_problem_is_published($manifest)) {
        return null;
    }

    $renderer = new CccMarkdownRenderer($manifest['id']);

    return [
        'id' => $manifest['id'],
        'title' => $manifest['title'],
        'lecture' => $manifest['lecture'],
        'difficulty' => $manifest['difficulty'],
        'bodyHtml' => $renderer->render(ccc_load_problem_body($manifest)),
        'examples' => ccc_load_problem_examples($manifest),
    ];
}

function ccc_load_problem_for_judge(string $problemId): ?array
{
    $manifest = ccc_load_problem_manifest($problemId);
    if ($manifest === null || !ccc_problem_is_published($manifest)) {
        return null;
    }

    return [
        'id' => $manifest['id'],
        'title' => $manifest['title'],
        'examples' => ccc_load_problem_examples($manifest),
    ];
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

    return [
        'id' => $id,
        'title' => $title,
        'lecture' => $lecture,
        'difficulty' => $difficulty,
        'publishedAt' => $publishedAt,
        'examples' => array_map(static fn ($item) => trim((string) $item), $examples),
        '_dir' => $problemDir,
    ];
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
