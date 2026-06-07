/**
 * @fileoverview TaskQuest Client Library and utilities.
 * @author Senior Open-Source Contributor
 * @version 2.0.0
 */

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

  function playBadgeUnlockSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = "sine";
      const now = audioCtx.currentTime;
      osc.frequency.setValueAtTime(261.63, now); // C4
      osc.frequency.setValueAtTime(329.63, now + 0.1); // E4
      osc.frequency.setValueAtTime(392.00, now + 0.2); // G4
      osc.frequency.setValueAtTime(523.25, now + 0.3); // C5
      
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.8);
    } catch (e) {
      console.warn("AudioContext synthesis is blocked or unsupported.", e);
    }
  }

  function triggerConfettiCelebration() {
    const container = document.getElementById("confettiContainer");
    if (!container) return;
    for (let i = 0; i < 60; i++) {
      const p = document.createElement("div");
      p.style.position = "absolute";
      p.style.width = "8px";
      p.style.height = "8px";
      p.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
      p.style.left = `${Math.random() * 100}%`;
      p.style.top = `-10px`;
      p.style.borderRadius = "50%";
      p.style.transform = `scale(${Math.random() * 1.5 + 0.5})`;
      p.style.transition = "transform 1.5s ease-out, top 1.5s ease-out, opacity 1.5s ease-out";
      container.appendChild(p);
      
      setTimeout(function () {
        p.style.top = `${window.innerHeight + 10}px`;
        p.style.transform = `scale(${Math.random() * 0.5}) rotate(${Math.random() * 360}deg)`;
        p.style.opacity = "0";
      }, 50);
      
      setTimeout(function () { p.remove(); }, 1600);
    }
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
      playBadgeUnlockSound();
      triggerConfettiCelebration();
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
