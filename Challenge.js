"use strict";
const CHALLENGES = [
  { text: "Your first task is to read one book of your choice this week. Pick any genre — fiction, self-help, or a classic. Crack it open and dive in!", tag: "📚 Reading", pts: 10 },
  { text: "Complete one full study session of at least 45 minutes today with zero distractions. No phone, no social media — pure focus mode.", tag: "📖 Study", pts: 15 },
  { text: "Finish 3 pending tasks from your to-do list today. No snoozing, no procrastinating — get them done before sunset!", tag: "✅ Productivity", pts: 20 },
  { text: "Read 20 pages of any educational book before you go to sleep tonight. Knowledge compounds — start now!", tag: "📚 Reading", pts: 10 },
  { text: "Write a one-page summary of something new you learned this week. Teaching it to yourself on paper is the best revision.", tag: "✍️ Writing", pts: 12 },
  { text: "Complete one online course module or tutorial today. Even 30 minutes of structured learning counts — go for it!", tag: "💻 Learning", pts: 15 },
  { text: "Set a 25-minute Pomodoro timer and complete your most important task first thing this morning. No warm-up allowed.", tag: "⏱️ Focus", pts: 10 },
  { text: "Organize your study notes or workspace today. A clean environment unlocks a clear mind — tidy up and level up!", tag: "🗂️ Organization", pts: 8 },
  { text: "Listen to one full educational podcast episode today. Commute, walk, or cook — multitask your way to smarter!", tag: "🎧 Learning", pts: 10 },
  { text: "Write down your top 3 goals for the week right now. Clarity is a superpower — define your wins before you chase them.", tag: "🎯 Goal Setting", pts: 8 },
  { text: "Spend 30 minutes reviewing and practicing flashcards or memory exercises. Spaced repetition is the secret weapon of top learners.", tag: "🧠 Memory", pts: 12 },
  { text: "Complete a coding challenge or solve one logic puzzle today. Your brain is a muscle — give it a worthy workout.", tag: "💡 Problem Solving", pts: 15 },
  { text: "Read one full article from a reputable source on a topic outside your comfort zone. Expand that mental map!", tag: "🌍 Knowledge", pts: 8 },
  { text: "Draft a plan for your next 7 days. Schedule study blocks, breaks, and milestones. Planning is winning before you start.", tag: "📅 Planning", pts: 10 },
  { text: "Complete a physical workout for at least 20 minutes today. A strong body fuels a sharp mind — move to improve!", tag: "🏃 Wellness", pts: 10 },
  { text: "Spend 30 minutes learning a new skill — could be a language, instrument, or tool. Every minute compounds.", tag: "🎓 Skill Building", pts: 15 },
  { text: "Write a journal entry reflecting on your progress this month. Self-awareness is the first step to self-mastery.", tag: "✍️ Reflection", pts: 8 },
  { text: "Reach out to a mentor or someone who inspires you today. One conversation can shift your entire trajectory.", tag: "🤝 Networking", pts: 10 },
  { text: "Watch one educational documentary or lecture video today. Passive learning still counts when you're paying attention!", tag: "🎬 Learning", pts: 10 },
  { text: "Complete all your homework or work deliverables at least one hour before your deadline. Ahead of schedule beats scrambling.", tag: "📋 Deadlines", pts: 20 },
];

const BADGES = [
  { pts: 10, label: "🌱 First Step" },
  { pts: 30, label: "🔥 On Fire" },
  { pts: 60, label: "⚡ Power Learner" },
  { pts: 100, label: "🏆 Champion" },
  { pts: 150, label: "💎 Elite Achiever" },
  { pts: 200, label: "🚀 Unstoppable" },
];

let state = {
  totalPts: 0,
  badgeCount: 0,
  earnedBadges: [],
  currentChallenge: null,
  activeChallenges: [],
  completedChallenges: [],
  usedIndices: [],
};

// ── Persistence helpers ───────────────────────────────────────────────────
function saveState() {
  try {
    if (window.TaskQuestStorage) {
      window.TaskQuestStorage.setChallenge(state);
    } else {
      localStorage.setItem("taskquest_v1.challenge", JSON.stringify(state));
    }
  } catch (e) { /* storage full — ignore */ }
}

