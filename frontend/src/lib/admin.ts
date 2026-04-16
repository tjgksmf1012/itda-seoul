export type CaseStatus = "pending" | "contacted" | "scheduled" | "completed";
export type PersonaKey = "elder" | "child" | "worker";
export type ParticipationReasonCode = "mobility" | "schedule" | "interest" | "guardian" | "health" | "other";
export type OutreachChannel = "phone" | "sms" | "kakao";
export type OutreachStatus = "attempted" | "sent" | "connected" | "failed";
export type OutreachTarget = "participant" | "guardian";

export type AdminCase = {
  id: string;
  name: string;
  ageLabel: string;
  district: string;
  participantPhone?: string;
  guardianName?: string | null;
  guardianPhone?: string | null;
  assignee: string;
  nextContactAt: string | null;
  riskLevel: "low" | "medium" | "high";
  workflowStatus: CaseStatus;
  lastParticipationDays: number;
  preferredTime: string;
  mobilitySummary: string;
  nextRecommendation: string;
  statusTags: string[];
  profilePreset: {
    persona: "elder" | "child" | "worker";
    intent: "outing" | "program" | "support";
    state: "low" | "normal" | "high";
    walkMinutes: number;
  };
};

export type AdminHistoryItem = {
  id: string;
  caseId: string;
  type: "recommendation" | "status_update" | "share" | "participation" | "outreach";
  createdAt: string;
  summary: string;
  reasonCode?: ParticipationReasonCode;
  outreachTarget?: OutreachTarget;
  outreachChannel?: OutreachChannel;
  outreachStatus?: OutreachStatus;
};

export type AdminDashboard = {
  summary: {
    totalCases: number;
    needsAttention: number;
    scheduledThisWeek: number;
    completedThisWeek: number;
  };
  followUpInsights: {
    plannedCount: number;
    overdueCount: number;
    dueTodayCount: number;
    upcomingCount: number;
    unplannedCount: number;
    urgentCaseIds: string[];
    byAssignee: Array<{
      assignee: string;
      total: number;
      overdue: number;
      dueToday: number;
    }>;
  };
  performanceMetrics: {
    recommendationLogs: number;
    shareLogs: number;
    outreachLogs: number;
    connectedOutreachLogs: number;
    outreachCoverageRate: number;
    playbookRecommendationLogs: number;
    completedCases: number;
    shareCoverageRate: number;
    completionRate: number;
    shareToCompletionCases: number;
    playbookRecoveredCases: number;
  };
  participationInsights: {
    totalLogged: number;
    topReasons: Array<{
      reasonCode: ParticipationReasonCode;
      count: number;
    }>;
    playbooks: Array<{
      reasonCode: ParticipationReasonCode;
      title: string;
      action: string;
    }>;
    byDistrict: Array<{
      district: string;
      reasonCode: ParticipationReasonCode;
      count: number;
    }>;
    byPersona: Array<{
      persona: PersonaKey;
      reasonCode: ParticipationReasonCode;
      count: number;
    }>;
  };
  cases: AdminCase[];
};

const statusText: Record<CaseStatus, string> = {
  pending: "대기",
  contacted: "연락 완료",
  scheduled: "예약 진행",
  completed: "참여 완료"
};

function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL;
}

