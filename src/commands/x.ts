import { SuperXAPI, printJson, ApiError } from "../api";
import { getConfig } from "../config";

/**
 * Live X lookups: read a public post, its top replies, a profile or an
 * account's latest posts from X right now, rather than from SuperX's stored
 * data.
 *
 * These cost the tighter enrichment allowance (1 unit each, 3 for replies,
 * 2 for `--quotes` or a handle SuperX has never seen) and share an allowance
 * of 300 live lookups a day with Ask SuperX in the app.
 */

/**
 * Accept a post URL or a bare id, the same shapes the server accepts, and
 * fail locally on anything else so a typo never spends a unit.
 */
function toPostId(ref: string): string {
  const s = String(ref || "").trim();
  if (/^\d{1,25}$/.test(s)) return s;
  const m = s.match(
    /^https?:\/\/(?:www\.|mobile\.)?(?:x\.com|twitter\.com)\/[A-Za-z0-9_]+\/status(?:es)?\/(\d+)/i
  );
  if (m) return m[1];
  throw new ApiError(
    0,
    "invalid_parameter",
    "Provide an x.com/twitter.com post URL or a bare numeric post id."
  );
}

/** Normalize an @handle locally; a bad one never reaches the API. */
function toHandle(raw: string): string {
  const s = String(raw || "").trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_]{1,15}$/.test(s)) {
    throw new ApiError(
      0,
      "invalid_parameter",
      "Provide a valid X handle: 1-15 letters, numbers or underscores."
    );
  }
  return s;
}

export async function xPost(argv: { id: string; quotes?: boolean }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(
    await api.lookupXPost(toPostId(argv.id), {
      include_quotes: argv.quotes ? "true" : undefined,
    })
  );
}

export async function xReplies(argv: { id: string; limit?: number }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.getXPostReplies(toPostId(argv.id), { limit: argv.limit }));
}

export async function xUser(argv: { handle: string }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.lookupXUser(toHandle(argv.handle)));
}

export async function xUserPosts(argv: {
  handle: string;
  limit?: number;
  reposts?: boolean;
}): Promise<void> {
  const api = new SuperXAPI(getConfig());
  // yargs turns `--no-reposts` into reposts: false; anything else means keep
  // them, which is the API default.
  printJson(
    await api.getXUserPosts(toHandle(argv.handle), {
      limit: argv.limit,
      exclude_reposts: argv.reposts === false ? "true" : undefined,
    })
  );
}
