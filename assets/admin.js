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
  getLeaderboard,
  getClicksCount,
  getReferrals,
  getAllAmbassadors
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
          
          // Auto-refresh active admin view every 10 seconds
          if (window.adminPollInterval) clearInterval(window.adminPollInterval);
          window.adminPollInterval = setInterval(() => {
            const activeTab = document.querySelector('[id^="tab-"]:not(.hidden)');
            if (activeTab) {
              const tabName = activeTab.id.replace('tab-', '');
              if (tabName === 'referrals') loadAdminReferrals();
              if (tabName === 'ambassadors') loadPendingAmbassadors();
              if (tabName === 'analytics') loadSystemAnalytics();
            }
          }, 10000);
          
        } catch (err) {
          console.error("Admin error:", err);
          showAccessDenied();
        }
      });
    }
  }, 100);
});

function showAccessDenied() {
  const loading = document.getElementById('admin-loading-screen');
  const content = document.getElementById('admin-content');
  const denied = document.getElementById('admin-access-denied');
  
  if (loading) loading.classList.add('hidden');
  if (content) {
    content.classList.add('hidden');
    content.classList.remove('flex');
  }
  if (denied) {
    denied.classList.remove('hidden');
    denied.classList.add('flex');
  }
}

function showAdminUI() {
  const loading = document.getElementById('admin-loading-screen');
  const content = document.getElementById('admin-content');
  const denied = document.getElementById('admin-access-denied');
  
  if (loading) loading.classList.add('hidden');
  if (denied) {
    denied.classList.add('hidden');
    denied.classList.remove('flex');
  }
  if (content) {
    content.classList.remove('hidden');
    content.classList.add('flex');
  }
}

function showToast(msg, type = 'success') {
  const existing = document.getElementById('admin-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'admin-toast';
  let icon = 'check_circle';
  let borderColor = 'border-primary';
  let textColor = 'text-primary';
  let glow = 'shadow-[0_0_15px_rgba(255,49,49,0.25)]';

  if (type === 'error') {
    icon = 'error';
    borderColor = 'border-red-500';
    textColor = 'text-red-400';
    glow = 'shadow-[0_0_15px_rgba(239,68,68,0.25)]';
  } else if (type === 'info') {
    icon = 'info';
    borderColor = 'border-accent';
    textColor = 'text-accent';
    glow = 'shadow-[0_0_15px_rgba(217,119,6,0.25)]';
  } else if (type === 'warning') {
    icon = 'warning';
    borderColor = 'border-yellow-500';
    textColor = 'text-yellow-400';
    glow = 'shadow-[0_0_15px_rgba(234,179,8,0.25)]';
  }

  toast.className = `fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 bg-surface-elevation border ${borderColor} ${textColor} px-4 sm:px-5 py-3 font-mono text-xs shadow-lg ${glow} z-50 transition-all duration-300 flex items-center justify-center sm:justify-start gap-2 rounded-lg opacity-0 translate-y-2`;
  toast.innerHTML = `<span class="material-symbols-outlined text-[18px]">${icon}</span><span>${msg}</span>`;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.remove('opacity-0', 'translate-y-2');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
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
        try {
          btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } catch (e) {}
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
    const [referrals, ambassadors] = await Promise.all([
      getAllReferrals(),
      getAllAmbassadors()
    ]);
    
    if (referrals.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-on-surface-variant">No referrals found in database.</td></tr>';
      return;
    }
    
    const ambMap = {};
    ambassadors.forEach(a => {
      if (a.ambassadorId) ambMap[a.ambassadorId] = a;
    });

    tbody.innerHTML = referrals.map(ref => {
      const dateStr = ref.timestamp ? new Date(ref.timestamp.toDate()).toLocaleDateString() : 'Recent';
      const amb = ambMap[ref.ambassadorId];
      const ambName = amb ? amb.name : (ref.ambassadorId === 'DEMO' ? 'Demo Account' : 'Unknown Ambassador');

      return `
      <tr class="border-b border-surface-variant/30 hover:bg-surface-variant/10 transition-colors">
        <td class="px-4 py-3 text-xs text-on-surface-variant whitespace-nowrap">${dateStr}</td>
        <td class="px-4 py-3 whitespace-nowrap">
          <button onclick="openAmbassadorDetailModal('${ref.ambassadorId}', 'ambassadorId')" class="text-left group cursor-pointer">
            <div class="font-bold text-xs text-on-surface group-hover:text-accent transition-colors flex items-center gap-1">
              ${ambName}
              <span class="material-symbols-outlined text-[13px] text-accent opacity-60 group-hover:opacity-100 transition-opacity">info</span>
            </div>
            <div class="font-mono text-[11px] text-accent font-semibold">${ref.ambassadorId}</div>
          </button>
        </td>
        <td class="px-4 py-3 font-mono text-xs whitespace-nowrap">${ref.visitorIp || 'Unknown'}</td>
        <td class="px-4 py-3 text-xs text-on-surface-variant whitespace-nowrap">${ref.campaignId || 'Hackathon 2026'}</td>
        <td class="px-4 py-3 text-right whitespace-nowrap">
          ${ref.status === 'verified' 
            ? '<span class="px-2.5 py-1 bg-primary/20 text-primary text-[10px] font-bold rounded uppercase">Verified</span>'
            : `<button onclick="verifyReferral('${ref.id}')" class="px-3 py-1 bg-accent/20 border border-accent text-accent hover:bg-accent hover:text-background transition-colors text-[10px] font-bold rounded uppercase">Approve</button>`
          }
        </td>
      </tr>
      `;
    }).join('');
    
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
          verifiedRegistrations: window.firebase.firestore.FieldValue.increment(1),
          totalClicks: window.firebase.firestore.FieldValue.increment(1)
        });
      }
    }
    
    showToast("Referral approved!");
    loadAdminReferrals();
    
  } catch (err) {
    console.error("Error verifying:", err);
    showToast("Failed to verify referral.", "error");
  }
};