let fallbackCases: AdminCase[] = [
  {
    id: "case-1",
    name: "김순자",
    ageLabel: "78세 / 1인 가구",
    district: "종로구",
    assignee: "김민정 복지사",
    nextContactAt: "2026-04-17T01:00:00.000Z",
    riskLevel: "high",
    workflowStatus: "pending",
    lastParticipationDays: 15,
    preferredTime: "평일 오전",
    mobilitySummary: "도보 10분 이내, 소규모 실내 활동 선호",
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
    name: "박현주 보호자 가정",
    ageLabel: "부모님 돌봄 자녀",
    district: "성동구",
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
    assignee: "박지은 요양코디",
    nextContactAt: "2026-04-16T06:00:00.000Z",
    riskLevel: "high",
    workflowStatus: "scheduled",
    lastParticipationDays: 21,
    preferredTime: "평일 오후",
    mobilitySummary: "외출 피로도가 높아 상담 연결 우선",
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

let fallbackHistory: AdminHistoryItem[] = [
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
    summary: "상담 연결을 먼저 두고 이후 프로그램을 재추천했습니다."
  }
];

function buildFallbackSummary(): AdminDashboard["summary"] {
  return {
    totalCases: fallbackCases.length,
    needsAttention: fallbackCases.filter((item) => item.riskLevel === "high").length,
    scheduledThisWeek: fallbackCases.filter((item) => item.workflowStatus === "scheduled").length,
    completedThisWeek: fallbackCases.filter((item) => item.workflowStatus === "completed").length
  };
}

function buildFallbackPerformanceMetrics(): AdminDashboard["performanceMetrics"] {
  const recommendationItems = fallbackHistory.filter((item) => item.type === "recommendation");
  const shareItems = fallbackHistory.filter((item) => item.type === "share");
  const outreachItems = fallbackHistory.filter((item) => item.type === "outreach");
  const connectedOutreachItems = outreachItems.filter((item) => item.outreachStatus === "connected");
  const completedCaseIds = new Set(
    fallbackCases.filter((item) => item.workflowStatus === "completed").map((item) => item.id)
  );
  const sharedCaseIds = new Set(shareItems.map((item) => item.caseId));
  const playbookCaseIds = new Set(
    recommendationItems.filter((item) => item.summary.includes("재추천")).map((item) => item.caseId)
  );
  const recommendationCount = recommendationItems.length;
  const shareCount = shareItems.length;
  const completedCases = completedCaseIds.size;

  return {
    recommendationLogs: recommendationCount,
    shareLogs: shareCount,
    outreachLogs: outreachItems.length,
    connectedOutreachLogs: connectedOutreachItems.length,
    outreachCoverageRate:
      fallbackCases.length > 0 ? Math.round((new Set(outreachItems.map((item) => item.caseId)).size / fallbackCases.length) * 100) : 0,
    playbookRecommendationLogs: playbookCaseIds.size,
    completedCases,
    shareCoverageRate: recommendationCount > 0 ? Math.round((shareCount / recommendationCount) * 100) : 0,
    completionRate: fallbackCases.length > 0 ? Math.round((completedCases / fallbackCases.length) * 100) : 0,
    shareToCompletionCases: [...sharedCaseIds].filter((caseId) => completedCaseIds.has(caseId)).length,
    playbookRecoveredCases: [...playbookCaseIds].filter((caseId) => completedCaseIds.has(caseId)).length
  };
}

function buildFallbackFollowUpInsights(): AdminDashboard["followUpInsights"] {
  const now = new Date();
  const todayKey = now.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const urgentCaseIds = new Set<string>();
  const byAssignee = new Map<
    string,
    {
      assignee: string;
      total: number;
      overdue: number;
      dueToday: number;
    }
  >();
  let plannedCount = 0;
  let overdueCount = 0;
  let dueTodayCount = 0;
  let upcomingCount = 0;
  let unplannedCount = 0;

  for (const item of fallbackCases) {
    const assignee = item.assignee.trim() || "미지정";
    const assigneeEntry = byAssignee.get(assignee) ?? {
      assignee,
      total: 0,
      overdue: 0,
      dueToday: 0
    };

    assigneeEntry.total += 1;

    if (!item.nextContactAt) {
      unplannedCount += 1;
      byAssignee.set(assignee, assigneeEntry);
      continue;
    }

    plannedCount += 1;
    const nextContactDate = new Date(item.nextContactAt);

    if (Number.isNaN(nextContactDate.getTime())) {
      unplannedCount += 1;
      byAssignee.set(assignee, assigneeEntry);
      continue;
    }

    const nextContactKey = nextContactDate.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });

    if (nextContactDate.getTime() < now.getTime()) {
      overdueCount += 1;
      urgentCaseIds.add(item.id);
      assigneeEntry.overdue += 1;
    } else if (nextContactKey === todayKey) {
      dueTodayCount += 1;
      urgentCaseIds.add(item.id);
      assigneeEntry.dueToday += 1;
    } else {
      upcomingCount += 1;
    }

    byAssignee.set(assignee, assigneeEntry);
  }

  return {
    plannedCount,
    overdueCount,
    dueTodayCount,
    upcomingCount,
    unplannedCount,
    urgentCaseIds: [...urgentCaseIds],
    byAssignee: [...byAssignee.values()].sort((left, right) => {
      const urgencyDelta = right.overdue + right.dueToday - (left.overdue + left.dueToday);
      if (urgencyDelta !== 0) {
        return urgencyDelta;
      }

      return right.total - left.total;
    })
  };
}

