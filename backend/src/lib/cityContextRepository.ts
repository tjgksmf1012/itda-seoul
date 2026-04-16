import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mockCitySignals } from "../data/mockCitySignals.js";
import { CitySignal, RuntimeDataStatus } from "../types.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const liveSignalsPath = path.resolve(currentDir, "../../../data/processed/city-signals.live.json");
const citySignalsPath = path.resolve(currentDir, "../../../data/processed/city-signals.sample.json");

type SignalCatalog = {
  items: CitySignal[];
  status: RuntimeDataStatus;
};

function readSignals(candidatePath: string): CitySignal[] | null {
  if (!fs.existsSync(candidatePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(candidatePath, "utf-8");
    const parsed = JSON.parse(raw) as CitySignal[];
    if (parsed.length) {
      return parsed;
    }
  } catch (_error) {
    return null;
  }

  return null;
}

function uniqueDatasetNames(signals: CitySignal[]) {
  return [...new Set(signals.flatMap((item) => item.datasets))];
}

function latestTimestamp(signals: CitySignal[]) {
  const timestamps = signals
    .map((item) => Date.parse(item.updatedAt))
    .filter((value) => Number.isFinite(value));

  if (!timestamps.length) {
    return null;
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function buildStatus(
  items: CitySignal[],
  loadedFrom: RuntimeDataStatus["loadedFrom"],
  note: string
): RuntimeDataStatus {
  return {
    portal: "data-go-kr",
    loadedFrom,
    itemCount: items.length,
    updatedAt: latestTimestamp(items),
    datasetNames: uniqueDatasetNames(items),
    note
  };
}

function loadSignalCatalog(): SignalCatalog {
  const candidates = [liveSignalsPath, citySignalsPath];

  for (const [index, candidatePath] of candidates.entries()) {
    const parsed = readSignals(candidatePath);
    if (parsed) {
      return {
        items: parsed,
        status: buildStatus(
          parsed,
          index === 0 ? "live" : "sample",
          index === 0
            ? "공공데이터포털 실시간 시그널을 우선 사용합니다."
            : "발표용 샘플 시그널로 동작하며, 라이브 파일이 있으면 자동으로 대체됩니다."
        )
      };
    }
  }

  return {
    items: mockCitySignals,
    status: buildStatus(mockCitySignals, "mock", "앱 내 fallback 시그널로 동작합니다.")
  };
}

export function getCitySignal(district: string): CitySignal {
  const signals = loadSignalCatalog().items;
  const exactMatch = signals.find((item) => item.district === district);

  if (exactMatch) {
    return exactMatch;
  }

  return signals[0] ?? mockCitySignals[0];
}

export function getCitySignalCatalogStatus(): RuntimeDataStatus {
  return loadSignalCatalog().status;
}
