<?php
declare(strict_types=1);

function ccc_validate_problem_set(?array $config = null): array
{
    $config ??= ccc_load_app_config();
    $items = [];

    foreach (ccc_problem_directories() as $directory) {
        $items[] = ccc_validate_problem_directory($directory, $config);
    }

    ccc_apply_duplicate_problem_validation($items, 'id', 'error');
    ccc_apply_duplicate_problem_validation($items, 'number', 'warning');

    $summary = ['ok' => 0, 'warning' => 0, 'error' => 0];
    foreach ($items as &$item) {
        $item['status'] = ccc_problem_validation_status($item);
        $summary[$item['status']]++;
        $item['details'] = [...$item['errors'], ...$item['warnings']];
    }
    unset($item);

    return [
        'items' => $items,
        'summary' => $summary,
    ];
}

function ccc_validate_problem_directory(string $directory, array $config): array
{
    $manifestPath = ccc_problem_manifest_path($directory);
    $row = ccc_create_problem_validation_row($directory);

    if (!is_file($manifestPath)) {
        $row['errors'][] = 'problem.json がありません。';
        return $row;
    }

    try {
        $decoded = ccc_read_problem_manifest_json($directory);
    } catch (Throwable) {
        $row['errors'][] = 'problem.json が正しい JSON ではありません。';
        return $row;
    }

    if (!is_array($decoded)) {
        $row['errors'][] = 'problem.json がありません。';
        return $row;
    }

    ccc_fill_problem_validation_row($row, $decoded);
    ccc_validate_problem_manifest_fields($row, $decoded, $config);

    if (($row['id'] ?? '') !== '' && $row['id'] !== $directory) {
        $row['warnings'][] = 'フォルダ名と id が一致していません。';
    }

    return $row;
}

function ccc_create_problem_validation_row(string $directory): array
{
    return [
        'directory' => $directory,
        'id' => '',
        'number' => '',
        'title' => '',
        'lecture' => '',
        'difficulty' => '',
        'profileId' => '',
        'publishedAt' => '',
        'examples' => '',
        'errors' => [],
        'warnings' => [],
        'details' => [],
        'status' => 'error',
    ];
}

function ccc_fill_problem_validation_row(array &$row, array $decoded): void
{
    $row['id'] = trim((string) ($decoded['id'] ?? ''));
    $row['number'] = trim((string) ($decoded['number'] ?? ''));
    $row['title'] = trim((string) ($decoded['title'] ?? ''));
    $row['lecture'] = ccc_problem_validation_scalar_display($decoded['lecture'] ?? null);
    $row['difficulty'] = ccc_problem_validation_scalar_display($decoded['difficulty'] ?? null);
    $row['profileId'] = trim((string) ($decoded['profileId'] ?? ''));
    $row['publishedAt'] = trim((string) ($decoded['publishedAt'] ?? ''));

    $examples = $decoded['examples'] ?? null;
    if (is_array($examples)) {
        $row['examples'] = json_encode(array_values($examples), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '[invalid]';
    } elseif ($examples !== null) {
        $row['examples'] = ccc_problem_validation_scalar_display($examples);
    }
}

function ccc_validate_problem_manifest_fields(array &$row, array $decoded, array $config): void
{
    if ($row['id'] === '') {
        $row['errors'][] = 'id がありません。';
    } elseif (preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/', $row['id']) !== 1) {
        $row['errors'][] = 'id の形式が不正です。';
    }

    if ($row['number'] === '') {
        $row['errors'][] = 'number がありません。';
    }

    if ($row['title'] === '') {
        $row['errors'][] = 'title がありません。';
    }

    ccc_validate_problem_optional_integer($row, $decoded, 'lecture');
    ccc_validate_problem_optional_integer($row, $decoded, 'difficulty');

    if ($row['difficulty'] !== '') {
        $difficultyValue = (int) $row['difficulty'];
        if ($difficultyValue < 1 || $difficultyValue > 3) {
            $row['errors'][] = 'difficulty は 1 から 3 の整数である必要があります。';
        }
    }

    if ($row['profileId'] !== '') {
        $profileId = trim($row['profileId']);
        if (preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/', $profileId) !== 1) {
            $row['errors'][] = 'profileId の形式が不正です。';
        } elseif (!isset($config['languageProfiles'][$profileId])) {
            $row['errors'][] = 'profileId が config/app.json に定義されていません。';
        }
    }

    if ($row['publishedAt'] !== '') {
        try {
            new DateTimeImmutable($row['publishedAt']);
        } catch (Exception $exception) {
            $row['errors'][] = 'publishedAt の形式が不正です。';
        }
    }

    $examples = $decoded['examples'] ?? null;
    if (!is_array($examples)) {
        $row['errors'][] = 'examples は配列である必要があります。';
    } else {
        $exampleNames = array_map(static fn (mixed $value): string => trim((string) $value), $examples);
        if (count($exampleNames) < 1 || count($exampleNames) > 6) {
            $row['errors'][] = 'examples は 1 件以上 6 件以下である必要があります。';
        }

        if (count(array_unique($exampleNames)) !== count($exampleNames)) {
            $row['errors'][] = 'examples に重複があります。';
        }

        foreach ($exampleNames as $name) {
            if ($name === '') {
                $row['errors'][] = 'examples に空文字が含まれています。';
                continue;
            }

            $inputPath = ccc_problem_example_input_path($row['directory'], $name);
            $outputPath = ccc_problem_example_output_path($row['directory'], $name);

            if (!is_file($inputPath)) {
                $row['errors'][] = $name . '.in.txt がありません。';
            }
            if (!is_file($outputPath)) {
                $row['errors'][] = $name . '.out.txt がありません。';
            }
        }
    }

    $bodyPath = ccc_problem_body_path($row['directory']);
    if (!is_file($bodyPath)) {
        $row['errors'][] = 'body.md がありません。';
    }
}

function ccc_validate_problem_optional_integer(array &$row, array $decoded, string $field): void
{
    if (!array_key_exists($field, $decoded)) {
        return;
    }

    $value = $decoded[$field];
    if ($value === null || $value === '') {
        $row[$field] = '';
        return;
    }

    $text = is_string($value) ? trim($value) : (string) $value;
    if (preg_match('/^-?\d+$/', $text) !== 1) {
        $row['errors'][] = $field . ' は整数である必要があります。';
        return;
    }

    $row[$field] = $text;
}

function ccc_problem_validation_scalar_display(mixed $value): string
{
    if ($value === null) {
        return '';
    }
    if (is_bool($value)) {
        return $value ? 'true' : 'false';
    }
    if (is_scalar($value)) {
        return trim((string) $value);
    }

    return '[invalid]';
}

function ccc_apply_duplicate_problem_validation(array &$items, string $field, string $level): void
{
    $buckets = [];
    foreach ($items as $index => $item) {
        $value = trim((string) ($item[$field] ?? ''));
        if ($value === '') {
            continue;
        }
        $buckets[$value][] = $index;
    }

    foreach ($buckets as $value => $indexes) {
        if (count($indexes) < 2) {
            continue;
        }

        foreach ($indexes as $index) {
            $message = $field . ' が重複しています。';
            if ($level === 'error') {
                $items[$index]['errors'][] = $message;
            } else {
                $items[$index]['warnings'][] = $message;
            }
        }
    }
}

function ccc_problem_validation_status(array $item): string
{
    if ($item['errors'] !== []) {
        return 'error';
    }
    if ($item['warnings'] !== []) {
        return 'warning';
    }
    return 'ok';
}
