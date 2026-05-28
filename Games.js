/* ===== GLOBAL STATE ===== */
const _S = window.TaskQuestStorage;
let globalScore = _S ? _S.getCoins() : 0;
if (isNaN(globalScore)) globalScore = 0;
let globalStreak = _S ? _S.getStreak() : 0;

function addScore(n){
  globalScore += n;
  globalStreak++;
  document.getElementById('global-score').textContent = globalScore;
  document.getElementById('global-streak').textContent = globalStreak;
  if (_S) {
    _S.setCoins(globalScore);
    _S.setStreak(globalStreak);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('global-score').textContent = globalScore;
  document.getElementById('global-streak').textContent = globalStreak;
});
function openGame(id){
  document.getElementById('overlay-'+id).classList.remove('hidden');
  document.body.style.overflow='hidden';
  if(id==='memory') initMemory();
  if(id==='word') initWord();
  if(id==='type') nextQuote();
  if(id==='react') resetReact();
  if(id==='breath') resetBreath();
  if(id==='math') resetMath();
}
function closeGame(id){
  document.getElementById('overlay-'+id).classList.add('hidden');
  document.body.style.overflow='';
  if(id==='memory') clearTimeout(memTimer);
  if(id==='math'){clearInterval(mathInterval);mathRunning=false;}
  if(id==='word'){clearInterval(wordInterval);}
  if(id==='breath'){stopBreath();}
  if(id==='react'){clearTimeout(reactTimeout);}
}

/* ===== MEMORY MATCH ===== */
const EMOJIS=['📚','✏️','🧠','📝','🎯','💡','⏰','🏆'];
let memFlipped=[],memMatched=0,memMoves=0,memLocked=false,memTimer;
function initMemory(){
  memFlipped=[];memMatched=0;memMoves=0;memLocked=false;
  document.getElementById('mem-moves').textContent=0;
  document.getElementById('mem-pairs').textContent=0;
  document.getElementById('mem-result').textContent='';
  document.getElementById('mem-result').className='result-msg';
  const cards=[...EMOJIS,...EMOJIS].sort(()=>Math.random()-0.5);
  const grid=document.getElementById('mem-grid');
  grid.innerHTML='';
  cards.forEach((emoji,i)=>{
    const c=document.createElement('div');
    c.className='mem-card';
    c.dataset.emoji=emoji;
    c.dataset.idx=i;
    c.innerHTML=`<span class="mem-face">${emoji}</span>`;
    c.onclick=()=>flipCard(c);
    grid.appendChild(c);
  });
}
function flipCard(card){
  if(memLocked||card.classList.contains('flipped')||card.classList.contains('matched'))return;
  card.classList.add('flipped');
  memFlipped.push(card);
  if(memFlipped.length===2){
    memLocked=true;
    memMoves++;
    document.getElementById('mem-moves').textContent=memMoves;
    const[a,b]=memFlipped;
    if(a.dataset.emoji===b.dataset.emoji){
      a.classList.add('matched');b.classList.add('matched');
      memMatched++;
      document.getElementById('mem-pairs').textContent=memMatched;
      memFlipped=[];memLocked=false;
      if(memMatched===8){
        const msg=document.getElementById('mem-result');
        msg.textContent=`🎉 You got it in ${memMoves} moves! Amazing focus!`;
        msg.className='result-msg ok';
        addScore(20);
      }
    } else {
      memTimer=setTimeout(()=>{
        a.classList.remove('flipped');b.classList.remove('flipped');
        memFlipped=[];memLocked=false;
      },900);
    }
  }
}

