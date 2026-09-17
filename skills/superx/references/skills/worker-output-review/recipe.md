# Worker Output Review

The posts a Worker wrote while the person was away, triaged: save the good ones, queue one, clear the rest.

```bash
superx workers:list
superx workers:suggestions --status to_review --limit 20
superx workers:draft <suggestion-id>
superx workers:schedule <suggestion-id> --at "<UTC ISO-8601 with Z>"
superx workers:dismiss <suggestion-id>
superx scheduled:list --status draft --limit 10
```

Workers are created, edited and RUN in the SuperX app: this chain only reads what they produced and acts on it. The text is saved exactly as the Worker wrote it, so show each suggestion to the person and let them pick before you save or queue anything. To change the wording, run it through `posts:remix` and save your version with `scheduled:create`, then dismiss the original. A suggestion can only be saved once, so a second draft or schedule call on the same id is a 400.

MCP: `list_workers` -> `list_worker_suggestions` -> `draft_worker_suggestion` / `schedule_worker_suggestion` / `dismiss_worker_suggestion` -> `get_scheduled_posts`

Stops at: the saved drafts and the queued post, for the person to edit. Reads and the three actions cost no AI credits.
