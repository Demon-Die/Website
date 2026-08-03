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
          <span class="text-primary font-label-mono text-sm tracking-wider font-bold">SECURE_GATE</span> 
          <button id="auth-close" class="text-on-surface-variant hover:text-primary transition-colors text-sm">✖</button>
        </div>
        <p class="text-on-surface-variant font-code-sm text-code-sm mb-4 uppercase tracking-wider leading-relaxed">
          Select a provider below to connect to the Omnikon network.
        </p>
        <div class="flex flex-col gap-4 mb-4">
          <button id="auth-github-btn" class="group flex items-center justify-center gap-3 bg-transparent text-on-surface border border-surface-variant hover:border-primary hover:text-primary transition-all duration-200 py-3 font-label-mono text-xs glow-btn-red">
            <span class="material-symbols-outlined text-[16px]">terminal</span>
            <span class="font-bold tracking-widest">GITHUB_OAUTH</span>
          </button>
          <button id="auth-google-btn" class="group flex items-center justify-center gap-3 bg-transparent text-on-surface border border-surface-variant hover:border-primary hover:text-primary transition-all duration-200 py-3 font-label-mono text-xs glow-btn-red">
            <span class="material-symbols-outlined text-[16px]">google</span>
            <span class="font-bold tracking-widest">GOOGLE_OAUTH</span>
          </button>
        </div>
        <div class="flex items-center gap-2 mb-4">
          <div class="h-px bg-surface-variant flex-1"></div>
          <span class="text-on-surface-variant font-code-sm text-[10px] uppercase">OR EMAIL</span>
          <div class="h-px bg-surface-variant flex-1"></div>
        </div>
        <div class="flex flex-col gap-3">
          <input type="email" id="auth-email-input" placeholder="ACCESS_EMAIL" class="bg-surface-elevation border border-border rounded-lg px-4 py-2 focus:outline-none focus:border-primary text-on-surface font-mono text-sm">
          <input type="password" id="auth-password-input" placeholder="SECRET_KEY" class="bg-surface-elevation border border-border rounded-lg px-4 py-2 focus:outline-none focus:border-primary text-on-surface font-mono text-sm">
          <div class="flex gap-2 mt-1">
            <button id="auth-email-login" class="flex-1 py-2 bg-primary/20 hover:bg-primary/40 border border-primary text-primary font-mono text-xs font-bold transition-colors">LOGIN</button>
            <button id="auth-email-signup" class="flex-1 py-2 bg-surface-variant/20 hover:bg-surface-variant/40 border border-surface-variant text-on-surface font-mono text-xs transition-colors">SIGN UP</button>
          </div>
          <p id="auth-error-msg" class="text-primary text-[10px] font-mono hidden mt-1"></p>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('auth-close').addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });

    // Expose open function globally
    window.openAuthModal = function() {
      modal.classList.add('open');
    };

    
    document.getElementById('auth-github-btn').addEventListener('click', () => signIn('github'));
    document.getElementById('auth-google-btn').addEventListener('click', () => signIn('google'));
    
    document.getElementById('auth-email-login').addEventListener('click', () => signInWithEmail('login'));
    document.getElementById('auth-email-signup').addEventListener('click', () => signInWithEmail('signup'));
  }
  
  function showError(msg) {
    if (window.hideGlobalLoader) window.hideGlobalLoader();
    const errorEl = document.getElementById('auth-error-msg');
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
  }

  function signInWithEmail(type) {
    const email = document.getElementById('auth-email-input').value;
    const password = document.getElementById('auth-password-input').value;
    const errorEl = document.getElementById('auth-error-msg');
    errorEl.classList.add('hidden');
    
    if (!email || !password) {
      showError('EMAIL AND PASSWORD REQUIRED');
      return;
    }
    
    if (window.showGlobalLoader) {
      window.showGlobalLoader(type === 'login' ? 'AUTHENTICATING_EMAIL...' : 'CREATING_ACCOUNT...');
    }

    const promise = type === 'login' 
      ? auth.signInWithEmailAndPassword(email, password)
      : auth.createUserWithEmailAndPassword(email, password);
      
    promise.then(() => {
      modal.classList.remove('open');
      if (window.hideGlobalLoader) window.hideGlobalLoader();
    }).catch(error => {
      console.error('Email auth failed:', error);
      showError(`ERR: ${error.message}`);
    });
  }

  function signIn(providerName) {
    let provider;
    if (providerName === 'github') {
      provider = new firebase.auth.GithubAuthProvider();
    } else {
      provider = new firebase.auth.GoogleAuthProvider();
    }

    if (window.showGlobalLoader) {
      window.showGlobalLoader('INITIATING_OAUTH...');
    }

    auth.signInWithPopup(provider)
      .then((result) => {
        // Linking accounts is generally handled on the backend or in Firebase Console settings.
        // If a user with the same email exists, Firebase might throw an error we need to catch.
        modal.classList.remove('open');
        if (window.hideGlobalLoader) window.hideGlobalLoader();
      })
      .catch((error) => {
        if (error.code === 'auth/account-exists-with-different-credential') {
          showError('ACCOUNT ALREADY EXISTS WITH DIFFERENT PROVIDER. USE EMAIL LOGIN.');
        } else {
          console.error('Sign-in failed:', error);
          showError(`ERR: ${error.message}`);
        }
      });
  }

  
  function updateAuthWidget(user) {
    const mobileToggle = document.querySelector('nav button.md\\:hidden, header button.md\\:hidden');
    if (!mobileToggle) return;    let authWidget = document.getElementById('auth-widget');
    if (!authWidget) {
      authWidget = document.createElement('div');
      authWidget.id = 'auth-widget';
      authWidget.className = 'flex items-center gap-2 sm:gap-4 mr-2 sm:mr-4 shrink-0';
      mobileToggle.parentNode.insertBefore(authWidget, mobileToggle);
    }

    const addBlogBtn = document.getElementById('add-blog-btn');

    if (user) {
      if (addBlogBtn) {
        const displayName = (user.displayName || '').toLowerCase().replace(/\s+/g, '');
        const emailPrefix = (user.email || '').split('@')[0].toLowerCase();
        const screenName = (user.reloadUserInfo && user.reloadUserInfo.screenName) ? user.reloadUserInfo.screenName.toLowerCase() : '';
        const allowedAdmins = ['rishibyte', 'pranav00076', 'pranavthawait', 'sharanyobanerjee', 'yuvraj', 'yuvraj-sarathe'];
        
        let isAdmin = allowedAdmins.includes(displayName) || allowedAdmins.includes(emailPrefix) || allowedAdmins.includes(screenName);
        
        
        if (!isAdmin && user.providerData) {
          for (const provider of user.providerData) {
            if (provider.providerId === 'github.com') {
              
              const providerEmailPrefix = (provider.email || '').split('@')[0].toLowerCase();
              const providerName = (provider.displayName || '').toLowerCase().replace(/\s+/g, '');
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
        <div class="flex items-center gap-1.5 sm:gap-3">
          <img class="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-primary object-cover shrink-0" src="${avatarUrl}" alt="Profile">
          <button id="auth-logout-btn" class="text-on-surface-variant hover:text-primary transition-colors text-[10px] sm:text-xs font-label-mono tracking-wider cursor-pointer whitespace-nowrap">
            [ LOGOUT ]
          </button>
        </div>
      `;
      const logoutBtn = document.getElementById('auth-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          try {
            if (window.showGlobalLoader) window.showGlobalLoader('LOGGING_OUT...');
            await auth.signOut();
            sessionStorage.clear();
            window.location.href = '/index.html';
          } catch(err) {
            console.error("Logout error:", err);
            if (window.hideGlobalLoader) window.hideGlobalLoader();
          }
        });
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
