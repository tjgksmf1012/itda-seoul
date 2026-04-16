import { Router } from "express";
import { z } from "zod";
import {
  appendCaseHistory,
  getCaseById,
  getDashboard,
  listCaseHistory,
  updateCasePlanning,
  updateCaseWorkflowStatus
} from "../storage/adminRepository.js";
import { dispatchOutreach } from "../services/outreach.js";

const statusSchema = z.object({
  status: z.enum(["pending", "contacted", "scheduled", "completed"]),
  note: z.string().trim().max(200).optional()
});

const planningSchema = z.object({
  assignee: z.string().trim().min(1).max(40),
  nextContactAt: z.string().datetime().nullable().optional(),
  note: z.string().trim().max(200).optional()
});

const historySchema = z.object({
  type: z.enum(["recommendation", "share", "participation", "outreach"]),
  summary: z.string().trim().min(8).max(240),
  nextRecommendation: z.string().trim().max(160).optional(),
  workflowStatus: z.enum(["pending", "contacted", "scheduled", "completed"]).optional(),
  reasonCode: z.enum(["mobility", "schedule", "interest", "guardian", "health", "other"]).optional(),
  outreachTarget: z.enum(["participant", "guardian"]).optional(),
  outreachChannel: z.enum(["phone", "sms", "kakao"]).optional(),
  outreachStatus: z.enum(["attempted", "sent", "connected", "failed"]).optional()
}).superRefine((value, ctx) => {
  if (value.type === "outreach" && (!value.outreachChannel || !value.outreachStatus)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "연락 실행 이력에는 채널과 결과가 필요합니다."
    });
  }
});

const outreachSendSchema = z.object({
  target: z.enum(["participant", "guardian"]),
  channel: z.enum(["phone", "sms", "kakao"]),
  message: z.string().trim().min(4).max(1000)
});

export const adminRouter = Router();

adminRouter.get("/dashboard", async (_req, res) => {
  const dashboard = await getDashboard();

  return res.json(dashboard);
});

adminRouter.get("/cases/:caseId/history", async (req, res) => {
  const items = await listCaseHistory(req.params.caseId);

  return res.json({
    items
  });
});

adminRouter.patch("/cases/:caseId/status", async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "잘못된 상태 변경 요청입니다.",
      issues: parsed.error.issues
    });
  }

  const result = await updateCaseWorkflowStatus(
    req.params.caseId,
    parsed.data.status,
    parsed.data.note
  );

  if (!result) {
    return res.status(404).json({
      message: "대상자를 찾을 수 없습니다."
    });
  }

  return res.json(result);
});

adminRouter.patch("/cases/:caseId/planning", async (req, res) => {
  const parsed = planningSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "잘못된 계획 업데이트 요청입니다.",
      issues: parsed.error.issues
    });
  }

  const result = await updateCasePlanning(
    req.params.caseId,
    parsed.data.assignee,
    parsed.data.nextContactAt,
    parsed.data.note
  );

  if (!result) {
    return res.status(404).json({
      message: "대상자를 찾을 수 없습니다."
    });
  }

  return res.json(result);
});

adminRouter.post("/cases/:caseId/history", async (req, res) => {
  const parsed = historySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "이력 기록 요청 형식이 올바르지 않습니다.",
      issues: parsed.error.issues
    });
  }

  const result = await appendCaseHistory(
    req.params.caseId,
    parsed.data.type,
    parsed.data.summary,
    parsed.data.nextRecommendation,
    parsed.data.workflowStatus,
    parsed.data.reasonCode,
    parsed.data.outreachTarget,
    parsed.data.outreachChannel,
    parsed.data.outreachStatus
  );

  if (!result) {
    return res.status(404).json({
      message: "대상자를 찾을 수 없습니다."
    });
  }

  return res.status(201).json(result);
});

adminRouter.post("/cases/:caseId/outreach/send", async (req, res) => {
  const parsed = outreachSendSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "잘못된 발송 요청입니다.",
      issues: parsed.error.issues
    });
  }

  const adminCase = await getCaseById(req.params.caseId);

  if (!adminCase) {
    return res.status(404).json({
      message: "대상자를 찾을 수 없습니다."
    });
  }

  const targetPhone =
    parsed.data.target === "guardian" ? adminCase.guardianPhone : adminCase.participantPhone;

  if (!targetPhone) {
    return res.status(400).json({
      message: "선택한 연락 대상의 전화번호가 없습니다."
    });
  }

  try {
    const dispatch = await dispatchOutreach({
      channel: parsed.data.channel,
      to: targetPhone,
      message: parsed.data.message
    });

    const historySummary = `${parsed.data.channel} ${dispatch.status}: ${parsed.data.message}`;
    const result = await appendCaseHistory(
      adminCase.id,
      "outreach",
      historySummary,
      undefined,
      dispatch.status === "connected" ? "contacted" : undefined,
      undefined,
      parsed.data.target,
      parsed.data.channel,
      dispatch.status
    );

    if (!result) {
      return res.status(404).json({
        message: "대상자를 찾을 수 없습니다."
      });
    }

    return res.status(201).json({
      ...result,
      dispatch
    });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "발송 처리 중 오류가 발생했습니다."
    });
  }
});
