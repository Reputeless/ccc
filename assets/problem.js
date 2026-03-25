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
let understandingControls = null;
const UNDERSTANDING_SELECT_ORDER = ["3", "2", "1"];
const editorHistory = {
  undoStack: [],
  redoStack: [],
  pendingBeforeState: null,
  pendingInputType: "",
  pendingTimestamp: 0,
  suppressRecording: false,
};

document.addEventListener("DOMContentLoaded", async () => {
  applyThemePreference();
  bindThemePreferenceListener();

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
  renderGlobalFooter(appConfig);

  try {
    currentProblem = await fetchProblem(problemId);
  } catch (error) {
    const message = error.status === 404 ? ERROR_MESSAGES.problemUnavailable : ERROR_MESSAGES.loadProblem;
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
  highlightProblemBodyCode();
  renderExamples();
  enhanceCopyableCodeBlocks();
}

function highlightProblemBodyCode() {
  const problemBody = document.getElementById("problem-body");
  if (!problemBody || !window.Prism?.highlightAllUnder) {
    return;
  }

  window.Prism.highlightAllUnder(problemBody);
}

function renderProblemMeta(problem) {
  const container = document.getElementById("problem-meta");
  container.innerHTML = "";

  if (problem.number) {
    container.appendChild(createMetaBadge("problem-number-meta", problem.number));
  }

  if (problem.lecture != null) {
    container.appendChild(createMetaFilterLink(
      "lecture-badge meta-filter-trigger",
      formatLectureLabel(problem.lecture),
      "lecture",
      String(problem.lecture),
      "この講義回で絞り込む"
    ));
  }

  if (problem.difficulty != null) {
    container.appendChild(createMetaFilterLink(
      `difficulty-badge difficulty-${problem.difficulty} meta-filter-trigger`,
      getDifficultyLabel(appConfig, problem.difficulty),
      "difficulty",
      String(problem.difficulty),
      "この難易度で絞り込む"
    ));
  }
}

function createMetaBadge(className, text) {
  const badge = document.createElement("span");
  badge.className = className;
  badge.textContent = text;
  return badge;
}

function createMetaFilterLink(className, text, filterType, filterValue, title) {
  const link = document.createElement("a");
  link.className = className;
  link.href = "index.html";
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
    header.innerHTML = `<span>例 ${escapeHtml(example.name)}</span>`;

    const wrapper = document.createElement("div");
    wrapper.className = "example-content";

    const grid = document.createElement("div");
    grid.className = "example-grid";
    grid.append(
      renderExampleBlock("入力", example.stdin),
      renderExampleBlock("出力", example.stdout)
    );
    wrapper.appendChild(grid);

    card.append(header, wrapper);
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
  document.querySelectorAll("#problem-body pre, #examples-list pre, #result-details pre").forEach((pre) => {
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
  const indentSettings = getEditorIndentSettings();
  editor.rows = appConfig.editorRows;
  editor.style.tabSize = String(indentSettings.width);
  editor.value = getStoredCode(currentProblem.id);
  resetEditorHistory();

  editor.addEventListener("beforeinput", (event) => {
    if (editorHistory.suppressRecording) {
      return;
    }

    editorHistory.pendingBeforeState = captureEditorState(editor);
    editorHistory.pendingInputType = event.inputType ?? "";
    editorHistory.pendingTimestamp = Date.now();
  });

  editor.addEventListener("input", () => {
    setStoredCode(currentProblem.id, editor.value);
    recordEditorInput(editor);
  });

  editor.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) {
        applyCustomEditorRedo(editor);
      } else {
        applyCustomEditorUndo(editor);
      }
      return;
    }

    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "y") {
      event.preventDefault();
      applyCustomEditorRedo(editor);
      return;
    }

    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.code === "Slash") {
      event.preventDefault();
      handleEditorCommentToggle(editor);
      setStoredCode(currentProblem.id, editor.value);
      return;
    }

    if (event.key === "Enter" && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      handleEditorEnterKey(editor);
      setStoredCode(currentProblem.id, editor.value);
      return;
    }

    if (event.key === "}" && !event.altKey && !event.ctrlKey && !event.metaKey) {
      if (handleEditorClosingBraceKey(editor)) {
        event.preventDefault();
        setStoredCode(currentProblem.id, editor.value);
        return;
      }
    }

    if (event.key !== "Tab") {
      return;
    }

    event.preventDefault();
    handleEditorTabKey(editor, event.shiftKey);
    setStoredCode(currentProblem.id, editor.value);
  });
}

