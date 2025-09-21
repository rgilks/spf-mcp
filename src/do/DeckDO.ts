import { InitiativeCard, DeckState, DeckStateSchema } from '../schemas';
import { v4 as uuidv4 } from 'uuid';
import type { Env } from '../index';

export class DeckDO {
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
      if (request.method === 'POST' && path.endsWith('/reset')) {
        return await this.handleReset(request);
      } else if (request.method === 'POST' && path.endsWith('/deal')) {
        return await this.handleDeal(request);
      } else if (request.method === 'POST' && path.endsWith('/recall')) {
        return await this.handleRecall(request);
      } else if (request.method === 'GET' && path.endsWith('/state')) {
        return await this.handleGetState(request);
      } else {
        return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('DeckDO error:', error);
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

  private async handleReset(request: Request): Promise<Response> {
    const body = (await request.json()) as {
      useJokers?: boolean;
      sessionId?: string;
    };
    const { useJokers = true } = body;

    const deck = this.createStandardDeck(useJokers);
    const deckState: DeckState = {
      id: uuidv4(),
      sessionId: body.sessionId || 'system',
      cards: deck,
      discard: [],
      dealt: {},
      lastJokerRound: -1,
      updatedAt: new Date(),
    };

    await this.state.storage.put('deckState', deckState);

    return new Response(
      JSON.stringify({
        success: true,
        data: deckState,
        serverTs: new Date().toISOString(),
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  private async handleDeal(request: Request): Promise<Response> {
    const body = (await request.json()) as {
      to: string[];
      extra?: Record<string, number>;
      round?: number;
    };
    const { to, extra = {}, round = 0 } = body;

    const deckState = await this.getDeckState();
    if (!deckState) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No deck initialized. Call reset first.',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    const dealt: Record<string, InitiativeCard> = {};
    let jokerDealt = false;

    // Deal cards to each actor
    for (const actorId of to) {
      if (deckState.cards.length === 0) {
        // Shuffle discard pile back into deck
        await this.shuffleDeck(deckState);
      }

      const card = deckState.cards.pop();
      if (!card) throw new Error('No cards available');
      dealt[actorId] = card;
      deckState.dealt[actorId] = card;

      // Track if a Joker was dealt
      if (card.rank === 'Joker') {
        jokerDealt = true;
      }

      // Handle extra draws (e.g., Level Headed Edge)
      const extraDraws = extra[actorId] || 0;
      for (let i = 0; i < extraDraws; i++) {
        if (deckState.cards.length === 0) {
          await this.shuffleDeck(deckState);
        }
        const extraCard = deckState.cards.pop();
        if (!extraCard) throw new Error('No cards available for extra draw');

        // Track if extra draw was a Joker
        if (extraCard.rank === 'Joker') {
          jokerDealt = true;
        }

        // Keep the better card (higher rank)
        if (this.compareCards(extraCard, dealt[actorId]) > 0) {
          deckState.discard.push(dealt[actorId]);
          dealt[actorId] = extraCard;
          deckState.dealt[actorId] = extraCard;
        } else {
          deckState.discard.push(extraCard);
        }
      }
    }

    // Update lastJokerRound if a Joker was dealt this round
    if (jokerDealt) {
      deckState.lastJokerRound = round;
    }

    deckState.updatedAt = new Date();
    await this.state.storage.put('deckState', deckState);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          dealt,
          jokerDealt,
          jokerBonuses: this.calculateJokerBonuses(dealt),
        },
        serverTs: new Date().toISOString(),
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  private async handleRecall(request: Request): Promise<Response> {
    const body = (await request.json()) as { actorId: string };
    const { actorId } = body;

    const deckState = await this.getDeckState();
    if (!deckState) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No deck initialized',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    const card = deckState.dealt[actorId];
    if (!card) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No card found for actor',
        }),
        { status: 404, headers: { 'content-type': 'application/json' } },
      );
    }

    // Return card to deck
    deckState.cards.push(card);
    delete deckState.dealt[actorId];
    deckState.updatedAt = new Date();

    await this.state.storage.put('deckState', deckState);

    return new Response(
      JSON.stringify({
        success: true,
        data: { recalled: card },
        serverTs: new Date().toISOString(),
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  private async handleGetState(_request: Request): Promise<Response> {
    const deckState = await this.getDeckState();
    if (!deckState) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No deck initialized',
        }),
        { status: 404, headers: { 'content-type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: deckState,
        serverTs: new Date().toISOString(),
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  private createStandardDeck(useJokers: boolean): InitiativeCard[] {
    const suits: ('Spades' | 'Hearts' | 'Diamonds' | 'Clubs')[] = [
      'Spades',
      'Hearts',
      'Diamonds',
      'Clubs',
    ];
    const ranks: (
      | 'A'
      | 'K'
      | 'Q'
      | 'J'
      | '10'
      | '9'
      | '8'
      | '7'
      | '6'
      | '5'
      | '4'
      | '3'
      | '2'
    )[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

    const deck: InitiativeCard[] = [];

    // Add standard cards
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({
          rank,
          suit,
          id: uuidv4(),
        });
      }
    }

    // Add Jokers if requested
    if (useJokers) {
      deck.push({
        rank: 'Joker',
        suit: null,
        id: uuidv4(),
      });
      deck.push({
        rank: 'Joker',
        suit: null,
        id: uuidv4(),
      });
    }

    // Shuffle the deck
    return this.shuffleArray(deck);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private async shuffleDeck(deckState: DeckState): Promise<void> {
    // Move all cards from discard back to deck
    deckState.cards = [...deckState.cards, ...deckState.discard];
    deckState.discard = [];

    // Shuffle the deck
    deckState.cards = this.shuffleArray(deckState.cards);
  }

  private compareCards(a: InitiativeCard, b: InitiativeCard): number {
    // Jokers are highest
    if (a.rank === 'Joker' && b.rank !== 'Joker') return 1;
    if (b.rank === 'Joker' && a.rank !== 'Joker') return -1;
    if (a.rank === 'Joker' && b.rank === 'Joker') return 0;

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
    const aRankIndex = rankOrder.indexOf(a.rank);
    const bRankIndex = rankOrder.indexOf(b.rank);

    if (aRankIndex !== bRankIndex) {
      return bRankIndex - aRankIndex; // Higher rank wins
    }

    // Suit tiebreaker: Spades > Hearts > Diamonds > Clubs
    const suitOrder = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];
    const aSuitIndex = suitOrder.indexOf(a.suit || '');
    const bSuitIndex = suitOrder.indexOf(b.suit || '');

    return bSuitIndex - aSuitIndex; // Higher suit wins
  }

  private calculateJokerBonuses(
    dealt: Record<string, InitiativeCard>,
  ): Record<
    string,
    { traitBonus: number; damageBonus: number; canActAnytime: boolean }
  > {
    const bonuses: Record<
      string,
      { traitBonus: number; damageBonus: number; canActAnytime: boolean }
    > = {};

    for (const [actorId, card] of Object.entries(dealt)) {
      if (card.rank === 'Joker') {
        bonuses[actorId] = {
          traitBonus: 2,
          damageBonus: 2,
          canActAnytime: true,
        };
      } else {
        bonuses[actorId] = {
          traitBonus: 0,
          damageBonus: 0,
          canActAnytime: false,
        };
      }
    }

    return bonuses;
  }

  private async getDeckState(): Promise<DeckState | null> {
    const stored = await this.state.storage.get('deckState');
    if (!stored) return null;

    try {
      const parsed = DeckStateSchema.parse(stored);
      // Ensure dates are properly hydrated
      if (typeof parsed.updatedAt === 'string') {
        parsed.updatedAt = new Date(parsed.updatedAt);
      }
      return parsed;
    } catch (error) {
      console.error('Failed to parse deck state:', error);
      return null;
    }
  }
}
