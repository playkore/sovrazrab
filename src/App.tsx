import { useEffect, useMemo, useState } from "react";
import {
  CATEGORY_LABELS,
  JOB_LABELS,
  STAT_LABELS,
  applyUpgradeChoice,
  continueGame,
  createInitialState,
  formatAge,
  getEventById,
  getStatModifier,
  getSuspicionLabel,
  getVisibleStatuses,
  resolveOption,
} from "./game/engine";
import type { EventCard, GameState, StatKey } from "./game/types";

const STORAGE_KEY = "sovrazrab-save-v2";
const STAT_TONES: Record<StatKey, string> = {
  intellect: "var(--gold)",
  discipline: "var(--blue)",
  social: "var(--amber)",
  stress: "var(--red)",
  loyalty: "var(--steel)",
  health: "var(--green)",
};

function loadState(): GameState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createInitialState();
  }

  try {
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed?.resources || !parsed?.stats || !parsed?.mode) {
      return createInitialState();
    }
    return parsed;
  } catch {
    return createInitialState();
  }
}

function saveState(state: GameState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function statBar(value: number) {
  return `${Math.max(0, Math.min(100, (value / 20) * 100))}%`;
}

function formatService(serviceQuarters: number) {
  const years = Math.floor(serviceQuarters / 4);
  const quarters = serviceQuarters % 4;
  return quarters === 0 ? `${years} лет` : `${years} лет ${quarters} кв.`;
}

function appTitle(state: GameState) {
  if (state.gameOver) {
    return "СовРазраб D20";
  }
  return `СовРазраб D20 · ${JOB_LABELS[state.resources.job]} · ${formatAge(state.resources.age)}`;
}

export default function App() {
  const [state, setState] = useState<GameState>(() => loadState());
  const currentCard = useMemo(() => getEventById(state.currentEventId), [state.currentEventId]);
  const statuses = useMemo(() => getVisibleStatuses(state), [state]);

  useEffect(() => {
    saveState(state);
    document.title = appTitle(state);
  }, [state]);

  function resetGame() {
    localStorage.removeItem(STORAGE_KEY);
    setState(createInitialState());
  }

  function handleChoice(optionId: string) {
    if (!currentCard || state.gameOver) {
      return;
    }
    setState((prev) => resolveOption(prev, currentCard, optionId));
  }

  function handleContinue() {
    setState((prev) => continueGame(prev));
  }

  function handleUpgrade(stat: StatKey) {
    setState((prev) => applyUpgradeChoice(prev, stat));
  }

  return (
    <main className="app-shell">
      <section className="layout">
        <div className="board">
          <aside className="panel stats-panel">
            <div className="panel-heading">
              <span className="suspicion-badge">Подозрение: {getSuspicionLabel(state.resources.suspicionRisk)}</span>
            </div>

            <div className="compact-metrics">
              <span>Возраст {formatAge(state.resources.age)}</span>
              <span>Стаж {formatService(state.resources.serviceQuarters)}</span>
              <span>{JOB_LABELS[state.resources.job]}</span>
              <span>Деньги {state.resources.money}</span>
            </div>

            {(
              [
                "intellect",
                "discipline",
                "social",
                "stress",
                "loyalty",
                "health",
              ] as StatKey[]
            ).map((stat) => (
              <StatRow
                key={stat}
                label={STAT_LABELS[stat]}
                value={state.stats[stat]}
                modifier={getStatModifier(state, stat)}
                tone={STAT_TONES[stat]}
              />
            ))}

            <div className="flag-block">
              <h3>Статусы</h3>
              <div className="flag-list">
                {statuses.length === 0 ? (
                  <span className="muted">Пока тихо.</span>
                ) : (
                  statuses.map((status) => (
                    <span key={status} className="flag-pill">
                      {status}
                    </span>
                  ))
                )}
              </div>
            </div>
          </aside>

          <section className="panel story-panel">
            {state.gameOver ? (
              <EndView state={state} onRestart={resetGame} />
            ) : state.mode === "reveal" ? (
              <RevealView state={state} onContinue={handleContinue} />
            ) : state.mode === "upgrade" ? (
              <UpgradeView onPick={handleUpgrade} />
            ) : currentCard ? (
              <CardView card={currentCard} onChoice={handleChoice} />
            ) : (
              <article className="event-card">
                <h2>Событие не найдено</h2>
                <p className="card-text">Колода не смогла отдать следующую карточку.</p>
                <button className="primary-button" type="button" onClick={resetGame}>
                  Начать заново
                </button>
              </article>
            )}
          </section>
        </div>

        <div className="bottom-actions">
          <button className="ghost-button" type="button" onClick={resetGame}>
            Новая игра
          </button>
        </div>
      </section>
    </main>
  );
}

function CardView({ card, onChoice }: { card: EventCard; onChoice: (optionId: string) => void }) {
  return (
    <article className="event-card">
      <div className="card-topline">
        <span className="arc">{CATEGORY_LABELS[card.category]}</span>
        <span className="kind">{card.kind ?? "обычное"}</span>
      </div>
      <h2>{card.title}</h2>
      <p className="card-text">{card.text}</p>

      <div className="choice-grid">
        {card.options.map((option) => (
          <button key={option.id} className="choice-button" type="button" onClick={() => onChoice(option.id)}>
            <span>{option.label}</span>
            <small>{option.summary}</small>
            {option.check ? (
              <div className="check-meta">
                {STAT_LABELS[option.check.stat]} · DC {option.check.dc}
                {option.check.difficultyLabel ? ` · ${option.check.difficultyLabel}` : ""}
              </div>
            ) : null}
          </button>
        ))}
      </div>
    </article>
  );
}

function RevealView({ state, onContinue }: { state: GameState; onContinue: () => void }) {
  const resolution = state.resolution;
  const check = state.lastCheckResult;

  return (
    <article className="event-card reveal-card">
      <div className="card-topline">
        <span className="arc">Результат</span>
        <span className={`kind ${check?.success ? "success" : check ? "failure" : ""}`}>
          {check ? (check.success ? "успех" : "провал") : "без проверки"}
        </span>
      </div>
      <h2>{resolution?.title ?? "Выбор обработан"}</h2>
      <p className="card-text">{resolution?.detail ?? "Ход завершён."}</p>

      {check ? (
        <div className="roll-box">
          <span>{STAT_LABELS[check.stat]}</span>
          <strong>
            d20 {check.roll} + {check.modifier} = {check.total} / DC {check.dc}
          </strong>
        </div>
      ) : null}

      {resolution?.changes.length ? (
        <ul className="result-list">
          {resolution.changes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="micro-note">Состояние не изменилось.</p>
      )}

      <button className="primary-button" type="button" onClick={onContinue}>
        Следующий квартал
      </button>
    </article>
  );
}

function UpgradeView({ onPick }: { onPick: (stat: StatKey) => void }) {
  const options: Array<{ stat: StatKey; label: string; summary: string }> = [
    { stat: "intellect", label: "Интеллект +1", summary: "Лучше решать задачи и проходить техпроверки." },
    { stat: "discipline", label: "Дисциплина +1", summary: "Надёжнее тянуть дедлайны и длинные циклы." },
    { stat: "social", label: "Соцкапитал +1", summary: "Сильнее держаться на связях и разговорах." },
    { stat: "stress", label: "Стресс -1", summary: "Снизить базовую накопленную перегрузку." },
    { stat: "loyalty", label: "Лояльность +1", summary: "Спокойнее проходить давление системы." },
    { stat: "health", label: "Здоровье +1", summary: "Чуть устойчивее переживать длинную карьеру." },
  ];

  return (
    <article className="event-card">
      <div className="card-topline">
        <span className="arc">Прогрессия</span>
        <span className="kind">рост</span>
      </div>
      <h2>Квартальный рост</h2>
      <p className="card-text">Каждые восемь кварталов ты закрепляешь одно улучшение. Выбери, во что превратить накопленный опыт.</p>

      <div className="choice-grid">
        {options.map((option) => (
          <button key={option.stat} className="choice-button" type="button" onClick={() => onPick(option.stat)}>
            <span>{option.label}</span>
            <small>{option.summary}</small>
          </button>
        ))}
      </div>
    </article>
  );
}

function EndView({ state, onRestart }: { state: GameState; onRestart: () => void }) {
  return (
    <article className="event-card end-card">
      <div className="card-topline">
        <span className="arc">Финал</span>
        <span className="kind">итог</span>
      </div>
      <h2>Игра окончена</h2>
      <p className="card-text">{state.ending ?? "Карьера завершена."}</p>
      <div className="summary-grid">
        <div>
          <span>Должность</span>
          <strong>{JOB_LABELS[state.resources.job]}</strong>
        </div>
        <div>
          <span>Возраст</span>
          <strong>{formatAge(state.resources.age)}</strong>
        </div>
        <div>
          <span>Деньги</span>
          <strong>{state.resources.money}</strong>
        </div>
        <div>
          <span>Рейтинг</span>
          <strong>{state.retirementScore ?? 0}</strong>
        </div>
      </div>
      <button className="primary-button" type="button" onClick={onRestart}>
        Начать заново
      </button>
    </article>
  );
}

function StatRow({
  label,
  value,
  modifier,
  tone,
}: {
  label: string;
  value: number;
  modifier: number;
  tone: string;
}) {
  return (
    <div className="stat-row">
      <div className="stat-label">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="stat-track stat-track-inline" aria-hidden="true">
        <div className="stat-fill" style={{ width: statBar(value), background: tone }} />
      </div>
      <span className="modifier-pill">{modifier >= 0 ? `+${modifier}` : modifier}</span>
    </div>
  );
}