function handleEditorTabKey(editor, isShiftPressed) {
  const indentSettings = getEditorIndentSettings();
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const selection = editor.value.slice(start, end);
  const hasMultiLineSelection = start !== end && selection.includes("\n");

  if (!isShiftPressed && !hasMultiLineSelection) {
    applyEditorEdit(
      editor,
      start,
      end,
      indentSettings.unit,
      start + indentSettings.unit.length,
      start + indentSettings.unit.length
    );
    return;
  }

  const currentLineStart = findLineStart(editor.value, start);
  const lineStarts = collectAffectedLineStarts(editor.value, currentLineStart, end);
  const lastLineStart = lineStarts[lineStarts.length - 1];
  const affectedEnd = findLineEnd(editor.value, lastLineStart);
  const affectedText = editor.value.slice(currentLineStart, affectedEnd);
  const lines = affectedText.split("\n");

  if (isShiftPressed) {
    const { text, removedCounts } = dedentLines(lines, indentSettings.width);
    applyEditorEdit(
      editor,
      currentLineStart,
      affectedEnd,
      text,
      Math.max(currentLineStart, start - removedCounts[0]),
      Math.max(currentLineStart, end - removedCounts.reduce((sum, count) => sum + count, 0))
    );
    return;
  }

  const indentedText = lines.map((line) => `${indentSettings.unit}${line}`).join("\n");
  applyEditorEdit(
    editor,
    currentLineStart,
    affectedEnd,
    indentedText,
    start + indentSettings.unit.length,
    end + (lineStarts.length * indentSettings.unit.length)
  );
}

