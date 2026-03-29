const LIST_SCROLL_KEY = "ccc:v1:listScroll";
const SIDEBAR_STICKY_BREAKPOINT = 1080;
const SIDEBAR_STICKY_TOP = 18;

const {
  DEFAULT_CONFIG,
  FILTER_STORAGE_KEY,
  fetchConfig,
  getConfigText,
  getUiText,
  populateLabelSelect,
  populateOrderedLabelSelect,
  normalizeSortOrder,
  applyListQuickFilter,
  getThemePreference,
  setThemePreference,
  applyThemePreference,
  bindThemePreferenceListener,
  getLastOpenedProblemId,
  getDifficultyLabel,
  formatLectureLabel,
  getLectureHue,
  getUnderstandingMarkerClass,
  isProblemSolved,
  setManualSolved,
  getUnderstanding,
  setUnderstanding,
  clearStoredInputs,
  clearLearningProgress,
  escapeHtml,
  renderGlobalFooter,
} = window.CCC;

let appConfig = { ...DEFAULT_CONFIG };
let allProblems = [];
let shouldRestoreInitialScroll = true;
let animatedSolvedProblemId = null;
let animatedUnderstandingProblemId = null;
let sidebarStickyFrame = 0;
const UNDERSTANDING_SELECT_ORDER = ["3", "2", "1"];

function uiText(key) {
  return getUiText(appConfig, key);
}

function formatUiText(key, replacements = {}) {
  return Object.entries(replacements).reduce((text, [name, value]) => {
    return text.replaceAll(`{${name}}`, String(value));
  }, uiText(key));
}

document.addEventListener("DOMContentLoaded", async () => {
  window.addEventListener("pagehide", saveScrollPosition);
  window.addEventListener("resize", scheduleSidebarStickyUpdate);
  document.getElementById("reset-filters").addEventListener("click", resetFilters);
  document.getElementById("app-name").addEventListener("click", handleHeroResetClick);
  document.getElementById("hero-card").addEventListener("click", handleHeroCardClick);
  applyThemePreference();
  bindThemePreferenceListener();

  try {
    appConfig = await fetchConfig();
  } catch {
    showListMessage(uiText("configLoadWarning"), "warning");
  }

  const appName = getConfigText(appConfig, "appName", DEFAULT_CONFIG.appName);
  document.title = appName;
  document.getElementById("app-name").textContent = appName;
  document.getElementById("app-subtitle").textContent = getConfigText(appConfig, "appSubtitle");
  renderGlobalFooter(appConfig);
  renderStaticUiText();
  setupStaticControls();
  await loadProblems();
  scheduleSidebarStickyUpdate();
});

async function loadProblems() {
  const response = await fetch("api/problems.php", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    showListMessage(uiText("problemListLoadError"), "error");
    return;
  }

  const payload = await response.json();
  allProblems = Array.isArray(payload.items) ? payload.items : [];
  renderRecordPanel();
  renderProblemList();
}

function setupStaticControls() {
  populateSolvedFilter();
  populateUnderstandingFilter();
  populateSortOrderSelect();
  populateDifficultyOptions();
  restoreFilterState();
  setupRecordTransferControls();
  setupAppearanceControls();

  [
    document.getElementById("lecture-min"),
    document.getElementById("lecture-max"),
    document.getElementById("solved-filter"),
    document.getElementById("understanding-filter"),
    document.getElementById("sort-order"),
  ].forEach((element) => element.addEventListener("input", onFilterChanged));

  document.getElementById("difficulty-options").addEventListener("change", onFilterChanged);
}

