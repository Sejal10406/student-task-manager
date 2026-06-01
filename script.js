
// Core Elements
const taskInput = document.getElementById("taskInput");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskList = document.getElementById("taskList");
const categorySelect = document.getElementById("categorySelect");
const taskTemplate = document.getElementById("taskTemplate");
const taskTagsInput = document.getElementById("taskTagsInput");

// Audio state & helpers for subtle feedback
const audioState = {
  muted: localStorage.getItem('quests_sound_muted') === 'true',
  context: null
};

function ensureAudioContext() {
  if (!audioState.context) {
    try {
      audioState.context = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      audioState.context = null;
    }
  }
  return audioState.context;
}

function updateSoundButtonUI() {
  const btn = document.getElementById('soundToggleBtn');
  if (!btn) return;
  btn.classList.toggle('muted', audioState.muted);
  btn.setAttribute('aria-pressed', (!audioState.muted).toString());
  btn.title = audioState.muted ? 'Sound muted' : 'Sound on';
  btn.innerHTML = audioState.muted ? '<i class="ri-volume-mute-line"></i>' : '<i class="ri-volume-up-line"></i>';
}

function toggleSound() {
  audioState.muted = !audioState.muted;
  localStorage.setItem('quests_sound_muted', audioState.muted);
  updateSoundButtonUI();
  // Resume audio context on unmute after user gesture
  if (!audioState.muted) {
    const ctx = ensureAudioContext();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(()=>{});
  }
}

function playSound(name) {
  if (audioState.muted) return;
  const ctx = ensureAudioContext();
  if (!ctx) return;

  try {
    if (name === 'complete') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(880, ctx.currentTime);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
      o.connect(g); g.connect(ctx.destination);
      o.start();
      o.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
      setTimeout(() => { try { o.stop(); o.disconnect(); g.disconnect(); } catch(e){} }, 400);
    } else if (name === 'achievement') {
      // short bell chord
      const freqs = [660, 880, 990];
      const gains = [];
      const os = freqs.map(f => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(f, ctx.currentTime);
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
        o.connect(g); g.connect(ctx.destination);
        o.start();
        gains.push(g);
        return o;
      });
      // release
      gains.forEach((g, i) => g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6 + i * 0.02));
      setTimeout(() => { os.forEach(o => { try { o.stop(); o.disconnect(); } catch(e){} }); }, 900);
    }
  } catch (e) {
    console.warn('playSound error', e);
  }
}

let currentTagFilter = "All";

function normalizeTag(tag) {
  return tag.trim().replace(/\s+/g, " ");
}

function parseTags(rawValue) {
  if (!rawValue) return [];
  const seen = new Set();
  return rawValue
    .split(/[,\n]/)
    .map(normalizeTag)
    .filter(Boolean)
    .filter(tag => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getTaskTags(task) {
  if (!task) return [];
  if (Array.isArray(task.tags)) {
    return parseTags(task.tags.join(", "));
  }
  if (typeof task.tags === "string") {
    return parseTags(task.tags);
  }
  return [];
}

function getTagColor(tag) {
  const palette = ["#f97316", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#f59e0b", "#14b8a6", "#ef4444"];
  const normalized = normalizeTag(tag).toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

// Subject color mapping - deterministic, consistent, accessible
function getSubjectColor(subject) {
  if (!subject) return '#94a3b8';
  const palette = [
    '#06b6d4', // cyan
    '#8b5cf6', // purple
    '#10b981', // green
    '#f97316', // orange
    '#ef4444', // red
    '#3b82f6', // blue
    '#f59e0b', // amber
    '#a78bfa'  // violet
  ];
  const key = normalizeTag(subject).toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

function getContrastColor(hex) {
  if (!hex) return '#fff';
  const c = hex.replace('#','');
  const r = parseInt(c.substring(0,2),16);
  const g = parseInt(c.substring(2,4),16);
  const b = parseInt(c.substring(4,6),16);
  // relative luminance
  const luminance = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
  return luminance > 0.6 ? '#0b1220' : '#ffffff';
}

function getRecentTags() {
  try {
    const stored = JSON.parse(localStorage.getItem("quests_recent_tags") || "[]");
    return Array.isArray(stored) ? stored.filter(Boolean) : [];
  } catch (e) {
    return [];
  }
}

function storeRecentTags(tags) {
  const next = [];
  const seen = new Set();
  [...tags, ...getRecentTags()].forEach(tag => {
    const normalized = normalizeTag(tag);
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) return;
    seen.add(key);
    next.push(normalized);
  });
  localStorage.setItem("quests_recent_tags", JSON.stringify(next.slice(0, 12)));
}

function getFrequentTags(limit = 8) {
  const counts = new Map();
  tasks.forEach(task => {
    getTaskTags(task).forEach(tag => {
      const key = tag.toLowerCase();
      counts.set(key, { tag, count: (counts.get(key)?.count || 0) + 1 });
    });
  });

  const ordered = Array.from(counts.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.tag.localeCompare(b.tag);
  }).map(entry => entry.tag);

  const recent = getRecentTags();
  recent.forEach(tag => {
    if (!ordered.some(existing => existing.toLowerCase() === tag.toLowerCase())) {
      ordered.push(tag);
    }
  });

  return ordered.slice(0, limit);
}

function renderTagSuggestions() {
  const datalist = document.getElementById("taskTagSuggestionsList");
  if (!datalist) return;

  const tags = getFrequentTags(10);
  datalist.innerHTML = tags.map(tag => `<option value="${escapeHtml(tag)}"></option>`).join("");
}

function renderTagFilters() {
  const container = document.getElementById("tagFilterChips");
  if (!container) return;

  const tags = getFrequentTags(12);
  const chips = [
    `<button type="button" class="tag-chip tag-chip--all ${currentTagFilter === "All" ? "active" : ""}" data-tag="All">All Tags</button>`
  ];

  tags.forEach(tag => {
    const color = getTagColor(tag);
    const active = currentTagFilter.toLowerCase() === tag.toLowerCase();
    chips.push(`<button type="button" class="tag-chip ${active ? "active" : ""}" data-tag="${escapeHtml(tag)}" style="background:${color};">${escapeHtml(tag)}</button>`);
  });

  container.innerHTML = chips.join("");
  container.querySelectorAll("[data-tag]").forEach(btn => {
    btn.addEventListener("click", () => {
      currentTagFilter = btn.dataset.tag || "All";
      renderTasks();
    });
  });
}

function taskMatchesFilters(task) {
  const tags = getTaskTags(task);
  const matchesCategory = currentFilter === "All" || task.category === currentFilter;
  const matchesTag = currentTagFilter === "All" || tags.some(tag => tag.toLowerCase() === currentTagFilter.toLowerCase());
  const matchesSearch = !searchQuery || [task.text, task.category, task.priority, ...tags].join(" ").toLowerCase().includes(searchQuery);
  return matchesCategory && matchesTag && matchesSearch;
}

// Quick templates: populate input/category/priority when a template is chosen
if (taskTemplate) {
  taskTemplate.addEventListener("change", () => {
    const val = taskTemplate.value;
    if (!val) return;
    try {
      const obj = JSON.parse(val);
      taskInput.value = obj.text || "";
      if (obj.category && categorySelect) categorySelect.value = obj.category;
      const prioritySelect = document.getElementById("prioritySelect");
      if (prioritySelect && obj.priority) prioritySelect.value = obj.priority;
      if (taskTagsInput && obj.tags) {
        const templateTags = Array.isArray(obj.tags) ? obj.tags.join(", ") : obj.tags;
        taskTagsInput.value = templateTags || "";
      }
      taskInput.focus();
      // Reset template selector for next use
      taskTemplate.value = "";
    } catch (e) {
      console.error("Invalid template JSON", e);
    }
  });
}


// Footer enhancements: newsletter subscribe, dynamic year, back-to-top
document.addEventListener('DOMContentLoaded', () => {
  // Dynamic year
  try {
    const yearEl = document.getElementById('footerCopyright');
    if (yearEl) {
      const yr = new Date().getFullYear();
      yearEl.innerHTML = `&copy; ${yr} TaskQuest. All rights reserved.`;
    }
  } catch(e){}

  // Newsletter subscribe
  const subscribeBtn = document.getElementById('subscribeBtn');
  const emailInput = document.getElementById('footerEmail');
  const subscribeMsg = document.getElementById('subscribeMsg');
  if (subscribeBtn && emailInput) {
    subscribeBtn.addEventListener('click', () => {
      const email = emailInput.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        subscribeMsg.textContent = 'Please enter a valid email address.';
        subscribeMsg.style.color = '#f97316';
        return;
      }
      try {
        const stored = JSON.parse(localStorage.getItem('newsletter_subscribers') || '[]');
        if (!stored.includes(email)) stored.push(email);
        localStorage.setItem('newsletter_subscribers', JSON.stringify(stored));
        subscribeMsg.textContent = 'Thanks — you are subscribed!';
        subscribeMsg.style.color = '#10b981';
        emailInput.value = '';
        setTimeout(() => subscribeMsg.textContent = '', 4000);
      } catch (e) {
        subscribeMsg.textContent = 'Subscription failed. Please try again.';
        subscribeMsg.style.color = '#ef4444';
      }
    });
  }

  // Back to top behavior
  const backBtn = document.getElementById('backToTopBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    window.addEventListener('scroll', () => {
      if (window.scrollY > 220) backBtn.classList.add('show'); else backBtn.classList.remove('show');
    });
  }

  // Sound toggle setup
  try {
    updateSoundButtonUI();
    const soundBtn = document.getElementById('soundToggleBtn');
    if (soundBtn) {
      soundBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleSound();
      });
    }
    // Ensure audio context resumes on first user gesture (best-effort)
    const resumeOnInteract = () => {
      if (!audioState.muted) {
        const ctx = ensureAudioContext();
        if (ctx && ctx.state === 'suspended') ctx.resume().catch(()=>{});
      }
      window.removeEventListener('click', resumeOnInteract);
    };
    window.addEventListener('click', resumeOnInteract);
  } catch (e) {}
});


// Sidebar metrics elements
const totalTasks = document.getElementById("totalTasks");
const completedTasks = document.getElementById("completedTasks");
const points = document.getElementById("coins");
const streakCount = document.getElementById("streakCount");
const xpFill = document.getElementById("xpFill");
const xpText = document.getElementById("xpText");

// Filters & Navigation
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");
const filterBtns = document.querySelectorAll(".filters .filter-btn[data-filter]");
const sortBtns = document.querySelectorAll(".filters .filter-btn[data-sort]");

// Global states (Removed duplicates)
let tasks = [];
let exams = [];
let vaultFiles = [];
let projects = [];
let recurringTemplates = [];
let timetableEntries = [];
let currentFilter = "All";
let currentSort = "default";
let searchQuery = "";
let currentView = "list";
let smartSortEnabled = false; 
let performanceData = [];
let timetable = [];

// Flashcards state
let flashcards = [];
let flashcardOrder = [];
let currentFlashIndex = 0;
let flashShuffleEnabled = false;
let flashSubjectFilter = "All";
let calendarEvents = [];
let subjects = [];
let currentCalendarDate = new Date();
let coins = 0;
let streak = 0;
let xp = 120;
let currentStudyView = "weekly";
let currentCalendarView = 'month';
let profile = { name: "Student Hero", gender: "Male", class: "Class 10", title: "Focus Warrior ⚔️", photo: null };

// Chart.js instances
let studyChartInstance = null;
let categoryChartInstance = null;
let completionTrendChartInstance = null;

// Analytics data structure
let analyticsData = {
  dailyStudyMinutes: {},       // e.g. { "2026-05-18": 45.5 }
  completedTasksPerDay: {},    // e.g. { "2026-05-18": 3 }
  dailyScoreHistory: {},       // e.g. { "2026-05-18": 240 }
  categoryStats: {
    Theory: { created: 0, completed: 0 },
    Practical: { created: 0, completed: 0 },
    Assignment: { created: 0, completed: 0 },
    Revision: { created: 0, completed: 0 }
  },
  longestStreak: 0,
  currentStreak: 0,
  lastActiveDate: null,
  productivityRecords: {
    highestScore: 0,
    bestProductiveDay: null,
    highestTasksInDay: 0,
    highestStudyMinutes: 0,
    bestStudyDay: null
  },
  unlockedAchievements: [],    // e.g. ["novice", "spark"]
  unlockedMilestones: []       // e.g. ["30mins", "60mins"]
};

// Achievement specifications
const achievementSpecs = [
  { 
    id: "novice", 
    title: "Novice Scholar", 
    desc: "Complete your first quest!", 
    icon: "🎓", 
    rarity: "Common",
    reward: 20,
    check: () => getCompletedQuestsCount() >= 1,
    progress: () => {
      const completed = getCompletedQuestsCount();
      return { current: completed, target: 1, percent: Math.min(100, (completed / 1) * 100) };
    }
  },
  { 
    id: "spark", 
    title: "Productivity Spark", 
    desc: "Complete 5 quests!", 
    icon: "⚡", 
    rarity: "Rare",
    reward: 50,
    check: () => getCompletedQuestsCount() >= 5,
    progress: () => {
      const completed = getCompletedQuestsCount();
      return { current: completed, target: 5, percent: Math.min(100, (completed / 5) * 100) };
    }
  },
  { 
    id: "streak_flame", 
    title: "Streak Flame", 
    desc: "Reach a 3-day active streak!", 
    icon: "🔥", 
    rarity: "Rare",
    reward: 50,
    check: () => (analyticsData.currentStreak || 0) >= 3,
    progress: () => {
      const current = analyticsData.currentStreak || 0;
      return { current, target: 3, percent: Math.min(100, (current / 3) * 100) };
    }
  },
  { 
    id: "focus_master", 
    title: "Focus Master", 
    desc: "Accumulate 60 minutes of study!", 
    icon: "🧭", 
    rarity: "Epic",
    reward: 150,
    check: () => getCumulativeStudyMinutes() >= 60,
    progress: () => {
      const mins = Math.round(getCumulativeStudyMinutes());
      return { current: mins, target: 60, percent: Math.min(100, (mins / 60) * 100) };
    }
  },
  { 
    id: "quest_master", 
    title: "Quest Master Elite", 
    desc: "Complete 15 quests!", 
    icon: "🏆", 
    rarity: "Legendary",
    reward: 300,
    check: () => getCompletedQuestsCount() >= 15,
    progress: () => {
      const completed = getCompletedQuestsCount();
      return { current: completed, target: 15, percent: Math.min(100, (completed / 15) * 100) };
    }
  },
  { 
    id: "champion", 
    title: "Grand Champion", 
    desc: "Reach Level 5!", 
    icon: "👑", 
    rarity: "Legendary",
    reward: 500,
    check: () => getLevelNumber() >= 5,
    progress: () => {
      const lvl = getLevelNumber();
      return { current: lvl, target: 5, percent: Math.min(100, (lvl / 5) * 100) };
    }
  }
];

// Focus milestones specifications
const milestoneSpecs = [
  { id: "30mins", title: "Focus Apprentice", desc: "Studied for 30 minutes cumulative!", minutes: 30, reward: 50 },
  { id: "60mins", title: "Focus Elite", desc: "Studied for 60 minutes cumulative!", minutes: 60, reward: 100 },
  { id: "120mins", title: "Focus Overlord", desc: "Studied for 120 minutes cumulative!", minutes: 120, reward: 200 }
];

// ==========================================================================
// 1. DATA INITIALIZATION & LOCALSTORAGE MANAGEMENT
// ==========================================================================

function setTheme(themeName) {
  document.body.setAttribute("data-theme", themeName);
  localStorage.setItem("quests_theme", themeName);

  // Sunset is our custom light mode theme
  if (themeName === "sunset") {
    document.body.classList.add("light");
  } else {
    document.body.classList.remove("light");
  }

  // Update visual dot selector state
  document.querySelectorAll(".theme-dot").forEach(dot => {
    const isCurrent = dot.dataset.theme === themeName;
    dot.classList.toggle("active", isCurrent);
    dot.setAttribute("aria-pressed", isCurrent ? "true" : "false");
  });

  // Re-render active charts to match new theme guidelines
  if (document.getElementById("analytics-tab").classList.contains("active")) {
    initStudyHoursChart();
    initCategoryChart();
  }
}

function loadData() {
  // Load tasks
  const savedTasks = localStorage.getItem("quests");
  if (savedTasks) {
    try {
      tasks = JSON.parse(savedTasks);
      // Ensure all loaded tasks have the penaltyApplied property
      tasks.forEach(task => {
        if (task.penaltyApplied === undefined) {
          task.penaltyApplied = false;
        }
        if (!Array.isArray(task.tags)) {
          task.tags = typeof task.tags === "string" ? parseTags(task.tags) : [];
        } else {
          task.tags = parseTags(task.tags.join(", "));
        }
        // Normalize recurrence fields
        if (!task.recurrence) task.recurrence = null;
        if (!task.masterId && task.recurrence) {
          // create a lightweight masterId if missing for compatibility
          task.masterId = `rt-${task.id}`;
          // ensure template exists
          if (!recurringTemplates.find(t => t.id === task.masterId)) {
            recurringTemplates.push({ id: task.masterId, text: task.text, category: task.category, priority: task.priority, recurrence: task.recurrence, active: true, startDate: task.createdAt || new Date().toISOString() });
          }
        }
      });
      // Ensure dependency arrays are normalized
      tasks.forEach(task => {
        if (!task.depends) task.depends = [];
        if (!Array.isArray(task.depends)) {
          // support comma-separated string legacy
          task.depends = typeof task.depends === 'string' ? task.depends.split(/[,\s]+/).filter(Boolean).map(id => parseInt(id)) : [];
        } else {
          task.depends = task.depends.map(id => parseInt(id)).filter(Boolean);
        }
      });
    } catch (e) {
      tasks = [];
    }
  }

  // Load exams
  const savedExams = localStorage.getItem("quests_exams");
  if (savedExams) {
    try {
      exams = JSON.parse(savedExams);
    } catch (e) {
      exams = [];
    }
  }

  // Load vault files
  const savedVault = localStorage.getItem("quests_vault");
  if (savedVault) {
    try {
      vaultFiles = JSON.parse(savedVault);
    } catch (e) {
      vaultFiles = [];
    }
  }

  // Load projects
  const savedProjects = localStorage.getItem("quests_projects");
  if (savedProjects) {
    try {
      projects = JSON.parse(savedProjects);
    } catch (e) {
      projects = [];
    }
  }

  // Load gamification points
  coins = parseInt(localStorage.getItem("coins")) || 0;
  streak = parseInt(localStorage.getItem("streak")) || 0;
  xp = parseInt(localStorage.getItem("xp")) || 120;

  // Load active theme color
  const savedTheme = localStorage.getItem("quests_theme") || "cosmic";
  setTheme(savedTheme);

  // Load analytics data
  const savedAnalytics = localStorage.getItem("quests_analytics");
  if (savedAnalytics) {
    try {
      analyticsData = JSON.parse(savedAnalytics);
      if (!analyticsData.unlockedAchievements) analyticsData.unlockedAchievements = [];
      if (!analyticsData.unlockedMilestones) analyticsData.unlockedMilestones = [];
      if (!analyticsData.dailyScoreHistory) analyticsData.dailyScoreHistory = {};
      if (!analyticsData.productivityRecords) {
        analyticsData.productivityRecords = {
          highestScore: 0,
          bestProductiveDay: null,
          highestTasksInDay: 0,
          highestStudyMinutes: 0,
          bestStudyDay: null
        };
      }
    } catch (e) {
      initializeAnalyticsData();
    }
  } else {
    initializeAnalyticsData();
  }

  // Load profile
  const savedProfile = localStorage.getItem("quests_profile");
  if (savedProfile) {
    try {
      profile = JSON.parse(savedProfile);
      if (!profile.title) profile.title = "Focus Warrior ⚔️";
      if (!profile.photo) profile.photo = null;
    } catch (e) {
      profile = { name: "Student Hero", gender: "Male", class: "Class 10", title: "Focus Warrior ⚔️", photo: null };
    }
  }

  // Load Performance Data
  const savedPerformance = localStorage.getItem("quests_performance");
  if (savedPerformance) {
    try {
      performanceData = JSON.parse(savedPerformance);
    } catch (e) {
      performanceData = [];
    }
  }

  // Load Timetable
  const savedTimetable = localStorage.getItem("quests_timetable");
  if (savedTimetable) {
    try {
      timetable = JSON.parse(savedTimetable);
    } catch (e) {
      timetable = [];
    }
  }

  // Load Subjects
  const savedSubjects = localStorage.getItem("quests_subjects");
  if (savedSubjects) {
    try {
      subjects = JSON.parse(savedSubjects);
    } catch (e) {
      subjects = [];
    }
  }

  // Load Calendar Events
  const savedCalendar = localStorage.getItem('quests_calendar');
  if (savedCalendar) {
    try {
      calendarEvents = JSON.parse(savedCalendar);
    } catch (e) {
      calendarEvents = [];
    }
  }

  // Load recurring templates
  try {
    const raw = localStorage.getItem('recurring_templates');
    recurringTemplates = raw ? JSON.parse(raw) : [];
  } catch (e) { recurringTemplates = []; }

  // Load timetable
  try {
    const rawT = localStorage.getItem('timetable_entries');
    timetableEntries = rawT ? JSON.parse(rawT) : [];
  } catch (e) { timetableEntries = []; }
}

