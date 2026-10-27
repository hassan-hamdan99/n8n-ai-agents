// Idempotency guard behind the `criar_marcacao` tool.
// Voice agents sometimes call the booking tool twice (the caller corrects a detail after
// confirming, or the model retries after a slow response). Before creating an event we
// look for an existing booking for the same patient on the same day and return it instead.

const normalize = s => String(s || '')
  .normalize('NFD').replace(/\p{M}/gu, '')
  .toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * @param {Array<{id:string, summary:string, start:string}>} dayEvents  events already on that day
 * @param {{ name:string, phone?:string }} booking
 * @returns {object|null} the existing event, or null if a new one may be created
 */
function findExistingBooking(dayEvents, booking) {
  const name = normalize(booking.name);
  if (!name) return null;
  const phone = String(booking.phone || '').replace(/\D/g, '');
  return dayEvents.find(ev => {
    const text = normalize(`${ev.summary} ${ev.description || ''}`);
    const digits = String(ev.description || '').replace(/\D/g, '');
    return text.includes(name) || (phone.length >= 9 && digits.includes(phone));
  }) || null;
}

function validateBooking(b, now) {
  const missing = ['name', 'phone', 'start'].filter(k => !String(b[k] || '').trim());
  if (missing.length) return { ok: false, reason: `MISSING:${missing.join(',')}` };
  if (String(b.phone).replace(/\D/g, '').length < 9) return { ok: false, reason: 'INCOMPLETE_PHONE' };
  if (b.start < now) return { ok: false, reason: 'PAST_DATE' };
  return { ok: true };
}

module.exports = { findExistingBooking, validateBooking, normalize };
