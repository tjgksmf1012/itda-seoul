import cors from "cors";
import express from "express";
import { getEnv } from "./config/env.js";
import { adminRouter } from "./routes/admin.js";
import { programsRouter } from "./routes/programs.js";
import { recommendationsRouter } from "./routes/recommendations.js";

export function createApp() {
  const app = express();
  const env = getEnv();

  app.use(
    cors({
      origin: env.appOrigin === "*" ? true : env.appOrigin
    })
  );
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({
      service: "itda-seoul-backend",
      status: "ok"
    });
  });

  app.use("/api/recommendations", recommendationsRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/programs", programsRouter);

  return app;
}
