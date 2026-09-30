/**
 * Smoke-test helper: print a signed `zaur_music` cookie, so the app opens
 * signed in without the trip through mail's sign-in. Run it with the dev
 * server's env (its SESSION_SECRET signs the cookie):
 *
 *   node --env-file-if-exists=.env --import tsx tests/smoke/seed-session.ts
 *
 * Pair it with `fake-navidrome.mjs`; against the real Navidrome this address
 * would get a real user.
 */
import { seal } from '../../src/lib/server/session.ts';

const value = seal({ email: 'smoke@zaur.app', name: 'Smoke Tester', exp: Date.now() + 7 * 24 * 3600_000 });
console.log(`Set this cookie on http://localhost:5176 and open the app:\n  zaur_music=${value}`);
