(function(){
  function injectCss(){
    if (document.getElementById('gs-assist-css')) return;
    const link = document.createElement('link');
    link.id='gs-assist-css'; link.rel='stylesheet'; link.href='/ai-assistant.css';
    document.head.appendChild(link);
  }

  const KB = [
    {q:/bulk|upload|zip|excel/i, a:'To bulk upload, open Bulk Upload, select your ZIP/Excel, and submit. Images inside the ZIP map automatically. Make sure the inventory type and photos are present.' , action:()=>clickSel('#bulk-upload, .upload-section, [data-bulk-upload]')},
    {q:/add (single )?(item|material)/i, a:'Click Add Single Item to add one material with photos, price and quantity.', action:()=>clickText('button, a',["add item","add single","add material"])},
    {q:/inventory|my inventory/i, a:'Your inventory lists all materials you added. Use edit to modify, or delete to remove.', action:()=>clickText('.tab-btn, .tabs button, .nav-tabs button',["inventory","my inventory"])},
    {q:/order request|requests?/i, a:'Order Requests shows buyer requests for your materials. Approve or decline from there.', action:()=>clickSel('#order-requests-tab, [data-tab="order-requests"]')},
    {q:/orders?/i, a:'Orders lists approved orders along with status. You can update status here.', action:()=>clickSel('#orders-tab, [data-tab="orders"]')},
    {q:/profile|account/i, a:'Open your profile to edit details, address and view orders & requests.', action:()=>clickSel('#profile-dropdown-button, .profile-dropdown-toggle, .nav .user-menu, [data-profile]')},
    {q:/filters?|category|location|project|condition/i, a:'Use the horizontal filters to narrow materials. Category, Condition, Project and Location are available.', action:()=>focusSel('#category-filter, #project-filter, #location-filter')},
    {q:/images?|photos?/i, a:'You can upload multiple photos per material. We store them safely and display them as a slideshow in details.'}
  ];

  function clickSel(sel){ const el=document.querySelector(sel); if(el) el.click(); }
  function focusSel(sel){ const el=document.querySelector(sel); if(el) el.focus(); }
  function clickText(rootSel, texts){ const nodes=document.querySelectorAll(rootSel); for(const n of nodes){ const t=(n.textContent||'').trim().toLowerCase(); if(texts.some(x=>t.includes(x))) { n.click(); return; }} }

  function respond(ctx, msg){
    const rule = KB.find(r=>r.q.test(msg));
    if (rule){ rule.action && rule.action(); return rule.a; }
    return 'I can help with: My Inventory, Add Single Item, Bulk Upload, Order Requests, Orders, Profile, Filters, Images. Try asking for any of these.';
  }

  function createPanel(){
    injectCss();
    if (document.getElementById('gs-assist-panel')) return;
    const panel = document.createElement('div'); panel.className='gs-assist-panel'; panel.id='gs-assist-panel';
    panel.innerHTML = `
      <div class="gs-assist-header">
        <div style="display:flex;align-items:center;gap:8px"><i class="fas fa-robot"></i><strong>GreenScore Assistant</strong></div>
        <div class="gs-assist-close"><i class="fas fa-times"></i></div>
      </div>
      <div class="gs-assist-body" id="gs-assist-body">
        <div class="gs-msg bot">Hi! Ask me anything about the marketplace or seller dashboard. Try: <span class="gs-suggestion" data-sug="Add single item">Add single item</span> <span class="gs-suggestion" data-sug="Bulk upload">Bulk upload</span> <span class="gs-suggestion" data-sug="Order requests">Order requests</span></div>
      </div>
      <div class="gs-assist-input">
        <input id="gs-assist-input" placeholder="Type your question..."/>
        <button class="gs-tour-btn primary" id="gs-assist-send">Send</button>
      </div>`;
    document.body.appendChild(panel);
    panel.querySelector('.gs-assist-close').onclick = ()=>panel.remove();
    panel.querySelectorAll('.gs-suggestion').forEach(s=>s.onclick=()=>send(s.getAttribute('data-sug')));
    panel.querySelector('#gs-assist-send').onclick = ()=>{
      const val = panel.querySelector('#gs-assist-input').value.trim(); if(val) send(val);
    };
    panel.querySelector('#gs-assist-input').addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); const v=e.currentTarget.value.trim(); if(v) send(v); }});
    function send(text){
      const body = panel.querySelector('#gs-assist-body');
      body.insertAdjacentHTML('beforeend', `<div class="gs-msg user">${escapeHtml(text)}</div>`);
      const answer = respond({}, text);
      body.insertAdjacentHTML('beforeend', `<div class="gs-msg bot">${escapeHtml(answer)}</div>`);
      body.scrollTop = body.scrollHeight;
      panel.querySelector('#gs-assist-input').value='';
    }
    function escapeHtml(s){ return s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
  }

  function openAssistant(){ injectCss(); createPanel(); }
  window.openAssistant = openAssistant;
})();


