import { ok, fail } from "../utils/response.js";
import { globalSearch } from "../services/searchService.js";
import { searchQuerySchema } from "../validators/search.js";

export async function search(req, res) {
  // Reject non-string query input (e.g., repeated ?q= params → array)
  const raw = req.query.q;
  if (raw !== undefined && typeof raw !== "string") {
    return fail(res, "Invalid search query: must be a single string value", 400);
  }

  try {
    const { q } = searchQuerySchema.parse({ q: raw ?? "" });
    return ok(res, await globalSearch(q));
  } catch (err) {
    if (err?.name === "ZodError") {
      return fail(res, err.errors[0]?.message || "Invalid search query", 422);
    }
    throw err;
  }
}
