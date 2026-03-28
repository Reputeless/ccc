<?php
declare(strict_types=1);

function ccc_list_problem_summaries(?array $config = null): array
{
    $items = [];
    foreach (ccc_problem_directories() as $problemId) {
        try {
            $manifest = ccc_load_problem_manifest($problemId);
            if ($manifest === null || !ccc_problem_is_published($manifest)) {
                continue;
            }

            if ($config !== null) {
                ccc_resolve_problem_language_profile($manifest, $config);
            }

            $items[] = ccc_build_problem_summary($manifest);
        } catch (Throwable $throwable) {
            error_log('[CCC problems] Skipped invalid problem "' . $problemId . '": ' . $throwable->getMessage());
            continue;
        }
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
    $renderer = new CccMarkdownRenderer($manifest['id']);
    $detail = [
        ...ccc_build_problem_summary($manifest),
        'bodyHtml' => $renderer->render(ccc_load_problem_body($manifest)),
        'guideHtml' => ccc_load_problem_guide_html($manifest, $renderer),
    ];

    if ($manifest['type'] === 'code') {
        $profile = ccc_resolve_problem_language_profile($manifest, $config);
        return [
            ...$detail,
            'profileId' => $profile['id'],
            'languageProfile' => ccc_build_language_profile_summary($profile),
            'examples' => ccc_load_problem_examples($manifest),
            'textItems' => [],
        ];
    }

    return [
        ...$detail,
        'profileId' => null,
        'languageProfile' => null,
        'examples' => [],
        'textItems' => ccc_load_problem_text_items($manifest),
    ];
}

function ccc_load_problem_for_judge(string $problemId, ?array $config = null): ?array
{
    $manifest = ccc_load_problem_manifest($problemId);
    if ($manifest === null || !ccc_problem_is_published($manifest)) {
        return null;
    }

    $config ??= ccc_load_app_config();
    $problem = [
        'id' => $manifest['id'],
        'title' => $manifest['title'],
        'type' => $manifest['type'],
    ];

    if ($manifest['type'] === 'code') {
        $profile = ccc_resolve_problem_language_profile($manifest, $config);
        return [
            ...$problem,
            'profileId' => $profile['id'],
            'languageProfile' => $profile,
            'examples' => ccc_load_problem_examples($manifest),
            'textItems' => [],
        ];
    }

    return [
        ...$problem,
        'profileId' => null,
        'languageProfile' => null,
        'examples' => [],
        'textItems' => ccc_load_problem_text_items($manifest),
    ];
}

function ccc_build_problem_summary(array $manifest): array
{
    return [
        'id' => $manifest['id'],
        'type' => $manifest['type'],
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
    $decoded = ccc_read_problem_manifest_json($problemId);
    if ($decoded === null) {
        return null;
    }

    $id = $problemId;
    $number = array_key_exists('number', $decoded) ? trim((string) $decoded['number']) : null;
    $title = isset($decoded['title']) ? trim((string) $decoded['title']) : '';
    $type = array_key_exists('type', $decoded) ? trim((string) $decoded['type']) : '';
    if ($number === null || $number === '') {
        throw new RuntimeException($problemId . '/problem.json requires number.');
    }
    if ($title === '') {
        throw new RuntimeException($problemId . '/problem.json requires title.');
    }
    if ($type === '') {
        throw new RuntimeException($problemId . '/problem.json requires type.');
    }
    if (!in_array($type, ['code', 'text'], true)) {
        throw new RuntimeException($problemId . '/problem.json type must be "code" or "text".');
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
        'type' => $type,
        'number' => $number,
        'title' => $title,
        'lecture' => $lecture,
        'difficulty' => $difficulty,
        'publishedAt' => $publishedAt,
        'profileId' => $profileId,
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
    $bodyPath = ccc_problem_body_path($manifest['id']);
    if (!is_file($bodyPath)) {
        throw new RuntimeException($manifest['id'] . '/body.md is missing.');
    }

    $body = file_get_contents($bodyPath);
    if ($body === false) {
        throw new RuntimeException($manifest['id'] . '/body.md could not be read.');
    }

    return $body;
}

function ccc_load_problem_guide_html(array $manifest, CccMarkdownRenderer $renderer): ?string
{
    $guidePath = ccc_problem_guide_path($manifest['id']);
    if (!is_file($guidePath)) {
        return null;
    }

    $guide = file_get_contents($guidePath);
    if ($guide === false) {
        throw new RuntimeException($manifest['id'] . '/guide.md could not be read.');
    }

    return $renderer->render($guide);
}

function ccc_load_problem_examples(array $manifest): array
{
    $exampleFiles = ccc_scan_problem_example_files($manifest['id']);
    $examples = [];
    $hasMissingEarlierSlot = false;

    foreach ($exampleFiles as $exampleFile) {
        $name = $exampleFile['name'];
        if (!$exampleFile['hasAny']) {
            $hasMissingEarlierSlot = true;
            continue;
        }

        if ($hasMissingEarlierSlot) {
            throw new RuntimeException($manifest['id'] . ' example files must use consecutive names from `01`.');
        }

        if (!$exampleFile['inputExists'] || !$exampleFile['outputExists']) {
            throw new RuntimeException($manifest['id'] . ' example files are missing for "' . $name . '".');
        }

        $inputPath = ccc_problem_example_input_path($manifest['id'], $name);
        $outputPath = ccc_problem_example_output_path($manifest['id'], $name);
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

    if ($examples === []) {
        throw new RuntimeException($manifest['id'] . ' requires at least one example file pair.');
    }

    return $examples;
}

function ccc_load_problem_text_items(array $manifest): array
{
    $itemFiles = ccc_scan_problem_example_files($manifest['id']);
    $items = [];
    $hasMissingEarlierSlot = false;

    foreach ($itemFiles as $itemFile) {
        $name = $itemFile['name'];
        if (!$itemFile['hasAny']) {
            $hasMissingEarlierSlot = true;
            continue;
        }

        if ($hasMissingEarlierSlot) {
            throw new RuntimeException($manifest['id'] . ' item files must use consecutive names from `01`.');
        }

        if (!$itemFile['inputExists'] || !$itemFile['outputExists']) {
            throw new RuntimeException($manifest['id'] . ' item files are missing for "' . $name . '".');
        }

        $inputPath = ccc_problem_example_input_path($manifest['id'], $name);
        $outputPath = ccc_problem_example_output_path($manifest['id'], $name);
        $prompt = file_get_contents($inputPath);
        $answers = file_get_contents($outputPath);
        if ($prompt === false || $answers === false) {
            throw new RuntimeException($manifest['id'] . ' item files could not be read for "' . $name . '".');
        }

        $prompt = trim(ccc_normalize_file_newlines($prompt));
        if ($prompt === '') {
            throw new RuntimeException($manifest['id'] . ' item prompt is empty for "' . $name . '".');
        }

        $acceptedAnswers = ccc_parse_text_answer_candidates($answers);
        if ($acceptedAnswers === []) {
            throw new RuntimeException($manifest['id'] . ' item answers are empty for "' . $name . '".');
        }

        $items[] = [
            'name' => $name,
            'prompt' => $prompt,
            'acceptedAnswers' => $acceptedAnswers,
        ];
    }

    if ($items === []) {
        throw new RuntimeException($manifest['id'] . ' requires at least one item file pair.');
    }

    return $items;
}

function ccc_parse_text_answer_candidates(string $content): array
{
    $normalized = ccc_normalize_file_newlines($content);
    $lines = preg_split('/\n/', $normalized) ?: [];
    $items = [];

    foreach ($lines as $line) {
        $candidate = trim($line);
        if ($candidate !== '') {
            $items[] = $candidate;
        }
    }

    return array_values(array_unique($items));
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

    if (is_int($value)) {
        return $value;
    }

    if (!is_string($value) && !is_float($value)) {
        throw new RuntimeException('Invalid ' . $field . ' value.');
    }

    $text = is_string($value) ? trim($value) : (string) $value;
    if (preg_match('/^-?\d+$/', $text) !== 1) {
        throw new RuntimeException('Invalid ' . $field . ' value.');
    }

    return (int) $text;
}
