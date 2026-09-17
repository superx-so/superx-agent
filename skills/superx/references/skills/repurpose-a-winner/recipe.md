# Repurpose a Winner

The account's best post, reworked into fresh angles.

```bash
SINCE=$(date -u -v-90d +"%Y-%m-%dT00:00:00Z" 2>/dev/null || date -u -d "90 days ago" +"%Y-%m-%dT00:00:00Z")
superx posts:list --type posts --sort likes --since "$SINCE" --limit 5
superx posts:remix --text "<the winning post's text>" --closeness 70
superx scheduled:create --text "<the remix the person picked>" --idempotency-key "repurpose-<slug>-1"
```

Standalone posts only. `--closeness 0` keeps just the idea, `100` stays very close to the original wording.

MCP: `get_post_analytics` -> `remix_post` -> `schedule_post`

Stops at: remixed text the person approves before anything is saved. A remix typically costs 2 AI credits (measured).
