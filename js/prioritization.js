/**
 * @fileoverview TaskQuest Client Library and utilities.
 * @author Senior Open-Source Contributor
 * @version 2.0.0
 */

// prioritization.js — Adaptive Task Prioritization Engine
// Loaded BEFORE script.js via <script> tag in index.html

(function (global) {
  "use strict";

  /**
   * Calculates a numeric urgency score for a task.
   * Higher = needs more attention.
   *
   * Scoring breakdown:
   *   - Deadline proximity  : 0–60 pts
   *   - User priority level : 0–30 pts
   *   - Task category weight: 0–10 pts  (Exam/Assignment ranked higher)
   *   - Task age penalty    : 0–5 pts   (older pending tasks surface higher)
   *
   * @param {Object} task - Task with deadline, priority, category, createdAt
   * @returns {number} urgency score; -1 for completed tasks
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

    // 3. Category weight (0–10 pts)
    // Academic categories with higher real-world stakes are scored higher.
    var CATEGORY_WEIGHTS = {
      "exam":       10,
      "assignment": 8,
      "practical":  6,
      "revision":   5,
      "theory":     4,
      "general":    2
    };
    var cat = (task.category || "General").toLowerCase();
    score += CATEGORY_WEIGHTS[cat] !== undefined ? CATEGORY_WEIGHTS[cat] : 2;

    // 4. Task age penalty (0–5 pts)
    // Prevents old pending tasks from being permanently buried.
    // Score increases by 1 pt per 2 days the task remains incomplete (capped at 5).
    if (task.createdAt) {
      var created = new Date(task.createdAt);
      var ageInDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
      if (!isNaN(ageInDays) && ageInDays > 2) {
        score += Math.min(5, Math.floor(ageInDays / 2));
      }
    }

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
      return { label: "✅ Done", level: "done", color: "#059669" };
    }
    var score = calculatePriorityScore(task);
    if (score >= 60) return { label: "🔴 Overdue",      level: "critical", color: "#dc2626" };
    if (score >= 50) return { label: "🟠 Due Today",    level: "urgent",   color: "#ea580c" };
    if (score >= 40) return { label: "🟡 Due Tomorrow", level: "high",     color: "#d97706" };
    if (score >= 30) return { label: "🔵 This Week",    level: "medium",   color: "#0891b2" };
    return              { label: "🟢 On Track",         level: "low",      color: "#059669" };
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

  /**
   * Categorizes a task according to the Eisenhower Matrix.
   */
  function getEisenhowerQuadrant(task) {
    if (task.completed) return { name: "Completed", class: "completed", code: 0 };
    
    var isImportant = (task.priority || "Medium").toLowerCase() === "high";
    var isUrgent = false;
    
    if (task.deadline) {
      var now = new Date();
      var due = new Date(task.deadline);
      var hoursLeft = (due - now) / (1000 * 60 * 60);
      if (hoursLeft < 48) { // Urgent if due in less than 48 hours or overdue
        isUrgent = true;
      }
    }
    
    if (isImportant && isUrgent) {
      return { name: "Do First (Urgent & Important)", class: "do-first", code: 1 };
    } else if (isImportant && !isUrgent) {
      return { name: "Schedule (Important but Not Urgent)", class: "schedule", code: 2 };
    } else if (!isImportant && isUrgent) {
      return { name: "Delegate (Urgent but Not Important)", class: "delegate", code: 3 };
    } else {
      return { name: "Eliminate (Neither)", class: "eliminate", code: 4 };
    }
  }

  // Expose on window
  global.Prioritization = {
    calculatePriorityScore: calculatePriorityScore,
    getSortedTasksByPriority: getSortedTasksByPriority,
    getUrgencyInfo: getUrgencyInfo,
    getProductivitySuggestions: getProductivitySuggestions,
    getEisenhowerQuadrant: getEisenhowerQuadrant
  };

})(window);