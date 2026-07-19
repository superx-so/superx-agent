import { SuperXAPI, printJson } from "../api";
import { getConfig } from "../config";

interface SearchArgs {
  query?: string;
  sort?: string;
  minLikes?: number;
  minReposts?: number;
  minReplies?: number;
  minBookmarks?: number;
  minImpressions?: number;
  minFollowers?: number;
  maxFollowers?: number;
  since?: string;
  until?: string;
  lang?: string;
  excludeTopics?: string;
  limit?: number;
  page?: number;
}

export async function inspirationSearch(argv: SearchArgs): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(
    await api.searchInspiration({
      q: argv.query,
      sort: argv.sort,
      min_likes: argv.minLikes,
      min_reposts: argv.minReposts,
      min_replies: argv.minReplies,
      min_bookmarks: argv.minBookmarks,
      min_impressions: argv.minImpressions,
      min_followers: argv.minFollowers,
      max_followers: argv.maxFollowers,
      since: argv.since,
      until: argv.until,
      lang: argv.lang,
      exclude_topics: argv.excludeTopics,
      limit: argv.limit,
      page: argv.page,
    })
  );
}
