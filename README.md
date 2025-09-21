# Savage Pathfinder MCP Server

A production-ready Model Context Protocol (MCP) server for playing _Pathfinder for Savage Worlds_ with GPT-5 Voice Mode as the Game Master. Built on Cloudflare Workers with Durable Objects, this system provides persistent game state, combat management, dice rolling, and spatial tracking for voice-first tabletop RPG gameplay.

## 📊 Project Status

**Current Version:** 1.0.0  
**Status:** Production Ready  
**Last Updated:** December 2024

### ✅ Implemented Features

- **Complete MCP Server**: 30+ tools for comprehensive tabletop gaming
- **Durable Objects**: Session, combat, deck, and RNG management with strong consistency
- **Authentication**: JWT-based with role-based access control (GM, Player, Observer)
- **Combat Engine**: Full Action Deck initiative system with Hold/Interrupt mechanics
- **Dice System**: Cryptographically secure RNG with audit trails and verification
- **Actor Management**: Complete character sheets with traits, skills, edges, powers
- **Spatial Tracking**: Battlemap positioning, movement, and area templates
- **Rules Engine**: Damage calculation, power casting, soak rolls, and support tests
- **Journal System**: Adventure logging and campaign note management
- **Multi-Action Support**: Track multi-action penalties (-2 per additional action)
- **Extras Grouping**: Group Extras to share initiative cards
- **Conviction Bonuses**: +d6 per Conviction point on dice rolls
- **Auto-Generated Logs**: System automatically creates journal entries for game events
- **Test Suite**: 95%+ coverage with unit, integration, and simulation tests
- **TypeScript**: Full type safety with Zod validation throughout

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

- **Session Management**: Create, load, update, and end game sessions with grid configuration
- **Actor Management**: Complete character sheets for PCs, NPCs, and creatures with traits, skills, edges, powers
- **Combat System**: Full Action Deck initiative with Jokers, Hold/Interrupt mechanics, turn order
- **Dice Rolling**: Cryptographically secure RNG with audit trails and verification
- **Spatial Tracking**: Battlemap positioning, movement, facing, and area templates
- **Resource Management**: Bennies, Power Points, ammunition, conviction tracking
- **Journal System**: Adventure logging with combat, exploration, social, and narrative entries
- **Campaign Notes**: Track NPCs, locations, plot points, loot, and clues
- **Multi-Action Tracking**: Support for 1-3 actions per turn with proper penalties
- **Extras Grouping**: Group Extras to share initiative cards for faster combat

### Rules Engine

- **Damage System**: Apply damage, calculate wounds, shaken status, and incapacitation
- **Power Casting**: Cast powers with PP costs, shorting penalties, and maintenance
- **Soak Rolls**: Spend Bennies to reduce damage with proper calculations
- **Support Tests**: Help other characters with skill tests
- **Area Templates**: Calculate coverage for Small/Medium/Large Burst Templates, Cones, Streams
- **Conviction Bonuses**: +d6 per Conviction point added to all trait and damage rolls
- **Multi-Action Penalties**: -2 per additional action (1-3 actions per turn)
- **Extras Management**: Group Extras to share initiative cards

### Voice-First Design

- **MCP Protocol**: Full compliance with Model Context Protocol
- **GPT-5 Integration**: Designed for Voice Mode interaction
- **Natural Language**: Players speak to the GM naturally
- **Real-time Updates**: Live game state synchronization

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
- MCP client (Claude Desktop, Cursor, or custom MCP client)

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

# Set up MCP secrets (required for MCP server)
wrangler secret put JWT_SECRET
wrangler secret put API_KEY
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

### MCP Client Setup

#### For Cursor IDE

1. Copy `cursor-mcp-server.json` to your Cursor MCP configuration
2. Update the environment variables with your actual secrets
3. Restart Cursor to load the MCP server

#### For Claude Desktop

1. Add the server configuration to your Claude Desktop MCP settings
2. Use the `mcp-client-config.json` as a reference

