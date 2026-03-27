<?php
declare(strict_types=1);

function ccc_load_app_config(): array
{
    static $loaded = null;
    if ($loaded !== null) {
        return $loaded;
    }

    $defaults = [
        'appName' => 'CCC',
        'appSubtitle' => 'C プログラミングの自習と理解度確認のための演習環境です。',
        'courseId' => 'ccc-demo',
        'courseLabel' => 'CCC Demo Course',
        'copyrightNotice' => '',
        'lectureLabelTemplate' => '第 {value} 回',
        'difficultyLabels' => ['基本', '標準', '発展'],
        'understandingLabels' => ['要復習', 'ふつう', '自信あり'],
        'uiText' => [
            'heroEyebrow' => 'C Code Checker',
            'backToList' => '← 問題一覧へ戻る',
            'validationLink' => '問題ステータス',
            'teacherGuideLink' => '教師用ガイド',
            'teacherGuideTitle' => '教師用ガイド',
            'guidePanelTitle' => '解説',
            'guideEmptyMessage' => 'この問題の解説はありません。',
            'filtersKicker' => 'Filters',
            'filtersTitle' => 'フィルタ',
            'resetFiltersButton' => 'フィルタをクリア',
            'lectureRangeLabel' => '講義回',
            'lectureMinLabel' => '講義回の下限',
            'lectureMaxLabel' => '講義回の上限',
            'solvedFilterLabel' => '解いた状態',
            'solvedFilterAll' => 'すべて表示',
            'solvedFilterSolvedOnly' => '解いた問題だけを表示',
            'solvedFilterUnsolvedOnly' => '解いていない問題だけを表示',
            'understandingFilterLabel' => '理解度',
            'understandingFilterAll' => 'すべて',
            'unsetLabel' => '未設定',
            'sortOrderLabel' => '並び順',
            'sortOrderLectureAsc' => '講義回が小さい順',
            'sortOrderLectureDesc' => '講義回が大きい順',
            'sortOrderNumberAsc' => '問題番号が小さい順',
            'sortOrderNumberDesc' => '問題番号が大きい順',
            'sortOrderUnderstandingHigh' => '理解度が高い順',
            'sortOrderUnderstandingLow' => '理解度が低い順',
            'difficultyFilterLabel' => '難易度',
            'activeFiltersLabel' => '現在のフィルタ',
            'noFilters' => 'フィルタなし',
            'learningSummaryTitle' => '表示中の学習状況',
            'solvedCountLabel' => '解いた数',
            'reviewCountLabel' => '要復習',
            'recordPanelKicker' => 'Learning Record',
            'recordPanelTitle' => '学習記録',
            'recentProblemTitle' => '最近開いた問題',
            'noRecentProblem' => 'まだ記録がありません。',
            'recordTransferSummary' => 'エクスポート・インポート',
            'exportRecordButton' => '学習記録のエクスポート',
            'exportRecordDescription' => '解いた記録と理解度の一覧をファイルに書き出し、別の PC やブラウザへ移せます。',
            'importRecordButton' => '学習記録のインポート',
            'importRecordDescription' => '書き出した学習記録ファイルを読み込み、現在の記録に追加できます。',
            'recordDangerSummary' => '記録の消去',
            'clearCodeButton' => 'コード入力内容を消去',
            'clearCodeDescription' => 'このブラウザに保存されたコード入力内容を消去します。解いた記録と理解度は残ります。',
            'clearProgressButton' => '解いた記録と理解度を消去',
            'clearProgressDescription' => 'このブラウザに保存された解いた記録と理解度を消去します。コード入力内容は残ります。',
            'appearanceKicker' => 'Appearance',
            'appearanceTitle' => '表示設定',
            'themeSummary' => 'テーマ',
            'themeLight' => 'ライト',
            'themeDark' => 'ダーク',
            'themeSystem' => 'システム設定に合わせる',
            'problemListKicker' => 'Problem List',
            'problemListTitle' => '問題一覧',
            'problemCountTemplate' => '{shown} 問表示 / 全 {total} 問',
            'configLoadWarning' => '設定の読み込みに失敗しました。既定値で表示します。',
            'problemListLoadError' => '問題一覧の読み込みに失敗しました。時間を置いて再読み込みしてください。',
            'noMatchingProblems' => '条件に合う問題がありません。',
            'lectureBadgeTitle' => 'この講義回で絞り込む',
            'difficultyBadgeTitle' => 'この難易度で絞り込む',
            'solvedToggleLabel' => '解いた',
            'understandingSelectLabel' => '理解度',
            'lectureMinActiveFilter' => '{value} <= 講義回',
            'lectureMaxActiveFilter' => '講義回 <= {value}',
            'difficultyActiveFilterUnset' => '難易度: 未設定',
            'difficultyActiveFilter' => '難易度: {value}',
            'solvedOnlyActiveFilter' => '解いた問題だけ',
            'unsolvedOnlyActiveFilter' => '解いていない問題だけ',
            'understandingActiveFilter' => '理解度: {value}',
            'recordExportSuccess' => '学習記録を書き出しました。',
            'recordImportCourseMismatchConfirm' => "このファイルは別の講義用に書き出された可能性があります。\n現在: {current}\nファイル: {file}\n\n読み込みを続けますか？",
            'recordImportCancelled' => 'インポートをキャンセルしました。',
            'recordImportSuccess' => '学習記録を読み込みました。{count} 件を反映しました。',
            'recordImportReadError' => '学習記録ファイルの読み込みに失敗しました。JSON 形式を確認してください。',
            'recordImportInvalidFile' => '学習記録ファイルの形式が正しくありません。',
            'recordImportInvalidRecords' => '学習記録ファイルの records が正しくありません。',
            'clearCodeConfirm' => "このブラウザに保存されたコード入力内容を消去します。\n解いた記録と理解度は残ります。\n\nよろしいですか？",
            'clearCodeCancelled' => '消去をキャンセルしました。',
            'clearCodeDone' => 'コード入力内容を消去しました。',
            'clearProgressConfirm' => "このブラウザに保存された解いた記録と理解度を消去します。\nコード入力内容は残ります。\n\nよろしいですか？",
            'clearProgressCancelled' => '消去をキャンセルしました。',
            'clearProgressDone' => '解いた記録と理解度を消去しました。',
            'problemErrorTitle' => '問題を表示できません',
            'problemUnavailableTitle' => 'Problem Not Available',
            'problemLoadError' => '問題の読み込みに失敗しました。',
            'judgeUnavailable' => '判定サーバーとの通信に失敗しました。時間帯を変えて再試行するか、ローカルの VSCode などで確認してください。',
            'invalidRequest' => '送信内容に問題があります。入力内容を確認してください。',
            'problemUnavailable' => '問題が見つからないか、まだ公開されていません。',
            'codeEditorTitle' => 'コード入力',
            'judgeButtonLabel' => '判定する',
            'resultPanelTitle' => '判定結果',
            'judgeLoadingLabel' => '判定中...',
            'resultIdle' => 'まだ判定していません',
            'resultPending' => '判定中...',
            'resultAccepted' => '合格！',
            'resultAcceptedWithWarning' => '合格！ ただしコンパイラ警告を確認してください',
            'resultWrongAnswer' => '失敗ケースあり',
            'resultWrongAnswerExample' => '失敗ケースあり（例 {example}）',
            'resultCompileError' => 'コンパイルエラー',
            'resultRuntimeError' => '実行時エラー',
            'resultTimeout' => '時間切れ',
            'understandingPromptTitle' => 'この問題の理解度はどうでしたか？',
            'understandingPromptLead' => '理解度を記録したら、次の問題に進みましょう。',
            'examplesSectionTitle' => '入出力例',
            'exampleLabelTemplate' => '例 {value}',
            'inputLabel' => '入力',
            'outputLabel' => '出力',
            'expectedOutputLabel' => '正しい出力',
            'actualOutputLabel' => 'あなたの出力',
            'warningLabel' => '警告',
            'compilerMessageLabel' => 'コンパイルメッセージ',
            'messageLabel' => 'メッセージ',
            'emptyContentLabel' => '(空)',
            'copyCodeLabel' => 'コードをコピー',
            'copiedCodeLabel' => 'コピーしました',
            'codeTooLongMessage' => 'コードが長すぎます。{maxBytes} バイト以内にしてください。',
            'resultPreviewNote' => '表示が長いため、先頭 {lines} 行・{chars} 文字までを表示しています。',
            'languageProfileMetaTemplate' => '言語: {value}',
        ],
        'tabWidth' => 4,
        'editorRows' => 20,
        'longExampleLineThreshold' => 30,
        'resultPreviewMaxLines' => 120,
        'resultPreviewMaxChars' => 6000,
        'resultMessagePreviewMaxLines' => 40,
        'judgeTimeoutSeconds' => 10,
        'maxCodeBytes' => 65536,
        'defaultProfileId' => ccc_default_profile_id(),
        'languageProfiles' => ccc_built_in_language_profiles(),
    ];

    $path = CCC_CONFIG_DIR . DIRECTORY_SEPARATOR . 'app.json';
    if (!is_file($path)) {
        $loaded = ccc_normalize_app_config($defaults);
        return $loaded;
    }

    $raw = file_get_contents($path);
    $decoded = json_decode($raw ?: '', true);
    if (!is_array($decoded)) {
        throw new RuntimeException('config/app.json is not valid JSON.');
    }

    $loaded = ccc_normalize_app_config(ccc_array_merge_recursive_distinct($defaults, $decoded));
    return $loaded;
}

