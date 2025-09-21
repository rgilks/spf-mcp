// Database types for Savage Pathfinder
export interface Session {
  id: string;
  name: string;
  status: string;
  rulesetVersion?: string;
  initiativeDeckId?: string;
  rngId?: string;
  round: number;
  turn: number;
  activeActorId?: string;
  gridUnit?: string;
  gridScale?: number;
  cols?: number;
  rows?: number;
  illumination?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Actor {
  id: string;
  sessionId: string;
  type: string;
  name: string;
  wildCard: number;
  traits: string;
  skills: string;
  edges?: string;
  hindrances?: string;
  powers?: string;
  resources: string;
  status: string;
  defense: string;
  gear?: string;
  position?: string;
  reach: number;
  size: number;
}

export interface DeckState {
  id: string;
  sessionId: string;
  cards: string;
  discard: string;
  dealt: string;
  lastJokerRound: number;
  updatedAt: string;
}

export interface ActionLog {
  id: string;
  sessionId: string;
  actorId?: string;
  ts: string;
  kind: string;
  payload: string;
  by: string;
  seed?: string;
  hash?: string;
}
