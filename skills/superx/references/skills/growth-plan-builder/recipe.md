# Growth Plan Builder

A multi-week plan tied to the account's real numbers: cadence, a reply target, and the format to repeat.

```bash
SINCE=$(date -u -v-90d +"%Y-%m-%dT00:00:00Z" 2>/dev/null || date -u -d "90 days ago" +"%Y-%m-%dT00:00:00Z")
superx posts:analytics --since "$SINCE"
superx posts:list --type posts --sort likes --since "$SINCE" --limit 25
superx replies:list --limit 25
superx queue:get
```

Read the growth strategy guide (`references/growth-strategy.md`) before writing the plan: the numbers say what happened, the strategy guide says what to do about it.

MCP: `get_account_overview` -> `get_post_analytics` -> `get_my_replies` -> `get_queue_settings`

Stops at: the written plan. Reads only, no AI credits. Nothing is scheduled by this skill.
