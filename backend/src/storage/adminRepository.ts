import { mockCases, mockHistory } from "../data/mockCases.js";
import { getEnv } from "../config/env.js";
import {
  AdminCase,
  AdminDashboard,
  AdminHistoryItem,
  CaseStatus,
  IntentKey,
  OutreachChannel,
  OutreachStatus,
  OutreachTarget,
  ParticipationReasonCode,
  PersonaKey,
  StateKey
} from "../types.js";
import { getPrismaClient } from "./prisma.js";

const env = getEnv();

const statusLabelMap: Record<CaseStatus, string> = {
  pending: "대기",
  contacted: "연락 완료",
  scheduled: "예약 진행",
  completed: "참여 완료"
};

const memoryCases = structuredClone(mockCases);
const memoryHistory = structuredClone(mockHistory);

let seededPromise: Promise<void> | null = null;
let tablesReadyPromise: Promise<void> | null = null;

function isDatabaseMode() {
  return env.storageMode === "database";
}

function buildSummary(cases: AdminCase[]): AdminDashboard["summary"] {
  return {
    totalCases: cases.length,
    needsAttention: cases.filter((item) => item.riskLevel === "high").length,
    scheduledThisWeek: cases.filter((item) => item.workflowStatus === "scheduled").length,
    completedThisWeek: cases.filter((item) => item.workflowStatus === "completed").length
  };
}

function getSeoulDayKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}

function buildFollowUpInsights(cases: AdminCase[]): AdminDashboard["followUpInsights"] {
  const now = new Date();
  const todayKey = getSeoulDayKey(now);
  const assigneeMap = new Map<
    string,
    {
      assignee: string;
      total: number;
      overdue: number;
      dueToday: number;
    }
  >();
  const urgentCaseIds = new Set<string>();
  let plannedCount = 0;
  let overdueCount = 0;
  let dueTodayCount = 0;
  let upcomingCount = 0;
  let unplannedCount = 0;

  for (const item of cases) {
    const assignee = item.assignee.trim() || "미지정";
    const assigneeEntry = assigneeMap.get(assignee) ?? {
      assignee,
      total: 0,
      overdue: 0,
      dueToday: 0
    };

    assigneeEntry.total += 1;

    if (!item.nextContactAt) {
      unplannedCount += 1;
      assigneeMap.set(assignee, assigneeEntry);
      continue;
    }

    plannedCount += 1;
    const nextContactDate = new Date(item.nextContactAt);

    if (Number.isNaN(nextContactDate.getTime())) {
      unplannedCount += 1;
      assigneeMap.set(assignee, assigneeEntry);
      continue;
    }

    const nextContactDayKey = getSeoulDayKey(nextContactDate);

    if (nextContactDate.getTime() < now.getTime()) {
      overdueCount += 1;
      urgentCaseIds.add(item.id);
      assigneeEntry.overdue += 1;
    } else if (nextContactDayKey === todayKey) {
      dueTodayCount += 1;
      urgentCaseIds.add(item.id);
      assigneeEntry.dueToday += 1;
    } else {
      upcomingCount += 1;
    }

    assigneeMap.set(assignee, assigneeEntry);
  }

  return {
    plannedCount,
    overdueCount,
    dueTodayCount,
    upcomingCount,
    unplannedCount,
    urgentCaseIds: [...urgentCaseIds],
    byAssignee: [...assigneeMap.values()].sort((left, right) => {
      const urgencyDelta = right.overdue + right.dueToday - (left.overdue + left.dueToday);
      if (urgencyDelta !== 0) {
        return urgencyDelta;
      }

      return right.total - left.total;
    })
  };
}

