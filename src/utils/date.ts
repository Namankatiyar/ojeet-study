/** Get YYYY-MM-DD string for a Date in local timezone */
export function toDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Get today's date as YYYY-MM-DD */
export function today(): string {
    return toDateString(new Date());
}

/** Get date N days ago */
export function daysAgo(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}

/** Generate array of dates from start to end (inclusive) */
export function dateRange(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);

    while (current <= endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

/** Short month names */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function monthName(monthIndex: number): string {
    return MONTHS[monthIndex] ?? '';
}

/** Day-of-week names (starting Sunday) */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function dayName(dayIndex: number): string {
    return DAYS[dayIndex] ?? '';
}
