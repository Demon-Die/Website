import { getDb } from './db.js';

// Configuration
const DESTINATION_URL = 'https://unstop.com/hackathons/omnikon-national-hackathon-2026-omnikon-1715716';
const COOKIE_NAME = 'omni_ref_click';
const COOKIE_DAYS = 30;

// Simple SHA-256 hash function using Web Crypto API
async function hashString(message) {
  try {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return 'anon-' + Math.random().toString(36).substring(2, 10);
  }
}

// Cookie Helpers
function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
  let expires = "expires=" + d.toUTCString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) {
  let nameEQ = name + "=";
  let ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

// Fetch IP with strict 350ms timeout so external API never blocks DB writes
async function fetchIp() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 350);
    const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      return data.ip || '0.0.0.0';
    }
    return '0.0.0.0';
  } catch (e) {
    return '0.0.0.0';
  }
}

async function doRedirect() {
  const urlParams = new URLSearchParams(window.location.search);
  const ambassadorId = urlParams.get('id');
  const campaign = urlParams.get('campaign') || 'Omnikon Hackathon 2026';
  
  if (!ambassadorId) {
    window.location.replace(DESTINATION_URL);
    return;
  }

  // Safety fallback: Redirect after 2.5 seconds max if network hangs completely
  let redirected = false;
  const redirectNow = () => {
    if (!redirected) {
      redirected = true;
      window.location.replace(DESTINATION_URL);
    }
  };

  const fallbackTimer = setTimeout(redirectNow, 2500);

  try {
    const db = await getDb();
    
    const existingCookie = getCookie(COOKIE_NAME);
    const existingLocal = localStorage.getItem('omniReferralVisited');
    const isDuplicate = (existingCookie === ambassadorId) || (existingLocal === ambassadorId);
    
    const rawIp = await fetchIp();
    const ipHash = await hashString(rawIp + (navigator.userAgent || '') + Math.random().toString());
    
    const writes = [];

    // 1. Log click event to clicks collection
    writes.push(
      db.collection('clicks').add({
        ambassadorId: ambassadorId,
        timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
        ipHash: ipHash,
        userAgent: navigator.userAgent || 'Unknown',
        referrer: document.referrer || 'direct',
        platform: navigator.platform || 'Unknown'
      })
    );
    
    // 2. Log referral entry if not duplicate
    if (!isDuplicate) {
      writes.push(
        db.collection('referrals').add({
          ambassadorId: ambassadorId,
          visitorIp: ipHash ? ipHash.substring(0, 12) : 'Anonymous',
          status: 'pending',
          campaignId: campaign,
          timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
        })
      );
      
      setCookie(COOKIE_NAME, ambassadorId, COOKIE_DAYS);
      localStorage.setItem('omniReferralVisited', ambassadorId);
    }

    // Wait for writes to be acknowledged by Firestore (up to 1500ms max)
    await Promise.race([
      Promise.allSettled(writes),
      new Promise(resolve => setTimeout(resolve, 1500))
    ]);

  } catch (err) {
    console.error("Tracking error:", err);
  } finally {
    clearTimeout(fallbackTimer);
    redirectNow();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', doRedirect);
} else {
  doRedirect();
}
