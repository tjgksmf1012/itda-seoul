import {
  personaPresets,
  stateAdjustments,
  type IntentKey,
  type PersonaKey,
  type StateKey
} from "../data/demo";

export type CaseStatus = "pending" | "contacted" | "scheduled" | "completed";

export type RecommendationResponse = {
  recommendationType: IntentKey;
  primaryAction: string;
  summary: string;
  shareMessage: string;
  reasons: string[];
  actionPlan: string[];
  checkInMessage: string;
  supportLevel: "light" | "guided" | "urgent";
  matchScore: number;
  suggestedPrograms: {
    id: string;
    title: string;
    district?: string;
    place?: string;
    startDate?: string;
    endDate?: string;
    availabilityStatus?: "always" | "upcoming" | "closing_soon" | "ended";
    summary: string;
    tags?: string[];
    actionUrl: string;
  }[];
};

export type AdminCase = {
  id: string;
  name: string;
  ageLabel: string;
  district: string;
  riskLevel: "low" | "medium" | "high";
  workflowStatus: CaseStatus;
  lastParticipationDays: number;
  preferredTime: string;
  mobilitySummary: string;
  nextRecommendation: string;
  statusTags: string[];
  profilePreset: {
    persona: PersonaKey;
    intent: IntentKey;
    state: StateKey;
    walkMinutes: number;
  };
};

export type AdminHistoryItem = {
  id: string;
  caseId: string;
  type: "recommendation" | "status_update" | "share";
  createdAt: string;
  summary: string;
};

export type AdminDashboardResponse = {
  summary: {
    totalCases: number;
    needsAttention: number;
    scheduledThisWeek: number;
    completedThisWeek: number;
  };
  cases: AdminCase[];
};

type RecommendationInput = {
  persona: PersonaKey;
  intent: IntentKey;
  state: StateKey;
  walkMinutes: number;
  interestTags: string[];
};

const fallbackHistory: Record<string, AdminHistoryItem[]> = {
  "case-1": [
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
    }
  ],
  "case-2": [
    {
      id: "history-3",
      caseId: "case-2",
      type: "status_update",
      createdAt: "2026-04-14T10:00:00+09:00",
      summary: "보호자에게 연락 완료 상태로 변경했습니다."
    }
  ],
  "case-3": [
    {
      id: "history-4",
      caseId: "case-3",
      type: "recommendation",
      createdAt: "2026-04-14T11:30:00+09:00",
      summary: "상담 연결을 우선으로 두고 후속 프로그램을 재추천했습니다."
    }
  ]
};

const fallbackDashboard: AdminDashboardResponse = {
  summary: {
    totalCases: 3,
    needsAttention: 2,
    scheduledThisWeek: 1,
    completedThisWeek: 0
  },
  cases: [
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
  ]
};

function buildFallbackSummary() {
  return {
    totalCases: fallbackDashboard.cases.length,
    needsAttention: fallbackDashboard.cases.filter((item) => item.riskLevel === "high").length,
    scheduledThisWeek: fallbackDashboard.cases.filter((item) => item.workflowStatus === "scheduled").length,
    completedThisWeek: fallbackDashboard.cases.filter((item) => item.workflowStatus === "completed").length
  };
}

function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL;
}

function buildFallbackResponse(input: RecommendationInput): RecommendationResponse {
  const preset = personaPresets[input.persona];

  return {
    recommendationType: input.intent,
    primaryAction: preset.title,
    summary: `${preset.summary} ${stateAdjustments[input.state]}`,
    shareMessage: `${preset.title} 기준으로 추천했고 도보 가능 거리 ${input.walkMinutes}분 이내 후보를 우선 반영했습니다.`,
    reasons: [
      `도보 가능 거리 ${input.walkMinutes}분 이내 후보를 우선 반영했습니다.`,
      preset.reasons[1][1],
      preset.reasons[2][1]
    ],
    actionPlan: [
      `${preset.title} 세부 내용을 확인합니다.`,
      "가장 쉬운 링크 또는 공유 경로를 먼저 엽니다.",
      "24시간 안에 참여 의사나 추가 지원 필요 여부를 다시 확인합니다."
    ],
    checkInMessage: "추천 전달 후 하루 안에 참여 의사를 확인해 주세요.",
    supportLevel: input.state === "low" ? "guided" : "light",
    matchScore: 72,
    suggestedPrograms: [
      {
        id: "fallback-1",
        title: preset.title,
        district: "서울시",
        place: "가까운 추천 거점",
        startDate: "2026-04-15",
        endDate: "2026-04-22",
        availabilityStatus: "upcoming",
        summary: preset.summary,
        tags: input.interestTags,
        actionUrl: "https://yeyak.seoul.go.kr"
      }
    ]
  };
}

export async function requestRecommendation(
  input: RecommendationInput
): Promise<RecommendationResponse> {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    return buildFallbackResponse(input);
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/recommendations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error("request failed");
    }

    return (await response.json()) as RecommendationResponse;
  } catch (_error) {
    return buildFallbackResponse(input);
  }
}

export async function requestAdminDashboard(): Promise<AdminDashboardResponse> {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    fallbackDashboard.summary = buildFallbackSummary();
    return fallbackDashboard;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/admin/dashboard`);

    if (!response.ok) {
      throw new Error("request failed");
    }

    return (await response.json()) as AdminDashboardResponse;
  } catch (_error) {
    return fallbackDashboard;
  }
}

export async function requestCaseHistory(caseId: string): Promise<AdminHistoryItem[]> {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    return fallbackHistory[caseId] ?? [];
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/admin/cases/${caseId}/history`);

    if (!response.ok) {
      throw new Error("request failed");
    }

    const data = (await response.json()) as { items: AdminHistoryItem[] };
    return data.items;
  } catch (_error) {
    return fallbackHistory[caseId] ?? [];
  }
}

export async function updateCaseStatus(
  caseId: string,
  status: CaseStatus,
  note: string
): Promise<{
  case: AdminCase;
  summary: AdminDashboardResponse["summary"];
  historyItem: AdminHistoryItem;
}> {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    const target = fallbackDashboard.cases.find((item) => item.id === caseId);

    if (!target) {
      throw new Error("case not found");
    }

    target.workflowStatus = status;

    const historyItem: AdminHistoryItem = {
      id: `history-${Date.now()}`,
      caseId,
      type: "status_update",
      createdAt: new Date().toISOString(),
      summary: note ? `${status} 상태로 변경했습니다. 메모: ${note}` : `${status} 상태로 변경했습니다.`
    };

    fallbackHistory[caseId] = [historyItem, ...(fallbackHistory[caseId] ?? [])];

    return {
      case: target,
      summary: buildFallbackSummary(),
      historyItem
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/admin/cases/${caseId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      status,
      note
    })
  });

  if (!response.ok) {
    throw new Error("request failed");
  }

  return (await response.json()) as {
    case: AdminCase;
    summary: AdminDashboardResponse["summary"];
    historyItem: AdminHistoryItem;
  };
}
