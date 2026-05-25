/**
 * TaskQuest Analytics Hub — charts, heatmap, exports.
 */
(function () {
  "use strict";

  const QUESTS_KEY = "quests";
  const TASKS_KEY = "tasks";
  const STREAK_KEY = "streak";
  const HEATMAP_WEEKS = 15;
  const CATEGORIES = ["Theory", "Practical", "Assignment", "Revision", "General"];

  let studyChart = null;
  let categoryChart = null;
  let trendChart = null;
  let studyMode = "weekly";
  let trendMode = "weekly";

  function parseQuestDate(quest, field) {
    const v = quest[field];
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function parseTimestampString(ts) {
    if (!ts || typeof ts !== "string") return null;
    const m = ts.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
    if (!m) return null;
    const d = new Date(`${m[2]} ${m[1]}, ${m[3]}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function normalizeQuest(raw) {
    const q = { ...raw };
    q.text = (q.text || q.title || "").trim();
    q.title = q.title || q.text;
    q.category = q.category || "General";
    q.completed = Boolean(q.completed);
    q.createdAt =
      parseQuestDate(q, "createdAt")?.toISOString() ||
      parseTimestampString(q.timestamp)?.toISOString() ||
      new Date().toISOString();
    if (q.completed) {
      q.completedAt =
        parseQuestDate(q, "completedAt")?.toISOString() ||
        q.createdAt;
    } else {
      q.completedAt = null;
    }
    return q;
  }

  function loadQuests() {
    let list = [];
    try {
      const questsRaw = localStorage.getItem(QUESTS_KEY);
      if (questsRaw) {
        const parsed = JSON.parse(questsRaw);
        if (Array.isArray(parsed)) list = parsed;
      }
    } catch (e) {
      list = [];
    }
    if (list.length === 0) {
      try {
        const tasksRaw = localStorage.getItem(TASKS_KEY);
        if (tasksRaw) {
          const parsed = JSON.parse(tasksRaw);
          if (Array.isArray(parsed)) list = parsed;
        }
      } catch (e) {
        list = [];
      }
    }
    return list.map(normalizeQuest);
  }

  function dateKey(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.toISOString().slice(0, 10);
  }

  function buildActivityMap(quests) {
    const map = {};
    quests.forEach((q) => {
      if (!q.completed) return;
      const d = parseQuestDate(q, "completedAt") || parseQuestDate(q, "createdAt");
      if (!d) return;
      const key = dateKey(d);
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }

  function activityLevel(count) {
    if (count <= 0) return 0;
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count === 3) return 3;
    return 4;
  }

  function calcStreak(quests) {
    const stored = parseInt(localStorage.getItem(STREAK_KEY), 10);
    if (!Number.isNaN(stored) && stored > 0) return stored;
    const days = new Set(
      quests
        .filter((q) => q.completed)
        .map((q) => dateKey(parseQuestDate(q, "completedAt") || new Date(q.createdAt)))
    );
    let streak = 0;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    while (days.has(dateKey(d))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  function startOfWeek(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - x.getDay());
    return x;
  }

  function getChartColors() {
    const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#a855f7";
    const secondary = getComputedStyle(document.documentElement).getPropertyValue("--secondary").trim() || "#06b6d4";
    const text = getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#e2e8f0";
    return { primary, secondary, text };
  }

  function destroyChart(chart) {
    if (chart) chart.destroy();
  }

  function setEmptyOverlay(canvasId, show, message) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const wrap = canvas.closest(".chart-wrapper") || canvas.parentElement;
    if (!wrap) return;
    let el = wrap.querySelector(".analytics-empty");
    if (show) {
      if (!el) {
        el = document.createElement("div");
        el.className = "analytics-empty";
        el.style.cssText =
          "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;color:var(--text-light,rgba(255,255,255,.6));font-size:.9rem;pointer-events:none;z-index:2;";
        wrap.style.position = "relative";
        wrap.appendChild(el);
      }
      el.textContent = message;
    } else if (el) {
      el.remove();
    }
  }

  function renderHeatmap(quests) {
    const container = document.getElementById("heatmapContainer");
    if (!container) return;
    const activity = buildActivityMap(quests);
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - (HEATMAP_WEEKS * 7 - 1));
    while (start.getDay() !== 0) start.setDate(start.getDate() - 1);

    container.innerHTML = "";
    if (quests.length === 0) {
      container.innerHTML =
        '<p style="padding:16px;opacity:.7;margin:0;">Complete quests to see your consistency heatmap.</p>';
      return;
    }

    let tooltip = document.getElementById("heatmapTooltip");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.id = "heatmapTooltip";
      tooltip.className = "heatmap-tooltip";
      tooltip.style.display = "none";
      document.body.appendChild(tooltip);
    }

    for (let w = 0; w < HEATMAP_WEEKS; w++) {
      const weekCol = document.createElement("div");
      weekCol.className = "heatmap-week";
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(start);
        cellDate.setDate(start.getDate() + w * 7 + d);
        if (cellDate > end) continue;
        const key = dateKey(cellDate);
        const count = activity[key] || 0;
        const cell = document.createElement("div");
        cell.className = `heatmap-day level-${activityLevel(count)}`;
        cell.setAttribute("role", "gridcell");
        cell.setAttribute(
          "aria-label",
          `${cellDate.toLocaleDateString()}: ${count} completion${count !== 1 ? "s" : ""}`
        );
        cell.addEventListener("mouseenter", (e) => {
          tooltip.style.display = "block";
          tooltip.textContent = `${cellDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} — ${count} completed`;
          tooltip.style.left = `${e.clientX + 12}px`;
          tooltip.style.top = `${e.clientY + 12}px`;
        });
        cell.addEventListener("mousemove", (e) => {
          tooltip.style.left = `${e.clientX + 12}px`;
          tooltip.style.top = `${e.clientY + 12}px`;
        });
        cell.addEventListener("mouseleave", () => {
          tooltip.style.display = "none";
        });
        weekCol.appendChild(cell);
      }
      if (weekCol.childNodes.length) container.appendChild(weekCol);
    }
  }

  function bucketByPeriod(quests, mode) {
    const completed = quests.filter((q) => q.completed);
    const labels = [];
    const values = [];
    const now = new Date();
    const periods = mode === "monthly" ? 6 : 7;

    for (let i = periods - 1; i >= 0; i--) {
      if (mode === "monthly") {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(d.toLocaleString("default", { month: "short" }));
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        values.push(
          completed.filter((q) => {
            const cd = parseQuestDate(q, "completedAt");
            return cd && `${cd.getFullYear()}-${String(cd.getMonth() + 1).padStart(2, "0")}` === ym;
          }).length
        );
      } else {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        labels.push(d.toLocaleString("default", { weekday: "short" }));
        const key = dateKey(d);
        values.push(
          completed.filter((q) => {
            const cd = parseQuestDate(q, "completedAt");
            return cd && dateKey(cd) === key;
          }).length
        );
      }
    }
    return { labels, values };
  }

  function renderStudyChart(quests) {
    const canvas = document.getElementById("studyHoursChart");
    if (!canvas || typeof Chart === "undefined") return;
    const { labels, values } = bucketByPeriod(quests, studyMode);
    const empty = quests.filter((q) => q.completed).length === 0;
    setEmptyOverlay("studyHoursChart", empty, "No completed quests yet. Finish tasks to see productivity.");
    destroyChart(studyChart);
    const colors = getChartColors();
    studyChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Completions",
            data: values,
            backgroundColor: colors.primary + "99",
            borderColor: colors.primary,
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      options: chartOptions(colors.text),
    });
  }

  function renderCategoryChart(quests) {
    const canvas = document.getElementById("categoryChart");
    if (!canvas || typeof Chart === "undefined") return;
    const completed = quests.filter((q) => q.completed);
    const empty = completed.length === 0;
    setEmptyOverlay("categoryChart", empty, "No category data yet. Complete quests by subject.");
    const counts = {};
    CATEGORIES.forEach((c) => (counts[c] = 0));
    completed.forEach((q) => {
      const cat = CATEGORIES.includes(q.category) ? q.category : "General";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const labels = Object.keys(counts).filter((k) => counts[k] > 0);
    const data = labels.map((k) => counts[k]);
    destroyChart(categoryChart);
    const colors = getChartColors();
    categoryChart = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: labels.length ? labels : ["No data"],
        datasets: [
          {
            data: labels.length ? data : [1],
            backgroundColor: ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899"].slice(0, labels.length || 1),
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: colors.text } } },
      },
    });
  }

  function renderTrendChart(quests) {
    const canvas = document.getElementById("completionTrendChart");
    if (!canvas || typeof Chart === "undefined") return;
    const { labels, values } = bucketByPeriod(quests, trendMode);
    const empty = quests.filter((q) => q.completed).length === 0;
    setEmptyOverlay("completionTrendChart", empty, "Completion trend appears after you finish quests.");
    destroyChart(trendChart);
    const colors = getChartColors();
    trendChart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Completed",
            data: values,
            borderColor: colors.secondary,
            backgroundColor: colors.secondary + "33",
            fill: true,
            tension: 0.35,
          },
        ],
      },
      options: chartOptions(colors.text),
    });
  }

  function chartOptions(textColor) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: textColor }, grid: { color: "rgba(255,255,255,0.06)" } },
        y: { beginAtZero: true, ticks: { color: textColor, stepSize: 1 }, grid: { color: "rgba(255,255,255,0.06)" } },
      },
    };
  }

  function renderSubjectProgress(quests) {
    const list = document.getElementById("subjectProgressList");
    if (!list) return;
    if (quests.length === 0) {
      list.innerHTML = '<p class="muted" style="padding:12px;">No quests yet. Add tasks to track mastery by category.</p>';
      return;
    }
    const totals = {};
    const done = {};
    CATEGORIES.forEach((c) => {
      totals[c] = 0;
      done[c] = 0;
    });
    quests.forEach((q) => {
      const cat = CATEGORIES.includes(q.category) ? q.category : "General";
      totals[cat]++;
      if (q.completed) done[cat]++;
    });
    list.innerHTML = CATEGORIES.filter((c) => totals[c] > 0)
      .map((cat) => {
        const pct = Math.round((done[cat] / totals[cat]) * 100);
        return `<div class="subject-progress-item">
          <div class="subject-progress-header"><span>${cat}</span><span>${done[cat]}/${totals[cat]} (${pct}%)</span></div>
          <div class="subject-progress-bar"><div class="subject-progress-fill" style="width:${pct}%"></div></div>
        </div>`;
      })
      .join("");
    if (!list.innerHTML) {
      list.innerHTML = '<p class="muted" style="padding:12px;">No categorized quests yet.</p>';
    }
  }

  function updateStatCards(quests) {
    const completed = quests.filter((q) => q.completed);
    const pending = quests.length - completed.length;
    const rate = quests.length ? Math.round((completed.length / quests.length) * 100) : 0;
    const streak = calcStreak(quests);
    const activity = buildActivityMap(quests);
    const todayKey = dateKey(new Date());
    const todayCount = activity[todayKey] || 0;
    const dailyScore = todayCount * 25 + completed.length * 5;
    const allCounts = Object.values(activity);
    const dailyHigh = allCounts.length ? Math.max(...allCounts) : 0;
    let bestDay = "—";
    let bestCount = 0;
    Object.entries(activity).forEach(([k, v]) => {
      if (v > bestCount) {
        bestCount = v;
        bestDay = new Date(k + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      }
    });

    const weekStart = startOfWeek(new Date());
    const weekCompleted = completed.filter((q) => {
      const d = parseQuestDate(q, "completedAt");
      return d && d >= weekStart;
    }).length;
    const weekPending = quests.filter((q) => {
      if (q.completed) return false;
      const d = parseQuestDate(q, "createdAt");
      return d && d >= weekStart;
    }).length;
    const weekDays = Math.max(1, Math.min(7, Math.floor((Date.now() - weekStart) / 86400000) + 1));
    const weekRate = quests.length ? Math.round((weekCompleted / Math.max(1, weekCompleted + weekPending)) * 100) : 0;

    setText("analyticsCompletedQuests", completed.length);
    setText("analyticsPendingTasks", pending);
    setText("analyticsStreak", `${streak} day${streak !== 1 ? "s" : ""}`);
    setText("analyticsCompletionRate", `${rate}%`);
    setText("analyticsDailyScore", dailyScore);
    setText("analyticsDailyHighScore", dailyHigh);
    setText("analyticsBestProductiveDay", bestDay);
    setText("analyticsBestStudyRecord", `${dailyHigh * 25} min`);
    setText("weeklyCompletedTasks", weekCompleted);
    setText("weeklyPendingTasks", weekPending);
    setText("weeklyAvgTasks", (weekCompleted / weekDays).toFixed(1));
    setText("weeklyCompletionRate", `${weekRate}%`);
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function refreshAnalytics() {
    const quests = loadQuests();
    updateStatCards(quests);
    renderHeatmap(quests);
    renderStudyChart(quests);
    renderCategoryChart(quests);
    renderTrendChart(quests);
    renderSubjectProgress(quests);
  }

  function exportFilename(ext) {
    const d = new Date().toISOString().slice(0, 10);
    return `taskquest-analytics-${d}.${ext}`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    const quests = loadQuests();
    const payload = {
      exportedAt: new Date().toISOString(),
      quests,
      streak: calcStreak(quests),
      activity: buildActivityMap(quests),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    downloadBlob(blob, exportFilename("json"));
    if (typeof window.showToast === "function") window.showToast("JSON export downloaded.", "success");
  }

  function exportCsv() {
    const quests = loadQuests();
    if (!quests.length) {
      if (typeof window.showToast === "function") window.showToast("No quests to export.", "warning");
      return;
    }
    const header = ["id", "title", "category", "priority", "completed", "createdAt", "completedAt"];
    const rows = quests.map((q) =>
      [
        q.id,
        `"${String(q.title || q.text).replace(/"/g, '""')}"`,
        q.category || "",
        q.priority || "",
        q.completed ? "yes" : "no",
        q.createdAt || "",
        q.completedAt || "",
      ].join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), exportFilename("csv"));
    if (typeof window.showToast === "function") window.showToast("CSV export downloaded.", "success");
  }

  function getChartCanvases() {
    return ["studyHoursChart", "categoryChart", "completionTrendChart"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);
  }

  function exportPng() {
    const canvases = getChartCanvases();
    if (!canvases.length) {
      if (typeof window.showToast === "function") window.showToast("No charts available.", "warning");
      return;
    }
    canvases.forEach((canvas, i) => {
      try {
        const link = document.createElement("a");
        link.download = exportFilename("png").replace(".png", `-${i + 1}.png`);
        link.href = canvas.toDataURL("image/png");
        link.click();
      } catch (e) {
        console.warn("PNG export failed", e);
      }
    });
    if (typeof window.showToast === "function") window.showToast("Chart PNG(s) downloaded.", "success");
  }

  function exportPdf() {
    const quests = loadQuests();
    const jspdf = window.jspdf;
    if (!jspdf || !jspdf.jsPDF) {
      if (typeof window.showToast === "function") window.showToast("PDF library not loaded.", "error");
      return;
    }
    const doc = new jspdf.jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const completed = quests.filter((q) => q.completed).length;
    doc.setFontSize(16);
    doc.text("TaskQuest Analytics Report", 40, 50);
    doc.setFontSize(11);
    doc.text(`Exported: ${new Date().toLocaleString()}`, 40, 70);
    doc.text(`Total quests: ${quests.length}`, 40, 90);
    doc.text(`Completed: ${completed}`, 40, 105);
    doc.text(`Pending: ${quests.length - completed}`, 40, 120);
    doc.text(`Streak: ${calcStreak(quests)} days`, 40, 135);

    let y = 160;
    const canvases = getChartCanvases();
    canvases.forEach((canvas) => {
      try {
        const img = canvas.toDataURL("image/png");
        const w = 500;
        const h = (canvas.height / canvas.width) * w;
        if (y + h > 750) {
          doc.addPage();
          y = 40;
        }
        doc.addImage(img, "PNG", 40, y, w, Math.min(h, 200));
        y += Math.min(h, 200) + 20;
      } catch (e) {
        /* skip chart */
      }
    });

    if (quests.length === 0) {
      doc.text("No quest data — add and complete tasks to populate analytics.", 40, y);
    }

    doc.save(exportFilename("pdf"));
    if (typeof window.showToast === "function") window.showToast("PDF report downloaded.", "success");
  }

  function initExportMenu() {
    const exportBtn = document.getElementById("exportBtn");
    const menu = document.getElementById("exportMenu");
    if (exportBtn && menu) {
      exportBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.style.display = menu.style.display === "none" ? "block" : "none";
      });
      document.addEventListener("click", () => {
        menu.style.display = "none";
      });
      menu.addEventListener("click", (e) => e.stopPropagation());
    }
    document.getElementById("exportJsonBtn")?.addEventListener("click", exportJson);
    document.getElementById("exportCsvBtn")?.addEventListener("click", exportCsv);
    document.getElementById("exportPngBtn")?.addEventListener("click", exportPng);
    document.getElementById("exportPdfBtn")?.addEventListener("click", exportPdf);
  }

  function initChartToggles() {
    document.getElementById("btnWeeklyStudy")?.addEventListener("click", () => {
      studyMode = "weekly";
      document.getElementById("btnWeeklyStudy")?.classList.add("active");
      document.getElementById("btnMonthlyStudy")?.classList.remove("active");
      renderStudyChart(loadQuests());
    });
    document.getElementById("btnMonthlyStudy")?.addEventListener("click", () => {
      studyMode = "monthly";
      document.getElementById("btnMonthlyStudy")?.classList.add("active");
      document.getElementById("btnWeeklyStudy")?.classList.remove("active");
      renderStudyChart(loadQuests());
    });
    document.getElementById("btnWeeklyTrend")?.addEventListener("click", () => {
      trendMode = "weekly";
      document.getElementById("btnWeeklyTrend")?.classList.add("active");
      document.getElementById("btnMonthlyTrend")?.classList.remove("active");
      renderTrendChart(loadQuests());
    });
    document.getElementById("btnMonthlyTrend")?.addEventListener("click", () => {
      trendMode = "monthly";
      document.getElementById("btnMonthlyTrend")?.classList.add("active");
      document.getElementById("btnWeeklyTrend")?.classList.remove("active");
      renderTrendChart(loadQuests());
    });
  }

  function initTabRefresh() {
    document.querySelectorAll('[data-tab="analytics"],#tabBtnAnalytics,#dockBtnAnalytics').forEach((el) => {
      el.addEventListener("click", () => setTimeout(refreshAnalytics, 50));
    });
    window.addEventListener("storage", (e) => {
      if (e.key === QUESTS_KEY || e.key === TASKS_KEY || e.key === STREAK_KEY) refreshAnalytics();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initExportMenu();
    initChartToggles();
    initTabRefresh();
    refreshAnalytics();
  });

  window.refreshAnalytics = refreshAnalytics;
  window.loadQuests = loadQuests;
})();
