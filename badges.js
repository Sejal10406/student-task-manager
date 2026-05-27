(function(){
  'use strict';

  const STORAGE_KEY = 'badges_v1';
  const TASKS_KEY = 'tasks';

  const BADGES = [
    { id: 'seven_day_streak', title: '7-Day Streak', icon: '🔥', desc: 'Complete at least one task every day for 7 days.' },
    { id: 'daily_goals_7', title: 'Daily Goals (7 days)', icon: '⚡', desc: 'Hit your daily goal for 7 different days.' },
    { id: 'hundred_tasks', title: 'Century Club', icon: '👑', desc: 'Complete 100 tasks.' },
    { id: 'zero_overdue_week', title: 'Zero Overdue Week', icon: '🚀', desc: 'No missed days in the last 7 days.' },
  ];

  function loadUnlocked() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) { return []; }
  }

  function saveUnlocked(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function getTasks() {
    try { return JSON.parse(localStorage.getItem(TASKS_KEY) || '[]'); } catch (e) { return []; }
  }

  function getCompletedCount(tasks){
    return tasks.filter(t => t.completed).length;
  }

  function extractDateFromTimestamp(ts){
    // timestamp example: "(Monday, 25 May 2026 at 10:00)"
    if (!ts || typeof ts !== 'string') return null;
    const m = ts.match(/\((?:[^,]+),\s*([^)]*?)\s+at/);
    const datePart = m ? m[1] : null;
    if (!datePart) return null;
    // e.g. '25 May 2026' -> new Date('25 May 2026')
    const d = new Date(datePart);
    if (isNaN(d)) return null;
    return d.toISOString().slice(0,10); // YYYY-MM-DD
  }

  function getCompletedDaysSet(tasks){
    const s = new Set();
    tasks.forEach(t => {
      if (!t.completed) return;
      const d = extractDateFromTimestamp(t.timestamp);
      if (d) s.add(d);
    });
    return s;
  }

  function getConsecutiveDaysUpToToday(daysSet){
    let count = 0;
    const today = new Date();
    // iterate backwards
    for(let i=0;i<365;i++){
      const d = new Date(today);
      d.setDate(today.getDate()-i);
      const key = d.toISOString().slice(0,10);
      if (daysSet.has(key)) count++; else break;
    }
    return count;
  }

  function renderBadges(unlocked){
    const grid = document.getElementById('badgesGrid');
    if (!grid) return;
    grid.innerHTML = '';
    BADGES.forEach(b => {
      const el = document.createElement('div');
      el.className = 'badge' + (unlocked.includes(b.id) ? ' unlocked' : '');
      el.setAttribute('title', b.title + ' — ' + b.desc);
      el.setAttribute('role','img');
      el.innerText = b.icon;
      el.addEventListener('click', () => {
        if (unlocked.includes(b.id)) {
          window.showToast(`${b.title} — unlocked`, 'info');
        } else {
          window.showToast(`${b.title}: ${b.desc}`, 'info', 4000);
        }
      });
      grid.appendChild(el);
    });
  }

  function evaluateBadges(){
    const tasks = getTasks();
    const unlocked = loadUnlocked();
    const changed = [];

    const completedCount = getCompletedCount(tasks);
    const daysSet = getCompletedDaysSet(tasks);
    const consecutive = getConsecutiveDaysUpToToday(daysSet);
    const distinctCompletedDays = daysSet.size;

    // Criteria checks
    if (completedCount >= 100 && !unlocked.includes('hundred_tasks')) {
      unlocked.push('hundred_tasks'); changed.push('hundred_tasks');
    }
    if (consecutive >= 7 && !unlocked.includes('seven_day_streak')) {
      unlocked.push('seven_day_streak'); changed.push('seven_day_streak');
    }
    if (distinctCompletedDays >= 7 && !unlocked.includes('daily_goals_7')) {
      unlocked.push('daily_goals_7'); changed.push('daily_goals_7');
    }
    // Interpret zero overdue week as no-missed-days for 7 days
    if (consecutive >= 7 && !unlocked.includes('zero_overdue_week')){
      unlocked.push('zero_overdue_week'); changed.push('zero_overdue_week');
    }

    if (changed.length){
      saveUnlocked(unlocked);
      // render and notify
      renderBadges(unlocked);
      changed.forEach(id => {
        const b = BADGES.find(x=>x.id===id);
        try { window.showToast(`Unlocked badge: ${b.title} ${b.icon}`, 'success'); } catch(e){}
      });
    } else {
      renderBadges(unlocked);
    }
  }

  // Init
  document.addEventListener('DOMContentLoaded', () => {
    evaluateBadges();
  });

  // React to task updates
  document.addEventListener('tasksUpdated', () => {
    evaluateBadges();
  });

  // Also react to storage (in case multiple tabs)
  window.addEventListener('storage', (e)=>{
    if (e.key === TASKS_KEY || e.key === STORAGE_KEY) evaluateBadges();
  });

})();