#### Running the MCP Server Directly

```bash
# Run MCP server in development mode
npm run mcp:dev

# Run MCP server in production mode
npm run mcp
```

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
- **journal_entries**: Adventure journal entries (combat, exploration, social, etc.)
- **campaign_notes**: Campaign information (NPCs, locations, plot, loot, clues)

### MCP Tools

**Session Management:**

- `session.create` - Create new game session with grid configuration
- `session.load` - Load existing session with full state
- `session.update` - Update session properties (status, round, turn, etc.)
- `session.end` - End a game session with optional reason

**Actor Management:**

- `actor.upsert` - Create or update complete actor (PC, NPC, creature)
- `actor.patch` - Update specific actor properties
- `actor.move` - Move actor on battlemap with facing
- `actor.applyEffect` - Apply damage, healing, conditions, resource changes
- `actor.rollTrait` - Roll trait dice for an actor with modifiers
- `actor.spendBenny` - Spend a Benny for various purposes
- `actor.maintainConviction` - Maintain conviction with PP cost

**Combat Management:**

- `combat.start` - Start combat encounter with participants
- `combat.deal` - Deal initiative cards (supports Level Headed, Quick edges)
- `combat.hold` - Put actor on hold for interrupts
- `combat.interrupt` - Interrupt with held actor
- `combat.advanceTurn` - Advance to next turn in initiative order
- `combat.endRound` - End current round (auto-shuffle if Joker dealt)

**Dice & RNG:**

- `dice.roll` - Roll virtual dice with exploding, wild die, audit trail
- `dice.rollWithConviction` - Roll dice with Conviction bonuses (+d6 per point)

**Combat Enhancements:**

- `combat.setMultiAction` - Set multi-action penalties for an actor
- `combat.createExtrasGroup` - Create group of Extras sharing initiative
- `combat.clearMultiAction` - Clear multi-action penalties

**Journal Management:**

- `journal.addEntry` - Add journal entry (combat, exploration, social, etc.)
- `journal.addCampaignNote` - Add campaign note (NPCs, locations, plot, etc.)
- `journal.search` - Search across journal entries and campaign notes
- `journal.export` - Export session data to JSON/Markdown

**Rules Engine:**

- `rules.applyDamage` - Calculate and apply damage with wound/shaken status
- `rules.soakRoll` - Spend Benny to reduce damage
- `rules.castPower` - Cast powers with PP costs and shorting penalties
- `rules.templateArea` - Calculate area template coverage

**Support Tools:**

- `support.test` - Help another character with skill test
- `support.testOfWill` - Test of Will against fear, intimidation
- `support.commonEdges` - Apply common edge effects

## 🧪 Testing

The project includes a comprehensive test suite with 95%+ coverage:

