const themeBtns = document.querySelectorAll(".theme-btn");

// Load and apply saved theme
const savedTheme = localStorage.getItem("theme") || "light";
applyTheme(savedTheme);

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  
  // Update active state in UI
  themeBtns.forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-theme") === theme);
  });
}

themeBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    applyTheme(btn.getAttribute("data-theme"));
  });
});




function toggleTask(checkbox) {
  const span = checkbox.nextElementSibling;
  span.classList.toggle("completed");

  taskTracker();
}



const themeSwitcher = document.getElementById("themeSwitcher");

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
 

const themeSwitcher = document.getElementById("themeSwitcher");

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
   const li = checkbox.closest("li");
   const textWrapper = checkbox.nextElementSibling;
   const span = textWrapper ? textWrapper.querySelector("span") : li.querySelector("span");

   if (span) {
      span.classList.toggle("completed");
   }

   if (li) {
      if (checkbox.checked) {
         li.classList.add("completed");
         if (span) span.setAttribute("aria-label", `${span.textContent}, completed`);
      } else {
         li.classList.remove("completed");
         if (span) span.removeAttribute("aria-label");
      }
   }

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

   const celebration = document.getElementById("celebration");

   if (celebration) {
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
document.addEventListener("DOMContentLoaded", () => {
  const elements = {
    taskForm: document.getElementById("taskForm"),
    taskInput: document.getElementById("taskInput"),
    categoryInput: document.getElementById("categoryInput"),
    taskList: document.getElementById("taskList"),
    taskStats: document.getElementById("taskStats"),
    searchInput: document.getElementById("searchInput"),
    sortAscBtn: document.getElementById("sortAscBtn"),
    sortDescBtn: document.getElementById("sortDescBtn"),
    filterButtons: document.getElementById("filterButtons"),
    errorMsg: document.getElementById("errorMsg"),
    themeSwitcher: document.getElementById("themeSwitcher"),
    emptyState: document.getElementById("emptyState"),
    celebration: document.getElementById("celebration"),
  };

  const state = {
    tasks: loadTasks(),
    searchQuery: "",
    currentFilter: "all",
    sortOrder: null,
  };

  init();

  function init() {
    loadTheme();
    bindEvents();
    renderTasks();
  }

  function bindEvents() {
    if (elements.taskForm) {
      elements.taskForm.addEventListener("submit", (event) => {
        event.preventDefault();
        addTask();
      });
    }

    if (elements.taskInput) {
      elements.taskInput.addEventListener("input", () => {
        if (elements.errorMsg) {
          elements.errorMsg.textContent = "";
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
        if (!button) {
          return;
        }

        document.querySelectorAll(".filter-btn").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        state.currentFilter = button.dataset.filter;
        renderTasks();
      });
    }

    if (elements.sortAscBtn) {
      elements.sortAscBtn.addEventListener("click", () => {
        state.sortOrder = "asc";
        renderTasks();
      });
    }

    if (elements.sortDescBtn) {
      elements.sortDescBtn.addEventListener("click", () => {
        state.sortOrder = "desc";
        renderTasks();
      });
    }

    if (elements.themeSwitcher) {
      elements.themeSwitcher.addEventListener("change", (event) => {
        setTheme(event.target.value);
      });
    }
  }

  function addTask() {
    const text = elements.taskInput ? elements.taskInput.value.trim() : "";
    const category = elements.categoryInput ? elements.categoryInput.value : "Theory";

    if (!text) {
      if (elements.errorMsg) {
        elements.errorMsg.textContent = "Please enter a task.";
      }
      return;
    }

    if (elements.errorMsg) {
      elements.errorMsg.textContent = "";
    }

    state.tasks.unshift({
      id: Date.now(),
      text,
      category,
      completed: false,
      createdAt: formatTimestamp(new Date()),
    });

    saveTasks();

    if (elements.taskInput) {
      elements.taskInput.value = "";
      elements.taskInput.focus();
    }

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
    if (!task) {
      return;
    }

    const updatedText = prompt("Edit task:", task.text);
    if (updatedText === null) {
      return;
    }

    const trimmedText = updatedText.trim();
    if (!trimmedText) {
      return;
    }

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

  function renderTasks() {
    if (!elements.taskList) {
      return;
    }

    elements.taskList.innerHTML = "";

    const visibleTasks = state.tasks
      .filter((task) => {
        const matchesSearch = task.text.toLowerCase().includes(state.searchQuery.toLowerCase());
        const matchesFilter =
          state.currentFilter === "all" ||
          (state.currentFilter === "active" && !task.completed) ||
          (state.currentFilter === "completed" && task.completed) ||
          task.category === state.currentFilter;

        return matchesSearch && matchesFilter;
      })
      .slice();

    if (state.sortOrder === "asc") {
      visibleTasks.sort((first, second) => first.text.localeCompare(second.text, undefined, { sensitivity: "base" }));
    } else if (state.sortOrder === "desc") {
      visibleTasks.sort((first, second) => second.text.localeCompare(first.text, undefined, { sensitivity: "base" }));
    }

    if (elements.emptyState) {
      elements.emptyState.hidden = visibleTasks.length !== 0;
      if (visibleTasks.length === 0) {
        elements.emptyState.textContent = state.searchQuery
          ? "No matching tasks found."
          : state.currentFilter === "all"
            ? "No tasks yet. Add one to get started."
            : "No tasks match this filter.";
      } else {
        elements.emptyState.textContent = "No tasks yet. Add one to get started."
      }
    }

    visibleTasks.forEach((task) => {
      elements.taskList.appendChild(createTaskElement(task));
    });

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
    if (!elements.taskStats) {
      return;
    }

    const completedCount = state.tasks.filter((task) => task.completed).length;
    elements.taskStats.textContent = `${completedCount} / ${state.tasks.length} completed`;
  }

  function updateCelebration() {
    if (!elements.celebration) {
      return;
    }

    const hasTasks = state.tasks.length > 0;
    const allComplete = hasTasks && state.tasks.every((task) => task.completed);

    elements.celebration.classList.toggle("hidden", !allComplete);
    elements.celebration.classList.toggle("show", allComplete);
  }

  function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(state.tasks));
  }

  function loadTasks() {
    try {
      return JSON.parse(localStorage.getItem("tasks")) || [];
    } catch (error) {
      return [];
    }
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
 document.addEventListener("DOMContentLoaded", () => {
  const themeSwitcher = document.getElementById("themeSwitcher");

  function loadTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme, false);
  }

  function setTheme(theme, persist = true) {
    document.documentElement.setAttribute("data-theme", theme);

    if (themeSwitcher) {
      themeSwitcher.value = theme;
    }

    if (persist) {
      localStorage.setItem("theme", theme);
    }
  }

  if (themeSwitcher) {
    themeSwitcher.addEventListener("change", (e) => {
      setTheme(e.target.value);
    });
  }

  loadTheme();
});


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
});
