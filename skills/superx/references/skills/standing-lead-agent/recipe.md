# Standing Lead Agent

An agent that keeps finding leads while the person is away.

```bash
superx signals:expand-icp --text "<who you want to reach>"
superx signals:suggest-keywords --icp "<the sharpened description>"
superx signals:create-agent --name "<agent name>" --icp "<the sharpened description>" --keyword "<phrase>" --idempotency-key "agent-<slug>-1"
superx signals:agents
superx signals:leads --agent <agent-id> --deposited false --limit 25
```

Agent creation returns the agent, not leads: they arrive over the following minutes and days. Read `warnings` before telling the person what the agent watches, and omit `--list-id` only if you are happy with an auto-created `Leads: ...` contact list.

MCP: `expand_icp` -> `suggest_keywords` -> `create_signal_agent` -> `list_signal_agents` -> `get_signal_leads`

Stops at: the agent proposal, created only after the person approves it. The helpers are free; the agent itself costs nothing to set up. Editing or pausing later happens in Signals or with `signals:update-agent`.
