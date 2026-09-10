# SuperX Playbooks

Twenty-eight goal-shaped recipes, one per SuperX skill. Each is the same job the
in-app skill of that name does, run from the CLI or from the hosted MCP server.
Pick by goal, run the chain in order, hand the result to the person.

Three rules hold in every playbook, no exceptions:

1. **Drafts unless the person says otherwise.** `scheduled:create` without `--at` is a draft and nothing publishes.
2. **Nothing here sends a reply or a DM.** Reply drafts are text a person posts. `dm:campaign` enqueues; the SuperX app sends.
3. **`posts:publish` and `articles:publish` are immediate and irreversible.** Confirm the exact text with the person first, and note that `posts:publish` REQUIRES `--idempotency-key` so a retry cannot post twice.

`--account <account-id>` acts on a linked account (`superx accounts` lists the
ids). It is shown once, in the first playbook, and applies the same way to the
**account-scoped** commands: the posts, scheduled, replies, contacts, lists,
engage, signals, dm, context, queue and articles families, plus the dataset
commands that WRITE for an account (`datasets:collect`, `datasets:refine`,
`datasets:research`, `datasets:outreach-drafts`, `datasets:add-to-list`).

Some commands are **owner-scoped** and the CLI is strict, so passing `--account`
to one is an error, not a no-op. Nothing about them is per-X-account: the live
lookups `x:post`, `x:replies`, `x:user` and `x:user-posts`, the inspiration
searches `inspiration:search` and `inspiration:media`, and the dataset reads
`datasets:list`, `datasets:get`, `datasets:rows` and `datasets:export`. A few
id-addressed subcommands inside the account families are owner-scoped for the
same reason (the id already names the account), among them `articles:publish`,
`scheduled:delete` and `lists:remove-member`. When a chain here does not show
`--account`, that is deliberate; `superx <command> --help` is the check.

Accounts other people shared with you are read-only. Ids in angle brackets are
placeholders you fill from the previous step's JSON.

---

## Recaps and analytics

### Weekly Growth Recap

Your week in review: follower change, the posts that worked, new leads, one pattern to repeat and one focus for next week.

```bash
SINCE=$(date -u -v-7d +"%Y-%m-%dT00:00:00Z" 2>/dev/null || date -u -d "7 days ago" +"%Y-%m-%dT00:00:00Z")
superx posts:analytics --since "$SINCE" --account <account-id>
superx posts:list --sort likes --since "$SINCE" --limit 10
superx signals:leads --since "$SINCE" --limit 20
superx replies:received --sort recent --limit 20
```

There is no recap command: write the recap yourself from those four responses.

MCP: `get_account_overview` -> `get_post_analytics` -> `get_signal_leads` -> `get_audience_replies`

Stops at: the recap text in chat. Reads only, no AI credits.

### Growth Plan Builder

A multi-week plan tied to the account's real numbers: cadence, a reply target, and the format to repeat.

```bash
SINCE=$(date -u -v-90d +"%Y-%m-%dT00:00:00Z" 2>/dev/null || date -u -d "90 days ago" +"%Y-%m-%dT00:00:00Z")
superx posts:analytics --since "$SINCE"
superx posts:list --type posts --sort likes --since "$SINCE" --limit 25
superx replies:list --limit 25
superx queue:get
```

Read PLAYBOOK.md before writing the plan: the numbers say what happened, the strategy guide says what to do about it.

MCP: `get_account_overview` -> `get_post_analytics` -> `get_my_replies` -> `get_queue_settings`

Stops at: the written plan. Reads only, no AI credits. Nothing is scheduled by this playbook.

### Post Post-Mortem

Why one post overperformed or flopped, measured against the account's own baseline.

```bash
SINCE=$(date -u -v-30d +"%Y-%m-%dT00:00:00Z" 2>/dev/null || date -u -d "30 days ago" +"%Y-%m-%dT00:00:00Z")
superx posts:list --sort posted_at --since "$SINCE" --limit 25
superx posts:analytics --since "$SINCE"
superx x:user-posts <peer-handle> --no-reposts --limit 20
```

