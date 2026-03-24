<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$problemId = isset($_GET['id']) ? (string) $_GET['id'] : '';

if ($problemId === '') {
    ccc_send_json(['message' => 'problem id is required.'], 400, ['Cache-Control' => 'no-store']);
}

try {
    $problem = ccc_load_problem_detail($problemId);
} catch (InvalidArgumentException $exception) {
    ccc_send_json(['message' => $exception->getMessage()], 400, ['Cache-Control' => 'no-store']);
} catch (Throwable $throwable) {
    ccc_send_json([
        'message' => '問題の読み込みに失敗しました。',
        'detail' => $throwable->getMessage(),
    ], 500, ['Cache-Control' => 'no-store']);
}

if ($problem === null) {
    ccc_send_json(['message' => 'Problem not found.'], 404, ['Cache-Control' => 'no-store']);
}

ccc_send_json($problem, 200, ['Cache-Control' => 'no-store']);
