// api/blog-insert.js
// Vercel Serverless Function: publishes a blog post to Supabase.
// ADMIN_SECRET is validated server-side (process.env) — it never exists
// in any file served to the browser.

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

  const { secret, blog } = req.body || {};
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || !secret || secret !== adminSecret) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(503).json({ error: 'Blog service is not configured' });
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/blogs`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(blog || {})
    });

    const data = await response.json();
    if (!response.ok) {
      if (response.status === 409 || (data && data.code === '23505')) {
        return res.status(409).json({ error: 'This article has already been added to the database.' });
      }
      return res.status(response.status).json(data);
    }
    return res.status(200).json(data[0] || data);
  } catch (e) {
    console.error('Blog insert error:', e);
    return res.status(502).json({ error: 'Blog service unavailable' });
  }
}
