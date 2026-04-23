import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.ts";
import { Prisma } from "../generated/prisma/client.ts";
import { requireAuth } from "../middleware/requireAuth.ts";
import { requireRole } from "../middleware/requireRole.ts";
import { validate } from "../middleware/validate.ts";

export const scheduleRouter = Router();

// GET /schedule
scheduleRouter.get("/", requireAuth, async (req, res) => {
  const where: Prisma.ScheduleEntryWhereInput = {};

  // date range
  if (typeof req.query.from === "string" || typeof req.query.to === "string") {
    where.date = {};
    if (typeof req.query.from === "string") where.date.gte = new Date(req.query.from);
    if (typeof req.query.to === "string") where.date.lte = new Date(req.query.to);
  }

  if (req.user!.role === "EMPLOYER") {
    // optional employeeId filter
    if (typeof req.query.employeeId === "string") {
      const employeeId = Number(req.query.employeeId);
      if (!Number.isInteger(employeeId) || employeeId < 1) {
        res.status(400).json({ error: "Invalid employeeId" });
        return;
      }
      where.employeeId = employeeId;
    }
  } else {
    // employees always scoped to self
    const self = await prisma.employee.findUnique({ where: { userId: req.user!.sub } });
    if (!self) {
      res.status(404).json({ error: "No employee profile for this user" });
      return;
    }
    if (typeof req.query.employeeId === "string" && Number(req.query.employeeId) !== self.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    where.employeeId = self.id;
  }

  const entries = await prisma.scheduleEntry.findMany({
    where,
    orderBy: [{ date: "asc" }, { shiftId: "asc" }, { employeeId: "asc" }],
    include: { shift: true, employee: true },
  });

  res.json({ entries });
});

// PUT /schedule
const PutScheduleSchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "from must be YYYY-MM-DD"),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "to must be YYYY-MM-DD"),
    entries: z.array(
      z.object({
        employeeId: z.number().int().positive(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
        shiftId: z.number().int().positive(),
      }),
    ),
  })
  .refine((d) => d.from <= d.to, { message: "from must be <= to" });

scheduleRouter.put(
  "/",
  requireAuth,
  requireRole("EMPLOYER"),
  validate(PutScheduleSchema),
  async (req, res) => {
    const { from, to, entries } = req.body as z.infer<typeof PutScheduleSchema>;

    // every entry must fall inside the range
    for (const e of entries) {
      if (e.date < from || e.date > to) {
        res.status(400).json({ error: `Entry ${e.date} is outside ${from}..${to}` });
        return;
      }
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    await prisma.$transaction(async (tx) => {
      await tx.scheduleEntry.deleteMany({
        where: { date: { gte: fromDate, lte: toDate } },
      });
      if (entries.length > 0) {
        await tx.scheduleEntry.createMany({
          data: entries.map((e) => ({
            employeeId: e.employeeId,
            date: new Date(e.date),
            shiftId: e.shiftId,
          })),
        });
      }
    });

    const saved = await prisma.scheduleEntry.findMany({
      where: { date: { gte: fromDate, lte: toDate } },
      orderBy: [{ date: "asc" }, { shiftId: "asc" }, { employeeId: "asc" }],
      include: { shift: true, employee: true },
    });

    res.json({ entries: saved });
  },
);
