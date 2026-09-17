# Your Warmest Leads

The people already engaging most, ranked, with who to follow up with first.

```bash
superx contacts:list --sort engagement --limit 50
superx contacts:replies <contact-id> --sort recent --limit 5
```

Covers a rolling 90 days.

MCP: `get_top_contacts` -> `get_contact_history`

Stops at: the ranked list plus a suggested order. Reads only, no AI credits.
