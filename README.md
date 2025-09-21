# Savage Pathfinder MCP Server

A production-ready Model Context Protocol (MCP) server for playing _Pathfinder for Savage Worlds_ with GPT-5 Voice Mode as the Game Master. Built on Cloudflare Workers with Durable Objects for persistent game state, combat management, and dice rolling.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account (Workers, D1, KV, R2, Durable Objects)
- OpenAI account with GPT-5 Voice Mode access

### Installation

```bash
# Clone and install
git clone https://github.com/your-username/spf-mcp.git
cd spf-mcp
npm install

# Set up Cloudflare resources
wrangler d1 create spf_db
wrangler kv namespace create SPFKV
wrangler r2 bucket create spf-media

# Deploy database schema
npm run db:migrate

# Set up secrets
wrangler secret put JWT_SECRET
wrangler secret put API_KEY

# Deploy
npm run deploy
```

### MCP Client Setup

#### Cursor IDE

```json
{
  "mcpServers": {
    "spf-mcp": {
      "command": "npm",
      "args": ["run", "mcp"],
      "env": {
        "JWT_SECRET": "your-jwt-secret",
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

#### Claude Desktop

Use `mcp-client-config.json` as reference for configuration.

## 🎮 Features

### Core Game Management

- **Session Management**: Create, load, update, and end game sessions
- **Actor Management**: Complete character sheets for PCs, NPCs, and creatures
- **Combat System**: Full Action Deck initiative with Hold/Interrupt mechanics
- **Dice Rolling**: Cryptographically secure RNG with audit trails
- **Spatial Tracking**: Battlemap positioning, movement, and area templates
- **Journal System**: Adventure logging and campaign note management

### Rules Engine

- **Damage System**: Apply damage, calculate wounds, shaken status
- **Power Casting**: Cast powers with PP costs and shorting penalties
- **Soak Rolls**: Spend Bennies to reduce damage
- **Support Tests**: Help other characters with skill tests
- **Area Templates**: Calculate coverage for Burst Templates, Cones, Streams
- **Conviction Bonuses**: +d6 per Conviction point on dice rolls
- **Multi-Action Penalties**: -2 per additional action (1-3 actions per turn)

## 🛠️ Technology Stack

- **Runtime**: Cloudflare Workers
- **Language**: TypeScript
- **Framework**: Hono
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare KV (cache) + R2 (media)
- **State Management**: Durable Objects
- **Validation**: Zod schemas
- **Testing**: Vitest with 95%+ coverage
- **Authentication**: JWT with role-based access

## 🎯 Usage Examples

### Creating a Game Session

```javascript
const response = await fetch(
  'https://your-worker.workers.dev/mcp/tool/session.create',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer your-jwt-token',
    },
    body: JSON.stringify({
      name: 'Goblin Ambush',
      grid: { unit: 'inch', scale: 1.0, cols: 20, rows: 20 },
      illumination: 'dim',
      gmRole: 'gpt5',
    }),
  },
);
```

### Rolling Dice

```javascript
const roll = await fetch('https://your-worker.workers.dev/mcp/tool/dice.roll', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer your-jwt-token',
  },
  body: JSON.stringify({
    formula: '2d6+1',
    explode: true,
    wildDie: 'd6',
  }),
});
```

### Combat Management

```javascript
// Start combat
await fetch('https://your-worker.workers.dev/mcp/tool/combat.start', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer your-jwt-token',
  },
  body: JSON.stringify({
    sessionId,
    participants: ['pc-valeros', 'pc-seoni', 'npc-goblin1'],
  }),
});

// Deal initiative
await fetch('https://your-worker.workers.dev/mcp/tool/combat.deal', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer your-jwt-token',
  },
  body: JSON.stringify({ sessionId }),
});
```

## 🧪 Testing

```bash
# Run all tests (single-run mode only)
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm test src/do/RngDO.test.ts
npm test src/integration.test.ts

