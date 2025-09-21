import { Hono } from 'hono';
import { diceRollHandler, diceRollWithConvictionHandler } from './dice';
import {
  sessionCreateHandler,
  sessionLoadHandler,
  sessionUpdateHandler,
  sessionEndHandler,
} from './session';
import {
  actorUpsertHandler,
  actorPatchHandler,
  actorMoveHandler,
  actorApplyEffectHandler,
  actorRollTraitHandler,
  actorsListHandler,
  actorSpendBennyHandler,
  actorMaintainConvictionHandler,
} from './actor';
import {
  combatStartHandler,
  combatDealHandler,
  combatHoldHandler,
  combatInterruptHandler,
  combatAdvanceTurnHandler,
  combatEndRoundHandler,
  combatStateHandler,
} from './combat';
import {
  combatSetMultiActionHandler,
  combatCreateExtrasGroupHandler,
  combatClearMultiActionHandler,
  combatGetStateHandler,
} from './combat-enhancements';
import {
  applyDamageHandler,
  soakRollHandler,
  castPowerHandler,
  templateAreaHandler,
} from './rules';
import {
  supportTestHandler,
  testOfWillHandler,
  commonEdgesHandler,
} from './support';
import {
  journalAddEntryHandler,
  journalGetEntriesHandler,
  journalAddCampaignNoteHandler,
  journalGetCampaignNotesHandler,
  journalSearchHandler,
  journalExportHandler,
} from './journal';

export const mcpToolsRouter = new Hono();

// Dice tools
mcpToolsRouter.post('/dice.roll', diceRollHandler);
mcpToolsRouter.post('/dice.rollWithConviction', diceRollWithConvictionHandler);

// Session tools
mcpToolsRouter.post('/session.create', sessionCreateHandler);
mcpToolsRouter.get('/session/:sessionId', sessionLoadHandler);
mcpToolsRouter.post('/session.update', sessionUpdateHandler);
mcpToolsRouter.post('/session.end', sessionEndHandler);

// Actor tools
mcpToolsRouter.post('/actor.upsert', actorUpsertHandler);
mcpToolsRouter.post('/actor.patch', actorPatchHandler);
mcpToolsRouter.post('/actor.move', actorMoveHandler);
mcpToolsRouter.post('/actor.applyEffect', actorApplyEffectHandler);
mcpToolsRouter.post('/actor.rollTrait', actorRollTraitHandler);
mcpToolsRouter.post('/actor.spendBenny', actorSpendBennyHandler);
mcpToolsRouter.post(
  '/actor.maintainConviction',
  actorMaintainConvictionHandler,
);
mcpToolsRouter.get('/session/:sessionId/actors', actorsListHandler);

// Combat tools
mcpToolsRouter.post('/combat.start', combatStartHandler);
mcpToolsRouter.post('/combat.deal', combatDealHandler);
mcpToolsRouter.post('/combat.hold', combatHoldHandler);
mcpToolsRouter.post('/combat.interrupt', combatInterruptHandler);
mcpToolsRouter.post('/combat.advanceTurn', combatAdvanceTurnHandler);
mcpToolsRouter.post('/combat.endRound', combatEndRoundHandler);
mcpToolsRouter.get('/combat/:sessionId/state', combatStateHandler);

// Combat enhancement tools
mcpToolsRouter.post('/combat.setMultiAction', combatSetMultiActionHandler);
mcpToolsRouter.post(
  '/combat.createExtrasGroup',
  combatCreateExtrasGroupHandler,
);
mcpToolsRouter.post('/combat.clearMultiAction', combatClearMultiActionHandler);
mcpToolsRouter.get('/combat/:sessionId/state', combatGetStateHandler);

// Rules tools
mcpToolsRouter.post('/rules.applyDamage', applyDamageHandler);
mcpToolsRouter.post('/rules.soakRoll', soakRollHandler);
mcpToolsRouter.post('/rules.castPower', castPowerHandler);
mcpToolsRouter.post('/rules.templateArea', templateAreaHandler);

// Support tools
mcpToolsRouter.post('/support.test', supportTestHandler);
mcpToolsRouter.post('/support.testOfWill', testOfWillHandler);
mcpToolsRouter.post('/support.commonEdges', commonEdgesHandler);

// Journal tools
mcpToolsRouter.post('/journal.addEntry', journalAddEntryHandler);
mcpToolsRouter.get('/journal/:sessionId/entries', journalGetEntriesHandler);
mcpToolsRouter.post('/journal.addCampaignNote', journalAddCampaignNoteHandler);
mcpToolsRouter.get(
  '/journal/:sessionId/campaignNotes',
  journalGetCampaignNotesHandler,
);
mcpToolsRouter.post('/journal.search', journalSearchHandler);
mcpToolsRouter.get('/journal/:sessionId/export', journalExportHandler);
