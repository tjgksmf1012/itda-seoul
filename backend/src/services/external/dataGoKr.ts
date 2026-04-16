import { getEnv } from "../../config/env.js";

export async function fetchDataGoKr(url: string) {
  const { dataGoKrServiceKey } = getEnv();

  if (!dataGoKrServiceKey) {
    throw new Error("DATA_GO_KR_SERVICE_KEY is missing");
  }

  const finalUrl = new URL(url);
  finalUrl.searchParams.set("serviceKey", dataGoKrServiceKey);

  const response = await fetch(finalUrl);

  if (!response.ok) {
    throw new Error(`data.go.kr request failed: ${response.status}`);
  }

  return response.text();
}
