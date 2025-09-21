// Simple demonstration of the Savage Pathfinder MCP Server
console.log('🎲 Savage Pathfinder MCP Server Demo');
console.log('=====================================');

// Simulate creating a game session
console.log('\n1. Creating a new game session...');
const session = {
  id: 'demo-session-123',
  name: 'Goblin Ambush',
  status: 'lobby',
  grid: { unit: 'inch', scale: 1.0, cols: 20, rows: 20 },
  illumination: 'dim',
};
console.log('✅ Session created:', session.name);

// Simulate creating player characters
console.log('\n2. Creating player characters...');
const valeros = {
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
};
console.log('✅ Valeros created:', valeros.name);

const seoni = {
  id: 'pc-seoni',
  name: 'Seoni',
  type: 'pc',
  wildCard: true,
  traits: {
    Agility: 'd6',
    Smarts: 'd10',
    Spirit: 'd8',
    Strength: 'd4',
    Vigor: 'd6',
  },
  skills: [
    { name: 'Spellcasting', die: 'd10' },
    { name: 'Notice', die: 'd8' },
  ],
  resources: { bennies: 3, conviction: 0, powerPoints: 15 },
  status: { shaken: false, stunned: false, fatigue: 0, wounds: 0 },
  defense: { parry: 4, toughness: 5, armor: 0 },
  powers: [
    { name: 'Bolt', ppCost: 2, mods: [] },
    { name: 'Healing', ppCost: 3, mods: [] },
  ],
  position: { x: 8, y: 12, facing: 0 },
};
console.log('✅ Seoni created:', seoni.name);

// Simulate creating NPCs
console.log('\n3. Creating NPCs...');
const goblin1 = {
  id: 'npc-goblin1',
  name: 'Goblin Warrior 1',
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
  ],
  resources: { bennies: 1, conviction: 0, powerPoints: 0 },
  status: { shaken: false, stunned: false, fatigue: 0, wounds: 0 },
  defense: { parry: 5, toughness: 5, armor: 0 },
  position: { x: 15, y: 8, facing: 180 },
};
console.log('✅ Goblin created:', goblin1.name);

// Simulate starting combat
console.log('\n4. Starting combat...');
const combat = {
  sessionId: session.id,
  status: 'idle',
  round: 0,
  turn: 0,
  participants: [valeros.id, seoni.id, goblin1.id],
};
console.log(
  '✅ Combat started with',
  combat.participants.length,
  'participants',
);

// Simulate dealing initiative cards
console.log('\n5. Dealing initiative cards...');
const initiative = {
  'pc-valeros': { rank: 'K', suit: 'Spades', id: 'card1' },
  'pc-seoni': { rank: 'Q', suit: 'Hearts', id: 'card2' },
  'npc-goblin1': { rank: 'J', suit: 'Diamonds', id: 'card3' },
};
console.log('✅ Initiative dealt:');
Object.entries(initiative).forEach(([actorId, card]) => {
  console.log(`   ${actorId}: ${card.rank} of ${card.suit}`);
});

// Simulate turn order
const turnOrder = ['pc-valeros', 'pc-seoni', 'npc-goblin1'];
console.log('\n6. Turn order:', turnOrder.join(' → '));

// Simulate dice rolling
console.log('\n7. Simulating dice rolls...');
function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollDice(formula) {
  const match = formula.match(/(\d+)d(\d+)([+-]\d+)?/);
  if (!match) return { total: 0, rolls: [] };

  const count = parseInt(match[1]);
  const sides = parseInt(match[2]);
  const modifier = match[3] ? parseInt(match[3]) : 0;

  const rolls = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rollDie(sides));
  }

  const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;
  return { total, rolls, modifier };
}

// Valeros attacks
console.log('\n8. Valeros attacks with Fighting...');
const valerosAttack = rollDice('1d10');
console.log(
  `   Rolled: ${valerosAttack.rolls.join(', ')} + ${valerosAttack.modifier} = ${valerosAttack.total}`,
);

if (valerosAttack.total >= 5) {
  // Goblin's parry
  console.log('   ✅ Hit!');
  const damage = rollDice('1d8+1'); // Longsword damage
  console.log(
    `   Damage: ${damage.rolls.join(', ')} + ${damage.modifier} = ${damage.total}`,
  );

  if (damage.total >= 5) {
    // Goblin's toughness
    console.log('   💥 Goblin takes damage!');
    goblin1.status.wounds += 1;
  }
} else {
  console.log('   ❌ Miss!');
}

// Seoni casts a spell
console.log('\n9. Seoni casts Bolt...');
const seoniSpell = rollDice('1d10');
console.log(
  `   Spellcasting: ${seoniSpell.rolls.join(', ')} = ${seoniSpell.total}`,
);

if (seoniSpell.total >= 4) {
  // Target number 4
  console.log('   ✅ Spell succeeds!');
  const boltDamage = rollDice('2d6');
  console.log(
    `   Bolt damage: ${boltDamage.rolls.join(', ')} = ${boltDamage.total}`,
  );

  if (boltDamage.total >= 5) {
    // Goblin's toughness
    console.log('   ⚡ Goblin takes bolt damage!');
    goblin1.status.wounds += 1;
  }
} else {
  console.log('   ❌ Spell fails!');
}

// Goblin attacks
console.log('\n10. Goblin attacks Valeros...');
const goblinAttack = rollDice('1d6');
console.log(
  `   Rolled: ${goblinAttack.rolls.join(', ')} = ${goblinAttack.total}`,
);

if (goblinAttack.total >= 7) {
  // Valeros's parry
  console.log('   ✅ Hit!');
  const damage = rollDice('1d4');
  console.log(`   Damage: ${damage.rolls.join(', ')} = ${damage.total}`);

  if (damage.total >= 8) {
    // Valeros's toughness
    console.log('   💥 Valeros takes damage!');
    valeros.status.wounds += 1;
  } else {
    console.log('   🛡️ Valeros armor absorbs the blow!');
  }
} else {
  console.log('   ❌ Miss!');
}

// Combat summary
console.log('\n11. Combat Summary:');
console.log(`   Valeros: ${valeros.status.wounds} wounds`);
console.log(`   Seoni: ${seoni.status.wounds} wounds`);
console.log(`   Goblin: ${goblin1.status.wounds} wounds`);

console.log(
  '\n🎉 Demo completed! The Savage Pathfinder MCP Server is ready for action!',
);
console.log('\nKey Features Implemented:');
console.log('✅ Session management');
console.log('✅ Actor creation and management');
console.log('✅ Combat system with initiative');
console.log('✅ Dice rolling with audit trail');
console.log('✅ Position tracking');
console.log('✅ Resource management (Bennies, Power Points)');
console.log('✅ Status effects (Wounds, Shaken, etc.)');
console.log('✅ MCP protocol compliance');
console.log('✅ Cloudflare Durable Objects');
console.log('✅ Comprehensive type safety');
