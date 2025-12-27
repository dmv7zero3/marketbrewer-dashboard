#!/usr/bin/env node
/**
 * Pre-start check to verify Node.js version and native module compatibility
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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
  console.error('  3. Rebuild: npm rebuild better-sqlite3');
  process.exit(1);
}

// Check if better-sqlite3 is compatible
const betterSqlitePath = path.join(__dirname, '../node_modules/better-sqlite3/build/Release/better_sqlite3.node');

if (fs.existsSync(betterSqlitePath)) {
  try {
    // Try to load the native module
    require('better-sqlite3');
    console.log('✅ better-sqlite3 native module is compatible');
  } catch (err) {
    if (err.code === 'ERR_DLOPEN_FAILED') {
      console.error('\n❌ ERROR: better-sqlite3 was compiled for a different Node.js version');
      console.error('\nTo fix this, run:');
      console.error('  npm rebuild better-sqlite3');
      console.error('\nOr for a clean install:');
      console.error('  rm -rf node_modules && npm install');
      process.exit(1);
    }
    throw err;
  }
} else {
  console.log('⚠️  better-sqlite3 not found - will be installed on npm install');
}

console.log('✅ Node.js environment check passed\n');
