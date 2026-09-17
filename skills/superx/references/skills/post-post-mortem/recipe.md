# Post Post-Mortem

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
