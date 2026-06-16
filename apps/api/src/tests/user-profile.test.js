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

test("GET /api/users/:username returns 404 for unknown user", async () => {
  const app = createApp();
  const server = await startServer(app);
  const { port } = server.address();
  const resp = await fetch(`http://127.0.0.1:${port}/api/users/nonexistent`);
  const payload = await resp.json();
  await stopServer(server);
  assert.equal(resp.status, 404);
  assert.equal(payload.success, false);
});

test("GET /api/users/:username returns user after creation", async () => {
  const app = createApp();
  const server = await startServer(app);
  const { port } = server.address();

  // Create a user with username
  const createResp = await fetch(`http://127.0.0.1:${port}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "alice", role: "freelancer" }),
  });
  const created = await createResp.json();
  assert.equal(createResp.status, 201);

  // Get by username
  const getResp = await fetch(`http://127.0.0.1:${port}/api/users/alice`);
  const payload = await getResp.json();
  await stopServer(server);

  assert.equal(getResp.status, 200);
  assert.equal(payload.data.username, "alice");
  assert.equal(payload.data.role, "freelancer");
});

test("GET /api/users/:username is case-insensitive", async () => {
  const app = createApp();
  const server = await startServer(app);
  const { port } = server.address();

  await fetch(`http://127.0.0.1:${port}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "Bob" }),
  });

  const resp = await fetch(`http://127.0.0.1:${port}/api/users/bob`);
  const payload = await resp.json();
  await stopServer(server);

  assert.equal(resp.status, 200);
  assert.equal(payload.data.username, "Bob");
});
