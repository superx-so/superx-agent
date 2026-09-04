import { SuperXAPI, printJson } from "../api";
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
