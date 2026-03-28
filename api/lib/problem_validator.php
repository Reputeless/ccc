<?php
declare(strict_types=1);

function ccc_validate_problem_set(?array $config = null): array
{
    $config ??= ccc_load_app_config();
    $items = [];

    foreach (ccc_problem_directories() as $directory) {
        $items[] = ccc_validate_problem_directory($directory, $config);
    }

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
        $row['errors'][] = '`problem.json` is missing.';
        return $row;
    }

    try {
        $decoded = ccc_read_problem_manifest_json($directory);
    } catch (Throwable) {
        $row['errors'][] = '`problem.json` is not valid JSON.';
        return $row;
    }

    if (!is_array($decoded)) {
        $row['errors'][] = '`problem.json` is missing.';
        return $row;
    }

    ccc_fill_problem_validation_row($row, $decoded);
    ccc_validate_problem_manifest_fields($row, $decoded, $config);

    return $row;
}

function ccc_create_problem_validation_row(string $directory): array
{
    return [
        'directory' => $directory,
        'id' => $directory,
        'type' => '',
        'number' => '',
        'title' => '',
        'lecture' => '',
        'difficulty' => '',
        'profileId' => '',
        'publishedAt' => '',
        'items' => '',
        'guide' => '',
        'errors' => [],
        'warnings' => [],
        'details' => [],
        'status' => 'error',
    ];
}

function ccc_fill_problem_validation_row(array &$row, array $decoded): void
{
    $row['type'] = trim((string) ($decoded['type'] ?? ''));
    $row['number'] = trim((string) ($decoded['number'] ?? ''));
    $row['title'] = trim((string) ($decoded['title'] ?? ''));
    $row['lecture'] = ccc_problem_validation_scalar_display($decoded['lecture'] ?? null);
    $row['difficulty'] = ccc_problem_validation_scalar_display($decoded['difficulty'] ?? null);
    $row['profileId'] = trim((string) ($decoded['profileId'] ?? ''));
    $row['publishedAt'] = trim((string) ($decoded['publishedAt'] ?? ''));
}

function ccc_validate_problem_manifest_fields(array &$row, array $decoded, array $config): void
{
    if ($row['type'] === '') {
        $row['errors'][] = '`type` is required.';
    } elseif ($row['type'] !== 'code') {
        $row['errors'][] = '`type` must be `code`.';
    }

    if ($row['number'] === '') {
        $row['errors'][] = '`number` is required.';
    }

    if ($row['title'] === '') {
        $row['errors'][] = '`title` is required.';
    }

    ccc_validate_problem_optional_integer($row, $decoded, 'lecture');
    ccc_validate_problem_optional_integer($row, $decoded, 'difficulty');

    if ($row['difficulty'] !== '') {
        $difficultyValue = (int) $row['difficulty'];
        if ($difficultyValue < 1 || $difficultyValue > 3) {
            $row['errors'][] = '`difficulty` must be an integer from 1 to 3.';
        }
    }

    if ($row['profileId'] !== '') {
        $profileId = trim($row['profileId']);
        if (preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/', $profileId) !== 1) {
            $row['errors'][] = '`profileId` has an invalid format.';
        } elseif (!isset($config['languageProfiles'][$profileId])) {
            $row['errors'][] = '`profileId` is not defined in `config/app.json`.';
        }
    }

    if ($row['publishedAt'] !== '') {
        try {
            new DateTimeImmutable($row['publishedAt']);
        } catch (Exception $exception) {
            $row['errors'][] = '`publishedAt` has an invalid format.';
        }
    }

    ccc_validate_problem_example_files($row);

    $bodyPath = ccc_problem_body_path($row['directory']);
    if (!is_file($bodyPath)) {
        $row['errors'][] = '`body.md` is missing.';
    }

    $row['guide'] = is_file(ccc_problem_guide_path($row['directory'])) ? 'available' : '';
}

function ccc_validate_problem_example_files(array &$row): void
{
    $exampleFiles = ccc_scan_problem_example_files($row['directory']);
    $detectedNames = [];
    $hasMissingEarlierSlot = false;

    foreach ($exampleFiles as $exampleFile) {
        $name = $exampleFile['name'];
        if (!$exampleFile['hasAny']) {
            $hasMissingEarlierSlot = true;
            continue;
        }

        if ($hasMissingEarlierSlot) {
            $row['errors'][] = 'Example files must use consecutive names from `01`.';
            break;
        }

        if (!$exampleFile['inputExists']) {
            $row['errors'][] = sprintf('`%s.in.txt` is missing.', $name);
        }
        if (!$exampleFile['outputExists']) {
            $row['errors'][] = sprintf('`%s.out.txt` is missing.', $name);
        }

        $detectedNames[] = $name;
    }

    if ($detectedNames === []) {
        $row['errors'][] = 'At least one example file pair is required.';
        $row['items'] = '';
        return;
    }

    $row['items'] = implode(', ', $detectedNames);
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
        $row['errors'][] = sprintf('`%s` must be an integer.', $field);
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
            $message = sprintf('`%s` is duplicated.', $field);
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