function buildPerformanceMetrics(
  historyItems: AdminHistoryItem[],
  cases: AdminCase[]
): AdminDashboard["performanceMetrics"] {
  const recommendationItems = historyItems.filter((item) => item.type === "recommendation");
  const shareItems = historyItems.filter((item) => item.type === "share");
  const outreachItems = historyItems.filter((item) => item.type === "outreach");
  const connectedOutreachItems = outreachItems.filter((item) => item.outreachStatus === "connected");
  const completedCaseIds = new Set(
    cases.filter((item) => item.workflowStatus === "completed").map((item) => item.id)
  );
  const sharedCaseIds = new Set(shareItems.map((item) => item.caseId));
  const playbookCaseIds = new Set(
    recommendationItems.filter((item) => item.summary.includes("재추천")).map((item) => item.caseId)
  );
  const recommendationCount = recommendationItems.length;
  const shareCount = shareItems.length;
  const outreachCount = outreachItems.length;
  const completedCases = completedCaseIds.size;
  const shareCoverageRate =
    recommendationCount > 0 ? Math.round((shareCount / recommendationCount) * 100) : 0;
  const outreachCoverageRate =
    cases.length > 0 ? Math.round((new Set(outreachItems.map((item) => item.caseId)).size / cases.length) * 100) : 0;
  const completionRate = cases.length > 0 ? Math.round((completedCases / cases.length) * 100) : 0;

  return {
    recommendationLogs: recommendationCount,
    shareLogs: shareCount,
    outreachLogs: outreachCount,
    connectedOutreachLogs: connectedOutreachItems.length,
    outreachCoverageRate,
    playbookRecommendationLogs: playbookCaseIds.size,
    completedCases,
    shareCoverageRate,
    completionRate,
    shareToCompletionCases: [...sharedCaseIds].filter((caseId) => completedCaseIds.has(caseId)).length,
    playbookRecoveredCases: [...playbookCaseIds].filter((caseId) => completedCaseIds.has(caseId)).length
  };
}

function buildParticipationInsights(
  historyItems: AdminHistoryItem[],
  cases: AdminCase[]
): AdminDashboard["participationInsights"] {
  const participationItems = historyItems.filter((item) => item.type === "participation");
  const counts = new Map<ParticipationReasonCode, number>();
  const caseMap = new Map(cases.map((item) => [item.id, item]));
  const districtCounts = new Map<string, { district: string; reasonCode: ParticipationReasonCode; count: number }>();
  const personaCounts = new Map<string, { persona: PersonaKey; reasonCode: ParticipationReasonCode; count: number }>();

  for (const item of participationItems) {
    if (!item.reasonCode) {
      continue;
    }

    counts.set(item.reasonCode, (counts.get(item.reasonCode) ?? 0) + 1);

    const adminCase = caseMap.get(item.caseId);

    if (adminCase) {
      const districtKey = `${adminCase.district}:${item.reasonCode}`;
      const personaKey = `${adminCase.profilePreset.persona}:${item.reasonCode}`;

      districtCounts.set(districtKey, {
        district: adminCase.district,
        reasonCode: item.reasonCode,
        count: (districtCounts.get(districtKey)?.count ?? 0) + 1
      });

      personaCounts.set(personaKey, {
        persona: adminCase.profilePreset.persona,
        reasonCode: item.reasonCode,
        count: (personaCounts.get(personaKey)?.count ?? 0) + 1
      });
    }
  }

  const playbookMap: Record<
    ParticipationReasonCode,
    {
      title: string;
      action: string;
    }
  > = {
    mobility: {
      title: "이동 부담 대응",
      action: "도보 거리와 이동 피로를 낮춘 실내 프로그램, 전화 안부 연결, 보호자 동행 옵션을 먼저 제안합니다."
    },
    schedule: {
      title: "시간대 재조정",
      action: "불참이 많았던 시간대를 피하고 평일 오전 또는 주말 오후처럼 실제 가능한 슬롯으로 다시 추천합니다."
    },
    interest: {
      title: "관심사 재탐색",
      action: "최근 반응이 낮은 카테고리를 줄이고 문화·건강·소규모 모임 중 선호가 높은 축으로 다시 좁힙니다."
    },
    guardian: {
      title: "보호자 부재 대응",
      action: "보호자 없이도 참여 가능한 단독 프로그램이나 기관 체크인형 연결처를 우선 배치합니다."
    },
    health: {
      title: "건강 상태 고려",
      action: "외출형 처방보다 상담, 안부 확인, 실내 저강도 프로그램을 먼저 두고 회복 이후 외출을 제안합니다."
    },
    other: {
      title: "기타 사유 확인",
      action: "자유 메모를 다시 확인해 가장 가까운 원인을 정리하고, 다음 추천 전 체크인 문구를 한 번 더 보완합니다."
    }
  };

  const topReasons = [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([reasonCode, count]) => ({
      reasonCode,
      count
    }));

  return {
    totalLogged: participationItems.length,
    topReasons,
    playbooks: topReasons.map((item) => ({
      reasonCode: item.reasonCode,
      title: playbookMap[item.reasonCode].title,
      action: playbookMap[item.reasonCode].action
    })),
    byDistrict: [...districtCounts.values()].sort((left, right) => right.count - left.count).slice(0, 3),
    byPersona: [...personaCounts.values()].sort((left, right) => right.count - left.count).slice(0, 3)
  };
}