function saveData() {
  localStorage.setItem("quests", JSON.stringify(tasks));
  localStorage.setItem("quests_exams", JSON.stringify(exams));
  localStorage.setItem("quests_vault", JSON.stringify(vaultFiles));
  localStorage.setItem("quests_projects", JSON.stringify(projects));
  localStorage.setItem("coins", coins);
  localStorage.setItem("streak", streak);
  localStorage.setItem("xp", xp);
  localStorage.setItem("quests_analytics", JSON.stringify(analyticsData));
  localStorage.setItem("quests_profile", JSON.stringify(profile));
  localStorage.setItem("quests_performance", JSON.stringify(performanceData));
  localStorage.setItem("quests_timetable", JSON.stringify(timetable));
  localStorage.setItem("quests_subjects", JSON.stringify(subjects));
  localStorage.setItem("quests_calendar", JSON.stringify(calendarEvents));
  // persist recurring templates
  try { localStorage.setItem('recurring_templates', JSON.stringify(recurringTemplates || [])); } catch(e){}
  try { localStorage.setItem('timetable_entries', JSON.stringify(timetableEntries || [])); } catch(e){}
}

// ==========================
// Notifications Center
// ==========================
let notifications = [];

function loadNotifications() {
  try {
    const raw = localStorage.getItem('quests_notifications');
    notifications = raw ? JSON.parse(raw) : [];
  } catch (e) {
    notifications = [];
  }
}

function saveNotifications() {
  try {
    localStorage.setItem('quests_notifications', JSON.stringify(notifications));
  } catch (e) {
    console.error('Failed saving notifications', e);
  }
}

function addNotification({ id, type = 'info', title, body, time = Date.now(), ref } = {}) {
  if (!id) id = `${type}-${Date.now()}-${Math.floor(Math.random()*1000)}`;
  // avoid duplicate for same ref/type
  if (ref) {
    const exists = notifications.find(n => n.ref === ref && n.type === type);
    if (exists) return exists;
  }

  const n = { id, type, title, body, time, read: false, ref };
  notifications.unshift(n);
  saveNotifications();
  renderNotificationPanel();
  updateNotificationBadge();
  return n;
}

function markAsRead(id) {
  const n = notifications.find(x => x.id === id);
  if (n && !n.read) {
    n.read = true;
    saveNotifications();
    renderNotificationPanel();
    updateNotificationBadge();
  }
}

function markAllRead() {
  notifications.forEach(n => n.read = true);
  saveNotifications();
  renderNotificationPanel();
  updateNotificationBadge();
}

function clearAllNotifications() {
  notifications = [];
  saveNotifications();
  renderNotificationPanel();
  updateNotificationBadge();
}

function updateNotificationBadge() {
  const badge = document.getElementById('notificationBadge');
  const unread = notifications.filter(n => !n.read).length;
  if (badge) {
    if (unread > 0) { badge.style.display = 'inline-block'; badge.textContent = unread; }
    else { badge.style.display = 'none'; }
  }
}

function renderNotificationPanel() {
  const list = document.getElementById('notificationsList');
  const empty = document.getElementById('noNotifications');
  if (!list || !empty) return;
  list.innerHTML = '';
  if (!notifications || notifications.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  notifications.slice(0, 100).forEach(n => {
    const item = document.createElement('div');
    item.className = `notif-item ${n.read ? '' : 'unread'}`;
    item.setAttribute('data-id', n.id);

    const icon = document.createElement('div');
    icon.className = 'notif-icon';
    icon.textContent = n.type === 'exam' ? '📚' : (n.type === 'deadline' ? '⏰' : (n.type === 'achievement' ? '🏆' : '🔔'));

    const body = document.createElement('div');
    body.className = 'notif-body';
    const h = document.createElement('div');
    h.innerHTML = `<strong>${escapeHtml(n.title)}</strong>`;
    const p = document.createElement('div');
    p.textContent = n.body;
    p.className = 'notif-time';
    const time = document.createElement('div');
    time.className = 'notif-time';
    time.textContent = new Date(n.time).toLocaleString();

    body.appendChild(h);
    body.appendChild(p);
    body.appendChild(time);

    const actions = document.createElement('div');
    actions.className = 'notif-actions';
    const btn = document.createElement('button');
    btn.className = 'view-btn small';
    btn.textContent = n.read ? 'Read' : 'Mark read';
    btn.addEventListener('click', () => {
      markAsRead(n.id);
    });

    actions.appendChild(btn);

    item.appendChild(icon);
    item.appendChild(body);
    item.appendChild(actions);

    list.appendChild(item);
  });
}

// Toggle panel visibility
function toggleNotificationPanel(show) {
  const panel = document.getElementById('notificationPanel');
  const bell = document.getElementById('notificationBell');
  if (!panel || !bell) return;
  const isOpen = panel.style.display === 'block';
  if (typeof show === 'boolean') {
    panel.style.display = show ? 'block' : 'none';
    bell.setAttribute('aria-expanded', show ? 'true' : 'false');
  } else {
    panel.style.display = isOpen ? 'none' : 'block';
    bell.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
  }
}


// ==========================

// Drag & Drop: Persist order
// ==========================
function enableDragAndDrop() {
  // Task list (div), daily goals (ul), assignments (div)
  const dailyGoalsList = document.getElementById("dailyGoalsList");
  const asgnList = document.getElementById("asgnList");

  // Generic initializer for a container whose children are sortable
  function makeSortable(container, type) {
    if (!container) return;
    container.classList.add("sortable-list");

    let dragEl = null;

    container.addEventListener("dragstart", (e) => {
      dragEl = e.target;
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', 'drag'); } catch (err) {}
      e.target.classList.add('dragging');
      requestAnimationFrame(() => e.target.style.opacity = '0.6');
    });

    container.addEventListener("dragend", (e) => {
      if (e.target) e.target.classList.remove('dragging');
      if (e.target) e.target.style.opacity = '';
      dragEl = null;
      persistOrder(type);
    });

    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(container, e.clientY);
      const dragging = container.querySelector('.dragging');
      if (!dragging) return;
      if (afterElement == null) {
        container.appendChild(dragging);
      } else {
        container.insertBefore(dragging, afterElement);
      }
    });

    // Touch support for mobile (fallback)
    let touchDragEl = null;
    container.addEventListener('touchstart', (e) => {
      const target = e.target.closest('[data-id]');
      if (!target) return;
      touchDragEl = target;
      target.classList.add('dragging');
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      if (!touchDragEl) return;
      const touch = e.touches[0];
      const after = getDragAfterElement(container, touch.clientY);
      if (after == null) container.appendChild(touchDragEl);
      else container.insertBefore(touchDragEl, after);
      e.preventDefault();
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
      if (touchDragEl) touchDragEl.classList.remove('dragging');
      touchDragEl = null;
      persistOrder(type);
    });
  }

  makeSortable(taskList, 'tasks');
  makeSortable(dailyGoalsList, 'dailyGoals');
  makeSortable(asgnList, 'assignments');
}

// removed duplicate getDragAfterElement (using generic version below)

function persistOrder(type) {
  try {
    if (type === 'tasks') {
      // Collect ids from taskList children in order
      const ids = Array.from(taskList.querySelectorAll('[data-id]')).map(n => n.dataset.id);
      // Reorder tasks array to match ids
      tasks = ids.map(id => tasks.find(t => String(t.id) === String(id))).filter(Boolean);
      saveData();
      renderTasks();
    } else if (type === 'dailyGoals') {
      const daily = document.getElementById('dailyGoalsList');
      const goals = Array.from(daily.querySelectorAll('[data-id]')).map(n => n.dataset.id);
      const stored = JSON.parse(localStorage.getItem('daily_goals') || '[]');
      const newOrder = goals.map(id => stored.find(g => String(g.id) === String(id))).filter(Boolean);
      localStorage.setItem('daily_goals', JSON.stringify(newOrder));
      renderDailyGoals();
    } else if (type === 'assignments') {
      const asgn = document.getElementById('asgnList');
      const order = Array.from(asgn.querySelectorAll('[data-id]')).map(n => n.dataset.id);
      const stored = JSON.parse(localStorage.getItem('quests_exams') || '[]');
      const newOrder = order.map(id => stored.find(a => String(a.id) === String(id))).filter(Boolean);
      localStorage.setItem('quests_exams', JSON.stringify(newOrder));
      loadData();
      renderAssignments();
    }
  } catch (e) {
    console.error('Persist order failed', e);
  }
}

// Initialize drag & drop after DOM ready and initial render
document.addEventListener('DOMContentLoaded', () => {
  enableDragAndDrop();
});

// Generate beautiful visual mock data for past 15 days if empty
function initializeAnalyticsData() {
  analyticsData = {
    dailyStudyMinutes: {},
    completedTasksPerDay: {},
    categoryStats: {
      Theory: { created: 12, completed: 8 },
      Practical: { created: 8, completed: 6 },
      Assignment: { created: 15, completed: 11 },
      Revision: { created: 10, completed: 9 }
    },
    longestStreak: 8,
    currentStreak: 4,
    lastActiveDate: null,
    unlockedAchievements: ["novice"],
    unlockedMilestones: ["30mins"],
    focusHistory: [
      { timestamp: Date.now() - 3600000 * 2, duration: 25, category: "Theory", rewardXp: 100 },
      { timestamp: Date.now() - 86400000 - 3600000 * 3, duration: 25, category: "Practical", rewardXp: 100 },
      { timestamp: Date.now() - 86400000 * 2 - 3600000 * 4, duration: 25, category: "Assignment", rewardXp: 100 }
    ]
  };

  // Seed study time and task completions for the last 15 days
  const today = new Date();
  for (let i = 15; i >= 0; i--) {
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - i);
    const dateStr = getFormattedDate(pastDate);
    
    // Random study minutes between 15 and 90 mins (some days 0)
    const activeDay = Math.random() > 0.15;
    analyticsData.dailyStudyMinutes[dateStr] = activeDay ? Math.round(15 + Math.random() * 75) : 0;
    
    // Random task completions between 1 and 4
    analyticsData.completedTasksPerDay[dateStr] = activeDay ? Math.round(1 + Math.random() * 3) : 0;
  }
  
  saveData();
}

// Heatmap renderer: GitHub-style contribution grid showing daily study minutes
function renderHeatmap(weeks = 15) {
  const container = document.getElementById('heatmapContainer');
  if (!container) return;
  // Build date range starting (weeks * 7) days ago
  const today = new Date();
  const totalDays = weeks * 7;
  const startDate = new Date();
  startDate.setDate(today.getDate() - (totalDays - 1));

  // Collect values for normalization
  const valueByDate = {};
  const dates = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const k = getFormattedDate(d);
    const mins = analyticsData.dailyStudyMinutes?.[k] || 0;
    const tasksDone = analyticsData.completedTasksPerDay?.[k] || 0;
    // Prefer minutes, otherwise fallback to tasksDone*20 for visible signal
    const value = mins || (tasksDone ? tasksDone * 20 : 0);
    valueByDate[k] = { date: new Date(d), value, mins, tasksDone };
    dates.push(k);
  }

  const maxVal = Math.max(1, ...dates.map(k => valueByDate[k].value));

  // Clear container
  container.innerHTML = '';

  // Create weeks columns (each column contains 7 day boxes)
  for (let w = 0; w < weeks; w++) {
    const weekDiv = document.createElement('div');
    weekDiv.className = 'heatmap-week';

    for (let d = 0; d < 7; d++) {
      const index = w * 7 + d;
      const key = dates[index];
      const meta = valueByDate[key] || { date: null, value: 0, mins: 0, tasksDone: 0 };
      const level = Math.min(4, Math.floor((meta.value / maxVal) * 4));

      const dayEl = document.createElement('div');
      dayEl.className = `heatmap-day level-${level}`;
      dayEl.setAttribute('data-date', key || '');
      dayEl.setAttribute('data-mins', meta.mins || 0);
      dayEl.setAttribute('data-tasks', meta.tasksDone || 0);

      // Tooltip handling
      dayEl.addEventListener('mouseenter', (ev) => showHeatmapTooltip(ev, meta));
      dayEl.addEventListener('mousemove', (ev) => moveHeatmapTooltip(ev));
      dayEl.addEventListener('mouseleave', hideHeatmapTooltip);

      weekDiv.appendChild(dayEl);
    }

    container.appendChild(weekDiv);
  }
}

