import { 
  getDb, 
  getAmbassadorData, 
  createAmbassadorProfile, 
  getReferrals, 
  getClicksCount,
  getActiveCampaigns, 
  getAnnouncements, 
  updateUserProfile 
} from './db.js';

let currentProfile = null;

document.addEventListener('DOMContentLoaded', () => {
  const checkAuth = setInterval(async () => {
    if (window.firebase && firebase.auth) {
      clearInterval(checkAuth);
      
      firebase.auth().onAuthStateChanged(async (user) => {
        const dashboardContent = document.getElementById('dashboard-content');
        const accessDeniedScreen = document.getElementById('access-denied-screen');
        const loadingScreen = document.getElementById('dashboard-loading-screen');
        
        if (loadingScreen) loadingScreen.classList.add('hidden');

        if (!user) {
          if (dashboardContent) dashboardContent.classList.add('hidden');
          if (accessDeniedScreen) {
            accessDeniedScreen.classList.remove('hidden');
            accessDeniedScreen.classList.add('flex');
          }
          return;
        }

        try {
          let profile = await getAmbassadorData(user.uid);
          
          const pendingApp = sessionStorage.getItem('pendingAmbassadorApp');
          let appData = {};
          if (pendingApp) {
            try { appData = JSON.parse(pendingApp); } catch(e){}
            sessionStorage.removeItem('pendingAmbassadorApp');
          }
          
          if (!profile) {
            profile = await createAmbassadorProfile(user, appData);
          }
          
          if (profile.role === 'admin') {
            window.location.replace('/admin.html');
            return;
          }

          if (dashboardContent) dashboardContent.classList.remove('hidden');
          if (accessDeniedScreen) {
            accessDeniedScreen.classList.add('hidden');
            accessDeniedScreen.classList.remove('flex');
          }

          currentProfile = profile;
          await renderDashboard(profile);
          loadReferrals(profile.ambassadorId);
          loadAnnouncements();
          loadCampaigns(profile.ambassadorId);
          loadRewardsAndBadges(profile);
          loadProfileForm(profile);
          
        } catch (err) {
          console.error("Dashboard error:", err);
        }
      });
    }
  }, 100);
});

async function renderDashboard(profile) {
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
      idEl.textContent = profile.ambassadorId || 'PENDING APPROVAL';
    }
  }
  if (avatarEl && profile.photoURL) avatarEl.src = profile.photoURL;
  
  const rankEl = document.getElementById('stat-rank');
  const refsEl = document.getElementById('stat-refs');
  const clicksEl = document.getElementById('stat-clicks');
  const convEl = document.getElementById('stat-conversion');
  
  const verifiedCount = profile.verifiedRegistrations || 0;
  let computedTier = 'Bronze';
  if (verifiedCount >= 50) computedTier = 'Cyber Master';
  else if (verifiedCount >= 30) computedTier = 'Platinum';
  else if (verifiedCount >= 15) computedTier = 'Gold';
  else if (verifiedCount >= 5) computedTier = 'Silver';

  if (rankEl) rankEl.textContent = computedTier;
  if (refsEl) refsEl.textContent = verifiedCount;
  
  let dbClicks = 0;
  let referralsList = [];
  if (profile.ambassadorId) {
    dbClicks = await getClicksCount(profile.ambassadorId);
    referralsList = await getReferrals(profile.ambassadorId);
  }

  const profileClicks = profile.totalClicks || profile.uniqueClicks || 0;
  // Effective total clicks count: max of db clicks, profile stored clicks, referrals count, and verified count
  const effectiveClicks = Math.max(dbClicks, profileClicks, referralsList.length, verifiedCount);
  
  if (clicksEl) clicksEl.textContent = effectiveClicks;
  
  let conversionRate = 0;
  if (effectiveClicks > 0) {
    conversionRate = Math.round((verifiedCount / effectiveClicks) * 100);
  }
  
  if (convEl) convEl.textContent = conversionRate + '%';
}

