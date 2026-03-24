<?php
declare(strict_types=1);

function ccc_judge_submission(array $config, array $problem, string $code): array
{
    $warningMessage = null;

    foreach ($problem['examples'] as $index => $example) {
        $wandboxResult = ccc_call_wandbox($config, $code, $example['stdin']);

        $compilerText = ccc_join_messages([
            $wandboxResult['compiler_error'] ?? null,
            $wandboxResult['compiler_message'] ?? null,
            $wandboxResult['compiler_output'] ?? null,
        ]);
        $programMessage = ccc_join_messages([
            $wandboxResult['program_error'] ?? null,
            $wandboxResult['program_message'] ?? null,
        ]);
        $programOutput = ccc_extract_program_output($wandboxResult);
        $statusText = strtolower(trim((string) ($wandboxResult['status'] ?? '')));

        if (ccc_is_compile_error($compilerText, $statusText)) {
            return [200, [
                'status' => 'compile_error',
                'compilerMessage' => $compilerText !== '' ? $compilerText : 'Compilation failed.',
            ]];
        }

        if ($warningMessage === null && ccc_is_warning_text($compilerText)) {
            $warningMessage = $compilerText;
        }

        if (ccc_is_timeout($wandboxResult, $programMessage, $statusText)) {
            return [200, [
                'status' => 'timeout',
                'message' => $programMessage !== '' ? $programMessage : 'Execution timed out.',
            ]];
        }

        if (ccc_is_runtime_error($wandboxResult, $programMessage, $statusText)) {
            return [200, [
                'status' => 'runtime_error',
                'message' => $programMessage !== '' ? $programMessage : 'Program exited abnormally.',
            ]];
        }

        if (!ccc_outputs_match($programOutput, $example['stdout'])) {
            $response = [
                'status' => 'wrong_answer',
                'failedExample' => [
                    'name' => $example['name'] ?: (string) ($index + 1),
                    'stdin' => $example['stdin'],
                    'expectedStdout' => $example['stdout'],
                    'actualStdout' => $programOutput,
                ],
            ];
            if ($warningMessage !== null) {
                $response['warning'] = $warningMessage;
            }
            return [200, $response];
        }
    }

    $response = [
        'status' => 'accepted',
        'passedExamples' => count($problem['examples']),
        'totalExamples' => count($problem['examples']),
    ];
    if ($warningMessage !== null) {
        $response['warning'] = $warningMessage;
    }

    return [200, $response];
}

function ccc_call_wandbox(array $config, string $code, string $stdin): array
{
    $profile = $config['languageProfile'];
    $flags = [];

    if (!empty($profile['standard'])) {
        $flags[] = '-std=' . $profile['standard'];
    }
    foreach (($profile['extraFlags'] ?? []) as $flag) {
        $flags[] = (string) $flag;
    }

    $payload = [
        'compiler' => (string) ($profile['compiler'] ?? 'gcc-head'),
        'code' => $code,
        'stdin' => $stdin,
        'save' => false,
        'compiler-option-raw' => implode(' ', array_unique(array_filter($flags))),
    ];

    return ccc_http_post_json('https://wandbox.org/api/compile.json', $payload, ((int) ($config['judgeTimeoutSeconds'] ?? 10)) + 5);
}

function ccc_http_post_json(string $url, array $payload, int $timeoutSeconds): array
{
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        throw new RuntimeException('Failed to encode request payload.');
    }

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        if ($ch === false) {
            throw new RuntimeException('Failed to initialize curl.');
        }

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json',
            ],
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_TIMEOUT => $timeoutSeconds,
        ]);

        $response = curl_exec($ch);
        if ($response === false) {
            $message = curl_error($ch);
            curl_close($ch);
            throw new RuntimeException($message);
        }

        $statusCode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        if ($statusCode >= 400) {
            throw new RuntimeException('Wandbox returned HTTP ' . $statusCode . '.');
        }
    } else {
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", [
                    'Content-Type: application/json',
                    'Accept: application/json',
                ]),
                'content' => $json,
                'timeout' => $timeoutSeconds,
            ],
        ]);

        $response = file_get_contents($url, false, $context);
        if ($response === false) {
            throw new RuntimeException('Failed to contact Wandbox.');
        }
    }

    $decoded = json_decode($response, true);
    if (!is_array($decoded)) {
        throw new RuntimeException('Invalid JSON returned from Wandbox.');
    }

    return $decoded;
}

function ccc_extract_program_output(array $wandboxResult): string
{
    $output = $wandboxResult['program_output'] ?? $wandboxResult['stdout'] ?? '';
    return str_replace(["\r\n", "\r"], "\n", (string) $output);
}

function ccc_is_compile_error(string $compilerText, string $statusText): bool
{
    if ($compilerText === '') {
        return false;
    }

    if (preg_match('/(^|\W)(fatal error|error:)(\W|$)/i', $compilerText)) {
        return true;
    }

    return str_contains($statusText, 'compile');
}

function ccc_is_warning_text(string $compilerText): bool
{
    if ($compilerText === '') {
        return false;
    }

    return preg_match('/(^|\W)warning:(\W|$)/i', $compilerText) === 1
        && preg_match('/(^|\W)(fatal error|error:)(\W|$)/i', $compilerText) !== 1;
}

function ccc_is_timeout(array $wandboxResult, string $programMessage, string $statusText): bool
{
    $combined = strtolower($programMessage . ' ' . $statusText . ' ' . (string) ($wandboxResult['signal'] ?? ''));
    return str_contains($combined, 'timeout') || str_contains($combined, 'timed out');
}

function ccc_is_runtime_error(array $wandboxResult, string $programMessage, string $statusText): bool
{
    if (ccc_is_timeout($wandboxResult, $programMessage, $statusText)) {
        return false;
    }

    if ($programMessage !== '') {
        return true;
    }

    return str_contains($statusText, 'runtime') || str_contains($statusText, 'signal');
}

function ccc_outputs_match(string $actual, string $expected): bool
{
    return ccc_normalize_output($actual) === ccc_normalize_output($expected);
}

function ccc_normalize_output(string $text): string
{
    $normalized = str_replace(["\r\n", "\r"], "\n", $text);
    return rtrim($normalized, " \t\n");
}

function ccc_join_messages(array $parts): string
{
    $items = [];
    foreach ($parts as $part) {
        $text = trim((string) $part);
        if ($text !== '') {
            $items[] = $text;
        }
    }
    return implode("\n", array_unique($items));
}
