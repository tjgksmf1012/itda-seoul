import {
  CitySignal,
  DataSourceNote,
  GuardianMode,
  InteractionPreference,
  OutingLevel,
  PrescriptionType,
  ProgramItem,
  RecommendationRequest,
  RecommendationResult,
  RecentOutingFrequency
} from "../types.js";
import { generateAiNarration } from "../services/openaiNarration.js";
import { getCitySignal, getCitySignalCatalogStatus } from "./cityContextRepository.js";
import { getProgramCatalogStatus, getPrograms } from "./programRepository.js";

const prescriptionLabels: Record<PrescriptionType, string> = {
  outing: "외출 처방",
  participation: "참여 처방",
  conversation: "대화 처방",
  guardian: "보호자 처방"
};

const outingLevelLabels: Record<OutingLevel, string> = {
  low: "짧고 부담이 적은 이동",
  medium: "보통 수준 외출",
  high: "이동 부담이 비교적 적음"
};

const recentOutingLabels: Record<RecentOutingFrequency, string> = {
  none: "최근 외출 거의 없음",
  rare: "가끔 외출함",
  weekly: "주 1회 이상 외출"
};

const guardianModeLabels: Record<GuardianMode, string> = {
  none: "보호자 지원 없음",
  available: "필요 시 보호자 공유 가능",
  accompany: "보호자 동행 가능"
};

const interactionLabels: Record<InteractionPreference, string> = {
  quiet: "조용한 환경 선호",
  small_group: "소규모 모임 선호",
  open: "열린 참여형 활동 가능"
};

function determinePrescription(input: RecommendationRequest, citySignal: CitySignal): PrescriptionType {
  if (input.guardianMode === "accompany") {
    return "guardian";
  }

  if (input.recentOutings === "none" && input.outingLevel === "low") {
    return "conversation";
  }

  if (citySignal.outdoorIndex < 50 || citySignal.walkComfort === "low") {
    return "participation";
  }

  return "outing";
}

function scoreDistrict(program: ProgramItem, district: string) {
  return program.district === district ? 24 : 6;
}

function scoreAudience(program: ProgramItem, input: RecommendationRequest) {
  let score = 0;

  if (input.ageGroup === "senior" && program.seniorFriendly) {
    score += 18;
  }

  if (input.ageGroup === "middle" && program.youthFriendly) {
    score += 10;
  }

  if (input.livingSituation === "alone" && program.category === "support") {
    score += 12;
  }

  if (input.guardianMode === "accompany" && program.guardianFriendly) {
    score += 12;
  }

  return score;
}

function scoreMobility(program: ProgramItem, input: RecommendationRequest) {
  const mobilityBuffer = input.outingLevel === "low" ? 0 : input.outingLevel === "medium" ? 5 : 10;
  const allowedMinutes = input.walkMinutes + mobilityBuffer;

  if (program.walkMinutes <= allowedMinutes) {
    return 18;
  }

  return Math.max(-18, allowedMinutes - program.walkMinutes);
}

function scoreInterests(program: ProgramItem, interestTags: string[]) {
  const matchCount = interestTags.filter((tag) => program.interestTags.includes(tag)).length;
  return matchCount * 7;
}

function scoreInteraction(program: ProgramItem, preference: InteractionPreference) {
  if (preference === "quiet") {
    if (program.category === "support" || program.category === "welfare") {
      return 12;
    }

    if (program.category === "culture" && program.indoorType !== "outdoor") {
      return 8;
    }
  }

  if (preference === "small_group") {
    if (program.category === "welfare" || program.category === "education") {
      return 10;
    }
  }

  if (preference === "open" && (program.category === "reservation" || program.category === "culture")) {
    return 10;
  }

  return 3;
}

function scoreCityContext(program: ProgramItem, citySignal: CitySignal) {
  let score = 0;

  if (citySignal.weatherType === "rain" || citySignal.weatherType === "heat") {
    if (program.indoorType === "indoor") {
      score += 14;
    }

    if (program.indoorType === "outdoor") {
      score -= 16;
    }
  }

  if (citySignal.airQuality === "bad" && program.indoorType === "outdoor") {
    score -= 14;
  }

  if (citySignal.outdoorIndex >= 75 && program.indoorType === "outdoor") {
    score += 10;
  }

  if (citySignal.walkComfort === "low" && program.walkMinutes > 12) {
    score -= 12;
  }

  return score;
}

