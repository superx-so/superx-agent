# SuperX CLI command reference

Every `superx` command family with its flags and the caveats that matter, moved
here verbatim from the skill's command list. Open the section you need rather
than reading the file top to bottom. Hard rules, output contract and gotchas
stay in [SKILL.md](../SKILL.md).

## Contents

- [Authentication](#authentication)
- [Identity and accounts](#identity-and-accounts)
- [Posts and analytics](#posts-and-analytics)
- [Inspiration (viral post library)](#inspiration-viral-post-library)
- [Live X lookups](#live-x-lookups)
- [Inspiration media (cross-platform)](#inspiration-media-cross-platform)
- [Contacts (who engages with you)](#contacts-who-engages-with-you)
- [Contact lists](#contact-lists)
- [Audience (followers, following, repliers, reposters)](#audience-followers-following-repliers-reposters)
- [Mentions (who is talking to you right now)](#mentions-who-is-talking-to-you-right-now)
- [Datasets (Ask SuperX collections)](#datasets-ask-superx-collections)
- [Engage (feed posts to reply to)](#engage-feed-posts-to-reply-to)
- [Signals (automated lead finding)](#signals-automated-lead-finding)
- [Lead search and outreach (live search, briefs, drafts)](#lead-search-and-outreach-live-search-briefs-drafts)
- [Writing helpers (drafts, remix, edits, checks)](#writing-helpers-drafts-remix-edits-checks)
- [Workers (posts written for you on a schedule)](#workers-posts-written-for-you-on-a-schedule)
- [Scheduling](#scheduling)
- [Publishing now (irreversible)](#publishing-now-irreversible)
- [Bulk queue operations](#bulk-queue-operations)
- [Editing drafts and scheduled posts](#editing-drafts-and-scheduled-posts)
- [Advanced settings (auto retweet, auto delete, auto plug, auto DM, super followers)](#advanced-settings-auto-retweet-auto-delete-auto-plug-auto-dm-super-followers)
- [DM campaigns (queue only; the app sends)](#dm-campaigns-queue-only-the-app-sends)
- [Tags](#tags)
- [Context settings (AI writing background)](#context-settings-ai-writing-background)
- [Queue settings (posting schedule)](#queue-settings-posting-schedule)
- [Articles (long-form X posts)](#articles-long-form-x-posts)
- [Docs](#docs)

---

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
- `replies:received` shows who replied, what they said, likes, and the post they replied to. Flags: `--sort recent|most_liked`, `--since/--until`, `--limit` (max 100), `--page`. Use it to find replies worth answering (see `growth-strategy.md` on closing engagement loops).

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
  --offer "ChurnRadar, retention analytics that flags accounts about to cancel" \
  --keywords "cancelled today, mrr dropped, renewal call, churn rate" \
  --icp "B2B SaaS founders worried about retention" \
  --precision discovery --max 10 --max-age-days 7

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
- `signals:suggest-keywords --icp "..."` and `signals:expand-icp (--text | --url)` stage what a new agent needs before you create one: keyword ideas, and the rubric the scorer reads the ICP as. Both are FREE and create nothing. Pass a suggestion to `signals:create-agent --keyword`; the rubric has nowhere to be saved (agents are created with `--icp`), so use it to sharpen that text. `--url` reads a website and also returns an `icp_description` to pass straight to `--icp`; it costs one of the account's 20 page reads a day, shared with the app, and takes up to a minute.
- `signals:search --offer` is the single biggest lever on result quality: one sentence on what is being sold. `--keywords` are seed ANGLES for the plan, not the query, so write 2-5 short phrases of how the BUYER talks (workflows, tools they already pay for, jargon, a symptom), never the product's own name. The search plans up to 10 queries from those and runs them all: `data.queries_used` says how many angles it covered, `data.query_plan` lists each query with its angle and what it found, and `data.partial` is true when a time budget cut it short.
- `signals:search` needs a key with the **write** scope (every non-GET API route does), even though it CREATES NOTHING. The leads exist only in that response, so save what you need. For an audience that keeps filling up on its own, use `signals:create-agent` instead. It takes up to a minute, and each lead comes from ONE matched post: `posts_count` is lifetime volume, not proof of current activity. That post is always recent: `--max-age-days` sets the window (1-90, default 30), older matches are skipped and counted in `freshness.stale_skipped`, and each lead's `provenance.posted_at` / `provenance.post_age_days` says when it was written. Use `--max-age-days 7` for a pain point worth catching while it is fresh; leads come back freshest first within each score, so keep that order. An empty result with a `stale_skipped` above 0 means people DO post about this, just not lately: broaden the keywords, or raise the window only if the user wants people active over a longer stretch.
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

# Check a claim
superx tools:factcheck --text "X has 600M daily active users"

# Score a draft against this account's own normal post, then improve it
superx posts:viral-score --text "$(cat draft.txt)"
superx posts:viral-score --text "$(cat draft-v2.txt)" --image
```

- **Every one of these returns TEXT and posts NOTHING.** `engage:reply-draft` writes a reply for a person to review and post; there is still no reply-sending command anywhere in the CLI. Show the draft, let the user edit it, and never say a reply went out.
- `engage:reply-draft` takes exactly one of `--post <id>` (the API reads the post live, so the draft sees the real text, author and any quoted post) or `--text` with optional `--author` and `--handle`. Add `--thoughts` with what the USER wants to say - ask them, never invent an opinion for them - and `--tone engaging|humorous|creative|sarcastic|inspirational|concise`. `--post` also spends one live X lookup on top of the credit.
- `posts:remix` needs `--closeness` 0-100: 0 keeps only the idea, 100 stays very close to the original wording. Use it on a proven post the user wants to say again in their own words, then save the result with `posts:draft` or `scheduled:create`.
- `tools:inline-edit` needs `--instruction`, `--type`, or both, and works best with `--full` so the edit blends into the post around it. `--type` presets: grammar, translate, hook, details, concise, engaging, humorous, creative, sarcastic, inspirational.
- `tools:rephrase` presets: improve, grammar, translate, hook, details, clarity, engaging, humorous, positive, creative, sarcastic, inspirational, concise. The style ones write in the user's voice; grammar, translate, clarity, details and concise stay mechanical.
- `tools:factcheck` reports `result` (true, false or unknown), a one-sentence `comment` and the `sources` it read. It is a model's reading of a couple of search results, NOT a guarantee: show the sources and never present the verdict as settled.
- `posts:viral-score` scores ONE draft from 0 to 100 against the account's OWN recent posts, with `helped` / `hurt` in plain English and an expected multiple per counter (`reposts_and_quotes` and `views` come back `confidence: "low"`, so say so). It is not a reach prediction and it knows nothing about follower count. Rewrite what `hurt` names, score again, and stop when the score stops rising: three or four rounds is the useful range. NEVER chase the score with reply bait - anything in `warnings` (asking for replies, inviting people to connect, a borrowed template, sending readers off the platform) can only push a score DOWN, so a warning means change the post, not work around it. The baseline is the account's originals from the past 90 days, minus the last 3 days whose numbers are still settling; `baseline.kind: "population"` means fewer than 10 of those were usable and the draft was scored against the average training post instead.
- Costs are measured AI credits: typically 1 each, and 2 for a remix or a reply draft. None of them spends a live X request except `engage:reply-draft --post`.

### Workers (posts written for you on a schedule)

```bash
superx workers:list                                  # your Workers, schedules, next run times
superx workers:suggestions --limit 10                # newest posts waiting for review
superx workers:suggestions --worker 3 --status all   # everything one Worker has written
superx workers:suggestions --status scheduled        # the ones already queued

# Act on one (suggestion id from workers:suggestions; write scope)
superx workers:draft 4821                            # save it to Drafts
superx workers:schedule 4821 --at "2026-09-15T14:00:00Z"
superx workers:dismiss 4821                          # clear it out of To review
```

- A Worker is an agent inside SuperX that writes posts for one account on a schedule. Workers are CREATED, EDITED AND RUN IN THE APP: there is no create or run command here, and no API endpoint for either. This chain reads what they wrote and acts on it.
- `workers:suggestions` defaults to `--status to_review`, the ones waiting on a person. The other values are `drafted`, `scheduled`, `dismissed` and `all`. `--worker <id>` narrows to one Worker, `--limit` (max 100, default 20) and `--page` walk the list, newest first.
- Each suggestion carries `id`, `worker_id`, `text`, `status`, `generated_at`, the `drafted_at`/`scheduled_at`/`dismissed_at` stamps, `post_id` once it has been saved, and `reference` (the kind of source the Worker wrote from). The Worker's own collection ids stay private.
- AI OUTPUT NEEDS A HUMAN: show the user the text and let them edit it before it is saved or queued. `workers:draft` saves it as written, `workers:schedule` queues it as written, and neither asks for confirmation. To change the wording first, rewrite it with `posts:remix` or `tools:rephrase` and save your version with `scheduled:create` instead, then `workers:dismiss` the original so the list stays clean.
- `workers:schedule` requires `--at` in UTC ISO-8601. The post does NOT inherit the account's Default Post Settings: it carries only what the call passes, which from the CLI is nothing beyond the time, so no auto retweet, auto plug, auto delete or auto DM. Add those afterwards with `scheduled:update`, which is also how you retime it; `scheduled:delete` cancels it.
- One suggestion can only be saved once. A second `workers:draft` or `workers:schedule` on the same id is a 400, as is acting on a dismissed one. An id belonging to another account's Worker is a 404.
- `workers:draft` and `workers:schedule` land the post in the same Drafts and Queue the rest of the CLI reads: `scheduled:list --status draft` shows a drafted suggestion, newest first, and the response gives you its `post_id` directly.
- Endpoints behind these commands: `GET /v1/workers`, `GET /v1/workers/suggestions`, `POST /v1/workers/suggestions/{id}/draft`, `POST /v1/workers/suggestions/{id}/schedule`, `POST /v1/workers/suggestions/{id}/dismiss`. The three POSTs need a key with the **write** scope. Every command here takes `--account` for an account you own (main or linked); an account someone shared with you is read-only, so a write against it returns 403 `writes_main_account_only`.

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

### Advanced settings (auto retweet, auto delete, auto plug, auto DM, super followers)

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

# Auto DM the people who engage with the post once it is live
superx scheduled:create --text "Post" --at "2026-08-01T15:00:00Z" \
  --auto-dm-message "Hey [first], here is the template I mentioned" \
  --auto-dm-triggers reply,repost --auto-dm-max 50

# Edit or remove on an existing post (no inheritance on update)
superx scheduled:update <post-id> --auto-retweet 2
superx scheduled:update <post-id> --no-auto-delete
superx scheduled:update <post-id> --no-auto-dm            # also gives back the month's slot
```

- On `scheduled:create`, flags you OMIT inherit the user's Default Post Settings from the SuperX app; that is the expected behavior, not a bug. Exactly five settings inherit (auto retweet, auto delete, auto plug, auto DM, Super Followers only); other composer defaults like Bluesky cross-posting never apply to API posts. Use the `--no-*` forms to turn a default off for one post.
- On `scheduled:update` there is no inheritance: passed flags override, omitted flags keep the post's current settings, `--no-*` removes them.
- Hours are 1-12. `--auto-plug` needs `--auto-plug-threshold` (likes); template ids come from `plug-templates:list`, unknown ids fail with `unknown_plug_template`. `--super-followers` / `--no-super-followers` toggle Super Followers only.
- Auto DM: `--auto-dm-message` (1-1000, `[name]` / `[first]` / `[handle]` are filled per recipient) arms it, with optional `--auto-dm-triggers reply,repost` (default reply only), `--auto-dm-max` 1-100 and `--auto-dm-batch`. `--no-auto-dm` turns it off for the post. Omitted, it follows the user's app defaults. The plan caps how many posts a month may carry one (`dm:limits` -> `posts_with_auto_dm`): when that cap strips it the post is still created and the response carries `"auto_dm_skipped": true`, so relay that instead of ignoring it. Reading a post back never shows the DM text, only that one is attached.
- `scheduled:list` shows the applied settings per post (`auto_retweet`, `auto_delete`, `auto_plug`, `auto_dm`, `super_followers_only`), so you can verify what a post will actually do.

### DM campaigns (queue only; the app sends)

```bash
superx dm:limits                                  # allowances before you queue anything
superx dm:campaign --recipients people.json --message "Hey [first], loved your thread"
superx dm:campaign --recipients=- --message "..." --spread    # recipients from stdin
superx dm:campaign-status <campaign-id>           # counts per status + the messages
superx dm:queue --status pending                  # everything still waiting to go out
superx dm:cancel <campaign-id>                    # remove the unsent ones
```

- **Nothing is sent by these commands.** `dm:campaign` puts messages into the account's own DM queue and the SuperX app's scheduler sends them within the account's daily and monthly limits. The reply is COUNTS (`queued`, `queued_now`, `scheduled`, `skipped`, `duplicates`), never deliveries, so never tell the user their messages went out: point them at `dm:campaign-status`.
- The user is responsible for these messages under X's automation rules. Confirm the recipient list and the exact text with them before queueing, and do not queue a campaign they did not ask for.
- `--recipients` takes a JSON file (or `--recipients=-` for stdin; the `=` is required) of `[{ "x_user_id", "handle"?, "name"?, "message"?, "source_post_id"? }]`, up to 100 people. Ids come from `signals:leads`, `datasets:rows` or `lists:members`. A recipient's own `message` overrides the shared one. `[name]`, `[first]` and `[handle]` are filled per person.
- People this account messaged in the last 24 hours are skipped and counted in `duplicates`, and the account never messages itself. `--spread` places whatever today's daily allowance cannot hold over the coming days instead of skipping it.
- `dm:cancel` deletes the campaign's UNSENT rows, queued-for-now and scheduled-for-later alike, and gives the monthly commitment back. Sent messages cannot be recalled and one already going out cannot be stopped.
- Costs no AI credits. Refusals come back as `dm_limit_reached` with `scope` `month` or `day`, `dm_not_in_plan` when the plan has no DM allowance, and `reauth_required` when the X account needs reconnecting in the app.

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

# Free helpers (no AI credits)
superx context:regenerate-style-guide                # rebuild the generated guide; once an hour
superx context:scrape-product <product-id>           # re-read that product's page and refresh it
```

- What each setting affects: `--profile-description` grounds the AI's voice and personalizes the daily content mix and search; `--rules` are mandatory instructions on EVERY AI surface; `--reply-rules` and `--reply-author-name` steer generated replies; `--favorite-creators` (X usernames, max 3) inspire the writing style; `--interests` are the highest-priority topics for content suggestions; `--style-audience`/`--style-vocabulary` outrank the app's generated style guide until cleared.
- `context:get` also returns the read-only generated style guide (`style_guide.generated`) so you can see what a cleared override falls back to.
- `context:regenerate-style-guide` rewrites that generated guide from the account's recent posts. Free, once an hour per account (429 `ai_action_limited`, `scope: "account"`, `reset_at` an hour after the last run), and it takes up to a minute. It does NOT touch `--style-audience` / `--style-vocabulary`, which keep outranking it, so a user who set overrides sees no change in output until they clear them. An account with fewer than 5 recent posts stored has them read live: that leg allows 3 attempts a day and also draws on the shared platform ceiling (both 429 `ai_action_limited`, `scope` `account` and `platform` respectively), and still too few posts returns 400 `not_enough_posts`. Shared accounts refuse it.
- `context:scrape-product <id>` re-reads a product's page and refreshes its stored name, description and details. The url comes from the SAVED product, so fix a moved url with `context:products:set --id` first. Free, on the account's 20 page reads a day shared with the app; a page that cannot be read returns 422 `scrape_failed`.
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
