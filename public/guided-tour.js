(function(){
  function injectCssOnce(){
    if (document.getElementById('gs-tour-css')) return;
    const link = document.createElement('link');
    link.id = 'gs-tour-css';
    link.rel = 'stylesheet';
    link.href = '/guided-tour.css';
    document.head.appendChild(link);
  }

  class GuidedTour {
    constructor(steps, options={}){
      injectCssOnce();
      this.steps = steps || [];
      this.index = 0;
      this.options = Object.assign({storageKey:'gs_tour_dismissed'}, options);
      this.highlight = null;
      this.tooltip = null;
      this.backdrop = null;
    }
    start(){
      if (!this.steps.length) return;
      this.createBackdrop();
      this.showStep(0);
    }
    skip(){ this.destroy(); localStorage.setItem(this.options.storageKey,'1'); }
    next(){ if (this.index < this.steps.length-1) this.showStep(this.index+1); else this.skip(); }
    prev(){ if (this.index>0) this.showStep(this.index-1); }
    createBackdrop(){
      this.backdrop = document.createElement('div');
      this.backdrop.className = 'gs-tour-backdrop';
      document.body.appendChild(this.backdrop);
    }
    showStep(i){
      this.index = i;
      const step = this.steps[i];
      const el = typeof step.element === 'string' ? document.querySelector(step.element) : step.element;
      if (!el){ this.next(); return; }
      const rect = el.getBoundingClientRect();

      // Highlight
      if (!this.highlight){
        this.highlight = document.createElement('div');
        this.highlight.className = 'gs-tour-highlight';
        document.body.appendChild(this.highlight);
      }
      Object.assign(this.highlight.style, {
        left: (rect.left - 8) + 'px',
        top: (rect.top - 8 + window.scrollY) + 'px',
        width: (rect.width + 16) + 'px',
        height: (rect.height + 16) + 'px'
      });

      // Tooltip
      if (!this.tooltip){
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'gs-tour-tooltip';
        document.body.appendChild(this.tooltip);
      }
      this.tooltip.innerHTML = `
        <h4>${step.title || 'Step ' + (i+1)}</h4>
        <p>${step.content || ''}</p>
        <div class="gs-tour-actions">
          <button class="gs-tour-btn link" data-act="skip">Skip</button>
          ${i>0?'<button class="gs-tour-btn secondary" data-act="prev">Back</button>':''}
          <button class="gs-tour-btn primary" data-act="next">${i < this.steps.length-1 ? 'Next' : 'Finish'}</button>
        </div>`;
      this.tooltip.querySelector('[data-act="next"]').onclick = ()=>this.next();
      const prev = this.tooltip.querySelector('[data-act="prev"]'); if (prev) prev.onclick = ()=>this.prev();
      this.tooltip.querySelector('[data-act="skip"]').onclick = ()=>this.skip();

      // Position tooltip (below element by default)
      const tRect = this.tooltip.getBoundingClientRect();
      let top = rect.bottom + 10 + window.scrollY;
      let left = rect.left;
      if (left + tRect.width > window.innerWidth - 16) left = window.innerWidth - tRect.width - 16;
      if (top + tRect.height > window.scrollY + window.innerHeight - 16) top = rect.top - tRect.height - 10 + window.scrollY;
      this.tooltip.style.top = top + 'px';
      this.tooltip.style.left = Math.max(16, left) + 'px';

      // Auto-scroll into view
      el.scrollIntoView({behavior:'smooth', block:'center'});
    }
    destroy(){
      if (this.highlight) this.highlight.remove();
      if (this.tooltip) this.tooltip.remove();
      if (this.backdrop) this.backdrop.remove();
      this.highlight = this.tooltip = this.backdrop = null;
    }
    static showWelcome(options, onStart, onSkip){
      injectCssOnce();
      const wrap = document.createElement('div');
      wrap.className = 'gs-tour-welcome';
      wrap.innerHTML = `<div class="panel">
        <h3>Welcome to GreenScore!</h3>
        <p>This quick guide will show you around. You can skip anytime.</p>
        <div class="actions">
          <button class="skip">Skip</button>
          <button class="start">Start Tour</button>
        </div>
      </div>`;
      document.body.appendChild(wrap);
      wrap.querySelector('.start').onclick = ()=>{ wrap.remove(); onStart && onStart(); };
      wrap.querySelector('.skip').onclick = ()=>{ wrap.remove(); onSkip && onSkip(); };
    }
  }

  window.GuidedTour = GuidedTour;
})();


