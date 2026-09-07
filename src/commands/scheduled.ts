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

/** Flags shared by scheduled:create and scheduled:update. The numeric flags
 * are declared WITHOUT type:"number" in index.ts (a typed --no-* would
 * coerce to 0), so raw values arrive as number | string | boolean; yargs
 * types untyped options as unknown, hence the wide field types here
 * (numericFlag narrows and validates them at runtime). */
interface AdvancedFlagArgs {
  "auto-retweet"?: unknown;
  "auto-retweet-remove"?: unknown;
  "auto-delete"?: unknown;
  "auto-delete-threshold"?: unknown;
  "auto-plug"?: string | boolean;
  "auto-plug-threshold"?: unknown;
  "super-followers"?: boolean;
}

/**
 * Normalize a numeric advanced flag. yargs boolean negation (--no-X) yields
 * false (passes through); positive use normally parses as a number, but a
 * non-numeric value arrives as a string and a bare flag arrives as true —
 * both exit with a clear message instead of sending garbage to the API.
 */
function numericFlag(name: string, value: unknown): number | false | undefined {
  if (value === undefined || value === false) return value;
  if (value === true) {
    note(`--${name} needs a numeric value.`);
    process.exit(1);
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    note(`--${name} must be a number.`);
    process.exit(1);
  }
  return n;
}

/**
 * Map the advanced-settings flags onto the request body.
 *  - --auto-retweet 2            -> auto_retweet: { after_hours: 2 }
 *  - --no-auto-retweet           -> auto_retweet: null (create: skip your
 *    account default; update: remove it from the post)
 *  - flag omitted                -> key omitted (create: inherit your account
 *    defaults; update: keep the post's current setting)
 * Same pattern for auto-delete and auto-plug. --super-followers /
 * --no-super-followers map to super_followers_only true/false.
 */
function applyAdvancedFlags(argv: AdvancedFlagArgs, body: Record<string, unknown>): void {
  const retweet = numericFlag("auto-retweet", argv["auto-retweet"]);
  const retweetRemove = numericFlag("auto-retweet-remove", argv["auto-retweet-remove"]);
  if (retweet === false) {
    if (typeof retweetRemove === "number") {
      note("--auto-retweet-remove cannot be combined with --no-auto-retweet.");
      process.exit(1);
    }
    body.auto_retweet = null;
  } else if (typeof retweet === "number") {
    body.auto_retweet = {
      after_hours: retweet,
      ...(typeof retweetRemove === "number" ? { remove_after_hours: retweetRemove } : {}),
    };
  } else if (typeof retweetRemove === "number") {
    note("--auto-retweet-remove requires --auto-retweet <hours>.");
    process.exit(1);
  }

  const del = numericFlag("auto-delete", argv["auto-delete"]);
  const delThreshold = numericFlag("auto-delete-threshold", argv["auto-delete-threshold"]);
  if (del === false) {
    if (typeof delThreshold === "number") {
      note("--auto-delete-threshold cannot be combined with --no-auto-delete.");
      process.exit(1);
    }
    body.auto_delete = null;
  } else if (typeof del === "number") {
    body.auto_delete = {
      after_hours: del,
      ...(typeof delThreshold === "number" ? { threshold: delThreshold } : {}),
    };
  } else if (typeof delThreshold === "number") {
    note("--auto-delete-threshold requires --auto-delete <hours>.");
    process.exit(1);
  }

  const plug = argv["auto-plug"];
  const plugThreshold = numericFlag("auto-plug-threshold", argv["auto-plug-threshold"]);
  if (plug === false) {
    if (typeof plugThreshold === "number") {
      note("--auto-plug-threshold cannot be combined with --no-auto-plug.");
      process.exit(1);
    }
    body.auto_plug = null;
  } else if (typeof plug === "string" && plug.length > 0) {
    if (typeof plugThreshold !== "number") {
      note("--auto-plug requires --auto-plug-threshold <likes>.");
      process.exit(1);
    }
    body.auto_plug = { template_id: plug, threshold: plugThreshold };
  } else if (typeof plugThreshold === "number") {
    note("--auto-plug-threshold requires --auto-plug <templateId>.");
    process.exit(1);
  }

  if (typeof argv["super-followers"] === "boolean") {
    body.super_followers_only = argv["super-followers"];
  }
}

export async function plugTemplatesList(argv: { account?: string }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.listPlugTemplates({ account_id: argv.account }));
}

