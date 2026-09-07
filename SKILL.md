---
name: superx
description: SuperX is a Twitter/X growth tool. Use it to read an account's published posts with engagement metrics, pull account analytics (impressions, likes, replies, follower change), find the people who engage with the account most, review reply history in both directions (sent and received), manage contact lists, create and manage signal agents (automated lead finders), add or remove the signals they watch, and review the leads they discover, marking each one fit or not fit, search a library of 50M+ high-performing posts for inspiration, create, edit, and delete saved Engage feeds and read the posts they surface for review, create, edit, tag, or schedule draft posts and threads (with image attachments), write, schedule, publish, and generate AI covers for long-form X Articles (in one of the account's saved cover styles), and read or update the account's Context settings (profile description, interests, SuperX rules, reply settings, favorite creators, style guide, products) that steer SuperX's AI writing, all through the SuperX API.
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

**Rule 2: Read PLAYBOOK.md before creating any content.** This repo ships a growth strategy guide (`PLAYBOOK.md`, also inside the installed npm package). It tells you WHAT to post, WHEN, and WHY: the action hierarchy, out-of-network discovery, the engagement loop, and the failure modes that kill reach. The CLI gives you data and actions; the playbook gives you judgment. Do not schedule content without it.

**Rule 3: Know the write constraints.** `scheduled:create` without `--at` creates a DRAFT (nothing publishes). With `--at` it schedules for that time. `scheduled:update` changes only the flags you pass, and a new `--at` alone never schedules a draft; add `--status scheduled` to promote. Writes work on your main account or any linked account (pass the same `--account` you used to read it); accounts shared with you by other people are read-only, and tags are workspace-wide. Images attach via `media:upload` then `--media` (JPG/PNG/WEBP up to 5MB, GIF up to 15MB; max 4 images or 1 GIF per post); video is not supported. Timestamps MUST be UTC ISO-8601 with an explicit `Z` or offset; naive timestamps are rejected with 400. `posts:publish` and `articles:publish` post to X IMMEDIATELY and irreversibly; treat them like hitting Publish in public and get human confirmation of the exact text unless the user already gave it. `posts:publish` also requires `--idempotency-key`, which you reuse verbatim on any retry. `posts:draft` writes post text in the user's voice and saves NOTHING: show the drafts, let the user pick and edit one, then pass the final text to `scheduled:create` yourself; it costs AI credits per draft, so ask for the count the user actually wants.

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
4. **Read PLAYBOOK.md**, then draft content informed by what already works for this account
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

# 4. Read PLAYBOOK.md (in this skill's directory), then write content

# 5. Create (draft, review, then schedule)
superx scheduled:create --text "Post text"
superx scheduled:create --text "Post text" --at "2026-08-01T15:00:00Z"

# 6. Verify
superx scheduled:list --status draft,scheduled
```

---

## Essential Commands

### Authentication

```bash
superx login                  # Guided: prints the key page URL, prompts for a paste
superx login --key "sxk_..."  # Non-interactive
superx status                 # Verify credentials; shows plan, credits, key scopes, rate limits
superx logout                 # Delete ~/.superx/credentials.json
export SUPERX_API_KEY=sxk_... # Env alternative (credentials file wins when both exist)
```

Credentials are stored in `~/.superx/credentials.json` (file mode 0600). `SUPERX_API_URL` overrides the API base URL with a full base including path (default `https://api.superx.so/v1`).

### Identity and accounts

```bash
superx me         # Key owner, plan tier, key name and scopes
superx accounts   # X accounts this key can read; use ids with --account
```

Reads accept `--account <id>` to select a linked or shared account. Omitting it means the main account.

### Posts and analytics

```bash
superx posts:list                                  # Recent posts with metrics
superx posts:list --type posts --sort likes        # Original posts by likes
superx posts:list --since "2026-06-01T00:00:00Z" --until "2026-07-01T00:00:00Z"
superx posts:analytics                             # Totals + daily series, last 30 days
superx posts:analytics --since "2026-06-01T00:00:00Z"
superx replies:list --limit 20                     # Replies the account has sent
superx replies:received --limit 20                 # Replies the audience has sent the account
```

