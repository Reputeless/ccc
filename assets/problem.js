const {
  DEFAULT_CONFIG,
  fetchConfig,
  populateLabelSelect,
  getDifficultyLabel,
  formatLectureLabel,
  isProblemSolved,
  setManualSolved,
  markAccepted,
  getUnderstanding,
  setUnderstanding,
  getStoredCode,
  setStoredCode,
  escapeHtml,
} = window.CCC;

const ERROR_MESSAGES = {
  loadProblem: "問題の読み込みに失敗しました。",
  judgeUnavailable: "判定サーバーとの通信に失敗しました。時間帯を変えて再試行するか、ローカルの VSCode などで確認してください。",
  invalidRequest: "送信内容に問題があります。入力内容を確認してください。",
  problemUnavailable: "問題が見つからないか、まだ公開されていません。",
};

const RESULT_STATE_PRESETS = {
  idle: { kind: "muted", icon: "", text: "まだ判定していません" },
  pending: { kind: "muted", icon: "", text: "判定中..." },
  accepted: { kind: "success", icon: "✔" },
  wrongAnswer: { kind: "warning", icon: "!" , text: "失敗ケースあり" },
  compileError: { kind: "error", icon: "!" , text: "コンパイルエラー" },
  runtimeError: { kind: "error", icon: "!" , text: "実行時エラー" },
  timeout: { kind: "error", icon: "!" , text: "時間切れ" },
  requestError: { kind: "error", icon: "!" },
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
  enhanceCopyableCodeBlocks();
}

function renderProblemMeta(problem) {
  const container = document.getElementById("problem-meta");
  container.innerHTML = "";

  if (problem.number) {
    container.appendChild(createMetaBadge("lecture-badge", problem.number));
  }

  if (problem.lecture != null) {
    container.appendChild(createMetaBadge("lecture-badge", formatLectureLabel(problem.lecture, "回講義")));
  }

  if (problem.difficulty != null) {
    container.appendChild(createMetaBadge(`difficulty-badge difficulty-${problem.difficulty}`, getDifficultyLabel(appConfig, problem.difficulty)));
  }
}

function createMetaBadge(className, text) {
  const badge = document.createElement("span");
  badge.className = className;
  badge.textContent = text;
  return badge;
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

function enhanceCopyableCodeBlocks() {
  document.querySelectorAll("#problem-body pre, #examples-list pre").forEach((pre) => {
    if (pre.querySelector(".copy-code-button")) {
      return;
    }

    const code = pre.querySelector("code");
    if (!code) {
      return;
    }

    pre.classList.add("copyable-code-block");
    pre.appendChild(createCopyButton(code));
  });
}

function createCopyButton(codeElement) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "copy-code-button";
  button.setAttribute("aria-label", "コードをコピー");
  button.title = "コードをコピー";

  button.addEventListener("click", async () => {
    const copied = await copyText(codeElement.textContent ?? "");
    if (!copied) {
      return;
    }

    button.classList.add("is-copied");
    button.setAttribute("aria-label", "コピーしました");
    button.title = "コピーしました";

    window.setTimeout(() => {
      button.classList.remove("is-copied");
      button.setAttribute("aria-label", "コードをコピー");
      button.title = "コードをコピー";
    }, 1200);
  });

  return button;
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy path.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    textarea.remove();
  }

  return copied;
}

function setupEditor() {
  const editor = document.getElementById("code-editor");
  editor.rows = appConfig.editorRows;
  editor.style.tabSize = String(appConfig.tabWidth);
  editor.value = getStoredCode(currentProblem.id);

  editor.addEventListener("input", () => {
    setStoredCode(currentProblem.id, editor.value);
  });

  editor.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") {
      return;
    }

    event.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = `${editor.value.slice(0, start)}\t${editor.value.slice(end)}`;
    editor.selectionStart = start + 1;
    editor.selectionEnd = start + 1;
    setStoredCode(currentProblem.id, editor.value);
  });
}

function setupMetaControls() {
  const solvedToggle = document.getElementById("solved-toggle");
  solvedToggle.checked = isProblemSolved(currentProblem.id);
  solvedToggle.addEventListener("change", () => {
    setManualSolved(currentProblem.id, solvedToggle.checked);
  });

  const understandingSelect = document.getElementById("understanding-select");
  populateLabelSelect(understandingSelect, appConfig.understandingLabels, { emptyLabel: "" });
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
    renderResultState("requestError", `コードが長すぎます。${appConfig.maxCodeBytes} バイト以内にしてください。`);
    renderResultDetails([]);
    return;
  }

  renderResultState("pending");
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
      renderResultState("requestError", payload.message ?? ERROR_MESSAGES.invalidRequest);
      renderResultDetails([]);
      return;
    }

    if (response.status === 404) {
      showProblemError(ERROR_MESSAGES.problemUnavailable);
      return;
    }

    if (!response.ok) {
      renderResultState("requestError", payload.message ?? ERROR_MESSAGES.judgeUnavailable);
      renderResultDetails([]);
      return;
    }

    renderJudgePayload(payload);
  } catch {
    renderResultState("requestError", ERROR_MESSAGES.judgeUnavailable);
    renderResultDetails([]);
  } finally {
    setJudgeLoading(false);
  }
}

function renderJudgePayload(payload) {
  const details = [];

  switch (payload.status) {
    case "accepted":
      renderResultState("accepted", `合格！（${payload.passedExamples} ケース通過）`);
      if (payload.warning) {
        details.push(renderPreCard("警告", payload.warning));
      }
      markAccepted(currentProblem.id);
      document.getElementById("solved-toggle").checked = true;
      break;
    case "wrong_answer":
      renderResultState("wrongAnswer");
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
      renderResultState("compileError");
      details.push(renderPreCard("コンパイルメッセージ", payload.compilerMessage ?? ""));
      break;
    case "runtime_error":
      renderResultState("runtimeError");
      details.push(renderPreCard("メッセージ", payload.message ?? ""));
      break;
    case "timeout":
      renderResultState("timeout");
      details.push(renderPreCard("メッセージ", payload.message ?? ""));
      break;
    default:
      renderResultState("requestError", payload.message ?? ERROR_MESSAGES.judgeUnavailable);
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

function renderResultState(state, message = null) {
  const preset = RESULT_STATE_PRESETS[state] ?? RESULT_STATE_PRESETS.requestError;
  renderResultBanner(message ?? preset.text ?? "", preset.kind, preset.icon);
}

function renderResultBanner(message, kind, icon) {
  const banner = document.getElementById("result-message");
  const iconHtml = icon ? `<span class="result-status-icon" aria-hidden="true">${escapeHtml(icon)}</span>` : "";
  banner.innerHTML = `
    ${iconHtml}
    <span class="result-status-text">${escapeHtml(message)}</span>
  `;
  banner.className = `status-banner result-status-banner ${icon ? "has-icon" : "no-icon"} ${kind === "error" ? "error-banner" : kind === "warning" ? "warning-banner" : kind === "muted" ? "muted-banner" : kind === "success" ? "success-banner" : ""}`.trim();
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
