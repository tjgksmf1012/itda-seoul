import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mockPrograms } from "../data/mockPrograms.js";
import { ProgramItem } from "../types.js";

type NormalizedProgram = {
  source?: string;
  title?: string;
  district?: string;
  place?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  actionUrl?: string;
  isFree?: boolean;
  tags?: string[];
};

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const normalizedProgramsPath = path.resolve(
  currentDir,
  "../../../data/processed/programs.normalized.json"
);

function mapCategory(source?: string): ProgramItem["category"] {
  if (!source) {
    return "reservation";
  }

  if (source.includes("welfare")) {
    return "welfare";
  }

  if (source.includes("culture")) {
    return "culture";
  }

  if (source.includes("support")) {
    return "support";
  }

  return "reservation";
}

function computeAvailabilityStatus(startDate?: string, endDate?: string): ProgramItem["availabilityStatus"] {
  if (!startDate && !endDate) {
    return "always";
  }

  const now = new Date();
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (end && !Number.isNaN(end.getTime()) && end < now) {
    return "ended";
  }

  if (end && !Number.isNaN(end.getTime())) {
    const daysUntilEnd = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilEnd <= 3) {
      return "closing_soon";
    }
  }

  if (start && !Number.isNaN(start.getTime()) && start > now) {
    return "upcoming";
  }

  return "always";
}

function mapNormalizedPrograms(items: NormalizedProgram[]): ProgramItem[] {
  return items
    .filter((item) => item.title)
    .slice(0, 50)
    .map((item, index) => ({
      id: `normalized-${index + 1}`,
      title: item.title ?? "제목 미상",
      category: mapCategory(item.source),
      district: item.district || "서울시",
      place: item.place || item.district || "서울시",
      startDate: item.startDate,
      endDate: item.endDate,
      availabilityStatus: computeAvailabilityStatus(item.startDate, item.endDate),
      walkMinutes: 15,
      free: Boolean(item.isFree),
      guardianFriendly: true,
      groupSize: "small",
      timeSlot: "any",
      tags: item.tags ?? [],
      barrierSupport: ["정규화 데이터 기반 후보"],
      summary: item.summary || "정규화된 공공데이터 후보",
      actionUrl: item.actionUrl || "https://yeyak.seoul.go.kr"
    }));
}

export function getPrograms(): ProgramItem[] {
  if (!fs.existsSync(normalizedProgramsPath)) {
    return mockPrograms;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(normalizedProgramsPath, "utf-8")) as NormalizedProgram[];
    const items = mapNormalizedPrograms(parsed);
    return items.length ? items : mockPrograms;
  } catch (_error) {
    return mockPrograms;
  }
}
