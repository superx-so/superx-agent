---
name: superx
description: Grow a Twitter/X account with SuperX. Use when someone asks for a weekly growth recap or account analytics, wants to find leads or buyers on X, needs draft posts or threads written and scheduled, wants replies drafted or reply history reviewed, asks who engages with them most, wants inspiration from high-performing posts, or wants X Articles written and published. Also covers contact lists, signal agents (automated lead finders), Engage feeds, tagging, media attachments, AI cover images, and the Context settings (profile, interests, rules, reply settings, favorite creators, style guide, products) that steer SuperX writing. Everything runs through the superx CLI or the SuperX API; nothing is posted without a person saying so.
homepage: https://docs.superx.so
metadata: {"openclaw":{"emoji":"🚀","requires":{"bins":["superx"],"env":[]}}}
---

## Install SuperX CLI if it doesn't exist

```bash
npm install -g superx-cli
```

npm release: https://www.npmjs.com/package/superx-cli
superx-agent github: https://github.com/superx-so/superx-agent
API docs: https://docs.superx.so
official website: https://superx.so

---

| Property | Value |
|----------|-------|
| **name** | superx |
| **description** | Twitter/X growth CLI: posts, analytics, contacts, contact lists, audience replies, signal agents and their leads, inspiration, tags, scheduling (with images), long-form Articles, and Context settings (AI writing background) via the SuperX API |
| **allowed-tools** | Bash(superx:*) |

---

## Three Hard Rules (Read First)

**Rule 1: Run `superx status` before anything else.** Every other command fails without valid credentials. If the `superx` binary is missing, install it with `npm install -g superx-cli`. If not authenticated, either run `superx login` (interactive) or set `export SUPERX_API_KEY=sxk_...` (CI and non-interactive sessions). Keys are created at https://app.superx.so/account?tab=api.

**Rule 2: Read `references/growth-strategy.md` before creating any content.** This skill ships a growth strategy guide (`references/growth-strategy.md`, also inside the installed npm package). It tells you WHAT to post, WHEN, and WHY: the action hierarchy, out-of-network discovery, the engagement loop, and the failure modes that kill reach. The CLI gives you data and actions; the strategy guide gives you judgment. Do not schedule content without it. For a goal-shaped task ("give me my weekly recap", "DM the people who replied to this post"), open the matching skill under `references/skills/`: the named SuperX skills, each with its exact command chain, MCP tool names and stopping point.

**Rule 3: Know the write constraints.** `scheduled:create` without `--at` creates a DRAFT (nothing publishes). With `--at` it schedules for that time. `scheduled:update` changes only the flags you pass, and a new `--at` alone never schedules a draft; add `--status scheduled` to promote. Writes work on your main account or any linked account (pass the same `--account` you used to read it); accounts shared with you by other people are read-only, and tags are workspace-wide. Images attach via `media:upload` then `--media` (JPG/PNG/WEBP up to 5MB, GIF up to 15MB; max 4 images or 1 GIF per post); video is not supported. Timestamps MUST be UTC ISO-8601 with an explicit `Z` or offset; naive timestamps are rejected with 400. `posts:publish` and `articles:publish` post to X IMMEDIATELY and irreversibly; treat them like hitting Publish in public and get human confirmation of the exact text unless the user already gave it. `posts:publish` also requires `--idempotency-key`, which you reuse verbatim on any retry. `posts:draft` writes post text in the user's voice and saves NOTHING: show the drafts, let the user pick and edit one, then pass the final text to `scheduled:create` yourself; it costs AI credits per draft, so ask for the count the user actually wants. `--voice mine` is the voice of the `--account` you pass (its own posts and style guide); shared accounts are refused.

---

## Output Contract

- **stdout is clean JSON** for every command except `docs` (markdown). Pipe anything into `jq` directly.
- Human/status lines go to **stderr**, never stdout.
- Exit code **0** on success, **1** on any error. Error details (including the API error code) are printed to stderr as `Error [code] (HTTP status): message`.

```bash
POSTS=$(superx posts:list --sort likes --limit 5)
echo "$POSTS" | jq '.data[].text'
```

---

## Core Workflow

1. **Check auth**: `superx status` (verifies the key and shows plan, AI credit pool, and rate-limit state)
2. **Discover accounts**: `superx accounts` (main account first; note ids for `--account`)
3. **Read the data**: top posts, analytics, most engaged contacts
4. **Read `references/growth-strategy.md`**, then draft content informed by what already works for this account
5. **Create**: `superx scheduled:create` (draft first when unsure; add `--at` to schedule)
6. **Verify**: `superx scheduled:list` shows the draft/queue state