function formatHeatmapDate(date) {
  if (!date) return '';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// Tooltip element (singleton)
let _heatmapTooltipEl = null;
function ensureHeatmapTooltip() {
  if (!_heatmapTooltipEl) {
    _heatmapTooltipEl = document.createElement('div');
    _heatmapTooltipEl.className = 'heatmap-tooltip';
    _heatmapTooltipEl.style.display = 'none';
    document.body.appendChild(_heatmapTooltipEl);
  }
  return _heatmapTooltipEl;
}

function showHeatmapTooltip(ev, meta) {
  const el = ensureHeatmapTooltip();
  const dateStr = meta.date ? formatHeatmapDate(meta.date) : ev.target.dataset.date;
  const mins = meta.mins || parseInt(ev.target.dataset.mins || 0, 10);
  const tasks = meta.tasksDone || parseInt(ev.target.dataset.tasks || 0, 10);
  el.innerHTML = `<strong>${dateStr}</strong><div style="margin-top:6px">Study: <strong>${mins} min</strong><br/>Tasks: <strong>${tasks}</strong></div>`;
  el.style.display = 'block';
  positionHeatmapTooltip(ev);
}

function moveHeatmapTooltip(ev) {
  positionHeatmapTooltip(ev);
}

function positionHeatmapTooltip(ev) {
  const el = ensureHeatmapTooltip();
  const padding = 12;
  const x = ev.clientX + padding;
  const y = ev.clientY + padding;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
}

function hideHeatmapTooltip() {
  const el = ensureHeatmapTooltip();
  el.style.display = 'none';
}

function getFormattedDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getFormattedDateTime(date) {
  const d = getFormattedDate(date);
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${d} ${hh}:${min}`;
}

// Helper to check if theme is currently light
function isLightTheme() {
  return document.body.classList.contains("light");
}

// Safe browser notification sender
function sendNotification(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification(title, { body });
      }
    });
  }
}

// Helper evaluations for achievements
function getCompletedQuestsCount() {
  return tasks.filter(t => t.completed).length;
}

function getCumulativeStudyMinutes() {
  return Object.values(analyticsData.dailyStudyMinutes).reduce((a, b) => a + b, 0);
}

function getLevelNumber() {
  return Math.floor(xp / 300) + 1;
}

// ==========================================================================
// 2. CONFETTI & OVERLAY POPUPS ENGINE
// ==========================================================================

// Pure, performant hardware-accelerated CSS particle Confetti
function triggerConfetti() {
  const container = document.getElementById("confettiContainer");
  if (!container) return;
  container.innerHTML = "";

  const colors = ["#a855f7", "#06b6d4", "#ec4899", "#3b82f6", "#f59e0b", "#10b981"];
  const particleCount = 120;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement("div");
    particle.className = "confetti-particle";

    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100; // % viewport width
    const delay = Math.random() * 2.5; // seconds
    const duration = 2 + Math.random() * 2.5; // seconds
    const size = 6 + Math.random() * 8; // px

    particle.style.background = color;
    particle.style.left = `${left}vw`;
    particle.style.animationDelay = `${delay}s`;
    particle.style.animationDuration = `${duration}s`;
    particle.style.width = `${size}px`;
    particle.style.height = `${size * 1.6}px`;
    particle.style.transform = `rotate(${Math.random() * 360}deg)`;

    container.appendChild(particle);
  }
  
  // Clear elements after animation ends
  setTimeout(() => {
    container.innerHTML = "";
  }, 5000);
}

// Trigger sliding Toast Alert when achievement is newly unlocked
function triggerAchievementToast(achievementName) {
  const toast = document.getElementById("achievementToast");
  const toastName = document.getElementById("toastAchievementName");
  if (!toast || !toastName) return;
  try { playSound('achievement'); } catch (err) {}
  toastName.textContent = achievementName;
  toast.classList.add("show");
  triggerConfetti();

  setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}

// Check level ups dynamically on XP updates
function checkLevelUp(oldXp, newXp) {
  const oldLevel = Math.floor(oldXp / 300) + 1;
  const newLevel = Math.floor(newXp / 300) + 1;

  if (newLevel > oldLevel) {
    // Open Level Up Dialog
    const overlay = document.getElementById("levelUpPopupOverlay");
    const popup = document.getElementById("levelUpPopup");
    const levelText = document.getElementById("popupLevelText");

    if (overlay && popup && levelText) {
      levelText.textContent = `Level ${newLevel}`;
      overlay.classList.add("active");
      popup.classList.add("active");
      triggerConfetti();
      announce(`Level up! You reached Level ${newLevel}. Claim rewards.`);
      enableFocusTrap(popup);

      // Add rewards
      coins += 50;
      xp += 100; // Bonus XP
      saveData();
      updateGamification();
    }
  }
}

// Evaluation check of locked achievements
function checkAchievements() {
  let newlyUnlocked = false;

  achievementSpecs.forEach(ach => {
    if (!analyticsData.unlockedAchievements.includes(ach.id)) {
      if (ach.check()) {
        analyticsData.unlockedAchievements.push(ach.id);
        triggerAchievementToast(ach.title);
        // Add notification for achievement
        addNotification({ type: 'achievement', title: `Achievement unlocked: ${ach.title}`, body: ach.desc, ref: `ach-${ach.id}` });
        newlyUnlocked = true;
      }
    }
  });

  if (newlyUnlocked) {
    saveData();
    renderAchievements();
  }
}

// Evaluation check of cumulative study milestones
function checkStudyMilestones() {
  const cumulativeMins = getCumulativeStudyMinutes();

  milestoneSpecs.forEach(mil => {
    if (!analyticsData.unlockedMilestones.includes(mil.id)) {
      if (cumulativeMins >= mil.minutes) {
        analyticsData.unlockedMilestones.push(mil.id);
        
        // Open Milestone Dialog popup
        const overlay = document.getElementById("milestonePopupOverlay");
        const popup = document.getElementById("milestonePopup");
        const title = document.getElementById("milestoneTitle");
        const desc = document.getElementById("milestoneDesc");

        if (overlay && popup && title && desc) {
          title.textContent = mil.title;
          desc.textContent = mil.desc;
          overlay.classList.add("active");
          popup.classList.add("active");
          triggerConfetti();
          announce(`Milestone unlocked: ${mil.title}. ${mil.desc}`);
          enableFocusTrap(popup);

          // Add milestone reward
          coins += mil.reward;
          saveData();
          updateGamification();
        }
      }
    }
  });
}

// Accessibility Helpers: Screen Reader Announcements and Focus Traps
let activeFocusTrap = null;
let focusReturnEl = null;

function announce(message) {
  const container = document.getElementById("srAnnouncement");
  if (container) {
    container.textContent = "";
    // Trigger small delay to force some screen readers to announce updates
    setTimeout(() => {
      container.textContent = message;
    }, 50);
  }
}

function enableFocusTrap(modalEl) {
  focusReturnEl = document.activeElement;
  activeFocusTrap = modalEl;
  
  setTimeout(() => {
    const focusables = modalEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusables.length > 0) {
      focusables[0].focus();
    }
  }, 150);
}

function disableFocusTrap() {
  activeFocusTrap = null;
  if (focusReturnEl && typeof focusReturnEl.focus === "function") {
    focusReturnEl.focus();
    focusReturnEl = null;
  }
}

function handleFocusTrapKey(e) {
  if (!activeFocusTrap) return;
  if (e.key === 'Tab') {
    const focusables = Array.from(activeFocusTrap.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  }
}

document.addEventListener("keydown", handleFocusTrapKey);

// Dismiss popup buttons click listeners
document.getElementById("claimLevelBtn")?.addEventListener("click", (e) => {
  triggerCoinExplosion(e);
  document.getElementById("levelUpPopupOverlay").classList.remove("active");
  document.getElementById("levelUpPopup").classList.remove("active");
  disableFocusTrap();
});

document.getElementById("claimMilestoneBtn")?.addEventListener("click", (e) => {
  triggerCoinExplosion(e);
  document.getElementById("milestonePopupOverlay").classList.remove("active");
  document.getElementById("milestonePopup").classList.remove("active");
  disableFocusTrap();
});

// ==========================================================================
// 3. CORE TASK / QUESTS CONTROLLERS
// ==========================================================================

function addTask() {
  const text = taskInput.value.trim();
  const category = categorySelect.value;

  const prioritySelect = document.getElementById("prioritySelect");
  const priority = prioritySelect ? prioritySelect.value : "Medium";
  const tags = parseTags(taskTagsInput ? taskTagsInput.value : "");

  const deadlineInput = document.getElementById("deadlineInput");
  const deadline = deadlineInput ? deadlineInput.value : "";
  const recurrenceSelect = document.getElementById('recurrenceSelect');
  const recurrence = recurrenceSelect ? (recurrenceSelect.value || 'none') : 'none';

  if (text === "") {
    taskInput.classList.add("input-invalid");
    taskInput.setAttribute("aria-invalid", "true");
    announce("Failed to add task. Please enter a task description.");
    setTimeout(() => {
      taskInput.classList.remove("input-invalid");
    }, 400);
    return;
  }
  if (text.length > 200) {
    if (window.showToast) window.showToast("Task description is too long (maximum 200 characters).", "warning");
    return;
  }
  taskInput.setAttribute("aria-invalid", "false");

  const task = {
    id: Date.now(),
    text,
    category,
    priority,
    completed: false,
    createdAt: getFormattedDateTime(new Date()),
    deadline: deadline || null,
    penaltyApplied: false,
    tags
  };

  // attach recurrence metadata
  if (recurrence && recurrence !== 'none') {
    task.recurrence = recurrence;
    // create a recurring template to auto-generate future instances
    const template = {
      id: `rt-${Date.now()}`,
      text,
      category,
      priority,
      recurrence,
      active: true,
      startDate: deadline || new Date().toISOString()
    };
    recurringTemplates.push(template);
    task.masterId = template.id;
  }

  // collect selected prerequisites (multiple)
  try {
    const dependsSel = document.getElementById('dependsSelect');
    if (dependsSel) {
      const selected = Array.from(dependsSel.selectedOptions).map(o => o.value).filter(v => v !== "" && v !== null && v !== undefined);
      task.depends = selected.map(v => parseInt(v)).filter(Boolean);
      // Remove any dependencies that would create a cycle
      const safeDeps = [];
      task.depends.forEach(did => {
        if (hasCircularDependency(task.id, did)) {
          if (window && window.showToast) window.showToast('Dependency removed to avoid circular reference', 'warning');
        } else {
          safeDeps.push(did);
        }
      });
      task.depends = safeDeps;
    } else {
      task.depends = [];
    }
  } catch (e) {
    task.depends = [];
  }

  tasks.push(task);
  taskInput.value = "";
  if (taskTagsInput) taskTagsInput.value = "";
  if (deadlineInput) deadlineInput.value = "";
  storeRecentTags(tags);

  // Update analytics created count
  if (!analyticsData.categoryStats[category]) {
    analyticsData.categoryStats[category] = { created: 0, completed: 0 };
  }
  analyticsData.categoryStats[category].created += 1;

  saveData();
  renderTasks();

  // Refresh calendar to reflect any deadlines
  renderCalendar();

  updateDeadlineAlerts();

  // Notify user to complete the new task ASAP
  sendNotification("Quest Assigned", `COMPLETE ${text} TASK ASAP`);

  // Show UI popup notification
  showTaskPopup(`COMPLETE ${text.toUpperCase()} TASK ASAP`);

  announce(`Task added: "${text}". Category: ${category}, Priority: ${priority}.`);
}

function createTaskEl(task) {
  const div = document.createElement("div");
  div.classList.add("task");
  div.setAttribute("draggable", "true");
  div.setAttribute("data-id", task.id);
  if (task.completed) {
    div.classList.add("completed");
  }

  const pri = task.priority || "Medium";
  const urgencyInfo = window.Prioritization ? window.Prioritization.getUrgencyInfo(task) : null;
  const urgencyBadgeHtml = urgencyInfo ? '<span class="urgency-badge ' + urgencyInfo.level + '">' + urgencyInfo.label + '</span>' : '';
  const catEmoji = getCategoryEmoji(task.category);
  const tags = getTaskTags(task);
  const subjectColor = getSubjectColor(task.category);
  const subjectTextColor = getContrastColor(subjectColor);

  div.innerHTML = `
    <div class="drag-handle" title="Drag to reorder"><i class="ri-drag-move-fill"></i></div>
    <div class="task-left">
      <div class="check-btn" tabindex="0" aria-label="Toggle completed task"></div>
      <div>
        <h3 class="task-title">${escapeHtml(task.text)}</h3>
        <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px; flex-wrap: wrap;">
          <p class="task-category" style="margin: 0;"><span class="subject-pill" style="background: ${subjectColor}; color: ${subjectTextColor};">${catEmoji} ${escapeHtml(task.category)}</span></p>
          <span class="priority-pill priority-${pri.toLowerCase()}">${pri}</span>
          ${urgencyBadgeHtml}
          ${task.recurrence && task.recurrence !== 'none' ? `<span class="recurrence-pill" data-type="${escapeHtml(task.recurrence)}" title="Recurring: ${escapeHtml(task.recurrence)}">${escapeHtml(task.recurrence)}</span>` : ''}
          ${task.depends && task.depends.length ? `<span class="dependency-pill" title="Depends on ${task.depends.length} task(s)">🔒 ${task.depends.length}</span>` : ''}
          <span class="task-timestamp" style="font-size: 11px; color: var(--text-light); opacity: 0.8;"><i class="ri-history-line"></i> ${task.createdAt}</span>
        </div>
        ${tags.length ? `<div class="task-tags">${tags.map(tag => `<span class="task-tag" style="--tag-color: ${getTagColor(tag)};"><i class="ri-price-tag-3-line"></i>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
      </div>
    </div>
    <div class="task-actions">
      <button class="icon-btn edit-btn" aria-label="Edit Quest">
        <i class="ri-edit-line"></i>
      </button>
      <button class="icon-btn delete-btn" aria-label="Delete Quest">
        <i class="ri-delete-bin-6-line"></i>
      </button>
    </div>
  `;

  // Toggle Complete event
  const checkBtn = div.querySelector(".check-btn");
  checkBtn.setAttribute("role", "checkbox");
  checkBtn.setAttribute("aria-checked", task.completed ? "true" : "false");

  const handleToggle = (e) => {
    // prevent toggling if task has unmet dependencies
    if (!task.completed && isTaskBlocked(task)) {
      const pending = (task.depends || []).map(id => tasks.find(t => t.id === id)).filter(Boolean).filter(t => !t.completed).map(t => t.text);
      const msg = `Cannot complete task until prerequisites are done: ${pending.join(', ')}`;
      if (window && window.showToast) window.showToast(msg, 'warning');
      else alert(msg);
      return;
    }
    const oldXp = xp;
    task.completed = !task.completed;
    checkBtn.setAttribute("aria-checked", task.completed ? "true" : "false");
    const todayStr = getFormattedDate(new Date());

    if (task.completed) {
      // Dynamic rewards based on priority
      let coinReward = 10;
      let xpReward = 20;
      if (task.priority === "High") { coinReward = 30; xpReward = 60; }
      else if (task.priority === "Medium") { coinReward = 20; xpReward = 40; }

      coins += coinReward;
      streak += 1;
      xp += xpReward;

      analyticsData.completedTasksPerDay[todayStr] = (analyticsData.completedTasksPerDay[todayStr] || 0) + 1;
      analyticsData.categoryStats[task.category].completed = (analyticsData.categoryStats[task.category].completed || 0) + 1;
      updateAnalyticsStreak(todayStr);
      updateProductivityRecords(todayStr);

      // Visual Feedback and Rewards
      triggerConfetti();
      if (e) triggerCoinExplosion(e);
      showTaskPopup(`QUEST CONQUERED! Gained +${coinReward} Coins & +${xpReward} XP 🏆`);
      try { playSound('complete'); } catch (err) {}
      // If this task is part of a recurring schedule, generate the next occurrence
      try {
        const recurrenceType = task.recurrence || (task.masterId && (recurringTemplates.find(t => t.id === task.masterId) || {}).recurrence);
        const masterId = task.masterId;
        if (recurrenceType && recurrenceType !== 'none') {
          // compute next deadline based on current task deadline or createdAt
          const base = task.deadline ? new Date(task.deadline) : new Date();
          const next = computeNextDeadline(recurrenceType, base);
          if (next) {
            const nextTask = {
              id: Date.now() + Math.floor(Math.random() * 1000),
              text: task.text,
              category: task.category,
              priority: task.priority,
              completed: false,
              createdAt: getFormattedDateTime(new Date()),
              deadline: next.toISOString().slice(0,16),
              penaltyApplied: false,
              tags: Array.isArray(task.tags) ? task.tags.slice() : (typeof task.tags === 'string' ? parseTags(task.tags) : []),
              recurrence: recurrenceType,
              masterId: masterId || null
            };
            // ensure template exists
            if (masterId && !recurringTemplates.find(t => t.id === masterId)) {
              recurringTemplates.push({ id: masterId, text: task.text, category: task.category, priority: task.priority, recurrence: recurrenceType, active: true, startDate: task.createdAt || new Date().toISOString() });
            }
            tasks.push(nextTask);
            if (window && window.showToast) window.showToast(`Next recurring task scheduled (${recurrenceType})`, 'success');
          }
        }
      } catch (err) {
        console.warn('Failed to schedule next recurring task', err);
      }
    } else {
      coins = Math.max(0, coins - 10);
      streak = Math.max(0, streak - 1);
      xp = Math.max(0, xp - 20);

      if (analyticsData.completedTasksPerDay[todayStr]) {
        analyticsData.completedTasksPerDay[todayStr] = Math.max(0, analyticsData.completedTasksPerDay[todayStr] - 1);
      }
      analyticsData.categoryStats[task.category].completed = Math.max(0, analyticsData.categoryStats[task.category].completed - 1);
      updateProductivityRecords(todayStr);
    }

    saveData();
    updateGamification();
    renderTasks();
    announce(`Task marked ${task.completed ? "completed" : "incomplete"}: "${task.text}"`);
    
    checkLevelUp(oldXp, xp);
    checkAchievements();
    renderWeeklyStreak();
  };

  checkBtn.addEventListener("click", (e) => handleToggle(e));
  checkBtn.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle(e);
    }
  });

  // Delete task event
  div.querySelector(".delete-btn").addEventListener("click", () => {
    // Remove references from other tasks' dependencies
    tasks.forEach(t => {
      if (Array.isArray(t.depends) && t.depends.includes(task.id)) {
        t.depends = t.depends.filter(d => d !== task.id);
      }
    });
    tasks = tasks.filter(t => t.id !== task.id);
    saveData();
    renderTasks();
    announce(`Task deleted: "${task.text}"`);
  });

  // recurrence pill click -> edit/stop recurring if this task belongs to a template
  const recEl = div.querySelector('.recurrence-pill');
  if (recEl) {
    recEl.style.cursor = 'pointer';
    recEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const masterId = task.masterId;
      if (!masterId) return alert('No recurring template found');
      const tpl = recurringTemplates.find(t => t.id === masterId);
      if (!tpl) return alert('Recurring template missing');
      const choice = prompt('Edit recurrence (none/daily/weekly/monthly) or type REMOVE to stop recurring:', tpl.recurrence || 'daily');
      if (!choice) return;
      const val = choice.trim().toLowerCase();
      if (val === 'remove' || val === 'none') {
        // remove template
        recurringTemplates = recurringTemplates.filter(t => t.id !== masterId);
        // clear recurrence flag from existing tasks
        tasks.forEach(t => { if (t.masterId === masterId) { delete t.recurrence; delete t.masterId; } });
        saveData();
        if (window && window.showToast) window.showToast('Recurring schedule removed', 'info');
      } else if (['daily','weekly','monthly'].includes(val)) {
        tpl.recurrence = val;
        saveData();
        if (window && window.showToast) window.showToast('Recurrence updated', 'success');
      } else {
        if (window && window.showToast) window.showToast('No changes made', 'info');
      }
      renderTasks();
    });
  }

  // Edit task event
  div.querySelector(".edit-btn").addEventListener("click", () => {
    const updated = prompt("Edit your quest", task.text);
    if (updated !== null && updated.trim() !== "") {
      task.text = updated;
      saveData();
      renderTasks();
      announce(`Task edited to: "${updated}"`);
    }
  });

  // HTML5 Drag Listeners on the card
  div.addEventListener("dragstart", (e) => {
    div.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
  });

  div.addEventListener("dragend", () => {
    div.classList.remove("dragging");
    saveTaskOrder();
  });

  // Mobile Touch Drag Listeners
  setupTouchDrag(div, task);

  return div;
}

// Compute next deadline Date for recurrence types
function computeNextDeadline(type, fromDate) {
  if (!fromDate || !(fromDate instanceof Date)) return null;
  const d = new Date(fromDate.getTime());
  if (type === 'daily') {
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (type === 'weekly') {
    d.setDate(d.getDate() + 7);
    return d;
  }
  if (type === 'monthly') {
    const day = d.getDate();
    d.setMonth(d.getMonth() + 1);
    // handle month rollover (e.g., Jan 31 -> Feb 28)
    if (d.getDate() !== day) {
      d.setDate(0); // go to last day of previous month
    }
    return d;
  }
  return null;
}

let touchDraggedEl = null;
let touchStartOffset = { x: 0, y: 0 };

function setupTouchDrag(el, task) {
  const handle = el.querySelector(".drag-handle");
  if (!handle) return;

  handle.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    touchDraggedEl = el;
    
    const rect = el.getBoundingClientRect();
    touchStartOffset.x = touch.clientX - rect.left;
    touchStartOffset.y = touch.clientY - rect.top;

    el.classList.add("touch-dragging-active");
    el.style.width = `${rect.width}px`;
    el.style.left = `${touch.clientX - touchStartOffset.x}px`;
    el.style.top = `${touch.clientY - touchStartOffset.y}px`;
    
    el.classList.add("dragging");
    e.stopPropagation();
  }, { passive: false });

  handle.addEventListener("touchmove", (e) => {
    if (!touchDraggedEl || touchDraggedEl !== el) return;
    e.preventDefault();

    const touch = e.touches[0];
    el.style.left = `${touch.clientX - touchStartOffset.x}px`;
    el.style.top = `${touch.clientY - touchStartOffset.y}px`;

    el.style.visibility = "hidden";
    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
    el.style.visibility = "visible";

    if (!elementUnderTouch) return;

    const targetBody = elementUnderTouch.closest(".board-column-body");
    if (targetBody && currentView === "board") {
      if (targetBody.children.length === 0) {
        targetBody.appendChild(el);
      }
    }

    const targetTask = elementUnderTouch.closest(".task");
    if (targetTask && targetTask !== el) {
      const targetRect = targetTask.getBoundingClientRect();
      const relativeY = touch.clientY - targetRect.top;
      
      const parent = targetTask.parentNode;
      if (parent) {
        if (relativeY < targetRect.height / 2) {
          parent.insertBefore(el, targetTask);
        } else {
          parent.insertBefore(el, targetTask.nextSibling);
        }
      }
    }
  }, { passive: false });

  handle.addEventListener("touchend", (e) => {
    if (!touchDraggedEl || touchDraggedEl !== el) return;
    
    el.classList.remove("touch-dragging-active");
    el.classList.remove("dragging");
    el.style.width = "";
    el.style.left = "";
    el.style.top = "";
    
    touchDraggedEl = null;
    saveTaskOrder();
  });
}

function saveTaskOrder() {
  const newTasksOrder = [];

  if (currentView === "list") {
    const taskElements = document.querySelectorAll("#taskList .task");
    taskElements.forEach(el => {
      const id = parseInt(el.getAttribute("data-id"));
      const originalTask = tasks.find(t => t.id === id);
      if (originalTask) {
        newTasksOrder.push(originalTask);
      }
    });
  } else {
    const columns = document.querySelectorAll(".board-column-body");
    columns.forEach(col => {
      const category = col.getAttribute("data-category");
      const taskElements = col.querySelectorAll(".task");
      
      taskElements.forEach(el => {
        const id = parseInt(el.getAttribute("data-id"));
        const originalTask = tasks.find(t => t.id === id);
        if (originalTask) {
          originalTask.category = category;
          newTasksOrder.push(originalTask);
        }
      });
    });
  }

  if (currentView === "list" && currentFilter !== "All") {
    const renderedIds = newTasksOrder.map(t => t.id);
    const unrenderedTasks = tasks.filter(t => !renderedIds.includes(t.id));
    tasks = [...newTasksOrder, ...unrenderedTasks];
  } else {
    tasks = newTasksOrder;
  }

  saveData();
  renderTasks();
}

// Render depends select options for the add-task form
function renderDependsSelect() {
  // Delegate to legacy helper if present
  if (typeof populateDependsSelect === 'function') return populateDependsSelect();
  const sel = document.getElementById('dependsSelect');
  if (!sel) return;
  const prev = Array.from(sel.selectedOptions).map(o => o.value);
  // Clear current options (preserve the placeholder)
  sel.innerHTML = '<option value="">No prerequisite</option>';
  tasks.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = `${t.text} (${t.category || 'General'})`;
    if (prev.includes(String(t.id))) opt.selected = true;
    sel.appendChild(opt);
  });
}

// Returns true if task has any unmet dependencies
function isTaskBlocked(task) {
  if (!task || !Array.isArray(task.depends) || task.depends.length === 0) return false;
  return task.depends.some(id => {
    const t = tasks.find(x => x.id === id);
    return !t || !t.completed;
  });
}

// Get full dependency chain for a task id (for cycle detection)
function getDependencyChain(startId, visited = new Set()) {
  if (visited.has(startId)) return [];
  visited.add(startId);
  const t = tasks.find(x => x.id === startId);
  if (!t || !Array.isArray(t.depends) || t.depends.length === 0) return [];
  let chain = [];
  t.depends.forEach(d => {
    chain.push(d);
    chain = chain.concat(getDependencyChain(d, visited));
  });
  return chain;
}

// Detect if adding a dependency would create a circular reference
function hasCircularDependency(taskId, dependsOnId) {
  // if dependsOnId already depends (directly or indirectly) on taskId, that's a cycle
  const chain = getDependencyChain(dependsOnId, new Set());
  return chain.includes(taskId);
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('[data-id]:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function setupColumnDragOver(body) {
  body.addEventListener("dragover", (e) => {
    e.preventDefault();
    body.classList.add("drag-over");
    
    const draggingEl = document.querySelector(".dragging");
    if (!draggingEl) return;

    const afterElement = getDragAfterElement(body, e.clientY);
    if (afterElement == null) {
      body.appendChild(draggingEl);
    } else {
      body.insertBefore(draggingEl, afterElement);
    }
  });

  body.addEventListener("dragleave", () => {
    body.classList.remove("drag-over");
  });

  body.addEventListener("drop", () => {
    body.classList.remove("drag-over");
    saveTaskOrder();
  });
}

function renderTasks() {
  const taskListEl = document.getElementById("taskList");
  const boardColumns = document.getElementById("boardColumns");
  const filtersDiv = document.querySelector(".filters");

  if (currentView === "list") {
    taskListEl.style.display = "flex";
    boardColumns.style.display = "none";
    if (filtersDiv) filtersDiv.style.display = "flex";

    taskListEl.innerHTML = "";
    
    let filteredTasks = tasks;
    filteredTasks = filteredTasks.filter(task => taskMatchesFilters(task));

    // Smart Sort: re-order by adaptive priority score when enabled
    if (smartSortEnabled && window.Prioritization) {
      filteredTasks = window.Prioritization.getSortedTasksByPriority(filteredTasks);
    }

    // Apply sort logic
    if (currentSort === "priority") {
      const priorityOrder = { "High": 1, "Medium": 2, "Low": 3 };
      filteredTasks.sort((a, b) => (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99));
    } else if (currentSort === "alphabetical") {
      filteredTasks.sort((a, b) => a.text.localeCompare(b.text));
    } else if (currentSort === "deadline") {
      filteredTasks.sort((a, b) => {
        const aD = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const bD = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return aD - bD;
      });
    }

    if (filteredTasks.length === 0) {
      taskListEl.innerHTML = `
        <div class="empty-state">
          <i class="ri-ghost-2-line"></i>
          <h3>No Quests Yet</h3>
          <p>Add tasks and begin your productivity journey ✨</p>
        </div>
      `;
      renderTagSuggestions();
      renderTagFilters();
      updateStats();
      return;
    }

    filteredTasks.forEach(task => {
      taskListEl.appendChild(createTaskEl(task));
    });

  } else {
    taskListEl.style.display = "none";
    boardColumns.style.display = "grid";
    if (filtersDiv) filtersDiv.style.display = "none";

    boardColumns.innerHTML = "";

    const categories = ["Theory", "Practical", "Assignment", "Revision"];
    
    categories.forEach(cat => {
      const colDiv = document.createElement("div");
      colDiv.className = "board-column";
      colDiv.setAttribute("data-category", cat);

      const colTasks = tasks.filter(t => t.category === cat);
      const catEmoji = getCategoryEmoji(cat);

      colDiv.innerHTML = `
        <div class="board-column-header">
          <div class="column-title">${catEmoji} ${cat}</div>
          <div class="column-count">${colTasks.length}</div>
        </div>
        <div class="board-column-body" data-category="${cat}"></div>
      `;

      const bodyDiv = colDiv.querySelector(".board-column-body");
      colTasks.forEach(task => {
        bodyDiv.appendChild(createTaskEl(task));
      });

      setupColumnDragOver(bodyDiv);
      boardColumns.appendChild(colDiv);
    });
  }

  renderTagSuggestions();
  renderTagFilters();
  updateStats();
  // Update dependency selector for task creation
  try { renderDependsSelect(); } catch (e) {}
  // Refresh suggestion banner if smart sort is active
  if (smartSortEnabled && window.Prioritization) {
    var _banner = document.getElementById('smartSuggestionBanner');
    if (_banner) {
      var _suggestions = window.Prioritization.getProductivitySuggestions(tasks);
      _banner.innerHTML = _suggestions
        .map(function (s) { return '<div class="smart-suggestion-item">' + s + '</div>'; })
        .join('');
    }
  }
}

// ==========================
// Priority Table View
// ==========================
function formatDeadlineText(deadline) {
  if (!deadline) return 'No deadline';
  try {
    const d = new Date(deadline);
    if (isNaN(d.getTime())) return 'Invalid';
    return d.toLocaleString();
  } catch (e) { return 'Invalid'; }
}

function isOverdue(task) {
  if (!task.deadline) return false;
  try {
    return new Date(task.deadline) < new Date() && !task.completed;
  } catch (e) { return false; }
}

function renderPriorityTable(filterPriority = 'All', sortMode = 'deadline') {
  const container = document.getElementById('priorityTableContainer');
  if (!container) return;
  container.innerHTML = '';

  const priorities = ['High', 'Medium', 'Low'];

  priorities.forEach(pr => {
    if (filterPriority !== 'All' && filterPriority !== pr) return;
    const section = document.createElement('div');
    section.className = 'priority-section';
    const hdr = document.createElement('h4');
    const badgeClass = pr === 'High' ? 'priority-high' : (pr === 'Medium' ? 'priority-medium' : 'priority-low');
    hdr.innerHTML = `<span class="priority-badge ${badgeClass}"></span>${pr} <small style="color:var(--text-light); margin-left:8px; font-weight:600;">(${tasks.filter(t=>t.priority===pr).length})</small>`;
    section.appendChild(hdr);

    let list = tasks.filter(t => (t.priority === pr));
    // Sorting
    if (sortMode === 'deadline') {
      list.sort((a,b) => {
        const aD = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const bD = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return aD - bD;
      });
    } else if (sortMode === 'overdue') {
      list.sort((a,b) => (isOverdue(b) ? 0 : 1) - (isOverdue(a) ? 0 : 1));
    }

    list.forEach(task => {
      const row = document.createElement('div');
      row.className = 'priority-row' + (isOverdue(task) ? ' priority-overdue' : '');
      const pBadge = document.createElement('span');
      pBadge.className = 'priority-badge ' + (task.priority === 'High' ? 'priority-high' : (task.priority === 'Medium' ? 'priority-medium' : 'priority-low'));
      const title = document.createElement('div');
      title.className = 'priority-title';
      title.textContent = task.text;
      const meta = document.createElement('div');
      meta.className = 'priority-meta';
      meta.textContent = `${task.category} • ${formatDeadlineText(task.deadline)}`;

      row.appendChild(pBadge);
      row.appendChild(title);
      // small tag list
      if (getTaskTags(task).length) {
        const tagsEl = document.createElement('div');
        tagsEl.style.marginLeft = '12px';
        tagsEl.style.display = 'flex';
        tagsEl.style.gap = '6px';
        getTaskTags(task).forEach(tag => {
          const t = document.createElement('span');
          t.className = 'task-tag';
          t.style.setProperty('--tag-color', getTagColor(tag));
          t.style.fontSize = '11px';
          t.style.padding = '3px 6px';
          t.textContent = tag;
          tagsEl.appendChild(t);
        });
        row.appendChild(tagsEl);
      }

      row.appendChild(meta);
      section.appendChild(row);
    });

    container.appendChild(section);
  });
}

function openPriorityModal() {
  const ov = document.getElementById('priorityModalOverlay');
  if (!ov) return;
  ov.style.display = 'flex';
  renderPriorityTable('All', 'deadline');
}

function closePriorityModal() {
  const ov = document.getElementById('priorityModalOverlay');
  if (!ov) return;
  ov.style.display = 'none';
}

// wire priority modal controls
document.addEventListener('DOMContentLoaded', () => {
  const openBtn = document.getElementById('openPriorityTableBtn');
  const closeBtn = document.getElementById('closePriorityModal');
  if (openBtn) openBtn.addEventListener('click', (e) => { e.preventDefault(); openPriorityModal(); });
  if (closeBtn) closeBtn.addEventListener('click', (e) => { e.preventDefault(); closePriorityModal(); });

  // modal filter and sort buttons
  document.getElementById('priorityModalOverlay')?.addEventListener('click', (ev) => {
    if (ev.target && ev.target.id === 'priorityModalOverlay') closePriorityModal();
  });

  const priorityContainer = document.getElementById('priorityModal');
  if (priorityContainer) {
    priorityContainer.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-priority]');
      if (btn) {
        const p = btn.dataset.priority;
        renderPriorityTable(p, 'deadline');
        return;
      }
      const s = ev.target.closest('[data-sort]');
      if (s) {
        const sortMode = s.dataset.sort;
        // find currently selected priority filter
        const activeFilterBtn = document.querySelector('#priorityModal .view-btn.small[data-priority].active') || document.querySelector('#priorityModal .view-btn.small[data-priority]');
        const p = activeFilterBtn ? (activeFilterBtn.dataset.priority || 'All') : 'All';
        renderPriorityTable(p, sortMode);
      }
    });
  }
});

function updateStats() {
  const totalTasksEl = document.getElementById("totalTasks");
  const completedTasksEl = document.getElementById("completedTasks");
  if (totalTasksEl) totalTasksEl.textContent = tasks.length;
  if (completedTasksEl) completedTasksEl.textContent = tasks.filter(task => task.completed).length;
  updateDailyQuest();
  renderDailyGoalRing();
}

function updateGamification() {
  const pointsEl = document.getElementById("coins");
  if (pointsEl) pointsEl.textContent = coins;
  if (totalTasks) totalTasks.textContent = tasks.length;
  if (completedTasks) completedTasks.textContent = getCompletedQuestsCount();
  if (streakCount) streakCount.textContent = streak;

  // Level progression bar update
  const level = getLevelNumber();
  const currentLevelXp = xp % 300;
  
  const xpLevelEl = document.getElementById("xpLevel");
  if (xpLevelEl) {
    xpLevelEl.textContent = `Level ${level}`;
  }
  
  if (xpText) xpText.textContent = `${currentLevelXp} / 300 XP`;
  
  const fillPercentage = Math.min(100, (currentLevelXp / 3));
  if (xpFill) xpFill.style.width = `${fillPercentage}%`;

  // Trigger XP fill pulse animation
  if (xpFill) {
    xpFill.classList.remove("pulse");
    void xpFill.offsetWidth; // Trigger DOM reflow to restart animation
    xpFill.classList.add("pulse");
  }
}

function updateDailyQuest() {
  const completedToday = tasks.filter(t => t.completed && t.createdAt && t.createdAt.startsWith(getFormattedDate(new Date()))).length;
  const questText = document.getElementById("questText");
  if (questText) {
    questText.textContent = `${completedToday} / 5`;
    if (completedToday >= 5) triggerConfetti();
  }
}

// ==========================================================================
// PERFORMANCE MANAGEMENT SYSTEM
// ==========================================================================

function renderPerformance() {
  const container = document.getElementById("performanceGrid");
  const statsContainer = document.getElementById("overallPerformanceStats");
  if (!container) return;
  
  container.innerHTML = "";

  if (performanceData.length === 0) {
    container.innerHTML = `
      <div class="empty-state enhanced-empty" id="performanceEmpty">
        <svg width="140" height="90" viewBox="0 0 140 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="g4" x1="0" x2="1">
              <stop offset="0" stop-color="#6366f1" />
              <stop offset="1" stop-color="#06b6d4" />
            </linearGradient>
          </defs>
          <rect x="10" y="18" width="120" height="54" rx="8" fill="url(#g4)" opacity="0.12" />
          <path d="M26 34h88v6H26z" fill="#fff" opacity="0.06" />
          <circle cx="110" cy="56" r="10" fill="url(#g4)" />
        </svg>
        <h3>No Academic Records</h3>
        <p class="muted">Add subjects and their scores to visualize your academic performance.</p>
        <div class="empty-cta-row">
          <button class="view-btn primary" id="ctaAddSubject">Add Subject</button>
        </div>
      </div>
    `;
    if (statsContainer) statsContainer.innerHTML = "";
    return;
  }

  let totalPercentage = 0;

  performanceData.forEach(item => {
    totalPercentage += item.percentage;
    let msg = "";
    let statusClass = "";

    if (item.percentage < 45) {
      msg = "No worry perform better next time";
      statusClass = "low";
    } else if (item.percentage < 80) {
      msg = "try to go higher";
      statusClass = "medium";
    } else {
      msg = "you are on right track go ahead champ";
      statusClass = "high";
    }

    const card = document.createElement("div");
    card.className = "performance-card glass";
    card.innerHTML = `
      <div class="perf-header">
        <div class="perf-info">
          <span class="perf-subject">${escapeHtml(item.name)}</span>
          <p class="perf-marks">${item.obtained} / ${item.total} Marks</p>
        </div>
        <button class="icon-btn delete-btn" style="width: 32px; height: 32px;" onclick="deletePerformance(${item.id})">
          <i class="ri-delete-bin-line"></i>
        </button>
      </div>
      <div class="perf-body">
        <span class="perf-percent ${statusClass}">${item.percentage.toFixed(1)}%</span>
        <div class="perf-progress-container">
          <div class="perf-progress-fill ${statusClass}" style="width: ${item.percentage}%"></div>
        </div>
        <p class="perf-msg ${statusClass}">${msg}</p>
      </div>
    `;
    container.appendChild(card);
  });

  // Render Average Summary
  if (statsContainer) {
    const avg = totalPercentage / performanceData.length;
    statsContainer.innerHTML = `
      <div class="storage-bar"><div class="storage-fill" style="width: ${avg}%"></div></div>
      <p id="storageText">Overall Academic Standing: <strong>${avg.toFixed(1)}%</strong></p>
    `;
  }
}

function renderSubjectTracker() {
  const grid = document.getElementById("subjectsGrid");
  if (!grid) return;
  grid.innerHTML = "";

  if (!subjects || subjects.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1; text-align:center; padding:40px;">
        <i class="ri-book-open-line" style="font-size: 2.5rem; opacity: 0.3;"></i>
        <h3>No subjects added yet</h3>
        <p>Create a subject to track homework, revision, and mastery progress.</p>
      </div>
    `;
    return;
  }

  subjects.forEach(subject => {
    const percentage = subject.total > 0 ? Math.round((subject.completed / subject.total) * 100) : 0;
    const card = document.createElement("div");
    card.className = "subject-card glass";
    card.innerHTML = `
      <div class="subject-card-header">
        <div>
          <h4>${escapeHtml(subject.title)}</h4>
          <p>${subject.completed} / ${subject.total} topics completed</p>
        </div>
        <button class="icon-btn delete-btn" onclick="deleteSubject(${subject.id})" aria-label="Delete subject"><i class="ri-delete-bin-line"></i></button>
      </div>
      <div class="subject-progress-wrap">
        <div class="subject-progress-bar">
          <div class="subject-progress-fill" style="width: ${percentage}%"></div>
        </div>
        <span class="subject-progress-label">${percentage}% mastery</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

window.deleteSubject = (id) => {
  if (confirm("Delete this subject record?")) {
    subjects = subjects.filter(s => s.id !== id);
    saveData();
    renderSubjectTracker();
    announce("Subject record removed.");
  }
};

window.deletePerformance = (id) => {
  if (confirm("Delete this academic record?")) {
    performanceData = performanceData.filter(p => p.id !== id);
    saveData();
    renderPerformance();
    announce("Record deleted.");
    showTaskPopup("RECORD REMOVED");
  }
}

// ==========================================================================
// SMART TIMETABLE SYSTEM
// ==========================================================================

function renderTimetable() {
  const container = document.getElementById("timetableGrid");
  if (!container) return;
  container.innerHTML = "";

  if (timetable.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="ri-calendar-line"></i><h3>No Schedule Set</h3><p>Start planning your week by adding study slots above.</p></div>`;
    return;
  }

  const now = new Date();
  const dayNamesShort = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDay = dayNamesShort[now.getDay()];
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  
  dayNames.forEach(day => {
    const daySlots = timetable.filter(s => s.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (daySlots.length === 0) return;

    const dayCard = document.createElement("div");
    dayCard.className = "timetable-day-card";
    dayCard.innerHTML = `<div class="timetable-day-header"><i class="ri-calendar-event-line"></i> ${day}</div>`;
    
    const slotsList = document.createElement("div");
    slotsList.className = "tt-slots-list";
    slotsList.style.display = "flex";
    slotsList.style.flexDirection = "column";
    slotsList.style.gap = "10px";

    daySlots.forEach(slot => {
      const isCurrent = slot.day === currentDay && currentTime >= slot.startTime && currentTime < slot.endTime;
      const slotEl = document.createElement("div");
      slotEl.className = `tt-slot ${isCurrent ? 'active-slot' : ''}`;
      slotEl.innerHTML = `
        <div class="tt-slot-info">
          <h4>${escapeHtml(slot.subject)} ${isCurrent ? '<span class="active-indicator">NOW STUDYING</span>' : ''}</h4>
          <p><i class="ri-time-line"></i> ${slot.startTime} - ${slot.endTime}</p>
        </div>
        <button class="icon-btn tt-delete-btn" onclick="deleteTimetableSlot(${slot.id})">
          <i class="ri-delete-bin-line"></i>
        </button>
      `;
      slotsList.appendChild(slotEl);
    });

    dayCard.appendChild(slotsList);
    container.appendChild(dayCard);
  });
}

window.deleteTimetableSlot = (id) => {
  if (confirm("Remove this study slot?")) {
    timetable = timetable.filter(s => s.id !== id);
    saveData();
    renderTimetable();
    showTaskPopup("SCHEDULE UPDATED");
  }
};

function initTimetableNotifier() {
  setInterval(() => {
    const now = new Date();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDay = dayNames[now.getDay()];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 5-minute early warning logic
    const fiveMinsLater = new Date(now.getTime() + 5 * 60000);
    const upcomingTime = `${String(fiveMinsLater.getHours()).padStart(2, '0')}:${String(fiveMinsLater.getMinutes()).padStart(2, '0')}`;

    let dataUpdated = false;

    timetable.forEach(slot => {
      // Alert 1: Session Starting NOW
      if (slot.day === currentDay && slot.startTime === currentTime) {
        if (slot.lastNotified !== currentTime) {
          const msg = `IT'S TIME FOR ${slot.subject.toUpperCase()} SESSION!`;
          showTaskPopup(msg);
          sendNotification("Study Time! 📚", `Your scheduled ${slot.subject} session starts now.`);
          slot.lastNotified = currentTime;
          dataUpdated = true;
          
          // Play a gentle alert sound if browser allows
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.4;
            audio.play();
          } catch(e) {}
        }
      }
      
      // Alert 2: Session Starting in 5 Minutes (Upcoming)
      if (slot.day === currentDay && slot.startTime === upcomingTime) {
        const upcomingKey = `warn_${upcomingTime}`;
        if (slot.lastNotified !== upcomingKey) {
          showTaskPopup(`UPCOMING: ${slot.subject.toUpperCase()} IN 5 MINS`);
          slot.lastNotified = upcomingKey;
          dataUpdated = true;
        }
      }
      
      // Reset lastNotified after a minute passes
      if (slot.lastNotified && slot.lastNotified !== currentTime && !slot.lastNotified.startsWith('warn_')) {
        slot.lastNotified = null;
        dataUpdated = true;
      }
    });

    if (dataUpdated) {
      saveData();
      renderTimetable(); // Refresh to show "NOW STUDYING" badge
    }
  }, 30000); // Check every 30 seconds
}

// ==========================================================================
// INTERACTIVE CALENDAR SYSTEM
// ==========================================================================

function renderCalendar() {
  const grid = document.getElementById("calendarGrid");
  const monthYearLabel = document.getElementById("currentMonthYear");
  if (!grid) return;

  grid.innerHTML = "";
  // if week view active, render week
  if (currentCalendarView === 'week') {
    renderCalendarWeek(grid, currentCalendarDate);
    return;
  }
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  
  monthYearLabel.textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentCalendarDate);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Fill previous month trailing days
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "calendar-day other-month";
    dayDiv.innerHTML = `<span class="day-number">${prevMonthDays - i}</span>`;
    grid.appendChild(dayDiv);
  }

  // Current month days
  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "calendar-day";
    if (year === today.getFullYear() && month === today.getMonth() && d === today.getDate()) {
      dayDiv.classList.add("today");
    }

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayEvents = [];
    // calendar custom events
    calendarEvents.filter(e => e.date === dateStr).forEach(e => dayEvents.push(Object.assign({}, e, { type: 'custom' })));
    // tasks with deadline on this date
    tasks.filter(t => t.deadline).forEach(t => {
      const dt = getDatePart(t.deadline);
      if (dt === dateStr) dayEvents.push({ id: t.id, title: t.text, type: 'task', deadline: t.deadline, category: t.category });
    });
    // exams
    exams.forEach(ex => {
      const exDate = new Date(ex.date);
      const exDateStr = `${exDate.getFullYear()}-${String(exDate.getMonth()+1).padStart(2,'0')}-${String(exDate.getDate()).padStart(2,'0')}`;
      if (exDateStr === dateStr) dayEvents.push({ id: ex.id, title: ex.title, type: 'exam', subject: ex.subject });
    });
    // focus sessions
    (analyticsData.focusHistory || []).forEach(f => {
      const fDate = new Date(f.timestamp);
      const fDateStr = `${fDate.getFullYear()}-${String(fDate.getMonth()+1).padStart(2,'0')}-${String(fDate.getDate()).padStart(2,'0')}`;
      if (fDateStr === dateStr) dayEvents.push({ id: f.timestamp, title: `Focus ${f.duration || f.minutes || ''}m`, type: 'focus' });
    });
    // daily goals (show on today only)
    try {
      const dg = JSON.parse(localStorage.getItem('daily_goals') || '[]');
      if (dg && dg.length > 0) {
        const todayStr = getFormattedDate(new Date());
        if (todayStr === dateStr) dg.forEach(g => dayEvents.push({ id: g.id || g.text, title: g.text || 'Daily Goal', type: 'daily' }));
      }
    } catch(e) {}

    dayDiv.innerHTML = `<span class="day-number">${d}</span>`;
    dayEvents.slice(0,3).forEach(e => {
      const eDiv = document.createElement("div");
      eDiv.className = `event-pill-mini ${e.type === 'task' ? 'event-task' : e.type === 'exam' ? 'event-exam' : e.type === 'focus' ? 'event-focus' : e.type === 'daily' ? 'event-daily' : 'event-custom'}`;
      eDiv.textContent = e.title;
      eDiv.title = e.title;
      dayDiv.appendChild(eDiv);
    });

    // highlight upcoming deadlines (within 48 hours)
    const twoDaysAhead = new Date(); twoDaysAhead.setDate(twoDaysAhead.getDate()+2);
    const todayISO = getFormattedDate(new Date());
    const checkUpcoming = tasks.some(t => {
      if (!t.deadline) return false;
      const dpart = getDatePart(t.deadline);
      return dpart === dateStr && new Date(t.deadline) <= twoDaysAhead && new Date(t.deadline) >= new Date();
    });
    if (checkUpcoming) dayDiv.classList.add('upcoming');

    dayDiv.onclick = () => {
      document.getElementById("eventDateInput").value = dateStr;
      document.getElementById("eventTitleInput").focus();
    };

    grid.appendChild(dayDiv);
  }
}

