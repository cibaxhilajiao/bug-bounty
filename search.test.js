import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app.js";

function startServer(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0);
    server.once("listening", () => resolve(server));
    server.once("error", reject);
  });
}

function stopServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function getSearchResponse(app, query) {
  const server = await startServer(app);
  const { port } = server.address();
  const url = query
    ? `http://127.0.0.1:${port}/api/search?q=${encodeURIComponent(query)}`
    : `http://127.0.0.1:${port}/api/search`;
  const response = await fetch(url);
  const payload = await response.json();
  await stopServer(server);
  return { status: response.status, payload };
}

test("GET /api/search returns 200 for valid query", async () => {
  const app = createApp();
  const { status, payload } = await getSearchResponse(app, "developer");
  assert.equal(status, 200);
  assert.equal(payload.success, true);
});

test("GET /api/search returns 200 for empty query (allowed)", async () => {
  const app = createApp();
  const { status, payload } = await getSearchResponse(app, "");
  assert.equal(status, 200);
  assert.equal(payload.success, true);
});

test("GET /api/search returns 422 for query exceeding 200 characters", async () => {
  const app = createApp();
  const longQuery = "x".repeat(201);
  const { status, payload } = await getSearchResponse(app, longQuery);
  assert.equal(status, 422);
  assert.equal(payload.success, false);
  assert.ok(payload.message.includes("200 characters"));
});

test("GET /api/search accepts query at exactly 200 characters", async () => {
  const app = createApp();
  const maxQuery = "x".repeat(200);
  const { status, payload } = await getSearchResponse(app, maxQuery);
  assert.equal(status, 200);
  assert.equal(payload.success, true);
});

test("GET /api/search returns 400 for non-string query (array)", async () => {
  const app = createApp();
  const server = await startServer(app);
  const { port } = server.address();
  // Send repeated ?q= to trigger Express array parsing
  const response = await fetch(`http://127.0.0.1:${port}/api/search?q=a&q=b`);
  const payload = await response.json();
  await stopServer(server);
  assert.equal(response.status, 400);
  assert.equal(payload.success, false);
  assert.ok(payload.message.toLowerCase().includes("single string"));
});

test("GET /api/search returns 200 for whitespace-only query (trimmed to empty)", async () => {
  const app = createApp();
  const { status, payload } = await getSearchResponse(app, "   ");
  assert.equal(status, 200);
  assert.equal(payload.success, true);
});