function ccc_normalize_app_config(array $config): array
{
    $defaultProfileIdText = trim((string) ($config['defaultProfileId'] ?? ccc_default_profile_id()));
    if ($defaultProfileIdText === '') {
        $defaultProfileIdText = ccc_default_profile_id();
    }
    $defaultProfileId = ccc_normalize_profile_id($defaultProfileIdText);

    $legacyProfile = isset($config['languageProfile']) && is_array($config['languageProfile'])
        ? $config['languageProfile']
        : null;
    $profiles = $config['languageProfiles'] ?? null;

    if (!is_array($profiles) || $profiles === [] || !ccc_is_associative($profiles)) {
        $profiles = [
            $defaultProfileId => $legacyProfile ?? ccc_default_language_profile(),
        ];
    }

    $normalizedProfiles = [];
    foreach ($profiles as $profileId => $profile) {
        $normalizedProfiles[ccc_normalize_profile_id((string) $profileId)] = ccc_normalize_language_profile($profile);
    }

    if (!isset($normalizedProfiles[$defaultProfileId])) {
        if ($legacyProfile !== null) {
            $normalizedProfiles[$defaultProfileId] = ccc_normalize_language_profile($legacyProfile);
        } else {
            throw new RuntimeException('defaultProfileId does not exist in languageProfiles.');
        }
    }

    $config['lectureLabelTemplate'] = ccc_normalize_text_setting($config['lectureLabelTemplate'] ?? '第 {value} 回', '第 {value} 回');
    $config['uiText'] = ccc_normalize_ui_text($config['uiText'] ?? []);
    $config['defaultProfileId'] = $defaultProfileId;
    $config['languageProfiles'] = $normalizedProfiles;
    $config['languageProfile'] = $normalizedProfiles[$defaultProfileId];

    return $config;
}

