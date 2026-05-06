

function addTask() {
  const input = document.getElementById("taskInput");
  const task = input.value.trim();
  const errorMsg = document.getElementById("errorMsg");


  if (task.trim() === "") {

  if (task.trim()=== "") {

    errorMsg.textContent = " Please enter a task.";
    return;
  };
  errorMsg.textContent = "";


  const li = document.createElement("li");

  const li = document.createElement("li");


  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.addEventListener("change", function () {
    toggleTask(checkbox);
  });


  const span = document.createElement("span");
  span.textContent = task;

  const now = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const day = dayNames[now.getDay()];

  const date = `${now.getDate()} ${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`;
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const date =`${now.getDate()} ${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`;
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const timeElement = document.createElement("small");
  timeElement.textContent = ` (${day}, ${date} at ${time})`;
  timeElement.style.marginLeft = "10px";
  timeElement.style.color = "#888";


  const editButton = document.createElement("button");
  editButton.textContent = "Edit";
  editButton.addEventListener("click", function () {
    const newTask = prompt("Edit task:", span.textContent);

    if (newTask !== null && newTask.trim() !== "") {
      span.textContent = newTask;

      const now = new Date();
      const day = dayNames[now.getDay()];
      const date = `${now.getDate()} ${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`;
      const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      timeElement.textContent = ` (${day}, ${date} at ${time})`;
    }
  });

  li.appendChild(span);
  li.appendChild(timeElement);
  li.appendChild(editButton);

  const removeButton = document.createElement("button");
  removeButton.textContent = "Remove";
  removeButton.addEventListener("click", function () {
    li.remove();
  });

  li.appendChild(removeButton);
  document.getElementById("taskList").appendChild(li);

  input.value = "";
}


function toggleTheme() {
  const body = document.body;
  const btn = document.getElementById("themeToggle");

  body.classList.toggle("dark-mode");

  if (body.classList.contains("dark-mode")) {
    btn.textContent = "☀️ Light Mode";
    localStorage.setItem("theme", "dark");
  } else {
    btn.textContent = "🌙 Dark Mode";
    localStorage.setItem("theme", "light");
  }
}

  const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.addEventListener("click", function () {
      const newTask = prompt("Edit task:", span.textContent);
      if (newTask !== null) {
        span.textContent = newTask;
      }
    });
    li.appendChild(span);
    li.appendChild(timeElement);
    li.appendChild(editButton);
  const removeButton = document.createElement("button");
  removeButton.textContent = "Remove";
  removeButton.addEventListener("click", function () {
    li.remove();

    taskTracker();
    
  });



  li.appendChild(checkbox);
  li.appendChild(span);


  li.appendChild(removeButton);

  document.getElementById("taskList").appendChild(li);
  
  input.value = "";

  taskTracker();

}

/* =========================
   MULTI-THEME SWITCHER
========================= */

const themeSwitcher = document.getElementById("themeSwitcher");


  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    document.getElementById("themeToggle").textContent = "☀️ Light Mode";
  }
};


// Load saved theme
const savedTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);

if (themeSwitcher) {
  themeSwitcher.value = savedTheme;

  themeSwitcher.addEventListener("change", function (e) {
    const selectedTheme = e.target.value;

    document.documentElement.setAttribute("data-theme", selectedTheme);
    localStorage.setItem("theme", selectedTheme);
  });
}




function toggleTask(checkbox) {
  const span = checkbox.nextElementSibling;
  span.classList.toggle("completed");

  taskTracker();
}


function taskTracker() {
  const tasks = document.querySelectorAll("#taskList li");
  const completed = document.querySelectorAll("#taskList input:checked");

  const empty = document.getElementById("emptyState");
  if (empty) {
    empty.style.display = tasks.length === 0 ? "block" : "none";
  }

  const stats = document.getElementById("taskStats");
  if (stats) {
    stats.innerText = `✅ ${completed.length} / ${tasks.length} completed`;
  }

}

const themeSwitcher = document.getElementById("themeSwitcher");
const savedTheme = localStorage.getItem("theme") || "light";

document.documentElement.setAttribute("data-theme", savedTheme);

if (themeSwitcher) {
  themeSwitcher.value = savedTheme;

  themeSwitcher.addEventListener("change", function (e) {
    const selectedTheme = e.target.value;
    document.documentElement.setAttribute("data-theme", selectedTheme);
    localStorage.setItem("theme", selectedTheme);
  });
}

document.getElementById("addBtn").addEventListener("click", addTask);

document.getElementById("taskInput").addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    addTask();
  }
});