- `posts:list` flags: `--type posts|replies|all`, `--sort posted_at|likes|impressions`, `--since/--until`, `--limit` (max 100), `--page`.
- Post objects include `metrics` (likes, replies, reposts, quotes, bookmarks, impressions).
- `posts:analytics` range is capped at 366 days.
- `replies:received` shows who replied, what they said, likes, and the post they replied to. Flags: `--sort recent|most_liked`, `--since/--until`, `--limit` (max 100), `--page`. Use it to find replies worth answering (see PLAYBOOK.md on closing engagement loops).

### Inspiration (viral post library)

```bash
superx inspiration:search "build in public" --limit 10          # Topic search
superx inspiration:search "indie hackers" --sort outlier        # Biggest overperformers
superx inspiration:search "AI tools" --min-likes 500 --min-followers 1000 --max-followers 50000
```

- Searches a library of 50M+ real high-performing posts. Use results for structures, hooks, and angles to remix. Never copy them.
- Flags: `--sort relevant|recent|likes|reposts|impressions|outlier`, `--min-likes/--min-reposts/--min-replies/--min-bookmarks/--min-impressions`, `--min-followers/--max-followers` (author size), `--since/--until`, `--lang` (default en), `--exclude-topics "crypto,politics"`, `--limit` (max 50), `--page` (1-7).
- `outlier_score` on each result = how far the post outperformed the norm for its author's follower tier. Sorting by `outlier` surfaces content that won on substance, not audience size.
- Results are relevance-ranked, strongest matches first. Weak and promotional matches are filtered out, so a page may return fewer than `--limit` posts.

### Contacts (who engages with you)

```bash
superx contacts:list --sort engagement --limit 20   # Most engaged people
superx contacts:list --sort replies                 # By reply count
superx contacts:replies <contact-id> --sort recent  # One person's reply history to you
```

Sort options: `contacts:list` takes `engagement|replies|reposts`; `contacts:replies` takes `recent|most_liked`.

```bash
superx contacts:get <x-user-id>                      # Profile, follower counts, verified state, lists they are in (known contacts only)
superx contacts:get <x-user-id> --refresh            # Refresh a stale profile from X (costs an enrichment unit)
superx contacts:notes <x-user-id>                    # Your private notes about them, newest first
superx contacts:notes:add <x-user-id> --body "Wants a demo in September"
superx contacts:notes:update <x-user-id> <note-id> --body "Demo booked for 12 Sept"
superx contacts:notes:delete <x-user-id> <note-id>
```

- The id everywhere here is a NUMERIC X user id, from `contacts:list`, `lists:members` or `signals:leads`. `contacts:get` returns the stored profile plus each list the person is in, with the `member_id` that `lists:remove-member` takes.
- KNOWN CONTACTS ONLY: `contacts:get` and `contacts:notes:add` resolve people the account actually knows, meaning anyone who has replied to or reposted its posts, a member of one of its contact lists (manual or system), or a scored signal lead. Any other id returns 404 `contact_not_found`, even one SuperX holds a profile for. This is NOT a general X profile lookup: take ids from `contacts:list`, `lists:members` or `signals:leads` rather than typing one in.
- `--refresh` is the only path that calls X. Leave it off unless the follower counts have to be current: it counts against the tighter enrichment limit, and the default read is free of it.
- Notes live inside SuperX and are NEVER posted anywhere. Use them for context you want on the next conversation. A note written through the CLI is attributed to the account you wrote as.
- Note writes need a key with the write scope; shared accounts are read-only.

### Contact lists

```bash
superx lists:list                                    # All lists; system lists flagged is_system
superx lists:members <list-id> --q "founder"         # Members of a list the user created
superx lists:add-member <list-id> --handle levelsio  # or --x-user-id 44196397
superx lists:remove-member <list-id> <member-id>     # member-id from lists:members
```

- Lists are the saved people-collections from the SuperX app. Use them to track prospects, customers, or people worth engaging.
- System lists (Followers, Following, Repliers, Reposters) appear in `lists:list` with `is_system: true` but are read-only and their members are NOT available through the API.
- Adding someone already in a list is harmless: the existing member returns with `"duplicate": true` and nothing changes.
- Member writes work on your main or linked accounts (`--account`) and need a key with the write scope; shared accounts are read-only.

