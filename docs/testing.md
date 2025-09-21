# Savage Pathfinder MCP Server - Testing Documentation

## Overview

This document provides comprehensive information about the testing strategy, test suite organization, and testing procedures for the Savage Pathfinder MCP Server. The test suite ensures that all objectives outlined in the specification are met and the system is production-ready.

## Testing Objectives

The test suite validates the following key objectives from the specification:

1. **Voice-first play**: Players can converse with GPT-5 Voice Mode without keyboard input
2. **Persistent game state**: PCs, NPCs, powers, edges, hindrances, gear, conditions, Bennies, Conviction, Wounds, Fatigue, Power Points, ammo are tracked
3. **Combat engine**: Initiative via Action Deck (including Jokers), Hold/interrupt, turn order, statuses
4. **Spatial awareness**: Track tokens/miniatures on gridded battlemap, distances, reach, areas/templates
5. **Dice services**: Cryptographically fair RNG for virtual rolls, camera-based recognition for physical dice
6. **Multi-party support**: 1–6+ players, remote or co-located, session hand-off and reconnection
7. **Cloudflare-native**: Scalable, low-latency, safe concurrent edits, audit trails
8. **Open MCP protocol**: All game tools exposed via MCP (resources + tools)

## Test Suite Organization

### 1. Unit Tests

#### Durable Objects (`src/do/*.test.ts`)

- **CombatDO.test.ts**: Combat state management, turn order, hold/interrupt mechanics
- **DeckDO.test.ts**: Action Deck management, card dealing, shuffling, joker handling
- **RngDO.test.ts**: Random number generation, dice rolling, verification
- **SessionDO.test.ts**: Session management, actor CRUD operations, state persistence

#### MCP Tools (`src/mcp/tools/*.test.ts`)

- **dice.test.ts**: Dice rolling tool handler
- **session.test.ts**: Session management tool handlers
- **actor.test.ts**: Actor management tool handlers
- **combat.test.ts**: Combat management tool handlers

### 2. Integration Tests (`src/__tests__/integration.test.ts`)

- End-to-end MCP tool workflows
- Cross-component interactions
- Error handling and edge cases
- API contract validation

### 3. Simulation Tests (`src/__tests__/simulation.test.ts`)

- Complete combat scenarios
- Multi-actor interactions
- Realistic game state transitions
- Full session lifecycle

### 4. Property-Based Tests (`src/__tests__/property.test.ts`)

- RNG fairness validation
- Deck shuffling uniformity
- Statistical distribution verification
- Deterministic behavior testing

### 5. Concurrency Tests (`src/__tests__/concurrency.test.ts`)

- Multi-client scenarios
- Race condition prevention
- Concurrent state updates
- Lock-free operations

### 6. Rules Tests (`src/__tests__/rules.test.ts`)

- Savage Worlds mechanics validation
- Trait roll calculations
- Damage calculations
- Initiative ordering
- Power point management

### 7. Performance Tests (`src/__tests__/performance.test.ts`)

- Load testing
- Stress testing
- Latency measurements
- Memory usage monitoring
- Throughput validation

## Test Execution

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm test src/do/CombatDO.test.ts
npm test src/__tests__/integration.test.ts
npm test src/__tests__/simulation.test.ts

