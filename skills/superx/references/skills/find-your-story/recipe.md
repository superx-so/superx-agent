# Find Your Story

The story people follow this account for, laid out as an arc, plus a pinned-post draft and two posts that continue it.

```bash
SINCE=$(date -u -v-90d +"%Y-%m-%dT00:00:00Z" 2>/dev/null || date -u -d "90 days ago" +"%Y-%m-%dT00:00:00Z")
superx x:user <handle>
superx x:post <pinned-post-id>
superx posts:list --type posts --sort likes --since "$SINCE" --limit 20
superx posts:draft --brief "<the arc in the person's own words, plus the two follow-on angles>" --count 3
```

Read the bio and `pinned_tweet_id` from `x:user`, then `x:post` on that id only if there is one. Write the arc as four labelled lines, each one sentence grounded in a real post or the bio: Setup, Stakes, Conflict, and Resolution (or Where it stands, when the story is still open). A line you cannot ground is a question to ask, never a guess. When the account has no posts, only a few, or posts with no personal arc, interview instead: ONE question per reply (what changed or what they left, what they are chasing and by when, what is in the way, what happens if it fails), then build the arc from the answers. `posts:list` empty means nothing is synced yet, so fall back to `x:user-posts <handle> --no-reposts --limit 20`. Never invent events the posts or the answers do not contain.

MCP: `lookup_x_user` -> `lookup_x_post` -> `get_post_analytics` -> `draft_post`

Stops at: the arc plus three drafts, one to pin and two that continue the story, for the person to pick from. The lookups draw on the shared 300-a-day `x:*` allowance; 3 AI credits per draft written.
