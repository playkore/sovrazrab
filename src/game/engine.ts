import { CARDS } from "./cards";
import type { ChoiceEffect, EventCard, GameState, LogEntry, Stats } from "./types";

const STAT_KEYS: Array<keyof Stats> = ["tech", "stress", "health", "loyalty", "reputation", "money"];

export function createInitialState(): GameState {
  const initialState: GameState = {
    stats: {
      tech: 18,
      stress: 12,
      health: 72,
      loyalty: 38,
      reputation: 25,
      money: 18,
    },
    counters: {
      age: 22,
      yearsOfService: 0,
      jobLevel: "MNS",
      clearance: 1,
    },
    flags: {},
    turn: 0,
    eventId: null,
    eventSeed: null,
    seenEvents: [],
    cooldowns: {},
    log: [
      {
        title: "Начало",
        detail: "Распределение в НИИ Вычислительных Машин только что оформлено.",
      },
    ],
    gameOver: false,
  };

  const firstEvent = pickNextEvent(initialState);
  return {
    ...initialState,
    eventId: firstEvent?.id ?? null,
    eventSeed: firstEvent?.arc ?? null,
  };
}

export function clampStat(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function applyEffect(state: GameState, effect: ChoiceEffect): GameState {
  const next = structuredClone(state) as GameState;

  for (const key of STAT_KEYS) {
    const delta = effect.stats?.[key];
    if (typeof delta === "number") {
      next.stats[key] = clampStat(next.stats[key] + delta);
    }
  }

  if (typeof effect.age === "number") {
    next.counters.age += effect.age;
  }
  if (typeof effect.yearsOfService === "number") {
    next.counters.yearsOfService += effect.yearsOfService;
  }
  if (effect.jobLevel) {
    next.counters.jobLevel = effect.jobLevel;
  }
  if (typeof effect.clearance === "number") {
    next.counters.clearance = Math.max(0, effect.clearance);
  }
  if (effect.setFlags) {
    for (const [key, value] of Object.entries(effect.setFlags)) {
      next.flags[key] = value;
    }
  }
  if (effect.unsetFlags) {
    for (const key of effect.unsetFlags) {
      delete next.flags[key];
    }
  }
  if (effect.addCooldown) {
    for (const [id, turns] of Object.entries(effect.addCooldown)) {
      next.cooldowns[id] = Math.max(next.cooldowns[id] ?? 0, turns);
    }
  }
  if (effect.endGame) {
    next.gameOver = true;
    next.ending = effect.endGame;
  }

  return next;
}

export function evaluateConditions(card: EventCard, state: GameState): boolean {
  const conditions = card.conditions;
  if (!conditions) {
    return true;
  }

  if (typeof conditions.minAge === "number" && state.counters.age < conditions.minAge) {
    return false;
  }
  if (typeof conditions.maxAge === "number" && state.counters.age > conditions.maxAge) {
    return false;
  }
  if (
    typeof conditions.minYearsOfService === "number" &&
    state.counters.yearsOfService < conditions.minYearsOfService
  ) {
    return false;
  }
  if (
    typeof conditions.maxYearsOfService === "number" &&
    state.counters.yearsOfService > conditions.maxYearsOfService
  ) {
    return false;
  }

  if (conditions.jobLevel) {
    const allowed = Array.isArray(conditions.jobLevel) ? conditions.jobLevel : [conditions.jobLevel];
    if (!allowed.includes(state.counters.jobLevel)) {
      return false;
    }
  }

  for (const [key, value] of Object.entries(conditions.statMin ?? {})) {
    if (state.stats[key as keyof Stats] < value) {
      return false;
    }
  }
  for (const [key, value] of Object.entries(conditions.statMax ?? {})) {
    if (state.stats[key as keyof Stats] > value) {
      return false;
    }
  }
  for (const [key, value] of Object.entries(conditions.flags ?? {})) {
    if (state.flags[key] !== value) {
      return false;
    }
  }
  for (const [key, value] of Object.entries(conditions.notFlags ?? {})) {
    if (state.flags[key] === value) {
      return false;
    }
  }
  if (conditions.seenEvent && !state.seenEvents.includes(conditions.seenEvent)) {
    return false;
  }

  return true;
}

export function buildCandidatePool(state: GameState): EventCard[] {
  return CARDS.filter((card) => {
    if (card.once && state.seenEvents.includes(card.id)) {
      return false;
    }
    if (state.cooldowns[card.id] && state.cooldowns[card.id] > 0) {
      return false;
    }
    return evaluateConditions(card, state);
  });
}

function weightedRandom<T extends { weight?: number }>(items: T[], seed: number): T | null {
  if (items.length === 0) {
    return null;
  }

  const totalWeight = items.reduce((sum, item) => sum + Math.max(1, item.weight ?? 1), 0);
  let roll = seed % totalWeight;

  for (const item of items) {
    roll -= Math.max(1, item.weight ?? 1);
    if (roll < 0) {
      return item;
    }
  }

  return items[0] ?? null;
}

export function pickNextEvent(state: GameState): EventCard | null {
  const pool = buildCandidatePool(state);
  if (pool.length === 0) {
    return null;
  }

  const crisis = pool
    .filter((card) => card.kind === "crisis")
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  if (crisis.length > 0) {
    return crisis[0] ?? null;
  }

  const milestones = pool
    .filter((card) => card.kind === "milestone")
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  if (milestones.length > 0) {
    return milestones[0] ?? null;
  }

  const regular = pool
    .filter((card) => card.kind !== "milestone" && card.kind !== "crisis")
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  const topPriority = regular[0]?.priority ?? 0;
  const topPool = regular.filter((card) => (card.priority ?? 0) === topPriority);
  return weightedRandom(topPool, state.turn + state.counters.age + state.stats.tech + state.stats.reputation);
}

export function advanceTurn(state: GameState): GameState {
  const next = structuredClone(state) as GameState;
  next.turn += 1;
  next.counters.age += 1;
  next.counters.yearsOfService += 1;
  next.stats.health = clampStat(next.stats.health - 1 + (next.stats.stress > 75 ? -1 : 0));
  next.stats.stress = clampStat(next.stats.stress + (next.stats.health < 30 ? 2 : 1));
  next.stats.money = clampStat(next.stats.money - 1);

  for (const [id, turns] of Object.entries(next.cooldowns)) {
    const updated = turns - 1;
    if (updated <= 0) {
      delete next.cooldowns[id];
    } else {
      next.cooldowns[id] = updated;
    }
  }

  return next;
}

export function resolveChoice(
  state: GameState,
  card: EventCard,
  choiceKey: "yes" | "no",
): { state: GameState; log: LogEntry } {
  const choice = card.choices[choiceKey];
  const afterEffect = applyEffect(state, {
    ...choice.outcome,
    addCooldown: {
      [card.id]: card.cooldownTurns ?? 0,
      ...(choice.outcome.addCooldown ?? {}),
    },
  });

  const next = structuredClone(afterEffect) as GameState;
  next.seenEvents = Array.from(new Set([...next.seenEvents, card.id]));
  next.log = [
    {
      title: choice.outcome.logTitle ?? card.title,
      detail: choice.outcome.logDetail ?? card.text,
    },
    ...next.log,
  ].slice(0, 8);

  const log = next.log[0] ?? {
    title: card.title,
    detail: card.text,
  };

  return { state: next, log };
}

export function useMilestoneJobPromotion(state: GameState): GameState {
  const next = structuredClone(state) as GameState;
  if (next.counters.age >= 25 && next.counters.jobLevel === "MNS") {
    next.counters.jobLevel = "SNS";
    next.counters.clearance = Math.max(next.counters.clearance, 2);
    next.log = [{ title: "Повышение", detail: "Тебя переводят в СНС." }, ...next.log].slice(0, 8);
  }
  if (next.counters.age >= 35 && next.counters.jobLevel === "SNS" && next.stats.reputation >= 45) {
    next.counters.jobLevel = "ZAVLAB";
    next.counters.clearance = Math.max(next.counters.clearance, 3);
    next.log = [{ title: "Новая должность", detail: "Ты стал завлабом." }, ...next.log].slice(0, 8);
  }
  if (next.counters.age >= 50 && next.counters.jobLevel === "ZAVLAB" && next.stats.loyalty >= 55) {
    next.counters.jobLevel = "DIRECTOR";
    next.counters.clearance = Math.max(next.counters.clearance, 4);
    next.log = [{ title: "Директорский этаж", detail: "Ты поднялся до руководства." }, ...next.log].slice(0, 8);
  }
  return next;
}
