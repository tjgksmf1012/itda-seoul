import {
  BudgetKey,
  CitySignal,
  CompanionType,
  DataSourceNote,
  MobilityLevel,
  PlacePreference,
  ProgramItem,
  PurposeKey,
  RecommendationRequest,
  RecommendationResult,
  TimeWindow
} from "../types.js";
import { getCitySignal } from "./cityContextRepository.js";
import { getPrograms } from "./programRepository.js";

const companionTypeLabels: Record<CompanionType, string> = {
  solo: "혼자",
  family: "가족과 함께",
  parents: "부모님과 함께",
  friends: "친구와 함께"
};

const budgetLabels: Record<BudgetKey, string> = {
  free: "무료만",
  under10000: "1만원 이하",
  any: "예산 무관"
};

const timeLabels: Record<TimeWindow, string> = {
  morning: "오전",
  afternoon: "오후",
  evening: "저녁",
  weekend: "주말"
};

function scoreDistrict(program: ProgramItem, district: string) {
  return program.district === district ? 24 : 8;
}

function scorePurpose(program: ProgramItem, purpose: PurposeKey) {
  const purposeMap: Record<PurposeKey, ProgramItem["category"][]> = {
    healing: ["welfare", "support", "culture"],
    culture: ["culture", "reservation"],
    family: ["reservation", "culture", "welfare"],
    learning: ["education", "reservation", "culture"]
  };

  return purposeMap[purpose].includes(program.category) ? 18 : 4;
}

function scoreCompanion(program: ProgramItem, companionType: CompanionType) {
  return program.companionTypes.includes(companionType) ? 14 : 0;
}

function scoreTime(program: ProgramItem, timeWindow: TimeWindow) {
  return program.timeSlots.includes(timeWindow) ? 12 : 3;
}

function scoreBudget(program: ProgramItem, budget: BudgetKey) {
  if (budget === "any") {
    return 6;
  }

  if (budget === "free") {
    return program.budgetType === "free" ? 14 : -6;
  }

  return program.budgetType === "paid" || program.budgetType === "free" ? 10 : 2;
}

function scoreTravel(program: ProgramItem, mobilityLevel: MobilityLevel, maxTravelMinutes: number) {
  const mobilityBuffer = mobilityLevel === "easy" ? 0 : mobilityLevel === "normal" ? 6 : 10;
  const allowedMinutes = maxTravelMinutes + mobilityBuffer;

  if (program.walkMinutes <= allowedMinutes) {
    return 14;
  }

  return Math.max(-14, allowedMinutes - program.walkMinutes);
}

function scoreInterests(program: ProgramItem, interestTags: string[]) {
  const matchedCount = interestTags.filter((tag) => program.interestTags.includes(tag)).length;
  return matchedCount * 6;
}

function scorePlacePreference(
  program: ProgramItem,
  preference: PlacePreference,
  citySignal: CitySignal
) {
  let score = 0;

  if (preference === "indoor") {
    if (program.indoorType === "indoor") {
      score += 14;
    } else if (program.indoorType === "mixed") {
      score += 8;
    } else {
      score -= 10;
    }
  }

  if (preference === "outdoor") {
    if (program.indoorType === "outdoor") {
      score += 14;
    } else if (program.indoorType === "mixed") {
      score += 8;
    } else {
      score -= 10;
    }
  }

  if (citySignal.weatherType === "rain" || citySignal.weatherType === "heat") {
    if (program.indoorType === "indoor") {
      score += 14;
    }

    if (program.indoorType === "outdoor") {
      score -= 18;
    }
  }

  if (citySignal.airQuality === "bad") {
    if (program.indoorType === "indoor") {
      score += 10;
    }

    if (program.indoorType === "outdoor") {
      score -= 16;
    }
  }

  if (citySignal.outdoorIndex >= 75 && program.indoorType === "outdoor") {
    score += 10;
  }

  if (citySignal.walkComfort === "low" && program.walkMinutes > 15) {
    score -= 10;
  }

  return score;
}

function scoreAudience(program: ProgramItem, companionType: CompanionType) {
  if (companionType === "family" && program.familyFriendly) {
    return 10;
  }

  if (companionType === "parents" && program.seniorFriendly) {
    return 10;
  }

  if (companionType === "solo" && program.category === "support") {
    return 10;
  }

  return 0;
}

function buildRecommendationTone(citySignal: CitySignal, program: ProgramItem | undefined) {
  if (!program) {
    return "오늘은 가까운 실내 공공공간부터 탐색";
  }

  if (citySignal.weatherType === "rain" || citySignal.weatherType === "heat") {
    return "오늘은 실내 중심으로 짧게 움직이는 코스";
  }

  if (program.indoorType === "outdoor" && citySignal.outdoorIndex >= 75) {
    return "오늘은 야외 체감이 좋은 날의 산책형 코스";
  }

  return "오늘 바로 전환 가능한 공공경험 코스";
}

function buildSummary(input: RecommendationRequest, citySignal: CitySignal, primary: ProgramItem | undefined) {
  if (!primary) {
    return "지금 조건에 꼭 맞는 프로그램이 부족해 가까운 공공문화시설부터 탐색하는 것이 좋습니다.";
  }

  return `${primary.title}을(를) 가장 먼저 추천합니다. ${input.district} 기준 이동 부담과 오늘 서울 컨디션을 함께 반영한 결과입니다.`;
}

