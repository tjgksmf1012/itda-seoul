import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mockPrograms } from "../data/mockPrograms.js";
import { ProgramItem } from "../types.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const curatedProgramsPath = path.resolve(currentDir, "../../../data/processed/programs.curated.json");

function loadCuratedPrograms(): ProgramItem[] | null {
  if (!fs.existsSync(curatedProgramsPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(curatedProgramsPath, "utf-8");
    const parsed = JSON.parse(raw) as ProgramItem[];
    return parsed.length ? parsed : null;
  } catch (_error) {
    return null;
  }
}

export function getPrograms(): ProgramItem[] {
  return loadCuratedPrograms() ?? mockPrograms;
}
