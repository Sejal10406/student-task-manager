/**
 * export-pdf.js — Enhanced PDF Export with Category Filter for TaskQuest
 *
 * Extends the existing CSV export with a rich PDF report that includes:
 *  - Cover section with user stats (XP, streak, completion rate)
 *  - Category-filtered task tables
 *  - Priority breakdown per category
 *  - Overdue task highlighting
 *  - Page numbers and timestamp footer
 *
 * Uses jsPDF (already loaded via CDN in index.html as `window.jspdf.jsPDF`).
 *
 * @module export-pdf
 */

(function (global) {
  "use strict";

  /* ─── Config ───────────────────────────────────────────────────────────── */
  const PAGE_MARGIN  = 14;   // mm from edges
  const COL_WIDTHS   = [90, 30, 30, 30]; // mm: task | priority | deadline | status
  const ROW_HEIGHT   = 7;    // mm per data row
  const HEADER_H     = 9;    // mm for table header row

  /* ─── Colours ──────────────────────────────────────────────────────────── */
  const COLOURS = {
    primary:   [99,  102, 241], // indigo-500
    high:      [239, 68,  68],  // red-500
    medium:    [245, 158, 11],  // amber-500
    low:       [34,  197, 94],  // green-500
    completed: [16,  185, 129], // emerald-500
    overdue:   [220, 38,  38],  // red-600
    rowAlt:    [245, 245, 250], // light grey for alternating rows
    headerBg:  [30,  27,  75],  // deep indigo
  };

  /* ─── Helpers ──────────────────────────────────────────────────────────── */

  function _getTasks() {
    try {
      if (global.TaskQuestStorage && typeof global.TaskQuestStorage.getTasks === "function") {
        return global.TaskQuestStorage.getTasks() || [];
      }
      return JSON.parse(localStorage.getItem("quests") || "[]");
    } catch (_) { return []; }
  }

  function _getUserStats() {
    const xp     = parseInt(localStorage.getItem("xp")     || "0", 10);
    const streak = parseInt(localStorage.getItem("streak") || "0", 10);
    const coins  = parseInt(localStorage.getItem("coins")  || "0", 10);
    const name   = (() => {
      try { return JSON.parse(localStorage.getItem("quests_profile") || "{}").name || "Student"; } catch (_) { return "Student"; }
    })();
    return { xp, streak, coins, name };
  }

  function _formatDeadline(dl) {
    if (!dl) return "—";
    const d = new Date(dl);
    return isNaN(d) ? "—" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function _isOverdue(task) {
    if (task.completed || !task.deadline) return false;
    return new Date(task.deadline) < new Date();
  }

  function _truncate(str, maxLen) {
    return String(str || "").length > maxLen ? String(str).slice(0, maxLen - 1) + "…" : String(str || "");
  }

  /* ─── PDF builder ──────────────────────────────────────────────────────── */

  /**
   * Generates and downloads a PDF report of the user's tasks.
   *
   * @param {{ category?: string, status?: "all"|"pending"|"completed" }} [opts]
   *   category  — filter to a single category (case-insensitive), or "all"
   *   status    — filter by completion status
   */
  function exportPDF(opts) {
    const jsPDF = global.jspdf?.jsPDF || global.jsPDF;
    if (!jsPDF) {
      if (typeof global.showToast === "function") {
        global.showToast("PDF library not loaded. Please refresh and try again.", "error");
      }
      console.error("[ExportPDF] jsPDF is not available on window.jspdf.jsPDF or window.jsPDF");
      return;
    }

    opts = opts || {};
    const filterCategory = (opts.category || "all").toLowerCase();
    const filterStatus   = opts.status || "all";

    const allTasks = _getTasks();
    const stats    = _getUserStats();
    const now      = new Date();

    // Apply filters
    let tasks = allTasks.filter(function (t) {
      const catMatch = filterCategory === "all" || (t.category || "General").toLowerCase() === filterCategory;
      const statusMatch = filterStatus === "all" ||
        (filterStatus === "completed" && t.completed) ||
        (filterStatus === "pending"   && !t.completed);
      return catMatch && statusMatch;
    });

    const completed = tasks.filter(function (t) { return t.completed; }).length;
    const pending   = tasks.filter(function (t) { return !t.completed; }).length;
    const overdue   = tasks.filter(function (t) { return _isOverdue(t); }).length;
    const pct       = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

    // Group tasks by category for sectioned output
    const grouped = {};
    tasks.forEach(function (t) {
      const cat = t.category || "General";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(t);
    });

    /* ── Initialise PDF ── */
    const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pw   = doc.internal.pageSize.getWidth();
    let y      = PAGE_MARGIN;
    let pageNo = 1;

    function addPage() {
      doc.addPage();
      pageNo++;
      y = PAGE_MARGIN;
      _drawFooter(doc, pw, pageNo, now);
    }

    function ensureSpace(needed) {
      const maxY = doc.internal.pageSize.getHeight() - 22;
      if (y + needed > maxY) addPage();
    }

    /* ── Cover section ── */
    doc.setFillColor(...COLOURS.headerBg);
    doc.rect(0, 0, pw, 48, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("TaskQuest — Task Report", pw / 2, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Student: ${stats.name}`, pw / 2, 29, { align: "center" });
    doc.text(`Generated: ${now.toLocaleString()}`, pw / 2, 35, { align: "center" });

    // Stats bar
    const statLabels = [
      `XP: ${stats.xp}`,
      `Streak: ${stats.streak} 🔥`,
      `Completion: ${pct}%`,
      `Overdue: ${overdue}`
    ];
    doc.setFontSize(9);
    statLabels.forEach(function (label, i) {
      doc.text(label, PAGE_MARGIN + i * (pw - 2 * PAGE_MARGIN) / 4, 43, { baseline: "middle" });
    });

    y = 56;
    doc.setTextColor(0, 0, 0);

    /* ── Summary row ── */
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", PAGE_MARGIN, y); y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Total: ${tasks.length}  |  Completed: ${completed}  |  Pending: ${pending}  |  Overdue: ${overdue}`, PAGE_MARGIN, y);
    y += 10;

    /* ── Category sections ── */
    const categories = Object.keys(grouped).sort();

    categories.forEach(function (cat) {
      const catTasks = grouped[cat];

      ensureSpace(HEADER_H + ROW_HEIGHT + 8);

      // Category heading
      doc.setFillColor(...COLOURS.primary);
      doc.roundedRect(PAGE_MARGIN, y, pw - 2 * PAGE_MARGIN, 7, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(cat + ` (${catTasks.length})`, PAGE_MARGIN + 4, y + 5);
      y += 10;

      // Table header
      doc.setFillColor(...COLOURS.headerBg);
      doc.rect(PAGE_MARGIN, y, pw - 2 * PAGE_MARGIN, HEADER_H, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      const headers = ["Task", "Priority", "Deadline", "Status"];
      let cx = PAGE_MARGIN + 2;
      headers.forEach(function (h, i) {
        doc.text(h, cx, y + HEADER_H / 2 + 1.5, { baseline: "middle" });
        cx += COL_WIDTHS[i];
      });
      y += HEADER_H;

      // Data rows
      catTasks.forEach(function (task, ri) {
        ensureSpace(ROW_HEIGHT + 2);

        const isOdd    = ri % 2 === 0;
        const isOver   = _isOverdue(task);
        const rowColor = isOver ? [255, 235, 235] : isOdd ? [255, 255, 255] : COLOURS.rowAlt;

        doc.setFillColor(...rowColor);
        doc.rect(PAGE_MARGIN, y, pw - 2 * PAGE_MARGIN, ROW_HEIGHT, "F");

        // Priority colour dot
        const priColor = task.priority === "High" ? COLOURS.high
          : task.priority === "Medium" ? COLOURS.medium : COLOURS.low;

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");

        cx = PAGE_MARGIN + 2;

        // Task title
        const label = _truncate(task.text || task.title || "Untitled", 52);
        doc.text(label, cx, y + ROW_HEIGHT / 2, { baseline: "middle" });
        cx += COL_WIDTHS[0];

        // Priority
        doc.setFillColor(...priColor);
        doc.roundedRect(cx, y + 1.5, 24, 4, 1, 1, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.text(task.priority || "Low", cx + 12, y + ROW_HEIGHT / 2, { baseline: "middle", align: "center" });
        cx += COL_WIDTHS[1];

        // Deadline
        doc.setTextColor(isOver ? 220 : 0, isOver ? 38 : 0, isOver ? 38 : 0);
        doc.setFontSize(8);
        doc.setFont("helvetica", isOver ? "bold" : "normal");
        doc.text(_formatDeadline(task.deadline), cx, y + ROW_HEIGHT / 2, { baseline: "middle" });
        cx += COL_WIDTHS[2];

        // Status
        const statusText = task.completed ? "✓ Done" : isOver ? "Overdue" : "Pending";
        const statusColor = task.completed ? COLOURS.completed : isOver ? COLOURS.overdue : [100, 100, 100];
        doc.setTextColor(...statusColor);
        doc.setFontSize(8);
        doc.text(statusText, cx, y + ROW_HEIGHT / 2, { baseline: "middle" });

        // Separator line
        doc.setDrawColor(220, 220, 230);
        doc.setLineWidth(0.1);
        doc.line(PAGE_MARGIN, y + ROW_HEIGHT, PAGE_MARGIN + pw - 2 * PAGE_MARGIN, y + ROW_HEIGHT);

        y += ROW_HEIGHT;
      });

      y += 6; // gap between sections
    });

    if (tasks.length === 0) {
      doc.setFontSize(11);
      doc.setTextColor(150, 150, 150);
      doc.text("No tasks match the selected filter.", pw / 2, y + 20, { align: "center" });
    }

    _drawFooter(doc, pw, pageNo, now);

    /* ── Download ── */
    const slug = filterCategory === "all" ? "all-tasks" : filterCategory.replace(/\s+/g, "-");
    doc.save(`taskquest-report-${slug}-${now.toISOString().slice(0, 10)}.pdf`);

    if (typeof global.showToast === "function") {
      global.showToast("PDF report downloaded!", "success");
    }
  }

  function _drawFooter(doc, pw, pageNo, date) {
    const ph = doc.internal.pageSize.getHeight();
    doc.setDrawColor(200, 200, 210);
    doc.setLineWidth(0.2);
    doc.line(PAGE_MARGIN, ph - 14, pw - PAGE_MARGIN, ph - 14);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text("TaskQuest — Generated by student-task-manager", PAGE_MARGIN, ph - 9);
    doc.text(`Page ${pageNo}  |  ${date.toLocaleDateString()}`, pw - PAGE_MARGIN, ph - 9, { align: "right" });
  }

  /* ─── Public API ───────────────────────────────────────────────────────── */
  global.ExportPDF = { exportPDF };

})(window);
