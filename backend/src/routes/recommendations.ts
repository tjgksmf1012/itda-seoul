import { Router } from "express";
import { z } from "zod";
import { buildRecommendation } from "../lib/recommend.js";

const requestSchema = z.object({
  persona: z.enum(["elder", "child", "worker"]),
  intent: z.enum(["outing", "program", "support"]),
  state: z.enum(["low", "normal", "high"]),
  walkMinutes: z.number().int().min(0).max(60),
  interestTags: z.array(z.string()).default([])
});

export const recommendationsRouter = Router();

recommendationsRouter.post("/", (req, res) => {
  const parsed = requestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "잘못된 추천 요청입니다.",
      issues: parsed.error.issues
    });
  }

  const result = buildRecommendation(parsed.data);
  return res.json(result);
});