```bash
superx lists:create --name "Founder prospects"       # Names are NOT unique; check lists:list first
superx lists:rename <list-id> --name "Q4 prospects"
superx lists:delete <list-id>                        # Deletes the list and its membership; the people stay
superx lists:add-members <list-id> --x-user-ids 44196397,944883311     # up to 500 per call
superx lists:remove-members <list-id> --member-ids m1abc,m2def         # up to 500 per call
```

- `lists:add-members` does NO live lookup: it uses profiles SuperX already stores, which is why it costs one write and no enrichment. Ids SuperX has never seen come back in `not_found` and are NOT added. Add those one at a time with `lists:add-member --handle`, which does resolve live.
- Re-adding someone already in the list is counted in `duplicates`, never an error. `lists:remove-members` skips ids that are not in the list, so `deleted` can be lower than what you sent.
- `lists:delete` also stops any signal agent depositing into that list until the agent is repointed in the SuperX app. Confirm with the user first.

### Engage (feed posts to reply to)

```bash
superx engage:feeds                                  # feeds saved in the app, with type and fetch cost
superx engage:posts <feed-id> --limit 50             # one big page of candidate posts
superx engage:posts <feed-id> --mode latest --fresh true         # newest, skipping the cache
superx engage:posts <feed-id> --exclude 1234567890,1234567891    # next batch, minus what you have
superx engage:posts <feed-id> --include-replied true             # keep posts already replied to

# Feed writes (write scope; main or linked account via --account)
superx engage:feeds:create --name "AI builders" --keyword "shipping with LLMs" --keyword "eval harness"
superx engage:feeds:create --name "Founders" --x-list https://x.com/i/lists/1234567890
superx engage:feeds:create --name "Prospects" --list-id <contact-list-id>
superx engage:feeds:update <feed-id> --name "AI builders v2"
superx engage:feeds:delete <feed-id>
```

