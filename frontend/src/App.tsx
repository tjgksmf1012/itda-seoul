import { startTransition, useEffect, useState } from "react";
import {
  budgetLabels,
  companionLabels,
  defaultInput,
  districtOptions,
  interestOptions,
  mobilityLabels,
  placePreferenceLabels,
  purposeLabels,
  scenarioPresets,
  timeWindowLabels,
  type RecommendationInput
} from "./data/demo";
import { requestRecommendation, type RecommendationResponse } from "./lib/api";

const categoryLabels = {
  welfare: "복지",
  culture: "문화",
  reservation: "예약",
  education: "학습",
  support: "회복"
} as const;

const indoorLabels = {
  indoor: "실내",
  outdoor: "야외",
  mixed: "실내외"
} as const;

const budgetTypeLabels = {
  free: "무료",
  paid: "유료",
  unknown: "비용 확인 필요"
} as const;

const portalLabels = {
  "seoul-open-data": "서울 열린데이터광장",
  "data-go-kr": "공공데이터포털"
} as const;

function App() {
  const [input, setInput] = useState<RecommendationInput>(defaultInput);
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);

    requestRecommendation(input)
      .then((result) => {
        if (!cancelled) {
          setRecommendation(result);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [input]);

  const toggleInterest = (interest: string) => {
    setInput((current) => {
      const nextTags = current.interestTags.includes(interest)
        ? current.interestTags.filter((item) => item !== interest)
        : [...current.interestTags, interest];

      return {
        ...current,
        interestTags: nextTags
      };
    });
  };

  const applyPreset = (nextInput: RecommendationInput) => {
    startTransition(() => {
      setInput(nextInput);
    });
  };

  return (
    <div className="page-shell">
      <header className="hero">
        <div className="hero-nav">
          <div className="brand-block">
            <span className="brand-eyebrow">2026 서울시 빅데이터 활용 경진대회 본선형 데모</span>
            <strong>오늘서울</strong>
          </div>
          <div className="hero-nav-links">
            <a href="#planner">추천 설계</a>
            <a href="#proof">데이터 증빙</a>
            <a href="#finals">본선 포인트</a>
          </div>
        </div>

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="hero-kicker">서울 시민이 오늘 실제로 움직일 수 있는 공공경험 추천</p>
            <h1>
              서울시 데이터로
              <br />
              후보를 고르고
              <br />
              공공데이터로
              <br />
              오늘의 답을 정합니다
            </h1>
            <p className="hero-text">
              열린데이터광장의 프로그램·행사·예약 데이터를 후보로 쓰고, 공공데이터포털의
              날씨·대기질 시그널로 오늘의 실내/실외 판단을 보정해 서울 시민에게 바로 쓸 수
              있는 추천을 제공합니다.
            </p>

            <div className="hero-actions">
              <a className="primary-link" href="#planner">
                추천 시작하기
              </a>
              <a className="secondary-link" href="#proof">
                데이터 사용 보기
              </a>
            </div>

            <div className="hero-facts">
              <article>
                <span>데이터 포털</span>
                <strong>2개 동시 사용</strong>
              </article>
              <article>
                <span>핵심 가치</span>
                <strong>후보 + 당일 판단</strong>
              </article>
              <article>
                <span>대상</span>
                <strong>서울 시민 실사용</strong>
              </article>
            </div>
          </section>

          <aside className="hero-card">
            <span className="mini-label">오늘의 제품 정의</span>
            <strong>단순 공공데이터 검색이 아니라 서울 생활 의사결정 도구</strong>
            <p>
              사용자는 “오늘 어디 가면 좋지?”를 묻고, 서비스는 서울시 프로그램 후보와
              공공데이터포털의 도시 컨디션을 함께 읽어 실질적인 한 가지 답을 줍니다.
            </p>

            <div className="stack-list">
              <div>
                <span>열린데이터광장</span>
                <strong>후보 프로그램, 행사, 예약</strong>
              </div>
              <div>
                <span>공공데이터포털</span>
                <strong>기상청 예보, 대기질 시그널</strong>
              </div>
              <div>
                <span>추천 엔진</span>
                <strong>오늘의 실내/실외와 이동 피로도 조정</strong>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main>
        <section className="section" id="planner">
          <div className="section-heading">
            <span className="section-kicker">Planner</span>
            <h2>서울 시민이 지금 바로 쓸 수 있는 조건으로 추천을 설계합니다.</h2>
          </div>

          <div className="planner-layout">
            <section className="planner-panel">
              <div className="card-top">
                <span className="mini-label">추천 시나리오</span>
                <h3>본선 발표용으로도 바로 쓰일 대표 사용자 흐름</h3>
              </div>

              <div className="preset-grid">
                {scenarioPresets.map((preset) => (
                  <button
                    key={preset.id}
                    className={`preset-card ${input.district === preset.input.district && input.purpose === preset.input.purpose && input.companionType === preset.input.companionType ? "active" : ""}`}
                    onClick={() => applyPreset(preset.input)}
                    type="button"
                  >
                    <strong>{preset.title}</strong>
                    <span>{preset.summary}</span>
                  </button>
                ))}
              </div>

              <div className="form-grid">
                <label className="field">
                  <span>지역구</span>
                  <select
                    value={input.district}
                    onChange={(event) =>
                      setInput((current) => ({
                        ...current,
                        district: event.target.value
                      }))
                    }
                  >
                    {districtOptions.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>누구와 함께</span>
                  <select
                    value={input.companionType}
                    onChange={(event) =>
                      setInput((current) => ({
                        ...current,
                        companionType: event.target.value as RecommendationInput["companionType"]
                      }))
                    }
                  >
                    {Object.entries(companionLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>오늘의 목적</span>
                  <select
                    value={input.purpose}
                    onChange={(event) =>
                      setInput((current) => ({
                        ...current,
                        purpose: event.target.value as RecommendationInput["purpose"]
                      }))
                    }
                  >
                    {Object.entries(purposeLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>시간대</span>
                  <select
                    value={input.timeWindow}
                    onChange={(event) =>
                      setInput((current) => ({
                        ...current,
                        timeWindow: event.target.value as RecommendationInput["timeWindow"]
                      }))
                    }
                  >
                    {Object.entries(timeWindowLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>장소 성향</span>
                  <select
                    value={input.placePreference}
                    onChange={(event) =>
                      setInput((current) => ({
                        ...current,
                        placePreference: event.target.value as RecommendationInput["placePreference"]
                      }))
                    }
                  >
                    {Object.entries(placePreferenceLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>예산</span>
                  <select
                    value={input.budget}
                    onChange={(event) =>
                      setInput((current) => ({
                        ...current,
                        budget: event.target.value as RecommendationInput["budget"]
                      }))
                    }
                  >
                    {Object.entries(budgetLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>이동 허용 정도</span>
                  <select
                    value={input.mobilityLevel}
                    onChange={(event) =>
                      setInput((current) => ({
                        ...current,
                        mobilityLevel: event.target.value as RecommendationInput["mobilityLevel"]
                      }))
                    }
                  >
                    {Object.entries(mobilityLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>최대 이동 시간</span>
                  <strong>{input.maxTravelMinutes}분 이내</strong>
                  <input
                    max="40"
                    min="10"
                    type="range"
                    value={input.maxTravelMinutes}
                    onChange={(event) =>
                      setInput((current) => ({
                        ...current,
                        maxTravelMinutes: Number(event.target.value)
                      }))
                    }
                  />
                </label>
              </div>

              <div className="interest-block">
                <span className="mini-label">관심 태그</span>
                <div className="chip-row">
                  {interestOptions.map((interest) => (
                    <button
                      key={interest}
                      className={`chip ${input.interestTags.includes(interest) ? "active" : ""}`}
                      onClick={() => toggleInterest(interest)}
                      type="button"
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="result-panel">
              <div className="card-top">
                <span className="mini-label">추천 결과</span>
                <h3>{loading ? "서울의 오늘 조건을 계산하는 중" : recommendation?.headline}</h3>
              </div>

              {recommendation ? (
                <>
                  <div className="lead-card">
                    <div className="lead-top">
                      <span className="lead-badge">오늘의 1순위</span>
                      <strong>{recommendation.matchScore}점 매칭</strong>
                    </div>
                    <h4>{recommendation.primaryAction}</h4>
                    <p>{recommendation.summary}</p>
                    <div className="lead-note">{recommendation.recommendationTone}</div>
                  </div>

                  <div className="signal-card">
                    <div>
                      <span className="mini-label">공공데이터포털 시그널</span>
                      <strong>
                        {recommendation.citySignal.weatherLabel} · 대기질{" "}
                        {recommendation.citySignal.airQualityLabel}
                      </strong>
                    </div>
                    <p>{recommendation.todayBrief}</p>
                    <div className="signal-stats">
                      <span>기온 {recommendation.citySignal.temperatureC}°C</span>
                      <span>야외지수 {recommendation.citySignal.outdoorIndex}</span>
                      <span>보행쾌적도 {recommendation.citySignal.walkComfort}</span>
                    </div>
                  </div>

                  <div className="reason-list">
                    {recommendation.reasons.map((reason, index) => (
                      <article className="reason-card" key={reason}>
                        <span>핵심 판단 {index + 1}</span>
                        <strong>{reason}</strong>
                      </article>
                    ))}
                  </div>

                  <div className="share-card">
                    <span className="mini-label">공유 문구</span>
                    <p>{recommendation.shareMessage}</p>
                  </div>

                  <div className="action-card">
                    <span className="mini-label">바로 실행 체크리스트</span>
                    <div className="action-list">
                      {recommendation.actionPlan.map((step) => (
                        <div className="action-item" key={step}>
                          <strong>실행</strong>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </section>
          </div>
        </section>

        <section className="section">
          <div className="section-heading">
            <span className="section-kicker">Alternatives</span>
            <h2>추천은 한 장으로 끝내지 않고 대안까지 함께 보여줍니다.</h2>
          </div>

          <div className="program-grid">
            {recommendation?.suggestedPrograms.map((program) => (
              <article className="program-card" key={program.id}>
                <div className="program-top">
                  <span>{categoryLabels[program.category]}</span>
                  <span>{budgetTypeLabels[program.budgetType]}</span>
                </div>
                <h3>{program.title}</h3>
                <p>{program.summary}</p>
                <div className="program-meta">
                  <span>{program.district}</span>
                  <span>{program.place}</span>
                  <span>{indoorLabels[program.indoorType]}</span>
                </div>
                <div className="tag-row">
                  {program.interestTags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="program-footer">
                  <span>{program.datasetName}</span>
                  <a href={program.actionUrl} rel="noreferrer" target="_blank">
                    상세 보기
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="proof">
          <div className="section-heading">
            <span className="section-kicker">Data Proof</span>
            <h2>두 포털이 각각 다른 역할을 맡도록 설계해 데이터 활용성이 분명합니다.</h2>
          </div>

          <div className="proof-grid">
            {recommendation?.sourceNotes.map((note) => (
              <article className="proof-card" key={`${note.portal}-${note.datasetName}`}>
                <span className="mini-label">{portalLabels[note.portal]}</span>
                <strong>{note.datasetName}</strong>
                <p>{note.role}</p>
              </article>
            ))}
          </div>

          <div className="proof-summary">
            <article>
              <span>공공 가치</span>
              <strong>{recommendation?.publicValue}</strong>
            </article>
            <article>
              <span>본선형 포인트</span>
              <strong>{recommendation?.serviceWhy}</strong>
            </article>
            <article>
              <span>시그널 갱신 시각</span>
              <strong>
                {recommendation
                  ? new Date(recommendation.citySignal.updatedAt).toLocaleString("ko-KR")
                  : "-"}
              </strong>
            </article>
          </div>
        </section>

        <section className="section section-dark" id="finals">
          <div className="section-heading">
            <span className="section-kicker">Finals Fit</span>
            <h2>본선 심사위원이 봐도 합격시킬 이유가 드러나는 구조입니다.</h2>
          </div>

          <div className="finals-grid">
            <article>
              <strong>실사용성이 분명합니다.</strong>
              <p>
                서울 시민은 오늘의 동선, 날씨, 예산, 동행자 기준으로 바로 선택할 수 있고,
                단순 조회가 아니라 행동으로 이어지는 결과를 받습니다.
              </p>
            </article>
            <article>
              <strong>두 포털을 억지로 붙이지 않았습니다.</strong>
              <p>
                열린데이터광장은 후보 탐색, 공공데이터포털은 당일 판단이라는 역할 분담이
                명확해 심사에서 설명하기 좋습니다.
              </p>
            </article>
            <article>
              <strong>확장성이 좋습니다.</strong>
              <p>
                이후 자치구별 행사, 혼잡도, 교통, 안전 데이터를 더 붙이면 시민용 생활
                추천 플랫폼으로 확장할 수 있습니다.
              </p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