function renderStaticUiText() {
  const textMap = {
    "hero-eyebrow": "heroEyebrow",
    "filters-kicker": "filtersKicker",
    "filters-heading": "filtersTitle",
    "reset-filters": "resetFiltersButton",
    "lecture-range-label": "lectureRangeLabel",
    "lecture-min-label": "lectureMinLabel",
    "lecture-max-label": "lectureMaxLabel",
    "solved-filter-label": "solvedFilterLabel",
    "understanding-filter-label": "understandingFilterLabel",
    "sort-order-label": "sortOrderLabel",
    "difficulty-filter-label": "difficultyFilterLabel",
    "active-filters-label": "activeFiltersLabel",
    "learning-summary-heading": "learningSummaryTitle",
    "summary-solved-label": "solvedCountLabel",
    "summary-review-label": "reviewCountLabel",
    "record-panel-kicker": "recordPanelKicker",
    "record-panel-heading": "recordPanelTitle",
    "recent-problem-title": "recentProblemTitle",
    "record-transfer-summary": "recordTransferSummary",
    "export-learning-record": "exportRecordButton",
    "export-record-description": "exportRecordDescription",
    "import-learning-record": "importRecordButton",
    "import-record-description": "importRecordDescription",
    "record-danger-summary": "recordDangerSummary",
    "clear-stored-code": "clearCodeButton",
    "clear-code-description": "clearCodeDescription",
    "clear-learning-progress": "clearProgressButton",
    "clear-progress-description": "clearProgressDescription",
    "appearance-kicker": "appearanceKicker",
    "appearance-panel-heading": "appearanceTitle",
    "theme-summary": "themeSummary",
    "problem-list-kicker": "problemListKicker",
    "problems-heading": "problemListTitle",
  };

  Object.entries(textMap).forEach(([id, key]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = uiText(key);
    }
  });

  const themeLightOption = document.getElementById("theme-light-option");
  if (themeLightOption) {
    themeLightOption.textContent = uiText("themeLight");
  }

  const themeDarkOption = document.getElementById("theme-dark-option");
  if (themeDarkOption) {
    themeDarkOption.textContent = uiText("themeDark");
  }

  const themeSystemOption = document.getElementById("theme-system-option");
  if (themeSystemOption) {
    themeSystemOption.textContent = uiText("themeSystem");
  }
}

function setupAppearanceControls() {
  const select = document.getElementById("theme-preference");
  if (!select) {
    return;
  }

  select.value = getThemePreference();
  select.addEventListener("change", () => {
    setThemePreference(select.value);
    applyThemePreference(select.value);
  });
}

function setupRecordTransferControls() {
  document.getElementById("export-learning-record").addEventListener("click", exportLearningRecord);
  document.getElementById("import-learning-record").addEventListener("click", () => {
    document.getElementById("import-learning-record-file").click();
  });
  document.getElementById("import-learning-record-file").addEventListener("change", importLearningRecord);
  document.getElementById("clear-stored-code").addEventListener("click", clearStoredCodeWithConfirmation);
  document.getElementById("clear-learning-progress").addEventListener("click", clearLearningProgressWithConfirmation);
}

function populateSolvedFilter() {
  const select = document.getElementById("solved-filter");
  select.innerHTML = "";
  [
    { value: "all", label: uiText("solvedFilterAll") },
    { value: "solved", label: uiText("solvedFilterSolvedOnly") },
    { value: "unsolved", label: uiText("solvedFilterUnsolvedOnly") },
  ].forEach((option) => {
    select.appendChild(new Option(option.label, option.value));
  });
}

function populateUnderstandingFilter() {
  populateLabelSelect(document.getElementById("understanding-filter"), appConfig.understandingLabels, {
    emptyLabel: uiText("unsetLabel"),
    emptyValue: "unset",
  });
  document.getElementById("understanding-filter").insertAdjacentHTML("afterbegin", `<option value="all">${escapeHtml(uiText("understandingFilterAll"))}</option>`);
}

