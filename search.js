import { z } from "zod";

export const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(200, "Search query must not exceed 200 characters"),
});
