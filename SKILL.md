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

### Live X lookups

```bash
superx x:post https://x.com/levelsio/status/1938765432109876543   # one public post, live
superx x:post 1938765432109876543 --quotes                        # + a page of quote posts
superx x:replies 1938765432109876543 --limit 20                   # best-liked direct replies
superx x:user @levelsio                                           # one public profile, live
superx x:user-posts levelsio --limit 20 --no-reposts              # their latest posts
```

- These read X **right now**, not SuperX's stored data. Use them for a post or account the user names; use `posts:list` / `contacts:*` for the user's own SuperX data.
- Cost: the tighter **enrichment** allowance, 1 unit each, **3** for `x:replies` (it walks up to 3 pages), 2 for `x:post --quotes` and 2 for an `x:user-posts` handle SuperX has never seen (`profile_resolved_locally: false` reports that). A multi-unit call is all-or-nothing, never half-charged.
- On top of that they share an allowance of **300 live lookups per day** with Ask SuperX inside the app. Over it: `429 lookup_quota_exceeded` with `retry_after`, `limit` and `reset_at`, resetting at midnight UTC. That gate fails CLOSED, so the same code appears when SuperX cannot verify the count. Do not retry in a loop; tell the user.
- Results are cached server-side for about **15 minutes**. A repeat still costs its enrichment units but does not touch the 300/day allowance.
- `x:replies` is a **sample**: the best-liked replies from up to 3 relevance-ranked pages (about 60 candidates), never every reply and never chronological. For everyone who replied to a post, use the audience collections (`datasets:list`) built in the app. It also does NOT hide the account owner's own replies, unlike the same feature in the app.
- `x:post` 404s `post_not_found` for a deleted, protected or wrong id. The upstream read reports a missing post and a failed read identically, so retry once before telling the user a post is gone. `x:user` / `x:user-posts` 404 `user_not_found` for a suspended, renamed or misspelled handle.
- Owner-scoped: none of these take `--account`. Nothing about a public lookup is per-X-account.

### Inspiration media (cross-platform)

```bash
superx inspiration:media "founder morning routine" --limit 10
superx inspiration:media --platforms youtube,instagram --media-type video
superx inspiration:media                                          # browse the newest
```

- Searches the media index behind the app's Inspiration > Media tab: short-form video and image posts from x, instagram, youtube, threads, reddit and linkedin, with captions, a summary and engagement counts.
- **No media file URLs.** There is no thumbnail or video link in the response; `source_url` opens the original post on its own platform, so link the user there rather than trying to embed the media.
- With **no query** it browses the newest media instead of searching. `meta.mode` says which ran, and only `search` results carry a `score`. Unlike the app there is **no personalisation** here.
- Costs no enrichment. Its own caps are a burst of 20 (refilling one every 3 seconds) and 500 FRESH searches a day; repeats of a recent identical search come from a cache and do not count.
- **No pagination.** One query returns at most 120 items and `--limit` only trims that, so ask for `--limit 120` and filter locally rather than calling it again for "the next page".
- `--content-type` is a **free-text label as stored in the index**, with no list to choose from. A label the index does not use returns zero items and still burns one of the 500 daily searches, so leave it off unless the user named one.
- Use it for visual format and hook research, never to copy.

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
- System lists (Followers, Following, Repliers, Reposters) appear in `lists:list` with `is_system: true` and a real `member_count`, but they are read-only and `lists:members` will not serve them: read their people with `audience:list <kind>` instead.
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

### Audience (followers, following, repliers, reposters)

```bash
superx audience:list followers --limit 100           # newest followers first
superx audience:list following
superx audience:list repliers                        # people who replied in the last 90 days
superx audience:list reposters
superx audience:list followers --cursor "<next_cursor>"   # the next page
```

