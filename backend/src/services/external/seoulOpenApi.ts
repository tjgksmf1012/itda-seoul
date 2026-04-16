import { resolveSeoulApiKey } from "../../config/env.js";

function buildBaseUrl(serviceName: string, startIndex = 1, endIndex = 1000) {
  const seoulOpenApiKey = resolveSeoulApiKey(serviceName);

  if (!seoulOpenApiKey) {
    return null;
  }

  return `http://openapi.seoul.go.kr:8088/${seoulOpenApiKey}/json/${serviceName}/${startIndex}/${endIndex}/`;
}

export async function fetchSeoulDataset(serviceName: string, startIndex = 1, endIndex = 1000) {
  const url = buildBaseUrl(serviceName, startIndex, endIndex);

  if (!url) {
    throw new Error(`No Seoul Open API key configured for service: ${serviceName}`);
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`seoul api request failed: ${response.status}`);
  }

  return response.json();
}