function initCalendarNotifier() {
  setInterval(() => {
    const now = new Date();
    const dateStr = getFormattedDate(now);
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let changed = false;
    calendarEvents.forEach(ev => {
      if (ev.date === dateStr && ev.time === timeStr && ev.lastNotified !== timeStr) {
        showTaskPopup(`CALENDAR: ${ev.title.toUpperCase()}`);
        sendNotification("Event Reminder 📅", `Starting now: ${ev.title}`);
        ev.lastNotified = timeStr;
        changed = true;
        
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.volume = 0.5;
          audio.play();
        } catch(e) {}
      }

      // Cleanup notification flag
      if (ev.lastNotified && (ev.date !== dateStr || ev.time !== timeStr)) {
        ev.lastNotified = null;
        changed = true;
      }
    });

    if (changed) {
      saveData();
      renderCalendar();
    }
  }, 30000);
}

function getDatePart(val) {
  if (!val) return null;
  // handle datetime-local value like 2026-05-23T14:00
  if (typeof val === 'string' && val.indexOf('T') !== -1) return val.split('T')[0];
  try {
    const d = new Date(val);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  } catch (e) { return null; }
}

function renderCalendarWeek(grid, dateRef) {
  grid.innerHTML = '';
  const start = new Date(dateRef);
  // set to start of week (Sunday)
  start.setDate(start.getDate() - start.getDay());

  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const dateStr = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;

    const col = document.createElement('div');
    col.className = 'calendar-day';
    col.innerHTML = `<span class="day-number">${day.getDate()}</span><div style="margin-top:22px; font-weight:600;">${day.toLocaleDateString(undefined,{weekday:'long'})}</div>`;

    const dayEvents = [];
    calendarEvents.filter(e => e.date === dateStr).forEach(e => dayEvents.push(Object.assign({}, e, { type: 'custom' })));
    tasks.filter(t => t.deadline && getDatePart(t.deadline) === dateStr).forEach(t => dayEvents.push({ id: t.id, title: t.text, type: 'task', deadline: t.deadline, category: t.category }));
    exams.forEach(ex => { const exDate = new Date(ex.date); const exDateStr = `${exDate.getFullYear()}-${String(exDate.getMonth()+1).padStart(2,'0')}-${String(exDate.getDate()).padStart(2,'0')}`; if (exDateStr === dateStr) dayEvents.push({ id: ex.id, title: ex.title, type: 'exam' }); });
    (analyticsData.focusHistory || []).forEach(f => { const fDate = new Date(f.timestamp); const fDateStr = `${fDate.getFullYear()}-${String(fDate.getMonth()+1).padStart(2,'0')}-${String(fDate.getDate()).padStart(2,'0')}`; if (fDateStr === dateStr) dayEvents.push({ id: f.timestamp, title: `Focus ${f.duration || f.minutes || ''}m`, type: 'focus' }); });

    dayEvents.forEach(e => {
      const eDiv = document.createElement('div');
      eDiv.className = `event-pill-mini ${e.type === 'task' ? 'event-task' : e.type === 'exam' ? 'event-exam' : e.type === 'focus' ? 'event-focus' : e.type === 'daily' ? 'event-daily' : 'event-custom'}`;
      eDiv.textContent = e.title;
      col.appendChild(eDiv);
    });

    col.onclick = () => {
      document.getElementById('eventDateInput').value = dateStr;
      document.getElementById('eventTitleInput').focus();
    };

    grid.appendChild(col);
  }
}