function addTask() {
  const input = document.getElementById("taskInput");
  const task = input.value.trim();
  const errorMsg = document.getElementById("errorMsg");
  const category = document.getElementById("categoryInput").value;

  if (task === "") {
    errorMsg.textContent = "Please enter a task.";
    return;
  }

  errorMsg.textContent = "";

  const li = document.createElement("li");
  li.setAttribute("data-category", category);

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.addEventListener("change", function () {
    toggleTask(checkbox);
  });

  const span = document.createElement("span");
  span.textContent = task;

  const now = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const day = dayNames[now.getDay()];
  const date = `${now.getDate()} ${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`;
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const timeElement = document.createElement("small");
  timeElement.textContent = `${day}, ${date} at ${time}`;

  const taskActions = document.createElement("div");
  taskActions.className = "task-actions";

  const editButton = document.createElement("button");
  editButton.textContent = "Edit";
  editButton.className = "edit-btn";
  editButton.addEventListener("click", function () {
    const newTask = prompt("Edit task:", span.textContent);
    if (newTask !== null && newTask.trim() !== "") {
      span.textContent = newTask.trim();

      const now = new Date();
      const day = dayNames[now.getDay()];
      const date = `${now.getDate()} ${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`;
      const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      timeElement.textContent = `${day}, ${date} at ${time}`;
    }
  });

  const removeButton = document.createElement("button");
  removeButton.textContent = "Remove";
  removeButton.className = "remove-btn";
  removeButton.addEventListener("click", function () {
    li.remove();
  });

  taskActions.appendChild(editButton);
  taskActions.appendChild(removeButton);

  li.appendChild(checkbox);
  li.appendChild(span);
  li.appendChild(timeElement);
  li.appendChild(taskActions);

  document.getElementById("taskList").appendChild(li);

  input.value = "";
  input.focus();
}

function toggleTask(checkbox) {
  const li = checkbox.closest("li");
  const span = li.querySelector("span");

  if (checkbox.checked) {
    li.classList.add("completed");
    span.setAttribute("aria-label", `${span.textContent}, completed`);
  } else {
    li.classList.remove("completed");
    span.removeAttribute("aria-label");
  }
}

function sortTasks(order) {
  const taskList = document.getElementById("taskList");
  const tasks = Array.from(taskList.getElementsByTagName("li"));

  tasks.sort((a, b) => {
    const textA = a.querySelector("span").textContent.toLowerCase();
    const textB = b.querySelector("span").textContent.toLowerCase();

    if (order === "asc") {
      return textA.localeCompare(textB);
    } else {
      return textB.localeCompare(textA);
    }
  });

  tasks.forEach(task => taskList.appendChild(task));
}

  const celebration = document.getElementById("celebration");

  if (tasks.length > 0 && tasks.length === completed.length) {
    celebration.classList.remove("hidden");

    setTimeout(() => {
      celebration.classList.add("show");
    }, 100);
  } else {
    celebration.classList.remove("show");
    celebration.classList.add("hidden");
  }
}

// State Management
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let currentFilter = "all";
let searchQuery = "";

// Selectors
const taskInput = document.getElementById("taskInput");
const categoryInput = document.getElementById("categoryInput");
const errorMsg = document.getElementById("errorMsg");
const taskList = document.getElementById("taskList");
const searchInput = document.getElementById("searchInput");
const filterButtons = document.getElementById("filterButtons");
const emptyState = document.getElementById("emptyState");
const taskStats = document.getElementById("taskStats");
const themeSwitcher = document.getElementById("themeSwitcher");

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  renderTasks();
});

// Task Functions
function addTask() {
  const text = taskInput.value.trim();
  const category = categoryInput.value;

  if (text === "") {
    errorMsg.textContent = "Please enter a task.";
    return;
  }
  errorMsg.textContent = "";

  const newTask = {
    id: Date.now(),
    text: text,
    category: category,
    completed: false,
    timestamp: getFormattedDate()
  };

  tasks.push(newTask);
  saveTasks();
  taskInput.value = "";
  renderTasks();
}

function toggleTask(id) {
  tasks = tasks.map(task => {
    if (task.id === id) {
      return { ...task, completed: !task.completed };
    }
    return task;
  });
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter(task => task.id !== id);
  saveTasks();
  renderTasks();
}

function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const newText = prompt("Edit task:", task.text);
  if (newText !== null && newText.trim() !== "") {
    task.text = newText.trim();
    saveTasks();
    renderTasks();
  }
}

function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function renderTasks() {
  taskList.innerHTML = "";

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = 
      currentFilter === "all" || 
      (currentFilter === "active" && !task.completed) || 
      (currentFilter === "completed" && task.completed) ||
      (task.category === currentFilter);
    
    return matchesSearch && matchesFilter;
  });

  if (filteredTasks.length === 0) {
    emptyState.style.display = "block";
    emptyState.textContent = searchQuery ? "No matching tasks found." : "No tasks in this category.";
  } else {
    emptyState.style.display = "none";
    filteredTasks.forEach(task => {
      const li = createTaskElement(task);
      taskList.appendChild(li);
    });
  }

  updateStats();
}