function populateSortOrderSelect() {
  const select = document.getElementById("sort-order");
  select.innerHTML = "";
  [
    { value: "lectureAsc", label: uiText("sortOrderLectureAsc") },
    { value: "lectureDesc", label: uiText("sortOrderLectureDesc") },
    { value: "numberAsc", label: uiText("sortOrderNumberAsc") },
    { value: "numberDesc", label: uiText("sortOrderNumberDesc") },
    { value: "understandingHigh", label: uiText("sortOrderUnderstandingHigh") },
    { value: "understandingLow", label: uiText("sortOrderUnderstandingLow") },
  ].forEach((option) => {
    select.appendChild(new Option(option.label, option.value));
  });
}

function populateDifficultyOptions() {
  const container = document.getElementById("difficulty-options");
  container.innerHTML = "";

  [...appConfig.difficultyLabels, uiText("unsetLabel")].forEach((label, index) => {
    const value = index < appConfig.difficultyLabels.length ? String(index + 1) : "unset";
    const wrapper = document.createElement("label");
    wrapper.className = "chip-option";
    wrapper.innerHTML = `
      <input type="checkbox" value="${value}">
      <span>${escapeHtml(label)}</span>
    `;
    container.appendChild(wrapper);
  });
}

function onFilterChanged() {
  saveFilterState();
  renderProblemList();
}

function resetFilters() {
  document.getElementById("lecture-min").value = "";
  document.getElementById("lecture-max").value = "";
  document.getElementById("solved-filter").value = "all";
  document.getElementById("understanding-filter").value = "all";
  document.getElementById("sort-order").value = "lectureAsc";
  document.querySelectorAll("#difficulty-options input[type='checkbox']").forEach((checkbox) => {
    checkbox.checked = false;
  });
  onFilterChanged();
}