function updateAnalyticsStreak(todayStr) {
  if (analyticsData.lastActiveDate === todayStr) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getFormattedDate(yesterday);

  if (analyticsData.lastActiveDate === yesterdayStr) {
    analyticsData.currentStreak += 1;
  } else {
    analyticsData.currentStreak = 1;
  }

  if (analyticsData.currentStreak > analyticsData.longestStreak) {
    analyticsData.longestStreak = analyticsData.currentStreak;
  }

  analyticsData.lastActiveDate = todayStr;
}

function computeDailyProductivityScore(dateStr) {
  const completedTasks = analyticsData.completedTasksPerDay[dateStr] || 0;
  const studyMinutes = analyticsData.dailyStudyMinutes[dateStr] || 0;
  const streakBonus = analyticsData.lastActiveDate === dateStr ? (analyticsData.currentStreak || 0) * 5 : 0;
  const score = Math.round((completedTasks * 35) + (studyMinutes * 1.4) + streakBonus);

  analyticsData.dailyScoreHistory = analyticsData.dailyScoreHistory || {};
  analyticsData.dailyScoreHistory[dateStr] = score;
  return score;
}

function updateProductivityRecords(dateStr) {
  analyticsData.dailyScoreHistory = analyticsData.dailyScoreHistory || {};
  const score = computeDailyProductivityScore(dateStr);
  const studyMinutes = analyticsData.dailyStudyMinutes[dateStr] || 0;
  const completedTasks = analyticsData.completedTasksPerDay[dateStr] || 0;

  if (!analyticsData.productivityRecords) {
    analyticsData.productivityRecords = {
      highestScore: 0,
      bestProductiveDay: null,
      highestTasksInDay: 0,
      highestStudyMinutes: 0,
      bestStudyDay: null
    };
  }

  if (score > analyticsData.productivityRecords.highestScore) {
    analyticsData.productivityRecords.highestScore = score;
    analyticsData.productivityRecords.bestProductiveDay = dateStr;
  }

  if (completedTasks > analyticsData.productivityRecords.highestTasksInDay) {
    analyticsData.productivityRecords.highestTasksInDay = completedTasks;
    analyticsData.productivityRecords.bestProductiveDay = dateStr;
  }

  if (studyMinutes > analyticsData.productivityRecords.highestStudyMinutes) {
    analyticsData.productivityRecords.highestStudyMinutes = studyMinutes;
    analyticsData.productivityRecords.bestStudyDay = dateStr;
  }

  saveData();
}

function getTodayProductivityScore() {
  const todayStr = getFormattedDate(new Date());
  if (analyticsData.dailyScoreHistory && analyticsData.dailyScoreHistory[todayStr] != null) {
    return analyticsData.dailyScoreHistory[todayStr];
  }
  return computeDailyProductivityScore(todayStr);
}

function getDailyHighScore() {
  let highScore = 0;
  let bestDay = null;
  Object.entries(analyticsData.dailyScoreHistory || {}).forEach(([day, score]) => {
    if (typeof score === 'number' && score > highScore) {
      highScore = score;
      bestDay = day;
    }
  });
  return { score: highScore, day: bestDay };
}

// Helpers
function getCategoryEmoji(cat) {
  switch (cat) {
    case "Theory": return "📘";
    case "Practical": return "🧪";
    case "Assignment": return "📝";
    case "Revision": return "📖";
    default: return "✨";
  }
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// ==========================================================================
// 4. POMODORO TIMER & STUDY HOUR LOGGER
// ==========================================================================

let studyTime = 25 * 60;
let breakTime = 5 * 60;
let currentTime = studyTime;
let timer = null;
let isStudy = true;
let lastTimerTickTimestamp = null;

function updateDisplay() {
  const minutes = Math.floor(currentTime / 60);
  const seconds = currentTime % 60;
  const timeStr = `${minutes}:${String(seconds).padStart(2, '0')}`;
  
  const timerEl = document.getElementById("timer");
  if (timerEl) timerEl.innerText = timeStr;
  
  const timerDisplayEl = document.getElementById("timerDisplay");
  if (timerDisplayEl) timerDisplayEl.innerText = timeStr;
}

function startTimer() {
  if (timer) return;
  
  lastTimerTickTimestamp = Date.now();
  
  timer = setInterval(() => {
    const now = Date.now();
    const elapsedSeconds = Math.round((now - lastTimerTickTimestamp) / 1000);
    
    if (elapsedSeconds <= 0) return; // Prevent double trigger
    
    lastTimerTickTimestamp = now;
    currentTime = Math.max(0, currentTime - elapsedSeconds);
    
    // Accumulate study minutes
    if (isStudy) {
      const todayStr = getFormattedDate(new Date());
      const fractionalMinutes = elapsedSeconds / 60;
      analyticsData.dailyStudyMinutes[todayStr] = (analyticsData.dailyStudyMinutes[todayStr] || 0) + fractionalMinutes;
      saveData();
      updateProductivityRecords(todayStr);
    }

    updateDisplay();

    if (currentTime <= 0) {
      clearInterval(timer);
      timer = null;

      if (isStudy) {
        sendNotification("Session Complete!", "Study session complete! Take a well-deserved break ☕");
        addNotification({ type: 'break', title: 'Study session complete', body: 'Time for a break ☕' });
        alert("Study session complete! Take a break.");

        // Log session in focus history
        if (!analyticsData.focusHistory) analyticsData.focusHistory = [];
        analyticsData.focusHistory.push({
          timestamp: Date.now(),
          duration: Math.round(studyTime / 60),
          category: currentFilter === "All" ? "Theory" : currentFilter,
          rewardXp: 100
        });
        if (analyticsData.focusHistory.length > 10) {
          analyticsData.focusHistory.shift();
        }

        saveData();
        renderCalendar();

        isStudy = false;
        currentTime = breakTime;
        
        const modeEl = document.getElementById("mode");
        if (modeEl) {
          modeEl.innerText = "Break Time";
          modeEl.style.color = "#22c55e";
        }
        const modeTextEl = document.getElementById("modeText");
        if (modeTextEl) {
          modeTextEl.innerText = "Break Time";
          modeTextEl.style.color = "#22c55e";
        }

        // Evaluate milestone popups
        checkStudyMilestones();
        checkAchievements();
      } else {
        sendNotification("Break Over!", "Break over! Time to focus back on your tasks ⚔️");
        addNotification({ type: 'break', title: 'Break over', body: 'Break finished — back to study!' });
        alert("Break over! Back to study.");

        isStudy = true;
        currentTime = studyTime;
        
        const modeEl = document.getElementById("mode");
        if (modeEl) {
          modeEl.innerText = "Study Time";
          modeEl.style.color = "var(--text)";
        }
        const modeTextEl = document.getElementById("modeText");
        if (modeTextEl) {
          modeTextEl.innerText = "Study Time";
          modeTextEl.style.color = "var(--primary)";
        }
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
  
  const modeEl = document.getElementById("mode");
  if (modeEl) {
    modeEl.innerText = "Study Time";
    modeEl.style.color = "var(--text)";
  }
  const modeTextEl = document.getElementById("modeText");
  if (modeTextEl) {
    modeTextEl.innerText = "Study Time";
    modeTextEl.style.color = "var(--primary)";
  }
  updateDisplay();
}

// Attach event listeners to Pomodoro buttons
document.getElementById("startTimer")?.addEventListener("click", startTimer);
document.getElementById("pauseTimer")?.addEventListener("click", pauseTimer);
document.getElementById("resetTimer")?.addEventListener("click", resetTimer);

// ==========================================================================
// 5. TAB & NAVIGATION ROUTERS
// ==========================================================================

tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    // Use live query each time to avoid stale NodeList issues
    document.querySelectorAll(".tab-btn").forEach(b => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    const activeTabId = `${btn.dataset.tab}-tab`;
    const tabEl = document.getElementById(activeTabId);
    if (tabEl) tabEl.classList.add("active");

    // Sync active state in mobile bottom navigation dock
    document.querySelectorAll(".dock-btn").forEach(db => {
      const isCurrent = db.dataset.tab === btn.dataset.tab;
      db.classList.toggle("active", isCurrent);
      db.setAttribute("aria-selected", isCurrent ? "true" : "false");
    });

    // Refresh charts and heatmap on tab load
    if (btn.dataset.tab === "analytics") {
      updateAnalyticsDashboard();
    }
    if (btn.dataset.tab === "streak") {
      renderStreakTracker();
    }
    if (btn.dataset.tab === "subject-tracker") {
      renderSubjectTracker();
    }
    if (btn.dataset.tab === "flashcards") {
      renderFlashcardView();
    }

    // Re-render assignments on tab activation
    if (btn.dataset.tab === "assignments") {
      const asgnList = document.getElementById("asgnList");
      if (asgnList) {
        // Dispatch a custom event that the assignment tracker IIFE listens to
        document.dispatchEvent(new CustomEvent("asgnTabActive"));
      }
    }
  });
});

// Mobile Bottom dock click routers
document.querySelectorAll(".dock-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const targetTab = btn.dataset.tab;
    // Try clicking the matching top tab button
    const topBtn = document.querySelector(`.tab-btn[data-tab="${targetTab}"]`);
    if (topBtn) {
      topBtn.click();
    } else {
      // Fallback: manually switch if top tab hidden
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      const tabEl = document.getElementById(`${targetTab}-tab`);
      if (tabEl) tabEl.classList.add("active");
      document.querySelectorAll(".dock-btn").forEach(db => {
        const isCurrent = db.dataset.tab === targetTab;
        db.classList.toggle("active", isCurrent);
        db.setAttribute("aria-selected", isCurrent ? "true" : "false");
      });
    }
  });
});

