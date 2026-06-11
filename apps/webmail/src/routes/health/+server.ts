import { json, type RequestHandler } from '@sveltejs/kit';

/** Liveness probe for CapRover / load balancers. Intentionally dependency-free. */
export const GET: RequestHandler = () => json({ status: 'ok' });
