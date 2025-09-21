// Database types for Savage Pathfinder
export interface Session {
  id: string;
  name: string;
  status: 'lobby' | 'in_progress' | 'paused' | 'ended';
  rulesetVersion?: string;
  initiativeDeckId?: string;
  rngId?: string;
  round: number;
  turn: number;
  activeActorId?: string;
  gridUnit?: 'inch' | 'meter' | 'square';
  gridScale?: number;
  cols?: number;
  rows?: number;
  illumination?: 'bright' | 'dim' | 'dark';
  createdAt: string;
  updatedAt: string;
}

export interface Actor {
  id: string;
  sessionId: string;
  type: 'pc' | 'npc' | 'creature';
  name: string;
  wildCard: boolean;
  traits: Record<string, string>; // e.g., {"Agility": "d8", "Smarts": "d6"}
  skills: Skill[];
  edges?: string[];
  hindrances?: string[];
  powers?: Power[];
  resources: Resources;
  status: ActorStatus;
  defense: Defense;
  gear?: Gear[];
  position?: Position;
  reach: number;
  size: number;
}

export interface Skill {
  name: string;
  die: string; // e.g., "d8", "d6+1"
}

export interface Power {
  name: string;
  ppCost: number;
  mods: string[];
}

export interface Resources {
  bennies: number;
  conviction: number;
  powerPoints: number;
  ammo?: Record<string, number>; // e.g., {"arrows": 16}
}

export interface ActorStatus {
  shaken: boolean;
  stunned: boolean;
  fatigue: number;
  wounds: number;
}

export interface Defense {
  parry: number;
  toughness: number;
  armor: number;
}

export interface Gear {
  name: string;
  ap: number; // armor piercing
  damage?: string;
  range?: string;
  rof?: number; // rate of fire
}

export interface Position {
  x: number;
  y: number;
  facing: number; // degrees
}

export interface InitiativeCard {
  rank:
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
    | 'Joker';
  suit: 'Spades' | 'Hearts' | 'Diamonds' | 'Clubs' | null;
  id: string;
}

export interface DeckState {
  id: string;
  sessionId: string;
  cards: InitiativeCard[];
  discard: InitiativeCard[];
  dealt: Record<string, InitiativeCard>; // actorId -> card
  lastJokerRound: number;
  updatedAt: string;
}

export interface ActionLog {
  id: string;
  sessionId: string;
  actorId?: string;
  ts: string;
  kind:
    | 'dice'
    | 'card'
    | 'state'
    | 'damage'
    | 'healing'
    | 'power'
    | 'movement'
    | 'vision'
    | 'manual';
  payload: Record<string, any>;
  by: string;
  seed?: string;
  hash?: string;
}

export interface DiceRoll {
  formula: string;
  results: number[][];
  wild?: number[];
  modifier: number;
  total: number;
  seed: string;
  hash: string;
}

export interface CombatState {
  sessionId: string;
  status:
    | 'idle'
    | 'round_start'
    | 'turn_active'
    | 'on_hold'
    | 'turn_resolved'
    | 'next_turn'
    | 'round_end';
  round: number;
  turn: number;
  activeActorId?: string;
  hold: string[]; // actor IDs on hold
  participants: string[]; // actor IDs in combat
}

export interface GridConfig {
  unit: 'inch' | 'meter' | 'square';
  scale: number;
  cols: number;
  rows: number;
}

export interface VisionCalibration {
  sessionId: string;
  gridCorners: Position[];
  cellSizeInches: number;
  homography: number[][]; // 3x3 transformation matrix
}

export interface AreaTemplate {
  origin: Position;
  template: 'SBT' | 'MBT' | 'LBT' | 'Cone' | 'Stream';
  angle?: number; // for cone/stream
  reach: number;
  grid: 'square' | 'hex';
  snap: boolean;
}

export interface DamageResult {
  shaken: boolean;
  woundsDelta: number;
  incapacitated: boolean;
  explanation: string;
}

export interface PowerResult {
  roll: {
    skill: string;
    total: number;
    mods: number[];
  };
  criticalFailure: boolean;
  fatigue: boolean;
  explanation: string;
}
