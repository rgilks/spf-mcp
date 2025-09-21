import { z } from 'zod';

// Base schemas
export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  facing: z.number(),
});

export const SkillSchema = z.object({
  name: z.string(),
  die: z.string(),
});

export const PowerSchema = z.object({
  name: z.string(),
  ppCost: z.number(),
  mods: z.array(z.string()),
});

export const ResourcesSchema = z.object({
  bennies: z.number().min(0),
  conviction: z.number().min(0),
  powerPoints: z.number().min(0),
  ammo: z.record(z.string(), z.number()).optional(),
});

export const ActorStatusSchema = z.object({
  shaken: z.boolean(),
  stunned: z.boolean(),
  fatigue: z.number().min(0),
  wounds: z.number().min(0),
});

export const DefenseSchema = z.object({
  parry: z.number(),
  toughness: z.number(),
  armor: z.number(),
});

export const GearSchema = z.object({
  name: z.string(),
  ap: z.number(),
  damage: z.string().optional(),
  range: z.string().optional(),
  rof: z.number().optional(),
});

export const InitiativeCardSchema = z.object({
  rank: z.enum([
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
    'Joker',
  ]),
  suit: z.enum(['Spades', 'Hearts', 'Diamonds', 'Clubs']).nullable(),
  id: z.string(),
});

// Main entity schemas
export const SessionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  status: z.enum(['lobby', 'in_progress', 'paused', 'ended']),
  rulesetVersion: z.string().optional(),
  initiativeDeckId: z.string().uuid().optional(),
  rngId: z.string().uuid().optional(),
  round: z.number().min(0),
  turn: z.number().min(0),
  activeActorId: z.string().uuid().optional(),
  gridUnit: z.enum(['inch', 'meter', 'square']).optional(),
  gridScale: z.number().positive().optional(),
  cols: z.number().positive().optional(),
  rows: z.number().positive().optional(),
  illumination: z.enum(['bright', 'dim', 'dark']).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ActorSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  type: z.enum(['pc', 'npc', 'creature']),
  name: z.string(),
  wildCard: z.boolean(),
  traits: z.record(z.string(), z.string()),
  skills: z.array(SkillSchema),
  edges: z.array(z.string()).optional(),
  hindrances: z.array(z.string()).optional(),
  powers: z.array(PowerSchema).optional(),
  resources: ResourcesSchema,
  status: ActorStatusSchema,
  defense: DefenseSchema,
  gear: z.array(GearSchema).optional(),
  position: PositionSchema.optional(),
  reach: z.number().min(0),
  size: z.number().min(0),
});

export const DeckStateSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  cards: z.array(InitiativeCardSchema),
  discard: z.array(InitiativeCardSchema),
  dealt: z.record(z.string(), InitiativeCardSchema),
  lastJokerRound: z.number().min(-1),
  updatedAt: z.string(),
});

export const ActionLogSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  actorId: z.string().uuid().optional(),
  ts: z.string(),
  kind: z.enum([
    'dice',
    'card',
    'state',
    'damage',
    'healing',
    'power',
    'movement',
    'vision',
    'manual',
  ]),
  payload: z.record(z.string(), z.any()),
  by: z.string(),
  seed: z.string().optional(),
  hash: z.string().optional(),
});

// Request/Response schemas
export const CreateSessionRequestSchema = z.object({
  name: z.string(),
  grid: z.object({
    unit: z.enum(['inch', 'meter', 'square']),
    scale: z.number().positive(),
    cols: z.number().positive(),
    rows: z.number().positive(),
  }),
  illumination: z.enum(['bright', 'dim', 'dark']).default('bright'),
  gmRole: z.enum(['gpt5', 'human', 'hybrid']).default('gpt5'),
});

export const UpdateSessionRequestSchema = z.object({
  sessionId: z.string().uuid(),
  patch: z.object({
    name: z.string().optional(),
    status: z.enum(['lobby', 'in_progress', 'paused', 'ended']).optional(),
    round: z.number().min(0).optional(),
    turn: z.number().min(0).optional(),
    activeActorId: z.string().uuid().optional(),
    illumination: z.enum(['bright', 'dim', 'dark']).optional(),
  }),
});

export const CreateActorRequestSchema = z.object({
  sessionId: z.string().uuid(),
  actor: z.object({
    type: z.enum(['pc', 'npc', 'creature']),
    name: z.string(),
    wildCard: z.boolean(),
    traits: z.record(z.string(), z.string()),
    skills: z.array(SkillSchema),
    edges: z.array(z.string()).optional(),
    hindrances: z.array(z.string()).optional(),
    powers: z.array(PowerSchema).optional(),
    resources: ResourcesSchema,
    status: ActorStatusSchema,
    defense: DefenseSchema,
    gear: z.array(GearSchema).optional(),
    position: PositionSchema.optional(),
    reach: z.number().min(0).default(1),
    size: z.number().min(0).default(0),
  }),
});