/* ===== SPEED MATH ===== */
let mathScore=0,mathInterval,mathRunning=false,mathStreak=0,mathTimeLeft=60;
function resetMath(){
  clearInterval(mathInterval);mathRunning=false;mathScore=0;mathStreak=0;mathTimeLeft=60;
  document.getElementById('math-score').textContent=0;
  document.getElementById('math-timer').textContent='60s';
  document.getElementById('math-timer').className='gp-stat timer-chip';
  document.getElementById('math-q').textContent='Press Start!';
  document.getElementById('math-opts').innerHTML='';
  document.getElementById('math-result').textContent='';
  document.getElementById('math-result').className='result-msg';
  document.getElementById('math-streak').textContent='';
}
function startMath(){
  if(mathRunning)return;
  resetMath();
  mathRunning=true;
  nextMathQ();
  mathInterval=setInterval(()=>{
    mathTimeLeft--;
    const tc=document.getElementById('math-timer');
    tc.textContent=mathTimeLeft+'s';
    if(mathTimeLeft<=10)tc.className='gp-stat timer-chip danger';
    if(mathTimeLeft<=0){
      clearInterval(mathInterval);mathRunning=false;
      document.getElementById('math-opts').innerHTML='';
      const r=document.getElementById('math-result');
      r.textContent=`Time's up! You scored ${mathScore} pts. ${mathScore>=10?'Champ!':'Keep practicing!'}`;
      r.className='result-msg ok';
      if(mathScore>0)addScore(mathScore);
    }
  },1000);
}
function nextMathQ(){
  if(!mathRunning)return;
  const ops=['+','-','×'];
  const op=ops[Math.floor(Math.random()*ops.length)];
  let a,b,ans;
  if(op==='+'){a=Math.floor(Math.random()*50)+1;b=Math.floor(Math.random()*50)+1;ans=a+b;}
  else if(op==='-'){a=Math.floor(Math.random()*50)+10;b=Math.floor(Math.random()*a)+1;ans=a-b;}
  else{a=Math.floor(Math.random()*12)+1;b=Math.floor(Math.random()*12)+1;ans=a*b;}
  document.getElementById('math-q').textContent=`${a} ${op} ${b} = ?`;
  const wrongs=new Set();
  while(wrongs.size<3){const w=ans+Math.floor(Math.random()*20)-10;if(w!==ans)wrongs.add(w);}
  const opts=[ans,...wrongs].sort(()=>Math.random()-0.5);
  const container=document.getElementById('math-opts');
  container.innerHTML='';
  opts.forEach(o=>{
    const btn=document.createElement('button');
    btn.className='math-opt';
    btn.textContent=o;
    btn.onclick=()=>pickMath(btn,o,ans);
    container.appendChild(btn);
  });
}
function pickMath(btn,chosen,correct){
  document.querySelectorAll('.math-opt').forEach(b=>b.onclick=null);
  if(chosen===correct){
    btn.classList.add('correct');
    mathScore+=2;mathStreak++;
    document.getElementById('math-score').textContent=mathScore;
    document.getElementById('math-streak').textContent=mathStreak>=3?`🔥 ${mathStreak} streak!`:'';
    setTimeout(nextMathQ,500);
  } else {
    btn.classList.add('wrong');
    mathStreak=0;
    document.getElementById('math-streak').textContent='';
    document.querySelectorAll('.math-opt').forEach(b=>{if(parseInt(b.textContent)===correct)b.classList.add('correct');});
    setTimeout(nextMathQ,800);
  }
}

/* ===== WORD SCRAMBLE ===== */
const WORDS=[
  {w:'FOCUS',h:'Concentration of attention'},
  {w:'STUDY',h:'Learning with effort'},
  {w:'MEMORY',h:'Ability to recall things'},
  {w:'REVIEW',h:'Go over again'},
  {w:'PRACTICE',h:'Repeated exercise'},
  {w:'GOAL',h:'Desired outcome'},
  {w:'NOTES',h:'Written reminders'},
  {w:'EXAM',h:'A formal test'},
  {w:'LEARN',h:'Acquire knowledge'},
  {w:'MIND',h:'The thinking organ'},
  {w:'LOGIC',h:'Reasoned thinking'},
  {w:'SKILL',h:'Learned ability'},
  {w:'BOOK',h:'Pages of knowledge'},
  {w:'PLAN',h:'A strategy'},
  {w:'SMART',h:'Intelligent or specific goals'},
];
let wordIdx=0,wordScore=0,wordInterval,wordTimeLeft=30;
function initWord(){
  wordScore=0;wordIdx=Math.floor(Math.random()*WORDS.length);
  document.getElementById('word-score').textContent=0;
  document.getElementById('word-result').textContent='';
  document.getElementById('word-result').className='result-msg';
  showWord();
}
function scramble(w){
  let s=w.split('');
  do{s.sort(()=>Math.random()-0.5);}while(s.join('')===w);
  return s.join('');
}
function showWord(){
  clearInterval(wordInterval);
  wordTimeLeft=30;
  const entry=WORDS[wordIdx%WORDS.length];
  document.getElementById('word-scrambled').textContent=scramble(entry.w);
  document.getElementById('word-hint').textContent='Hint: '+entry.h;
  document.getElementById('word-input').value='';
  document.getElementById('word-result').textContent='';
  document.getElementById('word-result').className='result-msg';
  document.getElementById('word-timer').textContent='30s';
  document.getElementById('word-timer').className='gp-stat timer-chip';
  wordInterval=setInterval(()=>{
    wordTimeLeft--;
    document.getElementById('word-timer').textContent=wordTimeLeft+'s';
    if(wordTimeLeft<=10)document.getElementById('word-timer').className='gp-stat timer-chip danger';
    if(wordTimeLeft<=0){
      clearInterval(wordInterval);
      const r=document.getElementById('word-result');
      r.textContent=`Time's up! Answer was: ${WORDS[wordIdx%WORDS.length].w}`;
      r.className='result-msg bad';
      wordIdx++;
      setTimeout(showWord,1400);
    }
  },1000);
}
function checkWord(){
  const input=document.getElementById('word-input').value.trim().toUpperCase();
  const correct=WORDS[wordIdx%WORDS.length].w;
  const r=document.getElementById('word-result');
  if(input===correct){
    clearInterval(wordInterval);
    wordScore+=5;
    document.getElementById('word-score').textContent=wordScore;
    r.textContent='✅ Correct! +5 pts — You nailed it!';
    r.className='result-msg ok';
    addScore(5);
    wordIdx++;
    setTimeout(showWord,1200);
  } else {
    r.textContent='Not quite — try again!';
    r.className='result-msg bad';
  }
}
function skipWord(){
  clearInterval(wordInterval);
  const r=document.getElementById('word-result');
  r.textContent=`Skipped! Answer was: ${WORDS[wordIdx%WORDS.length].w}`;
  r.className='result-msg bad';
  wordIdx++;
  setTimeout(showWord,1200);
}
"use strict";
document.addEventListener('DOMContentLoaded',()=>{
  const wi=document.getElementById('word-input');
  if(wi)wi.addEventListener('keydown',e=>{if(e.key==='Enter')checkWord();});
});

