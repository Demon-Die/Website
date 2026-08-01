import { getDb, getAmbassadorData, createAmbassadorProfile, getReferrals } from './db.js';

// Wait for Firebase Auth to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Since auth.js initializes firebase, we can just use the global object
  const checkAuth = setInterval(async () => {
    if (window.firebase && firebase.auth) {
      clearInterval(checkAuth);
      
      firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
          document.getElementById('dashboard-content').innerHTML = `
            <div class="min-h-[50vh] flex items-center justify-center">
              <div class="glass-panel p-12 max-w-md w-full border border-primary text-center">
                <span class="material-symbols-outlined text-6xl text-primary mb-4 block">warning</span>
                <h2 class="text-2xl font-bold font-headline-mono text-primary mb-2">ACCESS_DENIED</h2>
                <p class="text-on-surface-variant font-mono text-sm mb-6">Authentication required to access the Ambassador Portal.</p>
                <div class="flex flex-col gap-3">
                  <button onclick="if(window.openAuthModal) window.openAuthModal()" class="w-full inline-flex justify-center items-center gap-2 px-6 py-3 bg-primary text-background font-bold transition-colors font-mono text-sm uppercase glow-hover">
                    LOGIN TO CONTINUE
                  </button>
                  <a href="/ambassadors.html" class="w-full inline-flex justify-center items-center gap-2 px-6 py-2 bg-primary/20 border border-primary text-primary hover:bg-primary/30 transition-colors font-mono text-sm uppercase glow-hover">Return to Landing</a>
                </div>
              </div>
            </div>
          `;
          return;
        }

        try {
          // Load ambassador data
          let profile = await getAmbassadorData(user.uid);
          
          const pendingApp = sessionStorage.getItem('pendingAmbassadorApp');
          let appData = {};
          if (pendingApp) {
            try { appData = JSON.parse(pendingApp); } catch(e){}
            sessionStorage.removeItem('pendingAmbassadorApp');
          }
          
          if (!profile) {
            // Note: In strict flow, admin approves them first.
            profile = await createAmbassadorProfile(user, appData);
          } else if (Object.keys(appData).length > 0) {
            // Update existing profile with new app data
            const db = await getDb();
            await db.collection('users').doc(user.uid).update(appData);
            profile = { ...profile, ...appData };
          }
          
          if (profile.role === 'admin') {
            window.location.replace('/admin.html');
            return;
          }

          renderDashboard(profile);
          loadReferrals(profile.ambassadorId);
          
        } catch (err) {
          console.error("Dashboard error:", err);
        }
      });
    }
  }, 100);
});

function renderDashboard(profile) {
  const nameEl = document.getElementById('ambassador-name');
  const idEl = document.getElementById('ambassador-id');
  const avatarEl = document.getElementById('ambassador-avatar');
  
  if (nameEl) nameEl.textContent = profile.name || 'Ambassador';
  if (idEl) {
    if (profile.status === 'pending') {
      idEl.textContent = 'PENDING APPROVAL';
      idEl.classList.add('text-accent');
      idEl.classList.remove('text-primary');
    } else {
      idEl.textContent = profile.ambassadorId;
    }
  }
  if (avatarEl && profile.photoURL) avatarEl.src = profile.photoURL;
  
  const rankEl = document.getElementById('stat-rank');
  const refsEl = document.getElementById('stat-refs');
  const clicksEl = document.getElementById('stat-clicks');
  const convEl = document.getElementById('stat-conversion');
  
  // Dashboard Metrics Binding
  if (rankEl) rankEl.textContent = profile.tier || 'Bronze';
  if (refsEl) refsEl.textContent = profile.verifiedRegistrations || 0;
  
  const uniqueClicks = profile.uniqueClicks || 0;
  const totalClicks = profile.totalClicks || 0;
  
  if (clicksEl) clicksEl.textContent = totalClicks;
  
  let conversionRate = 0;
  if (uniqueClicks > 0) {
    conversionRate = Math.round(((profile.verifiedRegistrations || 0) / uniqueClicks) * 100);
  }
  
  if (convEl) convEl.textContent = conversionRate + '%';
}

