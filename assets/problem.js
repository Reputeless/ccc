const {
  DEFAULT_CONFIG,
  fetchConfig,
  populateLabelSelect,
  populateOrderedLabelSelect,
  applyListQuickFilter,
  applyThemePreference,
  bindThemePreferenceListener,
  getDifficultyLabel,
  formatLectureLabel,
  getUnderstandingMarkerClass,
  isProblemSolved,
  setManualSolved,
  markAccepted,
  getUnderstanding,
  setUnderstanding,
  getStoredCode,
  setStoredCode,
  setLastOpenedProblemId,
  escapeHtml,
  renderGlobalFooter,
} = window.CCC;

let appConfig = { ...DEFAULT_CONFIG };
let currentProblem = null;
let understandingControls = null;
const UNDERSTANDING_SELECT_ORDER = ["3", "2", "1"];

function uiText(key) {
  return appConfig.uiText?.[key] ?? DEFAULT_CONFIG.uiText[key] ?? "";
}

function formatUiText(key, replacements = {}) {
  return Object.entries(replacements).reduce((text, [name, value]) => {
    return text.replaceAll(`{${name}}`, String(value));
  }, uiText(key));
}

function getErrorMessages() {
  return {
    loadProblem: uiText("problemLoadError"),
    judgeUnavailable: uiText("judgeUnavailable"),
    invalidRequest: uiText("invalidRequest"),
    problemUnavailable: uiText("problemUnavailable"),
  };
}