/* ===== BREATH FOCUS ===== */
const PHASES=[
  {name:'Inhale',sec:4,cls:'inhale'},
  {name:'Hold',sec:7,cls:'hold'},
  {name:'Exhale',sec:8,cls:'exhale'},
];
let breathRunning=false,breathPhaseIdx=0,breathCount=0,breathCycles=0,breathTimeout2;
function resetBreath(){
  stopBreath();breathCycles=0;breathPhaseIdx=0;breathCount=0;
  document.getElementById('breath-cycles').textContent=0;
  document.getElementById('breath-label').textContent='Ready';
  document.getElementById('breath-count').textContent='4';
  document.getElementById('breath-phase').textContent='Press start to begin';
  document.getElementById('breath-ring').className='breath-ring';
  document.getElementById('breath-btn').innerHTML='<i class="ti ti-player-play"></i> Start';
}
function stopBreath(){clearTimeout(breathTimeout2);breathRunning=false;}
function toggleBreath(){
  if(breathRunning){stopBreath();document.getElementById('breath-btn').innerHTML='<i class="ti ti-player-play"></i> Resume';}
  else{breathRunning=true;document.getElementById('breath-btn').innerHTML='<i class="ti ti-player-pause"></i> Pause';runBreathPhase();}
}
function runBreathPhase(){
  if(!breathRunning)return;
  const phase=PHASES[breathPhaseIdx];
  document.getElementById('breath-label').textContent=phase.name;
  document.getElementById('breath-ring').className='breath-ring '+phase.cls;
  document.getElementById('breath-phase').textContent=phase.name+'…';
  breathCount=phase.sec;
  document.getElementById('breath-count').textContent=breathCount;
  tickBreath(phase);
}
function tickBreath(phase){
  if(!breathRunning)return;
  if(breathCount<=0){
    breathPhaseIdx=(breathPhaseIdx+1)%PHASES.length;
    if(breathPhaseIdx===0){breathCycles++;document.getElementById('breath-cycles').textContent=breathCycles;if(breathCycles>=3)addScore(15);}
    runBreathPhase();return;
  }
  breathTimeout2=setTimeout(()=>{breathCount--;document.getElementById('breath-count').textContent=breathCount;tickBreath(phase);},1000);
}

