import { cors } from 'hono/cors';
import type { Env } from '../index';

export const secureCors = cors({
  origin: (origin) => {
    // Allow specific origins
    const allowedOrigins = [
      'https://cursor.sh',
      'https://www.cursor.sh',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ];

    // Allow requests with no origin (e.g., mobile apps, Postman)
    if (!origin) return origin;

    return allowedOrigins.includes(origin) ? origin : null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Session-ID', 'X-API-Key'],
  credentials: false,
  maxAge: 86400, // 24 hours
});
