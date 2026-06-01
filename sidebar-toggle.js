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
    const mobileToggle = document.getElementById('mobileSidebarToggle');
    if(!btn && !mobileToggle) return;
    // load saved state
    try{
      const saved = localStorage.getItem(STORAGE_KEY);
      if(saved === '1') setCollapsed(true);
    }catch(e){}

    const toggle = () => {
      const is = document.body.classList.contains('sidebar-collapsed');
      setCollapsed(!is);
      if (btn) {
        btn.animate([{transform:'rotate(0)'},{transform:'rotate(180deg)'}],{duration:260,iterations:1});
      }
    };

    if (btn) {
      btn.addEventListener('click', toggle);
    }
    if (mobileToggle) {
      mobileToggle.addEventListener('click', (e) => {
        e.preventDefault();
        toggle();
      });
    }

    // ensure responsive: remove collapsed on small screens
    window.matchMedia('(max-width:999px)').addEventListener('change', (e)=>{
      if(e.matches) setCollapsed(false);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
