# Reply-to-DM Campaign

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
