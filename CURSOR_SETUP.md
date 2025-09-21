# 🎲 Savage Pathfinder MCP Integration with Cursor

This guide will help you integrate the Savage Pathfinder MCP server with Cursor so you can interact with the tabletop gaming system directly from the AI chat.

## 🔒 **SECURITY NOTICE**

**The MCP server now requires authentication!** You must obtain an API key and configure authentication before using the server.

## 🚀 Quick Setup

### Step 1: Get API Access

Contact the server administrator to obtain:

- **API Key**: For authenticating MCP clients
- **JWT Secret**: For token generation (if running locally)

### Step 2: Configure Cursor MCP Settings

1. Open Cursor
2. Go to **Settings** → **Features** → **MCP**
3. Add the following configuration to your MCP settings:

```json
{
  "mcpServers": {
    "savage-pathfinder": {
      "command": "node",
      "args": ["/Users/robertgilks/Source/spf-mcp/mcp-proxy.js"],
      "env": {
        "SPF_SERVER_URL": "https://spf-mcp.rob-gilks.workers.dev",
        "API_KEY": "your-api-key-here",
        "JWT_TOKEN": "optional-pre-generated-token"
      }
    }
  }
}
```

### Step 3: Restart Cursor

After adding the configuration, restart Cursor to load the MCP server.

### Step 4: Test the Integration

Once Cursor restarts, you should be able to use the Savage Pathfinder tools directly in chat. Try asking:

- "Create a new game session called 'Goblin Ambush'"
- "Roll 2d6+3 for damage"
- "Create a fighter character named Valeros"

## 🎯 Available Tools

The MCP server provides these tools for tabletop gaming:

### Session Management

- `session.create` - Create new game sessions
- `session.load` - Load existing sessions
- `session.update` - Update session properties
- `session.end` - End game sessions

### Actor Management

- `actor.upsert` - Create/update characters and NPCs
- `actor.patch` - Update specific actor properties
- `actor.move` - Move actors on the battlemap
- `actor.applyEffect` - Apply damage, healing, conditions
- `actor.rollTrait` - Roll trait dice for characters

### Combat System

- `combat.start` - Start combat encounters
- `combat.deal` - Deal initiative cards
- `combat.hold` - Put actors on hold
- `combat.interrupt` - Handle interrupts
- `combat.advanceTurn` - Advance combat turns
- `combat.endRound` - End combat rounds

### Dice Rolling

- `dice.roll` - Roll virtual dice with cryptographic security

## 🎮 Example Usage

Here are some example commands you can try once the integration is set up:

### Creating a Game Session

```
Create a new Savage Worlds session called "Rise of the Runelords" with a 25x25 grid
```

### Rolling Dice

```
Roll 1d20 for an attack roll
Roll 2d6+3 for damage
Roll 4d6 and keep the highest 3 for stats
```

### Creating Characters

```
Create a human fighter named Valeros with:
- Agility d8, Smarts d6, Spirit d6, Strength d10, Vigor d8
- Fighting d10, Shooting d6, Notice d6
- 3 Bennies, Parry 7, Toughness 8
```

### Combat Management

```
Start combat with Valeros and two goblins
Deal initiative cards to all participants
Advance to the next turn in combat
```

## 🔧 Troubleshooting

### MCP Server Not Loading

- Check that Node.js is installed and accessible
- Verify the file path in the configuration is correct
- Check Cursor's MCP logs for error messages

### Connection Issues

- Ensure the deployed server is running: https://spf-mcp.rob-gilks.workers.dev/mcp/manifest
- Check your internet connection
- Verify the server URL in the environment variables

### Tool Errors

- Some tools may fail if actors haven't been created yet
- Combat tools require active sessions and participants
- Check the error messages for specific requirements

## 🌟 Advanced Features

### Cryptographic Dice Rolling

All dice rolls include cryptographic verification:

- Unique seed for each roll
- SHA-256 hash for verification
- Tamper-proof audit trail

### Real-time Combat

- Initiative system using Action Deck
- Hold and interrupt mechanics
- Turn-based progression
- Status effect tracking

### Character Management

- Full Savage Worlds character sheets
- Equipment and gear tracking
- Wounds, Fatigue, Power Points
- Bennies and Conviction

## 🎉 What You Can Do

Once integrated, you can:

1. **Run entire game sessions** through Cursor chat
2. **Create and manage characters** with full stat blocks
3. **Roll dice** with cryptographic security
4. **Manage combat encounters** with initiative and turns
5. **Track resources** like Bennies, Power Points, and conditions
6. **Move characters** on virtual battlemaps
7. **Apply effects** like damage, healing, and status conditions

The AI will have access to all these tools and can help you:

- Create balanced encounters
- Generate NPCs on the fly
- Manage complex combat scenarios
- Track multiple character sheets
- Ensure rule compliance
- Calculate damage and effects automatically

## 🚀 Ready to Play!

Your Savage Pathfinder MCP server is now integrated with Cursor. You can run entire tabletop gaming sessions directly through the AI chat interface!

Try starting with: **"Let's create a new Savage Worlds adventure!"**
