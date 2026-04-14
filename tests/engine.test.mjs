import test from "node:test";
import assert from "node:assert/strict";

import { EVENT_INDEX } from "../src/game/cards.ts";
import {
  continueGame,
  createInitialState,
  getStatModifier,
  pickNextEvent,
  resolveOption,
} from "../src/game/engine.ts";

function sequenceRng(...values) {
  let index = 0;
  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };
}

test("choice without check resolves and next quarter advances", () => {
  const onboarding = EVENT_INDEX.get("onboarding");
  assert.ok(onboarding);

  const state = createInitialState(() => 0);
  const resolved = resolveOption(state, onboarding, "accept", () => 0);
  assert.equal(resolved.mode, "reveal");
  assert.equal(resolved.resources.money, 6);

  const advanced = continueGame(resolved, () => 0.2);
  assert.equal(advanced.mode, "event");
  assert.equal(advanced.resources.serviceQuarters, 1);
  assert.equal(advanced.resources.age, 22.25);
});

test("checks resolve success and failure from d20 rolls", () => {
  const event = EVENT_INDEX.get("perforated_cards");
  assert.ok(event);

  const state = createInitialState(() => 0);

  const success = resolveOption(state, event, "rebuild", sequenceRng(0.95));
  assert.equal(success.lastCheckResult?.success, true);
  assert.equal(success.stats.intellect, 12);

  const failure = resolveOption(state, event, "rebuild", sequenceRng(0));
  assert.equal(failure.lastCheckResult?.success, false);
  assert.equal(failure.stats.social, 8);
});

test("modifier includes flags, perks and timed effects", () => {
  const state = createInitialState(() => 0);
  state.stats.social = 10;
  state.flags.good_reputation = true;
  state.perks.push("connected");
  state.timedEffects.push({
    id: "briefing",
    label: "Подготовка",
    duration: 2,
    checkBonuses: { social: 1 },
  });

  assert.equal(getStatModifier(state, "social"), 5);
});

test("high suspicion prioritizes inspection events", () => {
  const state = createInitialState(() => 0);
  state.resources.age = 30;
  state.resources.serviceQuarters = 16;
  state.resources.suspicionRisk = 14;
  state.seenEvents.push("onboarding");
  state.currentEventId = null;

  const nextEvent = pickNextEvent(state, () => 0.1);
  assert.ok(nextEvent);
  assert.equal(nextEvent.kind, "inspection");
});

test("critical stress pulls burnout crisis", () => {
  const state = createInitialState(() => 0);
  state.resources.age = 30;
  state.resources.serviceQuarters = 20;
  state.stats.stress = 18;
  state.seenEvents.push("onboarding");

  const nextEvent = pickNextEvent(state, () => 0.5);
  assert.ok(nextEvent);
  assert.equal(nextEvent.id, "burnout");
});

test("retirement milestone appears at pension age", () => {
  const state = createInitialState(() => 0);
  state.resources.age = 60;
  state.resources.serviceQuarters = 152;
  state.seenEvents.push("onboarding");
  state.currentEventId = null;

  const nextEvent = pickNextEvent(state, () => 0.5);
  assert.ok(nextEvent);
  assert.equal(nextEvent.id, "pension_committee");
});
