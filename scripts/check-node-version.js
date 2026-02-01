#!/usr/bin/env node
/**
 * Pre-start check to verify Node.js version
 */

const MIN_NODE_VERSION = 20;
const currentVersion = parseInt(process.versions.node.split('.')[0], 10);

console.log(`Node.js version: v${process.versions.node}`);
console.log(`Module version: ${process.versions.modules}`);

// Check minimum version
if (currentVersion < MIN_NODE_VERSION) {
  console.error(`\n❌ ERROR: Node.js ${MIN_NODE_VERSION}+ is required (you have v${process.versions.node})`);
  console.error('\nTo fix this:');
  console.error('  1. Install Node 20+: nvm install 20');
  console.error('  2. Use it: nvm use 20');
  process.exit(1);
}

console.log('✅ Node.js environment check passed\n');
