import { SuperXAPI, printJson, note } from "../api";
import { getConfig } from "../config";

export async function engageFeeds(argv: { account?: string }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.listEngageFeeds({ account_id: argv.account }));
}

export async function engagePosts(argv: {
  feedId: string;
  account?: string;
  limit?: number;
  mode?: string;
  fresh?: boolean;
  includeReplied?: boolean;
  exclude?: string;
}): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(
    await api.getEngageFeedPosts(argv.feedId, {
      account_id: argv.account,
      limit: argv.limit,
      mode: argv.mode,
      // yargs boolean: pass through only when the flag was given.
      fresh: argv.fresh === undefined ? undefined : String(argv.fresh),
      include_replied: argv.includeReplied === undefined ? undefined : String(argv.includeReplied),
      exclude_post_ids: argv.exclude,
    })
  );
}

/** Shape the source flags into the API's feed source fields. */
function feedSourceBody(argv: {
  keyword?: string[];
  "x-list"?: string;
  "list-id"?: string;
}): Record<string, unknown> | null {
  const keywords = (argv.keyword || []).filter(
    (k) => typeof k === "string" && k.length > 0
  );
  const families = [
    keywords.length > 0 ? "keywords" : null,
    argv["x-list"] ? "x_list" : null,
    argv["list-id"] ? "list" : null,
  ].filter(Boolean);
  if (families.length === 0) return null;
  if (families.length > 1) {
    note("Use exactly one source: --keyword, --x-list or --list-id.");
    process.exit(1);
  }
  if (keywords.length > 0) return { type: "keywords", keywords };
  if (argv["x-list"]) {
    // A bare numeric id and a full x.com link go to different fields.
    const raw = String(argv["x-list"]).trim();
    return /^\d{1,32}$/.test(raw)
      ? { type: "x_list", x_list_id: raw }
      : { type: "x_list", x_list_url: raw };
  }
  return { type: "list", list_id: argv["list-id"] };
}

export async function engageFeedsCreate(argv: {
  name: string;
  keyword?: string[];
  "x-list"?: string;
  "list-id"?: string;
  account?: string;
}): Promise<void> {
  const source = feedSourceBody(argv);
  if (!source) {
    note("Provide a source: --keyword (repeatable), --x-list or --list-id.");
    process.exit(1);
  }
  const body: Record<string, unknown> = { name: argv.name, ...source };
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  printJson(await api.createEngageFeed(body));
}

export async function engageFeedsUpdate(argv: {
  feedId: string;
  name?: string;
  keyword?: string[];
  "x-list"?: string;
  "list-id"?: string;
  account?: string;
}): Promise<void> {
  const source = feedSourceBody(argv);
  const body: Record<string, unknown> = { ...(source || {}) };
  // `type` is derived on create; on update the API reads the source fields.
  delete body.type;
  if (argv.name !== undefined) body.name = argv.name;
  if (Object.keys(body).length === 0) {
    note("Provide --name, or a new source: --keyword, --x-list or --list-id.");
    process.exit(1);
  }
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  printJson(await api.updateEngageFeed(argv.feedId, body));
}

export async function engageFeedsDelete(argv: {
  feedId: string;
  account?: string;
}): Promise<void> {
  const api = new SuperXAPI(getConfig());
  await api.deleteEngageFeed(argv.feedId, { account_id: argv.account });
  printJson({ id: argv.feedId, deleted: true });
}

/**
 * Mentions: the posts @-mentioning the account, read live from X. One call
 * costs 3 units of the plan's daily feed-fetch allowance, so read a page and
 * work from it rather than polling. Cursor paging.
 */
export async function engageMentions(argv: {
  account?: string;
  sort?: string;
  includeReplied?: boolean;
  cursor?: string;
}): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(
    await api.getMentions({
      account_id: argv.account,
      sort: argv.sort,
      // yargs boolean: pass through only when the flag was given.
      include_replied:
        argv.includeReplied === undefined ? undefined : String(argv.includeReplied),
      cursor: argv.cursor,
    })
  );
}
