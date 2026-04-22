import "dotenv/config";
import express from "express";
import { authRouter } from "./routes/auth.ts";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "Employee Scheduling API is running" });
});

app.use("/auth", authRouter);

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