function buildFallbackParticipationInsights(): AdminDashboard["participationInsights"] {
  const participationItems = fallbackHistory.filter((item) => item.type === "participation");
  const counts = new Map<ParticipationReasonCode, number>();
  const caseMap = new Map(fallbackCases.map((item) => [item.id, item]));
  const districtCounts = new Map<string, { district: string; reasonCode: ParticipationReasonCode; count: number }>();
  const personaCounts = new Map<string, { persona: PersonaKey; reasonCode: ParticipationReasonCode; count: number }>();

  for (const item of participationItems) {
    if (!item.reasonCode) {
      continue;
    }

    counts.set(item.reasonCode, (counts.get(item.reasonCode) ?? 0) + 1);

    const adminCase = caseMap.get(item.caseId);

    if (adminCase) {
      const districtKey = `${adminCase.district}:${item.reasonCode}`;
      const personaKey = `${adminCase.profilePreset.persona}:${item.reasonCode}`;

      districtCounts.set(districtKey, {
        district: adminCase.district,
        reasonCode: item.reasonCode,
        count: (districtCounts.get(districtKey)?.count ?? 0) + 1
      });

      personaCounts.set(personaKey, {
        persona: adminCase.profilePreset.persona,
        reasonCode: item.reasonCode,
        count: (personaCounts.get(personaKey)?.count ?? 0) + 1
      });
    }
  }

  const orderedReasons = [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 3);

  return {
    totalLogged: participationItems.length,
    topReasons: orderedReasons.map(([reasonCode, count]) => ({ reasonCode, count })),
    playbooks: orderedReasons.map(([reasonCode]) => ({
      reasonCode,
      title:
        reasonCode === "mobility"
          ? "이동 부담 대응"
          : reasonCode === "schedule"
            ? "시간대 조정"
            : reasonCode === "interest"
              ? "관심사 재탐색"
              : reasonCode === "guardian"
                ? "보호자 부재 대응"
                : reasonCode === "health"
                  ? "건강 상태 고려"
                  : "기타 사유 확인",
      action:
        reasonCode === "mobility"
          ? "실내 저이동 프로그램과 안부 연결을 먼저 제안합니다."
          : reasonCode === "schedule"
            ? "가능 시간대를 다시 맞춰 평일 오전 또는 주말 오후 후보로 재추천합니다."
            : reasonCode === "interest"
              ? "반응이 좋았던 관심사 중심으로 후보를 다시 좁힙니다."
              : reasonCode === "guardian"
                ? "보호자 없이 참여 가능한 프로그램을 우선 배치합니다."
                : reasonCode === "health"
                  ? "상담과 저강도 실내 프로그램을 먼저 연결합니다."
                  : "메모를 확인해 다음 체크인 문구와 추천 조건을 보정합니다."
    })),
    byDistrict: [...districtCounts.values()].sort((left, right) => right.count - left.count).slice(0, 3),
    byPersona: [...personaCounts.values()].sort((left, right) => right.count - left.count).slice(0, 3)
  };
}

export async function requestAdminDashboard(): Promise<AdminDashboard> {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    return {
      summary: buildFallbackSummary(),
      followUpInsights: buildFallbackFollowUpInsights(),
      performanceMetrics: buildFallbackPerformanceMetrics(),
      participationInsights: buildFallbackParticipationInsights(),
      cases: fallbackCases
    };
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/admin/dashboard`);

    if (!response.ok) {
      throw new Error("request failed");
    }

    return (await response.json()) as AdminDashboard;
  } catch (_error) {
    return {
      summary: buildFallbackSummary(),
      followUpInsights: buildFallbackFollowUpInsights(),
      performanceMetrics: buildFallbackPerformanceMetrics(),
      participationInsights: buildFallbackParticipationInsights(),
      cases: fallbackCases
    };
  }
}

export async function requestAdminHistory(caseId: string): Promise<AdminHistoryItem[]> {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    return fallbackHistory
      .filter((item) => item.caseId === caseId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/admin/cases/${caseId}/history`);

    if (!response.ok) {
      throw new Error("request failed");
    }

    const data = (await response.json()) as { items: AdminHistoryItem[] };
    return data.items;
  } catch (_error) {
    return fallbackHistory
      .filter((item) => item.caseId === caseId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }
}

export async function updateAdminCaseStatus(
  caseId: string,
  status: CaseStatus,
  note?: string
): Promise<{ case: AdminCase; summary: AdminDashboard["summary"]; historyItem: AdminHistoryItem }> {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    const target = fallbackCases.find((item) => item.id === caseId);

    if (!target) {
      throw new Error("case not found");
    }

    target.workflowStatus = status;

    const historyItem: AdminHistoryItem = {
      id: `history-${fallbackHistory.length + 1}`,
      caseId,
      type: "status_update",
      createdAt: new Date().toISOString(),
      summary: note?.trim() ? `${statusText[status]} 상태로 변경했습니다. 메모: ${note.trim()}` : `${statusText[status]} 상태로 변경했습니다.`
    };

    fallbackHistory = [historyItem, ...fallbackHistory];

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
    summary: AdminDashboard["summary"];
    historyItem: AdminHistoryItem;
  };
}

