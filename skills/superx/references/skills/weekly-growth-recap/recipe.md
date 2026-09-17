# Weekly Growth Recap

Your week in review: follower change, the posts that worked, new leads, one pattern to repeat and one focus for next week.

```bash
SINCE=$(date -u -v-7d +"%Y-%m-%dT00:00:00Z" 2>/dev/null || date -u -d "7 days ago" +"%Y-%m-%dT00:00:00Z")
superx posts:analytics --since "$SINCE" --account <account-id>
superx posts:list --sort likes --since "$SINCE" --limit 10
superx signals:leads --since "$SINCE" --limit 20
superx replies:received --sort recent --limit 20
```

There is no recap command: write the recap yourself from those four responses.

MCP: `get_account_overview` -> `get_post_analytics` -> `get_signal_leads` -> `get_audience_replies`

Stops at: the recap text in chat. Reads only, no AI credits.
