# Savage Pathfinder MCP Server

A production-ready Model Context Protocol (MCP) server for playing _Pathfinder for Savage Worlds_ with GPT-5 Voice Mode as the Game Master. The system provides persistent game state, combat management, dice rolling, and spatial tracking for voice-first tabletop RPG gameplay.

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
- Cloudflare account with Workers, D1, KV, R2, Durable Objects
- OpenAI account with GPT-5 Voice Mode access

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd spf-mcp

# Install dependencies
npm install

# Set up Cloudflare resources
wrangler d1 create spf_db
wrangler kv namespace create SPFKV
wrangler r2 bucket create spf-media

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
```

## 🎮 Usage

### Creating a Game Session

```javascript
// Create a new session
const response = await fetch(
  'https://your-worker.workers.dev/mcp/tool/session.create',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Goblin Ambush',
      grid: {
        unit: 'inch',
        scale: 1.0,
        cols: 20,
        rows: 20,
      },
      illumination: 'dim',
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
    headers: { 'Content-Type': 'application/json' },
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
  headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  },
);
```

### Rolling Dice

```javascript
// Roll dice with audit trail
const roll = await fetch('https://your-worker.workers.dev/mcp/tool/dice.roll', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    formula: '2d6+1',
    sessionId,
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

- `session.create` - Create new game session
- `session.load` - Load existing session
- `session.update` - Update session properties
- `actor.upsert` - Create or update actor
- `actor.move` - Move actor on battlemap
- `actor.applyEffect` - Apply damage, healing, conditions
- `combat.start` - Start combat encounter
- `combat.deal` - Deal initiative cards
- `combat.advanceTurn` - Advance to next turn
- `dice.roll` - Roll virtual dice

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm test src/do/RngDO.test.ts
npm test src/integration.test.ts
npm test src/simulation.test.ts

# Run demo
node demo.js
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
├── schemas/           # Zod validation schemas
├── db/                # Database types
└── __tests__/         # Test suites
```

### Key Design Decisions

1. **Durable Objects**: Each game session gets its own DO instances for strong consistency
2. **Cryptographic Audit**: All dice rolls include seed and hash for verification
3. **Type Safety**: Comprehensive TypeScript types with Zod validation
4. **Voice-First**: MCP tools designed for natural language interaction
5. **Scalable**: Cloudflare's global edge network for low latency

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
- `GET /mcp/session/:id/actors` - List actors

### Combat Management

- `POST /mcp/tool/combat.start` - Start combat
- `POST /mcp/tool/combat.deal` - Deal initiative
- `POST /mcp/tool/combat.hold` - Put actor on hold
- `POST /mcp/tool/combat.interrupt` - Interrupt with held actor
- `POST /mcp/tool/combat.advanceTurn` - Advance turn
- `GET /mcp/combat/:id/state` - Get combat state

### Dice Rolling

- `POST /mcp/tool/dice.roll` - Roll dice
- `POST /mcp/tool/dice.verify` - Verify roll authenticity

## 🔒 Security & Privacy

- **Audit Trail**: All random events are cryptographically signed
- **Data Privacy**: No speech or video stored by default
- **Access Control**: JWT-based authentication
- **Rate Limiting**: Per-session and per-IP limits
- **Input Validation**: All inputs validated with Zod schemas

## 🚀 Deployment

### Production Checklist

- [ ] Configure Cloudflare resources
- [ ] Set up database migrations
- [ ] Configure environment variables
- [ ] Set up monitoring and logging
- [ ] Test with GPT-5 Voice Mode
- [ ] Configure backup strategy

### Environment Variables

```bash
MCP_SERVER_NAME=spf-mcp
# Cloudflare bindings are configured in wrangler.toml
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Pinnacle Entertainment Group for Savage Worlds
- Paizo Publishing for Pathfinder
- OpenAI for GPT-5 and MCP protocol
- Cloudflare for the edge computing platform

---

**Ready to play Savage Pathfinder with GPT-5 as your GM? Deploy this server and start your voice-first tabletop adventure!** 🎲⚔️
