<?php
declare(strict_types=1);

const CCC_EXIT_OK = 0;
const CCC_EXIT_ERROR = 1;

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This script must be run from the command line.\n");
    exit(CCC_EXIT_ERROR);
}

try {
    handleCreate(array_slice($argv, 1));
    exit(CCC_EXIT_OK);
} catch (RuntimeException $exception) {
    fwrite(STDERR, 'Error: ' . $exception->getMessage() . "\n\n");
    writeCreateHelp('tools/create.php', STDERR);
    exit(CCC_EXIT_ERROR);
}

function handleCreate(array $args): void
{
    [$problemId, $options] = parseCreateArguments($args);

    if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/', $problemId)) {
        throw new RuntimeException('Problem ID may only contain letters, digits, dot, underscore, and hyphen.');
    }

    $root = dirname(__DIR__);
    $templateName = $options['template'] ?? 'default';
    if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/', $templateName)) {
        throw new RuntimeException('Template name may only contain letters, digits, dot, underscore, and hyphen.');
    }

    $templateDir = $root . DIRECTORY_SEPARATOR . 'templates' . DIRECTORY_SEPARATOR . $templateName;
    $targetDir = $root . DIRECTORY_SEPARATOR . 'problems' . DIRECTORY_SEPARATOR . $problemId;

    if (isset($options['profile'])) {
        $profileId = trim($options['profile']);
        if (preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/', $profileId) !== 1) {
            throw new RuntimeException('Profile ID may only contain letters, digits, dot, underscore, and hyphen.');
        }

        require_once $root . DIRECTORY_SEPARATOR . 'api' . DIRECTORY_SEPARATOR . 'bootstrap.php';
        $config = ccc_load_app_config();
        if (!isset($config['languageProfiles'][$profileId])) {
            throw new RuntimeException("Profile does not exist in config/app.json: {$profileId}");
        }

        $options['profile'] = $profileId;
    }

    if (!is_dir($templateDir)) {
        throw new RuntimeException("Template '{$templateName}' does not exist.");
    }

    if (file_exists($targetDir)) {
        throw new RuntimeException("Target directory already exists: problems/{$problemId}");
    }

    if (!mkdir($targetDir, 0777, true) && !is_dir($targetDir)) {
        throw new RuntimeException("Failed to create directory: problems/{$problemId}");
    }

    try {
        copyDirectoryContents($templateDir, $targetDir);

        if (isset($options['profile'])) {
            applyProfileOverride($targetDir . DIRECTORY_SEPARATOR . 'problem.json', $options['profile']);
        }
    } catch (Throwable $throwable) {
        if (is_dir($targetDir)) {
            removeDirectory($targetDir);
        }
        throw $throwable instanceof RuntimeException
            ? $throwable
            : new RuntimeException($throwable->getMessage(), 0, $throwable);
    }

    fwrite(STDOUT, "Created: problems/{$problemId}\n");
    fwrite(STDOUT, "Template: {$templateName}\n");
    if (isset($options['profile'])) {
        fwrite(STDOUT, "Profile: {$options['profile']}\n");
    }
}

/**
 * @return array{0:string,1:array{template?:string,profile?:string}}
 */
function parseCreateArguments(array $args): array
{
    $problemId = null;
    $options = [];

    for ($i = 0; $i < count($args); $i++) {
        $arg = $args[$i];

        if ($arg === '--help' || $arg === '-h') {
            writeCreateHelp('tools/create.php');
            exit(CCC_EXIT_OK);
        }

        if ($arg === '--template') {
            $value = $args[$i + 1] ?? '';
            if ($value === '' || str_starts_with($value, '--')) {
                throw new RuntimeException('Option --template requires a value.');
            }
            $options['template'] = $value;
            $i++;
            continue;
        }

        if ($arg === '--profile') {
            $value = $args[$i + 1] ?? '';
            if ($value === '' || str_starts_with($value, '--')) {
                throw new RuntimeException('Option --profile requires a value.');
            }
            $options['profile'] = $value;
            $i++;
            continue;
        }

        if (str_starts_with($arg, '--')) {
            throw new RuntimeException("Unknown option: {$arg}");
        }

        if ($problemId !== null) {
            throw new RuntimeException('create accepts exactly one <problem-id>.');
        }

        $problemId = $arg;
    }

    if ($problemId === null || trim($problemId) === '') {
        throw new RuntimeException('create requires <problem-id>.');
    }

    return [$problemId, $options];
}

function copyDirectoryContents(string $sourceDir, string $targetDir): void
{
    $items = scandir($sourceDir);
    if ($items === false) {
        throw new RuntimeException("Failed to read template directory: {$sourceDir}");
    }

    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }

        $sourcePath = $sourceDir . DIRECTORY_SEPARATOR . $item;
        $targetPath = $targetDir . DIRECTORY_SEPARATOR . $item;

        if (is_dir($sourcePath)) {
            if (!mkdir($targetPath, 0777, true) && !is_dir($targetPath)) {
                throw new RuntimeException("Failed to create directory: {$targetPath}");
            }
            copyDirectoryContents($sourcePath, $targetPath);
            continue;
        }

        if (!copy($sourcePath, $targetPath)) {
            throw new RuntimeException("Failed to copy file: {$item}");
        }
    }
}

function applyProfileOverride(string $problemJsonPath, string $profileId): void
{
    if (!is_file($problemJsonPath)) {
        throw new RuntimeException('Template is missing problem.json.');
    }

    $raw = file_get_contents($problemJsonPath);
    if ($raw === false) {
        throw new RuntimeException('Failed to read generated problem.json.');
    }

    try {
        /** @var array<string, mixed> $data */
        $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $exception) {
        throw new RuntimeException('Generated problem.json is not valid JSON.', 0, $exception);
    }

    $data['profileId'] = $profileId;
    $encoded = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($encoded === false) {
        throw new RuntimeException('Failed to encode updated problem.json.');
    }

    $encoded .= "\n";
    if (file_put_contents($problemJsonPath, $encoded) === false) {
        throw new RuntimeException('Failed to write generated problem.json.');
    }
}

function removeDirectory(string $directory): void
{
    $items = scandir($directory);
    if ($items === false) {
        return;
    }

    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }

        $path = $directory . DIRECTORY_SEPARATOR . $item;
        if (is_dir($path)) {
            removeDirectory($path);
        } elseif (is_file($path)) {
            @unlink($path);
        }
    }

    @rmdir($directory);
}

/**
 * @param resource|null $stream
 */
function writeCreateHelp(string $scriptPath = 'tools/create.php', $stream = null): void
{
    $stream = $stream ?? STDOUT;
    fwrite($stream, <<<TEXT
Usage:
  php {$scriptPath} <problem-id> [options]

Description:
  Create a new problem directory under problems/ by copying files from a template.

Options:
  --template <name>    Template name under templates/. Default: default
  --profile <id>       Override profileId in generated problem.json
  --help               Show this help

Examples:
  php {$scriptPath} sample-001
  php {$scriptPath} cpp-002 --profile cpp23
  php {$scriptPath} py-001 --template default --profile python3.14

TEXT
    );
}
