import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.ts";
import { Prisma } from "../generated/prisma/client.ts";
import { requireAuth } from "../middleware/requireAuth.ts";
import { validate } from "../middleware/validate.ts";

export const availabilityRouter = Router();

// GET /availability/:employeeId
availabilityRouter.get("/:employeeId", requireAuth, async (req, res) => {
  const employeeId = Number(req.params.employeeId);
  if (!Number.isInteger(employeeId) || employeeId < 1) {
    res.status(400).json({ error: "Invalid employeeId" });
    return;
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  // self-view or employer
  if (req.user!.role !== "EMPLOYER" && req.user!.sub !== employee.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // optional date range
  const where: Prisma.AvailabilityWhereInput = { employeeId };
  if (typeof req.query.from === "string" || typeof req.query.to === "string") {
    where.date = {};
    if (typeof req.query.from === "string") where.date.gte = new Date(req.query.from);
    if (typeof req.query.to === "string") where.date.lte = new Date(req.query.to);
  }

  const availabilities = await prisma.availability.findMany({
    where,
    orderBy: [{ date: "asc" }, { shiftId: "asc" }],
    include: { shift: true },
  });

  res.json({ availabilities });
});

// PUT /availability/:employeeId
const PutAvailabilitySchema = z.object({
  availabilities: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
      shiftId: z.number().int().positive(),
    }),
  ),
});

availabilityRouter.put(
  "/:employeeId",
  requireAuth,
  validate(PutAvailabilitySchema),
  async (req, res) => {
    const employeeId = Number(req.params.employeeId);
    if (!Number.isInteger(employeeId) || employeeId < 1) {
      res.status(400).json({ error: "Invalid employeeId" });
      return;
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    // employee sets own only
    if (req.user!.sub !== employee.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { availabilities } = req.body;

    await prisma.$transaction(async (tx) => {
      await tx.availability.deleteMany({ where: { employeeId } });
      if (availabilities.length > 0) {
        await tx.availability.createMany({
          data: availabilities.map((a: { date: string; shiftId: number }) => ({
            employeeId,
            date: new Date(a.date),
            shiftId: a.shiftId,
          })),
        });
      }
    });

    const saved = await prisma.availability.findMany({
      where: { employeeId },
      orderBy: [{ date: "asc" }, { shiftId: "asc" }],
      include: { shift: true },
    });

    res.json({ availabilities: saved });
  },
);
