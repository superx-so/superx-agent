# DM-Ready Audience Builder

A clean, DM-able audience built from any post or public X list, with a path into a contact list.

```bash
superx datasets:collect --source repliers --target <post-url> --require-can-dm --max-rows 500 --title "<audience title>" --wait
superx datasets:get <dataset-id>
superx lists:create --name "<list name>"
superx datasets:add-to-list <dataset-id> --list-id <list-id>
```

`--source` also takes `quoters`, `reposters` and `list_members` (with a public X list URL as `--target`). Adding to a list dedupes by person and skips rows with no usable X account id, so `added + duplicates` can be lower than the row count.

MCP: `collect_audience` -> `get_dataset` -> `create_contact_list` -> `add_dataset_to_contact_list`

Stops at: a filtered dataset and, if the person wants it, a contact list. Costs one of 10 collections a day shared with the SuperX app. No AI credits.