- Engage feeds are the keyword and list feeds the user set up in the app's Engage tab. `engage:feeds` gives each feed's `id`, `name`, `type` (`keywords`, `list`, `x_list`), `active`, and `fetch_units`.
- Feeds can be created, renamed, repointed and deleted here. Give `engage:feeds:create` a `--name` (1-40 chars) and exactly ONE source: repeatable `--keyword` (1-5), `--x-list` (a public X list id or `x.com/i/lists/...` link), or `--list-id` (one of the user's contact lists from `lists:list`).
- A feed you create does NOT become the feed the app has open: the person keeps their place. Tell them where to find the new feed rather than assuming they will see it.
- Up to 8 feeds per account (409 `feed_limit_reached` beyond that). `engage:feeds:update` changes one source at a time and keeps the feed's id, so a feed may switch type. Deleting the feed the app has open hands the slot to the first remaining feed.
- An X list source is looked up live: those calls also draw on the tighter enrichment allowance, and a private list is a 404 `x_list_not_found`. Keyword and contact-list feeds cost no enrichment.
- `engage:posts` returns candidate posts (text, author handle/bio/follower counts, engagement metrics, post time) plus `has_more` and the `feed`. Score and shortlist them for the user.
- READ-ONLY BY DESIGN: there is no reply command. Replies are written and sent by a person in SuperX. Sending replies that read as inauthentic can get an X account suspended and a SuperX account terminated; AI output must be reviewed and meaningfully edited by a person before it is posted. Surface candidates and draft suggestions for the user; never claim a reply was sent.
- `--limit` (1-50, default 20) applies to KEYWORD feeds. List feeds return one page per fetch (about 10 posts for a member list, 20 to 25 for an imported X list) and `--limit` only trims it. Page a list feed with `--exclude` (at most 100 ids per call; window the list to the most recent ids), not a bigger `--limit`.
- A 50-post page on a keyword feed costs the same as a 20-post page: ask for `--limit 50` a few times a day and filter locally. Feeds refresh over hours, so polling more often than hourly returns the same posts.
- Each plan has a daily feed-fetch allowance (Trial 20, Pro 60, Advanced 120, Ultra 300), separate from the read budget; per minute: trial 2, pro 5, advanced 10, ultra 15. A list feed that rotates its members counts as 3 fetches. `engage:feeds` never spends it. Over the cap you get 429 `rate_limited`: the API returns `remaining_day`; the CLI prints the message and the retry delay.
- Posts a fetch returns count as seen and get demoted in later fetches, in the app as well as here. An unknown feed id returns 404 `feed_not_found`.

### Signals (automated lead finding)

```bash
superx signals:agents                                # agents, what they watch, lead counts
superx signals:leads --limit 20                      # newest leads across all agents
superx signals:leads --agent 3 --deposited false     # one agent's leads not yet in its list
superx signals:leads --since "2026-07-01T00:00:00Z"  # leads discovered since July

# Create an agent (write scope; main or linked account via --account)
superx signals:create-agent \
  --name "Build in public founders" \
  --icp "Indie founders building SaaS in public, sharing MRR and launches" \
  --keyword "building in public" --keyword "just shipped my MVP"

# Watch an account and its followers as well as keywords
superx signals:create-agent --name "Naval orbit" --icp "..." \
  --signal "profile:@naval" --signal "follower:@naval"

# Lifecycle (agent id from signals:agents)
superx signals:update-agent 3 --icp "Series A founders hiring their first RevOps lead"
superx signals:update-agent 3 --list-id <contact-list-id>
superx signals:pause-agent 3
superx signals:resume-agent 3
superx signals:delete-agent 3

# Signals on an existing agent (signal id from the agent's signals in signals:agents)
superx signals:add-signal 3 --type keyword_watch --query "just raised a seed round"
superx signals:add-signal 3 --type follower_watch --handle naval
superx signals:add-signal 3 --type list_watch --list https://x.com/i/lists/1234567890
superx signals:remove-signal 3 118

# Teach the scorer (lead id from signals:leads, NOT an X user id)
superx signals:feedback 4821 --fit
superx signals:feedback 4821 --not-fit
superx signals:feedback 4821 --clear
```

- Signal agents are automated lead finders: they watch profiles, followers, keywords, or lists and score people against an ideal customer profile. All four watch types, agent edits, signal add/remove and lead feedback work from here.
- `signals:create-agent` requires `--name` (max 80) and `--icp` (max 500). Repeat `--keyword` for plain-language searches ("what does the target customer post about"), and repeat `--signal "type:target"` for the other kinds (`profile:@handle`, `follower:@handle`, `list:<id or x.com/i/lists link>`, `keyword:<search>`). Keywords and signals combined are 1-5 entries; omit both and 1-3 keywords are auto-suggested from the ICP. Omit `--list-id` and a contact list named `Leads: <agent name>` is created for the leads (`destination_list_created: true` in the response). `--precision high|discovery` defaults to high. Supports `--idempotency-key`.
- A create is PARTIAL SUCCESS: entries the add path rejects come back in `warnings` (each with its `type`, `target` and a `code` such as `user_not_found`, `x_list_not_found`, `duplicate_signal`, `cap_reached`) and the agent is still created with the entries that landed. Check `warnings` and re-add the fixed ones with `signals:add-signal`; never report a mistyped handle as watched.
- `signals:update-agent <id>` changes `--name`, `--icp`, `--precision`, `--list-id` or `--status`. Editing the ICP changes how NEW leads are scored; leads already found keep their scores. An unusable `--list-id` is a 404 `list_not_found`.
- `signals:add-signal` takes one target per call. Each plan caps how many signals one agent may hold (403 `cap_reached`), an agent may watch each target once (409 `duplicate_signal`), and handle/list adds are resolved live so they also draw on the enrichment allowance. `signals:remove-signal` keeps the leads that signal already found; removing the last signal is allowed and leaves the agent finding nothing.
- `signals:feedback` records the user's verdict and teaches the scorer, so ASK before deciding for them: a wrong verdict skews which leads the agent brings next. The verdict is also mirrored onto the person's row in the agent's destination list, and shows up as `feedback`/`feedback_at` on `signals:leads`.
- Creation returns immediately, but leads arrive ASYNCHRONOUSLY: the agent finds people over the following minutes and days. Never promise instant results; check `signals:leads` later.
- Deleting an agent keeps its saved leads and its contact list.
- Each lead carries the person's profile, `icp_score` and `icp_rationale` (why they matched), `deposited`/`deposited_at` (whether it has been saved to the agent's contact list yet), `discovered_at`, and `provenance` (how it was found: the action, the watched handle, the triggering post text).
- `signals:leads` flags: `--agent <id>` (from `signals:agents`; unknown id returns 404 `agent_not_found`), `--deposited true|false`, `--since/--until` (UTC ISO-8601, on discovery time), `--limit` (max 100, default 50), `--page`.
- An agent's `destination_list_id` joins to `lists:list` for the target list's name; deposited leads appear there as members.