The third call is optional: use it only when the person names a peer account to compare against.

MCP: `get_post_analytics` -> `get_account_overview` -> `get_x_user_posts`

Stops at: the explanation in chat. Reads only. The live lookup draws on the shared 300-a-day allowance for `x:*`.

### Top Performers Breakdown

The ranked winners, the shape they share, and what to write more of.

```bash
SINCE=$(date -u -v-30d +"%Y-%m-%dT00:00:00Z" 2>/dev/null || date -u -d "30 days ago" +"%Y-%m-%dT00:00:00Z")
superx posts:list --type posts --sort likes --since "$SINCE" --limit 25
superx posts:analytics --since "$SINCE"
```

MCP: `get_post_analytics` -> `get_account_overview`

Stops at: the pattern read in chat. Reads only, no AI credits.

### My Replies Report

Which of the account's replies actually earned attention, and the pattern behind them.

```bash
superx replies:list --limit 25
```

Page-one rows can carry `metrics_pending`: replies sent from the app in the last 4 hours have no numbers yet, so leave them out of the ranking.

MCP: `get_my_replies`

Stops at: the ranked list plus a pattern read. Reads only, no AI credits.

---

## Content

### Daily Post Ideas

Two or three drafts for today, written in the account's voice and ready to schedule.

```bash
SINCE=$(date -u -v-60d +"%Y-%m-%dT00:00:00Z" 2>/dev/null || date -u -d "60 days ago" +"%Y-%m-%dT00:00:00Z")
superx scheduled:list --status draft,scheduled --limit 100
superx posts:list --type posts --sort likes --since "$SINCE" --limit 10
superx posts:draft --brief "<the angle, data or notes to write from>" --count 3
superx scheduled:create --text "<the draft the person picked>" --idempotency-key "ideas-<date>-1"
```

`posts:draft` saves nothing. Show the drafts, let the person pick and edit, then pass the final wording to `scheduled:create`.

MCP: `get_scheduled_posts` -> `get_post_analytics` -> `draft_post` -> `schedule_post`

Stops at: a draft in the SuperX app for the person to review. Costs 3 AI credits per draft written, so ask how many they want.

### Week of Posts

A week of varied drafts, spread across the week, one approval per post.

```bash
SINCE=$(date -u -v-60d +"%Y-%m-%dT00:00:00Z" 2>/dev/null || date -u -d "60 days ago" +"%Y-%m-%dT00:00:00Z")
superx posts:list --type posts --sort likes --since "$SINCE" --limit 10
superx queue:get
superx posts:draft --brief "<theme for the week>" --count 3
superx scheduled:create --text "<approved text>" --at "<UTC ISO-8601 with Z>" --idempotency-key "week-<n>-1"
superx scheduled:list --status scheduled --limit 100
```

Read the queue first so the new times land on the account's real slots instead of on top of what is already there. Reuse the same `--idempotency-key` on a retry.

MCP: `get_post_analytics` -> `get_queue_settings` -> `draft_post` -> `schedule_post` -> `get_scheduled_posts`

Stops at: a queued week the person can still edit. 3 AI credits per draft written.

### Thread Builder

An idea or rough notes turned into a thread of up to 25 parts, ready to schedule.

```bash
superx posts:draft --brief "<the idea or notes, plus the target length>" --count 1
superx scheduled:create --part "<1/ hook>" --part "<2/ detail>" --part "<3/ close>" --idempotency-key "thread-<slug>-1"
```

Max 25 parts and 25,000 characters in total. Repeat `--part` in posting order.

MCP: `draft_post` -> `schedule_post`

Stops at: a thread draft in the app. 3 AI credits per draft written.

### Repurpose a Winner

The account's best post, reworked into fresh angles.

