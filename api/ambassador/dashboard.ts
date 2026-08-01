import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../db';
import { verifyToken, getCookie } from '../utils/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = getCookie(req, 'ambassador_token');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const decoded = verifyToken(token) as any;
  if (!decoded || decoded.role !== 'AMBASSADOR') return res.status(403).json({ error: 'Forbidden' });

  try {
    const ambassador = await prisma.ambassador.findUnique({
      where: { id: decoded.id },
      include: { visitorLogs: true }
    });

    if (!ambassador) return res.status(404).json({ error: 'Not found' });

    const totalClicks = ambassador.visitorLogs.length;
    const uniqueCookies = new Set(ambassador.visitorLogs.map(log => log.visitorCookie));
    const uniqueVisitors = uniqueCookies.size;

    return res.status(200).json({
      success: true,
      data: {
        id: ambassador.id,
        name: ambassador.name,
        referralLink: `https://omnikonhub.com/r/${ambassador.id}`,
        analytics: { totalClicks, uniqueVisitors }
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
