import { getDb } from './db.js';

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  
  if (refCode) {
    // Store the referral code in localStorage so it persists across page reloads/navigation
    // within the same session before they actually register
    localStorage.setItem('omnikon_referral_code', refCode);
    console.log("Referral code detected:", refCode);
    
    // For MVP, we will immediately log a "pending" referral when someone lands on the page with a ref link.
    // In a real application, you'd log a "click" event here, and log a "referral" only when they submit a registration form.
    try {
      const db = await getDb();
      
      // Prevent duplicate logging for the same visitor (using localStorage as a primitive session tracker)
      if (!sessionStorage.getItem('logged_referral_' + refCode)) {
        await db.collection('referrals').add({
          ambassadorId: refCode.toUpperCase(),
          visitorIp: 'Hidden', // Can't easily get IP client-side without an external API
          status: 'pending',
          campaignId: 'Hackathon 2026',
          timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
        });
        sessionStorage.setItem('logged_referral_' + refCode, 'true');
        console.log("Referral click logged to database.");
      }
    } catch (err) {
      console.error("Error logging referral:", err);
    }
  }
});
