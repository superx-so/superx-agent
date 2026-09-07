import { readFileSync } from "fs";
import { SuperXAPI, printJson, note } from "../api";
import { getConfig } from "../config";

/**
 * X Articles (long-form posts). Bodies are markdown in both directions:
 * headings, lists, blockquotes, bold/italic/strike, links, images by URL,
 * and bare X post URLs as embeds.
 */

/** Resolve the article body from --content, --file, or piped stdin. */
function resolveContent(argv: { content?: string; file?: string }): string | undefined {
  if (argv.content !== undefined && argv.file !== undefined) {
    note("Use either --content or --file, not both.");
    process.exit(1);
  }
  if (argv.content !== undefined) return argv.content;
  if (argv.file !== undefined) {
    try {
      return readFileSync(argv.file, "utf8");
    } catch (err: any) {
      note(`Could not read ${argv.file}: ${err?.message || err}`);
      process.exit(1);
    }
  }
  if (!process.stdin.isTTY) {
    try {
      const piped = readFileSync(0, "utf8");
      if (piped.length > 0) return piped;
    } catch {
      // No piped input — fall through.
    }
  }
  return undefined;
}

export async function articlesList(argv: {
  account?: string;
  status?: string;
  limit?: number;
  page?: number;
}): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(
    await api.listArticles({
      account_id: argv.account,
      status: argv.status,
      limit: argv.limit,
      page: argv.page,
    })
  );
}

export async function articlesGet(argv: { id: string }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.getArticle(argv.id));
}

export async function articlesCreate(argv: {
  title: string;
  content?: string;
  file?: string;
  account?: string;
}): Promise<void> {
  const content = resolveContent(argv);
  const body: Record<string, unknown> = { title: argv.title };
  if (content !== undefined) body.content_markdown = content;
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  printJson(await api.createArticle(body));
}

export async function articlesUpdate(argv: {
  id: string;
  title?: string;
  content?: string;
  file?: string;
  "cover-url"?: string;
  "clear-cover"?: boolean;
}): Promise<void> {
  if (argv["cover-url"] !== undefined && argv["clear-cover"]) {
    note("Use either --cover-url or --clear-cover, not both.");
    process.exit(1);
  }
  const body: Record<string, unknown> = {};
  if (argv.title !== undefined) body.title = argv.title;
  // Content only via explicit flags on update (no stdin fallback — an
  // accidental pipe must not wipe an article body).
  if (argv.content !== undefined && argv.file !== undefined) {
    note("Use either --content or --file, not both.");
    process.exit(1);
  }
  if (argv.content !== undefined) body.content_markdown = argv.content;
  if (argv.file !== undefined) {
    try {
      body.content_markdown = readFileSync(argv.file, "utf8");
    } catch (err: any) {
      note(`Could not read ${argv.file}: ${err?.message || err}`);
      process.exit(1);
    }
  }
  if (argv["cover-url"] !== undefined) body.cover_url = argv["cover-url"];
  if (argv["clear-cover"]) body.cover_url = null;

  if (Object.keys(body).length === 0) {
    note("Provide at least one of: --title, --content, --file, --cover-url, --clear-cover.");
    process.exit(1);
  }

  const api = new SuperXAPI(getConfig());
  printJson(await api.updateArticle(argv.id, body));
}

export async function articlesDelete(argv: { id: string }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  await api.deleteArticle(argv.id);
  printJson({ id: argv.id, deleted: true });
}

export async function articlesPublish(argv: { id: string }): Promise<void> {
  note("Publishing to X. This is live and irreversible; it can take up to 90 seconds...");
  const api = new SuperXAPI(getConfig());
  printJson(await api.publishArticle(argv.id));
}

export async function articlesSchedule(argv: { id: string; at: string }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.scheduleArticle(argv.id, { scheduled_for: argv.at }));
}

export async function articlesUnschedule(argv: { id: string }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.unscheduleArticle(argv.id));
}

export async function articlesCoverStyles(argv: { account?: string }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.listCoverStyles({ account_id: argv.account }));
}

export async function articlesCover(argv: {
  id: string;
  style?: string;
  "style-id"?: string;
  attach?: boolean;
}): Promise<void> {
  if (argv.style !== undefined && argv["style-id"] !== undefined) {
    note("Use either --style or --style-id, not both.");
    process.exit(1);
  }
  note("Generating a cover image. This spends AI credits and can take 60-100 seconds...");
  const body: Record<string, unknown> = {};
  if (argv.style !== undefined) body.style_text = argv.style;
  if (argv["style-id"] !== undefined) body.style_id = argv["style-id"];
  if (argv.attach === false) body.attach = false;

  const api = new SuperXAPI(getConfig());
  printJson(await api.generateArticleCover(argv.id, body));
}
