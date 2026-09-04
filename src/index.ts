import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import type { Argv } from "yargs";
import { ApiError, note } from "./api";
import { login, logout, status } from "./commands/auth";
import { me, accounts } from "./commands/accounts";
import { postsList, postsAnalytics, repliesList, repliesReceived } from "./commands/posts";
import { inspirationSearch } from "./commands/inspiration";
import { contactsList, contactsReplies } from "./commands/contacts";
import { listsList, listsMembers, listsAddMember, listsRemoveMember } from "./commands/lists";
import {
  signalsAgents,
  signalsLeads,
  signalsCreateAgent,
  signalsPauseAgent,
  signalsResumeAgent,
  signalsDeleteAgent,
} from "./commands/signals";
import { engageFeeds, engagePosts } from "./commands/engage";
import { scheduledList, scheduledCreate, scheduledUpdate, scheduledDelete, plugTemplatesList } from "./commands/scheduled";
import { mediaUpload } from "./commands/media";
import { tagsList, tagsCreate, tagsUpdate, tagsDelete } from "./commands/tags";
import {
  articlesList,
  articlesGet,
  articlesCreate,
  articlesUpdate,
  articlesDelete,
  articlesPublish,
  articlesSchedule,
  articlesUnschedule,
  articlesCover,
} from "./commands/articles";
import {
  contextGet,
  contextSet,
  contextProducts,
  contextProductsSet,
  contextProductsDelete,
} from "./commands/context";
import { queueGet, queueSet } from "./commands/queue";
import { docs } from "./commands/docs";

/** Wrap a handler: API errors go to stderr with the API's error code, exit 1. */
function run<T>(handler: (argv: T) => Promise<void>): (argv: T) => Promise<void> {
  return async (argv: T) => {
    try {
      await handler(argv);
    } catch (err: any) {
      if (err instanceof ApiError) {
        const status = err.status ? ` (HTTP ${err.status})` : "";
        note(`Error [${err.code}]${status}: ${err.message}`);
        if (err.retryAfter !== null) {
          note(`Retry after ${err.retryAfter} seconds.`);
        }
      } else {
        note(`Error: ${err?.message || err}`);
      }
      process.exit(1);
    }
  };
}

const paginationOptions = (y: Argv) =>
  y
    .option("limit", { describe: "Items per page (max 100)", type: "number" })
    .option("page", { describe: "Page number (1-based)", type: "number" });

const accountOption = (y: Argv) =>
  y.option("account", {
    describe: "Account id (from `superx accounts`); defaults to your main account",
    type: "string",
  });

/**
 * Advanced-settings flags shared by scheduled:create and scheduled:update.
 * On create, omitted flags inherit your Default Post Settings from the
 * SuperX app; on update, omitted flags keep the post's current settings.
 * The --no-* forms turn a setting off (create) or remove it (update).
 */
// NOTE: the numeric flags below deliberately have NO `type: "number"` —
// yargs coerces boolean negation (--no-auto-retweet) to 0 under
// type:"number", which the API rejects (min 1). Untyped, positive use still
// parses as a number and --no-* yields false; applyAdvancedFlags validates
// and coerces the values.
const advancedSettingsOptions = (y: Argv) =>
  y
    .option("auto-retweet", {
      describe: "Auto retweet the post after this many hours (1-12); --no-auto-retweet turns it off",
    })
    .option("auto-retweet-remove", {
      describe: "Remove the auto retweet after this many hours (1-12); needs --auto-retweet",
    })
    .option("auto-delete", {
      describe: "Auto delete the post after this many hours (1-12) if it underperforms; --no-auto-delete turns it off",
    })
    .option("auto-delete-threshold", {
      describe: "Views threshold for --auto-delete: delete only below this many views (default 1000)",
    })
    .option("auto-plug", {
      describe: "Plug template id (from plug-templates:list) to auto-reply with; --no-auto-plug turns it off",
      type: "string",
    })
    .option("auto-plug-threshold", {
      describe: "Likes threshold for --auto-plug: the reply posts once the post hits this many likes",
    })
    .option("super-followers", {
      describe: "Post to Super Followers only (--no-super-followers turns it off)",
      type: "boolean",
    });

