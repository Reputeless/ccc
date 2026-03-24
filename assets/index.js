const FILTER_STORAGE_KEY = "ccc:v1:listFilters";
const LIST_SCROLL_KEY = "ccc:v1:listScroll";
const DEFAULT_CONFIG = {
  appName: "CCC",
  difficultyLabels: ["基礎", "中級", "発展"],
  understandingLabels: ["要復習", "ふつう", "自信あり"],
};

let appConfig = { ...DEFAULT_CONFIG };
let allProblems = [];
let shouldRestoreInitialScroll = true;

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

async function fetchConfig() {
  const response = await fetch("api/config.php", { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error("config fetch failed");
  }
  return { ...DEFAULT_CONFIG, ...(await response.json()) };
}

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

  const inputs = [
    document.getElementById("lecture-min"),
    document.getElementById("lecture-max"),
    document.getElementById("solved-filter"),
    document.getElementById("understanding-filter"),
    document.getElementById("sort-order"),
  ];

  inputs.forEach((element) => element.addEventListener("input", onFilterChanged));
  document.getElementById("difficulty-options").addEventListener("change", onFilterChanged);
}

function populateUnderstandingFilter() {
  const select = document.getElementById("understanding-filter");
  select.appendChild(new Option("未設定", "unset"));
  appConfig.understandingLabels.forEach((label, index) => {
    select.appendChild(new Option(label, String(index + 1)));
  });
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
  document.getElementById("sort-order").value = "asc";
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

  document.getElementById("problem-count").textContent = `${filtered.length} 件表示 / 全 ${allProblems.length} 件`;
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

  const lectureLabel = problem.lecture == null ? "講義回 未設定" : `第 ${problem.lecture} 回`;
  const difficultyKey = problem.difficulty == null ? "unset" : String(problem.difficulty);
  const difficultyLabel = problem.difficulty == null
    ? "未設定"
    : appConfig.difficultyLabels[problem.difficulty - 1] ?? `難易度 ${problem.difficulty}`;
  const understandingValue = getUnderstanding(problem.id);

  article.innerHTML = `
    <div class="problem-main">
      <h3 class="problem-card-title">
        <a href="problem.html?id=${encodeURIComponent(problem.id)}">${escapeHtml(problem.title)}</a>
      </h3>
    </div>
    <div class="problem-card-actions">
      <span class="lecture-badge ${problem.lecture == null ? "lecture-unset" : ""}">${escapeHtml(String(lectureLabel))}</span>
      <span class="difficulty-badge difficulty-${escapeHtml(difficultyKey)}">${escapeHtml(difficultyLabel)}</span>
      <label class="checkbox-field compact-checkbox">
        <input class="solved-checkbox" type="checkbox" ${isProblemSolved(problem.id) ? "checked" : ""}>
        <span>解いた</span>
      </label>
      <label class="field select-inline compact-select">
        <span class="sr-only">理解度</span>
        <select class="understanding-select" aria-label="理解度"></select>
      </label>
    </div>
  `;

  const solvedCheckbox = article.querySelector(".solved-checkbox");
  solvedCheckbox.addEventListener("change", () => {
    setManualSolved(problem.id, solvedCheckbox.checked);
    renderProblemList();
  });

  const select = article.querySelector(".understanding-select");
  populateUnderstandingSelect(select, understandingValue);
  select.addEventListener("change", () => {
    setUnderstanding(problem.id, select.value);
    renderProblemList();
  });

  return article;
}

function populateUnderstandingSelect(select, value) {
  select.innerHTML = "";
  select.appendChild(new Option("未設定", ""));
  appConfig.understandingLabels.forEach((label, index) => {
    select.appendChild(new Option(label, String(index + 1)));
  });
  select.value = value;
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
  const leftLecture = left.lecture == null ? Number.POSITIVE_INFINITY : left.lecture;
  const rightLecture = right.lecture == null ? Number.POSITIVE_INFINITY : right.lecture;
  const lectureDiff = leftLecture - rightLecture;
  if (lectureDiff !== 0) {
    return sortOrder === "desc" ? -lectureDiff : lectureDiff;
  }
  return left.id.localeCompare(right.id, "ja");
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
    document.getElementById("sort-order").value = filters.sortOrder ?? "asc";

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

function getAcceptedOnce(problemId) {
  return localStorage.getItem(`ccc:v1:accepted:${problemId}`) === "true";
}

function getManualSolved(problemId) {
  return localStorage.getItem(`ccc:v1:manualSolved:${problemId}`) ?? "";
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
  localStorage.setItem(`ccc:v1:manualSolved:${problemId}`, solved ? "solved" : "unsolved");
}

function getUnderstanding(problemId) {
  return localStorage.getItem(`ccc:v1:understanding:${problemId}`) ?? "";
}

function setUnderstanding(problemId, value) {
  if (value === "") {
    localStorage.removeItem(`ccc:v1:understanding:${problemId}`);
    return;
  }
  localStorage.setItem(`ccc:v1:understanding:${problemId}`, value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
