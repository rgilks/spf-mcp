import { describe, it, expect, beforeEach, vi } from 'vitest';
import app from './index';

// Mock environment with realistic responses
const createMockEnv = () => ({
  DB: {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({ success: true }),
        first: vi.fn().mockImplementation((query) => {
          if (query.includes('sessions')) {
            return Promise.resolve({
              id: 'sim-session',
              name: 'Simulation Session',
              status: 'in_progress',
              round: 1,
              turn: 0,
            });
          }
          return Promise.resolve(null);
        }),
        all: vi.fn().mockResolvedValue({ results: [] }),
      }),
    }),
  },
  SPFKV: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
  R2: { put: vi.fn(), get: vi.fn(), delete: vi.fn() },
  CombatDO: {
    get: vi.fn().mockReturnValue({
      fetch: vi.fn().mockImplementation(async (req) => {
        const url = new URL(req.url);
        const path = url.pathname;

        if (path.includes('/start')) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                sessionId: 'sim-session',
                status: 'idle',
                round: 0,
                turn: 0,
                participants: [
                  'pc-valeros',
                  'pc-seoni',
                  'npc-goblin1',
                  'npc-goblin2',
                ],
              },
              serverTs: new Date().toISOString(),
            }),
          );
        }

        if (path.includes('/deal')) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                dealt: {
                  'pc-valeros': { rank: 'K', suit: 'Spades', id: 'card1' },
                  'pc-seoni': { rank: 'Q', suit: 'Hearts', id: 'card2' },
                  'npc-goblin1': { rank: 'J', suit: 'Diamonds', id: 'card3' },
                  'npc-goblin2': { rank: '10', suit: 'Clubs', id: 'card4' },
                },
                turnOrder: [
                  'pc-valeros',
                  'pc-seoni',
                  'npc-goblin1',
                  'npc-goblin2',
                ],
              },
              serverTs: new Date().toISOString(),
            }),
          );
        }

        if (path.includes('/advanceTurn')) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                sessionId: 'sim-session',
                status: 'turn_active',
                round: 1,
                turn: 1,
                activeActorId: 'pc-seoni',
                participants: [
                  'pc-valeros',
                  'pc-seoni',
                  'npc-goblin1',
                  'npc-goblin2',
                ],
              },
              serverTs: new Date().toISOString(),
            }),
          );
        }

        return new Response(JSON.stringify({ success: true, data: {} }));
      }),
    }),
    idFromName: vi.fn(),
  },
  DeckDO: {
    get: vi.fn().mockReturnValue({
      fetch: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { cards: [], discard: [], dealt: {} },
          }),
        ),
      ),
    }),
    idFromName: vi.fn(),
  },
  RngDO: {
    get: vi.fn().mockReturnValue({
      fetch: vi.fn().mockImplementation(async (req) => {
        const body = await req.json();
        const formula = body.formula;

        // Simulate different dice results based on formula
        let results, total;
        if (formula.includes('d20')) {
          results = [[15]]; // Good roll
          total = 15;
        } else if (formula.includes('d8')) {
          results = [[6]]; // Decent roll
          total = 6;
        } else if (formula.includes('d6')) {
          results = [[4]]; // Average roll
          total = 4;
        } else {
          results = [[3, 4]]; // Default
          total = 7;
        }

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              formula,
              results,
              total,
              seed: 'sim-seed',
              hash: 'sim-hash',
            },
            serverTs: new Date().toISOString(),
          }),
        );
      }),
    }),
    idFromName: vi.fn(),
  },
  SessionDO: {
    get: vi.fn().mockReturnValue({
      fetch: vi.fn().mockImplementation(async (req) => {
        const url = new URL(req.url);
        const path = url.pathname;

        if (path.includes('/create')) {
          return new Response(
            JSON.stringify({
              success: true,
              data: { sessionId: 'sim-session' },
              serverTs: new Date().toISOString(),
            }),
          );
        }

        if (path.includes('/actor/create')) {
          const body = await req.json();
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id: `actor-${Date.now()}`,
                sessionId: body.sessionId,
                ...body.actor,
              },
              serverTs: new Date().toISOString(),
            }),
          );
        }

        return new Response(JSON.stringify({ success: true, data: {} }));
      }),
    }),
    idFromName: vi.fn(),
  },
  MCP_SERVER_NAME: 'spf-mcp-simulation',
});