# Run demo
node demo.js
```

## 🔒 Security

**Authentication Required**: JWT-based authentication with role-based access control

- **GM**: Full access to all operations
- **Player**: Limited to dice rolling and character actions
- **Observer**: Read-only access to game state

**Security Features**:

- Rate limiting (10-100 requests/minute based on operation)
- Input validation with Zod schemas
- CORS protection and security headers
- Cryptographic audit trail for all random events
- SQL injection prevention

## 🏗️ Architecture

### Durable Objects

- **SessionDO**: Manages game sessions and actors
- **CombatDO**: Handles combat state and turn order
- **DeckDO**: Manages Action Deck and initiative cards
- **RngDO**: Provides cryptographically secure random numbers

### Database Schema

- **sessions**: Game session metadata
- **actors**: Character and creature data
- **deck_states**: Action Deck state per session
- **action_logs**: Audit trail for all game actions
- **journal_entries**: Adventure journal entries
- **campaign_notes**: Campaign information

## 📚 API Reference

### Session Management

- `session.create` - Create new game session
- `session.load` - Load existing session
- `session.update` - Update session properties
- `session.end` - End game session

### Actor Management

- `actor.upsert` - Create/update actor
- `actor.patch` - Update actor properties
- `actor.move` - Move actor on battlemap
- `actor.applyEffect` - Apply effects
- `actor.rollTrait` - Roll trait dice
- `actor.spendBenny` - Spend Benny
- `actor.maintainConviction` - Maintain conviction

### Combat Management

- `combat.start` - Start combat encounter
- `combat.deal` - Deal initiative cards
- `combat.hold` - Put actor on hold
- `combat.interrupt` - Interrupt with held actor
- `combat.advanceTurn` - Advance turn
- `combat.endRound` - End round

### Rules Engine

- `rules.applyDamage` - Apply damage with calculations
- `rules.soakRoll` - Soak damage with Benny
- `rules.castPower` - Cast power with PP costs
- `rules.templateArea` - Calculate area template coverage

### Support Tools

- `support.test` - Support test for another character
- `support.testOfWill` - Test of Will
- `support.commonEdges` - Apply common edge effects

### Dice Rolling

- `dice.roll` - Roll dice with audit trail
- `dice.rollWithConviction` - Roll dice with Conviction bonuses

### Combat Enhancements

- `combat.setMultiAction` - Set multi-action penalties
- `combat.createExtrasGroup` - Create Extras group
- `combat.clearMultiAction` - Clear multi-action penalties

### Journal Management

- `journal.addEntry` - Add journal entry
- `journal.addCampaignNote` - Add campaign note
- `journal.search` - Search entries and notes
- `journal.export` - Export session data

## 🔧 Development

### Project Structure

```
src/
├── do/                 # Durable Objects
├── mcp/               # MCP server
│   ├── manifest.ts    # MCP manifest
│   └── tools/         # MCP tool handlers
├── schemas/           # Zod validation schemas
├── db/                # Database types
├── middleware/        # Authentication, CORS, rate limiting
├── auth/              # JWT authentication
└── *.test.ts          # Test files (alongside source)
```

### Code Style

- **No Classes**: Prefer functions and objects over TypeScript classes
- **Functional Programming**: Use composition over inheritance
- **Test Placement**: Place test files alongside source files (`.test.ts`)
- **No JSDoc**: Keep code self-documenting through clear naming
- **Zod Validation**: Use Zod schemas for all input/output validation

### Development Commands

```bash
# Development
npm run dev

# Testing
npm test
npm run test:coverage

# Code quality
npm run format
npm run lint:fix
npm run check
```

## 🚀 Deployment

### Production Checklist

- [ ] Configure Cloudflare resources (D1, KV, R2, Durable Objects)
- [ ] Update `wrangler.toml` with your resource IDs
- [ ] Set up database migrations (`npm run db:migrate`)
- [ ] Configure environment variables (JWT_SECRET, API_KEY)
- [ ] Test with GPT-5 Voice Mode
- [ ] Run comprehensive tests (`npm test`)

### Environment Variables

```bash
# Set in wrangler.toml [vars] section
MCP_SERVER_NAME=spf-mcp
JWT_SECRET=your-super-secret-jwt-key-change-in-production
API_KEY=your-api-key-for-mcp-clients
NODE_ENV=production
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Add tests for new functionality
4. Ensure all tests pass (`npm test`)
5. Run linting and formatting (`npm run lint:fix && npm run format`)
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Pinnacle Entertainment Group for Savage Worlds
- Paizo Publishing for Pathfinder
- OpenAI for GPT-5 and MCP protocol
- Cloudflare for the edge computing platform

---

**Ready to play Savage Pathfinder with GPT-5 as your GM? Deploy this server and start your voice-first tabletop adventure!** 🎲⚔️
