#!/usr/bin/env node

/**
 * Live Testing Script for Deployed SPF MCP Server
 * Tests the deployed application with real HTTP requests
 */

const DEPLOYED_URL = 'https://spf-mcp.rob-gilks.workers.dev';

console.log('🚀 SPF MCP Server Live Testing');
console.log('==============================');
console.log(`Testing deployed app at: ${DEPLOYED_URL}\n`);

const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  errors: [],
};

// Test helper functions
async function makeRequest(endpoint, options = {}) {
  const url = `${DEPLOYED_URL}${endpoint}`;
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

function test(name, testFn) {
  testResults.total++;
  return testFn()
    .then(() => {
      console.log(`✅ ${name}`);
      testResults.passed++;
      return { success: true };
    })
    .catch((error) => {
      console.log(`❌ ${name}: ${error.message}`);
      testResults.failed++;
      testResults.errors.push({ test: name, error: error.message });
      return { success: false, error };
    });
}

function assert(condition, message, debugInfo = null) {
  if (!condition) {
    const error = new Error(message);
    if (debugInfo) {
      error.debugInfo = debugInfo;
      console.log(`   🔍 Debug info:`, JSON.stringify(debugInfo, null, 2));
    }
    throw error;
  }
}

// Test Suite
async function runTests() {
  console.log('🧪 Starting Live Tests...\n');

  // Test 1: Health Check / Root endpoint
  await test('Health Check - Root endpoint responds', async () => {
    const { response } = await makeRequest('/');
    assert(
      response.status === 200 || response.status === 404,
      `Expected 200 or 404, got ${response.status}`,
    );
  });

  // Test 2: MCP Manifest
  await test('MCP Manifest endpoint', async () => {
    const { response, data } = await makeRequest('/mcp/manifest');
    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(data && typeof data === 'object', 'Should return JSON object');
    assert(
      data.name === 'spf-mcp',
      `Expected name 'spf-mcp', got '${data.name}'`,
    );
    assert(Array.isArray(data.tools), 'Should have tools array');
    assert(data.tools.length > 0, 'Should have at least one tool');
  });

  // Test 3: Create Session
  let sessionId;
  await test('Create new session', async () => {
    const { response, data } = await makeRequest('/mcp/tool/session.create', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Live Test Session',
        grid: { unit: 'inch', scale: 1.0, cols: 20, rows: 20 },
        illumination: 'bright',
      }),
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(data.success === true, `Expected success=true, got ${data.success}`);
    assert(data.data && data.data.sessionId, 'Should return sessionId');
    sessionId = data.data.sessionId;
    console.log(`   📝 Created session: ${sessionId}`);
  });

  // Test 4: Create Actor
  let actorId;
  const actorResult = await test('Create actor in session', async () => {
    const { response, data } = await makeRequest('/mcp/tool/actor.upsert', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        actor: {
          type: 'pc',
          name: 'Test Hero',
          wildCard: true,
          traits: {
            Agility: 'd8',
            Smarts: 'd6',
            Spirit: 'd6',
            Strength: 'd8',
            Vigor: 'd8',
          },
          skills: [
            { name: 'Fighting', die: 'd8' },
            { name: 'Notice', die: 'd6' },
          ],
          resources: { bennies: 3, conviction: 0, powerPoints: 0 },
          status: { shaken: false, stunned: false, fatigue: 0, wounds: 0 },
          defense: { parry: 6, toughness: 6, armor: 0 },
          position: { x: 10, y: 10, facing: 0 },
          reach: 1,
          size: 0,
        },
      }),
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`, {
      status: response.status,
      data,
    });
    assert(
      data.success === true,
      `Expected success=true, got ${data.success}`,
      data,
    );
    assert(data.data && data.data.id, 'Should return actor ID', data);
    actorId = data.data.id;
    console.log(`   👤 Created actor: ${actorId}`);
  });

  // Only set actorId if the test succeeded
  if (!actorResult.success) {
    actorId = null;
  }

  // Test 5: Roll Dice
  await test('Roll dice with session context', async () => {
    const { response, data } = await makeRequest('/mcp/tool/dice.roll', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        formula: '2d6+3',
        explode: false,
        wildDie: null,
      }),
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`, {
      status: response.status,
      data,
    });
    assert(
      data.success === true,
      `Expected success=true, got ${data.success}`,
      data,
    );
    assert(
      data.data && typeof data.data.total === 'number',
      'Should return numeric total',
      data,
    );
    assert(
      data.data.total >= 5 && data.data.total <= 15,
      'Total should be in valid range (5-15)',
      data,
    );
    assert(
      Array.isArray(data.data.results),
      'Should return results array',
      data,
    );
    const flatRolls = data.data.results.flat();
    console.log(
      `   🎲 Rolled: ${flatRolls.join(', ')} + 3 = ${data.data.total}`,
    );
  });

  // Test 6: Start Combat (only if we have an actor)
  if (actorId) {
    await test('Start combat with created actor', async () => {
      const { response, data } = await makeRequest('/mcp/tool/combat.start', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          participants: [actorId],
        }),
      });

      assert(response.status === 200, `Expected 200, got ${response.status}`, {
        status: response.status,
        data,
      });
      assert(
        data.success === true,
        `Expected success=true, got ${data.success}`,
        data,
      );
      console.log(`   ⚔️ Combat started with ${data.data ? 1 : 0} participant`);
    });
  } else {
    console.log('⚠️  Skipping combat test - no actor created');
  }

  // Test 7: Deal Initiative Cards
  await test('Deal initiative cards', async () => {
    const { response, data } = await makeRequest('/mcp/tool/combat.deal', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        participants: [actorId],
      }),
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(data.success === true, `Expected success=true, got ${data.success}`);
    if (data.data && data.data.dealt) {
      console.log(
        `   🃏 Dealt cards to ${Object.keys(data.data.dealt).length} participants`,
      );
    }
  });

  // Test 8: Load Session
  await test('Load existing session', async () => {
    const { response, data } = await makeRequest('/mcp/tool/session.load', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
      }),
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(data.success === true, `Expected success=true, got ${data.success}`);
    assert(
      data.data && data.data.id === sessionId,
      'Should return correct session',
    );
    console.log(`   📖 Loaded session: ${data.data.name}`);
  });

  // Test 9: Move Actor
  await test('Move actor position', async () => {
    const { response, data } = await makeRequest('/mcp/tool/actor.move', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        actorId,
        position: { x: 12, y: 8, facing: 90 },
      }),
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(data.success === true, `Expected success=true, got ${data.success}`);
    console.log(`   🚶 Moved actor to (12, 8) facing 90°`);
  });

  // Test 10: Error Handling - Invalid Endpoint
  await test('Error handling - Invalid endpoint returns 404', async () => {
    const { response } = await makeRequest('/invalid/endpoint');
    assert(response.status === 404, `Expected 404, got ${response.status}`);
  });

  // Test 11: Error Handling - Invalid JSON
  await test('Error handling - Invalid JSON returns error', async () => {
    const { response } = await makeRequest('/mcp/tool/session.create', {
      method: 'POST',
      body: 'invalid json',
    });
    assert(
      response.status >= 400,
      `Expected error status (400+), got ${response.status}`,
    );
  });

  // Test 12: Performance Test - Multiple Dice Rolls
  await test('Performance - Multiple dice rolls', async () => {
    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < 10; i++) {
      promises.push(
        makeRequest('/mcp/tool/dice.roll', {
          method: 'POST',
          body: JSON.stringify({
            sessionId,
            formula: '1d20',
            explode: false,
          }),
        }),
      );
    }

    const results = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Check that all requests succeeded
    results.forEach((result, index) => {
      assert(
        result.response.status === 200,
        `Request ${index + 1} failed with status ${result.response.status}`,
      );
      assert(
        result.data.success === true,
        `Request ${index + 1} returned success=false`,
      );
    });

    console.log(
      `   ⚡ Completed 10 dice rolls in ${duration}ms (avg: ${duration / 10}ms per roll)`,
    );
    assert(duration < 5000, `Performance test took too long: ${duration}ms`);
  });

  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ❌`);
  console.log(
    `Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`,
  );

  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.errors.forEach(({ test, error }) => {
      console.log(`   • ${test}: ${error}`);
    });
    process.exit(1);
  } else {
    console.log(
      '\n🎉 All tests passed! The deployed application is working correctly.',
    );
    process.exit(0);
  }
}

// Handle errors and run tests
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

runTests().catch((error) => {
  console.error('❌ Test suite failed:', error.message);
  process.exit(1);
});
