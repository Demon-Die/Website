// api/chat.js
// Vercel Serverless Function: proxies chat completions to the HuggingFace
// inference router. HF_TOKEN stays server-side (process.env) and is never
// shipped to or fetched by the browser.

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.HF_TOKEN;
  if (!token) {
    return res.status(503).json({ error: 'AI service is not configured' });
  }

  try {
    const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body || {})
    });

    const data = await response.json();
    return res.status(response.ok ? 200 : response.status).json(data);
  } catch (e) {
    console.error('Chat proxy error:', e);
    return res.status(502).json({ error: 'AI service unavailable' });
  }
}
