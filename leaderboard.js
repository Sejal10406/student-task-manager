"use strict";
(function() {
  // Maximum score any single player entry may hold in the leaderboard store.
  const MAX_PLAYER_SCORE = 9999;

  // Rate-limit simulateScoreBoost: minimum milliseconds between invocations.
  const BOOST_COOLDOWN_MS = 3000;
  let _lastBoostAt = 0;
  // Use unified storage keys when available, fall back to legacy keys
  const _S = window.TaskQuestStorage;
  const STORAGE_KEY = _S ? _S.KEYS.LEADERBOARD    : "taskquest_leaderboard_v1";
  const PROFILE_KEY = _S ? _S.KEYS.PROFILE         : "quests_profile"; // This is correct
  const COINS_KEY   = _S ? _S.KEYS.COINS            : "coins";
  const TASKS_KEY   = _S ? _S.KEYS.TASKS            : "quests";
  const STREAK_KEY  = _S ? _S.KEYS.STREAK           : "streak";
  const XP_KEY      = _S ? _S.KEYS.XP               : "xp";
  const REFRESH_INTERVAL = 900;
  const currentTimestamp = () => new Date().toISOString();

  const elements = {
    leaderboardTable: document.getElementById("leaderboardTable"),
    leaderboardBody: document.getElementById("leaderboardBody"),
    liveStatus: document.getElementById("liveStatus"),
    lastUpdatedText: document.getElementById("lastUpdatedText"),
    myRank: document.getElementById("myRank"),
    myScore: document.getElementById("myScore"),
    myCompleted: document.getElementById("myCompleted"),
    myStreak: document.getElementById("myStreak"),
    syncStatsBtn: document.getElementById("syncStatsBtn"),
    addPlayerBtn: document.getElementById("addPlayerBtn"),
    randomBoostBtn: document.getElementById("randomBoostBtn"),
    refreshBtn: document.getElementById("refreshBtn"),
    playerNameInput: document.getElementById("playerNameInput"),
    playerScoreInput: document.getElementById("playerScoreInput"),
    playerCompletedInput: document.getElementById("playerCompletedInput"),
    playerStreakInput: document.getElementById("playerStreakInput")
  };

  function createSampleData() {
    const sample = [
      { id: "me", name: "You", score: 720, completedTasks: 18, streak: 5, lastUpdated: currentTimestamp() },
      { id: "arya", name: "Arya", score: 840, completedTasks: 22, streak: 8, lastUpdated: currentTimestamp() },
      { id: "noah", name: "Noah", score: 660, completedTasks: 16, streak: 6, lastUpdated: currentTimestamp() },
      { id: "mia", name: "Mia", score: 610, completedTasks: 14, streak: 7, lastUpdated: currentTimestamp() },
      { id: "leo", name: "Leo", score: 530, completedTasks: 11, streak: 4, lastUpdated: currentTimestamp() }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sample));
    return sample;
  }

  function loadLeaderboard() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createSampleData();
    }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return createSampleData();
      }
      return parsed.map(entry => ({
        id: entry.id || `${entry.name}-${Math.random().toString(36).slice(2)}`,
        name: entry.name || "Player",
        score: Math.min(MAX_PLAYER_SCORE, Math.max(0, Number(entry.score || 0))),
        completedTasks: Number(entry.completedTasks || 0),
        streak: Number(entry.streak || 0),
        lastUpdated: entry.lastUpdated || currentTimestamp()
      }));
    } catch (e) {
      return createSampleData();
    }
  }

  function saveLeaderboard(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function sortLeaderboard(entries) {
    return entries.slice().sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.completedTasks !== a.completedTasks) return b.completedTasks - a.completedTasks;
      if (b.streak !== a.streak) return b.streak - a.streak;
      return new Date(b.lastUpdated) - new Date(a.lastUpdated);
    });
  }

  function getCurrentPlayerData() {
    try {
      const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");

      // Read tasks from the unified key first (post-#358 migration), then
      const tasksRaw = (_S ? _S.getTasks() : null)
        || localStorage.getItem("taskquest_v1.tasks")
        || localStorage.getItem(TASKS_KEY)
        || "[]";
      
      const tasks = typeof tasksRaw === 'string' ? JSON.parse(tasksRaw) : tasksRaw;
      const completedTasks = Array.isArray(tasks) ? tasks.filter(task => task.completed).length : 0;

      const coins = _S ? _S.getCoins() : (parseInt(localStorage.getItem(COINS_KEY), 10) || 0);
      const streak = _S ? _S.getStreak() : (parseInt(localStorage.getItem(STREAK_KEY), 10) || 0);
      const xp = _S ? _S.getXP() : (parseInt(localStorage.getItem(XP_KEY), 10) || 0);

      const name = profile?.name || "You";
      const rawScore = coins + completedTasks * 30 + streak * 20 + Math.floor(xp / 10);
      // Final guard: if any operand was still NaN for any reason, fall back to 0.
      const score = Number.isFinite(rawScore) ? rawScore : 0;

      return {
        id: "me",
        name,
        score,
        completedTasks,
        streak,
        lastUpdated: currentTimestamp()
      };
    } catch (e) {
      return { id: "me", name: "You", score: 0, completedTasks: 0, streak: 0, lastUpdated: currentTimestamp() };
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildRow(entry, rank, highlight) {
    const row = document.createElement("tr");
    let rowClass = `leaderboard-row${highlight ? " highlight-row" : ""}`;
    if (rank <= 3) rowClass += ` rank-${rank}`;
    row.className = rowClass;
    const safeName  = escapeHtml(entry.name);
    const safeScore = Number.isFinite(entry.score) ? entry.score : 0;
    const safeTasks  = Number.isFinite(entry.completedTasks) ? entry.completedTasks : 0;
    const safeStreak = Number.isFinite(entry.streak) ? entry.streak : 0;
    const crown = rank === 1 ? '<i class="ri-vip-crown-fill" style="margin-left:8px; color:#ffd700"></i>' : '';
    row.innerHTML = `
      <td class="row-rank">#${rank}</td>
      <td class="row-player">
        <div class="player-name">${safeName}${crown}</div>
        <div class="player-subtitle">Score ${safeScore} • ${safeTasks} tasks • ${safeStreak}-day streak</div>
      </td>
      <td class="row-score">${safeScore}</td>
      <td class="row-completed">${safeTasks}</td>
      <td class="row-streak">${safeStreak}</td>
    `;
    return row;
  }

  function renderLeaderboard() {
    const entries = sortLeaderboard(loadLeaderboard());
    const currentUser = getCurrentPlayerData();
    const merged = entries.filter(item => item.id !== "me");
    const existing = entries.find(item => item.id === "me");
    if (existing) {
      merged.unshift(existing);
    } else {
      merged.unshift(currentUser);
    }

    const sorted = sortLeaderboard(merged);
    elements.leaderboardBody.innerHTML = "";

    sorted.forEach((entry, index) => {
      const isCurrentUser = entry.id === "me" || (entry.name === currentUser.name && entry.score === currentUser.score); // More robust check
      elements.leaderboardBody.appendChild(buildRow(entry, index + 1, isCurrentUser));
    });

    const rank = sorted.findIndex(entry => entry.id === "me") + 1;
    const personal = sorted.find(entry => entry.id === "me") || currentUser;

    elements.myRank.textContent = rank || "—";
    elements.myScore.textContent = personal.score;
    elements.myCompleted.textContent = personal.completedTasks;
    elements.myStreak.textContent = personal.streak;

    updateStatus("Live", "Updated at " + new Date().toLocaleTimeString());
  }

  function updateStatus(label, detail) {
    elements.liveStatus.textContent = label;
    elements.lastUpdatedText.textContent = detail;
  }

  function syncMyStats() {
    const entries = loadLeaderboard();
    const liveData = getCurrentPlayerData();
    const existingIndex = entries.findIndex(entry => entry.id === "me");

    if (existingIndex >= 0) {
      const existing = entries[existingIndex];
      // Merge live-computed fields onto the existing entry rather than
      // replacing it wholesale. This preserves any score that was manually
      // set via addOrUpdatePlayer and prevents syncMyStats from zeroing out
      // the user's completedTasks count when the tasks key has not yet been
      // migrated to the unified namespace on the leaderboard page.
      // Only update a field if the live value is strictly greater than the
      // stored value, so a sync never reduces a player's standing. (Except name)
      entries[existingIndex] = {
        ...existing,
        name: liveData.name, // Name can always be updated
        score: Math.max(existing.score, liveData.score),
        completedTasks: Math.max(existing.completedTasks, liveData.completedTasks),
        streak: Math.max(existing.streak, liveData.streak),
        lastUpdated: currentTimestamp()
      };
    } else {
      entries.push(liveData);
    }

    saveLeaderboard(entries);
    renderLeaderboard();
  }

  function addOrUpdatePlayer() {
    if (!elements.playerNameInput) return;
    const name = elements.playerNameInput.value.trim();
    const score = Number(elements.playerScoreInput.value) || 0;
    const completedTasks = Number(elements.playerCompletedInput.value) || 0;
    const streak = Number(elements.playerStreakInput.value) || 0;

    if (!name) {
      elements.playerNameInput.classList.add('input-invalid');
      elements.playerNameInput.focus();
      alert("Please enter a player name."); // Use alert for now, can integrate with toast later
      return;
    }

    const entries = loadLeaderboard(); // Load current entries
    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]+/gi, "-");
    const existing = entries.find(entry => entry.name.toLowerCase() === name.toLowerCase());

    if (existing) {
      existing.score = score;
      existing.completedTasks = completedTasks;
      existing.streak = streak;
      existing.lastUpdated = currentTimestamp();
    } else {
      entries.push({
        id: `player-${normalizedName}-${Date.now()}`,
        name,
        score,
        completedTasks,
        streak,
        lastUpdated: currentTimestamp()
      });
    }

    saveLeaderboard(entries);
    renderLeaderboard();
    elements.playerNameInput.value = "";
    elements.playerScoreInput.value = "";
    elements.playerCompletedInput.value = "";
    elements.playerStreakInput.value = "";
    elements.playerStreakInput.value = ""; // Clear streak input too
  }

  function simulateScoreBoost() {
    // Rate-limit: reject invocations that arrive within the cooldown window.
    const now = Date.now();
    if (now - _lastBoostAt < BOOST_COOLDOWN_MS) {
      return;
    }
    _lastBoostAt = now;

    const entries = loadLeaderboard();
    if (!entries.length) return;

    const randomPlayer = entries[Math.floor(Math.random() * entries.length)];
    const boost = Math.round(Math.random() * 120 + 40);

    // Clamp score to MAX_PLAYER_SCORE so repeated boosts cannot inflate
    // the persisted value beyond a defined ceiling.
    randomPlayer.score = Math.min(MAX_PLAYER_SCORE, randomPlayer.score + boost);
    randomPlayer.completedTasks += Math.random() > 0.5 ? 1 : 0; // Small chance to increment tasks/streak
    randomPlayer.streak += Math.random() > 0.6 ? 1 : 0;
    randomPlayer.lastUpdated = currentTimestamp();

    saveLeaderboard(entries);
    renderLeaderboard();
  }

  function attachEvents() {
    elements.syncStatsBtn.addEventListener("click", syncMyStats);
    elements.addPlayerBtn.addEventListener("click", addOrUpdatePlayer);
    elements.randomBoostBtn.addEventListener("click", simulateScoreBoost);
    elements.refreshBtn.addEventListener("click", renderLeaderboard);

    window.addEventListener("storage", event => { // Listen for changes in other tabs/windows
      if (event.key === STORAGE_KEY || event.key === PROFILE_KEY || event.key === COINS_KEY || event.key === TASKS_KEY || event.key === STREAK_KEY || event.key === XP_KEY) {
        renderLeaderboard();
      }
    });
  }

  function init() {
    if (!localStorage.getItem(STORAGE_KEY)) {
      createSampleData();
    }

    renderLeaderboard(); // Initial render
    attachEvents();
    setInterval(renderLeaderboard, REFRESH_INTERVAL);
  }

  init();
})();