function createTaskElement(task) {
  const li = document.createElement("li");
  li.innerHTML = `
    <input type="checkbox" ${task.completed ? "checked" : ""} onchange="toggleTask(${task.id})">
    <div class="task-content ${task.completed ? "completed" : ""}">
      <div class="task-text-row">
        <span class="task-text">${task.text}</span>
        <span class="category-badge">${getCategoryEmoji(task.category)} ${task.category}</span>
      </div>
      <small class="task-time">${task.timestamp}</small>
    </div>
    <div class="task-actions">
      <button onclick="editTask(${task.id})">Edit</button>
      <button class="remove-btn" onclick="deleteTask(${task.id})">Remove</button>
    </div>
  `;
  return li;
}

function updateStats() {
  const completedCount = tasks.filter(t => t.completed).length;
  taskStats.innerText = `✅ ${completedCount} / ${tasks.length} completed`;
}

// Helpers
function getFormattedDate() {
const themeSwitcher = document.getElementById("themeSwitcher");
const savedTheme = localStorage.getItem("theme") || "light";

document.documentElement.setAttribute("data-theme", savedTheme);

if (themeSwitcher) {
  themeSwitcher.value = savedTheme;

  themeSwitcher.addEventListener("change", function (e) {
    const selectedTheme = e.target.value;
    document.documentElement.setAttribute("data-theme", selectedTheme);
    localStorage.setItem("theme", selectedTheme);
  });
}

document.getElementById("addBtn").addEventListener("click", addTask);

document.getElementById("taskInput").addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    addTask();
  }
});

function addTask() {
  const input = document.getElementById("taskInput");
  const task = input.value.trim();
  const errorMsg = document.getElementById("errorMsg");
  const category = document.getElementById("categoryInput").value;

  if (task === "") {
    errorMsg.textContent = "Please enter a task.";
    return;
  }

  errorMsg.textContent = "";

  const li = document.createElement("li");
  li.setAttribute("data-category", category);

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.addEventListener("change", function () {
    toggleTask(checkbox);
  });

  const span = document.createElement("span");
  span.textContent = task;

  const now = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const day = dayNames[now.getDay()];
  const date = `${now.getDate()} ${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`;
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `(${day}, ${date} at ${time})`;
}

function getCategoryEmoji(category) {
  const emojis = {
    Theory: "📘",
    Practical: "💻",
    Revision: "🔄",
    Assignment: "📝"
  };
  return emojis[category] || "";
}

// Event Listeners
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderTasks();
  });
}

if (filterButtons) {
  filterButtons.addEventListener("click", (e) => {
    if (e.target.classList.contains("filter-btn")) {
      document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
      e.target.classList.add("active");
      currentFilter = e.target.getAttribute("data-filter");
      renderTasks();
    }
  });
}

// Theme Management
function loadTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  if (themeSwitcher) themeSwitcher.value = savedTheme;
}

if (themeSwitcher) {
  themeSwitcher.addEventListener("change", function (e) {
    const selectedTheme = e.target.value;
    document.documentElement.setAttribute("data-theme", selectedTheme);
    localStorage.setItem("theme", selectedTheme);
  });

  const timeElement = document.createElement("small");
  timeElement.textContent = `${day}, ${date} at ${time}`;

  const taskActions = document.createElement("div");
  taskActions.className = "task-actions";

  const editButton = document.createElement("button");
  editButton.textContent = "Edit";
  editButton.className = "edit-btn";
  editButton.addEventListener("click", function () {
    const newTask = prompt("Edit task:", span.textContent);
    if (newTask !== null && newTask.trim() !== "") {
      span.textContent = newTask.trim();

      const now = new Date();
      const day = dayNames[now.getDay()];
      const date = `${now.getDate()} ${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`;
      const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      timeElement.textContent = `${day}, ${date} at ${time}`;
    }
  });

  const removeButton = document.createElement("button");
  removeButton.textContent = "Remove";
  removeButton.className = "remove-btn";
  removeButton.addEventListener("click", function () {
    li.remove();
  });

  taskActions.appendChild(editButton);
  taskActions.appendChild(removeButton);

  li.appendChild(checkbox);
  li.appendChild(span);
  li.appendChild(timeElement);
  li.appendChild(taskActions);

  document.getElementById("taskList").appendChild(li);

  input.value = "";
  input.focus();
}

function toggleTask(checkbox) {
  const li = checkbox.closest("li");
  const span = li.querySelector("span");

  if (checkbox.checked) {
    li.classList.add("completed");
    span.setAttribute("aria-label", `${span.textContent}, completed`);
  } else {
    li.classList.remove("completed");
    span.removeAttribute("aria-label");
  }
}

function sortTasks(order) {
  const taskList = document.getElementById("taskList");
  const tasks = Array.from(taskList.getElementsByTagName("li"));

  tasks.sort((a, b) => {
    const textA = a.querySelector("span").textContent.toLowerCase();
    const textB = b.querySelector("span").textContent.toLowerCase();

    if (order === "asc") {
      return textA.localeCompare(textB);
    } else {
      return textB.localeCompare(textA);
    }
  });

  tasks.forEach(task => taskList.appendChild(task));
}

