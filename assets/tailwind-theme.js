// Global Ultra-Lightweight Loading Engine and Navigation Transition Handler
// (Tailwind theme configuration has moved to tailwind.config.js for build-time compilation)

// Global Ultra-Lightweight Loading Engine
let loaderTimeout = null;

function ensureLoaderDOM() {
  if (!document.body) return;
  if (!document.getElementById('top-loading-bar')) {
    const bar = document.createElement('div');
    bar.id = 'top-loading-bar';
    document.body.appendChild(bar);
  }
  if (!document.getElementById('global-loader-overlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'global-loader-overlay';
    overlay.innerHTML = `
      <div class="glass-panel p-6 max-w-xs w-full border border-primary/40 text-center flex flex-col items-center shadow-[0_0_35px_rgba(255,42,75,0.3)]">
        <div class="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
        <p id="global-loader-msg" class="text-primary font-mono text-xs font-bold uppercase tracking-wider animate-pulse">PROCESSING...</p>
      </div>
    `;
    document.body.appendChild(overlay);
  }
}

window.showGlobalLoader = function(msg = 'PROCESSING...', showOverlay = true) {
  ensureLoaderDOM();
  const bar = document.getElementById('top-loading-bar');
  const overlay = document.getElementById('global-loader-overlay');
  const msgEl = document.getElementById('global-loader-msg');
  
  if (msgEl) msgEl.textContent = msg;
  
  if (bar) {
    bar.style.opacity = '1';
    bar.style.width = '70%';
  }
  
  if (showOverlay && overlay) {
    overlay.classList.add('active');
  }

  clearTimeout(loaderTimeout);
  loaderTimeout = setTimeout(() => {
    window.hideGlobalLoader();
  }, 8000);
};

window.hideGlobalLoader = function() {
  clearTimeout(loaderTimeout);
  const bar = document.getElementById('top-loading-bar');
  const overlay = document.getElementById('global-loader-overlay');
  
  if (bar) {
    bar.style.width = '100%';
    setTimeout(() => {
      bar.style.opacity = '0';
      setTimeout(() => { bar.style.width = '0%'; }, 300);
    }, 200);
  }
  
  if (overlay) {
    overlay.classList.remove('active');
  }
};

// Page Transition Logic
document.addEventListener('DOMContentLoaded', () => {
    ensureLoaderDOM();
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (
            link && 
            link.href && 
            link.host === window.location.host && 
            link.target !== '_blank' &&
            !link.hasAttribute('download') &&
            !link.href.includes('#') &&
            !link.href.startsWith('javascript:')
        ) {
            e.preventDefault();
            const targetUrl = link.href;
            if (window.showGlobalLoader) window.showGlobalLoader('LOADING PAGE...', false);
            document.body.classList.add('page-exiting');
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 300);
        }
    });
});
