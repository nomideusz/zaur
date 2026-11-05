/** Date arithmetic for the browser: days are strings, read at noon UTC so a date stays whole. */
export const addDayStr = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
export const perWord = (hours: number) => (hours === 1 ? 'an hour' : `${hours} hours`);
