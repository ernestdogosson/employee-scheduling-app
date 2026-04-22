import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../db.ts";
import { signToken } from "../auth/jwt.ts";
import { requireAuth } from "../middleware/requireAuth.ts";
import { requireRole } from "../middleware/requireRole.ts";
import { validate } from "../middleware/validate.ts";

export const authRouter = Router();

const LoginSchema = z.object({
  loginCode: z.string().min(1),
});

// POST /auth/login
authRouter.post("/login", validate(LoginSchema), async (req, res) => {
  const { loginCode } = req.body;

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