```bash
# 1. Auth
superx status

# 2. Accounts
superx accounts

# 3. Read data
superx posts:list --sort likes --limit 10
superx posts:analytics
superx contacts:list --sort engagement --limit 20

# 4. Read references/growth-strategy.md (in this skill's directory), then write content

# 5. Create (draft, review, then schedule)
superx scheduled:create --text "Post text"
superx scheduled:create --text "Post text" --at "2026-08-01T15:00:00Z"

# 6. Verify
superx scheduled:list --status draft,scheduled
```

---

## Command reference

Every command family, with its flags and the caveats that matter, lives in
[references/commands.md](./references/commands.md). Open that file and jump to
the section you need instead of guessing flags; `superx <command> --help` is the
live check on any one command.

The families, in the order they appear there: authentication, identity and
accounts, posts and analytics, inspiration, live X lookups, inspiration media,
contacts, contact lists, audience, mentions, datasets, engage, signals, lead
search and outreach, writing helpers, workers, scheduling, publishing now, bulk
queue operations, editing drafts and scheduled posts, advanced post settings, DM
campaigns, tags, context settings, queue settings, articles, docs.

---

## Common Patterns

### Pattern 1: Study what works before writing

```bash
# Top posts by engagement, last 60 days
SINCE=$(date -u -v-60d +"%Y-%m-%dT00:00:00Z" 2>/dev/null || date -u -d "60 days ago" +"%Y-%m-%dT00:00:00Z")
superx posts:list --sort likes --since "$SINCE" --limit 10 | jq '[.data[] | {text, metrics}]'

# What does the trend look like?
superx posts:analytics --since "$SINCE" | jq '.data.totals, .data.followers'
```

### Pattern 2: Draft first, schedule after review

```bash
DRAFT=$(superx scheduled:create --text "Candidate post text")
DRAFT_ID=$(echo "$DRAFT" | jq -r '.data.id')
# ... surface the draft for human review ...
# To publish it at a time, delete the draft and re-create with --at:
superx scheduled:delete "$DRAFT_ID"
superx scheduled:create --text "Final post text" --at "2026-08-01T15:00:00Z"
```

### Pattern 3: Find who to engage with today

```bash
# The people already engaging with you (reply to them first)
superx contacts:list --sort engagement --limit 10 | jq '[.data[] | {id, username, name}]'

# What has this person said to you lately?
superx contacts:replies "$CONTACT_ID" --sort recent --limit 5 | jq '.data'
```

### Pattern 4: Retry with backoff on rate limits

```bash
for attempt in 1 2 3; do
  if OUT=$(superx scheduled:create --text "Post" --at "2026-08-01T15:00:00Z" \
      --idempotency-key "job-17"); then
    echo "$OUT" | jq -r '.data.id'
    break
  fi
  # Exit 1: stderr had "Error [rate_limited] ..." and a Retry-After hint
  sleep $((attempt * 30))
done
```

Rate limits are per account owner and scale with the plan: reads, writes, enrichment and feed fetches each have their own per-minute and per-day windows, and media uploads are capped at 100 per key per day. Every authenticated response carries `X-RateLimit-*` headers; `superx status` shows the current window and the AI credit pool. On 429 the stderr message includes the retry delay. Current numbers: https://docs.superx.so/rate-limits

### Pattern 5: Batch a week of content

```bash
TIMES=("2026-08-03T15:00:00Z" "2026-08-04T15:00:00Z" "2026-08-05T15:00:00Z")
TEXTS=("Monday post" "Tuesday post" "Wednesday post")
for i in "${!TIMES[@]}"; do
  superx scheduled:create --text "${TEXTS[$i]}" --at "${TIMES[$i]}" \
    --idempotency-key "week32-$i" | jq -r '.data.id'
done
superx scheduled:list --status scheduled
```

---

## Skills

A goal-shaped recipe for every SuperX skill, each with its CLI chain, its MCP
tool chain and the point where it hands back to a person. Pick one by goal
and open its `recipe.md`; the three rules every skill obeys and the `--account`
scoping are in [references/skills/README.md](./references/skills/README.md).

