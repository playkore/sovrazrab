import { EVENTS, EVENT_INDEX } from "./cards.ts";
import type {
  CheckDefinition,
  CheckResult,
  EffectPayload,
  EventCard,
  EventCategory,
  GameState,
  JobKey,
  Resolution,
  StatKey,
  Stats,
  TimedEffect,
} from "./types.ts";

type RandomSource = () => number;

const STAT_KEYS: StatKey[] = ["intellect", "discipline", "social", "stress", "loyalty", "health"];
const MAX_STAT = 20;
const UPGRADE_INTERVAL = 8;

const FLAG_RULES: Record<
  string,
  {
    label: string;
    visible?: boolean;
    checkBonuses?: Partial<Record<StatKey, number>>;
    categoryWeights?: Partial<Record<EventCategory | "inspection" | "crisis", number>>;
  }
> = {
  under_watch: {
    label: "На карандаше",
    visible: true,
    categoryWeights: { inspection: 6, risk: 2 },
  },
  good_reputation: {
    label: "Хорошая репутация",
    visible: true,
    checkBonuses: { social: 2 },
    categoryWeights: { social: 2, career: 2 },
  },
  chronic_stress: {
    label: "Хронический стресс",
    visible: true,
    checkBonuses: { discipline: -1, intellect: -1 },
    categoryWeights: { health: 3, crisis: 4 },
  },
  access_sensitive_data: {
    label: "Доступ к данным",
    visible: true,
    checkBonuses: { intellect: 1 },
    categoryWeights: { inspection: 3, risk: 3, work: 1 },
  },
  trusted_by_boss: {
    label: "Доверие начальства",
    visible: true,
    checkBonuses: { discipline: 1, social: 1 },
    categoryWeights: { career: 3, work: 2 },
  },
};

const PERK_RULES: Record<
  string,
  {
    label: string;
    checkBonuses?: Partial<Record<StatKey, number>>;
    categoryWeights?: Partial<Record<EventCategory | "inspection" | "crisis", number>>;
  }
> = {
  methodical: {
    label: "Перк: Методичность",
    checkBonuses: { intellect: 2, discipline: 1 },
    categoryWeights: { learning: 2, work: 1 },
  },
  connected: {
    label: "Перк: Связи",
    checkBonuses: { social: 2 },
    categoryWeights: { social: 2, inspection: 1, career: 1 },
  },
};

export const STAT_LABELS: Record<StatKey, string> = {
  intellect: "Интеллект",
  discipline: "Дисциплина",
  social: "Соцкапитал",
  stress: "Стресс",
  loyalty: "Лояльность",
  health: "Здоровье",
};

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  work: "Работа",
  learning: "Обучение",
  social: "Социальное",
  risk: "Риск",
  health: "Здоровье",
  career: "Карьера",
  inspection: "Проверка",
};

export const JOB_LABELS: Record<JobKey, string> = {
  junior: "МНС",
  engineer: "Инженер",
  senior: "СНС",
  lead: "Завлаб",
};

export function createInitialState(rng: RandomSource = Math.random): GameState {
  const state: GameState = {
    stats: {
      intellect: 11,
      discipline: 10,
      social: 9,
      stress: 6,
      loyalty: 10,
      health: 11,
    },
    resources: {
      money: 5,
      age: 22,
      serviceQuarters: 0,
      suspicionRisk: 2,
      job: "junior",
    },
    flags: {},
    timedEffects: [],
    perks: [],
    turn: 0,
    currentEventId: null,
    seenEvents: [],
    cooldowns: {},
    resolution: {
      title: "Начало",
      detail: "Ты входишь в НИИ в роли молодого специалиста.",
      changes: [],
    },
    lastCheckResult: null,
    mode: "event",
    gameOver: false,
    retirementScore: null,
    lastUpgradeAtQuarter: 0,
  };

  const firstEvent = pickNextEvent(state, rng);
  return {
    ...state,
    currentEventId: firstEvent?.id ?? null,
  };
}

export function getEventById(eventId: string | null): EventCard | null {
  if (!eventId) {
    return null;
  }
  return EVENT_INDEX.get(eventId) ?? null;
}

export function clampStat(value: number): number {
  return Math.max(0, Math.min(MAX_STAT, Math.round(value)));
}

function clampMoney(value: number): number {
  return Math.round(value);
}

function clampRisk(value: number): number {
  return Math.max(0, Math.min(MAX_STAT, Math.round(value)));
}