```bash
SINCE=$(date -u -v-90d +"%Y-%m-%dT00:00:00Z" 2>/dev/null || date -u -d "90 days ago" +"%Y-%m-%dT00:00:00Z")
superx posts:list --type posts --sort likes --since "$SINCE" --limit 5
superx posts:remix --text "<the winning post's text>" --closeness 70
superx scheduled:create --text "<the remix the person picked>" --idempotency-key "repurpose-<slug>-1"
```

Standalone posts only. `--closeness 0` keeps just the idea, `100` stays very close to the original wording.

MCP: `get_post_analytics` -> `remix_post` -> `schedule_post`

Stops at: remixed text the person approves before anything is saved. A remix typically costs 2 AI credits (measured).

### Viral Format Remix

Proven hooks and structures from a library of 50M+ high-performing posts, rewritten in the account's voice.

```bash
superx inspiration:search "<topic>" --sort outlier --min-likes 500 --limit 10
superx posts:draft --brief "<what this account would say on that topic>" --mirror "<the reference post's text>" --count 2
superx scheduled:create --text "<approved text>" --idempotency-key "remix-<slug>-1"
```

`--mirror` copies the SHAPE of a proven post, not its words. Pick a reference with room for the account's own facts.

MCP: `find_inspiration` -> `draft_post` -> `schedule_post`

Stops at: reference posts plus drafts, for the person to pick from. 3 AI credits per draft written.

### Trending Now Scan

High-performing posts in the account's niche from the last 48 hours, with angles to take.

```bash
SINCE=$(date -u -v-48H +"%Y-%m-%dT%H:00:00Z" 2>/dev/null || date -u -d "48 hours ago" +"%Y-%m-%dT%H:00:00Z")
superx inspiration:search "<topic phrase>" --since "$SINCE" --sort likes --limit 10
```

Run it once per topic phrase rather than sweeping the whole niche.

MCP: `find_inspiration`

Stops at: the posts and the suggested angles in chat. Reads only, no AI credits.

---

## Queue

### Cadence & Queue Audit

Gaps and pile-ups in the queue, a cadence verdict, and the reschedules to make.

```bash
superx queue:get
superx scheduled:list --status scheduled --limit 100
SINCE=$(date -u -v-30d +"%Y-%m-%dT00:00:00Z" 2>/dev/null || date -u -d "30 days ago" +"%Y-%m-%dT00:00:00Z")
superx posts:list --type posts --sort likes --since "$SINCE" --limit 25
superx scheduled:update <post-id> --at "<UTC ISO-8601 with Z>"
```

`--at` on its own never promotes a draft: add `--status scheduled` for that. The audit never deletes posts.

MCP: `get_queue_settings` -> `get_scheduled_posts` -> `get_post_analytics` -> `update_scheduled_post`

Stops at: the proposed moves, applied one at a time after the person agrees. Reads and one write, no AI credits.

### Queue Reshuffle

Move and rewrite scheduled posts by asking, up to 500 in one transaction.

```bash
superx scheduled:list --status scheduled --limit 100
superx scheduled:bulk-retime --moves-json '[{"id":"<post-id>","scheduled_for":"<UTC ISO-8601 with Z>"}]'
superx scheduled:update <post-id> --text "<new wording>"
```

`bulk-retime` only touches QUEUED posts and answers with counts, so compare against `scheduled:list` rather than assuming every id moved. `scheduled:update --text` without `--media` drops the post's images: re-list the current `object_key`s to keep them.

MCP: `get_scheduled_posts` -> `bulk_retime_scheduled_posts` -> `update_scheduled_post`

Stops at: the retimed queue, one confirmation per change. No AI credits.

---

## Replies (these stop at a draft, by design)

### Reply Sprint

The replies the account's posts got, each with a ready-to-post draft.

```bash
superx replies:received --sort recent --limit 5
superx engage:reply-draft --text "<the reply's text>" --handle "<their handle, no @>" --thoughts "<what to convey>" --tone concise
```

