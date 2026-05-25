// ==========================================================================
// COLLABORATIVE STUDY ENVIRONMENT - FULL IMPLEMENTATION
// ==========================================================================

// Global collaborative state
let collaborativeState = {
  friends: [],
  currentSession: null,
  challenges: [],
  sessionHistory: [],
  joinedChallenges: []
};

// Load collaborative data on init
function loadCollaborativeData() {
  try {
    const saved = localStorage.getItem('collab_state');
    if (saved) {
      collaborativeState = JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load collaborative data:', e);
  }
}

// Save collaborative data
function saveCollaborativeData() {
  try {
    localStorage.setItem('collab_state', JSON.stringify(collaborativeState));
  } catch (e) {
    console.error('Failed to save collaborative data:', e);
  }
}

// ==========================================================================
// FRIEND MANAGEMENT FUNCTIONS
// ==========================================================================

function addFriend(friendName) {
  if (!friendName || friendName.trim() === '') {
    announce('Please enter a friend name.');
    return;
  }

  const friend = {
    id: Date.now(),
    name: friendName.trim(),
    addedAt: Date.now(),
    lastActive: Date.now(),
    score: Math.round(Math.random() * 500) + 100, // Simulated score
    tasksCompleted: Math.round(Math.random() * 50) + 5,
    studyMinutes: Math.round(Math.random() * 200) + 30,
    status: 'online'
  };

  collaborativeState.friends.push(friend);
  saveCollaborativeData();
  renderFriendsList();
  announce(`Added ${friendName} as a study friend!`);
  showTaskPopup(`${friendName} added! 👥`);
}

function removeFriend(friendId) {
  if (confirm('Remove this friend?')) {
    collaborativeState.friends = collaborativeState.friends.filter(f => f.id !== friendId);
    if (collaborativeState.currentSession && collaborativeState.currentSession.partnerId === friendId) {
      endCollabSession();
    }
    saveCollaborativeData();
    renderFriendsList();
    announce('Friend removed.');
  }
}

function renderFriendsList() {
  const grid = document.getElementById('friendsListGrid');
  if (!grid) return;
  grid.innerHTML = '';

  if (collaborativeState.friends.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px;">
        <i class="ri-user-add-line" style="font-size: 2.5rem; opacity: 0.3;"></i>
        <h3>No study friends yet</h3>
        <p>Add friends to study together and compete in challenges!</p>
      </div>
    `;
    return;
  }

  collaborativeState.friends.forEach(friend => {
    const card = document.createElement('div');
    card.className = 'friend-card glass';
    const statusColor = friend.status === 'online' ? '#10b981' : '#9ca3af';
    const initial = escapeHtml(friend.name.charAt(0).toUpperCase());
    card.innerHTML = `
      <div class="friend-card-header">
        <div class="friend-info">
          <div class="friend-avatar">${initial}</div>
          <div>
            <h4>${escapeHtml(friend.name)}</h4>
            <p class="friend-status"><span class="status-dot" style="background: ${statusColor};"></span> ${escapeHtml(friend.status)}</p>
          </div>
        </div>
        <button type="button" class="icon-btn delete-btn" data-action="remove-friend" data-friend-id="${friend.id}" aria-label="Remove friend"><i class="ri-close-line"></i></button>
      </div>
      <div class="friend-stats">
        <div class="stat">
          <i class="ri-trophy-line"></i>
          <span>${friend.score} pts</span>
        </div>
        <div class="stat">
          <i class="ri-checkbox-circle-fill"></i>
          <span>${friend.tasksCompleted} tasks</span>
        </div>
        <div class="stat">
          <i class="ri-timer-line"></i>
          <span>${friend.studyMinutes}m</span>
        </div>
      </div>
      <button type="button" class="view-btn primary" style="width: 100%; margin-top: 10px;" data-action="study-friend" data-friend-id="${friend.id}">
        <i class="ri-send-plane-line"></i> Study Together
      </button>
    `;
    grid.appendChild(card);
  });
}

// ==========================================================================
// COLLABORATIVE STUDY SESSION FUNCTIONS
// ==========================================================================

function startCollabSession() {
  if (collaborativeState.friends.length === 0) {
    announce('Add at least one friend first.');
    showTaskPopup('Add a friend to study together!');
    return;
  }

  const sessionModal = document.createElement('div');
  sessionModal.className = 'modal-overlay';
  const content = document.createElement('div');
  content.className = 'modal-content';
  content.style.maxWidth = '400px';

  const title = document.createElement('h3');
  title.textContent = 'Start Collaborative Study Session';
  content.appendChild(title);

  const hint = document.createElement('p');
  hint.style.margin = '15px 0';
  hint.style.color = 'var(--text-light)';
  hint.textContent = 'Choose a study friend to partner with';
  content.appendChild(hint);

  const list = document.createElement('div');
  list.style.cssText = 'display: grid; gap: 10px; max-height: 300px; overflow-y: auto;';

  collaborativeState.friends.forEach(f => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'view-btn';
    btn.style.cssText = 'text-align: left; padding: 12px;';
    btn.innerHTML = `<i class="ri-user-fill"></i> ${escapeHtml(f.name)} <span style="float: right; font-size: 12px; opacity: 0.7;">${f.score} pts</span>`;
    btn.addEventListener('click', () => selectSessionPartner(f.id, f.name));
    list.appendChild(btn);
  });
  content.appendChild(list);

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'view-btn';
  cancelBtn.style.cssText = 'width: 100%; margin-top: 15px;';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => sessionModal.remove());
  content.appendChild(cancelBtn);

  sessionModal.appendChild(content);
  document.body.appendChild(sessionModal);
  sessionModal.addEventListener('click', (e) => {
    if (e.target === sessionModal) sessionModal.remove();
  });
}

function selectSessionPartner(partnerId, partnerName) {
  const friend = collaborativeState.friends.find(f => f.id === partnerId);
  if (!friend) return;

  collaborativeState.currentSession = {
    id: Date.now(),
    partnerId: partnerId,
    partnerName: partnerName,
    startTime: Date.now(),
    endTime: null,
    sharedTasks: [],
    myProgress: 0,
    partnerProgress: 0
  };

  saveCollaborativeData();
  renderCollabSessionInfo();
  updateCollabLeaderboard();
  
  announce(`Started study session with ${partnerName}!`);
  showTaskPopup(`Studying with ${partnerName}! 🎓`);

  // Close any open modals
  document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
}

function inviteFriendToSession(friendId, friendName) {
  selectSessionPartner(friendId, friendName);
}

function endCollabSession() {
  if (!collaborativeState.currentSession) return;

  const duration = Math.round((Date.now() - collaborativeState.currentSession.startTime) / 60000);
  collaborativeState.currentSession.endTime = Date.now();
  
  collaborativeState.sessionHistory.push({
    ...collaborativeState.currentSession,
    duration: duration,
    finalScore: getTodayProductivityScore()
  });

  collaborativeState.currentSession = null;
  saveCollaborativeData();
  renderCollabSessionInfo();
  
  announce(`Study session ended! Duration: ${duration} minutes.`);
  showTaskPopup(`Session ended! Great work! 🎉`);
}

function renderCollabSessionInfo() {
  const userEl = document.getElementById('collabSessionUser');
  const partnerEl = document.getElementById('collabSessionPartner');
  const durationEl = document.getElementById('collabSessionDuration');

  if (!collaborativeState.currentSession) {
    if (userEl) userEl.textContent = 'Not in session';
    if (partnerEl) partnerEl.textContent = '—';
    if (durationEl) durationEl.textContent = '0 min';
    return;
  }

  const session = collaborativeState.currentSession;
  const duration = Math.round((Date.now() - session.startTime) / 60000);

  if (userEl) userEl.textContent = profile.name || 'You';
  if (partnerEl) partnerEl.textContent = session.partnerName;
  if (durationEl) durationEl.textContent = `${duration} min`;

  // Update buttons
  const startBtn = document.getElementById('startCollabSessionBtn');
  const stopBtn = document.getElementById('stopCollabSessionBtn');
  if (startBtn && stopBtn) {
    startBtn.style.display = 'none';
    stopBtn.style.display = 'flex';
  }
}

// Update session duration every 30 seconds
setInterval(() => {
  if (collaborativeState.currentSession) {
    renderCollabSessionInfo();
  }
}, 30000);

// ==========================================================================
// PRODUCTIVITY CHALLENGES FUNCTIONS
// ==========================================================================

function createChallenge() {
  const form = document.getElementById('createChallengeForm');
  if (!form) return;

  const title = document.getElementById('challengeTitleInput').value.trim();
  const type = document.getElementById('challengeTypeSelect').value;
  const days = parseInt(document.getElementById('challengeDaysInput').value) || 7;

  if (!title) {
    announce('Please enter a challenge name.');
    return;
  }

  const challenge = {
    id: Date.now(),
    title: title,
    type: type,
    duration: days,
    startDate: Date.now(),
    endDate: Date.now() + days * 86400000,
    creator: profile.name || 'Unknown',
    participants: [
      {
        id: 'me',
        name: profile.name || 'You',
        score: 0,
        tasksCompleted: 0,
        studyMinutes: 0,
        streak: streak
      }
    ]
  };

  collaborativeState.challenges.push(challenge);
  collaborativeState.joinedChallenges.push(challenge.id);
  saveCollaborativeData();
  renderChallenges();

  form.style.display = 'none';
  document.getElementById('challengeTitleInput').value = '';
  
  announce(`Challenge "${title}" created!`);
  showTaskPopup(`Challenge created! 🏆`);
}

function joinChallenge(challengeId) {
  const challenge = collaborativeState.challenges.find(c => c.id === challengeId);
  if (!challenge) return;

  if (collaborativeState.joinedChallenges.includes(challengeId)) {
    announce('You already joined this challenge!');
    return;
  }

  challenge.participants.push({
    id: 'me',
    name: profile.name || 'You',
    score: 0,
    tasksCompleted: 0,
    studyMinutes: 0,
    streak: streak
  });

  collaborativeState.joinedChallenges.push(challengeId);
  saveCollaborativeData();
  renderChallenges();
  
  announce(`Joined challenge: ${challenge.title}`);
  showTaskPopup(`Joined! Let's compete! 🚀`);
}

function leaveChallenge(challengeId) {
  if (confirm('Leave this challenge?')) {
    const challenge = collaborativeState.challenges.find(c => c.id === challengeId);
    if (challenge) {
      challenge.participants = challenge.participants.filter(p => p.id !== 'me');
    }
    collaborativeState.joinedChallenges = collaborativeState.joinedChallenges.filter(id => id !== challengeId);
    saveCollaborativeData();
    renderChallenges();
    announce('Challenge left.');
  }
}

function renderChallenges() {
  const grid = document.getElementById('challengesGrid');
  if (!grid) return;
  grid.innerHTML = '';

  if (collaborativeState.challenges.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px;">
        <i class="ri-trophy-line" style="font-size: 2.5rem; opacity: 0.3;"></i>
        <h3>No challenges yet</h3>
        <p>Create one to compete with your study friends!</p>
      </div>
    `;
    return;
  }

  collaborativeState.challenges.forEach(challenge => {
    const isJoined = collaborativeState.joinedChallenges.includes(challenge.id);
    const daysLeft = Math.ceil((challenge.endDate - Date.now()) / 86400000);
    const myParticipant = challenge.participants.find(p => p.id === 'me');

    const card = document.createElement('div');
    card.className = 'challenge-card glass';
    card.innerHTML = `
      <div class="challenge-header">
        <div>
          <h4>${escapeHtml(challenge.title)}</h4>
          <p class="muted">Type: <strong>${challenge.type === 'tasks' ? 'Most Tasks' : challenge.type === 'study' ? 'Most Study Time' : challenge.type === 'score' ? 'Highest Score' : 'Longest Streak'}</strong> • ${daysLeft} days left</p>
        </div>
        ${isJoined ? `<button type="button" class="view-btn danger" data-action="leave-challenge" data-challenge-id="${challenge.id}">Leave</button>` : `<button type="button" class="view-btn primary" data-action="join-challenge" data-challenge-id="${challenge.id}">Join</button>`}
      </div>
      <div class="challenge-participants">
        <h5>Leaderboard (${challenge.participants.length} participant${challenge.participants.length !== 1 ? 's' : ''})</h5>
        <div class="participants-list">
          ${challenge.participants.sort((a, b) => b.score - a.score).slice(0, 3).map((p, idx) => `
            <div class="participant-item" ${p.id === 'me' ? 'style="background: rgba(168, 85, 247, 0.1); border-left: 3px solid var(--primary);"' : ''}>
              <span class="rank">#${idx + 1}</span>
              <span class="name">${escapeHtml(p.name)}</span>
              <span class="score">${p.score}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ==========================================================================
// REAL-TIME LEADERBOARD FUNCTIONS
// ==========================================================================

function updateCollabLeaderboard() {
  const entries = [];

  // Add current user
  entries.push({
    rank: 0,
    name: profile.name || 'You',
    score: getTodayProductivityScore(),
    tasks: tasks.filter(t => t.completed).length,
    studyTime: Math.round(getCumulativeStudyMinutes()),
    isMe: true
  });

  // Add friends
  collaborativeState.friends.forEach(friend => {
    entries.push({
      rank: 0,
      name: friend.name,
      score: friend.score,
      tasks: friend.tasksCompleted,
      studyTime: friend.studyMinutes,
      isMe: false
    });
  });

  // Sort by score descending
  entries.sort((a, b) => b.score - a.score);

  // Add ranks
  entries.forEach((e, idx) => {
    e.rank = idx + 1;
  });

  renderLeaderboard(entries);
}

function renderLeaderboard(entries) {
  const board = document.getElementById('collabLeaderboard');
  if (!board) return;
  board.innerHTML = '';

  entries.forEach(entry => {
    const row = document.createElement('div');
    row.className = `leaderboard-row ${entry.isMe ? 'highlight-row' : ''}`;
    row.innerHTML = `
      <div class="row-rank">#${entry.rank}</div>
      <div class="row-player">
        <div class="player-name">${escapeHtml(entry.name)}</div>
        <div class="player-subtitle">${entry.score} pts • ${entry.tasks} tasks • ${entry.studyTime}m study</div>
      </div>
      <div class="row-score" style="font-weight: 600; color: var(--primary);">${entry.score}</div>
    `;
    board.appendChild(row);
  });
}

// ==========================================================================
// EVENT LISTENERS & INITIALIZATION
// ==========================================================================

function setupCollabDelegation() {
  const friendsGrid = document.getElementById('friendsListGrid');
  if (friendsGrid && !friendsGrid.dataset.delegationBound) {
    friendsGrid.dataset.delegationBound = '1';
    friendsGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn || !friendsGrid.contains(btn)) return;
      const friendId = Number(btn.dataset.friendId);
      const friend = collaborativeState.friends.find(f => f.id === friendId);
      if (!friend) return;
      if (btn.dataset.action === 'remove-friend') removeFriend(friendId);
      else if (btn.dataset.action === 'study-friend') inviteFriendToSession(friend.id, friend.name);
    });
  }

  const challengesGrid = document.getElementById('challengesGrid');
  if (challengesGrid && !challengesGrid.dataset.delegationBound) {
    challengesGrid.dataset.delegationBound = '1';
    challengesGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn || !challengesGrid.contains(btn)) return;
      const challengeId = Number(btn.dataset.challengeId);
      if (btn.dataset.action === 'join-challenge') joinChallenge(challengeId);
      else if (btn.dataset.action === 'leave-challenge') leaveChallenge(challengeId);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadCollaborativeData();
  setupCollabDelegation();

  // Friend buttons
  const addFriendBtn = document.getElementById('addFriendBtn');
  const confirmAddFriendBtn = document.getElementById('confirmAddFriendBtn');
  const cancelAddFriendBtn = document.getElementById('cancelAddFriendBtn');
  const friendNameInput = document.getElementById('friendNameInput');
  const addFriendForm = document.getElementById('addFriendForm');

  if (addFriendBtn) {
    addFriendBtn.addEventListener('click', () => {
      addFriendForm.style.display = addFriendForm.style.display === 'block' ? 'none' : 'block';
      if (addFriendForm.style.display === 'block') {
        friendNameInput.focus();
      }
    });
  }

  if (confirmAddFriendBtn) {
    confirmAddFriendBtn.addEventListener('click', () => {
      addFriend(friendNameInput.value);
      friendNameInput.value = '';
      addFriendForm.style.display = 'none';
    });
  }

  if (cancelAddFriendBtn) {
    cancelAddFriendBtn.addEventListener('click', () => {
      addFriendForm.style.display = 'none';
    });
  }

  if (friendNameInput) {
    friendNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        confirmAddFriendBtn.click();
      }
    });
  }

  // Session buttons
  const startBtn = document.getElementById('startCollabSessionBtn');
  const stopBtn = document.getElementById('stopCollabSessionBtn');
  const inviteBtn = document.getElementById('inviteFriendBtn');

  if (startBtn) startBtn.addEventListener('click', startCollabSession);
  if (stopBtn) stopBtn.addEventListener('click', endCollabSession);
  if (inviteBtn) {
    inviteBtn.addEventListener('click', () => {
      if (!collaborativeState.currentSession) {
        startCollabSession();
      } else {
        announce('Already in a study session. End it first.');
      }
    });
  }

  // Challenge buttons
  const createChallengeBtn = document.getElementById('createChallengeBtn');
  const confirmCreateBtn = document.getElementById('confirmCreateChallengeBtn');
  const cancelChallengeBtn = document.getElementById('cancelChallengeBtn');
  const createChallengeForm = document.getElementById('createChallengeForm');

  if (createChallengeBtn) {
    createChallengeBtn.addEventListener('click', () => {
      createChallengeForm.style.display = createChallengeForm.style.display === 'block' ? 'none' : 'block';
    });
  }

  if (confirmCreateBtn) {
    confirmCreateBtn.addEventListener('click', createChallenge);
  }

  if (cancelChallengeBtn) {
    cancelChallengeBtn.addEventListener('click', () => {
      createChallengeForm.style.display = 'none';
    });
  }

  // Leaderboard refresh
  const refreshBtn = document.getElementById('refreshLeaderboardBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      updateCollabLeaderboard();
      announce('Leaderboard updated!');
    });
  }

  const goToStudyBtn = document.getElementById('goToStudyTogetherBtn');
  const openFab = document.getElementById('openStudyTogetherFab');
  const openStudyTab = () => {
    const tab = document.getElementById('tabBtnCollaborative');
    if (tab) {
      tab.click();
      tab.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    }
  };

  if (goToStudyBtn) {
    goToStudyBtn.addEventListener('click', openStudyTab);
  }

  if (openFab) {
    openFab.addEventListener('click', openStudyTab);
  }

  // Initial renders
  renderFriendsList();
  renderChallenges();
  updateCollabLeaderboard();
  renderCollabSessionInfo();
  revealCollaborativeTab();
  enableTabWheelScroll();
  initTabScrollButtons();
});

function revealCollaborativeTab() {
  const collabTab = document.getElementById('tabBtnCollaborative');
  const navTabs = document.querySelector('.nav-tabs');
  if (!collabTab || !navTabs) return;

  const tabRect = collabTab.getBoundingClientRect();
  const navRect = navTabs.getBoundingClientRect();
  if (tabRect.right > navRect.right || tabRect.left < navRect.left) {
    collabTab.scrollIntoView({ behavior: 'smooth', inline: 'center' });
  }
}

function enableTabWheelScroll() {
  const navTabs = document.querySelector('.nav-tabs');
  if (!navTabs) return;
  navTabs.addEventListener('wheel', (event) => {
    if (event.deltaY === 0) return;
    event.preventDefault();
    navTabs.scrollLeft += event.deltaY;
  }, { passive: false });
}

function initTabScrollButtons() {
  const navTabs = document.querySelector('.nav-tabs');
  const leftBtn = document.getElementById('tabsScrollLeft');
  const rightBtn = document.getElementById('tabsScrollRight');

  if (!navTabs || !leftBtn || !rightBtn) return;

  leftBtn.addEventListener('click', () => {
    navTabs.scrollBy({ left: -240, behavior: 'smooth' });
  });

  rightBtn.addEventListener('click', () => {
    navTabs.scrollBy({ left: 240, behavior: 'smooth' });
  });
}

// Update leaderboard every 60 seconds (real-time simulation)
setInterval(() => {
  updateCollabLeaderboard();
}, 60000);
