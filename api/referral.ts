import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './db';
import crypto from 'crypto';
import { serialize, parse } from 'cookie';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.redirect(302, '/');

  try {
    const ambassador = await prisma.ambassador.findUnique({ where: { id } });
    if (!ambassador) return res.redirect(302, '/');

    const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } });
    const redirectUrl = settings?.unstopUrl || 'https://omnikonhub.com';

    const cookies = parse(req.headers.cookie || '');
    let visitorCookie = cookies['omnikon_vid'];

    if (!visitorCookie) {
      visitorCookie = crypto.randomUUID();
      res.setHeader('Set-Cookie', serialize('omnikon_vid', visitorCookie, {
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      }));
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ipStr = Array.isArray(ip) ? ip[0] : ip;
    const ipHash = crypto.createHash('sha256').update(ipStr).digest('hex');

    const existingLog = await prisma.visitorLog.findFirst({
      where: { ambassadorId: id, OR: [{ visitorCookie }, { ipHash }] }
    });

    if (!existingLog) {
      await prisma.visitorLog.create({
        data: {
          ambassadorId: id,
          visitorCookie,
          ipHash,
          userAgent: req.headers['user-agent'] || 'unknown',
          country: (req.headers['x-vercel-ip-country'] as string) || 'unknown',
          referrer: (req.headers.referer as string) || 'direct'
        }
      });
    }

    return res.redirect(302, redirectUrl);
  } catch (error) {
    return res.redirect(302, '/');
  }
}