async function loadPendingAmbassadors() {
  const tbody = document.getElementById('admin-ambassadors-table');
  if (!tbody) return;
  
  try {
    const db = await getDb();
    const snapshot = await db.collection('users').where('role', '==', 'ambassador').get();
    const approveAllBtn = document.getElementById('btn-approve-all-ambassadors');
    let pendingCount = 0;

    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="8" class="py-4 text-center text-on-surface-variant">No ambassadors registered yet.</td></tr>';
      if (approveAllBtn) {
        approveAllBtn.disabled = true;
        approveAllBtn.classList.add('opacity-50', 'cursor-not-allowed');
        approveAllBtn.innerHTML = `<span class="material-symbols-outlined text-sm">done_all</span><span>No Pending Ambassadors</span>`;
      }
      return;
    }

    const rows = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const isPending = data.status === 'pending';
      if (isPending) pendingCount++;
      const ambassadorId = data.ambassadorId;
      
      let dbClicks = 0;
      let userRefs = [];
      if (ambassadorId) {
        dbClicks = await getClicksCount(ambassadorId);
        userRefs = await getReferrals(ambassadorId);
      }
      
      const verifiedCount = data.verifiedRegistrations || 0;
      const profileClicks = data.totalClicks || data.uniqueClicks || 0;
      const effectiveClicks = Math.max(dbClicks, profileClicks, userRefs.length, verifiedCount);
      
      const dateStr = data.createdAt 
        ? (data.createdAt.toDate ? new Date(data.createdAt.toDate()).toLocaleDateString() : 'Recent')
        : 'Recent';

      return `
      <tr class="border-b border-surface-variant/30 hover:bg-surface-variant/10 transition-colors">
        <td class="px-4 py-3 text-xs text-on-surface-variant whitespace-nowrap">${dateStr}</td>
        <td class="px-4 py-3 whitespace-nowrap">
          <button onclick="openAmbassadorDetailModal('${doc.id}', 'uid')" class="text-left font-bold font-mono text-xs text-on-surface hover:text-accent transition-colors cursor-pointer flex items-center gap-1 group">
            <span class="group-hover:underline">${data.name || 'N/A'}</span>
            <span class="material-symbols-outlined text-[13px] text-accent opacity-60 group-hover:opacity-100 transition-opacity">info</span>
          </button>
        </td>
        <td class="px-4 py-3 font-mono text-xs text-on-surface-variant whitespace-nowrap">${data.email || 'N/A'}</td>
        <td class="px-4 py-3 font-mono text-xs text-primary whitespace-nowrap font-bold">
          <button onclick="openAmbassadorDetailModal('${doc.id}', 'uid')" class="hover:underline cursor-pointer">
            ${ambassadorId || 'PENDING'}
          </button>
        </td>
        <td class="px-4 py-3 font-mono text-xs text-primary whitespace-nowrap font-bold text-center">${effectiveClicks}</td>
        <td class="px-4 py-3 font-mono text-xs text-accent whitespace-nowrap font-bold text-center">${verifiedCount}</td>
        <td class="px-4 py-3 font-mono text-xs whitespace-nowrap text-center">
          ${isPending 
            ? '<span class="px-2.5 py-1 bg-accent/20 text-accent font-bold rounded uppercase text-[10px]">Pending</span>'
            : '<span class="px-2.5 py-1 bg-primary/20 text-primary font-bold rounded uppercase text-[10px]">Active</span>'}
        </td>
        <td class="px-4 py-3 text-right whitespace-nowrap">
          ${isPending 
            ? `<button onclick="approveAmbassador('${doc.id}')" class="px-3 py-1 bg-accent/20 border border-accent text-accent hover:bg-accent hover:text-background transition-colors text-[10px] font-bold rounded uppercase cursor-pointer">Approve</button>`
            : `<span class="text-[10px] font-mono text-on-surface-variant">Approved</span>`}
        </td>
      </tr>
      `;
    }));

    tbody.innerHTML = rows.join('');
    
    if (approveAllBtn) {
      if (pendingCount > 0) {
        approveAllBtn.disabled = false;
        approveAllBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        approveAllBtn.innerHTML = `<span class="material-symbols-outlined text-sm">done_all</span><span>Approve All Pending (${pendingCount})</span>`;
      } else {
        approveAllBtn.disabled = true;
        approveAllBtn.classList.add('opacity-50', 'cursor-not-allowed');
        approveAllBtn.innerHTML = `<span class="material-symbols-outlined text-sm">done_all</span><span>No Pending Ambassadors</span>`;
      }
    }
  } catch (err) {
    console.error("Error loading ambassadors:", err);
    tbody.innerHTML = '<tr><td colspan="8" class="py-4 text-center text-primary">Error loading data.</td></tr>';
  }
}

