import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  ageGroupLabels,
  defaultInput,
  districtOptions,
  guardianModeLabels,
  interactionPreferenceLabels,
  interestOptions,
  livingSituationLabels,
  outingLevelLabels,
  recentOutingLabels,
  scenarioPresets,
  type RecommendationInput
} from "./data/demo";
import {
  createAdminHistoryItem,
  requestAdminDashboard,
  requestAdminHistory,
  sendAdminOutreach,
  updateAdminCasePlanning,
  updateAdminCaseStatus,
  type AdminCase,
  type AdminDashboard,
  type AdminHistoryItem,
  type CaseStatus,
  type OutreachChannel,
  type OutreachStatus,
  type OutreachTarget,
  type ParticipationReasonCode
} from "./lib/admin";
import { requestRecommendation, type RecommendationResponse } from "./lib/api";

const categoryLabels = {
  welfare: "복지",
  culture: "문화",
  reservation: "예약",
  education: "학습",
  support: "상담"
} as const;

const indoorLabels = {
  indoor: "실내",
  outdoor: "실외",
  mixed: "혼합"
} as const;

const budgetTypeLabels = {
  free: "무료",
  paid: "유료",
  unknown: "비용 확인 필요"
} as const;

const portalLabels = {
  "seoul-open-data": "서울 열린데이터광장",
  "data-go-kr": "공공데이터포털"
} as const;

const prescriptionLabels = {
  outing: "외출 처방",
  participation: "참여 처방",
  conversation: "대화 처방",
  guardian: "보호자 처방"
} as const;

const loadModeLabels = {
  live: "실수집 데이터",
  sample: "발표용 샘플",
  mock: "개발용 fallback"
} as const;

const aiModeLabels = {
  live: "실제 AI 생성",
  fallback: "기본 문구"
} as const;

const riskLabels = {
  low: "낮음",
  medium: "보통",
  high: "높음"
} as const;

const statusLabels: Record<CaseStatus, string> = {
  pending: "대기",
  contacted: "연락 완료",
  scheduled: "예약 진행",
  completed: "참여 완료"
};

const historyTypeLabels = {
  recommendation: "추천",
  status_update: "상태 변경",
  share: "보호자 공유",
  outreach: "연락 실행"
} as const;

const outreachChannelLabels: Record<OutreachChannel, string> = {
  phone: "전화",
  sms: "문자",
  kakao: "카카오"
};

const outreachStatusLabels: Record<OutreachStatus, string> = {
  attempted: "시도",
  sent: "발송 완료",
  connected: "연결 성공",
  failed: "실패"
};

const outreachTargetLabels: Record<OutreachTarget, string> = {
  participant: "대상자",
  guardian: "보호자"
};

const participationPresets = [
  {
    key: "participated",
    label: "참여 완료",
    status: "completed" as const,
    nextRecommendation: "이번 참여 강도와 비슷한 소규모 프로그램을 다음 주 후보로 유지"
  },
  {
    key: "no_show",
    label: "불참",
    status: "contacted" as const,
    nextRecommendation: "이동 부담이 더 낮은 실내 프로그램 또는 전화 안부 연결로 재추천"
  },
  {
    key: "declined",
    label: "거절",
    status: "contacted" as const,
    nextRecommendation: "관심사를 다시 확인하고 더 가벼운 첫 연결 후보로 재추천"
  },
  {
    key: "followup",
    label: "추가 확인 필요",
    status: "pending" as const,
    nextRecommendation: "보호자 또는 복지사 후속 체크인 이후 일정 재조정"
  }
] as const;

const participationReasonLabels: Record<ParticipationReasonCode, string> = {
  mobility: "이동 부담",
  schedule: "시간 안 맞음",
  interest: "관심 낮음",
  guardian: "보호자 부재",
  health: "건강 상태",
  other: "기타"
};

const personaLabels = {
  elder: "독거 어르신",
  child: "보호자 동반형",
  worker: "복지사 관리형"
} as const;

type CaseFilterKey = "all" | "urgent" | "overdue" | "today" | "unplanned";
type AppTabKey = "home" | "planner" | "ops" | "proof";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

function getHistoryTypeLabel(type: AdminHistoryItem["type"]) {
  switch (type) {
    case "recommendation":
      return "추천";
    case "status_update":
      return "상태 변경";
    case "share":
      return "보호자 공유";
    case "participation":
      return "참여 결과";
    case "outreach":
      return "연락 실행";
    default:
      return "이력";
  }
}

function getParticipationReasonLabel(reasonCode?: ParticipationReasonCode) {
  return reasonCode ? participationReasonLabels[reasonCode] : null;
}

function uniqueTags(tags: string[]) {
  return [...new Set(tags)];
}

function describeReasonAdjustment(
  input: RecommendationInput,
  reasonCode: ParticipationReasonCode
) {
  return [
    `${participationReasonLabels[reasonCode]} 대응`,
    `${outingLevelLabels[input.outingLevel]} 이동`,
    `도보 ${input.walkMinutes}분`,
    interactionPreferenceLabels[input.interactionPreference],
    guardianModeLabels[input.guardianMode]
  ].join(" · ");
}

function buildInputFromCase(adminCase: AdminCase): RecommendationInput {
  const ageGroup = "senior";
  const livingSituation = "alone";

  const guardianMode = adminCase.profilePreset.persona === "child" ? "accompany" : "available";

  const interactionPreference =
    adminCase.profilePreset.intent === "support"
      ? "quiet"
      : adminCase.profilePreset.intent === "program"
        ? "small_group"
        : "quiet";

  const outingLevel =
    adminCase.profilePreset.state === "high"
      ? "high"
      : adminCase.profilePreset.state === "normal"
        ? "medium"
        : "low";

  const recentOutings =
    adminCase.lastParticipationDays >= 14 ? "none" : adminCase.lastParticipationDays >= 6 ? "rare" : "weekly";

  const interestTags =
    adminCase.profilePreset.intent === "support"
      ? ["상담", "건강"]
      : adminCase.profilePreset.intent === "program"
        ? ["문화", "전시", "가족"]
        : ["건강", "문화", "상담"];

  return {
    district: districtOptions.includes(adminCase.district as (typeof districtOptions)[number])
      ? adminCase.district
      : defaultInput.district,
    ageGroup,
    livingSituation,
    outingLevel,
    walkMinutes: adminCase.profilePreset.walkMinutes,
    recentOutings,
    guardianMode,
    interactionPreference,
    interestTags
  };
}

function buildReasonAdjustedInput(
  adminCase: AdminCase,
  reasonCode: ParticipationReasonCode
): RecommendationInput {
  const base = buildInputFromCase(adminCase);

  switch (reasonCode) {
    case "mobility":
      return {
        ...base,
        outingLevel: "low",
        walkMinutes: Math.min(base.walkMinutes, 8),
        guardianMode: base.guardianMode === "none" ? "available" : base.guardianMode,
        interactionPreference: "quiet",
        interestTags: uniqueTags(["건강", "상담", ...base.interestTags]).slice(0, 4)
      };
    case "schedule":
      return {
        ...base,
        outingLevel: "medium",
        recentOutings: "rare",
        guardianMode: base.guardianMode === "accompany" ? "available" : base.guardianMode,
        interactionPreference: "open",
        interestTags: uniqueTags(["문화", "학습", ...base.interestTags]).slice(0, 4)
      };
    case "interest":
      return {
        ...base,
        recentOutings: "rare",
        interactionPreference: "small_group",
        interestTags: uniqueTags(["문화", "전시", "자연", ...base.interestTags]).slice(0, 4)
      };
    case "guardian":
      return {
        ...base,
        guardianMode: "none",
        interactionPreference: "small_group",
        interestTags: uniqueTags(["문화", "건강", ...base.interestTags]).slice(0, 4)
      };
    case "health":
      return {
        ...base,
        outingLevel: "low",
        walkMinutes: Math.min(base.walkMinutes, 6),
        interactionPreference: "quiet",
        interestTags: uniqueTags(["상담", "건강", ...base.interestTags]).slice(0, 4)
      };
    case "other":
      return {
        ...base,
        recentOutings: "rare",
        interactionPreference: "small_group",
        interestTags: uniqueTags(["문화", "건강", ...base.interestTags]).slice(0, 4)
      };
    default:
      return base;
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatPercent(value: number) {
  return `${value}%`;
}

function formatPlanningValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function getCaseFollowUpState(adminCase: AdminCase) {
  if (!adminCase.nextContactAt) {
    return "unplanned" as const;
  }

  const now = new Date();
  const nextContactDate = new Date(adminCase.nextContactAt);

  if (Number.isNaN(nextContactDate.getTime())) {
    return "unplanned" as const;
  }

  if (nextContactDate.getTime() < now.getTime()) {
    return "overdue" as const;
  }

  const todayKey = now.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const nextContactKey = nextContactDate.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });

  if (todayKey === nextContactKey) {
    return "today" as const;
  }

  return "upcoming" as const;
}

