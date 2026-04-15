export type CompanionType = "solo" | "family" | "parents" | "friends";
export type PurposeKey = "healing" | "culture" | "family" | "learning";
export type PlacePreference = "indoor" | "outdoor" | "any";
export type TimeWindow = "morning" | "afternoon" | "evening" | "weekend";
export type BudgetKey = "free" | "under10000" | "any";
export type MobilityLevel = "easy" | "normal" | "active";

export type RecommendationInput = {
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

export const districtOptions = [
  "종로구",
  "성동구",
  "강서구",
  "마포구",
  "강남구",
  "서초구",
  "영등포구",
  "동대문구"
] as const;

export const interestOptions = [
  "문화",
  "힐링",
  "가족",
  "학습",
  "자연",
  "전시",
  "산책",
  "AI",
  "예술",
  "회복"
] as const;

export const companionLabels: Record<CompanionType, string> = {
  solo: "혼자",
  family: "아이와 가족",
  parents: "부모님과 함께",
  friends: "친구와 함께"
};

export const purposeLabels: Record<PurposeKey, string> = {
  healing: "회복과 재충전",
  culture: "문화 경험",
  family: "가족 나들이",
  learning: "배움과 성장"
};

export const placePreferenceLabels: Record<PlacePreference, string> = {
  indoor: "실내 우선",
  outdoor: "야외 우선",
  any: "상관없음"
};

export const timeWindowLabels: Record<TimeWindow, string> = {
  morning: "오전",
  afternoon: "오후",
  evening: "저녁",
  weekend: "주말"
};

export const budgetLabels: Record<BudgetKey, string> = {
  free: "무료만",
  under10000: "1만원 이하",
  any: "예산 무관"
};

export const mobilityLabels: Record<MobilityLevel, string> = {
  easy: "이동은 최대한 짧게",
  normal: "보통",
  active: "이동 괜찮음"
};

export const scenarioPresets: Array<{
  id: string;
  title: string;
  summary: string;
  input: RecommendationInput;
}> = [
  {
    id: "after-work",
    title: "퇴근 후 혼자 재충전",
    summary: "마포구, 저녁, 실내, 20분 이내, 예술/힐링 중심",
    input: {
      district: "마포구",
      companionType: "solo",
      purpose: "healing",
      placePreference: "indoor",
      timeWindow: "evening",
      budget: "under10000",
      mobilityLevel: "easy",
      maxTravelMinutes: 20,
      interestTags: ["힐링", "예술", "회복"]
    }
  },
  {
    id: "parents-day",
    title: "부모님과 실내 문화 나들이",
    summary: "종로구, 주말, 무료, 도보 짧게, 문화/전시 중심",
    input: {
      district: "종로구",
      companionType: "parents",
      purpose: "culture",
      placePreference: "indoor",
      timeWindow: "weekend",
      budget: "free",
      mobilityLevel: "easy",
      maxTravelMinutes: 15,
      interestTags: ["문화", "전시", "힐링"]
    }
  },
  {
    id: "family-weekend",
    title: "아이와 주말 체험",
    summary: "강서구, 가족, 주말, 자연/가족 체험 중심",
    input: {
      district: "강서구",
      companionType: "family",
      purpose: "family",
      placePreference: "any",
      timeWindow: "weekend",
      budget: "free",
      mobilityLevel: "normal",
      maxTravelMinutes: 25,
      interestTags: ["가족", "자연", "체험"]
    }
  }
];

export const defaultInput = scenarioPresets[0].input;
