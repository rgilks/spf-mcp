import type { Env } from '../index';

export function validateEnvironment(env: Env): void {
  const requiredEnvVars = ['JWT_SECRET', 'API_KEY', 'MCP_SERVER_NAME'];
  const missingVars: string[] = [];

  for (const varName of requiredEnvVars) {
    if (!env[varName as keyof Env]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}. ` +
        'Please ensure all required secrets are configured in Cloudflare Workers.',
    );
  }

  // Validate JWT_SECRET strength
  if (env.JWT_SECRET.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters long for security. ' +
        'Please generate a stronger secret.',
    );
  }

  // Validate API_KEY strength
  if (env.API_KEY.length < 16) {
    throw new Error(
      'API_KEY must be at least 16 characters long for security. ' +
        'Please generate a stronger API key.',
    );
  }

  console.log('✅ Environment validation passed');
}