- These are the four SYSTEM people-lists in the app's Contacts tab. `lists:members` does not serve them; this is where they are read.
- Paging is by **cursor**, not page number. Take `pagination.next_cursor` from one call and pass it as `--cursor` to the next; `has_more: false` means you are at the end. Do not try `--page`.
- There is no `total`. `meta.synced_count` is the size of the whole list, so quote that rather than counting rows. It may exceed the rows a full walk returns, because edges that were later removed are still counted.
- `meta.status` is the sync state (`missing`, `pending`, `running`, `complete`, `paused`): anything but `complete` means SuperX is still filling the list in, so say so rather than presenting a partial list as the whole audience.
- On `followers` / `following`, `meta.is_capped: true` means the account is deeper than the plan's `backfill_cap` and the list is the most recent slice, not everyone.
- `repliers` and `reposters` are a rolling 90-day window (`meta.window_days`): someone whose last reply ages past 90 days drops out and comes back on their next one.
- `engaged_count` is replies + reposts in the last 90 days on the follow lists, and this list's own action count on the other two. `icp_score` and `icp_rationale` are always null here (scoring belongs to signal-agent leads).
- Costs no enrichment units, and reads like any other GET.

### Mentions (who is talking to you right now)

```bash
superx engage:mentions                               # newest mentions, with the post each replies to
superx engage:mentions --sort top                    # most engaged first
superx engage:mentions --include-replied true        # keep ones you already answered, flagged replied
superx engage:mentions --cursor "<next_cursor>"      # the next page
```

- Reads X **live**, so it is the up-to-the-minute view of what people are saying to the user, unlike `replies:received` which reads what SuperX has stored.
- One call costs **3 of the daily feed fetches** (the same allowance `engage:posts` draws on): read a page and work from it rather than polling.
- `mention_type` is `reply` for a direct reply to one of the user's posts and `mention` for anything else (standalone @-mention, chain, or being tagged in someone else's reply). `parent_post` carries the post being replied to, with one further level of ancestry.
- By default, mentions the user already replied to on X are left out. `--include-replied true` keeps them with `replied: true`.
- The app's Mentions tab also hides posts the user skipped or blocked there. That is an app preference and is NOT applied here, so the API list can be longer than what they see in the app.
- READ-ONLY, like Engage: there is no reply command. Draft suggestions for the user and let them send.

### Datasets (Ask SuperX collections)

```bash
superx datasets:list                                 # collections built in the app, newest first
superx datasets:get <dataset-id>                     # status, counts, coverage sentence
superx datasets:rows <dataset-id> --limit 50         # a page of rows, exactly as collected
superx datasets:export <dataset-id>                  # writes superx-dataset-<title>-<date>.csv here
superx datasets:export <dataset-id> --out -          # stream the CSV to stdout instead
superx datasets:add-to-list <dataset-id> --list-id <list-id>   # copy its people into a list

# Build a new one (write scope)
superx datasets:collect --source repliers --target https://x.com/user/status/123 --wait
superx datasets:collect --source list_members --target https://x.com/i/lists/1234567890
superx datasets:collect --source my_posts --since-days 90 --sort likes
superx datasets:collect --source reposters --target 1234567890 --min-followers 500 --require-can-dm

# Narrow a dataset by what each person wrote (creates a NEW dataset)
superx datasets:refine <dataset-id> --criterion "supportive or neutral, not hostile" --sort followers --wait
```

