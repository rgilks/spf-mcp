/**
 * Shared logging utility for consistent console output across demos and tests
 */

export const logger = {
  success: (msg: string) => console.log(`✅ ${msg}`),
  error: (msg: string) => console.log(`❌ ${msg}`),
  info: (msg: string) => console.log(`ℹ️  ${msg}`),
  warning: (msg: string) => console.log(`⚠️  ${msg}`),
  dice: (msg: string) => console.log(`🎲 ${msg}`),
  combat: (msg: string) => console.log(`⚔️  ${msg}`),
  session: (msg: string) => console.log(`📝 ${msg}`),
  actor: (msg: string) => console.log(`👤 ${msg}`),
  performance: (msg: string) => console.log(`⚡ ${msg}`),
  security: (msg: string) => console.log(`🔐 ${msg}`),
  debug: (msg: string) => console.log(`🔍 ${msg}`),

  // Section headers
  section: (title: string) => {
    console.log(`\n${title}`);
    console.log('='.repeat(title.length));
  },

  // Subsection headers
  subsection: (title: string) => {
    console.log(`\n${title}`);
    console.log('-'.repeat(title.length));
  },

  // List items
  item: (msg: string) => console.log(`   • ${msg}`),

  // Key-value pairs
  kv: (key: string, value: string | number) =>
    console.log(`   ${key}: ${value}`),

  // Progress indicators
  progress: (current: number, total: number, item: string) =>
    console.log(`   ${current}/${total} ${item}`),

  // Test results
  testPass: (testName: string) => console.log(`✅ ${testName}`),
  testFail: (testName: string, error?: string) =>
    console.log(`❌ ${testName}${error ? `: ${error}` : ''}`),

  // Performance metrics
  metric: (label: string, value: string | number, unit?: string) =>
    console.log(`   📊 ${label}: ${value}${unit ? ` ${unit}` : ''}`),

  // JSON output for debugging
  json: (label: string, data: any) => {
    console.log(`\n${label}:`);
    console.log(JSON.stringify(data, null, 2));
  },
};