function resetFiltersAndScrollToTop() {
  resetFilters();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleHeroResetClick(event) {
  event.preventDefault();
  resetFiltersAndScrollToTop();
}

function handleHeroCardClick(event) {
  if (event.target.closest(".hero-reset-trigger")) {
    return;
  }

  if (!window.matchMedia("(max-width: 800px)").matches) {
    return;
  }

  resetFiltersAndScrollToTop();
}

function renderProblemList() {
  const list = document.getElementById("problem-list");
  list.innerHTML = "";
  showListMessage("", "muted", true);

  const filterState = getFilterState();
  const filtered = allProblems
    .filter((problem) => matchesFilters(problem, filterState))
    .sort((left, right) => compareProblems(left, right, filterState.sortOrder));

  document.getElementById("problem-count").textContent = formatUiText("problemCountTemplate", {
    shown: filtered.length,
    total: allProblems.length,
  });
  renderActiveFilters(filterState);
  renderLearningSummary(filtered);

  if (filtered.length === 0) {
    list.innerHTML = `<div class="status-banner muted-banner">${escapeHtml(uiText("noMatchingProblems"))}</div>`;
    scheduleSidebarStickyUpdate();
    return;
  }

  const fragment = document.createDocumentFragment();
  filtered.forEach((problem) => fragment.appendChild(renderProblemCard(problem)));
  list.appendChild(fragment);

  if (shouldRestoreInitialScroll) {
    shouldRestoreInitialScroll = false;
    requestAnimationFrame(restoreScrollPosition);
  }

  scheduleSidebarStickyUpdate();
}

function renderProblemCard(problem) {
  const article = document.createElement("article");
  article.className = "problem-card";

  const understandingValue = getUnderstanding(problem.id);
  const understandingAnimationClass = animatedUnderstandingProblemId === problem.id
    ? " understanding-select-wrap-animate"
    : "";
  const numberSlot = problem.number ? `<span class="problem-number">${escapeHtml(problem.number)}</span>` : "";

  article.innerHTML = `
    <div class="problem-main">
      <a class="problem-main-link" href="problem.html?id=${encodeURIComponent(problem.id)}">
        <span class="problem-number-slot">${numberSlot}</span>
        <span class="problem-title-text">${escapeHtml(problem.title)}</span>
      </a>
    </div>
    <div class="problem-card-actions">
      <div class="problem-card-meta-group">
        <span class="meta-slot meta-slot-lecture">${renderLectureBadge(problem.lecture)}</span>
        <span class="meta-slot meta-slot-difficulty">${renderDifficultyBadge(problem.difficulty)}</span>
      </div>
      <div class="problem-card-state-group">
        ${renderSolvedToggle(problem)}
        <label class="field select-inline compact-select">
          <span class="sr-only">${escapeHtml(uiText("understandingSelectLabel"))}</span>
          <span class="understanding-select-wrap${understandingAnimationClass}" data-tooltip="${escapeHtml(uiText("understandingSelectLabel"))}">
            <span class="understanding-marker ${getUnderstandingMarkerClass(understandingValue)}" aria-hidden="true"></span>
            <span class="understanding-mobile-label">${escapeHtml(getUnderstandingDisplayLabel(understandingValue))}</span>
            <select class="understanding-select" aria-label="${escapeHtml(uiText("understandingSelectLabel"))}"></select>
          </span>
        </label>
      </div>
    </div>
  `;

  bindProblemCardInteractions(article, problem, understandingValue);
  return article;
}

function renderLectureBadge(lecture) {
  if (lecture == null) {
    return "";
  }
  const lectureHue = getLectureHue(lecture);
  const lectureStyle = lectureHue == null ? "" : ` style="--lecture-hue:${lectureHue};"`;
  return `<button type="button" class="lecture-badge lecture-badge-coded meta-filter-trigger" data-filter-type="lecture" data-filter-value="${escapeHtml(String(lecture))}" data-tooltip="${escapeHtml(uiText("lectureBadgeTitle"))}"${lectureStyle}>${escapeHtml(formatLectureLabel(lecture, appConfig.lectureLabelTemplate))}</button>`;
}

function getUnderstandingDisplayLabel(value) {
  if (value === "") {
    return uiText("unsetLabel");
  }

  const index = Number(value) - 1;
  return appConfig.understandingLabels[index] ?? uiText("unsetLabel");
}

function renderRecordPanel() {
  const container = document.getElementById("last-opened-problem");
  if (!container) {
    return;
  }

  const lastOpenedId = getLastOpenedProblemId();
  const problem = allProblems.find((item) => item.id === lastOpenedId);

  if (!problem) {
    container.innerHTML = `<p class="record-transfer-text record-transfer-text-compact">${escapeHtml(uiText("noRecentProblem"))}</p>`;
    scheduleSidebarStickyUpdate();
    return;
  }

  const number = `<span class="record-problem-number">${problem.number ? escapeHtml(problem.number) : ""}</span>`;
  container.innerHTML = `
    <a class="record-problem-link" href="problem.html?id=${encodeURIComponent(problem.id)}">
      ${number}
      <span class="record-problem-title">${escapeHtml(problem.title)}</span>
    </a>
  `;
  scheduleSidebarStickyUpdate();
}

function exportLearningRecord() {
  const payload = {
    app: getConfigText(appConfig, "appName", DEFAULT_CONFIG.appName),
    kind: "learning-record",
    version: 1,
    courseId: appConfig.courseId,
    courseLabel: appConfig.courseLabel,
    exportedAt: new Date().toISOString(),
    records: buildLearningRecordExport(),
  };

  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildLearningRecordFilename();
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  showRecordTransferStatus(uiText("recordExportSuccess"));
}

function buildLearningRecordExport() {
  const records = {};

  allProblems.forEach((problem) => {
    const entry = {};
    if (isProblemSolved(problem.id)) {
      entry.solved = true;
    }

    const understanding = getUnderstanding(problem.id);
    if (understanding !== "") {
      entry.understanding = understanding;
    }

    if (Object.keys(entry).length > 0) {
      records[problem.id] = entry;
    }
  });

  return records;
}

function buildLearningRecordFilename() {
  const date = new Date();
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const safeCourseId = String(appConfig.courseId ?? "ccc").replace(/[^a-zA-Z0-9_-]+/g, "-");
  return `ccc-learning-record-${safeCourseId}-${yyyy}-${mm}-${dd}.json`;
}

async function importLearningRecord(event) {
  const input = event.currentTarget;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    const validationError = validateLearningRecordImport(payload);
    if (validationError) {
      showRecordTransferStatus(validationError, true);
      return;
    }

    if (shouldConfirmCourseMismatch(payload)) {
      const confirmed = window.confirm(
        formatUiText("recordImportCourseMismatchConfirm", {
          current: appConfig.courseLabel,
          file: payload.courseLabel ?? payload.courseId,
        })
      );
      if (!confirmed) {
        showRecordTransferStatus(uiText("recordImportCancelled"));
        return;
      }
    }

    const importedCount = applyLearningRecordImport(payload.records);
    renderRecordPanel();
    renderProblemList();
    showRecordTransferStatus(formatUiText("recordImportSuccess", { count: importedCount }));
  } catch {
    showRecordTransferStatus(uiText("recordImportReadError"), true);
  } finally {
    input.value = "";
  }
}

