import { animate } from 'motion';

class HackathonWindow {
  constructor() {
    this.isOpen = false;
    this.overlay = null;
    this.window = null;
    this.header = null;
    this.iframe = null;
    this.loading = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    
    // Iframe URL
    this.iframeUrl = 'https://omnikonhackathon.vercel.app/';
    
    this.init();
  }

  init() {
    // We wait for user interaction to inject and open
    // Expose open method globally so the navbar link can call it
    window.openHackathonWindow = () => this.open();
    
    // Listen for ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  createDOM() {
    if (this.overlay) return; // Already created

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'hackathon-window-overlay';
    
    // Create window
    this.window = document.createElement('div');
    this.window.id = 'hackathon-window';
    
    // Header
    this.header = document.createElement('div');
    this.header.className = 'hackathon-window-header';
    
    const titleContainer = document.createElement('div');
    titleContainer.className = 'hackathon-window-title';
    titleContainer.innerHTML = `
      <img src="./public/LogoOmnikon.jpeg" alt="Omnikon" />
      Omnikon National Tech Hackathon 2026
    `;
    
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'hackathon-window-controls';
    
    const fallbackBtn = document.createElement('a');
    fallbackBtn.className = 'mac-btn mac-fallback';
    fallbackBtn.href = this.iframeUrl;
    fallbackBtn.target = '_blank';
    fallbackBtn.textContent = 'Open in New Tab';
    fallbackBtn.title = 'Open Hackathon if it fails to load';

    const minBtn = document.createElement('button');
    minBtn.className = 'mac-btn mac-minimize';
    
    const maxBtn = document.createElement('button');
    maxBtn.className = 'mac-btn mac-maximize';
    maxBtn.onclick = () => this.toggleMaximize();
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'mac-btn mac-close';
    closeBtn.onclick = () => this.close();
    
    controlsContainer.appendChild(fallbackBtn);
    controlsContainer.appendChild(minBtn);
    controlsContainer.appendChild(maxBtn);
    controlsContainer.appendChild(closeBtn);
    
    this.header.appendChild(titleContainer);
    this.header.appendChild(controlsContainer);
    
    // Content area
    const contentArea = document.createElement('div');
    contentArea.className = 'hackathon-content-area';
    
    this.loading = document.createElement('div');
    this.loading.className = 'hackathon-loading';
    this.loading.innerHTML = `
      <p>> Launching Omnikon National Tech Hackathon...</p>
      <p class="progress-bar">██████████░░░░░░</p>
      <p>> Connecting...</p>
      <p>> Loading assets<span class="blink">_</span></p>
    `;
    
    this.iframe = document.createElement('iframe');
    this.iframe.className = 'hackathon-iframe';
    this.iframe.allow = "camera; microphone; display-capture; fullscreen";
    
    this.iframe.onload = () => {
      // Small delay for effect
      setTimeout(() => {
        this.loading.classList.add('fade-out');
        this.iframe.classList.add('loaded');
      }, 1000);
    };

    contentArea.appendChild(this.loading);
    contentArea.appendChild(this.iframe);
    
    this.window.appendChild(this.header);
    this.window.appendChild(contentArea);
    this.overlay.appendChild(this.window);
    document.body.appendChild(this.overlay);

    this.setupDragging();
  }

  setupDragging() {
    this.header.addEventListener('mousedown', (e) => {
      // Don't drag if clicking buttons
      if (e.target.tagName.toLowerCase() === 'button' || e.target.tagName.toLowerCase() === 'a') return;
      
      this.isDragging = true;
      const rect = this.window.getBoundingClientRect();
      
      // Calculate offset from mouse to top-left of window
      this.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      // Reset centering styles for dragging
      this.window.style.margin = '0';
      // Convert to absolute positioning based on current center position
      this.window.style.left = `${rect.left}px`;
      this.window.style.top = `${rect.top}px`;
      // Remove centering from overlay to allow absolute positioning of window
      this.overlay.style.alignItems = 'flex-start';
      this.overlay.style.justifyContent = 'flex-start';
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      
      const newX = e.clientX - this.dragOffset.x;
      const newY = e.clientY - this.dragOffset.y;
      
      this.window.style.left = `${newX}px`;
      this.window.style.top = `${newY}px`;
    });

    document.addEventListener('mouseup', () => {
      this.isDragging = false;
    });
  }

  toggleMaximize() {
    if (this.window.style.width === '100vw') {
      // Restore
      this.window.style.width = '';
      this.window.style.height = '';
      this.window.style.borderRadius = '';
      this.window.style.left = '';
      this.window.style.top = '';
      this.overlay.style.alignItems = 'center';
      this.overlay.style.justifyContent = 'center';
    } else {
      // Maximize
      this.window.style.width = '100vw';
      this.window.style.height = '100vh';
      this.window.style.borderRadius = '0';
      this.window.style.left = '0';
      this.window.style.top = '0';
      this.overlay.style.alignItems = 'flex-start';
      this.overlay.style.justifyContent = 'flex-start';
    }
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    
    // Disable body scroll
    document.body.style.overflow = 'hidden';
    
    this.createDOM();
    this.overlay.style.display = 'flex';
    
    // Reset loading state
    this.loading.classList.remove('fade-out');
    this.iframe.classList.remove('loaded');
    
    // Load iframe content
    if (!this.iframe.src || this.iframe.src === 'about:blank') {
      this.iframe.src = this.iframeUrl;
    }
    
    // Animate open
    animate(this.overlay, { opacity: [0, 1] }, { duration: 0.3 });
    animate(this.window, 
      { scale: [0.95, 1], opacity: [0, 1], y: [10, 0] }, 
      { duration: 0.4, type: "spring", bounce: 0.3 }
    );
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    
    // Re-enable body scroll
    document.body.style.overflow = '';
    
    // Animate close
    animate(this.overlay, { opacity: 0 }, { duration: 0.3 });
    animate(this.window, { scale: 0.95, opacity: 0, y: 10 }, { duration: 0.3 }).then(() => {
      this.overlay.style.display = 'none';
      // Clear iframe to stop playback/resources
      this.iframe.src = 'about:blank';
    });
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  new HackathonWindow();
});
