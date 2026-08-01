import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../db';
import bcrypt from 'bcrypt';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const adminCount = await prisma.admin.count();
    if (adminCount > 0) return res.status(403).json({ error: 'Admin already exists' });

    const { email, password, name } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Missing fields' });

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await prisma.admin.create({
      data: { email, passwordHash, name, role: 'SUPERADMIN' }
    });

    await prisma.settings.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton' }
    });

    return res.status(201).json({ message: 'Admin setup successful', adminId: admin.id });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
