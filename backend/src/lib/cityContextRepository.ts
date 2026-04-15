import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mockCitySignals } from "../data/mockCitySignals.js";
import { CitySignal } from "../types.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const citySignalsPath = path.resolve(currentDir, "../../../data/processed/city-signals.sample.json");

function loadSignals(): CitySignal[] {
  if (!fs.existsSync(citySignalsPath)) {
    return mockCitySignals;
  }

  try {
    const raw = fs.readFileSync(citySignalsPath, "utf-8");
    const parsed = JSON.parse(raw) as CitySignal[];
    return parsed.length ? parsed : mockCitySignals;
  } catch (_error) {
    return mockCitySignals;
  }
}

export function getCitySignal(district: string): CitySignal {
  const signals = loadSignals();
  const exactMatch = signals.find((item) => item.district === district);

  if (exactMatch) {
    return exactMatch;
  }

  return signals[0] ?? mockCitySignals[0];
}