- Datasets are audience collections: the repliers, quoters or reposters of a post, the members of an X list, the user's own posts or replies, or a set of research briefs. `datasets:collect` builds one from here, `datasets:research` builds the briefs kind (see Lead search and outreach below), and the ones Ask SuperX builds in the app show up in the same list.
- `datasets:collect` may not be done when it returns. A big collection, or one whose size cannot be established up front, answers `status: "collecting"` with zero rows and keeps running in the background: pass `--wait` to poll until it is ready, or poll `datasets:get` yourself. NEVER quote a row count from a `collecting` result.
- Each collection costs one of **10 a day** for the account, shared with the collections Ask SuperX runs in the app (429 `collection_quota_exceeded`), plus enrichment for the pages it walks. `--source my_posts` / `my_replies` read the local post library: no enrichment, always synchronous, and the profile filters do not apply to them (the `note` says so).
- Only ONE background collection runs per account at a time: a second one returns 409 `collection_in_progress`. If nothing matched the filters no dataset is created: the answer is `data: null` with a `note`.
- They are kept for **30 days**. After that the id 404s.
- `status` is `collecting`, `ready` or `failed`. Only a `ready` dataset can be paged, exported or added to a list; the others return `409 dataset_not_ready`.
- Export is **CSV only**. XLSX downloads stay in the SuperX app.
- `has_people: false` marks an own-content dataset (the user's posts or replies): there is nobody in it to add to a contact list.
- Dataset ids come from `datasets:list`; the tool that created one also reports its id in the app.
- `datasets:refine` filters a dataset by WHAT EACH PERSON WROTE and writes the kept rows to a NEW dataset; the source is untouched. It only works on datasets whose rows carry text (repliers, quoters) - anything else is a 400. Rows the classifier cannot judge are KEPT and counted as `unclear`, so report those honestly rather than claiming clean curation. It creates a dataset, so it counts against the SAME 10 collections a day, and it costs AI credits. Over 100 rows with text it answers `202 collecting`: pass `--wait` or poll `datasets:get`.

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

### Lead search and outreach (live search, briefs, drafts)

```bash
# Find people on X right now (saves NOTHING: no agent, no stored leads)
superx signals:search \
  --keywords "losing customers to churn, cancellations killing my MRR" \
  --icp "B2B SaaS founders worried about retention" \
  --precision discovery --max 10

# Turn people into outreach briefs saved as a dataset (exactly one source)
superx datasets:research --handles levelsio,naval --focus "audience-growth tooling" --wait
superx datasets:research --list <contact-list-id> --max 20 --wait
superx datasets:research --agent 3 --max 10 --wait
superx datasets:research --dataset <dataset-id> --max 25 --wait

# Draft one message per person onto that dataset (TEXT ONLY - nothing is sent)
superx datasets:outreach-drafts <dataset-id> \
  --format "hey [first]! been following what you're building. <personalization>. would love to trade notes"
superx datasets:rows <dataset-id> --limit 50        # read every drafted message
```

- **Nothing in this chain sends a DM.** `datasets:outreach-drafts` writes message TEXT onto the dataset's `message` column and stops there. A person reviews and sends them from the SuperX app. Never tell the user their messages have gone out, and never imply the CLI can send them.
- `signals:search` needs a key with the **write** scope (every non-GET API route does), even though it CREATES NOTHING. The leads exist only in that response, so save what you need. For an audience that keeps filling up on its own, use `signals:create-agent` instead. It takes up to a minute, and each lead comes from ONE matched post: `posts_count` is lifetime volume, not proof of current activity.
- `datasets:research` needs exactly one of `--handles` (max 25), `--list`, `--agent` or `--dataset`, and `--max` is 1-25 (default 10). Every hook in a brief QUOTES one of the person's real posts; proposed quotes that failed the verbatim check are dropped server-side, so a brief with no hooks is honest, not broken. More than 5 profiles run in the background (`202 collecting`) - pass `--wait` or poll `datasets:get`.
- `datasets:outreach-drafts` needs a `--format` from the USER: their template or an example message. Never invent one. `[name]`, `[first]` and `[handle]` are kept intact for per-recipient fill-in at send time. A brief with no usable hook gets an honest generic message counted in `generic`, and a draft that names a DIFFERENT recipient is discarded and counted in `contaminated` (run it again to retry those rows). Re-running overwrites every draft.
- Costs: `signals:search` is measured, at least 1 credit for a search that reaches X; `datasets:research` is a flat **1 credit per profile actually researched** (the rest are returned); `datasets:outreach-drafts` is measured and usually 1-3 credits. Research settles when the run finishes, so after a `--wait` read `superx status` for the pool rather than the response.
- The two that read X live also carry per-plan day caps (`429 ai_action_limited`) and draw on a platform-wide fair-use ceiling shared by every account. On a 429 read `error.scope`: `"account"` means the user's own daily cap, `"platform"` means the shared ceiling and their own allowance is untouched - wait for `reset_at` and retry rather than telling them they are out.

### Writing helpers (drafts, remix, edits, checks)

```bash
# One reply draft, in the user's voice (nothing is posted)
superx engage:reply-draft --post 1234567890 --thoughts "agree, and we saw the same thing" --tone concise
superx engage:reply-draft --text "hot take about pricing" --handle levelsio --author "Pieter Levels"

# Rewrite a post, near or far from the original
superx posts:remix --text "$(cat post.txt)" --closeness 70
superx posts:remix --text "..." --closeness 20 --instructions "make it a question"

# Change one selected piece, keeping the surrounding style
superx tools:inline-edit --text "the hook line" --full "$(cat post.txt)" --type hook
superx tools:inline-edit --text "..." --instruction "make this one line, lowercase"

# One preset rewrite of a whole post
superx tools:rephrase --type concise --text "$(cat post.txt)"

# Check a claim, and compare two drafts
superx tools:factcheck --text "X has 600M daily active users"
superx tools:predict --a "$(cat v1.txt)" --b "$(cat v2.txt)"
```

- **Every one of these returns TEXT and posts NOTHING.** `engage:reply-draft` writes a reply for a person to review and post; there is still no reply-sending command anywhere in the CLI. Show the draft, let the user edit it, and never say a reply went out.
- `engage:reply-draft` takes exactly one of `--post <id>` (the API reads the post live, so the draft sees the real text, author and any quoted post) or `--text` with optional `--author` and `--handle`. Add `--thoughts` with what the USER wants to say - ask them, never invent an opinion for them - and `--tone engaging|humorous|creative|sarcastic|inspirational|concise`. `--post` also spends one live X lookup on top of the credit.
- `posts:remix` needs `--closeness` 0-100: 0 keeps only the idea, 100 stays very close to the original wording. Use it on a proven post the user wants to say again in their own words, then save the result with `posts:draft` or `scheduled:create`.
- `tools:inline-edit` needs `--instruction`, `--type`, or both, and works best with `--full` so the edit blends into the post around it. `--type` presets: grammar, translate, hook, details, concise, engaging, humorous, creative, sarcastic, inspirational.
- `tools:rephrase` presets: improve, grammar, translate, hook, details, clarity, engaging, humorous, positive, creative, sarcastic, inspirational, concise. The style ones write in the user's voice; grammar, translate, clarity, details and concise stay mechanical.
- `tools:factcheck` reports `result` (true, false or unknown), a one-sentence `comment` and the `sources` it read. It is a model's reading of a couple of search results, NOT a guarantee: show the sources and never present the verdict as settled. `tools:predict` scores are an opinion for comparing two drafts against each other, not a prediction of reach.
- Costs are measured AI credits: typically 1 each, and 2 for a remix or a reply draft. None of them spends a live X request except `engage:reply-draft --post`.

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

# AI cover (60-100s, a flat 25 AI credits, plus the daily/monthly cover caps)
superx articles:cover-styles                      # styles saved in the app, with their ids
superx articles:cover <article-id>
superx articles:cover <article-id> --style-id <style-id>          # render in a saved style
superx articles:cover <article-id> --style "dark, minimal, geometric" --no-attach
```

- Publishing and scheduling spend post quota; the article needs a title and some content first.
- X enforces its own article limits (10 drafts/day, 5 publishes/day) and requires X Premium; those surface as publish failures.
- `articles:cover` generates from the article's TITLE. Attach is the default; `--no-attach` keeps the current cover and you can attach later with `articles:update --cover-url`.
- Steer the look with `--style-id` (one of the styles the user saved in the app, listed by `articles:cover-styles`) or `--style` (a one-off description), never both: passing both is a 400. An unknown style id is a 404 `cover_style_not_found`. Styles are saved and deleted in the app.
- A cover generation costs a FLAT 25 AI credits on the API, whatever the render actually costs, and the response reports `meta.credits_charged`. A generation that fails outright is refunded in full; one that TIMES OUT keeps the charge because the cover may still have landed, so run `articles:get` and look at the cover before retrying.
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
42. **A dataset has to be `ready` before you read its rows, export it or add it to a list.** Poll `datasets:get <id>` until `status` is `ready`; anything else returns 409 `dataset_not_ready`, and a `failed` dataset has to be rebuilt in the SuperX app. Datasets expire after 30 days, after which the id 404s.
43. **`datasets:add-to-list` dedupes by person and skips rows without an X account id** (research rows sometimes have none), so `added + duplicates` can be lower than the dataset's `row_count`. `skipped_without_id` counts only the rows with no usable X account id or handle; repeat rows for the same person (a replier who replied twice) are deduped silently and are not counted anywhere. Re-running the same command is safe: people already in the list come back in `duplicates`.
44. **The `x:*` lookups share a 300/day allowance with Ask SuperX in the app**, on top of the enrichment allowance (1 unit each, 3 for `x:replies`, 2 for `x:post --quotes` or a handle SuperX has never seen). Look up what the user actually asked about; do not sweep an account's network. `429 lookup_quota_exceeded` covers three cases and the body says which: your own allowance is used up (it carries `limit`), the SuperX-wide allowance is used up (no `limit`, not your budget), or the counter could not be verified and the call was refused rather than run unmetered (no `limit`, short `retry_after`). Honour `retry_after` rather than assuming midnight, and report it rather than retrying in a loop. Repeats within 15 minutes come from a server-side cache and do not touch the daily allowance.
45. **`x:replies` is a sample, not every reply**: the best-liked direct replies from up to 3 relevance-ranked pages, not chronological, and it cannot page further. It also does NOT exclude the account owner's own replies, unlike the same view in the app. Use the audience collections (`datasets:list`) when someone needs everyone who replied. And a `post_not_found` on `x:post` can be a transient upstream failure rather than a deleted post, so retry once before saying it is gone.

46. **`audience:list` pages by cursor, not by page number.** Pass `pagination.next_cursor` back as `--cursor`; there is no `--page` and no `total`. Quote `meta.synced_count` for the size of the list, but note it may exceed the rows a full walk returns (edges that were later removed are still counted). Check `meta.status`: anything but `complete` means SuperX is still syncing, and `meta.is_capped: true` on the follow lists means it is the most recent slice, not everyone. `meta.account_id` is the account id you pass to `--account`; the X user id is `meta.x_account_id`. Repliers and reposters only cover a rolling 90 days.
47. **`engage:mentions` costs 3 feed fetches per call and shows more than the app.** It draws on the same daily feed allowance as `engage:posts`, so read one page and work from it rather than polling. It does NOT apply the skipped/blocked filtering the app's Mentions tab does (that lives with the app), and by default it leaves out mentions already replied to on X unless you pass `--include-replied true`.
48. **`datasets:collect` can return before the collection is done.** `status: "collecting"` means zero rows so far and work still running: use `--wait`, or poll `datasets:get` until `ready`, and never state a row count from the create result. A collection whose size cannot be established up front also runs in the background. It costs one of 10 collections a day shared with Ask SuperX in the app, only one runs per account at a time (409 `collection_in_progress`), and an empty result creates no dataset at all (`data: null` plus a `note`) and gives the daily slot back.
49. **Nothing in the outreach chain sends a DM.** `datasets:outreach-drafts` writes message TEXT onto a research dataset and stops there; a person reviews and sends them from the SuperX app. Never say messages were sent and never offer to send them. Ask the user for the `--format`; never invent one. Re-running overwrites every draft, `generic` counts messages written with no personal claims (that brief had no usable hook), and `contaminated` counts drafts discarded for naming a different recipient - run it again to retry those rows.
50. **`signals:search` saves nothing and `datasets:research` charges per profile.** A search creates no agent and no stored leads, so keep what the user needs from that response; use `signals:create-agent` when they want leads to keep arriving. Research is a flat 1 credit per profile ACTUALLY researched (handles that cannot be resolved, and people with no recent posts, come back in `skipped` and are refunded), and over 5 profiles it runs in the background: never state a brief count from a `collecting` result. `datasets:refine` also creates a dataset, so it spends one of the same 10 collections a day.
51. **`ai_action_limited` has two scopes.** Read `error.scope` before telling the user anything: `"account"` is their plan's own daily cap for that action, `"platform"` is a fair-use ceiling on live-data actions shared by every SuperX account. On `"platform"` their own allowance is untouched, so wait for `reset_at` and retry rather than reporting them as out of quota.
52. **The writing helpers draft, they never publish.** `engage:reply-draft`, `posts:remix`, `tools:inline-edit`, `tools:rephrase`, `tools:factcheck` and `tools:predict` all return TEXT and stop there - nothing is posted, scheduled or sent. Show the output, let the user edit it, and use `posts:draft`, `scheduled:create` or `posts:publish` when they say so. A `tools:factcheck` verdict is a model reading two search results: report it with its sources, never as settled fact.

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
superx tools:predict --a "..." --b "..."

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
