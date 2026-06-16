import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app.js";
import { registerSchema } from "../validators/auth.js";
import { registerUser } from "../services/authService.js";

import http from "node:http";

function post(app, path, body) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0);
    server.once("listening", () => {
      const { port } = server.address();
      const payload = JSON.stringify(body);
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            let parsed = null;
            try {
              parsed = JSON.parse(data);
            } catch {}
            // Destroy the socket to make sure server can close cleanly
            req.destroy();
            server.closeAllConnections();
            server.close(() =>
              resolve({ status: res.statusCode, body: parsed })
            );
          });
        }
      );
      req.on("error", (err) => {
        server.closeAllConnections();
        server.close(() => reject(err));
      });
      req.write(payload);
      req.end();
    });
    server.once("error", reject);
  });
}

// --- Validator tests (unit) ---

test("Zod validator: admin role → rejected", () => {
  const result = registerSchema.safeParse({
    email: "attacker@evil.com",
    password: "password123",
    role: "admin",
  });
  assert.equal(result.success, false);
  assert.ok(
    result.error?.issues?.some((i) => i.path.includes("role")),
    "error should reference the role field"
  );
});

test("Zod validator: client role → accepted", () => {
  const result = registerSchema.safeParse({
    email: "client@test.com",
    password: "password123",
    role: "client",
  });
  assert.equal(result.success, true);
  assert.equal(result.data.role, "client");
});

test("Zod validator: freelancer role → accepted", () => {
  const result = registerSchema.safeParse({
    email: "freelancer@test.com",
    password: "password123",
    role: "freelancer",
  });
  assert.equal(result.success, true);
  assert.equal(result.data.role, "freelancer");
});

test("Zod validator: no role provided → defaults to client", () => {
  const result = registerSchema.safeParse({
    email: "newuser@test.com",
    password: "password123",
  });
  assert.equal(result.success, true);
  assert.equal(result.data.role, "client");
});

test("Zod validator: invalid role → rejected", () => {
  const result = registerSchema.safeParse({
    email: "hacker@test.com",
    password: "password123",
    role: "superadmin",
  });
  assert.equal(result.success, false);
});

test("Zod validator: moderator role → rejected", () => {
  const result = registerSchema.safeParse({
    email: "mod@test.com",
    password: "password123",
    role: "moderator",
  });
  assert.equal(result.success, false);
});

// --- Service guard tests (unit) ---

test("Service: admin role → throws 400", async () => {
  await assert.rejects(
    () =>
      registerUser({
        email: "attacker@evil.com",
        password: "password123",
        role: "admin",
      }),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.ok(
        err.message.includes("Elevated role"),
        "should mention elevated role rejection"
      );
      return true;
    }
  );
});

test("Service: client role → succeeds", async () => {
  const result = await registerUser({
    email: "client@test.com",
    password: "password123",
    role: "client",
  });
  assert.equal(result.role, "client");
  assert.ok(result.token, "token should be present");
  assert.ok(result.email, "email should be present");
});

test("Service: freelancer role → succeeds", async () => {
  const result = await registerUser({
    email: "freelancer@test.com",
    password: "password123",
    role: "freelancer",
  });
  assert.equal(result.role, "freelancer");
  assert.ok(result.token, "token should be present");
});

// --- Integration tests (HTTP endpoint) ---

test("POST /api/auth/register — admin role → 400", async () => {
  const app = createApp();
  const { status } = await post(app, "/api/auth/register", {
    email: "attacker@evil.com",
    password: "password12345678",
    role: "admin",
  });
  assert.equal(status, 400);
});

test("POST /api/auth/register — client role → 201", async () => {
  const app = createApp();
  const { status, body } = await post(app, "/api/auth/register", {
    email: "client@test.com",
    password: "password12345678",
    role: "client",
  });
  assert.equal(status, 201);
  assert.ok(body.success, "should return success:true");
  assert.equal(body.data.role, "client");
  assert.ok(body.data.token, "should return a token");
});

test("POST /api/auth/register — freelancer role → 201", async () => {
  const app = createApp();
  const { status, body } = await post(app, "/api/auth/register", {
    email: "freelancer@test.com",
    password: "password12345678",
    role: "freelancer",
  });
  assert.equal(status, 201);
  assert.ok(body.success, "should return success:true");
  assert.equal(body.data.role, "freelancer");
  assert.ok(body.data.token, "should return a token");
});

test("POST /api/auth/register — no role → defaults to client, 201", async () => {
  const app = createApp();
  const { status, body } = await post(app, "/api/auth/register", {
    email: "new@test.com",
    password: "password12345678",
  });
  assert.equal(status, 201);
  assert.ok(body.success, "should return success:true");
  assert.equal(body.data.role, "client");
});

test("POST /api/auth/register — invalid role → 400", async () => {
  const app = createApp();
  const { status } = await post(app, "/api/auth/register", {
    email: "hacker@test.com",
    password: "password12345678",
    role: "superadmin",
  });
  assert.equal(status, 400);
});
