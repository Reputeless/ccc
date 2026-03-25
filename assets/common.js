(function initCccCommon(global) {
  const DEFAULT_CONFIG = {
    appName: "CCC",
    appSubtitle: "C プログラミングの自習と理解度確認のための演習環境です。",
    courseId: "ccc-demo",
    courseLabel: "CCC Demo Course",
    copyrightNotice: "© CCC",
    difficultyLabels: ["基礎", "中級", "発展"],
    understandingLabels: ["要復習", "ふつう", "自信あり"],
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

  function formatLectureLabel(lecture, suffix = "回") {
    if (lecture == null) {
      return null;
    }
    return `第 ${lecture} ${suffix}`;
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
  }

  global.CCC = {
    DEFAULT_CONFIG,
    FILTER_STORAGE_KEY,
    LAST_OPENED_PROBLEM_KEY,
    fetchConfig,
    populateLabelSelect,
    normalizeSortOrder,
    readListFilters,
    writeListFilters,
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
    escapeHtml,
    renderGlobalFooter,
  };
})(window);
