import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mockCitySignals } from "../data/mockCitySignals.js";
import { CitySignal } from "../types.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const liveSignalsPath = path.resolve(currentDir, "../../../data/processed/city-signals.live.json");
const citySignalsPath = path.resolve(currentDir, "../../../data/processed/city-signals.sample.json");

function loadSignals(): CitySignal[] {
  const candidates = [liveSignalsPath, citySignalsPath];

  for (const candidatePath of candidates) {
    if (!fs.existsSync(candidatePath)) {
      continue;
    }

    try {
      const raw = fs.readFileSync(candidatePath, "utf-8");
      const parsed = JSON.parse(raw) as CitySignal[];
      if (parsed.length) {
        return parsed;
      }
    } catch (_error) {
      continue;
    }
  }

  return mockCitySignals;
}

export function getCitySignal(district: string): CitySignal {
  const signals = loadSignals();
  const exactMatch = signals.find((item) => item.district === district);

  if (exactMatch) {
    return exactMatch;
  }

  return signals[0] ?? mockCitySignals[0];
}
