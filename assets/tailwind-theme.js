tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            "colors": {
                "on-tertiary": "#313030",
                "surface-container-high": "#292a2a",
                "surface-variant": "#343535",
                "on-tertiary-fixed-variant": "#474646",
                "on-secondary-fixed": "#1c1b1b",
                "inverse-surface": "#e3e2e2",
                "secondary-fixed-dim": "#c8c6c5",
                "secondary": "#c8c6c5",
                "surface-container-lowest": "#0d0e0f",
                "secondary-fixed": "#e5e2e1",
                "primary-container": "#ff544b",
                "tertiary": "#c8c6c5",
                "on-surface-variant": "#e7bcb8",
                "surface": "#0a0a0c",
                "on-primary-fixed-variant": "#93000c",
                "surface-dim": "#050505",
                "primary": "#ff2a4b",
                "on-primary-container": "#5c0005",
                "error-container": "#93000a",
                "secondary-container": "#2a2a2c",
                "on-error-container": "#ffdad6",
                "surface-bright": "#1a1a1c",
                "tertiary-container": "#4a4a4c",
                "on-error": "#690005",
                "background": "#050505",
                "on-secondary": "#313030",
                "on-surface": "#e3e2e2",
                "error": "#ffb4ab",
                "on-secondary-fixed-variant": "#474746",
                "on-primary-fixed": "#410002",
                "primary-fixed": "#ffdad6",
                "tertiary-fixed": "#e5e2e1",
                "primary-fixed-dim": "#ffb4ab",
                "inverse-primary": "#c00014",
                "surface-tint": "#ffb4ab",
                "surface-container-highest": "#343535",
                "surface-container": "#1a1a1a", /* Border color */
                "on-primary": "#000000", /* Text on primary */
                "on-background": "#e3e2e2",
                "outline-variant": "#1a1a1a",
                "inverse-on-surface": "#2f3131",
                "outline": "#1a1a1a",
                "surface-container-low": "#1a1c1c",
                "tertiary-fixed-dim": "#c8c6c5",
                "on-tertiary-fixed": "#1c1b1b",
                "on-secondary-container": "#b7b5b4",
                "on-tertiary-container": "#2a2a29",
                "surface-elevation": "#141416"
            },
            "borderRadius": {
                "DEFAULT": "0.75rem",
                "md": "0.5rem",
                "lg": "1rem",
                "xl": "1.5rem",
                "full": "9999px"
            },
            "spacing": {
                "gutter": "24px",
                "section-gap": "80px",
                "margin-mobile": "16px",
                "unit": "4px",
                "container-max": "1280px"
            },
            "fontFamily": {
                "code-sm": ["JetBrains Mono", "monospace"],
                "label-mono": ["JetBrains Mono", "monospace"],
                "headline-md-mobile": ["Inter", "sans-serif"],
                "body-base": ["JetBrains Mono", "monospace"],
                "display-lg": ["Inter", "sans-serif"],
                "headline-md": ["Inter", "sans-serif"]
            },
            "fontSize": {
                "code-sm": ["12px", { "lineHeight": "1.5", "fontWeight": "400" }],
                "label-mono": ["14px", { "lineHeight": "1.4", "letterSpacing": "0.05em", "fontWeight": "500" }],
                "headline-md-mobile": ["24px", { "lineHeight": "1.2", "fontWeight": "600" }],
                "body-base": ["14px", { "lineHeight": "1.6", "fontWeight": "400" }],
                "display-lg": ["56px", { "lineHeight": "1.1", "letterSpacing": "-0.02em", "fontWeight": "700" }],
                "headline-md": ["32px", { "lineHeight": "1.2", "fontWeight": "600" }]
            }
        }
    }
}

// Global Ultra-Lightweight Loading Engine
let loaderTimeout = null;
let loaderWarningTimeout = null;

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
      <div class="glass-panel p-6 max-w-sm w-full border border-primary/40 text-center flex flex-col items-center shadow-[0_0_35px_rgba(255,42,75,0.3)]">
        <div class="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
        <p id="global-loader-msg" class="text-primary font-mono text-xs font-bold uppercase tracking-wider animate-pulse">PROCESSING...</p>
        <div id="global-loader-timeout-notice" class="hidden mt-3 pt-3 border-t border-surface-variant/50 text-[11px] text-on-surface-variant font-mono leading-relaxed">
          <p class="mb-2">Authenticating or loading is taking time. If you aren't logged in or network is slow, please refresh after some time.</p>
          <button onclick="window.location.reload()" class="px-3 py-1 bg-primary text-background font-bold text-[10px] uppercase rounded hover:opacity-90 transition-opacity">
            REFRESH PAGE
          </button>
        </div>
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
  const timeoutNotice = document.getElementById('global-loader-timeout-notice');
  
  if (msgEl) msgEl.textContent = msg;
  if (timeoutNotice) timeoutNotice.classList.add('hidden');
  
  if (bar) {
    bar.style.opacity = '1';
    bar.style.width = '70%';
  }
  
  if (showOverlay && overlay) {
    overlay.classList.add('active');
  }

  clearTimeout(loaderTimeout);
  clearTimeout(loaderWarningTimeout);

  loaderWarningTimeout = setTimeout(() => {
    if (timeoutNotice && overlay && overlay.classList.contains('active')) {
      timeoutNotice.classList.remove('hidden');
    }
  }, 4000);

  loaderTimeout = setTimeout(() => {
    if (!timeoutNotice || timeoutNotice.classList.contains('hidden')) {
      window.hideGlobalLoader();
    }
  }, 10000);
};

window.hideGlobalLoader = function() {
  clearTimeout(loaderTimeout);
  clearTimeout(loaderWarningTimeout);
  const bar = document.getElementById('top-loading-bar');
  const overlay = document.getElementById('global-loader-overlay');
  const timeoutNotice = document.getElementById('global-loader-timeout-notice');
  
  if (bar) {
    bar.style.width = '100%';
    setTimeout(() => {
      bar.style.opacity = '0';
      setTimeout(() => { bar.style.width = '0%'; }, 300);
    }, 200);
  }
  
  if (overlay) {
    overlay.classList.remove('active');
    if (timeoutNotice) timeoutNotice.classList.add('hidden');
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
