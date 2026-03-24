const DEFAULT_CONFIG = {
  appName: "CCC",
  difficultyLabels: ["基礎", "中級", "発展"],
  understandingLabels: ["要復習", "ふつう", "自信あり"],
  tabWidth: 4,
  editorRows: 20,
  longExampleLineThreshold: 30,
  resultPreviewMaxLines: 120,
  resultPreviewMaxChars: 6000,
  maxCodeBytes: 65536,
};

const ERROR_MESSAGES = {
  loadProblem: "問題の読み込みに失敗しました。",
  judgeUnavailable: "判定に失敗しました。時間帯を変えて再試行するか、ローカルの VSCode などで確認してください。",
  invalidRequest: "送信内容に問題があります。入力内容を確認してください。",
  problemUnavailable: "問題が見つからないか、まだ公開されていません。",
};

let appConfig = { ...DEFAULT_CONFIG };
let currentProblem = null;

document.addEventListener("DOMContentLoaded", async () => {
  const problemId = new URLSearchParams(window.location.search).get("id");
  if (!problemId) {
    showProblemError(ERROR_MESSAGES.problemUnavailable);
    return;
  }

  try {
    appConfig = await fetchConfig();
  } catch {
    appConfig = { ...DEFAULT_CONFIG };
  }

  try {
    currentProblem = await fetchProblem(problemId);
  } catch (error) {
    const message = error.status === 404 ? ERROR_MESSAGES.problemUnavailable : ERROR_MESSAGES.loadProblem;
    showProblemError(message);
    return;
  }

  renderProblem();
  setupEditor();
  setupMetaControls();
  setupJudgeButton();
});