window.approveAmbassador = async function(userId) {
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
    
    showToast("Ambassador approved successfully!");
    loadPendingAmbassadors();
    
  } catch (err) {
    console.error("Error approving ambassador:", err);
    showToast("Transaction failed! Check console.", "error");
  }
};

window.approveAllPendingAmbassadors = async function() {
  const btn = document.getElementById('btn-approve-all-ambassadors');
  if (btn) {
    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
  }

  try {
    const db = await getDb();
    const snapshot = await db.collection('users')
      .where('role', '==', 'ambassador')
      .where('status', '==', 'pending')
      .get();

    if (snapshot.empty) {
      showToast("No pending ambassadors to approve.", "info");
      return;
    }

    const pendingDocs = snapshot.docs;
    const countToApprove = pendingDocs.length;
    const counterRef = db.collection('counters').doc('ambassadorId');

    await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let currentCount = counterDoc.exists ? (counterDoc.data().count || 0) : 0;

      pendingDocs.forEach((doc) => {
        currentCount++;
        const paddedCount = String(currentCount).padStart(4, '0');
        const newId = `OMNI26-AMB-${paddedCount}`;

        transaction.update(doc.ref, {
          status: 'active',
          ambassadorId: newId
        });
      });

      transaction.set(counterRef, { count: currentCount }, { merge: true });
    });

    showToast(`Successfully approved all ${countToApprove} pending ambassador${countToApprove > 1 ? 's' : ''}!`);
    await loadPendingAmbassadors();

  } catch (err) {
    console.error("Error approving all pending ambassadors:", err);
    showToast("Failed to approve pending ambassadors: " + err.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
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
      <div class="p-3.5 sm:p-4 bg-surface-variant/20 border border-surface-variant/40 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <h4 class="font-bold text-sm text-on-surface">${c.title}</h4>
            <span class="px-2 py-0.5 ${c.status === 'active' ? 'bg-primary/20 text-primary' : 'bg-surface-variant text-on-surface-variant'} text-[10px] font-bold rounded uppercase">${c.status || 'active'}</span>
          </div>
          <p class="text-xs text-on-surface-variant">${c.description || ''}</p>
          <p class="text-[10px] font-mono text-accent mt-1">Target: ${c.target || 10} refs | Multiplier: ${c.multiplier || '1x'} | Reward: ${c.reward || 'Swag'}</p>
        </div>
        <button onclick="toggleCampaign('${c.id}', '${c.status === 'active' ? 'inactive' : 'active'}')" class="self-start sm:self-auto px-3 py-1.5 bg-surface-elevation border border-surface-variant text-xs font-mono text-on-surface hover:border-primary transition-colors cursor-pointer">
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
    showToast("Campaign launched successfully!");
    document.getElementById('admin-campaign-form').reset();
    loadAdminCampaigns();
  } catch (err) {
    console.error("Error creating campaign:", err);
    showToast("Failed to create campaign: " + err.message, "error");
  }
};

