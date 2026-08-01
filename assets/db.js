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

// ── Referral System ──────────────────────────────────────
export async function getReferrals(ambassadorId) {
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
  const snapshot = await db.collection('campaigns').where('status', '==', 'active').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ── Leaderboard ──────────────────────────────────────────
export async function getLeaderboard(limit = 100) {
  const db = await getDb();
  // Fetch only active ambassadors
  const snapshot = await db.collection('users')
    .where('role', '==', 'ambassador')
    .where('status', '==', 'active')
    .orderBy('verifiedRegistrations', 'desc')
    .limit(limit)
    .get();
    
  let data = snapshot.docs.map(doc => doc.data());
  
  // Sort ties manually in memory
  data.sort((a, b) => {
    if (b.verifiedRegistrations !== a.verifiedRegistrations) {
      return (b.verifiedRegistrations || 0) - (a.verifiedRegistrations || 0);
    }
    if (b.uniqueClicks !== a.uniqueClicks) {
      return (b.uniqueClicks || 0) - (a.uniqueClicks || 0);
    }
    const aTime = a.createdAt ? a.createdAt.toMillis() : Date.now();
    const bTime = b.createdAt ? b.createdAt.toMillis() : Date.now();
    return aTime - bTime; // Oldest first
  });
  
  return data;
}
