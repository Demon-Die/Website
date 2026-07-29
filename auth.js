(function() {
  let auth = null;
  let modal = null;

  
  const style = document.createElement('style');
  style.textContent = `
    .auth-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(6px);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .auth-modal-overlay.open {
      opacity: 1;
      pointer-events: auto;
    }
    .auth-modal-content {
      width: 90%;
      max-width: 420px;
      background: #0f0f0f;
      border: 1px solid #ff3131;
      padding: 28px;
      position: relative;
      box-shadow: 0 0 25px rgba(255, 49, 49, 0.25);
      transform: scale(0.95);
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .auth-modal-overlay.open .auth-modal-content {
      transform: scale(1);
    }
    .glow-btn-red:hover {
      box-shadow: 0 0 12px rgba(255, 49, 49, 0.4);
    }
  `;
  document.head.appendChild(style);

  
  async function initFirebase() {
    
    if (!window.envLoaded) {
      await new Promise(resolve => window.addEventListener('envLoaded', resolve, { once: true }));
    }

    
    if (!window.env?.FIREBASE_API_KEY) {
      console.warn('Firebase configuration missing in environment.');
      return;
    }

    const firebaseConfig = {
      apiKey: window.env.FIREBASE_API_KEY,
      authDomain: window.env.FIREBASE_AUTH_DOMAIN,
      projectId: window.env.FIREBASE_PROJECT_ID,
      storageBucket: window.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: window.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: window.env.FIREBASE_APP_ID
    };

    try {
      
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      auth = firebase.auth();

      
      mountAuthUI();

      
      auth.onAuthStateChanged((user) => {
        updateAuthWidget(user);
      });
    } catch (err) {
      console.error('Firebase Auth initialization failed:', err);
    }
  }

  
  function mountAuthUI() {
    
    modal = document.createElement('div');
    modal.className = 'auth-modal-overlay';
    modal.id = 'auth-modal';
    modal.innerHTML = `
      <div class="auth-modal-content">
        <div class="flex items-center justify-between border-b border-surface-variant pb-3 mb-6">
          <span class="text-primary font-label-mono text-sm tracking-wider font-bold">SECURE_GATE 
          <button id="auth-close" class="text-on-surface-variant hover:text-primary transition-colors text-sm">✖</button>
        </div>
        <p class="text-on-surface-variant font-code-sm text-code-sm mb-6 uppercase tracking-wider leading-relaxed">
          Awaiting verification token. Select a provider below to connect to the Omnikon network.
        </p>
        <div class="flex flex-col gap-4">
          <button id="auth-github-btn" class="group flex items-center justify-center gap-3 bg-transparent text-on-surface border border-surface-variant hover:border-primary hover:text-primary transition-all duration-200 py-3 font-label-mono text-xs glow-btn-red">
            <span class="material-symbols-outlined text-[16px]">terminal</span>
            <span class="font-bold tracking-widest">GITHUB_OAUTH</span>
          </button>
          <button id="auth-google-btn" class="group flex items-center justify-center gap-3 bg-transparent text-on-surface border border-surface-variant hover:border-primary hover:text-primary transition-all duration-200 py-3 font-label-mono text-xs glow-btn-red">
            <span class="material-symbols-outlined text-[16px]">google</span>
            <span class="font-bold tracking-widest">GOOGLE_OAUTH</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    
    document.getElementById('auth-close').addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });

    
    document.getElementById('auth-github-btn').addEventListener('click', () => signIn('github'));
    document.getElementById('auth-google-btn').addEventListener('click', () => signIn('google'));
  }

  
  function signIn(providerName) {
    let provider;
    if (providerName === 'github') {
      provider = new firebase.auth.GithubAuthProvider();
    } else {
      provider = new firebase.auth.GoogleAuthProvider();
    }

    auth.signInWithPopup(provider)
      .then(() => {
        modal.classList.remove('open');
      })
      .catch((error) => {
        console.error('Sign-in failed:', error);
        alert(`Authentication failure: ${error.message}`);
      });
  }

  
  function updateAuthWidget(user) {
    const mobileToggle = document.querySelector('nav button.md\\:hidden, header button.md\\:hidden');
    if (!mobileToggle) return;

    let authWidget = document.getElementById('auth-widget');
    if (!authWidget) {
      authWidget = document.createElement('div');
      authWidget.id = 'auth-widget';
      authWidget.className = 'flex items-center gap-4 mr-4';
      mobileToggle.parentNode.insertBefore(authWidget, mobileToggle);
    }

    const addBlogBtn = document.getElementById('add-blog-btn');

    if (user) {
      if (addBlogBtn) {
        const displayName = (user.displayName || '').toLowerCase().replace(/\\s+/g, '');
        const emailPrefix = (user.email || '').split('@')[0].toLowerCase();
        const screenName = (user.reloadUserInfo && user.reloadUserInfo.screenName) ? user.reloadUserInfo.screenName.toLowerCase() : '';
        const allowedAdmins = ['rishibyte', 'pranav00076', 'pranavthawait', 'sharanyobanerjee', 'yuvraj', 'yuvraj-sarathe'];
        
        let isAdmin = allowedAdmins.includes(displayName) || allowedAdmins.includes(emailPrefix) || allowedAdmins.includes(screenName);
        
        
        if (!isAdmin && user.providerData) {
          for (const provider of user.providerData) {
            if (provider.providerId === 'github.com') {
              
              const providerEmailPrefix = (provider.email || '').split('@')[0].toLowerCase();
              const providerName = (provider.displayName || '').toLowerCase().replace(/\\s+/g, '');
              const providerUid = provider.uid; 
              if (allowedAdmins.includes(providerEmailPrefix) || allowedAdmins.includes(providerName) || providerUid === "108343166" || providerUid === "140939527" || providerUid === "140889218" || providerUid === "96338573") {
                isAdmin = true;
                break;
              }
            }
          }
        }

        if (isAdmin) {
          addBlogBtn.classList.remove('hidden');
          addBlogBtn.classList.add('flex');
        } else {
          addBlogBtn.classList.add('hidden');
          addBlogBtn.classList.remove('flex');
        }
      }

      const avatarUrl = user.photoURL || './public/LogoOmnikon.jpeg';
      authWidget.innerHTML = `
        <div class="flex items-center gap-3">
          <img class="w-8 h-8 rounded-full border border-primary object-cover" src="${avatarUrl}" alt="Profile">
          <button id="auth-logout-btn" class="text-on-surface-variant hover:text-primary transition-colors text-[10px] sm:text-xs font-label-mono tracking-wider cursor-pointer">
            [ LOGOUT ]
          </button>
        </div>
      `;
      const logoutBtn = document.getElementById('auth-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => auth.signOut());
      }
    } else {
      if (addBlogBtn) {
        addBlogBtn.classList.add('hidden');
        addBlogBtn.classList.remove('flex');
      }

      authWidget.innerHTML = `
        <button id="auth-login-trigger" class="flex items-center gap-2 px-3 py-1.5 border border-primary hover:bg-primary/10 transition-all font-label-mono text-[10px] sm:text-xs text-primary tracking-widest cursor-pointer">
          <span class="material-symbols-outlined text-[14px]">login</span>
          LOGIN
        </button>
      `;
      const loginBtn = document.getElementById('auth-login-trigger');
      if (loginBtn) {
        loginBtn.addEventListener('click', () => modal.classList.add('open'));
      }
    }
  }

  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFirebase);
  } else {
    initFirebase();
  }
})();
