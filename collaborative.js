/**
 * collaborative.js — TaskQuest Study Lounge
 * BroadcastChannel-based real-time multi-tab collaboration
 */

'use strict';

/* ═══════════════════════ CONSTANTS ═══════════════════════ */
const TAB_ID              = Math.random().toString(36).slice(2, 10);
const MAX_SESSION_MIN     = 480;   // 8 hours hard cap
const HEARTBEAT_MS        = 60_000;
const PRESENCE_PULSE_MS   = 5_000;
const PEER_EXPIRE_MS      = 12_000;

/* ═══════════════════════ STATE ═══════════════════════ */
let myProfile    = safeJSON('quests_profile', { name: 'Anonymous Scholar' });
let chatHistory  = safeJSON('quests_chat_history', []);
let teamMembers  = safeJSON('quests_team_members', []);
let activePeers  = {};       // keyed by tabId

let collab = {
  friends:         [],
  challenges:      [],
  joinedChallenges:[],
  currentSession:  null,
  sessionHistory:  []
};

let _heartbeat = null;
let _uiTick    = null;
let _typingTO  = null;

/* ═══════════════════════ UTILS ═══════════════════════ */
function safeJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function saveKey(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) { console.warn(e); }
}
function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function q(id)  { return document.getElementById(id); }
function qs(sel){ return document.querySelector(sel); }

function saveCollab() {
  saveKey('taskquest_v1.collab', collab);
}
function loadCollab() {
  const raw = safeJSON('taskquest_v1.collab', null);
  if (raw && typeof raw === 'object') {
    collab = {
      friends:          Array.isArray(raw.friends)          ? raw.friends          : [],
      challenges:       Array.isArray(raw.challenges)       ? raw.challenges       : [],
      joinedChallenges: Array.isArray(raw.joinedChallenges) ? raw.joinedChallenges : [],
      currentSession:   raw.currentSession ?? null,
      sessionHistory:   Array.isArray(raw.sessionHistory)   ? raw.sessionHistory   : []
    };
    // Auto-expire stale session
    if (collab.currentSession) {
      const elapsed = Date.now() - collab.currentSession.startTime;
      if (elapsed > MAX_SESSION_MIN * 60_000) {
        collab.currentSession = null;
        saveCollab();
      }
    }
  }
}

function getMyStats() {
  const xp     = parseInt(localStorage.getItem('xp')     || '0', 10);
  const streak = parseInt(localStorage.getItem('streak') || '0', 10);
  return { xp, streak, level: Math.floor(xp / 300) + 1 };
}

/* ═══════════════════════ BROADCAST CHANNEL ═══════════════════════ */
const channel = new BroadcastChannel('taskquest_study_room');

channel.onmessage = ({ data }) => {
  if (!data || !data.type) return;
  switch (data.type) {
    case 'chat':
      if (data.tabId !== TAB_ID) { appendMessage(data, false); playPing(); }
      break;
    case 'presence':
      if (data.tabId !== TAB_ID) handlePresence(data);
      break;
    case 'typing':
      if (data.tabId !== TAB_ID) handleTyping(data);
      break;
  }
};

// Load collaborative data on init
function loadCollaborativeData() {
  try {
    const raw = window.TaskQuestStorage
      ? window.TaskQuestStorage.getCollab()
      : JSON.parse(localStorage.getItem('taskquest_v1.collab'));
    if (raw && typeof raw === 'object') {
      // Merge into the default state so any keys added in future schema
      // versions are always present, preventing TypeError on missing keys.
      collaborativeState = Object.assign({}, collaborativeState, raw);

      // Guarantee every array field is actually an array even if the stored
      // value was written before that field existed or was corrupted.
      if (!Array.isArray(collaborativeState.friends))        collaborativeState.friends = [];
      if (!Array.isArray(collaborativeState.challenges))     collaborativeState.challenges = [];
      if (!Array.isArray(collaborativeState.sessionHistory)) collaborativeState.sessionHistory = [];
      if (!Array.isArray(collaborativeState.joinedChallenges)) collaborativeState.joinedChallenges = [];
    }
    const saved = window.TaskQuestStorage
      ? window.TaskQuestStorage.getCollab()
      : JSON.parse(localStorage.getItem('taskquest_v1.collab'));
    if (saved) {
      collaborativeState = { ...collaborativeState, ...saved };
      // Auto-expire any stale session that exceeded max duration on page load
      if (collaborativeState.currentSession) {
        const elapsed = Date.now() - collaborativeState.currentSession.startTime;
        if (elapsed > MAX_SESSION_DURATION_MS) {
          console.warn('Stale session detected on load — auto-expiring.');
          collaborativeState.currentSession = null;
          saveCollaborativeData();
        }
      }
    }
  } catch (e) {
    console.error('Failed to load collaborative data:', e);
    // Leave collaborativeState as the safe default defined above.
  }
}

