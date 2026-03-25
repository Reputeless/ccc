<?php
declare(strict_types=1);

function ccc_problem_directory_path(string $problemId): string
{
    return CCC_PROBLEMS_DIR . DIRECTORY_SEPARATOR . $problemId;
}

function ccc_problem_manifest_path(string $problemId): string
{
    return ccc_problem_directory_path($problemId) . DIRECTORY_SEPARATOR . 'problem.json';
}

function ccc_problem_body_path(string $problemId): string
{
    return ccc_problem_directory_path($problemId) . DIRECTORY_SEPARATOR . 'body.md';
}

function ccc_problem_example_input_path(string $problemId, string $exampleName): string
{
    return ccc_problem_directory_path($problemId) . DIRECTORY_SEPARATOR . $exampleName . '.in.txt';
}

function ccc_problem_example_output_path(string $problemId, string $exampleName): string
{
    return ccc_problem_directory_path($problemId) . DIRECTORY_SEPARATOR . $exampleName . '.out.txt';
}

function ccc_read_problem_manifest_json(string $problemId): ?array
{
    if (preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/', $problemId) !== 1) {
        throw new InvalidArgumentException('Invalid problem id format.');
    }

    $manifestPath = ccc_problem_manifest_path($problemId);
    if (!is_file($manifestPath)) {
        return null;
    }

    $raw = file_get_contents($manifestPath);
    $decoded = json_decode($raw ?: '', true);
    if (!is_array($decoded)) {
        throw new RuntimeException($problemId . '/problem.json is not valid JSON.');
    }

    return $decoded;
}
