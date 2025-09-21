# Technical Specification

## Overview

The Savage Pathfinder MCP Server is a production-ready Model Context Protocol (MCP) server for playing _Pathfinder for Savage Worlds_ with GPT-5 Voice Mode as the Game Master. Built on Cloudflare Workers with Durable Objects for persistent game state management.

## Architecture

### Core Components

```
Players (Voice) → GPT-5 Voice Mode → MCP Server → Cloudflare Workers
                                                      ├── Durable Objects (State)
                                                      ├── D1 Database (Persistence)
                                                      ├── KV Store (Cache)
                                                      └── R2 Storage (Media)
```

### Durable Objects

- **SessionDO**: Manages game sessions and actors
- **CombatDO**: Handles combat state and turn order
- **DeckDO**: Manages Action Deck and initiative cards
- **RngDO**: Provides cryptographically secure random numbers

### Database Schema

```sql
-- Core tables
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  gridUnit TEXT, gridScale REAL, cols INTEGER, rows INTEGER,
  illumination TEXT,
  createdAt TEXT, updatedAt TEXT
);

CREATE TABLE actors (
  id TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  wildCard INTEGER NOT NULL,
  traits TEXT NOT NULL,        -- JSON
  skills TEXT NOT NULL,        -- JSON
  resources TEXT NOT NULL,     -- JSON
  status TEXT NOT NULL,        -- JSON
  defense TEXT NOT NULL,       -- JSON
  position TEXT,               -- JSON
  FOREIGN KEY(sessionId) REFERENCES sessions(id)
);

CREATE TABLE deck_states (
  id TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL,
  cards TEXT NOT NULL,        -- JSON array (undealt)
  discard TEXT NOT NULL,      -- JSON array (spent)
  dealt TEXT NOT NULL,        -- JSON map actorId → card
  lastJokerRound INTEGER,
  updatedAt TEXT
);

CREATE TABLE action_logs (
  id TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL,
  actorId TEXT,
  ts TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  by TEXT NOT NULL,
  seed TEXT,
  hash TEXT
);
```

## MCP Protocol Implementation

### Transport

- HTTP POST for tool calls (`/mcp/tool/<name>`)
- WebSocket for bidirectional events (`/mcp/ws`)
- All calls include `sessionId` and `requestId` headers

### Resources (GET)

- `resource:session.get` → `GET /mcp/session/:id`
- `resource:actors.list` → `GET /mcp/session/:id/actors`
- `resource:combat.state` → `GET /mcp/session/:id/combat`
- `resource:deck.state` → `GET /mcp/session/:id/deck`

### Tools (POST)

#### Session Management

- `session.create` - Create new game session
- `session.load` - Load existing session
- `session.update` - Update session properties
- `session.end` - End game session

#### Actor Management

- `actor.upsert` - Create/update actor
- `actor.patch` - Update actor properties
- `actor.move` - Move actor on battlemap
- `actor.applyEffect` - Apply effects
- `actor.rollTrait` - Roll trait dice
- `actor.spendBenny` - Spend Benny
- `actor.maintainConviction` - Maintain conviction

#### Combat Management

- `combat.start` - Start combat encounter
- `combat.deal` - Deal initiative cards
- `combat.hold` - Put actor on hold
- `combat.interrupt` - Interrupt with held actor
- `combat.advanceTurn` - Advance turn
- `combat.endRound` - End round

#### Rules Engine

- `rules.applyDamage` - Apply damage with calculations
- `rules.soakRoll` - Soak damage with Benny
- `rules.castPower` - Cast power with PP costs
- `rules.templateArea` - Calculate area template coverage

#### Support Tools

- `support.test` - Support test for another character
- `support.testOfWill` - Test of Will
- `support.commonEdges` - Apply common edge effects

#### Dice Rolling

- `dice.roll` - Roll dice with audit trail
- `dice.rollWithConviction` - Roll dice with Conviction bonuses

#### Combat Enhancements

- `combat.setMultiAction` - Set multi-action penalties
- `combat.createExtrasGroup` - Create Extras group
- `combat.clearMultiAction` - Clear multi-action penalties

#### Journal Management

- `journal.addEntry` - Add journal entry
- `journal.addCampaignNote` - Add campaign note
- `journal.search` - Search entries and notes
- `journal.export` - Export session data

## Combat Engine

### State Machine

`idle → round_start → turn_active(actor) ↔ on_hold* → turn_resolved → next_turn → round_end → round_start`

### Initiative System

- 54-card Action Deck with Jokers
- Wild Cards get individual cards
- Extras can be grouped to share cards
- Suit tiebreakers: Spades, Hearts, Diamonds, Clubs
- Jokers grant +2 to Trait & damage and may act anytime
- Auto-shuffle after any round where a Joker appears

### Hold/Interrupt Mechanics

- Actors can move to `on_hold` to interrupt later
- Opposed check resolved on interrupt
- Single active actor enforced by CombatDO

## Security

### Authentication

- JWT-based authentication required
- Role-based access control (GM, Player, Observer)
- Token expiration (24 hours)

### Rate Limiting

- Session Operations: 10 requests/minute
- Dice Rolling: 50 requests/minute
- Combat Actions: 30 requests/minute
- General API: 100 requests/minute

### Input Validation

- Zod schemas for all inputs
- XSS and SQL injection prevention
- UUID format validation

## Testing Strategy

### Test Coverage

- **Unit Tests**: Individual Durable Objects and MCP tools
- **Integration Tests**: End-to-end MCP tool workflows
- **Simulation Tests**: Complete combat scenarios and session lifecycles
- **Property Tests**: RNG fairness and statistical validation
- **Concurrency Tests**: Multi-client scenarios and race condition prevention
- **Performance Tests**: Load testing and latency measurements

### Test Organization

- Tests placed alongside source files (`.test.ts`)
- No `__tests__` directories
- Comprehensive coverage of all MCP tools and Durable Objects
- Property-based testing for RNG and deck shuffling

## Deployment

### Cloudflare Setup

```bash
# Create resources
wrangler d1 create spf_db
wrangler kv namespace create SPFKV
wrangler r2 bucket create spf-media

# Deploy
npm run deploy
npm run db:migrate

# Set secrets
wrangler secret put JWT_SECRET
wrangler secret put API_KEY
```

### Environment Variables

```bash
MCP_SERVER_NAME=spf-mcp
JWT_SECRET=your-super-secret-jwt-key-change-in-production
API_KEY=your-api-key-for-mcp-clients
NODE_ENV=production
```

## Performance

### Scalability

- Cloudflare's global edge network for low latency
- Durable Objects provide strong consistency
- KV store for hot reads and caching
- R2 for media storage and backups

### Monitoring

- Structured logs with per-tool timing
- Worker traces for debugging
- Health endpoints (`/healthz`, `/readyz`)
- Synthetic roll/deal tests

## Future Enhancements

- **Cloudflare Calls**: WebRTC relay for multi-camera rooms
- **Semantic Scene Memory**: Narrative recap pinned to session timeline
- **Adventure Module Importer**: Encounters → seeded actors & terrain
- **Safety Sandbox**: "Dry-run" mode for rules testing
- **Enhanced Vision**: Camera-based dice recognition and miniature tracking
- **Advanced Analytics**: Game statistics and performance metrics
