# Viral Score Loop

Score a draft against the account's own recent posts, rewrite one thing at a time, rescore, and stop when the score stops rising.

```bash
superx posts:viral-score --text "<the draft>"                       # add --image, --video or --quote to match what will be attached
superx posts:viral-score --text "<rewrite keyed on the top hurt item>"
superx posts:viral-score --text "<next rewrite>"                    # repeat; six scored versions at most
```

Read `score`, `helped`, `hurt` and `warnings` from each result. Rewrite ONE thing per round, keyed on the top `hurt` item, and keep the person's facts, claims and voice; never add a request for replies, follows, links or DMs, never pad with hashtags or emoji, and pass the same media flags every round. Stop when a rewrite introduces a warning (go back to the last clean version and say which warning fired), when the score has not risen for two rounds in a row, or after six scored versions. If the first score already warns, name it and offer one rewrite that removes the ask, then score that once. The score is the chance the post beats the account's own normal post, so say "72 means it beats your usual post about 72 times in 100", never a reach or like count; the likes and replies multiples are relative to the account's median post, and reposts+quotes and views are low confidence, so never chase them.

MCP: `predict_viral_score` (repeat per version) -> `schedule_post` only when the person asks

Stops at: a table of every version with its score and what changed, plus the best version, for the person to pick. Nothing is posted. Most scores charge no credits, one in ten charges 1, and the first score for an account charges 1 more while its baseline is read.