yargs(hideBin(process.argv))
  .scriptName("superx")
  .usage("$0 <command> [options]")
  .command(
    "login",
    "Authenticate with a SuperX API key (guided paste or --key)",
    (y: Argv) =>
      y
        .option("key", {
          describe: "API key (sxk_...); omit to be prompted",
          type: "string",
        })
        .example('$0 login --key "sxk_..."', "Non-interactive login")
        .example("$0 login", "Guided login: prints the key page URL and prompts for a paste"),
    run(login)
  )
  .command("logout", "Remove stored credentials (~/.superx/credentials.json)", {}, run(logout))
  .command("status", "Check authentication, plan, and current rate-limit state", {}, run(status))
  .command("me", "Show the key owner, plan, and API key details", {}, run(me))
  .command(
    "accounts",
    "List the X accounts this key can read (main account first)",
    (y: Argv) => paginationOptions(y),
    run(accounts)
  )
  .command(
    "posts:list",
    "List published posts with engagement metrics",
    (y: Argv) =>
      paginationOptions(accountOption(y))
        .option("type", {
          describe: "Filter by post kind",
          type: "string",
          choices: ["posts", "replies", "all"],
        })
        .option("sort", {
          describe: "Sort order",
          type: "string",
          choices: ["posted_at", "likes", "impressions"],
        })
        .option("since", { describe: "Start of range (UTC ISO-8601, e.g. 2026-06-01T00:00:00Z)", type: "string" })
        .option("until", { describe: "End of range (UTC ISO-8601)", type: "string" })
        .example('$0 posts:list --sort likes --limit 10', "Top 10 posts by likes")
        .example('$0 posts:list --since "2026-06-01T00:00:00Z" --type posts', "Original posts since June"),
    run(postsList)
  )
  .command(
    "posts:analytics",
    "Account analytics: totals, daily series, follower change (default: last 30 days)",
    (y: Argv) =>
      accountOption(y)
        .option("since", { describe: "Start of range (UTC ISO-8601)", type: "string" })
        .option("until", { describe: "End of range (UTC ISO-8601)", type: "string" })
        .example('$0 posts:analytics --since "2026-06-01T00:00:00Z" --until "2026-07-01T00:00:00Z"', "June analytics"),
    run(postsAnalytics)
  )
  .command(
    "replies:list",
    "List replies the account has sent (newest first)",
    (y: Argv) =>
      paginationOptions(accountOption(y))
        .option("since", { describe: "Start of range (UTC ISO-8601)", type: "string" })
        .option("until", { describe: "End of range (UTC ISO-8601)", type: "string" }),
    run(repliesList)
  )
  .command(
    "replies:received",
    "List replies your audience has sent you across all your posts",
    (y: Argv) =>
      paginationOptions(accountOption(y))
        .option("sort", {
          describe: "Sort order",
          type: "string",
          choices: ["recent", "most_liked"],
        })
        .option("since", { describe: "Start of range (UTC ISO-8601)", type: "string" })
        .option("until", { describe: "End of range (UTC ISO-8601)", type: "string" })
        .example("$0 replies:received --limit 10", "Ten newest audience replies")
        .example('$0 replies:received --sort most_liked --since "2026-06-01T00:00:00Z"', "Best-liked replies since June"),
    run(repliesReceived)
  )
  .command(
    "inspiration:search <query>",
    "Search a library of 50M+ high-performing posts for inspiration",
    (y: Argv) =>
      paginationOptions(y)
        .positional("query", { describe: "Topic or theme to search for", type: "string" })
        .option("sort", {
          describe: "Sort order",
          type: "string",
          choices: ["relevant", "recent", "likes", "reposts", "impressions", "outlier"],
        })
        .option("min-likes", { describe: "Only posts with at least this many likes", type: "number" })
        .option("min-reposts", { describe: "Only posts with at least this many reposts", type: "number" })
        .option("min-replies", { describe: "Only posts with at least this many replies", type: "number" })
        .option("min-bookmarks", { describe: "Only posts with at least this many bookmarks", type: "number" })
        .option("min-impressions", { describe: "Only posts with at least this many impressions", type: "number" })
        .option("min-followers", { describe: "Only posts from authors with at least this many followers", type: "number" })
        .option("max-followers", { describe: "Only posts from authors with at most this many followers", type: "number" })
        .option("since", { describe: "Only posts after this time (UTC ISO-8601)", type: "string" })
        .option("until", { describe: "Only posts before this time (UTC ISO-8601)", type: "string" })
        .option("lang", { describe: "Language code (default en)", type: "string" })
        .option("exclude-topics", { describe: "Comma-separated topics to exclude", type: "string" })
        .example('$0 inspiration:search "build in public" --limit 10', "Ten posts about building in public")
        .example('$0 inspiration:search "indie hackers" --sort outlier --min-likes 500', "Overperformers with 500+ likes"),
    run(inspirationSearch)
  )
  .command(
    "contacts:list",
    "List the people who engage with you most",
    (y: Argv) =>
      paginationOptions(accountOption(y)).option("sort", {
        describe: "Sort order",
        type: "string",
        choices: ["engagement", "replies", "reposts"],
      }),
    run(contactsList)
  )
  .command(
    "contacts:replies <id>",
    "List a contact's replies to you (their id from contacts:list)",
    (y: Argv) =>
      paginationOptions(accountOption(y))
        .positional("id", { describe: "Contact id", type: "string" })
        .option("sort", {
          describe: "Sort order",
          type: "string",
          choices: ["recent", "most_liked"],
        }),
    run(contactsReplies)
  )
  .command(
    "lists:list",
    "List your contact lists (system lists are read-only)",
    (y: Argv) => accountOption(y),
    run(listsList)
  )
  .command(
    "lists:members <id>",
    "List the members of a contact list you created",
    (y: Argv) =>
      paginationOptions(accountOption(y))
        .positional("id", { describe: "List id (from lists:list)", type: "string" })
        .option("q", { describe: "Filter members by handle or name substring", type: "string" }),
    run(listsMembers)
  )
  .command(
    "lists:add-member <id>",
    "Add a person to a contact list by handle or X user id",
    (y: Argv) =>
      y
        .positional("id", { describe: "List id (from lists:list)", type: "string" })
        .option("handle", { describe: "X username, with or without the @", type: "string" })
        .option("x-user-id", { describe: "Numeric X user id", type: "string" })
        .example('$0 lists:add-member abc123 --handle levelsio', "Add by handle")
        .example("$0 lists:add-member abc123 --x-user-id 44196397", "Add by X user id"),
    run(listsAddMember)
  )
  .command(
    "lists:remove-member <id> <memberId>",
    "Remove a member from a contact list (member id from lists:members)",
    (y: Argv) =>
      y
        .positional("id", { describe: "List id (from lists:list)", type: "string" })
        .positional("memberId", { describe: "Member id (from lists:members)", type: "string" }),
    run(listsRemoveMember)
  )
  .command(
    "signals:agents",
    "List your signal agents (automated lead finders) with their watched signals",
    (y: Argv) => accountOption(y),
    run(signalsAgents)
  )
  .command(
    "signals:leads",
    "List the leads your signal agents have found (newest first)",
    (y: Argv) =>
      paginationOptions(accountOption(y))
        .option("agent", { describe: "Narrow to one agent by its numeric id (from signals:agents)", type: "number" })
        .option("deposited", {
          describe: "true = only leads already saved to the agent's contact list, false = only new ones",
          type: "boolean",
        })
        .option("since", { describe: "Only leads discovered after this time (UTC ISO-8601)", type: "string" })
        .option("until", { describe: "Only leads discovered before this time (UTC ISO-8601)", type: "string" })
        .example("$0 signals:leads --limit 10", "Ten newest leads across all agents")
        .example("$0 signals:leads --agent 3 --deposited false", "New leads from agent 3 not yet in its list"),
    run(signalsLeads)
  )
  .command(
    "signals:create-agent",
    "Create a signal agent (automated lead finder); leads land in Signals over the next minutes and days",
    (y: Argv) =>
      y
        .option("name", { describe: "Agent name (max 80 chars)", type: "string", demandOption: true })
        .option("icp", {
          describe: "Who the ideal leads are: role, product, pains, buying intent (max 500 chars)",
          type: "string",
          demandOption: true,
        })
        .option("precision", {
          describe: "high = fewer, stricter matches (default); discovery = broader net",
          type: "string",
          choices: ["high", "discovery"],
        })
        .option("list-id", {
          describe: "Contact list id (from lists:list) that receives the leads; omit to auto-create one",
          type: "string",
        })
        .option("keyword", {
          describe: "Plain-language search description to watch (repeat the flag, 1-5); omit to auto-suggest from --icp",
          type: "string",
          array: true,
        })
        .option("idempotency-key", {
          describe: "Idempotency-Key header (max 64 chars); retries with the same key return the original result",
          type: "string",
        })
        .example(
          '$0 signals:create-agent --name "Build in public" --icp "Indie founders building SaaS in public" --keyword "building in public" --keyword "just shipped my MVP"',
          "Create an agent with explicit keywords"
        )
        .example(
          '$0 signals:create-agent --name "Agency leads" --icp "Marketing agency owners struggling with reporting"',
          "Create an agent with auto-suggested keywords and an auto-created list"
        ),
    run(signalsCreateAgent)
  )
  .command(
    "signals:pause-agent <id>",
    "Pause a signal agent (it stops finding leads until resumed)",
    (y: Argv) => y.positional("id", { describe: "Agent id (from signals:agents)", type: "number" }),
    run(signalsPauseAgent)
  )
  .command(
    "signals:resume-agent <id>",
    "Resume a paused signal agent",
    (y: Argv) => y.positional("id", { describe: "Agent id (from signals:agents)", type: "number" }),
    run(signalsResumeAgent)
  )
  .command(
    "signals:delete-agent <id>",
    "Delete a signal agent (its saved leads and contact list stay untouched)",
    (y: Argv) => y.positional("id", { describe: "Agent id (from signals:agents)", type: "number" }),
    run(signalsDeleteAgent)
  )
  .command(
    "engage:feeds",
    "List the Engage feeds set up in the app",
    (y: Argv) =>
      accountOption(y)
        .example("$0 engage:feeds", "Feed ids, types, and what one fetch costs")
        .example("$0 engage:feeds --account <account-id>", "Feeds saved on a linked account"),
    run(engageFeeds)
  )
  .command(
    "engage:posts <feedId>",
    "Fetch the posts an Engage feed surfaces (for review; replies are sent by a person in the app)",
    (y: Argv) =>
      accountOption(y)
        .positional("feedId", { describe: "Feed id (from engage:feeds)", type: "string" })
        .option("limit", {
          describe:
            "Posts to return, 1-50 (default 20). Applies to keyword feeds; list feeds return one page (about 10 to 25 posts) and --limit only trims it",
          type: "number",
        })
        .option("mode", {
          describe: "top = highest-signal posts first (default); latest = newest first",
          type: "string",
          choices: ["top", "latest"],
        })
        .option("fresh", {
          describe: "true = skip the cache and fetch new posts; false = allow cached posts (default)",
          type: "boolean",
        })
        .option("include-replied", {
          describe:
            "true = keep posts already replied to, skipped, or blocked and flag them with `replied`; false = leave them out (default)",
          type: "boolean",
        })
        .option("exclude", {
          describe:
            "Comma list of post ids to leave out (max 100); this is how you page: pass the ids you already have to get the next batch",
          type: "string",
        })
        .example("$0 engage:posts <feed-id> --limit 50", "One big page from a keyword feed")
        .example("$0 engage:posts <feed-id> --mode latest --fresh true", "Newest posts, skipping the cache")
        .example("$0 engage:posts <feed-id> --exclude 1234567890,1234567891", "Next batch, minus the posts you have"),
    run(engagePosts)
  )
  .command(
    "scheduled:list",
    "List drafts and the scheduled queue",
    (y: Argv) =>
      paginationOptions(accountOption(y))
        .option("status", {
          describe: "Comma list of: draft, scheduled, sent, error",
          type: "string",
        })
        .option("tags", {
          describe: "Comma list of tag ids (from tags:list); posts matching ANY of them",
          type: "string",
        })
        .option("from", { describe: "Scheduled-time lower bound (UTC ISO-8601)", type: "string" })
        .option("to", { describe: "Scheduled-time upper bound (UTC ISO-8601)", type: "string" }),
    run(scheduledList)
  )
  .command(
    "media:upload <file>",
    "Upload a local image (JPG, PNG, WEBP, GIF) and print its object_key for --media",
    (y: Argv) =>
      y
        .positional("file", { describe: "Path to the image file (max 5MB; GIF 15MB)", type: "string" })
        .example("$0 media:upload ./chart.png", "Upload an image")
        .example('KEY=$($0 media:upload ./chart.png | jq -r .object_key); $0 scheduled:create --text "Post" --media "$KEY"', "Upload, then attach"),
    run(mediaUpload)
  )
  .command(
    "scheduled:create",
    "Create a draft (no --at) or scheduled post; repeat --part for a thread",
    (y: Argv) =>
      advancedSettingsOptions(accountOption(y))
        .option("text", { describe: "Text for a single post", type: "string" })
        .option("part", {
          describe: "Thread part text (repeat the flag, 1-25 parts, in order)",
          type: "string",
          array: true,
        })
        .option("media", {
          describe: "Comma list of image object_keys (from media:upload) to attach; single-post form only (max 4 images or 1 GIF)",
          type: "string",
        })
        .option("alt-text", {
          describe: "Accessibility description for the attached image (single --media key only, max 1000 chars)",
          type: "string",
        })
        .option("parts-json", {
          describe: 'Full parts array as JSON for threads with media: [{"text":"...","media":[{"object_key":"...","alt_text":"..."}]}]',
          type: "string",
        })
        .option("at", {
          describe:
            "Schedule time: UTC ISO-8601 with explicit Z or offset, at least 60s in the future. Omit to create a draft.",
          type: "string",
        })
        .option("title", { describe: "Draft title (max 300 chars, shown in the SuperX app, never posted)", type: "string" })
        .option("scratchpad", { describe: "Private working notes (max 30000 chars, never posted)", type: "string" })
        .option("tag", {
          describe: "Tag id to assign (repeat the flag, max 20; ids from tags:list)",
          type: "string",
          array: true,
        })
        .option("idempotency-key", {
          describe: "Idempotency-Key header (max 64 chars); retries with the same key return the original result",
          type: "string",
        })
        .example('$0 scheduled:create --text "Hello"', "Create a draft")
        .example('$0 scheduled:create --text "Hello" --at "2026-08-01T15:00:00Z"', "Schedule a post")
        .example('$0 scheduled:create --part "1/ Hook" --part "2/ Detail" --part "3/ CTA"', "Draft a 3-part thread")
        .example('$0 scheduled:create --text "Hello" --title "Launch teaser" --tag abc123', "Draft with a title and a tag")
        .example('$0 scheduled:create --text "Chart of the week" --media "<object_key>" --alt-text "Revenue chart"', "Draft with an image")
        .example('$0 scheduled:create --text "Hello" --at "2026-08-01T15:00:00Z" --auto-retweet 6 --auto-retweet-remove 4', "Schedule with an auto retweet")
        .example('$0 scheduled:create --text "Hello" --at "2026-08-01T15:00:00Z" --no-auto-retweet --no-auto-plug', "Schedule with your defaults off for this post"),
    run(scheduledCreate)
  )
  .command(
    "scheduled:update <id>",
    "Edit a draft or scheduled post; only the flags you pass change",
    (y: Argv) =>
      advancedSettingsOptions(accountOption(y))
        .positional("id", { describe: "Post id (from scheduled:list or scheduled:create)", type: "string" })
        .option("text", { describe: "Replacement text for a single post", type: "string" })
        .option("part", {
          describe: "Replacement thread part text (repeat the flag, 1-25 parts, in order)",
          type: "string",
          array: true,
        })
        .option("media", {
          describe: "Comma list of image object_keys to attach with --text (full replace: re-list existing keys to keep them; --text without --media removes the post's media)",
          type: "string",
        })
        .option("alt-text", {
          describe: "Accessibility description for the attached image (single --media key only, max 1000 chars)",
          type: "string",
        })
        .option("parts-json", {
          describe: 'Full replacement parts array as JSON: [{"text":"...","media":[{"object_key":"..."}]}]',
          type: "string",
        })
        .option("at", {
          describe:
            "New schedule time (UTC ISO-8601 with explicit Z or offset). On its own it never schedules a draft; add --status scheduled.",
          type: "string",
        })
        .option("status", {
          describe: "Explicit transition; scheduled needs a future time (via --at or already set)",
          type: "string",
          choices: ["draft", "scheduled"],
        })
        .option("title", { describe: "New draft title (max 300 chars)", type: "string" })
        .option("clear-title", { describe: "Remove the title", type: "boolean" })
        .option("scratchpad", { describe: "New private notes (max 30000 chars)", type: "string" })
        .option("clear-scratchpad", { describe: "Remove the notes", type: "boolean" })
        .option("tag", {
          describe: "Replacement tag id set (repeat the flag, max 20; replaces ALL current tags)",
          type: "string",
          array: true,
        })
        .option("clear-tags", { describe: "Remove all tags", type: "boolean" })
        .example('$0 scheduled:update abc123 --title "Better hook"', "Retitle a draft, everything else untouched")
        .example('$0 scheduled:update abc123 --at "2026-08-01T15:00:00Z" --status scheduled', "Promote a draft to the queue")
        .example('$0 scheduled:update abc123 --status draft', "Pull a post back to drafts (quota refunds)")
        .example('$0 scheduled:update abc123 --auto-delete 8 --auto-delete-threshold 500', "Add an auto delete to the post")
        .example('$0 scheduled:update abc123 --no-auto-retweet', "Remove the post's auto retweet"),
    run(scheduledUpdate)
  )
  .command(
    "scheduled:delete <id>",
    "Delete a draft or scheduled post by id",
    (y: Argv) => y.positional("id", { describe: "Post id (from scheduled:list or scheduled:create)", type: "string" }),
    run(scheduledDelete)
  )
  .command(
    "plug-templates:list",
    "List your auto-plug reply templates (id, text, has_media) for --auto-plug",
    (y: Argv) => accountOption(y),
    run(plugTemplatesList)
  )
  .command(
    "context:get",
    "Show the account's Context settings: profile description, interests, rules, reply settings, favorite creators, style guide, products",
    (y: Argv) => accountOption(y),
    run(contextGet)
  )
  .command(
    "context:set",
    "Edit Context settings; only the flags you pass change (string flags: \"\" clears; lists fully replace)",
    (y: Argv) =>
      accountOption(y)
        .option("profile-description", {
          describe: 'Who you are and what you do, grounds the AI voice (max 500 chars; "" clears)',
          type: "string",
        })
        .option("profile-description-enabled", {
          describe: "Use the profile description in AI writing (--no-profile-description-enabled turns it off)",
          type: "boolean",
        })
        .option("interests", {
          describe: 'Comma list of topics you want content about (max 30, each max 50 chars; replaces the stored list; "" clears)',
          type: "string",
        })
        .option("rules", {
          describe: 'SuperX rules the AI must follow on every surface (max 500 chars; "" clears)',
          type: "string",
        })
        .option("reply-rules", {
          describe: 'Custom instructions for AI-generated replies (max 500 chars; "" clears)',
          type: "string",
        })
        .option("reply-author-name", {
          describe: "Let AI replies address the post author by name (--no-reply-author-name turns it off)",
          type: "boolean",
        })
        .option("favorite-creators", {
          describe: 'Comma list of X usernames whose style inspires yours (max 3; replaces the stored list; "" clears)',
          type: "string",
        })
        .option("own-posts-as-examples", {
          describe: "Use your own posts as voice examples (--no-own-posts-as-examples turns it off)",
          type: "boolean",
        })
        .option("style-audience", {
          describe: 'Manual audience description that outranks the generated style guide (max 600 chars; "" reverts to generated)',
          type: "string",
        })
        .option("style-vocabulary", {
          describe: 'Manual vocabulary and style description that outranks the generated style guide (max 1000 chars; "" reverts to generated)',
          type: "string",
        })
        .example('$0 context:set --rules "Never use hashtags. Keep posts under 200 chars."', "Set your SuperX rules")
        .example('$0 context:set --interests "indie hacking,SaaS,AI agents"', "Replace your interests")
        .example('$0 context:set --favorite-creators "levelsio,marc_louvion"', "Set favorite creators")
        .example('$0 context:set --style-audience ""', "Revert to the generated audience description"),
    run(contextSet)
  )
  .command(
    "context:products",
    "List the account's products (used for product mentions in generated content)",
    (y: Argv) => accountOption(y),
    run(contextProducts)
  )
  .command(
    "context:products:set",
    "Add or edit ONE product by --url (creates it when new, cap 5) or --id",
    (y: Argv) =>
      accountOption(y)
        .option("id", { describe: "Product id (from context:products) to edit", type: "string" })
        .option("url", { describe: "Product http(s) url; creates the product when it does not exist", type: "string" })
        .option("name", { describe: 'Product name (max 200 chars; "" clears)', type: "string" })
        .option("description", { describe: 'What the product is (max 1000 chars; "" clears)', type: "string" })
        .option("positioning", { describe: 'Positioning and differentiation (max 2000 chars; "" clears)', type: "string" })
        .option("features", { describe: 'Key features (max 2000 chars; "" clears)', type: "string" })
        .option("updates", { describe: 'Recent updates worth mentioning (max 2000 chars; "" clears)', type: "string" })
        .example('$0 context:products:set --url "https://superx.so" --name "SuperX" --description "X growth platform"', "Add or edit a product by url")
        .example('$0 context:products:set --id 3 --updates "Shipped the public API"', "Update one field by id"),
    run(contextProductsSet)
  )
  .command(
    "context:products:delete <id>",
    "Remove a product by id (reversible by re-adding the same url)",
    (y: Argv) =>
      accountOption(y).positional("id", { describe: "Product id (from context:products)", type: "string" }),
    run(contextProductsDelete)
  )
  .command(
    "queue:get",
    "Show the account's posting schedule: predefined time slots and the timezone they run in",
    (y: Argv) => accountOption(y),
    run(queueGet)
  )
  .command(
    "queue:set",
    "Change the posting schedule; changing the slots also re-flows queued posts onto them",
    (y: Argv) =>
      accountOption(y)
        .option("slots-json", {
          describe:
            'JSON array of slots, e.g. \'[{"time":"09:00","days":[1,3,5]}]\' (0 = Sunday; max 50, one entry per time; replaces the stored slots; \'[]\' clears them)',
          type: "string",
        })
        .option("timezone", {
          describe: 'IANA timezone the slot times run in, e.g. "Europe/London" (changing only this never moves queued posts)',
          type: "string",
        })
        .example(
          `$0 queue:set --slots-json '[{"time":"09:00","days":[1,2,3,4,5]},{"time":"17:30","days":[1,3,5]}]'`,
          "Replace the posting slots and re-flow the queue"
        )
        .example('$0 queue:set --timezone "Europe/London"', "Change the posting timezone without moving posts")
        .example(`$0 queue:set --slots-json '[]'`, "Clear every predefined slot")
        .epilogue(
          "Changing the timezone and the slots in one call usually moves nothing, because the existing posts were placed under the old timezone; to re-flow them, change the timezone first, then send the slots in a second call."
        ),
    run(queueSet)
  )
  .command("tags:list", "List your tags (id, name, color)", {}, run(tagsList))
  .command(
    "tags:create <name>",
    "Create a tag",
    (y: Argv) =>
      y
        .positional("name", { describe: "Tag name (1-40 chars, unique)", type: "string" })
        .option("color", {
          describe: "Palette color name (default blue): rose, amber, lime, emerald, teal, cyan, blue, indigo, violet, fuchsia, slate, stone",
          type: "string",
        })
        .example('$0 tags:create "Launch week" --color amber', "Create an amber tag"),
    run(tagsCreate)
  )
  .command(
    "tags:update <id>",
    "Rename and/or recolor a tag",
    (y: Argv) =>
      y
        .positional("id", { describe: "Tag id (from tags:list)", type: "string" })
        .option("name", { describe: "New name (1-40 chars, unique)", type: "string" })
        .option("color", { describe: "New palette color name", type: "string" }),
    run(tagsUpdate)
  )
  .command(
    "tags:delete <id>",
    "Delete a tag (it is removed from every post that carries it)",
    (y: Argv) => y.positional("id", { describe: "Tag id (from tags:list)", type: "string" }),
    run(tagsDelete)
  )
  .command(
    "articles:list",
    "List X Articles (long-form posts)",
    (y: Argv) =>
      paginationOptions(accountOption(y)).option("status", {
        describe: "Comma list of: draft, scheduled, publishing, published, failed",
        type: "string",
      }),
    run(articlesList)
  )
  .command(
    "articles:get <id>",
    "Get one article with its body as markdown",
    (y: Argv) => y.positional("id", { describe: "Article id (from articles:list)", type: "string" }),
    run(articlesGet)
  )
  .command(
    "articles:create",
    "Create an article draft; body via --content, --file, or piped stdin (markdown)",
    (y: Argv) =>
      accountOption(y)
        .option("title", { describe: "Article title (1-300 chars)", type: "string", demandOption: true })
        .option("content", { describe: "Body as inline markdown", type: "string" })
        .option("file", { describe: "Path to a markdown file with the body", type: "string" })
        .example('$0 articles:create --title "My article" --file draft.md', "Draft from a markdown file")
        .example('cat draft.md | $0 articles:create --title "My article"', "Draft from piped stdin"),
    run(articlesCreate)
  )
  .command(
    "articles:update <id>",
    "Edit an article; only the flags you pass change",
    (y: Argv) =>
      y
        .positional("id", { describe: "Article id (from articles:list)", type: "string" })
        .option("title", { describe: "New title (1-300 chars)", type: "string" })
        .option("content", { describe: "Replacement body as inline markdown", type: "string" })
        .option("file", { describe: "Path to a markdown file with the replacement body", type: "string" })
        .option("cover-url", { describe: "http(s) image URL to set as the cover", type: "string" })
        .option("clear-cover", { describe: "Remove the cover image", type: "boolean" }),
    run(articlesUpdate)
  )
  .command(
    "articles:delete <id>",
    "Delete an article (scheduled articles refund their quota)",
    (y: Argv) => y.positional("id", { describe: "Article id", type: "string" }),
    run(articlesDelete)
  )
  .command(
    "articles:publish <id>",
    "Publish an article to X NOW (irreversible, spends quota, needs X Premium)",
    (y: Argv) => y.positional("id", { describe: "Article id", type: "string" }),
    run(articlesPublish)
  )
  .command(
    "articles:schedule <id>",
    "Schedule (or reschedule) an article",
    (y: Argv) =>
      y
        .positional("id", { describe: "Article id", type: "string" })
        .option("at", {
          describe: "UTC ISO-8601 with explicit Z or offset, more than 2 minutes in the future",
          type: "string",
          demandOption: true,
        })
        .example('$0 articles:schedule abc123 --at "2026-08-01T15:00:00Z"', "Queue an article"),
    run(articlesSchedule)
  )
  .command(
    "articles:unschedule <id>",
    "Pull a scheduled article back to draft (quota refunds)",
    (y: Argv) => y.positional("id", { describe: "Article id", type: "string" }),
    run(articlesUnschedule)
  )
  .command(
    "articles:cover <id>",
    "Generate an AI cover for an article (60-100s, spends AI credits)",
    (y: Argv) =>
      y
        .positional("id", { describe: "Article id (needs a title)", type: "string" })
        .option("style", { describe: "Style description steering the artwork (max 8000 chars)", type: "string" })
        .option("attach", {
          describe: "Attach the result as the article's cover (use --no-attach to skip)",
          type: "boolean",
          default: true,
        }),
    run(articlesCover)
  )
  .command("docs", "Print the SuperX API quickstart (markdown, no auth needed)", {}, run(docs))
  .demandCommand(1, "Specify a command. Run: superx --help")
  .strict()
  .help()
  .alias("h", "help")
  .version()
  .wrap(Math.min(100, process.stdout.columns || 100))
  .fail((msg, err) => {
    if (err) throw err;
    note(msg || "Invalid usage. Run: superx --help");
    process.exit(1);
  })
  .parse();