async function loadReferrals(ambassadorId) {
  const container = document.getElementById('recent-activity-list');
  const tableBody = document.getElementById('referral-history-table');
  
  if (!ambassadorId) {
    if (container) container.innerHTML = '<p class="text-sm text-on-surface-variant">Your account is pending approval.</p>';
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-on-surface-variant">Your account is pending approval.</td></tr>';
    return;
  }
  
  try {
    const referrals = await getReferrals(ambassadorId);
    
    if (referrals.length === 0) {
      if (container) container.innerHTML = '<p class="text-sm text-on-surface-variant">No referrals yet. Share your link to get started!</p>';
      if (tableBody) tableBody.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-on-surface-variant">No referrals yet. Share your link to get started!</td></tr>';
      return;
    }
    
    // Fill Recent Activity (Overview)
    if (container) {
      container.innerHTML = referrals.slice(0, 5).map(ref => `
        <div class="flex items-center justify-between p-3 bg-surface-variant/20 border border-surface-variant/50 rounded-lg">
          <div>
            <p class="font-mono text-xs text-on-surface">IP: ${ref.visitorIp || 'Hidden'}</p>
            <p class="text-[10px] text-on-surface-variant">${new Date(ref.timestamp?.toDate()).toLocaleString()}</p>
          </div>
          <div>
            ${ref.status === 'verified' 
              ? '<span class="px-2 py-1 bg-primary/20 text-primary text-[10px] font-bold rounded uppercase">Verified</span>'
              : '<span class="px-2 py-1 bg-accent/20 text-accent text-[10px] font-bold rounded uppercase">Pending</span>'}
          </div>
        </div>
      `).join('');
    }
    
    // Fill Referral History Table (Referrals Tab)
    if (tableBody) {
      tableBody.innerHTML = referrals.map(ref => `
        <tr class="border-b border-surface-variant/30 hover:bg-surface-variant/10 transition-colors">
          <td class="py-3 text-xs text-on-surface-variant">${new Date(ref.timestamp?.toDate()).toLocaleDateString()}</td>
          <td class="py-3 font-mono text-xs">${ref.visitorIp || 'Unknown'}</td>
          <td class="py-3">
            ${ref.status === 'verified' 
              ? '<span class="px-2 py-1 bg-primary/20 text-primary text-[10px] font-bold rounded uppercase">Verified</span>'
              : '<span class="px-2 py-1 bg-accent/20 text-accent text-[10px] font-bold rounded uppercase">Pending</span>'}
          </td>
        </tr>
      `).join('');
    }
    
  } catch (err) {
    console.error("Error loading referrals:", err);
    if (container) container.innerHTML = '<p class="text-sm text-accent">Error loading activity.</p>';
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-accent">Error loading activity.</td></tr>';
  }
}

// Attach to window so HTML inline onclick can access it
window.switchTab = function(tabName) {
  const tabs = ['overview', 'referrals'];
  if (!tabs.includes(tabName)) {
    alert(tabName.toUpperCase() + " section is under construction for the upcoming campaign.");
    return;
  }
  
  tabs.forEach(t => {
    const el = document.getElementById('tab-' + t);
    if (el) {
      if (t === tabName) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
  });
};

window.copyReferralLink = function() {
  const idEl = document.getElementById('ambassador-id');
  if (!idEl || idEl.textContent === '--' || idEl.textContent === 'PENDING APPROVAL') {
    alert('Your ambassador account is pending approval.');
    return;
  }
  
  const link = window.location.origin + '/r.html?id=' + idEl.textContent;
  navigator.clipboard.writeText(link).then(() => {
    // Show Toast
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-6 right-6 bg-surface-elevation border border-primary text-primary px-6 py-3 font-mono text-sm shadow-[0_0_15px_rgba(255,49,49,0.2)] z-50 transition-opacity duration-300';
    toast.innerHTML = '<span class="material-symbols-outlined align-middle mr-2 text-[18px]">check_circle</span>Referral link copied.';
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  });
};