/* ===== REACTION TEST ===== */
let reactState='idle',reactTimes=[],reactTimeout,reactStart;
function resetReact(){
  clearTimeout(reactTimeout);reactState='idle';reactTimes=[];
  document.getElementById('react-msg').textContent='Tap to Start';
  document.getElementById('react-target').classList.add('hidden');
  document.getElementById('react-times').innerHTML='';
  document.getElementById('react-best').textContent='--';
  document.getElementById('react-avg').textContent='--';
  document.getElementById('react-area').className='react-area';
}
function handleReact(){
  if(reactState==='idle'){
    reactState='waiting';
    document.getElementById('react-msg').textContent='Get ready…';
    document.getElementById('react-area').className='react-area waiting';
    const delay=1500+Math.random()*3500;
    reactTimeout=setTimeout(showTarget,delay);
  } else if(reactState==='waiting'){
    clearTimeout(reactTimeout);
    document.getElementById('react-msg').textContent='Too early! Tap to try again.';
    document.getElementById('react-area').className='react-area';
    reactState='idle';
  } else if(reactState==='go'){
    const rt=Date.now()-reactStart;
    reactTimes.push(rt);
    document.getElementById('react-target').classList.add('hidden');
    document.getElementById('react-area').className='react-area';
    const best=Math.min(...reactTimes);
    const avg=Math.round(reactTimes.reduce((a,b)=>a+b,0)/reactTimes.length);
    document.getElementById('react-best').textContent=best+'ms';
    document.getElementById('react-avg').textContent=avg+'ms';
    const chip=document.createElement('div');
    chip.className='rt-chip';chip.textContent=rt+'ms';
    document.getElementById('react-times').appendChild(chip);
    reactState='idle';
    if(rt<250)addScore(10);else if(rt<400)addScore(5);else addScore(2);
    const msg=rt<200?'⚡ Insane reflexes!':rt<300?'🔥 Great reaction!':rt<500?'👍 Good job!':'Keep training!';
    document.getElementById('react-msg').textContent=msg+' Tap to go again.';
  }
}
function showTarget(){
  reactState='go';reactStart=Date.now();
  document.getElementById('react-msg').textContent='';
  document.getElementById('react-target').classList.remove('hidden');
  document.getElementById('react-area').className='react-area go';
}

/* ===== FOCUS TYPING ===== */
const QUOTES=[
  "The secret of getting ahead is getting started.",
  "Push yourself because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Success is the sum of small efforts repeated day in and day out.",
  "Don't watch the clock. Do what it does. Keep going.",
  "Study hard what interests you the most in the most undisciplined way possible.",
  "The expert in anything was once a beginner.",
  "Believe you can and you're halfway there.",
  "It always seems impossible until it's done.",
  "Your future self is watching you right now through your memories.",
  "Focus on being productive instead of being busy.",
  "Learning never exhausts the mind. It only ignites it.",
];
let typeQuote='',typeStartTime=null,typeWPM=0;
function nextQuote(){
  typeQuote=QUOTES[Math.floor(Math.random()*QUOTES.length)];
  document.getElementById('type-quote').textContent=typeQuote;
  document.getElementById('type-input').value='';
  document.getElementById('type-wpm').textContent=0;
  document.getElementById('type-acc').textContent='100%';
  document.getElementById('type-bar').style.width='0%';
  document.getElementById('type-result').textContent='';
  document.getElementById('type-result').className='result-msg';
  typeStartTime=null;
}
document.addEventListener('DOMContentLoaded',()=>{
  const ti=document.getElementById('type-input');
  if(ti)ti.addEventListener('input',handleTyping);
});
function handleTyping(){
  const input=document.getElementById('type-input').value;
  if(!typeStartTime&&input.length>0)typeStartTime=Date.now();
  const target=typeQuote;
  const pct=Math.min(100,Math.round((input.length/target.length)*100));
  document.getElementById('type-bar').style.width=pct+'%';
  let correct=0;
  for(let i=0;i<input.length;i++){if(input[i]===target[i])correct++;}
  const acc=input.length>0?Math.round((correct/input.length)*100):100;
  document.getElementById('type-acc').textContent=acc+'%';
  if(typeStartTime){
    const mins=(Date.now()-typeStartTime)/60000;
    const wpm=Math.round((input.split(' ').length)/mins);
    document.getElementById('type-wpm').textContent=isFinite(wpm)?Math.min(wpm,300):0;
  }
  if(input===target){
    const wpm=parseInt(document.getElementById('type-wpm').textContent)||0;
    const r=document.getElementById('type-result');
    r.textContent=`✅ Done! ${wpm} WPM, ${acc}% accuracy. ${wpm>=40?'Blazing fast!':'Great work!'}`;
    r.className='result-msg ok';
    addScore(wpm>=40?15:10);
  }
}
const saveGameState = (gameId, state) => {
  try {
    localStorage.setItem(`gameState_${gameId}`, JSON.stringify(state));
  } catch (e) {
    console.warn('Could not save game state');
  }
};
