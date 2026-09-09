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

interface MediaArgs {
  query?: string;
  platforms?: string;
  timeFilter?: string;
  mediaType?: string;
  contentType?: string;
  limit?: number;
}

/**
 * The cross-platform media index behind the app's Inspiration > Media tab.
 * No query browses the newest media instead of searching. Costs no
 * enrichment; the index has its own burst and daily caps.
 */
export async function inspirationMedia(argv: MediaArgs): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(
    await api.searchInspirationMedia({
      q: argv.query,
      platforms: argv.platforms,
      time_filter: argv.timeFilter,
      media_type: argv.mediaType,
      content_type: argv.contentType,
      limit: argv.limit,
    })
  );
}
