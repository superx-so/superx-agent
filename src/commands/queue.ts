import { SuperXAPI, printJson, note } from "../api";
import { getConfig } from "../config";

/**
 * Queue settings commands — the SuperX Edit Queue modal over the API: the
 * predefined posting time slots and the timezone they are read in.
 *
 * Slots are JSON so the weekday sets stay unambiguous:
 *   --slots-json '[{"time":"09:00","days":[1,3,5]}]'   (0 = Sunday)
 * The list is a FULL REPLACE; '[]' clears every predefined slot.
 *
 * Changing the timezone and the slots in one call usually moves nothing,
 * because the existing posts were placed under the old timezone; to re-flow
 * them, change the timezone first, then send the slots in a second call.
 */

export async function queueGet(argv: { account?: string }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.getQueueSettings({ account_id: argv.account }));
}

export async function queueSet(argv: {
  account?: string;
  "slots-json"?: string;
  timezone?: string;
}): Promise<void> {
  const body: Record<string, any> = {};

  if (argv["slots-json"] !== undefined) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(argv["slots-json"]);
    } catch {
      note('--slots-json must be valid JSON, e.g. \'[{"time":"09:00","days":[1,3,5]}]\'');
      process.exit(1);
    }
    if (!Array.isArray(parsed)) {
      note('--slots-json must be a JSON array, e.g. \'[{"time":"09:00","days":[1,3,5]}]\' (use \'[]\' to clear).');
      process.exit(1);
    }
    body.slots = parsed;
  }

  if (argv.timezone !== undefined) {
    body.timezone = argv.timezone;
  }

  if (Object.keys(body).length === 0) {
    note("Provide --slots-json and/or --timezone. Run: superx queue:set --help");
    process.exit(1);
  }

  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  printJson(await api.updateQueueSettings(body));
}
