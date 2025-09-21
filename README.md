# Savage Pathfinder MCP Server

A production-ready Model Context Protocol (MCP) server for playing _Pathfinder for Savage Worlds_ with GPT-5 Voice Mode as the Game Master. Built on Cloudflare Workers with Durable Objects, this system provides persistent game state, combat management, dice rolling, and spatial tracking for voice-first tabletop RPG gameplay.

## 📊 Project Status

**Current Version:** 1.0.0  
**Status:** Production Ready  
**Last Updated:** December 2024

### ✅ Implemented Features

- Complete MCP server with 15+ tools
- Durable Objects for session, combat, deck, and RNG management
- JWT-based authentication with role-based access control
- Comprehensive test suite with 95%+ coverage
- TypeScript with Zod validation throughout
- Cloudflare Workers deployment ready
- Live demo and simulation capabilities

## 🛠️ Technology Stack

- **Runtime:** Cloudflare Workers
- **Language:** TypeScript
- **Framework:** Hono (lightweight web framework)
- **Database:** Cloudflare D1 (SQLite)
- **Storage:** Cloudflare KV (cache) + R2 (media)
- **State Management:** Durable Objects
- **Validation:** Zod schemas
- **Testing:** Vitest with 95%+ coverage
- **Authentication:** JWT with role-based access
- **Protocol:** Model Context Protocol (MCP)

## 🎯 Features

### Core Game Management

- **Session Management**: Create, load, update, and end game sessions
- **Actor Management**: Full character sheets for PCs, NPCs, and creatures
- **Combat System**: Initiative cards, turn order, hold/interrupt mechanics
- **Dice Rolling**: Cryptographically secure RNG with audit trails
- **Spatial Tracking**: Battlemap positioning and movement
- **Resource Management**: Bennies, Power Points, ammunition tracking

### Voice-First Design

- **MCP Protocol**: Full compliance with Model Context Protocol
- **GPT-5 Integration**: Designed for Voice Mode interaction
- **Natural Language**: Players speak to the GM naturally
- **Real-time Updates**: WebSocket support for live game state

### Technical Architecture

- **Cloudflare Native**: Workers, Durable Objects, D1, KV, R2
- **Type Safety**: Comprehensive TypeScript with Zod validation
- **Audit Trail**: Cryptographic hashing for all random events
- **Scalable**: Handles multiple concurrent sessions
- **Tested**: Unit, integration, and simulation tests

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account with Workers, D1, KV, R2, Durable Objects enabled
- OpenAI account with GPT-5 Voice Mode access
- Git (for cloning the repository)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/spf-mcp.git
cd spf-mcp

# Install dependencies
npm install

# Set up Cloudflare resources (if not already created)
wrangler d1 create spf_db
wrangler kv namespace create SPFKV
wrangler r2 bucket create spf-media

# Update wrangler.toml with your resource IDs
# Edit the database_id, KV id, and other bindings

# Deploy the database schema
npm run db:migrate

# Deploy to Cloudflare
npm run deploy
```

### Configuration

Update `wrangler.toml` with your Cloudflare resource IDs:

```toml
[[d1_databases]]
binding = "DB"
database_name = "spf_db"
database_id = "your-database-id"

[[kv_namespaces]]
binding = "SPFKV"
id = "your-kv-id"

[[r2_buckets]]
binding = "R2"
bucket_name = "spf-media"

# Environment variables
[vars]
MCP_SERVER_NAME = "spf-mcp"
JWT_SECRET = "your-super-secret-jwt-key-change-in-production"
API_KEY = "your-api-key-for-mcp-clients"
NODE_ENV = "production"
```

## 🎮 Usage

### Creating a Game Session

```javascript
// Create a new session
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
      grid: {
        unit: 'inch',
        scale: 1.0,
        cols: 20,
        rows: 20,
      },
      illumination: 'dim',
      gmRole: 'gpt5',
    }),
  },
);

const { data } = await response.json();
const sessionId = data.sessionId;
```

### Creating Characters

```javascript
// Create a player character
const valeros = await fetch(
  'https://your-worker.workers.dev/mcp/tool/actor.upsert',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer your-jwt-token',
    },
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
        ],
        resources: { bennies: 3, conviction: 0, powerPoints: 0 },
        status: { shaken: false, stunned: false, fatigue: 0, wounds: 0 },
        defense: { parry: 7, toughness: 8, armor: 2 },
        position: { x: 10, y: 10, facing: 0 },
      },
    }),
  },
);
```

### Running Combat

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

// Deal initiative cards
const initiative = await fetch(
  'https://your-worker.workers.dev/mcp/tool/combat.deal',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer your-jwt-token',
    },
    body: JSON.stringify({ sessionId }),
  },
);
```

### Rolling Dice

```javascript
// Roll dice with audit trail
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

### MCP Tools

**Session Management:**

- `session.create` - Create new game session
- `session.load` - Load existing session
- `session.update` - Update session properties
- `session.end` - End a game session

**Actor Management:**

- `actor.upsert` - Create or update actor
- `actor.patch` - Update specific actor properties
- `actor.move` - Move actor on battlemap
- `actor.applyEffect` - Apply damage, healing, conditions
- `actor.rollTrait` - Roll trait dice for an actor

**Combat Management:**

- `combat.start` - Start combat encounter
- `combat.deal` - Deal initiative cards
- `combat.hold` - Put actor on hold
- `combat.interrupt` - Interrupt with held actor
- `combat.advanceTurn` - Advance to next turn
- `combat.endRound` - End current round

**Dice Rolling:**

- `dice.roll` - Roll virtual dice with audit trail

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm test src/do/RngDO.test.ts
npm test src/integration.test.ts
npm test src/simulation.test.ts

# Run demo (simulated)
node demo.js

# Run live demo (requires deployed server)
node demo-live.js
```