function loadState() {
  try {
    if (!window.localStorage) return;
  try {
    const saved = window.TaskQuestStorage
      ? window.TaskQuestStorage.getChallenge()
      : JSON.parse(localStorage.getItem("taskquest_v1.challenge"));
    if (saved && typeof saved === "object") {
      state = Object.assign(state, saved);
    }
    // Populate badges on load
    if (state.earnedBadges && state.earnedBadges.length > 0) {
      setTimeout(() => {
        const bar = document.getElementById("ach-badges");
        if (bar) {
          bar.innerHTML = "";
          state.earnedBadges.forEach(label => {
            const el = document.createElement("span");
            el.className = "badge-item";
            el.textContent = label;
            bar.appendChild(el);
          });
        }
      }, 50);
    }
  } catch (e) { /* corrupt data — use defaults */ }
}

function generateChallenge() {
  const btn = document.getElementById("randomBtn");
  btn.classList.add("spinning");
  setTimeout(() => btn.classList.remove("spinning"), 500);

  let available = CHALLENGES.map((_, i) => i).filter(i => !state.usedIndices.includes(i));
  if (available.length === 0) {
    state.usedIndices = [];
    available = CHALLENGES.map((_, i) => i);
  }

  const idx = available[Math.floor(Math.random() * available.length)];
  state.usedIndices.push(idx);
  const challenge = CHALLENGES[idx];
  state.currentChallenge = { ...challenge, id: Date.now() };

  document.getElementById("challenge-tag").textContent = challenge.tag;
  document.getElementById("challenge-pts").textContent = `+${challenge.pts} pts`;
  document.getElementById("challenge-text").textContent = challenge.text;
  document.getElementById("user-input").value = "";

  const feedbackEl = document.getElementById("feedback-msg");
  feedbackEl.className = "feedback-msg hidden";
  feedbackEl.textContent = "";

  const card = document.getElementById("challenge-card");
  card.classList.remove("hidden");

  addToActive(state.currentChallenge);
  saveState();
}

function addToActive(challenge) {
  const existing = state.activeChallenges.find(c => c.id === challenge.id);
  if (existing) return;
  state.activeChallenges.push(challenge);
  renderActiveChallenges();
}

function handleResponse() {
  const input = document.getElementById("user-input").value.trim().toLowerCase();
  const feedbackEl = document.getElementById("feedback-msg");

  if (!state.currentChallenge) return;

  if (!input) {
    feedbackEl.className = "feedback-msg warning";
    feedbackEl.textContent = "Please type 'Yes, Done' or 'No' to respond!";
    feedbackEl.classList.remove("hidden");
    return;
  }

  const isYes = input.includes("yes") || input === "done" || input === "yes, done" || input === "yes done";
  const isNo = input === "no" || input.startsWith("no");

  if (isYes) {
    const pts = state.currentChallenge.pts;
    state.totalPts += pts;
    feedbackEl.className = "feedback-msg success";
    feedbackEl.textContent = `🎉 I knew it champ, you will do that! You earned +${pts} pts!`;
    feedbackEl.classList.remove("hidden");

    state.activeChallenges = state.activeChallenges.filter(c => c.id !== state.currentChallenge.id);
    state.completedChallenges.push({ ...state.currentChallenge, completedAt: new Date() });
    state.currentChallenge = null;

    updatePoints();
    checkBadges();
    renderActiveChallenges();
    renderCompletedChallenges();
    saveState();

    setTimeout(() => {
      document.getElementById("challenge-card").classList.add("hidden");
    }, 3500);

  } else if (isNo) {
    feedbackEl.className = "feedback-msg warning";
    feedbackEl.textContent = "⚠️ Complete Task ASAP! Don't let this one slip — you're better than this!";
    feedbackEl.classList.remove("hidden");

  } else {
    feedbackEl.className = "feedback-msg warning";
    feedbackEl.textContent = "Type 'Yes, Done' if completed or 'No' if you haven't yet.";
    feedbackEl.classList.remove("hidden");
  }
}

function updatePoints() {
  document.getElementById("total-pts").textContent = state.totalPts;
}

function checkBadges() {
  BADGES.forEach(badge => {
    if (state.totalPts >= badge.pts && !state.earnedBadges.includes(badge.label)) {
      state.earnedBadges.push(badge.label);
      state.badgeCount++;
      document.getElementById("badge-count").textContent = state.badgeCount;
      addBadgeToBar(badge.label);
    }
  });
}

function addBadgeToBar(label) {
  const bar = document.getElementById("ach-badges");
  const empty = bar.querySelector(".ach-empty");
  if (empty) empty.remove();

  const el = document.createElement("span");
  el.className = "badge-item";
  el.textContent = label;
  bar.appendChild(el);
}

function renderActiveChallenges() {
  const container = document.getElementById("active-list");
  if (state.activeChallenges.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="ti ti-player-play"></i><p>No active challenges yet.<br>Generate one above to get started!</p></div>`;
    return;
  }
  container.innerHTML = state.activeChallenges.map(c => `
    <div class="list-item">
      <div class="list-item-left">
        <div class="list-item-tag">${c.tag}</div>
        <div class="list-item-text">${c.text}</div>
      </div>
      <span class="list-item-pts pending">+${c.pts} pts</span>
    </div>
  `).join("");
}

function renderCompletedChallenges() {
  const container = document.getElementById("completed-list");
  if (state.completedChallenges.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="ti ti-trophy"></i><p>No completed challenges yet.<br>You've got this, champ!</p></div>`;
    return;
  }
  container.innerHTML = [...state.completedChallenges].reverse().map(c => `
    <div class="list-item done">
      <div class="list-item-left">
        <div class="list-item-tag">${c.tag} · ✅ Completed</div>
        <div class="list-item-text done-text">${c.text}</div>
      </div>
      <span class="list-item-pts">+${c.pts} pts</span>
    </div>
  `).join("");
}

document.getElementById("user-input").addEventListener("keydown", function(e) {
  if (e.key === "Enter") handleResponse();
});

// ── Boot: restore persisted state ────────────────────────────────────────
loadState();
updatePoints();
checkBadges();
renderActiveChallenges();
renderCompletedChallenges();
const checkChallengeStatus = (challengeId) => {
  console.log(`Checking status for challenge: ${challengeId}`);
  return true;
};
