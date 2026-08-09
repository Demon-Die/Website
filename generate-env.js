const fs = require('fs');
const path = require('path');

// Only PUBLIC-BY-DESIGN identifiers are emitted to the client.
// These are required by the browser SDKs (Firebase auth, Supabase reads) and are
// NOT secrets: Firebase web API keys and Supabase anon keys are public by design,
// access control is enforced by Firestore rules / Supabase RLS.
//
// NEVER add secrets here (HF_TOKEN, ADMIN_SECRET, GIT_OMNIKON_ALL, ...).
// Secrets live only in .env / Vercel env vars and are consumed server-side by
// the Vercel functions in api/ (api/chat.js, api/blog-insert.js).
const envKeys = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY'
];

const envData = {};

// Read from local .env (for local builds)
try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      if (envKeys.includes(key) && val) {
        envData[key] = val;
      }
    }
  });
} catch (e) {
  // .env might not exist on Vercel, which is fine
}

// Override with process.env (Vercel Environment Variables)
envKeys.forEach(key => {
  if (process.env[key]) {
    envData[key] = process.env[key];
  }
});

// Write to public/env-public.json so Vite includes it in the dist folder
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

fs.writeFileSync(path.join(publicDir, 'env-public.json'), JSON.stringify(envData, null, 2));
console.log('Generated public/env-public.json (public config only, no secrets).');
