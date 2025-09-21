#!/usr/bin/env node

/**
 * Savage Pathfinder MCP Server Demo
 * Demonstrates both simulated and live functionality
 */

const DEPLOYED_URL = 'https://spf-mcp.rob-gilks.workers.dev';

// HTTP Client for live demos
class HttpClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return { response, data };
  }

  async post(endpoint, body, options = {}) {
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    });
  }

  async get(endpoint, options = {}) {
    return this.makeRequest(endpoint, {
      method: 'GET',
      ...options,
    });
  }
}

// Logger
const logger = {
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  info: (msg) => console.log(`ℹ️  ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  step: (msg) => console.log(`\n🎯 ${msg}`),
};

// Demo data
const demoSession = {
  id: 'demo-session-123',
  name: 'Goblin Ambush',
  status: 'lobby',
  grid: { unit: 'inch', scale: 1.0, cols: 20, rows: 20 },
  illumination: 'dim',
};

const demoActors = {
  valeros: {
    id: 'pc-valeros',
    name: 'Valeros',
    type: 'pc',
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
      { name: 'Notice', die: 'd6' },
    ],
    resources: { bennies: 3, conviction: 0, powerPoints: 0 },
    status: { shaken: false, stunned: false, fatigue: 0, wounds: 0 },
    defense: { parry: 7, toughness: 8, armor: 2 },
    position: { x: 10, y: 10, facing: 0 },
  },
  seoni: {
    id: 'pc-seoni',
    name: 'Seoni',
    type: 'pc',
    wildCard: true,
    traits: {
      Agility: 'd6',
      Smarts: 'd10',
      Spirit: 'd8',
      Strength: 'd6',
      Vigor: 'd6',
    },
    skills: [
      { name: 'Spellcasting', die: 'd10' },
      { name: 'Notice', die: 'd8' },
      { name: 'Persuasion', die: 'd6' },
    ],
    resources: { bennies: 3, conviction: 0, powerPoints: 10 },
    status: { shaken: false, stunned: false, fatigue: 0, wounds: 0 },
    defense: { parry: 4, toughness: 5, armor: 0 },
    position: { x: 12, y: 10, facing: 0 },
  },
  goblin: {
    id: 'npc-goblin1',
    name: 'Goblin Warrior',
    type: 'npc',
    wildCard: false,
    traits: {
      Agility: 'd8',
      Smarts: 'd4',
      Spirit: 'd6',
      Strength: 'd6',
      Vigor: 'd6',
    },
    skills: [
      { name: 'Fighting', die: 'd6' },
      { name: 'Shooting', die: 'd6' },
      { name: 'Stealth', die: 'd8' },
    ],
    resources: { bennies: 1, conviction: 0, powerPoints: 0 },
    status: { shaken: false, stunned: false, fatigue: 0, wounds: 0 },
    defense: { parry: 5, toughness: 5, armor: 1 },
    position: { x: 15, y: 15, facing: 180 },
  },
};

// Simulate dice roll
function simulateDiceRoll(formula) {
  const match = formula.match(/(\d+)d(\d+)([+-]\d+)?/);
  if (!match) return { total: 0, rolls: [] };

  const [, numDice, dieSize, modifier] = match;
  const rolls = [];
  let total = 0;

  for (let i = 0; i < parseInt(numDice); i++) {
    const roll = Math.floor(Math.random() * parseInt(dieSize)) + 1;
    rolls.push(roll);
    total += roll;
  }

  if (modifier) {
    total += parseInt(modifier);
  }

  return { total, rolls, modifier: modifier ? parseInt(modifier) : 0 };
}

// Simulate combat
function simulateCombat() {
  logger.step('Simulating Combat Encounter');

  logger.info('Dealing initiative cards...');
  const initiative = [
    { actor: 'Valeros', card: 'King of Spades', value: 13 },
    { actor: 'Goblin Warrior', card: '9 of Hearts', value: 9 },
    { actor: 'Seoni', card: '7 of Diamonds', value: 7 },
  ];

  initiative.forEach(({ actor, card }) => {
    logger.info(`${actor} draws ${card}`);
  });

  logger.info('\nCombat Round 1:');

  // Valeros attacks
  logger.info('Valeros attacks the Goblin Warrior');
  const attackRoll = simulateDiceRoll('1d10');
  logger.info(`Attack roll: ${attackRoll.rolls[0]} (need 4+)`);

  if (attackRoll.total >= 4) {
    logger.success('Hit! Rolling damage...');
    const damageRoll = simulateDiceRoll('1d6+1');
    logger.info(`Damage: ${damageRoll.rolls[0]} + 1 = ${damageRoll.total}`);

    if (damageRoll.total >= 5) {
      logger.success('Goblin is Shaken!');
    }
  } else {
    logger.warning('Miss!');
  }

  // Goblin attacks
  logger.info('\nGoblin Warrior attacks Valeros');
  const goblinAttack = simulateDiceRoll('1d6');
  logger.info(`Attack roll: ${goblinAttack.rolls[0]} (need 4+)`);

  if (goblinAttack.total >= 4) {
    logger.success('Hit! Rolling damage...');
    const goblinDamage = simulateDiceRoll('1d6');
    logger.info(`Damage: ${goblinDamage.rolls[0]} = ${goblinDamage.total}`);

    if (goblinDamage.total >= 8) {
      logger.warning('Valeros takes a wound!');
    } else if (goblinDamage.total >= 5) {
      logger.warning('Valeros is Shaken!');
    }
  } else {
    logger.warning('Miss!');
  }

  // Seoni casts spell
  logger.info('\nSeoni casts Bolt spell');
  const spellRoll = simulateDiceRoll('1d10');
  logger.info(`Spellcasting roll: ${spellRoll.rolls[0]} (need 4+)`);

  if (spellRoll.total >= 4) {
    logger.success('Spell succeeds! Rolling damage...');
    const spellDamage = simulateDiceRoll('2d6');
    logger.info(
      `Damage: ${spellDamage.rolls.join(' + ')} = ${spellDamage.total}`,
    );

    if (spellDamage.total >= 5) {
      logger.success('Goblin is Shaken!');
    }
  } else {
    logger.warning('Spell fails!');
  }
}

// Live demo function
async function runLiveDemo() {
  logger.step('Running Live Demo with Deployed Server');

  const client = new HttpClient(DEPLOYED_URL);

  try {
    // Check server health
    logger.info('Checking server health...');
    const { response: healthResponse } = await client.get('/healthz');

    if (healthResponse.ok) {
      logger.success('Server is healthy!');
    } else {
      logger.error('Server health check failed');
      return;
    }

    // Get MCP manifest
    logger.info('Getting MCP manifest...');
    const { response: manifestResponse, data: manifest } =
      await client.get('/mcp/manifest');

    if (manifestResponse.ok) {
      logger.success(
        `MCP server has ${manifest.tools?.length || 0} tools available`,
      );
    } else {
      logger.warning('Could not get MCP manifest');
    }

    // Test dice rolling
    logger.info('Testing dice rolling...');
    const { response: diceResponse, data: diceResult } = await client.post(
      '/mcp/tool/dice.roll',
      {
        formula: '2d6+1',
        explode: true,
        wildDie: 'd6',
      },
    );

    if (diceResponse.ok) {
      logger.success(
        `Dice roll result: ${diceResult.total} (${diceResult.rolls?.join(', ') || 'N/A'})`,
      );
    } else {
      logger.warning('Dice rolling test failed');
    }
  } catch (error) {
    logger.error(`Live demo failed: ${error.message}`);
    logger.info('Falling back to simulated demo...');
    runSimulatedDemo();
  }
}

// Simulated demo function
function runSimulatedDemo() {
  logger.step('Running Simulated Demo');

  logger.info('Creating game session...');
  logger.success(`Session created: ${demoSession.name}`);

  logger.info('Creating player characters...');
  Object.values(demoActors).forEach((actor) => {
    logger.success(`${actor.name} created (${actor.type})`);
  });

  logger.info('Setting up battlemap...');
  logger.success(
    `Grid: ${demoSession.grid.cols}x${demoSession.grid.rows} ${demoSession.grid.unit} squares`,
  );

  // Simulate dice rolling
  logger.step('Testing Dice Rolling');
  const testRolls = ['1d20', '2d6+3', '4d6', '1d100'];

  testRolls.forEach((formula) => {
    const result = simulateDiceRoll(formula);
    logger.info(`${formula}: ${result.rolls.join(', ')} = ${result.total}`);
  });

  // Simulate combat
  simulateCombat();

  logger.step('Demo Complete!');
  logger.success('Savage Pathfinder MCP Server is ready for action!');
  logger.info(
    'Deploy the server and integrate with your MCP client to start playing.',
  );
}

// Main execution
async function main() {
  console.log('🎲 Savage Pathfinder MCP Server Demo');
  console.log('=====================================\n');

  const args = process.argv.slice(2);
  const useLive = args.includes('--live') || args.includes('-l');

  if (useLive) {
    await runLiveDemo();
  } else {
    runSimulatedDemo();
  }
}

// Run the demo
main().catch(console.error);
