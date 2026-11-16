/**
 * Robust CSV parser handling quotes, escaped quotes, and commas inside fields
 * @param {string} csvText
 * @returns {Array<Object>} Array of row objects with trimmed header keys
 */
export function parseCSV(csvText) {
  const lines = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if (char === '\n' && !insideQuotes) {
      currentRow.push(currentField);
      if (currentRow.some((f) => f.trim().length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((f) => f.trim().length > 0)) {
      lines.push(currentRow);
    }
  }

  if (lines.length < 2) return [];

  const headers = lines[0].map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = [];

  for (let r = 1; r < lines.length; r++) {
    const values = lines[r];
    const rowObj = {};
    for (let c = 0; c < headers.length; c++) {
      rowObj[headers[c]] = values[c] !== undefined ? values[c].trim().replace(/^"|"$/g, '') : '';
    }
    rows.push(rowObj);
  }

  return rows;
}

/**
 * Parse M/D/YYYY or MM/DD/YYYY strictly into YYYY-MM-DD
 * @param {string} dateStr
 * @returns {string} YYYY-MM-DD
 */
export function parseMDYDate(dateStr) {
  if (!dateStr) throw new Error('Empty date string');
  const clean = dateStr.trim().split(' ')[0]; // remove time if present
  const parts = clean.split('/');
  if (parts.length !== 3) {
    // Check if already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    throw new Error(`Invalid date format (expected M/D/YYYY): "${dateStr}"`);
  }

  const m = parseInt(parts[0], 10);
  const d = parseInt(parts[1], 10);
  const y = parseInt(parts[2], 10);

  if (isNaN(m) || isNaN(d) || isNaN(y) || m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) {
    throw new Error(`Invalid date values in: "${dateStr}"`);
  }

  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

/**
 * Parse timestamp with explicit IST offset
 * @param {string} timestampStr
 * @param {string} fallbackDate YYYY-MM-DD
 * @returns {string} ISO timestamp with +05:30
 */
export function parseISTTimestamp(timestampStr, fallbackDate) {
  if (!timestampStr || timestampStr.trim() === '') {
    return `${fallbackDate}T12:00:00+05:30`;
  }

  const clean = timestampStr.trim();
  const spaceIdx = clean.indexOf(' ');

  if (spaceIdx === -1) {
    const ymd = parseMDYDate(clean);
    return `${ymd}T12:00:00+05:30`;
  }

  const datePart = clean.substring(0, spaceIdx);
  const timePart = clean.substring(spaceIdx + 1).trim();

  const ymd = parseMDYDate(datePart);
  const timeTokens = timePart.split(':');
  let hh = parseInt(timeTokens[0] || '12', 10);
  let mm = parseInt(timeTokens[1] || '00', 10);
  let ss = parseInt(timeTokens[2] || '00', 10);

  // Handle AM/PM if present
  if (timePart.toLowerCase().includes('pm') && hh < 12) hh += 12;
  if (timePart.toLowerCase().includes('am') && hh === 12) hh = 0;

  const hStr = String(hh).padStart(2, '0');
  const mStr = String(mm).padStart(2, '0');
  const sStr = String(ss).padStart(2, '0');

  return `${ymd}T${hStr}:${mStr}:${sStr}+05:30`;
}

/**
 * Clean currency string to number
 * @param {string|number} val
 * @returns {number}
 */
export function cleanCurrency(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[₹,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
