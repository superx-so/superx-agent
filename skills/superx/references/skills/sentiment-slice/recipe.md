# Sentiment Slice

Keep only the people who said the thing you are looking for.

```bash
superx datasets:list
superx datasets:refine <dataset-id> --criterion "<what a matching row says>" --sort followers --limit 100 --wait
superx datasets:rows <new-dataset-id> --limit 50
```

The source dataset is untouched. Only datasets whose rows carry text (repliers, quoters) can be refined. Rows the classifier cannot judge are KEPT and counted as unclear, so report the unclear count honestly.

MCP: `list_datasets` -> `refine_dataset` -> `get_dataset_rows`

Stops at: the new dataset with its matched and unclear counts. A refinement creates a dataset, so it spends one of the same 10 collections a day, plus a small AI cost. Ask before running it.
