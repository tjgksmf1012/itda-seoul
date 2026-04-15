export type PersonaKey = "elder" | "child" | "worker";
export type IntentKey = "outing" | "program" | "support";
export type StateKey = "low" | "normal" | "high";
export type CaseStatus = "pending" | "contacted" | "scheduled" | "completed";

export type CompanionType = "solo" | "family" | "parents" | "friends";
export type PurposeKey = "healing" | "culture" | "family" | "learning";
export type PlacePreference = "indoor" | "outdoor" | "any";
export type TimeWindow = "morning" | "afternoon" | "evening" | "weekend";
export type BudgetKey = "free" | "under10000" | "any";
export type MobilityLevel = "easy" | "normal" | "active";

export type RecommendationRequest = {
  district: string;
  companionType: CompanionType;
  purpose: PurposeKey;
  placePreference: PlacePreference;
  timeWindow: TimeWindow;
  budget: BudgetKey;
  mobilityLevel: MobilityLevel;
  maxTravelMinutes: number;
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

export type RecommendationResult = {
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
  publicValue: string;
  serviceWhy: string;
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
