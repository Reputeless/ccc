<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

try {
    $items = ccc_list_problem_summaries();
    ccc_send_json(['items' => $items], 200, ['Cache-Control' => 'no-store']);
} catch (Throwable $throwable) {
    ccc_send_json([
        'message' => '問題一覧の読み込みに失敗しました。',
        'detail' => $throwable->getMessage(),
    ], 500, ['Cache-Control' => 'no-store']);
}
