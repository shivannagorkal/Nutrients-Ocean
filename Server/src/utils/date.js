export function getTodayISTDateString() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date()); // Returns YYYY-MM-DD
}

export function getCurrentMonthStartISTDateString() {
  const today = getTodayISTDateString();
  return `${today.slice(0, 7)}-01`;
}

export function parseISTDate(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export function offsetDate(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function isValidDateString(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function generateDateRange(fromStr, toStr) {
  const dates = [];
  let curr = fromStr;
  while (curr <= toStr) {
    dates.push(curr);
    curr = offsetDate(curr, 1);
  }
  return dates;
}

export function getMondayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = dt.getUTCDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  return offsetDate(dateStr, diffToMonday);
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${d}`;
}

export function formatWeekLabel(mondayStr) {
  const sundayStr = offsetDate(mondayStr, 6);
  const [, m1, d1] = mondayStr.split('-').map(Number);
  const [, m2, d2] = sundayStr.split('-').map(Number);
  if (m1 === m2) {
    return `${MONTH_NAMES[m1 - 1]} ${d1} - ${d2}`;
  }
  return `${MONTH_NAMES[m1 - 1]} ${d1} - ${MONTH_NAMES[m2 - 1]} ${d2}`;
}

export function formatMonthLabel(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}
