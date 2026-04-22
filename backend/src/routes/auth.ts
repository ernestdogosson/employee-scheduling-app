import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../db.ts";
import { signToken } from "../auth/jwt.ts";
import { requireAuth } from "../middleware/requireAuth.ts";
import { requireRole } from "../middleware/requireRole.ts";

export const authRouter = Router();

// POST /auth/login
authRouter.post("/login", async (req, res) => {
  const { loginCode } = req.body ?? {};
  if (typeof loginCode !== "string") {
    res.status(400).json({ error: "loginCode required" });
    return;
  }

  // scan users since each hash has a different salt
  const users = await prisma.user.findMany();
  for (const user of users) {
    const match = await bcrypt.compare(loginCode, user.loginCode);
    if (match) {
      const token = signToken({ sub: user.id, role: user.role });
      res.json({ token });
      return;
    }
  }

  res.status(401).json({ error: "Invalid login code" });
});

// GET /auth/me — who is the current user
authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// temp route to test RBAC, remove when real routes exist
authRouter.get("/employer-only", requireAuth, requireRole("EMPLOYER"), (req, res) => {
  res.json({ message: "hello employer" });
});
