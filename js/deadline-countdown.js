/**
 * deadline-countdown.js — Live Deadline Countdown for TaskQuest
 *
 * Attaches a live countdown timer badge to every task card that has a
 * deadline set. Updates every 60 seconds via a shared setInterval so there
 * is only ONE interval running regardless of the number of visible tasks.
 *
 * Countdown badge behaviour:
 *  - "> 24 h"  → subtle badge showing "X days Y h"
 *  - "≤ 24 h"  → amber badge showing "Xh Ym"
 *  - "≤ 1 h"   → red pulsing badge showing "Xm Ys"  (urgent)
 *  - Overdue   → red badge showing "Overdue Xd"
 *  - Completed → badge hidden
 *
 * Usage:
 *  Include this file after script.js.
 *  Call  window.DeadlineCountdown.refresh()  after each renderTasks() call.
 *
 * @module deadline-countdown
 */

(function (global) {
  "use strict";

  /* ─── Constants ────────────────────────────────────────────────────────── */
  const TICK_MS  = 60_000; // update every 60 s (reduces DOM thrash)
  const ATTR     = "data-deadline";
  const BADGE_CLS = "deadline-badge";

  /* ─── Styles (self-contained) ──────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById("deadline-badge-styles")) return;
    const style = document.createElement("style");
    style.id = "deadline-badge-styles";
    style.textContent = `
      .${BADGE_CLS} {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.72rem;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 99px;
        white-space: nowrap;
        line-height: 1.6;
        transition: background 0.3s, color 0.3s;
      }
      .${BADGE_CLS}[data-urgency="normal"] {
        background: rgba(59,130,246,0.12);
        color: #60a5fa;
        border: 1px solid rgba(59,130,246,0.25);
      }
      .${BADGE_CLS}[data-urgency="soon"] {
        background: rgba(245,158,11,0.12);
        color: #fbbf24;
        border: 1px solid rgba(245,158,11,0.3);
      }
      .${BADGE_CLS}[data-urgency="urgent"] {
        background: rgba(239,68,68,0.12);
        color: #f87171;
        border: 1px solid rgba(239,68,68,0.3);
        animation: deadline-pulse 1.6s ease-in-out infinite;
      }
      .${BADGE_CLS}[data-urgency="overdue"] {
        background: rgba(239,68,68,0.18);
        color: #ef4444;
        border: 1px solid rgba(239,68,68,0.4);
        font-weight: 700;
      }
      @keyframes deadline-pulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.55; }
      }
      @media (prefers-reduced-motion: reduce) {
        .${BADGE_CLS}[data-urgency="urgent"] { animation: none; }
      }
    `;
    document.head.appendChild(style);
  }

  /* ─── Helpers ──────────────────────────────────────────────────────────── */

  /**
   * Formats the time remaining into a human-readable string and returns
   * the urgency level for styling.
   * @param {number} msLeft  milliseconds until deadline (negative = overdue)
   * @returns {{ text: string, urgency: "normal"|"soon"|"urgent"|"overdue" }}
   */
  function formatCountdown(msLeft) {
    if (msLeft < 0) {
      const daysOver = Math.floor(-msLeft / (1000 * 60 * 60 * 24));
      return {
        text: daysOver > 0 ? `⏰ Overdue ${daysOver}d` : "⏰ Overdue",
        urgency: "overdue"
      };
    }

    const totalMins  = Math.floor(msLeft / (1000 * 60));
    const totalHours = Math.floor(msLeft / (1000 * 60 * 60));
    const totalDays  = Math.floor(msLeft / (1000 * 60 * 60 * 24));

    if (totalMins <= 60) {
      const mins = totalMins;
      const secs = Math.floor((msLeft % (1000 * 60)) / 1000);
      return { text: `⚡ ${mins}m ${secs}s`, urgency: "urgent" };
    }
    if (totalHours <= 24) {
      const hrs  = totalHours;
      const mins = totalMins % 60;
      return { text: `⏳ ${hrs}h ${mins}m`, urgency: "soon" };
    }
    const days = totalDays;
    const hrs  = totalHours % 24;
    return { text: `📅 ${days}d ${hrs}h`, urgency: "normal" };
  }

  /* ─── Core ─────────────────────────────────────────────────────────────── */

  /**
   * Scans all visible task elements that carry a [data-deadline] attribute
   * and updates (or creates) their countdown badge.
   */
  function refresh() {
    const now = Date.now();
    // Support both task list items and task cards
    document.querySelectorAll(`[${ATTR}]`).forEach(function (el) {
      const deadlineStr = el.getAttribute(ATTR);
      if (!deadlineStr) return;

      const deadline = new Date(deadlineStr);
      if (isNaN(deadline.getTime())) return;

      // Find or create the badge container within this task element
      let badge = el.querySelector("." + BADGE_CLS);
      if (!badge) {
        badge = document.createElement("span");
        badge.className = BADGE_CLS;
        badge.setAttribute("aria-label", "Time remaining until deadline");

        // Prefer appending to a designated slot; fall back to the element itself
        const slot = el.querySelector(".task-deadline-slot") || el;
        slot.appendChild(badge);
      }

      const msLeft = deadline.getTime() - now;
      const { text, urgency } = formatCountdown(msLeft);
      badge.textContent = text;
      badge.setAttribute("data-urgency", urgency);
      badge.setAttribute("title", `Deadline: ${deadline.toLocaleString()}`);
    });
  }

  /* ─── Ticker ───────────────────────────────────────────────────────────── */
  let _tickerHandle = null;

  function startTicker() {
    if (_tickerHandle) return; // already running
    refresh();                 // immediate first pass
    _tickerHandle = setInterval(refresh, TICK_MS);
  }

  function stopTicker() {
    if (_tickerHandle) { clearInterval(_tickerHandle); _tickerHandle = null; }
  }

  /* ─── Boot ─────────────────────────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", function () {
    injectStyles();
    startTicker();

    // Re-scan whenever the task list is mutated (covers renderTasks() calls)
    const taskList = document.getElementById("taskList");
    if (taskList && window.MutationObserver) {
      const obs = new MutationObserver(refresh);
      obs.observe(taskList, { childList: true, subtree: false });
    }
  });

  /* ─── Public API ───────────────────────────────────────────────────────── */
  global.DeadlineCountdown = { refresh, startTicker, stopTicker };

})(window);
