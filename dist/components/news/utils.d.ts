export declare function formatDate(date: Date): string;
export declare function getTimeSeed(): number;
export declare function getHourSeed(): number;
export declare function seededRandom(seed: number): number;
export declare function seededShuffle<T>(array: T[], seed: number): T[];
export declare function hashString(str: string): number;
export declare function decodeHtmlEntities(text: string): string;
