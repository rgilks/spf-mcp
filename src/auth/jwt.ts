import { sign, verify } from 'hono/jwt';

export interface JWTPayload {
  sub: string; // user ID
  role: 'gm' | 'player' | 'observer';
  sessionId?: string;
  iat: number;
  exp: number;
}

export class JWTService {
  constructor(private secret: string) {}

  async generateToken(
    payload: Omit<JWTPayload, 'iat' | 'exp'>,
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    return await sign(
      {
        ...payload,
        iat: now,
        exp: now + 24 * 60 * 60, // 24 hours
      },
      this.secret,
    );
  }

  async verifyToken(token: string): Promise<JWTPayload> {
    const payload = await verify(token, this.secret);

    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid token');
    }

    return payload as unknown as JWTPayload;
  }

  async generateApiKey(
    role: 'gm' | 'player' | 'observer',
    sessionId?: string,
  ): Promise<string> {
    const apiKey = `spf_${role}_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    // Store API key in KV with role and session info
    // This would be implemented with proper storage
    return apiKey;
  }
}

export function createJWTService(secret: string): JWTService {
  return new JWTService(secret);
}
