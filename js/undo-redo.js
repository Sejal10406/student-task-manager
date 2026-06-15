/**
 * undo-redo.js — Undo / Redo History Manager for TaskQuest
 *
 * Provides a robust undo/redo stack for task mutations (add, complete,
 * delete, edit). Integrates with the existing TaskQuestStorage API and
 * dispatches a custom event so script.js can re-render after each
 * undo/redo operation.
 *
 * Usage:
 *   - Call  UndoRedo.push(snapshot)  immediately BEFORE mutating the tasks array.
 *   - Bind  Ctrl+Z / Ctrl+Y  keyboard shortcuts (registered via this module).
 *   - Call  UndoRedo.canUndo() / UndoRedo.canRedo()  to enable/disable buttons.
 *
 * Keyboard shortcuts:
 *   Ctrl+Z  (Cmd+Z on Mac)   — Undo
 *   Ctrl+Y  (Cmd+Shift+Z)    — Redo
 *
 * @module undo-redo
 */

(function (global) {
  "use strict";

  /* ─── Config ───────────────────────────────────────────────────────────── */

  /** Maximum number of undo steps retained (prevents unbounded memory growth). */
  const MAX_STACK_SIZE = 50;

  /* ─── State ────────────────────────────────────────────────────────────── */

  /**
   * Each entry in the stack is a plain serialisable snapshot of the tasks array
   * at the time BEFORE the mutation was applied. We store the entire array so
   * that any combination of changes (multi-task operations, bulk-complete, etc.)
   * can always be fully reversed.
   *
   * Memory note: storing the full array is intentional — at ≤200 tasks
   * (typical student usage), each snapshot is well under 50 kB.
   *
   * @type {Array<{tasks: Object[], label: string}>}
   */
  let undoStack = [];

  /**
   * Snapshots displaced from the undo stack by redo operations.
   * @type {Array<{tasks: Object[], label: string}>}
   */
  let redoStack = [];

  /* ─── Core API ─────────────────────────────────────────────────────────── */

  /**
   * Saves the CURRENT state of the tasks array BEFORE applying a mutation.
   * Must be called by the mutation function (addTask, completeTask, deleteTask…)
   * before it modifies `tasks`.
   *
   * @param {Object[]} currentTasks  Reference to the live tasks array
   * @param {string}   [label]       Human-readable action description (for display)
   */
  function push(currentTasks, label) {
    if (!Array.isArray(currentTasks)) return;
    // Deep-clone to avoid the snapshot being mutated in-place later
    const snapshot = { tasks: JSON.parse(JSON.stringify(currentTasks)), label: label || "Change" };
    undoStack.push(snapshot);
    if (undoStack.length > MAX_STACK_SIZE) undoStack.shift(); // evict oldest
    redoStack = []; // any new action invalidates the redo branch
    _notify();
  }

  /**
   * Reverts the tasks array to the state before the last mutation.
   * Returns the restored tasks array, or null if the undo stack is empty.
   *
   * @param {Object[]} currentTasks  Current live tasks array (before undo)
   * @returns {Object[]|null}
   */
  function undo(currentTasks) {
    if (!undoStack.length) return null;
    // Save current state onto redo stack before reverting
    redoStack.push({ tasks: JSON.parse(JSON.stringify(currentTasks)), label: "Redo" });
    const entry = undoStack.pop();
    _notify();
    _applyTasks(entry.tasks, entry.label, "undo");
    return entry.tasks;
  }

  /**
   * Re-applies the most recently undone mutation.
   *
   * @param {Object[]} currentTasks  Current live tasks array (after undo)
   * @returns {Object[]|null}
   */
  function redo(currentTasks) {
    if (!redoStack.length) return null;
    undoStack.push({ tasks: JSON.parse(JSON.stringify(currentTasks)), label: "Undo" });
    const entry = redoStack.pop();
    _notify();
    _applyTasks(entry.tasks, entry.label, "redo");
    return entry.tasks;
  }

  /** @returns {boolean} */
  function canUndo() { return undoStack.length > 0; }

  /** @returns {boolean} */
  function canRedo() { return redoStack.length > 0; }

  /** Returns the label of the next undoable action, or null. */
  function peekUndo() {
    if (!undoStack.length) return null;
    return undoStack[undoStack.length - 1].label;
  }

  /** Returns the label of the next redoable action, or null. */
  function peekRedo() {
    if (!redoStack.length) return null;
    return redoStack[redoStack.length - 1].label;
  }

  /** Clears both stacks (call when the user manually clears all tasks). */
  function clear() {
    undoStack = [];
    redoStack = [];
    _notify();
  }

  /* ─── Internal helpers ─────────────────────────────────────────────────── */

  /**
   * Persists the restored tasks array via TaskQuestStorage and fires the
   * `taskquest:tasks-changed` event so script.js re-renders the task list.
   */
  function _applyTasks(restoredTasks, label, direction) {
    // Write back to storage
    try {
      if (global.TaskQuestStorage && typeof global.TaskQuestStorage.setTasks === "function") {
        global.TaskQuestStorage.setTasks(restoredTasks);
      } else {
        localStorage.setItem("quests", JSON.stringify(restoredTasks));
      }
    } catch (e) {
      console.error("[UndoRedo] Failed to persist restored tasks:", e);
    }

    // Fire custom event for script.js to handle re-render
    window.dispatchEvent(new CustomEvent("taskquest:tasks-changed", {
      detail: { tasks: restoredTasks, source: direction, label }
    }));

    // Show toast feedback
    if (typeof global.showToast === "function") {
      const icon = direction === "undo" ? "↩️" : "↪️";
      global.showToast(`${icon} ${direction === "undo" ? "Undo" : "Redo"}: ${label}`, "info", 2000);
    }
  }

  /**
   * Dispatches a `taskquest:history-changed` event so the UI can update
   * undo/redo button states.
   */
  function _notify() {
    window.dispatchEvent(new CustomEvent("taskquest:history-changed", {
      detail: {
        canUndo: canUndo(),
        canRedo: canRedo(),
        undoLabel: peekUndo(),
        redoLabel: peekRedo()
      }
    }));
  }

  /* ─── Keyboard shortcuts ───────────────────────────────────────────────── */

  document.addEventListener("keydown", function (e) {
    // Ignore shortcuts when typing in an input/textarea
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;

    const isMeta = e.metaKey || e.ctrlKey;

    // Undo: Ctrl+Z / Cmd+Z
    if (isMeta && !e.shiftKey && e.key === "z") {
      e.preventDefault();
      if (canUndo()) {
        // Retrieve current tasks from storage and undo
        let current = [];
        try {
          current = global.TaskQuestStorage
            ? (global.TaskQuestStorage.getTasks() || [])
            : JSON.parse(localStorage.getItem("quests") || "[]");
        } catch (_) {}
        undo(current);
      } else {
        if (typeof global.showToast === "function") global.showToast("Nothing to undo", "info", 1500);
      }
    }

    // Redo: Ctrl+Y / Cmd+Shift+Z
    if (isMeta && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
      e.preventDefault();
      if (canRedo()) {
        let current = [];
        try {
          current = global.TaskQuestStorage
            ? (global.TaskQuestStorage.getTasks() || [])
            : JSON.parse(localStorage.getItem("quests") || "[]");
        } catch (_) {}
        redo(current);
      } else {
        if (typeof global.showToast === "function") global.showToast("Nothing to redo", "info", 1500);
      }
    }
  });

  /* ─── UI: Update undo/redo button titles on history change ─────────────── */

  window.addEventListener("taskquest:history-changed", function (e) {
    const { canUndo: cu, canRedo: cr, undoLabel, redoLabel } = e.detail;

    const undoBtn = document.getElementById("undoBtn");
    const redoBtn = document.getElementById("redoBtn");

    if (undoBtn) {
      undoBtn.disabled = !cu;
      undoBtn.title    = cu ? `Undo: ${undoLabel} (Ctrl+Z)` : "Nothing to undo";
      undoBtn.setAttribute("aria-disabled", (!cu).toString());
    }
    if (redoBtn) {
      redoBtn.disabled = !cr;
      redoBtn.title    = cr ? `Redo: ${redoLabel} (Ctrl+Y)` : "Nothing to redo";
      redoBtn.setAttribute("aria-disabled", (!cr).toString());
    }
  });

  /* ─── Public API ───────────────────────────────────────────────────────── */
  global.UndoRedo = { push, undo, redo, canUndo, canRedo, peekUndo, peekRedo, clear };

})(window);
