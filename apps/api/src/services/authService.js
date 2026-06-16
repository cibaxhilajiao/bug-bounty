import { signAccessToken } from "../utils/jwt.js";

const PUBLIC_ROLES = new Set(["client", "freelancer"]);

export async function registerUser(payload) {
  // Defense-in-depth: reject elevated roles even if validation is bypassed
  if (!PUBLIC_ROLES.has(payload.role)) {
    const err = new Error("Elevated role not permitted during registration");
    err.statusCode = 400;
    throw err;
  }
  // TODO: persist new user via Prisma
  return {
    id: `usr_${Date.now()}`,
    email: payload.email,
    role: payload.role,
    token: signAccessToken({ sub: `usr_${Date.now()}`, role: payload.role })
  };
}

export async function loginUser(payload) {
  // TODO: verify password hash against stored user record
  return {
    email: payload.email,
    token: signAccessToken({ sub: "usr_existing", role: "client" })
  };
}

export async function refreshToken() {
  return { token: signAccessToken({ sub: "usr_existing", role: "client" }) };
}
