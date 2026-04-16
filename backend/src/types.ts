export type PersonaKey = "elder" | "child" | "worker";
export type IntentKey = "outing" | "program" | "support";
export type StateKey = "low" | "normal" | "high";
export type CaseStatus = "pending" | "contacted" | "scheduled" | "completed";
export type ParticipationReasonCode =
  | "mobility"
  | "schedule"
  | "interest"
  | "guardian"
  | "health"
  | "other";
export type OutreachChannel = "phone" | "sms" | "kakao";
export type OutreachStatus = "attempted" | "sent" | "connected" | "failed";
export type OutreachTarget = "participant" | "guardian";

export type CompanionType = "solo" | "family" | "parents" | "friends";
export type PurposeKey = "healing" | "culture" | "family" | "learning";
export type PlacePreference = "indoor" | "outdoor" | "any";
export type TimeWindow = "morning" | "afternoon" | "evening" | "weekend";
export type BudgetKey = "free" | "under10000" | "any";
export type MobilityLevel = "easy" | "normal" | "active";
export type AgeGroup = "middle" | "senior";
export type LivingSituation = "alone" | "withFamily";
export type OutingLevel = "low" | "medium" | "high";
export type RecentOutingFrequency = "none" | "rare" | "weekly";
export type GuardianMode = "none" | "available" | "accompany";
export type InteractionPreference = "quiet" | "small_group" | "open";
export type PrescriptionType = "outing" | "participation" | "conversation" | "guardian";

export type RecommendationRequest = {
  district: string;
  ageGroup: AgeGroup;
  livingSituation: LivingSituation;
  outingLevel: OutingLevel;
  walkMinutes: number;
  recentOutings: RecentOutingFrequency;
  guardianMode: GuardianMode;
  interactionPreference: InteractionPreference;
  interestTags: string[];
};

export type ProgramItem = {
  id: string;
  portal: "seoul-open-data";
  datasetName: string;
  title: string;
  category: "welfare" | "culture" | "reservation" | "education" | "support";
  district: string;
  place: string;
  startDate?: string;
  endDate?: string;
  availabilityStatus: "always" | "upcoming" | "closing_soon" | "ended";
  walkMinutes: number;
  indoorType: "indoor" | "outdoor" | "mixed";
  budgetType: "free" | "paid" | "unknown";
  guardianFriendly: boolean;
  familyFriendly: boolean;
  seniorFriendly: boolean;
  youthFriendly: boolean;
  timeSlots: TimeWindow[];
  companionTypes: CompanionType[];
  interestTags: string[];
  barrierSupport: string[];
  summary: string;
  actionUrl: string;
  sourceUrl: string;
};

export type CitySignal = {
  district: string;
  portal: "data-go-kr";
  datasets: string[];
  weatherType: "clear" | "cloudy" | "rain" | "heat" | "cold";
  weatherLabel: string;
  temperatureC: number;
  airQuality: "good" | "moderate" | "bad";
  airQualityLabel: string;
  outdoorIndex: number;
  walkComfort: "low" | "medium" | "high";
  advice: string;
  updatedAt: string;
};

export type DataSourceNote = {
  portal: "seoul-open-data" | "data-go-kr";
  datasetName: string;
  role: string;
};

export type RuntimeDataStatus = {
  portal: "seoul-open-data" | "data-go-kr";
  loadedFrom: "live" | "sample" | "mock";
  itemCount: number;
  updatedAt: string | null;
  datasetNames: string[];
  note: string;
};

export type AiAssistStatus = {
  enabled: boolean;
  mode: "live" | "fallback";
  model: string | null;
  generatedFields: string[];
  note: string;
};

export type RecommendationResult = {
  prescriptionType: PrescriptionType;
  personaSummary: string;
  headline: string;
  primaryAction: string;
  summary: string;
  todayBrief: string;
  reasons: string[];
  actionPlan: string[];
  shareMessage: string;
  matchScore: number;
  recommendationTone: string;
  citySignal: CitySignal;
  suggestedPrograms: ProgramItem[];
  sourceNotes: DataSourceNote[];
  dataStatus: RuntimeDataStatus[];
  guardianGuide: string;
  workerGuide: string;
  aiAssist: AiAssistStatus;
  publicValue: string;
  serviceWhy: string;
};

export type AdminCase = {
  id: string;
  name: string;
  ageLabel: string;
  district: string;
  participantPhone: string;
  guardianName: string | null;
  guardianPhone: string | null;
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
    persona: PersonaKey;
    intent: IntentKey;
    state: StateKey;
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