// ==========================================================================
// 6. DYNAMIC ACHIEVEMENTS BADGES COMPILER
// ==========================================================================

function renderAchievements() {
  const container = document.getElementById("badgesGrid");
  if (!container) return;
  container.innerHTML = "";

  achievementSpecs.forEach(ach => {
    const isUnlocked = analyticsData.unlockedAchievements.includes(ach.id);
    const prog = ach.progress();

    const badgeDiv = document.createElement("div");
    badgeDiv.classList.add("badge");
    badgeDiv.classList.add(isUnlocked ? "unlocked" : "locked");
    badgeDiv.classList.add(`rarity-${ach.rarity.toLowerCase()}`);
    badgeDiv.setAttribute("tabindex", "0");
    badgeDiv.setAttribute("role", "button");

    badgeDiv.textContent = ach.icon;

    // Set custom tooltip showing progress
    const tooltipText = isUnlocked 
      ? `Unlocked: ${ach.title} (${ach.desc}) - ${ach.rarity}`
      : `Locked: ${ach.desc} (${Math.round(prog.percent)}% complete)`;
    badgeDiv.setAttribute("data-tooltip", tooltipText);
    badgeDiv.setAttribute("aria-label", tooltipText);

    // Click to open details modal
    badgeDiv.addEventListener("click", () => {
      openAchievementModal(ach);
    });
    
    badgeDiv.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openAchievementModal(ach);
      }
    });

    container.appendChild(badgeDiv);
  });
}

function openAchievementModal(ach) {
  const overlay = document.getElementById("achievementModalOverlay");
  const modal = document.getElementById("achievementModal");
  if (!overlay || !modal) return;

  const isUnlocked = analyticsData.unlockedAchievements.includes(ach.id);
  const prog = ach.progress();

  // Populate data
  document.getElementById("modalBadgeIcon").textContent = ach.icon;
  
  const rarityEl = document.getElementById("modalRarityLabel");
  rarityEl.textContent = ach.rarity;
  rarityEl.className = `modal-rarity-pill rarity-${ach.rarity.toLowerCase()}`;
  
  // Set glow color based on rarity
  const glowEl = document.getElementById("modalGlow");
  let glowColor = "rgba(139, 92, 246, 0.4)";
  if (ach.rarity === "Common") glowColor = "rgba(148, 163, 184, 0.3)";
  else if (ach.rarity === "Rare") glowColor = "rgba(6, 182, 212, 0.4)";
  else if (ach.rarity === "Epic") glowColor = "rgba(236, 72, 153, 0.4)";
  else if (ach.rarity === "Legendary") glowColor = "rgba(245, 158, 11, 0.5)";
  glowEl.style.background = `radial-gradient(circle, ${glowColor} 0%, rgba(0,0,0,0) 70%)`;

  document.getElementById("modalBadgeTitle").textContent = ach.title;
  document.getElementById("modalBadgeDesc").textContent = ach.desc;
  document.getElementById("modalProgressText").textContent = `${prog.current} / ${prog.target}`;
  document.getElementById("modalProgressFill").style.width = `${prog.percent}%`;
  document.getElementById("modalRewardText").textContent = `+${ach.reward} Coins Reward`;
  
  const statusEl = document.getElementById("modalStatusText");
  if (isUnlocked) {
    statusEl.innerHTML = `<span class="unlocked-status"><i class="ri-checkbox-circle-fill"></i> Unlocked</span>`;
  } else {
    statusEl.innerHTML = `<span class="locked-status"><i class="ri-lock-2-line"></i> Locked (${Math.round(prog.percent)}% complete)</span>`;
  }

  overlay.classList.add("active");
  modal.classList.add("active");
  announce(`Achievement details modal: ${ach.title}. Description: ${ach.desc}. Status: ${isUnlocked ? 'Unlocked' : 'Locked'}.`);
  enableFocusTrap(modal);
}

function closeAchievementModal() {
  const overlay = document.getElementById("achievementModalOverlay");
  const modal = document.getElementById("achievementModal");
  if (overlay) overlay.classList.remove("active");
  if (modal) modal.classList.remove("active");
  disableFocusTrap();
}

// Attach Achievement Modal Close Event Listeners
document.getElementById("closeAchievementModalBtn")?.addEventListener("click", closeAchievementModal);
document.getElementById("achievementModalOverlay")?.addEventListener("click", closeAchievementModal);

function triggerCoinExplosion(event) {
  const target = document.getElementById("coins");
  if (!target) return;

  const targetRect = target.getBoundingClientRect();
  
  // Get button location or center of screen if event is not passed
  let startX = window.innerWidth / 2;
  let startY = window.innerHeight / 2;
  if (event && event.clientX) {
    startX = event.clientX;
    startY = event.clientY;
  }

  const coinCount = 15;
  for (let i = 0; i < coinCount; i++) {
    const coin = document.createElement("div");
    coin.className = "flying-coin";
    coin.innerHTML = '<i class="ri-coin-fill"></i>';
    coin.style.left = `${startX}px`;
    coin.style.top = `${startY}px`;
    
    // Random direction and delay
    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * 60;
    const midX = startX + Math.cos(angle) * distance;
    const midY = startY + Math.sin(angle) * distance;

    coin.style.setProperty("--mid-x", `${midX - startX}px`);
    coin.style.setProperty("--mid-y", `${midY - startY}px`);
    coin.style.setProperty("--dest-x", `${targetRect.left + (targetRect.width / 2) - startX}px`);
    coin.style.setProperty("--dest-y", `${targetRect.top + (targetRect.height / 2) - startY}px`);
    
    const delay = Math.random() * 0.2;
    coin.style.animationDelay = `${delay}s`;

    document.body.appendChild(coin);

    // Clean up
    setTimeout(() => {
      coin.remove();
    }, 1200 + delay * 1000);
  }
}

// ==========================================================================
// 7. WEEKLY STREAK TRACKER COMPILER
// ==========================================================================

function renderWeeklyStreak() {
  const containers = document.querySelectorAll(".streak-days");
  if (!containers.length) return;
  const dayNames = ["M", "T", "W", "T", "F", "S", "S"];
  const today = new Date();
  const currentDayOfWeek = today.getDay();
  const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const monday = new Date();
  monday.setDate(today.getDate() + diffToMonday);

  containers.forEach(container => {
    container.innerHTML = "";

    for (let i = 0; i < 7; i++) {
      const loopDay = new Date(monday.getTime());
      loopDay.setDate(monday.getDate() + i);
      const dateStr = getFormattedDate(loopDay);

      const hasStudyMins = (analyticsData.dailyStudyMinutes[dateStr] || 0) > 0;
      const hasCompletions = (analyticsData.completedTasksPerDay[dateStr] || 0) > 0;
      const isActive = hasStudyMins || hasCompletions;

      const cell = document.createElement("div");
      cell.className = "streak-day-cell";
      if (isActive) {
        cell.classList.add("active");
      }

      cell.innerHTML = `
        <span>${dayNames[i]}</span>
        <div class="day-indicator">
          ${isActive ? '<i class="ri-fire-fill"></i>' : '<i class="ri-checkbox-blank-circle-line"></i>'}
        </div>
      `;

      container.appendChild(cell);
    }
  });
}

function getTodayStreakGoal() {
  const today = getFormattedDate(new Date());
  const completed = analyticsData.completedTasksPerDay[today] || 0;
  const minutes = analyticsData.dailyStudyMinutes[today] || 0;
  return {
    minutes,
    completed,
    goal: 60,
    targetTasks: 5
  };
}

function getRingPalette(percent) {
  if (percent >= 100) return { start: '#34d399', end: '#22c55e', accent: '#10b981' };
  if (percent >= 75) return { start: '#60a5fa', end: '#3b82f6', accent: '#3b82f6' };
  if (percent >= 50) return { start: '#fbbf24', end: '#f59e0b', accent: '#f59e0b' };
  if (percent >= 25) return { start: '#fb923c', end: '#f97316', accent: '#f97316' };
  return { start: '#fda4af', end: '#ef4444', accent: '#ef4444' };
}

function updateCircularProgressRing({
  fillEl,
  percent,
  gradientId,
  startStopId,
  endStopId,
  containerEl,
  labelEl
}) {
  if (!fillEl) return 0;

  const safePercent = Math.max(0, Math.min(100, Math.round(percent || 0)));
  const palette = getRingPalette(safePercent);
  const circumference = 213.63;

  fillEl.style.strokeDashoffset = `${circumference - (circumference * safePercent / 100)}`;
  if (gradientId) fillEl.style.stroke = `url(#${gradientId})`;

  const startStop = startStopId ? document.getElementById(startStopId) : null;
  const endStop = endStopId ? document.getElementById(endStopId) : null;
  if (startStop) startStop.setAttribute('stop-color', palette.start);
  if (endStop) endStop.setAttribute('stop-color', palette.end);

  if (containerEl) containerEl.style.setProperty('--ring-accent', palette.accent);
  if (labelEl) labelEl.textContent = `${safePercent}%`;

  return safePercent;
}

function renderDailyGoalRing() {
  const ringFill = document.getElementById('dgRingFill');
  const percentEl = document.getElementById('dgPercent');
  const totalEl = document.getElementById('dgTotalCount');
  const doneEl = document.getElementById('dgDoneCount');
  const leftEl = document.getElementById('dgLeftCount');
  const motivationEl = document.getElementById('dgMotivation');
  const ringContainer = document.querySelector('#dailyGoalsCard .daily-goals-ring-container');
  const completedToday = tasks.filter(task => task.completed && task.createdAt && task.createdAt.startsWith(getFormattedDate(new Date()))).length;
  const target = 5;
  const percent = target > 0 ? (completedToday / target) * 100 : 0;
  const remaining = Math.max(0, target - completedToday);

  updateCircularProgressRing({
    fillEl: ringFill,
    percent,
    gradientId: 'dgGradient',
    startStopId: 'dgGradientStart',
    endStopId: 'dgGradientEnd',
    containerEl: ringContainer,
    labelEl: percentEl
  });

  if (totalEl) totalEl.textContent = `${target}`;
  if (doneEl) doneEl.textContent = `${completedToday}`;
  if (leftEl) leftEl.textContent = `${remaining}`;

  if (motivationEl) {
    const messageEl = motivationEl.querySelector('span');
    if (messageEl) {
      if (completedToday === 0) {
        messageEl.textContent = 'Set your first goal for today!';
      } else if (percent < 100) {
        messageEl.textContent = 'Good momentum. Finish the last few tasks to close the ring.';
      } else {
        messageEl.textContent = 'All daily tasks complete. Strong finish today.';
      }
    }
    motivationEl.classList.toggle('all-done', percent >= 100);
  }
}

function updateStreakMetrics() {
  const today = new Date();
  let currentCount = 0;
  let longest = analyticsData.longestStreak || 0;

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = getFormattedDate(date);
    const active = (analyticsData.dailyStudyMinutes[dateStr] || 0) > 0 || (analyticsData.completedTasksPerDay[dateStr] || 0) > 0;

    if (!active) break;
    currentCount += 1;
  }

  analyticsData.currentStreak = currentCount;
  analyticsData.longestStreak = Math.max(longest, currentCount);
  streak = currentCount;
  saveData();
}

function renderStreakTracker() {
  const todayMetrics = getTodayStreakGoal();
  const currentValue = document.getElementById("streakCurrentValue");
  const longestValue = document.getElementById("streakLongestValue");
  const todayMinutes = document.getElementById("streakTodayMinutes");
  const goalProgress = document.getElementById("streakGoalProgress");
  const goalPercent = document.getElementById("streakGoalPercent");
  const goalFill = document.getElementById("streakGoalFill");
  const goalCount = document.getElementById("streakGoalCount");
  const tasksCompleted = document.getElementById("streakTasksCompleted");
  const goalLeft = document.getElementById("streakGoalLeft");
  const xpReward = document.getElementById("streakXpReward");
  const streakCurrent = analyticsData.currentStreak || 0;
  const streakLongest = analyticsData.longestStreak || 0;
  const progressValue = Math.min(100, Math.round((todayMetrics.minutes / todayMetrics.goal) * 100));
  const remaining = Math.max(0, todayMetrics.targetTasks - todayMetrics.completed);
  const ringContainer = document.querySelector('#streakProgressCard .daily-goals-ring-container');

  if (currentValue) currentValue.textContent = `${streakCurrent} days`;
  if (longestValue) longestValue.textContent = `${streakLongest} days`;
  if (todayMinutes) todayMinutes.textContent = `${todayMetrics.minutes} min`;
  if (goalProgress) goalProgress.textContent = `${progressValue}%`;
  if (goalPercent) goalPercent.textContent = `${progressValue}%`;
  updateCircularProgressRing({
    fillEl: goalFill,
    percent: progressValue,
    gradientId: 'streakGradient',
    startStopId: 'streakGradientStart',
    endStopId: 'streakGradientEnd',
    containerEl: ringContainer,
    labelEl: goalPercent
  });
  if (goalCount) goalCount.innerHTML = `<i class="ri-checkbox-circle-line"></i> ${todayMetrics.completed} / ${todayMetrics.targetTasks}`;
  if (tasksCompleted) tasksCompleted.textContent = todayMetrics.completed;
  if (goalLeft) goalLeft.textContent = remaining;
  if (xpReward) xpReward.textContent = `+${todayMetrics.completed * 20} XP`;

  renderWeeklyStreak();
  updateGamification();
}

function logStudyMinutes(minutes = 25) {
  const today = getFormattedDate(new Date());
  analyticsData.dailyStudyMinutes[today] = (analyticsData.dailyStudyMinutes[today] || 0) + minutes;
  analyticsData.completedTasksPerDay[today] = Math.max(analyticsData.completedTasksPerDay[today] || 0, 1);
  xp += 15;
  updateStreakMetrics();
  saveData();
  renderStreakTracker();
  checkAchievements();
  announce(`Logged ${minutes} minutes of study. Keep the streak alive!`);
}

function completeDailyGoal() {
  const today = getFormattedDate(new Date());
  analyticsData.completedTasksPerDay[today] = Math.max(analyticsData.completedTasksPerDay[today] || 0, 5);
  analyticsData.dailyStudyMinutes[today] = Math.max(analyticsData.dailyStudyMinutes[today] || 0, 60);
  xp += 40;
  updateStreakMetrics();
  saveData();
  renderStreakTracker();
  checkAchievements();
  announce("Today's goal completed — streak progress updated.");
}

function announce(message) {
  const liveRegion = document.getElementById("liveRegion");
  if (liveRegion) {
    liveRegion.textContent = message;
    setTimeout(() => {
      liveRegion.textContent = "";
    }, 3000);
  }
}


// ==========================================================================
// 8. CHART.JS ANALYTICS GENERATOR
// ==========================================================================

