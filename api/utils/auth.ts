import { serialize, parse } from 'cookie';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'omnikon_super_secret_key_2026';

export function signToken(payload: any, expiresIn: string = '30d') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function setCookie(res: any, name: string, value: string, options: any = {}) {
  const stringValue = typeof value === 'object' ? 'j:' + JSON.stringify(value) : String(value);
  
  if (typeof options.maxAge === 'number') {
    options.expires = new Date(Date.now() + options.maxAge * 1000);
    options.maxAge /= 1000;
  }

  res.setHeader('Set-Cookie', serialize(name, String(stringValue), options));
}

export function getCookie(req: any, name: string) {
  const cookies = parse(req.headers.cookie || '');
  return cookies[name];
}