function cloneState<T>(value: T): T {
  return structuredClone(value);
}

function getSourceBonus(state: GameState, stat: StatKey): number {
  let total = 0;

  for (const flag of Object.keys(state.flags)) {
    total += FLAG_RULES[flag]?.checkBonuses?.[stat] ?? 0;
  }
  for (const perk of state.perks) {
    total += PERK_RULES[perk]?.checkBonuses?.[stat] ?? 0;
  }
  for (const effect of state.timedEffects) {
    total += effect.checkBonuses?.[stat] ?? 0;
  }

  return total;
}

export function getStatModifier(state: GameState, stat: StatKey): number {
  return Math.floor((state.stats[stat] - 10) / 2) + getSourceBonus(state, stat);
}

export function getVisibleStatuses(state: GameState): string[] {
  const labels = new Set<string>();

  for (const flag of Object.keys(state.flags)) {
    const rule = FLAG_RULES[flag];
    if (rule?.visible) {
      labels.add(rule.label);
    }
  }
  for (const effect of state.timedEffects) {
    if (effect.visible) {
      labels.add(effect.label);
    }
  }
  for (const perk of state.perks) {
    const rule = PERK_RULES[perk];
    if (rule) {
      labels.add(rule.label);
    }
  }

  return Array.from(labels);
}

export function getSuspicionLabel(risk: number): string {
  if (risk >= 14) {
    return "высокий";
  }
  if (risk >= 8) {
    return "заметный";
  }
  return "низкий";
}

export function formatAge(age: number): string {
  const wholeYears = Math.floor(age);
  const quarterIndex = Math.round((age - wholeYears) * 4);
  if (quarterIndex <= 0) {
    return `${wholeYears} лет`;
  }
  return `${wholeYears} лет, Q${quarterIndex + 1}`;
}

function roundAge(age: number): number {
  return Math.round(age * 100) / 100;
}

function getCategoryWeightBonus(
  state: GameState,
  category: EventCategory | "inspection" | "crisis",
): number {
  let total = 0;

  for (const flag of Object.keys(state.flags)) {
    total += FLAG_RULES[flag]?.categoryWeights?.[category] ?? 0;
  }
  for (const perk of state.perks) {
    total += PERK_RULES[perk]?.categoryWeights?.[category] ?? 0;
  }
  for (const effect of state.timedEffects) {
    total += effect.categoryWeights?.[category] ?? 0;
  }

  return total;
}

function getCardWeight(card: EventCard, state: GameState): number {
  const base = card.weight ?? 1;
  const categoryKey =
    card.kind === "inspection"
      ? "inspection"
      : card.kind === "crisis"
        ? "crisis"
        : card.category;
  return Math.max(1, base + getCategoryWeightBonus(state, categoryKey));
}

function weightedPick<T>(items: T[], weightFn: (item: T) => number, rng: RandomSource): T | null {
  if (items.length === 0) {
    return null;
  }

  const totalWeight = items.reduce((sum, item) => sum + weightFn(item), 0);
  let roll = rng() * totalWeight;

  for (const item of items) {
    roll -= weightFn(item);
    if (roll <= 0) {
      return item;
    }
  }

  return items[items.length - 1] ?? null;
}

export function evaluateConditions(card: EventCard, state: GameState): boolean {
  const conditions = card.conditions;
  if (!conditions) {
    return true;
  }

  if (typeof conditions.minAge === "number" && state.resources.age < conditions.minAge) {
    return false;
  }
  if (typeof conditions.maxAge === "number" && state.resources.age > conditions.maxAge) {
    return false;
  }
  if (
    typeof conditions.minServiceQuarters === "number" &&
    state.resources.serviceQuarters < conditions.minServiceQuarters
  ) {
    return false;
  }
  if (
    typeof conditions.maxServiceQuarters === "number" &&
    state.resources.serviceQuarters > conditions.maxServiceQuarters
  ) {
    return false;
  }
  if (conditions.jobs && !conditions.jobs.includes(state.resources.job)) {
    return false;
  }
  if (
    typeof conditions.minSuspicionRisk === "number" &&
    state.resources.suspicionRisk < conditions.minSuspicionRisk
  ) {
    return false;
  }
  if (
    typeof conditions.maxSuspicionRisk === "number" &&
    state.resources.suspicionRisk > conditions.maxSuspicionRisk
  ) {
    return false;
  }

  for (const [key, value] of Object.entries(conditions.statMin ?? {})) {
    if (state.stats[key as StatKey] < value) {
      return false;
    }
  }
  for (const [key, value] of Object.entries(conditions.statMax ?? {})) {
    if (state.stats[key as StatKey] > value) {
      return false;
    }
  }
  for (const flag of conditions.hasFlags ?? []) {
    if (!state.flags[flag]) {
      return false;
    }
  }
  for (const flag of conditions.missingFlags ?? []) {
    if (state.flags[flag]) {
      return false;
    }
  }
  for (const perk of conditions.hasPerks ?? []) {
    if (!state.perks.includes(perk)) {
      return false;
    }
  }
  if (conditions.seenEvent && !state.seenEvents.includes(conditions.seenEvent)) {
    return false;
  }

  return true;
}

