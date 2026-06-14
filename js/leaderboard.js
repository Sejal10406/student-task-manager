/**
 * @fileoverview TaskQuest Client Library and utilities.
 * @author Senior Open-Source Contributor
 * @version 2.0.0
 */

"use strict";
(function () {

  /* ── CONSTANTS ── */
  const MAX_SCORE       = 9999;
  const BOOST_COOLDOWN  = 3000;
  const REFRESH_MS      = 900;
  const STORAGE_KEY     = "taskquest_leaderboard_v1";
  const PROFILE_KEY     = "quests_profile";
  const COINS_KEY       = "coins";
  const TASKS_KEY       = "quests";
  const STREAK_KEY      = "streak";
  const XP_KEY          = "xp";

  /* ── STATE ── */
  let _lastBoostAt = 0;
  let _toastTimer  = null;
  let _prevScores  = {};   // id → last-rendered score, for flash animation

  /* ── AVATAR COLOURS (cycling) ── */
  const AVATAR_COLORS = [
    ["#1d3461","#60a5fa"],
    ["#1a3a2a","#34d399"],
    ["#3b1f1f","#f87171"],
    ["#2e2014","#f5c842"],
    ["#2c1a3d","#a78bfa"],
    ["#1f2d3d","#38bdf8"],
    ["#3a1a2d","#f472b6"],
  ];

  function avatarColor(index) {
    return AVATAR_COLORS[index % AVATAR_COLORS.length];
  }

  function initials(name) {
    const parts = String(name).trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return String(name).slice(0, 2).toUpperCase();
  }

  /* ── DOM ── */
  const el = {
    body:          document.getElementById("leaderboardBody"),
    lastUpdated:   document.getElementById("lastUpdatedText"),
    myRank:        document.getElementById("myRank"),
    myScore:       document.getElementById("myScore"),
    myCompleted:   document.getElementById("myCompleted"),
    myStreak:      document.getElementById("myStreak"),
    syncBtn:       document.getElementById("syncStatsBtn"),
    addBtn:        document.getElementById("addPlayerBtn"),
    boostBtn:      document.getElementById("randomBoostBtn"),
    refreshBtn:    document.getElementById("refreshBtn"),
    nameInput:     document.getElementById("playerNameInput"),
    scoreInput:    document.getElementById("playerScoreInput"),
    completedInput:document.getElementById("playerCompletedInput"),
    streakInput:   document.getElementById("playerStreakInput"),
    form:          document.getElementById("playerForm"),
    toast:         document.getElementById("toast"),
  };

  /* ── TOAST ── */
  function showToast(msg, type = "success") {
    clearTimeout(_toastTimer);
    el.toast.textContent = msg;
    el.toast.className = "show " + type;
    _toastTimer = setTimeout(() => { el.toast.className = ""; }, 2800);
  }

  /* ── STORAGE ── */
  function now() { return new Date().toISOString(); }

  function loadLeaderboard() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return seedData();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return seedData();
      return parsed.map(normalise);
    } catch (_) {
      return seedData();
    }
  }

  function saveLeaderboard(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function normalise(e) {
    return {
      id:             e.id || "p-" + Math.random().toString(36).slice(2),
      name:           String(e.name || "Player"),
      score:          clamp(Number(e.score) || 0, 0, MAX_SCORE),
      completedTasks: Math.max(0, Number(e.completedTasks) || 0),
      streak:         Math.max(0, Number(e.streak) || 0),
      lastUpdated:    e.lastUpdated || now(),
    };
  }

  function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }

  function seedData() {
    const sample = [
      { id: "me",   name: "You",   score: 720, completedTasks: 18, streak: 5 },
      { id: "arya", name: "Arya",  score: 840, completedTasks: 22, streak: 8 },
      { id: "noah", name: "Noah",  score: 660, completedTasks: 16, streak: 6 },
      { id: "mia",  name: "Mia",   score: 610, completedTasks: 14, streak: 7 },
      { id: "leo",  name: "Leo",   score: 530, completedTasks: 11, streak: 4 },
    ].map(e => ({ ...normalise(e), lastUpdated: now() }));
    saveLeaderboard(sample);
    return sample;
  }

  function sortEntries(arr) {
    return arr.slice().sort((a, b) => {
      if (b.score !== a.score)          return b.score - a.score;
      if (b.completedTasks !== a.completedTasks) return b.completedTasks - a.completedTasks;
      if (b.streak !== a.streak)        return b.streak - a.streak;
      return new Date(b.lastUpdated) - new Date(a.lastUpdated);
    });
  }

  /* ── LIVE PLAYER DATA ── */
  function getLivePlayerData() {
    try {
      const profile       = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
      const rawTasks      = localStorage.getItem("taskquest_v1.tasks")
                          || localStorage.getItem(TASKS_KEY)
                          || "[]";
      const tasks         = JSON.parse(rawTasks);
      const completedTasks = Array.isArray(tasks) ? tasks.filter(t => t.completed).length : 0;
      const coins  = parseInt(localStorage.getItem(COINS_KEY),  10) || 0;
      const streak = parseInt(localStorage.getItem(STREAK_KEY), 10) || 0;
      const xp     = parseInt(localStorage.getItem(XP_KEY),     10) || 0;
      const rawScore = coins + completedTasks * 30 + streak * 20 + Math.floor(xp / 10);
      return {
        id:             "me",
        name:           profile?.name || "You",
        score:          Number.isFinite(rawScore) ? rawScore : 0,
        completedTasks,
        streak,
        lastUpdated:    now(),
      };
    } catch (_) {
      return { id: "me", name: "You", score: 0, completedTasks: 0, streak: 0, lastUpdated: now() };
    }
  }

  /* ── RENDER ── */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function renderLeaderboard() {
    const raw     = loadLeaderboard();
    const live    = getLivePlayerData();
    const withoutMe = raw.filter(e => e.id !== "me");
    const meEntry   = raw.find(e => e.id === "me") || live;
    const merged  = sortEntries([meEntry, ...withoutMe]);

    /* update sidebar */
    const myIdx = merged.findIndex(e => e.id === "me");
    const myEntry = merged[myIdx] || meEntry;
    el.myRank.textContent      = myIdx >= 0 ? "#" + (myIdx + 1) : "—";
    el.myScore.textContent     = myEntry.score;
    el.myCompleted.textContent = myEntry.completedTasks;
    el.myStreak.textContent    = myEntry.streak;
    el.lastUpdated.textContent = "Updated " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    /* render rows */
    el.body.innerHTML = "";

    if (merged.length === 0) {
      el.body.innerHTML = '<div class="lb-empty">No players yet — add one below.</div>';
      return;
    }

    merged.forEach((entry, idx) => {
      const rank    = idx + 1;
      const isMe    = entry.id === "me";
      const [bg, fg] = avatarColor(idx);
      const prevScore = _prevScores[entry.id];
      const scoreUp   = prevScore !== undefined && entry.score > prevScore;
      _prevScores[entry.id] = entry.score;

      const rankClass  = rank <= 3 ? ` r${rank}` : "";
      const meClass    = isMe ? " is-me" : "";
      const crowns     = ["👑", "🥈", "🥉"];
      const crownHtml  = rank <= 3
        ? `<span class="crown" aria-hidden="true">${crowns[rank - 1]}</span>`
        : "";
      const rankColor  = rank === 1 ? " r1" : rank === 2 ? " r2" : rank === 3 ? " r3" : "";
      const meTag      = isMe ? '<span class="me-tag">you</span>' : "";
      const scoreClass = scoreUp ? " score-up" : "";

      const row = document.createElement("div");
      row.className = "lb-row" + rankClass + meClass;
      row.setAttribute("role", "listitem");
      row.style.animationDelay = (idx * 0.04) + "s";
      row.innerHTML = `
        <div class="cell-rank${rankColor}">
          <span class="rank-num">${rank}</span>
          ${crownHtml}
        </div>
        <div class="cell-player">
          <div class="avatar" style="background:${bg}; color:${fg}" aria-hidden="true">
            ${escHtml(initials(entry.name))}
          </div>
          <div>
            <div class="player-name">${escHtml(entry.name)}${meTag}</div>
            <div class="player-sub">${entry.completedTasks} tasks · ${entry.streak}d streak</div>
          </div>
        </div>
        <div class="cell-score${scoreClass}">${entry.score}</div>
        <div class="cell-completed">${entry.completedTasks}</div>
        <div class="cell-streak">${entry.streak > 0 ? "🔥 " : ""}${entry.streak}</div>
      `;
      el.body.appendChild(row);
    });
  }

  /* ── SYNC ── */
  function syncMyStats() {
    const entries = loadLeaderboard();
    const live    = getLivePlayerData();
    const idx     = entries.findIndex(e => e.id === "me");

    if (idx >= 0) {
      const existing = entries[idx];
      entries[idx] = {
        ...existing,
        name:           live.name,
        score:          Math.max(existing.score, live.score),
        completedTasks: Math.max(existing.completedTasks, live.completedTasks),
        streak:         Math.max(existing.streak, live.streak),
        lastUpdated:    now(),
      };
    } else {
      entries.push(live);
    }

    saveLeaderboard(entries);
    renderLeaderboard();
    showToast("Stats synced!", "success");
  }

  /* ── ADD / UPDATE PLAYER ── */
  function addOrUpdatePlayer(e) {
    e.preventDefault();
    const name     = el.nameInput.value.trim();
    const score    = Math.max(0, Number(el.scoreInput.value) || 0);
    const completed = Math.max(0, Number(el.completedInput.value) || 0);
    const streak   = Math.max(0, Number(el.streakInput.value) || 0);

    el.nameInput.classList.remove("invalid");

    if (!name) {
      el.nameInput.classList.add("invalid");
      el.nameInput.focus();
      showToast("Please enter a player name.", "error");
      return;
    }

    const entries = loadLeaderboard();
    const existing = entries.find(e => e.name.toLowerCase() === name.toLowerCase());

    if (existing) {
      existing.score          = score;
      existing.completedTasks = completed;
      existing.streak         = streak;
      existing.lastUpdated    = now();
      showToast(`Updated ${name}!`, "success");
    } else {
      entries.push({
        id:             "p-" + name.toLowerCase().replace(/\W+/g, "-") + "-" + Date.now(),
        name,
        score,
        completedTasks: completed,
        streak,
        lastUpdated:    now(),
      });
      showToast(`${name} added to the board!`, "success");
    }

    saveLeaderboard(entries);
    renderLeaderboard();

    el.nameInput.value      = "";
    el.scoreInput.value     = "";
    el.completedInput.value = "";
    el.streakInput.value    = "";
  }

  /* ── SIMULATE BOOST ── */
  function simulateBoost() {
    const ts = Date.now();
    if (ts - _lastBoostAt < BOOST_COOLDOWN) return;
    _lastBoostAt = ts;

    const entries = loadLeaderboard();
    if (!entries.length) return;

    const target = entries[Math.floor(Math.random() * entries.length)];
    const boost  = Math.round(Math.random() * 120 + 40);
    target.score          = Math.min(MAX_SCORE, target.score + boost);
    target.completedTasks += Math.random() > 0.5 ? 1 : 0;
    target.streak         += Math.random() > 0.6 ? 1 : 0;
    target.lastUpdated    = now();

    saveLeaderboard(entries);
    renderLeaderboard();
    showToast(`${target.name} gained +${boost} pts!`, "success");
  }

  /* ── EVENTS ── */
  function attachEvents() {
    el.syncBtn.addEventListener("click", syncMyStats);
    el.form.addEventListener("submit", addOrUpdatePlayer);
    el.boostBtn.addEventListener("click", simulateBoost);
    el.refreshBtn.addEventListener("click", () => { renderLeaderboard(); showToast("Board refreshed.", "success"); });

    /* clear invalid state on type */
    el.nameInput.addEventListener("input", () => el.nameInput.classList.remove("invalid"));

    /* cross-tab sync */
    window.addEventListener("storage", evt => {
      const watched = [STORAGE_KEY, PROFILE_KEY, COINS_KEY, TASKS_KEY, STREAK_KEY, XP_KEY];
      if (watched.includes(evt.key)) renderLeaderboard();
    });
  }

  /* ── BOOT ── */
  function init() {
    if (!localStorage.getItem(STORAGE_KEY)) seedData();
    renderLeaderboard();
    attachEvents();
    setInterval(renderLeaderboard, REFRESH_MS);
  }

  init();
})();

// Score signature verification system
function signLeaderboardScore(score, username) {
  const secretSalt = "tq_salt_98724";
  let hash = 0;
  const payload = `${username}:${score}:${secretSalt}`;
  for (let i = 0; i < payload.length; i++) {
    hash = (hash << 5) - hash + payload.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
}