function updateAnalyticsDashboard() {
  // 1. Update stats cards
  const totalStudyMinutes = Object.values(analyticsData.dailyStudyMinutes).reduce((a, b) => a + b, 0);
  const totalStudyHours = (totalStudyMinutes / 60).toFixed(1);
  const totalHoursEl = document.getElementById("analyticsTotalHours");
  if (totalHoursEl) totalHoursEl.textContent = `${totalStudyHours}h`;

  const totalCompletedQuests = tasks.filter(task => task.completed).length;
  const completedQuestsEl = document.getElementById("analyticsCompletedQuests");
  if (completedQuestsEl) completedQuestsEl.textContent = totalCompletedQuests;

  const pendingTaskCount = tasks.filter(task => !task.completed).length;
  const pendingTasksEl = document.getElementById("analyticsPendingTasks");
  if (pendingTasksEl) pendingTasksEl.textContent = pendingTaskCount;

  const streakEl = document.getElementById("analyticsStreak");
  if (streakEl) streakEl.textContent = `${analyticsData.currentStreak} days`;

  const totalCreated = Object.values(analyticsData.categoryStats).reduce((acc, obj) => acc + (obj.created || 0), 0);
  const totalCompleted = Object.values(analyticsData.categoryStats).reduce((acc, obj) => acc + (obj.completed || 0), 0);
  const completionRate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;
  const rateEl = document.getElementById("analyticsCompletionRate");
  if (rateEl) rateEl.textContent = `${completionRate}%`;
  document.getElementById("logStudyBtn")?.addEventListener("click", () => {
    logStudyMinutes(25);
  });

  document.getElementById("completeGoalBtn")?.addEventListener("click", () => {
    completeDailyGoal();
  });

  document.getElementById("refreshStreakBtn")?.addEventListener("click", () => {
    updateStreakMetrics();
    renderStreakTracker();
    announce("Study streak tracker refreshed.");
  });

  // Footer: set dynamic year and small accessibility tweaks
  const footerCopyright = document.getElementById('footerCopyright');
  if (footerCopyright) {
    const year = new Date().getFullYear();
    footerCopyright.innerHTML = `&copy; ${year} TaskQuest. All rights reserved.`;
  }

  // Ensure social links have titles for hover/tooltip
  document.querySelectorAll('.footer-links a').forEach(a => {
    if (!a.getAttribute('title')) {
      a.setAttribute('title', a.getAttribute('aria-label') || 'External link');
    }
  });

  checkOverduePenalties();
  initTimetableNotifier();
  initCalendarNotifier();
  initDeadlineUpdater();
  initFlashcards();

  const addTaskBtnEl = document.getElementById("addTaskBtn");
  if (addTaskBtnEl) {
    addTaskBtnEl.addEventListener("click", addTask);
  }

  taskInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTask();
    }
  });

  taskTagsInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTask();
    }
  });

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderTasks();
    });
  }

  document.querySelectorAll('.filters .filter-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter || 'All';
      document.querySelectorAll('.filters .filter-btn[data-filter]').forEach(item => {
        item.classList.toggle('active', item === btn);
      });
      renderTasks();
    });
  });

  document.querySelectorAll('.filters .filter-btn[data-sort]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSort = btn.dataset.sort || 'default';
      document.querySelectorAll('.filters .filter-btn[data-sort]').forEach(item => {
        item.classList.toggle('active', item === btn);
      });
      renderTasks();
    });
  });

  // ── Smart Sort toggle ──────────────────────────────────────
  const smartSortBtn = document.getElementById('smartSortBtn');
  const smartBanner  = document.getElementById('smartSuggestionBanner');

  if (smartSortBtn) {
    smartSortBtn.addEventListener('click', function () {
      smartSortEnabled = !smartSortEnabled;
      smartSortBtn.classList.toggle('active', smartSortEnabled);

      if (smartSortEnabled && smartBanner) {
        var suggestions = window.Prioritization.getProductivitySuggestions(tasks);
        smartBanner.innerHTML = suggestions
          .map(function (s) {
            return '<div class="smart-suggestion-item">' + s + '</div>';
          })
          .join('');
        smartBanner.classList.add('visible');
      } else if (smartBanner) {
        smartBanner.classList.remove('visible');
      }

      renderTasks();
    });
  }
 
  // Clear All Button 
  document.getElementById('resetTasksBtn')?.addEventListener('click', () => {
    // Show confirmation dialog
    if (!confirm('⚠️ WARNING: This will permanently delete ALL your tasks, progress, coins, XP, streak, and analytics data. This action cannot be undone. Are you sure you want to continue?')) {
      return;
    }

    tasks = [];
    
    coins = 0;
    streak = 0;
    xp = 120;
    
    initializeAnalyticsData();
    
    searchQuery = '';
    currentFilter = 'All';
    currentTagFilter = 'All';
  
    const searchInputEl = document.getElementById('searchInput');
    if (searchInputEl) {
      searchInputEl.value = '';
    }
    
    saveData();
    
    renderTasks();
    
    updateGamification();
    
    renderStreakTracker();
    
    updateAnalyticsDashboard();
    
    document.querySelectorAll('.filters .filter-btn[data-filter]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === 'All');
    });
    
    showTaskPopup('ALL DATA RESET! Fresh start begins now ✨');
    announce('All tasks and gamification data have been reset.');
    
    document.querySelectorAll('.tag-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.tag === 'All');
    });
  });

  // Setup dragover reordering for list container
  const taskListContainer = document.getElementById("taskList");
  if (taskListContainer) {
    taskListContainer.addEventListener("dragover", (e) => {
      e.preventDefault();
      const draggingEl = document.querySelector(".dragging");
      if (!draggingEl) return;

      const afterElement = getDragAfterElement(taskListContainer, e.clientY);
      if (afterElement == null) {
        taskListContainer.appendChild(draggingEl);
      } else {
        taskListContainer.insertBefore(draggingEl, afterElement);
      }
    });

    taskListContainer.addEventListener("drop", () => {
      saveTaskOrder();
    });
  }

  // Wire view toggles
  const listViewBtn = document.getElementById("listViewBtn");
  const boardViewBtn = document.getElementById("boardViewBtn");

  if (listViewBtn && boardViewBtn) {
    listViewBtn.addEventListener("click", () => {
      currentView = "list";
      listViewBtn.classList.add("active");
      boardViewBtn.classList.remove("active");
      renderTasks();
    });

    boardViewBtn.addEventListener("click", () => {
      currentView = "board";
      boardViewBtn.classList.add("active");
      listViewBtn.classList.remove("active");
      renderTasks();
    });
  }

  // Performance Add Logic
  const addPerformanceBtn = document.getElementById("addPerformanceBtn");
  if (addPerformanceBtn) {
    addPerformanceBtn.addEventListener("click", () => {
      const name = document.getElementById("subjectNameInput").value.trim();
      const obtained = parseFloat(document.getElementById("marksObtainedInput").value);
      const total = parseFloat(document.getElementById("totalMarksInput").value);

      if (!name || isNaN(obtained) || isNaN(total) || total <= 0) {
        showTaskPopup("INVALID MARKS ENTERED");
        return;
      }

      const record = {
        id: Date.now(),
        name,
        obtained,
        total,
        percentage: (obtained / total) * 100
      };

      performanceData.push(record);
      saveData();
      renderPerformance();
      showTaskPopup(`${name.toUpperCase()} PERFORMANCE ADDED`);
      
      document.getElementById("subjectNameInput").value = "";
      document.getElementById("marksObtainedInput").value = "";
      document.getElementById("totalMarksInput").value = "";
    });
  }

  // Timetable Add Logic
  const addTimetableBtn = document.getElementById("addTimetableBtn");
  if (addTimetableBtn) {
    addTimetableBtn.addEventListener("click", () => {
      const day = document.getElementById("ttDayInput").value;
      const subject = document.getElementById("ttSubjectInput").value.trim();
      const start = document.getElementById("ttStartTimeInput").value;
      const end = document.getElementById("ttEndTimeInput").value;

      if (!subject || !start || !end) {
        showTaskPopup("PLEASE FILL ALL FIELDS");
        return;
      }

      if (start >= end) {
        showTaskPopup("END TIME MUST BE AFTER START TIME");
        return;
      }

      timetable.push({
        id: Date.now(),
        day, subject, startTime: start, endTime: end,
        lastNotified: null
      });

      saveData();
      renderTimetable();
      showTaskPopup("TIMETABLE UPDATED");
      document.getElementById("ttSubjectInput").value = "";
    });
  }

  // Calendar Logic
  document.getElementById("prevMonth")?.addEventListener("click", () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById("nextMonth")?.addEventListener("click", () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
  });

  document.getElementById('calViewMonth')?.addEventListener('click', (e) => { currentCalendarView = 'month'; document.getElementById('calViewMonth')?.classList.add('active'); document.getElementById('calViewWeek')?.classList.remove('active'); renderCalendar(); });
  document.getElementById('calViewWeek')?.addEventListener('click', (e) => { currentCalendarView = 'week'; document.getElementById('calViewWeek')?.classList.add('active'); document.getElementById('calViewMonth')?.classList.remove('active'); renderCalendar(); });

  document.getElementById("addEventBtn")?.addEventListener("click", () => {
    const title = document.getElementById("eventTitleInput").value.trim();
    const date = document.getElementById("eventDateInput").value;
    const time = document.getElementById("eventTimeInput").value;

    if (!title || !date || !time) {
      showTaskPopup("PLEASE FILL ALL EVENT DETAILS");
      return;
    }

    calendarEvents.push({ id: Date.now(), title, date, time, lastNotified: null });
    saveData();
    renderCalendar();
    showTaskPopup("EVENT ADDED TO CALENDAR");
    
    document.getElementById("eventTitleInput").value = "";
    document.getElementById("eventDateInput").value = "";
    document.getElementById("eventTimeInput").value = "";
  });

  // Subject Tracker Logic
  const addSubjectBtn = document.getElementById("addSubjectBtn");
  const subjectForm = document.getElementById("subjectInputForm");
  const titleInput = document.getElementById("newSubjectTitleInput");
  const completedInput = document.getElementById("newSubjectCompletedInput");
  const totalInput = document.getElementById("newSubjectTotalInput");

  if (addSubjectBtn && subjectForm) {
    addSubjectBtn.addEventListener("click", () => {
      subjectForm.style.display = subjectForm.style.display === "none" ? "grid" : "none";
      if (subjectForm.style.display === "grid") titleInput.focus();
    });
    document.getElementById("cancelSubjectBtn").addEventListener("click", () => {
      subjectForm.style.display = "none";
    });
    
    document.getElementById("saveSubjectBtn").addEventListener("click", () => {
      const title = titleInput.value.trim();
      const completed = parseInt(completedInput.value) || 0;
      const total = parseInt(totalInput.value) || 1;

      if (title) {
        subjects.push({ 
          id: Date.now(), 
          title, 
          completed: Math.max(0, completed), 
          total: Math.max(1, total) 
        });
        saveData();
        renderSubjectTracker();
        titleInput.value = "";
        completedInput.value = "";
        totalInput.value = "";
        subjectForm.style.display = "none";
        showTaskPopup("SUBJECT CREATED");
      }
    });

    titleInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") document.getElementById("saveSubjectBtn").click();
    });
  }

}

// ==========================================================================
// 15. PROFILE MANAGEMENT & MODAL
// ==========================================================================

function renderProfile() {
  const nameEl = document.getElementById("profileNameDisplay");
  const classEl = document.getElementById("profileClassDisplay");
  const avatarImg = document.getElementById("profileAvatarImg");
  const avatarPlaceholder = document.getElementById("profileIconPlaceholder");

  if (nameEl) nameEl.textContent = profile.name || "Student Hero";
  if (classEl) classEl.textContent = `${profile.class || "Class 10"} • ${profile.title}`;

  if (avatarImg && avatarPlaceholder) {
    if (profile.photo) {
      avatarImg.src = profile.photo;
      avatarImg.style.display = "block";
      avatarPlaceholder.style.display = "none";
    } else {
      if (profile.gender === "Female") {
        avatarImg.src = "female_avatar.svg";
        avatarImg.style.display = "block";
        avatarPlaceholder.style.display = "none";
      } else {
        avatarImg.src = "male_avatar.svg";
        avatarImg.style.display = "block";
        avatarPlaceholder.style.display = "none";
      }
    }
  }
}

// Open Profile Modal
document.getElementById("profileCard")?.addEventListener("click", () => {
  const overlay = document.getElementById("profileModalOverlay");
  const modal = document.getElementById("profileModal");
  if (!overlay || !modal) return;

  // Populate form with current data
  document.getElementById("profileInputName").value = profile.name || "";
  document.getElementById("profileInputClass").value = profile.class || "";
  document.getElementById("profileInputGender").value = profile.gender || "Male";
  document.getElementById("profileInputTitle").value = profile.title || "Focus Warrior ⚔️";

  const photoInput = document.getElementById("profileInputPhoto");
  if (photoInput) {
    photoInput.value = "";
  }

  // Initialize avatar options and select current
  const avatarOptions = document.getElementById('avatarOptions');
  if (avatarOptions) {
    // Mark selected if profile.photo matches one of the options
    const imgs = avatarOptions.querySelectorAll('.avatar-option');
    imgs.forEach(img => {
      img.classList.remove('selected');
      if (profile.photo && profile.photo.endsWith && profile.photo === img.dataset.src) {
        img.classList.add('selected');
      }

      img.onclick = () => {
        // Clear any uploaded file input
        if (photoInput) photoInput.value = '';
        // Set profile.photo to the selected avatar path
        profile.photo = img.dataset.src;
        // Update selection UI
        imgs.forEach(i => i.classList.remove('selected'));
        img.classList.add('selected');
        // Update preview in the sidebar immediately
        const avatarImg = document.getElementById('profileAvatarImg');
        const avatarPlaceholder = document.getElementById('profileIconPlaceholder');
        if (avatarImg) {
          avatarImg.src = profile.photo;
          avatarImg.style.display = 'block';
        }
        if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
      };
    });
  }

  overlay.classList.add("active");
  modal.classList.add("active");
  enableFocusTrap(modal);
});

// Close Profile Modal
function closeProfileModal() {
  document.getElementById("profileModalOverlay")?.classList.remove("active");
  document.getElementById("profileModal")?.classList.remove("active");
  disableFocusTrap();
}

document.getElementById("closeProfileModalBtn")?.addEventListener("click", closeProfileModal);
document.getElementById("profileModalOverlay")?.addEventListener("click", closeProfileModal);

document.getElementById("editProfileSidebarBtn")?.addEventListener("click", (e) => {
  e.stopPropagation();
  document.getElementById("profileCard").click();
});

// Save Profile
document.getElementById("saveProfileBtn")?.addEventListener("click", (e) => {
  const nameInput = document.getElementById("profileInputName");
  const classInput = document.getElementById("profileInputClass");
  const genderInput = document.getElementById("profileInputGender");
  const titleInput = document.getElementById("profileInputTitle");
  const photoInput = document.getElementById("profileInputPhoto");

  const newName = nameInput.value.trim();
  if (newName === "") {
    nameInput.classList.add("input-invalid");
    announce("Please enter your name.");
    setTimeout(() => nameInput.classList.remove("input-invalid"), 400);
    return;
  }

  profile.name = newName;
  profile.class = classInput.value.trim();
  profile.gender = genderInput.value;
  profile.title = titleInput.value;

  if (photoInput && photoInput.files && photoInput.files[0]) {
    const file = photoInput.files[0];
    if (file.size > 1024 * 1024) {
      alert("Image is too large. Please select an image under 1MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      profile.photo = ev.target.result;
      saveData();
      renderProfile();
      closeProfileModal();
      triggerConfetti();
      announce("Profile updated successfully.");
    };
    reader.readAsDataURL(file);
  } else {
    saveData();
    renderProfile();
    closeProfileModal();
    triggerConfetti();
    announce("Profile updated successfully.");
  }
});

// Apply formatting commands
function formatDoc(cmd) {
  document.execCommand(cmd, false, null);
}

// Load notes on page load
window.addEventListener('load', () => {
  const savedNotes = localStorage.getItem("studyNotes");
  const notesEditor = document.getElementById("notesEditor");
  if (notesEditor && savedNotes) {
    notesEditor.innerHTML = savedNotes;
  }
  
  // Dynamic Greeting for the Profile
  const nameEl = document.getElementById("profileNameDisplay");
  if (nameEl && profile.name) {
    const hour = new Date().getHours();
    let greeting = "Ready for a quest?";
    if (hour < 12) greeting = "Good Morning, Hero!";
    else if (hour < 18) greeting = "Good Afternoon, Warrior!";
    else greeting = "Good Evening, Scholar!";
    // Temporarily show greeting or just keep name
  }
});

/**
 * UI Helper: Show a floating task confirmation popup
 */
function showTaskPopup(message) {
  const popup = document.createElement("div");
  popup.className = "task-popup";
  popup.innerHTML = `
    <i class="ri-sparkling-fill" style="color: var(--secondary); font-size: 24px;"></i>
    <p>${message}</p>
  `;
  document.body.appendChild(popup);
  setTimeout(() => popup.classList.add("show"), 100);
  setTimeout(() => {
    popup.classList.remove("show");
    setTimeout(() => popup.remove(), 600);
  }, 3500);
}

// ==========================================================================
// 8. EXAM COUNTDOWN FEATURE
// ==========================================================================

const examFormToggle = document.getElementById("examFormToggle");
const examFormBody = document.getElementById("examFormBody");
const addExamBtn = document.getElementById("addExamBtn");
const examsGrid = document.getElementById("examsGrid");
const examEmptyState = document.getElementById("examEmptyState");

let examTimerInterval = null;
const notifiedExams = new Set(); // Keep track of exams we already notified for in this session

if (examFormToggle) {
  examFormToggle.addEventListener("click", () => {
    examFormBody.classList.toggle("collapsed");
    const icon = examFormToggle.querySelector("i");
    if (examFormBody.classList.contains("collapsed")) {
      icon.classList.replace("ri-subtract-line", "ri-add-line");
    } else {
      icon.classList.replace("ri-add-line", "ri-subtract-line");
    }
  });
}

if (addExamBtn) {
  addExamBtn.addEventListener("click", () => {
    const title = document.getElementById("examTitle").value.trim();
    const subject = document.getElementById("examSubject").value.trim();
    const dateStr = document.getElementById("examDate").value;
    const notes = document.getElementById("examNotes").value.trim();

    if (!title || !subject || !dateStr) {
      announce("Please fill in Title, Subject, and Date to add an exam.");
      showTaskPopup("Missing exam details! 🚨");
      return;
    }

    const exam = {
      id: Date.now(),
      title,
      subject,
      date: new Date(dateStr).getTime(),
      notes,
      createdAt: Date.now()
    };

    exams.push(exam);
    // Sort exams chronologically
    exams.sort((a, b) => a.date - b.date);

    saveData();
    renderExams();

    renderCalendar();
    announce(`Added exam: ${title}`);

    // Add notification for new exam tracked
    addNotification({ type: 'exam', title: `Exam tracked: ${title}`, body: `${subject} — ${new Date(exam.date).toLocaleString()}`, ref: `exam-${exam.id}` });

    announce(`Added exam: ${title}`);

    // Clear form
    document.getElementById("examTitle").value = "";
    document.getElementById("examSubject").value = "";
    document.getElementById("examDate").value = "";
    document.getElementById("examNotes").value = "";

    // Collapse form
    examFormBody.classList.add("collapsed");
    examFormToggle.querySelector("i").classList.replace("ri-subtract-line", "ri-add-line");
  });
}

// --- State Management ---
// Guard against corrupt or malformed JSON in storage. A bare JSON.parse at
// the top level throws a SyntaxError before any function is defined, leaving
// `tasks` undefined and making the entire app non-functional until the user
// manually clears localStorage. The try/catch recovers silently with an
// empty array so the app always boots into a usable state.
try {
  const _raw = window.TaskQuestStorage
    ? window.TaskQuestStorage.getTasks()
    : JSON.parse(localStorage.getItem("taskquest_v1.tasks") || localStorage.getItem("tasks"));
  if (Array.isArray(_raw)) tasks = _raw;
} catch (e) {
  console.warn("[TaskQuest] Corrupt task data in storage — resetting to empty list.", e);
}

// --- Security Helpers ---
// Escapes user-supplied strings before injecting into innerHTML.
// Without this, a task saved as <img src=x onerror=alert(1)> executes
// on every render — a persistent stored XSS vector with full access to
// all localStorage data.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --- ID Generation ---
// Date.now() has millisecond resolution. Two tasks added within the same
// millisecond (programmatic calls, keyboard shortcuts, rapid submission)
// receive identical IDs. toggleTask/removeTask/editTask all key off this ID,
// so a collision causes both tasks to be toggled or deleted simultaneously —
// silent, permanent data loss with no error.
//
// generateTaskId() combines:
//   - Date.now()  : millisecond timestamp (base uniqueness)
//   - _idCounter  : monotonic counter (handles same-millisecond calls)
//   - Math.random(): 9-char random suffix (guards against counter reset
//                    after page reload when timestamp may repeat)
let _idCounter = 0;
function generateTaskId() {
  return Date.now() + '_' + (++_idCounter) + '_' + Math.random().toString(36).slice(2, 11);
}

// --- Selectors ---
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const taskStats = document.getElementById("taskStats");
const errorMsg = document.getElementById("errorMsg");
const celebration = document.getElementById("celebration");
const themeSwitcher = document.getElementById("themeSwitcher");

// --- Initialization ---
"use strict";
document.addEventListener("DOMContentLoaded", () => {
  renderTasks();
  initTheme();
  const filterOverdueBtn = document.getElementById('filterOverdueBtn');
  if (filterOverdueBtn){
    filterOverdueBtn.addEventListener('click', ()=>{
      const isActive = filterOverdueBtn.classList.contains('active');
      if (isActive){
        filterOverdueBtn.classList.remove('active'); activeFilter = 'All';
      } else {
        // deactivate other filters briefly if needed
        document.querySelectorAll('.filter-btn.active')?.forEach(b=>b.classList.remove('active'));
        filterOverdueBtn.classList.add('active'); activeFilter = 'Overdue';
      }
      renderTasks();
    });
  }
});

// --- Core Functions ---

function addTask() {
  const text = taskInput.value.trim();
  const category = categorySelect ? categorySelect.value : "Theory";
  const prioritySelect = document.getElementById("prioritySelect");
  const priority = prioritySelect ? prioritySelect.value : "Medium";
  const tags = typeof parseTags === "function" && taskTagsInput ? parseTags(taskTagsInput.value) : [];

  const deadlineInput = document.getElementById("deadlineInput");
  const deadline = deadlineInput ? deadlineInput.value : "";
  const recurrenceSelect = document.getElementById("recurrenceSelect");
  const recurrence = recurrenceSelect ? (recurrenceSelect.value || "none") : "none";

  if (text === "") {
    errorMsg.textContent = "Please enter a task.";
    return;
  }

  if (text.length > MAX_TASK_LENGTH) {
    errorMsg.textContent = `Task is too long. Please keep it under ${MAX_TASK_LENGTH} characters (currently ${text.length}).`;
    return;
  }

  errorMsg.textContent = "";

  const newTask = {
    id: generateTaskId(),
    text: text,
    category,
    priority,
    completed: false,
    createdAt: typeof getFormattedDateTime === "function" ? getFormattedDateTime(new Date()) : new Date().toLocaleString(),
    deadline: deadline || null,
    penaltyApplied: false,
    tags
  };

  if (recurrence && recurrence !== "none") {
    newTask.recurrence = recurrence;
    const template = {
      id: `rt-${Date.now()}`,
      text,
      category,
      priority,
      recurrence,
      active: true,
      startDate: deadline || new Date().toISOString()
    };
    recurringTemplates.push(template);
    newTask.masterId = template.id;
  }

  try {
    const dependsSel = document.getElementById("dependsSelect");
    if (dependsSel) {
      const selected = Array.from(dependsSel.selectedOptions).map(o => o.value).filter(v => v !== "");
      newTask.depends = selected.map(v => parseInt(v)).filter(Boolean);
      const safeDeps = [];
      newTask.depends.forEach(did => {
        if (typeof hasCircularDependency === "function" && hasCircularDependency(newTask.id, did)) {
          if (window && window.showToast) window.showToast("Dependency removed to avoid circular reference", "warning");
        } else {
          safeDeps.push(did);
        }
      });
      newTask.depends = safeDeps;
    } else {
      newTask.depends = [];
    }
  } catch (e) {
    newTask.depends = [];
  }

  tasks.push(newTask);
  taskInput.value = "";
  if (taskTagsInput) taskTagsInput.value = "";
  if (deadlineInput) deadlineInput.value = "";

  if (typeof storeRecentTags === "function") storeRecentTags(tags);

  if (analyticsData && analyticsData.categoryStats) {
    if (!analyticsData.categoryStats[category]) {
      analyticsData.categoryStats[category] = { created: 0, completed: 0 };
    }
    analyticsData.categoryStats[category].created += 1;
  }

  if (typeof saveData === "function") saveData();
  renderTasks();

  if (typeof renderCalendar === "function") renderCalendar();
  if (typeof updateDeadlineAlerts === "function") updateDeadlineAlerts();

  if (typeof sendNotification === "function") sendNotification("Quest Assigned", `COMPLETE ${text} TASK ASAP`);
  if (typeof showTaskPopup === "function") showTaskPopup(`COMPLETE ${text.toUpperCase()} TASK ASAP`);
  if (typeof announce === "function") announce(`Task added: "${text}". Category: ${category}, Priority: ${priority}.`);
}

function removeTask(id) {
  // Remove references from other tasks' dependency lists
  tasks.forEach(t => {
    if (Array.isArray(t.depends) && t.depends.includes(id)) {
      t.depends = t.depends.filter(d => d !== id);
    }
    if (t.dependsOn && t.dependsOn === id) {
      delete t.dependsOn;
    }
  });
  tasks = tasks.filter(task => task.id !== id);
  saveAndRender();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  // Prevent completing if blocked by an incomplete prerequisite
  if (!task.completed && (Array.isArray(task.depends) ? task.depends.length > 0 : task.dependsOn)) {
    const deps = Array.isArray(task.depends) ? task.depends : (task.dependsOn ? [task.dependsOn] : []);
    const blocked = deps.some(did => {
      const pre = tasks.find(t => t.id === did);
      return pre && !pre.completed;
    });
    if (blocked) {
      const pending = deps.map(did => tasks.find(t => t.id === did)).filter(Boolean).filter(t => !t.completed).map(t => t.text);
      try { window.showToast(`Blocked — complete: ${pending.join(', ')}`, 'warning'); } catch(e){}
      return;
    }
  }
  tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
  saveAndRender();
}

function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  const newText = prompt("Edit task:", task.text);
  if (newText !== null && newText.trim() !== "") {
    if (newText.trim().length > MAX_TASK_LENGTH) {
      alert(`Task is too long. Please keep it under ${MAX_TASK_LENGTH} characters.`);
      return;
    }
    task.text = newText.trim();
  }
  // prompt for dependency selection (minimal UI): allow selecting multiple by comma-separated indices
  const choices = tasks.filter(t => t.id !== id).map((t, i) => `${i+1}. ${t.text} (id:${t.id}${t.completed? ' ✓':''})`);
  const sel = prompt(`Select prerequisite numbers (comma separated) or empty = none:\n${choices.join('\n')}`);
  if (sel !== null) {
    if (sel.trim() === '') {
      task.depends = [];
    } else {
      const parts = sel.split(/[,\s]+/).map(s => Number(s)).filter(n => Number.isFinite(n) && n>=1 && n<=choices.length);
      const chosen = parts.map(n => tasks.filter(t => t.id !== id)[n-1]).filter(Boolean).map(t => t.id);
      // filter out circular dependencies
      task.depends = chosen.filter(did => !hasCircularDependency(task.id, did));
    }
  }
  saveAndRender();
}

