# Instant Lead Hunt

A live search of X right now for people matching the audience described, scored, saving nothing.

```bash
superx signals:suggest-keywords --icp "<who you want to reach>"
superx signals:search --offer "<one sentence on what is being sold>" --keywords "<phrase>,<phrase>" --icp "<who you want to reach>" --max 30 --max-age-days 7
```

The search creates no agent and stores no leads, so keep what the person needs from that one response. `--offer` is the single biggest lever on quality: give it whenever a product or company is named and the search plans up to 10 buyer-side query angles from it instead of running the keywords verbatim. Write `--keywords` as 2-5 short seed angles of how the BUYER talks (a symptom, a tool they already pay for, their jargon), never the product's own name. `--max-age-days` is the recency window (1-90, default 30): 7 for a pain point worth catching while it is fresh.

MCP: `suggest_keywords` -> `search_leads`

Stops at: up to 30 scored leads in chat. Costs at least 1 AI credit plus one of the plan's daily lead searches, and draws on a fair-use ceiling shared by every SuperX account. Takes up to a minute.