describe('Full Combat Simulation', () => {
  let mockEnv: any;

  beforeEach(() => {
    mockEnv = createMockEnv();
  });

  it('should simulate a complete combat encounter', async () => {
    // Step 1: Create a game session
    const createSessionRequest = new Request(
      'http://localhost/mcp/tool/session.create',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Goblin Ambush',
          grid: {
            unit: 'inch',
            scale: 1.0,
            cols: 20,
            rows: 20,
          },
          illumination: 'dim',
        }),
      },
    );

    const sessionResponse = await app.fetch(createSessionRequest, mockEnv);
    const sessionResult = (await sessionResponse.json()) as any;
    expect(sessionResult.success).toBe(true);
    const sessionId = sessionResult.data.sessionId;

    // Step 2: Create player characters
    const createValerosRequest = new Request(
      'http://localhost/mcp/tool/actor.upsert',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          actor: {
            type: 'pc',
            name: 'Valeros',
            wildCard: true,
            traits: {
              Agility: 'd8',
              Smarts: 'd6',
              Spirit: 'd8',
              Strength: 'd10',
              Vigor: 'd8',
            },
            skills: [
              { name: 'Fighting', die: 'd10' },
              { name: 'Shooting', die: 'd6' },
              { name: 'Notice', die: 'd6' },
            ],
            resources: { bennies: 3, conviction: 0, powerPoints: 0 },
            status: { shaken: false, stunned: false, fatigue: 0, wounds: 0 },
            defense: { parry: 7, toughness: 8, armor: 2 },
            gear: [
              { name: 'Longsword', ap: 0, damage: 'Str+d8' },
              { name: 'Chain Mail', ap: 0 },
            ],
            position: { x: 10, y: 10, facing: 0 },
            reach: 1,
            size: 0,
          },
        }),
      },
    );

    const valerosResponse = await app.fetch(createValerosRequest, mockEnv);
    const valerosResult = (await valerosResponse.json()) as any;
    expect(valerosResult.success).toBe(true);
    const valerosId = valerosResult.data.id;

    const createSeoniRequest = new Request(
      'http://localhost/mcp/tool/actor.upsert',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          actor: {
            type: 'pc',
            name: 'Seoni',
            wildCard: true,
            traits: {
              Agility: 'd6',
              Smarts: 'd10',
              Spirit: 'd8',
              Strength: 'd4',
              Vigor: 'd6',
            },
            skills: [
              { name: 'Spellcasting', die: 'd10' },
              { name: 'Notice', die: 'd8' },
            ],
            resources: { bennies: 3, conviction: 0, powerPoints: 15 },
            status: { shaken: false, stunned: false, fatigue: 0, wounds: 0 },
            defense: { parry: 4, toughness: 5, armor: 0 },
            powers: [
              { name: 'Bolt', ppCost: 2, mods: [] },
              { name: 'Healing', ppCost: 3, mods: [] },
            ],
            position: { x: 8, y: 12, facing: 0 },
            reach: 1,
            size: 0,
          },
        }),
      },
    );

    const seoniResponse = await app.fetch(createSeoniRequest, mockEnv);
    const seoniResult = (await seoniResponse.json()) as any;
    expect(seoniResult.success).toBe(true);
    const seoniId = seoniResult.data.id;

    // Step 3: Create NPCs (goblins)
    const createGoblin1Request = new Request(
      'http://localhost/mcp/tool/actor.upsert',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          actor: {
            type: 'npc',
            name: 'Goblin Warrior 1',
            wildCard: false,
            traits: {
              Agility: 'd8',
              Smarts: 'd4',
              Spirit: 'd6',
              Strength: 'd6',
              Vigor: 'd6',
            },
            skills: [
              { name: 'Fighting', die: 'd6' },
              { name: 'Shooting', die: 'd6' },
            ],
            resources: { bennies: 1, conviction: 0, powerPoints: 0 },
            status: { shaken: false, stunned: false, fatigue: 0, wounds: 0 },
            defense: { parry: 5, toughness: 5, armor: 0 },
            gear: [{ name: 'Short Sword', ap: 0, damage: 'Str+d4' }],
            position: { x: 15, y: 8, facing: 180 },
            reach: 1,
            size: -1,
          },
        }),
      },
    );

    const goblin1Response = await app.fetch(createGoblin1Request, mockEnv);
    const goblin1Result = (await goblin1Response.json()) as any;
    expect(goblin1Result.success).toBe(true);
    const goblin1Id = goblin1Result.data.id;

    // Step 4: Start combat
    const startCombatRequest = new Request(
      'http://localhost/mcp/tool/combat.start',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          participants: [valerosId, seoniId, goblin1Id],
        }),
      },
    );

    const combatResponse = await app.fetch(startCombatRequest, mockEnv);
    const combatResult = (await combatResponse.json()) as any;
    expect(combatResult.success).toBe(true);

    // Step 5: Deal initiative cards
    const dealInitiativeRequest = new Request(
      'http://localhost/mcp/tool/combat.deal',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          extraDraws: {},
        }),
      },
    );

    const initiativeResponse = await app.fetch(dealInitiativeRequest, mockEnv);
    const initiativeResult = (await initiativeResponse.json()) as any;
    expect(initiativeResult.success).toBe(true);
    expect(initiativeResult.data.dealt).toBeDefined();

    // Step 6: Valeros takes his turn (highest card - King of Spades)
    const valerosAttackRequest = new Request(
      'http://localhost/mcp/tool/actor.rollTrait',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          actorId: valerosId,
          trait: 'Fighting',
          mods: [0], // No modifiers
        }),
      },
    );

    const attackResponse = await app.fetch(valerosAttackRequest, mockEnv);
    const attackResult = (await attackResponse.json()) as any;
    expect(attackResult.success).toBe(true);
    expect(attackResult.data.total).toBeGreaterThan(0);

    // Step 7: Apply damage to goblin
    const applyDamageRequest = new Request(
      'http://localhost/mcp/tool/actor.applyEffect',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          actorId: goblin1Id,
          effect: {
            type: 'damage',
            payload: { amount: 8 }, // Assuming Valeros hit and did 8 damage
          },
        }),
      },
    );

    const damageResponse = await app.fetch(applyDamageRequest, mockEnv);
    const damageResult = (await damageResponse.json()) as any;
    expect(damageResult.success).toBe(true);

    // Step 8: Advance to next turn (Seoni)
    const advanceTurnRequest = new Request(
      'http://localhost/mcp/tool/combat.advanceTurn',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
        }),
      },
    );

    const advanceResponse = await app.fetch(advanceTurnRequest, mockEnv);
    const advanceResult = (await advanceResponse.json()) as any;
    expect(advanceResult.success).toBe(true);
    expect(advanceResult.data.activeActorId).toBe(seoniId);

    // Step 9: Seoni casts a spell
    const seoniSpellRequest = new Request(
      'http://localhost/mcp/tool/actor.rollTrait',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          actorId: seoniId,
          trait: 'Spellcasting',
          mods: [0],
        }),
      },
    );

    const spellResponse = await app.fetch(seoniSpellRequest, mockEnv);
    const spellResult = (await spellResponse.json()) as any;
    expect(spellResult.success).toBe(true);

    // Step 10: Apply spell effect (Bolt damage)
    const spellDamageRequest = new Request(
      'http://localhost/mcp/tool/actor.applyEffect',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          actorId: goblin1Id,
          effect: {
            type: 'damage',
            payload: { amount: 6 }, // Bolt damage
          },
        }),
      },
    );

    const spellDamageResponse = await app.fetch(spellDamageRequest, mockEnv);
    const spellDamageResult = (await spellDamageResponse.json()) as any;
    expect(spellDamageResult.success).toBe(true);

    // Step 11: End the round
    const endRoundRequest = new Request(
      'http://localhost/mcp/tool/combat.endRound',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
        }),
      },
    );

    const endRoundResponse = await app.fetch(endRoundRequest, mockEnv);
    const endRoundResult = (await endRoundResponse.json()) as any;
    expect(endRoundResult.success).toBe(true);

    // Verify the simulation completed successfully
    console.log('Combat simulation completed successfully!');
    console.log('Session ID:', sessionId);
    console.log('Valeros ID:', valerosId);
    console.log('Seoni ID:', seoniId);
    console.log('Goblin ID:', goblin1Id);
  });

  it('should handle dice rolling with different formulas', async () => {
    const mockEnv = createMockEnv();

    const testCases = [
      { formula: '1d20', expectedType: 'number' },
      { formula: '2d6+1', expectedType: 'number' },
      { formula: '1d8!!', expectedType: 'number' },
      { formula: '3d4-2', expectedType: 'number' },
    ];

    for (const testCase of testCases) {
      const request = new Request('http://localhost/mcp/tool/dice.roll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formula: testCase.formula,
          sessionId: 'test-session',
        }),
      });

      const response = await app.fetch(request, mockEnv);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(typeof result.data.total).toBe(testCase.expectedType);
      expect(result.data.total).toBeGreaterThan(0);
    }
  });
});