async function fetchConfig() {
  const response = await fetch("api/config.php", { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error("config fetch failed");
  }
  return { ...DEFAULT_CONFIG, ...(await response.json()) };
}

async function fetchProblem(problemId) {
  const response = await fetch(`api/problem.php?id=${encodeURIComponent(problemId)}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const error = new Error("problem fetch failed");
    error.status = response.status;
    throw error;
  }

  return response.json();
}

function renderProblem() {
  document.title = `${currentProblem.title} | ${appConfig.appName}`;
  document.getElementById("problem-view").hidden = false;
  document.getElementById("problem-title").textContent = currentProblem.title;
  renderProblemMeta(currentProblem);
  document.getElementById("problem-body").innerHTML = currentProblem.bodyHtml;
  renderExamples();
}

function renderExamples() {
  const list = document.getElementById("examples-list");
  list.innerHTML = "";

  currentProblem.examples.forEach((example, index) => {
    const card = document.createElement("article");
    card.className = "example-card";

    const inputBlock = renderExampleBlock("入力", example.stdin);
    const outputBlock = renderExampleBlock("出力", example.stdout);
    const longExample = Math.max(lineCount(example.stdin), lineCount(example.stdout)) >= appConfig.longExampleLineThreshold;

    if (longExample) {
      card.innerHTML = `<details class="long-example" ${index === 0 ? "open" : ""}><summary>例 ${escapeHtml(example.name)}</summary></details>`;
      const details = card.querySelector("details");
      const wrapper = document.createElement("div");
      wrapper.className = "example-grid";
      wrapper.append(inputBlock, outputBlock);
      details.appendChild(wrapper);
    } else {
      card.innerHTML = `<h3 class="example-header">例 ${escapeHtml(example.name)}</h3>`;
      const wrapper = document.createElement("div");
      wrapper.className = "example-grid";
      wrapper.append(inputBlock, outputBlock);
      card.appendChild(wrapper);
    }

    list.appendChild(card);
  });
}

function renderExampleBlock(title, content) {
  const block = document.createElement("section");
  block.className = "example-block";
  const safeContent = content === "" ? "(空)" : content;
  block.innerHTML = `
    <h4>${escapeHtml(title)}</h4>
    <pre><code>${escapeHtml(safeContent)}</code></pre>
  `;
  return block;
}

function setupEditor() {
  const editor = document.getElementById("code-editor");
  editor.rows = appConfig.editorRows;
  editor.style.tabSize = String(appConfig.tabWidth);
  editor.value = localStorage.getItem(`ccc:v1:code:${currentProblem.id}`) ?? "";

  editor.addEventListener("input", () => {
    localStorage.setItem(`ccc:v1:code:${currentProblem.id}`, editor.value);
  });

  editor.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") {
      return;
    }

    event.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const nextValue = `${editor.value.slice(0, start)}\t${editor.value.slice(end)}`;
    editor.value = nextValue;
    editor.selectionStart = start + 1;
    editor.selectionEnd = start + 1;
    localStorage.setItem(`ccc:v1:code:${currentProblem.id}`, editor.value);
  });
}

function setupMetaControls() {
  const solvedToggle = document.getElementById("solved-toggle");
  solvedToggle.checked = isProblemSolved(currentProblem.id);
  solvedToggle.addEventListener("change", () => {
    setManualSolved(currentProblem.id, solvedToggle.checked);
  });

  const understandingSelect = document.getElementById("understanding-select");
  understandingSelect.innerHTML = "";
  understandingSelect.appendChild(new Option("未設定", ""));
  appConfig.understandingLabels.forEach((label, index) => {
    understandingSelect.appendChild(new Option(label, String(index + 1)));
  });
  understandingSelect.value = getUnderstanding(currentProblem.id);
  understandingSelect.addEventListener("change", () => {
    setUnderstanding(currentProblem.id, understandingSelect.value);
  });
}

function setupJudgeButton() {
  document.getElementById("judge-button").addEventListener("click", judgeCurrentCode);
}

async function judgeCurrentCode() {
  const editor = document.getElementById("code-editor");
  const code = editor.value;

  if (new TextEncoder().encode(code).length > appConfig.maxCodeBytes) {
    renderResultBanner(`コードが長すぎます。${appConfig.maxCodeBytes} バイト以内にしてください。`, "error");
    renderResultDetails([]);
    return;
  }

  renderResultBanner("判定中...", "muted");
  renderResultDetails([]);
  setJudgeLoading(true);

  try {
    const response = await fetch("api/judge.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        problemId: currentProblem.id,
        code,
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (response.status === 400) {
      renderResultBanner(payload.message ?? ERROR_MESSAGES.invalidRequest, "error");
      renderResultDetails([]);
      return;
    }

    if (response.status === 404) {
      showProblemError(ERROR_MESSAGES.problemUnavailable);
      return;
    }

    if (!response.ok) {
      renderResultBanner(payload.message ?? ERROR_MESSAGES.judgeUnavailable, "error");
      renderResultDetails([]);
      return;
    }

    renderJudgePayload(payload);
  } catch {
    renderResultBanner(ERROR_MESSAGES.judgeUnavailable, "error");
    renderResultDetails([]);
  } finally {
    setJudgeLoading(false);
  }
}

function renderJudgePayload(payload) {
  const details = [];

  switch (payload.status) {
    case "accepted":
      renderResultBanner(`Accepted (${payload.passedExamples} ケースすべて通過)`, "success");
      if (payload.warning) {
        details.push(renderPreCard("警告", payload.warning));
      }
      localStorage.setItem(`ccc:v1:accepted:${currentProblem.id}`, "true");
      localStorage.removeItem(`ccc:v1:manualSolved:${currentProblem.id}`);
      document.getElementById("solved-toggle").checked = true;
      break;
    case "wrong_answer":
      renderResultBanner("Wrong Answer", "error");
      if (payload.failedExample) {
        details.push(renderPreCard("入力", payload.failedExample.stdin ?? ""));
        details.push(renderPreCard("期待出力", payload.failedExample.expectedStdout ?? ""));
        details.push(renderPreCard("実際の出力", payload.failedExample.actualStdout ?? ""));
      }
      if (payload.warning) {
        details.push(renderPreCard("警告", payload.warning));
      }
      break;
    case "compile_error":
      renderResultBanner("Compile Error", "error");
      details.push(renderPreCard("コンパイルメッセージ", payload.compilerMessage ?? ""));
      break;
    case "runtime_error":
      renderResultBanner("Runtime Error", "error");
      details.push(renderPreCard("メッセージ", payload.message ?? ""));
      break;
    case "timeout":
      renderResultBanner("Timeout", "error");
      details.push(renderPreCard("メッセージ", payload.message ?? ""));
      break;
    default:
      renderResultBanner(payload.message ?? ERROR_MESSAGES.judgeUnavailable, "error");
      break;
  }

  renderResultDetails(details);
}

function renderPreCard(title, content) {
  const section = document.createElement("section");
  section.className = "result-card";
  const display = buildResultDisplayContent(content);
  const noteHtml = display.truncated
    ? `<p class="result-note">表示が長いため、先頭 ${appConfig.resultPreviewMaxLines} 行・${appConfig.resultPreviewMaxChars} 文字までを表示しています。</p>`
    : "";
  section.innerHTML = `
    <h3>${escapeHtml(title)}</h3>
    ${noteHtml}
    <pre><code>${escapeHtml(display.text)}</code></pre>
  `;
  return section;
}

function renderResultBanner(message, kind) {
  const banner = document.getElementById("result-message");
  banner.textContent = message;
  banner.className = `status-banner ${kind === "error" ? "error-banner" : kind === "warning" ? "warning-banner" : kind === "muted" ? "muted-banner" : ""}`.trim();
}

function renderResultDetails(items) {
  const container = document.getElementById("result-details");
  container.innerHTML = "";
  items.forEach((item) => container.appendChild(item));
}

function setJudgeLoading(isLoading) {
  document.getElementById("judge-loading").hidden = !isLoading;
  document.getElementById("judge-button").disabled = isLoading;
}

function showProblemError(message) {
  document.title = `Problem Not Available | ${appConfig.appName}`;
  document.getElementById("problem-view").hidden = true;
  document.getElementById("problem-error").hidden = false;
  document.getElementById("problem-error-message").textContent = message;
}

function renderProblemMeta(problem) {
  const container = document.getElementById("problem-meta");
  container.innerHTML = "";

  if (problem.lecture != null) {
    container.appendChild(createMetaBadge("lecture-badge", `第 ${problem.lecture} 回講義`));
  }

  if (problem.difficulty != null) {
    const difficultyKey = String(problem.difficulty);
    const difficultyLabel = appConfig.difficultyLabels[problem.difficulty - 1] ?? `難易度 ${problem.difficulty}`;
    container.appendChild(createMetaBadge(`difficulty-badge difficulty-${difficultyKey}`, difficultyLabel));
  }
}

function createMetaBadge(className, text) {
  const badge = document.createElement("span");
  badge.className = className;
  badge.textContent = text;
  return badge;
}

function lineCount(value) {
  if (value === "") {
    return 1;
  }
  return value.replaceAll("\r\n", "\n").split("\n").length;
}

function buildResultDisplayContent(content) {
  if (content === "") {
    return { text: "(空)", truncated: false };
  }

  const normalized = content.replaceAll("\r\n", "\n");
  const lines = normalized.split("\n");
  const maxLines = Number(appConfig.resultPreviewMaxLines) || DEFAULT_CONFIG.resultPreviewMaxLines;
  const maxChars = Number(appConfig.resultPreviewMaxChars) || DEFAULT_CONFIG.resultPreviewMaxChars;
  let truncated = false;
  let limited = normalized;

  if (lines.length > maxLines) {
    limited = lines.slice(0, maxLines).join("\n");
    truncated = true;
  }

  if (limited.length > maxChars) {
    limited = limited.slice(0, maxChars);
    truncated = true;
  }

  if (truncated) {
    limited = `${limited}\n...`;
  }

  return { text: limited, truncated };
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
