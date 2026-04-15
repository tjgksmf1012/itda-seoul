import { type RecommendationInput } from "../data/demo";

export type ProgramCard = {
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
  indoorType: "indoor" | "outdoor" | "mixed";
  budgetType: "free" | "paid" | "unknown";
  summary: string;
  interestTags: string[];
  actionUrl: string;
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

export type RecommendationResponse = {
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
  suggestedPrograms: ProgramCard[];
  sourceNotes: DataSourceNote[];
  publicValue: string;
  serviceWhy: string;
};

const fallbackPrograms: Record<string, ProgramCard[]> = {
  종로구: [
    {
      id: "jongno-museum-night",
      portal: "seoul-open-data",
      datasetName: "서울시 문화행사 정보",
      title: "서울역사박물관 야간 해설 투어",
      category: "culture",
      district: "종로구",
      place: "서울역사박물관",
      startDate: "2026-04-18",
      endDate: "2026-06-30",
      availabilityStatus: "upcoming",
      indoorType: "indoor",
      budgetType: "free",
      summary: "부모님과 함께 가볍게 다녀오기 좋은 실내 문화 코스입니다.",
      interestTags: ["문화", "전시", "힐링"],
      actionUrl: "https://culture.seoul.go.kr"
    }
  ],
  마포구: [
    {
      id: "mapo-art-class",
      portal: "seoul-open-data",
      datasetName: "서울시 공공서비스예약 정보",
      title: "마포 평생학습관 퇴근 후 드로잉 클래스",
      category: "education",
      district: "마포구",
      place: "마포평생학습관",
      startDate: "2026-04-17",
      endDate: "2026-05-29",
      availabilityStatus: "upcoming",
      indoorType: "indoor",
      budgetType: "paid",
      summary: "퇴근 직후 이동 부담이 적고, 혼자 참여해도 어색하지 않은 소규모 클래스입니다.",
      interestTags: ["예술", "힐링", "회복"],
      actionUrl: "https://yeyak.seoul.go.kr"
    }
  ],
  강서구: [
    {
      id: "gangseo-botanic-family",
      portal: "seoul-open-data",
      datasetName: "서울시 공공서비스예약 정보",
      title: "서울식물원 주말 가족 해설 프로그램",
      category: "reservation",
      district: "강서구",
      place: "서울식물원",
      startDate: "2026-04-20",
      endDate: "2026-06-14",
      availabilityStatus: "upcoming",
      indoorType: "mixed",
      budgetType: "free",
      summary: "아이와 함께 움직이기 좋고, 실내외 체험을 함께 즐길 수 있는 가족형 프로그램입니다.",
      interestTags: ["가족", "자연", "체험"],
      actionUrl: "https://yeyak.seoul.go.kr"
    }
  ]
};

const fallbackSignals: Record<string, CitySignal> = {
  종로구: {
    district: "종로구",
    portal: "data-go-kr",
    datasets: ["기상청 단기예보 조회서비스", "에어코리아 대기오염정보 조회서비스"],
    weatherType: "heat",
    weatherLabel: "초여름 더위",
    temperatureC: 28,
    airQuality: "moderate",
    airQualityLabel: "보통",
    outdoorIndex: 46,
    walkComfort: "low",
    advice: "한낮에는 실내 위주로 움직이는 편이 좋습니다.",
    updatedAt: "2026-04-15T09:00:00+09:00"
  },
  마포구: {
    district: "마포구",
    portal: "data-go-kr",
    datasets: ["기상청 단기예보 조회서비스", "에어코리아 대기오염정보 조회서비스"],
    weatherType: "rain",
    weatherLabel: "약한 비",
    temperatureC: 19,
    airQuality: "good",
    airQualityLabel: "좋음",
    outdoorIndex: 34,
    walkComfort: "low",
    advice: "실내 클래스나 예약형 프로그램이 더 안정적입니다.",
    updatedAt: "2026-04-15T09:00:00+09:00"
  },
  강서구: {
    district: "강서구",
    portal: "data-go-kr",
    datasets: ["기상청 단기예보 조회서비스", "에어코리아 대기오염정보 조회서비스"],
    weatherType: "clear",
    weatherLabel: "맑음",
    temperatureC: 23,
    airQuality: "good",
    airQualityLabel: "좋음",
    outdoorIndex: 79,
    walkComfort: "high",
    advice: "아이와 함께 움직이기 좋은 날이라 체험형 프로그램 만족도가 높습니다.",
    updatedAt: "2026-04-15T09:00:00+09:00"
  }
};

const companionTypeLabels = {
  solo: "혼자",
  family: "가족과 함께",
  parents: "부모님과 함께",
  friends: "친구와 함께"
} as const;

const budgetLabels = {
  free: "무료만",
  under10000: "1만원 이하",
  any: "예산 무관"
} as const;

const timeLabels = {
  morning: "오전",
  afternoon: "오후",
  evening: "저녁",
  weekend: "주말"
} as const;

function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL;
}

