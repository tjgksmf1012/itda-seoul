export type AgeGroup = "middle" | "senior";
export type LivingSituation = "alone" | "withFamily";
export type OutingLevel = "low" | "medium" | "high";
export type RecentOutings = "none" | "rare" | "weekly";
export type GuardianMode = "none" | "available" | "accompany";
export type InteractionPreference = "quiet" | "small_group" | "open";

export type RecommendationInput = {
  district: string;
  ageGroup: AgeGroup;
  livingSituation: LivingSituation;
  outingLevel: OutingLevel;
  walkMinutes: number;
  recentOutings: RecentOutings;
  guardianMode: GuardianMode;
  interactionPreference: InteractionPreference;
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
  "건강",
  "가족",
  "학습",
  "자연",
  "전시",
  "산책",
  "AI",
  "예술",
  "상담"
] as const;

export const ageGroupLabels: Record<AgeGroup, string> = {
  middle: "중장년",
  senior: "고령층"
};

export const livingSituationLabels: Record<LivingSituation, string> = {
  alone: "혼자 지냄",
  withFamily: "가족과 거주"
};

export const outingLevelLabels: Record<OutingLevel, string> = {
  low: "짧은 이동만 가능",
  medium: "보통 수준 외출 가능",
  high: "외출 부담이 비교적 적음"
};

export const recentOutingLabels: Record<RecentOutings, string> = {
  none: "최근 2주 거의 없음",
  rare: "가끔 외출",
  weekly: "주 1회 이상 외출"
};

export const guardianModeLabels: Record<GuardianMode, string> = {
  none: "보호자 도움 없음",
  available: "보호자 공유 가능",
  accompany: "보호자 동행 가능"
};

export const interactionPreferenceLabels: Record<InteractionPreference, string> = {
  quiet: "조용한 활동",
  small_group: "소규모 모임",
  open: "열린 참여형"
};

export const scenarioPresets: Array<{
  id: string;
  title: string;
  summary: string;
  input: RecommendationInput;
}> = [
  {
    id: "senior-alone",
    title: "혼자 지내는 78세 어르신",
    summary: "외출 거의 없음, 도보 10분 이내, 조용한 연결부터 시작",
    input: {
      district: "종로구",
      ageGroup: "senior",
      livingSituation: "alone",
      outingLevel: "low",
      walkMinutes: 10,
      recentOutings: "none",
      guardianMode: "available",
      interactionPreference: "quiet",
      interestTags: ["건강", "상담", "문화"]
    }
  },
  {
    id: "adult-child",
    title: "부모님을 챙기는 자녀",
    summary: "부담 낮은 첫 외출 후보 3개와 공유 문구가 필요한 상황",
    input: {
      district: "성동구",
      ageGroup: "senior",
      livingSituation: "alone",
      outingLevel: "medium",
      walkMinutes: 15,
      recentOutings: "rare",
      guardianMode: "accompany",
      interactionPreference: "small_group",
      interestTags: ["문화", "전시", "가족"]
    }
  },
  {
    id: "welfare-worker",
    title: "복지사 재추천 케이스",
    summary: "이번 주 안에 신청 가능한 참여형 후보를 빠르게 확인",
    input: {
      district: "강서구",
      ageGroup: "senior",
      livingSituation: "alone",
      outingLevel: "medium",
      walkMinutes: 18,
      recentOutings: "rare",
      guardianMode: "none",
      interactionPreference: "open",
      interestTags: ["건강", "학습", "자연"]
    }
  }
];

export const defaultInput = scenarioPresets[0].input;
