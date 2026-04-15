import { Router } from "express";
import { z } from "zod";
import { buildRecommendation } from "../lib/recommend.js";

const requestSchema = z.object({
  district: z.string().trim().min(2).max(20),
  companionType: z.enum(["solo", "family", "parents", "friends"]),
  purpose: z.enum(["healing", "culture", "family", "learning"]),
  placePreference: z.enum(["indoor", "outdoor", "any"]),
  timeWindow: z.enum(["morning", "afternoon", "evening", "weekend"]),
  budget: z.enum(["free", "under10000", "any"]),
  mobilityLevel: z.enum(["easy", "normal", "active"]),
  maxTravelMinutes: z.number().int().min(5).max(60),
  interestTags: z.array(z.string()).default([])
});

export const recommendationsRouter = Router();

recommendationsRouter.post("/", (req, res) => {
  const parsed = requestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "추천 요청 형식이 올바르지 않습니다.",
      issues: parsed.error.issues
    });
  }

  const result = buildRecommendation(parsed.data);
  return res.json(result);
});