function handlePresence(data) {
  if (data.action === 'left') {
    delete activePeers[data.tabId];
  } else {
    activePeers[data.tabId] = { ...data, ts: Date.now() };
  }
  pruneStale();
  renderOnline();
  renderLeaderboard();
}

function pruneStale() {
  const now = Date.now();
  Object.keys(activePeers).forEach(id => {
    if (now - activePeers[id].ts > PEER_EXPIRE_MS) delete activePeers[id];
  });
}

/* ═══════════════════════ CHAT ═══════════════════════ */
function sendMessage(text) {
  text = text.trim();
  if (!text) return;
  const msg = {
    id:     Date.now(),
    sender: myProfile.name,
    text,
    time:   new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type:   'chat'
  };
  broadcast(msg);
  appendMessage(msg, true);
  chatHistory.push(msg);
  saveKey('quests_chat_history', chatHistory.slice(-60));
  const inp = q('chatInput');
  if (inp) { inp.value = ''; inp.focus(); }
}

function appendMessage(msg, isMe) {
  const wrap = q('messagesContainer');
  if (!wrap) return;
  const div = document.createElement('div');
  div.className = `message ${isMe ? 'msg-sent' : 'msg-received'}`;
  div.innerHTML = `
    <span class="msg-meta">${esc(isMe ? 'You' : msg.sender)} · ${esc(msg.time)}</span>
    <div class="msg-text">${esc(msg.text)}</div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function renderChatHistory() {
  chatHistory.forEach(msg => appendMessage(msg, msg.sender === myProfile.name));
}

/* ── Typing indicator ── */
function handleTyping({ user, isTyping }) {
  const bar = q('typingBar');
  if (!bar) return;
  bar.textContent = isTyping ? `${esc(user)} is typing…` : '';
}

/* ═══════════════════════ TEAM MEMBERS ═══════════════════════ */
function addTeamMember(name) {
  name = name.trim();
  if (!name) return;
  if (teamMembers.some(m => m.name.toLowerCase() === name.toLowerCase())) {
    showToast('Member already in team', 'warn'); return;
  }
  teamMembers.push({ id: Date.now(), name });
  saveKey('quests_team_members', teamMembers);
  renderTeamMembers();
}

function removeTeamMember(id) {
  teamMembers = teamMembers.filter(m => m.id !== id);
  saveKey('quests_team_members', teamMembers);
  renderTeamMembers();
}

function renderTeamMembers() {
  const list = q('teamMemberList');
  if (!list) return;
  if (!teamMembers.length) { list.innerHTML = '<p class="empty-hint">No members yet</p>'; return; }
  list.innerHTML = '';
  teamMembers.forEach(m => {
    const div = document.createElement('div');
    div.className = 'member-item';
    div.innerHTML = `
      <div class="member-left">
        <span class="member-name">${esc(m.name)}</span>
        <div class="member-meta">Team member</div>
      </div>
      <button class="delete-btn" data-id="${m.id}" title="Remove"><i class="ri-delete-bin-line"></i></button>`;
    list.appendChild(div);
  });
  list.querySelectorAll('.delete-btn').forEach(btn =>
    btn.addEventListener('click', () => removeTeamMember(Number(btn.dataset.id))));
}

/* ═══════════════════════ ONLINE SCHOLARS ═══════════════════════ */
function renderOnline() {
  const list   = q('onlineList');
  const badge  = q('onlineCount');
  if (!list) return;
  pruneStale();
  const peers = Object.values(activePeers);
  if (badge) badge.textContent = peers.length;
  if (!peers.length) { list.innerHTML = '<p class="empty-hint">No other sessions</p>'; return; }
  list.innerHTML = '';
  peers.forEach(p => {
    const div = document.createElement('div');
    div.className = 'online-user';
    div.innerHTML = `
      <div class="peer-left">
        <div class="peer-dot"></div>
        <div>
          <div class="peer-name">${esc(p.user)}</div>
          <div class="peer-status-txt">Lvl ${p.level} · ${esc(p.status)}</div>
        </div>
      </div>
      <div class="peer-streak"><i class="ri-fire-fill"></i> ${p.streak}</div>`;
    list.appendChild(div);
  });
}

/* ═══════════════════════ LEADERBOARD ═══════════════════════ */
function renderLeaderboard() {
  const board = q('collabLeaderboard');
  if (!board) return;
  const stats = getMyStats();
  let contestants = [
    { name: myProfile.name + ' (You)', xp: stats.xp, level: stats.level, streak: stats.streak, isMe: true }
  ];
  Object.values(activePeers).forEach(p => {
    contestants.push({ name: p.user, xp: p.xp, level: p.level, streak: p.streak, isMe: false });
  });
  contestants.sort((a, b) => b.xp - a.xp);

  // Team Energy
  const energy = Math.min(100, contestants.reduce((s, c) => s + c.streak, 0) * 5);
  const fill   = q('energyFill');
  const pct    = q('energyPct');
  const hint   = q('energyHint');
  if (fill) fill.style.width = energy + '%';
  if (pct)  pct.textContent  = energy + '%';
  if (hint) hint.textContent = energy >= 80 ? 'On fire! 🔥' : energy >= 40 ? 'Building momentum!' : 'Start studying to build energy!';

  if (!contestants.length) { board.innerHTML = '<p class="empty-hint">No data yet</p>'; return; }
  board.innerHTML = '';
  const MEDALS = ['🥇','🥈','🥉'];
  contestants.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = `lb-item${p.isMe ? ' me' : ''}`;
    div.innerHTML = `
      <div class="lb-rank">${MEDALS[i] ?? '#' + (i+1)}</div>
      <div>
        <div class="lb-name">${esc(p.name)}</div>
        <div class="lb-sub">Lvl ${p.level} · 🔥 ${p.streak}</div>
      </div>
      <div class="lb-xp">${p.xp} XP</div>`;
    board.appendChild(div);
  });
}

/* ═══════════════════════ FRIENDS ═══════════════════════ */
function addFriend(name) {
  name = name.trim();
  if (!name) return;
  if (collab.friends.some(f => f.name.toLowerCase() === name.toLowerCase())) {
    showToast('Friend already added!', 'warn'); return;
  }
  collab.friends.push({ id: Date.now(), name, status: 'offline', score: 0, tasksCompleted: 0, studyMinutes: 0 });
  saveCollab(); renderFriends();
  showToast(`${name} added as a friend!`);
}

function removeFriend(id) {
  collab.friends = collab.friends.filter(f => f.id !== id);
  saveCollab(); renderFriends();
}

function renderFriends() {
  const grid = q('friendsListGrid');
  if (!grid) return;
  if (!collab.friends.length) { grid.innerHTML = '<p class="empty-hint">Add friends to compete!</p>'; return; }
  grid.innerHTML = '';
  collab.friends.forEach(f => {
    const div = document.createElement('div');
    div.className = 'friend-item';
    div.innerHTML = `
      <div class="friend-avatar">${esc(f.name[0].toUpperCase())}</div>
      <div class="friend-info">
        <div class="friend-name">${esc(f.name)}</div>
        <div class="friend-score">${f.score} pts · ${f.studyMinutes}m studied</div>
      </div>
      <button class="btn-study" data-id="${f.id}" title="Study together">Study</button>
      <button class="delete-btn" data-del="${f.id}" title="Remove"><i class="ri-close-line"></i></button>`;
    grid.appendChild(div);
  });
  grid.querySelectorAll('.btn-study').forEach(btn =>
    btn.addEventListener('click', () => {
      const f = collab.friends.find(x => x.id === Number(btn.dataset.id));
      if (f) selectPartner(f.id, f.name);
    }));
  grid.querySelectorAll('[data-del]').forEach(btn =>
    btn.addEventListener('click', () => removeFriend(Number(btn.dataset.del))));
}

/* ═══════════════════════ SESSION ═══════════════════════ */
function openSessionModal() {
  if (!collab.friends.length) { showToast('Add a friend first!', 'warn'); return; }
  const modal    = q('sessionModal');
  const listEl   = q('sessionPartnerList');
  listEl.innerHTML = '';
  collab.friends.forEach(f => {
    const btn = document.createElement('button');
    btn.className = 'modal-partner-btn';
    btn.innerHTML = `<span>${esc(f.name)}</span><span class="modal-partner-score">${f.score} pts</span>`;
    btn.addEventListener('click', () => { modal.hidden = true; selectPartner(f.id, f.name); });
    listEl.appendChild(btn);
  });
  modal.hidden = false;
}

function selectPartner(id, name) {
  collab.currentSession = {
    partnerId:       id,
    partnerName:     name,
    startTime:       Date.now(),
    lastHeartbeat:   Date.now(),
    durationMinutes: 0
  };
  saveCollab(); updateSessionUI(); startHeartbeat();
  showToast(`Session started with ${name}! 🚀`);
}

function endSession() {
  if (!collab.currentSession) { showToast('No active session', 'warn'); return; }
  const s     = collab.currentSession;
  const extra = Math.floor((Date.now() - s.lastHeartbeat) / 60_000);
  const mins  = Math.min((s.durationMinutes || 0) + extra, MAX_SESSION_MIN);
  collab.sessionHistory.push({
    id: Date.now(), partnerName: s.partnerName,
    startTime: s.startTime, endTime: Date.now(), durationMinutes: mins
  });
  const friend = collab.friends.find(f => f.id === s.partnerId);
  if (friend) friend.studyMinutes = (friend.studyMinutes || 0) + mins;
  collab.currentSession = null;
  saveCollab(); stopHeartbeat(); updateSessionUI(); renderFriends();
  showToast(`Session ended — ${mins} minutes logged!`);
}

function updateSessionUI() {
  const s        = collab.currentSession;
  const partEl   = q('collabSessionPartner');
  const durEl    = q('collabSessionDuration');
  const startBtn = q('startCollabSessionBtn');
  const stopBtn  = q('stopCollabSessionBtn');
  if (!s) {
    if (partEl)   partEl.textContent  = '—';
    if (durEl)    durEl.textContent   = '0 min';
    if (startBtn) startBtn.style.display = '';
    if (stopBtn)  stopBtn.style.display  = 'none';
    return;
  }
  const live = Math.min((s.durationMinutes || 0) + Math.floor((Date.now() - s.lastHeartbeat) / 60_000), MAX_SESSION_MIN);
  if (partEl)   partEl.textContent  = esc(s.partnerName);
  if (durEl)    durEl.textContent   = live + ' min';
  if (startBtn) startBtn.style.display = 'none';
  if (stopBtn)  stopBtn.style.display  = '';
}

function startHeartbeat() {
  stopHeartbeat();
  _heartbeat = setInterval(() => {
    if (!collab.currentSession) { stopHeartbeat(); return; }
    const elapsed = Date.now() - collab.currentSession.lastHeartbeat;
    if (elapsed < 120_000) collab.currentSession.durationMinutes = (collab.currentSession.durationMinutes || 0) + 1;
    collab.currentSession.lastHeartbeat = Date.now();
    saveCollab();
    if (Date.now() - collab.currentSession.startTime > MAX_SESSION_MIN * 60_000) { endSession(); return; }
    updateSessionUI();
  }, HEARTBEAT_MS);
  _uiTick = setInterval(() => { if (collab.currentSession) updateSessionUI(); }, 10_000);
}

function stopHeartbeat() {
  clearInterval(_heartbeat); clearInterval(_uiTick);
  _heartbeat = _uiTick = null;
}

/* ═══════════════════════ TOAST ═══════════════════════ */
function showToast(msg, type = 'info') {
  const existing = qs('.sq-toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'sq-toast';
  t.setAttribute('role', 'status');
  t.textContent = msg;
  Object.assign(t.style, {
    position: 'fixed', bottom: '28px', left: '50%',
    transform: 'translateX(-50%) translateY(20px)',
    background: type === 'warn' ? '#1e1a00' : '#0f0e1f',
    border: `1px solid ${type === 'warn' ? '#ffcc44' : '#7c5fff'}`,
    color: type === 'warn' ? '#ffcc44' : '#c4b5fd',
    padding: '12px 24px', borderRadius: '100px',
    fontFamily: 'Cabinet Grotesk, sans-serif',
    fontSize: '14px', fontWeight: '600',
    zIndex: '9999', whiteSpace: 'nowrap',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s',
    opacity: '0'
  });
  document.body.appendChild(t);
  requestAnimationFrame(() => {
    t.style.transform  = 'translateX(-50%) translateY(0)';
    t.style.opacity    = '1';
  });
  setTimeout(() => {
    t.style.opacity   = '0';
    t.style.transform = 'translateX(-50%) translateY(12px)';
    setTimeout(() => t.remove(), 400);
  }, 3200);
}

/* ═══════════════════════ AUDIO ═══════════════════════ */
function playPing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(); osc.stop(ctx.currentTime + 0.25);
  } catch(e) {}
}

/* ═══════════════════════ INIT ═══════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadCollab();

  /* — Restore chat — */
  renderChatHistory();

  /* — Chat form — */
  const chatForm = q('chatForm');
  if (chatForm) chatForm.addEventListener('submit', e => { e.preventDefault(); sendMessage(q('chatInput')?.value ?? ''); });

  /* — Quick pills — */
  document.querySelectorAll('.pill').forEach(btn =>
    btn.addEventListener('click', () => sendMessage(btn.dataset.msg)));

  /* — Typing indicator — */
  const chatInput = q('chatInput');
  if (chatInput) {
    chatInput.addEventListener('input', () => {
      broadcast({ type: 'typing', user: myProfile.name, isTyping: true });
      clearTimeout(_typingTO);
      _typingTO = setTimeout(() => broadcast({ type: 'typing', user: myProfile.name, isTyping: false }), 1500);
    });
  }

  /* — Clear chat — */
  const clearBtn = q('clearChat');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    if (!confirm('Clear chat history?')) return;
    localStorage.removeItem('quests_chat_history');
    const mc = q('messagesContainer');
    if (mc) mc.innerHTML = '';
    chatHistory = [];
  });

  /* — Status select — */
  const statusSel = q('statusSelect');
  if (statusSel) statusSel.addEventListener('change', () => announcePresence('status_change'));

  /* — Add member toggle — */
  const addMemberToggle = q('addMemberToggle');
  const addMemberForm   = q('addMemberForm');
  if (addMemberToggle && addMemberForm) {
    addMemberToggle.addEventListener('click', () => { addMemberForm.hidden = !addMemberForm.hidden; if (!addMemberForm.hidden) q('memberInput')?.focus(); });
  }
  const addMemberBtn = q('addMemberBtn');
  const memberInput  = q('memberInput');
  if (addMemberBtn) addMemberBtn.addEventListener('click', () => { addTeamMember(memberInput?.value ?? ''); if (memberInput) memberInput.value = ''; addMemberForm.hidden = true; });
  if (memberInput)  memberInput.addEventListener('keydown', e => { if (e.key === 'Enter') { addTeamMember(memberInput.value); memberInput.value = ''; addMemberForm.hidden = true; } });
  renderTeamMembers();

  /* — Add friend toggle — */
  const addFriendToggle = q('addFriendToggle');
  const addFriendForm   = q('addFriendForm');
  const friendInput     = q('friendNameInput');
  const confirmFriend   = q('confirmAddFriendBtn');
  if (addFriendToggle && addFriendForm) {
    addFriendToggle.addEventListener('click', () => { addFriendForm.hidden = !addFriendForm.hidden; if (!addFriendForm.hidden) friendInput?.focus(); });
  }
  if (confirmFriend) confirmFriend.addEventListener('click', () => { addFriend(friendInput?.value ?? ''); if (friendInput) friendInput.value = ''; if (addFriendForm) addFriendForm.hidden = true; });
  if (friendInput)   friendInput.addEventListener('keydown', e => { if (e.key === 'Enter') { addFriend(friendInput.value); friendInput.value = ''; if (addFriendForm) addFriendForm.hidden = true; } });
  renderFriends();

  /* — Session buttons — */
  const startBtn = q('startCollabSessionBtn');
  const stopBtn  = q('stopCollabSessionBtn');
  const cancelM  = q('cancelSessionModal');
  if (startBtn) startBtn.addEventListener('click', openSessionModal);
  if (stopBtn)  stopBtn.addEventListener('click',  endSession);
  if (cancelM)  cancelM.addEventListener('click',  () => { q('sessionModal').hidden = true; });
  q('sessionModal')?.addEventListener('click', e => { if (e.target === q('sessionModal')) q('sessionModal').hidden = true; });

  /* — Resume session if still active — */
  if (collab.currentSession) { updateSessionUI(); startHeartbeat(); }

  /* — Active task from localStorage — */
  const tasks = safeJSON('quests', []);
  const active = tasks.find(t => !t.completed);
  const focusEl = q('myActiveTask');
  if (active && focusEl) focusEl.textContent = active.text;

  /* — Initial presence + pulse — */
  announcePresence('joined');
  setInterval(() => { pruneStale(); renderOnline(); renderLeaderboard(); announcePresence('pulse'); }, PRESENCE_PULSE_MS);
  renderLeaderboard();

  /* — Room status update — */
  const roomStatus = q('roomStatus');
  if (roomStatus) {
    setTimeout(() => { roomStatus.textContent = 'Connected — messages sync across tabs'; }, 800);
  }
});

/* Announce departure */
window.addEventListener('beforeunload', () => announcePresence('left'));