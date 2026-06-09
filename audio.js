// audio.js - Audio state & helpers for subtle feedback
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
