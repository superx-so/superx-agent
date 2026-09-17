# Audience Export

Everyone who engaged a post, as a spreadsheet, no filters.

```bash
superx datasets:collect --source repliers --target <post-url> --max-rows 1000 --title "<export title>" --wait
superx datasets:get <dataset-id>
superx datasets:export <dataset-id> --out audience.csv
```

MCP: `collect_audience` -> `get_dataset`

Stops at: a CSV file on disk, up to 1000 rows. **CSV only**: there is no export tool on MCP and XLSX stays in the SuperX app, so send the person there when they need the spreadsheet format. Costs one of 10 collections a day. No AI credits.