export async function scheduledCreate(argv: AdvancedFlagArgs & {
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
  applyAdvancedFlags(argv, body);
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

export async function scheduledUpdate(argv: AdvancedFlagArgs & {
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
  applyAdvancedFlags(argv, body);
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

/**
 * posts:publish — publish to X immediately (POST /v1/scheduled-posts with
 * scheduled_for "now"). Same content and advanced-settings flags as
 * scheduled:create, minus the draft-only ones (--at, --title, --scratchpad).
 *
 * --idempotency-key is REQUIRED: publishing cannot be undone, and reusing the
 * same key on a retry is what stops a timed-out call from posting twice.
 */
export async function postsPublish(argv: AdvancedFlagArgs & {
  text?: string;
  part?: string[];
  "parts-json"?: string;
  media?: string;
  "alt-text"?: string;
  tag?: string[];
  account?: string;
  "idempotency-key"?: string;
}): Promise<void> {
  const idempotencyKey = argv["idempotency-key"];
  if (typeof idempotencyKey !== "string" || idempotencyKey.length === 0) {
    note("--idempotency-key is required for posts:publish. Reuse the SAME key when retrying; only use a new key for new content.");
    process.exit(1);
    return;
  }

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

  const body: Record<string, unknown> = { scheduled_for: "now" };
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
  const tags = (argv.tag || []).filter((t) => typeof t === "string" && t.length > 0);
  if (tags.length > 0) body.tags = tags;
  applyAdvancedFlags(argv, body);
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  const { json, replayed } = await api.publishNow(body, idempotencyKey);

  if (replayed) {
    note("Idempotency replay: this key was already published; returning the original result. Nothing was posted twice.");
    printJson({ ...json, replayed: true });
    return;
  }
  printJson(json);
}

/** Parse a comma list of ids into a deduped array, exiting on an empty list. */
function idsFromFlag(name: string, raw?: string): string[] {
  const ids = (raw || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (ids.length === 0) {
    note(`--${name} must be a comma list of post ids (from scheduled:list).`);
    process.exit(1);
  }
  return Array.from(new Set(ids));
}

export async function scheduledBulkRetime(argv: {
  "moves-json"?: string;
  account?: string;
}): Promise<void> {
  const raw = argv["moves-json"];
  if (typeof raw !== "string" || raw.length === 0) {
    note('--moves-json is required, e.g. \'[{"id":"abc","scheduled_for":"2026-09-08T15:00:00Z"}]\'');
    process.exit(1);
    return;
  }
  let moves: unknown;
  try {
    moves = JSON.parse(raw);
  } catch {
    note('--moves-json must be valid JSON, e.g. \'[{"id":"abc","scheduled_for":"2026-09-08T15:00:00Z"}]\'');
    process.exit(1);
    return;
  }
  if (
    !Array.isArray(moves) ||
    moves.length === 0 ||
    moves.some((m: any) => !m || typeof m !== "object" || typeof m.id !== "string" || typeof m.scheduled_for !== "string")
  ) {
    note("--moves-json must be a non-empty array of { id, scheduled_for } objects.");
    process.exit(1);
  }

  const body: Record<string, unknown> = { moves };
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  printJson(await api.bulkRetimeScheduled(body));
}

export async function scheduledBulkAutoRetweet(argv: {
  ids?: string;
  "auto-retweet"?: unknown;
  "auto-retweet-remove"?: unknown;
  account?: string;
}): Promise<void> {
  const ids = idsFromFlag("ids", argv.ids);
  const afterHours = numericFlag("auto-retweet", argv["auto-retweet"]);
  if (typeof afterHours !== "number") {
    note("--auto-retweet <hours> is required (1-12).");
    process.exit(1);
    return;
  }
  const removeAfterHours = numericFlag("auto-retweet-remove", argv["auto-retweet-remove"]);

  const body: Record<string, unknown> = {
    ids,
    auto_retweet: {
      after_hours: afterHours,
      ...(typeof removeAfterHours === "number" ? { remove_after_hours: removeAfterHours } : {}),
    },
  };
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  printJson(await api.bulkEnableAutoRetweet(body));
}

export async function scheduledBulkDelete(argv: {
  ids?: string;
  account?: string;
}): Promise<void> {
  const ids = idsFromFlag("ids", argv.ids);
  const body: Record<string, unknown> = { ids };
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  printJson(await api.bulkDeleteScheduled(body));
}
