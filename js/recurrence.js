/**
 * recurrence.js — Task Recurrence Scheduler for TaskQuest
 *
 * Allows tasks to be marked as recurring (daily, weekly, monthly, or custom)
 * and automatically creates the next occurrence when a recurring task is marked
 * as completed.
 *
 * Integration:
 *  - Call  Recurrence.isRecurring(task)  to check if a task recurs.
 *  - Call  Recurrence.spawnNext(task, allTasks)  immediately AFTER a task
 *    is marked completed to create the next occurrence.
 *    Returns the new task object (not yet saved — caller must push to tasks[] and save).
 *  - Call  Recurrence.getRecurrenceLabel(task)  for display in the UI.
 *
 * Recurrence patterns stored in task.recurrence (string):
 *   "daily"       — repeats every 1 day
 *   "weekly"      — repeats every 7 days
 *   "biweekly"    — repeats every 14 days
 *   "monthly"     — repeats on the same day next month
 *   "weekdays"    — repeats Mon–Fri only (skips Sat/Sun)
 *   "weekends"    — repeats Sat–Sun only
 *
 * @module recurrence
 */

(function (global) {
  "use strict";

  /* ─── Constants ────────────────────────────────────────────────────────── */

  const VALID_PATTERNS = ["daily", "weekly", "biweekly", "monthly", "weekdays", "weekends"];

  const PATTERN_LABELS = {
    daily:     "🔁 Daily",
    weekly:    "📅 Weekly",
    biweekly:  "📅 Every 2 weeks",
    monthly:   "🗓️ Monthly",
    weekdays:  "💼 Weekdays (Mon–Fri)",
    weekends:  "🌴 Weekends (Sat–Sun)"
  };

  /* ─── Validation ───────────────────────────────────────────────────────── */

  /**
   * Returns true if the given task is a valid recurring task.
   * @param {Object} task
   * @returns {boolean}
   */
  function isRecurring(task) {
    return !!(task && task.recurrence && VALID_PATTERNS.includes(task.recurrence));
  }

  /**
   * Returns the human-readable recurrence label.
   * @param {Object} task
   * @returns {string}
   */
  function getRecurrenceLabel(task) {
    if (!isRecurring(task)) return "";
    return PATTERN_LABELS[task.recurrence] || task.recurrence;
  }

  /* ─── Next-date calculation ────────────────────────────────────────────── */

  /**
   * Calculates the next occurrence date for a recurring task's deadline.
   *
   * @param {string|Date} fromDate  The completed task's deadline (or today if absent)
   * @param {string}      pattern   The recurrence pattern
   * @returns {Date}  The next deadline as a Date object
   */
  function calcNextDate(fromDate, pattern) {
    let base = fromDate ? new Date(fromDate) : new Date();
    if (isNaN(base.getTime())) base = new Date();

    // Normalise to midnight on the base date
    base.setHours(23, 59, 0, 0);

    const next = new Date(base);

    switch (pattern) {
      case "daily":
        next.setDate(next.getDate() + 1);
        break;

      case "weekly":
        next.setDate(next.getDate() + 7);
        break;

      case "biweekly":
        next.setDate(next.getDate() + 14);
        break;

      case "monthly": {
        const originalDay = next.getDate();
        next.setMonth(next.getMonth() + 1);
        // Clamp day if the target month has fewer days (e.g. Jan 31 → Feb 28)
        if (next.getDate() !== originalDay) {
          next.setDate(0); // last day of previous month (= intended month)
        }
        break;
      }

      case "weekdays": {
        // Advance at least 1 day, then skip until a weekday
        next.setDate(next.getDate() + 1);
        while (next.getDay() === 0 || next.getDay() === 6) { // Sun = 0, Sat = 6
          next.setDate(next.getDate() + 1);
        }
        break;
      }

      case "weekends": {
        // Advance at least 1 day, then skip until Saturday or Sunday
        next.setDate(next.getDate() + 1);
        while (next.getDay() !== 0 && next.getDay() !== 6) {
          next.setDate(next.getDate() + 1);
        }
        break;
      }

      default:
        next.setDate(next.getDate() + 1);
    }

    return next;
  }

  /* ─── Spawn next occurrence ────────────────────────────────────────────── */

  /**
   * Creates a new task object representing the next occurrence of a recurring task.
   * The caller is responsible for adding it to the tasks array and persisting it.
   *
   * @param {Object}   completedTask   The task that was just marked as completed
   * @param {Object[]} [allTasks=[]]   Existing tasks (used to check for duplicate nextOccurrence)
   * @returns {Object|null}  New task object, or null if task is not recurring / already spawned
   */
  function spawnNext(completedTask, allTasks) {
    if (!isRecurring(completedTask)) return null;

    allTasks = allTasks || [];

    // Prevent duplicate spawning: check if a non-completed next occurrence
    // with the same parentId already exists
    const alreadyExists = allTasks.some(function (t) {
      return t.parentId === completedTask.id && !t.completed;
    });
    if (alreadyExists) return null;

    const nextDate = calcNextDate(completedTask.deadline, completedTask.recurrence);

    /** @type {Object} */
    const nextTask = Object.assign({}, completedTask, {
      // New identity
      id:           Date.now() + Math.random(), // unique ID
      createdAt:    new Date().toISOString(),
      completedAt:  undefined,
      completed:    false,

      // Deadline shifted to the next occurrence
      deadline:     nextDate.toISOString(),

      // Track provenance
      parentId:     completedTask.id,

      // Reset gamification fields that should not carry over
      penaltyApplied: false,
      notified:       false,
    });

    // Remove runtime-only fields that shouldn't be on a fresh task
    delete nextTask.completedAt;

    return nextTask;
  }

  /* ─── Utility: Format a recurrence rule for <select> ────────────────────── */

  /**
   * Generates <option> elements for a recurrence <select> control.
   * @param {string} [selected] The currently selected pattern
   * @returns {string} HTML string of <option> elements
   */
  function renderOptions(selected) {
    const noRepeat = `<option value=""${!selected ? " selected" : ""}>Does not repeat</option>`;
    const opts = VALID_PATTERNS.map(function (p) {
      const sel = selected === p ? " selected" : "";
      return `<option value="${p}"${sel}>${PATTERN_LABELS[p]}</option>`;
    });
    return noRepeat + opts.join("");
  }

  /* ─── Boot: check for due recurrence spawns on page load ──────────────── */

  /**
   * On load, scans existing tasks for completed recurring tasks that have not
   * yet had their next occurrence spawned (e.g. if the spawn failed previously).
   * Any missing next occurrences are created and saved.
   *
   * This is a background repair pass — it does not mutate the visible task list
   * directly but dispatches `taskquest:tasks-changed` for script.js to re-render.
   */
  function _repairMissingOccurrences() {
    let tasks = [];
    try {
      tasks = global.TaskQuestStorage
        ? (global.TaskQuestStorage.getTasks() || [])
        : JSON.parse(localStorage.getItem("quests") || "[]");
    } catch (_) { return; }

    const newTasks = [];
    tasks.forEach(function (t) {
      if (!t.completed || !isRecurring(t)) return;
      const spawned = spawnNext(t, tasks.concat(newTasks));
      if (spawned) newTasks.push(spawned);
    });

    if (!newTasks.length) return;

    const updated = tasks.concat(newTasks);
    try {
      if (global.TaskQuestStorage && typeof global.TaskQuestStorage.setTasks === "function") {
        global.TaskQuestStorage.setTasks(updated);
      } else {
        localStorage.setItem("quests", JSON.stringify(updated));
      }
    } catch (e) {
      console.error("[Recurrence] Failed to save repaired occurrences:", e);
      return;
    }

    console.info("[Recurrence] Spawned", newTasks.length, "missing recurrence(s) on page load.");
    window.dispatchEvent(new CustomEvent("taskquest:tasks-changed", {
      detail: { tasks: updated, source: "recurrence-repair" }
    }));
  }

  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(_repairMissingOccurrences, 500); // defer to after main script boot
  });

  /* ─── Public API ───────────────────────────────────────────────────────── */
  global.Recurrence = {
    isRecurring,
    getRecurrenceLabel,
    calcNextDate,
    spawnNext,
    renderOptions,
    VALID_PATTERNS,
    PATTERN_LABELS
  };

})(window);
