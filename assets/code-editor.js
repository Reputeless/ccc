(function attachCodeEditorModule(windowObject) {
  const DEFAULT_OPTIONS = {
    getIndentSettings() {
      return {
        style: "tab",
        width: 4,
        unit: "\t",
      };
    },
    onValueChange() {},
  };

  function attachCodeEditor(textarea, options = {}) {
    const settings = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
    const history = createEditorHistoryState();
    const applyValueChange = typeof settings.onValueChange === "function"
      ? settings.onValueChange
      : DEFAULT_OPTIONS.onValueChange;

    textarea.addEventListener("beforeinput", (event) => {
      if (history.suppressRecording) {
        return;
      }

      history.pendingBeforeState = captureEditorState(textarea);
      history.pendingInputType = event.inputType ?? "";
      history.pendingTimestamp = Date.now();
    });

    textarea.addEventListener("input", () => {
      applyValueChange(textarea.value);
      recordEditorInput(textarea, history);
    });

    textarea.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          applyCustomEditorRedo(textarea, history, applyValueChange);
        } else {
          applyCustomEditorUndo(textarea, history, applyValueChange);
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "y") {
        event.preventDefault();
        applyCustomEditorRedo(textarea, history, applyValueChange);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.code === "Slash") {
        event.preventDefault();
        handleEditorCommentToggle(textarea, history);
        applyValueChange(textarea.value);
        return;
      }

      if (event.key === "Enter" && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        handleEditorEnterKey(textarea, history, settings.getIndentSettings());
        applyValueChange(textarea.value);
        return;
      }

      if (event.key === "}" && !event.altKey && !event.ctrlKey && !event.metaKey) {
        if (handleEditorClosingBraceKey(textarea, history, settings.getIndentSettings())) {
          event.preventDefault();
          applyValueChange(textarea.value);
          return;
        }
      }

      if (event.key !== "Tab") {
        return;
      }

      event.preventDefault();
      handleEditorTabKey(textarea, history, settings.getIndentSettings(), event.shiftKey);
      applyValueChange(textarea.value);
    });

    return {
      resetHistory() {
        resetEditorHistory(history);
      },
    };
  }

  function createEditorHistoryState() {
    return {
      undoStack: [],
      redoStack: [],
      pendingBeforeState: null,
      pendingInputType: "",
      pendingTimestamp: 0,
      suppressRecording: false,
    };
  }

  function handleEditorTabKey(editor, history, indentSettings, isShiftPressed) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selection = editor.value.slice(start, end);
    const hasMultiLineSelection = start !== end && selection.includes("\n");

    if (!isShiftPressed && !hasMultiLineSelection) {
      applyEditorEdit(
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
    applyEditorEdit(
      editor,
      history,
      currentLineStart,
      affectedEnd,
      indentedText,
      start + indentSettings.unit.length,
      end + (lineStarts.length * indentSettings.unit.length)
    );
  }

  function handleEditorCommentToggle(editor, history) {
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
      history,
      block.blockStart,
      block.blockEnd,
      replacement,
      selectionStart,
      selectionEnd,
      "commentToggle"
    );
  }

  function handleEditorEnterKey(editor, history, indentSettings) {
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
      history,
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

  function handleEditorClosingBraceKey(editor, history, indentSettings) {
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

  function applyEditorEdit(editor, history, replaceStart, replaceEnd, replacement, nextSelectionStart, nextSelectionEnd, inputType = "indentationChange") {
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

    pushEditorHistoryEntry(history, {
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

  function applyCustomEditorUndo(editor, history, onValueChange) {
    const lastOperation = history.undoStack.pop();
    if (!lastOperation) {
      return false;
    }

    history.redoStack.push(lastOperation);
    applyEditorHistoryState(editor, history, lastOperation.before, onValueChange);
    return true;
  }

  function applyCustomEditorRedo(editor, history, onValueChange) {
    const nextOperation = history.redoStack.pop();
    if (!nextOperation) {
      return false;
    }

    history.undoStack.push(nextOperation);
    applyEditorHistoryState(editor, history, nextOperation.after, onValueChange);
    return true;
  }

  function applyEditorHistoryState(editor, history, state, onValueChange) {
    history.suppressRecording = true;
    editor.value = state.value;
    editor.selectionStart = state.selectionStart;
    editor.selectionEnd = state.selectionEnd;
    history.suppressRecording = false;
    onValueChange(editor.value);
  }

  function recordEditorInput(editor, history) {
    if (history.suppressRecording || !history.pendingBeforeState) {
      return;
    }

    const afterState = captureEditorState(editor);
    const beforeState = history.pendingBeforeState;
    const inputType = history.pendingInputType;
    const timestamp = history.pendingTimestamp;
    clearPendingEditorInput(history);

    if (
      beforeState.value === afterState.value &&
      beforeState.selectionStart === afterState.selectionStart &&
      beforeState.selectionEnd === afterState.selectionEnd
    ) {
      return;
    }

    pushEditorHistoryEntry(history, {
      before: beforeState,
      after: afterState,
      inputType,
      timestamp,
    });
  }

  function pushEditorHistoryEntry(history, entry) {
    const lastEntry = history.undoStack[history.undoStack.length - 1];

    if (lastEntry && shouldMergeEditorHistoryEntries(lastEntry, entry)) {
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

  function clearPendingEditorInput(history) {
    history.pendingBeforeState = null;
    history.pendingInputType = "";
    history.pendingTimestamp = 0;
  }

  function resetEditorHistory(history) {
    history.undoStack = [];
    history.redoStack = [];
    clearPendingEditorInput(history);
    history.suppressRecording = false;
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

  windowObject.CCCCodeEditor = {
    attachCodeEditor,
  };
})(window);