function buildTodayBrief(citySignal: CitySignal, primary: ProgramItem | undefined) {
  const placeLabel =
    primary?.indoorType === "outdoor"
      ? "야외"
      : primary?.indoorType === "mixed"
        ? "실내외 혼합"
        : "실내";

  return `${citySignal.district}의 오늘 시그널은 ${citySignal.weatherLabel}, 대기질 ${citySignal.airQualityLabel}입니다. 그래서 ${placeLabel} 중심 코스를 우선 배치했습니다.`;
}

function buildReasons(
  input: RecommendationRequest,
  citySignal: CitySignal,
  primary: ProgramItem | undefined
) {
  if (!primary) {
    return [
      `${input.district} 기준으로 바로 전환 가능한 공공 프로그램을 우선 찾았습니다.`,
      `공공데이터포털의 오늘 시그널은 ${citySignal.weatherLabel}, 대기질 ${citySignal.airQualityLabel}로 나타났습니다.`,
      "지금은 무리한 야외 이동보다 가깝고 부담이 적은 공공공간 탐색이 더 적합합니다."
    ];
  }

    return [
      `서울 열린데이터광장의 ${primary.datasetName} 후보 중 ${input.district}와 가장 맞는 프로그램을 골랐습니다.`,
      `공공데이터포털 기준 오늘 시그널은 ${citySignal.weatherLabel}, 대기질 ${citySignal.airQualityLabel}이라 ${primary.indoorType === "outdoor" ? "야외 체류 시간을 짧게" : "실내 활동을 우선"} 추천합니다.`,
      `${timeLabels[input.timeWindow]}, ${companionTypeLabels[input.companionType]}, 예산 ${budgetLabels[input.budget]} 조건을 함께 반영해 실제로 가기 쉬운 선택지로 좁혔습니다.`
    ];
}

function buildActionPlan(primary: ProgramItem | undefined, citySignal: CitySignal) {
  if (!primary) {
    return [
      "가장 가까운 실내 공공문화시설 또는 구립 도서관부터 확인합니다.",
      "이동 시간을 20분 이내로 제한해 첫 경험의 피로도를 낮춥니다.",
      `오늘 컨디션이 ${citySignal.weatherLabel}이라 야외 장거리 동선은 다음 날로 미룹니다.`
    ];
  }

  return [
    `${primary.place} 위치와 운영 시간을 먼저 확인합니다.`,
    `${primary.actionUrl.includes("http") ? "예약 또는 상세 페이지" : "상세 경로"}를 열어 바로 신청 가능한지 확인합니다.`,
    `${citySignal.advice} 이 기준으로 이동 시간을 짧게 가져가면 만족도가 높습니다.`
  ];
}

function buildShareMessage(primary: ProgramItem | undefined, citySignal: CitySignal) {
  if (!primary) {
    return "오늘은 날씨와 이동 피로도를 고려해 가까운 실내 공공공간부터 가볍게 둘러보는 것을 추천해요.";
  }

  return `오늘 서울 컨디션을 반영해 ${primary.title}을(를) 추천해요. ${primary.summary} ${citySignal.advice}`;
}

function buildSourceNotes(primary: ProgramItem | undefined, citySignal: CitySignal): DataSourceNote[] {
  return [
    {
      portal: "seoul-open-data",
      datasetName: primary?.datasetName ?? "서울시 공공 프로그램 데이터",
      role: "서울 시민이 실제로 갈 수 있는 후보 프로그램과 예약 링크를 제공합니다."
    },
    {
      portal: "data-go-kr",
      datasetName: citySignal.datasets.join(" + "),
      role: "오늘의 날씨와 대기질을 반영해 실내/실외 추천 강도를 조정합니다."
    }
  ];
}

export function buildRecommendation(input: RecommendationRequest): RecommendationResult {
  const citySignal = getCitySignal(input.district);

  const ranked = [...getPrograms()]
    .filter((program) => program.availabilityStatus !== "ended")
    .map((program) => {
      const score =
        scoreDistrict(program, input.district) +
        scorePurpose(program, input.purpose) +
        scoreCompanion(program, input.companionType) +
        scoreTime(program, input.timeWindow) +
        scoreBudget(program, input.budget) +
        scoreTravel(program, input.mobilityLevel, input.maxTravelMinutes) +
        scoreInterests(program, input.interestTags) +
        scorePlacePreference(program, input.placePreference, citySignal) +
        scoreAudience(program, input.companionType);

      return { program, score };
    })
    .sort((left, right) => right.score - left.score);

  const suggestedPrograms = ranked.slice(0, 3).map((item) => item.program);
  const primary = suggestedPrograms[0];
  const matchScore = Math.max(0, ranked[0]?.score ?? 0);
  const recommendationTone = buildRecommendationTone(citySignal, primary);

  return {
    headline: `${input.district}에서 오늘 가기 좋은 공공경험`,
    primaryAction: primary?.title ?? "가까운 실내 공공공간 탐색",
    summary: buildSummary(input, citySignal, primary),
    todayBrief: buildTodayBrief(citySignal, primary),
    reasons: buildReasons(input, citySignal, primary),
    actionPlan: buildActionPlan(primary, citySignal),
    shareMessage: buildShareMessage(primary, citySignal),
    matchScore,
    recommendationTone,
    citySignal,
    suggestedPrograms,
    sourceNotes: buildSourceNotes(primary, citySignal),
    publicValue:
      "서울시 프로그램 후보와 국가 공공데이터의 당일 환경 신호를 합쳐, 시민이 실제로 움직일 수 있는 추천으로 바꿉니다.",
    serviceWhy:
      "후보 탐색은 서울 열린데이터광장, 오늘의 판단은 공공데이터포털로 분리해 심사 기준의 데이터 활용성과 시민 체감 유용성을 동시에 확보합니다."
  };
}
