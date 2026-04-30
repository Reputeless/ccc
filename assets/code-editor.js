(function attachCodeEditorModule(windowObject) {
  const DEFAULT_OPTIONS = {
    getIndentSettings() {
      return {
        style: "tab",
        width: 4,
        unit: "\t",
      };
    },
    getLineCommentMarker() {
      return "//";
    },
    getLanguage() {
      return "";
    },
    onValueChange() {},
  };

  function attachCodeEditor(textarea, options = {}) {
    const settings = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
    const history = createHistory();
    const applyValueChange = typeof settings.onValueChange === "function"
      ? settings.onValueChange
      : DEFAULT_OPTIONS.onValueChange;

    textarea.addEventListener("beforeinput", (event) => {
      if (history.suppressRecording) {
        return;
      }

      history.pendingBeforeState = captureState(textarea);
      history.pendingInputType = event.inputType ?? "";
      history.pendingTimestamp = Date.now();
    });

    textarea.addEventListener("input", () => {
      applyValueChange(textarea.value);
      recordInput(textarea, history);
    });

    textarea.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          applyRedo(textarea, history, applyValueChange);
        } else {
          applyUndo(textarea, history, applyValueChange);
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "y") {
        event.preventDefault();
        applyRedo(textarea, history, applyValueChange);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.code === "Slash") {
        event.preventDefault();
        handleCommentToggle(textarea, history, settings.getLineCommentMarker());
        applyValueChange(textarea.value);
        return;
      }

      if (event.key === "Backspace" && !event.altKey && !event.ctrlKey && !event.metaKey) {
        if (handleIndentBackspace(textarea, history, settings.getIndentSettings())) {
          event.preventDefault();
          applyValueChange(textarea.value);
          return;
        }
      }

      if (event.key === "Enter" && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        handleEnterKey(textarea, history, settings.getIndentSettings(), settings.getLanguage());
        applyValueChange(textarea.value);
        return;
      }

      if (event.key === "}" && !event.altKey && !event.ctrlKey && !event.metaKey) {
        if (handleClosingBraceKey(textarea, history, settings.getIndentSettings())) {
          event.preventDefault();
          applyValueChange(textarea.value);
          return;
        }
      }

      if (event.key !== "Tab") {
        return;
      }

      event.preventDefault();
      handleTabKey(textarea, history, settings.getIndentSettings(), event.shiftKey);
      applyValueChange(textarea.value);
    });

    return {
      resetHistory() {
        resetHistoryState(history);
      },
    };
  }

  function createHistory() {
    return {
      undoStack: [],
      redoStack: [],
      pendingBeforeState: null,
      pendingInputType: "",
      pendingTimestamp: 0,
      suppressRecording: false,
    };
  }

  function handleTabKey(editor, history, indentSettings, isShiftPressed) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selection = editor.value.slice(start, end);
    const hasMultiLineSelection = start !== end && selection.includes("\n");

    if (!isShiftPressed && !hasMultiLineSelection) {
      applyEdit(
        editor,
        history,
        start,
        end,
        indentSettings.unit,
        start + indentSettings.unit.length,
        start + indentSettings.unit.length
      );
      return;
    }

    const currentLineStart = lineStart(editor.value, start);
    const lineStarts = collectLineStarts(editor.value, currentLineStart, end);
    const lastLineStart = lineStarts[lineStarts.length - 1];
    const affectedEnd = lineEnd(editor.value, lastLineStart);
    const affectedText = editor.value.slice(currentLineStart, affectedEnd);
    const lines = affectedText.split("\n");

    if (isShiftPressed) {
      const { text, removedCounts } = dedentLines(lines, indentSettings.width);
      applyEdit(
        editor,
        history,
        currentLineStart,
        affectedEnd,
        text,
        Math.max(currentLineStart, start - removedCounts[0]),
        Math.max(currentLineStart, end - removedCounts.reduce((sum, count) => sum + count, 0))
      );
      return;
    }

    const indentedText = lines.map((line) => `${indentSettings.unit}${line}`).join("\n");
    applyEdit(
      editor,
      history,
      currentLineStart,
      affectedEnd,
      indentedText,
      start + indentSettings.unit.length,
      end + (lineStarts.length * indentSettings.unit.length)
    );
  }

  function handleCommentToggle(editor, history, marker) {
    const commentMarker = typeof marker === "string" && marker !== "" ? marker : "//";
    const block = getSelectedLineBlock(editor.value, editor.selectionStart, editor.selectionEnd);
    const nonEmptyLines = block.lines.filter((line) => line.trim() !== "");
    if (nonEmptyLines.length === 0) {
      return;
    }

    const markerPattern = escapeRegExp(commentMarker);
    const uncommentPattern = new RegExp(`^(\\s*)${markerPattern}\\s?`);
    const shouldUncomment = nonEmptyLines.every((line) => uncommentPattern.test(line));
    const edits = [];

    const transformedLines = block.lines.map((line, index) => {
      const relativeLineStart = block.relativeLineStarts[index];

      if (line.trim() === "") {
        return line;
      }

      if (shouldUncomment) {
        const match = line.match(uncommentPattern);
        if (!match) {
          return line;
        }

        const removeStart = relativeLineStart + match[1].length;
        const removeLength = match[0].length - match[1].length;
        edits.push({ type: "remove", start: removeStart, length: removeLength });
        return line.slice(0, match[1].length) + line.slice(match[1].length + removeLength);
      }

      const indentLength = line.match(/^\s*/)?.[0].length ?? 0;
      const insertStart = relativeLineStart + indentLength;
      const inserted = `${commentMarker} `;
      edits.push({ type: "insert", start: insertStart, length: inserted.length });
      return line.slice(0, indentLength) + inserted + line.slice(indentLength);
    });

    const replacement = transformedLines.join("\n");
    const selectionStart = block.blockStart + mapOffsetThroughEdits(editor.selectionStart - block.blockStart, edits);
    const selectionEnd = block.blockStart + mapOffsetThroughEdits(editor.selectionEnd - block.blockStart, edits);

    applyEdit(
      editor,
      history,
      block.blockStart,
      block.blockEnd,
      replacement,
      selectionStart,
      selectionEnd,
      "commentToggle"
    );
  }

  function handleIndentBackspace(editor, history, indentSettings) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;

    if (start !== end) {
      return false;
    }

    const currentLineStart = lineStart(editor.value, start);
    if (start === currentLineStart) {
      return false;
    }

    const beforeCursor = editor.value.slice(currentLineStart, start);
    if (beforeCursor.trim() !== "") {
      return false;
    }

    const deleteStart = findIndentBackspaceStart(beforeCursor, indentSettings.width);
    if (deleteStart === beforeCursor.length) {
      return false;
    }

    const replaceStart = currentLineStart + deleteStart;
    applyEdit(
      editor,
      history,
      replaceStart,
      start,
      "",
      replaceStart,
      replaceStart,
      "deleteIndentation"
    );
    return true;
  }

  function findIndentBackspaceStart(indentBeforeCursor, indentWidth) {
    if (indentBeforeCursor.endsWith("\t")) {
      return indentBeforeCursor.length - 1;
    }

    const trailingSpaces = indentBeforeCursor.match(/ +$/)?.[0].length ?? 0;
    if (trailingSpaces === 0) {
      return indentBeforeCursor.length;
    }

    const width = Math.max(1, Number(indentWidth) || 1);
    const remainder = trailingSpaces % width;
    const spacesToRemove = remainder === 0
      ? Math.min(width, trailingSpaces)
      : remainder;
    return indentBeforeCursor.length - spacesToRemove;
  }

  function handleEnterKey(editor, history, indentSettings, language) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const currentLineStart = lineStart(editor.value, start);
    const currentLine = editor.value.slice(currentLineStart, start);
    const indent = currentLine.match(/^[\t ]*/)?.[0] ?? "";
    const nextIndent = shouldIncreaseIndentAfterEnter(currentLine, language)
      ? `${indent}${indentSettings.unit}`
      : indent;

    applyEdit(
      editor,
      history,
      start,
      end,
      `\n${nextIndent}`,
      start + 1 + nextIndent.length,
      start + 1 + nextIndent.length,
      "insertLineBreak"
    );
  }

  function shouldIncreaseIndentAfterEnter(currentLine, language) {
    const normalizedLanguage = String(language ?? "").toLowerCase();
    const codePortion = stripLineComment(currentLine, normalizedLanguage).trimEnd();
    if (normalizedLanguage === "python") {
      return codePortion.endsWith(":");
    }

    return codePortion.endsWith("{");
  }

  function stripLineComment(line, language) {
    if (language === "python") {
      return stripCommentOutsideQuotes(line, "#");
    }

    return stripCommentOutsideQuotes(line, "//");
  }

  function stripCommentOutsideQuotes(line, marker) {
    let quote = "";
    let escaped = false;

    for (let index = 0; index < line.length; index++) {
      const char = line[index];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = quote !== "";
        continue;
      }

      if (quote !== "") {
        if (char === quote) {
          quote = "";
        }
        continue;
      }

      if (char === "\"" || char === "'") {
        quote = char;
        continue;
      }

      if (line.startsWith(marker, index)) {
        return line.slice(0, index);
      }
    }

    return line;
  }

  function handleClosingBraceKey(editor, history, indentSettings) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;

    if (start !== end) {
      return false;
    }

    const currentLineStart = lineStart(editor.value, start);
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

    applyEdit(
      editor,
      history,
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

  function applyEdit(editor, history, replaceStart, replaceEnd, replacement, nextSelectionStart, nextSelectionEnd, inputType = "indentationChange") {
    const beforeState = {
      value: editor.value,
      selectionStart: editor.selectionStart,
      selectionEnd: editor.selectionEnd,
    };

    history.suppressRecording = true;
    editor.setRangeText(replacement, replaceStart, replaceEnd, "end");
    history.suppressRecording = false;
    editor.selectionStart = nextSelectionStart;
    editor.selectionEnd = nextSelectionEnd;

    pushHistoryEntry(history, {
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

  function applyUndo(editor, history, onValueChange) {
    const lastOperation = history.undoStack.pop();
    if (!lastOperation) {
      return false;
    }

    history.redoStack.push(lastOperation);
    applyHistoryState(editor, history, lastOperation.before, onValueChange);
    return true;
  }

  function applyRedo(editor, history, onValueChange) {
    const nextOperation = history.redoStack.pop();
    if (!nextOperation) {
      return false;
    }

    history.undoStack.push(nextOperation);
    applyHistoryState(editor, history, nextOperation.after, onValueChange);
    return true;
  }

  function applyHistoryState(editor, history, state, onValueChange) {
    history.suppressRecording = true;
    editor.value = state.value;
    editor.selectionStart = state.selectionStart;
    editor.selectionEnd = state.selectionEnd;
    history.suppressRecording = false;
    onValueChange(editor.value);
  }

  function recordInput(editor, history) {
    if (history.suppressRecording || !history.pendingBeforeState) {
      return;
    }

    const afterState = captureState(editor);
    const beforeState = history.pendingBeforeState;
    const inputType = history.pendingInputType;
    const timestamp = history.pendingTimestamp;
    clearPendingInput(history);

    if (
      beforeState.value === afterState.value &&
      beforeState.selectionStart === afterState.selectionStart &&
      beforeState.selectionEnd === afterState.selectionEnd
    ) {
      return;
    }

    pushHistoryEntry(history, {
      before: beforeState,
      after: afterState,
      inputType,
      timestamp,
    });
  }

  function pushHistoryEntry(history, entry) {
    const lastEntry = history.undoStack[history.undoStack.length - 1];

    if (lastEntry && shouldMergeHistoryEntries(lastEntry, entry)) {
      lastEntry.after = entry.after;
      lastEntry.timestamp = entry.timestamp;
    } else {
      history.undoStack.push(entry);
      if (history.undoStack.length > 100) {
        history.undoStack.shift();
      }
    }

    history.redoStack = [];
  }

  function shouldMergeHistoryEntries(previousEntry, nextEntry) {
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

  function captureState(editor) {
    return {
      value: editor.value,
      selectionStart: editor.selectionStart,
      selectionEnd: editor.selectionEnd,
    };
  }

  function clearPendingInput(history) {
    history.pendingBeforeState = null;
    history.pendingInputType = "";
    history.pendingTimestamp = 0;
  }

  function resetHistoryState(history) {
    history.undoStack = [];
    history.redoStack = [];
    clearPendingInput(history);
    history.suppressRecording = false;
  }

  function getSelectedLineBlock(text, selectionStart, selectionEnd) {
    const blockStart = lineStart(text, selectionStart);
    const lineStarts = collectLineStarts(text, blockStart, selectionEnd);
    const lastLineStart = lineStarts[lineStarts.length - 1];
    const blockEnd = lineEnd(text, lastLineStart);
    const blockText = text.slice(blockStart, blockEnd);

    return {
      blockStart,
      blockEnd,
      lines: blockText.split("\n"),
      relativeLineStarts: lineStarts.map((lineStart) => lineStart - blockStart),
    };
  }

  function mapOffsetThroughEdits(offset, edits) {
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

  function lineStart(text, position) {
    const previousBreak = text.lastIndexOf("\n", Math.max(0, position - 1));
    return previousBreak === -1 ? 0 : previousBreak + 1;
  }

  function lineEnd(text, start) {
    const nextBreak = text.indexOf("\n", start);
    return nextBreak === -1 ? text.length : nextBreak;
  }

  function collectLineStarts(text, firstLineStart, selectionEnd) {
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

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  windowObject.CCCCodeEditor = {
    attachCodeEditor,
  };
})(window);
