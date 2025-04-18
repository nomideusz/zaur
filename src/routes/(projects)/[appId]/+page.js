import { getAppById } from '$lib/config/apps.js';
import { error } from '@sveltejs/kit';

export function load({ params }) {
    const { appId } = params;
    const app = getAppById(appId);
    
    if (!app) {
        throw error(404, 'App not found');
    }
    
    return {
        app
    };
} 