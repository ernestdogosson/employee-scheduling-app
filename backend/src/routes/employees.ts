import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.ts";
import { Prisma } from "../generated/prisma/client.ts";
import { requireAuth } from "../middleware/requireAuth.ts";
import { requireRole } from "../middleware/requireRole.ts";
import { validate } from "../middleware/validate.ts";

export const employeesRouter = Router();

const CreateEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  loginCode: z.string().regex(/^\d{4}$/, "loginCode must be 4 digits"),
});

// GET /employees
employeesRouter.get("/", requireAuth, requireRole("EMPLOYER"), async (_req, res) => {
  const employees = await prisma.employee.findMany({
    orderBy: { id: "asc" },
  });
  res.json({ employees });
});

// GET /employees/:id
employeesRouter.get("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  // self-view or employer
  if (req.user!.role !== "EMPLOYER" && req.user!.sub !== employee.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json({ employee });
});

// POST /employees
employeesRouter.post(
  "/",
  requireAuth,
  requireRole("EMPLOYER"),
  validate(CreateEmployeeSchema),
  async (req, res) => {
    const { firstName, lastName, loginCode } = req.body;

    try {
      const employee = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { loginCode, role: "EMPLOYEE" },
        });
        return tx.employee.create({
          data: { firstName, lastName, userId: user.id },
        });
      });

      res.status(201).json({ employee });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        res.status(409).json({ error: "Login code already in use" });
        return;
      }
      throw err;
    }
  },
);