export async function updateAdminCasePlanning(
  caseId: string,
  payload: {
    assignee: string;
    nextContactAt?: string | null;
    note?: string;
  }
): Promise<{ case: AdminCase; summary: AdminDashboard["summary"]; historyItem: AdminHistoryItem }> {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    const target = fallbackCases.find((item) => item.id === caseId);

    if (!target) {
      throw new Error("case not found");
    }

    target.assignee = payload.assignee.trim();
    target.nextContactAt = payload.nextContactAt ?? null;

    const summary = [
      `담당자: ${target.assignee}`,
      target.nextContactAt ? `다음 연락: ${target.nextContactAt}` : "다음 연락 미정",
      payload.note?.trim() ? `메모: ${payload.note.trim()}` : null
    ]
      .filter(Boolean)
      .join(" / ");

    const historyItem: AdminHistoryItem = {
      id: `history-${Date.now()}`,
      caseId,
      type: "status_update",
      createdAt: new Date().toISOString(),
      summary
    };

    fallbackHistory = [historyItem, ...fallbackHistory];

    return {
      case: target,
      summary: buildFallbackSummary(),
      historyItem
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/admin/cases/${caseId}/planning`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("request failed");
  }

  return (await response.json()) as {
    case: AdminCase;
    summary: AdminDashboard["summary"];
    historyItem: AdminHistoryItem;
  };
}

export async function createAdminHistoryItem(
  caseId: string,
  payload: {
    type: "recommendation" | "share" | "participation" | "outreach";
    summary: string;
    nextRecommendation?: string;
    workflowStatus?: CaseStatus;
    reasonCode?: ParticipationReasonCode;
    outreachTarget?: OutreachTarget;
    outreachChannel?: OutreachChannel;
    outreachStatus?: OutreachStatus;
  }
): Promise<{ case: AdminCase; summary: AdminDashboard["summary"]; historyItem: AdminHistoryItem }> {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    const target = fallbackCases.find((item) => item.id === caseId);

    if (!target) {
      throw new Error("case not found");
    }

    if ((payload.type === "recommendation" || payload.type === "participation") && payload.nextRecommendation?.trim()) {
      target.nextRecommendation = payload.nextRecommendation.trim();
    }

    if (payload.workflowStatus) {
      target.workflowStatus = payload.workflowStatus;
    }

    const historyItem: AdminHistoryItem = {
      id: `history-${Date.now()}`,
      caseId,
      type: payload.type,
      createdAt: new Date().toISOString(),
      summary: payload.summary,
      reasonCode: payload.reasonCode,
      outreachTarget: payload.outreachTarget,
      outreachChannel: payload.outreachChannel,
      outreachStatus: payload.outreachStatus
    };

    fallbackHistory = [historyItem, ...fallbackHistory];

    return {
      case: target,
      summary: buildFallbackSummary(),
      historyItem
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/admin/cases/${caseId}/history`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("request failed");
  }

  return (await response.json()) as {
    case: AdminCase;
    summary: AdminDashboard["summary"];
    historyItem: AdminHistoryItem;
  };
}

export async function sendAdminOutreach(
  caseId: string,
  payload: {
    target: OutreachTarget;
    channel: OutreachChannel;
    message: string;
  }
): Promise<{
  case: AdminCase;
  summary: AdminDashboard["summary"];
  historyItem: AdminHistoryItem;
  dispatch: {
    provider: "mock" | "solapi";
    mode: "mock" | "live";
    status: OutreachStatus;
    externalId: string | null;
    note: string;
  };
}> {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    const target = fallbackCases.find((item) => item.id === caseId);

    if (!target) {
      throw new Error("case not found");
    }

    const historyItem: AdminHistoryItem = {
      id: `history-${Date.now()}`,
      caseId,
      type: "outreach",
      createdAt: new Date().toISOString(),
      summary: `${payload.channel} sent: ${payload.message}`,
      outreachTarget: payload.target,
      outreachChannel: payload.channel,
      outreachStatus: payload.channel === "phone" ? "attempted" : "sent"
    };

    fallbackHistory = [historyItem, ...fallbackHistory];

    return {
      case: target,
      summary: buildFallbackSummary(),
      historyItem,
      dispatch: {
        provider: "mock",
        mode: "mock",
        status: historyItem.outreachStatus ?? "sent",
        externalId: null,
        note: "API가 연결되지 않아 mock 발송으로 기록했습니다."
      }
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/admin/cases/${caseId}/outreach/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorPayload?.message ?? "request failed");
  }

  return (await response.json()) as {
    case: AdminCase;
    summary: AdminDashboard["summary"];
    historyItem: AdminHistoryItem;
    dispatch: {
      provider: "mock" | "solapi";
      mode: "mock" | "live";
      status: OutreachStatus;
      externalId: string | null;
      note: string;
    };
  };
}
