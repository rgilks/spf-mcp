import { cors } from 'hono/cors';
import type { Env } from '../index';

export const secureCors = cors({
  origin: (origin) => {
    // Allow specific origins in production
    const allowedOrigins = [
      'https://cursor.sh',
      'https://cursor.com',
      'https://app.cursor.com',
      'http://localhost:3000',
      'http://localhost:5173',
    ];

    // In development, allow localhost
    if (process.env.NODE_ENV === 'development') {
      return origin?.startsWith('http://localhost')
        ? origin
        : 'https://cursor.sh';
    }

    // In production, only allow specific origins
    return allowedOrigins.includes(origin || '') ? origin : 'https://cursor.sh';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Session-ID', 'X-API-Key'],
  credentials: true,
  maxAge: 86400, // 24 hours
});