window.toggleCampaign = async function(id, newStatus) {
  try {
    await updateCampaignStatus(id, newStatus);
    loadAdminCampaigns();
  } catch (err) {
    console.error("Error updating campaign status:", err);
    showToast("Failed to update status.", "error");
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
      <div class="p-3.5 sm:p-4 bg-surface-variant/20 border border-surface-variant/40 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2 py-0.5 bg-accent/20 text-accent font-mono text-[10px] font-bold rounded uppercase">${a.priority || 'INFO'}</span>
            <h4 class="font-bold text-sm text-on-surface">${a.title}</h4>
          </div>
          <p class="text-xs text-on-surface-variant">${a.message}</p>
        </div>
        <button onclick="handleDeleteAnnouncement('${a.id}')" class="self-start sm:self-auto px-3 py-1 bg-accent/20 border border-accent text-accent hover:bg-accent hover:text-background text-xs font-mono transition-colors cursor-pointer">
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
    showToast("Announcement broadcasted!");
    document.getElementById('admin-announce-form').reset();
    loadAdminAnnouncements();
  } catch (err) {
    console.error("Error posting announcement:", err);
    showToast("Failed to post announcement.", "error");
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
          <td class="px-3 sm:px-4 py-2.5 sm:py-3 font-bold font-mono text-xs text-primary">#${idx + 1}</td>
          <td class="px-3 sm:px-4 py-2.5 sm:py-3 font-mono text-xs">
            <button onclick="openAmbassadorDetailModal('${user.ambassadorId}', 'ambassadorId')" class="font-bold text-on-surface hover:text-accent underline transition-colors text-left cursor-pointer">
              ${user.name || 'Anonymous'}
            </button>
          </td>
          <td class="px-3 sm:px-4 py-2.5 sm:py-3 font-mono text-xs text-accent">${user.ambassadorId}</td>
          <td class="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-xs text-right">${user.verifiedRegistrations || 0}</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error("Error loading analytics:", err);
  }
}

// ── Ambassador Details Modal ──────────────────────────────
function formatYearText(y) {
  if (!y) return 'Not Provided';
  const map = { '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year', '5': '5th Year / Other' };
  return map[y] || y;
}

window.openAmbassadorDetailModal = async function(identifier, type = 'ambassadorId') {
  const modal = document.getElementById('ambassador-detail-modal');
  const modalBody = document.getElementById('ambassador-modal-body');
  if (!modal || !modalBody) return;

  modalBody.innerHTML = '<div class="py-12 text-center text-accent font-mono animate-pulse">LOADING_AMBASSADOR_DOSSIER...</div>';
  
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => {
    modal.classList.remove('opacity-0');
    const inner = modal.querySelector('div');
    if (inner) inner.classList.remove('scale-95');
  }, 10);

  try {
    const db = await getDb();
    let user = null;

    if (type === 'uid') {
      const doc = await db.collection('users').doc(identifier).get();
      if (doc.exists) user = { uid: doc.id, id: doc.id, ...doc.data() };
    } else if (type === 'ambassadorId') {
      const snap = await db.collection('users').where('ambassadorId', '==', identifier).limit(1).get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        user = { uid: doc.id, id: doc.id, ...doc.data() };
      }
    }

    if (!user) {
      if (identifier === 'DEMO') {
        user = {
          name: 'Demo Account',
          email: 'demo@omnikonhub.com',
          ambassadorId: 'DEMO',
          college: 'Omnikon Sandbox University',
          branch: 'Computer Science & AI',
          year: '3',
          phone: '+91 9999999999',
          bio: 'Test account for demonstration and link testing.',
          socialLinks: { linkedin: 'https://linkedin.com', github: 'https://github.com', discord: 'demo#0000', x: '' },
          status: 'active',
          verifiedRegistrations: 0,
          totalClicks: 1
        };
      } else {
        modalBody.innerHTML = `<div class="py-8 text-center text-primary font-mono">Ambassador profile not found for ID: ${identifier}</div>`;
        return;
      }
    }

    renderAmbassadorDossier(user);
  } catch (err) {
    console.error("Error opening ambassador modal:", err);
    modalBody.innerHTML = `<div class="py-8 text-center text-primary font-mono">Error loading details: ${err.message}</div>`;
  }
};

