import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../db';
import { verifyToken, getCookie } from '../utils/auth';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = getCookie(req, 'admin_token');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const decoded = verifyToken(token) as any;
  if (!decoded || !decoded.role || !decoded.role.includes('ADMIN')) return res.status(403).json({ error: 'Forbidden' });

  try {
    const { ambassadors } = req.body; // Array of { name, email, phone, college }
    if (!Array.isArray(ambassadors)) return res.status(400).json({ error: 'Invalid payload' });

    let count = await prisma.ambassador.count();
    const results = [];

    for (const amb of ambassadors) {
      const existing = await prisma.ambassador.findUnique({ where: { email: amb.email } });
      if (!existing) {
        count++;
        const nextNum = count.toString().padStart(4, '0');
        const id = `OMNI-${nextNum}`;
        const tempPassword = crypto.randomBytes(4).toString('hex');
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        await prisma.ambassador.create({
          data: {
            id,
            name: amb.name,
            email: amb.email,
            phone: amb.phone,
            college: amb.college,
            passwordHash
          }
        });
        results.push({ email: amb.email, id, tempPassword, status: 'imported' });
      } else {
        results.push({ email: amb.email, status: 'skipped (exists)' });
      }
    }

    return res.status(200).json({ success: true, results });
  } catch (error: any) {
    console.error('Import Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
