/**
 * theme-sync.js — OS Dark Mode Preference Auto-Sync for TaskQuest
 *
 * Listens to the `prefers-color-scheme` media query and automatically
 * switches the app theme to match the user's OS dark/light preference —
 * but ONLY when the user has not manually selected a theme.
 *
 * Behaviour:
 *  - On first load (no saved theme):        syncs to OS preference.
 *  - On OS preference change at runtime:    syncs live IF auto-sync is enabled.
 *  - After user manually picks a theme:     stops auto-syncing (respects choice).
 *  - "Reset to system preference" option:   re-enables auto-sync.
 *
 * Integration:
 *  - Reads  localStorage key  "quests_theme_autosync"  (bool string)
 *  - Calls  window.setTheme(name)  which is defined in script.js
 *  - Emits  CustomEvent "taskquest:theme-sync-changed"  for UI updates
 *
 * @module theme-sync
 */

(function (global) {
  "use strict";

  /* ─── Constants ────────────────────────────────────────────────────────── */

  const KEY_AUTOSYNC  = "quests_theme_autosync";
  const KEY_THEME     = "quests_theme";
  const DARK_THEME    = "cosmic";   // TaskQuest's default dark theme
  const LIGHT_THEME   = "sunset";  // TaskQuest's light mode theme

  /* ─── Helpers ──────────────────────────────────────────────────────────── */

  /** @returns {boolean} true if OS prefers dark mode */
  function prefersDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  /** @returns {boolean} true if auto-sync is currently enabled */
  function isAutoSyncEnabled() {
    const stored = localStorage.getItem(KEY_AUTOSYNC);
    // Default ON when no theme has been manually saved yet
    if (stored === null) {
      return localStorage.getItem(KEY_THEME) === null;
    }
    return stored === "true";
  }

  /** Persists the auto-sync flag. */
  function setAutoSync(enabled) {
    localStorage.setItem(KEY_AUTOSYNC, enabled ? "true" : "false");
    _emitChange();
  }

  /** Applies the OS-preferred theme if auto-sync is active. */
  function _syncNow() {
    if (!isAutoSyncEnabled()) return;
    const theme = prefersDark() ? DARK_THEME : LIGHT_THEME;
    _applyTheme(theme);
  }

  /**
   * Calls the global setTheme function (defined in script.js) if available,
   * otherwise falls back to a minimal direct DOM mutation.
   */
  function _applyTheme(themeName) {
    if (typeof global.setTheme === "function") {
      global.setTheme(themeName);
    } else {
      // Minimal fallback — works even before script.js DOMContentLoaded
      document.body.setAttribute("data-theme", themeName);
      if (themeName === LIGHT_THEME) {
        document.body.classList.add("light");
      } else {
        document.body.classList.remove("light");
      }
      localStorage.setItem(KEY_THEME, themeName);
    }
  }

  function _emitChange() {
    window.dispatchEvent(new CustomEvent("taskquest:theme-sync-changed", {
      detail: {
        autoSyncEnabled: isAutoSyncEnabled(),
        currentOSPreference: prefersDark() ? "dark" : "light"
      }
    }));
  }

  /* ─── OS Preference Listener ───────────────────────────────────────────── */

  if (window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    // Use the modern `addEventListener` (Safari <14 uses `addListener`)
    const handler = function () { _syncNow(); };
    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
    } else if (mq.addListener) {
      // @ts-ignore legacy Safari
      mq.addListener(handler);
    }
  }

  /* ─── UI Widget injection ──────────────────────────────────────────────── */

  /**
   * Injects a small "Sync with system theme" toggle into the theme picker
   * if the element #themeSyncToggleContainer exists in the DOM.
   */
  function injectSyncToggle() {
    const container = document.getElementById("themeSyncToggleContainer");
    if (!container || container.dataset.injected) return;
    container.dataset.injected = "1";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id   = "themeSyncCheckbox";
    checkbox.checked = isAutoSyncEnabled();
    checkbox.setAttribute("aria-label", "Automatically match OS dark/light mode preference");

    const label = document.createElement("label");
    label.htmlFor   = "themeSyncCheckbox";
    label.textContent = "🌗 Sync with system theme";
    label.style.cssText = "display:flex;align-items:center;gap:8px;font-size:0.85rem;cursor:pointer;user-select:none;";

    checkbox.addEventListener("change", function () {
      setAutoSync(checkbox.checked);
      if (checkbox.checked) {
        _syncNow(); // apply OS preference immediately when re-enabled
        if (typeof global.showToast === "function") {
          global.showToast("Theme will now follow your OS preference", "info");
        }
      } else {
        if (typeof global.showToast === "function") {
          global.showToast("Auto theme sync disabled — your choice is saved", "info");
        }
      }
    });

    label.prepend(checkbox);
    container.appendChild(label);
  }

  /* ─── Manual theme selection hook ─────────────────────────────────────── */

  // When the user manually clicks a theme dot, disable auto-sync so we
  // do not override their selection on the next OS preference change.
  document.addEventListener("click", function (e) {
    const dot = e.target.closest(".theme-dot[data-theme]");
    if (dot) {
      setAutoSync(false);
      // Update checkbox if it is visible
      const cb = document.getElementById("themeSyncCheckbox");
      if (cb) cb.checked = false;
    }
  });

  /* ─── Boot ─────────────────────────────────────────────────────────────── */

  document.addEventListener("DOMContentLoaded", function () {
    // Sync on first load
    _syncNow();
    // Inject toggle widget if the container exists
    injectSyncToggle();
  });

  /* ─── Public API ───────────────────────────────────────────────────────── */

  global.ThemeSync = {
    isAutoSyncEnabled,
    setAutoSync,
    syncNow: _syncNow,
    prefersDark
  };

})(window);
