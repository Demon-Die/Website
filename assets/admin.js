import { getDb, getAllReferrals, updateReferralStatus } from './db.js';

// Wait for Firebase Auth to be ready
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

          // Load Admin Data
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
  document.body.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-background p-6 text-center">
      <div class="glass-panel p-12 max-w-md w-full border border-primary">
        <span class="material-symbols-outlined text-6xl text-primary mb-4 block">warning</span>
        <h2 class="text-2xl font-bold font-headline-mono text-primary mb-2">ACCESS_DENIED</h2>
        <p class="text-on-surface-variant font-mono text-sm mb-6">Insufficient clearance level. This incident has been logged.</p>
        <a href="/index.html" class="inline-flex items-center gap-2 px-6 py-2 bg-primary/20 border border-primary text-primary hover:bg-primary/30 transition-colors font-mono text-sm uppercase glow-hover">Return to Safe Zone</a>
      </div>
    </div>
  `;
}

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
        <td class="py-3 text-xs text-on-surface-variant">${new Date(ref.timestamp?.toDate()).toLocaleDateString()}</td>
        <td class="py-3 font-mono text-xs text-accent">${ref.ambassadorId}</td>
        <td class="py-3 font-mono text-xs">${ref.visitorIp || 'Unknown'}</td>
        <td class="py-3 text-xs">${ref.campaignId || 'Default'}</td>
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
    
    // In a real app, a Cloud Function should increment the user's score securely.
    // For MVP, we'll increment it from the client (requires appropriate Firestore rules).
    const db = await getDb();
    const refDoc = await db.collection('referrals').doc(referralId).get();
    const data = refDoc.data();
    
    if (data && data.ambassadorId) {
      // Find the user with this ambassadorId
      const userSnap = await db.collection('users').where('ambassadorId', '==', data.ambassadorId).limit(1).get();
      if (!userSnap.empty) {
        const userDoc = userSnap.docs[0];
        await userDoc.ref.update({
          totalReferrals: window.firebase.firestore.FieldValue.increment(1)
        });
      }
    }
    
    alert("Referral approved!");
    loadAdminReferrals(); // Refresh table
    
  } catch (err) {
    console.error("Error verifying:", err);
    alert("Failed to verify referral. Check console.");
  }
};

window.switchAdminTab = function(tabName) {
  if (tabName !== 'referrals') {
    alert("Admin module [" + tabName.toUpperCase() + "] is offline for maintenance.");
  }
};
