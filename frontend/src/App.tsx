import { startTransition, useEffect, useState } from "react";
import {
  interestOptions,
  intentLabels,
  personaLabels,
  personaPresets,
  stateAdjustments,
  stateLabels,
  type IntentKey,
  type PersonaKey,
  type StateKey
} from "./data/demo";
import {
  requestAdminDashboard,
  requestCaseHistory,
  requestRecommendation,
  updateCaseStatus,
  type AdminCase,
  type AdminDashboardResponse,
  type AdminHistoryItem,
  type CaseStatus,
  type RecommendationResponse
} from "./lib/api";

const supportLevelLabels = {
  light: "가벼운 안내",
  guided: "보호자·기관 동행 권장",
  urgent: "상담 우선 연결"
} as const;

const workflowStatusLabels: Record<CaseStatus, string> = {
  pending: "대기",
  contacted: "연락 완료",
  scheduled: "예약 진행",
  completed: "참여 완료"
};

const availabilityLabels = {
  always: "상시 가능",
  upcoming: "예정",
  closing_soon: "마감 임박",
  ended: "종료"
} as const;

function App() {
  const [persona, setPersona] = useState<PersonaKey>("elder");
  const [intent, setIntent] = useState<IntentKey>("outing");
  const [state, setState] = useState<StateKey>("low");
  const [walkMinutes, setWalkMinutes] = useState<number>(personaPresets.elder.walk);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["건강", "대화"]);
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [caseHistory, setCaseHistory] = useState<AdminHistoryItem[]>([]);
  const [adminNote, setAdminNote] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);

  const preset = personaPresets[persona];
  const selectedCase = dashboard?.cases.find((item) => item.id === selectedCaseId) ?? null;

  useEffect(() => {
    let cancelled = false;

    requestRecommendation({
      persona,
      intent,
      state,
      walkMinutes,
      interestTags: selectedInterests
    }).then((result) => {
      if (!cancelled) {
        setRecommendation(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [intent, persona, selectedInterests, state, walkMinutes]);

  useEffect(() => {
    let cancelled = false;

    requestAdminDashboard().then((result) => {
      if (cancelled) {
        return;
      }

      setDashboard(result);
      setSelectedCaseId((current) => current ?? result.cases[0]?.id ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!selectedCaseId) {
      setCaseHistory([]);
      return;
    }

    requestCaseHistory(selectedCaseId).then((items) => {
      if (!cancelled) {
        setCaseHistory(items);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedCaseId]);

  const reasons = recommendation
    ? recommendation.reasons.map((reason, index) => [
        index === 0 ? "우선 반영 기준" : index === 1 ? "추천 로직" : "행동 전환",
        reason
      ])
    : preset.reasons.map(([title, body], index) => {
        if (index !== 0) {
          return [title, body] as const;
        }

        return [title, `${body} 현재 설정된 도보 가능 거리는 ${walkMinutes}분입니다.`] as const;
      });

  const recommendationTitle = recommendation?.primaryAction ?? preset.title;
  const recommendationSummary =
    recommendation?.summary ?? `${preset.summary} ${stateAdjustments[state]}`;
  const shareMessage =
    recommendation?.shareMessage ??
    `${intentLabels[intent]} 후보를 정리했어요. ${preset.title} 기준으로 추천했고 도보 가능 거리 ${walkMinutes}분 이내 후보를 우선 반영했습니다.`;

  const applyCaseToDemo = (item: AdminCase) => {
    setSelectedCaseId(item.id);

    startTransition(() => {
      setPersona(item.profilePreset.persona);
      setIntent(item.profilePreset.intent);
      setState(item.profilePreset.state);
      setWalkMinutes(item.profilePreset.walkMinutes);
      setSelectedInterests((current) =>
        current.length
          ? current
          : item.profilePreset.intent === "support"
            ? ["상담", "대화"]
            : ["건강", "문화"]
      );
    });
  };

  const toggleInterest = (value: string) => {
    setSelectedInterests((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  };

  const handleStatusUpdate = async (status: CaseStatus) => {
    if (!selectedCaseId) {
      return;
    }

    setAdminBusy(true);

    try {
      const result = await updateCaseStatus(selectedCaseId, status, adminNote);

      setDashboard((current) => {
        if (!current) {
          return current;
        }

        return {
          summary: result.summary,
          cases: current.cases.map((item) => (item.id === selectedCaseId ? result.case : item))
        };
      });

      setCaseHistory((current) => [result.historyItem, ...current]);
      setAdminNote("");
    } finally {
      setAdminBusy(false);
    }
  };

  return (
    <div className="page-shell">
      <header className="hero">
        <nav className="topbar">
          <div className="brand">
            <span className="brand-kicker">2026 서울시 빅데이터 활용 경진대회</span>
            <strong>잇다서울</strong>
          </div>
          <div className="topbar-links">
            <a className="ghost-link" href="#demo">
              사용자 MVP
            </a>
            <a className="ghost-link" href="#admin">
              기관 대시보드
            </a>
          </div>
        </nav>

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">고립위험 1인가구 · 고령층을 위한 AI 사회연결 처방 플랫폼</p>
            <h1>
              정보를 보여주는 데서 끝나지 않고
              <br />
              다음 행동까지 이어줍니다.
            </h1>
            <p className="hero-text">
              흩어진 서울시 복지·문화·예약 데이터를 결합해, 사용자 상황에 맞는 다음 외출·다음 연결·다음
              신청을 AI가 추천하고 바로 공유와 신청까지 이어주는 웹 기반 MVP입니다.
            </p>

            <div className="hero-actions">
              <a className="primary-button" href="#demo">
                추천 흐름 보기
              </a>
              <a className="secondary-button" href="#admin">
                기관 화면 보기
              </a>
            </div>

            <ul className="hero-points">
              <li>복지 정보 목록이 아니라 오늘 당장 할 다음 행동 1개를 제안</li>
              <li>추천에서 끝나지 않고 예약 링크와 보호자 공유까지 연결</li>
              <li>기관 담당자가 대상자 상태 변경과 추천 이력을 한 화면에서 관리</li>
            </ul>
          </section>

          <aside className="hero-panel">
            <div className="panel-card accent-card">
              <span className="mini-label">핵심 가치</span>
              <strong>흩어진 공공데이터를 행동 처방으로 전환</strong>
              <p>
                사용자 상태를 해석해 외출형, 참여형, 상담연결형, 보호자 동행형 중 가장 적합한 다음 행동을
                제안합니다.
              </p>
            </div>

            <div className="panel-card">
              <span className="mini-label">주요 사용자</span>
              <strong>고립위험 1인가구 · 고령층 · 보호자 · 복지현장</strong>
              <p>개인 사용성과 기관 운영성을 동시에 고려한 B2B2C 구조의 사회연결 플랫폼</p>
            </div>

            <div className="stats-strip">
              <div>
                <span>핵심 데이터군</span>
                <strong>5개 결합</strong>
              </div>
              <div>
                <span>MVP 형태</span>
                <strong>웹 기반 링크형</strong>
              </div>
              <div>
                <span>기관 모드</span>
                <strong>상태 관리 포함</strong>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main>
        <section className="section section-dark">
          <div className="section-heading">
            <span className="section-kicker">Problem</span>
            <h2>문제는 정보 부족보다 행동으로 이어지지 않는 연결 실패입니다.</h2>
          </div>

          <div className="problem-grid">
            <article className="problem-card">
              <strong>목록은 많지만 무엇을 해야 할지 정해주지 못합니다.</strong>
              <p>
                복지시설, 문화행사, 공공서비스예약 데이터는 흩어져 있고 사용자는 가까운지, 내 상황에 맞는지,
                신청이 쉬운지를 스스로 판단해야 합니다.
              </p>
            </article>
            <article className="problem-card">
              <strong>고립 문제는 검색보다 연결 실패의 문제입니다.</strong>
              <p>
                첫 외출과 첫 참여는 심리적 장벽이 크기 때문에, 단순 나열보다 부담이 낮은 행동을 하나로 압축해
                제안하는 경험이 필요합니다.
              </p>
            </article>
            <article className="problem-card">
              <strong>보호자와 복지현장은 반복 수작업을 감당하고 있습니다.</strong>
              <p>
                프로그램 탐색, 링크 전달, 참여 확인, 다음 활동 제안까지 사람이 계속 반복하고 있어 운영 효율이
                낮고 누락도 발생합니다.
              </p>
            </article>
          </div>
        </section>

        <section className="section" id="demo">
          <div className="section-heading">
            <span className="section-kicker">User Flow</span>
            <h2>사용자 상태를 입력하면 AI가 다음 연결 행동을 제안하는 흐름입니다.</h2>
          </div>

          <div className="demo-layout">
            <section className="demo-controls card">
              <div className="card-header">
                <span className="mini-label">1. 사용자 상태</span>
                <h3>대표 시나리오를 선택해 보세요</h3>
              </div>

              <div className="preset-group">
                {Object.entries(personaLabels).map(([key, label]) => (
                  <button
                    key={key}
                    className={`preset-button ${persona === key ? "active" : ""}`}
                    onClick={() => {
                      const nextPersona = key as PersonaKey;
                      setPersona(nextPersona);
                      setWalkMinutes(personaPresets[nextPersona].walk);
                    }}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <label className="range-block" htmlFor="walkRange">
                <span>도보 가능 거리</span>
                <strong>{walkMinutes}분</strong>
              </label>
              <input
                id="walkRange"
                max="25"
                min="5"
                onChange={(event) => setWalkMinutes(Number(event.target.value))}
                type="range"
                value={walkMinutes}
              />

              <div className="chip-group" aria-label="이번 주 상태">
                {Object.entries(stateLabels).map(([key, label]) => (
                  <button
                    key={key}
                    className={`chip ${state === key ? "active" : ""}`}
                    onClick={() => setState(key as StateKey)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="input-group">
                <span className="mini-label">관심사</span>
                <div className="chip-group" aria-label="관심사 선택">
                  {interestOptions.map((interest) => (
                    <button
                      key={interest}
                      className={`chip ${selectedInterests.includes(interest) ? "active" : ""}`}
                      onClick={() => toggleInterest(interest)}
                      type="button"
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              <div className="destination-list">
                {Object.entries(intentLabels).map(([key, label]) => (
                  <button
                    key={key}
                    className={`destination ${intent === key ? "active" : ""}`}
                    onClick={() => setIntent(key as IntentKey)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <section className="demo-results card">
              <div className="card-header">
                <span className="mini-label">2. 추천 결과</span>
                <h3>지금 가장 부담이 낮은 다음 행동</h3>
              </div>

              <div className="route-recommendation">
                <div className="route-badge">추천 1순위</div>
                <h4>{recommendationTitle}</h4>
                <p>{recommendationSummary}</p>
              </div>

              <div className="score-row">
                <div className="score-card">
                  <span>매칭 점수</span>
                  <strong>{recommendation?.matchScore ?? 72}</strong>
                </div>
                <div className="score-card">
                  <span>지원 수준</span>
                  <strong>{supportLevelLabels[recommendation?.supportLevel ?? "guided"]}</strong>
                </div>
              </div>

              <div className="reason-list">
                {reasons.map(([title, body]) => (
                  <div className="reason-item" key={title}>
                    <strong>{title}</strong>
                    <span>{body}</span>
                  </div>
                ))}
              </div>

              <div className="share-card">
                <span className="mini-label">3. 보호자 · 복지사 공유</span>
                <p>{shareMessage}</p>
              </div>

              <div className="action-plan card-lite">
                <span className="mini-label">4. 실행 체크리스트</span>
                <div className="action-list">
                  {(recommendation?.actionPlan ?? []).map((step) => (
                    <div className="action-item" key={step}>
                      <strong>실행</strong>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
                <p className="checkin-note">{recommendation?.checkInMessage}</p>
              </div>

              {recommendation?.suggestedPrograms?.length ? (
                <div className="program-list">
                  {recommendation.suggestedPrograms.map((program) => (
                    <article className="program-card" key={program.id}>
                      <strong>{program.title}</strong>
                      <span className="program-meta">
                        {[program.district, program.place].filter(Boolean).join(" · ")}
                      </span>
                      <div className="tag-row">
                        {program.availabilityStatus ? (
                          <span className="tag tag-strong">
                            {availabilityLabels[program.availabilityStatus]}
                          </span>
                        ) : null}
                        {program.startDate ? (
                          <span className="tag">
                            {program.endDate
                              ? `${program.startDate} ~ ${program.endDate}`
                              : `${program.startDate} 시작`}
                          </span>
                        ) : null}
                      </div>
                      <p>{program.summary}</p>
                      {program.tags?.length ? (
                        <div className="tag-row">
                          {program.tags.map((tag) => (
                            <span className="tag" key={tag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <a href={program.actionUrl} rel="noreferrer" target="_blank">
                        신청 링크 보기
                      </a>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          </div>
        </section>

        <section className="section" id="admin">
          <div className="section-heading">
            <span className="section-kicker">Admin Mode</span>
            <h2>기관 담당자가 대상자 상태를 바꾸고 추천 이력을 이어서 관리할 수 있습니다.</h2>
          </div>

          <div className="admin-summary">
            <article className="summary-card">
              <span>관리 대상자</span>
              <strong>{dashboard?.summary.totalCases ?? 0}명</strong>
            </article>
            <article className="summary-card">
              <span>집중 케어 필요</span>
              <strong>{dashboard?.summary.needsAttention ?? 0}명</strong>
            </article>
            <article className="summary-card">
              <span>이번 주 예약 진행</span>
              <strong>{dashboard?.summary.scheduledThisWeek ?? 0}건</strong>
            </article>
            <article className="summary-card">
              <span>이번 주 참여 완료</span>
              <strong>{dashboard?.summary.completedThisWeek ?? 0}건</strong>
            </article>
          </div>

          <div className="admin-layout">
            <section className="card">
              <div className="card-header">
                <span className="mini-label">대상자 목록</span>
                <h3>재추천 우선순위가 높은 케이스</h3>
              </div>

              <div className="case-list">
                {dashboard?.cases.map((item) => (
                  <button
                    key={item.id}
                    className={`case-card ${selectedCaseId === item.id ? "active" : ""}`}
                    onClick={() => applyCaseToDemo(item)}
                    type="button"
                  >
                    <div className="case-topline">
                      <strong>{item.name}</strong>
                      <span className={`risk-pill risk-${item.riskLevel}`}>{item.riskLevel}</span>
                    </div>
                    <p>{item.ageLabel}</p>
                    <p>{item.mobilitySummary}</p>
                    <div className="tag-row">
                      <span className="tag tag-strong">{workflowStatusLabels[item.workflowStatus]}</span>
                      {item.statusTags.map((tag) => (
                        <span className="tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="card">
              <div className="card-header">
                <span className="mini-label">선택된 케이스</span>
                <h3>상태 변경과 후속 이력</h3>
              </div>

              {selectedCase ? (
                <div className="case-detail">
                  <div className="detail-grid">
                    <div>
                      <span>자치구</span>
                      <strong>{selectedCase.district}</strong>
                    </div>
                    <div>
                      <span>마지막 참여</span>
                      <strong>{selectedCase.lastParticipationDays}일 전</strong>
                    </div>
                    <div>
                      <span>선호 시간대</span>
                      <strong>{selectedCase.preferredTime}</strong>
                    </div>
                    <div>
                      <span>현재 상태</span>
                      <strong>{workflowStatusLabels[selectedCase.workflowStatus]}</strong>
                    </div>
                  </div>

                  <div className="share-card inline-card">
                    <span className="mini-label">현재 추천</span>
                    <p>{selectedCase.nextRecommendation}</p>
                  </div>

                  <div className="card-lite">
                    <span className="mini-label">후속 메모</span>
                    <textarea
                      className="admin-note"
                      onChange={(event) => setAdminNote(event.target.value)}
                      placeholder="예: 보호자에게 오후 2시에 링크 전송 예정"
                      value={adminNote}
                    />
                    <div className="status-actions">
                      <button className="secondary-button compact-button" onClick={() => handleStatusUpdate("contacted")} type="button">
                        연락 완료
                      </button>
                      <button className="secondary-button compact-button" onClick={() => handleStatusUpdate("scheduled")} type="button">
                        예약 진행
                      </button>
                      <button className="primary-button compact-button" disabled={adminBusy} onClick={() => handleStatusUpdate("completed")} type="button">
                        참여 완료
                      </button>
                    </div>
                  </div>

                  <div className="card-lite">
                    <span className="mini-label">이력 타임라인</span>
                    <div className="history-list">
                      {caseHistory.map((item) => (
                        <article className="history-item" key={item.id}>
                          <strong>{item.summary}</strong>
                          <span>{new Date(item.createdAt).toLocaleString("ko-KR")}</span>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="card-lite">
                    <span className="mini-label">다음 체크인 문구</span>
                    <p className="checkin-note">
                      {recommendation?.checkInMessage ??
                        "추천 전달 후 참여 의사와 동행 필요 여부를 확인해 주세요."}
                    </p>
                  </div>

                  <button className="primary-button stretch-button" onClick={() => applyCaseToDemo(selectedCase)} type="button">
                    이 케이스로 추천기 다시 열기
                  </button>
                </div>
              ) : (
                <p className="hero-text">선택된 케이스가 없습니다.</p>
              )}
            </section>
          </div>
        </section>

        <section className="section" id="data">
          <div className="section-heading">
            <span className="section-kicker">Data Fusion</span>
            <h2>서울시 복지·예약·문화 데이터를 결합해 추천에서 행동 전환까지 만듭니다.</h2>
          </div>

          <div className="data-grid">
            <article className="data-card mint">
              <span className="mini-label">인구 · 복지</span>
              <h3>독거노인 현황</h3>
              <p>지역별 고립위험 타깃팅과 우선순위 설정에 활용합니다.</p>
            </article>
            <article className="data-card lavender">
              <span className="mini-label">복지 인프라</span>
              <h3>노인여가복지시설</h3>
              <p>집 근처에서 바로 연결 가능한 오프라인 활동 거점을 확보합니다.</p>
            </article>
            <article className="data-card peach">
              <span className="mini-label">행정 예약</span>
              <h3>공공서비스예약 상세정보</h3>
              <p>SVCID를 기반으로 예약 상세와 신청 링크를 붙여 행동 전환 가능성을 높입니다.</p>
            </article>
            <article className="data-card sky">
              <span className="mini-label">문화</span>
              <h3>문화행사 · 예약형 문화행사</h3>
              <p>취향, 접근성, 무료 여부를 반영해 다음 외출 후보를 제안합니다.</p>
            </article>
          </div>
        </section>

        <section className="section section-highlight">
          <div className="section-heading">
            <span className="section-kicker">Contest Fit</span>
            <h2>공모전 심사 기준에 맞는 포인트를 서비스 화면에서 바로 설명합니다.</h2>
          </div>

          <div className="business-grid">
            <article className="business-card">
              <span className="mini-label">필수 데이터</span>
              <h3>서울 열린데이터광장 데이터 다중 활용</h3>
              <p>독거노인 현황, 노인여가복지시설, 공공서비스예약, 문화행사 데이터를 함께 사용합니다.</p>
            </article>
            <article className="business-card">
              <span className="mini-label">AI 활용</span>
              <h3>상태 해석 + 추천 설명 + 공유 문구 생성</h3>
              <p>AI는 개인 상황을 해석하고 부담이 낮은 다음 행동과 설명 문구를 생성합니다.</p>
            </article>
            <article className="business-card">
              <span className="mini-label">실행 가능성</span>
              <h3>추천에서 신청 · 공유 · 체크인까지 연결</h3>
              <p>아이디어 소개에 머물지 않고 기관 운영과 실제 행동 전환 흐름을 함께 보여줍니다.</p>
            </article>
          </div>
        </section>

        <section className="section section-highlight">
          <div className="section-heading">
            <span className="section-kicker">AI Flow</span>
            <h2>AI는 검색을 대체하는 것이 아니라 상태 해석과 설명 생성을 맡습니다.</h2>
          </div>

          <div className="business-grid">
            <article className="business-card">
              <span className="mini-label">상태 해석</span>
              <h3>외로움 위험 · 외출 가능성 · 보호자 개입 필요성 분류</h3>
              <p>사용자 입력을 바탕으로 어떤 처방 유형이 맞는지 우선순위를 계산합니다.</p>
            </article>
            <article className="business-card">
              <span className="mini-label">행동 문구</span>
              <h3>부담을 낮추는 한 문장 추천</h3>
              <p>이번 주엔 이 활동 하나만 가보세요 같은 설명으로 실행 저항을 낮춥니다.</p>
            </article>
            <article className="business-card">
              <span className="mini-label">기관 운영</span>
              <h3>상태 변경 · 이력 관리 · 후속 체크인까지 지원</h3>
              <p>복지현장이 추천 전달 이후의 실제 운영 흐름을 이어서 관리할 수 있게 만듭니다.</p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
