# Profile Research Briefs

Structured briefs on a list of people, exportable as CSV.

```bash
superx datasets:research --handles "<handle>,<handle>" --max 25 --focus "<what to look for>" --title "<briefs title>" --wait
superx datasets:rows <dataset-id> --limit 25
superx datasets:export <dataset-id> --out briefs.csv
```

Over 5 profiles the run goes to the background, so never quote a brief count from a `collecting` result: pass `--wait` or poll `datasets:get`.

MCP: `research_profiles` -> `get_dataset` -> `get_dataset_rows`

Stops at: the briefs in chat plus a CSV on disk. Costs 1 AI credit per profile ACTUALLY researched (unresolved handles are refunded), max 25 a run, plus one of the plan's daily research runs. CSV export is CLI only; XLSX stays in the SuperX app.
