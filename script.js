// Core Elements
const taskInput = document.getElementById("taskInput");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskList = document.getElementById("taskList");
const categorySelect = document.getElementById("categorySelect");

// Sidebar metrics elements
const totalTasks = document.getElementById("totalTasks");
const completedTasks = document.getElementById("completedTasks");
const points = document.getElementById("points");
const streakCount = document.getElementById("streakCount");
const xpFill = document.getElementById("xpFill");
const xpText = document.getElementById("xpText");

// Filters & Navigation
const filterBtns = document.querySelectorAll(".filter-btn");
const themeToggle = document.getElementById("themeToggle");
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

// Global states
let tasks = [];
let currentFilter = "All";
let coins = 0;
let streak = 0;
let xp = 120;
let currentStudyView = "weekly"; // "weekly" or "monthly"

// Chart.js instances
let studyChartInstance = null;
let categoryChartInstance = null;

// Analytics data structure
let analyticsData = {
  dailyStudyMinutes: {},       // e.g. { "2026-05-18": 45.5 }
  completedTasksPerDay: {},    // e.g. { "2026-05-18": 3 }
  categoryStats: {
    Theory: { created: 0, completed: 0 },
    Practical: { created: 0, completed: 0 },
    Assignment: { created: 0, completed: 0 },
    Revision: { created: 0, completed: 0 }
  },
  longestStreak: 0,
  currentStreak: 0,
  lastActiveDate: null
};

// ==========================================================================
// 1. DATA INITIALIZATION & LOCALSTORAGE MANAGEMENT
// ==========================================================================

function loadData() {
  // Load tasks
  const savedTasks = localStorage.getItem("quests");
  if (savedTasks) {
    try {
      tasks = JSON.parse(savedTasks);
    } catch (e) {
      tasks = [];
    }
  }

  // Load gamification points
  coins = parseInt(localStorage.getItem("coins")) || 0;
  streak = parseInt(localStorage.getItem("streak")) || 0;
  xp = parseInt(localStorage.getItem("xp")) || 120;

  // Load active theme
  const savedTheme = localStorage.getItem("theme") || "dark";
  if (savedTheme === "light") {
    document.body.classList.add("light");
  } else {
    document.body.classList.remove("light");
  }

  // Load analytics data
  const savedAnalytics = localStorage.getItem("quests_analytics");
  if (savedAnalytics) {
    try {
      analyticsData = JSON.parse(savedAnalytics);
    } catch (e) {
      initializeAnalyticsData();
    }
  } else {
    initializeAnalyticsData();
  }
}

function saveData() {
  localStorage.setItem("quests", JSON.stringify(tasks));
  localStorage.setItem("coins", coins);
  localStorage.setItem("streak", streak);
  localStorage.setItem("xp", xp);
  localStorage.setItem("quests_analytics", JSON.stringify(analyticsData));
}

// Generate beautiful visual mock data for past 15 days if empty
function initializeAnalyticsData() {
  analyticsData = {
    dailyStudyMinutes: {},
    completedTasksPerDay: {},
    categoryStats: {
      Theory: { created: 12, completed: 8 },
      Practical: { created: 8, completed: 6 },
      Assignment: { created: 15, completed: 11 },
      Revision: { created: 10, completed: 9 }
    },
    longestStreak: 8,
    currentStreak: 4,
    lastActiveDate: getFormattedDate(new Date())
  };

  // Seed study time and task completions for the last 15 days
  const today = new Date();
  for (let i = 15; i >= 0; i--) {
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - i);
    const dateStr = getFormattedDate(pastDate);
    
    // Random study minutes between 15 and 90 mins (some days 0)
    const activeDay = Math.random() > 0.15;
    analyticsData.dailyStudyMinutes[dateStr] = activeDay ? Math.round(15 + Math.random() * 75) : 0;
    
    // Random task completions between 1 and 4
    analyticsData.completedTasksPerDay[dateStr] = activeDay ? Math.round(1 + Math.random() * 3) : 0;
  }
  
  saveData();
}

function getFormattedDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Helper to check if theme is currently light
function isLightTheme() {
  return document.body.classList.contains("light");
}

// Safe browser notification sender
function sendNotification(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification(title, { body });
      }
    });
  }
}

// ==========================================================================
// 2. CORE TASK / QUESTS CONTROLLERS
// ==========================================================================

function addTask() {
  const text = taskInput.value.trim();
  const category = categorySelect.value;

  if (text === "") return;

  const task = {
    id: Date.now(),
    text,
    category,
    completed: false,
    createdAt: getFormattedDate(new Date())
  };

  tasks.push(task);
  taskInput.value = "";

  // Update analytics created count
  if (!analyticsData.categoryStats[category]) {
    analyticsData.categoryStats[category] = { created: 0, completed: 0 };
  }
  analyticsData.categoryStats[category].created += 1;

  saveData();
  renderTasks();
}

function renderTasks() {
  taskList.innerHTML = "";

  let filteredTasks = tasks;
  if (currentFilter !== "All") {
    filteredTasks = tasks.filter(task => task.category === currentFilter);
  }

  if (filteredTasks.length === 0) {
    taskList.innerHTML = `
      <div class="empty-state">
        <i class="ri-ghost-2-line"></i>
        <h3>No Tasks Yet</h3>
        <p>Add tasks and begin your productivity journey ✨</p>
      </div>
    `;
  }

  filteredTasks.forEach(task => {
    const div = document.createElement("div");
    div.classList.add("task");
    if (task.completed) {
      div.classList.add("completed");
    }

    div.innerHTML = `
      <div class="task-left">
        <div class="check-btn"></div>
        <div>
          <h3 class="task-title">${escapeHtml(task.text)}</h3>
          <p class="task-category">${getCategoryEmoji(task.category)} ${task.category}</p>
        </div>
      </div>
      <div class="task-actions">
        <button class="icon-btn edit-btn">
          <i class="ri-edit-line"></i>
        </button>
        <button class="icon-btn delete-btn">
          <i class="ri-delete-bin-6-line"></i>
        </button>
      </div>
    `;

    // Toggle Complete event
    div.querySelector(".check-btn").addEventListener("click", () => {
      task.completed = !task.completed;
      const todayStr = getFormattedDate(new Date());

      if (task.completed) {
        coins += 10;
        streak += 1;
        xp += 20;

        // Analytics Completed increment
        analyticsData.completedTasksPerDay[todayStr] = (analyticsData.completedTasksPerDay[todayStr] || 0) + 1;
        analyticsData.categoryStats[task.category].completed = (analyticsData.categoryStats[task.category].completed || 0) + 1;
        
        // Handle streak updates
        updateAnalyticsStreak(todayStr);
      } else {
        coins = Math.max(0, coins - 10);
        streak = Math.max(0, streak - 1);
        xp = Math.max(0, xp - 20);

        // Analytics Completed decrement
        if (analyticsData.completedTasksPerDay[todayStr]) {
          analyticsData.completedTasksPerDay[todayStr] = Math.max(0, analyticsData.completedTasksPerDay[todayStr] - 1);
        }
        analyticsData.categoryStats[task.category].completed = Math.max(0, analyticsData.categoryStats[task.category].completed - 1);
      }

      saveData();
      updateGamification();
      renderTasks();
    });

    // Delete task event
    div.querySelector(".delete-btn").addEventListener("click", () => {
      tasks = tasks.filter(t => t.id !== task.id);
      saveData();
      renderTasks();
    });

    // Edit task event
    div.querySelector(".edit-btn").addEventListener("click", () => {
      const updated = prompt("Edit your quest", task.text);
      if (updated !== null && updated.trim() !== "") {
        task.text = updated;
        saveData();
        renderTasks();
      }
    });

    taskList.appendChild(div);
  });

  updateStats();
}

function updateStats() {
  totalTasks.textContent = tasks.length;
  const completed = tasks.filter(task => task.completed).length;
  completedTasks.textContent = completed;
}

