import { 
  getDb, 
  getAllReferrals, 
  updateReferralStatus, 
  getAllCampaigns, 
  createCampaign, 
  updateCampaignStatus, 
  getAnnouncements, 
  createAnnouncement, 
  deleteAnnouncement, 
  getSystemAnalytics,
  getLeaderboard
} from './db.js';

document.addEventListener('DOMContentLoaded', () => {
  const checkAuth = setInterval(async () => {
    if (window.firebase && firebase.auth) {
      clearInterval(checkAuth);
      
      firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
          showAccessDenied();
          return;
        }

        try {
          const db = await getDb();
          const doc = await db.collection('users').doc(user.uid).get();
          
          if (!doc.exists || doc.data().role !== 'admin') {
            showAccessDenied();
            return;
          }

          showAdminUI();
          loadAdminReferrals();
          
        } catch (err) {
          console.error("Admin error:", err);
          showAccessDenied();
        }
      });
    }
  }, 100);
});

function showAccessDenied() {
  const main = document.querySelector('main');
  if (main) main.classList.add('hidden');
  const denied = document.getElementById('admin-access-denied');
  if (denied) {
    denied.classList.remove('hidden');
    denied.classList.add('flex');
  }
}

function showAdminUI() {
  const main = document.querySelector('main');
  if (main) main.classList.remove('hidden');
  const denied = document.getElementById('admin-access-denied');
  if (denied) {
    denied.classList.add('hidden');
    denied.classList.remove('flex');
  }
}

window.switchAdminTab = function(tabName) {
  const tabs = ['referrals', 'ambassadors', 'campaigns', 'announcements', 'analytics'];
  if (!tabs.includes(tabName)) return;
  
  tabs.forEach(t => {
    const el = document.getElementById('tab-' + t);
    const btn = document.getElementById('btn-admin-tab-' + t);
    
    if (el) {
      if (t === tabName) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }

    if (btn) {
      if (t === tabName) {
        btn.classList.add('bg-surface-variant/50', 'border-accent', 'text-on-surface');
        btn.classList.remove('border-transparent', 'text-on-surface-variant');
      } else {
        btn.classList.remove('bg-surface-variant/50', 'border-accent', 'text-on-surface');
        btn.classList.add('border-transparent', 'text-on-surface-variant');
      }
    }
  });
  
  if (tabName === 'referrals') loadAdminReferrals();
  if (tabName === 'ambassadors') loadPendingAmbassadors();
  if (tabName === 'campaigns') loadAdminCampaigns();
  if (tabName === 'announcements') loadAdminAnnouncements();
  if (tabName === 'analytics') loadSystemAnalytics();
};

async function loadAdminReferrals() {
  const tbody = document.getElementById('admin-referrals-table');
  if (!tbody) return;
  
  try {
    const referrals = await getAllReferrals();
    
    if (referrals.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-on-surface-variant">No referrals found in database.</td></tr>';
      return;
    }
    
    tbody.innerHTML = referrals.map(ref => `
      <tr class="border-b border-surface-variant/30 hover:bg-surface-variant/10 transition-colors">
        <td class="py-3 text-xs text-on-surface-variant">${ref.timestamp ? new Date(ref.timestamp.toDate()).toLocaleDateString() : 'Recent'}</td>
        <td class="py-3 font-mono text-xs text-accent">${ref.ambassadorId}</td>
        <td class="py-3 font-mono text-xs">${ref.visitorIp || 'Unknown'}</td>
        <td class="py-3 text-xs text-on-surface-variant">${ref.campaignId || 'Hackathon 2026'}</td>
        <td class="py-3">
          ${ref.status === 'verified' 
            ? '<span class="px-2 py-1 bg-primary/20 text-primary text-[10px] font-bold rounded uppercase">Verified</span>'
            : `<button onclick="verifyReferral('${ref.id}')" class="px-3 py-1 bg-accent/20 border border-accent text-accent hover:bg-accent hover:text-background transition-colors text-[10px] font-bold rounded uppercase">Approve</button>`
          }
        </td>
      </tr>
    `).join('');
    
  } catch (err) {
    console.error("Error loading referrals:", err);
    tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-primary">Error loading data. Check console.</td></tr>';
  }
}

window.verifyReferral = async function(referralId) {
  if (!confirm("Approve this referral and update the ambassador's score?")) return;
  
  try {
    await updateReferralStatus(referralId, 'verified');
    
    const db = await getDb();
    const refDoc = await db.collection('referrals').doc(referralId).get();
    const data = refDoc.data();
    
    if (data && data.ambassadorId) {
      const userSnap = await db.collection('users').where('ambassadorId', '==', data.ambassadorId).limit(1).get();
      if (!userSnap.empty) {
        const userDoc = userSnap.docs[0];
        await userDoc.ref.update({
          verifiedRegistrations: window.firebase.firestore.FieldValue.increment(1)
        });
      }
    }
    
    alert("Referral approved!");
    loadAdminReferrals();
    
  } catch (err) {
    console.error("Error verifying:", err);
    alert("Failed to verify referral. Check console.");
  }
};

