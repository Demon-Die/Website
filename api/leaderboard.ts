import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './db';

let cachedLeaderboard: any = null;
let cacheTime = 0;
const CACHE_TTL = 1000 * 60 * 5;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (cachedLeaderboard && Date.now() - cacheTime < CACHE_TTL) {
    return res.status(200).json(cachedLeaderboard);
  }

  try {
    const result = await prisma.$queryRaw<any[]>`
      SELECT a.id, a.name, a.college, COUNT(v.id) as "totalClicks", COUNT(DISTINCT v."visitorCookie") as "uniqueVisitors"
      FROM "Ambassador" a
      LEFT JOIN "VisitorLog" v ON a.id = v."ambassadorId"
      GROUP BY a.id, a.name, a.college
      ORDER BY "uniqueVisitors" DESC, "totalClicks" DESC
    `;

    const formatted = result.map((r, index) => ({
      rank: index + 1,
      id: r.id,
      name: r.name,
      college: r.college,
      totalClicks: Number(r.totalClicks),
      uniqueVisitors: Number(r.uniqueVisitors)
    }));

    cachedLeaderboard = { leaderboard: formatted };
    cacheTime = Date.now();

    return res.status(200).json(cachedLeaderboard);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
