## Install as a skill

```bash
npx skills add superx-so/superx-agent
```

# SuperX CLI

**Twitter/X growth CLI for developers and AI agents.** Read your posts and their metrics, pull account analytics, find the people who engage with you most, create draft or scheduled posts and threads (with image attachments), and write, schedule, and publish long-form X Articles (with AI cover generation) through the [SuperX API](https://docs.superx.so).

Two things ship in this repo:

- `superx-cli`, an npm package installing the `superx` binary (a thin client for `api.superx.so/v1`)
- An agent skill (`SKILL.md`) plus a growth strategy guide (`PLAYBOOK.md`) so agents do not just schedule posts, they follow a strategy that works

---

## Installation

```bash
npm install -g superx-cli
```

Requires Node.js 18 or newer.

---

## Authentication

Create an API key in the SuperX app: [app.superx.so/account?tab=api](https://app.superx.so/account?tab=api)

### Option 1: Guided login (local use)

```bash
superx login
```

Prints the key page URL, prompts you to paste the key, validates it against the API, and saves it to `~/.superx/credentials.json` (directory mode 0700, file mode 0600).

```bash
superx login --key "sxk_..."   # non-interactive variant
superx status                  # verify credentials, plan, and rate-limit state
superx logout                  # delete the credentials file
```

### Option 2: Environment variable (CI, agents)

```bash
export SUPERX_API_KEY=sxk_...
```

The credentials file takes priority over the environment variable when both exist.

### Custom API endpoint

```bash
export SUPERX_API_URL=https://api.superx.so/v1   # full base URL including path
```

---

## Output contract

- **stdout is clean JSON** for every command except `superx docs` (markdown). Everything pipes straight into `jq`.
- Human/status messages go to **stderr**.
- Exit code `0` on success, `1` on error. Errors print to stderr as `Error [code] (HTTP status): message` using the API's error codes.

```bash
superx posts:list --sort likes --limit 5 | jq '.data[].text'
```

---

## Commands

### Identity

```bash
superx me         # Key owner, plan tier, key name and scopes
superx accounts   # X accounts this key can read (main account first)
```

Read commands accept `--account <id>` (an id from `superx accounts`) to select a linked account. Omitting it means the main account.

### Posts

```bash
superx posts:list
superx posts:list --type posts --sort likes --limit 10
superx posts:list --since "2026-06-01T00:00:00Z" --until "2026-07-01T00:00:00Z"
```

Options: `--type posts|replies|all`, `--sort posted_at|likes|impressions`, `--since/--until` (UTC ISO-8601), `--limit` (max 100), `--page`. Each post includes `metrics` (likes, replies, reposts, quotes, bookmarks, impressions).

### Analytics

```bash
superx posts:analytics
superx posts:analytics --since "2026-06-01T00:00:00Z" --until "2026-07-01T00:00:00Z"
```

Totals, a daily series, and follower start/end/change. Defaults to the last 30 days; the range is capped at 366 days.

### Replies you have sent

```bash
superx replies:list --limit 20
```

### Replies you have received (audience replies)

```bash
superx replies:received --limit 20
superx replies:received --sort most_liked --since "2026-06-01T00:00:00Z"
```

Every stored reply your audience has sent you across all your posts: the reply text and likes, the replier's profile, and the post they replied to. Options: `--sort recent|most_liked`, `--since/--until` (UTC ISO-8601), `--limit` (max 100), `--page`.

### Inspiration (viral post library)

```bash
superx inspiration:search "build in public" --limit 10
superx inspiration:search "indie hackers" --sort outlier --min-likes 500
superx inspiration:search "AI tools" --min-followers 1000 --max-followers 50000
```

Searches a library of 50M+ real high-performing posts by topic. Options: `--sort relevant|recent|likes|reposts|impressions|outlier`, `--min-likes/--min-reposts/--min-replies/--min-bookmarks/--min-impressions`, `--min-followers/--max-followers` (author size), `--since/--until` (UTC ISO-8601), `--lang` (default en), `--exclude-topics "crypto,politics"`, `--limit` (max 50), `--page` (1-7). Each result carries an `outlier_score`: how far the post outperformed the norm for its author's follower tier. Results are intentionally varied between runs; use them for structures and hooks to remix, never to copy.

### Contacts (who engages with you)

```bash
superx contacts:list --sort engagement --limit 20    # engagement | replies | reposts
superx contacts:replies <contact-id> --sort recent   # recent | most_liked
```

### Contact lists

```bash
superx lists:list                                    # all lists; system lists flagged is_system
superx lists:members <list-id> --q "founder"         # members of a list you created
superx lists:add-member <list-id> --handle levelsio  # or --x-user-id 44196397
superx lists:remove-member <list-id> <member-id>
```

Lists are the saved people-collections from the SuperX app. System lists (Followers, Following, Repliers, Reposters) appear in `lists:list` but are read-only and their members are not available through the API (400 `system_list_not_supported`). Adding someone already in a list is harmless: the API returns the existing member with `"duplicate": true` and writes nothing. Member writes are main account only.

### Signals (automated lead finding)

```bash
superx signals:agents                                # your signal agents and what they watch
superx signals:leads --limit 20                      # newest leads across all agents
superx signals:leads --agent 3 --deposited false     # new leads from one agent
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

Signal agents are automated lead finders: they watch profiles, followers, keywords, or lists and score the people they find against an ideal customer profile. Each lead carries the person's profile, the match score and rationale, a `deposited` flag (whether it has been saved to the agent's contact list yet), and provenance describing how it was discovered. `--agent` takes an id from `signals:agents`; an unknown id returns 404 `agent_not_found`. An agent's `destination_list_id` joins to `lists:list` for the list name.

`signals:create-agent` requires `--name` (max 80) and `--icp` (max 500). Repeat `--keyword` for 1-5 plain-language watches; omit it and 1-3 are auto-suggested from the ICP. Omit `--list-id` and a contact list named `Leads: <agent name>` is created for the leads (`destination_list_created: true` in the response). `--precision high|discovery` defaults to `high`; `--idempotency-key` makes retries safe. Creation returns immediately, but leads arrive over the following minutes and days; there is no synchronous search. Pause, resume, and delete work on any agent; other edits happen in the app. Deleting an agent keeps its saved leads and its contact list. Plan limits surface as 403 `cap_reached`.



```bash
# Draft: no --at, nothing publishes
superx scheduled:create --text "Post text"

# Scheduled post: UTC ISO-8601 with explicit Z or offset, at least 60s ahead
superx scheduled:create --text "Post text" --at "2026-08-01T15:00:00Z"

# Thread: repeat --part in order (1-25 parts, 25,000 chars total)
superx scheduled:create --part "1/ Hook" --part "2/ Detail" --part "3/ Close" --at "2026-08-01T15:00:00Z"

# Safe retries: same key + same body returns the original result
superx scheduled:create --text "Post" --at "2026-08-01T15:00:00Z" --idempotency-key "run-42"

superx scheduled:list --status draft,scheduled       # draft | scheduled | sent | error
superx scheduled:list --from "2026-08-01T00:00:00Z" --to "2026-08-08T00:00:00Z"
superx scheduled:delete <post-id>
```

Images attach in two steps: upload, then reference the `object_key`.

```bash
KEY=$(superx media:upload ./chart.png | jq -r '.object_key')
superx scheduled:create --text "Chart of the week" --media "$KEY" --alt-text "Weekly revenue line chart"
superx scheduled:create --parts-json '[{"text":"1/ Hook","media":[{"object_key":"'"$KEY"'"}]},{"text":"2/ Detail"}]'
```

`media:upload` accepts JPG, PNG, and WEBP up to 5MB and GIF up to 15MB; a post part carries up to 4 images or exactly 1 GIF. `--media` takes a comma list of keys; `--alt-text` (max 1,000 chars) works with a single key, and `--parts-json` covers threads and per-image alt text. Uploads are capped at 100 per day and expire after 24 hours if never attached. Video is not supported yet.

Drafts can carry organizer fields: `--title` (max 300 chars) and `--scratchpad` (max 30,000 chars) are shown in the SuperX app and never posted; `--tag <id>` (repeatable, max 20) attaches tags from `tags:list`.

```bash
superx scheduled:create --text "Post" --title "Launch teaser" --tag <tag-id>
superx scheduled:list --tags <tag-id>,<tag-id>       # posts carrying ANY of these tags
```

Edit an existing draft or scheduled post with `scheduled:update`. Only the flags you pass change; everything else stays as it is.

```bash
superx scheduled:update <post-id> --title "Better hook"
superx scheduled:update <post-id> --text "New text"
superx scheduled:update <post-id> --at "2026-08-01T15:00:00Z" --status scheduled   # promote a draft
superx scheduled:update <post-id> --status draft                                   # back to drafts (quota refunds)
superx scheduled:update <post-id> --tag <id-a> --tag <id-b>                        # replace ALL tags
superx scheduled:update <post-id> --clear-tags --clear-title --clear-scratchpad
```

A new `--at` time alone never schedules a draft; pass `--status scheduled` explicitly. CAUTION: replacement text is a full replace, media included. `--text` without `--media` removes any images the post carried; re-list the current `object_key`s (visible in `scheduled:list`) to keep them. Title, scratchpad, tag, and time edits never touch media.

Write constraints in the current API version: main account only; images via `media:upload` (no video); one of `--text`, `--part`, or `--parts-json`. Idempotent replays add `"replayed": true` to the output. Note that drafts have no scheduled time, so `--from/--to` filters exclude them.

### Tags

```bash
superx tags:list                                 # id, name, color
superx tags:create "Launch week" --color amber   # colors: rose, amber, lime, emerald, teal, cyan, blue, indigo, violet, fuchsia, slate, stone
superx tags:update <tag-id> --name "Launch" --color violet
superx tags:delete <tag-id>                      # also removes it from every post
```

Tag names are unique (409 `duplicate_name` on collision) and capped at 40 characters.

### Articles (long-form X posts)

Article bodies are **markdown in both directions**: headings (h1-h3), bullet and numbered lists (one nesting level), blockquotes, bold/italic/strikethrough, links, images by URL, and bare X post URLs as embeds. Code blocks and horizontal rules are not supported by the X Articles format and degrade to plain text (the response lists any degradations in `warnings`).

```bash
superx articles:create --title "My article" --file draft.md   # body from a markdown file
cat draft.md | superx articles:create --title "My article"    # body from stdin
superx articles:create --title "Outline first"                # empty draft

superx articles:list --status draft,scheduled
superx articles:get <article-id>                              # body comes back as markdown

superx articles:update <article-id> --title "Sharper title"
superx articles:update <article-id> --file v2.md              # replace the whole body
superx articles:update <article-id> --cover-url "https://..." # attach a cover image
superx articles:update <article-id> --clear-cover

superx articles:schedule <article-id> --at "2026-08-01T15:00:00Z"
superx articles:unschedule <article-id>                       # back to draft, quota refunds
superx articles:publish <article-id>                          # live NOW; irreversible
superx articles:delete <article-id>

superx articles:cover <article-id>                            # AI cover, 60-100s, spends AI credits
superx articles:cover <article-id> --style "dark, minimal, geometric" --no-attach
```

Publishing requires X Premium on the connected account and spends post quota; X also enforces its own article limits (10 drafts and 5 publishes per day). Scheduling deducts quota up front and refunds it on `articles:unschedule` or `articles:delete`. `articles:cover` generates from the article's title (a title is required) and attaches the result unless `--no-attach` is passed.

### Docs

```bash
superx docs   # Prints the API quickstart as markdown; works without auth
```

---

## Features for AI agents

- **Skill included**: `npx skills add superx-so/superx-agent` installs [SKILL.md](./SKILL.md), a complete agent reference with hard rules, workflows, and gotchas.
- **Strategy included**: [PLAYBOOK.md](./PLAYBOOK.md) distills the SuperX growth methodology (action hierarchy, out-of-network discovery, the 3-3-3 engagement loop, weekly operating system) into directives an agent can execute with this CLI. The skill instructs agents to read it before creating content.
- **Clean JSON stdout**: no decoration to strip; every data command is `jq`-safe.
- **Idempotent writes**: agents can retry `scheduled:create` safely with `--idempotency-key`.
- **Self-describing**: `superx docs` fetches the current API quickstart at runtime.

### Example agent workflow

```bash
superx status
superx accounts
superx posts:list --sort likes --limit 10          # study what works
superx posts:analytics                             # check the trend
superx contacts:list --sort engagement --limit 10  # who to engage today
# ... read PLAYBOOK.md, draft content ...
superx scheduled:create --text "Draft for review"  # draft first
superx scheduled:list --status draft
```

### MCP

Prefer MCP over a CLI? SuperX also hosts a remote MCP server with the same tools (reads plus post scheduling/editing/deletion and article create/update/schedule/publish/cover tools):

```bash
claude mcp add --transport http superx https://api.superx.so/v1/mcp --header "Authorization: Bearer YOUR_API_KEY"
```

ChatGPT and claude.ai connect with a keyed URL instead. Guide: [docs.superx.so/mcp-server](https://docs.superx.so/mcp-server)

---

## API endpoints

The CLI talks to these SuperX API endpoints (base `https://api.superx.so/v1`):

| Endpoint | Method | CLI command |
|----------|--------|-------------|
| `/me` | GET | `me`, `status`, `login` |
| `/accounts` | GET | `accounts` |
| `/posts` | GET | `posts:list` |
| `/posts/analytics` | GET | `posts:analytics` |
| `/replies` | GET | `replies:list` |
| `/replies/received` | GET | `replies:received` |
| `/inspiration` | GET | `inspiration:search <query>` |
| `/contacts` | GET | `contacts:list` |
| `/contacts/:id/replies` | GET | `contacts:replies <id>` |
| `/contact-lists` | GET | `lists:list` |
| `/contact-lists/:id/members` | GET | `lists:members <id>` |
| `/contact-lists/:id/members` | POST | `lists:add-member <id>` |
| `/contact-lists/:id/members/:memberId` | DELETE | `lists:remove-member <id> <memberId>` |
| `/signals/agents` | GET | `signals:agents` |
| `/signals/agents` | POST | `signals:create-agent` |
| `/signals/agents/:id` | PATCH | `signals:pause-agent <id>` / `signals:resume-agent <id>` |
| `/signals/agents/:id` | DELETE | `signals:delete-agent <id>` |
| `/signals/leads` | GET | `signals:leads` |
| `/media` | POST | `media:upload <file>` |
| `/scheduled-posts` | GET | `scheduled:list` |
| `/scheduled-posts` | POST | `scheduled:create` |
| `/scheduled-posts/:id` | PATCH | `scheduled:update <id>` |
| `/scheduled-posts/:id` | DELETE | `scheduled:delete <id>` |
| `/tags` | GET | `tags:list` |
| `/tags` | POST | `tags:create <name>` |
| `/tags/:id` | PATCH | `tags:update <id>` |
| `/tags/:id` | DELETE | `tags:delete <id>` |
| `/articles` | GET | `articles:list` |
| `/articles` | POST | `articles:create` |
| `/articles/:id` | GET | `articles:get <id>` |
| `/articles/:id` | PATCH | `articles:update <id>` |
| `/articles/:id` | DELETE | `articles:delete <id>` |
| `/articles/:id/publish` | POST | `articles:publish <id>` |
| `/articles/:id/schedule` | POST | `articles:schedule <id>` |
| `/articles/:id/unschedule` | POST | `articles:unschedule <id>` |
| `/articles/:id/cover` | POST | `articles:cover <id>` |
| `/docs` | GET | `docs` (no auth) |

Full API reference: [docs.superx.so](https://docs.superx.so)

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPERX_API_KEY` | No* | - | API key; used when no credentials file exists |
| `SUPERX_API_URL` | No | `https://api.superx.so/v1` | Full API base URL including path |

*Either `superx login` or `SUPERX_API_KEY` is required for everything except `superx docs`.

---

## Error handling

Exit code `0` = success, `1` = error. Error codes come straight from the API:

| Code | Meaning |
|------|---------|
| `invalid_api_key` (401) | Bad or revoked key; run `superx login` again |
| `insufficient_scope` (403) | Read-only key used for a write |
| `writes_main_account_only` (403) | `scheduled:create` with a linked account |
| `subscription_required` (403) | SuperX subscription lapsed |
| `account_not_found` (404) | `--account` id is not one of your accounts |
| `list_not_found` (404) | List id is not one of your contact lists |
| `member_not_found` (404) | Member id is not in that list |
| `agent_not_found` (404) | `--agent` id is not one of your signal agents |
| `user_not_found` (404) | `--handle` did not match an X account |
| `system_list_read_only` (400) | Member add/remove on a system list |
| `system_list_not_supported` (400) | `lists:members` on a system list |
| `invalid_parameter` (400) | Bad flag value; naive timestamps land here |
| `invalid_media` (400) | Unknown `object_key`; upload first with `media:upload` |
| `media_not_uploaded` (400) | Presigned but the bytes were never uploaded |
| `unsupported_media_type` (400) | Not a JPG/PNG/WEBP/GIF (videos land here) |
| `media_too_large` (400) | Over 5MB (images) or 15MB (GIF) |
| `media_quota_exceeded` (429) | Daily media upload limit (100/day) reached |
| `cap_reached` (403) | The plan's signal agent (or per-agent signal) limit is reached |
| `idempotency_key_reuse` (409) | Same `--idempotency-key` with a different body |
| `rate_limited` (429) | Back off; stderr includes the retry delay |

Rate limits per key: 60 reads/min, 10,000 reads/day, 10 writes/min, 300 writes/day. Every authenticated response carries `X-RateLimit-*` headers (visible via `superx status`).

---

## Development

```bash
git clone https://github.com/superx-so/superx-agent
cd superx-agent
npm install
npm run build        # tsup bundles src/ into dist/index.js (CJS, shebang)
node dist/index.js --help
```

```
src/
├── index.ts          # CLI entry point (yargs wiring)
├── api.ts            # SuperXAPI client (global fetch, Bearer auth)
├── config.ts         # Credentials file + env precedence
└── commands/
    ├── auth.ts       # login / logout / status
    ├── accounts.ts   # me / accounts
    ├── posts.ts      # posts:list / posts:analytics / replies:list / replies:received
    ├── inspiration.ts # inspiration:search
    ├── contacts.ts   # contacts:list / contacts:replies
    ├── lists.ts      # lists:list / lists:members / lists:add-member / lists:remove-member
    ├── signals.ts    # signals:agents / signals:leads / signals:create-agent / signals:pause-agent / signals:resume-agent / signals:delete-agent
    ├── media.ts      # media:upload
    ├── scheduled.ts  # scheduled:list / scheduled:create / scheduled:update / scheduled:delete
    ├── tags.ts       # tags:list / tags:create / tags:update / tags:delete
    ├── articles.ts   # articles:list/get/create/update/delete/publish/schedule/unschedule/cover
    └── docs.ts       # docs
```

Maintainer note: `SKILL.md` (repo root) and `skills/superx/SKILL.md` must stay byte-identical. Edit the root file and copy it over the nested one.

---

## Quick reference

```bash
# Auth
superx login                    # Guided key paste
superx login --key "sxk_..."    # Non-interactive
superx status                   # Check auth + rate limits
superx logout                   # Remove credentials
export SUPERX_API_KEY=sxk_...   # Env alternative

# Reads
superx me
superx accounts
superx posts:list --type posts --sort likes --limit 10
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

# Contact list writes (main account)
superx lists:add-member <list-id> --handle levelsio
superx lists:remove-member <list-id> <member-id>

# Signal agent writes (main account)
superx signals:create-agent --name "..." --icp "..." --keyword "..."
superx signals:pause-agent <id>
superx signals:resume-agent <id>
superx signals:delete-agent <id>

# Writes (main account)
superx scheduled:create --text "Post"                                # Draft
superx scheduled:create --text "Post" --at "2026-08-01T15:00:00Z"    # Scheduled
superx scheduled:create --part "1/" --part "2/" --at "..."           # Thread
superx scheduled:create --text "Post" --title "Hook v2" --tag <id>   # Draft with organizer fields
superx media:upload ./chart.png                                      # Image -> object_key
superx scheduled:create --text "Post" --media <object_key>           # Post with an image
superx scheduled:update <id> --title "Better hook"                   # Edit; only passed flags change
superx scheduled:update <id> --at "..." --status scheduled           # Promote a draft
superx scheduled:list --status draft,scheduled
superx scheduled:list --tags <tag-id>
superx scheduled:delete <id>

# Tags
superx tags:list
superx tags:create "Launch week" --color amber
superx tags:update <id> --name "Launch"
superx tags:delete <id>

# Articles (markdown bodies; publish needs X Premium)
superx articles:create --title "My article" --file draft.md
superx articles:list --status draft
superx articles:get <id>
superx articles:update <id> --file v2.md
superx articles:schedule <id> --at "2026-08-01T15:00:00Z"
superx articles:unschedule <id>
superx articles:publish <id>                  # live NOW; irreversible
superx articles:cover <id> --style "minimal"  # AI cover, 60-100s
superx articles:delete <id>

# Docs and help
superx docs
superx --help
superx scheduled:create --help
```

---

## License

MIT

---

## Links

- **Website:** [superx.so](https://superx.so)
- **App:** [app.superx.so](https://app.superx.so)
- **API docs:** [docs.superx.so](https://docs.superx.so)
- **Issues:** [github.com/superx-so/superx-agent/issues](https://github.com/superx-so/superx-agent/issues)