function validateLearningRecordImport(payload) {
  if (!payload || typeof payload !== "object") {
    return uiText("recordImportInvalidFile");
  }
  if (payload.kind !== "learning-record" || payload.version !== 1) {
    return uiText("recordImportInvalidFile");
  }
  if (!payload.records || typeof payload.records !== "object" || Array.isArray(payload.records)) {
    return uiText("recordImportInvalidRecords");
  }
  return "";
}

function shouldConfirmCourseMismatch(payload) {
  if (!payload.courseId || !appConfig.courseId) {
    return false;
  }
  return payload.courseId !== appConfig.courseId;
}

function applyLearningRecordImport(records) {
  let count = 0;

  Object.entries(records).forEach(([problemId, entry]) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return;
    }

    let changed = false;

    if (entry.solved === true) {
      const wasSolved = isProblemSolved(problemId);
      setManualSolved(problemId, true);
      if (!wasSolved) {
        changed = true;
      }
    }

    if (entry.understanding === "1" || entry.understanding === "2" || entry.understanding === "3") {
      if (getUnderstanding(problemId) !== entry.understanding) {
        setUnderstanding(problemId, entry.understanding);
        changed = true;
      }
    }

    if (changed) {
      count += 1;
    }
  });

  return count;
}

function showRecordTransferStatus(message, isError = false) {
  const status = document.getElementById("record-transfer-status");
  status.hidden = !message;
  status.textContent = message;
  status.className = `record-transfer-status${isError ? " record-transfer-status-error" : ""}`;
  scheduleSidebarStickyUpdate();
}

function scheduleSidebarStickyUpdate() {
  if (sidebarStickyFrame) {
    window.cancelAnimationFrame(sidebarStickyFrame);
  }

  sidebarStickyFrame = window.requestAnimationFrame(() => {
    sidebarStickyFrame = 0;
    updateSidebarStickyState();
  });
}

function updateSidebarStickyState() {
  const sidebar = document.querySelector(".dashboard-sidebar");
  if (!sidebar) {
    return;
  }

  const canUseSticky = window.innerWidth > SIDEBAR_STICKY_BREAKPOINT;
  const availableHeight = window.innerHeight - SIDEBAR_STICKY_TOP - 8;
  const fitsViewport = sidebar.scrollHeight <= availableHeight;

  sidebar.classList.toggle("is-sticky", canUseSticky && fitsViewport);
}

function clearStoredCodeWithConfirmation() {
  const confirmed = window.confirm(
    uiText("clearCodeConfirm")
  );

  if (!confirmed) {
    showRecordTransferStatus(uiText("clearCodeCancelled"));
    return;
  }

  clearStoredInputs(allProblems.map((problem) => problem.id));
  renderProblemList();
  showRecordTransferStatus(uiText("clearCodeDone"));
}