function buildCandidatePool(state: GameState): EventCard[] {
  return EVENTS.filter((card) => {
    if (card.once && state.seenEvents.includes(card.id)) {
      return false;
    }
    if ((state.cooldowns[card.id] ?? 0) > 0) {
      return false;
    }
    return evaluateConditions(card, state);
  });
}

function shouldTriggerInspection(state: GameState, rng: RandomSource): boolean {
  const risk = state.resources.suspicionRisk;
  if (risk >= 14) {
    return true;
  }
  if (risk < 8) {
    return false;
  }
  const chance = 0.2 + (risk - 8) * 0.1;
  return rng() < chance;
}

export function pickNextEvent(state: GameState, rng: RandomSource = Math.random): EventCard | null {
  const pool = buildCandidatePool(state);
  if (pool.length === 0) {
    return null;
  }

  const crisisPool = pool
    .filter((card) => card.kind === "crisis")
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  if (crisisPool.length > 0) {
    return weightedPick(crisisPool, (card) => getCardWeight(card, state), rng);
  }

  const inspectionPool = pool.filter((card) => card.kind === "inspection");
  if (inspectionPool.length > 0 && shouldTriggerInspection(state, rng)) {
    return weightedPick(inspectionPool, (card) => getCardWeight(card, state), rng);
  }

  const milestonePool = pool
    .filter((card) => card.kind === "milestone")
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  if (milestonePool.length > 0) {
    return milestonePool[0] ?? null;
  }

  const regularPool = pool.filter((card) => !card.kind || card.kind === "regular");
  return weightedPick(regularPool, (card) => getCardWeight(card, state), rng);
}

function rollDie(sides: number, rng: RandomSource): number {
  return Math.floor(rng() * sides) + 1;
}

export function performCheck(
  state: GameState,
  definition: CheckDefinition,
  rng: RandomSource = Math.random,
): CheckResult {
  const roll = rollDie(20, rng);
  const modifier = getStatModifier(state, definition.stat);
  const total = roll + modifier;

  return {
    stat: definition.stat,
    roll,
    modifier,
    total,
    dc: definition.dc,
    success: total >= definition.dc,
    difficultyLabel: definition.difficultyLabel,
  };
}

function applyEffect(state: GameState, effect?: EffectPayload): GameState {
  if (!effect) {
    return state;
  }

  const next = cloneState(state);

  for (const stat of STAT_KEYS) {
    const delta = effect.stats?.[stat];
    if (typeof delta === "number") {
      next.stats[stat] = clampStat(next.stats[stat] + delta);
    }
  }

  const moneyDelta = effect.resources?.money;
  if (typeof moneyDelta === "number") {
    next.resources.money = clampMoney(next.resources.money + moneyDelta);
  }
  const suspicionDelta = effect.resources?.suspicionRisk;
  if (typeof suspicionDelta === "number") {
    next.resources.suspicionRisk = clampRisk(next.resources.suspicionRisk + suspicionDelta);
  }
  if (effect.setJob) {
    next.resources.job = effect.setJob;
  }
  for (const flag of effect.setFlags ?? []) {
    next.flags[flag] = true;
  }
  for (const flag of effect.clearFlags ?? []) {
    delete next.flags[flag];
  }
  for (const timedEffect of effect.addTimedEffects ?? []) {
    const existingIndex = next.timedEffects.findIndex((item) => item.id === timedEffect.id);
    if (existingIndex >= 0) {
      next.timedEffects[existingIndex] = cloneState(timedEffect);
    } else {
      next.timedEffects.push(cloneState(timedEffect));
    }
  }
  if (effect.removeTimedEffects?.length) {
    next.timedEffects = next.timedEffects.filter((item) => !effect.removeTimedEffects?.includes(item.id));
  }
  for (const perk of effect.addPerks ?? []) {
    if (!next.perks.includes(perk)) {
      next.perks.push(perk);
    }
  }
  if (effect.endGame) {
    next.gameOver = true;
    next.ending = effect.endGame;
  }

  return next;
}

