// prioritization.js — Adaptive Task Prioritization Engine
// Loaded BEFORE script.js via <script> tag in index.html

(function (global) {
  "use strict";

  /**
   * Calculates a numeric urgency score for a task.
   * Higher = needs more attention.
   */
  function calculatePriorityScore(task) {
    if (task.completed) return -1;

    var score = 0;

    // 1. Deadline proximity (0–60 pts)
    if (task.deadline) {
      var now = new Date();
      var due = new Date(task.deadline);
      var hoursLeft = (due - now) / (1000 * 60 * 60);

      if (hoursLeft < 0)         score += 60; // overdue
      else if (hoursLeft < 24)   score += 50; // due today
      else if (hoursLeft < 48)   score += 40; // due tomorrow
      else if (hoursLeft < 72)   score += 30; // due in 3 days
      else if (hoursLeft < 168)  score += 15; // due this week
      else                       score += 5;
    }

    // 2. User-set priority level (0–30 pts)
    var pri = (task.priority || "Medium").toLowerCase();
    if (pri === "high")        score += 30;
    else if (pri === "medium") score += 15;
    else                       score += 5;

    return score;
  }

  /**
   * Returns tasks sorted by priority score descending.
   * Completed tasks always go to the bottom.
   */
  function getSortedTasksByPriority(tasks) {
    return tasks.slice().sort(function (a, b) {
      return calculatePriorityScore(b) - calculatePriorityScore(a);
    });
  }

  /**
   * Returns urgency label + CSS level string for a task.
   */
  function getUrgencyInfo(task) {
    if (task.completed) {
      return { label: "✅ Done", level: "done", color: "#10b981" };
    }
    var score = calculatePriorityScore(task);
    if (score >= 60) return { label: "🔴 Overdue",      level: "critical", color: "#ef4444" };
    if (score >= 50) return { label: "🟠 Due Today",    level: "urgent",   color: "#f97316" };
    if (score >= 40) return { label: "🟡 Due Tomorrow", level: "high",     color: "#f59e0b" };
    if (score >= 30) return { label: "🔵 This Week",    level: "medium",   color: "#06b6d4" };
    return              { label: "🟢 On Track",         level: "low",      color: "#10b981" };
  }

  /**
   * Generates 1–3 smart productivity suggestions based on task list.
   */
  function getProductivitySuggestions(tasks) {
    var suggestions = [];
    var active  = tasks.filter(function (t) { return !t.completed; });
    var now     = new Date();

    var overdue = active.filter(function (t) {
      return t.deadline && new Date(t.deadline) < now;
    });
    var dueToday = active.filter(function (t) {
      if (!t.deadline) return false;
      var h = (new Date(t.deadline) - now) / (1000 * 60 * 60);
      return h >= 0 && h < 24;
    });
    var highPending = active.filter(function (t) {
      return (t.priority || "").toLowerCase() === "high";
    });

    if (overdue.length > 0) {
      suggestions.push(
        "⚠️ " + overdue.length + " task" + (overdue.length > 1 ? "s are" : " is") +
        " overdue — tackle " + (overdue.length > 1 ? "these" : "this") + " first!"
      );
    }
    if (dueToday.length > 0) {
      suggestions.push(
        "📅 " + dueToday.length + " task" + (dueToday.length > 1 ? "s" : "") +
        " due today — don't let " + (dueToday.length > 1 ? "them" : "it") + " slip!"
      );
    }
    if (highPending.length > 0 && overdue.length === 0 && dueToday.length === 0) {
      suggestions.push(
        "🎯 " + highPending.length + " high-priority task" +
        (highPending.length > 1 ? "s" : "") + " pending — focus here next."
      );
    }
    if (active.length === 0) {
      suggestions.push("🎉 All tasks complete — you're crushing it!");
    }
    if (suggestions.length === 0) {
      suggestions.push("✅ You're on track! Keep the momentum going.");
    }

    return suggestions;
  }

  // Expose on window
  global.Prioritization = {
    calculatePriorityScore: calculatePriorityScore,
    getSortedTasksByPriority: getSortedTasksByPriority,
    getUrgencyInfo: getUrgencyInfo,
    getProductivitySuggestions: getProductivitySuggestions
  };

})(window);