### Scheduling

```bash
# Draft (no --at): saved, never publishes on its own
superx scheduled:create --text "Post text"

# Scheduled post (UTC ISO-8601 with Z or offset, at least 60s in the future)
superx scheduled:create --text "Post text" --at "2026-08-01T15:00:00Z"

# Thread: repeat --part in order (1-25 parts, 25,000 chars total)
superx scheduled:create \
  --part "1/ The hook" \
  --part "2/ The substance" \
  --part "3/ The close" \
  --at "2026-08-01T15:00:00Z"

# Safe retries: same key + same body returns the original result
superx scheduled:create --text "Post text" --at "2026-08-01T15:00:00Z" \
  --idempotency-key "agent-run-42"

# Organizer fields on drafts: title and scratchpad show in the app, never post
superx scheduled:create --text "Post text" --title "Launch teaser" \
  --scratchpad "Angle: contrast with last week's thread" --tag <tag-id>

# Images: upload first, then attach the object_key
KEY=$(superx media:upload ./chart.png | jq -r '.object_key')
superx scheduled:create --text "Chart of the week" --media "$KEY" --alt-text "Weekly revenue line chart"

# Thread with media on one part: pass the parts array as JSON
superx scheduled:create --parts-json '[{"text":"1/ Hook","media":[{"object_key":"'"$KEY"'","alt_text":"Chart"}]},{"text":"2/ Detail"}]'

# Queue state and cleanup
superx scheduled:list --status draft,scheduled
superx scheduled:list --tags <tag-id>              # posts carrying ANY listed tag
superx scheduled:delete <post-id>
```

- `--text`, `--part`, and `--parts-json` are mutually exclusive; one is required.
- Replays add `"replayed": true` to the JSON output and print a stderr note.
- `scheduled:list` filters: `--status draft,scheduled,sent,error` (comma list), `--tags id,id` (any-of), `--from/--to` bounds on the scheduled time.
- `media:upload` accepts JPG/PNG/WEBP (5MB) and GIF (15MB); a post part carries up to 4 images OR exactly 1 GIF. Uploads are capped at 100/day and expire after 24h if never attached.

### Publishing now (irreversible)

```bash
# Publishes to X the moment this returns. --idempotency-key is REQUIRED.
superx posts:publish --text "Post text" --idempotency-key "launch-2026-09-07"

# Thread, same shape as scheduled:create
superx posts:publish --part "1/ The hook" --part "2/ The close" --idempotency-key "thread-42"

# With an image and an auto retweet
KEY=$(superx media:upload ./chart.png | jq -r '.object_key')
superx posts:publish --text "Chart of the week" --media "$KEY" --alt-text "Weekly revenue line chart" \
  --auto-retweet 6 --idempotency-key "chart-2026-09-07"
```

- **Get explicit human confirmation of the exact text before running this.** It cannot be undone: the post is live on X. Use `scheduled:create --at` for anything that can wait, and `posts:draft` when the user still wants to review wording.
- `--idempotency-key` is required and is yours to choose. Reuse the SAME key on a retry: it returns the original result instead of posting again. Only use a new key for genuinely new content.
- On a timeout, retry with the SAME key. A retry inside the publish window returns 409 `idempotency_in_flight` with a `Retry-After` delay; after that the API checks whether the first attempt landed and replays its result rather than posting twice.
- No `--at`, `--title` or `--scratchpad`: a published post has no draft to organize (passing them returns 400).
- The result carries `status: "sent"`, `posted_at`, `x_post_id` and `url`.
- Advanced settings and Auto DM inherit the account's Default Post Settings exactly like `scheduled:create`; the `--no-*` forms turn one off for this post.

### Bulk queue operations

