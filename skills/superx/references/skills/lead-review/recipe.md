# Lead Review

The leads the agents found, prioritized, with the top few activity-checked.

```bash
superx signals:agents
superx signals:leads --agent <agent-id> --deposited false --limit 25
superx x:user-posts <lead-handle> --no-reposts --limit 10
superx signals:feedback <lead-id> --fit
```

The feedback id is the numeric LEAD id, not an X user id, and it trains the scorer: ask the person for the verdict rather than inferring one.

MCP: `list_signal_agents` -> `get_signal_leads` -> `get_x_user_posts` -> `set_lead_feedback`

Stops at: the prioritized list plus recorded verdicts. Reads plus one small write; the activity check spends the shared 300-a-day `x:*` allowance.
