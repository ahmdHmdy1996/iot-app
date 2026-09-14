/**
 * How far the device's own clock may sit from the arrival time and still be
 * believed.
 *
 * Generous on the "behind" side on purpose: a device that loses connectivity
 * buffers its readings and uploads them when it reconnects, so a reading that
 * is genuinely a day old is exactly the case this whole column exists to
 * record. Tight on the "ahead" side, because a reading from the future is
 * never legitimate - it is a wrong clock.
 *
 * The far end catches the failure that matters: an RTC with no backup battery
 * resets to its manufacturing date after a power cut, and stamps every reading
 * somewhere around the year 2000. Writing that down as fact would be worse
 * than having no device time at all.
 */
const MAX_BEHIND_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_AHEAD_MS = 60 * 60 * 1000; // 1 hour, room for a timezone slip

/**
 * Decide whether to trust the device's clock for one reading.
 *
 * @param {Date|null|undefined} rtcUtc the time the device reported
 * @param {Date} arrivedAt when the packet reached us
 * @returns {{recordedAt: Date|null, clockTrusted: boolean}}
 */
export function resolveReadingTime(rtcUtc, arrivedAt) {
  if (!(rtcUtc instanceof Date) || Number.isNaN(rtcUtc.getTime())) {
    return { recordedAt: null, clockTrusted: false };
  }

  const drift = arrivedAt.getTime() - rtcUtc.getTime();
  const trusted = drift <= MAX_BEHIND_MS && drift >= -MAX_AHEAD_MS;

  // An untrusted clock still returns null rather than a corrected guess: the
  // arrival time is already stored, and inventing a device time would make the
  // gap between the two - the thing that reveals an outage - meaningless.
  return {
    recordedAt: trusted ? rtcUtc : null,
    clockTrusted: trusted,
  };
}

export const CLOCK_LIMITS = { MAX_BEHIND_MS, MAX_AHEAD_MS };
