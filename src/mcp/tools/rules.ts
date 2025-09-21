import {
  ApplyDamageRequestSchema,
  SoakRollRequestSchema,
  DamageResultSchema,
  CastPowerRequestSchema,
  TemplateAreaRequestSchema,
} from '../../schemas';
import type { Env } from '../../index';
import { ZodError } from 'zod';

export async function applyDamageHandler(c: any) {
  try {
    const body = await c.req.json();
    const input = ApplyDamageRequestSchema.parse(body);

    // Get actor data
    const sessionDO = c.env.SessionDO.get(c.env.SessionDO.idFromName('global'));
    const actorResponse = await sessionDO.fetch(
      new Request(
        `http://session/actor/get?sessionId=${input.sessionId}&actorId=${input.defenderId}`,
        {
          method: 'GET',
        },
      ),
    );
    const actorResult = await actorResponse.json();

    if (!actorResult.success) {
      return c.json(
        {
          success: false,
          error: 'Actor not found',
        },
        404,
      );
    }

    const actor = actorResult.data;
    const damageResult = calculateDamage(input.damageRoll, input.ap, actor);

    // Update actor status
    const updateResponse = await sessionDO.fetch(
      new Request('http://session/actor/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: input.sessionId,
          actorId: input.defenderId,
          patch: {
            status: {
              ...actor.status,
              wounds: Math.min(
                actor.status.wounds + damageResult.woundsApplied,
                4,
              ), // 4-Wound Cap
              shaken: damageResult.shakenApplied || actor.status.shaken,
              incapacitated: damageResult.incapacitated,
            },
          },
        }),
      }),
    );

    return c.json({
      success: true,
      data: damageResult,
      serverTs: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Apply damage error:', error);
    if (error instanceof ZodError) {
      return c.json(
        {
          success: false,
          error: JSON.stringify(error.issues),
        },
        400,
      );
    }
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}

export async function soakRollHandler(c: any) {
  try {
    const body = await c.req.json();
    const input = SoakRollRequestSchema.parse(body);

    // Get actor data
    const sessionDO = c.env.SessionDO.get(c.env.SessionDO.idFromName('global'));
    const actorResponse = await sessionDO.fetch(
      new Request(
        `http://session/actor/get?sessionId=${input.sessionId}&actorId=${input.actorId}`,
        {
          method: 'GET',
        },
      ),
    );
    const actorResult = await actorResponse.json();

    if (!actorResult.success) {
      return c.json(
        {
          success: false,
          error: 'Actor not found',
        },
        404,
      );
    }

    const actor = actorResult.data;

    // Check if actor has enough Bennies
    if (actor.resources.bennies < input.benniesSpent) {
      return c.json(
        {
          success: false,
          error: 'Not enough Bennies',
        },
        400,
      );
    }

    // Roll soak dice (Vigor die + Wild Die)
    const rngDO = c.env.RngDO.get(
      c.env.RngDO.idFromName(`rng-${input.sessionId}`),
    );

    const vigorDie = actor.traits.Vigor || 'd6';
    const rollResponse = await rngDO.fetch(
      new Request('http://rng/roll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formula: `${vigorDie}+1d6`, // Vigor + Wild Die
          explode: true,
          wildDie: 'd6',
        }),
      }),
    );

    const rollResult = await rollResponse.json();
    const soakTotal = rollResult.data.total;
    const success = soakTotal >= 4; // Target number 4

    // Spend Bennies
    const updateResponse = await sessionDO.fetch(
      new Request('http://session/actor/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: input.sessionId,
          actorId: input.actorId,
          patch: {
            resources: {
              ...actor.resources,
              bennies: actor.resources.bennies - input.benniesSpent,
            },
          },
        }),
      }),
    );

    const damageReduction = success ? soakTotal : 0;
    const finalDamage = Math.max(0, input.damageAmount - damageReduction);

    return c.json({
      success: true,
      data: {
        soakRoll: {
          dice: rollResult.data.results.flat(),
          total: soakTotal,
          success,
        },
        damageReduction,
        finalDamage,
        benniesSpent: input.benniesSpent,
        explanation: success
          ? `Soak roll succeeded! Reduced damage by ${damageReduction}`
          : `Soak roll failed. No damage reduction.`,
      },
      serverTs: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Soak roll error:', error);
    if (error instanceof ZodError) {
      return c.json(
        {
          success: false,
          error: JSON.stringify(error.issues),
        },
        400,
      );
    }
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}

export async function castPowerHandler(c: any) {
  try {
    const body = await c.req.json();
    const input = CastPowerRequestSchema.parse(body);

    // Get caster data
    const sessionDO = c.env.SessionDO.get(c.env.SessionDO.idFromName('global'));
    const actorResponse = await sessionDO.fetch(
      new Request(
        `http://session/actor/get?sessionId=${input.sessionId}&actorId=${input.casterId}`,
        {
          method: 'GET',
        },
      ),
    );
    const actorResult = await actorResponse.json();

    if (!actorResult.success) {
      return c.json(
        {
          success: false,
          error: 'Caster not found',
        },
        404,
      );
    }

    const caster = actorResult.data;

    // Check if caster has enough Power Points
    const totalCost = input.ppCost + input.shorting;
    if (caster.resources.powerPoints < totalCost) {
      return c.json(
        {
          success: false,
          error: 'Not enough Power Points',
        },
        400,
      );
    }

    // Roll for power casting (usually Faith or Spellcasting)
    const rngDO = c.env.RngDO.get(
      c.env.RngDO.idFromName(`rng-${input.sessionId}`),
    );

    const skillDie =
      caster.skills.find(
        (s: any) =>
          s.name.toLowerCase() === 'faith' ||
          s.name.toLowerCase() === 'spellcasting',
      )?.die || 'd6';
    const rollResponse = await rngDO.fetch(
      new Request('http://rng/roll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formula: `${skillDie}+1d6`, // Skill + Wild Die
          explode: true,
          wildDie: 'd6',
        }),
      }),
    );

    const rollResult = await rollResponse.json();
    const total = rollResult.data.total;
    const targetNumber = 4 + input.shorting; // Shorting increases difficulty
    const success = total >= targetNumber;
    const criticalFailure =
      rollResult.data.results.some((dice: number[]) => dice.includes(1)) &&
      rollResult.data.results.some((dice: number[]) => dice.includes(1));

    // Spend Power Points
    const updateResponse = await sessionDO.fetch(
      new Request('http://session/actor/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: input.sessionId,
          actorId: input.casterId,
          patch: {
            resources: {
              ...caster.resources,
              powerPoints: caster.resources.powerPoints - totalCost,
            },
          },
        }),
      }),
    );

    return c.json({
      success: true,
      data: {
        roll: {
          dice: rollResult.data.results.flat(),
          total,
          targetNumber,
          success,
        },
        criticalFailure,
        fatigue: criticalFailure,
        powerPointsSpent: totalCost,
        explanation: criticalFailure
          ? `Critical failure! Power backfires and caster is Fatigued.`
          : success
            ? `Power cast successfully!`
            : `Power casting failed.`,
      },
      serverTs: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cast power error:', error);
    if (error instanceof ZodError) {
      return c.json(
        {
          success: false,
          error: JSON.stringify(error.issues),
        },
        400,
      );
    }
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}

export async function templateAreaHandler(c: any) {
  try {
    const body = await c.req.json();
    const input = TemplateAreaRequestSchema.parse(body);

    const coveredCells = calculateTemplateArea(input);

    return c.json({
      success: true,
      data: {
        coveredCells,
        explanation: `Template covers ${coveredCells.length} cells`,
      },
      serverTs: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Template area error:', error);
    if (error instanceof ZodError) {
      return c.json(
        {
          success: false,
          error: JSON.stringify(error.issues),
        },
        400,
      );
    }
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}

// Helper functions
function calculateDamage(damageRoll: number, ap: number, actor: any): any {
  const toughness = actor.defense.toughness;
  const armor = actor.defense.armor;
  const effectiveToughness = toughness + armor - ap;

  const damageDealt = Math.max(0, damageRoll - effectiveToughness);

  if (damageDealt === 0) {
    return {
      damageDealt: 0,
      woundsApplied: 0,
      shakenApplied: false,
      incapacitated: false,
      explanation: 'Damage absorbed by armor/toughness',
    };
  }

  // Savage Worlds damage table
  let woundsApplied = 0;
  let shakenApplied = false;
  let incapacitated = false;

  if (damageDealt >= 4) {
    woundsApplied = Math.min(Math.floor(damageDealt / 4), 4); // 4-Wound Cap
    shakenApplied = true;
  } else if (damageDealt >= 1) {
    shakenApplied = true;
  }

  if (woundsApplied >= 4) {
    incapacitated = true;
  }

  return {
    damageDealt,
    woundsApplied,
    shakenApplied,
    incapacitated,
    explanation: `Dealt ${damageDealt} damage. ${woundsApplied > 0 ? `${woundsApplied} wounds` : 'Shaken'}.`,
  };
}

function calculateTemplateArea(input: any): Array<{ x: number; y: number }> {
  const { origin, template, angle = 0, reach, grid = 'square' } = input;
  const cells: Array<{ x: number; y: number }> = [];

  switch (template) {
    case 'SBT': // Small Burst Template (2" radius)
      return calculateBurstTemplate(origin, 2, cells);
    case 'MBT': // Medium Burst Template (4" radius)
      return calculateBurstTemplate(origin, 4, cells);
    case 'LBT': // Large Burst Template (6" radius)
      return calculateBurstTemplate(origin, 6, cells);
    case 'Cone':
      return calculateConeTemplate(origin, angle, reach, cells);
    case 'Stream':
      return calculateStreamTemplate(origin, angle, reach, cells);
    default:
      return cells;
  }
}

function calculateBurstTemplate(
  origin: { x: number; y: number },
  radius: number,
  cells: Array<{ x: number; y: number }>,
): Array<{ x: number; y: number }> {
  for (let x = origin.x - radius; x <= origin.x + radius; x++) {
    for (let y = origin.y - radius; y <= origin.y + radius; y++) {
      const distance = Math.sqrt((x - origin.x) ** 2 + (y - origin.y) ** 2);
      if (distance <= radius) {
        cells.push({ x, y });
      }
    }
  }
  return cells;
}

function calculateConeTemplate(
  origin: { x: number; y: number },
  angle: number,
  reach: number,
  cells: Array<{ x: number; y: number }>,
): Array<{ x: number; y: number }> {
  // Simplified cone calculation - would need more complex geometry for accurate implementation
  for (let r = 1; r <= reach; r++) {
    for (let a = -angle / 2; a <= angle / 2; a += 15) {
      // 15-degree increments
      const x = origin.x + Math.round(r * Math.cos((a * Math.PI) / 180));
      const y = origin.y + Math.round(r * Math.sin((a * Math.PI) / 180));
      cells.push({ x, y });
    }
  }
  return cells;
}

function calculateStreamTemplate(
  origin: { x: number; y: number },
  angle: number,
  reach: number,
  cells: Array<{ x: number; y: number }>,
): Array<{ x: number; y: number }> {
  // Stream is a line from origin in the direction of angle
  for (let r = 1; r <= reach; r++) {
    const x = origin.x + Math.round(r * Math.cos((angle * Math.PI) / 180));
    const y = origin.y + Math.round(r * Math.sin((angle * Math.PI) / 180));
    cells.push({ x, y });
  }
  return cells;
}
