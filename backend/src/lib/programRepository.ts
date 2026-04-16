import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mockPrograms } from "../data/mockPrograms.js";
import { ProgramItem, RuntimeDataStatus } from "../types.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const liveProgramsPath = path.resolve(currentDir, "../../../data/processed/programs.live.json");
const liveProgramsMetaPath = path.resolve(currentDir, "../../../data/processed/programs.live.meta.json");
const curatedProgramsPath = path.resolve(currentDir, "../../../data/processed/programs.curated.json");

type ProgramCatalog = {
  items: ProgramItem[];
  status: RuntimeDataStatus;
};

type ProgramCatalogMeta = {
  generatedAt?: string;
  datasetNames?: string[];
};

function readPrograms(candidatePath: string): ProgramItem[] | null {
  if (!fs.existsSync(candidatePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(candidatePath, "utf-8");
    const parsed = JSON.parse(raw) as ProgramItem[];
    return parsed.length ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function readProgramMeta(candidatePath: string): ProgramCatalogMeta | null {
  if (!fs.existsSync(candidatePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(candidatePath, "utf-8");
    return JSON.parse(raw) as ProgramCatalogMeta;
  } catch (_error) {
    return null;
  }
}

function uniqueDatasetNames(items: ProgramItem[]) {
  return [...new Set(items.map((item) => item.datasetName))];
}

function getFileTimestamp(candidatePath: string): string | null {
  try {
    return fs.statSync(candidatePath).mtime.toISOString();
  } catch (_error) {
    return null;
  }
}

function buildStatus(
  items: ProgramItem[],
  loadedFrom: RuntimeDataStatus["loadedFrom"],
  updatedAt: string | null,
  datasetNames: string[],
  note: string
): RuntimeDataStatus {
  return {
    portal: "seoul-open-data",
    loadedFrom,
    itemCount: items.length,
    updatedAt,
    datasetNames,
    note
  };
}

function loadProgramCatalog(): ProgramCatalog {
  const livePrograms = readPrograms(liveProgramsPath);

  if (livePrograms) {
    const liveMeta = readProgramMeta(liveProgramsMetaPath);
    return {
      items: livePrograms,
      status: buildStatus(
        livePrograms,
        "live",
        liveMeta?.generatedAt ?? getFileTimestamp(liveProgramsPath),
        liveMeta?.datasetNames?.length ? liveMeta.datasetNames : uniqueDatasetNames(livePrograms),
        "서울 열린데이터광장 수집 결과를 정규화한 라이브 후보군입니다."
      )
    };
  }

  const curatedPrograms = readPrograms(curatedProgramsPath);

  if (curatedPrograms) {
    return {
      items: curatedPrograms,
      status: buildStatus(
        curatedPrograms,
        "sample",
        getFileTimestamp(curatedProgramsPath),
        uniqueDatasetNames(curatedPrograms),
        "발표용 샘플 후보군으로 동작하며, 라이브 파일이 있으면 자동으로 대체됩니다."
      )
    };
  }

  return {
    items: mockPrograms,
    status: buildStatus(
      mockPrograms,
      "mock",
      null,
      uniqueDatasetNames(mockPrograms),
      "앱 내 fallback 데이터로 동작합니다."
    )
  };
}

export function getPrograms(): ProgramItem[] {
  return loadProgramCatalog().items;
}

export function getProgramCatalogStatus(): RuntimeDataStatus {
  return loadProgramCatalog().status;
}