function buildFallbackResponse(input: RecommendationInput): RecommendationResponse {
  const citySignal = fallbackSignals[input.district] ?? fallbackSignals["종로구"];
  const suggestedPrograms = fallbackPrograms[input.district] ?? fallbackPrograms["종로구"];
  const primary = suggestedPrograms[0];

  return {
    headline: `${input.district}에서 오늘 가기 좋은 공공경험`,
    primaryAction: primary.title,
    summary: `${primary.title}을(를) 가장 먼저 추천합니다. ${input.district} 기준 이동 부담과 오늘 서울 컨디션을 함께 반영한 결과입니다.`,
    todayBrief: `${citySignal.district}의 오늘 시그널은 ${citySignal.weatherLabel}, 대기질 ${citySignal.airQualityLabel}입니다. 그래서 ${primary.indoorType === "outdoor" ? "야외" : "실내"} 중심 코스를 우선 배치했습니다.`,
    reasons: [
      `서울 열린데이터광장의 ${primary.datasetName} 후보 중 현재 조건과 가장 가까운 프로그램을 골랐습니다.`,
      `공공데이터포털 기준 오늘 시그널은 ${citySignal.weatherLabel}, 대기질 ${citySignal.airQualityLabel}입니다.`,
      `${timeLabels[input.timeWindow]}, ${companionTypeLabels[input.companionType]}, 예산 ${budgetLabels[input.budget]} 조건을 함께 반영해 실제로 가기 쉬운 선택지로 좁혔습니다.`
    ],
    actionPlan: [
      `${primary.place} 위치와 운영 시간을 먼저 확인합니다.`,
      "상세 페이지를 열어 바로 예약 또는 방문 가능한지 확인합니다.",
      citySignal.advice
    ],
    shareMessage: `오늘 서울 컨디션을 반영해 ${primary.title}을(를) 추천해요. ${primary.summary} ${citySignal.advice}`,
    matchScore: 78,
    recommendationTone:
      citySignal.weatherType === "rain" || citySignal.weatherType === "heat"
        ? "오늘은 실내 중심으로 짧게 움직이는 코스"
        : "오늘 바로 전환 가능한 공공경험 코스",
    citySignal,
    suggestedPrograms,
    sourceNotes: [
      {
        portal: "seoul-open-data",
        datasetName: primary.datasetName,
        role: "서울 시민이 실제로 갈 수 있는 후보 프로그램과 예약 링크를 제공합니다."
      },
      {
        portal: "data-go-kr",
        datasetName: citySignal.datasets.join(" + "),
        role: "오늘의 날씨와 대기질을 반영해 실내/실외 추천 강도를 조정합니다."
      }
    ],
    publicValue:
      "서울시 프로그램 후보와 국가 공공데이터의 당일 환경 신호를 합쳐, 시민이 실제로 움직일 수 있는 추천으로 바꿉니다.",
    serviceWhy:
      "후보 탐색은 서울 열린데이터광장, 오늘의 판단은 공공데이터포털로 분리해 심사 기준의 데이터 활용성과 시민 체감 유용성을 동시에 확보합니다."
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