async function loadPendingAmbassadors() {
  const tbody = document.getElementById('admin-ambassadors-table');
  if (!tbody) return;
  
  try {
    const db = await getDb();
    const snapshot = await db.collection('users').where('role', '==', 'ambassador').get();
    
    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="6" class="py-4 text-center text-on-surface-variant">No ambassadors registered yet.</td></tr>';
      return;
    }
    
    tbody.innerHTML = snapshot.docs.map(doc => {
      const data = doc.data();
      const isPending = data.status === 'pending';
      return `
      <tr class="border-b border-surface-variant/30 hover:bg-surface-variant/10 transition-colors">
        <td class="py-3 text-xs text-on-surface-variant">${data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : 'Recent'}</td>
        <td class="py-3 font-mono text-xs text-on-surface">${data.name || 'N/A'}</td>
        <td class="py-3 font-mono text-xs">${data.email || 'N/A'}</td>
        <td class="py-3 font-mono text-xs text-primary">${data.ambassadorId || 'PENDING'}</td>
        <td class="py-3 font-mono text-xs ${isPending ? 'text-accent' : 'text-primary'}">${data.status || 'pending'}</td>
        <td class="py-3">
          ${isPending 
            ? `<button onclick="approveAmbassador('${doc.id}')" class="px-3 py-1 bg-accent/20 border border-accent text-accent hover:bg-accent hover:text-background transition-colors text-[10px] font-bold rounded uppercase">Approve</button>`
            : `<span class="text-xs text-on-surface-variant font-mono">Active</span>`}
        </td>
      </tr>
      `;
    }).join('');
    
  } catch (err) {
    console.error("Error loading ambassadors:", err);
    tbody.innerHTML = '<tr><td colspan="6" class="py-4 text-center text-primary">Error loading data.</td></tr>';
  }
}

window.approveAmbassador = async function(userId) {
  if (!confirm("Approve this ambassador and generate their unique ID?")) return;
  
  try {
    const db = await getDb();
    const counterRef = db.collection('counters').doc('ambassadorId');
    const userRef = db.collection('users').doc(userId);
    
    await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let newCount = 1;
      
      if (counterDoc.exists) {
        newCount = (counterDoc.data().count || 0) + 1;
      }
      
      const paddedCount = String(newCount).padStart(4, '0');
      const newId = `OMNI26-AMB-${paddedCount}`;
      
      transaction.set(counterRef, { count: newCount }, { merge: true });
      transaction.update(userRef, { 
        status: 'active',
        ambassadorId: newId 
      });
    });
    
    alert("Ambassador approved successfully!");
    loadPendingAmbassadors();
    
  } catch (err) {
    console.error("Error approving ambassador:", err);
    alert("Transaction failed! Check console.");
  }
};

async function loadAdminCampaigns() {
  const container = document.getElementById('admin-campaigns-list');
  if (!container) return;

  try {
    const campaigns = await getAllCampaigns();
    if (campaigns.length === 0) {
      container.innerHTML = '<p class="text-sm text-on-surface-variant">No campaigns created yet. Use the form above to add one.</p>';
      return;
    }

    container.innerHTML = campaigns.map(c => `
      <div class="p-4 bg-surface-variant/20 border border-surface-variant/40 rounded-lg flex items-center justify-between">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <h4 class="font-bold text-sm text-on-surface">${c.title}</h4>
            <span class="px-2 py-0.5 ${c.status === 'active' ? 'bg-primary/20 text-primary' : 'bg-surface-variant text-on-surface-variant'} text-[10px] font-bold rounded uppercase">${c.status || 'active'}</span>
          </div>
          <p class="text-xs text-on-surface-variant">${c.description || ''}</p>
          <p class="text-[10px] font-mono text-accent mt-1">Target: ${c.target || 10} refs | Multiplier: ${c.multiplier || '1x'} | Reward: ${c.reward || 'Swag'}</p>
        </div>
        <button onclick="toggleCampaign('${c.id}', '${c.status === 'active' ? 'inactive' : 'active'}')" class="px-3 py-1.5 bg-surface-elevation border border-surface-variant text-xs font-mono text-on-surface hover:border-primary transition-colors">
          ${c.status === 'active' ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    `).join('');
  } catch (err) {
    console.error("Error loading campaigns:", err);
  }
}

window.handleCreateCampaign = async function(event) {
  event.preventDefault();
  const getVal = (id) => document.getElementById(id)?.value || '';

  const campaignData = {
    title: getVal('campaign-title'),
    target: parseInt(getVal('campaign-target')) || 10,
    multiplier: getVal('campaign-multiplier') || '1x',
    reward: getVal('campaign-reward'),
    description: getVal('campaign-description'),
    status: 'active'
  };

  try {
    await createCampaign(campaignData);
    alert("Campaign launched successfully!");
    document.getElementById('admin-campaign-form').reset();
    loadAdminCampaigns();
  } catch (err) {
    console.error("Error creating campaign:", err);
    alert("Failed to create campaign: " + err.message);
  }
};

