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
