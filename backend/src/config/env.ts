const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  appOrigin: process.env.APP_ORIGIN ?? "*",
  databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db",
  seoulOpenApiKey: process.env.SEOUL_OPEN_API_KEY ?? "",
  seoulApiKeyByServiceName: {
    fcltOpenInfo_OWI: process.env.SEOUL_API_KEY_ELDERLY_WELFARE_FACILITIES ?? "",
    culturalEventInfo: process.env.SEOUL_API_KEY_CULTURAL_EVENTS ?? "",
    ListPublicReservationDetail: process.env.SEOUL_API_KEY_PUBLIC_SERVICE_RESERVATIONS ?? "",
    openApiInfo: process.env.SEOUL_API_KEY_OPEN_API_STATUS ?? ""
  },
  dataGoKrServiceKey: process.env.DATA_GO_KR_SERVICE_KEY ?? "",
  storageMode: process.env.STORAGE_MODE ?? "database",
  outreachProvider: process.env.OUTREACH_PROVIDER ?? "mock",
  solapiApiKey: process.env.SOLAPI_API_KEY ?? "",
  solapiApiSecret: process.env.SOLAPI_API_SECRET ?? "",
  solapiSenderNumber: process.env.SOLAPI_SENDER_NUMBER ?? "",
  solapiKakaoPfId: process.env.SOLAPI_KAKAO_PFID ?? "",
  solapiKakaoTemplateId: process.env.SOLAPI_KAKAO_TEMPLATE_ID ?? "",
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-4.1-mini"
};

export function getEnv() {
  return env;
}

export function resolveSeoulApiKey(serviceName?: string) {
  if (serviceName && serviceName in env.seoulApiKeyByServiceName) {
    const specificKey =
      env.seoulApiKeyByServiceName[
        serviceName as keyof typeof env.seoulApiKeyByServiceName
      ];

    if (specificKey) {
      return specificKey;
    }
  }

  return env.seoulOpenApiKey;
}