<!-- skills:index:start -->
### Grow & Plan
- **Weekly Growth Recap**: Your week in review: wins, patterns, and next week's focus. -> references/skills/weekly-growth-recap/recipe.md
- **Growth Plan Builder**: A multi-week growth plan tied to your actual numbers. -> references/skills/growth-plan-builder/recipe.md
- **Cadence & Queue Audit**: Diagnose your posting rhythm and spot queue gaps and pile-ups. -> references/skills/cadence-and-queue-audit/recipe.md
- **Find Your Story**: Find the story people follow you for: stakes, struggle, and where it's heading. -> references/skills/find-your-story/recipe.md

### Content & Posting
- **Daily Post Ideas**: What to post today, drafted and ready to schedule. -> references/skills/daily-post-ideas/recipe.md
- **Viral Format Remix**: Borrow proven hooks and structures from 50M+ real posts. -> references/skills/viral-format-remix/recipe.md
- **Trending Now Scan**: High-performing posts in your niche from the last 48 hours. -> references/skills/trending-now-scan/recipe.md
- **Thread Builder**: Turn an idea or rough notes into a thread ready to schedule. -> references/skills/thread-builder/recipe.md
- **Week of Posts**: A week of drafts, spread across the week, one approval each. -> references/skills/week-of-posts/recipe.md
- **Repurpose a Winner**: Your best post, reworked into fresh angles. -> references/skills/repurpose-a-winner/recipe.md
- **Queue Reshuffle**: Move and rewrite scheduled posts by just asking. -> references/skills/queue-reshuffle/recipe.md
- **Worker Output Review**: Triage the posts your Workers wrote while you were away. -> references/skills/worker-output-review/recipe.md
- **Viral Score Loop**: Score a draft against your own posts, then sharpen it until the score stops rising. -> references/skills/viral-score-iterate/recipe.md

### Replies & Engagement
- **Reply Sprint**: The replies your posts got, each with a ready-to-send draft. -> references/skills/reply-sprint/recipe.md
- **Worth a Reply**: Let Jev read your niche and hand you the posts worth replying to today. -> references/skills/worth-a-reply/recipe.md
- **Reply to Any Post**: Paste any post, get the context and a strong reply. -> references/skills/reply-to-any-post/recipe.md
- **My Replies Report**: Which of your replies actually earn attention. -> references/skills/my-replies-report/recipe.md
- **Who Is This Person?**: A fast read on any public account, plus your history with them. -> references/skills/who-is-this-person/recipe.md

### Leads & Prospecting
- **Your Warmest Leads**: The people already engaging with you most, ready for a follow-up. -> references/skills/your-warmest-leads/recipe.md
- **Instant Lead Hunt**: Search X live for people matching the audience you describe, scored. -> references/skills/instant-lead-hunt/recipe.md
- **Standing Lead Agent**: A lead-finding agent that keeps searching while you sleep. -> references/skills/standing-lead-agent/recipe.md
- **Lead Review**: The leads your agents found, prioritized, with the top few activity-checked. -> references/skills/lead-review/recipe.md

### Outreach & DMs
- **Warm Outreach Pipeline**: Research a list, get personalized DMs, approve every message before it queues. -> references/skills/warm-outreach-pipeline/recipe.md
- **Profile Research Briefs**: Structured briefs on any list of people, exportable as CSV. -> references/skills/profile-research-briefs/recipe.md
- **Reply-to-DM Campaign**: DM the people who replied to any of your posts. -> references/skills/reply-to-dm-campaign/recipe.md
- **DM-Ready Audience Builder**: Build a clean, DM-able audience from any post or public X list. -> references/skills/dm-ready-audience-builder/recipe.md

### Audience & Data
- **Audience Export**: Everyone who engaged a post, as a spreadsheet, no filters. -> references/skills/audience-export/recipe.md
- **Sentiment Slice**: Keep only the people who said what you're looking for. -> references/skills/sentiment-slice/recipe.md
- **My Content Export**: Your own posts or replies, as a spreadsheet. -> references/skills/my-content-export/recipe.md

### Analytics & Insights
- **Post Post-Mortem**: Why a post overperformed or flopped, in plain terms. -> references/skills/post-post-mortem/recipe.md
- **Top Performers Breakdown**: The pattern your best posts share, and the shape to write more of. -> references/skills/top-performers-breakdown/recipe.md

### Rules & Setup
- **Teach SuperX Your Rules**: Set standing rules for your AI drafts. -> references/skills/teach-superx-your-rules/recipe.md
<!-- skills:index:end -->

---

## Common Gotchas

