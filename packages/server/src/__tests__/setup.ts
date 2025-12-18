/**
 * Jest Test Setup
 *
 * Ensures server is ready before tests
 */

import axios from "axios";

const API_BASE = process.env.API_BASE || "http://localhost:3001";

// Wait for server to be ready
const waitForServer = async (maxAttempts = 10) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await axios.get(`${API_BASE}/health`, { timeout: 1000 });
      console.log("✓ Server is ready for tests");
      return true;
    } catch {
      console.log(`Waiting for server... (${i + 1}/${maxAttempts})`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(
    "Server did not respond - make sure it's running with: npm run dev:server"
  );
};

// Setup: Verify server is ready
beforeAll(async () => {
  await waitForServer();
}, 60000);
