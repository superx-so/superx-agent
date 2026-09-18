# Worth a Reply

Read a topic the person cares about and hand back the posts worth replying to today, each with the angle a reply could take.

```bash
superx posts:triage "<the topic>" --days 3          # --days 1-7, default 3; one run per topic per day is plenty
superx engage:reply-draft --post <id> --thoughts "<what the person wants to say>"   # only after they pick one
```

Read `lane`, `pct`, `kind` and `answers` from every post. Present the `read` lane first, ordered by `answers.r_reply_room` (how much room a knowledgeable reader has to add something), and order ONLY inside that lane: one line per post with its `url`, its `kind`, one line on why it is worth a reply built from that post's own answers (`r_specific` says it names something concrete, `r_new` says it is not the usual take, `r_reply_room` says there is something left to add), and one line on the angle a reply could take, drawn from the post's text. Then the `unsure` lane as short one-liners under a Skim heading. Leave the `pass` lane out entirely unless the person asks what was dropped, and then say how many and why in one sentence. Quote a post's own answers rather than inventing a reason, and never claim a post has a given like count from the search floor.

`pct` is how CLEAR the call was, not how good the post is: on `read` and `pass` it runs 50 to 99, so a `pass` at 99 means confidently not worth the time, and only on `unsure` is it the raw worth-reading score. Say the lane with the number, never rank posts by `pct` across lanes. What is judged is the TEXT of a post and the model never sees who wrote it, so report it as a call on the writing and never as a rating of a person or an account. The search asks for original posts, English only, with a floor of 30 likes, and returns no replies or reposts, so a small or brand-new topic can come back empty, which is an honest answer rather than a failure.

MCP: `triage_posts` -> `draft_reply` only when the person picks a post and says what they want to say

Stops at: a reply list, in chat, for the person to pick from. It drafts nothing until they choose a post, and nothing is ever sent. A run costs a flat 2 credits and spends 1 live X lookup for a single-word topic or 2 for a multi-word one, out of the account's daily allowance.