window.closeAmbassadorDetailModal = function() {
  const modal = document.getElementById('ambassador-detail-modal');
  if (!modal) return;
  modal.classList.add('opacity-0');
  const inner = modal.querySelector('div');
  if (inner) inner.classList.add('scale-95');
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }, 300);
};

function renderAmbassadorDossier(user) {
  const modalBody = document.getElementById('ambassador-modal-body');
  if (!modalBody) return;

  const isPending = user.status === 'pending';
  const yearText = formatYearText(user.year);
  const social = user.socialLinks || {};

  const verified = user.verifiedRegistrations || 0;
  let tier = 'Bronze';
  if (verified >= 50) tier = 'Cyber Master';
  else if (verified >= 30) tier = 'Platinum';
  else if (verified >= 15) tier = 'Gold';
  else if (verified >= 5) tier = 'Silver';

  modalBody.innerHTML = `
    <!-- Top Header Card -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 bg-surface-variant/20 border border-surface-variant/40 rounded-lg">
      <div class="flex items-center gap-3 sm:gap-4">
        <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/20 border border-primary text-primary flex items-center justify-center font-bold text-lg sm:text-xl font-mono shrink-0 overflow-hidden">
          ${user.photoURL ? `<img src="${user.photoURL}" class="w-full h-full object-cover">` : (user.name ? user.name.charAt(0).toUpperCase() : 'A')}
        </div>
        <div>
          <h3 class="text-base sm:text-xl font-bold text-on-surface">${user.name || 'Anonymous Ambassador'}</h3>
          <p class="text-xs font-mono text-on-surface-variant">${user.email || 'No email provided'}</p>
          <div class="flex items-center gap-2 mt-1">
            <span class="px-2 py-0.5 bg-primary/20 text-primary font-mono text-[10px] font-bold rounded uppercase">${user.ambassadorId || 'PENDING ID'}</span>
            ${isPending 
              ? '<span class="px-2 py-0.5 bg-accent/20 text-accent font-mono text-[10px] font-bold rounded uppercase">Pending Approval</span>' 
              : '<span class="px-2 py-0.5 bg-green-500/20 text-green-400 font-mono text-[10px] font-bold rounded uppercase">Active Ambassador</span>'}
          </div>
        </div>
      </div>
      
      ${isPending ? `
        <button onclick="approveAmbassadorFromModal('${user.uid}')" class="w-full sm:w-auto px-4 py-2 bg-accent/20 border border-accent text-accent hover:bg-accent hover:text-background transition-colors text-xs font-bold font-mono rounded uppercase glow-hover cursor-pointer text-center">
          Approve Ambassador
        </button>
      ` : ''}
    </div>

    <!-- Academic & Personal Details Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="p-3.5 sm:p-4 bg-surface-elevation border border-surface-variant/30 rounded-lg">
        <h4 class="text-xs font-mono text-accent uppercase font-bold mb-3 flex items-center gap-1.5">
          <span class="material-symbols-outlined text-sm">school</span> ACADEMIC DETAILS
        </h4>
        <div class="space-y-2 text-xs">
          <div>
            <span class="text-on-surface-variant font-mono">College / University:</span>
            <p class="font-semibold text-on-surface text-xs sm:text-sm">${user.college || 'Not Provided'}</p>
          </div>
          <div>
            <span class="text-on-surface-variant font-mono">Branch / Major:</span>
            <p class="font-semibold text-on-surface text-xs sm:text-sm">${user.branch || 'Not Provided'}</p>
          </div>
          <div>
            <span class="text-on-surface-variant font-mono">Year of Study:</span>
            <p class="font-semibold text-on-surface text-xs sm:text-sm">${yearText}</p>
          </div>
        </div>
      </div>

      <div class="p-3.5 sm:p-4 bg-surface-elevation border border-surface-variant/30 rounded-lg">
        <h4 class="text-xs font-mono text-accent uppercase font-bold mb-3 flex items-center gap-1.5">
          <span class="material-symbols-outlined text-sm">contact_phone</span> CONTACT & SOCIALS
        </h4>
        <div class="space-y-2 text-xs">
          <div>
            <span class="text-on-surface-variant font-mono">Phone / WhatsApp:</span>
            <p class="font-semibold text-on-surface text-xs sm:text-sm">${user.phone || 'Not Provided'}</p>
          </div>
          <div>
            <span class="text-on-surface-variant font-mono">Social Profiles:</span>
            <div class="flex flex-wrap gap-2 mt-1">
              ${social.linkedin ? `<a href="${social.linkedin}" target="_blank" class="px-2 py-1 bg-surface-variant/30 hover:bg-primary/20 text-on-surface hover:text-primary rounded text-[11px] font-mono transition-colors flex items-center gap-1">LinkedIn <span class="material-symbols-outlined text-[12px]">open_in_new</span></a>` : ''}
              ${social.github ? `<a href="${social.github.startsWith('http') ? social.github : 'https://github.com/' + social.github}" target="_blank" class="px-2 py-1 bg-surface-variant/30 hover:bg-primary/20 text-on-surface hover:text-primary rounded text-[11px] font-mono transition-colors flex items-center gap-1">GitHub <span class="material-symbols-outlined text-[12px]">open_in_new</span></a>` : ''}
              ${social.discord ? `<span class="px-2 py-1 bg-surface-variant/30 text-on-surface rounded text-[11px] font-mono">Discord: ${social.discord}</span>` : ''}
              ${social.x ? `<a href="${social.x}" target="_blank" class="px-2 py-1 bg-surface-variant/30 hover:bg-primary/20 text-on-surface hover:text-primary rounded text-[11px] font-mono transition-colors flex items-center gap-1">X / Twitter <span class="material-symbols-outlined text-[12px]">open_in_new</span></a>` : ''}
              ${!social.linkedin && !social.github && !social.discord && !social.x ? '<p class="text-on-surface-variant">No social links provided</p>' : ''}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Application Bio / Statement -->
    <div class="p-3.5 sm:p-4 bg-surface-elevation border border-surface-variant/30 rounded-lg">
      <h4 class="text-xs font-mono text-accent uppercase font-bold mb-2 flex items-center gap-1.5">
        <span class="material-symbols-outlined text-sm">description</span> APPLICATION BIO / PITCH
      </h4>
      <p class="text-xs text-on-surface leading-relaxed italic bg-surface-variant/10 p-3 rounded border border-surface-variant/20">
        "${user.bio || 'No application statement or bio provided.'}"
      </p>
    </div>

    <!-- Performance Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 p-3.5 sm:p-4 bg-surface-variant/20 border border-primary/30 rounded-lg text-center">
      <div class="p-2 sm:p-0">
        <p class="text-[10px] font-mono text-on-surface-variant">TOTAL CLICKS</p>
        <p class="text-lg sm:text-xl font-bold font-mono text-primary">${user.totalClicks || user.uniqueClicks || 0}</p>
      </div>
      <div class="p-2 sm:p-0 border-t border-b sm:border-t-0 sm:border-b-0 sm:border-l sm:border-r border-surface-variant/30">
        <p class="text-[10px] font-mono text-on-surface-variant">VERIFIED REFS</p>
        <p class="text-lg sm:text-xl font-bold font-mono text-accent">${verified}</p>
      </div>
      <div class="p-2 sm:p-0">
        <p class="text-[10px] font-mono text-on-surface-variant">CURRENT TIER</p>
        <p class="text-lg sm:text-xl font-bold font-mono text-on-surface">${tier}</p>
      </div>
    </div>
  `;
}

window.approveAmbassadorFromModal = async function(uid) {
  closeAmbassadorDetailModal();
  await window.approveAmbassador(uid);
};