1. **Naive timestamps are rejected (400)**. Always include `Z` or an offset: `2026-08-01T15:00:00Z`, not `2026-08-01T15:00:00`.
2. **Schedule window**: `--at` must be at least 60 seconds in the future and within 18 months.
3. **Read-only keys cannot write**: `scheduled:create`/`scheduled:delete` with a read-only key returns 403 `insufficient_scope`. Check `superx me` for the key's scopes.
4. **Shared accounts are read-only for writes**: writes work on your main account or any linked account (pass the same `--account` you used to read it). Accounts shared with you by other people return 403 `writes_main_account_only` for post, article, signal and contact-list member writes, and for `posts:draft`. `context:*` and `queue:set` are per-account settings that do accept a shared account.
5. **Images need an upload first**: `--media` takes `object_key`s from `media:upload`, never file paths or URLs. Unknown keys return 400 `invalid_media`; a presign whose bytes were never PUT returns 400 `media_not_uploaded`. Video is not supported.
6. **Size caps**: max 25 thread parts, 25,000 characters total.
7. **Rate limited (429)**: `rate_limited` on stderr with a retry delay. Back off; do not hammer.
8. **Draft vs scheduled**: no `--at` means DRAFT. Drafts never publish on their own.
9. **Idempotency-Key reuse with a DIFFERENT body** returns 409 `idempotency_key_reuse`. Same body replays the original result with `"replayed": true`.
10. **`account_not_found` (404)**: the `--account` id is not one of the key owner's accounts. Run `superx accounts` for valid ids.
11. **Subscription errors**: a lapsed SuperX subscription returns 403. The account owner needs to resubscribe in the app.
12. **`scheduled:list --status draft --from ...` returns nothing**: drafts have no scheduled time, so time bounds exclude them. Query drafts without `--from/--to`.
13. **`scheduled:update --at` alone never publishes a draft**: promotion needs an explicit `--status scheduled`. Setting `--status scheduled` without any future time returns 400.
14. **`scheduled:update --tag` replaces the FULL tag set**: pass every tag the post should keep, or use `--clear-tags` to remove all.
15. **Text replacement wipes media unless re-listed**: `scheduled:update --text` (or `--part`) without `--media` removes the post's images. Re-include the current `object_key`s to keep them.
16. **`articles:publish` is irreversible and needs X Premium**: without it the publish fails with 403 `x_premium_required`. On a timeout, `articles:get` first; the publish may have completed.
17. **Article schedule lead time is 2 minutes** (posts need only 60 seconds). 400 `invalid_parameter` under that.
18. **`articles:cover` needs a title** (400 `article_title_required`) and is capped daily/monthly (429 with `remaining_day`/`remaining_month`). One generation at a time per article (409 `cover_gen_in_progress`).
19. **Article markdown degrades, never fails, for unsupported constructs** (code fences, `---`); check `warnings` in the response. Non-http(s) image or link URLs DO fail with 400.
20. **System lists are index-only**: `lists:members` on a system list returns 400 `system_list_not_supported`; add/remove returns 400 `system_list_read_only`. Work with lists the user created.
21. **`lists:add-member` takes exactly one of `--handle` or `--x-user-id`**. An unknown handle returns 404 `user_not_found`.
22. **An unknown signal agent id returns 404 `agent_not_found`** (on `signals:leads --agent`, `signals:pause-agent`, `signals:resume-agent`, and `signals:delete-agent`; a repeated delete too).
23. **Signal agents find leads asynchronously**: `signals:create-agent` returns the created agent, not leads. Leads land over the following minutes and days; read them with `signals:leads`.
24. **Plan caps on agents return 403 `cap_reached`**: the plan allows only so many agents (and keyword signals per agent). Pause/delete an existing agent or ask the account owner to upgrade.
25. **Agent creation is composite**: with an auto-created list, a mid-failure can leave an empty `Leads: ...` contact list behind (visible in `lists:list`, deletable in the app). The agent itself is never left without signals.
26. **`context:set` list flags REPLACE the stored list**: `--interests` and `--favorite-creators` overwrite what is there; include every value the user should keep. `""` on a string flag clears it (style-guide overrides then revert to the generated guide). These settings steer all future AI output; confirm with the user before changing them.
27. **`queue:set --slots-json` REPLACES the whole schedule** and re-flows queued posts onto the new slots. Read the current slots with `queue:get` first and send the full set. `'[]'` clears every slot and leaves the queue all-custom. `reflow.bailed: true` means the settings saved but no post moved.
28. **`editor_restricted` (403)**: the account is shared with the key owner with Editor permission. Editors can change queue settings but not context settings. Only the account owner can.
29. **`lists:add-members` takes ids SuperX already knows**: it does no live lookup, so any id in the response's `not_found` was never added. Add those with `lists:add-member --handle <handle>` one at a time (that path resolves live and costs an enrichment unit).
30. **`contacts:get` and `contacts:notes:add` are known-contacts only**: they resolve engagers, contact-list members and scored signal leads, and 404 `contact_not_found` on any other id, including ids SuperX has a profile for. Get ids from `contacts:list`, `lists:members` or `signals:leads`; there is no general profile lookup yet. `contacts:notes`, `contacts:notes:update` and `contacts:notes:delete` are NOT restricted: they work on any id you already have a note on, so notes stay reachable after someone drops out of your contacts.
31. **Notes written through the API are attributed to the acting account**, not to a separate API identity: `created_by` on a note is the account named by `--account` (your main account when omitted). A note id from a different contact returns 404 `note_not_found`.
32. **`context:products:replace` REPLACES the whole product list**: products whose url is missing from `--json` are removed. Read `context:products` first, or use `context:products:set` for a single-product edit.
33. **`posts:publish` is irreversible and needs `--idempotency-key`**: it posts to X immediately. Confirm the exact text with the user first. Without the key the command exits 1; on a timeout retry with the SAME key (409 `idempotency_in_flight` means the first attempt is still running, so wait for the `Retry-After` delay and retry that same key again). `--at`, `--title` and `--scratchpad` are rejected.
34. **The bulk commands only touch QUEUED posts**: `scheduled:bulk-retime`, `scheduled:bulk-auto-retweet` and `scheduled:bulk-delete` skip drafts, sent posts and error rows, and `bulk-auto-retweet` also skips posts that already have an auto retweet. They answer with counts, so compare against `scheduled:list` rather than assuming every id was applied.
35. **`replies:list` page 1 can carry `metrics_pending` items**: replies sent from the SuperX app in the last 4 hours are merged in with zero metrics until X reports them, so page 1 can hold slightly more items than `--limit`. Later pages and `--since`/`--until` queries never include them.
36. **`engage:posts --limit` is keyword-feeds only**: list feeds return one page of about 10 to 25 posts per fetch, so page them with `--exclude` (the ids you already have, at most 100 per call), not a bigger `--limit`. Each plan also has a daily feed-fetch allowance (separate from reads) and a list feed that rotates its members counts as 3 fetches, so fetch big pages a few times a day rather than polling. Posts a fetch returns count as seen and are demoted in later fetches, in the app as well as here.
37. **A feed you create is not the feed the app has open**: `engage:feeds:create` saves the feed but never switches the person's view. Tell them where to find it. The cap is 8 feeds (409 `feed_limit_reached`), `engage:feeds:update` takes one source at a time, and deleting the open feed hands the slot to the first remaining one.
38. **An X list feed or signal costs enrichment and needs a PUBLIC list**: `engage:feeds:create --x-list`, `engage:feeds:update --x-list` and `signals:add-signal --type list_watch` each spend one enrichment unit and 404 `x_list_not_found` on a private or deleted list. Keyword and contact-list sources cost none.
39. **`signals:create-agent` is partial success**: entries that fail come back in `warnings` with a `code`, and the agent is still created from the ones that landed. Read `warnings` before telling the user what the agent watches; re-add fixed entries with `signals:add-signal`.
40. **`signals:feedback` takes the numeric LEAD id from `signals:leads`, not an X user id**, and it trains the scorer. Ask the user for the verdict rather than inferring one. An id from another account returns 404 `lead_not_found`; a repeated `signals:remove-signal` returns 404 `signal_not_found`.
41. **`articles:cover --style-id` and `--style` are mutually exclusive** (400 if both are sent). Style ids come from `articles:cover-styles`; an unknown one returns 404 `cover_style_not_found`.
42. **A dataset has to be `ready` before you read its rows, export it or add it to a list.** Poll `datasets:get <id>` until `status` is `ready`; anything else returns 409 `dataset_not_ready`, and a `failed` dataset has to be rebuilt in the SuperX app. Datasets expire after 30 days, after which the id 404s.
43. **`datasets:add-to-list` dedupes by person and skips rows without an X account id** (research rows sometimes have none), so `added + duplicates` can be lower than the dataset's `row_count`. `skipped_without_id` counts only the rows with no usable X account id or handle; repeat rows for the same person (a replier who replied twice) are deduped silently and are not counted anywhere. Re-running the same command is safe: people already in the list come back in `duplicates`.
44. **The `x:*` lookups share a 300/day allowance with Ask SuperX in the app**, on top of the enrichment allowance (1 unit each, 3 for `x:replies`, 2 for `x:post --quotes` or a handle SuperX has never seen). Look up what the user actually asked about; do not sweep an account's network. `429 lookup_quota_exceeded` covers three cases and the body says which: your own allowance is used up (it carries `limit`), the SuperX-wide allowance is used up (no `limit`, not your budget), or the counter could not be verified and the call was refused rather than run unmetered (no `limit`, short `retry_after`). Honour `retry_after` rather than assuming midnight, and report it rather than retrying in a loop. Repeats within 15 minutes come from a server-side cache and do not touch the daily allowance.
45. **`x:replies` is a sample, not every reply**: the best-liked direct replies from up to 3 relevance-ranked pages, not chronological, and it cannot page further. It also does NOT exclude the account owner's own replies, unlike the same view in the app. Use the audience collections (`datasets:list`) when someone needs everyone who replied. And a `post_not_found` on `x:post` can be a transient upstream failure rather than a deleted post, so retry once before saying it is gone.

