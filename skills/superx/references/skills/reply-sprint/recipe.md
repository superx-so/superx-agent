# Reply Sprint

The replies the account's posts got, each with a ready-to-post draft.

```bash
superx replies:received --sort recent --limit 5
superx engage:reply-draft --text "<the reply's text>" --handle "<their handle, no @>" --thoughts "<what to convey>" --tone concise
```

MCP: `get_audience_replies` -> `draft_reply`

Stops at: reply TEXT. **The person posts the reply**: nothing in the CLI, the API or MCP posts a reply to X. Each draft typically costs 2 AI credits (measured).