MCP: `get_audience_replies` -> `draft_reply`

Stops at: reply TEXT. **The person posts the reply**: nothing in the CLI, the API or MCP posts a reply to X. Each draft typically costs 2 AI credits (measured).

### Reply to Any Post

Any post's context, what its top replies already said, and one strong reply draft.

```bash
superx x:post <post-url-or-id>
superx x:replies <post-url-or-id> --limit 20
superx engage:reply-draft --post <post-id> --thoughts "<what to convey>" --tone engaging
```

`x:replies` is a sample of the best-liked direct replies, not every reply, and it does not exclude the author's own.

MCP: `lookup_x_post` -> `get_x_post_replies` -> `draft_reply`

Stops at: reply TEXT. **The person posts the reply.** The lookups draw on the shared 300-a-day `x:*` allowance: `x:replies` spends 3 enrichment units and moves that daily counter once per page it fetches, up to 3. A reply draft named by `--post` spends one more lookup, plus typically 2 AI credits (measured).

---

## Leads

### Who Is This Person?

A fast read on a public account, plus the history the SuperX account already has with them.

```bash
superx x:user <handle>
superx x:user-posts <handle> --no-reposts --limit 20
superx contacts:get <x-user-id>
superx contacts:replies <x-user-id> --sort recent --limit 5
```

`contacts:get` covers known contacts only: engagers, contact-list members and scored leads. A 404 there means the person is not one of them yet, not that the lookup failed.

MCP: `lookup_x_user` -> `get_x_user_posts` -> `get_contact` -> `get_contact_history`

Stops at: the profile read in chat. Reads only, on the shared 300-a-day `x:*` allowance.

### Your Warmest Leads

The people already engaging most, ranked, with who to follow up with first.

```bash
superx contacts:list --sort engagement --limit 50
superx contacts:replies <contact-id> --sort recent --limit 5
```

Covers a rolling 90 days.

MCP: `get_top_contacts` -> `get_contact_history`

Stops at: the ranked list plus a suggested order. Reads only, no AI credits.

### Instant Lead Hunt

A live search of X right now for people matching the audience described, scored, saving nothing.

```bash
superx signals:suggest-keywords --icp "<who you want to reach>"
superx signals:search --keywords "<phrase>,<phrase>" --icp "<who you want to reach>" --max 30
```

The search creates no agent and stores no leads, so keep what the person needs from that one response.

MCP: `suggest_keywords` -> `search_leads`

Stops at: up to 30 scored leads in chat. Costs at least 1 AI credit plus one of the plan's daily lead searches, and draws on a fair-use ceiling shared by every SuperX account. Takes up to a minute.

### Standing Lead Agent

An agent that keeps finding leads while the person is away.

```bash
superx signals:expand-icp --text "<who you want to reach>"
superx signals:suggest-keywords --icp "<the sharpened description>"
superx signals:create-agent --name "<agent name>" --icp "<the sharpened description>" --keyword "<phrase>" --idempotency-key "agent-<slug>-1"
superx signals:agents
superx signals:leads --agent <agent-id> --deposited false --limit 25
```

Agent creation returns the agent, not leads: they arrive over the following minutes and days. Read `warnings` before telling the person what the agent watches, and omit `--list-id` only if you are happy with an auto-created `Leads: ...` contact list.

MCP: `expand_icp` -> `suggest_keywords` -> `create_signal_agent` -> `list_signal_agents` -> `get_signal_leads`

Stops at: the agent proposal, created only after the person approves it. The helpers are free; the agent itself costs nothing to set up. Editing or pausing later happens in Signals or with `signals:update-agent`.

### Lead Review

The leads the agents found, prioritized, with the top few activity-checked.

```bash
superx signals:agents
superx signals:leads --agent <agent-id> --deposited false --limit 25
superx x:user-posts <lead-handle> --no-reposts --limit 10
superx signals:feedback <lead-id> --fit
```

