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

        <p>
          Add tasks and begin your productivity journey ✨
        </p>

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

          <h3 class="task-title">
            ${task.text}
          </h3>

          <p class="task-category">
            ${task.category}
          </p>

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

    /* COMPLETE */

    div.querySelector(".check-btn")
      .addEventListener("click", () => {

        task.completed = !task.completed;

        if (task.completed) {

          coins += 10;

          streak += 1;

          xp += 20;

        } else {

          coins -= 10;

          streak -= 1;

          xp -= 20;

        }

        updateGamification();

        renderTasks();

      });

    /* DELETE */

    div.querySelector(".delete-btn")
      .addEventListener("click", () => {

        tasks = tasks.filter(
          t => t.id !== task.id
        );

        renderTasks();

      });

    /* EDIT */

    div.querySelector(".edit-btn")
      .addEventListener("click", () => {

        const updated = prompt(
          "Edit your quest",
          task.text
        );

        if (updated !== null && updated.trim() !== "") {

          task.text = updated;

          renderTasks();

        }

      });

    taskList.appendChild(div);

  });

  updateStats();
}

/* STATS */

function updateStats() {

  totalTasks.textContent = tasks.length;

  const completed = tasks.filter(
    task => task.completed
  ).length;

  completedTasks.textContent = completed;
}

/* GAMIFICATION */

function updateGamification() {

  points.textContent = coins;

  streakCount.textContent = streak;

  xpText.textContent = `${xp} / 300 XP`;

  xpFill.style.width = `${xp / 3}%`;
}

/* FILTERS */

filterBtns.forEach(btn => {

  btn.addEventListener("click", () => {

    filterBtns.forEach(
      b => b.classList.remove("active")
    );

    btn.classList.add("active");

    currentFilter = btn.dataset.filter;

    renderTasks();

  });

});

/* THEME */

themeToggle.addEventListener("click", () => {

  document.body.classList.toggle("light");

});

/* ENTER */

taskInput.addEventListener("keypress", e => {

  if (e.key === "Enter") {
    addTask();
  }

});
let studyTime = 25 * 60;
let breakTime = 5 * 60;

let currentTime = studyTime;

let timer;
let isStudy = true;

function updateDisplay() {

  let minutes = Math.floor(currentTime / 60);
  let seconds = currentTime % 60;

  seconds = seconds < 10 ? "0" + seconds : seconds;

  document.getElementById("timer").innerText =
    `${minutes}:${seconds}`;
}

function startTimer() {

  if (timer) return;

  timer = setInterval(() => {

    currentTime--;

    updateDisplay();

    if (currentTime <= 0) {

      clearInterval(timer);
      timer = null;

      if (isStudy) {

        alert("Study session complete! Take a break.");

        isStudy = false;
        currentTime = breakTime;

        document.getElementById("mode").innerText =
          "Break Time";

      } else {

        alert("Break over! Back to study.");

        isStudy = true;
        currentTime = studyTime;

        document.getElementById("mode").innerText =
          "Study Time";
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

  document.getElementById("mode").innerText =
    "Study Time";

  updateDisplay();
}

updateDisplay();
new Notification("Break Time!");

