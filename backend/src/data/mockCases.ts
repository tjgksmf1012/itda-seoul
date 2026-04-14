import { AdminCase, AdminHistoryItem } from "../types.js";

export const mockCases: AdminCase[] = [
  {
    id: "case-1",
    name: "김순자",
    ageLabel: "78세 · 1인 가구",
    district: "종로구",
    riskLevel: "high",
    workflowStatus: "pending",
    lastParticipationDays: 15,
    preferredTime: "평일 오전",
    mobilitySummary: "도보 10분 이내, 소규모 활동 선호",
    nextRecommendation: "복지관 건강체조 프로그램 우선 제안",
    statusTags: ["장기 미참여", "보호자 공유 필요"],
    profilePreset: {
      persona: "elder",
      intent: "outing",
      state: "low",
      walkMinutes: 10
    }
  },
  {
    id: "case-2",
    name: "박미영 보호자 가정",
    ageLabel: "부모 돌봄 자녀",
    district: "성동구",
    riskLevel: "medium",
    workflowStatus: "contacted",
    lastParticipationDays: 7,
    preferredTime: "주말 오후",
    mobilitySummary: "보호자 동행 가능, 문화행사 선호",
    nextRecommendation: "이번 주 첫 외출 후보 3개 카드 전송",
    statusTags: ["문화 선호", "카카오 공유"],
    profilePreset: {
      persona: "child",
      intent: "program",
      state: "high",
      walkMinutes: 15
    }
  },
  {
    id: "case-3",
    name: "은평 방문요양 대상자 A",
    ageLabel: "82세 · 방문요양",
    district: "은평구",
    riskLevel: "high",
    workflowStatus: "scheduled",
    lastParticipationDays: 21,
    preferredTime: "평일 오후",
    mobilitySummary: "외출 피로 큼, 상담 연결 우선",
    nextRecommendation: "안부확인 상담 연결 후 짧은 프로그램 재추천",
    statusTags: ["상담 우선", "재추천 필요"],
    profilePreset: {
      persona: "worker",
      intent: "support",
      state: "low",
      walkMinutes: 8
    }
  }
];

export const mockHistory: AdminHistoryItem[] = [
  {
    id: "history-1",
    caseId: "case-1",
    type: "recommendation",
    createdAt: "2026-04-14T09:00:00+09:00",
    summary: "복지관 건강체조 프로그램을 1순위로 추천했습니다."
  },
  {
    id: "history-2",
    caseId: "case-1",
    type: "share",
    createdAt: "2026-04-14T09:10:00+09:00",
    summary: "보호자에게 추천 이유와 링크를 공유했습니다."
  },
  {
    id: "history-3",
    caseId: "case-2",
    type: "status_update",
    createdAt: "2026-04-14T10:00:00+09:00",
    summary: "보호자에게 연락 완료 상태로 변경했습니다."
  },
  {
    id: "history-4",
    caseId: "case-3",
    type: "recommendation",
    createdAt: "2026-04-14T11:30:00+09:00",
    summary: "상담 연결을 우선으로 두고 후속 프로그램을 재추천했습니다."
  }
];
