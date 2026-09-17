# Warm Outreach Pipeline

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

`--handles`, `--list`, `--agent` and `--dataset` are alternative sources for the research step: give exactly one. `contacts:list` returns people, not a list id, so its output feeds `--handles` through the `jq` above; `--list` takes a contact-list id from `lists:list` instead, which is the other way into this skill. Both cap at 25 profiles. Build `recipients.json` from the dataset rows as `[{"x_user_id":"...","handle":"...","name":"...","message":"..."}]`, one entry per person, each carrying its own approved message. Ask the person for the `--format`; never invent one.

MCP: `get_top_contacts` -> `research_profiles` -> `draft_outreach_dms` -> `get_dataset_rows` -> `get_dm_limits` -> `queue_dm_campaign` -> `get_dm_campaign`

Stops at: **a queued campaign, not delivered messages.** `dm:campaign` is an ENQUEUE: the SuperX app sends the messages later, within the account's daily and monthly DM limits, so report counts and never say anything was sent. `dm:campaign-status` and `dm:queue` show what actually went out; `dm:cancel` cancels the unsent ones. Research costs 1 AI credit per profile researched, max 100 recipients per campaign, and the person is responsible for these messages under X's automation rules.