function clearLearningProgressWithConfirmation() {
  const confirmed = window.confirm(
    uiText("clearProgressConfirm")
  );

  if (!confirmed) {
    showRecordTransferStatus(uiText("clearProgressCancelled"));
    return;
  }

  clearLearningProgress(allProblems.map((problem) => problem.id));
  renderRecordPanel();
  renderProblemList();
  showRecordTransferStatus(uiText("clearProgressDone"));
}

function renderDifficultyBadge(difficulty) {
  if (difficulty == null) {
    return "";
  }
  const difficultyKey = String(difficulty);
  const difficultyLabel = getDifficultyLabel(appConfig, difficulty);
  return `<button type="button" class="difficulty-badge difficulty-${escapeHtml(difficultyKey)} meta-filter-trigger" data-filter-type="difficulty" data-filter-value="${escapeHtml(difficultyKey)}" data-tooltip="${escapeHtml(uiText("difficultyBadgeTitle"))}">${escapeHtml(difficultyLabel)}</button>`;
}

function renderSolvedToggle(problem) {
  const solvedAnimationClass = animatedSolvedProblemId === problem.id ? " solved-toggle-animate" : "";
  return `
    <label class="solved-toggle solved-toggle-small${solvedAnimationClass}" data-tooltip="${escapeHtml(uiText("solvedToggleLabel"))}">
      <input class="solved-checkbox solved-toggle-input sr-only" type="checkbox" aria-label="${escapeHtml(uiText("solvedToggleLabel"))}" ${isProblemSolved(problem.id) ? "checked" : ""}>
      <span class="solved-toggle-icon" aria-hidden="true">
        <svg viewBox="0 0 20 20" focusable="false">
          <circle class="solved-toggle-circle" cx="10" cy="10" r="7.75"></circle>
          <path class="solved-toggle-check" d="M6 10.5 8.8 13.3 14 8"></path>
        </svg>
      </span>
    </label>
  `;
}

function bindProblemCardInteractions(article, problem, understandingValue) {
  article.querySelectorAll(".meta-filter-trigger").forEach((button) => {
    button.addEventListener("click", () => {
      applyListQuickFilter(button.dataset.filterType ?? "", button.dataset.filterValue ?? "");
      restoreFilterState();
      renderProblemList();
      requestAnimationFrame(scrollListPanelIntoView);
    });
  });

  const solvedCheckbox = article.querySelector(".solved-checkbox");
  solvedCheckbox.addEventListener("change", () => {
    animatedSolvedProblemId = problem.id;
    setManualSolved(problem.id, solvedCheckbox.checked);
    renderProblemList();
    window.setTimeout(() => {
      if (animatedSolvedProblemId === problem.id) {
        animatedSolvedProblemId = null;
      }
    }, 400);
  });

  const select = article.querySelector(".understanding-select");
  const marker = article.querySelector(".understanding-marker");
  populateOrderedLabelSelect(select, appConfig.understandingLabels, UNDERSTANDING_SELECT_ORDER, { emptyLabel: "" });
  select.value = understandingValue;
  select.addEventListener("change", () => {
    animatedUnderstandingProblemId = problem.id;
    marker.className = `understanding-marker ${getUnderstandingMarkerClass(select.value)}`;
    setUnderstanding(problem.id, select.value);
    renderProblemList();
    window.setTimeout(() => {
      if (animatedUnderstandingProblemId === problem.id) {
        animatedUnderstandingProblemId = null;
      }
    }, 520);
  });
}

