import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "../generated/prisma/client.ts";

// 4-arg signature tells express this is the error handler
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Validation failed", issues: err.issues });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = err.meta?.target;
      const fields = Array.isArray(target) ? target.join(", ") : typeof target === "string" ? target : "field";
      res.status(409).json({ error: `Already exists: ${fields}` });
      return;
    }
    if (err.code === "P2003") {
      const field = typeof err.meta?.field_name === "string" ? err.meta.field_name : "reference";
      res.status(400).json({ error: `Invalid reference: ${field}` });
      return;
    }
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
