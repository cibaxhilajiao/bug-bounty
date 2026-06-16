import { ok, fail } from "../utils/response.js";
import { createUser, getUserByUsername, listUsers } from "../services/userService.js";

export async function getUsers(req, res) {
  return ok(res, await listUsers());
}

export async function getUser(req, res) {
  const user = await getUserByUsername(req.params.username);
  if (!user) return fail(res, "User not found", 404);
  return ok(res, user);
}

export async function postUser(req, res) {
  return ok(res, await createUser(req.body), 201);
}