function getResultStatePresets() {
  return {
    idle: { kind: "muted", icon: "", text: uiText("resultIdle") },
    pending: { kind: "muted", icon: "", text: uiText("resultPending") },
    accepted: { kind: "success", icon: "✔" },
    wrongAnswer: { kind: "error", icon: "!", text: uiText("resultWrongAnswer") },
    compileError: { kind: "error", icon: "!", text: uiText("resultCompileError") },
    runtimeError: { kind: "error", icon: "!", text: uiText("resultRuntimeError") },
    timeout: { kind: "error", icon: "!", text: uiText("resultTimeout") },
    requestError: { kind: "error", icon: "!" },
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  applyThemePreference();
  bindThemePreferenceListener();
  const errorMessages = getErrorMessages();

  const problemId = new URLSearchParams(window.location.search).get("id");
  if (!problemId) {
    showProblemError(errorMessages.problemUnavailable);
    return;
  }

  try {
    appConfig = await fetchConfig();
  } catch {
    appConfig = { ...DEFAULT_CONFIG };
  }
  renderGlobalFooter(appConfig);
  renderStaticUiText();

  try {
    currentProblem = await fetchProblem(problemId);
  } catch (error) {
    const message = error.status === 404 ? errorMessages.problemUnavailable : errorMessages.loadProblem;
    showProblemError(message);
    return;
  }

  setLastOpenedProblemId(currentProblem.id);
  renderProblem();
  setupEditor();
  setupMetaControls();
  setupResultUnderstandingPrompt();
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
  renderGuide();
  highlightProblemBodyCode();
  renderExamples();
  enhanceCopyableCodeBlocks();
}

function renderStaticUiText() {
  const uiText = appConfig.uiText ?? DEFAULT_CONFIG.uiText;
  const backText = uiText.backToList ?? DEFAULT_CONFIG.uiText.backToList;
  const guideTitle = uiText.guidePanelTitle ?? DEFAULT_CONFIG.uiText.guidePanelTitle;

  const headerBack = document.getElementById("problem-back-link-text");
  if (headerBack) {
    headerBack.textContent = backText;
  }

  const errorBack = document.getElementById("problem-error-back-link");
  if (errorBack) {
    errorBack.textContent = backText.replace(/^←\s*/, "");
  }

  const resultBack = document.getElementById("problem-result-back-link");
  if (resultBack) {
    resultBack.textContent = backText;
  }

  const guideHeading = document.getElementById("guide-title");
  if (guideHeading) {
    guideHeading.textContent = guideTitle;
  }

  const errorTitle = document.getElementById("problem-error-title");
  if (errorTitle) {
    errorTitle.textContent = uiText.problemErrorTitle ?? DEFAULT_CONFIG.uiText.problemErrorTitle;
  }

  const solvedToggleLabel = document.getElementById("solved-toggle-label");
  if (solvedToggleLabel) {
    const label = uiText.solvedToggleLabel ?? DEFAULT_CONFIG.uiText.solvedToggleLabel;
    solvedToggleLabel.title = label;
  }

  const solvedToggle = document.getElementById("solved-toggle");
  if (solvedToggle) {
    solvedToggle.setAttribute("aria-label", uiText.solvedToggleLabel ?? DEFAULT_CONFIG.uiText.solvedToggleLabel);
  }

  const understandingLabel = uiText.understandingSelectLabel ?? DEFAULT_CONFIG.uiText.understandingSelectLabel;
  const understandingSelectLabel = document.getElementById("understanding-select-label");
  if (understandingSelectLabel) {
    understandingSelectLabel.textContent = understandingLabel;
  }

  const understandingSelect = document.getElementById("understanding-select");
  if (understandingSelect) {
    understandingSelect.setAttribute("aria-label", understandingLabel);
  }

  const examplesTitle = document.getElementById("examples-section-title");
  if (examplesTitle) {
    examplesTitle.textContent = uiText.examplesSectionTitle ?? DEFAULT_CONFIG.uiText.examplesSectionTitle;
  }

  const codeEditorTitle = document.getElementById("code-editor-title");
  if (codeEditorTitle) {
    codeEditorTitle.textContent = uiText.codeEditorTitle ?? DEFAULT_CONFIG.uiText.codeEditorTitle;
  }

  const judgeButton = document.getElementById("judge-button");
  if (judgeButton) {
    judgeButton.textContent = uiText.judgeButtonLabel ?? DEFAULT_CONFIG.uiText.judgeButtonLabel;
  }

  const resultPanelTitle = document.getElementById("result-panel-title");
  if (resultPanelTitle) {
    resultPanelTitle.textContent = uiText.resultPanelTitle ?? DEFAULT_CONFIG.uiText.resultPanelTitle;
  }

  const judgeLoadingLabel = document.getElementById("judge-loading-label");
  if (judgeLoadingLabel) {
    judgeLoadingLabel.textContent = uiText.judgeLoadingLabel ?? DEFAULT_CONFIG.uiText.judgeLoadingLabel;
  }

  const understandingPromptTitle = document.getElementById("understanding-prompt-title");
  if (understandingPromptTitle) {
    understandingPromptTitle.textContent = uiText.understandingPromptTitle ?? DEFAULT_CONFIG.uiText.understandingPromptTitle;
  }

  const understandingPromptLead = document.getElementById("understanding-prompt-lead");
  if (understandingPromptLead) {
    understandingPromptLead.textContent = uiText.understandingPromptLead ?? DEFAULT_CONFIG.uiText.understandingPromptLead;
  }

  const idleMessage = document.querySelector("#result-message .result-status-text");
  if (idleMessage) {
    idleMessage.textContent = uiText.resultIdle ?? DEFAULT_CONFIG.uiText.resultIdle;
  }
}

function highlightProblemBodyCode() {
  if (!window.Prism?.highlightAllUnder) {
    return;
  }

  ["problem-body", "guide-container"].forEach((id) => {
    const container = document.getElementById(id);
    if (!container) {
      return;
    }

    window.Prism.highlightAllUnder(container);
  });
}

function renderGuide() {
  const container = document.getElementById("guide-container");
  const guideHtml = typeof currentProblem.guideHtml === "string" ? currentProblem.guideHtml.trim() : "";

  if (guideHtml === "") {
    container.innerHTML = `<p class="guide-empty-text">${escapeHtml(appConfig.uiText?.guideEmptyMessage ?? DEFAULT_CONFIG.uiText.guideEmptyMessage)}</p>`;
    return;
  }

  container.innerHTML = `
    <details class="guide-accordion">
      <summary class="guide-summary">${escapeHtml(appConfig.uiText?.guideReadLabel ?? DEFAULT_CONFIG.uiText.guideReadLabel)}</summary>
      <div class="guide-content problem-body">
        ${guideHtml}
      </div>
    </details>
  `;
}

function renderProblemMeta(problem) {
  const container = document.getElementById("problem-meta");
  container.innerHTML = "";
  const profileLabel = formatLanguageProfileLabel(problem.languageProfile);

  if (problem.number) {
    container.appendChild(createMetaBadge("problem-number-meta", problem.number));
  }

  if (problem.lecture != null) {
    container.appendChild(createMetaFilterLink(
      "lecture-badge meta-filter-trigger",
      formatLectureLabel(problem.lecture, appConfig.lectureLabelTemplate),
      "lecture",
      String(problem.lecture),
      uiText("lectureBadgeTitle")
    ));
  }

  if (problem.difficulty != null) {
    container.appendChild(createMetaFilterLink(
      `difficulty-badge difficulty-${problem.difficulty} meta-filter-trigger`,
      getDifficultyLabel(appConfig, problem.difficulty),
      "difficulty",
      String(problem.difficulty),
      uiText("difficultyBadgeTitle")
    ));
  }

  if (profileLabel) {
    container.appendChild(createMetaBadge("problem-profile-meta", formatUiText("languageProfileMetaTemplate", { value: profileLabel })));
  }
}

function createMetaBadge(className, text) {
  const badge = document.createElement("span");
  badge.className = className;
  badge.textContent = text;
  return badge;
}

function formatLanguageProfileLabel(profile) {
  if (!profile || typeof profile !== "object") {
    return "";
  }
  return String(profile.label ?? "").trim();
}

function createMetaFilterLink(className, text, filterType, filterValue, title) {
  const link = document.createElement("a");
  link.className = className;
  link.href = "./";
  link.textContent = text;
  link.title = title;
  link.addEventListener("click", () => {
    applyListQuickFilter(filterType, filterValue);
  });
  return link;
}

function renderExamples() {
  const list = document.getElementById("examples-list");
  list.innerHTML = "";

  currentProblem.examples.forEach((example) => {
    const card = document.createElement("details");
    card.className = "example-card example-accordion";
    card.open = true;

    const header = document.createElement("summary");
    header.className = "example-header";
    header.innerHTML = `<span>${escapeHtml(formatUiText("exampleLabelTemplate", { value: example.name }))}</span>`;

    const wrapper = document.createElement("div");
    wrapper.className = "example-content";

    const grid = document.createElement("div");
    grid.className = "example-grid";
    grid.append(
      renderExampleBlock(uiText("inputLabel"), example.stdin),
      renderExampleBlock(uiText("outputLabel"), example.stdout)
    );
    wrapper.appendChild(grid);

    card.append(header, wrapper);
    list.appendChild(card);
  });
}

function renderExampleBlock(title, content) {
  const block = document.createElement("section");
  block.className = "example-block";
  const safeContent = content === "" ? uiText("emptyContentLabel") : content;
  block.innerHTML = `
    <h4>${escapeHtml(title)}</h4>
    <pre><code>${escapeHtml(safeContent)}</code></pre>
  `;
  return block;
}

function enhanceCopyableCodeBlocks() {
  document.querySelectorAll("#problem-body pre, #guide-container pre, #examples-list pre, #result-details pre").forEach((pre) => {
    if (pre.parentElement?.classList.contains("copyable-code-wrapper")) {
      return;
    }

    const code = pre.querySelector("code");
    if (!code) {
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "copyable-code-wrapper";
    pre.classList.add("copyable-code-block");
    pre.parentNode?.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    wrapper.appendChild(createCopyButton(code));
  });
}

function createCopyButton(codeElement) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "copy-code-button";
  button.setAttribute("aria-label", uiText("copyCodeLabel"));
  button.title = uiText("copyCodeLabel");

  button.addEventListener("click", async () => {
    const copied = await copyText(codeElement.textContent ?? "");
    if (!copied) {
      return;
    }

    button.classList.add("is-copied");
    button.setAttribute("aria-label", uiText("copiedCodeLabel"));
    button.title = uiText("copiedCodeLabel");

    window.setTimeout(() => {
      button.classList.remove("is-copied");
      button.setAttribute("aria-label", uiText("copyCodeLabel"));
      button.title = uiText("copyCodeLabel");
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
  const indentSettings = getEditorIndentSettings();
  editor.rows = appConfig.editorRows;
  editor.style.tabSize = String(indentSettings.width);
  editor.value = getStoredCode(currentProblem.id);
  window.CCCCodeEditor.attachCodeEditor(editor, {
    getIndentSettings: () => getEditorIndentSettings(),
    onValueChange: (value) => {
      setStoredCode(currentProblem.id, value);
    },
  });
}

function getEditorIndentSettings() {
  const profile = currentProblem?.languageProfile ?? {};
  const width = Number(profile.editorIndentWidth) > 0
    ? Number(profile.editorIndentWidth)
    : (Number(appConfig.tabWidth) || DEFAULT_CONFIG.tabWidth);
  const style = profile.editorIndentStyle === "spaces" ? "spaces" : "tab";

  return {
    style,
    width,
    unit: style === "spaces" ? " ".repeat(width) : "\t",
  };
}

function setupMetaControls() {
  const solvedToggle = document.getElementById("solved-toggle");
  solvedToggle.checked = isProblemSolved(currentProblem.id);
  solvedToggle.addEventListener("change", () => {
    setManualSolved(currentProblem.id, solvedToggle.checked);
  });

  const understandingSelect = document.getElementById("understanding-select");
  const understandingWrap = document.getElementById("problem-understanding-wrap");
  const understandingMarker = document.getElementById("problem-understanding-marker");
  populateOrderedLabelSelect(understandingSelect, appConfig.understandingLabels, UNDERSTANDING_SELECT_ORDER, { emptyLabel: "" });
  understandingControls = {
    select: understandingSelect,
    wrap: understandingWrap,
    marker: understandingMarker,
  };
  const initialValue = getUnderstanding(currentProblem.id);
  understandingSelect.value = initialValue;
  updateProblemUnderstandingUI(initialValue);
  understandingSelect.addEventListener("change", () => {
    setProblemUnderstanding(understandingSelect.value, true);
  });
}

function setupResultUnderstandingPrompt() {
  const container = document.getElementById("result-understanding-options");
  container.innerHTML = "";

  appConfig.understandingLabels.forEach((label, index) => {
    const value = String(index + 1);
    const option = document.createElement("label");
    option.className = `understanding-choice understanding-choice-${value}`;
    option.innerHTML = `
      <input type="radio" name="result-understanding" value="${value}" class="sr-only">
      <span class="understanding-choice-label">${escapeHtml(label)}</span>
    `;
    const input = option.querySelector("input");
    input.addEventListener("change", () => {
      if (input.checked) {
        setProblemUnderstanding(value, true);
      }
    });
    container.appendChild(option);
  });

  syncResultUnderstandingPrompt(getUnderstanding(currentProblem.id));
}

function setupJudgeButton() {
  document.getElementById("judge-button").addEventListener("click", judgeCurrentCode);
}

async function judgeCurrentCode() {
  const editor = document.getElementById("code-editor");
  const code = editor.value;
  const errorMessages = getErrorMessages();

  if (new TextEncoder().encode(code).length > appConfig.maxCodeBytes) {
    renderResultState("requestError", formatUiText("codeTooLongMessage", { maxBytes: appConfig.maxCodeBytes }));
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
      renderResultState("requestError", payload.message ?? errorMessages.invalidRequest);
      renderResultDetails([]);
      return;
    }

    if (response.status === 404) {
      showProblemError(errorMessages.problemUnavailable);
      return;
    }

    if (!response.ok) {
      renderResultState("requestError", payload.message ?? errorMessages.judgeUnavailable);
      renderResultDetails([]);
      return;
    }

    renderJudgePayload(payload);
  } catch {
    renderResultState("requestError", errorMessages.judgeUnavailable);
    renderResultDetails([]);
  } finally {
    setJudgeLoading(false);
  }
}

function renderJudgePayload(payload) {
  const details = [];
  const errorMessages = getErrorMessages();

  switch (payload.status) {
    case "accepted":
      renderResultState(
        "accepted",
        payload.warning
          ? uiText("resultAcceptedWithWarning")
          : uiText("resultAccepted")
      );
      toggleResultUnderstandingPrompt(true);
      if (payload.warning) {
        details.push(renderPreCard(uiText("warningLabel"), payload.warning, { previewMode: "message", highlightCompilerTerms: true }));
      }
      markAccepted(currentProblem.id);
      document.getElementById("solved-toggle").checked = true;
      break;
    case "wrong_answer":
      renderResultState(
        "wrongAnswer",
        payload.failedExample?.name ? formatUiText("resultWrongAnswerExample", { example: payload.failedExample.name }) : undefined
      );
      toggleResultUnderstandingPrompt(false);
      if (payload.failedExample) {
        details.push(renderPreCard(uiText("inputLabel"), payload.failedExample.stdin ?? ""));
        details.push(renderPreCard(uiText("expectedOutputLabel"), payload.failedExample.expectedStdout ?? ""));
        details.push(renderPreCard(uiText("actualOutputLabel"), payload.failedExample.actualStdout ?? ""));
      }
      if (payload.warning) {
        details.push(renderPreCard(uiText("warningLabel"), payload.warning, { previewMode: "message", highlightCompilerTerms: true }));
      }
      break;
    case "compile_error":
      renderResultState("compileError");
      toggleResultUnderstandingPrompt(false);
      details.push(renderPreCard(uiText("compilerMessageLabel"), payload.compilerMessage ?? "", { previewMode: "message", highlightCompilerTerms: true }));
      break;
    case "runtime_error":
      renderResultState("runtimeError");
      toggleResultUnderstandingPrompt(false);
      details.push(renderPreCard(uiText("messageLabel"), payload.message ?? "", { previewMode: "message" }));
      break;
    case "timeout":
      renderResultState("timeout");
      toggleResultUnderstandingPrompt(false);
      details.push(renderPreCard(uiText("messageLabel"), payload.message ?? "", { previewMode: "message" }));
      break;
    default:
      renderResultState("requestError", payload.message ?? errorMessages.judgeUnavailable);
      toggleResultUnderstandingPrompt(false);
      break;
  }

  renderResultDetails(details);
}

function renderPreCard(title, content, options = {}) {
  const section = document.createElement("section");
  section.className = "result-card";
  const previewMode = options.previewMode ?? "output";
  const display = buildResultDisplayContent(content, previewMode);
  const previewLines = previewMode === "message"
    ? (Number(appConfig.resultMessagePreviewMaxLines) || DEFAULT_CONFIG.resultMessagePreviewMaxLines)
    : (Number(appConfig.resultPreviewMaxLines) || DEFAULT_CONFIG.resultPreviewMaxLines);
  const noteHtml = display.truncated
    ? `<p class="result-note">${escapeHtml(formatUiText("resultPreviewNote", { lines: previewLines, chars: appConfig.resultPreviewMaxChars }))}</p>`
    : "";
  const renderedText = options.highlightCompilerTerms
    ? highlightCompilerTerms(display.text)
    : escapeHtml(display.text);
  section.innerHTML = `
    <h3>${escapeHtml(title)}</h3>
    ${noteHtml}
    <pre><code>${renderedText}</code></pre>
  `;
  return section;
}

function renderResultState(state, message = null) {
  const resultStatePresets = getResultStatePresets();
  const preset = resultStatePresets[state] ?? resultStatePresets.requestError;
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
  enhanceCopyableCodeBlocks();
}

function setJudgeLoading(isLoading) {
  document.getElementById("judge-loading").hidden = !isLoading;
  document.getElementById("judge-button").disabled = isLoading;
}

function toggleResultUnderstandingPrompt(visible) {
  document.getElementById("result-understanding-prompt").hidden = !visible;
}

function setProblemUnderstanding(value, animate) {
  setUnderstanding(currentProblem.id, value);
  updateProblemUnderstandingUI(value, animate);
  syncResultUnderstandingPrompt(value);
}

function updateProblemUnderstandingUI(value, animate = false) {
  if (!understandingControls) {
    return;
  }

  understandingControls.select.value = value;
  understandingControls.marker.className = `understanding-marker ${getUnderstandingMarkerClass(value)}`;

  if (!animate) {
    return;
  }

  understandingControls.wrap.classList.remove("understanding-select-wrap-animate");
  void understandingControls.wrap.offsetWidth;
  understandingControls.wrap.classList.add("understanding-select-wrap-animate");
}

function syncResultUnderstandingPrompt(value) {
  document.querySelectorAll("input[name='result-understanding']").forEach((input) => {
    input.checked = input.value === value;
  });
}

function showProblemError(message) {
  document.title = `${uiText("problemUnavailableTitle")} | ${appConfig.appName}`;
  document.getElementById("problem-view").hidden = true;
  document.getElementById("problem-error").hidden = false;
  document.getElementById("problem-error-message").textContent = message;
}

function buildResultDisplayContent(content, previewMode = "output") {
  if (content === "") {
    return { text: uiText("emptyContentLabel"), truncated: false };
  }

  const normalized = content.replaceAll("\r\n", "\n");
  const lines = normalized.split("\n");
  const maxLines = previewMode === "message"
    ? (Number(appConfig.resultMessagePreviewMaxLines) || DEFAULT_CONFIG.resultMessagePreviewMaxLines)
    : (Number(appConfig.resultPreviewMaxLines) || DEFAULT_CONFIG.resultPreviewMaxLines);
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

function highlightCompilerTerms(text) {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\berror:/g, '<span class="compiler-term compiler-term-error">error:</span>')
    .replace(/\bwarning:/g, '<span class="compiler-term compiler-term-warning">warning:</span>');
}
