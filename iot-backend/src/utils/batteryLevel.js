/**
 * Turning a battery voltage into the percentage a person reads on a card.
 *
 * The device sends one instantaneous voltage sample per reading, at 10mV
 * resolution, and a Li-Ion discharge curve is steep in the middle: between
 * 3.65V and 3.78V a single 10mV step is worth about 2%. So a battery that is
 * quietly draining reads 48%, then 50%, then 52%, then 48% again — the cell is
 * doing nothing unusual, the sampling noise is simply being amplified by the
 * curve. Out of one real day of readings from a device on battery, 343 of 1470
 * showed the percentage going *up* while it was unplugged, one of them by 32
 * points. That is what makes people say the reading is wrong.
 *
 * Two things are done about it here, and both are about what gets displayed —
 * the raw voltage is still stored untouched on every reading.
 */

/**
 * Li-Ion open-circuit voltage against remaining charge.
 *
 * Deliberately not a straight line: a Li-Ion cell sits near 3.7V for most of
 * its life and then falls off quickly, so linear voltage would report a
 * half-full battery as nearly flat for hours.
 */
export const VOLTAGE_CURVE = [
  { v: 3.0, p: 0 },
  { v: 3.3, p: 5 },
  { v: 3.45, p: 10 },
  { v: 3.55, p: 20 },
  { v: 3.65, p: 35 },
  { v: 3.72, p: 50 },
  { v: 3.78, p: 60 },
  { v: 3.85, p: 75 },
  { v: 3.92, p: 85 },
  { v: 4.0, p: 92 },
  { v: 4.1, p: 97 },
  { v: 4.2, p: 100 },
];

/** How many recent samples the displayed percentage is taken across. */
export const SMOOTHING_WINDOW = 5;

/**
 * How far back those samples may come from.
 *
 * A device normally reports once a minute, so five samples is five minutes and
 * this changes nothing. A device that has slowed to one reading an hour is the
 * case worth guarding: without a limit its window would span five hours and the
 * card would show a battery level from this morning. Old samples are dropped
 * instead, and a sparse reporter falls back toward its latest reading.
 */
export const SMOOTHING_WINDOW_MS = 15 * 60 * 1000;

/**
 * How far the percentage must climb before a rise is believed.
 *
 * A device on a charger climbs past this within a few minutes and is reported
 * honestly. Sampling noise never does, so an unplugged battery only ever falls.
 */
export const RISE_DEADBAND = 5;

/**
 * A value that is genuinely a number, as opposed to one that merely survives
 * `Number()`. `Number(null)` is 0, and a missing voltage read as zero volts is
 * how a healthy fridge gets reported as flat.
 */
function asNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Charge remaining at a given voltage, interpolated along the curve. */
export function estimateBatteryPercent(voltage) {
  const v = asNumber(voltage);
  if (v === null) return null;
  if (v <= VOLTAGE_CURVE[0].v) return 0;
  if (v >= VOLTAGE_CURVE[VOLTAGE_CURVE.length - 1].v) return 100;

  for (let i = 1; i < VOLTAGE_CURVE.length; i++) {
    if (v <= VOLTAGE_CURVE[i].v) {
      const { v: v0, p: p0 } = VOLTAGE_CURVE[i - 1];
      const { v: v1, p: p1 } = VOLTAGE_CURVE[i];
      const t = (v - v0) / (v1 - v0);
      return Math.max(0, Math.min(100, p0 + t * (p1 - p0)));
    }
  }
  return 100;
}

/**
 * The middle value, which ignores a single wild sample instead of averaging it
 * in. The first packet after a power-on is often nonsense — one device read
 * 3.28V and then 4.11V seconds apart — and a mean would carry that for the
 * whole window where a median drops it.
 */
export function median(values) {
  const sorted = values
    .map(asNumber)
    .filter((n) => n !== null)
    .sort((a, b) => a - b);

  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * The percentage to show for a device, given its newest voltage, the voltages
 * just before it, and what was last shown.
 *
 * @param {object} input
 * @param {number|null} input.voltage          newest sample, in volts
 * @param {number[]} [input.recentVoltages]    earlier samples, newest first
 * @param {number|null} [input.previousPercent] what the device last displayed
 * @returns {number|null} whole percent, or null when there is nothing to say
 */
export function smoothedBatteryPercent({
  voltage,
  recentVoltages = [],
  previousPercent = null,
}) {
  const window = [voltage, ...recentVoltages]
    .map(asNumber)
    .filter((n) => n !== null && n > 0)
    .slice(0, SMOOTHING_WINDOW);

  const smoothed = median(window);
  if (smoothed === null) return null;

  const candidate = Math.round(estimateBatteryPercent(smoothed));

  const last = asNumber(previousPercent);
  if (last === null) return candidate;

  // Falls are taken as they come; only a rise has to prove itself.
  if (candidate <= last) return candidate;
  return candidate - last >= RISE_DEADBAND ? candidate : last;
}
