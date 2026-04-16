import { getEnv } from "../config/env.js";
import { RecommendationRequest, RecommendationResult } from "../types.js";

type AiNarrationResult = Pick<
  RecommendationResult,
  "summary" | "shareMessage" | "guardianGuide" | "workerGuide" | "publicValue"
> & {
  aiAssist: RecommendationResult["aiAssist"];
};

type OpenAiJsonResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

function buildSystemPrompt() {
  return [
    "You are helping generate Korean care-coordination language for an AI social connection platform called Itda Seoul.",
    "Keep outputs in natural Korean.",
    "Do not invent medical claims.",
    "Do not mention model limitations or internal scoring.",
    "Use supportive, low-burden wording for seniors, guardians, and welfare workers.",
    "Return strict JSON only."
  ].join(" ");
}

function buildUserPrompt(input: RecommendationRequest, draft: RecommendationResult) {
  return JSON.stringify(
    {
      task: "Refine the narrative copy for the recommendation result.",
      input,
      draft: {
        prescriptionType: draft.prescriptionType,
        personaSummary: draft.personaSummary,
        headline: draft.headline,
        primaryAction: draft.primaryAction,
        summary: draft.summary,
        todayBrief: draft.todayBrief,
        reasons: draft.reasons,
        actionPlan: draft.actionPlan,
        shareMessage: draft.shareMessage,
        publicValue: draft.publicValue,
        suggestedPrograms: draft.suggestedPrograms.map((program) => ({
          title: program.title,
          category: program.category,
          district: program.district,
          place: program.place,
          summary: program.summary
        })),
        citySignal: {
          district: draft.citySignal.district,
          weatherLabel: draft.citySignal.weatherLabel,
          airQualityLabel: draft.citySignal.airQualityLabel,
          advice: draft.citySignal.advice
        }
      },
      responseShape: {
        summary: "2~3 sentence Korean summary for the main recommendation card",
        shareMessage: "Korean message for a guardian or family messenger share",
        guardianGuide: "2~3 sentence Korean guidance for how a guardian should explain and accompany the first outing",
        workerGuide: "2~3 sentence Korean case-worker check-in script and next follow-up action",
        publicValue: "1~2 sentence Korean public-value statement"
      }
    },
    null,
    2
  );
}

function extractOutputText(payload: OpenAiJsonResponse) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const chunks =
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .filter((item) => item.type === "output_text" && typeof item.text === "string")
      .map((item) => item.text!.trim())
      .filter(Boolean) ?? [];

  return chunks.join("\n").trim();
}

function fallbackNarration(draft: RecommendationResult, note: string): AiNarrationResult {
  return {
    summary: draft.summary,
    shareMessage: draft.shareMessage,
    guardianGuide:
      draft.prescriptionType === "guardian"
        ? "보호자와 함께 가는 첫 일정으로 설명하고, 이동 부담이 적은 한 번의 참여만 목표로 안내해 주세요."
        : "처음부터 많은 활동을 권하기보다 부담이 낮은 일정 하나만 고르고, 참여 전날 다시 한 번 확인해 주세요.",
    workerGuide:
      "대상자에게는 이번 주 한 번의 참여만 목표라고 설명하고, 미참여 시에는 상담 연결 또는 더 가까운 대안 프로그램으로 재추천해 주세요.",
    publicValue: draft.publicValue,
    aiAssist: {
      enabled: false,
      mode: "fallback",
      model: null,
      generatedFields: [],
      note
    }
  };
}

export async function generateAiNarration(
  input: RecommendationRequest,
  draft: RecommendationResult
): Promise<AiNarrationResult> {
  const env = getEnv();

  if (!env.openAiApiKey) {
    return fallbackNarration(draft, "OPENAI_API_KEY가 없어 규칙 기반 문구를 사용했습니다.");
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.openAiApiKey}`
      },
      body: JSON.stringify({
        model: env.openAiModel,
        store: false,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: buildSystemPrompt()
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: buildUserPrompt(input, draft)
              }
            ]
          }
        ],
        text: {
          format: {
            type: "json_object"
          }
        }
      })
    });

    if (!response.ok) {
      return fallbackNarration(draft, `OpenAI 응답 실패: ${response.status}`);
    }

    const payload = (await response.json()) as OpenAiJsonResponse;
    const outputText = extractOutputText(payload);

    if (!outputText) {
      return fallbackNarration(draft, "OpenAI 출력이 비어 있어 규칙 기반 문구를 사용했습니다.");
    }

    const parsed = JSON.parse(outputText) as Partial<AiNarrationResult>;

    return {
      summary: parsed.summary?.trim() || draft.summary,
      shareMessage: parsed.shareMessage?.trim() || draft.shareMessage,
      guardianGuide: parsed.guardianGuide?.trim() || fallbackNarration(draft, "").guardianGuide,
      workerGuide: parsed.workerGuide?.trim() || fallbackNarration(draft, "").workerGuide,
      publicValue: parsed.publicValue?.trim() || draft.publicValue,
      aiAssist: {
        enabled: true,
        mode: "live",
        model: env.openAiModel,
        generatedFields: ["summary", "shareMessage", "guardianGuide", "workerGuide", "publicValue"],
        note: "OpenAI Responses API로 보호자/복지사용 문구를 생성했습니다."
      }
    };
  } catch (error) {
    return fallbackNarration(
      draft,
      error instanceof Error ? `OpenAI 호출 예외: ${error.message}` : "OpenAI 호출 예외가 발생했습니다."
    );
  }
}
