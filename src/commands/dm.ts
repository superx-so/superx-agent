import fs from "fs";
import { SuperXAPI, printJson, note } from "../api";
import { getConfig } from "../config";

/**
 * DM campaigns — queue direct messages into the account's own DM pipeline.
 *
 * NOTHING here sends a message. A campaign is an ENQUEUE: the SuperX app's
 * scheduler sends the rows inside the account's daily and monthly DM limits,
 * so every reply is counts, not deliveries. Unsent rows can be cancelled.
 */

/** Read the recipients JSON from a file, or from stdin when the path is "-". */
function readRecipients(source: string): any {
  let raw: string;
  if (source === "-") {
    try {
      raw = fs.readFileSync(0, "utf8");
    } catch (err: any) {
      note(`Could not read recipients from stdin: ${err?.message || err}`);
      process.exit(1);
    }
  } else {
    try {
      raw = fs.readFileSync(source, "utf8");
    } catch (err: any) {
      note(`Could not read ${source}: ${err?.message || err}`);
      process.exit(1);
    }
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw!);
  } catch (err: any) {
    note(`--recipients must be JSON: ${err?.message || err}`);
    process.exit(1);
  }

  // Accept either a bare array or the { recipients: [...] } envelope, so a
  // saved API response can be piped straight back in.
  const list = Array.isArray(parsed) ? parsed : parsed?.recipients;
  if (!Array.isArray(list) || list.length === 0) {
    note("--recipients must be a non-empty JSON array of { x_user_id, handle?, name?, message? }.");
    process.exit(1);
  }
  return list;
}

export async function dmCampaign(argv: {
  recipients: string;
  message?: string;
  spread?: boolean;
  "idempotency-key"?: string;
  account?: string;
}): Promise<void> {
  const api = new SuperXAPI(getConfig());
  const recipients = readRecipients(argv.recipients);

  const body: Record<string, unknown> = { recipients };
  if (argv.message !== undefined) body.message = argv.message;
  if (argv.spread === true) body.spread = true;
  if (argv.account) body.account_id = argv.account;

  const { json, replayed } = await api.queueDmCampaign(body, argv["idempotency-key"]);
  if (replayed) note("Replayed a previous response for this Idempotency-Key. Nothing new was queued.");
  printJson(json);
  note("Queued only. The SuperX app sends these within your DM limits; cancel the unsent ones with dm:cancel.");
}

export async function dmCampaignStatus(argv: {
  id: string;
  account?: string;
}): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.getDmCampaign(argv.id, { account_id: argv.account }));
}

export async function dmCancel(argv: {
  id: string;
  account?: string;
}): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.cancelDmCampaign(argv.id, { account_id: argv.account }));
}

export async function dmQueue(argv: {
  limit?: number;
  offset?: number;
  status?: string;
  campaign?: string;
  account?: string;
}): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(
    await api.listDmQueue({
      limit: argv.limit,
      offset: argv.offset,
      status: argv.status,
      campaign_id: argv.campaign,
      account_id: argv.account,
    })
  );
}

export async function dmLimits(argv: { account?: string }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.getDmLimits({ account_id: argv.account }));
}
