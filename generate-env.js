const fs = require('fs');
const path = require('path');

// Only include non-secret public client keys
const publicEnvKeys = [
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

// Fallback to local .env if available (for local dev builds)
try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      if (publicEnvKeys.includes(key)) {
        envData[key] = val;
      }
    }
  });
} catch (e) {
  // .env might not exist on Vercel
}

// Fallback default public keys for Firebase & Supabase if env vars are missing
const defaultPublicKeys = {
  FIREBASE_API_KEY: 'AIzaSyC7-bvWLmQe8XB8lgSqa3XMWAfiMI-rvMo',
  FIREBASE_AUTH_DOMAIN: 'omnikon-8e717.firebaseapp.com',
  FIREBASE_PROJECT_ID: 'omnikon-8e717',
  FIREBASE_STORAGE_BUCKET: 'omnikon-8e717.firebasestorage.app',
  FIREBASE_MESSAGING_SENDER_ID: '650489055837',
  FIREBASE_APP_ID: '1:650489055837:web:328b14e8e00ad77722dbb4',
  SUPABASE_URL: 'https://ptdxgxhjycyubixeffei.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0ZHhneGhqeWN5dWJpeGVmZmVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMDcwMzIsImV4cCI6MjA5NjY4MzAzMn0.SzL7KWf-Dq337_S23iuzDIIyX-ufRt5tI1KC63ew8LE'
};

publicEnvKeys.forEach(key => {
  if (process.env[key]) {
    envData[key] = process.env[key];
  } else if (!envData[key] && defaultPublicKeys[key]) {
    envData[key] = defaultPublicKeys[key];
  }
});

const jsContent = `// Auto-generated synchronous client environment config
(function() {
  window.env = window.env || ${JSON.stringify(envData, null, 2)};
  window.envLoaded = true;
  if (typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('envLoaded'));
  }
})();
`;

// Write to both assets/env-config.js and public/assets/env-config.js
[path.join(__dirname, 'assets'), path.join(__dirname, 'public', 'assets')].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(path.join(dir, 'env-config.js'), jsContent);
});

console.log('Successfully generated assets/env-config.js from environment variables.');

// Remove legacy insecure env-public.json files if present
const publicDir = path.join(__dirname, 'public');
['env-public.json', 'env-public 2.json'].forEach(file => {
  const filePath = path.join(publicDir, file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`Deleted legacy file: ${file}`);
  }
});
