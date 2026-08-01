import { getDb } from './db.js';

// Configuration
const DESTINATION_URL = 'https://unstop.com/hackathons/omnikon-national-hackathon-2026-omnikon-1715716';
const COOKIE_NAME = 'omni_ref_click';
const COOKIE_DAYS = 30;

// Simple SHA-256 hash function using Web Crypto API
async function hashString(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Cookie Helpers
function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + (days*24*60*60*1000));
  let expires = "expires="+ d.toUTCString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) {
  let nameEQ = name + "=";
  let ca = document.cookie.split(';');
  for(let i=0;i < ca.length;i++) {
    let c = ca[i];
    while (c.charAt(0)==' ') c = c.substring(1,c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
  }
  return null;
}

// Fetch IP for hashing (using a free public API for IP, but NOT storing raw IP)
async function fetchIp() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip || '0.0.0.0';
  } catch (e) {
    return '0.0.0.0';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const ambassadorId = urlParams.get('id');
  
  if (!ambassadorId) {
    // No ID? Just redirect immediately.
    window.location.replace(DESTINATION_URL);
    return;
  }

  try {
    const db = await getDb();
    
    // Check if we've already tracked this ambassador click recently for this user
    const existingCookie = getCookie(COOKIE_NAME);
    const existingLocal = localStorage.getItem('omniReferralVisited');
    
    const isDuplicate = (existingCookie === ambassadorId) || (existingLocal === ambassadorId);
    
    if (!isDuplicate) {
      // 1. Get IP and hash it
      const rawIp = await fetchIp();
      const ipHash = await hashString(rawIp + navigator.userAgent); // Salted with UserAgent
      
      // 2. Track click in Firestore
      const clickData = {
        ambassadorId: ambassadorId,
        timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
        ipHash: ipHash,
        userAgent: navigator.userAgent,
        referrer: document.referrer || 'direct',
        platform: navigator.platform
      };
      
      await db.collection('clicks').add(clickData);
      
      // Also atomically increment the total/unique clicks on the ambassador's user document
      // We need to find the user doc by ambassadorId
      const userSnap = await db.collection('users').where('ambassadorId', '==', ambassadorId).limit(1).get();
      if (!userSnap.empty) {
        const userDoc = userSnap.docs[0];
        await userDoc.ref.update({
          totalClicks: window.firebase.firestore.FieldValue.increment(1),
          uniqueClicks: window.firebase.firestore.FieldValue.increment(1) // Assuming unique since cookie/local prevented duplicate
        });
      }
      
      // 3. Set cookie and local storage to prevent duplicate unique counts
      setCookie(COOKIE_NAME, ambassadorId, COOKIE_DAYS);
      localStorage.setItem('omniReferralVisited', ambassadorId);
    } else {
      // It's a duplicate unique click. We can optionally log it as a non-unique click
      // but let's just increment totalClicks for the ambassador to show engagement
      const userSnap = await db.collection('users').where('ambassadorId', '==', ambassadorId).limit(1).get();
      if (!userSnap.empty) {
        const userDoc = userSnap.docs[0];
        await userDoc.ref.update({
          totalClicks: window.firebase.firestore.FieldValue.increment(1)
        });
      }
    }
  } catch (err) {
    console.error("Tracking error:", err);
    // Even if tracking fails (network error, adblocker blocks firestore), we still redirect.
  }
  
  // Finally, redirect to Unstop
  window.location.replace(DESTINATION_URL);
});
