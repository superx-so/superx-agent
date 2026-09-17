# Thread Builder

An idea or rough notes turned into a thread of up to 25 parts, ready to schedule.

```bash
superx posts:draft --brief "<the idea or notes, plus the target length>" --count 1
superx scheduled:create --part "<1/ hook>" --part "<2/ detail>" --part "<3/ close>" --idempotency-key "thread-<slug>-1"
```

Max 25 parts and 25,000 characters in total. Repeat `--part` in posting order.

MCP: `draft_post` -> `schedule_post`

Stops at: a thread draft in the app. 3 AI credits per draft written.