46. **`audience:list` pages by cursor, not by page number.** Pass `pagination.next_cursor` back as `--cursor`; there is no `--page` and no `total`. Quote `meta.synced_count` for the size of the list, but note it may exceed the rows a full walk returns (edges that were later removed are still counted). Check `meta.status`: anything but `complete` means SuperX is still syncing, and `meta.is_capped: true` on the follow lists means it is the most recent slice, not everyone. `meta.account_id` is the account id you pass to `--account`; the X user id is `meta.x_account_id`. Repliers and reposters only cover a rolling 90 days.
47. **`engage:mentions` costs 3 feed fetches per call and shows more than the app.** It draws on the same daily feed allowance as `engage:posts`, so read one page and work from it rather than polling. It does NOT apply the skipped/blocked filtering the app's Mentions tab does (that lives with the app), and by default it leaves out mentions already replied to on X unless you pass `--include-replied true`.
48. **`datasets:collect` can return before the collection is done.** `status: "collecting"` means zero rows so far and work still running: use `--wait`, or poll `datasets:get` until `ready`, and never state a row count from the create result. A collection whose size cannot be established up front also runs in the background. It costs one of 10 collections a day shared with Ask SuperX in the app, only one runs per account at a time (409 `collection_in_progress`), and an empty result creates no dataset at all (`data: null` plus a `note`) and gives the daily slot back.
49. **Nothing in the outreach chain sends a DM.** `datasets:outreach-drafts` writes message TEXT onto a research dataset and stops there; a person reviews and sends them from the SuperX app. Never say messages were sent and never offer to send them. If the user explicitly asks, you may QUEUE them with `dm:campaign` (one recipient entry per person, each with its own `message`), which is still an enqueue: the app sends. Ask the user for the `--format`; never invent one. Re-running overwrites every draft, `generic` counts messages written with no personal claims (that brief had no usable hook), and `contaminated` counts drafts discarded for naming a different recipient - run it again to retry those rows.
50. **`signals:search` saves nothing and `datasets:research` charges per profile.** A search creates no agent and no stored leads, so keep what the user needs from that response; use `signals:create-agent` when they want leads to keep arriving. Research is a flat 1 credit per profile ACTUALLY researched (handles that cannot be resolved, and people with no recent posts, come back in `skipped` and are refunded), and over 5 profiles it runs in the background: never state a brief count from a `collecting` result. `datasets:refine` also creates a dataset, so it spends one of the same 10 collections a day.
51. **`ai_action_limited` has two scopes.** Read `error.scope` before telling the user anything: `"account"` is their plan's own daily cap for that action, `"platform"` is a fair-use ceiling on live-data actions shared by every SuperX account. On `"platform"` their own allowance is untouched, so wait for `reset_at` and retry rather than reporting them as out of quota.
52. **The writing helpers draft, they never publish.** `engage:reply-draft`, `posts:remix`, `tools:inline-edit`, `tools:rephrase`, `tools:factcheck` and `posts:viral-score` all return TEXT or a score and stop there - nothing is posted, scheduled or sent. Unlike `posts:draft`, they also accept an account shared with you. Show the output, let the user edit it, and use `posts:draft`, `scheduled:create` or `posts:publish` when they say so. A `tools:factcheck` verdict is a model reading two search results: report it with its sources, never as settled fact.
53. **The free helpers cost nothing but are not unlimited.** `context:regenerate-style-guide` is once an hour per account and does not override a manual style-guide setting; `context:scrape-product` and `signals:expand-icp --url` share 20 page reads a day with the SuperX app, and `--url` also inherits the app's limit of 10 prefills per 10 minutes (that one comes back as `rate_limited` and clears in about a minute, so retry rather than reporting a daily budget); `signals:suggest-keywords` and `signals:expand-icp --text` have no ceiling of their own, so do not loop them - each one is a model call. All five send `X-Credits-Remaining` but no `X-Credits-Charged`, because nothing was charged. All four commands still need a key with the write scope: they are POSTs, and every non-GET API route needs it.
54. **A DM campaign is an ENQUEUE, not a send.** `dm:campaign` returns counts of what was QUEUED; the SuperX app's scheduler sends them later, within the account's daily and monthly DM limits, so never report messages as delivered from that response - `dm:campaign-status` and `dm:queue` show what actually went out. Confirm the recipient list and the exact text with the user first: they are responsible for these messages under X's automation rules. Cancel the unsent ones with `dm:cancel`; anything already sent cannot be recalled.