function matchesFilters(problem, filters) {
  const lecture = problem.lecture;
  if (filters.lectureMin !== "" || filters.lectureMax !== "") {
    if (lecture == null) {
      return false;
    }
    if (filters.lectureMin !== "" && lecture < Number(filters.lectureMin)) {
      return false;
    }
    if (filters.lectureMax !== "" && lecture > Number(filters.lectureMax)) {
      return false;
    }
  }

  if (filters.difficulties.length > 0) {
    const difficultyValue = problem.difficulty == null ? "unset" : String(problem.difficulty);
    if (!filters.difficulties.includes(difficultyValue)) {
      return false;
    }
  }

  const solved = isProblemSolved(problem.id);
  if (filters.solved === "solved" && !solved) {
    return false;
  }
  if (filters.solved === "unsolved" && solved) {
    return false;
  }

  const understanding = getUnderstanding(problem.id);
  if (filters.understanding === "unset" && understanding !== "") {
    return false;
  }
  if (filters.understanding !== "all" && filters.understanding !== "unset" && understanding !== filters.understanding) {
    return false;
  }

  return true;
}

function compareProblems(left, right, sortOrder) {
  const normalizedSortOrder = normalizeSortOrder(sortOrder);

  if (normalizedSortOrder === "numberAsc" || normalizedSortOrder === "numberDesc") {
    const numberCompare = compareByNumber(left, right);
    if (numberCompare !== 0) {
      return normalizedSortOrder === "numberDesc" ? -numberCompare : numberCompare;
    }
    return left.id.localeCompare(right.id, "ja");
  }

  if (normalizedSortOrder === "understandingHigh" || normalizedSortOrder === "understandingLow") {
    const understandingCompare = compareByUnderstanding(left, right, normalizedSortOrder);
    if (understandingCompare !== 0) {
      return understandingCompare;
    }

    const lectureCompare = compareByLecture(left, right);
    if (lectureCompare !== 0) {
      return lectureCompare;
    }

    const numberCompare = compareByNumber(left, right);
    if (numberCompare !== 0) {
      return numberCompare;
    }

    return left.id.localeCompare(right.id, "ja");
  }

  const lectureCompare = compareByLecture(left, right);
  if (lectureCompare !== 0) {
    return normalizedSortOrder === "lectureDesc" ? -lectureCompare : lectureCompare;
  }

  const numberCompare = compareByNumber(left, right);
  if (numberCompare !== 0) {
    return numberCompare;
  }

  return left.id.localeCompare(right.id, "ja");
}

function compareByLecture(left, right) {
  const leftLecture = left.lecture == null ? Number.POSITIVE_INFINITY : left.lecture;
  const rightLecture = right.lecture == null ? Number.POSITIVE_INFINITY : right.lecture;
  return leftLecture - rightLecture;
}

function compareByNumber(left, right) {
  const leftNumber = (left.number ?? "").trim();
  const rightNumber = (right.number ?? "").trim();
  return (leftNumber || left.id).localeCompare(rightNumber || right.id, "ja");
}

function compareByUnderstanding(left, right, sortOrder) {
  const leftUnderstanding = getUnderstandingSortRank(getUnderstanding(left.id), sortOrder);
  const rightUnderstanding = getUnderstandingSortRank(getUnderstanding(right.id), sortOrder);
  return leftUnderstanding - rightUnderstanding;
}

function getUnderstandingSortRank(value, sortOrder) {
  if (value === "") {
    return 99;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 99;
  }

  if (sortOrder === "understandingHigh") {
    if (numericValue === 3) {
      return 1;
    }
    if (numericValue === 2) {
      return 2;
    }
    if (numericValue === 1) {
      return 3;
    }
    return 99;
  }

  return numericValue;
}

function renderLearningSummary(filteredProblems) {
  const solvedCount = filteredProblems.filter((problem) => isProblemSolved(problem.id)).length;
  const reviewCount = filteredProblems.filter((problem) => getUnderstanding(problem.id) === "1").length;

  document.getElementById("summary-solved-count").textContent = `${solvedCount} / ${filteredProblems.length}`;
  document.getElementById("summary-review-count").textContent = String(reviewCount);
}

