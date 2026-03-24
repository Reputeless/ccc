<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    ccc_send_json(['message' => 'Method not allowed.'], 405, ['Allow' => 'POST']);
}

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody ?: '', true);

if (!is_array($payload)) {
    ccc_send_json(['message' => 'Invalid JSON body.'], 400, ['Cache-Control' => 'no-store']);
}

$problemId = isset($payload['problemId']) ? (string) $payload['problemId'] : '';
$code = isset($payload['code']) ? (string) $payload['code'] : '';

if ($problemId === '') {
    ccc_send_json(['message' => 'problemId is required.'], 400, ['Cache-Control' => 'no-store']);
}

try {
    $config = ccc_load_app_config();
    if (strlen($code) > (int) $config['maxCodeBytes']) {
        ccc_send_json([
            'message' => 'Code is too large.',
            'maxCodeBytes' => $config['maxCodeBytes'],
        ], 400, ['Cache-Control' => 'no-store']);
    }

    $problem = ccc_load_problem_for_judge($problemId);
} catch (InvalidArgumentException $exception) {
    ccc_send_json(['message' => $exception->getMessage()], 400, ['Cache-Control' => 'no-store']);
} catch (Throwable $throwable) {
    ccc_send_json([
        'message' => '判定前処理に失敗しました。',
        'detail' => $throwable->getMessage(),
    ], 500, ['Cache-Control' => 'no-store']);
}

if ($problem === null) {
    ccc_send_json(['message' => 'Problem not found.'], 404, ['Cache-Control' => 'no-store']);
}

try {
    [$statusCode, $result] = ccc_judge_submission($config, $problem, $code);
    ccc_send_json($result, $statusCode, ['Cache-Control' => 'no-store']);
} catch (Throwable $throwable) {
    error_log(sprintf(
        '[CCC judge] Wandbox request failed for problem "%s": %s',
        $problemId,
        $throwable->getMessage()
    ));
    ccc_send_json([
        'status' => 'service_unavailable',
        'message' => 'Wandbox への接続に失敗しました。時間帯を変えて再試行するか、ローカルの VSCode などで確認してください。',
        'detail' => $throwable->getMessage(),
    ], 503, ['Cache-Control' => 'no-store']);
}
