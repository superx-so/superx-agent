import { SuperXAPI, printJson, note } from "../api";
import { getConfig } from "../config";

export async function scheduledList(argv: {
  account?: string;
  status?: string;
  tags?: string;
  from?: string;
  to?: string;
  limit?: number;
  page?: number;
}): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(
    await api.listScheduled({
      account_id: argv.account,
      status: argv.status,
      tags: argv.tags,
      from: argv.from,
      to: argv.to,
      limit: argv.limit,
      page: argv.page,
    })
  );
}

interface MediaItem {
  object_key: string;
  alt_text?: string;
}

/**
 * Build parts[].media for the single-post case from --media (comma list of
 * object_keys) and --alt-text (allowed with exactly one key).
 */
function mediaFromFlags(mediaFlag?: string, altText?: string): MediaItem[] | null {
  if (!mediaFlag) {
    if (altText !== undefined) {
      note("--alt-text requires --media.");
      process.exit(1);
    }
    return null;
  }
  const keys = mediaFlag
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  if (keys.length === 0) {
    note("--media must be a comma list of object_keys (from media:upload).");
    process.exit(1);
  }
  if (altText !== undefined && keys.length > 1) {
    note("--alt-text works with a single --media key. For per-image alt text use --parts-json.");
    process.exit(1);
  }
  return keys.map((object_key, i) => ({
    object_key,
    ...(altText !== undefined && i === 0 ? { alt_text: altText } : {}),
  }));
}

/** Parse --parts-json: a JSON array of { text, media?: [{ object_key, alt_text? }] }. */
function parsePartsJson(raw: string): Array<{ text: string; media?: MediaItem[] }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    note('--parts-json must be valid JSON, e.g. [{"text":"Hook","media":[{"object_key":"..."}]}]');
    process.exit(1);
    throw new Error("unreachable");
  }
  if (!Array.isArray(parsed) || parsed.some((p: any) => !p || typeof p !== "object" || typeof p.text !== "string")) {
    note("--parts-json must be an array of { text, media? } objects.");
    process.exit(1);
  }
  return parsed as Array<{ text: string; media?: MediaItem[] }>;
}

export async function scheduledCreate(argv: {
  text?: string;
  part?: string[];
  "parts-json"?: string;
  media?: string;
  "alt-text"?: string;
  at?: string;
  title?: string;
  scratchpad?: string;
  tag?: string[];
  account?: string;
  "idempotency-key"?: string;
}): Promise<void> {
  const parts = (argv.part || []).filter((p) => typeof p === "string");
  const sourceCount = [argv.text, parts.length > 0 ? "p" : undefined, argv["parts-json"]].filter(
    (v) => v !== undefined
  ).length;
  if (sourceCount > 1) {
    note("Use exactly one of --text (single post), --part (thread), or --parts-json.");
    process.exit(1);
  }
  if (sourceCount === 0) {
    note("Provide --text for a single post, --part flags for a thread, or --parts-json.");
    process.exit(1);
  }
  if (argv.media !== undefined && !argv.text) {
    note("--media applies to the --text single-post form. For threads, put media in --parts-json.");
    process.exit(1);
  }

  const body: Record<string, unknown> = {};
  if (argv["parts-json"] !== undefined) {
    body.parts = parsePartsJson(argv["parts-json"]);
  } else if (argv.text) {
    const media = mediaFromFlags(argv.media, argv["alt-text"]);
    if (media) {
      body.parts = [{ text: argv.text, media }];
    } else {
      body.text = argv.text;
    }
  } else {
    body.parts = parts.map((text) => ({ text }));
  }
  if (argv.at) body.scheduled_for = argv.at;
  if (argv.title !== undefined) body.title = argv.title;
  if (argv.scratchpad !== undefined) body.scratchpad = argv.scratchpad;
  const tags = (argv.tag || []).filter((t) => typeof t === "string" && t.length > 0);
  if (tags.length > 0) body.tags = tags;
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  const { json, replayed } = await api.createScheduled(body, argv["idempotency-key"]);

  if (replayed) {
    note("Idempotency replay: this Idempotency-Key was already processed; returning the original response.");
    printJson({ ...json, replayed: true });
    return;
  }
  printJson(json);
}

export async function scheduledUpdate(argv: {
  id: string;
  text?: string;
  part?: string[];
  "parts-json"?: string;
  media?: string;
  "alt-text"?: string;
  at?: string;
  status?: string;
  title?: string;
  "clear-title"?: boolean;
  scratchpad?: string;
  "clear-scratchpad"?: boolean;
  tag?: string[];
  "clear-tags"?: boolean;
  account?: string;
}): Promise<void> {
  const parts = (argv.part || []).filter((p) => typeof p === "string");
  const sourceCount = [argv.text, parts.length > 0 ? "p" : undefined, argv["parts-json"]].filter(
    (v) => v !== undefined
  ).length;
  if (sourceCount > 1) {
    note("Use exactly one of --text (single post), --part (thread), or --parts-json.");
    process.exit(1);
  }
  if (argv.media !== undefined && !argv.text) {
    note("--media applies to the --text single-post form. For threads, put media in --parts-json.");
    process.exit(1);
  }
  if (argv.title !== undefined && argv["clear-title"]) {
    note("Use either --title or --clear-title, not both.");
    process.exit(1);
  }
  if (argv.scratchpad !== undefined && argv["clear-scratchpad"]) {
    note("Use either --scratchpad or --clear-scratchpad, not both.");
    process.exit(1);
  }
  const tags = (argv.tag || []).filter((t) => typeof t === "string" && t.length > 0);
  if (tags.length > 0 && argv["clear-tags"]) {
    note("Use either --tag or --clear-tags, not both.");
    process.exit(1);
  }

  const body: Record<string, unknown> = {};
  if (argv["parts-json"] !== undefined) {
    body.parts = parsePartsJson(argv["parts-json"]);
  } else if (argv.text) {
    const media = mediaFromFlags(argv.media, argv["alt-text"]);
    if (media) {
      // NOTE: PATCH parts are a FULL replace, media included. --text alone
      // (no --media) wipes any media the post carried.
      body.parts = [{ text: argv.text, media }];
    } else {
      body.text = argv.text;
    }
  } else if (parts.length > 0) {
    body.parts = parts.map((text) => ({ text }));
  }
  if (argv.at) body.scheduled_for = argv.at;
  if (argv.status) body.status = argv.status;
  if (argv.title !== undefined) body.title = argv.title;
  if (argv["clear-title"]) body.title = null;
  if (argv.scratchpad !== undefined) body.scratchpad = argv.scratchpad;
  if (argv["clear-scratchpad"]) body.scratchpad = null;
  if (tags.length > 0) body.tags = tags;
  if (argv["clear-tags"]) body.tags = [];
  if (argv.account) body.account_id = argv.account;

  if (Object.keys(body).filter((k) => k !== "account_id").length === 0) {
    note("Provide at least one field to update. Run: superx scheduled:update --help");
    process.exit(1);
  }

  const api = new SuperXAPI(getConfig());
  printJson(await api.updateScheduled(argv.id, body));
}

export async function scheduledDelete(argv: { id: string }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.deleteScheduled(argv.id));
}
