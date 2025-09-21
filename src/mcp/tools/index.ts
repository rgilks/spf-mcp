import { Hono } from 'hono';
import { diceRollHandler } from './dice';

export const mcpToolsRouter = new Hono();

mcpToolsRouter.post('/dice.roll', diceRollHandler);
// Later: session.create, actor.upsert, combat.deal, etc.