async function loadAnnouncements() {
  const container = document.getElementById('announcements-feed');
  if (!container) return;
  
  try {
    const list = await getAnnouncements();
    if (!list || list.length === 0) {
      container.innerHTML = `
        <div class="p-4 bg-surface-variant/10 border border-surface-variant/30 rounded-lg text-sm text-on-surface-variant">
          📢 Welcome to the Omnikon Ambassador Portal! Complete referral milestones to earn rewards.
        </div>
      `;
      return;
    }
    
    container.innerHTML = list.map(item => `
      <div class="p-4 bg-surface-variant/20 border border-primary/30 rounded-lg mb-3">
        <div class="flex items-center justify-between mb-1">
          <span class="font-bold text-xs font-mono text-primary uppercase">${item.priority || 'ANNOUNCEMENT'}</span>
          <span class="text-[10px] text-on-surface-variant font-mono">${item.createdAt ? new Date(item.createdAt.toDate()).toLocaleDateString() : 'Today'}</span>
        </div>
        <h4 class="font-bold text-sm text-on-surface mb-1">${item.title}</h4>
        <p class="text-xs text-on-surface-variant leading-relaxed">${item.message}</p>
      </div>
    `).join('');
  } catch (err) {
    console.error("Error loading announcements:", err);
  }
}