function formatDelta(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function describeStateChanges(before: GameState, after: GameState): string[] {
  const changes: string[] = [];

  for (const stat of STAT_KEYS) {
    const delta = after.stats[stat] - before.stats[stat];
    if (delta !== 0) {
      changes.push(`${STAT_LABELS[stat]} ${formatDelta(delta)}`);
    }
  }

  const moneyDelta = after.resources.money - before.resources.money;
  if (moneyDelta !== 0) {
    changes.push(`Деньги ${formatDelta(moneyDelta)}`);
  }
  const riskDelta = after.resources.suspicionRisk - before.resources.suspicionRisk;
  if (riskDelta !== 0) {
    changes.push(`Риск подозрения ${formatDelta(riskDelta)}`);
  }
  if (after.resources.job !== before.resources.job) {
    changes.push(`Должность ${JOB_LABELS[after.resources.job]}`);
  }

  for (const flag of Object.keys(after.flags)) {
    if (!before.flags[flag]) {
      changes.push(`Статус: ${FLAG_RULES[flag]?.label ?? flag}`);
    }
  }
  for (const flag of Object.keys(before.flags)) {
    if (!after.flags[flag]) {
      changes.push(`Статус снят: ${FLAG_RULES[flag]?.label ?? flag}`);
    }
  }
  for (const effect of after.timedEffects) {
    if (!before.timedEffects.find((item) => item.id === effect.id)) {
      changes.push(`Эффект: ${effect.label}`);
    }
  }
  for (const effect of before.timedEffects) {
    if (!after.timedEffects.find((item) => item.id === effect.id)) {
      changes.push(`Эффект снят: ${effect.label}`);
    }
  }
  for (const perk of after.perks) {
    if (!before.perks.includes(perk)) {
      changes.push(PERK_RULES[perk]?.label ?? `Перк: ${perk}`);
    }
  }

  return changes;
}

function buildResolution(
  card: EventCard,
  optionLabel: string,
  effect: EffectPayload | undefined,
  changes: string[],
): Resolution {
  return {
    title: effect?.title ?? `${card.title}: ${optionLabel}`,
    detail: effect?.detail ?? card.text,
    changes,
  };
}

function applyDerivedFlags(state: GameState): GameState {
  const next = cloneState(state);

  if (next.stats.stress >= 15) {
    next.flags.chronic_stress = true;
  } else {
    delete next.flags.chronic_stress;
  }

  if (next.stats.social >= 12 && !next.flags.under_watch) {
    next.flags.good_reputation = true;
  }

  if (next.stats.social < 9 && !next.seenEvents.includes("onboarding")) {
    delete next.flags.good_reputation;
  }

  return next;
}

function applyPassiveTurnEffects(state: GameState): GameState {
  let next = cloneState(state);
  const updatedEffects: TimedEffect[] = [];

  for (const effect of next.timedEffects) {
    next = applyEffect(next, effect.perTurn);
    const remaining = effect.duration - 1;
    if (remaining > 0) {
      updatedEffects.push({ ...effect, duration: remaining });
    }
  }

  next.timedEffects = updatedEffects;
  return applyDerivedFlags(next);
}

function decrementCooldowns(state: GameState): GameState {
  const next = cloneState(state);
  for (const [eventId, turns] of Object.entries(next.cooldowns)) {
    const remaining = turns - 1;
    if (remaining <= 0) {
      delete next.cooldowns[eventId];
    } else {
      next.cooldowns[eventId] = remaining;
    }
  }
  return next;
}

function applyEndConditions(state: GameState): GameState {
  if (state.gameOver) {
    return state;
  }

  const next = cloneState(state);

  if (next.stats.health <= 0) {
    next.gameOver = true;
    next.ending = "Болезнь. Организм вышел из гонки раньше пенсии.";
  } else if (next.resources.money <= -12) {
    next.gameOver = true;
    next.ending = "Деградация. Денег и опоры не хватило, чтобы удержаться в системе.";
  }

  if (next.gameOver) {
    next.mode = "ended";
    next.currentEventId = null;
    next.retirementScore = computeRetirementScore(next);
  }

  return next;
}

export function computeRetirementScore(state: GameState): number {
  const jobScore: Record<JobKey, number> = {
    junior: 10,
    engineer: 18,
    senior: 28,
    lead: 38,
  };

  const score =
    jobScore[state.resources.job] +
    state.resources.money +
    state.stats.health * 2 +
    state.stats.social * 2 +
    state.stats.loyalty +
    state.stats.intellect +
    state.stats.discipline -
    state.stats.stress * 2 -
    state.resources.suspicionRisk;

  return Math.max(0, Math.round(score));
}

export function resolveOption(
  state: GameState,
  card: EventCard,
  optionId: string,
  rng: RandomSource = Math.random,
): GameState {
  const option = card.options.find((item) => item.id === optionId);
  if (!option || state.gameOver) {
    return state;
  }

  const before = cloneState(state);
  let next = applyEffect(state, option.onPick);
  let resolvedEffect: EffectPayload | undefined;
  let checkResult: CheckResult | null = null;

  if (option.check) {
    checkResult = performCheck(next, option.check, rng);
    resolvedEffect = checkResult.success ? option.onSuccess : option.onFailure;
  } else {
    resolvedEffect = option.onSuccess;
  }

  next = applyEffect(next, resolvedEffect);
  next = applyDerivedFlags(next);
  next.cooldowns[card.id] = Math.max(card.cooldown ?? 0, next.cooldowns[card.id] ?? 0);
  next.seenEvents = Array.from(new Set([...next.seenEvents, card.id]));
  next.lastCheckResult = checkResult;
  next.resolution = buildResolution(card, option.label, resolvedEffect, describeStateChanges(before, next));
  next.mode = next.gameOver ? "ended" : "reveal";
  next.currentEventId = next.gameOver ? null : card.id;

  next = applyEndConditions(next);
  if (next.gameOver) {
    next.retirementScore = computeRetirementScore(next);
  }

  return next;
}

export function continueGame(state: GameState, rng: RandomSource = Math.random): GameState {
  if (state.gameOver || state.mode !== "reveal") {
    return state;
  }

  let next = cloneState(state);
  next.turn += 1;
  next.resources.serviceQuarters += 1;
  next.resources.age = roundAge(next.resources.age + 0.25);
  next.currentEventId = null;
  next = decrementCooldowns(next);
  next = applyPassiveTurnEffects(next);
  next = applyEndConditions(next);

  if (next.gameOver) {
    return next;
  }

  if (
    next.resources.serviceQuarters > 0 &&
    next.resources.serviceQuarters % UPGRADE_INTERVAL === 0 &&
    next.lastUpgradeAtQuarter < next.resources.serviceQuarters
  ) {
    next.mode = "upgrade";
    next.resolution = {
      title: "Рост",
      detail: "Накопленный опыт позволяет закрепить одно улучшение.",
      changes: [],
    };
    return next;
  }

  const nextEvent = pickNextEvent(next, rng);
  if (!nextEvent) {
    return {
      ...next,
      mode: "ended",
      gameOver: true,
      currentEventId: null,
      ending: "Колода событий исчерпана раньше, чем закончилась служба.",
      retirementScore: computeRetirementScore(next),
    };
  }

  next.currentEventId = nextEvent.id;
  next.mode = "event";
  return next;
}

export function applyUpgradeChoice(state: GameState, stat: StatKey, rng: RandomSource = Math.random): GameState {
  if (state.mode !== "upgrade" || state.gameOver) {
    return state;
  }

  const before = cloneState(state);
  const delta = stat === "stress" ? -1 : 1;
  let next = applyEffect(state, {
    title: "Рост закреплён",
    detail:
      stat === "stress"
        ? "Ты научился лучше разгружать себя между кварталами."
        : "Кварталы дали устойчивое улучшение ключевого навыка.",
    stats: { [stat]: delta } as Partial<Stats>,
  });

  next.lastUpgradeAtQuarter = next.resources.serviceQuarters;
  next.resolution = {
    title: "Рост закреплён",
    detail:
      stat === "stress"
        ? "Ты снизил базовый уровень стресса на один пункт."
        : `${STAT_LABELS[stat]} вырос на один пункт.`,
    changes: describeStateChanges(before, next),
  };

  const nextEvent = pickNextEvent(next, rng);
  next.currentEventId = nextEvent?.id ?? null;
  next.mode = nextEvent ? "event" : "ended";
  if (!nextEvent) {
    next.gameOver = true;
    next.ending = "После роста в колоде не осталось подходящих событий.";
    next.retirementScore = computeRetirementScore(next);
  }
  return next;
}