function scorePrescription(program: ProgramItem, prescriptionType: PrescriptionType) {
  if (prescriptionType === "conversation") {
    if (program.category === "support" || program.category === "welfare") {
      return 18;
    }

    if (program.indoorType === "indoor") {
      return 8;
    }
  }

  if (prescriptionType === "guardian") {
    return program.guardianFriendly || program.familyFriendly ? 16 : 4;
  }

  if (prescriptionType === "participation") {
    return program.category === "reservation" || program.category === "education" ? 14 : 6;
  }

  if (prescriptionType === "outing") {
    return program.category === "culture" || program.category === "reservation" ? 12 : 6;
  }

  return 0;
}

function scoreProgram(
  program: ProgramItem,
  input: RecommendationRequest,
  citySignal: CitySignal,
  prescriptionType: PrescriptionType
) {
  return (
    scoreDistrict(program, input.district) +
    scoreAudience(program, input) +
    scoreMobility(program, input) +
    scoreInterests(program, input.interestTags) +
    scoreInteraction(program, input.interactionPreference) +
    scoreCityContext(program, citySignal) +
    scorePrescription(program, prescriptionType)
  );
}

function buildPersonaSummary(input: RecommendationRequest) {
  const householdText = input.livingSituation === "alone" ? "1인 가구 독거 상태" : "가족과 동거";

  return [
    input.ageGroup === "senior" ? "고령층" : "중장년",
    householdText,
    recentOutingLabels[input.recentOutings],
    outingLevelLabels[input.outingLevel],
    guardianModeLabels[input.guardianMode],
    interactionLabels[input.interactionPreference]
  ].join(" · ");
}

function buildHeadline(input: RecommendationRequest, prescriptionType: PrescriptionType) {
  return `${input.district} ${prescriptionLabels[prescriptionType]} 추천`;
}

function buildPrimaryAction(primary: ProgramItem | undefined, prescriptionType: PrescriptionType) {
  if (!primary) {
    return "가까운 복지 연결처를 먼저 확인해 주세요.";
  }

  if (prescriptionType === "conversation") {
    return `${primary.title}부터 가볍게 연결을 시작해 보세요.`;
  }

  if (prescriptionType === "guardian") {
    return `${primary.title}을 보호자와 함께 첫 일정으로 잡아 보세요.`;
  }

  if (prescriptionType === "participation") {
    return `${primary.title} 신청을 이번 주 안에 마치는 것이 좋습니다.`;
  }

  return `${primary.title}을 이번 주 첫 외출 후보로 추천합니다.`;
}

function buildSummary(
  input: RecommendationRequest,
  citySignal: CitySignal,
  primary: ProgramItem | undefined,
  prescriptionType: PrescriptionType
) {
  if (!primary) {
    return "현재 조건에 맞는 후보가 적어 가까운 복지관이나 상담형 연결부터 시작하는 것이 좋습니다.";
  }

  if (prescriptionType === "conversation") {
    return `${input.district}에서 이동 부담이 낮고 심리적 진입 장벽이 낮은 연결처를 우선 골랐습니다. 오늘은 무리한 외출보다 한 번의 연결을 만드는 것이 더 중요합니다.`;
  }

  if (prescriptionType === "guardian") {
    return `보호자 동행 가능성을 반영해 ${primary.title}을 첫 행동으로 골랐습니다. 추천에서 끝나지 않고 공유와 신청까지 바로 이어질 수 있도록 설계했습니다.`;
  }

  if (prescriptionType === "participation") {
    return `${citySignal.weatherLabel}와 ${citySignal.airQualityLabel} 조건을 반영해 실내 또는 예약형 후보를 앞쪽에 배치했습니다. 이번 주 안에 신청 가능한 선택지를 우선 제안합니다.`;
  }

  return `${primary.title}은 현재 상태에서 첫 외출로 부담이 비교적 적고, 다음 연결로 이어질 가능성이 높은 후보입니다.`;
}

function buildTodayBrief(citySignal: CitySignal, prescriptionType: PrescriptionType) {
  if (prescriptionType === "conversation") {
    return `${citySignal.district}의 오늘 조건은 ${citySignal.weatherLabel}, 대기질 ${citySignal.airQualityLabel}입니다. 긴 외출보다 실내 중심의 연결 행동을 권합니다.`;
  }

  if (prescriptionType === "participation") {
    return `${citySignal.district}의 오늘 조건은 ${citySignal.weatherLabel}, 대기질 ${citySignal.airQualityLabel}입니다. 오늘은 예약 가능성과 실내 접근성을 우선 반영했습니다.`;
  }

  return `${citySignal.district}의 오늘 조건은 ${citySignal.weatherLabel}, 대기질 ${citySignal.airQualityLabel}입니다. 이동 피로를 줄이면서 실제 참여로 이어질 수 있는 순서로 배치했습니다.`;
}

