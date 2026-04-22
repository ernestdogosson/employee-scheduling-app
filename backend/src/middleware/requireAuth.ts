import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../auth/jwt.ts";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  // expect "Bearer <token>"
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
