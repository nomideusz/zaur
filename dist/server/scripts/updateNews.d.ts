/**
 * Fetch and update news data with RethinkDB
 * @returns {Promise<{added: number, updated: number, total: number}>} Update result information
 */
export function fetchAndUpdateNews(): Promise<{
    added: number;
    updated: number;
    total: number;
}>;
/**
 * Initialize scheduled news updates using node-schedule
 * Updates will occur every 3 hours
 * @returns {schedule.Job} The scheduled job
 */
export function initializeNewsUpdates(): schedule.Job;
import * as schedule from 'node-schedule';
