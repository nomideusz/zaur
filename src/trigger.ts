// trigger.ts (for TypeScript) or trigger.js (for JavaScript)

import { TriggerClient } from "@trigger.dev/sdk";
import { TRIGGER_API_KEY, TRIGGER_API_URL } from "$env/static/private";

export const client = new TriggerClient({
  id: "zaur",
  apiKey: TRIGGER_API_KEY,
  apiUrl: TRIGGER_API_URL,
});
