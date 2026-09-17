# My Content Export

The account's own posts or replies, as a spreadsheet.

```bash
superx datasets:collect --source my_posts --since-days 90 --sort likes --max-rows 200 --wait
superx datasets:get <dataset-id>
superx datasets:export <dataset-id> --out my-content.csv
```

`--source my_replies` does the same for replies. Small exports finish instantly.

MCP: `collect_audience` -> `get_dataset`

Stops at: a CSV file on disk. **CSV only**, same as Audience Export: XLSX is app-only. Costs one of 10 collections a day. No AI credits.
