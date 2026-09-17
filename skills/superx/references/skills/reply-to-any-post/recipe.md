# Reply to Any Post

Any post's context, what its top replies already said, and one strong reply draft.

```bash
superx x:post <post-url-or-id>
superx x:replies <post-url-or-id> --limit 20
superx engage:reply-draft --post <post-id> --thoughts "<what to convey>" --tone engaging
```

`x:replies` is a sample of the best-liked direct replies, not every reply, and it does not exclude the author's own.

MCP: `lookup_x_post` -> `get_x_post_replies` -> `draft_reply`

Stops at: reply TEXT. **The person posts the reply.** The lookups draw on the shared 300-a-day `x:*` allowance: `x:replies` spends 3 enrichment units and moves that daily counter once per page it fetches, up to 3. A reply draft named by `--post` spends one more lookup, plus typically 2 AI credits (measured).