async function loadReferrals(ambassadorId) {
  const container = document.getElementById('recent-activity-list');
  const tableBody = document.getElementById('referral-history-table');
  
  if (!ambassadorId) {
    if (container) container.innerHTML = '<p class="text-sm text-on-surface-variant">Your account is pending approval by admin.</p>';
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" class="py-4 text-center text-on-surface-variant">Your account is pending approval.</td></tr>';
    return;
  }
  
  try {
    const referrals = await getReferrals(ambassadorId);
    
    if (referrals.length === 0) {
      if (container) container.innerHTML = '<p class="text-sm text-on-surface-variant">No referrals recorded yet. Share your referral link to earn points!</p>';
      if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" class="py-4 text-center text-on-surface-variant">No referrals recorded yet.</td></tr>';
      return;
    }
    
    if (container) {
      container.innerHTML = referrals.slice(0, 5).map(ref => `
        <div class="flex items-center justify-between p-3 bg-surface-variant/20 border border-surface-variant/50 rounded-lg">
          <div>
            <p class="font-mono text-xs text-on-surface">IP/Visitor: ${ref.visitorIp || 'Anonymous'}</p>
            <p class="text-[10px] text-on-surface-variant">${ref.timestamp ? new Date(ref.timestamp.toDate()).toLocaleString() : 'Just now'}</p>
          </div>
          <div>
            ${ref.status === 'verified' 
              ? '<span class="px-2 py-1 bg-primary/20 text-primary text-[10px] font-bold rounded uppercase">Verified</span>'
              : '<span class="px-2 py-1 bg-accent/20 text-accent text-[10px] font-bold rounded uppercase">Pending</span>'}
          </div>
        </div>
      `).join('');
    }
    
    if (tableBody) {
      tableBody.innerHTML = referrals.map(ref => `
        <tr class="border-b border-surface-variant/30 hover:bg-surface-variant/10 transition-colors">
          <td class="py-3 text-xs text-on-surface-variant">${ref.timestamp ? new Date(ref.timestamp.toDate()).toLocaleDateString() : 'Recent'}</td>
          <td class="py-3 font-mono text-xs">${ref.visitorIp || 'Anonymous'}</td>
          <td class="py-3 text-xs text-on-surface-variant">${ref.campaignId || 'Hackathon 2026'}</td>
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
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" class="py-4 text-center text-accent">Error loading data.</td></tr>';
  }
}

async function loadCampaigns(ambassadorId) {
  const container = document.getElementById('campaigns-list');
  if (!container) return;

  try {
    const campaigns = await getActiveCampaigns();
    if (campaigns.length === 0) {
      container.innerHTML = '<p class="text-sm text-on-surface-variant">No active campaigns right now. Check back soon!</p>';
      return;
    }

    container.innerHTML = campaigns.map(c => {
      const campaignLink = window.location.origin + `/r.html?id=${ambassadorId || 'DEMO'}&campaign=${encodeURIComponent(c.title || c.id)}`;
      return `
        <div class="glass-panel p-6 border border-surface-variant/50 relative overflow-hidden flex flex-col justify-between">
          <div class="mb-4">
            <div class="flex items-center justify-between mb-2">
              <span class="px-2 py-1 bg-primary/20 text-primary font-mono text-[10px] font-bold rounded uppercase">${c.multiplier || '1x Points'}</span>
              <span class="px-2 py-1 bg-accent/20 text-accent font-mono text-[10px] font-bold rounded uppercase">Target: ${c.target || 10}</span>
            </div>
            <h3 class="text-xl font-bold text-on-surface mb-2">${c.title}</h3>
            <p class="text-xs text-on-surface-variant leading-relaxed mb-4">${c.description || 'Drive registrations and earn bonus rewards.'}</p>
            <div class="p-3 bg-background/50 border border-surface-variant/40 rounded text-xs font-mono text-primary flex items-center justify-between">
              <span class="truncate">Reward: ${c.reward || 'Swag Kit & Certificate'}</span>
            </div>
          </div>
          <button onclick="copySpecificCampaignLink('${campaignLink}')" class="w-full py-2 bg-primary/10 hover:bg-primary/20 border border-primary text-primary text-xs font-mono transition-colors glow-hover flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-[16px]">content_copy</span> COPY CAMPAIGN LINK
          </button>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error("Error loading campaigns:", err);
  }
}

function loadRewardsAndBadges(profile) {
  const verified = profile.verifiedRegistrations || 0;
  
  const tiers = [
    { name: 'Bronze', count: 0, reward: 'Ambassador Onboarding & Digital Badge', icon: 'military_tech', color: 'text-amber-600' },
    { name: 'Silver', count: 5, reward: 'Official Certificate of Appreciation & Discord VIP Role', icon: 'workspace_premium', color: 'text-slate-400' },
    { name: 'Gold', count: 15, reward: 'Omnikon Exclusive Swag Kit (T-Shirt, Stickers, Sipper)', icon: 'stars', color: 'text-yellow-400' },
    { name: 'Platinum', count: 30, reward: 'Direct Interview Call for Omnikon Core Team & Paid Internships', icon: 'diamond', color: 'text-cyan-400' },
    { name: 'Cyber Master', count: 50, reward: 'Sponsored Hackathon Pass, Cash Prize Pool & Trophy', icon: 'trophy', color: 'text-primary' }
  ];

  const tierContainer = document.getElementById('rewards-tier-list');
  if (tierContainer) {
    tierContainer.innerHTML = tiers.map(t => {
      const isUnlocked = verified >= t.count;
      const progressPercent = Math.min(100, Math.round((verified / (t.count || 1)) * 100));
      return `
        <div class="glass-panel p-5 border ${isUnlocked ? 'border-primary/60 bg-primary/5' : 'border-surface-variant/30 opacity-75'} flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full border border-surface-variant flex items-center justify-center ${t.color} bg-background/60">
              <span class="material-symbols-outlined text-2xl">${t.icon}</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="font-bold text-base text-on-surface">${t.name} Tier</h4>
                ${isUnlocked 
                  ? '<span class="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded uppercase">Unlocked</span>'
                  : `<span class="px-2 py-0.5 bg-surface-variant text-on-surface-variant text-[10px] font-bold rounded uppercase">${t.count} Verified Required</span>`}
              </div>
              <p class="text-xs text-on-surface-variant mt-1">${t.reward}</p>
            </div>
          </div>
          <div class="w-full md:w-48 flex flex-col gap-1">
            <div class="flex justify-between text-[10px] font-mono text-on-surface-variant">
              <span>Progress</span>
              <span>${verified} / ${t.count}</span>
            </div>
            <div class="w-full h-2 bg-surface-variant/40 rounded-full overflow-hidden">
              <div class="h-full bg-primary transition-all duration-500" style="width: ${progressPercent}%"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

function loadProfileForm(profile) {
  const form = document.getElementById('profile-settings-form');
  if (!form) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  setVal('profile-name', profile.name);
  setVal('profile-email', profile.email);
  setVal('profile-college', profile.college);
  setVal('profile-branch', profile.branch);
  setVal('profile-year', profile.year);
  setVal('profile-phone', profile.phone);
  setVal('profile-bio', profile.bio);
  
  if (profile.socialLinks) {
    setVal('profile-linkedin', profile.socialLinks.linkedin);
    setVal('profile-github', profile.socialLinks.github);
    setVal('profile-discord', profile.socialLinks.discord);
    setVal('profile-x', profile.socialLinks.x);
  }
}

window.saveProfile = async function(event) {
  event.preventDefault();
  if (!currentProfile || !currentProfile.uid) {
    alert("User profile missing. Please log in again.");
    return;
  }

  const getVal = (id) => document.getElementById(id)?.value || '';

  const updatedData = {
    name: getVal('profile-name'),
    college: getVal('profile-college'),
    branch: getVal('profile-branch'),
    year: getVal('profile-year'),
    phone: getVal('profile-phone'),
    bio: getVal('profile-bio'),
    socialLinks: {
      linkedin: getVal('profile-linkedin'),
      github: getVal('profile-github'),
      discord: getVal('profile-discord'),
      x: getVal('profile-x')
    }
  };

  try {
    await updateUserProfile(currentProfile.uid, updatedData);
    showToast("Profile settings saved successfully!");
    
    // Update local state and UI
    currentProfile = { ...currentProfile, ...updatedData };
    renderDashboard(currentProfile);
  } catch (err) {
    console.error("Error updating profile:", err);
    alert("Failed to save profile. " + err.message);
  }
};

window.switchTab = function(tabName) {
  const tabs = ['overview', 'referrals', 'campaigns', 'rewards', 'profile'];
  if (!tabs.includes(tabName)) return;
  
  tabs.forEach(t => {
    const el = document.getElementById('tab-' + t);
    const btn = document.getElementById('btn-tab-' + t);
    
    if (el) {
      if (t === tabName) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }

    if (btn) {
      if (t === tabName) {
        btn.classList.add('bg-primary/20', 'border-primary', 'text-on-surface');
        btn.classList.remove('border-transparent', 'text-on-surface-variant');
      } else {
        btn.classList.remove('bg-primary/20', 'border-primary', 'text-on-surface');
        btn.classList.add('border-transparent', 'text-on-surface-variant');
      }
    }
  });
};

window.copyReferralLink = function() {
  const idEl = document.getElementById('ambassador-id');
  if (!idEl || idEl.textContent === '--' || idEl.textContent === 'PENDING APPROVAL') {
    alert('Your ambassador account is pending admin approval.');
    return;
  }
  
  const link = window.location.origin + '/r.html?id=' + idEl.textContent;
  navigator.clipboard.writeText(link).then(() => {
    showToast('Referral link copied to clipboard!');
  });
};

window.copySpecificCampaignLink = function(link) {
  navigator.clipboard.writeText(link).then(() => {
    showToast('Campaign referral link copied to clipboard!');
  });
};

function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-6 right-6 bg-surface-elevation border border-primary text-primary px-6 py-3 font-mono text-sm shadow-[0_0_15px_rgba(255,49,49,0.25)] z-50 transition-opacity duration-300 flex items-center gap-2';
  toast.innerHTML = `<span class="material-symbols-outlined text-[18px]">check_circle</span>${msg}`;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