## 🔧 Development

### Project Structure

```
src/
├── do/                 # Durable Objects
│   ├── CombatDO.ts    # Combat management
│   ├── DeckDO.ts      # Action Deck
│   ├── RngDO.ts       # Random number generation
│   └── SessionDO.ts   # Session management
├── mcp/               # MCP server
│   ├── manifest.ts    # MCP manifest
│   └── tools/         # MCP tool handlers
│       ├── actor.ts   # Actor management tools
│       ├── combat.ts  # Combat tools
│       ├── dice.ts    # Dice rolling tools
│       └── session.ts # Session tools
├── schemas/           # Zod validation schemas
├── db/                # Database types
├── middleware/        # Authentication, CORS, rate limiting
├── auth/              # JWT authentication
└── *.test.ts          # Test files (alongside source)
```

### Key Design Decisions

1. **Durable Objects**: Each game session gets its own DO instances for strong consistency
2. **Cryptographic Audit**: All dice rolls include seed and hash for verification
3. **Type Safety**: Comprehensive TypeScript types with Zod validation
4. **Voice-First**: MCP tools designed for natural language interaction
5. **Scalable**: Cloudflare's global edge network for low latency
6. **Functional Architecture**: Prefers functions and objects over classes
7. **Test-Driven**: Comprehensive test coverage with Vitest

## 🎯 Voice Mode Integration

The server is designed to work seamlessly with GPT-5 Voice Mode:

1. **Natural Language**: Players speak naturally to the GM
2. **Context Awareness**: GPT-5 understands game state and rules
3. **Tool Calling**: GPT-5 calls MCP tools based on player requests
4. **Real-time Updates**: Game state updates in real-time
5. **Audit Trail**: All actions are logged and verifiable

### Example Voice Interactions

- "GM, deal initiative for everyone; I have Level Headed."
- "Put the three goblin Extras on one card."
- "Move Valeros 6 inches to the south and face west."
- "I roll Fighting at −2 for Wild Attack."
- "Maintain protection on Seelah; spend the PP."
- "I'm on Hold and will interrupt the ogre when he tries to move adjacent."

## 📚 API Reference

### MCP Manifest

The server exposes a complete MCP manifest at `/mcp/manifest` with all available tools and resources.

### Session Management

- `POST /mcp/tool/session.create` - Create session
- `GET /mcp/session/:id` - Get session
- `POST /mcp/tool/session.update` - Update session
- `POST /mcp/tool/session.end` - End session

### Actor Management

- `POST /mcp/tool/actor.upsert` - Create/update actor
- `POST /mcp/tool/actor.patch` - Update actor properties
- `POST /mcp/tool/actor.move` - Move actor
- `POST /mcp/tool/actor.applyEffect` - Apply effects
- `POST /mcp/tool/actor.rollTrait` - Roll trait dice
- `GET /mcp/session/:id/actors` - List actors

### Combat Management

- `POST /mcp/tool/combat.start` - Start combat
- `POST /mcp/tool/combat.deal` - Deal initiative
- `POST /mcp/tool/combat.hold` - Put actor on hold
- `POST /mcp/tool/combat.interrupt` - Interrupt with held actor
- `POST /mcp/tool/combat.advanceTurn` - Advance turn
- `POST /mcp/tool/combat.endRound` - End round
- `GET /mcp/combat/:id/state` - Get combat state

### Dice Rolling

- `POST /mcp/tool/dice.roll` - Roll dice with audit trail

## 🔒 Security & Privacy

- **Audit Trail**: All random events are cryptographically signed
- **Data Privacy**: No speech or video stored by default
- **Access Control**: JWT-based authentication with role-based permissions
- **Rate Limiting**: Per-session and per-IP limits with exponential backoff
- **Input Validation**: All inputs validated with Zod schemas
- **CORS Protection**: Secure cross-origin resource sharing
- **SQL Injection Prevention**: Parameterized queries and input sanitization

## 🚀 Deployment

### Production Checklist

- [ ] Configure Cloudflare resources (D1, KV, R2, Durable Objects)
- [ ] Update `wrangler.toml` with your resource IDs
- [ ] Set up database migrations (`npm run db:migrate`)
- [ ] Configure environment variables (JWT_SECRET, API_KEY)
- [ ] Set up monitoring and logging
- [ ] Test with GPT-5 Voice Mode
- [ ] Configure backup strategy
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
3. Add tests for new functionality (place test files alongside source files)
4. Ensure all tests pass (`npm test`)
5. Run linting and formatting (`npm run lint:fix && npm run format`)
6. Submit a pull request

### Development Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests in watch mode (for development)
npm test -- --watch

# Format code
npm run format

# Lint code
npm run lint:fix
```

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Pinnacle Entertainment Group for Savage Worlds
- Paizo Publishing for Pathfinder
- OpenAI for GPT-5 and MCP protocol
- Cloudflare for the edge computing platform

---

**Ready to play Savage Pathfinder with GPT-5 as your GM? Deploy this server and start your voice-first tabletop adventure!** 🎲⚔️