```bash
# Run all tests (single-run mode only)
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

### Test Categories

- **Unit Tests**: Individual Durable Objects and MCP tools
- **Integration Tests**: End-to-end MCP tool workflows
- **Simulation Tests**: Complete combat scenarios and session lifecycles
- **Property Tests**: RNG fairness and statistical validation
- **Concurrency Tests**: Multi-client scenarios and race condition prevention
- **Rules Tests**: Savage Worlds mechanics validation
- **Performance Tests**: Load testing and latency measurements

### Test Organization

- Tests are placed alongside source files (`.test.ts`)
- No `__tests__` directories - follows project conventions
- Comprehensive coverage of all MCP tools and Durable Objects
- Property-based testing for RNG and deck shuffling

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

### Health Endpoints

- `GET /healthz` - Health check with database connectivity
- `GET /readyz` - Readiness check
- `GET /mcp/manifest` - MCP server manifest

### Authentication

- `POST /auth/token` - Generate JWT token with API key
- `POST /auth/refresh` - Refresh JWT token

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
- `POST /mcp/tool/actor.spendBenny` - Spend Benny
- `POST /mcp/tool/actor.maintainConviction` - Maintain conviction
- `GET /mcp/session/:id/actors` - List actors

### Combat Management

- `POST /mcp/tool/combat.start` - Start combat
- `POST /mcp/tool/combat.deal` - Deal initiative
- `POST /mcp/tool/combat.hold` - Put actor on hold
- `POST /mcp/tool/combat.interrupt` - Interrupt with held actor
- `POST /mcp/tool/combat.advanceTurn` - Advance turn
- `POST /mcp/tool/combat.endRound` - End round
- `GET /mcp/combat/:id/state` - Get combat state

### Rules Engine

- `POST /mcp/tool/rules.applyDamage` - Apply damage with calculations
- `POST /mcp/tool/rules.soakRoll` - Soak damage with Benny
- `POST /mcp/tool/rules.castPower` - Cast power with PP costs
- `POST /mcp/tool/rules.templateArea` - Calculate area template coverage

### Support Tools

- `POST /mcp/tool/support.test` - Support test for another character
- `POST /mcp/tool/support.testOfWill` - Test of Will
- `POST /mcp/tool/support.commonEdges` - Apply common edge effects

### Dice Rolling

- `POST /mcp/tool/dice.roll` - Roll dice with audit trail
- `POST /mcp/tool/dice.rollWithConviction` - Roll dice with Conviction bonuses

### Combat Enhancements

- `POST /mcp/tool/combat.setMultiAction` - Set multi-action penalties
- `POST /mcp/tool/combat.createExtrasGroup` - Create Extras group
- `POST /mcp/tool/combat.clearMultiAction` - Clear multi-action penalties

### Journal Management

- `POST /mcp/tool/journal.addEntry` - Add journal entry
- `POST /mcp/tool/journal.addCampaignNote` - Add campaign note
- `POST /mcp/tool/journal.search` - Search entries and notes
- `GET /mcp/journal/:id/entries` - Get journal entries
- `GET /mcp/journal/:id/campaignNotes` - Get campaign notes
- `GET /mcp/journal/:id/export` - Export session data

## 🔒 Security & Privacy

- **Authentication Required**: JWT-based authentication with role-based access control
- **Role-Based Access**: GM (full access), Player (limited), Observer (read-only)
- **Audit Trail**: All random events are cryptographically signed and verifiable
- **Data Privacy**: No speech or video stored by default
- **Rate Limiting**: Per-session and per-IP limits with exponential backoff
- **Input Validation**: All inputs validated with Zod schemas
- **CORS Protection**: Secure cross-origin resource sharing
- **SQL Injection Prevention**: Parameterized queries and input sanitization

### Getting Access

1. **Obtain API Key**: Contact server administrator for API key
2. **Generate JWT Token**: Use API key to generate JWT with appropriate role
3. **Include in Requests**: Add `Authorization: Bearer <token>` header to all requests

See [docs/SECURITY.md](docs/SECURITY.md) for detailed security information.

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

# Run tests (single-run mode only)
npm test

# Run tests with coverage
npm run test:coverage

# Format code
npm run format

# Lint code
npm run lint:fix

# Type check
npm run check
```

### Code Style Guidelines

- **No Classes**: Prefer functions and objects over TypeScript classes
- **Functional Programming**: Use composition over inheritance
- **Test Placement**: Place test files alongside source files (`.test.ts`)
- **No JSDoc**: Keep code self-documenting through clear naming
- **Zod Validation**: Use Zod schemas for all input/output validation

## 📚 Documentation

- **README.md** - This file: Setup, usage, and API reference
- **docs/spec.md** - Technical specification for developers
- **docs/SECURITY.md** - Security and authentication details
- **docs/CURSOR_SETUP.md** - Cursor integration guide

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Pinnacle Entertainment Group for Savage Worlds
- Paizo Publishing for Pathfinder
- OpenAI for GPT-5 and MCP protocol
- Cloudflare for the edge computing platform

---

**Ready to play Savage Pathfinder with GPT-5 as your GM? Deploy this server and start your voice-first tabletop adventure!** 🎲⚔️
