import { getDb, getAmbassadorData, createAmbassadorProfile, getReferrals } from './db.js';

// Wait for Firebase Auth to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Since auth.js initializes firebase, we can just use the global object
  const checkAuth = setInterval(async () => {
    if (window.firebase && firebase.auth) {
      clearInterval(checkAuth);
      
      firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
          // If not logged in, wait a bit to see if auth.js opens the modal, or redirect
          console.log("No user found. Please log in.");
          document.getElementById('dashboard-content').innerHTML = `
            <div class="glass-panel p-12 text-center">
              <h2 class="text-2xl font-bold text-accent mb-4">Access Denied</h2>
              <p class="text-on-surface-variant">You must be logged in to access the Ambassador Portal.</p>
            </div>
          `;
          return;
        }

        try {
          // Load ambassador data
          let profile = await getAmbassadorData(user.uid);
          
          // If it's a new user, create a profile automatically (for MVP purposes)
          if (!profile) {
            profile = await createAmbassadorProfile(user);
          }
          
          if (profile.role === 'admin') {
            // Suggest redirecting to admin panel
            console.log("User is admin. Can access admin panel.");
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
  if (idEl) idEl.textContent = profile.ambassadorId;
  if (avatarEl && profile.photoURL) avatarEl.src = profile.photoURL;
  
  const rankEl = document.getElementById('stat-rank');
  const refsEl = document.getElementById('stat-refs');
  const clicksEl = document.getElementById('stat-clicks');
  const convEl = document.getElementById('stat-conversion');
  
  // For MVP, calculate rank locally or just show tier
  if (rankEl) rankEl.textContent = profile.tier || 'Bronze';
  if (refsEl) refsEl.textContent = profile.totalReferrals || 0;
  
  // Fake clicks/conversion for now until we build link click tracking
  const fakeClicks = (profile.totalReferrals || 0) * 8 + 12;
  const fakeConv = profile.totalReferrals > 0 ? Math.round((profile.totalReferrals / fakeClicks) * 100) : 0;
  
  if (clicksEl) clicksEl.textContent = fakeClicks;
  if (convEl) convEl.textContent = fakeConv + '%';
}

async function loadReferrals(ambassadorId) {
  const container = document.getElementById('recent-activity-list');
  if (!container) return;
  
  try {
    const referrals = await getReferrals(ambassadorId);
    
    if (referrals.length === 0) {
      container.innerHTML = '<p class="text-sm text-on-surface-variant">No referrals yet. Share your link to get started!</p>';
      return;
    }
    
    container.innerHTML = referrals.map(ref => `
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
    
  } catch (err) {
    console.error("Error loading referrals:", err);
    container.innerHTML = '<p class="text-sm text-accent">Error loading activity.</p>';
  }
}

// Attach to window so HTML inline onclick can access it
window.switchTab = function(tabName) {
  console.log("Switching to tab:", tabName);
  // For MVP, just alert. To be fully implemented.
  if (tabName !== 'overview') {
    alert(tabName.toUpperCase() + " section is under construction for the upcoming campaign.");
  }
};

window.copyReferralLink = function() {
  const idEl = document.getElementById('ambassador-id');
  if (!idEl || idEl.textContent === '--') return;
  
  const link = window.location.origin + '/index.html?ref=' + idEl.textContent;
  navigator.clipboard.writeText(link).then(() => {
    alert("Referral link copied to clipboard!\\n" + link);
  });
};
