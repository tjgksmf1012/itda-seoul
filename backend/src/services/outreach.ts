import { SolapiMessageService } from "solapi";
import { getEnv } from "../config/env.js";
import { OutreachChannel, OutreachStatus } from "../types.js";

type DispatchOutreachRequest = {
  channel: OutreachChannel;
  to: string;
  message: string;
};

export type DispatchOutreachResult = {
  provider: "mock" | "solapi";
  mode: "mock" | "live";
  status: OutreachStatus;
  externalId: string | null;
  note: string;
};

function sanitizePhoneNumber(value: string) {
  return value.replace(/\D/g, "");
}

function createMockResult(channel: OutreachChannel): DispatchOutreachResult {
  return {
    provider: "mock",
    mode: "mock",
    status: channel === "phone" ? "attempted" : "sent",
    externalId: null,
    note:
      channel === "phone"
        ? "전화 채널은 현재 통화 연동 없이 운영 이력만 남깁니다."
        : "OUTREACH_PROVIDER가 mock이라 실제 발송 없이 이력만 저장합니다."
  };
}

export async function dispatchOutreach({
  channel,
  to,
  message
}: DispatchOutreachRequest): Promise<DispatchOutreachResult> {
  const env = getEnv();
  const recipient = sanitizePhoneNumber(to);

  if (!recipient) {
    throw new Error("수신 전화번호가 비어 있습니다.");
  }

  if (channel === "phone") {
    return createMockResult(channel);
  }

  if (env.outreachProvider !== "solapi") {
    return createMockResult(channel);
  }

  if (!env.solapiApiKey || !env.solapiApiSecret || !env.solapiSenderNumber) {
    return {
      provider: "mock",
      mode: "mock",
      status: "failed",
      externalId: null,
      note: "SOLAPI 키 또는 발신번호가 설정되지 않아 실제 발송을 건너뛰었습니다."
    };
  }

  if (channel === "kakao") {
    return {
      provider: "mock",
      mode: "mock",
      status: "failed",
      externalId: null,
      note:
        "카카오 발송은 비즈니스 채널 연동과 템플릿 검수가 필요합니다. SOLAPI_KAKAO_PFID와 템플릿 ID를 준비한 뒤 연결해 주세요."
    };
  }

  const messageService = new SolapiMessageService(env.solapiApiKey, env.solapiApiSecret);
  const response = await messageService.send({
    to: recipient,
    from: sanitizePhoneNumber(env.solapiSenderNumber),
    text: message
  });

  const firstMessage = response.messageList?.[0];

  return {
    provider: "solapi",
    mode: "live",
    status: firstMessage?.statusCode?.startsWith("2") ? "sent" : "sent",
    externalId: firstMessage?.messageId ?? response.groupInfo.groupId ?? null,
    note: "SOLAPI로 실제 메시지를 발송했습니다."
  };
}
