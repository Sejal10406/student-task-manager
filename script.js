// Nexus Task Master - Core Logic
// Enhanced Version

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const taskForm = document.getElementById('taskForm');
    const taskInput = document.getElementById('taskInput');
    const taskCategory = document.getElementById('taskCategory');
    const taskPriority = document.getElementById('taskPriority');
    const taskList = document.getElementById('taskList');
    const taskStatsText = document.getElementById('taskStatsText');
    const progressBar = document.getElementById('progressBar');
    const searchInput = document.getElementById('searchInput');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const errorMsg = document.getElementById('errorMsg');
    const themeSwitcher = document.getElementById('themeSwitcher');
    const emptyState = document.getElementById('emptyState');
    const celebration = document.getElementById('celebration');
    const closeCelebration = document.getElementById('closeCelebration');

    // State
    let tasks = JSON.parse(localStorage.getItem('nexus_tasks')) || [];

    // Initialize
    init();

    function init() {
        if (taskList) renderTasks();
        setupTheme();
        attachEventListeners();
    }

const elements = {};

    function attachEventListeners() {
        // Add Task
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                addTask();
            });
        }

        // Theme Switcher
        if (themeSwitcher) {
            themeSwitcher.addEventListener('change', (e) => {
                const theme = e.target.value;
                document.body.setAttribute('data-theme', theme);
                localStorage.setItem('nexus_theme', theme);
            });
        }

        // Search
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                renderTasks(e.target.value);
            });
        }

        // Clear All
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all tasks?')) {
                    tasks = [];
                    saveAndRender();
                }
            });
        }

        // Close Celebration
        if (closeCelebration) {
            closeCelebration.addEventListener('click', () => {
                celebration.classList.remove('show');
                setTimeout(() => celebration.classList.add('hidden'), 500); // Wait for transition
            });
        }
    }

  loadTheme();
  bindEvents();
  renderTasks();
});

function bindEvents() {
  if (elements.taskForm) {
    elements.taskForm.addEventListener("submit", (event) => {
      event.preventDefault();
      addTask();
    });
  }

  if (elements.taskInput) {
    elements.taskInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addTask();
      }
    });
  }

  if (elements.searchInput) {
    elements.searchInput.addEventListener("input", (event) => {
      state.searchQuery = event.target.value;
      renderTasks();
    });
  }

  if (elements.filterButtons) {
    elements.filterButtons.addEventListener("click", (event) => {
      const button = event.target.closest(".filter-btn");
      if (!button) return;

      document.querySelectorAll(".filter-btn").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.currentFilter = button.dataset.filter;
      renderTasks();
    });
  }

    function updateStats() {
        const total = tasks.length;
        const completedCount = tasks.filter(t => t.completed).length;
        const percent = total === 0 ? 0 : Math.round((completedCount / total) * 100);

        if (taskStatsText) taskStatsText.textContent = `✅ ${completedCount} / ${total} completed (${percent}%)`;
        if (progressBar) progressBar.style.width = `${percent}%`;

        // Celebration logic
        if (celebration) {
            if (total > 0 && total === completedCount) {
                celebration.classList.remove('hidden');
                celebration.classList.add('show');
            } else {
                celebration.classList.remove('show');
                celebration.classList.add('hidden');
            }
        }
    }

  if (elements.sortAscBtn) {
    elements.sortAscBtn.addEventListener("click", () => sortTasks("asc"));
  }

  if (elements.sortDescBtn) {
    elements.sortDescBtn.addEventListener("click", () => sortTasks("desc"));
  }
}

function addTask() {
  const text = elements.taskInput.value.trim();
  const category = elements.categoryInput.value;

  if (!text) {
    elements.errorMsg.textContent = "Please enter a task.";
    return;
  }

  elements.errorMsg.textContent = "";

  state.tasks.unshift({
    id: Date.now(),
    text,
    category,
    completed: false,
    createdAt: formatTimestamp(new Date()),
  });

  saveTasks();
  elements.taskInput.value = "";
  elements.taskInput.focus();
  renderTasks();
}

function toggleTask(id) {
  state.tasks = state.tasks.map((task) => {
    if (task.id === id) {
      return { ...task, completed: !task.completed };
    }
    return task;
  });

  saveTasks();
  renderTasks();
}

