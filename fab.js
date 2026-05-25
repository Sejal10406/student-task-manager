(function(){
  'use strict';
  function qs(id){return document.getElementById(id);}
  const fab = qs('fabAddTask');
  const modal = qs('fabModal');
  const backdrop = qs('fabBackdrop');
  const input = qs('fabTaskInput');
  const cancel = qs('fabCancel');
  const submit = qs('fabSubmit');

  function show(){
    if(!modal) return;
    modal.setAttribute('aria-hidden','false');
    setTimeout(()=> input.focus(), 50);
  }
  function hide(){
    if(!modal) return;
    modal.setAttribute('aria-hidden','true');
    input.value = '';
    fab.focus();
  }

  function onAdd(){
    const val = input.value.trim();
    if(!val){
      try{ window.showToast('Please enter a task', 'warning'); }catch(e){}
      return;
    }
    // Use existing input and addTask() from script.js
    const taskInput = qs('taskInput');
    if(taskInput){ taskInput.value = val; }
    try{ if(typeof addTask === 'function') addTask(); else document.getElementById('addTaskBtn')?.click(); } catch(e){ document.getElementById('addTaskBtn')?.click(); }
    try{ window.showToast('Task added', 'success'); } catch(e){}
    hide();
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    if(!fab) return;
    fab.addEventListener('click', show);
    backdrop?.addEventListener('click', hide);
    cancel?.addEventListener('click', hide);
    submit?.addEventListener('click', onAdd);
    input?.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') onAdd(); if(e.key === 'Escape') hide(); });
  });
})();
