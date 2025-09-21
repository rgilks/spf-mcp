import type { Env } from '../index';

export function validateEnvironment(env: Env): void {
  console.log('Environment validation - checking variables:', {
    JWT_SECRET: env.JWT_SECRET ? '***' : 'missing',
    API_KEY: env.API_KEY ? '***' : 'missing',
    MCP_SERVER_NAME: env.MCP_SERVER_NAME,
  });

  const requiredEnvVars = ['JWT_SECRET', 'API_KEY', 'MCP_SERVER_NAME'];
  const missingVars: string[] = [];

  for (const varName of requiredEnvVars) {
    if (!env[varName as keyof Env]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    console.error(
      `Missing required environment variables: ${missingVars.join(', ')}`,
    );
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}. ` +
        'Please ensure all required secrets are configured in Cloudflare Workers.',
    );
  }

  // Validate JWT_SECRET strength (warn but don't fail)
  if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
    console.warn(
      'JWT_SECRET is shorter than recommended 32 characters. Consider generating a stronger secret.',
    );
  }

  // Validate API_KEY strength (warn but don't fail)
  if (env.API_KEY && env.API_KEY.length < 16) {
    console.warn(
      'API_KEY is shorter than recommended 16 characters. Consider generating a stronger API key.',
    );
  }

  console.log('✅ Environment validation passed');
}
