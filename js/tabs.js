/**
 * TaskQuest tab navigation — desktop nav, mobile dock, ARIA, keyboard.
 */
(function () {
  "use strict";

  const DEFAULT_TAB = "quests";
  const initialized = new Set([DEFAULT_TAB]);

  const LAZY_INIT = {
    analytics() {
      if (typeof window.refreshAnalytics === "function") window.refreshAnalytics();
    },
  };

  function getPanel(tabId) {
    return document.getElementById(`${tabId}-tab`);
  }

  function getTabButtons(tabId) {
    return Array.from(
      document.querySelectorAll(`.tab-btn[data-tab="${tabId}"], .dock-btn[data-tab="${tabId}"]`)
    );
  }

  function getAllTabTriggers() {
    return Array.from(document.querySelectorAll(".tab-btn[data-tab], .dock-btn[data-tab]"));
  }

  function runLazyInit(tabId) {
    if (initialized.has(tabId)) return;
    initialized.add(tabId);
    const fn = LAZY_INIT[tabId];
    if (fn) fn();
    document.dispatchEvent(
      new CustomEvent("taskquest:tab", { detail: { tabId }, bubbles: true })
    );
  }

  function switchTab(tabId, options = {}) {
    if (!tabId || !getPanel(tabId)) return;

    document.querySelectorAll(".tab-content").forEach((panel) => {
      const isActive = panel.id === `${tabId}-tab`;
      panel.classList.toggle("active", isActive);
      panel.setAttribute("aria-hidden", isActive ? "false" : "true");
      if (isActive) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "");
    });

    getAllTabTriggers().forEach((btn) => {
      const active = btn.dataset.tab === tabId;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
      btn.tabIndex = active ? 0 : -1;
    });

    if (!options.skipLazy) runLazyInit(tabId);

    if (!options.skipFocus) {
      const primary = document.getElementById(`tabBtn${tabIdToBtnId(tabId)}`) ||
        getTabButtons(tabId)[0];
      if (primary && options.focus !== false) primary.focus({ preventScroll: true });
    }

    try {
      localStorage.setItem("taskquest_active_tab", tabId);
    } catch (e) {
      /* ignore */
    }
  }

  function tabIdToBtnId(tabId) {
    return tabId
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("");
  }

  function handleTabClick(e) {
    const btn = e.target.closest(".tab-btn[data-tab], .dock-btn[data-tab]");
    if (!btn) return;
    e.preventDefault();
    switchTab(btn.dataset.tab, { skipFocus: true });
    btn.focus();
  }

  function getTabsInList(tablist) {
    return Array.from(tablist.querySelectorAll('.tab-btn[data-tab], .dock-btn[data-tab]'));
  }

  function handleTabKeydown(e) {
    const btn = e.target.closest('.tab-btn[data-tab], .dock-btn[data-tab]');
    if (!btn) return;
    const tablist = btn.closest('[role="tablist"]');
    if (!tablist) return;

    const tabs = getTabsInList(tablist);
    const idx = tabs.indexOf(btn);
    if (idx < 0) return;

    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = (idx + 1) % tabs.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      next = (idx - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      next = 0;
    } else if (e.key === "End") {
      next = tabs.length - 1;
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      switchTab(btn.dataset.tab);
      return;
    } else {
      return;
    }

    e.preventDefault();
    const target = tabs[next];
    switchTab(target.dataset.tab);
    target.focus();
  }

  function init() {
    document.querySelectorAll('[role="tablist"]').forEach((tablist) => {
      tablist.addEventListener("click", handleTabClick);
      tablist.addEventListener("keydown", handleTabKeydown);
    });

    getAllTabTriggers().forEach((btn, i) => {
      btn.tabIndex = btn.classList.contains("active") || btn.getAttribute("aria-selected") === "true" ? 0 : -1;
      if (i > 0 && btn.tabIndex === 0 && !btn.classList.contains("active")) btn.tabIndex = -1;
    });

    document.querySelectorAll(".tab-content").forEach((panel) => {
      const active = panel.classList.contains("active");
      panel.setAttribute("aria-hidden", active ? "false" : "true");
      if (!active) panel.setAttribute("hidden", "");
    });

    let initial = DEFAULT_TAB;
    try {
      const saved = localStorage.getItem("taskquest_active_tab");
      if (saved && getPanel(saved)) initial = saved;
    } catch (e) {
      /* ignore */
    }

    switchTab(initial, { skipFocus: true });
    window.switchTaskQuestTab = switchTab;
  }

  document.addEventListener("DOMContentLoaded", init);
})();
