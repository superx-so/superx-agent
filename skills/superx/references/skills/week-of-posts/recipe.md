# Week of Posts

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
