import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../db';
import bcrypt from 'bcrypt';
import { signToken, setCookie } from '../utils/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { idOrEmail, password } = req.body; // Using ID (OMNI-xxxx) or Email
  if (!idOrEmail || !password) return res.status(400).json({ error: 'Missing credentials' });

  try {
    const ambassador = await prisma.ambassador.findFirst({
      where: {
        OR: [
          { email: idOrEmail },
          { id: idOrEmail.toUpperCase() }
        ]
      }
    });

    if (!ambassador) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, ambassador.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ id: ambassador.id, role: 'AMBASSADOR', email: ambassador.email }, '30d');
    
    setCookie(res, 'ambassador_token', token, {
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return res.status(200).json({ success: true, ambassador: { id: ambassador.id, name: ambassador.name } });
  } catch (error: any) {
    console.error('Ambassador Login Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