# Run tests in watch mode (development only)
npm run test:watch
```

### Test Configuration

The test suite is configured in `vitest.config.ts` with the following settings:

- **Environment**: Node.js
- **Timeout**: 10 seconds per test
- **Coverage**: 95% statements, 90% branches, 95% functions, 95% lines
- **Pattern**: Excludes skip/todo/only tests
- **Reports**: Text, JSON, HTML, LCOV formats

## Test Categories

### Unit Tests

- **Purpose**: Test individual components in isolation
- **Scope**: Single functions, methods, or classes
- **Dependencies**: Mocked external dependencies
- **Data**: Controlled test data
- **Assertions**: Specific behavior validation

### Integration Tests

- **Purpose**: Test component interactions
- **Scope**: Multiple components working together
- **Dependencies**: Real or mocked external services
- **Data**: Realistic test scenarios
- **Assertions**: End-to-end workflow validation

### Property-Based Tests

- **Purpose**: Validate statistical properties
- **Scope**: RNG fairness, distribution uniformity
- **Dependencies**: Statistical analysis
- **Data**: Large datasets (1000+ samples)
- **Assertions**: Statistical significance

### Concurrency Tests

- **Purpose**: Validate multi-client safety
- **Scope**: Concurrent operations, race conditions
- **Dependencies**: Parallel execution simulation
- **Data**: Concurrent request patterns
- **Assertions**: Consistency and safety

### Performance Tests

- **Purpose**: Validate performance requirements
- **Scope**: Load, stress, latency testing
- **Dependencies**: Performance monitoring
- **Data**: High-volume operations
- **Assertions**: Performance thresholds

## Test Data Management

### Mock Data

- **Durable Objects**: Mocked storage and environment
- **External Services**: Mocked HTTP responses
- **Database**: In-memory test database
- **File System**: Mocked file operations

### Test Fixtures

- **Sessions**: Pre-configured game sessions
- **Actors**: Sample characters and NPCs
- **Combat States**: Various combat scenarios
- **Deck States**: Pre-shuffled decks

### Test Isolation

- **Cleanup**: Each test cleans up after itself
- **Independence**: Tests don't depend on each other
- **Deterministic**: Tests produce consistent results
- **Repeatable**: Tests can run multiple times

## Coverage Requirements

### Code Coverage Targets

- **Statements**: 95%
- **Branches**: 90%
- **Functions**: 95%
- **Lines**: 95%

### Coverage Exclusions

- Test files (`*.test.ts`, `*.spec.ts`)
- Test directories (`__tests__/`)
- Node modules
- Build artifacts
- Coverage reports

## Performance Requirements

### Latency Targets

- **Dice roll**: < 10ms average
- **Deck operations**: < 50ms per operation
- **Combat updates**: < 100ms per update
- **Session operations**: < 200ms per operation

### Throughput Targets

- **Concurrent requests**: > 100 requests/second
- **Dice rolls**: > 1000 rolls/second
- **Deck operations**: > 100 operations/second
- **Combat updates**: > 50 updates/second

### Resource Usage

- **Memory per session**: < 100MB
- **CPU usage**: < 50% under normal load
- **Storage growth**: < 1MB per hour per session

## Error Handling

### Test Error Scenarios

- **Invalid input**: Malformed requests, missing fields
- **Network errors**: Timeouts, connection failures
- **Resource limits**: Memory, storage, rate limits
- **Concurrency errors**: Race conditions, deadlocks
- **State errors**: Invalid state transitions

### Error Recovery

- **Graceful degradation**: System continues with reduced functionality
- **Error reporting**: Clear error messages and logging
- **State recovery**: Automatic state correction
- **User feedback**: Appropriate error responses

## Continuous Integration

### CI/CD Pipeline

- **Pre-commit hooks**: Linting, formatting, type checking
- **Pre-push hooks**: Full test suite execution
- **Pull request validation**: Automated testing
- **Deployment validation**: Production readiness checks

### Test Execution

- **Single-run mode**: No watch mode in CI
- **Deterministic**: Consistent results across environments
- **Fast execution**: Complete suite runs in < 5 minutes
- **Clear reporting**: Pass/fail status with details

## Debugging and Troubleshooting

### Test Debugging

- **Verbose output**: Detailed test execution logs
- **Error messages**: Clear failure descriptions
- **State inspection**: Test state validation
- **Performance metrics**: Timing and resource usage

### Common Issues

- **Flaky tests**: Non-deterministic behavior
- **Slow tests**: Performance bottlenecks
- **Memory leaks**: Resource cleanup issues
- **Race conditions**: Concurrency problems

## Best Practices

### Test Writing

- **Descriptive names**: Clear test purpose
- **Single responsibility**: One assertion per test
- **Arrange-Act-Assert**: Clear test structure
- **Test data**: Realistic and comprehensive
- **Cleanup**: Explicit resource cleanup

### Test Maintenance

- **Regular updates**: Keep tests current with code
- **Refactoring**: Update tests when code changes
- **Documentation**: Clear test documentation
- **Review**: Regular test code review

## Future Enhancements

### Planned Improvements

- **Visual testing**: UI component testing
- **End-to-end testing**: Full user journey testing
- **Load testing**: Production-scale testing
- **Security testing**: Vulnerability assessment
- **Accessibility testing**: WCAG compliance

### Test Automation

- **Auto-generation**: Test case generation
- **Mutation testing**: Test quality validation
- **Property-based testing**: Enhanced statistical testing
- **Visual regression**: UI change detection

## Conclusion

The Savage Pathfinder MCP Server test suite provides comprehensive validation of all system components and ensures production readiness. The test suite covers unit testing, integration testing, property-based testing, concurrency testing, rules validation, and performance testing.

The test suite is designed to be maintainable, reliable, and comprehensive, providing confidence that the system meets all specification objectives and is ready for production deployment.

For questions or issues with the test suite, please refer to the test code comments or contact the development team.
