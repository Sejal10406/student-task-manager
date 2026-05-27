"use strict";
(function() {
  // Use unified storage keys when available, fall back to legacy keys
  const _S = window.TaskQuestStorage;
  const STORAGE_KEY = _S ? _S.KEYS.LEADERBOARD    : "taskquest_leaderboard_v1";
  const PROFILE_KEY = _S ? _S.KEYS.PROFILE         : "quests_profile";
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
        score: Number(entry.score || 0),
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
      const tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || "[]");
      const completedTasks = Array.isArray(tasks) ? tasks.filter(task => task.completed).length : 0;
      const coins = parseInt(localStorage.getItem(COINS_KEY), 10) || 0;
      const streak = parseInt(localStorage.getItem(STREAK_KEY), 10) || 0;
      const xp = parseInt(localStorage.getItem(XP_KEY), 10) || 0;
      const name = profile?.name || "You";
      const score = coins + completedTasks * 30 + streak * 20 + Math.floor(xp / 10);

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

  function buildRow(entry, rank, highlight) {
    const row = document.createElement("tr");
    row.className = `leaderboard-row${highlight ? " highlight-row" : ""}`;
    row.innerHTML = `
      <td class="row-rank">#${rank}</td>
      <td class="row-player">
        <div class="player-name">${entry.name}</div>
        <div class="player-subtitle">Score ${entry.score} • ${entry.completedTasks} tasks • ${entry.streak}-day streak</div>
      </td>
      <td class="row-score">${entry.score}</td>
      <td class="row-completed">${entry.completedTasks}</td>
      <td class="row-streak">${entry.streak}</td>
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
      const isCurrentUser = entry.id === "me";
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
    const currentPlayer = getCurrentPlayerData();
    const existingIndex = entries.findIndex(entry => entry.id === "me");

    if (existingIndex >= 0) {
      entries[existingIndex] = currentPlayer;
    } else {
      entries.push(currentPlayer);
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
      alert("Please enter a player name.");
      return;
    }

    const entries = loadLeaderboard();
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
  }

  function simulateScoreBoost() {
    const entries = loadLeaderboard();
    if (!entries.length) return;
    const randomPlayer = entries[Math.floor(Math.random() * entries.length)];
    const boost = Math.round(Math.random() * 120 + 40);
    randomPlayer.score += boost;
    randomPlayer.completedTasks += Math.random() > 0.5 ? 1 : 0;
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

    window.addEventListener("storage", event => {
      if (event.key === STORAGE_KEY || event.key === PROFILE_KEY || event.key === COINS_KEY || event.key === TASKS_KEY || event.key === STREAK_KEY || event.key === XP_KEY) {
        renderLeaderboard();
      }
    });
  }

  function init() {
    if (!localStorage.getItem(STORAGE_KEY)) {
      createSampleData();
    }

    renderLeaderboard();
    attachEvents();
    setInterval(renderLeaderboard, REFRESH_INTERVAL);
  }

  init();
})();
