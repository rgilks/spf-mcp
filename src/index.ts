import { Hono } from 'hono';
import { handleMcpManifest } from './mcp/manifest';
import { mcpToolsRouter } from './mcp/tools';
import { authRouter } from './auth/routes';
import { secureCors } from './middleware/cors';
import {
  authMiddleware,
  requireRole,
  requireSessionAccess,
} from './middleware/auth';
import { testAuthMiddleware } from './middleware/test-auth';
import {
  rateLimit,
  diceRateLimit,
  sessionRateLimit,
  combatRateLimit,
} from './middleware/rate-limit';
import {
  validateInput,
  sanitizeInput,
  validateSessionId,
} from './middleware/validation';
import { CombatDO } from './do/CombatDO';
import { DeckDO } from './do/DeckDO';
import { RngDO } from './do/RngDO';
import { SessionDO } from './do/SessionDO';

export type Env = {
  DB: D1Database;
  SPFKV: KVNamespace;
  R2: R2Bucket;
  CombatDO: DurableObjectNamespace;
  DeckDO: DurableObjectNamespace;
  RngDO: DurableObjectNamespace;
  SessionDO: DurableObjectNamespace;
  MCP_SERVER_NAME: string;
  JWT_SECRET: string;
  API_KEY: string;
};

const app = new Hono<{ Bindings: Env }>();

// Apply security middleware
app.use('*', secureCors);
app.use('*', sanitizeInput as any);

// Public endpoints (no auth required)
app.get('/healthz', (c) => c.text('ok'));
app.get('/mcp/manifest', handleMcpManifest);

// Authentication endpoints
app.route('/', authRouter);

// Protected MCP endpoints
// Use test auth in test environment, real auth in production
const authMiddlewareToUse =
  process.env.NODE_ENV === 'test' ? testAuthMiddleware : authMiddleware;

app.use('/mcp/tool/*', authMiddlewareToUse as any);
app.use('/mcp/tool/session.*', sessionRateLimit);
app.use('/mcp/tool/dice.*', diceRateLimit);
app.use('/mcp/tool/combat.*', combatRateLimit);

// Apply role-based access control (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.use('/mcp/tool/session.create', requireRole('gm') as any);
  app.use('/mcp/tool/session.update', requireRole('gm') as any);
  app.use('/mcp/tool/session.end', requireRole('gm') as any);
  app.use('/mcp/tool/combat.*', requireRole('gm') as any);
  app.use('/mcp/tool/*', requireSessionAccess as any);
}

app.route('/mcp/tool', mcpToolsRouter);

// Catch-all route for 404s
app.all('*', (c) => {
  return c.json({ error: 'Not Found' }, 404);
});

export default {
  fetch: app.fetch,
};

export { CombatDO, DeckDO, RngDO, SessionDO };
