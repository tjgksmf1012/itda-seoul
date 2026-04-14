export type PersonaKey = "elder" | "child" | "worker";
export type IntentKey = "outing" | "program" | "support";
export type StateKey = "low" | "normal" | "high";
export type CaseStatus = "pending" | "contacted" | "scheduled" | "completed";

export type RecommendationRequest = {
  persona: PersonaKey;
  intent: IntentKey;
  state: StateKey;
  walkMinutes: number;
  interestTags: string[];
};

export type ProgramItem = {
  id: string;
  title: string;
  category: "welfare" | "culture" | "reservation" | "support";
  district: string;
  place?: string;
  startDate?: string;
  endDate?: string;
  availabilityStatus: "always" | "upcoming" | "closing_soon" | "ended";
  walkMinutes: number;
  free: boolean;
  guardianFriendly: boolean;
  groupSize: "small" | "medium";
  timeSlot: "morning" | "afternoon" | "weekend" | "any";
  tags: string[];
  barrierSupport: string[];
  summary: string;
  actionUrl: string;
};

export type RecommendationResult = {
  recommendationType: "outing" | "program" | "support";
  primaryAction: string;
  summary: string;
  shareMessage: string;
  reasons: string[];
  actionPlan: string[];
  checkInMessage: string;
  supportLevel: "light" | "guided" | "urgent";
  matchScore: number;
  suggestedPrograms: ProgramItem[];
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

export type AdminDashboard = {
  summary: {
    totalCases: number;
    needsAttention: number;
    scheduledThisWeek: number;
    completedThisWeek: number;
  };
  cases: AdminCase[];
};
