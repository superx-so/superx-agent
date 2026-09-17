# Top Performers Breakdown

The ranked winners, the shape they share, and what to write more of.

```bash
SINCE=$(date -u -v-30d +"%Y-%m-%dT00:00:00Z" 2>/dev/null || date -u -d "30 days ago" +"%Y-%m-%dT00:00:00Z")
superx posts:list --type posts --sort likes --since "$SINCE" --limit 25
superx posts:analytics --since "$SINCE"
```

MCP: `get_post_analytics` -> `get_account_overview`

Stops at: the pattern read in chat. Reads only, no AI credits.
