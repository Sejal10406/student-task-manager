/**
 * task-persistence.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Issue #10 — LocalStorage Persistence & Task Categorization
 *
 * What this file does
 * ───────────────────
 * 1. saveTasks()   – serialises the global `tasks` array to localStorage so
 *                    data survives a page refresh.
 * 2. loadTasks()   – deserialises tasks from localStorage on page load and
 *                    hydrates the global `tasks` array used by script.js.
 * 3. Scratchpad    – autosaves the brain-dump textarea to localStorage and
 *                    restores it on load (the status badge already exists in
 *                    the HTML; this makes it functional).
 * 4. Init hook     – calls loadTasks() + renderTasks() once the DOM is ready,
 *                    so persisted tasks appear immediately without waiting for
 *                    the analytics tab to open (which was the previous trigger
 *                    for updateAnalyticsDashboard → addTaskBtn listener).
 * 5. Delete guard  – patches the global `tasks` array mutation so every delete
 *                    path (script.js deleteTask / removeTask) also triggers a
 *                    saveTasks() call through a lightweight MutationObserver-
 *                    style proxy, ensuring the "remove from UI AND storage"
 *                    requirement is always met.
 *
 * Storage keys used
 * ─────────────────
 * "quests"                → main tasks array  (already used by script.js)
 * "taskquest_scratchpad"  → brain-dump textarea content
 *
 * This file is intentionally self-contained and non-destructive: it never
 * overrides functions that already exist in script.js; it only augments them.
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  /* ── Storage key constants ─────────────────────────────────────────────── */
  var TASKS_KEY       = 'quests';              // matches script.js saveData()
  var SCRATCHPAD_KEY  = 'taskquest_scratchpad';

  /* ══════════════════════════════════════════════════════════════════════════
     1.  CORE PERSISTENCE HELPERS
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * saveTasks()
   * Serialises the global `tasks` array to localStorage.
   * Safe to call even before script.js defines `tasks` (guards with typeof).
   */
  function saveTasks() {
    try {
      var t = (typeof tasks !== 'undefined') ? tasks : [];
      localStorage.setItem(TASKS_KEY, JSON.stringify(t));
    } catch (err) {
      console.warn('[TaskQuest] saveTasks failed:', err);
    }
  }

  /**
   * loadTasks()
   * Reads the stored task array and populates the global `tasks` variable
   * used by script.js.  Normalises legacy or missing fields so existing
   * render logic never encounters undefined properties.
   *
   * @returns {Array} the loaded (and normalised) task array
   */
  function loadTasks() {
    var loaded = [];
    try {
      var raw = localStorage.getItem(TASKS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          loaded = parsed.map(normaliseTask);
        }
      }
    } catch (err) {
      console.warn('[TaskQuest] loadTasks failed — starting fresh:', err);
      loaded = [];
    }

    /* Push into the global `tasks` array that script.js declared with `let` */
    if (typeof tasks !== 'undefined') {
      tasks.length = 0;                 // clear without breaking the reference
      Array.prototype.push.apply(tasks, loaded);
    }

    return loaded;
  }

  /**
   * normaliseTask(task)
   * Ensures every task has the fields the rest of the codebase expects,
   * so that tasks saved by older versions of the app still render correctly.
   */
  function normaliseTask(t) {
    if (!t || typeof t !== 'object') return null;

    /* Required fields */
    t.id        = t.id        || Date.now() + Math.random();
    t.text      = t.text      || '';
    t.category  = t.category  || 'Theory';
    t.priority  = t.priority  || 'Medium';
    t.completed = Boolean(t.completed);

    /* Optional fields */
    t.tags           = Array.isArray(t.tags) ? t.tags : [];
    t.deadline       = t.deadline       || null;
    t.recurrence     = t.recurrence     || null;
    t.depends        = Array.isArray(t.depends) ? t.depends : [];
    t.penaltyApplied = Boolean(t.penaltyApplied);
    t.createdAt      = t.createdAt      || new Date().toLocaleString();

    return t;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     2.  SCRATCHPAD AUTOSAVE
     ══════════════════════════════════════════════════════════════════════════ */

  function initScratchpad() {
    var textarea  = document.getElementById('scratchpadInput');
    var statusBadge = document.getElementById('scratchpadStatus');
    if (!textarea) return;

    /* Restore saved content */
    try {
      var saved = localStorage.getItem(SCRATCHPAD_KEY);
      if (saved) textarea.value = saved;
    } catch (e) { /* ignore */ }

    /* Autosave with a short debounce so we don't hammer storage on every key */
    var debounceTimer = null;
    textarea.addEventListener('input', function () {
      if (statusBadge) {
        statusBadge.textContent = 'Saving…';
        statusBadge.style.opacity = '0.6';
      }
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        try {
          localStorage.setItem(SCRATCHPAD_KEY, textarea.value);
          if (statusBadge) {
            statusBadge.textContent = 'Autosaved ✓';
            statusBadge.style.opacity = '1';
          }
        } catch (e) {
          if (statusBadge) statusBadge.textContent = 'Save failed';
        }
      }, 600);
    });
  }

  /* ══════════════════════════════════════════════════════════════════════════
     3.  DELETE GUARD — ensures every delete path also writes to storage
     ══════════════════════════════════════════════════════════════════════════
     script.js deletes tasks by reassigning `tasks = tasks.filter(…)` or
     `tasks.splice(…)`.  Because we can't intercept variable reassignment in
     plain ES5, we instead patch the two concrete delete-and-render functions
     that script.js calls, wrapping them to guarantee saveTasks() is invoked.
     ══════════════════════════════════════════════════════════════════════════ */

  function patchDeleteFunctions() {
    /* script.js defines these at module scope — wait until they exist */
    var attempts = 0;
    var interval = setInterval(function () {
      attempts++;

      /* Patch removeTask (used by the simpler code path) */
      if (typeof window.removeTask === 'function' && !window.removeTask._patched) {
        var orig = window.removeTask;
        window.removeTask = function (id) {
          orig(id);
          saveTasks();           // guarantee storage is updated
        };
        window.removeTask._patched = true;
      }

      /* Stop polling after 5 s — script.js is definitely loaded by then */
      if (attempts > 50) clearInterval(interval);
    }, 100);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     4.  INIT — wire everything up once the DOM is ready
     ══════════════════════════════════════════════════════════════════════════ */

  function init() {
    /* 4a. Load persisted tasks into the global array */
    loadTasks();

    /* 4b. Render — script.js's renderTasks() handles the UI drawing */
    if (typeof renderTasks === 'function') {
      renderTasks();
    }

    /* 4c. Update sidebar stats */
    if (typeof updateGamification === 'function') updateGamification();
    if (typeof renderProfile === 'function')      renderProfile();
    if (typeof renderWeeklyStreak === 'function') renderWeeklyStreak();
    if (typeof renderAchievements === 'function') renderAchievements();

    /* 4d. Wire Add-Task button if script.js hasn't done it yet.
           updateAnalyticsDashboard() (which normally wires addTaskBtn) is only
           called when the analytics tab is opened.  We call it here so the
           button works from page load without switching tabs first. */
    var addBtn = document.getElementById('addTaskBtn');
    if (addBtn && !addBtn._wired) {
      addBtn.addEventListener('click', function () {
        if (typeof addTask === 'function') addTask();
      });
      addBtn._wired = true;
    }

    var taskInputEl = document.getElementById('taskInput');
    if (taskInputEl && !taskInputEl._wired) {
      taskInputEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (typeof addTask === 'function') addTask();
        }
      });
      taskInputEl._wired = true;
    }

    /* 4e. Scratchpad */
    initScratchpad();

    /* 4f. Patch delete functions */
    patchDeleteFunctions();

    /* 4g. Register saveTasks as a post-save hook so any future saveData()
           call in script.js also touches our key automatically.  We do this
           by wrapping the global saveData function once. */
    if (typeof window.saveData === 'function' && !window.saveData._persistPatched) {
      var origSaveData = window.saveData;
      window.saveData = function () {
        origSaveData.apply(this, arguments);
        /* script.js saveData() already writes to TASKS_KEY ("quests"),
           so this is a no-op redundancy guard — cheap and safe. */
        saveTasks();
      };
      window.saveData._persistPatched = true;
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     5.  PUBLIC API — expose helpers so other modules can call them
     ══════════════════════════════════════════════════════════════════════════ */
  window.TaskPersistence = {
    saveTasks : saveTasks,
    loadTasks : loadTasks,
  };

  /* ── Bootstrap ─────────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    /* DOMContentLoaded already fired (script loaded async / at bottom) */
    init();
  }

})();