function editTask(id) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;

  const updatedText = prompt("Edit task:", task.text);
  if (updatedText === null) return;

  const trimmedText = updatedText.trim();
  if (!trimmedText) return;

  task.text = trimmedText;
  task.createdAt = formatTimestamp(new Date());
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((task) => task.id !== id);
  saveTasks();
  renderTasks();
}

function sortTasks(order) {
  state.tasks.sort((first, second) => {
    const comparison = first.text.localeCompare(second.text, undefined, { sensitivity: "base" });
    return order === "asc" ? comparison : -comparison;
  });

  saveTasks();
  renderTasks();
}

function renderTasks() {
  if (!elements.taskList) return;

  elements.taskList.innerHTML = "";

  const visibleTasks = state.tasks.filter((task) => {
    const matchesSearch = task.text.toLowerCase().includes(state.searchQuery.toLowerCase());
    const matchesFilter =
      state.currentFilter === "all" ||
      (state.currentFilter === "active" && !task.completed) ||
      (state.currentFilter === "completed" && task.completed) ||
      task.category === state.currentFilter;

    return matchesSearch && matchesFilter;
  });

  elements.emptyState.hidden = visibleTasks.length !== 0;

  if (visibleTasks.length === 0) {
    const emptyMessage = state.searchQuery
      ? "No matching tasks found."
      : state.currentFilter === "all"
        ? "No tasks yet. Add one to get started."
        : "No tasks match this filter.";
    elements.emptyState.textContent = emptyMessage;
  } else {
    visibleTasks.forEach((task) => {
      elements.taskList.appendChild(createTaskElement(task));
    });
  }

  updateStats();
  updateCelebration();
}

function createTaskElement(task) {
  const li = document.createElement("li");
  li.dataset.category = task.category;
  if (task.completed) {
    li.classList.add("completed");
  }

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.addEventListener("change", () => toggleTask(task.id));

  const content = document.createElement("div");
  content.className = "task-content";

  const textRow = document.createElement("div");
  textRow.className = "task-text-row";

  const text = document.createElement("span");
  text.className = "task-text";
  text.textContent = task.text;

  const badge = document.createElement("span");
  badge.className = "category-badge";
  badge.textContent = `${getCategoryEmoji(task.category)} ${task.category}`;

  const time = document.createElement("small");
  time.className = "task-time";
  time.textContent = task.createdAt;

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "edit-btn";
  editButton.textContent = "Edit";
  editButton.addEventListener("click", () => editTask(task.id));

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "remove-btn";
  removeButton.textContent = "Remove";
  removeButton.addEventListener("click", () => deleteTask(task.id));

  textRow.append(text, badge);
  content.append(textRow, time);
  actions.append(editButton, removeButton);
  li.append(checkbox, content, actions);

  return li;
}

function updateStats() {
  if (!elements.taskStats) return;

  const completedCount = state.tasks.filter((task) => task.completed).length;
  elements.taskStats.textContent = `${completedCount} / ${state.tasks.length} completed`;
}

function updateCelebration() {
  if (!elements.celebration) return;

  const hasTasks = state.tasks.length > 0;
  const allComplete = hasTasks && state.tasks.every((task) => task.completed);

  elements.celebration.classList.toggle("hidden", !allComplete);
  elements.celebration.classList.toggle("show", allComplete);
}

function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(state.tasks));
}

function loadTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  setTheme(savedTheme, false);
}

function setTheme(theme, persist = true) {
  document.documentElement.setAttribute("data-theme", theme);
  if (elements.themeSwitcher) {
    elements.themeSwitcher.value = theme;
  }
  if (persist) {
    localStorage.setItem("theme", theme);
  }
}

function formatTimestamp(date) {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const day = dayNames[date.getDay()];
  const dayOfMonth = date.getDate();
  const month = date.toLocaleString("default", { month: "long" });
  const year = date.getFullYear();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return `${day}, ${dayOfMonth} ${month} ${year} at ${time}`;
}

function getCategoryEmoji(category) {
  const emojis = {
    Theory: "📘",
    Practical: "💻",
    Revision: "🔄",
    Assignment: "📝",
  };

  return emojis[category] || "📚";
}