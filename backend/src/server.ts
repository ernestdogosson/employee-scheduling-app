import "dotenv/config";
import express from "express";
import { authRouter } from "./routes/auth.ts";
import { availabilityRouter } from "./routes/availability.ts";
import { employeesRouter } from "./routes/employees.ts";
import { scheduleRouter } from "./routes/schedule.ts";
import { errorHandler } from "./middleware/errorHandler.ts";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "Employee Scheduling API is running" });
});

app.use("/auth", authRouter);
app.use("/employees", employeesRouter);
app.use("/availability", availabilityRouter);
app.use("/schedule", scheduleRouter);

app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
