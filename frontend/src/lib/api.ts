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

export type RecommendationResponse = {
  prescriptionType: "outing" | "participation" | "conversation" | "guardian";
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
  suggestedPrograms: ProgramCard[];
  sourceNotes: DataSourceNote[];
  dataStatus: RuntimeDataStatus[];
  guardianGuide: string;
  workerGuide: string;
  aiAssist: AiAssistStatus;
  publicValue: string;
  serviceWhy: string;
};

const fallbackPrograms: Record<string, ProgramCard[]> = {
  종로구: [
    {
      id: "jongno-senior-gym",
      portal: "seoul-open-data",
      datasetName: "서울시 노인여가복지시설 프로그램",
      title: "종로노인복지관 가벼운 건강체조",
      category: "welfare",
      district: "종로구",
      place: "종로노인종합복지관",
      startDate: "2026-04-16",
      endDate: "2026-06-30",
      availabilityStatus: "upcoming",
      indoorType: "indoor",
      budgetType: "free",
      summary: "도보 부담이 낮고 처음 참여하는 어르신도 진입하기 쉬운 소규모 프로그램입니다.",
      interestTags: ["건강", "상담", "문화"],
      actionUrl: "https://news.seoul.go.kr/welfare"
    },
    {
      id: "jongno-museum-night",
      portal: "seoul-open-data",
      datasetName: "서울시 문화행사 정보",
      title: "서울공예박물관 조용한 전시 해설",
      category: "culture",
      district: "종로구",
      place: "서울공예박물관",
      startDate: "2026-04-18",
      endDate: "2026-06-30",
      availabilityStatus: "upcoming",
      indoorType: "indoor",
      budgetType: "free",
      summary: "보호자와 함께 가볍게 다녀오기 좋은 실내 문화 코스입니다.",
      interestTags: ["문화", "전시"],
      actionUrl: "https://culture.seoul.go.kr"
    }
  ],
  성동구: [
    {
      id: "seongdong-film-talk",
      portal: "seoul-open-data",
      datasetName: "서울시 문화행사 정보",
      title: "성동문화센터 무료 영화 해설 모임",
      category: "culture",
      district: "성동구",
      place: "성동문화센터",
      startDate: "2026-04-19",
      endDate: "2026-05-31",
      availabilityStatus: "upcoming",
      indoorType: "indoor",
      budgetType: "free",
      summary: "부모님과 함께 첫 외출로 잡기 좋은 조용한 실내 활동입니다.",
      interestTags: ["문화", "전시", "가족"],
      actionUrl: "https://culture.seoul.go.kr"
    },
    {
      id: "seongdong-support-lounge",
      portal: "seoul-open-data",
      datasetName: "서울시 청년·중장년 지원 프로그램",
      title: "성동 마음연결 라운지",
      category: "support",
      district: "성동구",
      place: "성동구 커뮤니티센터",
      startDate: "2026-04-15",
      endDate: "2026-12-31",
      availabilityStatus: "always",
      indoorType: "indoor",
      budgetType: "free",
      summary: "짧게 머물며 대화와 상담을 시작할 수 있는 연결형 공간입니다.",
      interestTags: ["상담", "문화"],
      actionUrl: "https://yeyak.seoul.go.kr"
    }
  ],
  강서구: [
    {
      id: "gangseo-botanic-family",
      portal: "seoul-open-data",
      datasetName: "서울시 공공서비스예약 정보",
      title: "서울식물원 가족 체험 프로그램",
      category: "reservation",
      district: "강서구",
      place: "서울식물원",
      startDate: "2026-04-20",
      endDate: "2026-06-14",
      availabilityStatus: "upcoming",
      indoorType: "mixed",
      budgetType: "free",
      summary: "이번 주 안에 바로 예약하고 참여 여부를 확인하기 좋은 프로그램입니다.",
      interestTags: ["건강", "자연", "학습"],
      actionUrl: "https://yeyak.seoul.go.kr"
    },
    {
      id: "gangseo-care-talk",
      portal: "seoul-open-data",
      datasetName: "서울시 노인여가복지시설 프로그램",
      title: "강서 어르신 안부모임",
      category: "support",
      district: "강서구",
      place: "강서노인복지센터",
      startDate: "2026-04-17",
      endDate: "2026-07-01",
      availabilityStatus: "upcoming",
      indoorType: "indoor",
      budgetType: "free",
      summary: "복지사가 재추천하기 좋은 대화형 소모임입니다.",
      interestTags: ["상담", "건강"],
      actionUrl: "https://news.seoul.go.kr/welfare"
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
    advice: "오늘은 긴 외출보다 가까운 실내 프로그램부터 시작하는 편이 좋습니다.",
    updatedAt: "2026-04-15T09:00:00+09:00"
  },
  성동구: {
    district: "성동구",
    portal: "data-go-kr",
    datasets: ["기상청 단기예보 조회서비스", "에어코리아 대기오염정보 조회서비스"],
    weatherType: "cloudy",
    weatherLabel: "구름 많음",
    temperatureC: 21,
    airQuality: "good",
    airQualityLabel: "좋음",
    outdoorIndex: 71,
    walkComfort: "high",
    advice: "짧은 이동의 실내 문화활동과 가벼운 산책형 동선이 모두 가능합니다.",
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
    advice: "오늘은 예약형 체험 프로그램을 실제 참여로 연결하기 좋은 날입니다.",
    updatedAt: "2026-04-15T09:00:00+09:00"
  }
};

const fallbackPrescriptionByDistrict: Record<string, RecommendationResponse["prescriptionType"]> = {
  종로구: "conversation",
  성동구: "guardian",
  강서구: "participation"
};

function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL;
}

