export type StatKey = "tech" | "stress" | "health" | "loyalty" | "reputation" | "money";
export type JobLevel = "MNS" | "SNS" | "ZAVLAB" | "DIRECTOR";

export type Flags = Record<string, boolean | string>;
export type Counters = {
  age: number;
  yearsOfService: number;
  jobLevel: JobLevel;
  clearance: number;
};

export type Stats = Record<StatKey, number>;

export type GameState = {
  stats: Stats;
  counters: Counters;
  flags: Flags;
  turn: number;
  eventId: string | null;
  eventSeed: string | null;
  seenEvents: string[];
  cooldowns: Record<string, number>;
  log: LogEntry[];
  gameOver: boolean;
  ending?: string;
};

export type LogEntry = {
  title: string;
  detail: string;
};

export type Conditions = {
  minAge?: number;
  maxAge?: number;
  minYearsOfService?: number;
  maxYearsOfService?: number;
  jobLevel?: JobLevel | JobLevel[];
  statMin?: Partial<Stats>;
  statMax?: Partial<Stats>;
  flags?: Record<string, boolean | string>;
  notFlags?: Record<string, boolean | string>;
  seenEvent?: string;
};

export type StatDelta = Partial<Record<StatKey, number>>;

export type ChoiceEffect = {
  stats?: StatDelta;
  age?: number;
  yearsOfService?: number;
  jobLevel?: JobLevel;
  clearance?: number;
  setFlags?: Record<string, boolean | string>;
  unsetFlags?: string[];
  addCooldown?: Record<string, number>;
  endGame?: string;
  logTitle?: string;
  logDetail?: string;
};

export type EventChoice = {
  label: string;
  outcome: ChoiceEffect;
};

export type EventCard = {
  id: string;
  title: string;
  arc: string;
  text: string;
  kind?: "regular" | "milestone" | "crisis";
  conditions?: Conditions;
  weight?: number;
  cooldownTurns?: number;
  once?: boolean;
  priority?: number;
  choices: {
    yes: EventChoice;
    no: EventChoice;
  };
};

export type ResolvedTurn = {
  state: GameState;
  log: LogEntry;
};