function handleEditorCommentToggle(editor) {
  const block = getEditorSelectedLineBlock(editor.value, editor.selectionStart, editor.selectionEnd);
  const nonEmptyLines = block.lines.filter((line) => line.trim() !== "");
  if (nonEmptyLines.length === 0) {
    return;
  }

  const shouldUncomment = nonEmptyLines.every((line) => /^(\s*)\/\//.test(line));
  const edits = [];

  const transformedLines = block.lines.map((line, index) => {
    const relativeLineStart = block.relativeLineStarts[index];

    if (line.trim() === "") {
      return line;
    }

    if (shouldUncomment) {
      const match = line.match(/^(\s*)\/\//);
      if (!match) {
        return line;
      }

      const removeStart = relativeLineStart + match[1].length;
      edits.push({ type: "remove", start: removeStart, length: 2 });
      return line.slice(0, match[1].length) + line.slice(match[1].length + 2);
    }

    const indentLength = line.match(/^\s*/)?.[0].length ?? 0;
    const insertStart = relativeLineStart + indentLength;
    edits.push({ type: "insert", start: insertStart, length: 2 });
    return line.slice(0, indentLength) + "//" + line.slice(indentLength);
  });

  const replacement = transformedLines.join("\n");
  const selectionStart = block.blockStart + mapEditorOffsetThroughEdits(editor.selectionStart - block.blockStart, edits);
  const selectionEnd = block.blockStart + mapEditorOffsetThroughEdits(editor.selectionEnd - block.blockStart, edits);

  applyEditorEdit(
    editor,
    block.blockStart,
    block.blockEnd,
    replacement,
    selectionStart,
    selectionEnd,
    "commentToggle"
  );
}

function handleEditorEnterKey(editor) {
  const indentSettings = getEditorIndentSettings();
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const currentLineStart = findLineStart(editor.value, start);
  const currentLine = editor.value.slice(currentLineStart, start);
  const indent = currentLine.match(/^[\t ]*/)?.[0] ?? "";
  const nextIndent = shouldIncreaseIndentAfterEnter(currentLine)
    ? `${indent}${indentSettings.unit}`
    : indent;

  applyEditorEdit(
    editor,
    start,
    end,
    `\n${nextIndent}`,
    start + 1 + nextIndent.length,
    start + 1 + nextIndent.length,
    "insertLineBreak"
  );
}

function shouldIncreaseIndentAfterEnter(currentLine) {
  const codePortion = currentLine.replace(/\/\/.*$/, "").trimEnd();
  return codePortion.endsWith("{");
}

function handleEditorClosingBraceKey(editor) {
  const indentSettings = getEditorIndentSettings();
  const start = editor.selectionStart;
  const end = editor.selectionEnd;

  if (start !== end) {
    return false;
  }

  const currentLineStart = findLineStart(editor.value, start);
  const beforeCursor = editor.value.slice(currentLineStart, start);

  if (beforeCursor.trim() !== "") {
    return false;
  }

  const currentIndent = beforeCursor;
  if (currentIndent === "") {
    return false;
  }

  const dedentedIndent = dedentSingleIndent(currentIndent, indentSettings.width);
  if (dedentedIndent === currentIndent) {
    return false;
  }

  applyEditorEdit(
    editor,
    currentLineStart,
    start,
    `${dedentedIndent}}`,
    currentLineStart + dedentedIndent.length + 1,
    currentLineStart + dedentedIndent.length + 1,
    "insertClosingBrace"
  );

  return true;
}

function dedentSingleIndent(indentText, tabWidth) {
  if (indentText.endsWith("\t")) {
    return indentText.slice(0, -1);
  }

  const trailingSpacesMatch = indentText.match(/ +$/);
  if (!trailingSpacesMatch) {
    return indentText;
  }

  const spacesToRemove = Math.min(trailingSpacesMatch[0].length, tabWidth);
  return indentText.slice(0, -spacesToRemove);
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

function applyEditorEdit(editor, replaceStart, replaceEnd, replacement, nextSelectionStart, nextSelectionEnd, inputType = "indentationChange") {
  const beforeState = {
    value: editor.value,
    selectionStart: editor.selectionStart,
    selectionEnd: editor.selectionEnd,
  };

  editorHistory.suppressRecording = true;
  editor.setRangeText(replacement, replaceStart, replaceEnd, "end");
  editorHistory.suppressRecording = false;
  editor.selectionStart = nextSelectionStart;
  editor.selectionEnd = nextSelectionEnd;

  pushEditorHistoryEntry({
    before: beforeState,
    after: {
      value: editor.value,
      selectionStart: editor.selectionStart,
      selectionEnd: editor.selectionEnd,
    },
    inputType,
    timestamp: Date.now(),
  });
}

function applyCustomEditorUndo(editor) {
  const lastOperation = editorHistory.undoStack.pop();
  if (!lastOperation) {
    return false;
  }

  editorHistory.redoStack.push(lastOperation);
  applyEditorHistoryState(editor, lastOperation.before);
  return true;
}

function applyCustomEditorRedo(editor) {
  const nextOperation = editorHistory.redoStack.pop();
  if (!nextOperation) {
    return false;
  }

  editorHistory.undoStack.push(nextOperation);
  applyEditorHistoryState(editor, nextOperation.after);
  return true;
}

function applyEditorHistoryState(editor, state) {
  editorHistory.suppressRecording = true;
  editor.value = state.value;
  editor.selectionStart = state.selectionStart;
  editor.selectionEnd = state.selectionEnd;
  editorHistory.suppressRecording = false;
  setStoredCode(currentProblem.id, editor.value);
}

function recordEditorInput(editor) {
  if (editorHistory.suppressRecording || !editorHistory.pendingBeforeState) {
    return;
  }

  const afterState = captureEditorState(editor);
  const beforeState = editorHistory.pendingBeforeState;
  const inputType = editorHistory.pendingInputType;
  const timestamp = editorHistory.pendingTimestamp;
  clearPendingEditorInput();

  if (
    beforeState.value === afterState.value &&
    beforeState.selectionStart === afterState.selectionStart &&
    beforeState.selectionEnd === afterState.selectionEnd
  ) {
    return;
  }

  pushEditorHistoryEntry({
    before: beforeState,
    after: afterState,
    inputType,
    timestamp,
  });
}

function pushEditorHistoryEntry(entry) {
  const lastEntry = editorHistory.undoStack[editorHistory.undoStack.length - 1];

  if (lastEntry && shouldMergeEditorHistoryEntries(lastEntry, entry)) {
    lastEntry.after = entry.after;
    lastEntry.timestamp = entry.timestamp;
  } else {
    editorHistory.undoStack.push(entry);
    if (editorHistory.undoStack.length > 100) {
      editorHistory.undoStack.shift();
    }
  }

  editorHistory.redoStack = [];
}

function shouldMergeEditorHistoryEntries(previousEntry, nextEntry) {
  const mergeableTypes = new Set(["insertText", "deleteContentBackward", "deleteContentForward"]);
  if (!mergeableTypes.has(previousEntry.inputType) || previousEntry.inputType !== nextEntry.inputType) {
    return false;
  }

  if (nextEntry.timestamp - previousEntry.timestamp > 1000) {
    return false;
  }

  return (
    previousEntry.after.value === nextEntry.before.value &&
    previousEntry.after.selectionStart === nextEntry.before.selectionStart &&
    previousEntry.after.selectionEnd === nextEntry.before.selectionEnd
  );
}

function captureEditorState(editor) {
  return {
    value: editor.value,
    selectionStart: editor.selectionStart,
    selectionEnd: editor.selectionEnd,
  };
}

function clearPendingEditorInput() {
  editorHistory.pendingBeforeState = null;
  editorHistory.pendingInputType = "";
  editorHistory.pendingTimestamp = 0;
}

function resetEditorHistory() {
  editorHistory.undoStack = [];
  editorHistory.redoStack = [];
  clearPendingEditorInput();
  editorHistory.suppressRecording = false;
}

function getEditorSelectedLineBlock(text, selectionStart, selectionEnd) {
  const blockStart = findLineStart(text, selectionStart);
  const lineStarts = collectAffectedLineStarts(text, blockStart, selectionEnd);
  const lastLineStart = lineStarts[lineStarts.length - 1];
  const blockEnd = findLineEnd(text, lastLineStart);
  const blockText = text.slice(blockStart, blockEnd);

  return {
    blockStart,
    blockEnd,
    lines: blockText.split("\n"),
    relativeLineStarts: lineStarts.map((lineStart) => lineStart - blockStart),
  };
}

function mapEditorOffsetThroughEdits(offset, edits) {
  let mappedOffset = offset;

  edits.forEach((edit) => {
    if (edit.type === "insert") {
      if (offset > edit.start) {
        mappedOffset += edit.length;
      }
      return;
    }

    if (offset > edit.start + edit.length) {
      mappedOffset -= edit.length;
    } else if (offset > edit.start) {
      mappedOffset = edit.start;
    }
  });

  return mappedOffset;
}

function findLineStart(text, position) {
  const previousBreak = text.lastIndexOf("\n", Math.max(0, position - 1));
  return previousBreak === -1 ? 0 : previousBreak + 1;
}

function findLineEnd(text, lineStart) {
  const nextBreak = text.indexOf("\n", lineStart);
  return nextBreak === -1 ? text.length : nextBreak;
}

function collectAffectedLineStarts(text, firstLineStart, selectionEnd) {
  const starts = [firstLineStart];
  let searchFrom = firstLineStart;

  while (true) {
    const nextBreak = text.indexOf("\n", searchFrom);
    if (nextBreak === -1 || nextBreak >= selectionEnd) {
      break;
    }

    starts.push(nextBreak + 1);
    searchFrom = nextBreak + 1;
  }

  return starts;
}

function dedentLines(lines, tabWidth) {
  const removedCounts = [];
  const dedentedLines = lines.map((line) => {
    if (line.startsWith("\t")) {
      removedCounts.push(1);
      return line.slice(1);
    }

    const leadingSpaces = line.match(/^ +/)?.[0].length ?? 0;
    const spacesToRemove = Math.min(leadingSpaces, tabWidth);
    removedCounts.push(spacesToRemove);
    return line.slice(spacesToRemove);
  });

  return {
    text: dedentedLines.join("\n"),
    removedCounts,
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
      renderResultState(
        "accepted",
        payload.warning
          ? "合格！ ただしコンパイラ警告を確認してください"
          : "合格！"
      );
      toggleResultUnderstandingPrompt(true);
      if (payload.warning) {
        details.push(renderPreCard("警告", payload.warning, { previewMode: "message", highlightCompilerTerms: true }));
      }
      markAccepted(currentProblem.id);
      document.getElementById("solved-toggle").checked = true;
      break;
    case "wrong_answer":
      renderResultState(
        "wrongAnswer",
        payload.failedExample?.name ? `失敗ケースあり（例 ${payload.failedExample.name}）` : undefined
      );
      toggleResultUnderstandingPrompt(false);
      if (payload.failedExample) {
        details.push(renderPreCard("入力", payload.failedExample.stdin ?? ""));
        details.push(renderPreCard("正しい出力", payload.failedExample.expectedStdout ?? ""));
        details.push(renderPreCard("実際の出力", payload.failedExample.actualStdout ?? ""));
      }
      if (payload.warning) {
        details.push(renderPreCard("警告", payload.warning, { previewMode: "message", highlightCompilerTerms: true }));
      }
      break;
    case "compile_error":
      renderResultState("compileError");
      toggleResultUnderstandingPrompt(false);
      details.push(renderPreCard("コンパイルメッセージ", payload.compilerMessage ?? "", { previewMode: "message", highlightCompilerTerms: true }));
      break;
    case "runtime_error":
      renderResultState("runtimeError");
      toggleResultUnderstandingPrompt(false);
      details.push(renderPreCard("メッセージ", payload.message ?? "", { previewMode: "message" }));
      break;
    case "timeout":
      renderResultState("timeout");
      toggleResultUnderstandingPrompt(false);
      details.push(renderPreCard("メッセージ", payload.message ?? "", { previewMode: "message" }));
      break;
    default:
      renderResultState("requestError", payload.message ?? ERROR_MESSAGES.judgeUnavailable);
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
    ? `<p class="result-note">表示が長いため、先頭 ${previewLines} 行・${appConfig.resultPreviewMaxChars} 文字までを表示しています。</p>`
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

function buildResultDisplayContent(content, previewMode = "output") {
  if (content === "") {
    return { text: "(空)", truncated: false };
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
