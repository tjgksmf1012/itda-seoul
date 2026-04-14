import { mockCases, mockHistory } from "../data/mockCases.js";
import { AdminCase, AdminHistoryItem, CaseStatus } from "../types.js";

export function listCases(): AdminCase[] {
  return mockCases;
}

export function listCaseHistory(caseId: string): AdminHistoryItem[] {
  return mockHistory
    .filter((item) => item.caseId === caseId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function updateCaseWorkflowStatus(caseId: string, status: CaseStatus, note?: string) {
  const target = mockCases.find((item) => item.id === caseId);

  if (!target) {
    return null;
  }

  target.workflowStatus = status;

  const historyItem: AdminHistoryItem = {
    id: `history-${mockHistory.length + 1}`,
    caseId,
    type: "status_update",
    createdAt: new Date().toISOString(),
    summary: note?.trim()
      ? `${status} 상태로 변경했습니다. 메모: ${note.trim()}`
      : `${status} 상태로 변경했습니다.`
  };

  mockHistory.push(historyItem);

  return {
    case: target,
    historyItem
  };
}