```bash
# Move queued posts to new times (up to 500, one transaction: all or none)
superx scheduled:bulk-retime --moves-json '[{"id":"abc","scheduled_for":"2026-09-08T15:00:00Z"}]'

# Turn Auto Retweet on for posts that do not have it (up to 100)
superx scheduled:bulk-auto-retweet --ids abc,def --auto-retweet 6 --auto-retweet-remove 4

# Delete queued posts and refund their post quota (up to 100)
superx scheduled:bulk-delete --ids abc,def
```

- All three touch **queued posts only**. Drafts, sent posts and error rows are counted in `skipped` and are never retimed or deleted, so `updated` / `deleted` can be lower than the number of ids you sent. Delete a draft with `scheduled:delete <id>`.
- `bulk-auto-retweet` never overwrites a post's existing auto retweet; those posts land in `skipped`.
- GOTCHA: posts you create through the CLI inherit the account's Default Post Settings, so if Auto Retweet is on there they ALREADY have one and `bulk-auto-retweet` reports every id as `skipped`. Create them with `--no-auto-retweet`, or clear it per post with `scheduled:update <id> --no-auto-retweet`, before bulk-applying a different one.
- Each `scheduled_for` follows the normal window: at least 60 seconds ahead, within 18 months.
- The responses are COUNTS, not per-post results. Re-read with `scheduled:list` to see the new state.
- No idempotency key: re-running the same call converges (a retime to the same time is a no-op, an already-deleted id is skipped).

### Editing drafts and scheduled posts

```bash
superx scheduled:update <post-id> --title "Better hook"          # Only the title changes
superx scheduled:update <post-id> --text "New text"              # Replace the text
superx scheduled:update <post-id> --at "2026-08-01T15:00:00Z" --status scheduled  # Promote a draft
superx scheduled:update <post-id> --status draft                 # Back to drafts (quota refunds)
superx scheduled:update <post-id> --tag <id-a> --tag <id-b>      # Replaces ALL current tags
superx scheduled:update <post-id> --clear-tags --clear-title --clear-scratchpad
```

- Only the flags you pass change; everything else on the post is preserved.
- A new `--at` alone never schedules a draft. Promotion is always explicit via `--status scheduled` (which needs a future time, provided or already set).
- CAUTION: replacement text is a FULL replace, media included. `--text` without `--media` REMOVES any images the post carried; re-list the current `object_key`s (visible in `scheduled:list`) to keep them. Title, scratchpad, tag, and time edits never touch media.

### Advanced settings (auto retweet, auto delete, auto plug, super followers)

```bash
# Explicit values on create
superx scheduled:create --text "Post" --at "2026-08-01T15:00:00Z" \
  --auto-retweet 6 --auto-retweet-remove 4

# Auto plug: reply with a template once the post hits a likes threshold
superx plug-templates:list                        # id, text, has_media
superx scheduled:create --text "Post" --at "2026-08-01T15:00:00Z" \
  --auto-plug <template-id> --auto-plug-threshold 50

# Auto delete underperformers (delete after 8h if under 500 views)
superx scheduled:create --text "Post" --at "2026-08-01T15:00:00Z" \
  --auto-delete 8 --auto-delete-threshold 500

# Turn the user's defaults OFF for one post
superx scheduled:create --text "Post" --at "2026-08-01T15:00:00Z" \
  --no-auto-retweet --no-auto-plug

# Edit or remove on an existing post (no inheritance on update)
superx scheduled:update <post-id> --auto-retweet 2
superx scheduled:update <post-id> --no-auto-delete
```

- On `scheduled:create`, flags you OMIT inherit the user's Default Post Settings from the SuperX app; that is the expected behavior, not a bug. Exactly five settings inherit (auto retweet, auto delete, auto plug, auto DM, Super Followers only); other composer defaults like Bluesky cross-posting never apply to API posts. Use the `--no-*` forms to turn a default off for one post.
- On `scheduled:update` there is no inheritance: passed flags override, omitted flags keep the post's current settings, `--no-*` removes them.
- Hours are 1-12. `--auto-plug` needs `--auto-plug-threshold` (likes); template ids come from `plug-templates:list`, unknown ids fail with `unknown_plug_template`. `--super-followers` / `--no-super-followers` toggle Super Followers only.
- Auto DM has no flag: it always follows the user's app defaults. If a plan limit strips it at create time, the response carries `"auto_dm_skipped": true`; relay that to the user instead of ignoring it.
- `scheduled:list` shows the applied settings per post (`auto_retweet`, `auto_delete`, `auto_plug`, `auto_dm`, `super_followers_only`), so you can verify what a post will actually do.

