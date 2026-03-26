(function initCccCommon(global) {
  const DEFAULT_CONFIG = {
    appName: "CCC",
    appSubtitle: "C プログラミングの自習と理解度確認のための演習環境です。",
    courseId: "ccc-demo",
    courseLabel: "CCC Demo Course",
    copyrightNotice: "© CCC",
    lectureLabelTemplate: "第 {value} 回",
    difficultyLabels: ["基礎", "中級", "発展"],
    understandingLabels: ["要復習", "ふつう", "自信あり"],
    uiText: {
      backToList: "← 問題一覧へ戻る",
      validationLink: "問題ステータス",
      teacherGuideLink: "教師用ガイド",
      teacherGuideTitle: "教師用ガイド",
      guidePanelTitle: "解説",
      guideReadLabel: "解説を読む",
      guideEmptyMessage: "この問題の解説はありません。",
    },
    tabWidth: 4,
    editorRows: 20,
    longExampleLineThreshold: 30,
    resultPreviewMaxLines: 120,
    resultPreviewMaxChars: 6000,
    resultMessagePreviewMaxLines: 40,
    maxCodeBytes: 65536,
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

  function clearStoredCode(problemIds) {
    problemIds.forEach((problemId) => {
      localStorage.removeItem(storageKey("code", problemId));
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
    clearStoredCode(problemIds);
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
    clearStoredCode,
    clearLearningProgress,
    clearLearningRecord,
    escapeHtml,
    renderGlobalFooter,
  };
})(window);
