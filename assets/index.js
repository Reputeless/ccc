const FILTER_STORAGE_KEY = "ccc:v1:listFilters";
const LIST_SCROLL_KEY = "ccc:v1:listScroll";

const {
  DEFAULT_CONFIG,
  fetchConfig,
  populateLabelSelect,
  getDifficultyLabel,
  formatLectureLabel,
  getUnderstandingMarkerClass,
  isProblemSolved,
  setManualSolved,
  getUnderstanding,
  setUnderstanding,
  escapeHtml,
} = window.CCC;

let appConfig = { ...DEFAULT_CONFIG };
let allProblems = [];
let shouldRestoreInitialScroll = true;
let animatedSolvedProblemId = null;

document.addEventListener("DOMContentLoaded", async () => {
  window.addEventListener("pagehide", saveScrollPosition);
  document.getElementById("reset-filters").addEventListener("click", resetFilters);

  try {
    appConfig = await fetchConfig();
  } catch {
    showListMessage("設定の読み込みに失敗しました。既定値で表示します。", "warning");
  }

  document.getElementById("app-name").textContent = appConfig.appName;
  setupStaticControls();
  await loadProblems();
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
  renderProblemList();
}

function setupStaticControls() {
  populateUnderstandingFilter();
  populateDifficultyOptions();
  restoreFilterState();

  [
    document.getElementById("lecture-min"),
    document.getElementById("lecture-max"),
    document.getElementById("solved-filter"),
    document.getElementById("understanding-filter"),
    document.getElementById("sort-order"),
  ].forEach((element) => element.addEventListener("input", onFilterChanged));

  document.getElementById("difficulty-options").addEventListener("change", onFilterChanged);
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

  if (filtered.length === 0) {
    list.innerHTML = '<div class="status-banner muted-banner">条件に合う問題がありません。</div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  filtered.forEach((problem) => fragment.appendChild(renderProblemCard(problem)));
  list.appendChild(fragment);

  if (shouldRestoreInitialScroll) {
    shouldRestoreInitialScroll = false;
    requestAnimationFrame(restoreScrollPosition);
  }
}

function renderProblemCard(problem) {
  const article = document.createElement("article");
  article.className = "problem-card";

  const understandingValue = getUnderstanding(problem.id);
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
        <span class="understanding-select-wrap">
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
  return `<span class="lecture-badge">${escapeHtml(formatLectureLabel(lecture))}</span>`;
}

function renderDifficultyBadge(difficulty) {
  if (difficulty == null) {
    return "";
  }
  const difficultyKey = String(difficulty);
  const difficultyLabel = getDifficultyLabel(appConfig, difficulty);
  return `<span class="difficulty-badge difficulty-${escapeHtml(difficultyKey)}">${escapeHtml(difficultyLabel)}</span>`;
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
  populateLabelSelect(select, appConfig.understandingLabels, { emptyLabel: "" });
  select.value = understandingValue;
  select.addEventListener("change", () => {
    marker.className = `understanding-marker ${getUnderstandingMarkerClass(select.value)}`;
    setUnderstanding(problem.id, select.value);
    renderProblemList();
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

function normalizeSortOrder(sortOrder) {
  if (sortOrder === "asc") {
    return "lectureAsc";
  }
  if (sortOrder === "desc") {
    return "lectureDesc";
  }
  return sortOrder;
}

function renderActiveFilters(filters) {
  const container = document.getElementById("active-filter-list");
  container.innerHTML = "";
  const labels = [];

  if (filters.lectureMin !== "") {
    labels.push(`${filters.lectureMin} <= 講義回`);
  }
  if (filters.lectureMax !== "") {
    labels.push(`講義回 <= ${filters.lectureMax}`);
  }
  if (filters.difficulties.length > 0) {
    const text = filters.difficulties.map((value) => {
      if (value === "unset") {
        return "未設定";
      }
      return appConfig.difficultyLabels[Number(value) - 1] ?? value;
    }).join(" / ");
    labels.push(`難易度: ${text}`);
  }
  if (filters.solved === "solved") {
    labels.push("解いた問題だけ");
  } else if (filters.solved === "unsolved") {
    labels.push("解いていない問題だけ");
  }
  if (filters.understanding !== "all") {
    const understandingLabel = filters.understanding === "unset"
      ? "未設定"
      : appConfig.understandingLabels[Number(filters.understanding) - 1] ?? "未設定";
    labels.push(`理解度: ${understandingLabel}`);
  }

  if (labels.length === 0) {
    labels.push("フィルタなし");
  }

  labels.forEach((label) => {
    const chip = document.createElement("span");
    chip.className = "filter-pill";
    chip.textContent = label;
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
