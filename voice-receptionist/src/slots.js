// Free-slot calculation behind the `verificar_disponibilidade` tool (n8n Code node).
// Times are local clinic time ("YYYY-MM-DDTHH:mm"), events come from Google Calendar.

const toMinutes = hhmm => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const toHHMM = mins => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

// Minutes since midnight for an ISO-like local timestamp on `date`, clamped to the day.
function minutesOnDate(ts, date) {
  const [d, t = '00:00'] = String(ts).split('T');
  if (d < date) return 0;
  if (d > date) return 24 * 60;
  return toMinutes(t.slice(0, 5));
}

/**
 * @param {object} o
 * @param {string} o.date        YYYY-MM-DD requested by the caller
 * @param {string} [o.period]    "morning" | "afternoon" (or pt-PT "manha" | "tarde") | "" (any)
 * @param {Array<{start:string,end:string}>} o.events  busy events (local time)
 * @param {string} o.now         current local time "YYYY-MM-DDTHH:mm"
 * @param {object} [o.hours]     { open: "08:00", close: "19:00", lunch: ["13:00","14:00"] }
 * @param {number} [o.slotMinutes=30]
 * @param {number} [o.max=3]     how many options to read out on the phone
 * @param {number[]} [o.closedWeekdays=[0]]  0 = Sunday
 */
function computeFreeSlots({ date, period = '', events = [], now, hours = {}, slotMinutes = 30, max = 3, closedWeekdays = [0] }) {
  period = { manha: 'morning', tarde: 'afternoon' }[period] || period;
  const open = toMinutes(hours.open || '08:00');
  const close = toMinutes(hours.close || '19:00');
  const lunch = (hours.lunch || []).map(toMinutes);

  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (closedWeekdays.includes(weekday)) return { available: false, slots: [], reason: 'CLOSED' };

  const [nowDate, nowTime] = String(now).split('T');
  if (date < nowDate) return { available: false, slots: [], reason: 'PAST_DATE' };
  const earliest = date === nowDate ? toMinutes(nowTime.slice(0, 5)) : 0;

  const busy = events.map(e => [minutesOnDate(e.start, date), minutesOnDate(e.end, date)]);
  if (lunch.length === 2) busy.push(lunch);

  const slots = [];
  for (let s = open; s + slotMinutes <= close; s += slotMinutes) {
    const e = s + slotMinutes;
    if (s < earliest) continue;
    if (period === 'morning' && s >= 13 * 60) continue;
    if (period === 'afternoon' && s < 13 * 60) continue;
    if (busy.some(([bs, be]) => s < be && e > bs)) continue;
    slots.push(toHHMM(s));
  }

  // Spread the options across the period instead of reading three consecutive slots.
  const picked = slots.length <= max
    ? slots
    : Array.from({ length: max }, (_, i) => slots[Math.round(i * (slots.length - 1) / (max - 1))]);

  return { available: picked.length > 0, slots: picked, reason: picked.length ? 'OK' : 'FULLY_BOOKED' };
}

module.exports = { computeFreeSlots };
