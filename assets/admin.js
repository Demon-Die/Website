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

          // Load Admin UI and Data
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
  // Hide the main admin UI
  const main = document.querySelector('main');
  if (main) main.classList.add('hidden');
  // Show the access‑denied overlay
  const denied = document.getElementById('admin-access-denied');
  if (denied) {
    denied.classList.remove('hidden');
    denied.classList.add('flex');
  }
}

// Helper to show the admin UI after auth succeeds
function showAdminUI() {
  const main = document.querySelector('main');
  if (main) main.classList.remove('hidden');
  const denied = document.getElementById('admin-access-denied');
  if (denied) {
    denied.classList.add('hidden');
    denied.classList.remove('flex');
  }
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
          verifiedRegistrations: window.firebase.firestore.FieldValue.increment(1)
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
  const tabs = ['referrals', 'ambassadors'];
  if (!tabs.includes(tabName)) {
    alert("Admin module [" + tabName.toUpperCase() + "] is offline for maintenance.");
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
  
  if (tabName === 'referrals') loadAdminReferrals();
  if (tabName === 'ambassadors') loadPendingAmbassadors();
};

async function loadPendingAmbassadors() {
  const tbody = document.getElementById('admin-ambassadors-table');
  if (!tbody) return;
  
  try {
    const db = await getDb();
    const snapshot = await db.collection('users').where('status', '==', 'pending').get();
    
    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-on-surface-variant">No pending ambassadors.</td></tr>';
      return;
    }
    
    tbody.innerHTML = snapshot.docs.map(doc => {
      const data = doc.data();
      return `
      <tr class="border-b border-surface-variant/30 hover:bg-surface-variant/10 transition-colors">
        <td class="py-3 text-xs text-on-surface-variant">${data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : 'Unknown'}</td>
        <td class="py-3 font-mono text-xs text-on-surface">${data.name || 'N/A'}</td>
        <td class="py-3 font-mono text-xs">${data.email || 'N/A'}</td>
        <td class="py-3 font-mono text-xs text-accent">Pending</td>
        <td class="py-3">
          <button onclick="approveAmbassador('${doc.id}')" class="px-3 py-1 bg-accent/20 border border-accent text-accent hover:bg-accent hover:text-background transition-colors text-[10px] font-bold rounded uppercase">Approve</button>
        </td>
      </tr>
      `;
    }).join('');
    
  } catch (err) {
    console.error("Error loading ambassadors:", err);
    tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-primary">Error loading data.</td></tr>';
  }
}

window.approveAmbassador = async function(userId) {
  if (!confirm("Approve this ambassador and generate their ID?")) return;
  
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
    loadPendingAmbassadors(); // Refresh table
    
  } catch (err) {
    console.error("Error approving ambassador:", err);
    alert("Transaction failed! Check console.");
  }
};