function ccc_normalize_ui_text(mixed $value): array
{
    $defaults = [
        'backToList' => '← 問題一覧へ戻る',
        'heroEyebrow' => 'C Code Checker',
        'validationLink' => '問題ステータス',
        'teacherGuideLink' => '教師用ガイド',
        'teacherGuideTitle' => '教師用ガイド',
        'guidePanelTitle' => '解説',
        'guideEmptyMessage' => 'この問題の解説はありません。',
        'filtersKicker' => 'Filters',
        'filtersTitle' => 'フィルタ',
        'resetFiltersButton' => 'フィルタをクリア',
        'lectureRangeLabel' => '講義回',
        'lectureMinLabel' => '講義回の下限',
        'lectureMaxLabel' => '講義回の上限',
        'solvedFilterLabel' => '解いた状態',
        'solvedFilterAll' => 'すべて表示',
        'solvedFilterSolvedOnly' => '解いた問題だけを表示',
        'solvedFilterUnsolvedOnly' => '解いていない問題だけを表示',
        'understandingFilterLabel' => '理解度',
        'understandingFilterAll' => 'すべて',
        'unsetLabel' => '未設定',
        'sortOrderLabel' => '並び順',
        'sortOrderLectureAsc' => '講義回が小さい順',
        'sortOrderLectureDesc' => '講義回が大きい順',
        'sortOrderNumberAsc' => '問題番号が小さい順',
        'sortOrderNumberDesc' => '問題番号が大きい順',
        'sortOrderUnderstandingHigh' => '理解度が高い順',
        'sortOrderUnderstandingLow' => '理解度が低い順',
        'difficultyFilterLabel' => '難易度',
        'activeFiltersLabel' => '現在のフィルタ',
        'noFilters' => 'フィルタなし',
        'learningSummaryTitle' => '表示中の学習状況',
        'solvedCountLabel' => '解いた数',
        'reviewCountLabel' => '要復習',
        'recordPanelKicker' => 'Learning Record',
        'recordPanelTitle' => '学習記録',
        'recentProblemTitle' => '最近開いた問題',
        'noRecentProblem' => 'まだ記録がありません。',
        'recordTransferSummary' => 'エクスポート・インポート',
        'exportRecordButton' => '学習記録のエクスポート',
        'exportRecordDescription' => '解いた記録と理解度の一覧をファイルに書き出し、別の PC やブラウザへ移せます。',
        'importRecordButton' => '学習記録のインポート',
        'importRecordDescription' => '書き出した学習記録ファイルを読み込み、現在の記録に追加できます。',
        'recordDangerSummary' => '記録の消去',
        'clearCodeButton' => 'コード入力内容を消去',
        'clearCodeDescription' => 'このブラウザに保存されたコード入力内容を消去します。解いた記録と理解度は残ります。',
        'clearProgressButton' => '解いた記録と理解度を消去',
        'clearProgressDescription' => 'このブラウザに保存された解いた記録と理解度を消去します。コード入力内容は残ります。',
        'appearanceKicker' => 'Appearance',
        'appearanceTitle' => '表示設定',
        'themeSummary' => 'テーマ',
        'themeLight' => 'ライト',
        'themeDark' => 'ダーク',
        'themeSystem' => 'システム設定に合わせる',
        'problemListKicker' => 'Problem List',
        'problemListTitle' => '問題一覧',
        'problemCountTemplate' => '{shown} 問表示 / 全 {total} 問',
        'configLoadWarning' => '設定の読み込みに失敗しました。既定値で表示します。',
        'problemListLoadError' => '問題一覧の読み込みに失敗しました。時間を置いて再読み込みしてください。',
        'noMatchingProblems' => '条件に合う問題がありません。',
        'lectureBadgeTitle' => 'この講義回で絞り込む',
        'difficultyBadgeTitle' => 'この難易度で絞り込む',
        'solvedToggleLabel' => '解いた',
        'understandingSelectLabel' => '理解度',
        'lectureMinActiveFilter' => '{value} <= 講義回',
        'lectureMaxActiveFilter' => '講義回 <= {value}',
        'difficultyActiveFilterUnset' => '難易度: 未設定',
        'difficultyActiveFilter' => '難易度: {value}',
        'solvedOnlyActiveFilter' => '解いた問題だけ',
        'unsolvedOnlyActiveFilter' => '解いていない問題だけ',
        'understandingActiveFilter' => '理解度: {value}',
        'recordExportSuccess' => '学習記録を書き出しました。',
        'recordImportCourseMismatchConfirm' => "このファイルは別の講義用に書き出された可能性があります。\n現在: {current}\nファイル: {file}\n\n読み込みを続けますか？",
        'recordImportCancelled' => 'インポートをキャンセルしました。',
        'recordImportSuccess' => '学習記録を読み込みました。{count} 件を反映しました。',
        'recordImportReadError' => '学習記録ファイルの読み込みに失敗しました。JSON 形式を確認してください。',
        'recordImportInvalidFile' => '学習記録ファイルの形式が正しくありません。',
        'recordImportInvalidRecords' => '学習記録ファイルの records が正しくありません。',
        'clearCodeConfirm' => "このブラウザに保存されたコード入力内容を消去します。\n解いた記録と理解度は残ります。\n\nよろしいですか？",
        'clearCodeCancelled' => '消去をキャンセルしました。',
        'clearCodeDone' => 'コード入力内容を消去しました。',
        'clearProgressConfirm' => "このブラウザに保存された解いた記録と理解度を消去します。\nコード入力内容は残ります。\n\nよろしいですか？",
        'clearProgressCancelled' => '消去をキャンセルしました。',
        'clearProgressDone' => '解いた記録と理解度を消去しました。',
        'problemErrorTitle' => '問題を表示できません',
        'problemUnavailableTitle' => 'Problem Not Available',
        'problemLoadError' => '問題の読み込みに失敗しました。',
        'judgeUnavailable' => '判定サーバーとの通信に失敗しました。時間帯を変えて再試行するか、ローカルの VSCode などで確認してください。',
        'invalidRequest' => '送信内容に問題があります。入力内容を確認してください。',
        'problemUnavailable' => '問題が見つからないか、まだ公開されていません。',
        'codeEditorTitle' => 'コード入力',
        'judgeButtonLabel' => '判定する',
        'resultPanelTitle' => '判定結果',
        'judgeLoadingLabel' => '判定中...',
        'resultIdle' => 'まだ判定していません',
        'resultPending' => '判定中...',
        'resultAccepted' => '合格！',
        'resultAcceptedWithWarning' => '合格！ ただしコンパイラ警告を確認してください',
        'resultWrongAnswer' => '失敗ケースあり',
        'resultWrongAnswerExample' => '失敗ケースあり（例 {example}）',
        'resultCompileError' => 'コンパイルエラー',
        'resultRuntimeError' => '実行時エラー',
        'resultTimeout' => '時間切れ',
        'understandingPromptTitle' => 'この問題の理解度はどうでしたか？',
        'understandingPromptLead' => '理解度を記録したら、次の問題に進みましょう。',
        'examplesSectionTitle' => '入出力例',
        'exampleLabelTemplate' => '例 {value}',
        'inputLabel' => '入力',
        'outputLabel' => '出力',
        'expectedOutputLabel' => '正しい出力',
        'actualOutputLabel' => 'あなたの出力',
        'warningLabel' => '警告',
        'compilerMessageLabel' => 'コンパイルメッセージ',
        'messageLabel' => 'メッセージ',
        'emptyContentLabel' => '(空)',
        'copyCodeLabel' => 'コードをコピー',
        'copiedCodeLabel' => 'コピーしました',
        'codeTooLongMessage' => 'コードが長すぎます。{maxBytes} バイト以内にしてください。',
        'resultPreviewNote' => '表示が長いため、先頭 {lines} 行・{chars} 文字までを表示しています。',
        'languageProfileMetaTemplate' => '言語: {value}',
    ];

    if (!is_array($value)) {
        return $defaults;
    }

    $normalized = [];
    foreach ($defaults as $key => $fallback) {
        $normalized[$key] = ccc_normalize_text_setting($value[$key] ?? $fallback, $fallback);
    }

    return $normalized;
}

