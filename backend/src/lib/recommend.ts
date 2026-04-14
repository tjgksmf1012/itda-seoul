import { RecommendationRequest, RecommendationResult, ProgramItem } from "../types.js";
import { getPrograms } from "./programRepository.js";

function scoreProgram(program: ProgramItem, input: RecommendationRequest) {
  let score = 0;

  if (program.walkMinutes <= input.walkMinutes) {
    score += 30;
  } else {
    score -= Math.min(12, program.walkMinutes - input.walkMinutes);
  }

  if (program.free) {
    score += 10;
  }

  if (input.state === "low" && program.groupSize === "small") {
    score += 12;
  }

  if (input.state === "high" && program.guardianFriendly) {
    score += 10;
  }

  if (input.intent === "support" && program.category === "support") {
    score += 25;
  }

  if (input.intent === "program" && program.category === "reservation") {
    score += 18;
  }

  if (input.intent === "outing" && (program.category === "welfare" || program.category === "culture")) {
    score += 18;
  }

  const interestMatches = input.interestTags.filter((tag) => program.tags.includes(tag)).length;
  score += interestMatches * 8;

  if (input.persona === "worker") {
    score += program.category === "support" ? 6 : 4;
  }

  if (program.availabilityStatus === "ended") {
    score -= 100;
  } else if (program.availabilityStatus === "closing_soon") {
    score += 10;
  } else if (program.availabilityStatus === "upcoming") {
    score += 6;
  }

  return Math.max(score, 0);
}

function computeSupportLevel(input: RecommendationRequest, primary: ProgramItem | undefined) {
  if (!primary) {
    return "urgent" as const;
  }

  if (input.intent === "support" || input.state === "low") {
    return "guided" as const;
  }

  if (input.persona === "worker" && primary.category === "support") {
    return "urgent" as const;
  }

  return "light" as const;
}

function buildActionPlan(input: RecommendationRequest, primary: ProgramItem | undefined) {
  if (!primary) {
    return [
      "현재 조건으로는 적합한 후보가 적어 상담 연결을 먼저 검토합니다.",
      "도보 가능 거리나 관심사를 다시 확인합니다.",
      "보호자 또는 복지사가 대체 후보를 수동 검토합니다."
    ];
  }

  return [
    `${primary.title} 세부 정보를 확인합니다.`,
    `${primary.actionUrl.includes("http") ? "신청 링크" : "연결 경로"}를 열어 예약 가능 여부를 확인합니다.`,
    input.persona === "worker"
      ? "복지사가 대상자에게 설명할 문구와 다음 체크인 일정을 함께 기록합니다."
      : "보호자 또는 본인에게 공유 메시지를 보내고 참여 의사를 확인합니다."
  ];
}

export function buildRecommendation(input: RecommendationRequest): RecommendationResult {
  const ranked = [...getPrograms()]
    .filter((program) => program.availabilityStatus !== "ended")
    .map((program) => ({
      program,
      score: scoreProgram(program, input)
    }))
    .sort((left, right) => right.score - left.score);

  const topPrograms = ranked.slice(0, 3).map((item) => item.program);
  const primary = topPrograms[0];
  const matchScore = ranked[0]?.score ?? 0;
  const supportLevel = computeSupportLevel(input, primary);

  const reasons = [
    `도보 가능 거리 ${input.walkMinutes}분과 현재 상태를 함께 반영했습니다.`,
    input.interestTags.length
      ? `선택한 관심사 ${input.interestTags.join(", ")}와 겹치는 활동을 우선 배치했습니다.`
      : "관심사 입력이 없어서 접근성과 실행 가능성을 더 크게 반영했습니다.",
    "만료된 후보는 제외하고, 일정이 임박했거나 바로 가능한 후보를 우선 반영했습니다."
  ];

  return {
    recommendationType: input.intent,
    primaryAction: primary ? primary.title : "추천 가능한 후보를 더 모아야 합니다.",
    summary: primary
      ? `${primary.title}을(를) 가장 우선 추천합니다. ${primary.summary}`
      : "현재 입력 기준으로는 우선순위 후보가 부족합니다.",
    shareMessage: primary
      ? `이번 주 추천은 ${primary.title}입니다. ${primary.summary} 신청 링크와 추천 이유를 함께 보냅니다.`
      : "현재 조건에 맞는 활동을 다시 탐색해 보겠습니다.",
    reasons,
    actionPlan: buildActionPlan(input, primary),
    checkInMessage: primary
      ? `${primary.title} 안내를 전달한 뒤 24시간 내 참여 의사를 다시 확인해 주세요.`
      : "후보 재탐색 후 다시 연락해 주세요.",
    supportLevel,
    matchScore,
    suggestedPrograms: topPrograms
  };
}
