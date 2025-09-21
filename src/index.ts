import { Hono } from 'hono';
import { handleMcpManifest } from './mcp/manifest';
import { mcpToolsRouter } from './mcp/tools';
import { cors } from 'hono/cors';
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
};

const app = new Hono<{ Bindings: Env }>();
app.use('*', cors());

app.get('/healthz', (c) => c.text('ok'));
app.get('/mcp/manifest', handleMcpManifest);
app.route('/mcp/tool', mcpToolsRouter);

export default {
  fetch: app.fetch,
};

export { CombatDO, DeckDO, RngDO, SessionDO };
