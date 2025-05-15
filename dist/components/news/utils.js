// Utility function to format dates
export function formatDate(date) {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
    else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    else {
        return 'Just now';
    }
}
// Create a deterministic selection based on today's date
export function getTimeSeed() {
    const now = new Date();
    // Create a seed using YYYYMMDD format
    return now.getFullYear() * 10000 +
        (now.getMonth() + 1) * 100 +
        now.getDate();
}
// Create a deterministic selection based on hour
export function getHourSeed() {
    const now = new Date();
    // Create a seed using YYYYMMDDHH format
    return getTimeSeed() * 100 + now.getHours();
}
// Deterministic pseudo-random number generator
export function seededRandom(seed) {
    // Simple LCG pseudo-random number generator
    // Parameters from "Numerical Recipes"
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);
    // Get next value in the sequence
    let nextSeed = (a * seed + c) % m;
    // Return a value between 0 and 1
    return nextSeed / m;
}
// Deterministic shuffle using a seed
export function seededShuffle(array, seed) {
    const result = [...array];
    let currentSeed = seed;
    // Fisher-Yates shuffle with deterministic randomness
    for (let i = result.length - 1; i > 0; i--) {
        currentSeed = (1664525 * currentSeed + 1013904223) % Math.pow(2, 32);
        const j = Math.floor((currentSeed / Math.pow(2, 32)) * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
// Simple hash function for deterministic selection
export function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}
// Utility function to decode HTML entities
export function decodeHtmlEntities(text) {
    if (!text)
        return '';
    if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    }
    return text;
}
