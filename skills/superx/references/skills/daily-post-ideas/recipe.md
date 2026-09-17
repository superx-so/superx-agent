# Daily Post Ideas

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