function saveAndRender() {
  try {
    if (window.TaskQuestStorage) {
      window.TaskQuestStorage.setTasks(tasks);
    } else {
      localStorage.setItem("taskquest_v1.tasks", JSON.stringify(tasks));
    }
  } catch (e) {
    console.warn("[TaskQuest] Failed to persist tasks.", e);
  }
  renderTasks();
  // Notify other modules (badges, analytics) that tasks changed
  try { document.dispatchEvent(new CustomEvent('tasksUpdated')); } catch (e) {}
}

function updateOverdueFlags(){
  const now = Date.now();
  tasks = tasks.map(t => {
    const copy = { ...t };
    copy.overdue = false;
    if (!copy.completed && copy.deadline){
      try{
        const d = new Date(copy.deadline).getTime();
        if (!isNaN(d) && d < now) copy.overdue = true;
      }catch(e){}
    }
    return copy;
  });
}

function renderTasks() {
  const taskListEl = document.getElementById("taskList");
  const boardColumns = document.getElementById("boardColumns");
  const filtersDiv = document.querySelector(".filters");

  if (!taskListEl) return;

  // Ensure new tasks always have a category for Kanban grouping
  tasks = tasks.map(task => {
    if (!task.category) task.category = "Theory";
    if (!task.priority) task.priority = "Medium";
    if (!task.tags) task.tags = [];
    return task;
  });

  if (currentView === "list" || !boardColumns) {
    taskListEl.style.display = "flex";
    if (boardColumns) boardColumns.style.display = "none";
    if (filtersDiv) filtersDiv.style.display = "flex";

    taskListEl.innerHTML = "";

    let filteredTasks = tasks;
    if (typeof taskMatchesFilters === "function") {
      filteredTasks = filteredTasks.filter(task => taskMatchesFilters(task));
    } else if (typeof activeFilter !== "undefined" && activeFilter === "Overdue") {
      filteredTasks = filteredTasks.filter(task => task.overdue);
    }

    if (smartSortEnabled && window.Prioritization) {
      filteredTasks = window.Prioritization.getSortedTasksByPriority(filteredTasks);
    }

    if (currentSort === "priority") {
      const priorityOrder = { High: 1, Medium: 2, Low: 3 };
      filteredTasks.sort((a, b) => (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99));
    } else if (currentSort === "alphabetical") {
      filteredTasks.sort((a, b) => a.text.localeCompare(b.text));
    } else if (currentSort === "deadline") {
      filteredTasks.sort((a, b) => {
        const aD = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const bD = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return aD - bD;
      });
    }

    if (filteredTasks.length === 0) {
      taskListEl.innerHTML = `
        <div class="empty-state">
          <i class="ri-ghost-2-line"></i>
          <h3>No Quests Yet</h3>
          <p>Add tasks and begin your productivity journey ✨</p>
        </div>
      `;
    } else {
      filteredTasks.forEach(task => {
        if (typeof createTaskEl === "function") {
          taskListEl.appendChild(createTaskEl(task));
        } else {
          const li = document.createElement("li");
          li.textContent = task.text;
          taskListEl.appendChild(li);
        }
      });
    }
  } else {
    taskListEl.style.display = "none";
    boardColumns.style.display = "grid";
    if (filtersDiv) filtersDiv.style.display = "none";

    boardColumns.innerHTML = "";
    const categories = ["Theory", "Practical", "Assignment", "Revision"];

    categories.forEach(cat => {
      const colDiv = document.createElement("div");
      colDiv.className = "board-column";
      colDiv.setAttribute("data-category", cat);

      const colTasks = tasks.filter(t => (t.category || "Theory") === cat);
      const catEmoji = typeof getCategoryEmoji === "function" ? getCategoryEmoji(cat) : "📌";

      colDiv.innerHTML = `
        <div class="board-column-header">
          <div class="column-title">${catEmoji} ${cat}</div>
          <div class="column-count">${colTasks.length}</div>
        </div>
        <div class="board-column-body" data-category="${cat}"></div>
      `;

      const bodyDiv = colDiv.querySelector(".board-column-body");
      colTasks.forEach(task => {
        if (typeof createTaskEl === "function") {
          bodyDiv.appendChild(createTaskEl(task));
        }
      });

      if (typeof setupColumnDragOver === "function") {
        setupColumnDragOver(bodyDiv);
      }
      boardColumns.appendChild(colDiv);
    });
  }

  if (typeof renderTagSuggestions === "function") renderTagSuggestions();
  if (typeof renderTagFilters === "function") renderTagFilters();
  if (typeof updateStats === "function") updateStats();
  try { if (typeof renderDependsSelect === "function") renderDependsSelect(); } catch (e) {}
}

// ==========================
// Flashcards Study Mode
// ==========================
function loadFlashcards() {
  try {
    if (window.TaskQuestStorage && window.TaskQuestStorage.getFlashcards) {
      flashcards = window.TaskQuestStorage.getFlashcards();
    } else {
      flashcards = JSON.parse(localStorage.getItem("taskquest_v1.flashcards") || "[]");
    }
  } catch (e) {
    flashcards = [];
  }
  if (!Array.isArray(flashcards)) flashcards = [];
}

function saveFlashcards() {
  try {
    if (window.TaskQuestStorage && window.TaskQuestStorage.setFlashcards) {
      window.TaskQuestStorage.setFlashcards(flashcards);
    } else {
      localStorage.setItem("taskquest_v1.flashcards", JSON.stringify(flashcards));
    }
  } catch (e) {
    console.warn("[TaskQuest] Failed to persist flashcards.", e);
  }
}

function getActiveFlashcards() {
  if (flashSubjectFilter === "All") return flashcards;
  return flashcards.filter(card => card.subject === flashSubjectFilter);
}

function rebuildFlashcardOrder() {
  const active = getActiveFlashcards();
  flashcardOrder = active.map(card => card.id);
  if (flashShuffleEnabled) {
    for (let i = flashcardOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [flashcardOrder[i], flashcardOrder[j]] = [flashcardOrder[j], flashcardOrder[i]];
    }
  }
  currentFlashIndex = 0;
}

function getCurrentFlashcard() {
  const active = getActiveFlashcards();
  if (active.length === 0) return null;
  const id = flashcardOrder[currentFlashIndex] || active[0].id;
  return active.find(card => card.id === id) || active[0];
}

function renderFlashcardSubjects() {
  const select = document.getElementById("flashSubjectFilter");
  if (!select) return;
  const subjects = Array.from(new Set(flashcards.map(card => card.subject))).sort();
  const options = ['All', ...subjects];
  select.innerHTML = options.map(sub => `<option value="${escapeHtml(sub)}">${escapeHtml(sub)}</option>`).join("");
  select.value = flashSubjectFilter;
}

function updateFlashcardCounters() {
  const active = getActiveFlashcards();
  const learnedCount = active.filter(card => card.status === "learned").length;
  const counterEl = document.getElementById("flashcardCounter");
  const progressEl = document.getElementById("flashcardProgressText");
  if (counterEl) {
    const displayIndex = active.length ? currentFlashIndex + 1 : 0;
    counterEl.textContent = `Card ${displayIndex} / ${active.length}`;
  }
  if (progressEl) {
    progressEl.textContent = `${learnedCount} / ${active.length} learned`;
  }
}

function renderFlashcardView() {
  renderFlashcardSubjects();
  rebuildFlashcardOrder();
  updateFlashcardDisplay();
}

function updateFlashcardDisplay() {
  const cardEl = document.getElementById("flashcardCard");
  const qEl = document.getElementById("flashQuestionText");
  const aEl = document.getElementById("flashAnswerText");
  if (!cardEl || !qEl || !aEl) return;

  cardEl.classList.remove("is-flipped");
  const card = getCurrentFlashcard();
  if (!card) {
    qEl.textContent = "Add a flashcard to begin.";
    aEl.textContent = "Your answer will appear here.";
    updateFlashcardCounters();
    return;
  }

  qEl.textContent = card.question;
  aEl.textContent = card.answer;
  updateFlashcardCounters();
}

function goToFlashcard(delta) {
  const active = getActiveFlashcards();
  if (active.length === 0) return;
  currentFlashIndex = (currentFlashIndex + delta + active.length) % active.length;
  updateFlashcardDisplay();
}

function toggleFlashcardFlip() {
  const cardEl = document.getElementById("flashcardCard");
  if (cardEl) cardEl.classList.toggle("is-flipped");
}

function updateFlashcardStatus(status) {
  const card = getCurrentFlashcard();
  if (!card) return;
  card.status = status;
  saveFlashcards();
  updateFlashcardCounters();
  goToFlashcard(1);
}

function initFlashcards() {
  loadFlashcards();
  renderFlashcardSubjects();
  rebuildFlashcardOrder();
  updateFlashcardDisplay();

  const addBtn = document.getElementById("addFlashcardBtn");
  const subjectInput = document.getElementById("flashSubjectInput");
  const questionInput = document.getElementById("flashQuestionInput");
  const answerInput = document.getElementById("flashAnswerInput");
  const filterSelect = document.getElementById("flashSubjectFilter");
  const shuffleBtn = document.getElementById("flashShuffleBtn");
  const prevBtn = document.getElementById("flashPrevBtn");
  const nextBtn = document.getElementById("flashNextBtn");
  const flipBtn = document.getElementById("flashFlipBtn");
  const learnedBtn = document.getElementById("flashLearnedBtn");
  const reviewBtn = document.getElementById("flashReviewBtn");
  const cardEl = document.getElementById("flashcardCard");

  if (addBtn && subjectInput && questionInput && answerInput) {
    addBtn.addEventListener("click", () => {
      const subject = subjectInput.value.trim();
      const question = questionInput.value.trim();
      const answer = answerInput.value.trim();
      if (!subject || !question || !answer) {
        if (window.showToast) window.showToast("Please fill subject, question, and answer.", "warning");
        return;
      }
      const card = {
        id: `fc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        subject,
        question,
        answer,
        status: "new",
        createdAt: new Date().toISOString()
      };
      flashcards.push(card);
      saveFlashcards();
      subjectInput.value = "";
      questionInput.value = "";
      answerInput.value = "";
      flashSubjectFilter = "All";
      renderFlashcardView();
      if (window.showToast) window.showToast("Flashcard added.", "success");
    });
  }

  if (filterSelect) {
    filterSelect.addEventListener("change", () => {
      flashSubjectFilter = filterSelect.value || "All";
      renderFlashcardView();
    });
  }

  if (shuffleBtn) {
    shuffleBtn.addEventListener("click", () => {
      flashShuffleEnabled = !flashShuffleEnabled;
      shuffleBtn.setAttribute("aria-pressed", flashShuffleEnabled ? "true" : "false");
      shuffleBtn.classList.toggle("active", flashShuffleEnabled);
      rebuildFlashcardOrder();
      updateFlashcardDisplay();
    });
  }

  prevBtn?.addEventListener("click", () => goToFlashcard(-1));
  nextBtn?.addEventListener("click", () => goToFlashcard(1));
  flipBtn?.addEventListener("click", toggleFlashcardFlip);
  learnedBtn?.addEventListener("click", () => updateFlashcardStatus("learned"));
  reviewBtn?.addEventListener("click", () => updateFlashcardStatus("review"));
  cardEl?.addEventListener("click", toggleFlashcardFlip);

  document.addEventListener("keydown", (e) => {
    const activeTab = document.querySelector(".tab-content.active");
    if (!activeTab || activeTab.id !== "flashcards-tab") return;
    const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName || "");
    if (isTyping) return;

    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      toggleFlashcardFlip();
    } else if (e.key === "ArrowRight") {
      goToFlashcard(1);
    } else if (e.key === "ArrowLeft") {
      goToFlashcard(-1);
    } else if (e.key.toLowerCase() === "l") {
      updateFlashcardStatus("learned");
    } else if (e.key.toLowerCase() === "r") {
      updateFlashcardStatus("review");
    } else if (e.key.toLowerCase() === "s") {
      flashShuffleEnabled = !flashShuffleEnabled;
      if (shuffleBtn) {
        shuffleBtn.setAttribute("aria-pressed", flashShuffleEnabled ? "true" : "false");
        shuffleBtn.classList.toggle("active", flashShuffleEnabled);
      }
      rebuildFlashcardOrder();
      updateFlashcardDisplay();
    }
  });
}

function updateStats() {
  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const overdueCount = tasks.filter(t => t.overdue).length;

  if (taskStats) {
    taskStats.innerText = `✅ ${completedCount} / ${totalCount} completed`;
  }

  const overdueEl = document.getElementById('overdueCount');
  if (overdueEl) {
    overdueEl.innerText = overdueCount;
    const sc = overdueEl.closest('.stat-card');
    if (sc) sc.classList.toggle('overdue', overdueCount>0);
  }

  if (celebration) {
    if (totalCount > 0 && completedCount === totalCount) {
      celebration.classList.remove("hidden");
      setTimeout(() => celebration.classList.add("show"), 10);
    } else {
      celebration.classList.remove("show");
      celebration.classList.add("hidden");
    }
  }
}

// --- Theme Management ---

function initTheme() {
  let savedTheme = "cosmic";
  try {
    savedTheme = (window.TaskQuestStorage
      ? window.TaskQuestStorage.getTheme()
      : localStorage.getItem("taskquest_v1.theme") || localStorage.getItem("quests_theme")) || "cosmic";
  } catch (e) {
    console.warn("[TaskQuest] Could not read theme from storage.", e);
  }
  document.documentElement.setAttribute("data-theme", savedTheme);

  if (themeSwitcher) {
    themeSwitcher.value = savedTheme;
    themeSwitcher.addEventListener("change", (e) => {
      const selectedTheme = e.target.value;
      document.documentElement.setAttribute("data-theme", selectedTheme);
      try {
        if (window.TaskQuestStorage) {
          window.TaskQuestStorage.setTheme(selectedTheme);
        } else {
          localStorage.setItem("taskquest_v1.theme", selectedTheme);
        }
      } catch (err) {
        console.warn("[TaskQuest] Failed to persist theme.", err);
      }
    });
  }
}

function populateDependsSelect(){
  const sel = document.getElementById('dependsSelect');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '<option value="">No prerequisite</option>';
  tasks.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.text = `${t.text}${t.completed? ' ✓':''}`;
    sel.appendChild(opt);
  });
  if (prev) sel.value = prev;
}

function escapeHtml(str){
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* Export JSON Logic */
document.getElementById('exportJsonBtn')?.addEventListener('click', () => { const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tasks, null, 2)); const dlAnchorElem = document.createElement('a'); dlAnchorElem.setAttribute('href', dataStr); dlAnchorElem.setAttribute('download', 'taskquest_backup.json'); dlAnchorElem.click(); });

window.addEventListener('error', (e) => console.error('Global Error:', e.message));

window.addEventListener('error', (e) => console.error('Global Error:', e.message));
