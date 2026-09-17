# Teach SuperX Your Rules

Standing rules the AI follows on every drafting surface.

```bash
superx context:get
superx context:set --rules "<the rule, in plain words>"
superx context:get
```

Saving REPLACES the whole rule set, capped at 500 characters, so read the current rules first and send them back plus the new one. These settings steer all future AI output on the account: confirm the final wording before saving.

MCP: `get_context` -> `update_context`

Stops at: the updated rule set, read back so the person can see exactly what is stored. Free, no AI credits.
