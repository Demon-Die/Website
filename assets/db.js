// Firebase Firestore Initialization and Database Helpers

export async function getDb() {
  if (!window.firebase) throw new Error("Firebase SDK not loaded");
  
  // Wait for environment variables to load
  if (!window.envLoaded) {
    await new Promise(resolve => window.addEventListener('envLoaded', resolve, { once: true }));
  }

  // Ensure Firebase app is initialized (auth.js normally does this, but we check just in case)
  if (!firebase.apps.length) {
    if (!window.env?.FIREBASE_API_KEY) {
      console.warn('Firebase configuration missing in environment.');
      throw new Error('Firebase config missing');
    }
    const firebaseConfig = {
      apiKey: window.env.FIREBASE_API_KEY,
      authDomain: window.env.FIREBASE_AUTH_DOMAIN,
      projectId: window.env.FIREBASE_PROJECT_ID,
      storageBucket: window.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: window.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: window.env.FIREBASE_APP_ID
    };
    firebase.initializeApp(firebaseConfig);
  }
  
  return firebase.firestore();
}

// ── Role Management ──────────────────────────────────────
export async function getUserRole(uid) {
  const db = await getDb();
  try {
    const doc = await db.collection('users').doc(uid).get();
    if (doc.exists) {
      return doc.data().role || 'user';
    }
    return 'user';
  } catch (err) {
    console.error("Error fetching user role:", err);
    return 'user';
  }
}

// ── Ambassador Helpers ───────────────────────────────────
export async function getAmbassadorData(uid) {
  const db = await getDb();
  try {
    const doc = await db.collection('users').doc(uid).get();
    if (doc.exists) {
      return doc.data();
    }
    return null;
  } catch (err) {
    console.error("Error fetching ambassador data:", err);
    return null;
  }
}

export async function createAmbassadorProfile(user, additionalData = {}) {
  const db = await getDb();
  const userData = {
    uid: user.uid,
    name: user.displayName || '',
    email: user.email || '',
    photoURL: user.photoURL || '',
    role: 'ambassador',
    status: 'pending',
    ambassadorId: null, // Will be generated upon admin approval
    college: '',
    branch: '',
    year: '',
    phone: '',
    bio: '',
    socialLinks: { linkedin: '', github: '', discord: '', x: '' },
    badges: [],
    totalReferrals: 0,
    verifiedRegistrations: 0,
    totalClicks: 0,
    uniqueClicks: 0,
    tier: 'Bronze',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    ...additionalData
  };
  
  await db.collection('users').doc(user.uid).set(userData, { merge: true });
  return userData;
}

export async function updateUserProfile(uid, profileData) {
  const db = await getDb();
  await db.collection('users').doc(uid).update({
    ...profileData,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ── Referral System ──────────────────────────────────────
export async function getReferrals(ambassadorId) {
  if (!ambassadorId) return [];
  const db = await getDb();
  const snapshot = await db.collection('referrals')
    .where('ambassadorId', '==', ambassadorId)
    .orderBy('timestamp', 'desc')
    .get();
    
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getAllReferrals() {
  const db = await getDb();
  const snapshot = await db.collection('referrals').orderBy('timestamp', 'desc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function updateReferralStatus(referralId, status) {
  const db = await getDb();
  await db.collection('referrals').doc(referralId).update({ status });
}

// ── Campaigns ────────────────────────────────────────────
export async function getActiveCampaigns() {
  const db = await getDb();
  try {
    const snapshot = await db.collection('campaigns').where('status', '==', 'active').get();
    let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (data.length === 0) {
      // Fallback default campaign if DB is empty
      data = [{
        id: 'default-hackathon-2026',
        title: 'Omnikon National Tech Hackathon 2026',
        description: 'Empower student developers by referring participants to the premier national hackathon.',
        target: 20,
        reward: 'Exclusive Swag & Certificate',
        status: 'active',
        multiplier: '1.5x'
      }];
    }
    return data;
  } catch (e) {
    return [{
      id: 'default-hackathon-2026',
      title: 'Omnikon National Tech Hackathon 2026',
      description: 'Empower student developers by referring participants to the premier national hackathon.',
      target: 20,
      reward: 'Exclusive Swag & Certificate',
      status: 'active',
      multiplier: '1.5x'
    }];
  }
}

export async function getAllCampaigns() {
  const db = await getDb();
  const snapshot = await db.collection('campaigns').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function createCampaign(campaignData) {
  const db = await getDb();
  const docRef = await db.collection('campaigns').add({
    ...campaignData,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return docRef.id;
}

export async function updateCampaignStatus(campaignId, status) {
  const db = await getDb();
  await db.collection('campaigns').doc(campaignId).update({ status });
}

// ── Announcements ────────────────────────────────────────
export async function getAnnouncements() {
  const db = await getDb();
  try {
    const snapshot = await db.collection('announcements').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    return [];
  }
}

export async function createAnnouncement(announcementData) {
  const db = await getDb();
  const docRef = await db.collection('announcements').add({
    ...announcementData,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return docRef.id;
}

export async function deleteAnnouncement(announcementId) {
  const db = await getDb();
  await db.collection('announcements').doc(announcementId).delete();
}

// ── System Analytics ─────────────────────────────────────
export async function getSystemAnalytics() {
  const db = await getDb();
  try {
    const usersSnap = await db.collection('users').get();
    const referralsSnap = await db.collection('referrals').get();
    const clicksSnap = await db.collection('clicks').get();

    const totalAmbassadors = usersSnap.docs.filter(doc => doc.data().role === 'ambassador').length;
    const pendingAmbassadors = usersSnap.docs.filter(doc => doc.data().role === 'ambassador' && doc.data().status === 'pending').length;
    const totalClicks = clicksSnap.size;
    const totalReferrals = referralsSnap.size;
    const verifiedReferrals = referralsSnap.docs.filter(doc => doc.data().status === 'verified').length;
    const conversionRate = totalClicks > 0 ? ((verifiedReferrals / totalClicks) * 100).toFixed(1) : '0.0';

    return {
      totalAmbassadors,
      pendingAmbassadors,
      totalClicks,
      totalReferrals,
      verifiedReferrals,
      conversionRate
    };
  } catch (e) {
    console.error("Error computing analytics:", e);
    return {
      totalAmbassadors: 0,
      pendingAmbassadors: 0,
      totalClicks: 0,
      totalReferrals: 0,
      verifiedReferrals: 0,
      conversionRate: '0.0'
    };
  }
}

// ── Leaderboard ──────────────────────────────────────────
export async function getLeaderboard(limit = 100) {
  const db = await getDb();
  const snapshot = await db.collection('users')
    .where('role', '==', 'ambassador')
    .where('status', '==', 'active')
    .orderBy('verifiedRegistrations', 'desc')
    .limit(limit)
    .get();
    
  let data = snapshot.docs.map(doc => doc.data());
  
  data.sort((a, b) => {
    if (b.verifiedRegistrations !== a.verifiedRegistrations) {
      return (b.verifiedRegistrations || 0) - (a.verifiedRegistrations || 0);
    }
    if (b.uniqueClicks !== a.uniqueClicks) {
      return (b.uniqueClicks || 0) - (a.uniqueClicks || 0);
    }
    const aTime = a.createdAt ? a.createdAt.toMillis() : Date.now();
    const bTime = b.createdAt ? b.createdAt.toMillis() : Date.now();
    return aTime - bTime;
  });
  
  return data;
}