function createHistorySummary(status: CaseStatus, note?: string) {
  const label = statusLabelMap[status];

  return note?.trim()
    ? `${label} 상태로 변경했습니다. 메모: ${note.trim()}`
    : `${label} 상태로 변경했습니다.`;
}

function createHistoryId() {
  return `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createPlanningSummary(assignee: string, nextContactAt?: string | null, note?: string) {
  const parts = [
    assignee.trim() ? `담당자: ${assignee.trim()}` : "담당자 미지정",
    nextContactAt ? `다음 연락: ${new Date(nextContactAt).toISOString()}` : "다음 연락 미정"
  ];

  if (note?.trim()) {
    parts.push(`메모: ${note.trim()}`);
  }

  return parts.join(" / ");
}

function serializeTags(tags: string[]) {
  return JSON.stringify(tags);
}

function deserializeTags(tagsJson: string) {
  try {
    const parsed = JSON.parse(tagsJson) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch (_error) {
    return [];
  }
}

function serializeHistoryMetadata(
  reasonCode?: ParticipationReasonCode,
  outreachTarget?: OutreachTarget,
  outreachChannel?: OutreachChannel,
  outreachStatus?: OutreachStatus
) {
  const payload = {
    ...(reasonCode ? { reasonCode } : {}),
    ...(outreachTarget ? { outreachTarget } : {}),
    ...(outreachChannel ? { outreachChannel } : {}),
    ...(outreachStatus ? { outreachStatus } : {})
  };

  return Object.keys(payload).length > 0 ? JSON.stringify(payload) : null;
}

function deserializeHistoryMetadata(metadataJson: string | null) {
  if (!metadataJson) {
    return {};
  }

  try {
    const parsed = JSON.parse(metadataJson) as {
      reasonCode?: ParticipationReasonCode;
      outreachTarget?: OutreachTarget;
      outreachChannel?: OutreachChannel;
      outreachStatus?: OutreachStatus;
    };
    return {
      reasonCode: parsed.reasonCode,
      outreachTarget: parsed.outreachTarget,
      outreachChannel: parsed.outreachChannel,
      outreachStatus: parsed.outreachStatus
    };
  } catch (_error) {
    return {};
  }
}

type DbAdminCase = {
  id: string;
  name: string;
  ageLabel: string;
  district: string;
  participantPhone: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  assignee: string | null;
  nextContactAt: string | Date | null;
  riskLevel: string;
  workflowStatus: string;
  lastParticipationDays: number;
  preferredTime: string;
  mobilitySummary: string;
  nextRecommendation: string;
  statusTagsJson: string;
  profilePersona: string;
  profileIntent: string;
  profileState: string;
  profileWalkMinutes: number;
  createdAt: string | Date;
  updatedAt: string | Date;
};
type DbAdminHistoryRow = {
  id: string;
  caseId: string;
  type: string;
  summary: string;
  metadataJson: string | null;
  createdAt: string | Date;
};

function mapCaseFromDb(record: DbAdminCase): AdminCase {
  return {
    id: record.id,
    name: record.name,
    ageLabel: record.ageLabel,
    district: record.district,
    participantPhone: record.participantPhone ?? "",
    guardianName: record.guardianName ?? null,
    guardianPhone: record.guardianPhone ?? null,
    assignee: record.assignee ?? "",
    nextContactAt:
      record.nextContactAt instanceof Date
        ? record.nextContactAt.toISOString()
        : record.nextContactAt
          ? new Date(record.nextContactAt).toISOString()
          : null,
    riskLevel: record.riskLevel as AdminCase["riskLevel"],
    workflowStatus: record.workflowStatus as CaseStatus,
    lastParticipationDays: record.lastParticipationDays,
    preferredTime: record.preferredTime,
    mobilitySummary: record.mobilitySummary,
    nextRecommendation: record.nextRecommendation,
    statusTags: deserializeTags(record.statusTagsJson),
    profilePreset: {
      persona: record.profilePersona as PersonaKey,
      intent: record.profileIntent as IntentKey,
      state: record.profileState as StateKey,
      walkMinutes: record.profileWalkMinutes
    }
  };
}

function mapHistoryFromDb(record: DbAdminHistoryRow): AdminHistoryItem {
  const metadata = deserializeHistoryMetadata(record.metadataJson);

  return {
    id: record.id,
    caseId: record.caseId,
    type: record.type as AdminHistoryItem["type"],
    createdAt:
      record.createdAt instanceof Date ? record.createdAt.toISOString() : new Date(record.createdAt).toISOString(),
    summary: record.summary,
    reasonCode: metadata.reasonCode,
    outreachTarget: metadata.outreachTarget,
    outreachChannel: metadata.outreachChannel,
    outreachStatus: metadata.outreachStatus
  };
}

async function ensureSeeded() {
  if (!isDatabaseMode()) {
    return;
  }

  const prisma = getPrismaClient();

  if (!tablesReadyPromise) {
    tablesReadyPromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AdminCase" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "ageLabel" TEXT NOT NULL,
          "district" TEXT NOT NULL,
          "participantPhone" TEXT NOT NULL DEFAULT '',
          "guardianName" TEXT,
          "guardianPhone" TEXT,
          "assignee" TEXT NOT NULL DEFAULT '',
          "nextContactAt" DATETIME,
          "riskLevel" TEXT NOT NULL,
          "workflowStatus" TEXT NOT NULL DEFAULT 'pending',
          "lastParticipationDays" INTEGER NOT NULL,
          "preferredTime" TEXT NOT NULL,
          "mobilitySummary" TEXT NOT NULL,
          "nextRecommendation" TEXT NOT NULL,
          "statusTagsJson" TEXT NOT NULL,
          "profilePersona" TEXT NOT NULL,
          "profileIntent" TEXT NOT NULL,
          "profileState" TEXT NOT NULL,
          "profileWalkMinutes" INTEGER NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AdminHistory" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "caseId" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "summary" TEXT NOT NULL,
          "metadataJson" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("caseId") REFERENCES "AdminCase"("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);

      const caseColumns = (await prisma.$queryRawUnsafe(`
        PRAGMA table_info("AdminCase")
      `)) as Array<{ name?: string }>;

      if (!caseColumns.some((column) => column.name === "assignee")) {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "AdminCase"
          ADD COLUMN "assignee" TEXT NOT NULL DEFAULT ''
        `);
      }

      if (!caseColumns.some((column) => column.name === "participantPhone")) {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "AdminCase"
          ADD COLUMN "participantPhone" TEXT NOT NULL DEFAULT ''
        `);
      }

      if (!caseColumns.some((column) => column.name === "guardianName")) {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "AdminCase"
          ADD COLUMN "guardianName" TEXT
        `);
      }

      if (!caseColumns.some((column) => column.name === "guardianPhone")) {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "AdminCase"
          ADD COLUMN "guardianPhone" TEXT
        `);
      }

      if (!caseColumns.some((column) => column.name === "nextContactAt")) {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "AdminCase"
          ADD COLUMN "nextContactAt" DATETIME
        `);
      }

      const historyColumns = (await prisma.$queryRawUnsafe(`
        PRAGMA table_info("AdminHistory")
      `)) as Array<{ name?: string }>;

      if (!historyColumns.some((column) => column.name === "metadataJson")) {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "AdminHistory"
          ADD COLUMN "metadataJson" TEXT
        `);
      }

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "AdminHistory_caseId_createdAt_idx"
        ON "AdminHistory" ("caseId", "createdAt")
      `);
    })();
  }

  await tablesReadyPromise;

  if (!seededPromise) {
    seededPromise = (async () => {
      const count = await prisma.adminCase.count();

      if (count > 0) {
        for (const item of mockCases) {
          await prisma.$executeRawUnsafe(
            `UPDATE "AdminCase"
             SET
               "participantPhone" = CASE WHEN COALESCE("participantPhone", '') = '' THEN ? ELSE "participantPhone" END,
               "guardianName" = CASE WHEN COALESCE("guardianName", '') = '' THEN ? ELSE "guardianName" END,
               "guardianPhone" = CASE WHEN COALESCE("guardianPhone", '') = '' THEN ? ELSE "guardianPhone" END
             WHERE "id" = ?`,
            item.participantPhone,
            item.guardianName,
            item.guardianPhone,
            item.id
          );
        }

        return;
      }

      await prisma.$transaction([
        ...mockCases.map((item) =>
          prisma.$executeRawUnsafe(
            `INSERT INTO "AdminCase" (
              "id", "name", "ageLabel", "district", "participantPhone", "guardianName", "guardianPhone", "assignee", "nextContactAt", "riskLevel",
              "workflowStatus", "lastParticipationDays", "preferredTime", "mobilitySummary",
              "nextRecommendation", "statusTagsJson", "profilePersona", "profileIntent",
              "profileState", "profileWalkMinutes"
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            item.id,
            item.name,
            item.ageLabel,
            item.district,
            item.participantPhone,
            item.guardianName,
            item.guardianPhone,
            item.assignee,
            item.nextContactAt ? new Date(item.nextContactAt).toISOString() : null,
            item.riskLevel,
            item.workflowStatus,
            item.lastParticipationDays,
            item.preferredTime,
            item.mobilitySummary,
            item.nextRecommendation,
            serializeTags(item.statusTags),
            item.profilePreset.persona,
            item.profilePreset.intent,
            item.profilePreset.state,
            item.profilePreset.walkMinutes
          )
        ),
        ...mockHistory.map((item) =>
          prisma.$executeRawUnsafe(
            `INSERT INTO "AdminHistory" ("id", "caseId", "type", "summary", "metadataJson", "createdAt")
             VALUES (?, ?, ?, ?, ?, ?)`,
            item.id,
            item.caseId,
            item.type,
            item.summary,
            serializeHistoryMetadata(item.reasonCode, item.outreachTarget, item.outreachChannel, item.outreachStatus),
            new Date(item.createdAt).toISOString()
          )
        )
      ]);
    })();
  }

  await seededPromise;
}

export async function listCases(): Promise<AdminCase[]> {
  if (!isDatabaseMode()) {
    return memoryCases;
  }

  await ensureSeeded();

  const prisma = getPrismaClient();
  const records = await prisma.adminCase.findMany({
    orderBy: [{ updatedAt: "desc" }, { createdAt: "asc" }]
  });

  return records.map(mapCaseFromDb);
}

export async function getCaseById(caseId: string): Promise<AdminCase | null> {
  const cases = await listCases();
  return cases.find((item) => item.id === caseId) ?? null;
}

export async function getDashboard(): Promise<AdminDashboard> {
  const cases = await listCases();
  const historyItems = await listAllHistory();

  return {
    summary: buildSummary(cases),
    followUpInsights: buildFollowUpInsights(cases),
    performanceMetrics: buildPerformanceMetrics(historyItems, cases),
    participationInsights: buildParticipationInsights(historyItems, cases),
    cases
  };
}

async function listAllHistory(): Promise<AdminHistoryItem[]> {
  if (!isDatabaseMode()) {
    return [...memoryHistory].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  await ensureSeeded();

  const prisma = getPrismaClient();
  const records = (await prisma.$queryRawUnsafe(
    `SELECT "id", "caseId", "type", "summary", "metadataJson", "createdAt"
     FROM "AdminHistory"
     ORDER BY "createdAt" DESC`
  )) as DbAdminHistoryRow[];

  return records.map(mapHistoryFromDb);
}

export async function listCaseHistory(caseId: string): Promise<AdminHistoryItem[]> {
  if (!isDatabaseMode()) {
    return memoryHistory
      .filter((item) => item.caseId === caseId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  await ensureSeeded();

  const prisma = getPrismaClient();
  const records = (await prisma.$queryRawUnsafe(
    `SELECT "id", "caseId", "type", "summary", "metadataJson", "createdAt"
     FROM "AdminHistory"
     WHERE "caseId" = ?
     ORDER BY "createdAt" DESC`,
    caseId
  )) as DbAdminHistoryRow[];

  return records.map(mapHistoryFromDb);
}

export async function updateCaseWorkflowStatus(caseId: string, status: CaseStatus, note?: string) {
  if (!isDatabaseMode()) {
    const target = memoryCases.find((item) => item.id === caseId);

    if (!target) {
      return null;
    }

    target.workflowStatus = status;

    const historyItem: AdminHistoryItem = {
      id: `history-${memoryHistory.length + 1}`,
      caseId,
      type: "status_update",
      createdAt: new Date().toISOString(),
      summary: createHistorySummary(status, note)
    };

    memoryHistory.push(historyItem);

    return {
      case: target,
      historyItem,
      summary: buildSummary(memoryCases)
    };
  }

  await ensureSeeded();

  const prisma = getPrismaClient();
  const target = await prisma.adminCase.findUnique({
    where: {
      id: caseId
    }
  });

  if (!target) {
    return null;
  }

  const historySummary = createHistorySummary(status, note);
  const historyId = createHistoryId();

  const [updatedCase] = await prisma.$transaction([
    prisma.adminCase.update({
      where: {
        id: caseId
      },
      data: {
        workflowStatus: status
      }
    }),
    prisma.$executeRawUnsafe(
      `INSERT INTO "AdminHistory" ("id", "caseId", "type", "summary")
       VALUES (?, ?, ?, ?)`,
      historyId,
      caseId,
      "status_update",
      historySummary
    )
  ]);

  const allCases = await listCases();
  const historyRecord: DbAdminHistoryRow = {
    id: historyId,
    caseId,
    type: "status_update",
    summary: historySummary,
    metadataJson: null,
    createdAt: new Date()
  };

  return {
    case: mapCaseFromDb(updatedCase),
    historyItem: mapHistoryFromDb(historyRecord),
    summary: buildSummary(allCases)
  };
}

export async function updateCasePlanning(
  caseId: string,
  assignee: string,
  nextContactAt?: string | null,
  note?: string
) {
  if (!isDatabaseMode()) {
    const target = memoryCases.find((item) => item.id === caseId);

    if (!target) {
      return null;
    }

    target.assignee = assignee.trim();
    target.nextContactAt = nextContactAt ?? null;

    const historyItem: AdminHistoryItem = {
      id: createHistoryId(),
      caseId,
      type: "status_update",
      createdAt: new Date().toISOString(),
      summary: createPlanningSummary(assignee, nextContactAt, note)
    };

    memoryHistory.push(historyItem);

    return {
      case: target,
      historyItem,
      summary: buildSummary(memoryCases)
    };
  }

  await ensureSeeded();

  const prisma = getPrismaClient();
  const target = await prisma.adminCase.findUnique({
    where: {
      id: caseId
    }
  });

  if (!target) {
    return null;
  }

  const historySummary = createPlanningSummary(assignee, nextContactAt, note);
  const historyId = createHistoryId();

  await prisma.$transaction([
    prisma.$executeRawUnsafe(
      `UPDATE "AdminCase"
       SET "assignee" = ?, "nextContactAt" = ?, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = ?`,
      assignee.trim(),
      nextContactAt ? new Date(nextContactAt).toISOString() : null,
      caseId
    ),
    prisma.$executeRawUnsafe(
      `INSERT INTO "AdminHistory" ("id", "caseId", "type", "summary")
       VALUES (?, ?, ?, ?)`,
      historyId,
      caseId,
      "status_update",
      historySummary
    )
  ]);

  const updatedCaseRecord = await prisma.adminCase.findUnique({
    where: {
      id: caseId
    }
  });

  if (!updatedCaseRecord) {
    return null;
  }

  const allCases = await listCases();
  const historyRecord: DbAdminHistoryRow = {
    id: historyId,
    caseId,
    type: "status_update",
    summary: historySummary,
    metadataJson: null,
    createdAt: new Date()
  };

  return {
    case: mapCaseFromDb(updatedCaseRecord as DbAdminCase),
    historyItem: mapHistoryFromDb(historyRecord),
    summary: buildSummary(allCases)
  };
}

export async function appendCaseHistory(
  caseId: string,
  type: "recommendation" | "share" | "participation" | "outreach",
  summary: string,
  nextRecommendation?: string,
  workflowStatus?: CaseStatus,
  reasonCode?: ParticipationReasonCode,
  outreachTarget?: OutreachTarget,
  outreachChannel?: OutreachChannel,
  outreachStatus?: OutreachStatus
) {
  if (!isDatabaseMode()) {
    const target = memoryCases.find((item) => item.id === caseId);

    if (!target) {
      return null;
    }

    if ((type === "recommendation" || type === "participation") && nextRecommendation?.trim()) {
      target.nextRecommendation = nextRecommendation.trim();
    }

    if (workflowStatus) {
      target.workflowStatus = workflowStatus;
    }

    const historyItem: AdminHistoryItem = {
      id: createHistoryId(),
      caseId,
      type,
      createdAt: new Date().toISOString(),
      summary,
      reasonCode,
      outreachTarget,
      outreachChannel,
      outreachStatus
    };

    memoryHistory.push(historyItem);

    return {
      case: target,
      historyItem,
      summary: buildSummary(memoryCases)
    };
  }

  await ensureSeeded();

  const prisma = getPrismaClient();
  const target = await prisma.adminCase.findUnique({
    where: {
      id: caseId
    }
  });

  if (!target) {
    return null;
  }

  const historyId = createHistoryId();

  const [updatedCase] = await prisma.$transaction([
    prisma.adminCase.update({
      where: {
        id: caseId
      },
      data: {
        ...((type === "recommendation" || type === "participation") && nextRecommendation?.trim()
          ? {
              nextRecommendation: nextRecommendation.trim()
            }
          : {}),
        ...(workflowStatus
          ? {
              workflowStatus
            }
          : {})
      }
    }),
    prisma.$executeRawUnsafe(
      `INSERT INTO "AdminHistory" ("id", "caseId", "type", "summary", "metadataJson")
       VALUES (?, ?, ?, ?, ?)`,
      historyId,
      caseId,
      type,
      summary,
      serializeHistoryMetadata(reasonCode, outreachTarget, outreachChannel, outreachStatus)
    )
  ]);

  const allCases = await listCases();
  const historyRecord: DbAdminHistoryRow = {
    id: historyId,
    caseId,
    type,
    summary,
    metadataJson: serializeHistoryMetadata(reasonCode, outreachTarget, outreachChannel, outreachStatus),
    createdAt: new Date()
  };

  return {
    case: mapCaseFromDb(updatedCase),
    historyItem: mapHistoryFromDb(historyRecord),
    summary: buildSummary(allCases)
  };
}
