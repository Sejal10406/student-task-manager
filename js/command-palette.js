/**
 * command-palette.js — Keyboard Command Palette for TaskQuest
 *
 * Provides a fuzzy-search command palette (similar to VS Code's Ctrl+P) that
 * lets power users trigger any app action entirely from the keyboard.
 *
 * Trigger:     Ctrl+K  (or Cmd+K on macOS)
 * Close:       Escape  or click outside
 * Navigate:    Arrow Up / Down
 * Execute:     Enter
 *
 * Registered commands are a plain array — new commands can be pushed at runtime
 * (e.g. from script.js) via  window.CommandPalette.register(cmd).
 *
 * @module command-palette
 */

(function (global) {
  "use strict";

  /* ─── Command Registry ─────────────────────────────────────────────────── */

  /**
   * @typedef  {Object} Command
   * @property {string}   id          Unique identifier
   * @property {string}   label       Display name shown in palette
   * @property {string}   [desc]      Optional description / shortcut hint
   * @property {string}   [icon]      Emoji or icon class string
   * @property {string[]} [keywords]  Additional search terms
   * @property {Function} action      Called when the command is selected
   */

  /** @type {Command[]} */
  const registry = [];

  /**
   * Registers one or more commands.
   * @param {...Command} cmds
   */
  function register(...cmds) {
    cmds.forEach(function (cmd) {
      if (!cmd.id || !cmd.action) return;
      // Replace existing command with same id
      const idx = registry.findIndex(function (c) { return c.id === cmd.id; });
      if (idx > -1) { registry[idx] = cmd; } else { registry.push(cmd); }
    });
  }

  /* ─── Built-in commands ────────────────────────────────────────────────── */

  function initBuiltins() {
    register(
      {
        id: "nav.home",
        label: "Go to Dashboard",
        icon: "🏠",
        keywords: ["home", "main", "tasks", "quests"],
        action: function () { window.location.href = "/index.html"; }
      },
      {
        id: "nav.analytics",
        label: "Open Analytics",
        icon: "📊",
        keywords: ["charts", "stats", "progress"],
        action: function () {
          const btn = document.querySelector('[data-tab="analytics"], #tabBtnAnalytics');
          if (btn) { btn.click(); close(); }
          else window.location.href = "/index.html#analytics";
        }
      },
      {
        id: "nav.focus",
        label: "Start Focus (Pomodoro)",
        icon: "🍅",
        keywords: ["pomodoro", "timer", "study"],
        action: function () { window.location.href = "/pages/focus.html"; }
      },
      {
        id: "nav.notes",
        label: "Open Notes",
        icon: "📝",
        keywords: ["write", "note", "journal"],
        action: function () { window.location.href = "/pages/notes.html"; }
      },
      {
        id: "nav.leaderboard",
        label: "View Leaderboard",
        icon: "🏆",
        keywords: ["rank", "top", "score"],
        action: function () { window.location.href = "/pages/leaderboard.html"; }
      },
      {
        id: "nav.profile",
        label: "View Profile",
        icon: "👤",
        keywords: ["avatar", "settings", "account"],
        action: function () { window.location.href = "/pages/profile.html"; }
      },
      {
        id: "task.add",
        label: "Add New Task",
        icon: "➕",
        keywords: ["new", "create", "quest"],
        action: function () {
          const input = document.getElementById("taskInput");
          if (input) { input.focus(); input.scrollIntoView({ behavior: "smooth", block: "center" }); close(); }
        }
      },
      {
        id: "theme.toggle",
        label: "Toggle Dark / Light Theme",
        icon: "🌗",
        keywords: ["dark", "light", "mode", "theme"],
        action: function () {
          const current = document.body.getAttribute("data-theme") || "cosmic";
          const next = current === "sunset" ? "cosmic" : "sunset";
          if (typeof global.setTheme === "function") { global.setTheme(next); close(); }
        }
      },
      {
        id: "sound.toggle",
        label: "Toggle Sound On / Off",
        icon: "🔊",
        keywords: ["mute", "audio", "sound"],
        action: function () {
          if (typeof global.toggleSound === "function") { global.toggleSound(); close(); }
        }
      },
      {
        id: "data.export",
        label: "Export Tasks as CSV",
        icon: "📥",
        keywords: ["download", "backup", "csv"],
        action: function () {
          const btn = document.getElementById("exportCsvBtn");
          if (btn) { btn.click(); close(); }
        }
      },
      {
        id: "help",
        label: "Keyboard Shortcuts Help",
        icon: "⌨️",
        keywords: ["shortcuts", "help", "keys"],
        action: function () {
          alert(
            "TaskQuest Keyboard Shortcuts\n" +
            "─────────────────────────────\n" +
            "Ctrl+K / Cmd+K  Open command palette\n" +
            "Escape           Close palette / modals\n" +
            "Arrow keys       Navigate palette items\n" +
            "Enter            Execute selected command"
          );
          close();
        }
      }
    );
  }

  /* ─── Fuzzy Search ─────────────────────────────────────────────────────── */

  /**
   * Very lightweight fuzzy-match: returns true when all characters of `needle`
   * appear in `haystack` in sequence (case-insensitive).
   * @param {string} needle
   * @param {string} haystack
   * @returns {boolean}
   */
  function fuzzyMatch(needle, haystack) {
    if (!needle) return true;
    const n = needle.toLowerCase();
    const h = haystack.toLowerCase();
    let ni = 0;
    for (let hi = 0; hi < h.length && ni < n.length; hi++) {
      if (h[hi] === n[ni]) ni++;
    }
    return ni === n.length;
  }

  function search(query) {
    if (!query) return registry.slice();
    return registry.filter(function (cmd) {
      const searchable = [cmd.label, cmd.desc || "", ...(cmd.keywords || [])].join(" ");
      return fuzzyMatch(query, searchable);
    });
  }

  /* ─── DOM / UI ─────────────────────────────────────────────────────────── */

  let overlay, modal, input, list;
  let results     = [];
  let activeIndex = -1;
  let isOpen      = false;

  function buildUI() {
    if (document.getElementById("cmd-palette-overlay")) return;

    const style = document.createElement("style");
    style.id = "cmd-palette-styles";
    style.textContent = `
      #cmd-palette-overlay {
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
        display: flex; align-items: flex-start; justify-content: center;
        padding-top: 12vh;
        animation: cp-fade-in 0.15s ease;
      }
      #cmd-palette-overlay.hidden { display: none; }
      #cmd-palette-modal {
        width: min(600px, 90vw);
        background: var(--card-bg, #1a1830);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 14px;
        box-shadow: 0 24px 64px rgba(0,0,0,0.5);
        overflow: hidden;
        animation: cp-slide-in 0.18s cubic-bezier(0.34,1.36,0.64,1);
      }
      #cmd-palette-input {
        width: 100%; box-sizing: border-box;
        padding: 14px 20px; font-size: 1rem;
        border: none; border-bottom: 1px solid rgba(255,255,255,0.1);
        background: transparent; color: var(--text-color, #e2e8f0);
        outline: none; font-family: inherit;
      }
      #cmd-palette-input::placeholder { color: rgba(255,255,255,0.35); }
      #cmd-palette-list {
        max-height: 360px; overflow-y: auto; padding: 6px;
      }
      .cp-item {
        display: flex; align-items: center; gap: 12px;
        padding: 10px 14px; border-radius: 8px; cursor: pointer;
        transition: background 0.1s;
      }
      .cp-item:hover, .cp-item.active {
        background: rgba(168,85,247,0.18);
      }
      .cp-item-icon { font-size: 1.1rem; width: 20px; text-align: center; }
      .cp-item-label { flex: 1; font-size: 0.9rem; color: var(--text-color, #e2e8f0); }
      .cp-item-desc { font-size: 0.75rem; color: rgba(255,255,255,0.4); }
      .cp-empty {
        padding: 24px; text-align: center;
        color: rgba(255,255,255,0.4); font-size: 0.9rem;
      }
      #cmd-palette-footer {
        padding: 8px 16px; font-size: 0.72rem;
        color: rgba(255,255,255,0.3);
        border-top: 1px solid rgba(255,255,255,0.08);
        display: flex; gap: 16px;
      }
      @keyframes cp-fade-in  { from { opacity:0 } to { opacity:1 } }
      @keyframes cp-slide-in { from { transform: translateY(-10px); opacity:0 } to { transform:translateY(0); opacity:1 } }
    `;
    document.head.appendChild(style);

    overlay = document.createElement("div");
    overlay.id = "cmd-palette-overlay";
    overlay.className = "hidden";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Command palette");
    overlay.setAttribute("aria-modal", "true");

    modal = document.createElement("div");
    modal.id = "cmd-palette-modal";

    input = document.createElement("input");
    input.id = "cmd-palette-input";
    input.type = "search";
    input.placeholder = "Search commands…";
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("aria-label", "Search commands");
    input.setAttribute("aria-owns", "cmd-palette-list");
    input.setAttribute("aria-autocomplete", "list");

    list = document.createElement("div");
    list.id = "cmd-palette-list";
    list.setAttribute("role", "listbox");

    const footer = document.createElement("div");
    footer.id = "cmd-palette-footer";
    footer.innerHTML =
      '<span>↑↓ Navigate</span><span>↵ Execute</span><span>Esc Close</span><span>Ctrl+K Open</span>';

    modal.appendChild(input);
    modal.appendChild(list);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close on overlay background click
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });

    input.addEventListener("input", function () {
      activeIndex = -1;
      renderList(search(input.value.trim()));
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); moveFocus(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); moveFocus(-1); }
      else if (e.key === "Enter") { e.preventDefault(); execute(); }
      else if (e.key === "Escape") { e.preventDefault(); close(); }
    });
  }

  function renderList(cmds) {
    results = cmds;
    list.innerHTML = "";
    if (!cmds.length) {
      const empty = document.createElement("p");
      empty.className = "cp-empty";
      empty.textContent = "No commands found.";
      list.appendChild(empty);
      return;
    }
    cmds.forEach(function (cmd, idx) {
      const item = document.createElement("div");
      item.className = "cp-item";
      item.setAttribute("role", "option");
      item.setAttribute("id", "cp-item-" + idx);
      item.setAttribute("aria-selected", "false");
      item.innerHTML =
        `<span class="cp-item-icon" aria-hidden="true">${cmd.icon || "▸"}</span>` +
        `<span class="cp-item-label">${escapeHtml(cmd.label)}</span>` +
        (cmd.desc ? `<span class="cp-item-desc">${escapeHtml(cmd.desc)}</span>` : "");
      item.addEventListener("click", function () {
        activeIndex = idx;
        execute();
      });
      list.appendChild(item);
    });
  }

  function moveFocus(delta) {
    const items = list.querySelectorAll(".cp-item");
    if (!items.length) return;
    if (activeIndex >= 0 && activeIndex < items.length) {
      items[activeIndex].classList.remove("active");
      items[activeIndex].setAttribute("aria-selected", "false");
    }
    activeIndex = Math.max(0, Math.min(items.length - 1, activeIndex + delta));
    items[activeIndex].classList.add("active");
    items[activeIndex].setAttribute("aria-selected", "true");
    items[activeIndex].scrollIntoView({ block: "nearest" });
    input.setAttribute("aria-activedescendant", "cp-item-" + activeIndex);
  }

  function execute() {
    const cmd = results[activeIndex] || results[0];
    if (!cmd) return;
    close();
    try { cmd.action(); } catch (e) { console.error("[CommandPalette] Error executing:", cmd.id, e); }
  }

  function open() {
    if (isOpen) return;
    buildUI();
    overlay.classList.remove("hidden");
    isOpen = true;
    activeIndex = -1;
    input.value = "";
    renderList(registry);
    requestAnimationFrame(function () { input.focus(); });
  }

  function close() {
    if (!overlay) return;
    overlay.classList.add("hidden");
    isOpen = false;
    activeIndex = -1;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ─── Global keyboard trigger ─────────────────────────────────────────── */

  document.addEventListener("keydown", function (e) {
    const isMeta = e.metaKey || e.ctrlKey;
    if (isMeta && e.key === "k") {
      e.preventDefault();
      isOpen ? close() : open();
    }
    if (e.key === "Escape" && isOpen) {
      e.preventDefault();
      close();
    }
  });

  /* ─── Boot ─────────────────────────────────────────────────────────────── */

  document.addEventListener("DOMContentLoaded", function () {
    buildUI();
    initBuiltins();
  });

  /* ─── Public API ───────────────────────────────────────────────────────── */
  global.CommandPalette = { open, close, register };

})(window);