function ccc_normalize_text_setting(mixed $value, string $fallback): string
{
    $text = trim((string) $value);
    return $text !== '' ? $text : $fallback;
}

function ccc_default_language_profile(): array
{
    $profiles = ccc_built_in_language_profiles();
    return $profiles[ccc_default_profile_id()];
}

function ccc_default_profile_id(): string
{
    return 'c23';
}

function ccc_built_in_language_profiles(): array
{
    return [
        'c17' => [
            ...ccc_language_profile_defaults_for_language('c'),
            'label' => 'C17',
            'standard' => 'c17',
        ],
        'c23' => [
            ...ccc_language_profile_defaults_for_language('c'),
            'label' => 'C23',
            'standard' => 'c23',
        ],
        'cpp20' => [
            ...ccc_language_profile_defaults_for_language('cpp'),
            'label' => 'C++20',
            'standard' => 'c++20',
        ],
        'cpp23' => [
            ...ccc_language_profile_defaults_for_language('cpp'),
            'label' => 'C++23',
            'standard' => 'c++23',
        ],
        'python3.14' => [
            ...ccc_language_profile_defaults_for_language('python'),
            'label' => 'Python 3.14',
        ],
    ];
}

function ccc_generic_language_profile_defaults(): array
{
    return [
        'gnuExtensions' => false,
        'editorIndentStyle' => 'tab',
        'editorIndentWidth' => 4,
        'extraFlags' => [],
    ];
}

