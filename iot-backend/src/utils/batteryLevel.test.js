import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  estimateBatteryPercent,
  median,
  RISE_DEADBAND,
  smoothedBatteryPercent,
} from './batteryLevel.js';

describe('estimateBatteryPercent', () => {
  it('pins the ends of the curve', () => {
    assert.equal(estimateBatteryPercent(2.9), 0);
    assert.equal(estimateBatteryPercent(4.3), 100);
  });

  it('interpolates between the points', () => {
    // Halfway from 3.72V (50%) to 3.78V (60%).
    assert.equal(Math.round(estimateBatteryPercent(3.75)), 55);
  });

  it('says nothing about a device that reports no voltage', () => {
    assert.equal(estimateBatteryPercent(null), null);
    assert.equal(estimateBatteryPercent(undefined), null);
  });
});

describe('median', () => {
  it('takes the middle value, not the average', () => {
    // The point of the whole exercise: one absurd sample must not move it.
    assert.equal(median([3.7, 3.71, 4.9, 3.72, 3.69]), 3.71);
  });

  it('averages the middle pair when the count is even', () => {
    assert.equal(median([3.7, 3.8]), 3.75);
  });

  it('ignores what is not a number', () => {
    assert.equal(median([3.7, null, 'x', 3.9, undefined]), 3.8);
  });

  it('has nothing to say about nothing', () => {
    assert.equal(median([]), null);
  });
});

describe('smoothedBatteryPercent', () => {
  it('reports the reading when there is no history to go on', () => {
    assert.equal(smoothedBatteryPercent({ voltage: 3.72 }), 50);
  });

  it('holds still while an unplugged battery jitters', () => {
    // The exact complaint, from real data: 3.71V read 48%, the next minute
    // 3.72V read 50%, and the device had been off the charger the whole time.
    const shown = smoothedBatteryPercent({
      voltage: 3.72,
      recentVoltages: [3.71, 3.73, 3.73, 3.71],
      previousPercent: 50,
    });

    assert.equal(shown, 50);
  });

  it('follows the battery down', () => {
    const shown = smoothedBatteryPercent({
      voltage: 3.54,
      recentVoltages: [3.55, 3.55, 3.55, 3.56],
      previousPercent: 50,
    });

    assert.ok(shown < 50);
  });

  it('will not creep upward by less than the deadband', () => {
    const shown = smoothedBatteryPercent({
      voltage: 3.73,
      recentVoltages: [3.73, 3.73],
      previousPercent: 50,
    });

    assert.equal(shown, 50);
  });

  it('believes a rise once it is big enough to be a charger', () => {
    const shown = smoothedBatteryPercent({
      voltage: 3.78,
      recentVoltages: [3.78, 3.78],
      previousPercent: 50,
    });

    assert.ok(shown - 50 >= RISE_DEADBAND);
    assert.equal(shown, 60);
  });

  it('shows a swapped battery straight away', () => {
    const shown = smoothedBatteryPercent({
      voltage: 4.15,
      recentVoltages: [4.15, 4.14],
      previousPercent: 8,
    });

    assert.ok(shown > 95);
  });

  it('shrugs off the nonsense a device sends as it powers on', () => {
    // One device booted reading 3.28V, then 4.11V, seconds apart.
    const shown = smoothedBatteryPercent({
      voltage: 3.28,
      recentVoltages: [3.9, 3.9, 3.89, 3.9],
      previousPercent: 79,
    });

    assert.equal(shown, 79);
  });

  it('says nothing when no voltage came through at all', () => {
    assert.equal(
      smoothedBatteryPercent({ voltage: null, previousPercent: 50 }),
      null,
    );
  });

  it('ignores a zero volt sample rather than calling the battery flat', () => {
    // Zero is a missing field, not a dead cell: the parser defaults to 0 when
    // the status block is absent, and a fridge must not be declared flat by it.
    const shown = smoothedBatteryPercent({
      voltage: 0,
      recentVoltages: [3.8, 3.8, 3.81],
      previousPercent: 62,
    });

    assert.equal(shown, 62);
  });
});
