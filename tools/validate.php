<?php
declare(strict_types=1);

const CCC_VALIDATE_EXIT_OK = 0;
const CCC_VALIDATE_EXIT_ERROR = 1;

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This script must be run from the command line.\n");
    exit(CCC_VALIDATE_EXIT_ERROR);
}

require_once dirname(__DIR__) . '/api/bootstrap.php';

try {
    [$targetProblemId] = parseValidateArguments(array_slice($argv, 1));
    $result = ccc_validate_problem_set(ccc_load_app_config());
    $items = $result['items'];

    if ($targetProblemId !== null) {
        $items = array_values(array_filter(
            $items,
            static fn(array $item): bool => $item['id'] === $targetProblemId
        ));

        if ($items === []) {
            throw new RuntimeException("Problem not found: {$targetProblemId}");
        }
    }

    writeValidationReport($items);
    writeValidationSummary($items);
    exit(hasValidationErrors($items) ? CCC_VALIDATE_EXIT_ERROR : CCC_VALIDATE_EXIT_OK);
} catch (RuntimeException $exception) {
    fwrite(STDERR, 'Error: ' . $exception->getMessage() . "\n\n");
    writeValidateHelp('tools/validate.php', STDERR);
    exit(CCC_VALIDATE_EXIT_ERROR);
}

/**
 * @return array{0:?string}
 */
function parseValidateArguments(array $args): array
{
    $targetProblemId = null;

    for ($i = 0; $i < count($args); $i++) {
        $arg = $args[$i];

        if ($arg === '--help' || $arg === '-h') {
            writeValidateHelp('tools/validate.php');
            exit(CCC_VALIDATE_EXIT_OK);
        }

        if (str_starts_with($arg, '--')) {
            throw new RuntimeException("Unknown option: {$arg}");
        }

        if ($targetProblemId !== null) {
            throw new RuntimeException('validate accepts at most one <problem-id>.');
        }

        $targetProblemId = trim($arg);
    }

    if ($targetProblemId !== null && preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/', $targetProblemId) !== 1) {
        throw new RuntimeException('Problem ID may only contain letters, digits, dot, underscore, and hyphen.');
    }

    return [$targetProblemId];
}

/**
 * @param list<array<string, mixed>> $items
 */
function writeValidationReport(array $items): void
{
    foreach ($items as $item) {
        $status = strtoupper((string) $item['status']);
        $id = (string) $item['id'];
        $title = trim((string) ($item['title'] ?? ''));

        fwrite(STDOUT, sprintf('[%s] %s', $status, $id));
        if ($title !== '') {
            fwrite(STDOUT, ' - ' . $title);
        }
        fwrite(STDOUT, "\n");

        /** @var list<string> $details */
        $details = $item['details'];
        foreach ($details as $detail) {
            fwrite(STDOUT, "  - {$detail}\n");
        }
    }
}

/**
 * @param list<array<string, mixed>> $items
 */
function writeValidationSummary(array $items): void
{
    $summary = ['ok' => 0, 'warning' => 0, 'error' => 0];
    foreach ($items as $item) {
        $summary[(string) $item['status']]++;
    }

    fwrite(STDOUT, "\nSummary:\n");
    fwrite(STDOUT, sprintf("  OK: %d\n", $summary['ok']));
    fwrite(STDOUT, sprintf("  Warning: %d\n", $summary['warning']));
    fwrite(STDOUT, sprintf("  Error: %d\n", $summary['error']));
}

/**
 * @param list<array<string, mixed>> $items
 */
function hasValidationErrors(array $items): bool
{
    foreach ($items as $item) {
        if (($item['status'] ?? '') === 'error') {
            return true;
        }
    }

    return false;
}

/**
 * @param resource|null $stream
 */
function writeValidateHelp(string $scriptPath = 'tools/validate.php', $stream = null): void
{
    $stream = $stream ?? STDOUT;
    fwrite($stream, <<<TEXT
Usage:
  php {$scriptPath}
  php {$scriptPath} <problem-id>

Description:
  Validate all problems, or one specific problem, using the same rules as the Problem Status page.

Examples:
  php {$scriptPath}
  php {$scriptPath} print-002

TEXT
    );
}
