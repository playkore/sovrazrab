import { useEffect, useMemo, useState } from "react";
import { CARDS } from "./game/cards";
import { createInitialState, advanceTurn, pickNextEvent, resolveChoice, useMilestoneJobPromotion } from "./game/engine";
import type { EventCard, GameState } from "./game/types";

const STORAGE_KEY = "sovrazrab-save-v1";

function loadState(): GameState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createInitialState();
  }

  try {
    return JSON.parse(raw) as GameState;
  } catch {
    return createInitialState();
  }
}

function saveState(state: GameState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function statBar(value: number) {
  return `${value}%`;
}

function appTitle(state: GameState) {
  if (state.gameOver) {
    return "СовРазраб";
  }
  return `СовРазраб · ${state.counters.age} лет · ${state.counters.jobLevel}`;
}

export default function App() {
  const [state, setState] = useState<GameState>(() => loadState());
  const currentCard = useMemo(
    () => (state.eventId ? CARDS.find((card) => card.id === state.eventId) ?? null : null),
    [state.eventId],
  );

  useEffect(() => {
    saveState(state);
    document.title = appTitle(state);
  }, [state]);

  useEffect(() => {
    if (state.gameOver) {
      return;
    }
    if (state.eventId) {
      return;
    }

    const nextEvent = pickNextEvent(state);
    if (!nextEvent) {
      setState((prev) => ({
        ...prev,
        eventId: null,
        gameOver: true,
        ending: "Колода исчерпана. НИИ продолжает жить без ярких происшествий.",
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      eventId: nextEvent.id,
      eventSeed: nextEvent.arc,
    }));
  }, [state]);

  function resetGame() {
    localStorage.removeItem(STORAGE_KEY);
    setState(createInitialState());
  }

  function takeTurn(choice: "yes" | "no") {
    if (!currentCard || state.gameOver) {
      return;
    }

    setState((prev) => {
      const resolved = resolveChoice(prev, currentCard, choice);
      const advanced = advanceTurn(resolved.state);
      const promoted = useMilestoneJobPromotion(advanced);

      return {
        ...promoted,
        eventId: null,
      };
    });
  }

  return (
    <main className="app-shell">
      <div className="background-orbit background-orbit-left" />
      <div className="background-orbit background-orbit-right" />

      <section className="layout">
        <header className="hero">
          <div>
            <p className="eyebrow">НИИ-2077</p>
            <h1>СовРазраб</h1>
            <p className="subtitle">
              Нарративный симулятор жизни про кибернетика, бюрократию и выживание внутри
              советского ретро-футуризма.
            </p>
          </div>

          <div className="top-meta">
            <div className="meta-chip">Год: {state.counters.age}</div>
            <div className="meta-chip">Стаж: {state.counters.yearsOfService}</div>
            <div className="meta-chip">Должность: {state.counters.jobLevel}</div>
          </div>
        </header>

        <div className="board">
          <aside className="panel stats-panel">
            <h2>Состояние</h2>
            <Stat label="Компетенция" value={state.stats.tech} tone="var(--gold)" />
            <Stat label="Стресс" value={state.stats.stress} tone="var(--red)" />
            <Stat label="Здоровье" value={state.stats.health} tone="var(--green)" />
            <Stat label="Лояльность" value={state.stats.loyalty} tone="var(--blue)" />
            <Stat label="Авторитет" value={state.stats.reputation} tone="var(--amber)" />
            <Stat label="Сбережения" value={state.stats.money} tone="var(--cream)" />

            <div className="flag-block">
              <h3>Флаги</h3>
              <div className="flag-list">
                {Object.entries(state.flags).length === 0 ? (
                  <span className="muted">Пока пусто.</span>
                ) : (
                  Object.entries(state.flags).map(([key, value]) => (
                    <span key={key} className="flag-pill">
                      {key}: {String(value)}
                    </span>
                  ))
                )}
              </div>
            </div>
          </aside>

          <section className="panel story-panel">
            {!state.gameOver && currentCard ? (
              <CardView card={currentCard} onChoice={takeTurn} />
            ) : (
              <EndView state={state} onRestart={resetGame} />
            )}
          </section>

          <aside className="panel log-panel">
            <div className="panel-heading">
              <h2>Журнал</h2>
              <button className="ghost-button" type="button" onClick={resetGame}>
                Новая игра
              </button>
            </div>

            <ol className="log-list">
              {state.log.map((entry, index) => (
                <li key={`${entry.title}-${index}`}>
                  <strong>{entry.title}</strong>
                  <span>{entry.detail}</span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>
    </main>
  );
}

function CardView({ card, onChoice }: { card: EventCard; onChoice: (choice: "yes" | "no") => void }) {
  return (
    <article className="event-card">
      <div className="card-topline">
        <span className="arc">{card.arc}</span>
        <span className="kind">{card.kind ?? "regular"}</span>
      </div>
      <h2>{card.title}</h2>
      <p className="card-text">{card.text}</p>

      <div className="choice-grid">
        <button className="choice-button yes" type="button" onClick={() => onChoice("yes")}>
          <span>Да</span>
          <small>{card.choices.yes.label}</small>
        </button>
        <button className="choice-button no" type="button" onClick={() => onChoice("no")}>
          <span>Нет</span>
          <small>{card.choices.no.label}</small>
        </button>
      </div>
    </article>
  );
}

function EndView({ state, onRestart }: { state: GameState; onRestart: () => void }) {
  const ending = state.ending ?? "Пенсионный комитет завершил карьеру.";
  return (
    <article className="event-card end-card">
      <div className="card-topline">
        <span className="arc">ending</span>
        <span className="kind">final</span>
      </div>
      <h2>Игра окончена</h2>
      <p className="card-text">{ending}</p>
      <p className="card-text">
        Итог: {state.counters.jobLevel}, здоровье {state.stats.health}, стресс {state.stats.stress}, авторитет{" "}
        {state.stats.reputation}.
      </p>
      <button className="primary-button" type="button" onClick={onRestart}>
        Начать заново
      </button>
    </article>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="stat-row">
      <div className="stat-label">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="stat-track" aria-hidden="true">
        <div className="stat-fill" style={{ width: statBar(value), background: tone }} />
      </div>
    </div>
  );
}