---

## Quick Reference

```bash
# AUTHENTICATE FIRST
superx status                                     # Check auth + rate limits
superx login                                      # Guided key paste
superx login --key "sxk_..."                      # Non-interactive
superx logout                                     # Remove credentials
export SUPERX_API_KEY=sxk_...                     # Env alternative (CI)

# Identity
superx me                                         # Owner, plan, key scopes
superx accounts                                   # Readable accounts + ids

# Reads
superx posts:list --type posts --sort likes --limit 10
superx posts:list --since "2026-06-01T00:00:00Z" --until "2026-07-01T00:00:00Z"
superx posts:analytics --since "2026-06-01T00:00:00Z"
superx replies:list --limit 20
superx inspiration:search "build in public" --sort outlier --limit 10
superx inspiration:media "founder morning routine" --limit 10   # cross-platform media index (--limit up to 120, no paging)
superx contacts:list --sort engagement --limit 20
superx contacts:replies <id> --sort most_liked
superx contacts:get <x-user-id>
superx contacts:notes <x-user-id>
superx replies:received --sort most_liked --limit 20
superx lists:list
superx lists:members <list-id> --q "founder"
superx audience:list followers --limit 100         # system lists: cursor paging, no --page
superx engage:mentions --sort top                  # live @-mentions (costs 3 feed fetches)
superx signals:search --keywords "..." --icp "..."  # live lead search, saves nothing
superx signals:agents
superx signals:leads --agent 3 --deposited false
superx engage:feeds
superx engage:posts <feed-id> --limit 50
superx datasets:list
superx datasets:get <dataset-id>
superx datasets:rows <dataset-id> --limit 50
superx datasets:export <dataset-id>                   # CSV file here; --out - streams to stdout
superx datasets:collect --source repliers --target <post-url> --wait   # build one, poll until ready
superx datasets:refine <dataset-id> --criterion "..." --wait          # filter by what each person wrote
superx datasets:research --handles a,b,c --wait                       # briefs, 1 credit per profile
superx datasets:outreach-drafts <dataset-id> --format "..."           # message TEXT only, nothing sent

# Live X lookups (enrichment units + a shared 300/day allowance)
superx x:post <id-or-url>                             # one public post, live (--quotes for quotes)
superx x:replies <id-or-url> --limit 20               # best-liked direct replies (a sample)
superx x:user <handle>                                # one public profile, live
superx x:user-posts <handle> --no-reposts             # one live page of their latest posts

# Contact writes (main or linked account)
superx contacts:notes:add <x-user-id> --body "..."      # Private note, never posted
superx contacts:notes:update <x-user-id> <note-id> --body "..."
superx contacts:notes:delete <x-user-id> <note-id>

# Contact list writes (main or linked account)
superx lists:add-member <list-id> --handle levelsio
superx lists:remove-member <list-id> <member-id>
superx lists:create --name "Founder prospects"
superx lists:rename <list-id> --name "Q4 prospects"
superx lists:delete <list-id>                            # List + membership; the people stay
superx lists:add-members <list-id> --x-user-ids 44196397,944883311    # <=500, ids SuperX knows
superx lists:remove-members <list-id> --member-ids m1abc,m2def        # <=500
superx datasets:add-to-list <dataset-id> --list-id <list-id>          # people from a ready dataset

# Engage feed writes (main or linked account)
superx engage:feeds:create --name "AI builders" --keyword "shipping with LLMs"
superx engage:feeds:create --name "Founders" --x-list https://x.com/i/lists/1234567890
superx engage:feeds:update <feed-id> --name "AI builders v2"
superx engage:feeds:delete <feed-id>

# Signal agent writes (main or linked account)
superx signals:create-agent --name "..." --icp "..." --keyword "..."   # Lead finder
superx signals:create-agent --name "..." --icp "..." --signal "profile:@naval"
superx signals:update-agent <id> --icp "..." --list-id <contact-list-id>
superx signals:add-signal <id> --type follower_watch --handle naval
superx signals:remove-signal <id> <signal-id>
superx signals:feedback <lead-id> --fit                # or --not-fit / --clear
superx signals:pause-agent <id>
superx signals:resume-agent <id>
superx signals:delete-agent <id>

# Writes (main or linked account via --account)
superx scheduled:create --text "Post"                                  # Draft
superx scheduled:create --text "Post" --at "2026-08-01T15:00:00Z"      # Scheduled
superx scheduled:create --part "1/" --part "2/" --at "..."             # Thread
superx scheduled:create --text "Post" --at "..." --idempotency-key k1  # Safe retry
superx scheduled:create --text "Post" --title "Hook v2" --tag <id>     # Organizer fields
superx media:upload ./chart.png                                        # Image -> object_key
superx scheduled:create --text "Post" --media <object_key> --alt-text "..."  # With image
superx scheduled:update <id> --title "Better hook"                     # Edit; only passed flags change
superx scheduled:update <id> --at "..." --status scheduled             # Promote a draft
superx scheduled:list --status draft,scheduled
superx scheduled:list --tags <tag-id>
superx scheduled:delete <id>

# Publish NOW (irreversible; key required, reuse it on a retry)
superx posts:publish --text "Post" --idempotency-key k1

# Writing helpers (text in, text out; nothing is posted)
superx engage:reply-draft --post <id> --thoughts "..." --tone concise
superx posts:remix --text "..." --closeness 70
superx tools:inline-edit --text "..." --full "..." --type hook
superx tools:rephrase --type concise --text "..."
superx tools:factcheck --text "..."
superx posts:viral-score --text "..."

# DM campaigns (queued only; the SuperX app sends them)
superx dm:limits
superx dm:campaign --recipients people.json --message "Hey [first], ..."
superx dm:campaign-status <campaign-id>
superx dm:queue --status pending
superx dm:cancel <campaign-id>

# Free helpers (no AI credits)
superx context:regenerate-style-guide
superx context:scrape-product <product-id>
superx signals:suggest-keywords --icp "B2B SaaS founders worried about churn"
superx signals:expand-icp --text "Indie founders building SaaS in public"
superx signals:expand-icp --url superx.so

# Bulk queue operations (queued posts only; answers are counts)
superx scheduled:bulk-retime --moves-json '[{"id":"abc","scheduled_for":"2026-09-08T15:00:00Z"}]'
superx scheduled:bulk-auto-retweet --ids abc,def --auto-retweet 6
superx scheduled:bulk-delete --ids abc,def

# Tags
superx tags:list
superx tags:create "Launch week" --color amber
superx tags:update <id> --name "Launch"
superx tags:delete <id>

# Articles (markdown bodies; publish is live + irreversible)
superx articles:create --title "My article" --file draft.md
superx articles:list --status draft
superx articles:get <id>
superx articles:update <id> --file v2.md
superx articles:schedule <id> --at "2026-08-01T15:00:00Z"
superx articles:unschedule <id>
superx articles:publish <id>
superx articles:cover-styles
superx articles:cover <id> --style "minimal"
superx articles:cover <id> --style-id <style-id>
superx articles:delete <id>

# Context settings (AI writing background)
superx context:get
superx context:set --rules "Never use hashtags."
superx context:set --interests "indie hacking,SaaS"   # replaces the list
superx context:products
superx context:products:set --url "https://superx.so" --name "SuperX"
superx context:products:delete <id>
superx context:products:replace --json '[{"url":"https://superx.so"}]'   # FULL REPLACE

# Queue settings (posting schedule; 0 = Sunday)
superx queue:get
superx queue:set --slots-json '[{"time":"09:00","days":[1,3,5]}]'   # replaces the slots
superx queue:set --timezone "Europe/London"                          # never moves posts

# Docs and help
superx docs                                       # API quickstart (markdown)
superx --help                                     # All commands
superx scheduled:create --help                    # Command help
```

Strategy lives in [references/growth-strategy.md](./references/growth-strategy.md). Read it before creating content (Rule 2). Goal-shaped recipes live in [references/skills/](./references/skills/): open the one that matches what the user asked for.
