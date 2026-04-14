import { Router } from "express";
import { z } from "zod";
import { mockCases, mockHistory } from "../data/mockCases.js";
import { AdminHistoryItem, CaseStatus } from "../types.js";

const statusSchema = z.object({
  status: z.enum(["pending", "contacted", "scheduled", "completed"]),
  note: z.string().trim().max(200).optional()
});

const statusLabelMap: Record<CaseStatus, string> = {
  pending: "대기",
  contacted: "연락 완료",
  scheduled: "예약 진행",
  completed: "참여 완료"
};

function buildSummary() {
  return {
    totalCases: mockCases.length,
    needsAttention: mockCases.filter((item) => item.riskLevel === "high").length,
    scheduledThisWeek: mockCases.filter((item) => item.workflowStatus === "scheduled").length,
    completedThisWeek: mockCases.filter((item) => item.workflowStatus === "completed").length
  };
}

export const adminRouter = Router();

adminRouter.get("/dashboard", (_req, res) => {
  return res.json({
    summary: buildSummary(),
    cases: mockCases
  });
});

adminRouter.get("/cases/:caseId/history", (req, res) => {
  const items = mockHistory
    .filter((item) => item.caseId === req.params.caseId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return res.json({
    items
  });
});

adminRouter.patch("/cases/:caseId/status", (req, res) => {
  const parsed = statusSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "잘못된 상태 변경 요청입니다.",
      issues: parsed.error.issues
    });
  }

  const target = mockCases.find((item) => item.id === req.params.caseId);

  if (!target) {
    return res.status(404).json({
      message: "대상자를 찾을 수 없습니다."
    });
  }

  target.workflowStatus = parsed.data.status;

  const historyItem: AdminHistoryItem = {
    id: `history-${mockHistory.length + 1}`,
    caseId: target.id,
    type: "status_update",
    createdAt: new Date().toISOString(),
    summary: parsed.data.note?.trim()
      ? `${statusLabelMap[parsed.data.status]} 상태로 변경했습니다. 메모: ${parsed.data.note.trim()}`
      : `${statusLabelMap[parsed.data.status]} 상태로 변경했습니다.`
  };

  mockHistory.push(historyItem);

  return res.json({
    case: target,
    summary: buildSummary(),
    historyItem
  });
});
