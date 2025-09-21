import { z } from 'zod';

const DiceReq = z.object({
  formula: z.string(), // e.g., "2d6+1"
  explode: z.boolean().default(true),
  wildDie: z.string().nullable().default(null), // e.g., "d6"
  seed: z.string().optional(),
});

function parseDie(sides: number, explode: boolean, prng: () => number) {
  const rolls: number[] = [];
  let roll = 1 + Math.floor(prng() * sides);
  rolls.push(roll);
  if (!explode) return { rolls, sum: roll };
  while (roll === sides) {
    roll = 1 + Math.floor(prng() * sides);
    rolls.push(roll);
  }
  return { rolls, sum: rolls.reduce((a, b) => a + b, 0) };
}

function makePrng(seed?: string) {
  // Simple xorshift32 for auditability (replace with crypto + proof chain later)
  let x = seed
    ? [...seed].reduce((a, c) => (a ^ c.charCodeAt(0)) >>> 0, 0x9e3779b9)
    : (Date.now() & 0xffffffff) >>> 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 0xffffffff;
  };
}

export async function diceRollHandler(c: any) {
  const body = await c.req.json();
  const input = DiceReq.parse(body);
  const prng = makePrng(input.seed);

  // minimal parser: only supports NdS(+/-)C and single wild
  const m = input.formula.trim().match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!m) return c.json({ error: "Bad formula. Try like '2d6+1'." }, 400);

  const count = parseInt(m[1], 10);
  const sides = parseInt(m[2], 10);
  const mod = m[3] ? parseInt(m[3], 10) : 0;

  const all: number[] = [];
  const breakdown: number[][] = [];
  for (let i = 0; i < count; i++) {
    const r = parseDie(sides, input.explode, prng);
    breakdown.push(r.rolls);
    all.push(r.sum);
  }

  let wild: number[] | null = null;
  let wildTotal: number | null = null;
  if (input.wildDie) {
    const s = parseInt(input.wildDie.slice(1), 10);
    const r = parseDie(s, input.explode, prng);
    wild = r.rolls;
    wildTotal = r.sum;
  }

  const total =
    (wildTotal !== null
      ? Math.max(...all, wildTotal)
      : all.reduce((a, b) => a + b, 0)) + mod;

  return c.json({
    request: input,
    results: { dice: breakdown, wild, modifier: mod },
    total,
  });
}
