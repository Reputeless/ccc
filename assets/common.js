(function initCccCommon(global) {
  const DEFAULT_CONFIG = {
    appName: "CCC",
    appSubtitle: "C プログラミングの自習と理解度確認のための演習環境です。",
    courseId: "ccc-demo",
    courseLabel: "CCC Demo Course",
    copyrightNotice: "",
    lectureLabelTemplate: "第 {value} 回",
    difficultyLabels: ["基本", "標準", "発展"],
    understandingLabels: ["要復習", "ふつう", "自信あり"],
    uiText: {
      heroEyebrow: "C Code Checker",
      backToList: "← 問題一覧へ戻る",
      validationLink: "問題ステータス",
      teacherGuideLink: "教師用ガイド",
      teacherGuideTitle: "教師用ガイド",
      guidePanelTitle: "解説",
      guideEmptyMessage: "この問題の解説はありません。",
      filtersKicker: "Filters",
      filtersTitle: "フィルタ",
      resetFiltersButton: "フィルタをクリア",
      lectureRangeLabel: "講義回",
      lectureMinLabel: "講義回の下限",
      lectureMaxLabel: "講義回の上限",
      solvedFilterLabel: "解いた状態",
      solvedFilterAll: "すべて表示",
      solvedFilterSolvedOnly: "解いた問題だけを表示",
      solvedFilterUnsolvedOnly: "解いていない問題だけを表示",
      understandingFilterLabel: "理解度",
      understandingFilterAll: "すべて",
      unsetLabel: "未設定",
      sortOrderLabel: "並び順",
      sortOrderLectureAsc: "講義回が小さい順",
      sortOrderLectureDesc: "講義回が大きい順",
      sortOrderNumberAsc: "問題番号が小さい順",
      sortOrderNumberDesc: "問題番号が大きい順",
      sortOrderUnderstandingHigh: "理解度が高い順",
      sortOrderUnderstandingLow: "理解度が低い順",
      difficultyFilterLabel: "難易度",
      activeFiltersLabel: "現在のフィルタ",
      noFilters: "フィルタなし",
      learningSummaryTitle: "表示中の学習状況",
      solvedCountLabel: "解いた数",
      reviewCountLabel: "要復習",
      recordPanelKicker: "Learning Record",
      recordPanelTitle: "学習記録",
      recentProblemTitle: "最近開いた問題",
      noRecentProblem: "まだ記録がありません。",
      recordTransferSummary: "エクスポート・インポート",
      exportRecordButton: "学習記録のエクスポート",
      exportRecordDescription: "解いた記録と理解度の一覧をファイルに書き出し、別の PC やブラウザへ移せます。",
      importRecordButton: "学習記録のインポート",
      importRecordDescription: "書き出した学習記録ファイルを読み込み、現在の記録に追加できます。",
      recordDangerSummary: "記録の消去",
      clearCodeButton: "入力内容を消去",
      clearCodeDescription: "このブラウザに保存された、コードや文章などの入力内容を消去します。解いた記録と理解度は残ります。",
      clearProgressButton: "解いた記録と理解度を消去",
      clearProgressDescription: "このブラウザに保存された、解いた記録と理解度を消去します。コードや文章などの入力内容は残ります。",
      appearanceKicker: "Appearance",
      appearanceTitle: "表示設定",
      themeSummary: "テーマ",
      themeLight: "ライト",
      themeDark: "ダーク",
      themeSystem: "システム設定に合わせる",
      problemListKicker: "Problem List",
      problemListTitle: "問題一覧",
      problemCountTemplate: "{shown} 問表示 / 全 {total} 問",
      configLoadWarning: "設定の読み込みに失敗しました。既定値で表示します。",
      problemListLoadError: "問題一覧の読み込みに失敗しました。時間を置いて再読み込みしてください。",
      noMatchingProblems: "条件に合う問題がありません。",
      lectureBadgeTitle: "この講義回で絞り込む",
      difficultyBadgeTitle: "この難易度で絞り込む",
      solvedToggleLabel: "解いた",
      understandingSelectLabel: "理解度",
      lectureMinActiveFilter: "{value} <= 講義回",
      lectureMaxActiveFilter: "講義回 <= {value}",
      difficultyActiveFilterUnset: "難易度: 未設定",
      difficultyActiveFilter: "難易度: {value}",
      solvedOnlyActiveFilter: "解いた問題だけ",
      unsolvedOnlyActiveFilter: "解いていない問題だけ",
      understandingActiveFilter: "理解度: {value}",
      recordExportSuccess: "学習記録を書き出しました。",
      recordImportCourseMismatchConfirm: "このファイルは別の講義用に書き出された可能性があります。\n現在: {current}\nファイル: {file}\n\n読み込みを続けますか？",
      recordImportCancelled: "インポートをキャンセルしました。",
      recordImportSuccess: "学習記録を読み込みました。{count} 件を反映しました。",
      recordImportReadError: "学習記録ファイルの読み込みに失敗しました。JSON 形式を確認してください。",
      recordImportInvalidFile: "学習記録ファイルの形式が正しくありません。",
      recordImportInvalidRecords: "学習記録ファイルの records が正しくありません。",
      clearCodeConfirm: "このブラウザに保存された、コードや文章などの入力内容を消去します。\n解いた記録と理解度は残ります。\n\nよろしいですか？",
      clearCodeCancelled: "消去をキャンセルしました。",
      clearCodeDone: "入力内容を消去しました。",
      clearProgressConfirm: "このブラウザに保存された、解いた記録と理解度を消去します。\nコードや文章などの入力内容は残ります。\n\nよろしいですか？",
      clearProgressCancelled: "消去をキャンセルしました。",
      clearProgressDone: "解いた記録と理解度を消去しました。",
      problemErrorTitle: "問題を表示できません",
      problemUnavailableTitle: "Problem Not Available",
      problemLoadError: "問題の読み込みに失敗しました。",
      judgeUnavailable: "判定サーバーとの通信に失敗しました。時間帯を変えて再試行するか、ローカルの VSCode などで確認してください。",
      invalidRequest: "送信内容に問題があります。入力内容を確認してください。",
      problemUnavailable: "問題が見つからないか、まだ公開されていません。",
      codeEditorTitle: "コード入力",
      textAnswerPanelTitle: "解答入力",
      judgeButtonLabel: "判定する",
      resultPanelTitle: "判定結果",
      judgeLoadingLabel: "判定中...",
      resultIdle: "まだ判定していません",
      resultPending: "判定中...",
      resultAccepted: "合格！",
      resultAcceptedWithWarning: "合格！ ただしコンパイラ警告を確認してください",
      resultWrongAnswer: "失敗ケースあり",
      resultWrongAnswerExample: "失敗ケースあり（例 {example}）",
      resultWrongAnswerItem: "失敗ケースあり（問 {item}）",
      resultCompileError: "コンパイルエラー",
      resultRuntimeError: "実行時エラー",
      resultTimeout: "時間切れ",
      understandingPromptTitle: "この問題の理解度はどうでしたか？",
      understandingPromptLead: "理解度を記録したら、次の問題に進みましょう。",
      examplesSectionTitle: "入出力例",
      exampleLabelTemplate: "例 {value}",
      inputLabel: "入力",
      outputLabel: "出力",
      questionLabel: "設問",
      acceptedAnswersLabel: "正しい解答例",
      yourAnswerLabel: "あなたの解答",
      textQuestionLabelTemplate: "問 {value}",
      textAnswerPlaceholder: "ここに解答を入力",
      textUnansweredLabel: "(未入力)",
      textAnswerTooLongMessage: "解答が長すぎます。{maxChars} 文字以内にしてください。",
      expectedOutputLabel: "正しい出力",
      actualOutputLabel: "あなたの出力",
      warningLabel: "警告",
      compilerMessageLabel: "コンパイルメッセージ",
      messageLabel: "メッセージ",
      emptyContentLabel: "(空)",
      copyCodeLabel: "コードをコピー",
      copiedCodeLabel: "コピーしました",
      codeTooLongMessage: "コードが長すぎます。{maxBytes} バイト以内にしてください。",
      resultPreviewNote: "表示が長いため、先頭 {lines} 行・{chars} 文字までを表示しています。",
      languageProfileMetaTemplate: "言語: {value}",
    },
    tabWidth: 4,
    editorRows: 20,
    longExampleLineThreshold: 30,
    resultPreviewMaxLines: 120,
    resultPreviewMaxChars: 6000,
    resultMessagePreviewMaxLines: 40,
    maxCodeBytes: 65536,
    maxTextAnswerChars: 100,
  };
  const FILTER_STORAGE_KEY = "ccc:v1:listFilters";
  const LAST_OPENED_PROBLEM_KEY = "ccc:v1:lastOpenedProblem";
  const THEME_STORAGE_KEY = "ccc:v1:theme";
  let themeMediaQuery = null;
  let themeMediaQueryListenerBound = false;

  function storageKey(kind, problemId) {
    return `ccc:v1:${kind}:${problemId}`;
  }

  async function fetchConfig() {
    const response = await fetch("api/config.php", { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error("config fetch failed");
    }
    return { ...DEFAULT_CONFIG, ...(await response.json()) };
  }

  function populateLabelSelect(select, labels, options = {}) {
    const { emptyLabel = null, emptyValue = "" } = options;
    select.innerHTML = "";

    if (emptyLabel !== null) {
      select.appendChild(new Option(emptyLabel, emptyValue));
    }

    labels.forEach((label, index) => {
      select.appendChild(new Option(label, String(index + 1)));
    });
  }

  function populateOrderedLabelSelect(select, labels, order, options = {}) {
    const { emptyLabel = null, emptyValue = "" } = options;
    select.innerHTML = "";

    if (emptyLabel !== null) {
      select.appendChild(new Option(emptyLabel, emptyValue));
    }

    order.forEach((value) => {
      const index = Number(value) - 1;
      const label = labels[index];
      if (label == null) {
        return;
      }
      select.appendChild(new Option(label, String(value)));
    });
  }

  function normalizeSortOrder(sortOrder) {
    if (sortOrder === "asc") {
      return "lectureAsc";
    }
    if (sortOrder === "desc") {
      return "lectureDesc";
    }
    return sortOrder;
  }

  function readListFilters() {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  function writeListFilters(filters) {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
  }

  function normalizeThemePreference(value) {
    return value === "light" || value === "dark" || value === "system" ? value : "light";
  }

  function getThemePreference() {
    return normalizeThemePreference(localStorage.getItem(THEME_STORAGE_KEY) ?? "light");
  }

  function setThemePreference(value) {
    localStorage.setItem(THEME_STORAGE_KEY, normalizeThemePreference(value));
  }

  function resolveThemePreference(value) {
    const preference = normalizeThemePreference(value);
    if (preference === "light" || preference === "dark") {
      return preference;
    }

    if (typeof global.matchMedia === "function") {
      return global.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    return "light";
  }

  function applyThemePreference(value = getThemePreference()) {
    const resolvedTheme = resolveThemePreference(value);
    document.documentElement.dataset.theme = resolvedTheme;
  }

  function bindThemePreferenceListener() {
    if (themeMediaQueryListenerBound || typeof global.matchMedia !== "function") {
      return;
    }

    themeMediaQuery = global.matchMedia("(prefers-color-scheme: dark)");
    themeMediaQuery.addEventListener("change", () => {
      if (getThemePreference() === "system") {
        applyThemePreference("system");
      }
    });
    themeMediaQueryListenerBound = true;
  }

  function getLastOpenedProblemId() {
    return localStorage.getItem(LAST_OPENED_PROBLEM_KEY) ?? "";
  }

  function setLastOpenedProblemId(problemId) {
    if (!problemId) {
      localStorage.removeItem(LAST_OPENED_PROBLEM_KEY);
      return;
    }
    localStorage.setItem(LAST_OPENED_PROBLEM_KEY, problemId);
  }

  function applyListQuickFilter(filterType, filterValue) {
    const current = readListFilters();
    const next = {
      lectureMin: current.lectureMin ?? "",
      lectureMax: current.lectureMax ?? "",
      solved: current.solved ?? "all",
      understanding: current.understanding ?? "all",
      sortOrder: normalizeSortOrder(current.sortOrder ?? "lectureAsc"),
      difficulties: Array.isArray(current.difficulties) ? current.difficulties : [],
    };

    if (filterType === "lecture") {
      const isSameLecture =
        String(current.lectureMin ?? "") === filterValue &&
        String(current.lectureMax ?? "") === filterValue;
      next.lectureMin = isSameLecture ? "" : filterValue;
      next.lectureMax = isSameLecture ? "" : filterValue;
    } else if (filterType === "difficulty") {
      const currentDifficulties = Array.isArray(current.difficulties) ? current.difficulties : [];
      const isSameSingleDifficulty =
        currentDifficulties.length === 1 && currentDifficulties[0] === filterValue;
      next.difficulties = isSameSingleDifficulty ? [] : [filterValue];
    } else {
      return;
    }

    writeListFilters(next);
  }

  function getDifficultyLabel(config, difficulty) {
    if (difficulty == null) {
      return null;
    }
    return config.difficultyLabels[difficulty - 1] ?? `難易度 ${difficulty}`;
  }

  function formatLectureLabel(lecture, template = DEFAULT_CONFIG.lectureLabelTemplate) {
    if (lecture == null) {
      return null;
    }
    const lectureText = String(lecture);
    return String(template ?? DEFAULT_CONFIG.lectureLabelTemplate).replaceAll("{value}", lectureText);
  }

  function getLectureHue(lecture) {
    const numericLecture = Number(lecture);
    if (!Number.isFinite(numericLecture)) {
      return null;
    }

    // Alternate between two cool tones so neighboring lectures are distinguishable
    // without adding too many different colors to the page.
    const normalizedLecture = Math.max(1, Math.trunc(numericLecture));
    return normalizedLecture % 2 === 1 ? 176 : 244;
  }

  function getUnderstandingMarkerClass(value) {
    return value === ""
      ? "understanding-marker-understanding-unset"
      : `understanding-marker-understanding-${value}`;
  }

  function getAcceptedOnce(problemId) {
    return localStorage.getItem(storageKey("accepted", problemId)) === "true";
  }

  function getManualSolved(problemId) {
    return localStorage.getItem(storageKey("manualSolved", problemId)) ?? "";
  }

  function isProblemSolved(problemId) {
    const manual = getManualSolved(problemId);
    if (manual === "solved") {
      return true;
    }
    if (manual === "unsolved") {
      return false;
    }
    return getAcceptedOnce(problemId);
  }

  function setManualSolved(problemId, solved) {
    localStorage.setItem(storageKey("manualSolved", problemId), solved ? "solved" : "unsolved");
  }

  function markAccepted(problemId) {
    localStorage.setItem(storageKey("accepted", problemId), "true");
    localStorage.removeItem(storageKey("manualSolved", problemId));
  }

  function getUnderstanding(problemId) {
    return localStorage.getItem(storageKey("understanding", problemId)) ?? "";
  }

  function setUnderstanding(problemId, value) {
    if (value === "") {
      localStorage.removeItem(storageKey("understanding", problemId));
      return;
    }
    localStorage.setItem(storageKey("understanding", problemId), value);
  }

  function getStoredCode(problemId) {
    return localStorage.getItem(storageKey("code", problemId)) ?? "";
  }

  function setStoredCode(problemId, value) {
    localStorage.setItem(storageKey("code", problemId), value);
  }

  function getStoredTextAnswers(problemId) {
    const raw = localStorage.getItem(storageKey("textAnswers", problemId));
    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function setStoredTextAnswer(problemId, itemName, value) {
    const current = getStoredTextAnswers(problemId);
    if (value === "") {
      delete current[itemName];
    } else {
      current[itemName] = value;
    }
    localStorage.setItem(storageKey("textAnswers", problemId), JSON.stringify(current));
  }

  function clearStoredInputs(problemIds) {
    problemIds.forEach((problemId) => {
      localStorage.removeItem(storageKey("code", problemId));
      localStorage.removeItem(storageKey("textAnswers", problemId));
    });
  }

  function clearLearningProgress(problemIds) {
    problemIds.forEach((problemId) => {
      localStorage.removeItem(storageKey("accepted", problemId));
      localStorage.removeItem(storageKey("manualSolved", problemId));
      localStorage.removeItem(storageKey("understanding", problemId));
    });
  }

  function clearLearningRecord(problemIds) {
    localStorage.removeItem(LAST_OPENED_PROBLEM_KEY);
    clearLearningProgress(problemIds);
    clearStoredInputs(problemIds);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function renderGlobalFooter(config) {
    const copyright = document.getElementById("global-footer-copyright");
    if (copyright) {
      copyright.textContent = config.copyrightNotice ?? DEFAULT_CONFIG.copyrightNotice;
    }

    const validationLink = document.getElementById("global-footer-validation-link");
    if (validationLink) {
      validationLink.textContent = config.uiText?.validationLink ?? DEFAULT_CONFIG.uiText.validationLink;
    }

    const teacherGuideLink = document.getElementById("global-footer-teacher-guide-link");
    if (teacherGuideLink) {
      teacherGuideLink.textContent = config.uiText?.teacherGuideLink ?? DEFAULT_CONFIG.uiText.teacherGuideLink;
    }
  }

  global.CCC = {
    DEFAULT_CONFIG,
    FILTER_STORAGE_KEY,
    LAST_OPENED_PROBLEM_KEY,
    THEME_STORAGE_KEY,
    fetchConfig,
    populateLabelSelect,
    populateOrderedLabelSelect,
    normalizeSortOrder,
    readListFilters,
    writeListFilters,
    getThemePreference,
    setThemePreference,
    applyThemePreference,
    bindThemePreferenceListener,
    getLastOpenedProblemId,
    setLastOpenedProblemId,
    applyListQuickFilter,
    getDifficultyLabel,
    formatLectureLabel,
    getLectureHue,
    getUnderstandingMarkerClass,
    getAcceptedOnce,
    getManualSolved,
    isProblemSolved,
    setManualSolved,
    markAccepted,
    getUnderstanding,
    setUnderstanding,
    getStoredCode,
    setStoredCode,
    getStoredTextAnswers,
    setStoredTextAnswer,
    clearStoredInputs,
    clearLearningProgress,
    clearLearningRecord,
    escapeHtml,
    renderGlobalFooter,
  };
})(window);