function ccc_language_profile_defaults_for_language(string $language): array
{
    $normalizedLanguage = ccc_normalize_language_name($language);
    $defaults = ccc_generic_language_profile_defaults();

    return match ($normalizedLanguage) {
        'c' => [
            ...$defaults,
            'language' => 'c',
            'compiler' => 'gcc-head-c',
            'standard' => 'c23',
            'extraFlags' => ['-Wall', '-Wextra', '-Wvla', '-Wstrict-prototypes', '-Wconversion', '-Wshadow', '-pedantic', '-lm'],
        ],
        'cpp' => [
            ...$defaults,
            'language' => 'cpp',
            'compiler' => 'gcc-head',
            'standard' => 'c++23',
            'extraFlags' => ['-Wall', '-Wextra', '-Wconversion', '-Wshadow', '-pedantic'],
        ],
        'python' => [
            ...$defaults,
            'language' => 'python',
            'compiler' => 'cpython-3.14.0',
            'standard' => null,
            'editorIndentStyle' => 'spaces',
        ],
        default => [
            ...$defaults,
            'language' => $normalizedLanguage,
            'compiler' => '',
            'standard' => null,
        ],
    };
}

function ccc_normalize_language_name(string $language): string
{
    $normalized = trim(strtolower($language));
    return $normalized === '' ? 'c' : $normalized;
}