function buildReasons(
  input: RecommendationRequest,
  citySignal: CitySignal,
  primary: ProgramItem | undefined,
  prescriptionType: PrescriptionType
) {
  if (!primary) {
    return [
      `${input.district} 기준으로 현재 조건에 맞는 후보가 적어 상담 또는 복지 연결을 먼저 권합니다.`,
      `오늘의 도시 시그널은 ${citySignal.weatherLabel}, 대기질 ${citySignal.airQualityLabel}로 장거리 이동에 불리합니다.`,
      "지금은 많이 보는 것보다 한 번 연결되는 경험을 만드는 것이 더 중요합니다."
    ];
  }

  return [
    `서울 열린데이터광장의 ${primary.datasetName} 후보 중 현재 조건과 가장 가까운 프로그램을 우선 선정했습니다.`,
    `${buildPersonaSummary(input)} 조건과 오늘의 도시 시그널을 함께 읽어 ${prescriptionLabels[prescriptionType]}을 먼저 제안했습니다.`,
    `${primary.place} 접근성과 실제 행동 전환 가능성을 고려해 추천 이후 신청 또는 방문까지 이어질 수 있는 순서로 배치했습니다.`
  ];
}

function buildActionPlan(primary: ProgramItem | undefined, citySignal: CitySignal, prescriptionType: PrescriptionType) {
  if (!primary) {
    return [
      "가까운 복지관 또는 상담 연결처를 먼저 확인합니다.",
      "이번 주 목표를 외출 1회가 아니라 연결 1회로 낮춥니다.",
      `${citySignal.advice}를 참고해 가장 부담이 적은 선택지를 다시 정합니다.`
    ];
  }

  if (prescriptionType === "guardian") {
    return [
      `${primary.place} 위치와 운영 시간을 먼저 확인합니다.`,
      "보호자와 함께 가능한 날짜를 먼저 정합니다.",
      `${primary.actionUrl}에서 상세 정보와 신청 가능 여부를 확인합니다.`
    ];
  }

  if (prescriptionType === "participation") {
    return [
      `${primary.actionUrl}에서 신청 가능 여부를 먼저 확인합니다.`,
      "이번 주 첫 참여 1건만 목표로 잡습니다.",
      `${citySignal.advice}를 참고해 이동 부담이 낮은 시간대로 맞춥니다.`
    ];
  }

  return [
    `${primary.place}까지 이동 시간을 다시 확인합니다.`,
    "처음에는 주 1회 참여만 목표로 잡습니다.",
    `${primary.actionUrl}에서 상세 안내와 신청 링크를 확인합니다.`
  ];
}

function buildShareMessage(primary: ProgramItem | undefined, prescriptionType: PrescriptionType) {
  if (!primary) {
    return "이번 주에는 멀리 가는 것보다 가까운 복지 연결처나 상담형 지원부터 한 번 연결해보는 것이 좋겠습니다.";
  }

  if (prescriptionType === "guardian") {
    return `이번 주 첫 외출 후보로 ${primary.title}을 추천합니다. 보호자 동행 기준으로 부담이 낮고, 바로 확인할 수 있는 링크도 함께 보냅니다.`;
  }

  return `이번 주에는 ${primary.title}부터 한 번 시도해보는 것이 좋겠습니다. 너무 큰 목표보다 '한 번 연결되기'에 초점을 맞춘 추천입니다.`;
}

function buildGuardianGuide(primary: ProgramItem | undefined, prescriptionType: PrescriptionType) {
  if (!primary) {
    return "보호자에게는 이번 주 한 번의 연결만 목표라고 설명하고, 가까운 복지 연결처부터 천천히 안내해 주세요.";
  }

  if (prescriptionType === "guardian") {
    return `${primary.title} 일정을 먼저 공유하고, 동행 가능한 날짜를 정한 뒤 이동 동선과 귀가 방법까지 함께 안내해 주세요. 처음부터 오래 머물기보다 짧게 참여해도 충분하다고 설명하는 편이 좋습니다.`;
  }

  return `${primary.title} 참여 이유를 짧고 편안하게 설명하고, 전날 다시 한 번 참석 의사를 확인해 주세요. 부담이 커 보이면 일정 자체를 줄이거나 상담형 대안으로 바꾸는 것이 좋습니다.`;
}