window.toggleCampaign = async function(id, newStatus) {
  try {
    await updateCampaignStatus(id, newStatus);
    loadAdminCampaigns();
  } catch (err) {
    console.error("Error updating campaign status:", err);
    alert("Failed to update status.");
  }
};

async function loadAdminAnnouncements() {
  const container = document.getElementById('admin-announcements-list');
  if (!container) return;

  try {
    const list = await getAnnouncements();
    if (list.length === 0) {
      container.innerHTML = '<p class="text-sm text-on-surface-variant">No announcements posted yet.</p>';
      return;
    }

    container.innerHTML = list.map(a => `
      <div class="p-4 bg-surface-variant/20 border border-surface-variant/40 rounded-lg flex items-center justify-between">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2 py-0.5 bg-accent/20 text-accent font-mono text-[10px] font-bold rounded uppercase">${a.priority || 'INFO'}</span>
            <h4 class="font-bold text-sm text-on-surface">${a.title}</h4>
          </div>
          <p class="text-xs text-on-surface-variant">${a.message}</p>
        </div>
        <button onclick="handleDeleteAnnouncement('${a.id}')" class="px-3 py-1 bg-accent/20 border border-accent text-accent hover:bg-accent hover:text-background text-xs font-mono transition-colors">
          Delete
        </button>
      </div>
    `).join('');
  } catch (err) {
    console.error("Error loading announcements:", err);
  }
}

window.handleCreateAnnouncement = async function(event) {
  event.preventDefault();
  const title = document.getElementById('announce-title')?.value || '';
  const priority = document.getElementById('announce-priority')?.value || 'INFO';
  const message = document.getElementById('announce-message')?.value || '';

  try {
    await createAnnouncement({ title, priority, message });
    alert("Announcement broadcasted!");
    document.getElementById('admin-announce-form').reset();
    loadAdminAnnouncements();
  } catch (err) {
    console.error("Error posting announcement:", err);
    alert("Failed to post announcement.");
  }
};

window.handleDeleteAnnouncement = async function(id) {
  if (!confirm("Delete this announcement?")) return;
  try {
    await deleteAnnouncement(id);
    loadAdminAnnouncements();
  } catch (err) {
    console.error("Error deleting announcement:", err);
  }
};

async function loadSystemAnalytics() {
  const containerStats = document.getElementById('analytics-stats-grid');
  const leaderboardTable = document.getElementById('analytics-leaderboard-table');
  
  try {
    const stats = await getSystemAnalytics();
    if (containerStats) {
      containerStats.innerHTML = `
        <div class="glass-panel p-5 border border-surface-variant/40">
          <p class="text-xs font-mono text-on-surface-variant">TOTAL AMBASSADORS</p>
          <h3 class="text-3xl font-bold text-on-surface mt-1">${stats.totalAmbassadors}</h3>
          <p class="text-[10px] text-accent font-mono mt-1">${stats.pendingAmbassadors} pending approval</p>
        </div>
        <div class="glass-panel p-5 border border-surface-variant/40">
          <p class="text-xs font-mono text-on-surface-variant">TOTAL LINK CLICKS</p>
          <h3 class="text-3xl font-bold text-primary mt-1">${stats.totalClicks}</h3>
          <p class="text-[10px] text-on-surface-variant font-mono mt-1">Global traffic</p>
        </div>
        <div class="glass-panel p-5 border border-surface-variant/40">
          <p class="text-xs font-mono text-on-surface-variant">VERIFIED REGISTRATIONS</p>
          <h3 class="text-3xl font-bold text-accent mt-1">${stats.verifiedReferrals}</h3>
          <p class="text-[10px] text-on-surface-variant font-mono mt-1">${stats.totalReferrals} total referrals</p>
        </div>
        <div class="glass-panel p-5 border border-surface-variant/40">
          <p class="text-xs font-mono text-on-surface-variant">CONVERSION RATE</p>
          <h3 class="text-3xl font-bold text-on-surface mt-1">${stats.conversionRate}%</h3>
          <p class="text-[10px] text-primary font-mono mt-1">Click-to-Registration</p>
        </div>
      `;
    }

    if (leaderboardTable) {
      const leaderboard = await getLeaderboard(10);
      if (leaderboard.length === 0) {
        leaderboardTable.innerHTML = '<tr><td colspan="4" class="py-4 text-center text-on-surface-variant">No active ambassadors on leaderboard yet.</td></tr>';
        return;
      }
      leaderboardTable.innerHTML = leaderboard.map((user, idx) => `
        <tr class="border-b border-surface-variant/30 hover:bg-surface-variant/10 transition-colors">
          <td class="py-3 font-bold font-mono text-xs text-primary">#${idx + 1}</td>
          <td class="py-3 font-mono text-xs text-on-surface">${user.name || 'Anonymous'}</td>
          <td class="py-3 font-mono text-xs text-accent">${user.ambassadorId}</td>
          <td class="py-3 font-bold text-xs">${user.verifiedRegistrations || 0}</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error("Error loading analytics:", err);
  }
}