The feedback id is the numeric LEAD id, not an X user id, and it trains the scorer: ask the person for the verdict rather than inferring one.

MCP: `list_signal_agents` -> `get_signal_leads` -> `get_x_user_posts` -> `set_lead_feedback`

Stops at: the prioritized list plus recorded verdicts. Reads plus one small write; the activity check spends the shared 300-a-day `x:*` allowance.

---

## Audiences, research and DMs

### Profile Research Briefs

Structured briefs on a list of people, exportable as CSV.

```bash
superx datasets:research --handles "<handle>,<handle>" --max 25 --focus "<what to look for>" --title "<briefs title>" --wait
superx datasets:rows <dataset-id> --limit 25
superx datasets:export <dataset-id> --out briefs.csv
```

Over 5 profiles the run goes to the background, so never quote a brief count from a `collecting` result: pass `--wait` or poll `datasets:get`.

MCP: `research_profiles` -> `get_dataset` -> `get_dataset_rows`

Stops at: the briefs in chat plus a CSV on disk. Costs 1 AI credit per profile ACTUALLY researched (unresolved handles are refunded), max 25 a run, plus one of the plan's daily research runs. CSV export is CLI only; XLSX stays in the SuperX app.

### DM-Ready Audience Builder

A clean, DM-able audience built from any post or public X list, with a path into a contact list.

```bash
superx datasets:collect --source repliers --target <post-url> --require-can-dm --max-rows 500 --title "<audience title>" --wait
superx datasets:get <dataset-id>
superx lists:create --name "<list name>"
superx datasets:add-to-list <dataset-id> --list-id <list-id>
```

`--source` also takes `quoters`, `reposters` and `list_members` (with a public X list URL as `--target`). Adding to a list dedupes by person and skips rows with no usable X account id, so `added + duplicates` can be lower than the row count.

MCP: `collect_audience` -> `get_dataset` -> `create_contact_list` -> `add_dataset_to_contact_list`

Stops at: a filtered dataset and, if the person wants it, a contact list. Costs one of 10 collections a day shared with the SuperX app. No AI credits.

### Sentiment Slice

Keep only the people who said the thing you are looking for.

```bash
superx datasets:list
superx datasets:refine <dataset-id> --criterion "<what a matching row says>" --sort followers --limit 100 --wait
superx datasets:rows <new-dataset-id> --limit 50
```

The source dataset is untouched. Only datasets whose rows carry text (repliers, quoters) can be refined. Rows the classifier cannot judge are KEPT and counted as unclear, so report the unclear count honestly.

MCP: `list_datasets` -> `refine_dataset` -> `get_dataset_rows`

Stops at: the new dataset with its matched and unclear counts. A refinement creates a dataset, so it spends one of the same 10 collections a day, plus a small AI cost. Ask before running it.

### Audience Export

Everyone who engaged a post, as a spreadsheet, no filters.

```bash
superx datasets:collect --source repliers --target <post-url> --max-rows 1000 --title "<export title>" --wait
superx datasets:get <dataset-id>
superx datasets:export <dataset-id> --out audience.csv
```

MCP: `collect_audience` -> `get_dataset`

Stops at: a CSV file on disk, up to 1000 rows. **CSV only**: there is no export tool on MCP and XLSX stays in the SuperX app, so send the person there when they need the spreadsheet format. Costs one of 10 collections a day. No AI credits.

### My Content Export

The account's own posts or replies, as a spreadsheet.

```bash
superx datasets:collect --source my_posts --since-days 90 --sort likes --max-rows 200 --wait
superx datasets:get <dataset-id>
superx datasets:export <dataset-id> --out my-content.csv
```

`--source my_replies` does the same for replies. Small exports finish instantly.

MCP: `collect_audience` -> `get_dataset`

Stops at: a CSV file on disk. **CSV only**, same as Audience Export: XLSX is app-only. Costs one of 10 collections a day. No AI credits.