function buildWorkerGuide(primary: ProgramItem | undefined, prescriptionType: PrescriptionType) {
  if (!primary) {
    return "이번 주 목표를 참여 1회가 아니라 연결 1회로 낮추고, 미참여 시에는 상담 연결 또는 더 가까운 대안 프로그램으로 재추천해 주세요.";
  }

  return `${primary.title}를 1차 제안으로 안내하고, 응답이 없으면 ${
    prescriptionType === "conversation" ? "상담 연결형" : "더 짧은 참여형"
  } 대안으로 전환해 주세요. 체크인 시에는 이동 부담, 동행 필요 여부, 다음 주 재참여 가능성 세 가지를 먼저 확인하면 됩니다.`;
}

function buildSourceNotes(primary: ProgramItem | undefined, citySignal: CitySignal): DataSourceNote[] {
  return [
    {
      portal: "seoul-open-data",
      datasetName: primary?.datasetName ?? "서울시 복지·문화·예약 데이터",
      role: "독거노인과 고령층이 실제로 갈 수 있는 복지시설, 문화행사, 예약 프로그램 후보를 구성합니다."
    },
    {
      portal: "data-go-kr",
      datasetName: citySignal.datasets.join(" + "),
      role: "오늘의 날씨와 대기질을 읽어 실내/실외 우선순위와 이동 부담을 조정합니다."
    }
  ];
}

export async function buildRecommendation(input: RecommendationRequest): Promise<RecommendationResult> {
  const citySignal = getCitySignal(input.district);
  const programCatalogStatus = getProgramCatalogStatus();
  const citySignalStatus = getCitySignalCatalogStatus();
  const prescriptionType = determinePrescription(input, citySignal);

  const ranked = [...getPrograms()]
    .filter((program) => program.availabilityStatus !== "ended")
    .map((program) => ({
      program,
      score: scoreProgram(program, input, citySignal, prescriptionType)
    }))
    .sort((left, right) => right.score - left.score);

  const suggestedPrograms = ranked.slice(0, 3).map((item) => item.program);
  const primary = suggestedPrograms[0];
  const matchScore = Math.max(0, ranked[0]?.score ?? 0);
  const personaSummary = buildPersonaSummary(input);

  const draft: RecommendationResult = {
    prescriptionType,
    personaSummary,
    headline: buildHeadline(input, prescriptionType),
    primaryAction: buildPrimaryAction(primary, prescriptionType),
    summary: buildSummary(input, citySignal, primary, prescriptionType),
    todayBrief: buildTodayBrief(citySignal, prescriptionType),
    reasons: buildReasons(input, citySignal, primary, prescriptionType),
    actionPlan: buildActionPlan(primary, citySignal, prescriptionType),
    shareMessage: buildShareMessage(primary, prescriptionType),
    matchScore,
    recommendationTone: `${prescriptionLabels[prescriptionType]} · ${personaSummary}`,
    citySignal,
    suggestedPrograms,
    sourceNotes: buildSourceNotes(primary, citySignal),
    dataStatus: [programCatalogStatus, citySignalStatus],
    guardianGuide: buildGuardianGuide(primary, prescriptionType),
    workerGuide: buildWorkerGuide(primary, prescriptionType),
    aiAssist: {
      enabled: false,
      mode: "fallback",
      model: null,
      generatedFields: [],
      note: "AI 보강 전 기본 문구를 사용했습니다."
    },
    publicValue:
      "서울시가 이미 보유한 복지·문화·예약 데이터를 행동 추천으로 바꿔, 고립위험군의 첫 외출과 첫 연결 가능성을 높입니다.",
    serviceWhy:
      "후보 탐색은 서울 열린데이터광장, 오늘의 이동 판단은 공공데이터포털로 분리해 데이터 역할과 사용자 가치를 함께 설명합니다."
  };

  const aiNarration = await generateAiNarration(input, draft);

  return {
    ...draft,
    summary: aiNarration.summary,
    shareMessage: aiNarration.shareMessage,
    guardianGuide: aiNarration.guardianGuide,
    workerGuide: aiNarration.workerGuide,
    publicValue: aiNarration.publicValue,
    aiAssist: aiNarration.aiAssist
  };
}