### Tags

```bash
superx tags:list                                 # id, name, color
superx tags:create "Launch week" --color amber   # colors: rose, amber, lime, emerald, teal, cyan, blue, indigo, violet, fuchsia, slate, stone
superx tags:update <tag-id> --name "Launch" --color violet
superx tags:delete <tag-id>                      # also removes it from every post
```

Tag names are unique per workspace (409 `duplicate_name`) and capped at 40 characters. Assign tags with `scheduled:create --tag` or `scheduled:update --tag`.

### Context settings (AI writing background)

The Context settings are the background SuperX's AI uses when writing for the account: who the user is, what they post about, hard rules, whose style they admire, and what products they sell. Editing them changes every AI writing surface in the app.

```bash
superx context:get                        # The whole context document
superx context:get | jq '.data.rules'     # One section

# Only the flags you pass change; "" clears a string; lists fully replace
superx context:set --rules "Never use hashtags. Keep posts under 200 chars."
superx context:set --profile-description "Indie hacker building SuperX" --profile-description-enabled
superx context:set --interests "indie hacking,SaaS,AI agents"          # replaces the list
superx context:set --favorite-creators "levelsio,marc_louvion"         # max 3, replaces the list
superx context:set --reply-rules "Be helpful, never salesy" --no-reply-author-name
superx context:set --style-audience "Bootstrapped SaaS founders"       # outranks the generated guide
superx context:set --style-audience ""                                 # revert to the generated guide

# Products (max 5): mentioned naturally in generated content
superx context:products
superx context:products:set --url "https://superx.so" --name "SuperX" --description "X growth platform"
superx context:products:set --id 3 --updates "Shipped the public API"
superx context:products:delete <product-id>
superx context:products:replace --json '[{"url":"https://superx.so","name":"SuperX"}]'   # FULL REPLACE
```

- What each setting affects: `--profile-description` grounds the AI's voice and personalizes the daily content mix and search; `--rules` are mandatory instructions on EVERY AI surface; `--reply-rules` and `--reply-author-name` steer generated replies; `--favorite-creators` (X usernames, max 3) inspire the writing style; `--interests` are the highest-priority topics for content suggestions; `--style-audience`/`--style-vocabulary` outrank the app's generated style guide until cleared.
- `context:get` also returns the read-only generated style guide (`style_guide.generated`) so you can see what a cleared override falls back to.
- Caps: profile description 500, rules 500, reply rules 500, style audience 600, style vocabulary 1000 characters; 30 interests of 50 characters each; 3 favorite creators; 5 products.
- `context:products:set --url` creates the product when it does not exist. Removing a product is reversible: re-adding the same url restores its scraped details.
- `context:products:replace` REPLACES the whole product list: any product whose url is missing from the array is removed. Read `context:products` first and send every product the user should keep, or use `context:products:set` to change one in place. `'[]'` removes every product.
- Writes need a key with the write scope. Unlike scheduling, context writes work on ANY linked or shared account via `--account` (they are per-account settings). On a share with Editor permission they return 403 `editor_restricted`: only the account owner can change these. These settings shape ALL future AI output for the account; confirm with the user before changing rules or the profile description.

### Queue settings (posting schedule)

The posting schedule is the set of predefined time slots the queue fills, plus the timezone they run in.

```bash
superx queue:get                                       # slots, timezone, is_default flags

# Slots are JSON so weekday sets stay unambiguous; 0 = Sunday
superx queue:set --slots-json '[{"time":"09:00","days":[1,2,3,4,5]},{"time":"17:30","days":[1,3,5]}]'
superx queue:set --timezone "Europe/London"            # never moves queued posts
superx queue:set --slots-json '[]'                     # clear every predefined slot
```

