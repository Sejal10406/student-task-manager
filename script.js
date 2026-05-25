// --- State Management ---
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

// --- Selectors ---
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const taskStats = document.getElementById("taskStats");
const errorMsg = document.getElementById("errorMsg");
const celebration = document.getElementById("celebration");
const themeSwitcher = document.getElementById("themeSwitcher");

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  renderTasks();
  initTheme();
});

// --- Core Functions ---

function addTask() {
  const text = taskInput.value.trim();
  
  if (text === "") {
    errorMsg.textContent = "Please enter a task.";
    return;
  }

  errorMsg.textContent = "";

  const now = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const day = dayNames[now.getDay()];
  const date = `${now.getDate()} ${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`;
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const newTask = {
    id: Date.now(),
    text: text,
    completed: false,
    timestamp: `(${day}, ${date} at ${time})`
  };

  tasks.push(newTask);
  saveAndRender();
  taskInput.value = "";
}

function removeTask(id) {
  tasks = tasks.filter(task => task.id !== id);
  saveAndRender();
}

function toggleTask(id) {
  tasks = tasks.map(task => {
    if (task.id === id) {
      return { ...task, completed: !task.completed };
    }
    return task;
  });
  saveAndRender();
}

function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const newText = prompt("Edit task:", task.text);
  if (newText !== null && newText.trim() !== "") {
    task.text = newText.trim();
    saveAndRender();
  }
}

function saveAndRender() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
  renderTasks();
}

function renderTasks() {
  taskList.innerHTML = "";

  tasks.forEach(task => {
    const li = document.createElement("li");
    if (task.completed) li.classList.add("completed");

    li.innerHTML = `
      <input type="checkbox" ${task.completed ? "checked" : ""} onchange="toggleTask(${task.id})">
      <span>
        ${task.text}
        <small style="display: block; font-size: 0.75rem; opacity: 0.7;">${task.timestamp}</small>
      </span>
      <div style="display: flex; gap: 5px;">
        <button onclick="editTask(${task.id})" style="padding: 0.5rem; font-size: 0.8rem;">Edit</button>
        <button onclick="removeTask(${task.id})" style="padding: 0.5rem; font-size: 0.8rem; background: var(--error-color, #ef4444);">Remove</button>
      </div>
    `;

    taskList.appendChild(li);
  });

  updateStats();
}

function updateStats() {
  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;

  if (taskStats) {
    taskStats.innerText = `✅ ${completedCount} / ${totalCount} completed`;
  }

  if (celebration) {
    if (totalCount > 0 && completedCount === totalCount) {
      celebration.classList.remove("hidden");
      setTimeout(() => celebration.classList.add("show"), 10);
    } else {
      celebration.classList.remove("show");
      celebration.classList.add("hidden");
    }
  }
}

// --- Theme Management ---

function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);

  if (themeSwitcher) {
    themeSwitcher.value = savedTheme;
    themeSwitcher.addEventListener("change", (e) => {
      const selectedTheme = e.target.value;
      document.documentElement.setAttribute("data-theme", selectedTheme);
      localStorage.setItem("theme", selectedTheme);
    });
  }
}



/* Export JSON Logic */
document.getElementById('exportJsonBtn')?.addEventListener('click', () => { const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tasks, null, 2)); const dlAnchorElem = document.createElement('a'); dlAnchorElem.setAttribute('href', dataStr); dlAnchorElem.setAttribute('download', 'taskquest_backup.json'); dlAnchorElem.click(); });