function updateGamification() {
  points.textContent = coins;
  streakCount.textContent = streak;
  xpText.textContent = `${xp} / 300 XP`;
  
  // XP cap/levelup indicator
  const fillPercentage = Math.min(100, (xp / 3));
  xpFill.style.width = `${fillPercentage}%`;
}

function updateAnalyticsStreak(todayStr) {
  if (analyticsData.lastActiveDate === todayStr) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getFormattedDate(yesterday);

  if (analyticsData.lastActiveDate === yesterdayStr) {
    analyticsData.currentStreak += 1;
  } else {
    analyticsData.currentStreak = 1;
  }

  if (analyticsData.currentStreak > analyticsData.longestStreak) {
    analyticsData.longestStreak = analyticsData.currentStreak;
  }

  analyticsData.lastActiveDate = todayStr;
}

// Helpers
function getCategoryEmoji(cat) {
  switch (cat) {
    case "Theory": return "📘";
    case "Practical": return "🧪";
    case "Assignment": return "📝";
    case "Revision": return "📖";
    default: return "✨";
  }
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// ==========================================================================
// 3. POMODORO TIMER & STUDY HOUR LOGGER
// ==========================================================================

let studyTime = 25 * 60;
let breakTime = 5 * 60;
let currentTime = studyTime;
let timer = null;
let isStudy = true;
let lastTimerTickTimestamp = null;

function updateDisplay() {
  const minutes = Math.floor(currentTime / 60);
  const seconds = currentTime % 60;
  document.getElementById("timer").innerText = `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function startTimer() {
  if (timer) return;
  
  lastTimerTickTimestamp = Date.now();
  
  timer = setInterval(() => {
    const now = Date.now();
    const elapsedSeconds = Math.round((now - lastTimerTickTimestamp) / 1000);
    
    if (elapsedSeconds <= 0) return; // Prevent double trigger
    
    lastTimerTickTimestamp = now;
    currentTime = Math.max(0, currentTime - elapsedSeconds);
    
    // Accumulate study minutes
    if (isStudy) {
      const todayStr = getFormattedDate(new Date());
      const fractionalMinutes = elapsedSeconds / 60;
      analyticsData.dailyStudyMinutes[todayStr] = (analyticsData.dailyStudyMinutes[todayStr] || 0) + fractionalMinutes;
      saveData();
    }

    updateDisplay();

    if (currentTime <= 0) {
      clearInterval(timer);
      timer = null;

      if (isStudy) {
        sendNotification("Session Complete!", "Study session complete! Take a well-deserved break ☕");
        alert("Study session complete! Take a break.");

        isStudy = false;
        currentTime = breakTime;
        document.getElementById("mode").innerText = "Break Time";
        document.getElementById("mode").style.color = "#22c55e";
      } else {
        sendNotification("Break Over!", "Break over! Time to focus back on your tasks ⚔️");
        alert("Break over! Back to study.");

        isStudy = true;
        currentTime = studyTime;
        document.getElementById("mode").innerText = "Study Time";
        document.getElementById("mode").style.color = "var(--primary)";
      }

      updateDisplay();
      startTimer();
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timer);
  timer = null;
}

function resetTimer() {
  clearInterval(timer);
  timer = null;
  isStudy = true;
  currentTime = studyTime;
  document.getElementById("mode").innerText = "Study Time";
  document.getElementById("mode").style.color = "var(--text)";
  updateDisplay();
}

// ==========================================================================
// 4. TAB & NAVIGATION ROUTERS
// ==========================================================================

tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    tabBtns.forEach(b => b.classList.remove("active"));
    tabContents.forEach(c => c.classList.remove("active"));

    btn.classList.add("active");
    const activeTabId = `${btn.dataset.tab}-tab`;
    document.getElementById(activeTabId).classList.add("active");

    // Refresh charts and heatmap on tab load
    if (btn.dataset.tab === "analytics") {
      updateAnalyticsDashboard();
    }
  });
});

// ==========================================================================
// 5. CHART.JS ANALYTICS GENERATOR
// ==========================================================================

function updateAnalyticsDashboard() {
  // 1. Update stats cards
  const totalStudyMinutes = Object.values(analyticsData.dailyStudyMinutes).reduce((a, b) => a + b, 0);
  const totalStudyHours = (totalStudyMinutes / 60).toFixed(1);
  document.getElementById("analyticsTotalHours").textContent = `${totalStudyHours}h`;

  const totalCompletedQuests = Object.values(analyticsData.completedTasksPerDay).reduce((a, b) => a + b, 0);
  document.getElementById("analyticsCompletedQuests").textContent = totalCompletedQuests;

  document.getElementById("analyticsStreak").textContent = `${analyticsData.currentStreak} days`;

  const totalCreated = Object.values(analyticsData.categoryStats).reduce((acc, obj) => acc + (obj.created || 0), 0);
  const totalCompleted = Object.values(analyticsData.categoryStats).reduce((acc, obj) => acc + (obj.completed || 0), 0);
  const completionRate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;
  document.getElementById("analyticsCompletionRate").textContent = `${completionRate}%`;

  // 2. Initialize or Update Chart.js instances
  initStudyHoursChart();
  initCategoryChart();

  // 3. Render Heatmap and mastery stats
  renderHeatmap();
  renderQuestMastery();
}

function initStudyHoursChart() {
  const ctx = document.getElementById("studyHoursChart").getContext("2d");
  const dates = [];
  const studyValues = [];
  const today = new Date();

  // Handle Weekly vs Monthly labels
  const daysToView = currentStudyView === "weekly" ? 7 : 30;
  for (let i = daysToView - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const dateStr = getFormattedDate(date);
    dates.push(date.toLocaleDateString(undefined, { weekday: daysToView === 7 ? 'short' : undefined, month: 'short', day: 'numeric' }));
    studyValues.push((analyticsData.dailyStudyMinutes[dateStr] || 0).toFixed(1));
  }

  // Get active CSS variables for chart colors
  const textClr = isLightTheme() ? "#4b5563" : "#94a3b8";
  const gridClr = isLightTheme() ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.05)";
  const primaryClr = getComputedStyle(document.body).getPropertyValue('--primary').trim() || "#7c3aed";
  const secondaryClr = getComputedStyle(document.body).getPropertyValue('--secondary').trim() || "#06b6d4";

  if (studyChartInstance) {
    studyChartInstance.destroy();
  }

  // Generate gorgeous linear gradients for the chart
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, primaryClr);
  gradient.addColorStop(1, secondaryClr);

  studyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dates,
      datasets: [{
        label: 'Minutes Studied',
        data: studyValues,
        backgroundColor: gradient,
        borderRadius: 8,
        hoverBackgroundColor: primaryClr
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textClr, font: { family: 'Poppins' } }
        },
        y: {
          grid: { color: gridClr },
          ticks: { color: textClr, font: { family: 'Poppins' } }
        }
      }
    }
  });
}

function initCategoryChart() {
  const ctx = document.getElementById("categoryChart").getContext("2d");
  
  const labels = ["Theory 📘", "Practical 🧪", "Assignment 📝", "Revision 📖"];
  const completedData = [
    analyticsData.categoryStats.Theory?.completed || 0,
    analyticsData.categoryStats.Practical?.completed || 0,
    analyticsData.categoryStats.Assignment?.completed || 0,
    analyticsData.categoryStats.Revision?.completed || 0
  ];

  const textClr = isLightTheme() ? "#4b5563" : "#e2e8f0";

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  // Fallback visual data if no completed category items yet
  const displayData = completedData.some(v => v > 0) ? completedData : [1, 1, 1, 1];

  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: displayData,
        backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"],
        borderWidth: 0,
        hoverOffset: 12
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textClr, font: { family: 'Poppins', size: 12 }, padding: 15 }
        }
      },
      cutout: '70%'
    }
  });
}

// Chart toggle click listeners
document.getElementById("btnWeeklyStudy").addEventListener("click", () => {
  document.getElementById("btnWeeklyStudy").classList.add("active");
  document.getElementById("btnMonthlyStudy").classList.remove("active");
  currentStudyView = "weekly";
  initStudyHoursChart();
});

document.getElementById("btnMonthlyStudy").addEventListener("click", () => {
  document.getElementById("btnMonthlyStudy").classList.add("active");
  document.getElementById("btnWeeklyStudy").classList.remove("active");
  currentStudyView = "monthly";
  initStudyHoursChart();
});

// ==========================================================================
// 6. GITHUB CONSISTENCY HEATMAP GENERATOR
// ==========================================================================

function renderHeatmap() {
  const container = document.getElementById("heatmapContainer");
  container.innerHTML = "";

  const today = new Date();
  const weeksToDisplay = 15;
  const daysToDisplay = weeksToDisplay * 7;
  
  // Align start date to the beginning of the week
  const startDate = new Date();
  startDate.setDate(today.getDate() - daysToDisplay + 1);

  // Generate grid items
  for (let i = 0; i < daysToDisplay; i++) {
    const day = new Date(startDate.getTime());
    day.setDate(startDate.getDate() + i);
    const dateStr = getFormattedDate(day);

    const studyMinutes = analyticsData.dailyStudyMinutes[dateStr] || 0;
    const completedTasks = analyticsData.completedTasksPerDay[dateStr] || 0;
    
    // Overall activity metric
    const activityScore = Math.round(studyMinutes + (completedTasks * 12));
    
    let level = 0;
    if (activityScore > 0) {
      if (activityScore <= 15) level = 1;
      else if (activityScore <= 35) level = 2;
      else if (activityScore <= 65) level = 3;
      else level = 4;
    }

    const dayBlock = document.createElement("div");
    dayBlock.classList.add("heatmap-day", `level-${level}`);
    
    // Readable date for tooltip
    const formattedDate = day.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const tooltipText = `${formattedDate}: ${studyMinutes.toFixed(1)} mins study, ${completedTasks} completed quests`;
    dayBlock.setAttribute("data-tooltip", tooltipText);

    container.appendChild(dayBlock);
  }
}

// ==========================================================================
// 7. QUEST MASTERY PROGRESS LIST
// ==========================================================================

function renderQuestMastery() {
  const container = document.getElementById("subjectProgressList");
  container.innerHTML = "";

  const categories = ["Theory", "Practical", "Assignment", "Revision"];
  const progressClasses = ["theory", "practical", "assignment", "revision"];

  categories.forEach((cat, index) => {
    const stats = analyticsData.categoryStats[cat] || { created: 0, completed: 0 };
    const created = stats.created || 0;
    const completed = stats.completed || 0;
    
    const percentage = created > 0 ? Math.round((completed / created) * 100) : 0;
    const barClass = progressClasses[index];

    const progressRow = document.createElement("div");
    progressRow.classList.add("subject-progress-item");
    progressRow.innerHTML = `
      <div class="subject-info-row">
        <span class="subject-name">${getCategoryEmoji(cat)} ${cat}</span>
        <span class="subject-ratio"><span>${completed}</span> / ${created} completed</span>
      </div>
      <div class="subject-bar-container">
        <div class="subject-bar-fill ${barClass}" style="width: ${percentage}%"></div>
      </div>
    `;

    container.appendChild(progressRow);
  });
}

// ==========================================================================
// 8. INTERACTIVE SYSTEM WORKFLOWS
// ==========================================================================

// Filter Button routers
filterBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    filterBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderTasks();
  });
});

// Theme Selector Router
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
  const isLight = document.body.classList.contains("light");
  localStorage.setItem("theme", isLight ? "light" : "dark");

  // Adjust theme on charts if they are currently loaded
  if (document.getElementById("analytics-tab").classList.contains("active")) {
    initStudyHoursChart();
    initCategoryChart();
  }
});

// Keypress triggers
taskInput.addEventListener("keypress", e => {
  if (e.key === "Enter") {
    addTask();
  }
});

addTaskBtn.addEventListener("click", addTask);

// Dom Loaded
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  updateGamification();
  renderTasks();
  updateDisplay();
});