- `--slots-json` is a FULL REPLACE: max 50 entries, one per unique time, each with at least one weekday. Send the complete set the user should end up with.
- Changing the slots also re-flows the queue the way the app does: a queued post sitting exactly on an old slot moves to the matching new slot (Nth old occurrence to Nth new occurrence), so gaps are preserved and hand-picked custom times stay put. Read `reflow.moved` in the response to see how many posts moved.
- `reflow.bailed: true` means the settings were saved but the queue was deliberately left alone (a post had nowhere to land, or the move set was too large). Rerunning the same command is safe.
- A timezone-only change never moves posts. Changing the timezone and the slots in one call usually moves nothing, because the existing posts were placed under the old timezone; to re-flow them, change the timezone first, then send the slots in a second call.
- `slots_are_default` / `timezone_is_default` mark values the account has never set; SuperX is using its own default.
- Writes need a key with the write scope and work on any linked or shared account via `--account`, Editor-permission shares included (running the queue is exactly what a delegate is there for).

### Articles (long-form X posts)

Article bodies are markdown in BOTH directions: headings (h1-h3), bullet and numbered lists (one nesting level), blockquotes, bold/italic/strikethrough, links, images by URL, and bare X post URLs alone on a line as embeds. Code blocks and `---` rules degrade to plain text; the response lists degradations in `warnings`.

```bash
# Create: --file, --content, or piped stdin supplies the markdown body
superx articles:create --title "My article" --file draft.md
cat draft.md | superx articles:create --title "My article"

superx articles:list --status draft,scheduled
superx articles:get <article-id>                  # body returns as markdown

# Update: only the flags you pass change; --file/--content replaces the WHOLE body
superx articles:update <article-id> --title "Sharper title"
superx articles:update <article-id> --file v2.md
superx articles:update <article-id> --cover-url "https://..."   # or --clear-cover

# Lifecycle
superx articles:schedule <article-id> --at "2026-08-01T15:00:00Z"   # >2 min ahead
superx articles:unschedule <article-id>           # back to draft, quota refunds
superx articles:publish <article-id>              # LIVE NOW, irreversible, needs X Premium
superx articles:delete <article-id>

# AI cover (60-100s, spends AI credits against daily/monthly caps)
superx articles:cover-styles                      # styles saved in the app, with their ids
superx articles:cover <article-id>
superx articles:cover <article-id> --style-id <style-id>          # render in a saved style
superx articles:cover <article-id> --style "dark, minimal, geometric" --no-attach
```

- Publishing and scheduling spend post quota; the article needs a title and some content first.
- X enforces its own article limits (10 drafts/day, 5 publishes/day) and requires X Premium; those surface as publish failures.
- `articles:cover` generates from the article's TITLE. Attach is the default; `--no-attach` keeps the current cover and you can attach later with `articles:update --cover-url`.
- Steer the look with `--style-id` (one of the styles the user saved in the app, listed by `articles:cover-styles`) or `--style` (a one-off description), never both: passing both is a 400. An unknown style id is a 404 `cover_style_not_found`. Styles are saved and deleted in the app.
- A publish timeout is AMBIGUOUS: run `articles:get` and check `status` before retrying.

### Docs

```bash
superx docs   # Prints the API quickstart as markdown (works before login)
```

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

## Common Gotchas

1. **Naive timestamps are rejected (400)**. Always include `Z` or an offset: `2026-08-01T15:00:00Z`, not `2026-08-01T15:00:00`.
2. **Schedule window**: `--at` must be at least 60 seconds in the future and within 18 months.
3. **Read-only keys cannot write**: `scheduled:create`/`scheduled:delete` with a read-only key returns 403 `insufficient_scope`. Check `superx me` for the key's scopes.
4. **Shared accounts are read-only for writes**: writes work on your main account or any linked account (pass the same `--account` you used to read it). Accounts shared with you by other people return 403 `writes_main_account_only` for post, article, signal and contact-list member writes. `context:*` and `queue:set` are per-account settings that do accept a shared account.
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
superx contacts:list --sort engagement --limit 20
superx contacts:replies <id> --sort most_liked
superx contacts:get <x-user-id>
superx contacts:notes <x-user-id>
superx replies:received --sort most_liked --limit 20
superx lists:list
superx lists:members <list-id> --q "founder"
superx signals:agents
superx signals:leads --agent 3 --deposited false
superx engage:feeds
superx engage:posts <feed-id> --limit 50

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

Strategy lives in [PLAYBOOK.md](./PLAYBOOK.md). Read it before creating content (Rule 2).
