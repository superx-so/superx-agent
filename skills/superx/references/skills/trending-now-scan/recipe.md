# Trending Now Scan

High-performing posts in the account's niche from the last 48 hours, with angles to take.

```bash
SINCE=$(date -u -v-48H +"%Y-%m-%dT%H:00:00Z" 2>/dev/null || date -u -d "48 hours ago" +"%Y-%m-%dT%H:00:00Z")
superx inspiration:search "<topic phrase>" --since "$SINCE" --sort likes --limit 10
```

Run it once per topic phrase rather than sweeping the whole niche.

MCP: `find_inspiration`

Stops at: the posts and the suggested angles in chat. Reads only, no AI credits.
