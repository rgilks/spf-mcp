# Savage Pathfinder MCP Server Specification

This document outlines the complete specification for the Savage Pathfinder MCP (Model Context Protocol) server.

## Overview

The spf-mcp server provides a Cloudflare Worker-based MCP server for Savage Pathfinder Voice GM, enabling AI assistants to interact with game sessions, manage actors, handle combat, and perform dice rolls.

## Architecture

- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare KV (session data), R2 (media files)
- **State Management**: Durable Objects for real-time game state
- **API**: Hono framework with MCP protocol compliance

## Database Schema

### Sessions Table

- `id` (TEXT PRIMARY KEY): Unique session identifier
- `name` (TEXT NOT NULL): Human-readable session name
- `status` (TEXT NOT NULL DEFAULT 'lobby'): Current session state
- `rulesetVersion` (TEXT): Savage Pathfinder ruleset version
- `initiativeDeckId` (TEXT): Reference to initiative deck
- `rngId` (TEXT): Reference to RNG state
- `round` (INTEGER DEFAULT 0): Current combat round
- `turn` (INTEGER DEFAULT 0): Current turn within round
- `activeActorId` (TEXT): Currently active actor
- `gridUnit` (TEXT): Grid measurement unit
- `gridScale` (REAL): Grid scale factor
- `cols` (INTEGER): Grid columns
- `rows` (INTEGER): Grid rows
- `illumination` (TEXT): Lighting conditions
- `createdAt` (TEXT DEFAULT CURRENT_TIMESTAMP)
- `updatedAt` (TEXT DEFAULT CURRENT_TIMESTAMP)

### Actors Table

- `id` (TEXT PRIMARY KEY): Unique actor identifier
- `sessionId` (TEXT NOT NULL): Parent session reference
- `type` (TEXT NOT NULL): Actor type (PC, NPC, etc.)
- `name` (TEXT NOT NULL): Actor name
- `wildCard` (INTEGER NOT NULL DEFAULT 1): Wild card status
- `traits` (TEXT NOT NULL): JSON-encoded traits
- `skills` (TEXT NOT NULL): JSON-encoded skills
- `edges` (TEXT): JSON-encoded edges
- `hindrances` (TEXT): JSON-encoded hindrances
- `powers` (TEXT): JSON-encoded powers
- `resources` (TEXT NOT NULL): JSON-encoded resources
- `status` (TEXT NOT NULL): Current status
- `defense` (TEXT NOT NULL): Defense values
- `gear` (TEXT): JSON-encoded equipment
- `position` (TEXT): Grid position
- `reach` (INTEGER DEFAULT 1): Melee reach
- `size` (INTEGER DEFAULT 0): Size modifier

### Deck States Table

- `id` (TEXT PRIMARY KEY): Unique deck identifier
- `sessionId` (TEXT NOT NULL): Parent session reference
- `cards` (TEXT NOT NULL): JSON-encoded deck
- `discard` (TEXT NOT NULL): JSON-encoded discard pile
- `dealt` (TEXT NOT NULL): JSON-encoded dealt cards
- `lastJokerRound` (INTEGER DEFAULT -1): Last joker round
- `updatedAt` (TEXT DEFAULT CURRENT_TIMESTAMP)

### Action Logs Table

- `id` (TEXT PRIMARY KEY): Unique log entry identifier
- `sessionId` (TEXT NOT NULL): Parent session reference
- `actorId` (TEXT): Actor who performed action
- `ts` (TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP): Timestamp
- `kind` (TEXT NOT NULL): Action type
- `payload` (TEXT NOT NULL): JSON-encoded action data
- `by` (TEXT NOT NULL): User who initiated action
- `seed` (TEXT): Random seed for reproducibility
- `hash` (TEXT): Cryptographic hash for verification

## MCP Tools

### dice.roll

Roll virtual dice with exploding and optional wild die support.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "formula": { "type": "string" },
    "explode": { "type": "boolean", "default": true },
    "wildDie": { "type": ["string", "null"], "default": null },
    "seed": { "type": ["string", "null"] }
  },
  "required": ["formula"]
}
```

**Example:**

```json
{
  "formula": "2d6+1",
  "explode": true,
  "wildDie": "d6"
}
```

## MCP Resources

### session.get

Retrieve session information by ID.

**Path:** `/mcp/session/{id}`

### actors.list

List all actors in a session.

**Path:** `/mcp/session/{id}/actors`

## Durable Objects

### CombatDO

Manages real-time combat state, initiative order, and turn management.

### DeckDO

Handles card deck operations including shuffling, dealing, and tracking.

### RngDO

Provides cryptographically secure random number generation with audit trails.

### SessionDO

Manages session state, actor coordination, and real-time updates.

## API Endpoints

- `GET /healthz` - Health check
- `GET /mcp/manifest` - MCP server manifest
- `POST /mcp/tool/dice.roll` - Dice rolling tool

## Development

### Prerequisites

- Node.js 20+
- npm
- Cloudflare account
- Wrangler CLI

### Setup

1. Clone repository
2. Run `npm install`
3. Configure Cloudflare bindings in `wrangler.toml`
4. Run `npm run db:migrate` to set up database
5. Run `npm run dev` for local development

### Testing

- `npm test` - Run test suite
- `npm run check` - TypeScript compilation check
- `npm run lint` - ESLint check
- `npm run format` - Prettier formatting

### Deployment

- `npm run deploy` - Deploy to Cloudflare Workers
- GitHub Actions automatically deploys on main branch push

## Security Considerations

- All random number generation uses cryptographically secure methods
- Action logs include cryptographic hashes for verification
- Database queries use parameterized statements
- CORS is configured for appropriate origins

## Future Enhancements

- Additional MCP tools for session management
- Real-time WebSocket support for live updates
- Advanced combat mechanics
- Character sheet management
- Campaign persistence across sessions
