export type PersonaKey = "elder" | "child" | "worker";
export type IntentKey = "outing" | "program" | "support";
export type StateKey = "low" | "normal" | "high";

export type RecommendationSeed = {
  title: string;
  summary: string;
  reasons: [string, string][];
};

export const interestOptions = [
  "건강",
  "문화",
  "대화",
  "산책",
  "예술",
  "상담"
] as const;

export const personaLabels: Record<PersonaKey, string> = {
  elder: "혼자 지내는 78세",
  child: "부모님을 챙기는 자녀",
  worker: "복지사 · 방문요양사"
};

export const intentLabels: Record<IntentKey, string> = {
  outing: "다음 외출",
  program: "다음 참여",
  support: "다음 연결"
};

export const stateLabels: Record<StateKey, string> = {
  low: "외출 의지 낮음",
  normal: "보통",
  high: "보호자 동행 가능"
};

export const stateAdjustments: Record<StateKey, string> = {
  low: "외출 의지가 낮아 가장 쉬운 1개 행동을 앞세웠습니다.",
  normal: "현재 상태를 기준으로 참여 가능성과 접근성을 균형 있게 반영했습니다.",
  high: "보호자 동행 가능성을 반영해 선택 폭을 넓히고 신청 가능 후보를 함께 보여줍니다."
};

export const personaPresets: Record<PersonaKey, RecommendationSeed & { walk: number }> = {
  elder: {
    walk: 10,
    title: "근처 복지관 소규모 프로그램 추천",
    summary: "도보 10분 이내, 무료, 소규모 참여 중심. 첫 외출의 심리적 장벽이 낮은 선택입니다.",
    reasons: [
      ["다음 외출 제안", "최근 외출이 거의 없는 사용자에게는 부담이 낮은 가까운 활동을 먼저 추천합니다."],
      ["행동 전환 중심", "추천에서 끝나지 않고 바로 신청 가능한 링크가 있는 후보를 우선 배치합니다."],
      ["보호자 공유", "추천 이유와 참여 난이도를 함께 전달해 보호자 설득과 동행 결정을 돕습니다."]
    ]
  },
  child: {
    walk: 15,
    title: "이번 주 첫 외출 후보 3개 카드 추천",
    summary: "가까운 문화행사와 복지관 프로그램을 조합해 부모님이 가볍게 시작할 수 있는 선택지를 제안합니다.",
    reasons: [
      ["가벼운 시작", "상담보다 가볍게 나갈 수 있는 활동을 우선 추천해 참여 저항을 낮춥니다."],
      ["선택지 압축", "여러 정보를 나열하지 않고 실제 가능한 후보 3개로 줄여 보호자 판단을 돕습니다."],
      ["바로 전달 가능", "카카오톡이나 문자로 바로 보낼 수 있는 요약 문구를 함께 생성합니다."]
    ]
  },
  worker: {
    walk: 12,
    title: "대상자별 재추천 리스트 자동 생성",
    summary: "참여 이력과 외출 가능 수준을 반영해 복지사가 바로 설명하고 전달할 수 있는 추천안을 만듭니다.",
    reasons: [
      ["운영 효율화", "프로그램 탐색, 링크 전달, 다음 활동 제안을 반복하는 현장 업무를 줄여줍니다."],
      ["개별 맞춤", "대상자별 관심사와 선호 시간대를 반영해 동일한 추천이 반복되지 않도록 합니다."],
      ["사후 관리", "미참여 지속 대상자에게는 가장 쉬운 다음 행동부터 다시 제안합니다."]
    ]
  }
};