### Warm Outreach Pipeline

Research a list, get one personalized message per person, and queue them only after the person approves every message.

```bash
HANDLES=$(superx contacts:list --sort engagement --limit 25 | jq -r '[.data[].username] | join(",")')
superx datasets:research --handles "$HANDLES" --max 25 --focus "<what to look for>" --wait
superx datasets:outreach-drafts <dataset-id> --format "<the template or an example message>"
superx datasets:rows <dataset-id> --limit 25
superx dm:limits
superx dm:campaign --recipients recipients.json --idempotency-key "outreach-<slug>-1"
superx dm:campaign-status <campaign-id>
```

`--handles`, `--list`, `--agent` and `--dataset` are alternative sources for the research step: give exactly one. `contacts:list` returns people, not a list id, so its output feeds `--handles` through the `jq` above; `--list` takes a contact-list id from `lists:list` instead, which is the other way into this playbook. Both cap at 25 profiles. Build `recipients.json` from the dataset rows as `[{"x_user_id":"...","handle":"...","name":"...","message":"..."}]`, one entry per person, each carrying its own approved message. Ask the person for the `--format`; never invent one.

MCP: `get_top_contacts` -> `research_profiles` -> `draft_outreach_dms` -> `get_dataset_rows` -> `get_dm_limits` -> `queue_dm_campaign` -> `get_dm_campaign`

Stops at: **a queued campaign, not delivered messages.** `dm:campaign` is an ENQUEUE: the SuperX app sends the messages later, within the account's daily and monthly DM limits, so report counts and never say anything was sent. `dm:campaign-status` and `dm:queue` show what actually went out; `dm:cancel` cancels the unsent ones. Research costs 1 AI credit per profile researched, max 100 recipients per campaign, and the person is responsible for these messages under X's automation rules.

### Reply-to-DM Campaign

DM the people who replied to one of the account's posts.

```bash
superx datasets:collect --source repliers --target <post-url> --keywords "<optional filter>" --require-can-dm --max-rows 100 --wait
superx datasets:refine <dataset-id> --criterion "<who to keep>" --wait
superx datasets:rows <new-dataset-id> --limit 100
superx dm:limits
superx dm:campaign --recipients recipients.json --message "Hey [name], ..." --idempotency-key "campaign-<slug>-1"
superx dm:campaign-status <campaign-id>
```

Build `recipients.json` from `datasets:rows` in the same shape as Warm Outreach Pipeline, `[{"x_user_id":"...","handle":"...","name":"...","message":"..."}]`, except that here `--message` carries the shared wording and only `x_user_id` is required per row; a row's own `message` overrides the shared one. `[name]`, `[first]` and `[handle]` are filled per recipient. People messaged in the last 24 hours are skipped and counted in `duplicates`, and the account never messages itself.

MCP: `collect_audience` -> `refine_dataset` -> `get_dataset_rows` -> `get_dm_limits` -> `queue_dm_campaign` -> `get_dm_campaign`

Stops at: **a queued campaign, not delivered messages.** The enqueue rule is the same one as Warm Outreach Pipeline: the SuperX app sends, nothing here does, and the response is counts. Max 100 per campaign, 10 dataset ops a day, no AI credits on the DM side. Confirm the recipient list and the exact wording with the person first.

---

## Settings

### Teach SuperX Your Rules

Standing rules the AI follows on every drafting surface.

```bash
superx context:get
superx context:set --rules "<the rule, in plain words>"
superx context:get
```

Saving REPLACES the whole rule set, capped at 500 characters, so read the current rules first and send them back plus the new one. These settings steer all future AI output on the account: confirm the final wording before saving.

MCP: `get_context` -> `update_context`

Stops at: the updated rule set, read back so the person can see exactly what is stored. Free, no AI credits.

---

Command reference and gotchas: [SKILL.md](./SKILL.md). Strategy: [PLAYBOOK.md](./PLAYBOOK.md).
