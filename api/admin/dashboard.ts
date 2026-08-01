import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../db';
import { verifyToken, getCookie } from '../utils/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = getCookie(req, 'admin_token');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const decoded = verifyToken(token) as any;
  if (!decoded || !decoded.role || !decoded.role.includes('ADMIN')) return res.status(403).json({ error: 'Forbidden' });

  if (req.method === 'GET') {
    try {
      const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } });
      const raw = await prisma.$queryRaw<any[]>`
        SELECT a.id, a.name, a.college, a.email, COUNT(v.id) as "totalClicks", COUNT(DISTINCT v."visitorCookie") as "uniqueVisitors"
        FROM "Ambassador" a
        LEFT JOIN "VisitorLog" v ON a.id = v."ambassadorId"
        GROUP BY a.id, a.name, a.college, a.email
        ORDER BY "uniqueVisitors" DESC, "totalClicks" DESC
      `;

      const ambassadors = raw.map(r => ({
        ...r,
        totalClicks: Number(r.totalClicks),
        uniqueVisitors: Number(r.uniqueVisitors)
      }));

      return res.status(200).json({ settings, ambassadors });
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'POST') {
    const { unstopUrl } = req.body;
    if (unstopUrl) {
      await prisma.settings.update({ where: { id: 'singleton' }, data: { unstopUrl } });
      return res.status(200).json({ success: true });
    }
    return res.status(400).json({ error: 'Missing unstopUrl' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
