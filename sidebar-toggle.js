(function(){
  'use strict';
  const STORAGE_KEY = 'sidebar_collapsed';
  function setCollapsed(val){
    if(val) document.body.classList.add('sidebar-collapsed');
    else document.body.classList.remove('sidebar-collapsed');
    try { localStorage.setItem(STORAGE_KEY, val ? '1' : '0'); } catch(e){}
  }

  function init(){
    const btn = document.getElementById('sidebarCollapseBtn');
    if(!btn) return;
    // load saved state
    try{
      const saved = localStorage.getItem(STORAGE_KEY);
      if(saved === '1') setCollapsed(true);
    }catch(e){}

    btn.addEventListener('click', ()=>{
      const is = document.body.classList.contains('sidebar-collapsed');
      setCollapsed(!is);
      // small visual feedback
      btn.animate([{transform:'rotate(0)'},{transform:'rotate(180deg)' }],{duration:260,iterations:1});
    });

    // ensure responsive: remove collapsed on small screens
    window.matchMedia('(max-width:999px)').addEventListener('change', (e)=>{
      if(e.matches) setCollapsed(false);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
