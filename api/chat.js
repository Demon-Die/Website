// api/chat.js
// Vercel Serverless Function to proxy HuggingFace AI Chat requests securely

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid payload: messages array required.' });
  }

  const token = process.env.HF_TOKEN || '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';

  try {
    const payload = {
      model: 'meta-llama/Llama-3.1-8B-Instruct:novita',
      messages
    };

    const resp = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('HuggingFace error response:', errText);
      return res.status(resp.status).json({ error: 'HuggingFace request failed', details: errText });
    }

    const data = await resp.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Chat API Error:', error);
    return res.status(500).json({ error: 'Internal Chat API Error', details: error.message });
  }
}
