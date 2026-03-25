const LIST_SCROLL_KEY = "ccc:v1:listScroll";
const SIDEBAR_STICKY_BREAKPOINT = 1080;
const SIDEBAR_STICKY_TOP = 18;

const {
  DEFAULT_CONFIG,
  FILTER_STORAGE_KEY,
  fetchConfig,
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
  getUnderstandingMarkerClass,
  isProblemSolved,
  setManualSolved,
  getUnderstanding,
  setUnderstanding,
  clearStoredCode,
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

document.addEventListener("DOMContentLoaded", async () => {
  window.addEventListener("pagehide", saveScrollPosition);
  window.addEventListener("resize", scheduleSidebarStickyUpdate);
  document.getElementById("reset-filters").addEventListener("click", resetFilters);
  applyThemePreference();
  bindThemePreferenceListener();

  try {
    appConfig = await fetchConfig();
  } catch {
    showListMessage("設定の読み込みに失敗しました。既定値で表示します。", "warning");
  }

  document.getElementById("app-name").textContent = appConfig.appName;
  document.getElementById("app-subtitle").textContent = appConfig.appSubtitle;
  renderGlobalFooter(appConfig);
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
    showListMessage("問題一覧の読み込みに失敗しました。時間を置いて再読み込みしてください。", "error");
    return;
  }

  const payload = await response.json();
  allProblems = Array.isArray(payload.items) ? payload.items : [];
  renderRecordPanel();
  renderProblemList();
}

function setupStaticControls() {
  populateUnderstandingFilter();
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

function populateUnderstandingFilter() {
  populateLabelSelect(document.getElementById("understanding-filter"), appConfig.understandingLabels, {
    emptyLabel: "未設定",
    emptyValue: "unset",
  });
  document.getElementById("understanding-filter").insertAdjacentHTML("afterbegin", '<option value="all">すべて</option>');
}

function populateDifficultyOptions() {
  const container = document.getElementById("difficulty-options");
  container.innerHTML = "";

  [...appConfig.difficultyLabels, "未設定"].forEach((label, index) => {
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

function renderProblemList() {
  const list = document.getElementById("problem-list");
  list.innerHTML = "";
  showListMessage("", "muted", true);

  const filterState = getFilterState();
  const filtered = allProblems
    .filter((problem) => matchesFilters(problem, filterState))
    .sort((left, right) => compareProblems(left, right, filterState.sortOrder));

  document.getElementById("problem-count").textContent = `${filtered.length} 問表示 / 全 ${allProblems.length} 問`;
  renderActiveFilters(filterState);
  renderLearningSummary(filtered);

  if (filtered.length === 0) {
    list.innerHTML = '<div class="status-banner muted-banner">条件に合う問題がありません。</div>';
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
      <span class="meta-slot meta-slot-lecture">${renderLectureBadge(problem.lecture)}</span>
      <span class="meta-slot meta-slot-difficulty">${renderDifficultyBadge(problem.difficulty)}</span>
      ${renderSolvedToggle(problem)}
      <label class="field select-inline compact-select">
        <span class="sr-only">理解度</span>
        <span class="understanding-select-wrap${understandingAnimationClass}">
          <span class="understanding-marker ${getUnderstandingMarkerClass(understandingValue)}" aria-hidden="true"></span>
          <select class="understanding-select" aria-label="理解度"></select>
        </span>
      </label>
    </div>
  `;

  bindProblemCardInteractions(article, problem, understandingValue);
  return article;
}

function renderLectureBadge(lecture) {
  if (lecture == null) {
    return "";
  }
  return `<button type="button" class="lecture-badge meta-filter-trigger" data-filter-type="lecture" data-filter-value="${escapeHtml(String(lecture))}" title="この講義回で絞り込む">${escapeHtml(formatLectureLabel(lecture))}</button>`;
}

function renderRecordPanel() {
  const container = document.getElementById("last-opened-problem");
  if (!container) {
    return;
  }

  const lastOpenedId = getLastOpenedProblemId();
  const problem = allProblems.find((item) => item.id === lastOpenedId);

  if (!problem) {
    container.innerHTML = '<p class="record-transfer-text record-transfer-text-compact">まだ記録がありません。</p>';
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
    app: appConfig.appName,
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

  showRecordTransferStatus("学習記録を書き出しました。");
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
        `このファイルは別の講義用に書き出された可能性があります。\n現在: ${appConfig.courseLabel}\nファイル: ${payload.courseLabel ?? payload.courseId}\n\n読み込みを続けますか？`
      );
      if (!confirmed) {
        showRecordTransferStatus("インポートをキャンセルしました。");
        return;
      }
    }

    const importedCount = applyLearningRecordImport(payload.records);
    renderRecordPanel();
    renderProblemList();
    showRecordTransferStatus(`学習記録を読み込みました。${importedCount} 件を反映しました。`);
  } catch {
    showRecordTransferStatus("学習記録ファイルの読み込みに失敗しました。JSON 形式を確認してください。", true);
  } finally {
    input.value = "";
  }
}

function validateLearningRecordImport(payload) {
  if (!payload || typeof payload !== "object") {
    return "学習記録ファイルの形式が正しくありません。";
  }
  if (payload.kind !== "learning-record" || payload.version !== 1) {
    return "学習記録ファイルの形式が正しくありません。";
  }
  if (!payload.records || typeof payload.records !== "object" || Array.isArray(payload.records)) {
    return "学習記録ファイルの records が正しくありません。";
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
    "このブラウザに保存されたコード入力内容を消去します。\n解いた記録と理解度は残ります。\n\nよろしいですか？"
  );

  if (!confirmed) {
    showRecordTransferStatus("消去をキャンセルしました。");
    return;
  }

  clearStoredCode(allProblems.map((problem) => problem.id));
  renderProblemList();
  showRecordTransferStatus("コード入力内容を消去しました。");
}

function clearLearningProgressWithConfirmation() {
  const confirmed = window.confirm(
    "このブラウザに保存された解いた記録と理解度を消去します。\nコード入力内容と最後に開いた問題の記録は残ります。\n\nよろしいですか？"
  );

  if (!confirmed) {
    showRecordTransferStatus("消去をキャンセルしました。");
    return;
  }

  clearLearningProgress(allProblems.map((problem) => problem.id));
  renderRecordPanel();
  renderProblemList();
  showRecordTransferStatus("解いた記録と理解度を消去しました。");
}

function renderDifficultyBadge(difficulty) {
  if (difficulty == null) {
    return "";
  }
  const difficultyKey = String(difficulty);
  const difficultyLabel = getDifficultyLabel(appConfig, difficulty);
  return `<button type="button" class="difficulty-badge difficulty-${escapeHtml(difficultyKey)} meta-filter-trigger" data-filter-type="difficulty" data-filter-value="${escapeHtml(difficultyKey)}" title="この難易度で絞り込む">${escapeHtml(difficultyLabel)}</button>`;
}

function renderSolvedToggle(problem) {
  const solvedAnimationClass = animatedSolvedProblemId === problem.id ? " solved-toggle-animate" : "";
  return `
    <label class="solved-toggle solved-toggle-small${solvedAnimationClass}" title="解いた">
      <input class="solved-checkbox solved-toggle-input sr-only" type="checkbox" aria-label="解いた" ${isProblemSolved(problem.id) ? "checked" : ""}>
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
    pills.push({ text: `${filters.lectureMin} <= 講義回` });
  }
  if (filters.lectureMax !== "") {
    pills.push({ text: `講義回 <= ${filters.lectureMax}` });
  }
  if (filters.difficulties.length > 0) {
    filters.difficulties.forEach((value) => {
      if (value === "unset") {
        pills.push({ text: "難易度: 未設定" });
        return;
      }

      pills.push({
        text: `難易度: ${appConfig.difficultyLabels[Number(value) - 1] ?? value}`,
        className: `difficulty-badge difficulty-${value}`,
      });
    });
  }
  if (filters.solved === "solved") {
    pills.push({ text: "解いた問題だけ" });
  } else if (filters.solved === "unsolved") {
    pills.push({ text: "解いていない問題だけ" });
  }
  if (filters.understanding !== "all") {
    const understandingLabel = filters.understanding === "unset"
      ? "未設定"
      : appConfig.understandingLabels[Number(filters.understanding) - 1] ?? "未設定";
    pills.push({ text: `理解度: ${understandingLabel}` });
  }

  if (pills.length === 0) {
    pills.push({ text: "フィルタなし" });
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

function showListMessage(message, kind, hidden = false) {
  const banner = document.getElementById("list-message");
  banner.hidden = hidden || !message;
  banner.textContent = message;
  banner.className = `status-banner ${kind === "error" ? "error-banner" : kind === "warning" ? "warning-banner" : "muted-banner"}`;
}