function buildFallbackResponse(input: RecommendationInput): RecommendationResponse {
  const citySignal = fallbackSignals[input.district] ?? fallbackSignals["종로구"];
  const suggestedPrograms = fallbackPrograms[input.district] ?? fallbackPrograms["종로구"];
  const primary = suggestedPrograms[0];
  const prescriptionType = fallbackPrescriptionByDistrict[input.district] ?? "outing";
  const personaSummary = [
    input.ageGroup === "senior" ? "고령층" : "중장년",
    input.livingSituation === "alone" ? "1인 가구/독거 상태" : "가족과 거주",
    input.recentOutings === "none" ? "최근 외출 거의 없음" : input.recentOutings === "rare" ? "가끔 외출" : "주 1회 이상 외출",
    input.guardianMode === "accompany" ? "보호자 동행 가능" : input.guardianMode === "available" ? "보호자 공유 가능" : "보호자 도움 없음"
  ].join(" · ");

  return {
    prescriptionType,
    personaSummary,
    headline: `${input.district} 사회연결 처방 추천`,
    primaryAction:
      prescriptionType === "guardian"
        ? `${primary.title}을 보호자와 함께 첫 일정으로 잡으세요`
        : prescriptionType === "participation"
          ? `${primary.title} 신청을 이번 주 안에 마치세요`
          : `${primary.title}부터 가볍게 연결을 시작하세요`,
    summary: `${primary.title}을(를) 첫 연결 행동으로 추천합니다. 목록을 많이 보여주기보다 지금 이 사람에게 부담이 낮은 다음 행동 1개를 정하는 데 초점을 맞췄습니다.`,
    todayBrief: `${citySignal.district}의 오늘 조건은 ${citySignal.weatherLabel}, 대기질 ${citySignal.airQualityLabel}입니다. 그래서 실내/실외 우선순위와 이동 부담을 함께 조정했습니다.`,
    reasons: [
      `서울 열린데이터광장의 ${primary.datasetName} 후보 중 현재 상태와 가장 가까운 프로그램을 골랐습니다.`,
      `AI는 ${personaSummary} 조건과 오늘의 도시 시그널을 함께 읽어 ${prescriptionType} 처방을 우선으로 판단했습니다.`,
      "추천에서 끝내지 않고 신청 링크와 보호자 공유 문구까지 이어지도록 구성했습니다."
    ],
    actionPlan: [
      `${primary.place} 위치와 운영 시간을 먼저 확인합니다.`,
      prescriptionType === "guardian" ? "보호자와 가능한 날짜를 먼저 맞춥니다." : "이번 주에는 1회 참여만 목표로 잡습니다.",
      `${primary.actionUrl}에서 신청 또는 상세 정보를 바로 확인합니다.`
    ],
    shareMessage: `이번 주 첫 연결 행동으로 ${primary.title}을 추천합니다. 부담을 낮춰 한 번 참여부터 시작해보면 좋겠습니다.`,
    matchScore: 82,
    recommendationTone: `${prescriptionType} · ${personaSummary}`,
    citySignal,
    suggestedPrograms,
    sourceNotes: [
      {
        portal: "seoul-open-data",
        datasetName: primary.datasetName,
        role: "복지시설, 문화행사, 예약형 프로그램 후보를 구성합니다."
      },
      {
        portal: "data-go-kr",
        datasetName: citySignal.datasets.join(" + "),
        role: "오늘의 날씨와 대기질을 반영해 실내/실외 우선순위와 이동 부담을 조정합니다."
      }
    ],
    dataStatus: [
      {
        portal: "seoul-open-data",
        loadedFrom: "sample",
        itemCount: suggestedPrograms.length,
        updatedAt: "2026-04-15T09:00:00+09:00",
        datasetNames: [...new Set(suggestedPrograms.map((program) => program.datasetName))],
        note: "발표용 샘플 후보군입니다."
      },
      {
        portal: "data-go-kr",
        loadedFrom: "sample",
        itemCount: 1,
        updatedAt: citySignal.updatedAt,
        datasetNames: citySignal.datasets,
        note: "발표용 샘플 도시 시그널입니다."
      }
    ],
    guardianGuide:
      prescriptionType === "guardian"
        ? "보호자에게는 첫 외출을 길게 잡지 말고, 일정 확인과 귀가 동선 안내까지 같이 설명해 달라고 전해 주세요."
        : "보호자에게는 이번 주 한 번의 연결만 목표라고 설명하고, 전날 다시 한 번 참여 의사를 확인해 달라고 안내해 주세요.",
    workerGuide:
      "복지사나 기관 담당자는 이번 주 목표를 참여 1회가 아니라 연결 1회로 낮추고, 미참여 시에는 더 가까운 대안 프로그램으로 재추천해 주세요.",
    aiAssist: {
      enabled: false,
      mode: "fallback",
      model: null,
      generatedFields: [],
      note: "프론트 fallback 응답으로 기본 문구를 사용했습니다."
    },
    publicValue:
      "서울시가 이미 보유한 복지·문화·예약 데이터를 행동 추천으로 전환해 고립위험군의 첫 외출과 첫 연결의 문턱을 낮춥니다.",
    serviceWhy:
      "후보 탐색은 서울 열린데이터광장, 오늘의 이동 가능 판단은 공공데이터포털로 분리해 대회 요건과 실사용 가치를 함께 확보합니다."
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
