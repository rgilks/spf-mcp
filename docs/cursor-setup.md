# Cursor Integration Guide

## 🚀 Quick Setup

### Step 1: Get API Access

Contact the server administrator to obtain your API key.

### Step 2: Configure Cursor MCP Settings

1. Open Cursor
2. Go to **Settings** → **Features** → **MCP**
3. Add this configuration:

```json
{
  "mcpServers": {
    "spf-mcp": {
      "command": "npm",
      "args": ["run", "mcp"],
      "env": {
        "JWT_SECRET": "your-jwt-secret-here",
        "API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Step 3: Restart Cursor

Restart Cursor to load the MCP server.

### Step 4: Test the Integration

Try these commands in Cursor chat:

- "Create a new game session called 'Goblin Ambush'"
- "Roll 2d6+3 for damage"
- "Create a fighter character named Valeros"

## 🎯 Available Tools

The MCP server provides 30+ tools for comprehensive tabletop gaming:

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
- `actor.spendBenny` - Spend Bennies
- `actor.maintainConviction` - Maintain conviction

### Combat System

- `combat.start` - Start combat encounters
- `combat.deal` - Deal initiative cards
- `combat.hold` - Put actors on hold
- `combat.interrupt` - Handle interrupts
- `combat.advanceTurn` - Advance combat turns
- `combat.endRound` - End combat rounds

### Rules Engine

- `rules.applyDamage` - Apply damage with calculations
- `rules.soakRoll` - Soak damage with Bennies
- `rules.castPower` - Cast powers with PP costs
- `rules.templateArea` - Calculate area templates

### Support Tools

- `support.test` - Help other characters
- `support.testOfWill` - Test of Will
- `support.commonEdges` - Apply edge effects

### Dice Rolling

- `dice.roll` - Roll virtual dice with cryptographic security
- `dice.rollWithConviction` - Roll dice with Conviction bonuses

### Combat Enhancements

- `combat.setMultiAction` - Set multi-action penalties
- `combat.createExtrasGroup` - Group Extras for shared initiative
- `combat.clearMultiAction` - Clear multi-action penalties

### Journal Management

- `journal.addEntry` - Add journal entries (combat, exploration, social, etc.)
- `journal.addCampaignNote` - Add campaign notes (NPCs, locations, plot, etc.)
- `journal.search` - Search across journal entries and campaign notes
- `journal.export` - Export session data to JSON/Markdown

## 🎮 Example Usage

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

### Advanced Combat Features

```
Set Valeros to take 2 actions this turn (multi-action penalty)
Group the three goblin Extras to share one initiative card
Clear multi-action penalties for Valeros
```

### Journal and Campaign Tracking

```
Add a journal entry: "Combat Round 3: Valeros deals 8 damage to Goblin Chief"
Add a campaign note about the NPC "Goblin Chief - wounded, retreating"
Search for all combat entries involving Valeros
Export the session data to markdown
```

### Conviction Bonuses

```
Roll Fighting with 2 Conviction points (adds 2d6 to the roll)
Roll damage with Conviction bonus
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
