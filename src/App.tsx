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
    const parsed = JSON.parse(raw) as Partial<GameState>;
    return {
      ...createInitialState(),
      ...parsed,
      stats: { ...createInitialState().stats, ...(parsed.stats ?? {}) },
      counters: { ...createInitialState().counters, ...(parsed.counters ?? {}) },
      flags: parsed.flags ?? {},
      seenEvents: parsed.seenEvents ?? [],
      cooldowns: parsed.cooldowns ?? {},
      resolution: parsed.resolution ?? createInitialState().resolution,
      mode: parsed.mode ?? "event",
      eventId: parsed.eventId ?? createInitialState().eventId,
      nextEventId: parsed.nextEventId ?? null,
      eventSeed: parsed.eventSeed ?? null,
      gameOver: parsed.gameOver ?? false,
      ending: parsed.ending,
    };
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

  function resetGame() {
    localStorage.removeItem(STORAGE_KEY);
    setState(createInitialState());
  }

  function continueToNextEvent() {
    setState((prev) => {
      if (prev.gameOver || prev.mode !== "reveal") {
        return prev;
      }

      if (!prev.nextEventId) {
        return {
          ...prev,
          gameOver: true,
          mode: "ended",
          eventId: null,
          nextEventId: null,
          resolution: {
            title: "Конец колоды",
            detail: "Колода исчерпана. НИИ продолжает жить без ярких происшествий.",
            changes: [],
          },
          ending: "Колода исчерпана. НИИ продолжает жить без ярких происшествий.",
        };
      }

      const nextCard = CARDS.find((card) => card.id === prev.nextEventId) ?? null;
      if (!nextCard) {
        return {
          ...prev,
          gameOver: true,
          mode: "ended",
          eventId: null,
          nextEventId: null,
          resolution: {
            title: "Архив",
            detail: "Следующая карточка потерялась в архиве.",
            changes: [],
          },
          ending: "Следующая карточка потерялась в архиве.",
        };
      }

      return {
        ...prev,
        mode: "event",
        eventId: nextCard.id,
        nextEventId: null,
        eventSeed: nextCard.arc,
      };
    });
  }

  function takeTurn(choice: "yes" | "no") {
    if (!currentCard || state.gameOver) {
      return;
    }

    setState((prev) => {
      const resolved = resolveChoice(prev, currentCard, choice);
      if (resolved.state.gameOver) {
        return {
          ...resolved.state,
          eventId: null,
          nextEventId: null,
          mode: "ended",
        };
      }

      const advanced = advanceTurn(resolved.state);
      const promoted = useMilestoneJobPromotion(advanced);
      const nextCard = pickNextEvent(promoted);

      if (!nextCard) {
        return {
          ...promoted,
          eventId: null,
          nextEventId: null,
          mode: "ended",
          gameOver: true,
          resolution: {
            title: resolved.resolution.title,
            detail: resolved.resolution.detail,
            changes: resolved.resolution.changes,
          },
          ending: "Колода исчерпана. НИИ продолжает жить без ярких происшествий.",
        };
      }

      return {
        ...promoted,
        eventId: null,
        nextEventId: nextCard.id,
        mode: "reveal",
        resolution: {
          title: resolved.resolution.title,
          detail: resolved.resolution.detail,
          changes: resolved.resolution.changes,
        },
      };
    });
  }

  return (
    <main className="app-shell">
      <section className="layout">
        <div className="board">
          <aside className="panel stats-panel">
            <div className="compact-metrics">
              <span>Возраст {state.counters.age}</span>
              <span>Стаж {state.counters.yearsOfService}</span>
              <span>{state.counters.jobLevel}</span>
            </div>
            <StatRow label="Компетенция" value={state.stats.tech} tone="var(--gold)" />
            <StatRow label="Стресс" value={state.stats.stress} tone="var(--red)" />
            <StatRow label="Здоровье" value={state.stats.health} tone="var(--green)" />
            <StatRow label="Лояльность" value={state.stats.loyalty} tone="var(--blue)" />
            <StatRow label="Авторитет" value={state.stats.reputation} tone="var(--amber)" />
            <StatRow label="Сбережения" value={state.stats.money} tone="var(--cream)" />

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
            {state.gameOver ? (
              <EndView state={state} onRestart={resetGame} />
            ) : state.mode === "reveal" ? (
              <RevealView state={state} onContinue={continueToNextEvent} />
            ) : currentCard ? (
              <CardView card={currentCard} onChoice={takeTurn} />
            ) : null}
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

function RevealView({
  state,
  onContinue,
}: {
  state: GameState;
  onContinue: () => void;
}) {
  const resolution = state.resolution;
  return (
    <article className="event-card reveal-card">
      <div className="card-topline">
        <span className="arc">result</span>
        <span className="kind">result</span>
      </div>
      <h2>{resolution?.title ?? "Событие записано"}</h2>
      <p className="card-text">{resolution?.detail ?? "Выбор обработан."}</p>
      {resolution?.changes?.length ? (
        <ul className="result-list">
          {resolution.changes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="micro-note">Изменений нет.</p>
      )}
      <button className="primary-button" type="button" onClick={onContinue}>
        Продолжить
      </button>
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

function StatRow({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="stat-row">
      <div className="stat-label">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="stat-track stat-track-inline" aria-hidden="true">
        <div className="stat-fill" style={{ width: statBar(value), background: tone }} />
      </div>
    </div>
  );
}
