#!/bin/bash
# SuperX CLI basics: auth check, reads, a draft, and cleanup.
# Every command prints clean JSON to stdout, so jq works everywhere.
set -euo pipefail

# 1. Auth first. Fails (exit 1) if not logged in and SUPERX_API_KEY is unset.
superx status | jq '{authenticated, auth_source, plan: .plan.label}'

# 2. Which accounts can this key read?
superx accounts | jq '[.data[] | {id, username, is_main}]'

# 3. Study what works: top posts by likes.
superx posts:list --sort likes --limit 5 | jq '[.data[] | {text, metrics}]'

# 4. The trend: last 30 days of account analytics.
superx posts:analytics | jq '{totals: .data.totals, followers: .data.followers}'

# 5. Who engages with you the most?
superx contacts:list --sort engagement --limit 5 | jq '[.data[] | {id, username}]'

# 6. Create a draft (no --at means nothing publishes).
DRAFT=$(superx scheduled:create --text "Draft written by an example script")
DRAFT_ID=$(echo "$DRAFT" | jq -r '.data.id')
echo "Created draft: $DRAFT_ID" >&2

# 7. Verify it is in the queue as a draft.
superx scheduled:list --status draft | jq '[.data[] | {id, status}]'

# 8. Clean up the example draft.
superx scheduled:delete "$DRAFT_ID" | jq .