export const UpdateActorRequestSchema = z.object({
  sessionId: z.string().uuid(),
  actorId: z.string().uuid(),
  patch: z.object({
    name: z.string().optional(),
    traits: z.record(z.string(), z.string()).optional(),
    skills: z.array(SkillSchema).optional(),
    edges: z.array(z.string()).optional(),
    hindrances: z.array(z.string()).optional(),
    powers: z.array(PowerSchema).optional(),
    resources: ResourcesSchema.optional(),
    status: ActorStatusSchema.optional(),
    defense: DefenseSchema.optional(),
    gear: z.array(GearSchema).optional(),
    position: PositionSchema.optional(),
    reach: z.number().min(0).optional(),
    size: z.number().min(0).optional(),
  }),
});

export const MoveActorRequestSchema = z.object({
  sessionId: z.string().uuid(),
  actorId: z.string().uuid(),
  to: PositionSchema,
  reason: z.string(),
});

export const ApplyEffectRequestSchema = z.object({
  sessionId: z.string().uuid(),
  actorId: z.string().uuid(),
  effect: z.object({
    type: z.enum(['damage', 'healing', 'condition', 'resource']),
    payload: z.record(z.string(), z.any()),
  }),
});

export const RollTraitRequestSchema = z.object({
  sessionId: z.string().uuid(),
  actorId: z.string().uuid(),
  trait: z.string(),
  mods: z.array(z.number()).default([]),
  rollMode: z.enum(['open', 'secret']).default('open'),
});

export const DiceRollRequestSchema = z.object({
  formula: z.string(),
  explode: z.boolean().default(true),
  wildDie: z.string().nullable().default(null),
  seed: z.string().optional(),
});

export const CombatStartRequestSchema = z.object({
  sessionId: z.string().uuid(),
  participants: z.array(z.string().uuid()),
  options: z.record(z.string(), z.any()).optional(),
});

export const CombatDealRequestSchema = z.object({
  sessionId: z.string().uuid(),
  extraDraws: z.record(z.string(), z.number()).optional(),
});

export const CombatHoldRequestSchema = z.object({
  sessionId: z.string().uuid(),
  actorId: z.string().uuid(),
});

export const CombatInterruptRequestSchema = z.object({
  sessionId: z.string().uuid(),
  actorId: z.string().uuid(),
  targetActorId: z.string().uuid(),
});

export const VisionCalibrateRequestSchema = z.object({
  sessionId: z.string().uuid(),
  gridCorners: z.array(PositionSchema),
  cellSizeInches: z.number().positive(),
});

export const VisionReportPositionsRequestSchema = z.object({
  sessionId: z.string().uuid(),
  actors: z.array(
    z.object({
      id: z.string().uuid(),
      x: z.number(),
      y: z.number(),
      facing: z.number(),
    }),
  ),
});

export const VisionDetectDiceRequestSchema = z.object({
  sessionId: z.string().uuid(),
  frameRef: z.string().optional(),
  dataUrl: z.string().optional(),
  kind: z.enum(['pips', 'digits', 'percentile']),
});

export const ApplyDamageRequestSchema = z.object({
  sessionId: z.string().uuid(),
  attackerId: z.string().uuid(),
  defenderId: z.string().uuid(),
  damageRoll: z.number(),
  ap: z.number().default(0),
});

export const CastPowerRequestSchema = z.object({
  sessionId: z.string().uuid(),
  casterId: z.string().uuid(),
  power: z.string(),
  ppCost: z.number(),
  shorting: z.number().default(0),
  modifiers: z.array(z.number()).default([]),
  targets: z.array(z.string().uuid()).default([]),
});

export const TemplateAreaRequestSchema = z.object({
  sessionId: z.string().uuid(),
  origin: PositionSchema,
  template: z.enum(['SBT', 'MBT', 'LBT', 'Cone', 'Stream']),
  angle: z.number().optional(),
  reach: z.number().positive(),
  grid: z.enum(['square', 'hex']).default('square'),
  snap: z.boolean().default(true),
});

// Response schemas
export const MCPResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  delta: z.record(z.string(), z.any()).optional(),
  serverTs: z.string(),
});

export const DiceRollResponseSchema = z.object({
  formula: z.string(),
  results: z.array(z.array(z.number())),
  wild: z.array(z.number()).optional(),
  modifier: z.number(),
  total: z.number(),
  seed: z.string(),
  hash: z.string(),
});

export const CombatStateResponseSchema = z.object({
  sessionId: z.string().uuid(),
  status: z.enum([
    'idle',
    'round_start',
    'turn_active',
    'on_hold',
    'turn_resolved',
    'next_turn',
    'round_end',
  ]),
  round: z.number().min(0),
  turn: z.number().min(0),
  activeActorId: z.string().uuid().optional(),
  hold: z.array(z.string().uuid()),
  participants: z.array(z.string().uuid()),
  dealt: z.record(z.string(), InitiativeCardSchema).optional(),
});

export const AreaTemplateResponseSchema = z.object({
  coveredCells: z.array(PositionSchema),
  explanation: z.string(),
});
