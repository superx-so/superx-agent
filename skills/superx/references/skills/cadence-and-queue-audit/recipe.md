# Cadence & Queue Audit

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
