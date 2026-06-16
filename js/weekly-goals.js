/**
 * weekly-goals.js — Weekly Goal Setting & Progress Tracker for TaskQuest
 *
 * Allows students to set a weekly task-completion target and tracks
 * real-time progress against that goal, displayed as a visual progress ring
 * in the analytics panel.
 *
 * Features:
 *  - Persists goals in TaskQuestStorage (canonical taskquest_v1 namespace)
 *  - Calculates progress from real task data via TaskQuestStorage.getTasks()
 *  - Animated SVG progress ring with percentage label
 *  - Motivational status messages based on progress percentage
 *  - Resets automatically at the start of each ISO week (Monday)
 *
 * @module weekly-goals
 */

(function () {
  "use strict";

  /* ─── Constants ───────────────────────────────────────────────────────── */
  const STORAGE_KEY = "taskquest_v1.weekly_goal";
  const DEFAULT_GOAL = 10;

  /* ─── Helpers ─────────────────────────────────────────────────────────── */

  /**
   * Returns the ISO Monday (start-of-week) for a given date as YYYY-MM-DD.
   * @param {Date} [date=new Date()]
   * @returns {string}
   */
  function getWeekKey(date) {
    const d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0=Sun … 6=Sat
    const diff = (day === 0 ? -6 : 1) - day; // adjust so Monday = 0
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  }

  /**
   * Loads persisted goal data for the current week.
   * Resets to defaults if the stored week key does not match the current week.
   * @returns {{ weekKey: string, target: number }}
   */
  function loadGoal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && obj.weekKey === getWeekKey()) {
          return { weekKey: obj.weekKey, target: parseInt(obj.target, 10) || DEFAULT_GOAL };
        }
      }
    } catch (_) { /* fall through */ }
    return { weekKey: getWeekKey(), target: DEFAULT_GOAL };
  }

  /**
   * Persists the goal for the current week.
   * @param {number} target
   */
  function saveGoal(target) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ weekKey: getWeekKey(), target }));
    } catch (e) {
      console.warn("[WeeklyGoals] Could not save goal:", e);
    }
  }

  /**
   * Counts tasks completed during the current ISO week.
   * @returns {number}
   */
  function getCompletedThisWeek() {
    let tasks = [];
    try {
      if (window.TaskQuestStorage && typeof window.TaskQuestStorage.getTasks === "function") {
        tasks = window.TaskQuestStorage.getTasks() || [];
      } else {
        const raw = localStorage.getItem("quests") || localStorage.getItem("taskquest_v1.tasks");
        tasks = raw ? JSON.parse(raw) : [];
      }
    } catch (_) { return 0; }

    const weekStart = new Date(getWeekKey() + "T00:00:00");
    const weekEnd   = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return tasks.filter(function (t) {
      if (!t.completed || !t.completedAt) return false;
      const d = new Date(t.completedAt);
      return !isNaN(d) && d >= weekStart && d < weekEnd;
    }).length;
  }

  /* ─── UI Rendering ────────────────────────────────────────────────────── */

  /**
   * Returns a motivational status message based on completion percentage.
   * @param {number} pct 0–100
   * @returns {string}
   */
  function getMotivationMessage(pct) {
    if (pct >= 100) return "🏆 Weekly goal crushed! You're unstoppable!";
    if (pct >= 75)  return "🔥 Almost there — keep the momentum!";
    if (pct >= 50)  return "💪 Halfway through — solid progress!";
    if (pct >= 25)  return "🚀 Good start — keep pushing!";
    return "⭐ Set a target and start conquering!";
  }

  /**
   * Renders the progress ring and stats into the weekly-goals widget.
   * Expects the following elements in the DOM:
   *   #weeklyGoalProgress     – SVG <circle> (stroke-dasharray target)
   *   #weeklyGoalPct          – percentage label text
   *   #weeklyGoalCompleted    – completed count
   *   #weeklyGoalTarget       – target count
   *   #weeklyGoalMessage      – motivational message
   *   #weeklyGoalInput        – number input for setting a new target
   */
  function render() {
    const goal      = loadGoal();
    const completed = getCompletedThisWeek();
    const pct       = goal.target > 0 ? Math.min(100, Math.round((completed / goal.target) * 100)) : 0;

    // SVG ring: circumference = 2 * π * r (r=42 in the template below)
    const CIRC = 2 * Math.PI * 42;
    const offset = CIRC - (pct / 100) * CIRC;

    const ringEl    = document.getElementById("weeklyGoalProgress");
    const pctEl     = document.getElementById("weeklyGoalPct");
    const doneEl    = document.getElementById("weeklyGoalCompleted");
    const targetEl  = document.getElementById("weeklyGoalTarget");
    const msgEl     = document.getElementById("weeklyGoalMessage");
    const inputEl   = document.getElementById("weeklyGoalInput");

    if (ringEl) {
      ringEl.style.strokeDasharray  = CIRC;
      ringEl.style.strokeDashoffset = offset;
      ringEl.style.stroke = pct >= 100 ? "#10b981" : pct >= 50 ? "#a855f7" : "#06b6d4";
    }
    if (pctEl)    pctEl.textContent    = pct + "%";
    if (doneEl)   doneEl.textContent   = completed;
    if (targetEl) targetEl.textContent = goal.target;
    if (msgEl)    msgEl.textContent    = getMotivationMessage(pct);
    if (inputEl && !inputEl.dataset.bound) {
      inputEl.value = goal.target;
      inputEl.addEventListener("change", function () {
        const newTarget = Math.max(1, Math.min(500, parseInt(inputEl.value, 10) || DEFAULT_GOAL));
        inputEl.value = newTarget;
        saveGoal(newTarget);
        render();
        if (typeof window.showToast === "function") {
          window.showToast("Weekly goal updated to " + newTarget + " tasks!", "success");
        }
      });
      inputEl.dataset.bound = "1";
    }
  }

  /* ─── Inject widget HTML ──────────────────────────────────────────────── */

  /**
   * Injects the weekly goals widget into the analytics tab if the target
   * container element (#weeklyGoalWidget) does not already contain content.
   */
  function injectWidget() {
    const container = document.getElementById("weeklyGoalWidget");
    if (!container || container.childElementCount > 0) return;

    container.innerHTML = `
      <div class="wg-card" role="region" aria-label="Weekly Goal Tracker">
        <div class="wg-header">
          <h3 class="wg-title">📅 Weekly Goal</h3>
          <div class="wg-input-group">
            <label for="weeklyGoalInput" class="wg-label">Target tasks:</label>
            <input
              id="weeklyGoalInput"
              type="number"
              min="1"
              max="500"
              class="wg-input"
              aria-label="Set weekly task target"
            />
          </div>
        </div>

        <div class="wg-ring-wrap" aria-hidden="true">
          <svg class="wg-ring" viewBox="0 0 100 100" width="120" height="120">
            <circle class="wg-ring-bg" cx="50" cy="50" r="42" />
            <circle
              id="weeklyGoalProgress"
              class="wg-ring-fill"
              cx="50" cy="50" r="42"
              style="stroke-dasharray:263.9;stroke-dashoffset:263.9;transition:stroke-dashoffset 0.6s ease, stroke 0.4s;"
            />
          </svg>
          <div class="wg-pct-label">
            <span id="weeklyGoalPct" aria-live="polite">0%</span>
          </div>
        </div>

        <div class="wg-stats">
          <div class="wg-stat">
            <span class="wg-stat-value" id="weeklyGoalCompleted">0</span>
            <span class="wg-stat-label">Completed</span>
          </div>
          <div class="wg-stat">
            <span class="wg-stat-value" id="weeklyGoalTarget">10</span>
            <span class="wg-stat-label">Target</span>
          </div>
        </div>

        <p id="weeklyGoalMessage" class="wg-message" aria-live="polite"></p>
      </div>
    `;

    // Inject styles (self-contained, no external CSS file required)
    if (!document.getElementById("wg-styles")) {
      const style = document.createElement("style");
      style.id = "wg-styles";
      style.textContent = `
        .wg-card {
          background: var(--card-bg, rgba(255,255,255,0.05));
          border: 1px solid var(--border-color, rgba(255,255,255,0.1));
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .wg-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
        }
        .wg-title {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-color, #e2e8f0);
        }
        .wg-input-group { display: flex; align-items: center; gap: 6px; }
        .wg-label { font-size: 0.8rem; color: var(--text-light, rgba(255,255,255,0.6)); }
        .wg-input {
          width: 64px;
          padding: 4px 8px;
          border-radius: 8px;
          border: 1px solid var(--border-color, rgba(255,255,255,0.15));
          background: var(--input-bg, rgba(255,255,255,0.08));
          color: var(--text-color, #e2e8f0);
          font-size: 0.875rem;
          text-align: center;
        }
        .wg-ring-wrap { position: relative; width: 120px; height: 120px; }
        .wg-ring { transform: rotate(-90deg); }
        .wg-ring-bg  { fill: none; stroke: rgba(255,255,255,0.08); stroke-width: 8; }
        .wg-ring-fill { fill: none; stroke: #06b6d4; stroke-width: 8; stroke-linecap: round; }
        .wg-pct-label {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-color, #e2e8f0);
        }
        .wg-stats { display: flex; gap: 32px; }
        .wg-stat { display: flex; flex-direction: column; align-items: center; }
        .wg-stat-value { font-size: 1.5rem; font-weight: 700; color: var(--primary, #a855f7); }
        .wg-stat-label { font-size: 0.75rem; color: var(--text-light, rgba(255,255,255,0.6)); }
        .wg-message {
          font-size: 0.85rem;
          text-align: center;
          color: var(--text-light, rgba(255,255,255,0.7));
          margin: 0;
          min-height: 1.2em;
        }
      `;
      document.head.appendChild(style);
    }

    render();
  }

  /* ─── Boot ─────────────────────────────────────────────────────────────── */

  document.addEventListener("DOMContentLoaded", function () {
    injectWidget();

    // Re-render when the analytics tab is activated
    document.querySelectorAll('[data-tab="analytics"], #tabBtnAnalytics, #dockBtnAnalytics').forEach(function (el) {
      el.addEventListener("click", function () {
        setTimeout(function () { injectWidget(); render(); }, 60);
      });
    });

    // Re-render when tasks are updated from another tab
    window.addEventListener("storage", function (e) {
      if (e.key === "taskquest_v1.tasks" || e.key === "quests") {
        render();
      }
    });

    // Expose for external callers (e.g., script.js after task completion)
    window.refreshWeeklyGoals = render;
  });

})();
