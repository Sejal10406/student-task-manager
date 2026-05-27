"use strict";
/**
 * storage.js — Unified versioned localStorage contract for TaskQuest
 *
 * All pages MUST use these constants and helpers instead of raw
 * localStorage calls with ad-hoc key strings.
 *
 * Schema version: taskquest_v1
 *
 * Key registry
 * ─────────────────────────────────────────────────────────────────
 * taskquest_v1.tasks          – main task array (was "tasks" / "quests")
 * taskquest_v1.theme          – active theme string  (was "theme" / "quests_theme")
 * taskquest_v1.profile        – user profile object  (was "quests_profile")
 * taskquest_v1.coins          – integer              (was "coins")
 * taskquest_v1.streak         – integer              (was "streak")
 * taskquest_v1.xp             – integer              (was "xp")
 * taskquest_v1.leaderboard    – leaderboard entries  (was "taskquest_leaderboard_v1")
 * taskquest_v1.collab         – collaborative state  (was "collab_state")
 * taskquest_v1.reflection_draft – reflection draft   (was "tq_reflection_draft")
 * taskquest_v1.reflection_vault – reflection vault   (was "tq_reflection_vault")
 * taskquest_v1.challenge      – challenge state      (was in-memory only)
 * taskquest_v1.timetable      – timetable entries    (was split / missing)
 * ─────────────────────────────────────────────────────────────────
 */

(function (global) {
  "use strict";

  // ── Namespace prefix ──────────────────────────────────────────────────────
  const NS = "taskquest_v1.";

  // ── Public key constants ──────────────────────────────────────────────────
  const KEYS = {
    TASKS:             NS + "tasks",
    THEME:             NS + "theme",
    PROFILE:           NS + "profile",
    COINS:             NS + "coins",
    STREAK:            NS + "streak",
    XP:                NS + "xp",
    LEADERBOARD:       NS + "leaderboard",
    COLLAB:            NS + "collab",
    REFLECTION_DRAFT:  NS + "reflection_draft",
    REFLECTION_VAULT:  NS + "reflection_vault",
    CHALLENGE:         NS + "challenge",
    TIMETABLE:         NS + "timetable",
  };

  // ── Legacy key → canonical key migration map ──────────────────────────────
  const LEGACY_MAP = {
    // old key              : canonical KEYS property
    "tasks":                  KEYS.TASKS,
    "quests":                 KEYS.TASKS,
    "theme":                  KEYS.THEME,
    "quests_theme":           KEYS.THEME,
    "quests_profile":         KEYS.PROFILE,
    "coins":                  KEYS.COINS,
    "streak":                 KEYS.STREAK,
    "xp":                     KEYS.XP,
    "taskquest_leaderboard_v1": KEYS.LEADERBOARD,
    "collab_state":           KEYS.COLLAB,
    "tq_reflection_draft":    KEYS.REFLECTION_DRAFT,
    "tq_reflection_vault":    KEYS.REFLECTION_VAULT,
  };

  // ── Core helpers ──────────────────────────────────────────────────────────

  function get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback !== undefined ? fallback : null;
      return JSON.parse(raw);
    } catch (e) {
      return fallback !== undefined ? fallback : null;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("[TaskQuest Storage] Failed to write key:", key, e);
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        console.error("[TaskQuest Storage] LocalStorage quota exceeded!");
        // Try clearing older non-critical keys to make room if possible
        try {
          localStorage.removeItem("taskquest_v1.collab");
        } catch (err) {}
      }
      return false;
    }
  }

  function remove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }

  // ── Migration ─────────────────────────────────────────────────────────────
  /**
   * Runs once on page load.
   * Copies any data stored under legacy keys into the canonical keys,
   * then removes the legacy keys so they no longer pollute storage.
   */
  function migrate() {
    let migrated = false;

    Object.entries(LEGACY_MAP).forEach(function (entry) {
      const legacyKey = entry[0];
      const canonicalKey = entry[1];

      const legacyRaw = localStorage.getItem(legacyKey);
      if (legacyRaw === null) return; // nothing to migrate

      // Only migrate if the canonical slot is still empty
      if (localStorage.getItem(canonicalKey) === null) {
        try {
          localStorage.setItem(canonicalKey, legacyRaw);
          migrated = true;
        } catch (e) {
          console.warn("[TaskQuest Storage] Migration write failed:", canonicalKey, e);
        }
      }

      // Remove the legacy key regardless (canonical slot wins)
      try { localStorage.removeItem(legacyKey); } catch (e) { /* ignore */ }
    });

    if (migrated) {
      console.info("[TaskQuest Storage] Legacy keys migrated to taskquest_v1 namespace.");
    }
  }

  // ── Typed accessors ───────────────────────────────────────────────────────

  const Storage = {
    KEYS: KEYS,

    // Generic
    get: get,
    set: set,
    remove: remove,

    // Tasks
    getTasks:   function () { return get(KEYS.TASKS, []); },
    setTasks:   function (v) { return set(KEYS.TASKS, v); },

    // Theme
    getTheme:   function () { return get(KEYS.THEME, "cosmic"); },
    setTheme:   function (v) { return set(KEYS.THEME, v); },

    // Profile
    getProfile: function () { return get(KEYS.PROFILE, null); },
    setProfile: function (v) { return set(KEYS.PROFILE, v); },

    // Coins
    getCoins:   function () { return get(KEYS.COINS, 0); },
    setCoins:   function (v) { return set(KEYS.COINS, v); },

    // Streak
    getStreak:  function () { return get(KEYS.STREAK, 0); },
    setStreak:  function (v) { return set(KEYS.STREAK, v); },

    // XP
    getXP:      function () { return get(KEYS.XP, 0); },
    setXP:      function (v) { return set(KEYS.XP, v); },

    // Leaderboard
    getLeaderboard: function () { return get(KEYS.LEADERBOARD, null); },
    setLeaderboard: function (v) { return set(KEYS.LEADERBOARD, v); },

    // Collaborative state
    getCollab:  function () { return get(KEYS.COLLAB, null); },
    setCollab:  function (v) { return set(KEYS.COLLAB, v); },

    // Reflection draft
    getReflectionDraft: function () { return get(KEYS.REFLECTION_DRAFT, null); },
    setReflectionDraft: function (v) { return set(KEYS.REFLECTION_DRAFT, v); },

    // Reflection vault
    getReflectionVault: function () { return get(KEYS.REFLECTION_VAULT, []); },
    setReflectionVault: function (v) { return set(KEYS.REFLECTION_VAULT, v); },

    // Challenge state
    getChallenge: function () { return get(KEYS.CHALLENGE, null); },
    setChallenge: function (v) { return set(KEYS.CHALLENGE, v); },

    // Timetable
    getTimetable: function () { return get(KEYS.TIMETABLE, []); },
    setTimetable: function (v) { return set(KEYS.TIMETABLE, v); },

    // Run migration (call once at app boot)
    migrate: migrate,
  };

  // ── Expose globally ───────────────────────────────────────────────────────
  global.TaskQuestStorage = Storage;

})(window);
