(function initCccCommon(global) {
  const DEFAULT_CONFIG = {
    appName: "CCC",
    courseId: "ccc-demo",
    courseLabel: "CCC Demo Course",
    copyrightNotice: "",
    lectureLabelTemplate: "第 {value} 回",
    difficultyLabels: ["基本", "標準", "発展"],
    understandingLabels: ["要復習", "ふつう", "自信あり"],
    uiText: {},
    tabWidth: 4,
    editorRows: 20,
    longExampleLineThreshold: 30,
    resultPreviewMaxLines: 120,
    resultPreviewMaxChars: 6000,
    resultMessagePreviewMaxLines: 40,
    maxCodeBytes: 65536,
    maxTextAnswerChars: 100,
  };
  const STORAGE_PREFIX = "ccc:v1";
  const LEGACY_FILTER_STORAGE_KEY = `${STORAGE_PREFIX}:listFilters`;
  const LEGACY_LAST_OPENED_PROBLEM_KEY = `${STORAGE_PREFIX}:lastOpenedProblem`;
  const THEME_STORAGE_KEY = "ccc:v1:theme";
  const VISUAL_EFFECTS_STORAGE_KEY = "ccc:v1:visualEffects";
  let storageNamespace = buildStorageNamespace(DEFAULT_CONFIG);
  let themeMediaQuery = null;
  let themeMediaQueryListenerBound = false;

  function isPresentString(value) {
    return typeof value === "string" && value !== "";
  }

  function buildMissingKeyLabel(key) {
    return `[[${key}]]`;
  }

  function getConfigText(config, key, fallback = buildMissingKeyLabel(key)) {
    return isPresentString(config?.[key]) ? config[key] : fallback;
  }

  function getUiText(config, key, fallback = buildMissingKeyLabel(key)) {
    return isPresentString(config?.uiText?.[key]) ? config.uiText[key] : fallback;
  }

  function sanitizeStoragePart(value, fallback) {
    const normalized = String(value ?? "").trim();
    if (normalized === "") {
      return fallback;
    }
    return encodeURIComponent(normalized).replace(/%/g, "_").replace(/[^a-zA-Z0-9_.~-]+/g, "-");
  }

  function getInstallPath() {
    try {
      return new URL(".", global.location?.href ?? "").pathname || "/";
    } catch {
      return "/";
    }
  }

  function buildStorageNamespace(config) {
    const courseId = sanitizeStoragePart(config?.courseId, "course");
    const installPath = sanitizeStoragePart(getInstallPath(), "root");
    return `site:${installPath}:course:${courseId}`;
  }

  function setStorageNamespaceFromConfig(config) {
    storageNamespace = buildStorageNamespace(config);
  }

  function namespacedStorageKey(kind, suffix = "") {
    return `${STORAGE_PREFIX}:${storageNamespace}:${kind}${suffix}`;
  }

  function legacyProblemStorageKey(kind, problemId) {
    return `${STORAGE_PREFIX}:${kind}:${problemId}`;
  }

  function storageKey(kind, problemId) {
    return namespacedStorageKey(kind, `:${problemId}`);
  }

  function getFilterStorageKey() {
    return namespacedStorageKey("listFilters");
  }

  function getLastOpenedProblemStorageKey() {
    return namespacedStorageKey("lastOpenedProblem");
  }

  function setLocalStorageItem(primaryKey, value, legacyKey = null) {
    localStorage.setItem(primaryKey, value);
    if (legacyKey !== null) {
      localStorage.removeItem(legacyKey);
    }
  }

  function removeLocalStorageItem(primaryKey, legacyKey = null) {
    localStorage.removeItem(primaryKey);
    if (legacyKey !== null) {
      localStorage.removeItem(legacyKey);
    }
  }

  async function fetchConfig() {
    const response = await fetch("api/config.php", { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error("config fetch failed");
    }
    const config = { ...DEFAULT_CONFIG, ...(await response.json()) };
    setStorageNamespaceFromConfig(config);
    return config;
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
    const raw = localStorage.getItem(getFilterStorageKey());
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
    setLocalStorageItem(getFilterStorageKey(), JSON.stringify(filters), LEGACY_FILTER_STORAGE_KEY);
  }

  function normalizeThemePreference(value) {
    return value === "light" || value === "dark" || value === "frost" || value === "system" ? value : "light";
  }

  function getThemePreference() {
    return normalizeThemePreference(localStorage.getItem(THEME_STORAGE_KEY) ?? "light");
  }

  function setThemePreference(value) {
    localStorage.setItem(THEME_STORAGE_KEY, normalizeThemePreference(value));
  }

  function resolveThemePreference(value) {
    const preference = normalizeThemePreference(value);
    if (preference === "light" || preference === "dark" || preference === "frost") {
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

  function normalizeVisualEffectsPreference(value) {
    return value === "standard" || value === "reduced" ? value : "standard";
  }

  function getVisualEffectsPreference() {
    return normalizeVisualEffectsPreference(localStorage.getItem(VISUAL_EFFECTS_STORAGE_KEY) ?? "standard");
  }

  function setVisualEffectsPreference(value) {
    localStorage.setItem(VISUAL_EFFECTS_STORAGE_KEY, normalizeVisualEffectsPreference(value));
  }

  function applyVisualEffectsPreference(value = getVisualEffectsPreference()) {
    const preference = normalizeVisualEffectsPreference(value);
    document.documentElement.dataset.visualEffects = preference;
  }

  function visualEffectsReduced(value = getVisualEffectsPreference()) {
    return normalizeVisualEffectsPreference(value) === "reduced";
  }

  function getLastOpenedProblemId() {
    return localStorage.getItem(getLastOpenedProblemStorageKey()) ?? "";
  }

  function setLastOpenedProblemId(problemId) {
    if (!problemId) {
      removeLocalStorageItem(getLastOpenedProblemStorageKey(), LEGACY_LAST_OPENED_PROBLEM_KEY);
      return;
    }
    setLocalStorageItem(getLastOpenedProblemStorageKey(), problemId, LEGACY_LAST_OPENED_PROBLEM_KEY);
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
    setLocalStorageItem(storageKey("manualSolved", problemId), solved ? "solved" : "unsolved", legacyProblemStorageKey("manualSolved", problemId));
  }

  function markAccepted(problemId) {
    setLocalStorageItem(storageKey("accepted", problemId), "true", legacyProblemStorageKey("accepted", problemId));
    removeLocalStorageItem(storageKey("manualSolved", problemId), legacyProblemStorageKey("manualSolved", problemId));
  }

  function getUnderstanding(problemId) {
    return localStorage.getItem(storageKey("understanding", problemId)) ?? "";
  }

  function setUnderstanding(problemId, value) {
    if (value === "") {
      removeLocalStorageItem(storageKey("understanding", problemId), legacyProblemStorageKey("understanding", problemId));
      return;
    }
    setLocalStorageItem(storageKey("understanding", problemId), value, legacyProblemStorageKey("understanding", problemId));
  }

  function getStoredCode(problemId) {
    return localStorage.getItem(storageKey("code", problemId)) ?? "";
  }

  function setStoredCode(problemId, value) {
    setLocalStorageItem(storageKey("code", problemId), value, legacyProblemStorageKey("code", problemId));
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
    setLocalStorageItem(storageKey("textAnswers", problemId), JSON.stringify(current), legacyProblemStorageKey("textAnswers", problemId));
  }

  function clearStoredInputs(problemIds) {
    problemIds.forEach((problemId) => {
      removeLocalStorageItem(storageKey("code", problemId), legacyProblemStorageKey("code", problemId));
      removeLocalStorageItem(storageKey("textAnswers", problemId), legacyProblemStorageKey("textAnswers", problemId));
    });
  }

  function clearLearningProgress(problemIds) {
    problemIds.forEach((problemId) => {
      removeLocalStorageItem(storageKey("accepted", problemId), legacyProblemStorageKey("accepted", problemId));
      removeLocalStorageItem(storageKey("manualSolved", problemId), legacyProblemStorageKey("manualSolved", problemId));
      removeLocalStorageItem(storageKey("understanding", problemId), legacyProblemStorageKey("understanding", problemId));
    });
  }

  function clearLearningRecord(problemIds) {
    removeLocalStorageItem(getLastOpenedProblemStorageKey(), LEGACY_LAST_OPENED_PROBLEM_KEY);
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
      copyright.textContent = getConfigText(config, "copyrightNotice", "");
    }

    const validationLink = document.getElementById("global-footer-validation-link");
    if (validationLink) {
      validationLink.textContent = getUiText(config, "validationLink");
    }

    const teacherGuideLink = document.getElementById("global-footer-teacher-guide-link");
    if (teacherGuideLink) {
      teacherGuideLink.textContent = getUiText(config, "teacherGuideLink");
    }
  }

  global.CCC = {
    DEFAULT_CONFIG,
    getFilterStorageKey,
    getLastOpenedProblemStorageKey,
    THEME_STORAGE_KEY,
    VISUAL_EFFECTS_STORAGE_KEY,
    setStorageNamespaceFromConfig,
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
    getVisualEffectsPreference,
    setVisualEffectsPreference,
    applyVisualEffectsPreference,
    visualEffectsReduced,
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
    getConfigText,
    getUiText,
  };
})(window);
