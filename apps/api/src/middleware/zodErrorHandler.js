import { ZodError } from "zod";

export function zodErrorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        expected: issue.options,
        received: issue.received,
      })),
    });
  }
  return next(err);
}
