# Queue Reshuffle

Move and rewrite scheduled posts by asking, up to 500 in one transaction.

```bash
superx scheduled:list --status scheduled --limit 100
superx scheduled:bulk-retime --moves-json '[{"id":"<post-id>","scheduled_for":"<UTC ISO-8601 with Z>"}]'
superx scheduled:update <post-id> --text "<new wording>"
```

`bulk-retime` only touches QUEUED posts and answers with counts, so compare against `scheduled:list` rather than assuming every id moved. `scheduled:update --text` without `--media` drops the post's images: re-list the current `object_key`s to keep them.

MCP: `get_scheduled_posts` -> `bulk_retime_scheduled_posts` -> `update_scheduled_post`

Stops at: the retimed queue, one confirmation per change. No AI credits.
