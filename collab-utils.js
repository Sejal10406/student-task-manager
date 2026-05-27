/**
 * Shared helpers for Study Together (collaborative.js).
 * Load before collaborative.js.
 */
(function () {
  "use strict";

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function announce(message) {
    const el = document.getElementById("srAnnouncement");
    if (!el) return;
    el.textContent = "";
    requestAnimationFrame(() => {
      el.textContent = message;
    });
  }

  function showTaskPopup(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message, "success");
      return;
    }
    const container = document.getElementById("toast-container");
    if (container) {
      const toast = document.createElement("div");
      toast.setAttribute("role", "status");
      toast.textContent = message;
      toast.style.cssText =
        "padding:12px 16px;margin-top:8px;border-radius:8px;background:var(--card,#1e1e2e);color:var(--text,#fff);box-shadow:0 4px 12px rgba(0,0,0,.3);";
      container.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  }

  window.escapeHtml = escapeHtml;
  window.announce = announce;
  window.showTaskPopup = showTaskPopup;
})();
