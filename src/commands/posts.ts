import { SuperXAPI, printJson } from "../api";
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
