import {
  CombatState,
  InitiativeCard,
  MultiActionPenalty,
  ExtrasGroup,
} from '../schemas';
import type { Env } from '../index';

export class CombatDO {
  state: DurableObjectState;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (request.method === 'POST' && path.endsWith('/start')) {
        return await this.handleStart(request);
      } else if (request.method === 'POST' && path.endsWith('/deal')) {
        return await this.handleDeal(request);
      } else if (request.method === 'POST' && path.endsWith('/hold')) {
        return await this.handleHold(request);
      } else if (request.method === 'POST' && path.endsWith('/interrupt')) {
        return await this.handleInterrupt(request);
      } else if (request.method === 'POST' && path.endsWith('/advanceTurn')) {
        return await this.handleAdvanceTurn(request);
      } else if (request.method === 'POST' && path.endsWith('/endRound')) {
        return await this.handleEndRound(request);
      } else if (request.method === 'GET' && path.endsWith('/state')) {
        return await this.handleGetState();
      } else if (
        request.method === 'POST' &&
        path.endsWith('/setMultiAction')
      ) {
        return await this.handleSetMultiAction(request);
      } else if (
        request.method === 'POST' &&
        path.endsWith('/clearMultiAction')
      ) {
        return await this.handleClearMultiAction(request);
      } else if (
        request.method === 'POST' &&
        path.endsWith('/createExtrasGroup')
      ) {
        return await this.handleCreateExtrasGroup(request);
      } else {
        return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('CombatDO error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'content-type': 'application/json' },
        },
      );
    }
  }

  private async handleStart(request: Request): Promise<Response> {
    const body = await request.json();
    const { sessionId, participants } = body as {
      sessionId: string;
      participants: string[];
      options?: Record<string, unknown>;
    };

    const combatState: CombatState = {
      sessionId,
      status: 'idle',
      round: 0,
      turn: 0,
      activeActorId: undefined,
      hold: [],
      participants,
    };

    await this.state.storage.put('combatState', combatState);

    return new Response(
      JSON.stringify({
        success: true,
        data: combatState,
        serverTs: new Date().toISOString(),
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  private async handleDeal(request: Request): Promise<Response> {
    const body = await request.json();
    const { sessionId, extraDraws = {} } = body as {
      sessionId: string;
      extraDraws?: Record<string, number>;
    };

    const combatState = await this.getCombatState();
    if (!combatState) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Combat not started. Call start first.',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    // Get deck DO and deal cards
    const deckDO = this.env.DeckDO.get(
      this.env.DeckDO.idFromName(`deck-${sessionId}`),
    );
    const dealResponse = await deckDO.fetch(
      new Request('http://deck/deal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          to: combatState.participants,
          extra: extraDraws,
          round: combatState.round + 1, // Pass the round number for Joker tracking
        }),
      }),
    );

    const dealResult = (await dealResponse.json()) as {
      success: boolean;
      data?: {
        dealt: Record<string, InitiativeCard>;
        jokerBonuses?: Record<string, unknown>;
        jokerDealt?: boolean;
      };
      error?: string;
    };

    if (!dealResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to deal cards: ' + dealResult.error,
        }),
        { status: 500, headers: { 'content-type': 'application/json' } },
      );
    }

    // Sort participants by card value (highest first)
    const dealt = dealResult.data?.dealt;
    if (!dealt) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No dealt cards found',
        }),
        { status: 500, headers: { 'content-type': 'application/json' } },
      );
    }
    const sortedParticipants = this.sortByCardValue(
      combatState.participants,
      dealt,
    );

    // Update combat state
    combatState.status = 'turn_active'; // Start with first actor active
    combatState.round++;
    combatState.turn = 0;
    combatState.activeActorId = sortedParticipants[0];
    combatState.hold = [];

    await this.state.storage.put('combatState', combatState);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...combatState,
          dealt: dealResult.data?.dealt,
          turnOrder: sortedParticipants,
          jokerBonuses: dealResult.data?.jokerBonuses,
          jokerDealt: dealResult.data?.jokerDealt,
        },
        serverTs: new Date().toISOString(),
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  private async handleHold(request: Request): Promise<Response> {
    const body = await request.json();
    const { actorId } = body as {
      sessionId: string;
      actorId: string;
    };

    const combatState = await this.getCombatState();
    if (!combatState) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Combat not started',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    if (combatState.activeActorId !== actorId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Only the active actor can go on hold',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    // Move actor to hold
    combatState.hold.push(actorId);
    combatState.status = 'on_hold';
    combatState.activeActorId = undefined;

    await this.state.storage.put('combatState', combatState);

    return new Response(
      JSON.stringify({
        success: true,
        data: combatState,
        serverTs: new Date().toISOString(),
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  private async handleInterrupt(request: Request): Promise<Response> {
    const body = await request.json();
    const {
      actorId,
      targetActorId,
      interruptType = 'general',
    } = body as {
      sessionId: string;
      actorId: string;
      targetActorId: string;
      interruptType?: string;
    };

    const combatState = await this.getCombatState();
    if (!combatState) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Combat not started',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    if (!combatState.hold.includes(actorId)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Actor is not on hold',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    // Validate interrupt timing - can only interrupt during specific actions
    if (
      combatState.status !== 'turn_active' &&
      combatState.status !== 'on_hold'
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cannot interrupt at this time - no active turn',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    // Check if target is valid for interrupt
    if (targetActorId && !combatState.participants.includes(targetActorId)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid target for interrupt',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    // Remove from hold and make active
    combatState.hold = combatState.hold.filter((id) => id !== actorId);
    combatState.activeActorId = actorId;
    combatState.status = 'turn_active';

    // Store interrupt context for potential opposed rolls
    combatState.interruptContext = {
      interrupter: actorId,
      target: targetActorId,
      type: interruptType,
      timestamp: new Date().toISOString(),
    };

    await this.state.storage.put('combatState', combatState);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...combatState,
          interruptContext: combatState.interruptContext,
        },
        serverTs: new Date().toISOString(),
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  private async handleAdvanceTurn(request: Request): Promise<Response> {
    const body = await request.json();
    const { sessionId } = body as { sessionId: string };

    const combatState = await this.getCombatState();
    if (!combatState) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Combat not started',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    if (
      combatState.status !== 'turn_active' &&
      combatState.status !== 'on_hold' &&
      combatState.status !== 'round_start'
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cannot advance turn in current state',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    // Get current turn order
    const deckDO = this.env.DeckDO.get(
      this.env.DeckDO.idFromName(`deck-${sessionId}`),
    );
    const deckResponse = await deckDO.fetch(
      new Request('http://deck/state', { method: 'GET' }),
    );
    const deckResult = (await deckResponse.json()) as {
      success: boolean;
      data?: {
        dealt: Record<string, InitiativeCard>;
        lastJokerRound: number;
      };
      error?: string;
    };

    if (!deckResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to get deck state',
        }),
        { status: 500, headers: { 'content-type': 'application/json' } },
      );
    }

    const dealt = deckResult.data?.dealt;
    if (!dealt) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No dealt cards found',
        }),
        { status: 500, headers: { 'content-type': 'application/json' } },
      );
    }
    const sortedParticipants = this.sortByCardValue(
      combatState.participants,
      dealt,
    );

    // Handle special case for round_start - activate first actor
    if (combatState.status === 'round_start') {
      combatState.activeActorId = sortedParticipants[0];
      combatState.status = 'turn_active';
      combatState.turn = 0;
    } else {
      // Handle case where activeActorId is undefined (after hold)
      let currentIndex;
      if (combatState.activeActorId === undefined) {
        // Find the last actor that wasn't on hold to continue from there
        currentIndex = -1; // Will start from the beginning
        for (let i = 0; i < sortedParticipants.length; i++) {
          if (!combatState.hold.includes(sortedParticipants[i])) {
            currentIndex = i - 1; // Start from the actor before this one
            break;
          }
        }
      } else {
        currentIndex = sortedParticipants.indexOf(combatState.activeActorId);
      }

      let nextIndex = currentIndex + 1;

      // Skip actors that are on hold
      while (
        nextIndex < sortedParticipants.length &&
        combatState.hold.includes(sortedParticipants[nextIndex])
      ) {
        nextIndex++;
      }

      // If we've gone through all actors, check for hold
      if (nextIndex >= sortedParticipants.length) {
        if (combatState.hold.length > 0) {
          // Process hold actors in order
          combatState.activeActorId = combatState.hold[0];
          combatState.hold = combatState.hold.slice(1);
          combatState.status = 'turn_active';
        } else {
          // End of round
          combatState.status = 'round_end';
          combatState.activeActorId = undefined;
        }
      } else {
        combatState.activeActorId = sortedParticipants[nextIndex];
        combatState.status = 'turn_active';
      }

      combatState.turn++;
    }

    await this.state.storage.put('combatState', combatState);

    return new Response(
      JSON.stringify({
        success: true,
        data: combatState,
        serverTs: new Date().toISOString(),
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  private async handleEndRound(request: Request): Promise<Response> {
    const body = await request.json();
    const { sessionId } = body as { sessionId: string };

    const combatState = await this.getCombatState();
    if (!combatState) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Combat not started',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    // Check if we need to shuffle (Joker was dealt this round)
    const deckDO = this.env.DeckDO.get(
      this.env.DeckDO.idFromName(`deck-${sessionId}`),
    );
    const deckResponse = await deckDO.fetch(
      new Request('http://deck/state', { method: 'GET' }),
    );
    const deckResult = (await deckResponse.json()) as {
      success: boolean;
      data?: {
        lastJokerRound: number;
      };
    };

    if (deckResult.success && deckResult.data) {
      const deckState = deckResult.data;
      if (deckState.lastJokerRound === combatState.round) {
        // Shuffle deck for next round
        await deckDO.fetch(
          new Request('http://deck/reset', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ sessionId, useJokers: true }),
          }),
        );
      }
    }

    // Reset for next round
    combatState.status = 'round_start';
    combatState.turn = 0;
    combatState.activeActorId = undefined;
    combatState.hold = [];

    await this.state.storage.put('combatState', combatState);

    return new Response(
      JSON.stringify({
        success: true,
        data: combatState,
        serverTs: new Date().toISOString(),
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  private async handleGetState(): Promise<Response> {
    const combatState = await this.getCombatState();
    if (!combatState) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Combat not started',
        }),
        { status: 404, headers: { 'content-type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: combatState,
        serverTs: new Date().toISOString(),
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  private sortByCardValue(
    participants: string[],
    dealt: Record<string, InitiativeCard>,
  ): string[] {
    return [...participants].sort((a, b) => {
      const cardA = dealt[a];
      const cardB = dealt[b];

      if (!cardA || !cardB) return 0;

      // Jokers are highest
      if (cardA.rank === 'Joker' && cardB.rank !== 'Joker') return -1;
      if (cardB.rank === 'Joker' && cardA.rank !== 'Joker') return 1;
      if (cardA.rank === 'Joker' && cardB.rank === 'Joker') return 0;

      // Rank order: A > K > Q > J > 10 > 9 > ... > 2
      const rankOrder = [
        'A',
        'K',
        'Q',
        'J',
        '10',
        '9',
        '8',
        '7',
        '6',
        '5',
        '4',
        '3',
        '2',
      ];
      const aRankIndex = rankOrder.indexOf(cardA.rank);
      const bRankIndex = rankOrder.indexOf(cardB.rank);

      if (aRankIndex !== bRankIndex) {
        return bRankIndex - aRankIndex; // Higher rank first
      }

      // Suit tiebreaker: Spades > Hearts > Diamonds > Clubs
      const suitOrder = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];
      const aSuitIndex = suitOrder.indexOf(cardA.suit || '');
      const bSuitIndex = suitOrder.indexOf(cardB.suit || '');

      return bSuitIndex - aSuitIndex; // Higher suit first
    });
  }

  private async handleSetMultiAction(request: Request): Promise<Response> {
    const body = await request.json();
    const { actorId, actions, description } = body as {
      sessionId: string;
      actorId: string;
      actions: number;
      description: string;
    };

    const combatState = await this.getCombatState();
    if (!combatState) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Combat not started',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    // Calculate penalty: -2 per additional action
    const penalty = (actions - 1) * 2;

    const multiActionPenalty: MultiActionPenalty = {
      actorId,
      actions,
      penalty,
      description,
    };

    // Update or add multi-action penalty
    if (!combatState.multiActionPenalties) {
      combatState.multiActionPenalties = [];
    }

    // Remove existing penalty for this actor
    combatState.multiActionPenalties = combatState.multiActionPenalties.filter(
      (p) => p.actorId !== actorId,
    );

    // Add new penalty
    combatState.multiActionPenalties.push(multiActionPenalty);

    await this.state.storage.put('combatState', combatState);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...combatState,
          multiActionPenalty,
        },
        serverTs: new Date().toISOString(),
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  private async handleClearMultiAction(request: Request): Promise<Response> {
    const body = await request.json();
    const { actorId } = body as {
      sessionId: string;
      actorId: string;
    };

    const combatState = await this.getCombatState();
    if (!combatState) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Combat not started',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    // Remove multi-action penalty for this actor
    if (combatState.multiActionPenalties) {
      combatState.multiActionPenalties =
        combatState.multiActionPenalties.filter((p) => p.actorId !== actorId);
    }

    await this.state.storage.put('combatState', combatState);

    return new Response(
      JSON.stringify({
        success: true,
        data: combatState,
        serverTs: new Date().toISOString(),
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  private async handleCreateExtrasGroup(request: Request): Promise<Response> {
    const body = await request.json();
    const { groupName, actorIds, sharedCard } = body as {
      sessionId: string;
      groupName: string;
      actorIds: string[];
      sharedCard: boolean;
    };

    const combatState = await this.getCombatState();
    if (!combatState) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Combat not started',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    const groupId = `group-${Date.now()}`;
    const extrasGroup: ExtrasGroup = {
      groupId,
      actorIds,
      sharedCard,
      groupName,
    };

    // Add extras group
    if (!combatState.extrasGroups) {
      combatState.extrasGroups = [];
    }
    combatState.extrasGroups.push(extrasGroup);

    await this.state.storage.put('combatState', combatState);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...combatState,
          extrasGroup,
        },
        serverTs: new Date().toISOString(),
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  private async getCombatState(): Promise<CombatState | null> {
    const stored = await this.state.storage.get('combatState');
    return (stored as CombatState) || null;
  }
}
