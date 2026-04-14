export type StatKey = "intellect" | "discipline" | "social" | "stress" | "loyalty" | "health";
export type JobKey = "junior" | "engineer" | "senior" | "lead";
export type EventCategory = "work" | "learning" | "social" | "risk" | "health" | "career" | "inspection";
export type EventKind = "regular" | "milestone" | "crisis" | "inspection";

export type Stats = Record<StatKey, number>;

export type ResourceState = {
  money: number;
  age: number;
  serviceQuarters: number;
  suspicionRisk: number;
  job: JobKey;
};

export type CheckDefinition = {
  stat: StatKey;
  dc: number;
  difficultyLabel?: string;
};

export type CheckResult = {
  stat: StatKey;
  roll: number;
  modifier: number;
  total: number;
  dc: number;
  success: boolean;
  difficultyLabel?: string;
};

export type EffectPayload = {
  title?: string;
  detail?: string;
  stats?: Partial<Record<StatKey, number>>;
  resources?: Partial<Record<"money" | "suspicionRisk", number>>;
  setFlags?: string[];
  clearFlags?: string[];
  addTimedEffects?: TimedEffect[];
  removeTimedEffects?: string[];
  addPerks?: string[];
  setJob?: JobKey;
  endGame?: string;
};

export type EventOption = {
  id: string;
  label: string;
  summary: string;
  check?: CheckDefinition;
  onPick?: EffectPayload;
  onSuccess?: EffectPayload;
  onFailure?: EffectPayload;
};

export type EventConditions = {
  minAge?: number;
  maxAge?: number;
  minServiceQuarters?: number;
  maxServiceQuarters?: number;
  jobs?: JobKey[];
  statMin?: Partial<Record<StatKey, number>>;
  statMax?: Partial<Record<StatKey, number>>;
  minSuspicionRisk?: number;
  maxSuspicionRisk?: number;
  hasFlags?: string[];
  missingFlags?: string[];
  hasPerks?: string[];
  seenEvent?: string;
};

export type EventCard = {
  id: string;
  title: string;
  category: EventCategory;
  kind?: EventKind;
  text: string;
  weight?: number;
  cooldown?: number;
  once?: boolean;
  priority?: number;
  conditions?: EventConditions;
  options: EventOption[];
};

export type TimedEffect = {
  id: string;
  label: string;
  duration: number;
  visible?: boolean;
  perTurn?: EffectPayload;
  checkBonuses?: Partial<Record<StatKey, number>>;
  categoryWeights?: Partial<Record<EventCategory | "inspection" | "crisis", number>>;
};

export type Resolution = {
  title: string;
  detail: string;
  changes: string[];
};

export type UIMode = "event" | "reveal" | "upgrade" | "ended";

export type GameState = {
  stats: Stats;
  resources: ResourceState;
  flags: Record<string, boolean>;
  timedEffects: TimedEffect[];
  perks: string[];
  turn: number;
  currentEventId: string | null;
  seenEvents: string[];
  cooldowns: Record<string, number>;
  resolution: Resolution | null;
  lastCheckResult: CheckResult | null;
  mode: UIMode;
  gameOver: boolean;
  ending?: string;
  retirementScore: number | null;
  lastUpgradeAtQuarter: number;
};
