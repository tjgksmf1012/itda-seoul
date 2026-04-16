import { Router } from "express";
import { z } from "zod";
import { buildRecommendation } from "../lib/recommend.js";

const requestSchema = z.object({
  district: z.string().trim().min(2).max(20),
  ageGroup: z.enum(["middle", "senior"]),
  livingSituation: z.enum(["alone", "withFamily"]),
  outingLevel: z.enum(["low", "medium", "high"]),
  walkMinutes: z.number().int().min(5).max(40),
  recentOutings: z.enum(["none", "rare", "weekly"]),
  guardianMode: z.enum(["none", "available", "accompany"]),
  interactionPreference: z.enum(["quiet", "small_group", "open"]),
  interestTags: z.array(z.string()).default([])
});

export const recommendationsRouter = Router();

recommendationsRouter.post("/", async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "추천 요청 형식이 올바르지 않습니다.",
      issues: parsed.error.issues
    });
  }

  try {
    const result = await buildRecommendation(parsed.data);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "추천 생성 중 오류가 발생했습니다."
    });
  }
});