function renderActiveFilters(filters) {
  const container = document.getElementById("active-filter-list");
  container.innerHTML = "";
  const pills = [];

  if (filters.lectureMin !== "") {
    pills.push({ text: formatUiText("lectureMinActiveFilter", { value: filters.lectureMin }) });
  }
  if (filters.lectureMax !== "") {
    pills.push({ text: formatUiText("lectureMaxActiveFilter", { value: filters.lectureMax }) });
  }
  if (filters.difficulties.length > 0) {
    filters.difficulties.forEach((value) => {
      if (value === "unset") {
        pills.push({ text: uiText("difficultyActiveFilterUnset") });
        return;
      }

      pills.push({
        text: formatUiText("difficultyActiveFilter", {
          value: appConfig.difficultyLabels[Number(value) - 1] ?? value,
        }),
        className: `difficulty-badge difficulty-${value}`,
      });
    });
  }
  if (filters.solved === "solved") {
    pills.push({ text: uiText("solvedOnlyActiveFilter") });
  } else if (filters.solved === "unsolved") {
    pills.push({ text: uiText("unsolvedOnlyActiveFilter") });
  }
  if (filters.understanding !== "all") {
    const understandingLabel = filters.understanding === "unset"
      ? uiText("unsetLabel")
      : appConfig.understandingLabels[Number(filters.understanding) - 1] ?? uiText("unsetLabel");
    pills.push({ text: formatUiText("understandingActiveFilter", { value: understandingLabel }) });
  }

  if (pills.length === 0) {
    pills.push({ text: uiText("noFilters") });
  }

  pills.forEach((pill) => {
    const chip = document.createElement("span");
    chip.className = pill.className ?? "filter-pill";
    chip.textContent = pill.text;
    container.appendChild(chip);
  });
}

function getFilterState() {
  return {
    lectureMin: document.getElementById("lecture-min").value,
    lectureMax: document.getElementById("lecture-max").value,
    solved: document.getElementById("solved-filter").value,
    understanding: document.getElementById("understanding-filter").value,
    sortOrder: document.getElementById("sort-order").value,
    difficulties: Array.from(document.querySelectorAll("#difficulty-options input[type='checkbox']:checked")).map((checkbox) => checkbox.value),
  };
}

function saveFilterState() {
  localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(getFilterState()));
}

function restoreFilterState() {
  const raw = localStorage.getItem(FILTER_STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const filters = JSON.parse(raw);
    document.getElementById("lecture-min").value = filters.lectureMin ?? "";
    document.getElementById("lecture-max").value = filters.lectureMax ?? "";
    document.getElementById("solved-filter").value = filters.solved ?? "all";
    document.getElementById("understanding-filter").value = filters.understanding ?? "all";
    document.getElementById("sort-order").value = normalizeSortOrder(filters.sortOrder ?? "lectureAsc");

    const selectedDifficulties = new Set(filters.difficulties ?? []);
    document.querySelectorAll("#difficulty-options input[type='checkbox']").forEach((checkbox) => {
      checkbox.checked = selectedDifficulties.has(checkbox.value);
    });
  } catch {
    localStorage.removeItem(FILTER_STORAGE_KEY);
  }
}

function saveScrollPosition() {
  sessionStorage.setItem(LIST_SCROLL_KEY, String(window.scrollY));
}

function restoreScrollPosition() {
  const raw = sessionStorage.getItem(LIST_SCROLL_KEY);
  if (!raw) {
    return;
  }
  const value = Number(raw);
  if (!Number.isNaN(value)) {
    window.scrollTo(0, value);
  }
}

function scrollListPanelIntoView() {
  const panel = document.querySelector(".list-panel");
  if (!panel) {
    return;
  }

  const top = Math.max(0, panel.getBoundingClientRect().top + window.scrollY - 12);
  window.scrollTo({
    top,
    behavior: "smooth",
  });
}

function showListMessage(message, kind, hidden = false) {
  const banner = document.getElementById("list-message");
  banner.hidden = hidden || !message;
  banner.textContent = message;
  banner.className = `status-banner ${kind === "error" ? "error-banner" : kind === "warning" ? "warning-banner" : "muted-banner"}`;
}
