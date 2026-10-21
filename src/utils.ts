/** Remove checklist labels for display while preserving the original topic and its ID. */
export function formatTopicName(name: string): string {
  return name
    .replace(/^\s*\[[ABC]\]\s*/i, '')
    .replace(/^\s*(?:LP|DPP|DPC|DP|DC|DA|LI|AT|MAT|INF|RL|RED)-\d{3}\s*(?:[—–-]\s*)?/i, '')
    .replace(/^\s*\d+\s*[.)-]\s*/, '')
    .replace(/\s*\(grupo:\s*(?:[A-Z]+-\d{3}[,\s]*)+\)\s*$/i, '')
    .trim();
}

/** Format minutes as minutes or hours and minutes. */
export function formatMinutes(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes);
  if (rounded < 60) {
    return `${rounded} min`;
  }
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return `${h}h ${String(m).padStart(2, '0')}min`;
}

/**
 * Format decimal hours (e.g. 1.8) into the standard hours and minutes style.
 */
export function formatHours(hours: number): string {
  return formatMinutes(hours * 60);
}

/**
 * Returns the local date string in YYYY-MM-DD format.
 */
export function getLocalDateString(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Extracts and normalizes the YYYY-MM-DD date key from an ActivityLog object.
 * Always prioritizes the explicit log.date property over createdAtMs.
 */
export function getLogDateKey(log: { date?: string; createdAtMs?: number }): string {
  if (log.date) {
    if (log.date.includes('-')) {
      const parts = log.date.split('-');
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    } else if (log.date.includes('/')) {
      const parts = log.date.split('/');
      if (parts[2]?.length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return log.date;
  }
  if (log.createdAtMs) {
    return getLocalDateString(new Date(log.createdAtMs));
  }
  return '';
}

/**
 * Recursively removes any keys with `undefined` values from an object or array
 * so that Firestore setDoc / updateDoc calls do not fail with "Unsupported field value: undefined".
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

/**
 * Returns the start of the week (Sunday at 00:00:00.000) for a given reference date.
 */
export function getStartOfWeek(referenceDate: Date = new Date()): Date {
  const d = new Date(referenceDate);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  d.setDate(d.getDate() - day);
  return d;
}

/**
 * Returns the end of the week (Sunday at 00:00:00.000 of the following week) for a given reference date.
 */
export function getEndOfWeek(referenceDate: Date = new Date()): Date {
  const start = getStartOfWeek(referenceDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return end;
}

/**
 * Checks if a given date input (string "YYYY-MM-DD" or "DD/MM/YYYY", timestamp ms, or Date object)
 * falls within the current week (Sunday 00:00:00 to Saturday 23:59:59).
 */
export function isDateInCurrentWeek(dateInput: string | number | Date, referenceDate: Date = new Date()): boolean {
  if (!dateInput && dateInput !== 0) return false;
  const start = getStartOfWeek(referenceDate);
  const end = getEndOfWeek(referenceDate);

  let d: Date | null = null;
  if (typeof dateInput === 'number') {
    d = new Date(dateInput);
  } else if (dateInput instanceof Date) {
    d = dateInput;
  } else if (typeof dateInput === 'string') {
    if (dateInput.includes('-')) {
      const parts = dateInput.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
        } else if (parts[2].length === 4) {
          // DD-MM-YYYY
          d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10), 12, 0, 0);
        }
      }
    } else if (dateInput.includes('/')) {
      const parts = dateInput.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          // DD/MM/YYYY
          d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10), 12, 0, 0);
        } else if (parts[0].length === 4) {
          // YYYY/MM/DD
          d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
        }
      }
    }
    if (!d || isNaN(d.getTime())) {
      d = new Date(dateInput);
    }
  }

  if (!d || isNaN(d.getTime())) return false;

  return d >= start && d < end;
}

