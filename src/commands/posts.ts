import { SuperXAPI, printJson, note } from "../api";
import { getConfig } from "../config";

interface ListArgs {
  account?: string;
  type?: string;
  sort?: string;
  since?: string;
  until?: string;
  limit?: number;
  page?: number;
}

export async function postsList(argv: ListArgs): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(
    await api.listPosts({
      account_id: argv.account,
      type: argv.type,
      sort: argv.sort,
      since: argv.since,
      until: argv.until,
      limit: argv.limit,
      page: argv.page,
    })
  );
}

export async function postsAnalytics(argv: { account?: string; since?: string; until?: string }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(
    await api.postsAnalytics({
      account_id: argv.account,
      since: argv.since,
      until: argv.until,
    })
  );
}

/**
 * posts:draft — write post drafts in the account's voice from a brief.
 * Nothing is scheduled: the text comes back for a person to polish, then
 * `scheduled:create` saves or schedules it. Costs AI credits per draft.
 */
export async function postsDraft(argv: {
  brief?: string;
  count?: number;
  voice?: string;
  creator?: string;
  mirror?: string;
  collection?: string;
  instructions?: string;
  account?: string;
}): Promise<void> {
  if (!argv.brief || !argv.brief.trim()) {
    note('Provide --brief "what the post should say".');
    process.exit(1);
  }

  const body: Record<string, unknown> = { brief: argv.brief };
  if (argv.count !== undefined) body.count = argv.count;
  if (argv.voice) body.voice = argv.voice;
  if (argv.creator) body.creator = argv.creator;
  if (argv.mirror) body.mirror = argv.mirror;
  if (argv.collection) body.collection = argv.collection;
  if (argv.instructions) body.instructions = argv.instructions;
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  const json = await api.draftPost(body);
  note("Nothing was scheduled. Review the text, then pass it to scheduled:create.");
  printJson(json);
}

export async function repliesList(argv: ListArgs): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(
    await api.listReplies({
      account_id: argv.account,
      since: argv.since,
      until: argv.until,
      limit: argv.limit,
      page: argv.page,
    })
  );
}

export async function repliesReceived(argv: ListArgs): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(
    await api.receivedReplies({
      account_id: argv.account,
      sort: argv.sort,
      since: argv.since,
      until: argv.until,
      limit: argv.limit,
      page: argv.page,
    })
  );
}

/**
 * Rewrite a post in the account's voice. Text only: nothing is posted or
 * scheduled, so save the result with posts:draft or scheduled:create.
 */
export async function postsRemix(argv: {
  text: string;
  closeness: number;
  instructions?: string;
  account?: string;
}): Promise<void> {
  const body: Record<string, unknown> = {
    text: argv.text,
    closeness: argv.closeness,
  };
  if (argv.instructions) body.instructions = argv.instructions;
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  printJson(await api.remixPost(body));
}

/**
 * Score ONE draft against the account's own recent posts. Returns a 0-100
 * score with what helped and what hurt; nothing is posted or scheduled.
 */
export async function postsViralScore(argv: {
  text: string;
  image?: boolean;
  video?: boolean;
  quote?: boolean;
  postAt?: string;
  population?: boolean;
  account?: string;
}): Promise<void> {
  const body: Record<string, unknown> = { text: argv.text };
  if (argv.image) body.has_image = true;
  if (argv.video) body.has_video = true;
  if (argv.quote) body.is_quote = true;
  if (argv.postAt) body.post_at = argv.postAt;
  if (argv.population) body.baseline = "population";
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  printJson(await api.viralScore(body));
}

/**
 * Search recent public posts on a topic and sort them into Read, Pass or Not
 * sure. What is judged is the text of a post, never who wrote it. Nothing is
 * posted, saved or sent.
 */
export async function postsTriage(argv: {
  query?: string;
  days?: number;
  account?: string;
}): Promise<void> {
  if (!argv.query || !argv.query.trim()) {
    note('Provide a query: superx posts:triage "coding agents".');
    process.exit(1);
  }

  // yargs turns a non-numeric --days into NaN, which JSON.stringify sends as
  // null: the API would then quietly use its 3-day default instead of saying
  // the flag was wrong. Refuse it here, the way the other guards in this file
  // do, rather than in a yargs .check (this CLI's .fail rethrows those as an
  // uncaught error with a stack trace).
  if (argv.days !== undefined) {
    if (!Number.isInteger(argv.days) || argv.days < 1 || argv.days > 7) {
      note("--days must be a whole number of days between 1 and 7.");
      process.exit(1);
    }
  }

  const body: Record<string, unknown> = { query: argv.query };
  if (argv.days !== undefined) body.max_age_days = argv.days;
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  printJson(await api.triage(body));
}
