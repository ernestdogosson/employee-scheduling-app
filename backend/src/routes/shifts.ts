import { Router } from "express";
import { prisma } from "../db.ts";
import { requireAuth } from "../middleware/requireAuth.ts";

export const shiftsRouter = Router();

// GET /shifts
shiftsRouter.get("/", requireAuth, async (_req, res) => {
  const shifts = await prisma.shift.findMany({ orderBy: { id: "asc" } });
  res.json({ shifts });
});
