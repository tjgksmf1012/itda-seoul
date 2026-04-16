import { AdminCase, AdminHistoryItem } from "../types.js";

export const mockCases: AdminCase[] = [
  {
    id: "case-1",
    name: "김순자",
    ageLabel: "78세 / 1인 가구",
    district: "종로구",
    participantPhone: "01012345678",
    guardianName: "김서연",
    guardianPhone: "01087654321",
    assignee: "김민정 복지사",
    nextContactAt: "2026-04-17T01:00:00.000Z",
    riskLevel: "high",
    workflowStatus: "pending",
    lastParticipationDays: 15,
    preferredTime: "평일 오전",
    mobilitySummary: "도보 10분 이내, 조용한 실내 활동 선호",
    nextRecommendation: "복지관 건강체조 프로그램 우선 제안",
    statusTags: ["초기 미접촉", "보호자 공유 필요"],
    profilePreset: {
      persona: "elder",
      intent: "outing",
      state: "low",
      walkMinutes: 10
    }
  },
  {
    id: "case-2",
    name: "박현주 보호자 가구",
    ageLabel: "부모님 돌봄 자녀",
    district: "성동구",
    participantPhone: "01034567890",
    guardianName: "박현주",
    guardianPhone: "01023456789",
    assignee: "이수현 사회복지사",
    nextContactAt: "2026-04-18T04:30:00.000Z",
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
    name: "서대문 방문요양 대상자 A",
    ageLabel: "82세 / 방문요양",
    district: "서대문구",
    participantPhone: "01056789012",
    guardianName: null,
    guardianPhone: null,
    assignee: "박은서 요양코디",
    nextContactAt: "2026-04-16T06:00:00.000Z",
    riskLevel: "high",
    workflowStatus: "scheduled",
    lastParticipationDays: 21,
    preferredTime: "평일 오후",
    mobilitySummary: "외출 피로감이 높아 상담 연결 우선",
    nextRecommendation: "안부 확인 상담 연결 후 저강도 프로그램 재추천",
    statusTags: ["상담 우선", "재접촉 필요"],
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
    summary: "보호자에게 추천 이유와 신청 링크를 공유했습니다."
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
    caseId: "case-2",
    type: "outreach",
    createdAt: "2026-04-15T13:40:00+09:00",
    summary: "카카오 링크 전달 후 보호자 회신 대기",
    outreachTarget: "guardian",
    outreachChannel: "kakao",
    outreachStatus: "sent"
  },
  {
    id: "history-5",
    caseId: "case-3",
    type: "recommendation",
    createdAt: "2026-04-14T11:30:00+09:00",
    summary: "상담 연결을 먼저 묶고 이후 프로그램을 재추천했습니다."
  }
];