function getFollowUpLabel(adminCase: AdminCase) {
  const state = getCaseFollowUpState(adminCase);

  switch (state) {
    case "overdue":
      return "연락 지연";
    case "today":
      return "오늘 연락";
    case "upcoming":
      return "후속 예정";
    case "unplanned":
      return "일정 미정";
    default:
      return null;
  }
}

function App() {
  const [input, setInput] = useState<RecommendationInput>(defaultInput);
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(true);

  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [caseFilter, setCaseFilter] = useState<CaseFilterKey>("all");
  const [activeTab, setActiveTab] = useState<AppTabKey>("home");
  const [history, setHistory] = useState<AdminHistoryItem[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<CaseStatus | null>(null);
  const [loggingHistory, setLoggingHistory] = useState<
    "recommendation" | "share" | "participation" | "outreach" | "playbook" | null
  >(null);
  const [updatingPlanning, setUpdatingPlanning] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [planningAssignee, setPlanningAssignee] = useState("");
  const [planningNextContact, setPlanningNextContact] = useState("");
  const [planningNote, setPlanningNote] = useState("");
  const [outreachChannel, setOutreachChannel] = useState<OutreachChannel>("phone");
  const [outreachTarget, setOutreachTarget] = useState<OutreachTarget>("participant");
  const [outreachStatus, setOutreachStatus] = useState<OutreachStatus>("attempted");
  const [outreachNote, setOutreachNote] = useState("");
  const [outcomeNote, setOutcomeNote] = useState("");
  const [outcomeReason, setOutcomeReason] = useState<ParticipationReasonCode>("mobility");
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installFeedback, setInstallFeedback] = useState<string | null>(null);
  const [activePlaybookReason, setActivePlaybookReason] = useState<ParticipationReasonCode | null>(null);
  const [pendingPlaybookLog, setPendingPlaybookLog] = useState<{
    caseId: string;
    reasonCode: ParticipationReasonCode;
  } | null>(null);
  const plannerSectionRef = useRef<HTMLElement | null>(null);
  const resultPanelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoadingRecommendation(true);

    requestRecommendation(input)
      .then((result) => {
        if (!cancelled) {
          setRecommendation(result);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingRecommendation(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [input]);

  useEffect(() => {
    let cancelled = false;

    setLoadingDashboard(true);

    requestAdminDashboard()
      .then((result) => {
        if (!cancelled) {
          setDashboard(result);
          setSelectedCaseId((current) => current ?? result.cases[0]?.id ?? null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDashboard(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCaseId) {
      setHistory([]);
      return;
    }

    let cancelled = false;

    setLoadingHistory(true);

    requestAdminHistory(selectedCaseId)
      .then((items) => {
        if (!cancelled) {
          setHistory(items);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingHistory(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCaseId]);

  useEffect(() => {
    setActivePlaybookReason(null);
    setPendingPlaybookLog(null);
  }, [selectedCaseId]);

  const selectedCase = useMemo(
    () => dashboard?.cases.find((item) => item.id === selectedCaseId) ?? null,
    [dashboard, selectedCaseId]
  );

  const filteredCases = useMemo(() => {
    const cases = dashboard?.cases ?? [];
    const nextCases =
      caseFilter === "all"
        ? cases
        : cases.filter((item) => {
            const state = getCaseFollowUpState(item);
            if (caseFilter === "urgent") {
              return state === "overdue" || state === "today";
            }

            return state === caseFilter;
          });

    return [...nextCases].sort((left, right) => {
      const priorityOrder = {
        overdue: 0,
        today: 1,
        upcoming: 2,
        unplanned: 3
      } as const;
      const leftState = getCaseFollowUpState(left);
      const rightState = getCaseFollowUpState(right);
      const stateDelta = priorityOrder[leftState] - priorityOrder[rightState];

      if (stateDelta !== 0) {
        return stateDelta;
      }

      if (!left.nextContactAt && !right.nextContactAt) {
        return left.name.localeCompare(right.name, "ko-KR");
      }

      if (!left.nextContactAt) {
        return 1;
      }

      if (!right.nextContactAt) {
        return -1;
      }

      return new Date(left.nextContactAt).getTime() - new Date(right.nextContactAt).getTime();
    });
  }, [caseFilter, dashboard?.cases]);

  useEffect(() => {
    if (filteredCases.length === 0) {
      return;
    }

    if (!selectedCaseId || !filteredCases.some((item) => item.id === selectedCaseId)) {
      setSelectedCaseId(filteredCases[0].id);
    }
  }, [filteredCases, selectedCaseId]);

  useEffect(() => {
    if (!selectedCase) {
      setPlanningAssignee("");
      setPlanningNextContact("");
      setPlanningNote("");
      return;
    }

    setPlanningAssignee(selectedCase.assignee);
    setPlanningNextContact(formatPlanningValue(selectedCase.nextContactAt));
    setOutreachTarget(selectedCase.guardianPhone ? "guardian" : "participant");
    setPlanningNote("");
  }, [selectedCase]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const sections = [
      { id: "home", tab: "home" as const },
      { id: "planner", tab: "planner" as const },
      { id: "ops", tab: "ops" as const },
      { id: "proof", tab: "proof" as const }
    ];
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (!visibleEntry) {
          return;
        }

        const matchedSection = sections.find((section) => section.id === visibleEntry.target.id);

        if (matchedSection) {
          setActiveTab(matchedSection.tab);
        }
      },
      {
        rootMargin: "-20% 0px -40% 0px",
        threshold: [0.2, 0.45, 0.7]
      }
    );

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!pendingPlaybookLog || !selectedCase || !recommendation || loadingRecommendation) {
      return;
    }

    if (pendingPlaybookLog.caseId !== selectedCase.id) {
      return;
    }

    let cancelled = false;

    const persistPlaybookRecommendation = async () => {
      const reasonLabel = getParticipationReasonLabel(pendingPlaybookLog.reasonCode) ?? "차단 사유 대응";

      setLoggingHistory("playbook");

      try {
        const result = await createAdminHistoryItem(selectedCase.id, {
          type: "recommendation",
          summary: `${reasonLabel} 재추천: ${recommendation.headline}. ${recommendation.primaryAction}`,
          nextRecommendation: `${reasonLabel} 대응 / ${recommendation.suggestedPrograms[0]?.title ?? recommendation.headline}`
        });

        if (cancelled) {
          return;
        }

        syncCaseInDashboard(result.case, result.summary);
        await Promise.all([refreshDashboardSnapshot(selectedCase.id), refreshCaseHistory(selectedCase.id)]);

        if (cancelled) {
          return;
        }

        setAdminMessage(`${reasonLabel} 재추천을 기관 타임라인에 함께 저장했습니다.`);
      } catch (_error) {
        if (!cancelled) {
          setAdminMessage("재추천 이력 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        }
      } finally {
        if (!cancelled) {
          setPendingPlaybookLog(null);
          setLoggingHistory(null);
        }
      }
    };

    void persistPlaybookRecommendation();

    return () => {
      cancelled = true;
    };
  }, [loadingRecommendation, pendingPlaybookLog, recommendation, selectedCase]);

  const toggleInterest = (interest: string) => {
    setInput((current) => {
      const nextTags = current.interestTags.includes(interest)
        ? current.interestTags.filter((item) => item !== interest)
        : [...current.interestTags, interest];

      return {
        ...current,
        interestTags: nextTags
      };
    });
  };

  const applyPreset = (nextInput: RecommendationInput) => {
    setActivePlaybookReason(null);
    setPendingPlaybookLog(null);
    startTransition(() => {
      setInput(nextInput);
    });
  };

  const loadCaseIntoPlanner = (adminCase: AdminCase) => {
    setActivePlaybookReason(null);
    setPendingPlaybookLog(null);
    startTransition(() => {
      setInput(buildInputFromCase(adminCase));
    });
  };

  const applyReasonPlaybook = (reasonCode: ParticipationReasonCode) => {
    if (!selectedCase) {
      return;
    }

    startTransition(() => {
      setInput(buildReasonAdjustedInput(selectedCase, reasonCode));
    });
    setActivePlaybookReason(reasonCode);
    setPendingPlaybookLog({
      caseId: selectedCase.id,
      reasonCode
    });
    window.requestAnimationFrame(() => {
      plannerSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      resultPanelRef.current?.focus();
    });

    setAdminMessage(
      `${getParticipationReasonLabel(reasonCode)} 사유 기준으로 추천 조건을 다시 맞췄습니다. 플래너 결과를 확인해 주세요.`
    );
  };

  const resetReasonPlaybook = () => {
    if (!selectedCase || !activePlaybookReason) {
      return;
    }

    loadCaseIntoPlanner(selectedCase);
    setPendingPlaybookLog(null);
    setAdminMessage("대상자 기본 조건으로 돌아왔습니다. 필요하면 다른 차단 사유 재추천을 적용해 보세요.");
  };

  const syncCaseInDashboard = (nextCase: AdminCase, summary: AdminDashboard["summary"]) => {
    setDashboard((current) => {
      if (!current) {
        return current;
      }

      return {
        summary,
        followUpInsights: current.followUpInsights,
        performanceMetrics: current.performanceMetrics,
        participationInsights: current.participationInsights,
        cases: current.cases.map((item) => (item.id === nextCase.id ? nextCase : item))
      };
    });
  };

  const refreshDashboardSnapshot = async (preferredCaseId?: string) => {
    const nextDashboard = await requestAdminDashboard();
    setDashboard(nextDashboard);
    setSelectedCaseId((current) => preferredCaseId ?? current ?? nextDashboard.cases[0]?.id ?? null);
  };

  const refreshCaseHistory = async (caseId: string) => {
    const nextHistory = await requestAdminHistory(caseId);
    setHistory(nextHistory);
  };

  const scrollToTabSection = (tab: AppTabKey) => {
    setActiveTab(tab);
    document.getElementById(tab)?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  };

  const handleInstallClick = async () => {
    if (!installPromptEvent) {
      setInstallFeedback("브라우저 설치 버튼이 아직 준비되지 않았습니다. 모바일 브라우저 메뉴에서 홈 화면에 추가해 주세요.");
      return;
    }

    await installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;
    setInstallFeedback(
      choice.outcome === "accepted"
        ? "잇다서울 설치 요청을 보냈습니다. 홈 화면이나 앱 목록에서 확인해 주세요."
        : "설치 요청을 닫았습니다. 나중에 다시 설치할 수 있습니다."
    );
    setInstallPromptEvent(null);
  };

  const handleStatusUpdate = async (status: CaseStatus) => {
    if (!selectedCase) {
      return;
    }

    setUpdatingStatus(status);
    setAdminMessage(null);

    try {
      const result = await updateAdminCaseStatus(selectedCase.id, status, statusNote);

        syncCaseInDashboard(result.case, result.summary);
        await Promise.all([refreshDashboardSnapshot(selectedCase.id), refreshCaseHistory(selectedCase.id)]);
        setStatusNote("");
      setAdminMessage(`대상자 상태를 '${statusLabels[status]}'로 업데이트했습니다.`);
    } catch (_error) {
      setAdminMessage("상태 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handlePlanningUpdate = async () => {
    if (!selectedCase || !planningAssignee.trim()) {
      setAdminMessage("담당자 이름을 입력해 주세요.");
      return;
    }

    setUpdatingPlanning(true);
    setAdminMessage(null);

    try {
      const result = await updateAdminCasePlanning(selectedCase.id, {
        assignee: planningAssignee.trim(),
        nextContactAt: planningNextContact ? new Date(planningNextContact).toISOString() : null,
        note: planningNote
      });

      syncCaseInDashboard(result.case, result.summary);
      await Promise.all([refreshDashboardSnapshot(selectedCase.id), refreshCaseHistory(selectedCase.id)]);
      setPlanningNote("");
      setAdminMessage("담당자와 다음 연락 일정을 저장했습니다.");
    } catch (_error) {
      setAdminMessage("운영 계획 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setUpdatingPlanning(false);
    }
  };

  const handleHistoryLog = async (type: "recommendation" | "share") => {
    if (!selectedCase || !recommendation) {
      return;
    }

    const summary =
      type === "recommendation"
        ? `${recommendation.headline}: ${recommendation.primaryAction}`
        : `보호자 공유 문구 전달: ${recommendation.shareMessage}`;

    setLoggingHistory(type);
    setAdminMessage(null);

    try {
      const result = await createAdminHistoryItem(selectedCase.id, {
        type,
        summary,
        nextRecommendation:
          type === "recommendation"
            ? `${recommendation.primaryAction} / ${recommendation.suggestedPrograms[0]?.title ?? recommendation.headline}`
            : undefined
      });

      syncCaseInDashboard(result.case, result.summary);
      await Promise.all([refreshDashboardSnapshot(selectedCase.id), refreshCaseHistory(selectedCase.id)]);
      setAdminMessage(
        type === "recommendation"
          ? "현재 처방을 추천 이력에 기록했습니다."
          : "보호자 공유 이력을 타임라인에 기록했습니다."
      );
    } catch (_error) {
      setAdminMessage("이력 기록에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoggingHistory(null);
    }
  };

  const handleOutreachLog = async () => {
    if (!selectedCase) {
      return;
    }

    setLoggingHistory("outreach");
    setAdminMessage(null);

    try {
      const note = outreachNote.trim();
      const summary = `${outreachChannelLabels[outreachChannel]} ${outreachStatusLabels[outreachStatus]}${note ? `: ${note}` : ""}`;
      const result = await createAdminHistoryItem(selectedCase.id, {
        type: "outreach",
        summary,
        outreachTarget,
        workflowStatus: outreachStatus === "connected" ? "contacted" : undefined,
        outreachChannel,
        outreachStatus
      });

      syncCaseInDashboard(result.case, result.summary);
      await Promise.all([refreshDashboardSnapshot(selectedCase.id), refreshCaseHistory(selectedCase.id)]);
      setOutreachNote("");
      setAdminMessage("연락 실행 이력을 저장했습니다.");
    } catch (_error) {
      setAdminMessage("연락 실행 이력 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoggingHistory(null);
    }
  };

  const handleOutreachSend = async () => {
    if (!selectedCase) {
      return;
    }

    const message = outreachNote.trim() || recommendation?.shareMessage || selectedCase.nextRecommendation;

    setLoggingHistory("outreach");
    setAdminMessage(null);

    try {
      const result = await sendAdminOutreach(selectedCase.id, {
        target: outreachTarget,
        channel: outreachChannel,
        message
      });

      syncCaseInDashboard(result.case, result.summary);
      await Promise.all([refreshDashboardSnapshot(selectedCase.id), refreshCaseHistory(selectedCase.id)]);
      setOutreachNote("");
      setAdminMessage(`${result.dispatch.note} (${outreachTargetLabels[outreachTarget]} · ${outreachChannelLabels[outreachChannel]})`);
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : "실발송 처리에 실패했습니다.");
    } finally {
      setLoggingHistory(null);
    }
  };

  const handleParticipationLog = async (presetKey: (typeof participationPresets)[number]["key"]) => {
    if (!selectedCase || !recommendation) {
      return;
    }

    const preset = participationPresets.find((item) => item.key === presetKey);

    if (!preset) {
      return;
    }

    const primaryProgram = recommendation.suggestedPrograms[0]?.title ?? recommendation.headline;
    const summary = outcomeNote.trim()
      ? `${preset.label}: ${primaryProgram}. 메모: ${outcomeNote.trim()}`
      : `${preset.label}: ${primaryProgram}.`;

    setLoggingHistory("participation");
    setAdminMessage(null);

    try {
      const result = await createAdminHistoryItem(selectedCase.id, {
        type: "participation",
        summary,
        nextRecommendation: preset.nextRecommendation,
        workflowStatus: preset.status,
        reasonCode: outcomeReason
      });

      syncCaseInDashboard(result.case, result.summary);
      await Promise.all([refreshDashboardSnapshot(selectedCase.id), refreshCaseHistory(selectedCase.id)]);
      setOutcomeNote("");
      setOutcomeReason("mobility");
      setAdminMessage(`참여 결과 '${preset.label}'를 기록하고 후속 상태를 반영했습니다.`);
    } catch (_error) {
      setAdminMessage("참여 결과 기록에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoggingHistory(null);
    }
  };

  return (
    <div className="page-shell app-shell">
      <div className="mobile-appbar">
        <div className="mobile-appbar-copy">
          <span className="mini-label">Itda Seoul App Shell</span>
          <strong>잇다서울</strong>
        </div>
        <div className="mobile-appbar-actions">
          <button className="secondary-link button-inline appbar-button" onClick={() => scrollToTabSection("planner")} type="button">
            처방 시작
          </button>
          <button className="primary-link button-inline appbar-button" onClick={handleInstallClick} type="button">
            앱처럼 설치
          </button>
        </div>
      </div>

      {installFeedback ? <p className="install-feedback">{installFeedback}</p> : null}

      <header className="hero" id="home">
        <div className="hero-nav">
          <div className="brand-block">
            <span className="brand-eyebrow">2026 서울시 빅데이터 활용 경진대회 창업 부문</span>
            <strong>잇다서울</strong>
          </div>
          <div className="hero-nav-links">
            <a href="#planner" onClick={() => setActiveTab("planner")}>처방 설계</a>
            <a href="#ops" onClick={() => setActiveTab("ops")}>기관 운영</a>
            <a href="#proof" onClick={() => setActiveTab("proof")}>데이터 근거</a>
            <a href="#finals">본선 설득</a>
          </div>
        </div>

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="hero-kicker">고립위험 1인가구와 고령층을 위한 AI 사회연결 처방 플랫폼</p>
            <h1>
              다음 외출,
              <br />
              다음 연결,
              <br />
              다음 신청을
              <br />
              서울 데이터로 정합니다
            </h1>
            <p className="hero-text">
              독거노인 현황, 노인여가복지시설, 공공서비스예약, 문화행사 정보를 결합해 지금 이 사람에게 가장
              부담이 적은 다음 행동을 AI가 추천합니다. 목표는 정보 나열이 아니라 실제 참여와 연결입니다.
            </p>

            <div className="hero-actions">
              <a className="primary-link" href="#planner">
                처방 시작하기
              </a>
              <a className="secondary-link" href="#ops">
                기관 운영 보기
              </a>
            </div>

            <div className="hero-facts">
              <article>
                <span>문제 정의</span>
                <strong>고립은 검색 문제가 아니라 연결 실패 문제</strong>
              </article>
              <article>
                <span>데이터 구조</span>
                <strong>복지 + 문화 + 예약 + 오늘의 도시 시그널</strong>
              </article>
              <article>
                <span>서비스 목표</span>
                <strong>처음 외출과 첫 참여의 허들을 낮추기</strong>
              </article>
            </div>
          </section>

          <aside className="hero-card">
            <span className="mini-label">서비스 정의</span>
            <strong>AI가 지금 가장 가기 쉬운 다음 연결 행동 1개를 먼저 정해 주는 서비스</strong>
            <p>
              잇다서울은 검색 결과를 늘어놓는 대신, 외출형·참여형·대화형·보호자형 중 무엇이 맞는지 먼저
              판단합니다. 추천 뒤에는 예약 링크와 보호자 공유 문구까지 이어집니다.
            </p>

            <div className="stack-list">
              <div>
                <span>1차 사용자</span>
                <strong>독거노인, 고립위험 1인가구, 보호자</strong>
              </div>
              <div>
                <span>운영 주체</span>
                <strong>복지사, 방문요양기관, 복지관</strong>
              </div>
              <div>
                <span>데모 포인트</span>
                <strong>추천 → 신청 → 공유 → 사후관리 흐름</strong>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main>
        <section className="section" id="planner" ref={plannerSectionRef}>
          <div className="section-heading">
            <span className="section-kicker">Planner</span>
            <h2>개인 상태를 읽어 다음 연결 행동을 처방합니다</h2>
          </div>

          <div className="planner-layout">
            <section className="planner-panel">
              <div className="card-top">
                <span className="mini-label">대표 시나리오</span>
                <h3>본선 발표에서 바로 보여줄 수 있는 사용자 흐름</h3>
              </div>

              <div className="preset-grid">
                {scenarioPresets.map((preset) => (
                  <button
                    key={preset.id}
                    className={`preset-card ${
                      input.district === preset.input.district &&
                      input.guardianMode === preset.input.guardianMode &&
                      input.recentOutings === preset.input.recentOutings
                        ? "active"
                        : ""
                    }`}
                    onClick={() => applyPreset(preset.input)}
                    type="button"
                  >
                    <strong>{preset.title}</strong>
                    <span>{preset.summary}</span>
                  </button>
                ))}
              </div>

              {activePlaybookReason && selectedCase ? (
                <article className="playbook-banner">
                  <div className="playbook-banner-top">
                    <span className="mini-label">운영 인사이트 재추천 적용</span>
                    <button className="secondary-link button-inline" onClick={resetReasonPlaybook} type="button">
                      기본 조건으로 되돌리기
                    </button>
                  </div>
                  <strong>
                    {selectedCase.name}에게 {participationReasonLabels[activePlaybookReason]} 사유 대응 처방을 다시 계산 중입니다.
                  </strong>
                  <p>{describeReasonAdjustment(input, activePlaybookReason)}</p>
                  <p className="detail-note">
                    {loggingHistory === "playbook"
                      ? "재추천 결과를 기관 타임라인에 함께 저장하는 중입니다."
                      : "이 적용은 차단 사유 기반 후속 개입으로 기관 이력에도 자동 저장됩니다."}
                  </p>
                  <div className="tag-row">
                    {input.interestTags.map((tag) => (
                      <span className="tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              ) : null}

              <div className="form-grid">
                <label className="field">
                  <span>자치구</span>
                  <select
                    value={input.district}
                    onChange={(event) =>
                      setInput((current) => ({
                        ...current,
                        district: event.target.value
                      }))
                    }
                  >
                    {districtOptions.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>연령대</span>
                  <select
                    value={input.ageGroup}
                    onChange={(event) =>
                      setInput((current) => ({
                        ...current,
                        ageGroup: event.target.value as RecommendationInput["ageGroup"]
                      }))
                    }
                  >
                    {Object.entries(ageGroupLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>거주 상태</span>
                  <select
                    value={input.livingSituation}
                    onChange={(event) =>
                      setInput((current) => ({
                        ...current,
                        livingSituation: event.target.value as RecommendationInput["livingSituation"]
                      }))
                    }
                  >
                    {Object.entries(livingSituationLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>외출 가능 정도</span>
                  <select
                    value={input.outingLevel}
                    onChange={(event) =>
                      setInput((current) => ({
                        ...current,
                        outingLevel: event.target.value as RecommendationInput["outingLevel"]
                      }))
                    }
                  >
                    {Object.entries(outingLevelLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>최근 외출 빈도</span>
                  <select
                    value={input.recentOutings}
                    onChange={(event) =>
                      setInput((current) => ({
                        ...current,
                        recentOutings: event.target.value as RecommendationInput["recentOutings"]
                      }))
                    }
                  >
                    {Object.entries(recentOutingLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>보호자 개입</span>
                  <select
                    value={input.guardianMode}
                    onChange={(event) =>
                      setInput((current) => ({
                        ...current,
                        guardianMode: event.target.value as RecommendationInput["guardianMode"]
                      }))
                    }
                  >
                    {Object.entries(guardianModeLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>상호작용 선호</span>
                  <select
                    value={input.interactionPreference}
                    onChange={(event) =>
                      setInput((current) => ({
                        ...current,
                        interactionPreference: event.target.value as RecommendationInput["interactionPreference"]
                      }))
                    }
                  >
                    {Object.entries(interactionPreferenceLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>희망 도보 거리</span>
                  <strong>{input.walkMinutes}분 이내</strong>
                  <input
                    max="30"
                    min="5"
                    type="range"
                    value={input.walkMinutes}
                    onChange={(event) =>
                      setInput((current) => ({
                        ...current,
                        walkMinutes: Number(event.target.value)
                      }))
                    }
                  />
                </label>
              </div>

              <div className="interest-block">
                <span className="mini-label">관심 태그</span>
                <div className="chip-row">
                  {interestOptions.map((interest) => (
                    <button
                      key={interest}
                      className={`chip ${input.interestTags.includes(interest) ? "active" : ""}`}
                      onClick={() => toggleInterest(interest)}
                      type="button"
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="result-panel" ref={resultPanelRef} tabIndex={-1}>
              <div className="card-top">
                <span className="mini-label">AI 사회연결 처방</span>
                <h3>{loadingRecommendation ? "서울 데이터를 읽어 다음 연결 행동을 계산하는 중" : recommendation?.headline}</h3>
              </div>

              {recommendation ? (
                <>
                  {activePlaybookReason && selectedCase ? (
                    <div className="playbook-result-note">
                      <strong>{participationReasonLabels[activePlaybookReason]} 차단 사유 대응 모드</strong>
                      <span>
                        {selectedCase.name}의 최근 참여 결과를 반영해 부담이 더 낮은 다음 연결 행동을 우선 정렬했습니다.
                      </span>
                    </div>
                  ) : null}
                  <div className="lead-card">
                    <div className="lead-top">
                      <span className="lead-badge">{prescriptionLabels[recommendation.prescriptionType]}</span>
                      <strong>{recommendation.matchScore}점 매칭</strong>
                    </div>
                    <h4>{recommendation.primaryAction}</h4>
                    <p>{recommendation.summary}</p>
                    <div className="lead-note">{recommendation.personaSummary}</div>
                  </div>

                  <div className="signal-card">
                    <div>
                      <span className="mini-label">오늘의 도시 시그널</span>
                      <strong>
                        {recommendation.citySignal.weatherLabel} · 대기질 {recommendation.citySignal.airQualityLabel}
                      </strong>
                    </div>
                    <p>{recommendation.todayBrief}</p>
                    <div className="signal-stats">
                      <span>기온 {recommendation.citySignal.temperatureC}°C</span>
                      <span>실외지수 {recommendation.citySignal.outdoorIndex}</span>
                      <span>보행쾌적도 {recommendation.citySignal.walkComfort}</span>
                    </div>
                  </div>

                  <div className="reason-list">
                    {recommendation.reasons.map((reason, index) => (
                      <article className="reason-card" key={reason}>
                        <span>판단 근거 {index + 1}</span>
                        <strong>{reason}</strong>
                      </article>
                    ))}
                  </div>

                  <div className="share-card">
                    <span className="mini-label">보호자 공유 문구</span>
                    <p>{recommendation.shareMessage}</p>
                  </div>

                  <div className="action-card">
                    <span className="mini-label">AI 케어 코파일럿</span>
                    <div className="action-list">
                      <div className="action-item">
                        <strong>{aiModeLabels[recommendation.aiAssist.mode]}</strong>
                        <span>{recommendation.aiAssist.note}</span>
                      </div>
                      <div className="action-item">
                        <strong>보호자 안내</strong>
                        <span>{recommendation.guardianGuide}</span>
                      </div>
                      <div className="action-item">
                        <strong>복지사 체크인</strong>
                        <span>{recommendation.workerGuide}</span>
                      </div>
                    </div>
                  </div>

                  <div className="action-card">
                    <span className="mini-label">바로 실행 체크리스트</span>
                    <div className="action-list">
                      {recommendation.actionPlan.map((step) => (
                        <div className="action-item" key={step}>
                          <strong>실행</strong>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </section>
          </div>
        </section>

        <section className="section" id="ops">
          <div className="section-heading">
            <span className="section-kicker">Operations</span>
            <h2>복지사와 기관이 반복적으로 쓸 수 있는 운영 모드</h2>
          </div>

          <div className="ops-layout">
            <section className="ops-panel">
              <div className="card-top">
                <span className="mini-label">기관 대시보드</span>
                <h3>대상자 상태를 보고 바로 다시 처방할 수 있습니다</h3>
              </div>

              <div className="summary-grid">
                <article className="summary-card">
                  <span>관리 대상</span>
                  <strong>{loadingDashboard ? "-" : dashboard?.summary.totalCases ?? 0}명</strong>
                </article>
                <article className="summary-card">
                  <span>집중 관리</span>
                  <strong>{loadingDashboard ? "-" : dashboard?.summary.needsAttention ?? 0}명</strong>
                </article>
                <article className="summary-card">
                  <span>이번 주 예약</span>
                  <strong>{loadingDashboard ? "-" : dashboard?.summary.scheduledThisWeek ?? 0}건</strong>
                </article>
                <article className="summary-card">
                  <span>이번 주 참여 완료</span>
                  <strong>{loadingDashboard ? "-" : dashboard?.summary.completedThisWeek ?? 0}건</strong>
                </article>
              </div>

              <div className="performance-grid">
                <article className="detail-card performance-card">
                  <span className="mini-label">추천 → 공유</span>
                  <strong>
                    {loadingDashboard ? "-" : dashboard?.performanceMetrics.recommendationLogs ?? 0}건 중{" "}
                    {loadingDashboard ? "-" : dashboard?.performanceMetrics.shareLogs ?? 0}건 공유
                  </strong>
                  <p className="detail-note">
                    보호자 공유 전환율{" "}
                    {loadingDashboard ? "-" : formatPercent(dashboard?.performanceMetrics.shareCoverageRate ?? 0)}
                  </p>
                </article>
                <article className="detail-card performance-card">
                  <span className="mini-label">연락 실행</span>
                  <strong>
                    {loadingDashboard ? "-" : dashboard?.performanceMetrics.outreachLogs ?? 0}건 기록 ·{" "}
                    {loadingDashboard ? "-" : dashboard?.performanceMetrics.connectedOutreachLogs ?? 0}건 연결
                  </strong>
                  <p className="detail-note">
                    관리군 연락 커버리지{" "}
                    {loadingDashboard ? "-" : formatPercent(dashboard?.performanceMetrics.outreachCoverageRate ?? 0)}
                  </p>
                </article>
                <article className="detail-card performance-card">
                  <span className="mini-label">공유 → 완료</span>
                  <strong>
                    {loadingDashboard ? "-" : dashboard?.performanceMetrics.shareToCompletionCases ?? 0}개 케이스 완료
                  </strong>
                  <p className="detail-note">공유 이후 실제 참여까지 이어진 관리군 수를 보여줍니다.</p>
                </article>
                <article className="detail-card performance-card">
                  <span className="mini-label">재추천 개입</span>
                  <strong>
                    {loadingDashboard ? "-" : dashboard?.performanceMetrics.playbookRecommendationLogs ?? 0}개 케이스 재추천
                  </strong>
                  <p className="detail-note">
                    차단 사유 기반 재추천 후 완료{" "}
                    {loadingDashboard ? "-" : dashboard?.performanceMetrics.playbookRecoveredCases ?? 0}개 케이스
                  </p>
                </article>
                <article className="detail-card performance-card">
                  <span className="mini-label">전체 완료율</span>
                  <strong>
                    {loadingDashboard ? "-" : dashboard?.performanceMetrics.completedCases ?? 0}개 케이스 완료
                  </strong>
                  <p className="detail-note">
                    현재 관리군 기준 완료율{" "}
                    {loadingDashboard ? "-" : formatPercent(dashboard?.performanceMetrics.completionRate ?? 0)}
                  </p>
                </article>
              </div>

              <article className="detail-card followup-board">
                <div className="history-header">
                  <span className="mini-label">후속 연락 보드</span>
                  <strong>오늘 바로 챙겨야 하는 케이스와 담당자 적체를 먼저 봅니다.</strong>
                </div>
                <div className="followup-grid">
                  <div className="action-item">
                    <strong>연락 지연</strong>
                    <span>{loadingDashboard ? "-" : dashboard?.followUpInsights.overdueCount ?? 0}건</span>
                  </div>
                  <div className="action-item">
                    <strong>오늘 연락</strong>
                    <span>{loadingDashboard ? "-" : dashboard?.followUpInsights.dueTodayCount ?? 0}건</span>
                  </div>
                  <div className="action-item">
                    <strong>일정 미정</strong>
                    <span>{loadingDashboard ? "-" : dashboard?.followUpInsights.unplannedCount ?? 0}건</span>
                  </div>
                  <div className="action-item">
                    <strong>향후 예정</strong>
                    <span>{loadingDashboard ? "-" : dashboard?.followUpInsights.upcomingCount ?? 0}건</span>
                  </div>
                </div>
                <div className="action-list compact-actions">
                  {(dashboard?.followUpInsights.byAssignee ?? []).slice(0, 3).map((item) => (
                    <div className="action-item" key={item.assignee}>
                      <strong>{item.assignee}</strong>
                      <span>
                        총 {item.total}건 · 지연 {item.overdue}건 · 오늘 {item.dueToday}건
                      </span>
                    </div>
                  ))}
                </div>
              </article>

              <div className="insight-grid">
                <article className="summary-card">
                  <span>참여 결과 기록</span>
                  <strong>{loadingDashboard ? "-" : dashboard?.participationInsights.totalLogged ?? 0}건</strong>
                </article>
                <article className="detail-card">
                  <div className="history-header">
                    <span className="mini-label">상위 차단 사유</span>
                    <strong>재추천 우선순위를 정하는 운영 지표</strong>
                  </div>
                  <div className="tag-row">
                    {(dashboard?.participationInsights.topReasons ?? []).length > 0 ? (
                      dashboard?.participationInsights.topReasons.map((item) => (
                        <span className="tag" key={item.reasonCode}>
                          {participationReasonLabels[item.reasonCode]} {item.count}건
                        </span>
                      ))
                    ) : (
                      <span className="detail-note">아직 집계된 참여 결과가 없습니다.</span>
                    )}
                  </div>
                  {(dashboard?.participationInsights.playbooks ?? []).length > 0 ? (
                    <div className="action-list compact-actions">
                      {dashboard?.participationInsights.playbooks.map((item) => (
                        <div className="action-item" key={item.reasonCode}>
                          <strong>{item.title}</strong>
                          <span>{item.action}</span>
                          <button
                            className="secondary-link button-inline playbook-button"
                            disabled={!selectedCase || loadingRecommendation || loggingHistory !== null}
                            onClick={() => applyReasonPlaybook(item.reasonCode)}
                            type="button"
                          >
                            이 사유로 재추천
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
                <article className="detail-card">
                  <div className="history-header">
                    <span className="mini-label">세그먼트 인사이트</span>
                    <strong>어디서, 누구에게 차단 사유가 쌓이는지 바로 봅니다.</strong>
                  </div>
                  <div className="action-list compact-actions">
                    <div className="action-item">
                      <strong>자치구별 상위 사유</strong>
                      <span>
                        {(dashboard?.participationInsights.byDistrict ?? []).length > 0
                          ? dashboard?.participationInsights.byDistrict
                              .map(
                                (item) =>
                                  `${item.district} · ${participationReasonLabels[item.reasonCode]} ${item.count}건`
                              )
                              .join(" / ")
                          : "아직 자치구별 집계가 없습니다."}
                      </span>
                    </div>
                    <div className="action-item">
                      <strong>대상군별 상위 사유</strong>
                      <span>
                        {(dashboard?.participationInsights.byPersona ?? []).length > 0
                          ? dashboard?.participationInsights.byPersona
                              .map(
                                (item) =>
                                  `${personaLabels[item.persona]} · ${participationReasonLabels[item.reasonCode]} ${item.count}건`
                              )
                              .join(" / ")
                          : "아직 대상군별 집계가 없습니다."}
                      </span>
                    </div>
                  </div>
                </article>
              </div>

              <div className="filter-row">
                {([
                  ["all", "전체"],
                  ["urgent", "긴급"],
                  ["overdue", "지연"],
                  ["today", "오늘 연락"],
                  ["unplanned", "일정 미정"]
                ] as Array<[CaseFilterKey, string]>).map(([key, label]) => (
                  <button
                    key={key}
                    className={`chip ${caseFilter === key ? "active" : ""}`}
                    onClick={() => setCaseFilter(key)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="case-list">
                {filteredCases.length > 0 ? filteredCases.map((adminCase) => (
                  <button
                    key={adminCase.id}
                    className={`case-card ${selectedCaseId === adminCase.id ? "active" : ""}`}
                    onClick={() => setSelectedCaseId(adminCase.id)}
                    type="button"
                  >
                    <div className="case-card-top">
                      <strong>{adminCase.name}</strong>
                      <span className={`status-pill ${adminCase.workflowStatus}`}>
                        {statusLabels[adminCase.workflowStatus]}
                      </span>
                    </div>
                    <span className="case-meta">
                      {adminCase.ageLabel} · {adminCase.district}
                    </span>
                    <span className="case-meta">
                      담당자 {adminCase.assignee || "미지정"} 쨌{" "}
                      {adminCase.nextContactAt ? formatDateTime(adminCase.nextContactAt) : "다음 연락 미정"}
                    </span>
                    <p>{adminCase.nextRecommendation}</p>
                    <div className="tag-row">
                      <span className={`risk-pill ${adminCase.riskLevel}`}>위험도 {riskLabels[adminCase.riskLevel]}</span>
                      {getFollowUpLabel(adminCase) ? (
                        <span className={`status-pill followup-${getCaseFollowUpState(adminCase)}`}>
                          {getFollowUpLabel(adminCase)}
                        </span>
                      ) : null}
                      {adminCase.statusTags.map((tag) => (
                        <span className="tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                )) : (
                  <article className="detail-card">
                    <span className="mini-label">필터 결과 없음</span>
                    <strong>선택한 조건에 맞는 케이스가 없습니다.</strong>
                    <p className="detail-note">필터를 전체로 되돌리거나 다음 연락 일정을 다시 잡아보세요.</p>
                  </article>
                )}
              </div>
            </section>

            <section className="ops-panel">
              <div className="card-top">
                <span className="mini-label">대상자 상세</span>
                <h3>{selectedCase ? `${selectedCase.name} 운영 카드` : "대상자를 선택해 주세요"}</h3>
              </div>

              {selectedCase ? (
                <>
                  <div className="detail-card">
                    <div className="detail-grid">
                      <div>
                        <span>프로필</span>
                        <strong>{selectedCase.ageLabel}</strong>
                      </div>
                      <div>
                        <span>선호 시간대</span>
                        <strong>{selectedCase.preferredTime}</strong>
                      </div>
                      <div>
                        <span>최근 참여 공백</span>
                        <strong>{selectedCase.lastParticipationDays}일</strong>
                      </div>
                      <div>
                        <span>이동 특성</span>
                        <strong>{selectedCase.mobilitySummary}</strong>
                      </div>
                      <div>
                        <span>담당자</span>
                        <strong>{selectedCase.assignee || "미지정"}</strong>
                      </div>
                      <div>
                        <span>다음 연락</span>
                        <strong>{selectedCase.nextContactAt ? formatDateTime(selectedCase.nextContactAt) : "미정"}</strong>
                      </div>
                      <div>
                        <span>대상자 연락처</span>
                        <strong>{selectedCase.participantPhone || "미등록"}</strong>
                      </div>
                      <div>
                        <span>보호자 연락처</span>
                        <strong>
                          {selectedCase.guardianPhone
                            ? `${selectedCase.guardianName ?? "보호자"} · ${selectedCase.guardianPhone}`
                            : "미등록"}
                        </strong>
                      </div>
                    </div>

                    <div className="detail-actions">
                      <button className="primary-link button-inline" onClick={() => loadCaseIntoPlanner(selectedCase)} type="button">
                        이 케이스로 처방 불러오기
                      </button>
                      <span className="detail-note">추천 패널이 현재 대상자 조건으로 즉시 바뀝니다.</span>
                    </div>
                  </div>

                  <div className="detail-card">
                    <div className="history-header">
                      <span className="mini-label">운영 계획</span>
                      <strong>담당자와 다음 연락 일정을 저장합니다.</strong>
                    </div>
                    <div className="detail-grid">
                      <label className="note-field">
                        <span>담당자</span>
                        <input
                          type="text"
                          value={planningAssignee}
                          onChange={(event) => setPlanningAssignee(event.target.value)}
                          placeholder="예: 김민정 복지사"
                        />
                      </label>
                      <label className="note-field">
                        <span>다음 연락</span>
                        <input
                          type="datetime-local"
                          value={planningNextContact}
                          onChange={(event) => setPlanningNextContact(event.target.value)}
                        />
                      </label>
                    </div>
                    <label className="note-field">
                      <span>운영 메모</span>
                      <textarea
                        rows={3}
                        value={planningNote}
                        onChange={(event) => setPlanningNote(event.target.value)}
                        placeholder="예: 보호자 통화 후 금요일 오전 재연락, 복지관 예약 확인 예정"
                      />
                    </label>
                    <div className="detail-actions">
                      <button
                        className="secondary-link button-inline"
                        type="button"
                        disabled={updatingPlanning}
                        onClick={handlePlanningUpdate}
                      >
                        {updatingPlanning ? "저장 중..." : "운영 계획 저장"}
                      </button>
                      <span className="detail-note">기관 담당자 배정과 후속 연락 일정을 케이스 타임라인에 남깁니다.</span>
                    </div>
                  </div>

                  <div className="detail-card">
                    <div className="history-header">
                      <span className="mini-label">추천 루프 기록</span>
                      <strong>{recommendation ? recommendation.headline : "현재 처방이 준비되면 기록할 수 있습니다."}</strong>
                    </div>
                    <div className="quick-actions">
                      <button
                        className="secondary-link button-inline"
                        disabled={!recommendation || loggingHistory !== null}
                        onClick={() => handleHistoryLog("recommendation")}
                        type="button"
                      >
                        {loggingHistory === "recommendation" ? "기록 중.." : "현재 처방 추천 이력 저장"}
                      </button>
                      <button
                        className="secondary-link button-inline"
                        disabled={!recommendation || loggingHistory !== null}
                        onClick={() => handleHistoryLog("share")}
                        type="button"
                      >
                        {loggingHistory === "share" ? "기록 중.." : "보호자 공유 이력 저장"}
                      </button>
                    </div>
                    <p className="detail-note">
                      추천, 공유, 상태 변경 이력이 한 타임라인에 쌓여서 복지사와 기관 담당자가 다음 재추천 시점을 바로 판단할 수 있습니다.
                    </p>
                  </div>

                  <div className="detail-card">
                    <div className="history-header">
                      <span className="mini-label">참여 결과 기록</span>
                      <strong>실제 참여 여부와 미참여 사유를 남겨 다음 재추천 근거로 사용합니다.</strong>
                    </div>
                    <div className="quick-actions">
                      {participationPresets.map((preset) => (
                        <button
                          key={preset.key}
                          className="secondary-link button-inline"
                          disabled={!recommendation || loggingHistory !== null}
                          onClick={() => handleParticipationLog(preset.key)}
                          type="button"
                        >
                          {loggingHistory === "participation" ? "기록 중.." : preset.label}
                        </button>
                      ))}
                    </div>
                    <div className="chip-row">
                      {(Object.keys(participationReasonLabels) as ParticipationReasonCode[]).map((reasonCode) => (
                        <button
                          key={reasonCode}
                          className={`chip ${outcomeReason === reasonCode ? "active" : ""}`}
                          disabled={loggingHistory !== null}
                          onClick={() => setOutcomeReason(reasonCode)}
                          type="button"
                        >
                          {participationReasonLabels[reasonCode]}
                        </button>
                      ))}
                    </div>
                    <label className="note-field">
                      <span>참여 결과 메모</span>
                      <textarea
                        placeholder="예: 보호자 동행으로 참석, 이동 부담 때문에 당일 불참, 소규모 모임 선호 확인"
                        rows={3}
                        value={outcomeNote}
                        onChange={(event) => setOutcomeNote(event.target.value)}
                      />
                    </label>
                    <p className="detail-note">
                      참여 완료는 `completed`, 불참·거절은 `contacted`, 추가 확인은 `pending` 상태로 함께 반영됩니다.
                    </p>
                  </div>

                  <div className="detail-card">
                    <div className="history-header">
                      <span className="mini-label">연락 실행 기록</span>
                      <strong>전화, 문자, 카카오 접촉 결과를 남겨 실제 현장 흐름으로 이어갑니다.</strong>
                    </div>
                    <div className="detail-grid">
                      <label className="field">
                        <span>연락 대상</span>
                        <select value={outreachTarget} onChange={(event) => setOutreachTarget(event.target.value as OutreachTarget)}>
                          {(Object.keys(outreachTargetLabels) as OutreachTarget[])
                            .filter((target) => target !== "guardian" || Boolean(selectedCase.guardianPhone))
                            .map((target) => (
                              <option key={target} value={target}>
                                {outreachTargetLabels[target]}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>연락 채널</span>
                        <select value={outreachChannel} onChange={(event) => setOutreachChannel(event.target.value as OutreachChannel)}>
                          {(Object.keys(outreachChannelLabels) as OutreachChannel[]).map((channel) => (
                            <option key={channel} value={channel}>
                              {outreachChannelLabels[channel]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>연락 결과</span>
                        <select value={outreachStatus} onChange={(event) => setOutreachStatus(event.target.value as OutreachStatus)}>
                          {(Object.keys(outreachStatusLabels) as OutreachStatus[]).map((status) => (
                            <option key={status} value={status}>
                              {outreachStatusLabels[status]}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="note-field">
                      <span>연락 메모</span>
                      <textarea
                        placeholder="예: 보호자 문자 발송, 금요일 오전 통화 연결, 카카오 링크 전달 후 회신 대기"
                        rows={3}
                        value={outreachNote}
                        onChange={(event) => setOutreachNote(event.target.value)}
                      />
                    </label>
                    <div className="detail-actions">
                      <button
                        className="primary-link button-inline"
                        disabled={loggingHistory !== null}
                        onClick={handleOutreachSend}
                        type="button"
                      >
                        {loggingHistory === "outreach" ? "발송 중.." : "실제 발송"}
                      </button>
                      <button
                        className="secondary-link button-inline"
                        disabled={loggingHistory !== null}
                        onClick={handleOutreachLog}
                        type="button"
                      >
                        {loggingHistory === "outreach" ? "저장 중.." : "연락 실행 이력 저장"}
                      </button>
                      <span className="detail-note">연결 성공으로 저장하면 케이스 상태는 자동으로 연락 완료까지 반영됩니다.</span>
                    </div>
                  </div>

                  <div className="status-panel">
                    <span className="mini-label">상태 업데이트</span>
                    <div className="status-actions">
                      {(Object.keys(statusLabels) as CaseStatus[]).map((status) => (
                        <button
                          key={status}
                          className={`status-button ${status} ${selectedCase.workflowStatus === status ? "active" : ""}`}
                          disabled={updatingStatus !== null}
                          onClick={() => handleStatusUpdate(status)}
                          type="button"
                        >
                          {updatingStatus === status ? "변경 중..." : statusLabels[status]}
                        </button>
                      ))}
                    </div>
                    <label className="note-field">
                      <span>체크인 메모</span>
                      <textarea
                        placeholder="예: 보호자 통화 완료, 이번 주 수요일 복지관 일정 안내"
                        rows={3}
                        value={statusNote}
                        onChange={(event) => setStatusNote(event.target.value)}
                      />
                    </label>
                    {adminMessage ? <p className="inline-message">{adminMessage}</p> : null}
                  </div>

                  <div className="history-panel">
                    <div className="history-header">
                      <span className="mini-label">최근 이력</span>
                      <strong>{loadingHistory ? "이력을 불러오는 중" : `${history.length}건`}</strong>
                    </div>

                    <div className="history-list">
                      {history.map((item) => (
                        <article className="history-item" key={item.id}>
                          <div className="history-item-top">
                            <span className="history-type">{getHistoryTypeLabel(item.type)}</span>
                            <span>{formatDateTime(item.createdAt)}</span>
                          </div>
                          {getParticipationReasonLabel(item.reasonCode) || item.outreachTarget || item.outreachChannel || item.outreachStatus ? (
                            <div className="tag-row">
                              {getParticipationReasonLabel(item.reasonCode) ? (
                                <span className="tag">{getParticipationReasonLabel(item.reasonCode)}</span>
                              ) : null}
                              {item.outreachTarget ? <span className="tag">{outreachTargetLabels[item.outreachTarget]}</span> : null}
                              {item.outreachChannel ? <span className="tag">{outreachChannelLabels[item.outreachChannel]}</span> : null}
                              {item.outreachStatus ? <span className="tag">{outreachStatusLabels[item.outreachStatus]}</span> : null}
                            </div>
                          ) : null}
                          <p>{item.summary}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </section>
          </div>
        </section>

        <section className="section">
          <div className="section-heading">
            <span className="section-kicker">Candidates</span>
            <h2>추천은 설명으로 끝나지 않고 다음 외출 후보와 신청 후보까지 보여줍니다</h2>
          </div>

          <div className="program-grid">
            {recommendation?.suggestedPrograms.map((program) => (
              <article className="program-card" key={program.id}>
                <div className="program-top">
                  <span>{categoryLabels[program.category]}</span>
                  <span>{budgetTypeLabels[program.budgetType]}</span>
                </div>
                <h3>{program.title}</h3>
                <p>{program.summary}</p>
                <div className="program-meta">
                  <span>{program.district}</span>
                  <span>{program.place}</span>
                  <span>{indoorLabels[program.indoorType]}</span>
                </div>
                <div className="tag-row">
                  {program.interestTags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="program-footer">
                  <span>{program.datasetName}</span>
                  <a href={program.actionUrl} rel="noreferrer" target="_blank">
                    상세 보기
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="proof">
          <div className="section-heading">
            <span className="section-kicker">Data Proof</span>
            <h2>복지·문화·예약 후보와 오늘의 도시 시그널을 분리해 데이터 역할을 명확히 보여줍니다</h2>
          </div>

          <div className="proof-grid">
            {recommendation?.sourceNotes.map((note) => (
              <article className="proof-card" key={`${note.portal}-${note.datasetName}`}>
                <span className="mini-label">{portalLabels[note.portal]}</span>
                <strong>{note.datasetName}</strong>
                <p>{note.role}</p>
              </article>
            ))}
          </div>

          <div className="proof-summary">
            {recommendation?.dataStatus.map((status) => (
              <article key={status.portal}>
                <span>{portalLabels[status.portal]}</span>
                <strong>{loadModeLabels[status.loadedFrom]}</strong>
                <span>{status.itemCount}건 반영</span>
                <span>{status.updatedAt ? new Date(status.updatedAt).toLocaleString("ko-KR") : "갱신 시각 없음"}</span>
              </article>
            ))}
            <article>
              <span>공공 가치</span>
              <strong>{recommendation?.publicValue}</strong>
            </article>
          </div>
        </section>

        <section className="section section-dark" id="finals">
          <div className="section-heading">
            <span className="section-kicker">Finals Fit</span>
            <h2>본선 심사위원 관점에서도 설득력이 보이도록 다시 맞췄습니다</h2>
          </div>

          <div className="finals-grid">
            <article>
              <strong>서울시의 정책 과제와 바로 맞닿아 있습니다.</strong>
              <p>
                외로움과 고립을 구조적 문제로 보는 서울시 정책 흐름과 연결하고, 공공데이터가 실제 참여 행동으로
                전환되는 경험을 보여줍니다.
              </p>
            </article>
            <article>
              <strong>두 포털의 역할이 명확합니다.</strong>
              <p>
                서울 열린데이터광장은 복지·문화·예약 후보를 제공하고, 공공데이터포털은 오늘의 외출 가능성과 이동
                부담을 조정하는 도시 시그널을 제공합니다.
              </p>
            </article>
            <article>
              <strong>기관 운영 모드로 확장 가능합니다.</strong>
              <p>
                복지사와 기관은 대상자별 관심사, 이동 수준, 참여 이력을 관리하고 재추천과 보호자 공유까지 한
                흐름으로 운영할 수 있습니다.
              </p>
            </article>
          </div>
        </section>
      </main>

      <nav aria-label="모바일 앱 탭" className="mobile-tabbar">
        <button className={activeTab === "home" ? "active" : ""} onClick={() => scrollToTabSection("home")} type="button">
          <span>홈</span>
          <strong>요약</strong>
        </button>
        <button
          className={activeTab === "planner" ? "active" : ""}
          onClick={() => scrollToTabSection("planner")}
          type="button"
        >
          <span>처방</span>
          <strong>추천</strong>
        </button>
        <button className={activeTab === "ops" ? "active" : ""} onClick={() => scrollToTabSection("ops")} type="button">
          <span>기관</span>
          <strong>운영</strong>
        </button>
        <button
          className={activeTab === "proof" ? "active" : ""}
          onClick={() => scrollToTabSection("proof")}
          type="button"
        >
          <span>증빙</span>
          <strong>데이터</strong>
        </button>
      </nav>
    </div>
  );
}

export default App;
