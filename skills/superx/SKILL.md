---
name: superx
description: SuperX is a Twitter/X growth tool. Use it to read an account's published posts with engagement metrics, pull account analytics (impressions, likes, replies, follower change), find the people who engage with the account most, review reply history in both directions (sent and received), manage contact lists, create and manage signal agents (automated lead finders) and review the leads they discover, search a library of 50M+ high-performing posts for inspiration, create, edit, tag, or schedule draft posts and threads (with image attachments), and write, schedule, publish, and generate AI covers for long-form X Articles through the SuperX API.
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
| **description** | Twitter/X growth CLI: posts, analytics, contacts, contact lists, audience replies, signal agents and their leads, inspiration, tags, scheduling (with images), and long-form Articles via the SuperX API |
| **allowed-tools** | Bash(superx:*) |

---

## Three Hard Rules (Read First)

**Rule 1: Run `superx status` before anything else.** Every other command fails without valid credentials. If the `superx` binary is missing, install it with `npm install -g superx-cli`. If not authenticated, either run `superx login` (interactive) or set `export SUPERX_API_KEY=sxk_...` (CI and non-interactive sessions). Keys are created at https://app.superx.so/account?tab=developers.

**Rule 2: Read PLAYBOOK.md before creating any content.** This repo ships a growth strategy guide (`PLAYBOOK.md`, also inside the installed npm package). It tells you WHAT to post, WHEN, and WHY: the action hierarchy, out-of-network discovery, the engagement loop, and the failure modes that kill reach. The CLI gives you data and actions; the playbook gives you judgment. Do not schedule content without it.

**Rule 3: Know the write constraints.** `scheduled:create` without `--at` creates a DRAFT (nothing publishes). With `--at` it schedules for that time. `scheduled:update` changes only the flags you pass, and a new `--at` alone never schedules a draft; add `--status scheduled` to promote. Writes work on the main account only. Images attach via `media:upload` then `--media` (JPG/PNG/WEBP up to 5MB, GIF up to 15MB; max 4 images or 1 GIF per post); video is not supported. Timestamps MUST be UTC ISO-8601 with an explicit `Z` or offset; naive timestamps are rejected with 400. `articles:publish` posts a long-form article to X IMMEDIATELY and irreversibly; treat it like hitting Publish in public and get human confirmation unless the user already gave it.

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

1. **Check auth**: `superx status` (verifies the key and shows plan + rate-limit state)
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
superx status                 # Verify credentials; shows plan, key scopes, rate limits
superx logout                 # Delete ~/.superx/credentials.json
export SUPERX_API_KEY=sxk_... # Env alternative (credentials file wins when both exist)
```

Credentials are stored in `~/.superx/credentials.json` (file mode 0600). `SUPERX_API_URL` overrides the API base URL with a full base including path (default `https://api.superx.so/v1`).

### Identity and accounts

```bash
superx me         # Key owner, plan tier, key name and scopes
superx accounts   # X accounts this key can read; use ids with --account
```

Reads accept `--account <id>` to select a linked account. Omitting it means the main account.

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
- Results are intentionally varied between runs; re-running the same query returns a different mix.

### Contacts (who engages with you)

```bash
superx contacts:list --sort engagement --limit 20   # Most engaged people
superx contacts:list --sort replies                 # By reply count
superx contacts:replies <contact-id> --sort recent  # One person's reply history to you
```

Sort options: `contacts:list` takes `engagement|replies|reposts`; `contacts:replies` takes `recent|most_liked`.

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
- Member writes are main account only and need a key with the write scope.

### Signals (automated lead finding)

```bash
superx signals:agents                                # agents, what they watch, lead counts
superx signals:leads --limit 20                      # newest leads across all agents
superx signals:leads --agent 3 --deposited false     # one agent's leads not yet in its list
superx signals:leads --since "2026-07-01T00:00:00Z"  # leads discovered since July

# Create an agent (main account only, write scope)
superx signals:create-agent \
  --name "Build in public founders" \
  --icp "Indie founders building SaaS in public, sharing MRR and launches" \
  --keyword "building in public" --keyword "just shipped my MVP"

# Lifecycle (agent id from signals:agents)
superx signals:pause-agent 3
superx signals:resume-agent 3
superx signals:delete-agent 3
```

- Signal agents are automated lead finders: they watch profiles, followers, keywords, or lists and score people against an ideal customer profile. The API creates keyword-watch agents and pauses, resumes, or deletes any agent; name/ICP/precision/destination edits happen in the app.
- `signals:create-agent` requires `--name` (max 80) and `--icp` (max 500). Repeat `--keyword` for 1-5 plain-language watches ("what does the target customer post about"); omit it and 1-3 are auto-suggested from the ICP. Omit `--list-id` and a contact list named `Leads: <agent name>` is created for the leads (`destination_list_created: true` in the response). `--precision high|discovery` defaults to high. Supports `--idempotency-key`.
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

### Tags

```bash
superx tags:list                                 # id, name, color
superx tags:create "Launch week" --color amber   # colors: rose, amber, lime, emerald, teal, cyan, blue, indigo, violet, fuchsia, slate, stone
superx tags:update <tag-id> --name "Launch" --color violet
superx tags:delete <tag-id>                      # also removes it from every post
```

Tag names are unique per workspace (409 `duplicate_name`) and capped at 40 characters. Assign tags with `scheduled:create --tag` or `scheduled:update --tag`.

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
superx articles:cover <article-id>
superx articles:cover <article-id> --style "dark, minimal, geometric" --no-attach
```

- Publishing and scheduling spend post quota; the article needs a title and some content first.
- X enforces its own article limits (10 drafts/day, 5 publishes/day) and requires X Premium; those surface as publish failures.
- `articles:cover` generates from the article's TITLE. Attach is the default; `--no-attach` keeps the current cover and you can attach later with `articles:update --cover-url`.
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

Rate limits per key: 60 reads/min and 10,000 reads/day; 10 writes/min and 300 writes/day. Every authenticated response carries `X-RateLimit-*` headers; `superx status` shows the current window. On 429 the stderr message includes the retry delay.

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
4. **Writes are main-account-only**: passing a linked account to `scheduled:create` returns 403 `writes_main_account_only`. Reads accept any owned account.
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
superx replies:received --sort most_liked --limit 20
superx lists:list
superx lists:members <list-id> --q "founder"
superx signals:agents
superx signals:leads --agent 3 --deposited false

# Contact list writes (main account only)
superx lists:add-member <list-id> --handle levelsio
superx lists:remove-member <list-id> <member-id>

# Signal agent writes (main account only)
superx signals:create-agent --name "..." --icp "..." --keyword "..."   # Lead finder
superx signals:pause-agent <id>
superx signals:resume-agent <id>
superx signals:delete-agent <id>

# Writes (main account only)
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
superx articles:cover <id> --style "minimal"
superx articles:delete <id>

# Docs and help
superx docs                                       # API quickstart (markdown)
superx --help                                     # All commands
superx scheduled:create --help                    # Command help
```

Strategy lives in [PLAYBOOK.md](./PLAYBOOK.md). Read it before creating content (Rule 2).
