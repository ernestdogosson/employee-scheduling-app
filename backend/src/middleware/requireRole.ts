import type { Request, Response, NextFunction } from "express";
import type { AuthTokenPayload } from "../auth/jwt.ts";

type Role = AuthTokenPayload["role"];

// factory: pass allowed roles, get middleware back
export function requireRole(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // should be set by requireAuth, but guard anyway
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    if (!allowed.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    next();
  };
}
