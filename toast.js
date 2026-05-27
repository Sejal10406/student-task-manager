/**
 * toast.js
 * Lightweight, accessible toast notification system for Study Task Tracker.
 *
 * Provides non-blocking user feedback for actions like:
 *   - Task added / removed / edited
 *   - Theme changed
 *   - Export triggered
 *   - Validation errors (as an accessible alternative to inline text)
 *
 * Features:
 *   ✅ Accessible — uses role="status" (polite) or role="alert" (assertive)
 *   ✅ Animated — smooth slide-in/out using CSS keyframes
 *   ✅ Auto-dismiss — configurable duration (default 3 s)
 *   ✅ Stackable — multiple toasts queue vertically
 *   ✅ Theme-aware — respects CSS custom properties
 *   ✅ No dependencies — plain JS
 *
 * Usage:
 *   Include AFTER style.css (uses CSS variables).
 *   Call: window.showToast("Message here", "success" | "error" | "info" | "warning")
 *
 * Auto-inserts its own styles — no additional CSS file required.
 */

(function () {
  "use strict";

  // ── Constants ─────────────────────────────────────────────────────────────

  const TOAST_DURATION_MS = 3000;
  const TOAST_ANIMATION_MS = 300;

  const TOAST_TYPES = {
    success: { icon: '<i class="ri-checkbox-circle-fill"></i>', role: "status",  color: "#10b981", bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.2)" },
    error:   { icon: '<i class="ri-close-circle-fill"></i>', role: "alert",   color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.2)" },
    warning: { icon: '<i class="ri-error-warning-fill"></i>', role: "alert",   color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.2)" },
    info:    { icon: '<i class="ri-information-fill"></i>', role: "status",  color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", border: "rgba(59, 130, 246, 0.2)" },
  };

  // ── Style Injection ───────────────────────────────────────────────────────

  const styleEl = document.createElement("style");
  styleEl.textContent = `
    #toast-container {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 10000;
      display: flex;
      flex-direction: column-reverse;
      gap: 0.6rem;
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      padding: 0.75rem 1rem;
      border-radius: 10px;
      border: 1px solid;
      font-size: 0.875rem;
      font-family: "Inter", system-ui, -apple-system, sans-serif;
      max-width: 320px;
      min-width: 220px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
      pointer-events: auto;
      cursor: default;
      animation: toastSlideIn ${TOAST_ANIMATION_MS}ms ease forwards;
      word-break: break-word;
    }

    .toast.dismissing {
      animation: toastSlideOut ${TOAST_ANIMATION_MS}ms ease forwards;
    }

    .toast-icon {
      font-size: 1rem;
      flex-shrink: 0;
      line-height: 1.4;
    }

    .toast-body {
      flex: 1;
      line-height: 1.5;
      font-weight: 500;
    }

    .toast-close {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.9rem;
      padding: 0;
      line-height: 1;
      opacity: 0.5;
      transition: opacity 0.15s;
      flex-shrink: 0;
      color: inherit;
    }

    .toast-close:hover { opacity: 1; }

    @keyframes toastSlideIn {
      from { transform: translateX(110%); opacity: 0; }
      to   { transform: translateX(0);   opacity: 1; }
    }

    @keyframes toastSlideOut {
      from { transform: translateX(0);   opacity: 1; max-height: 200px; margin: 0; }
      to   { transform: translateX(110%); opacity: 0; max-height: 0;   margin: -0.6rem 0 0; }
    }

    @media (max-width: 480px) {
      #toast-container {
        right: 0.75rem;
        left: 0.75rem;
        bottom: 1rem;
      }
      .toast { max-width: 100%; }
    }

    @media (prefers-reduced-motion: reduce) {
      .toast, .toast.dismissing { animation: none; }
    }
  `;
  document.head.appendChild(styleEl);

  // ── Container ─────────────────────────────────────────────────────────────

  function getContainer() {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.setAttribute("aria-live", "polite");
      container.setAttribute("aria-atomic", "false");
      document.body.appendChild(container);
    }
    return container;
  }

  // ── Core API ──────────────────────────────────────────────────────────────

  /**
   * Display a toast notification.
   * @param {string} message  - The notification text
   * @param {"success"|"error"|"warning"|"info"} [type="info"] - Toast variant
   * @param {number} [duration] - Auto-dismiss delay in ms (0 = no auto-dismiss)
   */
  function showToast(message, type = "info", duration = TOAST_DURATION_MS) {
    const config = TOAST_TYPES[type] || TOAST_TYPES.info;
    const container = getContainer();

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", config.role);
    toast.setAttribute("aria-live", config.role === "alert" ? "assertive" : "polite");
    toast.style.cssText = `
      background-color: ${config.bg};
      border-color: ${config.border};
      color: ${config.color};
    `;

    toast.innerHTML = `
      <span class="toast-icon" aria-hidden="true" style="display: flex; align-items: center; font-size: 1.2rem;">${config.icon}</span>
      <span class="toast-body">${escapeHTML(message)}</span>
      <button class="toast-close" aria-label="Dismiss notification" title="Dismiss">✕</button>
    `;

    const closeBtn = toast.querySelector(".toast-close");
    closeBtn.addEventListener("click", () => dismiss(toast));

    container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => dismiss(toast), duration);
    }

    return toast;
  }

  function dismiss(toast) {
    if (!toast.isConnected || toast.classList.contains("dismissing")) return;
    toast.classList.add("dismissing");
    setTimeout(() => toast.remove(), TOAST_ANIMATION_MS);
  }

  // ── Convenience Helpers ───────────────────────────────────────────────────

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── Expose ────────────────────────────────────────────────────────────────

  window.showToast = showToast;

})();