function ccc_normalize_profile_id(string $profileId): string
{
    $profileId = trim($profileId);
    if ($profileId === '' || preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/', $profileId) !== 1) {
        throw new RuntimeException('Invalid language profile id.');
    }

    return $profileId;
}

function ccc_normalize_language_profile(mixed $profile): array
{
    if (!is_array($profile)) {
        throw new RuntimeException('Invalid language profile.');
    }

    $language = ccc_normalize_language_name((string) ($profile['language'] ?? 'c'));
    $merged = ccc_array_merge_recursive_distinct(
        ccc_language_profile_defaults_for_language($language),
        $profile
    );

    $language = ccc_normalize_language_name((string) ($merged['language'] ?? ''));
    $compiler = trim((string) ($merged['compiler'] ?? ''));
    $standard = trim((string) ($merged['standard'] ?? ''));
    $extraFlags = is_array($merged['extraFlags'] ?? null) ? $merged['extraFlags'] : [];
    $label = trim((string) ($merged['label'] ?? ''));

    if ($language === '' || $compiler === '') {
        throw new RuntimeException('Language profile requires language and compiler.');
    }

    if ($label === '') {
        throw new RuntimeException('Language profile requires label.');
    }

    return [
        'language' => $language,
        'compiler' => $compiler,
        'standard' => $standard === '' ? null : $standard,
        'label' => $label,
        'gnuExtensions' => (bool) ($merged['gnuExtensions'] ?? false),
        'editorIndentStyle' => ccc_normalize_indent_style((string) ($merged['editorIndentStyle'] ?? 'tab')),
        'editorIndentWidth' => ccc_normalize_indent_width($merged['editorIndentWidth'] ?? 4),
        'extraFlags' => array_values(array_filter(array_map(
            static fn (mixed $flag): string => trim((string) $flag),
            $extraFlags
        ), static fn (string $flag): bool => $flag !== '')),
    ];
}

function ccc_normalize_indent_style(string $style): string
{
    $style = trim(strtolower($style));
    return $style === 'spaces' ? 'spaces' : 'tab';
}

function ccc_normalize_indent_width(mixed $width): int
{
    $normalized = is_numeric((string) $width) ? (int) $width : 4;
    if ($normalized < 1 || $normalized > 8) {
        return 4;
    }

    return $normalized;
}

function ccc_resolve_language_profile(array $config, ?string $profileId = null): array
{
    $effectiveProfileId = $profileId !== null && trim($profileId) !== ''
        ? ccc_normalize_profile_id($profileId)
        : (string) ($config['defaultProfileId'] ?? ccc_default_profile_id());
    $profiles = $config['languageProfiles'] ?? [];

    if (!isset($profiles[$effectiveProfileId]) || !is_array($profiles[$effectiveProfileId])) {
        throw new RuntimeException('Unknown language profile: ' . $effectiveProfileId);
    }

    return [
        'id' => $effectiveProfileId,
        ...$profiles[$effectiveProfileId],
    ];
}

function ccc_build_language_profile_summary(array $profile): array
{
    return [
        'id' => (string) ($profile['id'] ?? ''),
        'language' => (string) ($profile['language'] ?? ''),
        'compiler' => (string) ($profile['compiler'] ?? ''),
        'standard' => $profile['standard'] ?? null,
        'label' => (string) ($profile['label'] ?? ''),
        'gnuExtensions' => (bool) ($profile['gnuExtensions'] ?? false),
        'editorIndentStyle' => (string) ($profile['editorIndentStyle'] ?? 'tab'),
        'editorIndentWidth' => (int) ($profile['editorIndentWidth'] ?? 4),
    ];
}

function ccc_array_merge_recursive_distinct(array $defaults, array $override): array
{
    $merged = $defaults;
    foreach ($override as $key => $value) {
        if (is_array($value) && isset($merged[$key]) && is_array($merged[$key]) && ccc_is_associative($value)) {
            $merged[$key] = ccc_array_merge_recursive_distinct($merged[$key], $value);
            continue;
        }
        $merged[$key] = $value;
    }
    return $merged;
}

function ccc_is_associative(array $value): bool
{
    return array_keys($value) !== range(0, count($value) - 1);
}
